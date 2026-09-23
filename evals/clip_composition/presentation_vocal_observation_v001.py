"""Observe an entire finished Digest's audio without reading any caption input.

This is sensor evidence, not Vocal accent selection. It reuses the existing
16 kHz PCM/20 ms RMS calculation and the installed faster-whisper Silero model.
No downloads, new thresholds, smoothing, scores, quotas or caption filtering.
"""
import argparse
import array
import hashlib
import importlib.abc
import importlib.metadata
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

SAMPLE_RATE = 16000
RMS_FRAME_SAMPLES = 320  # Existing acoustic observer's 20 ms measurement grid.
VAD_FRAME_SAMPLES = 512  # Installed Silero model's native 16 kHz input size.


def binding(path):
    path = Path(path).resolve(strict=True)
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return {'path': str(path), 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def save(path, value):
    encoded = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with Path(path).open('x') as handle:
        handle.write(encoded)


def sample_ranges(sample_count, frame_samples):
    if sample_count <= 0 or frame_samples <= 0:
        raise ValueError('A nonempty audio signal and positive measurement frame are required')
    return [(start, min(sample_count, start + frame_samples))
            for start in range(0, sample_count, frame_samples)]


def verify_coverage(rows, sample_count):
    cursor = 0
    for row in rows:
        if row['startSample'] != cursor or not cursor < row['endSampleExclusive'] <= sample_count:
            raise ValueError('Measurement grid has a gap, overlap, or out-of-audio interval')
        cursor = row['endSampleExclusive']
    if cursor != sample_count:
        raise ValueError('Measurement grid does not cover all decoded audio samples')
    return {'startSample': 0, 'endSampleExclusive': cursor,
            'coveredSamples': cursor, 'gapSamples': 0, 'overlapSamples': 0,
            'rows': len(rows)}


def rms_dbfs(frame):
    """Pure calculation from analyze_layer1_acoustic_upper_bound.py:rms_dbfs.

    The existing -96 dB reporting floor is retained; it is not a selection gate.
    """
    samples = array.array('h')
    samples.frombytes(frame)
    if sys.byteorder == 'big':
        samples.byteswap()
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) if samples else 0
    return -96.0 if rms <= 0 else max(-96.0, 20 * math.log10(rms / 32768))


def measure_rms(pcm):
    if len(pcm) % 2:
        raise ValueError('PCM payload is not aligned to signed 16-bit samples')
    return [{'startSample': start, 'endSampleExclusive': end,
             'rmsDbfs': rms_dbfs(pcm[start * 2:end * 2])}
            for start, end in sample_ranges(len(pcm) // 2, RMS_FRAME_SAMPLES)]


def measure_voice(audio, model, np):
    state, context = model.get_initial_states(batch_size=1)
    rows = []
    for start, end in sample_ranges(len(audio), VAD_FRAME_SAMPLES):
        chunk = audio[start:end]
        padded = VAD_FRAME_SAMPLES - len(chunk)
        if padded:
            chunk = np.pad(chunk, (0, padded))
        probability, state, context = model(chunk, state, context, SAMPLE_RATE)
        values = np.asarray(probability).reshape(-1)
        if len(values) != 1 or not math.isfinite(float(values[0])) or not 0 <= values[0] <= 1:
            raise ValueError('Installed voice model returned an invalid probability')
        rows.append({'startSample': start, 'endSampleExclusive': end,
                     'voiceProbability': float(values[0]), 'modelPaddingSamples': padded})
    return rows


def local_rms_maxima(rows):
    """Retain every interior local maximum, including maximal equal-value plateaus.

    Pure adjacent-value comparison: no threshold, prominence, smoothing or top N.
    These are mixed-audio locations, not voice events or effect recommendations.
    """
    result = []
    cursor = 0
    while cursor < len(rows):
        end = cursor + 1
        value = rows[cursor]['rmsDbfs']
        while end < len(rows) and rows[end]['rmsDbfs'] == value:
            end += 1
        if cursor > 0 and end < len(rows) and rows[cursor - 1]['rmsDbfs'] < value > rows[end]['rmsDbfs']:
            result.append({'startSample': rows[cursor]['startSample'],
                           'endSampleExclusive': rows[end - 1]['endSampleExclusive'],
                           'rmsDbfs': value})
        cursor = end
    return result


class ExcludeUnusedConversionFrameworks(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'tensorflow'}:
            raise ImportError('Optional conversion framework excluded from existing CT2/VAD runtime: ' + fullname)


def load_runtime():
    sys.dont_write_bytecode = True
    os.environ.update({'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_DATASETS_OFFLINE': '1'})

    def deny_network(event, args):
        if event in {'socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'socket.sendto'}:
            raise RuntimeError('OFFLINE_AUDIO_OBSERVATION_NETWORK_FORBIDDEN')

    sys.addaudithook(deny_network)
    sys.meta_path.insert(0, ExcludeUnusedConversionFrameworks())
    import numpy as np
    from faster_whisper import vad
    from faster_whisper.utils import get_assets_path
    model_path = Path(get_assets_path()) / 'silero_vad.onnx'
    return np, vad, model_path


def run_command(args, output, name):
    started = time.monotonic()
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    save(output / (name + '-process.json'), {
        'args': args, 'exitCode': result.returncode if result.returncode >= 0 else None,
        'signal': -result.returncode if result.returncode < 0 else None,
        'stdoutBytes': len(result.stdout), 'stderrBytes': len(result.stderr),
        'elapsedSec': time.monotonic() - started,
    })
    with (output / (name + '-stderr.txt')).open('xb') as handle:
        handle.write(result.stderr)
    if result.returncode:
        raise RuntimeError(name + ' failed; process evidence saved')
    return result.stdout


def audio_metadata_command(ffprobe, source):
    return [ffprobe, '-v', 'error', '-protocol_whitelist', 'file,pipe',
            '-select_streams', 'a:0', '-show_entries',
            'stream=index,codec_name,sample_rate,channels,duration', '-of', 'json', str(source)]


def audio_decode_command(ffmpeg, source):
    return [ffmpeg, '-hide_banner', '-nostdin', '-v', 'error',
            '-protocol_whitelist', 'file,pipe', '-i', str(source),
            '-map', '0:a:0', '-vn', '-ac', '1', '-ar', str(SAMPLE_RATE),
            '-f', 's16le', 'pipe:1']


def verify_observation_bindings(preflight):
    for name in ['source', 'implementation', 'runtime', 'voiceImplementation',
                 'voiceModel', 'ffmpeg', 'ffprobe']:
        if binding(preflight[name]['path']) != preflight[name]:
            raise RuntimeError('AUDIO_OBSERVATION_BOUND_INPUT_CHANGED: ' + name)


def observe(source, output):
    source = Path(source).resolve(strict=True)
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    started = time.monotonic()
    np, vad, model_path = load_runtime()
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        raise RuntimeError('Existing local FFmpeg and ffprobe are required')
    preflight = {
        'schemaVersion': 'presentation-vocal-observation-preflight-v001',
        'source': binding(source), 'implementation': binding(__file__),
        'runtime': binding(sys.executable), 'voiceImplementation': binding(vad.__file__),
        'voiceModel': binding(model_path), 'ffmpeg': binding(ffmpeg), 'ffprobe': binding(ffprobe),
        'packages': {name: importlib.metadata.version(name) for name in
                     ['faster-whisper', 'ctranslate2', 'numpy', 'onnxruntime']},
        'inputScope': 'complete decoded first audio stream; no transcript, caption, selection, or human-label input',
        'sampleRate': SAMPLE_RATE, 'channels': 1, 'pcm': 'signed 16-bit little-endian',
        'rmsFrameSamples': RMS_FRAME_SAMPLES, 'voiceFrameSamples': VAD_FRAME_SAMPLES,
        'voiceState': 'one continuous model state from beginning to end; no caption-dependent resets',
        'finalPartialFrame': 'RMS measures actual remaining samples; VAD zero-pads only the model call and retains original coverage',
        'network': 'offline model paths; Python socket operations blocked; FFmpeg/ffprobe input protocols limited to file,pipe',
        'rmsOrigin': 'analyze_layer1_acoustic_upper_bound.py:extract_pcm and rms_dbfs',
        'localMaxima': 'all interior adjacent RMS maxima including equal-value plateaus; no threshold, score, smoothing, or quota',
    }
    save(output / 'preflight.json', preflight)
    metadata = run_command(audio_metadata_command(ffprobe, source), output, 'audio-metadata')
    metadata = json.loads(metadata)
    if len(metadata.get('streams', [])) != 1:
        raise ValueError('Exactly one selected input audio stream is required')
    save(output / 'audio-metadata.json', metadata)
    pcm = run_command(audio_decode_command(ffmpeg, source), output, 'complete-audio-decode')
    sample_count = len(pcm) // 2
    rms = measure_rms(pcm)
    audio = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768
    model = vad.SileroVADModel(str(model_path))
    voice_started = time.monotonic()
    voice = measure_voice(audio, model, np)
    voice_elapsed = time.monotonic() - voice_started
    rms_coverage = verify_coverage(rms, sample_count)
    voice_coverage = verify_coverage(voice, sample_count)
    maxima = local_rms_maxima(rms)
    for name, rows in [('rms', rms), ('voice-probability', voice), ('mixed-audio-local-maxima', maxima)]:
        save(output / (name + '.json'), {
            'schemaVersion': 'presentation-audio-measurement-series-v001',
            'measurement': name, 'sampleRate': SAMPLE_RATE,
            'sampleCount': sample_count, 'rows': rows,
        })
    limitations = [
        'RMS measures mixed program audio, including music and game effects; it does not isolate the speaker.',
        'Voice probability estimates speech presence, not force, emotion, laughter, scream, or editorial value.',
        'A low speech probability does not justify deleting an audio position: laughter and screams may be missed.',
        'Every audio sample is retained in both measurement grids, regardless of caption presence or text meaning.',
        'All local RMS maxima are retained without a salience threshold; they are not Vocal accent selections.',
        'No human listening or perceptual quality judgment was performed.',
        'The final VAD frame is padded for model inference; its saved interval excludes synthetic padding.',
    ]
    verify_observation_bindings(preflight)
    summary = {
        'schemaVersion': 'presentation-vocal-observation-result-v001', 'status': 'observed',
        'preflight': binding(output / 'preflight.json'), 'source': preflight['source'],
        'pcmSha256': hashlib.sha256(pcm).hexdigest(), 'pcmBytes': len(pcm),
        'sampleRate': SAMPLE_RATE, 'sampleCount': sample_count,
        'decodedAudioDurationSec': sample_count / SAMPLE_RATE,
        'coverage': {'rms': rms_coverage, 'voiceProbability': voice_coverage},
        'rmsRangeDbfs': [min(r['rmsDbfs'] for r in rms), max(r['rmsDbfs'] for r in rms)],
        'voiceProbabilityRange': [min(r['voiceProbability'] for r in voice), max(r['voiceProbability'] for r in voice)],
        'mixedAudioLocalMaximaCount': len(maxima), 'vocalAccentDecisions': None,
        'captionInputCount': 0, 'humanLabelInputCount': 0,
        'voiceInferenceElapsedSec': voice_elapsed, 'elapsedSec': time.monotonic() - started,
        'files': [binding(output / (n + '.json')) for n in
                  ['rms', 'voice-probability', 'mixed-audio-local-maxima']],
        'limitations': limitations,
    }
    save(output / 'summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False, allow_nan=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    observe(arguments.source, arguments.output)

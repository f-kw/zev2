"""Offline whole-Digest acoustic events and independent full-audio recognition.

The probe observes mixed audio. It never chooses a semantic role or visual effect,
and accepts no captions, Focus decisions, transcript hints, quotas, or event gaps.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import shutil
import sys
import time

import presentation_vocal_observation_v001 as observation

SAMPLE_RATE = observation.SAMPLE_RATE
PARAMETERS = {
    'powerIntegrationFrames': 5,
    'powerIntegrationMs': 100,
    'prominenceContextFrames': 101,
    'prominenceContextMs': 2020,
    'minimumProminenceDb': 9.0,
    'overlappingEvents': 'union of strictly overlapping local prominence basins',
    'voiceGate': None,
    'transcriptionGate': None,
    'quota': None,
    'minimumEventGap': None,
    'asrContextPaddingSec': 1.0,
}
LIMITATIONS = [
    'Energy belongs to the mixed program audio; simultaneous game sounds or music may cause the measured change.',
    'Speech probability and ASR overlap cannot prove that the measured energy change came from the human voice.',
    'ASR can omit or hallucinate words and does not identify laughter, screams, emotions, or speakers reliably.',
    'No ASR or voice-probability gate removes an acoustic event; empty recognition overlap is retained.',
    'The acoustic settings are an explicit development profile, not human-validated accuracy claims.',
    'No semantic role, editorial importance, effect kind, or human listening judgment is produced here.',
]


def emit(value):
    print(json.dumps(value, ensure_ascii=False, allow_nan=False), flush=True)


def acoustic_events(rms, voice, sample_count, np, signal):
    """Retain every peak measurement and select only by acoustic prominence.

    Five equal-power frames integrate 100 ms; edge frames use only real samples.
    Prominence is measured against the higher of the two local contour minima.
    Merging overlapping contour intervals deduplicates the same changing sound;
    disjoint events are never thinned by spacing, count, or ranking.
    """
    raw_db = np.asarray([row['rmsDbfs'] for row in rms], dtype=np.float64)
    sample_weights = np.asarray([row['endSampleExclusive'] - row['startSample'] for row in rms], dtype=np.float64)
    powers = np.power(10.0, raw_db / 10.0)
    kernel = np.ones(PARAMETERS['powerIntegrationFrames'], dtype=np.float64)
    integrated = 10.0 * np.log10(np.convolve(powers * sample_weights, kernel, mode='same') /
                                np.convolve(sample_weights, kernel, mode='same'))
    peaks, properties = signal.find_peaks(integrated, plateau_size=(None, None))
    prominence, left_bases, right_bases = signal.peak_prominences(
        integrated, peaks, wlen=PARAMETERS['prominenceContextFrames'])
    measurements, accepted = [], []
    for index, peak in enumerate(peaks):
        left, right = int(left_bases[index]), int(right_bases[index])
        peak, level = int(peak), float(integrated[peak])
        baseline = float(max(integrated[left], integrated[right]))
        qualifies = float(prominence[index]) >= PARAMETERS['minimumProminenceDb']
        row = {
            'id': 'audio-peak-%06d' % (index + 1),
            'startSample': rms[left]['startSample'],
            'endSampleExclusive': rms[right]['endSampleExclusive'],
            'peakSample': rms[peak]['startSample'],
            'peakDbfs': level, 'baselineDbfs': baseline,
            'leftBaselineDbfs': float(integrated[left]),
            'rightBaselineDbfs': float(integrated[right]),
            'prominenceDb': float(prominence[index]),
            'riseDb': level - float(integrated[left]),
            'fallDb': level - float(integrated[right]),
            'plateauStartSample': rms[int(properties['left_edges'][index])]['startSample'],
            'plateauEndSampleExclusive': rms[int(properties['right_edges'][index])]['endSampleExclusive'],
            'qualifies': qualifies,
            'reasons': ['LOCAL_ENERGY_PROMINENCE_AT_LEAST_9_DB' if qualifies else 'LOCAL_ENERGY_PROMINENCE_BELOW_9_DB'],
        }
        measurements.append(row)
        if qualifies:
            accepted.append(row)
    # Interval union must sort by the basin start, not merely the peak location.
    groups = []
    for row in sorted(accepted, key=lambda item: (item['startSample'], item['endSampleExclusive'], item['peakSample'])):
        if groups and row['startSample'] < groups[-1]['endSampleExclusive']:
            groups[-1]['endSampleExclusive'] = max(groups[-1]['endSampleExclusive'], row['endSampleExclusive'])
            groups[-1]['peaks'].append(row)
        else:
            groups.append({'startSample': row['startSample'], 'endSampleExclusive': row['endSampleExclusive'], 'peaks': [row]})
    candidates = []
    for index, group in enumerate(groups):
        # This representative names a measured peak in the merged event. Every
        # constituent peak is retained; no candidate is removed by this choice.
        peak = max(group['peaks'], key=lambda row: (row['peakDbfs'], -row['peakSample']))
        start, end = group['startSample'], group['endSampleExclusive']
        overlaps = [row for row in voice if row['startSample'] < end and start < row['endSampleExclusive']]
        observed = sum(min(end, row['endSampleExclusive']) - max(start, row['startSample']) for row in overlaps)
        mean = sum(row['voiceProbability'] * (min(end, row['endSampleExclusive']) - max(start, row['startSample']))
                   for row in overlaps) / observed
        candidates.append({
            'id': 'audio-event-%06d' % (index + 1),
            'startSample': start, 'endSampleExclusive': end,
            'startSec': start / SAMPLE_RATE, 'endSec': end / SAMPLE_RATE,
            'peakSample': peak['peakSample'], 'peakSec': peak['peakSample'] / SAMPLE_RATE,
            'constituentPeakIds': [row['id'] for row in group['peaks']],
            'metrics': {name: peak[name] for name in ['peakDbfs', 'baselineDbfs', 'prominenceDb', 'riseDb', 'fallDb']} | {
                'durationSec': (end - start) / SAMPLE_RATE,
                'voiceProbabilityMax': max(row['voiceProbability'] for row in overlaps),
                'voiceProbabilityMean': mean,
            },
            'reasons': ['LOCAL_ENERGY_PROMINENCE_AT_LEAST_9_DB', 'ALL_QUALIFYING_OVERLAPPING_BASINS_UNIONED'],
            'asrOverlap': [],
            'asrContext': [],
        })
    return measurements, candidates, [
        {'startSample': row['startSample'], 'endSampleExclusive': row['endSampleExclusive'], 'integratedRmsDbfs': float(level)}
        for row, level in zip(rms, integrated)
    ]


def normalized_segment(segment, index):
    return {
        'id': 'asr-segment-%06d' % (index + 1), 'modelSegmentId': segment.id,
        'seek': segment.seek, 'startSec': segment.start, 'endSec': segment.end,
        'text': segment.text, 'tokens': segment.tokens,
        'avgLogprob': segment.avg_logprob, 'noSpeechProbability': segment.no_speech_prob,
        'compressionRatio': segment.compression_ratio, 'temperature': segment.temperature,
        'words': [{'startSec': word.start, 'endSec': word.end, 'text': word.word, 'probability': word.probability}
                  for word in (segment.words or [])],
    }


def add_asr_overlap(candidates, segments):
    for candidate in candidates:
        candidate['asrOverlap'] = [
            {name: segment[name] for name in ['startSec', 'endSec', 'text', 'avgLogprob', 'noSpeechProbability']} |
            {'segmentId': segment['id']}
            for segment in segments
            if segment['startSec'] < candidate['endSec'] and candidate['startSec'] < segment['endSec']
        ]
        candidate['asrContext'] = [
            {name: segment[name] for name in ['startSec', 'endSec', 'text', 'avgLogprob', 'noSpeechProbability']} |
            {'segmentId': segment['id']}
            for segment in segments
            if segment['startSec'] < candidate['endSec'] + PARAMETERS['asrContextPaddingSec'] and
            candidate['startSec'] - PARAMETERS['asrContextPaddingSec'] < segment['endSec']
        ]


def prepare_source(name, source, output_root, np, vad, model_path, runtime_receipt, signal):
    output = output_root / name
    output.mkdir(exist_ok=False)
    source = Path(source).resolve(strict=True)
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    preflight = {
        'schemaVersion': 'presentation-vocal-audio-preflight-v001',
        'source': observation.binding(source), 'implementation': observation.binding(__file__),
        'observationImplementation': observation.binding(observation.__file__),
        'voiceModel': observation.binding(model_path), 'voiceImplementation': observation.binding(vad.__file__),
        'runtimeReceipt': observation.binding(runtime_receipt),
        'ffmpeg': observation.binding(ffmpeg), 'ffprobe': observation.binding(ffprobe),
        'parameters': PARAMETERS, 'captionInputCount': 0, 'focusInputCount': 0, 'humanLabelInputCount': 0,
        'inputScope': 'Every decoded sample of the complete first audio stream',
        'network': 'offline model paths; Python socket operations denied; FFmpeg protocols file,pipe only',
    }
    observation.save(output / 'preflight.json', preflight)
    metadata = observation.run_command(observation.audio_metadata_command(ffprobe, source), output, 'audio-metadata')
    observation.save(output / 'audio-metadata.json', json.loads(metadata))
    pcm = observation.run_command(observation.audio_decode_command(ffmpeg, source), output, 'complete-audio-decode')
    if not pcm or len(pcm) % 2:
        raise ValueError('Nonempty complete signed-16-bit PCM is required')
    with (output / 'complete-audio.s16le').open('xb') as handle:
        handle.write(pcm)
    sample_count = len(pcm) // 2
    audio = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768
    rms = observation.measure_rms(pcm)
    voice = observation.measure_voice(audio, vad.SileroVADModel(str(model_path)), np)
    coverage = observation.verify_coverage(rms, sample_count)
    voice_coverage = observation.verify_coverage(voice, sample_count)
    peaks, candidates, integrated = acoustic_events(rms, voice, sample_count, np, signal)
    measurements = []
    for label, rows in [('rms', rms), ('voice-probability', voice), ('integrated-rms', integrated), ('acoustic-peaks', peaks)]:
        target = output / (label + '.json')
        observation.save(target, {
            'schemaVersion': 'presentation-vocal-audio-measurements-v001',
            'source': preflight['source'], 'sampleRate': SAMPLE_RATE,
            'sampleCount': sample_count, 'parameters': PARAMETERS, 'rows': rows,
        })
        measurements.append(observation.binding(target))
    acoustic = {
        'schemaVersion': 'presentation-vocal-acoustic-evidence-v001',
        'source': preflight['source'], 'pcm': observation.binding(output / 'complete-audio.s16le'),
        'sampleRate': SAMPLE_RATE, 'sampleCount': sample_count, 'durationSec': sample_count / SAMPLE_RATE,
        'coverage': coverage, 'voiceCoverage': voice_coverage,
        'localPeakCount': len(peaks), 'qualifyingPeakCount': sum(row['qualifies'] for row in peaks),
        'candidateCount': len(candidates), 'candidates': candidates,
        'parameters': PARAMETERS, 'measurementEvidence': measurements, 'limitations': LIMITATIONS,
    }
    observation.save(output / 'acoustic-evidence.json', acoustic)
    emit({'event': 'whole-audio-observed', 'sourceName': name, 'durationSec': acoustic['durationSec'],
          'candidateCount': len(candidates), 'localPeakCount': len(peaks)})
    return name, output, audio, acoustic, preflight


def recognize(prepared, model, runtime_receipt):
    name, output, audio, acoustic, preflight = prepared
    started = time.monotonic()
    try:
        segment_generator, info = model.transcribe(
            audio, language='ja', word_timestamps=True, vad_filter=False,
            initial_prompt=None, prefix=None, hotwords=None,
        )
        segments = []
        with (output / 'asr-segments.jsonl').open('x') as progress:
            for index, segment in enumerate(segment_generator):
                row = normalized_segment(segment, index)
                progress.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + '\n')
                progress.flush()
                segments.append(row)
                emit({'event': 'asr-segment', 'sourceName': name, 'segmentCount': len(segments),
                      'observedEndSec': row['endSec'], 'elapsedSec': time.monotonic() - started})
        evidence = {
            'schemaVersion': 'presentation-vocal-asr-evidence-v001',
            'source': acoustic['source'], 'pcm': acoustic['pcm'],
            'runtimeReceipt': observation.binding(runtime_receipt),
            'sampleRate': SAMPLE_RATE, 'sampleCount': len(audio),
            'durationSec': len(audio) / SAMPLE_RATE, 'recognizedLanguage': info.language,
            'reportedDurationSec': info.duration, 'reportedDurationAfterVadSec': info.duration_after_vad,
            'fullInputPassed': True, 'generatorFullyConsumed': True,
            'options': {'language': 'ja', 'word_timestamps': True, 'vad_filter': False,
                        'initial_prompt': None, 'prefix': None, 'hotwords': None, 'otherParameters': 'installed defaults'},
            'segmentCount': len(segments), 'wordCount': sum(len(row['words']) for row in segments),
            'segments': segments, 'limitations': LIMITATIONS,
            'elapsedSec': time.monotonic() - started,
        }
        observation.save(output / 'asr-evidence.json', evidence)
        add_asr_overlap(acoustic['candidates'], segments)
        result = {
            'schemaVersion': 'presentation-vocal-audio-candidates-v001',
            'source': acoustic['source'], 'pcm': acoustic['pcm'],
            'sampleRate': SAMPLE_RATE, 'sampleCount': len(audio), 'durationSec': len(audio) / SAMPLE_RATE,
            'parameters': PARAMETERS, 'coverage': acoustic['coverage'],
            'candidateCount': len(acoustic['candidates']), 'candidates': acoustic['candidates'],
            'asrEvidence': observation.binding(output / 'asr-evidence.json'),
            'measurementEvidence': acoustic['measurementEvidence'], 'limitations': LIMITATIONS,
        }
        for label in ['source', 'implementation', 'observationImplementation', 'voiceModel', 'voiceImplementation',
                      'runtimeReceipt', 'ffmpeg', 'ffprobe']:
            if observation.binding(preflight[label]['path']) != preflight[label]:
                raise RuntimeError('BOUND_INPUT_CHANGED: ' + label)
        observation.save(output / 'audio-candidates.json', result)
        summary = {
            'schemaVersion': 'presentation-vocal-audio-probe-result-v001', 'status': 'complete',
            'source': acoustic['source'], 'candidates': observation.binding(output / 'audio-candidates.json'),
            'asrEvidence': result['asrEvidence'], 'durationSec': result['durationSec'],
            'candidateCount': result['candidateCount'],
            'candidateWithoutAsrOverlapCount': sum(not row['asrOverlap'] for row in result['candidates']),
            'segmentCount': len(segments), 'wordCount': evidence['wordCount'],
            'elapsedSec': time.monotonic() - started, 'limitations': LIMITATIONS,
        }
        observation.save(output / 'summary.json', summary)
        emit({'event': 'complete', 'sourceName': name, **summary})
        return summary
    except BaseException as error:
        observation.save(output / 'failure.json', {
            'schemaVersion': 'presentation-vocal-audio-probe-failure-v001',
            'source': acoustic['source'], 'stage': 'full-audio-recognition',
            'errorType': type(error).__name__, 'message': str(error),
            'elapsedSec': time.monotonic() - started,
        })
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', action='append', nargs=2, metavar=('NAME', 'PATH'), required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--cpu-threads', type=int, default=4)
    args = parser.parse_args()
    if args.workers < 1 or args.cpu_threads < 1:
        raise ValueError('Positive execution resource settings are required')
    names = [pair[0] for pair in args.source]
    if len(names) != len(set(names)) or any(not name or Path(name).name != name or name in {'.', '..'} for name in names):
        raise ValueError('Unique single-component source names are required')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    np, vad, voice_model_path = observation.load_runtime()
    from scipy import signal
    from faster_whisper import WhisperModel
    model_path = args.model.resolve(strict=True)
    workers = min(args.workers, len(args.source))
    receipt = {
        'schemaVersion': 'presentation-vocal-audio-runtime-v001',
        'implementation': observation.binding(__file__),
        'observationImplementation': observation.binding(observation.__file__),
        'runtime': observation.binding(sys.executable),
        'models': [observation.binding(path) for path in sorted(model_path.iterdir()) if path.is_file()],
        'packages': {name: importlib.metadata.version(name) for name in
                     ['faster-whisper', 'ctranslate2', 'numpy', 'scipy', 'onnxruntime', 'av']},
        'compute': {'device': 'cpu', 'compute_type': 'float32', 'cpu_threads': args.cpu_threads,
                    'num_workers': workers, 'observedLogicalCpuCount': os.cpu_count()},
        'offline': True, 'localFilesOnly': True, 'parameters': PARAMETERS,
        'sources': [{'name': name, **observation.binding(path)} for name, path in args.source],
    }
    receipt_path = output / 'runtime-receipt.json'
    observation.save(receipt_path, receipt)
    prepared = [prepare_source(name, source, output, np, vad, voice_model_path, receipt_path, signal)
                for name, source in args.source]
    emit({'event': 'loading-local-asr-model', 'workers': workers, 'cpuThreadsPerWorker': args.cpu_threads})
    model = WhisperModel(str(model_path), device='cpu', compute_type='float32', local_files_only=True,
                         cpu_threads=args.cpu_threads, num_workers=workers)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        summaries = list(executor.map(lambda item: recognize(item, model, receipt_path), prepared))
    for item in receipt['models']:
        if observation.binding(item['path']) != item:
            raise RuntimeError('ASR_MODEL_CHANGED')
    observation.save(output / 'summary.json', {'status': 'complete', 'sources': summaries})


if __name__ == '__main__':
    main()

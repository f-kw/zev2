"""Phase 2 formal-input adapter for the existing fixed-text acoustic observer.

The source STT chunk catalogue fixes windows and ID membership. Missing audio is
manufactured from the approved local video. No ASR or new observation algorithm.
"""
import importlib.metadata
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


observer = module('phase2_existing_observer', 'observe_digest_caption_acoustics_v001.py')
runtime = module('phase2_existing_runtime', 'caption_local_acoustics_v001.py')
binding, read, save = observer.binding, observer.read, observer.save


def checked(ref):
    p = ROOT / ref['path']
    assert binding(p)['fileSha256'] == ref['fileSha256'], str(p)
    return p


def prepare(job_path):
    job = read(job_path)
    assert job['schemaVersion'] == 'digest-v1-phase2-input-job-v001'
    output = ROOT / job['outputRoot']
    request_path = output / 'retention-request.json'
    result_path = output / 'retention-result.json'
    validation = read(output / 'retention-id-validation.json')
    assert validation['status'] == 'validated'
    checked(validation['request']); checked(validation['response']); checked(validation['result'])
    assert read(request_path)['planBinding']['fileSha256'] == binding(job_path)['fileSha256']
    source = checked(job['request']['sourceVideo'])
    transcript_path = checked(job['request']['transcript'])
    summary_path = transcript_path.with_name('local-stt-response.raw.json')
    transcript = read(transcript_path)
    by_id = {x['id']: x for x in transcript['segments']}
    wanted = {a['sourceSegmentId'] for c in read(request_path)['input']['candidates']
              for u in c['utterances'] for a in u['atoms']}
    selected, offset, covered = [], 0, set()
    for row in read(summary_path)['chunks']:
        ids = list(range(offset + 1, offset + row['segmentCount'] + 1))
        if wanted.intersection(ids):
            atoms = []
            for sid in ids:
                s = by_id[sid]
                assert row['startMs'] <= s['startMs'] < s['endMs'] <= row['endMs']
                atoms.append({'sourceSegmentId': sid, 'text': s['text']})
            selected.append({**row, 'atoms': atoms})
            covered.update(wanted.intersection(ids))
        offset += row['segmentCount']
    assert offset == len(transcript['segments']) and covered == wanted
    target = output / 'acoustics'
    target.mkdir()
    audio_root = target / 'inputs'
    audio_root.mkdir()
    chunks, commands = [], []
    for row in selected:
        audio = audio_root / f'chunk-{row["index"]:04d}.flac'
        text_path = audio.with_suffix('.formal-text.json')
        text = ''.join(a['text'] for a in row['atoms'])
        save(text_path, {'schemaVersion': 'digest-v1-phase2-fixed-text-chunk-v001',
                         'transcriptBinding': job['request']['transcript'],
                         'chunkCatalogueBinding': binding(summary_path), 'chunkIndex': row['index'],
                         'atoms': row['atoms'], 'text': text})
        args = ['ffmpeg', '-hide_banner', '-nostdin', '-v', 'error',
                '-ss', str(row['startMs'] / 1000), '-i', str(source),
                '-t', str((row['endMs'] - row['startMs']) / 1000),
                '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', '-n', str(audio)]
        subprocess.run(args, check=True)
        commands.append(args)
        chunks.append({'index': row['index'], 'startMs': row['startMs'], 'endMs': row['endMs'],
                       'audioBinding': binding(audio), 'rawTextBinding': binding(text_path),
                       'text': text, 'atoms': row['atoms']})
    implementation = [binding(__file__), binding(observer.__file__), binding(runtime.__file__), binding(sys.executable)]
    versions = {}
    for name, distribution in [('faster_whisper', 'faster-whisper'), ('ctranslate2', 'ctranslate2'),
                               ('tokenizers', 'tokenizers'), ('av', 'av'), ('numpy', 'numpy')]:
        directory = Path(importlib.util.find_spec(name).origin).parent
        versions[distribution] = importlib.metadata.version(distribution)
        implementation.extend(binding(p) for p in sorted(directory.rglob('*'))
                              if p.is_file() and p.suffix in {'.py', '.so', '.dylib'})
    save(target / 'audio-preparation.json', {'schemaVersion': 'digest-v1-phase2-audio-preparation-v001',
        'sourceVideoBinding': job['request']['sourceVideo'], 'chunkCatalogueBinding': binding(summary_path),
        'textOrigin': 'current formal transcript; original raw STT responses are absent',
        'audioOrigin': 'new local extraction of the same catalogue windows from approved video',
        'ffmpegBinding': binding('/opt/homebrew/bin/ffmpeg'), 'commands': commands,
        'newTranscription': False, 'externalCommunication': False})
    save(target / 'acoustic-preflight-v001.json', {
        'schemaVersion': 'digest-fixed-text-acoustic-preflight-v001',
        'instruction': 'ZEV ダイジェストv1 Phase 2 実装指示',
        'method': 'existing faster_whisper.WhisperModel.find_alignment; known text only; no transcription',
        'modelPath': str(observer.MODEL),
        'modelBindings': [binding(p) for p in sorted(observer.MODEL.iterdir()) if p.is_file()],
        'compute': {'device': 'cpu', 'compute_type': 'float32', 'otherParameters': 'installed defaults'},
        'implementationBindings': implementation, 'versions': versions,
        'sourceBindings': [binding(transcript_path), binding(summary_path), binding(request_path),
                           binding(result_path), binding(job_path), binding(target / 'audio-preparation.json')],
        'chunks': chunks,
        'inputAdapter': 'formal source ID membership through existing STT chunk catalogue; no text edits',
    })
    print({'stage': 'acoustic-preflight-saved', 'chunks': len(chunks),
           'binding': binding(target / 'acoustic-preflight-v001.json')}, flush=True)


def observe(job_path):
    job = read(job_path)
    target = ROOT / job['outputRoot'] / 'acoustics'
    observer.OUT = target
    os.environ.update({'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_DATASETS_OFFLINE': '1'})

    def deny_network(event, args):
        if event in {'socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'socket.sendto'}:
            raise RuntimeError('OFFLINE_SENSOR_NETWORK_FORBIDDEN')

    sys.addaudithook(deny_network)
    sys.meta_path.insert(0, runtime.ExcludeUnusedConversionFrameworks())
    save(target / 'runtime.json', {'schemaVersion': 'digest-v1-phase2-acoustic-runtime-v001',
        'preflightBinding': binding(target / 'acoustic-preflight-v001.json'),
        'adapterBinding': binding(__file__), 'observerBinding': binding(observer.__file__),
        'runtime': sys.executable, 'externalCommunication': 'blocked by local-only model and socket audit hook',
        'newTranscription': False})
    observer.observe()


if __name__ == '__main__':
    action, relative_job = sys.argv[1:]
    {'prepare': prepare, 'observe': observe}[action](ROOT / relative_job)

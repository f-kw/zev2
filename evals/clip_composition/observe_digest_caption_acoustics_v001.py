"""Offline, fixed-text acoustic observation. Does not promote or alter source times."""
import hashlib
import importlib.metadata
import importlib.util
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001'
SOURCE = ROOT / 'evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source'
MODEL = Path('/Users/kawafmm/.cache/huggingface/hub/models--Systran--faster-whisper-large-v2/snapshots/f0fe81560cb8b68660e564f55dd99207059c092e')


def binding(p):
    p = Path(p)
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return {'path': str(p), 'bytes': p.stat().st_size, 'fileSha256': h.hexdigest()}


def read(p):
    return json.loads(Path(p).read_text())


def save(p, value):
    with Path(p).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')


def preflight():
    trace = read(OUT / 'caption-timing-trace-v001.json')
    indices = {x['chunkIndex'] for x in trace['sourceTimingTrace']}
    transcript = read(SOURCE / 'transcript.json')
    by_id = {x['id']: x for x in transcript['segments']}
    summary_path = SOURCE / 'local-stt-response.raw.json'
    chunks = []
    offset = 0
    for chunk in read(summary_path)['chunks']:
        if chunk['index'] in indices:
            raw = read(chunk['rawResponsePath'])
            assert len(raw['segments']) == chunk['segmentCount']
            atoms = []
            for i, s in enumerate(raw['segments']):
                source_id = offset + i + 1
                t = by_id[source_id]
                assert (t['text'], t['startMs'], t['endMs']) == (s['text'], chunk['startMs'] + s['startMs'], chunk['startMs'] + s['endMs'])
                atoms.append({'sourceSegmentId': source_id, 'rawSegmentId': s['id'], 'text': s['text']})
            text = ''.join(x['text'] for x in atoms)
            assert text == raw['text']
            chunks.append({'index': chunk['index'], 'startMs': chunk['startMs'], 'endMs': chunk['endMs'],
                           'audioBinding': binding(chunk['audioPath']), 'rawTextBinding': binding(chunk['rawResponsePath']),
                           'text': text, 'atoms': atoms})
        offset += chunk['segmentCount']
    implementation = [binding(__file__), binding(sys.executable)]
    versions = {}
    for module, distribution in [('faster_whisper', 'faster-whisper'), ('ctranslate2', 'ctranslate2'), ('tokenizers', 'tokenizers'), ('av', 'av'), ('numpy', 'numpy')]:
        directory = Path(importlib.util.find_spec(module).origin).parent
        versions[distribution] = importlib.metadata.version(distribution)
        implementation.extend(binding(p) for p in sorted(directory.rglob('*')) if p.is_file() and p.suffix in {'.py', '.so', '.dylib'})
    save(OUT / 'acoustic-preflight-v001.json', {
        'schemaVersion': 'digest-fixed-text-acoustic-preflight-v001', 'instruction': 'ZEV進行管理２ 指示-003',
        'method': 'faster_whisper.WhisperModel.find_alignment; known text only; no transcription',
        'modelPath': str(MODEL), 'modelBindings': [binding(p) for p in sorted(MODEL.iterdir()) if p.is_file()],
        'compute': {'device': 'cpu', 'compute_type': 'float32', 'otherParameters': 'installed defaults'},
        'implementationBindings': implementation, 'versions': versions,
        'sourceBindings': [binding(SOURCE / 'transcript.json'), binding(summary_path), binding(OUT / 'caption-timing-trace-v001.json')],
        'chunks': chunks,
    })
    print(json.dumps({'stage': 'preflight-saved', 'chunks': len(chunks), 'binding': binding(OUT / 'acoustic-preflight-v001.json')}), flush=True)


def observe():
    preflight_path = OUT / 'acoustic-preflight-v001.json'
    job = read(preflight_path)
    for ref in job['modelBindings'] + job['implementationBindings'] + job['sourceBindings'] + [c[k] for c in job['chunks'] for k in ['audioBinding', 'rawTextBinding']]:
        assert binding(ref['path']) == ref, ref['path']
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio, pad_or_trim
    from faster_whisper.tokenizer import Tokenizer
    import ctranslate2
    assert 'float32' in ctranslate2.get_supported_compute_types('cpu')
    model = WhisperModel(job['modelPath'], device='cpu', compute_type='float32', local_files_only=True)
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task='transcribe', language='ja')
    for chunk in job['chunks']:
        start = time.monotonic()
        audio = decode_audio(chunk['audioBinding']['path'], sampling_rate=model.feature_extractor.sampling_rate)
        features = model.feature_extractor(audio)
        num_frames = min(features.shape[-1] - 1, model.feature_extractor.nb_max_frames)
        assert len(audio) / model.feature_extractor.sampling_rate * 1000 == chunk['endMs'] - chunk['startMs']
        tokens = tokenizer.encode(chunk['text'])
        assert tokenizer.decode(tokens) == chunk['text']
        encoded = model.encode(pad_or_trim(features[:, :num_frames], model.feature_extractor.nb_max_frames))
        words = model.find_alignment(tokenizer, tokens, encoded, num_frames)
        observation = {'schemaVersion': 'digest-fixed-text-acoustic-observation-v001',
                       'preflightBinding': binding(preflight_path), 'chunkIndex': chunk['index'],
                       'audioSamples': len(audio), 'sampleRate': model.feature_extractor.sampling_rate,
                       'numFrames': num_frames, 'textTokens': tokens, 'words': words,
                       'elapsedSec': time.monotonic() - start}
        target = OUT / f'acoustic-observation-chunk-{chunk["index"]:04d}-v001.json'
        save(target, observation)
        print(json.dumps({'stage': 'observation-saved', 'chunkIndex': chunk['index'], 'words': len(words), 'elapsedSec': observation['elapsedSec'], 'binding': binding(target)}), flush=True)


if __name__ == '__main__':
    {'preflight': preflight, 'observe': observe}[sys.argv[1]]()

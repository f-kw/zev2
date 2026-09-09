"""Run installed, offline ASR over every prepared audio chunk for instruction 024.

The existing chunk assembler consumes these saved recognition responses. This
adapter has no production intent, candidate selection, speaker attribution, or
video observation input. Optional model-conversion frameworks are not required
for the already-converted model, as in the existing acoustic inference runtime.
"""
import argparse
import hashlib
import importlib.abc
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import time


class ExcludeUnusedConversionFrameworks(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'tensorflow'}:
            raise ImportError('Unused conversion framework: ' + fullname)
        return None


def binding(p):
    p = Path(p)
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return {'path': str(p.resolve()), 'bytes': p.stat().st_size, 'fileSha256': h.hexdigest()}


def save(p, value):
    with Path(p).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preparation', required=True)
    parser.add_argument('--model', required=True)
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()
    prep_path = Path(args.preparation)
    prep = json.loads(prep_path.read_text())
    assert prep['partial'] is False
    assert prep['preparedChunkCount'] == prep['fullChunkCount'] == len(prep['chunks'])
    assert [x['index'] for x in prep['chunks']] == list(range(len(prep['chunks'])))
    model_path = Path(args.model)
    assert model_path.is_dir()
    receipt = {
        'schemaVersion': 'unseen-material-offline-stt-runtime-v001',
        'method': 'installed faster-whisper full audio transcription, word timestamps, no diarization',
        'preparationBinding': binding(prep_path),
        'implementationBinding': binding(__file__),
        'runtimeBinding': binding(sys.executable),
        'modelBindings': [binding(p) for p in sorted(model_path.iterdir()) if p.is_file()],
        'versions': {x: importlib.metadata.version(x) for x in ['faster-whisper', 'ctranslate2', 'tokenizers', 'av', 'numpy']},
        'compute': {'device': 'cpu', 'compute_type': 'float32', 'otherParameters': 'installed defaults'},
        'recognition': {'language': 'ja', 'word_timestamps': True, 'vad_filter': True,
                        'vadParameters': 'installed defaults', 'otherParameters': 'installed defaults'},
        'productionIntentInput': False,
        'externalTextInput': False,
        'speakerAttribution': False,
        'modelDownload': False,
        'audioChunks': [binding(c['audioPath']) for c in prep['chunks']],
    }
    receipt_path = Path(args.receipt)
    if receipt_path.exists():
        assert json.loads(receipt_path.read_text()) == receipt
    else:
        save(receipt_path, receipt)
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    sys.meta_path.insert(0, ExcludeUnusedConversionFrameworks())
    from faster_whisper import WhisperModel
    model = WhisperModel(str(model_path), device='cpu', compute_type='float32', local_files_only=True)
    for c, audio_binding in zip(prep['chunks'], receipt['audioChunks']):
        assert binding(c['audioPath']) == audio_binding
        response_path = Path(c['audioPath']).with_suffix('.raw.json')
        provenance_path = Path(c['audioPath']).with_suffix('.recognition.json')
        if response_path.exists() or provenance_path.exists():
            assert response_path.exists() and provenance_path.exists()
            old = json.loads(provenance_path.read_text())
            assert old['responseBinding'] == binding(response_path)
            assert old['audioBinding'] == audio_binding
            assert old['runtimeReceiptBinding'] == binding(receipt_path)
            print(json.dumps({'event': 'reuse-verified-chunk', 'index': c['index']}), flush=True)
            continue
        started = time.monotonic()
        segments, info = model.transcribe(c['audioPath'], language='ja', word_timestamps=True, vad_filter=True)
        segments = list(segments)
        words = [w for s in segments for w in (s.words or []) if w.word.strip()]
        # Existing assembler accepts explicit millisecond atom rows. Do not use
        # float seconds: its legacy field decoder treats integral seconds as ms.
        atoms = [{'id': i + 1, 'startMs': round(w.start * 1000),
                  'endMs': round(w.end * 1000), 'text': w.word.strip()}
                 for i, w in enumerate(words)]
        save(response_path, {'text': ''.join(x['text'] for x in atoms), 'segments': atoms})
        save(provenance_path, {
            'schemaVersion': 'unseen-material-offline-stt-chunk-v001',
            'index': c['index'], 'audioBinding': audio_binding,
            'runtimeReceiptBinding': binding(receipt_path), 'responseBinding': binding(response_path),
            'recognitionSegments': [s._asdict() | {'words': [w._asdict() for w in (s.words or [])]} for s in segments],
            'recognizedLanguage': info.language, 'elapsedSeconds': time.monotonic() - started,
        })
        print(json.dumps({'event': 'transcribed-chunk', 'index': c['index'],
                          'total': len(prep['chunks']), 'atoms': len(atoms),
                          'elapsedSeconds': time.monotonic() - started}), flush=True)


if __name__ == '__main__':
    main()

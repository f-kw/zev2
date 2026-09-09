"""Verify full offline recognition coverage and feed the existing STT assembler."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001'
SOURCE = ROOT / 'evals/clip_composition/stt/SsdxVhwxyYo_local30_v004/source'
VIDEO = ROOT / 'evals/clip_composition/research/downloads/SsdxVhwxyYo/SsdxVhwxyYo.mp4'


def binding(p):
    p = Path(p)
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return {'path': str(p.resolve()), 'bytes': p.stat().st_size, 'fileSha256': h.hexdigest()}


def read(p):
    return json.loads(Path(p).read_text())


def save(p, d):
    with Path(p).open('x') as f:
        json.dump(d, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')


def main():
    prep_path = SOURCE / 'audio-preparation.json'
    receipt_path = WORK / 'stt-runtime-receipt-v004.json'
    prep, receipt = read(prep_path), read(receipt_path)
    supplement_path = WORK / 'stt-package-supplement-v001.json'
    supplement = read(supplement_path)
    for package in supplement['packages'].values():
        for ref in package['assetsAndDistributionRecords']:
            assert binding(ref['path']) == ref
    assert binding(prep_path) == receipt['preparationBinding']
    assert prep['partial'] is False
    assert len(prep['chunks']) == prep['fullChunkCount'] == prep['preparedChunkCount']
    assert [c['index'] for c in prep['chunks']] == list(range(len(prep['chunks'])))
    assert prep['chunks'][0]['startMs'] == 0
    assert all(c['endMs'] > c['startMs'] for c in prep['chunks'])
    assert all(a['endMs'] == b['startMs'] for a, b in zip(prep['chunks'], prep['chunks'][1:]))
    assert len(receipt['audioChunks']) == len(prep['chunks'])
    assert receipt['productionIntentInput'] is False and receipt['externalTextInput'] is False
    assert receipt['speakerAttribution'] is False and receipt['modelDownload'] is False
    for ref in receipt['modelBindings'] + [receipt['implementationBinding'], receipt['runtimeBinding']]:
        assert binding(ref['path']) == ref
    receipt_binding = binding(receipt_path)
    evidence, expected_segments = [], []
    discarded, clamped, empty = 0, 0, 0
    for c, audio in zip(prep['chunks'], receipt['audioChunks']):
        assert binding(c['audioPath']) == audio
        response_path = Path(c['audioPath']).with_suffix('.raw.json')
        provenance_path = Path(c['audioPath']).with_suffix('.recognition.json')
        raw, provenance = read(response_path), read(provenance_path)
        assert provenance['index'] == c['index']
        assert provenance['runtimeReceiptBinding'] == receipt_binding
        assert provenance['audioBinding'] == audio
        assert provenance['responseBinding'] == binding(response_path)
        assert raw['text'] == ''.join(x['text'] for x in raw['segments'])
        assert [x['id'] for x in raw['segments']] == list(range(1, len(raw['segments']) + 1))
        assert all(set(x) == {'id', 'startMs', 'endMs', 'text'} for x in raw['segments'])
        if not raw['segments']:
            empty += 1
        for row in raw['segments']:
            start, end = c['startMs'] + row['startMs'], c['startMs'] + row['endMs']
            assert type(start) is int and type(end) is int and end >= start
            # Independently reproduce the existing assembler's exact audio-boundary rule.
            if start >= c['endMs'] or end <= c['startMs']:
                discarded += 1
                continue
            bounded_start, bounded_end = max(start, c['startMs']), min(end, c['endMs'])
            clamped += int((start, end) != (bounded_start, bounded_end))
            expected_segments.append({'id': len(expected_segments) + 1, 'text': row['text'].strip(),
                                      'startMs': bounded_start, 'endMs': bounded_end})
        evidence.append({'index': c['index'], 'recognitionBinding': binding(provenance_path),
                         'responseBinding': binding(response_path), 'audioBinding': audio})
    # No server parameter is supplied. Missing responses fail above before this call.
    command = ['node', '--import', './runner/node_modules/tsx/dist/loader.mjs',
               'evals/clip_composition/run_local_stt_chunked.ts', '--input', str(VIDEO),
               '--id', 'SsdxVhwxyYo_local30_v004', '--role', 'source', '--chunkSec', '30',
               '--reuseChunkDir', str(SOURCE / 'chunks')]
    assert not (SOURCE / 'transcript.json').exists(), 'Assembler output already exists'
    assembly_env = dict(os.environ)
    for name in ['ZEV2_STT_SERVER_URL', 'ZEV_STT_SERVER_URL']:
        assembly_env.pop(name, None)
    with (WORK / 'stt-assembly-v001.log').open('x') as log:
        completed = subprocess.run(command, cwd=ROOT, env=assembly_env, stdout=log, stderr=subprocess.STDOUT)
    assert completed.returncode == 0
    transcript, manifest = read(SOURCE / 'transcript.json'), read(SOURCE / 'manifest.json')
    assert transcript['segments'] == expected_segments
    assert transcript['sourceUri'] == str(VIDEO)
    assert transcript['partial'] is False and transcript['fullChunkCount'] == len(evidence)
    assert transcript['processedChunkCount'] == len(evidence)
    assert prep['chunks'][-1]['endMs'] == round(transcript['originalDurationSec'] * 1000)
    assert manifest['boundaryResolution']['discardedSegmentCount'] == discarded
    assert manifest['boundaryResolution']['clampedSegmentCount'] == clamped
    assert manifest['serverUrl'] == ''
    assert len(manifest['chunks']) == len(evidence)
    for c, saved in zip(prep['chunks'], manifest['chunks']):
        assert (c['index'], c['startMs'], c['endMs'], c['audioPath']) == (
            saved['index'], saved['startMs'], saved['endMs'], saved['audioPath'])
    formal_transcript = dict(transcript)
    formal_transcript['notes'] = [
        '既存faster-whisper large-v2をローカルCPUで使い、元配信の全音声を新規に文字起こしした。',
        '外部の正解区間・固定テーマ・候補採否・話者分離情報は含まない。',
        transcript['notes'][2],
    ]
    formal_path = SOURCE / 'source-transcript.json'
    save(formal_path, formal_transcript)
    assert {k: v for k, v in formal_transcript.items() if k != 'notes'} == {
        k: v for k, v in transcript.items() if k != 'notes'}
    verification = {
        'schemaVersion': 'unseen-material-full-stt-verification-v001', 'status': 'passed',
        'runtimeReceiptBinding': receipt_binding, 'preparationBinding': binding(prep_path),
        'installedPackageSupplementBinding': binding(supplement_path),
        'assemblerImplementationBinding': binding(ROOT / command[3]), 'assemblyCommand': command,
        'recognitionEvidence': evidence, 'assembledTranscriptBinding': binding(SOURCE / 'transcript.json'),
        'formalTranscriptBinding': binding(formal_path), 'assemblerManifestBinding': binding(SOURCE / 'manifest.json'),
        'formalTranscriptChange': 'Only notes describe actual offline recognition; segments and source times unchanged.',
        'fullChunkCount': len(evidence), 'verifiedChunkCount': len(evidence), 'noSpeechChunkCount': empty,
        'sourceSegmentCount': len(expected_segments), 'discardedBoundaryAtomCount': discarded,
        'clampedBoundaryAtomCount': clamped, 'humanExpectedAnswersUsed': False,
        'newSttServerCallsDuringAssembly': 0,
        'checks': {'fullAudioCoverage': 'passed', 'recognitionFileHashes': 'passed', 'sourceOrder': 'passed',
                   'textAndTimesReconstructedFromRawRecognition': 'passed', 'formalTranscriptOnlyNotesChanged': 'passed'},
    }
    save(WORK / 'stt-completion-verification-v001.json', verification)
    print(json.dumps({'status': 'passed', 'chunks': len(evidence), 'segments': len(expected_segments),
                      'formalTranscript': str(formal_path)}))


if __name__ == '__main__':
    main()

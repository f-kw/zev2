"""Preserve every recognized word while representing zero-duration words jointly.

Only consecutive words within one saved decoder segment may be combined. A
zero-duration suffix joins its preceding positive-duration word; a leading
zero-duration prefix joins the following word. Bounds are the first and last
observed word boundaries. No timestamp, transcript text, or confidence is guessed.
"""
import json
import os
from pathlib import Path
import subprocess

from verify_unseen_material_stt_v001 import ROOT, WORK, VIDEO, binding, read, save

RAW = ROOT / 'evals/clip_composition/stt/SsdxVhwxyYo_local30_v004/source'
NORMALIZED = ROOT / 'evals/clip_composition/stt/SsdxVhwxyYo_local30_v005/source'


def group_decoder_words(words, first_raw_id):
    groups, prefix = [], []
    for offset, word in enumerate(words):
        item = {'rawAtomId': first_raw_id + offset,
                'startMs': round(word['start'] * 1000), 'endMs': round(word['end'] * 1000),
                'text': word['word'].strip()}
        assert item['text'] and item['endMs'] >= item['startMs'] >= 0
        if item['startMs'] == item['endMs']:
            if groups:
                groups[-1].append(item)
            else:
                prefix.append(item)
        else:
            groups.append(prefix + [item])
            prefix = []
    assert not prefix, 'Decoder segment has no positive-duration word'
    for group in groups:
        assert group[0]['startMs'] < group[-1]['endMs']
        assert all(a['endMs'] <= b['startMs'] for a, b in zip(group, group[1:]))
    return groups


def main():
    old_verification = read(WORK / 'stt-completion-verification-v001.json')
    receipt = read(WORK / 'stt-runtime-receipt-v004.json')
    assert old_verification['status'] == 'passed'
    assert old_verification['runtimeReceiptBinding'] == binding(WORK / 'stt-runtime-receipt-v004.json')
    prep = read(RAW / 'audio-preparation.json')
    assert binding(RAW / 'audio-preparation.json') == receipt['preparationBinding']
    assert prep['partial'] is False and len(prep['chunks']) == 455
    (NORMALIZED / 'chunks').mkdir(parents=True)
    chunks, evidence, expected, source_text = [], [], [], []
    zero_count = grouped_count = raw_count = 0
    for chunk, audio_binding in zip(prep['chunks'], receipt['audioChunks']):
        assert binding(chunk['audioPath']) == audio_binding
        old_audio = Path(chunk['audioPath'])
        raw_path = old_audio.with_suffix('.raw.json')
        recognition_path = old_audio.with_suffix('.recognition.json')
        raw, recognition = read(raw_path), read(recognition_path)
        assert recognition['responseBinding'] == binding(raw_path)
        assert recognition['audioBinding'] == audio_binding
        assert recognition['runtimeReceiptBinding'] == old_verification['runtimeReceiptBinding']
        reconstructed, groups = [], []
        for segment in recognition['recognitionSegments']:
            words = [word for word in segment['words'] if word['word'].strip()]
            first_raw_id = len(reconstructed) + 1
            new_groups = group_decoder_words(words, first_raw_id)
            groups.extend(new_groups)
            reconstructed.extend({'id': first_raw_id + i,
                                  'startMs': round(word['start'] * 1000),
                                  'endMs': round(word['end'] * 1000), 'text': word['word'].strip()}
                                 for i, word in enumerate(words))
        assert reconstructed == raw['segments'], 'Saved raw atoms differ from decoder words'
        rows = [{'id': i + 1, 'startMs': group[0]['startMs'], 'endMs': group[-1]['endMs'],
                 'text': ''.join(word['text'] for word in group)} for i, group in enumerate(groups)]
        assert ''.join(row['text'] for row in rows) == raw['text']
        assert [word['rawAtomId'] for group in groups for word in group] == list(range(1, len(raw['segments']) + 1))
        assert all(a['endMs'] <= b['startMs'] for a, b in zip(rows, rows[1:]))
        zero_count += sum(row['startMs'] == row['endMs'] for row in raw['segments'])
        grouped_count += sum(len(group) > 1 for group in groups)
        raw_count += len(raw['segments'])
        new_audio = NORMALIZED / 'chunks' / old_audio.name
        os.link(old_audio, new_audio)
        new_raw = new_audio.with_suffix('.raw.json')
        save(new_raw, {'text': raw['text'], 'segments': rows})
        chunks.append({**chunk, 'audioPath': str(new_audio)})
        evidence.append({'index': chunk['index'], 'audioBinding': binding(new_audio),
                         'recognitionBinding': binding(recognition_path), 'rawResponseBinding': binding(raw_path),
                         'normalizedResponseBinding': binding(new_raw),
                         'groups': [{'normalizedAtomId': i + 1,
                                     'rawAtomIds': [word['rawAtomId'] for word in group]} for i, group in enumerate(groups)]})
        source_text.append(raw['text'])
        for row in rows:
            start = chunk['startMs'] + row['startMs']
            end = chunk['startMs'] + row['endMs']
            assert start < chunk['endMs'] and end > chunk['startMs']
            expected.append({'id': len(expected) + 1, 'startMs': max(start, chunk['startMs']),
                             'endMs': min(end, chunk['endMs']), 'text': row['text']})
    normalization_path = WORK / 'stt-zero-duration-normalization-v001.json'
    save(normalization_path, {
        'schemaVersion': 'unseen-material-stt-zero-duration-normalization-v001', 'status': 'passed',
        'implementationBinding': binding(__file__), 'runtimeReceiptBinding': old_verification['runtimeReceiptBinding'],
        'policy': 'Join zero-duration words to adjacent positive-duration words within the same saved decoder segment; retain all recognized text and observed outer boundaries.',
        'fullChunkCount': len(chunks), 'rawAtomCount': raw_count, 'zeroDurationRawAtomCount': zero_count,
        'normalizedAtomCount': len(expected), 'compoundAtomCount': grouped_count,
        'deletedTextCount': 0, 'inventedTimestampCount': 0, 'newRecognitionCalls': 0, 'chunks': evidence,
    })
    save(NORMALIZED / 'audio-preparation.json', {**prep, 'itemId': 'SsdxVhwxyYo_local30_v005',
                                               'inputPath': str(VIDEO), 'chunks': chunks})
    command = ['node', '--import', './runner/node_modules/tsx/dist/loader.mjs',
               'evals/clip_composition/run_local_stt_chunked.ts', '--input', str(VIDEO),
               '--id', 'SsdxVhwxyYo_local30_v005', '--role', 'source', '--chunkSec', '30',
               '--reuseChunkDir', str(NORMALIZED / 'chunks')]
    env = dict(os.environ)
    for name in ['ZEV2_STT_SERVER_URL', 'ZEV_STT_SERVER_URL']:
        env.pop(name, None)
    with (WORK / 'stt-assembly-v002.log').open('x') as log:
        result = subprocess.run(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    assert result.returncode == 0
    transcript, manifest = read(NORMALIZED / 'transcript.json'), read(NORMALIZED / 'manifest.json')
    assert transcript['segments'] == expected
    assert ''.join(row['text'] for row in transcript['segments']) == ''.join(source_text)
    assert all(row['startMs'] < row['endMs'] for row in transcript['segments'])
    assert transcript['partial'] is False and transcript['processedChunkCount'] == transcript['fullChunkCount'] == len(chunks)
    assert transcript['sourceUri'] == str(VIDEO)
    assert manifest['serverUrl'] == '' and manifest['boundaryResolution']['discardedSegmentCount'] == 0
    assert chunks[0]['startMs'] == 0 and chunks[-1]['endMs'] == round(transcript['originalDurationSec'] * 1000)
    assert all(a['endMs'] == b['startMs'] for a, b in zip(chunks, chunks[1:]))
    formal = dict(transcript)
    formal['notes'] = [
        '元配信の全音声を、既存faster-whisper large-v2によりローカルで新規認識した。外部の正解区間・採否・話者分離情報は入力していない。',
        '長さ0の認識語は同じ認識発話内の隣接語と結合した。認識本文を削除せず、結合範囲の端点は認識済みの時刻を使う。認識語単独の正確な発声時刻を保証しない。',
        transcript['notes'][2],
    ]
    formal_path = NORMALIZED / 'source-transcript.json'
    save(formal_path, formal)
    verification_path = WORK / 'stt-completion-verification-v002.json'
    save(verification_path, {
        'schemaVersion': 'unseen-material-full-stt-verification-v001', 'status': 'passed',
        'runtimeReceiptBinding': old_verification['runtimeReceiptBinding'],
        'installedPackageSupplementBinding': old_verification['installedPackageSupplementBinding'],
        'rawRecognitionVerificationBinding': binding(WORK / 'stt-completion-verification-v001.json'),
        'normalizationBinding': binding(normalization_path), 'preparationBinding': binding(NORMALIZED / 'audio-preparation.json'),
        'assemblerImplementationBinding': binding(ROOT / command[3]), 'assemblyCommand': command,
        'assembledTranscriptBinding': binding(NORMALIZED / 'transcript.json'), 'formalTranscriptBinding': binding(formal_path),
        'assemblerManifestBinding': binding(NORMALIZED / 'manifest.json'),
        'formalTranscriptChange': 'Only notes differ from the assembled normalized transcript; all raw recognition text is preserved.',
        'fullChunkCount': len(chunks), 'verifiedChunkCount': len(chunks), 'sourceSegmentCount': len(expected),
        'rawRecognitionAtomCount': raw_count, 'zeroDurationRawAtomCount': zero_count,
        'discardedBoundaryAtomCount': 0, 'humanExpectedAnswersUsed': False, 'newSttServerCallsDuringAssembly': 0,
        'checks': {'fullAudioCoverage': 'passed', 'allRecognizedTextPreserved': 'passed', 'rawAtomMembershipExactlyOnce': 'passed',
                   'positiveDurationAndSourceOrder': 'passed', 'onlyObservedOuterBoundaries': 'passed'},
    })
    print(json.dumps({'status': 'passed', 'rawAtoms': raw_count, 'zeroDurationRawAtoms': zero_count,
                      'normalizedAtoms': len(expected), 'formalTranscript': str(formal_path)}))


if __name__ == '__main__':
    main()

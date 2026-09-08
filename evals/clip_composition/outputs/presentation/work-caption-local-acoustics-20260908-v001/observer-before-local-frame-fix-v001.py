"""Offline fixed-text sensor. Reads only original captions, mappings and local STT audio.

No transcription, repair, renderer or human-answer input. Freeze before observing.
"""
import hashlib
import importlib.abc
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'evals/clip_composition/outputs/presentation/work-caption-local-acoustics-20260908-v001'
MODEL = Path('/Users/kawafmm/.cache/huggingface/hub/models--Systran--faster-whisper-large-v2/snapshots/f0fe81560cb8b68660e564f55dd99207059c092e')
STT = ROOT / 'evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source'
MANIFESTS = [
    ('digest-before', 'work-digest-caption-sync-internal-edit-20260907-v001/internal-edit-v001/manifest.json'),
    ('distant-before', 'work-distant-connection-skill-e2e-20260907-v001/run-v001/verification.json'),
]
RULE = {
    'version': 'caption-local-acoustics-window-v001',
    'modelSelection': 'Same cached large-v2 CT2 model and CPU float32 as the existing fixed-text observer; no comparison.',
    'initial': 'For each original STT chunk containing target IDs, hull of adopted-media intersection, original target STT intervals and current display mapped to the source, clipped to that chunk. Outward conversion to audio samples only.',
    'context': 'Ordered original STT units intersecting the window, plus all target units in that chunk, closed to a contiguous original ID range. Text and IDs are fixed; no transcription.',
    'retry': 'If either target endpoint contacts the window edge, retry once with the complete original chunk and all its fixed text. If already the full chunk, do not retry. No other retry condition.',
    'edge': 'The first/last attention time-grid cell (one model alignment stride) is edge contact. Also unresolved: zero-duration group, target boundary inside a token group, incomplete coverage, nonpositive target interval.',
    'resolution': 'Unique means one exact structural token boundary away from the window edge, not perceptual certainty. No interpolation, offsets, averaging, clipping or timing promotion.',
    'limit': 'Existing model maximum audio window; never silently truncate oversized chunks. At most two observations per caption/chunk.',
}


def binding(p):
    p = Path(p)
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return {'path': str(p), 'bytes': p.stat().st_size, 'fileSha256': h.hexdigest()}


def read(p):
    return json.loads(Path(p).read_text())


def save(p, value):
    with Path(p).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')


def bound_read(ref, seen):
    p = ROOT / ref['path']
    actual = binding(p)
    assert actual['fileSha256'] == ref['fileSha256'], str(p)
    seen[str(p)] = actual
    return read(p)


def plan_window(chunk, target_ids, adopted, display_source):
    targets = [a for a in chunk['atoms'] if a['sourceSegmentId'] in target_ids]
    assert targets
    lo, hi = chunk['startMs'], chunk['endMs']
    intervals = [(a['startMs'], a['endMs']) for a in targets]
    for start, end in [(adopted['sourceStartMs'], adopted['sourceEndMs']), display_source]:
        if max(lo, start) < min(hi, end):
            intervals.append((max(lo, start), min(hi, end)))
    start, end = max(lo, min(i[0] for i in intervals)), min(hi, max(i[1] for i in intervals))
    assert start < end
    selected = [i for i, a in enumerate(chunk['atoms'])
                if a['sourceSegmentId'] in target_ids or (a['endMs'] > start and a['startMs'] < end)]
    atoms = chunk['atoms'][min(selected):max(selected) + 1]
    return {'startMs': start, 'endMs': end, 'atoms': atoms, 'text': ''.join(a['text'] for a in atoms)}


def inputs():
    seen = {}
    summary_path = STT / 'local-stt-response.raw.json'
    seen[str(summary_path)] = binding(summary_path)
    summaries = read(summary_path)['chunks']
    chunk_for_id, offset = {}, 0
    for chunk in summaries:
        for i in range(chunk['segmentCount']):
            chunk_for_id[offset + i + 1] = (chunk, offset)
        offset += chunk['segmentCount']
    chunks, cases = {}, []
    for case_id, relative in MANIFESTS:
        p = ROOT / 'evals/clip_composition/outputs/presentation' / relative
        manifest = bound_read(binding(p), seen)
        artifacts = manifest.get('caption', manifest)['artifacts']
        meaning = bound_read(artifacts['meaning'], seen)
        instruction = bound_read(artifacts['instruction'], seen)
        job = bound_read(artifacts['rendererJob'], seen)
        timeline = bound_read(job['cropAppliedBaseMedia']['timeline'], seen)
        assert timeline['baseMedia']['frameRate'] == '30/1'
        transcript = bound_read(meaning['transcriptBinding'], seen)
        stt = {s['id']: s for s in transcript['segments']}
        atoms = {a['atomOccurrenceId']: a for a in meaning['atomOccurrences']}
        rows = []
        instructions = instruction['instructions']
        for i, ins in enumerate(instructions):
            text_ids = ins['targetProvenance']['atomOccurrenceIds']
            selected = [atoms[a] for a in text_ids]
            assert ''.join(a['text'] for a in selected) == ins['content']['text']
            raw = [stt[a['sourceSegmentId']] for a in selected]
            assert all(s['text'] == a['text'] for s, a in zip(raw, selected))
            ids = [s['id'] for s in raw]
            assert all(b == a + 1 for a, b in zip(ids, ids[1:]))
            segment_ids = {s['timelineSegmentId'] for a in selected for s in a['retainedSpans']}
            assert len(segment_ids) == 1
            adopted = next(s for s in timeline['segments'] if s['segmentId'] in segment_ids)
            display = ins['outputTime']
            display_source = [(display[k] - adopted['outputStartFrame'] + adopted['sourceStartFrame30']) * 1000 / 30
                              for k in ['startFrame', 'endFrameExclusive']]
            plans = []
            for chunk_index in sorted({chunk_for_id[x][0]['index'] for x in ids}):
                if chunk_index not in chunks:
                    c, base_id = next(v for v in chunk_for_id.values() if v[0]['index'] == chunk_index)
                    r = bound_read(binding(c['rawResponsePath']), seen)
                    assert len(r['segments']) == c['segmentCount']
                    aa = []
                    for n, s in enumerate(r['segments']):
                        sid = base_id + n + 1
                        a = {'sourceSegmentId': sid, 'text': s['text'], 'startMs': c['startMs'] + s['startMs'], 'endMs': c['startMs'] + s['endMs']}
                        assert (a['text'], a['startMs'], a['endMs']) == (stt[sid]['text'], stt[sid]['startMs'], stt[sid]['endMs'])
                        aa.append(a)
                    assert ''.join(a['text'] for a in aa) == r['text']
                    audio = binding(c['audioPath']); seen[audio['path']] = audio
                    chunks[chunk_index] = {'index': chunk_index, 'startMs': c['startMs'], 'endMs': c['endMs'], 'atoms': aa, 'text': r['text'], 'audioBinding': audio}
                chunk = chunks[chunk_index]
                plans.append({'chunkIndex': chunk_index, 'targetIds': [x for x in ids if chunk_for_id[x][0]['index'] == chunk_index],
                              'initial': plan_window(chunk, ids, adopted, display_source)})
            rows.append({'caseId': case_id, 'instructionId': ins['instructionId'], 'text': ins['content']['text'],
                         'textIds': text_ids, 'sourceIds': ids, 'adoptedPosition': adopted, 'plans': plans,
                         'featuresWithoutAcoustics': {'sttIntervals': [{'startMs': s['startMs'], 'endMs': s['endMs']} for s in raw],
                             'display': display, 'previousEndFrame': instructions[i-1]['outputTime']['endFrameExclusive'] if i else None,
                             'nextStartFrame': instructions[i+1]['outputTime']['startFrame'] if i+1 < len(instructions) else None,
                             'mappingAvailable': True}})
        cases.append({'caseId': case_id, 'rows': rows})
    return {'cases': cases, 'chunks': list(chunks.values()), 'sourceBindings': list(seen.values())}


def freeze():
    job = inputs()
    implementation = [binding(__file__), binding(sys.executable)]
    versions = {}
    for module, distribution in [('faster_whisper', 'faster-whisper'), ('ctranslate2', 'ctranslate2'), ('tokenizers', 'tokenizers'), ('av', 'av'), ('numpy', 'numpy')]:
        directory = Path(importlib.util.find_spec(module).origin).parent
        versions[distribution] = importlib.metadata.version(distribution)
        implementation.extend(binding(p) for p in sorted(directory.rglob('*')) if p.is_file() and p.suffix in {'.py', '.so', '.dylib'})
    job.update({'schemaVersion': 'caption-local-acoustic-freeze-v001', 'rule': RULE, 'modelPath': str(MODEL),
                'modelBindings': [binding(p) for p in sorted(MODEL.iterdir()) if p.is_file()],
                'implementationBindings': implementation, 'versions': versions,
                'selectorBinding': binding(ROOT / 'packages/shared/src/caption-review-selector-v001.ts'),
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'humanAnswersRead': False})
    save(WORK / 'pre-observation-freeze-v001.json', job)
    print(json.dumps({'stage': 'frozen', 'cases': [(c['caseId'], len(c['rows'])) for c in job['cases']], 'binding': binding(WORK / 'pre-observation-freeze-v001.json')}), flush=True)


def interpret(window, words, tokens, target_ids, stride_ms):
    assert ''.join(w['word'] for w in words) == window['text'], 'TEXT_COVERAGE_MISMATCH'
    assert [t for w in words for t in w['tokens']] == tokens, 'TOKEN_COVERAGE_MISMATCH'
    offsets, cursor = [], 0
    for a in window['atoms']:
        offsets.append((cursor, cursor + len(a['text']), a['sourceSegmentId']))
        cursor += len(a['text'])
    target_offsets = [o for o in offsets if o[2] in target_ids]
    assert len(target_offsets) == len(target_ids)
    start_offset, end_offset = target_offsets[0][0], target_offsets[-1][1]
    units, cursor, prior_end = [], 0, 0
    duration = window['endMs'] - window['startMs']
    for i, word in enumerate(words):
        start, end = word['start'] * 1000, word['end'] * 1000
        assert math.isfinite(start) and math.isfinite(end) and start >= prior_end and end >= start and end <= duration, 'INVALID_ACOUSTIC_INTERVAL'
        prior_end = end
        finish = cursor + len(word['word'])
        units.append({'unitOrdinal': i + 1, 'text': word['word'], 'tokens': word['tokens'], 'probability': word['probability'],
                      'startTextOffset': cursor, 'endTextOffset': finish,
                      'sourceSegmentIds': [sid for lo, hi, sid in offsets if lo < finish and hi > cursor],
                      'startMs': window['startMs'] + start, 'endMs': window['startMs'] + end,
                      'startEdgeContact': start < stride_ms, 'endEdgeContact': duration - end <= stride_ms,
                      'positiveDuration': end > start})
        cursor = finish
    def endpoint(side, wanted):
        matches = [u for u in units if u[side + 'TextOffset'] == wanted]
        if len(matches) != 1:
            return {'resolved': False, 'candidateMs': None, 'edgeContact': False, 'reason': 'target-boundary-inside-token-group-or-not-unique'}
        unit = matches[0]
        edge = unit[side + 'EdgeContact']
        reason = 'window-edge-does-not-establish-speech-boundary' if edge else 'nonpositive-token-group' if not unit['positiveDuration'] else None
        return {'resolved': reason is None, 'candidateMs': unit[side + 'Ms'], 'edgeContact': edge, 'reason': reason, 'unitOrdinal': unit['unitOrdinal']}
    start, end = endpoint('start', start_offset), endpoint('end', end_offset)
    if start['candidateMs'] is not None and end['candidateMs'] is not None and end['candidateMs'] <= start['candidateMs']:
        for e in (start, end):
            e['resolved'] = False
            e['reason'] = 'nonpositive-target-interval'
    return {'units': units, 'targetStart': start, 'targetEnd': end, 'edgeContact': start['edgeContact'] or end['edgeContact'],
            'targetUnitOrdinals': [u['unitOrdinal'] for u in units if any(s in target_ids for s in u['sourceSegmentIds'])]}


class ExcludeUnusedConversionFrameworks(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'tensorflow'}:
            raise ImportError('Optional conversion framework excluded from existing converted CT2 inference: ' + fullname)


def observe():
    freeze_path = WORK / 'pre-observation-freeze-v001.json'
    job = read(freeze_path)
    for ref in job['modelBindings'] + job['implementationBindings'] + job['sourceBindings'] + [job['selectorBinding']]:
        assert binding(ref['path']) == ref, ref['path']
    assert job['rule'] == RULE
    os.environ.update({'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_DATASETS_OFFLINE': '1'})
    # Fail closed even if an optional dependency attempts a network operation.
    def deny_network(event, args):
        if event in {'socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'socket.sendto'}:
            raise RuntimeError('OFFLINE_SENSOR_NETWORK_FORBIDDEN')
    sys.addaudithook(deny_network)
    sys.meta_path.insert(0, ExcludeUnusedConversionFrameworks())
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio, pad_or_trim
    from faster_whisper.tokenizer import Tokenizer
    model = WhisperModel(job['modelPath'], device='cpu', compute_type='float32', local_files_only=True)
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task='transcribe', language='ja')
    rate = model.feature_extractor.sampling_rate
    stride_ms = model.time_precision * 1000
    maximum_samples = model.feature_extractor.n_samples
    save(WORK / 'runtime-v001.json', {'freezeBinding': binding(freeze_path), 'sampleRate': rate, 'alignmentStrideMs': stride_ms,
                                    'maximumSamples': maximum_samples, 'network': 'offline flags, local model path, Python socket audit rejection',
                                    'conversionFrameworks': 'excluded as in existing runtime wrapper'})
    chunks = {c['index']: c for c in job['chunks']}
    decoded = {}
    results = []
    for case in job['cases']:
        for ordinal, row in enumerate(case['rows']):
            attempts, chosen = [], []
            for plan in row['plans']:
                chunk = chunks[plan['chunkIndex']]
                if chunk['index'] not in decoded:
                    audio = decode_audio(chunk['audioBinding']['path'], sampling_rate=rate)
                    assert len(audio) * 1000 == (chunk['endMs'] - chunk['startMs']) * rate
                    assert len(audio) <= maximum_samples, 'ORIGINAL_CHUNK_EXCEEDS_MODEL_WINDOW'
                    decoded[chunk['index']] = audio
                for stage in range(2):
                    window = plan['initial'] if stage == 0 else {k: chunk[k] for k in ['startMs', 'endMs', 'text', 'atoms']}
                    lo = math.floor((window['startMs'] - chunk['startMs']) * rate / 1000)
                    hi = math.ceil((window['endMs'] - chunk['startMs']) * rate / 1000)
                    assert 0 <= lo < hi <= len(decoded[chunk['index']])
                    audio = decoded[chunk['index']][lo:hi]
                    effective = {**window, 'startMs': chunk['startMs'] + lo * 1000 / rate, 'endMs': chunk['startMs'] + hi * 1000 / rate}
                    features = model.feature_extractor(audio)
                    num_frames = min(features.shape[-1] - 1, model.feature_extractor.nb_max_frames)
                    tokens = tokenizer.encode(window['text'])
                    assert tokenizer.decode(tokens) == window['text']
                    began = time.monotonic()
                    encoded = model.encode(pad_or_trim(features[:, :num_frames], model.feature_extractor.nb_max_frames))
                    words = model.find_alignment(tokenizer, tokens, encoded, num_frames)
                    interpreted = interpret(effective, words, tokens, plan['targetIds'], stride_ms)
                    result = {'chunkIndex': chunk['index'], 'attempt': stage + 1, 'window': effective,
                              'inputAudioBinding': chunk['audioBinding'], 'decodedWindowSha256': hashlib.sha256(audio.tobytes()).hexdigest(),
                              'pcmRepresentation': 'native float32 mono', 'sampleRate': rate, 'samples': len(audio),
                              'numFrames': num_frames, 'textTokens': tokens, 'words': words, **interpreted,
                              'elapsedSec': time.monotonic() - began}
                    attempts.append(result)
                    if not interpreted['edgeContact'] or (lo == 0 and hi == len(decoded[chunk['index']])) or stage == 1:
                        chosen.append(len(attempts) - 1)
                        break
            final = [attempts[i] for i in chosen]
            start, end = final[0]['targetStart'].copy(), final[-1]['targetEnd'].copy()
            if start['candidateMs'] is not None and end['candidateMs'] is not None and end['candidateMs'] <= start['candidateMs']:
                for e in (start, end):
                    e.update(resolved=False, reason='nonpositive-cross-chunk-target-interval')
            target_units = [u for a in final for u in a['units'] if u['unitOrdinal'] in a['targetUnitOrdinals']]
            adopted = row['adoptedPosition']
            outside = [u for u in target_units if u['positiveDuration'] and
                       ((not u['endEdgeContact'] and u['endMs'] <= adopted['sourceStartMs']) or
                        (not u['startEdgeContact'] and u['startMs'] >= adopted['sourceEndMs']))]
            def output_frame(e):
                return e['candidateMs'] * 30 / 1000 - adopted['sourceStartFrame30'] + adopted['outputStartFrame'] if e['resolved'] else None
            acoustic = {'available': bool(target_units), 'startResolved': start['resolved'], 'endResolved': end['resolved'],
                        'startOutputFrame': output_frame(start), 'endOutputFrame': output_frame(end), 'whollyOutsideAdoptedUnitCount': len(outside)}
            result = {'caseId': row['caseId'], 'instructionId': row['instructionId'], 'text': row['text'], 'textIds': row['textIds'],
                      'sourceIds': row['sourceIds'], 'freezeBinding': binding(freeze_path), 'attempts': attempts, 'chosenAttemptIndices': chosen,
                      'startBoundary': start, 'endBoundary': end, 'uniqueBoundaryPair': start['resolved'] and end['resolved'],
                      'acoustic': acoustic, 'sensorEvidenceOnly': True, 'humanQualityApproved': False}
            target = WORK / f'{case["caseId"]}-caption-{ordinal+1:04d}-observation-v001.json'
            save(target, result); results.append(binding(target))
            print(json.dumps({'stage': 'observed', 'case': row['caseId'], 'ordinal': ordinal+1, 'attempts': len(attempts),
                              'startResolved': start['resolved'], 'endResolved': end['resolved']}), flush=True)
    save(WORK / 'observation-index-v001.json', {'freezeBinding': binding(freeze_path), 'observations': results})


if __name__ == '__main__':
    {'freeze': freeze, 'observe': observe}[sys.argv[1]]()

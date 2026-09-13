import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp, rm} from 'node:fs/promises';
import {
  composeSelectedDigestRangesV1, projectSavedDigestCaptionsV1, selectAllCandidatesV1, type RetainedRangeV1,
} from './digest_v1.mts';
import {loadDigestJobV1, readSavedDigestCaptionsV1, buildDigestAdoptionV1} from './run_digest_v1.mts';
import {ROOT, readBound, readJson, same, bind, publish, sha, formal, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {assembleAdoptedCaptionCoreV001, projectAdoptedMediaRangesV001} from './adopted_media_manufacturing_v001.mts';
import {loadDigestRetentionContextV1, reconstructDigestRetentionV1, resolveDigestRetentionParentsV1} from './digest_v1_retention.mts';
import {validateInternalRetentionIdsV001, resolveInternalRetentionV001} from './candidate_internal_retention_validation_v001.mts';
import {constructSelectionCandidateSetV001} from './run_candidate_selection_e2e_v001.mts';
import {INTERNAL_TASK} from './run_candidate_internal_edit_v001.mts';

const transcript = Array.from({length: 12}, (_, i) => ({id: i + 1}));
const range = (candidateId: string, blockOrdinal: number, start: number, end: number, ids: number[]): RetainedRangeV1 => ({
  candidateId, blockOrdinal, segmentId: `retained-${candidateId}-${blockOrdinal}`,
  sourceStartMs: start, sourceEndMs: end, sourceSegmentIds: ids,
});

test('保持後の元素材時刻で並べ、候補外端順にも入力の並び順にも依存しない', () => {
  const input = [range('candidate-0001', 1, 100, 120, [5]), range('candidate-0002', 1, 50, 60, [2]),
    range('candidate-0001', 2, 200, 220, [9])];
  const ids = ['candidate-0001', 'candidate-0002'];
  const result = composeSelectedDigestRangesV1(ids, ids, input, transcript);
  assert.deepEqual(result.map(r => r.sourceStartMs), [50, 100, 200]);
  assert.deepEqual(composeSelectedDigestRangesV1([...ids].reverse(), ids, [...input].reverse(), transcript), result);
});

test('同一・包含・連鎖する重複だけを統合し、元IDと全保持根拠を残す。隙間を埋めない', () => {
  const ids = ['candidate-0001', 'candidate-0002'];
  const input = [range(ids[0], 1, 0, 20, [1, 2]), range(ids[1], 1, 0, 20, [1, 2]),
    range(ids[1], 2, 5, 10, [2]), range(ids[0], 2, 15, 30, [2, 3]),
    range(ids[1], 3, 29, 40, [3, 4]), range(ids[0], 3, 50, 60, [5]), range(ids[1], 4, 60, 70, [6])];
  const result = composeSelectedDigestRangesV1(ids, ids, input, transcript);
  assert.deepEqual(result.map(r => [r.sourceStartMs, r.sourceEndMs]), [[0, 40], [50, 60], [60, 70]]);
  assert.deepEqual(result[0].sourceSegmentIds, [1, 2, 3, 4]);
  assert.deepEqual(result[0].candidateIds, ids); assert.equal(result[0].retainedRanges.length, 5);
  assert.deepEqual(composeSelectedDigestRangesV1(ids, ids, [...input].reverse(), transcript), result);
});

test('C全採用と採用IDの部分集合が同じ後段を使い、不明IDや保持不足を拒否する', () => {
  const candidates = [{candidateId: 'candidate-0001'}, {candidateId: 'candidate-0002'}];
  const all = selectAllCandidatesV1(candidates);
  const input = [range(all[0], 1, 0, 20, [1]), range(all[1], 1, 50, 60, [5])];
  assert.equal(composeSelectedDigestRangesV1(all, all, input, transcript).length, 2);
  assert.deepEqual(composeSelectedDigestRangesV1(all, [all[1]], input, transcript).map(r => r.candidateIds), [[all[1]]]);
  assert.throws(() => composeSelectedDigestRangesV1(all, ['unknown'], input, transcript), /ADOPTED_IDS/);
  assert.throws(() => composeSelectedDigestRangesV1(all, all, input.slice(0, 1), transcript), /RETENTION_MISSING/);
  assert.throws(() => composeSelectedDigestRangesV1(all, [all[0]], [range(all[0], 1, 10, 10, [1])], transcript), /RANGE_INVALID/);
});

const jobPath = process.env.ZEV_DIGEST_V1_TEST_JOB;
assert(jobPath, 'ZEV_DIGEST_V1_TEST_JOB must name the prepared, bound execution job');
const loaded = loadDigestJobV1(jobPath);

test('保存済み3候補から7保持区間を再構築し、既存Coreの時間投影で4,831フレームを得る', async () => {
  const c = await loaded;
  const ids = selectAllCandidatesV1(c.candidateSet.candidates);
  const {adoption, editPlan} = buildDigestAdoptionV1(c, ids);
  assert.equal(ids.length, 3); assert.equal(adoption.segments.length, 7);
  assert.deepEqual(adoption.segments.map(s => [s.sourceStartMs, s.sourceEndMs, s.sourceSegmentIds]),
    c.retention.segments.map((s: Json) => [s.sourceStartMs, s.sourceEndMs, s.sourceSegmentIds]));
  const saved = await readSavedDigestCaptionsV1(c);
  const base = saved.sourcePackage.reconstructionMap.caseContexts[0].baseMediaInput;
  const originalTimeline = await readBound(base.timeline);
  const oldRoot = c.sourceContext.plan.reuseInternalRetention.path.replace(/\/machine-adoption.json$/u, '');
  const inspection = await readJson(`${oldRoot}/source-media-inspection.json`);
  const mapping = projectAdoptedMediaRangesV001(editPlan, inspection.media);
  assert.equal(mapping.mappings.at(-1).outputEndFrame, 4831);
  assert(same(mapping.mappings.map(({audioSamples, ...s}: Json) => s), originalTimeline.segments));
});

test('既存表示判断・人間補修を再利用し、共通Coreが同じ32字幕・時刻・改行を製造する', async () => {
  const c = await loaded;
  const {adoption} = buildDigestAdoptionV1(c, selectAllCandidatesV1(c.candidateSet.candidates));
  const saved = await readSavedDigestCaptionsV1(c);
  const base = saved.sourcePackage.reconstructionMap.caseContexts[0].baseMediaInput;
  const input = projectSavedDigestCaptionsV1(c, adoption, base, saved);
  assert.deepEqual(input.counts, {captionAtoms: 415, captions: 32, explicitlyOmittedAtoms: 9});
  const captionAdoption = {schemaVersion: 'candidate-digest-caption-adoption-v001',
    machineAdoptionBinding: bind(`${c.plan.outputRoot}/machine-adoption.json`, adoption),
    reusedDisplayBindings: c.job.captionReuse};
  const core = await assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, input.traces);
  const oldInstruction = await readJson(c.job.captionReuse.meaning.path.replace(/meaning-input.json$/u, 'instruction.json'));
  assert.deepEqual(core.instruction.instructions.map((s: Json) => ({content: s.content, outputTime: s.outputTime,
    sourceAtoms: s.targetProvenance.atomOccurrenceIds})), oldInstruction.instructions.map((s: Json) => ({content: s.content,
    outputTime: s.outputTime, sourceAtoms: s.targetProvenance.atomOccurrenceIds})));
  assert.deepEqual(core.selection.response, saved.selection.response);
});

test('保存済み表示判断で覆えない新しい切断・欠けた字幕・不明な省略を黙って補わない', async () => {
  const c = await loaded;
  const {adoption} = buildDigestAdoptionV1(c, selectAllCandidatesV1(c.candidateSet.candidates));
  const saved = await readSavedDigestCaptionsV1(c);
  const base = saved.sourcePackage.reconstructionMap.caseContexts[0].baseMediaInput;
  const invalid = structuredClone(adoption);
  invalid.segments[0].sourceSegmentIds = invalid.segments[0].sourceSegmentIds.filter((id: number) => id !== saved.meaning.atomOccurrences[0].sourceSegmentId);
  assert.throws(() => projectSavedDigestCaptionsV1(c, invalid, base, saved), /SAVED_DISPLAY_DOES_NOT_COVER_NEW_CUT/);
  const noOmission = {...saved, omittedSourceSegmentIds: []};
  assert.throws(() => projectSavedDigestCaptionsV1(c, adoption, base, noOmission), /EXISTING_CAPTION_JUDGMENT_MISSING/);
});

test('実際の保持ファイル読取から逆順・候補間重複を統合まで通し、候補内部の不正は拒否する', async () => {
  const c = await loaded, source = c.sourceContext;
  const dir = await mkdtemp(path.join(ROOT, 'evals/clip_composition/outputs/presentation/work-digest-v1-adapter-test-'));
  const relative = path.relative(ROOT, dir);
  const save = (name: string, value: Json) => publish(`${relative}/${name}.json`, value);
  try {
    // 固定検査入力。既存素材の発話1〜3を使い、B=[2,3]、A=[1,2]をB→Aで保存する。
    // 既存の判断や成果物は書き換えず、この検査専用の原本参照を閉じる。
    const us = source.utterances.utterances.slice(0, 3);
    const sets = [[us[1], us[2]], [us[0], us[1]]];
    const rows = sets.map((units, i) => ({candidateId: ['test-candidate-b', 'test-candidate-a'][i],
      sourceId: source.plan.request.sourceId, title: `重複接続の固定入力${i + 1}`,
      contextStartUtteranceId: units[0].utteranceId, contextEndUtteranceId: units.at(-1)!.utteranceId,
      evidenceUtteranceIds: units.map((u: Json) => u.utteranceId)}));
    const discovery = structuredClone(source.discovery);
    discovery.answer.candidates = rows.map(({candidateId, ...r}) => ({...r, reason: '候補間重複と逆順接続の固定検査'}));
    const parents = resolveDigestRetentionParentsV1({...source, candidateSet: {...source.candidateSet, candidates: rows}});
    const discoveryBinding = await save('discovery', discovery);
    const identities = await readBound(source.candidateSet.origins.formalIdentityCatalog);
    identities.resultBinding = discoveryBinding;
    identities.selectedCandidates = parents.map((p: Json, i: number) => ({...p, resultOrdinal: i + 1}));
    const identityBinding = await save('identities', identities);
    const candidateSet = constructSelectionCandidateSetV001(source.plan.request, discovery, identities,
      {discoveryResult: discoveryBinding, formalIdentityCatalog: identityBinding});
    const input = {schemaVersion: 'candidate-internal-retention-input-v001' as const, taskDescription: INTERNAL_TASK,
      candidates: rows.map((r, i) => ({candidateId: r.candidateId, title: r.title,
        highlightReason: discovery.answer.candidates[i].reason,
        utterances: sets[i].map((u: Json) => ({utteranceId: u.utteranceId,
          atoms: u.sourceSegmentIds.map((id: number) => ({sourceSegmentId: id,
            text: source.transcript.segments.find((a: Json) => a.id === id).text}))}))}))};
    const result = {...source.retentionResult, answer: {status: 'complete', candidates: parents.map((p: Json) => ({
      candidateId: p.candidateId, meaningPreserved: '全量保持を使う固定検査', blocks: [{action: 'keep',
        startSourceSegmentId: p.sourceSegmentIds[0], endSourceSegmentId: p.sourceSegmentIds.at(-1),
        roles: ['reaction'], reason: '固定入力の全量保持'}]}))}};
    const request = {...source.retentionRequest, parentAdoptionBinding: identityBinding, input};
    const response = {...source.retentionResponse, requestFileSha256: sha(formal(request)), answer: result.answer,
      judgmentNote: '検査用の固定回答。実素材の新しい意味判断ではない。'};
    const retention = {...source.retention, parentAdoptionBinding: identityBinding, candidates: [], segments: [],
      judgment: {request: await save('request', request), response: await save('response', response), result: await save('result', result)}};
    // 保存データの製造には変更しない既存の候補単位validatorを使う。
    for (const [i, candidate] of input.candidates.entries()) {
      const one = resolveInternalRetentionV001(validateInternalRetentionIdsV001({...input, candidates: [candidate]},
        {...result, answer: {...result.answer, candidates: [result.answer.candidates[i]]}}), [parents[i]], []);
      retention.candidates.push(...one.candidates!);
      retention.segments.push(...one.segments!.map((s: Json) => ({...s, segmentId: `segment-000${i + 1}`})));
    }
    const plan = {...source.plan, request: {...source.plan.request, candidateSet: await save('candidate-set', candidateSet)},
      reuseInternalRetention: await save('retention', retention)};
    const planBinding = await save('context', plan);
    const actual = await loadDigestRetentionContextV1(planBinding.path);
    assert(actual.retention.segments[0].sourceStartMs > actual.retention.segments[1].sourceStartMs);
    const {adoption} = buildDigestAdoptionV1({...c, candidateSet: actual.candidateSet, sourceContext: actual},
      selectAllCandidatesV1(actual.candidateSet.candidates));
    assert.deepEqual(adoption.segments.map(s => [s.sourceStartMs, s.sourceEndMs]),
      [[parents[1].sourceInterval.sourceStartMs, parents[0].sourceInterval.sourceEndMs]]);
    assert.deepEqual(adoption.segments[0].candidateIds, ['test-candidate-a', 'test-candidate-b']);
    assert.equal(adoption.segments[0].retainedRanges.length, 2);
    assert(adoption.segments[0].retainedRanges.every(s => s.cutBoundaryEvidence && s.reason === '固定入力の全量保持'));
    assert.deepEqual(adoption.segments[0].sourceSegmentIds, us.flatMap((u: Json) => u.sourceSegmentIds));
    const ids = parents[0].sourceSegmentIds;
    for (const [mutate, error] of [
      [(v: Json) => {v.retentionResult.answer.candidates[0].blocks[0].startSourceSegmentId = ids[1];}, /GAP_OVERLAP_OR_ORDER/],
      [(v: Json) => {const b = v.retentionResult.answer.candidates[0].blocks; b.push({...b[0]});}, /GAP_OVERLAP_OR_ORDER/],
      [(v: Json) => {v.retentionResult.answer.candidates[0].blocks[0].startSourceSegmentId = 999999;}, /SOURCE_ID_OUTSIDE/],
      [(v: Json) => {const b = v.retentionResult.answer.candidates[0].blocks;
        b[0].endSourceSegmentId = ids[0]; b.push({...b[0], action: 'drop', startSourceSegmentId: ids[1],
          endSourceSegmentId: ids.at(-1), roles: ['dispensable']}); v.chunks = [];}, /CUT_UNRESOLVED/],
    ] as const) {
      const invalid = structuredClone(actual); mutate(invalid);
      invalid.retentionResponse.answer = structuredClone(invalid.retentionResult.answer);
      assert.throws(() => reconstructDigestRetentionV1(invalid), error);
    }
    assert.throws(() => reconstructDigestRetentionV1({...actual,
      retentionResponse: {...actual.retentionResponse, requestFileSha256: '0'.repeat(64)}}), /PROVENANCE_MISMATCH/);
  } finally {await rm(dir, {recursive: true, force: true});}
});

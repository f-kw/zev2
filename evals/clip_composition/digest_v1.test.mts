import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composeSelectedDigestRangesV1, projectSavedDigestCaptionsV1, selectAllCandidatesV1, type RetainedRangeV1,
} from './digest_v1.mts';
import {loadDigestJobV1, readSavedDigestCaptionsV1, buildDigestAdoptionV1} from './run_digest_v1.mts';
import {readBound, readJson, same, bind, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {assembleAdoptedCaptionCoreV001, projectAdoptedMediaRangesV001} from './adopted_media_manufacturing_v001.mts';

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

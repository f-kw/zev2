/** Historical shape conversion is confined to this equivalence fixture loader.
 * It is not a compatibility branch in the common operation, validator or renderer. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {ROOT, same, bind, publish, fileSha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  readRepairBoundBytesV001, loadCaptionRepairContextV001, describeCaptionRepairV001,
  createCaptionRepairSessionV001, observeCaptionRepairFrameV001, saveCaptionRepairObservationV001,
  validateCaptionLocalRepairV001, captionRepairApprovalDraftV001, adoptCaptionLocalRepairV001,
  reconstructCaptionLocalRepairV001, captionRepairEffectiveInputsV001, publishCaptionLocalRepairV001,
  renderCaptionLocalRepairV001,
} from './caption_local_repair_common_v001.mts';
import type {CaptionRepairSourceV001, CaptionLocalRepairOperationV001} from '../../packages/shared/src/caption-local-repair-v001.js';

export const REPAIR_WORK_V001 = 'evals/clip_composition/outputs/presentation/work-caption-local-repair-common-20260908-v001';
export const HISTORICAL_FIXTURE_BINDING_V001 = Object.freeze({path: 'evals/clip_composition/fixtures/caption-local-repair-v001.json',
  fileSha256: '2b8adfc5129ac0bfe495da2c0c19769886a0b02f0848cc604b5e6e9434ebf7cf'});
const read = async (ref: any) => JSON.parse((await readRepairBoundBytesV001(ref)).toString('utf8'));

export async function loadHistoricalCaptionRepairFixtureV001(id: 'digest' | 'distant') {
  const bundle = await read(HISTORICAL_FIXTURE_BINDING_V001);
  assert.equal(bundle.purpose, 'fixture-replay'); assert.equal(bundle.newHumanJudgment, false);
  const fixture = bundle.cases.find((row: Json) => row.id === id); assert(fixture, 'UNKNOWN_HISTORICAL_FIXTURE');
  const parent = await read(fixture.parent), human = await read(fixture.human), config = await read(fixture.config);
  const refs = id === 'digest' ? parent.caption.artifacts : parent.artifacts;
  const old: Json = {}; for (const [key, ref] of Object.entries(refs)) old[key] = await read(ref);
  const base = old.rendererJob.cropAppliedBaseMedia;
  const generation = await read(base.generationManifest), timeline = await read(base.timeline);
  const allowedTargets: CaptionRepairSourceV001['allowedTargets'] = id === 'digest'
    ? config.targets.map((target: Json) => ({instructionId: target.captionId,
      operations: [target.side === 'start' ? 'change-start' : 'change-end'],
      reviewWindow: {startFrame: target.windowStartFrame, endFrameExclusive: target.windowEndFrameExclusive}}))
    : config.targets.map((target: Json) => ({instructionId: target.instructionId,
      operations: target.optionalStart ? ['change-end'] : ['change-start', 'change-end'],
      reviewWindow: {startFrame: config.windowStartFrame, endFrameExclusive: config.windowEndFrameExclusive}}));
  let diagnosis: Json | null = null;
  const evidence = [HISTORICAL_FIXTURE_BINDING_V001, fixture.parent, fixture.human, fixture.config];
  if (id === 'digest') {
    diagnosis = await read(fixture.diagnosis); evidence.push(fixture.diagnosis);
    assert.equal(diagnosis!.cases[0].humanReview.memo, 'え?いるんでしょ?は発話がない');
    assert.equal(diagnosis!.cases[0].text, old.instruction.instructions[0].content.text);
    allowedTargets.unshift({instructionId: old.instruction.instructions[0].instructionId, operations: ['exclude-caption'],
      reviewWindow: {startFrame: timeline.segments[0].outputStartFrame, endFrameExclusive: timeline.segments[0].outputEndFrame}});
  }
  const source: CaptionRepairSourceV001 = {schemaVersion: 'caption-local-repair-source-v001', sourceId: `historical-caption-repair-${id}`,
    completedMedia: parent.renderer.video, base, audioPacketSha256: generation.audio.encoded.packetPayloadSha256,
    artifacts: Object.fromEntries(['meaning', 'sourcePackage', 'selection', 'instruction', 'rendererJob', 'lineEndProjection', 'cueEndProjection'].map(key => [key, refs[key]])) as any,
    allowedTargets};
  const context = await loadCaptionRepairContextV001(source);
  const session = await createCaptionRepairSessionV001(context, 'fixture-replay', evidence);
  const targets = describeCaptionRepairV001(context).targets;
  const records = [];
  if (id === 'digest') {
    assert.equal(human.userConfirmation, '指定した');
    records.push(saveCaptionRepairObservationV001(session, {kind: 'exclude-caption', target: targets[0],
      confirmedText: targets[0].text, reason: diagnosis!.cases[0].humanReview.memo}));
    for (const original of human.observations) {
      assert.equal(original.status, 'eligible-for-local-promotion');
      const t = targets.find(row => row.instructionId === original.targetBinding.captionId)!; assert(t);
      assert.deepEqual(t.textIds, original.targetBinding.atomOccurrenceIds); assert.equal(t.text, original.targetBinding.text);
      assert.equal(t.completedMediaSha256, original.targetBinding.completedMediaBinding.fileSha256);
      assert.equal(t.baseMediaSha256, original.targetBinding.baseMediaBinding.fileSha256);
      assert.equal(t.audioPacketSha256, original.targetBinding.audioPacketPayloadSha256);
      assert.deepEqual(t.currentFrames, original.targetBinding.currentCaptionFrames);
      const selected = original.selectedBoundary; assert.equal(original.request.frame, selected.outputVideoFrame);
      const observation = observeCaptionRepairFrameV001(session, t.instructionId, selected.outputVideoFrame);
      assert.equal(observation.outputAudioSample, selected.outputAudioSample);
      assert.equal(observation.sourceAudioSample, selected.sourceAudioSample);
      const op: any = {kind: 'change-boundaries', target: t, start: {mode: 'keep-current'}, end: {mode: 'keep-current'}};
      assert(['start', 'end'].includes(selected.side)); op[selected.side] = {mode: 'observed', observation};
      records.push(saveCaptionRepairObservationV001(session, op));
    }
  } else {
    assert.equal(human.userConfirmation, '3字幕を指定した');
    for (const entry of human.observations) {
      assert(same(await read(entry.sourceFile), entry.observation), 'HISTORICAL_OBSERVATION_REPLACED');
      const original = entry.observation;
      assert.equal(original.recordPurpose, 'human-boundary-observation');
      assert.equal(original.status, 'human-observation-saved-not-promoted');
      const t = targets.find(row => row.instructionId === original.targetBinding.instructionId)!; assert(t);
      assert.deepEqual(t.textIds, original.targetBinding.textIds); assert.equal(t.text, original.targetBinding.text);
      assert.equal(t.completedMediaSha256, original.completedMediaBinding.fileSha256);
      assert.equal(t.baseMediaSha256, original.baseMediaBinding.fileSha256);
      assert.equal(t.audioPacketSha256, original.audioPacketPayloadSha256);
      assert.deepEqual(t.currentFrames, original.targetBinding.currentFrames);
      const op: any = {kind: 'change-boundaries', target: t, start: {mode: 'keep-current'}, end: {mode: 'keep-current'}};
      for (const side of ['start', 'end']) {
        if (side === 'start' && original.startMode === 'keep-current') {assert.equal(original.start, null); continue;}
        const saved = original[side], request = original.request[side];
        assert.equal(saved.outputVideoFrame, request.frame); assert.equal(saved.observedPresentedFrame, request.presentedFrame);
        const observation = observeCaptionRepairFrameV001(session, t.instructionId, saved.observedPresentedFrame, saved.kind);
        assert.equal(observation.selectedVideoFrame, saved.outputVideoFrame);
        assert.equal(observation.outputAudioSample, saved.outputAudioSample); assert.equal(observation.sourceAudioSample, saved.sourceAudioSample);
        op[side] = {mode: 'observed', observation};
      }
      records.push(saveCaptionRepairObservationV001(session, op));
    }
  }
  const validation = validateCaptionLocalRepairV001(session, records), approval = captionRepairApprovalDraftV001(validation);
  const adoption = adoptCaptionLocalRepairV001(validation, approval);
  const expected: Json = {}; for (const [key, ref] of Object.entries(fixture.expected)) expected[key] = await read(ref);
  return {id, fixture, source, context, session, records, validation, approval, adoption, expected};
}

export async function reconstructHistoricalCaptionRepairV001(id: 'digest' | 'distant', suffix = 'v001') {
  const b = await loadHistoricalCaptionRepairFixtureV001(id);
  const rebuilt = await reconstructCaptionLocalRepairV001(b.adoption, `${REPAIR_WORK_V001}/${id}-${suffix}`, `common-caption-repair-${id}-${suffix}`);
  const actualInputs = captionRepairEffectiveInputsV001(rebuilt.core), expectedInputs = captionRepairEffectiveInputsV001(b.expected);
  assert.deepEqual(actualInputs, expectedInputs, 'HISTORICAL_FINAL_CAPTION_INPUTS_DIFFER');
  return {...b, rebuilt, actualInputs, expectedInputs};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const render = process.argv.includes('--render');
  for (const id of ['digest', 'distant'] as const) {
    const b = await reconstructHistoricalCaptionRepairV001(id);
    await publishCaptionLocalRepairV001(b.rebuilt);
    const renderer = render ? await renderCaptionLocalRepairV001(b.rebuilt) : null;
    const videoShaMatch = renderer ? renderer.video.fileSha256 === b.fixture.expectedVideo.fileSha256 : null;
    await publish(`${b.rebuilt.config.plan.outputRoot}/equivalence-verification.json`, {
      schemaVersion: 'caption-local-repair-equivalence-v001', status: 'passed', purpose: 'fixture-replay', newHumanJudgment: false,
      historicalFixture: HISTORICAL_FIXTURE_BINDING_V001, expectedInputs: b.fixture.expected,
      actualInputs: bind(`${b.rebuilt.config.plan.outputRoot}/instruction.json`, b.rebuilt.core.instruction),
      effectiveCaptionInputs: 'exact-text-textIds-frames-cue-end-and-line-end-textIds', scope: b.rebuilt.scope,
      provenance: 'new artifact IDs, source hashes, approval and fixture purpose are preserved separately; full artifact bytes are not called identical',
      renderer, expectedVideo: b.fixture.expectedVideo, completedVideoSha256Matches: videoShaMatch});
    console.log(JSON.stringify({id, captions: b.actualInputs.instructions.length, scope: b.rebuilt.scope,
      actualFormalCaptionPayload: 'exact', renderer: renderer?.qc ?? 'not-requested', videoShaMatch}));
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {canonicalSha256} from './clock.mjs';
import {createDigestStructureAutoPlanV001, createDigestStructureOverridesV001,
  resolveDigestStructureV001, editDigestStructureOverrideV001, resetDigestStructureOverrideV001,
  exportDigestStructureStateV001} from './digest-structure-policy.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {getPresentationPulseProgramV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {buildDigestStructureCaptionPlansV001, digestStructureConnectionsV001,
  createDigestStructureDrawingViewV001, assertDigestStructureDrawingViewV001,
  createDigestStructureRenderScopeV001, shiftDigestStructureCaptionV001} from './digest-structure-view.mjs';

const root = new URL('../../', import.meta.url), clone = structuredClone;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const ref = (path, bytes) => ({path, fileSha256: sha(bytes)});
const byteRef = (path, bytes) => ({...ref(path, bytes), bytes: Buffer.byteLength(bytes)});
let materialPromise;
async function material(t) {
  materialPromise ??= (async () => {
    const directory = 'runtime/artifacts/digest-new-material-20260926-v001/';
    const [proofBytes, transcriptBytes, priorEditPlanBytes] = await Promise.all([
      readFile(new URL('runtime/artifacts/caption-readability-full-20260929-v001/candidate-drawing-evidence.json', root), 'utf8'),
      readFile(new URL(directory + 'transcript.json', root), 'utf8'),
      readFile(new URL(directory + 'edit-plan.json', root), 'utf8'),
    ]);
    const proof = JSON.parse(proofBytes), sourceView = restoreOrchestrationDrawingViewEvidenceV001(proof);
    const transcript = JSON.parse(transcriptBytes), prior = JSON.parse(priorEditPlanBytes);
    const rows = new Map(transcript.segments.map(row => [row.id, row]));
    const context = ids => ({sourceSegmentIds: ids, excerpt: ids.map(id => rows.get(id).text).join('')});
    const extra = (segmentId, role, first, last) => {
      const ids = transcript.segments.filter(row => row.id >= first && row.id <= last).map(row => row.id);
      return {segmentId, candidateId: null, role, sourceStartMs: rows.get(first).startMs,
        sourceEndMs: rows.get(last).endMs, sourceSegmentIds: ids,
        reason: '時計と字幕保存の試験用に固定した既存発話。人間品質採用ではない。', evidence: context(ids)};
    };
    const sourceBytes = (await stat(new URL(prior.sourceVideoBinding.path, root))).size;
    const input = {sourceRef: {...prior.sourceVideoBinding, bytes: sourceBytes},
      transcriptRef: byteRef(new URL(directory + 'transcript.json', root).pathname, transcriptBytes), transcriptBytes,
      priorEditPlanRef: byteRef(new URL(directory + 'edit-plan.json', root).pathname, priorEditPlanBytes), priorEditPlanBytes,
      theme: '既存ゲーム区間を保持した構成の時計検証',
      segments: [extra('fixture-intro', 'intro', 68, 99), ...prior.segments.map((row, index) => ({...row,
        role: index < 3 ? 'main' : index === 3 ? 'exclude-goods' : 'exclude-superchat',
        reason: '既存候補の内部を保持する有限構成fixture。', evidence: context(row.sourceSegmentIds)})),
      extra('fixture-closure', 'closure', 43937, 43984)],
      sourceClock: {fps: 60, decodedFrameCount: 722162, logicalFrameCount: 361081, presentationOffsetMs: 0},
      audioClock: {sampleRate: 44100, channels: 2, sourceGridMappingEndSample: 530791424}};
    const autoPlan = createDigestStructureAutoPlanV001(input);
    const overrides = createDigestStructureOverridesV001({autoPlan});
    return {sourceView, proof, autoPlan, overrides, oldTimeline: JSON.parse(proof.originalEvidence.source.timelineBytes)};
  })();
  try {return await materialPromise;} catch (error) {
    if (error.code === 'ENOENT') {t.skip('saved local 7A candidate/input fixture unavailable'); return null;}
    throw error;
  }
}

function inputFor(material, overrides = material.overrides) {
  const {sourceView, autoPlan, oldTimeline} = material;
  const structureResolution = resolveDigestStructureV001({autoPlan, overrides});
  const mediaSha = sha('test-only-new-base-media-binding');
  const timeline = {...clone(oldTimeline),
    baseMedia: {...clone(oldTimeline.baseMedia), fileSha256: mediaSha, expectedFrameCount: structureResolution.frameCount},
    segments: structureResolution.baseMappings.map(({audioSamples, ...row}) => row)};
  // These two new-caption rows test the structure adapter only. They do not
  // claim width/readability validation of the newly selected source passage.
  const newElements = structureResolution.selectedSegments.flatMap((row, index) => {
    if (!['intro', 'closure'].includes(row.role)) return [];
    const span = timeline.segments[index], template = clone(sourceView.projectedNormalPlan.elements[0]);
    const text = row.role === 'intro' ? '今日は' : 'ありがとうございました。';
    return [{...template, instructionId: 'fixture-' + row.role + '-caption', text,
      indexedLines: [{lineIndex: 0, renderedText: text, text, codePointIndices: Array.from(text, (_, i) => i)}],
      sourceStartMs: row.sourceStartMs, sourceEndMs: row.sourceEndMs,
      targetProvenance: {targetRefId: 'fixture-' + row.role, sourceAtomIds: row.sourceSegmentIds.map(id => 'source-' + id)},
      startFrame: span.outputStartFrame, endFrameExclusive: span.outputEndFrame,
      displayFrameCount: span.outputEndFrame - span.outputStartFrame, timelineSegmentId: span.segmentId}];
  });
  const normalPlan = {...clone(sourceView.projectedNormalPlan), elements: newElements};
  const newCaptions = {normalPlan, resolvedPlan: clone(normalPlan)};
  const buildInput = {sourceView, timeline, newCaptions, structureResolution};
  const sourcePlans = buildDigestStructureCaptionPlansV001(buildInput);
  const planBytes = serialize(sourcePlans.normalPlan), timelineBytes = serialize(timeline);
  return {...buildInput, sourcePlans,
    projectionInput: {digestRef: {version: 'digest-structure-test-v001', sha256: canonicalSha256(structureResolution)},
      planRef: ref('/test/7b-normal-plan.json', planBytes), timelineRef: ref('/test/7b-timeline.json', timelineBytes),
      mediaRef: {path: '/test/7b-base.mp4', fileSha256: mediaSha}, planBytes, timelineBytes,
      playbackSampleRate: 44100, observationSampleRate: 16000,
      connections: digestStructureConnectionsV001(buildInput)},
    structureStateSha256: exportDigestStructureStateV001({autoPlan, overrides}).stateSha256,
    sourceReferences: {sourceViewSha256: sourceView.viewSha256}};
}

test('retained real 7A children keep IDs, text, lines, source atoms and effects while timeline IDs and integer clocks move once', async t => {
  const m = await material(t); if (!m) return;
  const before = canonicalSha256(m.sourceView), input = inputFor(m);
  const view = createDigestStructureDrawingViewV001(input);
  assert.equal(view.resolvedPlan.elements.length, 252); // 68 + 98 + 84 retained children plus the two clock fixtures.
  assert.equal(view.preserved.length, 250);
  assert.deepEqual(input.structureResolution.selectedSegments.map(row => row.segmentId),
    ['fixture-intro', 'segment-0001', 'segment-0002', 'segment-0003', 'fixture-closure']);
  for (const preserved of view.preserved) {
    const old = m.sourceView.resolvedPlan.elements.find(row => row.instructionId === preserved.captionId);
    const oldNormal = m.sourceView.projectedNormalPlan.elements.find(row => row.instructionId === preserved.captionId);
    const newSpan = view.projection.retainedSpans.find(row => row.segmentId === preserved.segmentId);
    const oldSpan = m.sourceView.projection.retainedSpans.find(row => row.segmentId === preserved.originalSegmentId);
    const totalShift = newSpan.displayStartFrame - oldSpan.displayStartFrame;
    for (const [plan, original] of [[view.resolvedPlan, old], [view.projectedNormalPlan, oldNormal]]) {
      const actual = plan.elements.find(row => row.instructionId === original.instructionId);
      const expected = {...shiftDigestStructureCaptionV001(original, totalShift), timelineSegmentId: preserved.segmentId};
      assert.deepEqual(actual, expected);
    }
    assert.equal(preserved.originalCanonicalSha256, canonicalSha256(old));
    const base = input.timeline.segments.find(row => row.segmentId === preserved.segmentId);
    assert.equal(preserved.shiftFrames, base.outputStartFrame - oldSpan.displayStartFrame);
  }
  assert.deepEqual(view.effectiveSelections.map(row => row.captionId), view.resolvedPlan.elements.map(row => row.instructionId));
  const oldSelections = new Map(m.sourceView.effectiveSelections.map(row => [row.captionId, row]));
  for (const row of view.effectiveSelections.filter(row => oldSelections.has(row.captionId)))
    assert.deepEqual(row, oldSelections.get(row.captionId));
  assert.equal(canonicalSha256(m.sourceView), before);
  assert.equal(view.humanQuality, 'not-evaluated'); assert.equal(view.productionDefaultChanged, false);
  assert(Object.isFrozen(view.resolvedPlan.elements[0]));
});

test('same adjacent main pairs retain Soft/Black while intro and closure use normal cuts; projection is applied once', async t => {
  const m = await material(t); if (!m) return;
  const input = inputFor(m), view = createDigestStructureDrawingViewV001(input);
  assert.deepEqual(input.projectionInput.connections.map(row => row.preset), ['normal-cut', 'soft-separator', 'black-separator', 'normal-cut']);
  assert.equal(view.projection.displayFrameCount, input.structureResolution.frameCount + 24);
  assert.deepEqual(view.projection.retainedSpans.map(row => row.shiftFrames), [0, 0, 12, 24, 24]);
  assert.equal(view.projection.insertedSpans.length, 2);
  for (const timing of view.captionTimings) {
    const element = view.resolvedPlan.elements.find(row => row.instructionId === timing.source.captionId);
    assert.deepEqual([element.startFrame, element.endFrameExclusive], [timing.startFrame, timing.endFrameExclusive]);
  }
});

test('one exclusion override restores its exact children and Reset reconstructs the same complete saved structure view', async t => {
  const m = await material(t); if (!m) return;
  const original = createDigestStructureDrawingViewV001(inputFor(m));
  const overrides = editDigestStructureOverrideV001({...m, segmentId: 'segment-0004', include: true});
  const restored = createDigestStructureDrawingViewV001(inputFor(m, overrides));
  assert.equal(restored.preserved.length, 394); assert.equal(restored.resolvedPlan.elements.length, 396);
  const oldGoods = m.sourceView.resolvedPlan.elements.filter(row => row.timelineSegmentId === 'segment-0004');
  assert.deepEqual(restored.preserved.filter(row => row.originalSegmentId === 'segment-0004').map(row => row.captionId), oldGoods.map(row => row.instructionId));
  const reset = resetDigestStructureOverrideV001({...m, overrides, segmentId: 'segment-0004'});
  assert.deepEqual(createDigestStructureDrawingViewV001(inputFor(m, reset)), original);
});

test('missing, reordered, changed-text or changed-effect retained children cannot replace the bound saved source plans', async t => {
  const m = await material(t); if (!m) return;
  for (const mutate of [
    plans => plans.resolvedPlan.elements.splice(1, 1),
    plans => {[plans.resolvedPlan.elements[1], plans.resolvedPlan.elements[2]] = [plans.resolvedPlan.elements[2], plans.resolvedPlan.elements[1]];},
    plans => {plans.resolvedPlan.elements[1].text += '改変';},
    plans => {plans.resolvedPlan.elements[1].visualState.textStyle.fontSizePx = 96;},
    plans => {plans.normalPlan.elements[1].endFrameExclusive++;},
    plans => {plans.preserved.pop();},
  ]) {
    const input = inputFor(m); mutate(input.sourcePlans);
    assert.throws(() => createDigestStructureDrawingViewV001(input), error => error.code === 'ERR_ASSERTION');
  }
});

test('unbranded or edited copies of the 7A source and copies of the derived structure view are rejected', async t => {
  const m = await material(t); if (!m) return;
  const input = inputFor(m), fake = clone(m.sourceView);
  assert.throws(() => buildDigestStructureCaptionPlansV001({...input, sourceView: fake}), /must be derived/);
  fake.resolvedPlan.elements[0].text += '変更';
  assert.throws(() => createDigestStructureDrawingViewV001({...input, sourceView: fake}), /must be derived/);
  const view = createDigestStructureDrawingViewV001(input);
  assert.equal(assertDigestStructureDrawingViewV001(view), true);
  assert.throws(() => assertDigestStructureDrawingViewV001(clone(view)), /must be rederived/);
  const proof = clone(m.proof); proof.originalEvidence.source.planBytes += ' ';
  const {evidenceSha256, ...body} = proof; proof.evidenceSha256 = canonicalSha256(body);
  assert.throws(() => restoreOrchestrationDrawingViewEvidenceV001(proof));
});

test('extra, missing, mismatched, duplicate or out-of-range new captions are not silently discarded', async t => {
  const m = await material(t); if (!m) return;
  for (const mutate of [
    value => value.resolvedPlan.elements.push({...clone(value.resolvedPlan.elements[0]), instructionId: 'unselected', timelineSegmentId: 'unselected'}),
    value => value.normalPlan.elements.pop(),
    value => {value.resolvedPlan.elements[0].text += '差';},
    value => {for (const plan of [value.normalPlan, value.resolvedPlan]) plan.elements[1].instructionId = plan.elements[0].instructionId;},
    value => {for (const plan of [value.normalPlan, value.resolvedPlan]) plan.elements[0].endFrameExclusive++;},
  ]) {
    const input = inputFor(m); mutate(input.newCaptions);
    assert.throws(() => buildDigestStructureCaptionPlansV001(input));
  }
});

test('timeline, caption bytes and connection substitutions cannot change the intended projection', async t => {
  const m = await material(t); if (!m) return;
  for (const mutate of [
    input => {input.timeline.segments[1].outputStartFrame++;},
    input => {input.projectionInput.planBytes = serialize(m.sourceView.projectedNormalPlan);},
    input => {input.projectionInput.timelineBytes = serialize(m.oldTimeline);},
    input => {input.projectionInput.connections[1].preset = 'normal-cut';},
    input => {input.projectionInput.planRef.fileSha256 = '0'.repeat(64);},
    input => {input.projectionInput.mediaRef.fileSha256 = '0'.repeat(64);},
  ]) {const input = inputFor(m); mutate(input); assert.throws(() => createDigestStructureDrawingViewV001(input));}
});

test('a bounded render keeps global caption/state clocks and uses exact frame/sample range coordinates', async t => {
  const m = await material(t); if (!m) return;
  const view = createDigestStructureDrawingViewV001(inputFor(m));
  const full = createDigestStructureRenderScopeV001(view);
  assert.equal(full.renderRange, null); assert.equal(full.scope.frameCount, view.projection.displayFrameCount);
  const span = view.projection.retainedSpans[2], range = {startFrame: span.displayStartFrame + 10, endFrameExclusive: span.displayStartFrame + 110};
  const result = createDigestStructureRenderScopeV001(view, range);
  assert.equal(result.scope.frameCount, 100);
  assert.equal(result.scope.playbackStartSample, range.startFrame * 1470);
  assert.equal(result.scope.playbackEndSampleExclusive, range.endFrameExclusive * 1470);
  assert.deepEqual(result.resolvedPlan.elements, view.resolvedPlan.elements.filter(row => row.startFrame < range.endFrameExclusive && row.endFrameExclusive > range.startFrame));
  for (const bad of [{startFrame: -1, endFrameExclusive: 10}, {startFrame: 10, endFrameExclusive: 10},
    {startFrame: 0, endFrameExclusive: view.projection.displayFrameCount + 1}, {...range, fps: 30}])
    assert.throws(() => createDigestStructureRenderScopeV001(view, bad));
});

test('Pulse peak, all finite states and motion phrase-end anchors shift by the same integer without changing the source decision', () => {
  const caption = {instructionId: 'pulse-fixture', kind: 'speech-caption', text: '確認', indexedLines: [],
    startFrame: 100, endFrameExclusive: 160, displayFrameCount: 60,
    visualState: {textStyle: {fontSizePx: 144}, position: {preset: 'bottom-center'}},
    presentationPulse: {presentation: 'provisional-pulse', presetVersion: 'presentation-pulse-readability-v001', anchorPeakId: 'saved-peak', anchorFrame: 125}};
  const snapshot = clone(caption), canvas = {width: 1920, height: 1080, fps: 30};
  const oldProgram = getPresentationPulseProgramV001({element: caption, canvas});
  const shifted = shiftDigestStructureCaptionV001(caption, 243);
  const program = getPresentationPulseProgramV001({element: shifted, canvas});
  assert.equal(shifted.presentationPulse.anchorFrame, 368);
  assert.deepEqual(program.segments, oldProgram.segments.map(row => ({...row, startFrame: row.startFrame + 243, endFrameExclusive: row.endFrameExclusive + 243})));
  assert.deepEqual(program.samples, oldProgram.samples.map(row => ({...row, frame: row.frame + 243})));
  assert.deepEqual(shiftDigestStructureCaptionV001(shifted, -243), caption);
  assert.deepEqual(caption, snapshot);
  const motion = {...caption, presentationMotion: {speechEndFrame: 152}}; delete motion.presentationPulse;
  assert.equal(shiftDigestStructureCaptionV001(motion, 243).presentationMotion.speechEndFrame, 395);
  assert.throws(() => shiftDigestStructureCaptionV001(caption, 0.5));
  assert.throws(() => shiftDigestStructureCaptionV001(caption, -101));
});

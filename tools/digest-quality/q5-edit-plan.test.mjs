import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createQ5EditSourceV001, resolveQ5EditPlanV001, restoreQ5EditPlanV001,
  projectQ5ComparisonRangeV001, mapQ5OriginalPointV001} from './q5-edit-plan.mjs';

const copy = structuredClone;
const hash = value => createHash('sha256').update(value).digest('hex');
const ref = (name, bytes) => ({path: '/fixture/q5/' + name, fileSha256: hash(bytes), bytes: Buffer.byteLength(bytes)});
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
function fixture() {
  const mediaRef = {path: '/fixture/q5/base-media.mp4', fileSha256: 'd'.repeat(64)};
  const segments = Array.from({length: 12}, (_, index) => ({segmentId: 'segment-' + String(index + 1).padStart(4, '0'),
    sourceStartMs: 100000 + index * 200000, sourceEndMs: 100000 + index * 200000 + 3333,
    sourceStartFrame30: 3000 + index * 6000, sourceEndFrame30: 3100 + index * 6000,
    outputStartFrame: index * 100, outputEndFrame: (index + 1) * 100}));
  const basisEditPlan = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit-plan',
    artifactId: 'fixture-q5-original-edit-plan', sourceVideoBinding: {path: '/fixture/q5/original.mp4', fileSha256: 'e'.repeat(64)},
    segments: segments.map(({segmentId, sourceStartMs, sourceEndMs}) => ({segmentId, sourceStartMs, sourceEndMs})),
    unresolvedEdits: []};
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30}, layoutRules: {preservedFixtureRule: 'no invented layout values'},
    elements: segments.flatMap((segment, index) => [10, 30, 50, 70].map((offset, ordinal) => ({
      instructionId: 'fixture-caption-' + index + '-' + ordinal, kind: 'speech-caption', text: '保持する本文' + index + '-' + ordinal,
      indexedLines: [{lineIndex: 0, text: '保持する本文' + index + '-' + ordinal, codePointIndices: [0, 1, 2],
        sourceUnitIds: ['fixture-atom-' + index + '-' + ordinal]}], startFrame: segment.outputStartFrame + offset,
      endFrameExclusive: segment.outputStartFrame + offset + 10, displayFrameCount: 10,
      sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
      visualState: {stateId: 'caption-core-v001', textStyle: {fontSizePx: 94, fontAssetId: 'fixture-font'},
        position: {preset: 'bottom-center', offsetYPercent: -6}, background: null},
      transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
      targetProvenance: {sourceAtomIds: ['fixture-atom-' + index + '-' + ordinal]}, materialRefs: []}))) };
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'fixture-original-timeline',
    sourceRef: 'fixture-original-source', sourceFrameClock: {logicalFrameRate: '30/1', inputFrameRate: '60/1'},
    baseMedia: {artifactId: 'fixture-original-media', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256,
      frameRate: '30/1', expectedFrameCount: 1200}, segments};
  const planBytes = JSON.stringify(plan), timelineBytes = JSON.stringify(timeline), basisEditPlanBytes = JSON.stringify(basisEditPlan);
  const input = {originalContentVersion: 'fixture-q5-original-v001', fixture: true, mediaRef,
    planBytes, timelineBytes, basisEditPlanBytes, planRef: ref('normal-plan.json', planBytes),
    timelineRef: ref('timeline.json', timelineBytes), basisEditPlanRef: ref('edit-plan.json', basisEditPlanBytes)};
  const source = createQ5EditSourceV001(input);
  const policyRef = ref('policy.md', 'fixture: permit one unadopted internal omission');
  const resolve = (omission = range(130, 160)) => resolveQ5EditPlanV001({source, omission, candidateId: 'fixture-q5-candidate-001', policyRef});
  return {source, input, policyRef, plan, timeline, basisEditPlan, resolve};
}
const omitTime = ({startFrame, endFrameExclusive, ...rest}) => rest;
const sourcePoint = (source, frame) => ({clock: 'q5-original-c-all-frame-v001', sourceIdentitySha256: source.sourceIdentitySha256, frame});

test('one internal omission resolves 13 pieces, source parentage, all captions and a shorter whole-content clock', () => {
  const {source, plan, resolve} = fixture(); const result = resolve();
  assert.equal(result.schemaVersion, 'q5-content-edit-plan-v001');
  assert.equal(result.status, 'unadopted-proposal');
  assert.equal(result.frameCount, 1170); assert.equal(result.removedFrameCount, 30);
  assert.equal(result.retainedPieces.length, 13); assert.equal(result.captionMappings.length, 48);
  assert.deepEqual(result.omittedCaptionIds, ['fixture-caption-1-1', 'fixture-caption-1-2']);
  const children = result.retainedPieces.filter(piece => piece.parentSegmentId === 'segment-0002');
  assert.deepEqual(children.map(piece => piece.originalRange), [range(100, 130), range(160, 200)]);
  assert.deepEqual(children.map(piece => piece.outputRange), [range(100, 130), range(130, 170)]);
  assert.deepEqual(children.map(piece => piece.originalSourceRange), [range(9000, 9030), range(9060, 9100)]);
  assert.deepEqual(children.map(piece => [piece.parentOrdinal, piece.childOrdinal, piece.parentChildCount]), [[2, 1, 2], [2, 2, 2]]);
  assert.deepEqual(result.omittedOriginalSourceRange, range(9030, 9060));
  assert.equal(result.connections.filter(row => row.newlyCreatedByOmission).length, 1);
  assert(result.connections.every(row => row.transition === 'normal-cut'));
  for (const element of result.normalPlan.elements) {
    const original = plan.elements.find(row => row.instructionId === element.instructionId);
    assert.deepEqual(omitTime(element), omitTime(original));
    assert.equal(element.startFrame, original.startFrame - (original.startFrame >= 160 ? 30 : 0));
    assert.equal(element.endFrameExclusive, original.endFrameExclusive - (original.startFrame >= 160 ? 30 : 0));
  }
  assert.deepEqual(source.normalPlan, plan); assert.equal(source.timeline.baseMedia.expectedFrameCount, 1200);
  assert.equal(result.normalPlan.elements.length, 46);
});

test('the 48kHz playback clock and exact 16kHz observation boundaries remain distinct', () => {
  const {resolve} = fixture(); const result = resolve(range(130, 161));
  assert.equal(result.playback.sampleCount, 1169 * 1600); assert.equal(result.playback.removedSampleCount, 31 * 1600);
  assert.equal(result.observation.sampleRate, 16000);
  assert.deepEqual(result.observation.removedDurationSamples, {numerator: '49600', denominator: '3'});
  const after = result.retainedPieces.find(piece => piece.parentSegmentId === 'segment-0002' && piece.childOrdinal === 2);
  assert.equal(after.playback.originalRange.startSample, 161 * 1600);
  assert.deepEqual(after.observation.originalRange.startSample, {numerator: '257600', denominator: '3'});
  assert.deepEqual(after.observation.outputRange.startSample, {numerator: '208000', denominator: '3'});
});

test('all omitted captions have no output and all retained captions keep their complete payload', () => {
  const {resolve, source} = fixture(); const result = resolve();
  for (const row of result.captionMappings) {
    assert.equal(row.contentVersion, result.contentVersion);
    assert.equal(row.originalContentVersion, source.sourceIdentity.originalContentVersion);
    if (row.status === 'omitted') {assert.equal(row.outputRange, null); assert.equal(row.retainedPieceId, null);}
    else assert.equal(row.outputRange.endFrameExclusive - row.outputRange.startFrame, row.displayFrameCount);
  }
  assert.throws(() => {result.normalPlan.elements[0].visualState.textStyle.fontSizePx = 1;}, TypeError);
  assert.throws(() => {source.normalPlan.elements[0].text = 'changed';}, TypeError);
});

test('point mapping uses half-open omission and rejects repeated projection', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  const mapped = frame => mapQ5OriginalPointV001({source, resolved, point: sourcePoint(source, frame)});
  assert.equal(mapped(129).frame, 129);
  assert.equal(mapped(130).frame, null); assert.equal(mapped(159).frame, null);
  assert.equal(mapped(160).frame, 130); assert.equal(mapped(1200).frame, 1170);
  assert.equal(mapped(130).status, 'omitted-no-output');
  assert.throws(() => mapQ5OriginalPointV001({source, resolved, point: mapped(160)}), /original point fields differ/);
  assert.throws(() => mapQ5OriginalPointV001({source, resolved, point: {...sourcePoint(source, 170), clock: 'q5-edited-content-frame-v001'}}), /double projection rejected/);
  assert.throws(() => mapQ5OriginalPointV001({source, resolved, point: {...sourcePoint(source, 170), sourceIdentitySha256: '0'.repeat(64)}}), /clock or source differs/);
});

test('a caption ending at omission start or starting at omission end remains intact', () => {
  const {source, resolve} = fixture(); const result = resolve(range(120, 170));
  const before = result.captionMappings.find(row => row.captionId === 'fixture-caption-1-0');
  const after = result.captionMappings.find(row => row.captionId === 'fixture-caption-1-3');
  assert.deepEqual(before.outputRange, range(110, 120));
  assert.deepEqual(after.outputRange, range(120, 130));
  assert.deepEqual(result.normalPlan.elements.find(row => row.instructionId === after.captionId).transition,
    source.normalPlan.elements.find(row => row.instructionId === after.captionId).transition);
});

test('invalid omission ranges, multiple omissions and range boundary contact are rejected', () => {
  const {resolve} = fixture();
  for (const invalid of [range(130, 130), range(160, 130), range(-1, 130), range(130, 1201),
    range(130.5, 160), [range(130, 160)], {startFrame: 130, endFrameExclusive: 160, anotherRange: range(170, 180)}]) {
    assert.throws(() => resolve(invalid), /Q5_EDIT_PLAN_INVALID/);
  }
  for (const invalid of [range(100, 130), range(180, 200), range(180, 230), range(0, 1200)]) {
    assert.throws(() => resolve(invalid), /strictly inside one/);
  }
});

test('partial subtitle cutting is rejected at either omission boundary', () => {
  const {resolve} = fixture();
  assert.throws(() => resolve(range(131, 160)), /caption crosses an omission boundary/);
  assert.throws(() => resolve(range(130, 159)), /caption crosses an omission boundary/);
  assert.throws(() => resolve(range(131, 139)), /caption crosses an omission boundary/);
});

test('an explicit null restores original captions, all retained content and both clocks exactly', () => {
  const {source, resolve} = fixture(); const cancelled = resolve(null);
  assert.equal(cancelled.status, 'original-content-restored');
  assert.equal(cancelled.clock, 'q5-original-c-all-frame-v001');
  assert.equal(cancelled.contentVersion, source.sourceIdentity.originalContentVersion);
  assert.deepEqual(cancelled.normalPlan, source.normalPlan);
  assert.equal(cancelled.frameCount, 1200); assert.equal(cancelled.playback.sampleCount, 1920000);
  assert.equal(cancelled.retainedPieces.length, 12); assert.equal(cancelled.removedFrameCount, 0);
  assert.deepEqual(cancelled.omittedCaptionIds, []); assert.equal(cancelled.omittedOriginalSourceRange, null);
  for (const [index, piece] of cancelled.retainedPieces.entries()) {
    const original = source.timeline.segments[index];
    assert.deepEqual(piece.originalRange, range(original.outputStartFrame, original.outputEndFrame));
    assert.deepEqual(piece.outputRange, piece.originalRange);
    assert.deepEqual(piece.playback.outputRange, piece.playback.originalRange);
    assert.deepEqual(piece.observation.outputRange, piece.observation.originalRange);
  }
  for (const frame of [129, 130, 159, 160, 1200]) {
    const restoredPoint = mapQ5OriginalPointV001({source, resolved: cancelled, point: sourcePoint(source, frame)});
    assert.equal(restoredPoint.frame, frame); assert.equal(restoredPoint.clock, 'q5-original-c-all-frame-v001');
  }
  assert(cancelled.connections.every(row => !row.newlyCreatedByOmission));
});

test('save/reload reconstructs from original bytes and refuses changed plan, range, version or source', () => {
  const {source, resolve, input} = fixture(); const resolved = resolve();
  const reloadedSource = createQ5EditSourceV001(copy(input));
  assert.deepEqual(restoreQ5EditPlanV001({source: reloadedSource, saved: JSON.parse(JSON.stringify(resolved))}), resolved);
  const changes = [saved => {saved.normalPlan.elements[0].text = 'changed';},
    saved => {saved.normalPlan.elements.at(-1).startFrame -= 30;}, saved => {saved.omission.endFrameExclusive += 1;},
    saved => {saved.contentVersion = source.sourceIdentity.originalContentVersion;}, saved => {saved.candidateId = 'another-candidate';},
    saved => {saved.policyRef.fileSha256 = '0'.repeat(64);}, saved => {saved.retainedPieces[1].parentSegmentId = 'segment-0001';},
    saved => {saved.playback.sampleRate = 16000;}, saved => {saved.unexpected = true;}];
  for (const change of changes) {const altered = copy(resolved); change(altered); assert.throws(() => restoreQ5EditPlanV001({source, saved: altered}), /Q5_EDIT_PLAN_INVALID/);}
  const other = createQ5EditSourceV001({...input, originalContentVersion: 'fixture-other-original'});
  assert.throws(() => restoreQ5EditPlanV001({source: other, saved: resolved}), /different original source/);
});

test('derived and serialized objects cannot be passed as an original input context', () => {
  const {source, resolve, policyRef} = fixture(); const resolved = resolve();
  for (const invalid of [resolved, resolved.normalPlan, copy(source)]) {
    assert.throws(() => resolveQ5EditPlanV001({source: invalid, omission: range(130, 160), candidateId: 'fixture-again', policyRef}), /only a byte-bound original source context/);
  }
  assert.throws(() => resolveQ5EditPlanV001({source, candidateId: 'fixture-again', policyRef}), /explicit half-open range or null/);
});

test('content identity deterministically binds source, omission, policy and candidate', () => {
  const {source, policyRef, resolve} = fixture(); const first = resolve();
  assert.deepEqual(resolve(), first);
  assert.notEqual(resolve(range(130, 161)).contentVersion, first.contentVersion);
  assert.notEqual(resolveQ5EditPlanV001({source, omission: range(130, 160), candidateId: 'fixture-another', policyRef}).contentVersion, first.contentVersion);
  assert.notEqual(resolveQ5EditPlanV001({source, omission: range(130, 160), candidateId: 'fixture-q5-candidate-001',
    policyRef: {...policyRef, fileSha256: 'c'.repeat(64)}}).contentVersion, first.contentVersion);
});

test('short comparison retains the same entry/exit context and ordered source pieces without restarting captions', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  const result = projectQ5ComparisonRangeV001({source, resolved, beforeRange: range(110, 180)});
  assert.deepEqual(result.beforeRange, range(110, 180)); assert.deepEqual(result.afterGlobalRange, range(110, 150));
  assert.deepEqual(result.afterRange, range(0, 40)); assert.equal(result.frameCount, 40);
  assert.deepEqual(result.pieces.map(piece => piece.originalRange), [range(110, 130), range(160, 180)]);
  assert.deepEqual(result.pieces.map(piece => piece.outputRange), [range(0, 20), range(20, 40)]);
  assert.deepEqual(result.pieces.map(piece => piece.editedGlobalRange), [range(110, 130), range(130, 150)]);
  assert.deepEqual(result.normalPlan.elements.map(row => [row.instructionId, row.startFrame, row.endFrameExclusive]),
    [['fixture-caption-1-0', 0, 10], ['fixture-caption-1-3', 30, 40]]);
  assert.equal(result.noCaptionPhaseRestart, true); assert.equal(result.sourceIdentity.mediaRef.fileSha256, source.sourceIdentity.mediaRef.fileSha256);
  assert.equal(result.editPlanSha256, resolved.resolutionSha256);
  for (const caption of result.normalPlan.elements) assert.deepEqual(omitTime(caption),
    omitTime(source.normalPlan.elements.find(row => row.instructionId === caption.instructionId)));
  assert.deepEqual(projectQ5ComparisonRangeV001({source, resolved: JSON.parse(JSON.stringify(resolved)), beforeRange: range(110, 180)}), result);
});

test('short comparison refuses mid-caption endpoints, another scene, missing context and cancelled content', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  for (const beforeRange of [range(111, 180), range(110, 179)]) {
    assert.throws(() => projectQ5ComparisonRangeV001({source, resolved, beforeRange}), /short range endpoint cuts a caption/);
  }
  for (const beforeRange of [range(130, 180), range(110, 160), range(210, 280)]) {
    assert.throws(() => projectQ5ComparisonRangeV001({source, resolved, beforeRange}), /include context on both sides/);
  }
  assert.throws(() => projectQ5ComparisonRangeV001({source, resolved, beforeRange: range(10, 180)}), /same original retained interval/);
  assert.throws(() => projectQ5ComparisonRangeV001({source, resolved: resolve(null), beforeRange: range(110, 180)}), /active omission/);
});

test('byte-bound source verification rejects changed source bytes, mismatched media and false production identity', () => {
  const {input, plan, timeline, basisEditPlan} = fixture();
  assert.throws(() => createQ5EditSourceV001({...input, planBytes: input.planBytes + ' '}), /bytes differ from reference/);
  assert.throws(() => createQ5EditSourceV001({...input, mediaRef: {...input.mediaRef, fileSha256: 'c'.repeat(64)}}), /frame clock or media binding differs/);
  assert.throws(() => createQ5EditSourceV001({...input, planRef: {...input.planRef, bytes: input.planRef.bytes + 1}}), /byte count differs/);
  assert.throws(() => createQ5EditSourceV001({...input, fixture: false}), /C-all original byte identity differs/);
  assert.throws(() => createQ5EditSourceV001({...input, originalContentVersion: 'not-a-fixture'}), /explicit fixture content version/);
  const wrongBasis = copy(basisEditPlan); wrongBasis.segments[1].sourceStartMs += 1;
  const bytes = JSON.stringify(wrongBasis);
  assert.throws(() => createQ5EditSourceV001({...input, basisEditPlanBytes: bytes, basisEditPlanRef: ref('wrong-edit-plan.json', bytes)}), /edit-plan interval and timeline differ/);
  const wrongTimeline = copy(timeline); wrongTimeline.segments[1].outputStartFrame += 1;
  const timelineBytes = JSON.stringify(wrongTimeline);
  assert.throws(() => createQ5EditSourceV001({...input, timelineBytes, timelineRef: ref('wrong-timeline.json', timelineBytes)}), /frame order or duration differs/);
  const wrongPlan = copy(plan); wrongPlan.elements[0].presentationPulse = {};
  const planBytes = JSON.stringify(wrongPlan);
  assert.throws(() => createQ5EditSourceV001({...input, planBytes, planRef: ref('wrong-plan.json', planBytes)}), /Normal appearance differs/);
});

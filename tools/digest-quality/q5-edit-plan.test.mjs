import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as editing from './q5-edit-plan.mjs';
const {createQ5EditSourceV001, resolveQ5EditPlanV002, restoreQ5EditPlanV002,
  projectQ5ComparisonRangeV002, mapQ5OriginalPointV002} = editing;

const TARGET = 'digest-v1-phase2-20260913-v001-bridge-caption-000121';
const TARGET_TEXT = 'このドスンと落ちていくんですこれ';
const copy = structuredClone;
const hash = value => createHash('sha256').update(value).digest('hex');
const ref = (name, bytes) => ({path: '/fixture/q5/' + name, fileSha256: hash(bytes), bytes: Buffer.byteLength(bytes)});
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const omitTime = ({startFrame, endFrameExclusive, ...rest}) => rest;
const sourcePoint = (source, frame) => ({clock: 'q5-original-c-all-frame-v001', sourceIdentitySha256: source.sourceIdentitySha256, frame});
function fixture({mutatePlan = () => {}, captionCount = 48} = {}) {
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
  // A synthetic timeline explicitly binds the one already selected caption, not an arbitrary hide target.
  Object.assign(plan.elements[5], {instructionId: TARGET, text: TARGET_TEXT, endFrameExclusive: 160, displayFrameCount: 30,
    indexedLines: [{lineIndex: 0, text: TARGET_TEXT}]});
  Object.assign(plan.elements[6], {startFrame: 160, endFrameExclusive: 170});
  for (let index = plan.elements.length; index < captionCount; index++) {
    plan.elements.push({...copy(plan.elements[0]), instructionId: 'fixture-extra-' + index,
      startFrame: 0, endFrameExclusive: 1, displayFrameCount: 1});
  }
  mutatePlan(plan);
  plan.elements.sort((a, b) => a.startFrame - b.startFrame);
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'fixture-original-timeline',
    sourceRef: 'fixture-original-source', sourceFrameClock: {logicalFrameRate: '30/1', inputFrameRate: '60/1'},
    baseMedia: {artifactId: 'fixture-original-media', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256,
      frameRate: '30/1', expectedFrameCount: 1200}, segments};
  const planBytes = JSON.stringify(plan), timelineBytes = JSON.stringify(timeline), basisEditPlanBytes = JSON.stringify(basisEditPlan);
  const input = {originalContentVersion: 'fixture-q5-original-v001', fixture: true, mediaRef,
    planBytes, timelineBytes, basisEditPlanBytes, planRef: ref('normal-plan.json', planBytes),
    timelineRef: ref('timeline.json', timelineBytes), basisEditPlanRef: ref('edit-plan.json', basisEditPlanBytes)};
  const source = createQ5EditSourceV001(input);
  const policyRef = ref('policy-v002.md', 'fixture: keep six frames at each edge; hide only selected caption');
  const boundaryEvidenceRef = ref('boundary-evidence.json', '{"synthetic":true,"meaning":"not an acoustic safety proof"}');
  const options = {source, candidateId: 'fixture-q5-candidate-001', policyRef, boundaryEvidenceRef};
  const resolve = (mediaOmission = range(136, 154), hiddenCaptionId = mediaOmission === null ? null : TARGET) =>
    resolveQ5EditPlanV002({...options, mediaOmission, hiddenCaptionId});
  return {source, input, policyRef, boundaryEvidenceRef, options, plan, timeline, basisEditPlan, resolve};
}

test('one inward media omission hides only selected caption and preserves all other payloads and a 13-piece clock', () => {
  const {source, plan, resolve} = fixture(); const result = resolve();
  assert.equal(result.schemaVersion, 'q5-content-edit-plan-v002');
  assert.equal(result.status, 'unadopted-proposal');
  assert.equal(result.frameCount, 1182); assert.equal(result.removedFrameCount, 18);
  assert.equal(result.retainedPieces.length, 13); assert.equal(result.captionMappings.length, 48);
  assert.deepEqual(result.hiddenCaptionIds, [TARGET]); assert.equal(result.hiddenCaptionId, TARGET);
  assert.equal(result.normalPlan.elements.length, 47); assert(!Object.hasOwn(result, 'omittedCaptionIds'));
  const children = result.retainedPieces.filter(piece => piece.parentSegmentId === 'segment-0002');
  assert.deepEqual(children.map(piece => piece.originalRange), [range(100, 136), range(154, 200)]);
  assert.deepEqual(children.map(piece => piece.outputRange), [range(100, 136), range(136, 182)]);
  assert.deepEqual(children.map(piece => piece.originalSourceRange), [range(9000, 9036), range(9054, 9100)]);
  assert.deepEqual(result.omittedOriginalSourceRange, range(9036, 9054));
  assert.equal(result.connections.filter(row => row.newlyCreatedByOmission).length, 1);
  assert(result.connections.every(row => row.transition === 'normal-cut'));
  for (const element of result.normalPlan.elements) {
    const original = plan.elements.find(row => row.instructionId === element.instructionId);
    assert.deepEqual(omitTime(element), omitTime(original));
    assert.equal(element.startFrame, original.startFrame - (original.startFrame >= 154 ? 18 : 0));
    assert.equal(element.endFrameExclusive, original.endFrameExclusive - (original.startFrame >= 154 ? 18 : 0));
  }
  assert.deepEqual(source.normalPlan, plan); assert.equal(source.timeline.baseMedia.expectedFrameCount, 1200);
});

test('hidden subtitle provenance records both retained media edges instead of claiming full media deletion', () => {
  const {resolve} = fixture(); const result = resolve(); const media = result.targetMediaRetention;
  assert.deepEqual(result.mediaOmission, range(136, 154));
  assert.deepEqual(media.originalRange, range(130, 160));
  assert.deepEqual(media.retainedBeforeRange, range(130, 136));
  assert.deepEqual(media.retainedAfterRange, range(154, 160));
  assert.equal(media.retainedFramesBefore, 6); assert.equal(media.retainedFramesAfter, 6);
  assert.equal(media.status, 'partially-retained');
  assert.deepEqual(media.retainedPieces.map(piece => piece.originalRange), [range(130, 136), range(154, 160)]);
  assert.deepEqual(media.retainedPieces.map(piece => piece.outputRange), [range(130, 136), range(136, 142)]);
  assert.deepEqual(media.retainedPieces.map(piece => piece.originalSourceRange), [range(9030, 9036), range(9054, 9060)]);
  const hidden = result.captionMappings.find(row => row.captionId === TARGET);
  assert.equal(hidden.status, 'hidden'); assert.equal(hidden.outputRange, null); assert.equal(hidden.retainedPieceId, null);
  assert.equal(hidden.mediaStatus, 'partially-retained'); assert.deepEqual(hidden.targetMediaRetention, media);
  assert.equal(hidden.displayFrameCount, 30);
  assert(result.captionMappings.filter(row => row.captionId !== TARGET).every(row => row.status === 'retained'));
  assert.equal(result.retentionPolicy.minimumRetainedFramesBefore, 6);
  assert.equal(result.retentionPolicy.minimumRetainedFramesAfter, 6);
  assert.throws(() => {result.normalPlan.elements[0].text = 'changed';}, TypeError);
});

test('playback uses 48kHz stereo and 1600 samples per frame independently from exact 16kHz observations', () => {
  const result = fixture().resolve(range(137, 154));
  assert.equal(result.playback.sampleCount, 1183 * 1600); assert.equal(result.playback.removedSampleCount, 17 * 1600);
  assert.equal(result.observation.sampleRate, 16000);
  assert.deepEqual(result.observation.removedDurationSamples, {numerator: '27200', denominator: '3'});
  const after = result.retainedPieces.find(piece => piece.parentSegmentId === 'segment-0002' && piece.childOrdinal === 2);
  assert.equal(after.playback.originalRange.startSample, 154 * 1600);
  assert.deepEqual(after.observation.originalRange.startSample, {numerator: '246400', denominator: '3'});
  assert.deepEqual(after.observation.outputRange.startSample, {numerator: '219200', denominator: '3'});
  assert.equal(result.targetMediaRetention.retainedPieces[1].playback.outputRange.startSample, 137 * 1600);
});

test('point mapping shifts by the actual media omission once and preserves the two retained caption-media edges', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  const mapped = frame => mapQ5OriginalPointV002({source, resolved, point: sourcePoint(source, frame)});
  assert.equal(mapped(130).frame, 130); assert.equal(mapped(135).frame, 135);
  assert.equal(mapped(136).frame, null); assert.equal(mapped(153).frame, null);
  assert.equal(mapped(154).frame, 136); assert.equal(mapped(159).frame, 141); assert.equal(mapped(1200).frame, 1182);
  assert.equal(mapped(136).status, 'omitted-no-output');
  assert.throws(() => mapQ5OriginalPointV002({source, resolved, point: mapped(154)}), /original point fields differ/);
  assert.throws(() => mapQ5OriginalPointV002({source, resolved, point: {...sourcePoint(source, 170), clock: 'q5-edited-content-frame-v002'}}), /double projection rejected/);
});

test('the user-selected six-frame minimum permits inward adjustment and rejects either margin being reduced', () => {
  const {resolve} = fixture();
  assert.equal(resolve(range(137, 153)).removedFrameCount, 16);
  for (const invalid of [range(130, 160), range(135, 154), range(136, 155), range(129, 150), range(140, 161)]) {
    assert.throws(() => resolve(invalid), /inside the selected caption and retain at least six/);
  }
});

test('invalid and multiple media omissions are rejected instead of being rounded or silently replaced', () => {
  const {resolve} = fixture();
  for (const invalid of [range(140, 140), range(154, 136), range(-1, 154), range(136, 1201),
    range(136.5, 154), [range(136, 154)], {startFrame: 136, endFrameExclusive: 154, anotherRange: range(150, 154)}]) {
    assert.throws(() => resolve(invalid), /Q5_EDIT_PLAN_INVALID/);
  }
});

test('no other caption may be hidden and neither partial nor complete non-target overlap is permitted', () => {
  const f = fixture();
  for (const wrong of ['fixture-caption-1-0', 'fixture-caption-1-2', 'missing', [TARGET]]) {
    assert.throws(() => f.resolve(range(136, 154), wrong), /only the selected Q5-1 caption 121/);
  }
  const wrongText = fixture({mutatePlan: plan => {plan.elements[5].text = 'another target';}});
  assert.throws(() => wrongText.resolve(), /only the selected Q5-1 caption 121/);
  for (const [startFrame, endFrameExclusive] of [[132, 138], [145, 157], [140, 145]]) {
    const overlapping = fixture({mutatePlan: plan => {
      Object.assign(plan.elements[6], {startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame});
    }});
    assert.throws(() => overlapping.resolve(), /intersects a non-target caption/);
  }
});

test('non-target captions touching either media boundary are retained at their complete duration', () => {
  const f = fixture({mutatePlan: plan => {
    Object.assign(plan.elements[4], {startFrame: 126, endFrameExclusive: 136, displayFrameCount: 10});
    Object.assign(plan.elements[6], {startFrame: 154, endFrameExclusive: 164, displayFrameCount: 10});
  }});
  const result = f.resolve();
  assert.deepEqual(result.captionMappings.find(row => row.captionId === 'fixture-caption-1-0').outputRange, range(126, 136));
  assert.deepEqual(result.captionMappings.find(row => row.captionId === 'fixture-caption-1-2').outputRange, range(136, 146));
});

test('cancellation releases media omission and caption hiding together and restores all 325 synthetic captions and clocks', () => {
  const {source, resolve} = fixture({captionCount: 325});
  const edited = resolve(); assert.equal(edited.normalPlan.elements.length, 324);
  const cancelled = resolve(null);
  assert.equal(cancelled.status, 'original-content-restored');
  assert.equal(cancelled.clock, 'q5-original-c-all-frame-v001');
  assert.equal(cancelled.contentVersion, source.sourceIdentity.originalContentVersion);
  assert.equal(cancelled.mediaOmission, null); assert.equal(cancelled.hiddenCaptionId, null);
  assert.deepEqual(cancelled.hiddenCaptionIds, []); assert.equal(cancelled.targetMediaRetention, null);
  assert.deepEqual(cancelled.normalPlan, source.normalPlan); assert.equal(cancelled.normalPlan.elements.length, 325);
  assert.equal(cancelled.frameCount, 1200); assert.equal(cancelled.playback.sampleCount, 1920000);
  assert.equal(cancelled.retainedPieces.length, 12); assert.equal(cancelled.removedFrameCount, 0);
  for (const piece of cancelled.retainedPieces) {
    assert.deepEqual(piece.outputRange, piece.originalRange);
    assert.deepEqual(piece.playback.outputRange, piece.playback.originalRange);
    assert.deepEqual(piece.observation.outputRange, piece.observation.originalRange);
  }
  for (const frame of [130, 136, 153, 154, 1200]) {
    assert.equal(mapQ5OriginalPointV002({source, resolved: cancelled, point: sourcePoint(source, frame)}).frame, frame);
  }
  assert.throws(() => resolve(null, TARGET), /release media omission and caption hiding together/);
  assert.throws(() => resolve(range(136, 154), null), /release media omission and caption hiding together/);
  assert.deepEqual(restoreQ5EditPlanV002({source, saved: JSON.parse(JSON.stringify(cancelled))}), cancelled);
});

test('saved new content reconstructs exactly and rejects changes to protected captions, media, hiding, retention or evidence', () => {
  const {source, resolve, input} = fixture(); const resolved = resolve();
  assert.deepEqual(restoreQ5EditPlanV002({source: createQ5EditSourceV001(copy(input)), saved: JSON.parse(JSON.stringify(resolved))}), resolved);
  const changes = [saved => {saved.normalPlan.elements[0].text = 'changed';},
    saved => {saved.normalPlan.elements[0].indexedLines = [];}, saved => {saved.normalPlan.elements[0].displayFrameCount++;},
    saved => {saved.normalPlan.elements[0].visualState.textStyle.fontSizePx = 95;},
    saved => {saved.normalPlan.elements[0].transition.entry.frames++;},
    saved => {saved.normalPlan.elements.at(-1).startFrame -= 18;}, saved => {saved.mediaOmission.endFrameExclusive--;},
    saved => {saved.contentVersion = source.sourceIdentity.originalContentVersion;}, saved => {saved.hiddenCaptionId = null;},
    saved => {saved.hiddenCaptionIds = [];}, saved => {saved.targetMediaRetention.retainedFramesBefore++;},
    saved => {saved.retentionPolicy.minimumRetainedFramesBefore = 0;},
    saved => {saved.policyRef.fileSha256 = '0'.repeat(64);}, saved => {saved.boundaryEvidenceRef.fileSha256 = '0'.repeat(64);},
    saved => {saved.captionMappings.find(row => row.captionId === TARGET).mediaStatus = 'omitted';},
    saved => {saved.retainedPieces[1].parentSegmentId = 'segment-0001';},
    saved => {saved.playback.sampleRate = 16000;}, saved => {saved.unexpected = true;}];
  for (const change of changes) {
    const altered = copy(resolved); change(altered);
    assert.throws(() => restoreQ5EditPlanV002({source, saved: altered}), /Q5_EDIT_PLAN_INVALID/);
  }
  const other = createQ5EditSourceV001({...input, originalContentVersion: 'fixture-other-original'});
  assert.throws(() => restoreQ5EditPlanV002({source: other, saved: resolved}), /different original source/);
});

test('old edit schemas and old exports are rejected rather than silently converted', () => {
  const {source, resolve} = fixture(); const old = {...copy(resolve()), schemaVersion: 'q5-content-edit-plan-v001'};
  assert.throws(() => restoreQ5EditPlanV002({source, saved: old}), /old plans are not converted/);
  for (const key of ['resolveQ5EditPlanV001', 'restoreQ5EditPlanV001', 'projectQ5ComparisonRangeV001', 'mapQ5OriginalPointV001']) {
    assert.equal(Object.hasOwn(editing, key), false);
  }
});

test('derived objects cannot masquerade as original input and both edit fields must be explicit', () => {
  const {source, resolve, options} = fixture(); const resolved = resolve();
  for (const invalid of [resolved, resolved.normalPlan, copy(source)]) {
    assert.throws(() => resolveQ5EditPlanV002({...options, source: invalid, mediaOmission: range(136, 154), hiddenCaptionId: TARGET}), /only a byte-bound original source/);
  }
  assert.throws(() => resolveQ5EditPlanV002({...options, hiddenCaptionId: TARGET}), /both be explicit/);
  assert.throws(() => resolveQ5EditPlanV002({...options, mediaOmission: range(136, 154)}), /both be explicit/);
});

test('new content identity binds the actual cut, policy and boundary evidence deterministically', () => {
  const {options, resolve} = fixture(); const first = resolve();
  assert.deepEqual(resolve(), first);
  assert.notEqual(resolve(range(137, 154)).contentVersion, first.contentVersion);
  for (const key of ['policyRef', 'boundaryEvidenceRef']) {
    assert.notEqual(resolveQ5EditPlanV002({...options, mediaOmission: range(136, 154), hiddenCaptionId: TARGET,
      [key]: {...options[key], fileSha256: 'c'.repeat(64)}}).contentVersion, first.contentVersion);
  }
  assert.throws(() => resolveQ5EditPlanV002({...options, mediaOmission: range(136, 154), hiddenCaptionId: TARGET,
    boundaryEvidenceRef: {path: 'relative', fileSha256: 'a'.repeat(64)}}), /absolute byte reference/);
});

test('short comparison keeps both target-media fragments, hides the caption and maps all retained captions once without phase restart', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  const result = projectQ5ComparisonRangeV002({source, resolved, beforeRange: range(110, 180)});
  assert.equal(result.schemaVersion, 'q5-content-comparison-range-v002');
  assert.deepEqual(result.beforeRange, range(110, 180)); assert.deepEqual(result.afterGlobalRange, range(110, 162));
  assert.deepEqual(result.afterRange, range(0, 52)); assert.equal(result.frameCount, 52);
  assert.deepEqual(result.pieces.map(piece => piece.originalRange), [range(110, 136), range(154, 180)]);
  assert.deepEqual(result.pieces.map(piece => piece.outputRange), [range(0, 26), range(26, 52)]);
  assert.deepEqual(result.pieces.map(piece => piece.editedGlobalRange), [range(110, 136), range(136, 162)]);
  assert.deepEqual(result.normalPlan.elements.map(row => [row.instructionId, row.startFrame, row.endFrameExclusive]),
    [['fixture-caption-1-0', 0, 10], ['fixture-caption-1-2', 32, 42], ['fixture-caption-1-3', 42, 52]]);
  assert.equal(result.noCaptionPhaseRestart, true);
  assert.equal(result.editPlanSha256, resolved.resolutionSha256);
  assert.deepEqual(result.boundaryEvidenceRef, resolved.boundaryEvidenceRef);
  assert.deepEqual(result.hiddenCaptionIds, [TARGET]);
  assert.equal(result.hiddenCaptionMappings[0].outputRange, null);
  assert.deepEqual(result.targetMediaRetention.retainedPieces.map(piece => piece.outputRange), [range(20, 26), range(26, 32)]);
  assert.deepEqual(result.targetMediaRetention.retainedPieces.map(piece => piece.editedGlobalRange), [range(130, 136), range(136, 142)]);
  assert.equal(result.targetMediaRetention.retainedPieces[1].playback.outputRange.startSample, 26 * 1600);
  for (const caption of result.normalPlan.elements) {
    assert.deepEqual(omitTime(caption), omitTime(source.normalPlan.elements.find(row => row.instructionId === caption.instructionId)));
  }
  assert.deepEqual(projectQ5ComparisonRangeV002({source, resolved: JSON.parse(JSON.stringify(resolved)), beforeRange: range(110, 180)}), result);
});

test('comparison endpoints cannot cut any original caption, leave the original scene or describe a cancelled edit', () => {
  const {source, resolve} = fixture(); const resolved = resolve();
  for (const beforeRange of [range(111, 180), range(110, 179), range(131, 180), range(110, 159)]) {
    assert.throws(() => projectQ5ComparisonRangeV002({source, resolved, beforeRange}), /short range endpoint cuts a caption/);
  }
  for (const beforeRange of [range(136, 180), range(110, 154), range(210, 280)]) {
    assert.throws(() => projectQ5ComparisonRangeV002({source, resolved, beforeRange}), /include context on both sides/);
  }
  assert.throws(() => projectQ5ComparisonRangeV002({source, resolved, beforeRange: range(10, 180)}), /same original retained interval/);
  assert.throws(() => projectQ5ComparisonRangeV002({source, resolved: resolve(null), beforeRange: range(110, 180)}), /active omission/);
});

test('original byte binding still rejects altered source captions or a fixture claiming the real C-all identity', () => {
  const {input} = fixture();
  assert.throws(() => createQ5EditSourceV001({...input, planBytes: input.planBytes + ' '}), /bytes differ from reference/);
  assert.throws(() => createQ5EditSourceV001({...input, mediaRef: {...input.mediaRef, fileSha256: 'c'.repeat(64)}}), /frame clock or media binding differs/);
  assert.throws(() => createQ5EditSourceV001({...input, fixture: false}), /C-all original byte identity differs/);
});

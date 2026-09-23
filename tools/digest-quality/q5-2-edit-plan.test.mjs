import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {resolve as resolvePath} from 'node:path';
import {createQ52EditSourceV001, resolveQ52EditPlanV001, restoreQ52EditPlanV001,
  projectQ52ComparisonRangeV001} from './q5-2-edit-plan.mjs';
import {indexExplicitLinesV001, PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const copy = structuredClone;
const hash = value => createHash('sha256').update(value).digest('hex');
const reference = (name, bytes = name) => ({path: '/fixture/q52/' + name,
  fileSha256: hash(bytes), bytes: Buffer.byteLength(bytes)});
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const payload = ({startFrame, endFrameExclusive, ...rest}) => rest;

function fixture({mutateTimeline = () => {}, mutateEvidence = () => {}, mutateBoundary = () => {}} = {}) {
  const mediaRef = reference('base-media.mp4'), sourceVideoRef = reference('original.mp4');
  const segments = Array.from({length: 12}, (_, index) => ({segmentId: 'segment-' + String(index + 1).padStart(4, '0'),
    sourceStartMs: 100000 + index * 200000, sourceEndMs: 100000 + index * 200000 + 3333,
    sourceStartFrame30: 3000 + index * 6000, sourceEndFrame30: 3100 + index * 6000,
    outputStartFrame: index * 100, outputEndFrame: (index + 1) * 100}));
  mutateTimeline(segments);
  const basisEditPlan = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit-plan',
    artifactId: 'fixture-q52-original-edit-plan', sourceVideoBinding: sourceVideoRef,
    segments: segments.map(({segmentId, sourceStartMs, sourceEndMs}) => ({segmentId, sourceStartMs, sourceEndMs})),
    unresolvedEdits: []};
  const normalPlan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30},
    layoutRules: {characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001},
    elements: segments.flatMap((segment, index) => [0, 20, 40, 80].map((offset, ordinal) => {
      const text = '元の字幕' + index + '-' + ordinal;
      return {instructionId: 'fixture-caption-' + index + '-' + ordinal, kind: 'speech-caption', text,
        indexedLines: indexExplicitLinesV001([text]).indexedLines,
        startFrame: segment.outputStartFrame + offset, endFrameExclusive: segment.outputStartFrame + offset + 20,
        displayFrameCount: 20, sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
        requestedProfileId: 'normal-landscape-readable-pop-v001', appliedProfileId: 'normal-landscape-readable-pop-v001',
        visualState: {stateId: 'caption-core-v001', textStyle: {fontSizePx: 94, fontAssetId: 'fixture-font'},
          layout: {maxCharsPerLine: 36, maxLines: 2, singleLine: false}, position: {preset: 'bottom-center'}, background: null},
        transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
        targetProvenance: {sourceAtomIds: ['fixture-original-' + index + '-' + ordinal]}, materialRefs: []};
    }))};
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'fixture-q52-original-timeline',
    sourceRef: 'fixture-original-source', sourceFrameClock: {logicalFrameRate: '30/1', inputFrameRate: '60/1'},
    baseMedia: {artifactId: 'fixture-base', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256,
      frameRate: '30/1', expectedFrameCount: 1200}, segments};
  const policyRef = reference('instruction.md');
  const addition = {targetSegmentId: 'segment-0008', sourceVideoRange: range(44955, 45000), subtitleMode: 'source-text-captions'};
  const sourceAtoms = ['前', 'の', '文'].map((text, index) => ({id: 101 + index,
    startMs: 1498500 + index * 500, endMs: 1499000 + index * 500, text, speaker: 'fixture-speaker'}));
  const addedCaptions = sourceAtoms.map((atom, index) => ({captionId: 'q5-2-added-caption-' + String(index + 1).padStart(6, '0'),
    text: atom.text, sourceVideoRange: range(44955 + index * 15, 44970 + index * 15), sourceSegmentIds: [atom.id],
    acousticWordIndices: [index], sourceUtteranceId: 'fixture-utterance', acousticChunkIndex: 253,
    sourceStartMs: atom.startMs, sourceEndMs: atom.endMs}));
  const evidence = {schemaVersion: 'q5-2-context-addition-judgment-v001', candidateId: 'fixture-Q5-2-C001',
    targetSegmentId: 'segment-0008', policyRef, sourceVideoRef, sourceTranscriptRef: reference('transcript.json'),
    sourceUtterancesRef: reference('utterances.json'), sourceWordTimestampsRef: reference('word-timestamps.json'),
    sourceAcousticObservationRef: reference('acoustic-observation.json'), sourceAcousticPreflightRef: reference('acoustic-preflight.json'),
    addition, comparisonBeforeRange: range(700, 760),
    sourceUtterance: {utteranceId: 'fixture-utterance', text: '前の文', sourceSegmentIds: [101, 102, 103]}, sourceAtoms,
    acousticChunk: {index: 253, startMs: 1498000, endMs: 1528000},
    acousticWords: sourceAtoms.map((atom, index) => ({word: atom.text, start: 0.5 + index * 0.5, end: 1 + index * 0.5})),
    addedCaptionEvidence: addedCaptions};
  mutateEvidence(evidence);
  const sourceEvidenceBytes = JSON.stringify(evidence), sourceEvidenceRef = reference('judgment.json', sourceEvidenceBytes);
  const boundary = {schemaVersion: 'q5-2-context-addition-boundary-v001', candidateId: evidence.candidateId,
    policyRef, sourceEvidenceRef, sourceVideoRef, targetSegmentId: 'segment-0008', originalTargetSourceRange: range(45000, 45100),
    actualSourceAddition: addition.sourceVideoRange, comparisonBeforeRange: range(700, 760), addedFrameCount: 45,
    subtitleMode: 'source-text-captions', addedCaptions: copy(addedCaptions),
    selectedSourceSpeechBoundary: {utteranceId: 'fixture-utterance', firstSegmentId: 101, rawObservedStartMs: 1498500,
      fixedTextObservedStartMs: 1498500, startMs: 1498500, rounding: 'nearest-at-30fps', startFrame: 44955}};
  mutateBoundary(boundary);
  const boundaryEvidenceBytes = JSON.stringify(boundary), boundaryEvidenceRef = reference('boundary.json', boundaryEvidenceBytes);
  const planBytes = JSON.stringify(normalPlan), timelineBytes = JSON.stringify(timeline), basisEditPlanBytes = JSON.stringify(basisEditPlan);
  const input = {originalContentVersion: 'fixture-q52-original-v001', fixture: true, mediaRef, sourceVideoRef,
    planBytes, timelineBytes, basisEditPlanBytes, planRef: reference('normal-plan.json', planBytes),
    timelineRef: reference('timeline.json', timelineBytes), basisEditPlanRef: reference('basis-edit-plan.json', basisEditPlanBytes),
    sourceEvidenceRef, sourceEvidenceBytes, boundaryEvidenceRef, boundaryEvidenceBytes};
  const source = createQ52EditSourceV001(input);
  const options = {source, candidateId: evidence.candidateId, policyRef, sourceEvidenceRef, boundaryEvidenceRef,
    addition: copy(addition), addedCaptions: copy(addedCaptions)};
  return {source, input, options, normalPlan, timeline, evidence, boundary,
    resolve: () => resolveQ52EditPlanV001(options)};
}

test('one added source interval expands scene 8, keeps the previous endpoint and moves owned content exactly once', () => {
  const {source, normalPlan, resolve} = fixture(); const plan = resolve();
  assert.equal(plan.frameCount, 1245); assert.equal(plan.addedFrameCount, 45);
  assert.equal(plan.physicalPieces.length, 13); assert.equal(plan.retainedIntervals.length, 12);
  assert.deepEqual(plan.retainedIntervals[6].editedGlobalRange, range(600, 700));
  assert.deepEqual(plan.retainedIntervals[7].editedGlobalRange, range(700, 845));
  assert.deepEqual(plan.retainedIntervals[7].retainedOriginalEditedGlobalRange, range(745, 845));
  assert.deepEqual(plan.retainedIntervals[7].sourceVideoRange, range(44955, 45100));
  const oldLast = plan.normalPlan.elements.find(row => row.instructionId === 'fixture-caption-6-3');
  const targetFirst = plan.normalPlan.elements.find(row => row.instructionId === 'fixture-caption-7-0');
  assert.equal(oldLast.endFrameExclusive, 700); assert.equal(targetFirst.startFrame, 745);
  for (const original of normalPlan.elements) {
    const updated = plan.normalPlan.elements.find(row => row.instructionId === original.instructionId);
    assert.deepEqual(payload(updated), payload(original));
    assert.equal(updated.startFrame, original.startFrame + (original.startFrame >= 700 ? 45 : 0));
  }
  assert.deepEqual(source.normalPlan, normalPlan);
  assert.equal(plan.connections.filter(row => row.sourceContinuity === 'continuous-source').length, 1);
  assert(plan.connections.every(row => row.transition === 'normal-cut'));
});

test('source provenance has no invented old-Digest coordinate and the 48k stereo playback count stays separate', () => {
  const {resolve} = fixture(); const plan = resolve(), added = plan.physicalPieces[7], body = plan.physicalPieces[8];
  assert.equal(added.kind, 'added-source-video'); assert.equal(added.originalDigestRange, null);
  assert.deepEqual(added.sourceVideoRange, range(44955, 45000));
  assert.deepEqual(added.editedGlobalRange, range(700, 745));
  assert.equal(added.playback.originalDigestRange, null);
  assert.equal(added.playback.sourceVideoRange.endSampleExclusive - added.playback.sourceVideoRange.startSample, 45 * 1600);
  assert.equal(body.sourceVideoRange.startFrame, added.sourceVideoRange.endFrameExclusive);
  assert.equal(plan.playback.addedSampleCount, 72000); assert.equal(plan.playback.sampleCount, 1245 * 1600);
  assert.equal(plan.clocks.observationSampleRate, 16000);
});

test('three new captions use exact grounded text, fresh IDs and the existing Normal layout and appearance', () => {
  const {source, resolve} = fixture(); const plan = resolve();
  const added = plan.normalPlan.elements.filter(row => row.instructionId.startsWith('q5-2-added-caption-'));
  assert.deepEqual(added.map(row => [row.text, row.startFrame, row.endFrameExclusive]), [['前', 700, 715], ['の', 715, 730], ['文', 730, 745]]);
  const template = source.normalPlan.elements.find(row => row.instructionId === 'fixture-caption-7-0');
  for (const row of added) {
    assert.deepEqual(row.visualState, template.visualState); assert.deepEqual(row.transition, template.transition);
    assert.equal(row.indexedLines[0].text, row.text); assert.equal(row.indexedLines[0].logicalWidth, 2);
    assert.equal(row.displayFrameCount, 15); assert.equal(row.targetProvenance.sourceAtomIds.length, 1);
  }
  assert(plan.captionMappings.filter(row => row.status === 'added').every(row => row.originalDigestRange === null && row.sourceCaptionEvidence));
});

test('saved content reconstructs exactly; cancellation removes media and new captions and restores the original clock together', () => {
  const {source, options, normalPlan, resolve} = fixture(); const plan = resolve();
  assert.deepEqual(restoreQ52EditPlanV001({source, saved: JSON.parse(JSON.stringify(plan))}), plan);
  assert.deepEqual(resolve(), plan);
  const cancelled = resolveQ52EditPlanV001({...options, addition: null, addedCaptions: []});
  assert.equal(cancelled.contentVersion, source.sourceIdentity.originalContentVersion);
  assert.equal(cancelled.frameCount, 1200); assert.equal(cancelled.addedFrameCount, 0);
  assert.deepEqual(cancelled.normalPlan, normalPlan); assert.equal(cancelled.physicalPieces.length, 12);
  assert.deepEqual(cancelled.addedCaptions, []); assert.equal(cancelled.addition, null);
  assert.throws(() => resolveQ52EditPlanV001({...options, addition: null}), /cancelled together/);
  assert.throws(() => resolveQ52EditPlanV001({...options, addedCaptions: []}), /cancelled together/);
});

test('comparison prepends only the new source, preserves the common body and exit, and does not restart caption phases', () => {
  const {source, resolve} = fixture(); const plan = resolve();
  const result = projectQ52ComparisonRangeV001({source, resolved: plan, beforeRange: range(700, 760)});
  assert.deepEqual(result.beforeRange, range(700, 760)); assert.deepEqual(result.afterGlobalRange, range(700, 805));
  assert.deepEqual(result.afterRange, range(0, 105)); assert.equal(result.frameCount, 105);
  assert.deepEqual(result.commonBodyAfterLocalRange, range(45, 105));
  assert.deepEqual(result.physicalPieces.map(row => row.outputRange), [range(0, 45), range(45, 105)]);
  assert.deepEqual(result.physicalPieces.map(row => row.originalDigestRange), [null, range(700, 760)]);
  assert.deepEqual(result.physicalPieces.map(row => row.sourceVideoRange), [range(44955, 45000), range(45000, 45060)]);
  assert.deepEqual(result.normalPlan.elements.map(row => [row.startFrame, row.endFrameExclusive]),
    [[0, 15], [15, 30], [30, 45], [45, 65], [65, 85], [85, 105]]);
  assert.equal(result.noCaptionPhaseRestart, true); assert.equal(result.humanReviewStatus, 'pending');
  assert(result.captionMappings.slice(0, 3).every(row => row.comparisonPieceId === result.physicalPieces[0].pieceId));
  assert(result.captionMappings.slice(3).every(row => row.comparisonPieceId === result.physicalPieces[1].pieceId));
});

test('different source bytes, missing roots and unsupported caption text or timing are rejected before projection', () => {
  const {input, options} = fixture();
  assert.throws(() => createQ52EditSourceV001({...input, planBytes: input.planBytes + ' '}), /bytes differ/);
  assert.throws(() => createQ52EditSourceV001({...input, sourceEvidenceBytes: input.sourceEvidenceBytes + ' '}), /bytes differ/);
  assert.throws(() => createQ52EditSourceV001({...input, sourceVideoRef: {...input.sourceVideoRef, fileSha256: 'f'.repeat(64)}}), /source video differs/);
  for (const mutate of [row => row.text = 'invented', row => row.captionId = 'fixture-caption-7-0',
    row => row.sourceVideoRange.startFrame++, row => row.sourceStartMs++]) {
    const addedCaptions = copy(options.addedCaptions); mutate(addedCaptions[0]);
    assert.throws(() => resolveQ52EditPlanV001({...options, addedCaptions}), /grounded added captions/);
  }
  assert.throws(() => fixture({mutateEvidence: value => value.addedCaptionEvidence[0].text = 'fabricated'}), /text must exactly match/);
  assert.throws(() => fixture({mutateEvidence: value => value.acousticWords[0].start += 0.1}), /source clock differs/);
  assert.throws(() => fixture({mutateBoundary: value => value.selectedSourceSpeechBoundary.startFrame++}), /selected speech boundary differs/);
});

test('distant, overlapping, oversized, alternate and old-schema additions are rejected', () => {
  const {source, options, resolve} = fixture();
  for (const addition of [
    {...options.addition, sourceVideoRange: range(44955, 44999)},
    {...options.addition, sourceVideoRange: range(44000, 45000)},
    {...options.addition, targetSegmentId: 'segment-0009'},
    {...options.addition, subtitleMode: 'source-media-only'}]) {
    assert.throws(() => resolveQ52EditPlanV001({...options, addition}), /first fixed source addition/);
  }
  assert.throws(() => fixture({mutateTimeline: rows => Object.assign(rows[6], {sourceStartFrame30: 44900, sourceEndFrame30: 45000})}), /addition evidence conflicts/);
  assert.throws(() => fixture({mutateEvidence: value => value.addition.sourceVideoRange.startFrame = 44000}), /addition evidence conflicts/);
  assert.throws(() => restoreQ52EditPlanV001({source, saved: {...resolve(), schemaVersion: 'q5-content-edit-plan-v002'}}), /separate Q5-2 schema/);
});

test('saved payload tampering and reuse of derived or serialized content as originals are rejected', () => {
  const {source, options, resolve} = fixture(); const plan = resolve();
  const mutations = [value => value.normalPlan.elements[0].text = 'changed',
    value => value.normalPlan.elements[0].endFrameExclusive++, value => value.normalPlan.elements[0].visualState.textStyle.fontSizePx++,
    value => value.physicalPieces[7].originalDigestRange = range(655, 700),
    value => value.captionMappings[0].outputRange.endFrameExclusive++, value => value.frameCount++,
    value => value.normalPlan.elements.forEach(row => {row.startFrame += 45; row.endFrameExclusive += 45;})];
  for (const mutate of mutations) {
    const saved = copy(plan); mutate(saved);
    assert.throws(() => restoreQ52EditPlanV001({source, saved}), /does not exactly reconstruct/);
  }
  for (const invalid of [plan, plan.normalPlan, copy(source)]) {
    assert.throws(() => resolveQ52EditPlanV001({...options, source: invalid}), /only a byte-bound original/);
  }
  for (const name of ['policyRef', 'sourceEvidenceRef', 'boundaryEvidenceRef']) {
    assert.throws(() => resolveQ52EditPlanV001({...options, [name]: {...options[name], fileSha256: 'f'.repeat(64)}}), /edit identity must match/);
  }
});

test('comparison rejects cutting original captions, skipping the original opening or crossing the original exit', () => {
  const {source, options, resolve} = fixture(); const resolved = resolve();
  for (const beforeRange of [range(701, 760), range(700, 801), range(700, 759)]) {
    assert.throws(() => projectQ52ComparisonRangeV001({source, resolved, beforeRange}), /Before must start|endpoint cuts/);
  }
  assert.throws(() => projectQ52ComparisonRangeV001({source, resolved, beforeRange: range(700, 740)}), /fixed first-proposal body and exit/);
  const cancelled = resolveQ52EditPlanV001({...options, addition: null, addedCaptions: []});
  assert.throws(() => projectQ52ComparisonRangeV001({source, resolved: cancelled, beforeRange: range(700, 760)}), /active addition/);
});

// This bounded real-input test runs only when the locally preserved, first-proposal evidence exists.
const actualSourcePath = resolvePath('evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q5-2-20260921-v001/source-v001.json');
test('real C-all first proposal preserves 325 originals and adds exactly the three grounded captions',
  {skip: !existsSync(actualSourcePath)}, () => {
    const input = JSON.parse(readFileSync(actualSourcePath, 'utf8'));
    const bytes = Object.fromEntries(['plan', 'timeline', 'basisEditPlan', 'sourceEvidence', 'boundaryEvidence']
      .map(name => [name + 'Bytes', readFileSync(input[name + 'Ref'].path)]));
    const source = createQ52EditSourceV001({...input, ...bytes});
    const evidence = source.sourceEvidence;
    const plan = resolveQ52EditPlanV001({source, candidateId: evidence.candidateId, policyRef: evidence.policyRef,
      sourceEvidenceRef: input.sourceEvidenceRef, boundaryEvidenceRef: input.boundaryEvidenceRef,
      addition: evidence.addition, addedCaptions: evidence.addedCaptionEvidence});
    assert.equal(plan.addedFrameCount, 345); assert.equal(plan.frameCount, 44753); assert.equal(plan.normalPlan.elements.length, 328);
    assert.equal(plan.captionMappings.filter(row => row.status === 'retained').length, 325);
    assert.deepEqual(plan.addition.sourceVideoRange, range(227963, 228308));
    const comparison = projectQ52ComparisonRangeV001({source, resolved: plan, beforeRange: evidence.comparisonBeforeRange});
    assert.equal(comparison.frameCount, 624); assert.equal(comparison.normalPlan.elements.length, 6);
    assert.deepEqual(comparison.physicalPieces.map(row => row.outputRange), [range(0, 345), range(345, 624)]);
    assert.deepEqual(comparison.normalPlan.elements.map(row => [row.startFrame, row.endFrameExclusive]),
      [[0, 86], [86, 171], [171, 345], [345, 470], [470, 587], [587, 624]]);
    assert.deepEqual(restoreQ52EditPlanV001({source, saved: JSON.parse(JSON.stringify(plan))}), plan);
  });

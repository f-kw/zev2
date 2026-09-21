import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {createQ5EditSourceV001, resolveQ5EditPlanV002, projectQ5ComparisonRangeV002} from './q5-edit-plan.mjs';
import {createQ52EditSourceV001, resolveQ52EditPlanV001, projectQ52ComparisonRangeV001} from './q5-2-edit-plan.mjs';
import {createQ53EditSourceV001, resolveQ53EditPlanV001, restoreQ53EditPlanV001, projectQ53ComparisonRangeV001} from './q5-3-edit-plan.mjs';
import {canonicalJson} from './clock.mjs';
import {indexExplicitLinesV001, PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
const sha = value => createHash('sha256').update(value).digest('hex');
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const ref = (name, bytes = name) => ({path: '/fixture/q53/' + name, bytes: Buffer.byteLength(bytes), fileSha256: sha(bytes)});
const bytes = value => JSON.stringify(value);
const payload = ({startFrame, endFrameExclusive, ...rest}) => rest;
const TARGET = 'digest-v1-phase2-20260913-v001-bridge-caption-000121';
const selection = (omit, add) => ({omit, add});

// This file owns its small fixture. It does not import fixture code from another test file.
function fixture({omissionOwnerIndex = 3} = {}) {
  const mediaRef = ref('base-media.mp4'), sourceVideoRef = ref('original.mp4');
  const segments = Array.from({length: 12}, (_, index) => ({segmentId: 'segment-' + String(index + 1).padStart(4, '0'),
    sourceStartMs: 100000 + index * 200000, sourceEndMs: 100000 + index * 200000 + 3333,
    sourceStartFrame30: 3000 + index * 6000, sourceEndFrame30: 3100 + index * 6000,
    outputStartFrame: index * 100, outputEndFrame: (index + 1) * 100}));
  const basis = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit-plan', artifactId: 'fixture-q53-original',
    sourceVideoBinding: sourceVideoRef, unresolvedEdits: [],
    segments: segments.map(({segmentId, sourceStartMs, sourceEndMs}) => ({segmentId, sourceStartMs, sourceEndMs}))};
  const normal = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30}, layoutRules: {characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001},
    elements: segments.flatMap((segment, index) => [0, 20, 40, 80].map((offset, ordinal) => {
      const text = '元の字幕' + index + '-' + ordinal;
      return {instructionId: 'fixture-original-caption-' + index + '-' + ordinal, kind: 'speech-caption', text,
        indexedLines: indexExplicitLinesV001([text]).indexedLines, startFrame: segment.outputStartFrame + offset,
        endFrameExclusive: segment.outputStartFrame + offset + 20, displayFrameCount: 20,
        sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
        visualState: {stateId: 'caption-core-v001', textStyle: {fontSizePx: 94, fontAssetId: 'fixture-font'},
          layout: {maxCharsPerLine: 36, maxLines: 2, singleLine: false}, position: {preset: 'bottom-center'}, background: null},
        transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
        targetProvenance: {sourceAtomIds: ['fixture-original-' + index + '-' + ordinal]}, materialRefs: []};
    }))};
  const ownerStart = omissionOwnerIndex * 100, rowStart = omissionOwnerIndex * 4;
  Object.assign(normal.elements[rowStart], {startFrame: ownerStart + 10, endFrameExclusive: ownerStart + 20, displayFrameCount: 10});
  Object.assign(normal.elements[rowStart + 1], {instructionId: TARGET, text: 'このドスンと落ちていくんですこれ',
    indexedLines: indexExplicitLinesV001(['このドスンと落ちていくんですこれ']).indexedLines,
    startFrame: ownerStart + 30, endFrameExclusive: ownerStart + 60, displayFrameCount: 30});
  Object.assign(normal.elements[rowStart + 2], {startFrame: ownerStart + 60, endFrameExclusive: ownerStart + 70, displayFrameCount: 10});
  Object.assign(normal.elements[rowStart + 3], {startFrame: ownerStart + 80, endFrameExclusive: ownerStart + 90, displayFrameCount: 10});
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'fixture-q53-original-timeline',
    sourceRef: 'fixture-original-source', sourceFrameClock: {inputFrameRate: '60/1', logicalFrameRate: '30/1'},
    baseMedia: {artifactId: 'fixture-base', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256,
      frameRate: '30/1', expectedFrameCount: 1200}, segments};
  const original = {originalContentVersion: 'fixture-q53-original-v001', fixture: true, mediaRef,
    planBytes: bytes(normal), timelineBytes: bytes(timeline), basisEditPlanBytes: bytes(basis),
    planRef: ref('normal-plan.json', bytes(normal)), timelineRef: ref('timeline.json', bytes(timeline)),
    basisEditPlanRef: ref('basis-edit-plan.json', bytes(basis))};
  const sourceAtoms = ['前', 'の', '文'].map((text, index) => ({id: 101 + index,
    startMs: 1498500 + index * 500, endMs: 1499000 + index * 500, text, speaker: 'fixture-speaker'}));
  const addedCaptions = sourceAtoms.map((atom, index) => ({captionId: 'q5-2-added-caption-' + String(index + 1).padStart(6, '0'),
    text: atom.text, sourceVideoRange: range(44955 + index * 15, 44970 + index * 15), sourceSegmentIds: [atom.id],
    acousticWordIndices: [index], sourceUtteranceId: 'fixture-utterance', acousticChunkIndex: 253,
    sourceStartMs: atom.startMs, sourceEndMs: atom.endMs}));
  const addPolicy = ref('q52-instruction.md'), addition = {targetSegmentId: 'segment-0008', sourceVideoRange: range(44955, 45000), subtitleMode: 'source-text-captions'};
  const beforeAdd = range(700, omissionOwnerIndex === 7 ? 780 : 760);
  const evidence = {schemaVersion: 'q5-2-context-addition-judgment-v001', candidateId: 'fixture-Q5-2-C001',
    targetSegmentId: 'segment-0008', policyRef: addPolicy, sourceVideoRef,
    sourceTranscriptRef: ref('transcript.json'), sourceUtterancesRef: ref('utterances.json'), sourceWordTimestampsRef: ref('word-timestamps.json'),
    sourceAcousticObservationRef: ref('acoustic-observation.json'), sourceAcousticPreflightRef: ref('acoustic-preflight.json'),
    addition, comparisonBeforeRange: beforeAdd,
    sourceUtterance: {utteranceId: 'fixture-utterance', text: '前の文', sourceSegmentIds: [101, 102, 103]}, sourceAtoms,
    acousticChunk: {index: 253, startMs: 1498000, endMs: 1528000},
    acousticWords: sourceAtoms.map((atom, index) => ({word: atom.text, start: 0.5 + index * 0.5, end: 1 + index * 0.5})),
    addedCaptionEvidence: addedCaptions};
  const sourceEvidenceBytes = bytes(evidence), sourceEvidenceRef = ref('judgment.json', sourceEvidenceBytes);
  const boundary = {schemaVersion: 'q5-2-context-addition-boundary-v001', candidateId: evidence.candidateId,
    policyRef: addPolicy, sourceEvidenceRef, sourceVideoRef, targetSegmentId: 'segment-0008',
    originalTargetSourceRange: range(45000, 45100), actualSourceAddition: addition.sourceVideoRange,
    comparisonBeforeRange: beforeAdd, addedFrameCount: 45, subtitleMode: 'source-text-captions', addedCaptions,
    selectedSourceSpeechBoundary: {utteranceId: 'fixture-utterance', firstSegmentId: 101, rawObservedStartMs: 1498500,
      fixedTextObservedStartMs: 1498500, startMs: 1498500, rounding: 'nearest-at-30fps', startFrame: 44955}};
  const boundaryEvidenceBytes = bytes(boundary), boundaryEvidenceRef = ref('boundary.json', boundaryEvidenceBytes);
  const sourceInput = {...original, sourceVideoRef, sourceEvidenceRef, sourceEvidenceBytes, boundaryEvidenceRef, boundaryEvidenceBytes};
  const omitSource = createQ5EditSourceV001(sourceInput), addSource = createQ52EditSourceV001(sourceInput);
  const omit = resolveQ5EditPlanV002({source: omitSource, mediaOmission: range(ownerStart + 36, ownerStart + 54),
    hiddenCaptionId: TARGET, candidateId: 'fixture-Q5-1-C001', policyRef: ref('q51-instruction.md'), boundaryEvidenceRef: ref('q51-boundary.json')});
  const add = resolveQ52EditPlanV001({source: addSource, candidateId: evidence.candidateId, policyRef: addPolicy,
    sourceEvidenceRef, boundaryEvidenceRef, addition, addedCaptions});
  const omitComparison = projectQ5ComparisonRangeV002({source: omitSource, resolved: omit, beforeRange: range(ownerStart, ownerStart + 100)});
  const addComparison = projectQ52ComparisonRangeV001({source: addSource, resolved: add, beforeRange: beforeAdd});
  const candidates = Object.fromEntries([['omit', omit, omitComparison], ['add', add, addComparison]].map(([role, plan, comparison]) => [role, {
    editPlanRef: ref(role + '-plan.json', bytes(plan)), editPlanBytes: bytes(plan),
    comparisonRef: ref(role + '-comparison.json', bytes(comparison)), comparisonBytes: bytes(comparison)}]));
  const input = {sourceInput, candidates, policyRef: ref('q53-instruction.md')};
  return {input, normal, timeline, omit, add, omitComparison, addComparison};
}
function prepared() {
  const data = fixture(), source = createQ53EditSourceV001(data.input);
  return {...data, source, resolve: value => resolveQ53EditPlanV001({source, selection: value})};
}

test('fixed sources reuse the existing original validators and expose separate source and candidate identities', () => {
  const {source, input} = prepared();
  assert.equal(source.sourceIdentity.originalIdentity.frameCount, 1200);
  assert.deepEqual(source.candidateIdentity.omit.editPlanRef, input.candidates.omit.editPlanRef);
  assert.deepEqual(source.candidateIdentity.add.comparisonRef, input.candidates.add.comparisonRef);
  assert.equal(source.candidateIdentity.omit.candidateId, 'fixture-Q5-1-C001');
  assert.equal(source.candidateIdentity.add.candidateId, 'fixture-Q5-2-C001');
  assert.equal(source.sourceIdentitySha256, sha(canonicalJson(source.sourceIdentity)));
  assert.equal(source.candidateIdentitySha256, sha(canonicalJson(source.candidateIdentity)));
  assert(Object.isFrozen(source)); assert(Object.isFrozen(source.normalPlan.elements));
});

test('four states resolve from common originals with exact durations, visible-caption counts and ordered piece counts', () => {
  const {resolve} = prepared();
  for (const [flags, frames, captions, pieces] of [[selection(false, false), 1200, 48, 12],
    [selection(true, false), 1182, 47, 13], [selection(false, true), 1245, 51, 13], [selection(true, true), 1227, 50, 14]]) {
    const result = resolve(flags);
    assert.equal(result.frameCount, frames); assert.equal(result.normalPlan.elements.length, captions);
    assert.equal(result.physicalPieces.length, pieces); assert.equal(result.playback.sampleCount, frames * 1600);
    assert.equal(result.captionCount, captions); assert.deepEqual(result.selection, flags);
    assert.equal(result.physicalPieces[0].editedGlobalRange.startFrame, 0);
    for (let i = 1; i < result.physicalPieces.length; i++)
      assert.equal(result.physicalPieces[i].editedGlobalRange.startFrame, result.physicalPieces[i - 1].editedGlobalRange.endFrameExclusive);
    assert.equal(result.physicalPieces.at(-1).editedGlobalRange.endFrameExclusive, frames);
  }
});

test('shared-boundary roles keep the preceding endpoint separate from inserted source and shifted original body', () => {
  const {resolve} = prepared(), both = resolve(selection(true, true));
  const previous = both.retainedIntervals[6], target = both.retainedIntervals[7];
  const added = both.physicalPieces.find(row => row.kind === 'added-source-video');
  const originalBody = both.physicalPieces.find(row => row.kind === 'retained-original-digest' && row.parentSegmentId === 'segment-0008');
  assert.equal(previous.editedGlobalRange.endFrameExclusive, 682);
  assert.deepEqual(added.editedGlobalRange, range(682, 727));
  assert.equal(originalBody.editedGlobalRange.startFrame, 727); assert.deepEqual(target.editedGlobalRange, range(682, 827));
  const precedingCaption = both.normalPlan.elements.find(row => row.instructionId === 'fixture-original-caption-6-3');
  const followingCaption = both.normalPlan.elements.find(row => row.instructionId === 'fixture-original-caption-7-0');
  assert.equal(precedingCaption.endFrameExclusive, 682); assert.equal(followingCaption.startFrame, 727);
  assert.equal(added.originalDigestRange, null); assert.equal(added.playback.originalDigestRange, null);
  assert.equal(both.mediaOmission.outputRange, null); assert.equal(both.mediaOmission.editedGlobalRange, null);
  assert.equal(both.playback.addedSampleCount, 45 * 1600); assert.equal(both.playback.removedSampleCount, 18 * 1600);
  assert.equal(both.observation.sampleRate, 16000); assert.equal(both.playback.sampleRate, 48000);
});

test('original caption payloads and verified new caption payloads are preserved while target media edges remain', () => {
  const {normal, add, resolve} = prepared(), both = resolve(selection(true, true));
  for (const original of normal.elements.filter(row => row.instructionId !== TARGET)) {
    const current = both.normalPlan.elements.find(row => row.instructionId === original.instructionId);
    assert.deepEqual(payload(current), payload(original));
  }
  for (const id of both.addedCaptionIds) {
    assert.deepEqual(payload(both.normalPlan.elements.find(row => row.instructionId === id)),
      payload(add.normalPlan.elements.find(row => row.instructionId === id)));
  }
  assert.deepEqual(both.hiddenCaptionIds, [TARGET]);
  assert.equal(both.captionMappings.find(row => row.captionId === TARGET).status, 'hidden');
  assert.equal(both.captionMappings.find(row => row.captionId === TARGET).outputRange, null);
  assert.deepEqual(both.targetMediaRetention.retainedEdges.map(row => row.originalDigestRange), [range(330, 336), range(354, 360)]);
  assert.deepEqual(both.targetMediaRetention.retainedEdges.map(row => row.editedGlobalRange), [range(330, 336), range(336, 342)]);
  assert(both.captionMappings.filter(row => row.status === 'added').every(row => row.originalDigestRange === null));
});

test('individual cancellation preserves the other fixed edit, and clearing both restores original content and captions', () => {
  const {normal, omit, add, source, resolve} = prepared(), both = resolve(selection(true, true));
  const keepAdd = resolve({...both.selection, omit: false}), keepOmit = resolve({...both.selection, add: false});
  assert.deepEqual(keepAdd.normalPlan, add.normalPlan); assert.deepEqual(keepOmit.normalPlan, omit.normalPlan);
  assert.deepEqual(keepAdd.candidateIdentity, both.candidateIdentity); assert.deepEqual(keepOmit.candidateIdentity, both.candidateIdentity);
  assert.deepEqual(keepAdd.addition, both.addition); assert.equal(keepAdd.mediaOmission, null);
  assert.deepEqual(keepOmit.mediaOmission, both.mediaOmission); assert.equal(keepOmit.addition, null); assert.deepEqual(keepOmit.addedCaptionIds, []);
  const none = resolve(selection(false, false));
  assert.deepEqual(none.normalPlan, normal); assert.equal(none.contentVersion, source.sourceIdentity.originalIdentity.originalContentVersion);
  assert.equal(none.frameCount, 1200); assert.deepEqual(none.hiddenCaptionIds, []); assert.deepEqual(none.addedCaptionIds, []);
});

test('operation order and reselecting an already selected proposal cannot apply an effect twice', () => {
  const {resolve} = prepared();
  const empty = resolve(selection(false, false));
  const omitThenAdd = resolve({...resolve({...empty.selection, omit: true}).selection, add: true});
  const addThenOmit = resolve({...resolve({...empty.selection, add: true}).selection, omit: true});
  assert.deepEqual(omitThenAdd, addThenOmit);
  assert.deepEqual(resolve({...omitThenAdd.selection, omit: true}), omitThenAdd);
  assert.deepEqual(resolve({...omitThenAdd.selection, add: true}), omitThenAdd);
  assert.deepEqual(resolve({...resolve({...omitThenAdd.selection, add: false}).selection, add: true}), omitThenAdd);
});

test('combined local comparisons retain the old exact Normal plans and physical coordinates with a separate new global clock', () => {
  const {source, omitComparison, addComparison, resolve} = prepared(), both = resolve(selection(true, true));
  const omit = projectQ53ComparisonRangeV001({source, resolved: both, candidateId: source.candidateIdentity.omit.candidateId});
  const add = projectQ53ComparisonRangeV001({source, resolved: both, candidateId: source.candidateIdentity.add.candidateId});
  assert.deepEqual(omit.normalPlan, omitComparison.normalPlan); assert.deepEqual(add.normalPlan, addComparison.normalPlan);
  assert.deepEqual(omit.afterRange, omitComparison.afterRange); assert.deepEqual(add.afterRange, addComparison.afterRange);
  assert.deepEqual(omit.newGlobalRange, range(300, 382)); assert.deepEqual(add.newGlobalRange, range(682, 787));
  assert.deepEqual(add.physicalPieces.map(row => row.outputRange), [range(0, 45), range(45, 105)]);
  assert.deepEqual(add.physicalPieces.map(row => row.originalDigestRange), [null, range(700, 760)]);
  assert.deepEqual(add.physicalPieces.map(row => row.sourceVideoRange), [range(44955, 45000), range(45000, 45060)]);
  assert.equal(add.localNormalMatchesOriginalComparison, true); assert.equal(omit.localNormalMatchesOriginalComparison, true);
  assert.deepEqual(add.originalEditPlanRef, source.candidateIdentity.add.editPlanRef);
  assert.throws(() => projectQ53ComparisonRangeV001({source, resolved: resolve(selection(false, false)), candidateId: source.candidateIdentity.add.candidateId}), /selected fixed candidate/);
  assert.throws(() => projectQ53ComparisonRangeV001({source, resolved: both, candidateId: 'another-candidate'}), /selected fixed candidate/);
});

test('saved states reconstruct completely and reject altered payload, clocks, identity or prior schemas', () => {
  const {source, resolve} = prepared(), both = resolve(selection(true, true));
  assert.deepEqual(restoreQ53EditPlanV001({source, saved: JSON.parse(JSON.stringify(both))}), both);
  for (const mutate of [row => row.normalPlan.elements[0].text = 'changed', row => row.normalPlan.elements[0].endFrameExclusive++,
    row => row.normalPlan.elements[0].visualState.textStyle.fontSizePx++, row => row.frameCount++,
    row => row.physicalPieces.find(piece => piece.kind === 'added-source-video').originalDigestRange = range(655, 700),
    row => row.normalPlan.elements.forEach(caption => {caption.startFrame += 45; caption.endFrameExclusive += 45;}),
    row => row.selection.omit = false]) {
    const saved = clone(both); mutate(saved);
    assert.throws(() => restoreQ53EditPlanV001({source, saved}), /does not exactly reconstruct/);
  }
  assert.throws(() => restoreQ53EditPlanV001({source, saved: {...both, candidateIdentitySha256: 'f'.repeat(64)}}), /fixed candidates or policy differ/);
  assert.throws(() => restoreQ53EditPlanV001({source, saved: {...both, schemaVersion: 'q5-2-content-edit-plan-v001'}}), /Q5-3 schema/);
});

test('only two boolean choices and byte-bound originals are accepted; arbitrary and duplicate operation forms are rejected', () => {
  const {source, resolve} = prepared(), both = resolve(selection(true, true));
  for (const flags of [{omit: true}, {omit: true, add: 1}, {omit: true, add: true, duplicateOmit: true}, ['omit', 'omit']])
    assert.throws(() => resolveQ53EditPlanV001({source, selection: flags}), /selection/);
  for (const invalid of [both, both.normalPlan, clone(source)])
    assert.throws(() => resolveQ53EditPlanV001({source: invalid, selection: selection(true, true)}), /common-original Q5-3 source/);
});

test('candidate replacement, changed input bytes, comparison tampering and intersecting ownership are rejected', () => {
  const {input} = prepared();
  assert.throws(() => createQ53EditSourceV001({...input, candidates: {...input.candidates, extra: input.candidates.omit}}), /fixed candidates fields differ/);
  assert.throws(() => createQ53EditSourceV001({...input, candidates: {...input.candidates, add: input.candidates.omit}}), /Q5-2 schema/);
  assert.throws(() => createQ53EditSourceV001({...input, sourceInput: {...input.sourceInput, planBytes: input.sourceInput.planBytes + ' '}}), /bytes differ/);
  const changed = clone(input), comparison = JSON.parse(changed.candidates.omit.comparisonBytes);
  comparison.normalPlan.elements[0].text = 'changed'; changed.candidates.omit.comparisonBytes = bytes(comparison);
  changed.candidates.omit.comparisonRef = ref('changed-comparison.json', changed.candidates.omit.comparisonBytes);
  assert.throws(() => createQ53EditSourceV001(changed), /saved comparison does not exactly reconstruct/);
  const overlap = fixture({omissionOwnerIndex: 7});
  assert.throws(() => createQ53EditSourceV001(overlap.input), /ownership or comparison ranges overlap/);
});

const actualRoot = path.resolve('evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001');
const actualPolicyPath = path.resolve('docs/reports/digest-quality-q5-3-20260921-v001/authority-receipt-v001.md');
const actualSourcePath = path.join(actualRoot, 'quality-q5-2-20260921-v001/source-v001.json');
test('real fixed C-all proposals resolve all four expected states and localize both accepted shorts without changing their payload',
  {skip: !existsSync(actualPolicyPath) || !existsSync(actualSourcePath)}, () => {
    const bind = file => {const raw = readFileSync(file); return {path: file, bytes: raw.length, fileSha256: sha(raw)};};
    const sourceInput = JSON.parse(readFileSync(actualSourcePath));
    for (const name of ['plan', 'timeline', 'basisEditPlan', 'sourceEvidence', 'boundaryEvidence']) sourceInput[name + 'Bytes'] = readFileSync(sourceInput[name + 'Ref'].path);
    const candidates = Object.fromEntries([
      ['omit', 'quality-q5-1-20260921-v002/edit-plan-v002.json', 'quality-q5-1-20260921-v002/comparison-preflight-v002.json'],
      ['add', 'quality-q5-2-20260921-v001/edit-plan-v001.json', 'quality-q5-2-20260921-v001/comparison-v001.json']
    ].map(([role, plan, comparison]) => {const p = path.join(actualRoot, plan), c = path.join(actualRoot, comparison);
      return [role, {editPlanRef: bind(p), editPlanBytes: readFileSync(p), comparisonRef: bind(c), comparisonBytes: readFileSync(c)}];}));
    const source = createQ53EditSourceV001({sourceInput, candidates, policyRef: bind(actualPolicyPath)});
    const states = [[selection(false, false), 44408, 325, 12], [selection(true, false), 44349, 324, 13],
      [selection(false, true), 44753, 328, 13], [selection(true, true), 44694, 327, 14]];
    let both;
    for (const [flags, frames, captions, pieces] of states) {
      const plan = resolveQ53EditPlanV001({source, selection: flags});
      assert.equal(plan.frameCount, frames); assert.equal(plan.normalPlan.elements.length, captions); assert.equal(plan.physicalPieces.length, pieces);
      assert.deepEqual(restoreQ53EditPlanV001({source, saved: JSON.parse(JSON.stringify(plan))}), plan);
      if (flags.omit && flags.add) both = plan;
    }
    assert.equal(both.retainedIntervals[6].editedGlobalRange.endFrameExclusive, 18519);
    const prefix = both.physicalPieces.find(row => row.kind === 'added-source-video');
    assert.deepEqual(prefix.editedGlobalRange, range(18519, 18864));
    assert.equal(both.physicalPieces.find(row => row.kind === 'retained-original-digest' && row.parentSegmentId === 'segment-0008').editedGlobalRange.startFrame, 18864);
    for (const role of ['omit', 'add']) {
      const projected = projectQ53ComparisonRangeV001({source, resolved: both, candidateId: source.candidateIdentity[role].candidateId});
      const previous = JSON.parse(candidates[role].comparisonBytes);
      assert.deepEqual(projected.normalPlan, previous.normalPlan); assert.equal(projected.localNormalMatchesOriginalComparison, true);
      assert.equal(projected.frameCount, role === 'omit' ? 763 : 624);
      assert.equal(projected.normalPlan.elements.length, role === 'omit' ? 5 : 6);
      assert.deepEqual(projected.newGlobalRange, role === 'omit' ? range(11683, 12446) : range(18519, 19143));
    }
    assert.equal(source.sourceIdentity.sourceFrameClock.inputFrameRate, '60/1');
    assert.equal(source.sourceIdentity.sourceFrameClock.logicalFrameRate, '30/1');
    // A different Q5-1 cut is legal for the old resolver but is not an admitted Q5-3 candidate.
    const omitSource = createQ5EditSourceV001(sourceInput), oldOmit = JSON.parse(candidates.omit.editPlanBytes);
    const alternative = resolveQ5EditPlanV002({source: omitSource, candidateId: oldOmit.candidateId,
      policyRef: oldOmit.policyRef, boundaryEvidenceRef: oldOmit.boundaryEvidenceRef,
      mediaOmission: range(12154, 12212), hiddenCaptionId: oldOmit.hiddenCaptionId});
    const alternativeComparison = projectQ5ComparisonRangeV002({source: omitSource, resolved: alternative,
      beforeRange: range(11683, 12505)});
    const rebound = {...candidates, omit: {editPlanRef: ref('rebound-plan.json', bytes(alternative)), editPlanBytes: bytes(alternative),
      comparisonRef: ref('rebound-comparison.json', bytes(alternativeComparison)), comparisonBytes: bytes(alternativeComparison)}};
    assert.throws(() => createQ53EditSourceV001({sourceInput, candidates: rebound, policyRef: bind(actualPolicyPath)}), /two accepted fixed files/);
    const differentWindow = projectQ5ComparisonRangeV002({source: omitSource, resolved: oldOmit,
      beforeRange: range(11427, 12505)});
    const windowRebound = {...candidates, omit: {...candidates.omit, comparisonBytes: bytes(differentWindow),
      comparisonRef: ref('rebound-window.json', bytes(differentWindow))}};
    assert.throws(() => createQ53EditSourceV001({sourceInput, candidates: windowRebound, policyRef: bind(actualPolicyPath)}), /two accepted fixed files/);
    assert.throws(() => createQ53EditSourceV001({sourceInput: {...sourceInput, fixture: true}, candidates, policyRef: bind(actualPolicyPath)}), /fixture content version/);
  });

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, sha256AutoPresentationV001,
  materializeFiniteAutoPresentationCaptionV001} from './presentation_auto_effects_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from './presentation_caption_motion_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  selectOrchestrationPresetV001, editOrchestrationOverrideV001, resolveOrchestrationDrawingViewV001,
  assertOrchestrationDrawingViewV001, assertOrchestrationDrawingViewMatchesStateV001,
  exportOrchestrationDrawingViewEvidenceV001, restoreOrchestrationDrawingViewEvidenceV001,
  buildOrchestrationNativeQcAlternativeElementsV001} from './presentation_orchestration_v001.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(canonicalJson(value));
const copy = value => structuredClone(value);
const serialize = value => JSON.stringify(value) + '\n';
const ref = (name, content = name) => ({path: '/fixture/' + name, fileSha256: sha(content)});
function fixture({sampleRate = 44100, ids = ['caption-1', 'caption-2', 'caption-3']} = {}) {
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}},
    provenance: {fixedLayout: 'unchanged'}, elements: ids.map((instructionId, i) => ({instructionId,
      kind: 'speech-caption', text: '固定字幕の本文' + i, indexedLines: [{lineIndex: 0, text: '固定字幕の本文' + i}],
      startFrame: i * 120, endFrameExclusive: i * 120 + 100, displayFrameCount: 100,
      sourceMapping: {segment: 'source-' + i}, visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFFFF',
        borderColor: '#000000', borderWidthPx: 3, glowWidthPx: 0},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
      background: {color: '#00000000'}}}))};
  const planBytes = serialize(plan), mediaRef = ref('base.mp4');
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: 360, fileSha256: mediaRef.fileSha256},
    segments: ids.map((id, i) => ({segmentId: 'segment-' + (i + 1), outputStartFrame: i * 120,
      outputEndFrame: (i + 1) * 120, sourceStartFrame30: i * 1000, sourceEndFrame30: i * 1000 + 120}))};
  const timelineBytes = serialize(timeline);
  const pulseTimingEvidence = {schemaVersion: 'auto-presentation-pulse-timing-v001', sourceRef: ref('audio.mp4'),
    candidatesRef: ref('candidates.json'), peaksRef: ref('peaks.json'), sampleRate: 16000, sampleCount: 192000,
    candidates: [{candidateId: 'event-1', peakIds: ['peak-1']}],
    peaks: [{peakId: 'peak-1', startSample: 75000, endSampleExclusive: 90000, peakSample: 80000}]};
  const decisionInputBytes = serialize({schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence});
  const captionContext = {baselineRef: {...ref('normal.json', planBytes), canonicalSha256: sha256AutoPresentationV001(plan)},
    decisionInputRef: ref('native-binding.json', decisionInputBytes), renderingRulesRef: copy(AUTO_PRESENTATION_RULES_REF_V008), pulseTimingEvidence};
  const source = {digestRef: {version: 'synthetic-fixed-digest-v001', sha256: sha('fixed Digest')},
    planRef: ref('normal.json', planBytes), timelineRef: ref('timeline.json', timelineBytes), mediaRef,
    planBytes, timelineBytes, playbackSampleRate: sampleRate, observationSampleRate: 16000, captionContext, decisionInputBytes};
  const context = createOrchestrationContextV001(source);
  const evidence = {productionPurpose: '意味判断の許容範囲と時刻の結合を検証する。',
    captions: plan.elements.map((row, i) => ({captionId: row.instructionId, text: row.text, contextId: 'context-' + i,
      startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive, eligiblePulsePeakIds: i === 1 ? ['peak-1'] : []})),
    contexts: ids.map((id, i) => ({contextId: 'context-' + i, description: '独立した保持文脈 ' + i})), observations: [],
    audioEvidence: {sourceRef: pulseTimingEvidence.sourceRef, candidatesRef: pulseTimingEvidence.candidatesRef, sampleRate: 16000, sampleCount: 192000},
    audioCandidates: [{candidateId: 'event-1', startSample: 62000, endSampleExclusive: 100000, constituentPeakIds: ['peak-1']} ]};
  const input = createOrchestrationJudgmentInputV001({context, evidence});
  const reply = {schemaVersion: 'presentation-orchestration-judgment-v001', inputSha256: input.inputSha256, completion: 'complete',
    captions: ids.map(captionId => ({captionId, status: 'resolved', semanticRole: 'focus',
      allowedPresets: [{preset: 'color', scope: 'whole-caption'}, {preset: 'panel'}], reason: '本文の意味を強調する。', evidenceIds: [captionId]})),
    connections: context.connectionIds.map(connectionId => ({connectionId, status: 'resolved', semanticRole: 'separator',
      allowedPresets: ['black-separator', 'soft-separator'], reason: '保持場面を区切る。', evidenceIds: [connectionId]}))};
  return {source, context, evidence, input, reply, plan};
}
const fixed = (f, reply = f.reply) => fixOrchestrationJudgmentV001({context: f.context, input: f.input, replyBytes: serialize(reply)});
const view = (f, state) => resolveOrchestrationDrawingViewV001({context: f.context, state});
const edit = (f, state, kind, itemId, selection) => editOrchestrationOverrideV001({context: f.context, state, kind, itemId, selection});

test('fresh complete semantic judgment seals four independent saved systems without a prior answer', () => {
  const f = fixture(), state = fixed(f), v = view(f, state);
  assert.equal(state.captionAuto.proposal.targetCaptionIds.length, 3);
  assert.equal(state.connectionAuto.connections.length, 2);
  assert.equal(state.captionOverrides.entries.length, 0); assert.equal(state.connectionOverrides.entries.length, 0);
  assert.equal(v.projection.displayFrameCount, 384);
  assert.deepEqual(v.resolution.counts.captions, {total: 3, explicitNormal: 0, selected: 3, unresolved: 0, unrepresentable: 0});
  assert.deepEqual(v.resolution.counts.connections, {total: 2, explicitNormal: 0, selected: 2, unresolved: 0, unrepresentable: 0});
  assert.ok(Object.isFrozen(state.captionAuto.proposal.effects)); assert.ok(Object.isFrozen(v.resolvedPlan.elements[0]));
  assert.equal(assertOrchestrationDrawingViewV001(v), true);
  const injected = {...f.evidence, answer: f.reply};
  assert.throws(() => createOrchestrationJudgmentInputV001({context: f.context, evidence: injected}), /semantic evidence fields/);
});

test('stable hashing ignores allowed-set order, other item judgments and decision row order', () => {
  const f = fixture(), a = fixed(f), reordered = copy(f.reply);
  reordered.captions.reverse(); reordered.connections.reverse();
  for (const row of [...reordered.captions, ...reordered.connections]) row.allowedPresets.reverse();
  const b = fixed(f, reordered);
  assert.deepEqual(a.captionAuto, b.captionAuto); assert.deepEqual(a.connectionAuto, b.connectionAuto);
  for (let i = 0; i < 3; i++) assert.deepEqual(a.selectionRecord.captions[i].selection, b.selectionRecord.captions[i].selection);
  const changed = copy(f.reply); changed.captions[0].semanticRole = 'reaction'; changed.captions[0].allowedPresets = [{preset: 'shake'}];
  const c = fixed(f, changed);
  assert.deepEqual(a.selectionRecord.captions.slice(1).map(r => r.selection), c.selectionRecord.captions.slice(1).map(r => r.selection));
  assert.deepEqual(a.connectionAuto, c.connectionAuto);
  const args = {digestSha256: f.context.digestRef.sha256, kind: 'caption', itemId: 'caption-2', allowedPresets: [{preset: 'color'}, {preset: 'panel'}]};
  assert.equal(selectOrchestrationPresetV001(args).selectionSha256,
    sha(canonicalJson([args.digestSha256, 'presentation-orchestration-v001', 'caption', 'caption-2'])));
});

test('Normal, unresolved and unrepresentable remain separately counted with complete coverage', () => {
  const f = fixture(), r = copy(f.reply);
  Object.assign(r.captions[0], {semanticRole: 'normal', allowedPresets: [{preset: 'normal'}]});
  Object.assign(r.captions[1], {status: 'unresolved', semanticRole: null, allowedPresets: []});
  Object.assign(r.captions[2], {status: 'unrepresentable', semanticRole: null, allowedPresets: []});
  Object.assign(r.connections[0], {status: 'unresolved', semanticRole: null, allowedPresets: []});
  Object.assign(r.connections[1], {semanticRole: 'continuation', allowedPresets: ['normal-cut']});
  const state = fixed(f, r), v = view(f, state);
  assert.deepEqual(v.resolution.counts.captions, {total: 3, explicitNormal: 1, selected: 0, unresolved: 1, unrepresentable: 1});
  assert.deepEqual(v.resolution.counts.connections, {total: 2, explicitNormal: 1, selected: 0, unresolved: 1, unrepresentable: 0});
  assert.equal(state.captionAuto.proposal.exceptions.length, 2);
  assert.equal(v.projection.displayFrameCount, 360);
});

test('reject omitted, duplicated, incomplete, foreign or hidden numeric judgment fields before fixation', () => {
  const f = fixture();
  const mutations = [r => r.captions.pop(), r => r.connections.pop(), r => r.captions.push(copy(r.captions[0])),
    r => {r.completion = 'partial';}, r => {r.inputSha256 = 'a'.repeat(64);},
    r => {r.captions[0].allowedPresets[0].fontSizePx = 90;},
    r => {r.captions[0].evidenceIds = ['unknown'];}, r => {r.captions[0].allowedPresets = [];},
    r => {r.captions[0].allowedPresets.push(copy(r.captions[0].allowedPresets[0]));},
    r => {r.captions[0].semanticRole = 'reaction';}, r => {r.connections[0].semanticRole = 'either';}];
  for (const mutate of mutations) {const reply = copy(f.reply); mutate(reply); assert.throws(() => fixed(f, reply));}
});

test('partial Color is exact text and sole preset; physical exclusions and Pulse eligibility are binding', () => {
  const f = fixture(), r = copy(f.reply);
  r.captions[0].allowedPresets = [{preset: 'color', scope: 'partial-caption', targetText: '字幕'}];
  const v = view(f, fixed(f, r));
  assert.deepEqual(v.resolvedPlan.elements[0].presentationColorRange, {startCodePoint: 2, endCodePointExclusive: 4, fontColor: '#FFD65A'});
  r.captions[0].allowedPresets.push({preset: 'panel'}); assert.throws(() => fixed(f, r), /partial-caption/);
  r.captions[0].allowedPresets = [{preset: 'color', scope: 'partial-caption', targetText: '不存在'}];
  assert.throws(() => fixed(f, r), /not found/);
  Object.assign(r.captions[0], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'pulse', anchorPeakId: 'peak-1'}]});
  assert.throws(() => fixed(f, r), /not eligible/);
  const evidence = copy(f.evidence); evidence.observations.push({observationId: 'physical-scale', kind: 'scale-unrepresentable',
    captionIds: ['caption-2'], description: '実配置が安全域を超える。'});
  const input = createOrchestrationJudgmentInputV001({context: f.context, evidence});
  const reply = copy(f.reply); reply.inputSha256 = input.inputSha256;
  Object.assign(reply.captions[1], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'scale'}]});
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)}), /physically unrepresentable/);
});

test('caption override affects one caption and preserves automatic records and connection override bytes', () => {
  const f = fixture(), a = fixed(f), b = edit(f, a, 'caption', 'caption-2', {preset: 'shake'});
  for (const key of ['captionAuto', 'connectionAuto', 'connectionOverrides', 'selectionRecord']) assert.strictEqual(a[key], b[key]);
  assert.equal(b.captionOverrides.entries.length, 1);
  const before = view(f, a), after = view(f, b);
  assert.deepEqual(before.projection, after.projection);
  assert.deepEqual(before.resolvedPlan.elements[0], after.resolvedPlan.elements[0]);
  assert.deepEqual(before.resolvedPlan.elements[2], after.resolvedPlan.elements[2]);
  assert.ok(after.resolvedPlan.elements[1].presentationMotion);
});

test('connection override shifts later captions and measured peak once while fixed captions remain original', () => {
  const f = fixture(), r = copy(f.reply);
  Object.assign(r.captions[1], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'pulse', anchorPeakId: 'peak-1'}]});
  const state = fixed(f, r), v = view(f, state);
  assert.equal(v.projectedNormalPlan.elements[1].startFrame, 132);
  assert.equal(v.resolvedPlan.elements[1].presentationPulse.anchorFrame, 162);
  assert.equal(v.projectedPeaks[0].displaySample, 86400);
  assert.deepEqual(v.projectedPeaks[0].playbackSample, {numerator: 238140, denominator: 1});
  assert.equal(v.captionTimings[2].startFrame, 264);
  assert.equal(state.captionAuto.proposal.context.baselineRef.fileSha256, f.source.planRef.fileSha256);
  const b = edit(f, state, 'connection', 'connection-01', 'Normal');
  for (const key of ['captionAuto', 'captionOverrides', 'connectionAuto', 'selectionRecord']) assert.strictEqual(b[key], state[key]);
  const shifted = view(f, b);
  assert.equal(shifted.projectedNormalPlan.elements[1].startFrame, 120);
  assert.equal(shifted.resolvedPlan.elements[1].presentationPulse.anchorFrame, 150);
  assert.equal(shifted.projectedPeaks[0].displaySample, 80000);
  assert.equal(shifted.captionTimings[2].startFrame, 252);
  assert.ok(v.audioEvidenceIntervals[0].parts.length > 1);
});

test('48kHz projection is separate from 16kHz Pulse observations and uses integer insertions', () => {
  const f = fixture({sampleRate: 48000}), r = copy(f.reply);
  Object.assign(r.captions[1], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'pulse', anchorPeakId: 'peak-1'}]});
  const v = view(f, fixed(f, r));
  assert.equal(v.projection.insertedSpans[0].playbackSampleCount, 19200);
  assert.equal(v.projectedPeaks[0].sampleRate, 16000); assert.equal(v.projectedPeaks[0].displaySample, 86400);
  assert.deepEqual(v.projectedPeaks[0].playbackSample, {numerator: 259200, denominator: 1});
});

test('Reset deletes one override, restores fixed auto, preserves the other axis, and repeated Reset is idempotent', () => {
  const f = fixture(), a = fixed(f);
  const b = edit(f, edit(f, a, 'caption', 'caption-2', 'Normal'), 'connection', 'connection-01', 'Normal');
  const c = edit(f, b, 'caption', 'caption-2', 'Reset');
  assert.equal(c.captionOverrides.entries.length, 0); assert.strictEqual(c.connectionOverrides, b.connectionOverrides);
  assert.deepEqual(c.captionOverrides, a.captionOverrides);
  const d = edit(f, c, 'connection', 'connection-01', 'Reset');
  assert.deepEqual(d, a); assert.deepEqual(edit(f, d, 'connection', 'connection-01', 'Reset'), d);
  assert.deepEqual(view(f, d), view(f, a));
});

test('caption and connection changes commute and sequential reloading never accumulates shifts', () => {
  const f = fixture(), a = fixed(f);
  const first = edit(f, edit(f, a, 'caption', 'caption-2', {preset: 'bounce'}), 'connection', 'connection-01', 'Normal');
  const second = edit(f, edit(f, a, 'connection', 'connection-01', 'Normal'), 'caption', 'caption-2', {preset: 'bounce'});
  assert.deepEqual(first, second); assert.deepEqual(view(f, first), view(f, second));
  const v = view(f, a), restored = restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(serialize(exportOrchestrationDrawingViewEvidenceV001(v))));
  assert.deepEqual(restored, v);
  assert.equal(restored.resolvedPlan.elements[2].startFrame, 264);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(exportOrchestrationDrawingViewEvidenceV001(restored)), v);
});

test('all dynamic finite captions start on projected display time and return to normal within the original duration', () => {
  const f = fixture();
  for (const preset of ['bounce', 'shake']) {
    const a = fixed(f), state = edit(f, a, 'caption', 'caption-2', {preset}), v = view(f, state), element = v.resolvedPlan.elements[1];
    const program = getPresentationCaptionMotionProgramV001({element, canvas: v.resolvedPlan.canvas});
    assert.equal(element.startFrame, 132); assert.equal(element.endFrameExclusive, 232);
    assert.ok(program); assert.equal(v.captionTimings[1].motionStartFrame, 132);
    const {startFrame, endFrameExclusive, presentationMotion, ...rest} = element;
    const {startFrame: s, endFrameExclusive: e, ...original} = f.plan.elements[1];
    assert.deepEqual(rest, original);
  }
});

test('source replacement, shifted input, saved-auto edits and fabricated views are rejected', () => {
  const f = fixture(), state = fixed(f), v = view(f, state);
  const source = copy(f.source), changedPlan = JSON.parse(source.planBytes); changedPlan.elements[1].startFrame += 12;
  source.planBytes = serialize(changedPlan);
  assert.throws(() => createOrchestrationContextV001(source), /bytes differ/);
  const altered = copy(state); altered.captionAuto.proposal.effects[0].scope = 'partial-caption';
  assert.throws(() => view(f, altered), /fixed semantic choices/);
  assert.throws(() => assertOrchestrationDrawingViewV001(copy(v)), /must be derived/);
  assert.throws(() => buildOrchestrationNativeQcAlternativeElementsV001(copy(v)), /must be derived/);
  assert.throws(() => resolveOrchestrationDrawingViewV001({context: copy(f.context), state}), /must be rebuilt/);
});

test('same-duration Black to Soft update invalidates stale projection/view; current state reload succeeds', () => {
  const f = fixture(), a = edit(f, fixed(f), 'connection', 'connection-01', 'black-separator'), before = view(f, a);
  const b = edit(f, a, 'connection', 'connection-01', 'soft-separator'), after = view(f, b);
  assert.equal(before.projection.displayFrameCount, after.projection.displayFrameCount);
  assert.notEqual(before.projection.projectionSha256, after.projection.projectionSha256);
  assert.throws(() => assertOrchestrationDrawingViewMatchesStateV001({view: before, context: f.context, state: b}), /stale drawing view/);
  assert.equal(assertOrchestrationDrawingViewMatchesStateV001({view: after, context: f.context, state: b}), true);
});

test('saved rendering proof reconstructs checked sources and rejects tampering even after resealing the outer proof', () => {
  const f = fixture(), a = fixed(f), v = view(f, a), proof = copy(exportOrchestrationDrawingViewEvidenceV001(v));
  assert.equal(restoreOrchestrationDrawingViewEvidenceV001(proof).viewSha256, v.viewSha256);
  proof.source.planBytes += ' ';
  const {evidenceSha256, ...body} = proof; proof.evidenceSha256 = hash(body);
  assert.throws(() => restoreOrchestrationDrawingViewEvidenceV001(proof), /bytes differ/);
  const edited = copy(exportOrchestrationDrawingViewEvidenceV001(v));
  edited.expectedViewSha256 = 'f'.repeat(64);
  const {evidenceSha256: ignored, ...body2} = edited; edited.evidenceSha256 = hash(body2);
  assert.throws(() => restoreOrchestrationDrawingViewEvidenceV001(edited), /reconstructed drawing view/);
});

test('native QC alternatives retain display time and fixed text geometry, with whole-Color and Panel discriminators', () => {
  const f = fixture(), r = copy(f.reply);
  r.captions[0].allowedPresets = [{preset: 'color', scope: 'partial-caption', targetText: '字幕'}];
  r.captions[1].allowedPresets = [{preset: 'panel'}];
  const v = view(f, fixed(f, r)), alternatives = buildOrchestrationNativeQcAlternativeElementsV001(v).alternatives;
  assert.deepEqual(alternatives[0].entries.map(row => row.kind), ['normal', 'whole-color']);
  assert.equal(alternatives[0].entries[1].element.presentationColorRange.startCodePoint, 0);
  const panel = alternatives[1].entries.find(row => row.kind === 'panel-plate-omitted').element;
  assert.equal(panel.startFrame, 132); assert.equal(panel.visualState.background.color, 'transparent');
  const {inspectionPlateOmitted, ...plateGeometry} = panel.visualState.background;
  assert.equal(inspectionPlateOmitted, true);
  assert.deepEqual({...plateGeometry, color: '#FFFDF8'}, v.resolvedPlan.elements[1].visualState.background);
  assert.deepEqual(panel.visualState.textStyle, v.resolvedPlan.elements[1].visualState.textStyle);
});

test('finite materialization does not accept inherited/extra drawing data or an unbound Pulse peak', () => {
  const f = fixture(), element = f.plan.elements[1], canvas = f.plan.canvas;
  assert.throws(() => materializeFiniteAutoPresentationCaptionV001({element, canvas,
    selection: {role: 'Normal', fontSizePx: 99}}), /Normal has extra/);
  assert.throws(() => materializeFiniteAutoPresentationCaptionV001({element: {...element, presentationMotion: {}}, canvas,
    selection: {role: 'Normal'}}), /normal caption/);
  assert.throws(() => materializeFiniteAutoPresentationCaptionV001({element, canvas,
    selection: {role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId: 'peak-1'},
    measuredPeak: {peakId: 'peak-2', peakSample: 80000, sampleRate: 16000}}), /bound measured peak/);
});

test('fresh semantic reasoning may cite actual ASR observations, while unknown IDs still fail', () => {
  const f = fixture(), evidence = copy(f.evidence);
  evidence.audioCandidates[0].asrSegments = [{id: 'asr-segment-1', text: '保存された認識発話'}];
  evidence.audioCandidates[0].asrContext = [{id: 'asr-context-2', text: '前後の認識発話'}];
  const input = createOrchestrationJudgmentInputV001({context: f.context, evidence}), reply = copy(f.reply);
  reply.inputSha256 = input.inputSha256;
  reply.captions[0].evidenceIds = ['asr-segment-1']; reply.connections[0].evidenceIds = ['asr-context-2'];
  assert.equal(fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)}).selectionRecord.captions.length, 3);
  reply.captions[0].evidenceIds = ['asr-segment-never-observed'];
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)}), /evidence references/);
});

test('AI input retains every native candidate and the measured sample clock cannot be relabeled', () => {
  const f = fixture(), evidence = copy(f.evidence); evidence.audioCandidates = [];
  assert.throws(() => createOrchestrationJudgmentInputV001({context: f.context, evidence}), /audio candidate ID/);
  const source = copy(f.source); source.captionContext.pulseTimingEvidence.sampleRate = 8000;
  source.decisionInputBytes = serialize({schemaVersion: 'presentation-focus-decision-input-v005',
    pulseTimingEvidence: source.captionContext.pulseTimingEvidence});
  source.captionContext.decisionInputRef.fileSha256 = sha(source.decisionInputBytes);
  assert.throws(() => createOrchestrationContextV001(source), /sample clocks differ/);
});

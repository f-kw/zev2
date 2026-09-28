import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {canonicalSha256} from './clock.mjs';
import {buildReadabilityCandidateV001, prepareReadabilityCandidatePlanV001,
  buildReadabilityCandidateRegistryV001, materializeReadabilityCandidateCaptionV001,
  READABILITY_CANDIDATE_PROFILE_V001} from './caption-readability-candidate.mjs';
import {buildCaptionReadabilityPlanV001, captionReadabilityMeasurementContextSha256V001} from './caption-readability-plan.mjs';
import {createOrchestrationProjectionV001, projectCaptionPlanV001} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {materializeFiniteAutoPresentationCaptionV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001} from '../../evals/clip_composition/presentation_renderer_plan_v002.mjs';
import {getPresentationPulseProgramV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';

const version = 'candidate-readability-v001', clone = structuredClone;
const json = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const registry = json('../../evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bindView = v => {const {viewSha256, ...body} = v; v.viewSha256 = canonicalSha256(body);};
const role = (name, presentation, extra = {}) => ({role: name, presentation, scope: 'whole-caption', ...extra});

/** Synthetic clocks and supplied width evidence exercise behavior, not an
 * assertion about real font fit. Material-specific measurements are separate. */
function fixture() {
  const texts = ['甲乙丙丁', '猫犬猫鳥', '話の要点', '強い言葉', '弾む話題', '揺れる話', '声の山場', '赤い太陽'];
  const selections = [{role: 'Normal'}, role('Focus', 'provisional-focus', {scope: 'partial-caption', targetText: '猫', occurrence: 2}),
    role('Panel accent', 'provisional-panel'), role('Vocal accent', 'provisional-vocal'),
    role('Bounce accent', 'provisional-bounce'), role('Shake accent', 'provisional-shake'),
    role('Pulse accent', 'provisional-pulse', {anchorPeakId: 'peak'}), role('Focus', 'provisional-focus')];
  const state = registry.presets[0].visualStates.find(s => s.stateId === 'caption-core-v001');
  const sourcePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: clone(registry.canvas), layoutRules: clone(PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001),
    elements: texts.map((text, i) => ({instructionId: 'caption-' + i, kind: 'speech-caption', text,
      indexedLines: indexExplicitLinesV001([text]).indexedLines,
      sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
      startFrame: i * 120, endFrameExclusive: (i + 1) * 120, displayFrameCount: 120,
      visualState: clone(state), transition: clone(registry.transitions[0]),
      targetProvenance: {targetRefId: 'synthetic-meaning', targetType: 'semantic-caption',
        sourceAtomIds: [...text].map((_, j) => 'atom-' + i + '-' + j)}, materialRefs: []}))};
  const mediaRef = {path: '/synthetic/base-media.mp4', fileSha256: 'a'.repeat(64)};
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'synthetic', sourceRef: 'synthetic-source', sourceProvenance: 'synthetic-test',
    sourceFrameClock: {inputFrameRate: '60/1', logicalFrameRate: '30/1', extractionRuleId: 'source-frame-60fps-global-even-v001',
      decodedFrameCount: 1980, containerStartTimeMs: 0, videoStreamTimeBase: '1/1000', videoFirstPts: 0, videoPtsStep: 17, videoPresentationOffsetMs: 0},
    baseMedia: {artifactId: 'synthetic-base', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256, frameRate: '30/1', expectedFrameCount: 960},
    segments: [{segmentId: 'segment-0001', sourceStartMs: 1000, sourceEndMs: 17000,
      sourceStartFrame30: 30, sourceEndFrame30: 510, outputStartFrame: 0, outputEndFrame: 480},
    {segmentId: 'segment-0002', sourceStartMs: 17000, sourceEndMs: 33000,
      sourceStartFrame30: 510, sourceEndFrame30: 990, outputStartFrame: 480, outputEndFrame: 960}]};
  const meaning = {atomOccurrences: texts.flatMap((text, i) => [...text].map((text, j) => ({atomOccurrenceId: 'atom-' + i + '-' + j,
    text, sourceSegmentId: i, semanticUtteranceId: 'utterance-' + i,
    retainedSpans: [{timelineSegmentId: i < 4 ? 'segment-0001' : 'segment-0002', sourceStartMs: 1000 + i * 4000 + j * 1000,
      sourceEndMs: 1000 + i * 4000 + (j + 1) * 1000}]})))};
  const planBytes = JSON.stringify(sourcePlan), timelineBytes = JSON.stringify(timeline);
  const source = {digestRef: {version: 'synthetic', sha256: 'b'.repeat(64)},
    planRef: {path: '/synthetic/plan.json', fileSha256: hash(planBytes)},
    timelineRef: {path: '/synthetic/timeline.json', fileSha256: hash(timelineBytes)}, mediaRef,
    planBytes, timelineBytes, playbackSampleRate: 44100, observationSampleRate: 16000};
  const projection = createOrchestrationProjectionV001({...source,
    connections: [{connectionId: 'connection-01', preset: 'black-separator', presetVersion: 'v001'}]});
  const normal = projectCaptionPlanV001({projection, planBytes}).plan;
  const peak = {peakId: 'peak', displaySample: (normal.elements[6].startFrame + 60) * 16000 / 30, sampleRate: 16000};
  const resolved = {...clone(normal), elements: normal.elements.map((element, i) => materializeFiniteAutoPresentationCaptionV001({element,
    canvas: normal.canvas, selection: selections[i], ...(i === 6 ? {measuredPeak: {peakId: peak.peakId, peakSample: peak.displaySample, sampleRate: peak.sampleRate}} : {})}))};
  const sourceView = {schemaVersion: 'synthetic-authenticated-view', sourceRefs: {planRef: source.planRef,
    timelineRef: source.timelineRef, mediaRef}, projection, projectedNormalPlan: normal, resolvedPlan: resolved, projectedPeaks: [peak],
    effectiveSelections: selections.map((selection, i) => ({captionId: 'caption-' + i, selection, origin: 'automatic', hasOverride: false})),
    resolution: {caption: {exceptions: [], captions: selections.map((selection, i) => ({captionId: 'caption-' + i,
      origin: 'automatic', role: selection.role, automaticStatus: selection.role === 'Normal' ? 'normal' : 'selected',
      automaticSelection: selection, effectiveSelection: selection, hasOverride: false,
      canonicalRange: resolved.elements[i].presentationColorRange ? {startCodePoint: resolved.elements[i].presentationColorRange.startCodePoint,
        endCodePointExclusive: resolved.elements[i].presentationColorRange.endCodePointExclusive} : null}))},
      connections: [], counts: {captions: {total: 8, explicitNormal: 1, selected: 7, unresolved: 0, unrepresentable: 0}, connections: {total: 0}}}};
  bindView(sourceView);
  const input = {version, sourceView, source, meaning};
  const prepared = prepareReadabilityCandidatePlanV001(input);
  const evidence = {schemaVersion: 'caption-readability-evidence-v001', sourcePlanSha256: canonicalSha256(prepared.segmentationPlan),
    clockId: projection.projectionSha256, maxWidthPx: 1912, captions: prepared.sourceAtoms.captions.map((row, i) => {
      const atoms = row.atoms.map(a => ({atomId: a.atomId, text: a.text, startFrame: a.startFrame, endFrameExclusive: a.endFrameExclusive,
        sourceStartMs: a.sourceSpans[0].sourceStartMs, sourceEndMs: a.sourceSpans.at(-1).sourceEndMs, timelineSegmentId: a.sourceSpans[0].timelineSegmentId}));
      const points = i < 2 ? [0, 2, 3, 4] : [0, 4];
      const measurements = [];
      for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) measurements.push({
        startAtomIndex: points[a], endAtomIndexExclusive: points[b], singleLineWidthPx: i < 2 && points[b] - points[a] > 2 ? 2200 : 800, twoLine: null});
      return {captionId: row.captionId,
        measurementContextSha256: captionReadabilityMeasurementContextSha256V001(prepared.segmentationPlan, row.captionId), atoms,
        boundaries: points.slice(1, -1).map(j => ({atomEndIndexExclusive: j, frame: atoms[j].startFrame, kind: 'semantic', reason: 'fixture meaning boundary', required: i === 1})),
        measurements, effect: prepared.effectKinds[i].effect};
    })};
  return {...input, evidence, savedResolution: buildCaptionReadabilityPlanV001({normalPlan: prepared.segmentationPlan, evidence})};
}

test('generic construction separates true normal children from Panel/Scale and preserves saved choices', () => {
  const f = fixture(), before = clone(f), result = buildReadabilityCandidateV001(f);
  assert.deepEqual(f, before);
  assert.equal(result.resolvedPlan.elements.length, 11);
  assert(result.projectedNormalPlan.elements.every(e => e.visualState.textStyle.fontSizePx === 144 && !e.visualState.background));
  const panel = result.resolvedPlan.elements.find(e => e.instructionId === 'caption-2');
  assert(panel.visualState.background); assert.equal(panel.visualState.textStyle.borderColor, '#111827');
  assert.equal(result.resolvedPlan.elements.find(e => e.instructionId === 'caption-3').visualState.textStyle.fontSizePx, 192);
  assert.deepEqual(result.captionMappings[0].children.map(c => [c.startFrame, c.endFrameExclusive]), [[0, 60], [60, 120]]);
  assert.deepEqual(result.resolvedPlan.elements.flatMap(e => e.targetProvenance.sourceAtomIds), before.meaning.atomOccurrences.map(a => a.atomOccurrenceId));
  assert.equal(result.resolution.counts.captions.total, 11);
  assert.equal(result.humanQuality, 'not-evaluated');
  assert(Object.isFrozen(result.resolvedPlan.elements[0]));
});

test('partial scope remains partial when a repeated target fills its child, with occurrence adjusted', () => {
  const r = buildReadabilityCandidateV001(fixture());
  const row = r.effectiveSelections.find(row => row.captionId === 'caption-1-readability-02');
  assert.deepEqual(row.selection, role('Focus', 'provisional-focus', {scope: 'partial-caption', targetText: '猫', occurrence: 1}));
  const element = r.resolvedPlan.elements.find(e => e.instructionId === row.captionId);
  assert.equal(element.text, '猫'); assert.deepEqual(element.presentationColorRange, {startCodePoint: 0, endCodePointExclusive: 1, fontColor: '#FFD65A'});
  assert.equal(r.effectiveSelections.filter(row => row.selection.scope === 'whole-caption' && row.selection.role === 'Focus').length, 1);
});

test('candidate Pulse and motion preserve measured anchors, each clock interval, and sample frames', () => {
  const f = fixture(), result = buildReadabilityCandidateV001(f);
  for (const id of ['caption-4', 'caption-5', 'caption-6']) {
    const old = f.sourceView.resolvedPlan.elements.find(e => e.instructionId === id);
    const current = result.resolvedPlan.elements.find(e => e.instructionId === id);
    const program = id === 'caption-6' ? getPresentationPulseProgramV001 : getPresentationCaptionMotionProgramV001;
    const a = program({element: old, canvas: f.sourceView.resolvedPlan.canvas}), b = program({element: current, canvas: result.resolvedPlan.canvas});
    assert.deepEqual(a.segments.map(s => [s.startFrame, s.endFrameExclusive]), b.segments.map(s => [s.startFrame, s.endFrameExclusive]));
    assert.deepEqual(a.samples.map(s => s.frame), b.samples.map(s => s.frame));
    if (id === 'caption-6') assert.equal(a.anchorFrame, b.anchorFrame);
  }
});

test('explicit candidate registry keeps assets, non-caption states, presets and transitions unchanged', () => {
  const old = clone(registry), result = buildReadabilityCandidateRegistryV001({registry, version});
  assert.deepEqual(registry, old); assert.equal(result.registryVersion, version);
  assert.deepEqual(result.fontAssets, old.fontAssets); assert.deepEqual(result.transitions, old.transitions);
  assert.deepEqual(result.presets.map(p => p.presetId), old.presets.map(p => p.presetId));
  assert.deepEqual(result.presets[0].visualStates.slice(1), old.presets[0].visualStates.slice(1));
  assert.equal(result.presets[0].visualStates[0].textStyle.fontSizePx, 144);
  assert.equal(READABILITY_CANDIDATE_PROFILE_V001.adoption, 'not-adopted-final-integrated-human-review-required');
  assert.throws(() => buildReadabilityCandidateRegistryV001({registry}), /explicit candidate/);
});

test('independent process reconstructs the same candidate from JSON, without cached success', () => {
  const input = fixture(), expected = buildReadabilityCandidateV001(input);
  const url = new URL('./caption-readability-candidate.mjs', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {readFileSync} from 'node:fs'; import {buildReadabilityCandidateV001} from ${JSON.stringify(url)}; process.stdout.write(JSON.stringify(buildReadabilityCandidateV001(JSON.parse(readFileSync(0,'utf8')))));`],
  {input: JSON.stringify(input), encoding: 'utf8'});
  assert.deepEqual(JSON.parse(output), expected);
});

for (const [name, alter] of [
  ['unknown candidate version', f => f.version = 'new-default'],
  ['source view mutation', f => f.sourceView.resolvedPlan.elements[0].text += '改'],
  ['different saved source bytes', f => f.source.planBytes += ' '],
  ['different source reference', f => f.source.planRef.path += '-other'],
  ['missing meaning atoms', f => f.meaning.atomOccurrences.pop()],
  ['different interior source clock', f => f.meaning.atomOccurrences[1].retainedSpans[0].sourceStartMs += 50],
  ['wrong evidence atom', f => f.evidence.captions[0].atoms[1].text = '別'],
  ['wrong clock binding', f => f.evidence.clockId = 'a'.repeat(64)],
  ['wider allowed safe area', f => f.evidence.maxWidthPx++],
  ['saved partition changed', f => f.savedResolution = {...f.savedResolution, summary: {}}],
  ['missing measured width', f => f.evidence.captions[0].measurements.pop()],
  ['wrong effect evidence', f => f.evidence.captions[2].effect = {kind: 'normal'}],
  ['changed automatic target crossing child boundary', f => {
    f.sourceView.resolution.caption.captions[1].automaticSelection = role('Focus', 'provisional-focus', {scope: 'partial-caption', targetText: '犬猫'}); bindView(f.sourceView);
  }],
]) test('rejects ' + name, () => {const input = clone(fixture()); alter(input); assert.throws(() => buildReadabilityCandidateV001(input));});

test('unsupported phrase-return does not silently become the short candidate program', () => {
  const result = buildReadabilityCandidateV001(fixture());
  assert.throws(() => materializeReadabilityCandidateCaptionV001({version, element: result.projectedNormalPlan.elements[0], canvas: result.projectedNormalPlan.canvas,
    selection: role('Bounce accent', 'provisional-bounce', {presetVersion: 'presentation-bounce-speech-return-v001', speechEndFrame: 50})}), /speech-return/);
});

test('stored automatic meaning survives an existing human override for future Reset without resegmentation', () => {
  const f = clone(fixture()), row = f.sourceView.resolution.caption.captions[0];
  row.automaticSelection = role('Focus', 'provisional-focus', {scope: 'partial-caption', targetText: '甲乙'});
  row.origin = 'human'; row.hasOverride = true;
  Object.assign(f.sourceView.effectiveSelections[0], {origin: 'human', hasOverride: true}); bindView(f.sourceView);
  const r = buildReadabilityCandidateV001(f), rows = r.resolution.caption.captions.filter(c => c.captionId.startsWith('caption-0-'));
  assert.deepEqual(rows[0].effectiveSelection, {role: 'Normal'});
  assert.equal(rows[0].automaticSelection.targetText, '甲乙');
  assert.deepEqual(rows[1].automaticSelection, {role: 'Normal'});
  assert(rows.every(c => c.hasOverride));
});

test('saved material reproduces v006 exactly while the QC baseline is truly Normal', async t => {
  const base = '../../runtime/artifacts/digest-new-material-20260926-v001/';
  const output = '../../runtime/artifacts/caption-readability-20260928-preview-v006/';
  let drawing;
  try { drawing = json(base + 'presentation/drawing-evidence.json'); }
  catch (error) {if (error.code === 'ENOENT') return t.skip('saved approved material unavailable'); throw error;}
  const {restoreOrchestrationDrawingViewEvidenceV001} = await import('../../evals/clip_composition/presentation_orchestration_v001.mjs');
  const input = {version, sourceView: restoreOrchestrationDrawingViewEvidenceV001(drawing), source: drawing.source,
    meaning: json(base + 'caption-attempt-003/meaning-input.json'), evidence: json(output + 'readability-evidence.json'),
    savedResolution: json(output + 'readability-resolution.json')};
  const result = buildReadabilityCandidateV001(input);
  assert.deepEqual(result.resolvedPlan, json(output + 'candidate-render-plan.json'));
  assert.deepEqual(result.summary, {originalCaptions: 326, outputCaptions: 431, splitParents: 99, oneLineCaptions: 392, twoLineCaptions: 39});
  assert(result.projectedNormalPlan.elements.every(e => e.visualState.textStyle.fontSizePx === 144 && !e.visualState.background));
  assert.equal(result.effectiveSelections.filter(row => row.selection.scope === 'partial-caption').length, 32);
  assert.equal(result.effectiveSelections.filter(row => row.selection.role === 'Focus' && row.selection.scope === 'whole-caption').length, 1);
});

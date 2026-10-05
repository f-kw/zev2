import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {
  deriveDigestNativeInspectionSelectionV001 as derive,
  validateDigestNativeSamplingCoverageV001 as validate,
  evaluateDigestRepresentativeRendererQcV001 as representativeQc,
  evaluatePresentationRendererQcV002,
  evaluatePresentationReviewRendererQcV003,
  evaluatePresentationVerticalReviewRendererQcV001,
  evaluatePresentationRendererQcWithProfileV001,
  validateDigestCaptionVisibilitySelectionV001 as validateVisibility,
  validateDigestCaptionVisibilityCompositionV001 as validateComposition,
} from './presentation_renderer_qc_v002.mjs';
import {getPresentationPanelPresetV002} from './presentation_panel_presets_v002.mjs';

// Small pure JSON fixtures only; no actual pixels, file capability, drawing, QC tool or storage are created.
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const bounds = (left, top, right, bottom) => ({left, top, right, bottom, width: right - left, height: bottom - top});
function fixture() {
  const canvas = {width: 1920, height: 1080, fps: 30, safeAreaPx: {left: 48, right: 48, top: 48, bottom: 48}};
  const ids = ['representative-a', 'unselected-b', 'top-band-c', 'panel-d'];
  const lineSets = [
    [bounds(400, 760, 1520, 850), bounds(400, 880, 1520, 1000)],
    [bounds(410, 820, 1510, 950)],
    [bounds(400, 90, 1520, 170), bounds(400, 210, 1520, 290)],
    [bounds(480, 320, 1440, 520)],
  ];
  const wholeBounds = [bounds(400, 760, 1520, 1000), bounds(410, 820, 1510, 950),
    bounds(0, 0, 1920, 380), bounds(300, 250, 1620, 590)];
  const plan = {schemaVersion: 'synthetic-test-plan', canvas, elements: ids.map((instructionId, i) => ({
    instructionId, presetId: 'Normal', registryVersion: 'synthetic-registry', startFrame: i * 15, endFrameExclusive: (i + 1) * 15,
    indexedLines: lineSets[i].map((_value, lineIndex) => ({lineIndex, text: 'テスト'})),
    visualState: {stateId: 'caption-core-v001', position: {preset: i === 2 ? 'top-band' : 'bottom-center'},
      background: i === 3 ? structuredClone(getPresentationPanelPresetV002('provisional-panel').background) : null, layout: {maxLines: 2}},
  }))};
  const policy = {schemaVersion: 'digest-representative-verification-policy-v001', mode: 'representative-plus-rules-v001',
    representativeInstructionIds: [ids[0]], permittedMethods: ['still-frame'], confirmationRecordPath: 'runtime/artifacts/test/confirmation.json'};
  const byteBinding = label => ({path: '/test-only/' + label + '.json', fileSha256: hash(label), sizeBytes: 123});
  const expectedBindings = {approvedJobBinding: byteBinding('job'), authorizationBinding: byteBinding('authorization'), implementationSha: '1'.repeat(40)};
  const selection = derive(plan, policy);
  const masks = lineSets.map((lines, i) => lines.map((alphaBounds, lineIndex) => ({lineIndex,
    pngSha256: hash(['line-mask', i, lineIndex]), alphaBounds})));
  const calibrations = lineSets.map((lines, i) => lines.map((alphaBounds, lineIndex) => ({lineIndex,
    pngSha256: hash(['calibration', i, lineIndex]), alphaBounds})));
  const overlayInspections = ids.map((instructionId, i) => ({
    instructionId, alphaMax: 1, alphaBounds: wholeBounds[i], lineCount: lineSets[i].length,
    lineRects: lineSets[i], lineAlphaBounds: selection.lineMaskInstructionIds.includes(instructionId)
      ? masks[i].map(mask => ({lineIndex: mask.lineIndex, pngSha256: mask.pngSha256, ...mask.alphaBounds})) : [],
    overlayFile: 'overlays/' + instructionId + '.png', overlaySha256: hash(['primary', i]),
    appliedOverlayPropsCanonicalSha256: hash(['props', i]),
    ...(selection.requiredPlacementInstructionIds.includes(instructionId)
      ? {visibleCenterCalibration: {lineMasks: calibrations[i]}} : {}),
  }));
  const applicationResults = ids.map((instructionId, i) => ({instructionId, requestedPresetId: 'Normal', appliedPresetId: 'Normal',
    appliedPresetRegistryVersion: 'synthetic-registry', overlayFile: overlayInspections[i].overlayFile,
    overlaySha256: overlayInspections[i].overlaySha256, appliedOverlayPropsCanonicalSha256: overlayInspections[i].appliedOverlayPropsCanonicalSha256,
    finalPlanElementReference: {planFile: 'presentation-render-plan-v002.json', instructionId,
      canonicalSha256: hash({...plan.elements[i], overlaySha256: overlayInspections[i].overlaySha256})}}));
  const nativeCoverage = {schemaVersion: 'digest-native-sampling-coverage-v001', rendererPlanCanonicalSha256: hash(plan),
    policyCanonicalSha256: hash(policy), ...expectedBindings,
    entries: ids.map((instructionId, i) => ({instructionId, primarySha256: overlayInspections[i].overlaySha256,
      repeat: policy.representativeInstructionIds.includes(instructionId) ? {status: 'performed', sha256: overlayInspections[i].overlaySha256} : {status: 'not-executed'},
      lineMasks: selection.lineMaskInstructionIds.includes(instructionId) ? {status: 'performed',
        scope: selection.requiredPlacementInstructionIds.includes(instructionId) ? 'required-placement' : 'representative', masks: masks[i]} : {status: 'not-executed'},
      calibration: selection.requiredPlacementInstructionIds.includes(instructionId)
        ? {status: 'performed', masks: calibrations[i]} : {status: 'not-executed'},
    }))};
  const expectedAudio = {present: true, codecName: 'aac', packetPayloadSha256: hash('original-audio')};
  const input = {plan, applicationResults, overlayInspections, canvas, expectedFrameCount: 60, expectedAudio,
    mediaInspection: {durationMs: 2000, video: {width: 1920, height: 1080, fps: 30, frameCount: 60},
      audio: {codecName: 'aac', packetPayloadSha256: expectedAudio.packetPayloadSha256}}, requireFinalVisibility: false};
  return {input, plan, policy, nativeCoverage, expectedBindings, masks};
}
const args = f => ({plan: f.plan, policy: f.policy, coverage: f.nativeCoverage,
  overlayInspections: f.input.overlayInspections, bindings: f.expectedBindings});
const qc = f => representativeQc(f.input, {policy: f.policy, nativeCoverage: f.nativeCoverage, expectedBindings: f.expectedBindings});

test('selection is explicit, Normal-only, and retains every top-band/panel placement mask', () => {
  const f = fixture();
  assert.deepEqual(derive(f.plan, f.policy), {representativeInstructionIds: ['representative-a'],
    requiredPlacementInstructionIds: ['top-band-c', 'panel-d'], lineMaskInstructionIds: ['representative-a', 'top-band-c', 'panel-d']});
  f.policy.representativeInstructionIds.push('top-band-c');
  const selection = derive(f.plan, f.policy);
  assert.deepEqual(selection.lineMaskInstructionIds, ['representative-a', 'top-band-c', 'panel-d']);
});
for (const [label, mutate] of [
  ['unknown sample', f => f.policy.representativeInstructionIds.push('unknown')],
  ['duplicate sample', f => f.policy.representativeInstructionIds.push('representative-a')],
  ['Pulse', f => {f.plan.elements[0].presentationPulse = {};}],
  ['Motion', f => {f.plan.elements[0].presentationMotion = {};}],
]) test('selection rejects ' + label, () => {const f = fixture(); mutate(f); assert.throws(() => derive(f.plan, f.policy));});

test('coverage records performed and unperformed native work without claiming full inspection', () => {
  const f = fixture(), result = validate(args(f));
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.summary, {scope: 'representative-plus-required-placement', totalInstructions: 4, primaryInspectionCount: 4,
    repeatInspectionCount: 1, repeatNotExecutedCount: 3, lineMaskInstructionCount: 3, lineMaskCount: 5,
    lineMaskNotExecutedInstructionCount: 1, lineMaskNotExecutedCount: 1, calibrationInstructionCount: 2, calibrationMaskCount: 3,
    calibrationNotExecutedInstructionCount: 2});
});
for (const [label, mutate] of [
  ['substituted job', f => {f.nativeCoverage.approvedJobBinding = {...f.nativeCoverage.approvedJobBinding, fileSha256: hash('other-job')};}],
  ['substituted authorization', f => {f.nativeCoverage.authorizationBinding = {...f.nativeCoverage.authorizationBinding, fileSha256: hash('other-authorization')};}],
  ['substituted implementation', f => {f.nativeCoverage.implementationSha = '2'.repeat(40);}],
  ['substituted plan clock', f => {f.plan.elements[1].startFrame++;}],
  ['substituted policy', f => {f.policy.representativeInstructionIds = ['unselected-b'];}],
  ['missing primary', f => {f.nativeCoverage.entries.pop();}],
  ['mismatched primary SHA', f => {f.nativeCoverage.entries[1].primarySha256 = hash('other-png');}],
  ['missing selected repeat', f => {f.nativeCoverage.entries[0].repeat = {status: 'not-executed'};}],
  ['failed selected repeat', f => {f.nativeCoverage.entries[0].repeat.sha256 = hash('nondeterministic');}],
  ['missing selected mask', f => {f.nativeCoverage.entries[0].lineMasks.masks.pop();}],
  ['mask SHA detached from inspection', f => {f.nativeCoverage.entries[0].lineMasks.masks[0].pngSha256 = hash('wrong-mask');}],
  ['mask bounds detached from inspection', f => {f.nativeCoverage.entries[0].lineMasks.masks[0].alphaBounds = bounds(401, 760, 1521, 850);}],
  ['missing special calibration', f => {f.nativeCoverage.entries[2].calibration = {status: 'not-executed'};}],
  ['missing post-correction special mask', f => {f.nativeCoverage.entries[2].lineMasks = {status: 'not-executed'};}],
  ['undeclared unselected masks', f => {f.input.overlayInspections[1].lineAlphaBounds = f.masks[1].map(m => ({lineIndex: m.lineIndex, pngSha256: m.pngSha256, ...m.alphaBounds}));}],
  ['unperformed repeat with fabricated SHA', f => {f.nativeCoverage.entries[1].repeat.sha256 = hash('fake');}],
]) test('coverage and representative QC reject ' + label, () => {
  const f = fixture(); mutate(f);
  assert.equal(validate(args(f)).status, 'failed'); assert.equal(qc(f).status, 'failed');
});

test('the separate evaluator preserves all primary rules and explicitly reports sampled visibility', () => {
  const f = fixture(), before = structuredClone(f), result = qc(f);
  assert.equal(result.status, 'passed-representative-rules');
  assert.equal(result.checks.allPrimaryRules.status, 'passed');
  assert.equal(result.checks.layoutAndVisibility.status, 'passed-representative');
  assert.equal(result.checks.media.status, 'passed');
  assert.deepEqual(result.checks.nativeSampling.coverage, f.nativeCoverage);
  assert.equal(result.checks.nativeSampling.summary.repeatNotExecutedCount, 3);
  assert.deepEqual(f, before, 'PURE_EVALUATOR_MUST_NOT_MUTATE_INPUTS');
});
for (const [label, mutate] of [
  ['empty unselected primary alpha', f => {f.input.overlayInspections[1].alphaMax = 0;}],
  ['unsafe unselected primary bounds', f => {f.input.overlayInspections[1].alphaBounds = bounds(0, 820, 1500, 950);}],
  ['unselected primary nonfinite bounds', f => {f.input.overlayInspections[1].alphaBounds.left = NaN;}],
  ['unselected props mismatch', f => {f.input.applicationResults[1].appliedOverlayPropsCanonicalSha256 = hash('wrong-props');}],
  ['changed application clock reference', f => {f.input.applicationResults[1].finalPlanElementReference.canonicalSha256 = hash('wrong-clock');}],
  ['missing unselected application', f => {f.input.applicationResults.splice(1, 1);}],
  ['wrong video frame count', f => {f.input.mediaInspection.video.frameCount++;}],
  ['missing original audio', f => {f.input.mediaInspection.audio = null;}],
  ['changed original audio packets', f => {f.input.mediaInspection.audio.packetPayloadSha256 = hash('changed-audio');}],
  ['missing original audio expectation', f => {delete f.input.expectedAudio;}],
  ['unbound canvas', f => {f.input.canvas = {...f.input.canvas, safeAreaPx: {...f.input.canvas.safeAreaPx, left: 0}};}],
  ['non-hash props in application and inspection', f => {f.input.overlayInspections[1].appliedOverlayPropsCanonicalSha256 = 'not-a-sha'; f.input.applicationResults[1].appliedOverlayPropsCanonicalSha256 = 'not-a-sha';}],
]) test('all primary/media rules still reject ' + label, () => {const f = fixture(); mutate(f); assert.equal(qc(f).status, 'failed');});

test('the full QC exports reject missing unselected masks even with caller sampling flags', () => {
  const f = fixture();
  const forgedScope = {lineMaskInstructionIds: new Set(['representative-a'])};
  const input = {...f.input, nativeInspectionScope: forgedScope, nativeCoverage: f.nativeCoverage, verificationPolicy: f.policy};
  for (const run of [evaluatePresentationRendererQcV002, evaluatePresentationReviewRendererQcV003,
    evaluatePresentationVerticalReviewRendererQcV001, value => evaluatePresentationRendererQcWithProfileV001(value,
      {schemaVersion: 'synthetic-full-profile', planFile: 'presentation-render-plan-v002.json'})]) {
    const result = run(input);
    assert.equal(result.status, 'failed');
    assert(result.violations.some(v => v.code === 'OVERLAY_ALPHA_EMPTY' && v.relatedIds.includes('unselected-b')));
  }
});
test('full QC still passes its complete mask input and requires full completed-frame evidence by default', () => {
  const f = fixture();
  f.input.overlayInspections[1].lineAlphaBounds = f.masks[1].map(m => ({lineIndex: m.lineIndex, ...m.alphaBounds}));
  assert.equal(evaluatePresentationRendererQcV002(f.input).status, 'passed');
  const result = evaluatePresentationRendererQcV002({...f.input, requireFinalVisibility: true});
  assert.equal(result.status, 'failed');
  assert(result.violations.some(v => v.code === 'COMPLETED_FRAME_QC_INVALID'));
});


function visibilityFixture(f, decisions = ['show', 'suppress', 'show', 'show']) {
  const bound = label => ({path: 'runtime/artifacts/test/' + label + '.json', fileSha256: hash(label), sizeBytes: 123});
  const selection = {schemaVersion: 'digest-caption-visibility-selection-v001', mode: 'explicit-cue-adoption-v001',
    adoptionBinding: bound('adoption'), manifestBinding: bound('manifest'), rendererPlanCanonicalSha256: hash(f.plan),
    entries: f.plan.elements.map((e, i) => ({instructionId: e.instructionId, decision: decisions[i]})),
    counts: {totalInstructions: 4, shownInstructions: decisions.filter(d => d === 'show').length, suppressedInstructions: decisions.filter(d => d === 'suppress').length}};
  const shown = selection.entries.filter(e => e.decision === 'show').map(e => e.instructionId), suppressed = selection.entries.filter(e => e.decision === 'suppress').map(e => e.instructionId);
  const composition = {schemaVersion: 'digest-caption-visibility-composition-v001', selectionCanonicalSha256: hash(selection),
    rendererPlanCanonicalSha256: hash(f.plan), adoptionBinding: selection.adoptionBinding, manifestBinding: selection.manifestBinding,
    shownInstructionIds: shown, suppressedInstructionIds: suppressed, counts: selection.counts,
    rangeEvidence: [{startFrame: 0, endFrameExclusive: 60, shownInstructionIds: shown, graphSha256: hash('synthetic command')}]};
  return {selection, composition};
}
const visibilityQc = (f, v, final = true) => representativeQc(f.input, {policy: f.policy, nativeCoverage: f.nativeCoverage,
  expectedBindings: f.expectedBindings, visibilitySelection: v.selection, visibilityComposition: v.composition, requireVisibilityComposition: final});
for (const decisions of [['show','suppress','show','show'], ['suppress','suppress','suppress','suppress']]) {
  test('explicit adoption keeps every logical/primary rule with ' + decisions.filter(d => d === 'show').length + ' shown instructions', () => {
    const f = fixture(), v = visibilityFixture(f, decisions), before = structuredClone(f), r = visibilityQc(f, v);
    assert.equal(r.status, 'passed-representative-rules'); assert.equal(r.instructionCount, 4);
    assert.equal(r.checks.allPrimaryRules.status, 'passed'); assert.equal(r.checks.nativeSampling.summary.primaryInspectionCount, 4);
    assert.equal(r.checks.layoutAndVisibility.status, 'passed-primary-and-explicit-visibility');
    assert.equal(r.checks.visibilityAdoption.status, 'passed'); assert.deepEqual(r.checks.visibilityAdoption.counts, v.selection.counts);
    assert.match(r.checks.visibilityAdoption.scope, /no full-frame absence/); assert.deepEqual(f, before);
    f.input.overlayInspections[1].alphaMax = 0; assert.equal(visibilityQc(f, v).status, 'failed', 'suppression does not exempt primary rules');
  });
}
for (const [label, mutate] of [
  ['missing decision', v => v.selection.entries.pop()],
  ['reordered decisions', v => v.selection.entries.reverse()],
  ['unknown decision', v => v.selection.entries[0].decision = 'automatic'],
  ['wrong counts', v => v.selection.counts.shownInstructions++],
  ['foreign plan', v => v.selection.rendererPlanCanonicalSha256 = hash('foreign plan')],
  ['absolute adoption binding', v => v.selection.adoptionBinding.path = '/unapproved/adoption.json'],
  ['binding extra fields', v => v.selection.adoptionBinding.fallback = true],
  ['unapproved criteria', v => v.selection.criteria = {minimumFrames: 30}],
]) test('explicit selection rejects ' + label, () => {
  const f = fixture(), v = visibilityFixture(f); mutate(v);
  assert.equal(validateVisibility({plan: f.plan, selection: v.selection}).status, 'failed'); assert.equal(visibilityQc(f, v).status, 'failed');
});
for (const [label, mutate] of [
  ['hidden input', v => v.composition.rangeEvidence[0].shownInstructionIds.push('unselected-b')],
  ['range gap', v => v.composition.rangeEvidence[0].startFrame = 1],
  ['incomplete range', v => v.composition.rangeEvidence[0].endFrameExclusive--],
  ['foreign adoption', v => v.composition.adoptionBinding = {...v.composition.adoptionBinding, fileSha256: hash('foreign')}],
  ['wrong selection SHA', v => v.composition.selectionCanonicalSha256 = hash('foreign selection')],
  ['fabricated suppressed count', v => v.composition.counts = {...v.composition.counts, suppressedInstructions: 0}],
]) test('composition rejects ' + label, () => {
  const f = fixture(), v = visibilityFixture(f); mutate(v);
  assert.equal(validateComposition({plan: f.plan, selection: v.selection, composition: v.composition, expectedFrameCount: 60}).status, 'failed');
  assert.equal(visibilityQc(f, v).status, 'failed');
});
test('selection preflight cannot stand in for final composition and null preserves the old scope', () => {
  const f = fixture(), v = visibilityFixture(f), noReceipt = {...v, composition: null};
  assert.equal(visibilityQc(f, noReceipt, false).checks.visibilityAdoption.status, 'qualified-selection');
  assert.equal(visibilityQc(f, noReceipt, true).status, 'failed');
  assert.equal(validateComposition({plan: f.plan, selection: null, composition: v.composition, expectedFrameCount: 60}).status, 'failed');
  assert.equal(qc(f).checks.visibilityAdoption, undefined);
  assert.equal(qc(f).checks.layoutAndVisibility.status, 'passed-representative');
  assert.equal(validateVisibility({plan: f.plan, selection: v.selection, manifestBinding: {...v.selection.manifestBinding, fileSha256: hash('other manifest')}}).status, 'failed');
});

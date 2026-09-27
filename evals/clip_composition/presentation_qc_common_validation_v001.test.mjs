import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  buildPresentationNativeFrameQcRecipeV001, classifyPresentationNativeFrameRgbV001,
  validatePresentationNativeFrameQcEvidenceV001, validatePresentationNativeFrameQcInspectionsV001}
  from './presentation_native_frame_qc_v001.mjs';
import {combinePresentationIntegrityStateQcV001} from './presentation_integrity_state_qc_v001.mjs';
import {evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const clone = value => structuredClone(value);

// Two complete native observations, following the existing native-QC fixture.
// These are synthetic saved-evidence inputs, not media or rendering assertions.
function fixture() {
  const elements = [0, 1].map(index => ({instructionId: 'caption-' + index, kind: 'speech-caption', text: '字幕',
    presetId: 'normal', requestedPresetId: 'normal', appliedPresetId: 'normal', registryVersion: 'normal-v001',
    indexedLines: [{lineIndex: 0, text: '字幕'}], startFrame: index * 3, endFrameExclusive: index * 3 + 2,
    displayFrameCount: 2, visualState: {textStyle: {fontAssetId: 'test-font', fontSizePx: 1,
      fontColor: '#FFFFFF', borderColor: '#000000', borderWidthPx: 0, glowWidthPx: 0},
    position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
    background: null, layout: {maxLines: 1}}}));
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 2, height: 2, fps: 30}, elements};
  const baselinePlan = clone(plan);
  const jsonRef = (role, value) => ({role, path: '/fixture/' + role + '.json',
    fileSha256: hash(JSON.stringify(value)), canonicalSha256: hashJson(value)});
  const baselineRef = jsonRef('baseline-plan', baselinePlan);
  const context = {baselineRef: {path: baselineRef.path, fileSha256: baselineRef.fileSha256,
    canonicalSha256: baselineRef.canonicalSha256},
  decisionInputRef: {path: '/fixture/decision.json', fileSha256: hash('decision')},
  renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
  const autoPresentation = {context, autoProposal: fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: elements.map(row => row.instructionId), completion: 'complete', exceptions: [], effects: []}})};
  const records = elements.map((element, index) => {
    const props = {schemaVersion: 'presentation-renderer-overlay-props-v001',
      instructionId: element.instructionId, canvas: clone(plan.canvas), text: element.text,
      indexedLines: clone(element.indexedLines), visualState: clone(element.visualState), inspectionLineIndex: null};
    const record = {element: clone(element), props, pngPath: '/fixture/overlay-' + index + '.png',
      pngSha256: hash('overlay-' + index), inspection: {instructionId: element.instructionId,
        overlaySha256: hash('overlay-' + index), appliedOverlayPropsCanonicalSha256: hashJson(props),
        alphaBounds: {left: 0, top: 0, right: 2, bottom: 2, width: 2, height: 2}}};
    record.alternates = [{...clone(record), kind: 'normal'}];
    return record;
  });
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records});
  const refs = [jsonRef('plan', plan), baselineRef, jsonRef('auto-input', autoPresentation),
    ...['base-media', 'completed-media', 'tool-ffmpeg', 'tool-imagemagick'].map(role => ({
      role, path: '/fixture/' + role, fileSha256: hash(role)})),
    ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({
      role: 'png-' + row.bindingId, path: row.pngPath, fileSha256: row.pngSha256}))];
  const verified = refs.map(({role, path, fileSha256}) => ({role, path, fileSha256}));
  const inputManifest = {planCanonicalSha256: hashJson(plan), baselinePlanCanonicalSha256: hashJson(baselinePlan),
    autoPresentationCanonicalSha256: hashJson(autoPresentation), inputRefs: refs, inputRefsCanonicalSha256: hashJson(refs),
    before: clone(verified), after: clone(verified)};
  const bindings = new Map(recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(row => [row.bindingId, row]));
  const samples = recipe.samples.map((sample, sampleIndex) => {
    const signatures = new Map();
    const references = sample.references.map(row => {
      const signature = canonicalJson(row.layers.map(layer => ({png: bindings.get(layer.bindingId).pngSha256,
        localFrame: layer.localFrame, displayFrameCount: layer.displayFrameCount})));
      if (!signatures.has(signature)) signatures.set(signature, signatures.size + 1);
      return {id: row.id, rgb: Buffer.alloc(12, signatures.get(signature))};
    });
    const decision = classifyPresentationNativeFrameRgbV001({completedRgb: references[0].rgb, references});
    return {...sample, ...decision,
      baseFrame: {path: '/fixture/base-' + sample.frame + '.png', fileSha256: hash('base-' + sample.frame)},
      completedFrame: {path: '/fixture/completed-' + sample.frame + '.png', fileSha256: hash('completed-' + sample.frame)},
      completedRgb: {path: '/fixture/completed-' + sample.frame + '.rgb', fileSha256: hash(references[0].rgb)},
      completedRgbSha256: hash(references[0].rgb),
      references: sample.references.map((row, index) => ({...row, ...decision.references[index],
        rgbPath: '/fixture/reference-' + sampleIndex + '-' + index + '.rgb'}))};
  });
  const common = {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
    baselinePlan, autoPresentation, sceneBindings: recipe.sceneBindings, inputManifest, renderRange: null};
  const inspections = records.map(record => ({...clone(record.inspection),
    visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
    representativeFrame: samples.find(row => row.instructionId === record.element.instructionId).frame,
    nativeFrameQc: {...common, instructionId: record.element.instructionId,
      samples: samples.filter(row => row.instructionId === record.element.instructionId)}}));
  return {plan, inspections, evidence: {...common, samples}};
}

function compareWithStandalone(value) {
  const before = clone(value);
  const expected = value.inspections.map(inspection => validatePresentationNativeFrameQcEvidenceV001({plan: value.plan, inspection}));
  const result = validatePresentationNativeFrameQcInspectionsV001(value);
  assert.deepEqual(result.results, expected);
  assert.deepEqual(result.violations, expected.flatMap(row => row.violations));
  assert.deepEqual(value, before);
  return result;
}

test('shared and separately read common evidence retain every standalone native decision', () => {
  const shared = fixture();
  assert.equal(shared.inspections[0].nativeFrameQc.inputManifest, shared.inspections[1].nativeFrameQc.inputManifest);
  assert.equal(compareWithStandalone(shared).status, 'passed');
  const separatelyRead = JSON.parse(JSON.stringify(shared));
  assert.notEqual(separatelyRead.inspections[0].nativeFrameQc.inputManifest, separatelyRead.inspections[1].nativeFrameQc.inputManifest);
  assert.equal(compareWithStandalone(separatelyRead).status, 'passed');
});

test('a valid preceding caption cannot hide changed common evidence or local observations', () => {
  for (const mutate of [
    row => {row.nativeFrameQc.inputManifest.after[0].fileSha256 = hash('changed');},
    row => {row.nativeFrameQc.baselinePlan.elements[0].text = '変更';},
    row => {row.nativeFrameQc.sceneBindings[0].alternates.pop();},
    row => {row.nativeFrameQc.samples[0].frame++;},
    row => {row.nativeFrameQc.samples[0].references.pop();},
    row => {row.nativeFrameQc.samples[0].classes[0].absoluteRgbDifference = -1;},
  ]) {
    const value = fixture(); value.inspections[1] = clone(value.inspections[1]); mutate(value.inspections[1]);
    const result = compareWithStandalone(value);
    assert.equal(result.results[0].status, 'passed'); assert.equal(result.results[1].status, 'failed');
  }
});

test('native unique-minimum failure remains failed with the same violation after common reuse', () => {
  const value = fixture(), sample = value.inspections[1].nativeFrameQc.samples[0];
  const expected = sample.classes.find(row => row.id === sample.expectedClassId);
  const other = sample.classes.find(row => row.id !== sample.expectedClassId);
  expected.absoluteRgbDifference = other.absoluteRgbDifference + 1;
  sample.visible = false;
  const result = compareWithStandalone(value);
  assert.equal(result.status, 'failed'); assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].instructionId, 'caption-1');
  assert.match(result.violations[0].reason, /not the unique nearest reference/);
});

test('a later call revalidates mutated common inputs without trusting the earlier result', () => {
  const value = fixture();
  assert.equal(compareWithStandalone(value).status, 'passed');
  value.evidence.inputManifest.after[0].fileSha256 = hash('later mutation');
  const result = compareWithStandalone(value);
  assert.equal(result.status, 'failed'); assert.equal(result.violations.length, 2);
});

test('combined snapshot detaches inputs while preserving common and sample sharing across local/global evidence', () => {
  const value = fixture();
  // Replay validity is covered by the existing exact-replay tests. This test
  // deliberately supplies no replay proof and checks only snapshot isolation.
  const combined = combinePresentationIntegrityStateQcV001({plan: value.plan,
    finite: value, replay: {evidence: {}}, expectedFrameCount: 6});
  assert.equal(combined.status, 'failed');
  const local = combined.inspections[0].nativeFrameQc, global = combined.evidence.finiteState;
  assert.equal(local.inputManifest, global.inputManifest);
  assert.equal(local.baselinePlan, combined.inspections[1].nativeFrameQc.baselinePlan);
  assert.equal(local.samples[0], global.samples[0]);
  assert.notEqual(local.inputManifest, value.evidence.inputManifest);
  const before = clone(combined);
  value.evidence.inputManifest.after[0].fileSha256 = hash('changed source');
  assert.deepEqual(combined, before);
});

test('renderer QC snapshot preserves shared evidence across captions and whole-video proof without aliasing its input', () => {
  const value = fixture();
  const completed = combinePresentationIntegrityStateQcV001({plan: value.plan,
    finite: value, replay: {evidence: {}}, expectedFrameCount: 6});
  // Incomplete replay/application proof must remain a failure; the snapshot is
  // still inspectable without rendering or treating this fixture as passed QC.
  const result = evaluatePresentationRendererQcV002({plan: value.plan, applicationResults: [],
    overlayInspections: completed.inspections, completedFrameQcEvidence: completed.evidence,
    expectedAudio: {present: false}, expectedFrameCount: 6, canvas: value.plan.canvas,
    mediaInspection: {durationMs: 200, video: {...value.plan.canvas, frameCount: 6}}, requireFinalVisibility: true});
  assert.equal(result.status, 'failed');
  const local = result.instructionEvidence[0].nativeFrameQc;
  assert.equal(local.inputManifest, result.instructionEvidence[1].nativeFrameQc.inputManifest);
  assert.equal(local.inputManifest, result.completedFrameQcEvidence.finiteState.inputManifest);
  assert.equal(local.samples[0], result.completedFrameQcEvidence.finiteState.samples[0]);
  assert.notEqual(local.inputManifest, completed.evidence.finiteState.inputManifest);
  const before = clone(result);
  completed.evidence.finiteState.inputManifest.after[0].fileSha256 = hash('changed after renderer QC');
  assert.deepEqual(result, before);
});

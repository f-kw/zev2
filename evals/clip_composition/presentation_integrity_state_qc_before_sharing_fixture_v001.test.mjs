import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V007, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  buildPresentationNativeFrameQcRecipeV001, classifyPresentationNativeFrameRgbV001,
  buildPresentationNativeFrameExtractionArgumentsV001, buildPresentationNativeReferenceArgumentsV001,
  validatePresentationNativeFrameQcScopeV001, validatePresentationNativeFrameQcEvidenceV001}
  from './presentation_native_frame_qc_before_sharing_fixture_v001.mjs';
import {checkFiniteExecutionEvidence}
  from './presentation_integrity_state_qc_before_sharing_fixture_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const clone = value => structuredClone(value);

// Adapted from the existing combined-QC test fixture. All observations are
// synthetic validation inputs; no child process, media or image is produced.
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
  renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V007, pulseTimingEvidence: null};
  const autoPresentation = {context, autoProposal: fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: elements.map(row => row.instructionId), completion: 'complete', exceptions: [], effects: []}})};
  const records = elements.map((element, index) => {
    const props = {schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
      canvas: clone(plan.canvas), text: element.text, indexedLines: clone(element.indexedLines),
      visualState: clone(element.visualState), inspectionLineIndex: null};
    const record = {element: clone(element), props, pngPath: '/fixture/overlay-' + index + '.png', pngSha256: hash('overlay-' + index),
      inspection: {instructionId: element.instructionId, overlaySha256: hash('overlay-' + index),
        appliedOverlayPropsCanonicalSha256: hashJson(props),
        alphaBounds: {left: 0, top: 0, right: 2, bottom: 2, width: 2, height: 2}}};
    record.alternates = [{...clone(record), kind: 'normal'}];
    return record;
  });
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records});
  assert.equal(recipe.samples.length, 2);
  const plainRef = (role, file) => ({role, path: '/fixture/' + file, fileSha256: hash(file)});
  const inputRefs = [jsonRef('plan', plan), baselineRef, jsonRef('auto-input', autoPresentation),
    plainRef('base-media', 'base.mp4'), plainRef('completed-media', 'completed.mp4'),
    plainRef('tool-ffmpeg', 'ffmpeg'), plainRef('tool-imagemagick', 'magick'),
    ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({
      role: 'png-' + row.bindingId, path: row.pngPath, fileSha256: row.pngSha256}))];
  const observedInputs = inputRefs.map(({role, path, fileSha256}) => ({role, path, fileSha256}));
  const inputManifest = {planCanonicalSha256: hashJson(plan), baselinePlanCanonicalSha256: hashJson(baselinePlan),
    autoPresentationCanonicalSha256: hashJson(autoPresentation), inputRefs, inputRefsCanonicalSha256: hashJson(inputRefs),
    before: clone(observedInputs), after: clone(observedInputs)};
  const ffmpeg = '/fixture/ffmpeg', magick = '/fixture/magick';
  const executableVersions = {ffmpeg: 'synthetic-ffmpeg-version\n', imageMagick: 'synthetic-magick-version\n'};
  const observedProcess = (purpose, command, args, stdout = '') => ({purpose, command, args,
    argumentsCanonicalSha256: hashJson(args), code: 0, signal: null,
    stdoutSha256: hash(stdout), stderrSha256: hash('')});
  const processes = [observedProcess('tool-version', ffmpeg, ['-version'], executableVersions.ffmpeg),
    observedProcess('tool-version', magick, ['-version'], executableVersions.imageMagick)];
  const samples = [], outputArtifacts = [];
  for (const [index, wanted] of recipe.samples.entries()) {
    const expectedRgb = Buffer.alloc(12, 10), omittedRgb = Buffer.alloc(12);
    const decision = classifyPresentationNativeFrameRgbV001({completedRgb: expectedRgb,
      references: wanted.references.map(row => ({id: row.id, rgb: row.id === 'omitted' ? omittedRgb : expectedRgb}))});
    const sample = {...clone(wanted), ...decision,
      baseFrame: {path: '/fixture/sample-' + index + '-base.png', fileSha256: hash('base-' + index)},
      completedFrame: {path: '/fixture/sample-' + index + '-completed.png', fileSha256: hash('completed-' + index)},
      completedRgb: {path: '/fixture/sample-' + index + '-completed.rgb', fileSha256: hash(expectedRgb)},
      completedRgbSha256: hash(expectedRgb),
      references: wanted.references.map((row, referenceIndex) => ({...clone(row), ...decision.references[referenceIndex],
        rgbPath: '/fixture/sample-' + index + '-reference-' + referenceIndex + '.rgb'}))};
    processes.push(
      observedProcess('source-frame-extract', ffmpeg,
        buildPresentationNativeFrameExtractionArgumentsV001('/fixture/base.mp4', sample.frame, sample.baseFrame.path)),
      observedProcess('completed-frame-extract', ffmpeg,
        buildPresentationNativeFrameExtractionArgumentsV001('/fixture/completed.mp4', sample.frame, sample.completedFrame.path)),
      observedProcess('completed-rgb-crop', magick, [sample.completedFrame.path, '-crop', '2x2+0+0',
        '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], expectedRgb),
      observedProcess('native-reference-composite', ffmpeg,
        buildPresentationNativeReferenceArgumentsV001({sample, sceneBindings: recipe.sceneBindings,
          baseFramePath: sample.baseFrame.path, outputPaths: sample.references.map(row => row.rgbPath)})));
    outputArtifacts.push(sample.baseFrame, sample.completedFrame, sample.completedRgb,
      ...sample.references.map(row => ({path: row.rgbPath, fileSha256: row.rgbSha256})));
    samples.push(sample);
  }
  const common = {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
    baselinePlan, autoPresentation, sceneBindings: recipe.sceneBindings, inputManifest};
  const finite = {...common, samples, processes, executableVersions, outputArtifacts};
  const inspections = records.map(record => ({...clone(record.inspection),
    visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
    representativeFrame: samples.find(row => row.instructionId === record.element.instructionId).frame,
    nativeFrameQc: {...clone(common), instructionId: record.element.instructionId,
      samples: clone(samples.filter(row => row.instructionId === record.element.instructionId))}}));
  return {plan, finite, inspections};
}

test('旧方式の二字幕・全検査点・実行順・生成物が自己整合する小型証拠を受理する', () => {
  const value = fixture(), before = clone(value);
  assert.equal(validatePresentationNativeFrameQcScopeV001({plan: value.plan, evidence: value.finite}), true);
  for (const inspection of value.inspections) assert.equal(validatePresentationNativeFrameQcEvidenceV001({
    plan: value.plan, inspection}).status, 'passed');
  assert.equal(checkFiniteExecutionEvidence(value.finite, value.inspections), undefined);
  assert.deepEqual(value, before);
});

test('旧方式の実行記録が空・不足・余分なら保存された成功を信用せず拒否する', () => {
  for (const mutate of [
    value => {value.finite.processes = [];},
    value => {value.finite.processes.pop();},
    value => {value.finite.processes.push(clone(value.finite.processes[0]));},
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => checkFiniteExecutionEvidence(value.finite, value.inspections), /version|process/u);
  }
});

test('字幕検査が空・不足・重複なら全体の観測を通過させない', () => {
  for (const mutate of [
    value => {value.inspections = [];},
    value => {value.inspections.pop();},
    value => {value.inspections[1] = clone(value.inspections[0]);},
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => checkFiniteExecutionEvidence(value.finite, value.inspections), /global finite-state observations/u);
  }
});

test('検査点の順序だけを変えた場合も字幕側を合わせて変えた場合も実行順の不一致を拒否する', () => {
  const reordered = fixture(); reordered.finite.samples.reverse();
  assert.throws(() => checkFiniteExecutionEvidence(reordered.finite, reordered.inspections), /global finite-state observations/u);
  const matchedLocal = fixture(); matchedLocal.finite.samples.reverse(); matchedLocal.inspections.reverse();
  assert.throws(() => checkFiniteExecutionEvidence(matchedLocal.finite, matchedLocal.inspections), /process does not bind/u);
});

test('実行先・引数・切り出しRGB・終了結果の改変を拒否する', () => {
  for (const mutate of [
    value => {value.finite.processes[2].command = '/fixture/foreign-ffmpeg';},
    value => {
      value.finite.processes[2].args = ['-version'];
      value.finite.processes[2].argumentsCanonicalSha256 = hashJson(['-version']);
    },
    value => {value.finite.processes[4].stdoutSha256 = hash('foreign RGB');},
    value => {value.finite.processes[2].code = 1;},
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => checkFiniteExecutionEvidence(value.finite, value.inspections), /process does not bind/u);
  }
});

test('記録された生成物が欠落・重複・別内容なら完全性検査を通過させない', () => {
  for (const mutate of [
    value => {value.finite.outputArtifacts.pop();},
    value => {value.finite.outputArtifacts.push(clone(value.finite.outputArtifacts[0]));},
    value => {value.finite.outputArtifacts.at(-1).fileSha256 = hash('foreign artifact');},
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => checkFiniteExecutionEvidence(value.finite, value.inspections), /output artifacts/u);
  }
});

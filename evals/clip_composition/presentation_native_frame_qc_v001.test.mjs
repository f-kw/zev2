import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V007, fixAutoPresentationProposalV001,
  resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {buildPresentationNativeQcAlternativeElementsV001} from './presentation_native_frame_qc_preparation_v001.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  buildPresentationNativeFrameQcRecipeV001, classifyPresentationNativeFrameRgbV001,
  validatePresentationNativeFrameQcEvidenceV001} from './presentation_native_frame_qc_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const clone = value => structuredClone(value);
const ref = role => ({role, path: '/fixture/' + role, fileSha256: hash(role)});

function fixture({overlap = false, partialWhole = false, motion = null} = {}) {
  const texts = ['条件を残す', '急に来た', '説明をまとめる', '通常の字幕', 'マジで怖い'];
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, elements: texts.map((text, index) => ({
      instructionId: 'caption-' + index, kind: 'speech-caption', text,
      indexedLines: [{lineIndex: 0, text}], startFrame: overlap && index === 1 ? 0 : index * 90,
      endFrameExclusive: overlap && index === 1 ? 90 : (index + 1) * 90, displayFrameCount: 90,
      visualState: {textStyle: {fontAssetId: 'test-font', fontSizePx: 96, fontColor: '#FFFDF8',
        borderColor: '#111827', borderWidthPx: 8, glowWidthPx: 12},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0}, background: null},
    }))};
  const context = {baselineRef: {...ref('baseline-plan'), canonicalSha256: hashJson(baselinePlan)},
    decisionInputRef: ref('decision'), renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V007,
    pulseTimingEvidence: {schemaVersion: 'auto-presentation-pulse-timing-v001',
      sourceRef: ref('source'), candidatesRef: ref('candidates'), peaksRef: ref('peaks'),
      sampleRate: 300, sampleCount: 4500,
      candidates: [{candidateId: 'native-union', peakIds: ['central']}],
      peaks: [{peakId: 'central', startSample: 4050, endSampleExclusive: 4051, peakSample: 4050}]}};
  // Context file references omit the local bookkeeping role field.
  for (const key of ['baselineRef', 'decisionInputRef']) delete context[key].role;
  for (const key of ['sourceRef', 'candidatesRef', 'peaksRef']) delete context.pulseTimingEvidence[key].role;
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context, proposal: {
    schemaVersion: 'auto-presentation-proposal-v001', context,
    targetCaptionIds: baselinePlan.elements.map(row => row.instructionId), completion: 'complete', exceptions: [],
    effects: [
      {captionId: 'caption-0', role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption',
        targetText: partialWhole ? texts[0] : '条件'},
      {captionId: 'caption-1', role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'},
      {captionId: 'caption-2', role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'},
      ...(motion ? [{captionId: 'caption-3', role: motion === 'bounce' ? 'Bounce accent' : 'Shake accent',
        presentation: 'provisional-' + motion, scope: 'whole-caption'}] : []),
      {captionId: 'caption-4', role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId: 'central'},
    ],
  }});
  const autoPresentation = {context, autoProposal};
  const plan = resolveAutoPresentationV001({baselinePlan, ...autoPresentation}).plan;
  const propsFor = element => ({schemaVersion: 'presentation-renderer-overlay-props-v001',
    instructionId: element.instructionId, canvas: clone(plan.canvas), text: element.text,
    indexedLines: clone(element.indexedLines), visualState: clone(element.visualState), inspectionLineIndex: null,
    ...(element.presentationColorRange ? {presentationColorRange: clone(element.presentationColorRange)} : {})});
  const physical = (element, index) => {
    const props = propsFor(element), pngSha256 = hashJson(props);
    const left = 10 + index * 20, top = 10;
    const alphaBounds = {left, top, right: left + 8, bottom: top + 8, width: 8, height: 8};
    return {element: clone(element), props, fileStem: 'caption-' + index,
      pngPath: '/fixture/' + pngSha256 + '.png', pngSha256,
      inspection: {instructionId: element.instructionId, overlaySha256: pngSha256,
        appliedOverlayPropsCanonicalSha256: hashJson(props), alphaBounds}};
  };
  const alternatives = buildPresentationNativeQcAlternativeElementsV001({plan, baselinePlan, autoPresentation,
    presentationTimeline: null}).alternatives;
  const records = plan.elements.map((element, index) => {
    let record;
    if (element.presentationPulse) {
      const pulseStates = buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
        .map(row => ({...physical(row.element, index), state: row.state}));
      record = {...pulseStates[0], element: clone(element), pulseStates,
        inspection: {...pulseStates[0].inspection,
          pulse: {states: pulseStates.map(row => ({state: row.state, ...row.inspection}))}}};
    } else if (element.presentationMotion) {
      const motionStates = buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas})
        .map(row => ({...physical(row.element, index), state: row.state}));
      record = {...motionStates[0], element: clone(element), motionStates,
        inspection: {...motionStates[0].inspection,
          motion: {states: motionStates.map(row => ({state: row.state, ...row.inspection}))}}};
    } else record = physical(element, index);
    record.alternates = alternatives[index].entries.map(row => ({...physical(row.element, index), kind: row.kind}));
    return record;
  });
  return {plan, baselinePlan, autoPresentation, records};
}

test('the fixed recipe includes every caption and all three Pulse observations without caller-selected samples', () => {
  const f = fixture(), before = JSON.stringify(f);
  const result = buildPresentationNativeFrameQcRecipeV001(f);
  assert.equal(result.samples.length, 7);
  assert.deepEqual(result.samples.slice(0, 4).map(row => row.frame), [45, 135, 225, 315]);
  const program = getPresentationPulseProgramV001({element: f.plan.elements[4], canvas: f.plan.canvas});
  assert.deepEqual(result.samples.slice(4).map(row => [row.frame, row.expectedState]), [
    [program.normalBeforeFrame, 'normal'], [program.maximumFrame, 'maximum'], [program.normalAfterFrame, 'normal'],
  ]);
  assert.equal(JSON.stringify(f), before);
});

test('mandatory Color/Panel/Normal references and their drawing conditions cannot be silently omitted', () => {
  for (const [recordIndex, kind] of [[0, 'whole-color'], [1, 'normal'], [2, 'panel-plate-omitted'], [3, 'normal']]) {
    const f = fixture(); f.records[recordIndex].alternates = f.records[recordIndex].alternates.filter(row => row.kind !== kind);
    assert.throws(() => buildPresentationNativeFrameQcRecipeV001(f), /alternates|alternate/);
  }
  const plate = fixture();
  const missing = plate.records[2].alternates.find(row => row.kind === 'panel-plate-omitted');
  missing.element.visualState.background = null;
  assert.throws(() => buildPresentationNativeFrameQcRecipeV001(plate), /element/);
  const altered = fixture(); altered.records[0].props.text = '別の本文';
  assert.throws(() => buildPresentationNativeFrameQcRecipeV001(altered), /drawing properties/);
});

test('a partial selection that covers the whole caption still gets the resolver-required duplicate alternative', () => {
  const result = buildPresentationNativeFrameQcRecipeV001(fixture({partialWhole: true}));
  assert.ok(result.samples[0].references.some(row => row.id === 'alternate-whole-color'));
  const group = result.sceneBindings[0];
  assert.equal(group.states[0].pngSha256, group.alternates.find(row => row.kind === 'whole-color').pngSha256);
});

test('foreign references occupy the target clock and candidate bounds, not the inactive caption clock or corrupted frame bounds', () => {
  const f = fixture();
  const result = buildPresentationNativeFrameQcRecipeV001(f);
  const sample = result.samples[0];
  const addition = sample.references.find(row => row.id === 'add-caption-3-native-static');
  assert.equal(addition.layers.length, 2);
  assert.deepEqual(addition.layers[1], {slotCaptionId: 'caption-0', bindingId: 'caption-3-native-static',
    localFrame: 45, displayFrameCount: 90});
  assert.equal(sample.crop.left, 10);
  assert.equal(sample.crop.right, 98);
  assert.ok(sample.references.some(row => row.id === 'replace-caption-4-native-maximum'));
  assert.ok(!sample.references.some(row => row.id.startsWith('add-caption-0-')));
});

test('simultaneous captions retain their own fades and receive a real pair-order alternative', () => {
  const result = buildPresentationNativeFrameQcRecipeV001(fixture({overlap: true}));
  const sample = result.samples[0];
  const expected = sample.references.find(row => row.id === 'expected');
  const swapped = sample.references.find(row => row.id === 'swap-0-1');
  assert.deepEqual(swapped.layers, [...expected.layers].reverse());
  assert.ok(!sample.references.some(row => row.id === 'add-caption-1-native-static'));
});

test('exact pixel classes permit a Normal alias but reject target absence and an unequal-image tie', () => {
  const rgb = values => Buffer.from(values);
  const refs = [
    {id: 'expected', rgb: rgb([10, 10, 10])},
    {id: 'omitted', rgb: rgb([0, 0, 0])},
    {id: 'normal-alias', rgb: rgb([10, 10, 10])},
  ];
  const correct = classifyPresentationNativeFrameRgbV001({completedRgb: rgb([10, 10, 10]), references: refs});
  assert.equal(correct.visible, true); assert.equal(correct.classes.length, 2);
  assert.equal(classifyPresentationNativeFrameRgbV001({completedRgb: rgb([0, 0, 0]), references: refs}).visible, false);
  assert.equal(classifyPresentationNativeFrameRgbV001({completedRgb: rgb([5, 5, 5]), references: refs}).visible, false);
  const invisible = classifyPresentationNativeFrameRgbV001({completedRgb: rgb([10, 10, 10]), references: [
    {id: 'expected', rgb: rgb([10, 10, 10])}, {id: 'omitted', rgb: rgb([10, 10, 10])}]});
  assert.equal(invisible.visible, false);
});

test('whole-caption overpaint and foreign pixels need adversarial references even without empirical thresholds', () => {
  const expected = Buffer.from([255, 255, 0, 0, 0, 0]);
  const normal = Buffer.alloc(6);
  const whole = Buffer.from([255, 255, 0, 255, 255, 0]);
  const basic = [{id: 'expected', rgb: expected}, {id: 'omitted', rgb: normal}];
  assert.equal(classifyPresentationNativeFrameRgbV001({completedRgb: whole, references: basic}).visible, true);
  assert.equal(classifyPresentationNativeFrameRgbV001({completedRgb: whole,
    references: [...basic, {id: 'whole-color', rgb: whole}]}).visible, false);
  const foreign = Buffer.from([255, 255, 0, 50, 50, 50]);
  assert.equal(classifyPresentationNativeFrameRgbV001({completedRgb: foreign,
    references: [...basic, {id: 'foreign', rgb: foreign}]}).visible, false);
});

// This builds internally consistent synthetic evidence for pure validator
// rejection tests. It is not a claim of native drawing or media verification.
function syntheticEvidence(f) {
  const recipe = buildPresentationNativeFrameQcRecipeV001(f);
  const refs = [
    {...ref('plan'), canonicalSha256: hashJson(f.plan)},
    {...ref('baseline-plan'), canonicalSha256: hashJson(f.baselinePlan)},
    {...ref('auto-input'), canonicalSha256: hashJson(f.autoPresentation)},
    ...['base-media', 'completed-media', 'tool-ffmpeg', 'tool-imagemagick'].map(ref),
    ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({
      role: 'png-' + row.bindingId, path: row.pngPath, fileSha256: row.pngSha256})),
  ];
  const verified = refs.map(row => ({role: row.role, path: row.path, fileSha256: row.fileSha256}));
  const inputManifest = {planCanonicalSha256: hashJson(f.plan), baselinePlanCanonicalSha256: hashJson(f.baselinePlan),
    autoPresentationCanonicalSha256: hashJson(f.autoPresentation), inputRefs: refs,
    inputRefsCanonicalSha256: hashJson(refs), before: clone(verified), after: clone(verified)};
  const bindings = new Map(recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => [row.bindingId, row]));
  const samples = recipe.samples.map((sample, sampleIndex) => {
    const signatures = new Map();
    const references = sample.references.map(row => {
      const signature = canonicalJson(row.layers.map(layer => ({png: bindings.get(layer.bindingId).pngSha256,
        localFrame: layer.localFrame, displayFrameCount: layer.displayFrameCount})));
      if (!signatures.has(signature)) signatures.set(signature, signatures.size + 1);
      return {id: row.id, rgb: Buffer.alloc(sample.crop.width * sample.crop.height * 3, signatures.get(signature))};
    });
    const decision = classifyPresentationNativeFrameRgbV001({completedRgb: references[0].rgb, references});
    return {...sample, ...decision, baseFrame: {path: '/fixture/base-' + sample.frame + '.png', fileSha256: hash('base-' + sample.frame)},
      completedFrame: {path: '/fixture/completed-' + sample.frame + '.png', fileSha256: hash('completed-' + sample.frame)},
      completedRgb: {path: '/fixture/completed-' + sample.frame + '.rgb', fileSha256: hash(references[0].rgb)},
      completedRgbSha256: hash(references[0].rgb), references: sample.references.map((row, index) => ({...row,
        ...decision.references[index], rgbPath: '/fixture/reference-' + sampleIndex + '-' + index + '.rgb'}))};
  });
  return f.records.map(record => ({...clone(record.inspection),
    visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
    representativeFrame: record.element.presentationPulse
      ? getPresentationPulseProgramV001({element: record.element, canvas: f.plan.canvas}).maximumFrame
      : record.element.presentationMotion
        ? getPresentationCaptionMotionProgramV001({element: record.element, canvas: f.plan.canvas}).representativeFrame
        : record.element.startFrame + Math.floor(record.element.displayFrameCount / 2),
    nativeFrameQc: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
      instructionId: record.element.instructionId, baselinePlan: clone(f.baselinePlan), autoPresentation: clone(f.autoPresentation),
      sceneBindings: clone(recipe.sceneBindings), inputManifest: clone(inputManifest),
      samples: samples.filter(sample => sample.instructionId === record.element.instructionId)},
  }));
}

test('the pure validator accepts complete synthetic evidence and independently rejects material evidence tampering', () => {
  const f = fixture();
  const inspections = syntheticEvidence(f);
  for (const inspection of inspections) assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan, inspection}).status, 'passed');
  const mutations = [
    row => {row.nativeFrameQc.samples[0].frame++;},
    row => {row.nativeFrameQc.samples[0].crop.right++;},
    row => {row.nativeFrameQc.samples[0].references.pop();},
    row => {row.nativeFrameQc.samples[0].classes[0].absoluteRgbDifference = 0.5;},
    row => {row.nativeFrameQc.samples[0].classes[0].absoluteRgbDifference = -1;},
    row => {row.nativeFrameQc.samples[0].classes[0].absoluteRgbDifference = 999999999;},
    row => {row.nativeFrameQc.samples[0].visible = false;},
    row => {row.nativeFrameQc.samples[0].completedRgb.fileSha256 = hash('changed pixels');},
    row => {row.nativeFrameQc.inputManifest.after[0].fileSha256 = hash('changed');},
    row => {row.nativeFrameQc.sceneBindings[0].alternates.pop();},
    row => {row.nativeFrameQc.samples[0].references[0].layers[0].localFrame++;},
    row => {row.nativeFrameQc.samples[0].expectedOverlaySha256 = hash('wrong-state');},
    row => {row.nativeFrameQc.autoPresentation.autoProposal.proposal.effects[0].targetText = '残す';},
  ];
  for (const mutate of mutations) {
    const inspection = clone(inspections[0]); mutate(inspection);
    assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan, inspection}).status, 'failed');
  }
  const pulse = clone(inspections[4]); pulse.nativeFrameQc.samples.pop();
  assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan, inspection: pulse}).status, 'failed');
});

for (const [motion, offsets, representativeState] of [
  ['bounce', [0, 1, 2, 3, 4, 5, 6, 7, 8, 85], 'maximum'],
  ['shake', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 85], 'left-8'],
]) {
  test(motion + ' native recipe covers every entrance frame and stable visibility with every wrong state as an adversary', () => {
    const f = fixture({motion}), before = clone(f);
    const result = buildPresentationNativeFrameQcRecipeV001(f);
    const samples = result.samples.filter(row => row.instructionId === 'caption-3');
    assert.deepEqual(samples.map(row => row.frame - 270), offsets);
    assert.equal(samples.find(row => row.frame === 274).expectedState, representativeState);
    assert.equal(samples.at(-2).expectedState, 'stable');
    assert.equal(samples.at(-1).expectedState, 'stable');
    const states = f.records[3].motionStates;
    for (const sample of samples) {
      assert.equal(sample.references.filter(row => row.kind === 'motion-state').length, states.length - 1);
      assert.equal(sample.expectedOverlaySha256, states.find(row => row.state === sample.expectedState).pngSha256);
      assert.equal(sample.references[0].layers[0].localFrame, sample.frame - 270);
    }
    assert.deepEqual(f, before);
  });

  test(motion + ' rejects a missing, reordered or mixed native state set and missing entrance/stable observations', () => {
    for (const mutate of [
      f => {f.records[3].motionStates.pop();},
      f => {f.records[3].motionStates.reverse();},
      f => {f.records[3].motionStates[1].element.text = '別の字幕';},
      f => {f.records[3].pulseStates = [];},
      f => {f.records[2].motionStates = [];},
    ]) {const f = fixture({motion}); mutate(f); assert.throws(() => buildPresentationNativeFrameQcRecipeV001(f));}
    const f = fixture({motion}), inspection = syntheticEvidence(f)[3];
    assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan, inspection}).status, 'passed');
    for (const mutate of [
      row => {row.nativeFrameQc.samples.splice(2, 1);},
      row => {row.nativeFrameQc.samples.pop();},
      row => {row.nativeFrameQc.samples[4].expectedState = 'stable';},
      row => {row.motion.states[1].overlaySha256 = hash('different-motion-png');},
      row => {row.representativeFrame = 315;},
      row => {row.nativeFrameQc.sceneBindings[3].states.reverse();},
    ]) {const changed = clone(inspection); mutate(changed);
      assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan, inspection: changed}).status, 'failed');}
  });
}

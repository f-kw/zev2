import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  buildPresentationNativeQcAlternativeElementsV001, preparePresentationNativeFrameQcV001,
} from './presentation_native_frame_qc_preparation_v001.mjs';

import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
function fixture(baselinePath = '/fixture/normal.json', withPulse = false, motion = null) {
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, elements:
      ['条件を残す', '急に来た', '説明をまとめる', '通常の字幕'].map((text, index) => ({
        instructionId: `caption-${index + 1}`, kind: 'speech-caption', text,
        indexedLines: [{lineIndex: 0, text, sourceUnitIds: [`source-${index}`]}],
        startFrame: index * 60, endFrameExclusive: index * 60 + 45, displayFrameCount: 45,
        sourceMapping: {startMs: 10000 + index * 2000, endMs: 11500 + index * 2000},
        visualState: {textStyle: {fontAssetId: 'native-test-font', fontSizePx: 96, fontColor: '#FFFDF8',
          borderColor: '#111827', borderWidthPx: 8, glowColor: '#000000', glowWidthPx: 12,
          glowOpacityPercent: 82, lineSpacingPercent: 150},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6},
        background: null, transitionId: 'quick-fade-4f-v001'}}
      ))};
  const bytes = `${JSON.stringify(baselinePlan, null, 2)}\n`;
  const context = {baselineRef: {path: baselinePath, fileSha256: hash(bytes),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: '/fixture/input.json', fileSha256: hash('input')},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
  if (withPulse) {
    const ref = name => ({path: `/fixture/${name}`, fileSha256: hash(name)});
    context.pulseTimingEvidence = {schemaVersion: 'auto-presentation-pulse-timing-v001',
      sourceRef: ref('source'), candidatesRef: ref('candidates'), peaksRef: ref('peaks'),
      sampleRate: 300, sampleCount: 3000,
      candidates: [{candidateId: 'native-candidate', peakIds: ['native-peak']}],
      peaks: [{peakId: 'native-peak', startSample: 200, endSampleExclusive: 201, peakSample: 200}]};
  }
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context, proposal: {
    schemaVersion: 'auto-presentation-proposal-v001', context,
    targetCaptionIds: baselinePlan.elements.map(element => element.instructionId), completion: 'complete',
    effects: [
      motion ? {captionId: 'caption-1', role: motion === 'bounce' ? 'Bounce accent' : 'Shake accent',
        presentation: 'provisional-' + motion, scope: 'whole-caption'}
        : withPulse ? {captionId: 'caption-1', role: 'Pulse accent', presentation: 'provisional-pulse',
        scope: 'whole-caption', anchorPeakId: 'native-peak'}
        : {captionId: 'caption-1', role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: '条件'},
      {captionId: 'caption-2', role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'},
      {captionId: 'caption-3', role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'},
    ], exceptions: [],
  }});
  const autoPresentation = {context, autoProposal};
  const plan = resolveAutoPresentationV001({baselinePlan, ...autoPresentation}).plan;
  return {baselinePlan, bytes, plan, autoPresentation, presentationTimeline: null};
}

test('diagnostic alternatives retain the saved decisions and distinguish partial-color overpaint, plate loss and absent scale', () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = buildPresentationNativeQcAlternativeElementsV001(input);
  assert.deepEqual(result.alternatives.map(row => row.entries.map(entry => entry.kind)), [
    ['normal', 'whole-color'], ['normal'], ['normal', 'panel-plate-omitted'], ['normal'],
  ]);
  assert.equal(result.alternatives[0].entries[1].element.presentationColorRange.startCodePoint, 0);
  assert.equal(result.alternatives[0].entries[1].element.presentationColorRange.endCodePointExclusive,
    Array.from(input.baselinePlan.elements[0].text).length);
  assert.equal(result.alternatives[1].entries[0].element.visualState.textStyle.fontSizePx, 96);
  assert.equal(input.plan.elements[1].visualState.textStyle.fontSizePx, 128);
  const expectedPlateLoss = clone(input.plan.elements[2]);
  expectedPlateLoss.visualState.background.color = 'transparent';
  expectedPlateLoss.visualState.background.inspectionPlateOmitted = true;
  assert.deepEqual(result.alternatives[2].entries[1].element, expectedPlateLoss);
  assert.equal(result.alternatives[2].entries[1].element.visualState.background.paddingXPx, 24);
  assert.equal(result.alternatives[2].entries[1].element.visualState.background.paddingYPx, 16);
  assert.equal(JSON.stringify(input), before);
});

test('an altered current plan cannot nominate its own expected reference', () => {
  const input = fixture();
  input.plan.elements[0].text = '書き換えた本文';
  assert.throws(() => buildPresentationNativeQcAlternativeElementsV001(input), /resolved plan differs/);
});

test('unsupported timelines and positions require an explicit encoded oracle, with no fast fallback', () => {
  const input = fixture();
  assert.throws(() => buildPresentationNativeQcAlternativeElementsV001({...input, presentationTimeline: {}}), /encoded oracle explicitly/);
  const changed = clone(input); changed.plan.elements[0].visualState.position.preset = 'top-band';
  assert.throws(() => buildPresentationNativeQcAlternativeElementsV001(changed), /bottom-center/);
  assert.throws(() => buildPresentationNativeQcAlternativeElementsV001({...input, autoPresentation: undefined}), /bound automatic/);
});

// These IO tests exercise binding/immutability, not pixel quality. Native-font
// drawing and real failure injection are covered by the separate native suite.
async function ioFixture(t, withPulse = false, motion = null) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-native-qc-prep-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const input = fixture(path.join(directory, 'baseline.json'), withPulse, motion);
  await writeFile(input.autoPresentation.context.baselineRef.path, input.bytes);
  const calls = [];
  const propsFor = element => ({instructionId: element.instructionId, text: element.text,
    visualState: clone(element.visualState), ...(element.presentationColorRange
      ? {presentationColorRange: clone(element.presentationColorRange)} : {})});
  const inspectionFor = (props, digest) => ({alphaBounds: {left: 20, top: 20, right: 80, bottom: 60, width: 60, height: 40},
    overlaySha256: digest, appliedOverlayPropsCanonicalSha256: sha256AutoPresentationV001(props)});
  const records = [];
  for (const [index, element] of input.plan.elements.entries()) {
    const physical = [];
    const expected = element.presentationMotion
      ? buildPresentationCaptionMotionStateElementsV001({element, canvas: input.plan.canvas})
      : [{state: 'static', element}];
    for (const row of expected) {
      const props = propsFor(row.element), bytes = Buffer.from(JSON.stringify(props));
      const pngPath = path.join(directory, `production-${index}-${row.state}.png`);
      await writeFile(pngPath, bytes);
      physical.push({state: row.state, element: clone(row.element), props, pngPath,
        pngSha256: hash(bytes), inspection: inspectionFor(props, hash(bytes))});
    }
    records.push({...physical[0], element: clone(element), fileStem: `caption-${index}`,
      ...(element.presentationMotion ? {motionStates: physical} : {})});
  }
  const options = {...input, records, presetRegistry: {version: 'test'},
    scratchDirectory: path.join(directory, 'qc-only'),
    overlayAdapter: {buildProps: propsFor,
      renderStill: async (props, output) => {calls.push({props: clone(props), output});
        await writeFile(output, JSON.stringify(props), {flag: 'wx'});}},
    inspectPng: async args => {
      const props = JSON.parse(await readFile(args.pngPath, 'utf8'));
      return {...inspectionFor(props, hash(await readFile(args.pngPath))), ...args};
    }};
  return {input, options, calls, directory};
}

test('reference preparation binds source bytes, renders diagnostic states twice and reuses only the identical normal state', async t => {
  const {input, options, calls} = await ioFixture(t);
  const before = JSON.stringify({input, records: options.records});
  const prepared = await preparePresentationNativeFrameQcV001(options);
  assert.equal(prepared.evidence.renderedDiagnosticStates, 5);
  assert.equal(prepared.evidence.renderedDiagnosticPngs, 10);
  assert.equal(prepared.evidence.reusedDiagnosticStates, 1);
  assert.equal(calls.length, 10);
  assert.equal(JSON.stringify({input, records: options.records}), before);
  assert.equal(prepared.records[3].alternates[0].pngPath, options.records[3].pngPath);
  assert.equal(prepared.provenance.inputRefs.find(ref => ref.role === 'baseline-plan').fileSha256,
    input.autoPresentation.context.baselineRef.fileSha256);
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /EEXIST/);
});

test('changed baseline bytes are rejected before any diagnostic draw', async t => {
  const {options, calls} = await ioFixture(t);
  await writeFile(options.autoPresentation.context.baselineRef.path, 'changed');
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /normal plan bytes changed/);
  assert.equal(calls.length, 0);
});

test('a native adapter that mutates the expected properties is rejected', async t => {
  const {options} = await ioFixture(t);
  const render = options.overlayAdapter.renderStill;
  options.overlayAdapter.renderStill = async (props, output) => {
    props.text = 'fault-injected mutation'; await render(props, output);
  };
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /changed diagnostic drawing properties/);
});

test('changed production PNG bytes cannot be treated as normal-state reuse', async t => {
  const {options, calls} = await ioFixture(t);
  await writeFile(options.records[3].pngPath, 'wrong image');
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /native input PNG bytes changed/);
  assert.equal(calls.length, 0);
});

test('diagnostic PNG modification during inspection is rejected before preparation succeeds', async t => {
  const {options} = await ioFixture(t);
  const inspect = options.inspectPng;
  options.inspectPng = async args => {
    const result = await inspect(args);
    await writeFile(args.pngPath, 'changed after binding');
    return result;
  };
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /fixed input changed/);
});

test('saved expected plan modification during drawing is rejected before preparation succeeds', async t => {
  const {options} = await ioFixture(t);
  const draw = options.overlayAdapter.renderStill;
  options.overlayAdapter.renderStill = async (props, output) => {
    await draw(props, output);
    await writeFile(path.join(options.scratchDirectory, 'plan.json'), 'changed expected plan');
  };
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /fixed input changed/);
});

test('Pulse evidence cannot disappear from records while the fixed plan still requires it', async t => {
  const {options, calls} = await ioFixture(t, true);
  assert(options.plan.elements[0].presentationPulse);
  assert.equal(Object.hasOwn(options.records[0], 'pulseStates'), false);
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /Pulse native states differ/);
  assert.equal(calls.length, 0);
});

test('ordinary records cannot acquire an unrequested Pulse state array', async t => {
  const {options, calls} = await ioFixture(t);
  options.records[0].pulseStates = [];
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /non-Pulse record has unexpected/);
  assert.equal(calls.length, 0);
});

for (const motion of ['bounce', 'shake']) {
  test(motion + ' preparation binds every production PNG and reuses the exact stable caption without new diagnostic drawing', async t => {
    const {options, calls} = await ioFixture(t, false, motion);
    const before = clone(options.records);
    const result = await preparePresentationNativeFrameQcV001(options);
    assert.deepEqual(options.records, before);
    assert.equal(result.evidence.productionNativeInputs.length, motion === 'bounce' ? 9 : 10);
    assert.equal(result.evidence.renderedDiagnosticStates, 3);
    assert.equal(result.evidence.reusedDiagnosticStates, 2);
    assert.equal(calls.length, 6);
    assert.equal(result.records[0].alternates[0].pngPath, options.records[0].motionStates[0].pngPath);
  });
  test(motion + ' preparation rejects omitted states and altered production bytes before drawing', async t => {
    const missing = await ioFixture(t, false, motion);
    missing.options.records[0].motionStates.pop();
    await assert.rejects(preparePresentationNativeFrameQcV001(missing.options), /motion native states differ/);
    assert.equal(missing.calls.length, 0);
    const altered = await ioFixture(t, false, motion);
    await writeFile(altered.options.records[0].motionStates[1].pngPath, 'changed state image');
    await assert.rejects(preparePresentationNativeFrameQcV001(altered.options), /native input PNG bytes changed/);
    assert.equal(altered.calls.length, 0);
  });
}

test('ordinary records cannot acquire an unrequested motion state array', async t => {
  const {options, calls} = await ioFixture(t);
  options.records[0].motionStates = [];
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /non-motion record has unexpected/);
  assert.equal(calls.length, 0);
});

// Calibration transport tests retain the existing synthetic IO adapter. They
// verify evidence/geometry bindings, not native pixels or human appearance.
async function calibratedIoFixture(t) {
  const fixture = await ioFixture(t);
  const record = fixture.options.records[2];
  const uncorrectedProps = clone(record.props);
  const maskPath = path.join(fixture.directory, 'panel-calibration-line-0.png');
  const maskBytes = JSON.stringify({...uncorrectedProps, inspectionLineIndex: 0});
  await writeFile(maskPath, maskBytes);
  record.visibleCenterCalibration = {
    schemaVersion: 'presentation-visible-center-calibration-v001',
    uncorrectedPropsCanonicalSha256: sha256AutoPresentationV001(uncorrectedProps),
    containerBounds: {left: 0, top: 0, right: 110, bottom: 86},
    lineMasks: [{lineIndex: 0, pngPath: maskPath, pngSha256: hash(maskBytes),
      alphaBounds: {left: 20, top: 20, right: 80, bottom: 60, width: 60, height: 40}}],
  };
  // The visible line centre is (50, 40); the container centre is (55, 43).
  record.props.renderVisibleCenterCorrectionPx = [{x: 5, y: 3}];
  await syncSyntheticProductionRecord(record);
  // This represents an independent layout observation. It intentionally does
  // not read the caller's calibration box or corrected production properties.
  const fixedLayout = fixture.options.records.map(row => ({instructionId: row.element.instructionId,
    wrapper: {left: 0, top: 0, width: 110, height: 86}}));
  const layoutCalls = [];
  fixture.options.inspectLayout = async overlays => {
    assert(Array.isArray(overlays)); layoutCalls.push(clone(overlays));
    return {status: 'passed', violations: [], items: overlays.map(props => {
      const item = fixedLayout.find(row => row.instructionId === props.instructionId);
      assert(item); return clone(item);
    })};
  };
  return {...fixture, record, uncorrectedProps, maskPath, layoutCalls};
}
async function syncSyntheticProductionRecord(record) {
  const pngBytes = JSON.stringify(record.props);
  await writeFile(record.pngPath, pngBytes);
  record.pngSha256 = hash(pngBytes);
  record.inspection.overlaySha256 = record.pngSha256;
  record.inspection.appliedOverlayPropsCanonicalSha256 = sha256AutoPresentationV001(record.props);
}

test('verified Panel centering calibration is reobserved and retained when only diagnostic plate paint is removed', async t => {
  const {options, record, calls, maskPath, layoutCalls, uncorrectedProps} = await calibratedIoFixture(t);
  const before = clone(options.records);
  const observed = [], inspect = options.inspectPng;
  options.inspectPng = async args => {observed.push(args.pngPath); return inspect(args);};
  const prepared = await preparePresentationNativeFrameQcV001(options);
  assert.deepEqual(options.records, before);
  assert.deepEqual(layoutCalls, [[uncorrectedProps]]);
  assert(observed.includes(maskPath));
  const bound = prepared.provenance.inputRefs.find(ref => ref.role === `visible-center-calibration:${record.fileStem}:static:0`);
  assert.equal(bound.path, maskPath);
  assert.equal(bound.fileSha256, record.visibleCenterCalibration.lineMasks[0].pngSha256);
  const alternate = prepared.records[2].alternates.find(row => row.kind === 'panel-plate-omitted');
  assert.deepEqual(alternate.props.renderVisibleCenterCorrectionPx, [{x: 5, y: 3}]);
  assert.equal(alternate.props.visualState.background.inspectionPlateOmitted, true);
  assert.equal(alternate.props.visualState.background.color, 'transparent');
  const {color, inspectionPlateOmitted, ...geometry} = alternate.props.visualState.background;
  assert.deepEqual(geometry, Object.fromEntries(Object.entries(record.props.visualState.background).filter(([key]) => key !== 'color')));
  assert.equal(prepared.records[2].alternates.find(row => row.kind === 'normal').props.renderVisibleCenterCorrectionPx, undefined);
  assert.equal(calls.filter(row => row.props.visualState.background?.inspectionPlateOmitted).length, 2);
});

test('changed centering correction is rejected even if production PNG and inspection hashes match the changed props', async t => {
  const {options, record, calls} = await calibratedIoFixture(t);
  record.props.renderVisibleCenterCorrectionPx[0].x = 6;
  await syncSyntheticProductionRecord(record);
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /native input drawing conditions differ/);
  assert.equal(calls.length, 0);
});

test('missing, replaced or wrongly hashed calibration mask is rejected before diagnostic drawing', async t => {
  const missing = await calibratedIoFixture(t);
  missing.record.visibleCenterCalibration.lineMasks[0].pngPath = path.join(missing.directory, 'missing-mask.png');
  await assert.rejects(preparePresentationNativeFrameQcV001(missing.options), {code: 'ENOENT'});
  assert.equal(missing.calls.length, 0);
  const replaced = await calibratedIoFixture(t);
  await writeFile(replaced.maskPath, JSON.stringify({wrong: 'calibration image'}));
  await assert.rejects(preparePresentationNativeFrameQcV001(replaced.options), /calibration PNG bytes changed/);
  assert.equal(replaced.calls.length, 0);
  const wronglyHashed = await calibratedIoFixture(t);
  wronglyHashed.record.visibleCenterCalibration.lineMasks[0].pngSha256 = hash('different bytes');
  await assert.rejects(preparePresentationNativeFrameQcV001(wronglyHashed.options), /calibration PNG bytes changed/);
  assert.equal(wronglyHashed.calls.length, 0);
});

test('calibration for other uncorrected props and invented observed bounds cannot authorize correction', async t => {
  const otherProps = await calibratedIoFixture(t);
  otherProps.record.visibleCenterCalibration.uncorrectedPropsCanonicalSha256 = hash('different original props');
  await assert.rejects(preparePresentationNativeFrameQcV001(otherProps.options), /calibration binding differs/);
  assert.equal(otherProps.calls.length, 0);
  const inventedBounds = await calibratedIoFixture(t);
  inventedBounds.record.visibleCenterCalibration.lineMasks[0].alphaBounds.left = 21;
  inventedBounds.record.visibleCenterCalibration.lineMasks[0].alphaBounds.width = 59;
  await assert.rejects(preparePresentationNativeFrameQcV001(inventedBounds.options), /calibration pixels differ/);
  assert.equal(inventedBounds.calls.length, 0);
});

test('calibration is neither optional for corrected props nor allowed without correction or on ordinary captions', async t => {
  const missing = await calibratedIoFixture(t);
  delete missing.record.visibleCenterCalibration;
  await assert.rejects(preparePresentationNativeFrameQcV001(missing.options), /calibration binding differs/);
  assert.equal(missing.calls.length, 0);
  const unexpected = await calibratedIoFixture(t);
  delete unexpected.record.props.renderVisibleCenterCorrectionPx;
  await syncSyntheticProductionRecord(unexpected.record);
  await assert.rejects(preparePresentationNativeFrameQcV001(unexpected.options), /unexpected visible center calibration/);
  assert.equal(unexpected.calls.length, 0);
  const ordinary = await calibratedIoFixture(t);
  ordinary.options.records[3].props.renderVisibleCenterCorrectionPx = [{x: 5, y: 3}];
  ordinary.options.records[3].visibleCenterCalibration = clone(ordinary.record.visibleCenterCalibration);
  ordinary.options.records[3].visibleCenterCalibration.uncorrectedPropsCanonicalSha256 = sha256AutoPresentationV001(
    ordinary.options.overlayAdapter.buildProps(ordinary.options.records[3].element));
  await syncSyntheticProductionRecord(ordinary.options.records[3]);
  await assert.rejects(preparePresentationNativeFrameQcV001(ordinary.options), /calibration binding differs/);
  assert.equal(ordinary.calls.length, 0);
});

test('centering container cannot move in lockstep with correction and matching production hashes', async t => {
  const {options, record, calls} = await calibratedIoFixture(t);
  record.visibleCenterCalibration.containerBounds.left += 10;
  record.visibleCenterCalibration.containerBounds.right += 10;
  record.props.renderVisibleCenterCorrectionPx[0].x += 10;
  await syncSyntheticProductionRecord(record);
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /calibration.*container|wrapper|layout/i);
  assert.equal(calls.length, 0);
});

test('corrected captions require independent layout observation with no self-declared-container fallback', async t => {
  const {options, calls} = await calibratedIoFixture(t);
  delete options.inspectLayout;
  await assert.rejects(preparePresentationNativeFrameQcV001(options), /layout/i);
  assert.equal(calls.length, 0);
});

test('failed, incomplete, misidentified or geometrically different layout observations reject calibration', async t => {
  const mutations = [
    result => {result.status = 'failed';},
    result => {result.items = [];},
    result => {result.items[0].instructionId = 'another-caption';},
    result => {delete result.items[0].wrapper;},
    result => {result.items[0].wrapper.width += 2;},
  ];
  for (const mutate of mutations) {
    const {options, calls} = await calibratedIoFixture(t);
    const inspect = options.inspectLayout;
    options.inspectLayout = async overlays => {const result = await inspect(overlays); mutate(result); return result;};
    await assert.rejects(preparePresentationNativeFrameQcV001(options), /layout/i);
    assert.equal(calls.length, 0);
  }
});

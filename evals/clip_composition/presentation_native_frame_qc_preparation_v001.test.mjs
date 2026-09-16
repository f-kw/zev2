import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V006, fixAutoPresentationProposalV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  buildPresentationNativeQcAlternativeElementsV001, preparePresentationNativeFrameQcV001,
} from './presentation_native_frame_qc_preparation_v001.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
function fixture(baselinePath = '/fixture/normal.json', withPulse = false) {
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
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V006, pulseTimingEvidence: null};
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
      withPulse ? {captionId: 'caption-1', role: 'Pulse accent', presentation: 'provisional-pulse',
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
async function ioFixture(t, withPulse = false) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-native-qc-prep-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const input = fixture(path.join(directory, 'baseline.json'), withPulse);
  await writeFile(input.autoPresentation.context.baselineRef.path, input.bytes);
  const calls = [];
  const propsFor = element => ({instructionId: element.instructionId, text: element.text,
    visualState: clone(element.visualState), ...(element.presentationColorRange
      ? {presentationColorRange: clone(element.presentationColorRange)} : {})});
  const inspectionFor = (props, digest) => ({alphaBounds: {left: 20, top: 20, right: 80, bottom: 60, width: 60, height: 40},
    overlaySha256: digest, appliedOverlayPropsCanonicalSha256: sha256AutoPresentationV001(props)});
  const records = [];
  for (const [index, element] of input.plan.elements.entries()) {
    const props = propsFor(element), bytes = Buffer.from(JSON.stringify(props));
    const pngPath = path.join(directory, `production-${index}.png`);
    await writeFile(pngPath, bytes);
    records.push({element: clone(element), props, fileStem: `caption-${index}`, pngPath,
      pngSha256: hash(bytes), inspection: inspectionFor(props, hash(bytes))});
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

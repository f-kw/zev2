import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationCompositeArgumentsV001, buildPresentationFrameExtractionArgumentsV001}
  from './render_presentation_v002.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001}
  from './presentation_pulse_v001.mjs';
import {presentationPulseAlphaUnionV001} from './presentation_pulse_renderer_qc_v001.mjs';
import {PRESENTATION_ENCODED_OMISSION_QC_SCHEMA_V002, PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002,
  PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002, buildPresentationEncodedOmissionArgumentsV002,
  validatePresentationEncodedOmissionQcEvidenceV002} from './presentation_encoded_omission_qc_v002.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const clone = value => structuredClone(value);

function fixture({pulse = true} = {}) {
  const plan = {canvas: {width: 1920, height: 1080, fps: 30},
    elements: ['caption-a', 'caption-b', 'caption-c'].map((id, index) => ({
      kind: 'speech-caption', instructionId: id, text: '字幕' + index,
      startFrame: 0, endFrameExclusive: 90, displayFrameCount: 90,
      visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'},
        position: {preset: 'bottom-center'}},
      ...(pulse && index === 1 ? {presentationPulse: {
        presentation: 'provisional-pulse', anchorPeakId: 'actual-peak', anchorFrame: 45,
      }} : {}),
    }))};
  const physical = (element, index) => {
    const props = {instructionId: element.instructionId, text: element.text,
      visualState: clone(element.visualState), canvas: clone(plan.canvas)};
    const pngSha256 = hashJson(props), size = element.visualState.textStyle.fontSizePx;
    return {element: clone(element), props, pngPath: '/fixture/' + pngSha256 + '.png',
      pngSha256, fileStem: 'caption-' + index,
      inspection: {instructionId: element.instructionId, overlaySha256: pngSha256,
        appliedOverlayPropsCanonicalSha256: hashJson(props),
        alphaBounds: {left: 100, top: 100, right: 100 + size, bottom: 100 + size, width: size, height: size}}};
  };
  const records = plan.elements.map((element, index) => {
    if (!element.presentationPulse) return physical(element, index);
    const pulseStates = buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
      .map(state => ({...physical(state.element, index), state: state.state}));
    return {...pulseStates[0], element: clone(element), pulseStates,
      inspection: {...pulseStates[0].inspection, pulse: {
        states: pulseStates.map(state => ({state: state.state, ...clone(state.inspection)})),
      }}};
  });
  return {plan, records, baseMediaPath: '/fixture/base.mp4', expectedFrameCount: 90,
    serializePngAndFilters: true, presentationTimeline: null, timelineAudio: null};
}

test('logical removal drops the entire Pulse record while preserving survivors, order, fades and encoder arguments', () => {
  const f = fixture(), before = JSON.stringify(f);
  const result = buildPresentationEncodedOmissionArgumentsV002({...f, instructionId: 'caption-b'});
  assert.deepEqual(result.retainedInstructionIds, ['caption-a', 'caption-c']);
  assert.deepEqual(result.compositeArguments, buildPresentationCompositeArgumentsV001({
    ...f, overlayRecords: [f.records[0], f.records[2]],
  }));
  for (const state of f.records[1].pulseStates) assert.ok(!result.compositeArguments.includes(state.pngPath));
  assert.equal(result.representativeFrame, 45);
  assert.deepEqual(result.bounds, presentationPulseAlphaUnionV001(f.records[1].pulseStates));
  assert.equal(JSON.stringify(f), before);
});

test('removing a static caption retains the complete unchanged Pulse program and timeline/audio graph', () => {
  const f = fixture();
  f.presentationTimeline = {spans: [
    {kind: 'base', startFrame: 0, endFrameExclusive: 20, baseStartFrame: 0, baseEndFrame: 20},
    {kind: 'black', startFrame: 20, endFrameExclusive: 30},
    {kind: 'base', startFrame: 30, endFrameExclusive: 90, baseStartFrame: 20, baseEndFrame: 80},
  ]};
  f.timelineAudio = {sampleRate: 48000, channelLayout: 'mono'};
  const before = JSON.stringify(f);
  const result = buildPresentationEncodedOmissionArgumentsV002({...f, instructionId: 'caption-a'});
  assert.deepEqual(result.compositeArguments, buildPresentationCompositeArgumentsV001({
    ...f, overlayRecords: f.records.slice(1),
  }));
  for (const state of f.records[1].pulseStates) assert.ok(result.compositeArguments.includes(state.pngPath));
  const graph = result.compositeArguments[result.compositeArguments.indexOf('-filter_complex') + 1];
  assert.match(graph, /concat=n=9:v=1:a=0/);
  assert.match(graph, /atrim=start_sample=32000:end_sample=128000/);
  assert.ok(result.compositeArguments.includes('[timelineAudio]'));
  assert.equal(JSON.stringify(f), before);
});

test('a single-caption omission uses the original base-only encoder path and never a transparent replacement PNG', async () => {
  const legacy = await readFile(new URL('./fixtures/qc/legacy-transparent-monob-v001.png', import.meta.url));
  assert.equal(legacy.length, 573);
  assert.equal(hash(legacy), 'b0171cce71fa3cc0c92f1636a53b82b5bb15d31e165e24f1607b4a753db5f32b');
  const f = fixture({pulse: false});
  f.plan.elements = f.plan.elements.slice(0, 1); f.records = f.records.slice(0, 1);
  const result = buildPresentationEncodedOmissionArgumentsV002({...f, instructionId: 'caption-a'});
  assert.deepEqual(result.retainedInstructionIds, []);
  assert.deepEqual(result.compositeArguments, buildPresentationCompositeArgumentsV001({...f, overlayRecords: []}));
  assert.deepEqual(result.compositeArguments.filter((arg, index, args) => args[index - 1] === '-i'), [f.baseMediaPath]);
  assert.ok(!result.compositeArguments.includes(f.records[0].pngPath));
  assert.ok(!result.compositeArguments.some(arg => /transparent|monob/.test(arg)));
  assert.equal(result.compositeArguments[result.compositeArguments.indexOf('-filter_complex') + 1],
    '[0:v]fps=30,format=yuv420p[video]');
});

test('duplicate IDs, wrong record order, changed elements/properties and missing targets are rejected without mutation', () => {
  const mutations = [
    f => { f.plan.elements[1].instructionId = f.plan.elements[0].instructionId; },
    f => { f.records[1] = clone(f.records[0]); },
    f => { f.records.reverse(); },
    f => { f.records[0].element.text = '別の本文'; },
    f => { f.records[0].props.text = '別の本文'; },
    f => { f.records[1].pulseStates.pop(); },
    f => { f.records[1].pulseStates[1].element.visualState.textStyle.fontSizePx++; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f); const before = JSON.stringify(f);
    assert.throws(() => buildPresentationEncodedOmissionArgumentsV002({...f, instructionId: 'caption-a'}));
    assert.equal(JSON.stringify(f), before);
  }
  assert.throws(() => buildPresentationEncodedOmissionArgumentsV002({...fixture(), instructionId: 'unknown'}), /exactly once/);
});

test('title and speaker overlays remain in the same composition unless they are the one omitted target', () => {
  const f = fixture({pulse: false});
  f.plan.elements[1].kind = f.records[1].element.kind = 'title-cover';
  f.plan.elements[2].kind = f.records[2].element.kind = 'speaker-identification';
  const before = JSON.stringify(f);
  for (const index of [0, 1]) {
    const result = buildPresentationEncodedOmissionArgumentsV002({...f, instructionId: f.plan.elements[index].instructionId});
    const survivors = f.records.filter((_record, recordIndex) => recordIndex !== index);
    assert.deepEqual(result.retainedInstructionIds, survivors.map(record => record.element.instructionId));
    assert.deepEqual(result.compositeArguments, buildPresentationCompositeArgumentsV001({...f, overlayRecords: survivors}));
  }
  assert.equal(JSON.stringify(f), before);
  assert.throws(() => buildPresentationEncodedOmissionArgumentsV002({...f, records: [f.records[0]], instructionId: 'caption-a'}), /every logical overlay/);
});

function savedEvidence({pulse = false, changed = 7} = {}) {
  const f = fixture({pulse}), id = pulse ? 'caption-b' : 'caption-a';
  const record = f.records.find(row => row.element.instructionId === id);
  const context = {planCanonicalSha256: hashJson(f.plan), records: clone(f.records),
    baseMediaPath: f.baseMediaPath, completedMediaPath: '/fixture/completed.mp4', expectedFrameCount: f.expectedFrameCount,
    ffmpegPath: '/fixture/ffmpeg', imageMagickPath: '/fixture/magick', serializePngAndFilters: true,
    presentationTimeline: null, timelineAudio: null};
  const recipe = buildPresentationEncodedOmissionArgumentsV002({...context, plan: f.plan, instructionId: id});
  const fileRef = (filePath, digest = hash(filePath), bytes = 100) =>
    ({path: filePath, realPath: filePath, fileSha256: digest, bytes});
  const inputRef = (role, filePath, digest) => ({role, ...fileRef(filePath, digest)});
  const contextFile = fileRef('/scratch/logical-inputs.json', hash(jsonBytes(context)), jsonBytes(context).length);
  const refs = [inputRef('logical-inputs', contextFile.path, contextFile.fileSha256),
    inputRef('base-media', context.baseMediaPath), inputRef('completed-media', context.completedMediaPath),
    inputRef('ffmpeg-tool', context.ffmpegPath), inputRef('image-magick-tool', context.imageMagickPath)];
  context.records.forEach((entry, index) => {
    refs.push(inputRef('overlay-' + index, entry.pngPath, entry.pngSha256));
    (entry.pulseStates ?? []).forEach((state, stateIndex) => refs.push(inputRef(
      'overlay-' + index + '-state-' + stateIndex, state.pngPath, state.pngSha256)));
  });
  const inputManifest = {before: refs, after: clone(refs), inputRefsCanonicalSha256: hashJson(refs)};
  const completedFrame = fileRef('/scratch/completed.png'), omittedFrame = fileRef('/scratch/omitted.png');
  const input = {instructionId: id, ffmpegPath: context.ffmpegPath,
    compositeArguments: recipe.compositeArguments, representativeFrame: recipe.representativeFrame,
    expectedFrameCount: context.expectedFrameCount, outputPath: omittedFrame.path};
  const counterfactualInputFile = fileRef('/scratch/input.json', hash(jsonBytes(input)), jsonBytes(input).length);
  const pipelineArguments = {
    encoder: [...input.compositeArguments, '-progress', 'pipe:2',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'],
    decoder: ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0',
      '-vf', 'select=eq(n\\,' + input.representativeFrame + ')', '-frames:v', '1', omittedFrame.path],
  };
  const completedExtractionArguments = buildPresentationFrameExtractionArgumentsV001({
    inputPath: context.completedMediaPath, frame: recipe.representativeFrame, outputPath: completedFrame.path, fps: f.plan.canvas.fps});
  const geometry = recipe.bounds.width + 'x' + recipe.bounds.height + '+' + recipe.bounds.left + '+' + recipe.bounds.top;
  const compareArgs = ['compare', '-metric', 'AE', '(', completedFrame.path, '-crop', geometry, '+repage', ')',
    '(', omittedFrame.path, '-crop', geometry, '+repage', ')', 'null:'];
  const sample = {recipe, counterfactualInput: input, counterfactualInputFile, completedFrame, omittedFrame, pipelineArguments,
    completedExtractionArguments, completedExtractionArgumentsCanonicalSha256: hashJson(completedExtractionArguments),
    changedPixelsAgainstInstructionOmittedFrame: changed,
    imageDifference: {command: context.imageMagickPath, args: compareArgs, argumentsCanonicalSha256: hashJson(compareArgs),
      code: changed === 0 ? 0 : 1, signal: null, stderr: String(changed), stderrSha256: hash(String(changed))},
    encoded: {status: 'completed', instructionId: id, representativeFrame: recipe.representativeFrame,
      expectedFrameCount: context.expectedFrameCount, encodedFrames: 90, targetDecodedBeforeQuit: true,
      quitRequestedAfterDecoderExit: true, inputCanonicalSha256: hashJson(input),
      encoderArgumentsCanonicalSha256: hashJson(pipelineArguments.encoder),
      decoderArgumentsCanonicalSha256: hashJson(pipelineArguments.decoder), outputFileSha256: omittedFrame.fileSha256,
      encoder: {code: 0, signal: null, errors: []}, decoder: {code: 0, signal: null, errors: []}, pipeErrors: ['EPIPE']}};
  const artifacts = [counterfactualInputFile, completedFrame, omittedFrame];
  const inspection = {...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002,
    representativeFrame: recipe.representativeFrame, changedPixelsAgainstInstructionOmittedFrame: changed};
  if (pulse) {
    const program = getPresentationPulseProgramV001({element: record.element, canvas: f.plan.canvas});
    const targets = program.samples.map(({frame, expectedState}) => ({frame, state: expectedState}));
    const frames = targets.map(target => {
      const base = fileRef('/scratch/base-' + target.frame + '.png'), output = fileRef('/scratch/completed-' + target.frame + '.png');
      artifacts.push(base, output);
      return {frame: target.frame, expectedState: target.state, comparisonBasis: 'same-source-frame-finite-native-pulse-states',
        expectedOverlaySha256: record.pulseStates.find(state => state.state === target.state).pngSha256,
        alphaUnion: presentationPulseAlphaUnionV001(record.pulseStates),
        baseFrameFile: base.path, baseFrameSha256: base.fileSha256, outputFrameFile: output.path, outputFrameSha256: output.fileSha256,
        stateDistances: record.pulseStates.map(state => {
          const reference = fileRef('/scratch/reference-' + target.frame + '-' + state.state + '.png'); artifacts.push(reference);
          return {state: state.state, overlaySha256: state.pngSha256, absoluteRgbDifference: state.state === target.state ? 0 : 10,
            referenceFrameFile: reference.path, referenceFrameSha256: reference.fileSha256};
        })};
    });
    sample.pulseCompletedFrames = frames; inspection.pulse.completedFrames = frames;
  }
  const outputArtifacts = {before: artifacts, after: clone(artifacts), outputRefsCanonicalSha256: hashJson(artifacts)};
  inspection.encodedOmissionQc = {schemaVersion: PRESENTATION_ENCODED_OMISSION_QC_SCHEMA_V002,
    method: PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002, context, contextFile, inputManifest, sample, outputArtifacts};
  return {plan: f.plan, inspection};
}

test('complete saved evidence passes; equal completed/omitted pixels fail with the existing visibility meaning', () => {
  assert.equal(validatePresentationEncodedOmissionQcEvidenceV002(savedEvidence()).status, 'passed');
  const rejected = validatePresentationEncodedOmissionQcEvidenceV002(savedEvidence({changed: 0}));
  assert.equal(rejected.status, 'failed');
  assert.deepEqual(rejected.violations.map(row => row.code), ['OUTPUT_ELEMENT_NOT_VISIBLE']);
});

test('a basis or success flag cannot replace frame, graph, media, artifact and actual difference evidence', () => {
  for (const fake of [undefined, {status: 'passed', visible: true}]) {
    const f = savedEvidence(); f.inspection.encodedOmissionQc = fake;
    assert.equal(validatePresentationEncodedOmissionQcEvidenceV002(f).status, 'failed');
  }
  const mutations = [
    e => { e.context.planCanonicalSha256 = hash('other-plan'); },
    e => { e.sample.recipe.retainedInstructionIds.reverse(); },
    e => { e.sample.counterfactualInput.compositeArguments.push('/fixture/unremoved-target.png'); },
    e => { e.sample.encoded.representativeFrame++; },
    e => { e.sample.encoded.targetDecodedBeforeQuit = false; },
    e => { e.sample.encoded.decoder.code = 1; },
    e => { e.sample.encoded.encodedFrames = e.sample.recipe.representativeFrame; },
    e => { e.sample.completedExtractionArguments[6] = '/fixture/other.mp4'; },
    e => { e.sample.changedPixelsAgainstInstructionOmittedFrame = 42; },
    e => { e.sample.imageDifference.stderr = '42'; },
    e => { e.inputManifest.after[0].fileSha256 = hash('changed'); },
    e => { e.outputArtifacts.after[0].fileSha256 = hash('changed'); },
    e => { e.context.records[0].pngSha256 = hash('wrong-PNG'); },
  ];
  for (const mutate of mutations) {
    const f = savedEvidence(); mutate(f.inspection.encodedOmissionQc);
    const result = validatePresentationEncodedOmissionQcEvidenceV002(f);
    assert.equal(result.status, 'failed');
    assert.ok(result.violations.some(row => row.code === 'ENCODED_OMISSION_QC_INVALID'));
  }
});

test('Pulse evidence must preserve all moving-frame observations and their unique intended states', () => {
  assert.equal(validatePresentationEncodedOmissionQcEvidenceV002(savedEvidence({pulse: true})).status, 'passed');
  for (const mutate of [
    frames => frames.pop(),
    frames => { frames[1].stateDistances[0].absoluteRgbDifference = 0; },
    frames => { frames[0].frame++; },
  ]) {
    const f = savedEvidence({pulse: true}); mutate(f.inspection.pulse.completedFrames);
    const result = validatePresentationEncodedOmissionQcEvidenceV002(f);
    assert.equal(result.status, 'failed');
    assert.ok(result.violations.some(row => row.code === 'PULSE_FRAME_STATE_MISMATCH'));
  }
});

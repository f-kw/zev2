import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001,
  PRESENTATION_PULSE_PRESET_V001} from './presentation_pulse_v001.mjs';
import {buildPresentationCompositeArgumentsV001, buildPresentationRenderApplicationResultsV002,
  buildPresentationOverlayFileBindingsV001, executeValidatedPresentationDrawAndQcV001,
  buildPresentationFrameExtractionArgumentsV001, runPresentationRendererChildProcessV001}
  from './render_presentation_v002.mjs';
import {evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';
import {absolutePresentationPulseRgbDifferenceV001, inspectPresentationPulseCompletedFramesV001} from './presentation_pulse_renderer_qc_v001.mjs';

const sha = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const canvas = {width: 1920, height: 1080, fps: 30,
  safeAreaPx: {left: 80, right: 80, top: 40, bottom: 40}};
const element = () => ({instructionId: 'pulse-caption', kind: 'speech-caption',
  presetId: 'normal', requestedPresetId: 'normal', appliedPresetId: 'normal', registryVersion: 'normal-v001',
  text: '一度だけ変化', indexedLines: [{lineIndex: 0, text: '一度だけ変化'}],
  startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30,
  visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'}, position: {preset: 'bottom-center'},
    layout: {maxLines: 2}},
  presentationPulse: {presentation: 'provisional-pulse', anchorPeakId: 'measured-peak', anchorFrame: 14}});
const recordFor = () => {
  const source = element();
  const states = buildPresentationPulseStateElementsV001({element: source, canvas}).map(row => {
    const width = row.element.visualState.textStyle.fontSizePx;
    const bounds = {left: 960 - width / 2, top: 980 - width, right: 960 + width / 2, bottom: 980, width, height: width};
    const props = {text: row.element.text, visualState: row.element.visualState};
    return {...row, props, pngPath: `/native/${row.state}.png`, pngSha256: sha(row),
      inspection: {instructionId: source.instructionId, overlayFile: `overlays/${row.state}.png`, overlaySha256: sha(row),
        appliedOverlayPropsCanonicalSha256: sha(props), pixelWidth: canvas.width, pixelHeight: canvas.height, alphaMax: 1, alphaBounds: bounds,
        lineCount: 1, lineAlphaBounds: [{lineIndex: 0, ...bounds}],
        layoutWrapper: {left: bounds.left, top: bounds.top, width, height: width}}};
  });
  return {...states[0], element: source, pulseStates: states,
    inspection: {...states[0].inspection, pulse: {presetVersion: PRESENTATION_PULSE_PRESET_V001.version,
      metadata: source.presentationPulse, program: getPresentationPulseProgramV001({element: source, canvas}),
      states: states.map(row => ({state: row.state, ...row.inspection}))}}};
};
const qcInput = () => {
  const record = recordFor();
  const program = record.inspection.pulse.program;
  record.inspection.visibilityComparisonBasis = 'same-composite-with-instruction-omitted';
  record.inspection.changedPixelsAgainstInstructionOmittedFrame = 1;
  record.inspection.pulse.completedFrames = program.samples.map(({frame, expectedState: state}) => ({frame, expectedState: state,
    comparisonBasis: 'same-source-frame-finite-native-pulse-states', expectedOverlaySha256: record.pulseStates.find(row => row.state === state).pngSha256,
    outputFrameSha256: 'a'.repeat(64), baseFrameSha256: 'b'.repeat(64),
    stateDistances: record.pulseStates.map(row => ({state: row.state, overlaySha256: row.pngSha256, absoluteRgbDifference: row.state === state ? 0 : 1,
      referenceFrameSha256: 'c'.repeat(64)}))}));
  return {plan: {canvas, elements: [record.element]}, canvas,
    applicationResults: buildPresentationRenderApplicationResultsV002([record]), overlayInspections: [record.inspection],
    mediaInspection: {video: {...canvas, frameCount: 30}, durationMs: 1000},
    expectedAudio: {present: false}, expectedFrameCount: 30};
};

test('Pulse compositor owns all five finite inputs, nine contiguous phases and one common fade', () => {
  const record = recordFor();
  const args = buildPresentationCompositeArgumentsV001({baseMediaPath: '/base.mp4', plan: {canvas},
    overlayRecords: [record], expectedFrameCount: 30, serializePngAndFilters: true});
  assert.deepEqual(args.flatMap((arg, index) => arg === '-i' ? [args[index + 1]] : []),
    ['/base.mp4', '/native/normal.png', '/native/middle.png', '/native/maximum.png',
      '/native/between-normal-middle.png', '/native/between-middle-maximum.png']);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.equal((graph.match(/geq=/g) ?? []).length, 1);
  assert.equal((graph.match(/split=2/g) ?? []).length, 4);
  assert.match(graph, /concat=n=9:v=1:a=0,settb=expr=1\/30,setpts=N/);
  assert.deepEqual([...graph.matchAll(/trim=end_frame=(\d+)/g)].map(match => Number(match[1])).sort((a,b) => a-b),
    [1,1,1,1,1,1,4,10,10]);
  assert.equal(args[args.indexOf('-c:a') + 1], 'copy');
  for (const mutation of [r => r.pulseStates.pop(), r => r.pulseStates.reverse(),
    r => r.element.presentationPulse.scale = 2, r => r.pulseStates[1].element.text = 'changed']) {
    const changed = structuredClone(record); mutation(changed);
    assert.throws(() => buildPresentationCompositeArgumentsV001({baseMediaPath: '/base.mp4', plan: {canvas},
      overlayRecords: [changed], expectedFrameCount: 30}), /Pulse|pulse/);
  }
});

test('one Pulse application binds every finite native PNG and forward-only metadata', () => {
  const record = recordFor();
  const results = buildPresentationRenderApplicationResultsV002([record]);
  assert.equal(results.length, 1);
  assert.deepEqual(buildPresentationOverlayFileBindingsV001(results).map(row => row.path),
    ['overlays/between-middle-maximum.png', 'overlays/between-normal-middle.png',
      'overlays/maximum.png', 'overlays/middle.png', 'overlays/normal.png']);
  assert.deepEqual(results[0].pulse.metadata, record.element.presentationPulse);
  assert.deepEqual(results[0].pulse.program, record.inspection.pulse.program);
  const staticRecord = record.pulseStates[0];
  assert.equal(Object.hasOwn(buildPresentationRenderApplicationResultsV002([staticRecord])[0], 'pulse'), false);
});

test('Pulse native geometry rejects missing, substituted, unsafe and clamped states without final visibility', () => {
  const nativeInput = () => ({...qcInput(), requireFinalVisibility: false});
  assert.equal(evaluatePresentationRendererQcV002(nativeInput()).status, 'passed');
  const missingNative = nativeInput();
  missingNative.applicationResults[0].pulse.states.pop();
  assert(evaluatePresentationRendererQcV002(missingNative).violations.some(row => row.code === 'PULSE_NATIVE_STATE_MISMATCH'));
  const cases = [
    input => input.applicationResults[0].pulse.states.pop(),
    input => input.overlayInspections[0].pulse.states[2].overlaySha256 = 'd'.repeat(64),
    input => input.overlayInspections[0].pulse.states[1].layoutWrapper.left++,
    input => input.overlayInspections[0].pulse.states[1].pixelWidth--,
    input => input.overlayInspections[0].pulse.states[2].alphaBounds.right = 1920,
    input => input.overlayInspections[0].pulse.states[1].lineAlphaBounds = [],
    input => input.applicationResults[0].pulse.program.segments[1].startFrame++,
    input => input.overlayInspections[0].pulse.states[2].alphaBounds = structuredClone(input.overlayInspections[0].pulse.states[0].alphaBounds),
    input => input.overlayInspections[0].pulse.states[3].alphaBounds = structuredClone(input.overlayInspections[0].pulse.states[0].alphaBounds),
  ];
  for (const mutate of cases) {
    const input = nativeInput(); mutate(input);
    assert.equal(evaluatePresentationRendererQcV002(input).status, 'failed');
  }
});

test('Pulse layout collision checks use the actual finite phase, including expanded-only intersections', () => {
  const check = (startFrame, endFrameExclusive) => {
    const input = {...qcInput(), requireFinalVisibility: false};
    const other = recordFor().pulseStates[0];
    other.element = {...other.element, instructionId: 'other-caption', startFrame, endFrameExclusive,
      displayFrameCount: endFrameExclusive - startFrame};
    other.props = {...other.props, instructionId: 'other-caption'};
    other.pngPath = '/native/other-caption.png'; other.pngSha256 = sha(other.element);
    const bounds = {left: 1018, top: 950, right: 1022, bottom: 960, width: 4, height: 10};
    other.inspection = {...other.inspection, instructionId: 'other-caption',
      overlayFile: 'overlays/other-caption.png', overlaySha256: other.pngSha256,
      appliedOverlayPropsCanonicalSha256: sha(other.props), alphaBounds: bounds,
      lineAlphaBounds: [{lineIndex: 0, ...bounds}],
      visibilityComparisonBasis: 'same-composite-with-instruction-omitted', changedPixelsAgainstInstructionOmittedFrame: 1};
    input.plan.elements.push(other.element);
    input.applicationResults.push(buildPresentationRenderApplicationResultsV002([other])[0]);
    input.overlayInspections.push(other.inspection);
    return evaluatePresentationRendererQcV002(input);
  };
  assert.equal(check(0, 10).status, 'passed');
  const duringMaximum = check(13, 17);
  assert(duringMaximum.violations.some(row => row.code === 'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION'
    && row.details.pulseStates.left === 'maximum' && row.details.overlappingFrames === 4));
});

test('local Pulse frame diagnostics reject ties and wrong return without granting final acceptance', () => {
  const validLocalFrames = evaluatePresentationRendererQcV002(qcInput());
  assert.equal(validLocalFrames.status, 'failed');
  assert(validLocalFrames.violations.some(row => row.code === 'COMPLETED_FRAME_QC_INVALID'
    && row.details?.missingGlobalEvidence === true));
  assert(!validLocalFrames.violations.some(row => row.code === 'PULSE_FRAME_STATE_MISMATCH'));
  for (const mutate of [
    input => delete input.overlayInspections[0].pulse.completedFrames,
    input => input.overlayInspections[0].pulse.completedFrames[1].stateDistances.forEach(row => row.absoluteRgbDifference = 0),
    input => input.overlayInspections[0].pulse.completedFrames.at(-1).stateDistances.forEach(row => row.absoluteRgbDifference = row.state === 'maximum' ? 0 : 1),
    input => input.overlayInspections[0].pulse.completedFrames[1].frame++,
    input => {input.overlayInspections[0].pulse.completedFrames = input.overlayInspections[0].pulse.completedFrames
      .filter(row => ['normal', 'maximum'].includes(row.expectedState));},
  ]) {
    const input = qcInput(); mutate(input);
    const qc = evaluatePresentationRendererQcV002(input);
    assert.equal(qc.status, 'failed');
    assert(qc.violations.some(row => row.code === 'COMPLETED_FRAME_QC_INVALID'
      && row.details?.missingGlobalEvidence === true));
    assert(qc.violations.some(row => row.code === 'PULSE_FRAME_STATE_MISMATCH'));
  }
  assert.equal(absolutePresentationPulseRgbDifferenceV001(Buffer.from([0,255,20]), Buffer.from([1,253,25])), 8);
  assert.throws(() => absolutePresentationPulseRgbDifferenceV001(Buffer.from([0]), Buffer.from([])));
});

test('native-only Pulse evidence cannot satisfy the final completed-video requirement', () => {
  for (const forged of [undefined, {status: 'passed', visible: true, frames: []}]) {
    const input = qcInput();
    const inspection = input.overlayInspections[0];
    inspection.visibilityComparisonBasis = 'native-reference-state-identification-v001';
    if (forged !== undefined) inspection.nativeFrameQc = forged;
    const result = evaluatePresentationRendererQcV002(input);
    assert.equal(result.status, 'failed');
    assert(result.violations.some(violation => violation.code === 'COMPLETED_FRAME_QC_INVALID'
      && violation.details?.missingGlobalEvidence === true));
    assert.deepEqual([...new Set(result.violations.map(violation => violation.code))],
      ['COMPLETED_FRAME_QC_INVALID']);
  }
});

test('Pulse refuses a normal precomputed layout and sends all native states to the real layout boundary', async t => {
  const source = element(), plan = {canvas, elements: [source]};
  await assert.rejects(executeValidatedPresentationDrawAndQcV001({plan, expectedFrameCount: 30,
    runCounterfactualQc: false}), /completed-frame state identification/);
  await assert.rejects(executeValidatedPresentationDrawAndQcV001({plan, expectedFrameCount: 30,
    counterfactualQcMethod: 'encoded-omission-v2',
    validatedLayoutInspection: {status: 'passed', items: []}}), /all finite states/);
  const directory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/pulse-layout-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  let observed;
  const outcome = await executeValidatedPresentationDrawAndQcV001({plan, expectedFrameCount: 30,
    counterfactualQcMethod: 'encoded-omission-v2',
    outputDirectory: path.join(directory, 'render'), presetRegistry: {},
    overlayAdapter: {buildProps: element => structuredClone(element),
      renderStill: async () => assert.fail('layout failed before any draw'), renderLineMask: async () => assert.fail('layout failed before any mask')},
    toolPaths: {ffmpegPath: '/unused/ffmpeg', ffprobePath: '/unused/ffprobe', imageMagickPath: '/unused/magick',
      tsxPath: '/unused/tsx', layoutInspectorPath: '/unused/layout'},
    processObserver: {run: async (_command, args, options) => {
      assert.equal(options.observationLabel, 'layout-inspection');
      observed = JSON.parse(await readFile(args[1], 'utf8'));
      await writeFile(args[2], JSON.stringify({status: 'failed', violations: [{code: 'TEST_LAYOUT_STOP'}], items: []}));
      return {code: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0)};
    }}});
  assert.equal(outcome.exitCode, 1);
  assert.deepEqual(observed.overlays.map(row => row.visualState.textStyle.fontSizePx), [96,112,128,104,120]);
  assert(observed.overlays.every(row => row.text === source.text && row.startFrame === 0 && row.endFrameExclusive === 30));
});


test('the real finite compositor selects exactly the declared state at every frame, including all boundaries and fades', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'zev-pulse-frame-mapping-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const run=args=>execFileSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{maxBuffer:4*1024*1024});
  const fixtureCanvas={width:64,height:36,fps:30};
  const source={...element(),startFrame:5,endFrameExclusive:40,displayFrameCount:35,
    presentationPulse:{presentation:'provisional-pulse',anchorPeakId:'measured-peak',anchorFrame:20}};
  const base=path.join(directory,'base.nut');
  run(['-f','lavfi','-i','testsrc2=size=64x36:rate=30:duration=1.5','-f','lavfi','-i',
    'sine=frequency=440:sample_rate=48000:duration=1.5','-c:v','ffv1','-c:a','pcm_s16le',base]);
  const states=buildPresentationPulseStateElementsV001({element:source,canvas:fixtureCanvas}).map((row,index)=>{
    const pngPath=path.join(directory,`${row.state}.png`);
    // Deliberately simple RGB fixtures isolate frame selection and shared alpha;
    // real font geometry is verified separately by the native test.
    execFileSync('/opt/homebrew/bin/magick',['-size','64x36','xc:none','-fill',['red','green','blue','yellow','magenta'][index],
      '-draw','rectangle 12,12 51,31','PNG32:'+pngPath]);
    return {...row,pngPath};
  });
  const logical={...states[0],element:source,pulseStates:states};
  const plan={canvas:fixtureCanvas,elements:[source]};
  const encode=(record,name)=>{
    const output=path.join(directory,`${name}.nut`);
    const args=buildPresentationCompositeArgumentsV001({baseMediaPath:base,plan,overlayRecords:[record],expectedFrameCount:45,serializePngAndFilters:true});
    run([...args,'-c:v','ffv1','-c:a','pcm_s16le',output]);
    return {output,video:run(['-i',output,'-map','0:v','-pix_fmt','yuv420p','-f','rawvideo','-']),
      audio:run(['-i',output,'-map','0:a','-f','s16le','-'])};
  };
  const pulse=encode(logical,'pulse'), references=states.map(state=>({...encode(state,state.state),state:state.state}));
  const program=getPresentationPulseProgramV001({element:source,canvas:fixtureCanvas});
  const frameBytes=64*36*3/2;
  assert.equal(pulse.video.length,45*frameBytes);
  for(let frame=0;frame<45;frame++){
    const expected=program.segments.find(segment=>frame>=segment.startFrame&&frame<segment.endFrameExclusive)?.state??'normal';
    const reference=references.find(row=>row.state===expected);
    assert.deepEqual(pulse.video.subarray(frame*frameBytes,(frame+1)*frameBytes),
      reference.video.subarray(frame*frameBytes,(frame+1)*frameBytes),`frame ${frame}: expected ${expected}`);
  }
  assert.deepEqual(pulse.audio,run(['-i',base,'-map','0:a','-f','s16le','-']));
  logical.fileStem='finite-rgb-fixture';
  for(const row of states){
    row.pngSha256=createHash('sha256').update(await readFile(row.pngPath)).digest('hex');
    row.inspection={alphaBounds:{left:12,top:12,right:52,bottom:32,width:40,height:20}};
  }
  const extract=(inputPath,frame,outputPath,fps,ffmpegPath,processObserver)=>runPresentationRendererChildProcessV001(ffmpegPath,
    buildPresentationFrameExtractionArgumentsV001({inputPath,frame,outputPath,fps}),{processObserver});
  const identify=completedMediaPath=>inspectPresentationPulseCompletedFramesV001({record:logical,canvas:fixtureCanvas,
    baseMediaPath:base,completedMediaPath,scratchDirectory:directory,ffmpegPath:'/opt/homebrew/bin/ffmpeg',
    imageMagickPath:'/opt/homebrew/bin/magick',processObserver:null,runProcess:runPresentationRendererChildProcessV001,extractFrame:extract});
  const uniquelyExpected=frame=>{
    const intended=frame.stateDistances.find(row=>row.state===frame.expectedState).absoluteRgbDifference;
    return frame.stateDistances.every(row=>row.state===frame.expectedState||intended<row.absoluteRgbDifference);
  };
  assert((await identify(pulse.output)).every(uniquelyExpected));
  // This is a compositor/reference-QC capability fixture, not native font QA.
  const broken=structuredClone(logical);broken.pulseStates[2].pngPath=broken.pulseStates[0].pngPath;
  const brokenOutput=encode(broken,'maximum-removed');
  const wrongFrames=await identify(brokenOutput.output);
  assert.equal(uniquelyExpected(wrongFrames.find(row=>row.frame===program.maximumFrame)),false,
    'a displayed normal image is not a maximum pulse');
  const missingIntermediate=structuredClone(logical);
  missingIntermediate.pulseStates[4].pngPath=missingIntermediate.pulseStates[1].pngPath;
  const missingIntermediateOutput=encode(missingIntermediate,'intermediate-replaced-by-middle');
  const intermediateFrames=await identify(missingIntermediateOutput.output);
  assert.deepEqual(intermediateFrames.filter(row=>!uniquelyExpected(row)).map(row=>row.frame),
    [program.anchorFrame-2,program.anchorFrame+3], 'both intermediate ramp frames are actually inspected');
});

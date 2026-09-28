import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, mkdir, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {inspectPresentationNativeFrameQcV001, buildPresentationNativeFrameQcRecipeV001} from './presentation_native_frame_qc_v001.mjs';
import {hashPresentationNativeFileV001} from './presentation_native_qc_streaming_v001.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {createPresentationNativeLayerRecoveryManifestV001, openPresentationNativeLayerRecoveryV001}
  from './presentation_native_layer_recovery_v001.mjs';
import {inspectPresentationNativeResumeV001}
  from './presentation_native_resume_v001.mjs';

const execute = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const run = async (command, args) => {const {stdout, stderr} = await execute(command, args,
  {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024}); return {code: 0, signal: null, stdout, stderr};};
const bind = async file => ({path: file, fileSha256: await hashPresentationNativeFileV001(file)});
const save = async (file, value) => {await writeFile(file, JSON.stringify(value) + '\n', {flag: 'wx'}); return bind(file);};
// Geometric 16px media tests the unchanged QC processors and continuation
// evidence. It does not stand in for text readability or human quality review.
async function fixture(t, {wrongSecondCaption = false} = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'zev-native-resume-')));
  t.after(() => rm(root, {recursive: true}));
  const ffmpeg = await realpath('/opt/homebrew/bin/ffmpeg'), magick = await realpath('/opt/homebrew/bin/magick');
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 16, height: 16, fps: 30}, elements: ['甲', '乙', '甲'].map((text, index) => ({
      instructionId: 'caption-' + index, kind: 'speech-caption', text, indexedLines: [{lineIndex: 0, text}],
      startFrame: index * 10, endFrameExclusive: (index + 1) * 10, displayFrameCount: 10,
      visualState: {textStyle: {fontAssetId: 'synthetic-test-font', fontSizePx: 1, fontColor: '#FFFFFF',
        borderColor: '#000000', borderWidthPx: 0, glowWidthPx: 0},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
      background: null, layout: {maxLines: 1}}}))};
  const baseline = await save(path.join(root, 'baseline.json'), plan);
  const context = {baselineRef: {...baseline, canonicalSha256: hashJson(plan)},
    decisionInputRef: await save(path.join(root, 'decision.json'), {fixture: true}),
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
  const autoPresentation = {context, autoProposal: fixAutoPresentationProposalV001({baselinePlan: plan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: plan.elements.map(row => row.instructionId), completion: 'complete', exceptions: [], effects: []}})};
  const planRef = await save(path.join(root, 'plan.json'), plan), autoRef = await save(path.join(root, 'auto.json'), autoPresentation);
  const stagingDirectory = path.join(root, 'publish'); await mkdir(stagingDirectory); await mkdir(path.join(stagingDirectory, 'overlays'));
  const white = path.join(stagingDirectory, 'overlays', 'white.png'), green = path.join(stagingDirectory, 'overlays', 'green.png');
  await run(magick, ['-size', '16x16', 'xc:none', '-fill', '#ffffff80', '-draw', 'rectangle 2,2 7,13', white]);
  await run(magick, ['-size', '16x16', 'xc:none', '-fill', '#00ff0080', '-draw', 'rectangle 8,2 13,13', green]);
  const records = [];
  for (const [index, element] of plan.elements.entries()) {
    const png = await bind(index === 1 ? green : white), left = index === 1 ? 8 : 2;
    const props = {schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
      canvas: structuredClone(plan.canvas), text: element.text, indexedLines: structuredClone(element.indexedLines),
      visualState: structuredClone(element.visualState), inspectionLineIndex: null};
    const record = {element: structuredClone(element), props, pngPath: png.path, pngSha256: png.fileSha256,
      inspection: {instructionId: element.instructionId, overlaySha256: png.fileSha256,
        appliedOverlayPropsCanonicalSha256: hashJson(props), alphaBounds: {left, top: 2, right: left + 6,
          bottom: 14, width: 6, height: 12}}};
    records.push({...record, alternates: [{...structuredClone(record), kind: 'normal'}]});
  }
  const base = path.join(root, 'base.mp4');
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=#101010:s=16x16:r=30:d=1',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-frames:v', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', base]);
  const complete = path.join(stagingDirectory, 'presentation-rendered-v002.mp4');
  await run(ffmpeg, [...buildPresentationCompositeArgumentsV001({baseMediaPath: base, plan,
    overlayRecords: wrongSecondCaption ? records.map((row, index) => index === 1 ? {...row, pngPath: white} : row) : records,
    expectedFrameCount: 30, serializePngAndFilters: true}), '-movflags', '+faststart', complete]);
  const tools = {ffmpeg: await bind(ffmpeg), imageMagick: await bind(magick)};
  const input = {plan, records, tools, media: {base: await bind(base), completed: await bind(complete)},
    provenance: {planCanonicalSha256: hashJson(plan), inputRefs: [{role: 'baseline-plan', ...baseline},
      {role: 'plan', ...planRef}, {role: 'auto-input', ...autoRef}]}};
  const baselineResult = await inspectPresentationNativeFrameQcV001({...input,
    scratchDirectory: path.join(root, 'baseline-native'), referenceBatchSize: 1});
  let interruptionRef;
  await assert.rejects(inspectPresentationNativeFrameQcV001({...input,
    scratchDirectory: path.join(root, 'interrupted-native'), referenceBatchSize: 1,
    referenceRetention: 'verified-pass-regenerable-v001', executionControl: {
      beforeHeavyBatch: event => {if (event.sampleIndex === 1 && event.phase === 'native-reference-composite' && event.batchIndex === 1)
        throw Error('test interruption with first reference retained');},
    }}), error => {interruptionRef = error.nativeFrameQcFailure.interrupted; return true;});
  const interruption = await readPresentationQcEvidenceV001(interruptionRef.path, {expectedFileSha256: interruptionRef.fileSha256});
  assert.equal(interruption.completedSamples.length, 1); assert.equal(interruption.currentSample.sampleIndex, 1);
  const {manifestRef} = await createPresentationNativeLayerRecoveryManifestV001({file: path.join(root, 'raw-recovery.json'),
    nativeLayers: interruption.nativeLayers, sceneBindings: interruption.sceneBindings,
    outputArtifacts: interruption.outputArtifacts, processes: interruption.processes, inputRefs: interruption.inputManifest.inputRefs,
    candidateBindings: {planCanonicalSha256: hashJson(plan)}, sourceEvidenceRefs: [interruptionRef]});
  const materializer = await openPresentationNativeLayerRecoveryV001({manifestRef, run});
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan: plan, autoPresentation, records});
  return {root, input, interruptionRef, interruption, recipe, baselineResult, materializer, manifestRef, stagingDirectory,
    recoveryBinding: {manifestRef}};
}


import {inspectPresentationExactReplayQcV001} from './presentation_exact_replay_qc_v001.mjs';
import {evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';
import {checkFiniteExecutionEvidence, validatePresentationIntegrityStateQcEvidenceV001}
  from './presentation_integrity_state_qc_v001.mjs';
import {checkResumedFiniteExecutionEvidenceV001, combinePresentationNativeResumeIntegrityQcV001,
  validatePresentationNativeResumeIntegrityQcV001, evaluatePresentationNativeResumeRendererQcV001,
  PRESENTATION_NATIVE_RESUME_INTEGRITY_QC_METHOD_V001}
  from './presentation_native_resume_integrity_v001.mjs';

const clone = value => structuredClone(value);
async function integratedFixture(t) {
  const f = await fixture(t);
  await f.materializer.releaseAll();
  const finite = await inspectPresentationNativeResumeV001({...f.input, interruptionRef: f.interruptionRef,
    newDirectory: path.join(f.root, 'resumed'), materializer: f.materializer, recoveryBinding: f.recoveryBinding});
  const replay = await inspectPresentationExactReplayQcV001({plan: f.input.plan, records: f.input.records,
    baseMediaPath: f.input.media.base.path, completedMediaPath: f.input.media.completed.path,
    expectedFrameCount: 30, scratchDirectory: path.join(f.root, 'replay'),
    ffmpegPath: f.input.tools.ffmpeg.path, ffprobePath: await realpath('/opt/homebrew/bin/ffprobe'),
    serializePngAndFilters: true});
  assert.equal(replay.status, 'passed', JSON.stringify(replay.violations));
  const combinedInput = {plan: f.input.plan, finite, replay, expectedFrameCount: 30,
    currentCompletedMediaRef: f.input.media.completed};
  const combined = combinePresentationNativeResumeIntegrityQcV001(combinedInput);
  assert.equal(combined.status, 'passed', JSON.stringify(combined.violations));
  const overlayInspections = combined.inspections.map((inspection, i) => ({...inspection,
    overlayFile: 'overlay-' + i + '.png', alphaMax: 1, lineCount: 1,
    lineAlphaBounds: [{lineIndex: 0, ...clone(inspection.alphaBounds)}]}));
  const applicationResults = overlayInspections.map((inspection, i) => {
    const element = f.input.plan.elements[i];
    return {instructionId: element.instructionId, requestedPresetId: element.presetId,
      appliedPresetId: element.presetId, appliedPresetRegistryVersion: element.registryVersion,
      overlayFile: inspection.overlayFile, overlaySha256: inspection.overlaySha256,
      appliedOverlayPropsCanonicalSha256: inspection.appliedOverlayPropsCanonicalSha256,
      finalPlanElementReference: {planFile: 'presentation-render-plan-v002.json', instructionId: element.instructionId,
        canonicalSha256: hashJson({...element, overlaySha256: inspection.overlaySha256})}};
  });
  const audio = {codecName: 'aac', packetPayloadSha256: hash('same-audio-observation')};
  const input = {plan: f.input.plan, applicationResults, overlayInspections,
    canvas: {...f.input.plan.canvas, safeAreaPx: {left: 0, top: 0, right: 0, bottom: 0}},
    mediaInspection: {durationMs: 1000, video: {codecName: 'h264', ...f.input.plan.canvas, frameCount: 30}, audio},
    expectedAudio: {present: true, ...audio}, expectedFrameCount: 30,
    completedFrameQcEvidence: combined.evidence, currentCompletedMediaRef: f.input.media.completed};
  return {...f, finite, replay, combined, combinedInput, input};
}

test('resumed final proof retains the ordinary native semantics but uses a distinct two-execution integrity method', async t => {
  const f = await integratedFixture(t);
  assert.equal(f.combined.method, PRESENTATION_NATIVE_RESUME_INTEGRITY_QC_METHOD_V001);
  assert.doesNotThrow(() => checkResumedFiniteExecutionEvidenceV001(f.finite.evidence, f.finite.inspections, f.input.plan.canvas));
  assert.throws(() => checkFiniteExecutionEvidence(f.finite.evidence, f.finite.inspections, f.input.plan.canvas));
  assert.equal(validatePresentationIntegrityStateQcEvidenceV001({plan: f.input.plan, overlayInspections: f.combined.inspections,
    evidence: f.combined.evidence, expectedFrameCount: 30, currentCompletedMediaRef: f.input.currentCompletedMediaRef}).status, 'failed');
  const before = clone(f.input);
  const result = evaluatePresentationNativeResumeRendererQcV001(f.input);
  assert.equal(result.status, 'passed', JSON.stringify(result.violations));
  assert.deepEqual(f.input, before, 'final validation never rewrites historical arguments or evidence');

  await t.test('shared evidence survives key order changes and separate-process final readback', async () => {
    const file=path.join(f.root,'shared-resumed-final.json');
    const ref=await writePresentationQcEvidenceV001(file,f.input);
    const reread=await readPresentationQcEvidenceV001(file,{expectedFileSha256:ref.fileSha256});
    assert.equal(evaluatePresentationNativeResumeRendererQcV001(reread).status,'passed');
    const script=`import {readPresentationQcEvidenceV001} from ${JSON.stringify(new URL('./presentation_qc_evidence_store_v001.mjs',import.meta.url).href)};
      import {evaluatePresentationNativeResumeRendererQcV001} from ${JSON.stringify(new URL('./presentation_native_resume_integrity_v001.mjs',import.meta.url).href)};
      const x=await readPresentationQcEvidenceV001(process.argv[1],{expectedFileSha256:process.argv[2]});
      const q=evaluatePresentationNativeResumeRendererQcV001(x);process.stdout.write(JSON.stringify({status:q.status,violations:q.violations}));`;
    const {stdout}=await execute(process.execPath,['--input-type=module','-e',script,file,ref.fileSha256]);
    assert.equal(JSON.parse(stdout).status,'passed',stdout);
  });
  const changes = [
    ['missing old boundary point', x => x.finiteState.samples.shift()],
    ['duplicate boundary point', x => x.finiteState.samples.splice(1, 0, clone(x.finiteState.samples[0]))],
    ['reordered points', x => x.finiteState.samples.reverse()],
    ['old prefix count changed', x => x.finiteState.nativeResume.oldReceiptCount++],
    ['suffix starts after gap', x => x.finiteState.nativeResume.segments[1].startSampleIndex++],
    ['suffix overlaps prefix', x => x.finiteState.nativeResume.segments[1].startSampleIndex--],
    ['segment order swapped', x => x.finiteState.nativeResume.segments.reverse()],
    ['reference roots swapped', x => {const r=x.finiteState.nativeResume; [r.segments[0].referenceDirectory,r.segments[1].referenceDirectory]=[r.segments[1].referenceDirectory,r.segments[0].referenceDirectory];}],
    ['uncompleted old partial mixed into suffix', x => {x.finiteState.samples[1].completedRgb.path=f.interruption.currentSample.directory+'/completed.rgb';}],
    ['source interrupt SHA changed', x => x.finiteState.nativeResume.sourceInterruptionRef.fileSha256=hash('other')],
    ['receipt SHA changed', x => x.finiteState.samples[0].referenceRetention.checkpoint.fileSha256=hash('other')],
    ['saved old process changed', x => x.finiteState.processes[0].stdoutSha256=hash('other')],
    ['suffix process failed', x => x.finiteState.processes.at(-1).code=1],
    ['suffix cancelled', x => x.finiteState.processes.at(-1).signal='SIGTERM'],
    ['unexpected extra process', x => x.finiteState.processes.push(clone(x.finiteState.processes.at(-1)))],
    ['argument changed with matching new argument hash', x => {const p=x.finiteState.processes.at(-1);p.args[0]='--different';p.argumentsCanonicalSha256=hashJson(p.args);}],
    ['layer recipe changed', x => x.finiteState.nativeLayers.layers[0].width++],
    ['materializer observation missing', x => delete x.finiteState.nativeResume.materializationEvidence],
    ['materializer raw hash changed', x => x.finiteState.nativeResume.materializationEvidence.layerObservations[0].actualRawRef.fileSha256=hash('other')],
    ['materializer contradictory extra dimensions', x => x.finiteState.nativeResume.materializationEvidence.layerObservations[0].width=999],
    ['materializer contradictory extra raw expectation', x => x.finiteState.nativeResume.materializationEvidence.layerObservations[0].expectedRawRef={path:'/bad',fileSha256:hash('bad')}],
    ['materializer wrong pixel format', x => x.finiteState.nativeResume.materializationEvidence.manifestUtf8=x.finiteState.nativeResume.materializationEvidence.manifestUtf8.replace('gbrap','rgba')],
    ['materializer extra process', x => x.finiteState.nativeResume.materializationEvidence.operations.find(o=>o.kind==='verified-existing').process={code:0}],
    ['materializer generated command changed', x => {const p=x.finiteState.nativeResume.materializationEvidence.operations.find(o=>o.kind==='generated-batch').process;p.args[0]='--different';p.argumentsCanonicalSha256=hashJson(p.args);}],
    ['replay incomplete', x => x.exactReplay.encodeProgress.completed=false],
    ['old combined schema disguised', x => {x.schemaVersion='presentation-integrity-state-qc-v001';x.method='exact-replay-native-v1';}],
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const input=clone(f.input); change(input.completedFrameQcEvidence);
    const result=evaluatePresentationNativeResumeRendererQcV001(input);
    assert.equal(result.status,'failed',name); assert(result.violations.some(v=>v.code==='COMPLETED_FRAME_QC_INVALID'),JSON.stringify(result.violations));
  });
  for (const [name, change] of [
    ['basis differs in one caption', x=>x.overlayInspections[1].visibilityComparisonBasis='native-reference-state-identification-v001'],
    ['native result reports impossible pass', x=>{x.overlayInspections[1].nativeFrameQc.samples[0].classes[0].absoluteRgbDifference=999999999;}],
    ['layout safe area fails', x=>x.overlayInspections[1].alphaBounds.right=100],
    ['media frame count differs', x=>x.mediaInspection.video.frameCount++],
    ['global proof absent despite caller false', x=>{delete x.completedFrameQcEvidence;x.requireFinalVisibility=false;}],
    ['empty inspections', x=>x.overlayInspections=[]],
  ]) await t.test(name, () => {const input=clone(f.input);change(input);assert.equal(evaluatePresentationNativeResumeRendererQcV001(input).status,'failed');});
  await t.test('layout-only success cannot be final success', () => {
    const input=clone(f.input);delete input.completedFrameQcEvidence;input.requireFinalVisibility=false;
    assert.equal(evaluatePresentationRendererQcV002(input).status,'passed');
    assert.equal(evaluatePresentationNativeResumeRendererQcV001(input).status,'failed');
  });
});

import {buildPresentationRenderApplicationResultsV002} from './render_presentation_v002.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001, PRESENTATION_PULSE_PRESET_V001}
  from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';

// Synthetic physical-layout evidence isolates the Pulse and Motion dispatch
// gates. It never substitutes for a completed-video visibility observation.
function effectLayoutFixture(expression) {
  const canvas = {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {left: 80, right: 80, top: 40, bottom: 40}};
  const element = {instructionId: 'caption-0', kind: 'speech-caption', text: '字幕',
    presetId: 'normal', requestedPresetId: 'normal', appliedPresetId: 'normal', registryVersion: 'normal-v001',
    indexedLines: [{lineIndex: 0, text: '字幕'}], startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30,
    visualState: {textStyle: {fontAssetId: 'test-font', fontSizePx: 96, fontColor: '#FFFFFF',
      borderColor: '#000000', borderWidthPx: 0, glowWidthPx: 0},
    position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: expression === 'pulse' ? 0 : -6},
    background: null, layout: {maxLines: 1}}};
  const isPulse = expression === 'pulse';
  if (isPulse) element.presentationPulse = {presentation: 'provisional-pulse', anchorPeakId: 'measured', anchorFrame: 14};
  else element.presentationMotion = {presentation: 'provisional-' + expression, presetVersion: 'presentation-caption-motion-v002'};
  const states = (isPulse ? buildPresentationPulseStateElementsV001 : buildPresentationCaptionMotionStateElementsV001)({element, canvas}).map(row => {
    const width = row.element.visualState.textStyle.fontSizePx;
    const offset = row.element.visualState.position.offsetXPercent * canvas.width / 100;
    const bounds = {left: 960 + offset - width / 2, top: 980 - width, right: 960 + offset + width / 2,
      bottom: 980, width, height: width};
    const props = {text: row.element.text, visualState: row.element.visualState}, pngSha256 = hashJson(row);
    return {...row, props, pngPath: '/fixture/' + row.state + '.png', pngSha256,
      inspection: {instructionId: element.instructionId, overlayFile: 'overlays/' + row.state + '.png',
        overlaySha256: pngSha256, appliedOverlayPropsCanonicalSha256: hashJson(props),
        pixelWidth: canvas.width, pixelHeight: canvas.height, alphaMax: 1, alphaBounds: bounds,
        lineCount: 1, lineAlphaBounds: [{lineIndex: 0, ...bounds}],
        layoutWrapper: {left: bounds.left, top: bounds.top, width, height: width}}};
  });
  const program = (isPulse ? getPresentationPulseProgramV001 : getPresentationCaptionMotionProgramV001)({element, canvas});
  const kind = isPulse ? 'pulse' : 'motion', metadata = isPulse ? element.presentationPulse : element.presentationMotion;
  const record = {...states[0], element, [isPulse ? 'pulseStates' : 'motionStates']: states,
    inspection: {...states[0].inspection, visibilityComparisonBasis: 'exact-replay-and-native-finite-state-v001',
      [kind]: {presetVersion: isPulse ? PRESENTATION_PULSE_PRESET_V001.version : metadata.presetVersion,
        metadata, program, states: states.map(row => ({state: row.state, ...row.inspection}))}}};
  return {plan: {canvas, elements: [element]}, canvas,
    applicationResults: buildPresentationRenderApplicationResultsV002([record]), overlayInspections: [record.inspection],
    mediaInspection: {video: {...canvas, frameCount: 30}, durationMs: 1000},
    expectedAudio: {present: false}, expectedFrameCount: 30, requireFinalVisibility: false};
}
for (const expression of ['pulse', 'bounce', 'shake']) test(expression + ' keeps every ordinary state check and cannot bypass full resumed integrity', () => {
  const input = effectLayoutFixture(expression), kind = expression === 'pulse' ? 'pulse' : 'motion';
  assert.equal(evaluatePresentationRendererQcV002(input).status, 'passed');
  const required = evaluatePresentationNativeResumeRendererQcV001(input);
  assert.equal(required.status, 'failed');
  assert(required.violations.some(row => row.code === 'COMPLETED_FRAME_QC_INVALID'));
  for (const mutate of [
    x => x.overlayInspections[0][kind].states.pop(),
    x => x.overlayInspections[0][kind].states.reverse(),
    x => x.overlayInspections[0][kind].states[1].overlaySha256 = hash('wrong-state'),
    x => x.applicationResults[0][kind].states.pop(),
  ]) {
    const changed = clone(input); mutate(changed);
    const result = evaluatePresentationNativeResumeRendererQcV001(changed);
    assert.equal(result.status, 'failed');
    assert(result.violations.some(row => row.code === (expression === 'pulse'
      ? 'PULSE_NATIVE_STATE_MISMATCH' : 'CAPTION_MOTION_NATIVE_STATE_MISMATCH')));
    assert(result.violations.some(row => row.code === 'COMPLETED_FRAME_QC_INVALID'));
  }
});

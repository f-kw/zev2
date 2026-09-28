import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, mkdir, readFile, realpath, rename, rm, writeFile, readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {inspectPresentationNativeFrameQcV001, buildPresentationNativeFrameQcRecipeV001} from './presentation_native_frame_qc_v001.mjs';
import {hashPresentationNativeFileV001, createPresentationNativePublicationBindingV001} from './presentation_native_qc_streaming_v001.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {createPresentationNativeLayerRecoveryManifestV001, openPresentationNativeLayerRecoveryV001}
  from './presentation_native_layer_recovery_v001.mjs';
import {inspectPresentationNativeResumeV001, verifyPresentationNativeResumeReceiptsV001,
  verifyPresentationNativeResumeOutputArtifactsV001, admitPresentationNativeResumePrefixV001,
  validatePresentationNativeResumeInputsV001}
  from './presentation_native_resume_v001.mjs';
import {checkResumedFiniteExecutionEvidenceV001, combinePresentationNativeResumeIntegrityQcV001,
  validatePresentationNativeResumeIntegrityQcV001} from './presentation_native_resume_integrity_v001.mjs';
import {inspectPresentationExactReplayQcV001} from './presentation_exact_replay_qc_v001.mjs';
import {validatePresentationIntegrityStateQcEvidenceV001} from './presentation_integrity_state_qc_v001.mjs';

const execute = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const run = async (command, args) => {const {stdout, stderr} = await execute(command, args,
  {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024}); return {code: 0, signal: null, stdout, stderr};};
const bind = async file => ({path: file, fileSha256: await hashPresentationNativeFileV001(file)});
const save = async (file, value) => {await writeFile(file, JSON.stringify(value) + '\n', {flag: 'wx'}); return bind(file);};
const observation = sample => {
  const {baseFrame, completedFrame, completedRgb, referenceRetention, references, ...rest} = sample;
  return JSON.parse(JSON.stringify({...rest, baseFrameSha256: baseFrame.fileSha256, completedFrameSha256: completedFrame.fileSha256,
    completedRgbSha256: completedRgb.fileSha256, references: references.map(({rgbPath, ...row}) => row)}));
};

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

test('prefix admission rejects holes, order changes, incomplete observations and another recipe', async t => {
  const f = await fixture(t);
  const before = structuredClone(f.materializer.metrics);
  const preflight = await validatePresentationNativeResumeInputsV001({...f.input, interruptionRef: f.interruptionRef,
    materializer: f.materializer, recoveryBinding: f.recoveryBinding});
  assert.equal(preflight.status, 'fixed-inputs-and-prefix-structure-verified');
  assert.equal(preflight.receiptByteAdmission, 'not-run'); assert.deepEqual(f.materializer.metrics, before);
  assert.deepEqual(admitPresentationNativeResumePrefixV001(f), {oldReceiptCount: 1, nextSampleIndex: 1, expectedSampleCount: 3});
  for (const mutate of [x => x.nextSampleIndex++, x => x.completedSamples[0].frame++,
    x => x.completedSamples[0].visible = false, x => x.completedSamples[0].referenceRetention = null,
    x => x.currentSample.sampleIndex++, x => x.expectedSampleCount--,
    x => x.completedSamples.push(structuredClone(x.completedSamples[0]))]) {
    const interruption = structuredClone(f.interruption); mutate(interruption);
    assert.throws(() => admitPresentationNativeResumePrefixV001({recipe: f.recipe, interruption}));
  }
});

test('one unchanged completed receipt plus a fresh continuation preserves full decisions and separate-process published reread', async t => {
  const f = await fixture(t), old = f.interruption.completedSamples[0], oldProof = await bind(old.referenceRetention.checkpoint.path);
  const partialDirectory = f.interruption.currentSample.directory, partialFiles = [];
  for (const dir of [partialDirectory, path.join(partialDirectory, 'references')])
    for (const name of await readdir(dir)) if (name.endsWith('.rgb') || name.endsWith('.json')) partialFiles.push(await bind(path.join(dir, name)));
  await f.materializer.releaseAll();
  const commands = [], resumed = await inspectPresentationNativeResumeV001({...f.input, interruptionRef: f.interruptionRef,
    newDirectory: path.join(f.root, 'resumed'), materializer: f.materializer, recoveryBinding: f.recoveryBinding,
    run: async (command, args, purpose) => {commands.push({purpose, args}); return run(command, args);}});
  assert.equal(resumed.status, 'passed'); assert.equal(resumed.evidence.nativeResume.oldReceiptCount, 1);
  checkResumedFiniteExecutionEvidenceV001(resumed.evidence, resumed.inspections, f.input.plan.canvas);
  assert.equal(resumed.evidence.nativeResume.resumedReceiptCount, 2); assert.equal(resumed.evidence.referenceBatchSize, 1);
  assert.deepEqual(resumed.evidence.samples.map(observation), f.baselineResult.evidence.samples.map(observation));
  const replay = await inspectPresentationExactReplayQcV001({plan: f.input.plan, records: f.input.records,
    baseMediaPath: f.input.media.base.path, completedMediaPath: f.input.media.completed.path, expectedFrameCount: 30,
    scratchDirectory: path.join(f.root, 'replay'), ffmpegPath: f.input.tools.ffmpeg.path,
    ffprobePath: await realpath('/opt/homebrew/bin/ffprobe'), serializePngAndFilters: true});
  assert.equal(replay.status, 'passed');
  const combined = combinePresentationNativeResumeIntegrityQcV001({plan: f.input.plan, replay, finite: resumed,
    expectedFrameCount: 30, currentCompletedMediaRef: f.input.media.completed});
  assert.equal(combined.status, 'passed', JSON.stringify(combined.violations));
  const checkInput = {plan: f.input.plan, overlayInspections: combined.inspections, evidence: combined.evidence,
    expectedFrameCount: 30, currentCompletedMediaRef: f.input.media.completed};
  assert.equal(validatePresentationIntegrityStateQcEvidenceV001(checkInput).status, 'failed', 'new resume proof is not mislabeled as old integrity');
  assert.equal(validatePresentationNativeResumeIntegrityQcV001(checkInput).status, 'passed');
  const nativeResultRef = await bind(path.join(f.root, 'resumed', 'native-resume-result.json'));
  const savedNative = await readPresentationQcEvidenceV001(nativeResultRef.path, {expectedFileSha256: nativeResultRef.fileSha256});
  checkResumedFiniteExecutionEvidenceV001(savedNative.evidence, savedNative.inspections, f.input.plan.canvas);
  assert.equal(hashJson(savedNative), hashJson(resumed), 'native result retains its complete canonical identity after shared-store reload');
  const savedIntegrityPath = path.join(f.root, 'resume-integrity.json');
  const savedIntegrity = await writePresentationQcEvidenceV001(savedIntegrityPath, checkInput);
  const restoredCheck = await readPresentationQcEvidenceV001(savedIntegrityPath, {expectedFileSha256: savedIntegrity.fileSha256});
  assert.equal(validatePresentationNativeResumeIntegrityQcV001(restoredCheck).status, 'passed',
    'manifest raw bytes and exact replay remain bound after shared-store key normalization');
  assert.deepEqual(resumed.evidence.samples[0], old); assert.deepEqual(await bind(oldProof.path), oldProof);
  for (const ref of partialFiles) assert.deepEqual(await bind(ref.path), ref);
  assert(commands.filter(row => row.purpose === 'native-reference-composite').every(row =>
    row.args.filter(arg => arg.endsWith('.rgb')).every(arg => arg.includes('/resumed/references/sample-'))));
  assert.equal(f.materializer.metrics.currentMaterializedLogicalBytes, 0);
  const outputDirectory = path.join(f.root, 'published'); await rename(f.stagingDirectory, outputDirectory);
  const publishedFile = path.join(outputDirectory, 'presentation-rendered-v002.mp4');
  const publication = {status: 'published', outputDirectory};
  const candidateVideo = {...await bind(publishedFile), bytes: (await readFile(publishedFile)).length};
  const binding = await createPresentationNativePublicationBindingV001({finiteState: resumed.evidence,
    stagingDirectory: f.stagingDirectory, publication, candidateVideo});
  const context = {binding, finiteState: resumed.evidence, publication, candidateVideo};
  const request = await save(path.join(f.root, 'reread.json'), {samples: resumed.evidence.samples,
    savedIntegrityRef: {path: savedIntegrityPath, fileSha256: savedIntegrity.fileSha256}, nativeResultRef,
    context, manifestRef: f.manifestRef, recoveryBinding: {...f.recoveryBinding,
      controllerRefs: resumed.evidence.nativeResume.controllerRefs}, artifacts: resumed.evidence.outputArtifacts});
  const script = `import {readFile} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
    import {openPresentationNativeLayerRecoveryV001} from ${JSON.stringify(new URL('./presentation_native_layer_recovery_v001.mjs', import.meta.url).href)};
    import {verifyPresentationNativeResumeReceiptsV001,verifyPresentationNativeResumeOutputArtifactsV001} from ${JSON.stringify(new URL('./presentation_native_resume_v001.mjs', import.meta.url).href)};
    import {readPresentationQcEvidenceV001} from ${JSON.stringify(new URL('./presentation_qc_evidence_store_v001.mjs', import.meta.url).href)};
    import {validatePresentationNativeResumeIntegrityQcV001,checkResumedFiniteExecutionEvidenceV001} from ${JSON.stringify(new URL('./presentation_native_resume_integrity_v001.mjs', import.meta.url).href)};
    const data=JSON.parse(await readFile(process.argv[1],'utf8')), map=new Map(data.context.binding.files.map(x=>[x.sourcePath,x.publishedPath]));
    const run=async(command,args)=>{const r=await promisify(execFile)(command,args,{encoding:'buffer'});return {code:0,signal:null,...r}};
    const materializer=await openPresentationNativeLayerRecoveryV001({manifestRef:data.manifestRef,run,resolveInputPath:p=>map.get(p)??p});
    const receipts=await verifyPresentationNativeResumeReceiptsV001({samples:data.samples,materializer,publication:data.context,oldReceiptCount:1,recoveryBinding:data.recoveryBinding});
    const outputs=await verifyPresentationNativeResumeOutputArtifactsV001({artifacts:data.artifacts,materializer,publication:data.context,recoveryBinding:data.recoveryBinding});
    const restored=await readPresentationQcEvidenceV001(data.savedIntegrityRef.path,{expectedFileSha256:data.savedIntegrityRef.fileSha256});
    const native=await readPresentationQcEvidenceV001(data.nativeResultRef.path,{expectedFileSha256:data.nativeResultRef.fileSha256});
    checkResumedFiniteExecutionEvidenceV001(native.evidence,native.inspections,restored.plan.canvas);
    const integrity=validatePresentationNativeResumeIntegrityQcV001(restored);
    console.log(JSON.stringify({receipts,outputs,integrity,live:materializer.metrics.currentMaterializedLogicalBytes}));`;
  const {stdout} = await execute(process.execPath, ['--input-type=module', '-e', script, request.path], {maxBuffer: 1024 * 1024});
  const reread = JSON.parse(stdout); assert.equal(reread.receipts.readerCalls, 3); assert.equal(reread.receipts.readerBypass, 0);
  assert.equal(reread.receipts.oldReceiptCount, 1); assert.equal(reread.receipts.resumedReceiptCount, 2);
  assert.equal(reread.outputs.status, 'passed'); assert.equal(reread.live, 0);
  assert.equal(reread.integrity.status, 'passed', JSON.stringify(reread.integrity.violations));
});

test('missing or altered completed receipts and changed fixed input are rejected before new comparisons', async t => {
  const f = await fixture(t), sample = f.interruption.completedSamples[0], checkpoint = sample.referenceRetention.checkpoint.path;
  const options = {samples: [sample], materializer: f.materializer, recoveryBinding: f.recoveryBinding};
  const original = await readFile(checkpoint); await writeFile(checkpoint, Buffer.concat([original, Buffer.from(' ')]));
  await assert.rejects(verifyPresentationNativeResumeReceiptsV001(options)); await writeFile(checkpoint, original);
  await rename(checkpoint, checkpoint + '.hidden');
  await assert.rejects(verifyPresentationNativeResumeReceiptsV001(options)); await rename(checkpoint + '.hidden', checkpoint);
  await f.materializer.releaseAll();
  const fake = {...f.materializer, ensurePaths: async paths => paths.map(file => f.materializer.manifest.layers.find(row => row.rawRef.path === file).rawRef)};
  await assert.rejects(verifyPresentationNativeResumeReceiptsV001({...options, materializer: fake}), /ENOENT/);
  const plan = structuredClone(f.input.plan); plan.elements[0].text = '変更';
  await assert.rejects(inspectPresentationNativeResumeV001({...f.input, plan, interruptionRef: f.interruptionRef,
    newDirectory: path.join(f.root, 'invalid-input'), materializer: f.materializer, recoveryBinding: f.recoveryBinding,
    run: () => assert.fail('invalid inputs must precede comparison execution')}));
});

test('a new failed point keeps all RGB and remains failed after continuation and receipt reread', async t => {
  const f = await fixture(t, {wrongSecondCaption: true}); await f.materializer.releaseAll();
  const resumed = await inspectPresentationNativeResumeV001({...f.input, interruptionRef: f.interruptionRef,
    newDirectory: path.join(f.root, 'resumed'), materializer: f.materializer, recoveryBinding: f.recoveryBinding});
  assert.equal(resumed.status, 'failed'); assert.deepEqual(resumed.violations, f.baselineResult.violations);
  const failed = resumed.evidence.samples.find(sample => sample.visible === false); assert(failed);
  assert.equal(failed.referenceRetention.state, 'retained');
  for (const ref of failed.referenceRetention.artifacts) assert.equal(await hashPresentationNativeFileV001(ref.path), ref.fileSha256);
  const reread = await verifyPresentationNativeResumeReceiptsV001({samples: resumed.evidence.samples,
    oldReceiptCount: 1, materializer: f.materializer, recoveryBinding: f.recoveryBinding});
  assert.equal(reread.status, 'passed'); assert.equal(failed.visible, false); assert.equal(f.materializer.metrics.currentMaterializedLogicalBytes, 0);
});

test('capacity interruption and child failure preserve the completed prefix without claiming a new result', async t => {
  const f = await fixture(t), original = await bind(f.interruptionRef.path);
  await f.materializer.releaseAll();
  for (const failure of ['capacity', 'child']) {
    const newDirectory = path.join(f.root, 'interrupted-' + failure);
    let saved;
    await assert.rejects(inspectPresentationNativeResumeV001({...f.input, interruptionRef: f.interruptionRef,
      newDirectory, materializer: f.materializer, recoveryBinding: f.recoveryBinding,
      executionControl: failure === 'capacity' ? {beforeHeavyBatch: event => {
        if (event.phase === 'native-resume-sample-start') throw Object.assign(Error('capacity refusal'), {code: 'CAPACITY'});
      }} : null,
      run: async (command, args, purpose) => {
        if (failure === 'child' && purpose === 'native-reference-composite') throw Error('child failure');
        return run(command, args);
      }}), error => {saved = error.nativeResumeFailure; return true;});
    assert(saved); assert.equal(saved.nextSampleIndex, 1);
    const evidence = await readPresentationQcEvidenceV001(saved.path, {expectedFileSha256: saved.fileSha256});
    assert.equal(evidence.status, 'incomplete'); assert.equal(evidence.completedSamples.length, 1);
    assert.deepEqual(evidence.completedSamples, f.interruption.completedSamples);
    await assert.rejects(readFile(path.join(newDirectory, 'native-resume-result.json')), {code: 'ENOENT'});
    assert.deepEqual(await bind(f.interruptionRef.path), original);
  }
});

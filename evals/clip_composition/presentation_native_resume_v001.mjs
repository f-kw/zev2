/** Explicit continuation of saved native QC. The four receipt-bound QC cores
 * remain unchanged; missing raw inputs are restored before their readers run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, readFile, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {scopeOrchestrationPlanV001} from './presentation_orchestration_render_scope_v001.mjs';
import {getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from './presentation_caption_motion_v001.mjs';
import {buildPresentationNativeFrameQcRecipeV001, buildPresentationNativeFrameBatchPlanV001,
  readPresentationNativeFrameBatchOutputsV001, buildPresentationNativeLayerPlanV001,
  buildPresentationNativeReferenceArgumentsV001, verifyPresentationNativeInputRefV001,
  validatePresentationNativeFrameQcInspectionsV001, PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
  PRESENTATION_NATIVE_FRAME_QC_BASIS_V001} from './presentation_native_frame_qc_v001.mjs';
import {processPresentationNativeSampleV001, verifyPresentationNativeSampleReceiptsV001,
  createPresentationNativePublicationBindingV001, hashPresentationNativeFileV001,
  PRESENTATION_NATIVE_STREAM_EXECUTION_V001, PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001}
  from './presentation_native_qc_streaming_v001.mjs';

export const PRESENTATION_NATIVE_RESUME_EXECUTION_V001 = 'native-materialized-input-resume-v001';
const self = fileURLToPath(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(canonicalJson(value));
const same = (a, b, message) => assert.equal(canonicalJson(a), canonicalJson(b), message);
const clone = structuredClone;
const identity = ref => ({path: ref.path, fileSha256: ref.fileSha256});
const roleRef = ref => ({role: ref.role, ...identity(ref),
  ...(ref.canonicalSha256 === undefined ? {} : {canonicalSha256: ref.canonicalSha256})});
const recipeOnly = sample => ({instructionId: sample.instructionId, frame: sample.frame,
  mediaFrame: sample.mediaFrame, expectedState: sample.expectedState, expectedOverlaySha256: sample.expectedOverlaySha256,
  crop: sample.crop, references: sample.references.map(({id, kind, layers}) => ({id, kind, layers}))});
const processIdentity = row => ({purpose: row.purpose, command: row.command, args: row.args,
  argumentsCanonicalSha256: row.argumentsCanonicalSha256, code: row.code, signal: row.signal,
  stdoutSha256: row.stdoutSha256, stderrSha256: row.stderrSha256, failed: row.failed ?? false});
const inside = (root, file) => {const rel = path.relative(root, file);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));};
async function verify(ref) {
  assert(path.isAbsolute(ref?.path ?? '') && /^[a-f0-9]{64}$/.test(ref.fileSha256 ?? ''), 'invalid file binding');
  const info = await lstat(ref.path); assert(info.isFile() && !info.isSymbolicLink(), 'bound file is not regular');
  await verifyPresentationNativeInputRefV001(ref);
  if (ref.bytes !== undefined) assert.equal(info.size, ref.bytes, 'bound byte count differs');
}
async function readJsonRef(ref) {await verify(ref); return JSON.parse(await readFile(ref.path, 'utf8'));}
async function readReceipt(sample) {
  return readPresentationQcEvidenceV001(sample.referenceRetention.checkpoint.path,
    {expectedFileSha256: sample.referenceRetention.checkpoint.fileSha256});
}
function receiptRawRefs(proof, materializer, map) {
  same(proof.nativeLayers, materializer.manifest.nativeLayers, 'receipt and recovery layer recipes differ');
  same(proof.sceneBindings, materializer.manifest.sceneBindings, 'receipt and recovery scene bindings differ');
  same(identity(proof.tools.ffmpeg), identity(materializer.manifest.tool), 'receipt recovery decoder differs');
  return proof.inputRefs.filter(ref => map.has(ref.path));
}
function rawMap(materializer) {
  assert(materializer && ['ensurePaths', 'releaseExcept', 'releaseAll'].every(key => typeof materializer[key] === 'function'),
    'explicit raw materializer required');
  const entries = materializer.manifest?.layers;
  assert(Array.isArray(entries) && entries.length > 0, 'raw recovery manifest missing');
  const map = new Map(entries.map(row => [row.rawRef.path, row]));
  assert.equal(map.size, entries.length, 'raw recovery paths duplicate');
  return map;
}
async function ensureRaw(materializer, refs) {
  const unique = [...new Map(refs.map(ref => [ref.path, ref])).values()], map = rawMap(materializer);
  for (const ref of unique) same(identity(map.get(ref.path)?.rawRef ?? {}), identity(ref), 'raw recovery identity differs');
  const restored = await materializer.ensurePaths(unique.map(ref => ref.path));
  same(restored.map(identity), unique.map(identity), 'materializer returned different raw identities');
  // The unchanged reader independently checks these actual files immediately
  // afterwards. No missing-file exception or successful verification cache.
  return restored;
}
async function recoveryIdentity(materializer, binding) {
  assert(binding?.manifestRef, 'recovery manifest reference required');
  same(identity(binding.manifestRef), identity(materializer.manifestRef), 'recovery manifest binding differs');
  await verify(binding.manifestRef);
  const controllerRefs = [{path: self, fileSha256: await hashPresentationNativeFileV001(self)},
    ...(materializer.controllerRefs ?? []).map(identity)];
  for (const ref of binding.controllerRefs ?? []) {
    await verify(ref);
    const current = controllerRefs.find(row => row.path === ref.path);
    if (current) same(identity(current), identity(ref), 'controller changed');
    else controllerRefs.push(identity(ref));
  }
  for (const ref of controllerRefs) await verify(ref);
  return {recoveryManifestRef: identity(binding.manifestRef), controllerRefs};
}

/** Structural admission only. Byte-based admission is always performed by the
 * unchanged sample reader before any index is skipped. */
export function admitPresentationNativeResumePrefixV001({recipe, interruption}) {
  assert.equal(interruption?.schemaVersion, 'native-frame-qc-interrupted-v001');
  assert.equal(interruption.status, 'incomplete');
  assert.equal(interruption.expectedSampleCount, recipe.samples.length, 'saved recipe coverage differs');
  const saved = interruption.completedSamples;
  assert(Array.isArray(saved) && Number.isSafeInteger(interruption.nextSampleIndex), 'completed prefix missing');
  assert.equal(saved.length, interruption.nextSampleIndex, 'completed prefix is not contiguous');
  assert(saved.length < recipe.samples.length, 'interruption cannot claim complete QC');
  assert(Array.isArray(interruption.sampleMeasurements) && interruption.sampleMeasurements.length === saved.length,
    'completed measurements differ from prefix');
  same(interruption.sceneBindings, recipe.sceneBindings, 'saved scene bindings differ');
  for (const [index, sample] of saved.entries()) {
    same(recipeOnly(sample), recipeOnly(recipe.samples[index]), 'saved prefix recipe differs at ' + index);
    assert.equal(sample.visible, true, 'only a verified passing prefix may be skipped');
    assert.equal(sample.referenceRetention?.state, 'released-verified-pass', 'verified released receipt required for prefix reuse');
    assert.equal(sample.completedRgb.path, path.join(interruption.referenceDirectory, 'sample-' + index, 'completed.rgb'));
    assert.equal(sample.referenceRetention.checkpoint.path,
      path.join(interruption.referenceDirectory, 'sample-' + index, 'sample-proof.json'));
  }
  if (interruption.currentSample !== null) {
    const current = interruption.currentSample, wanted = recipe.samples[saved.length];
    assert.equal(current.sampleIndex, saved.length, 'partial sample overlaps or skips prefix');
    assert.equal(current.instructionId, wanted.instructionId); assert.equal(current.frame, wanted.frame);
    assert.equal(current.directory, path.join(interruption.referenceDirectory, 'sample-' + saved.length));
  }
  return {oldReceiptCount: saved.length, nextSampleIndex: saved.length, expectedSampleCount: recipe.samples.length};
}

/** One receipt at a time, including after atomic publication. Raw bytes exist at
 * the original paths while the existing reader verifies them. */
export async function verifyPresentationNativeResumeReceiptsV001({samples, materializer, publication = null,
  oldReceiptCount = 0, recoveryBinding}) {
  assert(Array.isArray(samples) && Number.isSafeInteger(oldReceiptCount)
    && oldReceiptCount >= 0 && oldReceiptCount <= samples.length, 'receipt coverage is invalid');
  const binding = await recoveryIdentity(materializer, recoveryBinding), map = rawMap(materializer);
  let next = samples.length ? await readReceipt(samples[0]) : null, verifiedFileCount = 0;
  const initialMetrics = clone(materializer.metrics);
  for (const [index, sample] of samples.entries()) {
    const proof = next, refs = receiptRawRefs(proof, materializer, map);
    await ensureRaw(materializer, refs);
    const result = await verifyPresentationNativeSampleReceiptsV001({samples: [sample], publication});
    verifiedFileCount += result.verifiedFileCount;
    next = index + 1 < samples.length ? await readReceipt(samples[index + 1]) : null;
    await materializer.releaseExcept(next ? receiptRawRefs(next, materializer, map).map(ref => ref.path) : []);
  }
  return {status: 'passed', samples: samples.length, oldReceiptCount,
    resumedReceiptCount: samples.length - oldReceiptCount, readerCalls: samples.length, readerBypass: 0,
    verifiedFileCount, verifiedFileCountMeaning: 'sum of unchanged per-sample reader checks; shared inputs repeat',
    materializationBefore: initialMetrics, materializationAfter: clone(materializer.metrics), ...binding};
}

/** Verify all retained outputs, restoring raw groups with the same source PNG
 * one at a time. This never restores the entire raw layer plan simultaneously. */
export async function verifyPresentationNativeResumeOutputArtifactsV001({artifacts, materializer,
  publication = null, recoveryBinding}) {
  const binding = await recoveryIdentity(materializer, recoveryBinding), map = rawMap(materializer);
  let mapping = new Map();
  if (publication !== null) {
    const actual = await createPresentationNativePublicationBindingV001({...publication,
      stagingDirectory: publication.binding.stagingDirectory});
    same(actual, publication.binding, 'publication binding differs');
    mapping = new Map(actual.files.map(row => [row.sourcePath, row.publishedPath]));
  }
  const groups = new Map(), unique = new Map();
  for (const ref of artifacts) {
    if (unique.has(ref.path)) same(identity(unique.get(ref.path)), identity(ref), 'output identity conflicts');
    else unique.set(ref.path, ref);
  }
  for (const ref of unique.values()) {
    if (!map.has(ref.path)) await verify({...ref, path: mapping.get(ref.path) ?? ref.path});
    else {
      const key = map.get(ref.path).sourceSha256;
      assert(typeof key === 'string', 'raw recovery source identity missing');
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(ref);
    }
  }
  await materializer.releaseAll();
  for (const refs of groups.values()) {
    await ensureRaw(materializer, refs);
    for (const ref of refs) await verify(ref);
    await materializer.releaseAll();
  }
  return {status: 'passed', verifiedFileCount: unique.size, rawFileCount: [...groups.values()].flat().length,
    readerBypass: 0, ...binding};
}

async function fixedInputs({plan, records, provenance, media, tools, interruption, renderRange}) {
  assert.equal(renderRange, null, 'this continuation requires the saved full native recipe');
  assert.equal(provenance.planCanonicalSha256, digest(plan));
  const declared = provenance.inputRefs.map(roleRef), get = role => declared.find(ref => ref.role === role);
  const normalRef = get('baseline-plan'), planRef = get('plan'), autoRef = get('auto-input'), viewRef = get('orchestration-input');
  assert(normalRef && planRef && Boolean(autoRef) !== Boolean(viewRef), 'fixed source references incomplete');
  const decision = await readJsonRef(viewRef ?? autoRef), original = await readJsonRef(normalRef);
  const view = viewRef ? restoreOrchestrationDrawingViewEvidenceV001(decision) : undefined;
  if (view) assert.equal(digest(original), view.sourceContext.baselineRef.canonicalSha256);
  const baselinePlan = scopeOrchestrationPlanV001(view?.projectedNormalPlan ?? original, renderRange);
  same(await readJsonRef(planRef), plan, 'fixed resolved plan differs');
  const autoPresentation = autoRef ? decision : undefined, orchestrationInput = viewRef ? decision : undefined;
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation,
    records, orchestrationDrawingView: view, renderRange});
  const refs = [...declared.filter(ref => !['plan', 'baseline-plan', 'auto-input', 'orchestration-input'].includes(ref.role)),
    {...planRef, canonicalSha256: digest(plan)}, {...normalRef, canonicalSha256: digest(original)},
    {...(viewRef ?? autoRef), canonicalSha256: digest(decision)},
    roleRef({role: 'base-media', ...media.base}), roleRef({role: 'completed-media', ...media.completed}),
    roleRef({role: 'tool-ffmpeg', ...tools.ffmpeg}), roleRef({role: 'tool-imagemagick', ...tools.imageMagick}),
    ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({
      role: 'png-' + row.bindingId, path: row.pngPath, fileSha256: row.pngSha256}))]
    .sort((a, b) => a.role < b.role ? -1 : a.role > b.role ? 1 : 0);
  assert.equal(new Set(refs.map(ref => ref.role)).size, refs.length, 'input roles duplicate');
  const observed = refs.map(({role, path: file, fileSha256}) => ({role, path: file, fileSha256}));
  const manifest = {planCanonicalSha256: digest(plan), baselinePlanCanonicalSha256: digest(baselinePlan),
    ...(viewRef ? {orchestrationInputCanonicalSha256: digest(decision)} : {autoPresentationCanonicalSha256: digest(decision)}),
    inputRefs: refs, inputRefsCanonicalSha256: digest(refs), before: observed, after: []};
  same(interruption.inputManifest, manifest, 'interrupted input manifest differs from current fixed inputs');
  for (const ref of refs) await verify(ref);
  return {recipe, baselinePlan, autoPresentation, orchestrationInput, manifest};
}
function requiredRaw(sample, sceneBindings, nativeLayers, map) {
  const args = buildPresentationNativeReferenceArgumentsV001({sample, sceneBindings, nativeLayers,
    baseFramePath: sample.baseFrame.path,
    outputPaths: sample.references.map((_row, index) => path.join(nativeLayers.directory, 'unused-' + index + '.rgb'))});
  return [...new Set(args.filter((value, index) => args[index - 1] === '-i' && map.has(value)))];
}
async function execute(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']}), out = [], err = [];
    child.stdout.on('data', bytes => out.push(bytes)); child.stderr.on('data', bytes => err.push(bytes));
    child.on('error', reject); child.on('close', (code, signal) => code === 0 && signal === null
      ? resolve({code, signal, stdout: Buffer.concat(out), stderr: Buffer.concat(err)})
      : reject(new Error('native resume child failed: ' + code + '/' + signal)));
  });
}

/** Read-only admission before releasing original raw layers. It verifies
 * complete fixed input bytes and derives recipes, but executes no process and
 * never materializes/releases raw files or writes a continuation directory. */
export async function validatePresentationNativeResumeInputsV001({plan, records, provenance, media, tools,
  interruptionRef, materializer, recoveryBinding, renderRange = null}) {
  const source = await readPresentationQcEvidenceV001(interruptionRef.path,
    {expectedFileSha256: interruptionRef.fileSha256});
  const bound = await fixedInputs({plan, records, provenance, media, tools, interruption: source, renderRange});
  const admission = admitPresentationNativeResumePrefixV001({recipe: bound.recipe, interruption: source});
  const binding = await recoveryIdentity(materializer, recoveryBinding), map = rawMap(materializer);
  same(materializer.manifest.nativeLayers, source.nativeLayers, 'recovery layer plan differs');
  same(materializer.manifest.sceneBindings, source.sceneBindings, 'recovery scene bindings differ');
  same(identity(materializer.manifest.tool), identity(tools.ffmpeg), 'recovery decoder differs');
  assert(materializer.manifest.sourceEvidenceRefs.some(ref => ref.path === interruptionRef.path
    && ref.fileSha256 === interruptionRef.fileSha256), 'recovery manifest does not bind this interruption');
  same(buildPresentationNativeLayerPlanV001({samples: bound.recipe.samples, sceneBindings: bound.recipe.sceneBindings,
    directory: source.nativeLayers.directory, canvas: plan.canvas}), source.nativeLayers, 'saved layer recipe differs');
  same(buildPresentationNativeFrameBatchPlanV001({samples: bound.recipe.samples, directory: source.frameExtraction.directory}),
    source.frameExtraction, 'saved frame extraction differs');
  const oldOutputs = new Map(source.outputArtifacts.map(ref => [ref.path, ref]));
  assert.equal(oldOutputs.size, source.outputArtifacts.length, 'saved generated output paths duplicate');
  for (const {rawRef} of map.values()) same(identity(oldOutputs.get(rawRef.path) ?? {}), identity(rawRef), 'original raw binding missing');
  return {status: 'fixed-inputs-and-prefix-structure-verified', receiptByteAdmission: 'not-run',
    source, bound, admission, binding};
}

export async function inspectPresentationNativeResumeV001({plan, records, provenance, media, tools,
  interruptionRef, newDirectory, materializer, recoveryBinding, run = execute, processObserver = null,
  executionControl = null, renderRange = null, signal = null, referenceBatchSize = null}) {
  const started = performance.now(), phasesMilliseconds = {}, controllerProcesses = [];
  const timed = async (name, fn) => {const start = performance.now(); try {return await fn();}
    finally {phasesMilliseconds[name] = (phasesMilliseconds[name] ?? 0) + performance.now() - start;}};
  const cancelled = () => {if (signal?.aborted) throw signal.reason ?? Error('native resume cancelled');};
  const {source, bound, admission, binding} = await timed('fixedInputAdmission', () =>
    validatePresentationNativeResumeInputsV001({plan, records, provenance, media, tools,
      interruptionRef, materializer, recoveryBinding, renderRange}));
  const {recipe, baselinePlan, autoPresentation, orchestrationInput, manifest} = bound;
  const map = rawMap(materializer);
  assert(path.isAbsolute(newDirectory) && !inside(source.workDirectory, newDirectory), 'resume requires a separate unused directory');
  await mkdir(newDirectory); const referenceDirectory = path.join(newDirectory, 'references'); await mkdir(referenceDirectory);
  const oldOutputs = new Map(source.outputArtifacts.map(ref => [ref.path, ref]));
  const frames = await timed('savedFrameRead', async () => {
    const found = await readPresentationNativeFrameBatchOutputsV001(source.frameExtraction);
    for (const row of found) for (const ref of [row.baseFrame, row.completedFrame])
      same(identity(oldOutputs.get(ref.path) ?? {}), ref, 'saved frame bytes changed');
    return new Map(found.map(row => [row.frame, {baseFrame: row.baseFrame, completedFrame: row.completedFrame}]));
  });
  const samples = clone(source.completedSamples), sampleMeasurements = clone(source.sampleMeasurements);
  const outputArtifacts = clone(source.outputArtifacts), resumedProcesses = [], oldComparisonProcesses = [];
  const firstComparison = source.processes.findIndex(row => row.purpose === 'completed-rgb-crop');
  const previousPreparation = firstComparison < 0 ? source.processes.length : firstComparison;
  const preparationProcesses = source.processes.slice(0, previousPreparation);
  const runner = async (command, args, purpose) => processObserver
    ? processObserver.run(command, args, {allowedExitCodes: [0], observationLabel: 'native-qc-resume-' + purpose})
    : run(command, args, purpose);
  let currentSample = null, cursor = previousPreparation;
  const nativeResume = {schemaVersion: PRESENTATION_NATIVE_RESUME_EXECUTION_V001,
    sourceInterruptionRef: identity(interruptionRef), referenceDirectory, oldReceiptCount: samples.length,
    resumedReceiptCount: 0, preparationProcessCount: preparationProcesses.length,
    oldComparisonProcessCount: 0, resumedProcessCount: 0, readerBypass: 0,
    segments: [{startSampleIndex: 0, endSampleIndexExclusive: samples.length,
      referenceDirectory: source.referenceDirectory}, {startSampleIndex: samples.length,
      endSampleIndexExclusive: recipe.samples.length, referenceDirectory}],
    sourceCompletedSamplesCanonicalSha256: digest(source.completedSamples),
    sourceOutputArtifactsCanonicalSha256: digest(source.outputArtifacts),
    sourceInputRefsCanonicalSha256: digest(source.inputManifest.inputRefs),
    sourceSceneBindingsCanonicalSha256: digest(source.sceneBindings),
    sourceFrameExtractionCanonicalSha256: digest(source.frameExtraction),
    sourceNativeLayersCanonicalSha256: digest(source.nativeLayers), ...binding};
  try {
    cancelled();
    await timed('oldReceiptAdmission', async () => {
      for (const [index, sample] of samples.entries()) {
        same(sample.baseFrame, frames.get(sample.frame).baseFrame); same(sample.completedFrame, frames.get(sample.frame).completedFrame);
        const proof = await readReceipt(sample);
        if (referenceBatchSize === null) referenceBatchSize = proof.batchSize;
        assert.equal(proof.batchSize, referenceBatchSize, 'saved comparison batch sizes differ');
        await ensureRaw(materializer, receiptRawRefs(proof, materializer, map));
        await verifyPresentationNativeSampleReceiptsV001({samples: [sample]});
        same(proof.nativeLayers, source.nativeLayers); same(proof.sceneBindings, recipe.sceneBindings);
        for (const process of proof.processes) {
          same(processIdentity(source.processes[cursor++]), processIdentity(process), 'completed process prefix differs');
          oldComparisonProcesses.push(source.processes[cursor - 1]);
        }
        const next = {...recipe.samples[index + 1], ...frames.get(recipe.samples[index + 1].frame)};
        await materializer.releaseExcept(requiredRaw(next, recipe.sceneBindings, source.nativeLayers, map));
      }
    });
    referenceBatchSize ??= PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001;
    assert(Number.isSafeInteger(referenceBatchSize) && referenceBatchSize > 0, 'invalid comparison batch size');
    nativeResume.oldComparisonProcessCount = oldComparisonProcesses.length;
    nativeResume.sourceProcessesCanonicalSha256 = digest([...preparationProcesses, ...oldComparisonProcesses]);
    const versions = {};
    for (const [name, tool] of Object.entries(tools)) {
      assert(['ffmpeg', 'imageMagick'].includes(name));
      const result = await runner(tool.path, ['-version'], 'resume-tool-version');
      assert.equal(result.code, 0); assert.equal(result.signal ?? null, null);
      const previous = preparationProcesses.find(row => row.purpose === 'tool-version' && row.command === tool.path);
      assert(previous); assert.equal(hash(result.stdout), previous.stdoutSha256, 'bound tool version changed');
      versions[name] = result.stdout.toString('utf8');
      controllerProcesses.push({purpose: 'resume-tool-version', command: tool.path, args: ['-version'],
        code: 0, signal: null, stdoutSha256: hash(result.stdout), stderrSha256: hash(result.stderr)});
    }
    for (let index = samples.length; index < recipe.samples.length; index++) {
      cancelled(); const sample = {...recipe.samples[index], ...frames.get(recipe.samples[index].frame)};
      const directory = path.join(referenceDirectory, 'sample-' + index);
      currentSample = {sampleIndex: index, instructionId: sample.instructionId, frame: sample.frame, directory};
      await executionControl?.beforeHeavyBatch?.(clone({...currentSample, phase: 'native-resume-sample-start',
        outputPaths: [], outputCount: 0, plannedLogicalBytes: 0}));
      const preparedArtifacts = await timed('rawMaterialization', () => ensureRaw(materializer,
        requiredRaw(sample, recipe.sceneBindings, source.nativeLayers, map).map(file => oldOutputs.get(file))));
      const result = await timed('resumedSamples', () => processPresentationNativeSampleV001({sample,
        sceneBindings: recipe.sceneBindings, nativeLayers: source.nativeLayers, preparedArtifacts, tools,
        directory, run: runner, sampleIndex: index, executionControl, signal,
        batchSize: referenceBatchSize,
        retention: 'verified-pass-regenerable-v001'}));
      await timed('newReceiptRead', () => verifyPresentationNativeSampleReceiptsV001({samples: [result.sample]}));
      samples.push(result.sample); outputArtifacts.push(...result.outputArtifacts); resumedProcesses.push(...result.processes);
      sampleMeasurements.push(result.metrics); nativeResume.resumedReceiptCount++; nativeResume.resumedProcessCount = resumedProcesses.length;
      currentSample = null;
      const next = index + 1 < recipe.samples.length
        ? {...recipe.samples[index + 1], ...frames.get(recipe.samples[index + 1].frame)} : null;
      await timed('rawRelease', () => materializer.releaseExcept(next
        ? requiredRaw(next, recipe.sceneBindings, source.nativeLayers, map) : []));
      await executionControl?.afterSample?.(clone({phase: 'native-sample-complete', sampleIndex: index,
        instructionId: result.sample.instructionId, frame: result.sample.frame, directory,
        visible: result.sample.visible, referenceRetention: result.sample.referenceRetention,
        metrics: result.metrics, outputArtifacts: result.outputArtifacts, completedSampleCount: samples.length}));
    }
    await timed('finalInputRead', async () => {
      for (const ref of manifest.inputRefs) await verify(ref);
      manifest.after = manifest.inputRefs.map(({role, path: file, fileSha256}) => ({role, path: file, fileSha256}));
      await verify(interruptionRef); await recoveryIdentity(materializer, recoveryBinding);
    });
    await timed('finalOutputRead', () => verifyPresentationNativeResumeOutputArtifactsV001({artifacts: outputArtifacts,
      materializer, recoveryBinding}));
    assert.equal(typeof materializer.getProvenance, 'function', 'materializer execution provenance required');
    nativeResume.materializationEvidence = materializer.getProvenance();
    same(identity(nativeResume.materializationEvidence.manifestRef), binding.recoveryManifestRef,
      'materialization provenance is bound to another recovery manifest');
    const inspections = records.map(record => {
      const element = record.element, local = samples.filter(sample => sample.instructionId === element.instructionId);
      const representativeFrame = Object.hasOwn(element, 'presentationPulse')
        ? getPresentationPulseProgramV001({element, canvas: plan.canvas}).maximumFrame
        : Object.hasOwn(element, 'presentationMotion')
          ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).representativeFrame
          : element.startFrame + Math.floor(element.displayFrameCount / 2);
      const inspection = {...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
        representativeFrame, nativeFrameQc: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
          instructionId: element.instructionId, baselinePlan, autoPresentation, orchestrationInput, inputManifest: manifest,
          renderRange, sceneBindings: recipe.sceneBindings, samples: local}};
      delete inspection.changedPixelsAgainstInstructionOmittedFrame; return inspection;
    });
    const validation = validatePresentationNativeFrameQcInspectionsV001({plan, inspections, renderRange});
    const evidence = {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, inputManifest: manifest,
      baselinePlan, autoPresentation, orchestrationInput, renderRange, sceneBindings: recipe.sceneBindings, samples,
      processes: [...preparationProcesses, ...oldComparisonProcesses, ...resumedProcesses],
      executionMethod: PRESENTATION_NATIVE_STREAM_EXECUTION_V001,
      referenceBatchSize, sampleMeasurements,
      frameExtraction: source.frameExtraction, nativeLayers: source.nativeLayers,
      referenceDirectory: source.referenceDirectory, outputArtifacts, executableVersions: versions,
      nativeResume: {...nativeResume, controllerProcesses, rawMaterialization: clone(materializer.metrics)}};
    const result = {status: validation.status, violations: validation.violations, inspections, evidence,
      performance: {wallClockMs: performance.now() - started, phasesMilliseconds, oldReceiptCount: admission.oldReceiptCount,
        resumedReceiptCount: nativeResume.resumedReceiptCount, readerBypass: 0, rawMaterialization: clone(materializer.metrics)}};
    await writePresentationQcEvidenceV001(path.join(newDirectory, 'native-resume-result.json'), result);
    return result;
  } catch (error) {
    const failure = {schemaVersion: 'native-resume-interrupted-v001', status: 'incomplete', reason: error.message,
      code: error.code ?? null, capacityObservation: error.capacityObservation ?? null,
      sampleFailure: error.nativeSampleFailure ?? null,
      sourceInterruptionRef: identity(interruptionRef), nativeResume, nextSampleIndex: samples.length, currentSample,
      completedSamples: samples, resumedProcesses, controllerProcesses, outputArtifacts, sampleMeasurements,
      materialization: clone(materializer.metrics), performance: {wallClockMs: performance.now() - started, phasesMilliseconds}};
    const saved = await writePresentationQcEvidenceV001(path.join(newDirectory, 'native-resume-interrupted.json'), failure);
    error.nativeResumeFailure = {path: path.join(newDirectory, 'native-resume-interrupted.json'), fileSha256: saved.fileSha256,
      bytes: saved.bytes, nextSampleIndex: samples.length, currentSample};
    throw error;
  }
}

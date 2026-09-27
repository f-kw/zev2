import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile, stat, lstat, unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationNativeReferenceExecutionV001, buildPresentationNativeReferenceArgumentsV001,
  classifyPresentationNativeReferenceFilesV001} from './presentation_native_frame_qc_v001.mjs';
import {writePresentationQcEvidenceV001, readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';

export const PRESENTATION_NATIVE_STREAM_EXECUTION_V001 = 'sample-batched-native-references-v003';
export const PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001 = 32;
const requiredCodePaths = ['presentation_native_qc_streaming_v001.mjs', 'presentation_native_frame_qc_v001.mjs',
  'presentation_qc_evidence_store_v001.mjs', 'presentation_caption_contract_v002.mjs']
  .map(name => fileURLToPath(new URL(name, import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const equal = (a, b) => canonicalJson(a) === canonicalJson(b);
const requireValue = (condition, message) => {if (!condition) throw new Error('native streaming QC: ' + message);};
export async function hashPresentationNativeFileV001(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
const checkFile = async ref => {
  requireValue((await stat(ref.path)).isFile(), 'input is not a regular file: ' + ref.path);
  requireValue(await hashPresentationNativeFileV001(ref.path) === ref.fileSha256, 'file SHA mismatch: ' + ref.path);
};
const recipeOnly = sample => ({instructionId: sample.instructionId, frame: sample.frame,
  mediaFrame: sample.mediaFrame, expectedState: sample.expectedState, expectedOverlaySha256: sample.expectedOverlaySha256,
  crop: sample.crop, references: sample.references.map(({id, kind, layers}) => ({id, kind, layers})),
  baseFrame: sample.baseFrame, completedFrame: sample.completedFrame});

function checkSampleProof(proof) {
  const {sample, sceneBindings, nativeLayers, tools, batchSize, processes, artifacts, inputRefs} = proof;
  requireValue(proof.schemaVersion === 'native-sample-proof-v001' && Number.isSafeInteger(batchSize) && batchSize > 0
    && equal(Object.keys(tools).sort(), ['ffmpeg', 'imageMagick']) && Array.isArray(processes)
    && hashJson(sceneBindings) === proof.sceneBindingsSha256 && hashJson(nativeLayers) === proof.nativeLayersSha256,
  'invalid sample proof header');
  const directory = path.dirname(sample.completedRgb.path), crop = sample.crop;
  const executions = buildPresentationNativeReferenceExecutionV001({sample, sceneBindings, nativeLayers,
    directory: path.join(directory, 'references')});
  const fresh = [...new Map(executions.map(row => [row.key, row])).values()];
  requireValue(equal(artifacts, fresh.map(row => ({path: row.path, fileSha256: row.reference.rgbSha256,
    bytes: crop.width * crop.height * 3}))) && executions.every(row => row.path === row.reference.rgbPath),
  'sample proof reference artifacts differ');
  const expectedProcesses = [{purpose: 'completed-rgb-crop', command: tools.imageMagick.path,
    args: [sample.completedFrame.path, '-crop', crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
      '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], stdoutSha256: sample.completedRgbSha256}];
  for (let offset = 0; offset < fresh.length; offset += batchSize) {
    const batch = fresh.slice(offset, offset + batchSize);
    expectedProcesses.push({purpose: 'native-reference-composite', command: tools.ffmpeg.path,
      args: buildPresentationNativeReferenceArgumentsV001({sample: {...sample, references: batch.map(row => row.reference)},
        sceneBindings, baseFramePath: sample.baseFrame.path, nativeLayers, outputPaths: batch.map(row => row.path)}),
      stdoutSha256: hash(Buffer.alloc(0))});
  }
  requireValue(processes.length === expectedProcesses.length && processes.every((row, index) => {
    const expected = expectedProcesses[index];
    return row.purpose === expected.purpose && row.command === expected.command && equal(row.args, expected.args)
      && row.argumentsCanonicalSha256 === hashJson(expected.args) && row.code === 0 && row.signal === null
      && !row.failed && row.stdoutSha256 === expected.stdoutSha256 && /^[a-f0-9]{64}$/.test(row.stderrSha256);
  }), 'sample proof process chain is incomplete or altered');
  const inputByPath = new Map(inputRefs.map(ref => [ref.path, ref]));
  requireValue(inputByPath.size === inputRefs.length, 'sample proof input identities duplicated');
  for (const file of requiredCodePaths) requireValue(/^[a-f0-9]{64}$/.test(inputByPath.get(file)?.fileSha256 ?? ''),
    'sample proof required code input missing');
  for (const ref of [sample.baseFrame, sample.completedFrame, ...Object.values(tools)])
    requireValue(inputByPath.get(ref.path)?.fileSha256 === ref.fileSha256, 'sample proof required input missing');
  const usedBindings = new Set(sample.references.flatMap(row => row.layers.map(layer => layer.bindingId)));
  for (const group of sceneBindings) for (const binding of [...group.states, ...group.alternates])
    if (usedBindings.has(binding.bindingId)) requireValue(inputByPath.get(binding.pngPath)?.fileSha256 === binding.pngSha256,
      'sample proof source PNG missing');
  const usedInputs = expectedProcesses.flatMap(row => row.args.filter((_value, index) => row.args[index - 1] === '-i'));
  for (const file of usedInputs) requireValue(inputByPath.has(file), 'sample proof prepared input missing');
}

async function execute(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    const stdout = [], stderr = [];
    child.stdout.on('data', bytes => stdout.push(bytes)); child.stderr.on('data', bytes => stderr.push(bytes));
    child.on('error', reject);
    child.on('close', (code, signal) => code === 0 && signal === null
      ? resolve({code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)})
      : reject(Object.assign(new Error('comparison child failed'), {code, signal, stderr: Buffer.concat(stderr).toString()})));
  });
}

/** One complete finite sample. Batching changes resource use, never candidate order or the composite builder. */
export async function processPresentationNativeSampleV001({sample: suppliedSample, sceneBindings, nativeLayers,
  directory, tools, run: executor = execute, batchSize = PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001,
  retention = 'retain-all', baselineSample = null, preparedArtifacts = [], signal = null}) {
  requireValue(path.isAbsolute(directory) && Number.isSafeInteger(batchSize) && batchSize > 0,
    'absolute unused directory and positive execution batch size required');
  requireValue(['retain-all', 'verified-pass-regenerable-v001'].includes(retention), 'unknown retention policy');
  const sample = recipeOnly(suppliedSample), started = performance.now();
  const processes = [], phases = {}, artifacts = [];
  const metrics = {logicalReferenceCount: sample.references.length, referenceRgbOutputs: 0, reusedReferenceRgbCount: 0,
    exactDistanceCalculations: 0, reusedExactDistances: 0, peakReferenceBytes: 0, retainedReferenceBytes: 0,
    generatedReferenceBytes: 0, referenceReadBytes: 0, baselineReadBytes: 0, inputVerificationBytes: 0};
  const timed = async (name, fn) => {const start = performance.now(); try {return await fn();}
    finally {phases[name] = (phases[name] ?? 0) + performance.now() - start;}};
  const checkCancelled = () => {if (signal?.aborted) throw signal.reason ?? new Error('comparison cancelled');};
  const run = async (command, args, purpose) => {
    checkCancelled(); const start = performance.now();
    const record = {purpose, command, args, argumentsCanonicalSha256: hashJson(args)}; processes.push(record);
    try {
      const result = await executor(command, args, purpose);
      requireValue(result.code === 0 && (result.signal === null || result.signal === undefined), 'unsuccessful child process');
      Object.assign(record, {code: 0, signal: null, stdoutSha256: hash(result.stdout), stderrSha256: hash(result.stderr),
        wallClockMs: performance.now() - start});
      checkCancelled(); return result;
    } catch (error) {Object.assign(record, {failed: true, message: error.message}); throw error;}
  };
  await mkdir(directory); // Exclusive ownership; no reuse or removal of pre-existing output.
  const referenceDirectory = path.join(directory, 'references'); await mkdir(referenceDirectory);
  try {
    const codeRefs = await Promise.all(requiredCodePaths.map(async file => {
      return {path: file, fileSha256: await hashPresentationNativeFileV001(file)};
    }));
    await timed('inputVerification', async () => {for (const ref of [sample.baseFrame, sample.completedFrame, ...Object.values(tools)]) {
      await checkFile(ref); metrics.inputVerificationBytes += (await stat(ref.path)).size;
    }});
    const crop = sample.crop, byteCount = crop.width * crop.height * 3;
    const completed = await timed('completedRgbCrop', () => run(tools.imageMagick.path,
      [sample.completedFrame.path, '-crop', crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
        '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], 'completed-rgb-crop'));
    requireValue(completed.stdout.length === byteCount, 'completed crop has wrong byte count');
    const completedRgb = {path: path.join(directory, 'completed.rgb'), fileSha256: hash(completed.stdout)};
    await timed('evidenceWrite', () => writeFile(completedRgb.path, completed.stdout, {flag: 'wx'}));
    const executions = buildPresentationNativeReferenceExecutionV001({sample, sceneBindings, nativeLayers, directory: referenceDirectory});
    const fresh = [...new Map(executions.map(row => [row.key, row])).values()];
    const referenceFiles = new Map();
    for (let start = 0; start < fresh.length; start += batchSize) {
      checkCancelled(); const batch = fresh.slice(start, start + batchSize);
      await timed('referenceComposition', () => run(tools.ffmpeg.path,
        buildPresentationNativeReferenceArgumentsV001({sample: {...sample, references: batch.map(row => row.reference)},
          sceneBindings, baseFramePath: sample.baseFrame.path, nativeLayers, outputPaths: batch.map(row => row.path)}),
        'native-reference-composite'));
      await timed('referenceVerification', async () => {for (const row of batch) {
        const rgb = await readFile(row.path); metrics.referenceReadBytes += rgb.length;
        requireValue(rgb.length === byteCount, 'incomplete reference RGB');
        const ref = {path: row.path, fileSha256: hash(rgb), bytes: rgb.length};
        referenceFiles.set(row.key, ref); artifacts.push(ref);
        metrics.referenceRgbOutputs++; metrics.generatedReferenceBytes += rgb.length;
        metrics.peakReferenceBytes += rgb.length;
      }});
    }
    metrics.reusedReferenceRgbCount = executions.length - fresh.length;
    const decision = await timed('rgbComparison', () => classifyPresentationNativeReferenceFilesV001({
      completedRgb: completed.stdout, completedRgbRef: completedRgb,
      references: executions.map(row => ({id: row.reference.id, ...referenceFiles.get(row.key)})), counts: metrics}));
    // The classifier's representatives/cache are sample-local and are unreachable before cleanup.
    const observed = {...sample, completedRgb, completedRgbSha256: completedRgb.fileSha256, ...decision,
      references: sample.references.map((reference, index) => ({...reference, ...decision.references[index], rgbPath: executions[index].path}))};
    if (baselineSample) await timed('baselineComparison', async () => {
      requireValue(equal(recipeOnly(baselineSample), sample), 'baseline finite recipe differs');
      requireValue(baselineSample.completedRgbSha256 === observed.completedRgbSha256
        && equal(baselineSample.classes, observed.classes) && baselineSample.visible === observed.visible
        && baselineSample.expectedClassId === observed.expectedClassId && baselineSample.omittedClassId === observed.omittedClassId,
      'baseline distance, class or decision differs');
      for (const [index, row] of observed.references.entries()) {
        const old = baselineSample.references[index];
        requireValue(row.id === old.id && row.rgbSha256 === old.rgbSha256 && row.classId === old.classId,
          'baseline logical reference differs');
        const [a, b] = await Promise.all([readFile(row.rgbPath), readFile(old.rgbPath)]);
        metrics.referenceReadBytes += a.length; metrics.baselineReadBytes += b.length;
        requireValue(a.equals(b), 'baseline actual RGB bytes differ');
      }
    });
    const inputRefs = await timed('inputVerification', async () => {
      // Retain the exact prepared planes (including the original PNG round trip).
      // Their hashes and source PNGs make this sample independently reproducible.
      const refs = new Map([sample.baseFrame, sample.completedFrame, ...Object.values(tools), ...codeRefs]
        .map(ref => [ref.path, {path: ref.path, fileSha256: ref.fileSha256}]));
      const usedBindingIds = new Set(sample.references.flatMap(row => row.layers.map(layer => layer.bindingId)));
      for (const group of sceneBindings) for (const binding of [...group.states, ...group.alternates]) {
        if (usedBindingIds.has(binding.bindingId)) refs.set(binding.pngPath, {path: binding.pngPath, fileSha256: binding.pngSha256});
      }
      const args = buildPresentationNativeReferenceArgumentsV001({sample, sceneBindings,
        baseFramePath: sample.baseFrame.path, nativeLayers, outputPaths: executions.map(row => row.path)});
      const usedPaths = new Set(args.filter((value, index) => args[index - 1] === '-i'));
      for (const layer of nativeLayers.layers) if (usedPaths.has(layer.decodedPath)) {
        const bound = preparedArtifacts.find(ref => ref.path === layer.decodedPath);
        requireValue(bound, 'prepared plane lacks a prior hash binding');
        refs.set(layer.decodedPath, {path: bound.path, fileSha256: bound.fileSha256});
      }
      for (const ref of refs.values()) {await checkFile(ref); metrics.inputVerificationBytes += (await stat(ref.path)).size;}
      for (const ref of [completedRgb, ...artifacts]) {await checkFile(ref); metrics.referenceReadBytes += (await stat(ref.path)).size;}
      return [...refs.values()];
    });
    checkCancelled();
    const proof = {schemaVersion: 'native-sample-proof-v001', sample: observed, sceneBindings, nativeLayers, tools,
      sceneBindingsSha256: hashJson(sceneBindings), nativeLayersSha256: hashJson(nativeLayers), inputRefs,
      batchSize, processes, artifacts};
    checkSampleProof(proof);
    const checkpointPath = path.join(directory, 'sample-proof.json');
    const saved = await timed('evidenceWrite', () => writePresentationQcEvidenceV001(checkpointPath, proof));
    await timed('checkpointRead', async () => {
      const again = await readPresentationQcEvidenceV001(checkpointPath, {expectedFileSha256: saved.fileSha256});
      requireValue(equal(again, proof), 'sample checkpoint reread differs');
    });
    let state = 'retained';
    if (retention === 'verified-pass-regenerable-v001' && decision.visible) {
      await timed('cleanup', async () => {
        checkCancelled();
        // Only files made in this exclusive sample directory, after completed
        // byte comparison and a durable, hash-bound checkpoint read-back.
        for (const ref of artifacts) {
          requireValue(path.dirname(ref.path) === referenceDirectory && (await lstat(ref.path)).isFile(), 'unsafe cleanup target');
          requireValue(await hashPresentationNativeFileV001(ref.path) === ref.fileSha256, 'cleanup target changed');
        }
        for (const ref of artifacts) {checkCancelled(); await unlink(ref.path);}
      }); state = 'released-verified-pass';
    }
    metrics.retainedReferenceBytes = state === 'retained' ? metrics.generatedReferenceBytes : 0;
    const checkpoint = {path: checkpointPath, fileSha256: saved.fileSha256};
    const resultSample = {...observed, referenceRetention: {schemaVersion: 'native-reference-retention-v001', state, checkpoint, artifacts}};
    const outputArtifacts = [completedRgb, checkpoint, ...(state === 'retained' ? artifacts.map(({bytes: _bytes, ...ref}) => ref) : [])];
    return {sample: resultSample, processes, outputArtifacts, metrics: {...metrics, phasesMilliseconds: phases,
      wallClockMs: performance.now() - started, batchSize, checkpointBytes: saved.bytes}};
  } catch (error) {
    await writeFile(path.join(directory, 'incomplete.json'), JSON.stringify({status: 'incomplete', message: error.message,
      processes, metrics, phasesMilliseconds: phases}, null, 2), {flag: 'wx'});
    throw error;
  }
}

async function readSampleReceipt(sample, verify = checkFile) {
  const retention = sample.referenceRetention;
  requireValue(retention?.schemaVersion === 'native-reference-retention-v001'
    && ['retained', 'released-verified-pass'].includes(retention.state), 'unknown saved retention state');
  const proof = await readPresentationQcEvidenceV001(retention.checkpoint.path,
    {expectedFileSha256: retention.checkpoint.fileSha256});
  checkSampleProof(proof);
  const {referenceRetention: _retention, ...observation} = sample;
  requireValue(proof.schemaVersion === 'native-sample-proof-v001' && equal(observation, proof.sample)
    && equal(retention.artifacts, proof.artifacts) && hashJson(proof.sceneBindings) === proof.sceneBindingsSha256
    && hashJson(proof.nativeLayers) === proof.nativeLayersSha256, 'saved sample proof differs');
  for (const ref of proof.inputRefs) await verify(ref);
  await verify(sample.completedRgb);
  if (retention.state === 'retained') for (const ref of retention.artifacts) await verify(ref);
  else {
    requireValue(sample.visible === true, 'failed evidence cannot be released');
    for (const ref of retention.artifacts) {
      let exists = true; try {await lstat(ref.path);} catch (error) {if (error.code === 'ENOENT') exists = false; else throw error;}
      requireValue(!exists, 'released file unexpectedly exists');
    }
  }
  return proof;
}

/** A single read operation verifies every receipt and required retained file.
 * Sharing file checks is confined to this call; no result cache survives it.
 * Released RGBs are reported as absent/reproducible, never as checked bytes.
 */
export async function verifyPresentationNativeSampleReceiptsV001({samples}) {
  const verified = new Map();
  const verify = async ref => {
    const previous = verified.get(ref.path);
    requireValue(previous === undefined || previous === ref.fileSha256, 'conflicting retained input SHA');
    if (previous === undefined) {await checkFile(ref); verified.set(ref.path, ref.fileSha256);}
  };
  for (const sample of samples) await readSampleReceipt(sample, verify);
  return {status: 'passed', samples: samples.length, verifiedFileCount: verified.size,
    releasedSamples: samples.filter(sample => sample.referenceRetention.state === 'released-verified-pass').length,
    scope: 'receipts and retained input bytes; absent RGB is regenerated only by the explicit revalidation entry'};
}

/** Re-execute saved comparisons in a new directory; an intentionally absent file is never declared verified. */
export async function revalidatePresentationNativeSampleV001({sample, directory, run, batchSize, signal}) {
  const proof = await readSampleReceipt(sample);
  const result = await processPresentationNativeSampleV001({sample: proof.sample, sceneBindings: proof.sceneBindings,
    nativeLayers: proof.nativeLayers, tools: proof.tools, directory, run, batchSize: batchSize ?? proof.batchSize,
    retention: 'retain-all', preparedArtifacts: proof.inputRefs, signal});
  const newSample = result.sample;
  requireValue(equal(newSample.classes, sample.classes) && newSample.visible === sample.visible
    && newSample.completedRgbSha256 === sample.completedRgbSha256
    && equal(newSample.references.map(({rgbPath: _path, ...row}) => row), sample.references.map(({rgbPath: _path, ...row}) => row)),
  'regenerated RGB hash, distances, classes or decision differ');
  for (const ref of proof.inputRefs) await checkFile(ref);
  return result;
}

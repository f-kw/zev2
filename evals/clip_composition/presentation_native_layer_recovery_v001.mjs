/** Restore disposable planar inputs before the unchanged native receipt reader runs.
 * A missing raw is never certified as checked bytes. PNGs, receipts and QC core
 * implementations remain required; only the exact manifest raw paths may be released. */
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {constants, createReadStream} from 'node:fs';
import {copyFile, lstat, mkdir, open, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationNativeLayerArgumentsV001, buildPresentationNativeLayerDecodeArgumentsV001}
  from './presentation_native_frame_qc_v001.mjs';
import {PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001} from './presentation_native_qc_streaming_v001.mjs';

export const PRESENTATION_NATIVE_LAYER_RECOVERY_V001 = 'presentation-native-layer-recovery-v001';
const here = path.dirname(fileURLToPath(import.meta.url));
const coreNames = ['presentation_native_qc_streaming_v001.mjs', 'presentation_native_frame_qc_v001.mjs',
  'presentation_qc_evidence_store_v001.mjs', 'presentation_caption_contract_v002.mjs'];
const digest = value => createHash('sha256').update(value).digest('hex');
const canonicalHash = value => digest(canonicalJson(value));
const requireValue = (condition, message) => assert(condition, 'native layer recovery: ' + message);
const clone = value => structuredClone(value);
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;

async function regularPath(file, {missing = false, directory = false} = {}) {
  requireValue(typeof file === 'string' && path.isAbsolute(file) && path.resolve(file) === file, 'absolute canonical path required');
  // Reject links in the entire path, not just its final component.
  const ancestors = []; let parent = path.dirname(file);
  while (parent !== path.dirname(parent)) {ancestors.push(parent); parent = path.dirname(parent);}
  for (const ancestor of ancestors.reverse()) {
    const info = await lstat(ancestor);
    requireValue(info.isDirectory() && !info.isSymbolicLink(), 'symbolic or non-directory ancestor: ' + ancestor);
  }
  let info;
  try {info = await lstat(file);} catch (error) {if (missing && error.code === 'ENOENT') return null; throw error;}
  requireValue(!info.isSymbolicLink() && (directory ? info.isDirectory() : info.isFile()), 'regular path required: ' + file);
  return info;
}
async function bind(file, metrics) {
  const before = await regularPath(file), hash = createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  const after = await regularPath(file);
  requireValue(before.ino === after.ino && before.dev === after.dev && before.size === after.size
    && before.mtimeMs === after.mtimeMs, 'file changed while hashing: ' + file);
  if (metrics) metrics.verifiedLogicalReadBytes += after.size;
  return {path: file, bytes: after.size, fileSha256: hash.digest('hex')};
}
async function verify(ref, resolveInputPath, metrics) {
  requireValue(ref && isHash(ref.fileSha256) && (ref.bytes === undefined || Number.isSafeInteger(ref.bytes)), 'invalid file binding');
  const file = resolveInputPath ? await resolveInputPath(ref.path) : ref.path;
  requireValue(typeof file === 'string', 'input resolver must return an explicit path');
  const actual = await bind(file, metrics);
  requireValue(actual.fileSha256 === ref.fileSha256 && (ref.bytes === undefined || actual.bytes === ref.bytes), 'file SHA/bytes differ: ' + ref.path);
  return actual;
}
async function png(ref, width, height, resolveInputPath, metrics) {
  const actual = await verify(ref, resolveInputPath, metrics);
  const handle = await open(actual.path, 'r');
  try {
    const header = Buffer.alloc(24); const {bytesRead} = await handle.read(header, 0, 24, 0);
    requireValue(bytesRead === 24 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && header.readUInt32BE(16) === width && header.readUInt32BE(20) === height, 'PNG dimensions differ: ' + ref.path);
  } finally {await handle.close();}
  return actual;
}
function validateLayers(nativeLayers, layers) {
  requireValue(nativeLayers?.method === 'exact-native-png-four-frame-alpha-planar-v002'
    && Array.isArray(nativeLayers.layers) && nativeLayers.layers.length > 0, 'unknown layer recipe');
  const directory = nativeLayers.directory;
  requireValue(path.isAbsolute(directory) && path.resolve(directory) === directory, 'layer directory differs');
  const seen = new Set();
  for (const row of nativeLayers.layers) {
    requireValue(isHash(row.sourceSha256) && isHash(row.key)
      && row.key === canonicalHash({pngSha256: row.sourceSha256, numerator: row.numerator, denominator: 4})
      && [1, 2, 3, 4].includes(row.numerator) && row.denominator === 4
      && row.pixelFormat === 'gbrap' && positive(row.width) && positive(row.height)
      && Number.isSafeInteger(row.width * row.height * 4), 'invalid planar layer');
    requireValue(row.decodedPath === path.join(directory, 'layer-' + row.key + '.gbrap')
      && !seen.has(row.decodedPath), 'duplicate or escaped raw path'); seen.add(row.decodedPath);
    requireValue(row.generated === (row.numerator !== 4)
      && row.outputPath === (row.generated ? path.join(directory, 'layer-' + row.key + '.png') : row.sourcePath), 'PNG roundtrip path differs');
    requireValue(path.isAbsolute(row.sourcePath) && path.resolve(row.sourcePath) === row.sourcePath, 'source path differs');
  }
  if (layers !== undefined) {
    requireValue(Array.isArray(layers) && layers.length === nativeLayers.layers.length, 'manifest layer count differs');
    for (const [index, row] of layers.entries()) {
      const original = nativeLayers.layers[index];
      requireValue(same(Object.fromEntries(Object.keys(original).map(key => [key, row[key]])), original), 'manifest recipe differs');
      requireValue(row.rawRef.path === row.decodedPath && row.rawRef.bytes === row.width * row.height * 4
        && isHash(row.rawRef.fileSha256) && row.sourceRef.path === row.sourcePath
        && row.sourceRef.fileSha256 === row.sourceSha256 && row.preparedPngRef.path === row.outputPath
        && isHash(row.preparedPngRef.fileSha256) && Array.isArray(row.bindingIds) && row.bindingIds.length > 0,
      'manifest raw/PNG binding differs');
    }
  }
}
function grouped(layers) {
  const groups = new Map();
  for (const row of layers) {if (!groups.has(row.sourceSha256)) groups.set(row.sourceSha256, []); groups.get(row.sourceSha256).push(row);}
  return [...groups.values()];
}
function successfulProcess(processes, args, tool, purpose) {
  const found = processes.filter(row => row.purpose === purpose && row.command === tool.path
    && row.code === 0 && row.signal == null && same(row.args, args)
    && row.argumentsCanonicalSha256 === canonicalHash(args));
  requireValue(found.length === 1, 'one original successful command required: ' + purpose);
  return clone(found[0]);
}

/** Called while every original raw still exists. Never releases any file. */
export async function createPresentationNativeLayerRecoveryManifestV001({file, nativeLayers, sceneBindings,
  outputArtifacts, processes, inputRefs, candidateBindings, sourceEvidenceRefs}) {
  validateLayers(nativeLayers); await regularPath(nativeLayers.directory, {directory: true});
  requireValue(Array.isArray(sceneBindings) && sceneBindings.length > 0 && Array.isArray(sourceEvidenceRefs)
    && sourceEvidenceRefs.length > 0 && candidateBindings && Object.keys(candidateBindings).length > 0, 'saved execution/candidate bindings required');
  requireValue(await regularPath(file, {missing: true}) === null, 'manifest already exists');
  const tools = inputRefs.filter(row => row.role === 'tool-ffmpeg');
  requireValue(tools.length === 1, 'one fixed ffmpeg reference required');
  const tool = await verify(tools[0]);
  const bindings = sceneBindings.flatMap(group => [...group.states, ...group.alternates]);
  const artifactByPath = new Map(outputArtifacts.map(row => [row.path, row]));
  requireValue(artifactByPath.size === outputArtifacts.length, 'duplicate original artifact paths');
  const originalProcesses = [];
  for (const group of grouped(nativeLayers.layers)) {
    const faded = group.filter(row => row.generated);
    if (faded.length) originalProcesses.push(successfulProcess(processes, buildPresentationNativeLayerArgumentsV001(faded), tool, 'native-layer-prepare'));
    originalProcesses.push(successfulProcess(processes, buildPresentationNativeLayerDecodeArgumentsV001(group), tool, 'native-layer-decode'));
  }
  const sourceRefs = new Map(), preparedRefs = new Map(), layers = [];
  for (const row of nativeLayers.layers) {
    const bindingIds = bindings.filter(bound => bound.pngSha256 === row.sourceSha256).map(bound => bound.bindingId);
    requireValue(bindingIds.length > 0 && bindings.some(bound => bound.pngSha256 === row.sourceSha256 && bound.pngPath === row.sourcePath), 'source PNG has no scene binding');
    if (!sourceRefs.has(row.sourcePath)) sourceRefs.set(row.sourcePath, await png({path: row.sourcePath, fileSha256: row.sourceSha256}, row.width, row.height));
    const expectedPrepared = row.generated ? artifactByPath.get(row.outputPath) : sourceRefs.get(row.sourcePath);
    requireValue(expectedPrepared, 'prepared PNG lacks prior SHA');
    if (!preparedRefs.has(row.outputPath)) preparedRefs.set(row.outputPath, await png(expectedPrepared, row.width, row.height));
    const rawRef = await verify(artifactByPath.get(row.decodedPath));
    requireValue(rawRef.bytes === row.width * row.height * 4, 'raw does not contain one full planar frame');
    layers.push({...clone(row), sourceRef: sourceRefs.get(row.sourcePath), preparedPngRef: preparedRefs.get(row.outputPath), rawRef, bindingIds});
  }
  const coreRefs = await Promise.all(coreNames.map(name => bind(path.join(here, name))));
  const controllerRefs = [await bind(fileURLToPath(import.meta.url))];
  const evidence = []; for (const ref of sourceEvidenceRefs) evidence.push(await verify(ref));
  const manifest = {schemaVersion: PRESENTATION_NATIVE_LAYER_RECOVERY_V001,
    purpose: 'Restore identical raw bytes before unchanged readers; no QC decision or missing-input exemption',
    nativeLayers: clone(nativeLayers), layers, sceneBindings: clone(sceneBindings), candidateBindings: clone(candidateBindings),
    tool, coreRefs, controllerRefs, sourceEvidenceRefs: evidence, originalProcesses,
    pixelFormat: 'gbrap', recipe: 'preserve prepared PNG roundtrip; format=rgba,format=gbrap; one frame; one thread',
    batchSize: PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001};
  await writeFile(file, JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx'});
  return {manifestRef: await bind(file), manifest};
}

/** Reads the recovery authority, not a claim that absent raw bytes were verified. */
export async function readPresentationNativeLayerRecoveryManifestV001({manifestRef, resolveInputPath}) {
  await verify(manifestRef);
  const manifest = JSON.parse(await readFile(manifestRef.path, 'utf8'));
  requireValue(manifest.schemaVersion === PRESENTATION_NATIVE_LAYER_RECOVERY_V001
    && manifest.batchSize === PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001 && manifest.pixelFormat === 'gbrap', 'unknown manifest version');
  validateLayers(manifest.nativeLayers, manifest.layers);
  requireValue(same(manifest.coreRefs.map(row => row.path), coreNames.map(name => path.join(here, name)))
    && manifest.controllerRefs.length === 1 && manifest.controllerRefs[0].path === fileURLToPath(import.meta.url), 'implementation identities differ');
  for (const ref of [...manifest.coreRefs, ...manifest.controllerRefs, manifest.tool]) await verify(ref);
  for (const ref of manifest.sourceEvidenceRefs) await verify(ref);
  requireValue(Array.isArray(manifest.sourceEvidenceRefs) && manifest.sourceEvidenceRefs.length > 0
    && manifest.candidateBindings && Object.keys(manifest.candidateBindings).length > 0, 'execution binding absent');
  await regularPath(manifest.nativeLayers.directory, {directory: true});
  const checked = new Set();
  for (const row of manifest.layers) for (const ref of [row.sourceRef, row.preparedPngRef]) {
    if (!checked.has(ref.path)) {await png(ref, row.width, row.height, resolveInputPath); checked.add(ref.path);}
  }
  return manifest;
}

/** Same per-input conversion as the old same-source builder, grouped by up to
 * 32 necessary inputs. No candidate is discarded and no full image is cropped. */
export function buildPresentationNativeRecoveryDecodeArgumentsV001(layers) {
  requireValue(Array.isArray(layers) && layers.length > 0
    && layers.length <= PRESENTATION_NATIVE_REFERENCE_BATCH_SIZE_V001, 'invalid execution batch');
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1'];
  for (const row of layers) {requireValue(row.pixelFormat === 'gbrap' && positive(row.width) && positive(row.height)
    && path.isAbsolute(row.outputPath) && path.isAbsolute(row.decodedPath), 'invalid batch layer'); args.push('-threads', '1', '-i', row.outputPath);}
  args.push('-filter_complex', layers.map((_row, index) => '[' + index + ':v]format=rgba,format=gbrap[out' + index + ']').join(';'));
  for (const [index, row] of layers.entries()) args.push('-map', '[out' + index + ']', '-frames:v', '1',
    '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', 'gbrap', '-f', 'rawvideo', row.decodedPath);
  return args;
}

/** Pre-release experiment. Only new diagnostic copies are removed. Original
 * raw inputs stay in place while recovered copies are compared byte-for-byte. */
export async function provePresentationNativeLayerRecoveryV001({manifestRef, paths, directory, run,
  beforeHeavyBatch, resolveInputPath, signal}) {
  const started = performance.now();
  requireValue(typeof run === 'function' && Array.isArray(paths) && paths.length > 0, 'explicit proof inputs required');
  const manifest = await readPresentationNativeLayerRecoveryManifestV001({manifestRef, resolveInputPath});
  const byPath = new Map(manifest.layers.map(row => [row.decodedPath, row]));
  const rows = [...new Set(paths)].map(file => {requireValue(byPath.has(file), 'unknown proof raw path'); return byPath.get(file);});
  requireValue(await regularPath(directory, {missing: true, directory: true}) === null, 'new diagnostic directory required');
  await mkdir(directory);
  const proofs = [], processes = [];
  for (let offset = 0; offset < rows.length; offset += manifest.batchSize) {
    signal?.throwIfAborted(); const batch = rows.slice(offset, offset + manifest.batchSize), runtime = [];
    await beforeHeavyBatch?.({phase: 'native-layer-recovery-proof', outputCount: batch.length,
      outputPaths: batch.map(row => path.join(directory, path.basename(row.decodedPath))),
      plannedLogicalBytes: batch.reduce((sum, row) => sum + row.rawRef.bytes, 0),
      byteMeaning: 'Diagnostic copies only; originals remain retained'});
    await verify(manifest.tool);
    for (const row of batch) {
      signal?.throwIfAborted(); await verify(row.rawRef);
      await png(row.sourceRef, row.width, row.height, resolveInputPath);
      const prepared = await png(row.preparedPngRef, row.width, row.height, resolveInputPath);
      const destination = path.join(directory, path.basename(row.decodedPath));
      await copyFile(row.decodedPath, destination, constants.COPYFILE_EXCL);
      await verify({...row.rawRef, path: destination});
      signal?.throwIfAborted(); await unlink(destination); // Only this freshly created, verified diagnostic copy.
      runtime.push({...row, outputPath: prepared.path, decodedPath: destination});
    }
    const args = buildPresentationNativeRecoveryDecodeArgumentsV001(runtime), commandStarted = performance.now();
    const result = await run(manifest.tool.path, args, 'native-layer-recovery-proof', {signal});
    requireValue(result?.code === 0 && result.signal == null, 'proof child process did not complete'); signal?.throwIfAborted();
    processes.push({command: manifest.tool.path, args, argumentsCanonicalSha256: canonicalHash(args),
      code: result.code, signal: result.signal ?? null, wallMilliseconds: performance.now() - commandStarted});
    for (const [index, row] of batch.entries()) {
      const regenerated = await verify({...row.rawRef, path: runtime[index].decodedPath});
      await verify(row.rawRef);
      requireValue((await readFile(row.decodedPath)).equals(await readFile(regenerated.path)), 'diagnostic regeneration bytes differ');
      proofs.push({original: clone(row.rawRef), regenerated, sourceRef: clone(row.sourceRef),
        preparedPngRef: clone(row.preparedPngRef), numerator: row.numerator, denominator: row.denominator,
        width: row.width, height: row.height, pixelFormat: row.pixelFormat, bindingIds: clone(row.bindingIds), byteEquality: true});
    }
  }
  const proof = {schemaVersion: 'presentation-native-layer-recovery-proof-v001', status: 'passed',
    manifestRef: clone(manifestRef), controllerRefs: clone(manifest.controllerRefs), coreRefs: clone(manifest.coreRefs),
    processId: process.pid, proofs, processes, elapsedMilliseconds: performance.now() - started,
    originalRawReleased: 0, diagnosticCopyReleaseCount: proofs.length,
    scope: 'Selected original -> new diagnostic copy -> release diagnostic copy -> regenerate -> actual byte equality'};
  const file = path.join(directory, 'proof.json');
  await writeFile(file, JSON.stringify(proof, null, 2) + '\n', {flag: 'wx'});
  return {status: 'passed', proofRef: await bind(file), proof};
}

export async function openPresentationNativeLayerRecoveryV001({manifestRef, run, beforeHeavyBatch,
  resolveInputPath, onEvent, signal}) {
  requireValue(typeof run === 'function', 'explicit process runner required');
  const manifest = await readPresentationNativeLayerRecoveryManifestV001({manifestRef, resolveInputPath});
  const manifestBytes = await readFile(manifestRef.path), manifestUtf8 = manifestBytes.toString('utf8');
  requireValue(digest(manifestBytes) === manifestRef.fileSha256
    && (manifestRef.bytes === undefined || manifestBytes.length === manifestRef.bytes)
    && Buffer.from(manifestUtf8, 'utf8').equals(manifestBytes)
    && same(JSON.parse(manifestUtf8), manifest), 'manifest changed before provenance snapshot');
  const byPath = new Map(manifest.layers.map(row => [row.decodedPath, row]));
  const operations = [], layerObservations = [], observationIndexes = new Map();
  const metrics = {ensureCalls: 0, rawExistingVerified: 0, rawGenerated: 0, rawReleased: 0,
    regeneratedLogicalBytes: 0, verifiedLogicalReadBytes: 0, decoderInputLogicalBytes: 0, releasedLogicalBytes: 0,
    currentMaterializedLogicalBytes: 0, peakMaterializedLogicalBytes: 0, decodeProcesses: 0,
    decodeWallMilliseconds: 0, ensureWallMilliseconds: 0, releaseWallMilliseconds: 0,
    ioScope: 'Logical commanded/input/output bytes; physical I/O and child RSS are not measured'};
  for (const row of manifest.layers) {const info = await regularPath(row.decodedPath, {missing: true}); if (info) metrics.currentMaterializedLogicalBytes += info.size;}
  metrics.peakMaterializedLogicalBytes = metrics.currentMaterializedLogicalBytes;
  let busy = false;
  const check = () => {signal?.throwIfAborted();};
  const resolveRows = paths => {
    requireValue(Array.isArray(paths), 'raw path array required');
    const values = [...new Set(paths)];
    return values.map(file => {requireValue(byPath.has(file), 'unknown raw path: ' + file); return byPath.get(file);});
  };
  const operation = async fn => {requireValue(!busy, 'concurrent materialization/release is forbidden'); busy = true;
    try {check(); await verify(manifestRef); return await fn();} finally {busy = false;}};
  const observedInputs = async row => ({
    sourceRef: await png(row.sourceRef, row.width, row.height, resolveInputPath, metrics),
    preparedPngRef: await png(row.preparedPngRef, row.width, row.height, resolveInputPath, metrics),
  });
  const observedLayer = (row, inputs, actualRawRef) => ({key: row.key, ...inputs, actualRawRef});
  const recordOperation = async ({layers, ...value}) => {
    // Definitions remain in the manifest; repeated real reads refer to the same
    // byte-bound observation without duplicating hundreds of layer records.
    const indexes = layers.map(observation => {
      const identity = canonicalHash(observation);
      if (!observationIndexes.has(identity)) {
        observationIndexes.set(identity, layerObservations.length);
        layerObservations.push(observation);
      }
      return observationIndexes.get(identity);
    });
    const record = {sequence: operations.length, ...value, layerObservationIndexes: indexes}; operations.push(record);
    await onEvent?.({phase: 'native-layer-recovery-provenance', operation: clone(record)});
  };
  const ensurePaths = paths => operation(async () => {
    const started = performance.now(), requested = resolveRows(paths), missing = [];
    metrics.ensureCalls++;
    try {
      const reused = [];
      for (const row of requested) {
        check();
        if (await regularPath(row.decodedPath, {missing: true})) {
          const inputs = await observedInputs(row), actual = await verify(row.rawRef, null, metrics);
          reused.push(observedLayer(row, inputs, actual)); metrics.rawExistingVerified++;
        }
        else missing.push(row);
      }
      if (reused.length) await recordOperation({kind: 'verified-existing', layers: reused});
      for (let offset = 0; offset < missing.length; offset += manifest.batchSize) {
        check(); const batch = missing.slice(offset, offset + manifest.batchSize), runtime = [], inputs = [];
        await verify(manifest.tool);
        for (const row of batch) {
          const observed = await observedInputs(row), prepared = observed.preparedPngRef; inputs.push(observed);
          runtime.push({...row, outputPath: prepared.path, decodedPath: row.decodedPath + '.recovery-' + randomUUID() + '.partial'});
          metrics.decoderInputLogicalBytes += prepared.bytes;
        }
        const plannedLogicalBytes = batch.reduce((sum, row) => sum + row.rawRef.bytes, 0);
        await beforeHeavyBatch?.({phase: 'native-layer-recovery-decode', outputPaths: batch.map(row => row.decodedPath),
          outputCount: batch.length, plannedLogicalBytes, byteMeaning: 'Exact GBRAP bytes; does not include filesystem allocation or process memory'});
        check();
        for (const row of runtime) {requireValue(await regularPath(row.decodedPath, {missing: true}) === null, 'partial path exists'); const handle = await open(row.decodedPath, 'wx'); await handle.close();}
        const args = buildPresentationNativeRecoveryDecodeArgumentsV001(runtime), commandStarted = performance.now();
        let result, wallMilliseconds;
        try {result = await run(manifest.tool.path, args, 'native-layer-recovery-decode', {signal});}
        finally {wallMilliseconds = performance.now() - commandStarted; metrics.decodeWallMilliseconds += wallMilliseconds; metrics.decodeProcesses++;}
        requireValue(result?.code === 0 && result.signal == null, 'raw decode child process did not complete'); check();
        // Validate the whole batch before exposing any output at a receipt path.
        for (const [index, row] of runtime.entries()) await verify({...batch[index].rawRef, path: row.decodedPath}, null, metrics);
        const observations = [];
        for (const [index, row] of runtime.entries()) {
          check(); requireValue(await regularPath(batch[index].decodedPath, {missing: true}) === null, 'raw appeared during decode');
          await rename(row.decodedPath, batch[index].decodedPath);
          const actual = await verify(batch[index].rawRef, null, metrics);
          observations.push(observedLayer(batch[index], inputs[index], actual));
          metrics.rawGenerated++; metrics.regeneratedLogicalBytes += batch[index].rawRef.bytes;
          metrics.currentMaterializedLogicalBytes += batch[index].rawRef.bytes;
        }
        metrics.peakMaterializedLogicalBytes = Math.max(metrics.peakMaterializedLogicalBytes, metrics.currentMaterializedLogicalBytes);
        await recordOperation({kind: 'generated-batch', layers: observations,
          temporaryRawPaths: runtime.map(row => row.decodedPath),
          process: {command: manifest.tool.path, args, argumentsCanonicalSha256: canonicalHash(args),
            code: result.code, signal: result.signal ?? null, stdoutSha256: digest(result.stdout ?? Buffer.alloc(0)),
            stderrSha256: digest(result.stderr ?? Buffer.alloc(0)), wallMilliseconds}});
        await onEvent?.({phase: 'native-layer-recovery-materialized', paths: batch.map(row => row.decodedPath),
          command: manifest.tool.path, args, argumentsCanonicalSha256: canonicalHash(args), plannedLogicalBytes, metrics: clone(metrics)});
      }
      return requested.map(row => clone(row.rawRef));
    } finally {metrics.ensureWallMilliseconds += performance.now() - started;}
  });
  const releaseExcept = paths => operation(async () => {
    const started = performance.now(), keep = new Set(resolveRows(paths).map(row => row.decodedPath)), present = [];
    try {
      // A changed/partial raw prevents this release, including unrelated entries.
      for (const row of manifest.layers) if (!keep.has(row.decodedPath) && await regularPath(row.decodedPath, {missing: true})) {
        check(); const inputs = await observedInputs(row), actual = await verify(row.rawRef, null, metrics);
        present.push({row, observation: observedLayer(row, inputs, actual)});
      }
      for (const {row} of present) {check(); await regularPath(row.decodedPath); await unlink(row.decodedPath);
        metrics.rawReleased++; metrics.releasedLogicalBytes += row.rawRef.bytes; metrics.currentMaterializedLogicalBytes -= row.rawRef.bytes;}
      if (present.length) await recordOperation({kind: 'released', layers: present.map(row => row.observation)});
      await onEvent?.({phase: 'native-layer-recovery-released', paths: present.map(({row}) => row.decodedPath), metrics: clone(metrics)});
      return {releasedCount: present.length, releasedLogicalBytes: present.reduce((sum, {row}) => sum + row.rawRef.bytes, 0)};
    } finally {metrics.releaseWallMilliseconds += performance.now() - started;}
  });
  return {manifest: clone(manifest), manifestRef: clone(manifestRef), controllerRefs: clone(manifest.controllerRefs),
    ensurePaths, releaseExcept, releaseAll: () => releaseExcept([]), metrics,
    getProvenance: () => {
      requireValue(!busy, 'cannot snapshot an unfinished materialization/release');
      return clone({schemaVersion: 'presentation-native-layer-materialization-evidence-v001',
        manifestRef, manifestUtf8, controllerRefs: manifest.controllerRefs, layerObservations, operations, metrics});
    }};
}

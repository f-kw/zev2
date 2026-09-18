/** Test-only replay of the frozen pre-sharing finite QC on one current preview.
 * No renderer, encoder, or saved editing state is invoked by this entry point. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, stat, realpath, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {buildPresentationNativeFrameQcRecipeV001} from './presentation_native_frame_qc_v001.mjs';
import {validatePresentationIntegrityStateQcEvidenceV001} from './presentation_integrity_state_qc_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import * as previous from './presentation_native_frame_qc_before_sharing_fixture_v001.mjs';
import {checkFiniteExecutionEvidence} from './presentation_integrity_state_qc_before_sharing_fixture_v001.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(directory, '../..');
export const PREVIEW_QC_BEFORE_SHARING_COMMIT_V001 = 'efdee0aabea10b87d39203bee6f9f6e7460032d0';
export const PREVIEW_QC_BEFORE_SHARING_SHA256_V001 = '704992c891ee12685e6bb35abf535a9e2d851faead86a4ec5296cb67cc92f6b0';
export const PREVIEW_QC_BEFORE_SHARING_INTEGRITY_SHA256_V001 = 'ee3b93f88c4a9ebd9ad81c0b41ae1f81d0caafe8f0337bb6c915021c6f60ee4e';
export const PREVIEW_QC_BEFORE_SHARING_INTEGRITY_ORIGINAL_SHA256_V001 = 'cf47aa4b12d87aaed30032c20644f2de294da3a64b4fa6ee9733b36a0b43da9a';
const fixturePath = path.join(directory, 'presentation_native_frame_qc_before_sharing_fixture_v001.mjs');
const integrityFixturePath = path.join(directory, 'presentation_integrity_state_qc_before_sharing_fixture_v001.mjs');
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
export async function bindPreviewQcFileV001(file) {
  assert(path.isAbsolute(file), 'a fixed file reference must be absolute');
  // Bound system tools use their existing symlink entry points. Keep that exact
  // path and verify the link plus its regular target before and after reading.
  const link = await lstat(file, {bigint: true}), resolvedPath = await realpath(file);
  const info = await stat(file, {bigint: true}); assert(info.isFile(), 'a fixed input must resolve to a regular file');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  const after = await stat(file, {bigint: true}), linkAfter = await lstat(file, {bigint: true});
  assert.equal(await realpath(file), resolvedPath, 'fixed input target changed while reading: ' + file);
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'])
    assert.equal(after[key], info[key], 'fixed input changed while reading: ' + file);
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'])
    assert.equal(linkAfter[key], link[key], 'fixed input link changed while reading: ' + file);
  return {path: file, bytes: Number(info.size), fileSha256: digest.digest('hex')};
}
export async function bindFrozenPreviewQcV001() {
  const native = await bindPreviewQcFileV001(fixturePath), integrity = await bindPreviewQcFileV001(integrityFixturePath);
  assert.equal(native.fileSha256, PREVIEW_QC_BEFORE_SHARING_SHA256_V001, 'frozen old QC source changed');
  assert.equal(integrity.fileSha256, PREVIEW_QC_BEFORE_SHARING_INTEGRITY_SHA256_V001, 'frozen old integrity check changed');
  const original = (await readFile(integrityFixturePath, 'utf8'))
    .replace("from './presentation_native_frame_qc_before_sharing_fixture_v001.mjs'", "from './presentation_native_frame_qc_v001.mjs'")
    .replace('export function checkFiniteExecutionEvidence(', 'function checkFiniteExecutionEvidence(');
  assert.equal(createHash('sha256').update(original).digest('hex'), PREVIEW_QC_BEFORE_SHARING_INTEGRITY_ORIGINAL_SHA256_V001);
  return {native, integrity, originalIntegritySha256: PREVIEW_QC_BEFORE_SHARING_INTEGRITY_ORIGINAL_SHA256_V001,
    integrityFixtureChanges: ['bind native import to frozen original fixture', 'export the original finite execution checker']};
}
export function assertFrozenPreviewNativeQcV001({native, plan, renderRange}) {
  assert.equal(native.status, 'passed'); assert.deepEqual(native.violations, []);
  assert.deepEqual(native.inspections.map(row => row.instructionId), plan.elements.map(row => row.instructionId),
    'old native inspections must cover every caption exactly once in plan order');
  previous.validatePresentationNativeFrameQcScopeV001({plan, evidence: native.evidence, renderRange});
  for (const inspection of native.inspections) assert.equal(previous.validatePresentationNativeFrameQcEvidenceV001({
    plan, inspection, renderRange}).status, 'passed');
  checkFiniteExecutionEvidence(native.evidence, native.inspections);
}
async function verifyReference(ref, actualPath = ref.path) {
  const observed = await bindPreviewQcFileV001(actualPath);
  assert.equal(observed.fileSha256, ref.fileSha256, 'fixed preview input bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(observed.bytes, ref.bytes);
  if (ref.canonicalSha256 !== undefined) assert.equal(hash(await parse(actualPath)), ref.canonicalSha256);
  return observed;
}
export function relocatePreviewQcPathsV001(value, relocations, key = '') {
  if (Array.isArray(value)) return value.map(row => relocatePreviewQcPathsV001(row, relocations));
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([name, row]) => [name, relocatePreviewQcPathsV001(row, relocations, name)]));
  return ['path', 'pngPath'].includes(key) && typeof value === 'string'
    ? relocations.find(row => row.from === value)?.to ?? value : value;
}
export async function loadPreviewQcComparisonInputV001(resultPath) {
  const resultRef = await bindPreviewQcFileV001(resultPath), result = await parse(resultPath);
  assert.equal(result.schemaVersion, 'presentation-edited-render-completion-v001');
  assert.equal(result.status, 'passed'); assert.equal(result.qcScope, 'requested-range-only');
  assert.equal(result.publication.status, 'published');
  assert.equal(result.expectedFrameCount, result.range.endFrameExclusive - result.range.startFrame);
  assert.equal(result.finalQc.status, 'passed'); assert.equal(result.completedFrameQc.status, 'passed');
  const finite = result.completedFrameQc.evidence.finiteState;
  assert.deepEqual({startFrame: finite.renderRange.startFrame, endFrameExclusive: finite.renderRange.endFrameExclusive}, result.range);
  const refs = finite.inputManifest.inputRefs;
  const byRole = role => {const matches = refs.filter(row => row.role === role); assert.equal(matches.length, 1, role); return matches[0];};
  const completed = byRole('completed-media'), staging = path.dirname(completed.path);
  assert.equal(path.basename(staging), 'publish');
  assert.equal(result.candidateVideo.path, path.join(result.publication.outputDirectory, path.basename(completed.path)));
  assert.equal(result.candidateVideo.fileSha256, completed.fileSha256);
  await verifyReference(result.candidateVideo);
  const relocations = [];
  for (const ref of refs) {
    const relative = path.relative(staging, ref.path);
    if (!relative || relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) continue;
    const to = path.join(result.publication.outputDirectory, relative);
    await verifyReference(ref, to);
    if (!relocations.some(row => row.from === ref.path)) relocations.push({from: ref.path, to, fileSha256: ref.fileSha256});
  }
  const resolve = ref => relocations.find(row => row.from === ref.path)?.to ?? ref.path;
  for (const ref of refs) await verifyReference(ref, resolve(ref));
  const planRef = byRole('plan'), plan = await parse(planRef.path);
  assert.equal(hash(plan), finite.inputManifest.planCanonicalSha256);
  const preparedPath = path.join(path.dirname(planRef.path), 'preparation.json');
  const preparedRef = await bindPreviewQcFileV001(preparedPath), prepared = await parse(preparedPath);
  assert.equal(prepared.provenance.planCanonicalSha256, hash(plan));
  const view = restoreOrchestrationDrawingViewEvidenceV001(finite.orchestrationInput);
  const recipeInput = {plan, baselinePlan: finite.baselinePlan, records: prepared.records,
    orchestrationDrawingView: view, renderRange: finite.renderRange};
  const recipe = buildPresentationNativeFrameQcRecipeV001(recipeInput);
  assert.deepEqual(recipe.sceneBindings, finite.sceneBindings, 'saved preparation does not bind the generated PNG states');
  assert.deepEqual(previous.buildPresentationNativeFrameQcRecipeV001(recipeInput), recipe,
    'the frozen and current logical sample recipes differ');
  const combined = validatePresentationIntegrityStateQcEvidenceV001({plan, overlayInspections: result.completedFrameQc.inspections,
    evidence: result.completedFrameQc.evidence, expectedFrameCount: result.expectedFrameCount,
    currentCompletedMediaRef: completed, mediaInspection: result.outputMedia, renderRange: finite.renderRange});
  assert.equal(combined.status, 'passed', JSON.stringify(combined.violations));
  const inputs = {plan, records: relocatePreviewQcPathsV001(prepared.records, relocations),
    provenance: relocatePreviewQcPathsV001(prepared.provenance, relocations), renderRange: finite.renderRange,
    media: {base: {...byRole('base-media'), path: resolve(byRole('base-media'))}, completed: {...completed, path: resolve(completed)}},
    tools: {ffmpeg: byRole('tool-ffmpeg'), imageMagick: byRole('tool-imagemagick')}};
  // The native inspector deliberately accepts only the bound executable path
  // and file hash; input-manifest role labels are not executable arguments.
  for (const object of [inputs.media, inputs.tools]) for (const [key, ref] of Object.entries(object))
    object[key] = {path: ref.path, fileSha256: ref.fileSha256};
  assert.deepEqual(await bindPreviewQcFileV001(resultPath), resultRef);
  return {result, resultRef, plan, preparedRef, relocations, inputs, recipe, recipeSha256: hash(recipe)};
}
export async function reproducePreviewNativeQcV001({resultPath, outputDirectory}) {
  const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const frozenSources = await bindFrozenPreviewQcV001(), fixtureRef = frozenSources.native;
  const loaded = await loadPreviewQcComparisonInputV001(resultPath);
  await mkdir(outputDirectory);
  const requestPath = path.join(outputDirectory, 'request.json');
  const request = {schemaVersion: 'presentation-preview-qc-comparison-request-v001', currentResult: loaded.resultRef,
    prepared: loaded.preparedRef, frozenSource: fixtureRef, frozenSources, frozenCommit: PREVIEW_QC_BEFORE_SHARING_COMMIT_V001,
    recipeSha256: loaded.recipeSha256, relocations: loaded.relocations, inputs: loaded.inputs};
  await save(requestPath, request);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(outputDirectory, 'processes')});
  const start = performance.now();
  try {
    const native = await previous.inspectPresentationNativeFrameQcV001({...loaded.inputs,
      scratchDirectory: path.join(outputDirectory, 'scratch'), processObserver: observer});
    assertFrozenPreviewNativeQcV001({native, plan: loaded.plan, renderRange: loaded.inputs.renderRange});
    const nativePath = path.join(outputDirectory, 'legacy-native-qc.json'); await save(nativePath, native);
    assert.deepEqual(await bindPreviewQcFileV001(resultPath), loaded.resultRef);
    assert.deepEqual(await bindFrozenPreviewQcV001(), frozenSources);
    await verifyReference(loaded.result.candidateVideo);
    const record = {schemaVersion: 'presentation-editing-preview-qc-reproduction-v001', status: 'passed', guard,
      frozenCommit: PREVIEW_QC_BEFORE_SHARING_COMMIT_V001, frozenSource: fixtureRef, frozenSources,
      currentResult: loaded.resultRef, request: await bindPreviewQcFileV001(requestPath),
      legacyNativeQc: await bindPreviewQcFileV001(nativePath), elapsedMilliseconds: performance.now() - start,
      processes: observer.getPerformance(), completedMediaGenerated: 0,
      scope: 'test-only old finite QC on the same newly generated preview, PNGs and logical sample recipe; no production fallback'};
    const recordPath = path.join(outputDirectory, 'reproduction.json'); await save(recordPath, record);
    return {recordPath, ...record};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {status: 'failed', message: error.message, stack: error.stack,
      nativeFailure: error.nativeFrameQcFailure ?? null, processes: observer.getPerformance()}); throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [resultPath, outputDirectory] = process.argv.slice(2);
  const record = await reproducePreviewNativeQcV001({resultPath, outputDirectory});
  process.stdout.write(JSON.stringify({status: record.status, recordPath: record.recordPath,
    elapsedMilliseconds: record.elapsedMilliseconds, completedMediaGenerated: 0}) + '\n');
}

/** Fixed Q5-1/Q5-2 selections. This development entry never reads human answers. */
import {createHash, randomUUID} from 'node:crypto';
import {lstat, mkdir, open, readFile, rename, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJson} from './clock.mjs';
import {createQ53EditSourceV001, resolveQ53EditPlanV001, restoreQ53EditPlanV001} from './q5-3-edit-plan.mjs';
import {buildQ53ReuseBindingsV001, restoreQ53ReuseBindingsV001} from './q5-3-reuse.mjs';
import {acquireEditingServiceLockV001, bindEditingFileV001}
  from '../../evals/clip_composition/presentation_editing_state_v001.mjs';
import {validateReview, canonical as reviewCanonical} from '../point-review/core.mjs';

const sides = ['omit', 'add'];
const approvedInstructionSha256 = 'dc021102e192113e3409cb18314039b13a19c966e047603a983a15eb910c5db6';
const clone = structuredClone;
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(canonicalJson(value));
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const demand = (condition, message, code = 'Q53_STORE_INVALID') => {
  if (!condition) throw Object.assign(new TypeError(message), {code});
};
const writeNew = (file, value) => writeFile(file, bytes(value), {flag: 'wx', mode: 0o600});
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const defaultProvenance = () => ({kind: 'default-disabled', statement: 'Initial disabled state; no human selection or adoption.'});
async function ordinary(file, directory = false) {
  const info = await lstat(file);
  demand(!info.isSymbolicLink() && (directory ? info.isDirectory() : info.isFile()), 'A regular saved file/directory is required.');
}
async function boundBytes(ref) {
  demand(ref && path.isAbsolute(ref.path ?? '') && /^[a-f0-9]{64}$/.test(ref.fileSha256 ?? '')
    && Object.keys(ref).every(key => ['path', 'bytes', 'fileSha256'].includes(key)), 'An absolute byte reference is required.');
  await ordinary(ref.path);
  const value = await readFile(ref.path);
  demand(sha(value) === ref.fileSha256 && (ref.bytes === undefined || value.length === ref.bytes),
    'A fixed file changed: ' + ref.path, 'Q53_FIXED_CHANGED');
  return value;
}

/** The catalog contains references, never another resolved plan as the original. */
export async function loadQ53CatalogV001(catalog) {
  demand(exact(catalog, ['schemaVersion', 'sourceInputRef', 'policyRef', 'candidates'])
    && catalog.schemaVersion === 'q5-3-fixed-catalog-v001' && exact(catalog.candidates, sides), 'Unknown catalog or candidate set.');
  demand(catalog.policyRef?.fileSha256 === approvedInstructionSha256,
    'This entry is limited to the fixed Q5-3 instruction; a different instruction is not admitted.');
  const sourceInput = JSON.parse(await boundBytes(catalog.sourceInputRef));
  demand(exact(sourceInput, ['originalContentVersion', 'basisEditPlanRef', 'planRef', 'timelineRef', 'mediaRef',
    'sourceVideoRef', 'sourceEvidenceRef', 'boundaryEvidenceRef']), 'Only the saved original Q5-2 source descriptor is supported.');
  await boundBytes(catalog.policyRef);
  for (const [refName, byteName] of [['basisEditPlanRef', 'basisEditPlanBytes'], ['planRef', 'planBytes'],
    ['timelineRef', 'timelineBytes'], ['sourceEvidenceRef', 'sourceEvidenceBytes'], ['boundaryEvidenceRef', 'boundaryEvidenceBytes']])
    sourceInput[byteName] = await boundBytes(sourceInput[refName]);
  const candidates = {}, candidatePlans = {};
  for (const side of sides) {
    const row = catalog.candidates[side];
    demand(exact(row, ['editPlanRef', 'comparisonRef', 'completionRef', 'normalCompletionRef', 'reviewBindingRef']),
      'Fixed candidate reference fields differ.');
    candidates[side] = {editPlanRef: row.editPlanRef, editPlanBytes: await boundBytes(row.editPlanRef),
      comparisonRef: row.comparisonRef, comparisonBytes: await boundBytes(row.comparisonRef)};
    candidatePlans[side] = JSON.parse(candidates[side].editPlanBytes);
  }
  const source = createQ53EditSourceV001({sourceInput, candidates, policyRef: catalog.policyRef});
  const reviewTargets = {};
  for (const side of sides) {
    const row = catalog.candidates[side], binding = JSON.parse(await boundBytes(row.reviewBindingRef));
    demand(same(binding.editPlanRef, row.editPlanRef) && same(binding.completionRef, row.completionRef)
      && binding.contentVersion === candidatePlans[side].contentVersion, 'Review does not identify this fixed candidate version.');
    const review = validateReview(JSON.parse(await boundBytes(binding.reviewRef)));
    demand(sha(reviewCanonical(review)) === binding.reviewCanonicalSha256 && review.points.length === 1,
      'Review revision or point count changed.');
    const point = review.points[0], expectedId = side === 'omit' ? 'HR-Q5-1-001' : 'HR-Q5-2-001';
    demand(point.review_id === expectedId, 'Review belongs to a different candidate.');
    for (const role of ['before', 'after']) {
      const view = point.views.find(view => view.role === role);
      const media = review.media.find(media => media.media_id === view?.media_id);
      demand(media && media.path === binding[role].mediaRef.path && media.sha256 === binding[role].mediaRef.fileSha256
        && view.start_frame === binding[role].range.startFrame && view.end_frame === binding[role].range.endFrameExclusive,
      'Review media or view range differs from its saved candidate binding.');
    }
    reviewTargets[side] = {candidateId: candidatePlans[side].candidateId, editPlanRef: clone(row.editPlanRef),
      contentVersion: candidatePlans[side].contentVersion, reviewBindingRef: clone(row.reviewBindingRef),
      reviewRef: clone(binding.reviewRef), reviewCanonicalSha256: binding.reviewCanonicalSha256,
      batchId: review.batch_id, revision: review.revision, pointId: point.point_id, reviewId: point.review_id,
      scope: clone(point.scope), bothUsableMeaning: 'Both Before and After in this single point are usable; not joint adoption of Q5-1 and Q5-2.',
      execution: 'No answers are imported. A separate explicit execution choice is required.'};
  }
  return {catalog: clone(catalog), source, reviewTargets};
}

function validateState(state, source) {
  demand(exact(state, ['schemaVersion', 'sourceIdentitySha256', 'candidateIdentitySha256', 'selection',
    'selectionProvenance', 'saveId', 'savedAt', 'resolutionSha256'])
    && state.schemaVersion === 'q5-3-selection-state-v001'
    && state.sourceIdentitySha256 === source.sourceIdentitySha256
    && state.candidateIdentitySha256 === hash(source.candidateIdentity), 'Saved selection belongs to a different original or fixed candidate set.');
  demand(exact(state.selection, sides) && sides.every(side => typeof state.selection[side] === 'boolean')
    && exact(state.selectionProvenance, sides), 'Exactly two independent selections are required.');
  for (const side of sides) {
    const value = state.selectionProvenance[side];
    demand(exact(value, ['kind', 'statement']) && ['default-disabled', 'technical-fixture'].includes(value.kind)
      && typeof value.statement === 'string' && value.statement.trim().length > 0
      && (value.kind !== 'default-disabled' || !state.selection[side] && same(value, defaultProvenance())),
    'Only initial disabled or explicitly technical selections are supported; human answers are not execution choices.');
  }
  demand(/^[a-f0-9-]{36}$/.test(state.saveId) && typeof state.savedAt === 'string'
    && Number.isFinite(Date.parse(state.savedAt)), 'Saved operation identity is missing.');
  const resolved = resolveQ53EditPlanV001({source, selection: state.selection});
  demand(state.resolutionSha256 === resolved.resolutionSha256, 'Saved selection resolution changed.');
  return resolved;
}
function stateFor(source, selection, selectionProvenance) {
  const resolved = resolveQ53EditPlanV001({source, selection});
  return {schemaVersion: 'q5-3-selection-state-v001', sourceIdentitySha256: source.sourceIdentitySha256,
    candidateIdentitySha256: hash(source.candidateIdentity), selection: clone(selection),
    selectionProvenance: clone(selectionProvenance), saveId: randomUUID(), savedAt: new Date().toISOString(),
    resolutionSha256: resolved.resolutionSha256};
}
async function locked(directory, work) {
  demand(path.isAbsolute(directory), 'Selection directory must be absolute.'); await ordinary(directory, true);
  // Reuse the existing cross-process lock and dead-owner recovery without changing it.
  const release = await acquireEditingServiceLockV001(directory);
  try {return await work();} finally {await release();}
}
async function readUnlocked(directory) {
  const manifestPath = path.join(directory, 'document.json'); await ordinary(manifestPath);
  const manifest = await parse(manifestPath);
  demand(exact(manifest, ['schemaVersion', 'catalogRef']) && manifest.schemaVersion === 'q5-3-selection-document-v001'
    && manifest.catalogRef.path === path.join(directory, 'catalog.json'), 'Selection document binding differs.');
  const loaded = await loadQ53CatalogV001(JSON.parse(await boundBytes(manifest.catalogRef)));
  const statePath = path.join(directory, 'selection.json'); await ordinary(statePath);
  const stateBytes = await readFile(statePath), state = JSON.parse(stateBytes);
  const resolved = validateState(state, loaded.source);
  return {...loaded, directory, manifest, state, resolved, savedStateToken: sha(stateBytes)};
}
export async function initializeQ53SelectionV001({catalogPath, directory}) {
  demand(path.isAbsolute(catalogPath) && path.isAbsolute(directory), 'Absolute paths are required.');
  await ordinary(catalogPath);
  const catalogBytes = await readFile(catalogPath), loaded = await loadQ53CatalogV001(JSON.parse(catalogBytes));
  const state = stateFor(loaded.source, {omit: false, add: false}, {omit: defaultProvenance(), add: defaultProvenance()});
  await mkdir(directory);
  await writeFile(path.join(directory, 'catalog.json'), catalogBytes, {flag: 'wx', mode: 0o600});
  await writeNew(path.join(directory, 'document.json'), {schemaVersion: 'q5-3-selection-document-v001',
    catalogRef: await bindEditingFileV001(path.join(directory, 'catalog.json'))});
  await writeNew(path.join(directory, 'selection.json'), state);
  return readQ53SelectionV001({directory});
}
export const readQ53SelectionV001 = ({directory}) => locked(directory, () => readUnlocked(directory));

/** One current-state file is fsynced and renamed under the reused process lock.
 * An operation UUID makes stale A→B→A writes fail even when effective content is equal. */
export async function selectQ53CandidateV001({directory, expectedSavedStateToken, side, enabled, provenance}) {
  demand(sides.includes(side) && typeof enabled === 'boolean', 'Unknown or duplicate candidate selection.');
  demand(exact(provenance, ['kind', 'statement']) && provenance.kind === 'technical-fixture'
    && typeof provenance.statement === 'string' && provenance.statement.trim().length > 0,
  'This development entry requires an explicit technical-fixture selection.');
  return locked(directory, async () => {
    const current = await readUnlocked(directory);
    demand(typeof expectedSavedStateToken === 'string' && expectedSavedStateToken === current.savedStateToken,
      'Saved selection changed. Reload before saving; no selection was overwritten.', 'Q53_STALE_SELECTION');
    const state = stateFor(current.source, {...current.state.selection, [side]: enabled},
      {...current.state.selectionProvenance, [side]: clone(provenance)});
    validateState(state, current.source);
    const pending = path.join(directory, '.selection-' + randomUUID() + '.pending');
    const handle = await open(pending, 'wx', 0o600);
    try {await handle.writeFile(bytes(state)); await handle.sync();} finally {await handle.close();}
    await rename(pending, path.join(directory, 'selection.json'));
    const parent = await open(directory, 'r'); try {await parent.sync();} finally {await parent.close();}
    return readUnlocked(directory);
  });
}
const completionRefs = catalog => Object.fromEntries(sides.map(side => [side, {
  completionRef: catalog.candidates[side].completionRef, normalCompletionRef: catalog.candidates[side].normalCompletionRef}]));

/** Resolve a persisted snapshot and acquire only existing local media. No renderer is invoked. */
export async function acquireQ53OutputV001({directory, outputDirectory}) {
  demand(path.isAbsolute(outputDirectory), 'Output directory must be absolute.');
  const snapshot = await readQ53SelectionV001({directory});
  await mkdir(outputDirectory);
  for (const [name, value] of [['catalog', snapshot.catalog], ['selection', snapshot.state],
    ['resolved', snapshot.resolved], ['review-targets', snapshot.reviewTargets]])
    await writeNew(path.join(outputDirectory, name + '.json'), value);
  const selectionRef = await bindEditingFileV001(path.join(outputDirectory, 'selection.json'));
  const resolvedRef = await bindEditingFileV001(path.join(outputDirectory, 'resolved.json'));
  const bindings = await buildQ53ReuseBindingsV001({source: snapshot.source, resolved: snapshot.resolved,
    selectionRef, resolvedRef, completionRefs: completionRefs(snapshot.catalog)});
  await writeNew(path.join(outputDirectory, 'reuse-bindings.json'), bindings);
  const files = {};
  for (const name of ['catalog', 'selection', 'resolved', 'review-targets', 'reuse-bindings'])
    files[name] = await bindEditingFileV001(path.join(outputDirectory, name + '.json'));
  const completion = {schemaVersion: 'q5-3-output-acquisition-v001', files,
    savedStateToken: snapshot.savedStateToken, selection: clone(snapshot.state.selection),
    selectionProvenance: clone(snapshot.state.selectionProvenance), contentVersion: snapshot.resolved.contentVersion,
    frameCount: snapshot.resolved.frameCount, captionCount: snapshot.resolved.normalPlan.elements.length,
    status: 'technical-fixture-output-acquired', newlyRenderedMedia: false, wholeContentMediaCreated: false,
    humanAdoption: false, originalReplaced: false};
  await writeNew(path.join(outputDirectory, 'completion.json'), completion);
  return completion;
}

/** Independent process verification follows the pinned output snapshot, not mutable current selection. */
export async function verifyQ53OutputV001({outputDirectory}) {
  demand(path.isAbsolute(outputDirectory), 'Output directory must be absolute.'); await ordinary(outputDirectory, true);
  await ordinary(path.join(outputDirectory, 'completion.json'));
  const completion = await parse(path.join(outputDirectory, 'completion.json'));
  demand(exact(completion, ['schemaVersion', 'files', 'savedStateToken', 'selection', 'selectionProvenance',
    'contentVersion', 'frameCount', 'captionCount', 'status', 'newlyRenderedMedia', 'wholeContentMediaCreated',
    'humanAdoption', 'originalReplaced']) && completion.schemaVersion === 'q5-3-output-acquisition-v001'
    && exact(completion.files, ['catalog', 'selection', 'resolved', 'review-targets', 'reuse-bindings']), 'Output completion format differs.');
  const saved = {};
  for (const [name, ref] of Object.entries(completion.files)) {
    demand(ref.path === path.join(outputDirectory, name + '.json'), 'Output snapshot reference escaped its directory.');
    saved[name] = JSON.parse(await boundBytes(ref));
  }
  const loaded = await loadQ53CatalogV001(saved.catalog);
  const resolved = validateState(saved.selection, loaded.source);
  restoreQ53EditPlanV001({source: loaded.source, saved: saved.resolved});
  demand(same(resolved, saved.resolved) && same(loaded.reviewTargets, saved['review-targets'])
    && completion.savedStateToken === sha(bytes(saved.selection)) && same(completion.selection, saved.selection.selection)
    && same(completion.selectionProvenance, saved.selection.selectionProvenance)
    && completion.contentVersion === resolved.contentVersion && completion.frameCount === resolved.frameCount
    && completion.captionCount === resolved.normalPlan.elements.length
    && completion.status === 'technical-fixture-output-acquired' && completion.newlyRenderedMedia === false
    && completion.wholeContentMediaCreated === false && completion.humanAdoption === false && completion.originalReplaced === false,
  'Output completion does not reconstruct from its saved selection.');
  await restoreQ53ReuseBindingsV001({source: loaded.source, resolved, selectionRef: completion.files.selection,
    resolvedRef: completion.files.resolved, completionRefs: completionRefs(loaded.catalog), saved: saved['reuse-bindings']});
  return {...completion, verifiedInProcess: process.pid};
}

export const summarizeQ53SelectionV001 = snapshot => ({directory: snapshot.directory,
  savedStateToken: snapshot.savedStateToken, selection: snapshot.state.selection,
  selectionProvenance: snapshot.state.selectionProvenance, saveId: snapshot.state.saveId,
  contentVersion: snapshot.resolved.contentVersion, resolutionSha256: snapshot.resolved.resolutionSha256,
  frameCount: snapshot.resolved.frameCount, captionCount: snapshot.resolved.normalPlan.elements.length,
  humanAdoption: false});

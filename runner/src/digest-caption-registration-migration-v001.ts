/** Explicit, JSON-only registration migration for the approved SJvP9jhEdyI caption update.
 * Old records are evidence, never manufacturing inputs or a reader compatibility branch.
 * Callers must obtain these bytes by stable reads and independently bind the approval in their job.
 * This module reads/writes no files and grants no storage, task, or manufacturing capability. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';

type Json = Record<string, any>;
export type DigestCaptionMigrationBindingV001 = {
  path: string; fileSha256: string; sizeBytes?: number; canonicalSha256?: string; schemaVersion?: string;
};
export type DigestCaptionMigrationBoundJsonV001 = {binding: DigestCaptionMigrationBindingV001; bytes: Uint8Array};
export type DigestCaptionMigrationRegistrationSideV001 = {
  request: DigestCaptionMigrationBoundJsonV001; response: DigestCaptionMigrationBoundJsonV001;
  result: DigestCaptionMigrationBoundJsonV001; trace: DigestCaptionMigrationBoundJsonV001;
  actualAnswerSource: DigestCaptionMigrationBoundJsonV001;
};
export type DigestCaptionRegistrationMigrationParametersV001 = {
  planId: string;
  approvalEvidence: DigestCaptionMigrationBoundJsonV001;
  expectedApprovalEvidenceBinding: DigestCaptionMigrationBindingV001;
  originalCandidate: DigestCaptionMigrationBoundJsonV001;
  originalPreparation: DigestCaptionMigrationBoundJsonV001;
  preparation: DigestCaptionMigrationBoundJsonV001;
  originalMeaning: DigestCaptionMigrationBoundJsonV001;
  meaning: DigestCaptionMigrationBoundJsonV001;
  originalExecution: DigestCaptionMigrationBoundJsonV001;
  execution: DigestCaptionMigrationBoundJsonV001;
  originalMachineAdoption: DigestCaptionMigrationBoundJsonV001;
  machineAdoption: DigestCaptionMigrationBoundJsonV001;
  originalClock: DigestCaptionMigrationBoundJsonV001;
  clock: DigestCaptionMigrationBoundJsonV001;
  registrations: Array<{ordinal: number; original: DigestCaptionMigrationRegistrationSideV001;
    current: DigestCaptionMigrationRegistrationSideV001}>;
};
export type DigestCaptionRegistrationMigrationValidationParametersV001 = DigestCaptionRegistrationMigrationParametersV001 & {proof: Json};

const PLAN = 'digest-SJvP9jhEdyI-20261004-v001';
const RESPONSE = 'digest-caption-judgment-display-response-v001';
const PREPARATION = 'digest-caption-judgment-preparation-bundle-v001';
const MEANING = 'digest-caption-judgment-meaning-input-v001';
const PROOF = 'digest-caption-answer-registration-migration-v001';
const NATIVE_APPROVAL = Object.freeze({sourceThreadId: '01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6',
  userMessageId: 'Sentinel_cf8aca8c66e88191900cd3508db6ba22', userText: 'いいよ'});
const clone = <T>(value: T): T => structuredClone(value);
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const obj = (value: any): Json => {
  assert(value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'CAPTION_MIGRATION_OBJECT_REQUIRED'); return value;
};
const exact = (value: any, required: string[], optional: string[] = []) => {
  obj(value); assert(required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key)), 'CAPTION_MIGRATION_FIELDS_INVALID');
};
const list = (value: any): Json[] => {
  assert(Array.isArray(value) && value.length > 0 && Object.keys(value).length === value.length
    && Array.from({length: value.length}, (_, i) => Object.hasOwn(value, i)).every(Boolean), 'CAPTION_MIGRATION_LIST_REQUIRED');
  value.forEach(obj); return value;
};
const same = (actual: any, expected: any, code: string) => assert.deepEqual(actual, expected, code);
function binding(value: any): DigestCaptionMigrationBindingV001 {
  exact(value, ['path', 'fileSha256'], ['sizeBytes', 'canonicalSha256', 'schemaVersion']);
  assert(typeof value.path === 'string' && value.path.endsWith('.json') && !value.path.includes('\\')
    && !value.path.includes('\0') && !value.path.split('/').some((part: string, i: number) =>
      part === '.' || part === '..' || (!part && !(i === 0 && path.isAbsolute(value.path))))
    && path.normalize(value.path) === value.path, 'CAPTION_MIGRATION_BINDING_PATH_INVALID');
  assert(/^[0-9a-f]{64}$/u.test(value.fileSha256), 'CAPTION_MIGRATION_BINDING_SHA_INVALID');
  if (value.canonicalSha256 !== undefined) assert(/^[0-9a-f]{64}$/u.test(value.canonicalSha256));
  if (value.schemaVersion !== undefined) assert(typeof value.schemaVersion === 'string' && value.schemaVersion.length);
  if (value.sizeBytes !== undefined) assert(Number.isSafeInteger(value.sizeBytes) && value.sizeBytes > 0);
  return value;
}
async function modules() {
  const wire = await import(new URL('../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts', import.meta.url).href);
  const core = await import(new URL('../../evals/clip_composition/adopted_media_manufacturing_v001.mts', import.meta.url).href);
  return {wire, core};
}
type Modules = Awaited<ReturnType<typeof modules>>;
function read(bound: DigestCaptionMigrationBoundJsonV001, m: Modules): Json {
  exact(bound, ['binding', 'bytes']); binding(bound.binding);
  assert(bound.bytes instanceof Uint8Array && bound.bytes.byteLength > 0, 'CAPTION_MIGRATION_BYTES_REQUIRED');
  assert.equal(sha(bound.bytes), bound.binding.fileSha256, 'CAPTION_MIGRATION_BOUND_BYTES_CHANGED');
  if (bound.binding.sizeBytes !== undefined) assert.equal(bound.bytes.byteLength, bound.binding.sizeBytes, 'CAPTION_MIGRATION_BOUND_SIZE_CHANGED');
  const value = obj(JSON.parse(Buffer.from(bound.bytes).toString('utf8')));
  const canonical = m.wire.canonicalSha(value); // Reject nonfinite or otherwise non-JSON values.
  if (bound.binding.canonicalSha256 !== undefined) assert.equal(canonical, bound.binding.canonicalSha256, 'CAPTION_MIGRATION_BOUND_CANONICAL_CHANGED');
  if (bound.binding.schemaVersion !== undefined) assert.equal(value.schemaVersion, bound.binding.schemaVersion, 'CAPTION_MIGRATION_BOUND_SCHEMA_CHANGED');
  return value;
}
function checkRequest(request: Json, m: Modules) {
  exact(request, ['schemaVersion', 'requestId', 'planBinding', 'machineAdoptionBinding', 'meaningInputBinding',
    'candidateId', 'timelineSegmentId', 'input', 'inputCanonicalSha256']);
  assert.equal(request.schemaVersion, 'digest-caption-judgment-display-request-v001');
  for (const field of ['requestId', 'candidateId', 'timelineSegmentId']) assert(typeof request[field] === 'string' && request[field].length);
  for (const field of ['planBinding', 'machineAdoptionBinding', 'meaningInputBinding']) binding(request[field]);
  assert.equal(request.inputCanonicalSha256, m.wire.canonicalSha(request.input), 'CAPTION_MIGRATION_INPUT_CANONICAL_CHANGED');
}
function checkSide(side: DigestCaptionMigrationRegistrationSideV001, m: Modules) {
  exact(side, ['request', 'response', 'result', 'trace', 'actualAnswerSource']);
  const request = read(side.request, m), response = read(side.response, m), result = read(side.result, m);
  const trace = read(side.trace, m), actual = read(side.actualAnswerSource, m);
  assert(path.isAbsolute(side.actualAnswerSource.binding.path), 'CAPTION_MIGRATION_ACTUAL_SOURCE_ABSOLUTE_REQUIRED');
  checkRequest(request, m); same(actual, response, 'CAPTION_MIGRATION_ACTUAL_SOURCE_CHANGED');
  assert.equal(side.actualAnswerSource.binding.fileSha256, side.response.binding.fileSha256, 'CAPTION_MIGRATION_ACTUAL_SOURCE_BYTES_CHANGED');
  // Current validator semantics recheck provenance, answer IDs, order, full coverage, and width.
  const token = m.core.validateDisplayForAdoptionV001(request, response, result, RESPONSE);
  exact(trace, ['schemaVersion', 'traces']); assert.equal(trace.schemaVersion, 'digest-approved-caption-trace-v001');
  const traces = m.core.readValidatedDisplayTracesV001([request], [token]);
  same(trace.traces, traces, 'CAPTION_MIGRATION_TRACE_CHANGED');
  return {request, response, result, trace, traces};
}
function checkRequestMigration(old: Json, current: Json) {
  assert.notEqual(current.requestId, old.requestId, 'CAPTION_MIGRATION_NEW_REQUEST_ID_REQUIRED');
  same(current.input, old.input, 'CAPTION_MIGRATION_REQUEST_INPUT_CHANGED');
  const restored = clone(current); restored.requestId = old.requestId; restored.meaningInputBinding = clone(old.meaningInputBinding);
  restored.machineAdoptionBinding = clone(old.machineAdoptionBinding);
  same(restored, old, 'CAPTION_MIGRATION_REQUEST_ENVELOPE_CHANGED');
}

/** Re-registers a saved answer against a new request; it never calls a judge or issues a permission. */
export async function buildDigestCaptionMigratedResponseV001(original: DigestCaptionMigrationRegistrationSideV001,
  currentRequest: DigestCaptionMigrationBoundJsonV001) {
  const m = await modules(), old = checkSide(original, m), request = read(currentRequest, m);
  checkRequest(request, m); checkRequestMigration(old.request, request);
  assert.notEqual(currentRequest.binding.fileSha256, original.request.binding.fileSha256, 'CAPTION_MIGRATION_NEW_REQUEST_BYTES_REQUIRED');
  const response = {...clone(old.response), requestFileSha256: currentRequest.binding.fileSha256};
  const result = clone(old.result); // The result contains only the preserved answer and current skill vocabulary.
  const token = m.core.validateDisplayForAdoptionV001(request, response, result, RESPONSE);
  const traces = m.core.readValidatedDisplayTracesV001([request], [token]);
  return {response, result, traces};
}

function meaningSemantics(meaning: Json) {
  assert.equal(meaning.schemaVersion, MEANING);
  const atoms = list(meaning.atomOccurrences), groups = list(meaning.orderedCandidates), captions = list(meaning.captions);
  assert.equal(captions.length, 1); assert.equal(groups.length, 31, 'CAPTION_MIGRATION_GROUP_COUNT_CHANGED');
  const ids = atoms.map(a => a.atomOccurrenceId);
  assert(ids.every(id => typeof id === 'string' && id.length) && new Set(ids).size === ids.length, 'CAPTION_MIGRATION_ATOM_ID_INVALID');
  same(groups.flatMap(group => group.atomOccurrenceIds), ids, 'CAPTION_MIGRATION_ATOM_ORDER_INVALID');
  same(captions[0].atomOccurrenceIds, ids, 'CAPTION_MIGRATION_CAPTION_COVERAGE_INVALID');
  assert.equal(captions[0].text, atoms.map(atom => atom.text).join(''), 'CAPTION_MIGRATION_CAPTION_TEXT_INVALID');
  assert(new Set(groups.map(group => group.timelineSegmentId)).size === groups.length, 'CAPTION_MIGRATION_GROUP_ID_DUPLICATE');
  atoms.forEach((atom, i) => {
    assert.equal(atom.ordinal, i + 1); assert(typeof atom.text === 'string' && atom.text.length);
    assert(Number.isSafeInteger(atom.sourceSegmentId) && atom.sourceSegmentId >= 0 && typeof atom.semanticUtteranceId === 'string' && atom.semanticUtteranceId.length);
    const spans = list(atom.retainedSpans); assert.equal(spans.length, 1);
    assert(Number.isSafeInteger(spans[0].sourceStartMs) && Number.isSafeInteger(spans[0].sourceEndMs)
      && spans[0].sourceStartMs >= 0 && spans[0].sourceEndMs > spans[0].sourceStartMs, 'CAPTION_MIGRATION_ATOM_CLOCK_INVALID');
  });
  return {atoms, groups};
}
function preparationMeaning(preparation: Json, meaningBinding: DigestCaptionMigrationBindingV001, current: boolean) {
  assert.equal(preparation.schemaVersion, current ? 'digest-caption-input-preparation-v002' : PREPARATION);
  const outputs = list(preparation.outputs), meanings = outputs.filter(output => output.fileName === 'meaning-input.json');
  assert.equal(meanings.length, 1, 'CAPTION_MIGRATION_PREPARATION_MEANING_MISSING');
  const {fileName: _, ...recorded} = meanings[0];
  same(recorded, meaningBinding, 'CAPTION_MIGRATION_PREPARATION_MEANING_CHANGED');
  assert.equal(outputs.filter(output => /^display-request-\d{4}\.json$/u.test(output.fileName)).length, 31,
    'CAPTION_MIGRATION_PREPARATION_REQUEST_COUNT_CHANGED');
}
function logicalBound(preparation: Json, logical: Json, actual: DigestCaptionMigrationBoundJsonV001) {
  const references = list(preparation.logicalToPhysical).filter(reference => reference.path === logical.path);
  assert.equal(references.length, 1, 'CAPTION_MIGRATION_LOGICAL_REFERENCE_MISSING');
  assert.equal(references[0].fileSha256, logical.fileSha256, 'CAPTION_MIGRATION_LOGICAL_SHA_CHANGED');
  assert.equal(references[0].physicalPath, actual.binding.path, 'CAPTION_MIGRATION_PHYSICAL_REFERENCE_CHANGED');
  assert.equal(references[0].bytesVerified, true, 'CAPTION_MIGRATION_JSON_UNVERIFIED');
  assert.equal(actual.binding.fileSha256, logical.fileSha256, 'CAPTION_MIGRATION_LOGICAL_BYTES_CHANGED');
}
function executionOwner(preparation: Json, execution: Json, actual: DigestCaptionMigrationBoundJsonV001) {
  assert.equal(execution.schemaVersion, 'digest-execution-input-artifact-v001');
  assert.equal(execution.requestId, preparation.expected.executionRequestId, 'CAPTION_MIGRATION_EXECUTION_OWNER_CHANGED');
  assert.equal(execution.requestDraftId, preparation.expected.requestDraftId, 'CAPTION_MIGRATION_DRAFT_OWNER_CHANGED');
  assert.equal(actual.binding.fileSha256, preparation.expected.executionSha256, 'CAPTION_MIGRATION_EXECUTION_SHA_CHANGED');
  assert.equal(execution.planFileRefBinding.requestId, preparation.expected.planRequestId, 'CAPTION_MIGRATION_PLAN_OWNER_CHANGED');
  assert.equal(execution.planFileRefBinding.fileSha256, preparation.expected.planSha256, 'CAPTION_MIGRATION_PLAN_SHA_CHANGED');
  const references = list(preparation.inputReferences).filter(reference => reference.path === actual.binding.path);
  assert.equal(references.length, 1, 'CAPTION_MIGRATION_EXECUTION_REFERENCE_MISSING');
  assert.equal(references[0].fileSha256, actual.binding.fileSha256, 'CAPTION_MIGRATION_EXECUTION_REFERENCE_CHANGED');
}

async function derive(params: DigestCaptionRegistrationMigrationParametersV001) {
  exact(params, ['planId', 'approvalEvidence', 'expectedApprovalEvidenceBinding', 'originalCandidate', 'originalPreparation',
    'preparation', 'originalMeaning', 'meaning', 'originalExecution', 'execution', 'originalMachineAdoption',
    'machineAdoption', 'originalClock', 'clock', 'registrations']);
  assert.equal(params.planId, PLAN, 'CAPTION_MIGRATION_PLAN_OUT_OF_SCOPE');
  const m = await modules(); binding(params.expectedApprovalEvidenceBinding);
  same(params.approvalEvidence.binding, params.expectedApprovalEvidenceBinding, 'CAPTION_MIGRATION_APPROVAL_BINDING_CHANGED');
  const approval = read(params.approvalEvidence, m);
  same(approval.nativeApprovalOrigin, NATIVE_APPROVAL, 'CAPTION_MIGRATION_NATIVE_APPROVAL_CHANGED');
  same(approval.originalCandidateManifestBinding, params.originalCandidate.binding, 'CAPTION_MIGRATION_APPROVED_ORIGIN_CHANGED');
  const originalCandidate = read(params.originalCandidate, m), originalPreparation = read(params.originalPreparation, m);
  const preparation = read(params.preparation, m), originalMeaning = read(params.originalMeaning, m), meaning = read(params.meaning, m);
  const originalExecution = read(params.originalExecution, m), execution = read(params.execution, m);
  const originalMachineAdoption = read(params.originalMachineAdoption, m), machineAdoption = read(params.machineAdoption, m);
  const originalClock = read(params.originalClock, m), clock = read(params.clock, m);
  assert.equal(originalCandidate.schemaVersion, 'digest-approved-caption-bundle-v001', 'CAPTION_MIGRATION_ORIGINAL_CANDIDATE_INVALID');
  same(originalCandidate.preparationManifestBinding, params.originalPreparation.binding, 'CAPTION_MIGRATION_ORIGINAL_PREPARATION_CHANGED');
  same(originalCandidate.meaningBinding, params.originalMeaning.binding, 'CAPTION_MIGRATION_ORIGINAL_MEANING_CHANGED');
  preparationMeaning(originalPreparation, params.originalMeaning.binding, false); preparationMeaning(preparation, params.meaning.binding, true);
  assert.notEqual(params.preparation.binding.path, params.originalPreparation.binding.path, 'CAPTION_MIGRATION_NEW_PREPARATION_REQUIRED');
  assert.notEqual(params.preparation.binding.fileSha256, params.originalPreparation.binding.fileSha256, 'CAPTION_MIGRATION_NEW_PREPARATION_BYTES_REQUIRED');
  executionOwner(originalPreparation, originalExecution, params.originalExecution); executionOwner(preparation, execution, params.execution);
  for (const key of ['requestDraftId', 'planRequestId', 'planSha256'])
    assert.equal(preparation.expected[key], originalPreparation.expected[key], 'CAPTION_MIGRATION_UPSTREAM_OWNER_CHANGED');
  assert.notEqual(preparation.expected.executionRequestId, originalPreparation.expected.executionRequestId, 'CAPTION_MIGRATION_NEW_EXECUTION_REQUIRED');
  assert.notEqual(preparation.expected.executionSha256, originalPreparation.expected.executionSha256, 'CAPTION_MIGRATION_NEW_EXECUTION_BYTES_REQUIRED');
  assert.equal(preparation.preparationId, originalPreparation.preparationId, 'CAPTION_MIGRATION_MEANING_ID_NAMESPACE_CHANGED');
  const previousScope = obj(originalPreparation.scopeBinding), currentScope = obj(preparation.scopeBinding);
  assert(previousScope.path !== currentScope.path || previousScope.fileSha256 !== currentScope.fileSha256,
    'CAPTION_MIGRATION_NEW_FORMAL_SCOPE_REQUIRED');
  logicalBound(originalPreparation, originalMeaning.machineAdoptionBinding, params.originalMachineAdoption);
  logicalBound(preparation, meaning.machineAdoptionBinding, params.machineAdoption);
  same(machineAdoption, originalMachineAdoption, 'CAPTION_MIGRATION_ADOPTED_PLAN_CHANGED');
  const restoredMeaning = clone(meaning); restoredMeaning.machineAdoptionBinding = clone(originalMeaning.machineAdoptionBinding);
  same(restoredMeaning, originalMeaning, 'CAPTION_MIGRATION_MEANING_TEXT_ID_ORDER_CLOCK_CHANGED');
  const {atoms, groups} = meaningSemantics(meaning);
  same(clock, originalClock, 'CAPTION_MIGRATION_ORIGINAL_CLOCK_CHANGED');
  assert.equal(clock.status, 'passed', 'CAPTION_MIGRATION_CLOCK_NOT_PASSED');
  same(originalCandidate.originalClockBinding, originalPreparation.originalClockBinding, 'CAPTION_MIGRATION_CANDIDATE_CLOCK_CHANGED');
  same(originalPreparation.originalClockBinding, originalExecution.clockResolutionBinding, 'CAPTION_MIGRATION_ORIGINAL_EXECUTION_CLOCK_CHANGED');
  same(preparation.originalClockBinding, execution.clockResolutionBinding, 'CAPTION_MIGRATION_CURRENT_EXECUTION_CLOCK_CHANGED');
  logicalBound(originalPreparation, originalExecution.clockResolutionBinding, params.originalClock);
  logicalBound(preparation, execution.clockResolutionBinding, params.clock);
  assert.equal(params.originalClock.binding.fileSha256, preparation.originalClockBinding.fileSha256, 'CAPTION_MIGRATION_CLOCK_BYTES_CHANGED');
  assert.equal(params.clock.binding.fileSha256, params.originalClock.binding.fileSha256, 'CAPTION_MIGRATION_CLOCK_BYTES_CHANGED');
  const mappings = list(clock.mappings); assert.equal(mappings.length, groups.length);
  const receipts = list(originalCandidate.responses), registrations = list(params.registrations);
  assert.equal(receipts.length, 31, 'CAPTION_MIGRATION_ORIGINAL_REGISTRATION_COUNT_CHANGED');
  assert.equal(registrations.length, 31, 'CAPTION_MIGRATION_BIJECTION_MISSING');
  const oldRequestPaths = new Set<string>(), newRequestPaths = new Set<string>();
  const oldResponsePaths = new Set<string>(), newResponsePaths = new Set<string>();
  const migrationRows: Json[] = [];
  for (const [i, registration] of registrations.entries()) {
    exact(registration, ['ordinal', 'original', 'current']); assert.equal(registration.ordinal, i + 1, 'CAPTION_MIGRATION_BIJECTION_ORDER_CHANGED');
    const receipt = receipts[i], group = groups[i], mapping = mappings[i];
    assert.equal(receipt.ordinal, i + 1, 'CAPTION_MIGRATION_ORIGINAL_ORDINAL_CHANGED');
    for (const field of ['request', 'response', 'result', 'trace'])
      same(registration.original[field].binding, receipt[field + 'Binding'], 'CAPTION_MIGRATION_ORIGINAL_RECEIPT_CHANGED');
    same(registration.original.actualAnswerSource.binding, receipt.actualAnswerSourceBinding, 'CAPTION_MIGRATION_ORIGINAL_ANSWER_SOURCE_CHANGED');
    const old = checkSide(registration.original, m), current = checkSide(registration.current, m);
    checkRequestMigration(old.request, current.request);
    assert.equal(old.request.candidateId, group.candidateId); assert.equal(old.request.timelineSegmentId, group.timelineSegmentId);
    assert.equal(mapping.segmentId, group.timelineSegmentId, 'CAPTION_MIGRATION_MAPPING_ORDER_CHANGED');
    same(old.request.meaningInputBinding, params.originalMeaning.binding, 'CAPTION_MIGRATION_REQUEST_ORIGINAL_MEANING_CHANGED');
    same(current.request.meaningInputBinding, params.meaning.binding, 'CAPTION_MIGRATION_REQUEST_CURRENT_MEANING_CHANGED');
    same(old.request.machineAdoptionBinding, originalMeaning.machineAdoptionBinding, 'CAPTION_MIGRATION_REQUEST_ORIGINAL_ADOPTION_CHANGED');
    same(current.request.machineAdoptionBinding, meaning.machineAdoptionBinding, 'CAPTION_MIGRATION_REQUEST_CURRENT_ADOPTION_CHANGED');
    const groupAtoms = group.atomOccurrenceIds.map((id: string) => atoms.find(atom => atom.atomOccurrenceId === id));
    assert(groupAtoms.every(Boolean));
    same(current.request.input.captions[0].boundaryCandidates.map((boundary: Json) => boundary.text),
      groupAtoms.map((atom: Json) => atom.text), 'CAPTION_MIGRATION_REQUEST_TEXT_COVERAGE_CHANGED');
    assert(groupAtoms.every((atom: Json) => atom.retainedSpans[0].timelineSegmentId === group.timelineSegmentId),
      'CAPTION_MIGRATION_ATOM_GROUP_CHANGED');
    same(current.response.answer, old.response.answer, 'CAPTION_MIGRATION_ANSWER_CHANGED');
    same(current.response.judgmentNote, old.response.judgmentNote, 'CAPTION_MIGRATION_JUDGMENT_NOTE_CHANGED');
    same(current.result, old.result, 'CAPTION_MIGRATION_RESULT_CHANGED');
    assert.notEqual(registration.current.request.binding.fileSha256, registration.original.request.binding.fileSha256,
      'CAPTION_MIGRATION_NEW_REQUEST_BYTES_REQUIRED');
    assert.notEqual(registration.current.response.binding.fileSha256, registration.original.response.binding.fileSha256,
      'CAPTION_MIGRATION_NEW_RESPONSE_BYTES_REQUIRED');
    assert.notEqual(registration.current.actualAnswerSource.binding.path, registration.original.actualAnswerSource.binding.path,
      'CAPTION_MIGRATION_OLD_SOURCE_AS_NEW_FORBIDDEN');
    assert.notEqual(registration.current.response.binding.path, registration.original.response.binding.path,
      'CAPTION_MIGRATION_OLD_RESPONSE_OVERWRITE_FORBIDDEN');
    assert.notEqual(registration.current.request.binding.path, registration.original.request.binding.path,
      'CAPTION_MIGRATION_OLD_REQUEST_OVERWRITE_FORBIDDEN');
    oldRequestPaths.add(registration.original.request.binding.path); newRequestPaths.add(registration.current.request.binding.path);
    oldResponsePaths.add(registration.original.response.binding.path); newResponsePaths.add(registration.current.response.binding.path);
    migrationRows.push({ordinal: i + 1, candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId,
      original: Object.fromEntries((Object.entries(registration.original) as Array<[string, DigestCaptionMigrationBoundJsonV001]>).map(([field, bound]) => [field + 'Binding', clone(bound.binding)])),
      current: Object.fromEntries((Object.entries(registration.current) as Array<[string, DigestCaptionMigrationBoundJsonV001]>).map(([field, bound]) => [field + 'Binding', clone(bound.binding)])),
      inputCanonicalSha256: current.request.inputCanonicalSha256,
      answerCanonicalSha256: m.wire.canonicalSha(current.response.answer),
      originalClockMappingCanonicalSha256: m.wire.canonicalSha(mapping)});
  }
  for (const paths of [oldRequestPaths, newRequestPaths, oldResponsePaths, newResponsePaths])
    assert.equal(paths.size, 31, 'CAPTION_MIGRATION_BIJECTION_DUPLICATE');
  return {schemaVersion: PROOF, planId: params.planId, mode: 'explicit-current-registration; preserved-answer-payloads',
    nativeApprovalOrigin: clone(NATIVE_APPROVAL),
    bindings: {approvalEvidenceBinding: clone(params.approvalEvidence.binding),
      originalCandidateManifestBinding: clone(params.originalCandidate.binding),
      oldPreparationManifestBinding: clone(params.originalPreparation.binding), newPreparationManifestBinding: clone(params.preparation.binding),
      oldMeaningBinding: clone(params.originalMeaning.binding), newMeaningBinding: clone(params.meaning.binding),
      originalExecutionBinding: clone(params.originalExecution.binding), currentExecutionBinding: clone(params.execution.binding),
      originalMachineAdoptionBinding: clone(params.originalMachineAdoption.binding), currentMachineAdoptionBinding: clone(params.machineAdoption.binding),
      originalClockBinding: clone(params.originalClock.binding), currentClockBinding: clone(params.clock.binding)},
    owners: {original: clone(originalPreparation.expected), current: clone(preparation.expected)},
    registrations: migrationRows,
    invariants: {registrationCount: 31, atomCount: atoms.length, originalMeaningCanonicalSha256: m.wire.canonicalSha(originalMeaning),
      currentMeaningCanonicalSha256: m.wire.canonicalSha(meaning), originalClockCanonicalSha256: m.wire.canonicalSha(originalClock),
      currentClockCanonicalSha256: m.wire.canonicalSha(clock), answersUnchanged: true, judgmentNotesUnchanged: true,
      newRequestProvenanceValidated: true, newTracesReconstructed: true},
    effects: {newJudgments: 0, sourceAcquisitions: 0, sttInvocations: 0, mediaProcessing: 0, externalApiInvocations: 0},
    admission: {manufacturingPermission: 'not-granted-by-migration', humanQuality: 'not-evaluated'}};
}

export async function buildDigestCaptionRegistrationMigrationV001(params: DigestCaptionRegistrationMigrationParametersV001): Promise<Json> {
  return derive(params);
}
export async function assertDigestCaptionRegistrationMigrationV001(params: DigestCaptionRegistrationMigrationValidationParametersV001): Promise<void> {
  const {proof, ...inputs} = params;
  same(obj(proof), await derive(inputs), 'CAPTION_MIGRATION_PROOF_RECONSTRUCTION_CHANGED');
}

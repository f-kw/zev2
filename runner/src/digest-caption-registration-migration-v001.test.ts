import assert from 'node:assert/strict';
import test from 'node:test';
import {buildDigestCaptionMigratedResponseV001, buildDigestCaptionRegistrationMigrationV001,
  assertDigestCaptionRegistrationMigrationV001,
  type DigestCaptionMigrationBoundJsonV001, type DigestCaptionRegistrationMigrationParametersV001}
  from './digest-caption-registration-migration-v001.js';

type Json = Record<string, any>;
const clone = <T>(value: T): T => structuredClone(value);
const wire = await import(new URL('../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts', import.meta.url).href);
const core = await import(new URL('../../evals/clip_composition/adopted_media_manufacturing_v001.mts', import.meta.url).href);
const bound = (p: string, value: Json): DigestCaptionMigrationBoundJsonV001 => {
  const bytes = wire.formal(value);
  return {binding: {path: p, fileSha256: wire.sha(bytes), sizeBytes: bytes.length,
    canonicalSha256: wire.canonicalSha(value), schemaVersion: value.schemaVersion}, bytes};
};
const json = (b: DigestCaptionMigrationBoundJsonV001): Json => JSON.parse(Buffer.from(b.bytes).toString());
const replace = (b: DigestCaptionMigrationBoundJsonV001, fn: (value: Json) => void) => {
  const value = json(b); fn(value); return bound(b.binding.path, value);
};
const reference = (p: string, value: Json) => bound(p, value).binding;
// In-memory synthetic bytes only. This creates no file, qualified job, external approval, or media capability.
async function fixture(repeatedCandidate = false): Promise<DigestCaptionRegistrationMigrationParametersV001> {
  const planId = 'digest-SJvP9jhEdyI-20261004-v001', preparationId = planId + '-caption';
  const originalMachineAdoption = bound('fixture/old/machine-adoption.json', {schemaVersion: 'new-material-digest-execution-adoption-v001',
    artifactId: 'saved-plan-adoption', humanQuality: 'pending', adoptedCandidates: [1, 2]});
  const machineAdoption = bound('fixture/current/machine-adoption.json', json(originalMachineAdoption));
  const originalLogicalAdoption = {...originalMachineAdoption.binding, path: 'artifacts/draft/old-execution/machine-adoption.json'};
  const currentLogicalAdoption = {...machineAdoption.binding, path: 'artifacts/draft/new-execution/machine-adoption.json'};
  const atoms: Json[] = [], groups: Json[] = [], mappings: Json[] = [];
  for (let i = 0; i < 31; i++) {
    const segmentId = `segment-${i + 1}`, start = i * 2000;
    const local = ['あ', '!'].map((text, j) => ({atomOccurrenceId: `${preparationId}-atom-${i * 2 + j + 1}`,
      ordinal: i * 2 + j + 1, text, sourceSegmentId: i * 2 + j + 1, semanticUtteranceId: `utterance-${i + 1}`,
      retainedSpans: [{timelineSegmentId: segmentId, sourceStartMs: start + j * 500, sourceEndMs: start + (j + 1) * 500}]}));
    atoms.push(...local); groups.push({candidateId: `candidate-${repeatedCandidate ? Math.floor(i / 2) + 1 : i + 1}`, timelineSegmentId: segmentId, atomOccurrenceIds: local.map(a => a.atomOccurrenceId)});
    mappings.push({segmentId, sourceStartMs: start, sourceEndMs: start + 1000, sourceStartFrame30: i * 60,
      sourceEndFrame30: i * 60 + 30, outputStartFrame: i * 30, outputEndFrame: (i + 1) * 30});
  }
  const meaningValue = {schemaVersion: 'digest-caption-judgment-meaning-input-v001', artifactId: preparationId + '-meaning',
    machineAdoptionBinding: originalLogicalAdoption,
    transcriptBinding: reference('fixture/transcript.json', {schemaVersion: 'transcript-v001', text: 'あ!'}),
    utteranceBinding: reference('fixture/utterances.json', {schemaVersion: 'utterances-v001'}),
    sourceVideoBinding: {path: 'fixture/source.mp4', fileSha256: '9'.repeat(64)}, orderedCandidates: groups, atomOccurrences: atoms,
    captions: [{captionId: preparationId + '-caption', ordinal: 1, text: atoms.map(a => a.text).join(''), atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}]};
  const originalMeaning = bound('fixture/old/meaning-input.json', meaningValue);
  const meaning = bound('fixture/current/meaning-input.json', {...clone(meaningValue), machineAdoptionBinding: currentLogicalAdoption});
  const originalClock = bound('fixture/old/clock.json', {schemaVersion: 'digest-clock-resolution-v001', status: 'passed', mappings});
  const clock = bound('fixture/current/clock.json', json(originalClock));
  const oldClockLogical = {...originalClock.binding, path: 'artifacts/draft/old-execution/clock-resolution.json'};
  const newClockLogical = {...clock.binding, path: 'artifacts/draft/new-execution/clock-resolution.json'};
  const planBinding = reference('fixture/plan.json', {schemaVersion: 'plan-v001', segments: groups});
  const makeExecution = (requestId: string, clockResolutionBinding: Json) => ({schemaVersion: 'digest-execution-input-artifact-v001',
    requestDraftId: 'draft', requestId, planFileRefBinding: {...planBinding, requestId: 'plan-request'}, clockResolutionBinding});
  const originalExecution = bound('fixture/old/execution.json', makeExecution('old-execution', oldClockLogical));
  const execution = bound('fixture/current/execution.json', makeExecution('new-execution', newClockLogical));
  const registrations: DigestCaptionRegistrationMigrationParametersV001['registrations'] = [];
  for (let i = 0; i < 31; i++) {
    const group = groups[i], local = atoms.slice(i * 2, i * 2 + 2), captionId = preparationId + `-input-caption-segment-${i + 1}`;
    const input = {schemaVersion: 'presentation-zevo-caption-selection-input-v001', taskDescription: '保存済み字幕の表示区切りを検証する',
      captions: [{captionId, boundaryCandidates: local.map(atom => ({boundaryId: 'boundary-' + atom.atomOccurrenceId, text: atom.text}))}],
      styleLimits: {maxLogicalWidthPerLine: 15, maxLinesPerCue: 2, characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2'}};
    const oldRequestValue = {schemaVersion: 'digest-caption-judgment-display-request-v001', requestId: `old-request-${i + 1}`,
      planBinding, machineAdoptionBinding: originalLogicalAdoption, meaningInputBinding: originalMeaning.binding,
      candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId, input, inputCanonicalSha256: wire.canonicalSha(input)};
    const request = bound(`fixture/old/request-${i + 1}.json`, oldRequestValue);
    const end = input.captions[0].boundaryCandidates.at(-1)!.boundaryId;
    const answer = {status: 'complete', captions: [{captionId, cues: [{cueEndBoundaryId: end, lineEndBoundaryIds: [end]}]}]};
    const responseValue = {schemaVersion: 'digest-caption-judgment-display-response-v001', requestFileSha256: request.binding.fileSha256,
      answer, judgmentNote: '保存済みの判断理由'};
    const response = bound(`fixture/old/response-${i + 1}.json`, responseValue);
    const resultValue = {schemaVersion: 'caption-display-skill-result-v001', skillId: 'caption-display-boundaries', skillVersion: 'v001', answer};
    const result = bound(`fixture/old/result-${i + 1}.json`, resultValue);
    const token = core.validateDisplayForAdoptionV001(oldRequestValue, responseValue, resultValue, responseValue.schemaVersion);
    const trace = bound(`fixture/old/trace-${i + 1}.json`, {schemaVersion: 'digest-approved-caption-trace-v001',
      traces: core.readValidatedDisplayTracesV001([oldRequestValue], [token])});
    const original = {request, response, result, trace, actualAnswerSource: bound(`/fixture/answers/old-response-${i + 1}.json`, responseValue)};
    const currentRequest = bound(`fixture/current/request-${i + 1}.json`, {...clone(oldRequestValue), requestId: `current-request-${i + 1}`,
      meaningInputBinding: meaning.binding, machineAdoptionBinding: currentLogicalAdoption});
    const built = await buildDigestCaptionMigratedResponseV001(original, currentRequest);
    const current = {request: currentRequest, response: bound(`fixture/current/response-${i + 1}.json`, built.response),
      result: bound(`fixture/current/result-${i + 1}.json`, built.result),
      trace: bound(`fixture/current/trace-${i + 1}.json`, {schemaVersion: 'digest-approved-caption-trace-v001', traces: built.traces}),
      actualAnswerSource: bound(`/fixture/answers/current-response-${i + 1}.json`, built.response)};
    registrations.push({ordinal: i + 1, original, current});
  }
  const makePreparation = (current: boolean) => {
    const m = current ? meaning : originalMeaning, e = current ? execution : originalExecution;
    return {schemaVersion: current ? 'digest-caption-input-preparation-v002' : 'digest-caption-judgment-preparation-bundle-v001', preparationId,
      scopeBinding: reference(`fixture/${current ? 'current' : 'old'}/scope.json`, {schemaVersion: 'scope-v001', phase: current ? 'migration' : 'original'}),
      expected: {requestDraftId: 'draft', planRequestId: 'plan-request', planSha256: planBinding.fileSha256,
        executionRequestId: current ? 'new-execution' : 'old-execution', executionSha256: e.binding.fileSha256},
      originalClockBinding: current ? newClockLogical : oldClockLogical, inputReferences: [e.binding],
      logicalToPhysical: [{path: (current ? currentLogicalAdoption : originalLogicalAdoption).path,
        fileSha256: (current ? machineAdoption : originalMachineAdoption).binding.fileSha256,
        physicalPath: (current ? machineAdoption : originalMachineAdoption).binding.path, bytesVerified: true},
      {path: (current ? newClockLogical : oldClockLogical).path, fileSha256: (current ? clock : originalClock).binding.fileSha256,
        physicalPath: (current ? clock : originalClock).binding.path, bytesVerified: true}],
      outputs: [{fileName: 'meaning-input.json', ...m.binding}, ...registrations.map((r, i) => ({fileName: `display-request-${String(i + 1).padStart(4, '0')}.json`,
        ...(current ? r.current : r.original).request.binding}))]};
  };
  const originalPreparation = bound('fixture/old/preparation.json', makePreparation(false));
  const preparation = bound('fixture/current/preparation.json', makePreparation(true));
  const originalCandidate = bound('fixture/old/manifest.json', {schemaVersion: 'digest-approved-caption-bundle-v001',
    preparationManifestBinding: originalPreparation.binding, meaningBinding: originalMeaning.binding, originalClockBinding: oldClockLogical,
    responses: registrations.map(r => ({ordinal: r.ordinal,
      ...Object.fromEntries(Object.entries(r.original).map(([field, value]) => [field === 'actualAnswerSource' ? 'actualAnswerSourceBinding' : field + 'Binding', value.binding]))}))});
  const approvalEvidence = bound('fixture/approval.json', {schemaVersion: 'fixture-native-approval-evidence-v001',
    nativeApprovalOrigin: {sourceThreadId: '01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6',
      userMessageId: 'Sentinel_cf8aca8c66e88191900cd3508db6ba22', userText: 'いいよ'}, originalCandidateManifestBinding: originalCandidate.binding});
  return {planId, approvalEvidence, expectedApprovalEvidenceBinding: clone(approvalEvidence.binding), originalCandidate,
    originalPreparation, preparation, originalMeaning, meaning, originalExecution, execution,
    originalMachineAdoption, machineAdoption, originalClock, clock, registrations};
}

test('31 saved payloads get new request provenance without mutating origin or issuing permission', async () => {
  const p = await fixture(), before = clone(p), proof = await buildDigestCaptionRegistrationMigrationV001(p);
  await assertDigestCaptionRegistrationMigrationV001({...p, proof}); assert.deepEqual(clone(p), before);
  assert.equal(proof.registrations.length, 31); assert.deepEqual(proof.owners.original, json(p.originalPreparation).expected);
  assert.deepEqual(proof.owners.current, json(p.preparation).expected);
  assert.equal(proof.admission.manufacturingPermission, 'not-granted-by-migration');
  assert.equal(proof.admission.humanQuality, 'not-evaluated');
  for (const r of p.registrations) {
    assert.deepEqual(json(r.original.response).answer, json(r.current.response).answer);
    assert.notEqual(r.original.response.binding.fileSha256, r.current.response.binding.fileSha256);
  }
});

function changeMeaning(p: DigestCaptionRegistrationMigrationParametersV001, mutate: (v: Json) => void) {
  p.meaning = replace(p.meaning, mutate);
  p.preparation = replace(p.preparation, v => {v.outputs[0] = {fileName: 'meaning-input.json', ...p.meaning.binding};});
}
const mutations: Array<[string, (p: DigestCaptionRegistrationMigrationParametersV001) => void | Promise<void>, RegExp]> = [
  ['answer change that still passes ordinary Core membership checks', p => {
    const c = p.registrations[0].current, request = json(c.request), response = json(c.response), result = json(c.result);
    response.answer.captions[0].cues = request.input.captions[0].boundaryCandidates.map((b: Json) => ({cueEndBoundaryId: b.boundaryId, lineEndBoundaryIds: [b.boundaryId]}));
    result.answer = clone(response.answer); const token = core.validateDisplayForAdoptionV001(request, response, result, response.schemaVersion);
    c.response = bound(c.response.binding.path, response); c.result = bound(c.result.binding.path, result);
    c.actualAnswerSource = bound(c.actualAnswerSource.binding.path, response);
    c.trace = bound(c.trace.binding.path, {schemaVersion: 'digest-approved-caption-trace-v001', traces: core.readValidatedDisplayTracesV001([request], [token])});
  }, /ANSWER_CHANGED/],
  ['text change with rehashed preparation output', p => {changeMeaning(p, v => {v.atomOccurrences[0].text = 'い';});}, /MEANING_TEXT_ID_ORDER_CLOCK_CHANGED/],
  ['atom ID change with rehashed preparation output', p => {changeMeaning(p, v => {v.atomOccurrences[0].atomOccurrenceId = 'other';});}, /MEANING_TEXT_ID_ORDER_CLOCK_CHANGED/],
  ['atom order change with rehashed preparation output', p => {changeMeaning(p, v => {v.atomOccurrences.reverse();});}, /MEANING_TEXT_ID_ORDER_CLOCK_CHANGED/],
  ['candidate reassignment with rehashed preparation output', p => {changeMeaning(p, v => {v.orderedCandidates[0].candidateId = 'other-candidate';});}, /MEANING_TEXT_ID_ORDER_CLOCK_CHANGED/],
  ['clock change', p => {p.clock = replace(p.clock, v => {v.mappings[0].outputEndFrame++;});}, /ORIGINAL_CLOCK_CHANGED/],
  ['missing registration', p => {p.registrations.pop();}, /BIJECTION_MISSING/],
  ['duplicate registration', p => {p.registrations[1] = clone(p.registrations[0]); p.registrations[1].ordinal = 2;}, /ORIGINAL_RECEIPT_CHANGED/],
  ['corrupt bound SHA', p => {p.registrations[0].current.request.binding.fileSha256 = 'a'.repeat(64);}, /BOUND_BYTES_CHANGED/],
  ['old answer original used as new source', p => {p.registrations[0].current.actualAnswerSource = clone(p.registrations[0].original.actualAnswerSource);}, /ACTUAL_SOURCE_CHANGED/],
  ['same old source path with substituted new bytes', p => {p.registrations[0].current.actualAnswerSource.binding.path = p.registrations[0].original.actualAnswerSource.binding.path;}, /OLD_SOURCE_AS_NEW_FORBIDDEN/],
  ['unanchored approval SHA', p => {p.expectedApprovalEvidenceBinding.fileSha256 = 'c'.repeat(64);}, /APPROVAL_BINDING_CHANGED/],
  ['fake native origin', p => {p.approvalEvidence = replace(p.approvalEvidence, v => {v.nativeApprovalOrigin.userMessageId = 'invented';}); p.expectedApprovalEvidenceBinding = clone(p.approvalEvidence.binding);}, /NATIVE_APPROVAL_CHANGED/],
  ['different approved origin', p => {p.approvalEvidence = replace(p.approvalEvidence, v => {v.originalCandidateManifestBinding.fileSha256 = 'b'.repeat(64);}); p.expectedApprovalEvidenceBinding = clone(p.approvalEvidence.binding);}, /APPROVED_ORIGIN_CHANGED/],
  ['execution owner changed', p => {p.execution = replace(p.execution, v => {v.requestId = 'unregistered-owner';});}, /EXECUTION_OWNER_CHANGED/],
];
for (const [name, mutate, pattern] of mutations) test(`rejects ${name}`, async () => {
  const p = await fixture(); await mutate(p); await assert.rejects(buildDigestCaptionRegistrationMigrationV001(p), pattern);
});
test('several kept segments may belong to the same saved candidate without changing correspondence', async () => {
  const p = await fixture(true), proof = await buildDigestCaptionRegistrationMigrationV001(p);
  await assertDigestCaptionRegistrationMigrationV001({...p, proof});
  assert(proof.registrations.length > new Set(proof.registrations.map((r: Json) => r.candidateId)).size);
  assert.equal(new Set(proof.registrations.map((r: Json) => r.timelineSegmentId)).size, 31);
});
test('a fabricated persisted migration assertion does not replace recomputation', async () => {
  const p = await fixture(), proof = await buildDigestCaptionRegistrationMigrationV001(p);
  proof.registrations[0].current.responseBinding.fileSha256 = 'f'.repeat(64);
  await assert.rejects(assertDigestCaptionRegistrationMigrationV001({...p, proof}), /PROOF_RECONSTRUCTION_CHANGED/);
});

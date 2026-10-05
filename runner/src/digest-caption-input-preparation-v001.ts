import assert from 'node:assert/strict';
import {mkdir, writeFile, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertApprovedAgentRequestInput, assertDigestArtifactV001, assertDigestPlanReferenceClosureV001,
  digestArtifactFileNameV001, digestArtifactPathFromUriV001, digestProducerRequestIdsV001,
  type Zev2State, type DigestByteBindingV001, type DigestJsonBindingV001} from '@zev2/shared';
import {registeredDigestDependencyV001, NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001, resolveNormalDigestDeclaredGuestSourcePathV001, assertNormalDigestSourceProvenanceV001} from './digest-plan-preparation-v001.js';
import {assertDistantConnectionCommonUtteranceArtifactV001,
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001} from './distant-connection-common-utterance-artifact-v001.js';
import {assertCaptionDisplayInputV001} from './skills/caption-display-boundaries-v001.js';
import type {TranscriptArtifact} from './workflow-artifacts.js';
import type {InternalRetentionInputV001} from './skills/candidate-internal-retention-v001.js';

type Obj = Record<string, unknown>;
type Segment = {candidateId: string; segmentId: string; sourceSegmentIds: number[]; sourceStartMs: number; sourceEndMs: number};
export type DigestCaptionPreparationParametersV001 = {
  workspaceRoot: string; inputRoot: string; inputPrefix: string; sourceRuntimeRoot: string; outputRoot: string; preparationId: string;
  stateBinding: DigestByteBindingV001; scopeBinding: DigestByteBindingV001; styleTemplateBinding: DigestByteBindingV001;
  expected: {requestDraftId: string; planRequestId: string; executionRequestId: string; planSha256: string; executionSha256: string};
};
const SCHEMA = 'digest-caption-input-preparation-v002';
const PURPOSE = '確定済み保持本文を、既存表示Skillへ渡す要求として組み立てて保存する。表示境界の選択・回答・描画はまだ行わない';
const IMPLEMENTATIONS = ['evals/clip_composition/adopted_caption_judgment_inputs_v001.mts',
  'runner/src/digest-caption-input-preparation-v001.ts', 'runner/src/skills/caption-display-boundaries-v001.ts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/presentation_output_crop_application_v001.mjs',
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'] as const;
const obj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
function record(v: unknown): Obj {assert(obj(v), 'CAPTION_PREPARATION_OBJECT_INVALID'); return v;}
function records(v: unknown): Obj[] {assert(Array.isArray(v) && v.every(obj), 'CAPTION_PREPARATION_ARRAY_INVALID'); return v;}
function ids(v: unknown): number[] {assert(Array.isArray(v) && v.every(x => Number.isSafeInteger(x)), 'CAPTION_PREPARATION_IDS_INVALID'); return v;}
function text(v: unknown): string {assert(typeof v === 'string' && v.length, 'CAPTION_PREPARATION_TEXT_INVALID'); return v;}
const json = (bytes: Buffer): Obj => record(JSON.parse(bytes.toString('utf8')));
function relative(root: string, absolute: string) {
  const r = path.relative(root, path.resolve(absolute)).split(path.sep).join('/');
  assert(r && !r.startsWith('/') && !r.split('/').some(s => !s || s === '.' || s === '..'), 'CAPTION_PREPARATION_PATH_INVALID');
  return r;
}
async function modules(root: string) {
  const load = (p: string) => import(pathToFileURL(path.join(root, p)).href);
  const [formal, stable, builder, retention] = await Promise.all([
    load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'),
    load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'),
    load('evals/clip_composition/adopted_caption_judgment_inputs_v001.mts'),
    load('evals/clip_composition/candidate_internal_retention_validation_v001.mts')]);
  return {formal, stable, builder, retention};
}

/** JSON-only boundary: qualified normal owners/references, no media reader or queue effect. */
async function reconstruct(p: DigestCaptionPreparationParametersV001) {
  assert(typeof p.inputRoot === 'string' && path.isAbsolute(p.inputRoot)
    && path.resolve(p.inputRoot) === p.inputRoot, 'CAPTION_PREPARATION_INPUT_ROOT_REQUIRED');
  const root = await realpath(p.workspaceRoot), inputRoot = await realpath(p.inputRoot);
  assert.equal(inputRoot, p.inputRoot, 'CAPTION_PREPARATION_INPUT_ROOT_RELOCATED');
  assert(inputRoot.startsWith('/Volumes/') && inputRoot !== root
    && !inputRoot.startsWith(root + path.sep), 'CAPTION_PREPARATION_SSD_INPUT_ROOT_REQUIRED');
  const inputRootIdentity = await lstat(inputRoot, {bigint: true});
  assert(inputRootIdentity.isDirectory() && !inputRootIdentity.isSymbolicLink(), 'CAPTION_PREPARATION_INPUT_ROOT_INVALID');
  const inputPrefix = text(p.inputPrefix);
  assert(!inputPrefix.includes('\\') && !path.isAbsolute(inputPrefix)
    && !inputPrefix.split('/').some(s => !s || s === '.' || s === '..')
    && inputPrefix.startsWith('runtime/artifacts/') && inputPrefix.split('/').length >= 3,
    'CAPTION_PREPARATION_INPUT_PREFIX_INVALID');
  const inputPath = (name: string) => {
    assert(typeof name === 'string' && !name.includes('\\') && !path.isAbsolute(name)
      && !name.split('/').some(s => !s || s === '.' || s === '..')
      && (name === inputPrefix || name.startsWith(inputPrefix + '/')),
      'CAPTION_PREPARATION_INPUT_PREFIX_MISMATCH');
    return name;
  };
  const inputRelative = (absolute: string) => inputPath(relative(inputRoot, absolute));
  const assertInputRootCurrent = async () => {
    const now = await lstat(inputRoot, {bigint: true});
    assert(now.isDirectory() && !now.isSymbolicLink() && now.dev === inputRootIdentity.dev
      && now.ino === inputRootIdentity.ino && await realpath(inputRoot) === inputRoot,
      'CAPTION_PREPARATION_INPUT_ROOT_CHANGED');
  };
  const assertInputDirectory = async (absolute: string) => {
    inputRelative(absolute); await assertInputRootCurrent();
    const stat = await lstat(absolute, {bigint: true});
    assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === inputRootIdentity.dev
      && await realpath(absolute) === absolute, 'CAPTION_PREPARATION_INPUT_DIRECTORY_INVALID');
  };
  await assertInputDirectory(path.join(inputRoot, inputPrefix));
  assert(path.isAbsolute(p.sourceRuntimeRoot) && path.resolve(p.sourceRuntimeRoot) === p.sourceRuntimeRoot,
    'CAPTION_PREPARATION_SOURCE_RUNTIME_ROOT_INVALID');
  await assertInputDirectory(p.sourceRuntimeRoot);
  assert(path.isAbsolute(p.outputRoot) && path.resolve(p.outputRoot) === p.outputRoot,
    'CAPTION_PREPARATION_OUTPUT_ROOT_INVALID');
  inputRelative(p.outputRoot);
  const m = await modules(root);
  const requireBinding: (v: unknown) => asserts v is DigestJsonBindingV001 = m.formal.assertBinding;
  const observed = new Map<string, DigestByteBindingV001>();
  const read = async (b: DigestByteBindingV001, isJson: boolean) => {
    assert(typeof b.path === 'string' && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'CAPTION_PREPARATION_BINDING_INVALID');
    assert(!isJson || b.path.endsWith('.json'), 'CAPTION_PREPARATION_JSON_ONLY');
    if (isJson) {
      inputPath(b.path); await assertInputRootCurrent();
      assert.equal((await lstat(path.join(inputRoot, b.path), {bigint: true})).dev,
        inputRootIdentity.dev, 'CAPTION_PREPARATION_INPUT_DEVICE_CHANGED');
    }
    const bytes: Buffer = await m.stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: isJson ? inputRoot : root, relativePath: b.path});
    if (isJson) await assertInputRootCurrent();
    assert.equal(m.formal.sha(bytes), b.fileSha256, 'CAPTION_PREPARATION_SHA_MISMATCH');
    observed.set(b.path, {path: b.path, fileSha256: b.fileSha256});
    return bytes;
  };
  const state: Zev2State = JSON.parse((await read(p.stateBinding, true)).toString('utf8'));
  const {requestDraftId: draftId, planRequestId, executionRequestId} = p.expected;
  const request = (id: string, type: string) => {
    const matches = state.agentRequests.filter(r => r.id === id), r = matches[0];
    assert(matches.length === 1 && r && r.type === type && r.requestDraftId === draftId && r.input.productionType === 'digest', 'CAPTION_PREPARATION_REQUEST_MISMATCH');
    assert.equal(r.status, 'succeeded', 'CAPTION_PREPARATION_REQUEST_INCOMPLETE');
    assertApprovedAgentRequestInput(state, r);
    return r;
  };
  const planRequest = request(planRequestId, 'prepare_digest_plan'), executionRequest = request(executionRequestId, 'validate_digest_plan');
  assert.equal(executionRequest.dependsOnAgentRequestId, planRequest.id, 'CAPTION_PREPARATION_DEPENDENCY_CHANGED');
  const producers = digestProducerRequestIdsV001(state, executionRequest);
  for (const id of producers) {
    const r = state.agentRequests.find(r => r.id === id);
    assert(r && r.status === 'succeeded', 'CAPTION_PREPARATION_REQUEST_INCOMPLETE');
    assertApprovedAgentRequestInput(state, r);
    registeredDigestDependencyV001(state, r, r.type === 'prepare_video' ? 'source_video' : r.type === 'run_stt' ? 'transcript_json'
      : r.type === 'prepare_digest_plan' ? 'digest_plan_json' : 'digest_execution_input_json');
  }
  const planRef = registeredDigestDependencyV001(state, planRequest, 'digest_plan_json');
  const executionRef = registeredDigestDependencyV001(state, executionRequest, 'digest_execution_input_json');
  assert.equal(planRef.sha256, p.expected.planSha256, 'CAPTION_PREPARATION_PLAN_CHANGED');
  assert.equal(executionRef.sha256, p.expected.executionSha256, 'CAPTION_PREPARATION_EXECUTION_CHANGED');
  const artifactRoot = path.join(path.resolve(p.sourceRuntimeRoot), 'artifacts');
  const physical = (logical: string) => inputRelative(path.join(artifactRoot, draftId, digestArtifactFileNameV001(logical, draftId, producers)));
  const logicalPlan = digestArtifactPathFromUriV001(planRef.uri, draftId, planRequest.id);
  const logicalExecution = digestArtifactPathFromUriV001(executionRef.uri, draftId, executionRequest.id);
  const planBytes = await read({path: physical(logicalPlan), fileSha256: planRef.sha256}, true);
  const executionBytes = await read({path: physical(logicalExecution), fileSha256: executionRef.sha256}, true);
  assert.equal(planBytes.length, planRef.byteSize, 'CAPTION_PREPARATION_SIZE_MISMATCH');
  assert.equal(executionBytes.length, executionRef.byteSize, 'CAPTION_PREPARATION_SIZE_MISMATCH');
  const plan = JSON.parse(planBytes.toString()), execution = JSON.parse(executionBytes.toString());
  assertDigestArtifactV001(plan, 'digest_plan_json', {requestDraftId: draftId, requestId: planRequest.id});
  assertDigestArtifactV001(execution, 'digest_execution_input_json', {requestDraftId: draftId, requestId: executionRequest.id});
  assert(plan.kind === 'digest_plan_json' && execution.kind === 'digest_execution_input_json', 'CAPTION_PREPARATION_ARTIFACT_KIND_INVALID');
  assert.deepEqual(execution.planFileRefBinding, {path: logicalPlan, fileSha256: planRef.sha256, requestId: planRequest.id,
    outputId: planRequest.result?.outputId, fileRefId: planRef.id, byteSize: planRef.byteSize}, 'CAPTION_PREPARATION_PLAN_OWNER_CHANGED');
  assert(execution.sourceInspectionBinding && execution.consumptionBinding && execution.editPlanBinding
    && execution.manufacturingInputBinding && execution.clockResolutionBinding, 'CAPTION_PREPARATION_INSPECTION_REQUIRED');
  const registry = new Map(execution.dataBindings.map(b => [b.path, b.fileSha256]));
  for (const b of plan.dataBindings) assert.equal(registry.get(b.path), b.fileSha256, 'CAPTION_PREPARATION_REGISTRY_CHANGED');
  const documents = new Map<string, Obj>(), bytesByLogical = new Map<string, Buffer>();
  for (const b of execution.dataBindings) {
    // The one declared media input is retained as metadata, never opened or hashed.
    if (b.path === plan.sourceVideoBinding.path) {assert.deepEqual(b, plan.sourceVideoBinding); continue;}
    const bytes = await read({path: physical(b.path), fileSha256: b.fileSha256}, true);
    documents.set(b.path, json(bytes)); bytesByLogical.set(b.path, bytes);
  }
  const get = (b: DigestByteBindingV001): Obj => {
    assert.equal(registry.get(b.path), b.fileSha256, 'CAPTION_PREPARATION_REFERENCE_UNRESOLVED');
    const value = documents.get(b.path); assert(value, 'CAPTION_PREPARATION_JSON_MISSING');
    if ('schemaVersion' in b) {
      requireBinding(b);
      assert.equal(value.schemaVersion, b.schemaVersion, 'CAPTION_PREPARATION_VERSION_INVALID');
      assert.equal(m.formal.canonicalSha(value), record(b).canonicalSha256, 'CAPTION_PREPARATION_CANONICAL_SHA_MISMATCH');
    }
    return value;
  };
  const preparation = get(plan.preparationBinding);
  assertDigestPlanReferenceClosureV001(plan, preparation, documents, producers);
  const artifacts = record(preparation.artifacts);
  const stage = (name: string): Obj => {const b = artifacts[name]; requireBinding(b); return get(b);};
  const identity = record(preparation.identity), draft = state.requestDrafts.find(d => d.id === draftId);
  assert(draft, 'CAPTION_PREPARATION_DRAFT_MISSING');
  const approved = record(identity.approvedDraft);
  assert.deepEqual(approved, {id: draft.id, productionType: draft.productionType, purpose: draft.purpose, source: draft.source,
    settings: draft.settings, policy: draft.policy, steps: draft.steps, createdAt: draft.createdAt, approvedAt: draft.updatedAt}, 'CAPTION_PREPARATION_APPROVAL_CHANGED');
  assert.equal(m.formal.canonicalSha(approved), identity.approvedDraftSha256, 'CAPTION_PREPARATION_APPROVAL_CHANGED');
  assert.deepEqual(identity.command, {id: planRequest.id, requestDraftId: planRequest.requestDraftId, type: planRequest.type,
    target: planRequest.target, input: planRequest.input, constraints: planRequest.constraints, policy: planRequest.policy,
    dependsOnAgentRequestId: planRequest.dependsOnAgentRequestId, createdAt: planRequest.createdAt}, 'CAPTION_PREPARATION_COMMAND_CHANGED');
  assert.equal(m.formal.canonicalSha(identity.command), identity.commandSha256, 'CAPTION_PREPARATION_COMMAND_CHANGED');
  const intent = get(plan.approvedRequestBinding);
  assert.deepEqual(record(intent.identity).approvedDraft, approved, 'CAPTION_PREPARATION_APPROVAL_CHANGED');
  assert.equal(stage('production-intent.json').productionIntent, draft.purpose, 'CAPTION_PREPARATION_PURPOSE_CHANGED');
  for (const name of ['candidate-request.json', 'selection-request.json'])
    assert.equal(record(stage(name).input).productionRequest, draft.purpose, 'CAPTION_PREPARATION_PURPOSE_CHANGED');
  assert.equal(record(stage('retention-request.json').input).taskDescription, draft.purpose, 'CAPTION_PREPARATION_PURPOSE_CHANGED');
  const transcriptBytes = bytesByLogical.get(plan.transcriptBinding.path); assert(transcriptBytes);
  const transcript: TranscriptArtifact = JSON.parse(transcriptBytes.toString());
  assert.equal(transcript.sourceUri, draft.source.uri, 'CAPTION_PREPARATION_TRANSCRIPT_SOURCE_CHANGED');
  const utterances = get(plan.utteranceBinding);
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(utterances,
    {sourceTranscriptPath: plan.transcriptBinding.path, sourceTranscriptBytes: transcriptBytes});
  assertDistantConnectionCommonUtteranceArtifactV001(utterances);
  const byId = new Map(transcript.segments.map(s => [s.id, s]));
  const byUtterance = new Map(utterances.utterances.map(u => [u.utteranceId, u]));
  const selection = stage('selection-adoption.json'), retentionRequest = stage('retention-request.json');
  const parents = records(selection.adoptedCandidates);
  // Reconstruct the already-approved retention input using its common utterance membership.
  const expectedInput: InternalRetentionInputV001 = {schemaVersion: 'candidate-internal-retention-input-v001', taskDescription: draft.purpose,
    candidates: parents.map(parent => {
    assert(Array.isArray(parent.includedUtteranceIds) && parent.includedUtteranceIds.every(x => typeof x === 'string'), 'CAPTION_PREPARATION_UTTERANCE_IDS_INVALID');
    return {candidateId: text(parent.candidateId), title: text(parent.title), highlightReason: text(record(parent.judgment).reason),
      utterances: parent.includedUtteranceIds.map(id => {
        const u = byUtterance.get(id); assert(u, 'CAPTION_PREPARATION_UTTERANCE_MISSING');
        return {utteranceId: id, atoms: u.sourceSegmentIds.map(sourceSegmentId => {
          const a = byId.get(sourceSegmentId); assert(a, 'CAPTION_PREPARATION_SOURCE_MISSING'); return {sourceSegmentId, text: a.text};
        })};
      })};
  })};
  const token = m.retention.validateInternalRetentionProvenanceV001(retentionRequest, stage('retention-response.json'), stage('retention-result.json'), expectedInput);
  const resolved = record(m.retention.resolveInternalRetentionV001(token, parents, [{transcriptBinding: plan.transcriptBinding,
    units: transcript.segments.filter(a => a.endMs > a.startMs).map(a => ({unitId: `source-fragment-${a.id}`, startMs: a.startMs, endMs: a.endMs,
      startBoundary: {after: a.id}, endBoundary: {before: a.id}, startTimeRole: 'gpu-aligned-source-fragment', timeOrigin: 'saved-source-transcript'}))}]));
  assert.equal(resolved.status, 'resolved', 'CAPTION_PREPARATION_RETENTION_UNRESOLVED');
  const retention = stage('retention-validation.json');
  assert.deepEqual(retention, {schemaVersion: 'new-material-retention-validation-v001', ...resolved,
    requestBinding: artifacts['retention-request.json'], transcriptBinding: plan.transcriptBinding}, 'CAPTION_PREPARATION_RETENTION_CHANGED');
  const consumption = get(execution.consumptionBinding);
  assert.equal(consumption.status, 'complete', 'CAPTION_PREPARATION_CONSUMPTION_INCOMPLETE');
  assert.deepEqual(consumption.approvedCommand, {input: executionRequest.input, target: executionRequest.target,
    constraints: executionRequest.constraints, policy: executionRequest.policy, dependsOnAgentRequestId: executionRequest.dependsOnAgentRequestId}, 'CAPTION_PREPARATION_COMMAND_CHANGED');
  assert.deepEqual(consumption.planFileRefBinding, execution.planFileRefBinding, 'CAPTION_PREPARATION_PLAN_OWNER_CHANGED');
  assert.deepEqual(consumption.preparationBinding, {path: plan.preparationBinding.path, fileSha256: plan.preparationBinding.fileSha256}, 'CAPTION_PREPARATION_REFERENCE_CHANGED');
  assert.deepEqual(identity.sourceVideo, plan.sourceVideoBinding, 'CAPTION_PREPARATION_SOURCE_CHANGED');
  assert.deepEqual(identity.transcript, plan.transcriptBinding, 'CAPTION_PREPARATION_TRANSCRIPT_REFERENCE_CHANGED');
  const dependencyReferences = record(identity.dependencyReferences);
  const sttRequest = state.agentRequests.find(r => r.id === planRequest.dependsOnAgentRequestId);
  assert(sttRequest && sttRequest.type === 'run_stt', 'CAPTION_PREPARATION_DEPENDENCY_CHANGED');
  const sourceRequest = state.agentRequests.find(r => r.id === sttRequest.dependsOnAgentRequestId);
  assert(sourceRequest && sourceRequest.type === 'prepare_video', 'CAPTION_PREPARATION_DEPENDENCY_CHANGED');
  const transcriptRef = registeredDigestDependencyV001(state, sttRequest, 'transcript_json'), sourceRef = registeredDigestDependencyV001(state, sourceRequest, 'source_video');
  assert.deepEqual(dependencyReferences, {video: sourceRef, transcript: transcriptRef}, 'CAPTION_PREPARATION_DEPENDENCY_REFERENCE_CHANGED');
  assert.equal(digestArtifactPathFromUriV001(transcriptRef.uri, draftId, sttRequest.id), plan.transcriptBinding.path, 'CAPTION_PREPARATION_TRANSCRIPT_REFERENCE_CHANGED');
  assert.equal(transcriptRef.sha256, plan.transcriptBinding.fileSha256, 'CAPTION_PREPARATION_TRANSCRIPT_REFERENCE_CHANGED');
  const sourceOrigin = record(identity.sourceOrigin);
  const guestSource = sourceOrigin.placement === NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001;
  let guestPhysicalPath: string | undefined;
  if(guestSource) {
    assert.equal(sourceOrigin.mode,'json-reference','CAPTION_PREPARATION_GUEST_ORIGIN_INVALID');
    assert.equal(sourceOrigin.declaredSourceUri,draft.source.uri,'CAPTION_PREPARATION_GUEST_SOURCE_CHANGED');
    for(const id of producers) assert.equal(state.agentRequests.find(r => r.id === id)?.target.sourceUri,draft.source.uri,'CAPTION_PREPARATION_GUEST_SOURCE_CHANGED');
    const expectedSource = `artifacts/${draftId}/${sourceRequest.id}/source-video.mp4`;
    assert.equal(plan.sourceVideoBinding.path,expectedSource,'CAPTION_PREPARATION_GUEST_PRODUCER_CHANGED');
    assert.equal(sourceOrigin.fileSha256,plan.sourceVideoBinding.fileSha256,'CAPTION_PREPARATION_GUEST_SOURCE_CHANGED');
    assert(Number.isSafeInteger(sourceOrigin.byteSize) && Number(sourceOrigin.byteSize) > 0,'CAPTION_PREPARATION_GUEST_SIZE_INVALID');
    const logicalRegistration = digestArtifactPathFromUriV001(sourceRef.uri,draftId,sourceRequest.id);
    assert.deepEqual(identity.sourceRegistration,{path:logicalRegistration,fileSha256:sourceRef.sha256},'CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    assert.deepEqual(sourceOrigin.registration,identity.sourceRegistration,'CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    const registration = get({path:logicalRegistration,fileSha256:sourceRef.sha256});
    assert.equal(registration.kind,'source_video','CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    assert.equal(registration.sourceUri,draft.source.uri,'CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    assert.equal(registration.purpose,draft.purpose,'CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    assert.deepEqual(registration.sourceInspectionBinding,identity.sourceInspection,'CAPTION_PREPARATION_GUEST_INSPECTION_CHANGED');
    assert.deepEqual(identity.sourceInspection,execution.sourceInspectionBinding,'CAPTION_PREPARATION_GUEST_INSPECTION_CHANGED');
    const provenanceBinding=record(sourceOrigin.provenanceBinding);
    assert.deepEqual(registration.normalSourceProvenanceBinding,provenanceBinding,'CAPTION_PREPARATION_GUEST_PROVENANCE_CHANGED');
    const provenancePath=text(provenanceBinding.path),provenanceSha=text(provenanceBinding.fileSha256);
    digestArtifactFileNameV001(provenancePath,draftId,[sttRequest.id]);
    assert(provenancePath.endsWith('.json'),'CAPTION_PREPARATION_GUEST_PROVENANCE_CHANGED');
    const provenance=get({path:provenancePath,fileSha256:provenanceSha});
    const provenanceJson=(v:unknown) => {const b=record(v);return get({path:text(b.path),fileSha256:text(b.fileSha256)});};
    assertNormalDigestSourceProvenanceV001(provenance,{draftId,sourceRequestId:sourceRequest.id,sttRequestId:sttRequest.id,
      sourceOrigin,transcriptBinding:plan.transcriptBinding,transcript,
      originalTranscript:provenanceJson(provenance.originalTranscriptBinding),rawGpu:provenanceJson(provenance.rawGpuBinding)});
    guestPhysicalPath = resolveNormalDigestDeclaredGuestSourcePathV001(text(sourceOrigin.declaredSourceUri));
    if(registration.localPath !== undefined) assert.equal(registration.localPath,guestPhysicalPath,'CAPTION_PREPARATION_GUEST_REGISTRATION_CHANGED');
    assert.equal(path.basename(guestPhysicalPath),digestArtifactFileNameV001(expectedSource,draftId,[sourceRequest.id]),'CAPTION_PREPARATION_GUEST_PRODUCER_CHANGED');
    assert.equal(path.basename(path.dirname(guestPhysicalPath)),draftId,'CAPTION_PREPARATION_GUEST_PRODUCER_CHANGED');
    assert.equal(path.basename(path.dirname(path.dirname(guestPhysicalPath))),'artifacts','CAPTION_PREPARATION_GUEST_PRODUCER_CHANGED');
    assert.equal(execution.dataBindings.filter(b => b.path === expectedSource).length,1,'CAPTION_PREPARATION_GUEST_SOURCE_COUNT_INVALID');
  } else assert(sourceOrigin.placement === undefined,'CAPTION_PREPARATION_GUEST_PLACEMENT_INVALID');
  for (const b of [...records(identity.implementations), ...records(consumption.implementations)])
    await read({path: text(b.path), fileSha256: text(b.fileSha256)}, false);
  const outputBindings = record(consumption.outputs), adoptionBinding = outputBindings['machine-adoption.json'];
  requireBinding(adoptionBinding);
  const adoption = get(adoptionBinding), edit = get(execution.editPlanBinding), manufacturing = get(execution.manufacturingInputBinding);
  const segments: Segment[] = records(resolved.segments).map(s => {
    assert(typeof s.sourceStartMs === 'number' && typeof s.sourceEndMs === 'number', 'CAPTION_PREPARATION_SOURCE_MS_INVALID');
    return {candidateId: text(s.candidateId), segmentId: text(s.segmentId), sourceSegmentIds: ids(s.sourceSegmentIds), sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs};
  });
  assert.deepEqual(adoption.selectedCandidates, records(resolved.segments).map((s, i) => ({...s, outputOrdinal: i + 1})), 'CAPTION_PREPARATION_ADOPTION_CHANGED');
  assert.deepEqual(edit.segments, segments, 'CAPTION_PREPARATION_EDIT_CHANGED');
  assert.deepEqual(edit.unresolvedEdits, [], 'CAPTION_PREPARATION_EDIT_UNRESOLVED');
  assert.deepEqual(edit.machineAdoptionBinding, adoptionBinding, 'CAPTION_PREPARATION_ADOPTION_REFERENCE_CHANGED');
  assert.deepEqual(record(manufacturing.assemblyDecision), {path: adoptionBinding.path, fileSha256: adoptionBinding.fileSha256}, 'CAPTION_PREPARATION_ADOPTION_REFERENCE_CHANGED');
  const clock = get(execution.clockResolutionBinding), inspection = get(execution.sourceInspectionBinding);
  assert.equal(inspection.schemaVersion, 'new-material-source-inspection-v001', 'CAPTION_PREPARATION_INSPECTION_VERSION_INVALID');
  assert.equal(record(inspection.sourceVideoBinding).fileSha256, plan.sourceVideoBinding.fileSha256, 'CAPTION_PREPARATION_INSPECTION_SOURCE_CHANGED');
  assert.equal(clock.status, 'passed', 'CAPTION_PREPARATION_CLOCK_INCOMPLETE');
  const mappings = records(clock.mappings);
  assert.equal(mappings.length, segments.length, 'CAPTION_PREPARATION_CLOCK_MEMBERSHIP_CHANGED');
  mappings.forEach((v, i) => {const s = segments[i]!;
    assert.equal(v.segmentId, s.segmentId, 'CAPTION_PREPARATION_CLOCK_MEMBERSHIP_CHANGED');
    assert.equal(v.sourceStartMs, s.sourceStartMs, 'CAPTION_PREPARATION_CLOCK_SOURCE_CHANGED');
    assert.equal(v.sourceEndMs, s.sourceEndMs, 'CAPTION_PREPARATION_CLOCK_SOURCE_CHANGED');});
  await read(p.scopeBinding, false);
  const style = json(await read(p.styleTemplateBinding, true)), prompt = record(style.promptInput);
  assertCaptionDisplayInputV001(prompt);
  const droppedIds = records(resolved.candidates).flatMap(c => records(c.blocks).filter(b => b.action === 'drop').flatMap(b => ids(b.sourceSegmentIds)));
  const meaningPath = `${inputRelative(p.outputRoot)}/meaning-input.json`;
  const built = m.builder.buildAdoptedCaptionJudgmentInputsV001({preparationId: p.preparationId, meaningPath,
    planBinding: {path: logicalPlan, fileSha256: planRef.sha256}, machineAdoptionBinding: adoptionBinding,
    transcriptBinding: plan.transcriptBinding, utteranceBinding: plan.utteranceBinding, sourceVideoBinding: plan.sourceVideoBinding,
    parts: segments.map(s => ({candidateId: s.candidateId, timelineSegmentId: s.segmentId, sourceSegmentIds: s.sourceSegmentIds,
      sourceInterval: {sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs}})),
    retainedSourceSegmentIds: segments.flatMap(s => s.sourceSegmentIds), droppedSourceSegmentIds: droppedIds,
    transcript, utterances, taskDescription: prompt.taskDescription, styleLimits: prompt.styleLimits});
  const meaning = record(built.meaning), requests = records(built.requests);
  requests.forEach(r => assertCaptionDisplayInputV001(r.input));
  const outputs = [{name: 'meaning-input.json', value: meaning}, ...requests.map((r, i) => ({name: `display-request-${String(i + 1).padStart(4, '0')}.json`, value: r}))];
  const implementations = [];
  for (const name of IMPLEMENTATIONS) {
    const bytes: Buffer = await m.stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: root, relativePath: name});
    implementations.push({path: name, fileSha256: m.formal.sha(bytes)});
  }
  const manifest = {schemaVersion: SCHEMA, inputRoot, inputPrefix, preparationId: p.preparationId, status: 'prepared', preparationPurpose: PURPOSE,
    scopeBinding: p.scopeBinding, originalPurpose: draft.purpose, originalPurposeBinding: plan.approvedRequestBinding,
    stateBinding: p.stateBinding, expected: p.expected, styleTemplateBinding: p.styleTemplateBinding,
    implementations, inputReferences: Array.from(observed.values()),
    logicalToPhysical: execution.dataBindings.map(b => guestSource && b.path === plan.sourceVideoBinding.path
      ? {...b,physicalPath:guestPhysicalPath!,bytesVerified:false,placement:NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001,sizeBytes:sourceOrigin.byteSize}
      : {...b,physicalPath:physical(b.path),bytesVerified:b.path !== plan.sourceVideoBinding.path}),
    admission: {...execution.admission, outlineChoice: null}, originalClockBinding: execution.clockResolutionBinding,
    outputs: outputs.map(o => ({fileName: o.name, ...m.formal.bind(`${inputRelative(p.outputRoot)}/${o.name}`, o.value)}))};
  return {m, root, inputRoot, inputRelative, assertInputRootCurrent, assertInputDirectory, manifest, outputs, meaning, requests, segments, droppedIds};
}

/** Saves a new preparation bundle only after qualification; never modifies old request/state. */
export async function prepareDigestCaptionJudgmentInputsV001(p: DigestCaptionPreparationParametersV001) {
  const r = await reconstruct(p), out = path.resolve(p.outputRoot), parent = path.dirname(out);
  r.inputRelative(out);
  await r.assertInputDirectory(parent);
  await mkdir(out); // no overwrite, no recursive new hierarchy
  await r.assertInputDirectory(out);
  for (const o of r.outputs) await writeFile(path.join(out, o.name), r.m.formal.formal(o.value), {flag: 'wx'});
  const manifestPath = `${r.inputRelative(out)}/manifest.json`, bytes: Buffer = r.m.formal.formal(r.manifest);
  await writeFile(path.join(out, 'manifest.json'), bytes, {flag: 'wx'});
  await r.assertInputDirectory(out);
  return {manifest: r.manifest, manifestBinding: {path: manifestPath, fileSha256: r.m.formal.sha(bytes)},
    meaning: r.meaning, requests: r.requests, segments: r.segments, droppedSourceSegmentIds: r.droppedIds};
}

/** Reconstructs from the original JSON references, then compares every persisted byte. No effects. */
export async function readPreparedDigestCaptionJudgmentInputsV001(p: DigestCaptionPreparationParametersV001, manifestBinding: DigestByteBindingV001) {
  const r = await reconstruct(p);
  assert.equal(manifestBinding.path, `${r.inputRelative(p.outputRoot)}/manifest.json`, 'CAPTION_PREPARATION_MANIFEST_REFERENCE_CHANGED');
  await r.assertInputDirectory(p.outputRoot);
  const read = async (name: string) => {
    await r.assertInputRootCurrent();
    const relativePath = `${r.inputRelative(p.outputRoot)}/${name}`;
    assert.equal((await lstat(path.join(r.inputRoot, relativePath), {bigint: true})).dev,
      (await lstat(r.inputRoot, {bigint: true})).dev, 'CAPTION_PREPARATION_INPUT_DEVICE_CHANGED');
    const bytes = await r.m.stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: r.inputRoot, relativePath});
    await r.assertInputRootCurrent(); return bytes;
  };
  const manifestBytes: Buffer = await read('manifest.json');
  assert.equal(r.m.formal.sha(manifestBytes), manifestBinding.fileSha256, 'CAPTION_PREPARATION_SAVED_SHA_MISMATCH');
  assert.equal(json(manifestBytes).schemaVersion, SCHEMA, 'CAPTION_PREPARATION_SAVED_VERSION_INVALID');
  assert.deepEqual(manifestBytes, r.m.formal.formal(r.manifest), 'CAPTION_PREPARATION_RECONSTRUCTION_CHANGED');
  for (const o of r.outputs) assert.deepEqual(await read(o.name), r.m.formal.formal(o.value), 'CAPTION_PREPARATION_SAVED_OUTPUT_CHANGED');
  return {manifest: r.manifest, meaning: r.meaning, requests: r.requests, segments: r.segments};
}

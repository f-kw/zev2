import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readPreparedDigestPlanV001, registeredDigestDependencyV001, digestDataPathV001, type DigestPlanPreparationDependenciesV001} from './digest-plan-preparation-v001.js';
import {assertApprovedAgentRequestInput, assertDigestArtifactV001, findById, type AgentRequest, type Zev2State, type DigestExecutionInputArtifactV001} from '@zev2/shared';
import type {TranscriptArtifact} from './workflow-artifacts.js';

type Json = Record<string, any>;
type ByteBinding = {path: string; fileSha256: string};
type Input = {request: AgentRequest; state: Zev2State};
export type DigestPlanConsumptionDependenciesV001 = {
  preparation: Omit<DigestPlanPreparationDependenciesV001, 'judge'>;
};
const SCHEMA = 'normal-request-digest-consumption-binding-v002';
const IMPLEMENTATIONS = [
  'runner/src/digest-plan-consumption-v001.ts',
  'evals/clip_composition/presentation_base_media_build_v003.mjs',
  'evals/clip_composition/presentation_base_media_timeline_v004.mjs',
  'evals/clip_composition/presentation_caption_contract_v002.mjs',
  'evals/clip_composition/presentation_caption_contract_v003.mjs',
];
const NAMES = ['machine-adoption.json', 'edit-plan.json', 'manufacturing-values.json', 'clock-resolution.json'];
const relative = (root: string, absolute: string) => {
  const name = path.relative(root, absolute).split(path.sep).join('/');
  assert(name && !path.isAbsolute(name) && !name.split('/').some(s => !s || s === '..' || s === '.'), 'DIGEST_CONSUMPTION_PATH_INVALID');
  return name;
};
async function safeFile(root: string, name: string) {
  assert(typeof name === 'string' && !path.isAbsolute(name) && !name.includes('\\')
    && !name.split('/').some(s => !s || s === '..' || s === '.'), 'DIGEST_CONSUMPTION_REFERENCE_INVALID');
  const absolute = path.resolve(root, name);
  relative(root, absolute);
  const info = await lstat(absolute);
  assert(info.isFile() && !info.isSymbolicLink() && await realpath(absolute) === absolute, 'DIGEST_CONSUMPTION_REFERENCE_INVALID');
  return absolute;
}

/** 保存を伴う消費も通常の実claim資格を要する。動画・通常完了登録は作用させない。 */
export async function consumePreparedDigestPlanV001(deps: DigestPlanConsumptionDependenciesV001, input: Input) {
  return consume(deps, input, true);
}

/** 新processでも旧readerと既存製造consumerから再構築する。provider／保存／state変更はない。 */
export async function readConsumedDigestPlanV001(deps: DigestPlanConsumptionDependenciesV001, input: Input) {
  return consume(deps, input, false);
}

async function consume(deps: DigestPlanConsumptionDependenciesV001, input: Input, write: boolean) {
  deps = structuredClone(deps);
  input = structuredClone(input);
  const {request:r,state} = input;
  assertApprovedAgentRequestInput(state,r);
  assert(r.type === 'validate_digest_plan' && r.input.productionType === 'digest','DIGEST_CONSUMPTION_REQUEST_INVALID');
  assert(state.agentRequests.filter(x=>x.id===r.id).length === 1
    && JSON.stringify(findById(state.agentRequests,r.id)) === JSON.stringify(r),'DIGEST_CONSUMPTION_STATE_MISMATCH');
  if(write) assert(r.status === 'running' && r.claimOwnerId?.trim() && r.claimedAt && r.claimUpdatedAt && !r.claimExpiredAt
    && (!r.claimExpiresAt || Date.parse(r.claimExpiresAt)>Date.now()),'DIGEST_CONSUMPTION_NOT_CLAIMED');
  const planRequest=findById(state.agentRequests,r.dependsOnAgentRequestId);
  assert(planRequest?.type === 'prepare_digest_plan','DIGEST_CONSUMPTION_PLAN_DEPENDENCY_INVALID');
  const planRef=registeredDigestDependencyV001(state,planRequest,'digest_plan_json');
  const artifactRoot=await realpath(deps.preparation.artifactRoot);
  const dataPath=(name:string)=>digestDataPathV001(artifactRoot,r.requestDraftId,name);
  const planPath=`artifacts/${planRef.uri.slice('/api/artifacts/'.length)}`;
  const stt=findById(state.agentRequests,planRequest.dependsOnAgentRequestId);
  assert(stt?.type === 'run_stt','DIGEST_CONSUMPTION_STT_DEPENDENCY_INVALID');
  const transcriptRef=registeredDigestDependencyV001(state,stt,'transcript_json');
  const transcriptPath=`artifacts/${transcriptRef.uri.slice('/api/artifacts/'.length)}`;
  const transcript=JSON.parse(await readFile(dataPath(transcriptPath),'utf8')) as TranscriptArtifact;
  const prepared=await readPreparedDigestPlanV001(deps.preparation,{request:planRequest,state,transcript,transcriptUri:transcriptRef.uri});
  const root = await realpath(deps.preparation.workspaceRoot);
  const load = (name: string) => import(pathToFileURL(path.resolve(root, 'evals/clip_composition', name)).href);
  const base = await load('run_candidate_discovery_digest_skill_e2e_v001.mts');
  const consumer = await load('presentation_base_media_build_v003.mjs');
  const {formal, sha, bind, same, fileSha} = base;
  const verifyBytes = async (b: ByteBinding) => {
    assert(b && Object.keys(b).length === 2 && typeof b.path === 'string'
      && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'DIGEST_CONSUMPTION_BYTE_BINDING_INVALID');
    const absolute = await safeFile(artifactRoot,relative(artifactRoot,dataPath(b.path)));
    assert.equal(await fileSha(absolute), b.fileSha256, 'DIGEST_CONSUMPTION_SHA_MISMATCH');
    return absolute;
  };
  const readBytes = async (b: ByteBinding) => readFile(await verifyBytes(b));
  const preparationBytes = await readFile(await safeFile(artifactRoot,relative(artifactRoot,dataPath(prepared.bindingPath))));
  const preparation = JSON.parse(preparationBytes.toString());
  const fromPreparation = async (name: string) => JSON.parse((await readBytes({
    path: preparation.artifacts[name].path, fileSha256: preparation.artifacts[name].fileSha256,
  })).toString());
  const selection = await fromPreparation('selection-adoption.json');
  const retention = await fromPreparation('retention-validation.json');
  assert(retention.status === 'resolved' && retention.segments.length > 0, 'DIGEST_CONSUMPTION_RETENTION_UNRESOLVED');
  const planBytes=await readBytes({path:planPath,fileSha256:planRef.sha256});
  assert.equal(planBytes.length,planRef.byteSize,'DIGEST_CONSUMPTION_PLAN_SIZE_MISMATCH');
  const registeredPlan=JSON.parse(planBytes.toString());
  assertDigestArtifactV001(registeredPlan,'digest_plan_json',{requestDraftId:planRequest.requestDraftId,requestId:planRequest.id});
  assert(same(registeredPlan,prepared.artifact),'DIGEST_CONSUMPTION_REGISTERED_PLAN_CHANGED');
  for(const b of registeredPlan.dataBindings) await verifyBytes(b);
  const planFileRefBinding={path:planPath,fileSha256:planRef.sha256,requestId:planRequest.id,
    outputId:planRequest.result!.outputId!,fileRefId:planRef.id,byteSize:planRef.byteSize};
  const common={schemaVersion:'digest-execution-input-artifact-v001' as const,kind:'digest_execution_input_json' as const,
    requestDraftId:r.requestDraftId,requestId:r.id,planFileRefBinding,
    admission:{planIntegrity:'passed' as const,presentation:'not-connected' as const,executionPermission:'not-approved' as const,humanQuality:'pending' as const}};
  const dataBindings=[...registeredPlan.dataBindings,{path:planPath,fileSha256:planRef.sha256}];
  if(preparation.identity.sourceInspection === null) {
    const artifact: DigestExecutionInputArtifactV001={...common,sourceInspectionBinding:null,
      sourceInspectionMissingReason:'保存source inspectionは提供されていません。時計消費は未実施です。',
      consumptionBinding:null,editPlanBinding:null,manufacturingInputBinding:null,clockResolutionBinding:null,dataBindings};
    assertDigestArtifactV001(artifact,'digest_execution_input_json',{requestDraftId:r.requestDraftId,requestId:r.id});
    return {status:'inspection-missing' as const,artifact};
  }
  const sourceInspection=preparation.identity.sourceInspection;
  const inspectionBytes=await readBytes(sourceInspection),inspection=JSON.parse(inspectionBytes.toString());
  assert(inspection.schemaVersion === 'new-material-source-inspection-v001','DIGEST_CONSUMPTION_INSPECTION_VERSION_INVALID');
  assert.equal(inspection.sourceVideoBinding?.fileSha256,preparation.identity.sourceVideo.fileSha256,'DIGEST_CONSUMPTION_INSPECTION_SOURCE_MISMATCH');
  const inspectionBinding={path:sourceInspection.path,fileSha256:sha(inspectionBytes)};
  const preparationBinding={path:prepared.bindingPath,fileSha256:sha(preparationBytes)};
  const directory=path.join(artifactRoot,r.requestDraftId);
  assert.equal(await realpath(directory),directory,'DIGEST_CONSUMPTION_OUTPUT_INVALID');
  const outputRoot=`artifacts/${r.requestDraftId}`;
  const file=(name:string)=>`${outputRoot}/${r.id}--${name}`;
  const parts = retention.segments.map((part: Json, i: number) => ({...part, outputOrdinal: i + 1}));
  const adoption = {...selection, schemaVersion: 'new-material-digest-execution-adoption-v001',
    selectionAdoptionBinding: preparation.artifacts['selection-adoption.json'],
    retentionResultBinding: preparation.artifacts['retention-result.json'], selectedCandidates: parts};
  const adoptionBinding = bind(file('machine-adoption.json'), adoption);
  const edit = {schemaVersion: 'new-material-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${input.request.id}-edit-plan`, machineAdoptionBinding: adoptionBinding,
    sourceVideoBinding: preparation.identity.sourceVideo,
    segments: parts.map((p: Json) => ({candidateId: p.candidateId, segmentId: p.segmentId,
      sourceStartMs: p.sourceStartMs, sourceEndMs: p.sourceEndMs, sourceSegmentIds: p.sourceSegmentIds})),
    unresolvedEdits: [], quality: 'human-review-pending'};
  // 全候補の外端へ戻さず、受理済みkeep一件を製造区間一件として既存consumerへ渡す。
  assert.equal(new Set(edit.segments.map((p: Json) => p.segmentId)).size, edit.segments.length,
    'DIGEST_CONSUMPTION_SEGMENT_DUPLICATE');
  const media = inspection.media;
  const clock = consumer.validatePresentationBaseMediaSegmentPlanV002(
    edit.segments.map(({sourceStartMs, sourceEndMs}: Json) => ({sourceStartMs, sourceEndMs})),
    {fps: media.fps, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
      presentationOffsetMs: media.videoClock.presentationOffsetMs}, media.audioClock);
  assert.equal(clock.status, 'passed', 'DIGEST_CONSUMPTION_CLOCK_REJECTED');
  assert.equal(clock.mappings.length, parts.length, 'DIGEST_CONSUMPTION_SEGMENT_GAP');
  clock.mappings.forEach((mapping: Json, i: number) => {
    assert.equal(mapping.segmentId, parts[i].segmentId, 'DIGEST_CONSUMPTION_SEGMENT_ID_CHANGED');
    assert.equal(mapping.sourceStartMs, parts[i].sourceStartMs);
    assert.equal(mapping.sourceEndMs, parts[i].sourceEndMs);
  });
  const manufacturing = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${input.request.id}-manufacturing-values`,
    assemblyDecision: {path: adoptionBinding.path, fileSha256: adoptionBinding.fileSha256},
    sourceArtifact: {sourceProvenance: 'existing-repository-media', sourceRef: preparation.identity.sourceId,
      sourceUri: preparation.identity.sourceUri, ...preparation.identity.sourceVideo},
    outputDirectory: file('base-media')};
  const admittedJob = consumer.validatePresentationBaseMediaBuildJobV001(manufacturing);
  assert.equal(admittedJob.status, 'passed', 'DIGEST_CONSUMPTION_MANUFACTURING_INPUT_REJECTED');
  const outputs: Record<string, Json> = {'machine-adoption.json': adoption, 'edit-plan.json': edit,
    'manufacturing-values.json': manufacturing, 'clock-resolution.json': clock};
  const implementations = [];
  for (const name of IMPLEMENTATIONS) implementations.push({path: name, fileSha256: await fileSha(await safeFile(root, name))});
  const expected = {schemaVersion: SCHEMA, status: 'complete',
    requestId:r.id,approvedCommand:{input:r.input,target:r.target,constraints:r.constraints,policy:r.policy,dependsOnAgentRequestId:r.dependsOnAgentRequestId},
    planFileRefBinding, preparationBinding, sourceInspectionBinding: inspectionBinding,
    sourceByteEquivalence: {prepared: preparation.identity.sourceVideo, inspected: inspection.sourceVideoBinding},
    implementations, outputs: Object.fromEntries(NAMES.map(name => [name, bind(file(name),outputs[name])])),
    consumers: {manufacturingJob: {function: 'validatePresentationBaseMediaBuildJobV001', status: admittedJob.status},
      intervalClock: {function: 'validatePresentationBaseMediaSegmentPlanV002', status: clock.status}},
    humanQuality: 'pending', renderExecuted: false, backendCompletionRegistered: false};
  const recordPath = dataPath(file('consumption-binding.json'));
  let existing: Json | undefined;
  try {existing = JSON.parse(await readFile(await safeFile(artifactRoot,relative(artifactRoot,recordPath)), 'utf8'));}
  catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;}
  if (existing) {
    assert(same(existing, expected), 'DIGEST_CONSUMPTION_SAVED_BINDING_CHANGED');
    for (const name of NAMES) {
      const bytes = await readBytes({path:existing.outputs[name].path,fileSha256:existing.outputs[name].fileSha256});
      assert(same(JSON.parse(bytes.toString()), outputs[name]), 'DIGEST_CONSUMPTION_RECONSTRUCTION_CHANGED');
    }
  } else {
    assert(write, 'DIGEST_CONSUMPTION_SAVED_BINDING_MISSING');
    for (const name of NAMES) {
      const bytes = formal(outputs[name]);
      try {assert.deepEqual(await readFile(await safeFile(artifactRoot,relative(artifactRoot,dataPath(file(name))))), Buffer.from(bytes), 'DIGEST_CONSUMPTION_ORPHAN_CHANGED');}
      catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; await writeFile(dataPath(file(name)), bytes, {flag: 'wx'});}
    }
    await writeFile(recordPath, formal(expected), {flag: 'wx'});
  }
  assert.deepEqual(await readFile(await safeFile(artifactRoot,relative(artifactRoot,dataPath(preparationBinding.path)))), preparationBytes,
    'DIGEST_CONSUMPTION_PREPARATION_CHANGED_DURING_READ');
  const consumptionBinding=bind(file('consumption-binding.json'),expected);
  const artifact: DigestExecutionInputArtifactV001={...common,sourceInspectionBinding:inspectionBinding,sourceInspectionMissingReason:null,
    consumptionBinding,editPlanBinding:expected.outputs['edit-plan.json'],manufacturingInputBinding:expected.outputs['manufacturing-values.json'],
    clockResolutionBinding:expected.outputs['clock-resolution.json'],dataBindings:[...dataBindings,
      ...[consumptionBinding,...Object.values(expected.outputs) as ByteBinding[]].map(b=>({path:b.path,fileSha256:b.fileSha256}))]};
  assertDigestArtifactV001(artifact,'digest_execution_input_json',{requestDraftId:r.requestDraftId,requestId:r.id});
  return {status:'consumed' as const,bindingPath:consumptionBinding.path,reused:Boolean(existing),segmentCount:parts.length,artifact};
}

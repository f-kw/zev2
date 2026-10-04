import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rename, lstat, realpath, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {findById, isAgentRequestReady, type AgentRequest, type Zev2State, type FileRef, getFileRefKindForRequest, getOutputTypeForRequest, assertDigestArtifactV001, digestArtifactFileNameV001, digestArtifactPathFromUriV001, digestProducerRequestIdsV001, assertDigestPlanReferenceClosureV001, type DigestPlanArtifactV001} from '@zev2/shared';
import type {TranscriptArtifact} from './workflow-artifacts.js';
import {resolveLocalSourcePath} from './steps/source-video.js';
import {buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001, validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001} from './distant-connection-common-utterance-artifact-v001.js';
import {runCandidateDiscoveryV001} from './skills/candidate-discovery-v001.js';
import {runCandidateSelectionV001} from './skills/candidate-selection-v001.js';
import {runInternalRetentionV001, assertInternalRetentionInputV001} from './skills/candidate-internal-retention-v001.js';

type Json = Record<string, any>;
type Binding = {schemaVersion: string; path: string; fileSha256: string; canonicalSha256: string};
type ByteBinding = {path: string; fileSha256: string};
export type DigestPreparationStageV001 = 'discovery' | 'selection' | 'retention';
export type DigestPlanPreparationDependenciesV001 = {
  workspaceRoot: string;
  artifactRoot: string;
  judge: (stage: DigestPreparationStageV001, request: Readonly<Json>) => Promise<unknown>;
};
type Input = {request: AgentRequest; state: Zev2State; transcript: TranscriptArtifact; transcriptUri: string};
const SCHEMA = 'normal-request-digest-preparation-binding-v002';
const IMPLEMENTATIONS = [
  'runner/src/digest-plan-preparation-v001.ts', 'runner/src/workflow-step-builders.ts',
  'runner/src/index.ts', 'packages/shared/src/index.ts',
  'packages/shared/src/digest-plan-artifacts-v001.ts', 'runner/src/steps/source-video.ts',
  'runner/src/workflow-artifact-validation.ts',
  'runner/src/skills/candidate-discovery-v001.ts', 'runner/src/skills/candidate-selection-v001.ts',
  'runner/src/skills/candidate-internal-retention-v001.ts',
  'runner/src/distant-connection-common-utterance-artifact-v001.ts', 'runner/src/transcript-utils.ts',
  'evals/clip_composition/unseen_material_thin_plan_v001.mts',
  'evals/clip_composition/candidate_selection_validation_v001.mts',
  'evals/clip_composition/candidate_internal_retention_validation_v001.mts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/run_thin_plan_candidate_selection_v0.mts',
  'evals/clip_composition/presentation_output_crop_application_v001.mjs',
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs',
] as const;
const identifier = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(s);
const plain = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, names: string[]): v is Json => plain(v)
  && Object.keys(v).length === names.length && names.every(n => Object.hasOwn(v, n));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const relative = (root: string, absolute: string) => {
  const value = path.relative(root, absolute).split(path.sep).join('/');
  assert(value && !value.startsWith('/') && !value.split('/').some(s => s === '..' || s === '.' || !s), 'DIGEST_PATH_OUTSIDE_WORKSPACE');
  return value;
};
async function safeFile(root: string, name: string) {
  assert(typeof name === 'string' && name && !path.isAbsolute(name)
    && !name.includes('\\') && !name.split('/').some(s => !s || s === '..' || s === '.'), 'DIGEST_REFERENCE_INVALID');
  const absolute = path.resolve(root, name);
  relative(root, absolute);
  const info = await lstat(absolute);
  assert(info.isFile() && !info.isSymbolicLink() && await realpath(absolute) === absolute, 'DIGEST_REFERENCE_INVALID');
  return absolute;
}
export const NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001 = 'normal-declared-guest-source-v001';
/** Only an explicit local URI can name the one producer-owned guest companion. */
export function resolveNormalDigestDeclaredGuestSourcePathV001(sourceUri: string): string {
  assert(typeof sourceUri === 'string' && sourceUri.length && !sourceUri.includes('\\'), 'DIGEST_GUEST_SOURCE_URI_INVALID');
  let absolute: string;
  if (sourceUri.startsWith('file://')) {
    const url = new URL(sourceUri);
    assert(url.protocol === 'file:' && (!url.hostname || url.hostname === 'localhost')
      && !url.search && !url.hash, 'DIGEST_GUEST_SOURCE_URI_INVALID');
    absolute = fileURLToPath(url);
  } else {assert(path.isAbsolute(sourceUri), 'DIGEST_GUEST_SOURCE_URI_INVALID'); absolute = sourceUri;}
  assert(absolute === path.resolve(absolute), 'DIGEST_GUEST_SOURCE_URI_INVALID');
  return absolute;
}
/** Byte-qualified normal JSONs must prove that only the declared source URI changed. */
export function assertNormalDigestSourceProvenanceV001(value: Json, expected: {
  draftId: string; sourceRequestId: string; sttRequestId: string; sourceOrigin: Json;
  transcriptBinding: ByteBinding; transcript: unknown; originalTranscript: unknown; rawGpu: unknown;
}) {
  assert(exact(value,['schemaVersion','draftId','sourceRequestId','sttRequestId','originalSourceUri','declaredSourceUri',
    'sourceFileSha256','sourceSizeBytes','originalTranscriptBinding','rawGpuBinding','normalTranscriptBinding'])
    && value.schemaVersion === 'normal-transcript-source-uri-provenance-v001','DIGEST_SOURCE_PROVENANCE_INVALID');
  for(const key of ['draftId','sourceRequestId','sttRequestId'] as const) assert.equal(value[key],expected[key],'DIGEST_SOURCE_PROVENANCE_OWNER_CHANGED');
  assert.equal(value.declaredSourceUri,expected.sourceOrigin.declaredSourceUri,'DIGEST_SOURCE_PROVENANCE_URI_CHANGED');
  assert.equal(value.sourceFileSha256,expected.sourceOrigin.fileSha256,'DIGEST_SOURCE_PROVENANCE_SHA_CHANGED');
  assert.equal(value.sourceSizeBytes,expected.sourceOrigin.byteSize,'DIGEST_SOURCE_PROVENANCE_SIZE_CHANGED');
  assert.deepEqual(value.normalTranscriptBinding,expected.transcriptBinding,'DIGEST_SOURCE_PROVENANCE_TRANSCRIPT_CHANGED');
  for(const key of ['originalTranscriptBinding','rawGpuBinding','normalTranscriptBinding']) {
    const b=value[key];assert(exact(b,['path','fileSha256']) && /^[0-9a-f]{64}$/u.test(b.fileSha256),'DIGEST_SOURCE_PROVENANCE_BINDING_INVALID');
    digestArtifactFileNameV001(b.path,expected.draftId,[expected.sttRequestId]);
    assert(b.path.endsWith('.json'),'DIGEST_SOURCE_PROVENANCE_JSON_REQUIRED');
  }
  assert(new Set([value.originalTranscriptBinding.path,value.rawGpuBinding.path,value.normalTranscriptBinding.path]).size === 3,'DIGEST_SOURCE_PROVENANCE_REFERENCE_DUPLICATE');
  assert(typeof value.originalSourceUri === 'string' && value.originalSourceUri.length
    && plain(expected.originalTranscript) && plain(expected.rawGpu),'DIGEST_SOURCE_PROVENANCE_ORIGINAL_INVALID');
  assert(plain(expected.rawGpu.input),'DIGEST_SOURCE_PROVENANCE_RAW_INPUT_INVALID');
  assert.equal(expected.rawGpu.input.sha256,value.sourceFileSha256,'DIGEST_SOURCE_PROVENANCE_RAW_SHA_CHANGED');
  assert.equal(expected.rawGpu.input.bytes,value.sourceSizeBytes,'DIGEST_SOURCE_PROVENANCE_RAW_SIZE_CHANGED');
  assert.equal(expected.originalTranscript.sourceUri,value.originalSourceUri,'DIGEST_SOURCE_PROVENANCE_ORIGINAL_URI_CHANGED');
  assert.deepEqual({...expected.originalTranscript,sourceUri:value.declaredSourceUri},expected.transcript,'DIGEST_SOURCE_PROVENANCE_BODY_CHANGED');
}
export function digestDataPathV001(artifactRoot: string, draftId: string, logicalPath: string) {
  const file = digestArtifactFileNameV001(logicalPath, draftId);
  return path.join(path.resolve(artifactRoot), draftId, file);
}
export function registeredDigestDependencyV001(state: Zev2State, dependency: AgentRequest, kind: FileRef['kind']) {
  const outputs = state.outputs.filter(o => o.id === dependency.result?.outputId);
  const refs = state.fileRefs.filter(f => f.id === dependency.result?.fileRefId);
  const o = outputs[0], f = refs[0];
  assert(dependency.status === 'succeeded' && outputs.length === 1 && refs.length === 1 && o && f
    && o.type === getOutputTypeForRequest(dependency.type) && dependency.result?.outputType === o.type
    && o.fileRefId === f.id && f.ownerId === o.id && f.kind === kind && kind === getFileRefKindForRequest(dependency.type)
    && same(dependency.fileRefIds,[f.id]) && /^[0-9a-f]{64}$/u.test(f.sha256) && Number.isSafeInteger(f.byteSize)
    && f.byteSize > 0, 'DIGEST_DEPENDENCY_REFERENCE_INVALID');
  assert(f.uri.startsWith(`/api/artifacts/${dependency.requestDraftId}/`), 'DIGEST_DEPENDENCY_OTHER_DRAFT');
  return f;
}
function commandSnapshot(r: AgentRequest) {
  return {id: r.id, requestDraftId: r.requestDraftId, type: r.type, target: r.target,
    input: r.input, constraints: r.constraints, policy: r.policy,
    dependsOnAgentRequestId: r.dependsOnAgentRequestId, createdAt: r.createdAt};
}
function qualify(input: Input, execution: boolean) {
  const {request: r, state} = input;
  assert(identifier(r.id) && identifier(r.requestDraftId) && r.type === 'prepare_digest_plan' && r.input.productionType === 'digest', 'DIGEST_REQUEST_INVALID');
  const current = state.agentRequests.filter(x => x.id === r.id);
  const drafts = state.requestDrafts.filter(x => x.id === r.requestDraftId);
  assert(current.length === 1 && same(current[0], r) && drafts.length === 1, 'DIGEST_REQUEST_STATE_MISMATCH');
  const d = drafts[0]!;
  assert(d.status === 'approved' && d.productionType === 'digest' && d.purpose.trim(), 'DIGEST_REQUEST_NOT_APPROVED');
  if (execution) assert(r.status === 'running' && r.claimOwnerId?.trim() && r.claimedAt && r.claimUpdatedAt && !r.claimExpiredAt
    && (!r.claimExpiresAt || Date.parse(r.claimExpiresAt) > Date.now()), 'DIGEST_REQUEST_NOT_CLAIMED');
  assert(isAgentRequestReady(state, {...r, status: 'queued'}), 'DIGEST_DEPENDENCY_OR_REVIEW_NOT_READY');
  const matches = (x: AgentRequest) => x.input.productionType === d.productionType && x.requestDraftId === d.id && x.target.sourceUri === d.source.uri
    && x.input.purpose === d.purpose && same(x.input.settings, d.settings)
    && same(x.constraints, d.settings) && same(x.policy, d.policy);
  assert(matches(r), 'DIGEST_APPROVED_INPUT_CHANGED');
  const stt = findById(state.agentRequests, r.dependsOnAgentRequestId);
  const video = findById(state.agentRequests, stt?.dependsOnAgentRequestId);
  assert(stt?.type === 'run_stt' && stt.status === 'succeeded' && matches(stt)
    && video?.type === 'prepare_video' && video.status === 'succeeded' && matches(video), 'DIGEST_DEPENDENCY_INPUT_CHANGED');
  const transcriptRef = registeredDigestDependencyV001(state, stt, 'transcript_json'), videoRef = registeredDigestDependencyV001(state, video, 'source_video');
  assert(transcriptRef.uri === input.transcriptUri && input.transcript.sourceUri === d.source.uri, 'DIGEST_TRANSCRIPT_SOURCE_MISMATCH');
  return {draft: d, transcriptRef, videoRef, stt, video};
}

/** 明示Digestの通常採否・保持工程。通信だけを外部判断へ委任する。 */
export async function prepareDigestPlanV001(deps: DigestPlanPreparationDependenciesV001, input: Input) {
  return prepare(deps, input, true);
}

/** 別processの読取確認。未完了は拒否し、provider・保存・claim・reviewを作用させない。 */
export async function readPreparedDigestPlanV001(deps: Omit<DigestPlanPreparationDependenciesV001, 'judge'>, input: Input) {
  return prepare({...deps, judge: async () => {throw new Error('DIGEST_READ_ONLY_PROVIDER_FORBIDDEN');}}, input, false);
}

async function prepare(deps: DigestPlanPreparationDependenciesV001, input: Input, execution: boolean) {
  input = structuredClone(input);
  deps = {...deps};
  const approved = qualify(input, execution); // 保存やproviderより前に、実stateの承認・claim・依存を検査。
  const sourceId = approved.videoRef.id;
  const root = await realpath(deps.workspaceRoot), artifactRoot = await realpath(deps.artifactRoot);

  const load = (name: string) => import(pathToFileURL(path.resolve(root, 'evals/clip_composition', name)).href);
  // 凍結済み.mtsの純粋builder/validatorを既存tsx実行環境で利用する。CLIのmain guardは起動しない。
  const base = await load('run_candidate_discovery_digest_skill_e2e_v001.mts');
  const discovery = await load('unseen_material_thin_plan_v001.mts');
  const selection = await load('candidate_selection_validation_v001.mts');
  const retention = await load('candidate_internal_retention_validation_v001.mts');
  const {formal, bind, sha, canonicalSha, fileSha} = base;
  const directory = path.join(artifactRoot, input.request.requestDraftId);
  const outputRoot = `artifacts/${input.request.requestDraftId}/${input.request.id}`;
  const file = (name: string) => `${outputRoot}/${name}`;
  const producers = digestProducerRequestIdsV001(input.state,input.request);
  const dataPath = (name: string) => {digestArtifactFileNameV001(name,input.request.requestDraftId,producers);return digestDataPathV001(artifactRoot,input.request.requestDraftId,name);};
  const recordPath = dataPath(file('preparation-binding.json'));
  const readByte = async (b: ByteBinding) => {
    assert(exact(b, ['path','fileSha256']) && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'DIGEST_BYTE_BINDING_INVALID');
    const absolute = dataPath(b.path);
    assert.equal(await safeFile(artifactRoot, relative(artifactRoot,absolute)), absolute);
    assert.equal(await fileSha(absolute), b.fileSha256, 'DIGEST_SOURCE_SHA_MISMATCH');
    return absolute;
  };
  const reference = async (f: FileRef, producer: AgentRequest) => {
    const b = {path:digestArtifactPathFromUriV001(f.uri,input.request.requestDraftId,producer.id),fileSha256:f.sha256};
    const absolute = await readByte(b);
    assert.equal((await lstat(absolute)).size,f.byteSize,'DIGEST_SOURCE_SIZE_MISMATCH'); return b;
  };
  let prior: Json | undefined;
  try {prior=JSON.parse(await readFile(recordPath,'utf8'));assert(prior?.schemaVersion === SCHEMA,'DIGEST_SAVED_BINDING_VERSION_INVALID');}
  catch(e) {if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;}
  const sourceRegistration = await reference(approved.videoRef,approved.video), transcriptBinding = await reference(approved.transcriptRef,approved.stt);
  const transcriptBytes = await readFile(dataPath(transcriptBinding.path));
  const transcript = JSON.parse(transcriptBytes.toString());
  assert(base.same(transcript,input.transcript),'DIGEST_TRANSCRIPT_BODY_CHANGED');
  const registration = approved.videoRef.mimeType.startsWith('video/') ? null
    : JSON.parse(await readFile(dataPath(sourceRegistration.path),'utf8'));
  if(registration) assert(registration.kind === 'source_video' && registration.sourceUri === input.request.target.sourceUri
    && registration.purpose === input.request.input.purpose,'DIGEST_SOURCE_REGISTRATION_CHANGED');
  let sourceVideo: ByteBinding, sourceOrigin: Json;
  if(prior && !execution && prior.identity.sourceOrigin.placement === undefined) {
    sourceVideo=prior.identity.sourceVideo;sourceOrigin=prior.identity.sourceOrigin;await readByte(sourceVideo);
  } else {
    const media = registration ? resolveLocalSourcePath(registration.sourceUri,root) : dataPath(sourceRegistration.path);
    assert(media,'DIGEST_SOURCE_MEDIA_UNRESOLVED');
    const repoRelative = path.relative(root,media);
    const guestCompanion = Boolean(registration && (path.isAbsolute(repoRelative)
      || repoRelative === '..' || repoRelative.startsWith(`..${path.sep}`)));
    const companion = `artifacts/${input.request.requestDraftId}/${approved.video.id}/source-video.mp4`;
    if(guestCompanion) {
      assert.equal(media,resolveNormalDigestDeclaredGuestSourcePathV001(registration.sourceUri),'DIGEST_GUEST_SOURCE_URI_INVALID');
      assert.equal(media,dataPath(companion),'DIGEST_GUEST_SOURCE_COMPANION_MISMATCH');
      assert(registration.sourceInspectionBinding,'DIGEST_GUEST_INSPECTION_REQUIRED');
      if(registration.localPath !== undefined) assert.equal(registration.localPath,media,'DIGEST_GUEST_SOURCE_LOCAL_PATH_CHANGED');
      await safeFile(artifactRoot,relative(artifactRoot,media));
    } else if(registration) await safeFile(root,relative(root,media));
    else await safeFile(artifactRoot,relative(artifactRoot,media));
    const before = await lstat(media), sourceSha = await fileSha(media), after = await lstat(media);
    assert(before.ino === after.ino && before.dev === after.dev && before.size === after.size
      && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs,'DIGEST_SOURCE_CHANGED_DURING_HASH');
    const size = after.size;
    sourceOrigin={registration:sourceRegistration,mode:registration?'json-reference':'video-bytes',
      declaredSourceUri:input.request.target.sourceUri,byteSize:size,fileSha256:sourceSha,
      ...(guestCompanion ? {placement:NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001} : {})};
    sourceVideo=guestCompanion ? {path:companion,fileSha256:sourceSha}
      : registration ? {path:file('source-media.mp4'),fileSha256:sourceSha} : sourceRegistration;
  }
  const provenanceBindings: ByteBinding[] = [];
  if(sourceOrigin.placement === NORMAL_DECLARED_GUEST_SOURCE_PLACEMENT_V001) {
    const provenanceBinding=registration.normalSourceProvenanceBinding;
    assert(provenanceBinding && provenanceBinding.path.startsWith(`artifacts/${input.request.requestDraftId}/${approved.stt.id}/`)
      && provenanceBinding.path.endsWith('.json'),'DIGEST_GUEST_SOURCE_PROVENANCE_REQUIRED');
    const provenance=JSON.parse(await readFile(await readByte(provenanceBinding),'utf8'));
    const originalTranscript=JSON.parse(await readFile(await readByte(provenance.originalTranscriptBinding),'utf8'));
    const rawGpu=JSON.parse(await readFile(await readByte(provenance.rawGpuBinding),'utf8'));
    assertNormalDigestSourceProvenanceV001(provenance,{draftId:input.request.requestDraftId,sourceRequestId:approved.video.id,
      sttRequestId:approved.stt.id,sourceOrigin,transcriptBinding,transcript,originalTranscript,rawGpu});
    sourceOrigin.provenanceBinding=provenanceBinding;
    provenanceBindings.push(provenanceBinding,provenance.originalTranscriptBinding,provenance.rawGpuBinding);
  } else assert(registration?.normalSourceProvenanceBinding === undefined,'DIGEST_SOURCE_PROVENANCE_PLACEMENT_INVALID');
  const sourceInspection = registration?.sourceInspectionBinding ?? null;
  if(sourceInspection) {const inspected=JSON.parse(await readFile(await readByte(sourceInspection),'utf8'));
    assert(inspected.schemaVersion === 'new-material-source-inspection-v001'
      && inspected.sourceVideoBinding?.fileSha256 === sourceVideo.fileSha256,'DIGEST_INSPECTION_SOURCE_MISMATCH');}
    if(registration && execution && sourceOrigin.placement === undefined) {
      assert(execution,'DIGEST_READ_ONLY_SOURCE_MISSING');
      await mkdir(directory,{recursive:true});assert.equal(await realpath(directory),directory,'DIGEST_OUTPUT_REFERENCE_INVALID');
      try {await readByte(sourceVideo);} catch(e) {if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        await copyFile(resolveLocalSourcePath(registration.sourceUri,root)!,dataPath(sourceVideo.path),constants.COPYFILE_EXCL|constants.COPYFILE_FICLONE);await readByte(sourceVideo);}
    }
  const utterances = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath:transcriptBinding.path,sourceTranscriptBytes:transcriptBytes});
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(utterances,
    {sourceTranscriptPath:transcriptBinding.path,sourceTranscriptBytes:transcriptBytes});
  const utteranceBinding=bind(file('utterances.json'),utterances);
  if(execution) {
    await mkdir(directory,{recursive:true});
    try {assert.equal(sha(await readFile(dataPath(utteranceBinding.path))),utteranceBinding.fileSha256,'DIGEST_UTTERANCES_CHANGED');}
    catch(e) {if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;await writeFile(dataPath(utteranceBinding.path),formal(utterances),{flag:'wx'});}
  } else await readByte({path:utteranceBinding.path,fileSha256:utteranceBinding.fileSha256});
  const implementations = [];
  for (const p of IMPLEMENTATIONS) implementations.push({path: p, fileSha256: await fileSha(await safeFile(root, p))});
  const draftSnapshot = {id: approved.draft.id, productionType: approved.draft.productionType, purpose: approved.draft.purpose, source: approved.draft.source,
    settings: approved.draft.settings, policy: approved.draft.policy, steps: approved.draft.steps,
    createdAt: approved.draft.createdAt, approvedAt: approved.draft.updatedAt};
  const identity = {requestDraftId: input.request.requestDraftId, requestId: input.request.id,
    approvedDraft: draftSnapshot, approvedDraftSha256: canonicalSha(draftSnapshot),
    command: commandSnapshot(input.request), commandSha256: canonicalSha(commandSnapshot(input.request)),
    sourceId, sourceUri: input.request.target.sourceUri,
    sourceVideo, sourceRegistration, sourceOrigin, sourceInspection, transcript: transcriptBinding, utterances: {path:utteranceBinding.path,fileSha256:utteranceBinding.fileSha256},
    dependencyReferences: {video: approved.videoRef, transcript: approved.transcriptRef}, implementations};
  let record: Json;
  try {
    record = JSON.parse(await readFile(recordPath, 'utf8'));
    assert(exact(record, ['schemaVersion', 'identity', 'status', 'stages', 'artifacts']) && record.schemaVersion === SCHEMA
      && base.same(record.identity, identity) && ['incomplete', 'complete'].includes(record.status)
      && plain(record.stages) && plain(record.artifacts)
      && same(Object.keys(record.stages), ['discovery', 'selection', 'retention'].slice(0, Object.keys(record.stages).length))
      && (record.status !== 'complete' || Object.keys(record.stages).length === 3), 'DIGEST_SAVED_BINDING_INVALID');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    record = {schemaVersion: SCHEMA, identity, status: 'incomplete', stages: {}, artifacts: {}};
  }
  const recordExisted = Object.keys(record.stages).length > 0;
  if (!execution) assert.equal(record.status, 'complete', 'DIGEST_PREPARATION_INCOMPLETE');
  // 所有する出力dirの外へ書かない。既存symlink／親の差替えを受け付けない。
  if (execution) await mkdir(directory, {recursive: true});
  assert.equal(await realpath(directory), directory, 'DIGEST_OUTPUT_REFERENCE_INVALID');
  const update = async () => {if (!execution) return; const temporary = `${recordPath}.tmp`; await writeFile(temporary, formal(record)); await rename(temporary, recordPath);};
  const persist = async (name: string, value: Json): Promise<Binding> => {
    const b = bind(file(name), value);
    if (record.artifacts[name]) {
      assert(base.same(record.artifacts[name], b), 'DIGEST_SAVED_BINDING_CHANGED');
      assert.equal(sha(await readFile(await safeFile(artifactRoot, relative(artifactRoot,dataPath(b.path))))), b.fileSha256, 'DIGEST_SAVED_ARTIFACT_CHANGED');
      return b;
    }
    assert(execution, 'DIGEST_READ_ONLY_ARTIFACT_MISSING');
    try {assert.equal(sha(await readFile(dataPath(b.path))), b.fileSha256, 'DIGEST_SAVED_ARTIFACT_CHANGED');}
    catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; await writeFile(dataPath(b.path), formal(value), {flag: 'wx'});}
    record.artifacts[name] = b; await update();
    return b;
  };
  const bound = async (b: Binding) => {
    base.assertBinding(b); assert.equal(path.dirname(b.path), outputRoot, 'DIGEST_STAGE_REFERENCE_OUTSIDE_REQUEST');
    const bytes = await readFile(await safeFile(artifactRoot, relative(artifactRoot,dataPath(b.path))));
    assert.equal(sha(bytes), b.fileSha256, 'DIGEST_SAVED_ARTIFACT_CHANGED');
    const v = JSON.parse(bytes.toString()); assert(base.same(bind(b.path, v), b), 'DIGEST_CANONICAL_BINDING_CHANGED'); return v;
  };
  const names = ['binding-input.json', 'production-intent.json', 'discovery-plan.json', 'selection-plan.json',
    'candidate-request.json', 'candidate-response.json', 'candidate-result.json', 'candidate-set.json', 'discovery-validation.json',
    'selection-request.json', 'selection-response.json', 'selection-result.json', 'selection-validation.json', 'selection-adoption.json',
    'retention-request.json', 'retention-response.json', 'retention-result.json', 'retention-validation.json'];
  for (const [name, b] of Object.entries(record.artifacts)) {
    assert(names.includes(name) && (b as Binding).path === file(name), 'DIGEST_SAVED_REFERENCE_INVALID');
    await bound(b as Binding);
  }
  for (const saved of Object.values(record.stages) as Json[]) {
    assert(exact(saved, ['request', 'response', 'result', 'accepted']) && plain(saved.accepted), 'DIGEST_STAGE_BINDING_INVALID');
    for (const b of [saved.request, saved.response, saved.result, ...Object.values(saved.accepted)] as Binding[]) {
      assert(plain(b) && base.same(record.artifacts[path.basename(b.path)], b), 'DIGEST_STAGE_REGISTRY_MISMATCH');
    }
  }
  if (record.status === 'complete') assert(base.same(Object.keys(record.artifacts).sort(), [...names].sort()), 'DIGEST_COMPLETE_ARTIFACT_MISSING');
  await update();
  const thin = {schemaVersion: 'production-intent-plan-v0', productionIntent: input.request.input.purpose};
  const thinBinding = await persist('production-intent.json', thin);
  // 既存版planを使い、通常の承認snapshotとの対応は上の一種類の内部記録が所有する。
  const authorization = await persist('binding-input.json', {schemaVersion: SCHEMA, identity, status: 'incomplete', stages: {}, artifacts: {}});
  const plan: Json = {schemaVersion: 'new-material-digest-execution-plan-v001',
    planId: input.request.id, stage: 'candidate-discovery',
    authorization,
    thinPlanBinding: thinBinding,
    request: {purpose: input.request.input.purpose, sourceId, sourceVideo,
      transcript: transcriptBinding, utterances: utteranceBinding},
    structureConditions: [...discovery.STRUCTURE024], implementationBindings: implementations, outputRoot};
  const planBinding = await persist('discovery-plan.json', plan);
  const c: Json = {plan, planBinding, thinPlan: thin, transcript, utterances};
  const stage = async (name: DigestPreparationStageV001, expected: Json,
    run: (value: any, judge: (value: any) => Promise<unknown>) => Promise<any>) => {
    const saved = record.stages[name];
    if (saved) {
      assert(exact(saved, ['request', 'response', 'result', 'accepted']) && plain(saved.accepted), 'DIGEST_STAGE_BINDING_INVALID');
      const request = await bound(saved.request), response = await bound(saved.response), result = await bound(saved.result);
      assert(base.same(request, expected), 'DIGEST_SAVED_REQUEST_CHANGED');
      return {request, response, result, saved};
    }
    assert(record.status !== 'complete', 'DIGEST_COMPLETE_STAGE_MISSING');
    assert(execution, 'DIGEST_READ_ONLY_STAGE_MISSING');
    const prefix = name === 'discovery' ? 'candidate' : name;
    const request = structuredClone(expected); await persist(`${prefix}-request.json`, request);
    let response: unknown;
    const result = await run(request.input, async () => {
      response = await deps.judge(name, structuredClone(request));
      assert(plain(response), 'DIGEST_PROVIDER_RESPONSE_INVALID');
      return response.answer;
    });
    assert(plain(response), 'DIGEST_PROVIDER_RESPONSE_MISSING');
    return {request, response, result, saved: undefined};
  };
  const accepted = async (name: DigestPreparationStageV001, s: Json, artifacts: Record<string, Json>) => {
    const refs: Json = {};
    for (const [filename, value] of Object.entries(artifacts)) refs[filename] = await persist(filename, value);
    if (s.saved) {
      assert(base.same(Object.keys(s.saved.accepted), Object.keys(refs)), 'DIGEST_ACCEPTED_SET_CHANGED');
      for (const [filename, b] of Object.entries(refs)) assert(base.same(await bound(s.saved.accepted[filename]), artifacts[filename])
        && base.same(s.saved.accepted[filename], b), 'DIGEST_ACCEPTED_RESULT_CHANGED');
    } else {
      const prefix = name === 'discovery' ? 'candidate' : name;
      record.stages[name] = {request: await persist(`${prefix}-request.json`, s.request),
        response: await persist(`${prefix}-response.json`, s.response), result: await persist(`${prefix}-result.json`, s.result), accepted: refs};
      await update();
    }
  };
  const d = await stage('discovery', discovery.buildUnseenDiscoveryRequestV001(c), runCandidateDiscoveryV001);
  const discovered = discovery.validateUnseenDiscoveryV001(c, d.request, d.response, d.result);
  await accepted('discovery', d, {'candidate-set.json': discovered.candidateSet, 'discovery-validation.json': discovered.validation});
  const selectionPlan = discovery.projectUnseenSelectionPlanV001(c, discovered.candidateSet);
  const selectionPlanBinding = await persist('selection-plan.json', selectionPlan);
  const sc: Json = {...c, plan: selectionPlan, planBinding: selectionPlanBinding, candidateSet: discovered.candidateSet};
  const s = await stage('selection', selection.buildSelectionRequestV001(sc), runCandidateSelectionV001);
  const selected = discovery.selectUnseenCandidatesV001(sc, s.request, s.response, s.result);
  assert(selected.adoption.adoptedCandidates.length > 0, 'DIGEST_NO_ADOPTED_CANDIDATES_FOR_RETENTION');
  await accepted('selection', s, {'selection-validation.json': selected.validation, 'selection-adoption.json': selected.adoption});
  const byUtterance = new Map<string, Json>(utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const byAtom = new Map<number, Json>(transcript.segments.map((a: Json) => [a.id, a]));
  const retentionInput = {schemaVersion: 'candidate-internal-retention-input-v001' as const,
    taskDescription: input.request.input.purpose,
    candidates: selected.adoption.adoptedCandidates.map((p: Json) => ({candidateId: p.candidateId,
      title: p.title, highlightReason: p.judgment.reason,
      utterances: p.includedUtteranceIds.map((id: string) => ({utteranceId: id,
        atoms: byUtterance.get(id)!.sourceSegmentIds.map((a: number) => ({sourceSegmentId: a, text: byAtom.get(a)!.text}))}))}))};
  assertInternalRetentionInputV001(retentionInput);
  const expectedRetention = {schemaVersion: 'candidate-internal-retention-request-v001', planBinding: selectionPlanBinding,
    selectionAdoptionBinding: bind(file('selection-adoption.json'), selected.adoption), input: retentionInput};
  const r = await stage('retention', expectedRetention, runInternalRetentionV001);
  const token = retention.validateInternalRetentionProvenanceV001(r.request, r.response, r.result, retentionInput);
  const observations = {transcriptBinding, units: transcript.segments.filter((a: Json) => a.endMs > a.startMs)
    .map((a: Json) => ({unitId: `source-fragment-${a.id}`, startMs: a.startMs, endMs: a.endMs,
      startBoundary: {after: a.id}, endBoundary: {before: a.id}, startTimeRole: 'gpu-aligned-source-fragment',
      timeOrigin: 'saved-source-transcript'}))};
  const resolved = retention.resolveInternalRetentionV001(token, selected.adoption.adoptedCandidates, [observations]);
  assert.equal(resolved.status, 'resolved', 'DIGEST_RETENTION_UNRESOLVED');
  const validation = {schemaVersion: 'new-material-retention-validation-v001', ...resolved,
    requestBinding: bind(file('retention-request.json'), r.request), transcriptBinding};
  await accepted('retention', r, {'retention-validation.json': validation});
  record.status = 'complete'; await update();
  const preparationBinding = bind(file('preparation-binding.json'),record);
  const all = [sourceRegistration,sourceVideo,transcriptBinding,utteranceBinding,...Object.values(record.artifacts) as Binding[],preparationBinding,
    ...(sourceInspection?[sourceInspection]:[]),...provenanceBindings];
  const dataBindings = [...new Map(all.map(b => [b.path,{path:b.path,fileSha256:b.fileSha256}])).values()];
  const artifact: DigestPlanArtifactV001 = {schemaVersion:'digest-plan-artifact-v001',kind:'digest_plan_json',
    requestDraftId:input.request.requestDraftId,requestId:input.request.id,approvedRequestBinding:authorization,
    sourceVideoBinding:sourceVideo,transcriptBinding,utteranceBinding,preparationBinding,dataBindings,quality:'human-review-pending'};
  assertDigestArtifactV001(artifact,'digest_plan_json',{requestDraftId:input.request.requestDraftId,requestId:input.request.id});
  const documents = new Map<string,unknown>();
  for (const b of Object.values(record.artifacts) as Binding[]) documents.set(b.path,await bound(b));
  assertDigestPlanReferenceClosureV001(artifact,record,documents,producers);
  return {status:'prepared' as const,bindingPath:preparationBinding.path,resumed:recordExisted,artifact};
}

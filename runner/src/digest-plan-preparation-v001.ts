import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rename, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {findById, isAgentRequestReady, type AgentRequest, type Zev2State, type FileRef} from '@zev2/shared';
import type {TranscriptArtifact} from './workflow-artifacts.js';
import {validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001} from './distant-connection-common-utterance-artifact-v001.js';
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
  sourceId: string;
  utterances: ByteBinding;
  judge: (stage: DigestPreparationStageV001, request: Readonly<Json>) => Promise<unknown>;
};
type Input = {request: AgentRequest; state: Zev2State; transcript: TranscriptArtifact; transcriptUri: string};
const SCHEMA = 'normal-request-digest-preparation-binding-v001';
const IMPLEMENTATIONS = [
  'runner/src/digest-plan-preparation-v001.ts', 'runner/src/workflow-step-builders.ts',
  'runner/src/index.ts', 'packages/shared/src/index.ts',
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
function artifactPath(deps: DigestPlanPreparationDependenciesV001, uri: string) {
  assert(uri.startsWith('/api/artifacts/'), 'DIGEST_ARTIFACT_URI_INVALID');
  const tail = uri.slice('/api/artifacts/'.length).split('/').map(decodeURIComponent).join('/');
  const absolute = path.resolve(deps.artifactRoot, tail);
  relative(path.resolve(deps.artifactRoot), absolute);
  return relative(path.resolve(deps.workspaceRoot), absolute);
}
function commandSnapshot(r: AgentRequest) {
  return {id: r.id, requestDraftId: r.requestDraftId, type: r.type, target: r.target,
    input: r.input, constraints: r.constraints, policy: r.policy,
    dependsOnAgentRequestId: r.dependsOnAgentRequestId, createdAt: r.createdAt};
}
function qualify(input: Input, execution: boolean) {
  const {request: r, state} = input;
  assert(identifier(r.id) && identifier(r.requestDraftId) && r.type === 'propose_clip_themes', 'DIGEST_REQUEST_INVALID');
  const current = state.agentRequests.filter(x => x.id === r.id);
  const drafts = state.requestDrafts.filter(x => x.id === r.requestDraftId);
  assert(current.length === 1 && same(current[0], r) && drafts.length === 1, 'DIGEST_REQUEST_STATE_MISMATCH');
  const d = drafts[0]!;
  assert(d.status === 'approved' && d.purpose.trim(), 'DIGEST_REQUEST_NOT_APPROVED');
  if (execution) assert(r.status === 'running' && r.claimOwnerId?.trim() && r.claimedAt && r.claimUpdatedAt && !r.claimExpiredAt
    && (!r.claimExpiresAt || Date.parse(r.claimExpiresAt) > Date.now()), 'DIGEST_REQUEST_NOT_CLAIMED');
  assert(isAgentRequestReady(state, {...r, status: 'queued'}), 'DIGEST_DEPENDENCY_OR_REVIEW_NOT_READY');
  const matches = (x: AgentRequest) => x.requestDraftId === d.id && x.target.sourceUri === d.source.uri
    && x.input.purpose === d.purpose && same(x.input.settings, d.settings)
    && same(x.constraints, d.settings) && same(x.policy, d.policy);
  assert(matches(r), 'DIGEST_APPROVED_INPUT_CHANGED');
  const stt = findById(state.agentRequests, r.dependsOnAgentRequestId);
  const video = findById(state.agentRequests, stt?.dependsOnAgentRequestId);
  assert(stt?.type === 'run_stt' && stt.status === 'succeeded' && matches(stt)
    && video?.type === 'prepare_video' && video.status === 'succeeded' && matches(video), 'DIGEST_DEPENDENCY_INPUT_CHANGED');
  const ref = (dep: AgentRequest, kind: FileRef['kind']) => {
    const rows = state.fileRefs.filter(f => f.id === dep.result?.fileRefId);
    assert(rows.length === 1 && rows[0]?.ownerId === dep.id && rows[0].kind === kind
      && /^[0-9a-f]{64}$/u.test(rows[0].sha256) && Number.isSafeInteger(rows[0].byteSize)
      && rows[0].byteSize > 0, 'DIGEST_DEPENDENCY_REFERENCE_INVALID');
    return rows[0];
  };
  const transcriptRef = ref(stt, 'transcript_json'), videoRef = ref(video, 'source_video');
  assert(transcriptRef.uri === input.transcriptUri && input.transcript.sourceUri === d.source.uri, 'DIGEST_TRANSCRIPT_SOURCE_MISMATCH');
  return {draft: d, transcriptRef, videoRef};
}

/** 明示依存でのみ実行。通常のテーマ選択・完成命令・公開APIを変更しない。 */
export async function prepareDigestPlanV001(deps: DigestPlanPreparationDependenciesV001, input: Input) {
  return prepare(deps, input, true);
}

/** 別processの読取確認。未完了は拒否し、provider・保存・claim・reviewを作用させない。 */
export async function readPreparedDigestPlanV001(deps: Omit<DigestPlanPreparationDependenciesV001, 'judge'>, input: Input) {
  return prepare({...deps, judge: async () => {throw new Error('DIGEST_READ_ONLY_PROVIDER_FORBIDDEN');}}, input, false);
}

async function prepare(deps: DigestPlanPreparationDependenciesV001, input: Input, execution: boolean) {
  input = structuredClone(input);
  deps = {...deps, utterances: structuredClone(deps.utterances)};
  const approved = qualify(input, execution); // 保存やproviderより前に、実stateの承認・claim・依存を検査。
  assert(identifier(deps.sourceId), 'DIGEST_SOURCE_ID_INVALID');
  const root = await realpath(deps.workspaceRoot), artifactRoot = await realpath(deps.artifactRoot);
  relative(root, artifactRoot);
  const load = (name: string) => import(pathToFileURL(path.resolve(root, 'evals/clip_composition', name)).href);
  // 凍結済み.mtsの純粋builder/validatorを既存tsx実行環境で利用する。CLIのmain guardは起動しない。
  const base = await load('run_candidate_discovery_digest_skill_e2e_v001.mts');
  const discovery = await load('unseen_material_thin_plan_v001.mts');
  const selection = await load('candidate_selection_validation_v001.mts');
  const retention = await load('candidate_internal_retention_validation_v001.mts');
  const {formal, bind, sha, canonicalSha, fileSha} = base;
  const readByte = async (b: ByteBinding) => {
    assert(exact(b, ['path', 'fileSha256']) && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'DIGEST_BYTE_BINDING_INVALID');
    const absolute = await safeFile(root, b.path);
    assert.equal(await fileSha(absolute), b.fileSha256, 'DIGEST_SOURCE_SHA_MISMATCH');
    return absolute;
  };
  const reference = async (f: FileRef) => {
    const b = {path: artifactPath(deps, f.uri), fileSha256: f.sha256};
    const absolute = await readByte(b);
    assert.equal((await lstat(absolute)).size, f.byteSize, 'DIGEST_SOURCE_SIZE_MISMATCH');
    return b;
  };
  const sourceVideo = await reference(approved.videoRef), transcriptBinding = await reference(approved.transcriptRef);
  const transcriptBytes = await readFile(path.resolve(root, transcriptBinding.path));
  const transcript = JSON.parse(transcriptBytes.toString());
  assert(base.same(transcript, input.transcript), 'DIGEST_TRANSCRIPT_BODY_CHANGED');
  const utterancePath = await readByte(deps.utterances);
  const utterances = JSON.parse(await readFile(utterancePath, 'utf8'));
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(utterances,
    {sourceTranscriptPath: transcriptBinding.path, sourceTranscriptBytes: transcriptBytes});
  const directory = path.join(artifactRoot, input.request.requestDraftId, 'digest-preparation', input.request.id);
  const outputRoot = relative(root, directory), recordPath = path.join(directory, 'binding.json');
  const file = (name: string) => `${outputRoot}/${name}`;
  const implementations = [];
  for (const p of IMPLEMENTATIONS) implementations.push({path: p, fileSha256: await fileSha(await safeFile(root, p))});
  const draftSnapshot = {id: approved.draft.id, purpose: approved.draft.purpose, source: approved.draft.source,
    settings: approved.draft.settings, policy: approved.draft.policy, steps: approved.draft.steps,
    createdAt: approved.draft.createdAt, approvedAt: approved.draft.updatedAt};
  const identity = {requestDraftId: input.request.requestDraftId, requestId: input.request.id,
    approvedDraft: draftSnapshot, approvedDraftSha256: canonicalSha(draftSnapshot),
    command: commandSnapshot(input.request), commandSha256: canonicalSha(commandSnapshot(input.request)),
    sourceId: deps.sourceId, sourceUri: input.request.target.sourceUri,
    sourceVideo, transcript: transcriptBinding, utterances: deps.utterances,
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
      assert.equal(sha(await readFile(await safeFile(root, b.path))), b.fileSha256, 'DIGEST_SAVED_ARTIFACT_CHANGED');
      return b;
    }
    assert(execution, 'DIGEST_READ_ONLY_ARTIFACT_MISSING');
    try {assert.equal(sha(await readFile(path.resolve(root, b.path))), b.fileSha256, 'DIGEST_SAVED_ARTIFACT_CHANGED');}
    catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; await writeFile(path.resolve(root, b.path), formal(value), {flag: 'wx'});}
    record.artifacts[name] = b; await update();
    return b;
  };
  const bound = async (b: Binding) => {
    base.assertBinding(b); assert.equal(path.dirname(b.path), outputRoot, 'DIGEST_STAGE_REFERENCE_OUTSIDE_REQUEST');
    const bytes = await readFile(await safeFile(root, b.path));
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
    request: {purpose: input.request.input.purpose, sourceId: deps.sourceId, sourceVideo,
      transcript: transcriptBinding, utterances: bind(deps.utterances.path, utterances)},
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
  return {status: 'prepared' as const, bindingPath: relative(root, recordPath), resumed: recordExisted};
}

import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readPreparedDigestPlanV001, type DigestPlanPreparationDependenciesV001} from './digest-plan-preparation-v001.js';
import {createStepArtifactBuilders, type WorkflowStepRuntime} from './workflow-step-builders.js';

type Json = Record<string, any>;
type ByteBinding = {path: string; fileSha256: string};
type Input = Parameters<typeof readPreparedDigestPlanV001>[1];
export type DigestPlanConsumptionDependenciesV001 = {
  preparation: Omit<DigestPlanPreparationDependenciesV001, 'judge'>;
  sourceInspection: ByteBinding;
};
const SCHEMA = 'normal-request-digest-consumption-binding-v001';
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

/** 通常factoryを変更せず、その実呼出しと後段の実消費を一系列にする明示接続。 */
export async function prepareAndConsumeDigestPlanV001(
  runtime: WorkflowStepRuntime, deps: DigestPlanConsumptionDependenciesV001, input: Input,
) {
  const explicit = runtime.digestPlanPreparation;
  assert(explicit && explicit.workspaceRoot === deps.preparation.workspaceRoot
    && explicit.artifactRoot === deps.preparation.artifactRoot && explicit.sourceId === deps.preparation.sourceId
    && JSON.stringify(explicit.utterances) === JSON.stringify(deps.preparation.utterances), 'DIGEST_CONSUMPTION_DEPENDENCY_MISMATCH');
  const theme = await createStepArtifactBuilders(runtime).propose_clip_themes({request: input.request, state: input.state});
  return {theme, digest: await consumePreparedDigestPlanV001(deps, input)};
}

async function consume(deps: DigestPlanConsumptionDependenciesV001, input: Input, write: boolean) {
  deps = structuredClone(deps);
  input = structuredClone(input);
  // 元の16実装・18保存物を検証する旧readerを最初に通す。完了印だけでは消費しない。
  const prepared = await readPreparedDigestPlanV001(deps.preparation, input);
  if (write) {
    const r = input.request;
    assert(r.status === 'running' && r.claimOwnerId?.trim() && r.claimedAt && r.claimUpdatedAt && !r.claimExpiredAt
      && (!r.claimExpiresAt || Date.parse(r.claimExpiresAt) > Date.now()), 'DIGEST_CONSUMPTION_NOT_CLAIMED');
  }
  const root = await realpath(deps.preparation.workspaceRoot);
  const load = (name: string) => import(pathToFileURL(path.resolve(root, 'evals/clip_composition', name)).href);
  const base = await load('run_candidate_discovery_digest_skill_e2e_v001.mts');
  const consumer = await load('presentation_base_media_build_v003.mjs');
  const {formal, sha, bind, same, fileSha} = base;
  const verifyBytes = async (b: ByteBinding) => {
    assert(b && Object.keys(b).length === 2 && typeof b.path === 'string'
      && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'DIGEST_CONSUMPTION_BYTE_BINDING_INVALID');
    const absolute = await safeFile(root, b.path);
    assert.equal(await fileSha(absolute), b.fileSha256, 'DIGEST_CONSUMPTION_SHA_MISMATCH');
    return absolute;
  };
  const readBytes = async (b: ByteBinding) => readFile(await verifyBytes(b));
  const preparationBytes = await readFile(await safeFile(root, prepared.bindingPath));
  const preparation = JSON.parse(preparationBytes.toString());
  const fromPreparation = async (name: string) => JSON.parse((await readBytes({
    path: preparation.artifacts[name].path, fileSha256: preparation.artifacts[name].fileSha256,
  })).toString());
  const selection = await fromPreparation('selection-adoption.json');
  const retention = await fromPreparation('retention-validation.json');
  assert(retention.status === 'resolved' && retention.segments.length > 0, 'DIGEST_CONSUMPTION_RETENTION_UNRESOLVED');
  const inspectionBytes = await readBytes(deps.sourceInspection);
  const inspection = JSON.parse(inspectionBytes.toString());
  assert(inspection.schemaVersion === 'new-material-source-inspection-v001', 'DIGEST_CONSUMPTION_INSPECTION_VERSION_INVALID');
  // 異なるpathのinspectionは同一bytesの独立copyだけに対応付ける。元動画側も実SHAを確認する。
  await verifyBytes(inspection.sourceVideoBinding);
  assert.equal(inspection.sourceVideoBinding.fileSha256, preparation.identity.sourceVideo.fileSha256,
    'DIGEST_CONSUMPTION_INSPECTION_SOURCE_MISMATCH');
  const inspectionBinding = {path: deps.sourceInspection.path, fileSha256: sha(inspectionBytes)};
  const preparationBinding = {path: prepared.bindingPath, fileSha256: sha(preparationBytes)};
  const artifactRoot = await realpath(deps.preparation.artifactRoot);
  const parent = path.join(artifactRoot, input.request.requestDraftId);
  assert.equal(await realpath(parent), parent, 'DIGEST_CONSUMPTION_OUTPUT_INVALID');
  const container = path.join(parent, 'digest-consumption');
  const directory = path.join(container, input.request.id);
  const outputRoot = relative(root, directory);
  const file = (name: string) => `${outputRoot}/${name}`;
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
    preparationBinding, sourceInspectionBinding: inspectionBinding,
    sourceByteEquivalence: {prepared: preparation.identity.sourceVideo, inspected: inspection.sourceVideoBinding},
    implementations, outputs: Object.fromEntries(NAMES.map(name => [name, {path: file(name), fileSha256: sha(formal(outputs[name]))}])),
    consumers: {manufacturingJob: {function: 'validatePresentationBaseMediaBuildJobV001', status: admittedJob.status},
      intervalClock: {function: 'validatePresentationBaseMediaSegmentPlanV002', status: clock.status}},
    humanQuality: 'pending', renderExecuted: false, backendCompletionRegistered: false};
  const recordPath = path.join(directory, 'binding.json');
  let existing: Json | undefined;
  try {existing = JSON.parse(await readFile(await safeFile(root, file('binding.json')), 'utf8'));}
  catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;}
  if (existing) {
    assert(same(existing, expected), 'DIGEST_CONSUMPTION_SAVED_BINDING_CHANGED');
    for (const name of NAMES) {
      const bytes = await readBytes(existing.outputs[name]);
      assert(same(JSON.parse(bytes.toString()), outputs[name]), 'DIGEST_CONSUMPTION_RECONSTRUCTION_CHANGED');
    }
  } else {
    assert(write, 'DIGEST_CONSUMPTION_SAVED_BINDING_MISSING');
    // 親のsymlinkを辿ってmkdirしない。一階層ずつ実pathを確認する。
    for (const dir of [container, directory]) {
      try {await mkdir(dir);} catch (e) {if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;}
      assert.equal(await realpath(dir), dir, 'DIGEST_CONSUMPTION_OUTPUT_INVALID');
    }
    for (const name of NAMES) {
      const bytes = formal(outputs[name]);
      try {assert.deepEqual(await readFile(await safeFile(root, file(name))), Buffer.from(bytes), 'DIGEST_CONSUMPTION_ORPHAN_CHANGED');}
      catch (e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; await writeFile(path.join(directory, name), bytes, {flag: 'wx'});}
    }
    await writeFile(recordPath, formal(expected), {flag: 'wx'});
  }
  assert.deepEqual(await readFile(await safeFile(root, preparationBinding.path)), preparationBytes,
    'DIGEST_CONSUMPTION_PREPARATION_CHANGED_DURING_READ');
  return {status: 'consumed' as const, bindingPath: relative(root, recordPath), reused: Boolean(existing),
    segmentCount: parts.length, outputFrameCount: clock.mappings.at(-1).outputEndFrame,
    consumers: expected.consumers};
}

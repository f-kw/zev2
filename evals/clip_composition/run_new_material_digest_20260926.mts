import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentRequest, Zev2State } from '@zev2/shared';
import { buildTranscriptArtifact, normalizeGpuSttResponse } from '../../runner/src/steps/transcript.js';
import { assertTranscriptArtifact } from '../../runner/src/workflow-artifact-validation.js';
import { loadRuntimeConfig, createRunnerEnvironmentFromConfig } from '../../backend/src/config/runtime-config.js';

const exec = promisify(execFile);
export const ROOT = path.resolve(import.meta.dirname, '../..');
export const PLAN = 'docs/reports/new-material-digest-20260926/plan.json';
export const ARTIFACTS = 'runtime/artifacts/digest-new-material-20260926-v001';
const absolute = (p: string) => path.join(ROOT, p);
const load = async (p: string) => JSON.parse(await readFile(absolute(p), 'utf8'));
async function save(p: string, value: unknown) {
  await mkdir(path.dirname(absolute(p)), { recursive: true });
  await writeFile(absolute(p), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}
export async function sha256File(p: string) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(absolute(p))) hash.update(bytes);
  return hash.digest('hex');
}

/** Run-specific wiring only: use the existing GPU job and transcript conversion. */
export async function runGpuTranscript(afterUploadFix = false) {
  const plan = await load(PLAN);
  assert.equal(plan.sourceUrl, 'https://www.youtube.com/watch?v=-2UUTkv9qvk');
  assert.equal(plan.runtimeConfig.stt.mode, 'local');
  assert(process.env.STT_BASE_URL?.trim(), 'Existing GPU endpoint must be supplied explicitly');
  if (afterUploadFix) {
    const stopped = await load(`${ARTIFACTS}/stt-send-interruption.json`);
    assert.equal(stopped.jobReceiptPresent, false);
    assert.equal(stopped.difference, 2 ** 32);
    assert.equal((await load(`${ARTIFACTS}/tests/upload-client-probe-after.json`)).status, 'passed');
    const receipt = await readFile(absolute(`${ARTIFACTS}/stt/gpu-stt-job.json`)).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    assert.equal(receipt, null, 'An existing job must be inspected before any new submission');
  }
  const attemptName = afterUploadFix ? 'stt-attempt-002' : 'stt';
  const configPath = `${ARTIFACTS}/${afterUploadFix ? 'runtime-config-after-upload-fix' : 'runtime-config'}.json`;
  await save(configPath, plan.runtimeConfig);
  process.env.ZEV2_RUNTIME_CONFIG_PATH = absolute(configPath);
  const config = await loadRuntimeConfig();
  const environment = createRunnerEnvironmentFromConfig(config);
  assert.equal(environment.ZEV2_STT_RUNTIME_MODE, 'local');
  const source = `${ARTIFACTS}/source/source-video.mp4`;
  const acquisition = await load(`${ARTIFACTS}/source/acquisition-execution.json`);
  assert.equal(acquisition.exitCode, 0);
  const sourceSha256 = await sha256File(source);
  const metadata = await load(`${ARTIFACTS}/source/youtube-metadata.json`);
  assert.equal(metadata.id, plan.youtubeVideoId);
  const { stdout } = await exec('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', absolute(source)]);
  const media = JSON.parse(stdout);
  if (afterUploadFix) assert.equal((await load(`${ARTIFACTS}/source/verified-source.json`)).sha256, sourceSha256);
  else await save(`${ARTIFACTS}/source/verified-source.json`, {
      sourceUrl: plan.sourceUrl, videoId: metadata.id, title: metadata.title,
      path: source, sha256: sourceSha256, acquisition, media
    });
  const startedAt = new Date().toISOString(), start = performance.now();
  await save(`${ARTIFACTS}/${attemptName}-start.json`, { startedAt, mode: config.stt.mode, sourceSha256,
    afterUploadFix, implementationSha256: await sha256File('runner/src/gpu-stt.ts') });
  const health = await fetch(new URL('/health', config.stt.localServerUrl));
  assert(health.ok);
  await save(`${ARTIFACTS}/${attemptName}-health.json`, await health.json());
  const request = { target: { sourceUri: absolute(source) } } as AgentRequest;
  const transcript = await buildTranscriptArtifact(request, {} as Zev2State, {
    sttServerUrl: config.stt.localServerUrl,
    sttServerTimeoutMs: Number.parseInt(process.env.ZEV2_STT_SERVER_TIMEOUT_MS ?? '1800000', 10),
    sttSamplePath: '', fixedTranscriptPath: '', useFixedTranscript: config.stt.mode === 'fixed',
    requestArtifactDir: () => absolute(`${ARTIFACTS}/${attemptName}`),
    resolveSourceVideoPath: () => absolute(source)
  });
  assertTranscriptArtifact(transcript);
  assert.equal(transcript.mode, 'zev-local-stt');
  assert.deepEqual(transcript.speechUnitGroups, transcript.segments.map(s => [s.id]));
  await save(`${ARTIFACTS}/transcript.json`, transcript);
  await save(`${ARTIFACTS}/stt-execution.json`, {
    startedAt, endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000,
    sourceSha256, attemptName, afterUploadFix, segmentCount: transcript.segmentCount, groupCount: transcript.speechUnitGroups.length,
    durationSec: transcript.durationSec,
    reversed: transcript.segments.filter(s => s.startMs > s.endMs).length,
    outsideAudio: transcript.segments.filter(s => s.startMs < 0 || s.endMs > transcript.durationSec * 1000).length,
    speakers: [...new Set(transcript.segments.map(s => s.speaker ?? 'unspecified'))]
  });
  return { transcript: `${ARTIFACTS}/transcript.json`, segmentCount: transcript.segmentCount };
}

/** Continue the already accepted asynchronous job after the client deadline.
 * This run-specific continuation has no submission endpoint or retry loop. */
export async function followAcceptedGpuJob() {
  const attempt = `${ARTIFACTS}/stt-attempt-002`;
  const executions = await Promise.all((await readdir(absolute(`${ARTIFACTS}/execution`)))
    .filter(name => name.startsWith('stt-after-upload-fix-')).map(name => load(`${ARTIFACTS}/execution/${name}`)));
  assert(executions.some(e => e.status === 'failed' && e.error.includes('待機時間を超えました')),
    'Follow only after the original client has ended at its deadline');
  const receipt = await load(`${attempt}/gpu-stt-job.json`), jobId = receipt.receipt.job.id;
  assert(/^[a-zA-Z0-9_-]+$/.test(jobId));
  assert.equal(receipt.receipt.statusUrl, `/jobs/${jobId}`);
  assert.equal(receipt.receipt.resultUrl, `/jobs/${jobId}/result`);
  const source = `${ARTIFACTS}/source/source-video.mp4`, sourceSha256 = await sha256File(source);
  assert.equal(sourceSha256, receipt.inputSha256);
  const originalStart = await load(`${ARTIFACTS}/stt-attempt-002-start.json`);
  const followStartedAt = new Date().toISOString();
  await save(`${attempt}/follow-start.json`, {jobId, sourceSha256, followStartedAt, resubmitted: false});
  const get = async (route: string) => {
    const response = await fetch(new URL(route, receipt.baseUrl));
    assert(response.ok, `Existing GPU job read failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    return {bytes, value: JSON.parse(bytes.toString('utf8'))};
  };
  while (true) {
    const {value: job} = await get(receipt.receipt.statusUrl);
    assert.equal(job.id, jobId); assert.equal(job.input.sha256, sourceSha256);
    await writeFile(absolute(`${attempt}/follow-status.json`), JSON.stringify(job, null, 2) + '\n');
    if (job.state === 'completed') break;
    assert(['queued', 'running'].includes(job.state), `Existing GPU job failed: ${JSON.stringify(job.error)}`);
    await delay(2000);
  }
  const {bytes, value} = await get(receipt.receipt.resultUrl);
  assert.equal(value.jobId, jobId); assert.equal(value.input.sha256, sourceSha256);
  assert(value.zevResult && !Array.isArray(value.zevResult) && typeof value.zevResult === 'object');
  assert(Number.isFinite(value.audioDurationSeconds) && value.audioDurationSeconds > 0);
  const rawPath = absolute(`${attempt}/gpu-stt-${jobId}.response.json`);
  try {await writeFile(rawPath, bytes, {flag: 'wx'});}
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    assert((await readFile(rawPath)).equals(bytes), 'Saved raw GPU result changed');
  }
  const transcript = normalizeGpuSttResponse({...value.zevResult, durationSec: value.audioDurationSeconds},
    {target: {sourceUri: absolute(source)}} as AgentRequest);
  assertTranscriptArtifact(transcript);
  assert.deepEqual(transcript.speechUnitGroups, transcript.segments.map(s => [s.id]));
  await save(`${ARTIFACTS}/transcript.json`, transcript);
  await save(`${ARTIFACTS}/stt-execution.json`, {startedAt: originalStart.startedAt, followStartedAt,
    endedAt: new Date().toISOString(), elapsedSeconds: (Date.now() - Date.parse(originalStart.startedAt)) / 1000,
    attemptName: 'stt-attempt-002', completionMode: 'follow-existing-job-after-client-deadline', resubmitted: false,
    sourceSha256, jobId, segmentCount: transcript.segmentCount, groupCount: transcript.speechUnitGroups.length,
    durationSec: transcript.durationSec, reversed: transcript.segments.filter(s => s.startMs > s.endMs).length,
    outsideAudio: transcript.segments.filter(s => s.startMs < 0 || s.endMs > transcript.durationSec * 1000).length,
    speakers: [...new Set(transcript.segments.map(s => s.speaker ?? 'unspecified'))]});
  return {transcript: `${ARTIFACTS}/transcript.json`, jobId, segmentCount: transcript.segmentCount, resubmitted: false};
}

// The old runners bind their historical media and authorization. This adapter
// supplies this run's bindings while preserving the existing Skill validators.
export async function prepareDiscovery() {
  const { bind, publish, readJson, fileSha } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001: buildUtterances } =
    await import('../../runner/src/distant-connection-common-utterance-artifact-v001.js');
  const { buildUnseenDiscoveryRequestV001 } = await import('./unseen_material_thin_plan_v001.mts');
  const { STRUCTURE_CONDITIONS } = await import('./run_thin_plan_candidate_selection_v0.mts');
  const requested = await load(PLAN), transcript = await load(`${ARTIFACTS}/transcript.json`);
  const source = `${ARTIFACTS}/source/source-video.mp4`;
  assert.equal(transcript.sourceUri, absolute(source));
  const template = 'evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001';
  const jsonBinding = async (p: string) => {
    const binding = bind(p, await readJson(p));
    assert.equal(binding.fileSha256, await fileSha(absolute(p)));
    return binding;
  };
  const byteBinding = async (p: string) => ({ path: p, fileSha256: await sha256File(p) });
  const authorization = await publish(`${ARTIFACTS}/received-instruction.json`, {
    schemaVersion: 'new-material-digest-received-instruction-v001',
    instruction: 'Codex2｜5. 新素材Digest生成', sourceUrl: requested.sourceUrl,
    requestFile: await byteBinding(PLAN), ...requested.authorization
  });
  const utterances = await buildUtterances({ workspaceRoot: ROOT, sourceTranscriptPath: `${ARTIFACTS}/transcript.json` });
  const utteranceBinding = await publish(`${ARTIFACTS}/utterances.json`, utterances);
  const thinPlan = { schemaVersion: 'production-intent-plan-v0', productionIntent: requested.productionRequest };
  const thinPlanBinding = await publish(`${ARTIFACTS}/production-intent.json`, thinPlan);
  const plan = {
    schemaVersion: 'new-material-digest-execution-plan-v001', planId: requested.planId,
    stage: 'candidate-discovery', authorization, thinPlanBinding,
    request: { purpose: requested.productionRequest, sourceId: requested.sourceId,
      sourceVideo: await byteBinding(source), transcript: await byteBinding(`${ARTIFACTS}/transcript.json`),
      utterances: utteranceBinding, candidateSet: null,
      rendererTemplate: await jsonBinding(`${template}/renderer-template-v002.json`),
      captionStyleTemplate: await jsonBinding(`${template}/source-package-v001.json`) },
    structureConditions: [...STRUCTURE_CONDITIONS],
    implementationBindings: await Promise.all([
      'evals/clip_composition/run_new_material_digest_20260926.mts',
      'runner/src/skills/candidate-discovery-v001.ts', 'runner/src/skills/candidate-selection-v001.ts',
      'runner/src/skills/candidate-internal-retention-v001.ts', 'runner/src/skills/caption-display-boundaries-v001.ts',
      'evals/clip_composition/unseen_material_thin_plan_v001.mts',
      'evals/clip_composition/candidate_selection_validation_v001.mts',
      'evals/clip_composition/candidate_internal_retention_validation_v001.mts'
    ].map(byteBinding)), outputRoot: ARTIFACTS
  };
  const planBinding = await publish(`${ARTIFACTS}/discovery-plan.json`, plan);
  const request = buildUnseenDiscoveryRequestV001({ plan, planBinding, utterances, thinPlan });
  await publish(`${ARTIFACTS}/candidate-request.json`, request);
  return { utteranceCount: utterances.utteranceCount, request: `${ARTIFACTS}/candidate-request.json` };
}

export async function context(stage: 'discovery' | 'selection') {
  const { bind, readBound, same } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001: validateUtterances } =
    await import('../../runner/src/distant-connection-common-utterance-artifact-v001.js');
  const requested = await load(PLAN), planPath = `${ARTIFACTS}/${stage}-plan.json`, plan = await load(planPath);
  assert.equal(await sha256File(planPath), bind(planPath, plan).fileSha256, 'Execution plan bytes changed');
  assert.equal(plan.planId, requested.planId); assert.equal(plan.outputRoot, ARTIFACTS);
  assert.equal(plan.request.purpose, requested.productionRequest); assert.equal(plan.request.sourceId, requested.sourceId);
  const authorization = await readBound(plan.authorization);
  assert.equal(authorization.requestFile.fileSha256, await sha256File(PLAN));
  for (const b of [plan.request.sourceVideo, plan.request.transcript, ...plan.implementationBindings]) {
    assert.equal(await sha256File(b.path), b.fileSha256, `Bound input changed: ${b.path}`);
  }
  const transcript = await load(plan.request.transcript.path), utterances = await readBound(plan.request.utterances);
  validateUtterances(utterances, { sourceTranscriptPath: plan.request.transcript.path,
    sourceTranscriptBytes: await readFile(absolute(plan.request.transcript.path)) });
  const thinPlan = await readBound(plan.thinPlanBinding);
  assert(same(thinPlan, { schemaVersion: 'production-intent-plan-v0', productionIntent: requested.productionRequest }));
  return { plan, planBinding: bind(planPath, plan), authorization, transcript, utterances, thinPlan,
    rendererTemplate: await readBound(plan.request.rendererTemplate),
    captionStyleTemplate: await readBound(plan.request.captionStyleTemplate),
    ...(stage === 'selection' ? { candidateSet: await readBound(plan.request.candidateSet) } : {}) };
}

export async function acceptDiscovery(responsePath: string) {
  const { publish } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { runCandidateDiscoveryV001 } = await import('../../runner/src/skills/candidate-discovery-v001.js');
  const { validateUnseenDiscoveryV001, projectUnseenSelectionPlanV001 } = await import('./unseen_material_thin_plan_v001.mts');
  const { buildSelectionRequestV001 } = await import('./candidate_selection_validation_v001.mts');
  const c = await context('discovery'), request = await load(`${ARTIFACTS}/candidate-request.json`), response = await load(responsePath);
  const result = await runCandidateDiscoveryV001(request.input, async () => response.answer);
  const { candidateSet, validation } = validateUnseenDiscoveryV001(c, request, response, result);
  for (const [name, value] of Object.entries({ 'candidate-response': response, 'candidate-result': result,
    'candidate-set': candidateSet, 'discovery-validation': validation })) await publish(`${ARTIFACTS}/${name}.json`, value);
  await publish(`${ARTIFACTS}/selection-plan.json`, projectUnseenSelectionPlanV001(c, candidateSet));
  const selection = await context('selection');
  await publish(`${ARTIFACTS}/selection-request.json`, buildSelectionRequestV001(selection));
  return { candidateCount: candidateSet.candidates.length, request: `${ARTIFACTS}/selection-request.json` };
}

function buildRetentionInput(c: any, adoption: any) {
  const utterances = new Map(c.utterances.utterances.map((u: any) => [u.utteranceId, u]));
  const atoms = new Map(c.transcript.segments.map((s: any) => [s.id, s]));
  const input = { schemaVersion: 'candidate-internal-retention-input-v001',
    taskDescription: '採用済み候補の意味・フリ・展開・反応・結論を保つために残す内容を判断する。尺や件数を目標にしない。本文全体の保持・削除を既存の断片IDで明示する。',
    candidates: adoption.adoptedCandidates.map((p: any) => ({ candidateId: p.candidateId,
      title: p.title, highlightReason: p.judgment.reason,
      utterances: p.includedUtteranceIds.map((id: string) => ({ utteranceId: id,
        atoms: (utterances.get(id) as any).sourceSegmentIds.map((id: number) => ({ sourceSegmentId: id, text: (atoms.get(id) as any).text })) })) })) };
  return input;
}

export async function acceptSelection(responsePath: string) {
  const { bind, publish } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { runCandidateSelectionV001 } = await import('../../runner/src/skills/candidate-selection-v001.js');
  const { selectUnseenCandidatesV001 } = await import('./unseen_material_thin_plan_v001.mts');
  const { assertInternalRetentionInputV001 } = await import('../../runner/src/skills/candidate-internal-retention-v001.js');
  const c = await context('selection'), request = await load(`${ARTIFACTS}/selection-request.json`), response = await load(responsePath);
  const result = await runCandidateSelectionV001(request.input, async () => response.answer);
  const selected = selectUnseenCandidatesV001(c, request, response, result);
  assert(selected.adoption.adoptedCandidates.length >= 2, 'Existing Digest requires multiple valid highlights');
  for (const [name, value] of Object.entries({ 'selection-response': response, 'selection-result': result,
    'selection-validation': selected.validation, 'selection-adoption': selected.adoption })) await publish(`${ARTIFACTS}/${name}.json`, value);
  const input = buildRetentionInput(c, selected.adoption);
  assertInternalRetentionInputV001(input);
  await publish(`${ARTIFACTS}/retention-request.json`, { schemaVersion: 'candidate-internal-retention-request-v001',
    planBinding: c.planBinding, selectionAdoptionBinding: bind(`${ARTIFACTS}/selection-adoption.json`, selected.adoption), input });
  return { adopted: selected.adoption.adoptedCandidates.map((p: any) => p.candidateId), request: `${ARTIFACTS}/retention-request.json` };
}

export async function acceptRetention(responsePath: string) {
  const { bind, publish } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { runInternalRetentionV001 } = await import('../../runner/src/skills/candidate-internal-retention-v001.js');
  const { validateInternalRetentionProvenanceV001, resolveInternalRetentionV001 } =
    await import('./candidate_internal_retention_validation_v001.mts');
  const { validateSelectionV001, promoteSelectionV001 } = await import('./candidate_selection_validation_v001.mts');
  const c = await context('selection');
  const selected = promoteSelectionV001(validateSelectionV001(c,
    await load(`${ARTIFACTS}/selection-request.json`), await load(`${ARTIFACTS}/selection-response.json`),
    await load(`${ARTIFACTS}/selection-result.json`))).adoption;
  const request = await load(`${ARTIFACTS}/retention-request.json`), response = await load(responsePath);
  const result = await runInternalRetentionV001(request.input, async () => response.answer);
  assert.deepEqual(request.planBinding, c.planBinding);
  assert.deepEqual(request.selectionAdoptionBinding, bind(`${ARTIFACTS}/selection-adoption.json`, selected));
  const token = validateInternalRetentionProvenanceV001(request, response, result, buildRetentionInput(c, selected));
  // Interior boundaries use the actual GPU-aligned source fragment clock.
  // Zero-length fragments have no cut observation and remain unresolved.
  const observed = { transcriptBinding: c.plan.request.transcript,
    units: c.transcript.segments.filter((s: any) => s.endMs > s.startMs).map((s: any) => ({
      unitId: `gpu-fragment-${s.id}`, startMs: s.startMs, endMs: s.endMs,
      startBoundary: { after: s.id }, endBoundary: { before: s.id },
      startTimeRole: 'gpu-aligned-source-fragment', timeOrigin: 'full-source-gpu-stt' })) };
  const resolved = resolveInternalRetentionV001(token, selected.adoptedCandidates, [observed]);
  await publish(`${ARTIFACTS}/retention-response.json`, response);
  await publish(`${ARTIFACTS}/retention-result.json`, result);
  await publish(`${ARTIFACTS}/retention-validation.json`, {
    schemaVersion: 'new-material-retention-validation-v001', ...resolved,
    requestBinding: bind(`${ARTIFACTS}/retention-request.json`, request), transcriptBinding: c.plan.request.transcript
  });
  assert.equal(resolved.status, 'resolved', 'Retention needs an actual aligned cut boundary');
  const parts = resolved.segments!.map((s: any, i: number) => {
    const parent = selected.adoptedCandidates.find((p: any) => p.candidateId === s.candidateId);
    return { ...parent, sourceSegmentIds: s.sourceSegmentIds,
      sourceInterval: { sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs },
      timelineSegmentId: s.segmentId, outputOrdinal: i + 1, cutBoundaryEvidence: s.cutBoundaryEvidence };
  });
  const adoption = { ...selected, schemaVersion: 'new-material-digest-execution-adoption-v001',
    selectionAdoptionBinding: bind(`${ARTIFACTS}/selection-adoption.json`, selected),
    retentionResultBinding: bind(`${ARTIFACTS}/retention-result.json`, result), selectedCandidates: parts };
  const adoptionBinding = await publish(`${ARTIFACTS}/machine-adoption.json`, adoption);
  const editPlan = { schemaVersion: 'new-material-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: adoptionBinding,
    sourceVideoBinding: c.plan.request.sourceVideo,
    segments: parts.map((p: any) => ({ candidateId: p.candidateId, segmentId: p.timelineSegmentId,
      ...p.sourceInterval, sourceSegmentIds: p.sourceSegmentIds })),
    unresolvedEdits: [], quality: 'human-review-pending' };
  await publish(`${ARTIFACTS}/edit-plan.json`, editPlan);
  return { segments: parts.length, humanQualityAdjustment: false };
}

export async function buildBaseAndDisplayRequests() {
  const { bind, publish, pass } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { buildAdoptedBaseMediaV001, buildAdoptedCaptionInputsV001 } = await import('./adopted_media_manufacturing_v001.mts');
  const { validatePresentationBaseMediaBuildJobV001 } = await import('./presentation_base_media_build_v003.mjs');
  const c = await context('selection'), adoption = await load(`${ARTIFACTS}/machine-adoption.json`), editPlan = await load(`${ARTIFACTS}/edit-plan.json`);
  const ad = bind(`${ARTIFACTS}/machine-adoption.json`, adoption), ep = bind(`${ARTIFACTS}/edit-plan.json`, editPlan);
  const job = { schemaVersion: 'presentation-base-media-build-job-v001', jobId: `${c.plan.planId}-base`,
    assemblyDecision: { path: ad.path, fileSha256: ad.fileSha256 },
    sourceArtifact: { sourceProvenance: 'user-authorized-youtube-full-source', sourceRef: c.plan.request.sourceId,
      sourceUri: c.transcript.sourceUri, ...c.plan.request.sourceVideo }, outputDirectory: `${ARTIFACTS}/base-media` };
  pass(validatePresentationBaseMediaBuildJobV001(job), 'NEW_MATERIAL_MANUFACTURING_VALUES_INVALID');
  const jb = await publish(`${ARTIFACTS}/manufacturing-values.json`, job);
  const invocation = await publish(`${ARTIFACTS}/core-invocation.json`, {
    schemaVersion: 'new-material-digest-core-invocation-v001', authorizationBinding: c.plan.authorization,
    planBinding: c.planBinding, machineAdoptionBinding: ad, editPlanBinding: ep, manufacturingValuesBinding: jb,
    admission: 'existing-selection-and-retention-validators', individualCandidateHumanApproval: 'not-performed'
  });
  const base = await buildAdoptedBaseMediaV001(c, adoption, editPlan, job, jb, invocation,
    { inspection: 'new-material-source-inspection-v001', receipt: 'new-material-base-validation-v001' });
  await publish(`${ARTIFACTS}/base-media-bindings.json`, { schemaVersion: 'new-material-base-bindings-v001', ...base });
  const captions = buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates, ad, base,
    { meaning: 'new-material-presentation-meaning-input-v001', displayRequest: 'new-material-display-request-v001', sourceRole: 'new-material' });
  for (const [i, request] of captions.requests.entries()) await publish(`${ARTIFACTS}/display-${i + 1}-request.json`, request);
  return { displayRequests: captions.requests.length, baseMedia: base.baseMedia };
}

export async function acceptDisplay(responsePath: string) {
  const { bind, publish, same, readBound, pass } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { buildAdoptedCaptionInputsV001, validateDisplayForAdoptionV001, readValidatedDisplayTracesV001,
    assembleAdoptedCaptionCoreV001, CORE_FILES } = await import('./adopted_media_manufacturing_v001.mts');
  const { runCaptionDisplayBoundariesV001 } = await import('../../runner/src/skills/caption-display-boundaries-v001.js');
  const { buildPresentationRendererLineLayoutV002 } = await import('./presentation_renderer_line_layout_rule_v002.mjs');
  const { buildPresentationInstructionCommonCorePlanV001 } = await import('./run_presentation_instruction_renderer_job_v002.ts');
  const c = await context('selection'), adoption = await load(`${ARTIFACTS}/machine-adoption.json`);
  const { schemaVersion, ...base } = await load(`${ARTIFACTS}/base-media-bindings.json`);
  const input = buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates, bind(`${ARTIFACTS}/machine-adoption.json`, adoption), base,
    { meaning: 'new-material-presentation-meaning-input-v001', displayRequest: 'new-material-display-request-v001', sourceRole: 'new-material' });
  const responses = await load(responsePath);
  assert.equal(responses.responses.length, input.requests.length);
  const tokens = [];
  for (const [i, request] of input.requests.entries()) {
    assert(same(request, await load(`${ARTIFACTS}/display-${i + 1}-request.json`)));
    const response = responses.responses[i];
    const result = await runCaptionDisplayBoundariesV001(request.input, async () => response.answer);
    tokens.push(validateDisplayForAdoptionV001(request, response, result, 'new-material-display-response-v001'));
    await publish(`${ARTIFACTS}/display-${i + 1}-response.json`, response);
    await publish(`${ARTIFACTS}/display-${i + 1}-result.json`, result);
  }
  const traces = readValidatedDisplayTracesV001(input.requests, tokens);
  const captionAdoption = { schemaVersion: 'new-material-caption-adoption-v001',
    machineAdoptionBinding: bind(`${ARTIFACTS}/machine-adoption.json`, adoption),
    meaningInputBinding: bind(`${ARTIFACTS}/meaning-input.json`, input.meaning),
    displayJudgments: traces.map((v: any, i: number) => ({ candidateId: v.request.candidateId,
      request: bind(`${ARTIFACTS}/display-${i + 1}-request.json`, v.request),
      response: bind(`${ARTIFACTS}/display-${i + 1}-response.json`, v.response),
      result: bind(`${ARTIFACTS}/display-${i + 1}-result.json`, v.result) })),
    composition: 'validated-display-cues-in-adopted-source-order', quality: 'not-evaluated' };
  const artifacts: any = await assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, traces);
  for (const [key, name] of Object.entries(CORE_FILES)) await publish(`${ARTIFACTS}/${name}`, artifacts[key]);
  const style = await readBound(c.rendererTemplate.registryBindings.styleProfileRegistry);
  const trust = await readBound(c.rendererTemplate.registryBindings.rendererTrust);
  const layout = pass(buildPresentationRendererLineLayoutV002({ layoutId: `${c.plan.planId}-layout`,
    instructionArtifactBinding: bind(`${ARTIFACTS}/instruction.json`, artifacts.instruction), instructionArtifact: artifacts.instruction,
    meaningPackage: artifacts.meaning, lineEndProjection: artifacts.lineEndProjection, lineEndSourcePackage: artifacts.sourcePackage,
    maxLogicalWidth: artifacts.sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine,
    maxLines: artifacts.sourcePackage.promptInput.styleLimits.maxLinesPerCue,
    characterWidthRule: trust.layoutRules.characterWidthRule, lineLayoutRules: artifacts.rendererJob.executionInputs.lineLayoutRules }), 'NEW_MATERIAL_LAYOUT_INVALID').layout;
  await publish(`${ARTIFACTS}/line-layout.json`, layout);
  const common = pass(buildPresentationInstructionCommonCorePlanV001({ job: artifacts.rendererJob,
    visualStateId: artifacts.rendererJob.executionInputs.visualStateId, instructionArtifact: artifacts.instruction,
    lineLayout: layout, styleProfileRegistry: style, rendererTrust: trust }), 'NEW_MATERIAL_NORMAL_PLAN_INVALID');
  await publish(`${ARTIFACTS}/normal-plan.json`, common.plan);
  return { captionCount: common.plan.elements.length, normalPlan: `${ARTIFACTS}/normal-plan.json` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [stage, input] = process.argv.slice(2);
  const stages: Record<string, () => Promise<unknown>> = { stt: runGpuTranscript,
    'stt-after-upload-fix': () => runGpuTranscript(true), 'follow-stt': followAcceptedGpuJob, prepare: prepareDiscovery,
    discovery: () => acceptDiscovery(input), selection: () => acceptSelection(input),
    retention: () => acceptRetention(input), base: buildBaseAndDisplayRequests, display: () => acceptDisplay(input) };
  assert(stages[stage], 'Unknown execution stage');
  const startedAt = new Date().toISOString(), start = performance.now();
  const recordPath = `${ARTIFACTS}/execution/${stage}-${startedAt.replaceAll(':', '-')}.json`;
  try {
    const result = await stages[stage]();
    await save(recordPath, { stage, startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - start) / 1000, status: 'completed', result });
    console.log(JSON.stringify(result));
  } catch (error) {
    await save(recordPath, { stage, startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - start) / 1000, status: 'failed', error: String(error) });
    throw error;
  }
}

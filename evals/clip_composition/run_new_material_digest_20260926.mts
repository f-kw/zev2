import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentRequest } from '@zev2/shared';
import { normalizeGpuSttResponse } from '../../runner/src/steps/transcript.js';
import { resumeGpuSttJob, transcribeWithGpuStt, GpuSttClientInterruptedError } from '../../runner/src/gpu-stt.js';
import { assertTranscriptArtifact } from '../../runner/src/workflow-artifact-validation.js';
import { loadRuntimeConfig, createRunnerEnvironmentFromConfig } from '../../backend/src/config/runtime-config.js';

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

const STT_ATTEMPT = `${ARTIFACTS}/stt-attempt-003-no-diarization`;
const OLD_JOB_ID = 'b50a498c86264de58a7c8c69b7be6ab3';

/** This run explicitly opts out of diarization; no server default is changed. */
export async function runGpuTranscript() {
  const plan = await load(PLAN), source = `${ARTIFACTS}/source/source-video.mp4`;
  assert.equal(plan.sourceUrl, 'https://www.youtube.com/watch?v=-2UUTkv9qvk');
  assert.equal(plan.runtimeConfig.stt.mode, 'local');
  assert.equal(plan.sttRun.enableDiarization, false);
  assert.equal(plan.sttRun.attemptDirectory, STT_ATTEMPT);
  assert(process.env.STT_BASE_URL?.trim(), 'Existing GPU endpoint must be supplied explicitly');
  await mkdir(absolute(STT_ATTEMPT), {recursive: true});
  const configPath = `${STT_ATTEMPT}/runtime-config.json`;
  const existingConfig = await readFile(absolute(configPath), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existingConfig) assert.deepEqual(JSON.parse(existingConfig), plan.runtimeConfig);
  else await save(configPath, plan.runtimeConfig);
  process.env.ZEV2_RUNTIME_CONFIG_PATH = absolute(configPath);
  const config = await loadRuntimeConfig();
  assert.equal(createRunnerEnvironmentFromConfig(config).ZEV2_STT_RUNTIME_MODE, 'local');
  assert.equal(new URL(config.stt.localServerUrl).origin, new URL(process.env.STT_BASE_URL!).origin);
  const receiptPath = absolute(`${STT_ATTEMPT}/gpu-stt-job.json`);
  const previous = await readFile(receiptPath, 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const verified = await load(`${ARTIFACTS}/source/verified-source.json`);
  assert.equal(await sha256File(source), verified.sha256);
  const {size: inputBytes} = await stat(absolute(source));
  let registeredId: string | undefined = previous?.receipt.job.id;
  if (previous) {
    assert.notEqual(registeredId, OLD_JOB_ID);
    assert.equal(previous.enableDiarization, false);
    assert.equal(previous.receipt.job.pipeline.settings.enableDiarization, false);
  } else {
    // A marker survives an uncertain upload: restarting must not blindly POST again.
    const marker = await readFile(absolute(`${STT_ATTEMPT}/submission-start.json`)).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    assert.equal(marker, null, 'Submission was already attempted; inspect its evidence instead of resubmitting');
    const api = await fetch(new URL('/openapi.json', process.env.STT_BASE_URL), {signal: AbortSignal.timeout(30000)});
    assert(api.ok);
    const specification = await api.json();
    const bodyRef = specification.paths['/jobs'].post.requestBody.content['multipart/form-data'].schema.$ref;
    const body = specification.components.schemas[bodyRef.split('/').at(-1)];
    const option = body.properties.enableDiarization;
    assert(option && (option.type === 'boolean' || option.anyOf?.some((v: any) => v.type === 'boolean')),
      'GPU API does not yet advertise the optional enableDiarization field');
    await save(`${STT_ATTEMPT}/submission-openapi.json`, specification);
    await save(`${STT_ATTEMPT}/submission-start.json`, {startedAt: new Date().toISOString(),
      source, inputSha256: verified.sha256, inputBytes, enableDiarization: false,
      excludedJobId: OLD_JOB_ID, implementationSha256: await sha256File('runner/src/gpu-stt.ts')});
    await writeFile(absolute(`${STT_ATTEMPT}/gpu-stt-client-at-submission.ts`),
      await readFile(absolute('runner/src/gpu-stt.ts')), {flag: 'wx'});
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const target = new URL(String(url)), method = options?.method ?? 'GET';
    assert.equal(target.origin, new URL(process.env.STT_BASE_URL!).origin);
    assert(target.pathname === '/health' && method === 'GET'
      || target.pathname === '/jobs' && method === 'POST' && !registeredId
      || registeredId && method === 'GET' && ['/jobs/' + registeredId, '/jobs/' + registeredId + '/result'].includes(target.pathname));
    const response = await realFetch(url, options);
    await appendFile(absolute(`${STT_ATTEMPT}/http-trace.ndjson`),
      JSON.stringify({observedAt: new Date().toISOString(), method, route: target.pathname, status: response.status}) + '\n');
    if (method === 'POST' && response.ok) {
      const receipt = await response.clone().json(), job = receipt.job;
      await save(`${STT_ATTEMPT}/registration-response.json`, receipt);
      assert.equal(job.input.sha256, verified.sha256);
      assert.equal(job.input.bytes, inputBytes);
      assert.equal(job.pipeline.settings.enableDiarization, false);
      assert.equal(job.pipeline.settings.model, 'large-v3');
      assert.equal(job.pipeline.settings.alignDevice, 'cpu');
      assert.equal(typeof job.id, 'string'); assert(job.id.length > 0);
      assert.notEqual(job.id, OLD_JOB_ID);
      registeredId = job.id;
    }
    return response;
  };
  try {
    for (;;) {
      try {
        await transcribeWithGpuStt({baseUrl: process.env.STT_BASE_URL!, timeoutMs: 1800000,
          pollingTimeoutMs: 1800000, mediaPath: absolute(source), sourceUri: absolute(source),
          language: 'ja', artifactDir: absolute(STT_ATTEMPT), enableDiarization: false});
        break;
      } catch (error) {
        if (!(error instanceof GpuSttClientInterruptedError) || error.reason !== 'polling-timeout') throw error;
        const receipt = await load(`${STT_ATTEMPT}/gpu-stt-job.json`);
        assert.equal(receipt.receipt.job.id, registeredId); assert.notEqual(registeredId, OLD_JOB_ID);
        console.log(JSON.stringify({observedAt: new Date().toISOString(), clientInterrupted: true,
          jobId: registeredId, action: 'resume-same-saved-job', resubmitted: false}));
      }
    }
    return await resumeAcceptedGpuJob();
  } finally {globalThis.fetch = realFetch;}
}

/** Resume only the new no-diarization attempt through the GET-only path. */
export async function resumeAcceptedGpuJob() {
  const plan = await load(PLAN);
  assert.equal(plan.runtimeConfig.stt.mode, 'local');
  assert.equal(plan.sttRun.enableDiarization, false);
  const attempt = STT_ATTEMPT, source = `${ARTIFACTS}/source/source-video.mp4`;
  const receipt = await load(`${attempt}/gpu-stt-job.json`);
  assert.notEqual(receipt.receipt.job.id, OLD_JOB_ID);
  assert.equal(receipt.enableDiarization, false);
  assert.equal(receipt.receipt.job.pipeline.settings.enableDiarization, false);
  const observation = await resumeGpuSttJob({artifactDir: absolute(attempt), mediaPath: absolute(source),
    sourceUri: absolute(source), enableDiarization: false, timeoutMs: Number.parseInt(process.env.ZEV2_STT_SERVER_TIMEOUT_MS ?? '1800000', 10)});
  const {result, ...metadata} = observation.state === 'completed' ? observation : {...observation, result: undefined};
  await save(`${attempt}/resume-observation-${observation.observedAt.replaceAll(':', '-')}.json`,
    {...metadata, resubmitted: false, implementationSha256: await sha256File('runner/src/gpu-stt.ts')});
  if (observation.state !== 'completed') return {...metadata, resubmitted: false};
  const existing = await readFile(absolute(`${ARTIFACTS}/transcript.json`), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const converted = normalizeGpuSttResponse(result, {target: {sourceUri: absolute(source)}} as AgentRequest);
  assertTranscriptArtifact(converted);
  assert.deepEqual(converted.speechUnitGroups, converted.segments.map(s => [s.id]));
  if (existing) {
    const saved = JSON.parse(existing);
    assert.deepEqual({...converted, generatedAt: saved.generatedAt}, saved, 'Saved transcript changed');
  } else await save(`${ARTIFACTS}/transcript.json`, converted);
  const priorExecution = await readFile(absolute(`${ARTIFACTS}/stt-execution.json`), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!priorExecution) {
    const originalStart = await load(`${STT_ATTEMPT}/submission-start.json`);
    await save(`${ARTIFACTS}/stt-execution.json`, {startedAt: originalStart.startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: (Date.now() - Date.parse(originalStart.startedAt)) / 1000,
      attemptName: 'stt-attempt-003-no-diarization', enableDiarization: false, completionMode: 'production-resume-existing-job', resubmitted: false,
      sourceSha256: observation.inputSha256, jobId: observation.jobId,
      segmentCount: converted.segmentCount, groupCount: converted.speechUnitGroups.length,
      durationSec: converted.durationSec, reversed: converted.segments.filter(s => s.startMs > s.endMs).length,
      outsideAudio: converted.segments.filter(s => s.startMs < 0 || s.endMs > converted.durationSec * 1000).length,
      speakers: [...new Set(converted.segments.map(s => s.speaker ?? 'unspecified'))]});
  }
  return {...metadata, transcript: `${ARTIFACTS}/transcript.json`, segmentCount: converted.segmentCount, resubmitted: false};
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
  const stages: Record<string, () => Promise<unknown>> = { 'stt-no-diarization': runGpuTranscript,
    'resume-stt': resumeAcceptedGpuJob, prepare: prepareDiscovery,
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

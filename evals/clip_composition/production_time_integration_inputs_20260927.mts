/** Read-only admission of the saved first draft for 14.7. No Skill/provider execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bind, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateUnseenDiscoveryV001, selectUnseenCandidatesV001} from './unseen_material_thin_plan_v001.mts';
import {validateInternalRetentionProvenanceV001, resolveInternalRetentionV001}
  from './candidate_internal_retention_validation_v001.mts';
import {validateDisplayForAdoptionV001, readValidatedDisplayTracesV001} from './adopted_media_manufacturing_v001.mts';
import {normalizeGpuSttResponse} from '../../runner/src/steps/transcript.js';
import {assertTranscriptArtifact} from '../../runner/src/workflow-artifact-validation.js';
import {validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001}
  from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  assertOrchestrationDrawingViewMatchesStateV001, exportOrchestrationDrawingViewEvidenceV001}
  from './presentation_orchestration_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SAVED = 'runtime/artifacts/digest-new-material-20260926-v001';
const REPORT = 'docs/reports/new-material-digest-20260926';
const PREVIOUS = 'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP';
const SOURCE_SHA = '504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4';
const ORIGINAL_SHA = '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a';
const JOB = '3c0d89617715475eb78f798645521933';
type Ref = {path: string; fileSha256: string; bytes: number};

/** Every call rereads current bytes. The per-call cache never survives a run. */
export async function verifyFixedInputs() {
  const refs = new Map<string, Ref>(), jsonCache = new Map<string, Json>();
  const absolute = (file: string) => path.resolve(ROOT, file);
  async function reference(file: string, expected?: string): Promise<Ref> {
    const full = absolute(file);
    let ref = refs.get(full);
    if (!ref) {
      const before = await lstat(full);
      assert(before.isFile() && !before.isSymbolicLink(), `Expected regular saved input: ${file}`);
      const hash = createHash('sha256');
      for await (const bytes of createReadStream(full)) hash.update(bytes);
      const after = await lstat(full);
      assert.equal(after.size, before.size, `Input changed while reading: ${file}`);
      assert.equal(after.mtimeMs, before.mtimeMs, `Input changed while reading: ${file}`);
      assert.equal(after.ino, before.ino, `Input replaced while reading: ${file}`);
      ref = {path: full, fileSha256: hash.digest('hex'), bytes: before.size};
      refs.set(full, ref);
    }
    if (expected !== undefined) assert.equal(ref.fileSha256, expected, `Saved binding changed: ${file}`);
    return ref;
  }
  async function load(file: string): Promise<Json> {
    const full = absolute(file);
    let value = jsonCache.get(full);
    if (!value) {
      const ref = await reference(full), bytes = await readFile(full);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.fileSha256, `Input changed before parsing: ${file}`);
      value = JSON.parse(bytes.toString('utf8'));
      jsonCache.set(full, value!);
    }
    return value!;
  }
  async function bound(binding: Json) {
    await reference(binding.path, binding.fileSha256);
    const value = await load(binding.path);
    assert(same(bind(binding.path, value), binding), `Saved JSON binding changed: ${binding.path}`);
    return value;
  }
  async function verifyReferences(value: unknown): Promise<void> {
    if (!value || typeof value !== 'object') return;
    const object = value as Json;
    if (typeof object.path === 'string' && typeof object.fileSha256 === 'string')
      await reference(object.path, object.fileSha256);
    for (const child of Object.values(object)) await verifyReferences(child);
  }
  async function equalSaved(file: string, value: unknown) {
    assert(same(await load(file), value), `Current validator differs from saved result: ${file}`);
  }

  const sourceRef = await reference(`${SAVED}/source/source-video.mp4`, SOURCE_SHA);
  assert.equal(sourceRef.bytes, 4803412827);
  const verifiedSource = await load(`${SAVED}/source/verified-source.json`);
  assert.equal(absolute(verifiedSource.path), sourceRef.path);
  assert.equal(verifiedSource.sha256, sourceRef.fileSha256);
  const attempt = `${SAVED}/stt-attempt-003-no-diarization`;
  const receipt = await load(`${attempt}/gpu-stt-job.json`), status = await load(`${attempt}/gpu-stt-status.json`);
  const raw = await load(`${attempt}/gpu-stt-${JOB}.response.json`);
  assert.equal(receipt.sourceUri, sourceRef.path);
  assert.equal(receipt.inputSha256, sourceRef.fileSha256);
  assert.equal(receipt.inputBytes, sourceRef.bytes);
  assert.equal(receipt.enableDiarization, false);
  assert.equal(receipt.receipt.job.id, JOB);
  assert.equal(raw.jobId, JOB);
  assert.equal(status.id, JOB);
  assert.equal(status.state, 'completed');
  for (const record of [receipt.receipt.job, status, raw]) {
    assert.equal(record.input.sha256, sourceRef.fileSha256);
    assert.equal(record.input.bytes, sourceRef.bytes);
    assert.equal(record.pipeline.settings.enableDiarization, false);
  }
  const transcript = await load(`${SAVED}/transcript.json`);
  assertTranscriptArtifact(transcript);
  // The GET-result client hands the ZEV payload and full media duration to this
  // normalizer; the server's outer ASR segments are sentence batches.
  const converted = normalizeGpuSttResponse({...raw.zevResult, durationSec: raw.audioDurationSeconds},
    {target: {sourceUri: sourceRef.path}} as any);
  assert.deepEqual({...converted, generatedAt: transcript.generatedAt}, transcript,
    'Current STT conversion must reproduce the saved transcript without speaker rewriting');
  assert.equal(transcript.segmentCount, 44002);
  assert.equal(transcript.segments.length, 44002);
  assert.equal(transcript.speechUnitGroups.length, 44002);
  assert.equal(raw.zevResult.segments.length, 44002);
  assert.equal(raw.zevResult.speechUnitGroups.length, 424);
  assert(transcript.segments.every((s: Json) => s.speaker === 'unknown'));
  const utterances = await load(`${SAVED}/utterances.json`);
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(utterances,
    {sourceTranscriptPath: `${SAVED}/transcript.json`, sourceTranscriptBytes: await readFile(absolute(`${SAVED}/transcript.json`))});

  const requested = await load(`${REPORT}/plan.json`);
  async function selectionContext(stage: 'discovery' | 'selection') {
    const file = `${SAVED}/${stage}-plan.json`, plan = await load(file);
    assert.equal((await reference(file)).fileSha256, bind(file, plan).fileSha256);
    assert.equal(plan.planId, requested.planId);
    assert.equal(plan.outputRoot, SAVED);
    assert.equal(plan.request.purpose, requested.productionRequest);
    assert.equal(plan.request.sourceId, requested.sourceId);
    const authorization = await bound(plan.authorization);
    assert.equal(authorization.requestFile.fileSha256, (await reference(`${REPORT}/plan.json`)).fileSha256);
    await verifyReferences(plan.request);
    const thinPlan = await bound(plan.thinPlanBinding);
    assert(same(thinPlan, {schemaVersion: 'production-intent-plan-v0', productionIntent: requested.productionRequest}));
    // Historical implementation bindings describe the old execution, not current code.
    // Current validation below is deliberately performed by today's validators.
    return {plan, planBinding: bind(file, plan), authorization, transcript, utterances, thinPlan,
      rendererTemplate: await bound(plan.request.rendererTemplate), captionStyleTemplate: await bound(plan.request.captionStyleTemplate),
      ...(stage === 'selection' ? {candidateSet: await bound(plan.request.candidateSet)} : {})};
  }
  const discovery = await selectionContext('discovery');
  const discovered = validateUnseenDiscoveryV001(discovery, await load(`${SAVED}/candidate-request.json`),
    await load(`${SAVED}/candidate-response.json`), await load(`${SAVED}/candidate-result.json`));
  await equalSaved(`${SAVED}/candidate-set.json`, discovered.candidateSet);
  await equalSaved(`${SAVED}/discovery-validation.json`, discovered.validation);
  const c = await selectionContext('selection');
  const selected = selectUnseenCandidatesV001(c, await load(`${SAVED}/selection-request.json`),
    await load(`${SAVED}/selection-response.json`), await load(`${SAVED}/selection-result.json`));
  await equalSaved(`${SAVED}/selection-validation.json`, selected.validation);
  await equalSaved(`${SAVED}/selection-adoption.json`, selected.adoption);
  assert.equal(selected.adoption.adoptedCandidates.length, 5);
  assert.equal(selected.adoption.rejectedCandidates.length, 0);
  const utteranceMap = new Map<string, Json>(utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const atoms = new Map<number, Json>(transcript.segments.map((s: Json) => [s.id, s]));
  const retentionInput = {schemaVersion: 'candidate-internal-retention-input-v001' as const,
    taskDescription: '採用済み候補の意味・フリ・展開・反応・結論を保つために残す内容を判断する。尺や件数を目標にしない。本文全体の保持・削除を既存の断片IDで明示する。',
    candidates: selected.adoption.adoptedCandidates.map((p: Json) => ({candidateId: p.candidateId, title: p.title,
      highlightReason: p.judgment.reason, utterances: p.includedUtteranceIds.map((id: string) => ({utteranceId: id,
        atoms: utteranceMap.get(id)!.sourceSegmentIds.map((id: number) => ({sourceSegmentId: id, text: atoms.get(id)!.text}))}))}))};
  const retentionRequest = await load(`${SAVED}/retention-request.json`), retentionResult = await load(`${SAVED}/retention-result.json`);
  assert.deepEqual(retentionRequest.planBinding, c.planBinding);
  assert.deepEqual(retentionRequest.selectionAdoptionBinding, bind(`${SAVED}/selection-adoption.json`, selected.adoption));
  const token = validateInternalRetentionProvenanceV001(retentionRequest,
    await load(`${SAVED}/retention-response.json`), retentionResult, retentionInput);
  const observed = {transcriptBinding: c.plan.request.transcript,
    units: transcript.segments.filter((s: Json) => s.endMs > s.startMs).map((s: Json) => ({unitId: `gpu-fragment-${s.id}`,
      startMs: s.startMs, endMs: s.endMs, startBoundary: {after: s.id}, endBoundary: {before: s.id},
      startTimeRole: 'gpu-aligned-source-fragment', timeOrigin: 'full-source-gpu-stt'}))};
  const resolved = resolveInternalRetentionV001(token, selected.adoption.adoptedCandidates, [observed]);
  assert.equal(resolved.status, 'resolved');
  await equalSaved(`${SAVED}/retention-validation.json`, {schemaVersion: 'new-material-retention-validation-v001', ...resolved,
    requestBinding: bind(`${SAVED}/retention-request.json`, retentionRequest), transcriptBinding: c.plan.request.transcript});
  const parts = resolved.segments!.map((s: Json, i: number) => ({
    ...selected.adoption.adoptedCandidates.find((p: Json) => p.candidateId === s.candidateId),
    sourceSegmentIds: s.sourceSegmentIds, sourceInterval: {sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs},
    timelineSegmentId: s.segmentId, outputOrdinal: i + 1, cutBoundaryEvidence: s.cutBoundaryEvidence}));
  const adoption = {...selected.adoption, schemaVersion: 'new-material-digest-execution-adoption-v001',
    selectionAdoptionBinding: bind(`${SAVED}/selection-adoption.json`, selected.adoption),
    retentionResultBinding: bind(`${SAVED}/retention-result.json`, retentionResult), selectedCandidates: parts};
  await equalSaved(`${SAVED}/machine-adoption.json`, adoption);
  const editPlan = {schemaVersion: 'new-material-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(`${SAVED}/machine-adoption.json`, adoption),
    sourceVideoBinding: c.plan.request.sourceVideo, segments: parts.map((p: Json) => ({candidateId: p.candidateId,
      segmentId: p.timelineSegmentId, ...p.sourceInterval, sourceSegmentIds: p.sourceSegmentIds})),
    unresolvedEdits: [], quality: 'human-review-pending'};
  await equalSaved(`${SAVED}/edit-plan.json`, editPlan);
  await equalSaved(`${SAVED}/base-attempt-002/edit-plan.json`, editPlan);

  const captionRoot = `${SAVED}/caption-attempt-003`, captionAdoption = await load(`${captionRoot}/caption-adoption.json`);
  await verifyReferences(captionAdoption);
  assert.deepEqual(captionAdoption.machineAdoptionBinding, bind(`${SAVED}/machine-adoption.json`, adoption));
  assert.deepEqual(captionAdoption.displayJudgments.map((row: Json) => row.candidateId), parts.map((p: Json) => p.candidateId));
  const requests: Json[] = [], displayTokens: object[] = [];
  for (const judgment of captionAdoption.displayJudgments) {
    const request = await bound(judgment.request), response = await bound(judgment.response), result = await bound(judgment.result);
    requests.push(request);
    displayTokens.push(validateDisplayForAdoptionV001(request, response, result, 'new-material-display-response-v001'));
  }
  const traces = readValidatedDisplayTracesV001(requests, displayTokens);
  const normal = await load(`${captionRoot}/normal-plan.json`);
  assert.equal(normal.elements.length, 326);
  assert.equal(traces.flatMap((row: Json) => row.cues).length, 326);
  const source = await load(`${SAVED}/presentation/saved/source-bindings.json`);
  assert.equal(absolute(source.planRef.path), absolute(`${captionRoot}/normal-plan.json`));
  assert.equal(source.digestRef.sha256, (await reference(`${SAVED}/edit-plan.json`)).fileSha256);
  const state: Json = {};
  for (const key of ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'])
    state[key] = await load(`${SAVED}/presentation/saved/${key}.json`);
  await verifyReferences(source);
  await verifyReferences(state);
  assert.equal(source.planBytes, await readFile(absolute(source.planRef.path), 'utf8'));
  assert.equal(source.timelineBytes, await readFile(absolute(source.timelineRef.path), 'utf8'));
  assert.equal(source.decisionInputBytes, await readFile(absolute(source.captionContext.decisionInputRef.path), 'utf8'));
  assert.deepEqual(state.captionOverrides.entries, []);
  assert.deepEqual(state.connectionOverrides.entries, []);
  const context = createOrchestrationContextV001(source);
  const view = resolveOrchestrationDrawingViewV001({context, state});
  assertOrchestrationDrawingViewMatchesStateV001({view, context, state});
  await equalSaved(`${SAVED}/presentation/drawing-evidence.json`, exportOrchestrationDrawingViewEvidenceV001(view));
  await equalSaved(`${PREVIOUS}/scratch/native-qc-preparation/plan.json`, view.resolvedPlan);
  assert.equal(view.resolvedPlan.elements.length, 326);
  assert.equal(view.projection.displayFrameCount, 27949);
  const drawingEvidenceRef = await reference(`${SAVED}/presentation/drawing-evidence.json`,
    '8239001075cf2744f72cdd4d5a2902a5d7b204ee63ad253ac90446a861556a64');

  const originalVideoRef = await reference('evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4', ORIGINAL_SHA);
  const originalFailure = await load(`${REPORT}/qc-decision-evidence.json`);
  const codecDiagnosis = await load(`${REPORT}/codec-diagnosis-verification.json`);
  assert.equal(originalFailure.status, 'failed');
  assert.equal(originalFailure.frame, 7801);
  assert.equal(originalFailure.expectedRgbDifference, 1345125);
  assert.equal(originalFailure.nearestCounterfactualRgbDifference, 1344947);
  assert.equal(originalFailure.nativeViolationCount, 1);
  assert.equal(originalFailure.videoSha256, ORIGINAL_SHA);
  await reference(originalFailure.targetInspection);
  await verifyReferences(codecDiagnosis);
  assert.equal(codecDiagnosis.originalNativeFailurePreserved, true);
  assert.deepEqual(codecDiagnosis.originalNativeDistances, {expected: 1345125, duplicate: 1344947});
  assert.equal(codecDiagnosis.nativeQcPassed, 423);
  assert.equal(codecDiagnosis.nativeQcSamples, 424);
  assert.equal(codecDiagnosis.status, 'resolved');
  // The legacy full evidence is protected bytewise, never parsed into a giant object.
  await reference(`${SAVED}/presentation/qc-resume-attempt-002/finite-result.json`,
    '32534f5b909b1a91dbf2ed7cb098ef561c909d42650a086ca17b8d26fefc73c7');
  await reference('runtime/artifacts/qc-evidence-common-20260927-v001/measurement-v003/shared-qc.json',
    '89a37d22c3d6ad66a8a12dda2dcdebaac86ee51a3bf3b3c2316417d3267e5d29');
  const protectedRefs = [...refs.values()].sort((a, b) => a.path.localeCompare(b.path));
  const summary = {schemaVersion: 'production-time-integration-fixed-inputs-v001', status: 'passed',
    source: sourceRef, stt: {jobId: JOB, enableDiarization: false, segmentCount: transcript.segmentCount,
      normalizedSpeechUnitGroups: transcript.speechUnitGroups.length, rawSpeechUnitGroups: raw.zevResult.speechUnitGroups.length,
      speakers: ['unknown'], durationSec: transcript.durationSec, currentConversionIdentical: true},
    discovery: {candidates: discovered.candidateSet.candidates.length, currentValidationIdentical: true},
    selection: {adopted: parts.length, rejected: selected.adoption.rejectedCandidates.length, currentValidationIdentical: true},
    retention: {segments: editPlan.segments.map(s => ({candidateId: s.candidateId, segmentId: s.segmentId,
      sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs, sourceSegments: s.sourceSegmentIds.length})), currentValidationIdentical: true},
    captions: {count: normal.elements.length, displayJudgments: traces.length, currentValidationIdentical: true,
      normalPlan: source.planRef, captionOverrides: 0, connectionOverrides: 0},
    drawing: {viewSha256: view.viewSha256, frameCount: view.projection.displayFrameCount, drawingEvidenceRef},
    originalVideoRef, originalNative: {passed: 423, samples: 424, separateCodecDiagnosis: 'resolved'},
    semantics: 'saved decisions revalidated; no new STT, AI judgment, human adoption or historical implementation replacement',
    backgroundAdmission: 'full background/proof/tool/PCM admission is performed separately by inspectSavedOrchestrationBackgroundReuseV001'};
  return {summary, drawingEvidenceRef, view, context, source, state, protectedRefs,
    originalVideoRef, originalFailure, codecDiagnosis, transcript, utterances, adoption, editPlan};
}

import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, readBound, publish, same, pass, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadRevisedPhase2CaptionContext} from './digest_v1_phase2_caption_revision.mts';
import {validatePhase2Display, resolvePhase2CaptionTiming} from './digest_v1_phase2_captions.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {buildAdoptedBaseMediaV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES}
  from './adopted_media_manufacturing_v001.mts';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob} from './presentation_base_media_build_v003.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001 as validateSourcePackage}
  from './presentation_output_caption_cue_source_package_v001.mjs';

const implementationPath = 'evals/clip_composition/digest_v1_phase2_manufacturing.mts';
const implementationBinding = async () => ({path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))});

/** 既存resolverの「未観測」の任意診断欄だけをJSONの欠落へ写像する。時刻の補正はしない。 */
export function serializePhase2Timing(timing: Json) {
  const missing: string[] = [];
  const visit = (value: any, location: string): any => {
    if (Array.isArray(value)) return value.map((v, i) => visit(v, `${location}.${i}`));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      if (child !== undefined) return [[key, visit(child, `${location}.${key}`)]];
      assert(/^timing\.(originalRows|cues)\.\d+\.resolution$/.test(location)
        && ['observedStartMs', 'observedEndMs'].includes(key), `UNEXPECTED_MISSING_TIMING_VALUE: ${location}.${key}`);
      missing.push(`${location}.${key}`); return [];
    }));
    assert(value !== undefined, `UNEXPECTED_MISSING_TIMING_VALUE: ${location}`);
    return value;
  };
  return {timing: visit(timing, 'timing'), absentOptionalObservationPaths: missing};
}

async function captionContext(job: string) {
  const c = await loadRevisedPhase2CaptionContext(job), preflight = await readJson(out(c, 'display-input-preflight-v002.json'));
  assert(same(await readJson(out(c, 'display-all-request-v002.json')), c.text.request));
  assert.equal(await fileSha(path.join(ROOT, preflight.implementationBinding.path)), preflight.implementationBinding.fileSha256);
  const response = await readJson(out(c, 'display-all-response-v002.json'));
  const result = await readJson(out(c, 'display-all-result-v002.json'));
  const traces = validatePhase2Display(c.text, response, result);
  const validation = await readJson(out(c, 'display-validation-v002.json'));
  assert.equal(validation.status, 'passed');
  assert(same(validation.requestBinding, bind(out(c, 'display-all-request-v002.json'), c.text.request))
    && same(validation.responseBinding, bind(out(c, 'display-all-response-v002.json'), response))
    && same(validation.resultBinding, bind(out(c, 'display-all-result-v002.json'), result)));
  const projected = serializePhase2Timing(resolvePhase2CaptionTiming(c, c.adoption, c.text, traces));
  assert.equal(projected.timing.status, 'resolved', 'PHASE2_CAPTION_TIMING_UNRESOLVED');
  const timing = {schemaVersion: 'digest-v1-phase2-caption-timing-resolution-v002', ...projected.timing,
    displayValidationBinding: bind(out(c, 'display-validation-v002.json'), validation),
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), c.adoption), acousticValidationBinding: c.originalAcousticBinding,
    policy: 'existing-cue-endpoint-resolution-and-explicit-unresolved-transcript-fallback',
    supplementalRetentionEndpointEvidenceUsedForCaption: false, humanSync: 'not-evaluated',
    serialization: {policy: 'omit-only-absent-optional-observation-diagnostics; preserve-all-time-values',
      absentOptionalObservationPaths: projected.absentOptionalObservationPaths}};
  return {...c, traces, timing};
}

export async function savePhase2Timing(job: string) {
  const c = await captionContext(job);
  await requireAbsent(out(c, 'caption-timing-resolution-v002.json'));
  const timingBinding = await publish(out(c, 'caption-timing-resolution-v002.json'), c.timing);
  await publish(out(c, 'caption-timing-serialization-recovery-v002.json'), {
    schemaVersion: 'digest-v1-phase2-caption-timing-serialization-recovery-v002', status: 'passed',
    failure: 'formal JSON rejected undefined optional observedStartMs/observedEndMs diagnostics after display validation had passed',
    failedExecutionLog: {path: out(c, 'display-execution-v002.log'), fileSha256: await fileSha(path.join(ROOT, out(c, 'display-execution-v002.log')))},
    diagnosticBinding: bind(out(c, 'caption-timing-diagnostic-v002.json'), await readJson(out(c, 'caption-timing-diagnostic-v002.json'))),
    implementationBinding: await implementationBinding(), timingBinding,
    correctionScope: 'new-adapter-output-serialization; existing-timing-functions-unchanged',
    semanticJudgmentCallsDuringRecovery: 0, newAcousticObservations: 0, changedTimeValues: 0,
    unresolvedOrOutsideIntervals: c.timing.issues.length, absentOptionalObservationPaths: c.timing.serialization.absentOptionalObservationPaths});
  process.stdout.write(JSON.stringify({stage: 'caption-timing', status: 'resolved', cues: c.timing.cues.length}) + '\n');
}

async function manufacturingContext(job: string) {
  const c = await captionContext(job), saved = await readJson(out(c, 'caption-timing-resolution-v002.json'));
  assert(same(saved, c.timing), 'PHASE2_TIMING_RECONSTRUCTION_CHANGED');
  const recovery = await readJson(out(c, 'caption-timing-serialization-recovery-v002.json'));
  assert(same(recovery.implementationBinding, await implementationBinding()), 'PHASE2_MANUFACTURING_IMPLEMENTATION_CHANGED');
  return c;
}

export async function buildPhase2Base(job: string) {
  const c = await manufacturingContext(job), ad = bind(out(c, 'machine-adoption.json'), c.adoption);
  await requireAbsent(out(c, 'manufacturing-values.json'));
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001', jobId: `${c.plan.planId}-manufacturing-values`,
    assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
      sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo}, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'PHASE2_MANUFACTURING_JOB_INVALID');
  const jobBinding = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = await publish(out(c, 'core-invocation.json'), {schemaVersion: 'candidate-digest-core-invocation-v001',
    authorizationBinding: c.plan.authorization, captionPolicyAuthorizationBinding: c.text.request.authorityBinding,
    planBinding: c.planBinding, machineAdoptionBinding: ad, editPlanBinding: bind(out(c, 'edit-plan.json'), c.editPlan),
    manufacturingValuesBinding: jobBinding, admission: 'C-all-with-new-validated-retention-and-caption-display',
    retentionBinding: c.retentionBinding, captionTimingBinding: bind(out(c, 'caption-timing-resolution-v002.json'), c.timing),
    adapterBinding: await implementationBinding(), individualCandidateHumanApproval: 'not-performed'});
  process.stdout.write(JSON.stringify({stage: 'base-media', status: 'started', ranges: c.adoption.segments.length}) + '\n');
  const base = await buildAdoptedBaseMediaV001(c, c.adoption, c.editPlan, manufacturingJob, jobBinding, invocation,
    {inspection: 'candidate-digest-source-inspection-v001', receipt: 'candidate-digest-base-media-validation-v001'});
  await publish(out(c, 'base-media-bindings.json'), {schemaVersion: 'candidate-digest-base-media-bindings-v001', ...base});
  process.stdout.write(JSON.stringify({stage: 'base-media', status: 'passed', base}) + '\n');
}

export function projectPhase2CaptionInputs(c: Json, base: Json) {
  const atoms = structuredClone(c.text.textInput.atomOccurrences), bySource = new Map<number, Json>(c.transcript.segments.map((a: Json) => [a.id, a]));
  const byAtom = new Map<string, Json>(atoms.map((a: Json) => [a.atomOccurrenceId, a]));
  const assigned = new Set<string>();
  for (const row of c.timing.cues) for (const id of row.atomOccurrenceIds) {
    const atom = byAtom.get(id); assert(atom && !assigned.has(id), 'PHASE2_TIMING_ATOM_COVERAGE'); assigned.add(id);
    const original = bySource.get(atom.sourceSegmentId)!;
    atom.captionTimingUnitId = row.unitId; atom.originalTranscriptTime = {startMs: original.startMs, endMs: original.endMs};
    atom.retainedSpans = [{timelineSegmentId: row.timelineSegmentId, sourceStartMs: row.resolution.sourceStartMs, sourceEndMs: row.resolution.sourceEndMs}];
  }
  assert.equal(assigned.size, atoms.length, 'PHASE2_TIMING_ATOM_COVERAGE');
  const timingBinding = bind(out(c, 'caption-timing-resolution-v002.json'), c.timing);
  const meaning = {...c.text.textInput, schemaVersion: 'candidate-internal-edit-meaning-input-v001', artifactId: `${c.plan.planId}-meaning`,
    textInputBinding: bind(out(c, 'caption-text-input.json'), c.text.textInput), captionTimingBinding: timingBinding,
    timingGranularity: 'display-cue-envelope; individual-character-acoustic-times-are-not-claimed', atomOccurrences: atoms};
  const meaningBinding = bind(out(c, 'meaning-input.json'), meaning);
  const sourcePackage = structuredClone(c.captionStyleTemplate);
  sourcePackage.packageId = `${c.plan.planId}-source-package`; sourcePackage.promptInput = c.text.promptInput;
  const context = structuredClone(sourcePackage.reconstructionMap.caseContexts[0]);
  const caption = c.text.promptInput.captions[0];
  context.caseId = c.plan.planId; context.inputCaptionId = caption.captionId;
  context.meaningPackageBinding = meaningBinding; context.baseMediaInput = base;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding],
    captions: [{captionId: caption.captionId, meaningPackageOrdinal: 1, semanticCaptionId: meaning.captions[0].captionId,
      atomOccurrenceIds: atoms.map((a: Json) => a.atomOccurrenceId),
      boundaries: caption.boundaryCandidates.map((b: Json, i: number) => ({boundaryId: b.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId}))}],
    caseContexts: [context]};
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: c.plan.implementationBindings.map((b: Json, i: number) => ({role: `phase2-source-${i + 1}`, ...b})),
    approvedContractBindings: [c.plan.authorization, c.text.request.authorityBinding]};
  pass(validateSourcePackage(sourcePackage), 'PHASE2_CAPTION_SOURCE_INVALID');
  const displayJudgments = c.traces.map((trace: Json, i: number) => Object.fromEntries(['request', 'response', 'result'].map(key =>
    [key, bind(out(c, `display-${i + 1}-${key}-v002.json`), trace[key])])));
  const captionAdoption = {schemaVersion: 'candidate-internal-edit-caption-adoption-v001', artifactId: `${c.plan.planId}-caption-adoption`,
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), c.adoption), meaningInputBinding: meaningBinding,
    captionTimingBinding: timingBinding, displayJudgments, quality: 'human-review-pending'};
  return {meaning, sourcePackage, captionAdoption};
}

export async function renderPhase2(job: string) {
  const c = await manufacturingContext(job);
  await requireAbsent(out(c, 'source-package.json'));
  const {schemaVersion: _schema, ...base} = await readJson(out(c, 'base-media-bindings.json'));
  const input = projectPhase2CaptionInputs(c, base);
  const core = await assembleAdoptedCaptionCoreV001(c, input, base, input.captionAdoption, c.traces);
  const artifacts: Json = {};
  for (const [key, filename] of Object.entries(CORE_FILES)) artifacts[key] = await publish(out(c, filename), core[key]);
  process.stdout.write(JSON.stringify({stage: 'renderer', status: 'started', captions: core.instruction.instructions.length}) + '\n');
  const renderer = await renderAdoptedVideoV001(c, artifacts, 'candidate-digest-renderer-execution-v001');
  const execution = await readBound(renderer.execution), timeline = await readBound(base.timeline);
  assert.equal(execution.result.qc.violations.length, 0);
  const verification = {schemaVersion: 'digest-v1-phase2-execution-result-v001', status: 'technical-checkpoint',
    jobBinding: c.planBinding, candidateSetBinding: c.candidateSetBinding, retainedJudgmentBinding: c.retentionBinding,
    machineAdoption: bind(out(c, 'machine-adoption.json'), c.adoption), editPlan: bind(out(c, 'edit-plan.json'), c.editPlan),
    baseMedia: base, artifacts, renderer, counts: {prospects: c.candidateSet.candidates.length, adopted: c.adoption.selectedCandidates.length,
      retainedRanges: c.adoption.segments.length, captions: c.timing.cues.length, atoms: c.text.textInput.atomOccurrences.length},
    frameCount: timeline.baseMedia.expectedFrameCount, durationSeconds: timeline.baseMedia.expectedFrameCount / 30,
    operations: {candidateJudgments: 1, retentionJudgments: 1, displayJudgments: 2, captionPolicyRevisionAdditionalJudgments: 1,
      paidApiCalls: 0, newMaterials: 0}, humanQuality: 'not-evaluated', completionApproval: 'not-claimed'};
  await publish(out(c, 'verification.json'), verification);
  process.stdout.write(JSON.stringify({stage: 'technical-checkpoint', video: renderer.video, counts: verification.counts}) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  try {
    if (mode === 'timing' && job) await savePhase2Timing(job);
    else if (mode === 'base' && job) await buildPhase2Base(job);
    else if (mode === 'render' && job) await renderPhase2(job);
    else throw new Error('usage: timing|base|render job.json');
  } catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}

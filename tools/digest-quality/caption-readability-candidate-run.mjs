/** Explicit candidate execution through the ordinary edited-render entry.
 * The job and every input are saved before execution. No production activation,
 * provider call, historical diagnosis reuse, or source-media replacement. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {appendFile, lstat, mkdir, readFile, statfs, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {renderEditedOrchestrationV001, verifyEditedOrchestrationDrawingRulesRefV001,
  verifyEditedOrchestrationCandidateTrustV001, buildEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001, deriveReadabilityOrchestrationDrawingViewV001,
  exportOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {readPresentationQcEvidenceV001}
  from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {verifyPresentationNativeSampleReceiptsV001}
  from '../../evals/clip_composition/presentation_native_qc_streaming_v001.mjs';
import {evaluatePresentationRendererQcV002}
  from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectSavedOrchestrationBackgroundReuseV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();

// Explicit first-layer approval for this 7A full candidate only. This is not a
// renderer default, a QC threshold, or an estimate of total required storage.
export const READABILITY_FULL_RUN_CAPACITY_V001 = Object.freeze({
  scope: '7A-full-candidate-only',
  approvalCommit: '6319689500949c5090aae0ab7aa9cb688cc2c2b3',
  nativeStartMinimumFreeBytes: 28_680_038_400,
  includedReserveBytes: 12_000_000_000,
  nativeHardFloorBytes: 10_000_000_000,
});

/** Observe real free space at existing stage/batch boundaries. Planned output
 * bytes are evidence only: they do not introduce another stopping condition. */
export function createReadabilityCapacityControlV001({capacity, observeDisk = disk,
  record = async () => {}, observeRetained = retainedFootprint}) {
  assert.deepEqual(capacity, READABILITY_FULL_RUN_CAPACITY_V001, 'this execution requires the exact approved 7A capacity conditions');
  const check = async (event, minimumFreeBytes) => {
    const observed = await observeDisk();
    assert(Number.isSafeInteger(observed.availableBytes) && observed.availableBytes >= 0, 'invalid available capacity observation');
    const row = {...event, disk: observed, minimumFreeBytes,
      status: observed.availableBytes < minimumFreeBytes ? 'capacity-interrupted' : 'continue'};
    await record(row);
    if (row.status === 'capacity-interrupted') {
      const error = new Error('Approved 7A capacity boundary reached; saved work is incomplete and retained');
      error.code = 'READABILITY_CAPACITY_INTERRUPTED'; error.capacityObservation = row;
      throw error;
    }
    return row;
  };
  return {
    beforeStart: event => check({phase: 'before-native-qc', checkpointRef: event.checkpointRef ?? null},
      capacity.nativeStartMinimumFreeBytes),
    beforeHeavyBatch: event => check({...event}, capacity.nativeHardFloorBytes),
    afterSample: async event => {
      const retained = event.visible ? null : await observeRetained(event);
      // Keep lightweight facts; candidate/class arrays remain in the ordinary
      // per-sample proof, avoiding another copy of the full QC evidence.
      return check({phase: 'native-sample-complete', sampleIndex: event.sampleIndex,
        instructionId: event.instructionId, frame: event.frame, visible: event.visible,
        referenceRetention: {state: event.referenceRetention?.state,
          checkpoint: event.referenceRetention?.checkpoint}, metrics: event.metrics, retained},
      capacity.nativeHardFloorBytes);
    },
  };
}
async function retainedFootprint(event) {
  const refs = [...event.referenceRetention.artifacts, event.referenceRetention.checkpoint];
  const seen = new Set(), result = {files: 0, logicalBytes: 0, allocatedBytes: 0};
  for (const ref of refs) {
    if (seen.has(ref.path)) continue; seen.add(ref.path);
    const info = await lstat(ref.path);
    assert(info.isFile() && !info.isSymbolicLink(), 'retained evidence must be a regular file');
    result.files++; result.logicalBytes += info.size; result.allocatedBytes += info.blocks * 512;
  }
  return {...result, scope: 'retained sample reference RGB and proof; allocated bytes use st_blocks times 512'};
}
async function bind(file) {
  assert(path.isAbsolute(file));
  const before = await lstat(file); assert(before.isFile() && !before.isSymbolicLink());
  const hash = createHash('sha256');
  for await (const part of createReadStream(file)) hash.update(part);
  const after = await lstat(file);
  for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key], 'input changed during read');
  return {path: file, bytes: before.size, fileSha256: hash.digest('hex')};
}
async function verify(ref, mapping = new Map()) {
  const actual = await bind(mapping.get(ref.path) ?? ref.path);
  assert.equal(actual.fileSha256, ref.fileSha256, 'saved bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(actual.bytes, ref.bytes);
  return actual;
}
async function disk() {
  const info = await statfs(root);
  return {observedAt: new Date().toISOString(), availableBytes: info.bavail * info.bsize};
}
export async function prepareReadabilityCandidateRunV001(specPath) {
  assert(path.isAbsolute(specPath));
  const started = performance.now(), spec = await json(specPath);
  assert.equal(spec.schemaVersion, 'caption-readability-candidate-execution-spec-v001');
  assert.equal(spec.candidateVersion, 'candidate-readability-v001');
  assert.deepEqual(spec.capacity, READABILITY_FULL_RUN_CAPACITY_V001);
  for (const ref of [spec.originalEvidenceRef, spec.meaningRef, spec.segmentationEvidenceRef,
    spec.savedResolutionRef, spec.referenceCandidatePlanRef, spec.backgroundProofRef,
    spec.backgroundReuseDecoderRef, ...spec.protectedRefs]) await verify(ref);
  const original = restoreOrchestrationDrawingViewEvidenceV001(await json(spec.originalEvidenceRef.path));
  const view = deriveReadabilityOrchestrationDrawingViewV001({view: original,
    version: spec.candidateVersion, meaning: await json(spec.meaningRef.path),
    evidence: await json(spec.segmentationEvidenceRef.path), savedResolution: await json(spec.savedResolutionRef.path)});
  assert.deepEqual(view.resolvedPlan, await json(spec.referenceCandidatePlanRef.path), 'connected candidate differs from fixed local candidate');
  const backgroundReuse = await inspectSavedOrchestrationBackgroundReuseV001({drawingView: view,
    range: {startFrame: 0, endFrameExclusive: view.projection.displayFrameCount},
    reuseProofPath: spec.backgroundProofRef.path, ffmpegPath: spec.backgroundReuseDecoderRef.path,
    ffprobePath: spec.ffprobePath});
  assert.equal(backgroundReuse.used, true, 'full background must pass ordinary saved reuse admission');
  assert.equal(backgroundReuse.fullCoverage, true);
  const rules = await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion: spec.candidateVersion,
    backgroundReuseDecoderRef: spec.backgroundReuseDecoderRef});
  for (const directory of [spec.runDirectory, spec.outputDirectory])
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory: directory});
  await mkdir(spec.runDirectory);
  const evidencePath = path.join(spec.runDirectory, 'candidate-drawing-evidence.json');
  await save(evidencePath, exportOrchestrationDrawingViewEvidenceV001(view));
  const inputRefs = [spec.originalEvidenceRef, spec.meaningRef, spec.segmentationEvidenceRef,
    spec.savedResolutionRef, spec.referenceCandidatePlanRef, spec.backgroundProofRef,
    spec.backgroundReuseDecoderRef, ...spec.protectedRefs];
  const job = {schemaVersion: 'caption-readability-candidate-job-v001', candidateVersion: spec.candidateVersion,
    head: head(), viewSha256: view.viewSha256, humanQuality: 'not-evaluated', productionDefaultChanged: false,
    expected: spec.expected, capacity: spec.capacity,
    protectedRefs: [...new Map(inputRefs.map(ref => [ref.path, ref])).values()],
    renderOptions: {drawingEvidenceRef: await bind(evidencePath), drawingRulesRef: rules,
      outputDirectory: spec.outputDirectory, evidenceDirectory: path.join(spec.runDirectory, 'render'),
      range: null, backgroundReuseProofPath: spec.backgroundProofRef.path,
      backgroundReuseDecoderRef: spec.backgroundReuseDecoderRef,
      nativeAssetReuse: path.join(spec.runDirectory, 'native-assets')}};
  await save(path.join(spec.runDirectory, 'preflight.json'), {status: 'inputs-and-background-verified', observedAt: new Date().toISOString(),
    specificationRef: await bind(specPath), elapsedSeconds: (performance.now() - started) / 1000,
    viewSha256: view.viewSha256, candidate: view.candidateExecution, backgroundReuse, disk: await disk(),
    capacity: spec.capacity, nativeCapacityGate: 'not-yet-reached; observe after body and full replay'});
  const jobPath = path.join(spec.runDirectory, 'job.json'); await save(jobPath, job);
  await readJob(jobPath);
  process.stdout.write(JSON.stringify({status: 'prepared', jobPath, viewSha256: view.viewSha256}) + '\n');
  return job;
}

/** This candidate's saved body/replay continuation only. A new run record and
 * new native evidence are created; neither old media nor old proof is replaced. */
export async function prepareReadabilityCandidateResumeV001(jobPath, checkpointPath, runDirectory) {
  for (const file of [jobPath, checkpointPath, runDirectory]) assert(path.isAbsolute(file));
  const {job} = await readJob(jobPath), checkpointRef = await bind(checkpointPath);
  assert.notEqual(path.dirname(jobPath), runDirectory);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory: runDirectory});
  await mkdir(runDirectory);
  const resumedJob = {...job, head: head(), resumedFrom: {jobRef: await bind(jobPath), checkpointRef},
    protectedRefs: [...job.protectedRefs, checkpointRef],
    renderOptions: {...job.renderOptions, evidenceDirectory: path.join(runDirectory, 'render'),
      resumeFromCheckpointRef: checkpointRef}};
  const nextJobPath = path.join(runDirectory, 'job.json');
  await save(nextJobPath, resumedJob);
  await readJob(nextJobPath);
  process.stdout.write(JSON.stringify({status: 'resume-job-prepared', jobPath: nextJobPath,
    bodyAndReplay: 'retained; admission and SHA validation occur before native execution',
    nativeQc: 'new execution; incomplete earlier native evidence is retained'}) + '\n');
  return resumedJob;
}
async function readJob(file) {
  assert(path.isAbsolute(file));
  const job = await json(file);
  assert.equal(job.schemaVersion, 'caption-readability-candidate-job-v001');
  assert.equal(job.candidateVersion, 'candidate-readability-v001');
  assert.equal(job.humanQuality, 'not-evaluated');
  assert.equal(job.productionDefaultChanged, false);
  assert.deepEqual(job.capacity, READABILITY_FULL_RUN_CAPACITY_V001);
  assert(/^[a-f0-9]{40}$/.test(job.head), 'execution checkpoint SHA required');
  assert.equal(execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8'}).trim(), 'main');
  await verifyEditedOrchestrationDrawingRulesRefV001(job.renderOptions.drawingRulesRef);
  for (const ref of job.protectedRefs) await verify(ref);
  await verify(job.renderOptions.drawingEvidenceRef);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(job.renderOptions.drawingEvidenceRef.path));
  assert.equal(view.viewSha256, job.viewSha256);
  assert.equal(view.resolvedPlan.elements.length, job.expected.captionCount);
  assert.equal(view.projection.displayFrameCount, job.expected.frameCount);
  assert.equal(job.renderOptions.range, null, 'this job covers the full candidate');
  return {job, view};
}

export async function runReadabilityCandidateV001(jobPath) {
  const startedAt = new Date().toISOString(), started = performance.now();
  const {job} = await readJob(jobPath), directory = path.dirname(jobPath);
  const inputReadSeconds = (performance.now() - started) / 1000;
  const available = await disk();
  await save(path.join(directory, 'execution-start.json'), {startedAt, processId: process.pid,
    jobRef: await bind(jobPath), inputReadSeconds, disk: available});
  try {
    const nativeQcExecutionControl = createReadabilityCapacityControlV001({capacity: job.capacity, record: async event => {
      const row = {...event, observedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000};
      await appendFile(path.join(directory, 'capacity-observations.jsonl'), JSON.stringify(row) + '\n');
      if (event.phase === 'before-native-qc' || event.phase === 'native-sample-complete' || event.status === 'capacity-interrupted')
        process.stdout.write(JSON.stringify(row) + '\n');
    }});
    const result = await renderEditedOrchestrationV001({...job.renderOptions, nativeQcExecutionControl, onProgress: async event => {
      const row = {...event, observedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
        disk: await disk()};
      await appendFile(path.join(directory, 'execution-progress.jsonl'), JSON.stringify(row) + '\n');
      process.stdout.write(JSON.stringify(row) + '\n');
    }});
    assert.equal(result.status, 'passed');
    const finite = result.completedFrameQc.evidence.finiteState;
    assert.equal(finite.samples.length, job.expected.nativeSamples);
    assert.equal(finite.samples.reduce((sum, sample) => sum + sample.references.length, 0), job.expected.logicalCandidates);
    for (const ref of job.protectedRefs) await verify(ref);
    const completionRef = await bind(path.join(job.renderOptions.evidenceDirectory, 'completion.json'));
    const drawRef = await bind(path.join(job.renderOptions.evidenceDirectory, 'draw-result.json'));
    const summary = {status: 'passed', startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - started) / 1000, inputReadSeconds, completionRef, drawRef,
      video: result.candidateVideo, nativeSamples: finite.samples.length, expected: job.expected,
      parentMaximumRssBytes: process.resourceUsage().maxRSS * 1024,
      memoryScope: 'Node parent only; renderer observations record child wall time, not child RSS',
      timings: result.timings, processTimings: result.processTimings, disk: await disk(),
      humanQuality: 'not-evaluated', productionDefaultChanged: false};
    await save(path.join(directory, 'execution-result.json'), summary);
    process.stdout.write(JSON.stringify({status: summary.status, elapsedSeconds: summary.elapsedSeconds, video: summary.video}) + '\n');
    return summary;
  } catch (error) {
    await save(path.join(directory, 'execution-failure.json'), {status: error.code === 'READABILITY_CAPACITY_INTERRUPTED' ? 'capacity-interrupted' : 'failed', startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
      message: String(error), stack: error.stack, capacityObservation: error.capacityObservation ?? null,
      checkpointRef: error.checkpointRef ?? null, disk: await disk()});
    throw error;
  }
}

/** Separate-process reread of the ordinary saved completion. It re-evaluates
 * the final gate, verifies retained/released receipts and all required files. */
export async function rereadReadabilityCandidateV001(jobPath) {
  const started = performance.now(), directory = path.dirname(jobPath);
  const executionStart = await json(path.join(directory, 'execution-start.json'));
  assert.equal(executionStart.jobRef.path, jobPath); await verify(executionStart.jobRef);
  const {job, view} = await readJob(jobPath), summary = await json(path.join(directory, 'execution-result.json'));
  assert.equal(summary.status, 'passed');
  await verify(summary.completionRef); await verify(summary.drawRef);
  const result = await readPresentationQcEvidenceV001(summary.completionRef.path,
    {expectedFileSha256: summary.completionRef.fileSha256});
  const draw = await readPresentationQcEvidenceV001(summary.drawRef.path,
    {expectedFileSha256: summary.drawRef.fileSha256});
  assert.equal(draw.exitCode, 0); assert.equal(result.status, 'passed');
  assert.equal(result.viewSha256, view.viewSha256);
  await verifyEditedOrchestrationCandidateTrustV001({candidateTrustRef: result.candidateExecution.candidateTrustRef,
    view, drawingRulesRef: job.renderOptions.drawingRulesRef, drawingEvidenceRef: job.renderOptions.drawingEvidenceRef});
  assert.deepEqual(draw.resolvedPlan, view.resolvedPlan);
  assert.deepEqual(result.drawingRulesRef, job.renderOptions.drawingRulesRef);
  const completed = draw.completedFrameQc, finite = completed.evidence.finiteState;
  assert.deepEqual(result.finalQc, draw.finalQc);
  assert.equal(finite.samples.length, job.expected.nativeSamples);
  assert.equal(finite.samples.reduce((sum, sample) => sum + sample.references.length, 0), job.expected.logicalCandidates);
  const publication = {binding: result.nativeQcPublication, finiteState: finite,
    candidateVideo: result.candidateVideo, publication: result.publication};
  const receipts = await verifyPresentationNativeSampleReceiptsV001({samples: finite.samples, publication});
  const mapping = new Map(result.nativeQcPublication.files.map(row => [row.sourcePath, row.publishedPath]));
  const seen = new Map();
  for (const ref of [result.candidateVideo, ...finite.inputManifest.inputRefs, ...finite.outputArtifacts,
    ...completed.evidence.exactReplay.inputManifest.refs, ...completed.evidence.exactReplay.generatedArtifacts]) {
    assert(!seen.has(ref.path) || seen.get(ref.path) === ref.fileSha256, 'conflicting saved reference');
    if (!seen.has(ref.path)) {await verify(ref, mapping); seen.set(ref.path, ref.fileSha256);}
  }
  const gate = evaluatePresentationRendererQcV002({plan: view.resolvedPlan,
    applicationResults: draw.applicationResults, overlayInspections: completed.inspections,
    mediaInspection: draw.outputMedia, expectedAudio: draw.completedExpectedAudio,
    expectedFrameCount: job.expected.frameCount, canvas: view.resolvedPlan.canvas,
    requireFinalVisibility: true, completedFrameQcEvidence: completed.evidence, renderRange: null,
    currentCompletedMediaRef: draw.finalQc.currentCompletedMediaRef});
  assert.deepEqual(gate, draw.finalQc, 'independent final QC differs');
  assert.equal(gate.status, 'passed');
  const resultSummary = {status: 'passed', processId: process.pid, endedAt: new Date().toISOString(),
    elapsedSeconds: (performance.now() - started) / 1000, verifiedFileCount: seen.size,
    nativeSamples: finite.samples.length, receiptVerification: receipts, finalQcStatus: gate.status,
    regeneratedImages: 0, regeneratedVideo: false, protectedReferenceCount: job.protectedRefs.length,
    parentMaximumRssBytes: process.resourceUsage().maxRSS * 1024, completionRef: summary.completionRef,
    humanQuality: 'not-evaluated', productionDefaultChanged: false};
  await save(path.join(directory, 'independent-reread.json'), resultSummary);
  process.stdout.write(JSON.stringify(resultSummary) + '\n');
  return resultSummary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, jobPath, checkpointPath, runDirectory] = process.argv.slice(2);
  if (mode === 'prepare') await prepareReadabilityCandidateRunV001(jobPath);
  else if (mode === 'prepare-resume') await prepareReadabilityCandidateResumeV001(jobPath, checkpointPath, runDirectory);
  else if (mode === 'run') await runReadabilityCandidateV001(jobPath);
  else if (mode === 'reread') await rereadReadabilityCandidateV001(jobPath);
  else throw Error('usage: prepare absolute-spec.json | prepare-resume old-job.json checkpoint.json new-run-directory | run|reread absolute-candidate-job.json');
}

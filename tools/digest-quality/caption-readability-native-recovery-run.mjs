/** One saved 7A candidate continuation. No drawing, source acquisition, AI call,
 * receipt rewrite, default promotion, or relaxed QC is provided by this entry. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {appendFile, lstat, mkdir, readFile, statfs, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {readPresentationBeforeNativeCheckpointV001, commitValidatedPresentationArtifactsV002}
  from '../../evals/clip_composition/render_presentation_v002.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationCandidateTrustV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001}
  from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {createPresentationNativePublicationBindingV001}
  from '../../evals/clip_composition/presentation_native_qc_streaming_v001.mjs';
import {createPresentationNativeLayerRecoveryManifestV001, openPresentationNativeLayerRecoveryV001,
  provePresentationNativeLayerRecoveryV001}
  from '../../evals/clip_composition/presentation_native_layer_recovery_v001.mjs';
import {inspectPresentationNativeResumeV001, verifyPresentationNativeResumeReceiptsV001,
  verifyPresentationNativeResumeOutputArtifactsV001, validatePresentationNativeResumeInputsV001}
  from '../../evals/clip_composition/presentation_native_resume_v001.mjs';
import {combinePresentationNativeResumeIntegrityQcV001, evaluatePresentationNativeResumeRendererQcV001}
  from '../../evals/clip_composition/presentation_native_resume_integrity_v001.mjs';
import {createPresentationRendererProcessObserverV001}
  from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectOrchestrationEncodedAudioV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {createReadabilityCapacityControlV001, READABILITY_FULL_RUN_CAPACITY_V001}
  from './caption-readability-candidate-run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const self = fileURLToPath(import.meta.url);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
async function bind(file) {
  assert(path.isAbsolute(file));
  const before = await lstat(file); assert(before.isFile() && !before.isSymbolicLink());
  const sha = createHash('sha256'); for await (const bytes of createReadStream(file)) sha.update(bytes);
  const after = await lstat(file);
  for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key], 'file changed while read');
  return {path: file, bytes: after.size, fileSha256: sha.digest('hex')};
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
function observer(directory) {
  const observed = createPresentationRendererProcessObserverV001({observationDirectory: directory});
  return {observed, run: (command, args, purpose = 'raw-recovery') => observed.run(command, args,
    {allowedExitCodes: [0], observationLabel: purpose})};
}
async function readOriginal(jobPath) {
  const job = await json(jobPath);
  assert.equal(job.schemaVersion, 'caption-readability-candidate-job-v001');
  assert.equal(job.candidateVersion, 'candidate-readability-v001');
  assert.equal(job.productionDefaultChanged, false); assert.equal(job.humanQuality, 'not-evaluated');
  assert.deepEqual(job.capacity, READABILITY_FULL_RUN_CAPACITY_V001);
  await verifyEditedOrchestrationDrawingRulesRefV001(job.renderOptions.drawingRulesRef);
  for (const ref of [...job.protectedRefs, job.renderOptions.drawingEvidenceRef]) await verify(ref);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(job.renderOptions.drawingEvidenceRef.path));
  assert.equal(view.viewSha256, job.viewSha256);
  assert.equal(view.resolvedPlan.elements.length, job.expected.captionCount);
  assert.equal(view.projection.displayFrameCount, job.expected.frameCount);
  const candidateTrustRef = await bind(path.join(job.renderOptions.evidenceDirectory, 'candidate-trust.json'));
  await verifyEditedOrchestrationCandidateTrustV001({candidateTrustRef, view,
    drawingRulesRef: job.renderOptions.drawingRulesRef, drawingEvidenceRef: job.renderOptions.drawingEvidenceRef});
  return {job, view, candidateTrustRef};
}
async function readRecovery(file, {beforePublication = true} = {}) {
  const recovery = await json(file);
  assert.equal(recovery.schemaVersion, 'caption-readability-native-recovery-job-v001');
  assert.equal(execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8'}).trim(), 'main');
  for (const ref of [recovery.originalJobRef, recovery.checkpointRef, recovery.manifestRef,
    recovery.interruptionRef, recovery.preparationRef, recovery.proofRef, ...recovery.controllerRefs]) await verify(ref);
  const original = await readOriginal(recovery.originalJobRef.path);
  const edited = await json(recovery.checkpointRef.path);
  assert.equal(edited.viewSha256, original.view.viewSha256);
  assert.deepEqual(edited.rules, original.job.renderOptions.drawingRulesRef);
  await verify(edited.rendererCheckpointRef);
  const saved = await json(edited.rendererCheckpointRef.path);
  assert.deepEqual(saved.presetRegistry, edited.rules.candidateExecution.registry);
  if (beforePublication) await readPresentationBeforeNativeCheckpointV001({checkpointRef: edited.rendererCheckpointRef,
    presetRegistry: saved.presetRegistry, toolPaths: saved.toolPaths, orchestrationDrawingView: original.view,
    outputDirectory: original.job.renderOptions.outputDirectory});
  const proof = await json(recovery.proofRef.path);
  assert.equal(proof.status, 'passed');
  const expectedRaw = [...new Set(proof.coverage.flatMap(row => row.paths))].sort(), actualRaw = [];
  for (const row of proof.proofs) {
    await verify(row.proofRef);
    assert.deepEqual(await json(row.proofRef.path), row.proof);
    assert.equal(row.proof.status, 'passed'); assert.equal(row.proof.originalRawReleased, 0);
    assert.deepEqual(row.proof.manifestRef, recovery.manifestRef, 'diagnostic proof belongs to another raw manifest');
    for (const observation of row.proof.proofs) {
      assert.equal(observation.byteEquality, true);
      assert.equal(observation.original.fileSha256, observation.regenerated.fileSha256);
      assert.equal(observation.original.bytes, observation.regenerated.bytes);
      await verify(observation.regenerated); actualRaw.push(observation.original.path);
    }
  }
  assert.deepEqual(actualRaw.sort(), expectedRaw, 'diagnostic proof coverage differs');
  return {recovery, edited, saved, ...original};
}

/** Capture the originals before any raw release; prove selected original bytes
 * through diagnostic copies. The full raw set is not released here. */
export async function prepareReadabilityNativeRecoveryV001(specPath) {
  const spec = await json(specPath), started = performance.now();
  assert.equal(spec.schemaVersion, 'caption-readability-native-recovery-spec-v001');
  const {job, view, candidateTrustRef} = await readOriginal(spec.originalJobPath);
  const checkpointRef = await bind(spec.checkpointPath), edited = await json(spec.checkpointPath);
  const low = await json(edited.rendererCheckpointRef.path);
  await readPresentationBeforeNativeCheckpointV001({checkpointRef: edited.rendererCheckpointRef,
    presetRegistry: low.presetRegistry, toolPaths: low.toolPaths, orchestrationDrawingView: view,
    outputDirectory: job.renderOptions.outputDirectory});
  const interruptionRef = await bind(spec.interruptionPath);
  const source = await readPresentationQcEvidenceV001(interruptionRef.path,
    {expectedFileSha256: interruptionRef.fileSha256});
  assert.equal(source.expectedSampleCount, job.expected.nativeSamples);
  assert.equal(source.completedSamples.length, source.nextSampleIndex);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory: spec.directory});
  await mkdir(spec.directory);
  const {observed, run} = observer(path.join(spec.directory, 'proof-processes'));
  const {manifestRef, manifest} = await createPresentationNativeLayerRecoveryManifestV001({
    file: path.join(spec.directory, 'raw-recovery-manifest.json'), nativeLayers: source.nativeLayers,
    sceneBindings: source.sceneBindings, outputArtifacts: source.outputArtifacts, processes: source.processes,
    inputRefs: source.inputManifest.inputRefs, candidateBindings: {viewSha256: view.viewSha256,
      candidateTrustRef, drawingRulesRef: edited.rules, drawingEvidenceRef: job.renderOptions.drawingEvidenceRef},
    sourceEvidenceRefs: [interruptionRef, await bind(spec.originalJobPath), checkpointRef]});
  const coverage = [];
  for (const selected of spec.representativeSources) {
    const layers = manifest.layers.filter(row => row.sourcePath === selected.path);
    assert(layers.length > 0, 'representative source missing: ' + selected.name);
    coverage.push({name: selected.name, sourcePath: selected.path, numerators: layers.map(row => row.numerator),
      paths: layers.map(row => row.rawRef.path)});
  }
  assert.deepEqual([...new Set(coverage.flatMap(row => row.numerators))].sort(), [1, 2, 3, 4]);
  for (const name of ['Normal', 'Color', 'Panel', 'Scale', 'Bounce', 'Shake'])
    assert(coverage.some(row => row.name === name), 'representative coverage missing: ' + name);
  const proofs = [];
  for (const [index, raw] of [...new Set(coverage.flatMap(row => row.paths))].entries()) {
    // The recovery instruction requires a small proof before freeing raw input.
    // Keep this diagnostic copy to one 8.3 MB layer; it never starts native QC.
    const proof = await provePresentationNativeLayerRecoveryV001({manifestRef, paths: [raw],
      directory: path.join(spec.directory, 'representative-proof-' + index), run});
    assert.equal(proof.status, 'passed'); proofs.push({proofRef: proof.proofRef, proof: proof.proof});
  }
  const proofPath = path.join(spec.directory, 'representative-proof.json');
  await save(proofPath, {status: 'passed', proofs, coverage, processTimings: observed.getPerformance(),
    elapsedSeconds: (performance.now() - started) / 1000});
  const controllerRefs = await Promise.all([self,
    path.join(root, 'evals/clip_composition/presentation_native_layer_recovery_v001.mjs'),
    path.join(root, 'evals/clip_composition/presentation_native_resume_v001.mjs'),
    path.join(root, 'evals/clip_composition/presentation_native_resume_integrity_v001.mjs')].map(bind));
  const recovery = {schemaVersion: 'caption-readability-native-recovery-job-v001', head: head(),
    originalJobRef: await bind(spec.originalJobPath), checkpointRef, interruptionRef, manifestRef,
    preparationRef: await bind(path.join(low.state.scratchDirectory, 'native-qc-preparation/preparation.json')),
    proofRef: await bind(proofPath), controllerRefs, directory: spec.directory,
    nativeDirectory: path.join(low.state.workDirectory, 'native-recovery-v001'),
    nativeMedia: {base: source.inputManifest.inputRefs.find(ref => ref.role === 'base-media'),
      completed: source.inputManifest.inputRefs.find(ref => ref.role === 'completed-media')},
    nativeTools: {ffmpeg: source.inputManifest.inputRefs.find(ref => ref.role === 'tool-ffmpeg'),
      imageMagick: source.inputManifest.inputRefs.find(ref => ref.role === 'tool-imagemagick')},
    capacity: job.capacity, oldReceiptCount: source.completedSamples.length,
    humanQuality: 'not-evaluated', productionDefaultChanged: false};
  await save(path.join(spec.directory, 'job.json'), recovery);
  return recovery;
}

export async function validateReadabilityNativeRecoveryV001(file) {
  const started = performance.now(), {recovery, saved} = await readRecovery(file);
  const preparation = await json(recovery.preparationRef.path);
  const materializer = await openPresentationNativeLayerRecoveryV001({manifestRef: recovery.manifestRef,
    run: () => assert.fail('input-only admission cannot execute a child')});
  const result = await validatePresentationNativeResumeInputsV001({plan: saved.state.plan,
    records: preparation.records, provenance: preparation.provenance, media: recovery.nativeMedia,
    tools: recovery.nativeTools, interruptionRef: recovery.interruptionRef, materializer,
    recoveryBinding: {manifestRef: recovery.manifestRef, controllerRefs: recovery.controllerRefs}, renderRange: null});
  const outcome = {status: result.status, admission: result.admission, receiptByteAdmission: result.receiptByteAdmission,
    jobRef: await bind(file),
    elapsedSeconds: (performance.now() - started) / 1000, generatedImages: 0, releasedRaw: 0};
  await save(path.join(recovery.directory, 'input-admission.json'), outcome); return outcome;
}

const qcInput = (state, completed) => ({plan: state.plan, applicationResults: state.applicationResults,
  overlayInspections: completed.inspections, mediaInspection: state.outputMedia,
  expectedAudio: state.completedExpectedAudio, expectedFrameCount: state.expectedFrameCount, canvas: state.plan.canvas,
  requireFinalVisibility: true, completedFrameQcEvidence: completed.evidence, renderRange: null,
  currentCompletedMediaRef: completed.evidence.exactReplay.inputManifest.refs.find(ref => ref.role === 'completed-media')});

/** The accepted recovery boundary: release only the manifest-listed new raw
 * inputs after the diagnostic proof, then observe the unchanged native floor. */
export async function releaseReadabilityRecoveryRawV001(file) {
  const {recovery, job} = await readRecovery(file), before = await disk();
  const admission = await json(path.join(recovery.directory, 'input-admission.json'));
  await verify(admission.jobRef); assert.equal(admission.jobRef.path, file);
  assert.equal(admission.status, 'fixed-inputs-and-prefix-structure-verified');
  const materializer = await openPresentationNativeLayerRecoveryV001({manifestRef: recovery.manifestRef,
    run: () => assert.fail('release phase must not generate anything')});
  const released = await materializer.releaseAll(), after = await disk();
  const result = {status: 'raw-released', before, after, released, manifestRef: recovery.manifestRef,
    proofRef: recovery.proofRef, oldArtifactsDeleted: 0, nativeReexecuted: false};
  await save(path.join(recovery.directory, 'raw-release.json'), result);
  const control = createReadabilityCapacityControlV001({capacity: job.capacity});
  await control.beforeHeavyBatch({phase: 'post-recovery-native-resume-admission'});
  return result;
}

export async function runReadabilityNativeRecoveryV001(file) {
  const startedAt = new Date().toISOString(), started = performance.now();
  const {recovery, job, view, edited, saved, candidateTrustRef} = await readRecovery(file);
  const directory = recovery.directory, state = saved.state;
  const pulseProofRef = await bind(path.join(directory, 'pulse-fixture/diagnostic/proof.json'));
  const pulseProof = await json(pulseProofRef.path);
  assert.equal(pulseProof.status, 'passed'); assert.equal(pulseProof.proofs.length, 20);
  assert(pulseProof.proofs.every(row => row.byteEquality === true));
  const {observed, run} = observer(path.join(directory, 'processes'));
  const log = async event => {
    const row = {...event, observedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000};
    await appendFile(path.join(directory, 'progress.jsonl'), JSON.stringify(row) + '\n');
    if (['native-sample-complete', 'recovery-start', 'raw-release-complete', 'native-complete', 'complete'].includes(row.phase)
      || row.status === 'capacity-interrupted') process.stdout.write(JSON.stringify(row) + '\n');
  };
  await save(path.join(directory, 'execution-start.json'), {startedAt, jobRef: await bind(file), pulseProofRef,
    processId: process.pid, disk: await disk()});
  const control = createReadabilityCapacityControlV001({capacity: job.capacity, record: log});
  const recoveryBinding = {manifestRef: recovery.manifestRef, controllerRefs: recovery.controllerRefs};
  const materializer = await openPresentationNativeLayerRecoveryV001({manifestRef: recovery.manifestRef, run,
    beforeHeavyBatch: control.beforeHeavyBatch, onEvent: log});
  try {
    await log({phase: 'recovery-start', disk: await disk(), bodyAndReplayReexecuted: false});
    await materializer.releaseAll();
    await log({phase: 'raw-release-complete', disk: await disk(), metrics: materializer.metrics});
    await control.beforeHeavyBatch({phase: 'resume-existing-native', plannedLogicalBytes: 0});
    const preparation = await json(recovery.preparationRef.path);
    const finite = await inspectPresentationNativeResumeV001({plan: state.plan, records: preparation.records,
      provenance: preparation.provenance, media: recovery.nativeMedia, tools: recovery.nativeTools,
      interruptionRef: recovery.interruptionRef, newDirectory: recovery.nativeDirectory,
      materializer, recoveryBinding, run, executionControl: control});
    await log({phase: 'native-complete', status: finite.status, violations: finite.violations,
      samples: finite.evidence.samples.length, performance: finite.performance});
    assert.equal(finite.evidence.samples.length, job.expected.nativeSamples);
    assert.equal(finite.evidence.samples.reduce((sum, sample) => sum + sample.references.length, 0), job.expected.logicalCandidates);
    const replay = await json(saved.replayRef.path);
    const completed = combinePresentationNativeResumeIntegrityQcV001({plan: state.plan, finite, replay,
      expectedFrameCount: state.expectedFrameCount, currentCompletedMediaRef: recovery.nativeMedia.completed,
      mediaInspection: state.outputMedia, renderRange: null});
    const finalQc = evaluatePresentationNativeResumeRendererQcV001(qcInput(state, completed));
    const draw = {exitCode: finalQc.status === 'passed' ? 0 : 1, outputDirectory: state.outputDirectory,
      reservation: state.reservation, workDirectory: state.workDirectory, stagingDirectory: state.stagingDirectory,
      scratchDirectory: state.scratchDirectory, cleanupWarnings: state.cleanupWarnings,
      overlayRecords: state.overlayRecords.map((record, index) => ({...record, inspection: completed.inspections[index]})),
      applicationResults: state.applicationResults, baseExpectedAudio: state.baseExpectedAudio,
      completedExpectedAudio: state.completedExpectedAudio, outputMedia: state.outputMedia, finalQc,
      workVideo: state.workVideo, resolvedPlan: state.plan, presentationTimeline: state.presentationTimeline,
      counterfactualQcExecuted: true, orchestrationInput: state.orchestrationInput,
      orchestrationBackground: state.orchestrationBackground, audioMediaPath: state.audioMediaPath,
      renderRange: null, renderScope: edited.scope, completedFrameQc: completed, nativeRecovery: recoveryBinding};
    await writePresentationQcEvidenceV001(path.join(directory, 'draw-result.json'), draw);
    assert.equal(completed.status, 'passed', 'native/replay integration has unresolved violations');
    assert.equal(finalQc.status, 'passed', 'final QC has unresolved violations');
    const finalAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: state.workVideo,
      logicalSampleCount: edited.scope.playbackEndSampleExclusive - edited.scope.playbackStartSample,
      sampleRate: view.projection.sourceClock.playbackSampleRate, ...saved.toolPaths});
    for (const ref of [...job.protectedRefs, job.renderOptions.drawingEvidenceRef, edited.backgroundProofRef]) await verify(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(edited.rules);
    await verifyEditedOrchestrationCandidateTrustV001({candidateTrustRef, view,
      drawingRulesRef: edited.rules, drawingEvidenceRef: job.renderOptions.drawingEvidenceRef});
    const rendered = await bind(state.workVideo);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: state.stagingDirectory,
      outputDirectory: state.outputDirectory, reservation: state.reservation});
    assert.equal(publication.status, 'published');
    const candidateVideo = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(candidateVideo.fileSha256, rendered.fileSha256);
    const nativeQcPublication = await createPresentationNativePublicationBindingV001({finiteState: finite.evidence,
      stagingDirectory: state.stagingDirectory, publication, candidateVideo});
    const result = {schemaVersion: 'presentation-edited-render-completion-v001', status: 'passed', candidateVideo,
      viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256, fourSavedSha256: view.fourSavedSha256,
      drawingRulesRef: edited.rules, range: {startFrame: 0, endFrameExclusive: state.expectedFrameCount},
      scope: edited.scope, qcScope: 'full-digest', expectedFrameCount: state.expectedFrameCount,
      sourceReferences: [job.renderOptions.drawingEvidenceRef, view.sourceRefs.planRef, view.sourceRefs.timelineRef,
        view.sourceRefs.mediaRef, view.sourceRefs.decisionInputRef, view.sourceRefs.pulseTimingEvidence.sourceRef,
        view.sourceRefs.pulseTimingEvidence.candidatesRef, view.sourceRefs.pulseTimingEvidence.peaksRef],
      finalAudioClock, outputMedia: state.outputMedia, background: edited.background, backgroundProofRef: edited.backgroundProofRef,
      finalQc, completedFrameQc: completed, publication, nativeQcPublication,
      candidateExecution: {...view.candidateExecution, candidateTrustRef}, formalTrustChanged: false,
      humanQuality: 'not-evaluated', paidApiCalls: 0, newExternalMediaTransfers: 0,
      nativeRecovery: {...recoveryBinding, interruptionRef: recovery.interruptionRef,
        bodyAndReplayReexecuted: false, oldReceiptCount: recovery.oldReceiptCount,
        resumedReceiptCount: finite.evidence.samples.length - recovery.oldReceiptCount},
      previousCompletedWork: edited.completedWork, processTimings: observed.getPerformance(),
      nativeAssets: edited.completedWork.nativeAssets,
      timingScope: 'native continuation and final save; earlier body/replay are separately recorded reused work',
      elapsedSeconds: (performance.now() - started) / 1000, nativePerformance: finite.performance};
    await writePresentationQcEvidenceV001(path.join(directory, 'completion.json'), result);
    const summary = {status: 'passed', startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - started) / 1000, completionRef: await bind(path.join(directory, 'completion.json')),
      drawRef: await bind(path.join(directory, 'draw-result.json')), video: candidateVideo, disk: await disk(),
      nativeSamples: finite.evidence.samples.length, nativePerformance: finite.performance,
      parentMaximumRssBytes: process.resourceUsage().maxRSS * 1024, memoryScope: 'Node parent only',
      humanQuality: 'not-evaluated', productionDefaultChanged: false};
    await save(path.join(directory, 'execution-result.json'), summary);
    await log({phase: 'complete', video: candidateVideo, elapsedSeconds: summary.elapsedSeconds});
    return summary;
  } catch (error) {
    await save(path.join(directory, 'execution-failure.json'), {status: 'incomplete', startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
      message: String(error), stack: error.stack, nativeResumeFailure: error.nativeResumeFailure ?? null,
      capacityObservation: error.capacityObservation ?? null, disk: await disk()});
    throw error;
  }
}

/** Independent process: restore real raw inputs for each unchanged reader call.
 * Published input paths are resolved only by the validated publication binding. */
export async function rereadReadabilityNativeRecoveryV001(file) {
  const started = performance.now();
  const {recovery, job, view, saved} = await readRecovery(file, {beforePublication: false});
  const directory = recovery.directory, summary = await json(path.join(directory, 'execution-result.json'));
  await verify(summary.completionRef); await verify(summary.drawRef);
  const result = await readPresentationQcEvidenceV001(summary.completionRef.path, {expectedFileSha256: summary.completionRef.fileSha256});
  const draw = await readPresentationQcEvidenceV001(summary.drawRef.path, {expectedFileSha256: summary.drawRef.fileSha256});
  assert.equal(result.status, 'passed'); assert.equal(draw.exitCode, 0);
  assert.deepEqual(result.finalQc, draw.finalQc); assert.deepEqual(draw.resolvedPlan, view.resolvedPlan);
  const completed = draw.completedFrameQc, finite = completed.evidence.finiteState;
  const publication = {binding: result.nativeQcPublication, finiteState: finite,
    candidateVideo: result.candidateVideo, publication: result.publication};
  const mapping = new Map(result.nativeQcPublication.files.map(row => [row.sourcePath, row.publishedPath]));
  const {observed, run} = observer(path.join(directory, 'independent-read-processes'));
  const control = createReadabilityCapacityControlV001({capacity: job.capacity,
    record: event => appendFile(path.join(directory, 'independent-read-capacity.jsonl'), JSON.stringify(event) + '\n')});
  const materializer = await openPresentationNativeLayerRecoveryV001({manifestRef: recovery.manifestRef, run,
    resolveInputPath: file => mapping.get(file) ?? file, beforeHeavyBatch: control.beforeHeavyBatch});
  const recoveryBinding = {manifestRef: recovery.manifestRef, controllerRefs: recovery.controllerRefs};
  const receipts = await verifyPresentationNativeResumeReceiptsV001({samples: finite.samples, materializer,
    publication, oldReceiptCount: recovery.oldReceiptCount, recoveryBinding});
  const outputs = await verifyPresentationNativeResumeOutputArtifactsV001({artifacts: finite.outputArtifacts,
    materializer, publication, recoveryBinding});
  for (const ref of [result.candidateVideo, ...finite.inputManifest.inputRefs,
    ...completed.evidence.exactReplay.inputManifest.refs, ...completed.evidence.exactReplay.generatedArtifacts]) await verify(ref, mapping);
  const gate = evaluatePresentationNativeResumeRendererQcV001(qcInput(saved.state, completed));
  assert.deepEqual(gate, draw.finalQc, 'independent final gate differs'); assert.equal(gate.status, 'passed');
  const materializationPath = path.join(directory, 'independent-materialization.json');
  await writePresentationQcEvidenceV001(materializationPath, materializer.getProvenance());
  const outcome = {status: 'passed', processId: process.pid, endedAt: new Date().toISOString(),
    elapsedSeconds: (performance.now() - started) / 1000, receiptVerification: receipts, outputVerification: outputs,
    materializationEvidenceRef: await bind(materializationPath),
    processTimings: observed.getPerformance(), regeneratedVideo: false, finalQcStatus: gate.status,
    nativeSamples: finite.samples.length, humanQuality: 'not-evaluated', productionDefaultChanged: false};
  await save(path.join(directory, 'independent-reread.json'), outcome); return outcome;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, file] = process.argv.slice(2);
  const result = mode === 'prepare' ? await prepareReadabilityNativeRecoveryV001(file)
    : mode === 'validate' ? await validateReadabilityNativeRecoveryV001(file)
    : mode === 'release' ? await releaseReadabilityRecoveryRawV001(file)
    : mode === 'run' ? await runReadabilityNativeRecoveryV001(file)
    : mode === 'reread' ? await rereadReadabilityNativeRecoveryV001(file)
    : assert.fail('usage: prepare|validate|release|run|reread absolute-spec-or-job.json');
  process.stdout.write(JSON.stringify({mode, status: result.status ?? 'prepared'}) + '\n');
}

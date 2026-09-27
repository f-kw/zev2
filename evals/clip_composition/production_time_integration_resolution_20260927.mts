/** 14.7 only: attach the existing 000103 diagnosis to an independently verified identical video.
 * The native/final QC failure remains unchanged. No renderer exception or media generation is added. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, readFile, readdir, realpath, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001} from './presentation_orchestration_edited_render_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_BASIS_V001, validatePresentationNativeFrameQcInspectionsV001}
  from './presentation_native_frame_qc_v001.mjs';
import {checkFiniteExecutionEvidence} from './presentation_integrity_state_qc_v001.mjs';
import {createPresentationNativePublicationBindingV001, verifyPresentationNativeSampleReceiptsV001}
  from './presentation_native_qc_streaming_v001.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {evaluatePresentationRendererQcV002, inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from './presentation_orchestration_background_v001.mjs';
import {buildPresentationRenderApplicationResultsV002, publishPresentationArtifactsV002, PRESENTATION_RENDERER_OUTPUT_NAMES as names}
  from './render_presentation_v002.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OLD = path.join(ROOT, 'runtime/artifacts/digest-new-material-20260926-v001/presentation');
const ORIGINAL_VIDEO_SHA = '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a';
const BASELINE = {path: path.join(ROOT, 'runtime/artifacts/qc-evidence-common-20260927-v001/measurement-v003/shared-qc.json'),
  fileSha256: '89a37d22c3d6ad66a8a12dda2dcdebaac86ee51a3bf3b3c2316417d3267e5d29'};
const DIAGNOSIS = {path: path.join(OLD, 'codec-diagnosis-000103-v001/result.json'),
  fileSha256: 'b63e029b090f19ff341b3029b39bc6d70f40f0ca278543eb49a85a5313c4ff76'};
const OLD_RESOLUTION = {path: path.join(OLD, 'qc-resume-attempt-002/resolved-codec-v001/resolution.json'),
  fileSha256: 'e584010b6bd3be6d434c29c75a1732219022fe71b2ddc4e504dfe44f4e376db2'};
const ALIGNMENT = {path: path.join(OLD, 'codec-diagnosis-000103-v001/window-alignment-proof.json'),
  fileSha256: 'cfa3f31dea8544f0c46828f934b1a1a8ecdd4823a61ca127006cade318ff1d87'};
const TARGET = 'new-material-digest-20260926-v001-instruction-instruction-000103';
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const save = (file: string, value: unknown) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file: string) {
  const metadata = await lstat(file); assert(metadata.isFile() && !metadata.isSymbolicLink(), 'evidence must be a regular file');
  const digest = createHash('sha256'); for await (const bytes of createReadStream(file)) digest.update(bytes);
  return {path: path.resolve(file), bytes: metadata.size, fileSha256: digest.digest('hex')};
}
async function verify(ref: any, mapped?: Map<string, string>) {
  const actual = await bind(mapped?.get(ref.path) ?? ref.path);
  assert.equal(actual.fileSha256, ref.fileSha256, 'input/evidence SHA changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(actual.bytes, ref.bytes, 'input/evidence size changed');
  return actual;
}
async function boundJson(ref: any) {await verify(ref); return json(ref.path);}
async function readShared(ref: any) {return readPresentationQcEvidenceV001(ref.path, {expectedFileSha256: ref.fileSha256});}
async function equalFiles(left: string, right: string) {
  const size = (await stat(left)).size; assert.equal((await stat(right)).size, size);
  const [a, b] = await Promise.all([open(left, 'r'), open(right, 'r')]);
  const leftBuffer = Buffer.allocUnsafe(4 * 1024 * 1024), rightBuffer = Buffer.allocUnsafe(leftBuffer.length);
  try {
    for (let offset = 0; offset < size;) {
      const wanted = Math.min(leftBuffer.length, size - offset);
      const [ar, br] = await Promise.all([a.read(leftBuffer, 0, wanted, offset), b.read(rightBuffer, 0, wanted, offset)]);
      assert.equal(ar.bytesRead, wanted); assert.equal(br.bytesRead, wanted);
      assert(leftBuffer.subarray(0, wanted).equals(rightBuffer.subarray(0, wanted)), 'new MP4 is not byte-identical to the diagnosed video');
      offset += wanted;
    }
  } finally {await Promise.all([a.close(), b.close()]);}
  return size;
}
function sampleMeaning(sample: any) {
  return {instructionId: sample.instructionId, frame: sample.frame, mediaFrame: sample.mediaFrame,
    crop: sample.crop, expectedState: sample.expectedState, expectedOverlaySha256: sample.expectedOverlaySha256,
    completedRgbSha256: sample.completedRgbSha256, expectedClassId: sample.expectedClassId,
    omittedClassId: sample.omittedClassId, visible: sample.visible,
    references: sample.references.map(({rgbPath: _path, ...ref}: any) => ref), classes: sample.classes};
}
function onlyOriginalFailure(violations: any[]) {
  assert.equal(violations.length, 1); assert.equal(violations[0].code, 'NATIVE_FRAME_QC_INVALID');
  assert.equal(violations[0].instructionId, TARGET);
}
async function compareBaseline(completed: any) {
  const baseline: any = await readShared(BASELINE), finite = completed.evidence.finiteState;
  assert.equal(completed.inspections.length, 326); assert.equal(finite.samples.length, 424);
  assert.equal(baseline.inspections.length, 326); assert.equal(baseline.evidence.samples.length, 424);
  onlyOriginalFailure(completed.violations); assert.deepEqual(completed.violations, baseline.violations);
  let logicalCandidates = 0;
  for (const [index, sample] of finite.samples.entries()) {
    assert.deepEqual(sampleMeaning(sample), sampleMeaning(baseline.evidence.samples[index]), 'native candidate meaning/order differs at sample ' + index);
    logicalCandidates += sample.references.length;
  }
  assert.equal(logicalCandidates, 320439);
  const targets = finite.samples.filter((sample: any) => sample.instructionId === TARGET);
  assert.equal(targets.length, 1); const target = targets[0];
  assert.equal(target.frame, 7801); assert.equal(target.references.length, 757); assert.equal(target.classes.length, 741);
  assert.equal(target.visible, false);
  assert.equal(target.classes.find((row: any) => row.referenceIds.includes('expected')).absoluteRgbDifference, 1345125);
  assert.equal(target.classes.find((row: any) => row.referenceIds.includes('add-caption-101-native-static')).absoluteRgbDifference, 1344947);
  return {baseline: BASELINE, sampleCount: 424, instructionCount: 326, logicalCandidates,
    candidateOrderRgbHashesClassesDistancesVerdictsEqual: true, target,
    equalityScope: 'All saved candidate IDs/order/RGB SHA/classes/exact distances/verdicts compared. No comparison image regeneration or new all-candidate Buffer.equals; the earlier 14.8.2 byte experiment remains separate.'};
}
async function verifyHistoricalDiagnosis(currentVideo: any, target: any, records: any[]) {
  const [diagnosis, resolution, alignment] = await Promise.all([boundJson(DIAGNOSIS), boundJson(OLD_RESOLUTION), boundJson(ALIGNMENT)]);
  assert.equal(diagnosis.status, 'resolved'); assert.equal(resolution.status, 'passed-with-resolved-codec-ambiguity');
  assert.equal(diagnosis.originalVideo.fileSha256, ORIGINAL_VIDEO_SHA); assert.equal(currentVideo.fileSha256, ORIGINAL_VIDEO_SHA);
  assert.equal(diagnosis.originalNativeFailurePreserved, true); assert.equal(diagnosis.uniqueMinimum, 'expected');
  assert.deepEqual(diagnosis.distances, {expected: 1062962, duplicate: 1283841});
  assert.equal(diagnosis.activePngLayers, 1); assert.equal(diagnosis.nativeQcSamples, 424); assert.equal(diagnosis.nativeQcPassed, 423);
  assert.equal(resolution.diagnosis.fileSha256, DIAGNOSIS.fileSha256); onlyOriginalFailure(resolution.nativeQc.originalViolations);
  for (const ref of [diagnosis.originalVideo, diagnosis.toolIdentity, diagnosis.renderGraphProof, diagnosis.completedReference,
    ...diagnosis.diagnosticFiles, resolution.originalFiniteRef, resolution.fullFinalQc,
    resolution.toolPathNormalization, alignment.originalBaseFrame]) await verify(ref);
  const graph = await boundJson(diagnosis.renderGraphProof), identity = await boundJson(diagnosis.toolIdentity);
  await verify(graph.executedRequest);
  for (const caption of graph.captions) await verify({path: caption.pngPath, fileSha256: caption.pngSha256});
  assert.equal(graph.target, 7801); assert.equal(graph.targetPngActiveLayerCount, 1);
  assert.equal(graph.videoRef.fileSha256, ORIGINAL_VIDEO_SHA);
  assert.equal(alignment.targetFrame, 7801); assert.equal(alignment.localFrame, 212);
  assert.equal(alignment.windowBackgroundRgbEqualsOriginalBaseFrame, true);
  assert.equal(target.completedRgbSha256, diagnosis.completedReference.fileSha256);
  const active = records.filter(record => record.element.startFrame <= 7801 && 7801 < record.element.endFrameExclusive);
  assert.equal(active.length, 1); assert.equal(active[0].element.instructionId, TARGET);
  assert.equal(active[0].pngSha256, target.expectedOverlaySha256);
  const previous = records.find(record => record.element.instructionId.endsWith('000102'));
  assert(previous); assert.equal(previous.pngSha256, active[0].pngSha256);
  for (const record of [previous, active[0]]) {
    const old = graph.captions.find((row: any) => row.instructionId === record.element.instructionId); assert(old);
    assert.equal(record.element.startFrame, old.startFrame); assert.equal(record.element.endFrameExclusive, old.endFrameExclusive);
    assert.equal(record.pngSha256, old.pngSha256);
  }
  const comparedBytes = await equalFiles(currentVideo.path, diagnosis.originalVideo.path);
  await verify(currentVideo); await verify(diagnosis.originalVideo);
  return {diagnosis: DIAGNOSIS, originalResolution: OLD_RESOLUTION, alignment: ALIGNMENT,
    originalVideo: diagnosis.originalVideo, comparedMp4Bytes: comparedBytes, fullMp4BytesEqual: true,
    originalTargetRenderGraph: diagnosis.renderGraphProof, originalToolIdentity: diagnosis.toolIdentity,
    targetCurrentBinding: {instructionId: TARGET, frame: 7801, activeLayerCount: 1,
      pngSha256: active[0].pngSha256, startFrame: active[0].element.startFrame, endFrameExclusive: active[0].element.endFrameExclusive},
    meaning: 'Existing diagnosis applies to identical complete media bytes and identical current target/candidate evidence; historical graph/tool records remain historical, not claimed as this new execution.',
    identity};
}
async function verifyCurrentEvidence({completed, plan, publication = null}: any) {
  const finite = completed.evidence.finiteState;
  const receiptVerification = await verifyPresentationNativeSampleReceiptsV001({samples: finite.samples, publication});
  const mapping = new Map<string, string>((publication?.binding.files ?? []).map((row: any) => [row.sourcePath, row.publishedPath]));
  const seen = new Map<string, string>();
  for (const ref of [...finite.inputManifest.inputRefs, ...finite.outputArtifacts,
    ...completed.evidence.exactReplay.inputManifest.refs, ...completed.evidence.exactReplay.generatedArtifacts]) {
    assert(!seen.has(ref.path) || seen.get(ref.path) === ref.fileSha256, 'conflicting input SHA');
    if (!seen.has(ref.path)) {await verify(ref, mapping); seen.set(ref.path, ref.fileSha256);}
  }
  const native = validatePresentationNativeFrameQcInspectionsV001({plan, inspections: completed.inspections.map((row: any) =>
    ({...row, visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001}))});
  onlyOriginalFailure(native.violations); assert.equal(native.status, 'failed');
  assert.deepEqual(native.violations, completed.violations);
  checkFiniteExecutionEvidence(finite, completed.inspections, plan.canvas);
  return {receiptVerification, verifiedAdditionalFileCount: seen.size};
}

export async function resolveAndPublishIntegration({evidenceDirectory, outputDirectory, drawingEvidenceRef,
  drawingRulesRef, backgroundProofRef, toolPaths}: any) {
  for (const value of [evidenceDirectory, outputDirectory, drawingEvidenceRef?.path, backgroundProofRef?.path]) assert(path.isAbsolute(value ?? ''));
  const started = performance.now(), phases: any = {}, phaseIntervals: any = {};
  const timed = async (name: string, fn: () => Promise<any>) => {
    const startedAt = new Date().toISOString(), start = performance.now();
    try {return await fn();} finally {
      phases[name] = (performance.now() - start) / 1000;
      phaseIntervals[name] = {startedAt, endedAt: new Date().toISOString()};
    }};
  const destination = path.join(evidenceDirectory, 'same-media-codec-resolution'); await mkdir(destination);
  try {
    await verifyEditedOrchestrationDrawingRulesRefV001(drawingRulesRef);
    const startRef = await bind(path.join(evidenceDirectory, 'start.json')), start = await boundJson(startRef);
    assert.deepEqual(start.drawingEvidenceRef, drawingEvidenceRef); assert.deepEqual(start.rules, drawingRulesRef);
    for (const ref of start.sourceReferences) await verify(ref);
    const view = restoreOrchestrationDrawingViewEvidenceV001(await boundJson(drawingEvidenceRef));
    const drawRef = await bind(path.join(evidenceDirectory, 'draw-result.json')), draw: any = await readShared(drawRef);
    assert.equal(draw.exitCode, 1); assert.equal(draw.failure?.stage, 'post-render-qc');
    assert.equal(draw.failure.violations.length, 1); assert.equal(draw.failure.violations[0].code, 'COMPLETED_FRAME_QC_INVALID');
    const completedRef = draw.failure.nested?.failureFile; assert(completedRef, 'normal draw did not save complete failed QC');
    const completed: any = await timed('savedCurrentQcRead', () => readShared(completedRef));
    assert.equal(completed.status, 'failed'); onlyOriginalFailure(completed.violations);
    const warnings = draw.failure.cleanupWarnings;
    const work = path.resolve(ROOT, warnings.find((row: any) => row.code === 'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY')?.path ?? '');
    const lock = path.resolve(ROOT, warnings.find((row: any) => row.code === 'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY')?.path ?? '');
    const parent = path.dirname(outputDirectory), stagingDirectory = path.join(work, 'publish');
    assert.equal(path.dirname(work), parent); assert(path.basename(work).startsWith('.' + path.basename(outputDirectory) + '.presentation-renderer-v002-work-'));
    assert.equal(lock, path.join(parent, '.' + path.basename(outputDirectory) + '.presentation-renderer-v002.lock'));
    const ownerRef = await bind(path.join(lock, 'owner.json')), owner = await boundJson(ownerRef);
    assert.equal(owner.schemaVersion, 'presentation-render-output-lock-v002'); assert.equal(owner.outputDirectory, outputDirectory);
    const reservation = {outputDirectory, outputParent: parent, lockDirectory: lock, ownerFile: ownerRef.path, ownerToken: owner.ownerToken,
      workspaceRealPath: await realpath(ROOT), presentationRootRealPath: await realpath(path.join(ROOT, 'evals/clip_composition/outputs/presentation')),
      outputParentRealPath: await realpath(parent)};
    const planRef = await bind(path.join(work, 'scratch/native-qc-preparation/plan.json'));
    const preparationRef = await bind(path.join(work, 'scratch/native-qc-preparation/preparation.json'));
    const plan = await boundJson(planRef), preparation = await boundJson(preparationRef);
    assert.deepEqual(plan, view.resolvedPlan); assert.equal(plan.elements.length, 326);
    const currentVideo = await bind(path.join(stagingDirectory, names.video));
    const declaredVideo = completed.evidence.finiteState.inputManifest.inputRefs.find((ref: any) => ref.role === 'completed-media');
    assert.equal(declaredVideo.path, currentVideo.path); assert.equal(declaredVideo.fileSha256, currentVideo.fileSha256);
    const verification = await timed('currentInputsAndReceipts', () => verifyCurrentEvidence({completed, plan}));
    const comparison = await timed('savedFullBaselineReadAndCompare', () => compareBaseline(completed));
    const historical = await timed('sameMediaAndDiagnosisVerification', () => verifyHistoricalDiagnosis(currentVideo, comparison.target, preparation.records));
    assert.equal(completed.evidence.exactReplay.executableVersions.ffmpeg, historical.identity.version);
    assert.equal(completed.evidence.finiteState.executableVersions.ffmpeg, historical.identity.version);
    const background = await boundJson(backgroundProofRef); assert.equal(background.status, 'passed');
    for (const ref of [background.outputs.background, background.outputs.audio]) await verify(ref);
    const [outputMedia, audio] = await timed('currentMediaObservation', () => Promise.all([
      inspectRenderedMediaWithToolsV001(currentVideo.path, toolPaths), inspectRenderedMediaWithToolsV001(background.outputs.audio.path, toolPaths)]));
    assert.equal(outputMedia.video.frameCount, completed.evidence.exactReplay.expectedFrameCount);
    assert.equal(outputMedia.video.frameCount, view.projection.displayFrameCount);
    const applicationResults = buildPresentationRenderApplicationResultsV002(preparation.records);
    const expectedAudio = {present: true, ...audio.audio};
    const gateStartedAt = new Date().toISOString(), gateStarted = performance.now();
    const finalQc = evaluatePresentationRendererQcV002({plan, applicationResults, overlayInspections: completed.inspections,
      mediaInspection: outputMedia, expectedAudio, expectedFrameCount: view.projection.displayFrameCount,
      canvas: plan.canvas, requireFinalVisibility: true, completedFrameQcEvidence: completed.evidence, currentCompletedMediaRef: currentVideo});
    phases.finalQcEvaluation = (performance.now() - gateStarted) / 1000;
    phaseIntervals.finalQcEvaluation = {startedAt: gateStartedAt, endedAt: new Date().toISOString()};
    assert.equal(finalQc.status, 'failed'); assert.equal(finalQc.violations.length, 1);
    assert.equal(finalQc.violations[0].code, 'COMPLETED_FRAME_QC_INVALID'); assert.deepEqual(finalQc.violations[0].details.reasons, completed.violations);
    const finalAudioClock = await timed('currentAudioClock', () => inspectOrchestrationEncodedAudioV001({audioPath: currentVideo.path,
      logicalSampleCount: view.projection.displayPlaybackSampleCount, sampleRate: view.projection.sourceClock.playbackSampleRate, ...toolPaths}));
    assert.equal(finalAudioClock.status, 'passed'); assert.equal(outputMedia.audio.packetPayloadSha256, audio.audio.packetPayloadSha256);
    const finalQcPath = path.join(destination, 'original-validator-final-qc.json');
    const finalQcReceipt = await timed('finalQcSave', () => writePresentationQcEvidenceV001(finalQcPath, finalQc));
    const finalQcRef = {path: finalQcPath, bytes: finalQcReceipt.bytes, fileSha256: finalQcReceipt.fileSha256};
    const {target: _largeTarget, ...comparisonSummary} = comparison;
    const {identity: _identity, ...historicalSummary} = historical;
    const resolution = {schemaVersion: 'production-time-integration-codec-resolution-v001', status: 'passed-with-resolved-codec-ambiguity',
      sourceNormalDraw: drawRef, completedFrameQc: completedRef, originalValidatorFinalQc: finalQcRef,
      candidateBeforePublication: currentVideo, comparison: comparisonSummary, diagnosisReuse: historicalSummary,
      nativeQc: {status: 'failed', passedSamples: 423, totalSamples: 424, originalViolations: completed.violations},
      resolutionScope: 'Only this byte-identical 14.7 output and original 000103 ambiguity; native/final validators and original evidence remain unchanged.',
      unresolvedNativeViolations: 0, resolvedCodecDomainAmbiguities: 1, formalTrustChanged: false, humanQuality: 'not-evaluated'};
    const resolutionPath = path.join(destination, 'resolution.json'); await save(resolutionPath, resolution);
    const resolutionRef = await bind(resolutionPath);
    await save(path.join(stagingDirectory, names.plan), {...plan, schemaVersion: 'presentation-render-plan-v002',
      elements: preparation.records.map((record: any) => record.finalElement ?? {...record.element, overlaySha256: record.pngSha256})});
    await save(path.join(stagingDirectory, names.applicationResults), {schemaVersion: 'presentation-render-application-results-v002',
      rendererVersion: 'presentation-renderer-v002', presetRegistryVersion: plan.presetRegistryVersion, results: applicationResults});
    await save(path.join(stagingDirectory, names.qc), resolution);
    const output: any = {}, publishedFiles: any[] = [];
    for (const key of ['video', 'plan', 'applicationResults', 'qc'] as const) {
      const ref = await bind(path.join(stagingDirectory, names[key])); output[key + 'File'] = names[key]; output[key + 'FileSha256'] = ref.fileSha256;
      publishedFiles.push({...ref, path: path.join(outputDirectory, names[key])});
    }
    const overlays = [];
    for (const name of (await readdir(path.join(stagingDirectory, names.overlays))).sort()) {
      const ref = await bind(path.join(stagingDirectory, names.overlays, name));
      overlays.push({path: path.posix.join(names.overlays, name), fileSha256: ref.fileSha256});
      publishedFiles.push({...ref, path: path.join(outputDirectory, names.overlays, name)});
    }
    output.overlaySet = {directory: names.overlays, files: overlays, canonicalSha256: hash(overlays)};
    await save(path.join(stagingDirectory, names.manifest), {schemaVersion: 'production-time-integration-publication-v001', output,
      provenance: {drawingEvidenceRef, drawingRulesRef, backgroundProofRef, sourceNormalDraw: drawRef, completedFrameQc: completedRef,
        originalValidatorFinalQc: finalQcRef, resolutionRef, recoveredOwnedReservation: ownerRef}});
    const manifest = await bind(path.join(stagingDirectory, names.manifest)); publishedFiles.push({...manifest, path: path.join(outputDirectory, names.manifest)});
    await verifyEditedOrchestrationDrawingRulesRefV001(drawingRulesRef);
    for (const ref of start.sourceReferences) await verify(ref);
    await verify(backgroundProofRef); await verify(ownerRef); await verify(currentVideo);
    const publicationStartedAt = new Date().toISOString(), publicationStarted = performance.now();
    const publication = await publishPresentationArtifactsV002({stagingDirectory, outputDirectory, reservation});
    const candidateVideo = await bind(path.join(outputDirectory, names.video)); assert.equal(candidateVideo.fileSha256, currentVideo.fileSha256);
    const nativeQcPublication = await createPresentationNativePublicationBindingV001({finiteState: completed.evidence.finiteState,
      stagingDirectory, publication, candidateVideo});
    const publicationReceiptVerification = await verifyPresentationNativeSampleReceiptsV001({samples: completed.evidence.finiteState.samples,
      publication: {binding: nativeQcPublication, finiteState: completed.evidence.finiteState, publication, candidateVideo}});
    phases.publicationAndReceiptVerification = (performance.now() - publicationStarted) / 1000;
    phaseIntervals.publicationAndReceiptVerification = {startedAt: publicationStartedAt, endedAt: new Date().toISOString()};
    const completion = {schemaVersion: 'production-time-integration-completion-v001', status: resolution.status,
      candidateVideo, publication, nativeQcPublication, publishedFiles, resolutionRef, originalValidatorFinalQc: finalQcRef,
      sourceNormalDraw: drawRef, completedFrameQc: completedRef, sourceStart: startRef, originalPlan: planRef, originalPreparation: preparationRef,
      drawingEvidenceRef, drawingRulesRef, backgroundProofRef, outputMedia, expectedAudio, finalAudioClock,
      viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256, fourSavedSha256: view.fourSavedSha256,
      expectedFrameCount: view.projection.displayFrameCount, nativeQc: resolution.nativeQc,
      comparison: comparisonSummary, diagnosisReuse: historicalSummary, verification, publicationReceiptVerification,
      phasesSeconds: phases, phaseIntervals, elapsedSeconds: (performance.now() - started) / 1000,
      nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024,
      timingScope: 'Resolution continuation only, excludes normal draw and final completion serialization; full run is recorded by caller',
      noComparisonImageRegeneration: true, formalTrustChanged: false, humanQuality: 'not-evaluated'};
    const completionPath = path.join(evidenceDirectory, 'integration-completion.json');
    const completionReceipt = {path: completionPath, ...await writePresentationQcEvidenceV001(completionPath, completion)};
    await save(completionPath + '.receipt.json', completionReceipt);
    return {status: completion.status, completionPath, completionReceipt, candidateVideo, resolutionRef,
      nativeQc: resolution.nativeQc, phasesSeconds: phases, phaseIntervals, elapsedSeconds: (performance.now() - started) / 1000,
      nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024};
  } catch (error) {
    await save(path.join(destination, 'failure.json'), {status: 'failed', error: String(error), phasesSeconds: phases, phaseIntervals,
      elapsedSeconds: (performance.now() - started) / 1000}); throw error;
  }
}

/** Independent process entry: no saved success flag substitutes for current receipts or final gate. */
export async function rereadIntegrationCompletion({completionPath}: {completionPath: string}) {
  assert(path.isAbsolute(completionPath)); const started = performance.now();
  const receiptPath = completionPath + '.receipt.json', receipt = await json(receiptPath);
  assert.equal(receipt.path, completionPath); const completion: any = await readShared(receipt);
  assert.equal(completion.schemaVersion, 'production-time-integration-completion-v001');
  assert.equal(completion.status, 'passed-with-resolved-codec-ambiguity');
  for (const ref of completion.publishedFiles) await verify(ref);
  await verify(completion.candidateVideo); await verifyEditedOrchestrationDrawingRulesRefV001(completion.drawingRulesRef);
  for (const ref of [completion.drawingEvidenceRef, completion.backgroundProofRef, completion.sourceNormalDraw,
    completion.sourceStart, completion.originalPlan, completion.originalPreparation]) await verify(ref);
  const start = await boundJson(completion.sourceStart);
  assert.deepEqual(start.drawingEvidenceRef, completion.drawingEvidenceRef); assert.deepEqual(start.rules, completion.drawingRulesRef);
  for (const ref of start.sourceReferences) await verify(ref);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await boundJson(completion.drawingEvidenceRef));
  assert.equal(view.viewSha256, completion.viewSha256); assert.equal(view.projection.projectionSha256, completion.projectionSha256);
  const completed: any = await readShared(completion.completedFrameQc);
  const finalQc: any = await readShared(completion.originalValidatorFinalQc);
  const plan = await boundJson(completion.originalPlan), preparation = await boundJson(completion.originalPreparation);
  const verification = await verifyCurrentEvidence({completed, plan, publication: {binding: completion.nativeQcPublication,
    finiteState: completed.evidence.finiteState, publication: completion.publication, candidateVideo: completion.candidateVideo}});
  const comparison = await compareBaseline(completed);
  const historical = await verifyHistoricalDiagnosis(completion.candidateVideo, comparison.target, preparation.records);
  const {target: _largeTarget, ...comparisonSummary} = comparison;
  const {identity: _identity, ...historicalSummary} = historical;
  assert.deepEqual(comparisonSummary, completion.comparison);
  assert.deepEqual(historicalSummary, completion.diagnosisReuse);
  const resolution = await boundJson(completion.resolutionRef);
  assert.deepEqual(resolution.originalValidatorFinalQc, completion.originalValidatorFinalQc);
  assert.deepEqual(resolution.completedFrameQc, completion.completedFrameQc);
  assert.deepEqual(resolution.nativeQc, completion.nativeQc);
  assert.deepEqual(resolution.comparison, comparisonSummary); assert.deepEqual(resolution.diagnosisReuse, historicalSummary);
  const rebuilt = evaluatePresentationRendererQcV002({plan,
    applicationResults: buildPresentationRenderApplicationResultsV002(preparation.records), overlayInspections: completed.inspections,
    mediaInspection: completion.outputMedia, expectedAudio: completion.expectedAudio, expectedFrameCount: completion.expectedFrameCount,
    canvas: plan.canvas, requireFinalVisibility: true, completedFrameQcEvidence: completed.evidence,
    currentCompletedMediaRef: finalQc.currentCompletedMediaRef});
  assert.deepEqual(rebuilt, finalQc, 'independent final gate differs');
  assert.equal(finalQc.status, 'failed'); assert.equal(finalQc.violations.length, 1);
  assert.equal(finalQc.violations[0].code, 'COMPLETED_FRAME_QC_INVALID'); assert.deepEqual(finalQc.violations[0].details.reasons, completed.violations);
  const summary = {status: 'passed', meaning: 'Independent evidence verification passed; original native/final failure remains unchanged',
    completionReceipt: receipt, processId: process.pid, nativeStatus: 'failed', nativeViolations: completed.violations,
    finalQcStatus: finalQc.status, finalQcViolations: finalQc.violations, verification,
    sampleCount: comparison.sampleCount, logicalCandidates: comparison.logicalCandidates, comparedMp4Bytes: historical.comparedMp4Bytes,
    publishedVideo: completion.candidateVideo, elapsedSeconds: (performance.now() - started) / 1000,
    nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024, imageRegenerations: 0};
  await save(completionPath + '.reread.json', summary); return summary;
}

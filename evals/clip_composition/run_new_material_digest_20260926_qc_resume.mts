/** Resume only the interrupted verification of the unchanged, already encoded first draft. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {constants, createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {readFile, writeFile, mkdir, mkdtemp, copyFile, readdir, lstat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, ARTIFACTS} from './run_new_material_digest_20260926.mts';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {fileSha256V002, inspectRenderedMediaWithToolsV001, evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';
import {inspectPresentationNativeFrameQcV001, verifyPresentationNativeInputRefV001} from './presentation_native_frame_qc_v001.mjs';
import {combinePresentationIntegrityStateQcV001} from './presentation_integrity_state_qc_v001.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001, exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {inspectOrchestrationEncodedAudioV001} from './presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {buildPresentationRenderApplicationResultsV002, acquirePresentationOutputReservationV002,
  publishPresentationArtifactsV002, PRESENTATION_RENDERER_OUTPUT_NAMES as names} from './render_presentation_v002.mjs';

const root = path.join(ROOT, ARTIFACTS, 'presentation');
const retained = path.join(ROOT, 'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP');
const qcRoot = path.join(root, 'qc-resume-attempt-002');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');
export async function saveJsonInChunks(p: string, value: any) {
  // Preserve the JSON value while avoiding Node's single-string size limit.
  function* chunks(v: any, depth = 0): Generator<string> {
    if (depth >= 3 || v === null || typeof v !== 'object') {yield JSON.stringify(v); return;}
    if (Array.isArray(v)) {
      yield '[';
      for (let i = 0; i < v.length; i++) {if (i) yield ','; yield* chunks(v[i] === undefined ? null : v[i], depth + 1);}
      yield ']'; return;
    }
    yield '{'; let first = true;
    for (const key of Object.keys(v)) {
      if (v[key] === undefined) continue;
      if (!first) yield ','; first = false;
      yield JSON.stringify(key) + ':'; yield* chunks(v[key], depth + 1);
    }
    yield '}';
  }
  await mkdir(path.dirname(p), {recursive: true});
  await pipeline(Readable.from(chunks(value)), createWriteStream(p, {flags: 'wx'}));
}
const save = saveJsonInChunks;
const bind = async (p: string) => {const s = await lstat(p); assert(s.isFile() && !s.isSymbolicLink()); return {path: p, bytes: s.size, fileSha256: await fileSha256V002(p)};};
const tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe', imageMagickPath: '/opt/homebrew/bin/magick'};

async function inputs() {
  const failed = await read(path.join(root, 'draw-result-attempt-003.json'));
  assert.equal(failed.exitCode, 2); assert.equal(failed.failure.nested.phase, 'native-discriminator');
  assert.match(failed.failure.message, /greater than 2 GiB/);
  const prepared = await read(path.join(retained, 'scratch/native-qc-preparation/preparation.json'));
  const plan = await read(path.join(retained, 'scratch/native-qc-preparation/plan.json'));
  const replay = await read(path.join(retained, 'scratch/exact-replay-result.json'));
  assert.equal(replay.status, 'passed'); assert.deepEqual(replay.violations, []);
  assert.deepEqual(failed.failure.nested.replay, replay);
  assert.equal(sha(plan), prepared.provenance.planCanonicalSha256);
  const state: any = {};
  for (const name of ['captionAuto','captionOverrides','connectionAuto','connectionOverrides','selectionRecord']) state[name] = await read(path.join(root, 'saved', name + '.json'));
  assert.deepEqual(state.captionOverrides.entries, []); assert.deepEqual(state.connectionOverrides.entries, []);
  const context = createOrchestrationContextV001(await read(path.join(root, 'saved/source-bindings.json')));
  const view = resolveOrchestrationDrawingViewV001({context, state});
  assert.deepEqual(plan, view.resolvedPlan);
  assert.deepEqual(await read(path.join(retained, 'scratch/native-qc-preparation/orchestration-input.json')), exportOrchestrationDrawingViewEvidenceV001(view));
  const repairedPath = 'evals/clip_composition/presentation_native_frame_qc_v001.mjs';
  const historicalSource = (await promisify(execFile)('git', ['show', '6d720c64c5c60f2078beaf1621157adf182a88bd:' + repairedPath], {cwd: ROOT})).stdout;
  const historicalHash = createHash('sha256').update(historicalSource).digest('hex');
  // The completed replay used the recorded pre-fix verifier source. Preserve
  // that historical binding; do not rewrite it to claim it ran the new code.
  for (const ref of replay.evidence.inputManifest.refs) {
    if (ref.role === 'source:' + repairedPath) {
      assert.equal(ref.path, path.join(ROOT, repairedPath)); assert.equal(ref.fileSha256, historicalHash);
    } else await verifyPresentationNativeInputRefV001(ref);
  }
  for (const ref of prepared.provenance.inputRefs) await verifyPresentationNativeInputRefV001(ref);
  const video = path.join(retained, 'publish', names.video), videoRef = await bind(video);
  const decode = await read(path.join(ROOT, ARTIFACTS, 'full-decode-verification.json'));
  assert.equal(decode.status, 'passed'); assert.equal(videoRef.fileSha256, decode.candidateSha256);
  const background = await read(path.join(root, 'background/proof.json'));
  assert.equal(background.status, 'passed'); assert.equal(background.projectionSha256, view.projection.projectionSha256);
  for (const ref of Object.values(background.outputs) as any[]) assert.deepEqual(await bind(ref.path), ref);
  return {prepared, plan, replay, video, videoRef, view, background, historicalSource, historicalHash};
}

export async function resumeQc() {
  const c = await inputs();
  await mkdir(qcRoot, {recursive: true});
  await writeFile(path.join(qcRoot, 'pre-fix-verifier.mjs'), c.historicalSource, {flag: 'wx'});
  await save(path.join(qcRoot, 'input-verification.json'), {status: 'passed', retainedVideo: c.videoRef,
    failedAttempt: await bind(path.join(root, 'draw-result-attempt-003.json')),
    preparation: await bind(path.join(retained, 'scratch/native-qc-preparation/preparation.json')),
    replay: await bind(path.join(retained, 'scratch/exact-replay-result.json')),
    historicalReplayVerifier: await bind(path.join(qcRoot, 'pre-fix-verifier.mjs')),
    replayVerifierSource: 'Git 6d720c64c5c60f2078beaf1621157adf182a88bd, exact historical SHA verified; saved replay evidence unchanged',
    currentVerificationImplementation: await bind(path.join(ROOT, 'evals/clip_composition/presentation_native_frame_qc_v001.mjs')),
    newVideoEncodes: 0, newOverlayRenders: 0, preservedInputHashes: true});
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(qcRoot, 'processes')});
  const finite = await inspectPresentationNativeFrameQcV001({plan: c.plan, records: c.prepared.records,
    provenance: c.prepared.provenance,
    media: {base: c.background.outputs.background, completed: c.videoRef},
    tools: {ffmpeg: {path: tools.ffmpegPath, fileSha256: await fileSha256V002(tools.ffmpegPath)},
      imageMagick: {path: tools.imageMagickPath, fileSha256: await fileSha256V002(tools.imageMagickPath)}},
    scratchDirectory: path.join(qcRoot, 'native'), processObserver: observer});
  return finishQc(c, finite);
}

async function finishQc(c: any, finite: any) {
  await save(path.join(qcRoot, 'finite-result.json'), finite);
  const outputMedia = await inspectRenderedMediaWithToolsV001(c.video, tools);
  const completed = combinePresentationIntegrityStateQcV001({plan: c.plan, replay: c.replay, finite,
    expectedFrameCount: c.view.projection.displayFrameCount, currentCompletedMediaRef: c.videoRef, mediaInspection: outputMedia});
  await save(path.join(qcRoot, 'completed-frame-qc.json'), completed);
  assert.equal(completed.status, 'passed', JSON.stringify(completed.violations));
  const audio = await inspectRenderedMediaWithToolsV001(c.background.outputs.audio.path, tools);
  const applicationResults = buildPresentationRenderApplicationResultsV002(c.prepared.records);
  const finalQc = evaluatePresentationRendererQcV002({plan: c.plan, applicationResults,
    overlayInspections: completed.inspections, mediaInspection: outputMedia,
    expectedAudio: {present: true, ...audio.audio}, expectedFrameCount: c.view.projection.displayFrameCount,
    canvas: c.plan.canvas, requireFinalVisibility: true, completedFrameQcEvidence: completed.evidence,
    currentCompletedMediaRef: c.videoRef});
  await save(path.join(qcRoot, 'final-qc.json'), finalQc);
  assert.equal(finalQc.status, 'passed', JSON.stringify(finalQc.violations));
  const finalAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: c.video,
    logicalSampleCount: c.view.projection.displayPlaybackSampleCount,
    sampleRate: c.view.projection.sourceClock.playbackSampleRate, ...tools});
  assert.equal(outputMedia.audio.packetPayloadSha256, audio.audio.packetPayloadSha256);
  await inputs(); // All fixed inputs and the completed video must still match after QC.
  const captured = await read(path.join(qcRoot, 'input-verification.json'));
  assert.deepEqual(await bind(captured.currentVerificationImplementation.path), captured.currentVerificationImplementation);
  await save(path.join(qcRoot, 'verified-completion.json'), {status: 'passed', retainedVideo: c.videoRef,
    outputMedia, finalAudioClock, counts: c.view.resolution.counts, captionCount: c.plan.elements.length,
    frameCount: c.view.projection.displayFrameCount,
    finalQc: {status: finalQc.status, instructionCount: finalQc.instructionCount, violations: finalQc.violations},
    finalQcRef: await bind(path.join(qcRoot, 'final-qc.json'))});
}

export async function publish() {
  const c = await inputs(), verified = await read(path.join(qcRoot, 'verified-completion.json'));
  assert.equal(verified.status, 'passed'); assert.deepEqual(verified.retainedVideo, c.videoRef);
  const finalQc = verified.finalQc; assert.equal(finalQc.status, 'passed');
  assert.deepEqual(await bind(verified.finalQcRef.path), verified.finalQcRef);
  const destination = path.join(ROOT, 'evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001');
  const reservation = await acquirePresentationOutputReservationV002(destination);
  const work = await mkdtemp(path.join(reservation.outputParent, '.new-material-digest-qc-resume.presentation-renderer-v002-work-'));
  const staging = path.join(work, 'publish'); await mkdir(staging); await mkdir(path.join(staging, names.overlays));
  await copyFile(c.video, path.join(staging, names.video), constants.COPYFILE_EXCL);
  const overlays = [];
  for (const name of (await readdir(path.join(retained, 'publish', names.overlays))).sort()) {
    const input = path.join(retained, 'publish', names.overlays, name), ref = await bind(input);
    await copyFile(input, path.join(staging, names.overlays, name), constants.COPYFILE_EXCL);
    overlays.push({path: path.posix.join(names.overlays, name), fileSha256: ref.fileSha256});
  }
  await save(path.join(staging, names.plan), {...c.plan, schemaVersion: 'presentation-render-plan-v002',
    elements: c.prepared.records.map((r: any) => r.finalElement ?? {...r.element, overlaySha256: r.pngSha256})});
  await save(path.join(staging, names.applicationResults), {schemaVersion: 'presentation-render-application-results-v002',
    rendererVersion: 'presentation-renderer-v002', presetRegistryVersion: c.plan.presetRegistryVersion,
    results: buildPresentationRenderApplicationResultsV002(c.prepared.records)});
  await copyFile(verified.finalQcRef.path, path.join(staging, names.qc), constants.COPYFILE_EXCL);
  const output: any = {};
  for (const key of ['video','plan','applicationResults','qc'] as const) {
    output[key + 'File'] = names[key]; output[key + 'FileSha256'] = await fileSha256V002(path.join(staging, names[key]));
  }
  output.overlaySet = {directory: names.overlays, files: overlays, canonicalSha256: sha(overlays)};
  await save(path.join(staging, names.manifest), {schemaVersion: 'new-material-digest-qc-resume-publication-v001', output,
    provenance: {retainedVideo: c.videoRef, qcInput: await bind(path.join(qcRoot,'input-verification.json')),
      completedFrameQc: await bind(path.join(qcRoot,'completed-frame-qc.json')), newVideoEncodes: 0, newOverlayRenders: 0}});
  const publication = await publishPresentationArtifactsV002({stagingDirectory: staging, outputDirectory: destination, reservation});
  const video = await bind(path.join(destination,names.video)); assert.equal(video.fileSha256,c.videoRef.fileSha256);
  await save(path.join(root,'first-draft-completion.json'), {...verified, video, publication,
    finalQc: {status: finalQc.status, instructionCount: finalQc.instructionCount, violations: finalQc.violations},
    completedFrameQc: await bind(path.join(qcRoot,'completed-frame-qc.json')),
    humanQualityAdjustment: false, completedAt: new Date().toISOString()});
  return {status: 'passed', video};
}

export async function recoverQc() {
  const c = await inputs();
  const {recoverNativeEvidence} = await import('./run_new_material_digest_20260926_qc_evidence_recovery.mts');
  const finite = await recoverNativeEvidence({c, qcRoot, tools});
  return finishQc(c, finite);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const stage=process.argv[2]; assert(['qc','recover','publish'].includes(stage));
  const startedAt=new Date().toISOString(), start=performance.now();
  try {const result=await (stage==='qc'?resumeQc():stage==='recover'?recoverQc():publish());
    await save(path.join(qcRoot,stage+'-execution.json'),{status:'completed',stage,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000});
    console.log(JSON.stringify(result ?? {status:'passed'}));
  } catch(error) {await save(path.join(qcRoot,stage+'-execution.json'),{status:'failed',stage,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,error:String(error)});throw error;}
}

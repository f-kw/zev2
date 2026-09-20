/** Q5-1: one unadopted media omission with one separately hidden caption, short output only.
 * Existing background extraction, base-media encoding and native drawing/QC are reused.
 * This adapter only joins the two retained pieces and binds the new content clock. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createQ5EditSourceV001, restoreQ5EditPlanV002, projectQ5ComparisonRangeV002} from './q5-edit-plan.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {buildOrchestrationRangeBackgroundWithObservationCopiesV001, verifyOrchestrationObservationCopiesV001,
  inspectOrchestrationEncodedAudioV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {buildPresentationBaseMediaVideoV001, muxPresentationBaseMediaV001}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {loadAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001}
  from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001}
  from '../../evals/clip_composition/presentation_integrity_state_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..');
const composition = path.join(repo, 'evals/clip_composition');
const registryPath = path.join(composition, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const nodePath = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
  imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'),
  layoutInspectorPath: path.join(composition, 'inspect_presentation_render_layout_v001.ts')};
const ORIGINAL_NORMAL_SHA = '665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34';
const digest = () => createHash('sha256');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const frameCount = range => range.endFrameExclusive - range.startFrame;

async function bind(file) {
  assert(path.isAbsolute(file), 'Q5 file reference must be absolute');
  const stat = await lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Q5 file reference must be regular');
  const hash = digest(); for await (const chunk of createReadStream(file)) hash.update(chunk);
  return {path: file, bytes: stat.size, fileSha256: hash.digest('hex')};
}
async function checkRef(ref) {
  assert(ref && /^[a-f0-9]{64}$/.test(ref.fileSha256), 'Q5 actual byte SHA required');
  const current = await bind(ref.path);
  assert.equal(current.fileSha256, ref.fileSha256, 'Q5 input bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(current.bytes, ref.bytes);
  return current;
}
async function absent(file) {
  try {await lstat(file); assert.fail('Q5 output already exists: ' + file);}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
}
async function command(executable, args, recordDirectory, label) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => {stdout += chunk; if (stdout.length > 32 * 1024 * 1024) child.kill();});
    child.stderr.on('data', chunk => {stderr = (stderr + chunk).slice(-65536);});
    child.once('error', reject); child.once('close', (code, signal) => resolve({code, signal, stdout, stderr}));
  });
  if (recordDirectory) await save(path.join(recordDirectory, label + '.json'), {executable, args, ...result});
  assert.equal(result.code, 0, result.stderr); assert.equal(result.signal, null);
  return result.stdout;
}

// A bounded paired reader compares every byte, independent of pipe chunk boundaries.
// Start consuming immediately so even a tiny fixture cannot exit before stdout is read.
function decoder(executable, args) {
  const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stderr = '', pending = Buffer.alloc(0), ended = false;
  child.stderr.on('data', chunk => {stderr = (stderr + chunk).slice(-65536);});
  const exit = new Promise(resolve => {
    child.once('error', error => resolve({code: null, error}));
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  const iterator = child.stdout[Symbol.asyncIterator]();
  const next = () => iterator.next().catch(error => ({error}));
  let nextChunk = next();
  return {
    async read(count) {
      const output = Buffer.allocUnsafe(count); let written = 0;
      while (written < count) {
        if (!pending.length && !ended) {
          const chunk = await nextChunk;
          if (chunk.error) throw chunk.error;
          ended = Boolean(chunk.done); pending = ended ? Buffer.alloc(0) : chunk.value;
          if (!ended) nextChunk = next();
        }
        if (ended && !pending.length) break;
        const take = Math.min(count - written, pending.length);
        pending.copy(output, written, 0, take); pending = pending.subarray(take); written += take;
      }
      return output.subarray(0, written);
    },
    async finish() {const result = await exit; assert.equal(result.code, 0, result.error?.message ?? stderr);},
    async stop() {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      child.stdout.destroy(); await exit;
    },
  };
}
const decodeArgs = (file, kind) => ['-v', 'error', '-nostdin', '-i', file,
  ...(kind === 'video' ? ['-map', '0:v:0', '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo']
    : ['-map', '0:a:0', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le']), '-'];

/** Public for direct small tests. It never treats AAC as retained PCM. */
export async function verifyQ5OrderedLosslessV001({pieces, joinedPath, canvas, pcmPath,
  ffmpegPath = tools.ffmpegPath, ffprobePath = tools.ffprobePath}) {
  assert.equal(pieces.length, 2, 'Q5 comparison requires exactly two ordered retained pieces');
  assert.equal(canvas.fps, 30); assert(canvas.width > 0 && canvas.width % 2 === 0 && canvas.height > 0 && canvas.height % 2 === 0);
  let expectedFrames = 0;
  for (const piece of pieces) {
    assert(Number.isSafeInteger(piece.frameCount) && piece.frameCount > 0);
    await checkRef(piece.mediaRef); expectedFrames += piece.frameCount;
  }
  const joinedRef = await bind(joinedPath);
  for (const file of [...pieces.map(piece => piece.mediaRef.path), joinedPath]) {
    const probe = JSON.parse(await command(ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', file]));
    assert.equal(probe.streams.length, 2, 'lossless file requires one video and one audio stream');
    const video = probe.streams.find(row => row.codec_type === 'video'), audio = probe.streams.find(row => row.codec_type === 'audio');
    assert(video && audio);
    assert.equal(video.codec_name, 'ffv1'); assert.equal(video.pix_fmt, 'yuv420p'); assert.notEqual(video.color_range, 'pc');
    assert.equal(video.width, canvas.width); assert.equal(video.height, canvas.height); assert.equal(video.r_frame_rate, '30/1');
    assert.equal(Number(video.start_time), 0); assert.equal(Number(audio.start_time), 0);
    assert.equal(audio.codec_name, 'pcm_f32le'); assert.equal(Number(audio.sample_rate), 48000); assert.equal(audio.channels, 2);
  }
  await absent(pcmPath);
  const results = {};
  for (const kind of ['video', 'audio']) {
    const bytesPerFrame = kind === 'video' ? canvas.width * canvas.height * 3 / 2 : 1600 * 2 * 4;
    const observed = decoder(ffmpegPath, decodeArgs(joinedPath, kind));
    const expectedHash = digest(), observedHash = digest(); let total = 0;
    const pcm = kind === 'audio' ? await open(pcmPath, 'wx') : null;
    try {
      for (const piece of pieces) {
        const expected = decoder(ffmpegPath, decodeArgs(piece.mediaRef.path, kind));
        try {
          let remaining = piece.frameCount * bytesPerFrame;
          while (remaining > 0) {
            const take = Math.min(65536, remaining);
            const [a, b] = await Promise.all([expected.read(take), observed.read(take)]);
            assert.equal(a.length, take, kind + ' retained piece ended early');
            assert.equal(b.length, take, kind + ' joined output ended early');
            assert(a.equals(b), kind + ' retained bytes differ at joined byte ' + total);
            expectedHash.update(a); observedHash.update(b);
            if (pcm) {
              let offset = 0;
              while (offset < b.length) {
                const {bytesWritten} = await pcm.write(b, offset, b.length - offset, null);
                assert(bytesWritten > 0); offset += bytesWritten;
              }
            }
            total += take; remaining -= take;
          }
          assert.equal((await expected.read(1)).length, 0, kind + ' retained piece has excess bytes');
          await expected.finish();
        } finally {await expected.stop();}
      }
      assert.equal((await observed.read(1)).length, 0, kind + ' joined output has excess bytes');
      await observed.finish();
      results[kind] = {status: 'passed', comparedBytes: total, expectedPayloadSha256: expectedHash.digest('hex'),
        observedPayloadSha256: observedHash.digest('hex'),
        ...(kind === 'video' ? {frameCount: expectedFrames} : {sampleRate: 48000, channels: 2, sampleCount: expectedFrames * 1600})};
    } finally {await observed.stop(); if (pcm) await pcm.close();}
  }
  for (const piece of pieces) await checkRef(piece.mediaRef);
  await checkRef(joinedRef);
  return {schemaVersion: 'digest-quality-q5-ordered-lossless-verification-v001', status: 'passed',
    orderedPieces: pieces, joinedRef, pcmRef: await bind(pcmPath), ...results,
    scope: 'every retained decoded YUV420p byte and stereo float32 PCM byte, in the specified piece order; before H.264/AAC encoding'};
}

export async function joinQ5LosslessPiecesV001({pieces, outputDirectory, canvas,
  ffmpegPath = tools.ffmpegPath, ffprobePath = tools.ffprobePath}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  assert.equal(pieces.length, 2);
  for (const piece of pieces) await checkRef(piece.mediaRef);
  await mkdir(outputDirectory);
  const joinedPath = path.join(outputDirectory, 'joined.nut');
  // Independent video/audio concat prevents automatic audio padding to a video segment's duration.
  const graph = '[0:v]setpts=N/(30*TB)[v0];[1:v]setpts=N/(30*TB)[v1];'
    + '[v0][v1]concat=n=2:v=1:a=0,setpts=N/(30*TB)[v];'
    + '[0:a]asettb=1/48000,asetpts=N[a0];[1:a]asettb=1/48000,asetpts=N[a1];'
    + '[a0][a1]concat=n=2:v=0:a=1,asettb=1/48000,asetpts=N[a]';
  await command(ffmpegPath, ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-filter_complex_threads', '1',
    '-i', pieces[0].mediaRef.path, '-i', pieces[1].mediaRef.path, '-filter_complex', graph,
    '-map', '[v]', '-map', '[a]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough',
    '-c:a', 'pcm_f32le', '-ar', '48000', '-ac', '2', '-f', 'nut', joinedPath], outputDirectory, 'join-command');
  const proof = await verifyQ5OrderedLosslessV001({pieces, joinedPath, canvas,
    pcmPath: path.join(outputDirectory, 'verified-pcm.f32le'), ffmpegPath, ffprobePath});
  await save(path.join(outputDirectory, 'proof.json'), proof);
  return {...proof, proofRef: await bind(path.join(outputDirectory, 'proof.json'))};
}

async function implementationRefs(rules) {
  const seen = new Set(rules.files.map(ref => ref.path)), extra = [];
  const walk = async file => {
    if (seen.has(file)) return;
    assert(file.startsWith(repo + path.sep)); seen.add(file); extra.push(await bind(file));
    const text = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
    for (const match of text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/gu)) {
      await walk(path.resolve(path.dirname(file), match[2]));
    }
  };
  await walk(fileURLToPath(import.meta.url));
  return extra;
}

/** Optional byte counts are checked against files separately, not treated as a different source identity. */
export function assertQ5OriginalBackgroundIdentityV001({sourceRefs, view}) {
  for (const key of ['planRef', 'timelineRef', 'mediaRef']) {
    assert.equal(view.sourceRefs[key].path, sourceRefs[key].path, 'Q4 background belongs to another source path');
    assert.equal(view.sourceRefs[key].fileSha256, sourceRefs[key].fileSha256, 'Q4 background belongs to another source SHA');
  }
  assert(view.resolution.connections.every(row => row.preset === 'normal-cut'), 'Q4 background extraction requires original normal cuts');
  assert.equal(view.projection.displayFrameCount, 44408); assert.equal(view.projection.sourceClock.playbackSampleRate, 48000);
}

/** A byte-bound evidence document must describe this exact saved edit and comparison context. */
export async function verifyQ5RetentionEvidenceV002({evidence, resolved, beforeRange}) {
  assert.equal(evidence.schemaVersion, 'q5-retention-priority-boundary-evidence-v002');
  assert(evidence.policyRef, 'Q5 boundary evidence must name its received policy');
  for (const key of ['path', 'fileSha256']) {
    assert.equal(evidence.policyRef[key], resolved.policyRef[key], 'Q5 boundary evidence policy identity differs');
  }
  const policyRef = await checkRef(evidence.policyRef);
  assert.equal(evidence.candidateId, resolved.candidateId, 'Q5 boundary evidence candidate differs');
  assert.equal(evidence.hiddenCaptionId, resolved.hiddenCaptionId, 'Q5 boundary evidence hidden caption differs');
  assert.deepEqual(evidence.actualMediaOmission, resolved.mediaOmission, 'Q5 boundary evidence media omission differs');
  assert.deepEqual(evidence.originalTargetRange, resolved.targetMediaRetention?.originalRange,
    'Q5 boundary evidence original target range differs');
  assert.deepEqual(evidence.comparisonBeforeRange, beforeRange, 'Q5 boundary evidence comparison context differs');
  return policyRef;
}

/** File-only input boundary: restore the saved whole-content edit, then derive the short clock again. */
export async function loadQ5RenderInputsV002(job) {
  assert.equal(job.schemaVersion, 'digest-quality-q5-render-job-v002');
  const refs = [job.sourceRef, job.editPlanRef, job.originalDrawingEvidenceRef, job.originalCompletedMediaRef];
  for (const ref of refs) await checkRef(ref);
  const saved = await json(job.editPlanRef.path);
  assert.equal(saved.schemaVersion, 'q5-content-edit-plan-v002', 'Q5 rendering requires an explicitly saved V002 content edit');
  for (const ref of [saved.policyRef, saved.boundaryEvidenceRef]) {await checkRef(ref); refs.push(ref);}
  assert.equal(job.originalCompletedMediaRef.fileSha256, ORIGINAL_NORMAL_SHA, 'Before must be the original Normal completion');
  const sourceInput = await json(job.sourceRef.path);
  assert(!Object.hasOwn(sourceInput, 'fixture'), 'fixture sources are not accepted by the real rendering entry');
  for (const key of ['planRef', 'timelineRef', 'mediaRef', 'basisEditPlanRef']) {await checkRef(sourceInput[key]); refs.push(sourceInput[key]);}
  const source = createQ5EditSourceV001({...sourceInput,
    planBytes: await readFile(sourceInput.planRef.path, 'utf8'), timelineBytes: await readFile(sourceInput.timelineRef.path, 'utf8'),
    basisEditPlanBytes: await readFile(sourceInput.basisEditPlanRef.path, 'utf8')});
  const resolved = restoreQ5EditPlanV002({source, saved});
  const comparison = projectQ5ComparisonRangeV002({source, resolved, beforeRange: job.beforeRange});
  refs.push(await verifyQ5RetentionEvidenceV002({evidence: await json(saved.boundaryEvidenceRef.path),
    resolved, beforeRange: job.beforeRange}));
  assert.equal(comparison.pieces.length, 2, 'render entry requires an active omission and exactly two retained pieces');
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(job.originalDrawingEvidenceRef.path));
  assertQ5OriginalBackgroundIdentityV001({sourceRefs: sourceInput, view});
  // Q4 caption choices are never passed to the new drawing call.
  const old = view.sourceRefs;
  const observationCopyBindings = await verifyOrchestrationObservationCopiesV001({pulseTimingEvidence: old.pulseTimingEvidence,
    originalObservationCopies: job.originalObservationCopies});
  for (const ref of [old.decisionInputRef, old.pulseTimingEvidence.sourceRef,
    ...observationCopyBindings.map(binding => binding.copyRef)]) {await checkRef(ref); refs.push(ref);}
  return {source, resolved, comparison, view, refs, observationCopyBindings};
}

/** The common short-media path also admits explicit synthetic fixtures in direct tests.
 * The real job entry below still accepts only the pinned C-all source. No fixture flag changes it. */
export async function drawQ5NormalShortV002({comparisonRef, joined, sourceRef, editPlanRef,
  inputRefs = [], outputDirectory, evidenceDirectory, onProgress = () => {}}) {
  for (const directory of [outputDirectory, evidenceDirectory]) {
    assert(path.isAbsolute(directory ?? ''));
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory});
  }
  assert(outputDirectory !== evidenceDirectory && !outputDirectory.startsWith(evidenceDirectory + path.sep)
    && !evidenceDirectory.startsWith(outputDirectory + path.sep), 'short drawing needs separate unused directories');
  const boundInputs = [comparisonRef, sourceRef, editPlanRef, joined.proofRef, ...inputRefs,
    joined.joinedRef, joined.pcmRef, ...joined.orderedPieces.flatMap(piece => [piece.mediaRef, ...(piece.proofRef ? [piece.proofRef] : [])])];
  for (const ref of boundInputs) await checkRef(ref);
  const {proofRef: _proofRef, ...savedJoin} = joined;
  assert.deepEqual(await json(joined.proofRef.path), savedJoin, 'saved lossless proof differs');
  assert.equal(joined.schemaVersion, 'digest-quality-q5-ordered-lossless-verification-v001');
  assert.equal(joined.status, 'passed'); assert.equal(joined.audio.sampleRate, 48000); assert.equal(joined.audio.channels, 2);
  const comparison = await json(comparisonRef.path);
  assert.equal(comparison.schemaVersion, 'q5-content-comparison-range-v002');
  assert.equal(comparison.afterRange.startFrame, 0);
  assert(Number.isSafeInteger(comparison.afterRange.endFrameExclusive) && comparison.afterRange.endFrameExclusive > 0);
  assert.equal(comparison.normalPlan.canvas.fps, 30);
  assert(comparison.normalPlan.elements.length > 0, 'the common native QC needs at least one complete caption');
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  const extraImplementationRefs = await implementationRefs(rules);
  const reread = async () => {
    for (const ref of [...boundInputs, ...extraImplementationRefs]) await checkRef(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
  };
  await mkdir(evidenceDirectory);
  try {
    const expectedFrameCount = frameCount(comparison.afterRange);
    assert.equal(joined.video.frameCount, expectedFrameCount); assert.equal(joined.audio.sampleCount, expectedFrameCount * 1600);
    const videoPath = path.join(evidenceDirectory, 'base-video.mp4'), basePath = path.join(evidenceDirectory, 'base.mp4');
    await absent(videoPath); await absent(basePath);
    const videoBuild = await buildPresentationBaseMediaVideoV001(joined.joinedRef.path, videoPath, 30,
      [{sourceStartFrame30: 0, sourceEndFrame30: expectedFrameCount}]);
    const mux = await muxPresentationBaseMediaV001(videoPath, basePath, {sampleRate: 48000, channels: 2, channelLayout: 'stereo'},
      {present: true, encodePath: joined.pcmRef.path});
    const baseRef = await bind(basePath);
    const baseAudio = await inspectOrchestrationEncodedAudioV001({audioPath: basePath,
      logicalSampleCount: expectedFrameCount * 1600, sampleRate: 48000, ...tools});
    const baselinePath = path.join(evidenceDirectory, 'short-normal-plan.json');
    const decisionInputPath = path.join(evidenceDirectory, 'short-normal-context.json');
    await save(baselinePath, comparison.normalPlan);
    await save(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null,
      q5ContentVersion: comparison.contentVersion, editPlanRef, baseMediaRef: baseRef,
      mediaOmission: comparison.mediaOmission, hiddenCaptionId: comparison.hiddenCaptionId,
      hiddenCaptionIds: comparison.hiddenCaptionIds, targetMediaRetention: comparison.targetMediaRetention,
      policyRef: comparison.policyRef, boundaryEvidenceRef: comparison.boundaryEvidenceRef,
      retentionPolicy: comparison.retentionPolicy,
      originalSourceRefs: sourceRef, orderedPieces: comparison.pieces,
      presentation: 'original Normal unchanged; no new semantic presentation judgment; no Q4 proposal or override'});
    const localRefs = [await bind(baselinePath), await bind(decisionInputPath), baseRef, joined.proofRef, joined.joinedRef, joined.pcmRef];
    for (const piece of joined.orderedPieces) localRefs.push(piece.mediaRef, ...(piece.proofRef ? [piece.proofRef] : []));
    const automatic = await loadAutoPresentationV001({baselinePath, decisionInputPath});
    assert.deepEqual(automatic.baselinePlan, comparison.normalPlan);
    const media = await inspectRenderedMediaWithToolsV001(basePath, tools);
    assert.equal(media.video.frameCount, expectedFrameCount);
    await save(path.join(evidenceDirectory, 'base-build.json'), {videoBuild, mux, baseRef, baseAudio, localRefs});
    await reread(); for (const ref of localRefs) await checkRef(ref);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidenceDirectory, 'processes')});
    const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
      processObserver});
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory,
      plan: automatic.baselinePlan, autoPresentation: automatic.autoPresentation, presetRegistry: await json(registryPath),
      baseMediaPath: basePath, baseMediaInspection: {media}, expectedFrameCount, overlayAdapter, toolPaths: tools,
      processObserver, serializePngAndFilters: true, runCounterfactualQc: true,
      counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, onProgress});
    await save(path.join(evidenceDirectory, 'draw-result.json'), draw);
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
    assert.equal(draw.finalQc.status, 'passed'); assert.deepEqual(draw.resolvedPlan, comparison.normalPlan);
    assert.equal(draw.outputMedia.video.frameCount, expectedFrameCount);
    const finalAudio = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: expectedFrameCount * 1600, sampleRate: 48000, ...tools});
    assert.equal(finalAudio.packetPayloadSha256, baseAudio.packetPayloadSha256, 'new base AAC changed during Normal drawing');
    assert.equal(finalAudio.logicalDecodedPayloadSha256, baseAudio.logicalDecodedPayloadSha256);
    await reread(); for (const ref of localRefs) await checkRef(ref);
    const rendered = await bind(draw.workVideo);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    const after = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(after.fileSha256, rendered.fileSha256);
    await reread(); for (const ref of localRefs) await checkRef(ref);
    const result = {schemaVersion: 'digest-quality-q5-normal-short-completion-v002', status: 'passed',
      comparisonRef, sourceRef, editPlanRef, after, expectedFrameCount, baseRef, baseAudio, finalAudio,
      contentVersion: comparison.contentVersion, mediaOmission: comparison.mediaOmission,
      hiddenCaptionId: comparison.hiddenCaptionId, hiddenCaptionIds: comparison.hiddenCaptionIds,
      targetMediaRetention: comparison.targetMediaRetention,
      policyRef: comparison.policyRef, boundaryEvidenceRef: comparison.boundaryEvidenceRef,
      retentionPolicy: comparison.retentionPolicy,
      localRefs, drawingRulesRef: rules, extraImplementationRefs, finalQc: draw.finalQc,
      completedFrameQc: draw.completedFrameQc, automaticResolution: draw.autoPresentationResolution,
      publication, humanQuality: 'not-evaluated', contentEditAdopted: false};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    return result;
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack});
    throw error;
  }
}


export async function renderQ5ComparisonV002({jobPath, onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(await realpath(process.execPath), await realpath(nodePath), 'Q5 requires the fixed Node executable');
  assert.equal(await realpath(execFileSync('node', ['-p', 'process.execPath'], {encoding: 'utf8'}).trim()), await realpath(nodePath),
    'Q5 child-process PATH must select the same fixed Node');
  assert.equal(await realpath(execFileSync('/usr/bin/which', ['ffmpeg'], {encoding: 'utf8'}).trim()), await realpath(tools.ffmpegPath));
  const jobRef = await bind(jobPath), job = await json(jobPath);
  for (const file of [job.outputDirectory, job.evidenceDirectory]) assert(path.isAbsolute(file ?? ''));
  assert(!job.outputDirectory.startsWith(job.evidenceDirectory + path.sep)
    && !job.evidenceDirectory.startsWith(job.outputDirectory + path.sep) && job.outputDirectory !== job.evidenceDirectory,
  'render output and evidence must be separate unused directories');
  const guards = [job.outputDirectory, job.evidenceDirectory].map(outputDirectory =>
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory}));
  const loaded = await loadQ5RenderInputsV002(job);
  const {comparison, view} = loaded;
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  const extraImplementationRefs = await implementationRefs(rules);
  const reread = async () => {
    for (const ref of [jobRef, ...loaded.refs, ...extraImplementationRefs]) await checkRef(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    const current = await loadQ5RenderInputsV002(await json(jobPath));
    assert.deepEqual(current.comparison, comparison, 'saved content or short projection changed');
  };
  await mkdir(job.evidenceDirectory);
  try {
    await save(path.join(job.evidenceDirectory, 'start.json'), {schemaVersion: 'digest-quality-q5-render-start-v002',
      jobRef, guards, drawingRulesRef: rules, extraImplementationRefs,
      inputRefs: loaded.refs, observationCopyBindings: loaded.observationCopyBindings,
      comparison, humanQuality: 'not-evaluated'});
    const pieces = [];
    for (const [index, piece] of comparison.pieces.entries()) {
      await onProgress({phase: 'retained-piece', index, range: piece.originalRange});
      const background = await buildOrchestrationRangeBackgroundWithObservationCopiesV001({drawingView: view,
        originalObservationCopies: job.originalObservationCopies,
        range: piece.originalRange, outputDirectory: path.join(job.evidenceDirectory, 'piece-' + (index + 1)), ...tools});
      assert.equal(background.status, 'passed');
      pieces.push({frameCount: frameCount(piece.originalRange), mediaRef: background.outputs.background,
        originalRange: piece.originalRange, outputRange: piece.outputRange, proofRef: background.proofRef});
    }
    await onProgress({phase: 'join-and-independent-byte-check'});
    const joined = await joinQ5LosslessPiecesV001({pieces, outputDirectory: path.join(job.evidenceDirectory, 'join'),
      canvas: comparison.normalPlan.canvas});
    await reread();
    const comparisonPath = path.join(job.evidenceDirectory, 'comparison.json');
    await save(comparisonPath, comparison);
    const normal = await drawQ5NormalShortV002({comparisonRef: await bind(comparisonPath), joined,
      sourceRef: job.sourceRef, editPlanRef: job.editPlanRef, inputRefs: [jobRef, ...loaded.refs],
      outputDirectory: job.outputDirectory, evidenceDirectory: path.join(job.evidenceDirectory, 'normal'), onProgress});
    await reread();
    const {after, expectedFrameCount, localRefs, baseRef, baseAudio, finalAudio, publication} = normal;
    const result = {schemaVersion: 'digest-quality-q5-render-completion-v002', status: 'passed',
      jobRef, editPlanRef: job.editPlanRef, contentVersion: comparison.contentVersion,
      mediaOmission: comparison.mediaOmission, hiddenCaptionId: comparison.hiddenCaptionId,
      hiddenCaptionIds: comparison.hiddenCaptionIds, targetMediaRetention: comparison.targetMediaRetention,
      retentionPolicy: loaded.resolved.retentionPolicy, policyRef: loaded.resolved.policyRef,
      boundaryEvidenceRef: loaded.resolved.boundaryEvidenceRef,
      before: {mediaRef: job.originalCompletedMediaRef, range: comparison.beforeRange},
      after: {mediaRef: after, range: comparison.afterRange, fullEditedRange: comparison.afterGlobalRange,
        orderedPieces: comparison.pieces},
      comparisonRef: normal.comparisonRef,
      originalInputRefs: loaded.refs, observationCopyBindings: loaded.observationCopyBindings,
      drawingRulesRef: rules, extraImplementationRefs, localRefs,
      joinedProofRef: joined.proofRef, baseRef, baseAudio, finalAudio, finalQc: normal.finalQc,
      completedFrameQc: normal.completedFrameQc, publication, expectedFrameCount,
      qcScope: 'complete short comparison only; full edited content plan is data, not a generated full movie',
      losslessVerificationScope: joined.scope, encodedMediaLimitation: 'H.264 and AAC are newly encoded; differences need not be confined to the omitted interval',
      targetCaptionTreatment: 'the selected caption is hidden in full; original media at both ends is retained, so target speech may remain',
      audibleContinuity: 'not-evaluated; the retention margin is an edit choice, not proof of phonetic safety',
      humanQuality: 'not-evaluated', contentEditAdopted: false, formalTrustChanged: false,
      paidApiCalls: 0, newExternalMediaTransfers: 0};
    await save(path.join(job.evidenceDirectory, 'completion.json'), result);
    await onProgress({phase: 'complete', expectedFrameCount});
    return result;
  } catch (error) {
    await save(path.join(job.evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack});
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [jobPath, ...extra] = process.argv.slice(2);
  assert(jobPath && path.isAbsolute(jobPath) && extra.length === 0, 'usage: q5-render.mjs <absolute-job.json>');
  await renderQ5ComparisonV002({jobPath, onProgress: value => process.stdout.write(JSON.stringify(value) + '\n')});
}

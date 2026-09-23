/** Q5-2: one source-contiguous introductory addition, separately saved and unadopted. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createQ52EditSourceV001, restoreQ52EditPlanV001, projectQ52ComparisonRangeV001} from './q5-2-edit-plan.mjs';
import {joinQ5LosslessPiecesV001, assertQ5OriginalBackgroundIdentityV001} from './q5-render.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {buildOrchestrationRangeBackgroundWithObservationCopiesV001, verifyOrchestrationObservationCopiesV001,
  inspectOrchestrationEncodedAudioV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {buildPresentationBaseMediaVideoV001, muxPresentationBaseMediaV001,
  buildPresentationBaseMediaVideoFilterGraphV001, buildPresentationAudioGridPlacementPlanV001}
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
  assert(path.isAbsolute(file), 'Q5-2 file reference must be absolute');
  const stat = await lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Q5-2 file reference must be regular');
  const hash = digest(); for await (const chunk of createReadStream(file)) hash.update(chunk);
  return {path: file, bytes: stat.size, fileSha256: hash.digest('hex')};
}
async function checkRef(ref) {
  assert(ref && /^[a-f0-9]{64}$/.test(ref.fileSha256), 'Q5-2 actual byte SHA required');
  const current = await bind(ref.path);
  assert.equal(current.fileSha256, ref.fileSha256, 'Q5-2 input bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(current.bytes, ref.bytes);
  return current;
}
async function absent(file) {
  try {await lstat(file); assert.fail('Q5-2 output already exists: ' + file);}
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


/** Resolve the existing absolute audio grid, never substitute observation samples. */
export function resolveQ52SourceExtractionV001({inspection, sourceVideoRange}) {
  const m = inspection.media;
  const v = m?.source?.video, a = m?.source?.audio;
  assert.equal(inspection.schemaVersion, 'candidate-digest-source-inspection-v001');
  assert.equal(m.fps, 60); assert.equal(v.frameRate, '60/1'); assert.equal(v.firstPts, 0);
  assert.equal(v.containerStartTimeMs, 0); assert.equal(v.presentationOffsetMs, 0); assert.equal(v.rotation, 0);
  assert.equal(v.timeBase, m.videoClock.streamTimeBase); assert.equal(v.ptsStep, m.videoClock.ptsStep);
  const timeBase = /^1\/(\d+)$/.exec(v.timeBase);
  assert(timeBase); const ticksPerSecond = Number(timeBase[1]);
  assert.equal(ticksPerSecond, 60 * v.ptsStep);
  assert.equal(a.sampleRate, 48000); assert.equal(a.channels, 2); assert.equal(a.channelLayout, 'stereo');
  assert.equal(a.timeBase, '1/48000'); assert.equal(m.audioClock.sampleRate, 48000); assert.equal(m.audioClock.channels, 2);
  assert.equal(m.audioClock.decodedTailPaddingSampleCount, 0);
  const {startFrame, endFrameExclusive} = sourceVideoRange;
  assert(Number.isSafeInteger(startFrame) && startFrame >= 0 && Number.isSafeInteger(endFrameExclusive)
    && endFrameExclusive > startFrame && endFrameExclusive <= m.logicalFrameCount);
  const sourceSamples = {startSample: startFrame * 1600, endSampleExclusive: endFrameExclusive * 1600};
  const placement = buildPresentationAudioGridPlacementPlanV001(m.audioClock);
  const run = placement.runs.find(row => row.targetStartSample <= sourceSamples.startSample
    && row.targetEndSample >= sourceSamples.endSampleExclusive);
  assert(run, 'Q5-2 addition must lie within one saved continuous decoded audio run');
  const ordinalSamples = {
    startSample: run.sourceStartSample + sourceSamples.startSample - run.targetStartSample,
    endSampleExclusive: run.sourceStartSample + sourceSamples.endSampleExclusive - run.targetStartSample,
  };
  const seekSeconds = Math.floor(startFrame / 30);
  return {schemaVersion: 'q5-2-source-extraction-clock-v001', sourceVideoRange,
    frameCount: endFrameExclusive - startFrame, seekSeconds,
    sourceFrame60Range: {startFrame: startFrame * 2, endFrameExclusive: endFrameExclusive * 2},
    sourcePtsRange: {startPts: startFrame * 2 * v.ptsStep, endPtsExclusive: endFrameExclusive * 2 * v.ptsStep},
    sourceVideoTimeBase: v.timeBase, sourcePtsStep60: v.ptsStep, ticksPerSecond,
    relativeRange30: {sourceStartFrame30: startFrame - seekSeconds * 30,
      sourceEndFrame30: endFrameExclusive - seekSeconds * 30},
    audio: {sampleRate: 48000, channels: 2, absoluteSourceRange: sourceSamples, decodedOrdinalRange: ordinalSamples,
      sourceGridRun: run, precedingGapSamples: sourceSamples.startSample - ordinalSamples.startSample,
      sampleCount: (endFrameExclusive - startFrame) * 1600},
    transformation: 'the existing source-zero even-frame 60-to-30 selection, YUV420p; unchanged 48kHz stereo float32 PCM'};
}

async function compareDecoded({expectedArgs, observedArgs, expectedByteCount, label, ffmpegPath}) {
  const expected = decoder(ffmpegPath, expectedArgs), observed = decoder(ffmpegPath, observedArgs);
  const expectedHash = digest(), observedHash = digest(); let comparedBytes = 0;
  try {
    while (comparedBytes < expectedByteCount) {
      const take = Math.min(65536, expectedByteCount - comparedBytes);
      const [a, b] = await Promise.all([expected.read(take), observed.read(take)]);
      assert.equal(a.length, take, label + ' source ended early');
      assert.equal(b.length, take, label + ' piece ended early');
      assert(a.equals(b), label + ' source bytes differ at byte ' + comparedBytes);
      expectedHash.update(a); observedHash.update(b); comparedBytes += take;
    }
    assert.equal((await expected.read(1)).length, 0, label + ' source has excess bytes');
    assert.equal((await observed.read(1)).length, 0, label + ' piece has excess bytes');
    await expected.finish(); await observed.finish();
    return {status: 'passed', comparedBytes, expectedPayloadSha256: expectedHash.digest('hex'),
      observedPayloadSha256: observedHash.digest('hex'), expectedArgs, observedArgs};
  } finally {await expected.stop(); await observed.stop();}
}

/** The reference uses absolute source PTS and an earlier seek, independently of local trim/ordinal extraction. */
export async function verifyQ52SourcePieceV001({sourceVideoRef, inspection, sourceVideoRange, pieceRef, canvas,
  ffmpegPath = tools.ffmpegPath, ffprobePath = tools.ffprobePath}) {
  await checkRef(sourceVideoRef); await checkRef(pieceRef);
  const clock = resolveQ52SourceExtractionV001({inspection, sourceVideoRange});
  assert.equal(canvas.fps, 30); assert.equal(canvas.width, inspection.media.source.video.width);
  assert.equal(canvas.height, inspection.media.source.video.height);
  const probe = JSON.parse(await command(ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', pieceRef.path]));
  assert.equal(probe.streams.length, 2);
  const video = probe.streams.find(row => row.codec_type === 'video'), audio = probe.streams.find(row => row.codec_type === 'audio');
  assert.equal(video.codec_name, 'ffv1'); assert.equal(video.pix_fmt, 'yuv420p'); assert.equal(video.r_frame_rate, '30/1');
  assert.equal(video.width, canvas.width); assert.equal(video.height, canvas.height); assert.equal(Number(video.start_time), 0);
  assert.equal(audio.codec_name, 'pcm_f32le'); assert.equal(Number(audio.sample_rate), 48000);
  assert.equal(audio.channels, 2); assert.equal(Number(audio.start_time), 0);
  const seek = Math.max(0, clock.seekSeconds - 1);
  const start = clock.sourcePtsRange.startPts, end = clock.sourcePtsRange.endPtsExclusive;
  const videoFilter = "select='gte(pts," + start + ")*lt(pts," + end + ")*not(mod(pts,"
    + clock.sourcePtsStep60 * 2 + "))',format=pix_fmts=yuv420p";
  const videoArgs = ['-v', 'error', '-nostdin', '-copyts', '-ss', String(seek), '-i', sourceVideoRef.path,
    '-map', '0:v:0', '-an', '-vf', videoFilter, '-frames:v', String(clock.frameCount),
    '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'];
  // Audio is decoded from source zero. Absolute PTS trim checks the saved-gap ordinal subtraction independently.
  const sourceAudio = clock.audio.absoluteSourceRange;
  const audioArgs = ['-v', 'error', '-nostdin', '-copyts', '-i', sourceVideoRef.path,
    '-map', '0:a:0', '-vn', '-af', 'atrim=start_pts=' + sourceAudio.startSample + ':end_pts=' + sourceAudio.endSampleExclusive,
    '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];
  const videoProof = await compareDecoded({expectedArgs: videoArgs, observedArgs: decodeArgs(pieceRef.path, 'video'),
    expectedByteCount: clock.frameCount * canvas.width * canvas.height * 3 / 2, label: 'added video', ffmpegPath});
  const audioProof = await compareDecoded({expectedArgs: audioArgs, observedArgs: decodeArgs(pieceRef.path, 'audio'),
    expectedByteCount: clock.audio.sampleCount * 8, label: 'added audio', ffmpegPath});
  await checkRef(sourceVideoRef); await checkRef(pieceRef);
  return {schemaVersion: 'q5-2-source-piece-verification-v001', status: 'passed', sourceVideoRef, pieceRef, clock,
    video: videoProof, audio: audioProof, scope: 'all normalized source YUV420p and absolute source stereo PCM bytes before lossy encoding'};
}

export async function buildQ52SourcePieceV001({sourceVideoRef, sourceVideoInspectionRef, sourceVideoRange, outputDirectory, canvas,
  ffmpegPath = tools.ffmpegPath, ffprobePath = tools.ffprobePath}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await checkRef(sourceVideoRef); await checkRef(sourceVideoInspectionRef);
  const inspection = await json(sourceVideoInspectionRef.path);
  assert.equal(inspection.sourceVideoBinding.fileSha256, sourceVideoRef.fileSha256);
  const clock = resolveQ52SourceExtractionV001({inspection, sourceVideoRange});
  await mkdir(outputDirectory);
  const inputStreams = JSON.parse(await command(ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', sourceVideoRef.path],
    outputDirectory, 'source-streams'));
  assert.equal(inputStreams.streams.filter(row => row.codec_type === 'video').length, 1);
  assert.equal(inputStreams.streams.filter(row => row.codec_type === 'audio').length, 1);
  const v = inputStreams.streams.find(row => row.codec_type === 'video'), a = inputStreams.streams.find(row => row.codec_type === 'audio');
  assert.equal(v.time_base, clock.sourceVideoTimeBase); assert.equal(v.r_frame_rate, '60/1');
  assert.equal(v.width, canvas.width); assert.equal(v.height, canvas.height);
  assert.equal(a.time_base, '1/48000'); assert.equal(Number(a.sample_rate), 48000); assert.equal(a.channels, 2);
  // ffprobe seeks to the preceding keyframe; select the complete absolute sequence after the exact integer seek.
  const frames = JSON.parse(await command(ffprobePath, ['-v', 'error', '-select_streams', 'v:0',
    '-read_intervals', clock.seekSeconds + '%' + (sourceVideoRange.endFrameExclusive / 30 + 1),
    '-show_frames', '-show_entries', 'frame=pts', '-of', 'json', sourceVideoRef.path], outputDirectory, 'source-pts'));
  const seekPts = clock.seekSeconds * clock.ticksPerSecond;
  const selected = frames.frames.map(row => row.pts).filter(pts => pts >= seekPts && pts < clock.sourcePtsRange.endPtsExclusive);
  const expected = Array.from({length: (clock.sourcePtsRange.endPtsExclusive - seekPts) / clock.sourcePtsStep60},
    (_, index) => seekPts + index * clock.sourcePtsStep60);
  assert.deepEqual(selected, expected, 'seek must begin on the original even frame and preserve every source PTS');
  const graph = buildPresentationBaseMediaVideoFilterGraphV001(60, [clock.relativeRange30]);
  const videoPath = path.join(outputDirectory, 'source-video.nut'), pcmPath = path.join(outputDirectory, 'source-pcm.f32le');
  await command(ffmpegPath, ['-v', 'error', '-nostdin', '-n', '-copyts', '-ss', String(clock.seekSeconds),
    '-i', sourceVideoRef.path, '-filter_complex', graph, '-map', '[outv]', '-an', '-frames:v', String(clock.frameCount),
    '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'nut', videoPath],
  outputDirectory, 'extract-source-video');
  const raw = clock.audio.decodedOrdinalRange;
  await command(ffmpegPath, ['-v', 'error', '-nostdin', '-n', '-i', sourceVideoRef.path, '-map', '0:a:0', '-vn',
    '-af', 'atrim=start_sample=' + raw.startSample + ':end_sample=' + raw.endSampleExclusive + ',asetpts=N/SR/TB',
    '-c:a', 'pcm_f32le', '-f', 'f32le', pcmPath], outputDirectory, 'extract-source-audio');
  assert.equal((await lstat(pcmPath)).size, clock.audio.sampleCount * 8);
  const piecePath = path.join(outputDirectory, 'source-piece.nut');
  await command(ffmpegPath, ['-v', 'error', '-nostdin', '-n', '-i', videoPath,
    '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', pcmPath, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'pcm_f32le', '-f', 'nut', piecePath], outputDirectory, 'mux-source-piece');
  const pieceRef = await bind(piecePath);
  const proof = await verifyQ52SourcePieceV001({sourceVideoRef, inspection, sourceVideoRange, pieceRef, canvas, ffmpegPath, ffprobePath});
  await checkRef(sourceVideoInspectionRef);
  const result = {...proof, sourceVideoInspectionRef, graph, seekPtsProof: {seekPts, firstPts: selected[0],
    lastPts: selected.at(-1), count: selected.length, step: clock.sourcePtsStep60,
    sourceFirstOutputPts: clock.sourcePtsRange.startPts, sourceLastOutputPts: clock.sourcePtsRange.endPtsExclusive - 2 * clock.sourcePtsStep60,
    sourceEndExclusivePts: clock.sourcePtsRange.endPtsExclusive},
    temporaryRefs: [await bind(videoPath), await bind(pcmPath)]};
  await save(path.join(outputDirectory, 'proof.json'), result);
  return {frameCount: clock.frameCount, mediaRef: pieceRef, proofRef: await bind(path.join(outputDirectory, 'proof.json')),
    originalDigestRange: null, sourceVideoRange};
}

const sameRef = (left, right, label) => {
  for (const key of ['path', 'fileSha256']) assert.equal(left?.[key], right?.[key], label + ' reference differs');
};

/** Bind the selected source words and boundary to this exact saved edit; no semantic judgment is inferred here. */
export async function verifyQ52EvidenceV001({source, resolved, beforeRange}) {
  const refs = [resolved.policyRef, resolved.boundaryEvidenceRef, resolved.sourceEvidenceRef];
  for (const ref of refs) await checkRef(ref);
  const evidence = await json(resolved.sourceEvidenceRef.path), boundary = await json(resolved.boundaryEvidenceRef.path);
  assert.equal(evidence.schemaVersion, 'q5-2-context-addition-judgment-v001');
  assert.equal(boundary.schemaVersion, 'q5-2-context-addition-boundary-v001');
  for (const row of [evidence, boundary]) {
    assert.equal(row.candidateId, resolved.candidateId);
    assert.equal(row.targetSegmentId, resolved.addition.targetSegmentId);
    sameRef(row.policyRef, resolved.policyRef, 'policy');
    sameRef(row.sourceVideoRef, source.sourceIdentity.sourceVideoRef, 'source video');
    assert.deepEqual(row.comparisonBeforeRange, beforeRange);
  }
  sameRef(boundary.sourceEvidenceRef, resolved.sourceEvidenceRef, 'source judgment');
  assert.deepEqual(evidence.addition, resolved.addition);
  assert.deepEqual(evidence.addedCaptionEvidence, resolved.addedCaptions);
  assert.deepEqual(boundary.actualSourceAddition, resolved.addition.sourceVideoRange);
  assert.equal(boundary.addedFrameCount, frameCount(resolved.addition.sourceVideoRange));
  assert.equal(boundary.subtitleMode, resolved.addition.subtitleMode);
  assert.deepEqual(boundary.addedCaptions, resolved.addedCaptions);
  const target = source.timeline.segments.find(row => row.segmentId === resolved.addition.targetSegmentId);
  assert.deepEqual(boundary.originalTargetSourceRange,
    {startFrame: target.sourceStartFrame30, endFrameExclusive: target.sourceEndFrame30});
  for (const key of ['sourceTranscriptRef', 'sourceUtterancesRef', 'sourceWordTimestampsRef',
    'sourceAcousticObservationRef', 'sourceAcousticPreflightRef']) {
    if (evidence[key]) {await checkRef(evidence[key]); refs.push(evidence[key]);}
    else assert(!['sourceTranscriptRef', 'sourceUtterancesRef', 'sourceWordTimestampsRef'].includes(key),
      'source evidence requires ' + key);
  }
  const transcript = await json(evidence.sourceTranscriptRef.path);
  const utterances = await json(evidence.sourceUtterancesRef.path);
  const words = await json(evidence.sourceWordTimestampsRef.path);
  const utterance = utterances.utterances.find(row => row.utteranceId === evidence.sourceUtterance?.utteranceId);
  assert(utterance, 'saved source utterance is missing');
  assert.deepEqual(evidence.sourceUtterance, utterance, 'source utterance was rewritten');
  assert(Array.isArray(evidence.sourceAtoms) && evidence.sourceAtoms.length > 0);
  assert.deepEqual(evidence.sourceAtoms.map(row => row.id), utterance.sourceSegmentIds);
  for (const atom of evidence.sourceAtoms) {
    assert.deepEqual(transcript.segments.find(row => row.id === atom.id), atom, 'source transcript atom differs');
    const word = words.words.find(row => row.segmentId === atom.id);
    assert(word, 'source word timestamp is missing');
    for (const field of ['text', 'startMs', 'endMs', 'speaker']) assert.deepEqual(word[field], atom[field]);
  }
  if (resolved.addedCaptions.length) {
    assert(evidence.sourceAcousticObservationRef && evidence.sourceAcousticPreflightRef);
    const acoustic = await json(evidence.sourceAcousticObservationRef.path);
    const preflight = await json(evidence.sourceAcousticPreflightRef.path);
    sameRef(acoustic.preflightBinding, evidence.sourceAcousticPreflightRef, 'acoustic preflight');
    assert.deepEqual(evidence.acousticWords, acoustic.words, 'saved acoustic word rows differ');
    const chunk = preflight.chunks.find(row => row.index === acoustic.chunkIndex);
    assert(chunk); assert.deepEqual(evidence.acousticChunk, chunk, 'saved acoustic source chunk differs');
  }
  return refs;
}

export async function loadQ52RenderInputsV001(job) {
  assert.equal(job.schemaVersion, 'digest-quality-q5-2-render-job-v001');
  const refs = [job.sourceRef, job.editPlanRef, job.originalDrawingEvidenceRef, job.originalCompletedMediaRef,
    job.sourceVideoInspectionRef];
  for (const ref of refs) await checkRef(ref);
  assert.equal(job.originalCompletedMediaRef.fileSha256, ORIGINAL_NORMAL_SHA);
  const saved = await json(job.editPlanRef.path);
  assert.equal(saved.schemaVersion, 'q5-2-content-edit-plan-v001');
  const sourceInput = await json(job.sourceRef.path);
  assert(!Object.hasOwn(sourceInput, 'fixture'), 'fixtures cannot enter the real C-all renderer');
  for (const key of ['planRef', 'timelineRef', 'mediaRef', 'basisEditPlanRef', 'sourceVideoRef', 'sourceEvidenceRef', 'boundaryEvidenceRef']) {
    await checkRef(sourceInput[key]); refs.push(sourceInput[key]);
  }
  const source = createQ52EditSourceV001({...sourceInput,
    planBytes: await readFile(sourceInput.planRef.path, 'utf8'),
    timelineBytes: await readFile(sourceInput.timelineRef.path, 'utf8'),
    basisEditPlanBytes: await readFile(sourceInput.basisEditPlanRef.path, 'utf8'),
    sourceEvidenceBytes: await readFile(sourceInput.sourceEvidenceRef.path, 'utf8'),
    boundaryEvidenceBytes: await readFile(sourceInput.boundaryEvidenceRef.path, 'utf8')});
  const resolved = restoreQ52EditPlanV001({source, saved});
  const comparison = projectQ52ComparisonRangeV001({source, resolved, beforeRange: job.beforeRange});
  refs.push(...await verifyQ52EvidenceV001({source, resolved, beforeRange: job.beforeRange}));
  assert.equal(comparison.physicalPieces.length, 2);
  assert.deepEqual(comparison.physicalPieces.map(row => row.kind), ['added-source-video', 'retained-original-digest']);
  assert.equal(comparison.physicalPieces[0].originalDigestRange, null);
  assert.equal(comparison.physicalPieces[0].sourceVideoRange.endFrameExclusive, comparison.physicalPieces[1].sourceVideoRange.startFrame);
  const inspection = await json(job.sourceVideoInspectionRef.path);
  assert.equal(inspection.sourceVideoBinding.fileSha256, sourceInput.sourceVideoRef.fileSha256);
  assert(sourceInput.sourceVideoRef.path.endsWith(path.sep + inspection.sourceVideoBinding.path)
    || sourceInput.sourceVideoRef.path === inspection.sourceVideoBinding.path);
  resolveQ52SourceExtractionV001({inspection, sourceVideoRange: resolved.addition.sourceVideoRange});
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(job.originalDrawingEvidenceRef.path));
  assertQ5OriginalBackgroundIdentityV001({sourceRefs: sourceInput, view});
  const old = view.sourceRefs;
  const observationCopyBindings = await verifyOrchestrationObservationCopiesV001({pulseTimingEvidence: old.pulseTimingEvidence,
    originalObservationCopies: job.originalObservationCopies});
  for (const ref of [old.decisionInputRef, old.pulseTimingEvidence.sourceRef,
    ...observationCopyBindings.map(binding => binding.copyRef)]) {await checkRef(ref); refs.push(ref);}
  return {source, resolved, comparison, view, refs, observationCopyBindings};
}
/** The common short-media path also admits explicit synthetic fixtures in direct tests.
 * The real job entry below still accepts only the pinned C-all source. No fixture flag changes it. */
export async function drawQ52NormalShortV001({comparisonRef, joined, sourceRef, editPlanRef,
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
  assert.equal(comparison.schemaVersion, 'q5-2-content-comparison-range-v001');
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
      q52ContentVersion: comparison.contentVersion, editPlanRef, baseMediaRef: baseRef,
      addition: comparison.addition, addedCaptions: comparison.addedCaptions,
      policyRef: comparison.policyRef, boundaryEvidenceRef: comparison.boundaryEvidenceRef,
      sourceEvidenceRef: comparison.sourceEvidenceRef,
      originalSourceRefs: sourceRef, orderedPieces: comparison.physicalPieces,
      presentation: 'original captions and appearance preserved; evidenced additional captions use Normal; no Q4 proposal or override'});
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
    const result = {schemaVersion: 'digest-quality-q5-2-normal-short-completion-v001', status: 'passed',
      comparisonRef, sourceRef, editPlanRef, after, expectedFrameCount, baseRef, baseAudio, finalAudio,
      contentVersion: comparison.contentVersion, addition: comparison.addition, addedCaptions: comparison.addedCaptions,
      policyRef: comparison.policyRef, boundaryEvidenceRef: comparison.boundaryEvidenceRef,
      sourceEvidenceRef: comparison.sourceEvidenceRef,
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



export async function renderQ52ComparisonV001({jobPath, onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(await realpath(process.execPath), await realpath(nodePath));
  assert.equal(await realpath(execFileSync('node', ['-p', 'process.execPath'], {encoding: 'utf8'}).trim()), await realpath(nodePath),
    'child-process PATH must select the same fixed Node');
  assert.equal(await realpath(execFileSync('/usr/bin/which', ['ffmpeg'], {encoding: 'utf8'}).trim()), await realpath(tools.ffmpegPath));
  const jobRef = await bind(jobPath), job = await json(jobPath);
  for (const file of [job.outputDirectory, job.evidenceDirectory]) assert(path.isAbsolute(file ?? ''));
  assert(!job.outputDirectory.startsWith(job.evidenceDirectory + path.sep)
    && !job.evidenceDirectory.startsWith(job.outputDirectory + path.sep) && job.outputDirectory !== job.evidenceDirectory);
  const guards = [job.outputDirectory, job.evidenceDirectory].map(outputDirectory =>
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory}));
  const loaded = await loadQ52RenderInputsV001(job), {comparison, view} = loaded;
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  const extraImplementationRefs = await implementationRefs(rules);
  const reread = async () => {
    for (const ref of [jobRef, ...loaded.refs, ...extraImplementationRefs]) await checkRef(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    const current = await loadQ52RenderInputsV001(await json(jobPath));
    assert.deepEqual(current.comparison, comparison, 'saved addition or short projection changed');
  };
  await mkdir(job.evidenceDirectory);
  try {
    await save(path.join(job.evidenceDirectory, 'start.json'), {schemaVersion: 'digest-quality-q5-2-render-start-v001',
      jobRef, guards, drawingRulesRef: rules, extraImplementationRefs,
      inputRefs: loaded.refs, observationCopyBindings: loaded.observationCopyBindings, comparison, humanQuality: 'not-evaluated'});
    const [prefix, body] = comparison.physicalPieces;
    await onProgress({phase: 'added-source-piece', range: prefix.sourceVideoRange});
    const added = await buildQ52SourcePieceV001({sourceVideoRef: loaded.source.sourceIdentity.sourceVideoRef,
      sourceVideoInspectionRef: job.sourceVideoInspectionRef, sourceVideoRange: prefix.sourceVideoRange,
      outputDirectory: path.join(job.evidenceDirectory, 'added-source'), canvas: comparison.normalPlan.canvas});
    await onProgress({phase: 'retained-original-body', range: body.originalDigestRange});
    const retained = await buildOrchestrationRangeBackgroundWithObservationCopiesV001({drawingView: view,
      originalObservationCopies: job.originalObservationCopies, range: body.originalDigestRange,
      outputDirectory: path.join(job.evidenceDirectory, 'retained-body'), ...tools});
    assert.equal(retained.status, 'passed');
    const pieces = [{...added, kind: prefix.kind, outputRange: prefix.outputRange},
      {kind: body.kind, frameCount: frameCount(body.originalDigestRange), mediaRef: retained.outputs.background,
        originalDigestRange: body.originalDigestRange, sourceVideoRange: body.sourceVideoRange,
        outputRange: body.outputRange, proofRef: retained.proofRef}];
    assert.equal(added.frameCount, frameCount(prefix.outputRange));
    await onProgress({phase: 'join-and-independent-byte-check'});
    const joined = await joinQ5LosslessPiecesV001({pieces, outputDirectory: path.join(job.evidenceDirectory, 'join'),
      canvas: comparison.normalPlan.canvas});
    await reread();
    const comparisonPath = path.join(job.evidenceDirectory, 'comparison.json'); await save(comparisonPath, comparison);
    const normal = await drawQ52NormalShortV001({comparisonRef: await bind(comparisonPath), joined,
      sourceRef: job.sourceRef, editPlanRef: job.editPlanRef, inputRefs: [jobRef, ...loaded.refs],
      outputDirectory: job.outputDirectory, evidenceDirectory: path.join(job.evidenceDirectory, 'normal'), onProgress});
    await reread();
    const result = {schemaVersion: 'digest-quality-q5-2-render-completion-v001', status: 'passed',
      jobRef, editPlanRef: job.editPlanRef, contentVersion: comparison.contentVersion,
      addition: comparison.addition, addedCaptions: comparison.addedCaptions,
      policyRef: loaded.resolved.policyRef, boundaryEvidenceRef: loaded.resolved.boundaryEvidenceRef,
      sourceEvidenceRef: loaded.resolved.sourceEvidenceRef,
      before: {mediaRef: job.originalCompletedMediaRef, range: comparison.beforeRange},
      after: {mediaRef: normal.after, range: comparison.afterRange, fullEditedRange: comparison.afterGlobalRange,
        orderedPieces: comparison.physicalPieces},
      comparisonRef: normal.comparisonRef, originalInputRefs: loaded.refs, observationCopyBindings: loaded.observationCopyBindings,
      drawingRulesRef: rules, extraImplementationRefs, localRefs: normal.localRefs,
      addedSourceProofRef: added.proofRef, retainedBodyProofRef: retained.proofRef, joinedProofRef: joined.proofRef,
      baseRef: normal.baseRef, baseAudio: normal.baseAudio, finalAudio: normal.finalAudio, finalQc: normal.finalQc,
      completedFrameQc: normal.completedFrameQc, publication: normal.publication, expectedFrameCount: normal.expectedFrameCount,
      qcScope: 'complete short comparison; the separately resolved full content plan is not a generated full movie',
      losslessVerificationScope: 'added source is compared with normalized source pixels and absolute source PCM; retained body with original base; then both pieces with the joined lossless stream',
      encodedMediaLimitation: 'H.264 and AAC are newly encoded after lossless source comparison',
      sourceContinuity: 'added source end equals the original retained source start; no transition, silence or duration compensation inserted',
      audibleContinuity: 'not-evaluated', humanQuality: 'not-evaluated', contentEditAdopted: false,
      formalTrustChanged: false, paidApiCalls: 0, newExternalMediaTransfers: 0};
    await save(path.join(job.evidenceDirectory, 'completion.json'), result);
    await onProgress({phase: 'complete', expectedFrameCount: normal.expectedFrameCount}); return result;
  } catch (error) {
    await save(path.join(job.evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack});
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [jobPath, ...extra] = process.argv.slice(2);
  assert(jobPath && path.isAbsolute(jobPath) && extra.length === 0, 'usage: q5-2-render.mjs <absolute-job.json>');
  await renderQ52ComparisonV001({jobPath, onProgress: value => process.stdout.write(JSON.stringify(value) + '\n')});
}


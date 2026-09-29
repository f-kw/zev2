/** Selected-source development backgrounds. Logical caption geometry remains
 * 1080p; only the explicitly selected source intervals are manufactured at 540p.
 * These receipts are not 1080p background/full-pixel-QC evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationBaseMediaSegmentPlanV002} from './presentation_base_media_build_v003.mjs';
import {assertProjectionMatchesStateV001} from './presentation_orchestration_projection_v001.mjs';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {assertPresentationDevProxyProfileV001} from './presentation_dev_proxy_profile_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

export const PRESENTATION_DEV_PROXY_STRUCTURE_BASE_SCHEMA_V001 = 'presentation-dev-proxy-structure-base-v001';
export const PRESENTATION_DEV_PROXY_STRUCTURE_BACKGROUND_SCHEMA_V001 = 'presentation-dev-proxy-structure-background-v001';
const directory = path.dirname(fileURLToPath(import.meta.url)), repositoryRoot = path.resolve(directory, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(canonicalJson(value));
const same = (a, b, reason) => assert.equal(canonicalJson(a), canonicalJson(b), reason);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const clone = structuredClone;
const implementationNames = ['presentation_dev_proxy_structure_background_v001.mjs', 'presentation_dev_proxy_profile_v001.mjs',
  'presentation_base_media_build_v003.mjs', 'presentation_base_media_timeline_v004.mjs',
  'presentation_caption_contract_v002.mjs', 'presentation_orchestration_projection_v001.mjs',
  'connection_expression_v001.mjs', 'presentation_effects_v001.mjs', 'presentation_output_directory_v001.mjs'];

async function noSymlinks(file) {
  assert(path.isAbsolute(file), 'absolute path required');
  let current = path.parse(file).root;
  for (const part of file.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); assert(!(await lstat(current)).isSymbolicLink(), 'symlink path rejected');
  }
}
async function bind(file) {
  await noSymlinks(file); const before = await lstat(file); assert(before.isFile(), 'regular file required');
  const h = createHash('sha256'); for await (const bytes of createReadStream(file)) h.update(bytes);
  const after = await lstat(file);
  for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key], 'input changed while hashing');
  return {path: file, bytes: after.size, fileSha256: h.digest('hex')};
}
async function verify(ref) {
  assert(ref && path.isAbsolute(ref.path) && /^[a-f0-9]{64}$/.test(ref.fileSha256), 'byte-bound reference required');
  const actual = await bind(ref.path); assert.equal(actual.fileSha256, ref.fileSha256, 'input bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(actual.bytes, ref.bytes, 'input byte count changed');
  return actual;
}
async function save(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); return bind(file);
}
async function bindings(tools) {
  const resolved = {};
  for (const role of ['ffmpegPath', 'ffprobePath']) {
    assert(path.isAbsolute(tools?.[role] ?? ''), 'explicit tool path required');
    resolved[role] = await bind(await realpath(tools[role]));
  }
  return {tools: resolved, code: await Promise.all(implementationNames.map(name => bind(path.join(directory, name)))),
    node: await bind(await realpath(process.execPath))};
}
async function execute(command, args, processes, {line = null, bytes = null} = {}) {
  const startedAt = new Date().toISOString(), start = performance.now();
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '', stderr = '', spawnError, count = 0;
  const out = createHash('sha256'), err = createHash('sha256');
  child.stdout.on('data', value => {out.update(value); count += value.length; if (bytes) bytes(value);
    if (!line && !bytes) {stdout += value.toString('utf8'); if (stdout.length > 32 * 1024 * 1024) child.kill();}});
  child.stderr.on('data', value => {err.update(value); stderr = (stderr + value.toString('utf8')).slice(-65536);});
  const exit = new Promise(resolve => {child.once('error', error => {spawnError = error;});
    child.once('close', (code, signal) => resolve({code, signal}));});
  let readError;
  if (line) try {for await (const value of createInterface({input: child.stdout, crlfDelay: Infinity})) if (value) line(value);}
  catch (error) {readError = error; child.kill();}
  const ended = await exit;
  const record = {command, args, argumentsSha256: hash(args), ...ended, startedAt, endedAt: new Date().toISOString(),
    wallMilliseconds: performance.now() - start, stdoutBytes: count, stdoutSha256: out.digest('hex'), stderrSha256: err.digest('hex')};
  processes.push(record);
  if (spawnError) throw spawnError; if (readError) throw readError;
  assert.equal(ended.code, 0, stderr); assert.equal(ended.signal, null, 'interrupted process');
  return {stdout, record};
}
const common = ['-hide_banner', '-nostdin', '-v', 'error', '-n'];
const nutEncode = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-bf', '0',
  '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-f', 'nut'];

/** Exact existing source-to-frame/sample mapping. This finite path intentionally
 * rejects unknown source clocks instead of substituting a new extraction rule. */
export function derivePresentationDevProxyStructureRecipeV001({sourceRef, inspection, segments, profileId}) {
  const profile = assertPresentationDevProxyProfileV001(profileId), media = inspection?.media;
  assert(media?.source?.video && media?.source?.audio && media.audioClock && media.videoClock);
  assert.equal(inspection.sourceVideoBinding?.fileSha256, sourceRef.fileSha256, 'source inspection belongs to another media');
  const sourcePath = path.isAbsolute(inspection.sourceVideoBinding.path)
    ? inspection.sourceVideoBinding.path : path.resolve(repositoryRoot, inspection.sourceVideoBinding.path);
  assert.equal(sourcePath, sourceRef.path, 'source inspection path differs');
  const v = media.source.video, a = media.source.audio;
  assert.equal(media.fps, 60); assert.equal(v.frameRate, '60/1');
  assert.equal(v.width, 1920); assert.equal(v.height, 1080); assert.equal(v.firstPts, 0);
  assert.equal(v.containerStartTimeMs, 0); assert.equal(v.presentationOffsetMs, 0); assert.equal(v.rotation, 0);
  assert.equal(v.timeBase, media.videoClock.streamTimeBase); assert.equal(v.ptsStep, media.videoClock.ptsStep);
  assert.equal(v.firstPts, media.videoClock.firstPts); assert.equal(media.videoClock.presentationOffsetMs, 0);
  const match = /^1\/([1-9][0-9]*)$/.exec(v.timeBase); assert(match, 'exact source PTS timebase required');
  const ticksPerSecond = Number(match[1]); assert.equal(ticksPerSecond, 60 * v.ptsStep);
  assert.equal(v.decodedFrameCount, media.decodedFrameCount); assert.equal(media.logicalFrameCount, Math.ceil(media.decodedFrameCount / 2));
  assert.equal(a.sampleRate, 44100); assert.equal(a.channels, 2); assert.equal(a.channelLayout, 'stereo');
  assert.equal(a.timeBase, '1/44100'); assert.equal(a.firstDecodedPts, 0);
  assert.equal(media.audioClock.sampleRate, 44100); assert.equal(media.audioClock.channels, 2);
  assert.equal(media.audioClock.channelLayout, 'stereo'); assert.deepEqual(media.audioClock.spans, [], 'source audio gaps need another explicit extraction recipe');
  assert.equal(media.audioClock.decodedTailPaddingSampleCount, 0);
  assert(Array.isArray(segments) && segments.length > 0, 'selected intervals required');
  const resolved = validatePresentationBaseMediaSegmentPlanV002(segments.map(row => ({sourceStartMs: row.sourceStartMs, sourceEndMs: row.sourceEndMs})),
    {fps: media.fps, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
      presentationOffsetMs: media.videoClock.presentationOffsetMs}, media.audioClock);
  assert.equal(resolved.status, 'passed', JSON.stringify(resolved.violations));
  same(segments, resolved.mappings, 'saved selection mapping differs from source clocks');
  const pieces = segments.map(segment => {
    const {sourceStartFrame30: first, sourceEndFrame30: end} = segment, sample = segment.audioSamples;
    assert.equal(sample.sourceStart, first * 1470); assert.equal(sample.sourceEnd, end * 1470, 'complete selected source audio required');
    const seekSeconds = Math.floor(first / 30), boundedEndSeconds = Math.ceil(end / 30);
    const startPts = first * 2 * v.ptsStep, endPtsExclusive = end * 2 * v.ptsStep;
    const sourceSelect = `select='gte(pts,${startPts})*lt(pts,${endPtsExclusive})*not(mod(pts-${v.firstPts},${v.ptsStep * 2}))'`;
    return {segment: clone(segment), frameCount: end - first, seekSeconds, boundedEndSeconds,
      sourceFrame60Range: {startFrame: first * 2, endFrameExclusive: end * 2},
      sourcePtsRange: {startPts, endPtsExclusive, step: v.ptsStep, timeBase: v.timeBase},
      videoFilter: sourceSelect + ',setpts=N/(30*TB),scale=960:540:flags=bicubic,fps=30,setpts=N/(30*TB)',
      audioFilter: `atrim=start_pts=${sample.sourceStart}:end_pts=${sample.sourceEnd},asettb=expr=1/44100,asetpts=N`,
      expectedSamples: sample.sourceEnd - sample.sourceStart};
  });
  return {schemaVersion: 'presentation-dev-proxy-selected-source-recipe-v001', profile: clone(profile),
    sourceFrameClock: {inputFps: 60, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
      timeBase: v.timeBase, firstPts: 0, ptsStep: v.ptsStep, extraction: 'source-frame-60fps-global-even-v001'},
    audioClock: {sampleRate: 44100, channels: 2, sourceGridMappingEndSample: media.audioClock.sourceGridMappingEndSample},
    audioDecode: 'source-origin-zero-continuous-decoder-absolute-sample-trim-v001',
    frameCount: segments.at(-1).outputEndFrame, sampleCount: segments.at(-1).outputEndFrame * 1470,
    pieces, sourceScope: 'only explicitly selected bounded intervals; no whole-source proxy'};
}
export function buildPresentationDevProxySelectedPieceArgumentsV001({sourcePath, outputPath, piece}) {
  return [...common, '-copyts', '-ss', String(piece.seekSeconds), '-t', String(piece.boundedEndSeconds - piece.seekSeconds),
    '-i', sourcePath, '-t', String(piece.boundedEndSeconds), '-i', sourcePath,
    '-map', '0:v:0', '-map', '1:a:0', '-vf', piece.videoFilter, '-af', piece.audioFilter,
    ...nutEncode, outputPath];
}
// Evidence-only reconstruction of the failed extraction command. This is never
// used to create new media: sought AAC PCM is specifically not reused.
function failedSoughtAudioArguments({sourcePath, outputPath, piece}) {
  return [...common, '-copyts', '-ss', String(piece.seekSeconds), '-t', String(piece.boundedEndSeconds - piece.seekSeconds),
    '-i', sourcePath, '-map', '0:v:0', '-map', '0:a:0', '-vf', piece.videoFilter, '-af', piece.audioFilter,
    ...nutEncode, outputPath];
}
function recoveredVideoArguments({sourcePath, videoPath, outputPath, piece}) {
  return [...common, '-copyts', '-i', videoPath, '-t', String(piece.boundedEndSeconds), '-i', sourcePath,
    '-map', '0:v:0', '-map', '1:a:0', '-af', piece.audioFilter, '-c:v', 'copy',
    '-c:a', 'pcm_f32le', '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-f', 'nut', outputPath];
}
async function checkedVideoRecovery(videoRecovery, recipe, sourceRef, bound) {
  if (videoRecovery === null) return new Map();
  assert.equal(videoRecovery.schemaVersion, 'presentation-dev-proxy-aac-origin-recovery-v001');
  await verify(videoRecovery.failureRef); await verify(videoRecovery.implementationRef);
  const failure = await json(videoRecovery.failureRef.path);
  assert.equal(failure.status, 'incomplete');
  assert.match(failure.message, /^selected source audio samples changed/, 'only the recorded sought AAC failure is recoverable here');
  assert(Array.isArray(videoRecovery.pieces) && videoRecovery.pieces.length > 0);
  const rows = new Map();
  for (const [index, row] of videoRecovery.pieces.entries()) {
    assert.equal(row.pieceIndex, index, 'recovery must be an ordered completed-video prefix');
    assert(recipe.pieces[index]); await verify(row.mediaRef);
    const command = {command: bound.tools.ffmpegPath.path,
      args: failedSoughtAudioArguments({sourcePath: sourceRef.path, outputPath: row.mediaRef.path, piece: recipe.pieces[index]})};
    const observed = failure.processes.find(p => p.command === command.command && hash(p.args) === hash(command.args));
    assert(observed, 'successful original video command/source/interval missing');
    assert.equal(observed.code, 0); assert.equal(observed.signal, null); assert.equal(observed.argumentsSha256, hash(command.args));
    rows.set(index, {...clone(row), originalCommand: command});
  }
  return rows;
}
async function streams(file, tool, processes) {
  return JSON.parse((await execute(tool, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], processes)).stdout);
}
async function sourceStreams(sourceRef, inspection, bound, processes) {
  const observed = await streams(sourceRef.path, bound.tools.ffprobePath.path, processes);
  assert.equal(observed.streams.length, 2);
  const v = observed.streams.find(row => row.codec_type === 'video'), a = observed.streams.find(row => row.codec_type === 'audio');
  assert(v && a); assert.equal(v.width, 1920); assert.equal(v.height, 1080); assert.equal(v.r_frame_rate, '60/1');
  assert.equal(v.time_base, inspection.media.source.video.timeBase); assert.equal(Number(v.start_time), 0);
  assert.equal(a.time_base, '1/44100'); assert.equal(Number(a.sample_rate), 44100); assert.equal(a.channels, 2);
  assert(!(v.side_data_list ?? []).some(row => row.rotation));
  return observed;
}
async function sourcePts(sourceRef, piece, tool, processes) {
  const {startPts, endPtsExclusive, step} = piece.sourcePtsRange;
  const result = await execute(tool, ['-v', 'error', '-select_streams', 'v:0', '-read_intervals',
    `${piece.seekSeconds}%${piece.boundedEndSeconds}`, '-show_frames', '-show_entries', 'frame=pts', '-of', 'json', sourceRef.path], processes);
  const pts = JSON.parse(result.stdout).frames.map(row => row.pts).filter(value => startPts <= value && value < endPtsExclusive);
  assert.deepEqual(pts, Array.from({length: piece.frameCount * 2}, (_, i) => startPts + i * step), 'selected source frame sequence is incomplete or shifted');
  return expectedSourcePts(piece);
}
function expectedSourcePts(piece) {
  const {startPts, step} = piece.sourcePtsRange;
  const pts = Array.from({length: piece.frameCount * 2}, (_, i) => startPts + i * step);
  const selected = pts.filter(value => value % (2 * step) === 0); assert.equal(selected.length, piece.frameCount);
  return {status: 'passed', sourceDecodedFrames: pts.length, outputFrames: selected.length,
    sourcePtsRange: clone(piece.sourcePtsRange), allSourcePtsCanonicalSha256: hash(pts), selectedPtsCanonicalSha256: hash(selected),
    firstSelectedPts: selected[0], lastSelectedPts: selected.at(-1),
    rule: 'absolute source PTS on the original global-even grid; never local decoder ordinal parity'};
}
function savedMedia(observed, frameCount, sampleCount) {
  assert.equal(observed.status, 'passed');
  for (const [key, value] of Object.entries({width: 960, height: 540, fps: 30, frameCount})) assert.equal(observed.video[key], value);
  for (const [key, value] of Object.entries({codec: 'pcm_f32le', sampleRate: 44100, channels: 2, sampleCount})) assert.equal(observed.audio[key], value);
  assert.equal(observed.audio.pcm.bytes, sampleCount * 8);
  for (const value of [observed.video.decodedPtsSha256, observed.audio.pcm.sha256]) assert(/^[a-f0-9]{64}$/.test(value));
}
function observationRequested(verification) {
  assert(['saved-receipt', 'independent-observation'].includes(verification), 'unknown verification mode');
  return verification === 'independent-observation';
}
async function pcmPayload(command, args, processes, sharedHash = null) {
  const h = createHash('sha256'); let bytes = 0;
  await execute(command, args, processes, {bytes(value) {h.update(value); sharedHash?.update(value); bytes += value.length;}});
  return {bytes, sha256: h.digest('hex')};
}
async function videoPacketPayload(file, tool, processes, sharedHash = null) {
  const payload = createHash('sha256'); let packets = 0;
  await execute(tool, ['-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256',
    '-show_entries', 'packet=data_hash', '-of', 'compact=p=0:nk=0', file], processes, {line(value) {
    const match = /^data_hash=SHA256:([a-f0-9]{64})\|?$/.exec(value); assert(match, 'video packet payload hash required');
    payload.update(match[1] + '\n'); sharedHash?.update(match[1] + '\n'); packets++;
  }});
  return {packets, packetHashesSha256: payload.digest('hex')};
}
const pcmArgs = file => ['-hide_banner', '-nostdin', '-v', 'error', '-i', file, '-map', '0:a:0', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];
async function observeMedia(file, frameCount, sampleCount, bound, processes) {
  const observed = await streams(file, bound.tools.ffprobePath.path, processes); assert.equal(observed.streams.length, 2);
  const v = observed.streams.find(row => row.codec_type === 'video'), a = observed.streams.find(row => row.codec_type === 'audio');
  assert(v && a); assert.equal(v.width, 960); assert.equal(v.height, 540); assert.equal(v.codec_name, 'h264');
  assert.equal(v.pix_fmt, 'yuv420p'); assert.equal(v.r_frame_rate, '30/1'); assert.equal(Number(v.start_time), 0);
  assert.equal(a.codec_name, 'pcm_f32le'); assert.equal(Number(a.sample_rate), 44100); assert.equal(a.channels, 2); assert.equal(Number(a.start_time), 0);
  const [num, den] = v.time_base.split('/').map(BigInt), timestamps = createHash('sha256'); let count = 0;
  await execute(bound.tools.ffprobePath.path, ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
    '-show_entries', 'frame=pts:frame_side_data=', '-of', 'compact=p=0:nk=0', file], processes, {line(value) {
    assert(/^pts=-?\d+\|?$/.test(value)); const pts = BigInt(value.match(/-?\d+/)[0]);
    assert.equal(pts * num * 30n, BigInt(count) * den, 'output frame clock changed'); timestamps.update(value + '\n'); count++;
  }});
  assert.equal(count, frameCount);
  const pcm = await pcmPayload(bound.tools.ffmpegPath.path, pcmArgs(file), processes);
  assert.equal(pcm.bytes, sampleCount * 8, 'output PCM sample count changed');
  return {status: 'passed', video: {width: 960, height: 540, fps: 30, frameCount: count, timeBase: v.time_base,
    decodedPtsSha256: timestamps.digest('hex'), rule: 'every decoded PTS equals frame index / 30'},
    audio: {codec: 'pcm_f32le', sampleRate: 44100, channels: 2, sampleCount, pcm}};
}
async function selectedAudio(sourceRef, piece, bound, processes) {
  // AAC can retain decoder state far beyond a short preroll. The sole PCM
  // authority is continuous decoding from source origin. Map audio only;
  // discard earlier samples in the filter, never materialize whole-source PCM.
  return pcmPayload(bound.tools.ffmpegPath.path, ['-hide_banner', '-nostdin', '-v', 'error', '-copyts',
    '-t', String(piece.boundedEndSeconds), '-i', sourceRef.path, '-map', '0:a:0', '-vn',
    '-af', piece.audioFilter, '-c:a', 'pcm_f32le', '-f', 'f32le', '-'], processes);
}
const sealed = body => ({...body, manifestSha256: hash(body)});
function checkSeal(manifest, schemaVersion) {
  const {manifestSha256, ...body} = manifest; assert.equal(manifestSha256, hash(body), 'manifest changed');
  assert.equal(body.schemaVersion, schemaVersion); assert.equal(body.status, 'passed');
  assert.equal(body.finalPixelQc, 'not-run-dev-only'); assert.equal(body.humanQuality, 'not-evaluated');
  assert(Array.isArray(body.processes) && body.processes.length > 0, 'completed process evidence required');
  for (const row of body.processes) {
    assert.equal(row.code, 0); assert.equal(row.signal, null); assert.equal(row.argumentsSha256, hash(row.args));
    assert([body.bindings.tools.ffmpegPath.path, body.bindings.tools.ffprobePath.path].includes(row.command));
    for (const value of [row.stdoutSha256, row.stderrSha256]) assert(/^[a-f0-9]{64}$/.test(value));
  }
}
const concatTextFor = pieces => 'ffconcat version 1.0\n' + pieces.map(row => `file '${row.mediaRef.path.replaceAll("'", "'\\''")}'\n`).join('');
const concatArguments = (concatPath, mediaPath) => [...common, '-f', 'concat', '-safe', '0', '-i', concatPath,
  '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
  // NUT's inferred end-of-file duration need not equal the complete 30fps
  // interval. bf=0 makes packet order identical to frame order; reset only
  // packet timestamps, retaining the encoded image payload unchanged.
  '-bsf:v', 'setts=pts=N/(30*TB):dts=N/(30*TB):duration=1/(30*TB)',
  '-af', 'asettb=expr=1/44100,asetpts=N', '-c:a', 'pcm_f32le', '-map_metadata', '-1', '-f', 'nut', mediaPath];
function requireCommand(manifest, command) {
  assert(manifest.processes.some(row => row.command === command.command && hash(row.args) === hash(command.args)),
    'successful production command missing');
}
async function unusedDirectory(outputDirectory) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory});
  await noSymlinks(path.dirname(outputDirectory)); await mkdir(outputDirectory);
}
async function currentBase({sourceRef, sourceInspectionRef, segments, profileId, tools}) {
  await verify(sourceRef); await verify(sourceInspectionRef); const inspection = await json(sourceInspectionRef.path);
  const recipe = derivePresentationDevProxyStructureRecipeV001({sourceRef, inspection, segments, profileId});
  return {inspection, recipe, bound: await bindings(tools)};
}

export async function buildPresentationDevProxyStructureBaseV001({sourceRef, sourceInspectionRef, segments,
  profileId, tools, outputDirectory, videoRecovery = null}) {
  const {inspection, recipe, bound} = await currentBase({sourceRef, sourceInspectionRef, segments, profileId, tools});
  const recovery = await checkedVideoRecovery(videoRecovery, recipe, sourceRef, bound);
  await unusedDirectory(outputDirectory); const processes = [], pieces = [], startedAt = new Date().toISOString(), start = performance.now();
  try {
    await sourceStreams(sourceRef, inspection, bound, processes);
    for (const [index, piece] of recipe.pieces.entries()) {
      const outputPath = path.join(outputDirectory, `piece-${String(index + 1).padStart(4, '0')}.nut`);
      const pts = await sourcePts(sourceRef, piece, bound.tools.ffprobePath.path, processes);
      const reuse = recovery.get(index) ?? null;
      const recoveredFrom = reuse === null ? null : {...reuse,
        media: await observeMedia(reuse.mediaRef.path, piece.frameCount, piece.expectedSamples, bound, processes),
        videoPacketIdentity: await videoPacketPayload(reuse.mediaRef.path, bound.tools.ffprobePath.path, processes)};
      const args = reuse === null ? buildPresentationDevProxySelectedPieceArgumentsV001({sourcePath: sourceRef.path, outputPath, piece})
        : recoveredVideoArguments({sourcePath: sourceRef.path, videoPath: reuse.mediaRef.path, outputPath, piece});
      await execute(bound.tools.ffmpegPath.path, args, processes);
      const media = await observeMedia(outputPath, piece.frameCount, piece.expectedSamples, bound, processes);
      const expectedPcm = await selectedAudio(sourceRef, piece, bound, processes);
      same(media.audio.pcm, expectedPcm, 'selected source audio samples changed');
      if (recoveredFrom) same(await videoPacketPayload(outputPath, bound.tools.ffprobePath.path, processes),
        recoveredFrom.videoPacketIdentity, 'recovered video packet payload changed');
      pieces.push({recipe: clone(piece), pts, expectedPcm, media, recoveredFrom,
        mediaRef: await bind(outputPath), command: {command: bound.tools.ffmpegPath.path, args}});
    }
    const concatPath = path.join(outputDirectory, 'pieces.ffconcat');
    const concatText = concatTextFor(pieces);
    await writeFile(concatPath, concatText, {flag: 'wx'});
    const mediaPath = path.join(outputDirectory, 'selected-base.nut');
    const args = concatArguments(concatPath, mediaPath);
    await execute(bound.tools.ffmpegPath.path, args, processes);
    const media = await observeMedia(mediaPath, recipe.frameCount, recipe.sampleCount, bound, processes);
    const joinedPcm = createHash('sha256'), joinedVideo = createHash('sha256'); let joinedBytes = 0, joinedPackets = 0;
    for (const piece of pieces) {
      const pcm = await pcmPayload(bound.tools.ffmpegPath.path, pcmArgs(piece.mediaRef.path), processes, joinedPcm); joinedBytes += pcm.bytes;
      const packet = await videoPacketPayload(piece.mediaRef.path, bound.tools.ffprobePath.path, processes, joinedVideo); joinedPackets += packet.packets;
    }
    same(media.audio.pcm, {bytes: joinedBytes, sha256: joinedPcm.digest('hex')}, 'selected audio order changed in concatenation');
    const videoPacketIdentity = await videoPacketPayload(mediaPath, bound.tools.ffprobePath.path, processes);
    assert.equal(joinedPackets, recipe.frameCount);
    same(videoPacketIdentity, {packets: joinedPackets, packetHashesSha256: joinedVideo.digest('hex')}, 'encoded image packet order/payload changed during timestamp repair');
    await verify(sourceRef); await verify(sourceInspectionRef); same(await bindings(tools), bound, 'execution binding changed');
    await checkedVideoRecovery(videoRecovery, recipe, sourceRef, bound);
    const manifest = sealed({schemaVersion: PRESENTATION_DEV_PROXY_STRUCTURE_BASE_SCHEMA_V001, status: 'passed',
      profile: recipe.profile, sourceRef, sourceInspectionRef, segments: clone(segments), recipe, bindings: bound, videoRecovery,
      pieces, concatRef: await bind(concatPath), concatText, concatCommand: {command: bound.tools.ffmpegPath.path, args},
      mediaRef: await bind(mediaPath), media, videoPacketIdentity, startedAt, endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - start,
      processes, finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'});
    const manifestRef = await save(path.join(outputDirectory, 'base-manifest.json'), manifest);
    return {manifestRef, mediaRef: manifest.mediaRef, manifest};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {status: 'incomplete', startedAt, message: error.message, processes}).catch(() => {}); throw error;
  }
}

/** Saved-receipt reads rehash retained bytes and all source/recipe/tool bindings.
 * Independent observation additionally decodes the selected intervals again;
 * it is reported separately and is never implied by a normal receipt read. */
export async function readPresentationDevProxyStructureBaseV001({manifestRef, profileId, tools, verification = 'saved-receipt'}) {
  const independent = observationRequested(verification);
  await verify(manifestRef); const manifest = await json(manifestRef.path); checkSeal(manifest, PRESENTATION_DEV_PROXY_STRUCTURE_BASE_SCHEMA_V001);
  const {recipe, bound} = await currentBase({...manifest, profileId, tools});
  same(manifest.profile, assertPresentationDevProxyProfileV001(profileId), 'profile mismatch');
  same(manifest.recipe, recipe, 'selected source recipe mismatch'); same(manifest.bindings, bound, 'source/tool/code binding mismatch');
  const recovery = await checkedVideoRecovery(manifest.videoRecovery, recipe, manifest.sourceRef, bound);
  await verify(manifest.concatRef); assert.equal(await readFile(manifest.concatRef.path, 'utf8'), manifest.concatText);
  assert.equal(manifest.concatText, concatTextFor(manifest.pieces), 'concatenated piece order differs');
  same(manifest.concatCommand, {command: bound.tools.ffmpegPath.path,
    args: concatArguments(manifest.concatRef.path, manifest.mediaRef.path)}, 'concat command differs');
  requireCommand(manifest, manifest.concatCommand);
  assert.equal(manifest.pieces.length, recipe.pieces.length);
  const processes = [], joinedPcm = createHash('sha256'), joinedVideo = createHash('sha256'); let joinedBytes = 0, joinedPackets = 0;
  for (const [index, row] of manifest.pieces.entries()) {
    same(row.recipe, recipe.pieces[index], 'piece order changed'); await verify(row.mediaRef);
    const reuse = recovery.get(index) ?? null;
    assert.equal(row.recoveredFrom !== null, reuse !== null, 'recovery coverage differs');
    if (reuse !== null) {
      same({pieceIndex: row.recoveredFrom.pieceIndex, mediaRef: row.recoveredFrom.mediaRef, originalCommand: row.recoveredFrom.originalCommand}, reuse);
      savedMedia(row.recoveredFrom.media, row.recipe.frameCount, row.recipe.expectedSamples);
    }
    same(row.command, {command: bound.tools.ffmpegPath.path,
      args: reuse === null ? buildPresentationDevProxySelectedPieceArgumentsV001({sourcePath: manifest.sourceRef.path, outputPath: row.mediaRef.path, piece: row.recipe})
        : recoveredVideoArguments({sourcePath: manifest.sourceRef.path, videoPath: reuse.mediaRef.path, outputPath: row.mediaRef.path, piece: row.recipe})}, 'piece command mismatch');
    requireCommand(manifest, row.command);
    same(row.pts, expectedSourcePts(row.recipe), 'saved source PTS differs from source grid');
    savedMedia(row.media, row.recipe.frameCount, row.recipe.expectedSamples);
    same(row.media.audio.pcm, row.expectedPcm, 'saved independent source PCM differs');
    if (independent) {
      same(row.pts, await sourcePts(manifest.sourceRef, row.recipe, bound.tools.ffprobePath.path, processes), 'source PTS changed');
      const media = await observeMedia(row.mediaRef.path, row.recipe.frameCount, row.recipe.expectedSamples, bound, processes);
      same(media, row.media, 'saved piece observation differs');
      same(media.audio.pcm, await selectedAudio(manifest.sourceRef, row.recipe, bound, processes), 'independent source PCM differs');
      const pcm = await pcmPayload(bound.tools.ffmpegPath.path, pcmArgs(row.mediaRef.path), processes, joinedPcm); joinedBytes += pcm.bytes;
      const packet = await videoPacketPayload(row.mediaRef.path, bound.tools.ffprobePath.path, processes, joinedVideo); joinedPackets += packet.packets;
      if (reuse !== null) {
        same(await observeMedia(reuse.mediaRef.path, row.recipe.frameCount, row.recipe.expectedSamples, bound, processes), row.recoveredFrom.media);
        same(await videoPacketPayload(reuse.mediaRef.path, bound.tools.ffprobePath.path, processes), row.recoveredFrom.videoPacketIdentity);
        same(packet, row.recoveredFrom.videoPacketIdentity, 'recovered saved video packet payload differs');
      }
    }
  }
  await verify(manifest.mediaRef);
  savedMedia(manifest.media, recipe.frameCount, recipe.sampleCount);
  assert.equal(manifest.videoPacketIdentity.packets, recipe.frameCount);
  assert(/^[a-f0-9]{64}$/.test(manifest.videoPacketIdentity.packetHashesSha256));
  if (independent) {
    const observed = await observeMedia(manifest.mediaRef.path, recipe.frameCount, recipe.sampleCount, bound, processes);
    same(observed, manifest.media, 'saved base media differs'); same(observed.audio.pcm, {bytes: joinedBytes, sha256: joinedPcm.digest('hex')});
    const packetIdentity = await videoPacketPayload(manifest.mediaRef.path, bound.tools.ffprobePath.path, processes);
    assert.equal(joinedPackets, recipe.frameCount);
    same(packetIdentity, {packets: joinedPackets, packetHashesSha256: joinedVideo.digest('hex')}, 'saved encoded image payload differs');
    same(packetIdentity, manifest.videoPacketIdentity, 'saved packet identity differs');
  }
  await verify(manifestRef);
  return {manifestRef, mediaRef: manifest.mediaRef, manifest, verification: {mode: verification, status: 'passed'},
    ...(independent ? {independentVerification: {status: 'passed', processes}} : {})};
}

async function checkedProjection(projection, base) {
  const s = projection.sourceClock;
  assert.equal(s.mediaRef.path, base.mediaRef.path); assert.equal(s.mediaRef.fileSha256, base.mediaRef.fileSha256);
  assert.equal(s.playbackSampleRate, 44100); assert.equal(s.observationSampleRate, 16000);
  await verify(s.planRef); await verify(s.timelineRef);
  const planBytes = await readFile(s.planRef.path), timelineBytes = await readFile(s.timelineRef.path), timeline = JSON.parse(timelineBytes);
  const expectedSegments = base.manifest.segments.map(({audioSamples, ...segment}) => segment);
  same(timeline.segments, expectedSegments, 'new timeline differs from selected source mapping');
  assert.equal(timeline.baseMedia.expectedFrameCount, base.manifest.recipe.frameCount);
  assertProjectionMatchesStateV001({projection, digestRef: s.digestRef, planRef: s.planRef, timelineRef: s.timelineRef,
    mediaRef: s.mediaRef, planBytes, timelineBytes, playbackSampleRate: s.playbackSampleRate,
    observationSampleRate: s.observationSampleRate,
    connections: projection.connections.map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion}))});
  return {planRef: s.planRef, timelineRef: s.timelineRef};
}
function backgroundRecipe(projection, basePath, mediaPath, profile) {
  const filters = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: projection.presentationTimeline,
    canvas: profile.outputCanvas, audio: {sampleRate: 44100, channelLayout: 'stereo'}, softWindows: projection.softWindows});
  const args = [...common, '-filter_complex_threads', '1', '-i', basePath, '-filter_complex', filters.join(';'),
    '-map', '[timelineVideo]', '-map', '[timelineAudio]', ...nutEncode, mediaPath];
  return {filters, args};
}
async function expectedBackgroundPcm(basePath, projection, bound, processes) {
  // Audio-only reference follows the saved spans independently of the coupled
  // renderer graph. Silence exists only for explicit finite inserted spans.
  const frames = projection.presentationTimeline.spans, branches = [], labels = [];
  frames.forEach((span, index) => {
    const label = 'a' + index, samples = (span.endFrameExclusive - span.startFrame) * 1470; labels.push('[' + label + ']');
    branches.push(span.kind === 'base'
      ? `[0:a]atrim=start_sample=${span.baseStartFrame * 1470}:end_sample=${span.baseEndFrame * 1470},asettb=1/44100,asetpts=N[${label}]`
      : `anullsrc=r=44100:cl=stereo,atrim=end_sample=${samples},asettb=1/44100,asetpts=N[${label}]`);
  });
  branches.push(labels.join('') + `concat=n=${frames.length}:v=0:a=1,asettb=1/44100,asetpts=N[a]`);
  return pcmPayload(bound.tools.ffmpegPath.path, ['-hide_banner', '-nostdin', '-v', 'error', '-i', basePath,
    '-filter_complex', branches.join(';'), '-map', '[a]', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-'], processes);
}
function proxyClock(projection) {
  return {schemaVersion: 'presentation-dev-proxy-source-clock-v001', kind: 'projected-background', inputFps: 30,
    inputFrameCount: projection.displayFrameCount, logicalStartFrame: 0, logicalEndFrameExclusive: projection.displayFrameCount,
    sourceClockSha256: projection.sourceClockSha256, projectionSha256: projection.projectionSha256,
    audio: {sampleRate: 44100, channels: 2}};
}
function resultFor(manifest, manifestRef, independentVerification = null) {
  const backgroundProof = {schemaVersion: PRESENTATION_DEV_PROXY_STRUCTURE_BACKGROUND_SCHEMA_V001, status: 'passed',
    projectionSha256: manifest.projection.projectionSha256, sourceClockSha256: manifest.projection.sourceClockSha256,
    displayFrameCount: manifest.projection.displayFrameCount, outputs: {background: manifest.mediaRef},
    finalPixelQc: 'not-run-dev-only'};
  return {manifest, manifestRef, mediaRef: manifest.mediaRef, backgroundProof, ...(independentVerification ? {independentVerification} : {})};
}
export async function buildPresentationDevProxyStructureBackgroundV001({baseManifestRef, projection, profileId, tools, outputDirectory}) {
  const profile = assertPresentationDevProxyProfileV001(profileId);
  const base = await readPresentationDevProxyStructureBaseV001({manifestRef: baseManifestRef, profileId, tools});
  const projectionInputs = await checkedProjection(projection, base), bound = await bindings(tools);
  await unusedDirectory(outputDirectory); const processes = [], startedAt = new Date().toISOString(), start = performance.now();
  try {
    const mediaPath = path.join(outputDirectory, 'background-proxy.nut'), recipe = backgroundRecipe(projection, base.mediaRef.path, mediaPath, profile);
    await execute(bound.tools.ffmpegPath.path, recipe.args, processes);
    const observed = await observeMedia(mediaPath, projection.displayFrameCount, projection.displayPlaybackSampleCount, bound, processes);
    const expectedPcm = await expectedBackgroundPcm(base.mediaRef.path, projection, bound, processes);
    same(observed.audio.pcm, expectedPcm, 'connection audio differs from retained samples and explicit silence');
    await verify(base.mediaRef); await verify(baseManifestRef); for (const ref of Object.values(projectionInputs)) await verify(ref);
    same(await bindings(tools), bound, 'execution binding changed');
    const mediaRef = await bind(mediaPath), manifest = sealed({schemaVersion: PRESENTATION_DEV_PROXY_STRUCTURE_BACKGROUND_SCHEMA_V001,
      status: 'passed', profile: clone(profile), baseManifestRef, sourceRef: base.mediaRef, projection: clone(projection), projectionInputs,
      sourceClock: proxyClock(projection), bindings: bound, recipe, mediaRef, observed, expectedPcm,
      audio: {status: 'passed', source: {codec: 'pcm_f32le', sampleRate: 44100, channels: 2}, output: observed.audio,
        mode: 'retained PCM samples in saved order plus only declared connection silence'},
      projectionSha256: projection.projectionSha256, displayFrameCount: projection.displayFrameCount, outputs: {background: mediaRef},
      startedAt, endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - start, processes,
      finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'});
    return resultFor(manifest, await save(path.join(outputDirectory, 'structure-background-manifest.json'), manifest));
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {status: 'incomplete', startedAt, message: error.message, processes}).catch(() => {}); throw error;
  }
}
export async function readPresentationDevProxyStructureBackgroundV001({manifestRef, profileId, tools, expectedProjection = null, verification = 'saved-receipt'}) {
  const independent = observationRequested(verification);
  await verify(manifestRef); const manifest = await json(manifestRef.path);
  checkSeal(manifest, PRESENTATION_DEV_PROXY_STRUCTURE_BACKGROUND_SCHEMA_V001);
  const profile = assertPresentationDevProxyProfileV001(profileId); same(manifest.profile, profile, 'profile differs');
  if (expectedProjection !== null) same(manifest.projection, expectedProjection, 'different requested structure projection');
  const base = await readPresentationDevProxyStructureBaseV001({manifestRef: manifest.baseManifestRef, profileId, tools, verification});
  same(manifest.sourceRef, base.mediaRef, 'background belongs to a different selected base');
  same(manifest.projectionInputs, await checkedProjection(manifest.projection, base));
  same(manifest.sourceClock, proxyClock(manifest.projection), 'saved background clock changed');
  const bound = await bindings(tools); same(manifest.bindings, bound, 'tool or implementation changed');
  same(manifest.recipe, backgroundRecipe(manifest.projection, base.mediaRef.path, manifest.mediaRef.path, profile), 'background recipe changed');
  requireCommand(manifest, {command: bound.tools.ffmpegPath.path, args: manifest.recipe.args});
  await verify(manifest.mediaRef); const processes = [];
  savedMedia(manifest.observed, manifest.projection.displayFrameCount, manifest.projection.displayPlaybackSampleCount);
  same(manifest.observed.audio.pcm, manifest.expectedPcm, 'saved independent connection PCM differs');
  if (independent) {
    const observed = await observeMedia(manifest.mediaRef.path, manifest.projection.displayFrameCount,
      manifest.projection.displayPlaybackSampleCount, bound, processes);
    same(observed, manifest.observed, 'saved background media observation changed');
    const expectedPcm = await expectedBackgroundPcm(base.mediaRef.path, manifest.projection, bound, processes);
    same(observed.audio.pcm, expectedPcm, 'saved connection PCM differs'); same(expectedPcm, manifest.expectedPcm);
  }
  assert.equal(manifest.audio.source.codec, 'pcm_f32le'); assert.equal(manifest.audio.status, 'passed');
  assert.equal(manifest.projectionSha256, manifest.projection.projectionSha256); assert.equal(manifest.displayFrameCount, manifest.projection.displayFrameCount);
  same(manifest.outputs.background, manifest.mediaRef); await verify(manifestRef);
  return {...resultFor(manifest, manifestRef, independent ? {status: 'passed', processes, sourceBase: base.independentVerification} : null),
    verification: {mode: verification, status: 'passed'}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, mkdtemp, open, readFile, lstat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {joinQ5LosslessPiecesV001, verifyQ5OrderedLosslessV001, drawQ5NormalShortV002,
  loadQ5RenderInputsV002, verifyQ5RetentionEvidenceV002, assertQ5OriginalBackgroundIdentityV001} from './q5-render.mjs';
import {buildPresentationBaseMediaVideoV001, muxPresentationBaseMediaV001, inspectMp4MovieTimeScaleV001}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {inspectOrchestrationEncodedAudioV001, verifyOrchestrationObservationCopiesV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {buildPresentationCompositeArgumentsV001, composePresentationMediaV001}
  from '../../evals/clip_composition/render_presentation_v002.mjs';

const execute = promisify(execFile), hash = value => createHash('sha256').update(value).digest('hex');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const parent = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q5-1-20260920-v001');
const ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe';
const tools = {ffmpegPath: ffmpeg, ffprobePath: ffprobe};
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const ref = async file => ({path: file, bytes: (await lstat(file)).size, fileSha256: hash(await readFile(file))});
const absent = async file => assert.rejects(lstat(file), {code: 'ENOENT'});
let rootPromise;
async function testDirectory(name) {
  rootPromise ??= (async () => {
    await mkdir(parent, {recursive: true});
    let root;
    if (process.env.ZEV_Q5_RENDER_TEST_OUTPUT) {
      root = path.resolve(process.env.ZEV_Q5_RENDER_TEST_OUTPUT);
      assert.equal(path.dirname(root), parent);
      assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: root});
      await mkdir(root);
    } else root = await mkdtemp(path.join(parent, 'render-tests-'));
    console.log('Q5 synthetic test evidence: ' + root);
    return root;
  })();
  const directory = path.join(await rootPromise, name); await mkdir(directory); return directory;
}
async function encodeRaw({videoRaw, pcmRaw, output, canvas, sampleRate = 48000}) {
  await execute(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-f', 'rawvideo', '-pix_fmt', 'yuv420p',
    '-video_size', canvas.width + 'x' + canvas.height, '-framerate', '30', '-i', videoRaw,
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', '2', '-i', pcmRaw,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'ffv1', '-level', '3', '-c:a', 'pcm_f32le', '-f', 'nut', output]);
}
async function makePiece(directory, name, frameCount, seed, canvas) {
  const videoRaw = path.join(directory, name + '.yuv'), pcmRaw = path.join(directory, name + '.f32le');
  const frameBytes = canvas.width * canvas.height * 3 / 2;
  const video = await open(videoRaw, 'wx');
  try {
    for (let frame = 0; frame < frameCount; frame++) {
      const bytes = Buffer.alloc(frameBytes, 128);
      bytes.fill(16 + (frame + seed) % 200, 0, canvas.width * canvas.height);
      await video.writeFile(bytes);
    }
  } finally {await video.close();}
  const pcm = Buffer.alloc(frameCount * 1600 * 8), signals = [0.125, -0.25, 0.5, -0.125];
  for (let sample = 0; sample < frameCount * 1600; sample++) {
    pcm.writeFloatLE(signals[(sample + seed) % signals.length], sample * 8);
    pcm.writeFloatLE(signals[(sample + seed + 1) % signals.length], sample * 8 + 4);
  }
  await writeFile(pcmRaw, pcm, {flag: 'wx'});
  const output = path.join(directory, name + '.nut');
  await encodeRaw({videoRaw, pcmRaw, output, canvas});
  return {piece: {frameCount, mediaRef: await ref(output)}, videoRaw, pcmRaw};
}
async function pair(directory, canvas = {width: 16, height: 16, fps: 30}, counts = [3, 4]) {
  const left = await makePiece(directory, 'left', counts[0], 1, canvas);
  const right = await makePiece(directory, 'right', counts[1], 100, canvas);
  const pieces = [left.piece, right.piece];
  const joined = await joinQ5LosslessPiecesV001({pieces, canvas, outputDirectory: path.join(directory, 'join')});
  return {canvas, pieces, joined, left, right};
}

test('ordered retained frames and both PCM channels survive a two-piece join and a new AAC encode', async () => {
  const directory = await testDirectory('lossless-and-aac'), f = await pair(directory);
  assert.equal(f.joined.video.frameCount, 7);
  assert.equal(f.joined.video.comparedBytes, 7 * 16 * 16 * 3 / 2);
  assert.equal(f.joined.audio.sampleCount, 11200); assert.equal(f.joined.audio.comparedBytes, 11200 * 8);
  assert.equal(f.joined.audio.expectedPayloadSha256, f.joined.audio.observedPayloadSha256);
  const independentPcm = Buffer.concat([await readFile(f.left.pcmRaw), await readFile(f.right.pcmRaw)]);
  assert.deepEqual(await readFile(f.joined.pcmRef.path), independentPcm);
  const videoPath = path.join(directory, 'video.mp4'), basePath = path.join(directory, 'base.mp4');
  await buildPresentationBaseMediaVideoV001(f.joined.joinedRef.path, videoPath, 30, [{sourceStartFrame30: 0, sourceEndFrame30: 7}]);
  await muxPresentationBaseMediaV001(videoPath, basePath, {sampleRate: 48000, channels: 2, channelLayout: 'stereo'},
    {present: true, encodePath: f.joined.pcmRef.path});
  const aac = await inspectOrchestrationEncodedAudioV001({audioPath: basePath, logicalSampleCount: 11200, sampleRate: 48000, ...tools});
  assert.equal(aac.presentationStartSample, 0); assert.equal(aac.presentationEndSampleExclusive, 11200);
  assert.equal(aac.logicalDecodedSampleCount, 11200); assert(aac.primingSkipSamples > 0);
  assert.equal(aac.firstPacket.pts, -aac.primingSkipSamples);
  assert.equal(aac.firstDecodedFrame.pts, 0);
  assert.equal(aac.rawDecodedSampleCount, aac.logicalDecodedSampleCount + aac.decodedTailSampleCount);
  assert(aac.decodedTailSampleCount >= 0);
  await save(path.join(directory, 'aac-clock.json'), aac);
  const original = await readFile(f.joined.joinedRef.path);
  await assert.rejects(joinQ5LosslessPiecesV001({pieces: f.pieces, canvas: f.canvas, outputDirectory: path.join(directory, 'join')}), /unused run directory/);
  await assert.rejects(verifyQ5OrderedLosslessV001({pieces: f.pieces, canvas: f.canvas, joinedPath: f.joined.joinedRef.path,
    pcmPath: f.joined.pcmRef.path}), /output already exists/);
  assert.deepEqual(await readFile(f.joined.joinedRef.path), original);
});

test('same counts cannot hide reversed video order, one changed audio sample, extra samples, or a 16kHz clock', async () => {
  const directory = await testDirectory('byte-negative-cases'), f = await pair(directory);
  const verify = (name, changes = {}) => verifyQ5OrderedLosslessV001({pieces: f.pieces, canvas: f.canvas,
    joinedPath: f.joined.joinedRef.path, pcmPath: path.join(directory, name + '-verified.f32le'), ...changes});
  await assert.rejects(verify('wrong-order', {pieces: [...f.pieces].reverse()}), /video retained bytes differ/);
  await assert.rejects(verify('wrong-frame-count', {pieces: [{...f.pieces[0], frameCount: 2}, f.pieces[1]]}), /video retained piece has excess bytes/);
  const videoRaw = path.join(directory, 'joined.yuv');
  await writeFile(videoRaw, Buffer.concat([await readFile(f.left.videoRaw), await readFile(f.right.videoRaw)]), {flag: 'wx'});
  const expectedPcm = await readFile(f.joined.pcmRef.path);
  const changed = Buffer.from(expectedPcm); changed.writeFloatLE(0.75, 3 * 1600 * 8 + 4);
  const audioCases = [{name: 'one-right-channel-sample', bytes: changed, match: /audio retained bytes differ/},
    {name: 'extra-stereo-sample', bytes: Buffer.concat([expectedPcm, Buffer.alloc(8)]), match: /audio joined output has excess bytes/},
    {name: 'missing-stereo-sample', bytes: expectedPcm.subarray(0, -8), match: /audio joined output ended early/}];
  for (const item of audioCases) {
    const pcmRaw = path.join(directory, item.name + '.f32le'), output = path.join(directory, item.name + '.nut');
    await writeFile(pcmRaw, item.bytes, {flag: 'wx'}); await encodeRaw({videoRaw, pcmRaw, output, canvas: f.canvas});
    await assert.rejects(verify(item.name, {joinedPath: output}), item.match);
  }
  const wrongRate = path.join(directory, 'observation-clock.nut');
  await encodeRaw({videoRaw, pcmRaw: f.joined.pcmRef.path, output: wrongRate, canvas: f.canvas, sampleRate: 16000});
  await assert.rejects(verify('wrong-rate', {joinedPath: wrongRate}), /16000 !== 48000/);
  const stale = structuredClone(f.pieces); stale[0].mediaRef.fileSha256 = '0'.repeat(64);
  await assert.rejects(joinQ5LosslessPiecesV001({pieces: stale, canvas: f.canvas, outputDirectory: path.join(directory, 'stale-input')}), /input bytes changed/);
  await absent(path.join(directory, 'stale-input'));
});

test('V002 checks both retention policy and boundary evidence bytes before rendering and rejects old jobs or plans', async () => {
  const directory = await testDirectory('policy-and-fixed-entry');
  const policy = path.join(directory, 'policy.md'); await writeFile(policy, 'synthetic policy\n', {flag: 'wx'});
  const boundary = path.join(directory, 'boundary.json'); await save(boundary, {synthetic: true, retainedMarginFrames: 6});
  await save(path.join(directory, 'source.json'), {fixture: true});
  const savedEdit = {schemaVersion: 'q5-content-edit-plan-v002', policyRef: await ref(policy), boundaryEvidenceRef: await ref(boundary)};
  await save(path.join(directory, 'edit.json'), savedEdit);
  await save(path.join(directory, 'drawing.json'), {});
  await writeFile(path.join(directory, 'fixture-completed.mp4'), 'explicit fixture; not real media', {flag: 'wx'});
  const job = {schemaVersion: 'digest-quality-q5-render-job-v002', sourceRef: await ref(path.join(directory, 'source.json')),
    editPlanRef: await ref(path.join(directory, 'edit.json')), originalDrawingEvidenceRef: await ref(path.join(directory, 'drawing.json')),
    originalCompletedMediaRef: await ref(path.join(directory, 'fixture-completed.mp4'))};
  await assert.rejects(loadQ5RenderInputsV002(job), /Before must be the original Normal completion/);
  await assert.rejects(loadQ5RenderInputsV002({...job, schemaVersion: 'digest-quality-q5-render-job-v001'}), /render-job-v002/);
  await save(path.join(directory, 'old-edit.json'), {...savedEdit, schemaVersion: 'q5-content-edit-plan-v001'});
  await assert.rejects(loadQ5RenderInputsV002({...job, editPlanRef: await ref(path.join(directory, 'old-edit.json'))}),
    /requires an explicitly saved V002 content edit/);
  const {boundaryEvidenceRef: _boundary, ...missingBoundary} = savedEdit;
  await save(path.join(directory, 'missing-boundary-edit.json'), missingBoundary);
  await assert.rejects(loadQ5RenderInputsV002({...job, editPlanRef: await ref(path.join(directory, 'missing-boundary-edit.json'))}),
    /actual byte SHA required/);
  const wrongCount = structuredClone(job); wrongCount.sourceRef.bytes++;
  await assert.rejects(loadQ5RenderInputsV002(wrongCount), assert.AssertionError);
  await writeFile(policy, 'changed synthetic policy\n');
  await assert.rejects(loadQ5RenderInputsV002(job), /input bytes changed.*policy.md/);
  await writeFile(policy, 'synthetic policy\n');
  await writeFile(boundary, JSON.stringify({synthetic: true, retainedMarginFrames: 7}) + '\n');
  await assert.rejects(loadQ5RenderInputsV002(job), /input bytes changed.*boundary.json/);
});

test('V002 binds evidence meaning to the selected caption, actual media cut, original target and comparison context', async () => {
  const directory = await testDirectory('retention-evidence-meaning');
  const policyPath = path.join(directory, 'policy.md'); await writeFile(policyPath, 'synthetic retention policy\n', {flag: 'wx'});
  const policyRef = await ref(policyPath), beforeRange = {startFrame: 50, endFrameExclusive: 250};
  const resolved = {policyRef, candidateId: 'fixture-q5-one-candidate', hiddenCaptionId: 'fixture-q5-selected-caption',
    mediaOmission: {startFrame: 130, endFrameExclusive: 180},
    targetMediaRetention: {originalRange: {startFrame: 100, endFrameExclusive: 210}}};
  const evidence = {schemaVersion: 'q5-retention-priority-boundary-evidence-v002',
    policyRef, candidateId: resolved.candidateId, hiddenCaptionId: resolved.hiddenCaptionId,
    actualMediaOmission: resolved.mediaOmission, originalTargetRange: resolved.targetMediaRetention.originalRange,
    comparisonBeforeRange: beforeRange};
  await save(path.join(directory, 'boundary.json'), evidence);
  const verify = changed => verifyQ5RetentionEvidenceV002({evidence: changed, resolved, beforeRange});
  assert.deepEqual(await verify(await readJson(path.join(directory, 'boundary.json'))), policyRef);
  const noOptionalBytes = structuredClone(evidence); delete noOptionalBytes.policyRef.bytes;
  assert.deepEqual(await verify(noOptionalBytes), policyRef);
  const cases = [
    [copy => {copy.schemaVersion = 'q5-retention-priority-boundary-evidence-v001';}, /boundary-evidence-v002/],
    [copy => {copy.policyRef.path += '.another';}, /policy identity differs/],
    [copy => {copy.policyRef.fileSha256 = '0'.repeat(64);}, /policy identity differs/],
    [copy => {copy.policyRef.bytes++;}, assert.AssertionError],
    [copy => {copy.candidateId = 'fixture-another-candidate';}, /candidate differs/],
    [copy => {copy.hiddenCaptionId = 'fixture-another-caption';}, /hidden caption differs/],
    [copy => {copy.actualMediaOmission.startFrame++;}, /media omission differs/],
    [copy => {copy.originalTargetRange.endFrameExclusive++;}, /original target range differs/],
    [copy => {copy.comparisonBeforeRange.startFrame--;}, /comparison context differs/],
  ];
  for (const [change, match] of cases) {
    const changed = structuredClone(evidence); change(changed); await assert.rejects(verify(changed), match);
  }
  await writeFile(policyPath, 'changed synthetic retention policy\n');
  await assert.rejects(verify(evidence), /input bytes changed.*policy.md/);
});

test('V002 observation copies require both original role identities and actual unchanged copy bytes without reading deleted paths', async () => {
  const directory = await testDirectory('explicit-observation-copies');
  const copies = [];
  for (const role of ['candidates', 'peaks']) {
    const file = path.join(directory, 'saved-' + role + '.json');
    await save(file, {synthetic: true, role});
    const copyRef = await ref(file);
    copies.push({role, originalRef: {path: path.join(directory, 'deleted-original-' + role + '.json'), fileSha256: copyRef.fileSha256}, copyRef});
  }
  const pulseTimingEvidence = Object.fromEntries(copies.map(mapping => [mapping.role + 'Ref', structuredClone(mapping.originalRef)]));
  const original = structuredClone(pulseTimingEvidence), mappings = structuredClone(copies);
  const verify = value => verifyOrchestrationObservationCopiesV001({pulseTimingEvidence, originalObservationCopies: value});
  assert.deepEqual(await verify(copies), copies);
  assert.deepEqual(await verify([...copies].reverse()), copies);
  assert.deepEqual(pulseTimingEvidence, original); assert.deepEqual(copies, mappings);
  for (const mapping of copies) await absent(mapping.originalRef.path);
  for (const invalid of [undefined, [], copies.slice(0, 1), [...copies, structuredClone(copies[0])]]) {
    await assert.rejects(verify(invalid), /exactly two explicit/);
  }
  const cases = [
    [copy => {copy[1].role = 'media';}, /role is extra, missing or duplicated/],
    [copy => {copy[1].role = 'plan';}, /role is extra, missing or duplicated/],
    [copy => {copy[1].role = 'candidates';}, /role is extra, missing or duplicated/],
    [copy => {copy[0].unexpected = true;}, /role is extra, missing or duplicated/],
    [copy => {copy[0].originalRef.path += '.another';}, /original role path and SHA/],
    [copy => {copy[0].originalRef.fileSha256 = '0'.repeat(64);}, /original role path and SHA/],
    [copy => {copy[0].copyRef.fileSha256 = '0'.repeat(64);}, /copy SHA differs from original/],
    [copy => {copy[0].copyRef.bytes++;}, /file binding differs/],
    [copy => {delete copy[0].copyRef.bytes;}, /file SHA\/size is missing or invalid/],
    [copy => {copy[0].copyRef.path = copy[0].originalRef.path;}, /paths are duplicated/],
  ];
  for (const [change, match] of cases) {
    const changed = structuredClone(copies); change(changed); await assert.rejects(verify(changed), match);
  }
  const duplicateCopy = structuredClone(copies), samePayloadTiming = structuredClone(pulseTimingEvidence);
  duplicateCopy[1].originalRef.fileSha256 = copies[0].originalRef.fileSha256;
  duplicateCopy[1].copyRef = structuredClone(copies[0].copyRef);
  samePayloadTiming.peaksRef.fileSha256 = copies[0].originalRef.fileSha256;
  await assert.rejects(verifyOrchestrationObservationCopiesV001({pulseTimingEvidence: samePayloadTiming,
    originalObservationCopies: duplicateCopy}), /paths are duplicated/);
  await writeFile(copies[1].copyRef.path, 'changed saved observation bytes\n');
  await assert.rejects(verify(copies), /file binding differs/);
  for (const mapping of copies) await absent(mapping.originalRef.path);
});

test('V002 resolved-frame muxing preserves a seven-frame AAC clock, every packet and PCM byte for embedded or separate audio', async () => {
  const directory = await testDirectory('seven-frame-aac-clock'), f = await pair(directory);
  const videoPath = path.join(directory, 'video.mp4'), basePath = path.join(directory, 'base.mp4');
  await buildPresentationBaseMediaVideoV001(f.joined.joinedRef.path, videoPath, 30,
    [{sourceStartFrame30: 0, sourceEndFrame30: 7}]);
  await muxPresentationBaseMediaV001(videoPath, basePath, {sampleRate: 48000, channels: 2, channelLayout: 'stereo'},
    {present: true, encodePath: f.joined.pcmRef.path});
  const expectedSamples = 7 * 1600, plan = {canvas: f.canvas, elements: []};
  const compositor = {baseMediaPath: basePath, plan, overlayRecords: [], expectedFrameCount: 7,
    serializePngAndFilters: true, ffmpegPath: ffmpeg};
  const observe = async file => {
    const probe = JSON.parse((await execute(ffprobe, ['-v', 'error', '-select_streams', 'a:0',
      '-show_streams', '-show_packets', '-show_data_hash', 'sha256', '-show_entries',
      'stream=time_base,start_pts,duration_ts:packet=pts,dts,duration,size,data_hash,side_data_list', '-of', 'json', file])).stdout);
    const {stdout: pcm} = await execute(ffmpeg, ['-v', 'error', '-nostdin', '-i', file, '-map', '0:a:0', '-vn',
      '-c:a', 'pcm_f32le', '-f', 'f32le', '-'], {encoding: null, maxBuffer: 16 * 1024 * 1024});
    return {stream: probe.streams[0], packets: probe.packets, pcm, movieTimeScale: await inspectMp4MovieTimeScaleV001(file)};
  };
  const summarize = observed => ({stream: observed.stream, movieTimeScale: observed.movieTimeScale,
    packetCount: observed.packets.length, firstPacket: observed.packets[0], lastPacket: observed.packets.at(-1),
    rawDecodedSampleCount: observed.pcm.length / 8, rawDecodedPayloadSha256: hash(observed.pcm),
    logicalDecodedPayloadSha256: hash(observed.pcm.subarray(0, expectedSamples * 8))});
  const baseline = await observe(basePath);
  assert.equal(baseline.movieTimeScale, 30); assert.equal(baseline.stream.duration_ts, expectedSamples);
  const outputs = [];
  for (const [name, audioMediaPath] of [['embedded', null], ['separate', basePath]]) {
    const outputPath = path.join(directory, name + '.mp4'); await absent(outputPath);
    await composePresentationMediaV001({...compositor, audioMediaPath, outputPath});
    const inspected = await inspectOrchestrationEncodedAudioV001({audioPath: outputPath,
      logicalSampleCount: expectedSamples, sampleRate: 48000, ...tools});
    const observed = await observe(outputPath);
    assert.equal(observed.movieTimeScale, 30); assert.equal(observed.stream.duration_ts, expectedSamples);
    assert.deepEqual(observed.packets, baseline.packets, name + ' AAC packet data or clock changed');
    assert.deepEqual(observed.pcm, baseline.pcm, name + ' decoded PCM changed');
    outputs.push({name, mediaRef: await ref(outputPath), inspected, observed: summarize(observed),
      everyPacketIdentical: true, everyDecodedPcmByteIdentical: true});
  }
  const silentPath = path.join(directory, 'silent.mp4'); await absent(silentPath);
  await composePresentationMediaV001({...compositor, baseMediaPath: videoPath, outputPath: silentPath});
  const silent = JSON.parse((await execute(ffprobe, ['-v', 'error', '-show_streams', '-show_entries',
    'stream=codec_type,nb_frames', '-of', 'json', silentPath])).stdout);
  assert.deepEqual(silent.streams.map(row => row.codec_type), ['video']);
  assert.equal(silent.streams[0].nb_frames, '7'); assert.equal(await inspectMp4MovieTimeScaleV001(silentPath), 30);
  // Reproduce precisely the old omitted option; retain this failed synthetic result as evidence.
  const args = buildPresentationCompositeArgumentsV001(compositor);
  assert.deepEqual(args.slice(-2), ['-movie_timescale', '30']);
  const oldPath = path.join(directory, 'old-millisecond-clock.mp4'); await absent(oldPath);
  await execute(ffmpeg, [...args.slice(0, -2), '-movflags', '+faststart', oldPath]);
  await assert.rejects(inspectOrchestrationEncodedAudioV001({audioPath: oldPath,
    logicalSampleCount: expectedSamples, sampleRate: 48000, ...tools}), /AAC effective presentation clock differs/);
  const old = await observe(oldPath);
  assert.equal(old.movieTimeScale, 1000); assert.equal(old.stream.duration_ts, 11184);
  assert.deepEqual(old.packets, baseline.packets); assert.deepEqual(old.pcm, baseline.pcm);
  await save(path.join(directory, 'clock-regression.json'), {schemaVersion: 'q5-aac-frame-clock-regression-v001',
    synthetic: true, frameCount: 7, expectedSamples, baseRef: await ref(basePath), baseline: summarize(baseline), outputs,
    silentRef: await ref(silentPath), silentVideoFrameCount: 7,
    oldClockReproduction: {mediaRef: await ref(oldPath), observed: summarize(old),
      expectedFailure: 'AAC effective presentation clock differs', effectivePresentationShortfallSamples: 16,
      everyPacketIdentical: true, everyDecodedPcmByteIdentical: true}});
});

test('optional byte counts preserve original identity while another source or non-Normal cut is rejected', () => {
  const sourceRefs = Object.fromEntries(['planRef', 'timelineRef', 'mediaRef'].map((key, index) =>
    [key, {path: '/fixture/' + key, fileSha256: String(index + 1).repeat(64), bytes: 10 + index}]));
  const view = {sourceRefs: Object.fromEntries(Object.entries(sourceRefs).map(([key, {bytes: _bytes, ...value}]) => [key, value])),
    resolution: {connections: [{preset: 'normal-cut'}]}, projection: {displayFrameCount: 44408, sourceClock: {playbackSampleRate: 48000}}};
  assertQ5OriginalBackgroundIdentityV001({sourceRefs, view});
  for (const change of [copy => {copy.sourceRefs.mediaRef.path = '/fixture/other';},
    copy => {copy.sourceRefs.planRef.fileSha256 = 'f'.repeat(64);},
    copy => {copy.resolution.connections[0].preset = 'soft-separator';}]) {
    const changed = structuredClone(view); change(changed);
    assert.throws(() => assertQ5OriginalBackgroundIdentityV001({sourceRefs, view: changed}), /another source|original normal cuts/);
  }
});

async function normalFixture(directory, f) {
  // Only the saved Normal appearance is reused. Caption text, provenance, clock and media are explicit synthetic test data.
  const originalPlanPath = path.join(parent, '../quality-q4-20260920-v001/c-all-input-v001/raw-inputs/normal-plan.json');
  const bytes = await readFile(originalPlanPath);
  assert.equal(hash(bytes), '420bac69fb75c878a770406155171d5f09167ac22e41c1cd0c707f580229a778');
  const original = JSON.parse(bytes), indexed = indexExplicitLinesV001(['通常表示の確認']);
  assert.equal(indexed.status, 'passed');
  const count = f.pieces.reduce((sum, piece) => sum + piece.frameCount, 0);
  const caption = {...structuredClone(original.elements[0]), instructionId: 'fixture-q5-normal-caption',
    text: indexed.sourceText, indexedLines: indexed.indexedLines, startFrame: 2, endFrameExclusive: 14, displayFrameCount: 12,
    sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
    targetProvenance: {targetRefId: 'fixture-q5', targetType: 'synthetic-caption', sourceAtomIds: []}};
  const normalPlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    format: original.format, canvas: structuredClone(original.canvas), layoutRules: structuredClone(original.layoutRules), elements: [caption]};
  assert.deepEqual(Object.keys(normalPlan).sort(), Object.keys(original).sort());
  assert.equal(caption.visualState.textStyle.fontSizePx, 94);
  await save(path.join(directory, 'source.json'), {schemaVersion: 'q5-render-technical-fixture-v001', synthetic: true,
    originalMediaRead: false, realCandidateBoundary: false, inheritedAppearanceRef: await ref(originalPlanPath), pieces: f.pieces});
  const sourceRef = await ref(path.join(directory, 'source.json'));
  await save(path.join(directory, 'edit.json'), {schemaVersion: 'q5-render-technical-fixture-edit-v001', synthetic: true,
    sourceRef, contentVersion: 'fixture-q5-short-v001', status: 'unadopted-technical-fixture'});
  const editPlanRef = await ref(path.join(directory, 'edit.json'));
  const comparison = {schemaVersion: 'q5-content-comparison-range-v002', contentVersion: 'fixture-q5-short-v001',
    syntheticTechnicalFixture: true, afterRange: {startFrame: 0, endFrameExclusive: count}, normalPlan,
    pieces: f.pieces.map((piece, index) => ({...piece, ordinal: index + 1}))};
  await save(path.join(directory, 'comparison.json'), comparison);
  return {sourceRef, editPlanRef, comparisonRef: await ref(path.join(directory, 'comparison.json')), comparison};
}

test('one synthetic Normal caption passes the same short-media drawing, complete replay and native QC', async () => {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  const directory = await testDirectory('normal-native-common-qc');
  const f = await pair(directory, {width: 1920, height: 1080, fps: 30}, [18, 18]);
  const fixture = await normalFixture(directory, f);
  const result = await drawQ5NormalShortV002({...fixture, joined: f.joined, outputDirectory: path.join(directory, 'render'),
    evidenceDirectory: path.join(directory, 'normal'), onProgress: value => console.log('Q5 fixture: ' + JSON.stringify(value))});
  assert.equal(result.status, 'passed'); assert.equal(result.expectedFrameCount, 36);
  assert.equal(result.finalQc.status, 'passed'); assert.equal(result.completedFrameQc.status, 'passed');
  assert.equal(result.completedFrameQc.evidence.method, 'exact-replay-native-v1');
  assert.equal(result.completedFrameQc.inspections.length, 1);
  assert.equal(result.automaticResolution.automaticStatus, 'not-processed');
  assert.equal(result.baseAudio.packetPayloadSha256, result.finalAudio.packetPayloadSha256);
  assert.equal(result.baseAudio.logicalDecodedPayloadSha256, result.finalAudio.logicalDecodedPayloadSha256);
  assert.equal(result.finalAudio.logicalDecodedSampleCount, 57600);
  assert.equal(result.humanQuality, 'not-evaluated'); assert.equal(result.contentEditAdopted, false);
  assert.equal(result.publication.status, 'published');
  assert.equal((await ref(result.after.path)).fileSha256, result.after.fileSha256);
  const draw = await readJson(path.join(directory, 'normal/draw-result.json'));
  assert.deepEqual(draw.resolvedPlan, fixture.comparison.normalPlan);
  assert.equal(draw.resolvedPlan.elements[0].sourceStartMs, null);
  assert.equal(draw.resolvedPlan.elements[0].sourceEndMs, null);
  assert.equal(draw.resolvedPlan.elements[0].timelineSegmentId, null);
  assert.deepEqual(Object.keys(draw.autoPresentationInputs), ['context']);
  assert.equal(draw.autoPresentationInputs.context.pulseTimingEvidence, null);
  assert.equal(draw.outputMedia.video.frameCount, 36);
  const unsupported = structuredClone(fixture.comparison); unsupported.normalPlan.elements[0].visualState.position.preset = 'top-center';
  await save(path.join(directory, 'unsupported-comparison.json'), unsupported);
  const failedOutput = path.join(directory, 'unsupported-render');
  await assert.rejects(drawQ5NormalShortV002({...fixture, comparisonRef: await ref(path.join(directory, 'unsupported-comparison.json')),
    joined: f.joined, outputDirectory: failedOutput, evidenceDirectory: path.join(directory, 'unsupported-normal')}),
  /bound automatic bottom-center speech captions/);
  await absent(failedOutput);
  assert.equal((await readJson(path.join(directory, 'unsupported-normal/failure.json'))).status, 'failed');
});

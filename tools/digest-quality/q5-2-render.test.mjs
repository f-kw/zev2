import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, mkdtemp, open, readFile, lstat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {resolveQ52SourceExtractionV001, buildQ52SourcePieceV001, verifyQ52SourcePieceV001,
  drawQ52NormalShortV001, loadQ52RenderInputsV001, verifyQ52EvidenceV001} from './q5-2-render.mjs';
import {joinQ5LosslessPiecesV001} from './q5-render.mjs';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const execute = promisify(execFile), hash = value => createHash('sha256').update(value).digest('hex');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const parent = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q5-2-20260921-v001');
const ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe';
const tools = {ffmpegPath: ffmpeg, ffprobePath: ffprobe};
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const ref = async file => ({path: file, bytes: (await lstat(file)).size, fileSha256: hash(await readFile(file))});
let rootPromise;
async function testDirectory(name) {
  rootPromise ??= (async () => {
    await mkdir(parent, {recursive: true});
    let root;
    if (process.env.ZEV_Q52_RENDER_TEST_OUTPUT) {
      root = path.resolve(process.env.ZEV_Q52_RENDER_TEST_OUTPUT);
      assert.equal(path.dirname(root), parent);
      assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: root});
      await mkdir(root);
    } else root = await mkdtemp(path.join(parent, 'render-tests-'));
    console.log('Q5-2 synthetic test evidence: ' + root); return root;
  })();
  const directory = path.join(await rootPromise, name); await mkdir(directory); return directory;
}
async function rawVideo(file, frames, canvas) {
  const handle = await open(file, 'wx');
  try {
    for (let n = 0; n < frames; n++) {
      const bytes = Buffer.alloc(canvas.width * canvas.height * 3 / 2, 128);
      bytes.fill(16 + n % 200, 0, canvas.width * canvas.height); await handle.writeFile(bytes);
    }
  } finally {await handle.close();}
}
async function sourceFixture(directory) {
  const canvas = {width: 16, height: 16, fps: 30};
  const videoPath = path.join(directory, 'source-60.yuv'), pcmPath = path.join(directory, 'source.f32le');
  await rawVideo(videoPath, 90, canvas);
  const pcm = Buffer.alloc(72000 * 8);
  for (let n = 0; n < 72000; n++) {
    pcm.writeFloatLE((n % 241 - 120) / 256, n * 8);
    pcm.writeFloatLE((n % 233 - 116) / 256, n * 8 + 4);
  }
  await writeFile(pcmPath, Buffer.concat([pcm.subarray(312 * 8, 960 * 8), pcm.subarray(1008 * 8)]), {flag: 'wx'});
  const sourcePath = path.join(directory, 'source.nut');
  await execute(ffmpeg, ['-v', 'error', '-nostdin', '-n',
    '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-video_size', '16x16', '-framerate', '60', '-i', videoPath,
    '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', pcmPath,
    '-filter_complex', "[1:a]asetnsamples=n=24:p=0,asetpts='N+312+gte(N,648)*48'[a]",
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'ffv1', '-level', '3', '-c:a', 'pcm_f32le', '-f', 'nut', sourcePath]);
  const probe = JSON.parse((await execute(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', sourcePath])).stdout);
  const v = probe.streams.find(row => row.codec_type === 'video');
  const step = Number(v.time_base.split('/')[1]) / 60;
  const sourceVideoRef = await ref(sourcePath);
  const audioFrames = JSON.parse((await execute(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_frames',
    '-show_entries', 'frame=pts,nb_samples', '-of', 'json', sourcePath], {maxBuffer: 8 * 1024 * 1024})).stdout).frames;
  const spans = []; let cursor = 0;
  for (const row of audioFrames) {
    assert(row.pts >= cursor); if (row.pts > cursor) spans.push({startSample: cursor, endSample: row.pts});
    cursor = row.pts + row.nb_samples;
  }
  assert.deepEqual(spans, [{startSample: 0, endSample: 312}, {startSample: 960, endSample: 1008}]);
  assert.equal(cursor, 72000);
  const inspection = {schemaVersion: 'candidate-digest-source-inspection-v001', sourceVideoBinding: sourceVideoRef,
    media: {fps: 60, logicalFrameCount: 45, decodedFrameCount: 90,
      source: {video: {width: 16, height: 16, frameRate: '60/1', timeBase: v.time_base, firstPts: 0,
        lastPts: 89 * step, ptsStep: step, containerStartTimeMs: 0, presentationOffsetMs: 0, rotation: 0},
      audio: {sampleRate: 48000, channels: 2, channelLayout: 'stereo', timeBase: '1/48000'}},
      videoClock: {streamTimeBase: v.time_base, ptsStep: step},
      audioClock: {sampleRate: 48000, channels: 2, channelLayout: 'stereo', spans,
        sourceGridSampleCount: 72000, sourceGridMappingEndSample: 72000, decodedTailPaddingSampleCount: 0}}};
  const inspectionPath = path.join(directory, 'inspection.json'); await save(inspectionPath, inspection);
  return {canvas, sourceVideoRef, inspection, sourceVideoInspectionRef: await ref(inspectionPath), pcm, videoPath};
}

test('Q5-2 saved absolute audio gaps and the 60fps phase resolve without 16kHz or ordinal substitution', async () => {
  const inspection = await readJson('/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/source-media-inspection.json');
  const clock = resolveQ52SourceExtractionV001({inspection, sourceVideoRange: {startFrame: 227963, endFrameExclusive: 228308}});
  assert.equal(clock.frameCount, 345); assert.equal(clock.audio.sampleCount, 552000);
  assert.deepEqual(clock.audio.absoluteSourceRange, {startSample: 364740800, endSampleExclusive: 365292800});
  assert.deepEqual(clock.audio.decodedOrdinalRange, {startSample: 364740440, endSampleExclusive: 365292440});
  assert.equal(clock.audio.precedingGapSamples, 360);
  assert.equal(clock.sourcePtsRange.startPts, 227963 * 512);
  assert.equal(clock.relativeRange30.sourceStartFrame30 + clock.seekSeconds * 30, 227963);
  for (const change of [
    x => {x.media.audioClock.sampleRate = 16000;},
    x => {x.media.source.video.presentationOffsetMs = 1;},
    x => {x.media.source.video.ptsStep++;},
    x => {x.media.audioClock.spans.push({startSample: 364800000, endSample: 364800010});},
  ]) {
    const invalid = structuredClone(inspection); change(invalid);
    assert.throws(() => resolveQ52SourceExtractionV001({inspection: invalid, sourceVideoRange: {startFrame: 227963, endFrameExclusive: 228308}}));
  }
});

test('Q5-2 source extraction checks seek phase, every selected YUV byte and absolute stereo PCM against independent references', async () => {
  const directory = await testDirectory('source-extraction'), f = await sourceFixture(directory);
  const sourceVideoRange = {startFrame: 33, endFrameExclusive: 39};
  const piece = await buildQ52SourcePieceV001({...f, sourceVideoRange, outputDirectory: path.join(directory, 'piece')});
  const proof = await readJson(piece.proofRef.path);
  assert.equal(proof.clock.seekSeconds, 1); assert.equal(proof.clock.relativeRange30.sourceStartFrame30, 3);
  assert.equal(proof.clock.audio.precedingGapSamples, 360);
  assert.equal(proof.video.comparedBytes, 6 * 16 * 16 * 3 / 2); assert.equal(proof.audio.comparedBytes, 6 * 1600 * 8);
  const decodedPcm = (await execute(ffmpeg, ['-v', 'error', '-i', piece.mediaRef.path, '-map', '0:a:0', '-f', 'f32le', '-'],
    {encoding: 'buffer', maxBuffer: 1024 * 1024})).stdout;
  assert.deepEqual(decodedPcm, f.pcm.subarray(33 * 1600 * 8, 39 * 1600 * 8));
  const wrongPhase = path.join(directory, 'wrong-phase.nut');
  await execute(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-i', f.sourceVideoRef.path, '-i', piece.mediaRef.path,
    '-filter_complex', "[0:v]select='mod(n,2)',trim=start_frame=33:end_frame=39,setpts=N/(30*TB),fps=30[v]",
    '-map', '[v]', '-map', '1:a:0', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
    '-fps_mode', 'passthrough', '-c:a', 'copy', '-f', 'nut', wrongPhase]);
  await assert.rejects(verifyQ52SourcePieceV001({...f, sourceVideoRange, pieceRef: await ref(wrongPhase)}), /added video source bytes differ/);
  const shiftedPcm = path.join(directory, 'ordinal-as-absolute.nut');
  await execute(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-i', piece.mediaRef.path, '-i', f.sourceVideoRef.path,
    '-filter_complex', '[1:a]atrim=start_sample=52800:end_sample=62400,asetpts=N/SR/TB[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'pcm_f32le', '-f', 'nut', shiftedPcm]);
  await assert.rejects(verifyQ52SourcePieceV001({...f, sourceVideoRange, pieceRef: await ref(shiftedPcm)}), /added audio source bytes differ/);
  await assert.rejects(buildQ52SourcePieceV001({...f, sourceVideoRange, outputDirectory: path.join(directory, 'piece')}), /unused run directory/);
});

test('Q5-2 real entry rejects Q5-1 jobs and an unpinned Before before any media work', async () => {
  await assert.rejects(loadQ52RenderInputsV001({schemaVersion: 'digest-quality-q5-render-job-v002'}), /digest-quality-q5-2-render-job-v001/);
  const directory = await testDirectory('input-boundary');
  const file = path.join(directory, 'source.json'); await save(file, {fixture: true});
  const sourceRef = await ref(file);
  const job = {schemaVersion: 'digest-quality-q5-2-render-job-v001', sourceRef, editPlanRef: sourceRef,
    originalDrawingEvidenceRef: sourceRef, originalCompletedMediaRef: sourceRef, sourceVideoInspectionRef: sourceRef};
  await assert.rejects(loadQ52RenderInputsV001(job), /665c31638/);
});

test('Q5-2 evidence is bound to the actual source rows and exact saved comparison, including acoustic rows', async () => {
  const directory = await testDirectory('evidence-binding');
  const files = {};
  const put = async (key, value) => {const file = path.join(directory, key + '.json'); await save(file, value); return files[key] = await ref(file);};
  const policyRef = await put('policy', {instruction: 'synthetic one-addition fixture'});
  const sourceVideoRef = await put('source-video-reference', {synthetic: true});
  const atoms = [{id: 1, startMs: 1000, endMs: 1020, text: '原文', speaker: 'speaker'}];
  const utterance = {utteranceId: 'fixture-utterance', ordinal: 1, sourceStartMs: 1000, sourceEndMs: 1020,
    text: '原文', sourceSegmentIds: [1]};
  const sourceTranscriptRef = await put('transcript', {segments: atoms});
  const sourceUtterancesRef = await put('utterances', {utterances: [utterance]});
  const sourceWordTimestampsRef = await put('words', {words: atoms.map(({id, ...row}) => ({...row, segmentId: id}))});
  const chunk = {index: 3, startMs: 1000, endMs: 1034, text: '原文', atoms: [{sourceSegmentId: 1, text: '原文'}]};
  const acousticWords = [{word: '原文', start: 0, end: 0.02, tokens: [1], probability: 1}];
  const sourceAcousticPreflightRef = await put('acoustic-preflight', {chunks: [chunk]});
  const sourceAcousticObservationRef = await put('acoustic-observation',
    {preflightBinding: sourceAcousticPreflightRef, chunkIndex: 3, words: acousticWords});
  const addition = {targetSegmentId: 'segment-0008', sourceVideoRange: {startFrame: 30, endFrameExclusive: 31}, subtitleMode: 'source-text-captions'};
  const addedCaptions = [{captionId: 'fixture-added', text: '原文'}], beforeRange = {startFrame: 8, endFrameExclusive: 10};
  const source = {sourceIdentity: {sourceVideoRef}, timeline: {segments: [{segmentId: 'segment-0008',
    sourceStartFrame30: 31, sourceEndFrame30: 40}]}};
  const evidence = {schemaVersion: 'q5-2-context-addition-judgment-v001', candidateId: 'fixture-candidate',
    targetSegmentId: addition.targetSegmentId, policyRef, sourceVideoRef, sourceTranscriptRef, sourceUtterancesRef,
    sourceWordTimestampsRef, sourceAcousticObservationRef, sourceAcousticPreflightRef, addition,
    addedCaptionEvidence: addedCaptions, comparisonBeforeRange: beforeRange, sourceUtterance: utterance, sourceAtoms: atoms,
    acousticChunk: chunk, acousticWords};
  const boundary = {schemaVersion: 'q5-2-context-addition-boundary-v001', candidateId: evidence.candidateId,
    targetSegmentId: addition.targetSegmentId, policyRef, sourceVideoRef, originalTargetSourceRange: {startFrame: 31, endFrameExclusive: 40},
    actualSourceAddition: addition.sourceVideoRange, comparisonBeforeRange: beforeRange, addedFrameCount: 1,
    subtitleMode: addition.subtitleMode, addedCaptions};
  const verify = async (name, mutateEvidence = () => {}, mutateBoundary = () => {}) => {
    const e = structuredClone(evidence), b = structuredClone(boundary); mutateEvidence(e); mutateBoundary(b);
    const sourceEvidenceRef = await put(name + '-judgment', e);
    const boundaryEvidenceRef = await put(name + '-boundary', {...b, sourceEvidenceRef});
    return verifyQ52EvidenceV001({source, beforeRange, resolved: {candidateId: evidence.candidateId, policyRef,
      boundaryEvidenceRef, sourceEvidenceRef, addition, addedCaptions}});
  };
  assert((await verify('valid')).length >= 8);
  await assert.rejects(verify('wrong-cut', e => {e.addition.sourceVideoRange.startFrame = 29;}));
  await assert.rejects(verify('rewritten-utterance', e => {e.sourceUtterance.text = '創作';}), /source utterance was rewritten/);
  await assert.rejects(verify('rewritten-atom', e => {e.sourceAtoms[0].text = '創作';}), /source transcript atom differs/);
  await assert.rejects(verify('rewritten-acoustic', e => {e.acousticWords[0].start = 0.01;}), /acoustic word rows differ/);
  await assert.rejects(verify('wrong-context', undefined, b => {b.comparisonBeforeRange.endFrameExclusive++;}));
  const remembered = await ref(files.transcript.path);
  await writeFile(files.transcript.path, '{"segments":[]}\n');
  await assert.rejects(verify('stale-source'), /input bytes changed/);
  assert.notEqual((await ref(remembered.path)).fileSha256, remembered.fileSha256);
});

async function syntheticNormalPair(directory) {
  const canvas = {width: 1920, height: 1080, fps: 30}, pieces = [];
  for (const [index, name] of ['added', 'retained'].entries()) {
    const videoPath = path.join(directory, name + '.yuv'), pcmPath = path.join(directory, name + '.f32le');
    await rawVideo(videoPath, 18, canvas);
    const pcm = Buffer.alloc(18 * 1600 * 8);
    for (let n = 0; n < 18 * 1600; n++) {
      pcm.writeFloatLE(((n + index) % 31 - 15) / 256, n * 8);
      pcm.writeFloatLE(((n + index) % 37 - 18) / 256, n * 8 + 4);
    }
    await writeFile(pcmPath, pcm, {flag: 'wx'});
    const output = path.join(directory, name + '.nut');
    await execute(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-f', 'rawvideo', '-pix_fmt', 'yuv420p',
      '-video_size', '1920x1080', '-framerate', '30', '-i', videoPath,
      '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', pcmPath,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'ffv1', '-level', '3', '-c:a', 'pcm_f32le', '-f', 'nut', output]);
    pieces.push({kind: index === 0 ? 'added-source-video' : 'retained-original-digest', frameCount: 18, mediaRef: await ref(output)});
  }
  return {canvas, pieces, joined: await joinQ5LosslessPiecesV001({pieces, canvas, outputDirectory: path.join(directory, 'join')})};
}

test('Q5-2 new-content Normal drawing preserves added and retained captions, exact replay and the new AAC clock', async () => {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  const directory = await testDirectory('normal-native-common-qc'), f = await syntheticNormalPair(directory);
  const originalPlanPath = path.join(parent, '../quality-q4-20260920-v001/c-all-input-v001/raw-inputs/normal-plan.json');
  const bytes = await readFile(originalPlanPath);
  assert.equal(hash(bytes), '420bac69fb75c878a770406155171d5f09167ac22e41c1cd0c707f580229a778');
  const original = JSON.parse(bytes);
  const captions = ['追加部分の確認', '保持部分の確認'].map((text, index) => {
    const indexed = indexExplicitLinesV001([text]); assert.equal(indexed.status, 'passed');
    return {...structuredClone(original.elements[0]), instructionId: index ? 'fixture-retained' : 'fixture-added',
      text: indexed.sourceText, indexedLines: indexed.indexedLines,
      startFrame: 2 + index * 18, endFrameExclusive: 14 + index * 18, displayFrameCount: 12,
      sourceStartMs: null, sourceEndMs: null, timelineSegmentId: null,
      targetProvenance: {targetRefId: 'fixture-q5-2', targetType: 'synthetic-caption', sourceAtomIds: []}};
  });
  const normalPlan = {...original, elements: captions};
  const sourcePath = path.join(directory, 'source.json'), editPath = path.join(directory, 'edit.json');
  await save(sourcePath, {schemaVersion: 'q5-2-render-technical-fixture-v001', synthetic: true,
    originalMediaRead: false, inheritedAppearanceRef: await ref(originalPlanPath)});
  const sourceRef = await ref(sourcePath);
  await save(editPath, {schemaVersion: 'q5-2-render-technical-edit-fixture-v001', sourceRef, synthetic: true});
  const editPlanRef = await ref(editPath);
  const comparison = {schemaVersion: 'q5-2-content-comparison-range-v001', contentVersion: 'fixture-q5-2-short',
    syntheticTechnicalFixture: true, afterRange: {startFrame: 0, endFrameExclusive: 36}, normalPlan,
    addition: {targetSegmentId: 'fixture-scene', sourceVideoRange: {startFrame: 100, endFrameExclusive: 118}, subtitleMode: 'source-text-captions'},
    addedCaptions: [{captionId: 'fixture-added', text: captions[0].text}], physicalPieces: f.pieces};
  const comparisonPath = path.join(directory, 'comparison.json'); await save(comparisonPath, comparison);
  const comparisonRef = await ref(comparisonPath);
  const result = await drawQ52NormalShortV001({comparisonRef, sourceRef, editPlanRef, joined: f.joined,
    outputDirectory: path.join(directory, 'render'), evidenceDirectory: path.join(directory, 'normal'),
    onProgress: value => console.log('Q5-2 fixture: ' + JSON.stringify(value))});
  assert.equal(result.schemaVersion, 'digest-quality-q5-2-normal-short-completion-v001');
  assert.equal(result.status, 'passed'); assert.equal(result.expectedFrameCount, 36);
  assert.equal(result.finalQc.status, 'passed'); assert.equal(result.completedFrameQc.status, 'passed');
  assert.equal(result.completedFrameQc.evidence.method, 'exact-replay-native-v1');
  assert.equal(result.completedFrameQc.inspections.length, 2);
  assert.equal(result.automaticResolution.automaticStatus, 'not-processed');
  assert.equal(result.finalAudio.logicalDecodedSampleCount, 57600);
  assert.equal(result.baseAudio.packetPayloadSha256, result.finalAudio.packetPayloadSha256);
  assert.equal(result.baseAudio.logicalDecodedPayloadSha256, result.finalAudio.logicalDecodedPayloadSha256);
  assert.equal(result.humanQuality, 'not-evaluated'); assert.equal(result.contentEditAdopted, false);
  assert.equal(result.publication.status, 'published');
  const draw = await readJson(path.join(directory, 'normal/draw-result.json'));
  assert.deepEqual(draw.resolvedPlan, normalPlan);
  assert.deepEqual(Object.keys(draw.autoPresentationInputs), ['context']);
  assert.equal(draw.autoPresentationInputs.context.pulseTimingEvidence, null);
  const context = await readJson(path.join(directory, 'normal/short-normal-context.json'));
  assert.deepEqual(context.addition, comparison.addition); assert.deepEqual(context.addedCaptions, comparison.addedCaptions);
  assert(!Object.hasOwn(context, 'mediaOmission'));
});

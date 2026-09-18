/** Physical composition-order fixture; never an automatic Digest candidate. */
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {createOrchestrationProjectionV001, projectCaptionPlanV001} from './presentation_orchestration_projection_v001.mjs';
import {buildOrchestrationBackgroundV001} from './presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const execute = promisify(execFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => writeFile(file, json(value), {flag: 'wx'});
const fail = message => {throw new TypeError('ORCHESTRATION_COMPOSITION_ORDER_INVALID: ' + message);};
const require = (condition, message) => {if (!condition) fail(message);};
async function ref(file) {return {path: file, fileSha256: hash(await readFile(file)), bytes: (await stat(file)).size};}

function glyphInterior(overlayRgba, canvas, fontColor) {
  const {width, height} = canvas;
  require(Number.isSafeInteger(width) && Number.isSafeInteger(height) && width >= 4 && height >= 4
    && width % 2 === 0 && height % 2 === 0, 'even canvas required');
  require(Buffer.isBuffer(overlayRgba) && overlayRgba.length === width * height * 4, 'native RGBA byte count');
  require(/^#[a-fA-F0-9]{6}$/.test(fontColor), 'native opaque RGB font color required');
  const rgb = [1, 3, 5].map(index => Number.parseInt(fontColor.slice(index, index + 2), 16));
  const fill = pixel => {
    const offset = pixel * 4;
    return overlayRgba[offset + 3] === 255 && rgb.every((value, index) => overlayRgba[offset + index] === value);
  };
  const pixels = [];
  // A full opaque 3x3 same-fill neighborhood excludes antialiasing, outline and
  // background. Luma is full-resolution; chroma subsampling cannot alter it.
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const pixel = y * width + x;
    if (!fill(pixel)) continue;
    let interior = true;
    for (let dy = -1; dy <= 1 && interior; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!fill(pixel + dy * width + dx)) {interior = false; break;}
    }
    if (interior) pixels.push(pixel);
  }
  require(pixels.length > 0, 'native PNG has no opaque glyph interior for this font color');
  return pixels;
}

/** Independent order gate: exact native glyph luma must survive background Soft. */
export function assertOrchestrationCompositionFrameV001({frameYuv, overlayRgba, overlayYuv, canvas, fontColor}) {
  const expectedBytes = canvas.width * canvas.height * 3 / 2;
  require(Buffer.isBuffer(frameYuv) && Buffer.isBuffer(overlayYuv)
    && frameYuv.length === expectedBytes && overlayYuv.length === expectedBytes, 'yuv420p frame byte count');
  const pixels = glyphInterior(overlayRgba, canvas, fontColor);
  for (const pixel of pixels) {
    require(frameYuv[pixel] === overlayYuv[pixel], 'opaque glyph changed at x=' + pixel % canvas.width
      + ', y=' + Math.floor(pixel / canvas.width) + ': expected native luma ' + overlayYuv[pixel] + ', observed ' + frameYuv[pixel]);
  }
  return {status: 'passed', method: 'all opaque native glyph interior luma samples equal the unfaded native PNG',
    opaqueGlyphInteriorPixelCount: pixels.length, comparedLumaSamples: pixels.length};
}

function losslessNativeArguments(args) {
  const output = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '-y') {output.push('-n'); continue;}
    if (['-preset', '-crf'].includes(args[index])) {index++; continue;}
    if (args[index] === '-c:v') {output.push('-c:v', 'ffv1', '-level', '3'); index++; continue;}
    output.push(args[index]);
  }
  return output;
}

/**
 * nativeOverlay is a SHA-bound saved normal PNG plus the normal plan/ID that
 * supplied its unmodified visual state. Only fixture caption times/IDs change.
 * Outputs must be under the Stage-III ignored presentation run family.
 */
export async function runOrchestrationCompositionOrderFixtureV001({repositoryRoot, outputDirectory,
  nativeOverlay, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory});
  require(guard.relativeDirectory.split(path.sep).join('/').startsWith('evals/clip_composition/outputs/presentation/stage3-orchestration-'),
    'fixture output must be in the Stage-III presentation run family');
  const sourcePng = await readFile(nativeOverlay.pngRef.path), sourcePlanBytes = await readFile(nativeOverlay.normalPlanRef.path);
  require(hash(sourcePng) === nativeOverlay.pngRef.fileSha256, 'native PNG SHA differs');
  require(hash(sourcePlanBytes) === nativeOverlay.normalPlanRef.fileSha256, 'native normal plan SHA differs');
  const nativePlan = JSON.parse(sourcePlanBytes);
  const nativeElement = nativePlan.elements.find(element => element.instructionId === nativeOverlay.captionId);
  require(nativeElement?.kind === 'speech-caption' && nativeElement.visualState?.transitionId === 'quick-fade-4f-v001',
    'saved native normal caption with the existing four-frame alpha transition required');
  require(!nativeElement.presentationMotion && !nativeElement.presentationPulse && !nativeElement.visualState.background,
    'fixture requires static native glyphs with no panel');
  const canvas = clone(nativePlan.canvas);
  require(canvas.fps === 30, '30fps native canvas required');
  await mkdir(outputDirectory, {recursive: true});
  const processes = [];
  async function run(label, executable, args, {binary = false} = {}) {
    try {
      const result = await execute(executable, args, {encoding: binary ? 'buffer' : 'utf8', maxBuffer: 32 * 1024 * 1024});
      const receipt = {label, executable, args, exitCode: 0}; processes.push(receipt);
      await save(path.join(outputDirectory, label + '-command.json'), receipt);
      await writeFile(path.join(outputDirectory, label + '.log'), result.stderr, {flag: 'wx'});
      return result.stdout;
    } catch (error) {
      await save(path.join(outputDirectory, label + '-failure.json'), {label, executable, args,
        code: error.code ?? null, message: error.message});
      throw error;
    }
  }
  const common = ['-v', 'error', '-nostdin', '-n'];
  const sourceMediaPath = path.join(outputDirectory, 'synthetic-source.nut');
  await run('synthetic-source', ffmpegPath, [...common, '-f', 'lavfi', '-i',
    `color=c=0x708090:size=${canvas.width}x${canvas.height}:rate=30:duration=0.8`,
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=0.8',
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
    '-c:a', 'pcm_f32le', '-ac', '2', '-f', 'nut', sourceMediaPath]);
  const sourceRef = await ref(sourceMediaPath);
  const plan = {...clone(nativePlan), elements: [0, 1].map(index => ({...clone(nativeElement),
    instructionId: 'composition-fixture-caption-' + (index + 1), startFrame: index * 12,
    endFrameExclusive: (index + 1) * 12, displayFrameCount: 12}))};
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: 24, fileSha256: sourceRef.fileSha256},
    segments: [0, 1].map(index => ({segmentId: 'fixture-segment-' + (index + 1),
      sourceStartFrame30: index * 12, sourceEndFrame30: (index + 1) * 12,
      outputStartFrame: index * 12, outputEndFrame: (index + 1) * 12}))};
  const planPath = path.join(outputDirectory, 'fixture-source-plan.json'), timelinePath = path.join(outputDirectory, 'fixture-source-timeline.json');
  await save(planPath, plan); await save(timelinePath, timeline);
  const planRef = await ref(planPath), timelineRef = await ref(timelinePath);
  const referenceOnly = ({path: file, fileSha256}) => ({path: file, fileSha256});
  const projectionInput = {digestRef: {version: 'composition-order-manual-fixture-v001', sha256: sourceRef.fileSha256},
    planRef: referenceOnly(planRef), timelineRef: referenceOnly(timelineRef), mediaRef: referenceOnly(sourceRef),
    planBytes: await readFile(planPath), timelineBytes: await readFile(timelinePath), playbackSampleRate: 44100, observationSampleRate: 16000};
  const projections = Object.fromEntries(['soft-separator', 'black-separator'].map(preset => [preset,
    createOrchestrationProjectionV001({...projectionInput, connections: [{connectionId: 'connection-01', preset, presetVersion: 'v001'}]})]));
  const backgrounds = {};
  for (const [preset, projection] of Object.entries(projections)) backgrounds[preset] = await buildOrchestrationBackgroundV001({
    repositoryRoot, outputDirectory: path.join(outputDirectory, preset), projection,
    expectedProjectionSha256: projection.projectionSha256, ffmpegPath, ffprobePath});
  const projection = projections['soft-separator'];
  const displayPlan = projectCaptionPlanV001({projection, planBytes: projectionInput.planBytes}).plan;
  const overlayRecords = displayPlan.elements.map(element => ({element, pngPath: nativeOverlay.pngRef.path}));
  const correctPath = path.join(outputDirectory, 'correct-background-soft-then-caption.nut');
  const preWrongPath = path.join(outputDirectory, 'caption-on-black-background-before-soft.nut');
  for (const [label, preset, output] of [['correct-lossless', 'soft-separator', correctPath],
    ['wrong-before-fullframe-soft', 'black-separator', preWrongPath]]) {
    const args = buildPresentationCompositeArgumentsV001({baseMediaPath: backgrounds[preset].outputs.background.path,
      plan: displayPlan, overlayRecords, expectedFrameCount: 36, serializePngAndFilters: true});
    await run(label, ffmpegPath, [...losslessNativeArguments(args), '-f', 'nut', output]);
  }
  // Reuse only the already-approved finite Soft LUT instructions after the
  // normal compositor. No second insertion or hand-written fade curve.
  const generated = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: projection.presentationTimeline,
    canvas: {width: canvas.width, height: canvas.height, fps: canvas.fps},
    audio: {sampleRate: 44100, channelLayout: 'stereo'}, softWindows: projection.softWindows});
  const softLuts = generated.filter(line => line.includes(']lut='));
  require(softLuts.length === 12, 'one Soft window must use the existing twelve finite LUT states');
  softLuts[0] = softLuts[0].replace('[connectionBaseVideo]', '[0:v]');
  const wrongPath = path.join(outputDirectory, 'fault-caption-darkened-by-fullframe-soft.nut');
  await run('fault-fullframe-soft', ffmpegPath, [...common, '-filter_complex_threads', '1', '-i', preWrongPath,
    '-filter_complex', softLuts.join(';'), '-map', '[timelineVideo]', '-map', '0:a:0', '-c:v', 'ffv1', '-level', '3',
    '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'copy', '-f', 'nut', wrongPath]);
  const rgbaPath = path.join(outputDirectory, 'native-overlay.rgba'), yuvPath = path.join(outputDirectory, 'native-overlay.yuv');
  for (const [format, output] of [['rgba', rgbaPath], ['yuv420p', yuvPath]]) await run('decode-overlay-' + format, ffmpegPath,
    [...common, '-i', nativeOverlay.pngRef.path, '-frames:v', '1', '-pix_fmt', format, '-f', 'rawvideo', output]);
  const overlayRgba = await readFile(rgbaPath), overlayYuv = await readFile(yuvPath);
  const pixels = glyphInterior(overlayRgba, canvas, nativeElement.visualState.textStyle.fontColor);
  const samples = [];
  for (const [frame, captionIndex] of [[8, 0], [27, 1]]) {
    const element = displayPlan.elements[captionIndex], localFrame = frame - element.startFrame;
    require(Math.min(1, (localFrame + 1) / 4, (element.displayFrameCount - localFrame) / 4) === 1,
      'sample is not in the native caption steady-alpha interval');
    const frames = {};
    for (const [label, input] of [['correct', correctPath], ['wrong', wrongPath]]) {
      const rawPath = path.join(outputDirectory, label + '-frame-' + frame + '.yuv');
      const pngPath = path.join(outputDirectory, label + '-frame-' + frame + '.png');
      await run(label + '-frame-' + frame, ffmpegPath, [...common, '-i', input,
        '-vf', `select='eq(n,${frame})'`, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', rawPath]);
      await run(label + '-png-' + frame, ffmpegPath, [...common, '-f', 'rawvideo', '-pixel_format', 'yuv420p',
        '-video_size', `${canvas.width}x${canvas.height}`, '-i', rawPath, '-frames:v', '1', pngPath]);
      frames[label] = {raw: await readFile(rawPath), rawRef: await ref(rawPath), pngRef: await ref(pngPath)};
    }
    const checking = {overlayRgba, overlayYuv, canvas, fontColor: nativeElement.visualState.textStyle.fontColor};
    const correct = assertOrchestrationCompositionFrameV001({...checking, frameYuv: frames.correct.raw});
    let rejection = null;
    try {assertOrchestrationCompositionFrameV001({...checking, frameYuv: frames.wrong.raw});}
    catch (error) {rejection = {code: 'CAPTION_DARKENED_BY_CONNECTION', message: error.message};}
    require(rejection !== null, 'the real wrong-composition frame was not rejected');
    // Both selected frames are the existing 3/5 finite state, once on each side.
    require(pixels.every(pixel => frames.wrong.raw[pixel] === Math.floor((overlayYuv[pixel] * 3 + 16 * 2 + 2) / 5)),
      'wrong glyph luma does not match the approved finite fullframe fade');
    samples.push({frame, captionId: element.instructionId, localFrame, nativeCaptionAlpha: 1,
      softState: {numerator: 3, denominator: 5}, correct, rejection,
      wrongMatchesFiniteFullframeFadeAtEveryGlyphInterior: true,
      correctFrame: {raw: frames.correct.rawRef, png: frames.correct.pngRef},
      wrongFrame: {raw: frames.wrong.rawRef, png: frames.wrong.pngRef}});
  }
  // Exercise the production argument builder's new separate-audio input path
  // as an additional encoded artifact, while exact order checks remain lossless.
  const encodedPath = path.join(outputDirectory, 'correct-native-renderer-with-audio-sidecar.mp4');
  const encodedArgs = buildPresentationCompositeArgumentsV001({baseMediaPath: backgrounds['soft-separator'].outputs.background.path,
    plan: displayPlan, overlayRecords, expectedFrameCount: 36, serializePngAndFilters: true,
    audioMediaPath: backgrounds['soft-separator'].outputs.audio.path}).map(value => value === '-y' ? '-n' : value);
  await run('native-renderer-audio-sidecar', ffmpegPath, [...encodedArgs, encodedPath]);
  const encodedProbe = JSON.parse(await run('encoded-probe', ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', encodedPath]));
  const video = encodedProbe.streams.find(stream => stream.codec_type === 'video'), audio = encodedProbe.streams.find(stream => stream.codec_type === 'audio');
  require(video?.nb_frames === '36' && Number(video.start_pts) === 0 && Number(audio?.start_pts) === 0
    && Number(audio.duration_ts) === 52920, 'native renderer video/audio clock differs');
  const packetHash = (await run('encoded-audio-payload', ffmpegPath, ['-v', 'error', '-i', encodedPath,
    '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'])).trim().replace(/^SHA256=/, '');
  require(packetHash === backgrounds['soft-separator'].encodedAudio.packetPayloadSha256, 'native renderer did not copy the AAC sidecar unchanged');
  const proof = {schemaVersion: 'presentation-orchestration-composition-order-fixture-v001', status: 'passed',
    purpose: 'manual physical fault fixture; separate from the zero-override automatic Digest candidate',
    automaticDigestCandidate: false, manualCaptionPlacements: 2, manualConnectionSelection: 'soft-separator',
    nativeOverlay: clone(nativeOverlay), nativeVisualState: clone(nativeElement.visualState),
    nativePngPixelsUnchanged: hash(await readFile(nativeOverlay.pngRef.path)) === nativeOverlay.pngRef.fileSha256,
    outputGuard: guard, canvas, sourceFrameCount: 24, displayFrameCount: 36,
    projectionSha256: projection.projectionSha256, samples,
    outputs: {correctLossless: await ref(correctPath), wrongLossless: await ref(wrongPath), encodedNativeRenderer: await ref(encodedPath)},
    encodedRenderer: {videoFrameCount: 36, presentationStartSample: 0, presentationEndSampleExclusive: 52920,
      sampleRate: 44100, audioPacketPayloadSha256: packetHash, audioSidecarRef: backgrounds['soft-separator'].outputs.audio,
      audioCopiedWithoutSecondEncode: true},
    backgroundProofRefs: Object.fromEntries(Object.entries(backgrounds).map(([preset, value]) => [preset, value.proofRef])),
    nativeCompositeBuilder: 'buildPresentationCompositeArgumentsV001; lossless oracle changes encoder only; encoded artifact uses normal H264 and audioMediaPath',
    processCount: processes.length};
  await save(path.join(outputDirectory, 'composition-order-proof.json'), proof);
  return {...proof, proofRef: await ref(path.join(outputDirectory, 'composition-order-proof.json'))};
}

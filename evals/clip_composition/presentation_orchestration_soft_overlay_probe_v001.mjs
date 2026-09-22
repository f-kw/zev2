/** Read-only completed-frame probe for native glyphs overlapping finite Soft windows. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {buildPresentationNativeReferenceArgumentsV001, classifyPresentationNativeFrameRgbV001,
  buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerDecodeArgumentsV001}
  from './presentation_native_frame_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => writeFile(file, json(value), {flag: 'wx'});
const equal = (left, right, message) => assert.equal(canonicalJson(left), canonicalJson(right), message);
const common = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n'];
async function bind(file) {
  assert(path.isAbsolute(file), 'absolute input/output path required');
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) {hash.update(chunk); bytes += chunk.length;}
  return {path: file, fileSha256: hash.digest('hex'), bytes};
}
async function verify(reference) {
  assert.match(reference.fileSha256, /^[a-f0-9]{64}$/);
  const actual = await bind(reference.path);
  assert.equal(actual.fileSha256, reference.fileSha256, 'input bytes changed: ' + reference.path);
  if (reference.bytes !== undefined) assert.equal(actual.bytes, reference.bytes);
  return actual;
}

/** Mask comes only from the SHA-bound PNG, never from completed/reference pixels. */
export function deriveOrchestrationOpaqueGlyphMasksV001({rgba, canvas, fontColors}) {
  const {width, height} = canvas;
  assert(Number.isSafeInteger(width) && Number.isSafeInteger(height) && width >= 4 && height >= 4);
  assert(Buffer.isBuffer(rgba) && rgba.length === width * height * 4);
  assert(Array.isArray(fontColors) && fontColors.length > 0);
  return [...new Set(fontColors)].map(color => {
    assert.match(color, /^#[a-fA-F0-9]{6}$/);
    const channels = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    const fill = pixel => rgba[pixel * 4 + 3] === 255
      && channels.every((value, channel) => rgba[pixel * 4 + channel] === value);
    const pixels = [];
    // Exact opaque same-fill 3x3 erosion excludes antialiasing and outlines.
    // This is a geometric interior definition, not an error tolerance.
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      if (!fill(pixel)) continue;
      let interior = true;
      for (let dy = -1; dy <= 1 && interior; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!fill(pixel + dy * width + dx)) {interior = false; break;}
      }
      if (interior) pixels.push(pixel);
    }
    assert(pixels.length > 0, 'no opaque glyph interior for native fill ' + color);
    return {fontColor: color, pixels};
  });
}

/** Equal-weight integer L1 and strict winner reuse existing native classification. */
export function classifyOrchestrationSoftGlyphRgbV001({completedRgb, expectedRgb, wrongOrderRgb, omittedRgb, pixels}) {
  const full = [completedRgb, expectedRgb, wrongOrderRgb, omittedRgb];
  assert(full.every(bytes => Buffer.isBuffer(bytes) && bytes.length === completedRgb.length));
  assert(completedRgb.length > 0 && completedRgb.length % 3 === 0);
  assert(Array.isArray(pixels) && pixels.length > 0 && new Set(pixels).size === pixels.length);
  const select = bytes => {
    const packed = Buffer.alloc(pixels.length * 3);
    pixels.forEach((pixel, index) => {
      assert(Number.isSafeInteger(pixel) && pixel >= 0 && pixel * 3 + 2 < bytes.length);
      bytes.copy(packed, index * 3, pixel * 3, pixel * 3 + 3);
    });
    return packed;
  };
  const [completed, expected, wrong, omitted] = full.map(select);
  assert(!expected.equals(wrong), 'correct and wrong-order glyph references are indistinguishable');
  const decision = classifyPresentationNativeFrameRgbV001({completedRgb: completed,
    references: [{id: 'expected', rgb: expected}, {id: 'omitted', rgb: omitted},
      {id: 'caption-darkened-by-fullframe-soft', rgb: wrong}]});
  return {...decision, comparedPixelCount: pixels.length, comparedRgbChannelCount: completed.length,
    completedRgbSha256: sha(completed), method: 'strict-nearest-unweighted-integer-RGB-L1-on-native-opaque-glyph-interiors'};
}

function nativeYuvArguments({baseFramePath, pngPath, pngSha256, element, frame, canvas, outputPaths}) {
  const bindingId = element.instructionId;
  const sample = {crop: {left: 0, top: 0, width: canvas.width, height: canvas.height}, references: [
    {id: 'expected', layers: [{bindingId, localFrame: frame - element.startFrame,
      displayFrameCount: element.displayFrameCount}]}, {id: 'omitted', layers: []}]};
  const sceneBindings = [{states: [{bindingId, pngPath, pngSha256}], alternates: []}];
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples: [sample], sceneBindings, canvas,
    directory: path.join(path.dirname(outputPaths[0]), 'prepared-native-' + frame)});
  assert(nativeLayers.layers.every(layer => !layer.generated), 'this Soft probe requires the existing full-opacity plateau');
  const args = buildPresentationNativeReferenceArgumentsV001({sample, nativeLayers,
    sceneBindings, baseFramePath, outputPaths});
  // Preserve the native compositor and alpha calculation. Only declare the raw
  // base input and keep YUV before its optional final RGB conversion/crop.
  const input = args.indexOf('-i');
  args.splice(input, 0, '-f', 'rawvideo', '-pixel_format', 'yuv420p', '-video_size',
    canvas.width + 'x' + canvas.height, '-framerate', String(canvas.fps));
  const filter = args.indexOf('-filter_complex') + 1;
  args[filter] = args[filter].replaceAll(',format=rgb24,crop=', ',crop=');
  return {nativeLayers, args: args.map(value => value === '-y' ? '-n' : value === 'rgb24' ? 'yuv420p' : value)};
}

/**
 * References are {path,fileSha256[,bytes]}; output is a new ignored run directory.
 * Run once after final publication. No input, renderer or video is modified.
 */
export async function runOrchestrationSoftOverlayProbeV001({repositoryRoot, outputDirectory,
  viewRef, drawResultRef, backgroundProofRef, candidateRef,
  ffmpegPath = '/opt/homebrew/bin/ffmpeg', ffprobePath = '/opt/homebrew/bin/ffprobe'}) {
  const outputGuard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory});
  assert(outputGuard.relativeDirectory.split(path.sep).join('/').startsWith('evals/clip_composition/outputs/presentation/stage3-orchestration-'));
  const declared = [viewRef, drawResultRef, backgroundProofRef, candidateRef];
  const before = [];
  for (const reference of declared) before.push(await verify(reference));
  const view = JSON.parse(await readFile(viewRef.path)), draw = JSON.parse(await readFile(drawResultRef.path));
  const background = JSON.parse(await readFile(backgroundProofRef.path));
  assert.equal(draw.exitCode, 0); assert.equal(draw.finalQc.status, 'passed');
  const restored = restoreOrchestrationDrawingViewEvidenceV001(draw.orchestrationInput);
  equal(view, restored, 'saved view differs from the renderer-bound reconstructed view');
  equal(draw.resolvedPlan, view.resolvedPlan, 'candidate plan differs');
  const {projection, resolvedPlan: plan} = view, {canvas} = plan;
  assert.equal(canvas.fps, 30); assert.equal(background.status, 'passed');
  assert.equal(background.projectionSha256, projection.projectionSha256);
  assert.equal(background.sourceClockSha256, projection.sourceClockSha256);
  assert.equal(background.displayFrameCount, projection.displayFrameCount);
  assert.equal(background.verification.status, 'passed');
  assert.equal(background.verification.video.status, 'passed');
  assert.equal(background.verification.video.sourceFrames, projection.sourceFrameCount);
  assert.equal(background.verification.video.displayFrames, projection.displayFrameCount);
  equal(background.verification.outputRef, background.outputs.background, 'whole-video proof media differs');
  equal(background.concreteConnections, projection.connections, 'background connections differ');
  equal(draw.orchestrationBackground.video, background.outputs.background, 'renderer background differs');
  assert.equal(path.dirname(candidateRef.path), draw.outputDirectory, 'completed media is outside the published output');
  for (const manifest of [draw.completedFrameQc.evidence.exactReplay.inputManifest.refs,
    draw.completedFrameQc.evidence.finiteState.inputManifest.inputRefs]) {
    const matches = manifest.filter(reference => reference.role === 'completed-media');
    assert.equal(matches.length, 1); assert.equal(matches[0].fileSha256, candidateRef.fileSha256);
    assert.equal(matches[0].path, draw.workVideo);
  }
  const sourceRefs = [projection.sourceClock.planRef, projection.sourceClock.timelineRef,
    projection.sourceClock.mediaRef, background.outputs.background];
  for (const reference of sourceRefs) before.push(await verify(reference));
  const implementationPaths = [fileURLToPath(import.meta.url), ffmpegPath, ffprobePath, process.execPath,
    ...['connection_expression_v001.mjs', 'presentation_native_frame_qc_v001.mjs',
      'presentation_orchestration_v001.mjs', 'presentation_orchestration_projection_v001.mjs',
      'render_presentation_v002.mjs'].map(file => path.join(path.dirname(fileURLToPath(import.meta.url)), file))];
  for (const file of implementationPaths) before.push(await bind(file));
  const filters = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: projection.presentationTimeline,
    canvas: {width: canvas.width, height: canvas.height, fps: canvas.fps},
    audio: {sampleRate: projection.sourceClock.playbackSampleRate, channelLayout: 'stereo'},
    softWindows: projection.softWindows});
  const recipe = projection.softWindows.flatMap(window => [
    {connectionId: window.connectionId, side: 'fade-out', frame: window.blackStartFrame - 5},
    {connectionId: window.connectionId, side: 'fade-in', frame: window.blackEndFrameExclusive + 4}]);
  assert(recipe.length > 0, 'no Soft windows');
  for (const sample of recipe) {
    const active = plan.elements.filter(element => element.startFrame <= sample.frame && sample.frame < element.endFrameExclusive);
    assert.equal(active.length, 1, 'probe requires one active caption at each selected frame');
    const element = active[0], localFrame = sample.frame - element.startFrame;
    assert(!element.presentationMotion && !element.presentationPulse && !element.visualState.background,
      'probe samples must have static native glyphs');
    assert.equal(element.visualState.transitionId, 'quick-fade-4f-v001');
    assert.equal(Math.min(1, (localFrame + 1) / 4, (element.displayFrameCount - localFrame) / 4), 1);
    const retained = projection.retainedSpans.filter(span => span.displayStartFrame <= sample.frame && sample.frame < span.displayEndFrameExclusive);
    assert.equal(retained.length, 1);
    const originalFrame = retained[0].sourceStartFrame + sample.frame - retained[0].displayStartFrame;
    const luts = filters.filter(filter => filter.includes(']lut=') && filter.includes(":enable='eq(n," + sample.frame + ")'"));
    assert.equal(luts.length, 1); assert(luts[0].includes('val*4+'), 'sample is not the existing 4/5 Soft state');
    const softLut = luts[0].replace(/^\[[^\]]+\]/, '[0:v]').replace(/\[[^\]]+\]$/, '[soft]')
      .replace(":enable='eq(n," + sample.frame + ")'", ":enable='eq(n,0)'");
    const records = draw.overlayRecords.filter(record => record.element.instructionId === element.instructionId);
    assert.equal(records.length, 1); const record = records[0];
    equal(record.element, element, 'PNG element differs from the projected candidate');
    const application = draw.applicationResults.filter(row => row.instructionId === element.instructionId);
    assert.equal(application.length, 1);
    assert.equal(application[0].overlaySha256, record.pngSha256);
    assert.equal(application[0].appliedOverlayPropsCanonicalSha256, sha(canonicalJson(record.props)));
    assert.equal(record.props.instructionId, element.instructionId);
    for (const key of ['text', 'indexedLines', 'visualState', 'presentationColorRange']) {
      assert.deepEqual(record.props[key], element[key], 'native PNG props differ: ' + key);
    }
    equal(record.props.canvas, canvas); equal(record.props.layoutRules, plan.layoutRules);
    const relativePng = application[0].overlayFile;
    assert(typeof relativePng === 'string' && /^overlays\/[^/]+\.png$/.test(relativePng));
    assert.equal(path.basename(relativePng), path.basename(record.pngPath));
    const pngRef = {path: path.join(draw.outputDirectory, relativePng), fileSha256: record.pngSha256};
    before.push(await verify(pngRef));
    Object.assign(sample, {captionId: element.instructionId, element, localFrame, originalFrame,
      retainedSpan: retained[0], softLut, originalSoftLut: luts[0], pngRef,
      propsSha256: sha(canonicalJson(record.props))});
  }
  await mkdir(outputDirectory, {recursive: true});
  const processes = [];
  async function run(label, executable, args) {
    try {
      const result = await execute(executable, args, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
      const receipt = {label, executable, args, exitCode: 0}; processes.push(receipt);
      await save(path.join(outputDirectory, label + '-command.json'), receipt);
      await writeFile(path.join(outputDirectory, label + '.log'), result.stderr, {flag: 'wx'});
      return result.stdout;
    } catch (error) {
      await save(path.join(outputDirectory, label + '-failure.json'), {label, executable, args,
        exitCode: error.code ?? null, message: error.message}); throw error;
    }
  }
  const rawInput = file => ['-f', 'rawvideo', '-pixel_format', 'yuv420p', '-video_size',
    canvas.width + 'x' + canvas.height, '-framerate', String(canvas.fps), '-i', file];
  const samples = [];
  try {
    const probes = {};
    for (const [name, reference, frameCount] of [['candidate', candidateRef, projection.displayFrameCount],
      ['background', background.outputs.background, projection.displayFrameCount],
      ['original', projection.sourceClock.mediaRef, projection.sourceFrameCount]]) {
      const probe = JSON.parse(await run('probe-' + name, ffprobePath,
        ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', reference.path]));
      const video = probe.streams[0];
      assert.equal(video.width, canvas.width); assert.equal(video.height, canvas.height);
      assert.equal(video.avg_frame_rate, '30/1'); assert.equal(Number(video.start_pts), 0);
      if (name !== 'background') assert.equal(Number(video.nb_frames), frameCount);
      probes[name] = {stream: video, frameCount, frameCountBasis: name === 'background'
        ? 'SHA-bound completed whole-lossless-video proof; no second full decode' : 'MP4 stream frame count'};
    }
    for (const sample of recipe) {
      const prefix = 'frame-' + sample.frame;
      const artifacts = {}, fullRgb = {};
      for (const [label, reference, frame] of [['completed', candidateRef, sample.frame],
        ['soft-background', background.outputs.background, sample.frame],
        ['original-background', projection.sourceClock.mediaRef, sample.originalFrame]]) {
        const seconds = Math.floor(frame / canvas.fps), remainder = frame % canvas.fps;
        const output = path.join(outputDirectory, prefix + '-' + label + '.yuv');
        await run(prefix + '-extract-' + label, ffmpegPath, [...common, '-ss', String(seconds), '-i', reference.path,
          '-vf', 'select=eq(n\\,' + remainder + ')', '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', output]);
        artifacts[label] = {raw: await bind(output)};
        assert.equal(artifacts[label].raw.bytes, canvas.width * canvas.height * 3 / 2);
      }
      let nativeLayerRefs;
      for (const [base, first, second] of [['soft-background', 'expected', 'omitted'],
        ['original-background', 'unfaded-caption', 'unfaded-omitted']]) {
        const outputs = [first, second].map(label => path.join(outputDirectory, prefix + '-' + label + '.yuv'));
        const {nativeLayers, args} = nativeYuvArguments({
          baseFramePath: artifacts[base].raw.path, pngPath: sample.pngRef.path, pngSha256: sample.pngRef.fileSha256,
          element: sample.element, frame: sample.frame, canvas, outputPaths: outputs});
        if (nativeLayerRefs === undefined) {
          await mkdir(nativeLayers.directory);
          const decodeGroups = new Map();
          for (const layer of nativeLayers.layers) {
            if (!decodeGroups.has(layer.sourceSha256)) decodeGroups.set(layer.sourceSha256, []);
            decodeGroups.get(layer.sourceSha256).push(layer);
          }
          for (const [sourceSha256, layers] of decodeGroups) await run(prefix + '-native-decode-' + sourceSha256,
            ffmpegPath, buildPresentationNativeLayerDecodeArgumentsV001(layers).map(value => value === '-y' ? '-n' : value));
          nativeLayerRefs = [];
          for (const layer of nativeLayers.layers) {
            const ref = await bind(layer.decodedPath);
            assert.equal(layer.pixelFormat, 'gbrap'); assert.equal(ref.bytes, layer.width * layer.height * 4);
            nativeLayerRefs.push(ref);
          }
        }
        equal(nativeLayers.layers.map(layer => layer.decodedPath), nativeLayerRefs.map(ref => ref.path));
        await run(prefix + '-native-reference-' + base, ffmpegPath, args);
        for (const [index, label] of [first, second].entries()) artifacts[label] = {raw: await bind(outputs[index])};
      }
      const wrong = path.join(outputDirectory, prefix + '-caption-darkened-by-fullframe-soft.yuv');
      await run(prefix + '-wrong-fullframe-soft', ffmpegPath, [...common, ...rawInput(artifacts['unfaded-caption'].raw.path),
        '-filter_complex', sample.softLut, '-map', '[soft]', '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', wrong]);
      artifacts['caption-darkened-by-fullframe-soft'] = {raw: await bind(wrong)};
      // Every observation/reference is converted by the same YUV420P→RGB24 path.
      for (const [label, artifact] of Object.entries(artifacts)) {
        const rgb = path.join(outputDirectory, prefix + '-' + label + '.rgb');
        const png = path.join(outputDirectory, prefix + '-' + label + '.png');
        await run(prefix + '-rgb-png-' + label, ffmpegPath, [...common, ...rawInput(artifact.raw.path),
          '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', rgb,
          '-frames:v', '1', '-pix_fmt', 'rgb24', png]);
        artifact.rgb = await bind(rgb); artifact.png = await bind(png);
        fullRgb[label] = await readFile(rgb);
        assert.equal(fullRgb[label].length, canvas.width * canvas.height * 3);
      }
      const rgbaPath = path.join(outputDirectory, prefix + '-native-overlay.rgba');
      await run(prefix + '-native-rgba', ffmpegPath, [...common, '-i', sample.pngRef.path,
        '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo', rgbaPath]);
      const rgba = await readFile(rgbaPath);
      const glyphMasks = deriveOrchestrationOpaqueGlyphMasksV001({rgba, canvas,
        fontColors: [sample.element.visualState.textStyle.fontColor,
          ...(sample.element.presentationColorRange ? [sample.element.presentationColorRange.fontColor] : [])]});
      const unionPixels = glyphMasks.flatMap(mask => mask.pixels).sort((left, right) => left - right);
      const maskPath = path.join(outputDirectory, prefix + '-native-glyph-mask.json');
      await save(maskPath, {canvas, pngRef: sample.pngRef,
        rule: 'alpha=255 and exact native font fill across the full 3x3 neighborhood; row-major pixel indices', glyphMasks});
      const checking = {completedRgb: fullRgb.completed, expectedRgb: fullRgb.expected,
        wrongOrderRgb: fullRgb['caption-darkened-by-fullframe-soft'], omittedRgb: fullRgb.omitted};
      const glyphs = [{fontColor: 'all-native-glyph-fills', pixels: unionPixels}, ...glyphMasks].map(mask => ({
        fontColor: mask.fontColor, ...classifyOrchestrationSoftGlyphRgbV001({...checking, pixels: mask.pixels})}));
      const wrongFault = classifyOrchestrationSoftGlyphRgbV001({...checking,
        completedRgb: fullRgb['caption-darkened-by-fullframe-soft'], pixels: unionPixels});
      const omittedFault = classifyOrchestrationSoftGlyphRgbV001({...checking, completedRgb: fullRgb.omitted, pixels: unionPixels});
      const entireFrame = classifyPresentationNativeFrameRgbV001({completedRgb: fullRgb.completed,
        references: [{id: 'expected', rgb: fullRgb.expected}, {id: 'omitted', rgb: fullRgb.omitted},
          {id: 'caption-darkened-by-fullframe-soft', rgb: fullRgb['caption-darkened-by-fullframe-soft']}]});
      const passed = glyphs.every(decision => decision.visible) && !wrongFault.visible && !omittedFault.visible;
      const result = {connectionId: sample.connectionId, side: sample.side, frame: sample.frame,
        originalFrame: sample.originalFrame, captionId: sample.captionId,
        captionStartFrame: sample.element.startFrame, captionEndFrameExclusive: sample.element.endFrameExclusive,
        localFrame: sample.localFrame, nativeCaptionAlpha: 1, existingSoftState: {numerator: 4, denominator: 5},
        originalSoftLut: sample.originalSoftLut, appliedSingleFrameSoftLut: sample.softLut,
        retainedSpan: sample.retainedSpan, pngRef: sample.pngRef, propsSha256: sample.propsSha256,
        rgbaRef: await bind(rgbaPath), maskRef: await bind(maskPath), decodedNativeLayers: nativeLayerRefs, artifacts,
        glyphs, wrongFault, omittedFault,
        faultCheckBasis: 'unencoded generated reference RGB buffers; not an encoded wrong-order candidate',
        entireFrameInformational: entireFrame, status: passed ? 'passed' : 'failed'};
      for (const ref of nativeLayerRefs) await verify(ref);
      samples.push(result); await save(path.join(outputDirectory, prefix + '-proof.json'), result);
    }
    const after = [];
    for (const reference of before) after.push(await verify(reference));
    const passed = samples.every(sample => sample.status === 'passed');
    const proof = {schemaVersion: 'presentation-orchestration-soft-overlay-probe-v001', status: passed ? 'passed' : 'failed',
      purpose: 'read-only inspection of the existing zero-override automatic candidate at every Soft overlap',
      limits: {humanVisualAdoption: 'not-evaluated', fullCandidateReencoded: false,
        candidateModified: false, encodedWrongOrderFaultTested: false,
        probesAreSupplementalToExistingCompletedFrameQc: true},
      outputGuard, canvas, viewSha256: view.viewSha256, projectionSha256: projection.projectionSha256,
      sourceClockSha256: projection.sourceClockSha256, fourSavedSha256: view.fourSavedSha256,
      sourceFrameCount: projection.sourceFrameCount, displayFrameCount: projection.displayFrameCount,
      playbackSampleRate: projection.sourceClock.playbackSampleRate,
      observationSampleRate: projection.sourceClock.observationSampleRate,
      candidateRef, backgroundProofRef, viewRef, drawResultRef, inputManifest: {before, after}, probes, samples,
      decisionRule: 'Each native font-color interior and their union must uniquely prefer expected over omitted and fullframe-Soft; no threshold or channel weights. Ties fail.',
      processCount: processes.length};
    const proofPath = path.join(outputDirectory, 'soft-overlay-proof.json');
    await save(proofPath, proof);
    return {...proof, proofRef: await bind(proofPath)};
  } catch (error) {
    await save(path.join(outputDirectory, 'probe-failure.json'), {status: 'failed', message: error.message,
      inputManifest: {before}, completedSampleCount: samples.length, processes}); throw error;
  }
}

import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createReadStream, constants} from 'node:fs';
import {readFile, writeFile, lstat, mkdir, mkdtemp, copyFile, statfs, realpath} from 'node:fs/promises';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationRenderApplicationResults,
  PRESENTATION_RENDERER_OUTPUT_NAMES,
  buildPresentationFrameExtractionArgumentsV001, renderPresentationCounterfactualEncodedFrameV001,
  runPresentationRendererChildProcessV001, acquirePresentationOutputReservationV002,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {evaluatePresentationRendererQcV002}
  from './presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {inspectNonOverlappingCaptionTimelineV001, buildLosslessCompositeCacheArgumentsV001}
  from './unseen_material_qc_lossless_cache_v001.mjs';
import {STREAM_INTERPRETATION_FIELDS_V001, deriveObservedStreamRestorationV001,
  buildColorRestoredCachedCounterfactualArgumentsV001} from './unseen_material_qc_color_metadata_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const FORMAL = path.join(WORK, 'formal-v004');
const SOURCE = path.join(FORMAL, 'render-attempt-v008');
const RETAINED = path.join(ROOT, 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/.render-v008.presentation-renderer-v002-work-J6DQda');
const QC = path.join(FORMAL, 'qc-only-v002');
const OLD_QC = path.join(FORMAL, 'qc-only-v001');
const OUTPUT = path.join(ROOT, 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v010-qc-only');
const CAPTURE = path.join(WORK, 'render-v008-completed-main-verification-v001.json');
const PROOF = path.join(WORK, 'qc-color-verification-v001.json');
const hash = b => createHash('sha256').update(b).digest('hex');
const canonicalHash = value => hash(canonicalJson(value));
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const save = async (p, value) => {await writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); return bind(p);};
async function bind(p) {
  const s = await lstat(p); assert(s.isFile() && !s.isSymbolicLink(), p);
  const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b);
  return {path: path.relative(ROOT, p), bytes: s.size, fileSha256: h.digest('hex')};
}
async function bound(ref) {
  const p = path.isAbsolute(ref.path) ? ref.path : path.join(ROOT, ref.path);
  assert.equal((await bind(p)).fileSha256, ref.fileSha256, p);
  const value = await read(p);
  if (ref.canonicalSha256) assert.equal(canonicalHash(value), ref.canonicalSha256, p);
  return value;
}
async function loadInputs() {
  const decision = await read(path.join(WORK, 'advisor-qc-lossless-cache-decision-v001.json'));
  assert.equal(decision.decision, 'continue'); assert(decision.allowCompletedMainVideoAsQcOnlyInput);
  const jobPath = path.join(SOURCE, 'renderer-job.json'), job = await read(jobPath);
  for (const ref of [...job.rendererImplementationBindings, ...job.approvedContractBindings]) {
    assert.equal((await bind(path.join(ROOT, ref.path))).fileSha256, ref.fileSha256);
  }
  for (const ref of Object.values(job.runtimeBindings)) {
    const resolved = await realpath(ref.path);
    assert.equal((await bind(resolved)).fileSha256, ref.fileSha256);
    assert.equal(await realpath(ref.path), resolved);
  }
  const setup = await read(path.join(SOURCE, 'setup-fix.json'));
  assert.equal((await bind(jobPath)).fileSha256, setup.rendererJobBinding.fileSha256);
  const receipt = await read(path.join(SOURCE, 'admission-receipt.json'));
  assert.equal(receipt.status, 'accepted'); assert.equal(receipt.rendererJobBinding.fileSha256, setup.rendererJobBinding.fileSha256);
  const instruction = await bound(job.instructionArtifactBinding);
  const style = await bound(job.registryBindings.styleProfileRegistry), trust = await bound(job.registryBindings.rendererTrust);
  const lineLayout = await read(path.join(SOURCE, 'line-layout.json'));
  const built = buildPresentationInstructionCommonCorePlanV001({job, visualStateId: job.executionInputs.visualStateId,
    instructionArtifact: instruction, lineLayout, styleProfileRegistry: style, rendererTrust: trust});
  assert.equal(built.status, 'built'); assert.equal(built.plan.elements.length, 343);
  const pngProof = await bound(setup.retainedPngVerificationBinding);
  assert.equal(pngProof.qc.status, 'passed'); assert.equal(pngProof.actualPngCount, 343);
  const sourceProps = await read(path.join(RETAINED, 'scratch/layout-input.json'));
  const layout = await read(path.join(RETAINED, 'scratch/layout-output.json')); assert.equal(layout.status, 'passed');
  const adapter = buildPresentationRendererOverlayAdapterV001({remotionPath: job.runtimeBindings.remotion.path,
    chromiumPath: job.runtimeBindings.chromium.path,
    processObserver: createPresentationRendererProcessObserverV001({observationDirectory: path.join(WORK, 'qc-only-source-adapter-process-v001')})});
  const records = [];
  for (const [i, element] of built.plan.elements.entries()) {
    const props = adapter.buildProps(element, built.plan, style);
    assert.deepEqual(props, sourceProps.overlays[i]); assert.equal(props.visualState.textStyle.fontSizePx, 94);
    const stem = `${String(i + 1).padStart(2, '0')}-${hash(element.instructionId).slice(0, 12)}`;
    const pngPath = path.join(RETAINED, 'publish/overlays', stem + '.png');
    const image = pngProof.qc.instructionEvidence[i], pngSha256 = (await bind(pngPath)).fileSha256;
    assert.equal(image.instructionId, element.instructionId); assert.equal(image.overlaySha256, pngSha256);
    assert.equal(image.appliedOverlayPropsCanonicalSha256, canonicalHash(props));
    assert.equal((await bind(path.join(RETAINED, 'scratch/frames', stem + '.repeat.png'))).fileSha256, pngSha256);
    const item = layout.items.find(row => row.instructionId === element.instructionId); assert(item);
    const inspection = {instructionId: element.instructionId, alphaMax: image.alphaMax, alphaBounds: image.alphaBounds,
      lineCount: image.lineCount, lineAlphaBounds: image.lineAlphaBounds, lineRects: item.lineRects,
      appliedOverlayPropsCanonicalSha256: image.appliedOverlayPropsCanonicalSha256,
      overlayFile: image.inspectedOverlayFile, overlaySha256: pngSha256};
    records.push({element, props, fileStem: stem, pngPath, pngSha256, inspection});
  }
  const applicationResults = buildPresentationRenderApplicationResults(records, PRESENTATION_RENDERER_OUTPUT_NAMES);
  const expectedAudio = pngProof.qc.mediaEvidence.expectedAudio;
  const restoredQc = evaluatePresentationRendererQcV002({plan: built.plan, applicationResults,
    overlayInspections: records.map(r => r.inspection), mediaInspection: pngProof.qc.mediaEvidence.observed,
    expectedAudio, canvas: built.plan.canvas, requireFinalVisibility: false});
  assert.deepEqual(restoredQc, pngProof.qc, 'same bound PNGs must restore the exact original alpha QC evidence');
  const baseMediaPath = path.join(ROOT, job.cropAppliedBaseMedia.baseMedia.path);
  assert.equal((await bind(baseMediaPath)).fileSha256, job.cropAppliedBaseMedia.baseMedia.fileSha256);
  const input = {baseMediaPath, plan: built.plan, overlayRecords: records, expectedFrameCount: 65363};
  const topology = inspectNonOverlappingCaptionTimelineV001(input); assert.equal(topology.intervals.length, 343);
  return {job, jobPath, setup, receipt, instruction, style, trust, lineLayout, plan: built.plan,
    records, applicationResults, expectedAudio, input, topology, pngProof};
}

export function buildCacheAndFrameHashArgumentsV001(input, cachePath, frameHashPath) {
  const args = buildLosslessCompositeCacheArgumentsV001(input), graph = args.indexOf('-filter_complex');
  assert(graph > 0);
  // split copies frame references and preserves the original graph output.
  // The second output records the encoder input before FFV1 compression.
  args[graph + 1] += ';[video]split=2[cache][proof]';
  const map = args.indexOf('-map'); assert.equal(args[map + 1], '[video]'); args[map + 1] = '[cache]';
  return [...args, cachePath, '-map', '[proof]', '-frames:v', String(input.expectedFrameCount),
    '-an', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', frameHashPath];
}

function assertFrameHashSequence(actual, expected, count) {
  const parse = text => {
    const tb = text.match(/^#tb 0: (\d+)\/(\d+)$/mu); assert(tb);
    return {tb: tb.slice(1).map(BigInt), rows: text.split('\n').filter(s => s && !s.startsWith('#'))
      .map(s => s.split(',').map(v => v.trim()))};
  };
  const a = parse(actual), e = parse(expected); assert.equal(a.rows.length, count); assert.equal(e.rows.length, count);
  for (let i = 0; i < count; i++) {
    assert.equal(a.rows[i].at(-1), e.rows[i].at(-1), `cache pixel mismatch at frame ${i}`);
    assert.equal(BigInt(a.rows[i][2]) * a.tb[0] * e.tb[1], BigInt(e.rows[i][2]) * e.tb[0] * a.tb[1], `cache timestamp mismatch at frame ${i}`);
  }
}

async function executeQcOnly() {
  const colorDecisionPath = path.join(WORK, 'advisor-qc-color-metadata-decision-v001.json');
  const colorDecision = await read(colorDecisionPath);
  assert.equal(colorDecision.decision, 'continue'); assert(colorDecision.allowObservedColorMetadataRestoration);
  assert(colorDecision.allowOneTimeIndependentCacheAdoption); assert(colorDecision.requireFullMainYuvAndRgbaEqualityBefore343Qc);
  const c = await loadInputs(), captured = await read(CAPTURE), proof = await read(PROOF);
  assert.equal(captured.status, 'main-video-completed-and-verified'); assert.equal(proof.status, 'passed');
  for (const ref of [...proof.implementationBindings, ...proof.artifacts]) {
    assert.equal((await bind(path.join(ROOT, ref.path))).fileSha256, ref.fileSha256);
  }
  const sourceExecution = await read(path.join(SOURCE, 'renderer-result.json'));
  assert.equal(sourceExecution.rendererJobBinding.fileSha256, captured.sourceRendererJobBinding.fileSha256);
  assert.equal((await bind(path.join(ROOT, captured.video.path))).fileSha256, captured.video.fileSha256);
  assert.deepEqual(captured.sourceRendererJobBinding, c.setup.rendererJobBinding);
  const sample = await bound(proof.actualSampleBinding); assert(sample.projectionFitsObservedFreeSpace);
  const free = await statfs(WORK); assert(sample.projectedPairBytes < free.bavail * free.bsize, 'QC_CACHE_PROJECTED_CAPACITY_UNAVAILABLE');
  await mkdir(QC);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(QC, 'process-observations')});
  const run = (command, args, label, options = {}) => runPresentationRendererChildProcessV001(command, args,
    {fatalInnerStage: 'post-render-qc', processObserver: observer, observationLabel: label, ...options});
  const cacheDir = path.join(QC, 'cache'), frameDir = path.join(QC, 'frames'); await mkdir(cacheDir); await mkdir(frameDir);
  const transparentPath = path.join(QC, 'transparent.png');
  await run(c.job.runtimeBindings.imageMagick.path, ['-size', '1920x1080', 'xc:none', transparentPath], 'transparent-create');
  const blankInput = {...c.input, overlayRecords: c.records.map(r => ({...r, pngPath: transparentPath}))};
  const sourceGenerationPath = path.join(OLD_QC, 'cache/baseline-generation-input.json');
  const sourceGeneration = await read(sourceGenerationPath);
  assert.deepEqual(sourceGeneration.input, c.input, 'old cache input must equal current SHA-bound main reconstruction');
  const oldBaselinePath = path.join(OLD_QC, 'cache/baseline.nut');
  const oldPreEncodePath = path.join(OLD_QC, 'cache/baseline-pre-encode.framehash.txt');
  assert.deepEqual(sourceGeneration.arguments, buildCacheAndFrameHashArgumentsV001(c.input, oldBaselinePath, oldPreEncodePath));
  const producerPath = path.join(ROOT, 'evals/clip_composition/run_unseen_material_qc_only_v001.mjs');
  const oldProof = await bound(proof.inheritedLosslessProof);
  const oldProducer = oldProof.implementationBindings.find(r => r.path === path.relative(ROOT, producerPath)); assert(oldProducer);
  assert.equal((await bind(producerPath)).fileSha256, oldProducer.fileSha256);
  const terminalBeforePath = path.join(WORK, 'qc-only-v001-parent-closure-before-signal.json');
  const terminalAfterPath = path.join(WORK, 'qc-only-v001-parent-closure-result.json');
  const hostExitPath = path.join(WORK, 'qc-only-v001-host-exit-observation.json');
  const terminalAfter = await read(terminalAfterPath); assert.equal(terminalAfter.signal, 'SIGKILL');
  const hostExit = await read(hostExitPath); assert.equal(hostExit.hostObservedExitCode, 137);
  assert.equal(hostExit.oldQcExecutionCompletedNormally, false);
  assert.equal(terminalAfter.beforeEvidenceSha256, (await bind(terminalBeforePath)).fileSha256);
  const inheritedCache = {sourceGenerationInput: await bind(sourceGenerationPath), producerImplementation: oldProducer,
    sourceRendererJob: c.setup.rendererJobBinding, actualInvokedArguments: sourceGeneration.arguments,
    argumentEvidence: 'The frozen old entry saved these exact arguments immediately before passing them to the child process runner; not a later OS command-line observation.',
    originalCache: await bind(oldBaselinePath), originalPreEncode: await bind(oldPreEncodePath),
    terminalBefore: await bind(terminalBeforePath), terminalAfter: await bind(terminalAfterPath),
    hostExitObservation: await bind(hostExitPath),
    generatorExitCode: hostExit.generatorChildExitCode, oldParentExitCode: hostExit.hostObservedExitCode, claimOldExecutionCompletedNormally: false,
    statement: '旧QCが生成開始した媒体を、新QCが全画素・順序・時刻・生成条件から独立検証する。旧生成子の正常終了は未観測。'};
  const inheritedCacheBinding = await save(path.join(QC, 'inherited-baseline-source.json'), inheritedCache);
  const metadataInspections = [];
  for (const [name, file] of [['base', c.input.baseMediaPath], ['main', path.join(ROOT, captured.video.path)], ['cache', oldBaselinePath]]) {
    const args = ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', file];
    const out = await run(c.job.runtimeBindings.ffprobe.path, args, 'color-metadata-inspection');
    const raw = JSON.parse(out.stdout.toString()); assert.equal(raw.streams.length, 1);
    const stream = Object.fromEntries(STREAM_INTERPRETATION_FIELDS_V001.filter(k => raw.streams[0][k] !== undefined).map(k => [k, raw.streams[0][k]]));
    metadataInspections.push({name, media: await bind(file), arguments: args, raw, stream});
  }
  const colorEvidence = deriveObservedStreamRestorationV001(Object.fromEntries(metadataInspections.map(r => [r.name, r.stream])));
  const colorEvidenceBinding = await save(path.join(QC, 'observed-cache-interpretation.json'), {cache: inheritedCache.originalCache,
    decision: await bind(colorDecisionPath), metadataInspections, restoration: colorEvidence});
  const cacheProofs = [];
  for (const [name, input] of [['baseline', c.input], ['transparent', blankInput]]) {
    const inherited = name === 'baseline';
    const file = inherited ? oldBaselinePath : path.join(cacheDir, name + '.nut');
    const pre = inherited ? oldPreEncodePath : path.join(cacheDir, name + '-pre-encode.framehash.txt');
    if (!inherited) {
      const args = buildCacheAndFrameHashArgumentsV001(input, file, pre);
      await save(path.join(cacheDir, name + '-generation-input.json'), {input, arguments: args});
      console.log(JSON.stringify({status: 'lossless-cache-started', name}));
      await run(c.job.runtimeBindings.ffmpeg.path, args, 'lossless-cache-generate');
    } else console.log(JSON.stringify({status: 'inherited-baseline-independent-verification-started'}));
    const decoded = await run(c.job.runtimeBindings.ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-i', file,
      '-map', '0:v:0', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-'], 'lossless-cache-decode');
    const decodedPath = path.join(cacheDir, name + '-decoded.framehash.txt'); await writeFile(decodedPath, decoded.stdout, {flag: 'wx'});
    assertFrameHashSequence(decoded.stdout.toString(), await readFile(pre, 'utf8'), 65363);
    cacheProofs.push({name, cache: await bind(file), encoderInputFrameHash: await bind(pre), decodedFrameHash: await bind(decodedPath), all65363PixelsAndTimesIdentical: true, inherited, sourceGeneration: inherited ? inheritedCacheBinding : await bind(path.join(cacheDir, name + '-generation-input.json'))});
    await save(path.join(cacheDir, name + '-verification.json'), cacheProofs.at(-1));
    console.log(JSON.stringify({status: 'lossless-cache-verified', name, frames: 65363}));
  }
  const baselineCachePath = oldBaselinePath, transparentCachePath = path.join(cacheDir, 'transparent.nut');
  const transparentMetadata = await run(c.job.runtimeBindings.ffprobe.path,
    ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', transparentCachePath], 'transparent-color-metadata');
  const transparentStream = JSON.parse(transparentMetadata.stdout.toString()).streams[0];
  for (const key of STREAM_INTERPRETATION_FIELDS_V001) assert.equal(transparentStream[key], colorEvidence.observedCache[key], `cache interpretation differs:${key}`);
  await save(path.join(QC, 'transparent-stream-metadata.json'), {cache: cacheProofs[1].cache, raw: JSON.parse(transparentMetadata.stdout.toString())});
  // An all-baseline replay also checks this actual video's encoded pixels. It
  // never replaces the source MP4: that MP4 remains the final QC target.
  const replay = path.join(QC, 'baseline-replay.mp4');
  await run(c.job.runtimeBindings.ffmpeg.path, [...buildColorRestoredCachedCounterfactualArgumentsV001({input: c.input,
    baselineCachePath, transparentCachePath: baselineCachePath, instructionId: c.records[0].element.instructionId}, colorEvidence),
    '-movflags', '+faststart', replay], 'baseline-replay-encode');
  const replayMetadata = await run(c.job.runtimeBindings.ffprobe.path,
    ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', replay], 'replayed-color-metadata');
  const replayStream = JSON.parse(replayMetadata.stdout.toString()).streams[0];
  for (const key of STREAM_INTERPRETATION_FIELDS_V001.filter(k => !['time_base', 'r_frame_rate'].includes(k))) {
    assert.equal(replayStream[key], colorEvidence.observedMain[key], `restored interpretation differs:${key}`);
  }
  await save(path.join(QC, 'replayed-stream-metadata.json'), {video: await bind(replay), raw: JSON.parse(replayMetadata.stdout.toString())});
  const encodedVideoComparisons = [];
  for (const pixelFormat of ['yuv420p', 'rgba']) {
    const decodedVideos = [];
    for (const [name, video] of [['source', path.join(ROOT, captured.video.path)], ['replay', replay]]) {
      const out = await run(c.job.runtimeBindings.ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-i', video,
        '-map', '0:v:0', '-pix_fmt', pixelFormat, '-f', 'framehash', '-hash', 'sha256', '-'], 'baseline-encoded-framehash');
      const p = path.join(QC, `${name}-encoded-${pixelFormat}.framehash.txt`); await writeFile(p, out.stdout, {flag: 'wx'});
      decodedVideos.push({p, text: out.stdout.toString()});
    }
    assertFrameHashSequence(decodedVideos[1].text, decodedVideos[0].text, 65363);
    encodedVideoComparisons.push({pixelFormat, identicalFrames: 65363, artifacts: await Promise.all(decodedVideos.map(r => bind(r.p)))});
    console.log(JSON.stringify({status: 'main-replay-all-frames-identical', pixelFormat, frames: 65363}));
  }
  await save(path.join(QC, 'cache-verification.json'), {status: 'passed', cacheProofs, actualEncodedFramesIdentical: 65363,
    decodedComparisonPixelFormats: ['yuv420p', 'rgba'], colorEvidence: colorEvidenceBinding, inheritedBaseline: inheritedCacheBinding,
    encodedVideoComparisons, sourceMain: await bind(CAPTURE)});
  // Execute the exact existing private comparison body from the SHA-bound
  // renderer source. This keeps the active renderer file unmodified and avoids
  // introducing a second implementation of the QC metric or its parsing.
  const corePath = path.join(ROOT, 'evals/clip_composition/render_presentation_v002.mjs');
  const core = await readFile(corePath, 'utf8');
  assert.equal(hash(core), captured.sourceImplementationBindings.find(r => r.path.endsWith('/render_presentation_v002.mjs')).fileSha256);
  const begin = core.indexOf('const imageDifferencePixelsWithinBounds = async ('), end = core.indexOf('\nconst extractFrame =', begin);
  assert(begin >= 0 && end > begin);
  const compare = vm.runInNewContext(core.slice(begin, end) + '\nimageDifferencePixelsWithinBounds;', {runPresentationRendererChildProcessV001});
  await save(path.join(QC, 'comparison-implementation.json'), {source: await bind(corePath), exactFunctionText: core.slice(begin, end)});
  const measured = [];
  for (const [i, record] of c.records.entries()) {
    const representativeFrame = record.element.startFrame + Math.floor(record.element.displayFrameCount / 2);
    const outputPath = path.join(frameDir, record.fileStem + '-omitted.png');
    const request = {instructionId: record.element.instructionId, ffmpegPath: c.job.runtimeBindings.ffmpeg.path,
      compositeArguments: buildColorRestoredCachedCounterfactualArgumentsV001({input: c.input, baselineCachePath, transparentCachePath, instructionId: record.element.instructionId}, colorEvidence),
      representativeFrame, expectedFrameCount: 65363, outputPath};
    const requestPath = path.join(frameDir, record.fileStem + '-input.json'); await save(requestPath, request);
    const outcome = await renderPresentationCounterfactualEncodedFrameV001(request);
    assert.equal(outcome.status, 'completed');
    assert.equal(outcome.inputCanonicalSha256, canonicalHash(request));
    assert.equal(outcome.outputFileSha256, (await bind(outputPath)).fileSha256);
    const fullPath = path.join(frameDir, record.fileStem + '-full.png');
    await run(c.job.runtimeBindings.ffmpeg.path, buildPresentationFrameExtractionArgumentsV001({inputPath: path.join(ROOT, captured.video.path),
      frame: representativeFrame, outputPath: fullPath, fps: 30}), 'main-frame-extract');
    const changed = await compare(fullPath, outputPath, record.inspection.alphaBounds, c.job.runtimeBindings.imageMagick.path, observer);
    Object.assign(record.inspection, {visibilityComparisonBasis: 'same-composite-with-instruction-omitted', representativeFrame,
      changedPixelsAgainstInstructionOmittedFrame: changed});
    measured.push(await save(path.join(frameDir, record.fileStem + '-result.json'), {instructionId: record.element.instructionId,
      request: await bind(requestPath), outcome, fullFrame: await bind(fullPath), omittedFrame: await bind(outputPath), changedPixels: changed}));
    console.log(JSON.stringify({status: 'caption-visibility-measured', completed: i + 1, total: 343, changedPixels: changed}));
  }
  const finalQc = evaluatePresentationRendererQcV002({plan: c.plan, applicationResults: c.applicationResults,
    overlayInspections: c.records.map(r => r.inspection), mediaInspection: captured.media, expectedAudio: c.expectedAudio,
    expectedFrameCount: 65363, canvas: c.plan.canvas});
  await save(path.join(QC, 'final-qc.json'), finalQc);
  assert.equal(finalQc.status, 'passed'); assert.equal(finalQc.instructionCount, 343);
  for (const cache of cacheProofs) assert.equal((await bind(path.join(ROOT, cache.cache.path))).fileSha256, cache.cache.fileSha256);
  assert.equal((await bind(path.join(ROOT, captured.video.path))).fileSha256, captured.video.fileSha256);
  for (const ref of [...c.job.rendererImplementationBindings, ...proof.implementationBindings]) {
    assert.equal((await bind(path.join(ROOT, ref.path))).fileSha256, ref.fileSha256);
  }
  const reservation = await acquirePresentationOutputReservationV002(OUTPUT);
  const workDir = await mkdtemp(path.join(reservation.outputParent, '.render-v010-qc-only.presentation-renderer-v002-work-'));
  const staging = path.join(workDir, 'publish'); await mkdir(staging); await mkdir(path.join(staging, 'overlays'));
  for (const r of c.records) await copyFile(r.pngPath, path.join(staging, 'overlays', r.fileStem + '.png'), constants.COPYFILE_EXCL);
  const finalVideo = path.join(staging, 'presentation-rendered-v002.mp4');
  await copyFile(path.join(ROOT, captured.video.path), finalVideo, constants.COPYFILE_EXCL);
  assert.equal((await bind(finalVideo)).fileSha256, captured.video.fileSha256);
  await save(path.join(staging, 'presentation-render-qc-v002.json'), finalQc);
  const finalPlan = {...c.plan, schemaVersion: 'presentation-render-plan-v002',
    elements: c.records.map(r => ({...r.element, overlaySha256: r.pngSha256}))};
  await save(path.join(staging, 'presentation-render-plan-v002.json'), finalPlan);
  await save(path.join(staging, 'presentation-render-application-results-v002.json'), {
    schemaVersion: 'presentation-render-application-results-v002', rendererVersion: 'presentation-renderer-v002',
    presetRegistryVersion: c.plan.presetRegistryVersion, results: c.applicationResults});
  const provenance = {schemaVersion: 'unseen-material-two-stage-render-qc-provenance-v001',
    mainVideoProducer: await bind(CAPTURE), sourceRendererExecution: await bind(path.join(SOURCE, 'renderer-result.json')),
    qcOnlyImplementation: await bind(fileURLToPath(import.meta.url)), cacheProof: await bind(path.join(QC, 'cache-verification.json')),
    equivalenceProof: await bind(PROOF), colorMetadataEvidence: colorEvidenceBinding, inheritedBaselineCache: inheritedCacheBinding, measuredCaptions: measured, newMainVideoEncodes: 0, newlyRenderedOverlayPngs: 0,
    statement: 'The bound v008 renderer produced the main video. This separate 024 QC execution inspected that unchanged MP4; it did not render the main video or redraw its overlays.'};
  await save(path.join(staging, 'render-qc-provenance.json'), provenance);
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: staging, outputDirectory: OUTPUT, reservation});
  const result = {schemaVersion: 'unseen-material-qc-only-execution-v002', status: 'completed', mode: 'qc-only-existing-main',
    sourceRendererJobBinding: c.setup.rendererJobBinding, sourceMainCompletionBinding: await bind(CAPTURE),
    sourceRendererExecutionBinding: await bind(path.join(SOURCE, 'renderer-result.json')), equivalenceProofBinding: await bind(PROOF),
    colorMetadataEvidence: colorEvidenceBinding, inheritedBaselineCache: inheritedCacheBinding,
    qc: finalQc, publication, provenanceBinding: await bind(path.join(OUTPUT, 'render-qc-provenance.json'))};
  const execution = await save(path.join(QC, 'execution.json'), result);
  const adoptionPath = path.join(FORMAL, 'machine-adoption.json'), adoption = await read(adoptionPath);
  const completion = await save(path.join(FORMAL, 'render-completion.json'), {
    schemaVersion: 'unseen-material-render-completion-v002', status: 'technical-render-complete',
    machineAdoptionBinding: await bind(adoptionPath), planBinding: adoption.planBinding,
    sourceMainCompletion: await bind(CAPTURE), execution,
    admission: await bind(path.join(SOURCE, 'admission-receipt.json')), lineLayout: await bind(path.join(SOURCE, 'line-layout.json')),
    qc: 'passed', video: await bind(path.join(OUTPUT, 'presentation-rendered-v002.mp4')), humanQuality: 'not-evaluated'});
  console.log(JSON.stringify({status: 'technical-render-complete', completion}));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'inspect') {const c = await loadInputs(); console.log(JSON.stringify({status: 'qc-source-inputs-verified', captions: c.records.length, overlaps: c.topology.overlapPairs.length}));}
  else if (process.argv[2] === 'qc') await executeQcOnly();
  else throw new Error('Expected inspect or qc');
}

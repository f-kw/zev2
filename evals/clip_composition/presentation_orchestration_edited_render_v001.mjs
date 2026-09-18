/** Development rendering entry for immutable human-edited saved state.
 * Preview and full output share the production native drawing and compositor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {createOrchestrationRenderScopeV001} from './presentation_orchestration_render_scope_v001.mjs';
import * as backgroundRenderer from './presentation_orchestration_background_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {createPresentationNativeAssetCacheV001} from './presentation_native_asset_cache_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(repo, 'evals/clip_composition');
const registryPath = path.join(directory, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file) {
  const stat = await lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'drawing reference must be a regular file');
  const sha = createHash('sha256');
  for await (const chunk of createReadStream(file)) sha.update(chunk);
  return {path: path.resolve(file), bytes: stat.size, fileSha256: sha.digest('hex')};
}
const codeNames = ['presentation_orchestration_edited_render_v001.mjs', 'presentation_orchestration_render_scope_v001.mjs',
  'presentation_native_asset_cache_v001.mjs', 'presentation_orchestration_v001.mjs', 'presentation_orchestration_projection_v001.mjs',
  'presentation_orchestration_background_v001.mjs', 'presentation_output_directory_v001.mjs', 'presentation_caption_contract_v002.mjs',
  'connection_expression_v001.mjs', 'presentation_auto_effects_v001.mjs', 'presentation_effects_v001.mjs',
  'presentation_pulse_v001.mjs', 'presentation_pulse_evidence_v001.mjs', 'presentation_pulse_renderer_qc_v001.mjs',
  'presentation_caption_motion_v001.mjs', 'render_presentation_v002.mjs', 'presentation_renderer_entry_v001.tsx',
  'inspect_presentation_render_layout_v001.ts', 'presentation_renderer_text_layout_v001.mjs',
  'presentation_renderer_qc_v002.mjs', 'presentation_native_frame_qc_v001.mjs',
  'presentation_native_frame_qc_preparation_v001.mjs', 'presentation_exact_replay_qc_v001.mjs',
  'presentation_integrity_state_qc_v001.mjs', 'presentation_renderer_process_observation_v001.mjs'];
const nativeNames = ['runner/src/remotion/components/TelopText.tsx', 'runner/src/telop/telop-render-model.ts',
  'runner/src/remotion/utils/telop-font.ts', 'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-line-break.ts',
  'runner/src/shared/telop-glow.ts', 'pnpm-lock.yaml', 'runner/node_modules/@remotion/cli/package.json',
  'runner/node_modules/remotion/package.json', 'runner/node_modules/react/package.json', 'runner/node_modules/react-dom/package.json'];
const toolPaths = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
  imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'),
  layoutInspectorPath: path.join(directory, 'inspect_presentation_render_layout_v001.ts')};

async function verifyDecoderReference(ref) {
  assert.deepEqual(Object.keys(ref).sort(), ['bytes', 'fileSha256', 'path']);
  assert(path.isAbsolute(ref.path) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0
    && /^[a-f0-9]{64}$/.test(ref.fileSha256), 'explicit saved-observation decoder reference is invalid');
  assert.deepEqual(await bind(ref.path), ref, 'saved-observation decoder bytes changed');
}
export async function buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef = null} = {}) {
  if (backgroundReuseDecoderRef !== null) await verifyDecoderReference(backgroundReuseDecoderRef);
  const registry = await json(registryPath);
  const sources = new Set();
  const walk = async file => {
    if (sources.has(file)) return;
    assert(file.startsWith(repo + path.sep), 'drawing dependency escaped the workspace');
    sources.add(file);
    if (!/\.(?:mjs|js|ts|tsx)$/.test(file)) return;
    const text = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
    const names = [...text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/gu)].map(match => match[2]);
    names.push(...[...text.matchAll(/new\s+URL\(\s*(['"])(\.[^'"]+\.json)\1\s*,\s*import\.meta\.url/gu)].map(match => match[2]));
    for (const name of names) {
      const target = path.resolve(path.dirname(file), name);
      const candidates = path.extname(target) ? [target] : [target + '.ts', target + '.tsx', target + '.mjs', target + '.js'];
      let found;
      for (const candidate of candidates) {
        try {if ((await lstat(candidate)).isFile()) {found = candidate; break;}} catch (error) {if (error.code !== 'ENOENT') throw error;}
      }
      assert(found, 'drawing source dependency is missing: ' + name);
      await walk(found);
    }
  };
  for (const name of codeNames) await walk(path.join(directory, name));
  for (const name of nativeNames) await walk(path.join(repo, name));
  const files = [...sources,
    registryPath, ...registry.fontAssets.flatMap(font => [path.join(repo, font.path), path.join(repo, font.licensePath)]),
    process.execPath];
  // Tool launchers may be symlinks; the bound reference records their real file.
  const {realpath} = await import('node:fs/promises');
  files.push(...await Promise.all([toolPaths.ffmpegPath, toolPaths.ffprobePath, toolPaths.imageMagickPath,
    toolPaths.tsxPath, path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
    path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell')].map(file => realpath(file))));
  if (backgroundReuseDecoderRef !== null) files.push(backgroundReuseDecoderRef.path);
  const body = {schemaVersion: 'presentation-edited-drawing-rules-v001',
    files: await Promise.all([...new Set(files)].sort().map(bind)),
    decoderRoles: {currentDrawingAndNewAudio: await bind(await realpath(toolPaths.ffmpegPath)),
      savedBackgroundObservation: backgroundReuseDecoderRef === null ? null : structuredClone(backgroundReuseDecoderRef)}};
  return {...body, canonicalSha256: hash(body)};
}
export async function verifyEditedOrchestrationDrawingRulesRefV001(ref) {
  assert.deepEqual(await buildEditedOrchestrationDrawingRulesRefV001({
    backgroundReuseDecoderRef: ref.decoderRoles?.savedBackgroundObservation ?? null}), ref, 'drawing implementation changed');
  return true;
}
async function verifySourceReferences(view, drawingEvidenceRef) {
  const source = view.sourceRefs;
  const refs = [drawingEvidenceRef, source.planRef, source.timelineRef, source.mediaRef, source.decisionInputRef,
    source.pulseTimingEvidence.sourceRef, source.pulseTimingEvidence.candidatesRef, source.pulseTimingEvidence.peaksRef];
  for (const ref of refs) assert.equal((await bind(ref.path)).fileSha256, ref.fileSha256, 'saved source bytes changed');
  return refs;
}

export async function renderEditedOrchestrationV001({drawingEvidenceRef, outputDirectory, evidenceDirectory,
  range = null, backgroundReuseProofPath, backgroundReuseDecoderRef = null,
  nativeAssetReuse, drawingRulesRef, onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  for (const file of [drawingEvidenceRef?.path, outputDirectory, evidenceDirectory]) assert(path.isAbsolute(file ?? ''));
  if (backgroundReuseProofPath !== undefined) assert(path.isAbsolute(backgroundReuseProofPath));
  const guards = [outputDirectory, evidenceDirectory].map(output =>
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: output}));
  await mkdir(evidenceDirectory);
  const started = performance.now(), timings = {};
  try {
    await onProgress({phase: 'prepare'});
    const inputBindingStarted = performance.now();
    const rules = drawingRulesRef ?? await buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef});
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    assert.deepEqual(rules.decoderRoles.savedBackgroundObservation, backgroundReuseDecoderRef,
      'saved background decoder must match the immutable job drawing rules');
    assert.equal((await bind(drawingEvidenceRef.path)).fileSha256, drawingEvidenceRef.fileSha256);
    const view = restoreOrchestrationDrawingViewEvidenceV001(await json(drawingEvidenceRef.path));
    const derived = createOrchestrationRenderScopeV001(view, range);
    const sourceReferences = await verifySourceReferences(view, drawingEvidenceRef);
    timings.inputBindingMilliseconds = performance.now() - inputBindingStarted;
    const initialEvidenceStarted = performance.now();
    await save(path.join(evidenceDirectory, 'start.json'), {schemaVersion: 'presentation-edited-render-start-v001',
      guards, drawingEvidenceRef, rules, scope: derived.scope, sourceReferences});
    timings.initialEvidenceWriteMilliseconds = performance.now() - initialEvidenceStarted;
    const backgroundStarted = performance.now();
    await onProgress({phase: 'background', scope: derived.scope});
    let background, backgroundProofRef;
    if (range === null && backgroundReuseProofPath) {
      assert(backgroundReuseDecoderRef !== null, 'saved full-background observations require an explicit bound decoder');
      await verifyDecoderReference(backgroundReuseDecoderRef);
      const reusable = await backgroundRenderer.inspectSavedOrchestrationBackgroundReuseV001({drawingView: view,
        range: {startFrame: 0, endFrameExclusive: view.projection.displayFrameCount},
        reuseProofPath: backgroundReuseProofPath, ffmpegPath: backgroundReuseDecoderRef.path, ffprobePath: toolPaths.ffprobePath});
      await save(path.join(evidenceDirectory, 'background-reuse.json'), {...reusable,
        observationDecoderRef: backgroundReuseDecoderRef,
        scope: 'reproduce the saved AAC observation; current drawing and new audio retain their own bound runtime'});
      if (reusable.used) {
        assert.equal(reusable.fullCoverage, true, 'full rendering requires a complete verified background');
        background = reusable.proof; backgroundProofRef = reusable.proofRef;
      }
    }
    if (!background) background = await backgroundRenderer.buildOrchestrationRangeBackgroundV001({drawingView: view,
      range: {startFrame: derived.scope.startFrame, endFrameExclusive: derived.scope.endFrameExclusive},
      outputDirectory: path.join(evidenceDirectory, 'background'), reuseProofPath: backgroundReuseProofPath,
      ffmpegPath: toolPaths.ffmpegPath, ffprobePath: toolPaths.ffprobePath});
    backgroundProofRef ??= background.proofRef;
    assert(backgroundProofRef, 'background proof reference is required');
    assert.equal((await bind(backgroundProofRef.path)).fileSha256, backgroundProofRef.fileSha256);
    assert.equal(background.status, 'passed');
    timings.backgroundMilliseconds = performance.now() - backgroundStarted;
    const media = await inspectRenderedMediaWithToolsV001(background.outputs.background.path, toolPaths);
    assert.equal(media.video.frameCount, derived.scope.frameCount);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidenceDirectory, 'processes')});
    const nativeAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'), processObserver});
    const cache = await createPresentationNativeAssetCacheV001({repositoryRoot: repo,
      directory: typeof nativeAssetReuse === 'string' ? nativeAssetReuse : nativeAssetReuse?.directory
        ?? path.join(directory, 'outputs/presentation/stage4-editing-native-assets-v001'),
      adapter: nativeAdapter, drawingProfile: rules});
    timings.preparationMilliseconds = performance.now() - started;
    const drawStarted = performance.now();
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory, plan: derived.normalPlan,
      presetRegistry: await json(registryPath), baseMediaPath: background.outputs.background.path,
      baseMediaInspection: {media}, expectedFrameCount: derived.scope.frameCount,
      overlayAdapter: cache.adapter, processObserver, toolPaths, serializePngAndFilters: true,
      runCounterfactualQc: true, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
      orchestrationDrawingView: view, renderRange: derived.renderRange, onProgress,
      orchestrationBackground: {projectionSha256: view.projection.projectionSha256,
        displayFrameCount: derived.scope.frameCount,
        ...(range === null ? {} : {range}), video: background.outputs.background, audio: background.outputs.audio}});
    timings.drawAndQcMilliseconds = performance.now() - drawStarted;
    const drawEvidenceStarted = performance.now();
    await save(path.join(evidenceDirectory, 'draw-result.json'), draw);
    timings.drawEvidenceWriteMilliseconds = performance.now() - drawEvidenceStarted;
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
    assert.equal(draw.finalQc.status, 'passed'); assert.deepEqual(draw.resolvedPlan, derived.resolvedPlan);
    assert.equal(draw.outputMedia.video.frameCount, derived.scope.frameCount);
    const finalVerificationStarted = performance.now();
    const finalAudioClock = await backgroundRenderer.inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: derived.scope.frameCount * 1470, sampleRate: 44100, ...toolPaths});
    const rendered = await bind(draw.workVideo);
    await verifySourceReferences(view, drawingEvidenceRef); await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    for (const ref of [background.outputs.background, background.outputs.audio]) assert.deepEqual(await bind(ref.path), ref);
    assert.equal((await bind(backgroundProofRef.path)).fileSha256, backgroundProofRef.fileSha256);
    timings.finalVerificationBeforePublishMilliseconds = performance.now() - finalVerificationStarted;
    const publicationStarted = performance.now();
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    assert.equal(publication.status, 'published');
    const candidateVideo = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(candidateVideo.fileSha256, rendered.fileSha256);
    await verifySourceReferences(view, drawingEvidenceRef); await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    assert.equal((await bind(backgroundProofRef.path)).fileSha256, backgroundProofRef.fileSha256);
    timings.publicationAndReverificationMilliseconds = performance.now() - publicationStarted;
    timings.elapsedMilliseconds = performance.now() - started;
    const result = {schemaVersion: 'presentation-edited-render-completion-v001', status: 'passed', candidateVideo,
      viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256,
      fourSavedSha256: view.fourSavedSha256, drawingRulesRef: rules,
      range: {startFrame: derived.scope.startFrame, endFrameExclusive: derived.scope.endFrameExclusive},
      scope: derived.scope, qcScope: range === null ? 'full-digest' : 'requested-range-only',
      expectedFrameCount: derived.scope.frameCount, sourceReferences, finalAudioClock, outputMedia: draw.outputMedia,
      background, backgroundProofRef, nativeAssets: {...cache.stats, profileSha256: cache.profileSha256},
      finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, publication, timings,
      processTimings: processObserver.getPerformance(),
      timingScope: 'completion excludes its own serialization/write and the caller result write',
      formalTrustChanged: false, humanQuality: 'not-evaluated', paidApiCalls: 0, newExternalMediaTransfers: 0};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    await onProgress({phase: 'complete', scope: derived.scope, timings});
    return result;
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error?.stack,
      timings, elapsedMilliseconds: performance.now() - started});
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [jobPath] = process.argv.slice(2);
  assert(path.isAbsolute(jobPath ?? ''), 'usage: edited-render absolute-job.json');
  await renderEditedOrchestrationV001({...await json(jobPath), onProgress: value => process.stdout.write(JSON.stringify(value) + '\n')});
}

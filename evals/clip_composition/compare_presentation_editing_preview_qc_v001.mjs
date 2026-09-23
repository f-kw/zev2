/** Compare frozen old QC with current QC on the same current preview. Every
 * finite RGB reference and sampled full frame is reopened, not inferred from
 * success flags or from MP4 equality with an older audio implementation. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {comparePreviewNativeRgbBytesV001} from './presentation_editing_preview_rgb_verification_v001.mjs';
import {bindPreviewQcFileV001, bindFrozenPreviewQcV001, assertFrozenPreviewNativeQcV001,
  loadPreviewQcComparisonInputV001, relocatePreviewQcPathsV001,
  PREVIEW_QC_BEFORE_SHARING_COMMIT_V001, PREVIEW_QC_BEFORE_SHARING_SHA256_V001}
  from './reproduce_presentation_editing_preview_qc_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const hashBytes = value => createHash('sha256').update(value).digest('hex');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
async function verifyRef(ref) {
  const actual = await bindPreviewQcFileV001(ref.path);
  assert.equal(actual.fileSha256, ref.fileSha256, 'comparison input changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(actual.bytes, ref.bytes);
  return actual;
}

export async function comparePreviewQcRgbInputsV001(options) {
  const rgb = await comparePreviewNativeRgbBytesV001(options);
  const actualInput = ({recordedPath, ...row}) => row;
  assert.deepEqual(rgb.before.inputReferences.map(actualInput), rgb.after.inputReferences.map(actualInput),
    'old and current QC did not read exactly the same input files');
  return rgb;
}

/** The logical frame mapping is checked before comparing actual full pixels.
 * Single-seek and batch PNGs may serialize identical pixels differently. */
export async function comparePreviewFramePixelsV001({before, after, canvas, imageMagick, processObserver}) {
  assert.equal(before.samples.length, after.samples.length);
  await verifyRef(imageMagick);
  const verified = new Map(), pairs = new Map(), decoded = new Map();
  async function decode(ref) {
    const bound = await verifyRef(ref);
    verified.set(ref.path, bound);
    let rgb = decoded.get(bound.fileSha256);
    if (rgb === undefined) {
      const dimensions = await processObserver.run(imageMagick.path, [ref.path, '-format', '%w %h', 'info:'],
        {allowedExitCodes: [0], observationLabel: 'comparison-frame-dimensions'});
      assert.equal(dimensions.stdout.toString('utf8'), canvas.width + ' ' + canvas.height,
        'full frame PNG dimensions differ');
      const result = await processObserver.run(imageMagick.path,
        [ref.path, '-alpha', 'off', '-depth', '8', 'rgb:-'],
        {allowedExitCodes: [0], observationLabel: 'comparison-frame-rgb'});
      assert.equal(result.stdout.length, canvas.width * canvas.height * 3, 'full frame RGB dimensions differ');
      rgb = result.stdout; decoded.set(bound.fileSha256, rgb);
    }
    return {bound, rgb};
  }
  for (const [index, first] of before.samples.entries()) {
    const second = after.samples[index];
    assert.deepEqual({instructionId: first.instructionId, frame: first.frame, mediaFrame: first.mediaFrame, crop: first.crop},
      {instructionId: second.instructionId, frame: second.frame, mediaFrame: second.mediaFrame, crop: second.crop},
      'full frame correspondence differs at sample ' + index);
    for (const role of ['baseFrame', 'completedFrame']) {
      const key = canonicalJson([first.frame, first.mediaFrame, role, first[role], second[role]]);
      if (pairs.has(key)) continue;
      const left = await decode(first[role]), right = await decode(second[role]);
      assert(left.rgb.equals(right.rgb), role + ' actual full-frame RGB differs at frame ' + first.frame);
      pairs.set(key, {frame: first.frame, mediaFrame: first.mediaFrame, role,
        before: left.bound, after: right.bound, rgbBytes: left.rgb.length,
        rgbSha256: hashBytes(left.rgb), actualBytesEqual: true});
    }
  }
  for (const ref of verified.values()) await verifyRef(ref);
  await verifyRef(imageMagick);
  return {status: 'passed', pairs: [...pairs.values()], actualRgbComparisons: pairs.size,
    uniquePngDecodes: decoded.size, inputRefs: [...verified.values()], imageMagick,
    meaning: 'all finite sample global/local frame mappings and decoded full base/completed RGB bytes match'};
}

export async function comparePreviewQcV001({reproductionPath, resultPath, outputDirectory}) {
  const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const started = performance.now(), reproductionRef = await bindPreviewQcFileV001(reproductionPath);
  const reproduction = await parse(reproductionPath);
  assert.equal(reproduction.schemaVersion, 'presentation-editing-preview-qc-reproduction-v001');
  assert.equal(reproduction.status, 'passed'); assert.equal(reproduction.completedMediaGenerated, 0);
  assert.equal(reproduction.frozenCommit, PREVIEW_QC_BEFORE_SHARING_COMMIT_V001);
  assert.equal(reproduction.frozenSource.fileSha256, PREVIEW_QC_BEFORE_SHARING_SHA256_V001);
  assert.deepEqual(reproduction.frozenSources, await bindFrozenPreviewQcV001());
  for (const ref of [reproduction.currentResult, reproduction.frozenSource, reproduction.request, reproduction.legacyNativeQc])
    await verifyRef(ref);
  assert.equal(reproduction.currentResult.path, resultPath, 'old QC was not run on this current preview');
  const loaded = await loadPreviewQcComparisonInputV001(resultPath), current = loaded.result;
  assert.deepEqual(loaded.resultRef, reproduction.currentResult);
  const request = await parse(reproduction.request.path), oldNative = await parse(reproduction.legacyNativeQc.path);
  assert.equal(request.recipeSha256, loaded.recipeSha256);
  assert.deepEqual(request.currentResult, loaded.resultRef);
  assert.deepEqual(request.frozenSources, reproduction.frozenSources);
  assert.deepEqual(request.relocations, loaded.relocations);
  assert.deepEqual(request.prepared, loaded.preparedRef);
  assert.deepEqual(request.inputs, loaded.inputs);
  assertFrozenPreviewNativeQcV001({native: oldNative, plan: loaded.plan, renderRange: loaded.inputs.renderRange});
  assert.deepEqual(oldNative.evidence.sceneBindings, relocatePreviewQcPathsV001(loaded.recipe.sceneBindings, loaded.relocations),
    'old and current QC do not bind the same exact ordered PNG states');
  await mkdir(outputDirectory);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(outputDirectory, 'processes')});
  const rgbStarted = performance.now();
  const rgb = await comparePreviewQcRgbInputsV001({before: oldNative.evidence,
    after: current.completedFrameQc.evidence.finiteState, afterRelocations: loaded.relocations});
  const rgbVerificationMilliseconds = performance.now() - rgbStarted;
  const frameStarted = performance.now();
  const frames = await comparePreviewFramePixelsV001({before: oldNative.evidence,
    after: current.completedFrameQc.evidence.finiteState, canvas: loaded.plan.canvas,
    imageMagick: loaded.inputs.tools.imageMagick, processObserver: observer});
  for (const ref of [reproductionRef, reproduction.currentResult, reproduction.frozenSource,
    reproduction.request, reproduction.legacyNativeQc, loaded.preparedRef, current.candidateVideo]) await verifyRef(ref);
  for (const ref of [...rgb.before.inputReferences, ...rgb.after.inputReferences]) await verifyRef(ref);
  for (const ref of [...oldNative.evidence.outputArtifacts, ...current.completedFrameQc.evidence.finiteState.outputArtifacts])
    await verifyRef(ref);
  assert.deepEqual(reproduction.frozenSources, await bindFrozenPreviewQcV001());
  const comparison = {schemaVersion: 'presentation-editing-preview-qc-comparison-v002', status: 'passed',
    checkedAt: new Date().toISOString(), guard, range: current.range, expectedFrameCount: current.expectedFrameCount,
    frozenCommit: reproduction.frozenCommit, reproduction: reproductionRef, currentResult: loaded.resultRef,
    inputs: {sameCompletedMedia: current.candidateVideo, recipeSha256: loaded.recipeSha256,
      publicationRelocations: loaded.relocations, completedMediaGeneratedForComparison: 0},
    savedState: {viewSha256: current.viewSha256, projectionSha256: current.projectionSha256,
      fourSavedSha256: current.fourSavedSha256, drawingRulesRef: current.drawingRulesRef},
    checks: {currentFinalQc: current.finalQc, currentCompletedFrameQc: {status: current.completedFrameQc.status,
      violations: current.completedFrameQc.violations}, oldNativeQc: {status: oldNative.status, violations: oldNative.violations}},
    rgb, frames, normalizedSamplesSha256: hash(rgb.after.samples),
    performance: {oldNative: oldNative.performance, currentNative: current.completedFrameQc.performance.finiteState,
      currentFullQc: current.completedFrameQc.performance, currentRender: current.timings,
      currentNativeAssets: current.nativeAssets, oldProcesses: reproduction.processes,
      comparison: {rgbVerificationMilliseconds, fullFrameVerificationMilliseconds: performance.now() - frameStarted,
        totalMilliseconds: performance.now() - started, processes: observer.getPerformance()}},
    finalAudioClock: current.finalAudioClock,
    limitation: 'Same current media, PNGs and sample recipe; actual input/RGB/frame bytes are checked. This is not browser acceptance, human quality approval or a full Digest rerender. Old preview MP4 bytes are historical audio evidence, not an equality requirement.'};
  const outputPath = path.join(outputDirectory, 'comparison.json');
  await writeFile(outputPath, JSON.stringify(comparison, null, 2) + '\n', {flag: 'wx'});
  return {outputPath, ...comparison};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [reproductionPath, resultPath, outputDirectory] = process.argv.slice(2);
  const result = await comparePreviewQcV001({reproductionPath, resultPath, outputDirectory});
  process.stdout.write(JSON.stringify({status: result.status, outputPath: result.outputPath,
    frameComparisons: result.frames.actualRgbComparisons, normalizedSamplesSha256: result.normalizedSamplesSha256}) + '\n');
}

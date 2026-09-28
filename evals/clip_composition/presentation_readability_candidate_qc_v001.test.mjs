import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, mkdir, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {canonicalJson, canonicalSha256} from '../../tools/digest-quality/clock.mjs';
import {buildReadabilityCandidateQcInventoryV001} from '../../tools/digest-quality/caption-readability-qc-inventory.mjs';
import {deriveReadabilityOrchestrationDrawingViewV001, restoreOrchestrationDrawingViewEvidenceV001,
  exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {preparePresentationNativeFrameQcV001} from './presentation_native_frame_qc_preparation_v001.mjs';
import {buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerDecodeArgumentsV001,
  buildPresentationNativeReferenceArgumentsV001} from './presentation_native_frame_qc_v001.mjs';
import {hashPresentationNativeFileV001, processPresentationNativeSampleV001}
  from './presentation_native_qc_streaming_v001.mjs';
import {writePresentationQcEvidenceV001, readPresentationQcEvidenceV001}
  from './presentation_qc_evidence_store_v001.mjs';

const exec = promisify(execFile);
const run = async (command, args) => {
  const {stdout, stderr} = await exec(command, args, {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024});
  return {code: 0, signal: null, stdout, stderr};
};
const ref = async pathname => ({path: pathname, fileSha256: await hashPresentationNativeFileV001(pathname)});

test('saved 431-caption candidate keeps every native recipe, true Normal alternatives and its source binding through preparation and reread', async t => {
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  const saved = path.join(repo, 'runtime/artifacts/digest-new-material-20260926-v001');
  const candidate = path.join(repo, 'runtime/artifacts/caption-readability-20260928-preview-v006');
  const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
  let originalEvidence;
  try {originalEvidence = await readJson(path.join(saved, 'presentation/drawing-evidence.json'));}
  catch (error) {if (error.code === 'ENOENT') {t.skip('saved local Digest fixture is unavailable'); return;} throw error;}
  let evidence, savedResolution;
  try {
    evidence = await readJson(path.join(candidate, 'readability-evidence.json'));
    savedResolution = await readJson(path.join(candidate, 'readability-resolution.json'));
  } catch (error) {if (error.code === 'ENOENT') {t.skip('saved local 7A comparison is unavailable'); return;} throw error;}
  const originalView = restoreOrchestrationDrawingViewEvidenceV001(originalEvidence);
  const input = {view: originalView, version: 'candidate-readability-v001', meaning: await readJson(path.join(saved, 'caption-attempt-003/meaning-input.json')),
    evidence, savedResolution};
  const originalHash = canonicalSha256(originalEvidence);
  const view = deriveReadabilityOrchestrationDrawingViewV001(input);
  const {summary, records, recipe} = buildReadabilityCandidateQcInventoryV001(view);
  assert.equal(summary.captions, 431); assert.equal(summary.nativeStates, 483);
  assert.equal(summary.samples, 529); assert.equal(summary.logicalReferences, 511014);
  assert.equal(summary.wholeColorAlternatives, 32);
  assert.deepEqual(summary.captionKinds, {normal: 379, color: 33, bounce: 8, panel: 7, scale: 2, shake: 2});
  assert.equal(summary.decodedLayerCountUpperBound, 2011);
  assert.equal(summary.decodedLayerLogicalBytesUpperBound, 16680038400);
  for (const record of records) {
    const normal = record.alternates.find(row => row.kind === 'normal').element;
    assert.equal(normal.visualState.textStyle.fontSizePx, 144);
    assert.equal(normal.visualState.background, null);
    for (const key of ['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion'])
      assert.equal(normal[key], undefined);
  }
  // Two source partial ranges fill their new child. They still require a
  // whole-color logical reference, even when the two references share pixels.
  const sourcePartialNowFull = records.filter(record => record.alternates.some(a => a.kind === 'whole-color')
    && record.element.presentationColorRange.startCodePoint === 0
    && record.element.presentationColorRange.endCodePointExclusive === Array.from(record.element.text).length);
  assert.equal(sourcePartialNowFull.length, 2);
  assert.throws(() => deriveReadabilityOrchestrationDrawingViewV001({...input, version: 'unknown'}), /version/);
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-readability-qc-binding-'));
  t.after(() => rm(root, {recursive: true}));
  // The preparation adapter intentionally serializes props instead of drawing
  // PNGs. This exercises file binding and restoration, not raster correctness.
  const propsFor = element => ({schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
    canvas: structuredClone(view.resolvedPlan.canvas), text: element.text,
    indexedLines: structuredClone(element.indexedLines), visualState: structuredClone(element.visualState), inspectionLineIndex: null,
    ...(element.presentationColorRange ? {presentationColorRange: structuredClone(element.presentationColorRange)} : {})});
  let index = 0;
  for (const record of records) {
    const states = record.motionStates ?? record.pulseStates ?? [record];
    for (const state of states) {
      state.pngPath = path.join(root, 'bound-props-' + index++ + '.png');
      await writeFile(state.pngPath, canonicalJson(state.props), {flag: 'wx'});
    }
    record.pngPath = states[0].pngPath;
  }
  const preparation = await preparePresentationNativeFrameQcV001({plan: view.resolvedPlan, records,
    orchestrationDrawingView: view, presentationTimeline: null, presetRegistry: {version: 'binding-test-only'},
    scratchDirectory: path.join(root, 'preparation'),
    overlayAdapter: {buildProps: propsFor, renderStill: (props, file) => writeFile(file, canonicalJson(props), {flag: 'wx'})},
    inspectPng: async args => ({...args, alphaBounds: {left: 0, top: 0, right: 1920, bottom: 1080, width: 1920, height: 1080}})});
  assert.equal(preparation.records.length, 431);
  assert.equal(preparation.provenance.inputRefs.find(row => row.role === 'baseline-plan').fileSha256,
    originalView.sourceContext.baselineRef.fileSha256);
  const preparedOrchestration = preparation.provenance.inputRefs.find(row => row.role === 'orchestration-input');
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(await readJson(preparedOrchestration.path)), view);
  const shared = path.join(root, 'shared-candidate.json'), answer = path.join(root, 'independent.json');
  await writePresentationQcEvidenceV001(shared, {drawingEvidence: exportOrchestrationDrawingViewEvidenceV001(view), summary});
  await exec(process.execPath, ['--input-type=module', '-e', `
    import {writeFile} from 'node:fs/promises';
    import {readPresentationQcEvidenceV001} from ${JSON.stringify(new URL('./presentation_qc_evidence_store_v001.mjs', import.meta.url).href)};
    import {restoreOrchestrationDrawingViewEvidenceV001} from ${JSON.stringify(new URL('./presentation_orchestration_v001.mjs', import.meta.url).href)};
    import {buildReadabilityCandidateQcInventoryV001} from ${JSON.stringify(new URL('../../tools/digest-quality/caption-readability-qc-inventory.mjs', import.meta.url).href)};
    const saved=await readPresentationQcEvidenceV001(process.argv[1]);
    const view=restoreOrchestrationDrawingViewEvidenceV001(saved.drawingEvidence);
    await writeFile(process.argv[2],JSON.stringify({summary:buildReadabilityCandidateQcInventoryV001(view).summary,viewSha256:view.viewSha256}),{flag:'wx'});
  `, shared, answer], {maxBuffer: 1024 * 1024});
  const independentlyRead = await readJson(answer);
  assert.deepEqual(independentlyRead.summary, summary);
  assert.equal(independentlyRead.viewSha256, view.viewSha256);
  assert.equal(canonicalSha256(originalEvidence), originalHash);
  assert.equal(recipe.samples.reduce((sum, row) => sum + row.references.length, 0), 511014);
});

// These are mechanical 8 x 8 compositor fixtures, not font/layout or video
// quality observations. The same native preparation, exact RGB classifier,
// retention receipts and shared evidence reader are used by full candidate QC.
test('candidate QC preserves correct/omitted/wrong-state/duplicate/shift decisions through common storage and independent reread', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-readability-native-qc-'));
  t.after(() => rm(root, {recursive: true}));
  const ffmpeg = await realpath('/opt/homebrew/bin/ffmpeg');
  const magick = await realpath('/opt/homebrew/bin/magick');
  const tools = {ffmpeg: await ref(ffmpeg), imageMagick: await ref(magick)};
  const input = path.join(root, 'input'); await mkdir(input);
  const base = path.join(input, 'base.png');
  await run(magick, ['-size', '8x8', 'xc:#101010', base]);
  const stateDefinitions = [
    {bindingId: 'candidate-state', shape: 'rectangle 2,2 5,5'},
    {bindingId: 'other-finite-state', shape: 'rectangle 2,3 5,4'},
    {bindingId: 'shifted-position', shape: 'rectangle 3,2 6,5'},
  ];
  const states = [];
  for (const definition of stateDefinitions) {
    const file = path.join(input, definition.bindingId + '.png');
    await run(magick, ['-size', '8x8', 'xc:none', '-fill', '#ffffff80', '-draw', definition.shape, file]);
    states.push({bindingId: definition.bindingId, pngPath: file, pngSha256: (await ref(file)).fileSha256});
  }
  const sceneBindings = [{instructionId: 'candidate-caption', states, alternates: []}];
  const layer = {bindingId: 'candidate-state', localFrame: 3, displayFrameCount: 10};
  const references = [
    {id: 'expected', kind: 'expected', layers: [layer]},
    {id: 'omitted', kind: 'target-omitted', layers: []},
    {id: 'wrong-state', kind: 'motion-state', layers: [{...layer, bindingId: 'other-finite-state'}]},
    {id: 'duplicate', kind: 'inactive-foreign-addition', layers: [layer, {...layer}]},
    {id: 'shifted-position', kind: 'target-alternate', layers: [{...layer, bindingId: 'shifted-position'}]},
    {id: 'shifted-clock', kind: 'target-alternate', layers: [{...layer, localFrame: 0}]},
  ];
  const sample = {instructionId: 'candidate-caption', frame: 4, mediaFrame: 4, expectedState: 'candidate-state',
    expectedOverlaySha256: states[0].pngSha256, crop: {left: 0, top: 0, width: 8, height: 8},
    baseFrame: await ref(base), completedFrame: null, references};
  const layerDirectory = path.join(input, 'layers'); await mkdir(layerDirectory);
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples: [sample], sceneBindings,
    directory: layerDirectory, canvas: {width: 8, height: 8}});
  // The clock-shift injection uses the production fade preparation, not an
  // alternate numerical approximation of alpha.
  const {buildPresentationNativeLayerArgumentsV001} = await import('./presentation_native_frame_qc_v001.mjs');
  for (const layer of nativeLayers.layers.filter(row => row.generated))
    await run(ffmpeg, buildPresentationNativeLayerArgumentsV001([layer]));
  for (const layer of nativeLayers.layers) await run(ffmpeg, buildPresentationNativeLayerDecodeArgumentsV001([layer]));
  const preparedArtifacts = await Promise.all(nativeLayers.layers.map(row => ref(row.decodedPath)));
  const cases = [];
  for (const [index, reference] of references.entries()) {
    const rgb = path.join(input, reference.id + '.rgb'), completed = path.join(input, reference.id + '.png');
    await run(ffmpeg, buildPresentationNativeReferenceArgumentsV001({sample: {...sample, references: [reference]},
      sceneBindings, nativeLayers, baseFramePath: base, outputPaths: [rgb]}));
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'rawvideo', '-pixel_format', 'rgb24',
      '-video_size', '8x8', '-i', rgb, '-frames:v', '1', '-c:v', 'png', '-pix_fmt', 'rgb24', completed]);
    const result = await processPresentationNativeSampleV001({sample: {...sample, completedFrame: await ref(completed)},
      sceneBindings, nativeLayers, tools, preparedArtifacts, directory: path.join(root, 'case-' + index), run,
      batchSize: 2, retention: 'verified-pass-regenerable-v001'});
    assert.equal(result.sample.references.length, references.length);
    assert.equal(result.sample.visible, reference.id === 'expected', reference.id);
    assert.equal(result.sample.referenceRetention.state, reference.id === 'expected' ? 'released-verified-pass' : 'retained');
    const minimum = Math.min(...result.sample.classes.map(row => row.absoluteRgbDifference));
    const winners = result.sample.classes.filter(row => row.absoluteRgbDifference === minimum);
    assert.equal(winners.length, 1);
    assert.deepEqual(winners[0].referenceIds, [reference.id]);
    cases.push({injection: reference.id, sample: result.sample});
  }
  const file = path.join(root, 'shared-evidence.json');
  await writePresentationQcEvidenceV001(file, {schemaVersion: 'readability-native-regression-v001', cases});
  assert.deepEqual(await readPresentationQcEvidenceV001(file), {schemaVersion: 'readability-native-regression-v001', cases});
  const verification = path.join(root, 'independent-verification.json');
  await exec(process.execPath, ['--input-type=module', '-e', `
    import {writeFile} from 'node:fs/promises';
    import {readPresentationQcEvidenceV001} from ${JSON.stringify(new URL('./presentation_qc_evidence_store_v001.mjs', import.meta.url).href)};
    import {verifyPresentationNativeSampleReceiptsV001,revalidatePresentationNativeSampleV001}
      from ${JSON.stringify(new URL('./presentation_native_qc_streaming_v001.mjs', import.meta.url).href)};
    const evidence=await readPresentationQcEvidenceV001(process.argv[1]);
    const receipt=await verifyPresentationNativeSampleReceiptsV001({samples:evidence.cases.map(row=>row.sample)});
    const regenerated=await revalidatePresentationNativeSampleV001({sample:evidence.cases[0].sample,directory:process.argv[2]});
    await writeFile(process.argv[3],JSON.stringify({receipt,regenerated}),{flag:'wx'});
  `, file, path.join(root, 'regenerated'), verification], {maxBuffer: 1024 * 1024});
  const independentlyRead = JSON.parse(await readFile(verification, 'utf8'));
  assert.equal(independentlyRead.receipt.status, 'passed');
  const regenerated = independentlyRead.regenerated.sample, original = cases[0].sample;
  assert.equal(regenerated.visible, original.visible);
  assert.deepEqual(regenerated.classes, original.classes);
  assert.deepEqual(regenerated.references.map(({rgbPath: _, ...row}) => row),
    original.references.map(({rgbPath: _, ...row}) => row));
});

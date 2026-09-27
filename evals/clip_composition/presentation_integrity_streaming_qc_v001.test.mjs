import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {checkFiniteExecutionEvidence} from './presentation_integrity_state_qc_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
  buildPresentationNativeFrameBatchPlanV001, buildPresentationNativeFrameBatchExtractionArgumentsV001,
  buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerDecodeArgumentsV001,
  buildPresentationNativeReferenceExecutionV001, buildPresentationNativeReferenceArgumentsV001,
  classifyPresentationNativeFrameRgbV001} from './presentation_native_frame_qc_v001.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const clone = value => structuredClone(value);
const file = (pathname, bytes) => ({path: pathname, fileSha256: hash(bytes)});
const processRecord = (purpose, command, args, stdout = '') => ({purpose, command, args,
  argumentsCanonicalSha256: hashJson(args), code: 0, signal: null,
  stdoutSha256: hash(stdout), stderrSha256: hash('')});

// Small structural fixture: the real recipe/command builders derive two complete
// samples sharing one PNG. It is not claimed as a native media execution.
function fixture({batchSize = 1, state = 'released-verified-pass'} = {}) {
  const canvas = {width: 2, height: 2}, root = '/fixture/streaming';
  const base = file('/fixture/base.mp4', 'base'), completed = file('/fixture/completed.mp4', 'completed');
  const ffmpeg = file('/fixture/ffmpeg', 'ffmpeg'), magick = file('/fixture/magick', 'magick');
  const png = file('/fixture/caption.png', 'png');
  const sceneBindings = [{states: [{bindingId: 'caption-state', pngPath: png.path, pngSha256: png.fileSha256}], alternates: []}];
  const pixels = Buffer.alloc(12, 10), empty = Buffer.alloc(12);
  const layer = {bindingId: 'caption-state', localFrame: 3, displayFrameCount: 8};
  const samples = [1, 2].map((frame, index) => {
    const references = [{id: 'expected', layers: [layer]}, {id: 'omitted', layers: []},
      {id: 'alias', layers: [clone(layer)]}];
    const decision = classifyPresentationNativeFrameRgbV001({completedRgb: pixels,
      references: references.map(row => ({id: row.id, rgb: row.id === 'omitted' ? empty : pixels}))});
    return {instructionId: 'caption-' + index, frame, crop: {left: 0, top: 0, width: 2, height: 2},
      ...decision, references: references.map((row, i) => ({...row, ...decision.references[i]}))};
  });
  const frameExtraction = buildPresentationNativeFrameBatchPlanV001({samples, directory: root + '/frames'});
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples, sceneBindings, canvas, directory: root + '/layers'});
  const referenceDirectory = root + '/references';
  const inputManifest = {inputRefs: [{role: 'base-media', ...base}, {role: 'completed-media', ...completed},
    {role: 'tool-ffmpeg', ...ffmpeg}, {role: 'tool-imagemagick', ...magick}, {role: 'png-caption-state', ...png}]};
  const executableVersions = {ffmpeg: 'fixture ffmpeg', imageMagick: 'fixture magick'};
  const processes = [processRecord('tool-version', ffmpeg.path, ['-version'], executableVersions.ffmpeg),
    processRecord('tool-version', magick.path, ['-version'], executableVersions.imageMagick),
    processRecord('source-frames-extract', ffmpeg.path,
      buildPresentationNativeFrameBatchExtractionArgumentsV001(base.path, [1, 2], frameExtraction.baseOutputPattern)),
    processRecord('completed-frames-extract', ffmpeg.path,
      buildPresentationNativeFrameBatchExtractionArgumentsV001(completed.path, [1, 2], frameExtraction.completedOutputPattern))];
  const outputArtifacts = [];
  for (const [index, sample] of samples.entries()) {
    sample.baseFrame = file(frameExtraction.frames[index].basePath, 'same base pixels');
    sample.completedFrame = file(frameExtraction.frames[index].completedPath, 'same completed pixels');
    outputArtifacts.push(sample.baseFrame, sample.completedFrame);
  }
  processes.push(processRecord('native-layer-decode', ffmpeg.path, buildPresentationNativeLayerDecodeArgumentsV001(nativeLayers.layers)));
  for (const layer of nativeLayers.layers) outputArtifacts.push(file(layer.decodedPath, 'decoded layer'));
  for (const [index, sample] of samples.entries()) {
    const directory = path.join(referenceDirectory, 'sample-' + index);
    sample.completedRgb = file(path.join(directory, 'completed.rgb'), pixels);
    sample.completedRgbSha256 = sample.completedRgb.fileSha256;
    processes.push(processRecord('completed-rgb-crop', magick.path, [sample.completedFrame.path,
      '-crop', '2x2+0+0', '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], pixels));
    const executions = buildPresentationNativeReferenceExecutionV001({sample, sceneBindings, nativeLayers,
      directory: path.join(directory, 'references')});
    sample.references.forEach((row, i) => {row.rgbPath = executions[i].path;});
    const unique = [...new Map(executions.map(row => [row.key, row])).values()];
    for (let offset = 0; offset < unique.length; offset += batchSize) {
      const batch = unique.slice(offset, offset + batchSize);
      processes.push(processRecord('native-reference-composite', ffmpeg.path,
        buildPresentationNativeReferenceArgumentsV001({sample: {...sample, references: batch.map(row => row.reference)},
          sceneBindings, nativeLayers, baseFramePath: sample.baseFrame.path, outputPaths: batch.map(row => row.path)})));
    }
    sample.referenceRetention = {schemaVersion: 'native-reference-retention-v001', state,
      checkpoint: file(path.join(directory, 'sample-proof.json'), 'sample-proof-' + index),
      artifacts: unique.map(row => ({path: row.path, fileSha256: row.reference.rgbSha256, bytes: 12}))};
    outputArtifacts.push(sample.completedRgb, sample.referenceRetention.checkpoint);
    if (state === 'retained') for (const {path: pathname, fileSha256} of sample.referenceRetention.artifacts)
      outputArtifacts.push({path: pathname, fileSha256});
  }
  const finite = {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
    executionMethod: 'sample-batched-native-references-v003', referenceBatchSize: batchSize,
    inputManifest, sceneBindings, samples, frameExtraction, nativeLayers, referenceDirectory,
    executableVersions, processes, outputArtifacts};
  const inspections = samples.map(sample => ({instructionId: sample.instructionId,
    nativeFrameQc: {inputManifest, sceneBindings, samples: [sample]}}));
  return {finite, inspections, canvas};
}
const check = f => checkFiniteExecutionEvidence(f.finite, f.inspections, f.canvas);

for (const state of ['retained', 'released-verified-pass']) for (const batchSize of [1, 2, 32]) {
  test('structural execution keeps all candidates with batch size ' + batchSize + ' and ' + state, () => {
    const f = fixture({state, batchSize});
    assert.doesNotThrow(() => check(f));
    assert.equal(f.finite.samples.reduce((n, row) => n + row.references.length, 0), 6);
    assert.equal(f.finite.samples.reduce((n, row) => n + row.referenceRetention.artifacts.length, 0), 4);
    assert.notEqual(f.finite.samples[0].references[0].rgbPath, f.finite.samples[1].references[0].rgbPath);
  });
}

test('unknown or incomplete retention, missing proof, invalid paths and artifact tampering are rejected', () => {
  const changes = [
    f => {f.finite.executionMethod = 'unknown';},
    f => {f.finite.referenceBatchSize = 0;},
    f => {f.finite.referenceBatchSize = 1.5;},
    f => {delete f.finite.samples[0].referenceRetention;},
    f => {f.finite.samples[0].referenceRetention.schemaVersion = 'unknown';},
    f => {f.finite.samples[0].referenceRetention.state = 'pending';},
    f => {f.finite.samples[0].referenceRetention.extra = true;},
    f => {f.finite.samples[0].referenceRetention.checkpoint.path = f.finite.samples[1].referenceRetention.checkpoint.path;},
    f => {f.finite.samples[0].referenceRetention.checkpoint.fileSha256 = 'invalid';},
    f => {f.finite.samples[0].referenceRetention.artifacts.pop();},
    f => {f.finite.samples[0].referenceRetention.artifacts.push(clone(f.finite.samples[0].referenceRetention.artifacts[0]));},
    f => {f.finite.samples[0].referenceRetention.artifacts[0].bytes++;},
    f => {f.finite.samples[0].referenceRetention.artifacts[0].fileSha256 = hash('wrong pixels');},
    f => {f.finite.samples[0].referenceRetention.artifacts.reverse();},
    f => {f.finite.samples[0].references[0].rgbPath = f.finite.samples[1].references[0].rgbPath;},
    f => {f.finite.outputArtifacts.pop();},
    f => {f.finite.outputArtifacts.push(clone(f.finite.outputArtifacts[0]));},
    f => {const {path, fileSha256} = f.finite.samples[0].referenceRetention.artifacts[0]; f.finite.outputArtifacts.push({path, fileSha256});},
  ];
  for (const [index, change] of changes.entries()) {
    const f = fixture(); change(f);
    assert.throws(() => check(f), undefined, 'mutation ' + index);
  }
});

test('a failed, tied, or invisible sample cannot release images; retained failure still has a valid execution', () => {
  for (const change of [
    sample => {sample.visible = false;},
    sample => {sample.expectedClassId = sample.omittedClassId;},
    sample => {sample.classes[1].absoluteRgbDifference = sample.classes[0].absoluteRgbDifference;},
    sample => {sample.classes[0].absoluteRgbDifference = sample.classes[1].absoluteRgbDifference + 1;},
  ]) {
    const f = fixture(); change(f.finite.samples[0]);
    assert.throws(() => check(f), /only a verified unique-minimum passing sample/);
  }
  const failed = fixture({state: 'retained'}); failed.finite.samples[0].visible = false;
  assert.doesNotThrow(() => check(failed), 'execution validity is separate from video QC verdict');
  const missing = fixture({state: 'retained'}); missing.finite.outputArtifacts.pop();
  assert.throws(() => check(missing), /output artifacts differ/);
});

test('batch changes, child failure, cancellation, missing child and out-of-order execution do not pass', () => {
  for (const change of [
    f => {f.finite.referenceBatchSize = 2;},
    f => {f.finite.processes.find(row => row.purpose === 'native-reference-composite').code = 1;},
    f => {f.finite.processes.find(row => row.purpose === 'native-reference-composite').signal = 'SIGTERM';},
    f => {f.finite.processes.pop();},
    f => {f.finite.processes.push(clone(f.finite.processes.at(-1)));},
    f => {const index = f.finite.processes.findIndex(row => row.purpose === 'native-reference-composite');
      [f.finite.processes[index], f.finite.processes[index + 1]] = [f.finite.processes[index + 1], f.finite.processes[index]];},
    f => {const row = f.finite.processes.find(row => row.purpose === 'native-reference-composite');
      row.args[row.args.indexOf('-pixel_format') + 1] = 'rgba'; row.argumentsCanonicalSha256 = hashJson(row.args);},
  ]) {const f = fixture(); change(f); assert.throws(() => check(f));}
});

test('saved preparation lineage binds the exact historical prefix and does not claim new outputs', () => {
  const withReuse = () => {
    const f = fixture();
    f.finite.preparationReuse = {schemaVersion: 'saved-native-preparation-reuse-v001',
      sourceEvidence: file('/fixture/old-native-evidence.json', 'immutable old evidence'),
      sourceExecutionMethod: 'batched-frames-shared-planar-native-layers-v002',
      reusedProcessCount: f.finite.processes.findIndex(row => row.purpose === 'completed-rgb-crop')};
    return f;
  };
  assert.doesNotThrow(() => check(withReuse()));
  for (const change of [
    reuse => {reuse.schemaVersion = 'unknown';},
    reuse => {reuse.sourceExecutionMethod = 'sample-batched-native-references-v003';},
    reuse => {reuse.reusedProcessCount--;},
    reuse => {reuse.reusedProcessCount++;},
    reuse => {reuse.sourceEvidence.path = 'relative.json';},
    reuse => {reuse.sourceEvidence.fileSha256 = 'invalid';},
    reuse => {reuse.sourceEvidence.extra = true;},
    reuse => {reuse.extra = true;},
    reuse => {reuse.sourceEvidence.path = '/fixture/streaming/frames/base/frame-000000000.png';},
  ]) {const f = withReuse(); change(f.finite.preparationReuse); assert.throws(() => check(f), /preparation/);}
});

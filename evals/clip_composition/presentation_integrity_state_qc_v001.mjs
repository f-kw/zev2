import {createHash} from 'node:crypto';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationExactReplayQcEvidenceV001} from './presentation_exact_replay_qc_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
  PRESENTATION_NATIVE_FRAME_EXECUTION_V001, buildPresentationNativeFrameBatchPlanV001,
  buildPresentationNativeFrameBatchExtractionArgumentsV001, buildPresentationNativeLayerPlanV001,
  buildPresentationNativeLayerArgumentsV001, buildPresentationNativeLayerDecodeArgumentsV001,
  buildPresentationNativeReferenceExecutionV001,
  buildPresentationNativeReferenceArgumentsV001,
  validatePresentationNativeFrameQcScopeV001, validatePresentationNativeFrameQcInspectionsV001} from './presentation_native_frame_qc_v001.mjs';

export const PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001 = 'exact-replay-native-v1';
export const PRESENTATION_INTEGRITY_STATE_QC_SCHEMA_V001 = 'presentation-integrity-state-qc-v001';
export const PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001 = 'exact-replay-and-native-finite-state-v001';

const requireValue = (condition, reason) => {if (!condition) throw new TypeError(reason);};
const HASH = /^[a-f0-9]{64}$/u;
const same = (left, right) => left === right || canonicalJson(left) === canonicalJson(right);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalDigest = value => digest(canonicalJson(value));
const STREAMING_EXECUTION = 'sample-batched-native-references-v003';
const RETENTION_SCHEMA = 'native-reference-retention-v001';
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && same(Object.keys(value).sort(), [...keys].sort());

/** Structural execution verification; actual retained/released byte checks use the asynchronous reader. */
export function checkFiniteExecutionEvidence(finite, inspections, canvas) {
  const streaming = finite?.executionMethod === STREAMING_EXECUTION;
  requireValue(finite?.schemaVersion === PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001
    && Array.isArray(finite.samples) && Array.isArray(finite.processes)
    && Array.isArray(finite.outputArtifacts)
    && (streaming || finite.executionMethod === PRESENTATION_NATIVE_FRAME_EXECUTION_V001),
  'complete current finite-state execution evidence is missing');
  if (streaming) requireValue(Number.isSafeInteger(finite.referenceBatchSize) && finite.referenceBatchSize > 0,
    'reference batch size is invalid');
  else requireValue(!Object.hasOwn(finite, 'referenceBatchSize')
    && finite.samples.every(sample => !Object.hasOwn(sample, 'referenceRetention')),
  'historical execution cannot declare streaming retention');
  const flattened = [];
  for (const inspection of inspections) {
    const local = inspection.nativeFrameQc;
    for (const key of ['inputManifest', 'baselinePlan', 'autoPresentation', 'orchestrationInput', 'renderRange', 'sceneBindings']) {
      requireValue(same(local[key], finite[key]), 'caption and global finite-state evidence differ: ' + key);
    }
    requireValue(Array.isArray(local.samples) && local.samples.length > 0
      && local.samples.every(sample => sample.instructionId === inspection.instructionId),
    'a finite-state observation is labeled as another caption');
    flattened.push(...local.samples);
  }
  requireValue(finite.samples.length === flattened.length
    && finite.samples.every((sample, index) => same(sample, flattened[index])),
  'global finite-state observations differ from the inspected captions');
  const inputByRole = new Map(finite.inputManifest.inputRefs.map(ref => [ref.role, ref]));
  const base = inputByRole.get('base-media'), completed = inputByRole.get('completed-media');
  const ffmpeg = inputByRole.get('tool-ffmpeg'), magick = inputByRole.get('tool-imagemagick');
  const expectedArtifacts = [], outputPaths = new Set(), inputPaths = new Set(
    finite.inputManifest.inputRefs.map(ref => ref.path));
  const expectArtifact = ref => {
    requireValue(typeof ref?.path === 'string' && path.isAbsolute(ref.path)
      && HASH.test(ref.fileSha256) && !outputPaths.has(ref.path) && !inputPaths.has(ref.path),
    'a finite-state output is missing, duplicated, or aliases a fixed input');
    outputPaths.add(ref.path);
    expectedArtifacts.push({path: ref.path, fileSha256: ref.fileSha256});
  };
  let cursor = 0;
  const expectProcess = (purpose, command, args, stdoutSha256) => {
    const process = finite.processes[cursor++];
    requireValue(process?.purpose === purpose && process.command === command
      && same(process.args, args) && process.argumentsCanonicalSha256 === canonicalDigest(args)
      && process.code === 0 && process.signal === null && !process.failed
      && HASH.test(process.stdoutSha256) && HASH.test(process.stderrSha256)
      && (stdoutSha256 === undefined || process.stdoutSha256 === stdoutSha256),
    'finite-state process does not bind its input and output: ' + purpose);
  };
  const tools = [{name: 'ffmpeg', ref: ffmpeg}, {name: 'imageMagick', ref: magick}];
  requireValue(finite.executableVersions && same(Object.keys(finite.executableVersions).sort(),
    ['ffmpeg', 'imageMagick'].sort()), 'finite-state tool versions are incomplete');
  const versionNames = new Set();
  for (let index = 0; index < tools.length; index++) {
    const process = finite.processes[cursor];
    const matching = tools.filter(tool => process?.command === tool.ref.path);
    requireValue(matching.length === 1 && !versionNames.has(matching[0].name),
      'finite-state tool version observation is duplicated or unknown');
    const tool = matching[0], version = finite.executableVersions[tool.name];
    requireValue(typeof version === 'string' && version.length > 0, 'finite-state tool version is missing');
    versionNames.add(tool.name);
    expectProcess('tool-version', tool.ref.path, ['-version'], digest(Buffer.from(version, 'utf8')));
  }
  const emptyStdoutSha256 = digest(Buffer.alloc(0));
  const extraction = buildPresentationNativeFrameBatchPlanV001({
    samples: finite.samples, directory: finite.frameExtraction?.directory});
  requireValue(same(extraction, finite.frameExtraction), 'selected frame extraction plan differs');
  const layers = buildPresentationNativeLayerPlanV001({samples: finite.samples,
    sceneBindings: finite.sceneBindings, directory: finite.nativeLayers?.directory, canvas});
  requireValue(same(layers, finite.nativeLayers), 'prepared native layers differ from the complete finite inputs');
  requireValue(typeof finite.referenceDirectory === 'string' && path.isAbsolute(finite.referenceDirectory),
    'reference output directory is invalid');
  if (extraction.frames.length > 0) {
    const frames = extraction.frames.map(row => row.mediaFrame);
    expectProcess('source-frames-extract', ffmpeg.path,
      buildPresentationNativeFrameBatchExtractionArgumentsV001(base.path, frames, extraction.baseOutputPattern), emptyStdoutSha256);
    expectProcess('completed-frames-extract', ffmpeg.path,
      buildPresentationNativeFrameBatchExtractionArgumentsV001(completed.path, frames, extraction.completedOutputPattern), emptyStdoutSha256);
  }
  const frameObservations = new Map();
  for (const frame of extraction.frames) {
    const samples = finite.samples.filter(sample => sample.frame === frame.frame);
    requireValue(samples.length > 0 && samples.every(sample => (sample.mediaFrame ?? sample.frame) === frame.mediaFrame
      && sample.baseFrame?.path === frame.basePath && sample.completedFrame?.path === frame.completedPath
      && same(sample.baseFrame, samples[0].baseFrame) && same(sample.completedFrame, samples[0].completedFrame)),
    'shared sample frame points to another frame or extracted image');
    expectArtifact(samples[0].baseFrame); expectArtifact(samples[0].completedFrame);
    frameObservations.set(frame.frame, samples[0]);
  }
  const generatedByPath = new Map(finite.outputArtifacts.map(ref => [ref.path, ref]));
  const layerGroups = new Map();
  for (const layer of layers.layers.filter(row => row.generated)) {
    if (!layerGroups.has(layer.sourceSha256)) layerGroups.set(layer.sourceSha256, []);
    layerGroups.get(layer.sourceSha256).push(layer);
  }
  for (const group of layerGroups.values()) {
    expectProcess('native-layer-prepare', ffmpeg.path, buildPresentationNativeLayerArgumentsV001(group), emptyStdoutSha256);
    for (const layer of group) expectArtifact(generatedByPath.get(layer.outputPath));
  }
  const decodeGroups = new Map();
  for (const layer of layers.layers) {
    if (!decodeGroups.has(layer.sourceSha256)) decodeGroups.set(layer.sourceSha256, []);
    decodeGroups.get(layer.sourceSha256).push(layer);
  }
  for (const group of decodeGroups.values()) {
    expectProcess('native-layer-decode', ffmpeg.path,
      buildPresentationNativeLayerDecodeArgumentsV001(group), emptyStdoutSha256);
    for (const layer of group) expectArtifact(generatedByPath.get(layer.decodedPath));
  }
  if (Object.hasOwn(finite, 'preparationReuse')) {
    const reuse = finite.preparationReuse;
    requireValue(streaming && exactKeys(reuse, ['schemaVersion', 'sourceEvidence', 'sourceExecutionMethod', 'reusedProcessCount'])
      && reuse.schemaVersion === 'saved-native-preparation-reuse-v001'
      && reuse.sourceExecutionMethod === PRESENTATION_NATIVE_FRAME_EXECUTION_V001
      && Number.isSafeInteger(reuse.reusedProcessCount) && reuse.reusedProcessCount === cursor
      && exactKeys(reuse.sourceEvidence, ['path', 'fileSha256'])
      && typeof reuse.sourceEvidence.path === 'string' && path.isAbsolute(reuse.sourceEvidence.path)
      && HASH.test(reuse.sourceEvidence.fileSha256),
    'saved preparation reuse is not bound to the complete historical preparation prefix');
    // This source is a retained historical evidence artifact, never a newly
    // generated output. The asynchronous caller verifies its file SHA, prefix
    // records, prepared files and input bindings against the saved source.
    requireValue(!outputPaths.has(reuse.sourceEvidence.path), 'preparation source aliases a generated output');
  }
  const references = new Map();
  for (const [sampleIndex, sample] of finite.samples.entries()) {
    requireValue(frameObservations.has(sample.frame), 'a finite sample frame was not extracted');
    const crop = sample.crop;
    const cropArgs = [sample.completedFrame.path, '-crop',
      crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
      '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'];
    requireValue(sample.completedRgb.fileSha256 === sample.completedRgbSha256,
      'saved completed RGB hash differs');
    expectProcess('completed-rgb-crop', magick.path, cropArgs, sample.completedRgbSha256);
    expectArtifact(sample.completedRgb);
    const sampleDirectory = streaming ? path.join(finite.referenceDirectory, 'sample-' + sampleIndex) : null;
    if (streaming) requireValue(sample.completedRgb.path === path.join(sampleDirectory, 'completed.rgb'),
      'completed RGB is outside its sample directory');
    const executions = buildPresentationNativeReferenceExecutionV001({sample,
      sceneBindings: finite.sceneBindings, nativeLayers: layers,
      directory: streaming ? path.join(sampleDirectory, 'references') : finite.referenceDirectory});
    const sampleReferences = streaming ? new Map() : references;
    const fresh = [...new Map(executions.filter(row => !sampleReferences.has(row.key)).map(row => [row.key, row])).values()];
    if (fresh.length > 0) {
      const batchSize = streaming ? finite.referenceBatchSize : fresh.length;
      for (let offset = 0; offset < fresh.length; offset += batchSize) {
        const batch = fresh.slice(offset, offset + batchSize);
        expectProcess('native-reference-composite', ffmpeg.path,
          buildPresentationNativeReferenceArgumentsV001({sample: {...sample, references: batch.map(row => row.reference)},
            sceneBindings: finite.sceneBindings, baseFramePath: sample.baseFrame.path,
            nativeLayers: layers, outputPaths: batch.map(row => row.path)}), emptyStdoutSha256);
      }
      for (const row of fresh) {
        const ref = {path: row.path, fileSha256: row.reference.rgbSha256};
        sampleReferences.set(row.key, ref);
        if (!streaming) expectArtifact(ref);
      }
    }
    for (const row of executions) requireValue(row.reference.rgbPath === row.path
      && row.reference.rgbSha256 === sampleReferences.get(row.key).fileSha256,
    'a shared reference is not bound to the same complete composition');
    if (streaming) {
      const retention = sample.referenceRetention;
      requireValue(exactKeys(retention, ['schemaVersion', 'state', 'checkpoint', 'artifacts'])
        && retention.schemaVersion === RETENTION_SCHEMA
        && ['retained', 'released-verified-pass'].includes(retention.state),
      'sample retention state is missing, unknown or incomplete');
      requireValue(exactKeys(retention.checkpoint, ['path', 'fileSha256'])
        && retention.checkpoint.path === path.join(sampleDirectory, 'sample-proof.json'),
      'sample retention checkpoint path differs');
      expectArtifact(retention.checkpoint);
      const bytes = crop.width * crop.height * 3;
      const artifacts = fresh.map(row => ({path: row.path, fileSha256: row.reference.rgbSha256, bytes}));
      requireValue(Number.isSafeInteger(bytes) && bytes > 0 && same(retention.artifacts, artifacts),
        'sample retention artifacts differ from every complete reference');
      if (retention.state === 'retained') {
        for (const ref of retention.artifacts) expectArtifact(ref);
      } else {
        const expected = sample.references.find(row => row.id === 'expected');
        const omitted = sample.references.find(row => row.id === 'omitted');
        const wanted = sample.classes?.find(row => row.id === expected?.classId);
        requireValue(sample.visible === true && wanted && omitted
          && sample.expectedClassId === expected.classId && sample.omittedClassId === omitted.classId
          && expected.classId !== omitted.classId
          && sample.classes.every(row => row.id === wanted.id || wanted.absoluteRgbDifference < row.absoluteRgbDifference),
        'only a verified unique-minimum passing sample may release reference images');
      }
    }
  }
  requireValue(cursor === finite.processes.length, 'finite-state execution contains missing or extra processes');
  requireValue(same(finite.outputArtifacts, expectedArtifacts),
    'finite-state output artifacts differ from the complete extraction and comparison chain');
}

function checkSharedInputs(exact, finite) {
  const exactRefs = exact.inputManifest.refs;
  const finiteRefs = finite.inputManifest.inputRefs;
  for (const [exactRole, finiteRole] of [['base-media', 'base-media'],
    ['completed-media', 'completed-media'], ['tool:ffmpeg', 'tool-ffmpeg']]) {
    const a = exactRefs.filter(ref => ref.role === exactRole);
    const b = finiteRefs.filter(ref => ref.role === finiteRole);
    requireValue(a.length === 1 && b.length === 1
      && a[0].path === b[0].path && a[0].fileSha256 === b[0].fileSha256,
    'whole-video replay and finite-state discrimination used different inputs: ' + exactRole);
  }
  requireValue(Array.isArray(finite.sceneBindings) && finite.sceneBindings.length === exact.recordBindings.length,
    'the two gates do not cover the same logical overlays');
  for (const [index, group] of exact.recordBindings.entries()) {
    const observed = finite.sceneBindings[index];
    requireValue(observed.instructionId === group.instructionId
      && observed.elementCanonicalSha256 === group.elementCanonicalSha256
      && Array.isArray(observed.states) && observed.states.length === group.states.length,
    'the two gates do not bind the same overlay order and native states');
    for (const [stateIndex, state] of group.states.entries()) {
      const other = observed.states[stateIndex];
      requireValue(other.state === state.state && other.elementCanonicalSha256 === state.elementCanonicalSha256
        && other.pngPath === state.pngPath && other.pngSha256 === state.pngSha256,
      'the two gates do not bind the same actual native PNG');
    }
  }
}

/** Both gates are re-evaluated from evidence; neither saved pass flag can rescue the other. */
export function validatePresentationIntegrityStateQcEvidenceV001({
  plan, overlayInspections, evidence, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange = null,
}) {
  const violations = [];
  try {
    requireValue(evidence?.schemaVersion === PRESENTATION_INTEGRITY_STATE_QC_SCHEMA_V001
      && evidence.method === PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
    'combined completed-frame evidence is missing or has another method');
    const replay = validatePresentationExactReplayQcEvidenceV001({
      plan, evidence: evidence.exactReplay, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange,
    });
    violations.push(...replay.violations);
    validatePresentationNativeFrameQcScopeV001({plan, evidence: evidence.finiteState, renderRange});
    checkSharedInputs(evidence.exactReplay, evidence.finiteState);
    requireValue(Array.isArray(overlayInspections) && overlayInspections.length === plan.elements.length,
      'finite-state evidence must cover all logical overlays exactly once');
    const finite = validatePresentationNativeFrameQcInspectionsV001({plan,
      inspections: overlayInspections.map(inspection => ({...inspection,
        visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001})), renderRange});
    for (const [index, inspection] of overlayInspections.entries()) {
      requireValue(inspection?.instructionId === plan.elements[index].instructionId
        && inspection.visibilityComparisonBasis === PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001,
      'combined inspection identity or comparison basis differs');
      violations.push(...finite.results[index].violations);
      checkSharedInputs(evidence.exactReplay, inspection.nativeFrameQc);
    }
    checkFiniteExecutionEvidence(evidence.finiteState, overlayInspections, plan.canvas);
  } catch (error) {
    violations.push({code: 'INTEGRITY_STATE_QC_INVALID', reason: error.message});
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/** Store full replay evidence once for the whole video, not once per caption. */
export function combinePresentationIntegrityStateQcV001({
  plan, replay, finite, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange = null,
}) {
  // Clone one complete graph so its shared common inputs and sample objects
  // remain shared in the detached result, including across local/global proof.
  const snapshot = structuredClone({inspections: finite.inspections, finite: finite.evidence, replay: replay.evidence});
  const inspections = snapshot.inspections.map(inspection => ({...inspection,
    visibilityComparisonBasis: PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001}));
  const evidence = {schemaVersion: PRESENTATION_INTEGRITY_STATE_QC_SCHEMA_V001,
    method: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, exactReplay: snapshot.replay,
    finiteState: snapshot.finite};
  return {method: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, inspections, evidence,
    ...validatePresentationIntegrityStateQcEvidenceV001({plan, overlayInspections: inspections,
      evidence, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange})};
}

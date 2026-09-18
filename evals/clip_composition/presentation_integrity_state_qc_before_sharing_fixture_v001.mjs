import {createHash} from 'node:crypto';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationExactReplayQcEvidenceV001} from './presentation_exact_replay_qc_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
  buildPresentationNativeFrameExtractionArgumentsV001,
  buildPresentationNativeReferenceArgumentsV001,
  validatePresentationNativeFrameQcScopeV001, validatePresentationNativeFrameQcEvidenceV001} from './presentation_native_frame_qc_before_sharing_fixture_v001.mjs';

export const PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001 = 'exact-replay-native-v1';
export const PRESENTATION_INTEGRITY_STATE_QC_SCHEMA_V001 = 'presentation-integrity-state-qc-v001';
export const PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001 = 'exact-replay-and-native-finite-state-v001';

const requireValue = (condition, reason) => {if (!condition) throw new TypeError(reason);};
const HASH = /^[a-f0-9]{64}$/u;
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalDigest = value => digest(canonicalJson(value));

export function checkFiniteExecutionEvidence(finite, inspections) {
  requireValue(finite?.schemaVersion === PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001
    && Array.isArray(finite.samples) && Array.isArray(finite.processes)
    && Array.isArray(finite.outputArtifacts), 'complete finite-state execution evidence is missing');
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
  requireValue(same(finite.samples, flattened), 'global finite-state observations differ from the inspected captions');
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
  const frames = new Map(), emptyStdoutSha256 = digest(Buffer.alloc(0));
  for (const sample of finite.samples) {
    const previous = frames.get(sample.frame);
    if (previous) {
      requireValue(same(sample.baseFrame, previous.baseFrame)
        && same(sample.completedFrame, previous.completedFrame),
      'shared sample frame points to different extracted images');
    } else {
      expectProcess('source-frame-extract', ffmpeg.path,
        buildPresentationNativeFrameExtractionArgumentsV001(base.path, sample.mediaFrame ?? sample.frame, sample.baseFrame.path), emptyStdoutSha256);
      expectProcess('completed-frame-extract', ffmpeg.path,
        buildPresentationNativeFrameExtractionArgumentsV001(completed.path, sample.mediaFrame ?? sample.frame, sample.completedFrame.path), emptyStdoutSha256);
      expectArtifact(sample.baseFrame); expectArtifact(sample.completedFrame);
      frames.set(sample.frame, {baseFrame: sample.baseFrame, completedFrame: sample.completedFrame});
    }
    const crop = sample.crop;
    const cropArgs = [sample.completedFrame.path, '-crop',
      crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
      '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'];
    requireValue(sample.completedRgb.fileSha256 === sample.completedRgbSha256,
      'saved completed RGB hash differs');
    expectProcess('completed-rgb-crop', magick.path, cropArgs, sample.completedRgbSha256);
    expectArtifact(sample.completedRgb);
    const referencePaths = sample.references.map(reference => reference.rgbPath);
    expectProcess('native-reference-composite', ffmpeg.path,
      buildPresentationNativeReferenceArgumentsV001({sample, sceneBindings: finite.sceneBindings,
        baseFramePath: sample.baseFrame.path, outputPaths: referencePaths}), emptyStdoutSha256);
    for (const reference of sample.references) expectArtifact({path: reference.rgbPath, fileSha256: reference.rgbSha256});
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
    for (const [index, inspection] of overlayInspections.entries()) {
      requireValue(inspection?.instructionId === plan.elements[index].instructionId
        && inspection.visibilityComparisonBasis === PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001,
      'combined inspection identity or comparison basis differs');
      const finite = validatePresentationNativeFrameQcEvidenceV001({plan,
        inspection: {...inspection, visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001}, renderRange});
      violations.push(...finite.violations);
      checkSharedInputs(evidence.exactReplay, inspection.nativeFrameQc);
    }
    checkFiniteExecutionEvidence(evidence.finiteState, overlayInspections);
  } catch (error) {
    violations.push({code: 'INTEGRITY_STATE_QC_INVALID', reason: error.message});
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/** Store full replay evidence once for the whole video, not once per caption. */
export function combinePresentationIntegrityStateQcV001({
  plan, replay, finite, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange = null,
}) {
  const inspections = finite.inspections.map(inspection => ({...structuredClone(inspection),
    visibilityComparisonBasis: PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001}));
  const evidence = {schemaVersion: PRESENTATION_INTEGRITY_STATE_QC_SCHEMA_V001,
    method: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, exactReplay: structuredClone(replay.evidence),
    finiteState: structuredClone(finite.evidence)};
  return {method: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, inspections, evidence,
    ...validatePresentationIntegrityStateQcEvidenceV001({plan, overlayInspections: inspections,
      evidence, expectedFrameCount, currentCompletedMediaRef, mediaInspection, renderRange})};
}

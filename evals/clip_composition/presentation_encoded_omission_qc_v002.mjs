import {createHash} from 'node:crypto';
import {access, lstat, mkdir, mkdtemp, readFile, realpath, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {presentationPulseAlphaUnionV001, inspectPresentationPulseCompletedFramesV001}
  from './presentation_pulse_renderer_qc_v001.mjs';
// ESM live bindings are only used inside functions, after renderer initialization.
import {buildPresentationCompositeArgumentsV001, buildPresentationFrameExtractionArgumentsV001,
  renderPresentationCounterfactualEncodedFrameV001, runPresentationRendererChildProcessV001}
  from './render_presentation_v002.mjs';

export const PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002 = 'encoded-omission-v2';
export const PRESENTATION_ENCODED_OMISSION_QC_SCHEMA_V002 = 'presentation-encoded-omission-qc-v002';
export const PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002 =
  'same-composite-with-logical-instruction-omitted-v002';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => sha(canonicalJson(value));
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const absolute = value => typeof value === 'string' && path.isAbsolute(value);
const equal = (left, right) => canonicalJson(left) === canonicalJson(right);
const requireValue = (condition, reason) => { if (!condition) throw new TypeError(reason); };
const violation = (code, instructionId, reason) => ({code, instructionId, reason});
const physicalFields = record => ({
  element: clone(record.element), props: clone(record.props), fileStem: record.fileStem,
  pngPath: record.pngPath, pngSha256: record.pngSha256,
  inspection: {
    instructionId: record.inspection.instructionId,
    overlaySha256: record.inspection.overlaySha256,
    appliedOverlayPropsCanonicalSha256: record.inspection.appliedOverlayPropsCanonicalSha256,
    alphaBounds: clone(record.inspection.alphaBounds),
  },
});
const physicalSnapshot = record => ({...physicalFields(record),
  ...(record.pulseStates === undefined ? {} : {
    pulseStates: record.pulseStates.map(state => ({...physicalFields(state), state: state.state})),
  }),
});

function checkedBounds(bounds, canvas) {
  requireValue(object(bounds) && ['left', 'top', 'right', 'bottom'].every(key => integer(bounds[key]))
    && bounds.right > bounds.left && bounds.bottom > bounds.top
    && bounds.right <= canvas.width && bounds.bottom <= canvas.height, 'native alpha bounds are invalid');
  return {left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
    width: bounds.right - bounds.left, height: bounds.bottom - bounds.top};
}

function checkedPhysical(record, canvas) {
  requireValue(object(record) && object(record.element) && object(record.props) && object(record.inspection)
    && absolute(record.pngPath) && hash(record.pngSha256), 'physical overlay record is incomplete');
  requireValue(typeof record.fileStem === 'string' && record.fileStem.length > 0
    && path.basename(record.fileStem) === record.fileStem && !['.', '..'].includes(record.fileStem),
  'overlay file stem must be a single filename');
  requireValue(record.inspection.instructionId === record.element.instructionId
    && record.inspection.overlaySha256 === record.pngSha256
    && record.inspection.appliedOverlayPropsCanonicalSha256 === hashJson(record.props),
  'physical overlay inspection does not bind its instruction, PNG and drawing properties');
  return checkedBounds(record.inspection.alphaBounds, canvas);
}

function checkedRecords({plan, records, expectedFrameCount}) {
  requireValue(object(plan) && object(plan.canvas) && Array.isArray(plan.elements)
    && ['width', 'height', 'fps'].every(key => integer(plan.canvas[key]) && plan.canvas[key] > 0)
    && integer(expectedFrameCount) && expectedFrameCount > 0, 'plan canvas and frame count are required');
  const ids = plan.elements.map(element => element?.instructionId);
  requireValue(ids.every(id => typeof id === 'string' && id.length > 0)
    && new Set(ids).size === ids.length, 'plan instruction IDs must be unique');
  const captions = plan.elements;
  requireValue(Array.isArray(records) && records.length === captions.length,
    'every logical overlay must have exactly one physical record');
  const recordIds = records.map(record => record?.element?.instructionId);
  requireValue(new Set(recordIds).size === recordIds.length, 'logical overlay record IDs must be unique');
  return records.map((record, index) => {
    const element = captions[index];
    requireValue(equal(record?.element, element), 'physical records must match all plan overlays in order');
    requireValue(integer(element.startFrame) && integer(element.endFrameExclusive)
      && element.endFrameExclusive <= expectedFrameCount
      && element.displayFrameCount === element.endFrameExclusive - element.startFrame
      && element.displayFrameCount > 0, 'caption display interval does not match the plan');
    const staticBounds = checkedPhysical(record, plan.canvas);
    let representativeFrame = element.startFrame + Math.floor(element.displayFrameCount / 2);
    let bounds = staticBounds;
    if (Object.hasOwn(element, 'presentationPulse')) {
      const expectedStates = buildPresentationPulseStateElementsV001({element, canvas: plan.canvas});
      requireValue(Array.isArray(record.pulseStates) && record.pulseStates.length === expectedStates.length,
        'Pulse requires every native state');
      record.pulseStates.forEach((state, stateIndex) => {
        requireValue(state.state === expectedStates[stateIndex].state
          && equal(state.element, expectedStates[stateIndex].element), 'Pulse state is not bound to the plan');
        checkedPhysical(state, plan.canvas);
      });
      bounds = checkedBounds(presentationPulseAlphaUnionV001(record.pulseStates), plan.canvas);
      representativeFrame = getPresentationPulseProgramV001({element, canvas: plan.canvas}).maximumFrame;
    } else requireValue(record.pulseStates === undefined, 'static captions cannot carry Pulse states');
    return {instructionId: element.instructionId, representativeFrame, bounds};
  });
}

/** Remove one logical caption, including every Pulse state, without altering any survivor. */
export function buildPresentationEncodedOmissionArgumentsV002({
  plan, records, instructionId, baseMediaPath, expectedFrameCount,
  serializePngAndFilters = false, presentationTimeline = null, timelineAudio = null,
}) {
  const recipes = checkedRecords({plan, records, expectedFrameCount});
  requireValue(absolute(baseMediaPath), 'base media path must be absolute');
  const index = records.findIndex(record => record.element.instructionId === instructionId);
  requireValue(index >= 0, 'the omitted instruction must exist exactly once');
  const retained = records.filter((_record, recordIndex) => recordIndex !== index);
  return {
    ...recipes[index],
    omittedInstructionId: instructionId,
    retainedInstructionIds: retained.map(record => record.element.instructionId),
    planCanonicalSha256: hashJson(plan),
    recordsCanonicalSha256: hashJson(records.map(physicalSnapshot)),
    compositeArguments: buildPresentationCompositeArgumentsV001({
      baseMediaPath, plan, overlayRecords: retained, expectedFrameCount,
      serializePngAndFilters, presentationTimeline, timelineAudio,
    }),
  };
}

const inputFor = (recipe, context, outputPath) => ({
  instructionId: recipe.instructionId, ffmpegPath: context.ffmpegPath,
  compositeArguments: recipe.compositeArguments, representativeFrame: recipe.representativeFrame,
  expectedFrameCount: context.expectedFrameCount, outputPath,
});
const comparisonArguments = (completedPath, omittedPath, bounds) => {
  const geometry = bounds.width + 'x' + bounds.height + '+' + bounds.left + '+' + bounds.top;
  return ['compare', '-metric', 'AE', '(', completedPath, '-crop', geometry, '+repage', ')',
    '(', omittedPath, '-crop', geometry, '+repage', ')', 'null:'];
};
const pipelineArguments = input => ({
  encoder: [...input.compositeArguments, '-progress', 'pipe:2',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'],
  decoder: ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0',
    '-vf', 'select=eq(n\\,' + input.representativeFrame + ')', '-frames:v', '1', input.outputPath],
});
const isFileRef = ref => object(ref) && absolute(ref.path) && hash(ref.fileSha256)
  && integer(ref.bytes) && ref.bytes > 0;
const manifestContains = (manifest, role, filePath, fileSha256) => manifest.before.some(ref =>
  ref.role === role && ref.path === filePath && ref.fileSha256 === fileSha256);
const artifactContains = (artifacts, ref) => isFileRef(ref) && artifacts.before.some(item =>
  item.path === ref.path && item.fileSha256 === ref.fileSha256 && item.bytes === ref.bytes);

function validateManifest(manifest) {
  requireValue(object(manifest) && Array.isArray(manifest.before) && manifest.before.length > 0
    && equal(manifest.before, manifest.after)
    && manifest.inputRefsCanonicalSha256 === hashJson(manifest.before),
  'input manifest changed or is incomplete');
  const roles = new Set();
  for (const ref of manifest.before) {
    requireValue(isFileRef(ref) && absolute(ref.realPath) && typeof ref.role === 'string'
      && !roles.has(ref.role), 'input manifest contains an invalid or duplicate reference');
    roles.add(ref.role);
  }
}

function pulseIsValid(record, plan, frames) {
  const program = getPresentationPulseProgramV001({element: record.element, canvas: plan.canvas});
  const expected = [{frame: program.normalBeforeFrame, state: 'normal'},
    {frame: program.maximumFrame, state: 'maximum'}, {frame: program.normalAfterFrame, state: 'normal'}];
  return Array.isArray(frames) && frames.length === expected.length && frames.every((frame, index) => {
    const target = expected[index], expectedState = record.pulseStates.find(state => state.state === target.state);
    const distances = frame?.stateDistances;
    if (frame?.frame !== target.frame || frame.expectedState !== target.state
      || frame.comparisonBasis !== 'same-source-frame-three-native-pulse-states'
      || frame.expectedOverlaySha256 !== expectedState.pngSha256
      || !equal(frame.alphaUnion, presentationPulseAlphaUnionV001(record.pulseStates))
      || !hash(frame.baseFrameSha256) || !hash(frame.outputFrameSha256)
      || !absolute(frame.baseFrameFile) || !absolute(frame.outputFrameFile)
      || !Array.isArray(distances) || distances.length !== record.pulseStates.length
      || distances.some((row, stateIndex) => row.state !== record.pulseStates[stateIndex].state
        || row.overlaySha256 !== record.pulseStates[stateIndex].pngSha256
        || !integer(row.absoluteRgbDifference) || !hash(row.referenceFrameSha256)
        || !absolute(row.referenceFrameFile))) return false;
    const wanted = distances.find(row => row.state === target.state).absoluteRgbDifference;
    return distances.every(row => row.state === target.state || wanted < row.absoluteRgbDifference);
  });
}

/** Rebuild the exact omission recipe; a success flag or a new basis string is never sufficient. */
export function validatePresentationEncodedOmissionQcEvidenceV002({plan, inspection}) {
  const violations = [], id = inspection?.instructionId ?? null;
  try {
    requireValue(inspection?.visibilityComparisonBasis === PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002,
      'logical omission basis is missing');
    const evidence = inspection.encodedOmissionQc;
    requireValue(object(evidence) && evidence.schemaVersion === PRESENTATION_ENCODED_OMISSION_QC_SCHEMA_V002
      && evidence.method === PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002, 'logical omission evidence is missing');
    const context = evidence.context;
    requireValue(object(context) && context.planCanonicalSha256 === hashJson(plan)
      && absolute(context.completedMediaPath) && absolute(context.ffmpegPath)
      && absolute(context.imageMagickPath), 'logical omission context is not bound to this plan');
    const recipe = buildPresentationEncodedOmissionArgumentsV002({...context, plan, instructionId: id});
    const sample = evidence.sample;
    requireValue(object(sample) && equal(sample.recipe, recipe), 'saved omission recipe differs from the bound plan');
    const record = context.records.find(row => row.element.instructionId === id);
    requireValue(inspection.appliedOverlayPropsCanonicalSha256 === hashJson(record.props)
      && inspection.overlaySha256 === record.pngSha256
      && equal(inspection.alphaBounds, record.inspection.alphaBounds)
      && inspection.representativeFrame === recipe.representativeFrame,
    'inspection does not identify the same physical overlay and sample');
    validateManifest(evidence.inputManifest);
    const manifest = evidence.inputManifest;
    for (const [role, filePath] of [['base-media', context.baseMediaPath],
      ['completed-media', context.completedMediaPath], ['ffmpeg-tool', context.ffmpegPath],
      ['image-magick-tool', context.imageMagickPath]]) {
      requireValue(manifest.before.some(ref => ref.role === role && ref.path === filePath),
        'an actual media or tool file is absent from the input manifest');
    }
    context.records.forEach((entry, index) => {
      requireValue(manifestContains(manifest, 'overlay-' + index, entry.pngPath, entry.pngSha256),
        'logical overlay PNG is absent from the input manifest');
      for (const [stateIndex, state] of (entry.pulseStates ?? []).entries()) {
        requireValue(manifestContains(manifest, 'overlay-' + index + '-state-' + stateIndex,
          state.pngPath, state.pngSha256), 'Pulse state PNG is absent from the input manifest');
      }
    });
    requireValue(isFileRef(evidence.contextFile)
      && evidence.contextFile.fileSha256 === sha(jsonBytes(context))
      && manifestContains(manifest, 'logical-inputs', evidence.contextFile.path, evidence.contextFile.fileSha256),
    'saved logical inputs do not bind the supplied context');
    const artifacts = evidence.outputArtifacts;
    requireValue(object(artifacts) && Array.isArray(artifacts.before)
      && equal(artifacts.before, artifacts.after)
      && artifacts.outputRefsCanonicalSha256 === hashJson(artifacts.before)
      && new Set(artifacts.before.map(ref => ref.path)).size === artifacts.before.length
      && artifacts.before.every(isFileRef), 'output artifact hashes changed or are incomplete');
    requireValue(artifactContains(artifacts, sample.completedFrame) && artifactContains(artifacts, sample.omittedFrame)
      && sample.completedFrame.path !== sample.omittedFrame.path, 'completed and omitted frame artifacts are missing');
    const input = inputFor(recipe, context, sample.omittedFrame.path);
    requireValue(equal(sample.counterfactualInput, input) && artifactContains(artifacts, sample.counterfactualInputFile)
      && sample.counterfactualInputFile.fileSha256 === sha(jsonBytes(input)),
    'saved counterfactual command is not the physical logical-record removal');
    const args = pipelineArguments(input), encoded = sample.encoded;
    requireValue(encoded?.status === 'completed' && encoded.instructionId === id
      && encoded.representativeFrame === recipe.representativeFrame
      && encoded.expectedFrameCount === context.expectedFrameCount
      && integer(encoded.encodedFrames) && encoded.encodedFrames > recipe.representativeFrame
      && encoded.encodedFrames <= context.expectedFrameCount
      && encoded.targetDecodedBeforeQuit === true
      && typeof encoded.quitRequestedAfterDecoderExit === 'boolean'
      && encoded.inputCanonicalSha256 === hashJson(input)
      && encoded.encoderArgumentsCanonicalSha256 === hashJson(args.encoder)
      && encoded.decoderArgumentsCanonicalSha256 === hashJson(args.decoder)
      && encoded.outputFileSha256 === sample.omittedFrame.fileSha256
      && [encoded.encoder, encoded.decoder].every(row => row?.code === 0 && row.signal === null
        && Array.isArray(row.errors) && row.errors.length === 0)
      && Array.isArray(encoded.pipeErrors) && encoded.pipeErrors.every(code => code === 'EPIPE'),
    'encoded-frame output does not bind the executed pipeline and requested frame');
    requireValue(equal(sample.pipelineArguments, args), 'saved pipeline arguments changed');
    const extraction = buildPresentationFrameExtractionArgumentsV001({
      inputPath: context.completedMediaPath, frame: recipe.representativeFrame,
      outputPath: sample.completedFrame.path, fps: plan.canvas.fps,
    });
    requireValue(equal(sample.completedExtractionArguments, extraction)
      && sample.completedExtractionArgumentsCanonicalSha256 === hashJson(extraction),
    'completed frame was not extracted from the same bound media and frame');
    const difference = sample.imageDifference;
    const compareArgs = comparisonArguments(sample.completedFrame.path, sample.omittedFrame.path, recipe.bounds);
    requireValue(difference?.command === context.imageMagickPath && equal(difference.args, compareArgs)
      && difference.argumentsCanonicalSha256 === hashJson(compareArgs)
      && [0, 1].includes(difference.code) && difference.signal === null
      && typeof difference.stderr === 'string' && difference.stderrSha256 === sha(difference.stderr),
    'bounded image difference does not bind its actual comparison command');
    const changed = sample.changedPixelsAgainstInstructionOmittedFrame;
    requireValue(Number.isFinite(changed) && changed >= 0 && changed <= recipe.bounds.width * recipe.bounds.height
      && changed === Number(difference.stderr.trim().split(/\s+/)[0])
      && inspection.changedPixelsAgainstInstructionOmittedFrame === changed,
    'saved bounded image difference is invalid');
    if (!(changed > 0)) violations.push(violation('OUTPUT_ELEMENT_NOT_VISIBLE', id,
      'the completed frame equals the same encoded composite with this logical caption removed'));
    if (record.pulseStates) {
      const frames = inspection.pulse?.completedFrames;
      requireValue(equal(sample.pulseCompletedFrames, frames), 'Pulse observations differ from the saved evidence');
      for (const frame of frames ?? []) {
        for (const ref of [{path: frame.baseFrameFile, fileSha256: frame.baseFrameSha256},
          {path: frame.outputFrameFile, fileSha256: frame.outputFrameSha256},
          ...(frame.stateDistances ?? []).map(row => ({path: row.referenceFrameFile,
            fileSha256: row.referenceFrameSha256}))]) {
          requireValue(artifacts.before.some(item => item.path === ref.path && item.fileSha256 === ref.fileSha256),
            'Pulse observation artifact is absent');
        }
      }
      if (!pulseIsValid(record, plan, frames)) violations.push(violation('PULSE_FRAME_STATE_MISMATCH', id,
        'the three bound Pulse observations do not identify the intended states'));
    } else requireValue(sample.pulseCompletedFrames === undefined, 'static captions cannot carry Pulse observations');
  } catch (error) {
    violations.push(violation('ENCODED_OMISSION_QC_INVALID', id, error.message));
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

async function fileRef(role, filePath) {
  const resolved = await realpath(filePath), stat = await lstat(resolved);
  requireValue(stat.isFile() && stat.size > 0, 'proof input must be a nonempty regular file: ' + filePath);
  const bytes = await readFile(resolved);
  return {role, path: filePath, realPath: resolved, fileSha256: sha(bytes), bytes: bytes.length};
}
async function executable(program) {
  requireValue(typeof program === 'string' && program.length > 0, 'tool path is required');
  const candidates = absolute(program) ? [program]
    : (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map(directory => path.resolve(directory, program));
  for (const candidate of candidates) {
    try { await access(candidate, constants.X_OK); return await realpath(candidate); } catch {}
  }
  throw new TypeError('executable is unavailable: ' + program);
}
async function unused(filePath) {
  try { await lstat(filePath); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new TypeError('QC output already exists: ' + filePath);
}
const withoutRole = ({role: _role, ...ref}) => ref;
async function artifact(filePath) { return withoutRole(await fileRef('artifact', filePath)); }

/** Corrected encoded oracle. The old transparent-PNG oracle and every saved output remain untouched. */
export async function inspectPresentationEncodedOmissionQcV002({
  plan, records, baseMediaPath, completedMediaPath, expectedFrameCount, scratchDirectory,
  toolPaths, processObserver = null, serializePngAndFilters = false,
  presentationTimeline = null, timelineAudio = null,
}) {
  const started = performance.now();
  const originalCanonical = hashJson({plan, records, baseMediaPath, completedMediaPath, expectedFrameCount,
    serializePngAndFilters, presentationTimeline, timelineAudio});
  const snapshotPlan = clone(plan), snapshotRecords = clone(records);
  checkedRecords({plan: snapshotPlan, records: snapshotRecords, expectedFrameCount});
  requireValue(absolute(baseMediaPath) && absolute(completedMediaPath) && absolute(scratchDirectory),
    'media and scratch paths must be absolute');
  const ffmpegPath = await executable(toolPaths?.ffmpegPath ?? 'ffmpeg');
  const imageMagickPath = await executable(toolPaths?.imageMagickPath ?? 'magick');
  await mkdir(scratchDirectory, {recursive: true});
  const directory = await mkdtemp(path.join(scratchDirectory, 'encoded-omission-v002-'));
  const context = {planCanonicalSha256: hashJson(snapshotPlan), records: snapshotRecords.map(physicalSnapshot),
    baseMediaPath, completedMediaPath, expectedFrameCount, ffmpegPath, imageMagickPath,
    serializePngAndFilters, presentationTimeline: clone(presentationTimeline), timelineAudio: clone(timelineAudio)};
  const contextPath = path.join(directory, 'logical-inputs.json');
  await writeFile(contextPath, jsonBytes(context), {flag: 'wx'});
  const contextFile = await artifact(contextPath);
  const references = [{role: 'logical-inputs', path: contextPath},
    {role: 'base-media', path: baseMediaPath}, {role: 'completed-media', path: completedMediaPath},
    {role: 'ffmpeg-tool', path: ffmpegPath}, {role: 'image-magick-tool', path: imageMagickPath}];
  context.records.forEach((record, index) => {
    references.push({role: 'overlay-' + index, path: record.pngPath, expectedSha: record.pngSha256});
    for (const [stateIndex, state] of (record.pulseStates ?? []).entries()) {
      references.push({role: 'overlay-' + index + '-state-' + stateIndex,
        path: state.pngPath, expectedSha: state.pngSha256});
    }
  });
  const captureInputs = async () => {
    const result = [];
    for (const ref of references) {
      const actual = await fileRef(ref.role, ref.path);
      requireValue(ref.expectedSha === undefined || actual.fileSha256 === ref.expectedSha,
        'actual overlay bytes do not match their inspection: ' + ref.role);
      result.push(actual);
    }
    return result;
  };
  const before = await captureInputs();
  const inputManifest = {before, inputRefsCanonicalSha256: hashJson(before)};
  const processes = [], samples = [], outputPaths = [], inspections = [];
  const runProcess = async (command, args, options = {}) => {
    const processStarted = performance.now();
    const row = {command, args: [...args], argumentsCanonicalSha256: hashJson(args),
      purpose: options.observationLabel ?? 'qc-command'};
    processes.push(row);
    try {
      const result = await runPresentationRendererChildProcessV001(command, args, options);
      Object.assign(row, {code: result.code, signal: result.signal ?? null,
        stdoutSha256: sha(result.stdout), stderrSha256: sha(result.stderr)});
      return result;
    } catch (error) { row.error = error.message; throw error; }
    finally { row.wallClockMs = performance.now() - processStarted; }
  };
  const extractFrame = async (inputPath, frame, outputPath, fps, binary = ffmpegPath, observer = processObserver) => {
    await unused(outputPath);
    await runProcess(binary, buildPresentationFrameExtractionArgumentsV001({inputPath, frame, outputPath, fps}), {
      fatalInnerStage: 'post-render-qc', processObserver: observer, observationLabel: 'qc-frame-extract',
    });
    outputPaths.push(outputPath);
  };
  const perf = () => ({wallClockMs: performance.now() - started,
    observedCommandInvocations: processes.length, encodedPipelineInvocations: samples.length,
    childProcessStarts: null, childProcessStartMeasurement: 'requires external process-start measurement',
    encodedFramesReportedByPipeline: samples.map(sample => sample.encoded?.encodedFrames ?? null),
    frameCountMeaning: 'reported encoder progress and saved output frames; seek decoder work is not inferred'});
  let after;
  try {
    for (const [index, record] of snapshotRecords.entries()) {
      const captionDirectory = path.join(directory, 'caption-' + String(index + 1).padStart(3, '0'));
      await mkdir(captionDirectory);
      const recipe = buildPresentationEncodedOmissionArgumentsV002({
        ...context, plan: snapshotPlan, instructionId: record.element.instructionId,
      });
      const omittedPath = path.join(captionDirectory, 'omitted.png');
      const completedPath = path.join(captionDirectory, 'completed.png');
      const counterfactualInput = inputFor(recipe, context, omittedPath);
      const inputPath = path.join(captionDirectory, 'counterfactual-input.json');
      await writeFile(inputPath, jsonBytes(counterfactualInput), {flag: 'wx'});
      outputPaths.push(inputPath);
      await unused(omittedPath);
      const sample = {recipe, counterfactualInput, counterfactualInputFile: await artifact(inputPath),
        pipelineArguments: pipelineArguments(counterfactualInput)};
      samples.push(sample);
      const pipelineStarted = performance.now();
      sample.encoded = await renderPresentationCounterfactualEncodedFrameV001(counterfactualInput);
      sample.encodedPipelineWallClockMs = performance.now() - pipelineStarted;
      outputPaths.push(omittedPath);
      sample.omittedFrame = await artifact(omittedPath);
      requireValue(sample.encoded.status === 'completed'
        && sample.encoded.inputCanonicalSha256 === hashJson(counterfactualInput)
        && sample.encoded.outputFileSha256 === sample.omittedFrame.fileSha256,
      'encoded counterfactual evidence does not match its input and generated PNG');
      await extractFrame(completedMediaPath, recipe.representativeFrame, completedPath, snapshotPlan.canvas.fps);
      sample.completedFrame = await artifact(completedPath);
      sample.completedExtractionArguments = buildPresentationFrameExtractionArgumentsV001({
        inputPath: completedMediaPath, frame: recipe.representativeFrame, outputPath: completedPath,
        fps: snapshotPlan.canvas.fps});
      sample.completedExtractionArgumentsCanonicalSha256 = hashJson(sample.completedExtractionArguments);
      const compareArgs = comparisonArguments(completedPath, omittedPath, recipe.bounds);
      const difference = await runProcess(imageMagickPath, compareArgs, {
        allowedExitCodes: [0, 1], fatalInnerStage: 'post-render-qc',
        processObserver, observationLabel: 'qc-image-difference',
      });
      const changed = Number(difference.stderr.toString().trim().split(/\s+/)[0]);
      requireValue(Number.isFinite(changed), 'bounded image difference could not be parsed');
      sample.changedPixelsAgainstInstructionOmittedFrame = changed;
      sample.imageDifference = {command: imageMagickPath, args: compareArgs,
        argumentsCanonicalSha256: hashJson(compareArgs), code: difference.code, signal: difference.signal ?? null,
        stderr: difference.stderr.toString(), stderrSha256: sha(difference.stderr)};
      const inspection = clone(record.inspection);
      delete inspection.nativeFrameQc;
      delete inspection.encodedOmissionQc;
      Object.assign(inspection, {visibilityComparisonBasis: PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002,
        representativeFrame: recipe.representativeFrame, changedPixelsAgainstInstructionOmittedFrame: changed});
      if (record.pulseStates) {
        const frames = await inspectPresentationPulseCompletedFramesV001({
          record, canvas: snapshotPlan.canvas, baseMediaPath, completedMediaPath,
          scratchDirectory: captionDirectory, ffmpegPath, imageMagickPath,
          processObserver, runProcess, extractFrame,
        });
        for (const frame of frames) {
          outputPaths.push(...frame.stateDistances.map(row => row.referenceFrameFile));
        }
        sample.pulseCompletedFrames = frames;
        inspection.pulse = {...inspection.pulse, completedFrames: frames};
      }
      inspections.push(inspection);
    }
    after = await captureInputs();
    inputManifest.after = after;
    requireValue(equal(before, after), 'an input file changed during encoded omission QC');
    requireValue(originalCanonical === hashJson({plan, records, baseMediaPath, completedMediaPath,
      expectedFrameCount, serializePngAndFilters, presentationTimeline, timelineAudio}),
    'caller-owned logical inputs changed during encoded omission QC');
    const uniquePaths = [...new Set(outputPaths)];
    const artifactBefore = await Promise.all(uniquePaths.map(artifact));
    const artifactAfter = await Promise.all(uniquePaths.map(artifact));
    const outputArtifacts = {before: artifactBefore, after: artifactAfter,
      outputRefsCanonicalSha256: hashJson(artifactBefore)};
    const evidence = {schemaVersion: PRESENTATION_ENCODED_OMISSION_QC_SCHEMA_V002,
      method: PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002, context, contextFile, inputManifest,
      samples, processes, outputArtifacts};
    for (const [index, inspection] of inspections.entries()) {
      inspection.encodedOmissionQc = {
        schemaVersion: evidence.schemaVersion, method: evidence.method,
        context, contextFile, inputManifest, sample: samples[index], outputArtifacts,
      };
    }
    const violations = inspections.flatMap(inspection =>
      validatePresentationEncodedOmissionQcEvidenceV002({plan: snapshotPlan, inspection}).violations);
    const result = {method: PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002,
      status: violations.length === 0 ? 'passed' : 'failed', violations, inspections, evidence, performance: perf()};
    const evidencePath = path.join(directory, 'evidence.json');
    await writeFile(evidencePath, jsonBytes(result), {flag: 'wx'});
    result.evidenceFile = await artifact(evidencePath);
    return result;
  } catch (error) {
    try { after = await captureInputs(); } catch (captureError) { inputManifest.afterReadError = captureError.message; }
    if (after) inputManifest.after = after;
    const failure = {method: PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002, status: 'failed',
      error: error.message, context, contextFile, inputManifest, samples, processes, performance: perf()};
    error.encodedOmissionQcFailure = failure;
    await writeFile(path.join(directory, 'failure.json'), jsonBytes(failure), {flag: 'wx'});
    throw error;
  }
}

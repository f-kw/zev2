import {scopeOrchestrationPlanV001, assertOrchestrationScopedPlansV001} from './presentation_orchestration_render_scope_v001.mjs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {stat, mkdir, mkdtemp, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

// Evidence validation reuses the actual executed command builders.
export {
  frameExtractionArguments as buildPresentationNativeFrameBatchExtractionArgumentsV001,
  nativeReferenceArguments as buildPresentationNativeReferenceArgumentsV001,
};
import {buildPresentationNativeQcAlternativeElementsV001} from './presentation_native_frame_qc_preparation_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {getPresentationPulseProgramV001, buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001, buildPresentationCaptionMotionStateElementsV001}
  from './presentation_caption_motion_v001.mjs';

export const PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001 = 'presentation-native-frame-qc-v001';
export const PRESENTATION_NATIVE_FRAME_QC_BASIS_V001 = 'native-reference-state-identification-v001';
export const PRESENTATION_NATIVE_FRAME_EXECUTION_V001 = 'batched-frames-shared-planar-native-layers-v002';
const HASH = /^[a-f0-9]{64}$/u;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hashBytes = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hashBytes(canonicalJson(value));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const reject = message => { throw new TypeError('native frame QC: ' + message); };
const requireValue = (condition, message) => { if (!condition) reject(message); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.length > 0;
const clone = value => structuredClone(value);
const violation = (instructionId, reason, frame) => ({code: 'NATIVE_FRAME_QC_INVALID',
  instructionId, reason, ...(frame === undefined ? {} : {frame})});

function checkedBounds(value, canvas) {
  requireValue(object(value) && ['left', 'top', 'right', 'bottom', 'width', 'height']
    .every(key => integer(value[key])), 'native alpha bounds must be exact integers');
  requireValue(value.width > 0 && value.height > 0 && value.right - value.left === value.width
    && value.bottom - value.top === value.height && value.right <= canvas.width
    && value.bottom <= canvas.height, 'native alpha bounds do not fit the canvas');
  return clone(value);
}

function checkPlans(plan, baselinePlan, renderRange = null) {
  requireValue(object(plan) && object(baselinePlan) && object(plan.canvas)
    && integer(plan.canvas.width) && plan.canvas.width > 0
    && integer(plan.canvas.height) && plan.canvas.height > 0 && plan.canvas.fps === 30,
  'the native profile requires an integer canvas at the existing 30fps clock');
  requireValue(Array.isArray(plan.elements) && (renderRange !== null || plan.elements.length > 0)
    && Array.isArray(baselinePlan.elements) && baselinePlan.elements.length === plan.elements.length,
  'the fixed normal plan must cover the complete resolved plan');
  const {elements: _resolvedElements, ...resolvedHeader} = plan;
  const {elements: _normalElements, ...normalHeader} = baselinePlan;
  requireValue(same(resolvedHeader, normalHeader), 'resolved and normal plan headers differ');
  const ids = new Set();
  for (const [index, element] of plan.elements.entries()) {
    const normal = baselinePlan.elements[index];
    requireValue(object(element) && nonempty(element.instructionId) && !ids.has(element.instructionId)
      && element.kind === 'speech-caption' && element.visualState?.position?.preset === 'bottom-center'
      && normal?.instructionId === element.instructionId && normal.kind === element.kind
      && normal.visualState?.position?.preset === 'bottom-center',
    'the native profile requires ordered, unique bottom-center speech captions');
    requireValue(integer(element.startFrame) && integer(element.endFrameExclusive)
      && integer(element.displayFrameCount) && element.displayFrameCount > 0
      && element.endFrameExclusive - element.startFrame === element.displayFrameCount,
    'caption display frames are invalid');
    requireValue(!['presentationColorRange', 'presentationPulse', 'presentationPreset', 'presentationMotion']
      .some(key => Object.hasOwn(normal, key)), 'the baseline is not the fixed normal plan');
    ids.add(element.instructionId);
  }
}

function finiteSpecifications(plan, baselinePlan, autoPresentation, orchestrationDrawingView, renderRange = null) {
  const rebuilt = buildPresentationNativeQcAlternativeElementsV001({
    plan, baselinePlan, autoPresentation, presentationTimeline: null, orchestrationDrawingView, renderRange,
  });
  const byId = new Map(rebuilt.resolution.captions.map(row => [row.captionId, row.effectiveSelection]));
  const kinds = new Map([['Normal', 'normal'], ['Focus', 'color'], ['Vocal accent', 'scale'],
    ['Panel accent', 'panel'], ['Pulse accent', 'pulse'], ['Bounce accent', 'bounce'], ['Shake accent', 'shake']]);
  return rebuilt.alternatives.map(row => {
    const kind = kinds.get(byId.get(row.captionId)?.role);
    requireValue(kind !== undefined, 'automatic selection is outside the finite native profile');
    return {kind, alternates: row.entries};
  });
}

function bindNativeRecord(record, element, state, bindingId, canvas) {
  requireValue(object(record) && same(record.element, element) && object(record.props)
    && typeof record.pngPath === 'string' && path.isAbsolute(record.pngPath) && HASH.test(record.pngSha256),
  'a native PNG record is missing or does not match its element');
  requireValue(record.props.instructionId === element.instructionId && record.props.text === element.text
    && same(record.props.indexedLines, element.indexedLines)
    && same(record.props.visualState, element.visualState)
    && same(record.props.presentationColorRange ?? null, element.presentationColorRange ?? null)
    && record.props.inspectionLineIndex === null && record.props.canvas?.width === canvas.width
    && record.props.canvas?.height === canvas.height,
  'native drawing properties differ from the bound caption');
  requireValue(record.inspection?.overlaySha256 === record.pngSha256
    && record.inspection.appliedOverlayPropsCanonicalSha256 === hashJson(record.props),
  'native PNG and drawing-property inspection bindings differ');
  return {bindingId, instructionId: element.instructionId, state,
    pngPath: record.pngPath, pngSha256: record.pngSha256,
    propsCanonicalSha256: hashJson(record.props), elementCanonicalSha256: hashJson(element),
    alphaBounds: checkedBounds(record.inspection.alphaBounds, canvas)};
}

function bindRecords(plan, baselinePlan, autoPresentation, records, orchestrationDrawingView, renderRange = null) {
  checkPlans(plan, baselinePlan, renderRange);
  const specifications = finiteSpecifications(plan, baselinePlan, autoPresentation, orchestrationDrawingView, renderRange);
  requireValue(Array.isArray(records) && records.length === plan.elements.length,
    'native records must cover every caption');
  return records.map((record, index) => {
    const element = plan.elements[index];
    requireValue(same(record?.element, element), 'record order or resolved caption differs');
    const selected = specifications[index];
    const expectedStates = selected.kind === 'pulse'
      ? buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
      : ['bounce', 'shake'].includes(selected.kind)
        ? buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas})
        : [{state: 'static', element}];
    const motion = ['bounce', 'shake'].includes(selected.kind);
    const physical = selected.kind === 'pulse' ? record.pulseStates : motion ? record.motionStates : [record];
    requireValue(Array.isArray(physical) && physical.length === expectedStates.length
      && (selected.kind === 'pulse' || !Object.hasOwn(record, 'pulseStates'))
      && (motion || !Object.hasOwn(record, 'motionStates')),
    'native state coverage differs');
    const states = expectedStates.map((expected, stateIndex) => {
      if (selected.kind === 'pulse' || motion) requireValue(physical[stateIndex]?.state === expected.state,
        'native expression states are not in the fixed order');
      return bindNativeRecord(physical[stateIndex], expected.element, expected.state,
        'caption-' + index + '-native-' + expected.state, plan.canvas);
    });
    requireValue(Array.isArray(record.alternates) && record.alternates.length === selected.alternates.length,
      'required finite target alternates are missing or duplicated');
    const alternates = selected.alternates.map(expected => {
      const matches = record.alternates.filter(row => row?.kind === expected.kind);
      requireValue(matches.length === 1, 'required finite target alternate is missing or duplicated');
      return {...bindNativeRecord(matches[0], expected.element, expected.kind,
        'caption-' + index + '-alternate-' + expected.kind, plan.canvas), kind: expected.kind};
    });
    return {instructionId: element.instructionId, selectedKind: selected.kind,
      elementCanonicalSha256: hashJson(element), states, alternates};
  });
}

function checkSceneBindings(plan, baselinePlan, autoPresentation, sceneBindings, orchestrationDrawingView, renderRange = null) {
  checkPlans(plan, baselinePlan, renderRange);
  const specifications = finiteSpecifications(plan, baselinePlan, autoPresentation, orchestrationDrawingView, renderRange);
  requireValue(Array.isArray(sceneBindings) && sceneBindings.length === plan.elements.length,
    'scene bindings do not cover the plan');
  const bindingIds = new Set();
  for (const [index, element] of plan.elements.entries()) {
    const group = sceneBindings[index];
    const selected = specifications[index];
    const expectedStates = selected.kind === 'pulse'
      ? buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
      : ['bounce', 'shake'].includes(selected.kind)
        ? buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas})
        : [{state: 'static', element}];
    requireValue(group?.instructionId === element.instructionId && group.selectedKind === selected.kind
      && group.elementCanonicalSha256 === hashJson(element)
      && Array.isArray(group.states) && group.states.length === expectedStates.length
      && Array.isArray(group.alternates) && group.alternates.length === selected.alternates.length,
    'scene state or alternate coverage differs');
    const expected = [...expectedStates.map(row => ({...row, bindingId: 'caption-' + index + '-native-' + row.state})),
      ...selected.alternates.map(row => ({...row, state: row.kind,
        bindingId: 'caption-' + index + '-alternate-' + row.kind}))];
    const observed = [...group.states, ...group.alternates];
    for (const [rowIndex, wanted] of expected.entries()) {
      const row = observed[rowIndex];
      requireValue(row?.bindingId === wanted.bindingId && !bindingIds.has(row.bindingId)
        && row.instructionId === element.instructionId && row.state === wanted.state
        && row.elementCanonicalSha256 === hashJson(wanted.element)
        && typeof row.pngPath === 'string' && path.isAbsolute(row.pngPath)
        && HASH.test(row.pngSha256) && HASH.test(row.propsCanonicalSha256)
        && (wanted.kind === undefined || row.kind === wanted.kind), 'native scene binding differs');
      checkedBounds(row.alphaBounds, plan.canvas);
      bindingIds.add(row.bindingId);
    }
  }
}

function stateAt(element, group, frame, canvas) {
  if (!['pulse', 'bounce', 'shake'].includes(group.selectedKind)) return group.states[0];
  const program = group.selectedKind === 'pulse' ? getPresentationPulseProgramV001({element, canvas})
    : getPresentationCaptionMotionProgramV001({element, canvas});
  const segment = program.segments.find(row => row.startFrame <= frame && frame < row.endFrameExclusive);
  requireValue(segment !== undefined, 'active expression has no finite state at the sampled frame');
  return group.states.find(row => row.state === segment.state);
}

function unionBounds(bindings, canvas) {
  requireValue(bindings.length > 0, 'reference scene has no native bounds');
  const left = Math.min(...bindings.map(row => row.alphaBounds.left));
  const top = Math.min(...bindings.map(row => row.alphaBounds.top));
  const right = Math.max(...bindings.map(row => row.alphaBounds.right));
  const bottom = Math.max(...bindings.map(row => row.alphaBounds.bottom));
  // yuv420p shares chroma over 2x2 blocks. Include exactly those touched blocks.
  const x = Math.floor(left / 2) * 2;
  const y = Math.floor(top / 2) * 2;
  const endX = Math.min(canvas.width, Math.ceil(right / 2) * 2);
  const endY = Math.min(canvas.height, Math.ceil(bottom / 2) * 2);
  return {left: x, top: y, right: endX, bottom: endY, width: endX - x, height: endY - y};
}

function deriveRecipes(plan, baselinePlan, autoPresentation, sceneBindings, orchestrationDrawingView, renderRange = null) {
  checkSceneBindings(plan, baselinePlan, autoPresentation, sceneBindings, orchestrationDrawingView, renderRange);
  const allNative = sceneBindings.flatMap(group => group.states);
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(binding => [binding.bindingId, binding]));
  const recipes = [];
  for (const [targetIndex, element] of plan.elements.entries()) {
    const group = sceneBindings[targetIndex];
    let samples = group.selectedKind === 'pulse'
      ? getPresentationPulseProgramV001({element, canvas: plan.canvas}).samples
      : ['bounce', 'shake'].includes(group.selectedKind)
      ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).samples
      : [{frame: element.startFrame + Math.floor(element.displayFrameCount / 2), expectedState: 'static'}];
    if (renderRange !== null) {
      const first = Math.max(element.startFrame, renderRange.startFrame);
      const last = Math.min(element.endFrameExclusive, renderRange.endFrameExclusive) - 1;
      const points = new Set(samples.filter(sample => sample.frame >= first && sample.frame <= last)
        .map(sample => sample.frame));
      // Include every visible finite state, range endpoints, and the midpoint.
      // The phase stays relative to the complete caption, including its fade.
      points.add(first); points.add(last); points.add(Math.floor((first + last) / 2));
      if (['pulse', 'bounce', 'shake'].includes(group.selectedKind)) {
        const program = group.selectedKind === 'pulse' ? getPresentationPulseProgramV001({element, canvas: plan.canvas})
          : getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas});
        for (const segment of program.segments) {
          const start = Math.max(first, segment.startFrame), end = Math.min(last + 1, segment.endFrameExclusive);
          if (end > start) points.add(Math.floor((start + end - 1) / 2));
        }
      }
      samples = [...points].sort((left, right) => left - right).map(frame => ({frame,
        mediaFrame: frame - renderRange.startFrame,
        expectedState: stateAt(element, group, frame, plan.canvas).state}));
    }
    for (const sample of samples) {
      const active = plan.elements.map((entry, index) => ({element: entry, group: sceneBindings[index]}))
        .filter(row => row.element.startFrame <= sample.frame && sample.frame < row.element.endFrameExclusive);
      const layers = active.map(row => ({slotCaptionId: row.element.instructionId,
        bindingId: stateAt(row.element, row.group, sample.frame, plan.canvas).bindingId,
        localFrame: sample.frame - row.element.startFrame, displayFrameCount: row.element.displayFrameCount}));
      const slot = layers.findIndex(row => row.slotCaptionId === element.instructionId);
      requireValue(slot >= 0, 'representative frame is outside its caption');
      const references = [{id: 'expected', kind: 'expected', layers: clone(layers)},
        {id: 'omitted', kind: 'target-omitted', layers: layers.filter((_row, index) => index !== slot)}];
      const replace = (id, kind, bindingId) => references.push({id, kind,
        layers: layers.map((row, index) => index === slot ? {...row, bindingId} : {...row})});
      for (const alternate of group.alternates) replace('alternate-' + alternate.kind,
        'target-alternate', alternate.bindingId);
      if (['pulse', 'bounce', 'shake'].includes(group.selectedKind)) for (const state of group.states) {
        const prefix = group.selectedKind === 'pulse' ? 'pulse' : 'motion';
        if (state.state !== sample.expectedState) replace(prefix + '-' + state.state, prefix + '-state', state.bindingId);
      }
      for (const foreign of allNative) {
        if (foreign.instructionId === element.instructionId) continue;
        replace('replace-' + foreign.bindingId, 'foreign-replacement', foreign.bindingId);
        if (!active.some(row => row.element.instructionId === foreign.instructionId)) {
          const addition = clone(layers);
          // A foreign PNG occupies the target slot's clock, immediately above it.
          // Its own inactive clock would produce zero alpha and conceal the fault.
          addition.splice(slot + 1, 0, {...layers[slot], bindingId: foreign.bindingId});
          references.push({id: 'add-' + foreign.bindingId, kind: 'inactive-foreign-addition', layers: addition});
        }
      }
      for (let left = 0; left < layers.length; left++) for (let right = left + 1; right < layers.length; right++) {
        const swapped = clone(layers);
        [swapped[left], swapped[right]] = [swapped[right], swapped[left]];
        references.push({id: 'swap-' + left + '-' + right, kind: 'active-order-swap', layers: swapped});
      }
      const used = [...new Set(references.flatMap(reference => reference.layers.map(row => row.bindingId)))];
      recipes.push({instructionId: element.instructionId, ...sample,
        expectedOverlaySha256: byId.get(layers[slot].bindingId).pngSha256,
        crop: unionBounds(used.map(id => byId.get(id)), plan.canvas), references});
    }
  }
  return recipes;
}

/** Pure QC recipe: all samples and adversarial references derive from bound finite inputs. */
export function buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records, orchestrationDrawingView, renderRange = null}) {
  const sceneBindings = bindRecords(plan, baselinePlan, autoPresentation, records, orchestrationDrawingView, renderRange);
  return {sceneBindings, samples: deriveRecipes(plan, baselinePlan, autoPresentation, sceneBindings, orchestrationDrawingView, renderRange)};
}

/** Exact bytes form equivalence classes; no label, threshold, ratio or channel weighting selects a winner. */
export function classifyPresentationNativeFrameRgbV001({completedRgb, references}) {
  requireValue(Buffer.isBuffer(completedRgb) && completedRgb.length > 0
    && Array.isArray(references) && references.length >= 2, 'RGB observations are missing');
  const ids = new Set();
  const classes = [];
  const observed = [];
  for (const reference of references) {
    requireValue(nonempty(reference.id) && !ids.has(reference.id) && Buffer.isBuffer(reference.rgb)
      && reference.rgb.length === completedRgb.length, 'RGB reference dimensions or identity differ');
    ids.add(reference.id);
    const rgbSha256 = hashBytes(reference.rgb);
    let group = classes.find(row => row.rgbSha256 === rgbSha256 && row.rgb.equals(reference.rgb));
    if (!group) {
      let absoluteRgbDifference = 0;
      for (let index = 0; index < completedRgb.length; index++) {
        absoluteRgbDifference += Math.abs(completedRgb[index] - reference.rgb[index]);
      }
      requireValue(Number.isSafeInteger(absoluteRgbDifference), 'RGB distance exceeds the exact integer range');
      group = {id: 'class-' + classes.length, rgbSha256, referenceIds: [], absoluteRgbDifference, rgb: reference.rgb};
      classes.push(group);
    }
    group.referenceIds.push(reference.id);
    observed.push({id: reference.id, rgbSha256, classId: group.id});
  }
  const expected = observed.find(row => row.id === 'expected');
  const omitted = observed.find(row => row.id === 'omitted');
  requireValue(expected && omitted, 'expected and omitted references are both required');
  const expectedClass = classes.find(row => row.id === expected.classId);
  const visible = expected.classId !== omitted.classId
    && classes.every(row => row.id === expectedClass.id || expectedClass.absoluteRgbDifference < row.absoluteRgbDifference);
  return {visible, expectedClassId: expected.classId, omittedClassId: omitted.classId,
    references: observed, classes: classes.map(({rgb: _rgb, ...row}) => row)};
}

// Read only the current reference and any matching class representative. This
// avoids retaining every full RGB crop while preserving byte-exact classes.
export async function classifyPresentationNativeReferenceFilesV001({
  completedRgb, completedRgbRef, references, distanceCache = new Map(), counts = {},
}) {
  requireValue(Buffer.isBuffer(completedRgb) && completedRgb.length > 0
    && hashBytes(completedRgb) === completedRgbRef?.fileSha256
    && Array.isArray(references) && references.length >= 2, 'RGB file observations are missing');
  const ids = new Set(), classes = [], observed = [];
  for (const reference of references) {
    requireValue(nonempty(reference.id) && !ids.has(reference.id) && path.isAbsolute(reference.path)
      && HASH.test(reference.fileSha256), 'RGB file reference identity differs');
    ids.add(reference.id);
    const rgb = await readFile(reference.path);
    requireValue(rgb.length === completedRgb.length && hashBytes(rgb) === reference.fileSha256,
      'RGB reference dimensions or bytes differ');
    let group;
    for (const candidate of classes.filter(row => row.rgbSha256 === reference.fileSha256)) {
      if (rgb.equals(await readFile(candidate.rgbPath))) {group = candidate; break;}
    }
    if (!group) {
      const key = hashJson({completed: completedRgbRef.fileSha256, reference: reference.fileSha256});
      const matches = distanceCache.get(key) ?? [];
      let cached;
      for (const candidate of matches) {
        if (completedRgb.equals(await readFile(candidate.completedPath))
          && rgb.equals(await readFile(candidate.referencePath))) {cached = candidate; break;}
      }
      let absoluteRgbDifference;
      if (cached) {
        absoluteRgbDifference = cached.absoluteRgbDifference;
        counts.reusedExactDistances = (counts.reusedExactDistances ?? 0) + 1;
      } else {
        absoluteRgbDifference = 0;
        for (let index = 0; index < completedRgb.length; index++)
          absoluteRgbDifference += Math.abs(completedRgb[index] - rgb[index]);
        requireValue(Number.isSafeInteger(absoluteRgbDifference), 'RGB distance exceeds the exact integer range');
        matches.push({completedPath: completedRgbRef.path, referencePath: reference.path, absoluteRgbDifference});
        distanceCache.set(key, matches);
        counts.exactDistanceCalculations = (counts.exactDistanceCalculations ?? 0) + 1;
      }
      group = {id: 'class-' + classes.length, rgbSha256: reference.fileSha256, referenceIds: [],
        absoluteRgbDifference, rgbPath: reference.path};
      classes.push(group);
    }
    group.referenceIds.push(reference.id);
    observed.push({id: reference.id, rgbSha256: reference.fileSha256, classId: group.id});
  }
  const expected = observed.find(row => row.id === 'expected');
  const omitted = observed.find(row => row.id === 'omitted');
  requireValue(expected && omitted, 'expected and omitted references are both required');
  const expectedClass = classes.find(row => row.id === expected.classId);
  const visible = expected.classId !== omitted.classId
    && classes.every(row => row.id === expectedClass.id || expectedClass.absoluteRgbDifference < row.absoluteRgbDifference);
  return {visible, expectedClassId: expected.classId, omittedClassId: omitted.classId,
    references: observed, classes: classes.map(({rgbPath: _rgbPath, ...row}) => row)};
}

function checkedRef(ref) {
  requireValue(object(ref) && nonempty(ref.role) && typeof ref.path === 'string' && path.isAbsolute(ref.path)
    && HASH.test(ref.fileSha256) && (ref.canonicalSha256 === undefined || HASH.test(ref.canonicalSha256)),
  'input file reference is invalid');
  return {role: ref.role, path: ref.path, fileSha256: ref.fileSha256,
    ...(ref.canonicalSha256 === undefined ? {} : {canonicalSha256: ref.canonicalSha256})};
}

async function readBoundRef(ref) {
  const metadata = await stat(ref.path);
  requireValue(metadata.isFile(), 'an input is not a regular file');
  const bytes = await readFile(ref.path);
  requireValue(hashBytes(bytes) === ref.fileSha256, 'input bytes changed: ' + ref.role);
  if (ref.canonicalSha256 !== undefined) requireValue(hashJson(JSON.parse(bytes.toString('utf8'))) === ref.canonicalSha256,
    'input canonical content changed: ' + ref.role);
  return bytes;
}

function frameExtractionArguments(input, frames, outputPattern) {
  requireValue(Array.isArray(frames) && frames.length > 0
    && frames.every((frame, index) => integer(frame) && (index === 0 || frame > frames[index - 1])),
  'batch extraction requires sorted distinct media frames');
  requireValue(typeof outputPattern === 'string' && path.isAbsolute(outputPattern)
    && path.basename(outputPattern) === 'frame-%09d.png', 'batch extraction output pattern differs');
  const seconds = Math.floor(frames[0] / 30);
  const selected = frames.map(frame => 'eq(n\\,' + (frame - seconds * 30) + ')').join('+');
  return ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-i', input,
    '-an', '-vf', 'select=' + selected, '-fps_mode', 'passthrough',
    '-frames:v', String(frames.length), '-start_number', '0', outputPattern];
}

export function buildPresentationNativeFrameBatchPlanV001({samples, directory}) {
  requireValue(Array.isArray(samples) && typeof directory === 'string' && path.isAbsolute(directory),
    'frame extraction plan requires samples and an absolute directory');
  const unique = new Map();
  for (const sample of samples) {
    const mediaFrame = sample.mediaFrame ?? sample.frame;
    requireValue(integer(sample.frame) && integer(mediaFrame), 'frame extraction clock differs');
    requireValue(!unique.has(sample.frame) || unique.get(sample.frame) === mediaFrame,
      'one global frame maps to different media frames');
    unique.set(sample.frame, mediaFrame);
  }
  const ordered = [...unique].sort((left, right) => left[0] - right[0]);
  requireValue(ordered.every((row, index) => index === 0 || row[1] > ordered[index - 1][1]),
    'global and local frame order differ');
  const baseOutputPattern = path.join(directory, 'base', 'frame-%09d.png');
  const completedOutputPattern = path.join(directory, 'completed', 'frame-%09d.png');
  return {method: 'single-open-selected-frames-v001', directory, baseOutputPattern, completedOutputPattern,
    frames: ordered.map(([frame, mediaFrame], index) => ({frame, mediaFrame,
      basePath: path.join(directory, 'base', 'frame-' + String(index).padStart(9, '0') + '.png'),
      completedPath: path.join(directory, 'completed', 'frame-' + String(index).padStart(9, '0') + '.png')}))};
}

export async function readPresentationNativeFrameBatchOutputsV001(extraction) {
  for (const [pattern, field] of [[extraction.baseOutputPattern, 'basePath'], [extraction.completedOutputPattern, 'completedPath']]) {
    const actual = (await readdir(path.dirname(pattern))).sort();
    const expected = extraction.frames.map(row => path.basename(row[field])).sort();
    requireValue(same(actual, expected), 'selected frame extraction produced missing or extra files');
  }
  const outputs = [];
  for (const row of extraction.frames) {
    const baseFrame = {path: row.basePath, fileSha256: hashBytes(await readFile(row.basePath))};
    const completedFrame = {path: row.completedPath, fileSha256: hashBytes(await readFile(row.completedPath))};
    outputs.push({frame: row.frame, mediaFrame: row.mediaFrame, baseFrame, completedFrame});
  }
  return outputs;
}

const layerAlpha = layer => {
  requireValue(integer(layer.localFrame) && integer(layer.displayFrameCount) && layer.displayFrameCount > layer.localFrame,
    'native reference layer time differs');
  return Math.min(4, layer.localFrame + 1, layer.displayFrameCount - layer.localFrame);
};
const layerKey = (pngSha256, numerator) => hashJson({pngSha256, numerator, denominator: 4});

export function buildPresentationNativeLayerPlanV001({samples, sceneBindings, directory, canvas}) {
  requireValue(path.isAbsolute(directory), 'prepared native layer directory must be absolute');
  requireValue(object(canvas) && integer(canvas.width) && canvas.width > 0
    && integer(canvas.height) && canvas.height > 0 && Number.isSafeInteger(canvas.width * canvas.height * 4),
  'prepared native layer canvas is invalid');
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(row => [row.bindingId, row]));
  const sourceByHash = new Map();
  for (const binding of byId.values()) if (!sourceByHash.has(binding.pngSha256))
    sourceByHash.set(binding.pngSha256, binding.pngPath);
  const layers = new Map();
  for (const sample of samples) for (const reference of sample.references) for (const layer of reference.layers) {
    const binding = byId.get(layer.bindingId);
    requireValue(binding, 'native reference layer has no bound PNG');
    const numerator = layerAlpha(layer), key = layerKey(binding.pngSha256, numerator);
    if (!layers.has(key)) layers.set(key, {key, sourcePath: sourceByHash.get(binding.pngSha256),
      sourceSha256: binding.pngSha256, numerator, denominator: 4,
      outputPath: numerator === 4 ? sourceByHash.get(binding.pngSha256) : path.join(directory, 'layer-' + key + '.png'),
      generated: numerator !== 4, decodedPath: path.join(directory, 'layer-' + key + '.gbrap'),
      pixelFormat: 'gbrap', width: canvas.width, height: canvas.height});
  }
  return {method: 'exact-native-png-four-frame-alpha-planar-v002', directory,
    layers: [...layers.values()].sort((left, right) => left.key.localeCompare(right.key))};
}

export function buildPresentationNativeLayerArgumentsV001(layers) {
  requireValue(Array.isArray(layers) && layers.length > 0 && layers.every(layer => layer.generated
    && layer.sourcePath === layers[0].sourcePath && layer.sourceSha256 === layers[0].sourceSha256
    && [1, 2, 3].includes(layer.numerator) && layer.denominator === 4), 'prepared native layer group differs');
  const filters = ['[0:v]format=rgba' + (layers.length === 1 ? '[native0]' : ',split=' + layers.length
    + layers.map((_layer, index) => '[native' + index + ']').join(''))];
  layers.forEach((layer, index) => filters.push('[native' + index + ']geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'alpha(X,Y)*(' + layer.numerator + '/4)\',format=rgba[out' + index + ']'));
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1',
    '-threads', '1', '-i', layers[0].sourcePath, '-filter_complex', filters.join(';')];
  layers.forEach((layer, index) => args.push('-map', '[out' + index + ']', '-frames:v', '1', '-c:v', 'png', '-threads', '1', layer.outputPath));
  return args;
}

/** Decode the already-prepared PNGs once per job, preserving their PNG roundtrip. */
export function buildPresentationNativeLayerDecodeArgumentsV001(layers) {
  requireValue(Array.isArray(layers) && layers.length > 0 && layers.every(layer =>
    layer.sourceSha256 === layers[0].sourceSha256 && path.isAbsolute(layer.outputPath)
    && path.isAbsolute(layer.decodedPath) && layer.pixelFormat === 'gbrap'
    && integer(layer.width) && layer.width > 0 && integer(layer.height) && layer.height > 0),
  'native planar decode group differs');
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1'];
  for (const layer of layers) args.push('-threads', '1', '-i', layer.outputPath);
  args.push('-filter_complex', layers.map((_layer, index) => '[' + index + ':v]format=rgba,format=gbrap[out' + index + ']').join(';'));
  for (const [index, layer] of layers.entries()) args.push('-map', '[out' + index + ']', '-frames:v', '1',
    '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', 'gbrap', '-f', 'rawvideo', layer.decodedPath);
  return args;
}

function preparedReferenceLayers(reference, sceneBindings, nativeLayers) {
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => [row.bindingId, row]));
  const prepared = new Map(nativeLayers.layers.map(layer => [layer.key, layer]));
  return reference.layers.map(layer => {
    const binding = byId.get(layer.bindingId);
    requireValue(binding, 'native reference layer has no PNG');
    const result = prepared.get(layerKey(binding.pngSha256, layerAlpha(layer)));
    requireValue(result, 'native reference layer has not been prepared');
    return result;
  });
}

export function buildPresentationNativeReferenceExecutionV001({sample, sceneBindings, nativeLayers, directory}) {
  requireValue(path.isAbsolute(directory) && HASH.test(sample.baseFrame?.fileSha256), 'reference execution source is not bound');
  return sample.references.map(reference => {
    const layers = preparedReferenceLayers(reference, sceneBindings, nativeLayers);
    const key = hashJson({baseFrameSha256: sample.baseFrame.fileSha256, crop: sample.crop, layers: layers.map(layer => layer.key)});
    return {reference, key, path: path.join(directory, 'reference-' + key + '.rgb')};
  });
}

function nativeReferenceArguments({sample, sceneBindings, baseFramePath, outputPaths, nativeLayers}) {
  requireValue(sample.references.length === outputPaths.length && outputPaths.length > 0,
    'native reference outputs differ');
  // A trie shares only identical ordered prefixes. Every logical candidate still
  // points to its own fully derived scene, including omitted and order-swapped scenes.
  const nodes = [{id: 0, parent: null, layer: null, children: new Map(), outputs: []}];
  sample.references.forEach((reference, index) => {
    let node = nodes[0];
    for (const layer of preparedReferenceLayers(reference, sceneBindings, nativeLayers)) {
      if (!node.children.has(layer.key)) {
        const child = {id: nodes.length, parent: node, layer, children: new Map(), outputs: []};
        nodes.push(child); node.children.set(layer.key, child);
      }
      node = node.children.get(layer.key);
    }
    node.outputs.push(index);
  });
  const usedLayers = [...new Map(nodes.slice(1).map(node => [node.layer.key, node.layer])).values()];
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1', '-i', baseFramePath];
  usedLayers.forEach(layer => args.push('-threads', '1', '-f', 'rawvideo', '-pixel_format', layer.pixelFormat,
    '-video_size', layer.width + 'x' + layer.height, '-framerate', '25', '-i', layer.decodedPath));
  const filters = [];
  for (const [index, layer] of usedLayers.entries()) {
    const uses = nodes.filter(node => node.layer?.key === layer.key);
    // These exact planar bytes were decoded from the same prepared PNG once.
    // Keep the original single-frame 25fps input clock and every overlay consumer.
    filters.push('[' + (index + 1) + ':v]format=gbrap' + (uses.length === 1
      ? '[layer' + uses[0].id + ']' : ',split=' + uses.length + uses.map(node => '[layer' + node.id + ']').join('')));
  }
  for (const node of nodes) {
    const consumers = [...node.children.values()].map(child => 'parent' + child.id)
      .concat(node.outputs.map(index => 'reference' + index));
    requireValue(consumers.length > 0, 'native reference prefix is unused');
    const prefix = node.parent === null ? '[0:v]format=yuv420p'
      : '[parent' + node.id + '][layer' + node.id + ']overlay=0:0:eof_action=pass:shortest=0:repeatlast=0';
    filters.push(prefix + (consumers.length === 1 ? '[' + consumers[0] + ']'
      : ',split=' + consumers.length + consumers.map(label => '[' + label + ']').join('')));
    for (const index of node.outputs) {
      const crop = sample.crop;
      filters.push('[reference' + index + ']format=yuv420p,format=rgb24,crop=' + crop.width + ':' + crop.height + ':'
        + crop.left + ':' + crop.top + ':exact=1[out' + index + ']');
    }
  }
  args.push('-filter_complex', filters.join(';'));
  for (const [index, file] of outputPaths.entries()) args.push('-map', '[out' + index + ']', '-frames:v', '1',
    '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', file);
  return args;
}

function spawnObserved(command, args) {
  return new Promise((resolve, rejectPromise) => {
    const stdout = [], stderr = [];
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', data => stdout.push(data));
    child.stderr.on('data', data => stderr.push(data));
    child.on('error', rejectPromise);
    child.on('close', (code, signal) => {
      const result = {code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
      if (code === 0 && signal === null) resolve(result);
      else rejectPromise(Object.assign(new Error('native frame QC child process failed'), {processResult: result}));
    });
  });
}

function checkInputManifest(manifest, plan, baselinePlan, autoPresentation, orchestrationInput, orchestrationDrawingView, renderRange = null) {
  if (orchestrationDrawingView !== undefined) assertOrchestrationScopedPlansV001({view: orchestrationDrawingView, plan, baselinePlan, renderRange});
  else requireValue(renderRange === null, 'range evidence requires full orchestration input');
  const decisionRole = orchestrationDrawingView === undefined ? 'auto-input' : 'orchestration-input';
  const sourceBaseline = orchestrationDrawingView?.sourceContext?.baselineRef ?? autoPresentation?.context?.baselineRef;
  requireValue(sourceBaseline !== undefined, 'original normal-plan reference is missing');
  requireValue(object(manifest) && manifest.planCanonicalSha256 === hashJson(plan)
    && manifest.baselinePlanCanonicalSha256 === hashJson(baselinePlan)
    && (orchestrationDrawingView === undefined
      ? manifest.autoPresentationCanonicalSha256 === hashJson(autoPresentation)
      : autoPresentation === undefined && manifest.orchestrationInputCanonicalSha256 === hashJson(orchestrationInput)
        && same(baselinePlan, scopeOrchestrationPlanV001(orchestrationDrawingView.projectedNormalPlan, renderRange))
        && same(plan, scopeOrchestrationPlanV001(orchestrationDrawingView.resolvedPlan, renderRange)))
    && Array.isArray(manifest.inputRefs) && manifest.inputRefs.length > 0
    && manifest.inputRefsCanonicalSha256 === hashJson(manifest.inputRefs), 'input manifest binding differs');
  const roles = new Set();
  for (const ref of manifest.inputRefs) {
    checkedRef(ref);
    requireValue(!roles.has(ref.role), 'input reference role is duplicated');
    roles.add(ref.role);
  }
  for (const role of ['plan', 'baseline-plan', decisionRole, 'base-media', 'completed-media', 'tool-ffmpeg', 'tool-imagemagick']) {
    requireValue(roles.has(role), 'required input reference is missing: ' + role);
  }
  requireValue(manifest.inputRefs.find(row => row.role === 'plan').canonicalSha256 === hashJson(plan)
    && manifest.inputRefs.find(row => row.role === 'baseline-plan').canonicalSha256 === sourceBaseline.canonicalSha256
    && manifest.inputRefs.find(row => row.role === decisionRole).canonicalSha256
      === hashJson(orchestrationDrawingView === undefined ? autoPresentation : orchestrationInput),
  'plan file references do not bind the compared plans');
  const normalRef = manifest.inputRefs.find(row => row.role === 'baseline-plan');
  requireValue(normalRef.path === sourceBaseline.path
    && normalRef.fileSha256 === sourceBaseline.fileSha256,
  'normal plan file differs from the automatic context');
  for (const stage of ['before', 'after']) {
    requireValue(Array.isArray(manifest[stage]) && manifest[stage].length === manifest.inputRefs.length,
      'input verification stage is incomplete');
    for (const [index, ref] of manifest.inputRefs.entries()) requireValue(same(manifest[stage][index], {
      role: ref.role, path: ref.path, fileSha256: ref.fileSha256}), 'actual input hashes differ at ' + stage);
  }
}

/** Validate saved evidence by rederiving its complete finite recipe, never by trusting a saved pass flag. */
export function validatePresentationNativeFrameQcEvidenceV001({plan, inspection, renderRange = null}) {
  const instructionId = inspection?.instructionId;
  try {
    const evidence = inspection?.nativeFrameQc;
    requireValue(same(evidence?.renderRange ?? null, renderRange), 'native range evidence differs from requested scope');
    requireValue(object(evidence) && evidence.schemaVersion === PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001
      && inspection.visibilityComparisonBasis === PRESENTATION_NATIVE_FRAME_QC_BASIS_V001
      && evidence.instructionId === instructionId, 'native evidence identity or basis differs');
    const index = plan.elements.findIndex(element => element.instructionId === instructionId);
    requireValue(index >= 0, 'inspection caption is not in the plan');
    const orchestrationDrawingView = evidence.orchestrationInput === undefined ? undefined
      : restoreOrchestrationDrawingViewEvidenceV001(evidence.orchestrationInput);
    checkInputManifest(evidence.inputManifest, plan, evidence.baselinePlan, evidence.autoPresentation,
      evidence.orchestrationInput, orchestrationDrawingView, renderRange);
    const recipes = deriveRecipes(plan, evidence.baselinePlan, evidence.autoPresentation, evidence.sceneBindings,
      orchestrationDrawingView, renderRange)
      .filter(sample => sample.instructionId === instructionId);
    const element = plan.elements[index];
    const representativeFrame = renderRange !== null ? recipes[Math.floor(recipes.length / 2)].frame : Object.hasOwn(element, 'presentationPulse')
      ? getPresentationPulseProgramV001({element, canvas: plan.canvas}).maximumFrame
      : Object.hasOwn(element, 'presentationMotion')
        ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).representativeFrame
        : element.startFrame + Math.floor(element.displayFrameCount / 2);
    requireValue(inspection.representativeFrame === representativeFrame && Array.isArray(evidence.samples)
      && evidence.samples.length === recipes.length, 'representative frame or sample coverage differs');
    const group = evidence.sceneBindings[index];
    requireValue(inspection.overlaySha256 === group.states[0].pngSha256
      && inspection.appliedOverlayPropsCanonicalSha256 === group.states[0].propsCanonicalSha256,
    'inspection and actual native PNG bindings differ');
    if (['pulse', 'bounce', 'shake'].includes(group.selectedKind)) {
      const expression = group.selectedKind === 'pulse' ? inspection.pulse : inspection.motion;
      requireValue(Array.isArray(expression?.states) && expression.states.length === group.states.length
        && group.states.every((state, stateIndex) => {
          const observed = expression.states[stateIndex];
          return observed.state === state.state && observed.overlaySha256 === state.pngSha256
            && observed.appliedOverlayPropsCanonicalSha256 === state.propsCanonicalSha256;
        }), 'expression inspection does not bind every native state PNG');
    }
    for (const binding of evidence.sceneBindings.flatMap(row => [...row.states, ...row.alternates])) {
      const ref = evidence.inputManifest.inputRefs.find(row => row.role === 'png-' + binding.bindingId);
      requireValue(ref?.path === binding.pngPath && ref.fileSha256 === binding.pngSha256,
        'native PNG is absent from verified input references');
    }
    for (const [sampleIndex, recipe] of recipes.entries()) {
      const sample = evidence.samples[sampleIndex];
      requireValue(sample?.frame === recipe.frame && sample.mediaFrame === recipe.mediaFrame && sample.expectedState === recipe.expectedState
        && sample.expectedOverlaySha256 === recipe.expectedOverlaySha256 && same(sample.crop, recipe.crop)
        && typeof sample.baseFrame?.path === 'string' && path.isAbsolute(sample.baseFrame.path)
        && typeof sample.completedFrame?.path === 'string' && path.isAbsolute(sample.completedFrame.path)
        && HASH.test(sample.baseFrame?.fileSha256) && HASH.test(sample.completedFrame?.fileSha256)
        && HASH.test(sample.completedRgbSha256)
        && typeof sample.completedRgb?.path === 'string' && path.isAbsolute(sample.completedRgb.path)
        && sample.completedRgb.fileSha256 === sample.completedRgbSha256 && Array.isArray(sample.references)
        && sample.references.length === recipe.references.length && Array.isArray(sample.classes),
      'sample frame, state, native bounds or coverage differs');
      const ids = new Set(), rgbHashes = new Set();
      const referenceIds = new Set();
      const distanceLimit = recipe.crop.width * recipe.crop.height * 3 * 255;
      for (const groupClass of sample.classes) {
        requireValue(nonempty(groupClass.id) && !ids.has(groupClass.id) && HASH.test(groupClass.rgbSha256)
          && !rgbHashes.has(groupClass.rgbSha256) && Array.isArray(groupClass.referenceIds)
          && groupClass.referenceIds.length > 0 && integer(groupClass.absoluteRgbDifference)
          && groupClass.absoluteRgbDifference <= distanceLimit, 'RGB class or exact integer distance is invalid');
        ids.add(groupClass.id); rgbHashes.add(groupClass.rgbSha256);
        for (const id of groupClass.referenceIds) {
          requireValue(nonempty(id) && !referenceIds.has(id), 'RGB class membership is duplicated');
          referenceIds.add(id);
        }
      }
      requireValue(referenceIds.size === recipe.references.length, 'RGB classes do not cover all references');
      for (const [referenceIndex, expected] of recipe.references.entries()) {
        const observed = sample.references[referenceIndex];
        requireValue(observed?.id === expected.id && observed.kind === expected.kind
          && same(observed.layers, expected.layers) && HASH.test(observed.rgbSha256)
          && typeof observed.rgbPath === 'string' && path.isAbsolute(observed.rgbPath),
        'reference generation recipe or RGB hash differs');
        const groupClass = sample.classes.find(row => row.id === observed.classId);
        requireValue(groupClass?.rgbSha256 === observed.rgbSha256
          && groupClass.referenceIds.includes(expected.id), 'reference is not in its exact RGB class');
      }
      const expected = sample.references.find(row => row.id === 'expected');
      const omitted = sample.references.find(row => row.id === 'omitted');
      requireValue(sample.expectedClassId === expected.classId && sample.omittedClassId === omitted.classId,
        'recorded expected or omitted class differs');
      const wanted = sample.classes.find(row => row.id === expected.classId);
      requireValue(expected.classId !== omitted.classId
        && sample.classes.every(row => row.id === wanted.id || wanted.absoluteRgbDifference < row.absoluteRgbDifference),
      'expected class is absent, invisible, tied or not the unique nearest reference');
      requireValue(sample.visible === true, 'saved visibility contradicts the rederived decision');
    }
    return {status: 'passed', violations: []};
  } catch (error) {
    return {status: 'failed', violations: [violation(instructionId ?? null, error.message)]};
  }
}

/** QC-only native reference execution. It never produces a replacement completed video. */
export async function inspectPresentationNativeFrameQcV001({
  plan, records, provenance, media, tools, scratchDirectory, processObserver = null, renderRange = null,
}) {
  const started = performance.now();
  plan = clone(plan); records = clone(records); provenance = clone(provenance);
  media = clone(media); tools = clone(tools);
  const processes = [], outputArtifacts = [];
  const counts = {sourceFrameOutputs: 0, completedFrameOutputs: 0, completedRgbOutputs: 0,
    logicalReferenceCount: 0, referenceRgbOutputs: 0, reusedReferenceRgbCount: 0,
    preparedLayerOutputs: 0, decodedLayerOutputs: 0, decodedLayerBytes: 0, exactDistanceCalculations: 0, reusedExactDistances: 0};
  const phasesMilliseconds = {inputBinding: 0, frameExtraction: 0, nativeLayerPreparation: 0, nativeLayerDecode: 0,
    completedRgbCrop: 0, referenceComposition: 0, rgbDistance: 0, evidenceWrite: 0,
    verification: 0, evidenceConstruction: 0};
  const timed = async (name, operation) => {
    const began = performance.now();
    try {return await operation();} finally {phasesMilliseconds[name] += performance.now() - began;}
  };
  let manifest;
  const performanceRecord = () => ({wallClockMs: performance.now() - started,
    phasesMilliseconds: {...phasesMilliseconds}, phaseMeaning: 'disjoint measured operations; total also includes tool versions and setup',
    childProcessCount: processes.length, childProcessesByPurpose: Object.fromEntries(
      [...new Set(processes.map(row => row.purpose))].map(purpose => [purpose, processes.filter(row => row.purpose === purpose).length])),
    ...counts, frameCountMeaning: 'verified selected output frames; internal decoder work is not inferred'});
  const run = async (command, args, purpose) => {
    const start = performance.now();
    const observation = {purpose, command, args: [...args], argumentsCanonicalSha256: hashJson(args)};
    processes.push(observation);
    try {
      const result = processObserver === null ? await spawnObserved(command, args)
        : await processObserver.run(command, args, {allowedExitCodes: [0], observationLabel: 'native-qc-' + purpose});
      requireValue(result.code === 0 && (result.signal === undefined || result.signal === null), 'child process did not exit successfully');
      Object.assign(observation, {wallClockMs: performance.now() - start, code: result.code,
        signal: result.signal ?? null, stdoutSha256: hashBytes(result.stdout), stderrSha256: hashBytes(result.stderr)});
      return result;
    } catch (error) {
      Object.assign(observation, {wallClockMs: performance.now() - start, failed: true, message: error.message});
      throw error;
    }
  };
  try {
    const bound = await timed('inputBinding', async () => {
      requireValue(object(provenance) && provenance.planCanonicalSha256 === hashJson(plan)
        && Array.isArray(provenance.inputRefs), 'plan provenance is missing or differs');
      const declared = provenance.inputRefs.map(checkedRef);
      const normalRef = declared.find(ref => ref.role === 'baseline-plan');
      const planRef = declared.find(ref => ref.role === 'plan');
      const autoRef = declared.find(ref => ref.role === 'auto-input');
      const orchestrationRef = declared.find(ref => ref.role === 'orchestration-input');
      requireValue(normalRef && planRef && Boolean(autoRef) !== Boolean(orchestrationRef),
        'plan, baseline-plan and exactly one decision input reference are required');
      const decisionRef = orchestrationRef ?? autoRef;
      const decision = JSON.parse((await readBoundRef(decisionRef)).toString('utf8'));
      const autoPresentation = autoRef ? decision : undefined;
      const orchestrationInput = orchestrationRef ? decision : undefined;
      const orchestrationDrawingView = orchestrationRef ? restoreOrchestrationDrawingViewEvidenceV001(decision) : undefined;
      const originalBaselinePlan = JSON.parse((await readBoundRef(normalRef)).toString('utf8'));
      if (orchestrationDrawingView !== undefined) requireValue(hashJson(originalBaselinePlan)
        === orchestrationDrawingView.sourceContext.baselineRef.canonicalSha256,
      'original plan file differs from the orchestration source');
      const baselinePlan = scopeOrchestrationPlanV001(orchestrationDrawingView?.projectedNormalPlan ?? originalBaselinePlan, renderRange);
      requireValue(same(JSON.parse((await readBoundRef(planRef)).toString('utf8')), plan), 'plan file differs from the in-memory plan');
      const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records, orchestrationDrawingView, renderRange});
      const refs = [...declared.filter(ref => !['plan', 'baseline-plan', 'auto-input', 'orchestration-input'].includes(ref.role)),
        {...planRef, canonicalSha256: hashJson(plan)}, {...normalRef, canonicalSha256: hashJson(originalBaselinePlan)},
        {...decisionRef, canonicalSha256: hashJson(decision)},
        checkedRef({role: 'base-media', ...media?.base}), checkedRef({role: 'completed-media', ...media?.completed}),
        checkedRef({role: 'tool-ffmpeg', ...tools?.ffmpeg}), checkedRef({role: 'tool-imagemagick', ...tools?.imageMagick}),
        ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(binding => ({
          role: 'png-' + binding.bindingId, path: binding.pngPath, fileSha256: binding.pngSha256}))]
        .sort((left, right) => left.role < right.role ? -1 : left.role > right.role ? 1 : 0);
      requireValue(new Set(refs.map(ref => ref.role)).size === refs.length, 'input reference roles are duplicated');
      manifest = {planCanonicalSha256: hashJson(plan), baselinePlanCanonicalSha256: hashJson(baselinePlan),
        ...(orchestrationRef ? {orchestrationInputCanonicalSha256: hashJson(orchestrationInput)}
          : {autoPresentationCanonicalSha256: hashJson(autoPresentation)}),
        inputRefs: refs, inputRefsCanonicalSha256: hashJson(refs), before: [], after: []};
      for (const ref of refs) {
        await readBoundRef(ref);
        manifest.before.push({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
      }
      return {recipe, refs, baselinePlan, autoPresentation, orchestrationInput};
    });
    const {recipe, refs, baselinePlan, autoPresentation, orchestrationInput} = bound;
    requireValue(typeof scratchDirectory === 'string' && path.isAbsolute(scratchDirectory), 'QC scratch path must be absolute');
    await mkdir(scratchDirectory, {recursive: true});
    const work = await mkdtemp(path.join(scratchDirectory, 'native-frame-qc-'));
    const frameExtraction = buildPresentationNativeFrameBatchPlanV001({samples: recipe.samples, directory: path.join(work, 'frames')});
    const nativeLayers = buildPresentationNativeLayerPlanV001({samples: recipe.samples,
      sceneBindings: recipe.sceneBindings, directory: path.join(work, 'layers'), canvas: plan.canvas});
    const referenceDirectory = path.join(work, 'references');
    await mkdir(referenceDirectory);
    await mkdir(nativeLayers.directory);
    const version = {};
    for (const [name, tool] of Object.entries(tools)) {
      requireValue(name === 'ffmpeg' || name === 'imageMagick', 'unknown native QC executable');
      version[name] = (await run(tool.path, ['-version'], 'tool-version')).stdout.toString('utf8');
    }
    const extracted = new Map();
    await timed('frameExtraction', async () => {
      for (const pattern of [frameExtraction.baseOutputPattern, frameExtraction.completedOutputPattern])
        await mkdir(path.dirname(pattern), {recursive: true});
      if (frameExtraction.frames.length > 0) {
        const frames = frameExtraction.frames.map(row => row.mediaFrame);
        await run(tools.ffmpeg.path, frameExtractionArguments(media.base.path, frames, frameExtraction.baseOutputPattern), 'source-frames-extract');
        await run(tools.ffmpeg.path, frameExtractionArguments(media.completed.path, frames, frameExtraction.completedOutputPattern), 'completed-frames-extract');
      }
      for (const row of await readPresentationNativeFrameBatchOutputsV001(frameExtraction)) {
        extracted.set(row.frame, {baseFrame: row.baseFrame, completedFrame: row.completedFrame});
        outputArtifacts.push(row.baseFrame, row.completedFrame);
        counts.sourceFrameOutputs++; counts.completedFrameOutputs++;
      }
    });
    await timed('nativeLayerPreparation', async () => {
      const groups = new Map();
      for (const layer of nativeLayers.layers.filter(row => row.generated)) {
        if (!groups.has(layer.sourceSha256)) groups.set(layer.sourceSha256, []);
        groups.get(layer.sourceSha256).push(layer);
      }
      for (const layers of groups.values()) {
        await run(tools.ffmpeg.path, buildPresentationNativeLayerArgumentsV001(layers), 'native-layer-prepare');
        for (const layer of layers) {
          outputArtifacts.push({path: layer.outputPath, fileSha256: hashBytes(await readFile(layer.outputPath))});
          counts.preparedLayerOutputs++;
        }
      }
    });
    await timed('nativeLayerDecode', async () => {
      const groups = new Map();
      const preparedHashes = new Map(outputArtifacts.map(artifact => [artifact.path, artifact.fileSha256]));
      for (const layer of nativeLayers.layers) {
        const png = await readFile(layer.outputPath);
        requireValue(hashBytes(png) === (layer.generated ? preparedHashes.get(layer.outputPath) : layer.sourceSha256),
          'prepared native PNG changed before planar decode');
        requireValue(png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          && png.readUInt32BE(16) === layer.width && png.readUInt32BE(20) === layer.height,
        'prepared native PNG canvas differs');
        if (!groups.has(layer.sourceSha256)) groups.set(layer.sourceSha256, []);
        groups.get(layer.sourceSha256).push(layer);
      }
      for (const layers of groups.values()) {
        await run(tools.ffmpeg.path, buildPresentationNativeLayerDecodeArgumentsV001(layers), 'native-layer-decode');
        for (const layer of layers) {
          const decoded = await readFile(layer.decodedPath);
          requireValue(decoded.length === layer.width * layer.height * 4, 'decoded native layer does not contain exactly one planar frame');
          outputArtifacts.push({path: layer.decodedPath, fileSha256: hashBytes(decoded)});
          counts.decodedLayerOutputs++; counts.decodedLayerBytes += decoded.length;
        }
      }
    });
    const samples = [], referenceFiles = new Map(), distanceCache = new Map();
    for (const [sampleIndex, recipeSample] of recipe.samples.entries()) {
      const frames = extracted.get(recipeSample.frame);
      requireValue(frames, 'a required sample frame was not extracted');
      const sample = {...recipeSample, ...frames}, crop = sample.crop;
      const completed = await timed('completedRgbCrop', () => run(tools.imageMagick.path,
        [sample.completedFrame.path, '-crop', crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
          '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], 'completed-rgb-crop'));
      const byteCount = crop.width * crop.height * 3;
      requireValue(completed.stdout.length === byteCount, 'completed RGB crop dimensions differ');
      const completedRgb = {path: path.join(work, 'sample-' + sampleIndex + '-completed.rgb'),
        fileSha256: hashBytes(completed.stdout)};
      await timed('evidenceWrite', () => writeFile(completedRgb.path, completed.stdout, {flag: 'wx'}));
      outputArtifacts.push(completedRgb);
      counts.completedRgbOutputs++;
      const executions = buildPresentationNativeReferenceExecutionV001({sample,
        sceneBindings: recipe.sceneBindings, nativeLayers, directory: referenceDirectory});
      const fresh = [...new Map(executions.filter(row => !referenceFiles.has(row.key)).map(row => [row.key, row])).values()];
      if (fresh.length > 0) await timed('referenceComposition', async () => {
        await run(tools.ffmpeg.path, nativeReferenceArguments({sample: {...sample, references: fresh.map(row => row.reference)},
          sceneBindings: recipe.sceneBindings, baseFramePath: sample.baseFrame.path,
          nativeLayers, outputPaths: fresh.map(row => row.path)}), 'native-reference-composite');
        for (const row of fresh) {
          const rgb = await readFile(row.path);
          requireValue(rgb.length === byteCount, 'reference RGB does not contain exactly one complete crop');
          const ref = {path: row.path, fileSha256: hashBytes(rgb)};
          referenceFiles.set(row.key, ref); outputArtifacts.push(ref);
          counts.referenceRgbOutputs++;
        }
      });
      counts.logicalReferenceCount += executions.length;
      counts.reusedReferenceRgbCount += executions.length - fresh.length;
      const decision = await timed('rgbDistance', () => classifyPresentationNativeReferenceFilesV001({
        completedRgb: completed.stdout, completedRgbRef: completedRgb,
        references: executions.map(row => ({id: row.reference.id, ...referenceFiles.get(row.key)})), distanceCache, counts}));
      samples.push({...sample, completedRgb, completedRgbSha256: completedRgb.fileSha256, ...decision,
        references: sample.references.map((reference, index) => ({...reference,
          ...decision.references[index], rgbPath: executions[index].path}))});
    }
    await timed('verification', async () => {
      for (const ref of refs) {
        await readBoundRef(ref);
        manifest.after.push({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
      }
      for (const artifact of outputArtifacts) requireValue(hashBytes(await readFile(artifact.path)) === artifact.fileSha256,
        'generated frame evidence changed before completion');
    });
    const evidenceStarted = performance.now();
    const inspections = records.map(record => {
      const element = record.element;
      const localSamples = samples.filter(sample => sample.instructionId === element.instructionId);
      const representativeFrame = renderRange !== null ? localSamples[Math.floor(localSamples.length / 2)].frame : Object.hasOwn(element, 'presentationPulse')
        ? getPresentationPulseProgramV001({element, canvas: plan.canvas}).maximumFrame
        : Object.hasOwn(element, 'presentationMotion')
          ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).representativeFrame
          : element.startFrame + Math.floor(element.displayFrameCount / 2);
      const inspection = {...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
        representativeFrame, nativeFrameQc: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
          instructionId: element.instructionId, baselinePlan, autoPresentation, orchestrationInput, inputManifest: manifest, renderRange,
          sceneBindings: recipe.sceneBindings, samples: samples.filter(sample => sample.instructionId === element.instructionId)}};
      delete inspection.changedPixelsAgainstInstructionOmittedFrame;
      return inspection;
    });
    const violations = inspections.flatMap(inspection => validatePresentationNativeFrameQcEvidenceV001({plan, inspection, renderRange}).violations);
    phasesMilliseconds.evidenceConstruction += performance.now() - evidenceStarted;
    return {status: violations.length === 0 ? 'passed' : 'failed', violations, inspections,
      evidence: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, inputManifest: manifest,
        baselinePlan, autoPresentation, orchestrationInput, renderRange, sceneBindings: recipe.sceneBindings, samples, processes,
        executionMethod: PRESENTATION_NATIVE_FRAME_EXECUTION_V001, frameExtraction, nativeLayers, referenceDirectory,
        outputArtifacts, executableVersions: version},
      performance: performanceRecord()};
  } catch (error) {
    error.nativeFrameQcFailure = {inputManifest: manifest ?? null, processes, performance: performanceRecord()};
    throw error;
  }
}

/** Reconstruct the full saved source even for a caption-free range. */
export function validatePresentationNativeFrameQcScopeV001({plan, evidence, renderRange = null}) {
  requireValue(same(evidence?.renderRange ?? null, renderRange), 'finite evidence scope differs');
  const view = evidence.orchestrationInput === undefined ? undefined
    : restoreOrchestrationDrawingViewEvidenceV001(evidence.orchestrationInput);
  checkInputManifest(evidence.inputManifest, plan, evidence.baselinePlan, evidence.autoPresentation,
    evidence.orchestrationInput, view, renderRange);
  const recipes = deriveRecipes(plan, evidence.baselinePlan, evidence.autoPresentation, evidence.sceneBindings, view, renderRange);
  requireValue(evidence.samples.length === recipes.length, 'global range sample count differs');
  return true;
}

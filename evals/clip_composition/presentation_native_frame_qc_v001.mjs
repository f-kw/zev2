import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {stat, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

// Evidence validation reuses the actual executed command builders.
export {
  frameExtractionArguments as buildPresentationNativeFrameExtractionArgumentsV001,
  nativeReferenceArguments as buildPresentationNativeReferenceArgumentsV001,
};
import {buildPresentationNativeQcAlternativeElementsV001} from './presentation_native_frame_qc_preparation_v001.mjs';
import {getPresentationPulseProgramV001, buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001, buildPresentationCaptionMotionStateElementsV001}
  from './presentation_caption_motion_v001.mjs';

export const PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001 = 'presentation-native-frame-qc-v001';
export const PRESENTATION_NATIVE_FRAME_QC_BASIS_V001 = 'native-reference-state-identification-v001';
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

function checkPlans(plan, baselinePlan) {
  requireValue(object(plan) && object(baselinePlan) && object(plan.canvas)
    && integer(plan.canvas.width) && plan.canvas.width > 0
    && integer(plan.canvas.height) && plan.canvas.height > 0 && plan.canvas.fps === 30,
  'the native profile requires an integer canvas at the existing 30fps clock');
  requireValue(Array.isArray(plan.elements) && plan.elements.length > 0
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

function finiteSpecifications(plan, baselinePlan, autoPresentation) {
  const rebuilt = buildPresentationNativeQcAlternativeElementsV001({
    plan, baselinePlan, autoPresentation, presentationTimeline: null,
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

function bindRecords(plan, baselinePlan, autoPresentation, records) {
  checkPlans(plan, baselinePlan);
  const specifications = finiteSpecifications(plan, baselinePlan, autoPresentation);
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

function checkSceneBindings(plan, baselinePlan, autoPresentation, sceneBindings) {
  checkPlans(plan, baselinePlan);
  const specifications = finiteSpecifications(plan, baselinePlan, autoPresentation);
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

function deriveRecipes(plan, baselinePlan, autoPresentation, sceneBindings) {
  checkSceneBindings(plan, baselinePlan, autoPresentation, sceneBindings);
  const allNative = sceneBindings.flatMap(group => group.states);
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(binding => [binding.bindingId, binding]));
  const recipes = [];
  for (const [targetIndex, element] of plan.elements.entries()) {
    const group = sceneBindings[targetIndex];
    const samples = group.selectedKind === 'pulse' ? (() => {
      const pulse = getPresentationPulseProgramV001({element, canvas: plan.canvas});
      return [{frame: pulse.normalBeforeFrame, expectedState: 'normal'},
        {frame: pulse.maximumFrame, expectedState: 'maximum'},
        {frame: pulse.normalAfterFrame, expectedState: 'normal'}];
    })() : ['bounce', 'shake'].includes(group.selectedKind)
      ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).samples
      : [{frame: element.startFrame + Math.floor(element.displayFrameCount / 2), expectedState: 'static'}];
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
export function buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records}) {
  const sceneBindings = bindRecords(plan, baselinePlan, autoPresentation, records);
  return {sceneBindings, samples: deriveRecipes(plan, baselinePlan, autoPresentation, sceneBindings)};
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

function frameExtractionArguments(input, frame, output) {
  const seconds = Math.floor(frame / 30);
  const remainder = frame - seconds * 30;
  return ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-i', input,
    '-vf', 'select=eq(n\\,' + remainder + ')', '-frames:v', '1', output];
}

function nativeReferenceArguments({sample, sceneBindings, baseFramePath, outputPaths}) {
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(row => [row.bindingId, row]));
  const uses = new Map();
  for (const reference of sample.references) for (const layer of reference.layers) {
    const key = layer.bindingId + '/' + layer.localFrame + '/' + layer.displayFrameCount;
    const found = uses.get(key);
    if (found) found.count++;
    else uses.set(key, {layer, count: 1});
  }
  const paths = [...new Set([...uses.values()].map(use => byId.get(use.layer.bindingId).pngPath))];
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1', '-i', baseFramePath];
  for (const file of paths) args.push('-threads', '1', '-i', file);
  const filters = [];
  const baseLabels = sample.references.map((_ref, index) => 'base' + index);
  filters.push('[0:v]format=yuv420p,split=' + baseLabels.length + baseLabels.map(label => '[' + label + ']').join(''));
  const useEntries = [...uses.entries()];
  for (const [fileIndex, file] of paths.entries()) {
    const matching = useEntries.filter(([_key, use]) => byId.get(use.layer.bindingId).pngPath === file);
    filters.push('[' + (fileIndex + 1) + ':v]format=rgba'
      + (matching.length === 1 ? '[png' + fileIndex + '-0]'
        : ',split=' + matching.length + matching.map((_entry, index) => '[png' + fileIndex + '-' + index + ']').join('')));
    for (const [useIndex, [key, use]] of matching.entries()) {
      const index = useEntries.findIndex(entry => entry[0] === key);
      const local = use.layer.localFrame;
      const duration = use.layer.displayFrameCount;
      const alpha = 'alpha(X,Y)*min(1,min((' + local + '+1)/4,(' + duration + '-' + local + ')/4))';
      const labels = Array.from({length: use.count}, (_unused, n) => 'faded' + index + '-' + n);
      filters.push('[png' + fileIndex + '-' + useIndex + ']geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'' + alpha + '\''
        + (labels.length === 1 ? '[' + labels[0] + ']'
          : ',split=' + labels.length + labels.map(label => '[' + label + ']').join('')));
      use.labels = labels;
      use.next = 0;
    }
  }
  for (const [referenceIndex, reference] of sample.references.entries()) {
    let previous = baseLabels[referenceIndex];
    for (const [layerIndex, layer] of reference.layers.entries()) {
      const use = uses.get(layer.bindingId + '/' + layer.localFrame + '/' + layer.displayFrameCount);
      const next = 'scene' + referenceIndex + '-' + layerIndex;
      filters.push('[' + previous + '][' + use.labels[use.next++] + ']overlay=0:0:eof_action=pass:shortest=0:repeatlast=0[' + next + ']');
      previous = next;
    }
    const crop = sample.crop;
    filters.push('[' + previous + ']format=yuv420p,format=rgb24,crop=' + crop.width + ':' + crop.height + ':'
      + crop.left + ':' + crop.top + ':exact=1[out' + referenceIndex + ']');
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

function checkInputManifest(manifest, plan, baselinePlan, autoPresentation) {
  requireValue(object(manifest) && manifest.planCanonicalSha256 === hashJson(plan)
    && manifest.baselinePlanCanonicalSha256 === hashJson(baselinePlan)
    && manifest.autoPresentationCanonicalSha256 === hashJson(autoPresentation)
    && Array.isArray(manifest.inputRefs) && manifest.inputRefs.length > 0
    && manifest.inputRefsCanonicalSha256 === hashJson(manifest.inputRefs), 'input manifest binding differs');
  const roles = new Set();
  for (const ref of manifest.inputRefs) {
    checkedRef(ref);
    requireValue(!roles.has(ref.role), 'input reference role is duplicated');
    roles.add(ref.role);
  }
  for (const role of ['plan', 'baseline-plan', 'auto-input', 'base-media', 'completed-media', 'tool-ffmpeg', 'tool-imagemagick']) {
    requireValue(roles.has(role), 'required input reference is missing: ' + role);
  }
  requireValue(manifest.inputRefs.find(row => row.role === 'plan').canonicalSha256 === hashJson(plan)
    && manifest.inputRefs.find(row => row.role === 'baseline-plan').canonicalSha256 === hashJson(baselinePlan)
    && manifest.inputRefs.find(row => row.role === 'auto-input').canonicalSha256 === hashJson(autoPresentation),
  'plan file references do not bind the compared plans');
  const normalRef = manifest.inputRefs.find(row => row.role === 'baseline-plan');
  requireValue(normalRef.path === autoPresentation.context.baselineRef.path
    && normalRef.fileSha256 === autoPresentation.context.baselineRef.fileSha256,
  'normal plan file differs from the automatic context');
  for (const stage of ['before', 'after']) {
    requireValue(Array.isArray(manifest[stage]) && manifest[stage].length === manifest.inputRefs.length,
      'input verification stage is incomplete');
    for (const [index, ref] of manifest.inputRefs.entries()) requireValue(same(manifest[stage][index], {
      role: ref.role, path: ref.path, fileSha256: ref.fileSha256}), 'actual input hashes differ at ' + stage);
  }
}

/** Validate saved evidence by rederiving its complete finite recipe, never by trusting a saved pass flag. */
export function validatePresentationNativeFrameQcEvidenceV001({plan, inspection}) {
  const instructionId = inspection?.instructionId;
  try {
    const evidence = inspection?.nativeFrameQc;
    requireValue(object(evidence) && evidence.schemaVersion === PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001
      && inspection.visibilityComparisonBasis === PRESENTATION_NATIVE_FRAME_QC_BASIS_V001
      && evidence.instructionId === instructionId, 'native evidence identity or basis differs');
    const index = plan.elements.findIndex(element => element.instructionId === instructionId);
    requireValue(index >= 0, 'inspection caption is not in the plan');
    checkInputManifest(evidence.inputManifest, plan, evidence.baselinePlan, evidence.autoPresentation);
    const recipes = deriveRecipes(plan, evidence.baselinePlan, evidence.autoPresentation, evidence.sceneBindings)
      .filter(sample => sample.instructionId === instructionId);
    const element = plan.elements[index];
    const representativeFrame = Object.hasOwn(element, 'presentationPulse')
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
      requireValue(sample?.frame === recipe.frame && sample.expectedState === recipe.expectedState
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
  plan, records, provenance, media, tools, scratchDirectory, processObserver = null,
}) {
  const started = performance.now();
  plan = clone(plan); records = clone(records); provenance = clone(provenance);
  media = clone(media); tools = clone(tools);
  const processes = [];
  const outputArtifacts = [];
  const counts = {sourceFrameOutputs: 0, completedFrameOutputs: 0, completedRgbOutputs: 0, referenceRgbOutputs: 0};
  let manifest;
  const performanceRecord = () => ({wallClockMs: performance.now() - started,
    childProcessCount: processes.length, childProcessesByPurpose: Object.fromEntries(
      [...new Set(processes.map(row => row.purpose))].map(purpose => [purpose, processes.filter(row => row.purpose === purpose).length])),
    ...counts, frameCountMeaning: 'verified output frames; internal seek/decoder work is not inferred'});
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
    requireValue(object(provenance) && provenance.planCanonicalSha256 === hashJson(plan)
      && Array.isArray(provenance.inputRefs), 'plan provenance is missing or differs');
    const declared = provenance.inputRefs.map(checkedRef);
    const normalRef = declared.find(ref => ref.role === 'baseline-plan');
    const planRef = declared.find(ref => ref.role === 'plan');
    const autoRef = declared.find(ref => ref.role === 'auto-input');
    requireValue(normalRef && planRef && autoRef, 'plan, baseline-plan and auto-input file references are required');
    const autoPresentation = JSON.parse((await readBoundRef(autoRef)).toString('utf8'));
    const baselinePlan = JSON.parse((await readBoundRef(normalRef)).toString('utf8'));
    requireValue(same(JSON.parse((await readBoundRef(planRef)).toString('utf8')), plan), 'plan file differs from the in-memory plan');
    const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, autoPresentation, records});
    const refs = [...declared.filter(ref => ref.role !== 'plan' && ref.role !== 'baseline-plan' && ref.role !== 'auto-input'),
      {...planRef, canonicalSha256: hashJson(plan)}, {...normalRef, canonicalSha256: hashJson(baselinePlan)},
      {...autoRef, canonicalSha256: hashJson(autoPresentation)},
      checkedRef({role: 'base-media', ...media?.base}), checkedRef({role: 'completed-media', ...media?.completed}),
      checkedRef({role: 'tool-ffmpeg', ...tools?.ffmpeg}), checkedRef({role: 'tool-imagemagick', ...tools?.imageMagick}),
      ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(binding => ({
        role: 'png-' + binding.bindingId, path: binding.pngPath, fileSha256: binding.pngSha256}))]
      .sort((left, right) => left.role < right.role ? -1 : left.role > right.role ? 1 : 0);
    requireValue(new Set(refs.map(ref => ref.role)).size === refs.length, 'input reference roles are duplicated');
    manifest = {planCanonicalSha256: hashJson(plan), baselinePlanCanonicalSha256: hashJson(baselinePlan),
      autoPresentationCanonicalSha256: hashJson(autoPresentation),
      inputRefs: refs, inputRefsCanonicalSha256: hashJson(refs), before: [], after: []};
    for (const ref of refs) {
      await readBoundRef(ref);
      manifest.before.push({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
    }
    requireValue(typeof scratchDirectory === 'string' && path.isAbsolute(scratchDirectory), 'QC scratch path must be absolute');
    await mkdir(scratchDirectory, {recursive: true});
    const work = await mkdtemp(path.join(scratchDirectory, 'native-frame-qc-'));
    const version = {};
    for (const [name, tool] of Object.entries(tools)) {
      requireValue(name === 'ffmpeg' || name === 'imageMagick', 'unknown native QC executable');
      version[name] = (await run(tool.path, ['-version'], 'tool-version')).stdout.toString('utf8');
    }
    const extracted = new Map();
    const samples = [];
    for (const [sampleIndex, sample] of recipe.samples.entries()) {
      let frames = extracted.get(sample.frame);
      if (!frames) {
        frames = {base: path.join(work, 'frame-' + sample.frame + '-base.png'),
          completed: path.join(work, 'frame-' + sample.frame + '-completed.png')};
        await run(tools.ffmpeg.path, frameExtractionArguments(media.base.path, sample.frame, frames.base), 'source-frame-extract');
        await run(tools.ffmpeg.path, frameExtractionArguments(media.completed.path, sample.frame, frames.completed), 'completed-frame-extract');
        frames.baseSha256 = hashBytes(await readFile(frames.base));
        frames.completedSha256 = hashBytes(await readFile(frames.completed));
        outputArtifacts.push({path: frames.base, fileSha256: frames.baseSha256},
          {path: frames.completed, fileSha256: frames.completedSha256});
        extracted.set(sample.frame, frames);
        counts.sourceFrameOutputs++; counts.completedFrameOutputs++;
      }
      const crop = sample.crop;
      const completed = await run(tools.imageMagick.path, [frames.completed, '-crop',
        crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
        '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], 'completed-rgb-crop');
      const byteCount = crop.width * crop.height * 3;
      requireValue(completed.stdout.length === byteCount, 'completed RGB crop dimensions differ');
      const completedRgb = {path: path.join(work, 'sample-' + sampleIndex + '-completed.rgb'),
        fileSha256: hashBytes(completed.stdout)};
      await writeFile(completedRgb.path, completed.stdout, {flag: 'wx'});
      outputArtifacts.push(completedRgb);
      counts.completedRgbOutputs++;
      const outputPaths = sample.references.map((_reference, index) => path.join(work, 'sample-' + sampleIndex + '-reference-' + index + '.rgb'));
      await run(tools.ffmpeg.path, nativeReferenceArguments({sample, sceneBindings: recipe.sceneBindings,
        baseFramePath: frames.base, outputPaths}), 'native-reference-composite');
      const rgbReferences = [];
      for (const [index, reference] of sample.references.entries()) {
        const rgb = await readFile(outputPaths[index]);
        requireValue(rgb.length === byteCount, 'reference RGB does not contain exactly one complete crop');
        rgbReferences.push({id: reference.id, rgb});
        outputArtifacts.push({path: outputPaths[index], fileSha256: hashBytes(rgb)});
        counts.referenceRgbOutputs++;
      }
      const decision = classifyPresentationNativeFrameRgbV001({completedRgb: completed.stdout, references: rgbReferences});
      samples.push({...sample, baseFrame: {path: frames.base, fileSha256: frames.baseSha256},
        completedFrame: {path: frames.completed, fileSha256: frames.completedSha256},
        completedRgb, completedRgbSha256: completedRgb.fileSha256, ...decision,
        references: sample.references.map((reference, index) => ({...reference,
          ...decision.references[index], rgbPath: outputPaths[index]}))});
    }
    for (const ref of refs) {
      await readBoundRef(ref);
      manifest.after.push({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
    }
    for (const artifact of outputArtifacts) {
      requireValue(hashBytes(await readFile(artifact.path)) === artifact.fileSha256,
        'generated frame evidence changed before completion');
    }
    const inspections = records.map(record => {
      const element = record.element;
      const representativeFrame = Object.hasOwn(element, 'presentationPulse')
        ? getPresentationPulseProgramV001({element, canvas: plan.canvas}).maximumFrame
        : Object.hasOwn(element, 'presentationMotion')
          ? getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}).representativeFrame
          : element.startFrame + Math.floor(element.displayFrameCount / 2);
      const inspection = {...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
        representativeFrame, nativeFrameQc: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001,
          instructionId: element.instructionId, baselinePlan, autoPresentation, inputManifest: manifest,
          sceneBindings: recipe.sceneBindings, samples: samples.filter(sample => sample.instructionId === element.instructionId)}};
      delete inspection.changedPixelsAgainstInstructionOmittedFrame;
      return inspection;
    });
    const violations = inspections.flatMap(inspection => validatePresentationNativeFrameQcEvidenceV001({plan, inspection}).violations);
    return {status: violations.length === 0 ? 'passed' : 'failed', violations, inspections,
      evidence: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, inputManifest: manifest,
        baselinePlan, autoPresentation, sceneBindings: recipe.sceneBindings, samples, processes,
        outputArtifacts, executableVersions: version},
      performance: performanceRecord()};
  } catch (error) {
    error.nativeFrameQcFailure = {inputManifest: manifest ?? null, processes, performance: performanceRecord()};
    throw error;
  }
}

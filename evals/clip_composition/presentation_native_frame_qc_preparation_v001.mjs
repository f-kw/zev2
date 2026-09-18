import {assertOrchestrationScopedPlansV001, scopeOrchestrationPlanV001} from './presentation_orchestration_render_scope_v001.mjs';
import {createHash} from 'node:crypto';
import {lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';
import {buildOrchestrationNativeQcAlternativeElementsV001,
  exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const reject = message => { throw new TypeError(`native frame QC preparation: ${message}`); };
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

async function bind(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) reject('absolute evidence path required');
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) reject('evidence must be a regular file');
  const bytes = await readFile(file);
  return {path: file, fileSha256: sha(bytes), bytes: bytes.length};
}

/** Build only the fixed diagnostic alternatives. The saved selection is never
 * edited, and these elements must never be sent to the production compositor. */
export function buildPresentationNativeQcAlternativeElementsV001({
  baselinePlan, plan, autoPresentation, presentationTimeline, orchestrationDrawingView, renderRange = null,
}) {
  if (presentationTimeline !== null) reject('native references require no inserted timeline; select the encoded oracle explicitly');
  if (orchestrationDrawingView !== undefined) {
    if (autoPresentation !== undefined) reject('orchestration and automatic presentation are mutually exclusive');
    const specification = buildOrchestrationNativeQcAlternativeElementsV001(orchestrationDrawingView);
    assertOrchestrationScopedPlansV001({view: orchestrationDrawingView, plan, baselinePlan, renderRange});
    const ids = new Set(plan.elements.map(element => element.instructionId));
    return {alternatives: specification.alternatives.filter(row => ids.has(row.captionId)), resolution: specification.resolution.caption};
  }
  if (!autoPresentation?.context || !Array.isArray(plan?.elements)
    || plan.elements.length === 0
    || plan.elements.some(element => element.kind !== 'speech-caption'
      || element.visualState?.position?.preset !== 'bottom-center')) {
    reject('native references require bound automatic bottom-center speech captions');
  }
  if (Object.keys(autoPresentation).some(key => !['context', 'autoProposal', 'overrides'].includes(key))) {
    reject('unexpected automatic presentation input');
  }
  const resolved = resolveAutoPresentationV001({baselinePlan, ...autoPresentation});
  if (!same(resolved.plan, plan)) reject('resolved plan differs from the fixed automatic inputs');
  const baselineById = new Map(baselinePlan.elements.map(element => [element.instructionId, element]));
  const selectionById = new Map(resolved.resolution.captions.map(row => [row.captionId, row.effectiveSelection]));
  const alternatives = plan.elements.map(element => {
    const baseline = baselineById.get(element.instructionId);
    if (!baseline) reject('caption is absent from the fixed normal plan');
    const entries = [{kind: 'normal', element: structuredClone(baseline)}];
    const selection = selectionById.get(element.instructionId);
    if (selection?.role === 'Focus' && selection.scope === 'partial-caption') {
      // The existing resolver owns the finite Color paint and range. This
      // in-memory diagnostic edit is not saved as a human override or proposal.
      const overrides = editAutoPresentationOverrideV001({
        baselinePlan, ...autoPresentation,
        overrides: autoPresentation.overrides ?? createAutoPresentationOverridesV001({baselinePlan, ...autoPresentation}),
        captionId: element.instructionId,
        selection: {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'},
      });
      const whole = resolveAutoPresentationV001({baselinePlan, ...autoPresentation, overrides})
        .plan.elements.find(candidate => candidate.instructionId === element.instructionId);
      entries.push({kind: 'whole-color', element: structuredClone(whole)});
    }
    if (selection?.role === 'Panel accent') {
      if (!element.visualState.background) reject('selected Panel has no native plate geometry');
      // Removing the background object would also remove its padding and move
      // the text. The diagnostic removes only the plate paint, preserving the
      // actual wrapper, dark text, padding, outline and all placement values.
      const withoutPlate = structuredClone(element);
      withoutPlate.visualState.background.color = 'transparent';
      entries.push({kind: 'panel-plate-omitted', element: withoutPlate});
    }
    return {captionId: element.instructionId, entries};
  });
  return {alternatives, resolution: resolved.resolution};
}

/** QC-only native drawing through the caller's existing production adapter.
 * It does not alter the production records, fixed plan, saved auto selection,
 * production PNG directory, or completed media. */
export async function preparePresentationNativeFrameQcV001({
  plan, records, autoPresentation, presentationTimeline, presetRegistry,
  overlayAdapter, inspectPng, scratchDirectory, sourceRefs = [], orchestrationDrawingView, renderRange = null,
}) {
  const started = performance.now();
  const orchestrationInput = orchestrationDrawingView === undefined ? undefined
    : exportOrchestrationDrawingViewEvidenceV001(orchestrationDrawingView);
  const originalInputsSha256 = sha256AutoPresentationV001({plan, records, autoPresentation, orchestrationInput, presetRegistry});
  if (!path.isAbsolute(scratchDirectory)) reject('absolute scratch directory required');
  if (typeof overlayAdapter?.buildProps !== 'function' || typeof overlayAdapter?.renderStill !== 'function'
    || typeof inspectPng !== 'function') reject('existing native adapter and PNG inspector are required');
  const baselineRef = orchestrationDrawingView?.sourceContext?.baselineRef ?? autoPresentation?.context?.baselineRef;
  if (!baselineRef || !digest(baselineRef.fileSha256) || !digest(baselineRef.canonicalSha256)) {
    reject('fixed normal plan reference required');
  }
  const baselineBinding = await bind(baselineRef.path);
  if (baselineBinding.fileSha256 !== baselineRef.fileSha256) reject('fixed normal plan bytes changed');
  const originalBaselinePlan = JSON.parse(await readFile(baselineRef.path, 'utf8'));
  if (sha256AutoPresentationV001(originalBaselinePlan) !== baselineRef.canonicalSha256) reject('fixed normal plan content changed');
  const baselinePlan = scopeOrchestrationPlanV001(orchestrationDrawingView?.projectedNormalPlan ?? originalBaselinePlan, renderRange);
  const specification = buildPresentationNativeQcAlternativeElementsV001({
    baselinePlan, plan, autoPresentation, presentationTimeline, orchestrationDrawingView, renderRange,
  });
  if (!Array.isArray(records) || records.length !== plan.elements.length
    || records.some((record, index) => !same(record.element, plan.elements[index])
      || typeof record.fileStem !== 'string' || record.fileStem.length === 0
      || path.basename(record.fileStem) !== record.fileStem)) {
    reject('records must match every resolved caption in plan order');
  }
  if (new Set(records.map(record => record.fileStem)).size !== records.length) reject('duplicate native record file stem');
  const inputBindings = [{role: 'baseline-plan', ...baselineBinding,
    canonicalSha256: baselineRef.canonicalSha256}];
  for (const ref of sourceRefs) {
    if (typeof ref.role !== 'string' || ref.role.length === 0 || !digest(ref.fileSha256)) reject('invalid source evidence');
    if (['baseline-plan', 'plan', 'auto-input', 'orchestration-input', 'preset-registry'].includes(ref.role)) reject('reserved evidence role');
    const actual = await bind(ref.path);
    if (actual.fileSha256 !== ref.fileSha256) reject('source evidence bytes changed');
    inputBindings.push({...ref, ...actual});
  }
  const nativeInputs = [];
  for (const record of records) {
    const expectedStates = Object.hasOwn(record.element, 'presentationPulse')
      ? buildPresentationPulseStateElementsV001({element: record.element, canvas: plan.canvas}) : null;
    if (expectedStates && (!Array.isArray(record.pulseStates) || record.pulseStates.length !== expectedStates.length
      || record.pulseStates.some((state, index) => state.state !== expectedStates[index].state
        || !same(state.element, expectedStates[index].element)))) reject('Pulse native states differ from the finite plan');
    if (!expectedStates && Object.hasOwn(record, 'pulseStates')) reject('non-Pulse record has unexpected native states');
    const motionStates = Object.hasOwn(record.element, 'presentationMotion')
      ? buildPresentationCaptionMotionStateElementsV001({element: record.element, canvas: plan.canvas}) : null;
    if (motionStates && (!Array.isArray(record.motionStates) || record.motionStates.length !== motionStates.length
      || record.motionStates.some((state, index) => state.state !== motionStates[index].state
        || !same(state.element, motionStates[index].element)))) reject('motion native states differ from the finite plan');
    if (!motionStates && Object.hasOwn(record, 'motionStates')) reject('non-motion record has unexpected native states');
    const states = record.pulseStates ?? record.motionStates ?? [record];
    for (const state of states) {
      const expectedProps = overlayAdapter.buildProps(state.element, plan, presetRegistry);
      const propsSha = sha256AutoPresentationV001(expectedProps);
      if (!same(state.props, expectedProps)
        || state.inspection?.appliedOverlayPropsCanonicalSha256 !== propsSha
        || state.inspection?.overlaySha256 !== state.pngSha256) reject('native input drawing conditions differ');
      const png = await bind(state.pngPath);
      if (png.fileSha256 !== state.pngSha256) reject('native input PNG bytes changed');
      nativeInputs.push({role: 'production-overlay', ...png});
    }
  }
  // One attempt owns an exclusive directory. Failed evidence is not resumed or
  // replaced, including the second deterministic PNG of a diagnostic state.
  await mkdir(scratchDirectory);
  const overlayDirectory = path.join(scratchDirectory, 'alternates');
  await mkdir(overlayDirectory);
  const save = async (name, value, role) => {
    const file = path.join(scratchDirectory, name);
    await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
    return {role, ...await bind(file), canonicalSha256: sha256AutoPresentationV001(value)};
  };
  const planBinding = await save('plan.json', plan, 'plan');
  const autoBinding = orchestrationDrawingView === undefined
    ? await save('auto-input.json', autoPresentation, 'auto-input')
    : await save('orchestration-input.json', orchestrationInput, 'orchestration-input');
  const registryBinding = await save('preset-registry.json', presetRegistry, 'preset-registry');
  const generatedBindings = [planBinding, autoBinding, registryBinding];
  const outputRecords = [], drawingEvidence = [];
  let renderedDiagnosticStates = 0;
  for (const [index, record] of records.entries()) {
    const alternates = [];
    for (const spec of specification.alternatives[index].entries) {
      const props = overlayAdapter.buildProps(spec.element, plan, presetRegistry);
      const propsSha = sha256AutoPresentationV001(props);
      const reusable = (record.pulseStates ?? record.motionStates ?? [record]).find(state =>
        same(state.element, spec.element) && same(state.props, props));
      if (reusable) {
        alternates.push({kind: spec.kind, element: structuredClone(spec.element), props,
          pngPath: reusable.pngPath, pngSha256: reusable.pngSha256,
          inspection: structuredClone(reusable.inspection)});
        drawingEvidence.push({captionId: record.element.instructionId, kind: spec.kind,
          method: 'reuse-identical-bound-production-native-state', pngPath: reusable.pngPath,
          pngSha256: reusable.pngSha256, propsCanonicalSha256: propsSha,
          elementCanonicalSha256: sha256AutoPresentationV001(spec.element)});
        continue;
      }
      const pngPath = path.join(overlayDirectory, `${record.fileStem}-${spec.kind}.png`);
      const repeatPath = path.join(overlayDirectory, `${record.fileStem}-${spec.kind}-repeat.png`);
      await overlayAdapter.renderStill(props, pngPath);
      if (sha256AutoPresentationV001(props) !== propsSha) reject('native adapter changed diagnostic drawing properties');
      await overlayAdapter.renderStill(props, repeatPath);
      if (sha256AutoPresentationV001(props) !== propsSha) reject('native adapter changed diagnostic drawing properties');
      const [png, repeat] = await Promise.all([bind(pngPath), bind(repeatPath)]);
      if (png.fileSha256 !== repeat.fileSha256) reject('diagnostic native rendering is nondeterministic');
      generatedBindings.push(png, repeat);
      const inspection = await inspectPng({instructionId: record.element.instructionId,
        pngPath, appliedOverlayPropsCanonicalSha256: propsSha, overlaySha256: png.fileSha256,
        overlayFile: path.basename(pngPath)});
      if (inspection?.overlaySha256 !== png.fileSha256
        || inspection?.appliedOverlayPropsCanonicalSha256 !== propsSha
        || !inspection.alphaBounds) reject('diagnostic PNG inspection is not bound to its actual drawing');
      alternates.push({kind: spec.kind, element: structuredClone(spec.element), props,
        pngPath, pngSha256: png.fileSha256, inspection});
      drawingEvidence.push({captionId: record.element.instructionId, kind: spec.kind,
        method: 'existing-native-adapter-twice', png, repeat,
        propsCanonicalSha256: propsSha, elementCanonicalSha256: sha256AutoPresentationV001(spec.element)});
      renderedDiagnosticStates++;
    }
    outputRecords.push({...structuredClone(record), alternates});
  }
  for (const ref of [...inputBindings, ...nativeInputs, ...generatedBindings]) {
    if ((await bind(ref.path)).fileSha256 !== ref.fileSha256) reject('fixed input changed during native preparation');
  }
  if (sha256AutoPresentationV001({plan, records, autoPresentation,
    orchestrationInput: orchestrationDrawingView === undefined ? undefined
      : exportOrchestrationDrawingViewEvidenceV001(orchestrationDrawingView), presetRegistry}) !== originalInputsSha256) {
    reject('production input objects changed during diagnostic preparation');
  }
  const prepared = {
    records: outputRecords,
    provenance: {planCanonicalSha256: sha256AutoPresentationV001(plan),
      inputRefs: [...inputBindings, planBinding, autoBinding, registryBinding]},
    evidence: {schemaVersion: 'presentation-native-frame-qc-preparation-v001',
      purpose: 'diagnostic references only; fixed automatic decisions and production artifacts are unchanged',
      baseline: inputBindings[0], productionNativeInputs: nativeInputs, drawingEvidence,
      renderedDiagnosticStates, renderedDiagnosticPngs: renderedDiagnosticStates * 2,
      reusedDiagnosticStates: drawingEvidence.length - renderedDiagnosticStates,
      preparationWallClockMs: performance.now() - started},
  };
  await writeFile(path.join(scratchDirectory, 'preparation.json'), `${JSON.stringify(prepared, null, 2)}\n`, {flag: 'wx'});
  return prepared;
}

/** Structural candidate QC inventory only. Synthetic PNG identities and bounds
 * cannot prove pixels, native visibility, measured memory, or final capacity.
 * Equal complete drawing props share an identity; different props never do.
 * Consequently the decoded-layer count bounds actual SHA-deduplicated storage
 * from above, while retaining every logical reference and sample clock. */
import {canonicalSha256} from './clock.mjs';
import {buildPresentationNativeQcAlternativeElementsV001}
  from '../../evals/clip_composition/presentation_native_frame_qc_preparation_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001}
  from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {buildPresentationPulseStateElementsV001}
  from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {buildPresentationNativeFrameQcRecipeV001, buildPresentationNativeLayerPlanV001}
  from '../../evals/clip_composition/presentation_native_frame_qc_v001.mjs';

export function buildReadabilityCandidateQcInventoryV001(view) {
  const plan = view.resolvedPlan, baselinePlan = view.projectedNormalPlan;
  const alternatives = buildPresentationNativeQcAlternativeElementsV001({plan, baselinePlan,
    orchestrationDrawingView: view, presentationTimeline: null}).alternatives;
  const physical = (element, index) => {
    const props = {schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
      canvas: structuredClone(plan.canvas), text: element.text, indexedLines: structuredClone(element.indexedLines),
      visualState: structuredClone(element.visualState), inspectionLineIndex: null,
      ...(element.presentationColorRange ? {presentationColorRange: structuredClone(element.presentationColorRange)} : {})};
    const digest = canonicalSha256(props);
    return {element: structuredClone(element), props, fileStem: 'structural-' + index,
      pngPath: '/structural-capacity-only/' + digest + '.png', pngSha256: digest,
      inspection: {instructionId: element.instructionId, overlaySha256: digest,
        appliedOverlayPropsCanonicalSha256: digest,
        alphaBounds: {left: 0, top: 0, right: plan.canvas.width, bottom: plan.canvas.height,
          width: plan.canvas.width, height: plan.canvas.height}}};
  };
  const records = plan.elements.map((element, index) => {
    let result;
    const key = element.presentationMotion ? 'motionStates' : element.presentationPulse ? 'pulseStates' : null;
    if (key) {
      const build = key === 'motionStates' ? buildPresentationCaptionMotionStateElementsV001 : buildPresentationPulseStateElementsV001;
      const states = build({element, canvas: plan.canvas}).map(row => ({...physical(row.element, index), state: row.state}));
      result = {...states[0], element: structuredClone(element), [key]: states,
        inspection: {...states[0].inspection,
          [key === 'motionStates' ? 'motion' : 'pulse']: {states: states.map(row => ({state: row.state, ...row.inspection}))}}};
    } else result = physical(element, index);
    result.alternates = alternatives[index].entries.map(row => ({...physical(row.element, index), kind: row.kind}));
    return result;
  });
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, records, orchestrationDrawingView: view});
  const layers = buildPresentationNativeLayerPlanV001({samples: recipe.samples, sceneBindings: recipe.sceneBindings,
    directory: '/structural-capacity-only/layers', canvas: plan.canvas});
  const layersByFadeNumerator = Object.fromEntries([1, 2, 3, 4].map(n => [n, layers.layers.filter(row => row.numerator === n).length]));
  const summary = {schemaVersion: 'readability-candidate-native-structural-inventory-v001',
    scope: 'Exact logical recipe enumeration; synthetic complete-props identities for a decoded-layer storage upper bound. Not QC evidence or measured capacity.',
    captions: plan.elements.length, nativeStates: recipe.sceneBindings.reduce((n, row) => n + row.states.length, 0),
    samples: recipe.samples.length, logicalReferences: recipe.samples.reduce((n, row) => n + row.references.length, 0),
    wholeColorAlternatives: recipe.sceneBindings.reduce((n, row) => n + row.alternates.filter(a => a.kind === 'whole-color').length, 0),
    captionKinds: Object.fromEntries([...new Set(recipe.sceneBindings.map(row => row.selectedKind))]
      .map(kind => [kind, recipe.sceneBindings.filter(row => row.selectedKind === kind).length])),
    fullCanvasPlanarBytesPerLayer: plan.canvas.width * plan.canvas.height * 4,
    decodedLayerCountUpperBound: layers.layers.length,
    decodedLayerLogicalBytesUpperBound: layers.layers.reduce((n, row) => n + row.width * row.height * 4, 0),
    layersByFadeNumerator,
    generatedFadePngCountUpperBound: layers.layers.filter(row => row.generated).length,
    extractedFullFramePngCount: new Set(recipe.samples.map(row => row.frame)).size * 2,
    unmeasured: ['PNG/MP4 compression sizes', 'serialized shared evidence bytes', 'real RGB crop bounds',
      'new failure count and retained RGB bytes', 'browser and OS temporary storage', 'memory and physical I/O'],
  };
  return {summary, recipe, records};
}

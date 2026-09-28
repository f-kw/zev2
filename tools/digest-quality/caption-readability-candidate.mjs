/** Explicit 7A candidate construction over saved choices and source clocks.
 * No file paths, material IDs, media work, AI, or production-default mutation.
 * The orchestration caller authenticates its source view before entering here. */
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {buildReadabilitySourceAtomsV001} from './caption-readability-source.mjs';
import {restoreCaptionReadabilityPlanV001} from './caption-readability-plan.mjs';
import {materializeFiniteAutoPresentationCaptionV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {getPresentationPulseProgramV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';

const VERSION = 'candidate-readability-v001';
const clone = structuredClone;
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const require = (ok, message) => {if (!ok) throw new TypeError('READABILITY_CANDIDATE_INVALID: ' + message);};
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
const versionCheck = version => require(version === VERSION, 'explicit candidate version required');
const presentationKeys = ['overlaySha256', 'presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion'];

export const READABILITY_CANDIDATE_PROFILE_V001 = freeze({
  schemaVersion: 'caption-readability-candidate-profile-v001', version: VERSION,
  adoption: 'not-adopted-final-integrated-human-review-required',
  normalFontSizePx: 144, scaleFontSizePx: 192, borderWidthPx: 4, glowWidthPx: 4,
  outlineColor: '#2F4F4F', outlineColorOrigin: 'DarkSlateGray named color',
  geometryEngine: 'normal-landscape-render-layout-v001', horizontalSafeMarginRatio: 0,
  safeAreaPx: {left: 4, right: 4, top: 40, bottom: 40},
  protectionReason: 'Existing engine minimum 4px; full stroke/glow raster must fit. Vertical placement protection retained.',
});

function styleCandidate(state) {
  const result = clone(state), p = READABILITY_CANDIDATE_PROFILE_V001, s = result?.textStyle;
  require(s && [96, 128].includes(s.fontSizePx), 'source caption must have its saved 96/128px finite font');
  s.fontSizePx = s.fontSizePx === 128 ? p.scaleFontSizePx : p.normalFontSizePx;
  if (!result.background) Object.assign(s, {borderWidthPx: p.borderWidthPx, glowWidthPx: p.glowWidthPx,
    borderColor: p.outlineColor, glowColor: p.outlineColor});
  return result;
}
function candidatePlan(plan) {
  require(plan?.canvas?.fps === 30 && plan.layoutRules && Array.isArray(plan.elements), 'source plan required');
  const result = clone(plan);
  result.canvas.safeAreaPx = clone(READABILITY_CANDIDATE_PROFILE_V001.safeAreaPx);
  result.layoutRules.horizontalSafeMarginRatio = READABILITY_CANDIDATE_PROFILE_V001.horizontalSafeMarginRatio;
  result.schemaVersion = 'presentation-output-common-core-plan-v001';
  for (const e of result.elements) if (e.kind === 'speech-caption') e.visualState = styleCandidate(e.visualState);
  return result;
}

/** The outer execution binding identifies this effective registry. Element
 * registry/profile IDs remain the source provenance, never an old trust grant. */
export function buildReadabilityCandidateRegistryV001({registry, version}) {
  versionCheck(version);
  require(registry?.schemaVersion === 'presentation-preset-registry-v001'
    && registry.registryVersion !== VERSION && Array.isArray(registry.presets), 'original registry required');
  const result = clone(registry);
  result.registryVersion = VERSION;
  result.canvas.safeAreaPx = clone(READABILITY_CANDIDATE_PROFILE_V001.safeAreaPx);
  let changed = 0;
  for (const preset of result.presets) for (const policy of preset.kindPolicies) {
    if (policy.kind !== 'speech-caption') continue;
    const state = preset.visualStates.find(row => row.stateId === policy.stateId);
    require(state && !state.background && state.textStyle.fontSizePx === 96, 'normal caption registry state differs');
    Object.assign(state, styleCandidate(state)); changed++;
  }
  require(changed > 0, 'registry has no normal caption state');
  return freeze(result);
}

function temporal(program) {
  return {segments: program.segments.map(({startFrame, endFrameExclusive}) => ({startFrame, endFrameExclusive})),
    samples: program.samples.map(s => s.frame)};
}
/** Uses the existing finite selector/range/peak validator. Only the explicitly
 * authorized candidate drawing profile and finite state version are changed. */
export function materializeReadabilityCandidateCaptionV001({element, canvas, selection, measuredPeak, sourceVisualState, version}) {
  versionCheck(version);
  require(element?.kind === 'speech-caption' && !element.visualState?.background
    && element.visualState?.textStyle?.fontSizePx === 144
    && !presentationKeys.some(k => Object.hasOwn(element, k)), 'true normal 144px child required');
  require(!Object.hasOwn(selection ?? {}, 'presetVersion') && !Object.hasOwn(selection ?? {}, 'speechEndFrame'),
    'no candidate state program is defined for the saved speech-return variant');
  const old = clone(element); old.visualState.textStyle.fontSizePx = 96;
  if (selection?.role === 'Panel accent') {
    require(sourceVisualState && !sourceVisualState.background && sourceVisualState.textStyle?.fontSizePx === 96,
      'Panel must retain its original normal style provenance');
    require(same(styleCandidate(sourceVisualState), element.visualState), 'Panel source style differs from candidate baseline');
    old.visualState = clone(sourceVisualState);
  }
  const finite = materializeFiniteAutoPresentationCaptionV001({element: old, canvas, selection,
    ...(measuredPeak === undefined ? {} : {measuredPeak})});
  const result = {...clone(finite), visualState: styleCandidate(finite.visualState)};
  if (finite.presentationMotion) {
    result.presentationMotion = {...finite.presentationMotion, presetVersion: 'presentation-caption-motion-readability-v001'};
    require(same(temporal(getPresentationCaptionMotionProgramV001({element: finite, canvas})),
      temporal(getPresentationCaptionMotionProgramV001({element: result, canvas}))), 'candidate changed the motion clock');
  }
  if (finite.presentationPulse) {
    result.presentationPulse = {...finite.presentationPulse, presetVersion: 'presentation-pulse-readability-v001'};
    require(same(temporal(getPresentationPulseProgramV001({element: finite, canvas})),
      temporal(getPresentationPulseProgramV001({element: result, canvas})))
      && result.presentationPulse.anchorFrame === finite.presentationPulse.anchorFrame, 'candidate changed the measured Pulse clock');
  }
  return freeze(result);
}

function effectOf(element) {
  if (element.presentationMotion) return {kind: element.presentationMotion.presentation === 'provisional-bounce' ? 'bounce' : 'shake'};
  if (element.presentationPulse) return {kind: 'pulse'};
  if (element.visualState.background) return {kind: 'panel'};
  if (element.visualState.textStyle.fontSizePx === 192) return {kind: 'scale'};
  if (element.presentationColorRange) return {kind: 'color', range: {
    startCodePoint: element.presentationColorRange.startCodePoint,
    endCodePointExclusive: element.presentationColorRange.endCodePointExclusive}};
  return {kind: 'normal'};
}
const evidenceAtoms = row => row.atoms.map(a => ({atomId: a.atomId, text: a.text,
  startFrame: a.startFrame, endFrameExclusive: a.endFrameExclusive,
  sourceStartMs: a.sourceSpans[0].sourceStartMs, sourceEndMs: a.sourceSpans.at(-1).sourceEndMs,
  timelineSegmentId: a.sourceSpans[0].timelineSegmentId}));

/** A caller can measure this complete normal/Panel/Scale geometry with the
 * real font, then save its finite semantic/width evidence for strict restore. */
export function prepareReadabilityCandidatePlanV001({version, sourceView, source, meaning}) {
  versionCheck(version);
  require(sourceView && !sourceView.candidateExecution && sourceView.projectedNormalPlan && sourceView.resolvedPlan,
    'original drawing view required');
  const {viewSha256, ...body} = sourceView;
  require(viewSha256 === canonicalSha256(body), 'source drawing view content differs');
  require(source?.planBytes && source.timelineBytes && same(source.planRef, sourceView.sourceRefs.planRef)
    && same(source.timelineRef, sourceView.sourceRefs.timelineRef)
    && same(source.mediaRef, sourceView.sourceRefs.mediaRef), 'original saved source references differ');
  const sourceAtoms = buildReadabilitySourceAtomsV001({finalPlan: sourceView.resolvedPlan, meaning,
    baseTimeline: JSON.parse(source.timelineBytes), projection: sourceView.projection,
    sourcePlanBytes: source.planBytes, baseTimelineBytes: source.timelineBytes});
  const segmentationPlan = candidatePlan(sourceView.resolvedPlan);
  const rows = new Map(sourceAtoms.captions.map(r => [r.captionId, r])), effectKinds = [];
  for (const e of segmentationPlan.elements) {
    if (e.kind !== 'speech-caption') continue;
    effectKinds.push({captionId: e.instructionId, effect: effectOf(e)});
    const atoms = evidenceAtoms(rows.get(e.instructionId));
    for (const key of presentationKeys) delete e[key];
    Object.assign(e, {sourceStartMs: atoms[0].sourceStartMs, sourceEndMs: atoms.at(-1).sourceEndMs,
      timelineSegmentId: atoms[0].timelineSegmentId});
  }
  return freeze({version, sourceViewSha256: viewSha256, segmentationPlan, sourceAtoms, effectKinds});
}

function peakFor(sourceView, selection) {
  if (selection.role !== 'Pulse accent') return undefined;
  const peak = sourceView.projectedPeaks.find(p => p.peakId === selection.anchorPeakId);
  require(peak, 'saved projected Pulse measurement missing');
  return {peakId: peak.peakId, peakSample: peak.displaySample, sampleRate: peak.sampleRate};
}
function selectionOnChild({selection, parent, mapping, child, canvas, sourceView}) {
  if (selection === null) return null;
  require(selection && typeof selection.role === 'string', 'saved selection missing');
  if (selection.role === 'Normal') return clone(selection);
  const sourceEffect = materializeFiniteAutoPresentationCaptionV001({element: parent, canvas, selection,
    ...(selection.role === 'Pulse accent' ? {measuredPeak: peakFor(sourceView, selection)} : {})});
  if (selection.role !== 'Focus') {
    require(mapping.children.length === 1, 'saved whole-caption automatic/override effect cannot be split');
    return clone(selection);
  }
  const range = sourceEffect.presentationColorRange;
  if (range.endCodePointExclusive <= child.startCodePoint || range.startCodePoint >= child.endCodePointExclusive) return {role: 'Normal'};
  require(range.startCodePoint >= child.startCodePoint && range.endCodePointExclusive <= child.endCodePointExclusive,
    'fixed child boundary cuts a saved automatic/override Color target');
  if (selection.scope === 'whole-caption') {
    require(mapping.children.length === 1, 'whole Color cannot silently become partial Color');
    return clone(selection);
  }
  const text = [...parent.text].slice(child.startCodePoint, child.endCodePointExclusive).join('');
  const localStart = range.startCodePoint - child.startCodePoint;
  const target = [...selection.targetText];
  const points = [...text];
  const matches = [];
  for (let i = 0; i + target.length <= points.length; i++) if (points.slice(i, i + target.length).join('') === selection.targetText) matches.push(i);
  const occurrence = matches.indexOf(localStart) + 1;
  require(occurrence > 0, 'child Color target cannot reproduce its exact saved range');
  const result = clone(selection);
  if (occurrence !== 1 || Object.hasOwn(selection, 'occurrence')) result.occurrence = occurrence;
  return result;
}

/** Recompute partitions and drawing from saved source/meaning, not cached
 * candidate success. Both the normal baseline and styled result use child IDs.
 * All original automatic selections are mapped too: Reset must remain possible
 * without a new semantic split or a fresh AI call. */
export function buildReadabilityCandidateV001({version, sourceView, source, meaning, evidence, savedResolution}) {
  const prepared = prepareReadabilityCandidatePlanV001({version, sourceView, source, meaning});
  require(evidence?.clockId === sourceView.projection.projectionSha256, 'saved measurement projection differs');
  const p = READABILITY_CANDIDATE_PROFILE_V001;
  require(evidence.maxWidthPx === prepared.segmentationPlan.canvas.width - p.safeAreaPx.left - p.safeAreaPx.right,
    'measured usable width differs from the candidate safe area');
  require(evidence.captions?.length === prepared.sourceAtoms.captions.length, 'saved measurement coverage differs');
  for (const [i, row] of prepared.sourceAtoms.captions.entries()) {
    require(evidence.captions[i].captionId === row.captionId
      && same(evidence.captions[i].atoms, evidenceAtoms(row)), 'saved atoms differ from original source/meaning clocks');
    require(same(evidence.captions[i].effect, prepared.effectKinds[i].effect), 'saved effect meaning differs');
  }
  const split = restoreCaptionReadabilityPlanV001({normalPlan: prepared.segmentationPlan, evidence, saved: savedResolution});
  const normalBase = candidatePlan(sourceView.projectedNormalPlan);
  const normalById = new Map(sourceView.projectedNormalPlan.elements.map(e => [e.instructionId, e]));
  const candidateNormalById = new Map(normalBase.elements.map(e => [e.instructionId, e]));
  const splitById = new Map(split.normalPlan.elements.map(e => [e.instructionId, e]));
  const effectiveById = new Map(sourceView.effectiveSelections.map(row => [row.captionId, row]));
  const resolutionById = new Map(sourceView.resolution.caption.captions.map(row => [row.captionId, row]));
  const normalChildren = new Map(), resolvedChildren = new Map(), effectiveSelections = [], captionRows = [];
  for (const mapping of split.captionMappings) {
    const parent = normalById.get(mapping.parentCaptionId), normal = candidateNormalById.get(mapping.parentCaptionId);
    const selected = effectiveById.get(mapping.parentCaptionId), row = resolutionById.get(mapping.parentCaptionId);
    require(parent && normal && selected && row && same(selected.selection, row.effectiveSelection), 'source selection membership differs');
    require(!parent.visualState.background && parent.visualState.textStyle.fontSizePx === 96
      && !presentationKeys.some(k => Object.hasOwn(parent, k)), 'source projected baseline is not Normal');
    const normals = [], resolved = [];
    for (const child of mapping.children) {
      const element = {...clone(splitById.get(child.captionId)), visualState: clone(normal.visualState)};
      const adapt = selection => selectionOnChild({selection, parent, mapping, child,
        canvas: sourceView.projectedNormalPlan.canvas, sourceView});
      const effective = adapt(row.effectiveSelection), automatic = adapt(row.automaticSelection);
      const rendered = materializeReadabilityCandidateCaptionV001({version, element,
        canvas: normalBase.canvas, selection: effective, sourceVisualState: parent.visualState,
        ...(effective.role === 'Pulse accent' ? {measuredPeak: peakFor(sourceView, effective)} : {})});
      const mapped = split.effectMappings.find(e => e.childCaptionId === child.captionId);
      require(same(effectOf(rendered), mapped ? mapped.kind === 'color'
        ? {kind: 'color', range: mapped.range} : {kind: mapped.kind} : {kind: 'normal'}), 'resolved child effect differs from saved partition');
      normals.push(element); resolved.push(rendered);
      effectiveSelections.push({...clone(selected), captionId: child.captionId, selection: effective});
      const canonicalRange = rendered.presentationColorRange
        ? {startCodePoint: rendered.presentationColorRange.startCodePoint,
          endCodePointExclusive: rendered.presentationColorRange.endCodePointExclusive} : null;
      captionRows.push({...clone(row), captionId: child.captionId, role: effective.role,
        automaticSelection: automatic, effectiveSelection: effective, canonicalRange,
        automaticStatus: automatic === null ? row.automaticStatus : automatic.role === 'Normal' ? 'normal' : 'selected'});
    }
    normalChildren.set(parent.instructionId, normals); resolvedChildren.set(parent.instructionId, resolved);
  }
  const projectedNormalPlan = {...normalBase, elements: normalBase.elements.flatMap(e => normalChildren.get(e.instructionId) ?? [e])};
  const resolvedPlan = {...clone(projectedNormalPlan),
    elements: normalBase.elements.flatMap(e => resolvedChildren.get(e.instructionId) ?? [clone(e)])};
  const resolution = {...clone(sourceView.resolution), caption: {...clone(sourceView.resolution.caption), captions: captionRows,
    exceptions: sourceView.resolution.caption.exceptions.flatMap(row => {
      const mapping = split.captionMappings.find(m => m.parentCaptionId === row.captionId);
      require(mapping, 'saved automatic exception has no candidate parent');
      return mapping.children.map(child => ({...clone(row), captionId: child.captionId}));
    })}, counts: {...clone(sourceView.resolution.counts), captions: {
      total: captionRows.length,
      explicitNormal: captionRows.filter(row => row.automaticSelection?.role === 'Normal').length,
      selected: captionRows.filter(row => row.automaticSelection && row.automaticSelection.role !== 'Normal').length,
      unresolved: captionRows.filter(row => row.automaticStatus === 'unresolved').length,
      unrepresentable: captionRows.filter(row => row.automaticStatus === 'unrepresentable').length,
    }}};
  const body = {version, sourceViewSha256: sourceView.viewSha256,
    sourceBindings: clone(prepared.sourceAtoms.sourceBindings), evidenceSha256: split.evidenceSha256,
    savedResolutionSha256: split.planSha256, projectedNormalPlan, resolvedPlan,
    captionMappings: clone(split.captionMappings), effectMappings: clone(split.effectMappings),
    effectiveSelections, resolution, profile: clone(p), summary: clone(split.summary), humanQuality: 'not-evaluated'};
  return freeze({...body, candidateSha256: canonicalSha256(body)});
}

/** Finite semantic choices, four independent saved records, and one drawing clock. */
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {omitPresentationPanelPlateForInspectionV002} from './presentation_panel_presets_v002.mjs';
import {sha256AutoPresentationV001, fixAutoPresentationProposalV001,
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001, materializeFiniteAutoPresentationCaptionV001}
  from './presentation_auto_effects_v001.mjs';
import {createConnectionExpressionContextV001, createConnectionExpressionOriginalV001,
  createConnectionExpressionOverridesV001, setConnectionExpressionOverrideV001,
  resetConnectionExpressionOverrideV001, resolveConnectionExpressionV001}
  from './connection_expression_v001.mjs';
import {createOrchestrationProjectionV001, projectCaptionPlanV001, projectAudioPeakV001,
  projectAudioEvidenceIntervalV001} from './presentation_orchestration_projection_v001.mjs';

export const ORCHESTRATION_VERSION_V001 = 'presentation-orchestration-v001';
const contexts = new WeakMap(), views = new WeakMap();
const clone = value => structuredClone(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(canonicalJson(value));
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => {throw new TypeError('ORCHESTRATION_INVALID: ' + message);};
const require = (condition, message) => {if (!condition) fail(message);};
const exact = (value, keys, name) => require(object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)), name + ' fields');
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
function utf8(value, name) {
  require(typeof value === 'string' || Buffer.isBuffer(value) || value instanceof Uint8Array, name + ' bytes');
  const bytes = Buffer.from(value), text = bytes.toString('utf8');
  require(bytes.equals(Buffer.from(text, 'utf8')), name + ' lossless UTF-8');
  return text;
}
function json(text, name) {try {return JSON.parse(text);} catch {fail(name + ' JSON');}}
const contextData = context => {
  const data = contexts.get(context);
  require(data !== undefined, 'context must be rebuilt from bound original bytes');
  return data;
};
const viewData = view => {
  const data = views.get(view);
  require(data !== undefined, 'drawing view must be derived from current saved state');
  return data;
};
const SOURCE_KEYS = ['digestRef', 'planRef', 'timelineRef', 'mediaRef', 'planBytes', 'timelineBytes',
  'playbackSampleRate', 'observationSampleRate', 'captionContext', 'decisionInputBytes'];

/** The IO boundary separately verifies media and native measurement file bytes.
 * This boundary binds original JSON bytes, original caption context and both clocks. */
export function createOrchestrationContextV001(options) {
  exact(options, SOURCE_KEYS, 'context creation');
  const source = clone({...options, planBytes: utf8(options.planBytes, 'normal plan'),
    timelineBytes: utf8(options.timelineBytes, 'timeline'),
    decisionInputBytes: utf8(options.decisionInputBytes, 'native decision binding')});
  const plan = json(source.planBytes, 'normal plan'), decision = json(source.decisionInputBytes, 'native binding');
  require(source.planRef.fileSha256 === sha(source.planBytes)
    && source.planRef.fileSha256 === source.captionContext.baselineRef.fileSha256,
  'original caption plan bytes differ');
  require(source.captionContext.baselineRef.canonicalSha256 === sha256AutoPresentationV001(plan),
    'original caption plan canonical SHA differs');
  require(sha(source.decisionInputBytes) === source.captionContext.decisionInputRef.fileSha256
    && decision.schemaVersion === 'presentation-focus-decision-input-v005'
    && same(decision.pulseTimingEvidence, source.captionContext.pulseTimingEvidence), 'native timing binding differs');
  require(source.captionContext.pulseTimingEvidence === null
    || source.captionContext.pulseTimingEvidence.sampleRate === source.observationSampleRate,
  'native measurement and observation sample clocks differ');
  resolveAutoPresentationV001({baselinePlan: plan, context: source.captionContext});
  const connectionContext = createConnectionExpressionContextV001({digestRef: source.digestRef,
    planBytes: source.planBytes, timelineBytes: source.timelineBytes});
  const projectionOptions = Object.fromEntries(SOURCE_KEYS.slice(0, 8).map(key => [key, source[key]]));
  const initialProjection = createOrchestrationProjectionV001({...projectionOptions,
    connections: connectionContext.connections.map(row => ({connectionId: row.connectionId,
      preset: 'normal-cut', presetVersion: 'v001'}))});
  const identity = {schemaVersion: 'presentation-orchestration-context-v001', version: ORCHESTRATION_VERSION_V001,
    digestRef: source.digestRef, sourceClockSha256: initialProjection.sourceClockSha256,
    captionContextSha256: hash(source.captionContext), captionIds: plan.elements.filter(row => row.kind === 'speech-caption')
      .map(row => row.instructionId), connectionIds: connectionContext.connections.map(row => row.connectionId)};
  const context = freeze({...identity, contextSha256: hash(identity)});
  contexts.set(context, freeze({source, plan, decision, projectionOptions, connectionContext, initialProjection}));
  return context;
}

const group = freeze({normal: ['normal'], focus: ['color', 'panel'],
  'vocal-energy': ['scale', 'pulse'], reaction: ['bounce', 'shake']});
export function orchestrationCaptionChoiceToSelectionV001(choice) {
  require(object(choice), 'caption choice');
  if (choice.preset === 'color') {
    const keys = ['preset', 'scope'];
    if (choice.scope === 'partial-caption') {keys.push('targetText'); if (Object.hasOwn(choice, 'occurrence')) keys.push('occurrence');}
    exact(choice, keys, 'Color choice');
    const {preset: ignored, ...scope} = choice;
    return {role: 'Focus', presentation: 'provisional-focus', ...scope};
  }
  if (choice.preset === 'pulse') {
    exact(choice, ['preset', 'anchorPeakId'], 'Pulse choice');
    return {role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId: choice.anchorPeakId};
  }
  exact(choice, ['preset'], 'finite caption choice');
  if (choice.preset === 'normal') return {role: 'Normal'};
  const name = {scale: ['Vocal accent', 'provisional-vocal'], panel: ['Panel accent', 'provisional-panel'],
    'panel-graph-paper': ['Panel accent', 'provisional-panel-graph-paper'],
    'panel-comic-frame': ['Panel accent', 'provisional-panel-comic-frame'],
    bounce: ['Bounce accent', 'provisional-bounce'], shake: ['Shake accent', 'provisional-shake']}[choice.preset];
  require(name !== undefined, 'unknown finite caption choice');
  return {role: name[0], presentation: name[1], scope: 'whole-caption'};
}

function checkOneChoice(data, captionId, choice) {
  const selection = orchestrationCaptionChoiceToSelectionV001(choice);
  const element = data.plan.elements.find(row => row.instructionId === captionId);
  const peak = choice.preset === 'pulse'
    ? data.source.captionContext.pulseTimingEvidence?.peaks.find(row => row.peakId === choice.anchorPeakId) : undefined;
  materializeFiniteAutoPresentationCaptionV001({element, canvas: data.plan.canvas, selection,
    ...(choice.preset === 'pulse' ? {measuredPeak: peak ? {peakId: peak.peakId, peakSample: peak.peakSample,
      sampleRate: data.source.captionContext.pulseTimingEvidence.sampleRate} : null} : {})});
}
function checkCoverage(rows, ids, key, name) {
  require(Array.isArray(rows) && rows.length === ids.length
    && new Set(rows.map(row => row?.[key])).size === ids.length
    && rows.every(row => ids.includes(row?.[key])), name + ' complete unique coverage required');
}

/** Explicitly accepted semantic evidence only: never a prior answer, preset table,
 * or prior result. The calling producer extracts these fields from original evidence. */
export function createOrchestrationJudgmentInputV001({context, evidence}) {
  const data = contextData(context);
  exact(evidence, ['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'], 'semantic evidence');
  require(nonempty(evidence.productionPurpose), 'production purpose');
  checkCoverage(evidence.captions, context.captionIds, 'captionId', 'input caption');
  require(Array.isArray(evidence.contexts) && Array.isArray(evidence.observations)
    && Array.isArray(evidence.audioCandidates), 'evidence arrays');
  const contextIds = evidence.contexts.map(row => row.contextId);
  require(new Set(contextIds).size === contextIds.length && contextIds.every(nonempty), 'context IDs');
  for (const row of evidence.contexts) exact(row, ['contextId', 'description'], 'semantic context');
  for (const row of evidence.captions) {
    exact(row, ['captionId', 'text', 'contextId', 'startFrame', 'endFrameExclusive', 'eligiblePulsePeakIds'], 'input caption');
    const original = data.plan.elements.find(element => element.instructionId === row.captionId);
    require(row.text === original.text && row.startFrame === original.startFrame
      && row.endFrameExclusive === original.endFrameExclusive && contextIds.includes(row.contextId), 'caption source identity differs');
    require(Array.isArray(row.eligiblePulsePeakIds) && new Set(row.eligiblePulsePeakIds).size === row.eligiblePulsePeakIds.length,
      'eligible peak IDs');
    for (const anchorPeakId of row.eligiblePulsePeakIds) checkOneChoice(data, row.captionId, {preset: 'pulse', anchorPeakId});
  }
  const timing = data.source.captionContext.pulseTimingEvidence;
  require(timing === null ? evidence.audioEvidence === null : object(evidence.audioEvidence)
    && ['sourceRef', 'candidatesRef', 'sampleRate', 'sampleCount'].every(key => same(evidence.audioEvidence[key], timing[key])),
  'audio semantic evidence native binding differs');
  const nativeCandidateIds = new Set(timing?.candidates.map(row => row.candidateId) ?? []);
  require(evidence.audioCandidates.length === nativeCandidateIds.size
    && new Set(evidence.audioCandidates.map(row => row.candidateId)).size === evidence.audioCandidates.length
    && evidence.audioCandidates.every(row => nativeCandidateIds.has(row.candidateId)), 'audio candidate ID differs');
  for (const row of evidence.audioCandidates) for (const key of ['asrSegments', 'asrContext']) {
    if (Object.hasOwn(row, key)) require(Array.isArray(row[key])
      && row[key].every(observation => object(observation) && nonempty(observation.id)), 'ASR observation IDs');
  }
  for (const row of evidence.observations) {
    exact(row, ['observationId', 'kind', 'captionIds', 'description'], 'physical observation');
    require(nonempty(row.observationId) && nonempty(row.description) && Array.isArray(row.captionIds)
      && row.captionIds.every(id => context.captionIds.includes(id)), 'physical observation references');
  }
  const captions = context.captionIds.map(id => clone(evidence.captions.find(row => row.captionId === id)));
  const connections = data.connectionContext.connections.map(connection => {
    const beforeCaptions = captions.filter(row => row.endFrameExclusive <= connection.boundaryFrame);
    const afterCaptions = captions.filter(row => row.startFrame >= connection.boundaryFrame);
    const before = beforeCaptions.at(-1), after = afterCaptions[0];
    require(before && after, 'connection requires adjacent semantic caption context');
    return {...connection, beforeCaptionId: before.captionId, afterCaptionId: after.captionId,
      beforeContextId: before.contextId, afterContextId: after.contextId,
      audioCandidateIds: evidence.audioCandidates.filter(row =>
        row.startSample * 30 < connection.boundaryFrame * timing.sampleRate
        && row.endSampleExclusive * 30 > connection.boundaryFrame * timing.sampleRate).map(row => row.candidateId)};
  });
  const body = {schemaVersion: 'presentation-orchestration-judgment-input-v001', contextSha256: context.contextSha256,
    digestRef: clone(context.digestRef), sourceClockSha256: context.sourceClockSha256,
    orchestrationVersion: ORCHESTRATION_VERSION_V001,
    productionPurpose: evidence.productionPurpose, captionRolePresets: clone(group),
    connectionRolePresets: {continuation: ['normal-cut'], separator: ['black-separator', 'soft-separator'],
      either: ['normal-cut', 'black-separator', 'soft-separator']},
    policy: {completeCoverage: true, chooseSemanticAllowedSetsOnly: true, explicitNormal: true,
      oneChoicePerPreset: true, noQuotas: true, noSequenceAssignment: true, noSavedPriorAnswers: true,
      unresolvedAndUnrepresentableAreNotNormal: true, automaticSelection: 'SHA256-canonical-tuple-modulo-sorted-allowed-presets'},
    captions, connections, contexts: clone(evidence.contexts), observations: clone(evidence.observations),
    audioEvidence: clone(evidence.audioEvidence), audioCandidates: clone(evidence.audioCandidates)};
  return freeze({...body, inputSha256: hash(body)});
}
function checkInput(context, input) {
  require(object(input), 'judgment input');
  const expected = createOrchestrationJudgmentInputV001({context, evidence: Object.fromEntries(
    ['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'].map(key => [key, input[key]]))});
  require(same(input, expected), 'judgment input source or hash differs');
}

/** Stable serialization is the unambiguous tuple [Digest SHA, version, kind, ID].
 * The full digest is used. Candidate input order never determines selection. */
export function selectOrchestrationPresetV001({digestSha256, kind, itemId, allowedPresets}) {
  require(/^[a-f0-9]{64}$/.test(digestSha256) && ['caption', 'connection'].includes(kind)
    && nonempty(itemId) && Array.isArray(allowedPresets) && allowedPresets.length > 0, 'stable selection inputs');
  const key = value => typeof value === 'string' ? value : value.preset;
  require(allowedPresets.every(value => nonempty(key(value)))
    && new Set(allowedPresets.map(key)).size === allowedPresets.length, 'duplicate preset in allowed set');
  const sorted = [...allowedPresets].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  const selectionSha256 = sha(canonicalJson([digestSha256, ORCHESTRATION_VERSION_V001, kind, itemId]));
  const selectedIndex = Number(BigInt('0x' + selectionSha256) % BigInt(sorted.length));
  return freeze({selectionSha256, allowedPresets: clone(sorted), selectedIndex, selectedPreset: clone(sorted[selectedIndex])});
}

function evaluateReply(context, input, replyBytes) {
  const data = contextData(context);
  checkInput(context, input);
  const raw = utf8(replyBytes, 'judgment reply'), reply = json(raw, 'judgment reply');
  exact(reply, ['schemaVersion', 'inputSha256', 'completion', 'captions', 'connections'], 'judgment reply');
  require(reply.schemaVersion === 'presentation-orchestration-judgment-v001'
    && reply.inputSha256 === input.inputSha256 && reply.completion === 'complete', 'complete fresh judgment binding required');
  checkCoverage(reply.captions, context.captionIds, 'captionId', 'reply caption');
  checkCoverage(reply.connections, context.connectionIds, 'connectionId', 'reply connection');
  const knownEvidence = new Set([...context.captionIds, ...context.connectionIds,
    ...input.contexts.map(row => row.contextId), ...input.observations.map(row => row.observationId),
    ...input.audioCandidates.map(row => row.candidateId),
    ...input.audioCandidates.flatMap(row => [...(row.asrSegments ?? []), ...(row.asrContext ?? [])].map(observation => observation.id)),
    ...(data.source.captionContext.pulseTimingEvidence?.peaks.map(row => row.peakId) ?? [])]);
  const resolveRow = (row, kind) => {
    const idKey = kind + 'Id', id = row[idKey];
    exact(row, [idKey, 'status', 'semanticRole', 'allowedPresets', 'reason', 'evidenceIds'], 'semantic judgment row');
    require(['resolved', 'unresolved', 'unrepresentable'].includes(row.status) && nonempty(row.reason)
      && Array.isArray(row.evidenceIds) && row.evidenceIds.length > 0 && new Set(row.evidenceIds).size === row.evidenceIds.length
      && row.evidenceIds.every(value => knownEvidence.has(value)) && Array.isArray(row.allowedPresets), 'status, reason, or evidence references');
    if (row.status !== 'resolved') {
      require(row.semanticRole === null && row.allowedPresets.length === 0, 'exceptions must retain their status without an allowed set');
      return {...clone(row), selection: null};
    }
    require(row.allowedPresets.length > 0, 'resolved judgment needs explicit allowed set, including Normal');
    if (kind === 'caption') {
      require(Object.hasOwn(group, row.semanticRole), 'caption semantic role');
      const observed = input.captions.find(value => value.captionId === id);
      for (const choice of row.allowedPresets) {
        require(group[row.semanticRole].includes(choice.preset), 'preset outside semantic role');
        require(!input.observations.some(value => value.kind === choice.preset + '-unrepresentable'
          && value.captionIds.includes(id)), 'physically unrepresentable preset in allowed set');
        if (choice.preset === 'pulse') require(observed.eligiblePulsePeakIds.includes(choice.anchorPeakId), 'Pulse anchor not eligible');
        checkOneChoice(data, id, choice);
      }
      require(!row.allowedPresets.some(value => value.preset === 'color' && value.scope === 'partial-caption')
        || row.allowedPresets.length === 1, 'partial-caption focus has only Color');
    } else {
      const allowed = input.connectionRolePresets[row.semanticRole];
      require(allowed && row.allowedPresets.every(value => typeof value === 'string' && allowed.includes(value)), 'connection semantic role/preset');
      if (row.semanticRole === 'either') require(row.allowedPresets.includes('normal-cut')
        && row.allowedPresets.some(value => value !== 'normal-cut'), 'either requires both continuation and separator');
    }
    return {...clone(row), selection: selectOrchestrationPresetV001({digestSha256: context.digestRef.sha256,
      kind, itemId: id, allowedPresets: row.allowedPresets})};
  };
  return {raw, captions: context.captionIds.map(id => resolveRow(reply.captions.find(row => row.captionId === id), 'caption')),
    connections: context.connectionIds.map(id => resolveRow(reply.connections.find(row => row.connectionId === id), 'connection'))};
}
function compile(context, input, replyBytes) {
  const data = contextData(context), evaluated = evaluateReply(context, input, replyBytes);
  const effects = evaluated.captions.filter(row => row.selection && row.selection.selectedPreset.preset !== 'normal')
    .map(row => ({captionId: row.captionId, ...orchestrationCaptionChoiceToSelectionV001(row.selection.selectedPreset)}));
  const exceptions = evaluated.captions.filter(row => row.status !== 'resolved')
    .map(row => ({captionId: row.captionId, status: row.status, reason: row.reason}));
  const captionAuto = fixAutoPresentationProposalV001({baselinePlan: data.plan, context: data.source.captionContext,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context: clone(data.source.captionContext),
      targetCaptionIds: [...context.captionIds], completion: 'complete', effects, exceptions}});
  const connectionAuto = createConnectionExpressionOriginalV001({context: data.connectionContext,
    selections: evaluated.connections.map(row => ({connectionId: row.connectionId,
      preset: row.selection?.selectedPreset ?? 'normal-cut', presetVersion: 'v001'}))});
  const recordBody = {schemaVersion: 'presentation-orchestration-selection-record-v001',
    version: ORCHESTRATION_VERSION_V001, contextSha256: context.contextSha256, input: clone(input),
    replyBytes: evaluated.raw, replySha256: sha(evaluated.raw), captions: evaluated.captions, connections: evaluated.connections,
    captionAutoSha256: hash(captionAuto), connectionAutoSha256: hash(connectionAuto)};
  return {captionAuto, connectionAuto, selectionRecord: freeze({...recordBody, recordSha256: hash(recordBody)})};
}
export function fixOrchestrationJudgmentV001({context, input, replyBytes}) {
  const data = contextData(context), compiled = compile(context, input, replyBytes);
  return freeze({...compiled,
    captionOverrides: createAutoPresentationOverridesV001({baselinePlan: data.plan, context: data.source.captionContext,
      autoProposal: compiled.captionAuto}),
    connectionOverrides: createConnectionExpressionOverridesV001({context: data.connectionContext, original: compiled.connectionAuto})});
}
function validateState(context, state) {
  exact(state, ['selectionRecord', 'captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides'], 'four saved systems and selection proof');
  const data = contextData(context), record = state.selectionRecord;
  require(object(record), 'selection record');
  const expected = compile(context, record.input, record.replyBytes);
  require(same(record, expected.selectionRecord) && same(state.captionAuto, expected.captionAuto)
    && same(state.connectionAuto, expected.connectionAuto), 'fixed semantic choices or saved automatic record differs');
  const captions = resolveAutoPresentationV001({baselinePlan: data.plan, context: data.source.captionContext,
    autoProposal: state.captionAuto, overrides: state.captionOverrides});
  const connections = resolveConnectionExpressionV001({context: data.connectionContext,
    original: state.connectionAuto, overrides: state.connectionOverrides});
  return {data, captions, connections};
}
export function editOrchestrationOverrideV001({context, state, kind, itemId, selection}) {
  const {data} = validateState(context, state);
  if (kind === 'caption') {
    return freeze({...state, captionOverrides: editAutoPresentationOverrideV001({baselinePlan: data.plan,
      context: data.source.captionContext, autoProposal: state.captionAuto, overrides: state.captionOverrides,
      captionId: itemId, selection: ['Normal', 'Reset'].includes(selection) ? selection
        : orchestrationCaptionChoiceToSelectionV001(selection)})});
  }
  require(kind === 'connection', 'override kind');
  const args = {context: data.connectionContext, original: state.connectionAuto,
    overrides: state.connectionOverrides, connectionId: itemId};
  return freeze({...state, connectionOverrides: selection === 'Reset'
    ? resetConnectionExpressionOverrideV001(args)
    : setConnectionExpressionOverrideV001({...args, preset: selection === 'Normal' ? 'normal-cut' : selection, presetVersion: 'v001'})});
}
const countStatuses = rows => ({total: rows.length, explicitNormal: rows.filter(row => row.status === 'resolved'
  && ['normal', 'normal-cut'].includes(typeof row.selection.selectedPreset === 'string'
    ? row.selection.selectedPreset : row.selection.selectedPreset.preset)).length,
  selected: rows.filter(row => row.status === 'resolved' && !['normal', 'normal-cut'].includes(
    typeof row.selection.selectedPreset === 'string' ? row.selection.selectedPreset : row.selection.selectedPreset.preset)).length,
  unresolved: rows.filter(row => row.status === 'unresolved').length,
  unrepresentable: rows.filter(row => row.status === 'unrepresentable').length});

export function resolveOrchestrationDrawingViewV001({context, state}) {
  const {data, captions, connections} = validateState(context, state);
  const projection = createOrchestrationProjectionV001({...data.projectionOptions,
    connections: connections.connections.map(row => ({connectionId: row.connectionId, preset: row.preset, presetVersion: row.presetVersion}))});
  const projected = projectCaptionPlanV001({projection, planBytes: data.source.planBytes});
  const projectedPeaks = [];
  const elements = projected.plan.elements.map(element => {
    const selection = captions.resolution.captions.find(row => row.captionId === element.instructionId)?.effectiveSelection;
    if (!selection) return element;
    let measuredPeak;
    if (selection.role === 'Pulse accent') {
      const sourcePeak = data.source.captionContext.pulseTimingEvidence.peaks.find(row => row.peakId === selection.anchorPeakId);
      const peak = projectAudioPeakV001({projection, peak: {clock: 'digest-original', sourceClockSha256: projection.sourceClockSha256,
        peakId: sourcePeak.peakId, sample: sourcePeak.peakSample, sampleRate: data.source.observationSampleRate}});
      projectedPeaks.push(peak);
      measuredPeak = {peakId: peak.peakId, peakSample: peak.displaySample, sampleRate: peak.sampleRate};
    }
    return materializeFiniteAutoPresentationCaptionV001({element, canvas: projected.plan.canvas, selection,
      ...(measuredPeak === undefined ? {} : {measuredPeak})});
  });
  const audioEvidenceIntervals = state.selectionRecord.input.audioCandidates.map(row => projectAudioEvidenceIntervalV001({projection,
    interval: {clock: 'digest-original', sourceClockSha256: projection.sourceClockSha256, evidenceId: row.candidateId,
      startSample: row.startSample, endSampleExclusive: row.endSampleExclusive, sampleRate: data.source.observationSampleRate}}));
  const fourSavedSha256 = Object.fromEntries(['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides']
    .map(key => [key, hash(state[key])]));
  const body = {schemaVersion: 'presentation-orchestration-drawing-view-v001', version: ORCHESTRATION_VERSION_V001,
    contextSha256: context.contextSha256, sourceContext: clone(data.source.captionContext),
    sourceRefs: {planRef: clone(data.source.planRef), timelineRef: clone(data.source.timelineRef), mediaRef: clone(data.source.mediaRef),
      decisionInputRef: clone(data.source.captionContext.decisionInputRef),
      pulseTimingEvidence: clone(data.source.captionContext.pulseTimingEvidence)},
    selectionRecordSha256: state.selectionRecord.recordSha256, fourSavedSha256, projection,
    projectedNormalPlan: clone(projected.plan), resolvedPlan: {...clone(projected.plan), elements},
    captionTimings: clone(projected.captionTimings), projectedPeaks, audioEvidenceIntervals,
    effectiveSelections: captions.resolution.captions.map(row => ({captionId: row.captionId,
      selection: clone(row.effectiveSelection), origin: row.origin, hasOverride: row.hasOverride})),
    resolution: {caption: clone(captions.resolution), connections: clone(connections.connections),
      counts: {captions: countStatuses(state.selectionRecord.captions), connections: countStatuses(state.selectionRecord.connections)}}};
  const view = freeze({...body, viewSha256: hash(body)});
  views.set(view, {context, state: freeze(clone(state))});
  return view;
}
export function assertOrchestrationDrawingViewV001(view) {viewData(view); return true;}
export function assertOrchestrationDrawingViewMatchesStateV001({view, context, state}) {
  viewData(view);
  const expected = resolveOrchestrationDrawingViewV001({context, state});
  require(same(view, expected), 'stale drawing view: source, projection, or four saved systems differ');
  return true;
}

/** The projected normal caption keeps the same font, geometry and display clock.
 * Alternatives change only the intended discriminating visual property. */
export function buildOrchestrationNativeQcAlternativeElementsV001(view) {
  viewData(view);
  const alternatives = view.effectiveSelections.map(row => {
    const normal = view.projectedNormalPlan.elements.find(element => element.instructionId === row.captionId);
    const selected = view.resolvedPlan.elements.find(element => element.instructionId === row.captionId);
    const entries = [{kind: 'normal', element: clone(normal)}];
    if (row.selection.role === 'Focus' && row.selection.scope === 'partial-caption') entries.push({kind: 'whole-color',
      element: materializeFiniteAutoPresentationCaptionV001({element: clone(normal), canvas: view.projectedNormalPlan.canvas,
        selection: {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'}})});
    if (row.selection.role === 'Panel accent') {
      const element = clone(selected);
      element.visualState.background = omitPresentationPanelPlateForInspectionV002(element.visualState.background);
      entries.push({kind: 'panel-plate-omitted', element});
    }
    return {captionId: row.captionId, entries};
  });
  return freeze({alternatives, resolution: clone(view.resolution)});
}

/** A saved proof is a recipe, never a trusted projected plan. Reload rebuilds
 * all sources, semantic choices, overrides, projection and finite drawing. */
export function exportOrchestrationDrawingViewEvidenceV001(view) {
  const {context, state} = viewData(view), data = contextData(context);
  const body = {schemaVersion: 'presentation-orchestration-drawing-evidence-v001',
    source: clone(data.source), state: clone(state), expectedViewSha256: view.viewSha256};
  return freeze({...body, evidenceSha256: hash(body)});
}
export function restoreOrchestrationDrawingViewEvidenceV001(evidence) {
  exact(evidence, ['schemaVersion', 'source', 'state', 'expectedViewSha256', 'evidenceSha256'], 'drawing proof');
  const {evidenceSha256, ...body} = evidence;
  require(evidence.schemaVersion === 'presentation-orchestration-drawing-evidence-v001'
    && hash(body) === evidenceSha256, 'drawing proof SHA differs');
  const context = createOrchestrationContextV001(evidence.source);
  const view = resolveOrchestrationDrawingViewV001({context, state: evidence.state});
  require(view.viewSha256 === evidence.expectedViewSha256, 'reconstructed drawing view differs');
  return view;
}

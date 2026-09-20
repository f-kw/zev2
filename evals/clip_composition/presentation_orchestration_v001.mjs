/** Finite semantic choices, four independent saved records, and one drawing clock. */
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {decodePresentationCaptionB1StrictJsonV001} from './presentation_caption_semantic_source_package_v001.mjs';
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

export const ORCHESTRATION_VERSION_V002 = 'presentation-orchestration-v002';
// The expression assignment identity is independent of the saved wire format.
// Adding a Panel background must not reshuffle caption or connection choices.
const EXPRESSION_SELECTION_IDENTITY = 'presentation-orchestration-v001';
const PANEL_BACKGROUND_SELECTION_IDENTITY = 'presentation-orchestration-panel-background-v001';
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
  const identity = {schemaVersion: 'presentation-orchestration-context-v002', version: ORCHESTRATION_VERSION_V002,
    digestRef: source.digestRef, sourceClockSha256: initialProjection.sourceClockSha256,
    captionContextSha256: hash(source.captionContext), captionIds: plan.elements.filter(row => row.kind === 'speech-caption')
      .map(row => row.instructionId), connectionIds: connectionContext.connections.map(row => row.connectionId)};
  const context = freeze({...identity, contextSha256: hash(identity)});
  contexts.set(context, freeze({source, plan, decision, projectionOptions, connectionContext, initialProjection}));
  return context;
}

const group = freeze({normal: ['normal'], focus: ['color', 'panel'],
  'vocal-energy': ['scale', 'pulse'], reaction: ['bounce', 'shake']});
const panelBackgroundChoices = freeze({plain: 'panel', 'graph-paper': 'panel-graph-paper',
  'comic-frame': 'panel-comic-frame'});
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
export function createOrchestrationJudgmentInputV001({context, evidence, connectionPolicy = 'semantic-choice'}) {
  return createJudgmentInput({context, evidence, connectionPolicy}, 'fresh-codex');
}
function createJudgmentInput({context, evidence, connectionPolicy}, judgmentMode) {
  const data = contextData(context);
  require(['semantic-choice', 'preserve-normal-cut'].includes(connectionPolicy), 'explicit connection policy');
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
  if (Object.hasOwn(evidence.audioEvidence ?? {}, 'allAsrSegments')) {
    const allAsr = evidence.audioEvidence.allAsrSegments;
    require(Array.isArray(allAsr) && allAsr.every(row => object(row) && nonempty(row.id))
      && new Set(allAsr.map(row => row.id)).size === allAsr.length, 'whole-audio ASR observation IDs');
  }
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
  const body = {schemaVersion: 'presentation-orchestration-judgment-input-v002', contextSha256: context.contextSha256,
    digestRef: clone(context.digestRef), sourceClockSha256: context.sourceClockSha256,
    orchestrationVersion: ORCHESTRATION_VERSION_V002,
    judgmentMode, connectionPolicy,
    productionPurpose: evidence.productionPurpose, captionRolePresets: clone(group),
    panelBackgroundPresets: Object.keys(panelBackgroundChoices),
    connectionRolePresets: connectionPolicy === 'preserve-normal-cut' ? {continuation: ['normal-cut']}
      : {continuation: ['normal-cut'], separator: ['black-separator', 'soft-separator'],
        either: ['normal-cut', 'black-separator', 'soft-separator']},
    policy: {completeCoverage: true, chooseSemanticAllowedSetsOnly: true, explicitNormal: true,
      oneChoicePerPreset: true, noQuotas: true, noSequenceAssignment: true, noSavedPriorAnswers: judgmentMode === 'fresh-codex',
      panelBackgroundOnlyAfterPanel: true, explicitPanelBackgroundAllowedSet: true,
      unresolvedAndUnrepresentableAreNotNormal: true, automaticSelection: 'SHA256-canonical-tuple-modulo-sorted-allowed-presets'},
    captions, connections, contexts: clone(evidence.contexts), observations: clone(evidence.observations),
    audioEvidence: clone(evidence.audioEvidence), audioCandidates: clone(evidence.audioCandidates)};
  return freeze({...body, inputSha256: hash(body)});
}
function checkInput(context, input, judgmentMode) {
  require(object(input), 'judgment input');
  const expected = createJudgmentInput({context, connectionPolicy: input.connectionPolicy, evidence: Object.fromEntries(
    ['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'].map(key => [key, input[key]]))}, judgmentMode);
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
  const selectionSha256 = sha(canonicalJson([digestSha256, EXPRESSION_SELECTION_IDENTITY, kind, itemId]));
  const selectedIndex = Number(BigInt('0x' + selectionSha256) % BigInt(sorted.length));
  return freeze({selectionSha256, allowedPresets: clone(sorted), selectedIndex, selectedPreset: clone(sorted[selectedIndex])});
}

/** A second, independent finite choice, made only after Panel was selected. */
export function selectOrchestrationPanelBackgroundV002({digestSha256, captionId, allowedPresets}) {
  require(/^[a-f0-9]{64}$/.test(digestSha256) && nonempty(captionId)
    && Array.isArray(allowedPresets) && allowedPresets.length > 0
    && allowedPresets.every(value => typeof value === 'string' && Object.hasOwn(panelBackgroundChoices, value))
    && new Set(allowedPresets).size === allowedPresets.length, 'finite Panel background allowed set');
  const sorted = [...allowedPresets].sort();
  const selectionSha256 = sha(canonicalJson([digestSha256, PANEL_BACKGROUND_SELECTION_IDENTITY,
    'caption-panel-background', captionId]));
  const selectedIndex = Number(BigInt('0x' + selectionSha256) % BigInt(sorted.length));
  return freeze({selectionSha256, allowedPresets: sorted, selectedIndex, selectedPreset: sorted[selectedIndex]});
}

function evaluateReply(context, input, replyBytes, judgmentMode) {
  const data = contextData(context);
  checkInput(context, input, judgmentMode);
  const raw = utf8(replyBytes, 'judgment reply');
  const decoded = decodePresentationCaptionB1StrictJsonV001(Buffer.from(raw, 'utf8'));
  require(decoded.status === 'decoded', 'judgment reply strict JSON: ' + (decoded.reason ?? 'invalid'));
  const reply = decoded.value;
  exact(reply, ['schemaVersion', 'inputSha256', 'completion', 'captions', 'connections'], 'judgment reply');
  require(reply.schemaVersion === 'presentation-orchestration-judgment-v002'
    && reply.inputSha256 === input.inputSha256 && reply.completion === 'complete', 'complete fresh judgment binding required');
  checkCoverage(reply.captions, context.captionIds, 'captionId', 'reply caption');
  checkCoverage(reply.connections, context.connectionIds, 'connectionId', 'reply connection');
  const knownEvidence = new Set([...context.captionIds, ...context.connectionIds,
    ...input.contexts.map(row => row.contextId), ...input.observations.map(row => row.observationId),
    ...input.audioCandidates.map(row => row.candidateId),
    ...input.audioCandidates.flatMap(row => [...(row.asrSegments ?? []), ...(row.asrContext ?? [])].map(observation => observation.id)),
    ...(input.audioEvidence?.allAsrSegments ?? []).map(row => row.id),
    ...(data.source.captionContext.pulseTimingEvidence?.peaks.map(row => row.peakId) ?? [])]);
  const resolveRow = (row, kind) => {
    const idKey = kind + 'Id', id = row[idKey];
    exact(row, [idKey, 'status', 'semanticRole', 'allowedPresets', 'reason', 'evidenceIds'], 'semantic judgment row');
    require(['resolved', 'unresolved', 'unrepresentable'].includes(row.status) && nonempty(row.reason)
      && Array.isArray(row.evidenceIds) && row.evidenceIds.length > 0 && new Set(row.evidenceIds).size === row.evidenceIds.length
      && row.evidenceIds.every(value => knownEvidence.has(value)) && Array.isArray(row.allowedPresets), 'status, reason, or evidence references');
    if (row.status !== 'resolved') {
      require(row.semanticRole === null && row.allowedPresets.length === 0, 'exceptions must retain their status without an allowed set');
      return {...clone(row), selection: null,
        ...(kind === 'caption' ? {panelBackgroundSelection: null, finalCaptionChoice: null} : {})};
    }
    require(row.allowedPresets.length > 0, 'resolved judgment needs explicit allowed set, including Normal');
    if (kind === 'caption') {
      require(Object.hasOwn(group, row.semanticRole), 'caption semantic role');
      const observed = input.captions.find(value => value.captionId === id);
      for (const choice of row.allowedPresets) {
        require(object(choice), 'finite caption choice');
        require(group[row.semanticRole].includes(choice.preset), 'preset outside semantic role');
        require(!input.observations.some(value => value.kind === choice.preset + '-unrepresentable'
          && value.captionIds.includes(id)), 'physically unrepresentable preset in allowed set');
        if (choice.preset === 'pulse') require(observed.eligiblePulsePeakIds.includes(choice.anchorPeakId), 'Pulse anchor not eligible');
        if (choice.preset === 'panel') {
          exact(choice, ['preset', 'allowedBackgroundPresets'], 'Panel semantic choice');
          // Validate every permitted background, including ones not selected.
          selectOrchestrationPanelBackgroundV002({digestSha256: context.digestRef.sha256,
            captionId: id, allowedPresets: choice.allowedBackgroundPresets});
          for (const background of choice.allowedBackgroundPresets) {
            const preset = panelBackgroundChoices[background];
            require(!input.observations.some(value => value.kind === preset + '-unrepresentable'
              && value.captionIds.includes(id)), 'physically unrepresentable Panel background in allowed set');
            checkOneChoice(data, id, {preset});
          }
        } else checkOneChoice(data, id, choice);
      }
      require(!row.allowedPresets.some(value => value.preset === 'color' && value.scope === 'partial-caption')
        || row.allowedPresets.length === 1, 'partial-caption focus has only Color');
    } else {
      const allowed = input.connectionRolePresets[row.semanticRole];
      require(allowed && row.allowedPresets.every(value => typeof value === 'string' && allowed.includes(value)), 'connection semantic role/preset');
      if (row.semanticRole === 'either') require(row.allowedPresets.includes('normal-cut')
        && row.allowedPresets.some(value => value !== 'normal-cut'), 'either requires both continuation and separator');
    }
    const allowedExpressions = kind === 'caption' ? row.allowedPresets.map(choice => choice.preset === 'panel'
      ? {preset: 'panel'} : choice) : row.allowedPresets;
    const selection = selectOrchestrationPresetV001({digestSha256: context.digestRef.sha256,
      kind, itemId: id, allowedPresets: allowedExpressions});
    if (kind !== 'caption') return {...clone(row), selection};
    const panelBackgroundSelection = selection.selectedPreset.preset === 'panel'
      ? selectOrchestrationPanelBackgroundV002({digestSha256: context.digestRef.sha256, captionId: id,
        allowedPresets: row.allowedPresets.find(choice => choice.preset === 'panel').allowedBackgroundPresets}) : null;
    const finalCaptionChoice = panelBackgroundSelection
      ? {preset: panelBackgroundChoices[panelBackgroundSelection.selectedPreset]} : clone(selection.selectedPreset);
    return {...clone(row), selection, panelBackgroundSelection, finalCaptionChoice};
  };
  return {raw, captions: context.captionIds.map(id => resolveRow(reply.captions.find(row => row.captionId === id), 'caption')),
    connections: context.connectionIds.map(id => resolveRow(reply.connections.find(row => row.connectionId === id), 'connection'))};
}
const recompileBackgroundPolicy = freeze({
  id: 'q4-existing-panel-background-connection-check-v001',
  allowedBackgroundPresets: Object.keys(panelBackgroundChoices),
  reason: 'Technical recompilation of saved semantic judgments to check the existing finite Panel backgrounds; not a new AI judgment.',
});
const ORIGINAL_RECOMPILE_KEYS = ['selectionRecordBytes', 'selectionRecordFileSha256', 'inputBytes',
  'inputFileSha256', 'replyBytes', 'replyFileSha256'];

function preparePanelBackgroundRecompile(context, original) {
  exact(original, ORIGINAL_RECOMPILE_KEYS, 'explicit recompilation originals');
  const normalized = clone(original);
  for (const stem of ['selectionRecord', 'input', 'reply']) {
    normalized[stem + 'Bytes'] = utf8(original[stem + 'Bytes'], 'original ' + stem);
    require(/^[a-f0-9]{64}$/.test(original[stem + 'FileSha256'])
      && sha(normalized[stem + 'Bytes']) === original[stem + 'FileSha256'], 'original ' + stem + ' file SHA differs');
  }
  const record = json(normalized.selectionRecordBytes, 'original selection record');
  const input = json(normalized.inputBytes, 'original judgment input');
  const decoded = decodePresentationCaptionB1StrictJsonV001(Buffer.from(normalized.replyBytes, 'utf8'));
  require(decoded.status === 'decoded', 'original judgment reply strict JSON');
  const reply = decoded.value;
  exact(record, ['schemaVersion', 'version', 'contextSha256', 'input', 'replyBytes', 'replySha256',
    'captions', 'connections', 'captionAutoSha256', 'connectionAutoSha256', 'recordSha256'], 'original selection record');
  exact(input, ['schemaVersion', 'contextSha256', 'digestRef', 'sourceClockSha256', 'orchestrationVersion',
    'productionPurpose', 'captionRolePresets', 'connectionRolePresets', 'policy', 'captions', 'connections',
    'contexts', 'observations', 'audioEvidence', 'audioCandidates', 'inputSha256'], 'original judgment input');
  exact(reply, ['schemaVersion', 'inputSha256', 'completion', 'captions', 'connections'], 'original judgment reply');
  const {recordSha256, ...recordBody} = record, {inputSha256, ...inputBody} = input;
  require(record.schemaVersion === 'presentation-orchestration-selection-record-v001'
    && record.version === EXPRESSION_SELECTION_IDENTITY
    && input.schemaVersion === 'presentation-orchestration-judgment-input-v001'
    && input.orchestrationVersion === EXPRESSION_SELECTION_IDENTITY
    && reply.schemaVersion === 'presentation-orchestration-judgment-v001'
    && reply.completion === 'complete', 'explicit recompilation requires bound v001 semantic originals');
  require(hash(recordBody) === recordSha256 && hash(inputBody) === inputSha256
    && same(record.input, input) && record.contextSha256 === input.contextSha256
    && reply.inputSha256 === inputSha256 && record.replyBytes === normalized.replyBytes
    && record.replySha256 === normalized.replyFileSha256, 'original record, input or reply binding differs');
  const evidence = Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence',
    'audioCandidates'].map(key => [key, input[key]]));
  const nextInput = createJudgmentInput({context, evidence, connectionPolicy: 'semantic-choice'}, 'technical-recompile');
  for (const key of ['digestRef', 'sourceClockSha256', 'captionRolePresets', 'connectionRolePresets', 'captions', 'connections']) {
    require(same(input[key], nextInput[key]), 'original source identity, expressions or connections differ');
  }
  const {panelBackgroundOnlyAfterPanel, explicitPanelBackgroundAllowedSet, ...previousPolicy} = nextInput.policy;
  previousPolicy.noSavedPriorAnswers = true;
  require(same(input.policy, previousPolicy), 'original semantic policy differs');
  for (const [kind, ids, key] of [['caption', context.captionIds, 'captions'], ['connection', context.connectionIds, 'connections']]) {
    const idKey = kind + 'Id';
    checkCoverage(reply[key], ids, idKey, 'original reply ' + kind);
    checkCoverage(record[key], ids, idKey, 'original saved ' + kind);
    for (const id of ids) {
      const row = reply[key].find(value => value[idKey] === id);
      exact(row, [idKey, 'status', 'semanticRole', 'allowedPresets', 'reason', 'evidenceIds'], 'original semantic row');
      const selection = row.status === 'resolved' ? selectOrchestrationPresetV001({digestSha256: context.digestRef.sha256,
        kind, itemId: id, allowedPresets: row.allowedPresets}) : null;
      require(same(record[key].find(value => value[idKey] === id), {...clone(row), selection}),
        'original saved semantic row or expression selection differs');
    }
  }
  const nextReply = clone(reply);
  nextReply.schemaVersion = 'presentation-orchestration-judgment-v002';
  nextReply.inputSha256 = nextInput.inputSha256;
  for (const row of nextReply.captions) row.allowedPresets = row.allowedPresets.map(choice => {
    if (choice.preset !== 'panel') return choice;
    exact(choice, ['preset'], 'original Panel expression');
    return {preset: 'panel', allowedBackgroundPresets: [...recompileBackgroundPolicy.allowedBackgroundPresets]};
  });
  return {original: normalized, input: nextInput, replyBytes: JSON.stringify(nextReply) + '\n', record};
}

function compile(context, input, replyBytes, origin) {
  require(object(origin) && ['fresh-codex', 'technical-recompile'].includes(origin.kind), 'judgment origin required');
  let recompilation;
  if (origin.kind === 'fresh-codex') exact(origin, ['kind'], 'fresh judgment origin');
  else {
    exact(origin, ['kind', 'original', 'backgroundPolicy'], 'technical recompilation origin');
    require(same(origin.backgroundPolicy, recompileBackgroundPolicy), 'technical background policy differs');
    recompilation = preparePanelBackgroundRecompile(context, origin.original);
    require(same(input, recompilation.input) && utf8(replyBytes, 'recompiled reply') === recompilation.replyBytes,
      'recompiled semantic judgments or background policy differ');
  }
  const data = contextData(context), evaluated = evaluateReply(context, input, replyBytes, origin.kind);
  if (recompilation) for (const key of ['captions', 'connections']) {
    const idKey = key === 'captions' ? 'captionId' : 'connectionId';
    for (const row of evaluated[key]) require(same(row.selection,
      recompilation.record[key].find(original => original[idKey] === row[idKey]).selection),
    'recompiled expression assignment differs from the original');
  }
  const effects = evaluated.captions.filter(row => row.selection && row.selection.selectedPreset.preset !== 'normal')
    .map(row => ({captionId: row.captionId, ...orchestrationCaptionChoiceToSelectionV001(row.finalCaptionChoice)}));
  const exceptions = evaluated.captions.filter(row => row.status !== 'resolved')
    .map(row => ({captionId: row.captionId, status: row.status, reason: row.reason}));
  const captionAuto = fixAutoPresentationProposalV001({baselinePlan: data.plan, context: data.source.captionContext,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context: clone(data.source.captionContext),
      targetCaptionIds: [...context.captionIds], completion: 'complete', effects, exceptions}});
  const connectionAuto = createConnectionExpressionOriginalV001({context: data.connectionContext,
    selections: evaluated.connections.map(row => ({connectionId: row.connectionId,
      preset: row.selection?.selectedPreset ?? 'normal-cut', presetVersion: 'v001'}))});
  const recordBody = {schemaVersion: 'presentation-orchestration-selection-record-v002',
    version: ORCHESTRATION_VERSION_V002, contextSha256: context.contextSha256, input: clone(input),
    origin: clone(origin),
    replyBytes: evaluated.raw, replySha256: sha(evaluated.raw), captions: evaluated.captions, connections: evaluated.connections,
    captionAutoSha256: hash(captionAuto), connectionAutoSha256: hash(connectionAuto)};
  return {captionAuto, connectionAuto, selectionRecord: freeze({...recordBody, recordSha256: hash(recordBody)})};
}
export function fixOrchestrationJudgmentV001({context, input, replyBytes}) {
  const compiled = compile(context, input, replyBytes, {kind: 'fresh-codex'});
  return initializeSavedOverrides(context, compiled);
}
/** This explicit operation retains old semantic decisions and their original
 * bytes. It never labels a migrated answer as a fresh Codex judgment. */
export function recompileOrchestrationPanelBackgroundsV002({context, original}) {
  const prepared = preparePanelBackgroundRecompile(context, original);
  const compiled = compile(context, prepared.input, prepared.replyBytes,
    {kind: 'technical-recompile', original: prepared.original, backgroundPolicy: recompileBackgroundPolicy});
  return initializeSavedOverrides(context, compiled);
}
function initializeSavedOverrides(context, compiled) {
  const data = contextData(context);
  return freeze({...compiled,
    captionOverrides: createAutoPresentationOverridesV001({baselinePlan: data.plan, context: data.source.captionContext,
      autoProposal: compiled.captionAuto}),
    connectionOverrides: createConnectionExpressionOverridesV001({context: data.connectionContext, original: compiled.connectionAuto})});
}
function validateState(context, state) {
  exact(state, ['selectionRecord', 'captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides'], 'four saved systems and selection proof');
  const data = contextData(context), record = state.selectionRecord;
  require(object(record) && record.schemaVersion === 'presentation-orchestration-selection-record-v002', 'new selection record required');
  const expected = compile(context, record.input, record.replyBytes, record.origin);
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
  const body = {schemaVersion: 'presentation-orchestration-drawing-view-v002', version: ORCHESTRATION_VERSION_V002,
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
  const body = {schemaVersion: 'presentation-orchestration-drawing-evidence-v002',
    source: clone(data.source), state: clone(state), expectedViewSha256: view.viewSha256};
  return freeze({...body, evidenceSha256: hash(body)});
}
export function restoreOrchestrationDrawingViewEvidenceV001(evidence) {
  exact(evidence, ['schemaVersion', 'source', 'state', 'expectedViewSha256', 'evidenceSha256'], 'drawing proof');
  const {evidenceSha256, ...body} = evidence;
  require(evidence.schemaVersion === 'presentation-orchestration-drawing-evidence-v002'
    && hash(body) === evidenceSha256, 'drawing proof SHA differs');
  const context = createOrchestrationContextV001(evidence.source);
  const view = resolveOrchestrationDrawingViewV001({context, state: evidence.state});
  require(view.viewSha256 === evidence.expectedViewSha256, 'reconstructed drawing view differs');
  return view;
}

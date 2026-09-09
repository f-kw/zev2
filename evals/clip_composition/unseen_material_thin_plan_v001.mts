import assert from 'node:assert/strict';
import {
  bind, same, keys, sha, formal, canonicalSha, CRITERIA, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  assertCandidateDiscoveryInputV001, assertCandidateDiscoveryResultV001,
  type CandidateDiscoveryInputV001,
} from '../../runner/src/skills/candidate-discovery-v001.js';
import {
  resolveSelectionCandidatesV001, buildSelectionRequestV001,
  validateSelectionV001, promoteSelectionV001,
} from './candidate_selection_validation_v001.mts';
import {assertThinPlanV0, STRUCTURE_CONDITIONS} from './run_thin_plan_candidate_selection_v0.mts';

export const ROOT024 = 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001';
export const WORK024 = `${ROOT024}/formal-v004`;
export const SOURCE024 = 'SsdxVhwxyYo';
export const SOURCE_VIDEO024 = `evals/clip_composition/research/downloads/${SOURCE024}/${SOURCE024}.mp4`;
export const TRANSCRIPT024 = `evals/clip_composition/stt/${SOURCE024}_local30_v007/source/source-transcript.json`;
export const STRUCTURE024 = STRUCTURE_CONDITIONS;

/** Only the fixed intent and the complete transcript enter the discovery Skill. */
export function buildUnseenDiscoveryRequestV001(c: Json) {
  assertThinPlanV0(c.thinPlan);
  assert.equal(c.plan.request.purpose, c.thinPlan.productionIntent, 'FIXED_INTENT_CHANGED');
  const input: CandidateDiscoveryInputV001 = {
    schemaVersion: 'candidate-discovery-skill-input-v001', productionRequest: c.thinPlan.productionIntent,
    editorialCriteria: [...CRITERIA], sourceId: c.plan.request.sourceId,
    utterances: c.utterances.utterances.map((u: Json) => ({utteranceId: u.utteranceId, text: u.text})),
  };
  assertCandidateDiscoveryInputV001(input);
  return {schemaVersion: 'candidate-discovery-judgment-request-v001', requestId: `${c.plan.planId}-discovery`,
    planBinding: c.planBinding, input, inputCanonicalSha256: canonicalSha(input)};
}

/** Discovery proposes every candidate; this projection never adopts or filters one. */
export function validateUnseenDiscoveryV001(c: Json, request: Json, response: Json, result: unknown) {
  assert(same(c.planBinding, bind(c.planBinding.path, c.plan)), 'DISCOVERY_PLAN_BINDING_CHANGED');
  assert(same(request, buildUnseenDiscoveryRequestV001(c)), 'FULL_SOURCE_DISCOVERY_INPUT_CHANGED');
  assertCandidateDiscoveryResultV001(result);
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-discovery-judgment-response-v001'
    && response.requestFileSha256 === sha(formal(request))
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim()
    && same(response.answer, result.answer), 'DISCOVERY_RESPONSE_BINDING_INVALID');
  const answer = result.answer as Json;
  assert.equal(answer.status, 'complete', 'DISCOVERY_ABSTAINED');
  assert(answer.candidates.length >= 2, 'MULTIPLE_DISCOVERY_CANDIDATES_REQUIRED');
  const indices = new Map<string, number>(c.utterances.utterances.map((u: Json, i: number) => [u.utteranceId, i]));
  const candidates = answer.candidates.map((r: Json, i: number) => {
    assert(indices.has(r.contextStartUtteranceId) && indices.has(r.contextEndUtteranceId), 'UNKNOWN_DISCOVERY_ID');
    return {candidateId: `candidate-${String(i + 1).padStart(4, '0')}`, sourceId: r.sourceId,
      title: r.title, contextStartUtteranceId: r.contextStartUtteranceId,
      contextEndUtteranceId: r.contextEndUtteranceId, evidenceUtteranceIds: structuredClone(r.evidenceUtteranceIds)};
  }).sort((a: Json, b: Json) => indices.get(a.contextStartUtteranceId)! - indices.get(b.contextStartUtteranceId)!);
  const output = c.plan.outputRoot;
  const candidateSet = {
    schemaVersion: 'candidate-selection-candidate-set-v001', sourceId: c.plan.request.sourceId,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    origins: {discoveryRequest: bind(`${output}/candidate-request.json`, request),
      discoveryResponse: bind(`${output}/candidate-response.json`, response),
      discoveryResult: bind(`${output}/candidate-result.json`, result as Json)},
    candidates,
  };
  const resolved = resolveSelectionCandidatesV001({...c, candidateSet});
  for (let i = 1; i < resolved.length; i++) {
    assert(resolved[i - 1].sourceInterval.sourceEndMs <= resolved[i].sourceInterval.sourceStartMs,
      'DISCOVERY_CONTEXTS_OVERLAP');
  }
  return {candidateSet, validation: {
    schemaVersion: 'unseen-material-discovery-validation-v001', status: 'passed', planBinding: c.planBinding,
    origins: candidateSet.origins, sourceUtteranceCount: request.input.utterances.length,
    responseCandidateCount: answer.candidates.length, projectedCandidateCount: candidates.length,
    checks: {fullSourceInput: 'passed', intentUnchanged: 'passed', responseProvenance: 'passed',
      idMembershipAndOrder: 'passed', evidenceContained: 'passed', disjointContexts: 'passed',
      allDiscoveredCandidatesPassedWithoutFiltering: 'passed'},
    humanExpectedSelectionProvided: false, discoveryMeaningQuality: 'human-review-pending',
  }};
}

export function projectUnseenSelectionPlanV001(c: Json, candidateSet: Json) {
  return {...structuredClone(c.plan), stage: 'candidate-selection',
    discoveryPlanBinding: c.planBinding,
    request: {...structuredClone(c.plan.request), candidateSet: bind(`${c.plan.outputRoot}/candidate-set.json`, candidateSet)}};
}

/** Use the existing selection request and validator, including all candidates. */
export function selectUnseenCandidatesV001(c: Json, request: Json, response: Json, result: unknown) {
  assertThinPlanV0(c.thinPlan);
  assert.equal(c.plan.request.purpose, c.thinPlan.productionIntent, 'FIXED_INTENT_CHANGED');
  assert(same(c.plan.structureConditions, STRUCTURE_CONDITIONS), 'EXISTING_STRUCTURE_CONDITIONS_CHANGED');
  assert(same(request, buildSelectionRequestV001(c)), 'SELECTION_REQUEST_CHANGED');
  return promoteSelectionV001(validateSelectionV001(c, request, response, result));
}

/** This path is used only after a separate review finds whole contexts sufficient. */
export function keepWholeSelectedContextsV001(c: Json, selected: Json, assessment: Json) {
  assert(keys(assessment, ['schemaVersion', 'selectionAdoptionBinding', 'candidates', 'perceptualLimitations'])
    && assessment.schemaVersion === 'unseen-material-retention-assessment-v001'
    && same(assessment.selectionAdoptionBinding, bind(`${c.plan.outputRoot}/selection-adoption.json`, selected))
    && Array.isArray(assessment.candidates) && Array.isArray(assessment.perceptualLimitations), 'RETENTION_ASSESSMENT_INVALID');
  assert(same(assessment.candidates.map((r: Json) => r.candidateId),
    selected.adoptedCandidates.map((r: Json) => r.candidateId)), 'RETENTION_ASSESSMENT_COVERAGE_INVALID');
  for (const row of assessment.candidates) {
    assert(keys(row, ['candidateId', 'status', 'reason']) && typeof row.reason === 'string' && row.reason.trim(),
      'RETENTION_ASSESSMENT_REASON_REQUIRED');
    assert.equal(row.status, 'whole-context-sufficient', 'INTERNAL_RETENTION_DECISION_REQUIRED');
  }
  assert(selected.adoptedCandidates.length > 0, 'NO_ADOPTED_CANDIDATES');
  const parts = selected.adoptedCandidates.map((p: Json, i: number) => ({...structuredClone(p),
    outputOrdinal: i + 1, timelineSegmentId: `segment-${String(i + 1).padStart(4, '0')}`}));
  const adoption = {...structuredClone(selected), schemaVersion: 'unseen-material-execution-adoption-v001',
    selectionAdoptionBinding: assessment.selectionAdoptionBinding,
    retentionAssessmentBinding: bind(`${c.plan.outputRoot}/retention-assessment.json`, assessment),
    retentionMode: 'complete-discovered-context-after-explicit-assessment', selectedCandidates: parts};
  const editPlan = {schemaVersion: 'unseen-material-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(`${c.plan.outputRoot}/machine-adoption.json`, adoption),
    sourceVideoBinding: c.plan.request.sourceVideo,
    segments: parts.map((p: Json) => ({candidateId: p.candidateId, segmentId: p.timelineSegmentId,
      ...p.sourceInterval, sourceSegmentIds: p.sourceSegmentIds})),
    unresolvedEdits: [], quality: 'human-review-pending'};
  return {adoption, editPlan};
}

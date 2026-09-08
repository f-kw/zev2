import {
  assertCandidateSelectionInputV001, assertCandidateSelectionResultV001,
  type CandidateSelectionInputV001, type CandidateSelectionAnswerV001,
} from '../../runner/src/skills/candidate-selection-v001.js';
import {speechRange, speechUnitsByIds} from '../../runner/src/transcript-utils.js';
import {bind, same, keys, sha, formal, canonicalSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';

export const SELECTION_CRITERIA = Object.freeze([
  '各候補が制作要求へ加える意味、独自の見どころ、理解に必要な文脈を比較し、全候補に採用または不採用と理由を返す。',
  '意味的重複、同じ役割の候補の追加価値、見どころの弱さ、全体構成での必要性を本文の根拠で判断する。',
  '尺、文字数、元動画位置、候補ID、過去の人間採否、fixture固有の本文規則、事前に決めた採用件数を単独の基準にしない。',
  '件数目標はない。不要な候補を落とすためだけに落とさず、必要な候補は全件でも残す。成立しない候補群は全件不採用にできる。',
  '時刻や候補内部の編集は返さない。採用順は元素材順を維持し、回答は入力候補順に返す。',
  '根拠は自候補と比較相手の既存発話IDで示す。映像を見たと主張せず、判断不能ならabstainedを返す。',
]);
export const SELECTION_POLICY = Object.freeze({
  judgment: 'new-current-codex-semantic-candidate-comparison',
  order: 'source-order-without-reordering', adoptionCountTarget: null,
  authority: 'validation-then-deterministic-promotion-then-executor',
  internalRetention: 'revalidate-and-reuse-existing-meaning-result-and-cut-evidence',
  captionDisplay: 'existing-skill', manufacturing: 'existing-common-core-and-renderer',
  humanQuality: 'pending-review', apiCommunication: false,
});
const fail = (code: string): never => {throw new Error(`CANDIDATE_SELECTION: ${code}`);};
const id = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(s);
const list = (a: unknown): a is any[] => Array.isArray(a) && a.length > 0
  && Object.keys(a).length === a.length && Array.from({length: a.length}, (_, i) => Object.hasOwn(a, i)).every(Boolean);
const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;

/** 旧採否情報を持たない候補正本から、既存発話・STT境界だけで範囲を再構成する。 */
export function resolveSelectionCandidatesV001(c: Json) {
  const set = c.candidateSet;
  if (!keys(set, ['schemaVersion', 'sourceId', 'sourceVideoBinding', 'transcriptBinding', 'utteranceBinding', 'origins', 'candidates'])
    || set.schemaVersion !== 'candidate-selection-candidate-set-v001' || set.sourceId !== c.plan.request.sourceId
    || !same(set.sourceVideoBinding, c.plan.request.sourceVideo) || !same(set.transcriptBinding, c.plan.request.transcript)
    || !same(set.utteranceBinding, c.plan.request.utterances) || !list(set.candidates)) fail('CANDIDATE_SET_INVALID');
  const index = new Map<string, number>(c.utterances.utterances.map((u: Json, i: number) => [u.utteranceId, i]));
  const seen = new Set<string>();
  let previousStart = -1;
  return set.candidates.map((row: Json) => {
    if (!keys(row, ['candidateId', 'sourceId', 'title', 'contextStartUtteranceId', 'contextEndUtteranceId', 'evidenceUtteranceIds'])
      || !id(row.candidateId) || seen.has(row.candidateId) || row.sourceId !== set.sourceId
      || typeof row.title !== 'string' || !row.title.trim() || !list(row.evidenceUtteranceIds)) fail('CANDIDATE_ROW_INVALID');
    seen.add(row.candidateId);
    const start = index.get(row.contextStartUtteranceId), end = index.get(row.contextEndUtteranceId);
    if (start === undefined || end === undefined || start > end) fail('CANDIDATE_BOUNDS_INVALID');
    if (start < previousStart) fail('CANDIDATE_SOURCE_ORDER_INVALID');
    previousStart = start;
    const included = c.utterances.utterances.slice(start, end + 1);
    const includedUtteranceIds = included.map((u: Json) => u.utteranceId);
    checkEvidence(row.evidenceUtteranceIds, includedUtteranceIds);
    const sourceSegmentIds = included.flatMap((u: Json) => u.sourceSegmentIds);
    const units = speechUnitsByIds(c.transcript, sourceSegmentIds);
    if (!same(units.map(u => u.id), sourceSegmentIds)) fail('CANDIDATE_TRANSCRIPT_MEMBERSHIP_INVALID');
    const sourceInterval = speechRange(c.transcript, sourceSegmentIds);
    if (sourceInterval.sourceStartMs !== included[0].sourceStartMs || sourceInterval.sourceEndMs !== included.at(-1).sourceEndMs
      || sourceInterval.sourceStartMs >= sourceInterval.sourceEndMs) fail('CANDIDATE_OFFICIAL_RANGE_INVALID');
    return {...structuredClone(row), includedUtteranceIds, sourceSegmentIds, sourceInterval};
  });
}
function checkEvidence(evidence: string[], allowed: string[]) {
  let previous = -1;
  if (!list(evidence)) fail('EMPTY_EVIDENCE');
  for (const u of evidence) {
    const n = allowed.indexOf(u);
    if (n < 0) fail('EVIDENCE_OUTSIDE_CANDIDATE');
    if (n <= previous) fail('EVIDENCE_DUPLICATE_OR_ORDER_INVALID');
    previous = n;
  }
}
export function buildSelectionInputV001(c: Json): CandidateSelectionInputV001 {
  const parents = resolveSelectionCandidatesV001(c);
  const utterances = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input: CandidateSelectionInputV001 = {
    schemaVersion: 'candidate-selection-input-v001', productionRequest: c.plan.request.purpose,
    structureConditions: structuredClone(c.plan.structureConditions), criteria: [...SELECTION_CRITERIA],
    sourceId: c.plan.request.sourceId,
    candidates: parents.map(p => ({candidateId: p.candidateId, sourceId: p.sourceId, title: p.title,
      utterances: p.includedUtteranceIds.map((utteranceId: string) => ({utteranceId, text: utterances.get(utteranceId)!.text}))})),
  };
  assertCandidateSelectionInputV001(input);
  return input;
}
export function buildSelectionRequestV001(c: Json) {
  const input = buildSelectionInputV001(c);
  return {schemaVersion: 'candidate-selection-request-v001', requestId: `${c.plan.planId}-selection`,
    planBinding: c.planBinding, candidateSetBinding: c.plan.request.candidateSet,
    input, inputCanonicalSha256: canonicalSha(input)};
}
const tokens = new WeakMap<object, Json>();
export function validateSelectionV001(context: Json, request: Json, response: Json, result: unknown) {
  const c = structuredClone(context);
  if (!same(c.planBinding, bind(c.planBinding.path, c.plan))
    || !same(c.plan.request.candidateSet, bind(c.plan.request.candidateSet.path, c.candidateSet))) fail('CONTEXT_BINDING_CHANGED');
  assertCandidateSelectionResultV001(result);
  if (!same(request, buildSelectionRequestV001(c))
    || !keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'candidate-selection-response-v001'
    || response.requestFileSha256 !== sha(formal(request)) || !same(response.answer, result.answer)
    || typeof response.judgmentNote !== 'string' || !response.judgmentNote.trim()) fail('JUDGMENT_PROVENANCE_INVALID');
  const answer = result.answer as CandidateSelectionAnswerV001;
  if (answer.status !== 'complete') fail('SELECTION_ABSTAINED');
  const parents = resolveSelectionCandidatesV001(c);
  if (!same(answer.decisions.map(d => d.candidateId), parents.map(p => p.candidateId))) fail('DECISION_COVERAGE_MEMBERSHIP_OR_ORDER_INVALID');
  const byId = new Map<string, Json>(parents.map(p => [p.candidateId, p]));
  const adoptedIds = new Set(answer.decisions.filter(d => d.decision === 'adopt').map(d => d.candidateId));
  for (const d of answer.decisions) {
    const parent = byId.get(d.candidateId)!;
    if (d.sourceId !== parent.sourceId) fail('DECISION_SOURCE_MEMBERSHIP_INVALID');
    checkEvidence(d.evidenceUtteranceIds, parent.includedUtteranceIds);
    let previous = -1;
    if (parents.length > 1 && d.comparisons.length === 0) fail('CANDIDATE_COMPARISON_REQUIRED');
    for (const comparison of d.comparisons) {
      const other = byId.get(comparison.candidateId);
      const n = parents.findIndex(p => p.candidateId === comparison.candidateId);
      if (!other || other.candidateId === d.candidateId) fail('COMPARISON_MEMBERSHIP_INVALID');
      if (n <= previous) fail('COMPARISON_DUPLICATE_OR_ORDER_INVALID');
      previous = n;
      checkEvidence(comparison.evidenceUtteranceIds, other.includedUtteranceIds);
    }
    if (['redundant', 'necessary-context'].includes(d.basis)
      && !d.comparisons.some(p => adoptedIds.has(p.candidateId))) fail('ADOPTED_COMPARISON_REQUIRED');
  }
  const selected = parents.filter(p => adoptedIds.has(p.candidateId));
  for (let i = 1; i < selected.length; i++) {
    if (selected[i - 1].sourceInterval.sourceEndMs > selected[i].sourceInterval.sourceStartMs) fail('ADOPTED_CANDIDATES_OVERLAP');
  }
  const validation = {schemaVersion: 'candidate-selection-validation-v001', status: 'passed',
    planBinding: c.planBinding, candidateSetBinding: c.plan.request.candidateSet,
    requestBinding: bind(out(c, 'selection-request.json'), request),
    responseBinding: bind(out(c, 'selection-response.json'), response),
    resultBinding: bind(out(c, 'selection-result.json'), result as Json),
    checks: {idExistence: 'passed', sourceMembership: 'passed', fullCoverage: 'passed', duplicates: 'passed',
      sourceOrder: 'passed', evidenceMembershipAndOrder: 'passed', candidateBounds: 'passed',
      selectedNonOverlap: 'passed', provenance: 'passed', closedInputVocabulary: 'passed'},
    meaningQuality: 'human-review-pending'};
  const token = Object.freeze({status: 'validated-candidate-selection'});
  tokens.set(token, structuredClone({c, answer, parents, selected, validation}));
  return token;
}
/** 不透明な検査済みtokenだけを採用正本へ昇格。Skill結果やJSONコピーは受け付けない。 */
export function promoteSelectionV001(token: object) {
  const value = tokens.get(token);
  if (!value) fail('VALIDATED_SELECTION_REQUIRED');
  const {c, answer, parents, selected, validation} = structuredClone(value);
  const decisions = new Map<string, Json>(answer.decisions.map((d: Json) => [d.candidateId, d]));
  const adoption = {schemaVersion: 'candidate-selection-machine-adoption-v001', artifactId: `${c.plan.planId}-adoption`,
    authorityKind: 'fixed-plan-validated-candidate-selection-for-human-review',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding,
    candidateSetBinding: c.plan.request.candidateSet, resultBinding: validation.resultBinding,
    requestBinding: validation.requestBinding, responseBinding: validation.responseBinding,
    validatorResultBinding: bind(out(c, 'selection-validation.json'), validation),
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    adoptedCandidates: selected.map((p: Json) => ({...p, judgment: decisions.get(p.candidateId)})),
    rejectedCandidates: parents.filter((p: Json) => decisions.get(p.candidateId)!.decision === 'reject')
      .map((p: Json) => ({...p, judgment: decisions.get(p.candidateId)})),
    order: 'source-order-without-reordering', individualCandidateHumanApproval: 'not-performed',
    historicalHumanQualityInherited: false, humanQuality: 'not-evaluated'};
  return {validation, adoption};
}

import {createHash} from 'node:crypto';

// Local J16 adapter only. Import, construction and validation perform no I/O.
// Live HTTP, credential lookup, workflow wiring and production adoption are absent.
export const DECISIONS_J16_ENDPOINT_V001 = 'https://api.openai.com/v1/decisions';
export const DECISIONS_J16_MODEL_V001 = 'gpt-6-luna';
export const J16_CHOICES_V001 = ['normal', 'effect', 'unresolved'] as const;
export type J16ChoiceV001 = typeof J16_CHOICES_V001[number];
type JsonObject = Record<string, any>;
type Question = {type: 'choice'; name: string; instructions: string;
  choices: Array<{value: J16ChoiceV001; description: string}>};
export type DecisionsJ16RequestV001 = Readonly<{
  sourceSha256: string; sourceBytes: number; requestSha256: string;
  localCaptionIds: readonly string[];
  body: Readonly<{model: string; input: string; questions: readonly Question[]}>;
}>;
export type J16AnswerV001 = {
  localCaptionId: string; outcome: 'choice'; choice: J16ChoiceV001;
  confidence: number; probabilities: Array<{value: J16ChoiceV001; probability: number}>;
} | {localCaptionId: string; outcome: 'refusal'; choice: null};
export type DecisionsJ16MockResultV001 = {
  mode: 'mock'; status: 'complete'; requestSha256: string; answers: J16AnswerV001[];
  rawResponseBody: string; responseSha256: string;
} | {mode: 'mock'; status: 'transport-failed' | 'http-failed' | 'response-invalid';
  requestSha256: string; answers: null};
export type DecisionsJ16MockPortV001 = {
  mode: 'mock'; exchange(request: Readonly<{method: 'POST'; url: string;
    headers: Readonly<Record<string, string>>; body: string}>): Promise<{status: number; body: string}>;
};
const requests = new WeakSet<object>();
const sha = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const isObject = (v: unknown): v is JsonObject => !!v && typeof v === 'object' && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const probability = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw new TypeError(code);
}
function exact(value: unknown, keys: string[], code: string): asserts value is JsonObject {
  check(isObject(value) && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key)), code);
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Bind the saved, label-free J16 projection before mapping it to the documented wire shape. */
export function buildDecisionsJ16RequestV001(source: Uint8Array,
  binding: {sha256: string; bytes: number; captionIds: readonly string[]},
  captionIndices?: readonly number[]): DecisionsJ16RequestV001 {
  check(/^[a-f0-9]{64}$/u.test(binding.sha256) && Number.isSafeInteger(binding.bytes)
    && binding.bytes > 0 && source.byteLength === binding.bytes
    && sha(source) === binding.sha256, 'J16_SOURCE_BINDING');
  const text = new TextDecoder('utf-8', {fatal: true}).decode(source);
  const document: unknown = JSON.parse(text);
  exact(document, ['documentKind', 'context', 'answerMeaning', 'questions'], 'J16_DOCUMENT_FIELDS');
  check(document.documentKind === 'zev-j16-offline-input-v001', 'J16_DOCUMENT_KIND');
  exact(document.context, ['productionPurpose', 'scene', 'captions', 'adjacentCaptions', 'adjacentScenes',
    'availableVocabulary', 'physicalObservations', 'audioLimitations', 'audioCandidates'], 'J16_CONTEXT_FIELDS');
  exact(document.answerMeaning, [...J16_CHOICES_V001], 'J16_MEANING_FIELDS');
  check(J16_CHOICES_V001.every(choice => nonempty(document.answerMeaning[choice])), 'J16_MEANING_EMPTY');
  check(Array.isArray(document.questions) && document.questions.length > 0
    && Array.isArray(document.context.captions)
    && document.context.captions.length === document.questions.length, 'J16_INPUT_COVERAGE');
  check(binding.captionIds.length === document.questions.length
    && binding.captionIds.every(nonempty)
    && new Set(binding.captionIds).size === binding.captionIds.length, 'J16_BOUND_IDS');
  for (const [index, question] of document.questions.entries()) {
    exact(question, ['localCaptionId', 'captionIndex', 'question'], 'J16_QUESTION_FIELDS');
    check(question.localCaptionId === binding.captionIds[index] && question.captionIndex === index
      && document.context.captions[index]?.captionId === question.localCaptionId
      && nonempty(question.question), 'J16_QUESTION_BINDING');
  }
  const selected = captionIndices === undefined ? document.questions.map((_: unknown, i: number) => i) : [...captionIndices];
  check(selected.length > 0 && selected.every((i: number, p: number) => Number.isSafeInteger(i)
    && i >= 0 && i < document.questions.length && (p === 0 || i > selected[p - 1])), 'J16_SELECTED_INDICES');
  const questions: Question[] = selected.map((i: number) => ({type: 'choice',
    name: document.questions[i].localCaptionId, instructions: document.questions[i].question,
    choices: J16_CHOICES_V001.map(value => ({value, description: document.answerMeaning[value]}))}));
  // The complete scene and boundary context is shared even for a selected subset of questions.
  const body = {model: DECISIONS_J16_MODEL_V001, input: JSON.stringify(document.context), questions};
  const result = freeze({sourceSha256: binding.sha256, sourceBytes: binding.bytes,
    requestSha256: sha(JSON.stringify(body)), localCaptionIds: questions.map(q => q.name), body});
  requests.add(result);
  return result;
}

function assertRequest(request: DecisionsJ16RequestV001): void {
  check(requests.has(request) && sha(JSON.stringify(request.body)) === request.requestSha256,
    'J16_REQUEST_NOT_BUILT');
}

/** Required answer fields come from the official guide; unused envelope metadata is not invented. */
export function validateDecisionsJ16AnswersV001(request: DecisionsJ16RequestV001,
  response: unknown): J16AnswerV001[] {
  assertRequest(request);
  check(isObject(response) && Array.isArray(response.answers)
    && response.answers.length === request.localCaptionIds.length, 'J16_ANSWER_COVERAGE');
  const allowedIds = new Set(request.localCaptionIds), rows = new Map<string, J16AnswerV001>();
  for (const answer of response.answers) {
    check(isObject(answer) && nonempty(answer.name) && allowedIds.has(answer.name)
      && !rows.has(answer.name), 'J16_ANSWER_ID');
    if (answer.type === 'refusal') {
      rows.set(answer.name, {localCaptionId: answer.name, outcome: 'refusal', choice: null});
      continue;
    }
    check(answer.type === 'choice' && J16_CHOICES_V001.includes(answer.choice)
      && probability(answer.confidence) && Array.isArray(answer.probabilities)
      && answer.probabilities.length === J16_CHOICES_V001.length, 'J16_ANSWER_TYPE');
    const values = new Set<string>();
    const distribution = answer.probabilities.map((row: unknown) => {
      check(isObject(row) && J16_CHOICES_V001.includes(row.value)
        && !values.has(row.value) && probability(row.probability), 'J16_PROBABILITIES');
      values.add(row.value);
      return {value: row.value as J16ChoiceV001, probability: row.probability as number};
    });
    rows.set(answer.name, {localCaptionId: answer.name, outcome: 'choice', choice: answer.choice,
      confidence: answer.confidence, probabilities: distribution});
  }
  // Match by echoed name; provider array order is not a caption ID or a source clock.
  return request.localCaptionIds.map(id => rows.get(id)!);
}

/** Mock-only exchange: live mode is rejected before dispatch; no retry or automatic fallback. */
export async function runDecisionsJ16MockV001(request: DecisionsJ16RequestV001,
  port: DecisionsJ16MockPortV001): Promise<DecisionsJ16MockResultV001> {
  assertRequest(request);
  check(port.mode === 'mock', 'J16_LIVE_NOT_ADMITTED');
  let response: {status: number; body: string};
  try { response = await port.exchange(freeze({method: 'POST', url: DECISIONS_J16_ENDPOINT_V001,
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify(request.body)})); }
  catch { return {mode: 'mock', status: 'transport-failed', requestSha256: request.requestSha256, answers: null}; }
  if (!isObject(response) || response.status !== 200) {
    return {mode: 'mock', status: 'http-failed', requestSha256: request.requestSha256, answers: null};
  }
  try {
    const answers = validateDecisionsJ16AnswersV001(request, JSON.parse(response.body));
    // Keep the original envelope for the future caller's audit/usage handling.
    // Do not manufacture undocumented metadata fields or discard fields during normalization.
    return {mode: 'mock', status: 'complete', requestSha256: request.requestSha256, answers,
      rawResponseBody: response.body, responseSha256: sha(response.body)};
  } catch {
    return {mode: 'mock', status: 'response-invalid', requestSha256: request.requestSha256, answers: null};
  }
}

export type J16ByteBindingV001 = {sha256: string; bytes: number};
export type J16OfflineReviewOptionsV001 = {
  request: DecisionsJ16RequestV001;
  inputBytes: Uint8Array; inputBinding: J16ByteBindingV001;
  replyBytes: Uint8Array; replyBinding: J16ByteBindingV001;
  responseBytes: Uint8Array; responseBinding: J16ByteBindingV001;
  // The existing orchestration receiver validates all rich fields and physical choices.
  // Its return value is ignored: this is a check, never permission or a saved state.
  assertDetailedReply: (input: JsonObject, replyBytes: string) => void;
};
const canonical = (value: any): string => JSON.stringify(sortKeys(value));
function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
}
function readBoundJson(bytes: Uint8Array, binding: J16ByteBindingV001, code: string): {text: string; value: any} {
  check(/^[a-f0-9]{64}$/u.test(binding.sha256) && Number.isSafeInteger(binding.bytes)
    && bytes.byteLength === binding.bytes && sha(bytes) === binding.sha256, code);
  const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  return {text, value: JSON.parse(text)};
}
function projectOrchestrationScene(input: JsonObject, sceneId: string): JsonObject {
  check(Array.isArray(input.captions) && Array.isArray(input.contexts)
    && Array.isArray(input.observations) && Array.isArray(input.audioCandidates)
    && isObject(input.audioEvidence) && Array.isArray(input.audioEvidence.limitations), 'J16_ORCHESTRATION_FIELDS');
  const contexts = new Map(input.contexts.map((row: JsonObject) => [row.contextId, row]));
  check(contexts.size === input.contexts.length && contexts.has(sceneId), 'J16_ORCHESTRATION_SCENE');
  const positions = input.captions.flatMap((row: JsonObject, i: number) => row.contextId === sceneId ? [i] : []);
  check(positions.length > 0 && positions.every((p: number, i: number) => p === positions[0] + i), 'J16_ORCHESTRATION_CONTIGUITY');
  const captions = positions.map((i: number) => input.captions[i]);
  const adjacentCaptions = [positions[0] - 1, positions.at(-1)! + 1]
    .filter(i => i >= 0 && i < input.captions.length).map(i => input.captions[i]);
  const ids = new Set([...captions, ...adjacentCaptions].map(row => row.captionId));
  const copyKeys = (row: JsonObject, keys: string[]): JsonObject => {
    check(isObject(row) && keys.every(key => Object.hasOwn(row, key)), 'J16_ORCHESTRATION_OBSERVATION');
    return Object.fromEntries(keys.map(key => [key, row[key]]));
  };
  // Same label-free projection as the saved J16 experiment; compare every observation,
  // boundary, caption clock and scene, rather than accepting matching text/IDs alone.
  const audioCandidates = input.audioCandidates.filter((row: JsonObject) =>
    Array.isArray(row.captionIds) && row.captionIds.some((id: string) => ids.has(id))).map((row: JsonObject) => ({
    ...copyKeys(row, ['candidateId', 'startSec', 'endSec', 'peakSec', 'metrics', 'reasons', 'captionIds']),
    ...Object.fromEntries(['asrSegments', 'asrContext'].map(key => {
      check(Array.isArray(row[key]), 'J16_ORCHESTRATION_ASR');
      return [key, row[key].map((part: JsonObject) => copyKeys(part, ['id', 'startSec', 'endSec', 'text']))];
    }))}));
  return {productionPurpose: input.productionPurpose, scene: contexts.get(sceneId), captions, adjacentCaptions,
    adjacentScenes: [...new Set(adjacentCaptions.map(row => row.contextId))].map(id => contexts.get(id)),
    availableVocabulary: input.captionRolePresets,
    physicalObservations: input.observations.filter((row: JsonObject) =>
      Array.isArray(row.captionIds) && row.captionIds.some((id: string) => ids.has(id))),
    audioLimitations: input.audioEvidence.limitations, audioCandidates};
}

/** Offline, non-authoritative review beside the current rich-answer receiver.
 * It never changes a rich answer, infers missing choices, starts HTTP or fixes a state.
 * All byte identities are supplied from the caller's explicit frozen file bindings. */
export function reviewDecisionsJ16OrchestrationV001(options: J16OfflineReviewOptionsV001) {
  const {request} = options;assertRequest(request);
  check(typeof options.assertDetailedReply === 'function', 'J16_DETAIL_VALIDATOR_REQUIRED');
  const input = readBoundJson(options.inputBytes, options.inputBinding, 'J16_ORCHESTRATION_INPUT_BINDING').value;
  check(isObject(input) && input.schemaVersion === 'presentation-orchestration-judgment-input-v003'
    && /^[a-f0-9]{64}$/u.test(input.inputSha256), 'J16_ORCHESTRATION_INPUT');
  const {inputSha256, ...inputBody} = input;
  check(sha(canonical(inputBody)) === inputSha256, 'J16_ORCHESTRATION_INPUT_HASH');
  const shared = JSON.parse(request.body.input);
  check(isObject(shared.scene) && nonempty(shared.scene.contextId)
    && canonical(projectOrchestrationScene(input, shared.scene.contextId)) === canonical(shared), 'J16_ORCHESTRATION_PROJECTION');
  const allIds = input.captions.map((row: JsonObject) => row.captionId);
  check(allIds.every(nonempty) && new Set(allIds).size === allIds.length
    && request.localCaptionIds.every(id => allIds.includes(id)), 'J16_ORCHESTRATION_IDS');

  // Binding failures stop before review; malformed/missing semantics remain held.
  const globalIssues: string[] = [];
  let response: any = null, answers: J16AnswerV001[] | null = null;
  check(options.responseBytes.byteLength === options.responseBinding.bytes
    && sha(options.responseBytes) === options.responseBinding.sha256, 'J16_RESPONSE_BINDING');
  try {
    response = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(options.responseBytes));
    check(response.model === request.body.model, 'J16_RESPONSE_MODEL');
    answers = validateDecisionsJ16AnswersV001(request, response);
  } catch {globalIssues.push('J16_RESPONSE_INVALID');}
  check(options.replyBytes.byteLength === options.replyBinding.bytes
    && sha(options.replyBytes) === options.replyBinding.sha256, 'J16_DETAIL_REPLY_BINDING');
  const rawDetail = new TextDecoder('utf-8', {fatal: true}).decode(options.replyBytes);
  let reply: any = null, detailValidation = 'held';
  try {
    reply = JSON.parse(rawDetail);
    check(isObject(reply) && reply.inputSha256 === inputSha256 && Array.isArray(reply.captions), 'J16_DETAIL_REPLY_INPUT');
    options.assertDetailedReply(structuredClone(input), rawDetail);
    detailValidation = 'passed';
  } catch {globalIssues.push('J16_DETAILS_INVALID');}
  const rows = request.localCaptionIds.map(captionId => {
    const answer = answers?.find(row => row.localCaptionId === captionId) ?? null;
    const details = Array.isArray(reply?.captions) ? reply.captions.filter((row: any) => row?.captionId === captionId) : [];
    const detail = details.length === 1 ? structuredClone(details[0]) : null;
    const issues: string[] = [];
    if (!answer) issues.push('J16_ANSWER_UNAVAILABLE');
    else if (answer.outcome === 'refusal') issues.push('J16_REFUSAL');
    else if (answer.choice === 'unresolved') issues.push('J16_UNRESOLVED');
    if (!detail) issues.push('DETAIL_MISSING_OR_DUPLICATED');
    else {
      if (detail.status !== 'resolved') issues.push('DETAIL_UNRESOLVED_OR_UNREPRESENTABLE');
      if (!nonempty(detail.reason) || !Array.isArray(detail.evidenceIds) || !detail.evidenceIds.length
        || !Array.isArray(detail.allowedPresets) || !detail.allowedPresets.length) issues.push('DETAIL_INFORMATION_MISSING');
      if (detail.status === 'resolved' && answer?.outcome === 'choice' && answer.choice !== 'unresolved'
        && (answer.choice === 'normal') !== (detail.semanticRole === 'normal')) issues.push('J16_DETAIL_CONFLICT');
    }
    if (detailValidation !== 'passed') issues.push('DETAIL_VALIDATION_FAILED');
    return {captionId, status: issues.length ? 'held' : 'consistent', issues,
      j16Answer: answer, detail};
  });
  const unreviewedCaptionIds = allIds.filter((id: string) => !request.localCaptionIds.includes(id));
  if (unreviewedCaptionIds.length) globalIssues.push('J16_PARTIAL_COVERAGE');
  const body = {schemaVersion: 'zev-j16-orchestration-offline-review-v001', mode: 'offline-review',
    authoritative: false, readyForFormalAcceptance: false,
    status: globalIssues.length || rows.some(row => row.status === 'held') ? 'held' : 'consistent',
    inputFile: {...options.inputBinding}, inputSha256, sourceSha256: request.sourceSha256,
    requestSha256: request.requestSha256, responseFile: {...options.responseBinding},
    detailReplyFile: {...options.replyBinding}, responseModel: response?.model ?? null, usage: response?.usage ?? null,
    detailValidation, globalIssues, targetCaptionIds: [...request.localCaptionIds], unreviewedCaptionIds,
    completeJ16Coverage: unreviewedCaptionIds.length === 0,
    counts: {target: rows.length, consistent: rows.filter(row => row.status === 'consistent').length,
      held: rows.filter(row => row.status === 'held').length, unreviewed: unreviewedCaptionIds.length}, rows};
  return freeze({...body, reviewSha256: sha(canonical(body))});
}

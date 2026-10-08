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

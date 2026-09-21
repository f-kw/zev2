// A display wrapper over existing reviews. Hashes are computed and checked by
// the Node builder; this browser-pure module preserves their exact bindings.
import {canonical, validateReview, blankAnswers, validateAnswers, recordAnswer} from './core.mjs';

export const SESSION_SCHEMA = 'zev-point-review-session-v001';
export const SESSION_ANSWER_SCHEMA = 'zev-point-review-session-answers-v001';
export const RETRY_ANSWER_SCHEMA = 'zev-point-review-retry-answers-v001';

function sessionFail(message) { throw new Error(`review session: ${message}`); }
function sessionKeys(value, expected, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) {
    sessionFail(`${where}: fields do not match`);
  }
}
function sessionText(value, where) {
  if (typeof value !== 'string' || !value.trim()) sessionFail(`${where}: nonempty text is required`);
}
function sessionHash(value, where) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) sessionFail(`${where}: SHA-256 is required`);
}
function sessionArray(value, where) {
  if (!Array.isArray(value) || value.length === 0) sessionFail(`${where}: nonempty array is required`);
}
function sessionSame(actual, expected, where) {
  if (canonical(actual) !== canonical(expected)) sessionFail(`${where}: binding does not match`);
}
function sessionTimestamp(value) {
  // Do not invent a receipt time, accept a date without a timezone, or allow
  // Date.parse to silently roll an impossible calendar date into another day.
  const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/);
  if (!m || !Number.isFinite(Date.parse(value))) sessionFail('answered_at: timezone-qualified receipt timestamp is required');
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || hour > 23 || minute > 59 || second > 59
    || (m[7] && (Number(m[8]) > 23 || Number(m[9]) > 59))) {
    sessionFail('answered_at: invalid calendar timestamp');
  }
}
function sessionAnswerContent(answer) {
  return {choice: answer.choice, comment: answer.comment, raw_response: answer.raw_response,
    source: answer.source, answered_at: answer.answered_at};
}
function sessionCheckTimestamps(answers) {
  for (const answer of answers.answers) if (answer.source !== null) sessionTimestamp(answer.answered_at);
}
function sessionUnionPlayback(current, incoming) {
  return [...new Set([...current.playback_started_view_ids, ...incoming.playback_started_view_ids])];
}
function sessionCheckBaseline(source, answers) {
  for (const baseline of source.initial_answers.answers) {
    const next = answers.answers.find(answer => answer.point_id === baseline.point_id);
    if (baseline.source !== null) sessionSame(sessionAnswerContent(next), sessionAnswerContent(baseline), `${baseline.point_id}: original answer`);
    if (baseline.playback_started_view_ids.some(id => !next.playback_started_view_ids.includes(id))) {
      sessionFail(`${baseline.point_id}: original playback record was removed`);
    }
  }
}

export function createSessionPackage(input) {
  sessionKeys(input, ['session_id', 'title', 'intro', 'display_review', 'display_review_sha256', 'sources'], 'input');
  const packageValue = {schema_version: SESSION_SCHEMA, ...structuredClone(input)};
  return validateSessionPackage(packageValue);
}

export function validateSessionPackage(packageValue) {
  sessionKeys(packageValue, ['schema_version', 'session_id', 'title', 'intro', 'display_review', 'display_review_sha256', 'sources'], 'package');
  if (packageValue.schema_version !== SESSION_SCHEMA) sessionFail('unsupported package schema');
  if (typeof packageValue.session_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(packageValue.session_id)) sessionFail('invalid session_id');
  sessionText(packageValue.title, 'title'); sessionText(packageValue.intro, 'intro');
  sessionHash(packageValue.display_review_sha256, 'display_review_sha256');
  sessionArray(packageValue.sources, 'sources');
  const batches = new Set();
  for (const source of packageValue.sources) {
    sessionKeys(source, ['review', 'review_sha256', 'initial_answers'], 'source');
    validateReview(source.review); sessionHash(source.review_sha256, 'source.review_sha256');
    if (batches.has(source.review.batch_id) || source.review.batch_id === packageValue.session_id) sessionFail('source batch IDs must be distinct from each other and the display wrapper');
    batches.add(source.review.batch_id);
    validateAnswers(source.initial_answers, source.review, source.review_sha256);
    sessionCheckTimestamps(source.initial_answers);
  }
  const display = validateReview(packageValue.display_review);
  if (display.batch_id !== packageValue.session_id || display.title !== packageValue.title || display.intro !== packageValue.intro) sessionFail('display header does not match its wrapper');
  sessionSame(display.media, packageValue.sources.flatMap(source => source.review.media), 'display media');
  sessionSame(display.points, packageValue.sources.flatMap(source => source.review.points), 'display points');
  return packageValue;
}

export function blankSessionAnswers(packageValue) {
  validateSessionPackage(packageValue);
  const envelope = {
    schema_version: SESSION_ANSWER_SCHEMA,
    session_id: packageValue.session_id,
    display_review_sha256: packageValue.display_review_sha256,
    batches: packageValue.sources.map(source => ({review: structuredClone(source.review),
      review_sha256: source.review_sha256, answers: structuredClone(source.initial_answers)})),
  };
  return validateSessionAnswers(packageValue, envelope);
}

// Retry is a display request over the same reviews, not another quality review.
// The received answers remain verbatim evidence; only the requested drafts reset.
export function validateSessionRetry(packageValue, retry) {
  sessionKeys(retry, ['points', 'received_answers', 'sha256'], 'retry');
  sessionHash(retry.sha256, 'retry.sha256');
  validateSessionAnswers(packageValue, retry.received_answers);
  sessionArray(retry.points, 'retry points');
  const ids = new Set();
  for (const requested of retry.points) {
    sessionKeys(requested, ['point_id', 'initial_view_id'], 'retry point');
    const point = packageValue.display_review.points.find(point => point.point_id === requested.point_id);
    if (!point || ids.has(requested.point_id) || !point.views.some(view => view.view_id === requested.initial_view_id))
      sessionFail('retry point or initial view does not match');
    ids.add(requested.point_id);
  }
  for (let index = 0; index < packageValue.sources.length; index++) {
    const expected = structuredClone(retry.received_answers.batches[index].answers);
    for (const answer of expected.answers) if (ids.has(answer.point_id))
      Object.assign(answer, {choice: null, comment: '', raw_response: '', source: null, answered_at: null});
    sessionSame(packageValue.sources[index].initial_answers, expected, 'retry answer draft');
  }
  return retry;
}

export function packRetrySessionAnswers(packageValue, retry, answers) {
  validateSessionRetry(packageValue, retry);
  validateSessionAnswers(packageValue, answers);
  const packet = {schema_version: RETRY_ANSWER_SCHEMA, retry_sha256: retry.sha256, answers: structuredClone(answers)};
  readRetrySessionAnswers(packageValue, retry, packet);
  return packet;
}

export function readRetrySessionAnswers(packageValue, retry, packet) {
  sessionKeys(packet, ['schema_version', 'retry_sha256', 'answers'], 'retry answer packet');
  validateSessionRetry(packageValue, retry);
  if (packet.schema_version !== RETRY_ANSWER_SCHEMA || packet.retry_sha256 !== retry.sha256)
    sessionFail('answers belong to another retry request');
  validateSessionAnswers(packageValue, packet.answers);
  const targets = new Set(retry.points.map(point => point.point_id));
  for (let index = 0; index < packageValue.sources.length; index++) {
    for (const original of retry.received_answers.batches[index].answers.answers) if (!targets.has(original.point_id)) {
      const incoming = packet.answers.batches[index].answers.answers.find(answer => answer.point_id === original.point_id);
      sessionSame(incoming, original, 'answer outside the requested retry');
    }
  }
  return packet.answers;
}

export function mergeRetrySessionAnswers(packageValue, retry, current, packet) {
  validateSessionAnswers(packageValue, current);
  sessionSame(current, retry.received_answers, 'retry received state is no longer current');
  const incoming = readRetrySessionAnswers(packageValue, retry, packet), next = structuredClone(current);
  const targets = new Set(retry.points.map(point => point.point_id));
  for (let index = 0; index < next.batches.length; index++) {
    next.batches[index].answers.answers = next.batches[index].answers.answers.map(previous => {
      if (!targets.has(previous.point_id)) return previous;
      const answer = incoming.batches[index].answers.answers.find(item => item.point_id === previous.point_id);
      return {...structuredClone(answer.source === null ? previous : answer),
        playback_started_view_ids: sessionUnionPlayback(previous, answer)};
    });
  }
  return validateSessionAnswers(packageValue, next);
}

export function validateSessionAnswers(packageValue, envelope) {
  validateSessionPackage(packageValue);
  sessionKeys(envelope, ['schema_version', 'session_id', 'display_review_sha256', 'batches'], 'answer envelope');
  if (envelope.schema_version !== SESSION_ANSWER_SCHEMA || envelope.session_id !== packageValue.session_id
    || envelope.display_review_sha256 !== packageValue.display_review_sha256) sessionFail('answers belong to another display session');
  sessionArray(envelope.batches, 'answer batches');
  if (envelope.batches.length !== packageValue.sources.length) sessionFail('answer batch count does not match');
  for (let index = 0; index < packageValue.sources.length; index++) {
    const source = packageValue.sources[index], batch = envelope.batches[index];
    sessionKeys(batch, ['review', 'review_sha256', 'answers'], 'answer batch');
    sessionSame(batch.review, source.review, 'original review');
    if (batch.review_sha256 !== source.review_sha256) sessionFail('original review SHA-256 does not match');
    validateAnswers(batch.answers, source.review, source.review_sha256);
    sessionCheckTimestamps(batch.answers);
    sessionCheckBaseline(source, batch.answers);
  }
  return envelope;
}

export function toAggregateAnswers(packageValue, envelope) {
  validateSessionAnswers(packageValue, envelope);
  const aggregate = blankAnswers(packageValue.display_review, packageValue.display_review_sha256);
  aggregate.answers = packageValue.sources.flatMap((source, index) => source.review.points.map(point =>
    structuredClone(envelope.batches[index].answers.answers.find(answer => answer.point_id === point.point_id))));
  return validateAnswers(aggregate, packageValue.display_review, packageValue.display_review_sha256);
}

export function fromAggregateAnswers(packageValue, currentEnvelope, aggregateAnswers) {
  validateSessionAnswers(packageValue, currentEnvelope);
  validateAnswers(aggregateAnswers, packageValue.display_review, packageValue.display_review_sha256);
  sessionCheckTimestamps(aggregateAnswers);
  const next = structuredClone(currentEnvelope);
  for (const batch of next.batches) {
    batch.answers.answers = batch.answers.answers.map(current => {
      const incoming = aggregateAnswers.answers.find(answer => answer.point_id === current.point_id);
      return {...structuredClone(incoming), playback_started_view_ids: sessionUnionPlayback(current, incoming)};
    });
  }
  return validateSessionAnswers(packageValue, next);
}

export function mergeSessionAnswers(packageValue, currentEnvelope, incomingEnvelope) {
  validateSessionAnswers(packageValue, currentEnvelope);
  validateSessionAnswers(packageValue, incomingEnvelope);
  const next = structuredClone(currentEnvelope);
  for (let index = 0; index < next.batches.length; index++) {
    const incomingAnswers = incomingEnvelope.batches[index].answers.answers;
    next.batches[index].answers.answers = next.batches[index].answers.answers.map(current => {
      const incoming = incomingAnswers.find(answer => answer.point_id === current.point_id);
      if (current.source !== null && incoming.source !== null
        && canonical(sessionAnswerContent(current)) !== canonical(sessionAnswerContent(incoming))) {
        sessionFail(`${current.point_id}: conflicting answer; existing raw response, source and timestamp are preserved`);
      }
      const retained = incoming.source === null ? current : incoming;
      return {...structuredClone(retained), playback_started_view_ids: sessionUnionPlayback(current, incoming)};
    });
  }
  return validateSessionAnswers(packageValue, next);
}

export function recordNumberedChatAnswers(packageValue, currentEnvelope, entries) {
  validateSessionAnswers(packageValue, currentEnvelope);
  sessionArray(entries, 'numbered chat answers');
  const numbered = packageValue.sources.flatMap((source, batchIndex) => source.review.points.map(point => ({batchIndex, point})));
  const seen = new Set();
  let incoming = blankSessionAnswers(packageValue);
  for (const entry of entries) {
    sessionKeys(entry, ['number', 'choice', 'comment', 'raw_response', 'source', 'answered_at'], 'numbered chat answer');
    if (!Number.isSafeInteger(entry.number) || entry.number < 1 || entry.number > numbered.length || seen.has(entry.number)) sessionFail('chat number is duplicate or outside this display session');
    seen.add(entry.number);
    if (entry.source !== 'chat') sessionFail('numbered chat answer requires its original chat source');
    sessionTimestamp(entry.answered_at);
    const {batchIndex, point} = numbered[entry.number - 1], source = packageValue.sources[batchIndex];
    const {number, ...answerInput} = entry;
    incoming.batches[batchIndex].answers = recordAnswer(incoming.batches[batchIndex].answers,
      source.review, source.review_sha256, point.point_id, answerInput);
  }
  incoming = validateSessionAnswers(packageValue, incoming);
  return mergeSessionAnswers(packageValue, currentEnvelope, incoming);
}

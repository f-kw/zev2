import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {REVIEW_SCHEMA, ANSWERS, canonical, validateReview, blankAnswers, recordAnswer} from './core.mjs';
import {createSessionPackage, validateSessionPackage, blankSessionAnswers, validateSessionAnswers, toAggregateAnswers, fromAggregateAnswers, mergeSessionAnswers, recordNumberedChatAnswers} from './session-core.mjs';

// Synthetic reviews only. No production answers, media, filesystem or clock are
// read or changed by these tests. The builder owns actual source hash checks.
const reviewHash = review => createHash('sha256').update(canonical(review)).digest('hex');
const pointId = number => `SYNTHETIC-POINT-${String(number).padStart(2, '0')}`;
const receiptTime = '2026-09-21T12:34:56.789+09:00';

function fixtureInput() {
  const groups = [[1, 2, 3, 4], [5], [6, 7, 8], [9], [10]];
  const sources = groups.map((numbers, batchIndex) => {
    const media = [], points = numbers.map(number => {
      const roles = number === 3 ? ['candidate', 'variant', 'variant']
        : [1, 2, 4, 9, 10].includes(number) ? ['before', 'after'] : ['candidate'];
      const views = roles.map((role, index) => {
        const media_id = `synthetic-media-${number}-${index}`;
        media.push({media_id, label: `試験媒体 ${number}/${index}`, path: `/synthetic/${media_id}.mp4`,
          sha256: createHash('sha256').update(media_id).digest('hex'), fps_num: 30, fps_den: 1,
          total_frames: 90, timeline_id: `synthetic-clock-${number}-${index}`, timeline_start_frame: role === 'before' ? 900 : 0});
        return {view_id: `synthetic-view-${number}-${index}`, label: `試験表示 ${index}`, role, media_id,
          start_frame: 10, end_frame: 40, context_start_frame: 0, context_end_frame: 60};
      });
      return {point_id: pointId(number), review_id: number <= 2 ? 'SYNTHETIC-SHARED-CENTER' : `SYNTHETIC-REVIEW-${number}`,
        related_review_ids: number === 4 ? ['SYNTHETIC-PULSE', 'SYNTHETIC-BOUNCE', 'SYNTHETIC-SHAKE'] : [],
        title: `合成試験 ${number}`, question: `この合成ポイント ${number} だけはどう見えるか。`,
        target_function: '合成コード試験', change_summary: '実製品の品質判断ではない', why_human_review: '試験データ',
        scope: {level: [3, 4, 5].includes(number) ? 'bundle' : 'point',
          applies_to: [`合成ポイント ${number} のみ`], does_not_apply_to: ['関連項目の個別判断', '採用', '全編']}, views};
    });
    const review = validateReview({schema_version: REVIEW_SCHEMA, batch_id: `SYNTHETIC-BATCH-${batchIndex + 1}`,
      revision: 'v001', title: `元の合成Batch ${batchIndex + 1}`, intro: '試験専用の元レビュー', media, points});
    const review_sha256 = reviewHash(review);
    return {review, review_sha256, initial_answers: blankAnswers(review, review_sha256)};
  });
  const session_id = 'SYNTHETIC-PENDING-10', title = '合成10ポイント', intro = 'コード試験用の一括表示';
  const display_review = {schema_version: REVIEW_SCHEMA, batch_id: session_id, revision: 'v001', title, intro,
    media: sources.flatMap(source => structuredClone(source.review.media)),
    points: sources.flatMap(source => structuredClone(source.review.points))};
  return {session_id, title, intro, display_review, display_review_sha256: reviewHash(display_review), sources};
}
function fixture() { return createSessionPackage(fixtureInput()); }
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}
function answer(envelope, number) {
  return envelope.batches.flatMap(batch => batch.answers.answers).find(item => item.point_id === pointId(number));
}
function localInput(choice, comment = '', answered_at = receiptTime) {
  const raw_response = [choice === null ? '' : ANSWERS[choice], comment].filter(Boolean).join('\n');
  return {choice, comment, raw_response, source: raw_response ? 'local_form' : null, answered_at: raw_response ? answered_at : null};
}
function chatEntry(number, choice = 'good', raw_response = `${number} は良い`, overrides = {}) {
  return {number, choice, comment: '', raw_response, source: 'chat', answered_at: receiptTime, ...overrides};
}
function editDisplay(packageValue, envelope, number, input) {
  const aggregate = toAggregateAnswers(packageValue, envelope);
  const edited = recordAnswer(aggregate, packageValue.display_review, packageValue.display_review_sha256, pointId(number), input);
  return fromAggregateAnswers(packageValue, envelope, edited);
}

test('numbered chat answers preserve exact raw text, receipt source and timezone while unanswered and no-decision remain different', () => {
  const packageValue = deepFreeze(fixture()), initial = deepFreeze(blankSessionAnswers(packageValue));
  const raw = '  2: 良い\n対象はこの横長の例だけです。\n';
  const updated = recordNumberedChatAnswers(packageValue, initial, [
    chatEntry(2, 'good', raw),
    chatEntry(7, 'no_decision', '7: 判断しない。短くて分からない。'),
    chatEntry(10, null, '10: 長さについてはまだ迷っています。', {comment: '選択肢は未確定'}),
  ]);
  assert.equal(answer(updated, 1).source, null);
  assert.equal(answer(updated, 2).raw_response, raw);
  assert.equal(answer(updated, 2).answered_at, receiptTime);
  assert.equal(answer(updated, 2).source, 'chat');
  assert.equal(answer(updated, 7).choice, 'no_decision');
  assert.equal(answer(updated, 7).source, 'chat');
  assert.equal(answer(updated, 10).choice, null);
  assert.equal(answer(updated, 10).source, 'chat');
  assert.equal(updated.batches.flatMap(batch => batch.answers.answers).filter(item => item.source !== null).length, 3);
  assert.ok(updated.batches.flatMap(batch => batch.answers.answers).every(item => item.playback_started_view_ids.length === 0));
  assert.deepEqual(answer(updated, 9), answer(initial, 9));
  assert.deepEqual(initial, blankSessionAnswers(packageValue));
  assert.deepEqual(recordNumberedChatAnswers(packageValue, updated, [chatEntry(2, 'good', raw)]), updated);
});

test('explicit form edits can extend or clear this session draft while preserving the original baseline and playback observations', () => {
  const packageValue = deepFreeze(fixture()), initial = blankSessionAnswers(packageValue);
  const first = editDisplay(packageValue, initial, 1, localInput('good', '中'));
  const second = editDisplay(packageValue, first, 1, localInput('good', '中央', '2026-09-21T12:35:00+09:00'));
  assert.equal(answer(second, 1).comment, '中央');
  assert.equal(answer(first, 1).comment, '中');
  assert.equal(answer(initial, 1).source, null);
  assert.deepEqual(answer(second, 2), answer(initial, 2));
  const played = toAggregateAnswers(packageValue, second);
  played.answers.find(item => item.point_id === pointId(1)).playback_started_view_ids.push('synthetic-view-1-0');
  const savedPlayback = fromAggregateAnswers(packageValue, second, played);
  const cleared = editDisplay(packageValue, savedPlayback, 1, localInput(null));
  assert.equal(answer(cleared, 1).source, null);
  assert.equal(answer(cleared, 1).raw_response, '');
  assert.deepEqual(answer(cleared, 1).playback_started_view_ids, ['synthetic-view-1-0']);
  assert.deepEqual(packageValue.sources[0].initial_answers, fixture().sources[0].initial_answers);
});

test('answers that already existed in the original baseline cannot be edited or cleared through display projection or imported files', () => {
  const input = fixtureInput(), source = input.sources[0];
  source.initial_answers = recordAnswer(source.initial_answers, source.review, source.review_sha256,
    pointId(1), {choice: 'good', comment: '', raw_response: '以前の本人原文', source: 'chat', answered_at: receiptTime});
  source.initial_answers.answers[0].playback_started_view_ids = ['synthetic-view-1-0'];
  const packageValue = deepFreeze(createSessionPackage(input)), initial = deepFreeze(blankSessionAnswers(packageValue));
  assert.equal(answer(initial, 1).raw_response, '以前の本人原文');
  assert.throws(() => editDisplay(packageValue, initial, 1, localInput('good')), /original answer/);
  assert.throws(() => editDisplay(packageValue, initial, 1, localInput(null)), /original answer/);
  const changed = structuredClone(initial); answer(changed, 1).raw_response = '無断で変更';
  assert.throws(() => mergeSessionAnswers(packageValue, initial, changed), /original answer/);
  const erasedPlayback = structuredClone(initial); answer(erasedPlayback, 1).playback_started_view_ids = [];
  assert.throws(() => validateSessionAnswers(packageValue, erasedPlayback), /original playback/);
  assert.equal(answer(recordNumberedChatAnswers(packageValue, initial, [chatEntry(2)]), 1).raw_response, '以前の本人原文');
});

test('a conflict in any raw response, choice, comment, source or timestamp rejects an entire import or numbered chat update without mutation', () => {
  const packageValue = fixture(), initial = blankSessionAnswers(packageValue);
  const current = deepFreeze(recordNumberedChatAnswers(packageValue, initial, [chatEntry(2, 'good', '良い')]));
  const preserved = structuredClone(current);
  const mutations = [
    item => { item.choice = 'change_requested'; },
    item => { item.comment = '追加された別の説明'; },
    item => { item.raw_response = '異なる原文'; },
    item => { item.source = 'local_form'; },
    item => { item.answered_at = '2026-09-21T03:34:56.789Z'; },
  ];
  for (const mutate of mutations) {
    const incoming = recordNumberedChatAnswers(packageValue, initial, [chatEntry(1), chatEntry(2, 'good', '良い')]);
    mutate(answer(incoming, 2));
    const incomingCopy = structuredClone(incoming);
    assert.throws(() => mergeSessionAnswers(packageValue, current, incoming), /conflicting answer/);
    assert.deepEqual(incoming, incomingCopy);
    assert.deepEqual(current, preserved);
    assert.equal(answer(current, 1).source, null);
  }
  assert.throws(() => recordNumberedChatAnswers(packageValue, current,
    [chatEntry(1), chatEntry(2, 'change_requested', '2 は直したい')]), /conflicting answer/);
  assert.deepEqual(current, preserved);
});

test('display packaging preserves the original questions and source ownership instead of relabeling a different review', () => {
  const mutations = [
    p => { p.display_review.points[0].question = '異なる問い'; },
    p => { p.display_review.points.reverse(); },
    p => { p.sources.reverse(); },
    p => { p.sources.push(structuredClone(p.sources[0])); },
    p => { p.sources[0].review_sha256 = 'a'.repeat(64); },
    p => { p.display_review.title = '別の表示タイトル'; },
    p => { p.adopted = true; },
  ];
  for (const mutate of mutations) {
    const packageValue = fixture(); mutate(packageValue);
    assert.throws(() => validateSessionPackage(packageValue));
  }
  const input = fixtureInput(); input.unexpected = true;
  assert.throws(() => createSessionPackage(input), /fields/);
});

test('numbered chat input rejects invalid receipt times, invented provenance and unsupported decisions without altering other points', () => {
  const packageValue = fixture(), initial = deepFreeze(blankSessionAnswers(packageValue));
  const malformed = [
    [chatEntry(1, 'good', '原文', {source: 'local_form'})],
    [chatEntry(1, 'good', '原文', {answered_at: null})],
    [chatEntry(1, 'good', '原文', {answered_at: '2026-09-21'})],
    [chatEntry(1, 'good', '原文', {answered_at: '2026-09-21T12:34:56'})],
    [chatEntry(1, 'good', '原文', {answered_at: '2026-02-30T12:34:56Z'})],
    [chatEntry(1, 'good', '原文', {answered_at: '2025-02-29T12:34:56Z'})],
    [chatEntry(1, 'good', '原文', {answered_at: '2026-09-21T24:00:00Z'})],
    [chatEntry(1, 'good', '原文', {answered_at: '2026-09-21T12:34:56+25:00'})],
    [chatEntry(1, 'good', '   ')], [chatEntry(1, 'adopt', '採用')],
    [chatEntry(3, 'both_usable', '三種類全部を両方と呼ぶ')],
    [chatEntry(5, 'both_usable', '一つしかない対象を両方と呼ぶ')],
    [{...chatEntry(1), point_id: pointId(2)}],
    [{...chatEntry(1), playback_started_view_ids: ['synthetic-view-1-0']}],
    [{...chatEntry(1), number: undefined}],
  ];
  for (const entries of malformed) {
    assert.throws(() => recordNumberedChatAnswers(packageValue, initial, entries));
    assert.deepEqual(initial, blankSessionAnswers(packageValue));
  }
  const validLeap = recordNumberedChatAnswers(packageValue, initial,
    [chatEntry(7, 'no_decision', '7は判断しない', {answered_at: '2024-02-29T12:00:00+09:00'})]);
  assert.equal(answer(validLeap, 7).answered_at, '2024-02-29T12:00:00+09:00');
  assert.equal(answer(validLeap, 8).source, null);
});

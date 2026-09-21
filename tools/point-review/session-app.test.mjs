import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {ANSWERS, canonical, blankAnswers, validateAnswers, recordAnswer, storageKey} from './core.mjs';
import {createSessionPackage, blankSessionAnswers, toAggregateAnswers, validateSessionAnswers, recordNumberedChatAnswers, readRetrySessionAnswers, mergeRetrySessionAnswers} from './session-core.mjs';
import {createSessionAnswerIO, mountPointReviewSession} from './session-app.mjs';
import {createReviewSessionRetryBundle, renderReviewSessionHtml} from './session-build.mjs';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const files = [
  'docs/reports/digest-quality-q1-q2-20260920-v001/review-main-v001.json',
  'docs/reports/digest-quality-q3-20260920-v001/review-v001.json',
  'docs/reports/digest-quality-q4-20260920-v001/review-v001.json',
  'docs/reports/digest-quality-q5-1-20260920-v001/review-v002.json',
  'docs/reports/digest-quality-q5-2-20260921-v001/review-v001.json',
];
let fixturePromise;
function fixture() {
  fixturePromise ??= (async () => {
    const sources = [];
    for (const file of files) {
      const review = JSON.parse(await readFile(resolve(repo, file), 'utf8')), review_sha256 = hash(review);
      sources.push({review, review_sha256, initial_answers: blankAnswers(review, review_sha256)});
    }
    const review = {schema_version: 'zev-point-review-v001', batch_id: 'TEST-PENDING-SESSION', revision: 'v001',
      title: '接続検査用・実際の人間回答ではありません', intro: '既存ポイントを用いた画面接続のコード検査です。',
      media: sources.flatMap(source => structuredClone(source.review.media)),
      points: sources.flatMap(source => structuredClone(source.review.points))};
    const session = createSessionPackage({session_id: review.batch_id, title: review.title, intro: review.intro,
      display_review: review, display_review_sha256: hash(review), sources});
    return {session, bundle: {review, review_sha256: hash(review), session_package: session,
      media_sources: Object.fromEntries(review.media.map(media => [media.media_id, `file:///code-test/${media.media_id}.mp4`]))}};
  })();
  return fixturePromise;
}
const formInput = (choice, comment = '') => ({choice, comment,
  raw_response: [choice === null ? '' : ANSWERS[choice], comment].filter(Boolean).join('\n'),
  source: choice === null && !comment ? null : 'local_form',
  answered_at: choice === null && !comment ? null : '2026-09-21T12:00:00.000Z'});
function answer(session, answers, index, choice, comment = '') {
  return recordAnswer(answers, session.display_review, session.display_review_sha256,
    session.display_review.points[index].point_id, formInput(choice, comment));
}
class SessionMemoryStorage {
  values = new Map();
  getItem(key) {return this.values.get(key) ?? null;}
  setItem(key, value) {this.values.set(key, value);}
}

test('session storage/export contains five unchanged original review bindings and form edits remain editable', async () => {
  const {session} = await fixture(), storage = new SessionMemoryStorage(), io = createSessionAnswerIO(session);
  for (const source of session.sources) storage.setItem(storageKey(source.review_sha256), JSON.stringify(source.initial_answers));
  const oldStorage = new Map(storage.values);
  let display = io.load(storage);
  assert.equal(display.answers.length, 10); assert(display.answers.every(row => row.source === null));
  display = answer(session, display, 0, 'good', 'コード試験の原文'); io.save(storage, display);
  display = answer(session, display, 0, 'change_requested', 'コード試験の編集後原文'); io.save(storage, display);
  display = answer(session, display, 8, 'both_usable'); io.save(storage, display);
  const packet = validateSessionAnswers(session, JSON.parse(io.serialize(display)));
  assert.equal(packet.batches.length, 5);
  assert.deepEqual(packet.batches.map(batch => batch.answers.answers.length), [4, 1, 3, 1, 1]);
  for (const [index, batch] of packet.batches.entries()) {
    const source = session.sources[index];
    assert.deepEqual(batch.review, source.review);
    assert.equal(batch.review_sha256, source.review_sha256);
    validateAnswers(batch.answers, source.review, source.review_sha256);
    assert.equal(storage.values.get(storageKey(source.review_sha256)), oldStorage.get(storageKey(source.review_sha256)));
  }
  assert.equal(packet.batches[0].answers.answers[0].raw_response, '直したい\nコード試験の編集後原文');
  assert.equal(packet.batches[0].answers.answers[1].source, null); // Same HRC-001, different point.
  assert.equal(packet.batches[3].answers.answers[0].choice, 'both_usable');
  assert.equal(packet.batches[4].answers.answers[0].choice, null);
  assert.deepEqual(createSessionAnswerIO(session).load(storage), display);
  assert.equal(storage.values.size, oldStorage.size + 1);
  display = answer(session, display, 0, null); io.save(storage, display);
  assert.equal(createSessionAnswerIO(session).load(storage).answers[0].source, null);
});

test('imports preserve current answers, merge other points, and reject replacement even before a successful save', async () => {
  const {session} = await fixture(), io = createSessionAnswerIO(session), storage = new SessionMemoryStorage();
  const initial = io.load(storage), current = answer(session, initial, 0, 'good', '現在の入力');
  const incoming = answer(session, initial, 1, 'no_decision');
  const imported = io.parse(io.serialize(incoming), current);
  assert.deepEqual(imported.answers[0], current.answers[0]);
  assert.deepEqual(imported.answers[1], incoming.answers[1]);
  assert.deepEqual(io.parse(io.serialize(initial), current), current);
  const conflicting = answer(session, initial, 0, 'change_requested', '差し替えは禁止');
  assert.throws(() => io.parse(io.serialize(conflicting), current));
  const foreign = JSON.parse(io.serialize(incoming)); foreign.display_review_sha256 = 'f'.repeat(64);
  assert.throws(() => io.parse(JSON.stringify(foreign), current));
  const changed = JSON.parse(io.serialize(incoming)); changed.batches[0].review.points[0].question += '別の問い';
  assert.throws(() => io.parse(JSON.stringify(changed), current));
  assert.deepEqual(io.load(storage), initial);
});

class SessionElement {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.listeners = new Map(); this.attributes = new Map();
    this.textContent = ''; this.value = ''; this.disabled = false; this.hidden = false;
    this.classList = {add() {}, remove() {}, toggle() {}};
  }
  addEventListener(name, listener) {const all = this.listeners.get(name) ?? []; all.push(listener); this.listeners.set(name, all);}
  async emit(name) {for (const listener of this.listeners.get(name) ?? []) await listener({target: this});}
  append(...children) {this.children.push(...children);}
  replaceChildren(...children) {this.children = children;}
  setAttribute(name, value) {this.attributes.set(name, value);}
  getAttribute(name) {return this.attributes.get(name) ?? null;}
  querySelector() {return this.children.flatMap(child => child.children ?? []).find(child => child.tagName === 'input' && child.checked) ?? null;}
  focus() {}
  click() {return this.emit('click');}
  remove() {}
}
class SessionVideo extends SessionElement {
  constructor() {super('video'); this.currentTime = 0; this.duration = 100000; this.readyState = 1; this.paused = true; this.playbackRate = 1;}
  set src(value) {this.setAttribute('src', value);}
  get src() {return this.getAttribute('src');}
  load() {this.readyState = 0; this.currentTime = 0; this.paused = true;}
  pause() {this.paused = true;}
  async play() {this.paused = false;}
}
function sessionPage(storage = new SessionMemoryStorage()) {
  const nodes = new Map(), video = new SessionVideo(), events = new Map(), downloads = [], anchors = [];
  const document = {body: new SessionElement('body'), hidden: false,
    getElementById(id) {if (!nodes.has(id)) nodes.set(id, id === 'video' ? video : new SessionElement()); return nodes.get(id);},
    createElement(tag) {const element = new SessionElement(tag); if (tag === 'a') anchors.push(element); return element;},
    createTextNode: text => ({textContent: text}), addEventListener(name, listener) {events.set(name, listener);}};
  let sequence = 0;
  const window = {localStorage: storage, requestAnimationFrame: () => ++sequence, cancelAnimationFrame() {},
    setTimeout: () => ++sequence, clearTimeout() {}, addEventListener(name, listener) {events.set(name, listener);}, Blob,
    URL: {createObjectURL(blob) {downloads.push(blob); return 'blob:session-code-test';}, revokeObjectURL() {}}};
  return {document, window, storage, video, downloads, anchors};
}
async function choose(page, choice, comment = '') {
  const choices = page.document.getElementById('choices').children.map(child => child.children[0]);
  for (const input of choices) input.checked = input.value === choice;
  await choices.find(input => input.value === choice).emit('change');
  const field = page.document.getElementById('comment'); field.value = comment; await field.emit('input');
}

test('one existing UI navigates all ten points, shows each original introduction, and exports original answers', async () => {
  const {session, bundle} = await fixture(), page = sessionPage();
  const app = mountPointReviewSession(page.document, page.window, bundle), $ = id => page.document.getElementById(id);
  const points = session.sources.flatMap(source => source.review.points.map(point => ({source, point})));
  assert.equal($('point-nav').children.length, 10);
  for (const [index, {source, point}] of points.entries()) {
    assert.equal($('point-title').textContent, point.title); assert.equal($('question').textContent, point.question);
    assert.equal($('intro').textContent, source.review.intro);
    assert.equal($('binding').textContent, `${source.review.batch_id} / ${source.review.revision} · レビュー版 SHA-256: ${source.review_sha256}`);
    assert.equal($('applies-to').textContent, point.scope.applies_to.join(' ／ '));
    assert.equal($('does-not-apply').textContent, point.scope.does_not_apply_to.join(' ／ '));
    assert.equal($('answer-state').textContent, '未回答');
    if (index === 0) {
      page.video.readyState = 1; await page.video.emit('loadedmetadata'); await $('play').click();
      await choose(page, 'good', '接続コード試験');
    }
    if (index === 8) await choose(page, 'both_usable');
    if (index < points.length - 1) await $('next').click();
  }
  await $('export').click();
  const exported = validateSessionAnswers(session, JSON.parse(await page.downloads[0].text()));
  assert.equal(page.anchors[0].download, `${session.session_id}-answers.json`);
  assert.equal(exported.batches[0].answers.answers[0].raw_response, '良い\n接続コード試験');
  assert.equal(exported.batches[0].answers.answers[0].playback_started_view_ids.length, 1);
  assert.equal(exported.batches[0].answers.answers[1].source, null);
  assert.equal(exported.batches[3].answers.answers[0].choice, 'both_usable');
  assert.equal(exported.batches[4].answers.answers[0].source, null);
  assert.deepEqual(toAggregateAnswers(session, exported), app.getAnswers());
  const restoredPage = sessionPage(page.storage);
  const restored = mountPointReviewSession(restoredPage.document, restoredPage.window, bundle);
  assert.deepEqual(restored.getAnswers(), app.getAnswers());
});

test('UI imports cannot silently replace answers; storage denial still permits complete original-batch export', async () => {
  const {session, bundle} = await fixture();
  const storage = {getItem() {return null;}, setItem() {throw new Error('storage disabled for this code test');}};
  const page = sessionPage(storage), app = mountPointReviewSession(page.document, page.window, bundle);
  const $ = id => page.document.getElementById(id);
  await choose(page, 'good', '保存前の入力'); assert.match($('save-status').textContent, /保存できません/);
  const current = app.getAnswers(), io = createSessionAnswerIO(session);
  const initial = toAggregateAnswers(session, blankSessionAnswers(session));
  const incoming = answer(session, initial, 1, 'no_decision');
  $('import-file').files = [{text: async () => io.serialize(incoming)}]; await $('import-file').emit('change');
  assert.deepEqual(app.getAnswers().answers[0], current.answers[0]);
  assert.equal(app.getAnswers().answers[1].choice, 'no_decision');
  const beforeConflict = app.getAnswers(), conflict = answer(session, initial, 0, 'change_requested', '置換しない');
  $('import-file').files = [{text: async () => io.serialize(conflict)}]; await $('import-file').emit('change');
  assert.match($('save-status').textContent, /拒否/); assert.deepEqual(app.getAnswers(), beforeConflict);
  await $('export').click();
  const packet = validateSessionAnswers(session, JSON.parse(await page.downloads[0].text()));
  assert.equal(packet.batches[0].answers.answers[0].raw_response, '良い\n保存前の入力');
  assert.equal(packet.batches[0].answers.answers[1].choice, 'no_decision');
  assert.equal(packet.batches.length, 5);
});

test('a different display package is rejected before the existing app is mounted', async () => {
  const {bundle} = await fixture();
  const wrongSha = {...bundle, review_sha256: 'f'.repeat(64)}, page = sessionPage();
  assert.throws(() => mountPointReviewSession(page.document, page.window, wrongSha), /対応が一致しません/);
  const wrongPoint = structuredClone(bundle); wrongPoint.review.points[0].question += '別の問い';
  assert.throws(() => mountPointReviewSession(page.document, page.window, wrongPoint));
  assert.equal(page.document.getElementById('point-title').textContent, '');
});

async function retryFixture() {
  const {session, bundle} = await fixture();
  const entries = session.display_review.points.map((point, index) => ({number: index + 1,
    choice: [2, 8].includes(index) ? 'no_decision' : 'good', comment: '',
    raw_response: `【技術試験用・本人回答ではありません】${index + 1}`, source: 'chat', answered_at: '2026-09-21T04:00:00.000Z'}));
  const received = recordNumberedChatAnswers(session, blankSessionAnswers(session), entries);
  received.batches[0].answers.answers[2].playback_started_view_ids = ['background-plain'];
  const requested = [{point_id: session.display_review.points[2].point_id, initial_view_id: 'background-graph-paper'},
    {point_id: session.display_review.points[8].point_id, initial_view_id: 'Q5-AFTER-VIEW'}];
  return {session, bundle, received, retryBundle: createReviewSessionRetryBundle(bundle, received, requested)};
}

test('retry uses only original points 3 and 9 while keeping all eight other received answers unchanged', async () => {
  const {session, bundle, received, retryBundle} = await retryFixture(), page = sessionPage();
  const originalBytes = canonical({bundle, received});
  const oldKey = `zev-point-review-session:${session.display_review_sha256}`;
  page.storage.setItem(oldKey, JSON.stringify(received));
  const app = mountPointReviewSession(page.document, page.window, retryBundle), $ = id => page.document.getElementById(id);
  assert.deepEqual($('point-nav').children.map(button => button.textContent), ['3. 背景の三種類', '9. 説明の残り方と、前後のつながり']);
  assert.match($('point-number').textContent, /^POINT 3 \/ 10/); assert.equal($('previous').disabled, true);
  assert.equal($('view-label').textContent, '方眼紙（手選択）'); assert.equal($('answer-state').textContent, '未回答');
  assert.equal($('comment').value, ''); assert.equal($('view-controls').children.length, 3);
  assert.deepEqual(app.getAnswers().answers[2].playback_started_view_ids, ['background-plain']);
  await choose(page, 'good', '【技術試験用】再確認3');
  await $('next').click(); assert.match($('point-number').textContent, /^POINT 9 \/ 10/);
  assert.equal($('next').disabled, true); assert.equal($('view-controls').children.length, 2);
  assert.equal($('question').textContent, session.display_review.points[8].question);
  await choose(page, 'both_usable', '【技術試験用】再確認9');
  await $('previous').click(); assert.match($('point-number').textContent, /^POINT 3 \/ 10/);
  assert.equal($('answer-state').textContent, '良い');
  await $('export').click();
  const packet = JSON.parse(await page.downloads[0].text());
  const answers = readRetrySessionAnswers(retryBundle.session_package, retryBundle.retry, packet);
  const all = toAggregateAnswers(session, answers).answers, before = toAggregateAnswers(session, received).answers;
  for (let index = 0; index < all.length; index++) if (![2, 8].includes(index)) assert.deepEqual(all[index], before[index]);
  assert.equal(all[2].choice, 'good'); assert.equal(all[8].choice, 'both_usable');
  assert.deepEqual(answers.batches.map(batch => batch.review), received.batches.map(batch => batch.review));
  assert.equal(page.storage.getItem(oldKey), JSON.stringify(received));
  assert.match([...page.storage.values.keys()].find(key => key !== oldKey), /:retry:/);
  const restored = sessionPage(page.storage);
  assert.deepEqual(mountPointReviewSession(restored.document, restored.window, retryBundle).getAnswers(), app.getAnswers());
  assert.equal(canonical({bundle, received}), originalBytes);
});

test('retry packets reject old ten-point files, another retry, changed protected answers and stale received state', async () => {
  const {session, received, retryBundle} = await retryFixture(), retrySession = retryBundle.session_package;
  const io = createSessionAnswerIO(retrySession, retryBundle.retry), draft = io.initialAnswers();
  const before = canonical(received), packet = JSON.parse(io.serialize(draft));
  assert.throws(() => io.parse(JSON.stringify(received), draft), /fields do not match/);
  const other = structuredClone(packet); other.retry_sha256 = 'f'.repeat(64);
  assert.throws(() => io.parse(JSON.stringify(other), draft), /another retry/);
  const wrong = structuredClone(packet); wrong.answers.batches[0].answers.answers[0].raw_response += ' changed';
  assert.throws(() => io.parse(JSON.stringify(wrong), draft), /original answer/);
  const watched = structuredClone(packet); watched.answers.batches[0].answers.answers[0].playback_started_view_ids.push('short-after');
  assert.throws(() => io.parse(JSON.stringify(watched), draft), /outside the requested retry/);
  const storage = new SessionMemoryStorage();
  storage.setItem(`zev-point-review-session:${retrySession.display_review_sha256}:retry:${retryBundle.retry.sha256}`, JSON.stringify(watched.answers));
  assert.throws(() => io.load(storage), /outside the requested retry/);
  const changedDisplay = toAggregateAnswers(retrySession, watched.answers);
  assert.throws(() => io.serialize(changedDisplay), /outside the requested retry/);
  assert.throws(() => io.save(new SessionMemoryStorage(), changedDisplay), /outside the requested retry/);
  const stale = structuredClone(received); stale.batches[0].answers.answers[2].comment = 'changed';
  assert.throws(() => mergeRetrySessionAnswers(retrySession, retryBundle.retry, stale, packet), /no longer current/);
  assert.deepEqual(mergeRetrySessionAnswers(retrySession, retryBundle.retry, received, packet), received);
  let edited = answer(retrySession, draft, 2, 'good', '【技術試験用】再回答');
  const returned = JSON.parse(io.serialize(edited)), merged = mergeRetrySessionAnswers(retrySession, retryBundle.retry, received, returned);
  assert.equal(merged.batches[0].answers.answers[2].choice, 'good');
  assert.deepEqual(merged.batches[3].answers.answers[0], received.batches[3].answers.answers[0]);
  validateSessionAnswers(session, merged); assert.equal(canonical(received), before);
});

test('retry keeps eight received answers even if storage is unavailable and validates generated bundle bindings', async () => {
  const {received, retryBundle} = await retryFixture();
  const page = sessionPage({getItem() {throw new Error('test read denied');}, setItem() {throw new Error('test write denied');}});
  const app = mountPointReviewSession(page.document, page.window, retryBundle), $ = id => page.document.getElementById(id);
  assert.match($('save-status').textContent, /読み込めません/);
  assert.equal(app.getAnswers().answers.filter(answer => answer.source !== null).length, 8);
  await choose(page, 'good', '【技術試験用】端末保存不可'); await $('export').click();
  const packet = JSON.parse(await page.downloads[0].text());
  const answers = readRetrySessionAnswers(retryBundle.session_package, retryBundle.retry, packet);
  assert.deepEqual(answers.batches[4].answers, received.batches[4].answers);
  const rendered = await renderReviewSessionHtml(retryBundle);
  assert.equal((rendered.html.match(/<video /g) || []).length, 1);
  const changed = structuredClone(retryBundle); changed.retry.sha256 = 'f'.repeat(64);
  await assert.rejects(renderReviewSessionHtml(changed), /SHAが一致しません/);
  const foreign = structuredClone(retryBundle); foreign.retry.points[0].initial_view_id = 'Q5-AFTER-VIEW';
  await assert.rejects(renderReviewSessionHtml(foreign), /initial view does not match/);
});

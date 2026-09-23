// Shared by the static page and Node checks. No network or browser dependencies.
export const REVIEW_SCHEMA = 'zev-point-review-v001';
export const ANSWER_SCHEMA = 'zev-point-review-answers-v001';
export const ANSWERS = Object.freeze({good: '良い', change_requested: '直したい', both_usable: '両方使える', no_decision: '判断しない'});
const fail = (message) => { throw new Error(message); };
const own = (object, key) => Object.hasOwn(object, key);
function keys(value, expected, where) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) fail(`${where}: 項目が固定形式と一致しません`);
}
function string(value, where, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim())) fail(`${where}: 文字列が必要です`);
}
function id(value, where) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) fail(`${where}: IDが不正です`);
}
function integer(value, where, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(`${where}: 整数が不正です`);
}
function hash(value, where) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(`${where}: SHA-256が不正です`);
}
function array(value, where, nonempty = false) {
  if (!Array.isArray(value) || (nonempty && !value.length)) fail(`${where}: 配列が必要です`);
}
function unique(values, where) {
  if (new Set(values).size !== values.length) fail(`${where}: 重複IDがあります`);
}
function strings(values, where, nonempty = false) {
  array(values, where, nonempty); values.forEach(v => string(v, where)); unique(values, where);
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function validateReview(review) {
  keys(review, ['schema_version', 'batch_id', 'revision', 'title', 'intro', 'media', 'points'], 'review');
  if (review.schema_version !== REVIEW_SCHEMA) fail('review: 対応していない形式です');
  id(review.batch_id, 'batch_id'); id(review.revision, 'revision'); string(review.title, 'title'); string(review.intro, 'intro');
  array(review.media, 'media', true); array(review.points, 'points', true);
  unique(review.media.map(m => m.media_id), 'media'); unique(review.points.map(p => p.point_id), 'points');
  const media = new Map();
  for (const m of review.media) {
    keys(m, ['media_id', 'label', 'path', 'sha256', 'fps_num', 'fps_den', 'total_frames', 'timeline_id', 'timeline_start_frame'], 'media');
    id(m.media_id, 'media_id'); string(m.label, 'media.label'); string(m.path, 'media.path'); hash(m.sha256, 'media.sha256');
    // Only local filesystem paths. URL parsing and file:// conversion belong to the builder.
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(m.path) || m.path.startsWith('//') || m.path.includes('\0')) fail('media.path: ローカルファイルのpathが必要です');
    integer(m.fps_num, 'fps_num', 1); integer(m.fps_den, 'fps_den', 1); integer(m.total_frames, 'total_frames', 1);
    id(m.timeline_id, 'timeline_id'); integer(m.timeline_start_frame, 'timeline_start_frame');
    if (!Number.isSafeInteger(m.timeline_start_frame + m.total_frames)) fail('media: 元時計が範囲外です');
    media.set(m.media_id, m);
  }
  for (const p of review.points) {
    keys(p, ['point_id', 'review_id', 'related_review_ids', 'title', 'question', 'target_function', 'change_summary', 'why_human_review', 'scope', 'views'], 'point');
    id(p.point_id, 'point_id'); id(p.review_id, 'review_id'); array(p.related_review_ids, 'related_review_ids');
    p.related_review_ids.forEach(v => id(v, 'related_review_ids')); unique(p.related_review_ids, 'related_review_ids');
    for (const field of ['title', 'question', 'target_function', 'change_summary', 'why_human_review']) string(p[field], field);
    keys(p.scope, ['level', 'applies_to', 'does_not_apply_to'], 'scope');
    if (!['point', 'bundle'].includes(p.scope.level)) fail('scope: point または bundle が必要です');
    strings(p.scope.applies_to, 'scope.applies_to', true); strings(p.scope.does_not_apply_to, 'scope.does_not_apply_to', true);
    array(p.views, 'views', true); unique(p.views.map(v => v.view_id), 'views');
    for (const v of p.views) {
      keys(v, ['view_id', 'label', 'role', 'media_id', 'start_frame', 'end_frame', 'context_start_frame', 'context_end_frame'], 'view');
      id(v.view_id, 'view_id'); string(v.label, 'view.label'); id(v.media_id, 'view.media_id');
      if (!['candidate', 'before', 'after', 'variant'].includes(v.role)) fail('view.role: 不明な役割です');
      if (!media.has(v.media_id)) fail('view: 対象動画がありません');
      for (const field of ['start_frame', 'end_frame', 'context_start_frame', 'context_end_frame']) integer(v[field], field);
      if (!(v.context_start_frame <= v.start_frame && v.start_frame < v.end_frame && v.end_frame <= v.context_end_frame && v.context_end_frame <= media.get(v.media_id).total_frames)) fail('view: フレーム範囲が動画と一致しません');
    }
    const roles = p.views.map(v => v.role);
    if (roles.includes('before') || roles.includes('after')) {
      if (roles.filter(r => r === 'before').length !== 1 || roles.filter(r => r === 'after').length !== 1 || roles.includes('candidate')) fail('views: 比較はBeforeとAfterを一組にしてください');
    } else if (roles.filter(r => r === 'candidate').length !== 1) fail('views: 確認対象が一つ必要です');
  }
  return review;
}
export function pointBinding(review, point) {
  return {
    point_id: point.point_id, review_id: point.review_id,
    scope: structuredClone(point.scope),
    offered_views: point.views.map(v => {
      const m = review.media.find(item => item.media_id === v.media_id);
      return {...v, sha256: m.sha256, fps_num: m.fps_num, fps_den: m.fps_den, total_frames: m.total_frames, timeline_id: m.timeline_id, timeline_start_frame: m.timeline_start_frame};
    }),
  };
}
export function blankAnswers(review, reviewSha) {
  validateReview(review); hash(reviewSha, 'review_sha256');
  return {schema_version: ANSWER_SCHEMA, batch_id: review.batch_id, revision: review.revision, review_sha256: reviewSha,
    answers: review.points.map(p => ({...pointBinding(review, p), choice: null, comment: '', raw_response: '', source: null, answered_at: null, playback_started_view_ids: []}))};
}
export function validateAnswers(answers, review, reviewSha) {
  validateReview(review); hash(reviewSha, 'review_sha256');
  keys(answers, ['schema_version', 'batch_id', 'revision', 'review_sha256', 'answers'], 'answers');
  if (answers.schema_version !== ANSWER_SCHEMA || answers.batch_id !== review.batch_id || answers.revision !== review.revision || answers.review_sha256 !== reviewSha) fail('answers: 別のレビュー版の回答です');
  array(answers.answers, 'answers.answers'); unique(answers.answers.map(a => a.point_id), 'answers.answers');
  if (answers.answers.length !== review.points.length) fail('answers: ポイントが不足しています');
  for (const a of answers.answers) {
    keys(a, ['point_id', 'review_id', 'scope', 'offered_views', 'choice', 'comment', 'raw_response', 'source', 'answered_at', 'playback_started_view_ids'], 'answer');
    const p = review.points.find(item => item.point_id === a.point_id);
    if (!p || canonical({point_id:a.point_id,review_id:a.review_id,scope:a.scope,offered_views:a.offered_views}) !== canonical(pointBinding(review,p))) fail('answer: 対象動画・区間・反映範囲が一致しません');
    if (a.choice !== null && !own(ANSWERS, a.choice)) fail('answer: 回答が不正です');
    if (a.choice === 'both_usable' && p.views.length !== 2) fail('answer: 両方使えるは提示された二つだけに回答できます');
    string(a.comment, 'answer.comment', true); string(a.raw_response, 'answer.raw_response', true);
    array(a.playback_started_view_ids, 'playback_started_view_ids'); unique(a.playback_started_view_ids, 'playback_started_view_ids');
    if (a.playback_started_view_ids.some(v => !p.views.some(view => view.view_id === v))) fail('answer: 再生対象が違います');
    if (a.source === null) {
      if (a.choice !== null || a.comment !== '' || a.raw_response !== '' || a.answered_at !== null) fail('answer: 未回答と回答内容が矛盾します');
    } else {
      if (!['local_form', 'chat'].includes(a.source) || typeof a.answered_at !== 'string' || !Number.isFinite(Date.parse(a.answered_at)) || !a.raw_response.trim()) fail('answer: 原文・回答日時・受領経路が必要です');
      if (a.source === 'local_form' && a.raw_response !== [a.choice === null ? '' : ANSWERS[a.choice], a.comment].filter(Boolean).join('\n')) fail('answer: フォーム回答と原文が一致しません');
    }
  }
  return answers;
}
export function recordAnswer(answers, review, reviewSha, pointId, input) {
  validateAnswers(answers, review, reviewSha);
  keys(input, ['choice', 'comment', 'raw_response', 'source', 'answered_at'], 'input');
  const next = structuredClone(answers);
  const target = next.answers.find(a => a.point_id === pointId);
  if (!target) fail('input: ポイントがありません');
  Object.assign(target, input);
  return validateAnswers(next, review, reviewSha);
}
export function storageKey(reviewSha) { hash(reviewSha, 'review_sha256'); return `zev-point-review:${reviewSha}`; }
export function saveAnswers(storage, answers, review, reviewSha) {
  validateAnswers(answers, review, reviewSha); storage.setItem(storageKey(reviewSha), JSON.stringify(answers));
}
export function loadAnswers(storage, review, reviewSha) {
  const raw = storage.getItem(storageKey(reviewSha));
  return raw === null ? blankAnswers(review, reviewSha) : validateAnswers(JSON.parse(raw), review, reviewSha);
}
export function frameRange(review, view, expanded = false) {
  const m = review.media.find(item => item.media_id === view.media_id);
  if (!m) fail('view: 対象動画がありません');
  const start = expanded ? view.context_start_frame : view.start_frame;
  const end = expanded ? view.context_end_frame : view.end_frame;
  return {start: start * m.fps_den / m.fps_num, end: end * m.fps_den / m.fps_num, start_frame: start, end_frame: end,
    ends_at_media_end: end === m.total_frames, last_frame_start_seconds: (end - 1) * m.fps_den / m.fps_num,
    timeline_start_frame: m.timeline_start_frame + start, timeline_end_frame: m.timeline_start_frame + end};
}

import {canonical, validateAnswers} from './core.mjs';
import {mountReview} from './app.mjs';
import {validateSessionPackage, blankSessionAnswers, validateSessionAnswers, toAggregateAnswers, fromAggregateAnswers, mergeSessionAnswers} from './session-core.mjs';

/** Adapt only answer storage and original-review labels; the existing point UI remains shared. */
export function createSessionAnswerIO(sessionPackage) {
  const session = structuredClone(validateSessionPackage(sessionPackage));
  const review = session.display_review, reviewSha = session.display_review_sha256;
  const key = `zev-point-review-session:${reviewSha}`;
  let envelope = blankSessionAnswers(session);
  const current = displayAnswers => {
    validateAnswers(displayAnswers, review, reviewSha);
    return fromAggregateAnswers(session, envelope, displayAnswers);
  };
  const original = point => {
    const source = session.sources.find(item => item.review.points.some(row => row.point_id === point.point_id));
    if (!source) throw new Error('ポイントの元レビューがありません。');
    return source;
  };
  return {
    load(storage) {
      const raw = storage.getItem(key);
      const loaded = raw === null ? blankSessionAnswers(session)
        : validateSessionAnswers(session, JSON.parse(raw));
      envelope = structuredClone(loaded);
      return toAggregateAnswers(session, envelope);
    },
    save(storage, displayAnswers) {
      const next = current(displayAnswers);
      storage.setItem(key, JSON.stringify(next));
      envelope = structuredClone(next);
    },
    parse(text, currentDisplayAnswers) {
      const before = current(currentDisplayAnswers);
      const incoming = validateSessionAnswers(session, JSON.parse(text));
      return toAggregateAnswers(session, mergeSessionAnswers(session, before, incoming));
    },
    serialize(displayAnswers) {
      return JSON.stringify(current(displayAnswers), null, 2) + '\n';
    },
    downloadName: `${session.session_id}-answers.json`,
    pointIntro: point => original(point).review.intro,
    pointBindingText(point) {
      const source = original(point);
      return `${source.review.batch_id} / ${source.review.revision} · レビュー版 SHA-256: ${source.review_sha256}`;
    },
  };
}

export function mountPointReviewSession(document, window, bundle) {
  const session = validateSessionPackage(bundle.session_package);
  if (bundle.review_sha256 !== session.display_review_sha256
      || canonical(bundle.review) !== canonical(session.display_review))
    throw new Error('表示用データと元レビューの対応が一致しません。');
  return mountReview(document, window, bundle, createSessionAnswerIO(session));
}

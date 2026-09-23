import {canonical, validateAnswers} from './core.mjs';
import {mountReview} from './app.mjs';
import {validateSessionPackage, blankSessionAnswers, validateSessionAnswers, validateSessionRetry, packRetrySessionAnswers, readRetrySessionAnswers, toAggregateAnswers, fromAggregateAnswers, mergeSessionAnswers} from './session-core.mjs';

/** Adapt only answer storage and original-review labels; the existing point UI remains shared. */
export function createSessionAnswerIO(sessionPackage, retryRequest) {
  const session = structuredClone(validateSessionPackage(sessionPackage));
  const retry = retryRequest === undefined ? null : structuredClone(validateSessionRetry(session, retryRequest));
  const review = session.display_review, reviewSha = session.display_review_sha256;
  const key = `zev-point-review-session:${reviewSha}${retry ? `:retry:${retry.sha256}` : ''}`;
  let envelope = blankSessionAnswers(session);
  const checked = value => retry ? packRetrySessionAnswers(session, retry, value).answers : validateSessionAnswers(session, value);
  const current = displayAnswers => {
    validateAnswers(displayAnswers, review, reviewSha);
    return checked(fromAggregateAnswers(session, envelope, displayAnswers));
  };
  const original = point => {
    const source = session.sources.find(item => item.review.points.some(row => row.point_id === point.point_id));
    if (!source) throw new Error('ポイントの元レビューがありません。');
    return source;
  };
  return {
    initialAnswers: () => toAggregateAnswers(session, blankSessionAnswers(session)),
    ...(retry ? {visiblePointIds: retry.points.map(point => point.point_id),
      initialViewId: point => retry.points.find(item => item.point_id === point.point_id)?.initial_view_id,
      title: `${review.title} — エラーのあった${retry.points.length}項目の再確認`} : {}),
    load(storage) {
      const raw = storage.getItem(key);
      const loaded = raw === null ? blankSessionAnswers(session)
        : checked(JSON.parse(raw));
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
      const packet = JSON.parse(text);
      const incoming = retry ? readRetrySessionAnswers(session, retry, packet) : validateSessionAnswers(session, packet);
      return toAggregateAnswers(session, mergeSessionAnswers(session, before, incoming));
    },
    serialize(displayAnswers) {
      const answers = current(displayAnswers);
      return JSON.stringify(retry ? packRetrySessionAnswers(session, retry, answers) : answers, null, 2) + '\n';
    },
    downloadName: `${session.session_id}${retry ? '-retry' : ''}-answers.json`,
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
  return mountReview(document, window, bundle, createSessionAnswerIO(session, bundle.retry));
}

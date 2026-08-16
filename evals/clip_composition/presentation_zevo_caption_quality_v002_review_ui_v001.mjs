import {createHash} from 'node:crypto';

const REVIEW_INPUT_SCHEMA = 'presentation-zevo-caption-quality-v002-review-input-v001';
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;

const validateByteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const validateFormalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);

const validateQuestion = value => exactKeys(value, ['questionId', 'prompt'])
  && nonempty(value.questionId) && nonempty(value.prompt);
const validateOccurrence = value => exactKeys(value, [
  'caseId', 'format', 'boundaryKind', 'afterAtomOccurrenceId',
]) && nonempty(value.caseId)
  && ['horizontal', 'vertical-caption-diagnostic'].includes(value.format)
  && ['page-end', 'line-end'].includes(value.boundaryKind)
  && /^atom-occurrence-[0-9]{6}$/u.test(value.afterAtomOccurrenceId);
const validatePattern = value => exactKeys(value, ['issueId', 'splitText', 'occurrences'])
  && /^old-break-00[1-5]$/u.test(value.issueId) && nonempty(value.splitText)
  && dense(value.occurrences) && value.occurrences.length >= 1
  && value.occurrences.every(validateOccurrence);
const validateHumanFixture = value => exactKeys(value, [
  'oldRenderPlanBindings', 'knownIssuePatterns',
]) && dense(value.oldRenderPlanBindings) && value.oldRenderPlanBindings.length === 2
  && value.oldRenderPlanBindings.every(validateFormalBinding)
  && dense(value.knownIssuePatterns) && value.knownIssuePatterns.every(validatePattern);
const validateHorizontal = value => exactKeys(value, [
  'videoBinding', 'qcBinding', 'durationMilliseconds', 'frameCount',
]) && validateByteBinding(value.videoBinding) && validateFormalBinding(value.qcBinding)
  && positive(value.durationMilliseconds) && positive(value.frameCount);
const validateCueTiming = value => exactKeys(value, [
  'cueId', 'startFrame', 'endFrameExclusive', 'displayFrameCount', 'lineTexts',
]) && nonempty(value.cueId) && nonnegative(value.startFrame)
  && positive(value.endFrameExclusive) && value.startFrame < value.endFrameExclusive
  && value.displayFrameCount === value.endFrameExclusive - value.startFrame
  && dense(value.lineTexts) && value.lineTexts.length >= 1 && value.lineTexts.length <= 2
  && value.lineTexts.every(nonempty);
const validateItem = value => exactKeys(value, [
  'caseId', 'inputCaptionId', 'candidateId', 'humanObservationFixture',
  'horizontal', 'cueTimingSummary',
]) && nonempty(value.caseId) && nonempty(value.inputCaptionId) && nonempty(value.candidateId)
  && validateHumanFixture(value.humanObservationFixture)
  && validateHorizontal(value.horizontal)
  && dense(value.cueTimingSummary) && value.cueTimingSummary.length >= 1
  && value.cueTimingSummary.every(validateCueTiming);

const EXPECTED_CASES = Object.freeze([
  ['voice-013', 'input-caption-000001', 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013'],
  ['voice-067', 'input-caption-000002', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067'],
  ['voice-190', 'input-caption-000003', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190'],
]);
const EXPECTED_QUESTIONS = Object.freeze([
  ['prior-caption-residue', '前の発話の文字が次の発話まで残っていないか。'],
  ['short-cue-line-break', '一行に収まる短い発話が改行されていないか。'],
  ['long-cue-line-break', '長い発話だけが必要な位置で自然に二行へ分かれているか。'],
  ['text-closure', '全文を通して文字の欠落・重複・逆順がないか。'],
  ['short-cue-fade', '最短cueで既存4frame fadeにより読めない・不自然に瞬く見え方がないか。'],
]);

const violation = (code, pointer) => Object.freeze({
  code,
  path: pointer,
  relatedPaths: Object.freeze([]),
});
const rejected = (reason, pointer = '/') => Object.freeze({
  status: 'rejected',
  violations: Object.freeze([violation('CUE_REVIEW_INPUT_INVALID', pointer)]),
  reason,
});

export function validatePresentationZevoCaptionQualityV002ReviewInputV001(value) {
  const violations = [];
  if (!exactKeys(value, [
    'schemaVersion', 'reviewId', 'observedFadeFrameCount', 'proofJobBinding',
    'reviewQuestions', 'items',
  ])) violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/'));
  else {
    if (value.schemaVersion !== REVIEW_INPUT_SCHEMA) {
      violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/schemaVersion'));
    }
    if (!nonempty(value.reviewId)) violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/reviewId'));
    if (!positive(value.observedFadeFrameCount)) {
      violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/observedFadeFrameCount'));
    }
    if (!validateFormalBinding(value.proofJobBinding)) {
      violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/proofJobBinding'));
    }
    if (!dense(value.reviewQuestions) || value.reviewQuestions.length !== 5
      || !value.reviewQuestions.every(validateQuestion)
      || !value.reviewQuestions.every((question, index) => (
        question.questionId === EXPECTED_QUESTIONS[index][0]
        && question.prompt === EXPECTED_QUESTIONS[index][1]
      ))) violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/reviewQuestions'));
    if (!dense(value.items) || value.items.length !== 3 || !value.items.every(validateItem)
      || !value.items.every((item, index) => (
        item.caseId === EXPECTED_CASES[index][0]
        && item.inputCaptionId === EXPECTED_CASES[index][1]
        && item.candidateId === EXPECTED_CASES[index][2]
      ))) violations.push(violation('CUE_REVIEW_INPUT_INVALID', '/items'));
  }
  return violations.length === 0
    ? Object.freeze({status: 'passed', violations: Object.freeze([])})
    : Object.freeze({status: 'rejected', violations: Object.freeze(violations)});
}

export function decodePresentationZevoCaptionQualityV002ReviewInputV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0
    || bytes[0] !== 0x7b || bytes.at(-1) !== 0x0a
    || bytes.includes(0x0d) || bytes.at(-2) !== 0x7d) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  const checked = validatePresentationZevoCaptionQualityV002ReviewInputV001(value);
  return checked.status === 'passed'
    ? Object.freeze({status: 'decoded', value})
    : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
}

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : isObject(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;

const timingRows = item => item.cueTimingSummary.map(cue => `
              <tr data-cue-id="${escapeHtml(cue.cueId)}">
                <td><code>${escapeHtml(cue.cueId)}</code></td>
                <td>${cue.startFrame}–${cue.endFrameExclusive}</td>
                <td>${cue.displayFrameCount}</td>
                <td>${cue.lineTexts.map(escapeHtml).join('<br>')}</td>
              </tr>`).join('');

export function buildPresentationZevoCaptionQualityV002ReviewHtmlV001(reviewInput) {
  const checked = validatePresentationZevoCaptionQualityV002ReviewInputV001(reviewInput);
  if (checked.status !== 'passed') return rejected('schema-invalid');
  const shortest = reviewInput.items
    .flatMap(item => item.cueTimingSummary.map(cue => ({caseId: item.caseId, ...cue})))
    .sort((left, right) => left.displayFrameCount - right.displayFrameCount
      || left.caseId.localeCompare(right.caseId) || left.cueId.localeCompare(right.cueId))[0];
  const sections = reviewInput.items.map((item, index) => `
      <section class="case" data-case-id="${escapeHtml(item.caseId)}">
        <header><span class="ordinal">${index + 1} / 3</span><h2>${escapeHtml(item.candidateId)}</h2></header>
        <video controls preload="metadata" data-workspace-path="${escapeHtml(item.horizontal.videoBinding.path)}"></video>
        <p>尺 ${item.horizontal.durationMilliseconds} ms / ${item.horizontal.frameCount} frames</p>
        <table><thead><tr><th>cue</th><th>frame範囲</th><th>表示frame</th><th>表示行</th></tr></thead><tbody>${timingRows(item)}</tbody></table>
      </section>`).join('\n');
  const questions = reviewInput.reviewQuestions.map(question => `
        <label><input type="checkbox" data-question-id="${escapeHtml(question.questionId)}">${escapeHtml(question.prompt)}</label>`).join('\n');
  const inputCanonicalSha = createHash('sha256')
    .update(Buffer.from(JSON.stringify(canonicalize(reviewInput)), 'utf8')).digest('hex');
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ZEVO字幕品質v002 確認</title><style>
:root{color-scheme:dark;background:#0d1117;color:#f0f3f6;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}body{margin:0;padding:24px}main{max-width:1320px;margin:auto}.summary,.questions{padding:18px;background:#171d26;border:1px solid #3a4655;border-radius:12px}.questions label{display:block;margin:12px 0}.case{margin:24px 0;padding:18px;background:#151a22;border-radius:12px}.case header{display:flex;gap:14px;align-items:center}.ordinal{color:#a6b2c2}video{width:100%;max-height:72vh;background:#000}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #303a47;text-align:left}code{overflow-wrap:anywhere}@media(max-width:720px){body{padding:10px}th:nth-child(2),td:nth-child(2){display:none}}
</style></head><body><main data-review-id="${escapeHtml(reviewInput.reviewId)}" data-review-input-canonical-sha256="${inputCanonicalSha}">
<h1>ZEVO字幕品質v002・横型3本確認</h1><section class="summary"><p>最短cue: <code>${escapeHtml(shortest.caseId)} / ${escapeHtml(shortest.cueId)}</code> — ${shortest.displayFrameCount} frames</p><p>既存fade: ${reviewInput.observedFadeFrameCount} frames。短いcueが読めるかは映像で確認してください。</p></section>
<section class="questions"><h2>一度の目視で確認する5点</h2>${questions}</section>${sections}
</main><script>for(const video of document.querySelectorAll('video[data-workspace-path]')){const marker='/evals/clip_composition/';const here=decodeURIComponent(location.pathname);const at=here.indexOf(marker);if(at>=0){video.src='file://'+here.slice(0,at+1)+video.dataset.workspacePath;}}</script></body></html>\n`;
  return Object.freeze({status: 'passed', bytes: Buffer.from(html, 'utf8')});
}

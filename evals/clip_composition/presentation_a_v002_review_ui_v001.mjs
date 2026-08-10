import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
} from './presentation_a_v002_vertical_caption_diagnostic_v001.mjs';

export const PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001 =
  'presentation-a-v002-review-input-v001';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;

const validateFileBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);

const validateMedia = value => exactKeys(value, [
  'label', 'mediaBinding', 'durationMs', 'frameCount', 'qcBinding', 'qcStatus',
])
  && typeof value.label === 'string'
  && value.label.length > 0
  && validateFileBinding(value.mediaBinding)
  && positive(value.durationMs)
  && positive(value.frameCount)
  && validateFileBinding(value.qcBinding)
  && value.qcStatus === 'passed';

const validateInterval = value => exactKeys(value, ['sourceStartMs', 'sourceEndMs'])
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validateItem = value => exactKeys(value, [
  'proofItemId',
  'candidateId',
  'approvedCut',
  'crossedAtom',
  'retainedSpans',
  'horizontal',
  'verticalDiagnostic',
])
  && typeof value.proofItemId === 'string'
  && value.proofItemId.length > 0
  && typeof value.candidateId === 'string'
  && value.candidateId.length > 0
  && validateInterval(value.approvedCut)
  && exactKeys(value.crossedAtom, ['text', 'sourceStartMs', 'sourceEndMs'])
  && typeof value.crossedAtom.text === 'string'
  && value.crossedAtom.text.length > 0
  && validateInterval({
    sourceStartMs: value.crossedAtom.sourceStartMs,
    sourceEndMs: value.crossedAtom.sourceEndMs,
  })
  && dense(value.retainedSpans)
  && value.retainedSpans.length >= 2
  && value.retainedSpans.every(validateInterval)
  && validateMedia(value.horizontal)
  && value.horizontal.label === '横型・正式style'
  && validateMedia(value.verticalDiagnostic)
  && value.verticalDiagnostic.label === '縦型・字幕跨ぎ診断';

export function validatePresentationAV002ReviewInputV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'reviewId', 'createdAt', 'verticalDiagnosticGuarantee', 'items',
  ])) return false;
  if (
    value.schemaVersion !== PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001
    || typeof value.reviewId !== 'string'
    || value.reviewId.length === 0
    || typeof value.createdAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value.createdAt)
    || value.verticalDiagnosticGuarantee
      !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001
    || !dense(value.items)
    || value.items.length !== 3
    || !value.items.every(validateItem)
    || new Set(value.items.map(item => item.proofItemId)).size !== 3
    || new Set(value.items.map(item => item.candidateId)).size !== 3
  ) return false;
  return true;
}

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const mediaHref = (workspaceRoot, binding) => pathToFileURL(
  path.resolve(workspaceRoot, binding.path),
).href;

const intervalText = value => `[${value.sourceStartMs}, ${value.sourceEndMs})`;

const mediaCard = (workspaceRoot, media, variant) => `
          <article class="media-card" data-variant="${escapeHtml(variant)}">
            <h3>${escapeHtml(media.label)}</h3>
            <video controls preload="metadata" src="${escapeHtml(mediaHref(
              workspaceRoot,
              media.mediaBinding,
            ))}"></video>
            <dl>
              <dt>尺</dt><dd>${escapeHtml(media.durationMs)} ms</dd>
              <dt>frame</dt><dd>${escapeHtml(media.frameCount)}</dd>
              <dt>動画SHA</dt><dd><code>${escapeHtml(media.mediaBinding.fileSha256)}</code></dd>
              <dt>QC</dt><dd>${escapeHtml(media.qcStatus)} / <code>${escapeHtml(
                media.qcBinding.fileSha256,
              )}</code></dd>
            </dl>
          </article>`;

export function buildPresentationAV002ReviewHtmlV001(
  input,
  {workspaceRoot = DEFAULT_WORKSPACE_ROOT} = {},
) {
  if (!validatePresentationAV002ReviewInputV001(input)) {
    throw new TypeError('A-v002 review input is invalid');
  }
  const itemHtml = input.items.map((item, index) => `
      <section class="proof-item" id="proof-${index + 1}">
        <header>
          <p class="ordinal">候補 ${index + 1} / 3</p>
          <h2>${escapeHtml(item.candidateId)}</h2>
          <p>人間認定済み切断: <code>${escapeHtml(intervalText(item.approvedCut))}</code></p>
          <p>切断atom: <strong>${escapeHtml(item.crossedAtom.text)}</strong>
            <code>${escapeHtml(intervalText(item.crossedAtom))}</code></p>
          <p>採用時刻片: ${item.retainedSpans.map(span => (
            `<code>${escapeHtml(intervalText(span))}</code>`
          )).join(' ')}</p>
        </header>
        <div class="media-grid">
          ${mediaCard(workspaceRoot, item.horizontal, 'horizontal-formal')}
          ${mediaCard(workspaceRoot, item.verticalDiagnostic, 'vertical-diagnostic')}
        </div>
      </section>`).join('\n');
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>A-v002 旧v3三候補・字幕跨ぎ確認</title>
  <style>
    :root{color-scheme:dark;background:#101114;color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}
    body{margin:0;padding:28px}main{max-width:1400px;margin:auto}.notice{padding:16px 18px;border:2px solid #f6c453;background:#2c2411;border-radius:10px}
    .proof-item{margin:28px 0;padding:22px;background:#191b21;border:1px solid #343843;border-radius:14px}.ordinal{color:#9aa4b2}.media-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.media-card{padding:14px;background:#111318;border-radius:10px}video{display:block;width:100%;max-height:72vh;background:#000}dl{display:grid;grid-template-columns:80px 1fr;gap:6px 10px}dt{color:#aab2bf}dd{margin:0;overflow-wrap:anywhere}code{font-size:.88em}@media(max-width:850px){.media-grid{grid-template-columns:1fr}body{padding:14px}}
  </style>
</head>
<body>
  <main data-review-id="${escapeHtml(input.reviewId)}">
    <h1>A-v002 旧v3三候補・横型／縦型字幕診断</h1>
    <p class="notice" data-diagnostic-id="${escapeHtml(
      PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
    )}"><strong>縦型について:</strong> ${escapeHtml(input.verticalDiagnosticGuarantee)}</p>
    <p>確認対象は、切断をまたいでも文字が一度だけ連続表示されること、音声、終端です。</p>
    ${itemHtml}
  </main>
</body>
</html>
`;
  return Buffer.from(html, 'utf8');
}

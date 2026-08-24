import {createHash} from 'node:crypto';

import {
  decodeDistantConnectionLunaResponseV001,
  decodeDistantConnectionLunaSourcePackageV001,
  type DistantConnectionCandidateV001,
  type DistantConnectionLunaSourcePackageV001
} from './distant-connection-luna-source-package-v001.js';
import {DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V001}
  from './distant-connection-luna-b6-result-v001.js';

export const DISTANT_CONNECTION_B6_HUMAN_REVIEW_PAGE_SCHEMA_V001 =
  'distant-connection-b6-human-review-page-v001';

export class DistantConnectionB6HumanReviewErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionB6HumanReviewErrorV001';
  }
}

export type BuildDistantConnectionB6HumanReviewInputV001 = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  b6RunManifestPath: string;
  b6RunManifestBytes: Uint8Array;
};

type RecordValue = Record<string, unknown>;

function fail(message: string): never {
  throw new DistantConnectionB6HumanReviewErrorV001(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
}

function assertBinding(
  value: unknown,
  expectedPath: string,
  expectedSha256: string,
  label: string
): void {
  if (!isRecord(value)
    || value.path !== expectedPath
    || value.fileSha256 !== expectedSha256) {
    fail(`${label}のpathまたはSHA-256が正式成果物と一致しません`);
  }
}

function assertB6Manifest(
  bytes: Uint8Array,
  input: BuildDistantConnectionB6HumanReviewInputV001,
  candidateCount: number
): void {
  const value = decodeJson(bytes, 'B6実行記録');
  if (!isRecord(value)
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V001
    || !isRecord(value.validation)
    || value.validation.decision !== 'passed'
    || value.validation.candidateCount !== candidateCount) {
    fail('B6実行記録にstrict合格と候補件数が記録されていません');
  }
  assertBinding(
    value.candidateResponseBinding,
    input.candidateResponsePath,
    input.expectedCandidateResponseSha256,
    '正式候補binding'
  );
  assertBinding(
    value.sourcePackageBinding,
    input.sourcePackagePath,
    sha256(input.sourcePackageBytes),
    'source package binding'
  );
}

function utteranceText(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  utteranceId: string
): string {
  const utterance = sourcePackage.utterances.find((item) => item.utteranceId === utteranceId);
  if (!utterance) fail(`正式発話 ${utteranceId} をsource packageから解決できません`);
  return utterance.text;
}

function utteranceListHtml(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  ids: string[]
): string {
  return ids.map((id) => `
          <li>
            <code>${escapeHtml(id)}</code>
            <p>${escapeHtml(utteranceText(sourcePackage, id))}</p>
          </li>`).join('');
}

function candidateHtml(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  candidate: DistantConnectionCandidateV001
): string {
  const anchor = sourcePackage.anchors.find((item) => item.anchorId === candidate.anchorId);
  if (!anchor) fail(`アンカー ${candidate.anchorId} をsource packageから解決できません`);
  const directionLabel = candidate.direction === 'future' ? '未来方向' : '過去方向';
  const directionDescription = candidate.direction === 'future'
    ? '起点を前半として、その後に起きる相方を探しました。'
    : '起点を後半として、その前にあった相方を探しました。';
  return `
      <article class="candidate" data-candidate-id="${escapeHtml(candidate.candidateId)}">
        <div class="candidate-heading">
          <div>
            <span class="eyebrow">候補</span>
            <h2>${escapeHtml(candidate.candidateId)}</h2>
          </div>
          <span class="direction">${directionLabel}</span>
        </div>
        <section class="anchor">
          <h3>起点になった発言</h3>
          <code>${escapeHtml(candidate.anchorId)} → ${escapeHtml(anchor.semanticUtteranceId)}</code>
          <p>${escapeHtml(utteranceText(sourcePackage, anchor.semanticUtteranceId))}</p>
          <small>${directionDescription}</small>
        </section>
        <div class="connection">
          <section class="part first">
            <span class="step">1</span>
            <h3>前に置く発言</h3>
            <ol>${utteranceListHtml(sourcePackage, candidate.firstPartSemanticUtteranceIds)}
            </ol>
          </section>
          <div class="arrow" aria-hidden="true">→</div>
          <section class="part second">
            <span class="step">2</span>
            <h3>後に置く発言</h3>
            <ol>${utteranceListHtml(sourcePackage, candidate.secondPartSemanticUtteranceIds)}
            </ol>
          </section>
        </div>
        <section class="understanding">
          <span class="step">3</span>
          <h3>前を付けることで分かること</h3>
          <p>${escapeHtml(candidate.addedUnderstanding)}</p>
        </section>
        <p class="passed">✓ strict検査 合格</p>
      </article>`;
}

export function buildDistantConnectionB6HumanReviewHtmlV001(
  input: BuildDistantConnectionB6HumanReviewInputV001
): Buffer {
  const candidateSha = sha256(input.candidateResponseBytes);
  if (candidateSha !== input.expectedCandidateResponseSha256) {
    fail('正式候補成果物のSHA-256が指定正本と一致しません');
  }
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  const response = decodeDistantConnectionLunaResponseV001(input.candidateResponseBytes, {
    sourcePackagePath: input.sourcePackagePath,
    sourcePackageBytes: input.sourcePackageBytes
  });
  assertB6Manifest(input.b6RunManifestBytes, input, response.candidates.length);

  const pairKeys = new Set(response.candidates.map((candidate) => JSON.stringify([
    candidate.firstPartSemanticUtteranceIds,
    candidate.secondPartSemanticUtteranceIds
  ])));
  const samePairNote = response.candidates.length === 2 && pairKeys.size === 1
    ? '2件は同じ「前→後」の発話組です。前側の発言を起点に未来を探した結果と、後側の発言を起点に過去を探した結果として、それぞれ見つかりました。'
    : '候補ごとに、起点・前半・後半・追加される理解を表示しています。';

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="zev-review-schema" content="${DISTANT_CONNECTION_B6_HUMAN_REVIEW_PAGE_SCHEMA_V001}">
  <meta name="source-candidate-sha256" content="${candidateSha}">
  <title>遠方接続 B6 経路成立確認</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #09121e; color: #eaf3ff; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top, #18375a 0, #0b1929 35rem, #07101a 100%); }
    main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 52px 0 72px; }
    h1 { margin: 8px 0 14px; font-size: clamp(30px, 5vw, 52px); letter-spacing: -.03em; }
    h2, h3, p { margin-top: 0; }
    .subtitle { color: #b7c8db; line-height: 1.7; max-width: 780px; }
    .notice { margin: 30px 0 18px; padding: 18px 20px; border: 1px solid #ffca63; border-left-width: 6px; border-radius: 14px; background: #30250d; color: #ffe4a8; font-weight: 700; line-height: 1.65; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 22px; }
    .chip { padding: 8px 12px; border: 1px solid #3b668e; border-radius: 999px; background: #10263c; color: #cfe8ff; }
    .pair-note { padding: 18px 20px; border-radius: 14px; background: #142437; color: #d9e9fa; line-height: 1.7; }
    .candidate { margin-top: 26px; padding: 26px; border: 1px solid #2c5579; border-radius: 20px; background: rgba(10, 26, 42, .92); box-shadow: 0 18px 45px rgba(0, 0, 0, .28); }
    .candidate-heading { display: flex; justify-content: space-between; align-items: start; gap: 20px; }
    .candidate-heading h2 { margin: 3px 0 0; font-size: 28px; }
    .eyebrow { color: #7fc8ff; font-size: 12px; font-weight: 800; letter-spacing: .16em; }
    .direction { padding: 7px 12px; border-radius: 999px; background: #215278; color: #e8f6ff; font-weight: 800; }
    section { position: relative; }
    .anchor, .understanding { margin-top: 20px; padding: 18px 20px; border-radius: 14px; background: #111f2f; }
    .anchor p, .understanding p, .part p { margin: 10px 0 0; font-size: 18px; line-height: 1.75; }
    .anchor small { display: block; margin-top: 10px; color: #9eb5cb; }
    code { color: #8ed4ff; overflow-wrap: anywhere; }
    .connection { display: grid; grid-template-columns: 1fr 42px 1fr; align-items: stretch; gap: 12px; margin-top: 20px; }
    .part { padding: 20px; border-radius: 14px; background: #10283b; }
    .part.second { background: #1b2d43; }
    .part ol { margin: 12px 0 0; padding-left: 22px; }
    .part li + li { margin-top: 14px; }
    .arrow { display: grid; place-items: center; color: #67c8ff; font-size: 30px; font-weight: 900; }
    .step { float: right; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #43aeea; color: #06121d; font-weight: 900; }
    .passed { margin: 20px 0 0; color: #78e3aa; font-weight: 900; }
    .provenance { margin-top: 32px; padding-top: 18px; border-top: 1px solid #2a4259; color: #91a9bf; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
    @media (max-width: 760px) {
      .connection { grid-template-columns: 1fr; }
      .arrow { transform: rotate(90deg); min-height: 34px; }
      .candidate { padding: 20px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">ZEV · DISTANT CONNECTION</span>
      <h1>遠方接続 B6 経路成立確認</h1>
      <p class="subtitle">Lunaが返した正式候補を、ZEVがsource packageと照合し、strict検査を通して受け取れたことを確認するページです。</p>
    </header>
    <div class="notice">これは実配信の候補品質確認ではない。発話2件の小型入力を使った、遠方接続経路の成立確認である。</div>
    <div class="summary">
      <span class="chip">正式発話 ${sourcePackage.utteranceCount}件</span>
      <span class="chip">候補 ${response.candidates.length}件</span>
      <span class="chip">strict検査 合格</span>
    </div>
    <p class="pair-note">${samePairNote}</p>${response.candidates.map((candidate) => candidateHtml(sourcePackage, candidate)).join('')}
    <footer class="provenance">
      <strong>正式候補source</strong><br>
      ${escapeHtml(input.candidateResponsePath)}<br>
      SHA-256: ${candidateSha}<br>
      B6実行記録: ${escapeHtml(input.b6RunManifestPath)}
    </footer>
  </main>
</body>
</html>
`;
  return Buffer.from(html, 'utf8');
}

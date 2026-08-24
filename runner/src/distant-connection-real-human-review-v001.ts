import {createHash} from 'node:crypto';

import {
  decodeDistantConnectionLunaResponseV001,
  decodeDistantConnectionLunaSourcePackageV001,
  type DistantConnectionCandidateV001
} from './distant-connection-luna-source-package-v001.js';
import {DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V001}
  from './distant-connection-luna-b6-result-v001.js';
import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
  assertSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_REAL_HUMAN_REVIEW_PAGE_SCHEMA_V001 =
  'distant-connection-real-human-review-page-v001';
export const DISTANT_CONNECTION_REAL_HUMAN_REVIEW_MANIFEST_SCHEMA_V001 =
  'distant-connection-real-human-review-manifest-v001';

export class DistantConnectionRealHumanReviewErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionRealHumanReviewErrorV001';
  }
}

export type BuildDistantConnectionRealHumanReviewInputV001 = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  b6RunManifestPath: string;
  b6RunManifestBytes: Uint8Array;
  reviewPagePath: string;
};

type RecordValue = Record<string, unknown>;

function fail(message: string): never {
  throw new DistantConnectionRealHumanReviewErrorV001(message);
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

function formatTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
    + `.${String(millis).padStart(3, '0')}`;
}

function formatGap(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${minutes}分${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}秒`;
}

function resolveUtterances(
  byId: Map<string, SemanticUtteranceV001>,
  ids: string[],
  label: string
): SemanticUtteranceV001[] {
  const resolved = ids.map((id) => {
    const utterance = byId.get(id);
    if (!utterance) fail(`${label}が未知の正式発話ID ${id} を参照しています`);
    return utterance;
  });
  if (resolved.some((utterance, index) => index > 0
    && utterance.ordinal <= resolved[index - 1].ordinal)) {
    fail(`${label}の正式発話が時系列順ではありません`);
  }
  return resolved;
}

function partView(utterances: SemanticUtteranceV001[]) {
  const first = utterances[0];
  const last = utterances.at(-1);
  if (!first || !last) fail('候補の発話範囲が空です');
  return {
    startMs: first.sourceStartMs,
    endMs: last.sourceEndMs,
    text: utterances.map((utterance) => utterance.text).join(''),
    firstId: first.utteranceId,
    lastId: last.utteranceId,
    utteranceCount: utterances.length
  };
}

function partHtml(label: string, part: ReturnType<typeof partView>): string {
  return `
          <section class="part">
            <p class="part-label">${escapeHtml(label)}</p>
            <p class="time">${formatTime(part.startMs)}–${formatTime(part.endMs)}</p>
            <p class="utterance-text">${escapeHtml(part.text)}</p>
            <p class="range">正式発話 ${escapeHtml(part.firstId)}〜${escapeHtml(part.lastId)}（${part.utteranceCount}件）</p>
            <aside class="context"><strong>参考の周辺文脈</strong><br>選択された発話だけで意味が通るため、追加表示はありません。</aside>
          </section>`;
}

function candidateView(
  candidate: DistantConnectionCandidateV001,
  semanticById: Map<string, SemanticUtteranceV001>,
  anchorById: Map<string, string>
) {
  const first = partView(resolveUtterances(
    semanticById,
    candidate.firstPartSemanticUtteranceIds,
    `${candidate.candidateId}の前半`
  ));
  const second = partView(resolveUtterances(
    semanticById,
    candidate.secondPartSemanticUtteranceIds,
    `${candidate.candidateId}の後半`
  ));
  const anchorUtteranceId = anchorById.get(candidate.anchorId);
  if (!anchorUtteranceId) fail(`未知のコメント起点 ${candidate.anchorId} です`);
  const anchorPart = candidate.firstPartSemanticUtteranceIds.includes(anchorUtteranceId)
    ? 'first'
    : candidate.secondPartSemanticUtteranceIds.includes(anchorUtteranceId)
      ? 'second'
      : fail(`${candidate.candidateId}の前半・後半にコメント起点発話がありません`);
  if ((candidate.direction === 'future' && anchorPart !== 'first')
    || (candidate.direction === 'past' && anchorPart !== 'second')) {
    fail(`${candidate.candidateId}のdirectionとコメント起点の所属が一致しません`);
  }
  if (second.startMs <= first.endMs) fail(`${candidate.candidateId}の前後時刻が離れていません`);
  return {
    candidate,
    first,
    second,
    anchorUtteranceId,
    anchorPart,
    gapMs: second.startMs - first.endMs
  };
}

function candidateHtml(view: ReturnType<typeof candidateView>): string {
  const {candidate, first, second, anchorUtteranceId, anchorPart, gapMs} = view;
  const anchorLabel = anchorPart === 'first' ? '前半がコメント起点' : '後半がコメント起点';
  const directionLabel = candidate.direction === 'future' ? 'future（未来側を探索）' : 'past（過去側を探索）';
  return `
      <article class="candidate" data-candidate-id="${escapeHtml(candidate.candidateId)}">
        <header class="candidate-heading">
          <div><span class="eyebrow">候補</span><h2>${escapeHtml(candidate.candidateId)}</h2></div>
          <span class="passed">✓ strict検査 合格</span>
        </header>
        <div class="facts">
          <span>${escapeHtml(directionLabel)}</span>
          <span>${escapeHtml(anchorLabel)}: ${escapeHtml(candidate.anchorId)} → ${escapeHtml(anchorUtteranceId)}</span>
          <span>前半終了→後半開始: ${formatGap(gapMs)}</span>
        </div>
        <div class="connection">${partHtml('前半', first)}<div class="arrow" aria-hidden="true">→</div>${partHtml('後半', second)}</div>
        <section class="understanding">
          <p class="part-label">前半を付けることで新しく分かること</p>
          <p>${escapeHtml(candidate.addedUnderstanding)}</p>
        </section>
        <section class="questions">
          <strong>判断する点</strong>
          <ol>
            <li>前後の発話が意味的につながっているか</li>
            <li>前半がない場合より、後半の理解が本当に増えるか</li>
            <li>単なる同一テーマではなく、先に見せる価値があるか</li>
          </ol>
        </section>
      </article>`;
}

export function buildDistantConnectionRealHumanReviewArtifactsV001(
  input: BuildDistantConnectionRealHumanReviewInputV001
) {
  const candidateSha = sha256(input.candidateResponseBytes);
  const semanticSha = sha256(input.semanticUtteranceBytes);
  const sourcePackageSha = sha256(input.sourcePackageBytes);
  if (candidateSha !== input.expectedCandidateResponseSha256) {
    fail('正式候補成果物のSHA-256が指定正本と一致しません');
  }
  if (semanticSha !== input.expectedSemanticUtteranceSha256) {
    fail('正式意味発話成果物のSHA-256が指定正本と一致しません');
  }

  const semanticArtifact = decodeJson(
    input.semanticUtteranceBytes,
    '正式意味発話成果物'
  ) as SemanticUtteranceArtifactV001;
  assertSemanticUtteranceArtifactV001(semanticArtifact);
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  if (sourcePackage.semanticUtteranceBinding.path !== input.semanticUtterancePath
    || sourcePackage.semanticUtteranceBinding.fileSha256 !== semanticSha
    || sourcePackage.semanticUtteranceBinding.schemaVersion
      !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001) {
    fail('source packageが指定された正式意味発話を束縛していません');
  }
  if (sourcePackage.utteranceCount !== semanticArtifact.utteranceCount
    || JSON.stringify(sourcePackage.utterances) !== JSON.stringify(semanticArtifact.utterances)) {
    fail('source package内の発話一覧が正式意味発話と一致しません');
  }

  const response = decodeDistantConnectionLunaResponseV001(input.candidateResponseBytes, {
    sourcePackagePath: input.sourcePackagePath,
    sourcePackageBytes: input.sourcePackageBytes
  });
  if (response.candidates.length !== 2) fail('人間確認対象の正式候補が2件ではありません');

  const b6Manifest = decodeJson(input.b6RunManifestBytes, 'B6実行記録');
  if (!isRecord(b6Manifest)
    || b6Manifest.schemaVersion !== DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V001
    || !isRecord(b6Manifest.validation)
    || b6Manifest.validation.decision !== 'passed'
    || b6Manifest.validation.candidateCount !== response.candidates.length) {
    fail('B6実行記録にstrict合格と候補2件が記録されていません');
  }
  assertBinding(
    b6Manifest.candidateResponseBinding,
    input.candidateResponsePath,
    candidateSha,
    '正式候補binding'
  );
  assertBinding(
    b6Manifest.sourcePackageBinding,
    input.sourcePackagePath,
    sourcePackageSha,
    'source package binding'
  );

  const semanticById = new Map(
    semanticArtifact.utterances.map((utterance) => [utterance.utteranceId, utterance])
  );
  const anchorById = new Map(
    sourcePackage.anchors.map((anchor) => [anchor.anchorId, anchor.semanticUtteranceId])
  );
  const views = response.candidates.map((candidate) => candidateView(
    candidate,
    semanticById,
    anchorById
  ));

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="zev-review-schema" content="${DISTANT_CONNECTION_REAL_HUMAN_REVIEW_PAGE_SCHEMA_V001}">
  <meta name="source-candidate-sha256" content="${candidateSha}">
  <meta name="semantic-utterance-sha256" content="${semanticSha}">
  <title>実配信 ymUsGrT6EaA 遠方接続候補</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #071019; color: #edf7ff; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top, #153b5b 0, #091827 34rem, #061019 100%); }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 72px; }
    h1 { margin: 8px 0 14px; font-size: clamp(31px, 5vw, 54px); line-height: 1.08; }
    h2, p { margin-top: 0; }
    .eyebrow { color: #79d1ff; font-size: 12px; font-weight: 850; letter-spacing: .16em; }
    .lead { max-width: 870px; color: #c8d8e7; font-size: 18px; line-height: 1.8; }
    .notice { margin: 28px 0; padding: 20px 22px; border: 1px solid #66bdf0; border-left-width: 6px; border-radius: 15px; background: #102d43; font-weight: 750; line-height: 1.75; }
    .candidate { margin-top: 28px; padding: 26px; border: 1px solid #2e6086; border-radius: 22px; background: rgba(9, 27, 43, .96); box-shadow: 0 18px 50px rgba(0,0,0,.28); }
    .candidate-heading { display: flex; justify-content: space-between; align-items: start; gap: 16px; }
    .candidate-heading h2 { margin: 4px 0 0; font-size: 28px; }
    .passed { padding: 8px 12px; border-radius: 999px; background: #153e31; color: #87efbd; font-weight: 850; white-space: nowrap; }
    .facts { display: flex; flex-wrap: wrap; gap: 9px; margin: 19px 0; }
    .facts span { padding: 8px 11px; border: 1px solid #35668b; border-radius: 999px; color: #cce8fb; background: #10283c; }
    .connection { display: grid; grid-template-columns: 1fr 42px 1fr; gap: 12px; align-items: stretch; }
    .part, .understanding, .questions { padding: 20px; border-radius: 16px; background: #10283c; }
    .part-label { margin: 0 0 8px; color: #7dd2ff; font-weight: 850; letter-spacing: .04em; }
    .time { color: #f7cf77; font-variant-numeric: tabular-nums; font-weight: 800; }
    .utterance-text { font-size: 21px; line-height: 1.8; white-space: pre-wrap; }
    .range { color: #91abc2; font-size: 12px; overflow-wrap: anywhere; }
    .context { margin-top: 16px; padding: 12px 14px; border: 1px dashed #48637a; border-radius: 12px; color: #9fb4c7; font-size: 13px; line-height: 1.65; }
    .arrow { display: grid; place-items: center; color: #6ed4ff; font-size: 30px; font-weight: 900; }
    .understanding { margin-top: 14px; background: #25311d; border: 1px solid #657b3d; }
    .understanding p:last-child { margin: 0; font-size: 18px; line-height: 1.75; }
    .questions { margin-top: 14px; background: #171f2a; color: #c4d3df; }
    .questions ol { margin-bottom: 0; line-height: 1.8; }
    .provenance { margin-top: 34px; padding-top: 18px; border-top: 1px solid #294256; color: #8fa7ba; font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
    @media (max-width: 790px) { .connection { grid-template-columns: 1fr; } .arrow { transform: rotate(90deg); min-height: 34px; } .candidate { padding: 19px; } .candidate-heading { display: block; } .passed { display: inline-block; margin-top: 12px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">ZEV · REAL STREAM QUALITY REVIEW</span>
      <h1>実配信の遠方接続候補</h1>
      <p class="lead">これは実配信 ymUsGrT6EaA からLunaが見つけた遠方接続候補です。前の場面を先に見せることで、後の場面がより理解しやすくなるかを確認してください。</p>
    </header>
    <div class="notice">候補は2件です。JSONやIDの正しさではなく、「前→後→前を付ける効果」が実際にあるかを見てください。候補1では、約90分離れた場面が遠方接続として成立しているかも確認します。</div>
    ${views.map(candidateHtml).join('')}
    <footer class="provenance">
      <strong>正式候補</strong>: ${escapeHtml(input.candidateResponsePath)}<br>
      SHA-256: ${candidateSha}<br>
      <strong>正式意味発話</strong>: ${escapeHtml(input.semanticUtterancePath)}<br>
      SHA-256: ${semanticSha}<br>
      <strong>B6実行記録</strong>: ${escapeHtml(input.b6RunManifestPath)}
    </footer>
  </main>
</body>
</html>
`;
  const reviewHtmlBytes = Buffer.from(html, 'utf8');
  const manifest = {
    schemaVersion: DISTANT_CONNECTION_REAL_HUMAN_REVIEW_MANIFEST_SCHEMA_V001,
    sourceVideoId: response.sourceVideoId,
    candidateResponseBinding: {
      path: input.candidateResponsePath,
      schemaVersion: response.schemaVersion,
      fileSha256: candidateSha
    },
    semanticUtteranceBinding: {
      path: input.semanticUtterancePath,
      schemaVersion: semanticArtifact.schemaVersion,
      fileSha256: semanticSha
    },
    sourcePackageBinding: {
      path: input.sourcePackagePath,
      schemaVersion: sourcePackage.schemaVersion,
      fileSha256: sourcePackageSha
    },
    b6RunManifestBinding: {
      path: input.b6RunManifestPath,
      schemaVersion: DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V001,
      fileSha256: sha256(input.b6RunManifestBytes)
    },
    reviewPageBinding: {
      path: input.reviewPagePath,
      schemaVersion: DISTANT_CONNECTION_REAL_HUMAN_REVIEW_PAGE_SCHEMA_V001,
      fileSha256: sha256(reviewHtmlBytes)
    },
    candidateCount: views.length,
    candidates: views.map((view) => ({
      candidateId: view.candidate.candidateId,
      firstPart: {startMs: view.first.startMs, endMs: view.first.endMs},
      secondPart: {startMs: view.second.startMs, endMs: view.second.endMs},
      gapMs: view.gapMs,
      direction: view.candidate.direction,
      anchorId: view.candidate.anchorId,
      anchorSemanticUtteranceId: view.anchorUtteranceId,
      anchorPart: view.anchorPart,
      surroundingContext: {decision: 'not-shown', reason: 'selected-utterances-form-readable-statement'}
    })),
    validation: {decision: 'passed', strictCandidateCount: views.length}
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {reviewHtmlBytes, manifest, manifestBytes};
}

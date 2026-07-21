import { presentationFirstRealDataCanonicalSha256 } from './presentation_first_real_data_gate_v001.mjs';

export const PRESENTATION_FIRST_REAL_DATA_REVIEW_PAGE_SCHEMA_V001 =
  'presentation-first-real-data-review-page-v001';
export const PRESENTATION_FIRST_REAL_DATA_REVIEW_RESULT_SCHEMA_V001 =
  'presentation-internal-trim-human-review-result-v001';

export const presentationFirstRealDataRequiredPlaybackIdsV001 = (page) => [
  'original',
  ...page.gaps.map((gap) => `${gap.gapId}-context`),
  'edited',
];

export const presentationFirstRealDataRequiredPlaybackCompleteV001 = (page, draft) => (
  presentationFirstRealDataRequiredPlaybackIdsV001(page).every(
    (playbackId) => draft?.playbackCompleted?.[playbackId] === true,
  )
);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactFields = (value, fields) => isObject(value)
  && Object.keys(value).sort().join('\u0000') === [...fields].sort().join('\u0000');
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isMs = (value) => Number.isInteger(value) && value >= 0;

const fail = (path, message) => {
  throw new TypeError(`${path}: ${message}`);
};

const validateRef = (value, path) => {
  if (!exactFields(value, ['path', 'fileSha256'])) fail(path, 'pathとfileSha256だけが必要です');
  if (!isNonEmptyString(value.path)) fail(`${path}.path`, '空にできません');
  if (!SHA256_PATTERN.test(value.fileSha256 ?? '')) fail(`${path}.fileSha256`, 'SHA-256が必要です');
};

const validateRange = (value, path, outer = null) => {
  if (!exactFields(value, ['startMs', 'endMs'])) fail(path, 'startMsとendMsだけが必要です');
  if (!isMs(value.startMs) || !isMs(value.endMs) || value.startMs >= value.endMs) {
    fail(path, '正順の整数ms範囲が必要です');
  }
  if (outer && (value.startMs < outer.startMs || value.endMs > outer.endMs)) {
    fail(path, '外側範囲を越えています');
  }
};

const validateUtterance = (value, path, outer) => {
  if (!exactFields(value, ['utteranceId', 'startMs', 'endMs', 'text', 'characters'])) {
    fail(path, '発話のfieldが一致しません');
  }
  if (!isNonEmptyString(value.utteranceId)) fail(`${path}.utteranceId`, '空にできません');
  validateRange({startMs: value.startMs, endMs: value.endMs}, path, outer);
  if (!isNonEmptyString(value.text)) fail(`${path}.text`, '空にできません');
  if (!Array.isArray(value.characters) || value.characters.length === 0) {
    fail(`${path}.characters`, '1文字以上が必要です');
  }
  const ids = new Set();
  let previousEnd = value.startMs;
  value.characters.forEach((character, index) => {
    const itemPath = `${path}.characters[${index}]`;
    if (!exactFields(character, ['characterId', 'text', 'startMs', 'endMs'])) {
      fail(itemPath, '文字のfieldが一致しません');
    }
    if (!isNonEmptyString(character.characterId) || ids.has(character.characterId)) {
      fail(`${itemPath}.characterId`, '一意なIDが必要です');
    }
    ids.add(character.characterId);
    if (typeof character.text !== 'string' || Array.from(character.text).length !== 1) {
      fail(`${itemPath}.text`, 'Unicode 1文字が必要です');
    }
    if (!isMs(character.startMs) || !isMs(character.endMs)
      || character.startMs > character.endMs
      || character.startMs < previousEnd
      || character.startMs < value.startMs
      || character.endMs > value.endMs) {
      fail(itemPath, '時刻が発話内で正順ではありません');
    }
    previousEnd = character.endMs;
  });
  if (value.characters.map((character) => character.text).join('') !== value.text) {
    fail(`${path}.text`, 'charactersを連結した原文と一致しません');
  }
};

export function validatePresentationFirstRealDataReviewPageV001(page) {
  if (!exactFields(page, [
    'schemaVersion', 'pageId', 'pageRevision', 'draftStorageKey', 'media',
    'candidate', 'gaps', 'artifacts',
  ])) fail('$', 'page fieldが一致しません');
  if (page.schemaVersion !== PRESENTATION_FIRST_REAL_DATA_REVIEW_PAGE_SCHEMA_V001) {
    fail('$.schemaVersion', '未対応schemaです');
  }
  for (const field of ['pageId', 'pageRevision', 'draftStorageKey']) {
    if (!isNonEmptyString(page[field])) fail(`$.${field}`, '空にできません');
  }
  if (!exactFields(page.media, ['sourceId', 'url', 'fileSha256', 'durationMs'])) {
    fail('$.media', 'media fieldが一致しません');
  }
  if (page.media.sourceId !== 'DmWu0jVQfTE') fail('$.media.sourceId', '対象素材が違います');
  if (!isNonEmptyString(page.media.url)) fail('$.media.url', '空にできません');
  if (!SHA256_PATTERN.test(page.media.fileSha256 ?? '')) fail('$.media.fileSha256', 'SHA-256が必要です');
  if (!isMs(page.media.durationMs) || page.media.durationMs === 0) fail('$.media.durationMs', '正の整数msが必要です');

  if (!exactFields(page.candidate, ['candidateId', 'title', 'startMs', 'endMs'])) {
    fail('$.candidate', 'candidate fieldが一致しません');
  }
  if (page.candidate.candidateId !== 13) fail('$.candidate.candidateId', 'candidate 13専用です');
  if (!isNonEmptyString(page.candidate.title)) fail('$.candidate.title', '空にできません');
  validateRange({startMs: page.candidate.startMs, endMs: page.candidate.endMs}, '$.candidate');
  if (page.candidate.endMs > page.media.durationMs) fail('$.candidate.endMs', '媒体尺を越えています');
  const candidateRange = {startMs: page.candidate.startMs, endMs: page.candidate.endMs};

  if (!Array.isArray(page.gaps) || page.gaps.length !== 2) fail('$.gaps', '発話間は2件固定です');
  const gapIds = new Set();
  let previousGapEnd = candidateRange.startMs;
  page.gaps.forEach((gap, index) => {
    const path = `$.gaps[${index}]`;
    if (!exactFields(gap, [
      'gapId', 'label', 'startMs', 'endMs', 'protectionReason', 'localRange',
      'beforeUtterance', 'afterUtterance', 'machineBoundary',
    ])) fail(path, 'gap fieldが一致しません');
    if (!isNonEmptyString(gap.gapId) || gapIds.has(gap.gapId)) fail(`${path}.gapId`, '一意なIDが必要です');
    gapIds.add(gap.gapId);
    if (!isNonEmptyString(gap.label) || !isNonEmptyString(gap.protectionReason)) {
      fail(path, '表示名と保護理由が必要です');
    }
    validateRange({startMs: gap.startMs, endMs: gap.endMs}, path, candidateRange);
    if (gap.startMs < previousGapEnd) fail(path, 'gapが時刻順ではありません');
    previousGapEnd = gap.endMs;
    validateRange(gap.localRange, `${path}.localRange`, candidateRange);
    validateUtterance(gap.beforeUtterance, `${path}.beforeUtterance`, gap.localRange);
    validateUtterance(gap.afterUtterance, `${path}.afterUtterance`, gap.localRange);
    if (gap.beforeUtterance.endMs > gap.afterUtterance.startMs) fail(path, '前後発話が逆転しています');
    if (!exactFields(gap.machineBoundary, ['leftCharacterId', 'rightCharacterId'])) {
      fail(`${path}.machineBoundary`, '機械提示端点が必要です');
    }
    const left = gap.beforeUtterance.characters.find(
      (character) => character.characterId === gap.machineBoundary.leftCharacterId,
    );
    const right = gap.afterUtterance.characters.find(
      (character) => character.characterId === gap.machineBoundary.rightCharacterId,
    );
    if (!left || !right) fail(`${path}.machineBoundary`, '全文内に実在する端点が必要です');
    if (left.endMs !== gap.startMs || right.startMs !== gap.endMs) {
      fail(`${path}.machineBoundary`, '機械提示の発話間と文字端点が一致しません');
    }
  });

  if (!exactFields(page.artifacts, [
    'mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'sttManifest', 'wordTimestamps',
    'candidateManifest',
  ])) fail('$.artifacts', 'artifact参照が一致しません');
  for (const field of Object.keys(page.artifacts)) validateRef(page.artifacts[field], `$.artifacts.${field}`);
  return page;
}

/**
 * BrowserとNodeが共通利用する、正式人間確認契約のpayload生成。
 * 未回答と「追加編集が必要」も構造は保ち、保存可否はsave-preflightに委ねる。
 */
export function buildPresentationFirstRealDataReviewPayloadV001(page, draft) {
  const selectionBoundary = (utterance, characterId) => {
    const index = utterance.characters.findIndex((character) => character.characterId === characterId);
    if (index < 0) return null;
    const character = utterance.characters[index];
    return {
      characterId: character.characterId,
      text: character.text,
      startMs: character.startMs,
      endMs: character.endMs,
      contextBefore: utterance.characters.slice(0, index).map((item) => item.text).join(''),
      contextAfter: utterance.characters.slice(index + 1).map((item) => item.text).join(''),
    };
  };
  const characterFor = (gap, side, characterId) => (
    (side === 'left' ? gap.beforeUtterance : gap.afterUtterance).characters
      .find((character) => character.characterId === characterId) ?? null
  );
  let positionSearchCount = 0;
  const decisions = page.gaps.map((gap) => {
    const answer = draft?.gaps?.[gap.gapId] ?? {};
    const normalizedAnswer = ['cut', 'keep'].includes(answer.decision)
      ? answer.decision : 'unanswered';
    if (normalizedAnswer !== 'cut') {
      return {
        reviewItemId: gap.gapId,
        answer: normalizedAnswer,
        modified: false,
        cutRange: null,
        selection: null,
      };
    }
    const left = characterFor(gap, 'left', answer.leftCharacterId);
    const right = characterFor(gap, 'right', answer.rightCharacterId);
    if (!left || !right || left.endMs >= right.startMs) {
      throw new TypeError(`${gap.gapId}: 選択された文字端点から正順の削除範囲を作れません`);
    }
    const leftModified = answer.leftCharacterId !== gap.machineBoundary.leftCharacterId;
    const rightModified = answer.rightCharacterId !== gap.machineBoundary.rightCharacterId;
    const modified = leftModified || rightModified;
    positionSearchCount += Number(leftModified) + Number(rightModified);
    return {
      reviewItemId: gap.gapId,
      answer: 'cut',
      modified,
      cutRange: {startMs: left.endMs, endMs: right.startMs},
      selection: modified ? {
        beforeLastKeptCharacter: selectionBoundary(gap.beforeUtterance, left.characterId),
        afterFirstKeptCharacter: selectionBoundary(gap.afterUtterance, right.characterId),
      } : null,
    };
  });
  const derived = derivePresentationFirstRealDataSegmentsV001(page, draft);
  if (!derived.valid) throw new TypeError(derived.errors.join(' / '));
  const finalDisposition = draft?.finalDecision === 'complete'
    ? 'complete'
    : draft?.finalDecision === 'needs_more_editing'
      ? 'needs_additional_edit'
      : 'unanswered';
  return {
    references: {
      basisEditPlan: page.artifacts.basisEditPlan,
      sourceIdentity: page.artifacts.sourceIdentity,
      mediaEquivalence: page.artifacts.mediaEquivalence,
      sttManifest: page.artifacts.sttManifest,
      wordTimestamps: page.artifacts.wordTimestamps,
      candidateManifest: page.artifacts.candidateManifest,
    },
    candidate: {
      candidateId: page.candidate.candidateId,
      outerRange: {startMs: page.candidate.startMs, endMs: page.candidate.endMs},
    },
    decisions,
    retainedSegments: derived.segments.map((segment) => ({
      startMs: segment.sourceStartMs,
      endMs: segment.sourceEndMs,
    })),
    finalDisposition,
    positionSearchCount,
  };
}

export function buildPresentationFirstRealDataHumanReadableSummaryV001(payload) {
  const answerLabel = (answer) => (
    answer === 'cut' ? '切る' : answer === 'keep' ? '残す' : '未回答'
  );
  const finalLabel = payload.finalDisposition === 'complete'
    ? 'この区間列で完成'
    : payload.finalDisposition === 'needs_additional_edit'
      ? '追加編集が必要'
      : '未回答';
  return [
    `candidate ${payload.candidate.candidateId}の内部詰め確認。`,
    ...payload.decisions.map((decision, index) => (
      `発話間${index + 1}: ${answerLabel(decision.answer)}`
    )),
    `最終判断: ${finalLabel}。`,
    `位置探索: ${payload.positionSearchCount}回。`,
  ].join(' ');
}

export function buildPresentationFirstRealDataHumanReviewResultV001(pageInput, draft) {
  const page = validatePresentationFirstRealDataReviewPageV001(structuredClone(pageInput));
  if (!presentationFirstRealDataRequiredPlaybackCompleteV001(page, draft)) {
    throw new TypeError('元候補・各発話間の局所範囲・現在の編集結果の必須再生が未完了です');
  }
  const payload = buildPresentationFirstRealDataReviewPayloadV001(page, draft);
  const humanReadableSummary = buildPresentationFirstRealDataHumanReadableSummaryV001(payload);
  return {
    schemaVersion: PRESENTATION_FIRST_REAL_DATA_REVIEW_RESULT_SCHEMA_V001,
    recordId: `${page.pageId}-human-review-result-v001`,
    payload,
    humanReadableSummary,
    payloadSha256: presentationFirstRealDataCanonicalSha256(payload),
  };
}

/** Browserへも同じ関数本文を埋め込み、previewとNode検査で補集合計算を共有する。 */
export function derivePresentationFirstRealDataSegmentsV001(page, draft) {
  const findCharacter = (gap, side, characterId) => {
    const utterance = side === 'left' ? gap.beforeUtterance : gap.afterUtterance;
    return utterance.characters.find((character) => character.characterId === characterId) ?? null;
  };
  const cuts = [];
  const errors = [];
  for (const gap of page.gaps) {
    const answer = draft.gaps?.[gap.gapId];
    if (!answer || ![null, 'cut', 'keep'].includes(answer.decision ?? null)) {
      errors.push(`${gap.gapId}:判断状態が不正です`);
      continue;
    }
    const left = findCharacter(gap, 'left', answer.leftCharacterId);
    const right = findCharacter(gap, 'right', answer.rightCharacterId);
    if (!left || !right) {
      errors.push(`${gap.gapId}:文字端点が全文内にありません`);
      continue;
    }
    const cut = {gapId: gap.gapId, startMs: left.endMs, endMs: right.startMs};
    if (cut.startMs >= cut.endMs
      || cut.startMs < page.candidate.startMs
      || cut.endMs > page.candidate.endMs) {
      errors.push(`${gap.gapId}:削除範囲が正順・外側範囲内ではありません`);
      continue;
    }
    if (answer.decision === 'cut') cuts.push(cut);
  }
  cuts.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index].startMs < cuts[index - 1].endMs) errors.push('削除範囲が重なっています');
  }
  if (errors.length > 0) return {valid: false, errors, cuts, segments: []};
  const segments = [];
  let cursor = page.candidate.startMs;
  for (const cut of cuts) {
    if (cursor < cut.startMs) segments.push({sourceStartMs: cursor, sourceEndMs: cut.startMs});
    cursor = cut.endMs;
  }
  if (cursor < page.candidate.endMs) {
    segments.push({sourceStartMs: cursor, sourceEndMs: page.candidate.endMs});
  }
  if (segments.length === 0) return {valid: false, errors: ['残存区間が空です'], cuts, segments};
  return {valid: true, errors: [], cuts, segments};
}

const escapedJson = (value) => JSON.stringify(value)
  .replace(/</gu, '\\u003c')
  .replace(/\u2028/gu, '\\u2028')
  .replace(/\u2029/gu, '\\u2029');

export function buildPresentationFirstRealDataReviewHtmlV001(pageInput) {
  const page = validatePresentationFirstRealDataReviewPageV001(structuredClone(pageInput));
  const embeddedDerive = derivePresentationFirstRealDataSegmentsV001.toString();
  const embeddedPayloadBuilder = buildPresentationFirstRealDataReviewPayloadV001.toString();
  const embeddedSummaryBuilder = buildPresentationFirstRealDataHumanReadableSummaryV001.toString();
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>初回実データ接続 内部詰め確認</title>
  <style>
    :root{color-scheme:dark;--bg:#0d1117;--panel:#161b22;--line:#30363d;--text:#f0f3f6;--muted:#a7b0bb;--blue:#58a6ff;--green:#238636;--red:#80343c;--amber:#9e6a03}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;padding:0 0 190px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}button,textarea{font:inherit}button{color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:9px;padding:9px 11px;cursor:pointer}button:hover{border-color:var(--blue)}button.active{outline:3px solid var(--blue)}button:disabled{opacity:.42;cursor:not-allowed}header,main{width:min(1080px,calc(100% - 24px));margin:auto}header{padding-top:12px}h1{font-size:clamp(22px,4vw,32px);margin:0 0 6px}.card,.guide,.result{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:13px;margin-top:10px}.guide{border-left:5px solid var(--blue)}.guide p{margin:5px 0}.muted{color:var(--muted)}.error{color:#ff9b9b}.hidden{display:none!important}video{display:block;width:100%;height:auto;max-height:min(42vh,420px);object-fit:contain;background:#000;border-radius:10px}.play-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.play-grid button{text-align:left}.status{min-height:1.5em;margin:7px 0 0}.step{display:none}.step.active{display:block}.boundary-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}.boundary-box{background:#10151c;border:1px solid var(--line);border-radius:9px;padding:9px}.utterance{background:#10151c;border-left:4px solid #484f58;border-radius:8px;padding:9px;margin-top:8px;line-height:2.15;word-break:break-word}.utterance.selectable{border-left-color:var(--blue)}.char-token{display:inline;border:0;border-radius:3px;padding:2px 1px;margin:0;background:transparent;color:inherit;line-height:inherit}.char-token.selectable:hover,.char-token.selectable:focus{background:#274566}.char-token.chosen-left{outline:2px solid #ffd071}.char-token.chosen-right{outline:2px solid #7ee2a8}.char-token:disabled{opacity:1;cursor:default}.edit-actions,.small-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.edit-actions button{flex:1}.segment-list{margin:7px 0;padding-left:22px}.result textarea{width:100%;min-height:330px;color:var(--text);background:#0d1117;border:1px solid var(--line);border-radius:8px;padding:9px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.start-overlay{position:fixed;inset:0;z-index:50;background:rgba(13,17,23,.98);display:grid;place-items:center;padding:18px}.start-box{width:min(680px,100%);background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:20px}.start-box button{width:100%;margin-top:9px;background:var(--green);font-weight:700}.dock{position:fixed;z-index:20;left:0;right:0;bottom:0;background:rgba(13,17,23,.98);border-top:1px solid var(--line);padding:9px 12px}.dock-inner{width:min(1080px,100%);margin:auto}.choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.choices button[data-choice="cut"]{background:#7b343b}.choices button[data-choice="keep"],.choices button[data-choice="complete"]{background:#1f6f3f}.choices button[data-choice="needs_more_editing"]{background:#6b4b18}.nav{display:flex;gap:8px;align-items:center;margin-top:8px}.nav .spacer{flex:1}.copy{background:var(--green);font-weight:700}.step-label{font-weight:700;color:#9ecbff}@media(max-width:720px){body{padding-bottom:240px}.play-grid,.boundary-summary{grid-template-columns:1fr}.choices button{font-size:13px;padding:9px 4px}video{max-height:34vh}.nav button{padding:8px}}
  </style>
</head>
<body>
  <div id="startOverlay" class="start-overlay"><div class="start-box">
    <h1>candidate 13の内部詰め確認</h1>
    <p><strong>目的:</strong> 機械が示した2つの発話間を切るか残すか決め、最後に現在の区間列で完成かを答えます。</p>
    <p><strong>見なくてよいもの:</strong> テロップ、演出、画質、別場面の前振り。</p>
    <p><strong>答えるもの:</strong> 発話間2件の「切る / 残す」と、最後の「この区間列で完成 / 追加編集が必要」。</p>
    <p><strong>時間は計測しません。</strong> 再生、修正、取消は何度でもできます。時刻の手入力もありません。</p>
    <button id="startReview">確認を開始して元候補を再生</button>
  </div></div>
  <header><h1>初回実データ接続 内部詰め確認</h1><div id="progress" class="muted"></div></header>
  <main>
    <section class="guide"><p><strong>問い:</strong> この候補内の2つの間を詰めた方がよいかを認定してください。別場面の文脈追加や意味的な内部カットは今回決めません。</p><p>文字端点を直す場合は、発話全文を読んだまま「前側で最後に残す文字」と「後側で最初に残す文字」を選びます。文字を選んでも再生は始まりません。</p><p>時刻はすべて <strong>HH:MM:SS.mmm</strong> で表示します。時刻を手入力する必要はありません。</p></section>
    <section class="card"><h2 id="candidateTitle"></h2><p id="candidateRange"></p><video id="video" controls preload="metadata"></video><div class="play-grid"><button id="playCandidate"></button><button id="playEdited"></button><button id="playLocal"></button><button id="playJunction"></button></div><p id="playStatus" class="status muted">再生する範囲を、名前と長さを確認して選んでください。</p><p id="playbackRemaining" class="status"></p></section>
    <div id="gapSteps"></div>
    <section id="finalStep" class="card step"><p class="step-label">判断3 / 3</p><h2>現在の区間列で完成か</h2><p>提示した2件以外に、今回さらにフィラーや意味カットを指定する必要があるかを答えてください。</p><div id="answerSummary"></div><h3>現在残す区間</h3><ol id="segmentList" class="segment-list"></ol><p id="segmentError" class="error"></p></section>
    <section id="resultPanel" class="result hidden"><h2>このセッションの結果</h2><p>結果をコピーしてチャットへ貼ってください。コピー後も前へ戻って修正し、再コピーできます。正式保存はされません。</p><button id="copyResult" class="copy">人間可読要約と厳密JSONをコピー</button><textarea id="resultText" readonly></textarea></section>
  </main>
  <div class="dock"><div class="dock-inner"><div id="gapChoices" class="choices"><button data-choice="cut">切る</button><button data-choice="keep">残す</button><button data-choice="unanswered">未回答に戻す</button></div><div id="finalChoices" class="choices hidden"><button data-choice="complete">この区間列で完成</button><button data-choice="needs_more_editing">追加編集が必要</button><button data-choice="unanswered">未回答に戻す</button></div><div class="nav"><button id="previousStep">前へ</button><strong id="currentStatus">未回答</strong><span class="spacer"></span><button id="resetDraft">下書きを全て取り消す</button><button id="nextStep">次へ</button></div></div></div>
  <script>
    (()=>{
      const PAGE=${escapedJson(page)};
      const RESULT_SCHEMA=${escapedJson(PRESENTATION_FIRST_REAL_DATA_REVIEW_RESULT_SCHEMA_V001)};
      const derivePresentationFirstRealDataSegmentsV001=${embeddedDerive};
      const deriveSegments=derivePresentationFirstRealDataSegmentsV001;
      const buildReviewPayload=${embeddedPayloadBuilder};
      const buildHumanReadableSummary=${embeddedSummaryBuilder};
      const $=(id)=>document.getElementById(id);
      const video=$('video');
      video.src=PAGE.media.url;
      const steps=PAGE.gaps.length+1;
      const REQUIRED_PLAYBACK_IDS=['original',...PAGE.gaps.map((gap)=>gap.gapId+'-context'),'edited'];
      const PLAYBACK_LABELS={original:'元候補',edited:'現在の編集結果',...Object.fromEntries(PAGE.gaps.map((gap,index)=>[gap.gapId+'-context','発話間'+(index+1)+'の前後']))};
      let playQueue=[];
      let playQueueIndex=0;
      let playEndMs=null;
      let playCompletionKey=null;
      let playCompletionSignature=null;
      let programmaticSeekStartMs=null;
      let editSide='left';
      let resultRevision=0;
      const blankDraft=()=>({
        schemaVersion:'presentation-first-real-data-review-draft-v002',
        pageRevision:PAGE.pageRevision,
        introAccepted:false,
        currentStep:0,
        playbackCompleted:Object.fromEntries(REQUIRED_PLAYBACK_IDS.map((playbackId)=>[playbackId,false])),
        gaps:Object.fromEntries(PAGE.gaps.map((gap)=>[gap.gapId,{
          decision:null,
          leftCharacterId:gap.machineBoundary.leftCharacterId,
          rightCharacterId:gap.machineBoundary.rightCharacterId,
        }])),
        finalDecision:null,
      });
      let draft=blankDraft();
      try{
        const saved=JSON.parse(localStorage.getItem(PAGE.draftStorageKey)||'null');
        if(saved&&saved.schemaVersion===draft.schemaVersion&&saved.pageRevision===PAGE.pageRevision&&REQUIRED_PLAYBACK_IDS.every((playbackId)=>typeof saved.playbackCompleted?.[playbackId]==='boolean'))draft=saved;
      }catch{}
      const saveDraft=()=>localStorage.setItem(PAGE.draftStorageKey,JSON.stringify(draft));
      const esc=(value)=>String(value??'').replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
      const clock=(ms)=>{const value=Math.max(0,ms),whole=Math.floor(value/1000),millis=value%1000,hours=Math.floor(whole/3600),minutes=Math.floor((whole%3600)/60),seconds=whole%60;return [hours,minutes,seconds].map((item)=>String(item).padStart(2,'0')).join(':')+'.'+String(millis).padStart(3,'0')};
      const rangeLabel=(startMs,endMs)=>clock(startMs)+'〜'+clock(endMs)+'（長さ '+clock(endMs-startMs)+'）';
      const totalLength=(segments)=>segments.reduce((total,segment)=>total+segment.sourceEndMs-segment.sourceStartMs,0);
      const gapAtStep=()=>draft.currentStep<PAGE.gaps.length?PAGE.gaps[draft.currentStep]:null;
      const answerFor=(gap)=>draft.gaps[gap.gapId];
      const allPlaybackCompleted=()=>REQUIRED_PLAYBACK_IDS.every((playbackId)=>draft.playbackCompleted[playbackId]===true);
      const remainingPlaybackLabels=()=>REQUIRED_PLAYBACK_IDS.filter((playbackId)=>draft.playbackCompleted[playbackId]!==true).map((playbackId)=>PLAYBACK_LABELS[playbackId]);
      const invalidateEditedPlayback=()=>{draft.playbackCompleted.edited=false;if(playCompletionKey==='edited'){playCompletionKey=null;playCompletionSignature=null}};
      const characterForPage=(gap,side,id)=>(side==='left'?gap.beforeUtterance:gap.afterUtterance).characters.find((character)=>character.characterId===id)||null;
      const cutFor=(gap)=>{const answer=answerFor(gap),left=characterForPage(gap,'left',answer.leftCharacterId),right=characterForPage(gap,'right',answer.rightCharacterId);return left&&right?{startMs:left.endMs,endMs:right.startMs}:null};
      const markedText=(gap,side)=>{const answer=answerFor(gap),utterance=side==='left'?gap.beforeUtterance:gap.afterUtterance,id=side==='left'?answer.leftCharacterId:answer.rightCharacterId,index=utterance.characters.findIndex((character)=>character.characterId===id);if(index<0)return'未選択';const before=utterance.characters.slice(0,index).map((character)=>character.text).join(''),selected=utterance.characters[index].text,after=utterance.characters.slice(index+1).map((character)=>character.text).join('');return side==='left'?before+selected+'【ここまで残す】'+after:before+'【ここから残す】'+selected+after};
      const renderUtterance=(gap,side)=>{const utterance=side==='left'?gap.beforeUtterance:gap.afterUtterance,answer=answerFor(gap),selectedId=side==='left'?answer.leftCharacterId:answer.rightCharacterId,selectable=editSide===side;return '<div class="utterance '+(selectable?'selectable':'')+'" data-utterance-side="'+side+'"><strong>'+(side==='left'?'前側の発話全文':'後側の発話全文')+'</strong><div>'+utterance.characters.map((character)=>'<button type="button" class="char-token '+(selectable?'selectable ':'')+(selectedId===character.characterId?(side==='left'?'chosen-left':'chosen-right'):'')+'" data-character-side="'+side+'" data-character-id="'+esc(character.characterId)+'" '+(selectable?'':'disabled')+'>'+esc(character.text)+'</button>').join('')+'</div></div>'};
      const gapStepHtml=(gap,index)=>'<section id="gapStep'+index+'" class="card step"><p class="step-label">判断 '+(index+1)+' / 3</p><h2>'+esc(gap.label)+'</h2><p>機械提示: '+rangeLabel(gap.startMs,gap.endMs)+'。保護記録: '+esc(gap.protectionReason)+'</p><div class="boundary-summary"><div class="boundary-box"><strong>前側で最後に残す文字</strong><p id="leftSummary'+index+'"></p></div><div class="boundary-box"><strong>後側で最初に残す文字</strong><p id="rightSummary'+index+'"></p></div></div><div class="edit-actions"><button type="button" data-edit-side="left">前側の最後に残す文字を選ぶ</button><button type="button" data-edit-side="right">後側の最初に残す文字を選ぶ</button></div><p class="muted">発話全文内の文字を押すと端点だけが変わります。再生は始まりません。</p><div id="utterances'+index+'"></div><div class="small-actions"><button type="button" data-reset-boundary="'+esc(gap.gapId)+'">端点修正を取り消して機械提示へ戻す</button><button type="button" data-clear-answer="'+esc(gap.gapId)+'">この判断を未回答に戻す</button></div><p id="gapError'+index+'" class="error"></p></section>';
      $('gapSteps').innerHTML=PAGE.gaps.map(gapStepHtml).join('');
      const clearActivePlayback=()=>{playQueue=[];playQueueIndex=0;playEndMs=null;playCompletionKey=null;playCompletionSignature=null;programmaticSeekStartMs=null};
      const editedSignature=()=>JSON.stringify(edited().segments);
      const completeActivePlayback=()=>{const completionKey=playCompletionKey,completionSignature=playCompletionSignature;clearActivePlayback();if(!completionKey)return;if(completionKey==='edited'&&completionSignature!==editedSignature())return;draft.playbackCompleted[completionKey]=true;saveDraft();render()};
      const startPart=()=>{const segment=playQueue[playQueueIndex];if(!segment){playEndMs=null;return}const seekAndPlay=()=>{playEndMs=segment.sourceEndMs;programmaticSeekStartMs=segment.sourceStartMs;video.currentTime=segment.sourceStartMs/1000;video.play().catch(()=>{$('playStatus').textContent='再生を開始できませんでした。同じ再生ボタンをもう一度押してください。';clearActivePlayback()})};if(video.readyState<1){$('playStatus').textContent='媒体情報を読み込んでいます。読込後に指定範囲を再生します。';video.addEventListener('loadedmetadata',seekAndPlay,{once:true});return}seekAndPlay()};
      const playSegments=(segments,label,completionKey=null)=>{playQueue=segments.filter((segment)=>segment.sourceStartMs<segment.sourceEndMs);playQueueIndex=0;playCompletionKey=completionKey;playCompletionSignature=completionKey==='edited'?JSON.stringify(playQueue):null;if(!playQueue.length){$('playStatus').textContent='再生できる正順の範囲がありません。';clearActivePlayback();return}$('playStatus').textContent=label+' '+playQueue.map((segment)=>rangeLabel(segment.sourceStartMs,segment.sourceEndMs)).join(' → ')+'、合計 '+clock(totalLength(playQueue))+'を順次再生します。';startPart()};
      const stopRequiredPlaybackAfterManualSeek=()=>{if(!playCompletionKey)return;video.pause();clearActivePlayback();$('playStatus').textContent='再生位置を手動で動かしたため、この必須再生は完了扱いにしません。再生ボタンからやり直してください。'};
      video.addEventListener('seeking',()=>{if(!playCompletionKey)return;const currentMs=Math.round(video.currentTime*1000);if(programmaticSeekStartMs!==null&&currentMs===programmaticSeekStartMs)return;stopRequiredPlaybackAfterManualSeek()});
      video.addEventListener('seeked',()=>{if(!playCompletionKey){programmaticSeekStartMs=null;return}const currentMs=Math.round(video.currentTime*1000);if(programmaticSeekStartMs!==null&&currentMs===programmaticSeekStartMs){programmaticSeekStartMs=null;return}stopRequiredPlaybackAfterManualSeek()});
      video.addEventListener('timeupdate',()=>{if(playEndMs===null||video.currentTime*1000<playEndMs)return;video.pause();playQueueIndex+=1;if(playQueueIndex<playQueue.length)startPart();else{$('playStatus').textContent='指定した終点まで再生しました。';completeActivePlayback()}});
      const renderGap=(gap,index)=>{const answer=answerFor(gap),left=characterForPage(gap,'left',answer.leftCharacterId),right=characterForPage(gap,'right',answer.rightCharacterId),cut=cutFor(gap);$('leftSummary'+index).textContent=left?clock(left.endMs)+' '+markedText(gap,'left'):'未選択';$('rightSummary'+index).textContent=right?clock(right.startMs)+' '+markedText(gap,'right'):'未選択';$('utterances'+index).innerHTML=renderUtterance(gap,'left')+renderUtterance(gap,'right');$('gapError'+index).textContent=!cut||cut.startMs>=cut.endMs?'前後の文字端点が正順ではありません。':''};
      const edited=()=>deriveSegments(PAGE,draft);
      const allAnswered=()=>PAGE.gaps.every((gap)=>['cut','keep'].includes(answerFor(gap).decision))&&['complete','needs_more_editing'].includes(draft.finalDecision);
      const resultStateSignature=()=>JSON.stringify({gaps:draft.gaps,finalDecision:draft.finalDecision,playbackCompleted:draft.playbackCompleted});
      const canonicalize=(value)=>{if(Array.isArray(value))return value.map(canonicalize);if(value===null||typeof value!=='object')return value;return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])]))};
      const payloadSha256=async(payload)=>{const encoded=new TextEncoder().encode(JSON.stringify(canonicalize(payload))),digest=await crypto.subtle.digest('SHA-256',encoded);return Array.from(new Uint8Array(digest),(byte)=>byte.toString(16).padStart(2,'0')).join('')};
      const resultObject=async()=>{const payload=buildReviewPayload(PAGE,draft);return {schemaVersion:RESULT_SCHEMA,recordId:PAGE.pageId+'-human-review-result-v001',payload,humanReadableSummary:buildHumanReadableSummary(payload),payloadSha256:await payloadSha256(payload)}};
      const resultText=async()=>{const result=await resultObject(),lines=['初回実データ接続 candidate 13 内部詰め確認結果','素材: '+PAGE.media.sourceId,'候補: candidate '+PAGE.candidate.candidateId+' / '+PAGE.candidate.title,'時間計測: なし','',result.humanReadableSummary,'','--- 厳密JSON ---',JSON.stringify(result,null,2)];return lines.join('\\n')};
      const render=()=>{draft.currentStep=Math.max(0,Math.min(steps-1,Number(draft.currentStep)||0));PAGE.gaps.forEach(renderGap);document.querySelectorAll('.step').forEach((element)=>element.classList.remove('active'));if(draft.currentStep<PAGE.gaps.length)$('gapStep'+draft.currentStep).classList.add('active');else $('finalStep').classList.add('active');const currentGap=gapAtStep(),derived=edited();$('progress').textContent='candidate 13 / 判断 '+(draft.currentStep+1)+' / 3 / 回答済み '+(PAGE.gaps.filter((gap)=>answerFor(gap).decision).length+Number(Boolean(draft.finalDecision)))+' / 3';$('candidateTitle').textContent='candidate 13「'+PAGE.candidate.title+'」';$('candidateRange').textContent='元候補 '+rangeLabel(PAGE.candidate.startMs,PAGE.candidate.endMs);$('playCandidate').textContent='元候補を再生 '+rangeLabel(PAGE.candidate.startMs,PAGE.candidate.endMs);$('playEdited').textContent='現在の編集結果を順次再生 '+derived.segments.length+'区間（合計 '+clock(totalLength(derived.segments))+'）';$('playEdited').disabled=!derived.valid;if(currentGap){$('playLocal').textContent='この間の前後を再生 '+rangeLabel(currentGap.localRange.startMs,currentGap.localRange.endMs);const answer=answerFor(currentGap),cut=cutFor(currentGap),junctionSegments=cut?[{sourceStartMs:currentGap.localRange.startMs,sourceEndMs:cut.startMs},{sourceStartMs:cut.endMs,sourceEndMs:currentGap.localRange.endMs}].filter((segment)=>segment.sourceStartMs<segment.sourceEndMs):[];$('playJunction').textContent='このつなぎ目を順次再生 '+junctionSegments.length+'区間（合計 '+clock(totalLength(junctionSegments))+'）';$('playJunction').disabled=answer.decision!=='cut'||junctionSegments.length===0;$('gapChoices').classList.remove('hidden');$('finalChoices').classList.add('hidden');document.querySelectorAll('#gapChoices [data-choice]').forEach((button)=>button.classList.toggle('active',button.dataset.choice===answer.decision));$('currentStatus').textContent=answer.decision==='cut'?'切る':answer.decision==='keep'?'残す':'未回答'}else{$('playLocal').textContent='発話間を選ぶと局所範囲を表示します';$('playLocal').disabled=true;$('playJunction').textContent='発話間を選ぶとつなぎ目を表示します';$('playJunction').disabled=true;$('gapChoices').classList.add('hidden');$('finalChoices').classList.remove('hidden');document.querySelectorAll('#finalChoices [data-choice]').forEach((button)=>button.classList.toggle('active',button.dataset.choice===draft.finalDecision));$('currentStatus').textContent=draft.finalDecision==='complete'?'この区間列で完成':draft.finalDecision==='needs_more_editing'?'追加編集が必要':'未回答'}$('previousStep').disabled=draft.currentStep===0;$('nextStep').disabled=draft.currentStep===steps-1;$('answerSummary').innerHTML=PAGE.gaps.map((gap,index)=>'<p>確認'+(index+1)+': <strong>'+(answerFor(gap).decision==='cut'?'切る':answerFor(gap).decision==='keep'?'残す':'未回答')+'</strong></p>').join('');$('segmentList').innerHTML=derived.segments.map((segment)=>'<li>'+rangeLabel(segment.sourceStartMs,segment.sourceEndMs)+'</li>').join('');$('segmentError').textContent=derived.errors.join(' / ');const remaining=remainingPlaybackLabels();$('playbackRemaining').textContent='必須再生の残り: '+(remaining.length?remaining.join(' / '):'なし');const ready=allAnswered()&&derived.valid&&allPlaybackCompleted(),revision=++resultRevision;$('copyResult').disabled=!ready;$('resultPanel').classList.toggle('hidden',!ready);if(ready){$('resultText').value='厳密JSONのSHA-256を計算中です…';resultText().then((text)=>{if(revision===resultRevision&&allAnswered()&&allPlaybackCompleted())$('resultText').value=text}).catch((error)=>{$('resultText').value='結果生成失敗: '+error.message})}else $('resultText').value='';$('startOverlay').classList.toggle('hidden',draft.introAccepted);saveDraft();bindCharacterButtons()};
      const bindCharacterButtons=()=>{document.querySelectorAll('[data-character-id]').forEach((button)=>button.onclick=()=>{const gap=gapAtStep();if(!gap||button.dataset.characterSide!==editSide)return;const answer=answerFor(gap),field=editSide==='left'?'leftCharacterId':'rightCharacterId';if(answer[field]===button.dataset.characterId)return;answer[field]=button.dataset.characterId;invalidateEditedPlayback();saveDraft();render()})};
      document.querySelectorAll('[data-edit-side]').forEach((button)=>button.onclick=()=>{editSide=button.dataset.editSide;render()});
      document.querySelectorAll('[data-reset-boundary]').forEach((button)=>button.onclick=()=>{const gap=PAGE.gaps.find((item)=>item.gapId===button.dataset.resetBoundary),answer=answerFor(gap),changed=answer.leftCharacterId!==gap.machineBoundary.leftCharacterId||answer.rightCharacterId!==gap.machineBoundary.rightCharacterId;answer.leftCharacterId=gap.machineBoundary.leftCharacterId;answer.rightCharacterId=gap.machineBoundary.rightCharacterId;if(changed)invalidateEditedPlayback();saveDraft();render()});
      document.querySelectorAll('[data-clear-answer]').forEach((button)=>button.onclick=()=>{const answer=answerFor(PAGE.gaps.find((item)=>item.gapId===button.dataset.clearAnswer));if(answer.decision!==null){answer.decision=null;invalidateEditedPlayback()}saveDraft();render()});
      document.querySelectorAll('#gapChoices [data-choice]').forEach((button)=>button.onclick=()=>{const gap=gapAtStep();if(!gap)return;const answer=answerFor(gap),nextDecision=button.dataset.choice==='unanswered'?null:button.dataset.choice;if(answer.decision!==nextDecision){answer.decision=nextDecision;invalidateEditedPlayback()}saveDraft();render()});
      document.querySelectorAll('#finalChoices [data-choice]').forEach((button)=>button.onclick=()=>{draft.finalDecision=button.dataset.choice==='unanswered'?null:button.dataset.choice;saveDraft();render()});
      $('startReview').onclick=()=>{draft.introAccepted=true;saveDraft();render();playSegments([{sourceStartMs:PAGE.candidate.startMs,sourceEndMs:PAGE.candidate.endMs}],'元候補','original')};
      $('previousStep').onclick=()=>{draft.currentStep=Math.max(0,draft.currentStep-1);editSide='left';saveDraft();render();window.scrollTo({top:0,behavior:'smooth'})};
      $('nextStep').onclick=()=>{draft.currentStep=Math.min(steps-1,draft.currentStep+1);editSide='left';saveDraft();render();window.scrollTo({top:0,behavior:'smooth'})};
      $('resetDraft').onclick=()=>{localStorage.removeItem(PAGE.draftStorageKey);draft=blankDraft();editSide='left';clearActivePlayback();video.pause();render()};
      $('playCandidate').onclick=()=>playSegments([{sourceStartMs:PAGE.candidate.startMs,sourceEndMs:PAGE.candidate.endMs}],'元候補','original');
      $('playEdited').onclick=()=>{const derived=edited();if(derived.valid)playSegments(derived.segments,'現在の編集結果','edited')};
      $('playLocal').onclick=()=>{const gap=gapAtStep();if(gap)playSegments([{sourceStartMs:gap.localRange.startMs,sourceEndMs:gap.localRange.endMs}],'この間の前後',gap.gapId+'-context')};
      $('playJunction').onclick=()=>{const gap=gapAtStep();if(!gap||answerFor(gap).decision!=='cut')return;const cut=cutFor(gap),segments=[{sourceStartMs:gap.localRange.startMs,sourceEndMs:cut.startMs},{sourceStartMs:cut.endMs,sourceEndMs:gap.localRange.endMs}].filter((segment)=>segment.sourceStartMs<segment.sourceEndMs);playSegments(segments,'このつなぎ目')};
      $('copyResult').onclick=async()=>{if(!allAnswered()||!allPlaybackCompleted()||!edited().valid){$('playStatus').textContent='回答と必須再生がすべて終わるまで結果はコピーできません。';return}const copyRevision=resultRevision,copySignature=resultStateSignature(),text=await resultText();if(copyRevision!==resultRevision||copySignature!==resultStateSignature()||!allAnswered()||!allPlaybackCompleted()||!edited().valid){$('playStatus').textContent='結果の計算中に回答・再生状態が変わったため、古い結果はコピーしませんでした。もう一度コピーしてください。';return}const box=$('resultText');box.value=text;try{await navigator.clipboard.writeText(text);$('copyResult').textContent='コピーしました'}catch{box.focus();box.select();let copied=false;try{copied=document.execCommand('copy')}catch{}$('copyResult').textContent=copied?'コピーしました':'文章を選択しました。通常のコピー操作で回収してください'}};
      render();
    })();
  </script>
</body>
</html>`;
}

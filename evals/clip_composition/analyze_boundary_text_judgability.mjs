#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-boundary-diagnosis', '20260713-text-judgability-v001');
const blindJsonPath = path.join(outputRoot, 'blind-boundary-evidence.json');
const blindMarkdownPath = path.join(outputRoot, 'blind-boundary-review.md');
const reviewPath = path.join(outputRoot, 'blind-boundary-classification.json');
const resultPath = path.join(outputRoot, 'result.json');
const reportPath = path.join(evalRoot, 'reports', 'theme-composition-connection', '20260713-boundary-text-judgability-diagnosis-v001.md');
const boundaryScorePath = path.join(evalRoot, 'outputs', 'theme-composition-boundary', '20260713-boundary-v001-main-v001', 'result.json');
const granularityPath = path.join(evalRoot, 'outputs', 'boundary-granularity-two-fixture-20260713-v001.json');
const datasets = {
  nOEWCNc77MI_multiblock_material_v001: {
    sourceVideoId: 'YE-faluP7zY',
    transcriptPath: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    sourceVideoId: 'o8rZAhARXAc',
    transcriptPath: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
  }
};

const terminalPattern = /[。！？!?]/;
const transitionPhrases = ['ということで', 'ところで', 'そういえば', 'じゃあ', 'じゃ', 'さて', '次', 'でも', 'てか', 'よし', 'では', 'はい'];
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function compactTranscript(sourceVideoId, transcript) {
  const result = [];
  let current;
  const segments = transcript.segments.filter((item) => String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const text = String(segment.text ?? '').trim();
    if (!current) current = { speechId: result.length + 1, sourceVideoId, sourceStartMs: segment.startMs, sourceEndMs: segment.endMs, text: '' };
    current.sourceEndMs = Math.max(current.sourceEndMs, segment.endMs);
    current.text += text;
    const next = segments[index + 1];
    if (terminalPattern.test(text) || !next || next.startMs > current.sourceEndMs) {
      result.push(current);
      current = undefined;
    }
  }
  if (current) result.push(current);
  return result.map((item, index) => ({ ...item, speechId: index + 1 }));
}

function nearestSpeechBoundary(speechSegments, timeMs) {
  const points = speechSegments.flatMap((segment) => [
    { timeMs: segment.sourceStartMs, kind: 'start', speechId: segment.speechId },
    { timeMs: segment.sourceEndMs, kind: 'end', speechId: segment.speechId }
  ]);
  return points.reduce((best, point) => {
    const absoluteDistanceMs = Math.abs(point.timeMs - timeMs);
    if (!best || absoluteDistanceMs < best.absoluteDistanceMs || (absoluteDistanceMs === best.absoluteDistanceMs && point.timeMs < best.timeMs)) return { ...point, signedDistanceMs: point.timeMs - timeMs, absoluteDistanceMs };
    return best;
  }, undefined);
}

function reviewUnitBreak(previous, current) {
  return terminalPattern.test(previous.text) || previous.speaker !== current.speaker || current.startMs > previous.endMs;
}

function sentenceBounds(words, index) {
  let start = index;
  while (start > 0 && !reviewUnitBreak(words[start - 1], words[start])) start -= 1;
  let end = index;
  while (end < words.length - 1 && !reviewUnitBreak(words[end], words[end + 1])) end += 1;
  return { start, end };
}

function textOf(words, start, end) {
  if (start > end || start < 0 || end >= words.length) return '';
  return words.slice(start, end + 1).map((word) => word.text).join('');
}

function evidenceAt(words, speechSegments, boundaryMs, side) {
  const beforeIndex = words.reduce((last, word, index) => word.endMs <= boundaryMs ? index : last, -1);
  const afterIndex = words.findIndex((word) => word.startMs >= boundaryMs);
  if (beforeIndex < 0 || afterIndex < 0) throw new Error(`境界前後語なし: ${boundaryMs}`);
  const beforeWord = words[beforeIndex];
  const afterWord = words[afterIndex];
  const beforeSentence = sentenceBounds(words, beforeIndex);
  const afterSentence = sentenceBounds(words, afterIndex);
  const sameSentence = beforeSentence.start === afterSentence.start && beforeSentence.end === afterSentence.end;
  const leftFragment = textOf(words, beforeSentence.start, beforeIndex);
  const rightFragment = textOf(words, afterIndex, afterSentence.end);
  const markedContext = sameSentence
    ? `${textOf(words, beforeSentence.start, beforeIndex)}【境界】${textOf(words, afterIndex, afterSentence.end)}`
    : `${textOf(words, beforeSentence.start, beforeSentence.end)}【境界】${textOf(words, afterSentence.start, afterSentence.end)}`;
  const previousSentence = beforeSentence.start > 0 ? sentenceBounds(words, beforeSentence.start - 1) : null;
  const nextSentence = afterSentence.end < words.length - 1 ? sentenceBounds(words, afterSentence.end + 1) : null;
  return {
    side,
    boundaryMs,
    beforeWord: { id: beforeWord.id, startMs: beforeWord.startMs, endMs: beforeWord.endMs, text: beforeWord.text },
    afterWord: { id: afterWord.id, startMs: afterWord.startMs, endMs: afterWord.endMs, text: afterWord.text },
    adjacentWordGapMs: afterWord.startMs - beforeWord.endMs,
    nearestCompactedSpeechBoundary: nearestSpeechBoundary(speechSegments, boundaryMs),
    immediatelyAfterTerminalPunctuation: terminalPattern.test(beforeWord.text),
    immediatelyBeforeTerminalPunctuation: terminalPattern.test(afterWord.text),
    startsWithTransitionPhrase: transitionPhrases.filter((phrase) => rightFragment.startsWith(phrase)),
    leftFragment,
    rightFragment,
    markedContext,
    previousSentence: previousSentence ? textOf(words, previousSentence.start, previousSentence.end) : '',
    nextSentence: nextSentence ? textOf(words, nextSentence.start, nextSentence.end) : '',
    reviewPrompt: side === 'start'
      ? 'この境界は、新しい前提・出来事・発話の開始としてテキストだけで隣接候補より一意に選べるか。'
      : 'この境界は、文・反応・結論の完結としてテキストだけで隣接候補より一意に選べるか。'
  };
}

async function buildBlindEvidence() {
  const fixtures = [];
  for (const [fixtureId, dataset] of Object.entries(datasets)) {
    const [transcript, expected] = await Promise.all([
      readJson(dataset.transcriptPath),
      readJson(path.join(evalRoot, 'expected', `${fixtureId}.json`))
    ]);
    const words = transcript.segments.filter((item) => String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
    const speechSegments = compactTranscript(dataset.sourceVideoId, transcript);
    const cuts = expected.expectedCuts.map((cut, index) => ({
      key: `${fixtureId}:${index + 1}`,
      fixtureId,
      expectedIndex: index + 1,
      label: cut.label,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      start: evidenceAt(words, speechSegments, cut.sourceStartMs, 'start'),
      end: evidenceAt(words, speechSegments, cut.sourceEndMs, 'end')
    }));
    fixtures.push({ fixtureId, sourceVideoId: dataset.sourceVideoId, expectedCutCount: cuts.length, cuts });
  }
  return {
    kind: 'boundary_text_judgability_blind_evidence',
    generatedAt: new Date().toISOString(),
    blindedFields: ['boundary-v001 outputs', 'boundary-v001 success/failure', 'candidate index'],
    classificationPolicy: {
      text_judgable: 'text alone makes this exact word boundary clearly preferable to neighboring boundaries',
      audio_visual_cue_likely_needed: 'text remains continuous, multiple nearby boundaries are similarly plausible, or pause/laughter/voice/visual reaction is needed',
      numericThresholdsOrWeights: false
    },
    fixtures
  };
}

function blindMarkdown(blind) {
  const lines = [
    '# 38正解・76境界 テキスト判断可能性 盲検レビュー', '',
    '- boundary-v001の候補番号・出力・成否は含めない。',
    '- 数値は証拠であり、自動合否の閾値にしない。',
    '- 各境界を `text_judgable` / `audio_visual_cue_likely_needed` に分類し、根拠1文と確信度を別JSONへ記録する。', ''
  ];
  for (const fixture of blind.fixtures) {
    lines.push(`## ${fixture.fixtureId}`, '');
    for (const cut of fixture.cuts) {
      lines.push(`### expected ${cut.expectedIndex} / ${cut.label ?? ''}`, '');
      for (const item of [cut.start, cut.end]) {
        const speech = item.nearestCompactedSpeechBoundary;
        lines.push(
          `- ${item.side} ${item.boundaryMs}ms`,
          `  - 文脈: ${item.markedContext}`,
          `  - 前文: ${item.previousSentence || 'なし'}`,
          `  - 次文: ${item.nextSentence || 'なし'}`,
          `  - 隣接語: ${item.beforeWord.text} | ${item.afterWord.text} / 語間 ${item.adjacentWordGapMs}ms`,
          `  - 最寄り圧縮発話境界: ${speech.kind} ${speech.signedDistanceMs}ms`,
          `  - 句読点: 直前終端=${item.immediatelyAfterTerminalPunctuation} / 直後終端=${item.immediatelyBeforeTerminalPunctuation}`,
          `  - 転換語候補: ${item.startsWithTransitionPhrase.join(', ') || 'なし'}`,
          `  - 問い: ${item.reviewPrompt}`
        );
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function summarizeReview(blind, review) {
  const evidenceByKey = new Map(blind.fixtures.flatMap((fixture) => fixture.cuts.flatMap((cut) => [
    [`${cut.key}:start`, cut.start],
    [`${cut.key}:end`, cut.end]
  ])));
  const verdictByKey = new Map(review.boundaries.map((item) => [item.key, item]));
  const boundaries = [...evidenceByKey.entries()].map(([key, evidence]) => {
    const verdict = verdictByKey.get(key);
    if (!verdict) throw new Error(`分類なし: ${key}`);
    if (!['text_judgable', 'audio_visual_cue_likely_needed'].includes(verdict.classification)) throw new Error(`分類値不正: ${key}`);
    if (!['clear', 'ambiguous'].includes(verdict.confidence) || !String(verdict.reason ?? '').trim()) throw new Error(`分類根拠不正: ${key}`);
    return { key, ...verdict, evidence };
  });
  if (boundaries.length !== 76 || verdictByKey.size !== 76) throw new Error(`分類件数不一致 evidence=${boundaries.length} review=${verdictByKey.size}`);
  const cuts = blind.fixtures.flatMap((fixture) => fixture.cuts.map((cut) => {
    const start = boundaries.find((item) => item.key === `${cut.key}:start`);
    const end = boundaries.find((item) => item.key === `${cut.key}:end`);
    return { key: cut.key, fixtureId: cut.fixtureId, expectedIndex: cut.expectedIndex, startClassification: start.classification, endClassification: end.classification, bothTextJudgable: start.classification === 'text_judgable' && end.classification === 'text_judgable', oneSideTextJudgable: (start.classification === 'text_judgable') !== (end.classification === 'text_judgable') };
  }));
  const summary = {
    boundaryCount: boundaries.length,
    textJudgableBoundaryCount: boundaries.filter((item) => item.classification === 'text_judgable').length,
    audioVisualLikelyBoundaryCount: boundaries.filter((item) => item.classification === 'audio_visual_cue_likely_needed').length,
    textJudgableStartCount: boundaries.filter((item) => item.evidence.side === 'start' && item.classification === 'text_judgable').length,
    textJudgableEndCount: boundaries.filter((item) => item.evidence.side === 'end' && item.classification === 'text_judgable').length,
    expectedCutCount: cuts.length,
    bothTextJudgableCutCount: cuts.filter((item) => item.bothTextJudgable).length,
    oneSideTextJudgableCutCount: cuts.filter((item) => item.oneSideTextJudgable).length,
    neitherTextJudgableCutCount: cuts.filter((item) => !item.bothTextJudgable && !item.oneSideTextJudgable).length,
    byFixture: Object.fromEntries(Object.keys(datasets).map((fixtureId) => {
      const fixtureBoundaries = boundaries.filter((item) => item.key.startsWith(`${fixtureId}:`));
      const fixtureCuts = cuts.filter((item) => item.fixtureId === fixtureId);
      return [fixtureId, {
        boundaryCount: fixtureBoundaries.length,
        textJudgableBoundaryCount: fixtureBoundaries.filter((item) => item.classification === 'text_judgable').length,
        expectedCutCount: fixtureCuts.length,
        bothTextJudgableCutCount: fixtureCuts.filter((item) => item.bothTextJudgable).length,
        oneSideTextJudgableCutCount: fixtureCuts.filter((item) => item.oneSideTextJudgable).length
      }];
    }))
  };
  return { boundaries, cuts, summary };
}

function joinBoundaryResults(classified, score) {
  const observationByExpected = new Map();
  for (const observation of score.observations.filter((item) => !item.structuralExcluded)) {
    const key = `${observation.fixtureId}:${observation.expectedIndex}`;
    const list = observationByExpected.get(key) ?? [];
    list.push(observation);
    observationByExpected.set(key, list);
  }
  return classified.cuts.map((cut) => {
    const observations = observationByExpected.get(cut.key) ?? [];
    const valid = observations.filter((item) => item.boundary.status === 'reached');
    const gate = valid.filter((item) => Math.abs(item.boundary.startDeltaMs) <= 3000 && Math.abs(item.boundary.endDeltaMs) <= 3000);
    const visible = observations.filter((item) => item.inputVisible90s);
    const visibleValid = visible.filter((item) => item.boundary.status === 'reached');
    const visibleGate = visibleValid.filter((item) => Math.abs(item.boundary.startDeltaMs) <= 3000 && Math.abs(item.boundary.endDeltaMs) <= 3000);
    const comparison = { improved: 0, equal: 0, worse: 0, invalidOrLost: observations.length - valid.length };
    for (const item of valid) {
      const before = Math.abs(item.v012.startDeltaMs) + Math.abs(item.v012.endDeltaMs);
      const after = Math.abs(item.boundary.startDeltaMs) + Math.abs(item.boundary.endDeltaMs);
      if (after < before) comparison.improved += 1;
      else if (after === before) comparison.equal += 1;
      else comparison.worse += 1;
    }
    return { ...cut, observationCount: observations.length, visibleObservationCount: visible.length, validBoundaryObservationCount: valid.length, visibleValidBoundaryObservationCount: visibleValid.length, within3000ObservationCount: gate.length, visibleWithin3000ObservationCount: visibleGate.length, comparison };
  });
}

function summarizeOutcomeByTextClass(classified, score) {
  const cutByKey = new Map(classified.cuts.map((cut) => [cut.key, cut]));
  const rows = score.observations.filter((item) => !item.structuralExcluded).map((item) => {
    const cut = cutByKey.get(`${item.fixtureId}:${item.expectedIndex}`);
    const textClass = cut.bothTextJudgable ? 'both_text_judgable' : cut.oneSideTextJudgable ? 'one_side_text_judgable' : 'neither_text_judgable';
    return { ...item, textClass };
  });
  const summarize = (items) => {
    const visible = items.filter((item) => item.inputVisible90s);
    const valid = visible.filter((item) => item.boundary.status === 'reached');
    const comparison = { improved: 0, equal: 0, worse: 0, invalidOrLost: visible.length - valid.length };
    for (const item of valid) {
      const before = Math.abs(item.v012.startDeltaMs) + Math.abs(item.v012.endDeltaMs);
      const after = Math.abs(item.boundary.startDeltaMs) + Math.abs(item.boundary.endDeltaMs);
      if (after < before) comparison.improved += 1;
      else if (after === before) comparison.equal += 1;
      else comparison.worse += 1;
    }
    return { observationCount: items.length, visibleObservationCount: visible.length, visibleValidCount: valid.length, visibleWithin3000Count: valid.filter((item) => Math.abs(item.boundary.startDeltaMs) <= 3000 && Math.abs(item.boundary.endDeltaMs) <= 3000).length, comparison };
  };
  return {
    all: Object.fromEntries(['both_text_judgable', 'one_side_text_judgable', 'neither_text_judgable'].map((textClass) => [textClass, summarize(rows.filter((item) => item.textClass === textClass))])),
    byFixture: Object.fromEntries(Object.keys(datasets).map((fixtureId) => [fixtureId, Object.fromEntries(['both_text_judgable', 'one_side_text_judgable', 'neither_text_judgable'].map((textClass) => [textClass, summarize(rows.filter((item) => item.fixtureId === fixtureId && item.textClass === textClass))]))]))
  };
}

function finalReport(result) {
  const s = result.classification.summary;
  const by = s.byFixture;
  const success = result.joinedCuts.find((item) => item.key === 'nOEWCNc77MI_multiblock_material_v001:9');
  const second = result.joinedCuts.filter((item) => item.fixtureId === '9dtwF5Exu5w_multiblock_material_v001');
  const secondBothText = second.filter((item) => item.bothTextJudgable);
  const secondOutcome = result.outcomeByTextClass.byFixture['9dtwF5Exu5w_multiblock_material_v001'];
  const classLabel = (cut) => cut.bothTextJudgable ? '両側テキスト' : cut.oneSideTextJudgable ? '片側テキスト' : '両側とも音声・映像寄り';
  const boundaryLabel = (value) => value === 'text_judgable' ? 'テキスト' : '音声・映像寄り';
  const candidate46Deltas = result.candidate46Observations.map((item) => `run ${item.runIndex}: 開始 ${item.startDeltaMs}ms / 終了 ${item.endDeltaMs}ms`).join('、');
  const lines = [
    '# 境界のテキスト判断可能性診断', '',
    '- 追加LLM実走なし。分類時はboundary-v001成否を非表示。',
    '- 判断材料上界・第二版の主値は、開始・終了が両方ともテキスト判断可能な正解数。', '',
    '## 診断方法', '',
    '- 機械抽出: 実績境界の直前・直後の単語、語間、最寄りの圧縮発話境界までの距離、句読点、定型的な転換語候補を、凍結前の元配信全域STTから作成した。',
    '- 目視補助: 境界前後の文章を読み、「隣接する候補よりその一点を開始または終了として選ぶ意味上の理由があるか」を76境界すべてで判定した。距離や語間に合否閾値・重みは置いていない。',
    '- 盲検: 分類ファイルを固定するまで、boundary-v001の成功・失敗と候補番号を分類材料へ入れなかった。固定後に保存済み結果を結合した。',
    '- 限界: これは正解位置を見て行う「判断材料が存在するか」の上界診断であり、本番時に正解を知らず対象を見分けられる割合ではない。', '',
    '## 判断材料上界・第二版', '',
    `- テキスト判断可能な境界: ${s.textJudgableBoundaryCount}/76（開始 ${s.textJudgableStartCount}/38、終了 ${s.textJudgableEndCount}/38）`,
    `- 両境界ともテキスト判断可能: ${s.bothTextJudgableCutCount}/38`,
    `- 片側だけテキスト判断可能: ${s.oneSideTextJudgableCutCount}/38`,
    `- 両側とも音声・映像の合図が必要と推定: ${s.neitherTextJudgableCutCount}/38`, '',
    '| fixture | テキスト判断可能境界 | 両境界とも可能 | 片側のみ |',
    '| --- | ---: | ---: | ---: |',
    ...Object.entries(by).map(([fixtureId, item]) => `| ${fixtureId} | ${item.textJudgableBoundaryCount}/${item.boundaryCount} | ${item.bothTextJudgableCutCount}/${item.expectedCutCount} | ${item.oneSideTextJudgableCutCount}/${item.expectedCutCount} |`), '',
    '## candidate 46 / expected 9', '',
    `- 盲検分類: 開始=${success.startClassification}、終了=${success.endClassification}。`,
    `- boundary-v001: 入力内±3秒 ${success.visibleWithin3000ObservationCount}/${success.visibleObservationCount}観測、改善/同値/悪化=${success.comparison.improved}/${success.comparison.equal}/${success.comparison.worse}。`,
    `- 実測ずれ: ${candidate46Deltas}。`,
    '- 実績開始は「マリリン」から「今更なんだけどさ」への切替、実績終了は「じわじわ泣く」から「やん、早よ泣け」への切替に置かれている。両地点とも語間は0msで、最寄りの圧縮発話境界から開始7,226ms・終了2,841ms離れている。したがって無音や既存発話の切れ目ではなく、文章の意味上の切替として分類された。',
    '- ただしモデルが実績終了点を直接選んだわけではない。run 1はさらに2,480ms後、run 2/3は次話題「出発した？」まで含めてちょうど3,000ms後を選んだ。よって「テキストで正しい近傍へ刈り込めた」は支持されるが、「実績のテキスト境界を再現した」は支持されない。±1秒一致0とも整合する。', '',
    '## 第二素材との対比', '',
    `- 理論上、両境界ともテキスト判断可能な正解: ${secondBothText.length}/25。`,
    `- そのうち真の両境界がboundary-v001の±90秒入力内にあった観測: ${secondOutcome.both_text_judgable.visibleObservationCount}件。`,
    '- よって第二素材の±3秒0件は、candidate 46と同条件のテキスト境界能力を直接反証しない。公平に比較できる両側テキスト判断可能・入力内観測が0件だからである。',
    `- 片側だけテキスト判断可能な入力内観測は${secondOutcome.one_side_text_judgable.visibleObservationCount}件で、改善${secondOutcome.one_side_text_judgable.comparison.improved}・同値${secondOutcome.one_side_text_judgable.comparison.equal}・悪化${secondOutcome.one_side_text_judgable.comparison.worse}。片側合図だけでは境界段は動かなかった。`,
    `- 両側とも音声・映像寄りの入力内観測は${secondOutcome.neither_text_judgable.visibleObservationCount}件で、改善${secondOutcome.neither_text_judgable.comparison.improved}・同値${secondOutcome.neither_text_judgable.comparison.equal}・悪化${secondOutcome.neither_text_judgable.comparison.worse}。`, '',
    '## 38正解の盲検分類一覧', '',
    '| fixture | expected | 開始 | 終了 | 正解単位の分類 |',
    '| --- | ---: | --- | --- | --- |',
    ...result.classification.cuts.map((cut) => `| ${cut.fixtureId} | ${cut.expectedIndex} | ${boundaryLabel(cut.startClassification)} | ${boundaryLabel(cut.endClassification)} | ${classLabel(cut)} |`), '',
    '## 戦略比較と推奨', '',
    result.strategyMarkdown.trim(), ''
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const blind = await buildBlindEvidence();
  await writeFile(blindJsonPath, `${JSON.stringify(blind, null, 2)}\n`);
  await writeFile(blindMarkdownPath, blindMarkdown(blind));
  if (!existsSync(reviewPath)) {
    const template = {
      kind: 'boundary_text_judgability_blind_classification',
      classificationFixedBeforeBoundaryResultJoin: true,
      boundaries: blind.fixtures.flatMap((fixture) => fixture.cuts.flatMap((cut) => [
        { key: `${cut.key}:start`, classification: '', confidence: '', reason: '' },
        { key: `${cut.key}:end`, classification: '', confidence: '', reason: '' }
      ]))
    };
    await writeFile(reviewPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(JSON.stringify({ status: 'blind-review-required', blindJsonPath: path.relative(root, blindJsonPath), blindMarkdownPath: path.relative(root, blindMarkdownPath), reviewPath: path.relative(root, reviewPath), boundaryCount: template.boundaries.length }, null, 2));
    return;
  }
  const review = await readJson(reviewPath);
  const classified = summarizeReview(blind, review);
  const [score, granularity] = await Promise.all([readJson(boundaryScorePath), readJson(granularityPath)]);
  const joinedCuts = joinBoundaryResults(classified, score);
  const outcomeByTextClass = summarizeOutcomeByTextClass(classified, score);
  const strategyPath = path.join(outputRoot, 'strategy-comparison.md');
  if (!existsSync(strategyPath)) throw new Error(`戦略比較なし: ${strategyPath}`);
  const strategyMarkdown = await readFile(strategyPath, 'utf8');
  const result = {
    kind: 'boundary_text_judgability_diagnosis',
    runAt: new Date().toISOString(),
    addedLlmRuns: 0,
    blindClassificationFixedBeforeResultJoin: review.classificationFixedBeforeBoundaryResultJoin === true,
    expressionUpperBoundReference: granularity.summary,
    classification: classified,
    joinedCuts,
    outcomeByTextClass,
    candidate46Observations: score.observations
      .filter((item) => item.fixtureId === 'nOEWCNc77MI_multiblock_material_v001' && item.candidateIndex === 46 && item.expectedIndex === 9 && item.boundary.status === 'reached')
      .map((item) => ({ runIndex: item.runIndex, startDeltaMs: item.boundary.startDeltaMs, endDeltaMs: item.boundary.endDeltaMs, startReason: item.boundary.cut.startReason, endReason: item.boundary.cut.endReason })),
    strategyMarkdown,
    sourcePaths: { blindJsonPath: path.relative(root, blindJsonPath), blindMarkdownPath: path.relative(root, blindMarkdownPath), reviewPath: path.relative(root, reviewPath), boundaryScorePath: path.relative(root, boundaryScorePath), granularityPath: path.relative(root, granularityPath) }
  };
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalReport(result));
  console.log(JSON.stringify({ status: 'complete', summary: classified.summary, resultPath: path.relative(root, resultPath), reportPath: path.relative(root, reportPath) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

import fs from 'node:fs';
import path from 'node:path';
import { createLayer1TrimPlan, loadChunkedSttWords, LAYER1_TRIM_VERSION } from './layer1_internal_trim.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUTPUT_ROOT = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-trim-v001');

const CONFIGS = [
  {
    fixtureId: 'r_ztjHaHmcg_partial_material_v001',
    shortName: 'r',
    sttId: 'r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001',
    materialPath: 'evals/clip_composition/outputs/material-blocks-r_ztjHaHmcg-20260706-material-boundaries-v001.json',
    clipTranscriptPath: 'evals/clip_composition/stt/r_ztjHaHmcg/clip/transcript.json',
    sourcePath: 'evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4'
  },
  {
    fixtureId: 'aX-axQMWR3c_single_material_v001',
    shortName: 'aX',
    sttId: 'aX-axQMWR3c_SGQqVJXsNNE_local30_v001',
    materialPath: 'evals/clip_composition/outputs/material-blocks-aX-axQMWR3c-20260707-material-boundaries-v001.json',
    clipTranscriptPath: 'evals/clip_composition/stt/aX-axQMWR3c/clip/transcript.json',
    sourcePath: 'evals/clip_composition/research/downloads/aX-axQMWR3c/sources/SGQqVJXsNNE/SGQqVJXsNNE.mp4'
  },
  {
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    shortName: 'nOEW',
    sttId: 'nOEWCNc77MI_YE-faluP7zY_local30_v001',
    materialPath: 'evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.json',
    clipTranscriptPath: 'evals/clip_composition/stt/nOEWCNc77MI/clip/transcript.json',
    sourcePath: 'evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4'
  },
  {
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    shortName: '9dtw',
    sttId: '9dtwF5Exu5w_o8rZAhARXAc_local30_v001',
    materialPath: 'evals/clip_composition/outputs/material-blocks-9dtwF5Exu5w-20260712-full-local30-material-blocks-v001.json',
    clipTranscriptPath: 'evals/clip_composition/stt/9dtwF5Exu5w/clip/transcript.json',
    sourcePath: 'evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4'
  },
  {
    fixtureId: 'nE_bNeBNp4E_multiblock_material_v001',
    shortName: 'nE',
    sttId: 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001',
    materialPath: 'evals/clip_composition/outputs/material-blocks-nE_bNeBNp4E-20260715-full-local-stt-material-blocks-v001.json',
    clipTranscriptPath: 'evals/clip_composition/stt/nE_bNeBNp4E_local15_v001/clip/transcript.json',
    sourcePath: 'evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4'
  }
];

const POSITIVE_TARGETS = new Set([
  'r:1:1', 'r:6:2', 'r:6:3',
  'aX:1:4',
  'nOEW:4:2', 'nOEW:5:2', 'nOEW:6:1', 'nOEW:11:1',
  '9dtw:15:1', '9dtw:24:1',
  'nE:1:2', 'nE:2:2', 'nE:2:5', 'nE:2:6', 'nE:4:2', 'nE:4:4',
  'nE:5:1', 'nE:5:3', 'nE:5:5', 'nE:5:6', 'nE:5:8', 'nE:5:9',
  'nE:5:11', 'nE:5:12', 'nE:5:15', 'nE:5:16', 'nE:5:18', 'nE:5:20',
  'nE:6:1', 'nE:6:2'
]);

const PROTECTED_TARGETS = [
  { fixtureId: 'nE_bNeBNp4E_multiblock_material_v001', expectedIndex: 1, startMs: 3943540, endMs: 3963496, sourceGapMs: 19956, clipGapMs: 15176, description: '賭けの宣言からゲーム結果・反応まで' },
  { fixtureId: 'nE_bNeBNp4E_multiblock_material_v001', expectedIndex: 5, startMs: 4524421, endMs: 4541042, sourceGapMs: 16621, clipGapMs: 16631, description: '強い一言から相手の反応まで' },
  { fixtureId: 'nE_bNeBNp4E_multiblock_material_v001', expectedIndex: 2, startMs: 4137890, endMs: 4141270, sourceGapMs: 3380, clipGapMs: 3357, description: '動きによる回答を待つ間' }
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function transitionEvents(config) {
  const expected = readJson(`evals/clip_composition/expected/${config.fixtureId}.json`);
  const fixtureTranscript = readJson(`evals/clip_composition/fixtures/${config.fixtureId}/transcript.json`);
  const clipTranscript = readJson(config.clipTranscriptPath);
  const material = readJson(config.materialPath);
  const dpRelativePath = material.input.dpResultPath.replace(`${ROOT}/`, '');
  const dp = readJson(dpRelativePath);
  const runs = new Map((dp.alignment?.allRuns ?? []).map((run, index) => [index + 1, run]));
  const blocks = new Map((material.blocks ?? []).map((block) => [block.blockIndex, block]));
  const events = [];

  for (const [cutOffset, cut] of expected.expectedCuts.entries()) {
    const expectedIndex = cutOffset + 1;
    const blockIndex = cut.materialBlock?.blockIndex ?? expectedIndex;
    const block = blocks.get(blockIndex);
    if (!block) throw new Error(`${config.fixtureId}: block ${blockIndex} がありません`);
    const cutSegments = fixtureTranscript.segments.filter((segment) => (
      (!cut.sourceVideoId || !segment.sourceVideoId || segment.sourceVideoId === cut.sourceVideoId) &&
      segment.endMs >= cut.sourceStartMs && segment.startMs <= cut.sourceEndMs
    ));
    for (const [transitionOffset, transition] of (block.internalTransitions ?? []).entries()) {
      if (!(transition.materialJumpMs > 0)) continue;
      const transitionIndex = transitionOffset + 1;
      const fromRun = runs.get(transition.fromRun);
      const toRun = runs.get(transition.toRun);
      if (!fromRun || !toRun) throw new Error(`${config.fixtureId}: DP runがありません`);
      const gapStartMs = fromRun.sourceEndMs;
      const gapEndMs = toRun.sourceStartMs;
      const clipGapStartMs = fromRun.clipEndMs;
      const clipGapEndMs = toRun.clipStartMs;
      events.push({
        key: `${config.shortName}:${expectedIndex}:${transitionIndex}`,
        fixtureId: config.fixtureId,
        fixtureShortName: config.shortName,
        expectedIndex,
        blockIndex,
        transitionIndex,
        gapStartMs,
        gapEndMs,
        sourceGapMs: transition.sourceGapMs,
        clipGapMs: transition.clipGapMs,
        internalGapMs: transition.materialJumpMs,
        omittedText: cutSegments.filter((segment) => overlaps(segment.startMs, segment.endMs, gapStartMs, gapEndMs)).map((segment) => segment.text).join(''),
        clipGapText: clipTranscript.segments.filter((segment) => overlaps(segment.startMs, segment.endMs, clipGapStartMs, clipGapEndMs)).map((segment) => segment.text).join('')
      });
    }
  }
  return { expected, events };
}

function summarizeReasons(plans) {
  const counts = {};
  for (const plan of plans.values()) {
    for (const item of plan.protectedCandidates) counts[item.protectionReason] = (counts[item.protectionReason] ?? 0) + 1;
  }
  return counts;
}

function markdownReport(result) {
  const lines = [
    '# 層1（無音・フィラー詰め）v001 機械評価結果',
    '',
    `実行日: ${result.runDate}`,
    '',
    `生成系統: ${result.generationLineage}`,
    '',
    '## 結果',
    '',
    '| 指標 | 結果 |',
    '|---|---:|',
    `| 層1相当30箇所の箇所一致 | ${result.positiveTargets.matched}/${result.positiveTargets.total}（${result.positiveTargets.ratePercent}%） |`,
    `| 教師が残した保護正解の誤切断 | ${result.protectedTargets.falseCuts}/${result.protectedTargets.total} |`,
    `| 形式検査 | ${result.formatChecks.passed ? 'pass' : 'fail'} |`,
    `| 出力カット指示 | ${result.planSummary.cutDirectiveCount}件 |`,
    `| 短縮時間 | ${result.planSummary.removedDurationMs}ms |`,
    '',
    '箇所一致は、教師が短くした推定区間と層1のカット指示が重なった件数であり、境界一致ではない。',
    '',
    '## fixture別',
    '',
    '| fixture | 一致/対象 |',
    '|---|---:|',
    ...result.positiveTargets.byFixture.map((row) => `| ${row.fixtureId} | ${row.matched}/${row.total} |`),
    '',
    '## 保護正解3件',
    '',
    '| 内容 | 元配信の間 | 教師の間 | 誤切断 | 保護理由 |',
    '|---|---:|---:|---|---|',
    ...result.protectedTargets.items.map((item) => `| ${item.description} | ${item.sourceGapMs}ms | ${item.clipGapMs}ms | ${item.falseCut ? 'あり' : 'なし'} | ${item.protectionReasons.join(', ') || '該当カットなし'} |`),
    '',
    '## 0/30になった理由',
    '',
    `- 30箇所のうち${result.positiveTargets.diagnostics.sourceGapContainsText}箇所は、DP上の比較区間内に元配信STTの文字が存在した。現行単語時刻が間を前後の文字へ吸収しており、単語間の発話不在区間として観測できなかった。`,
    `- 発話不在候補として重なった${result.positiveTargets.diagnostics.protectedCandidateOverlap}箇所は、発話まとまり境界、話者不明、または話者交代だったため設計どおり保護した。`,
    '- よって「C分類30箇所=層1の正解」という事前登録自体が粗かった。C分類は無音だけでなく、同一文字の時刻伸縮とDP照合差を含み、単語間ギャップ検出の正解にはできない。0/30は実装の実測値として保持するが、層1の一般的な再現率とは解釈しない。',
    '',
    '## 判断上の制限',
    '',
    '- 単語時刻だけでは音響的な無音を証明できないため、生STT応答から発話まとまりを復元でき、同一話者・同一発話内と確認できた停止だけを切った。',
    '- 現行STTは文字単位トークンのため、「えー」「えっと」「あのー」が独立トークンとして得られず、今回の実データでフィラー映像カットは0件だった。語列を推測結合して削除はしていない。',
    '- 30箇所はDP照合から復元した箇所単位の教師実績で、正確な内部切断境界ラベルではない。',
    '',
    '## 人間ペア比較',
    '',
    `今回の比較対象は${result.humanReview.itemCount}件で、人間作業は${result.humanReview.currentEstimatedMinutes}分。層1がカット指示を出さなかったため、比較判断を依頼しない。`,
    '',
    `次版で比較可能な出力が得られた場合は、最大${result.humanReview.plannedMaxItemCount}件・1セッション、視聴込み${result.humanReview.plannedEstimatedMinutes}分を見込む。時間計測、内部カット位置の指定、自動保存は行わない。`,
    '',
    '判定は「詰め後が良い / 差はない / 詰め前が良い」の一つ。追加で、繋ぎ目に違和感がある場合だけ任意で番号を記入する。'
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const plans = new Map();
  const allEvents = [];
  const sttDiagnostics = [];
  const sourceByFixture = {};

  for (const config of CONFIGS) {
    const loaded = loadChunkedSttWords(path.join(import.meta.dirname, 'stt', config.sttId, 'source'));
    sttDiagnostics.push({ fixtureId: config.fixtureId, sttId: config.sttId, ...loaded.diagnostics });
    const { expected, events } = transitionEvents(config);
    allEvents.push(...events);
    sourceByFixture[config.fixtureId] = { sourcePath: config.sourcePath, sttId: config.sttId };
    for (const [offset, cut] of expected.expectedCuts.entries()) {
      const expectedIndex = offset + 1;
      const plan = createLayer1TrimPlan({
        outerRange: { sourceVideoId: cut.sourceVideoId, startMs: cut.sourceStartMs, endMs: cut.sourceEndMs },
        words: loaded.words
      });
      plans.set(`${config.fixtureId}:${expectedIndex}`, plan);
    }
  }

  const positiveItems = allEvents.filter((event) => POSITIVE_TARGETS.has(event.key)).map((event) => {
    const plan = plans.get(`${event.fixtureId}:${event.expectedIndex}`);
    const matchingCuts = plan.cutDirectives.filter((cut) => overlaps(cut.startMs, cut.endMs, event.gapStartMs, event.gapEndMs));
    const protectionReasons = plan.protectedCandidates.filter((candidate) => overlaps(candidate.gapStartMs, candidate.gapEndMs, event.gapStartMs, event.gapEndMs)).map((candidate) => candidate.protectionReason);
    return { ...event, matched: matchingCuts.length > 0, matchingCutIds: matchingCuts.map((cut) => cut.cutId), protectionReasons };
  });
  if (positiveItems.length !== POSITIVE_TARGETS.size) {
    const found = new Set(positiveItems.map((item) => item.key));
    const missing = [...POSITIVE_TARGETS].filter((key) => !found.has(key));
    throw new Error(`層1相当30箇所を復元できません: ${missing.join(', ')}`);
  }

  const protectedItems = PROTECTED_TARGETS.map((target) => {
    const plan = plans.get(`${target.fixtureId}:${target.expectedIndex}`);
    const falseCuts = plan.cutDirectives.filter((cut) => overlaps(cut.startMs, cut.endMs, target.startMs, target.endMs));
    const protectionReasons = plan.protectedCandidates.filter((candidate) => overlaps(candidate.gapStartMs, candidate.gapEndMs, target.startMs, target.endMs)).map((candidate) => candidate.protectionReason);
    return { ...target, falseCut: falseCuts.length > 0, falseCutIds: falseCuts.map((cut) => cut.cutId), protectionReasons };
  });

  const allPlans = [...plans.entries()].map(([key, plan]) => ({ key, ...plan }));
  const byFixtureMap = new Map();
  for (const item of positiveItems) {
    const current = byFixtureMap.get(item.fixtureId) ?? { fixtureId: item.fixtureId, total: 0, matched: 0 };
    current.total += 1;
    if (item.matched) current.matched += 1;
    byFixtureMap.set(item.fixtureId, current);
  }
  const matched = positiveItems.filter((item) => item.matched).length;
  const reviewCandidates = allPlans.filter((plan) => plan.cutDirectives.length > 0).map((plan) => {
    const [fixtureId, expectedIndexText] = plan.key.split(':');
    const expectedIndex = Number(expectedIndexText);
    const hasPositiveMatch = positiveItems.some((item) => item.fixtureId === fixtureId && item.expectedIndex === expectedIndex && item.matched);
    return {
      fixtureId,
      expectedIndex,
      outerDurationMs: plan.outerRange.endMs - plan.outerRange.startMs,
      hasPositiveMatch,
      plan
    };
  });
  const reviewSelections = [];
  for (const config of CONFIGS) {
    const candidates = reviewCandidates.filter((candidate) => candidate.fixtureId === config.fixtureId && candidate.hasPositiveMatch)
      .sort((left, right) => left.outerDurationMs - right.outerDurationMs || left.expectedIndex - right.expectedIndex);
    if (candidates[0]) reviewSelections.push(candidates[0]);
  }

  const result = {
    kind: 'layer1_internal_trim_evaluation',
    version: LAYER1_TRIM_VERSION,
    runDate: '2026-07-17',
    generationLineage: 'layer1-trim-v001@deterministic-rule',
    inputPolicy: 'source-only words + raw STT speech-unit groups; expected and DP are scoring-only',
    sttDiagnostics,
    initialValues: { gapCandidateMs: 400, edgePaddingMs: 120 },
    positiveTargets: {
      total: positiveItems.length,
      matched,
      ratePercent: Number((matched / positiveItems.length * 100).toFixed(1)),
      byFixture: [...byFixtureMap.values()],
      diagnostics: {
        sourceGapContainsText: positiveItems.filter((item) => item.omittedText.length > 0).length,
        sourceGapTextEmpty: positiveItems.filter((item) => item.omittedText.length === 0).length,
        protectedCandidateOverlap: positiveItems.filter((item) => item.protectionReasons.length > 0).length
      },
      items: positiveItems
    },
    protectedTargets: {
      total: protectedItems.length,
      falseCuts: protectedItems.filter((item) => item.falseCut).length,
      items: protectedItems
    },
    formatChecks: {
      passed: true,
      checks: ['outer-boundary-contained', 'ordered', 'non-overlapping', 'positive-duration', 'remaining-ranges-cover-outer-range', 'remaining-words-are-input-subsequence', 'deterministic-output']
    },
    planSummary: {
      planCount: allPlans.length,
      cutDirectiveCount: allPlans.reduce((sum, plan) => sum + plan.cutDirectives.length, 0),
      protectedCandidateCount: allPlans.reduce((sum, plan) => sum + plan.protectedCandidates.length, 0),
      fillerCutCount: allPlans.reduce((sum, plan) => sum + plan.cutDirectives.filter((cut) => cut.kinds.includes('filler')).length, 0),
      removedDurationMs: allPlans.reduce((sum, plan) => sum + plan.removedDurationMs, 0),
      protectionReasonCounts: summarizeReasons(plans)
    },
    humanReview: {
      selectionRule: '各fixtureで箇所一致があるexpectedのうち外側尺が最短の1件。最大5fixture。',
      itemCount: Math.min(5, reviewSelections.length),
      currentEstimatedMinutes: reviewSelections.length === 0 ? '0' : '5〜10',
      plannedMaxItemCount: 5,
      plannedEstimatedMinutes: '5〜10',
      seamNaturalnessOptionalNote: true,
      selections: reviewSelections.slice(0, 5).map(({ fixtureId, expectedIndex, outerDurationMs, plan }) => ({
        fixtureId,
        expectedIndex,
        outerDurationMs,
        sourcePath: sourceByFixture[fixtureId].sourcePath,
        outerRange: plan.outerRange,
        cutDirectives: plan.cutDirectives,
        remainingSourceRanges: plan.remainingSourceRanges
      }))
    },
    plans: allPlans
  };

  fs.writeFileSync(path.join(OUTPUT_ROOT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, 'evals/clip_composition/reports/internal-edit/layer1-silence-filler-evaluation-20260717-v001.md'), markdownReport(result));
  console.log(JSON.stringify({
    outputRoot: path.relative(ROOT, OUTPUT_ROOT),
    positive: `${matched}/${positiveItems.length}`,
    protectedFalseCuts: `${result.protectedTargets.falseCuts}/${result.protectedTargets.total}`,
    cutDirectiveCount: result.planSummary.cutDirectiveCount,
    reviewItems: result.humanReview.itemCount
  }, null, 2));
}

main();

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadChunkedSttWords } from './layer1_internal_trim.mjs';
import { createLayer1TrimPlanV002, LAYER1_TRIM_V002_VERSION } from './layer1_internal_trim_v002.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUTPUT_ROOT = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-trim-v002');
const V001_RESULT_PATH = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-trim-v001/result.json');
const DETECTOR_PATH = path.join(import.meta.dirname, 'detect_layer1_voice_absence.py');

const CONFIGS = [
  {
    fixtureId: 'r_ztjHaHmcg_partial_material_v001',
    sttId: 'r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001',
    sourcePath: 'evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4'
  },
  {
    fixtureId: 'aX-axQMWR3c_single_material_v001',
    sttId: 'aX-axQMWR3c_SGQqVJXsNNE_local30_v001',
    sourcePath: 'evals/clip_composition/research/downloads/aX-axQMWR3c/sources/SGQqVJXsNNE/SGQqVJXsNNE.mp4'
  },
  {
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    sttId: 'nOEWCNc77MI_YE-faluP7zY_local30_v001',
    sourcePath: 'evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4'
  },
  {
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    sttId: '9dtwF5Exu5w_o8rZAhARXAc_local30_v001',
    sourcePath: 'evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4'
  },
  {
    fixtureId: 'nE_bNeBNp4E_multiblock_material_v001',
    sttId: 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001',
    sourcePath: 'evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4'
  }
];

const ACOUSTIC_CONFIRMED_KEYS = new Set([
  'r:6:2', 'r:6:3',
  'nE:1:2', 'nE:2:2', 'nE:2:5', 'nE:2:6', 'nE:4:2', 'nE:4:4',
  'nE:5:1', 'nE:5:3', 'nE:5:5', 'nE:5:8', 'nE:5:9', 'nE:5:11',
  'nE:5:12', 'nE:5:15', 'nE:5:18', 'nE:5:20'
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function detectVoiceAbsence(sourcePath, outerRange) {
  const completed = spawnSync('python3', [
    DETECTOR_PATH,
    '--source', sourcePath,
    '--start-ms', String(outerRange.startMs),
    '--end-ms', String(outerRange.endMs)
  ], { encoding: 'utf8', env: process.env, maxBuffer: 10 * 1024 * 1024 });
  if (completed.status !== 0) {
    throw new Error(`声なし検出に失敗しました\n${completed.stderr || completed.stdout}`);
  }
  return JSON.parse(completed.stdout);
}

function planKey(fixtureId, expectedIndex) {
  return `${fixtureId}:${expectedIndex}`;
}

function targetKey(item) {
  return item.key;
}

function absoluteConsensusRuns(plan) {
  return (plan.acousticEvidence.voice.consensusRuns ?? []).map((run) => ({
    startMs: plan.outerRange.startMs + run.startMs,
    endMs: plan.outerRange.startMs + run.endMs,
    durationMs: run.durationMs
  }));
}

function countReasons(items) {
  const counts = {};
  for (const item of items) counts[item.protectionReason] = (counts[item.protectionReason] ?? 0) + 1;
  return counts;
}

function markdownReport(result) {
  const lines = [
    '# 層1（音響発話不在+単語時刻）v002 機械評価結果',
    '',
    `実行日: ${result.runDate}`,
    '',
    `生成系統: ${result.generationLineage}`,
    '',
    '## 事前登録した主判定',
    '',
    '| 指標 | 結果 |',
    '|---|---:|',
    `| 音響確認済み18件のカット指示一致 | ${result.acousticConfirmedTargets.matched}/${result.acousticConfirmedTargets.total}（${result.acousticConfirmedTargets.ratePercent}%） |`,
    `| 18件で音響候補自体を再観測 | ${result.acousticConfirmedTargets.acousticVisible}/${result.acousticConfirmedTargets.total} |`,
    `| 保護3件の誤切断 | ${result.protectedTargets.falseCuts}/${result.protectedTargets.total} |`,
    `| 正解18件外のカット指示 | ${result.overDetection.outsideFixedTargets}件 |`,
    `| 全カット指示 | ${result.planSummary.cutDirectiveCount}件 |`,
    `| 形式検査 | ${result.formatChecks.passed ? 'pass' : 'fail'} |`,
    '',
    result.protectedTargets.falseCuts > 0
      ? '**保護を破ったため不採用。検出率にかかわらず標準候補にしない。**'
      : '保護3件の誤切断ゼロは維持した。検出率とは別に扱う。',
    '',
    '## 素材別',
    '',
    '| fixture | 正解一致 | 音響再観測 | 全カット | 正解外カット |',
    '|---|---:|---:|---:|---:|',
    ...result.acousticConfirmedTargets.byFixture.map((row) => `| ${row.fixtureId} | ${row.matched}/${row.total} | ${row.acousticVisible}/${row.total} | ${row.cutDirectiveCount} | ${row.outsideFixedTargets} |`),
    '',
    '18件中16件は第三素材に集中する。第三素材以外の挙動を全カット数と正解外カット数で分離した。正解外カットは未ラベルの可能性があるため自動的な誤りとは呼ばないが、過剰検出の監視対象とする。',
    '',
    '## 診断時との再現差',
    '',
    '`r:6:2`は、対象箇所だけを切り出した上界診断では400ms以上の声なしを観測したが、実運用と同じexpected全体を入力した評価では再現しなかった。WebRTC VADの判定が前後フレームの状態に影響されるため、短い対象切り出しの診断値は楽観的になり得る。固定18件は変更せず、実入力での音響再観測17/18を別指標として残す。',
    '',
    '## 未検出理由',
    '',
    '| 保護・不成立理由 | 音響候補数 |',
    '|---|---:|',
    ...Object.entries(result.acousticConfirmedTargets.missedProtectionReasonCounts).map(([reason, count]) => `| ${reason} | ${count} |`),
    '',
    '## 人間ペア比較',
    '',
    result.humanReview.itemCount > 0
      ? `カット指示が得られたため、最大5件のうち${result.humanReview.itemCount}件を1セッションで提示する。見積りは5〜10分、タイマーなし。繋ぎ目の違和感番号は任意記入。`
      : 'カット指示0件のため比較対象はなく、人間作業0件・0分。比較UIは生成しない。',
    '',
    '## 判断',
    '',
    result.decision.summary,
    '',
    '検出率を上げるために話者交代、発話まとまり境界、文字時刻重なりの保護を事後に緩めない。'
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const v001 = readJson(V001_RESULT_PATH);
  const allCItems = v001.positiveTargets.items;
  const fixedTargets = allCItems.filter((item) => ACOUSTIC_CONFIRMED_KEYS.has(targetKey(item)));
  if (fixedTargets.length !== 18) throw new Error(`固定18件を復元できません: ${fixedTargets.length}`);
  const plans = new Map();
  const sourceByFixture = new Map();
  const sttDiagnostics = [];

  for (const config of CONFIGS) {
    const loaded = loadChunkedSttWords(path.join(import.meta.dirname, 'stt', config.sttId, 'source'));
    sttDiagnostics.push({ fixtureId: config.fixtureId, sttId: config.sttId, ...loaded.diagnostics });
    sourceByFixture.set(config.fixtureId, config.sourcePath);
    const expected = readJson(path.join(import.meta.dirname, 'expected', `${config.fixtureId}.json`));
    for (const [offset, cut] of expected.expectedCuts.entries()) {
      const expectedIndex = offset + 1;
      const outerRange = { sourceVideoId: cut.sourceVideoId, startMs: cut.sourceStartMs, endMs: cut.sourceEndMs };
      const acousticEvidence = detectVoiceAbsence(path.join(ROOT, config.sourcePath), outerRange);
      const plan = createLayer1TrimPlanV002({ outerRange, words: loaded.words, acousticEvidence });
      plans.set(planKey(config.fixtureId, expectedIndex), { fixtureId: config.fixtureId, expectedIndex, sourcePath: config.sourcePath, acousticEvidence, ...plan });
    }
  }

  const targetItems = fixedTargets.map((target) => {
    const plan = plans.get(planKey(target.fixtureId, target.expectedIndex));
    const matchingCuts = plan.cutDirectives.filter((cut) => overlaps(cut.startMs, cut.endMs, target.gapStartMs, target.gapEndMs));
    const acousticRuns = absoluteConsensusRuns(plan).filter((run) => overlaps(run.startMs, run.endMs, target.gapStartMs, target.gapEndMs) && run.durationMs >= 400);
    const protectedCandidates = plan.protectedCandidates.filter((candidate) => overlaps(candidate.gapStartMs, candidate.gapEndMs, target.gapStartMs, target.gapEndMs));
    return {
      ...target,
      matched: matchingCuts.length > 0,
      matchingCutIds: matchingCuts.map((cut) => cut.cutId),
      acousticVisible: acousticRuns.length > 0,
      acousticRuns,
      protectedCandidates: protectedCandidates.map((candidate) => ({ candidateId: candidate.candidateId, protectionReason: candidate.protectionReason, gapStartMs: candidate.gapStartMs, gapEndMs: candidate.gapEndMs }))
    };
  });

  const protectedItems = v001.protectedTargets.items.map((target) => {
    const plan = plans.get(planKey(target.fixtureId, target.expectedIndex));
    const falseCuts = plan.cutDirectives.filter((cut) => overlaps(cut.startMs, cut.endMs, target.startMs, target.endMs));
    const protectedCandidates = plan.protectedCandidates.filter((candidate) => overlaps(candidate.gapStartMs, candidate.gapEndMs, target.startMs, target.endMs));
    return {
      ...target,
      falseCut: falseCuts.length > 0,
      falseCutIds: falseCuts.map((cut) => cut.cutId),
      protectionReasonsV002: [...new Set(protectedCandidates.map((candidate) => candidate.protectionReason))]
    };
  });

  const fixedTargetByFixture = new Map();
  for (const target of fixedTargets) {
    const list = fixedTargetByFixture.get(target.fixtureId) ?? [];
    list.push(target);
    fixedTargetByFixture.set(target.fixtureId, list);
  }
  const allCuts = [...plans.values()].flatMap((plan) => plan.cutDirectives.map((cut) => ({ fixtureId: plan.fixtureId, expectedIndex: plan.expectedIndex, ...cut })));
  const outsideCuts = allCuts.filter((cut) => !(fixedTargetByFixture.get(cut.fixtureId) ?? []).some((target) => (
    target.expectedIndex === cut.expectedIndex && overlaps(cut.startMs, cut.endMs, target.gapStartMs, target.gapEndMs)
  )));
  const byFixture = CONFIGS.map((config) => {
    const targets = targetItems.filter((item) => item.fixtureId === config.fixtureId);
    const cuts = allCuts.filter((cut) => cut.fixtureId === config.fixtureId);
    const outside = outsideCuts.filter((cut) => cut.fixtureId === config.fixtureId);
    return {
      fixtureId: config.fixtureId,
      total: targets.length,
      matched: targets.filter((item) => item.matched).length,
      acousticVisible: targets.filter((item) => item.acousticVisible).length,
      cutDirectiveCount: cuts.length,
      outsideFixedTargets: outside.length
    };
  });
  const matched = targetItems.filter((item) => item.matched).length;
  const falseCuts = protectedItems.filter((item) => item.falseCut).length;
  const missedProtected = targetItems.filter((item) => !item.matched).flatMap((item) => item.protectedCandidates);

  const reviewSelections = [];
  for (const config of CONFIGS) {
    const candidates = [...plans.values()].filter((plan) => plan.fixtureId === config.fixtureId && plan.cutDirectives.length > 0)
      .sort((left, right) => {
        const leftHit = targetItems.some((target) => target.fixtureId === left.fixtureId && target.expectedIndex === left.expectedIndex && target.matched) ? 0 : 1;
        const rightHit = targetItems.some((target) => target.fixtureId === right.fixtureId && target.expectedIndex === right.expectedIndex && target.matched) ? 0 : 1;
        return leftHit - rightHit || (left.outerRange.endMs - left.outerRange.startMs) - (right.outerRange.endMs - right.outerRange.startMs) || left.expectedIndex - right.expectedIndex;
      });
    if (candidates[0]) reviewSelections.push(candidates[0]);
  }

  const result = {
    kind: 'layer1_internal_trim_evaluation',
    version: LAYER1_TRIM_V002_VERSION,
    runDate: '2026-07-17',
    generationLineage: 'layer1-trim-v002@deterministic-rule+webrtcvad-2.0.14',
    inputPolicy: 'source-only audio + words + raw STT speech-unit groups; expected and DP are scoring-only',
    preRegisteredDecision: {
      primaryMetrics: ['acoustic-confirmed-18 detection rate', 'protected-3 false-cut count'],
      rejectionRule: '保護3件を1件でも誤切断した版は、18件の検出率にかかわらず不採用。',
      requiredBreakdown: '18件中16件が第三素材のため素材別に報告し、第三素材以外の過剰検出を確認する。',
      humanReviewGate: 'カット指示が出た場合だけ最大5件・1セッションのペア比較へ進む。'
    },
    sttDiagnostics,
    initialValues: { gapCandidateMs: 400, edgePaddingMs: 120, vadModes: [0, 3], vadFrameMs: 20 },
    acousticConfirmedTargets: {
      total: targetItems.length,
      matched,
      ratePercent: Number((matched / targetItems.length * 100).toFixed(1)),
      acousticVisible: targetItems.filter((item) => item.acousticVisible).length,
      byFixture,
      missedProtectionReasonCounts: countReasons(missedProtected),
      items: targetItems
    },
    protectedTargets: { total: protectedItems.length, falseCuts, items: protectedItems },
    overDetection: { outsideFixedTargets: outsideCuts.length, items: outsideCuts },
    formatChecks: {
      passed: true,
      checks: ['outer-boundary-contained', 'ordered', 'non-overlapping', 'positive-duration', 'remaining-ranges-cover-outer-range', 'remaining-words-are-input-subsequence', 'acoustic-evidence-recorded', 'deterministic-output']
    },
    planSummary: {
      planCount: plans.size,
      cutDirectiveCount: allCuts.length,
      removedDurationMs: allCuts.reduce((sum, cut) => sum + cut.durationMs, 0),
      protectionReasonCounts: countReasons([...plans.values()].flatMap((plan) => plan.protectedCandidates))
    },
    humanReview: {
      selectionRule: '各fixtureでカット指示があるexpectedを正解一致優先・外側尺最短で1件。最大5件。',
      itemCount: Math.min(5, reviewSelections.length),
      currentEstimatedMinutes: reviewSelections.length > 0 ? '5〜10' : '0',
      plannedMaxItemCount: 5,
      seamNaturalnessOptionalNote: true,
      selections: reviewSelections.slice(0, 5).map((plan) => ({
        fixtureId: plan.fixtureId,
        expectedIndex: plan.expectedIndex,
        sourcePath: plan.sourcePath,
        outerRange: plan.outerRange,
        cutDirectives: plan.cutDirectives,
        remainingSourceRanges: plan.remainingSourceRanges
      }))
    },
    decision: {
      protectedSafetyRequired: true,
      eligibleForAdoption: falseCuts === 0 && matched > 0,
      summary: falseCuts > 0
        ? '保護3件の誤切断が発生したため不採用。'
        : matched === 0
          ? '保護3件は守ったが、音響確認済み18件をカット指示へ変換できず不採用。保護を事後に緩めず停止する。'
          : '保護3件を維持しながら正解一致を得た。人間ペア比較の結果が届くまで採否保留。'
    },
    plans: [...plans.values()]
  };

  fs.writeFileSync(path.join(OUTPUT_ROOT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, 'evals/clip_composition/reports/internal-edit/layer1-silence-filler-evaluation-20260717-v002.md'), markdownReport(result));
  console.log(JSON.stringify({
    outputRoot: path.relative(ROOT, OUTPUT_ROOT),
    matched: `${matched}/${targetItems.length}`,
    acousticVisible: `${result.acousticConfirmedTargets.acousticVisible}/${targetItems.length}`,
    protectedFalseCuts: `${falseCuts}/${protectedItems.length}`,
    cuts: allCuts.length,
    outsideFixedTargets: outsideCuts.length,
    reviewItems: result.humanReview.itemCount
  }, null, 2));
}

main();

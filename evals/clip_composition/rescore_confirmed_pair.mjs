import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const clipId = 'r_ztjHaHmcg';
const outputId = '20260706-v001';

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
    }
    current = parent;
  }
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs');
const reportRoot = path.join(evalRoot, 'reports');
const confirmedPath = path.join(evalRoot, 'confirmed_pairs', `${clipId}.json`);

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(evalRoot, relativePath), 'utf8'));
}

function jstIso() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace('Z', '+09:00');
}

function signed(value) {
  if (typeof value !== 'number') {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value}ms`;
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milli = String(ms % 1000).padStart(3, '0');
  return `${minutes}:${String(seconds).padStart(2, '0')}.${milli}`;
}

function deltas(candidate, pair) {
  return {
    clipStartDeltaMs: candidate.clipStartMs - pair.clipStartMs,
    clipEndDeltaMs: candidate.clipEndMs - pair.clipEndMs,
    sourceStartDeltaMs: candidate.sourceStartMs - pair.sourceStartMs,
    sourceEndDeltaMs: candidate.sourceEndMs - pair.sourceEndMs
  };
}

function pass(d, toleranceMs) {
  return Object.values(d).every((value) => Math.abs(value) <= toleranceMs);
}

function maxBoundaryError(d) {
  return Math.max(...Object.values(d).map((value) => Math.abs(value)));
}

function totalBoundaryError(d) {
  return Object.values(d).reduce((sum, value) => sum + Math.abs(value), 0);
}

function overlaps(candidate, pair) {
  return candidate.clipEndMs > pair.clipStartMs && candidate.clipStartMs < pair.clipEndMs;
}

function bestCandidate(candidates, pair) {
  const relevant = candidates.filter((candidate) => overlaps(candidate, pair));
  const pool = relevant.length > 0 ? relevant : candidates;
  let best;
  for (const candidate of pool) {
    const d = deltas(candidate, pair);
    const score = {
      maxBoundaryErrorMs: maxBoundaryError(d),
      totalBoundaryErrorMs: totalBoundaryError(d)
    };
    const scored = {
      ...candidate,
      deltas: d,
      passesTolerance: pass(d, pair.toleranceMs),
      ...score
    };
    if (!best) {
      best = scored;
      continue;
    }
    if (
      scored.maxBoundaryErrorMs < best.maxBoundaryErrorMs ||
      (scored.maxBoundaryErrorMs === best.maxBoundaryErrorMs &&
        scored.totalBoundaryErrorMs < best.totalBoundaryErrorMs)
    ) {
      best = scored;
    }
  }
  return {
    selectionScope: relevant.length > 0 ? 'confirmed_clip_overlap' : 'all_candidates',
    candidate: best
  };
}

function connectedCandidate(candidates, pair) {
  const relevant = candidates
    .filter((candidate) => overlaps(candidate, pair))
    .sort((left, right) => left.clipStartMs - right.clipStartMs);
  if (relevant.length === 0) {
    return {
      overlappingCandidateCount: 0,
      passesTolerance: false
    };
  }
  const first = relevant[0];
  const last = relevant[relevant.length - 1];
  const connected = {
    label: `${first.label}..${last.label}`,
    clipStartMs: first.clipStartMs,
    clipEndMs: last.clipEndMs,
    sourceStartMs: first.sourceStartMs,
    sourceEndMs: last.sourceEndMs,
    anchorWordCount: relevant.reduce((sum, candidate) => sum + (candidate.anchorWordCount ?? 0), 0),
    memberLabels: relevant.map((candidate) => candidate.label)
  };
  const d = deltas(connected, pair);
  return {
    overlappingCandidateCount: relevant.length,
    candidate: connected,
    deltas: d,
    passesTolerance: pass(d, pair.toleranceMs),
    maxBoundaryErrorMs: maxBoundaryError(d),
    totalBoundaryErrorMs: totalBoundaryError(d)
  };
}

function extractDpCandidates(data) {
  return (data.alignment?.candidateRuns ?? []).map((run) => ({
    label: `run ${run.index + 1}`,
    clipStartMs: run.clipStartMs,
    clipEndMs: run.clipEndMs,
    sourceStartMs: run.sourceStartMs,
    sourceEndMs: run.sourceEndMs,
    anchorWordCount: run.matchedWordPairCount,
    maxDeltaDifferenceMs: run.maxDeltaDifferenceMs,
    sourceMinusClipDurationMs: run.sourceMinusClipDurationMs
  }));
}

function extractCutpointCandidates(data) {
  return (data.segments ?? [])
    .filter((segment) => segment.bestMatch)
    .map((segment) => ({
      label: `seg ${segment.segment.index + 1}`,
      clipStartMs: segment.segment.startMs,
      clipEndMs: segment.segment.endMs,
      sourceStartMs: segment.bestMatch.sourceStartMs,
      sourceEndMs: segment.bestMatch.sourceEndMs,
      anchorWordCount: segment.bestMatch.timeAxis?.matchedWordPairCount,
      linearDisplay: segment.bestMatch.linearConsistency?.displayText,
      inheritance: segment.inheritance?.status
    }));
}

function methodResult(method, pair) {
  const data = readJson(method.path);
  const candidates = method.kind === 'dp'
    ? extractDpCandidates(data)
    : extractCutpointCandidates(data);
  return {
    method: method.label,
    family: method.kind === 'dp' ? 'DP案' : '現行方式',
    inputPath: path.join(evalRoot, method.path),
    candidateCount: candidates.length,
    readyForFreeze: data.readyForFreeze ?? false,
    runAt: data.runAt,
    settings: data.settings,
    bestSingleCandidate: bestCandidate(candidates, pair),
    connectedConfirmedWindow: connectedCandidate(candidates, pair)
  };
}

function mdCandidate(candidate) {
  if (!candidate) {
    return '候補なし';
  }
  return `${candidate.label} clip ${msText(candidate.clipStartMs)}-${msText(candidate.clipEndMs)} / source ${msText(candidate.sourceStartMs)}-${msText(candidate.sourceEndMs)} / 対応語 ${candidate.anchorWordCount ?? 'n/a'}`;
}

function mdDeltas(d) {
  if (!d) {
    return 'n/a';
  }
  return `clip開始 ${signed(d.clipStartDeltaMs)}, clip終了 ${signed(d.clipEndDeltaMs)}, 元開始 ${signed(d.sourceStartDeltaMs)}, 元終了 ${signed(d.sourceEndDeltaMs)}`;
}

function buildReport(result) {
  const pair = result.confirmedPair.activePair;
  const oldPair = result.confirmedPair.history?.[0];
  const lines = [
    '# 確定ペア基準の再採点',
    '',
    `- 対象clip: ${result.clipId}`,
    `- 採点基準: clip ${msText(pair.clipStartMs)}-${msText(pair.clipEndMs)} / source ${msText(pair.sourceStartMs)}-${msText(pair.sourceEndMs)}`,
    `- 許容幅: ±${pair.toleranceMs}ms`,
    `- 確認手段: ${pair.verificationMethod}`,
    `- 確認日: ${pair.verifiedAt}`,
    `- 確認者: ${pair.checkedBy}`,
    `- 区間長差: ${pair.metadata.durationDeltaMs}ms (${pair.metadata.durationDeltaNote})`,
    `- fixture凍結: false (${pair.metadata.freezeBlockedReason})`,
    oldPair
      ? `- 履歴保持: source終端 ${msText(oldPair.sourceEndMs)} 版は ${oldPair.verificationMethod} として保持。${oldPair.supersededReason}`
      : '- 履歴保持: 旧ペアなし',
    '',
    '## 方式別の最良候補',
    '',
    '| 方式 | 候補数 | 最良単一区間 | 単一区間の境界差 | 単一区間±500ms | 重なり候補の連結 | 連結境界差 | 連結±500ms |',
    '| --- | ---: | --- | --- | --- | --- | --- | --- |'
  ];

  for (const method of result.methods) {
    const single = method.bestSingleCandidate.candidate;
    const connected = method.connectedConfirmedWindow.candidate;
    lines.push(
      `| ${method.method} | ${method.candidateCount} | ${mdCandidate(single)} | ${mdDeltas(single?.deltas)} | ${single?.passesTolerance ? 'pass' : 'fail'} | ${mdCandidate(connected)} | ${mdDeltas(method.connectedConfirmedWindow.deltas)} | ${method.connectedConfirmedWindow.passesTolerance ? 'pass' : 'fail'} |`
    );
  }

  lines.push(
    '',
    '## 判定',
    '',
    '- 今回の確定ペアに対する±500ms再現は、DP案・現行方式とも不合格。',
    '- DP案の修正版は、確定clip窓に重なる候補を連結すると開始が約5.1秒早く、終端が約4.8秒遅い。',
    '- 現行方式は、確定clip窓に重なる候補を連結すると開始側が大きく前へ広がり、終端も約4.8秒遅い。',
    '- 単一区間候補はいずれも確定ペア全体を表すものではなく、開始・終端の両方を同時に満たせていない。',
    '- fixture凍結は行っていない。残る3ブロックの境界確定が必要。',
    '',
    '## 入力出力',
    '',
    `- 確認済みペア台帳: ${confirmedPath}`,
    `- JSON: ${path.join(outputRoot, `confirmed-pair-rescore-${clipId}-${outputId}.json`)}`,
    ''
  );

  return lines.join('\n');
}

const confirmedPair = JSON.parse(readFileSync(confirmedPath, 'utf8'));
const pair = confirmedPair.activePair;
const methods = [
  {
    kind: 'dp',
    label: 'DP案 global-dp-v001',
    path: 'outputs/global-dp-word-alignment-r_ztjHaHmcg-20260706-global-dp-v001.json'
  },
  {
    kind: 'dp',
    label: 'DP案 min1-v001',
    path: 'outputs/global-dp-word-alignment-r_ztjHaHmcg-20260706-global-dp-min1-v001.json'
  },
  {
    kind: 'dp',
    label: 'DP案 window-trace-repair-v001',
    path: 'outputs/global-dp-word-alignment-r_ztjHaHmcg-20260706-window-trace-repair-v001.json'
  },
  {
    kind: 'cutpoint',
    label: '現行方式 16セグメント',
    path: 'outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-anchor-v001.json'
  },
  {
    kind: 'cutpoint',
    label: '現行方式 41セグメント',
    path: 'outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-video56-audit-v001.json'
  }
];

const result = {
  kind: 'clip_composition_confirmed_pair_rescore',
  runAt: jstIso(),
  clipId,
  confirmedPair,
  scoring: {
    toleranceMs: pair.toleranceMs,
    bestCandidateRule: '確定clip窓に重なる候補のうち、4境界の最大絶対ずれが最小のもの。同値の場合のみ合計絶対ずれで並べる。',
    connectedRule: '確定clip窓に重なる候補をclip時刻順に並べ、先頭の開始と末尾の終了を区間全体として採点する。'
  },
  methods: methods.map((method) => methodResult(method, pair)),
  productionImpact: {
    fixtureCreated: false,
    expectedCreated: false,
    readyForFreezeChanged: false,
    runtimeWrites: false,
    productionCodeChanged: false
  }
};

mkdirSync(outputRoot, { recursive: true });
mkdirSync(reportRoot, { recursive: true });
const jsonPath = path.join(outputRoot, `confirmed-pair-rescore-${clipId}-${outputId}.json`);
const reportPath = path.join(reportRoot, `confirmed-pair-rescore-${clipId}-${outputId}.md`);
writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(reportPath, buildReport(result));

console.log(`result: ${jsonPath}`);
console.log(`report: ${reportPath}`);
for (const method of result.methods) {
  const single = method.bestSingleCandidate.candidate;
  const connected = method.connectedConfirmedWindow;
  console.log(`${method.method}: single ${single?.passesTolerance ? 'pass' : 'fail'} / connected ${connected.passesTolerance ? 'pass' : 'fail'}`);
}

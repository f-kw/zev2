import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadChunkedSttWords } from './layer1_internal_trim.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const INPUT_PATH = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-trim-v002/result.json');
const OUTPUT_ROOT = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-v003-long-gap-preflight-v001');
const REPORT_PATH = path.join(import.meta.dirname, 'reports/internal-edit/layer1-v003-conservative-long-gap-preflight-20260717-v001.md');
const THRESHOLDS_MS = [1500, 2000, 3000];
const VOICE_DETECTOR_PATH = path.join(import.meta.dirname, 'detect_layer1_voice_absence.py');

const STT_BY_FIXTURE = new Map([
  ['r_ztjHaHmcg_partial_material_v001', 'r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001'],
  ['aX-axQMWR3c_single_material_v001', 'aX-axQMWR3c_SGQqVJXsNNE_local30_v001'],
  ['nOEWCNc77MI_multiblock_material_v001', 'nOEWCNc77MI_YE-faluP7zY_local30_v001'],
  ['9dtwF5Exu5w_multiblock_material_v001', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001'],
  ['nE_bNeBNp4E_multiblock_material_v001', 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001']
]);

const EXTRA_WINDOWS = [
  {
    fixtureId: 'IMQYaT_RWRA_context_v001',
    expectedIndex: 1,
    sttId: 'IMQYaT_RWRA_8uuQldLptRE',
    sourcePath: path.join(import.meta.dirname, 'research/downloads/IMQYaT_RWRA/sources/8uuQldLptRE/8uuQldLptRE.mp4'),
    localStartMs: 1997050,
    localEndMs: 2015672,
    outputOffsetMs: 0
  },
  ...[
    ['OJoi31bq8lk', 405028, 455028, 440672, 450696],
    ['O4ryDQBcMDc', 1791383, 1856383, 1809559, 1829518],
    ['vWv9H-hfHXo', 7476308, 7504308, 7478079, 7500512],
    ['Lw_FdQPTOs8', 3431311, 3465311, 3432777, 3434438],
    ['hKVrBcgAIpQ', 5406305, 5437305, 5427822, 5436145],
    ['CwmyZc3eskQ', 4048523, 4095523, 4049549, 4052650]
  ].map(([sourceVideoId, windowStartMs, windowEndMs, sourceStartMs, sourceEndMs], index) => ({
    fixtureId: 'XauLZgnWHtA_part01_partial_material_v001',
    expectedIndex: index + 1,
    sttId: `XauLZgnWHtA_${sourceVideoId}_${String(windowStartMs).padStart(9, '0')}_${String(windowEndMs).padStart(9, '0')}_text_window_v001`,
    sourcePath: path.join(import.meta.dirname, 'research/downloads/XauLZgnWHtA/source-windows-text', sourceVideoId, `${sourceVideoId}_${String(windowStartMs).padStart(9, '0')}_${String(windowEndMs).padStart(9, '0')}.mp4`),
    localStartMs: sourceStartMs - windowStartMs,
    localEndMs: sourceEndMs - windowStartMs,
    outputOffsetMs: windowStartMs
  }))
];

const ALL_FIXTURE_IDS = [
  ...STT_BY_FIXTURE.keys(),
  ...new Set(EXTRA_WINDOWS.map((item) => item.fixtureId))
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function contextGuard(words, startMs, endMs) {
  const overlapping = words.filter((word) => word.startMs < endMs && word.endMs > startMs);
  const previous = words.filter((word) => word.endMs <= startMs).at(-1) ?? null;
  const next = words.find((word) => word.startMs >= endMs) ?? null;
  if (!previous || !next) return { allowed: false, reason: 'outer_edge', previous, next, overlapping };
  if (!previous.speaker || !next.speaker) return { allowed: false, reason: 'speaker_unknown', previous, next, overlapping };
  if (previous.speaker !== next.speaker) return { allowed: false, reason: 'speaker_change', previous, next, overlapping };
  if (!previous.utteranceId || !next.utteranceId) return { allowed: false, reason: 'utterance_unknown', previous, next, overlapping };
  if (previous.utteranceId !== next.utteranceId) return { allowed: false, reason: 'utterance_boundary', previous, next, overlapping };
  return { allowed: true, reason: null, previous, next, overlapping };
}

function runVoiceDetector(window) {
  if (!fs.existsSync(window.sourcePath)) throw new Error(`音声入力がありません: ${window.sourcePath}`);
  const result = spawnSync('python3', [
    VOICE_DETECTOR_PATH,
    '--source', window.sourcePath,
    '--start-ms', String(window.localStartMs),
    '--end-ms', String(window.localEndMs)
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONPATH: ['/private/tmp/zev2-layer1-webrtcvad', process.env.PYTHONPATH].filter(Boolean).join(':')
    }
  });
  if (result.status !== 0) throw new Error(`声ベース診断に失敗しました: ${window.fixtureId}:${window.expectedIndex}\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function createCandidateRow({ fixtureId, expectedIndex, run, runIndex, words, localOuterStartMs, outputOffsetMs = 0 }) {
  const localStartMs = localOuterStartMs + run.startMs;
  const localEndMs = localOuterStartMs + run.endMs;
  const guard = contextGuard(words, localStartMs, localEndMs);
  const startMs = localStartMs + outputOffsetMs;
  const endMs = localEndMs + outputOffsetMs;
  const midpointMs = localStartMs + Math.floor((localEndMs - localStartMs) / 2);
  return {
    fixtureId,
    expectedIndex,
    candidateId: `${fixtureId}:${expectedIndex}:voice-${String(runIndex + 1).padStart(3, '0')}`,
    startMs,
    endMs,
    durationMs: run.durationMs,
    assignedTextCount: guard.overlapping.length,
    midpointCoveredByAssignedText: guard.overlapping.some((word) => (
      word.startMs <= midpointMs && word.endMs >= midpointMs
    )),
    guardAllowed: guard.allowed,
    guardReason: guard.reason,
    previous: guard.previous ? { id: guard.previous.id, text: guard.previous.text, speaker: guard.previous.speaker, utteranceId: guard.previous.utteranceId } : null,
    next: guard.next ? { id: guard.next.id, text: guard.next.text, speaker: guard.next.speaker, utteranceId: guard.next.utteranceId } : null,
    referenceKeys: [],
    protectedIds: []
  };
}

function candidateRows(v002) {
  const wordsByFixture = new Map();
  for (const [fixtureId, sttId] of STT_BY_FIXTURE) {
    wordsByFixture.set(fixtureId, loadChunkedSttWords(path.join(import.meta.dirname, 'stt', sttId, 'source')).words);
  }
  const fixedTargets = v002.acousticConfirmedTargets.items;
  const protectedTargets = v002.protectedTargets.items;
  return v002.plans.flatMap((plan) => {
    const words = wordsByFixture.get(plan.fixtureId).filter((word) => (
      word.endMs > plan.outerRange.startMs && word.startMs < plan.outerRange.endMs
    ));
    return plan.acousticEvidence.voice.consensusRuns.map((run, runIndex) => {
      const row = createCandidateRow({
        fixtureId: plan.fixtureId,
        expectedIndex: plan.expectedIndex,
        run,
        runIndex,
        words,
        localOuterStartMs: plan.outerRange.startMs
      });
      const referenceKeys = fixedTargets.filter((target) => (
        target.fixtureId === plan.fixtureId
        && target.expectedIndex === plan.expectedIndex
        && overlaps(row.startMs, row.endMs, target.gapStartMs, target.gapEndMs)
      )).map((target) => target.key);
      const protectedIds = protectedTargets.flatMap((target, index) => (
        target.fixtureId === plan.fixtureId
        && target.expectedIndex === plan.expectedIndex
        && overlaps(row.startMs, row.endMs, target.startMs, target.endMs)
          ? [`protected-${index + 1}`]
          : []
      ));
      return {
        ...row,
        referenceKeys,
        protectedIds
      };
    });
  });
}

function extraCandidateRows() {
  return EXTRA_WINDOWS.flatMap((window) => {
    const sttRoot = path.join(import.meta.dirname, 'stt', window.sttId, 'source');
    const words = loadChunkedSttWords(sttRoot).words.filter((word) => (
      word.endMs > window.localStartMs && word.startMs < window.localEndMs
    ));
    const evidence = runVoiceDetector(window);
    return evidence.voice.consensusRuns.map((run, runIndex) => createCandidateRow({
      fixtureId: window.fixtureId,
      expectedIndex: window.expectedIndex,
      run,
      runIndex,
      words,
      localOuterStartMs: window.localStartMs,
      outputOffsetMs: window.outputOffsetMs
    }));
  });
}

function countsByFixture(rows) {
  return ALL_FIXTURE_IDS.map((fixtureId) => {
    const selected = rows.filter((row) => row.fixtureId === fixtureId);
    const usable = selected.filter((row) => row.guardAllowed && row.protectedIds.length === 0);
    return {
      fixtureId,
      raw: selected.length,
      afterProtection: usable.length,
      protectedCollision: selected.filter((row) => row.protectedIds.length > 0).length,
      referenceTargetCount: new Set(usable.flatMap((row) => row.referenceKeys)).size
    };
  });
}

function countReasons(rows) {
  const result = {};
  for (const row of rows.filter((item) => !item.guardAllowed)) result[row.guardReason] = (result[row.guardReason] ?? 0) + 1;
  return result;
}

function summarize(rows, thresholdMs) {
  const thresholdRows = rows.filter((row) => row.durationMs >= thresholdMs);
  const afterContextProtection = thresholdRows.filter((row) => row.guardAllowed);
  const usable = afterContextProtection.filter((row) => row.protectedIds.length === 0);
  return {
    thresholdMs,
    rawCandidateCount: thresholdRows.length,
    afterContextProtectionCount: afterContextProtection.length,
    protectedCollisionCount: thresholdRows.filter((row) => row.protectedIds.length > 0).length,
    usableCandidateCount: usable.length,
    referenceTargetCount: new Set(usable.flatMap((row) => row.referenceKeys)).size,
    guardReasonCounts: countReasons(thresholdRows),
    byFixture: countsByFixture(thresholdRows),
    candidates: thresholdRows
  };
}

function formatMs(value) {
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const milliseconds = value % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function markdown(result) {
  const lines = [
    '# 層1v003「保守的な長間抜き」実装前机上表',
    '',
    '作成日: 2026-07-17',
    '',
    '状態: **机上診断のみ。実装・動画生成・人間ペア比較は未承認**',
    '',
    '人間作業: 0件・0分。',
    '',
    '## 前提',
    '',
    '- 検出対象はWebRTC VAD mode 0/3がともに声なしとした連続区間。切り抜き師の細かな詰め実績18件の再現は目標にしない。',
    '- 単語時刻が声なし区間へ重なっても、それだけでは拒否しない。単語時刻は割り当て本文、話者、発話まとまりの参照にだけ使う。',
    '- 話者不明・話者交代、発話まとまり不明・境界、外側境界は保護する。保護正解3件と重なる候補も保護する。',
    '- 対象は凍結済み7fixture型・58 expectedCuts。v002で処理済みの5fixtureに、IMQ系1区間とXau総集編6区間を同じVAD条件で追加診断した。',
    '',
    '## 閾値別集計',
    '',
    '| 声なし閾値 | 生候補 | 文脈・話者保護後 | 保護正解との衝突 | 実装候補 | 18件への参考到達 |',
    '|---:|---:|---:|---:|---:|---:|',
    ...result.thresholds.map((item) => `| ${(item.thresholdMs / 1000).toFixed(1)}秒 | ${item.rawCandidateCount} | ${item.afterContextProtectionCount} | ${item.protectedCollisionCount} | ${item.usableCandidateCount} | ${item.referenceTargetCount}/18 |`),
    '',
    '「実装候補」は、文脈・話者保護を通り、保護正解3件とも重ならない候補。18件への到達は参考値で、採否の主指標にはしない。',
    '',
    '## 初期案2秒で残る3候補',
    '',
    '| fixture / expected | 声なし区間 | 長さ | 前後の発話まとまり | 旧18件との重なり |',
    '|---|---|---:|---|---|',
    ...result.thresholds.find((item) => item.thresholdMs === 2000).candidates
      .filter((item) => item.guardAllowed && item.protectedIds.length === 0)
      .map((item) => `| ${item.fixtureId} / ${item.expectedIndex} | ${formatMs(item.startMs)}〜${formatMs(item.endMs)} | ${item.durationMs}ms | 同一話者・同一発話まとまり | ${item.referenceKeys.length > 0 ? item.referenceKeys.join(', ') : 'なし'} |`),
    '',
    '3件はすべて第三素材に集中し、残る6fixture型は0件。候補が存在することと、複数素材へ一般化していることは分けて扱う。',
    '',
    '## 保護正解3件',
    '',
    '| 保護対象 | 内容 | 最長の声なし | 1.5秒 | 2秒 | 3秒 |',
    '|---|---|---:|---|---|---|',
    ...result.protectedTargets.map((item) => `| ${item.protectedId} | ${item.description} | ${item.longestVoiceAbsenceMs}ms | ${item.thresholds['1500']} | ${item.thresholds['2000']} | ${item.thresholds['3000']} |`),
    '',
    '「閾値未満」は長さだけで候補外。「文脈保護」は閾値を超えるが発話まとまり境界として保護。保護ラベル自体は評価にだけ使い、実装入力へ渡さない。',
    '',
    '## 素材別',
    ''
  ];
  for (const threshold of result.thresholds) {
    lines.push(`### ${(threshold.thresholdMs / 1000).toFixed(1)}秒`, '', '| fixture | 生候補 | 保護後 | 保護正解衝突 | 18件への参考到達 |', '|---|---:|---:|---:|---:|');
    for (const row of threshold.byFixture) lines.push(`| ${row.fixtureId} | ${row.raw} | ${row.afterProtection} | ${row.protectedCollision} | ${row.referenceTargetCount} |`);
    lines.push('');
  }
  lines.push(
    '## 単語時刻の染み出し',
    '',
    `v002で「単語時刻が音響区間へ重なる」とされた27候補のうち、割り当てられた文字時刻が声なし区間の中央まで覆うものは${result.wordTimestampBleed.midpointCovered}/27件。「端の数百msだけ」という予想は成立せず、中央まで及ぶ系統誤差がある。v003では候補の開始・終了・長さをVADだけから決め、単語時刻の重なり分を差し引かないため、この染み出しは1.5/2/3秒の閾値判定へ影響しない。単語時刻は前後の話者・発話まとまりを保護する参照にだけ使う。`,
    '',
    '## 保護補強案の可否',
    '',
    '現データのVADは「声か声でないか」だけで、直後の反応・結果の強さを測っていない。文字列だけの反応語判定も、ゲーム内音声・笑い・叫び・映像結果を落とすため、現時点では保護解除条件に使えない。「直後に強い発話が続けば溜めの疑い」は将来の補助保護候補として記録するが、v003の机上候補では発話まとまり境界を一律に保護した。',
    '',
    '## 撤退判定',
    '',
    result.decision,
    '',
    '## 実装後に使う評価契約案',
    '',
    '- 主: 最大5件・1セッションの詰め前/詰め後比較。「詰め後が良い / 差なし / 詰め前が良い」+繋ぎ目違和感の任意記入。',
    '- 安全: 保護正解3件の誤切断0件。1件でも切れば不採用。',
    '- 参考: 旧18件への重なり。合否には使わない。',
    '',
    '本書は実装承認を求める机上表であり、v003の決定処理、動画、比較UIは作成していない。'
  );
  return `${lines.join('\n')}\n`;
}

function main() {
  const v002 = readJson(INPUT_PATH);
  const rows = [...candidateRows(v002), ...extraCandidateRows()];
  const wordOverlapCandidates = v002.acousticConfirmedTargets.items.flatMap((target) => (
    target.protectedCandidates.filter((candidate) => candidate.protectionReason === 'word_timestamp_overlaps_acoustic_gap')
  ));
  const rowByPosition = new Map(rows.map((row) => [`${row.fixtureId}:${row.expectedIndex}:${row.startMs}:${row.endMs}`, row]));
  const fixedWordOverlapRows = v002.acousticConfirmedTargets.items.flatMap((target) => (
    target.protectedCandidates
      .filter((candidate) => candidate.protectionReason === 'word_timestamp_overlaps_acoustic_gap')
      .map((candidate) => rowByPosition.get(`${target.fixtureId}:${target.expectedIndex}:${candidate.gapStartMs}:${candidate.gapEndMs}`))
      .filter(Boolean)
  ));
  if (wordOverlapCandidates.length !== 27 || fixedWordOverlapRows.length !== 27) {
    throw new Error(`固定27件を復元できません: ${wordOverlapCandidates.length}/${fixedWordOverlapRows.length}`);
  }
  const thresholds = THRESHOLDS_MS.map((thresholdMs) => summarize(rows, thresholdMs));
  const protectedTargets = v002.protectedTargets.items.map((target, index) => {
    const overlappingRows = rows.filter((row) => (
      row.fixtureId === target.fixtureId
      && row.expectedIndex === target.expectedIndex
      && overlaps(row.startMs, row.endMs, target.startMs, target.endMs)
    ));
    return {
      protectedId: `protected-${index + 1}`,
      description: target.description,
      longestVoiceAbsenceMs: Math.max(0, ...overlappingRows.map((row) => row.durationMs)),
      thresholds: Object.fromEntries(THRESHOLDS_MS.map((thresholdMs) => {
        const candidates = overlappingRows.filter((row) => row.durationMs >= thresholdMs);
        if (candidates.length === 0) return [String(thresholdMs), '閾値未満'];
        return [String(thresholdMs), candidates.every((row) => !row.guardAllowed) ? '文脈保護' : '誤切断予測'];
      }))
    };
  });
  const threshold2s = thresholds.find((item) => item.thresholdMs === 2000);
  const decision = `初期案2秒の保護後候補は全58区間で${threshold2s.usableCandidateCount}件、3秒は0件。2秒の${threshold2s.usableCandidateCount}件はすべて第三素材に集中し、他6fixture型は0件だった。「数件未満」に独自の数値境界を足さず、この実測をもって、最大3件のペア比較へ進むか、長い間が少ないとして層1を凍結するかを人間判断とする。実装は未承認。`;
  const result = {
    kind: 'layer1_v003_conservative_long_gap_preflight',
    version: 'layer1-v003-long-gap-preflight-v001',
    runDate: '2026-07-17',
    sourceResult: path.relative(ROOT, INPUT_PATH),
    scope: {
      fixtureCount: ALL_FIXTURE_IDS.length,
      expectedCount: v002.planSummary.planCount + EXTRA_WINDOWS.length,
      fixtureIds: ALL_FIXTURE_IDS
    },
    thresholds,
    protectedTargets,
    wordTimestampBleed: {
      fixedCandidateCount: fixedWordOverlapRows.length,
      midpointCovered: fixedWordOverlapRows.filter((row) => row.midpointCoveredByAssignedText).length,
      items: fixedWordOverlapRows
    },
    decision,
    implementationAuthorized: false,
    humanWork: { itemCount: 0, estimatedMinutes: 0 }
  };
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_ROOT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(REPORT_PATH, markdown(result));
  console.log(JSON.stringify({
    thresholds: thresholds.map((item) => ({ thresholdMs: item.thresholdMs, raw: item.rawCandidateCount, afterProtection: item.usableCandidateCount, protectedCollision: item.protectedCollisionCount, referenceTargets: item.referenceTargetCount })),
    midpointBleed: `${result.wordTimestampBleed.midpointCovered}/27`,
    decision
  }, null, 2));
}

main();

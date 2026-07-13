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
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-signal-desk-check-v001');
const resultPath = path.join(outputRoot, 'result.json');
const reportPath = path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-v001-signal-desk-check-20260713.md');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

const configs = [
  {
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    scorePath: 'outputs/theme-generation/theme-llm-v002-20260711-B-chat-velocity-input-selection-v004-v001-formal-score.json',
    outputPath: 'outputs/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/run-01-gemini-output.json',
    promptInputPath: 'outputs/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/prompt-input.json',
    chatCsvPath: 'outputs/chat-velocity-analysis/nOEWCNc77MI-chat-velocity-simulation-20260711-v001-per-minute.csv'
  },
  {
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    scorePath: 'outputs/theme-generation/theme-llm-v002-20260712-chat-velocity-top100-generalization-v001-formal-score.json',
    outputPath: 'outputs/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/run-01-gemini-output.json',
    promptInputPath: 'outputs/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/prompt-input.json',
    chatCsvPath: 'outputs/chat-velocity-analysis/9dtwF5Exu5w-chat-velocity-generalization-20260712-v001-per-minute.csv'
  }
];

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [keys[index], value])));
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function overlapMs(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function laughterFacts(text) {
  const literalLaughCount = [...text].filter((char) => char === '笑').length;
  const wRunCount = (text.match(/[wW]{2,}/g) ?? []).length;
  const markerCount = literalLaughCount + wRunCount;
  return { literalLaughCount, wRunCount, markerCount, characterCount: [...text].length, density: text.length ? markerCount / [...text].length : 0 };
}

function rankCandidates(candidates, value, direction) {
  return [...candidates].sort((a, b) => {
    const difference = value(a) - value(b);
    if (difference !== 0) return direction === 'desc' ? -difference : difference;
    return a.candidateIndex - b.candidateIndex;
  });
}

function evaluateRanking(name, candidates, score, value, direction) {
  const ranked = rankCandidates(candidates, value, direction);
  const top = ranked.slice(0, 5);
  const covered = [...new Set(top.flatMap((item) => item.hitExpectedIndexes))].sort((a, b) => a - b);
  const inputVisibleIndexes = score.expectedAssessments.filter((item) => item.inputVisibility === 'input-visible').map((item) => item.expectedIndex);
  const inputVisibleCovered = covered.filter((index) => inputVisibleIndexes.includes(index));
  const fifthValue = value(top[4]);
  const cutoffTieCandidates = ranked.filter((item) => value(item) === fifthValue);
  const slotsAtCutoff = 5 - ranked.filter((item) => direction === 'desc' ? value(item) > fifthValue : value(item) < fifthValue).length;
  return {
    name,
    direction,
    top5: top.map((item, index) => ({ rank: index + 1, candidateIndex: item.candidateIndex, title: item.title, value: value(item), hitExpectedIndexes: item.hitExpectedIndexes })),
    allExpected: { coveredCount: covered.length, denominator: score.expectedAssessments.length, recall: covered.length / score.expectedAssessments.length, coveredExpectedIndexes: covered },
    inputVisibleExpected: { coveredCount: inputVisibleCovered.length, denominator: inputVisibleIndexes.length, recall: inputVisibleIndexes.length ? inputVisibleCovered.length / inputVisibleIndexes.length : null, coveredExpectedIndexes: inputVisibleCovered },
    hitCandidateCountAt5: top.filter((item) => item.hitExpectedIndexes.length > 0).length,
    precisionAt5: top.filter((item) => item.hitExpectedIndexes.length > 0).length / 5,
    cutoffTie: { value: fifthValue, candidateCount: cutoffTieCandidates.length, availableSlots: slotsAtCutoff, ambiguous: cutoffTieCandidates.length > slotsAtCutoff }
  };
}

async function analyze(config) {
  const [score, output, promptInput, chatText] = await Promise.all([
    readJson(path.join(evalRoot, config.scorePath)),
    readJson(path.join(evalRoot, config.outputPath)),
    readJson(path.join(evalRoot, config.promptInputPath)),
    readFile(path.join(evalRoot, config.chatCsvPath), 'utf8')
  ]);
  const assessmentByIndex = new Map(score.candidateAssessments.map((item) => [item.candidateIndex, item]));
  const segments = promptInput.modelInput.sources.flatMap((source) => source.segments);
  const sourceDurationMs = Number(promptInput.modelInput.sources[0].durationSec) * 1000;
  if (!Number.isFinite(sourceDurationMs) || sourceDurationMs <= 0) throw new Error(`${config.fixtureId} 配信長なし`);
  const chatMinutes = parseCsv(chatText).filter((item) => item.isFullMinute === 'true').map((item) => ({ startMs: Number(item.sourceStartMs), endMs: Number(item.sourceEndMs), relative: Number(item.relativeToStreamBaseline) }));
  const candidates = output.themes.map((theme, offset) => {
    const candidateIndex = offset + 1;
    const assessment = assessmentByIndex.get(candidateIndex);
    if (!assessment) throw new Error(`${config.fixtureId} candidate ${candidateIndex} assessmentなし`);
    const ranges = assessment.ranges;
    const evidenceDurationMs = ranges.reduce((sum, range) => sum + (range.sourceEndMs - range.sourceStartMs), 0);
    const sourcePositionStartMs = Math.min(...ranges.map((range) => range.sourceStartMs));
    const minuteOverlaps = chatMinutes.flatMap((minute) => ranges.map((range) => ({ minute, weightMs: overlapMs(minute.startMs, minute.endMs, range.sourceStartMs, range.sourceEndMs) }))).filter((item) => item.weightMs > 0);
    const chatPeak = minuteOverlaps.length ? Math.max(...minuteOverlaps.map((item) => item.minute.relative)) : 0;
    const chatWeight = minuteOverlaps.reduce((sum, item) => sum + item.weightMs, 0);
    const chatMean = chatWeight ? minuteOverlaps.reduce((sum, item) => sum + item.minute.relative * item.weightMs, 0) / chatWeight : 0;
    const evidenceText = segments.filter((segment) => ranges.some((range) => overlaps(segment.sourceStartMs, segment.sourceEndMs, range.sourceStartMs, range.sourceEndMs))).map((segment) => segment.text).join('');
    return { candidateIndex, themeId: theme.themeId, title: theme.title, reason: theme.reason, hitExpectedIndexes: assessment.hitExpectedIndexes, evidenceDurationMs, sourcePositionStartMs, sourcePositionRatio: sourcePositionStartMs / sourceDurationMs, chatPeak, chatMean, laughter: laughterFacts(evidenceText) };
  });
  if (candidates.length !== score.candidateAssessments.length) throw new Error(`${config.fixtureId} candidate件数不一致`);
  const rankings = [
    evaluateRanking('generation_order', candidates, score, (item) => item.candidateIndex, 'asc'),
    evaluateRanking('chat_peak', candidates, score, (item) => item.chatPeak, 'desc'),
    evaluateRanking('chat_mean', candidates, score, (item) => item.chatMean, 'desc'),
    evaluateRanking('evidence_shorter', candidates, score, (item) => item.evidenceDurationMs, 'asc'),
    evaluateRanking('evidence_longer', candidates, score, (item) => item.evidenceDurationMs, 'desc'),
    evaluateRanking('laughter_density', candidates, score, (item) => item.laughter.density, 'desc'),
    evaluateRanking('position_earlier', candidates, score, (item) => item.sourcePositionStartMs, 'asc'),
    evaluateRanking('position_later', candidates, score, (item) => item.sourcePositionStartMs, 'desc')
  ];
  return { fixtureId: config.fixtureId, candidateCount: candidates.length, expectedCount: score.expectedAssessments.length, sourceDurationMs, candidates, rankings, semanticSignal: { fields: ['title', 'reason'], status: 'not-ranked-without-llm', reason: 'title/reasonは自然言語で大小関係がなく、追加LLM実走禁止の机上検証では根拠のない文字数代理値や係数を置かない' } };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function report(result) {
  const names = result.fixtures[0].rankings.map((item) => item.name);
  const lines = [
    '# candidate-ranking-v001 単独信号の机上検証', '',
    '- ランキング母集団はB素材89候補・第二素材60候補。expected hitで抽出済みの24候補は使っていない。',
    '- 各信号を単独で順位付けし、係数・合成スコアなし。上位件数は事前固定の5。',
    '- 配信内位置は候補の最初の根拠時刻とし、早い順・遅い順を両方出して、向きを結果後に選ばない。',
    '- title/reasonは自然言語のため、追加LLM実走なしでは根拠のない数値代理へ変換せず、今回の機械比較対象外。', '',
    '| 信号 | B hit候補/5 | B 全expected Recall@5 | B 入力内 Recall@5 | 第二 hit候補/5 | 第二 全expected Recall@5 | 第二 入力内 Recall@5 | 5位同点 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |'
  ];
  for (const name of names) {
    const a = result.fixtures[0].rankings.find((item) => item.name === name);
    const b = result.fixtures[1].rankings.find((item) => item.name === name);
    lines.push(`| ${name} | ${a.hitCandidateCountAt5}/5 | ${a.allExpected.coveredCount}/${a.allExpected.denominator} (${percent(a.allExpected.recall)}) | ${a.inputVisibleExpected.coveredCount}/${a.inputVisibleExpected.denominator} (${percent(a.inputVisibleExpected.recall)}) | ${b.hitCandidateCountAt5}/5 | ${b.allExpected.coveredCount}/${b.allExpected.denominator} (${percent(b.allExpected.recall)}) | ${b.inputVisibleExpected.coveredCount}/${b.inputVisibleExpected.denominator} (${percent(b.inputVisibleExpected.recall)}) | B ${a.cutoffTie.ambiguous ? '曖昧' : '一意'} / 第二 ${b.cutoffTie.ambiguous ? '曖昧' : '一意'} |`);
  }
  lines.push('', '## 上位5の明細', '');
  for (const fixture of result.fixtures) {
    lines.push(`### ${fixture.fixtureId}`, '');
    for (const ranking of fixture.rankings) {
      lines.push(`- ${ranking.name}: ${ranking.top5.map((item) => `${item.rank}. candidate ${item.candidateIndex} [${item.hitExpectedIndexes.join(',') || '-'}]`).join(' / ')}`);
    }
    lines.push('');
  }
  lines.push('## 読み方', '', '- 全expected Recall@5が運用全体の物差し。入力内Recall@5はランキングだけの能力を分離する補助値。', '- 2素材だけなので、この表だけで恒久標準や複数信号の合成を決めない。', '- 笑い表記がない候補同士の同点が大きい場合、その候補番号順を能力として解釈しない。', '- 24〜25件のhit済み候補を先に抽出して順位付けすると正解由来情報のリークになるため、全89／60候補を母集団にしている。', '');
  lines.push('## 結論', '', '- 配信内位置の早い順は両素材で生成順と同じ上位5・同じRecall@5になった。生成窓順の言い換えであり、独立した改善ではない。', '- チャット流速と笑い表記はB素材で悪化し、長い根拠範囲は第二素材だけ改善してB素材を0件にした。生成順を独立に改善する機械信号は0件。', '- よって機械信号の単独標準化と、結果を見た後の合成は行わない。', '- 最有力の次仮説は、title/reasonだけを読む意味判断ランキング。ただし本指示では実装・重み付け・追加LLM実走を行わず、人間承認待ちとする。機械信号は将来実走時の監査値として残す。', '');
  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  const fixtures = [];
  for (const config of configs) fixtures.push(await analyze(config));
  const result = { kind: 'candidate_ranking_signal_desk_check', runAt: new Date().toISOString(), rankingVersion: 'candidate-ranking-v001-design', topN: 5, combinedScoreUsed: false, additionalLlmRunUsed: false, expectedUsedOnlyForScoring: true, decision: { independentlyImprovingMechanicalSignalCount: 0, baselineEquivalentSignal: 'position_earlier (same top5 as generation_order on both fixtures)', leadingHypothesisPendingHumanApproval: 'semantic-ranking-from-title-and-reason-only', implementationApproved: false, mechanicalSignalsRemainAuditOnly: true }, fixtures };
  await mkdir(outputRoot, { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`), writeFile(reportPath, report(result))]);
  console.log(JSON.stringify({ status: 'complete', resultPath: path.relative(root, resultPath), reportPath: path.relative(root, reportPath), summary: fixtures.map((fixture) => ({ fixtureId: fixture.fixtureId, candidateCount: fixture.candidateCount, rankings: fixture.rankings.map((item) => ({ name: item.name, hitCandidateCountAt5: item.hitCandidateCountAt5, allExpectedRecallAt5: item.allExpected, inputVisibleRecallAt5: item.inputVisibleExpected, precisionAt5: item.precisionAt5, cutoffTieAmbiguous: item.cutoffTie.ambiguous })) })) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

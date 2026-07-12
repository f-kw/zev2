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
const outputPath = path.join(evalRoot, 'outputs', 'boundary-granularity-two-fixture-20260713-v001.json');
const reportPath = path.join(evalRoot, 'reports', 'boundary-granularity-two-fixture-20260713-v001.md');
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

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const nearestRank = (values, rate) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * rate) - 1)];
};
const round = (value) => value === null ? null : Math.round(value * 1000) / 1000;
const percent = (count, total) => total ? `${(count / total * 100).toFixed(1)}%` : '-';

// connection-v001が実際に使った発話圧縮と同一。
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
    if (/[。！？!?]/.test(text) || !next || next.startMs > current.sourceEndMs) {
      result.push(current);
      current = undefined;
    }
  }
  if (current) result.push(current);
  return result.map((item, index) => ({ ...item, speechId: index + 1 }));
}

function boundaryPoints(segments, startKey, endKey, idKey) {
  return segments.flatMap((segment) => [
    { timeMs: segment[startKey], kind: 'start', segmentId: segment[idKey], text: segment.text },
    { timeMs: segment[endKey], kind: 'end', segmentId: segment[idKey], text: segment.text }
  ]).sort((a, b) => a.timeMs - b.timeMs || (a.kind === 'start' ? -1 : 1));
}

function nearestPoint(points, boundaryMs) {
  return points.reduce((best, point) => {
    const absoluteDistanceMs = Math.abs(point.timeMs - boundaryMs);
    if (!best || absoluteDistanceMs < best.absoluteDistanceMs || (absoluteDistanceMs === best.absoluteDistanceMs && point.timeMs < best.timeMs)) {
      return { ...point, signedDistanceMs: point.timeMs - boundaryMs, absoluteDistanceMs };
    }
    return best;
  }, undefined);
}

function classifySpeechBoundary(speechSegments, speechPoints, boundaryMs) {
  const exact = speechPoints.filter((point) => point.timeMs === boundaryMs);
  const covering = speechSegments.filter((segment) => boundaryMs > segment.sourceStartMs && boundaryMs < segment.sourceEndMs);
  const relation = exact.length ? 'speech_boundary_exact' : covering.length ? 'inside_speech' : 'non_speech_interval';
  return {
    boundaryMs,
    relation,
    exactSpeechPoints: exact,
    coveringSpeechIds: covering.map((segment) => segment.speechId),
    nearestSpeechBoundary: nearestPoint(speechPoints, boundaryMs)
  };
}

function distanceSummary(boundaries, field) {
  const values = boundaries.map((boundary) => boundary[field].absoluteDistanceMs);
  return {
    count: values.length,
    meanMs: round(mean(values)),
    medianMs: nearestRank(values, 0.5),
    p75Ms: nearestRank(values, 0.75),
    p90Ms: nearestRank(values, 0.9),
    maxMs: Math.max(...values),
    within1000Count: values.filter((value) => value <= 1000).length,
    within3000Count: values.filter((value) => value <= 3000).length,
    within5000Count: values.filter((value) => value <= 5000).length
  };
}

function relationSummary(boundaries) {
  return {
    speechBoundaryExact: boundaries.filter((boundary) => boundary.relation === 'speech_boundary_exact').length,
    insideSpeech: boundaries.filter((boundary) => boundary.relation === 'inside_speech').length,
    nonSpeechInterval: boundaries.filter((boundary) => boundary.relation === 'non_speech_interval').length
  };
}

function cutOracleSummary(cuts, startField, endField) {
  const counts = {};
  for (const threshold of [0, 1000, 3000, 5000]) {
    counts[`bothWithin${threshold}Count`] = cuts.filter((cut) => cut.start[startField].absoluteDistanceMs <= threshold && cut.end[endField].absoluteDistanceMs <= threshold).length;
  }
  return counts;
}

async function analyzeFixture(fixtureId, dataset) {
  const expectedPath = path.join(evalRoot, 'expected', `${fixtureId}.json`);
  const transcript = await readJson(dataset.transcriptPath);
  const expected = await readJson(expectedPath);
  const rawSegments = transcript.segments.filter((item) => String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const speechSegments = compactTranscript(dataset.sourceVideoId, transcript);
  const speechPoints = boundaryPoints(speechSegments, 'sourceStartMs', 'sourceEndMs', 'speechId');
  const wordPoints = boundaryPoints(rawSegments, 'startMs', 'endMs', 'id');
  const cuts = expected.expectedCuts.map((cut, index) => {
    const start = classifySpeechBoundary(speechSegments, speechPoints, cut.sourceStartMs);
    const end = classifySpeechBoundary(speechSegments, speechPoints, cut.sourceEndMs);
    start.nearestWordBoundary = nearestPoint(wordPoints, cut.sourceStartMs);
    end.nearestWordBoundary = nearestPoint(wordPoints, cut.sourceEndMs);
    return { expectedIndex: index + 1, sourceStartMs: cut.sourceStartMs, sourceEndMs: cut.sourceEndMs, start, end };
  });
  return {
    fixtureId,
    sourceVideoId: dataset.sourceVideoId,
    expectedPath: path.relative(root, expectedPath),
    sourceTranscriptPath: path.relative(root, dataset.transcriptPath),
    sourceTranscriptIsPreFreezeFullStream: true,
    rawWordSegmentCount: rawSegments.length,
    compactedSpeechSegmentCount: speechSegments.length,
    expectedCutCount: cuts.length,
    cuts
  };
}

function summarize(fixtures) {
  const cuts = fixtures.flatMap((fixture) => fixture.cuts.map((cut) => ({ ...cut, fixtureId: fixture.fixtureId })));
  const boundaries = cuts.flatMap((cut) => [
    { ...cut.start, fixtureId: cut.fixtureId, expectedIndex: cut.expectedIndex, side: 'start' },
    { ...cut.end, fixtureId: cut.fixtureId, expectedIndex: cut.expectedIndex, side: 'end' }
  ]);
  return {
    fixtureCount: fixtures.length,
    expectedCutCount: cuts.length,
    boundaryCount: boundaries.length,
    relation: relationSummary(boundaries),
    relationBySide: {
      start: relationSummary(boundaries.filter((boundary) => boundary.side === 'start')),
      end: relationSummary(boundaries.filter((boundary) => boundary.side === 'end'))
    },
    nearestSpeechBoundaryDistance: distanceSummary(boundaries, 'nearestSpeechBoundary'),
    nearestWordBoundaryDistance: distanceSummary(boundaries, 'nearestWordBoundary'),
    speechBoundaryOracleByCut: cutOracleSummary(cuts, 'nearestSpeechBoundary', 'nearestSpeechBoundary'),
    wordBoundaryOracleByCut: cutOracleSummary(cuts, 'nearestWordBoundary', 'nearestWordBoundary'),
    byFixture: Object.fromEntries(fixtures.map((fixture) => {
      const fixtureBoundaries = fixture.cuts.flatMap((cut) => [cut.start, cut.end]);
      return [fixture.fixtureId, {
        expectedCutCount: fixture.cuts.length,
        boundaryCount: fixtureBoundaries.length,
        relation: relationSummary(fixtureBoundaries),
        nearestSpeechBoundaryDistance: distanceSummary(fixtureBoundaries, 'nearestSpeechBoundary'),
        nearestWordBoundaryDistance: distanceSummary(fixtureBoundaries, 'nearestWordBoundary')
      }];
    }))
  };
}

function buildReport(result) {
  const summary = result.summary;
  const relation = summary.relation;
  const speech = summary.nearestSpeechBoundaryDistance;
  const word = summary.nearestWordBoundaryDistance;
  const lines = [
    '# 2素材38正解 境界粒度診断',
    '',
    '- 対象: 2素材、38 expectedCuts、開始・終了あわせて76境界。',
    '- 入力: fixture用に正解境界で切った文字起こしではなく、凍結前の元配信全域ローカルSTT。',
    '- 発話単位: connection-v001が実際に使った句読点・時間連続による圧縮発話。',
    '- 単語単位: 全域ローカルSTTの未圧縮セグメント。',
    '- 完全一致・発話途中・非発話区間は閾値なしで排他的に分類する。',
    '',
    '## 分類結果',
    '',
    '| 分類 | 76境界中 | 割合 |',
    '| --- | ---: | ---: |',
    `| 発話境界と完全一致 | ${relation.speechBoundaryExact} | ${percent(relation.speechBoundaryExact, summary.boundaryCount)} |`,
    `| 発話途中 | ${relation.insideSpeech} | ${percent(relation.insideSpeech, summary.boundaryCount)} |`,
    `| 非発話区間 | ${relation.nonSpeechInterval} | ${percent(relation.nonSpeechInterval, summary.boundaryCount)} |`,
    '',
    '| 側 | 完全一致 | 発話途中 | 非発話区間 |',
    '| --- | ---: | ---: | ---: |',
    `| 開始38件 | ${summary.relationBySide.start.speechBoundaryExact} | ${summary.relationBySide.start.insideSpeech} | ${summary.relationBySide.start.nonSpeechInterval} |`,
    `| 終了38件 | ${summary.relationBySide.end.speechBoundaryExact} | ${summary.relationBySide.end.insideSpeech} | ${summary.relationBySide.end.nonSpeechInterval} |`,
    '',
    '## 最寄り境界までの距離',
    '',
    '| 入力粒度 | 平均 | 中央値 | P75 | P90 | 最大 | ±1秒内 | ±3秒内 | ±5秒内 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| 圧縮発話の開始・終了 | ${Math.round(speech.meanMs)}ms | ${speech.medianMs}ms | ${speech.p75Ms}ms | ${speech.p90Ms}ms | ${speech.maxMs}ms | ${speech.within1000Count}/76 | ${speech.within3000Count}/76 | ${speech.within5000Count}/76 |`,
    `| 未圧縮の単語境界 | ${Math.round(word.meanMs)}ms | ${word.medianMs}ms | ${word.p75Ms}ms | ${word.p90Ms}ms | ${word.maxMs}ms | ${word.within1000Count}/76 | ${word.within3000Count}/76 | ${word.within5000Count}/76 |`,
    '',
    '## 発話・単語境界を独立に正しく選べた場合の理論上界',
    '',
    '| 粒度 | 両境界0ms | 両境界±1秒 | 両境界±3秒 | 両境界±5秒 |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| 圧縮発話境界 | ${summary.speechBoundaryOracleByCut.bothWithin0Count}/38 | ${summary.speechBoundaryOracleByCut.bothWithin1000Count}/38 | ${summary.speechBoundaryOracleByCut.bothWithin3000Count}/38 | ${summary.speechBoundaryOracleByCut.bothWithin5000Count}/38 |`,
    `| 未圧縮の単語境界 | ${summary.wordBoundaryOracleByCut.bothWithin0Count}/38 | ${summary.wordBoundaryOracleByCut.bothWithin1000Count}/38 | ${summary.wordBoundaryOracleByCut.bothWithin3000Count}/38 | ${summary.wordBoundaryOracleByCut.bothWithin5000Count}/38 |`,
    '',
    '## 素材別',
    '',
    '| fixture | 境界 | 完全一致 | 発話途中 | 非発話 | 発話境界距離平均 | 単語境界距離平均 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...Object.entries(summary.byFixture).map(([fixtureId, item]) => `| ${fixtureId} | ${item.boundaryCount} | ${item.relation.speechBoundaryExact} | ${item.relation.insideSpeech} | ${item.relation.nonSpeechInterval} | ${Math.round(item.nearestSpeechBoundaryDistance.meanMs)}ms | ${Math.round(item.nearestWordBoundaryDistance.meanMs)}ms |`),
    '',
    '## 読み取り',
    '',
    '- 発話境界一致率は、境界段が現在の圧縮発話IDだけを選ぶ場合に0msで表現できる割合を示す。',
    '- 発話途中は、圧縮発話IDだけでは正確な境界を表現できない。単語境界の上界が高ければ、単語タイムスタンプを候補点として追加する。',
    '- 非発話区間は、文字起こしだけでは笑い・無音・反応収束の位置を直接識別できない。最寄り発話境界でも±3秒に入らないものが残る場合だけ、非発話シグナルを追加候補にする。',
    '- この診断は表現可能性の上界であり、モデルが正しい境界候補を選べること自体はboundary-v001実走で別に測る。'
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  const fixtures = [];
  for (const [fixtureId, dataset] of Object.entries(datasets)) fixtures.push(await analyzeFixture(fixtureId, dataset));
  const summary = summarize(fixtures);
  if (summary.expectedCutCount !== 38 || summary.boundaryCount !== 76) throw new Error(`診断件数不一致 cuts=${summary.expectedCutCount} boundaries=${summary.boundaryCount}`);
  const result = {
    kind: 'clip_composition_boundary_granularity_two_fixture',
    runAt: new Date().toISOString(),
    purpose: 'boundary-v001 design upper-bound diagnosis',
    sourcePolicy: 'pre-freeze full-source local STT only; frozen fixture transcript is not used because it is clipped at expected material-block boundaries',
    relationDefinitions: {
      speech_boundary_exact: 'expected boundary equals at least one compacted speech start or end',
      inside_speech: 'not exact and strictly inside at least one compacted speech segment',
      non_speech_interval: 'not exact and not inside any compacted speech segment'
    },
    fixtures,
    summary
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(reportPath, buildReport(result));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

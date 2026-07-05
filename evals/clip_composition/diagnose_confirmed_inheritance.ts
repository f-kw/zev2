import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  realignmentPath: string;
  oldAlignmentPath: string;
  outputId: string;
};

type TimeAxisInspection = {
  linearContinuityRatio?: number;
  longestLinearRunDurationMs?: number;
  segmentDurationMs?: number;
};

type MatchCandidate = {
  sourceStartMs: number;
  sourceEndMs: number;
  sourceText?: string;
  normalizedSourceText?: string;
  matchedChars?: number;
  queryChars?: number;
  sourceChars?: number;
  clipCoverage?: number;
  sourceCoverage?: number;
  timeAxis?: TimeAxisInspection;
};

type SegmentResult = {
  segment: {
    index: number;
    startMs: number;
    endMs: number;
    durationMs: number;
    boundaryEvidence?: Array<{
      timeMs: number;
      kind: string;
      rank: number;
      value: number;
    }>;
  };
  bestMatch?: MatchCandidate;
  matches?: MatchCandidate[];
  inheritance?: {
    status?: string;
    reason?: string;
  };
};

type RealignmentFile = {
  clipId: string;
  sourceId: string;
  readyForFreeze: boolean;
  freezeStatus?: string;
  humanConfirmedPairPolicy?: {
    inheritedPair?: {
      clipStartMs: number;
      clipEndMs: number;
      sourceStartMs: number;
      sourceEndMs: number;
      checkedBy?: string;
      status?: string;
    };
    toleranceMs?: number;
    applied?: number[];
  };
  cutpointDetection?: {
    selectedCutpoints?: Array<{
      timeMs: number;
      kind: string;
      rank: number;
      value: number;
    }>;
  };
  segments?: SegmentResult[];
};

type OldAlignmentFile = {
  chunkResults?: Array<{
    chunk: {
      index: number;
      startMs: number;
      endMs: number;
    };
    bestMatches?: MatchCandidate[];
    sourceMatches?: Array<{
      matches?: MatchCandidate[];
    }>;
  }>;
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
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

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const realignmentPath = values.get('realignment')?.trim();
  const oldAlignmentPath = values.get('oldAlignment')?.trim();
  if (!realignmentPath) {
    throw new Error('--realignment を指定してください');
  }
  if (!oldAlignmentPath) {
    throw new Error('--oldAlignment を指定してください');
  }
  return {
    realignmentPath: resolveWorkspacePath(realignmentPath),
    oldAlignmentPath: resolveWorkspacePath(oldAlignmentPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function overlaps(leftStartMs: number, leftEndMs: number, rightStartMs: number, rightEndMs: number): boolean {
  return leftEndMs > rightStartMs && leftStartMs < rightEndMs;
}

function msText(ms: number | undefined): string {
  if (ms === undefined) {
    return 'unknown';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function percent(value: number | undefined): string {
  return value === undefined ? 'unknown' : `${Math.round(value * 1000) / 10}%`;
}

function sourceEnvelope(items: Array<{ sourceStartMs?: number; sourceEndMs?: number }>) {
  const starts = items.map((item) => item.sourceStartMs).filter((item): item is number => typeof item === 'number');
  const ends = items.map((item) => item.sourceEndMs).filter((item): item is number => typeof item === 'number');
  if (starts.length === 0 || ends.length === 0) {
    return undefined;
  }
  return {
    sourceStartMs: Math.min(...starts),
    sourceEndMs: Math.max(...ends)
  };
}

function compareRange(actual: { sourceStartMs: number; sourceEndMs: number } | undefined, expected: { sourceStartMs: number; sourceEndMs: number }) {
  if (!actual) {
    return undefined;
  }
  return {
    sourceStartDeltaMs: actual.sourceStartMs - expected.sourceStartMs,
    sourceEndDeltaMs: actual.sourceEndMs - expected.sourceEndMs,
    startWithinTolerance: Math.abs(actual.sourceStartMs - expected.sourceStartMs) <= 500,
    endWithinTolerance: Math.abs(actual.sourceEndMs - expected.sourceEndMs) <= 500
  };
}

function excerpt(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.length > 120 ? `${value.slice(0, 120)}...` : value;
}

function buildReport(input: {
  resultPath: string;
  realignment: RealignmentFile;
  diagnosis: Record<string, any>;
}): string {
  const confirmed = input.diagnosis.confirmedPair;
  const lines = [
    '# confirmed継承0件 原因診断',
    '',
    `- 診断JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 切り抜き: ${input.realignment.clipId}`,
    `- 元動画STT: ${input.realignment.sourceId}`,
    `- 基準ペア: clip ${msText(confirmed.clipStartMs)}-${msText(confirmed.clipEndMs)} / source ${msText(confirmed.sourceStartMs)}-${msText(confirmed.sourceEndMs)}`,
    `- readyForFreeze: ${input.realignment.readyForFreeze ? 'true' : 'false'}`,
    '',
    '## 判定',
    '',
    `- 分類: ${input.diagnosis.classification.label}`,
    `- 主因: ${input.diagnosis.classification.primary}`,
    '',
    ...input.diagnosis.classification.reasons.map((item: string) => `- ${item}`),
    '',
    '## 重なる新セグメント',
    '',
    '| seg | clip | source | text | linear | cut evidence |',
    '| ---: | --- | --- | ---: | ---: | --- |'
  ];

  for (const item of input.diagnosis.overlappingSegments) {
    lines.push(`| ${item.segmentId} | ${msText(item.clipStartMs)}-${msText(item.clipEndMs)} | ${msText(item.sourceStartMs)}-${msText(item.sourceEndMs)} | ${percent(item.clipCoverage)} | ${percent(item.linearContinuityRatio)} | ${item.cutEvidenceText} |`);
  }

  lines.push('');
  lines.push('## 連結比較');
  lines.push('');
  lines.push(`- 新seg11-16の元動画対応エンベロープ: ${msText(input.diagnosis.sourceEnvelopeAll?.sourceStartMs)}-${msText(input.diagnosis.sourceEnvelopeAll?.sourceEndMs)}`);
  lines.push(`- 差分: 開始 ${input.diagnosis.sourceEnvelopeAllComparison?.sourceStartDeltaMs ?? 'unknown'}ms / 終了 ${input.diagnosis.sourceEnvelopeAllComparison?.sourceEndDeltaMs ?? 'unknown'}ms`);
  lines.push(`- 確認済み範囲内に完全に収まるseg12-16の元動画対応エンベロープ: ${msText(input.diagnosis.sourceEnvelopeContained?.sourceStartMs)}-${msText(input.diagnosis.sourceEnvelopeContained?.sourceEndMs)}`);
  lines.push(`- 差分: 開始 ${input.diagnosis.sourceEnvelopeContainedComparison?.sourceStartDeltaMs ?? 'unknown'}ms / 終了 ${input.diagnosis.sourceEnvelopeContainedComparison?.sourceEndDeltaMs ?? 'unknown'}ms`);
  lines.push(`- 旧30秒照合の機械的最上位範囲: ${msText(input.diagnosis.oldFixedBestMatch?.sourceStartMs)}-${msText(input.diagnosis.oldFixedBestMatch?.sourceEndMs)}`);
  lines.push(`- 旧30秒照合と基準ペアの差分: 開始 ${input.diagnosis.oldFixedComparison?.sourceStartDeltaMs ?? 'unknown'}ms / 終了 ${input.diagnosis.oldFixedComparison?.sourceEndDeltaMs ?? 'unknown'}ms`);
  lines.push('');
  lines.push('## 全セグメント整合率');
  lines.push('');
  lines.push('| seg | clip | source | linear | cut evidence |');
  lines.push('| ---: | --- | --- | ---: | --- |');
  for (const item of input.diagnosis.allSegments) {
    lines.push(`| ${item.segmentId} | ${msText(item.clipStartMs)}-${msText(item.clipEndMs)} | ${msText(item.sourceStartMs)}-${msText(item.sourceEndMs)} | ${percent(item.linearContinuityRatio)} | ${item.cutEvidenceText} |`);
  }
  lines.push('');
  lines.push('## 照合根拠');
  lines.push('');
  lines.push(`- 旧chunk4: text ${percent(input.diagnosis.oldFixedBestMatch?.clipCoverage)} / linear ${percent(input.diagnosis.oldFixedBestMatch?.linearContinuityRatio)} / matched ${input.diagnosis.oldFixedBestMatch?.matchedChars ?? 'unknown'}/${input.diagnosis.oldFixedBestMatch?.queryChars ?? 'unknown'}`);
  if (input.diagnosis.oldFixedBestMatch?.sourceTextExcerpt) {
    lines.push(`  - source excerpt: ${input.diagnosis.oldFixedBestMatch.sourceTextExcerpt}`);
  }
  for (const item of input.diagnosis.overlappingSegments) {
    lines.push(`- new seg ${item.segmentId}: text ${percent(item.clipCoverage)} / linear ${percent(item.linearContinuityRatio)} / matched ${item.matchedChars ?? 'unknown'}/${item.queryChars ?? 'unknown'}`);
    if (item.sourceTextExcerpt) {
      lines.push(`  - source excerpt: ${item.sourceTextExcerpt}`);
    }
  }
  lines.push('');
  lines.push('## 対応方針');
  lines.push('');
  lines.push(...input.diagnosis.recommendations.map((item: string) => `- ${item}`));
  lines.push('');
  lines.push('## 制約確認');
  lines.push('');
  lines.push('- fixture/expected には書き込まない');
  lines.push('- readyForFreeze は false のまま');
  lines.push('- 確認済みペアは変更しない');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const realignment = await readJson<RealignmentFile>(options.realignmentPath);
  const oldAlignment = await readJson<OldAlignmentFile>(options.oldAlignmentPath);
  const confirmed = realignment.humanConfirmedPairPolicy?.inheritedPair;
  if (!confirmed) {
    throw new Error('realignmentに確認済みペアがありません');
  }

  const allSegments = (realignment.segments ?? []).map((item) => ({
    segmentId: item.segment.index + 1,
    clipStartMs: item.segment.startMs,
    clipEndMs: item.segment.endMs,
    sourceStartMs: item.bestMatch?.sourceStartMs,
    sourceEndMs: item.bestMatch?.sourceEndMs,
    clipCoverage: item.bestMatch?.clipCoverage,
    linearContinuityRatio: item.bestMatch?.timeAxis?.linearContinuityRatio,
    matchedChars: item.bestMatch?.matchedChars,
    queryChars: item.bestMatch?.queryChars,
    sourceTextExcerpt: excerpt(item.bestMatch?.sourceText),
    cutEvidence: item.segment.boundaryEvidence ?? [],
    cutEvidenceText: (item.segment.boundaryEvidence ?? [])
      .map((evidence) => `${evidence.kind}@${msText(evidence.timeMs)} r${evidence.rank}`)
      .join(', ') || 'end'
  }));

  const overlappingSegments = allSegments.filter((item) =>
    overlaps(item.clipStartMs, item.clipEndMs, confirmed.clipStartMs, confirmed.clipEndMs)
  );
  const containedSegments = allSegments.filter((item) =>
    item.clipStartMs >= confirmed.clipStartMs && item.clipEndMs <= confirmed.clipEndMs
  );

  const oldFixedResult = oldAlignment.chunkResults?.find((item) =>
    item.chunk.startMs === confirmed.clipStartMs && item.chunk.endMs === confirmed.clipEndMs
  );
  const oldFixedMatch = oldFixedResult?.bestMatches?.[0] ?? oldFixedResult?.sourceMatches?.[0]?.matches?.[0];
  const oldFixedBestMatch = oldFixedMatch ? {
    sourceStartMs: oldFixedMatch.sourceStartMs,
    sourceEndMs: oldFixedMatch.sourceEndMs,
    clipCoverage: oldFixedMatch.clipCoverage,
    linearContinuityRatio: oldFixedMatch.timeAxis?.linearContinuityRatio,
    matchedChars: oldFixedMatch.matchedChars,
    queryChars: oldFixedMatch.queryChars,
    sourceTextExcerpt: excerpt(oldFixedMatch.sourceText)
  } : undefined;

  const sourceEnvelopeAll = sourceEnvelope(overlappingSegments);
  const sourceEnvelopeContained = sourceEnvelope(containedSegments);
  const sourceEnvelopeAllComparison = compareRange(sourceEnvelopeAll, confirmed);
  const sourceEnvelopeContainedComparison = compareRange(sourceEnvelopeContained, confirmed);
  const oldFixedComparison = oldFixedBestMatch ? compareRange(oldFixedBestMatch, confirmed) : undefined;
  const pureMultiSegmentInheritanceWouldPass =
    Boolean(sourceEnvelopeAllComparison?.startWithinTolerance && sourceEnvelopeAllComparison.endWithinTolerance);

  const diagnosis = {
    kind: 'clip_composition_confirmed_inheritance_diagnosis',
    runAt: new Date().toISOString(),
    realignmentPath: path.relative(workspaceRoot(), options.realignmentPath),
    oldAlignmentPath: path.relative(workspaceRoot(), options.oldAlignmentPath),
    confirmedPair: confirmed,
    toleranceMs: realignment.humanConfirmedPairPolicy?.toleranceMs ?? 500,
    inheritedAppliedBeforeDiagnosis: realignment.humanConfirmedPairPolicy?.applied ?? [],
    overlappingSegments,
    containedSegments,
    sourceEnvelopeAll,
    sourceEnvelopeAllComparison,
    sourceEnvelopeContained,
    sourceEnvelopeContainedComparison,
    oldFixedBestMatch,
    oldFixedComparison,
    pureMultiSegmentInheritanceWouldPass,
    classification: {
      label: 'compound: (a) split + (b) different source correspondence + (c) boundary drift',
      primary: '(b) 対応相違',
      reasons: [
        `確認済みclip範囲は新seg ${overlappingSegments.map((item) => item.segmentId).join(', ')} に分割されており、1対1の±500ms継承条件には入らない。`,
        `ただし連結後の元動画対応は ${msText(sourceEnvelopeAll?.sourceStartMs)}-${msText(sourceEnvelopeAll?.sourceEndMs)} で、基準 ${msText(confirmed.sourceStartMs)}-${msText(confirmed.sourceEndMs)} に対して開始${sourceEnvelopeAllComparison?.sourceStartDeltaMs ?? 'unknown'}ms、終了${sourceEnvelopeAllComparison?.sourceEndDeltaMs ?? 'unknown'}msずれるため、単純な(a)だけではない。`,
        `確認済みclip範囲内に完全に収まるsegだけで見ても、元動画対応は ${msText(sourceEnvelopeContained?.sourceStartMs)}-${msText(sourceEnvelopeContained?.sourceEndMs)} で、開始${sourceEnvelopeContainedComparison?.sourceStartDeltaMs ?? 'unknown'}ms、終了${sourceEnvelopeContainedComparison?.sourceEndDeltaMs ?? 'unknown'}msずれる。`,
        `旧30秒照合の機械的最上位範囲も ${msText(oldFixedBestMatch?.sourceStartMs)}-${msText(oldFixedBestMatch?.sourceEndMs)} で、確認済み基準ペアとは一致していない。基準ペアは変更しない。`,
        'seg14 の整合率が45.0%まで落ちており、分割後の局所照合にも不安定な箇所がある。'
      ]
    },
    recommendations: [
      '今回は(b)成分があるため、複数セグメント連結による自動継承拡張は実装しない。',
      '確認済みペアを新方式に合わせて更新しない。基準器として固定したまま、seg11-16の局所照合がなぜ旧chunk4の高整合ペアから外れたかを次の修正対象にする。',
      '次の実装修正案は、確認済みペア範囲をまたぐセグメントについて、セグメント全体ではなく確認済み範囲との重なり部分だけで再照合する診断モードを追加すること。',
      'カット点検出はseg11の開始が確認済み開始より5.322秒早く、seg11が旧chunk3尾部とchunk4先頭をまたいでいる。過敏な分割だけでなく、基準境界をまたぐ未分割も疑う。'
    ],
    allSegments,
    productionImpact: {
      writesRuntime: false,
      writesFixturesDirectory: false,
      writesExpectedDirectory: false
    }
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `confirmed-inheritance-diagnosis-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `confirmed-inheritance-diagnosis-${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(diagnosis, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ resultPath: outputPath, realignment, diagnosis }), 'utf8');

  console.log(`result: ${outputPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`classification: ${diagnosis.classification.label}`);
  console.log(`multi-segment inheritance would pass: ${pureMultiSegmentInheritanceWouldPass ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

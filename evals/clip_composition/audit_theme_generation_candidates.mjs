#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
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
  return {
    inputPath: resolvePath(required(values, 'input')),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    title: values.get('title')?.trim() || ''
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function isPartialExtraction(value) {
  const status = value && typeof value === 'object'
    ? String(value.status ?? '')
    : String(value ?? '');
  return status.includes('partial');
}

function themeRanges(theme, fallbackSourceVideoId) {
  if (Array.isArray(theme.evidenceRanges)) {
    return theme.evidenceRanges
      .filter((range) => (
        range
        && typeof range === 'object'
        && Number.isFinite(range.sourceStartMs)
        && Number.isFinite(range.sourceEndMs)
        && range.sourceEndMs > range.sourceStartMs
      ))
      .map((range) => ({
        sourceVideoId: String(range.sourceVideoId || theme.sourceVideoId || fallbackSourceVideoId || ''),
        sourceStartMs: range.sourceStartMs,
        sourceEndMs: range.sourceEndMs,
        supportingSpeechIds: Array.isArray(range.supportingSpeechIds) ? range.supportingSpeechIds : []
      }));
  }
  if (
    Number.isFinite(theme.sourceStartMs)
    && Number.isFinite(theme.sourceEndMs)
    && theme.sourceEndMs > theme.sourceStartMs
  ) {
    return [{
      sourceVideoId: String(theme.sourceVideoId || fallbackSourceVideoId || ''),
      sourceStartMs: theme.sourceStartMs,
      sourceEndMs: theme.sourceEndMs,
      supportingSpeechIds: Array.isArray(theme.supportingSpeechIds) ? theme.supportingSpeechIds : []
    }];
  }
  return [];
}

function rangeDuration(range) {
  return range.sourceEndMs - range.sourceStartMs;
}

function overlapMs(left, right) {
  if (left.sourceVideoId !== right.sourceVideoId) {
    return 0;
  }
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function analyze(output) {
  const themes = Array.isArray(output.themes) ? output.themes : [];
  const fallbackSourceVideoId = output.windowingResult?.windows?.[0]?.sourceVideoId ?? '';
  const candidates = themes.map((theme, index) => {
    const ranges = themeRanges(theme, fallbackSourceVideoId);
    return {
      index: index + 1,
      themeId: theme.themeId ?? '',
      title: String(theme.title ?? ''),
      reason: String(theme.reason ?? theme.summary ?? theme.whyItCanBeClipped ?? ''),
      rangeCount: ranges.length,
      totalEvidenceDurationMs: ranges.reduce((total, range) => total + rangeDuration(range), 0),
      ranges
    };
  });

  const rangeRecords = candidates.flatMap((candidate) =>
    candidate.ranges.map((range, rangeIndex) => ({
      candidateIndex: candidate.index,
      title: candidate.title,
      rangeIndex: rangeIndex + 1,
      ...range
    }))
  );
  const overlapPairs = [];
  const sameRangePairs = [];
  for (let leftIndex = 0; leftIndex < rangeRecords.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rangeRecords.length; rightIndex += 1) {
      const left = rangeRecords[leftIndex];
      const right = rangeRecords[rightIndex];
      if (left.candidateIndex === right.candidateIndex) {
        continue;
      }
      const overlap = overlapMs(left, right);
      if (overlap <= 0) {
        continue;
      }
      const pair = {
        leftCandidateIndex: left.candidateIndex,
        leftTitle: left.title,
        leftRange: {
          sourceVideoId: left.sourceVideoId,
          sourceStartMs: left.sourceStartMs,
          sourceEndMs: left.sourceEndMs
        },
        rightCandidateIndex: right.candidateIndex,
        rightTitle: right.title,
        rightRange: {
          sourceVideoId: right.sourceVideoId,
          sourceStartMs: right.sourceStartMs,
          sourceEndMs: right.sourceEndMs
        },
        overlapMs: overlap
      };
      overlapPairs.push(pair);
      if (
        left.sourceVideoId === right.sourceVideoId
        && left.sourceStartMs === right.sourceStartMs
        && left.sourceEndMs === right.sourceEndMs
      ) {
        sameRangePairs.push(pair);
      }
    }
  }

  const partialWindowCount = Array.isArray(output.windowingResult?.windows)
    ? output.windowingResult.windows.filter((window) => isPartialExtraction(window.extractionStatus)).length
    : 0;

  return {
    candidateCount: candidates.length,
    rangeCount: rangeRecords.length,
    missingRangeCandidates: candidates.filter((candidate) => candidate.rangeCount === 0),
    multiRangeCandidates: candidates.filter((candidate) => candidate.rangeCount > 1),
    candidatesByEvidenceDurationDesc: [...candidates].sort((left, right) =>
      right.totalEvidenceDurationMs - left.totalEvidenceDurationMs || left.index - right.index
    ),
    overlapPairs,
    sameRangePairs,
    partialWindowCount,
    candidates
  };
}

function rangeText(range) {
  return `${range.sourceVideoId || '-'} ${msText(range.sourceStartMs)}-${msText(range.sourceEndMs)}`;
}

function candidateRangeText(candidate) {
  if (candidate.ranges.length === 0) {
    return '-';
  }
  return candidate.ranges.map(rangeText).join('<br>');
}

function buildMarkdown(report) {
  const lines = [
    '# theme generation candidate audit',
    '',
    `- 対象: ${report.title || report.inputPath}`,
    `- 入力: ${report.inputPath}`,
    `- 出力ID: ${report.outputId}`,
    `- 候補数: ${report.analysis.candidateCount}`,
    `- 根拠範囲数: ${report.analysis.rangeCount}`,
    `- LLM呼び出し: なし`,
    `- 人間確認HTML生成: なし`,
    `- fixture/expected作成: なし`,
    '',
    '## 処理の意味',
    '',
    '- これは、完走済みのテーマ生成結果を人間確認へ渡す前に見る機械監査。',
    '- 候補の面白さや採否は判定しない。',
    '- 合成スコア、重み付け、独自係数は作らない。',
    '- 途中切れ、根拠範囲なし、根拠範囲の重なり、複数根拠範囲だけを事実として出す。',
    '',
    '## 確認結果',
    '',
    '| 項目 | 結果 |',
    '| --- | --- |',
    `| 途中切れ窓 | ${report.analysis.partialWindowCount} |`,
    `| 根拠範囲なし候補 | ${report.analysis.missingRangeCandidates.length} |`,
    `| 複数根拠範囲候補 | ${report.analysis.multiRangeCandidates.length} |`,
    `| 根拠範囲が完全一致する候補ペア | ${report.analysis.sameRangePairs.length} |`,
    `| 根拠範囲が重なる候補ペア | ${report.analysis.overlapPairs.length} |`,
    '',
    '## 人間確認へ進める前の扱い',
    '',
    '- この監査だけでは人間確認を開始しない。',
    '- 人間確認に出す場合は、確認目的、件数、見る媒体、回答形式を先に決める。',
    '- 根拠範囲が重なる候補は、同じ音声を重複して見せない。必要なら非重複部分または前後文脈を見る確認に作り直す。',
    '- 複数根拠範囲は、同じ話題が複数箇所に出ている場合は正常。別話題を広く囲っている場合は候補生成の失敗として再実走対象にする。',
    '',
    '## 候補一覧',
    '',
    '| # | 候補 | 根拠範囲 | 根拠範囲合計 | 根拠数 |',
    '| ---: | --- | --- | ---: | ---: |'
  ];
  for (const candidate of report.analysis.candidates) {
    lines.push(`| ${candidate.index} | ${candidate.title} | ${candidateRangeText(candidate)} | ${candidate.totalEvidenceDurationMs}ms | ${candidate.rangeCount} |`);
  }
  lines.push('');
  lines.push('## 根拠範囲の重なり');
  lines.push('');
  if (report.analysis.overlapPairs.length === 0) {
    lines.push('- なし');
  } else {
    lines.push('| 左候補 | 右候補 | 重なり |');
    lines.push('| --- | --- | ---: |');
    for (const pair of report.analysis.overlapPairs) {
      lines.push(`| #${pair.leftCandidateIndex} ${pair.leftTitle}<br>${rangeText(pair.leftRange)} | #${pair.rightCandidateIndex} ${pair.rightTitle}<br>${rangeText(pair.rightRange)} | ${pair.overlapMs}ms |`);
    }
  }
  lines.push('');
  lines.push('## 根拠範囲が長い順');
  lines.push('');
  lines.push('| # | 候補 | 根拠範囲合計 |');
  lines.push('| ---: | --- | ---: |');
  for (const candidate of report.analysis.candidatesByEvidenceDurationDesc) {
    lines.push(`| ${candidate.index} | ${candidate.title} | ${candidate.totalEvidenceDurationMs}ms |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  if (!existsSync(options.inputPath)) {
    throw new Error(`入力JSONがありません: ${options.inputPath}`);
  }
  const output = await readJson(options.inputPath);
  const analysis = analyze(output);
  const report = {
    kind: 'theme_generation_candidate_audit',
    runAt: new Date().toISOString(),
    outputId: options.outputId,
    title: options.title,
    inputPath: relative(options.inputPath),
    llmCall: false,
    createsHumanReviewPackage: false,
    createsFixtureOrExpected: false,
    analysis
  };
  const outputDir = path.join(evalRoot, 'outputs', 'theme-generation-audit');
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation-audit');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `${options.outputId}.json`);
  const reportPath = path.join(reportDir, `${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildMarkdown(report), 'utf8');
  console.log(`output: ${relative(outputPath)}`);
  console.log(`report: ${relative(reportPath)}`);
  console.log(`candidates: ${analysis.candidateCount}`);
  console.log(`overlap pairs: ${analysis.overlapPairs.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  reviewPath: string;
  decisionPath: string;
  outputId: string;
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  multicutPartIndex?: number;
  clipStartMs?: number;
  clipEndMs?: number;
};

type ReviewPacket = {
  targetId: string;
  sourceId?: string;
  expectedFileDraft?: {
    fixtureId?: string;
    expectedCuts?: ExpectedCut[];
  };
};

type DecisionFile = {
  kind?: string;
  fixtureId?: string;
  humanConfirmation?: {
    allChunksConfirmed?: boolean;
    checkedBy?: string;
    checkedAt?: string;
    note?: string;
  };
  fixedTheme?: {
    title?: string;
    summary?: string;
    compositionNote?: string;
  };
  chunks?: Array<{
    cutIndex: number;
    status?: 'confirmed' | 'uncertain' | 'rejected' | 'pending';
    clipRange?: {
      startMs?: number;
      endMs?: number;
    };
    sourceRange?: {
      startMs?: number;
      endMs?: number;
    };
    visualCheckVideoPath?: string;
    humanNote?: string;
  }>;
};

type Inspection = {
  kind: 'clip_composition_multicut_human_decision_inspection';
  runAt: string;
  reviewPath: string;
  decisionPath: string;
  targetId: string;
  sourceId?: string;
  fixtureId?: string;
  readyForFreeze: boolean;
  issueCount: number;
  issues: string[];
  confirmedCutIndexes: number[];
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    meaning: string;
    details?: Record<string, unknown>;
  }>;
  freezeCommandWhenReady: string[];
  productionImpact: {
    writesRuntime: false;
    touchesProductionUi: false;
    touchesProductionApi: false;
    touchesProductionQueue: false;
    touchesDatabase: false;
    writesExpectedDirectory: false;
    writesFixturesDirectory: false;
  };
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

  const reviewPath = values.get('review')?.trim();
  if (!reviewPath) {
    throw new Error('--review を指定してください');
  }
  const decisionPath = values.get('decision')?.trim();
  if (!decisionPath) {
    throw new Error('--decision を指定してください');
  }

  return {
    reviewPath: resolveWorkspacePath(reviewPath),
    decisionPath: resolveWorkspacePath(decisionPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function expectedCutsFrom(review: ReviewPacket): ExpectedCut[] {
  const cuts = review.expectedFileDraft?.expectedCuts;
  if (!Array.isArray(cuts) || cuts.length === 0) {
    throw new Error('reviewにexpectedCuts草案がありません');
  }
  return cuts;
}

function validateDecision(review: ReviewPacket, decision: DecisionFile): Pick<Inspection, 'readyForFreeze' | 'issueCount' | 'issues' | 'confirmedCutIndexes' | 'checks'> {
  const expectedCuts = expectedCutsFrom(review);
  const checks: Inspection['checks'] = [];
  const issues: string[] = [];
  const chunks = decision.chunks ?? [];
  const chunkByIndex = new Map<number, NonNullable<DecisionFile['chunks']>[number]>();

  for (const chunk of chunks) {
    if (chunkByIndex.has(chunk.cutIndex)) {
      issues.push(`chunk ${chunk.cutIndex + 1} が重複しています`);
    }
    chunkByIndex.set(chunk.cutIndex, chunk);
  }

  const expectedIndexes = expectedCuts.map((cut, index) => typeof cut.multicutPartIndex === 'number' ? cut.multicutPartIndex : index);
  const expectedIndexSet = new Set(expectedIndexes);
  const confirmedCutIndexes: number[] = [];

  if (decision.humanConfirmation?.allChunksConfirmed !== true) {
    issues.push('humanConfirmation.allChunksConfirmed が true ではありません');
  }
  if (!decision.humanConfirmation?.checkedBy?.trim()) {
    issues.push('humanConfirmation.checkedBy が未入力です');
  }
  if (!decision.humanConfirmation?.checkedAt?.trim()) {
    issues.push('humanConfirmation.checkedAt が未入力です');
  }
  if (!decision.fixedTheme?.title?.trim()) {
    issues.push('fixedTheme.title が未入力です');
  }
  if (!decision.fixedTheme?.summary?.trim()) {
    issues.push('fixedTheme.summary が未入力です');
  }

  for (const [expectedOrdinal, expected] of expectedCuts.entries()) {
    const expectedIndex = expectedIndexes[expectedOrdinal] ?? expectedOrdinal;
    const chunk = chunkByIndex.get(expectedIndex);
    if (!chunk) {
      issues.push(`expected区間 ${expectedOrdinal + 1} に対応するchunk ${expectedIndex + 1} がありません`);
      continue;
    }
    if (chunk.status !== 'confirmed') {
      issues.push(`chunk ${expectedIndex + 1} が confirmed ではありません: ${chunk.status ?? '未入力'}`);
      continue;
    }

    if (typeof chunk.sourceRange?.startMs === 'number' && chunk.sourceRange.startMs !== expected.sourceStartMs) {
      issues.push(`chunk ${expectedIndex + 1} の元動画側開始がexpected草案と一致しません`);
    }
    if (typeof chunk.sourceRange?.endMs === 'number' && chunk.sourceRange.endMs !== expected.sourceEndMs) {
      issues.push(`chunk ${expectedIndex + 1} の元動画側終了がexpected草案と一致しません`);
    }
    if (typeof expected.clipStartMs === 'number' && typeof chunk.clipRange?.startMs === 'number' && chunk.clipRange.startMs !== expected.clipStartMs) {
      issues.push(`chunk ${expectedIndex + 1} の切り抜き側開始がexpected草案と一致しません`);
    }
    if (typeof expected.clipEndMs === 'number' && typeof chunk.clipRange?.endMs === 'number' && chunk.clipRange.endMs !== expected.clipEndMs) {
      issues.push(`chunk ${expectedIndex + 1} の切り抜き側終了がexpected草案と一致しません`);
    }

    confirmedCutIndexes.push(expectedIndex);
  }

  for (const chunk of chunks) {
    if (!expectedIndexSet.has(chunk.cutIndex)) {
      issues.push(`expected草案にないchunk ${chunk.cutIndex + 1} がdecisionに含まれています`);
    }
  }

  checks.push({
    name: '確認状態',
    status: decision.humanConfirmation?.allChunksConfirmed === true ? 'pass' : 'fail',
    meaning: '全チャンクを人間が確認したと明示しているかを確認する。',
    details: decision.humanConfirmation
  });
  checks.push({
    name: '固定テーマ',
    status: decision.fixedTheme?.title?.trim() && decision.fixedTheme?.summary?.trim() ? 'pass' : 'fail',
    meaning: '正解区間から人間が逆算した固定テーマが入力されているかを確認する。',
    details: decision.fixedTheme
  });
  checks.push({
    name: 'チャンク対応',
    status: confirmedCutIndexes.length === expectedCuts.length && chunks.length === expectedCuts.length ? 'pass' : 'fail',
    meaning: '確認JSONのchunk件数と番号がexpected草案に対応しているかを確認する。',
    details: {
      expectedCutCount: expectedCuts.length,
      decisionChunkCount: chunks.length,
      confirmedCutIndexes
    }
  });
  checks.push({
    name: '時刻対応',
    status: issues.some((issue) => issue.includes('開始がexpected草案と一致しません') || issue.includes('終了がexpected草案と一致しません')) ? 'fail' : 'pass',
    meaning: '確認JSONに時刻範囲がある場合、expected草案の時刻と一致しているかを確認する。'
  });

  const readyForFreeze = issues.length === 0 && confirmedCutIndexes.length === expectedCuts.length;
  return {
    readyForFreeze,
    issueCount: issues.length,
    issues,
    confirmedCutIndexes,
    checks
  };
}

function buildInspection(input: {
  options: CliOptions;
  review: ReviewPacket;
  decision: DecisionFile;
}): Inspection {
  const validation = validateDecision(input.review, input.decision);
  const fixtureId = input.decision.fixtureId ?? input.review.expectedFileDraft?.fixtureId;
  return {
    kind: 'clip_composition_multicut_human_decision_inspection',
    runAt: new Date().toISOString(),
    reviewPath: relativeWorkspacePath(input.options.reviewPath),
    decisionPath: relativeWorkspacePath(input.options.decisionPath),
    targetId: input.review.targetId,
    ...(input.review.sourceId ? { sourceId: input.review.sourceId } : {}),
    ...(fixtureId ? { fixtureId } : {}),
    ...validation,
    freezeCommandWhenReady: [
      'runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts',
      `--review ${relativeWorkspacePath(input.options.reviewPath)}`,
      '--target evals/clip_composition/stt-targets/r_ztjHaHmcg.json',
      '--sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto',
      `--decision ${relativeWorkspacePath(input.options.decisionPath)}`,
      '--writeFixture true',
      '--outputId 20260705-v001'
    ],
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false,
      writesExpectedDirectory: false,
      writesFixturesDirectory: false
    }
  };
}

function buildReport(inspection: Inspection, resultPath: string): string {
  const lines = [
    '# 複数区間expected 人間確認JSON検査',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- decision: ${inspection.decisionPath}`,
    `- ready for freeze: ${inspection.readyForFreeze ? 'yes' : 'no'}`,
    `- issues: ${inspection.issueCount}`,
    '',
    '## 検査結果',
    '',
    '| status | check | meaning |',
    '| --- | --- | --- |'
  ];

  for (const check of inspection.checks) {
    lines.push(`| ${check.status} | ${check.name} | ${check.meaning} |`);
  }

  lines.push('');
  lines.push('## 問題');
  lines.push('');
  if (inspection.issues.length === 0) {
    lines.push('- なし');
  } else {
    for (const issue of inspection.issues) {
      lines.push(`- ${issue}`);
    }
  }

  lines.push('');
  lines.push('## 固定可能になった後のコマンド');
  lines.push('');
  lines.push('```bash');
  lines.push(inspection.freezeCommandWhenReady.join(' \\\n  '));
  lines.push('```');
  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- fixtures/ への書き込みなし');
  lines.push('- expected/ への書き込みなし');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const review = await readJson<ReviewPacket>(options.reviewPath);
  const decision = await readJson<DecisionFile>(options.decisionPath);
  const inspection = buildInspection({ options, review, decision });

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const fixtureId = sanitizePathPart(inspection.fixtureId ?? `${inspection.targetId}_multicut_review_v001`);
  const resultPath = path.join(outputDir, `multicut-human-decision-inspection-${fixtureId}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `multicut-human-decision-inspection-${fixtureId}-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(inspection, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(inspection, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`ready for freeze: ${inspection.readyForFreeze ? 'yes' : 'no'}`);
  console.log(`issues: ${inspection.issueCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

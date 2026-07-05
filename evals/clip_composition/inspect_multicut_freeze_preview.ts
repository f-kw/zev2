import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  previewPath: string;
  outputId: string;
};

type CheckStatus = 'pass' | 'fail' | 'warn';

type CheckItem = {
  name: string;
  status: CheckStatus;
  meaning: string;
  details?: Record<string, unknown>;
};

type PreviewInspection = {
  kind: 'clip_composition_multicut_freeze_preview_inspection';
  runAt: string;
  previewPath: string;
  fixtureId: string;
  structureValid: boolean;
  fixtureWriteReady: boolean;
  expectedNotFrozenYet: boolean;
  checks: CheckItem[];
  summary: {
    passCount: number;
    warnCount: number;
    failCount: number;
    meaning: string;
  };
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

  const previewPath = values.get('preview')?.trim();
  if (!previewPath) {
    throw new Error('--preview に凍結preview JSONを指定してください');
  }

  return {
    previewPath: resolveWorkspacePath(previewPath),
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

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberFrom(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanFrom(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function addCheck(checks: CheckItem[], item: CheckItem): void {
  checks.push(item);
}

function pathStartsWith(child: string | undefined, parent: string): boolean {
  if (!child) {
    return false;
  }
  const resolvedChild = path.resolve(workspaceRoot(), child);
  const resolvedParent = path.resolve(workspaceRoot(), parent);
  return resolvedChild === resolvedParent || resolvedChild.startsWith(`${resolvedParent}${path.sep}`);
}

function workspacePathFromPreviewPath(filePath: unknown): string | undefined {
  const text = stringFrom(filePath);
  if (!text) {
    return undefined;
  }
  return path.isAbsolute(text) ? text : path.join(workspaceRoot(), text);
}

function previewPathExists(filePath: unknown): boolean {
  const resolvedPath = workspacePathFromPreviewPath(filePath);
  return resolvedPath ? existsSync(resolvedPath) : false;
}

function segmentIds(segments: unknown[]): Set<number> {
  return new Set(segments.map((segment) => numberFrom(recordFrom(segment).id)).filter((id): id is number => id !== undefined));
}

function textPreviewForGroup(segments: unknown[], group: number[]): string {
  const ids = new Set(group);
  return segments
    .map((segment) => recordFrom(segment))
    .filter((segment) => {
      const id = numberFrom(segment.id);
      return id !== undefined && ids.has(id);
    })
    .map((segment) => stringFrom(segment.text) ?? '')
    .join('')
    .slice(0, 160);
}

function inspectPreview(previewPath: string, preview: unknown): PreviewInspection {
  const checks: CheckItem[] = [];
  const root = recordFrom(preview);
  const fixtureId = stringFrom(root.fixtureId) ?? 'unknown_fixture';
  const plannedWrites = recordFrom(root.plannedWrites);
  const fixtureDraft = recordFrom(root.fixtureDraft);
  const transcriptDraft = recordFrom(root.transcriptDraft);
  const expectedDraft = recordFrom(root.expectedDraft);
  const themesDraftValue = root.themesDraft;
  const themesDraft = recordFrom(themesDraftValue);
  const expectedCuts = arrayFrom(expectedDraft.expectedCuts);
  const transcriptSegments = arrayFrom(transcriptDraft.segments);
  const speechUnitGroups = arrayFrom(transcriptDraft.speechUnitGroups)
    .map((group) => arrayFrom(group).map((item) => numberFrom(item)).filter((item): item is number => item !== undefined));
  const ids = segmentIds(transcriptSegments);
  const fixtureWriteReady = booleanFrom(root.fixtureWriteReady) === true;
  const humanConfirmed = booleanFrom(root.humanConfirmed) === true;
  const writeFixture = booleanFrom(root.writeFixture) === true;

  addCheck(checks, {
    name: 'preview種別',
    status: root.kind === 'clip_composition_multicut_fixture_freeze_preview' ? 'pass' : 'fail',
    meaning: '凍結previewとして読めるJSONであることを確認する。',
    details: { kind: root.kind }
  });

  addCheck(checks, {
    name: '書き込み先の範囲',
    status: (
      pathStartsWith(stringFrom(plannedWrites.fixturePath), 'evals/clip_composition/fixtures') &&
      pathStartsWith(stringFrom(plannedWrites.transcriptPath), 'evals/clip_composition/fixtures') &&
      pathStartsWith(stringFrom(plannedWrites.themesPath), 'evals/clip_composition/fixtures') &&
      pathStartsWith(stringFrom(plannedWrites.expectedPath), 'evals/clip_composition/expected')
    ) ? 'pass' : 'fail',
    meaning: 'fixture固定時の書き込み先が評価環境内に閉じていることを確認する。',
    details: plannedWrites
  });

  addCheck(checks, {
    name: '本体未接続',
    status: recordFrom(root.productionImpact).writesRuntime === false &&
      recordFrom(root.productionImpact).touchesProductionUi === false &&
      recordFrom(root.productionImpact).touchesProductionApi === false &&
      recordFrom(root.productionImpact).touchesProductionQueue === false &&
      recordFrom(root.productionImpact).touchesDatabase === false
      ? 'pass'
      : 'fail',
    meaning: 'preview生成が本番UI、API、キュー、DB、runtimeに触れない前提であることを確認する。'
  });

  addCheck(checks, {
    name: 'expected未固定',
    status: !writeFixture && !fixtureWriteReady && !humanConfirmed ? 'pass' : (writeFixture ? 'fail' : 'warn'),
    meaning: '人間確認前のpreviewではexpectedやfixtureを書き込まないことを確認する。',
    details: { writeFixture, fixtureWriteReady, humanConfirmed, missingHumanInputs: root.missingHumanInputs }
  });

  const plannedFileStates = [
    { label: 'fixture', path: stringFrom(plannedWrites.fixturePath), exists: previewPathExists(plannedWrites.fixturePath) },
    { label: 'transcript', path: stringFrom(plannedWrites.transcriptPath), exists: previewPathExists(plannedWrites.transcriptPath) },
    { label: 'themes', path: stringFrom(plannedWrites.themesPath), exists: previewPathExists(plannedWrites.themesPath) },
    { label: 'expected', path: stringFrom(plannedWrites.expectedPath), exists: previewPathExists(plannedWrites.expectedPath) }
  ];
  const createdPlannedFiles = plannedFileStates.filter((item) => item.exists);
  addCheck(checks, {
    name: '固定ファイル未作成',
    status: !fixtureWriteReady && createdPlannedFiles.length > 0 ? 'fail' : (!fixtureWriteReady ? 'pass' : 'warn'),
    meaning: '凍結不可のpreviewで、予定されたfixture/expectedファイルが実際には作られていないことを確認する。',
    details: {
      fixtureWriteReady,
      plannedFileStates,
      createdPlannedFileCount: createdPlannedFiles.length
    }
  });

  addCheck(checks, {
    name: 'fixtureメタデータ',
    status: stringFrom(fixtureDraft.fixtureId) === fixtureId &&
      stringFrom(fixtureDraft.transcriptPath) === 'transcript.json' &&
      stringFrom(fixtureDraft.themesPath) === 'themes.json' &&
      stringFrom(fixtureDraft.selectedThemeId) === 'theme_multicut_review_1'
      ? 'pass'
      : 'fail',
    meaning: '凍結後にrun_evalがfixture、文字起こし、テーマ候補を読めるメタデータであることを確認する。',
    details: {
      fixtureId: fixtureDraft.fixtureId,
      transcriptPath: fixtureDraft.transcriptPath,
      themesPath: fixtureDraft.themesPath,
      selectedThemeId: fixtureDraft.selectedThemeId
    }
  });

  addCheck(checks, {
    name: '文字起こし構造',
    status: transcriptDraft.kind === 'transcript_json' &&
      transcriptSegments.length > 0 &&
      speechUnitGroups.length === expectedCuts.length &&
      speechUnitGroups.every((group) => group.length > 0 && group.every((id) => ids.has(id)))
      ? 'pass'
      : 'fail',
    meaning: '複数区間の各期待区間に対応する発話まとまりがあり、発話IDが実在することを確認する。',
    details: {
      kind: transcriptDraft.kind,
      segmentCount: transcriptSegments.length,
      speechUnitGroupCount: speechUnitGroups.length,
      expectedCutCount: expectedCuts.length
    }
  });

  const segmentRangeIssues: Array<Record<string, unknown>> = [];
  for (const [index, cutValue] of expectedCuts.entries()) {
    const cut = recordFrom(cutValue);
    const sourceStartMs = numberFrom(cut.sourceStartMs);
    const sourceEndMs = numberFrom(cut.sourceEndMs);
    const group = speechUnitGroups[index] ?? [];
    for (const segmentValue of transcriptSegments) {
      const segment = recordFrom(segmentValue);
      const id = numberFrom(segment.id);
      if (id === undefined || !group.includes(id)) {
        continue;
      }
      const startMs = numberFrom(segment.startMs);
      const endMs = numberFrom(segment.endMs);
      if (
        sourceStartMs === undefined ||
        sourceEndMs === undefined ||
        startMs === undefined ||
        endMs === undefined ||
        startMs < sourceStartMs ||
        endMs > sourceEndMs
      ) {
        segmentRangeIssues.push({
          partIndex: index,
          segmentId: id,
          segmentStartMs: startMs,
          segmentEndMs: endMs,
          expectedStartMs: sourceStartMs,
          expectedEndMs: sourceEndMs
        });
      }
    }
  }

  addCheck(checks, {
    name: '発話時刻の範囲',
    status: segmentRangeIssues.length === 0 ? 'pass' : 'fail',
    meaning: '各発話が対応するexpected区間の中に収まっていることを確認する。',
    details: { issueCount: segmentRangeIssues.length, issues: segmentRangeIssues.slice(0, 10) }
  });

  const invalidExpectedCuts = expectedCuts
    .map((cut, index) => ({ index, cut: recordFrom(cut) }))
    .filter(({ cut }) => {
      const start = numberFrom(cut.sourceStartMs);
      const end = numberFrom(cut.sourceEndMs);
      return start === undefined || end === undefined || end <= start;
    });
  const compositionReadyCuts = expectedCuts.filter((cut) => recordFrom(cut).usableForCompositionPromptEval === true);
  addCheck(checks, {
    name: '期待区間構造',
    status: invalidExpectedCuts.length === 0 && expectedCuts.length === speechUnitGroups.length ? 'pass' : 'fail',
    meaning: 'expected草案の区間数、開始終了、composition評価利用状態を確認する。',
    details: {
      expectedCutCount: expectedCuts.length,
      speechUnitGroupCount: speechUnitGroups.length,
      invalidExpectedCutCount: invalidExpectedCuts.length,
      compositionReadyCutCount: compositionReadyCuts.length
    }
  });

  if (themesDraftValue === null) {
    addCheck(checks, {
      name: '固定テーマ',
      status: 'warn',
      meaning: '人間が正解区間から逆算した固定テーマがまだないため、fixture固定前に入力が必要。',
      details: { themesDraft: null }
    });
  } else {
    const themes = arrayFrom(themesDraft.themes);
    const selectedTheme = themes.map(recordFrom).find((theme) => theme.id === 'theme_multicut_review_1');
    const relatedSpeechIds = arrayFrom(selectedTheme?.relatedSpeechIds).map(numberFrom).filter((id): id is number => id !== undefined);
    const unknownIds = relatedSpeechIds.filter((id) => !ids.has(id));
    addCheck(checks, {
      name: '固定テーマ',
      status: themesDraft.kind === 'theme_json' && selectedTheme && unknownIds.length === 0 ? 'pass' : 'fail',
      meaning: '固定テーマがrun_evalで読める形で、実在する発話IDだけを参照していることを確認する。',
      details: {
        kind: themesDraft.kind,
        themeCount: themes.length,
        relatedSpeechIdCount: relatedSpeechIds.length,
        unknownSpeechIdCount: unknownIds.length
      }
    });
  }

  const summaryRows = arrayFrom(root.cutTranscriptSummary).map(recordFrom);
  const summaryMismatches = summaryRows.filter((item, index) => {
    const group = speechUnitGroups[index] ?? [];
    return numberFrom(item.segmentCount) !== group.length ||
      stringFrom(item.textPreview) !== textPreviewForGroup(transcriptSegments, group);
  });
  addCheck(checks, {
    name: 'preview要約',
    status: summaryMismatches.length === 0 && summaryRows.length === expectedCuts.length ? 'pass' : 'fail',
    meaning: '人間向けpreviewの発話数と表示テキストが、内部の文字起こし草案と一致していることを確認する。',
    details: {
      summaryRowCount: summaryRows.length,
      mismatchCount: summaryMismatches.length
    }
  });

  const failCount = checks.filter((check) => check.status === 'fail').length;
  const warnCount = checks.filter((check) => check.status === 'warn').length;
  const passCount = checks.filter((check) => check.status === 'pass').length;
  const structureValid = failCount === 0;
  const expectedNotFrozenYet = !writeFixture && !humanConfirmed && booleanFrom(root.fixtureWriteReady) === false;

  return {
    kind: 'clip_composition_multicut_freeze_preview_inspection',
    runAt: new Date().toISOString(),
    previewPath: relativeWorkspacePath(previewPath),
    fixtureId,
    structureValid,
    fixtureWriteReady,
    expectedNotFrozenYet,
    checks,
    summary: {
      passCount,
      warnCount,
      failCount,
      meaning: structureValid
        ? '凍結previewの構造は有効。固定テーマと人間確認が揃うまでexpectedへは固定しない。'
        : '凍結previewに構造上の問題があるため、fixture固定前に修正が必要。'
    },
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

function buildReport(inspection: PreviewInspection, resultPath: string): string {
  const lines = [
    '# 複数区間fixture凍結preview 構造検査',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- preview: ${inspection.previewPath}`,
    `- fixture ID: ${inspection.fixtureId}`,
    `- 構造有効: ${inspection.structureValid ? 'yes' : 'no'}`,
    `- fixture書き込み可能: ${inspection.fixtureWriteReady ? 'yes' : 'no'}`,
    `- expected未固定: ${inspection.expectedNotFrozenYet ? 'yes' : 'no'}`,
    `- summary: ${inspection.summary.meaning}`,
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
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  lines.push('- fixtures/ への書き込みなし');
  lines.push('- expected/ への書き込みなし');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const preview = await readJson(options.previewPath);
  const inspection = inspectPreview(options.previewPath, preview);

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `multicut-freeze-preview-inspection-${inspection.fixtureId}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `multicut-freeze-preview-inspection-${inspection.fixtureId}-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(inspection, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(inspection, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`structure valid: ${inspection.structureValid ? 'yes' : 'no'}`);
  console.log(`warnings: ${inspection.summary.warnCount}`);
  console.log(`failures: ${inspection.summary.failCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

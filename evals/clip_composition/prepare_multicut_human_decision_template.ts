import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  reviewPath: string;
  previewPath: string;
  inspectionPath?: string;
  outputId: string;
};

type ReviewPacket = {
  targetId: string;
  title?: string;
  sourceId?: string;
  draftExpectedFixtureId?: string;
  expectedCutsDraft?: Array<{
    cutIndex: number;
    clipStartMs: number;
    clipEndMs: number;
    sourceStartMs: number;
    sourceEndMs: number;
    evidence?: {
      visualVerification?: {
        status?: string;
        uploadedVideoPath?: string;
        reportPath?: string;
        notes?: string[];
      };
    };
  }>;
  humanReviewChecklist?: string[];
};

type FreezePreview = {
  fixtureId?: string;
  plannedWrites?: {
    fixturePath?: string;
    transcriptPath?: string;
    themesPath?: string;
    expectedPath?: string;
  };
  cutTranscriptSummary?: Array<{
    partIndex: number;
    sourceStartMs: number;
    sourceEndMs: number;
    segmentCount: number;
    textPreview: string;
  }>;
};

type Inspection = {
  structureValid?: boolean;
  expectedNotFrozenYet?: boolean;
  summary?: {
    passCount?: number;
    warnCount?: number;
    failCount?: number;
    meaning?: string;
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
  const previewPath = values.get('preview')?.trim();
  if (!previewPath) {
    throw new Error('--preview を指定してください');
  }

  return {
    reviewPath: resolveWorkspacePath(reviewPath),
    previewPath: resolveWorkspacePath(previewPath),
    ...(values.get('inspection')?.trim() ? { inspectionPath: resolveWorkspacePath(values.get('inspection')!.trim()) } : {}),
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

function msLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function buildTemplate(input: {
  options: CliOptions;
  review: ReviewPacket;
  preview: FreezePreview;
  inspection?: Inspection;
}) {
  const chunks = (input.review.expectedCutsDraft ?? []).map((cut) => {
    const transcript = (input.preview.cutTranscriptSummary ?? []).find((item) => item.partIndex === cut.cutIndex);
    return {
      cutIndex: cut.cutIndex,
      status: 'pending',
      clipRange: {
        startMs: cut.clipStartMs,
        endMs: cut.clipEndMs,
        label: `${msLabel(cut.clipStartMs)}-${msLabel(cut.clipEndMs)}`
      },
      sourceRange: {
        startMs: cut.sourceStartMs,
        endMs: cut.sourceEndMs,
        label: `${msLabel(cut.sourceStartMs)}-${msLabel(cut.sourceEndMs)}`
      },
      visualCheckVideoPath: cut.evidence?.visualVerification?.uploadedVideoPath,
      visualCheckReportPath: cut.evidence?.visualVerification?.reportPath,
      geminiStatus: cut.evidence?.visualVerification?.status,
      notesForHuman: cut.evidence?.visualVerification?.notes ?? [],
      transcriptPreview: transcript?.textPreview ?? '',
      humanNote: ''
    };
  });

  return {
    kind: 'clip_composition_multicut_human_decision_template',
    runAt: new Date().toISOString(),
    targetId: input.review.targetId,
    title: input.review.title,
    sourceId: input.review.sourceId,
    fixtureId: input.preview.fixtureId ?? input.review.draftExpectedFixtureId ?? `${input.review.targetId}_multicut_review_v001`,
    evidenceInputs: {
      reviewPath: relativeWorkspacePath(input.options.reviewPath),
      previewPath: relativeWorkspacePath(input.options.previewPath),
      ...(input.options.inspectionPath ? { inspectionPath: relativeWorkspacePath(input.options.inspectionPath) } : {})
    },
    inspectionSummary: input.inspection?.summary ?? null,
    humanConfirmation: {
      allChunksConfirmed: false,
      checkedBy: '',
      checkedAt: '',
      note: ''
    },
    fixedTheme: {
      title: '',
      summary: '',
      compositionNote: ''
    },
    chunks,
    acceptanceRules: [
      '4つのchunk.statusをすべてconfirmedにする。',
      'humanConfirmation.allChunksConfirmedをtrueにする。',
      'fixedTheme.titleとfixedTheme.summaryを人間が正解区間から逆算して書く。',
      'chunk2はGemini応答の番号ずれがあるため、映像と時刻範囲を重点確認する。',
      '単一区間expectedとして扱わない。'
    ],
    freezeCommandAfterFill: [
      'runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts',
      '--review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json',
      '--target evals/clip_composition/stt-targets/r_ztjHaHmcg.json',
      '--sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto',
      '--decision <this JSON path>',
      '--writeFixture true',
      '--outputId 20260705-v001'
    ],
    plannedWrites: input.preview.plannedWrites ?? {},
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

function buildReport(template: ReturnType<typeof buildTemplate>, resultPath: string): string {
  const lines = [
    '# 複数区間expected 人間確認テンプレート',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- 対象: ${template.targetId}`,
    `- fixture ID: ${template.fixtureId}`,
    '',
    '## 入力すること',
    '',
    '- 4つのchunk.statusを `confirmed` にする。',
    '- `humanConfirmation.allChunksConfirmed` を `true` にする。',
    '- `fixedTheme.title` と `fixedTheme.summary` を人間が書く。',
    '',
    '## 確認対象',
    '',
    '| part | clip | source | video | current |',
    '| ---: | --- | --- | --- | --- |'
  ];

  for (const chunk of template.chunks) {
    lines.push(`| ${chunk.cutIndex + 1} | ${chunk.clipRange.label} | ${chunk.sourceRange.label} | ${chunk.visualCheckVideoPath ?? 'なし'} | ${chunk.status} |`);
  }

  lines.push('');
  lines.push('## 入力後の凍結コマンド');
  lines.push('');
  lines.push('```bash');
  lines.push(template.freezeCommandAfterFill.join(' \\\n  '));
  lines.push('```');
  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- このテンプレート生成ではruntime/、fixtures/、expected/へ書き込まない。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const review = await readJson<ReviewPacket>(options.reviewPath);
  const preview = await readJson<FreezePreview>(options.previewPath);
  const inspection = options.inspectionPath ? await readJson<Inspection>(options.inspectionPath) : undefined;
  const template = buildTemplate({ options, review, preview, inspection });

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const baseName = `multicut-human-decision-template-${sanitizePathPart(template.fixtureId)}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  await writeFile(resultPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(template, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`chunks: ${template.chunks.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

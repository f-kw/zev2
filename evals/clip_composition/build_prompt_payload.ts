import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  promptVersion: string;
  runs: number;
};

type FixtureMetadata = {
  fixtureId: string;
  draftId: string;
  transcriptPath: string;
  themesPath: string;
  selectedThemeId: string;
  sourceUri?: string;
};

type TranscriptArtifact = {
  kind: 'transcript_json';
  sourceUri: string;
  language: string;
  durationSec: number;
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker?: string;
  }>;
  speechUnitGroups: number[][];
};

type ThemeArtifact = {
  kind: 'theme_json';
  sourceUri: string;
  themes: Array<{
    id: string;
    title: string;
    summary: string;
    representativeText: string;
    representativeSpeechIds: number[];
    relatedSpeechIds: number[];
    whyItCanBeClipped: string;
    compositionNote: string;
  }>;
};

type ExpectedFile = {
  draftId: string;
  fixtureId?: string;
  expectedCuts: Array<{
    sourceStartMs: number;
    sourceEndMs: number;
    reason: string;
    verificationStatus?: string;
    usableForCompositionPromptEval?: boolean;
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

  const fixtureId = values.get('fixture')?.trim();
  if (!fixtureId) {
    throw new Error('--fixture を指定してください');
  }

  const rawPromptVersion = values.get('promptVersion')?.trim();
  if (!rawPromptVersion) {
    throw new Error('--promptVersion を指定してください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    promptVersion: normalizePromptVersion(rawPromptVersion),
    runs: parseRuns(values.get('runs'))
  };
}

function parseRuns(value: string | undefined): number {
  const runs = Number.parseInt(value ?? '1', 10);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error('--runs は1以上の整数で指定してください');
  }
  return runs;
}

function normalizePromptVersion(value: string): string {
  return value.startsWith('clip_composition_prompt_')
    ? value
    : `clip_composition_prompt_${value}`;
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}はJSONオブジェクトである必要があります`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}は空でない文字列である必要があります`);
  }
  return value;
}

function validateFixture(value: unknown): FixtureMetadata {
  const record = requireRecord(value, 'fixture');
  return {
    fixtureId: requireString(record.fixtureId, 'fixture ID'),
    draftId: requireString(record.draftId, '下書きID'),
    transcriptPath: requireString(record.transcriptPath, '文字起こしファイルパス'),
    themesPath: requireString(record.themesPath, 'テーマ候補ファイルパス'),
    selectedThemeId: requireString(record.selectedThemeId, '選択済みテーマID'),
    ...(typeof record.sourceUri === 'string' ? { sourceUri: record.sourceUri } : {})
  };
}

function validateTranscript(value: unknown): TranscriptArtifact {
  const record = requireRecord(value, '文字起こし');
  if (record.kind !== 'transcript_json') {
    throw new Error('文字起こしの種類が transcript_json ではありません');
  }
  if (!Array.isArray(record.segments) || record.segments.length === 0) {
    throw new Error('文字起こしに発話がありません');
  }
  if (!Array.isArray(record.speechUnitGroups)) {
    throw new Error('文字起こしに発話まとまりがありません');
  }
  return value as TranscriptArtifact;
}

function validateThemes(value: unknown): ThemeArtifact {
  const record = requireRecord(value, 'テーマ候補');
  if (record.kind !== 'theme_json') {
    throw new Error('テーマ候補の種類が theme_json ではありません');
  }
  if (!Array.isArray(record.themes) || record.themes.length === 0) {
    throw new Error('テーマ候補がありません');
  }
  return value as ThemeArtifact;
}

function selectedTheme(themes: ThemeArtifact, selectedThemeId: string): ThemeArtifact['themes'][number] {
  const theme = themes.themes.find((item) => item.id === selectedThemeId);
  if (!theme) {
    throw new Error(`選択済みテーマが見つかりません: ${selectedThemeId}`);
  }
  return theme;
}

function promptTemplatePath(promptVersion: string): string {
  return path.join(evalRoot, 'prompts', `${promptVersion}.md`);
}

function tokyoTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}+09:00`;
}

function runIdFromTimestamp(runAt: string): string {
  return runAt.replace(/[-:]/g, '').replace('T', '-').replace('+0900', '');
}

function buildModelInput(input: {
  fixture: FixtureMetadata;
  transcript: TranscriptArtifact;
  theme: ThemeArtifact['themes'][number];
}) {
  const relatedSpeechIds = new Set(input.theme.relatedSpeechIds);
  return {
    task: 'fixed_theme_clip_interval_selection',
    fixtureId: input.fixture.fixtureId,
    draftId: input.fixture.draftId,
    sourceUri: input.fixture.sourceUri ?? input.transcript.sourceUri,
    selectedTheme: {
      id: input.theme.id,
      title: input.theme.title,
      summary: input.theme.summary,
      candidateSpeechIds: input.theme.relatedSpeechIds,
      whyItCanBeClipped: input.theme.whyItCanBeClipped,
      compositionNote: input.theme.compositionNote
    },
    transcript: {
      language: input.transcript.language,
      durationSec: input.transcript.durationSec,
      speechUnitGroups: input.transcript.speechUnitGroups,
      segments: input.transcript.segments.map((segment) => ({
        speechId: segment.id,
        sourceStartMs: segment.startMs,
        sourceEndMs: segment.endMs,
        text: segment.text,
        ...(segment.speaker ? { speaker: segment.speaker } : {}),
        isThemeCandidate: relatedSpeechIds.has(segment.id)
      }))
    },
    outputContract: {
      format: 'json_only',
      schema: {
        selectedCuts: [
          {
            sourceStartMs: 'number',
            sourceEndMs: 'number',
            reason: 'string',
            usedSpeechIds: ['number']
          }
        ]
      }
    }
  };
}

function buildPromptMarkdown(promptTemplate: string, modelInput: unknown): string {
  return [
    promptTemplate.trimEnd(),
    '',
    '## 入力JSON',
    '',
    '```json',
    JSON.stringify(modelInput, null, 2),
    '```',
    ''
  ].join('\n');
}

function buildReport(input: {
  fixture: FixtureMetadata;
  promptVersion: string;
  runs: number;
  promptPath: string;
  payloadPath: string;
  expectedPath: string;
  expected: ExpectedFile;
}): string {
  const expected = input.expected.expectedCuts[0];
  return [
    '# clip_composition プロンプト入力レポート',
    '',
    `- fixture: ${input.fixture.fixtureId}`,
    `- 生成系統: llm-${input.promptVersion.replace(/^clip_composition_prompt_/, '')}`,
    `- プロンプト版数: ${input.promptVersion}`,
    `- 予定実行回数: ${input.runs}`,
    `- プロンプト本文: ${input.promptPath}`,
    `- モデル入力JSON: ${input.payloadPath}`,
    `- 採点用期待値: ${input.expectedPath}`,
    '',
    '## 分離方針',
    '',
    '- プロンプト本文とモデル入力JSONには、期待区間を入れない。',
    '- 代表発話本文と代表発話IDもモデル入力JSONには入れない。',
    '- 期待区間は評価実行時の採点専用データとしてだけ読む。',
    '- このスクリプトはLLM APIを呼ばない。',
    '',
    '## 採点側の期待区間',
    '',
    expected
      ? `- ${expected.sourceStartMs}ms - ${expected.sourceEndMs}ms: ${expected.reason}`
      : '- 未設定',
    expected?.verificationStatus
      ? `- 確認状態: ${expected.verificationStatus}`
      : '- 確認状態: 未記録',
    expected?.usableForCompositionPromptEval === true
      ? '- compositionプロンプト評価に使えるか: はい'
      : '- compositionプロンプト評価に使えるか: いいえ',
    ''
  ].join('\n');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const fixture = validateFixture(await readJson(path.join(fixtureDir, 'fixture.json')));
  const transcript = validateTranscript(await readJson(path.join(fixtureDir, fixture.transcriptPath)));
  const themes = validateThemes(await readJson(path.join(fixtureDir, fixture.themesPath)));
  const theme = selectedTheme(themes, fixture.selectedThemeId);
  const expectedPath = path.join(evalRoot, 'expected', `${options.fixtureId}.json`);
  const expected = await readJson<ExpectedFile>(expectedPath);
  const templatePath = promptTemplatePath(options.promptVersion);
  if (!existsSync(templatePath)) {
    throw new Error(`プロンプトテンプレートがありません: ${templatePath}`);
  }
  const promptTemplate = await readFile(templatePath, 'utf8');
  const runAt = tokyoTimestamp(new Date());
  const runId = runIdFromTimestamp(runAt);
  const outputDir = path.join(evalRoot, 'outputs', options.fixtureId, options.promptVersion, runId);
  const reportDir = path.join(evalRoot, 'reports', options.fixtureId, options.promptVersion, runId);
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const modelInput = buildModelInput({ fixture, transcript, theme });
  const payload = {
    kind: 'clip_composition_prompt_payload',
    runAt,
    fixtureId: fixture.fixtureId,
    draftId: fixture.draftId,
    promptVersion: options.promptVersion,
    generationSystem: {
      id: `llm-${options.promptVersion.replace(/^clip_composition_prompt_/, '')}`,
      kind: 'llm',
      intervalGenerator: 'web-gemini+prompt',
      promptVersion: options.promptVersion,
      usesPromptVersionForGeneration: true,
      plannedRuns: options.runs
    },
    llmCall: false,
    promptTemplatePath: path.relative(evalRoot, templatePath),
    modelInput,
    evaluationOnly: {
      expectedPath: path.relative(evalRoot, expectedPath),
      expectedCutCount: expected.expectedCuts.length,
      note: 'このデータはモデルへ渡さず、評価時の採点だけで使う。'
    },
    executionPlan: {
      requestedRuns: options.runs,
      runPurpose: options.runs > 1
        ? '同一fixture、同一プロンプト、同一モデル設定で出力の揺れ幅を測る。'
        : '単回のLLM出力を採点する。'
    }
  };
  const payloadPath = path.join(outputDir, 'prompt-input.json');
  const promptPath = path.join(reportDir, 'prompt.md');
  const reportPath = path.join(reportDir, 'prompt-input-summary.md');
  await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(promptPath, buildPromptMarkdown(promptTemplate, modelInput), 'utf8');
  await writeFile(reportPath, buildReport({
    fixture,
    promptVersion: options.promptVersion,
    runs: options.runs,
    promptPath,
    payloadPath,
    expectedPath,
    expected
  }), 'utf8');

  console.log(`payload: ${payloadPath}`);
  console.log(`prompt: ${promptPath}`);
  console.log(`summary: ${reportPath}`);
  console.log('llm call: no');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

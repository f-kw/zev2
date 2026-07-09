import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureIds: string[];
  promptVersion: string;
  generationSystem: string;
  runs: number;
  requestedThemeCount: number;
  outputId: string;
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  sourceVideoId?: string;
  sourceSttId?: string;
  sourceUrl?: string;
  usableForCompositionPromptEval?: boolean;
};

type ExpectedFile = {
  expectedCuts: ExpectedCut[];
};

type SttTranscript = {
  kind?: string;
  sourceUri?: string;
  language?: string;
  durationSec?: number;
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker?: string;
  }>;
};

type ThemeSource = {
  sourceVideoId: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sttId: string;
  transcriptPath: string;
  transcriptKind: string;
};

type ThemeSegment = {
  speechId: number;
  sourceVideoId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
  sourceSegmentIds: number[];
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
      throw new Error('pnpm-workspace.yaml が見つかりません');
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

  const fixtures = values.get('fixtures')?.trim();
  if (!fixtures) {
    throw new Error('--fixtures にカンマ区切りのfixture IDを指定してください');
  }
  const runs = Number.parseInt(values.get('runs') ?? '3', 10);
  const requestedThemeCount = Number.parseInt(values.get('requestedThemeCount') ?? '8', 10);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error('--runs は1以上の整数で指定してください');
  }
  if (!Number.isInteger(requestedThemeCount) || requestedThemeCount < 1) {
    throw new Error('--requestedThemeCount は1以上の整数で指定してください');
  }
  return {
    fixtureIds: fixtures.split(',').map((item) => sanitizePathPart(item.trim())).filter(Boolean),
    promptVersion: values.get('promptVersion')?.trim() || 'theme_generation_prompt_v001',
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    runs,
    requestedThemeCount,
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
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

async function readSourceTitle(sourceVideoId: string, fixtureId: string): Promise<string | undefined> {
  const candidates = [
    path.join(evalRoot, 'research', 'downloads', fixtureId, 'sources', sourceVideoId, `${sourceVideoId}.info.json`),
    path.join(evalRoot, 'research', 'downloads', fixtureId, `${fixtureId}.info.json`)
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    const record = await readJson<Record<string, unknown>>(candidate);
    if (typeof record.id === 'string' && record.id !== sourceVideoId) {
      continue;
    }
    if (typeof record.title === 'string' && record.title.trim()) {
      return record.title.trim();
    }
  }
  return undefined;
}

function expectedCutsForEval(expected: ExpectedFile): ExpectedCut[] {
  return expected.expectedCuts.filter((cut) => cut.usableForCompositionPromptEval !== false);
}

function sourceSttForFixture(fixtureId: string, cut: ExpectedCut): string {
  if (fixtureId === 'XauLZgnWHtA_part01_partial_material_v001') {
    if (!cut.sourceVideoId) {
      throw new Error('Xau expected cut に sourceVideoId がありません');
    }
    return `XauLZgnWHtA_${cut.sourceVideoId}_youtube_auto_rough`;
  }
  if (!cut.sourceSttId) {
    throw new Error(`${fixtureId} expected cut に sourceSttId がありません`);
  }
  return cut.sourceSttId;
}

async function sourcesForFixture(fixtureId: string, expected: ExpectedFile): Promise<ThemeSource[]> {
  const bySttId = new Map<string, ThemeSource>();
  for (const cut of expectedCutsForEval(expected)) {
    if (!cut.sourceVideoId) {
      throw new Error(`${fixtureId} expected cut に sourceVideoId がありません`);
    }
    const sttId = sourceSttForFixture(fixtureId, cut);
    const transcriptPath = path.join(evalRoot, 'stt', sttId, 'source', 'transcript.json');
    if (!existsSync(transcriptPath)) {
      throw new Error(`元配信STT transcript がありません: ${transcriptPath}`);
    }
    if (!bySttId.has(sttId)) {
      bySttId.set(sttId, {
        sourceVideoId: cut.sourceVideoId,
        sourceUrl: cut.sourceUrl,
        sourceTitle: await readSourceTitle(cut.sourceVideoId, fixtureId),
        sttId,
        transcriptPath,
        transcriptKind: sttId.includes('youtube_auto') ? 'youtube_auto_caption' : 'local_stt'
      });
    }
  }
  return [...bySttId.values()];
}

function compactSegments(sourceVideoId: string, transcript: SttTranscript): ThemeSegment[] {
  const compacted: ThemeSegment[] = [];
  let current: ThemeSegment | undefined;
  const segments = transcript.segments
    .filter((segment) => String(segment.text ?? '').trim())
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const text = String(segment.text ?? '');
    if (!current) {
      current = {
        speechId: compacted.length + 1,
        sourceVideoId,
        sourceStartMs: segment.startMs,
        sourceEndMs: segment.endMs,
        text: '',
        sourceSegmentIds: []
      };
    }
    current.sourceEndMs = Math.max(current.sourceEndMs, segment.endMs);
    current.text += text;
    current.sourceSegmentIds.push(segment.id);
    const next = segments[index + 1];
    const currentEndsByText = /[。！？!?]/.test(text);
    const currentEndsByTime = !next || next.startMs > current.sourceEndMs;
    if (currentEndsByText || currentEndsByTime) {
      compacted.push(current);
      current = undefined;
    }
  }
  if (current) {
    compacted.push(current);
  }
  return compacted.map((segment, index) => ({ ...segment, speechId: index + 1 }));
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

function outputContract() {
  return {
    format: 'json_only',
    schema: {
      themes: [
        {
          themeId: 'string',
          title: 'string',
          summary: 'string',
          whyItCanBeClipped: 'string',
          sourceVideoId: 'string',
          sourceStartMs: 'number',
          sourceEndMs: 'number',
          supportingSpeechIds: ['number_or_range_string'],
          representativeQuote: 'string',
          riskNotes: ['string']
        }
      ]
    }
  };
}

function sourceInput(source: ThemeSource, transcript: SttTranscript, segments: ThemeSegment[]) {
  return {
    sourceVideoId: source.sourceVideoId,
    ...(source.sourceUrl ? { sourceUrl: source.sourceUrl } : {}),
    ...(source.sourceTitle ? { sourceTitle: source.sourceTitle } : {}),
    transcriptKind: source.transcriptKind,
    language: transcript.language ?? 'ja-JP',
    durationSec: transcript.durationSec,
    rawSegmentCount: transcript.segments.length,
    promptSegmentCount: segments.length,
    segmentCompaction: {
      method: 'source-only transcript segments concatenated until sentence-ending punctuation',
      scoringRole: 'none',
      note: '読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。'
    },
    segments: segments.map((segment) => ({
      speechId: segment.speechId,
      sourceVideoId: segment.sourceVideoId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      text: segment.text
    }))
  };
}

function reportMarkdown(input: {
  fixtureId: string;
  generationSystem: string;
  requestedThemeCount: number;
  runs: number;
  sources: Array<{ source: ThemeSource; transcript: SttTranscript; promptSegments: ThemeSegment[] }>;
  promptPath: string;
  payloadPath: string;
  promptBytes: number;
}) {
  const lines = [
    '# theme_generation プロンプト入力レポート',
    '',
    `- fixture: ${input.fixtureId}`,
    `- 生成系統: ${input.generationSystem}`,
    `- 候補数N: ${input.requestedThemeCount}`,
    `- 予定実行回数: ${input.runs}`,
    `- prompt: ${input.promptPath}`,
    `- payload: ${input.payloadPath}`,
    `- prompt bytes: ${input.promptBytes}`,
    '- 窓分割: なし',
    '- 窓間オーバーラップ: なし',
    '- 統合: なし',
    '',
    '## 入力分離',
    '',
    '- モデル入力は元配信STTと元配信メタ情報だけで構成。',
    '- expected、切り抜きURL、切り抜きID、DP照合結果、人間確認メモ、正解ラベルはモデル入力に入れない。',
    '',
    '## 元配信',
    '',
    '| sourceVideoId | STT | raw segments | prompt segments | title |',
    '| --- | --- | ---: | ---: | --- |'
  ];
  for (const item of input.sources) {
    lines.push(`| ${item.source.sourceVideoId} | ${item.source.transcriptKind} | ${item.transcript.segments.length} | ${item.promptSegments.length} | ${item.source.sourceTitle ?? '(未使用)'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function buildFixture(options: CliOptions, fixtureId: string, promptTemplate: string) {
  const expectedPath = path.join(evalRoot, 'expected', `${fixtureId}.json`);
  const expected = await readJson<ExpectedFile>(expectedPath);
  const sources = await sourcesForFixture(fixtureId, expected);
  const sourceInputs = [];
  for (const source of sources) {
    const transcript = await readJson<SttTranscript>(source.transcriptPath);
    const promptSegments = compactSegments(source.sourceVideoId, transcript);
    sourceInputs.push({ source, transcript, promptSegments });
  }
  const modelInput = {
    task: 'source_only_theme_generation',
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    inputPolicy: {
      sourceOnly: true,
      noClipInfo: true,
      noExpected: true,
      noAlignment: true,
      noHumanReverseTheme: true
    },
    windowing: {
      applied: false,
      reason: '初回はプロンプトを1本に収め、窓統合器の癖を入れない。',
      overlapMs: 0,
      preMergeCandidateCount: null,
      postMergeCandidateCount: null
    },
    sources: sourceInputs.map((item) => sourceInput(item.source, item.transcript, item.promptSegments)),
    outputContract: outputContract()
  };
  const outputDir = path.join(evalRoot, 'outputs', 'theme-generation', fixtureId, options.generationSystem, options.outputId);
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation', fixtureId, options.generationSystem, options.outputId);
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const payload = {
    kind: 'theme_generation_prompt_payload',
    runAt: new Date().toISOString(),
    fixtureId,
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    plannedRuns: options.runs,
    llmCall: false,
    modelInput,
    evaluationOnly: {
      expectedPath: path.relative(evalRoot, expectedPath),
      expectedCutCount: expectedCutsForEval(expected).length,
      note: 'モデルへ渡さず、一段目採点と漏えい検査だけで使う。'
    }
  };
  const payloadPath = path.join(outputDir, 'prompt-input.json');
  const promptPath = path.join(reportDir, 'prompt.md');
  const reportPath = path.join(reportDir, 'prompt-input-summary.md');
  const promptText = buildPromptMarkdown(promptTemplate, modelInput);
  await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(promptPath, promptText, 'utf8');
  await writeFile(reportPath, reportMarkdown({
    fixtureId,
    generationSystem: options.generationSystem,
    requestedThemeCount: options.requestedThemeCount,
    runs: options.runs,
    sources: sourceInputs,
    promptPath: path.relative(evalRoot, promptPath),
    payloadPath: path.relative(evalRoot, payloadPath),
    promptBytes: Buffer.byteLength(promptText, 'utf8')
  }), 'utf8');
  const runOutputs = Array.from({ length: options.runs }, (_, index) => ({
    run: index + 1,
    outputPath: path.join(outputDir, `run-${String(index + 1).padStart(2, '0')}-gemini-output.json`)
  }));
  await writeFile(path.join(outputDir, 'run-manifest.json'), `${JSON.stringify({
    fixtureId,
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    promptPath: path.relative(workspaceRoot(), promptPath),
    payloadPath: path.relative(workspaceRoot(), payloadPath),
    runOutputs: runOutputs.map((item) => ({
      run: item.run,
      outputPath: path.relative(workspaceRoot(), item.outputPath)
    }))
  }, null, 2)}\n`, 'utf8');
  console.log(`${fixtureId}\tprompt=${path.relative(workspaceRoot(), promptPath)}\tpayload=${path.relative(workspaceRoot(), payloadPath)}\tbytes=${Buffer.byteLength(promptText, 'utf8')}`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const promptPath = path.join(evalRoot, 'prompts', `${options.promptVersion}.md`);
  if (!existsSync(promptPath)) {
    throw new Error(`プロンプトがありません: ${promptPath}`);
  }
  const promptTemplate = await readFile(promptPath, 'utf8');
  for (const fixtureId of options.fixtureIds) {
    await buildFixture(options, fixtureId, promptTemplate);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

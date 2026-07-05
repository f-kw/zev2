import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  payloadPaths: string[];
  outputId: string;
};

type PromptPayload = {
  draftId?: string;
  fixtureId?: string;
  promptVersion?: string;
  modelInput?: unknown;
  evaluationOnly?: {
    expectedPath?: string;
  };
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
};

type ExpectedFile = {
  draftId?: string;
  fixtureId?: string;
  expectedCuts: ExpectedCut[];
};

type ForbiddenKeyHit = {
  path: string;
  key: string;
};

type ExpectedTextHit = {
  path: string;
  expectedPath: string;
  kind: 'expected_reason' | 'expected_note_or_method';
  preview: string;
};

type NumericBoundaryHit = {
  cutIndex: number;
  side: 'start' | 'end';
  valueMs: number;
  hitPath: string;
  hitKind: 'number_value' | 'string_value';
  classification: 'transcript_boundary' | 'suspicious';
};

type PayloadLeakageInspection = {
  payloadPath: string;
  fixtureId: string;
  draftId?: string;
  promptVersion: string;
  expectedPath: string;
  status: 'pass' | 'fail';
  forbiddenKeyHits: ForbiddenKeyHit[];
  expectedTextHits: ExpectedTextHit[];
  numericBoundaryHits: NumericBoundaryHit[];
  notes: string[];
};

type InspectionResult = {
  runAt: string;
  kind: 'clip_composition_prompt_payload_leakage';
  payloadCount: number;
  results: PayloadLeakageInspection[];
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

const forbiddenModelInputKeys = new Set([
  'audioVerification',
  'bestAlignedSourceEndMs',
  'bestAlignedSourceSpeechEndMs',
  'bestAlignedSourceSpeechStartMs',
  'bestAlignedSourceStartMs',
  'clipId',
  'clipUrl',
  'evaluationOnly',
  'expected',
  'expectedCut',
  'expectedCutCount',
  'expectedCuts',
  'expectedEndMs',
  'expectedPath',
  'expectedStartMs',
  'fullTimelineCandidateEndMs',
  'fullTimelineCandidateStartMs',
  'groundTruth',
  'sourceSttId',
  'sourceUrl',
  'sourceVideoId',
  'sttAlignment',
  'transcriptText',
  'usableForClipLocationEval',
  'usableForCompositionPromptEval',
  'verificationStatus',
  'visualVerification'
]);

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

  const payloadsText = values.get('payloads')?.trim();
  if (!payloadsText) {
    throw new Error('--payloads にカンマ区切りの prompt-input.json パスを指定してください');
  }

  return {
    payloadPaths: payloadsText.split(',').map((item) => resolveWorkspacePath(item.trim())).filter(Boolean),
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

function resolveExpectedPath(expectedPath: string): string {
  return path.isAbsolute(expectedPath) ? expectedPath : path.join(evalRoot, expectedPath);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringFrom(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} は空でない文字列である必要があります`);
  }
  return value;
}

function expectedCutsFrom(value: unknown, label: string): ExpectedCut[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} は配列である必要があります`);
  }
  return value.map((item, index) => {
    const record = recordFrom(item);
    const sourceStartMs = record.sourceStartMs;
    const sourceEndMs = record.sourceEndMs;
    if (typeof sourceStartMs !== 'number' || typeof sourceEndMs !== 'number') {
      throw new Error(`${label}[${index}] の開始または終了時刻が数値ではありません`);
    }
    return {
      sourceStartMs,
      sourceEndMs,
      ...(typeof record.reason === 'string' ? { reason: record.reason } : {})
    };
  });
}

function pathToString(parts: Array<string | number>): string {
  return parts.reduce((accumulator, part) => {
    if (typeof part === 'number') {
      return `${accumulator}[${part}]`;
    }
    return accumulator ? `${accumulator}.${part}` : part;
  }, '');
}

function collectForbiddenKeyHits(value: unknown): ForbiddenKeyHit[] {
  const hits: ForbiddenKeyHit[] = [];

  function visit(current: unknown, pathParts: Array<string | number>): void {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    const record = recordFrom(current);
    for (const [key, child] of Object.entries(record)) {
      const nextPath = [...pathParts, key];
      if (forbiddenModelInputKeys.has(key)) {
        hits.push({ path: pathToString(nextPath), key });
      }
      visit(child, nextPath);
    }
  }

  visit(value, ['modelInput']);
  return hits;
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function preview(value: string): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}...` : oneLine;
}

function collectExpectedInspectionTexts(expected: unknown): Array<{
  path: string;
  kind: ExpectedTextHit['kind'];
  text: string;
}> {
  const texts: Array<{ path: string; kind: ExpectedTextHit['kind']; text: string }> = [];

  function visit(current: unknown, pathParts: Array<string | number>): void {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    const record = recordFrom(current);
    for (const [key, child] of Object.entries(record)) {
      const nextPath = [...pathParts, key];
      if (typeof child === 'string') {
        const kind = key === 'reason' ? 'expected_reason' : key === 'note' || key === 'method' ? 'expected_note_or_method' : undefined;
        if (kind && child.trim()) {
          texts.push({ path: pathToString(nextPath), kind, text: child });
        }
      }
      visit(child, nextPath);
    }
  }

  visit(expected, ['expected']);
  return texts;
}

function collectModelInputStrings(value: unknown): Array<{ path: string; text: string }> {
  const strings: Array<{ path: string; text: string }> = [];

  function visit(current: unknown, pathParts: Array<string | number>): void {
    if (typeof current === 'string') {
      strings.push({ path: pathToString(pathParts), text: current });
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    const record = recordFrom(current);
    for (const [key, child] of Object.entries(record)) {
      visit(child, [...pathParts, key]);
    }
  }

  visit(value, ['modelInput']);
  return strings;
}

function collectExpectedTextHits(modelInput: unknown, expected: unknown): ExpectedTextHit[] {
  const expectedTexts = collectExpectedInspectionTexts(expected);
  const modelStrings = collectModelInputStrings(modelInput);
  const hits: ExpectedTextHit[] = [];

  for (const expectedText of expectedTexts) {
    const normalizedExpected = normalizedText(expectedText.text);
    for (const modelString of modelStrings) {
      if (normalizedText(modelString.text).includes(normalizedExpected)) {
        hits.push({
          path: modelString.path,
          expectedPath: expectedText.path,
          kind: expectedText.kind,
          preview: preview(expectedText.text)
        });
      }
    }
  }

  return hits;
}

function isTranscriptBoundaryPath(parts: Array<string | number>): boolean {
  const lastPart = parts.at(-1);
  return (
    parts[0] === 'modelInput' &&
    parts[1] === 'transcript' &&
    parts[2] === 'segments' &&
    typeof parts[3] === 'number' &&
    (lastPart === 'sourceStartMs' || lastPart === 'sourceEndMs' || lastPart === 'startMs' || lastPart === 'endMs')
  );
}

function collectNumericBoundaryHits(modelInput: unknown, expectedCuts: ExpectedCut[]): NumericBoundaryHit[] {
  const boundaries = expectedCuts.flatMap((cut, cutIndex) => [
    { cutIndex, side: 'start' as const, valueMs: cut.sourceStartMs },
    { cutIndex, side: 'end' as const, valueMs: cut.sourceEndMs }
  ]);
  const hits: NumericBoundaryHit[] = [];

  function addHit(input: {
    boundary: typeof boundaries[number];
    pathParts: Array<string | number>;
    hitKind: NumericBoundaryHit['hitKind'];
  }): void {
    const classification = isTranscriptBoundaryPath(input.pathParts) ? 'transcript_boundary' : 'suspicious';
    hits.push({
      cutIndex: input.boundary.cutIndex,
      side: input.boundary.side,
      valueMs: input.boundary.valueMs,
      hitPath: pathToString(input.pathParts),
      hitKind: input.hitKind,
      classification
    });
  }

  function visit(current: unknown, pathParts: Array<string | number>): void {
    if (typeof current === 'number') {
      for (const boundary of boundaries) {
        if (current === boundary.valueMs) {
          addHit({ boundary, pathParts, hitKind: 'number_value' });
        }
      }
      return;
    }
    if (typeof current === 'string') {
      for (const boundary of boundaries) {
        if (current.includes(String(boundary.valueMs))) {
          addHit({ boundary, pathParts, hitKind: 'string_value' });
        }
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    const record = recordFrom(current);
    for (const [key, child] of Object.entries(record)) {
      visit(child, [...pathParts, key]);
    }
  }

  visit(modelInput, ['modelInput']);
  return hits;
}

async function inspectPayload(payloadPath: string): Promise<PayloadLeakageInspection> {
  const payload = await readJson<PromptPayload>(payloadPath);
  const modelInput = payload.modelInput;
  if (modelInput === undefined) {
    throw new Error(`${payloadPath} に modelInput がありません`);
  }

  const expectedPathText = stringFrom(payload.evaluationOnly?.expectedPath, `${payloadPath}.evaluationOnly.expectedPath`);
  const expectedPath = resolveExpectedPath(expectedPathText);
  const expected = await readJson<ExpectedFile>(expectedPath);
  const expectedCuts = expectedCutsFrom(expected.expectedCuts, `${expectedPath}.expectedCuts`);
  const forbiddenKeyHits = collectForbiddenKeyHits(modelInput);
  const expectedTextHits = collectExpectedTextHits(modelInput, expected);
  const numericBoundaryHits = collectNumericBoundaryHits(modelInput, expectedCuts);
  const suspiciousNumericHits = numericBoundaryHits.filter((hit) => hit.classification === 'suspicious');
  const status = forbiddenKeyHits.length === 0 && expectedTextHits.length === 0 && suspiciousNumericHits.length === 0 ? 'pass' : 'fail';

  return {
    payloadPath: relativeWorkspacePath(payloadPath),
    fixtureId: payload.fixtureId ?? expected.fixtureId ?? '(unknown)',
    ...(payload.draftId ?? expected.draftId ? { draftId: payload.draftId ?? expected.draftId } : {}),
    promptVersion: payload.promptVersion ?? '(unknown)',
    expectedPath: relativeWorkspacePath(expectedPath),
    status,
    forbiddenKeyHits,
    expectedTextHits,
    numericBoundaryHits,
    notes: [
      '正解データの本文は評価だけに使い、modelInputだけを検査対象にした。',
      '期待時刻と同じ数値が文字起こし区間の境界として出る場合は、入力文字起こし由来の自然な一致として分けて扱う。'
    ]
  };
}

function statusLabel(status: PayloadLeakageInspection['status']): string {
  return status === 'pass' ? 'pass' : 'fail';
}

function formatHits<T>(hits: T[], formatter: (hit: T) => string): string[] {
  return hits.length > 0 ? hits.map(formatter) : ['- なし'];
}

function buildSummary(result: InspectionResult, outputJsonPath: string): string {
  const lines: string[] = [
    '# prompt入力漏えい検査',
    '',
    `- 実行時刻: ${result.runAt}`,
    `- 結果JSON: ${relativeWorkspacePath(outputJsonPath)}`,
    `- 検査対象: ${result.payloadCount}件`,
    '',
    '## 目的',
    '',
    'compositionプロンプトへ渡した入力に、採点用の正解理由や検証メタ情報が混ざっていないか確認する。',
    '時刻の数値一致は、文字起こし区間の境界として自然に出る場合があるため、混入判定とは分けて読む。',
    ''
  ];

  for (const item of result.results) {
    const suspiciousNumericHits = item.numericBoundaryHits.filter((hit) => hit.classification === 'suspicious');
    const transcriptBoundaryHits = item.numericBoundaryHits.filter((hit) => hit.classification === 'transcript_boundary');
    lines.push(
      `## ${item.fixtureId}`,
      '',
      `- 状態: ${statusLabel(item.status)}`,
      `- prompt版数: ${item.promptVersion}`,
      `- 入力: ${item.payloadPath}`,
      `- 正解: ${item.expectedPath}`,
      '',
      '### 正解メタ情報のキー混入',
      '',
      ...formatHits(item.forbiddenKeyHits, (hit) => `- ${hit.path}: ${hit.key}`),
      '',
      '### 正解理由または確認メモの本文混入',
      '',
      ...formatHits(item.expectedTextHits, (hit) => `- ${hit.path} に ${hit.kind} が含まれる: ${hit.preview}`),
      '',
      '### 期待時刻と同じ数値',
      '',
      ...formatHits(item.numericBoundaryHits, (hit) => (
        `- ${hit.valueMs}ms (${hit.side}) / ${hit.hitPath} / ${hit.hitKind} / ${hit.classification}`
      )),
      '',
      '### 読み取り',
      '',
      `- suspicious: ${suspiciousNumericHits.length}件`,
      `- transcript boundary: ${transcriptBoundaryHits.length}件`,
      ''
    );
  }

  while (lines.at(-1) === '') {
    lines.pop();
  }
  return `${lines.join('\n')}\n`;
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result: InspectionResult = {
    runAt: new Date().toISOString(),
    kind: 'clip_composition_prompt_payload_leakage',
    payloadCount: options.payloadPaths.length,
    results: []
  };

  for (const payloadPath of options.payloadPaths) {
    result.results.push(await inspectPayload(payloadPath));
  }

  const outputJsonPath = path.join(evalRoot, 'outputs', `prompt-payload-leakage-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `prompt-payload-leakage-${options.outputId}.md`);
  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeJson(outputJsonPath, result);
  await writeFile(reportPath, buildSummary(result, outputJsonPath), 'utf8');
  console.log(`json: ${relativeWorkspacePath(outputJsonPath)}`);
  console.log(`report: ${relativeWorkspacePath(reportPath)}`);
  console.log(`status: ${result.results.every((item) => item.status === 'pass') ? 'pass' : 'fail'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

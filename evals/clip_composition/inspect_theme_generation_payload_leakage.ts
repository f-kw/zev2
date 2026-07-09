import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  payloadPaths: string[];
  outputId: string;
};

type InspectionResult = {
  payloadPath: string;
  fixtureId: string;
  status: 'pass' | 'fail';
  forbiddenKeyHits: Array<{ path: string; key: string }>;
  forbiddenTextHits: Array<{ kind: string; text: string }>;
  notes: string[];
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');
const forbiddenKeys = new Set([
  'clipId',
  'clipUrl',
  'expected',
  'expectedCuts',
  'expectedPath',
  'expectedStartMs',
  'expectedEndMs',
  'humanVerification',
  'humanVisualVerification',
  'humanAudioSeparatedVerification',
  'audioVerification',
  'visualVerification',
  'sttAlignment',
  'materialBlock',
  'verificationStatus',
  'fixedThemeTitle',
  'fixedThemeSummary',
  'themeTitle',
  'themeSummary',
  'label'
]);

const forbiddenThemeTexts = [
  '登録者数世界2位扱いへの照れと順位変動への冷静な反応',
  '配信者が食べていける同接規模について現実的に答える場面',
  'Vの組織内あれこれ',
  '逆凸遊戯王',
  'スタッフと相談',
  '変態女装おじさん',
  '拍手の音',
  '実装から2年 朝4時',
  '取りたい資格',
  '4. 【2023年6月①週】10分でわかる先週のにじさんじ爆笑シーンまとめ'
];

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
  const payloads = values.get('payloads')?.trim();
  if (!payloads) {
    throw new Error('--payloads を指定してください');
  }
  return {
    payloadPaths: payloads.split(',').map((item) => path.resolve(item.trim())).filter(Boolean),
    outputId: (values.get('outputId')?.trim() || new Date().toISOString()).replace(/[^a-zA-Z0-9_-]/g, '_')
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function pathText(parts: Array<string | number>): string {
  return parts.reduce((acc, part) => typeof part === 'number' ? `${acc}[${part}]` : (acc ? `${acc}.${part}` : part), '');
}

function collectForbiddenKeys(value: unknown): Array<{ path: string; key: string }> {
  const hits: Array<{ path: string; key: string }> = [];
  function visit(current: unknown, parts: Array<string | number>) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...parts, index]));
      return;
    }
    if (!current || typeof current !== 'object') {
      return;
    }
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      const next = [...parts, key];
      if (forbiddenKeys.has(key)) {
        hits.push({ path: pathText(next), key });
      }
      visit(child, next);
    }
  }
  visit(value, ['modelInput']);
  return hits;
}

function inspectPayload(payloadPath: string, payload: Record<string, unknown>): InspectionResult {
  const modelInput = payload.modelInput;
  const modelInputText = JSON.stringify(modelInput);
  const forbiddenTextHits = forbiddenThemeTexts
    .filter((text) => modelInputText.includes(text))
    .map((text) => ({ kind: 'known_answer_label_or_clip_title', text }));
  const forbiddenKeyHits = collectForbiddenKeys(modelInput);
  const fixtureId = typeof payload.fixtureId === 'string' ? payload.fixtureId : path.basename(path.dirname(payloadPath));
  return {
    payloadPath: path.relative(workspaceRoot(), payloadPath),
    fixtureId,
    status: forbiddenKeyHits.length === 0 && forbiddenTextHits.length === 0 ? 'pass' : 'fail',
    forbiddenKeyHits,
    forbiddenTextHits,
    notes: [
      '検査対象はmodelInputのみ。evaluationOnlyは採点用なのでモデル送信対象外。',
      'sourceVideoId/sourceUrl/sourceTitleは元配信単体メタ情報として許容する。'
    ]
  };
}

function reportMarkdown(results: InspectionResult[]): string {
  const lines = [
    '# theme_generation payload漏えい検査',
    '',
    `- payloads: ${results.length}`,
    `- pass: ${results.filter((item) => item.status === 'pass').length}`,
    `- fail: ${results.filter((item) => item.status === 'fail').length}`,
    '',
    '| fixture | status | forbidden keys | forbidden texts |',
    '| --- | --- | ---: | ---: |'
  ];
  for (const result of results) {
    lines.push(`| ${result.fixtureId} | ${result.status} | ${result.forbiddenKeyHits.length} | ${result.forbiddenTextHits.length} |`);
  }
  lines.push('');
  for (const result of results.filter((item) => item.status === 'fail')) {
    lines.push(`## ${result.fixtureId}`);
    lines.push('');
    for (const hit of result.forbiddenKeyHits) {
      lines.push(`- forbidden key: ${hit.path}`);
    }
    for (const hit of result.forbiddenTextHits) {
      lines.push(`- forbidden text: ${hit.text}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const results: InspectionResult[] = [];
  for (const payloadPath of options.payloadPaths) {
    results.push(inspectPayload(payloadPath, await readJson<Record<string, unknown>>(payloadPath)));
  }
  const outputPath = path.join(evalRoot, 'outputs', `theme-generation-payload-leakage-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `theme-generation-payload-leakage-${options.outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown(results), 'utf8');
  console.log(`leakage result: ${outputPath}`);
  console.log(`leakage report: ${reportPath}`);
  if (results.some((item) => item.status === 'fail')) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

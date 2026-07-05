import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  status: 'confirmed' | 'uncertain' | 'rejected';
  checkedBy: string;
  note: string;
  sourceStartMs?: number;
  sourceEndMs?: number;
};

type ExpectedFile = {
  draftId: string;
  fixtureId?: string;
  expectedCuts: Array<Record<string, unknown> & {
    sourceStartMs: number;
    sourceEndMs: number;
    reason: string;
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

  const status = values.get('status')?.trim();
  if (status !== 'confirmed' && status !== 'uncertain' && status !== 'rejected') {
    throw new Error('--status は confirmed / uncertain / rejected のいずれかです');
  }

  const checkedBy = values.get('checkedBy')?.trim();
  if (!checkedBy) {
    throw new Error('--checkedBy を指定してください');
  }

  const note = values.get('note')?.trim();
  if (!note) {
    throw new Error('--note を指定してください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    status,
    checkedBy,
    note,
    ...(values.has('sourceStartMs') ? { sourceStartMs: parseInteger(values.get('sourceStartMs'), '--sourceStartMs') } : {}),
    ...(values.has('sourceEndMs') ? { sourceEndMs: parseInteger(values.get('sourceEndMs'), '--sourceEndMs') } : {})
  };
}

function parseInteger(value: string | undefined, label: string): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} は整数ミリ秒で指定してください`);
  }
  return parsed;
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const expectedPath = path.join(evalRoot, 'expected', `${options.fixtureId}.json`);
  if (!existsSync(expectedPath)) {
    throw new Error(`期待値ファイルが見つかりません: ${expectedPath}`);
  }

  const expected = await readJson<ExpectedFile>(expectedPath);
  const firstCut = expected.expectedCuts[0];
  if (!firstCut) {
    throw new Error('期待値ファイルにexpectedCutsがありません');
  }

  if (options.sourceStartMs !== undefined && options.sourceEndMs !== undefined) {
    if (options.sourceEndMs <= options.sourceStartMs) {
      throw new Error('--sourceEndMs は --sourceStartMs より後にしてください');
    }
    firstCut.sourceStartMs = options.sourceStartMs;
    firstCut.sourceEndMs = options.sourceEndMs;
  } else if (options.sourceStartMs !== undefined || options.sourceEndMs !== undefined) {
    throw new Error('開始または終了を更新する場合は --sourceStartMs と --sourceEndMs を両方指定してください');
  }

  firstCut.visualVerification = {
    status: options.status,
    checkedBy: options.checkedBy,
    checkedAt: new Date().toISOString(),
    note: options.note
  };

  await writeFile(expectedPath, `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
  console.log(`expected: ${expectedPath}`);
  console.log(`visual verification: ${options.status}`);
  console.log(`range: ${firstCut.sourceStartMs}ms - ${firstCut.sourceEndMs}ms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

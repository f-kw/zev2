import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
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
    input: resolveWorkspacePath(requireValue(values, 'input')),
    output: resolveWorkspacePath(requireValue(values, 'output')),
    minSourceMs: integerValue(values.get('minSourceMs'), '--minSourceMs'),
    maxSourceMs: integerValue(values.get('maxSourceMs'), '--maxSourceMs')
  };
}

function requireValue(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function integerValue(value, label) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} は整数ミリ秒で指定してください`);
  }
  return parsed;
}

function resolveWorkspacePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function findBalancedJson(text) {
  const start = text.indexOf('{');
  if (start < 0) {
    return undefined;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return undefined;
}

function extractReason(rawText) {
  const match = rawText.match(/"reason"\s*:\s*"((?:\\"|[^"])*)"/);
  if (!match) {
    return 'Gemini rawResponseTextから開始・終了時刻を修復した。理由文字列は抽出できなかった。';
  }
  return match[1].replace(/\\"/g, '"');
}

function extractFirstSelectedCut(rawText) {
  const startIndex = rawText.search(/"sourceStartMs"\s*:/);
  if (startIndex < 0) {
    throw new Error('rawResponseTextにsourceStartMsがありません');
  }
  const head = rawText.slice(0, Math.min(rawText.length, startIndex + 1000));
  const match = head.match(/"sourceStartMs"\s*:\s*(\d+)[\s\S]*?"sourceEndMs"\s*:\s*(\d+)/);
  if (!match) {
    throw new Error('rawResponseTextからsourceStartMs/sourceEndMsを抽出できません');
  }
  const sourceStartMs = Number(match[1]);
  const sourceEndMs = Number(match[2]);
  if (
    !Number.isFinite(sourceStartMs)
    || !Number.isFinite(sourceEndMs)
    || sourceEndMs <= sourceStartMs
    || sourceStartMs < options.minSourceMs
    || sourceEndMs > options.maxSourceMs
  ) {
    throw new Error(`抽出した区間がfixtureの入力範囲外です: ${sourceStartMs}-${sourceEndMs}`);
  }
  return {
    sourceStartMs,
    sourceEndMs,
    reason: extractReason(rawText)
  };
}

async function main() {
  const payload = JSON.parse(await readFile(options.input, 'utf8'));
  const rawText = String(payload.rawResponseText ?? '');
  let repairedOutput;
  const jsonText = findBalancedJson(rawText);
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.selectedCuts) && parsed.selectedCuts.length > 0) {
        repairedOutput = parsed;
      }
    } catch {
      repairedOutput = undefined;
    }
  }
  if (!repairedOutput) {
    repairedOutput = {
      selectedCuts: [extractFirstSelectedCut(rawText)]
    };
  }

  const output = {
    ...payload,
    ...repairedOutput,
    repair: {
      status: 'repaired_from_rawResponseText',
      reason: 'Web Gemini画面本文からの自動抽出がプロンプト内の架空例を拾ったため、rawResponseText先頭の実回答から採点用selectedCutsを復元した。',
      sourceFile: path.relative(root, options.input)
    }
  };
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`repaired: ${path.relative(root, options.output)}`);
  console.log(`selected: ${output.selectedCuts.map((cut) => `${cut.sourceStartMs}-${cut.sourceEndMs}`).join(', ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

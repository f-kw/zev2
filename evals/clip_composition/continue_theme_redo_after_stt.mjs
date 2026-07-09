#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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
  const flags = new Set();
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
      flags.add(key);
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  return {
    manifestPath: resolvePath(required(values, 'manifest')),
    sourceInfoPath: resolvePath(required(values, 'sourceInfo')),
    sourceUrl: values.get('sourceUrl')?.trim() || '',
    target: required(values, 'target'),
    inputSetId: required(values, 'inputSetId'),
    sourceVideoId: required(values, 'sourceVideoId'),
    sttId: required(values, 'sttId'),
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v002',
    promptVersion: values.get('promptVersion')?.trim() || 'theme_generation_prompt_v002',
    outputId: values.get('outputId')?.trim() || timestampForFile(),
    requestedThemeCount: positiveInt(values.get('requestedThemeCount')?.trim() || '8', 'requestedThemeCount'),
    runs: positiveInt(values.get('runs')?.trim() || '1', 'runs'),
    maxPromptBytes: positiveInt(values.get('maxPromptBytes')?.trim() || '13084', 'maxPromptBytes'),
    overlapMs: nonNegativeInt(values.get('overlapMs')?.trim() || '0', 'overlapMs'),
    server: values.get('server')?.trim() || 'http://192.168.1.4:8000',
    timeoutMs: positiveInt(values.get('timeoutMs')?.trim() || '1800000', 'timeoutMs'),
    dryRun: flags.has('dryRun')
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function positiveInt(value, key) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`--${key} は1以上の整数で指定してください`);
  }
  return number;
}

function nonNegativeInt(value, key) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`--${key} は0以上の整数で指定してください`);
  }
  return number;
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
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

function commandText(command, args) {
  return [command, ...args].map((part) => /[\s'"?]/.test(part) ? JSON.stringify(part) : part).join(' ');
}

function runNodeScript(scriptPath, args) {
  const command = process.execPath;
  const commandArgs = [scriptPath, ...args];
  if (options.dryRun) {
    return { status: 'dry_run', command: commandText('node', [relative(scriptPath), ...args]) };
  }
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`${relative(scriptPath)} failed with code ${result.status}`);
  }
  return { status: 'executed', command: commandText('node', [relative(scriptPath), ...args]) };
}

async function fetchHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(new URL('/health', options.server).toString(), {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function sttArgs(manifest) {
  return [
    '--chunksDir', path.isAbsolute(manifest.chunksDir) ? relative(manifest.chunksDir) : manifest.chunksDir,
    '--id', options.sttId,
    '--role', manifest.role,
    '--ranges', (manifest.ranges ?? []).join(','),
    '--server', options.server,
    '--chunkSec', String(manifest.chunkSec ?? 30),
    '--timeoutMs', String(options.timeoutMs)
  ];
}

function payloadArgs(transcriptPath) {
  return [
    '--target', options.target,
    '--inputSetId', options.inputSetId,
    '--sourceVideoId', options.sourceVideoId,
    '--sttId', options.sttId,
    '--transcript', relative(transcriptPath),
    '--sttManifest', relative(options.manifestPath),
    '--sourceInfo', relative(options.sourceInfoPath),
    ...(options.sourceUrl ? ['--sourceUrl', options.sourceUrl] : []),
    '--generationSystem', options.generationSystem,
    '--promptVersion', options.promptVersion,
    '--outputId', options.outputId,
    '--requestedThemeCount', String(options.requestedThemeCount),
    '--runs', String(options.runs),
    '--maxPromptBytes', String(options.maxPromptBytes),
    '--overlapMs', String(options.overlapMs)
  ];
}

async function writeReport(report) {
  const outputDir = path.join(evalRoot, 'outputs', 'theme-redo-continuation');
  const reportDir = path.join(evalRoot, 'reports', 'theme-redo-continuation');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `${options.outputId}.json`);
  const reportPath = path.join(reportDir, `${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildMarkdown(report), 'utf8');
  return { outputPath, reportPath };
}

function buildMarkdown(report) {
  const healthText = report.health.skipped
    ? 'skipped'
    : report.health.ok
      ? 'ok'
      : 'failed';
  return [
    '# theme redo continuation',
    '',
    `- 出力ID: ${report.outputId}`,
    `- dry run: ${report.dryRun ? 'yes' : 'no'}`,
    `- STT manifest: ${report.manifestPath}`,
    `- STT完了状態: ${report.initialManifestComplete ? 'complete' : 'incomplete'}`,
    `- health: ${healthText}`,
    '',
    '## 処理の意味',
    '',
    '- STTが未完了なら、既存rawを再利用して選択チャンクSTTを再開する。',
    '- STT manifestが `complete: true` になった場合だけ、theme-llm-v002の入力パッケージを作る。',
    '- `build_theme_redo_source_only_payload.mjs` 側にも未完了manifestガードがあるため、途中transcriptはLLM入力にならない。',
    '',
    '## コマンド',
    '',
    ...report.steps.map((step, index) => `${index + 1}. ${step.name}: ${step.status}\n\n\`\`\`bash\n${step.command}\n\`\`\``),
    '',
    '## 制約',
    '',
    '- fixture/expectedは作成しない。',
    '- runtimeへ書き込まない。',
    '- 本体側には触れない。',
    ''
  ].join('\n');
}

async function main() {
  if (!existsSync(options.manifestPath)) {
    throw new Error(`manifestがありません: ${options.manifestPath}`);
  }
  if (!existsSync(options.sourceInfoPath)) {
    throw new Error(`sourceInfoがありません: ${options.sourceInfoPath}`);
  }
  const manifest = await readJson(options.manifestPath);
  const transcriptPath = manifest.outputs?.transcript
    ? (path.isAbsolute(manifest.outputs.transcript) ? manifest.outputs.transcript : path.join(root, manifest.outputs.transcript))
    : path.join(path.dirname(options.manifestPath), 'transcript.json');
  const health = manifest.complete === true || options.dryRun ? { ok: true, skipped: manifest.complete === true || options.dryRun } : await fetchHealth();
  const steps = [];
  if (manifest.complete !== true) {
    const args = sttArgs(manifest);
    const command = commandText('node', ['evals/clip_composition/run_local_stt_selected_chunks.mjs', ...args]);
    if (!health.ok && !options.dryRun) {
      steps.push({ name: 'resume selected chunk STT', status: 'blocked_by_stt_health', command });
      const report = {
        kind: 'theme_redo_continuation',
        runAt: new Date().toISOString(),
        outputId: options.outputId,
        dryRun: options.dryRun,
        manifestPath: relative(options.manifestPath),
        initialManifestComplete: manifest.complete === true,
        health,
        steps
      };
      const paths = await writeReport(report);
      console.log(`output: ${relative(paths.outputPath)}`);
      console.log(`report: ${relative(paths.reportPath)}`);
      throw new Error('STTサーバーが応答しないため、STT再開を停止しました');
    }
    steps.push({
      name: 'resume selected chunk STT',
      ...runNodeScript(path.join(evalRoot, 'run_local_stt_selected_chunks.mjs'), args)
    });
  }

  const refreshedManifest = existsSync(options.manifestPath) ? await readJson(options.manifestPath) : manifest;
  const payloadCommand = commandText('node', [
    'evals/clip_composition/build_theme_redo_source_only_payload.mjs',
    ...payloadArgs(transcriptPath)
  ]);
  if (refreshedManifest.complete !== true && !options.dryRun) {
    steps.push({
      name: 'build source-only theme prompt input',
      status: 'skipped_until_stt_complete',
      command: payloadCommand
    });
  } else {
    steps.push({
      name: 'build source-only theme prompt input',
      ...runNodeScript(path.join(evalRoot, 'build_theme_redo_source_only_payload.mjs'), payloadArgs(transcriptPath))
    });
  }

  const report = {
    kind: 'theme_redo_continuation',
    runAt: new Date().toISOString(),
    outputId: options.outputId,
    dryRun: options.dryRun,
    manifestPath: relative(options.manifestPath),
    initialManifestComplete: manifest.complete === true,
    refreshedManifestComplete: refreshedManifest.complete === true,
    health,
    steps
  };
  const paths = await writeReport(report);
  console.log(`output: ${relative(paths.outputPath)}`);
  console.log(`report: ${relative(paths.reportPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

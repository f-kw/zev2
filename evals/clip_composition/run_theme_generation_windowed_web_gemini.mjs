#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
  return {
    fixtureId: fixtureId.replace(/[^a-zA-Z0-9_-]/g, '_'),
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    outputId: (values.get('outputId')?.trim() || '20260709-v001').replace(/[^a-zA-Z0-9_-]/g, '_'),
    model: values.get('model')?.trim() || 'gemini-web-flash',
    params: JSON.parse(values.get('params')?.trim() || JSON.stringify({
      temperature: 0,
      source: 'gemini-web',
      runner: 'edge-cdp-text-prompt',
      requestedThemeCount: 8
    })),
    cdpPort: values.get('cdpPort')?.trim() || '9222',
    timeoutMs: values.get('timeoutMs')?.trim() || '300000'
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}`));
    });
  });
}

function rangesOverlap(left, right) {
  if (left.sourceVideoId !== right.sourceVideoId) {
    return false;
  }
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs)) > 0;
}

function expandSupportingSpeechIds(values, speechById, context) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${context} に supportingSpeechIds がありません`);
  }
  const ids = [];
  const seen = new Set();
  const append = (speechId) => {
    if (!speechById.has(speechId)) {
      throw new Error(`${context} が入力窓にない speechId ${speechId} を参照しています`);
    }
    if (!seen.has(speechId)) {
      seen.add(speechId);
      ids.push(speechId);
    }
  };
  for (const value of values) {
    if (Number.isInteger(value) && value > 0) {
      append(value);
      continue;
    }
    const text = String(value).trim();
    const singleMatch = text.match(/^([1-9]\d*)$/);
    if (singleMatch) {
      append(Number(singleMatch[1]));
      continue;
    }
    const rangeMatch = text.match(/^([1-9]\d*)-([1-9]\d*)$/);
    if (!rangeMatch) {
      throw new Error(`${context} の supportingSpeechIds 形式が不正です: ${text}`);
    }
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end < start) {
      throw new Error(`${context} の speechId 範囲が逆順です: ${text}`);
    }
    for (let speechId = start; speechId <= end; speechId += 1) {
      append(speechId);
    }
  }
  return ids;
}

function resolveEvidenceRanges(theme, window, promptInput, context) {
  const segments = (Array.isArray(promptInput?.modelInput?.sources) ? promptInput.modelInput.sources : [])
    .flatMap((source) => Array.isArray(source?.segments) ? source.segments : []);
  const speechById = new Map(segments.map((segment) => [segment.speechId, segment]));
  if (speechById.size === 0) {
    throw new Error(`${context} の入力窓に発話がありません`);
  }
  if (!Array.isArray(theme.evidenceRanges) || theme.evidenceRanges.length === 0) {
    throw new Error(`${context} に evidenceRanges がありません`);
  }
  return theme.evidenceRanges.map((range, rangeIndex) => {
    const rangeContext = `${context} evidenceRanges[${rangeIndex}]`;
    const speechIds = expandSupportingSpeechIds(range?.supportingSpeechIds, speechById, rangeContext);
    const selectedSegments = speechIds.map((speechId) => speechById.get(speechId));
    const sourceVideoIds = [...new Set(selectedSegments.map((segment) => segment.sourceVideoId))];
    if (sourceVideoIds.length !== 1 || sourceVideoIds[0] !== window.sourceVideoId) {
      throw new Error(`${rangeContext} の元配信参照が入力窓と一致しません`);
    }
    const sourceStartMs = Math.min(...selectedSegments.map((segment) => segment.sourceStartMs));
    const sourceEndMs = Math.max(...selectedSegments.map((segment) => segment.sourceEndMs));
    const reportedSourceStartMs = Number.isFinite(range?.sourceStartMs) ? range.sourceStartMs : null;
    const reportedSourceEndMs = Number.isFinite(range?.sourceEndMs) ? range.sourceEndMs : null;
    return {
      ...range,
      sourceVideoId: sourceVideoIds[0],
      sourceStartMs,
      sourceEndMs,
      supportingSpeechIds: range.supportingSpeechIds,
      timingResolution: {
        source: 'supportingSpeechIds',
        reportedSourceStartMs,
        reportedSourceEndMs,
        corrected: reportedSourceStartMs !== sourceStartMs || reportedSourceEndMs !== sourceEndMs
      }
    };
  });
}

function normalizeTheme(theme, window, promptInput, context) {
  const evidenceRanges = resolveEvidenceRanges(theme, window, promptInput, context);
  const sourceVideoId = window.sourceVideoId;
  return {
    ...theme,
    sourceVideoId,
    evidenceRanges,
    windowId: window.windowId,
    windowSourceVideoId: window.sourceVideoId
  };
}

function mergeThemes(themes) {
  const merged = [];
  for (const theme of themes) {
    if (typeof theme.sourceStartMs !== 'number' || typeof theme.sourceEndMs !== 'number') {
      merged.push(theme);
      continue;
    }
    const existing = merged.find((item) =>
      typeof item.sourceStartMs === 'number'
      && typeof item.sourceEndMs === 'number'
      && rangesOverlap(item, theme)
    );
    if (!existing) {
      merged.push({
        ...theme,
        mergedWindowThemeIds: [theme.themeId ?? theme.windowId]
      });
      continue;
    }
    existing.sourceStartMs = Math.min(existing.sourceStartMs, theme.sourceStartMs);
    existing.sourceEndMs = Math.max(existing.sourceEndMs, theme.sourceEndMs);
    existing.riskNotes = [
      ...new Set([
        ...(Array.isArray(existing.riskNotes) ? existing.riskNotes : []),
        ...(Array.isArray(theme.riskNotes) ? theme.riskNotes : []),
        '窓分割後の根拠範囲重なりによる機械統合'
      ])
    ];
    existing.mergedWindowThemeIds = [
      ...(Array.isArray(existing.mergedWindowThemeIds) ? existing.mergedWindowThemeIds : []),
      theme.themeId ?? theme.windowId
    ];
  }
  return merged;
}

function isPartialExtractionStatus(status) {
  const rawStatus = typeof status === 'string'
    ? status
    : status && typeof status === 'object'
      ? String(status.status ?? '')
      : '';
  return rawStatus.includes('partial');
}

function assertCompleteGeminiOutput(output, context) {
  if (isPartialExtractionStatus(output?.extractionStatus)) {
    const reason = output.extractionStatus?.reason ?? 'Gemini回答JSONが完結していない';
    throw new Error(`${context} は途中切れ回答です。人間確認・集計には使いません: ${reason}`);
  }
}

async function aggregateRun(plan, run) {
  const themes = [];
  const windowResults = [];
  for (const window of plan.windows) {
    const windowOutputPath = path.join(evalRoot, 'outputs', 'theme-generation', options.fixtureId, options.generationSystem, options.outputId, 'windows', `run-${String(run).padStart(2, '0')}-${window.windowId}-gemini-output.json`);
    const output = await readJson(windowOutputPath);
    assertCompleteGeminiOutput(output, `run ${run} ${window.windowId}`);
    const promptInput = await readJson(path.join(root, window.payloadPath));
    const windowThemes = Array.isArray(output.themes)
      ? output.themes.map((theme, themeIndex) => normalizeTheme(theme, window, promptInput, `run ${run} ${window.windowId} theme ${themeIndex + 1}`))
      : [];
    const timingCorrectionCount = windowThemes.reduce((count, theme) => (
      count + theme.evidenceRanges.filter((range) => range.timingResolution.corrected).length
    ), 0);
    themes.push(...windowThemes);
    windowResults.push({
      windowId: window.windowId,
      sourceVideoId: window.sourceVideoId,
      themeCount: windowThemes.length,
      timingCorrectionCount,
      extractionStatus: output.extractionStatus
    });
  }
  const mergedThemes = mergeThemes(themes);
  const aggregatePath = path.join(evalRoot, 'outputs', 'theme-generation', options.fixtureId, options.generationSystem, options.outputId, `run-${String(run).padStart(2, '0')}-gemini-output.json`);
  await writeFile(aggregatePath, `${JSON.stringify({
    runAt: new Date().toISOString(),
    model: options.model,
    params: {
      ...options.params,
      windowed: true,
      windowRequestedThemeCount: plan.requestedThemeCount,
      evidenceTiming: 'resolved_from_supporting_speech_ids',
      aggregateCandidateLimit: 'not_applied_no_semantic_ranker'
    },
    themes: mergedThemes,
    windowingResult: {
      applied: true,
      windowCount: plan.windows.length,
      preMergeCandidateCount: themes.length,
      postMergeCandidateCount: mergedThemes.length,
      timingCorrectionCount: windowResults.reduce((count, window) => count + window.timingCorrectionCount, 0),
      merge: '同一sourceVideoIdで根拠範囲が重なる候補だけを機械統合。意味ベースの統合はしない。',
      windows: windowResults
    }
  }, null, 2)}\n`, 'utf8');
  console.log(`[aggregate] run ${run}: pre=${themes.length} post=${mergedThemes.length}`);
}

async function main() {
  const baseDir = path.join(evalRoot, 'outputs', 'theme-generation', options.fixtureId, options.generationSystem, options.outputId);
  const plan = await readJson(path.join(baseDir, 'window-plan.json'));
  const windowOutputDir = path.join(baseDir, 'windows');
  await mkdir(windowOutputDir, { recursive: true });
  for (let run = 1; run <= plan.runs; run += 1) {
    for (const window of plan.windows) {
      const outputPath = path.join(windowOutputDir, `run-${String(run).padStart(2, '0')}-${window.windowId}-gemini-output.json`);
      if (existsSync(outputPath)) {
        console.log(`[skip] run ${run} ${window.windowId}`);
        continue;
      }
      console.log(`[run] ${options.fixtureId} run ${run} ${window.windowId}`);
      await runProcess(path.join(root, 'runner', 'node_modules', '.bin', 'tsx'), [
        'evals/clip_composition/run_web_gemini_prompt.ts',
        '--prompt',
        path.join(root, window.promptPath),
        '--output',
        outputPath,
        '--model',
        options.model,
        '--params',
        JSON.stringify({
          ...options.params,
          windowed: true,
          windowId: window.windowId,
          windowSourceVideoId: window.sourceVideoId,
          windowRequestedThemeCount: plan.requestedThemeCount
        }),
        '--cdpPort',
        options.cdpPort,
        '--timeoutMs',
        options.timeoutMs,
        '--rejectPartialExtraction',
        '--closeTabAfterRun'
      ]);
      const output = await readJson(outputPath);
      assertCompleteGeminiOutput(output, `run ${run} ${window.windowId}`);
    }
    await aggregateRun(plan, run);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

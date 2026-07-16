#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const sourceId = 'DmWu0jVQfTE';
const sttId = 'DmWu0jVQfTE_first_gate_unseen_v001';
const inputSetId = 'DmWu0jVQfTE_chat_velocity_top100_input_selection_v004';
const outputId = '20260716-first-gate-unseen-v001';
const sttManifestPath = path.join(evalRoot, 'stt', sttId, 'source', 'manifest.json');
const transcriptPath = path.join(evalRoot, 'stt', sttId, 'source', 'transcript.json');
const sourceInfoPath = path.join(evalRoot, 'research', 'downloads', 'first-gate-unseen', sourceId, `${sourceId}.info.json`);
const selectionPlanPath = path.join(evalRoot, 'outputs', 'chat-velocity-input-selection', `${sourceId}-first-gate-unseen-input-selection-v004-n100.json`);
const outputRoot = path.join(evalRoot, 'outputs', 'theme-generation', inputSetId, 'theme-llm-v002', outputId);
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed: ${code}`)));
  });
}

function assertCompleteStt(manifest, transcript) {
  const complete = manifest.complete === true
    || (manifest.partial === false
      && Number.isInteger(manifest.processedChunkCount)
      && Number.isInteger(manifest.fullChunkCount)
      && manifest.processedChunkCount === manifest.fullChunkCount);
  if (!complete) throw new Error('STTが未完了です。途中transcriptを正式初見入力にしません');
  if (!Array.isArray(transcript.segments) || transcript.segments.length === 0) {
    throw new Error('完成STTに発話がありません');
  }
  const starts = transcript.segments.map((segment) => segment.startMs);
  const ends = transcript.segments.map((segment) => segment.endMs);
  if (!starts.every(Number.isFinite) || !ends.every(Number.isFinite)) {
    throw new Error('STT発話の時刻が不正です');
  }
}

function assertFixedSelection(plan) {
  if (plan.kind !== 'chat_velocity_source_only_input_selection_plan'
    || plan.sourceVideoId !== sourceId
    || plan.inputSelectionVersion !== 'input-selection-v004'
    || plan.selectionMethod?.selectionCount !== 100
    || plan.selectionMethod?.selectedDurationMs !== 6_000_000
    || plan.selectionMethod?.absoluteThresholdUsed !== false
    || plan.sourceOnlyGuard?.expectedUsedToCalculateRanks !== false
    || plan.sourceOnlyGuard?.expectedIncludedInPlan !== false
    || !Array.isArray(plan.selectedRanges)
    || plan.selectedRanges.length !== 100) {
    throw new Error('正式初見の入力選定が固定済みinput-selection-v004 N=100と一致しません');
  }
  const ranks = plan.selectedRanges.map((range) => range.velocityRank).sort((left, right) => left - right);
  if (!ranks.every((rank, index) => rank === index + 1)) {
    throw new Error('チャット流速上位100分の順位が連続していません');
  }
}

async function main() {
  if (existsSync(outputRoot)) {
    throw new Error(`正式入力の出力先が既に存在します。上書きしません: ${path.relative(root, outputRoot)}`);
  }
  const [manifest, transcript, selectionPlan, sourceInfo] = await Promise.all([
    readJson(sttManifestPath),
    readJson(transcriptPath),
    readJson(selectionPlanPath),
    readJson(sourceInfoPath)
  ]);
  assertCompleteStt(manifest, transcript);
  assertFixedSelection(selectionPlan);
  if (sourceInfo.id !== sourceId || !String(sourceInfo.title ?? '').trim()) {
    throw new Error('元配信情報が正式初見素材と一致しません');
  }

  await runProcess(process.execPath, [
    'evals/clip_composition/build_theme_redo_source_only_payload.mjs',
    '--target', sourceId,
    '--inputSetId', inputSetId,
    '--sourceVideoId', sourceId,
    '--sttId', sttId,
    '--transcript', path.relative(root, transcriptPath),
    '--sttManifest', path.relative(root, sttManifestPath),
    '--sourceInfo', path.relative(root, sourceInfoPath),
    '--sourceUrl', `https://www.youtube.com/watch?v=${sourceId}`,
    '--promptVersion', 'theme_generation_prompt_v002',
    '--generationSystem', 'theme-llm-v002',
    '--outputId', outputId,
    '--requestedThemeCount', '8',
    '--runs', '1',
    '--maxPromptBytes', '13084',
    '--overlapMs', '0',
    '--selectionPlan', path.relative(root, selectionPlanPath)
  ]);

  const [runManifest, windowPlan] = await Promise.all([
    readJson(path.join(outputRoot, 'run-manifest.json')),
    readJson(path.join(outputRoot, 'window-plan.json'))
  ]);
  if (runManifest.generationSystem !== 'theme-llm-v002'
    || runManifest.promptVersion !== 'theme_generation_prompt_v002'
    || runManifest.inputSelectionVersion !== 'input-selection-v004'
    || windowPlan.maxPromptBytes !== 13084
    || windowPlan.overlapMs !== 0
    || windowPlan.bridgeSeams !== false
    || windowPlan.requestedThemeCount !== 8
    || windowPlan.runs !== 1) {
    throw new Error('生成したテーマ入力が第三素材から固定した条件と一致しません');
  }
  console.log(JSON.stringify({
    status: 'prepared',
    sourceId,
    inputSetId,
    outputId,
    windowCount: windowPlan.windows.length,
    humanWork: '0件・0分'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

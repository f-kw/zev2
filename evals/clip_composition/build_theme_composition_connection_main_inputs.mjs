#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceが見つかりません');
    current = parent;
  }
  return current;
}

const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputId = '20260712-connection-main-v001';
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', outputId);
const targetManifestPath = path.join(evalRoot, 'outputs', 'theme-composition-connection', 'theme-v002-to-llm-v012-targets-20260712-v001.json');
const pilotRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-context-pilot-v001');
const pilotCandidates = new Set([3, 52, 53]);

const datasets = {
  nOEWCNc77MI_multiblock_material_v001: {
    sourceVideoId: 'YE-faluP7zY',
    upstreamRoot: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001'),
    transcriptPath: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json'),
    manifestPath: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'manifest.json')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    sourceVideoId: 'o8rZAhARXAc',
    upstreamRoot: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001'),
    transcriptPath: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json'),
    manifestPath: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'manifest.json')
  }
};

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function completeManifest(manifest) {
  return manifest.complete === true || (manifest.partial === false && Number.isInteger(manifest.processedChunkCount) && manifest.processedChunkCount === manifest.fullChunkCount);
}

function compact(sourceVideoId, transcript) {
  const result = [];
  let current;
  const segments = transcript.segments.filter((item) => String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const text = String(segment.text ?? '').trim();
    if (!current) current = { speechId: result.length + 1, sourceVideoId, sourceStartMs: segment.startMs, sourceEndMs: segment.endMs, text: '' };
    current.sourceEndMs = Math.max(current.sourceEndMs, segment.endMs);
    current.text += text;
    const next = segments[index + 1];
    if (/[。！？!?]/.test(text) || !next || next.startMs > current.sourceEndMs) {
      result.push(current);
      current = undefined;
    }
  }
  if (current) result.push(current);
  return result.map((item, index) => ({ ...item, speechId: index + 1 }));
}

function expand(values) {
  const ids = [];
  for (const value of values) {
    const text = String(value).trim();
    if (/^\d+$/.test(text)) ids.push(Number(text));
    else {
      const match = text.match(/^(\d+)-(\d+)$/);
      if (!match || Number(match[2]) < Number(match[1])) throw new Error(`不正な根拠ID: ${text}`);
      for (let id = Number(match[1]); id <= Number(match[2]); id += 1) ids.push(id);
    }
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

function buildModelInput(sourceVideoId, transcript, candidateIndex, theme, candidateIds, context) {
  const candidateSet = new Set(candidateIds);
  return {
    task: 'fixed_theme_clip_interval_selection',
    evaluationInputId: `${sourceVideoId}-theme-candidate-${String(candidateIndex).padStart(3, '0')}`,
    sourceVideoId,
    selectedTheme: {
      id: `input-selection-v004-candidate-${String(candidateIndex).padStart(3, '0')}`,
      title: theme.title,
      summary: theme.reason,
      candidateSpeechIds: candidateIds,
      whyItCanBeClipped: theme.reason,
      compositionNote: '提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。'
    },
    transcript: {
      language: transcript.language ?? 'ja-JP',
      durationSec: transcript.durationSec,
      speechUnitGroups: [context.map((item) => item.speechId)],
      segments: context.map((item) => ({ speechId: item.speechId, sourceStartMs: item.sourceStartMs, sourceEndMs: item.sourceEndMs, text: item.text, isThemeCandidate: candidateSet.has(item.speechId) }))
    },
    outputContract: { format: 'json_only', schema: { selectedCuts: [{ sourceStartMs: 'number', sourceEndMs: 'number', reason: 'string', usedSpeechIds: ['number_or_range_string'] }] } }
  };
}

function promptMarkdown(template, input) {
  return [template.trimEnd(), '', '## 入力JSON', '', '```json', JSON.stringify(input, null, 2), '```', ''].join('\n');
}

function inspect(modelInput, candidateIds) {
  const serialized = JSON.stringify(modelInput);
  const forbidden = ['expectedCuts', 'clipId', 'clipUrl', 'materialBlock', 'humanVerification', 'verificationStatus', 'alignment', 'マリンところねRaftで船を作る', 'マリン野球ゲーム'];
  const found = forbidden.filter((term) => serialized.includes(term));
  if (found.length) throw new Error(`禁止情報: ${found.join(',')}`);
  const inputIds = new Set(modelInput.transcript.segments.map((item) => item.speechId));
  const missing = candidateIds.filter((id) => !inputIds.has(id));
  if (missing.length) throw new Error(`候補IDが文脈外: ${missing.join(',')}`);
}

async function main() {
  const targets = await readJson(targetManifestPath);
  const template = await readFile(path.join(evalRoot, 'prompts', 'clip_composition_prompt_v012.md'), 'utf8');
  await mkdir(outputRoot, { recursive: true });
  const inputs = [];

  for (const target of targets.targets) {
    const dataset = datasets[target.fixtureId];
    if (!dataset) throw new Error(`dataset未定義: ${target.fixtureId}`);
    const sttManifest = await readJson(dataset.manifestPath);
    if (!completeManifest(sttManifest)) throw new Error(`${target.fixtureId}のSTT未完了`);
    const transcript = await readJson(dataset.transcriptPath);
    const full = compact(dataset.sourceVideoId, transcript);
    const byId = new Map(full.map((item) => [item.speechId, item]));
    const upstream = await readJson(path.join(dataset.upstreamRoot, 'run-01-gemini-output.json'));

    for (const candidateIndex of target.candidateIndexes) {
      if (target.fixtureId === 'nOEWCNc77MI_multiblock_material_v001' && pilotCandidates.has(candidateIndex)) {
        const dir = path.join(pilotRoot, `candidate-${String(candidateIndex).padStart(3, '0')}`, 'theme-window-plus-minus-5m');
        const payload = await readJson(path.join(dir, 'prompt-input.json'));
        const prompt = await readFile(path.join(dir, 'prompt.md'), 'utf8');
        inputs.push({ fixtureId: target.fixtureId, sourceVideoId: dataset.sourceVideoId, candidateIndex, contextCondition: 'theme-window-plus-minus-5m', promptPath: path.relative(root, path.join(dir, 'prompt.md')), payloadPath: path.relative(root, path.join(dir, 'prompt-input.json')), leakageInspectionPath: path.relative(root, path.join(dir, 'leakage-inspection.json')), outputDir: path.relative(root, dir), promptSha256: sha256(prompt), evidenceRangeDurationMs: payload.evidenceRangeDurationMs, reusedPilot: true });
        continue;
      }

      const theme = upstream.themes[candidateIndex - 1];
      if (!theme) throw new Error(`${target.fixtureId} candidate ${candidateIndex}なし`);
      const candidateIds = expand(theme.evidenceRanges.flatMap((range) => range.supportingSpeechIds));
      const windowPayload = await readJson(path.join(dataset.upstreamRoot, 'windows', `${theme.windowId}-prompt-input.json`));
      const windowSegments = windowPayload.modelInput.sources[0].segments;
      for (const segment of windowSegments) {
        const rebuilt = byId.get(segment.speechId);
        if (!rebuilt || JSON.stringify(rebuilt) !== JSON.stringify(segment)) throw new Error(`${target.fixtureId} candidate ${candidateIndex} speech ${segment.speechId}再構成不一致`);
      }
      const startMs = Math.max(0, windowSegments[0].sourceStartMs - 300000);
      const endMs = Math.min(transcript.durationSec * 1000, windowSegments.at(-1).sourceEndMs + 300000);
      const context = full.filter((item) => item.sourceEndMs > startMs && item.sourceStartMs < endMs);
      const modelInput = buildModelInput(dataset.sourceVideoId, transcript, candidateIndex, theme, candidateIds, context);
      inspect(modelInput, candidateIds);
      const prompt = promptMarkdown(template, modelInput);
      const dir = path.join(outputRoot, target.fixtureId, `candidate-${String(candidateIndex).padStart(3, '0')}`);
      await mkdir(dir, { recursive: true });
      const evidenceRangeDurationMs = theme.evidenceRanges.reduce((sum, range) => sum + range.sourceEndMs - range.sourceStartMs, 0);
      const payload = { kind: 'theme_composition_connection_prompt_payload', resultRole: 'connected-composition-eval-main-input', runAt: new Date().toISOString(), generationSystem: 'llm-v012@gemini-web-flash', upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash', inputSelectionVersion: 'input-selection-v004', promptVersion: 'clip_composition_prompt_v012', fixtureId: target.fixtureId, candidateIndex, contextCondition: 'theme-window-plus-minus-5m', plannedRuns: 3, evidenceRangeDurationMs, evidenceRanges: theme.evidenceRanges.map(({ sourceVideoId, sourceStartMs, sourceEndMs }) => ({ sourceVideoId, sourceStartMs, sourceEndMs })), contextStartMs: startMs, contextEndMs: endMs, candidateSpeechIds: candidateIds, upstreamWindowId: theme.windowId, modelInput };
      const promptPath = path.join(dir, 'prompt.md');
      const payloadPath = path.join(dir, 'prompt-input.json');
      const inspectionPath = path.join(dir, 'leakage-inspection.json');
      await writeFile(promptPath, prompt);
      await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
      await writeFile(inspectionPath, `${JSON.stringify({ kind: 'theme_composition_connection_leakage_inspection', passed: true, sourceOnly: true, containsExpectedData: false, fixtureId: target.fixtureId, candidateIndex, contextCondition: 'theme-window-plus-minus-5m', promptBytes: Buffer.byteLength(prompt), promptSha256: sha256(prompt), closeTabAfterRunRequired: true }, null, 2)}\n`);
      inputs.push({ fixtureId: target.fixtureId, sourceVideoId: dataset.sourceVideoId, candidateIndex, contextCondition: 'theme-window-plus-minus-5m', promptPath: path.relative(root, promptPath), payloadPath: path.relative(root, payloadPath), leakageInspectionPath: path.relative(root, inspectionPath), outputDir: path.relative(root, dir), promptSha256: sha256(prompt), evidenceRangeDurationMs, reusedPilot: false });
    }
  }

  const manifest = { kind: 'theme_composition_connection_main_input_manifest', resultRole: 'connected-composition-eval-main-inputs', runAt: new Date().toISOString(), outputId, generationSystem: 'llm-v012@gemini-web-flash', upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash', inputSelectionVersion: 'input-selection-v004', promptVersion: 'clip_composition_prompt_v012', model: 'gemini-web-flash', contextCondition: 'theme-window-plus-minus-5m', runsPerCandidate: 3, candidateCount: inputs.length, totalOutputCount: inputs.length * 3, reusedPilotOutputCount: inputs.filter((item) => item.reusedPilot).length * 3, plannedNewGeminiCallCount: inputs.filter((item) => !item.reusedPilot).length * 3, inputs, status: 'ready_for_execution' };
  await writeFile(path.join(outputRoot, 'input-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ candidateCount: inputs.length, reusedPilotOutputCount: manifest.reusedPilotOutputCount, plannedNewGeminiCallCount: manifest.plannedNewGeminiCallCount }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });

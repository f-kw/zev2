#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() { let current = process.cwd(); while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) { const parent = path.dirname(current); if (parent === current) throw new Error('workspaceなし'); current = parent; } return current; }
const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const baselineRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001');
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v002-main-v001');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const promptMarkdown = (template, input) => [template.trimEnd(), '', '## 入力JSON', '', '```json', JSON.stringify(input, null, 2), '```', ''].join('\n');

async function main() {
  const baseline = await readJson(path.join(baselineRoot, 'input-manifest.json'));
  const template = await readFile(path.join(evalRoot, 'prompts', 'clip_composition_prompt_v013.md'), 'utf8');
  await mkdir(outputRoot, { recursive: true });
  const inputs = [];
  for (const oldInput of baseline.inputs) {
    const oldPayload = await readJson(path.join(root, oldInput.payloadPath));
    const modelInput = structuredClone(oldPayload.modelInput);
    modelInput.connectionContract = {
      version: 'connection-v002',
      candidateSpeechIdsRole: 'theme_center_aim',
      surroundingContextRole: 'boundary_search_space'
    };
    modelInput.selectedTheme.candidateSpeechIdsRole = 'theme_center_aim';
    modelInput.selectedTheme.compositionNote = '候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。';
    const serialized = JSON.stringify(modelInput);
    for (const forbidden of ['expectedCuts', 'clipId', 'clipUrl', 'materialBlock', 'humanVerification', 'verificationStatus', 'マリンところねRaftで船を作る', 'マリン野球ゲーム']) {
      if (serialized.includes(forbidden)) throw new Error(`禁止情報: ${forbidden}`);
    }
    const dir = path.join(outputRoot, oldInput.fixtureId, `candidate-${String(oldInput.candidateIndex).padStart(3, '0')}`);
    await mkdir(dir, { recursive: true });
    const prompt = promptMarkdown(template, modelInput);
    const payload = {
      kind: 'theme_composition_connection_prompt_payload',
      resultRole: 'connected-composition-eval-connection-v002-input',
      runAt: new Date().toISOString(),
      connectionVersion: 'connection-v002',
      generationSystem: 'llm-v013@gemini-web-flash',
      upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash',
      inputSelectionVersion: 'input-selection-v004',
      promptVersion: 'clip_composition_prompt_v013',
      fixtureId: oldInput.fixtureId,
      candidateIndex: oldInput.candidateIndex,
      contextCondition: 'theme-window-plus-minus-5m',
      plannedRuns: 3,
      evidenceRangeDurationMs: oldPayload.evidenceRangeDurationMs,
      candidateSpeechIds: modelInput.selectedTheme.candidateSpeechIds,
      baselinePayloadPath: oldInput.payloadPath,
      fixedConditions: {
        model: 'gemini-web-flash',
        contextWindow: 'theme-window-plus-minus-5m',
        scoring: 'three-stage-with-1000ms-boundary-match',
        usedSpeechIdsValidation: 'syntax-order-and-input-endpoint-existence'
      },
      modelInput
    };
    const promptPath = path.join(dir, 'prompt.md');
    const payloadPath = path.join(dir, 'prompt-input.json');
    const inspectionPath = path.join(dir, 'leakage-inspection.json');
    await writeFile(promptPath, prompt);
    await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
    await writeFile(inspectionPath, `${JSON.stringify({ kind: 'theme_composition_connection_leakage_inspection', passed: true, sourceOnly: true, containsExpectedData: false, connectionVersion: 'connection-v002', fixtureId: oldInput.fixtureId, candidateIndex: oldInput.candidateIndex, transcriptSha256: hash(JSON.stringify(modelInput.transcript)), candidateSpeechIdsSha256: hash(JSON.stringify(modelInput.selectedTheme.candidateSpeechIds)), baselineTranscriptSha256: hash(JSON.stringify(oldPayload.modelInput.transcript)), baselineCandidateSpeechIdsSha256: hash(JSON.stringify(oldPayload.modelInput.selectedTheme.candidateSpeechIds)), fixedTranscript: JSON.stringify(modelInput.transcript) === JSON.stringify(oldPayload.modelInput.transcript), fixedCandidateSpeechIds: JSON.stringify(modelInput.selectedTheme.candidateSpeechIds) === JSON.stringify(oldPayload.modelInput.selectedTheme.candidateSpeechIds), promptBytes: Buffer.byteLength(prompt), promptSha256: hash(prompt), closeTabAfterRunRequired: true }, null, 2)}\n`);
    inputs.push({ fixtureId: oldInput.fixtureId, sourceVideoId: oldInput.sourceVideoId, candidateIndex: oldInput.candidateIndex, contextCondition: 'theme-window-plus-minus-5m', promptPath: path.relative(root, promptPath), payloadPath: path.relative(root, payloadPath), leakageInspectionPath: path.relative(root, inspectionPath), outputDir: path.relative(root, dir), promptSha256: hash(prompt), evidenceRangeDurationMs: oldInput.evidenceRangeDurationMs });
  }
  const manifest = { kind: 'theme_composition_connection_main_input_manifest', resultRole: 'connected-composition-eval-connection-v002-inputs', runAt: new Date().toISOString(), outputId: '20260712-connection-v002-main-v001', connectionVersion: 'connection-v002', generationSystem: 'llm-v013@gemini-web-flash', upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash', inputSelectionVersion: 'input-selection-v004', promptVersion: 'clip_composition_prompt_v013', model: 'gemini-web-flash', contextCondition: 'theme-window-plus-minus-5m', runsPerCandidate: 3, candidateCount: inputs.length, totalOutputCount: inputs.length * 3, plannedNewGeminiCallCount: inputs.length * 3, baselineOutputId: '20260712-connection-main-v001', inputs, status: 'ready_for_execution' };
  await writeFile(path.join(outputRoot, 'input-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ candidateCount: inputs.length, plannedCalls: inputs.length * 3 }, null, 2));
}
main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });

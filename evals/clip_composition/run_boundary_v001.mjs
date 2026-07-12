#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = rootDir();
const outputRoot = path.join(root, 'evals', 'clip_composition', 'outputs', 'theme-composition-boundary', '20260713-boundary-v001-main-v001');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
  });
}

function pointMap(words) {
  const map = new Map();
  words.forEach((word, index) => {
    map.set(`${word.id}:start`, { pointId: `${word.id}:start`, timeMs: word.s, kind: 'start', wordIndex: index });
    map.set(`${word.id}:end`, { pointId: `${word.id}:end`, timeMs: word.e, kind: 'end', wordIndex: index });
  });
  return map;
}

function neighborhood(words, index) {
  return words.slice(Math.max(0, index - 2), Math.min(words.length, index + 3)).map((word) => ({ wordId: word.id, sourceStartMs: word.s, sourceEndMs: word.e, text: word.t }));
}

function enrichAndValidate(output, payload) {
  const issues = [];
  const refinements = Array.isArray(output.refinements) ? output.refinements : [];
  if (!Array.isArray(output.refinements)) issues.push('refinements-not-array');
  if (refinements.length !== payload.modelInput.provisionalCuts.length) issues.push(`refinement-count:${refinements.length}/${payload.modelInput.provisionalCuts.length}`);
  const words = payload.modelInput.localContext.words;
  const points = pointMap(words);
  const evidence = [];
  const seen = new Set();
  for (const refinement of refinements) {
    if (!refinement || typeof refinement !== 'object') { issues.push('refinement-not-object'); continue; }
    const cutIndex = refinement.provisionalCutIndex;
    if (!Number.isInteger(cutIndex) || cutIndex < 1 || cutIndex > payload.modelInput.provisionalCuts.length) { issues.push(`invalid-cut-index:${cutIndex}`); continue; }
    if (seen.has(cutIndex)) issues.push(`duplicate-cut-index:${cutIndex}`);
    seen.add(cutIndex);
    const cut = payload.modelInput.provisionalCuts[cutIndex - 1];
    const start = points.get(refinement.startBoundaryPointId);
    const end = points.get(refinement.endBoundaryPointId);
    if (!start) issues.push(`missing-start-point:${refinement.startBoundaryPointId}`);
    if (!end) issues.push(`missing-end-point:${refinement.endBoundaryPointId}`);
    if (start && (start.timeMs < cut.startWindow.sourceStartMs || start.timeMs > cut.startWindow.sourceEndMs)) issues.push(`start-point-outside-window:${start.pointId}`);
    if (end && (end.timeMs < cut.endWindow.sourceStartMs || end.timeMs > cut.endWindow.sourceEndMs)) issues.push(`end-point-outside-window:${end.pointId}`);
    if (start && end && start.timeMs >= end.timeMs) issues.push(`boundary-order:${start.timeMs}/${end.timeMs}`);
    if (typeof refinement.startReason !== 'string' || !refinement.startReason.trim()) issues.push(`missing-start-reason:${cutIndex}`);
    if (typeof refinement.endReason !== 'string' || !refinement.endReason.trim()) issues.push(`missing-end-reason:${cutIndex}`);
    evidence.push({
      provisionalCutIndex: cutIndex,
      start: start ? { ...start, selectedWord: words[start.wordIndex], surroundingWords: neighborhood(words, start.wordIndex), reason: refinement.startReason } : { pointId: refinement.startBoundaryPointId, reason: refinement.startReason },
      end: end ? { ...end, selectedWord: words[end.wordIndex], surroundingWords: neighborhood(words, end.wordIndex), reason: refinement.endReason } : { pointId: refinement.endBoundaryPointId, reason: refinement.endReason }
    });
  }
  for (let index = 1; index <= payload.modelInput.provisionalCuts.length; index += 1) if (!seen.has(index)) issues.push(`missing-cut-index:${index}`);
  return {
    ...output,
    boundaryContractValidation: { passed: issues.length === 0, issues, checkedAt: new Date().toISOString(), checks: ['point-id-exists', 'point-in-correct-90s-window', 'start-before-end', 'same-cut-count', 'no-duplicate-or-missing-cut-index', 'reasons-present'] },
    selectedBoundaryEvidence: evidence
  };
}

async function main() {
  const manifest = await readJson(path.join(outputRoot, 'input-manifest.json'));
  if (manifest.generationSystem !== 'boundary-v001@gemini-web-flash' || manifest.plannedGeminiCallCount !== 71 || manifest.contextRadiusMs !== 90000) throw new Error('boundary-v001 manifest不一致');
  const completed = [];
  const reused = [];
  const failed = [];
  for (const input of manifest.inputs) {
    const inspection = await readJson(path.join(root, input.leakageInspectionPath));
    if (!inspection.passed || inspection.containsExpectedData !== false || !inspection.sourceOnlyTranscript || !inspection.structuralChangesForbidden || inspection.contextRadiusMs !== 90000 || !inspection.closeTabAfterRunRequired) throw new Error(`事前検査不合格 ${input.fixtureId} ${input.candidateIndex} run${input.runIndex}`);
    const outputPath = path.join(root, input.outputPath);
    if (existsSync(outputPath)) {
      const existing = await readJson(outputPath);
      if (existing.model !== 'gemini-web-flash' || !existing.boundaryContractValidation) throw new Error(`既存出力不正 ${outputPath}`);
      reused.push(input.outputPath);
      continue;
    }
    const params = {
      temperature: 'web-default', source: 'gemini-web', manualRun: false, runner: 'edge-cdp-text-prompt',
      generationSystem: 'boundary-v001@gemini-web-flash', upstreamGenerationSystems: ['theme-llm-v002@gemini-web-flash', 'llm-v012@gemini-web-flash'],
      resultRole: 'boundary-refinement-eval', promptVersion: 'boundary_refinement_prompt_v001', fixtureId: input.fixtureId, candidateIndex: input.candidateIndex, runIndex: input.runIndex, contextRadiusMs: 90000, inputPromptSha256: input.promptSha256
    };
    try {
      await run('pnpm', ['--filter', '@zev2/agent-runner', 'exec', 'tsx', '../evals/clip_composition/run_web_gemini_prompt.ts', '--prompt', path.join(root, input.promptPath), '--output', outputPath, '--model', 'gemini-web-flash', '--params', JSON.stringify(params), '--timeoutMs', '240000', '--rejectPartialExtraction', '--closeTabAfterRun']);
    } catch (error) {
      const diagnosticPath = `${outputPath}.failure.json`;
      const failureRecord = {
        refinements: [],
        runAt: new Date().toISOString(),
        model: 'gemini-web-flash',
        params,
        promptFile: input.promptPath,
        executionFailure: {
          type: 'web-generation-incomplete-or-runner-failure',
          message: error instanceof Error ? error.message : String(error),
          failureDiagnosticPath: existsSync(diagnosticPath) ? path.relative(root, diagnosticPath) : null
        },
        boundaryContractValidation: {
          passed: false,
          issues: ['web-generation-incomplete-or-runner-failure'],
          checkedAt: new Date().toISOString(),
          checks: ['complete-refinements-json-required', 'partial-output-not-scored']
        },
        selectedBoundaryEvidence: []
      };
      await writeFile(outputPath, `${JSON.stringify(failureRecord, null, 2)}\n`);
      failed.push(input.outputPath);
      await writeFile(path.join(outputRoot, 'execution-progress.json'), `${JSON.stringify({ kind: 'boundary_v001_progress', updatedAt: new Date().toISOString(), completed, reused, failed, total: completed.length + reused.length + failed.length, planned: manifest.plannedGeminiCallCount, status: 'running', closeTabAfterRun: true }, null, 2)}\n`);
      console.error(`boundary run failed and recorded: ${input.fixtureId} candidate ${input.candidateIndex} run ${input.runIndex}`);
      continue;
    }
    const rawOutput = await readJson(outputPath);
    const payload = await readJson(path.join(root, input.payloadPath));
    await writeFile(outputPath, `${JSON.stringify(enrichAndValidate(rawOutput, payload), null, 2)}\n`);
    completed.push(input.outputPath);
    await writeFile(path.join(outputRoot, 'execution-progress.json'), `${JSON.stringify({ kind: 'boundary_v001_progress', updatedAt: new Date().toISOString(), completed, reused, failed, total: completed.length + reused.length + failed.length, planned: manifest.plannedGeminiCallCount, status: 'running', closeTabAfterRun: true }, null, 2)}\n`);
  }
  await writeFile(path.join(outputRoot, 'execution-progress.json'), `${JSON.stringify({ kind: 'boundary_v001_progress', updatedAt: new Date().toISOString(), completed, reused, failed, total: completed.length + reused.length + failed.length, planned: manifest.plannedGeminiCallCount, status: 'complete', closeTabAfterRun: true }, null, 2)}\n`);
  console.log(JSON.stringify({ completed: completed.length, reused: reused.length, failed: failed.length, total: completed.length + reused.length + failed.length }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

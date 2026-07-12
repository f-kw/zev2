#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-boundary', '20260713-boundary-v001-main-v001');
const baselinePath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001', 'result.json');
const datasets = {
  nOEWCNc77MI_multiblock_material_v001: {
    sourceVideoId: 'YE-faluP7zY',
    transcriptPath: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    sourceVideoId: 'o8rZAhARXAc',
    transcriptPath: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
  }
};
const contextRadiusMs = 90000;
const excludedStructural = { fixtureId: '9dtwF5Exu5w_multiblock_material_v001', candidateIndex: 16, reason: 'one provisional interval overlaps four expected cuts; two-point refinement cannot split it' };

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const wordLabel = (id) => `word-${String(id).padStart(6, '0')}`;

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

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const merged = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.startMs <= last.endMs) last.endMs = Math.max(last.endMs, range.endMs);
    else merged.push({ ...range });
  }
  return merged;
}

function intersects(item, ranges, startKey, endKey) {
  return ranges.some((range) => item[endKey] >= range.startMs && item[startKey] <= range.endMs);
}

function buildWordRecords(rawSegments, ranges) {
  return rawSegments.filter((word) => intersects(word, ranges, 'startMs', 'endMs')).map((word) => ({
    id: wordLabel(word.id),
    s: word.startMs,
    e: word.endMs,
    t: String(word.text ?? '')
  }));
}

function assessmentKey(run, assessment) {
  return `${run.fixtureId}:${run.candidateIndex}:${run.runIndex}:${assessment.expectedIndex}`;
}

async function main() {
  const baseline = await readJson(baselinePath);
  const template = await readFile(path.join(evalRoot, 'prompts', 'boundary_refinement_prompt_v001.md'), 'utf8');
  const cache = {};
  for (const [fixtureId, dataset] of Object.entries(datasets)) {
    const transcript = await readJson(dataset.transcriptPath);
    cache[fixtureId] = {
      transcript,
      rawSegments: transcript.segments.filter((item) => String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs),
      speechSegments: compact(dataset.sourceVideoId, transcript),
      dataset
    };
  }
  await mkdir(outputRoot, { recursive: true });

  const inputs = [];
  const skipped = [];
  for (const run of baseline.runs) {
    if (run.fixtureId === excludedStructural.fixtureId && run.candidateIndex === excludedStructural.candidateIndex) {
      skipped.push({ fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, reason: 'structural-excluded-candidate-16' });
      continue;
    }
    if (!run.formatValid || !run.selectedCuts.length) {
      skipped.push({ fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, reason: 'v012-not-runnable' });
      continue;
    }
    const data = cache[run.fixtureId];
    if (!data) throw new Error(`datasetなし: ${run.fixtureId}`);
    const ranges = mergeRanges(run.selectedCuts.flatMap((cut) => [
      { startMs: Math.max(0, cut.sourceStartMs - contextRadiusMs), endMs: cut.sourceStartMs + contextRadiusMs },
      { startMs: Math.max(0, cut.sourceEndMs - contextRadiusMs), endMs: cut.sourceEndMs + contextRadiusMs }
    ]));
    const words = buildWordRecords(data.rawSegments, ranges);
    const speechSegments = data.speechSegments.filter((segment) => intersects(segment, ranges, 'sourceStartMs', 'sourceEndMs')).map((segment) => ({ id: segment.speechId, s: segment.sourceStartMs, e: segment.sourceEndMs, t: segment.text }));
    const provisionalCuts = run.selectedCuts.map((cut, index) => ({
      provisionalCutIndex: index + 1,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      usedSpeechIds: cut.usedSpeechIds,
      reason: cut.reason,
      startWindow: { sourceStartMs: Math.max(0, cut.sourceStartMs - contextRadiusMs), sourceEndMs: cut.sourceStartMs + contextRadiusMs },
      endWindow: { sourceStartMs: Math.max(0, cut.sourceEndMs - contextRadiusMs), sourceEndMs: cut.sourceEndMs + contextRadiusMs }
    }));
    const modelInput = {
      task: 'boundary_refinement_only',
      generationSystem: 'boundary-v001@gemini-web-flash',
      upstreamGenerationSystems: ['theme-llm-v002@gemini-web-flash', 'llm-v012@gemini-web-flash'],
      sourceVideoId: data.dataset.sourceVideoId,
      contract: {
        keepProvisionalCutCount: true,
        noAddDeleteSplitMerge: true,
        selectExistingBoundaryPointIdsOnly: true,
        numericTimestampGenerationForbidden: true,
        contextRadiusMs
      },
      provisionalCuts,
      localContext: {
        fieldLegend: { s: 'sourceStartMs', e: 'sourceEndMs', t: 'text', boundaryPointId: 'word idに:startまたは:endを付ける' },
        mergedRanges: ranges,
        speechSegments,
        words
      },
      outputContract: {
        format: 'json_only',
        schema: { refinements: [{ provisionalCutIndex: 'number', startBoundaryPointId: 'string', endBoundaryPointId: 'string', startReason: 'one_sentence', endReason: 'one_sentence' }] }
      }
    };
    const serialized = JSON.stringify(modelInput);
    for (const forbidden of ['expectedCuts', 'expectedIndex', 'clipStartMs', 'clipEndMs', 'humanVerification', 'materialBlock', 'verificationStatus']) {
      if (serialized.includes(forbidden)) throw new Error(`禁止情報: ${forbidden}`);
    }
    const prompt = `${template.trimEnd()}\n\n## 入力JSON\n\n\`\`\`json\n${JSON.stringify(modelInput, null, 2)}\n\`\`\`\n`;
    const dir = path.join(outputRoot, run.fixtureId, `candidate-${String(run.candidateIndex).padStart(3, '0')}`, `run-${String(run.runIndex).padStart(2, '0')}`);
    await mkdir(dir, { recursive: true });
    const promptPath = path.join(dir, 'prompt.md');
    const payloadPath = path.join(dir, 'prompt-input.json');
    const inspectionPath = path.join(dir, 'leakage-inspection.json');
    const payload = {
      kind: 'boundary_v001_prompt_payload',
      runAt: new Date().toISOString(),
      generationSystem: 'boundary-v001@gemini-web-flash',
      fixtureId: run.fixtureId,
      candidateIndex: run.candidateIndex,
      runIndex: run.runIndex,
      baselineOutputPath: run.outputPath,
      provisionalCutCount: provisionalCuts.length,
      wordCount: words.length,
      boundaryPointCount: words.length * 2,
      modelInput
    };
    const inspection = {
      kind: 'boundary_v001_leakage_inspection',
      passed: true,
      containsExpectedData: false,
      sourceOnlyTranscript: true,
      usesProductionAvailableV012Output: true,
      structuralChangesForbidden: true,
      contextRadiusMs,
      fixtureId: run.fixtureId,
      candidateIndex: run.candidateIndex,
      runIndex: run.runIndex,
      promptBytes: Buffer.byteLength(prompt),
      promptSha256: sha256(prompt),
      wordCount: words.length,
      boundaryPointCount: words.length * 2,
      closeTabAfterRunRequired: true
    };
    await writeFile(promptPath, prompt);
    await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
    await writeFile(inspectionPath, `${JSON.stringify(inspection, null, 2)}\n`);
    inputs.push({ fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, promptPath: path.relative(root, promptPath), payloadPath: path.relative(root, payloadPath), leakageInspectionPath: path.relative(root, inspectionPath), outputPath: path.relative(root, path.join(dir, 'gemini-output.json')), promptSha256: sha256(prompt), provisionalCutCount: provisionalCuts.length, wordCount: words.length, boundaryPointCount: words.length * 2 });
  }

  const reached = baseline.runs.flatMap((run) => run.targetAssessments.filter((assessment) => assessment.reached).map((assessment) => ({
    key: assessmentKey(run, assessment), fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, expectedIndex: assessment.expectedIndex,
    inputVisible90s: Math.abs(assessment.startDeltaMs) <= contextRadiusMs && Math.abs(assessment.endDeltaMs) <= contextRadiusMs,
    structuralExcluded: run.fixtureId === excludedStructural.fixtureId && run.candidateIndex === excludedStructural.candidateIndex,
    baselineStartDeltaMs: assessment.startDeltaMs,
    baselineEndDeltaMs: assessment.endDeltaMs
  })));
  const primaryVisible = reached.filter((item) => item.inputVisible90s && !item.structuralExcluded);
  const structuralExcludedReached = reached.filter((item) => item.structuralExcluded);
  const secondaryAssessable = reached.filter((item) => !item.structuralExcluded);
  const scoringCohorts = {
    kind: 'boundary_v001_scoring_cohorts',
    runAt: new Date().toISOString(),
    conclusionBasis: 'primary-visible-61',
    fullReachedPopulationCount: reached.length,
    primaryVisibleCount: primaryVisible.length,
    fullReachedSecondaryTableCount: reached.length,
    structuralExcludedReachedCount: structuralExcludedReached.length,
    assessableReachedCount: secondaryAssessable.length,
    assessableInputInvisibleCount: secondaryAssessable.filter((item) => !item.inputVisible90s).length,
    rawInputInvisibleCount: reached.filter((item) => !item.inputVisible90s).length,
    primaryVisible,
    fullReachedPopulation: reached,
    structuralExcludedReached,
    policy: {
      primary: 'true boundaries visible within both ±90s windows; conclusion uses this cohort',
      secondary: 'all 79 v012-reached observations are shown; candidate16 rows are labeled structurally excluded and not counted as boundary-v001 failures',
      candidate16: excludedStructural
    }
  };
  if (inputs.length !== 71 || skipped.length !== 4) throw new Error(`入力件数不一致 inputs=${inputs.length} skipped=${skipped.length}`);
  if (reached.length !== 79 || primaryVisible.length !== 61 || structuralExcludedReached.length !== 8 || secondaryAssessable.length !== 71 || scoringCohorts.assessableInputInvisibleCount !== 10 || scoringCohorts.rawInputInvisibleCount !== 18) throw new Error('採点cohort件数不一致');
  const manifest = {
    kind: 'boundary_v001_input_manifest',
    runAt: new Date().toISOString(),
    outputId: '20260713-boundary-v001-main-v001',
    generationSystem: 'boundary-v001@gemini-web-flash',
    upstreamGenerationSystems: ['theme-llm-v002@gemini-web-flash', 'llm-v012@gemini-web-flash'],
    model: 'gemini-web-flash',
    contextRadiusMs,
    candidateCount: 25,
    baselineRunCount: 75,
    plannedGeminiCallCount: inputs.length,
    structuralExcludedCandidate: excludedStructural,
    inputs,
    skipped,
    status: 'ready_for_execution'
  };
  await writeFile(path.join(outputRoot, 'input-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'scoring-cohorts.json'), `${JSON.stringify(scoringCohorts, null, 2)}\n`);
  console.log(JSON.stringify({ plannedGeminiCallCount: inputs.length, skipped, promptBytes: { min: Math.min(...inputs.map((item) => item.wordCount)), maxWordCount: Math.max(...inputs.map((item) => item.wordCount)) }, scoring: { fullReached: reached.length, primaryVisible: primaryVisible.length, structuralExcluded: structuralExcludedReached.length, assessable: secondaryAssessable.length, assessableInvisible: scoringCohorts.assessableInputInvisibleCount } }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

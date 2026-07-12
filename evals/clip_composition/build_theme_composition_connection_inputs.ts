import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;

type SourceSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
};

type PromptSegment = {
  speechId: number;
  sourceVideoId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
};

type ThemeCandidate = {
  title: string;
  reason: string;
  windowId: string;
  sourceVideoId: string;
  evidenceRanges: Array<{
    sourceVideoId: string;
    sourceStartMs: number;
    sourceEndMs: number;
    supportingSpeechIds: Array<number | string>;
  }>;
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const upstreamRoot = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'nOEWCNc77MI_chat_velocity_top100_input_selection_v004',
  'theme-llm-v002',
  '20260711-chat-velocity-top100-v001'
);
const pilotManifestPath = path.join(
  evalRoot,
  'outputs',
  'theme-composition-connection',
  'theme-v002-to-llm-v012-pilot-targets-20260712-v001.json'
);
const sourceTranscriptPath = path.join(
  evalRoot,
  'stt',
  'nOEWCNc77MI_YE-faluP7zY_local30_v001',
  'source',
  'transcript.json'
);
const sourceManifestPath = path.join(
  evalRoot,
  'stt',
  'nOEWCNc77MI_YE-faluP7zY_local30_v001',
  'source',
  'manifest.json'
);

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function outputId(): string {
  const index = process.argv.indexOf('--outputId');
  const raw = index >= 0 ? process.argv[index + 1] : '20260712-context-pilot-v001';
  if (!raw || !/^[a-zA-Z0-9_-]+$/.test(raw)) throw new Error('--outputId が不正です');
  return raw;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function compactSegments(sourceVideoId: string, rawSegments: SourceSegment[]): PromptSegment[] {
  const compacted: Array<PromptSegment & { sourceSegmentIds: number[] }> = [];
  let current: (PromptSegment & { sourceSegmentIds: number[] }) | undefined;
  const segments = rawSegments
    .filter((segment) => String(segment.text ?? '').trim())
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const text = String(segment.text ?? '').trim();
    if (!current) {
      current = {
        speechId: compacted.length + 1,
        sourceVideoId,
        sourceStartMs: segment.startMs,
        sourceEndMs: segment.endMs,
        text: '',
        sourceSegmentIds: []
      };
    }
    current.sourceEndMs = Math.max(current.sourceEndMs, segment.endMs);
    current.text += text;
    current.sourceSegmentIds.push(segment.id);
    const next = segments[index + 1];
    const endsByText = /[。！？!?]/.test(text);
    const endsByTime = !next || next.startMs > current.sourceEndMs;
    if (endsByText || endsByTime) {
      compacted.push(current);
      current = undefined;
    }
  }
  if (current) compacted.push(current);
  return compacted.map(({ sourceSegmentIds: _sourceSegmentIds, ...segment }, index) => ({
    ...segment,
    speechId: index + 1
  }));
}

function expandSpeechIds(values: Array<number | string>): number[] {
  const expanded: number[] = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      expanded.push(value);
      continue;
    }
    if (typeof value !== 'string') throw new Error(`根拠発話IDが不正です: ${String(value)}`);
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      expanded.push(Number(trimmed));
      continue;
    }
    const match = trimmed.match(/^(\d+)-(\d+)$/);
    if (!match) throw new Error(`根拠発話ID表記が不正です: ${value}`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start < 1 || end < start) throw new Error(`根拠発話ID範囲が不正です: ${value}`);
    for (let id = start; id <= end; id += 1) expanded.push(id);
  }
  return [...new Set(expanded)].sort((left, right) => left - right);
}

function promptMarkdown(template: string, modelInput: unknown): string {
  return [
    template.trimEnd(),
    '',
    '## 入力JSON',
    '',
    '```json',
    JSON.stringify(modelInput, null, 2),
    '```',
    ''
  ].join('\n');
}

function sameSegment(left: PromptSegment, right: PromptSegment): boolean {
  return left.speechId === right.speechId
    && left.sourceVideoId === right.sourceVideoId
    && left.sourceStartMs === right.sourceStartMs
    && left.sourceEndMs === right.sourceEndMs
    && left.text === right.text;
}

function assertNoLeak(modelInput: unknown, sourceVideoId: string, candidateIds: number[], context: PromptSegment[]) {
  const serialized = JSON.stringify(modelInput);
  const forbidden = [
    'nOEWCNc77MI',
    'expected',
    'expectedCuts',
    'clipId',
    'clipUrl',
    'materialBlock',
    'humanVerification',
    'verificationStatus',
    'alignment',
    'マリンところねRaftで船を作る'
  ];
  const found = forbidden.filter((term) => serialized.includes(term));
  if (found.length > 0) throw new Error(`モデル入力に禁止情報があります: ${found.join(', ')}`);
  if (context.some((segment) => segment.sourceVideoId !== sourceVideoId)) {
    throw new Error('モデル入力に別の元動画が混ざっています');
  }
  const contextIds = new Set(context.map((segment) => segment.speechId));
  const missing = candidateIds.filter((id) => !contextIds.has(id));
  if (missing.length > 0) throw new Error(`候補発話IDが文脈にありません: ${missing.join(', ')}`);
}

function buildModelInput(input: {
  sourceVideoId: string;
  language: string;
  durationSec: number;
  candidateIndex: number;
  theme: ThemeCandidate;
  candidateIds: number[];
  context: PromptSegment[];
}) {
  const candidateSet = new Set(input.candidateIds);
  return {
    task: 'fixed_theme_clip_interval_selection',
    evaluationInputId: `${input.sourceVideoId}-theme-candidate-${String(input.candidateIndex).padStart(3, '0')}`,
    sourceVideoId: input.sourceVideoId,
    selectedTheme: {
      id: `input-selection-v004-candidate-${String(input.candidateIndex).padStart(3, '0')}`,
      title: input.theme.title,
      summary: input.theme.reason,
      candidateSpeechIds: input.candidateIds,
      whyItCanBeClipped: input.theme.reason,
      compositionNote: '提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。'
    },
    transcript: {
      language: input.language,
      durationSec: input.durationSec,
      speechUnitGroups: [input.context.map((segment) => segment.speechId)],
      segments: input.context.map((segment) => ({
        speechId: segment.speechId,
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
        text: segment.text,
        isThemeCandidate: candidateSet.has(segment.speechId)
      }))
    },
    outputContract: {
      format: 'json_only',
      schema: {
        selectedCuts: [{
          sourceStartMs: 'number',
          sourceEndMs: 'number',
          reason: 'string',
          usedSpeechIds: ['number_or_range_string']
        }]
      }
    }
  };
}

async function main() {
  const id = outputId();
  const pilot = await readJson<JsonRecord>(pilotManifestPath);
  const candidateIndexes = pilot.candidateIndexes;
  if (!Array.isArray(candidateIndexes) || candidateIndexes.some((value) => !Number.isInteger(value))) {
    throw new Error('パイロット候補一覧が不正です');
  }
  const conditions = pilot.contextConditions;
  if (!Array.isArray(conditions) || conditions.length !== 2) throw new Error('文脈条件が不正です');
  const runs = Number(pilot.runsPerCondition);
  if (runs !== 3) throw new Error('パイロットは各条件3 runである必要があります');

  const sttManifest = await readJson<JsonRecord>(sourceManifestPath);
  const sttComplete = sttManifest.complete === true
    || (sttManifest.partial === false
      && Number.isInteger(sttManifest.processedChunkCount)
      && sttManifest.processedChunkCount === sttManifest.fullChunkCount);
  if (!sttComplete) throw new Error('元配信STTが完了していません');
  const transcript = await readJson<JsonRecord>(sourceTranscriptPath);
  if (!Array.isArray(transcript.segments)) throw new Error('元配信STTに発話がありません');
  const sourceVideoId = 'YE-faluP7zY';
  const fullCompacted = compactSegments(sourceVideoId, transcript.segments as SourceSegment[]);
  const fullById = new Map(fullCompacted.map((segment) => [segment.speechId, segment]));

  const upstream = await readJson<{ themes: ThemeCandidate[] }>(path.join(upstreamRoot, 'run-01-gemini-output.json'));
  const promptTemplate = await readFile(path.join(evalRoot, 'prompts', 'clip_composition_prompt_v012.md'), 'utf8');
  const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', id);
  await mkdir(outputRoot, { recursive: true });
  const builtInputs: JsonRecord[] = [];

  for (const rawCandidateIndex of candidateIndexes as number[]) {
    const candidateIndex = Number(rawCandidateIndex);
    const theme = upstream.themes[candidateIndex - 1];
    if (!theme) throw new Error(`候補${candidateIndex}がありません`);
    if (theme.sourceVideoId !== sourceVideoId || !theme.windowId) throw new Error(`候補${candidateIndex}の由来が不正です`);
    const candidateIds = expandSpeechIds(theme.evidenceRanges.flatMap((range) => range.supportingSpeechIds));
    const windowPayloadPath = path.join(upstreamRoot, 'windows', `${theme.windowId}-prompt-input.json`);
    const windowPayload = await readJson<JsonRecord>(windowPayloadPath);
    const windowModelInput = windowPayload.modelInput as JsonRecord;
    const sources = windowModelInput.sources;
    if (!Array.isArray(sources) || sources.length !== 1) throw new Error(`候補${candidateIndex}の上流窓が不正です`);
    const source = sources[0] as JsonRecord;
    const windowSegments = source.segments as PromptSegment[];
    if (!Array.isArray(windowSegments) || windowSegments.length === 0) throw new Error(`候補${candidateIndex}の上流窓に発話がありません`);
    for (const segment of windowSegments) {
      const rebuilt = fullById.get(segment.speechId);
      if (!rebuilt || !sameSegment(segment, rebuilt)) {
        throw new Error(`候補${candidateIndex}の上流窓と完全STT再構成が一致しません: speech ${segment.speechId}`);
      }
    }

    for (const rawCondition of conditions as JsonRecord[]) {
      const conditionId = String(rawCondition.id);
      let context: PromptSegment[];
      let contextStartMs: number;
      let contextEndMs: number;
      if (conditionId === 'theme-window-only') {
        context = windowSegments;
        contextStartMs = windowSegments[0].sourceStartMs;
        contextEndMs = windowSegments[windowSegments.length - 1].sourceEndMs;
      } else if (conditionId === 'theme-window-plus-minus-5m') {
        const beforeMs = Number(rawCondition.extensionBeforeMs);
        const afterMs = Number(rawCondition.extensionAfterMs);
        if (beforeMs !== 300000 || afterMs !== 300000) throw new Error('拡張幅が事前登録と一致しません');
        contextStartMs = Math.max(0, windowSegments[0].sourceStartMs - beforeMs);
        contextEndMs = Math.min(Number(transcript.durationSec) * 1000, windowSegments[windowSegments.length - 1].sourceEndMs + afterMs);
        context = fullCompacted.filter((segment) =>
          segment.sourceEndMs > contextStartMs && segment.sourceStartMs < contextEndMs
        );
      } else {
        throw new Error(`未対応の文脈条件です: ${conditionId}`);
      }

      const modelInput = buildModelInput({
        sourceVideoId,
        language: typeof transcript.language === 'string' ? transcript.language : 'ja-JP',
        durationSec: Number(transcript.durationSec),
        candidateIndex,
        theme,
        candidateIds,
        context
      });
      assertNoLeak(modelInput, sourceVideoId, candidateIds, context);
      const prompt = promptMarkdown(promptTemplate, modelInput);
      const candidateDir = path.join(outputRoot, `candidate-${String(candidateIndex).padStart(3, '0')}`, conditionId);
      await mkdir(candidateDir, { recursive: true });
      const payloadPath = path.join(candidateDir, 'prompt-input.json');
      const promptPath = path.join(candidateDir, 'prompt.md');
      const inspectionPath = path.join(candidateDir, 'leakage-inspection.json');
      const evidenceRangeDurationMs = theme.evidenceRanges.reduce(
        (sum, range) => sum + (range.sourceEndMs - range.sourceStartMs),
        0
      );
      const payload = {
        kind: 'theme_composition_connection_prompt_payload',
        resultRole: 'connected-composition-eval-pilot-input',
        runAt: new Date().toISOString(),
        generationSystem: 'llm-v012@gemini-web-flash',
        upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash',
        inputSelectionVersion: 'input-selection-v004',
        promptVersion: 'clip_composition_prompt_v012',
        candidateIndex,
        contextCondition: conditionId,
        plannedRuns: runs,
        evidenceRangeDurationMs,
        contextStartMs,
        contextEndMs,
        contextSegmentCount: context.length,
        candidateSpeechIds: candidateIds,
        upstreamWindowId: theme.windowId,
        modelInput
      };
      await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      await writeFile(promptPath, prompt, 'utf8');
      await writeFile(inspectionPath, `${JSON.stringify({
        kind: 'theme_composition_connection_leakage_inspection',
        passed: true,
        sourceOnly: true,
        containsExpectedData: false,
        candidateIndex,
        contextCondition: conditionId,
        candidateSpeechIdCount: candidateIds.length,
        contextSegmentCount: context.length,
        promptBytes: Buffer.byteLength(prompt, 'utf8'),
        promptSha256: sha256(prompt),
        promptVersion: 'clip_composition_prompt_v012',
        closeTabAfterRunRequired: true
      }, null, 2)}\n`, 'utf8');
      builtInputs.push({
        candidateIndex,
        contextCondition: conditionId,
        promptPath: path.relative(root, promptPath),
        payloadPath: path.relative(root, payloadPath),
        leakageInspectionPath: path.relative(root, inspectionPath),
        evidenceRangeDurationMs,
        contextStartMs,
        contextEndMs,
        contextSegmentCount: context.length,
        candidateSpeechIdCount: candidateIds.length,
        promptBytes: Buffer.byteLength(prompt, 'utf8'),
        promptSha256: sha256(prompt)
      });
    }
  }

  const manifest = {
    kind: 'theme_composition_connection_pilot_input_manifest',
    resultRole: 'connected-composition-eval-pilot-inputs',
    runAt: new Date().toISOString(),
    outputId: id,
    generationSystem: 'llm-v012@gemini-web-flash',
    upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash',
    promptVersion: 'clip_composition_prompt_v012',
    model: 'gemini-web-flash',
    runsPerInput: runs,
    inputCount: builtInputs.length,
    plannedGeminiCallCount: builtInputs.length * runs,
    inputs: builtInputs,
    status: 'ready_for_execution'
  };
  const manifestPath = path.join(outputRoot, 'input-manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ manifestPath, inputCount: builtInputs.length, plannedGeminiCallCount: builtInputs.length * runs }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

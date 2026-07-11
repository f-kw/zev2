#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

  const target = required(values, 'target');
  const sourceVideoId = required(values, 'sourceVideoId');
  const sttId = required(values, 'sttId');
  const maxPromptBytes = positiveInt(required(values, 'maxPromptBytes'), 'maxPromptBytes');
  const overlapMs = nonNegativeInt(required(values, 'overlapMs'), 'overlapMs');
  const requestedThemeCount = positiveInt(required(values, 'requestedThemeCount'), 'requestedThemeCount');
  const runs = positiveInt(required(values, 'runs'), 'runs');
  return {
    target: sanitizePathPart(target),
    inputSetId: sanitizePathPart(values.get('inputSetId')?.trim() || `${target}_source_only_redo_v001`),
    sourceVideoId: sanitizePathPart(sourceVideoId),
    sttId: sanitizePathPart(sttId),
    transcriptPath: resolvePath(values.get('transcript')?.trim() || `evals/clip_composition/stt/${sttId}/source/transcript.json`),
    sttManifestPath: resolvePath(values.get('sttManifest')?.trim() || ''),
    sourceInfoPath: resolvePath(values.get('sourceInfo')?.trim() || ''),
    sourceUrl: values.get('sourceUrl')?.trim() || '',
    promptVersion: values.get('promptVersion')?.trim() || 'theme_generation_prompt_v001',
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    requestedThemeCount,
    runs,
    maxPromptBytes,
    overlapMs,
    bridgeSeams: values.has('bridgeSeams'),
    allowIncompleteStt: values.has('allowIncompleteStt'),
    selectionPlanPath: resolvePath(values.get('selectionPlan')?.trim() || '')
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
  if (!filePath) {
    return undefined;
  }
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readSourceTitle() {
  if (!options.sourceInfoPath || !existsSync(options.sourceInfoPath)) {
    return undefined;
  }
  const record = await readJson(options.sourceInfoPath);
  if (typeof record.title === 'string' && record.title.trim()) {
    return record.title.trim();
  }
  return undefined;
}

async function readSttManifest() {
  if (!options.sttManifestPath) {
    return undefined;
  }
  if (!existsSync(options.sttManifestPath)) {
    throw new Error(`STT manifestがありません: ${options.sttManifestPath}`);
  }
  const manifest = await readJson(options.sttManifestPath);
  const complete = typeof manifest.complete === 'boolean'
    ? manifest.complete
    : manifest.partial === false
      && Number.isInteger(manifest.processedChunkCount)
      && Number.isInteger(manifest.fullChunkCount)
      && manifest.processedChunkCount === manifest.fullChunkCount;
  if (!complete && !options.allowIncompleteStt) {
    throw new Error([
      'STT manifestが未完了です。',
      `manifest: ${options.sttManifestPath}`,
      '途中transcriptをLLM入力化しないでください。',
      '検査目的で明示的に使う場合のみ --allowIncompleteStt を付けてください。'
    ].join('\n'));
  }
  return { ...manifest, complete };
}

function compactSegments(sourceVideoId, transcript) {
  const compacted = [];
  let current = undefined;
  const segments = (Array.isArray(transcript.segments) ? transcript.segments : [])
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
    const currentEndsByText = /[。！？!?]/.test(text);
    const currentEndsByTime = !next || next.startMs > current.sourceEndMs;
    if (currentEndsByText || currentEndsByTime) {
      compacted.push(current);
      current = undefined;
    }
  }
  if (current) {
    compacted.push(current);
  }
  return compacted.map((segment, index) => ({ ...segment, speechId: index + 1 }));
}

function overlapMs(left, right) {
  if (left.sourceVideoId !== right.sourceVideoId) return 0;
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function selectedPromptSegments(allPromptSegments, selectionPlan) {
  if (!selectionPlan) return allPromptSegments;
  if (selectionPlan.kind !== 'chat_velocity_source_only_input_selection_plan') {
    throw new Error('selection planのkindが対応形式ではありません');
  }
  if (selectionPlan.sourceVideoId !== options.sourceVideoId) {
    throw new Error('selection planの元配信IDが入力と一致しません');
  }
  if (!/^input-selection-v\d{3}$/.test(String(selectionPlan.inputSelectionVersion ?? ''))) {
    throw new Error('selection planに有効な入力選定版がありません');
  }
  if (!Array.isArray(selectionPlan.selectedRanges) || selectionPlan.selectedRanges.length === 0) {
    throw new Error('selection planに選択区間がありません');
  }
  const serialized = JSON.stringify(selectionPlan);
  for (const forbidden of ['expectedCuts', 'clipUrl', 'humanVerification', 'materialBlock']) {
    if (serialized.includes(forbidden)) {
      throw new Error(`selection planに評価専用情報が含まれています: ${forbidden}`);
    }
  }
  const ranges = selectionPlan.selectedRanges.map((range, index) => {
    if (range.sourceVideoId !== options.sourceVideoId
      || !Number.isFinite(range.sourceStartMs)
      || !Number.isFinite(range.sourceEndMs)
      || range.sourceEndMs <= range.sourceStartMs) {
      throw new Error(`selection planのselectedRanges[${index}]が不正です`);
    }
    return range;
  });
  const selected = allPromptSegments.filter((segment) => ranges.some((range) => overlapMs(segment, range) > 0));
  if (selected.length === 0) {
    throw new Error('selection planと重なる発話がありません');
  }
  return selected;
}

function outputContract() {
  if (options.promptVersion === 'theme_generation_prompt_v002') {
    return {
      format: 'json_only',
      schema: {
        themes: [
          {
            themeId: 'string',
            title: 'string',
            reason: 'string_one_sentence',
            evidenceRanges: [
              {
                sourceVideoId: 'string',
                sourceStartMs: 'number',
                sourceEndMs: 'number',
                supportingSpeechIds: ['number_or_range_string']
              }
            ]
          }
        ]
      }
    };
  }
  return {
    format: 'json_only',
    schema: {
      themes: [
        {
          themeId: 'string',
          title: 'string',
          summary: 'string',
          whyItCanBeClipped: 'string',
          sourceVideoId: 'string',
          sourceStartMs: 'number',
          sourceEndMs: 'number',
          supportingSpeechIds: ['number_or_range_string'],
          representativeQuote: 'string',
          riskNotes: ['string']
        }
      ]
    }
  };
}

function buildPromptMarkdown(promptTemplate, modelInput) {
  return [
    promptTemplate.trimEnd(),
    '',
    '## 入力JSON',
    '',
    '```json',
    JSON.stringify(modelInput, null, 2),
    '```',
    ''
  ].join('\n');
}

function sourceInput({ sourceTitle, transcript, promptSegments }) {
  return {
    sourceVideoId: options.sourceVideoId,
    ...(options.sourceUrl ? { sourceUrl: options.sourceUrl } : {}),
    ...(sourceTitle ? { sourceTitle } : {}),
    transcriptKind: 'local_stt',
    language: transcript.language ?? 'ja-JP',
    durationSec: transcript.durationSec,
    rawSegmentCount: Array.isArray(transcript.segments) ? transcript.segments.length : 0,
    promptSegmentCount: promptSegments.length,
    segmentCompaction: {
      method: 'source-only transcript segments concatenated until sentence-ending punctuation',
      scoringRole: 'none',
      note: '読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。'
    },
    segments: promptSegments.map((segment) => ({
      speechId: segment.speechId,
      sourceVideoId: segment.sourceVideoId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      text: segment.text
    }))
  };
}

function baseModelInput(source) {
  return {
    task: 'source_only_theme_generation',
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    inputPolicy: {
      sourceOnly: true,
      noClipInfo: true,
      noExpected: true,
      noAlignment: true,
      noHumanReverseTheme: true
    },
    windowing: {
      applied: false,
      reason: '元配信全体入力が長いため、実走前に発話境界を保った時間窓を作る。',
      overlapMs: 0,
      preMergeCandidateCount: null,
      postMergeCandidateCount: null
    },
    sources: [source],
    outputContract: outputContract()
  };
}

function modelInputForWindow(baseInput, source, segments, windowId) {
  return {
    ...baseInput,
    requestedThemeCount: options.requestedThemeCount,
    windowing: {
      applied: true,
      mode: 'speech-time',
      windowId,
      reason: '元配信全体入力が長いため、発話境界を保った時間窓へ分割する。',
      maxPromptBytes: options.maxPromptBytes,
      overlapMs: options.overlapMs,
      sourceVideoId: source.sourceVideoId,
      sourceStartMs: segments[0]?.sourceStartMs ?? 0,
      sourceEndMs: segments[segments.length - 1]?.sourceEndMs ?? 0
    },
    sources: [{
      ...source,
      promptSegmentCount: segments.length,
      segments
    }]
  };
}

function promptBytes(promptTemplate, modelInput) {
  return Buffer.byteLength(buildPromptMarkdown(promptTemplate, modelInput), 'utf8');
}

function probeWindowId(kind) {
  return `${kind}_999_${options.sourceVideoId}`;
}

function nextStartIndex(segments, currentStart, currentEnd) {
  if (currentEnd >= segments.length - 1) {
    return segments.length;
  }
  if (options.overlapMs === 0) {
    return currentEnd + 1;
  }
  const overlapStartMs = Math.max(segments[currentStart].sourceStartMs + 1, segments[currentEnd].sourceEndMs - options.overlapMs);
  const candidate = segments.findIndex((segment, index) => index > currentStart && segment.sourceEndMs > overlapStartMs);
  if (candidate < 0 || candidate > currentEnd + 1) {
    return currentEnd + 1;
  }
  return candidate;
}

function planSourceWindows(baseInput, source, promptTemplate) {
  const segments = [...source.segments].sort((left, right) =>
    left.sourceStartMs - right.sourceStartMs || left.sourceEndMs - right.sourceEndMs
  );
  const windows = [];
  let start = 0;
  while (start < segments.length) {
    let end = start;
    while (end + 1 < segments.length) {
      const candidateSegments = segments.slice(start, end + 2);
      const candidateInput = modelInputForWindow(baseInput, source, candidateSegments, probeWindowId('window'));
      if (promptBytes(promptTemplate, candidateInput) > options.maxPromptBytes && end >= start) {
        break;
      }
      end += 1;
    }
    windows.push(segments.slice(start, end + 1));
    start = nextStartIndex(segments, start, end);
  }
  return windows;
}

function indexOfSegment(segments, target) {
  return segments.findIndex((segment) => segment.speechId === target.speechId);
}

function promptBytesForSegmentRange(baseInput, source, segments, start, end, promptTemplate, windowId) {
  const windowInput = modelInputForWindow(baseInput, source, segments.slice(start, end + 1), windowId);
  return promptBytes(promptTemplate, windowInput);
}

function expandSeamWindow(baseInput, source, segments, leftEndIndex, rightStartIndex, promptTemplate, windowId) {
  let start = leftEndIndex;
  let end = rightStartIndex;
  const initialBytes = promptBytesForSegmentRange(baseInput, source, segments, start, end, promptTemplate, windowId);
  if (initialBytes > options.maxPromptBytes) {
    throw new Error(`${windowId} は境界両側の最小発話だけでprompt byte上限を超えました`);
  }

  while (true) {
    const candidates = [];
    if (start > 0) {
      const nextStart = start - 1;
      const bytes = promptBytesForSegmentRange(baseInput, source, segments, nextStart, end, promptTemplate, windowId);
      if (bytes <= options.maxPromptBytes) {
        candidates.push({
          side: 'left',
          start: nextStart,
          end,
          distanceToSeamMs: Math.max(0, segments[rightStartIndex].sourceStartMs - segments[nextStart].sourceEndMs)
        });
      }
    }
    if (end < segments.length - 1) {
      const nextEnd = end + 1;
      const bytes = promptBytesForSegmentRange(baseInput, source, segments, start, nextEnd, promptTemplate, windowId);
      if (bytes <= options.maxPromptBytes) {
        candidates.push({
          side: 'right',
          start,
          end: nextEnd,
          distanceToSeamMs: Math.max(0, segments[nextEnd].sourceStartMs - segments[leftEndIndex].sourceEndMs)
        });
      }
    }
    if (candidates.length === 0) {
      break;
    }

    candidates.sort((left, right) =>
      left.distanceToSeamMs - right.distanceToSeamMs
      || (left.side === right.side ? 0 : left.side === 'left' ? -1 : 1)
    );
    start = candidates[0].start;
    end = candidates[0].end;
  }

  return segments.slice(start, end + 1);
}

function planSeamBridgeWindows(baseInput, source, primaryWindows, promptTemplate) {
  if (!options.bridgeSeams || primaryWindows.length <= 1) {
    return [];
  }
  const segments = [...source.segments].sort((left, right) =>
    left.sourceStartMs - right.sourceStartMs || left.sourceEndMs - right.sourceEndMs
  );
  const bridgeWindows = [];
  for (let index = 0; index < primaryWindows.length - 1; index += 1) {
    const leftWindow = primaryWindows[index];
    const rightWindow = primaryWindows[index + 1];
    const leftEndIndex = indexOfSegment(segments, leftWindow[leftWindow.length - 1]);
    const rightStartIndex = indexOfSegment(segments, rightWindow[0]);
    if (leftEndIndex < 0 || rightStartIndex < 0 || rightStartIndex <= leftEndIndex) {
      throw new Error(`境界補完窓の発話位置を特定できません: ${index + 1}`);
    }
    bridgeWindows.push(expandSeamWindow(
      baseInput,
      source,
      segments,
      leftEndIndex,
      rightStartIndex,
      promptTemplate,
      probeWindowId('seam')
    ));
  }
  return bridgeWindows;
}

const forbiddenKeys = new Set([
  'clipId',
  'clipUrl',
  'expected',
  'expectedCuts',
  'expectedPath',
  'expectedStartMs',
  'expectedEndMs',
  'humanVerification',
  'humanVisualVerification',
  'humanAudioSeparatedVerification',
  'audioVerification',
  'visualVerification',
  'sttAlignment',
  'materialBlock',
  'verificationStatus',
  'fixedThemeTitle',
  'fixedThemeSummary',
  'themeTitle',
  'themeSummary',
  'label'
]);

const forbiddenTexts = [
  options.target
];

function pathText(parts) {
  return parts.reduce((acc, part) => typeof part === 'number' ? `${acc}[${part}]` : (acc ? `${acc}.${part}` : part), '');
}

function collectForbiddenKeys(value) {
  const hits = [];
  function visit(current, parts) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...parts, index]));
      return;
    }
    if (!current || typeof current !== 'object') {
      return;
    }
    for (const [key, child] of Object.entries(current)) {
      const next = [...parts, key];
      if (forbiddenKeys.has(key)) {
        hits.push({ path: pathText(next), key });
      }
      visit(child, next);
    }
  }
  visit(value, ['modelInput']);
  return hits;
}

function inspectModelInput(modelInput) {
  const inputText = JSON.stringify(modelInput);
  const forbiddenKeyHits = collectForbiddenKeys(modelInput);
  const forbiddenTextHits = forbiddenTexts
    .filter((text) => inputText.includes(text))
    .map((text) => ({ kind: 'clip_or_eval_specific_text', text }));
  return {
    status: forbiddenKeyHits.length === 0 && forbiddenTextHits.length === 0 ? 'pass' : 'fail',
    forbiddenKeyHits,
    forbiddenTextHits
  };
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function summaryMarkdown(input) {
  const lines = [
    '# theme redo source-only input package',
    '',
    `- 対象: ${input.target}`,
    `- 入力セット: ${input.inputSetId}`,
    `- 入力選定版: ${input.inputSelectionVersion || '全発話（版指定なし）'}`,
    `- 入力選定計画: ${input.selectionPlanPath || 'なし'}`,
    `- 元配信: ${input.sourceVideoId}`,
    `- 生成系統: ${input.generationSystem}`,
    `- プロンプト版: ${input.promptVersion}`,
    `- 候補数N: ${input.requestedThemeCount}`,
    `- 予定runs: ${input.runs}`,
    `- 全体prompt bytes: ${input.fullPromptBytes}`,
    `- STT manifest: ${input.sttManifestPath || '未指定'}`,
    `- STT完了状態: ${input.sttManifestStatus}`,
    `- 窓分割: ${input.windowCount > 1 ? 'あり' : 'なし'}`,
    `- 窓数: ${input.windowCount}`,
    `- 通常窓: ${input.primaryWindowCount}`,
    `- 境界補完窓: ${input.seamBridgeWindowCount}`,
    `- 窓間オーバーラップ: ${input.overlapMs}ms`,
    `- prompt byte上限: ${input.maxPromptBytes}`,
    `- 漏洩検査: ${input.leakageStatus}`,
    `- Web Gemini実走: なし`,
    `- fixture/expected作成: なし`,
    '',
    '## 入力分離',
    '',
    '- モデル入力は元配信STTと元配信メタ情報だけで構成。',
    '- 切り抜きID、切り抜きURL、expected、照合結果、人間確認メモ、固定テーマはモデル入力に入れない。',
    '- このパッケージは実走準備であり、正解データではない。',
    '',
    '## 窓',
    '',
    '| window | kind | source range | speeches | prompt bytes | prompt |',
    '| --- | --- | --- | ---: | ---: | --- |'
  ];
  for (const window of input.windows) {
    lines.push(`| ${window.windowId} | ${window.windowKind} | ${msText(window.sourceStartMs)}-${msText(window.sourceEndMs)} | ${window.segmentCount} | ${window.promptBytes} | ${window.promptPath} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function leakageMarkdown(input) {
  const lines = [
    '# theme redo source-only leakage inspection',
    '',
    `- 入力セット: ${input.inputSetId}`,
    `- 検査対象modelInput数: ${input.results.length}`,
    `- pass: ${input.results.filter((item) => item.status === 'pass').length}`,
    `- fail: ${input.results.filter((item) => item.status === 'fail').length}`,
    '',
    '| payload | status | forbidden keys | forbidden texts |',
    '| --- | --- | ---: | ---: |'
  ];
  for (const result of input.results) {
    lines.push(`| ${result.payloadPath} | ${result.status} | ${result.forbiddenKeyHits.length} | ${result.forbiddenTextHits.length} |`);
  }
  lines.push('');
  for (const result of input.results.filter((item) => item.status === 'fail')) {
    lines.push(`## ${result.payloadPath}`);
    lines.push('');
    for (const hit of result.forbiddenKeyHits) {
      lines.push(`- forbidden key: ${hit.path}`);
    }
    for (const hit of result.forbiddenTextHits) {
      lines.push(`- forbidden text: ${hit.text}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const promptPath = path.join(evalRoot, 'prompts', `${options.promptVersion}.md`);
  if (!existsSync(promptPath)) {
    throw new Error(`プロンプトがありません: ${promptPath}`);
  }
  if (!existsSync(options.transcriptPath)) {
    throw new Error(`transcriptがありません: ${options.transcriptPath}`);
  }

  const promptTemplate = await readFile(promptPath, 'utf8');
  const transcript = await readJson(options.transcriptPath);
  const sttManifest = await readSttManifest();
  const sourceTitle = await readSourceTitle();
  const selectionPlan = options.selectionPlanPath ? await readJson(options.selectionPlanPath) : undefined;
  const allPromptSegments = compactSegments(options.sourceVideoId, transcript);
  const promptSegments = selectedPromptSegments(allPromptSegments, selectionPlan);
  const source = sourceInput({ sourceTitle, transcript, promptSegments });
  const modelInput = baseModelInput(source);
  const fullPromptText = buildPromptMarkdown(promptTemplate, modelInput);
  const fullPromptBytes = Buffer.byteLength(fullPromptText, 'utf8');

  const outputDir = path.join(evalRoot, 'outputs', 'theme-generation', options.inputSetId, options.generationSystem, options.outputId);
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation', options.inputSetId, options.generationSystem, options.outputId);
  const windowOutputDir = path.join(outputDir, 'windows');
  const windowReportDir = path.join(reportDir, 'windows');
  await mkdir(windowOutputDir, { recursive: true });
  await mkdir(windowReportDir, { recursive: true });

  const payloadPath = path.join(outputDir, 'prompt-input.json');
  const promptReportPath = path.join(reportDir, 'prompt.md');
  const promptPayload = {
    kind: 'theme_redo_source_only_prompt_payload',
    runAt: new Date().toISOString(),
    target: options.target,
    inputSetId: options.inputSetId,
    sourceVideoId: options.sourceVideoId,
    sourceSttId: options.sttId,
    sourceSttManifestPath: options.sttManifestPath ? relative(options.sttManifestPath) : undefined,
    sourceSttComplete: sttManifest?.complete,
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    plannedRuns: options.runs,
    inputSelectionVersion: selectionPlan?.inputSelectionVersion,
    selectionPlanPath: options.selectionPlanPath ? relative(options.selectionPlanPath) : undefined,
    llmCall: false,
    modelInput,
    evaluationOnly: {
      note: 'モデルへ渡さない作業メタデータ。入力選定の来歴とsource-only条件を検証するためのもの。',
      target: options.target,
      transcriptPath: relative(options.transcriptPath),
      sttManifestPath: options.sttManifestPath ? relative(options.sttManifestPath) : undefined,
      sttManifestComplete: sttManifest?.complete,
      sttManifestProcessedRanges: sttManifest?.processedRanges,
      sourceInfoPath: relative(options.sourceInfoPath),
      selectionPlanPath: options.selectionPlanPath ? relative(options.selectionPlanPath) : undefined
    }
  };
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  await writeFile(payloadPath, `${JSON.stringify(promptPayload, null, 2)}\n`, 'utf8');
  await writeFile(promptReportPath, fullPromptText, 'utf8');

  const primaryWindowSegments = fullPromptBytes > options.maxPromptBytes
    ? planSourceWindows(modelInput, source, promptTemplate)
    : [source.segments];
  const seamBridgeWindowSegments = planSeamBridgeWindows(
    modelInput,
    source,
    primaryWindowSegments,
    promptTemplate
  );
  const windowSegments = [
    ...primaryWindowSegments.map((segments) => ({ windowKind: 'primary', segments })),
    ...seamBridgeWindowSegments.map((segments) => ({ windowKind: 'seam_bridge', segments }))
  ];
  const windows = [];
  const windowPayloadPaths = [];
  let primaryWindowNumber = 0;
  let seamBridgeWindowNumber = 0;
  const inspectionResults = [{
    payloadPath: relative(payloadPath),
    ...inspectModelInput(modelInput)
  }];

  for (const windowEntry of windowSegments) {
    const { windowKind, segments } = windowEntry;
    if (windowKind === 'seam_bridge') {
      seamBridgeWindowNumber += 1;
    } else {
      primaryWindowNumber += 1;
    }
    const prefix = windowKind === 'seam_bridge' ? 'seam' : 'window';
    const sequence = windowKind === 'seam_bridge' ? seamBridgeWindowNumber : primaryWindowNumber;
    const windowId = `${prefix}_${String(sequence).padStart(2, '0')}_${options.sourceVideoId}`;
    const windowModelInput = modelInputForWindow(modelInput, source, segments, windowId);
    const windowPromptText = buildPromptMarkdown(promptTemplate, windowModelInput);
    const windowPayloadPath = path.join(windowOutputDir, `${windowId}-prompt-input.json`);
    const windowPromptPath = path.join(windowReportDir, `${windowId}-prompt.md`);
    const windowPayload = {
      kind: 'theme_redo_source_only_window_prompt_payload',
      runAt: new Date().toISOString(),
      target: options.target,
      inputSetId: options.inputSetId,
      sourceVideoId: options.sourceVideoId,
      sourceSttId: options.sttId,
      sourceSttManifestPath: options.sttManifestPath ? relative(options.sttManifestPath) : undefined,
      sourceSttComplete: sttManifest?.complete,
      generationSystem: options.generationSystem,
      promptVersion: options.promptVersion,
      requestedThemeCount: options.requestedThemeCount,
      windowKind,
      llmCall: false,
      modelInput
    };
    windowPayload.modelInput = windowModelInput;
    await writeFile(windowPayloadPath, `${JSON.stringify(windowPayload, null, 2)}\n`, 'utf8');
    await writeFile(windowPromptPath, windowPromptText, 'utf8');
    windowPayloadPaths.push(relative(windowPayloadPath));
    inspectionResults.push({
      payloadPath: relative(windowPayloadPath),
      ...inspectModelInput(windowModelInput)
    });
    windows.push({
      windowId,
      windowKind,
      sourceVideoId: options.sourceVideoId,
      sourceStartMs: segments[0]?.sourceStartMs ?? 0,
      sourceEndMs: segments[segments.length - 1]?.sourceEndMs ?? 0,
      segmentCount: segments.length,
      firstSpeechId: segments[0]?.speechId ?? 0,
      lastSpeechId: segments[segments.length - 1]?.speechId ?? 0,
      promptPath: relative(windowPromptPath),
      payloadPath: relative(windowPayloadPath),
      promptBytes: Buffer.byteLength(windowPromptText, 'utf8')
    });
  }

  const windowPlan = {
    inputSetId: options.inputSetId,
    target: options.target,
    sourceVideoId: options.sourceVideoId,
    sourceSttManifestPath: options.sttManifestPath ? relative(options.sttManifestPath) : undefined,
    sourceSttComplete: sttManifest?.complete,
    inputSelectionVersion: selectionPlan?.inputSelectionVersion,
    selectionPlanPath: options.selectionPlanPath ? relative(options.selectionPlanPath) : undefined,
    generationSystem: options.generationSystem,
    outputId: options.outputId,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    runs: options.runs,
    maxPromptBytes: options.maxPromptBytes,
    overlapMs: options.overlapMs,
    bridgeSeams: options.bridgeSeams,
    fullPromptBytes,
    primaryWindowCount: primaryWindowSegments.length,
    seamBridgeWindowCount: seamBridgeWindowSegments.length,
    windows,
    windowPayloadPaths,
    llmCall: false
  };
  const manifest = {
    inputSetId: options.inputSetId,
    target: options.target,
    sourceVideoId: options.sourceVideoId,
    sourceSttId: options.sttId,
    inputSelectionVersion: selectionPlan?.inputSelectionVersion,
    selectionPlanPath: options.selectionPlanPath ? relative(options.selectionPlanPath) : undefined,
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    promptPath: relative(promptReportPath),
    payloadPath: relative(payloadPath),
    windowPlanPath: relative(path.join(outputDir, 'window-plan.json')),
    llmCall: false,
    runOutputs: Array.from({ length: options.runs }, (_, index) => ({
      run: index + 1,
      outputPath: relative(path.join(outputDir, `run-${String(index + 1).padStart(2, '0')}-gemini-output.json`))
    }))
  };
  await writeFile(path.join(outputDir, 'window-plan.json'), `${JSON.stringify(windowPlan, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'run-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const leakage = {
    runAt: new Date().toISOString(),
    inputSetId: options.inputSetId,
    target: options.target,
    sourceVideoId: options.sourceVideoId,
    inspectionScope: 'modelInput only',
    results: inspectionResults
  };
  const leakageStatus = inspectionResults.every((item) => item.status === 'pass') ? 'pass' : 'fail';
  await writeFile(path.join(outputDir, 'leakage-inspection.json'), `${JSON.stringify(leakage, null, 2)}\n`, 'utf8');
  await writeFile(path.join(reportDir, 'leakage-inspection.md'), leakageMarkdown(leakage), 'utf8');
  await writeFile(path.join(reportDir, 'source-only-input-summary.md'), summaryMarkdown({
    target: options.target,
    inputSetId: options.inputSetId,
    sourceVideoId: options.sourceVideoId,
    generationSystem: options.generationSystem,
    promptVersion: options.promptVersion,
    inputSelectionVersion: selectionPlan?.inputSelectionVersion,
    selectionPlanPath: options.selectionPlanPath ? relative(options.selectionPlanPath) : undefined,
    requestedThemeCount: options.requestedThemeCount,
    runs: options.runs,
    fullPromptBytes,
    sttManifestPath: options.sttManifestPath ? relative(options.sttManifestPath) : '',
    sttManifestStatus: sttManifest
      ? sttManifest.complete === true
        ? 'complete'
        : sttManifest.complete === false
          ? 'incomplete'
          : 'unknown'
      : 'not_checked',
    windowCount: windows.length,
    primaryWindowCount: primaryWindowSegments.length,
    seamBridgeWindowCount: seamBridgeWindowSegments.length,
    overlapMs: options.overlapMs,
    maxPromptBytes: options.maxPromptBytes,
    leakageStatus,
    windows
  }), 'utf8');

  console.log(`payload: ${relative(payloadPath)}`);
  console.log(`window plan: ${relative(path.join(outputDir, 'window-plan.json'))}`);
  console.log(`summary: ${relative(path.join(reportDir, 'source-only-input-summary.md'))}`);
  console.log(`leakage: ${leakageStatus}`);
  console.log(`windows: ${windows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

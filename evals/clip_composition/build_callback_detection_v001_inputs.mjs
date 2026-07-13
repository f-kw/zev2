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
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const inline = item.indexOf('=');
    if (inline >= 0) {
      values.set(item.slice(2, inline), item.slice(inline + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) values.set(key, 'true');
    else {
      values.set(key, next);
      index += 1;
    }
  }
  return {
    planPath: resolvePath(values.get('plan') || 'evals/clip_composition/callback_detection_v001_target_plan.json'),
    outputId: sanitize(values.get('outputId') || '20260713-callback-detection-v001')
  };
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function compactSegments(sourceVideoId, transcript) {
  const compacted = [];
  let current;
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
    const endsByText = /[。！？!?]/.test(text);
    const endsByTime = !next || next.startMs > current.sourceEndMs;
    if (endsByText || endsByTime) {
      compacted.push(current);
      current = undefined;
    }
  }
  if (current) compacted.push(current);
  return compacted.map((segment, index) => ({ ...segment, speechId: index + 1 }));
}

function assertPlan(plan) {
  if (plan.kind !== 'callback_detection_v001_target_plan') {
    throw new Error(`target plan kindが不正です: ${plan.kind}`);
  }
  if (!Array.isArray(plan.sources) || plan.sources.length === 0) {
    throw new Error('target planにsourcesがありません');
  }
  if (!Number.isInteger(plan.maxPromptBytes) || plan.maxPromptBytes < 1) {
    throw new Error('maxPromptBytesが不正です');
  }
  if (typeof plan.verificationInputVersion !== 'string' || plan.verificationInputVersion.length === 0) {
    throw new Error('verificationInputVersionが不正です');
  }
  if (plan.runs !== 1) throw new Error('callback-detection-v001はrun 1に固定します');
}

function manifestComplete(manifest) {
  if (typeof manifest.complete === 'boolean') return manifest.complete;
  return manifest.partial === false
    && Number.isInteger(manifest.processedChunkCount)
    && Number.isInteger(manifest.fullChunkCount)
    && manifest.processedChunkCount === manifest.fullChunkCount;
}

function modelSegment(segment) {
  return {
    speechId: segment.speechId,
    sourceVideoId: segment.sourceVideoId,
    sourceStartMs: segment.sourceStartMs,
    sourceEndMs: segment.sourceEndMs,
    text: segment.text
  };
}

function normalizeTargets(sourcePlan, segments) {
  const speechById = new Map(segments.map((segment) => [segment.speechId, segment]));
  const seenTargetIds = new Set();
  return sourcePlan.targets.map((target) => {
    if (!target.targetId || seenTargetIds.has(target.targetId)) {
      throw new Error(`${sourcePlan.sourceVideoId}のtargetIdが空または重複しています: ${target.targetId}`);
    }
    seenTargetIds.add(target.targetId);
    if (!Array.isArray(target.reactionSpeechIds) || target.reactionSpeechIds.length === 0) {
      throw new Error(`${target.targetId}にreactionSpeechIdsがありません`);
    }
    const reactionSegments = target.reactionSpeechIds.map((speechId) => {
      if (!Number.isInteger(speechId) || !speechById.has(speechId)) {
        throw new Error(`${target.targetId}のreactionSpeechId ${speechId}が元配信STTにありません`);
      }
      return speechById.get(speechId);
    });
    for (let index = 1; index < reactionSegments.length; index += 1) {
      if (reactionSegments[index].speechId <= reactionSegments[index - 1].speechId) {
        throw new Error(`${target.targetId}のreactionSpeechIdsが時系列順ではありません`);
      }
    }
    return {
      ...target,
      reactionStartMs: Math.min(...reactionSegments.map((segment) => segment.sourceStartMs)),
      reactionEndMs: Math.max(...reactionSegments.map((segment) => segment.sourceEndMs)),
      reactionSegments
    };
  });
}

function targetForModel(target) {
  return {
    targetId: target.targetId,
    title: target.title,
    reason: target.reason,
    reactionEvidence: {
      sourceVideoId: target.reactionSegments[0].sourceVideoId,
      speechIds: target.reactionSegments.map((segment) => segment.speechId),
      segments: target.reactionSegments.map(modelSegment)
    }
  };
}

function activeTargetsForWindow(targets, windowSegments) {
  const windowStartMs = windowSegments[0]?.sourceStartMs ?? Number.POSITIVE_INFINITY;
  return targets.filter((target) => windowStartMs < target.reactionStartMs);
}

function modelInputForWindow(source, windowSegments, windowId, windowKind) {
  const activeTargets = activeTargetsForWindow(source.targets, windowSegments);
  return {
    task: 'source_only_callback_detection_search',
    generationSystem: source.plan.generationSystem,
    promptVersion: source.plan.promptVersion,
    inputPolicy: {
      sourceOnly: true,
      noClipInfo: true,
      noExpected: true,
      noAlignment: true,
      noHumanLabels: true,
      causeMustBeEarlierSeparateScene: true
    },
    window: {
      windowId,
      windowKind,
      sourceVideoId: source.sourceVideoId
    },
    targets: activeTargets.map(targetForModel),
    sourceSegments: windowSegments.map(modelSegment),
    outputContract: {
      format: 'json_only',
      rootKey: 'callbackFindings',
      timeValuesForbidden: true
    }
  };
}

function buildPrompt(promptTemplate, modelInput) {
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

function promptBytes(promptTemplate, modelInput) {
  return Buffer.byteLength(buildPrompt(promptTemplate, modelInput), 'utf8');
}

function probeWindowId(kind, sourceVideoId) {
  return `${kind}_999_${sourceVideoId}`;
}

function planPrimaryWindows(source, promptTemplate) {
  const lastReactionStartMs = Math.max(...source.targets.map((target) => target.reactionStartMs));
  const searchable = source.segments.filter((segment) => segment.sourceStartMs < lastReactionStartMs);
  const windows = [];
  let start = 0;
  while (start < searchable.length) {
    let end = start;
    const initialInput = modelInputForWindow(
      source,
      searchable.slice(start, end + 1),
      probeWindowId('window', source.sourceVideoId),
      'primary'
    );
    if (initialInput.targets.length === 0) break;
    if (promptBytes(promptTemplate, initialInput) > source.plan.maxPromptBytes) {
      throw new Error(`${source.sourceVideoId} speechId ${searchable[start].speechId}だけでprompt上限を超えます`);
    }
    while (end + 1 < searchable.length) {
      const candidateSegments = searchable.slice(start, end + 2);
      const candidateInput = modelInputForWindow(
        source,
        candidateSegments,
        probeWindowId('window', source.sourceVideoId),
        'primary'
      );
      if (promptBytes(promptTemplate, candidateInput) > source.plan.maxPromptBytes) break;
      end += 1;
    }
    windows.push(searchable.slice(start, end + 1));
    start = end + 1;
  }
  return windows;
}

function indexOfSpeech(segments, speechId) {
  return segments.findIndex((segment) => segment.speechId === speechId);
}

function expandBridgeWindow(source, leftEndIndex, rightStartIndex, promptTemplate) {
  let start = leftEndIndex;
  let end = rightStartIndex;
  const bridgeId = probeWindowId('seam', source.sourceVideoId);
  const bytesFor = (nextStart, nextEnd) => promptBytes(
    promptTemplate,
    modelInputForWindow(source, source.segments.slice(nextStart, nextEnd + 1), bridgeId, 'seam_bridge')
  );
  if (bytesFor(start, end) > source.plan.maxPromptBytes) {
    throw new Error(`${source.sourceVideoId}の境界補完窓が最小2発話でも上限を超えます`);
  }
  while (true) {
    const candidates = [];
    if (start > 0 && bytesFor(start - 1, end) <= source.plan.maxPromptBytes) {
      candidates.push({
        side: 'left',
        start: start - 1,
        end,
        distanceMs: Math.max(0, source.segments[rightStartIndex].sourceStartMs - source.segments[start - 1].sourceEndMs)
      });
    }
    if (end < source.segments.length - 1 && bytesFor(start, end + 1) <= source.plan.maxPromptBytes) {
      candidates.push({
        side: 'right',
        start,
        end: end + 1,
        distanceMs: Math.max(0, source.segments[end + 1].sourceStartMs - source.segments[leftEndIndex].sourceEndMs)
      });
    }
    if (candidates.length === 0) break;
    candidates.sort((left, right) => left.distanceMs - right.distanceMs
      || (left.side === right.side ? 0 : left.side === 'left' ? -1 : 1));
    start = candidates[0].start;
    end = candidates[0].end;
  }
  return source.segments.slice(start, end + 1);
}

function planBridgeWindows(source, primaryWindows, promptTemplate) {
  if (!source.plan.bridgeSeams || primaryWindows.length <= 1) return [];
  const bridges = [];
  for (let index = 0; index < primaryWindows.length - 1; index += 1) {
    const leftSpeechId = primaryWindows[index].at(-1).speechId;
    const rightSpeechId = primaryWindows[index + 1][0].speechId;
    const leftEndIndex = indexOfSpeech(source.segments, leftSpeechId);
    const rightStartIndex = indexOfSpeech(source.segments, rightSpeechId);
    if (leftEndIndex < 0 || rightStartIndex <= leftEndIndex) {
      throw new Error(`${source.sourceVideoId}の境界位置を特定できません`);
    }
    const segments = expandBridgeWindow(source, leftEndIndex, rightStartIndex, promptTemplate);
    if (activeTargetsForWindow(source.targets, segments).length > 0) bridges.push(segments);
  }
  return bridges;
}

const forbiddenKeys = new Set([
  'fixtureId', 'candidateId', 'clipId', 'clipUrl', 'expected', 'expectedCuts', 'expectedPath',
  'humanVerification', 'humanVisualVerification', 'humanAudioSeparatedVerification',
  'sttAlignment', 'materialBlock', 'verificationStatus', 'previousAnswer', 'sampleType', 'label'
]);

const forbiddenHumanTexts = ['公開したい', '悪くないが選ばない', 'つまらない', '文脈不明'];

function inspectModelInput(modelInput, fixtureIds) {
  const keyHits = [];
  const humanTextHits = [];
  function visit(value, location) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${location}[${index}]`));
      return;
    }
    if (typeof value === 'string') {
      const isSourceTranscriptText = location.includes('.sourceSegments[') && location.endsWith('.text');
      const isReactionTranscriptText = location.includes('.reactionEvidence.segments[') && location.endsWith('.text');
      if (!isSourceTranscriptText && !isReactionTranscriptText) {
        for (const text of forbiddenHumanTexts) {
          if (value.includes(text)) humanTextHits.push({ path: location, text });
        }
      }
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const childLocation = `${location}.${key}`;
      if (forbiddenKeys.has(key)) keyHits.push({ path: childLocation, key });
      visit(child, childLocation);
    }
  }
  visit(modelInput, 'modelInput');
  const serialized = JSON.stringify(modelInput);
  const fixtureTextHits = fixtureIds
    .filter((text) => serialized.includes(text))
    .map((text) => ({ path: 'modelInput', text }));
  const textHits = [...fixtureTextHits, ...humanTextHits];
  return {
    status: keyHits.length === 0 && textHits.length === 0 ? 'pass' : 'fail',
    forbiddenKeyHits: keyHits,
    forbiddenTextHits: textHits
  };
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function summaryMarkdown(plan) {
  const primary = plan.windows.filter((window) => window.windowKind === 'primary').length;
  const bridges = plan.windows.filter((window) => window.windowKind === 'seam_bridge').length;
  const lines = [
    '# callback-detection-v001 source-only input summary',
    '',
    `- plan: ${plan.planId}`,
    `- 生成系統: ${plan.generationSystem}`,
    `- モデル: ${plan.model}`,
    `- run: ${plan.runs}`,
    `- 対象元配信: ${plan.sources.length}`,
    `- 対象候補: ${plan.sources.reduce((count, source) => count + source.targets.length, 0)}`,
    `- 通常窓: ${primary}`,
    `- 境界補完窓: ${bridges}`,
    `- 全文探索Gemini呼び出し: ${plan.windows.length}`,
    `- 原因候補確認Gemini呼び出し: 0〜${plan.sources.reduce((count, source) => count + source.targets.length, 0)}（全文探索で有効候補が出た対象のみ）`,
    `- prompt上限: ${plan.maxPromptBytes} bytes`,
    `- 全窓漏洩検査: ${plan.leakageStatus}`,
    '- 人間作業: 0件・0分',
    '- Gemini実走: 未実施',
    '',
    '| window | kind | source | range | speeches | targets | bytes |',
    '| --- | --- | --- | --- | ---: | ---: | ---: |'
  ];
  for (const window of plan.windows) {
    lines.push(`| ${window.windowId} | ${window.windowKind} | ${window.sourceVideoId} | ${msText(window.sourceStartMs)}-${msText(window.sourceEndMs)} | ${window.segmentCount} | ${window.activeTargetIds.length} | ${window.promptBytes} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function loadSource(sourcePlan, plan) {
  const transcriptPath = resolvePath(sourcePlan.transcriptPath);
  const manifestPath = resolvePath(sourcePlan.manifestPath);
  if (!existsSync(transcriptPath) || !existsSync(manifestPath)) {
    throw new Error(`${sourcePlan.sourceVideoId}のSTTファイルがありません`);
  }
  const [transcript, manifest] = await Promise.all([readJson(transcriptPath), readJson(manifestPath)]);
  if (!manifestComplete(manifest)) {
    throw new Error(`${sourcePlan.sourceVideoId}のSTTが未完了です`);
  }
  const segments = compactSegments(sourcePlan.sourceVideoId, transcript);
  const targets = normalizeTargets(sourcePlan, segments);
  return {
    ...sourcePlan,
    plan,
    transcriptPath,
    manifestPath,
    transcript,
    manifest,
    segments,
    targets
  };
}

async function main() {
  if (!existsSync(options.planPath)) throw new Error(`target planがありません: ${options.planPath}`);
  const planSource = await readJson(options.planPath);
  assertPlan(planSource);
  const promptPath = path.join(evalRoot, 'prompts', `${planSource.promptVersion}.md`);
  const verificationPromptPath = path.join(evalRoot, 'prompts', `${planSource.verificationPromptVersion}.md`);
  if (!existsSync(promptPath) || !existsSync(verificationPromptPath)) {
    throw new Error('callback detection promptがありません');
  }
  const promptTemplate = await readFile(promptPath, 'utf8');
  const sources = [];
  for (const sourcePlan of planSource.sources) sources.push(await loadSource(sourcePlan, planSource));

  const outputDir = path.join(evalRoot, 'outputs', 'callback-detection', options.outputId);
  const reportDir = path.join(evalRoot, 'reports', 'callback-detection', options.outputId);
  const windowOutputDir = path.join(outputDir, 'windows');
  const windowReportDir = path.join(reportDir, 'windows');
  await Promise.all([
    mkdir(windowOutputDir, { recursive: true }),
    mkdir(windowReportDir, { recursive: true })
  ]);

  const windows = [];
  const leakageResults = [];
  for (const source of sources) {
    const primaryWindows = planPrimaryWindows(source, promptTemplate);
    const bridgeWindows = planBridgeWindows(source, primaryWindows, promptTemplate);
    const entries = [
      ...primaryWindows.map((segments) => ({ windowKind: 'primary', segments })),
      ...bridgeWindows.map((segments) => ({ windowKind: 'seam_bridge', segments }))
    ];
    let primaryNumber = 0;
    let bridgeNumber = 0;
    for (const entry of entries) {
      if (entry.windowKind === 'primary') primaryNumber += 1;
      else bridgeNumber += 1;
      const sequence = entry.windowKind === 'primary' ? primaryNumber : bridgeNumber;
      const prefix = entry.windowKind === 'primary' ? 'window' : 'seam';
      const windowId = `${prefix}_${String(sequence).padStart(3, '0')}_${source.sourceVideoId}`;
      const modelInput = modelInputForWindow(source, entry.segments, windowId, entry.windowKind);
      if (modelInput.targets.length === 0) continue;
      const promptText = buildPrompt(promptTemplate, modelInput);
      const bytes = Buffer.byteLength(promptText, 'utf8');
      if (bytes > planSource.maxPromptBytes) {
        throw new Error(`${windowId}がprompt上限を超えました: ${bytes}`);
      }
      const payloadPath = path.join(windowOutputDir, `${windowId}-prompt-input.json`);
      const windowPromptPath = path.join(windowReportDir, `${windowId}-prompt.md`);
      const inspection = inspectModelInput(
        modelInput,
        source.targets.map((target) => target.fixtureId)
      );
      leakageResults.push({ windowId, payloadPath: relative(payloadPath), ...inspection });
      await writeFile(payloadPath, `${JSON.stringify({
        kind: 'callback_detection_search_window_prompt_payload',
        createdAt: new Date().toISOString(),
        planId: planSource.planId,
        generationSystem: planSource.generationSystem,
        promptVersion: planSource.promptVersion,
        llmCall: false,
        modelInput,
        evaluationOnly: {
          targetPlanPath: relative(options.planPath),
          transcriptPath: relative(source.transcriptPath),
          manifestPath: relative(source.manifestPath),
          manifestComplete: true,
          fixtureIds: source.targets.map((target) => target.fixtureId)
        }
      }, null, 2)}\n`, 'utf8');
      await writeFile(windowPromptPath, promptText, 'utf8');
      windows.push({
        windowId,
        windowKind: entry.windowKind,
        sourceVideoId: source.sourceVideoId,
        sourceStartMs: entry.segments[0].sourceStartMs,
        sourceEndMs: entry.segments.at(-1).sourceEndMs,
        segmentCount: entry.segments.length,
        activeTargetIds: modelInput.targets.map((target) => target.targetId),
        promptBytes: bytes,
        payloadPath: relative(payloadPath),
        promptPath: relative(windowPromptPath)
      });
    }
  }

  const leakageStatus = leakageResults.every((result) => result.status === 'pass') ? 'pass' : 'fail';
  const windowPlan = {
    kind: 'callback_detection_v001_window_plan',
    createdAt: new Date().toISOString(),
    outputId: options.outputId,
    planId: planSource.planId,
    targetPlanPath: relative(options.planPath),
    generationSystem: planSource.generationSystem,
    promptVersion: planSource.promptVersion,
    verificationPromptVersion: planSource.verificationPromptVersion,
    verificationInputVersion: planSource.verificationInputVersion,
    model: planSource.model,
    runs: planSource.runs,
    maxPromptBytes: planSource.maxPromptBytes,
    bridgeSeams: planSource.bridgeSeams,
    leakageStatus,
    humanWork: { itemCount: 0, estimatedMinutes: 0 },
    sources: sources.map((source) => ({
      sourceVideoId: source.sourceVideoId,
      transcriptPath: relative(source.transcriptPath),
      manifestPath: relative(source.manifestPath),
      compactedSpeechCount: source.segments.length,
      targets: source.targets.map((target) => ({
        targetId: target.targetId,
        fixtureId: target.fixtureId,
        candidateId: target.candidateId,
        title: target.title,
        reason: target.reason,
        reactionStartMs: target.reactionStartMs,
        reactionEndMs: target.reactionEndMs,
        reactionSpeechIds: target.reactionSegments.map((segment) => segment.speechId),
        reactionSegments: target.reactionSegments.map(modelSegment)
      }))
    })),
    windows
  };
  await writeFile(path.join(outputDir, 'window-plan.json'), `${JSON.stringify(windowPlan, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'leakage-inspection.json'), `${JSON.stringify({
    kind: 'callback_detection_v001_leakage_inspection',
    createdAt: new Date().toISOString(),
    status: leakageStatus,
    checkedWindowCount: leakageResults.length,
    passCount: leakageResults.filter((result) => result.status === 'pass').length,
    failCount: leakageResults.filter((result) => result.status === 'fail').length,
    results: leakageResults
  }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(reportDir, 'source-only-input-summary.md'), `${summaryMarkdown(windowPlan)}\n`, 'utf8');

  if (leakageStatus !== 'pass') throw new Error('callback detection入力の漏洩検査に失敗しました');
  console.log(`window plan: ${relative(path.join(outputDir, 'window-plan.json'))}`);
  console.log(`primary windows: ${windows.filter((window) => window.windowKind === 'primary').length}`);
  console.log(`seam windows: ${windows.filter((window) => window.windowKind === 'seam_bridge').length}`);
  console.log(`scan calls: ${windows.length}`);
  console.log(`verification calls: 0-${sources.reduce((count, source) => count + source.targets.length, 0)}`);
  console.log(`leakage: ${leakageStatus}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

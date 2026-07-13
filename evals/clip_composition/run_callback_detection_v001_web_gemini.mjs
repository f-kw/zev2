#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
    outputId: sanitize(values.get('outputId') || '20260713-callback-detection-v001'),
    cdpPort: values.get('cdpPort') || '9222',
    timeoutMs: values.get('timeoutMs') || '300000',
    scanOnly: values.has('scanOnly'),
    skipVerification: values.has('skipVerification'),
    maxAttemptsPerWindow: positiveInt(values.get('maxAttemptsPerWindow') || '2', 'maxAttemptsPerWindow'),
    maxWindowsThisInvocation: values.has('maxWindowsThisInvocation')
      ? positiveInt(values.get('maxWindowsThisInvocation'), 'maxWindowsThisInvocation')
      : undefined
  };
}

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function positiveInt(value, name) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name}は1以上の整数で指定してください`);
  return number;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with code ${code ?? 'unknown'}`));
    });
  });
}

function isPartialExtraction(output) {
  const status = output?.extractionStatus;
  const value = typeof status === 'string'
    ? status
    : status && typeof status === 'object'
      ? String(status.status ?? '')
      : '';
  return value.includes('partial');
}

function assertCompleteSearchOutput(output, context) {
  if (isPartialExtraction(output)) throw new Error(`${context}は途中切れです`);
  if (!Array.isArray(output?.callbackFindings)) {
    throw new Error(`${context}にcallbackFindings配列がありません`);
  }
}

function assertCompleteVerificationOutput(output, context) {
  if (isPartialExtraction(output)) throw new Error(`${context}は途中切れです`);
  if (!Array.isArray(output?.callbackDecisions)) {
    throw new Error(`${context}にcallbackDecisions配列がありません`);
  }
}

async function validateOrArchiveSearchOutput(outputPath, context) {
  if (!existsSync(outputPath)) return { valid: false };
  try {
    const output = await readJson(outputPath);
    assertCompleteSearchOutput(output, context);
    return { valid: true, output };
  } catch (error) {
    const archivePath = outputPath.replace(/\.json$/, `.invalid-${timestampForFile()}.json`);
    await rename(outputPath, archivePath);
    console.log(`[archive-invalid] ${relative(outputPath)} -> ${relative(archivePath)}`);
    console.log(`[archive-reason] ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false };
  }
}

async function archiveFailureDiagnostic(outputPath, attempt) {
  const failurePath = `${outputPath}.failure.json`;
  if (!existsSync(failurePath)) return;
  const archivePath = `${outputPath}.before-attempt-${String(attempt).padStart(2, '0')}-failure-${timestampForFile()}.json`;
  await rename(failurePath, archivePath);
  console.log(`[archive-failure] ${relative(failurePath)} -> ${relative(archivePath)}`);
}

function expandSpeechIds(values, speechById, context) {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${context}: causeSpeechIdsがありません`);
  const ids = [];
  const seen = new Set();
  const append = (speechId) => {
    if (!speechById.has(speechId)) throw new Error(`${context}: 入力窓にないspeechId ${speechId}`);
    if (seen.has(speechId)) throw new Error(`${context}: speechId ${speechId}が重複しています`);
    if (ids.length > 0 && speechId <= ids.at(-1)) throw new Error(`${context}: speechIdが時系列順ではありません`);
    seen.add(speechId);
    ids.push(speechId);
  };
  for (const value of values) {
    if (Number.isInteger(value) && value > 0) {
      append(value);
      continue;
    }
    const text = String(value).trim();
    const single = text.match(/^([1-9]\d*)$/);
    if (single) {
      append(Number(single[1]));
      continue;
    }
    const range = text.match(/^([1-9]\d*)-([1-9]\d*)$/);
    if (!range) throw new Error(`${context}: speechId形式が不正です ${text}`);
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start) throw new Error(`${context}: speechId範囲が逆順です ${text}`);
    for (let speechId = start; speechId <= end; speechId += 1) append(speechId);
  }
  return ids;
}

function normalizeFinding(finding, findingIndex, window, promptInput) {
  const context = `${window.windowId} finding ${findingIndex + 1}`;
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
    throw new Error(`${context}: objectではありません`);
  }
  const targets = Array.isArray(promptInput?.modelInput?.targets) ? promptInput.modelInput.targets : [];
  const target = targets.find((item) => item.targetId === finding.targetId);
  if (!target) throw new Error(`${context}: 対象外targetId ${finding.targetId}`);
  const segments = Array.isArray(promptInput?.modelInput?.sourceSegments)
    ? promptInput.modelInput.sourceSegments
    : [];
  const speechById = new Map(segments.map((segment) => [segment.speechId, segment]));
  const speechIds = expandSpeechIds(finding.causeSpeechIds, speechById, context);
  const causeSegments = speechIds.map((speechId) => speechById.get(speechId));
  const reactionSegments = Array.isArray(target?.reactionEvidence?.segments)
    ? target.reactionEvidence.segments
    : [];
  if (reactionSegments.length === 0) throw new Error(`${context}: reactionEvidenceがありません`);
  const sourceVideoIds = [...new Set(causeSegments.map((segment) => segment.sourceVideoId))];
  if (sourceVideoIds.length !== 1 || sourceVideoIds[0] !== window.sourceVideoId) {
    throw new Error(`${context}: 元配信IDが窓と一致しません`);
  }
  const sourceStartMs = Math.min(...causeSegments.map((segment) => segment.sourceStartMs));
  const sourceEndMs = Math.max(...causeSegments.map((segment) => segment.sourceEndMs));
  const reactionStartMs = Math.min(...reactionSegments.map((segment) => segment.sourceStartMs));
  const reactionEndMs = Math.max(...reactionSegments.map((segment) => segment.sourceEndMs));
  if (sourceEndMs > reactionStartMs) {
    throw new Error(`${context}: 原因場面が反応場面より前でないか、範囲が重なっています`);
  }
  for (const field of ['sceneDescription', 'causalLink', 'missingContextSupplied']) {
    if (typeof finding[field] !== 'string' || !finding[field].trim()) {
      throw new Error(`${context}: ${field}がありません`);
    }
  }
  return {
    findingId: `${window.windowId}-finding-${String(findingIndex + 1).padStart(2, '0')}`,
    targetId: finding.targetId,
    sourceVideoId: window.sourceVideoId,
    windowId: window.windowId,
    windowKind: window.windowKind,
    causeSpeechIds: finding.causeSpeechIds,
    expandedCauseSpeechIds: speechIds,
    sourceStartMs,
    sourceEndMs,
    reactionStartMs,
    reactionEndMs,
    causeSegments,
    sceneDescription: finding.sceneDescription.trim(),
    causalLink: finding.causalLink.trim(),
    missingContextSupplied: finding.missingContextSupplied.trim()
  };
}

function addOverlapGroups(findings) {
  const byTarget = new Map();
  for (const finding of findings) {
    const values = byTarget.get(finding.targetId) ?? [];
    values.push(finding);
    byTarget.set(finding.targetId, values);
  }
  for (const [targetId, values] of byTarget) {
    values.sort((left, right) => left.sourceStartMs - right.sourceStartMs || left.sourceEndMs - right.sourceEndMs);
    let groupNumber = 0;
    let groupEnd = Number.NEGATIVE_INFINITY;
    for (const finding of values) {
      if (finding.sourceStartMs >= groupEnd) {
        groupNumber += 1;
        groupEnd = finding.sourceEndMs;
      } else {
        groupEnd = Math.max(groupEnd, finding.sourceEndMs);
      }
      finding.overlapGroupId = `${targetId}-group-${String(groupNumber).padStart(2, '0')}`;
    }
  }
  return findings;
}

async function aggregateSearch(plan, baseDir) {
  const validFindings = [];
  const invalidFindings = [];
  const windows = [];
  for (const window of plan.windows) {
    const outputPath = path.join(baseDir, 'windows', `run-01-${window.windowId}-gemini-output.json`);
    const output = await readJson(outputPath);
    assertCompleteSearchOutput(output, window.windowId);
    const promptInput = await readJson(path.join(root, window.payloadPath));
    let validCount = 0;
    for (let index = 0; index < output.callbackFindings.length; index += 1) {
      try {
        validFindings.push(normalizeFinding(output.callbackFindings[index], index, window, promptInput));
        validCount += 1;
      } catch (error) {
        invalidFindings.push({
          windowId: window.windowId,
          findingIndex: index,
          reason: error instanceof Error ? error.message : String(error),
          rawFinding: output.callbackFindings[index]
        });
      }
    }
    windows.push({
      windowId: window.windowId,
      rawFindingCount: output.callbackFindings.length,
      validFindingCount: validCount,
      invalidFindingCount: output.callbackFindings.length - validCount,
      extractionStatus: output.extractionStatus ?? null
    });
  }
  addOverlapGroups(validFindings);
  const aggregate = {
    kind: 'callback_detection_v001_search_aggregate',
    createdAt: new Date().toISOString(),
    generationSystem: plan.generationSystem,
    model: plan.model,
    run: 1,
    windowCount: plan.windows.length,
    completedWindowCount: windows.length,
    rawFindingCount: validFindings.length + invalidFindings.length,
    validFindingCount: validFindings.length,
    invalidFindingCount: invalidFindings.length,
    validFindings,
    invalidFindings,
    windows
  };
  const aggregatePath = path.join(baseDir, 'run-01-search-aggregate.json');
  await writeFile(aggregatePath, `${JSON.stringify(aggregate, null, 2)}\n`, 'utf8');
  console.log(`[aggregate] valid=${validFindings.length} invalid=${invalidFindings.length}`);
  return aggregate;
}

function buildVerificationPrompt(template, modelInput) {
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

function targetForVerification(target) {
  return {
    targetId: target.targetId,
    title: target.title,
    reason: target.reason,
    reactionEvidence: {
      sourceVideoId: target.reactionSegments[0]?.sourceVideoId,
      speechIds: target.reactionSpeechIds,
      segments: target.reactionSegments.map((segment) => ({
        speechId: segment.speechId,
        text: segment.text
      }))
    }
  };
}

function groupVerificationFindings(findings) {
  const byOverlapGroup = new Map();
  for (const finding of findings) {
    const key = finding.overlapGroupId || finding.findingId;
    const group = byOverlapGroup.get(key) ?? [];
    group.push(finding);
    byOverlapGroup.set(key, group);
  }
  return [...byOverlapGroup.entries()].map(([overlapGroupId, group]) => {
    const ordered = [...group].sort((left, right) => (
      left.sourceStartMs - right.sourceStartMs
      || left.sourceEndMs - right.sourceEndMs
      || left.findingId.localeCompare(right.findingId)
    ));
    const representative = ordered[0];
    const segments = new Map();
    for (const finding of ordered) {
      for (const segment of finding.causeSegments) {
        const existing = segments.get(segment.speechId);
        if (existing && existing.text !== segment.text) {
          throw new Error(`${overlapGroupId}: 同じ発話IDの本文が一致しません`);
        }
        segments.set(segment.speechId, { speechId: segment.speechId, text: segment.text });
      }
    }
    return {
      findingId: representative.findingId,
      sameSceneFindingIds: ordered.map((finding) => finding.findingId),
      overlapGroupId,
      causeSegments: [...segments.values()].sort((left, right) => left.speechId - right.speechId),
      causalClaims: [...new Set(ordered.map((finding) => finding.causalLink))]
    };
  });
}

function verificationModelInput(plan, target, findings) {
  return {
    target: targetForVerification(target),
    findings: groupVerificationFindings(findings)
  };
}

function inspectVerificationInput(modelInput, fixtureId) {
  const serialized = JSON.stringify(modelInput);
  const forbidden = [fixtureId, 'expectedCuts', 'previousAnswer', 'humanVerification', 'materialBlock'];
  const hits = forbidden.filter((value) => serialized.includes(value));
  return { status: hits.length === 0 ? 'pass' : 'fail', hits };
}

function validateDecision(output, targetId, findings) {
  assertCompleteVerificationOutput(output, targetId);
  if (output.callbackDecisions.length !== 1) {
    throw new Error(`${targetId}: callbackDecisionsは1件必要です`);
  }
  const decision = output.callbackDecisions[0];
  if (decision.targetId !== targetId) throw new Error(`${targetId}: decisionのtargetIdが一致しません`);
  const findingIds = new Set(findings.map((finding) => finding.findingId));
  if (decision.decision === 'actual_separate_cause') {
    if (typeof decision.primaryFindingId !== 'string' || !findingIds.has(decision.primaryFindingId)) {
      throw new Error(`${targetId}: actual判定のprimaryFindingIdが入力にありません`);
    }
  } else if (decision.primaryFindingId !== null) {
    throw new Error(`${targetId}: 非actual判定のprimaryFindingIdはnullである必要があります`);
  }
  const alternatives = Array.isArray(decision.alternativeFindingIds) ? decision.alternativeFindingIds : [];
  const seen = new Set();
  for (const findingId of alternatives) {
    if (!findingIds.has(findingId)) throw new Error(`${targetId}: alternativeFindingIdが入力にありません ${findingId}`);
    if (findingId === decision.primaryFindingId || seen.has(findingId)) {
      throw new Error(`${targetId}: alternativeFindingIdsが重複しています`);
    }
    seen.add(findingId);
  }
  return decision;
}

async function runVerification(plan, aggregate, baseDir, reportDir) {
  const promptTemplate = await readFile(
    path.join(evalRoot, 'prompts', `${plan.verificationPromptVersion}.md`),
    'utf8'
  );
  const verificationOutputDir = path.join(baseDir, 'verifications');
  const verificationReportDir = path.join(reportDir, 'verifications');
  await Promise.all([
    mkdir(verificationOutputDir, { recursive: true }),
    mkdir(verificationReportDir, { recursive: true })
  ]);
  const results = [];
  for (const source of plan.sources) {
    for (const target of source.targets) {
      const findings = aggregate.validFindings.filter((finding) => finding.targetId === target.targetId);
      if (findings.length === 0) {
        results.push({ targetId: target.targetId, status: 'no_findings', decision: null });
        continue;
      }
      const modelInput = verificationModelInput(plan, target, findings);
      const verificationGroupCount = modelInput.findings.length;
      const inspection = inspectVerificationInput(modelInput, target.fixtureId);
      if (inspection.status !== 'pass') {
        throw new Error(`${target.targetId}: verification入力の漏洩検査失敗 ${inspection.hits.join(', ')}`);
      }
      const promptText = buildVerificationPrompt(promptTemplate, modelInput);
      const promptBytes = Buffer.byteLength(promptText, 'utf8');
      if (promptBytes > plan.maxPromptBytes) {
        results.push({
          targetId: target.targetId,
          status: 'verification_input_overflow',
          promptBytes,
          maxPromptBytes: plan.maxPromptBytes,
          findingCount: findings.length,
          verificationGroupCount,
          decision: null
        });
        continue;
      }
      const safeTargetId = sanitize(target.targetId);
      const safePromptVersion = sanitize(plan.verificationPromptVersion);
      const safeInputVersion = sanitize(plan.verificationInputVersion);
      const verificationRunVersion = `${safePromptVersion}__${safeInputVersion}`;
      const payloadPath = path.join(verificationOutputDir, `${verificationRunVersion}-${safeTargetId}-prompt-input.json`);
      const promptPath = path.join(verificationReportDir, `${verificationRunVersion}-${safeTargetId}-prompt.md`);
      const outputPath = path.join(verificationOutputDir, `run-01-${verificationRunVersion}-${safeTargetId}-gemini-output.json`);
      await writeFile(payloadPath, `${JSON.stringify({
        kind: 'callback_detection_verification_prompt_payload',
        createdAt: new Date().toISOString(),
        generationSystem: plan.generationSystem,
        promptVersion: plan.verificationPromptVersion,
        inputVersion: plan.verificationInputVersion,
        inputPolicy: {
          sourceOnly: true,
          noClipInfo: true,
          noExpected: true,
          noAlignment: true,
          noHumanLabels: true,
          selectExistingFindingIdsOnly: true,
          overlappingSearchFindingsAreGroupedWithoutDiscardingEvidence: true
        },
        modelInput,
        leakageInspection: inspection,
        llmCall: false
      }, null, 2)}\n`, 'utf8');
      await writeFile(promptPath, promptText, 'utf8');
      let output;
      if (existsSync(outputPath)) {
        try {
          const saved = await readJson(outputPath);
          const expectedPromptFile = path.relative(evalRoot, promptPath);
          if (saved.promptFile !== expectedPromptFile) {
            throw new Error(`${target.targetId}: 保存済み確認結果のprompt来歴が一致しません`);
          }
          validateDecision(saved, target.targetId, findings);
          output = saved;
          console.log(`[skip-verification] ${target.targetId}`);
        } catch {
          const archivePath = outputPath.replace(/\.json$/, `.invalid-${timestampForFile()}.json`);
          await rename(outputPath, archivePath);
        }
      }
      if (!output) {
        await runProcess(path.join(root, 'runner', 'node_modules', '.bin', 'tsx'), [
          'evals/clip_composition/run_web_gemini_prompt.ts',
          '--prompt', promptPath,
          '--output', outputPath,
          '--model', plan.model,
          '--params', JSON.stringify({
            temperature: 0,
            source: 'gemini-web',
            runner: 'edge-cdp-text-prompt',
            task: 'callback-detection-verification-v001',
            run: 1,
            targetId: target.targetId,
            inputVersion: plan.verificationInputVersion
          }),
          '--cdpPort', options.cdpPort,
          '--timeoutMs', options.timeoutMs,
          '--rejectPartialExtraction',
          '--closeTabAfterRun'
        ]);
        output = await readJson(outputPath);
      }
      const decision = validateDecision(output, target.targetId, findings);
      results.push({
        targetId: target.targetId,
        status: 'verified',
        promptBytes,
        findingCount: findings.length,
        verificationGroupCount,
        decision,
        primaryFinding: decision.primaryFindingId
          ? findings.find((finding) => finding.findingId === decision.primaryFindingId)
          : null,
        alternativeFindings: decision.alternativeFindingIds.map((findingId) => (
          findings.find((finding) => finding.findingId === findingId)
        ))
      });
    }
  }
  return results;
}

async function geminiTabCount() {
  try {
    const response = await fetch(`http://127.0.0.1:${options.cdpPort}/json/list`);
    if (!response.ok) return null;
    const targets = await response.json();
    return targets.filter((target) => /gemini\.google\.com/.test(String(target.url ?? ''))).length;
  } catch {
    return null;
  }
}

async function writeProgress(baseDir, plan, status, newWindowsThisInvocation) {
  const completed = [];
  const missing = [];
  for (const window of plan.windows) {
    const outputPath = path.join(baseDir, 'windows', `run-01-${window.windowId}-gemini-output.json`);
    if (existsSync(outputPath)) completed.push(window.windowId);
    else missing.push(window.windowId);
  }
  const progressPath = path.join(baseDir, 'run-01-execution-progress.json');
  await writeJsonAtomic(progressPath, {
    kind: 'callback_detection_v001_execution_progress',
    updatedAt: new Date().toISOString(),
    outputId: options.outputId,
    status,
    totalWindowCount: plan.windows.length,
    completedWindowCount: completed.length,
    missingWindowCount: missing.length,
    completedWindowIds: completed,
    missingWindowIds: missing,
    nextWindowId: missing[0] ?? null,
    newWindowsThisInvocation,
    maxWindowsThisInvocation: options.maxWindowsThisInvocation ?? null
  });
  return progressPath;
}

function resultMarkdown(result) {
  const reviewWork = result.humanWork.review;
  const lines = [
    '# callback-detection-v001 execution result',
    '',
    `- 生成系統: ${result.generationSystem}`,
    `- モデル: ${result.model}`,
    `- 全文探索窓: ${result.search.windowCount}`,
    `- 有効原因候補: ${result.search.validFindingCount}`,
    `- 形式不成立原因候補: ${result.search.invalidFindingCount}`,
    `- Geminiタブ残数: ${result.geminiTabCountAfterRun ?? '取得不能'}`,
    '- 実装・実走の人間作業: 0件・0分',
    `- 実走後の原因確認: ${reviewWork.itemCount}件・1件${reviewWork.estimatedMinutesPerItemUpperBound}分以内・合計上限${reviewWork.estimatedTotalMinutesUpperBound}分`,
    '',
    '| target | status | decision | primary range |',
    '| --- | --- | --- | --- |'
  ];
  for (const item of result.targets) {
    const range = item.primaryFinding
      ? `${item.primaryFinding.sourceStartMs}-${item.primaryFinding.sourceEndMs}`
      : '-';
    lines.push(`| ${item.targetId} | ${item.status} | ${item.decision?.decision ?? '-'} | ${range} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const baseDir = path.join(evalRoot, 'outputs', 'callback-detection', options.outputId);
  const reportDir = path.join(evalRoot, 'reports', 'callback-detection', options.outputId);
  const planPath = path.join(baseDir, 'window-plan.json');
  if (!existsSync(planPath)) throw new Error(`window-planがありません: ${relative(planPath)}`);
  const plan = await readJson(planPath);
  if (plan.leakageStatus !== 'pass') throw new Error('window-planの漏洩検査が合格していません');
  const windowOutputDir = path.join(baseDir, 'windows');
  await mkdir(windowOutputDir, { recursive: true });
  let newWindowsThisInvocation = 0;

  for (const window of plan.windows) {
    const outputPath = path.join(windowOutputDir, `run-01-${window.windowId}-gemini-output.json`);
    const saved = await validateOrArchiveSearchOutput(outputPath, window.windowId);
    if (saved.valid) {
      console.log(`[skip] ${window.windowId}`);
      continue;
    }
    if (options.scanOnly) {
      const progressPath = await writeProgress(baseDir, plan, 'scan_only_partial_state', newWindowsThisInvocation);
      console.log(`[scan-only] next=${window.windowId}`);
      console.log(`[progress] ${relative(progressPath)}`);
      return;
    }
    if (options.maxWindowsThisInvocation !== undefined
      && newWindowsThisInvocation >= options.maxWindowsThisInvocation) {
      const progressPath = await writeProgress(baseDir, plan, 'paused_after_window_limit', newWindowsThisInvocation);
      console.log(`[pause] maxWindowsThisInvocation=${options.maxWindowsThisInvocation}`);
      console.log(`[progress] ${relative(progressPath)}`);
      return;
    }
    let completed = false;
    let lastError;
    for (let attempt = 1; attempt <= options.maxAttemptsPerWindow; attempt += 1) {
      await archiveFailureDiagnostic(outputPath, attempt);
      console.log(`[run] ${window.windowId} attempt ${attempt}/${options.maxAttemptsPerWindow}`);
      try {
        await runProcess(path.join(root, 'runner', 'node_modules', '.bin', 'tsx'), [
          'evals/clip_composition/run_web_gemini_prompt.ts',
          '--prompt', path.join(root, window.promptPath),
          '--output', outputPath,
          '--model', plan.model,
          '--params', JSON.stringify({
            temperature: 0,
            source: 'gemini-web',
            runner: 'edge-cdp-text-prompt',
            task: 'callback-detection-search-v001',
            run: 1,
            windowId: window.windowId
          }),
          '--cdpPort', options.cdpPort,
          '--timeoutMs', options.timeoutMs,
          '--rejectPartialExtraction',
          '--closeTabAfterRun'
        ]);
        const validated = await validateOrArchiveSearchOutput(outputPath, window.windowId);
        if (!validated.valid) throw new Error(`${window.windowId}の保存出力が完全ではありません`);
        completed = true;
        break;
      } catch (error) {
        lastError = error;
        console.log(`[attempt-failed] ${window.windowId} attempt ${attempt}/${options.maxAttemptsPerWindow}`);
      }
    }
    if (!completed) {
      await writeProgress(baseDir, plan, 'stopped_after_window_error', newWindowsThisInvocation);
      throw lastError ?? new Error(`${window.windowId}が完了しませんでした`);
    }
    newWindowsThisInvocation += 1;
    await writeProgress(baseDir, plan, 'window_saved', newWindowsThisInvocation);
  }

  const aggregate = await aggregateSearch(plan, baseDir);
  let targets = [];
  if (!options.skipVerification) {
    targets = await runVerification(plan, aggregate, baseDir, reportDir);
  }
  const reviewItemCount = targets.filter((target) => (
    target.status === 'verified'
    && target.decision?.decision === 'actual_separate_cause'
    && target.primaryFinding
  )).length;
  const result = {
    kind: 'callback_detection_v001_result',
    createdAt: new Date().toISOString(),
    generationSystem: plan.generationSystem,
    promptVersion: plan.promptVersion,
    verificationPromptVersion: plan.verificationPromptVersion,
    verificationInputVersion: plan.verificationInputVersion,
    model: plan.model,
    run: 1,
    search: {
      windowCount: aggregate.windowCount,
      completedWindowCount: aggregate.completedWindowCount,
      rawFindingCount: aggregate.rawFindingCount,
      validFindingCount: aggregate.validFindingCount,
      invalidFindingCount: aggregate.invalidFindingCount
    },
    targets,
    geminiTabCountAfterRun: await geminiTabCount(),
    humanWork: {
      execution: { itemCount: 0, estimatedMinutes: 0 },
      review: {
        itemCount: reviewItemCount,
        estimatedMinutesPerItemUpperBound: 2,
        estimatedTotalMinutesUpperBound: reviewItemCount * 2
      }
    }
  };
  const safeVerificationPromptVersion = sanitize(plan.verificationPromptVersion);
  const safeVerificationInputVersion = sanitize(plan.verificationInputVersion);
  const safeVerificationRunVersion = `${safeVerificationPromptVersion}__${safeVerificationInputVersion}`;
  await writeFile(
    path.join(baseDir, `result-${safeVerificationRunVersion}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
  await writeFile(path.join(baseDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(reportDir, `execution-result-${safeVerificationRunVersion}.md`),
    `${resultMarkdown(result)}\n`,
    'utf8',
  );
  await writeFile(path.join(reportDir, 'execution-result.md'), `${resultMarkdown(result)}\n`, 'utf8');
  const progressPath = await writeProgress(baseDir, plan, 'completed_and_verified', newWindowsThisInvocation);
  console.log(`[result] ${relative(path.join(baseDir, 'result.json'))}`);
  console.log(`[progress] ${relative(progressPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

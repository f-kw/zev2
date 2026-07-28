#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI, type GenerateContentResponse, type Part } from '@google/genai';
import {
  buildLayoutVideoFilter,
  buildScreenLayoutCandidateSetFromGemini,
  selectScreenLayoutCandidate,
  type ShortsScreenLayoutCandidateSet,
} from '../src/screen-layout.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUTPUT_DIRECTORY = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/vertical-preset-previews',
  'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate',
  'legacy-crop',
);
const BASE_MEDIA_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/base-media',
  'qdczJpv8RCc-candidate-59-v001/base-media.mp4',
);
const DISPLAY_PLAN_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/caption-display-pairs',
  'qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json',
);
const EDIT_PLAN_SOURCE_PATH = path.join(WORKSPACE_ROOT, 'runner/src/steps/edit-plan.ts');
const ENV_PATH = '/Users/kawafmm/workspace/env/.env';
const MODEL = 'gemini-3.6-flash';
const EXPECTED_EDIT_PLAN_SOURCE_SHA256 =
  '513fb11e6a7f34dd524b98f6897dfb218f388599775061367b53dded3ebdd291';
const INPUT_PRICE_USD_PER_MILLION = 1.5;
const OUTPUT_PRICE_USD_PER_MILLION = 7.5;
const MAX_APPROVED_COST_USD = 0.5;
const LOCAL_PREFLIGHT = process.argv.includes('--local-preflight');
const RESUME_SAVED_RESPONSES = process.argv.includes('--resume-saved-responses');

const sha256 = (value: Buffer | string): string => (
  createHash('sha256').update(value).digest('hex')
);

const run = (
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    };
    if (code === 0) {
      resolve(result);
      return;
    }
    reject(new Error(`${command} exited ${code}\n${result.stderr}`));
  });
});

const parseEnvValue = (raw: string, key: string): string | undefined => {
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0 || line.slice(0, separator).trim() !== key) {
      continue;
    }
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
};

const extractPromptBuilder = <T extends (...args: any[]) => string>(
  source: string,
  functionName: string,
  nextFunctionName: string,
  dependencies: Record<string, unknown>,
): { builder: T; sourceText: string; sourceSha256: string } => {
  const start = source.indexOf(`function ${functionName}(`);
  const end = source.indexOf(`\nfunction ${nextFunctionName}(`, start);
  if (start < 0 || end < 0) {
    throw new Error(`${functionName}の正本を抽出できません`);
  }
  const sourceText = source.slice(start, end).trim();
  const executable = sourceText.replace(
    new RegExp(`function ${functionName}\\([\\s\\S]*?\\): string \\{`),
    `function ${functionName}(...args) { const [${functionName === 'buildGeminiEditPlanPrompt' ? 'composition, request' : 'composition, candidateDraft'}] = args;`,
  );
  const names = Object.keys(dependencies);
  const values = Object.values(dependencies);
  const builder = new Function(
    ...names,
    `${executable}\nreturn ${functionName};`,
  )(...values) as T;
  return { builder, sourceText, sourceSha256: sha256(sourceText) };
};

const responseText = (response: GenerateContentResponse): string => {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
  if (!text) {
    throw new Error('Gemini応答にテキストがありません');
  }
  return text;
};

const parseStrictJson = (text: string, label: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('JSON objectではありません');
    }
    return value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`${label}を無改変のままJSONとして読めません: ${String(error)}`);
  }
};

const usageFrom = (response: GenerateContentResponse) => {
  const usage = response.usageMetadata;
  const inputTokens = Number(usage?.promptTokenCount ?? 0);
  const outputTokens = Number(usage?.candidatesTokenCount ?? 0);
  const thoughtTokens = Number(usage?.thoughtsTokenCount ?? 0);
  const chargedOutputTokens = outputTokens + thoughtTokens;
  const estimatedCostUsd = (
    inputTokens * INPUT_PRICE_USD_PER_MILLION
    + chargedOutputTokens * OUTPUT_PRICE_USD_PER_MILLION
  ) / 1_000_000;
  return {
    inputTokens,
    outputTokens,
    thoughtTokens,
    chargedOutputTokens,
    totalTokens: Number(usage?.totalTokenCount ?? 0),
    estimatedCostUsd,
    trafficType: usage?.trafficType ?? null,
  };
};

const imageMean = async (imagePath: string): Promise<number> => {
  const result = await run('magick', [
    imagePath,
    '-colorspace',
    'Gray',
    '-format',
    '%[fx:mean]',
    'info:',
  ]);
  const value = Number(result.stdout.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`${imagePath}の画素平均を読めません`);
  }
  return value;
};

const main = async () => {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const [baseMedia, displayPlanRaw, editPlanSource] = await Promise.all([
    readFile(BASE_MEDIA_PATH),
    readFile(DISPLAY_PLAN_PATH, 'utf8'),
    readFile(EDIT_PLAN_SOURCE_PATH, 'utf8'),
  ]);
  if (sha256(editPlanSource) !== EXPECTED_EDIT_PLAN_SOURCE_SHA256) {
    throw new Error('旧crop promptの正本source SHAが事前固定値と一致しません');
  }

  const expectedCostFromHistoricalObservedUsageUsd = (
    21_831 * INPUT_PRICE_USD_PER_MILLION
    + (2_399 + 2_120) * OUTPUT_PRICE_USD_PER_MILLION
  ) / 1_000_000;
  if (expectedCostFromHistoricalObservedUsageUsd > MAX_APPROVED_COST_USD) {
    throw new Error('保存済み旧実走の実測tokenに基づく費用が承認上限を超えます');
  }

  const displayPlan = JSON.parse(displayPlanRaw);
  const cues = displayPlan.containers.flatMap((container: any) => container.cues);
  const speechUnits = cues.map((cue: any, index: number) => ({
    id: index + 1,
    sourceStartMs: cue.sourceStartMs,
    sourceEndMs: cue.sourceEndMs,
    text: cue.lines.map((line: any) => line.text).join(''),
  }));
  const composition = {
    title: 'マリンのADHD的？な片付け事情と無意識の脱衣',
    themeSummary: '片付けの途中で別のことを始めてしまう話と、無意識に服を脱いでいた話',
    parts: [{
      role: '本編',
      sourceStartMs: 5_941_162,
      sourceEndMs: 5_992_736,
      speechIds: speechUnits.map((speech: any) => speech.id),
      transcriptText: speechUnits.map((speech: any) => speech.text).join(''),
      speechUnits,
    }],
  };
  const request = {
    input: {
      purpose: '縦型ショートの画面構成previewで、旧crop窓を決める',
    },
  };

  const editPrompt = extractPromptBuilder<(composition: any, request: any) => string>(
    editPlanSource,
    'buildGeminiEditPlanPrompt',
    'applyGeminiEditPlanResponse',
    { millisecondsToSeconds: (valueMs: number) => (valueMs / 1000).toFixed(3) },
  );
  const selectionPrompt = extractPromptBuilder<(composition: any, candidateDraft: any) => string>(
    editPlanSource,
    'buildGeminiCandidateSelectionPrompt',
    'applyGeminiCandidateSelectionResponse',
    {},
  );
  const resolvedEditPrompt = editPrompt.builder(composition, request);
  await writeFile(
    path.join(OUTPUT_DIRECTORY, 'gemini-edit-plan-prompt.txt'),
    `${resolvedEditPrompt}\n`,
    'utf8',
  );

  const clipPath = path.join(OUTPUT_DIRECTORY, 'candidate-59-legacy-input-640.mp4');
  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    BASE_MEDIA_PATH,
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-vf',
    'scale=640:-2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-movflags',
    '+faststart',
    clipPath,
  ]);
  const clip = await readFile(clipPath);
  const firstParts: Part[] = [
    { text: resolvedEditPrompt },
    {
      text: [
        '動画断片1',
        '役割: 本編',
        '元動画時間: 5941.162秒 - 5992.736秒',
        `使用する発話ID: ${speechUnits.map((speech: any) => speech.id).join(', ')}`,
        `文字起こし: ${composition.parts[0].transcriptText}`,
      ].join('\n'),
    },
    {
      inlineData: {
        mimeType: 'video/mp4',
        data: clip.toString('base64'),
      },
    },
  ];
  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      RESUME_SAVED_RESPONSES
        ? 'gemini-edit-plan-request-manifest.corrected-v002.json'
        : 'gemini-edit-plan-request-manifest.json',
    ),
    `${JSON.stringify({
      model: MODEL,
      responseMimeType: 'application/json',
      promptPath: 'gemini-edit-plan-prompt.txt',
      promptSha256: sha256(resolvedEditPrompt),
      promptByteLength: Buffer.byteLength(resolvedEditPrompt),
      promptFileHasOneTrailingLfNotSent: true,
      mediaPath: 'candidate-59-legacy-input-640.mp4',
      mediaSha256: sha256(clip),
      apiKeySource: LOCAL_PREFLIGHT
        ? 'not loaded during local preflight'
        : RESUME_SAVED_RESPONSES
          ? 'not loaded while resuming saved responses'
        : 'process environment loaded from external .env',
      rawApiKeySaved: false,
      retryCount: 0,
    }, null, 2)}\n`,
  );
  if (LOCAL_PREFLIGHT) {
    const localPreflight = {
      schemaVersion: 'vertical-preset-legacy-crop-local-preflight-v001',
      status: 'passed',
      externalApiCalls: 0,
      source: {
        path: path.relative(WORKSPACE_ROOT, BASE_MEDIA_PATH),
        sha256: sha256(baseMedia),
      },
      promptProvenance: {
        sourcePath: path.relative(WORKSPACE_ROOT, EDIT_PLAN_SOURCE_PATH),
        sourceFileSha256: sha256(editPlanSource),
        editPromptFunctionSha256: editPrompt.sourceSha256,
        selectionPromptFunctionSha256: selectionPrompt.sourceSha256,
        extraction: '現行sourceの関数本文を読み取り、引数型だけ除いて同じ関数を実行',
        promptModified: false,
      },
      resolvedEditPrompt: {
        path: 'gemini-edit-plan-prompt.txt',
        sentByteSha256: sha256(resolvedEditPrompt),
        sentByteLength: Buffer.byteLength(resolvedEditPrompt),
        savedFileSha256: sha256(`${resolvedEditPrompt}\n`),
        savedFileByteLength: Buffer.byteLength(`${resolvedEditPrompt}\n`),
      },
      media: {
        path: 'candidate-59-legacy-input-640.mp4',
        sha256: sha256(clip),
        byteLength: clip.byteLength,
      },
      historicalUsageCostPreflight: {
        estimatedUsd: expectedCostFromHistoricalObservedUsageUsd,
        approvedMaximumUsd: MAX_APPROVED_COST_USD,
        withinApprovedMaximum:
          expectedCostFromHistoricalObservedUsageUsd <= MAX_APPROVED_COST_USD,
      },
      apiKeyLoaded: false,
    };
    await writeFile(
      path.join(OUTPUT_DIRECTORY, 'local-preflight.json'),
      `${JSON.stringify(localPreflight, null, 2)}\n`,
    );
    console.log(JSON.stringify({
      status: localPreflight.status,
      externalApiCalls: 0,
      outputDirectory: path.relative(WORKSPACE_ROOT, OUTPUT_DIRECTORY),
    }));
    return;
  }

  let client: GoogleGenAI | undefined;
  let firstResponse: GenerateContentResponse;
  if (RESUME_SAVED_RESPONSES) {
    firstResponse = JSON.parse(
      await readFile(
        path.join(OUTPUT_DIRECTORY, 'gemini-edit-plan-response.raw.json'),
        'utf8',
      ),
    ) as GenerateContentResponse;
  } else {
    const envRaw = await readFile(ENV_PATH, 'utf8');
    const apiKey = process.env.GEMINI_API_KEY ?? parseEnvValue(envRaw, 'GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEYが実行環境にありません');
    }
    client = new GoogleGenAI({ apiKey });
    firstResponse = await client.models.generateContent({
      model: MODEL,
      contents: firstParts,
      config: { responseMimeType: 'application/json' },
    });
    await writeFile(
      path.join(OUTPUT_DIRECTORY, 'gemini-edit-plan-response.raw.json'),
      `${JSON.stringify(firstResponse, null, 2)}\n`,
    );
  }
  const firstParsed = parseStrictJson(responseText(firstResponse), '旧crop第1応答');
  const rawSegments = Array.isArray(firstParsed.renderSegments)
    ? firstParsed.renderSegments
    : [];
  if (rawSegments.length !== 1) {
    throw new Error(`旧crop第1応答の断片数が1ではありません: ${rawSegments.length}`);
  }
  const candidateSet = buildScreenLayoutCandidateSetFromGemini(
    rawSegments[0],
    'renderSegments[1]',
  );

  const previews: Array<{
    candidateId: string;
    candidateLabel: string;
    candidateReason: string;
    path: string;
    sha256: string;
    grayscaleMean: number;
  }> = [];
  for (const candidate of candidateSet.candidates) {
    const selected = selectScreenLayoutCandidate(
      candidateSet,
      candidate.id,
      `renderSegments[1].${candidate.id}`,
    );
    const outputLabel = `preview_${candidate.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const filter = buildLayoutVideoFilter({
      inputLabel: '[0:v]',
      outputLabel,
      sourceWidth: 1920,
      sourceHeight: 1080,
      durationSeconds: 0.2,
      screenLayout: selected,
    });
    const outputPath = path.join(OUTPUT_DIRECTORY, `candidate-preview-${candidate.id}.jpg`);
    await run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      '25',
      '-i',
      BASE_MEDIA_PATH,
      '-filter_complex',
      filter,
      '-map',
      `[${outputLabel}]`,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      outputPath,
    ]);
    const bytes = await readFile(outputPath);
    const grayscaleMean = await imageMean(outputPath);
    if (grayscaleMean <= 0.001) {
      throw new Error(`${candidate.id}の候補画像が黒一色です`);
    }
    previews.push({
      candidateId: candidate.id,
      candidateLabel: candidate.label,
      candidateReason: candidate.reason,
      path: path.basename(outputPath),
      sha256: sha256(bytes),
      grayscaleMean,
    });
  }

  const candidateDraft = {
    editPlan: {
      renderSegments: [{
        role: typeof rawSegments[0]?.role === 'string' ? rawSegments[0].role : '本編',
        caption: typeof rawSegments[0]?.caption === 'string' ? rawSegments[0].caption : '',
      }],
    },
    candidateSets: [candidateSet],
  };
  const resolvedSelectionPrompt = selectionPrompt.builder(composition, candidateDraft);
  await writeFile(
    path.join(OUTPUT_DIRECTORY, 'gemini-layout-candidate-prompt.txt'),
    `${resolvedSelectionPrompt}\n`,
    'utf8',
  );
  const secondParts: Part[] = [{ text: resolvedSelectionPrompt }];
  for (const preview of previews) {
    secondParts.push({
      text: [
        '断片1',
        `候補ID: ${preview.candidateId}`,
        `候補名: ${preview.candidateLabel}`,
        `候補の意味: ${preview.candidateReason}`,
      ].join('\n'),
    });
    secondParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: (await readFile(path.join(OUTPUT_DIRECTORY, preview.path))).toString('base64'),
      },
    });
  }
  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      RESUME_SAVED_RESPONSES
        ? 'gemini-layout-candidate-request-manifest.corrected-v002.json'
        : 'gemini-layout-candidate-request-manifest.json',
    ),
    `${JSON.stringify({
      model: MODEL,
      responseMimeType: 'application/json',
      promptPath: 'gemini-layout-candidate-prompt.txt',
      promptSha256: sha256(resolvedSelectionPrompt),
      promptByteLength: Buffer.byteLength(resolvedSelectionPrompt),
      promptFileHasOneTrailingLfNotSent: true,
      candidates: previews,
      apiKeySource: RESUME_SAVED_RESPONSES
        ? 'not loaded while resuming saved responses'
        : 'process environment loaded from external .env',
      rawApiKeySaved: false,
      retryCount: 0,
    }, null, 2)}\n`,
  );
  let secondResponse: GenerateContentResponse;
  if (RESUME_SAVED_RESPONSES) {
    secondResponse = JSON.parse(
      await readFile(
        path.join(OUTPUT_DIRECTORY, 'gemini-layout-candidate-response.raw.json'),
        'utf8',
      ),
    ) as GenerateContentResponse;
    await writeFile(
      path.join(OUTPUT_DIRECTORY, 'attempt-v001-failure.json'),
      `${JSON.stringify({
        schemaVersion: 'vertical-preset-legacy-crop-attempt-failure-v001',
        status: 'failed_after_two_api_responses',
        error: 'preflightExpectedCostFromHistoricalObservedUsageUsd is not defined',
        stage: 'decision manifest construction',
        apiCallsCompletedBeforeFailure: 2,
        automaticRetries: 0,
        responseEvidence: [
          'gemini-edit-plan-response.raw.json',
          'gemini-layout-candidate-response.raw.json',
        ],
        recovery: 'saved raw responses only; additional API calls 0',
      }, null, 2)}\n`,
    );
  } else {
    if (!client) {
      throw new Error('Gemini clientがありません');
    }
    secondResponse = await client.models.generateContent({
      model: MODEL,
      contents: secondParts,
      config: { responseMimeType: 'application/json' },
    });
    await writeFile(
      path.join(OUTPUT_DIRECTORY, 'gemini-layout-candidate-response.raw.json'),
      `${JSON.stringify(secondResponse, null, 2)}\n`,
    );
  }
  const secondParsed = parseStrictJson(responseText(secondResponse), '旧crop第2応答');
  const selections = Array.isArray(secondParsed.renderSegments)
    ? secondParsed.renderSegments
    : [];
  if (selections.length !== 1) {
    throw new Error(`旧crop第2応答の選択数が1ではありません: ${selections.length}`);
  }
  const selectedCandidateId = typeof selections[0]?.selectedCandidateId === 'string'
    ? selections[0].selectedCandidateId
    : '';
  const selectionReason = typeof selections[0]?.reason === 'string'
    ? selections[0].reason
    : undefined;
  const selectedPlan = selectScreenLayoutCandidate(
    candidateSet,
    selectedCandidateId,
    'renderSegments[1]',
    selectionReason,
  );

  const firstUsage = usageFrom(firstResponse);
  const secondUsage = usageFrom(secondResponse);
  const estimatedCostUsd = firstUsage.estimatedCostUsd + secondUsage.estimatedCostUsd;
  if (estimatedCostUsd > MAX_APPROVED_COST_USD) {
    throw new Error(`実測tokenによる費用見積りUS$${estimatedCostUsd}が承認上限を超えました`);
  }
  const decision = {
    schemaVersion: 'vertical-preset-legacy-crop-decision-v001',
    status: 'passed',
    createdAt: new Date().toISOString(),
    source: {
      path: path.relative(WORKSPACE_ROOT, BASE_MEDIA_PATH),
      sha256: sha256(baseMedia),
      width: 1920,
      height: 1080,
      durationSeconds: 51.566667,
    },
    promptProvenance: {
      sourcePath: path.relative(WORKSPACE_ROOT, EDIT_PLAN_SOURCE_PATH),
      sourceFileSha256: sha256(editPlanSource),
      editPromptFunctionSha256: editPrompt.sourceSha256,
      selectionPromptFunctionSha256: selectionPrompt.sourceSha256,
      extraction: '現行sourceの関数本文を読み取り、引数型だけ除いて同じ関数を実行',
      promptModified: false,
    },
    candidateSet,
    previews,
    selectedPlan,
    model: {
      requested: MODEL,
      firstResponseModelVersion: firstResponse.modelVersion ?? null,
      secondResponseModelVersion: secondResponse.modelVersion ?? null,
    },
    usage: {
      first: firstUsage,
      second: secondUsage,
      totalEstimatedCostUsd: estimatedCostUsd,
      priceBasis: {
        source: 'DECISIONS.md 2026-07-23 kawafmm指定 Standard価格',
        inputUsdPerMillion: INPUT_PRICE_USD_PER_MILLION,
        outputUsdPerMillion: OUTPUT_PRICE_USD_PER_MILLION,
        thoughtsCountedAsOutput: true,
        actualBilledAmountObserved: false,
      },
      preflightExpectedCostFromHistoricalObservedUsageUsd:
        expectedCostFromHistoricalObservedUsageUsd,
      approvedMaximumUsd: MAX_APPROVED_COST_USD,
    },
    calls: {
      generateContent: 2,
      retries: 0,
      resumedFromSavedResponses: RESUME_SAVED_RESPONSES,
      additionalCallsDuringResume: RESUME_SAVED_RESPONSES ? 0 : null,
    },
    secretScan: {
      rawApiKeySaved: false,
      envFileCopied: false,
    },
  };
  await writeFile(
    path.join(OUTPUT_DIRECTORY, 'crop-decision.json'),
    `${JSON.stringify(decision, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    status: decision.status,
    selectedLayout: selectedPlan.screenLayoutId,
    selectedCandidateId: selectedPlan.selectedCandidateId,
    estimatedCostUsd,
    outputDirectory: path.relative(WORKSPACE_ROOT, OUTPUT_DIRECTORY),
  }));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

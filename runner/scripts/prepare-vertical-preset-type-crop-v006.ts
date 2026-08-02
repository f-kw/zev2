#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  lstat,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  buildLayoutVideoFilter,
  buildScreenLayoutCandidateSetFromGemini,
  selectScreenLayoutCandidate,
  type ShortsScreenLayoutCandidateSet,
} from '../src/screen-layout.ts';
import {
  buildGeminiCandidateSelectionPrompt,
  buildGeminiEditPlanPrompt,
} from '../src/steps/edit-plan.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SOURCE_JOB_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/source-review-preparation-jobs',
  'qdczJpv8RCc-candidate-59-v001.json',
);
const DISPLAY_PLAN_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/caption-display-pairs',
  'qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json',
);
const OUTPUT_DIRECTORY = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/vertical-preset-previews',
  'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate',
  'type-crop-v006',
);
const EDIT_PLAN_IMPLEMENTATION_PATH = path.join(
  WORKSPACE_ROOT,
  'runner/src/steps/edit-plan.ts',
);
const SCREEN_LAYOUT_IMPLEMENTATION_PATH = path.join(
  WORKSPACE_ROOT,
  'runner/src/screen-layout.ts',
);

const CLASSIFICATION_VIDEO_NAME = 'classification-input-640.mp4';
const CLASSIFICATION_PROMPT_NAME = 'classification-prompt.txt';
const CLASSIFICATION_MANIFEST_NAME = 'classification-package-manifest-v006.json';
const CLASSIFICATION_RESPONSE_NAME = 'classification-response.json';
const CLASSIFICATION_OBSERVATION_NAME = 'classification-web-observation-v002.json';
const SELECTION_PROMPT_NAME = 'selection-prompt.txt';
const SELECTION_MANIFEST_NAME = 'selection-package-manifest-v006.json';
const SELECTION_RESPONSE_NAME = 'selection-response.json';
const SELECTION_OBSERVATION_NAME = 'selection-web-observation-v001.json';
const CROP_DECISION_NAME = 'crop-decision-v006.json';

type JsonRecord = Record<string, unknown>;

type CommandResult = {
  stdout: Buffer;
  stderr: Buffer;
};

type WebObservation = {
  bytes: Buffer;
  modelLabel: string;
  observedAt: string;
};

type PreparedInputs = {
  sourceJobBytes: Buffer;
  displayPlanBytes: Buffer;
  baseMediaPath: string;
  baseMediaBytes: Buffer;
  composition: Parameters<typeof buildGeminiEditPlanPrompt>[0];
  request: Parameters<typeof buildGeminiEditPlanPrompt>[1];
};

const sha256 = (value: Buffer | string): string => (
  createHash('sha256').update(value).digest('hex')
);

const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value;
};

const stableJson = (value: unknown): string => JSON.stringify(stableJsonValue(value));

const formattedJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const recordFrom = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}がJSON objectではありません`);
  }
  return value as JsonRecord;
};

const arrayFrom = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label}が配列ではありません`);
  }
  return value;
};

const stringFrom = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}が空でない文字列ではありません`);
  }
  return value;
};

const integerFrom = (value: unknown, label: string): number => {
  if (!Number.isInteger(value)) {
    throw new Error(`${label}が整数ではありません`);
  }
  return value as number;
};

const workspacePathFrom = (value: unknown, label: string): string => {
  const relativePath = stringFrom(value, label);
  const absolutePath = path.resolve(WORKSPACE_ROOT, relativePath);
  const relativeToRoot = path.relative(WORKSPACE_ROOT, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`${label}がworkspace外を指しています`);
  }
  return absolutePath;
};

const relativeWorkspacePath = (absolutePath: string): string => (
  path.relative(WORKSPACE_ROOT, absolutePath)
);

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const assertTargetsAbsent = async (targets: string[], mode: string): Promise<void> => {
  const existing: string[] = [];
  for (const target of targets) {
    if (await exists(target)) {
      existing.push(relativeWorkspacePath(target));
    }
  }
  if (existing.length > 0) {
    throw new Error(
      `${mode}の出力先が既に存在するため上書きしません: ${existing.join(', ')}`,
    );
  }
};

const writeNewFile = async (filePath: string, value: Buffer | string): Promise<void> => {
  await writeFile(filePath, value, { flag: 'wx' });
};

const run = (
  command: string,
  args: string[],
): Promise<CommandResult> => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: WORKSPACE_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    };
    if (code === 0) {
      resolve(result);
      return;
    }
    reject(new Error(
      `${command} exited ${code}\n${result.stderr.toString('utf8')}`,
    ));
  });
});

const parsePlainJson = (bytes: Buffer, label: string): JsonRecord => {
  let parsed: unknown;
  try {
    // 生応答をそのままJSONへ渡す。trim・fence除去・修復は行わない。
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`${label}を無改変のままJSONとして読めません: ${String(error)}`);
  }
  return recordFrom(parsed, label);
};

const readJsonFile = async (filePath: string, label: string): Promise<{
  bytes: Buffer;
  value: JsonRecord;
}> => {
  const bytes = await readFile(filePath);
  return {
    bytes,
    value: parsePlainJson(bytes, label),
  };
};

const loadWebObservation = async (params: {
  filePath: string;
  stage: 'classification' | 'selection';
  expectedInputs: Array<{ path: string; fileSha256: string }>;
  response: { path: string; fileSha256: string };
}): Promise<WebObservation> => {
  const result = await readJsonFile(params.filePath, `${params.stage} Web Gemini観測記録`);
  const value = result.value;
  if (value.schemaVersion !== 'vertical-preset-type-crop-web-observation-v001') {
    throw new Error(`${params.stage} Web Gemini観測記録のschemaが不正です`);
  }
  if (value.stage !== params.stage || value.observer !== 'gemini-web') {
    throw new Error(`${params.stage} Web Gemini観測記録の段階または観測者が不正です`);
  }
  const modelLabel = stringFrom(value.modelLabel, `${params.stage} observation.modelLabel`);
  const observedAt = stringFrom(value.observedAt, `${params.stage} observation.observedAt`);
  const inputs = arrayFrom(value.inputs, `${params.stage} observation.inputs`);
  if (inputs.length !== params.expectedInputs.length) {
    throw new Error(`${params.stage} Web Gemini観測記録の入力件数が一致しません`);
  }
  for (const [index, expected] of params.expectedInputs.entries()) {
    const actual = recordFrom(inputs[index], `${params.stage} observation.inputs[${index}]`);
    if (actual.path !== expected.path || actual.fileSha256 !== expected.fileSha256) {
      throw new Error(`${params.stage} Web Gemini観測記録の入力${index + 1}が送信物と一致しません`);
    }
  }
  const response = recordFrom(value.response, `${params.stage} observation.response`);
  if (
    response.path !== params.response.path
    || response.fileSha256 !== params.response.fileSha256
  ) {
    throw new Error(`${params.stage} Web Gemini観測記録の応答が保存byteと一致しません`);
  }
  return { bytes: result.bytes, modelLabel, observedAt };
};

const buildComposition = (
  sourceJob: JsonRecord,
  displayPlan: JsonRecord,
): PreparedInputs['composition'] => {
  const inputs = recordFrom(sourceJob.inputs, 'source job.inputs');
  const candidate = recordFrom(inputs.candidate, 'source job.inputs.candidate');
  const outerRange = recordFrom(candidate.outerRange, 'candidate.outerRange');
  const containers = arrayFrom(displayPlan.containers, 'display plan.containers');
  const cues = containers.flatMap((containerValue, containerIndex) => {
    const container = recordFrom(containerValue, `containers[${containerIndex}]`);
    return arrayFrom(container.cues, `containers[${containerIndex}].cues`);
  });
  if (cues.length === 0) {
    throw new Error('表示計画に発話がありません');
  }

  const speechUnits = cues.map((cueValue, index) => {
    const cue = recordFrom(cueValue, `cue[${index}]`);
    const lines = arrayFrom(cue.lines, `cue[${index}].lines`);
    const text = lines
      .map((lineValue, lineIndex) => (
        stringFrom(
          recordFrom(lineValue, `cue[${index}].lines[${lineIndex}]`).text,
          `cue[${index}].lines[${lineIndex}].text`,
        )
      ))
      .join('');
    return {
      id: index + 1,
      sourceStartMs: integerFrom(cue.sourceStartMs, `cue[${index}].sourceStartMs`),
      sourceEndMs: integerFrom(cue.sourceEndMs, `cue[${index}].sourceEndMs`),
      text,
    };
  });
  const title = stringFrom(candidate.title, 'candidate.title');
  const source = recordFrom(inputs.source, 'source job.inputs.source');
  const candidateId = integerFrom(candidate.candidateId, 'candidate.candidateId');
  const sourceStartMs = integerFrom(
    outerRange.startMs,
    'candidate.outerRange.startMs',
  );
  const sourceEndMs = integerFrom(
    outerRange.endMs,
    'candidate.outerRange.endMs',
  );

  return {
    kind: 'composition_json',
    mode: 'transcript-multi-part-composition',
    generatedAt: '',
    sourceUri: stringFrom(source.sourceRef, 'source job.inputs.source.sourceRef'),
    selectedThemeId: `candidate-${candidateId}`,
    title,
    themeSummary: title,
    sourceStartMs,
    sourceEndMs,
    parts: [{
      id: 'part-1',
      role: '本編',
      sourceStartMs,
      sourceEndMs,
      speechIds: speechUnits.map((speech) => speech.id),
      transcriptText: speechUnits.map((speech) => speech.text).join(''),
      speechUnits,
      connectionNote: '',
    }],
    assemblyPlan: '',
  };
};

const loadInputs = async (): Promise<PreparedInputs> => {
  const [
    sourceJobResult,
    displayPlanResult,
  ] = await Promise.all([
    readJsonFile(SOURCE_JOB_PATH, 'source review job'),
    readJsonFile(DISPLAY_PLAN_PATH, 'display plan'),
  ]);
  const timelineBinding = recordFrom(
    displayPlanResult.value.timelineBinding,
    'display plan.timelineBinding',
  );
  const baseMedia = recordFrom(timelineBinding.baseMedia, 'timelineBinding.baseMedia');
  const baseMediaPath = workspacePathFrom(baseMedia.path, 'timelineBinding.baseMedia.path');
  const baseMediaBytes = await readFile(baseMediaPath);
  const recordedBaseMediaSha = stringFrom(
    baseMedia.fileSha256,
    'timelineBinding.baseMedia.fileSha256',
  );
  if (sha256(baseMediaBytes) !== recordedBaseMediaSha) {
    throw new Error('基礎映像の実byte SHAが表示計画の記録と一致しません');
  }

  return {
    sourceJobBytes: sourceJobResult.bytes,
    displayPlanBytes: displayPlanResult.bytes,
    baseMediaPath,
    baseMediaBytes,
    composition: buildComposition(sourceJobResult.value, displayPlanResult.value),
    request: {
      input: {
        purpose: '動画種類を先に判別し、その種類に対応するcrop候補を作る',
      },
    } as PreparedInputs['request'],
  };
};

const probeMedia = async (mediaPath: string): Promise<{
  width: number;
  height: number;
  durationSeconds: number;
}> => {
  const result = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_type,width,height',
    '-of',
    'json',
    mediaPath,
  ]);
  const probe = parsePlainJson(result.stdout, 'ffprobe出力');
  const streams = arrayFrom(probe.streams, 'ffprobe.streams')
    .map((value, index) => recordFrom(value, `ffprobe.streams[${index}]`));
  const video = streams.find((stream) => stream.codec_type === 'video');
  if (!video) {
    throw new Error('基礎映像に映像streamがありません');
  }
  const format = recordFrom(probe.format, 'ffprobe.format');
  const width = Number(video.width);
  const height = Number(video.height);
  const durationSeconds = Number(format.duration);
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || width <= 0
    || height <= 0
    || !Number.isFinite(durationSeconds)
    || durationSeconds <= 0
  ) {
    throw new Error('基礎映像の寸法または再生時間が不正です');
  }
  return { width, height, durationSeconds };
};

const assertCorrectedClassificationPrompt = (prompt: string): void => {
  const required = [
    '最初に動画の種類を判別し、その種類に対応する画面枠を選んでください。',
    '場面の理解に同時表示が必要な独立映像がない。',
    '話者とは別に、ゲーム、共有画面、ブラウザ、資料、別映像など、場面の理解に同時表示が必要な独立映像がある。',
    '同じ話者を含む元映像全体と、その話者を上下へ重複表示してはいけません。',
    'screen は元映像全体ではなく、話者とは独立して内容理解に必要な情報画面の範囲です。',
    'layoutReason',
  ];
  for (const statement of required) {
    if (!prompt.includes(statement)) {
      throw new Error(`補正済み種類判別promptの必須文がありません: ${statement}`);
    }
  }
  if (prompt.includes('screen は、その断片で見えている画面全体です。')) {
    throw new Error('元映像全体を独立screenとみなす旧定義がpromptに残っています');
  }
  if (prompt.includes('"screenLayoutId": "screen_speaker",')) {
    throw new Error('単一の動画種類へ誘導する旧JSON例がpromptに残っています');
  }
};

const loadClassification = async (): Promise<{
  bytes: Buffer;
  response: JsonRecord;
  rawSegment: JsonRecord;
  candidateSet: ShortsScreenLayoutCandidateSet;
}> => {
  const responsePath = path.join(OUTPUT_DIRECTORY, CLASSIFICATION_RESPONSE_NAME);
  const responseResult = await readJsonFile(responsePath, '種類判別のplain JSON応答');
  const renderSegments = arrayFrom(
    responseResult.value.renderSegments,
    'classification response.renderSegments',
  );
  if (renderSegments.length !== 1) {
    throw new Error(
      `種類判別応答の断片数が1ではありません: ${renderSegments.length}`,
    );
  }
  const rawSegment = recordFrom(renderSegments[0], 'classification response.renderSegments[0]');
  const candidateSet = buildScreenLayoutCandidateSetFromGemini(
    rawSegment,
    'classification response.renderSegments[0]',
  );
  if (!candidateSet.classificationReason) {
    throw new Error('種類判別応答にlayoutReasonがありません');
  }
  return {
    bytes: responseResult.bytes,
    response: responseResult.value,
    rawSegment,
    candidateSet,
  };
};

const buildCandidateDraft = (
  rawSegment: JsonRecord,
  candidateSet: ShortsScreenLayoutCandidateSet,
): Parameters<typeof buildGeminiCandidateSelectionPrompt>[1] => ({
  editPlan: {
    renderSegments: [{
      role: typeof rawSegment.role === 'string' && rawSegment.role.length > 0
        ? rawSegment.role
        : '本編',
      caption: typeof rawSegment.caption === 'string' ? rawSegment.caption : '',
    }],
  },
  candidateSets: [candidateSet],
} as Parameters<typeof buildGeminiCandidateSelectionPrompt>[1]);

const prepare = async (): Promise<void> => {
  const promptPath = path.join(OUTPUT_DIRECTORY, CLASSIFICATION_PROMPT_NAME);
  const videoPath = path.join(OUTPUT_DIRECTORY, CLASSIFICATION_VIDEO_NAME);
  const manifestPath = path.join(OUTPUT_DIRECTORY, CLASSIFICATION_MANIFEST_NAME);
  await assertTargetsAbsent([promptPath, videoPath, manifestPath], '--prepare');
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const inputs = await loadInputs();
  const [editPlanImplementation, screenLayoutImplementation, sourceProbe] = await Promise.all([
    readFile(EDIT_PLAN_IMPLEMENTATION_PATH),
    readFile(SCREEN_LAYOUT_IMPLEMENTATION_PATH),
    probeMedia(inputs.baseMediaPath),
  ]);
  const prompt = buildGeminiEditPlanPrompt(inputs.composition, inputs.request);
  assertCorrectedClassificationPrompt(prompt);
  await writeNewFile(promptPath, prompt);
  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-n',
    '-i',
    inputs.baseMediaPath,
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
    videoPath,
  ]);
  const [promptBytes, videoBytes, preparedProbe] = await Promise.all([
    readFile(promptPath),
    readFile(videoPath),
    probeMedia(videoPath),
  ]);
  if (promptBytes.toString('utf8') !== prompt) {
    throw new Error('保存した種類判別promptが生成byteと一致しません');
  }
  if (preparedProbe.width !== 640) {
    throw new Error(`種類判別用映像の幅が640pxではありません: ${preparedProbe.width}`);
  }

  const manifest = {
    schemaVersion: 'vertical-preset-type-crop-classification-package-v006',
    mode: 'prepare',
    externalApiCallsByThisScript: 0,
    retryCount: 0,
    source: {
      sourceReviewJob: {
        path: relativeWorkspacePath(SOURCE_JOB_PATH),
        fileSha256: sha256(inputs.sourceJobBytes),
      },
      displayPlan: {
        path: relativeWorkspacePath(DISPLAY_PLAN_PATH),
        fileSha256: sha256(inputs.displayPlanBytes),
      },
      baseMedia: {
        path: relativeWorkspacePath(inputs.baseMediaPath),
        fileSha256: sha256(inputs.baseMediaBytes),
        width: sourceProbe.width,
        height: sourceProbe.height,
        durationSeconds: sourceProbe.durationSeconds,
      },
      editPlanImplementation: {
        path: relativeWorkspacePath(EDIT_PLAN_IMPLEMENTATION_PATH),
        fileSha256: sha256(editPlanImplementation),
      },
      screenLayoutImplementation: {
        path: relativeWorkspacePath(SCREEN_LAYOUT_IMPLEMENTATION_PATH),
        fileSha256: sha256(screenLayoutImplementation),
      },
    },
    requestPackage: {
      prompt: {
        path: CLASSIFICATION_PROMPT_NAME,
        fileSha256: sha256(promptBytes),
        byteLength: promptBytes.byteLength,
      },
      video: {
        path: CLASSIFICATION_VIDEO_NAME,
        fileSha256: sha256(videoBytes),
        byteLength: videoBytes.byteLength,
        width: preparedProbe.width,
        height: preparedProbe.height,
        durationSeconds: preparedProbe.durationSeconds,
      },
      contentsOrder: ['prompt', 'video'],
      expectedPlainJsonResponsePath: CLASSIFICATION_RESPONSE_NAME,
      expectedWebObservationPath: CLASSIFICATION_OBSERVATION_NAME,
      responseHandling: 'JSON.parse of exact saved bytes; no trim, fence removal, or repair',
    },
    classificationContract: {
      classificationBeforeCrop: true,
      layoutIsNotHardcodedByThisPackage: true,
      cropIsNotHardcodedByThisPackage: true,
      canonicalCandidateBuilder:
        'buildScreenLayoutCandidateSetFromGemini from runner/src/screen-layout.ts',
    },
  };
  await writeNewFile(manifestPath, formattedJson(manifest));
  console.log(JSON.stringify({
    status: 'prepared',
    externalApiCallsByThisScript: 0,
    outputDirectory: relativeWorkspacePath(OUTPUT_DIRECTORY),
    promptSha256: sha256(promptBytes),
    videoSha256: sha256(videoBytes),
  }));
};

const buildCandidates = async (): Promise<void> => {
  const selectionPromptPath = path.join(OUTPUT_DIRECTORY, SELECTION_PROMPT_NAME);
  const selectionManifestPath = path.join(OUTPUT_DIRECTORY, SELECTION_MANIFEST_NAME);
  const classificationManifestPath = path.join(
    OUTPUT_DIRECTORY,
    CLASSIFICATION_MANIFEST_NAME,
  );
  const classificationManifestResult = await readJsonFile(
    classificationManifestPath,
    '種類判別package manifest',
  );
  const requestPackage = recordFrom(
    classificationManifestResult.value.requestPackage,
    'classification manifest.requestPackage',
  );
  const preparedVideoBinding = recordFrom(
    requestPackage.video,
    'classification manifest.requestPackage.video',
  );
  const preparedPromptBinding = recordFrom(
    requestPackage.prompt,
    'classification manifest.requestPackage.prompt',
  );
  const preparedPromptPath = path.join(
    OUTPUT_DIRECTORY,
    stringFrom(preparedPromptBinding.path, 'classification manifest.prompt.path'),
  );
  const preparedVideoPath = path.join(
    OUTPUT_DIRECTORY,
    stringFrom(preparedVideoBinding.path, 'classification manifest.video.path'),
  );
  const [preparedPromptBytes, preparedVideoBytes] = await Promise.all([
    readFile(preparedPromptPath),
    readFile(preparedVideoPath),
  ]);
  if (
    sha256(preparedPromptBytes)
    !== stringFrom(
      preparedPromptBinding.fileSha256,
      'classification manifest.prompt.fileSha256',
    )
  ) {
    throw new Error('種類判別promptのSHAがprepare時の記録と一致しません');
  }
  if (
    sha256(preparedVideoBytes)
    !== stringFrom(
      preparedVideoBinding.fileSha256,
      'classification manifest.video.fileSha256',
    )
  ) {
    throw new Error('種類判別用映像のSHAがprepare時の記録と一致しません');
  }

  const inputs = await loadInputs();
  const sourceProbe = await probeMedia(inputs.baseMediaPath);
  const classification = await loadClassification();
  const classificationObservation = await loadWebObservation({
    filePath: path.join(OUTPUT_DIRECTORY, CLASSIFICATION_OBSERVATION_NAME),
    stage: 'classification',
    expectedInputs: [
      {
        path: stringFrom(preparedPromptBinding.path, 'classification manifest.prompt.path'),
        fileSha256: sha256(preparedPromptBytes),
      },
      {
        path: stringFrom(preparedVideoBinding.path, 'classification manifest.video.path'),
        fileSha256: sha256(preparedVideoBytes),
      },
    ],
    response: {
      path: CLASSIFICATION_RESPONSE_NAME,
      fileSha256: sha256(classification.bytes),
    },
  });
  const candidateImagePaths = classification.candidateSet.candidates.map((candidate) => {
    if (!/^[a-z0-9_]+$/.test(candidate.id)) {
      throw new Error(`候補IDを安全なfile名にできません: ${candidate.id}`);
    }
    return path.join(OUTPUT_DIRECTORY, `crop-candidate-${candidate.id}.jpg`);
  });
  await assertTargetsAbsent(
    [selectionPromptPath, selectionManifestPath, ...candidateImagePaths],
    '--build-candidates',
  );

  const previewSecond = sourceProbe.durationSeconds / 2;
  const previewBindings: Array<{
    candidateId: string;
    label: string;
    reason: string;
    path: string;
    fileSha256: string;
    byteLength: number;
  }> = [];
  for (const [index, candidate] of classification.candidateSet.candidates.entries()) {
    const selected = selectScreenLayoutCandidate(
      classification.candidateSet,
      candidate.id,
      `crop candidate ${candidate.id}`,
    );
    const outputLabel = `type_crop_candidate_${index}`;
    const layoutFilter = buildLayoutVideoFilter({
      inputLabel: '[type_crop_preview_source]',
      outputLabel,
      sourceWidth: sourceProbe.width,
      sourceHeight: sourceProbe.height,
      durationSeconds: 0.2,
      screenLayout: selected,
    });
    const filter =
      `[0:v]trim=start=${previewSecond.toFixed(6)}:duration=0.2,` +
      `setpts=PTS-STARTPTS[type_crop_preview_source];${layoutFilter}`;
    const imagePath = candidateImagePaths[index];
    await run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-n',
      '-i',
      inputs.baseMediaPath,
      '-filter_complex',
      filter,
      '-map',
      `[${outputLabel}]`,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      imagePath,
    ]);
    const bytes = await readFile(imagePath);
    previewBindings.push({
      candidateId: candidate.id,
      label: candidate.label,
      reason: candidate.reason,
      path: path.basename(imagePath),
      fileSha256: sha256(bytes),
      byteLength: bytes.byteLength,
    });
  }

  const candidateDraft = buildCandidateDraft(
    classification.rawSegment,
    classification.candidateSet,
  );
  const selectionPrompt = buildGeminiCandidateSelectionPrompt(
    inputs.composition,
    candidateDraft,
  );
  await writeNewFile(selectionPromptPath, selectionPrompt);
  const selectionPromptBytes = await readFile(selectionPromptPath);
  if (selectionPromptBytes.toString('utf8') !== selectionPrompt) {
    throw new Error('保存した候補選択promptが生成byteと一致しません');
  }

  const manifest = {
    schemaVersion: 'vertical-preset-type-crop-selection-package-v006',
    mode: 'build-candidates',
    externalApiCallsByThisScript: 0,
    retryCount: 0,
    classification: {
      responsePath: CLASSIFICATION_RESPONSE_NAME,
      responseFileSha256: sha256(classification.bytes),
      screenLayoutId: classification.candidateSet.screenLayoutId,
      classificationReason: classification.candidateSet.classificationReason,
      candidateSetCanonicalSha256: sha256(stableJson(classification.candidateSet)),
      webObservation: {
        path: CLASSIFICATION_OBSERVATION_NAME,
        fileSha256: sha256(classificationObservation.bytes),
        observer: 'gemini-web',
        modelLabel: classificationObservation.modelLabel,
        observedAt: classificationObservation.observedAt,
      },
    },
    sourceMedia: {
      path: relativeWorkspacePath(inputs.baseMediaPath),
      fileSha256: sha256(inputs.baseMediaBytes),
      previewSecond,
    },
    requestPackage: {
      prompt: {
        path: SELECTION_PROMPT_NAME,
        fileSha256: sha256(selectionPromptBytes),
        byteLength: selectionPromptBytes.byteLength,
      },
      images: previewBindings,
      contentsOrder: [
        'prompt',
        ...previewBindings.flatMap((binding) => [
          `candidate-label:${binding.candidateId}`,
          `candidate-image:${binding.candidateId}`,
        ]),
      ],
      expectedPlainJsonResponsePath: SELECTION_RESPONSE_NAME,
      expectedWebObservationPath: SELECTION_OBSERVATION_NAME,
      responseHandling: 'JSON.parse of exact saved bytes; no trim, fence removal, or repair',
    },
    selectionContract: {
      selectionIsNotHardcodedByThisPackage: true,
      acceptedIds: classification.candidateSet.candidates.map((candidate) => candidate.id),
      canonicalSelector:
        'selectScreenLayoutCandidate from runner/src/screen-layout.ts',
    },
    prepareManifest: {
      path: CLASSIFICATION_MANIFEST_NAME,
      fileSha256: sha256(classificationManifestResult.bytes),
    },
  };
  await writeNewFile(selectionManifestPath, formattedJson(manifest));
  console.log(JSON.stringify({
    status: 'candidates-built',
    externalApiCallsByThisScript: 0,
    screenLayoutId: classification.candidateSet.screenLayoutId,
    classificationReason: classification.candidateSet.classificationReason,
    candidateCount: classification.candidateSet.candidates.length,
    outputDirectory: relativeWorkspacePath(OUTPUT_DIRECTORY),
  }));
};

const finalize = async (): Promise<void> => {
  const decisionPath = path.join(OUTPUT_DIRECTORY, CROP_DECISION_NAME);
  await assertTargetsAbsent([decisionPath], '--finalize');
  const [
    classification,
    selectionManifestResult,
    selectionResponseResult,
  ] = await Promise.all([
    loadClassification(),
    readJsonFile(
      path.join(OUTPUT_DIRECTORY, SELECTION_MANIFEST_NAME),
      '候補選択package manifest',
    ),
    readJsonFile(
      path.join(OUTPUT_DIRECTORY, SELECTION_RESPONSE_NAME),
      '候補選択のplain JSON応答',
    ),
  ]);
  const classificationBinding = recordFrom(
    selectionManifestResult.value.classification,
    'selection manifest.classification',
  );
  if (
    sha256(classification.bytes)
    !== stringFrom(
      classificationBinding.responseFileSha256,
      'selection manifest.classification.responseFileSha256',
    )
  ) {
    throw new Error('種類判別応答のSHAが候補生成時の記録と一致しません');
  }
  if (
    sha256(stableJson(classification.candidateSet))
    !== stringFrom(
      classificationBinding.candidateSetCanonicalSha256,
      'selection manifest.classification.candidateSetCanonicalSha256',
    )
  ) {
    throw new Error('候補集合が候補生成時の記録と一致しません');
  }

  const requestPackage = recordFrom(
    selectionManifestResult.value.requestPackage,
    'selection manifest.requestPackage',
  );
  const imageBindings = arrayFrom(
    requestPackage.images,
    'selection manifest.requestPackage.images',
  );
  const promptBinding = recordFrom(
    requestPackage.prompt,
    'selection manifest.requestPackage.prompt',
  );
  const promptBytes = await readFile(path.join(
    OUTPUT_DIRECTORY,
    stringFrom(promptBinding.path, 'selection manifest.prompt.path'),
  ));
  if (
    sha256(promptBytes)
    !== stringFrom(
      promptBinding.fileSha256,
      'selection manifest.prompt.fileSha256',
    )
  ) {
    throw new Error('候補選択promptのSHAが候補生成時の記録と一致しません');
  }
  const selectionExpectedInputs = [{
    path: stringFrom(promptBinding.path, 'selection manifest.prompt.path'),
    fileSha256: sha256(promptBytes),
  }];
  if (imageBindings.length !== classification.candidateSet.candidates.length) {
    throw new Error('候補画像の件数がcanonical候補集合と一致しません');
  }
  for (const [index, bindingValue] of imageBindings.entries()) {
    const binding = recordFrom(bindingValue, `selection manifest.images[${index}]`);
    const canonicalCandidate = classification.candidateSet.candidates[index];
    if (
      !canonicalCandidate
      || stringFrom(
        binding.candidateId,
        `selection manifest.images[${index}].candidateId`,
      ) !== canonicalCandidate.id
    ) {
      throw new Error(`候補画像${index + 1}のIDまたは順序がcanonical候補集合と一致しません`);
    }
    const imagePath = path.join(
      OUTPUT_DIRECTORY,
      stringFrom(binding.path, `selection manifest.images[${index}].path`),
    );
    const bytes = await readFile(imagePath);
    if (
      sha256(bytes)
      !== stringFrom(
        binding.fileSha256,
        `selection manifest.images[${index}].fileSha256`,
      )
    ) {
      throw new Error(`候補画像${index + 1}のSHAが候補生成時の記録と一致しません`);
    }
    selectionExpectedInputs.push({
      path: stringFrom(binding.path, `selection manifest.images[${index}].path`),
      fileSha256: sha256(bytes),
    });
  }
  const selectionObservation = await loadWebObservation({
    filePath: path.join(OUTPUT_DIRECTORY, SELECTION_OBSERVATION_NAME),
    stage: 'selection',
    expectedInputs: selectionExpectedInputs,
    response: {
      path: SELECTION_RESPONSE_NAME,
      fileSha256: sha256(selectionResponseResult.bytes),
    },
  });

  const selections = arrayFrom(
    selectionResponseResult.value.renderSegments,
    'selection response.renderSegments',
  );
  if (selections.length !== 1) {
    throw new Error(`候補選択応答の断片数が1ではありません: ${selections.length}`);
  }
  const selection = recordFrom(selections[0], 'selection response.renderSegments[0]');
  const selectedCandidateId = stringFrom(
    selection.selectedCandidateId,
    'selection response.selectedCandidateId',
  );
  const selectionReason = selection.reason === undefined
    ? undefined
    : stringFrom(selection.reason, 'selection response.reason');
  const selectedPlan = selectScreenLayoutCandidate(
    classification.candidateSet,
    selectedCandidateId,
    'selection response.renderSegments[0]',
    selectionReason,
  );

  const decision = {
    schemaVersion: 'vertical-preset-type-crop-decision-v006',
    status: 'passed',
    externalApiCallsByThisScript: 0,
    classification: {
      responsePath: CLASSIFICATION_RESPONSE_NAME,
      responseFileSha256: sha256(classification.bytes),
      screenLayoutId: classification.candidateSet.screenLayoutId,
      classificationReason: classification.candidateSet.classificationReason,
      candidateSetCanonicalSha256: sha256(stableJson(classification.candidateSet)),
    },
    selection: {
      responsePath: SELECTION_RESPONSE_NAME,
      responseFileSha256: sha256(selectionResponseResult.bytes),
      selectedCandidateId,
      reason: selectionReason ?? null,
    },
    selectedPlan,
    provenance: {
      classificationWebObservation: recordFrom(
        classificationBinding.webObservation,
        'selection manifest.classification.webObservation',
      ),
      selectionWebObservation: {
        path: SELECTION_OBSERVATION_NAME,
        fileSha256: sha256(selectionObservation.bytes),
        observer: 'gemini-web',
        modelLabel: selectionObservation.modelLabel,
        observedAt: selectionObservation.observedAt,
      },
      selectionPackageManifest: {
        path: SELECTION_MANIFEST_NAME,
        fileSha256: sha256(selectionManifestResult.bytes),
      },
      canonicalSelector:
        'selectScreenLayoutCandidate from runner/src/screen-layout.ts',
    },
  };
  await writeNewFile(decisionPath, formattedJson(decision));
  console.log(JSON.stringify({
    status: 'finalized',
    externalApiCallsByThisScript: 0,
    screenLayoutId: selectedPlan.screenLayoutId,
    selectedCandidateId: selectedPlan.selectedCandidateId,
    decisionPath: relativeWorkspacePath(decisionPath),
    decisionSha256: sha256(formattedJson(decision)),
  }));
};

const main = async (): Promise<void> => {
  const modes = [
    process.argv.includes('--prepare') ? '--prepare' : null,
    process.argv.includes('--build-candidates') ? '--build-candidates' : null,
    process.argv.includes('--finalize') ? '--finalize' : null,
  ].filter((value): value is string => value !== null);
  if (modes.length !== 1) {
    throw new Error(
      '実行modeを1つだけ指定してください: --prepare | --build-candidates | --finalize',
    );
  }
  if (process.argv.some((argument) => argument.startsWith('http://') || argument.startsWith('https://'))) {
    throw new Error('このscriptはnetwork URLを受け付けません');
  }

  if (modes[0] === '--prepare') {
    await prepare();
    return;
  }
  if (modes[0] === '--build-candidates') {
    await buildCandidates();
    return;
  }
  await finalize();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

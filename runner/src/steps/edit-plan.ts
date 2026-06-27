import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Part } from '@google/genai';
import {
  recordValue as recordFrom,
  type AgentRequest,
  type Zev2State
} from '@zev2/shared';
import {
  buildDefaultScreenLayoutPlan,
  buildLayoutVideoFilter,
  buildScreenLayoutCandidateSetFromGemini,
  selectScreenLayoutCandidate,
  type ShortsScreenLayoutCandidateSet,
  type ShortsScreenLayoutPlan
} from '../screen-layout.js';
import { speechIdsFromGeminiRequired } from '../gemini-speech-ids.js';
import {
  buildTelopPlanFromSpeechUnits,
  joinTelopSpeechText,
  millisecondsToSeconds,
  uniqueSpeechIds
} from '../transcript-utils.js';
import type { ClipCompositionArtifact, EditPlanArtifact, SpeechTimingRef } from '../workflow-artifacts.js';

export type BuildEditPlanArtifactContext = {
  useFixedEditPlan: boolean;
  hasGeminiApiConnection: boolean;
  ffmpegCommand: string;
  requestArtifactDir: (request: AgentRequest) => string;
  resolveSourceVideoPath: (state: Zev2State, request: AgentRequest) => string | undefined;
  runCommand: (command: string, args: string[]) => Promise<void>;
  probeVideoDimensions: (sourcePath: string) => Promise<{ width: number; height: number }>;
  generateGeminiJsonContent: (
    request: AgentRequest,
    parts: Part[],
    responseFileName: string,
    actionLabel: string
  ) => Promise<unknown>;
  extractGeminiResponseText: (responseJson: unknown) => string;
  parseGeminiJsonText: (text: string, label: string) => unknown;
};

type GeminiEditPlanResponse = {
  title?: unknown;
  hookText?: unknown;
  renderSegments?: unknown;
  telopPlan?: unknown;
};

type GeminiCandidateSelectionResponse = {
  renderSegments?: unknown;
};

type CandidateEditPlanArtifact = {
  editPlan: EditPlanArtifact;
  candidateSets: ShortsScreenLayoutCandidateSet[];
};

type GeminiVideoClipInput = {
  sourceStartMs: number;
  sourceEndMs: number;
  role: string;
  transcriptText: string;
  speechUnits: SpeechTimingRef[];
  path: string;
  data: string;
};

type CandidatePreviewInput = {
  segmentIndex: number;
  candidateId: string;
  candidateLabel: string;
  candidateReason: string;
  path: string;
  data: string;
};

function isSampleRequest(request: AgentRequest): boolean {
  return request.target.sourceUri.startsWith('zev-sample://');
}

function buildFixtureEditPlan(
  composition: ClipCompositionArtifact,
  screenLayoutForPart?: (part: ClipCompositionArtifact['parts'][number], index: number) => ShortsScreenLayoutPlan
): EditPlanArtifact {
  if (composition.parts.length === 0) {
    throw new Error('編集案に使える構成箇所がありません');
  }

  const firstPart = composition.parts[0];
  const lastPart = composition.parts[composition.parts.length - 1] ?? firstPart;
  return {
    kind: 'edit_plan_json',
    mode: 'sample-edit-plan',
    generatedAt: new Date().toISOString(),
    selectedThemeId: composition.selectedThemeId,
    title: composition.title,
    hookText: firstPart.transcriptText.slice(0, 32),
    sourceStartMs: firstPart.sourceStartMs,
    sourceEndMs: lastPart.sourceEndMs,
    geminiApiInput: composition.parts.map((part) => ({
      sourceUri: composition.sourceUri,
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      purpose: `${part.role}: ${part.connectionNote}`
    })),
    renderSegments: composition.parts.map((part, index) => ({
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      role: part.role,
      caption: part.transcriptText.slice(0, 32),
      speechIds: part.speechIds,
      speechUnits: part.speechUnits,
      screenLayout: screenLayoutForPart?.(part, index) ?? buildDefaultScreenLayoutPlan()
    })),
    telopPlan: composition.parts.flatMap((part) => (
      buildTelopPlanFromSpeechUnits(part.speechUnits, part.role)
    ))
  };
}

function speechUnitsForTelopIds(
  renderSegments: EditPlanArtifact['renderSegments'],
  sourceSpeechIds: number[]
): SpeechTimingRef[] {
  const speechById = new Map<number, SpeechTimingRef>();
  for (const segment of renderSegments) {
    for (const speech of segment.speechUnits) {
      if (!speechById.has(speech.id)) {
        speechById.set(speech.id, speech);
      }
    }
  }

  return uniqueSpeechIds(sourceSpeechIds)
    .map((speechId) => speechById.get(speechId))
    .filter((speech): speech is SpeechTimingRef => Boolean(speech))
    .sort((left, right) => left.sourceStartMs - right.sourceStartMs);
}

function normalizeGeminiTelopPlan(
  telopPlan: EditPlanArtifact['telopPlan'],
  renderSegments: EditPlanArtifact['renderSegments']
): EditPlanArtifact['telopPlan'] {
  const normalized = telopPlan.map((telop, index) => {
    const speechUnits = speechUnitsForTelopIds(renderSegments, telop.sourceSpeechIds);
    if (speechUnits.length !== uniqueSpeechIds(telop.sourceSpeechIds).length) {
      throw new Error(`Gemini APIのテロップ案 ${index + 1} 件目に存在しない発話IDがあります`);
    }
    if (speechUnits.length < 2) {
      throw new Error(`Gemini APIのテロップ案 ${index + 1} 件目は、表示文に対応する複数の発話IDが必要です`);
    }

    const text = telop.text.trim() || joinTelopSpeechText(speechUnits);
    if (!text) {
      throw new Error(`Gemini APIのテロップ案 ${index + 1} 件目の表示文が空です`);
    }

    return {
      sourceSpeechIds: speechUnits.map((speech) => speech.id),
      text,
      role: telop.role.trim() || 'テロップ'
    };
  }).sort((left, right) => {
    const leftFirst = speechUnitsForTelopIds(renderSegments, left.sourceSpeechIds)[0];
    const rightFirst = speechUnitsForTelopIds(renderSegments, right.sourceSpeechIds)[0];
    return (leftFirst?.sourceStartMs ?? 0) - (rightFirst?.sourceStartMs ?? 0);
  });

  if (normalized.length === 0) {
    throw new Error('Gemini APIのテロップ案がありません');
  }

  return normalized;
}

function sampleScreenLayoutPlanForPart(index: number): ShortsScreenLayoutPlan {
  const rawSegment = {
    screenLayoutId: 'screen_speaker',
    detections: {
      screen: [140, 25, 875, 575],
      speaker: {
        face: [350, 710, 570, 840],
        body: [120, 590, 1000, 980]
      }
    }
  };
  const selectedCandidateId = index === 0 ? 'screen_speaker_body' : 'screen_speaker_face';
  const candidateSet = buildScreenLayoutCandidateSetFromGemini(rawSegment, `zev-sample.layout[${index + 1}]`);
  return selectScreenLayoutCandidate(
    candidateSet,
    selectedCandidateId,
    `zev-sample.layout[${index + 1}]`,
    '確認用サンプル素材でGemini API確認済みの表示枠を使う'
  );
}

function screenLayoutForFixtureSource(
  request: AgentRequest
): ((part: ClipCompositionArtifact['parts'][number], index: number) => ShortsScreenLayoutPlan) | undefined {
  if (request.target.sourceUri === 'zev-sample://speech-id-timing') {
    return (_part, index) => sampleScreenLayoutPlanForPart(index);
  }

  return undefined;
}

async function buildGeminiVideoClipInputs(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State,
  context: BuildEditPlanArtifactContext
): Promise<GeminiVideoClipInput[]> {
  const sourcePath = context.resolveSourceVideoPath(state, request);
  if (!sourcePath) {
    return [];
  }

  const directory = context.requestArtifactDir(request);
  await mkdir(directory, { recursive: true });

  const clips: GeminiVideoClipInput[] = [];
  for (const [index, part] of composition.parts.entries()) {
    const durationMs = Math.max(1, part.sourceEndMs - part.sourceStartMs);
    const clipPath = path.join(directory, `gemini-part-${index + 1}.mp4`);
    await context.runCommand(context.ffmpegCommand, [
      '-y',
      '-ss',
      millisecondsToSeconds(part.sourceStartMs),
      '-t',
      millisecondsToSeconds(durationMs),
      '-i',
      sourcePath,
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
      clipPath
    ]);

    const data = (await readFile(clipPath)).toString('base64');
    clips.push({
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      role: part.role,
      transcriptText: part.transcriptText,
      speechUnits: part.speechUnits,
      path: clipPath,
      data
    });
  }

  return clips;
}

function buildGeminiEditPlanPrompt(composition: ClipCompositionArtifact, request: AgentRequest): string {
  const partsText = composition.parts
    .map((part, index) => {
      const speechLines = part.speechUnits
        .map((speech) => (
          `  - 発話ID ${speech.id}: ${millisecondsToSeconds(speech.sourceStartMs)}秒 - ${millisecondsToSeconds(speech.sourceEndMs)}秒 / ${speech.text}`
        ))
        .join('\n');
      return [
        `断片${index + 1}`,
        `役割: ${part.role}`,
        `元動画時間: ${millisecondsToSeconds(part.sourceStartMs)}秒 - ${millisecondsToSeconds(part.sourceEndMs)}秒`,
        `使用する発話ID: ${part.speechIds.join(', ')}`,
        `文字起こし: ${part.transcriptText}`,
        '発話:',
        speechLines
      ].join('\n');
    })
    .join('\n\n');

  return [
    '複数の動画断片と文字起こしを見て、ショート動画の演出に必要な検出結果を作ってください。',
    '候補選定は済んでいます。断片の順番と時間範囲は変えず、各断片の画面パターン、表示対象の検出範囲、テロップを決めてください。',
    '最終的な切り出し位置はAIエージェント側で候補化します。ここでは候補選択やcrop座標を返さないでください。',
    '画面パターンと検出範囲は添付動画を直接見て判断してください。文字起こしだけを根拠にした推測は禁止です。',
    'テロップの表示タイミングは時間で指定しないでください。LLMは時間指定を間違えやすいため、必ず下の発話IDで指定してください。',
    'telopPlan.sourceSpeechIds には、そのテロップが対応する発話IDだけを入れてください。存在しない発話ID、元動画秒数、atMs は返さないでください。',
    'テロップの区切りは文脈を読んで決めてください。プログラム側では日本語の文節推定や例外処理で直しません。',
    '文章の途中、語の途中、不自然な接続語だけで切らないでください。',
    '1テロップには、表示文に対応する連続した複数の発話IDを入れてください。1 IDだけ、断片全体1件、時刻指定は禁止です。',
    'JSONだけを返してください。',
    '',
    '画面枠:',
    '- speaker_only: 話者1人だけ。話者を縦長の画面全体に表示する。',
    '- screen_speaker: 画面と話者。上に画面、下に話者を横長の2枠で表示する。',
    '- speaker_pair: 話者2人。話者1を上、話者2を下に横長の2枠で表示する。',
    '',
    'detections:',
    '- 座標は [ymin, xmin, ymax, xmax] の順で、0..1000 の整数にしてください。',
    '- screen は、その断片で見えている画面全体です。',
    '- speaker / speaker1 / speaker2 は face と body を返してください。',
    '- face は顔全体、body は見えている人物全体です。face は必ず body の内側に収めてください。',
    '- speaker_only では speaker を返してください。',
    '- screen_speaker では screen と speaker を返してください。',
    '- speaker_pair では speaker1 と speaker2 を返してください。',
    '- final crop と selectedCandidateId は返さないでください。AIエージェントが検出結果から表示候補を作ります。',
    '',
    '返すJSON:',
    '{',
    '  "title": "動画の完成イメージを表す短いタイトル",',
    '  "hookText": "冒頭で見せる短い文言",',
    '  "renderSegments": [',
    '    {',
    '      "role": "断片の役割",',
    '      "caption": "断片に出す短いテロップ",',
    '      "screenLayoutId": "screen_speaker",',
    '      "detections": {',
    '        "screen": [0, 0, 1000, 1000],',
    '        "speaker": { "face": [0, 0, 300, 300], "body": [0, 0, 1000, 1000] }',
    '      }',
    '    }',
    '  ],',
    '  "telopPlan": [',
    '    { "sourceSpeechIds": [1, 2, 3], "text": "表示するテロップ", "role": "表示意図" }',
    '  ]',
    '}',
    '',
    `依頼目的: ${request.input.purpose}`,
    `テーマ: ${composition.title}`,
    `完成イメージ: ${composition.themeSummary}`,
    '',
    partsText
  ].join('\n');
}

function applyGeminiEditPlanResponse(
  basePlan: EditPlanArtifact,
  response: GeminiEditPlanResponse
): CandidateEditPlanArtifact {
  const renderSegmentRecords = Array.isArray(response.renderSegments)
    ? response.renderSegments.map(recordFrom)
    : [];
  const telopRecords = Array.isArray(response.telopPlan)
    ? response.telopPlan.map(recordFrom)
    : [];
  const knownSpeechIds = new Set(basePlan.renderSegments.flatMap((segment) => segment.speechIds));

  if (renderSegmentRecords.length !== basePlan.renderSegments.length) {
    throw new Error('Gemini APIの演出案で、動画断片ごとの画面表示計画が不足しています');
  }
  if (telopRecords.length === 0) {
    throw new Error('Gemini APIの演出案に、発話ID付きのテロップ案がありません');
  }

  const candidateSets: ShortsScreenLayoutCandidateSet[] = [];
  const renderSegments = basePlan.renderSegments.map((segment, index) => {
    const proposed = renderSegmentRecords[index] ?? {};
    const candidateSet = buildScreenLayoutCandidateSetFromGemini(proposed, `renderSegments[${index + 1}]`);
    candidateSets.push(candidateSet);
    return {
      ...segment,
      role: typeof proposed.role === 'string' && proposed.role.trim() ? proposed.role.trim() : segment.role,
      caption: typeof proposed.caption === 'string' && proposed.caption.trim() ? proposed.caption.trim().slice(0, 48) : segment.caption,
      screenLayout: selectScreenLayoutCandidate(candidateSet, undefined, `renderSegments[${index + 1}]`)
    };
  });

  const rawTelopPlan = telopRecords.map((record, index) => {
    const label = `Gemini APIのテロップ案 ${index + 1} 件目`;
    const sourceSpeechIds = speechIdsFromGeminiRequired(record.sourceSpeechIds, knownSpeechIds, label);
    if (sourceSpeechIds.length < 2) {
      throw new Error(`${label}は、表示文に対応する複数の発話IDが必要です`);
    }

    return {
      sourceSpeechIds,
      text: typeof record.text === 'string' && record.text.trim() ? record.text.trim() : '',
      role: typeof record.role === 'string' && record.role.trim() ? record.role.trim() : 'テロップ'
    };
  });
  const telopPlan = normalizeGeminiTelopPlan(rawTelopPlan, renderSegments);

  return {
    editPlan: {
      ...basePlan,
      mode: 'gemini-api-edit-plan',
      title: typeof response.title === 'string' && response.title.trim() ? response.title.trim() : basePlan.title,
      hookText: typeof response.hookText === 'string' && response.hookText.trim() ? response.hookText.trim().slice(0, 48) : basePlan.hookText,
      renderSegments,
      telopPlan
    },
    candidateSets
  };
}

async function buildCandidatePreviewInputs(
  request: AgentRequest,
  clips: GeminiVideoClipInput[],
  candidateDraft: CandidateEditPlanArtifact,
  context: BuildEditPlanArtifactContext
): Promise<CandidatePreviewInput[]> {
  const directory = context.requestArtifactDir(request);
  await mkdir(directory, { recursive: true });

  const previews: CandidatePreviewInput[] = [];
  for (const [segmentIndex, candidateSet] of candidateDraft.candidateSets.entries()) {
    const clip = clips[segmentIndex];
    if (!clip) {
      throw new Error(`表示候補プレビューに使う動画断片${segmentIndex + 1}がありません`);
    }

    const clipDimensions = await context.probeVideoDimensions(clip.path);
    const midpointSeconds = Math.max(0, (clip.sourceEndMs - clip.sourceStartMs) / 2000);
    for (const candidate of candidateSet.candidates) {
      const screenLayout = selectScreenLayoutCandidate(
        candidateSet,
        candidate.id,
        `renderSegments[${segmentIndex + 1}].${candidate.id}`
      );
      const outputLabel = `candidate_${segmentIndex + 1}_${candidate.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const filter = buildLayoutVideoFilter({
        inputLabel: '[0:v]',
        outputLabel,
        sourceWidth: clipDimensions.width,
        sourceHeight: clipDimensions.height,
        durationSeconds: 0.2,
        screenLayout
      });
      const previewPath = path.join(directory, `candidate-preview-${segmentIndex + 1}-${candidate.id}.jpg`);
      await context.runCommand(context.ffmpegCommand, [
        '-y',
        '-ss',
        midpointSeconds.toFixed(3),
        '-i',
        clip.path,
        '-filter_complex',
        filter,
        '-map',
        `[${outputLabel}]`,
        '-frames:v',
        '1',
        '-q:v',
        '5',
        '-update',
        '1',
        previewPath
      ]);

      previews.push({
        segmentIndex,
        candidateId: candidate.id,
        candidateLabel: candidate.label,
        candidateReason: candidate.reason,
        path: previewPath,
        data: (await readFile(previewPath)).toString('base64')
      });
    }
  }

  return previews;
}

function buildGeminiCandidateSelectionPrompt(
  composition: ClipCompositionArtifact,
  candidateDraft: CandidateEditPlanArtifact
): string {
  const segmentText = candidateDraft.editPlan.renderSegments
    .map((segment, index) => {
      const candidateSet = candidateDraft.candidateSets[index];
      const candidates = candidateSet.candidates
        .map((candidate) => `  - ${candidate.id}: ${candidate.label} / ${candidate.reason}`)
        .join('\n');
      return [
        `断片${index + 1}`,
        `役割: ${segment.role}`,
        `テロップ: ${segment.caption}`,
        `画面パターン: ${candidateSet.displaySummary}`,
        '候補:',
        candidates
      ].join('\n');
    })
    .join('\n\n');

  return [
    'AIエージェントが、検出結果から最低条件を満たす表示候補を作りました。',
    '各候補画像を見て、断片ごとに一番自然に見える候補IDだけを選んでください。',
    '座標や新しい候補は作らないでください。必ず候補一覧にある selectedCandidateId を返してください。',
    '判断基準は、顔が自然に見えること、画面情報が読めること、話の内容に対して主役が分かりやすいことです。',
    'JSONだけを返してください。',
    '',
    '返すJSON:',
    '{',
    '  "renderSegments": [',
    '    { "selectedCandidateId": "候補ID", "reason": "その候補を選んだ短い理由" }',
    '  ]',
    '}',
    '',
    `テーマ: ${composition.title}`,
    `完成イメージ: ${composition.themeSummary}`,
    '',
    segmentText
  ].join('\n');
}

function applyGeminiCandidateSelectionResponse(
  candidateDraft: CandidateEditPlanArtifact,
  response: GeminiCandidateSelectionResponse
): EditPlanArtifact {
  const selectionRecords = Array.isArray(response.renderSegments)
    ? response.renderSegments.map(recordFrom)
    : [];
  if (selectionRecords.length !== candidateDraft.editPlan.renderSegments.length) {
    throw new Error('Gemini APIの候補選択で、動画断片ごとの選択結果が不足しています');
  }

  return {
    ...candidateDraft.editPlan,
    renderSegments: candidateDraft.editPlan.renderSegments.map((segment, index) => {
      const record = selectionRecords[index] ?? {};
      const selectedCandidateId = typeof record.selectedCandidateId === 'string'
        ? record.selectedCandidateId.trim()
        : '';
      const selectionReason = typeof record.reason === 'string' && record.reason.trim()
        ? record.reason.trim()
        : undefined;

      return {
        ...segment,
        screenLayout: selectScreenLayoutCandidate(
          candidateDraft.candidateSets[index],
          selectedCandidateId,
          `renderSegments[${index + 1}]`,
          selectionReason
        )
      };
    })
  };
}

async function callGeminiCandidateSelectionApi(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  clips: GeminiVideoClipInput[],
  candidateDraft: CandidateEditPlanArtifact,
  context: BuildEditPlanArtifactContext
): Promise<EditPlanArtifact> {
  const previews = await buildCandidatePreviewInputs(request, clips, candidateDraft, context);
  const parts: Part[] = [{ text: buildGeminiCandidateSelectionPrompt(composition, candidateDraft) }];
  for (const preview of previews) {
    parts.push({
      text: [
        `断片${preview.segmentIndex + 1}`,
        `候補ID: ${preview.candidateId}`,
        `候補名: ${preview.candidateLabel}`,
        `候補の意味: ${preview.candidateReason}`
      ].join('\n')
    });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: preview.data
      }
    });
  }

  const responseJson = await context.generateGeminiJsonContent(request, parts, 'gemini-layout-candidate-response.json', '表示候補選択');
  const selectionText = context.extractGeminiResponseText(responseJson);
  return applyGeminiCandidateSelectionResponse(
    candidateDraft,
    context.parseGeminiJsonText(selectionText, 'Gemini APIの表示候補選択') as GeminiCandidateSelectionResponse
  );
}

async function callGeminiEditPlanApi(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State,
  basePlan: EditPlanArtifact,
  context: BuildEditPlanArtifactContext
): Promise<EditPlanArtifact> {
  const clips = await buildGeminiVideoClipInputs(request, composition, state, context);
  if (clips.length === 0) {
    throw new Error('演出作成に使う動画断片を作れません');
  }

  const parts: Part[] = [{ text: buildGeminiEditPlanPrompt(composition, request) }];
  for (const [index, clip] of clips.entries()) {
    parts.push({
      text: [
        `動画断片${index + 1}`,
        `役割: ${clip.role}`,
        `元動画時間: ${millisecondsToSeconds(clip.sourceStartMs)}秒 - ${millisecondsToSeconds(clip.sourceEndMs)}秒`,
        `使用する発話ID: ${clip.speechUnits.map((speech) => speech.id).join(', ')}`,
        `文字起こし: ${clip.transcriptText}`
      ].join('\n')
    });
    parts.push({
      inlineData: {
        mimeType: 'video/mp4',
        data: clip.data
      }
    });
  }

  const responseJson = await context.generateGeminiJsonContent(request, parts, 'gemini-edit-plan-response.json', '演出案作成');
  const planText = context.extractGeminiResponseText(responseJson);
  const candidateDraft = applyGeminiEditPlanResponse(
    basePlan,
    context.parseGeminiJsonText(planText, 'Gemini APIの演出案') as GeminiEditPlanResponse
  );
  return callGeminiCandidateSelectionApi(request, composition, clips, candidateDraft, context);
}

export async function buildEditPlanArtifact(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State,
  context: BuildEditPlanArtifactContext
): Promise<EditPlanArtifact> {
  const basePlan = buildFixtureEditPlan(
    composition,
    screenLayoutForFixtureSource(request)
  );

  if (isSampleRequest(request) || context.useFixedEditPlan) {
    return basePlan;
  }

  if (!context.hasGeminiApiConnection) {
    throw new Error('演出作成に使うGemini APIの接続情報がありません');
  }

  if (!context.resolveSourceVideoPath(state, request)) {
    throw new Error('演出作成に使う動画ファイルを取得できません');
  }

  return callGeminiEditPlanApi(request, composition, state, basePlan, context);
}

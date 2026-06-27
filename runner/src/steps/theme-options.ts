import { readFile } from 'node:fs/promises';
import type { Part } from '@google/genai';
import {
  recordValue as recordFrom,
  type AgentRequest,
  type ControlReference
} from '@zev2/shared';
import { speechIdsFromGemini, speechIdsFromGeminiRequired } from '../gemini-speech-ids.js';
import {
  millisecondsToSeconds,
  segmentTextByIds,
  speechRange,
  uniqueSpeechIds
} from '../transcript-utils.js';
import type { ThemeArtifact, TranscriptArtifact } from '../workflow-artifacts.js';

export type BuildThemeOptionsArtifactContext = {
  fixedThemeOptionsPath: string;
  useFixedThemeOptions: boolean;
  sanitizePathPart: (value: string) => string;
  generateGeminiJsonContent: (
    request: AgentRequest,
    parts: Part[],
    responseFileName: string,
    actionLabel: string
  ) => Promise<unknown>;
  extractGeminiResponseText: (responseJson: unknown) => string;
  parseGeminiJsonText: (text: string, label: string) => unknown;
};

type GeminiThemeResponse = {
  themes?: unknown;
};

function parseCount(label: string): number {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 3;
}

function isSampleRequest(request: AgentRequest): boolean {
  return request.target.sourceUri.startsWith('zev-sample://');
}

function buildSampleThemeOptions(transcript: TranscriptArtifact, request: AgentRequest): ThemeArtifact {
  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const seeds = transcript.themeSeeds ?? [];
  if (seeds.length === 0) {
    throw new Error('テーマ候補の固定データがないため、サンプル用テーマ候補を作れません');
  }

  const themes = seeds.slice(0, requestedCount).map((seed, index) => {
    const themeNumber = index + 1;
    const representativeSpeechIds = uniqueSpeechIds(seed.representativeSpeechIds);
    const relatedSpeechIds = uniqueSpeechIds(seed.relatedSpeechIds);
    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    const summary = seed.summary ?? representativeText.slice(0, 48);

    return {
      id: seed.id ?? `theme_${themeNumber}`,
      title: seed.title ?? `テーマ${themeNumber}: ${summary.slice(0, 18)}`,
      summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds,
      whyItCanBeClipped: seed.reason ?? '文字起こし上で内容のまとまりがあり、切り抜きたいテーマとして選べるため。',
      compositionNote: seed.compositionNote ?? '選ばれた後に、関係する発話を複数集めて構成案にします。',
      evidenceRefs: representativeSpeechIds.map((speechId) => ({
        kind: 'time_range' as const,
        refId: `speech_${speechId}`,
        meaning: `代表発話 ${speechId}`
      }))
    };
  });

  return {
    kind: 'theme_json',
    mode: 'sample-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

function buildTranscriptLinesForThemePrompt(transcript: TranscriptArtifact): string {
  const groups = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : transcript.segments.map((segment) => [segment.id]);

  return groups
    .map((speechIds, index) => {
      const range = speechRange(transcript, speechIds);
      return [
        `発話まとまり${index + 1}`,
        `発話ID: ${speechIds.join(', ')}`,
        `時間: ${millisecondsToSeconds(range.sourceStartMs)}秒 - ${millisecondsToSeconds(range.sourceEndMs)}秒`,
        `本文: ${segmentTextByIds(transcript, speechIds)}`
      ].join('\n');
    })
    .join('\n\n');
}

function buildGeminiThemePrompt(transcript: TranscriptArtifact, request: AgentRequest): string {
  const requestedCount = parseCount(request.constraints.themeCountLabel);

  return [
    '文字起こしを分析し、ショート動画として切り抜けそうなテーマ候補を作ってください。',
    'テーマ候補はユーザーが選ぶ内容単位です。構成案、テロップ案、動画断片名ではありません。',
    '音声、テンション、間、笑い、画面変化、映像の見栄えはここでは使いません。発話内容だけで判断してください。',
    '意味のない反復、歌やBGMの音だけに見える文字列、効果音だけの箇所はテーマ候補にしないでください。',
    '候補同士で同じ内容を返さないでください。',
    '切り抜きテーマとして成立する発話がない場合は themes を空配列にしてください。',
    'テーマが選ばれた後に同じ文字起こしを読み直して複数箇所をつなぐため、代表発話IDと関連発話IDを必ず返してください。',
    '発話IDは下の文字起こしに存在するものだけを使ってください。',
    'JSONだけを返してください。',
    '',
    '返すJSON:',
    '{',
    '  "themes": [',
    '    {',
    '      "id": "theme_1",',
    '      "title": "ユーザーが選びやすい短いテーマ名",',
    '      "summary": "このテーマで何を見せる動画になるか",',
    '      "representativeSpeechIds": [1],',
    '      "relatedSpeechIds": [1, 2, 3],',
    '      "reason": "切り抜きテーマとして成立する理由",',
    '      "compositionNote": "最終的にどんな動画になるか"',
    '    }',
    '  ]',
    '}',
    '',
    `必要な候補数: ${requestedCount}`,
    `依頼目的: ${request.input.purpose}`,
    `希望尺: ${request.constraints.durationLabel}`,
    '',
    '文字起こし:',
    buildTranscriptLinesForThemePrompt(transcript)
  ].join('\n');
}

function themeContentKey(title: string, summary: string, representativeText: string): string {
  return [title, summary, representativeText]
    .map((value) => value.replace(/\s+/g, '').trim())
    .join('\n');
}

function applyGeminiThemeResponse(
  transcript: TranscriptArtifact,
  request: AgentRequest,
  response: GeminiThemeResponse,
  context: BuildThemeOptionsArtifactContext
): ThemeArtifact | undefined {
  if (!Array.isArray(response.themes)) {
    return undefined;
  }

  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const knownIds = new Set(transcript.segments.map((segment) => segment.id));
  const themes: ThemeArtifact['themes'] = [];
  const seenContentKeys = new Set<string>();
  for (const [index, rawTheme] of response.themes.entries()) {
    const theme = recordFrom(rawTheme);
    const representativeSpeechIds = speechIdsFromGemini(theme.representativeSpeechIds, knownIds);
    const relatedSpeechIds = speechIdsFromGemini(theme.relatedSpeechIds, knownIds);
    const normalizedRelatedSpeechIds = relatedSpeechIds.length > 0 ? relatedSpeechIds : representativeSpeechIds;
    if (representativeSpeechIds.length === 0 || normalizedRelatedSpeechIds.length === 0) {
      continue;
    }

    const title = typeof theme.title === 'string' && theme.title.trim()
      ? theme.title.trim()
      : `テーマ ${index + 1}`;
    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    const summary = typeof theme.summary === 'string' && theme.summary.trim()
      ? theme.summary.trim()
      : representativeText;
    const contentKey = themeContentKey(title, summary, representativeText);
    if (seenContentKeys.has(contentKey)) {
      continue;
    }

    seenContentKeys.add(contentKey);

    themes.push({
      id: typeof theme.id === 'string' && theme.id.trim()
        ? context.sanitizePathPart(theme.id.trim())
        : `theme_${index + 1}`,
      title,
      summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds: normalizedRelatedSpeechIds,
      whyItCanBeClipped: typeof theme.reason === 'string' && theme.reason.trim()
        ? theme.reason.trim()
        : '文字起こし上で内容のまとまりがあり、切り抜きテーマとして選べるため。',
      compositionNote: typeof theme.compositionNote === 'string' && theme.compositionNote.trim()
        ? theme.compositionNote.trim()
        : summary,
      evidenceRefs: representativeSpeechIds.map((speechId): ControlReference => ({
        kind: 'time_range',
        refId: `speech_${speechId}`,
        meaning: `代表発話 ${speechId}`
      }))
    });

    if (themes.length >= requestedCount) {
      break;
    }
  }

  if (themes.length === 0) {
    return undefined;
  }

  return {
    kind: 'theme_json',
    mode: 'gemini-api-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

async function callGeminiThemeApi(
  request: AgentRequest,
  transcript: TranscriptArtifact,
  context: BuildThemeOptionsArtifactContext
): Promise<ThemeArtifact> {
  const responseJson = await context.generateGeminiJsonContent(
    request,
    [{ text: buildGeminiThemePrompt(transcript, request) }],
    'gemini-theme-options-response.json',
    'テーマ候補作成'
  );
  const themeText = context.extractGeminiResponseText(responseJson);
  const themeResponse = context.parseGeminiJsonText(themeText, 'Gemini APIのテーマ候補') as GeminiThemeResponse;
  const themeArtifact = applyGeminiThemeResponse(transcript, request, themeResponse, context);
  if (!themeArtifact) {
    throw new Error('Gemini APIのテーマ候補に、ユーザーへ提示できる候補がありません');
  }

  return themeArtifact;
}

async function buildFixedThemeOptionsArtifact(
  transcript: TranscriptArtifact,
  request: AgentRequest,
  context: BuildThemeOptionsArtifactContext
): Promise<ThemeArtifact> {
  const raw = await readFile(context.fixedThemeOptionsPath, 'utf8');
  const record = recordFrom(JSON.parse(raw));
  if (!Array.isArray(record.themes)) {
    throw new Error('固定テーマ候補のデータにテーマ配列がありません');
  }

  const knownIds = new Set(transcript.segments.map((segment) => segment.id));
  const themes = record.themes.map((rawTheme, index) => {
    const theme = recordFrom(rawTheme);
    const representativeSpeechIds = speechIdsFromGeminiRequired(
      theme.representativeSpeechIds,
      knownIds,
      `固定テーマ候補 ${index + 1} 件目の代表発話`
    );
    const relatedSpeechIds = speechIdsFromGeminiRequired(
      theme.relatedSpeechIds,
      knownIds,
      `固定テーマ候補 ${index + 1} 件目の関連発話`
    );

    return {
      id: typeof theme.id === 'string' && theme.id.trim()
        ? context.sanitizePathPart(theme.id.trim())
        : `theme_${index + 1}`,
      title: typeof theme.title === 'string' && theme.title.trim()
        ? theme.title.trim()
        : `テーマ ${index + 1}`,
      summary: typeof theme.summary === 'string' && theme.summary.trim()
        ? theme.summary.trim()
        : segmentTextByIds(transcript, representativeSpeechIds),
      representativeText: typeof theme.representativeText === 'string' && theme.representativeText.trim()
        ? theme.representativeText.trim()
        : segmentTextByIds(transcript, representativeSpeechIds),
      representativeSpeechIds,
      relatedSpeechIds,
      whyItCanBeClipped: typeof theme.whyItCanBeClipped === 'string' && theme.whyItCanBeClipped.trim()
        ? theme.whyItCanBeClipped.trim()
        : '文字起こし上で内容のまとまりがあるため。',
      compositionNote: typeof theme.compositionNote === 'string' && theme.compositionNote.trim()
        ? theme.compositionNote.trim()
        : '関連する発話を複数つないでショート動画にします。',
      evidenceRefs: representativeSpeechIds.map((speechId): ControlReference => ({
        kind: 'time_range',
        refId: `speech_${speechId}`,
        meaning: `代表発話 ${speechId}`
      }))
    };
  });

  if (themes.length === 0) {
    throw new Error('固定テーマ候補のデータに使えるテーマがありません');
  }

  return {
    kind: 'theme_json',
    mode: 'sample-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

export async function buildThemeOptionsArtifact(
  transcript: TranscriptArtifact,
  request: AgentRequest,
  context: BuildThemeOptionsArtifactContext
): Promise<ThemeArtifact> {
  if (isSampleRequest(request)) {
    return buildSampleThemeOptions(transcript, request);
  }

  if (context.useFixedThemeOptions) {
    return buildFixedThemeOptionsArtifact(transcript, request, context);
  }

  return callGeminiThemeApi(request, transcript, context);
}

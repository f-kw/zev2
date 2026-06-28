import { readFile } from 'node:fs/promises';
import {
  recordValue as recordFrom,
  type AgentRequest,
  type ContentDiscoveryRuntimeMode,
  type ControlReference
} from '@zev2/shared';
import { speechIdsFromGeminiRequired } from '../gemini-speech-ids.js';
import {
  segmentTextByIds,
  speechRange,
  uniqueSpeechIds
} from '../transcript-utils.js';
import type { ThemeArtifact, TranscriptArtifact } from '../workflow-artifacts.js';

export type BuildThemeOptionsArtifactContext = {
  fixedThemeOptionsPath: string;
  contentDiscoveryMode: string;
  sanitizePathPart: (value: string) => string;
};

function parseCount(label: string): number {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 3;
}

function isSampleRequest(request: AgentRequest): boolean {
  return request.target.sourceUri.startsWith('zev-sample://');
}

function evidenceRefsForSpeechIds(speechIds: number[]): ControlReference[] {
  return speechIds.map((speechId) => ({
    kind: 'time_range' as const,
    refId: `speech_${speechId}`,
    meaning: `代表発話 ${speechId}`
  }));
}

function buildSampleThemeOptions(transcript: TranscriptArtifact, request: AgentRequest): ThemeArtifact {
  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const seeds = transcript.themeSeeds ?? [];
  if (seeds.length === 0) {
    throw new Error('固定テーマのデータがないため、サンプル用テーマを作れません');
  }

  const themes = seeds.slice(0, requestedCount).map((seed, index) => {
    const candidateNumber = index + 1;
    const representativeSpeechIds = uniqueSpeechIds(seed.representativeSpeechIds);
    const relatedSpeechIds = uniqueSpeechIds(seed.relatedSpeechIds);
    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    const summary = seed.summary ?? representativeText;

    return {
      id: seed.id ?? `content_${candidateNumber}`,
      title: seed.title ?? `テーマ${candidateNumber}`,
      summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds,
      whyItCanBeClipped: seed.reason ?? '文字起こし上でテーマのまとまりとして確認できます。面白さは人間が判断します。',
      compositionNote: seed.compositionNote ?? '選ばれた後に、関係する発話を複数集めて切り口と編集元場面にします。',
      evidenceRefs: evidenceRefsForSpeechIds(representativeSpeechIds)
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

function buildTranscriptContentOptions(transcript: TranscriptArtifact, request: AgentRequest): ThemeArtifact {
  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const groups = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : transcript.segments.map((segment) => [segment.id]);
  const themes: ThemeArtifact['themes'] = [];

  for (const [index, speechIds] of groups.entries()) {
    const candidateNumber = index + 1;
    const representativeSpeechIds = uniqueSpeechIds(speechIds);
    if (representativeSpeechIds.length === 0) {
      continue;
    }

    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    if (!representativeText.trim()) {
      continue;
    }

    const range = speechRange(transcript, representativeSpeechIds);
    themes.push({
      id: `content_${candidateNumber}`,
      title: `テーマ${candidateNumber}`,
      summary: `この範囲には次の発話があります: ${representativeText}`,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds: representativeSpeechIds,
      whyItCanBeClipped: '文字起こし上でまとまった出来事、話題、反応として確認できます。面白いかは人間が判断します。',
      compositionNote: `${Math.round(range.sourceStartMs / 1000)}秒付近から、選ばれたテーマに関係する発話を探し直して切り口と編集元場面にします。`,
      evidenceRefs: evidenceRefsForSpeechIds(representativeSpeechIds)
    });

    if (themes.length >= requestedCount) {
      break;
    }
  }

  if (themes.length === 0) {
    throw new Error('文字起こしからテーマを作れません');
  }

  return {
    kind: 'theme_json',
    mode: 'transcript-content-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

async function buildFixedThemeOptionsArtifact(
  transcript: TranscriptArtifact,
  request: AgentRequest,
  context: BuildThemeOptionsArtifactContext
): Promise<ThemeArtifact> {
  const raw = await readFile(context.fixedThemeOptionsPath, 'utf8');
  const record = recordFrom(JSON.parse(raw));
  if (!Array.isArray(record.themes)) {
    throw new Error('固定テーマのデータにテーマ配列がありません');
  }

  const knownIds = new Set(transcript.segments.map((segment) => segment.id));
  const themes = record.themes.map((rawTheme, index) => {
    const theme = recordFrom(rawTheme);
    const representativeSpeechIds = speechIdsFromGeminiRequired(
      theme.representativeSpeechIds,
      knownIds,
      `固定テーマ ${index + 1} 件目の代表発話`
    );
    const relatedSpeechIds = speechIdsFromGeminiRequired(
      theme.relatedSpeechIds,
      knownIds,
      `固定テーマ ${index + 1} 件目の関連発話`
    );

    return {
      id: typeof theme.id === 'string' && theme.id.trim()
        ? context.sanitizePathPart(theme.id.trim())
        : `content_${index + 1}`,
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
        : '文字起こし上でテーマのまとまりとして確認できます。面白さは人間が判断します。',
      compositionNote: typeof theme.compositionNote === 'string' && theme.compositionNote.trim()
        ? theme.compositionNote.trim()
        : '選ばれた後に、関係する発話を複数集めて切り口と編集元場面にします。',
      evidenceRefs: evidenceRefsForSpeechIds(representativeSpeechIds)
    };
  });

  if (themes.length === 0) {
    throw new Error('固定テーマのデータに使えるテーマがありません');
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

  const mode = context.contentDiscoveryMode as ContentDiscoveryRuntimeMode;
  if (mode === 'fixed') {
    return buildFixedThemeOptionsArtifact(transcript, request, context);
  }

  if (mode === 'transcript') {
    return buildTranscriptContentOptions(transcript, request);
  }

  throw new Error(`テーマ作成は fixed または transcript だけ対応しています: ${context.contentDiscoveryMode}`);
}

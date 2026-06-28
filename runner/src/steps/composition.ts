import {
  findById,
  lastMatching,
  type Zev2State
} from '@zev2/shared';
import {
  segmentTextByIds,
  speechRange,
  speechUnitsByIds,
  uniqueSpeechIds
} from '../transcript-utils.js';
import type { ClipCompositionArtifact, ThemeArtifact, TranscriptArtifact } from '../workflow-artifacts.js';

function selectedThemeIdFromState(state: Zev2State, requestDraftId: string, themes: ThemeArtifact): string {
  const review = lastMatching(
    state.controlReviewItems,
    (item) =>
      item.requestDraftId === requestDraftId &&
      item.kind === 'theme_selection' &&
      item.status === 'approved'
  );
  const action = findById(state.humanReviewActions, review?.resolvedByActionId);
  if (!action?.selectedOptionId) {
    const firstThemeId = themes.themes[0]?.id;
    if (!firstThemeId) {
      throw new Error('テーマがないため切り口と編集元場面を作れません');
    }

    return firstThemeId;
  }

  return action.selectedOptionId;
}

function buildClipComposition(
  themes: ThemeArtifact,
  transcript: TranscriptArtifact,
  selectedThemeId: string,
  materialReselectInstruction?: string
): ClipCompositionArtifact {
  const selectedTheme = findById(themes.themes, selectedThemeId);
  if (!selectedTheme) {
    throw new Error('選ばれたテーマが確認対象にありません');
  }

  const groupedSpeechIds = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : selectedTheme.relatedSpeechIds.map((speechId) => [speechId]);
  const relatedIds = new Set(selectedTheme.relatedSpeechIds);
  const relatedGroups = groupedSpeechIds.filter((group) => group.some((speechId) => relatedIds.has(speechId)));
  const groups = relatedGroups.length > 0 ? relatedGroups : [selectedTheme.relatedSpeechIds];
  const parts = groups.map((speechIds, index) => {
    const partSpeechIds = uniqueSpeechIds(speechIds);
    const range = speechRange(transcript, partSpeechIds);
    return {
      id: `part_${index + 1}`,
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
      role: index === 0 ? '導入' : index === groups.length - 1 ? '結論' : '展開',
      transcriptText: segmentTextByIds(transcript, partSpeechIds),
      speechIds: partSpeechIds,
      speechUnits: speechUnitsByIds(transcript, partSpeechIds),
      connectionNote: index === 0 ? '選ばれたテーマを見せる入口にする' : '前の発話を受けて話の流れをつなぐ'
    };
  });
  const ranges = parts.map((part) => ({ sourceStartMs: part.sourceStartMs, sourceEndMs: part.sourceEndMs }));
  const firstStartMs = Math.min(...ranges.map((range) => range.sourceStartMs));
  const lastEndMs = Math.max(...ranges.map((range) => range.sourceEndMs));

  const assemblyPlan = materialReselectInstruction
    ? `${selectedTheme.compositionNote}\n編集元場面の探し直し指示: ${materialReselectInstruction}`
    : selectedTheme.compositionNote;

  return {
    kind: 'composition_json',
    mode: 'transcript-multi-part-composition',
    generatedAt: new Date().toISOString(),
    sourceUri: themes.sourceUri,
    selectedThemeId: selectedTheme.id,
    title: selectedTheme.title,
    themeSummary: selectedTheme.summary,
    sourceStartMs: firstStartMs,
    sourceEndMs: lastEndMs,
    parts,
    assemblyPlan
  };
}

function materialReselectInstructionFromPurpose(purpose: string): string | undefined {
  const marker = '編集元場面の探し直し指示:';
  const markerIndex = purpose.lastIndexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  const instruction = purpose.slice(markerIndex + marker.length).trim();
  return instruction || undefined;
}

export function buildClipCompositionArtifact(
  themes: ThemeArtifact,
  transcript: TranscriptArtifact,
  state: Zev2State,
  requestDraftId: string,
  requestPurpose = ''
): ClipCompositionArtifact {
  const selectedThemeId = selectedThemeIdFromState(state, requestDraftId, themes);
  return buildClipComposition(
    themes,
    transcript,
    selectedThemeId,
    materialReselectInstructionFromPurpose(requestPurpose)
  );
}

import type { FileRefKind } from '@zev2/shared';
import type {
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
  SpeechTimingRef,
  SttSegment,
  ThemeArtifact,
  TranscriptArtifact,
  TranscriptThemeSeed
} from './workflow-artifacts.js';

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}はJSONオブジェクトではありません`);
  }

  return value as JsonRecord;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label}は文字列ではありません`);
  }

  return value;
}

function assertNonEmptyString(value: unknown, label: string): string {
  const text = assertString(value, label).trim();
  if (!text) {
    throw new Error(`${label}が空です`);
  }

  return text;
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label}は数値ではありません`);
  }

  return value;
}

function assertInteger(value: unknown, label: string): number {
  const numberValue = assertNumber(value, label);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${label}は整数ではありません`);
  }

  return numberValue;
}

function assertArray(value: unknown, label: string, minimumLength = 0): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}は配列ではありません`);
  }

  if (value.length < minimumLength) {
    throw new Error(`${label}の件数が不足しています`);
  }

  return value;
}

function assertLiteral<T extends string>(value: unknown, label: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label}が不正です`);
  }

  return value as T;
}

function assertStringArray(value: unknown, label: string): string[] {
  return assertArray(value, label).map((item, index) => assertString(item, `${label} ${index + 1}件目`));
}

function assertIntegerArray(value: unknown, label: string, minimumLength = 0): number[] {
  return assertArray(value, label, minimumLength).map((item, index) => assertInteger(item, `${label} ${index + 1}件目`));
}

function assertTimeRange(startMs: unknown, endMs: unknown, label: string): { startMs: number; endMs: number } {
  const start = assertNumber(startMs, `${label}の開始時刻`);
  const end = assertNumber(endMs, `${label}の終了時刻`);
  if (start < 0 || end <= start) {
    throw new Error(`${label}の時刻範囲が不正です`);
  }

  return { startMs: start, endMs: end };
}

function assertSpeechTimingRef(value: unknown, label: string): SpeechTimingRef {
  const record = assertRecord(value, label);
  const id = assertInteger(record.id, `${label}の発話ID`);
  const range = assertTimeRange(record.sourceStartMs, record.sourceEndMs, label);
  const text = assertNonEmptyString(record.text, `${label}の本文`);
  const speaker = typeof record.speaker === 'string' && record.speaker.trim()
    ? record.speaker.trim()
    : undefined;

  return {
    id,
    sourceStartMs: range.startMs,
    sourceEndMs: range.endMs,
    text,
    ...(speaker ? { speaker } : {})
  };
}

function assertSttSegment(value: unknown, label: string): SttSegment {
  const record = assertRecord(value, label);
  const id = assertInteger(record.id, `${label}の発話ID`);
  const range = assertTimeRange(record.startMs, record.endMs, label);
  const text = assertNonEmptyString(record.text, `${label}の本文`);
  const speaker = typeof record.speaker === 'string' && record.speaker.trim()
    ? record.speaker.trim()
    : undefined;

  return {
    id,
    startMs: range.startMs,
    endMs: range.endMs,
    text,
    ...(speaker ? { speaker } : {})
  };
}

function assertThemeSeed(value: unknown, label: string, knownSpeechIds: Set<number>): TranscriptThemeSeed {
  const record = assertRecord(value, label);
  const representativeSpeechIds = assertKnownSpeechIds(record.representativeSpeechIds, `${label}の代表発話ID`, knownSpeechIds);
  const relatedSpeechIds = assertKnownSpeechIds(record.relatedSpeechIds, `${label}の関連発話ID`, knownSpeechIds);

  return {
    ...(typeof record.id === 'string' ? { id: record.id } : {}),
    ...(typeof record.title === 'string' ? { title: record.title } : {}),
    ...(typeof record.summary === 'string' ? { summary: record.summary } : {}),
    representativeSpeechIds,
    relatedSpeechIds,
    ...(typeof record.reason === 'string' ? { reason: record.reason } : {}),
    ...(typeof record.compositionNote === 'string' ? { compositionNote: record.compositionNote } : {})
  };
}

function assertUniqueIds(ids: number[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label}に重複があります`);
  }
}

function assertKnownSpeechIds(value: unknown, label: string, knownSpeechIds: Set<number>, minimumLength = 1): number[] {
  const ids = assertIntegerArray(value, label, minimumLength);
  for (const id of ids) {
    if (!knownSpeechIds.has(id)) {
      throw new Error(`${label}に存在しない発話ID ${id} があります`);
    }
  }

  return ids;
}

function assertSpeechUnitsMatchIds(speechIds: number[], speechUnits: SpeechTimingRef[], label: string): void {
  const unitIds = new Set(speechUnits.map((speech) => speech.id));
  for (const speechId of speechIds) {
    if (!unitIds.has(speechId)) {
      throw new Error(`${label}の発話ID ${speechId} に対応する発話単位がありません`);
    }
  }
}

function assertControlReference(value: unknown, label: string): void {
  const record = assertRecord(value, label);
  assertNonEmptyString(record.refId, `${label}の参照ID`);
  assertLiteral(record.kind, `${label}の参照種別`, ['request_draft', 'agent_request', 'file_ref', 'output', 'time_range', 'rule', 'state'] as const);
  assertNonEmptyString(record.meaning, `${label}の意味`);
}

function assertViewportCoords(value: unknown, label: string): void {
  const coords = assertArray(value, label, 4);
  if (coords.length !== 4) {
    throw new Error(`${label}は4つの座標である必要があります`);
  }

  coords.forEach((item, index) => {
    const numberValue = assertNumber(item, `${label} ${index + 1}番目`);
    if (numberValue < 0 || numberValue > 1) {
      throw new Error(`${label} ${index + 1}番目が0から1の範囲外です`);
    }
  });
}

function assertScreenLayout(value: unknown, label: string): void {
  const record = assertRecord(value, label);
  assertLiteral(record.screenLayoutId, `${label}の画面枠`, ['speaker_only', 'screen_speaker', 'speaker_pair'] as const);
  assertRecord(record.detections, `${label}の検出結果`);
  const viewports = assertRecord(record.viewports, `${label}の表示範囲`);
  assertNonEmptyString(record.displaySummary, `${label}の表示説明`);

  for (const [key, coords] of Object.entries(viewports)) {
    if (key !== 'screen' && key !== 'speaker' && key !== 'speaker1' && key !== 'speaker2') {
      throw new Error(`${label}の表示範囲に不正な対象 ${key} があります`);
    }
    assertViewportCoords(coords, `${label}の${key}表示範囲`);
  }
}

export function assertTranscriptArtifact(value: unknown, label = '文字起こし成果物'): asserts value is TranscriptArtifact {
  const record = assertRecord(value, label);
  assertLiteral(record.kind, `${label}の種類`, ['transcript_json'] as const);
  assertLiteral(record.mode, `${label}の作成方法`, ['zev-local-stt', 'zev-sample-stt'] as const);
  assertNonEmptyString(record.sourceUri, `${label}の動画参照`);
  assertStringArray(record.notes, `${label}のメモ`);
  assertNonEmptyString(record.generatedAt, `${label}の作成日時`);
  assertNonEmptyString(record.language, `${label}の言語`);
  assertNumber(record.durationSec, `${label}の動画長`);

  const segments = assertArray(record.segments, `${label}の発話`, 1).map((item, index) => (
    assertSttSegment(item, `${label}の発話 ${index + 1}件目`)
  ));
  const segmentIds = segments.map((segment) => segment.id);
  assertUniqueIds(segmentIds, `${label}の発話ID`);
  if (assertInteger(record.segmentCount, `${label}の発話件数`) !== segments.length) {
    throw new Error(`${label}の発話件数が発話配列と一致しません`);
  }

  const knownSpeechIds = new Set(segmentIds);
  for (const [index, group] of assertArray(record.speechUnitGroups, `${label}の発話まとまり`).entries()) {
    assertKnownSpeechIds(group, `${label}の発話まとまり ${index + 1}件目`, knownSpeechIds);
  }

  if (record.themeSeeds !== undefined) {
    assertArray(record.themeSeeds, `${label}の固定テーマ候補`).forEach((item, index) => {
      assertThemeSeed(item, `${label}の固定テーマ候補 ${index + 1}件目`, knownSpeechIds);
    });
  }
}

export function assertThemeArtifact(value: unknown, label = 'テーマ候補成果物'): asserts value is ThemeArtifact {
  const record = assertRecord(value, label);
  assertLiteral(record.kind, `${label}の種類`, ['theme_json'] as const);
  assertLiteral(record.mode, `${label}の作成方法`, ['gemini-api-theme-options', 'sample-theme-options'] as const);
  assertNonEmptyString(record.generatedAt, `${label}の作成日時`);
  assertNonEmptyString(record.sourceUri, `${label}の動画参照`);

  const themeIds: string[] = [];
  for (const [index, item] of assertArray(record.themes, `${label}のテーマ`, 1).entries()) {
    const theme = assertRecord(item, `${label}のテーマ ${index + 1}件目`);
    themeIds.push(assertNonEmptyString(theme.id, `${label}のテーマ ${index + 1}件目のID`));
    assertNonEmptyString(theme.title, `${label}のテーマ ${index + 1}件目のタイトル`);
    assertNonEmptyString(theme.summary, `${label}のテーマ ${index + 1}件目の概要`);
    assertNonEmptyString(theme.representativeText, `${label}のテーマ ${index + 1}件目の代表文`);
    assertIntegerArray(theme.representativeSpeechIds, `${label}のテーマ ${index + 1}件目の代表発話ID`, 1);
    assertIntegerArray(theme.relatedSpeechIds, `${label}のテーマ ${index + 1}件目の関連発話ID`, 1);
    assertNonEmptyString(theme.whyItCanBeClipped, `${label}のテーマ ${index + 1}件目の成立理由`);
    assertNonEmptyString(theme.compositionNote, `${label}のテーマ ${index + 1}件目の構成メモ`);
    assertArray(theme.evidenceRefs, `${label}のテーマ ${index + 1}件目の根拠参照`).forEach((ref, refIndex) => {
      assertControlReference(ref, `${label}のテーマ ${index + 1}件目の根拠参照 ${refIndex + 1}件目`);
    });
  }
  if (new Set(themeIds).size !== themeIds.length) {
    throw new Error(`${label}のテーマIDに重複があります`);
  }
}

export function assertClipCompositionArtifact(
  value: unknown,
  label = '複数箇所構成成果物'
): asserts value is ClipCompositionArtifact {
  const record = assertRecord(value, label);
  assertLiteral(record.kind, `${label}の種類`, ['composition_json'] as const);
  assertLiteral(record.mode, `${label}の作成方法`, ['transcript-multi-part-composition'] as const);
  assertNonEmptyString(record.generatedAt, `${label}の作成日時`);
  assertNonEmptyString(record.sourceUri, `${label}の動画参照`);
  assertNonEmptyString(record.selectedThemeId, `${label}の選択テーマID`);
  assertNonEmptyString(record.title, `${label}のタイトル`);
  assertNonEmptyString(record.themeSummary, `${label}のテーマ概要`);
  assertTimeRange(record.sourceStartMs, record.sourceEndMs, label);
  assertNonEmptyString(record.assemblyPlan, `${label}の構成説明`);

  const partIds: string[] = [];
  for (const [index, item] of assertArray(record.parts, `${label}の使う場面`, 1).entries()) {
    const part = assertRecord(item, `${label}の使う場面 ${index + 1}件目`);
    partIds.push(assertNonEmptyString(part.id, `${label}の使う場面 ${index + 1}件目のID`));
    assertTimeRange(part.sourceStartMs, part.sourceEndMs, `${label}の使う場面 ${index + 1}件目`);
    assertNonEmptyString(part.role, `${label}の使う場面 ${index + 1}件目の役割`);
    assertNonEmptyString(part.transcriptText, `${label}の使う場面 ${index + 1}件目の本文`);
    const speechIds = assertIntegerArray(part.speechIds, `${label}の使う場面 ${index + 1}件目の発話ID`, 1);
    const speechUnits = assertArray(part.speechUnits, `${label}の使う場面 ${index + 1}件目の発話単位`, 1).map((speech, speechIndex) => (
      assertSpeechTimingRef(speech, `${label}の使う場面 ${index + 1}件目の発話単位 ${speechIndex + 1}件目`)
    ));
    assertSpeechUnitsMatchIds(speechIds, speechUnits, `${label}の使う場面 ${index + 1}件目`);
    assertNonEmptyString(part.connectionNote, `${label}の使う場面 ${index + 1}件目の接続理由`);
  }
  if (new Set(partIds).size !== partIds.length) {
    throw new Error(`${label}の使う場面IDに重複があります`);
  }
}

export function assertEditPlanArtifact(value: unknown, label = '編集案成果物'): asserts value is EditPlanArtifact {
  const record = assertRecord(value, label);
  assertLiteral(record.kind, `${label}の種類`, ['edit_plan_json'] as const);
  assertLiteral(record.mode, `${label}の作成方法`, ['gemini-api-edit-plan', 'sample-edit-plan'] as const);
  assertNonEmptyString(record.generatedAt, `${label}の作成日時`);
  assertNonEmptyString(record.selectedThemeId, `${label}の選択テーマID`);
  assertNonEmptyString(record.title, `${label}のタイトル`);
  assertNonEmptyString(record.hookText, `${label}の冒頭文`);
  assertTimeRange(record.sourceStartMs, record.sourceEndMs, label);

  assertArray(record.geminiApiInput, `${label}のGemini入力断片`).forEach((item, index) => {
    const input = assertRecord(item, `${label}のGemini入力断片 ${index + 1}件目`);
    assertNonEmptyString(input.sourceUri, `${label}のGemini入力断片 ${index + 1}件目の動画参照`);
    assertTimeRange(input.sourceStartMs, input.sourceEndMs, `${label}のGemini入力断片 ${index + 1}件目`);
    assertNonEmptyString(input.purpose, `${label}のGemini入力断片 ${index + 1}件目の目的`);
  });

  const knownSpeechIds = new Set<number>();
  for (const [index, item] of assertArray(record.renderSegments, `${label}の動画断片`, 1).entries()) {
    const segment = assertRecord(item, `${label}の動画断片 ${index + 1}件目`);
    assertTimeRange(segment.sourceStartMs, segment.sourceEndMs, `${label}の動画断片 ${index + 1}件目`);
    assertNonEmptyString(segment.role, `${label}の動画断片 ${index + 1}件目の役割`);
    assertNonEmptyString(segment.caption, `${label}の動画断片 ${index + 1}件目のテロップ短文`);
    const speechIds = assertIntegerArray(segment.speechIds, `${label}の動画断片 ${index + 1}件目の発話ID`, 1);
    speechIds.forEach((speechId) => knownSpeechIds.add(speechId));
    const speechUnits = assertArray(segment.speechUnits, `${label}の動画断片 ${index + 1}件目の発話単位`, 1).map((speech, speechIndex) => (
      assertSpeechTimingRef(speech, `${label}の動画断片 ${index + 1}件目の発話単位 ${speechIndex + 1}件目`)
    ));
    assertSpeechUnitsMatchIds(speechIds, speechUnits, `${label}の動画断片 ${index + 1}件目`);
    assertScreenLayout(segment.screenLayout, `${label}の動画断片 ${index + 1}件目の画面枠`);
  }

  for (const [index, item] of assertArray(record.telopPlan, `${label}のテロップ案`, 1).entries()) {
    const telop = assertRecord(item, `${label}のテロップ案 ${index + 1}件目`);
    const sourceSpeechIds = assertIntegerArray(telop.sourceSpeechIds, `${label}のテロップ案 ${index + 1}件目の発話ID`, 1);
    sourceSpeechIds.forEach((speechId) => {
      if (!knownSpeechIds.has(speechId)) {
        throw new Error(`${label}のテロップ案 ${index + 1}件目に動画断片へ存在しない発話ID ${speechId} があります`);
      }
    });
    assertNonEmptyString(telop.text, `${label}のテロップ案 ${index + 1}件目の表示文`);
    assertNonEmptyString(telop.role, `${label}のテロップ案 ${index + 1}件目の役割`);
  }
}

export function assertPatchArtifact(value: unknown, label = '調整結果成果物'): asserts value is PatchArtifact {
  const record = assertRecord(value, label);
  assertLiteral(record.kind, `${label}の種類`, ['patch_json'] as const);
  assertLiteral(record.mode, `${label}の作成方法`, ['fixed-adjustment'] as const);
  assertNonEmptyString(record.generatedAt, `${label}の作成日時`);
  assertNonEmptyString(record.editPlanUri, `${label}の編集案参照`);
  if (typeof record.renderReady !== 'boolean') {
    throw new Error(`${label}の動画生成可否が真偽値ではありません`);
  }

  assertArray(record.changes, `${label}の変更内容`, 1).forEach((item, index) => {
    const change = assertRecord(item, `${label}の変更内容 ${index + 1}件目`);
    assertNonEmptyString(change.target, `${label}の変更内容 ${index + 1}件目の対象`);
    assertNonEmptyString(change.action, `${label}の変更内容 ${index + 1}件目の処理`);
    assertNonEmptyString(change.reason, `${label}の変更内容 ${index + 1}件目の理由`);
  });
}

export function assertJsonArtifactForKind(kind: FileRefKind, value: unknown, label: string): void {
  if (kind === 'transcript_json') {
    assertTranscriptArtifact(value, label);
    return;
  }

  if (kind === 'theme_json') {
    assertThemeArtifact(value, label);
    return;
  }

  if (kind === 'composition_json') {
    assertClipCompositionArtifact(value, label);
    return;
  }

  if (kind === 'edit_plan_json') {
    assertEditPlanArtifact(value, label);
    return;
  }

  if (kind === 'patch_json') {
    assertPatchArtifact(value, label);
  }
}

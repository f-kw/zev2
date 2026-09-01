import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import type {SttSegment, TranscriptArtifact} from './workflow-artifacts.js';
import {assertTranscriptArtifact} from './workflow-artifact-validation.js';

export const DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001 =
  'distant-connection-common-utterance-artifact-v001';
export const DISTANT_CONNECTION_COMMON_UTTERANCE_ALGORITHM_V001 =
  'theme-generation-compact-segments-v001';
export const SOURCE_TRANSCRIPT_SCHEMA_V001 = 'transcript-json-v001';

export const DISTANT_CONNECTION_COMMON_UTTERANCE_ERROR_CODES_V001 = Object.freeze([
  'TRANSCRIPT_INVALID',
  'TRANSCRIPT_SHA_MISMATCH',
  'UNKNOWN_SEGMENT_ID',
  'SEGMENT_DUPLICATE',
  'SEGMENT_MISSING',
  'SEGMENT_ORDER_REVERSED',
  'TEXT_MISMATCH',
  'TIME_MISMATCH',
  'ARTIFACT_INVALID',
  'ARTIFACT_BINDING_MISMATCH'
] as const);

export type DistantConnectionCommonUtteranceErrorCodeV001 =
  typeof DISTANT_CONNECTION_COMMON_UTTERANCE_ERROR_CODES_V001[number];

export class DistantConnectionCommonUtteranceArtifactErrorV001 extends Error {
  readonly code: DistantConnectionCommonUtteranceErrorCodeV001;

  constructor(
    code: DistantConnectionCommonUtteranceErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionCommonUtteranceArtifactErrorV001';
    this.code = code;
  }
}

export type DistantConnectionCommonUtteranceV001 = {
  utteranceId: string;
  ordinal: number;
  text: string;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceSegmentIds: number[];
};

export type DistantConnectionCommonUtteranceArtifactV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001;
  algorithm: typeof DISTANT_CONNECTION_COMMON_UTTERANCE_ALGORITHM_V001;
  sourceTranscriptBinding: {
    path: string;
    schemaVersion: typeof SOURCE_TRANSCRIPT_SCHEMA_V001;
    fileSha256: string;
  };
  sourceUri: string;
  language: string;
  sourceSegmentCount: number;
  utteranceCount: number;
  utterances: DistantConnectionCommonUtteranceV001[];
};

type BuildFromBytesInput = {
  sourceTranscriptPath: string;
  sourceTranscriptBytes: Uint8Array;
};

type BuildFromFileInput = {
  workspaceRoot: string;
  sourceTranscriptPath: string;
};

type WriteFromFileInput = BuildFromFileInput & {
  outputPath: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

function fail(
  code: DistantConnectionCommonUtteranceErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionCommonUtteranceArtifactErrorV001(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertWorkspaceRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('ARTIFACT_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertSafeTime(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail('ARTIFACT_INVALID', `${label}は0以上の安全な整数ミリ秒である必要があります`);
  }
}

function parseTranscript(bytes: Uint8Array): TranscriptArtifact {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
    assertTranscriptArtifact(value);
  } catch (error) {
    fail('TRANSCRIPT_INVALID', '元transcriptを正式な文字起こし成果物として読めません', error);
  }
  return value as TranscriptArtifact;
}

function assertSourceChronology(segments: SttSegment[]): void {
  const sorted = [...segments]
    .filter((segment) => String(segment.text ?? '').trim())
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);

  if (sorted.length !== segments.length) {
    fail('TRANSCRIPT_INVALID', '空のSTT断片は共通発話へ欠落なく結合できません');
  }

  for (const [index, segment] of segments.entries()) {
    if (sorted[index]?.id !== segment.id) {
      fail('SEGMENT_ORDER_REVERSED', '元transcriptのSTT断片が開始・終了時刻順ではありません');
    }
  }
}

/**
 * `evals/clip_composition/build_theme_generation_payload.ts` の
 * `compactSegments` と同じ決定条件を、正式成果物用にそのまま適用する。
 * 句読点、時刻gap、文字列連結、時刻更新の条件をこの入口で変更しない。
 */
function compactSegmentsExactly(segments: SttSegment[]): DistantConnectionCommonUtteranceV001[] {
  const compacted: DistantConnectionCommonUtteranceV001[] = [];
  let current: DistantConnectionCommonUtteranceV001 | undefined;
  const orderedSegments = segments
    .filter((segment) => String(segment.text ?? '').trim())
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);

  for (let index = 0; index < orderedSegments.length; index += 1) {
    const segment = orderedSegments[index]!;
    const text = String(segment.text ?? '');
    if (!current) {
      current = {
        utteranceId: `common-utterance-${String(compacted.length + 1).padStart(6, '0')}`,
        ordinal: compacted.length + 1,
        sourceStartMs: segment.startMs,
        sourceEndMs: segment.endMs,
        text: '',
        sourceSegmentIds: []
      };
    }
    current.sourceEndMs = Math.max(current.sourceEndMs, segment.endMs);
    current.text += text;
    current.sourceSegmentIds.push(segment.id);
    const next = orderedSegments[index + 1];
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

  return compacted.map((utterance, index) => ({
    ...utterance,
    utteranceId: `common-utterance-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1
  }));
}

export function serializeDistantConnectionCommonUtteranceArtifactV001(
  artifact: DistantConnectionCommonUtteranceArtifactV001
): Buffer {
  assertDistantConnectionCommonUtteranceArtifactV001(artifact);
  return Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

export function buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001(
  input: BuildFromBytesInput
): DistantConnectionCommonUtteranceArtifactV001 {
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '元transcriptのpath');
  const transcript = parseTranscript(input.sourceTranscriptBytes);
  assertSourceChronology(transcript.segments);
  const utterances = compactSegmentsExactly(transcript.segments);
  if (utterances.length === 0) {
    fail('TRANSCRIPT_INVALID', '元transcriptから共通発話を1件も作れません');
  }

  return {
    schemaVersion: DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001,
    algorithm: DISTANT_CONNECTION_COMMON_UTTERANCE_ALGORITHM_V001,
    sourceTranscriptBinding: {
      path: input.sourceTranscriptPath,
      schemaVersion: SOURCE_TRANSCRIPT_SCHEMA_V001,
      fileSha256: sha256(input.sourceTranscriptBytes)
    },
    sourceUri: transcript.sourceUri,
    language: transcript.language,
    sourceSegmentCount: transcript.segments.length,
    utteranceCount: utterances.length,
    utterances
  };
}

export async function buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001(
  input: BuildFromFileInput
): Promise<DistantConnectionCommonUtteranceArtifactV001> {
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '元transcriptのpath');
  const bytes = await readFile(path.join(input.workspaceRoot, input.sourceTranscriptPath));
  return buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: input.sourceTranscriptPath,
    sourceTranscriptBytes: bytes
  });
}

export async function writeDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001(
  input: WriteFromFileInput
): Promise<{artifact: DistantConnectionCommonUtteranceArtifactV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  const artifact = await buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001(input);
  const bytes = serializeDistantConnectionCommonUtteranceArtifactV001(artifact);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {artifact, bytes};
}

export function assertDistantConnectionCommonUtteranceArtifactV001(
  value: unknown
): asserts value is DistantConnectionCommonUtteranceArtifactV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'algorithm',
    'sourceTranscriptBinding',
    'sourceUri',
    'language',
    'sourceSegmentCount',
    'utteranceCount',
    'utterances'
  ])) {
    fail('ARTIFACT_INVALID', '共通発話成果物のroot構造が不正です');
  }
  if (value.schemaVersion !== DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001
    || value.algorithm !== DISTANT_CONNECTION_COMMON_UTTERANCE_ALGORITHM_V001) {
    fail('ARTIFACT_INVALID', '共通発話成果物のschema版または結合処理が不正です');
  }
  if (!isRecord(value.sourceTranscriptBinding) || !hasExactKeys(value.sourceTranscriptBinding, [
    'path', 'schemaVersion', 'fileSha256'
  ])) {
    fail('ARTIFACT_INVALID', '元transcript bindingの構造が不正です');
  }
  assertWorkspaceRelativePath(value.sourceTranscriptBinding.path, '元transcriptのpath');
  if (value.sourceTranscriptBinding.schemaVersion !== SOURCE_TRANSCRIPT_SCHEMA_V001
    || typeof value.sourceTranscriptBinding.fileSha256 !== 'string'
    || !SHA256.test(value.sourceTranscriptBinding.fileSha256)) {
    fail('ARTIFACT_INVALID', '元transcript bindingの版またはSHA-256が不正です');
  }
  if (typeof value.sourceUri !== 'string' || value.sourceUri.length === 0
    || typeof value.language !== 'string' || value.language.length === 0
    || !Number.isSafeInteger(value.sourceSegmentCount) || (value.sourceSegmentCount as number) < 1
    || !Number.isSafeInteger(value.utteranceCount) || (value.utteranceCount as number) < 1
    || !Array.isArray(value.utterances)
    || value.utterances.length !== value.utteranceCount) {
    fail('ARTIFACT_INVALID', '共通発話成果物の概要値が不正です');
  }

  const coveredIds = new Set<number>();
  let coveredCount = 0;
  let previousStartMs = -1;
  let previousEndMs = -1;
  for (const [index, item] of value.utterances.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'utteranceId', 'ordinal', 'sourceStartMs', 'sourceEndMs', 'text', 'sourceSegmentIds'
    ])) {
      fail('ARTIFACT_INVALID', `共通発話 ${index + 1}件目の構造が不正です`);
    }
    if (item.utteranceId !== `common-utterance-${String(index + 1).padStart(6, '0')}`
      || item.ordinal !== index + 1
      || typeof item.text !== 'string'
      || item.text.trim().length === 0) {
      fail('ARTIFACT_INVALID', `共通発話 ${index + 1}件目のID・順序・本文が不正です`);
    }
    assertSafeTime(item.sourceStartMs, `共通発話 ${index + 1}件目の開始時刻`);
    assertSafeTime(item.sourceEndMs, `共通発話 ${index + 1}件目の終了時刻`);
    if (item.sourceEndMs < item.sourceStartMs
      || !Array.isArray(item.sourceSegmentIds)
      || item.sourceSegmentIds.length === 0) {
      fail('ARTIFACT_INVALID', `共通発話 ${index + 1}件目の時刻または元断片参照が不正です`);
    }
    if (item.sourceStartMs < previousStartMs
      || (item.sourceStartMs === previousStartMs && item.sourceEndMs < previousEndMs)) {
      fail('SEGMENT_ORDER_REVERSED', '共通発話の時系列順が逆転しています');
    }
    previousStartMs = item.sourceStartMs;
    previousEndMs = item.sourceEndMs;
    for (const segmentId of item.sourceSegmentIds) {
      if (!Number.isSafeInteger(segmentId) || segmentId <= 0) {
        fail('ARTIFACT_INVALID', `共通発話 ${index + 1}件目の元断片IDが不正です`);
      }
      if (coveredIds.has(segmentId)) {
        fail('SEGMENT_DUPLICATE', `元断片ID ${segmentId} が複数の共通発話に所属しています`);
      }
      coveredIds.add(segmentId);
      coveredCount += 1;
    }
  }
  if (coveredCount !== value.sourceSegmentCount) {
    fail('SEGMENT_MISSING', '共通発話が束縛する元断片件数と概要値が一致しません');
  }
}

export function decodeDistantConnectionCommonUtteranceArtifactV001(
  bytes: Uint8Array
): DistantConnectionCommonUtteranceArtifactV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('ARTIFACT_INVALID', '共通発話成果物がJSONとして読めません', error);
  }
  assertDistantConnectionCommonUtteranceArtifactV001(value);
  const formalBytes = serializeDistantConnectionCommonUtteranceArtifactV001(value);
  if (!formalBytes.equals(Buffer.from(bytes))) {
    fail('ARTIFACT_INVALID', '共通発話成果物がformal byteではありません');
  }
  return value;
}

export function validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(
  artifact: unknown,
  input: BuildFromBytesInput
): void {
  assertDistantConnectionCommonUtteranceArtifactV001(artifact);
  if (artifact.sourceTranscriptBinding.path !== input.sourceTranscriptPath) {
    fail('ARTIFACT_BINDING_MISMATCH', '成果物が束縛する元transcriptのpathと実入力が一致しません');
  }
  const actualSha256 = sha256(input.sourceTranscriptBytes);
  if (artifact.sourceTranscriptBinding.fileSha256 !== actualSha256) {
    fail('TRANSCRIPT_SHA_MISMATCH', '成果物が束縛する元transcriptのSHA-256と実入力が一致しません');
  }

  const transcript = parseTranscript(input.sourceTranscriptBytes);
  const knownSegmentIds = new Set(transcript.segments.map((segment) => segment.id));
  const actualSegmentIds = artifact.utterances.flatMap((utterance) => utterance.sourceSegmentIds);
  for (const segmentId of actualSegmentIds) {
    if (!knownSegmentIds.has(segmentId)) {
      fail('UNKNOWN_SEGMENT_ID', `共通発話が未知の元断片ID ${segmentId} を参照しています`);
    }
  }
  const actualSegmentIdSet = new Set(actualSegmentIds);
  const missingIds = transcript.segments
    .map((segment) => segment.id)
    .filter((segmentId) => !actualSegmentIdSet.has(segmentId));
  if (missingIds.length > 0) {
    fail('SEGMENT_MISSING', `共通発話に所属しない元断片IDがあります: ${missingIds.join(', ')}`);
  }
  if (actualSegmentIds.some((segmentId, index) => segmentId !== transcript.segments[index]?.id)) {
    fail('SEGMENT_ORDER_REVERSED', '共通発話内または共通発話間で元断片の順序が変わっています');
  }

  const rebuilt = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001(input);
  if (artifact.utterances.length !== rebuilt.utterances.length) {
    fail('ARTIFACT_BINDING_MISMATCH', '共通発話の結合境界が決定的再構築結果と一致しません');
  }
  for (const [index, utterance] of artifact.utterances.entries()) {
    const expected = rebuilt.utterances[index]!;
    if (utterance.text !== expected.text) {
      fail('TEXT_MISMATCH', `共通発話 ${index + 1}件目の本文が元transcriptと一致しません`);
    }
    if (utterance.sourceStartMs !== expected.sourceStartMs
      || utterance.sourceEndMs !== expected.sourceEndMs) {
      fail('TIME_MISMATCH', `共通発話 ${index + 1}件目の時刻が元transcriptと一致しません`);
    }
    if (utterance.sourceSegmentIds.some(
      (segmentId, segmentIndex) => segmentId !== expected.sourceSegmentIds[segmentIndex]
    ) || utterance.sourceSegmentIds.length !== expected.sourceSegmentIds.length) {
      fail('ARTIFACT_BINDING_MISMATCH', `共通発話 ${index + 1}件目の結合境界が元transcriptと一致しません`);
    }
  }

  const actualBytes = serializeDistantConnectionCommonUtteranceArtifactV001(artifact);
  const rebuiltBytes = serializeDistantConnectionCommonUtteranceArtifactV001(rebuilt);
  if (!actualBytes.equals(rebuiltBytes)) {
    fail('ARTIFACT_BINDING_MISMATCH', '共通発話成果物が元transcriptからの決定的再構築結果と一致しません');
  }
}

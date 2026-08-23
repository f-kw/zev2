import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import type {SttSegment, TranscriptArtifact} from './workflow-artifacts.js';
import {assertTranscriptArtifact} from './workflow-artifact-validation.js';

export const SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001 = 'semantic-utterance-artifact-v001';
export const SOURCE_TRANSCRIPT_SCHEMA_V001 = 'transcript-json-v001';

export const SEMANTIC_UTTERANCE_ERROR_CODES_V001 = Object.freeze([
  'TRANSCRIPT_INVALID',
  'TRANSCRIPT_SHA_MISMATCH',
  'UNKNOWN_SEGMENT_ID',
  'SEGMENT_DUPLICATE',
  'SEGMENT_MISSING',
  'SEGMENT_ORDER_REVERSED',
  'ARTIFACT_INVALID',
  'ARTIFACT_BINDING_MISMATCH'
] as const);

export type SemanticUtteranceErrorCodeV001 = typeof SEMANTIC_UTTERANCE_ERROR_CODES_V001[number];

export class SemanticUtteranceArtifactErrorV001 extends Error {
  readonly code: SemanticUtteranceErrorCodeV001;

  constructor(code: SemanticUtteranceErrorCodeV001, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SemanticUtteranceArtifactErrorV001';
    this.code = code;
  }
}

export type SemanticUtteranceV001 = {
  utteranceId: string;
  ordinal: number;
  text: string;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceSegmentIds: number[];
};

export type SemanticUtteranceArtifactV001 = {
  schemaVersion: typeof SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001;
  sourceTranscriptBinding: {
    path: string;
    schemaVersion: typeof SOURCE_TRANSCRIPT_SCHEMA_V001;
    fileSha256: string;
  };
  sourceUri: string;
  language: string;
  segmentCount: number;
  utteranceCount: number;
  utterances: SemanticUtteranceV001[];
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
const WORKSPACE_RELATIVE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

function fail(code: SemanticUtteranceErrorCodeV001, message: string, cause?: unknown): never {
  throw new SemanticUtteranceArtifactErrorV001(
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
    if (!isRecord(value) || !Array.isArray(value.speechUnitGroups)) {
      fail('TRANSCRIPT_INVALID', '元transcriptの発話まとまりが配列ではありません');
    }
    // 所属IDの意味検査は本成果物が所有するため、既存validatorには基礎shapeだけを確認させる。
    assertTranscriptArtifact({...value, speechUnitGroups: []});
  } catch (error) {
    if (error instanceof SemanticUtteranceArtifactErrorV001) {
      throw error;
    }
    fail('TRANSCRIPT_INVALID', '元transcriptを正式な文字起こし成果物として読めません', error);
  }
  return value as TranscriptArtifact;
}

function validateSegmentChronology(segments: SttSegment[]): void {
  let previous: SttSegment | undefined;
  for (const [index, segment] of segments.entries()) {
    if (!Number.isSafeInteger(segment.id) || segment.id <= 0) {
      fail('TRANSCRIPT_INVALID', `元transcriptのSTT断片 ${index + 1}件目のIDが不正です`);
    }
    if (!Number.isSafeInteger(segment.startMs)
      || !Number.isSafeInteger(segment.endMs)
      || segment.startMs < 0
      || segment.endMs < segment.startMs) {
      fail('TRANSCRIPT_INVALID', `元transcriptのSTT断片 ${segment.id} の時刻が不正です`);
    }
    if (previous && (
      segment.startMs < previous.startMs
      || (segment.startMs === previous.startMs && segment.endMs < previous.endMs)
    )) {
      fail(
        'SEGMENT_ORDER_REVERSED',
        `元transcriptのSTT断片 ${segment.id} が時系列順ではありません`
      );
    }
    previous = segment;
  }
}

function resolveOrderedGroups(transcript: TranscriptArtifact): SttSegment[][] {
  validateSegmentChronology(transcript.segments);
  const expectedIds = transcript.segments.map((segment) => segment.id);
  const byId = new Map(transcript.segments.map((segment) => [segment.id, segment]));
  const seen = new Set<number>();
  const flattenedIds: number[] = [];
  const groups: SttSegment[][] = [];

  for (const [groupIndex, group] of transcript.speechUnitGroups.entries()) {
    if (!Array.isArray(group) || group.length === 0) {
      fail('TRANSCRIPT_INVALID', `発話まとまり ${groupIndex + 1}件目が空です`);
    }
    const resolved: SttSegment[] = [];
    for (const segmentId of group) {
      const segment = byId.get(segmentId);
      if (!segment) {
        fail('UNKNOWN_SEGMENT_ID', `発話まとまりが未知のSTT断片ID ${segmentId} を参照しています`);
      }
      if (seen.has(segmentId)) {
        fail('SEGMENT_DUPLICATE', `STT断片ID ${segmentId} が複数の発話まとまりに所属しています`);
      }
      seen.add(segmentId);
      flattenedIds.push(segmentId);
      resolved.push(segment);
    }
    groups.push(resolved);
  }

  const missingIds = expectedIds.filter((segmentId) => !seen.has(segmentId));
  if (missingIds.length > 0) {
    fail('SEGMENT_MISSING', `発話まとまりに所属しないSTT断片IDがあります: ${missingIds.join(', ')}`);
  }
  if (flattenedIds.some((segmentId, index) => segmentId !== expectedIds[index])) {
    fail('SEGMENT_ORDER_REVERSED', '発話まとまり内または発話まとまり間でSTT断片の順序が逆転しています');
  }

  return groups;
}

function buildUtterance(group: SttSegment[], index: number): SemanticUtteranceV001 {
  return {
    utteranceId: `semantic-utterance-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    text: group.map((segment) => segment.text).join(''),
    sourceStartMs: group[0].startMs,
    sourceEndMs: Math.max(...group.map((segment) => segment.endMs)),
    sourceSegmentIds: group.map((segment) => segment.id)
  };
}

export function serializeSemanticUtteranceArtifactV001(
  artifact: SemanticUtteranceArtifactV001
): Buffer {
  assertSemanticUtteranceArtifactV001(artifact);
  return Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

export function buildSemanticUtteranceArtifactFromTranscriptBytesV001(
  input: BuildFromBytesInput
): SemanticUtteranceArtifactV001 {
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '元transcriptのpath');
  const transcript = parseTranscript(input.sourceTranscriptBytes);
  const groups = resolveOrderedGroups(transcript);
  const utterances = groups.map(buildUtterance);

  return {
    schemaVersion: SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
    sourceTranscriptBinding: {
      path: input.sourceTranscriptPath,
      schemaVersion: SOURCE_TRANSCRIPT_SCHEMA_V001,
      fileSha256: sha256(input.sourceTranscriptBytes)
    },
    sourceUri: transcript.sourceUri,
    language: transcript.language,
    segmentCount: transcript.segments.length,
    utteranceCount: utterances.length,
    utterances
  };
}

export async function buildSemanticUtteranceArtifactFromTranscriptFileV001(
  input: BuildFromFileInput
): Promise<SemanticUtteranceArtifactV001> {
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '元transcriptのpath');
  const bytes = await readFile(path.join(input.workspaceRoot, input.sourceTranscriptPath));
  return buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: input.sourceTranscriptPath,
    sourceTranscriptBytes: bytes
  });
}

export async function writeSemanticUtteranceArtifactFromTranscriptFileV001(
  input: WriteFromFileInput
): Promise<{artifact: SemanticUtteranceArtifactV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  const artifact = await buildSemanticUtteranceArtifactFromTranscriptFileV001(input);
  const bytes = serializeSemanticUtteranceArtifactV001(artifact);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {artifact, bytes};
}

export function assertSemanticUtteranceArtifactV001(
  value: unknown
): asserts value is SemanticUtteranceArtifactV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceTranscriptBinding',
    'sourceUri',
    'language',
    'segmentCount',
    'utteranceCount',
    'utterances'
  ])) {
    fail('ARTIFACT_INVALID', '正式意味発話成果物のroot構造が不正です');
  }
  if (value.schemaVersion !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001) {
    fail('ARTIFACT_INVALID', '正式意味発話成果物のschema版が不正です');
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
    || !Number.isSafeInteger(value.segmentCount) || (value.segmentCount as number) < 1
    || !Number.isSafeInteger(value.utteranceCount) || (value.utteranceCount as number) < 1
    || !Array.isArray(value.utterances)
    || value.utterances.length !== value.utteranceCount) {
    fail('ARTIFACT_INVALID', '正式意味発話成果物の概要値が不正です');
  }

  const coveredIds = new Set<number>();
  let coveredCount = 0;
  for (const [index, item] of value.utterances.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'utteranceId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs', 'sourceSegmentIds'
    ])) {
      fail('ARTIFACT_INVALID', `正式意味発話 ${index + 1}件目の構造が不正です`);
    }
    if (item.utteranceId !== `semantic-utterance-${String(index + 1).padStart(6, '0')}`
      || item.ordinal !== index + 1
      || typeof item.text !== 'string'
      || item.text.length === 0) {
      fail('ARTIFACT_INVALID', `正式意味発話 ${index + 1}件目のID・順序・本文が不正です`);
    }
    assertSafeTime(item.sourceStartMs, `正式意味発話 ${index + 1}件目の開始時刻`);
    assertSafeTime(item.sourceEndMs, `正式意味発話 ${index + 1}件目の終了時刻`);
    if (item.sourceEndMs < item.sourceStartMs
      || !Array.isArray(item.sourceSegmentIds)
      || item.sourceSegmentIds.length === 0) {
      fail('ARTIFACT_INVALID', `正式意味発話 ${index + 1}件目の時刻またはSTT断片参照が不正です`);
    }
    for (const segmentId of item.sourceSegmentIds) {
      if (!Number.isSafeInteger(segmentId) || segmentId <= 0 || coveredIds.has(segmentId)) {
        fail('ARTIFACT_INVALID', `正式意味発話 ${index + 1}件目のSTT断片参照が不正です`);
      }
      coveredIds.add(segmentId);
      coveredCount += 1;
    }
  }
  if (coveredCount !== value.segmentCount) {
    fail('ARTIFACT_INVALID', '正式意味発話成果物のSTT断片件数が概要値と一致しません');
  }
}

export function decodeSemanticUtteranceArtifactV001(bytes: Uint8Array): SemanticUtteranceArtifactV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('ARTIFACT_INVALID', '正式意味発話成果物がJSONとして読めません', error);
  }
  assertSemanticUtteranceArtifactV001(value);
  return value;
}

export function validateSemanticUtteranceArtifactAgainstTranscriptBytesV001(
  artifact: unknown,
  input: BuildFromBytesInput
): void {
  assertSemanticUtteranceArtifactV001(artifact);
  if (artifact.sourceTranscriptBinding.path !== input.sourceTranscriptPath) {
    fail('ARTIFACT_BINDING_MISMATCH', '成果物が束縛する元transcriptのpathと実入力が一致しません');
  }
  const actualSha256 = sha256(input.sourceTranscriptBytes);
  if (artifact.sourceTranscriptBinding.fileSha256 !== actualSha256) {
    fail('TRANSCRIPT_SHA_MISMATCH', '成果物が束縛する元transcriptのSHA-256と実入力が一致しません');
  }
  const rebuilt = buildSemanticUtteranceArtifactFromTranscriptBytesV001(input);
  const actualBytes = serializeSemanticUtteranceArtifactV001(artifact);
  const rebuiltBytes = serializeSemanticUtteranceArtifactV001(rebuilt);
  if (!actualBytes.equals(rebuiltBytes)) {
    fail('ARTIFACT_BINDING_MISMATCH', '正式意味発話成果物が元transcriptからの決定的再構築結果と一致しません');
  }
}

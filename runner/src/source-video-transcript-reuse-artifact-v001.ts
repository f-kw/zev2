import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {SttSegment, TranscriptArtifact} from './workflow-artifacts.js';
import {assertTranscriptArtifact} from './workflow-artifact-validation.js';

export const SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001 =
  'source-video-transcript-reuse-artifact-v001';
export const SOURCE_TRANSCRIPT_SCHEMA_V001 = 'transcript-json-v001';
export const SOURCE_DURATION_NORMALIZATION_V001 = 'nearest-millisecond-v001';

export const SOURCE_VIDEO_TRANSCRIPT_REUSE_ERROR_CODES_V001 = Object.freeze([
  'INPUT_INVALID',
  'SOURCE_VIDEO_SHA_MISMATCH',
  'SOURCE_VIDEO_DURATION_MISMATCH',
  'SOURCE_VIDEO_ID_MISMATCH',
  'TRANSCRIPT_INVALID',
  'TRANSCRIPT_SHA_MISMATCH',
  'TRANSCRIPT_SOURCE_MISMATCH',
  'TRANSCRIPT_CHRONOLOGY_INVALID',
  'TRANSCRIPT_COVERAGE_INVALID',
  'ARTIFACT_INVALID',
  'ARTIFACT_BINDING_MISMATCH'
] as const);

export type SourceVideoTranscriptReuseErrorCodeV001 =
  typeof SOURCE_VIDEO_TRANSCRIPT_REUSE_ERROR_CODES_V001[number];

export class SourceVideoTranscriptReuseArtifactErrorV001 extends Error {
  readonly code: SourceVideoTranscriptReuseErrorCodeV001;

  constructor(code: SourceVideoTranscriptReuseErrorCodeV001, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SourceVideoTranscriptReuseArtifactErrorV001';
    this.code = code;
  }
}

export type SourceVideoTranscriptReuseArtifactV001 = {
  schemaVersion: typeof SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001;
  sourceVideoId: string;
  sourceVideoBinding: {
    path: string;
    fileSha256: string;
    measuredDurationMs: number;
  };
  approvedSourceIdentity: {
    fileSha256: string;
    durationMs: number;
  };
  sourceTranscriptBinding: {
    path: string;
    schemaVersion: typeof SOURCE_TRANSCRIPT_SCHEMA_V001;
    fileSha256: string;
    mode: TranscriptArtifact['mode'];
    sourceUri: string;
    durationNormalization: typeof SOURCE_DURATION_NORMALIZATION_V001;
    durationMs: number;
  };
  transcriptCoverage: {
    segmentCount: number;
    speechUnitGroupCount: number;
    coveredSegmentCount: number;
    firstSegmentStartMs: number;
    lastSegmentEndMs: number;
  };
};

export type BuildSourceVideoTranscriptReuseFromBytesInputV001 = {
  workspaceRoot: string;
  sourceVideoId: string;
  sourceVideoPath: string;
  sourceVideoBytes: Uint8Array;
  measuredSourceVideoDurationMs: number;
  approvedSourceVideoSha256: string;
  approvedSourceVideoDurationMs: number;
  sourceTranscriptPath: string;
  sourceTranscriptBytes: Uint8Array;
};

export type BuildSourceVideoTranscriptReuseFromFilesInputV001 = Omit<
  BuildSourceVideoTranscriptReuseFromBytesInputV001,
  'sourceVideoBytes' | 'sourceTranscriptBytes'
>;

export type WriteSourceVideoTranscriptReuseFromFilesInputV001 =
  BuildSourceVideoTranscriptReuseFromFilesInputV001 & {outputPath: string};

const SHA256 = /^[0-9a-f]{64}$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

function fail(
  code: SourceVideoTranscriptReuseErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new SourceVideoTranscriptReuseArtifactErrorV001(
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

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertWorkspaceRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('INPUT_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertSourceVideoId(value: unknown, code: SourceVideoTranscriptReuseErrorCodeV001): asserts value is string {
  if (typeof value !== 'string' || !SOURCE_VIDEO_ID.test(value)) {
    fail(code, '元動画IDが不正です');
  }
}

function assertSha256(value: unknown, label: string, code: SourceVideoTranscriptReuseErrorCodeV001): asserts value is string {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    fail(code, `${label}がSHA-256ではありません`);
  }
}

function assertSafeDuration(
  value: unknown,
  label: string,
  code: SourceVideoTranscriptReuseErrorCodeV001
): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    fail(code, `${label}は正の安全な整数ミリ秒である必要があります`);
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

function parseTranscript(bytes: Uint8Array): TranscriptArtifact {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
    assertTranscriptArtifact(value);
  } catch (error) {
    fail('TRANSCRIPT_INVALID', '既存transcriptを正式な文字起こし成果物として読めません', error);
  }
  return value as TranscriptArtifact;
}

function sourceVideoIdFromReference(reference: string): string {
  let candidate = reference;
  try {
    const parsed = new URL(reference);
    if (parsed.hostname === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (parsed.hostname.endsWith('youtube.com')) {
      candidate = parsed.searchParams.get('v') ?? path.basename(parsed.pathname);
    } else if (parsed.protocol === 'file:') {
      candidate = path.basename(fileURLToPath(parsed));
    } else {
      candidate = path.basename(parsed.pathname);
    }
  } catch {
    candidate = path.basename(reference.split(/[?#]/u, 1)[0]);
  }
  const extension = path.extname(candidate);
  const sourceVideoId = extension ? candidate.slice(0, -extension.length) : candidate;
  assertSourceVideoId(sourceVideoId, 'SOURCE_VIDEO_ID_MISMATCH');
  return sourceVideoId;
}

function transcriptDurationMs(transcript: TranscriptArtifact): number {
  const durationMs = Math.round(transcript.durationSec * 1000);
  assertSafeDuration(durationMs, 'transcriptの動画尺', 'TRANSCRIPT_INVALID');
  return durationMs;
}

function assertSegmentChronologyAndBounds(segments: SttSegment[], durationMs: number): void {
  let previous: SttSegment | undefined;
  for (const segment of segments) {
    if (!Number.isSafeInteger(segment.startMs)
      || !Number.isSafeInteger(segment.endMs)
      || segment.startMs < 0
      || segment.endMs <= segment.startMs
      || segment.endMs > durationMs) {
      fail(
        'TRANSCRIPT_CHRONOLOGY_INVALID',
        `STT断片ID ${segment.id} の時刻が元動画尺内の正しい区間ではありません`
      );
    }
    if (previous && (
      segment.startMs < previous.startMs
      || (segment.startMs === previous.startMs && segment.endMs < previous.endMs)
    )) {
      fail('TRANSCRIPT_CHRONOLOGY_INVALID', `STT断片ID ${segment.id} が時系列順ではありません`);
    }
    previous = segment;
  }
}

function assertCompleteSpeechUnitCoverage(transcript: TranscriptArtifact): void {
  const expectedIds = transcript.segments.map((segment) => segment.id);
  const knownIds = new Set(expectedIds);
  const seen = new Set<number>();
  const flattened: number[] = [];

  for (const [groupIndex, group] of transcript.speechUnitGroups.entries()) {
    if (group.length === 0) {
      fail('TRANSCRIPT_COVERAGE_INVALID', `発話まとまり ${groupIndex + 1}件目が空です`);
    }
    for (const segmentId of group) {
      if (!knownIds.has(segmentId)) {
        fail('TRANSCRIPT_COVERAGE_INVALID', `発話まとまりが未知のSTT断片ID ${segmentId} を参照しています`);
      }
      if (seen.has(segmentId)) {
        fail('TRANSCRIPT_COVERAGE_INVALID', `STT断片ID ${segmentId} が複数回使われています`);
      }
      seen.add(segmentId);
      flattened.push(segmentId);
    }
  }

  if (seen.size !== expectedIds.length) {
    fail('TRANSCRIPT_COVERAGE_INVALID', '発話まとまりに所属しないSTT断片があります');
  }
  if (flattened.some((segmentId, index) => segmentId !== expectedIds[index])) {
    fail('TRANSCRIPT_COVERAGE_INVALID', '発話まとまりが元STT断片の順序を変更しています');
  }
}

function buildSourceVideoTranscriptReuseArtifactFromKnownVideoShaV001(
  input: Omit<BuildSourceVideoTranscriptReuseFromBytesInputV001, 'sourceVideoBytes'>,
  actualVideoSha256: string
): SourceVideoTranscriptReuseArtifactV001 {
  if (typeof input.workspaceRoot !== 'string' || !path.isAbsolute(input.workspaceRoot)) {
    fail('INPUT_INVALID', 'workspace rootは絶対pathである必要があります');
  }
  assertSourceVideoId(input.sourceVideoId, 'INPUT_INVALID');
  assertWorkspaceRelativePath(input.sourceVideoPath, '元動画path');
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '既存transcript path');
  assertSha256(input.approvedSourceVideoSha256, '承認済み元動画SHA-256', 'INPUT_INVALID');
  assertSafeDuration(
    input.measuredSourceVideoDurationMs,
    '実測元動画尺',
    'INPUT_INVALID'
  );
  assertSafeDuration(
    input.approvedSourceVideoDurationMs,
    '承認済み元動画尺',
    'INPUT_INVALID'
  );
  if (actualVideoSha256 !== input.approvedSourceVideoSha256) {
    fail(
      'SOURCE_VIDEO_SHA_MISMATCH',
      `取得動画のSHA-256 ${actualVideoSha256} が承認済み履歴値と一致しません`
    );
  }
  if (input.measuredSourceVideoDurationMs !== input.approvedSourceVideoDurationMs) {
    fail(
      'SOURCE_VIDEO_DURATION_MISMATCH',
      `取得動画の実測尺 ${input.measuredSourceVideoDurationMs}ms が承認済み履歴値と一致しません`
    );
  }

  const transcript = parseTranscript(input.sourceTranscriptBytes);
  if (sourceVideoIdFromReference(transcript.sourceUri) !== input.sourceVideoId) {
    fail('SOURCE_VIDEO_ID_MISMATCH', '既存transcriptの動画参照が取得動画IDと一致しません');
  }
  const durationMs = transcriptDurationMs(transcript);
  if (durationMs !== input.measuredSourceVideoDurationMs) {
    fail(
      'SOURCE_VIDEO_DURATION_MISMATCH',
      `既存transcriptの動画尺 ${durationMs}ms が取得動画の実測尺と一致しません`
    );
  }
  assertSegmentChronologyAndBounds(transcript.segments, durationMs);
  assertCompleteSpeechUnitCoverage(transcript);

  return {
    schemaVersion: SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001,
    sourceVideoId: input.sourceVideoId,
    sourceVideoBinding: {
      path: input.sourceVideoPath,
      fileSha256: actualVideoSha256,
      measuredDurationMs: input.measuredSourceVideoDurationMs
    },
    approvedSourceIdentity: {
      fileSha256: input.approvedSourceVideoSha256,
      durationMs: input.approvedSourceVideoDurationMs
    },
    sourceTranscriptBinding: {
      path: input.sourceTranscriptPath,
      schemaVersion: SOURCE_TRANSCRIPT_SCHEMA_V001,
      fileSha256: sha256(input.sourceTranscriptBytes),
      mode: transcript.mode,
      sourceUri: transcript.sourceUri,
      durationNormalization: SOURCE_DURATION_NORMALIZATION_V001,
      durationMs
    },
    transcriptCoverage: {
      segmentCount: transcript.segments.length,
      speechUnitGroupCount: transcript.speechUnitGroups.length,
      coveredSegmentCount: transcript.segments.length,
      firstSegmentStartMs: transcript.segments[0].startMs,
      lastSegmentEndMs: transcript.segments[transcript.segments.length - 1].endMs
    }
  };
}

export function buildSourceVideoTranscriptReuseArtifactFromBytesV001(
  input: BuildSourceVideoTranscriptReuseFromBytesInputV001
): SourceVideoTranscriptReuseArtifactV001 {
  if (!(input.sourceVideoBytes instanceof Uint8Array)) {
    fail('INPUT_INVALID', '元動画はbyte列である必要があります');
  }
  return buildSourceVideoTranscriptReuseArtifactFromKnownVideoShaV001(
    input,
    sha256(input.sourceVideoBytes)
  );
}

export async function buildSourceVideoTranscriptReuseArtifactFromFilesV001(
  input: BuildSourceVideoTranscriptReuseFromFilesInputV001
): Promise<SourceVideoTranscriptReuseArtifactV001> {
  assertWorkspaceRelativePath(input.sourceVideoPath, '元動画path');
  assertWorkspaceRelativePath(input.sourceTranscriptPath, '既存transcript path');
  const sourceVideoAbsolutePath = path.join(input.workspaceRoot, input.sourceVideoPath);
  const [actualVideoSha256, sourceTranscriptBytes] = await Promise.all([
    sha256File(sourceVideoAbsolutePath),
    readFile(path.join(input.workspaceRoot, input.sourceTranscriptPath))
  ]);
  return buildSourceVideoTranscriptReuseArtifactFromKnownVideoShaV001(
    {...input, sourceTranscriptBytes},
    actualVideoSha256
  );
}

export function assertSourceVideoTranscriptReuseArtifactV001(
  value: unknown
): asserts value is SourceVideoTranscriptReuseArtifactV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceVideoId',
    'sourceVideoBinding',
    'approvedSourceIdentity',
    'sourceTranscriptBinding',
    'transcriptCoverage'
  ])) {
    fail('ARTIFACT_INVALID', '動画・既存文字起こし再利用成果物のroot構造が不正です');
  }
  if (value.schemaVersion !== SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001) {
    fail('ARTIFACT_INVALID', '動画・既存文字起こし再利用成果物のschema版が不正です');
  }
  assertSourceVideoId(value.sourceVideoId, 'ARTIFACT_INVALID');

  if (!isRecord(value.sourceVideoBinding) || !hasExactKeys(value.sourceVideoBinding, [
    'path', 'fileSha256', 'measuredDurationMs'
  ])) {
    fail('ARTIFACT_INVALID', '元動画bindingの構造が不正です');
  }
  assertWorkspaceRelativePath(value.sourceVideoBinding.path, '元動画binding path');
  assertSha256(value.sourceVideoBinding.fileSha256, '元動画binding SHA-256', 'ARTIFACT_INVALID');
  assertSafeDuration(
    value.sourceVideoBinding.measuredDurationMs,
    '元動画bindingの実測尺',
    'ARTIFACT_INVALID'
  );
  if (!isRecord(value.approvedSourceIdentity) || !hasExactKeys(value.approvedSourceIdentity, [
    'fileSha256', 'durationMs'
  ])) {
    fail('ARTIFACT_INVALID', '承認済み元動画同一性の構造が不正です');
  }
  assertSha256(
    value.approvedSourceIdentity.fileSha256,
    '承認済み元動画SHA-256',
    'ARTIFACT_INVALID'
  );
  assertSafeDuration(
    value.approvedSourceIdentity.durationMs,
    '承認済み元動画尺',
    'ARTIFACT_INVALID'
  );
  if (value.sourceVideoBinding.fileSha256 !== value.approvedSourceIdentity.fileSha256) {
    fail('ARTIFACT_INVALID', '元動画SHA-256が承認済み同一性と一致しません');
  }
  if (value.sourceVideoBinding.measuredDurationMs !== value.approvedSourceIdentity.durationMs) {
    fail('ARTIFACT_INVALID', '元動画尺が承認済み同一性と一致しません');
  }

  if (!isRecord(value.sourceTranscriptBinding) || !hasExactKeys(value.sourceTranscriptBinding, [
    'path', 'schemaVersion', 'fileSha256', 'mode', 'sourceUri',
    'durationNormalization', 'durationMs'
  ])) {
    fail('ARTIFACT_INVALID', '既存transcript bindingの構造が不正です');
  }
  assertWorkspaceRelativePath(value.sourceTranscriptBinding.path, '既存transcript binding path');
  if (value.sourceTranscriptBinding.schemaVersion !== SOURCE_TRANSCRIPT_SCHEMA_V001
    || !['zev-local-stt', 'zev-local-stt-chunked', 'zev-sample-stt'].includes(
      value.sourceTranscriptBinding.mode as string
    )
    || typeof value.sourceTranscriptBinding.sourceUri !== 'string'
    || value.sourceTranscriptBinding.sourceUri.length === 0
    || value.sourceTranscriptBinding.durationNormalization !== SOURCE_DURATION_NORMALIZATION_V001) {
    fail('ARTIFACT_INVALID', '既存transcript bindingの版・作成方法・動画参照が不正です');
  }
  assertSha256(
    value.sourceTranscriptBinding.fileSha256,
    '既存transcript binding SHA-256',
    'ARTIFACT_INVALID'
  );
  assertSafeDuration(
    value.sourceTranscriptBinding.durationMs,
    '既存transcript bindingの動画尺',
    'ARTIFACT_INVALID'
  );
  if (value.sourceTranscriptBinding.durationMs !== value.sourceVideoBinding.measuredDurationMs
    || sourceVideoIdFromReference(value.sourceTranscriptBinding.sourceUri) !== value.sourceVideoId) {
    fail('ARTIFACT_INVALID', '既存transcript bindingの元動画同一性が不正です');
  }

  if (!isRecord(value.transcriptCoverage) || !hasExactKeys(value.transcriptCoverage, [
    'segmentCount',
    'speechUnitGroupCount',
    'coveredSegmentCount',
    'firstSegmentStartMs',
    'lastSegmentEndMs'
  ])) {
    fail('ARTIFACT_INVALID', 'transcript完全被覆検査の構造が不正です');
  }
  const coverage = value.transcriptCoverage;
  if (!Number.isSafeInteger(coverage.segmentCount) || (coverage.segmentCount as number) < 1
    || !Number.isSafeInteger(coverage.speechUnitGroupCount)
    || (coverage.speechUnitGroupCount as number) < 1
    || coverage.coveredSegmentCount !== coverage.segmentCount
    || !Number.isSafeInteger(coverage.firstSegmentStartMs)
    || (coverage.firstSegmentStartMs as number) < 0
    || !Number.isSafeInteger(coverage.lastSegmentEndMs)
    || (coverage.lastSegmentEndMs as number) <= (coverage.firstSegmentStartMs as number)
    || (coverage.lastSegmentEndMs as number) > value.sourceVideoBinding.measuredDurationMs) {
    fail('ARTIFACT_INVALID', 'transcript完全被覆検査の値が不正です');
  }
}

export function serializeSourceVideoTranscriptReuseArtifactV001(
  artifact: SourceVideoTranscriptReuseArtifactV001
): Buffer {
  assertSourceVideoTranscriptReuseArtifactV001(artifact);
  return Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

export function decodeSourceVideoTranscriptReuseArtifactV001(
  bytes: Uint8Array
): SourceVideoTranscriptReuseArtifactV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('ARTIFACT_INVALID', '動画・既存文字起こし再利用成果物をJSONとして読めません', error);
  }
  assertSourceVideoTranscriptReuseArtifactV001(value);
  const formalBytes = serializeSourceVideoTranscriptReuseArtifactV001(value);
  if (!formalBytes.equals(Buffer.from(bytes))) {
    fail('ARTIFACT_INVALID', '動画・既存文字起こし再利用成果物がformal byteではありません');
  }
  return value;
}

export function validateSourceVideoTranscriptReuseArtifactAgainstBytesV001(
  artifact: unknown,
  input: BuildSourceVideoTranscriptReuseFromBytesInputV001
): void {
  assertSourceVideoTranscriptReuseArtifactV001(artifact);
  if (artifact.sourceVideoBinding.fileSha256 !== sha256(input.sourceVideoBytes)) {
    fail('SOURCE_VIDEO_SHA_MISMATCH', '成果物が束縛する元動画SHA-256と実入力が一致しません');
  }
  if (artifact.sourceTranscriptBinding.fileSha256 !== sha256(input.sourceTranscriptBytes)) {
    fail('TRANSCRIPT_SHA_MISMATCH', '成果物が束縛する既存transcript SHA-256と実入力が一致しません');
  }
  const rebuilt = buildSourceVideoTranscriptReuseArtifactFromBytesV001(input);
  if (!serializeSourceVideoTranscriptReuseArtifactV001(artifact).equals(
    serializeSourceVideoTranscriptReuseArtifactV001(rebuilt)
  )) {
    fail('ARTIFACT_BINDING_MISMATCH', '成果物が同じ入力からの決定的再構築結果と一致しません');
  }
}

export async function writeSourceVideoTranscriptReuseArtifactFromFilesV001(
  input: WriteSourceVideoTranscriptReuseFromFilesInputV001
): Promise<{artifact: SourceVideoTranscriptReuseArtifactV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  const artifact = await buildSourceVideoTranscriptReuseArtifactFromFilesV001(input);
  const bytes = serializeSourceVideoTranscriptReuseArtifactV001(artifact);
  const outputAbsolutePath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolutePath), {recursive: true});
  await writeFile(outputAbsolutePath, bytes, {flag: 'wx'});
  return {artifact, bytes};
}

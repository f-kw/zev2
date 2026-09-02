import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  decodeDistantConnectionComparisonCandidateResponseV001
} from './distant-connection-comparison-luna-b6-result-v001.js';
import {
  DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001,
  decodeDistantConnectionCommonUtteranceArtifactV001,
  type DistantConnectionCommonUtteranceArtifactV001,
  type DistantConnectionCommonUtteranceV001
} from './distant-connection-common-utterance-artifact-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001
} from './distant-connection-comparison-source-package-v001.js';
import {
  SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001,
  decodeSourceVideoTranscriptReuseArtifactV001
} from './source-video-transcript-reuse-artifact-v001.js';

export const DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001 =
  'distant-connection-candidate-review-source-projection-v001';
export const DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002 =
  'distant-connection-candidate-review-job-v002';
export const DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002 =
  'distant-connection-candidate-review-result-v002';

const INDEXED_MODEL_INPUT_SCHEMA = 'distant-connection-comparison-indexed-model-input-v001';
const RAW_RESPONSE_SCHEMA = 'openai-responses-distant-connection-comparison-raw-v001';
const ARTIFACT_CLASSIFICATION = 'candidate-human-review-artifact';
export const DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002 =
  '本成果物は正式selection前の比較候補を人間が段階確認するため、正式候補が選んだ発話の無拡張区間を後半のみ、および前半から後半の順で元映像・元音声へ決定的に投影する。候補探索、候補採否、区間拡張、字幕、正式renderer、完成short、技術QCを所有しない。';

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const CANDIDATE_ID = /^candidate-[0-9a-f]{64}$/u;
const WORKSPACE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

type RecordValue = Record<string, unknown>;

export type CandidateReviewFormalBindingV002 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type CandidateReviewByteBindingV002 = {
  path: string;
  fileSha256: string;
};

export type CandidateReviewSourceVideoBindingV002 = CandidateReviewByteBindingV002 & {
  measuredDurationMs: number;
};

export type CandidateReviewSourceIntervalV002 = {
  sourceStartMs: number;
  sourceEndMs: number;
};

export type CandidateReviewProjectedPartV002 = {
  part: 'first' | 'second';
  selectedUtteranceIds: string[];
  selectedOrdinals: number[];
  sourceInterval: CandidateReviewSourceIntervalV002;
};

export type CandidateReviewProjectedCandidateV002 = {
  candidateId: string;
  candidateOrdinal: number;
  anchorId: string;
  firstPart: CandidateReviewProjectedPartV002;
  secondPart: CandidateReviewProjectedPartV002;
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

export type DistantConnectionCandidateReviewSourceProjectionV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001;
  projectionId: string;
  sourceVideoId: string;
  sourceBindings: {
    candidateResponse: CandidateReviewFormalBindingV002;
    commonUtterance: CandidateReviewFormalBindingV002;
    sourcePackage: CandidateReviewFormalBindingV002;
    sourceReuse: CandidateReviewFormalBindingV002;
    indexedModelInput: CandidateReviewFormalBindingV002;
    rawResponse: CandidateReviewFormalBindingV002;
    sourceVideo: CandidateReviewSourceVideoBindingV002;
  };
  candidates: CandidateReviewProjectedCandidateV002[];
  responsibilityPrinciple: string;
};

export type CandidateReviewStageV002 = 'second-only' | 'first-then-second';

export type CandidateReviewFfmpegPlanV002 = {
  executable: 'ffmpeg';
  args: string[];
};

export type CandidateReviewJobStageV002 = {
  stage: CandidateReviewStageV002;
  evaluatedParts: CandidateReviewProjectedPartV002[];
  output: {path: string; container: 'mp4'};
  ffmpeg: CandidateReviewFfmpegPlanV002;
};

export type CandidateReviewJobCandidateV002 = {
  candidateId: string;
  candidateOrdinal: number;
  reviewStages: {
    secondOnly: CandidateReviewJobStageV002;
    firstThenSecond: CandidateReviewJobStageV002;
  };
};

type CandidateReviewStatusFlagsV002 = {
  formalSelection: false;
  formalRenderer: false;
  completedShort: false;
  technicalQcCompleted: false;
};

export type DistantConnectionCandidateReviewJobV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002;
  jobId: string;
  artifactClassification: typeof ARTIFACT_CLASSIFICATION;
  sourceVideoId: string;
  sourceProjectionBinding: CandidateReviewFormalBindingV002;
  candidateResponseBinding: CandidateReviewFormalBindingV002;
  sourceVideoBinding: CandidateReviewSourceVideoBindingV002;
  candidates: CandidateReviewJobCandidateV002[];
  statusFlags: CandidateReviewStatusFlagsV002;
  responsibilityPrinciple: string;
};

export type CandidateReviewMediaInspectionV002 = {
  durationMs: number;
  videoPresent: true;
  audioPresent: true;
};

export type CandidateReviewArtifactV002 = {
  stage: CandidateReviewStageV002;
  videoBinding: CandidateReviewByteBindingV002;
  mediaInspection: CandidateReviewMediaInspectionV002;
  evaluatedParts: CandidateReviewProjectedPartV002[];
};

export type CandidateReviewResultCandidateV002 = {
  candidateId: string;
  candidateOrdinal: number;
  reviewArtifacts: {
    secondOnly: CandidateReviewArtifactV002;
    firstThenSecond: CandidateReviewArtifactV002;
  };
};

export type DistantConnectionCandidateReviewResultV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002;
  resultId: string;
  artifactClassification: typeof ARTIFACT_CLASSIFICATION;
  sourceVideoId: string;
  generatedAt: string;
  sourceProjectionBinding: CandidateReviewFormalBindingV002;
  candidateResponseBinding: CandidateReviewFormalBindingV002;
  reviewJobBinding: CandidateReviewFormalBindingV002;
  sourceVideoBinding: CandidateReviewSourceVideoBindingV002;
  candidates: CandidateReviewResultCandidateV002[];
  generationStatus: 'succeeded';
  statusFlags: CandidateReviewStatusFlagsV002;
  responsibilityPrinciple: string;
};

export type BuildCandidateReviewSourceProjectionInputV001 = {
  projectionId: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  commonUtterancePath: string;
  commonUtteranceBytes: Uint8Array;
  expectedCommonUtteranceSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  expectedSourcePackageSha256: string;
  sourceReusePath: string;
  sourceReuseBytes: Uint8Array;
  expectedSourceReuseSha256: string;
  indexedModelInputPath: string;
  indexedModelInputBytes: Uint8Array;
  expectedIndexedModelInputSha256: string;
  rawResponsePath: string;
  rawResponseBytes: Uint8Array;
  expectedRawResponseSha256: string;
  sourceVideoPath: string;
  observedSourceVideoSha256: string;
  expectedSourceVideoSha256: string;
};

export type BuildCandidateReviewSourceProjectionFromFilesInputV001 = Omit<
  BuildCandidateReviewSourceProjectionInputV001,
  | 'candidateResponseBytes'
  | 'commonUtteranceBytes'
  | 'sourcePackageBytes'
  | 'sourceReuseBytes'
  | 'indexedModelInputBytes'
  | 'rawResponseBytes'
  | 'observedSourceVideoSha256'
> & {workspaceRoot: string};

export type BuildDistantConnectionCandidateReviewJobInputV002 = {
  jobId: string;
  sourceProjectionPath: string;
  sourceProjectionBytes: Uint8Array;
  expectedSourceProjectionSha256: string;
  sourceVideoPath: string;
  observedSourceVideoSha256: string;
  expectedSourceVideoSha256: string;
  candidateOutputs: Array<{
    candidateId: string;
    secondOnlyOutputPath: string;
    firstThenSecondOutputPath: string;
  }>;
};

export type BuildCandidateReviewResultArtifactInputV002 = {
  candidateId: string;
  secondOnly: {
    videoPath: string;
    observedVideoSha256: string;
    expectedVideoSha256: string;
    observedDurationMs: number;
    observedVideoPresent: boolean;
    observedAudioPresent: boolean;
  };
  firstThenSecond: {
    videoPath: string;
    observedVideoSha256: string;
    expectedVideoSha256: string;
    observedDurationMs: number;
    observedVideoPresent: boolean;
    observedAudioPresent: boolean;
  };
};

export type BuildDistantConnectionCandidateReviewResultInputV002 = {
  resultId: string;
  generatedAt: string;
  sourceProjectionPath: string;
  sourceProjectionBytes: Uint8Array;
  expectedSourceProjectionSha256: string;
  reviewJobPath: string;
  reviewJobBytes: Uint8Array;
  expectedReviewJobSha256: string;
  candidateArtifacts: BuildCandidateReviewResultArtifactInputV002[];
};

export class DistantConnectionCandidateReviewErrorV002 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionCandidateReviewErrorV002';
  }
}

function fail(message: string): never {
  throw new DistantConnectionCandidateReviewErrorV002(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function formalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parse(bytes: Uint8Array, label: string): RecordValue {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
  if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
  return value;
}

function assertId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !FORMAL_ID.test(value)) fail(`${label}が不正です`);
}

function assertCandidateId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !CANDIDATE_ID.test(value)) fail(`${label}が不正です`);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_PATH.test(value)) {
    fail(`${label}は安全なworkspace相対pathではありません`);
  }
}

function assertSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256.test(value)) fail(`${label}が不正です`);
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail(`${label}が正の安全な整数ではありません`);
}

function checkedSha(bytes: Uint8Array, expected: string, label: string): string {
  assertSha(expected, `${label}の指定SHA-256`);
  const actual = sha256(bytes);
  if (actual !== expected) fail(`${label}のSHA-256が一致しません`);
  return actual;
}

function checkedObservedSha(observed: string, expected: string, label: string): string {
  assertSha(observed, `${label}の実測SHA-256`);
  assertSha(expected, `${label}の指定SHA-256`);
  if (observed !== expected) fail(`${label}のSHA-256が一致しません`);
  return observed;
}

function binding(
  filePath: string,
  schemaVersion: string,
  fileSha256: string
): CandidateReviewFormalBindingV002 {
  assertPath(filePath, '正式成果物path');
  assertId(schemaVersion, '正式成果物schema');
  assertSha(fileSha256, '正式成果物SHA-256');
  return {path: filePath, schemaVersion, fileSha256};
}

function assertFormalBinding(
  value: unknown,
  label: string
): asserts value is CandidateReviewFormalBindingV002 {
  if (!isRecord(value) || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])) {
    fail(`${label}の構造が不正です`);
  }
  assertPath(value.path, `${label}のpath`);
  assertId(value.schemaVersion, `${label}のschema`);
  assertSha(value.fileSha256, `${label}のSHA-256`);
}

function assertByteBinding(
  value: unknown,
  label: string
): asserts value is CandidateReviewByteBindingV002 {
  if (!isRecord(value) || !exactKeys(value, ['path', 'fileSha256'])) fail(`${label}の構造が不正です`);
  assertPath(value.path, `${label}のpath`);
  assertSha(value.fileSha256, `${label}のSHA-256`);
}

function assertSourceVideoBinding(
  value: unknown,
  label: string
): asserts value is CandidateReviewSourceVideoBindingV002 {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'fileSha256', 'measuredDurationMs'])) {
    fail(`${label}の構造が不正です`);
  }
  assertPath(value.path, `${label}のpath`);
  assertSha(value.fileSha256, `${label}のSHA-256`);
  assertPositiveInteger(value.measuredDurationMs, `${label}の実測尺`);
}

function assertInterval(
  value: unknown,
  label: string
): asserts value is CandidateReviewSourceIntervalV002 {
  if (!isRecord(value)
    || !exactKeys(value, ['sourceStartMs', 'sourceEndMs'])
    || !Number.isSafeInteger(value.sourceStartMs)
    || !Number.isSafeInteger(value.sourceEndMs)
    || (value.sourceStartMs as number) < 0
    || (value.sourceEndMs as number) <= (value.sourceStartMs as number)) {
    fail(`${label}が不正です`);
  }
}

function assertStatusFlags(value: unknown): asserts value is CandidateReviewStatusFlagsV002 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'formalSelection', 'formalRenderer', 'completedShort', 'technicalQcCompleted'
    ])
    || value.formalSelection !== false
    || value.formalRenderer !== false
    || value.completedShort !== false
    || value.technicalQcCompleted !== false) {
    fail('candidate reviewの非正式状態が不正です');
  }
}

const STATUS_FLAGS: CandidateReviewStatusFlagsV002 = Object.freeze({
  formalSelection: false,
  formalRenderer: false,
  completedShort: false,
  technicalQcCompleted: false
});

function assertSelectedPart(
  value: unknown,
  expectedPart?: 'first' | 'second'
): asserts value is CandidateReviewProjectedPartV002 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'part', 'selectedUtteranceIds', 'selectedOrdinals', 'sourceInterval'
    ])
    || (value.part !== 'first' && value.part !== 'second')
    || (expectedPart !== undefined && value.part !== expectedPart)
    || !Array.isArray(value.selectedUtteranceIds)
    || !Array.isArray(value.selectedOrdinals)
    || value.selectedUtteranceIds.length === 0
    || value.selectedUtteranceIds.length !== value.selectedOrdinals.length
    || value.selectedUtteranceIds.some((id) => typeof id !== 'string' || !FORMAL_ID.test(id))
    || new Set(value.selectedUtteranceIds).size !== value.selectedUtteranceIds.length
    || value.selectedOrdinals.some((ordinal) => !Number.isSafeInteger(ordinal) || ordinal < 1)
    || new Set(value.selectedOrdinals).size !== value.selectedOrdinals.length) {
    fail(`${expectedPart ?? 'candidate'} partの発話参照が不正です`);
  }
  for (let index = 1; index < value.selectedOrdinals.length; index += 1) {
    if (value.selectedOrdinals[index]! <= value.selectedOrdinals[index - 1]!) {
      fail(`${value.part} partの発話順序が逆転しています`);
    }
  }
  assertInterval(value.sourceInterval, `${value.part} partの元動画区間`);
}

function assertProjectedCandidate(
  value: unknown,
  expectedOrdinal: number
): asserts value is CandidateReviewProjectedCandidateV002 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'candidateId', 'candidateOrdinal', 'anchorId', 'firstPart', 'secondPart',
      'addedUnderstanding', 'direction'
    ])) fail(`候補${expectedOrdinal}件目の構造が不正です`);
  assertCandidateId(value.candidateId, `候補${expectedOrdinal}件目のID`);
  if (value.candidateOrdinal !== expectedOrdinal) fail('候補配列順またはordinalが不正です');
  assertId(value.anchorId, `候補${expectedOrdinal}件目のanchor ID`);
  assertSelectedPart(value.firstPart, 'first');
  assertSelectedPart(value.secondPart, 'second');
  if (value.firstPart.selectedOrdinals.at(-1)! >= value.secondPart.selectedOrdinals[0]!
    || value.firstPart.sourceInterval.sourceEndMs > value.secondPart.sourceInterval.sourceStartMs) {
    fail(`候補${expectedOrdinal}件目の前半・後半順序が逆転または重複しています`);
  }
  if (new Set([
    ...value.firstPart.selectedUtteranceIds,
    ...value.secondPart.selectedUtteranceIds
  ]).size !== value.firstPart.selectedUtteranceIds.length
      + value.secondPart.selectedUtteranceIds.length) {
    fail(`候補${expectedOrdinal}件目の前半・後半発話が重複しています`);
  }
  if (typeof value.addedUnderstanding !== 'string' || value.addedUnderstanding.trim().length === 0
    || (value.direction !== 'past' && value.direction !== 'future')) {
    fail(`候補${expectedOrdinal}件目の説明または探索方向が不正です`);
  }
}

function resolvePart(
  part: 'first' | 'second',
  ids: string[],
  utteranceById: Map<string, DistantConnectionCommonUtteranceV001>
): CandidateReviewProjectedPartV002 {
  const rows = ids.map((id) => utteranceById.get(id)
    ?? fail(`${part}が未知の共通発話ID ${id} を参照しています`));
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]!.ordinal <= rows[index - 1]!.ordinal) {
      fail(`${part}の共通発話IDが時系列順ではありません`);
    }
  }
  return {
    part,
    selectedUtteranceIds: [...ids],
    selectedOrdinals: rows.map((row) => row.ordinal),
    sourceInterval: {
      sourceStartMs: rows[0]!.sourceStartMs,
      sourceEndMs: rows.at(-1)!.sourceEndMs
    }
  };
}

function inspectProjectionSources(input: BuildCandidateReviewSourceProjectionInputV001): {
  sourceVideoId: string;
  sourceVideoBinding: CandidateReviewSourceVideoBindingV002;
  sourceBindings: DistantConnectionCandidateReviewSourceProjectionV001['sourceBindings'];
  candidates: CandidateReviewProjectedCandidateV002[];
} {
  assertId(input.projectionId, 'projection ID');
  for (const [value, label] of [
    [input.candidateResponsePath, '正式候補path'],
    [input.commonUtterancePath, '共通発話path'],
    [input.sourcePackagePath, 'source package path'],
    [input.sourceReusePath, '動画・文字起こし再利用成果物path'],
    [input.indexedModelInputPath, 'index入力path'],
    [input.rawResponsePath, 'raw応答path'],
    [input.sourceVideoPath, '元動画path']
  ] as const) assertPath(value, label);

  const candidateResponseSha = checkedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  const commonUtteranceSha = checkedSha(
    input.commonUtteranceBytes,
    input.expectedCommonUtteranceSha256,
    '共通発話成果物'
  );
  const sourcePackageSha = checkedSha(
    input.sourcePackageBytes,
    input.expectedSourcePackageSha256,
    'comparison source package'
  );
  const sourceReuseSha = checkedSha(
    input.sourceReuseBytes,
    input.expectedSourceReuseSha256,
    '動画・文字起こし再利用成果物'
  );
  const indexedModelInputSha = checkedSha(
    input.indexedModelInputBytes,
    input.expectedIndexedModelInputSha256,
    'index入力成果物'
  );
  const rawResponseSha = checkedSha(
    input.rawResponseBytes,
    input.expectedRawResponseSha256,
    'raw応答成果物'
  );
  const sourceVideoSha = checkedObservedSha(
    input.observedSourceVideoSha256,
    input.expectedSourceVideoSha256,
    '元動画'
  );

  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(
    input.sourcePackageBytes
  );
  const commonUtterance = decodeDistantConnectionCommonUtteranceArtifactV001(
    input.commonUtteranceBytes
  );
  const sourceReuse = decodeSourceVideoTranscriptReuseArtifactV001(input.sourceReuseBytes);
  const candidateResponse = decodeDistantConnectionComparisonCandidateResponseV001(
    input.candidateResponseBytes,
    input.sourcePackagePath,
    input.sourcePackageBytes,
    input.indexedModelInputPath,
    input.indexedModelInputBytes,
    input.rawResponsePath,
    input.rawResponseBytes
  );

  if (sourcePackage.sourceReuseBinding.path !== input.sourceReusePath
    || sourcePackage.sourceReuseBinding.fileSha256 !== sourceReuseSha
    || sourcePackage.commonUtteranceBinding.path !== input.commonUtterancePath
    || sourcePackage.commonUtteranceBinding.fileSha256 !== commonUtteranceSha) {
    fail('comparison source packageが指定source reuse・共通発話を束縛していません');
  }
  if (JSON.stringify(sourcePackage.utterances) !== JSON.stringify(commonUtterance.utterances)
    || sourcePackage.sourceSegmentCount !== commonUtterance.sourceSegmentCount
    || sourcePackage.utteranceCount !== commonUtterance.utteranceCount) {
    fail('comparison source packageと共通発話の内容・完全被覆が一致しません');
  }
  if (sourceReuse.sourceTranscriptBinding.path !== commonUtterance.sourceTranscriptBinding.path
    || sourceReuse.sourceTranscriptBinding.fileSha256
      !== commonUtterance.sourceTranscriptBinding.fileSha256
    || sourceReuse.sourceTranscriptBinding.sourceUri !== commonUtterance.sourceUri
    || sourceReuse.sourceVideoId !== sourcePackage.sourceVideoId
    || sourceReuse.sourceVideoId !== candidateResponse.sourceVideoId) {
    fail('元動画・文字起こし・共通発話・source package・正式候補の動画同一性が不一致です');
  }
  if (sourceReuse.sourceVideoBinding.path !== input.sourceVideoPath
    || sourceReuse.sourceVideoBinding.fileSha256 !== sourceVideoSha) {
    fail('動画・文字起こし再利用成果物が指定元動画path・SHAを束縛していません');
  }
  if (candidateResponse.sourcePackageBinding.fileSha256 !== sourcePackageSha
    || candidateResponse.indexedModelInputBinding.fileSha256 !== indexedModelInputSha
    || candidateResponse.rawResponseBinding.fileSha256 !== rawResponseSha) {
    fail('正式候補のsource package・index入力・raw応答bindingが不一致です');
  }

  const utteranceById = new Map(
    commonUtterance.utterances.map((utterance) => [utterance.utteranceId, utterance])
  );
  const candidates = candidateResponse.candidates.map((candidate, index) => {
    const projected: CandidateReviewProjectedCandidateV002 = {
      candidateId: candidate.candidateId,
      candidateOrdinal: index + 1,
      anchorId: candidate.anchorId,
      firstPart: resolvePart('first', candidate.firstPartUtteranceIds, utteranceById),
      secondPart: resolvePart('second', candidate.secondPartUtteranceIds, utteranceById),
      addedUnderstanding: candidate.addedUnderstanding,
      direction: candidate.direction
    };
    assertProjectedCandidate(projected, index + 1);
    return projected;
  });
  if (candidates.length === 0) fail('確認対象の正式候補が0件です');

  const sourceVideoBinding = {
    path: input.sourceVideoPath,
    fileSha256: sourceVideoSha,
    measuredDurationMs: sourceReuse.sourceVideoBinding.measuredDurationMs
  };
  return {
    sourceVideoId: sourceReuse.sourceVideoId,
    sourceVideoBinding,
    sourceBindings: {
      candidateResponse: binding(
        input.candidateResponsePath,
        DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
        candidateResponseSha
      ),
      commonUtterance: binding(
        input.commonUtterancePath,
        DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001,
        commonUtteranceSha
      ),
      sourcePackage: binding(
        input.sourcePackagePath,
        DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
        sourcePackageSha
      ),
      sourceReuse: binding(
        input.sourceReusePath,
        SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001,
        sourceReuseSha
      ),
      indexedModelInput: binding(
        input.indexedModelInputPath,
        INDEXED_MODEL_INPUT_SCHEMA,
        indexedModelInputSha
      ),
      rawResponse: binding(input.rawResponsePath, RAW_RESPONSE_SCHEMA, rawResponseSha),
      sourceVideo: sourceVideoBinding
    },
    candidates
  };
}

export function buildDistantConnectionCandidateReviewSourceProjectionV001(
  input: BuildCandidateReviewSourceProjectionInputV001
): DistantConnectionCandidateReviewSourceProjectionV001 {
  const inspected = inspectProjectionSources(input);
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001,
    projectionId: input.projectionId,
    sourceVideoId: inspected.sourceVideoId,
    sourceBindings: inspected.sourceBindings,
    candidates: inspected.candidates,
    responsibilityPrinciple: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002
  };
}

export function assertDistantConnectionCandidateReviewSourceProjectionV001(
  value: unknown
): asserts value is DistantConnectionCandidateReviewSourceProjectionV001 {
  if (!isRecord(value) || !exactKeys(value, [
    'schemaVersion', 'projectionId', 'sourceVideoId', 'sourceBindings', 'candidates',
    'responsibilityPrinciple'
  ])) fail('candidate review source projectionのroot構造が不正です');
  if (value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001) {
    fail('candidate review source projectionのschemaが不正です');
  }
  assertId(value.projectionId, 'projection ID');
  assertId(value.sourceVideoId, '元動画ID');
  if (!isRecord(value.sourceBindings) || !exactKeys(value.sourceBindings, [
    'candidateResponse', 'commonUtterance', 'sourcePackage', 'sourceReuse',
    'indexedModelInput', 'rawResponse', 'sourceVideo'
  ])) fail('projectionの元成果物binding構造が不正です');
  for (const [key, schema] of [
    ['candidateResponse', DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001],
    ['commonUtterance', DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001],
    ['sourcePackage', DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001],
    ['sourceReuse', SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001],
    ['indexedModelInput', INDEXED_MODEL_INPUT_SCHEMA],
    ['rawResponse', RAW_RESPONSE_SCHEMA]
  ] as const) {
    const candidateBinding = value.sourceBindings[key];
    assertFormalBinding(candidateBinding, `projection ${key} binding`);
    if (candidateBinding.schemaVersion !== schema) fail(`projection ${key} schema bindingが不正です`);
  }
  assertSourceVideoBinding(value.sourceBindings.sourceVideo, 'projection元動画binding');
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    fail('projectionの候補配列が空または不正です');
  }
  const candidateIds = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    assertProjectedCandidate(candidate, index + 1);
    if (candidateIds.has(candidate.candidateId)) fail('projectionのcandidate IDが重複しています');
    candidateIds.add(candidate.candidateId);
    if (candidate.secondPart.sourceInterval.sourceEndMs
      > value.sourceBindings.sourceVideo.measuredDurationMs) {
      fail('projectionの候補区間が元動画尺を超えています');
    }
  }
  if (value.responsibilityPrinciple
    !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002) {
    fail('projectionの責務境界が不正です');
  }
}

export function serializeDistantConnectionCandidateReviewSourceProjectionV001(
  value: DistantConnectionCandidateReviewSourceProjectionV001
): Buffer {
  assertDistantConnectionCandidateReviewSourceProjectionV001(value);
  return formalBytes(value);
}

export function decodeDistantConnectionCandidateReviewSourceProjectionV001(
  bytes: Uint8Array
): DistantConnectionCandidateReviewSourceProjectionV001 {
  const value = parse(bytes, 'candidate review source projection');
  assertDistantConnectionCandidateReviewSourceProjectionV001(value);
  const serialized = serializeDistantConnectionCandidateReviewSourceProjectionV001(value);
  if (!serialized.equals(Buffer.from(bytes))) fail('source projectionがformal byteではありません');
  return value;
}

export function validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
  value: unknown,
  input: BuildCandidateReviewSourceProjectionInputV001
): void {
  assertDistantConnectionCandidateReviewSourceProjectionV001(value);
  const rebuilt = buildDistantConnectionCandidateReviewSourceProjectionV001(input);
  if (!serializeDistantConnectionCandidateReviewSourceProjectionV001(value)
    .equals(serializeDistantConnectionCandidateReviewSourceProjectionV001(rebuilt))) {
    fail('source projectionが同じ正式入力からの決定的再構築結果と一致しません');
  }
}

function seconds(milliseconds: number): string {
  return (milliseconds / 1_000).toFixed(3);
}

function buildFfmpegArgs(
  sourceVideoPath: string,
  outputPath: string,
  parts: CandidateReviewProjectedPartV002[]
): string[] {
  const inputs = parts.flatMap((part) => [
    '-ss', seconds(part.sourceInterval.sourceStartMs),
    '-to', seconds(part.sourceInterval.sourceEndMs),
    '-i', sourceVideoPath
  ]);
  const filterInputs = parts.map((_, index) => `[${index}:v:0][${index}:a:0]`).join('');
  return [
    '-hide_banner', '-nostdin', '-n',
    ...inputs,
    '-filter_complex', `${filterInputs}concat=n=${String(parts.length)}:v=1:a=1[outv][outa]`,
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart',
    outputPath
  ];
}

function buildStage(
  stage: CandidateReviewStageV002,
  sourceVideoPath: string,
  outputPath: string,
  parts: CandidateReviewProjectedPartV002[]
): CandidateReviewJobStageV002 {
  assertPath(outputPath, `${stage} MP4出力path`);
  if (path.extname(outputPath).toLowerCase() !== '.mp4') fail(`${stage}出力はMP4である必要があります`);
  const expectedParts = stage === 'second-only' ? ['second'] : ['first', 'second'];
  if (parts.length !== expectedParts.length
    || parts.some((part, index) => part.part !== expectedParts[index])) {
    fail(`${stage}の確認順が不正です`);
  }
  return {
    stage,
    evaluatedParts: structuredClone(parts),
    output: {path: outputPath, container: 'mp4'},
    ffmpeg: {executable: 'ffmpeg', args: buildFfmpegArgs(sourceVideoPath, outputPath, parts)}
  };
}

export function buildDistantConnectionCandidateReviewJobV002(
  input: BuildDistantConnectionCandidateReviewJobInputV002
): DistantConnectionCandidateReviewJobV002 {
  assertId(input.jobId, 'review job ID');
  assertPath(input.sourceProjectionPath, 'source projection path');
  const projectionSha = checkedSha(
    input.sourceProjectionBytes,
    input.expectedSourceProjectionSha256,
    'source projection'
  );
  const projection = decodeDistantConnectionCandidateReviewSourceProjectionV001(
    input.sourceProjectionBytes
  );
  assertPath(input.sourceVideoPath, '元動画path');
  const sourceVideoSha = checkedObservedSha(
    input.observedSourceVideoSha256,
    input.expectedSourceVideoSha256,
    '元動画'
  );
  if (input.sourceVideoPath !== projection.sourceBindings.sourceVideo.path
    || sourceVideoSha !== projection.sourceBindings.sourceVideo.fileSha256) {
    fail('review jobの元動画path・SHAがsource projectionと一致しません');
  }
  if (!Array.isArray(input.candidateOutputs)
    || input.candidateOutputs.length !== projection.candidates.length) {
    fail('review jobのcandidate出力指定が完全被覆ではありません');
  }
  const outputPaths = new Set<string>();
  const candidates = projection.candidates.map((candidate, index) => {
    const output = input.candidateOutputs[index];
    if (!output || output.candidateId !== candidate.candidateId) {
      fail('review jobのcandidate出力順・IDがprojectionと一致しません');
    }
    for (const outputPath of [output.secondOnlyOutputPath, output.firstThenSecondOutputPath]) {
      if (outputPaths.has(outputPath)) fail('review MP4出力pathが重複しています');
      outputPaths.add(outputPath);
    }
    return {
      candidateId: candidate.candidateId,
      candidateOrdinal: candidate.candidateOrdinal,
      reviewStages: {
        secondOnly: buildStage(
          'second-only',
          input.sourceVideoPath,
          output.secondOnlyOutputPath,
          [candidate.secondPart]
        ),
        firstThenSecond: buildStage(
          'first-then-second',
          input.sourceVideoPath,
          output.firstThenSecondOutputPath,
          [candidate.firstPart, candidate.secondPart]
        )
      }
    };
  });
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002,
    jobId: input.jobId,
    artifactClassification: ARTIFACT_CLASSIFICATION,
    sourceVideoId: projection.sourceVideoId,
    sourceProjectionBinding: binding(
      input.sourceProjectionPath,
      DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001,
      projectionSha
    ),
    candidateResponseBinding: structuredClone(projection.sourceBindings.candidateResponse),
    sourceVideoBinding: structuredClone(projection.sourceBindings.sourceVideo),
    candidates,
    statusFlags: {...STATUS_FLAGS},
    responsibilityPrinciple: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002
  };
}

function assertJobStage(
  value: unknown,
  expectedStage: CandidateReviewStageV002,
  expectedSourceVideoPath: string
): asserts value is CandidateReviewJobStageV002 {
  if (!isRecord(value)
    || !exactKeys(value, ['stage', 'evaluatedParts', 'output', 'ffmpeg'])
    || value.stage !== expectedStage
    || !Array.isArray(value.evaluatedParts)
    || !isRecord(value.output)
    || !exactKeys(value.output, ['path', 'container'])
    || value.output.container !== 'mp4'
    || !isRecord(value.ffmpeg)
    || !exactKeys(value.ffmpeg, ['executable', 'args'])
    || value.ffmpeg.executable !== 'ffmpeg'
    || !Array.isArray(value.ffmpeg.args)
    || value.ffmpeg.args.some((item) => typeof item !== 'string')) {
    fail(`${expectedStage} job stageの構造が不正です`);
  }
  assertPath(value.output.path, `${expectedStage}出力path`);
  if (path.extname(value.output.path).toLowerCase() !== '.mp4') fail(`${expectedStage}出力がMP4ではありません`);
  const expectedParts = expectedStage === 'second-only' ? ['second'] : ['first', 'second'];
  if (value.evaluatedParts.length !== expectedParts.length) fail(`${expectedStage}のpart数が不正です`);
  value.evaluatedParts.forEach((part, index) => assertSelectedPart(
    part,
    expectedParts[index] as 'first' | 'second'
  ));
  const expectedFfmpegArgs = buildFfmpegArgs(
    expectedSourceVideoPath,
    value.output.path,
    value.evaluatedParts
  );
  if (JSON.stringify(value.ffmpeg.args) !== JSON.stringify(expectedFfmpegArgs)) {
    fail(`${expectedStage}のffmpeg引数が元動画・区間・出力pathからの決定値と一致しません`);
  }
}

export function assertDistantConnectionCandidateReviewJobV002(
  value: unknown
): asserts value is DistantConnectionCandidateReviewJobV002 {
  if (!isRecord(value) || !exactKeys(value, [
    'schemaVersion', 'jobId', 'artifactClassification', 'sourceVideoId',
    'sourceProjectionBinding', 'candidateResponseBinding', 'sourceVideoBinding', 'candidates',
    'statusFlags', 'responsibilityPrinciple'
  ])) fail('candidate review job v002のroot構造が不正です');
  if (value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002
    || value.artifactClassification !== ARTIFACT_CLASSIFICATION) fail('review job v002の版・分類が不正です');
  assertId(value.jobId, 'review job ID');
  assertId(value.sourceVideoId, 'review job元動画ID');
  assertFormalBinding(value.sourceProjectionBinding, 'source projection binding');
  if (value.sourceProjectionBinding.schemaVersion
    !== DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001) {
    fail('review jobのsource projection schema bindingが不正です');
  }
  assertFormalBinding(value.candidateResponseBinding, 'candidate response binding');
  if (value.candidateResponseBinding.schemaVersion
    !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001) {
    fail('review jobのcandidate response schema bindingが不正です');
  }
  assertSourceVideoBinding(value.sourceVideoBinding, 'review job元動画binding');
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) fail('review job候補が空です');
  const ids = new Set<string>();
  const outputs = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !exactKeys(candidate, ['candidateId', 'candidateOrdinal', 'reviewStages'])
      || candidate.candidateOrdinal !== index + 1
      || !isRecord(candidate.reviewStages)
      || !exactKeys(candidate.reviewStages, ['secondOnly', 'firstThenSecond'])) {
      fail(`review job候補${index + 1}件目の構造・順序が不正です`);
    }
    assertCandidateId(candidate.candidateId, `review job候補${index + 1}件目のID`);
    if (ids.has(candidate.candidateId)) fail('review jobのcandidate IDが重複しています');
    ids.add(candidate.candidateId);
    assertJobStage(
      candidate.reviewStages.secondOnly,
      'second-only',
      value.sourceVideoBinding.path
    );
    assertJobStage(
      candidate.reviewStages.firstThenSecond,
      'first-then-second',
      value.sourceVideoBinding.path
    );
    for (const stage of [candidate.reviewStages.secondOnly, candidate.reviewStages.firstThenSecond]) {
      if (outputs.has(stage.output.path)) fail('review jobの出力pathが重複しています');
      outputs.add(stage.output.path);
    }
  }
  assertStatusFlags(value.statusFlags);
  if (value.responsibilityPrinciple
    !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002) {
    fail('review jobの責務境界が不正です');
  }
}

export function serializeDistantConnectionCandidateReviewJobV002(
  value: DistantConnectionCandidateReviewJobV002
): Buffer {
  assertDistantConnectionCandidateReviewJobV002(value);
  return formalBytes(value);
}

export function decodeDistantConnectionCandidateReviewJobV002(
  bytes: Uint8Array
): DistantConnectionCandidateReviewJobV002 {
  const value = parse(bytes, 'candidate review job v002');
  assertDistantConnectionCandidateReviewJobV002(value);
  const serialized = serializeDistantConnectionCandidateReviewJobV002(value);
  if (!serialized.equals(Buffer.from(bytes))) fail('review job v002がformal byteではありません');
  return value;
}

export function validateDistantConnectionCandidateReviewJobAgainstProjectionV002(
  job: unknown,
  input: BuildDistantConnectionCandidateReviewJobInputV002
): void {
  assertDistantConnectionCandidateReviewJobV002(job);
  const rebuilt = buildDistantConnectionCandidateReviewJobV002(input);
  if (!serializeDistantConnectionCandidateReviewJobV002(job)
    .equals(serializeDistantConnectionCandidateReviewJobV002(rebuilt))) {
    fail('review jobがprojectionからの決定的再構築結果と一致しません');
  }
}

function assertIsoDateTime(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
    || Number.isNaN(Date.parse(value))) fail(`${label}がISO 8601 UTC日時ではありません`);
}

function assertMediaInspection(
  value: unknown,
  label: string
): asserts value is CandidateReviewMediaInspectionV002 {
  if (!isRecord(value)
    || !exactKeys(value, ['durationMs', 'videoPresent', 'audioPresent'])
    || !Number.isSafeInteger(value.durationMs)
    || (value.durationMs as number) < 1
    || value.videoPresent !== true
    || value.audioPresent !== true) fail(`${label}が不正です`);
}

function buildResultArtifact(
  stage: CandidateReviewJobStageV002,
  observed: BuildCandidateReviewResultArtifactInputV002['secondOnly']
): CandidateReviewArtifactV002 {
  if (observed.videoPath !== stage.output.path) fail(`${stage.stage}動画pathがjobと一致しません`);
  const videoSha = checkedObservedSha(
    observed.observedVideoSha256,
    observed.expectedVideoSha256,
    `${stage.stage}確認動画`
  );
  if (!Number.isSafeInteger(observed.observedDurationMs) || observed.observedDurationMs < 1
    || observed.observedVideoPresent !== true || observed.observedAudioPresent !== true) {
    fail(`${stage.stage}確認動画の再生検査が不正です`);
  }
  return {
    stage: stage.stage,
    videoBinding: {path: stage.output.path, fileSha256: videoSha},
    mediaInspection: {
      durationMs: observed.observedDurationMs,
      videoPresent: true,
      audioPresent: true
    },
    evaluatedParts: structuredClone(stage.evaluatedParts)
  };
}

export function buildDistantConnectionCandidateReviewResultV002(
  input: BuildDistantConnectionCandidateReviewResultInputV002
): DistantConnectionCandidateReviewResultV002 {
  assertId(input.resultId, 'review result ID');
  assertIsoDateTime(input.generatedAt, 'review生成日時');
  assertPath(input.sourceProjectionPath, 'source projection path');
  assertPath(input.reviewJobPath, 'review job path');
  const projectionSha = checkedSha(
    input.sourceProjectionBytes,
    input.expectedSourceProjectionSha256,
    'source projection'
  );
  const jobSha = checkedSha(input.reviewJobBytes, input.expectedReviewJobSha256, 'review job');
  const projection = decodeDistantConnectionCandidateReviewSourceProjectionV001(
    input.sourceProjectionBytes
  );
  const job = decodeDistantConnectionCandidateReviewJobV002(input.reviewJobBytes);
  if (job.sourceProjectionBinding.path !== input.sourceProjectionPath
    || job.sourceProjectionBinding.fileSha256 !== projectionSha
    || JSON.stringify(job.candidateResponseBinding)
      !== JSON.stringify(projection.sourceBindings.candidateResponse)
    || JSON.stringify(job.sourceVideoBinding) !== JSON.stringify(projection.sourceBindings.sourceVideo)
    || job.sourceVideoId !== projection.sourceVideoId) {
    fail('review jobが指定source projectionを束縛していません');
  }
  if (!Array.isArray(input.candidateArtifacts)
    || input.candidateArtifacts.length !== job.candidates.length) {
    fail('review result入力が全candidateを完全被覆していません');
  }
  const candidates = job.candidates.map((candidate, index) => {
    const observed = input.candidateArtifacts[index];
    if (!observed || observed.candidateId !== candidate.candidateId) {
      fail('review result入力のcandidate順・IDがjobと一致しません');
    }
    return {
      candidateId: candidate.candidateId,
      candidateOrdinal: candidate.candidateOrdinal,
      reviewArtifacts: {
        secondOnly: buildResultArtifact(candidate.reviewStages.secondOnly, observed.secondOnly),
        firstThenSecond: buildResultArtifact(
          candidate.reviewStages.firstThenSecond,
          observed.firstThenSecond
        )
      }
    };
  });
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
    resultId: input.resultId,
    artifactClassification: ARTIFACT_CLASSIFICATION,
    sourceVideoId: job.sourceVideoId,
    generatedAt: input.generatedAt,
    sourceProjectionBinding: binding(
      input.sourceProjectionPath,
      DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001,
      projectionSha
    ),
    candidateResponseBinding: structuredClone(job.candidateResponseBinding),
    reviewJobBinding: binding(
      input.reviewJobPath,
      DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002,
      jobSha
    ),
    sourceVideoBinding: structuredClone(job.sourceVideoBinding),
    candidates,
    generationStatus: 'succeeded',
    statusFlags: {...STATUS_FLAGS},
    responsibilityPrinciple: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002
  };
}

function assertReviewArtifact(
  value: unknown,
  expectedStage: CandidateReviewStageV002
): asserts value is CandidateReviewArtifactV002 {
  if (!isRecord(value)
    || !exactKeys(value, ['stage', 'videoBinding', 'mediaInspection', 'evaluatedParts'])
    || value.stage !== expectedStage
    || !Array.isArray(value.evaluatedParts)) fail(`${expectedStage} result artifactの構造が不正です`);
  assertByteBinding(value.videoBinding, `${expectedStage}動画binding`);
  assertMediaInspection(value.mediaInspection, `${expectedStage}動画検査`);
  const expectedParts = expectedStage === 'second-only' ? ['second'] : ['first', 'second'];
  if (value.evaluatedParts.length !== expectedParts.length) fail(`${expectedStage}結果のpart数が不正です`);
  value.evaluatedParts.forEach((part, index) => assertSelectedPart(
    part,
    expectedParts[index] as 'first' | 'second'
  ));
}

export function assertDistantConnectionCandidateReviewResultV002(
  value: unknown
): asserts value is DistantConnectionCandidateReviewResultV002 {
  if (!isRecord(value) || !exactKeys(value, [
    'schemaVersion', 'resultId', 'artifactClassification', 'sourceVideoId', 'generatedAt',
    'sourceProjectionBinding', 'candidateResponseBinding', 'reviewJobBinding',
    'sourceVideoBinding', 'candidates', 'generationStatus', 'statusFlags',
    'responsibilityPrinciple'
  ])) fail('candidate review result v002のroot構造が不正です');
  if (value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002
    || value.artifactClassification !== ARTIFACT_CLASSIFICATION
    || value.generationStatus !== 'succeeded') fail('review result v002の版・分類・状態が不正です');
  assertId(value.resultId, 'review result ID');
  assertId(value.sourceVideoId, 'review result元動画ID');
  assertIsoDateTime(value.generatedAt, 'review生成日時');
  assertFormalBinding(value.sourceProjectionBinding, 'result source projection binding');
  assertFormalBinding(value.candidateResponseBinding, 'result candidate response binding');
  assertFormalBinding(value.reviewJobBinding, 'result review job binding');
  if (value.sourceProjectionBinding.schemaVersion
      !== DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001
    || value.candidateResponseBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001
    || value.reviewJobBinding.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002) {
    fail('review resultのschema bindingが不正です');
  }
  assertSourceVideoBinding(value.sourceVideoBinding, 'result元動画binding');
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) fail('review result候補が空です');
  const ids = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !exactKeys(candidate, ['candidateId', 'candidateOrdinal', 'reviewArtifacts'])
      || candidate.candidateOrdinal !== index + 1
      || !isRecord(candidate.reviewArtifacts)
      || !exactKeys(candidate.reviewArtifacts, ['secondOnly', 'firstThenSecond'])) {
      fail(`review result候補${index + 1}件目の構造・順序が不正です`);
    }
    assertCandidateId(candidate.candidateId, `review result候補${index + 1}件目のID`);
    if (ids.has(candidate.candidateId)) fail('review resultのcandidate IDが重複しています');
    ids.add(candidate.candidateId);
    assertReviewArtifact(candidate.reviewArtifacts.secondOnly, 'second-only');
    assertReviewArtifact(candidate.reviewArtifacts.firstThenSecond, 'first-then-second');
  }
  assertStatusFlags(value.statusFlags);
  if (value.responsibilityPrinciple
    !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002) {
    fail('review resultの責務境界が不正です');
  }
}

export function serializeDistantConnectionCandidateReviewResultV002(
  value: DistantConnectionCandidateReviewResultV002
): Buffer {
  assertDistantConnectionCandidateReviewResultV002(value);
  return formalBytes(value);
}

export function validateDistantConnectionCandidateReviewResultAgainstInputsV002(
  value: unknown,
  input: BuildDistantConnectionCandidateReviewResultInputV002
): void {
  assertDistantConnectionCandidateReviewResultV002(value);
  const rebuilt = buildDistantConnectionCandidateReviewResultV002(input);
  if (!serializeDistantConnectionCandidateReviewResultV002(value)
    .equals(serializeDistantConnectionCandidateReviewResultV002(rebuilt))) {
    fail('review resultがjob・動画検査からの決定的再構築結果と一致しません');
  }
}

export async function buildDistantConnectionCandidateReviewSourceProjectionFromFilesV001(
  input: BuildCandidateReviewSourceProjectionFromFilesInputV001
): Promise<DistantConnectionCandidateReviewSourceProjectionV001> {
  if (typeof input.workspaceRoot !== 'string' || !path.isAbsolute(input.workspaceRoot)) {
    fail('workspace rootは絶対pathである必要があります');
  }
  for (const [value, label] of [
    [input.candidateResponsePath, '正式候補path'],
    [input.commonUtterancePath, '共通発話path'],
    [input.sourcePackagePath, 'source package path'],
    [input.sourceReusePath, '動画・文字起こし再利用成果物path'],
    [input.indexedModelInputPath, 'index入力path'],
    [input.rawResponsePath, 'raw応答path'],
    [input.sourceVideoPath, '元動画path']
  ] as const) assertPath(value, label);
  const absoluteRoot = path.resolve(input.workspaceRoot);
  const [
    candidateResponseBytes,
    commonUtteranceBytes,
    sourcePackageBytes,
    sourceReuseBytes,
    indexedModelInputBytes,
    rawResponseBytes,
    observedSourceVideoSha256
  ] = await Promise.all([
    readFile(path.join(absoluteRoot, input.candidateResponsePath)),
    readFile(path.join(absoluteRoot, input.commonUtterancePath)),
    readFile(path.join(absoluteRoot, input.sourcePackagePath)),
    readFile(path.join(absoluteRoot, input.sourceReusePath)),
    readFile(path.join(absoluteRoot, input.indexedModelInputPath)),
    readFile(path.join(absoluteRoot, input.rawResponsePath)),
    sha256File(path.join(absoluteRoot, input.sourceVideoPath))
  ]);
  return buildDistantConnectionCandidateReviewSourceProjectionV001({
    ...input,
    candidateResponseBytes,
    commonUtteranceBytes,
    sourcePackageBytes,
    sourceReuseBytes,
    indexedModelInputBytes,
    rawResponseBytes,
    observedSourceVideoSha256
  });
}

async function writeFormal(
  workspaceRoot: string,
  outputPath: string,
  bytes: Uint8Array
): Promise<void> {
  assertPath(outputPath, '正式出力path');
  const absolute = path.join(path.resolve(workspaceRoot), outputPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, bytes, {flag: 'wx'});
}

export async function writeDistantConnectionCandidateReviewSourceProjectionV001(input: {
  workspaceRoot: string;
  outputPath: string;
  projection: DistantConnectionCandidateReviewSourceProjectionV001;
}): Promise<Buffer> {
  const bytes = serializeDistantConnectionCandidateReviewSourceProjectionV001(input.projection);
  await writeFormal(input.workspaceRoot, input.outputPath, bytes);
  return bytes;
}

export async function writeDistantConnectionCandidateReviewJobV002(input: {
  workspaceRoot: string;
  outputPath: string;
  job: DistantConnectionCandidateReviewJobV002;
}): Promise<Buffer> {
  const bytes = serializeDistantConnectionCandidateReviewJobV002(input.job);
  await writeFormal(input.workspaceRoot, input.outputPath, bytes);
  return bytes;
}

export async function writeDistantConnectionCandidateReviewResultV002(input: {
  workspaceRoot: string;
  outputPath: string;
  result: DistantConnectionCandidateReviewResultV002;
}): Promise<Buffer> {
  const bytes = serializeDistantConnectionCandidateReviewResultV002(input.result);
  await writeFormal(input.workspaceRoot, input.outputPath, bytes);
  return bytes;
}

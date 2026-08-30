import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
  assertSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001 =
  'distant-connection-candidate-review-job-v001';
export const DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001 =
  'distant-connection-candidate-review-result-v001';
export const DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001 =
  'distant-connection-candidate-human-review-result-v001';

const CANDIDATE_RESPONSE_SCHEMA = 'distant-connection-luna-response-v001';
const SOURCE_PACKAGE_SCHEMAS = new Set([
  'distant-connection-luna-source-package-v001',
  'distant-connection-luna-source-package-v002'
]);
const ARTIFACT_CLASSIFICATION = 'candidate-review-artifact';
const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const RESPONSIBILITY =
  '本成果物は正式selection前の候補を人間が直接確認するため、前半・後半それぞれを最初の選択発話開始から最後の選択発話終了までの元映像・元音声区間へ決定的に投影する。候補採否、正式区間承認、正式renderer出力、完成short、技術QCを所有しない。';
const HUMAN_REVIEW_RESPONSIBILITY =
  '本成果物はcandidate review artifactを見た人間の候補評価を保存する。正式selectionや正式区間を生成・承認せず、不採用候補をnot-selectedのまま保持する。';

type RecordValue = Record<string, unknown>;

export type FormalBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type ByteBindingV001 = {
  path: string;
  fileSha256: string;
};

export type CandidateReviewSourceIntervalV001 = {
  sourceStartMs: number;
  sourceEndMs: number;
};

export type CandidateReviewPartV001 = {
  part: 'first' | 'second';
  selectedSemanticUtteranceIds: string[];
  enclosedSemanticUtteranceIds: string[];
  firstOrdinal: number;
  lastOrdinal: number;
  sourceInterval: CandidateReviewSourceIntervalV001;
};

type CandidateReviewStatusFlagsV001 = {
  formalSelection: false;
  formalRenderer: false;
  completedShort: false;
  technicalQcCompleted: false;
};

export type DistantConnectionCandidateReviewJobV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001;
  jobId: string;
  artifactClassification: typeof ARTIFACT_CLASSIFICATION;
  sourceVideoId: string;
  candidateId: string;
  sourceBindings: {
    candidateResponse: FormalBindingV001;
    semanticUtterance: FormalBindingV001;
    sourcePackage: FormalBindingV001;
    sourceVideo: ByteBindingV001;
  };
  orderedParts: [CandidateReviewPartV001, CandidateReviewPartV001];
  output: {path: string; container: 'mp4'};
  ffmpeg: {executable: 'ffmpeg'; args: string[]};
  statusFlags: CandidateReviewStatusFlagsV001;
  responsibilityPrinciple: string;
};

export type DistantConnectionCandidateReviewResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001;
  resultId: string;
  artifactClassification: typeof ARTIFACT_CLASSIFICATION;
  sourceVideoId: string;
  candidateId: string;
  generatedAt: string;
  reviewJobBinding: FormalBindingV001;
  candidateResponseBinding: FormalBindingV001;
  reviewVideo: ByteBindingV001;
  mediaInspection: {
    durationMs: number;
    videoPresent: true;
    audioPresent: true;
  };
  evaluatedParts: [CandidateReviewPartV001, CandidateReviewPartV001];
  generationStatus: 'succeeded';
  statusFlags: CandidateReviewStatusFlagsV001;
  responsibilityPrinciple: string;
};

export type CandidateHumanReviewVerdictV001 = 'rejected' | 'approved-for-interval-review';
export type CandidateHumanReviewPrimaryCauseV001 =
  | 'candidate-selection'
  | 'connection-validity'
  | 'payoff-strength'
  | 'visual-suitability'
  | 'intervalization';

export type DistantConnectionCandidateHumanReviewResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001;
  reviewId: string;
  sourceVideoId: string;
  candidateId: string;
  reviewedAt: string;
  reviewer: {kind: 'human'; id: 'kawafmm'};
  sourceBindings: {
    candidateResponse: FormalBindingV001;
    candidateReviewResult: FormalBindingV001;
  };
  evaluatedIntervals: {
    firstPartSourceInterval: CandidateReviewSourceIntervalV001;
    secondPartSourceInterval: CandidateReviewSourceIntervalV001;
  };
  verdict: CandidateHumanReviewVerdictV001;
  primaryCause: CandidateHumanReviewPrimaryCauseV001;
  reason: string;
  selectionStatus: 'not-selected';
  responsibilityPrinciple: string;
};

export type BuildDistantConnectionCandidateReviewJobInputV001 = {
  jobId: string;
  candidateId: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  expectedSourcePackageSha256: string;
  sourceVideoPath: string;
  observedSourceVideoSha256: string;
  expectedSourceVideoSha256: string;
  outputPath: string;
};

export type BuildDistantConnectionCandidateReviewJobFromFilesInputV001 = Omit<
  BuildDistantConnectionCandidateReviewJobInputV001,
  | 'candidateResponseBytes'
  | 'semanticUtteranceBytes'
  | 'sourcePackageBytes'
  | 'observedSourceVideoSha256'
> & {workspaceRoot: string};

export type BuildDistantConnectionCandidateReviewResultInputV001 = {
  resultId: string;
  generatedAt: string;
  reviewJobPath: string;
  reviewJobBytes: Uint8Array;
  expectedReviewJobSha256: string;
  reviewVideoPath: string;
  observedReviewVideoSha256: string;
  expectedReviewVideoSha256: string;
  observedDurationMs: number;
  observedVideoPresent: boolean;
  observedAudioPresent: boolean;
};

export type BuildDistantConnectionCandidateHumanReviewResultInputV001 = {
  reviewId: string;
  reviewedAt: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  candidateReviewResultPath: string;
  candidateReviewResultBytes: Uint8Array;
  expectedCandidateReviewResultSha256: string;
  verdict: CandidateHumanReviewVerdictV001;
  primaryCause: CandidateHumanReviewPrimaryCauseV001;
  reason: string;
};

export class DistantConnectionCandidateReviewErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionCandidateReviewErrorV001';
  }
}

function fail(message: string): never {
  throw new DistantConnectionCandidateReviewErrorV001(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function formalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parse(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionCandidateReviewErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !FORMAL_ID.test(value)) fail(`${label}が不正です`);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_PATH.test(value)) {
    fail(`${label}は安全なworkspace相対pathではありません`);
  }
}

function assertSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256.test(value)) fail(`${label}が不正です`);
}

function checkedSha(bytes: Uint8Array, expected: string, label: string): string {
  const actual = sha256(bytes);
  assertSha(expected, `${label}の指定SHA-256`);
  if (actual !== expected) fail(`${label}のSHA-256が一致しません`);
  return actual;
}

function checkedObservedSha(observed: string, expected: string, label: string): string {
  assertSha(observed, `${label}の実測SHA-256`);
  assertSha(expected, `${label}の指定SHA-256`);
  if (observed !== expected) fail(`${label}のSHA-256が一致しません`);
  return observed;
}

function assertIsoDateTime(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
    || Number.isNaN(Date.parse(value))) fail(`${label}がISO 8601 UTC日時ではありません`);
}

function assertFormalBinding(value: unknown, label: string): asserts value is FormalBindingV001 {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)) fail(`${label}が不正です`);
  assertPath(value.path, `${label}のpath`);
  assertSha(value.fileSha256, `${label}のSHA-256`);
}

function assertByteBinding(value: unknown, label: string): asserts value is ByteBindingV001 {
  if (!isRecord(value) || !exactKeys(value, ['path', 'fileSha256'])) fail(`${label}が不正です`);
  assertPath(value.path, `${label}のpath`);
  assertSha(value.fileSha256, `${label}のSHA-256`);
}

function assertInterval(
  value: unknown,
  label: string
): asserts value is CandidateReviewSourceIntervalV001 {
  if (!isRecord(value)
    || !exactKeys(value, ['sourceStartMs', 'sourceEndMs'])
    || !Number.isSafeInteger(value.sourceStartMs)
    || !Number.isSafeInteger(value.sourceEndMs)
    || (value.sourceStartMs as number) < 0
    || (value.sourceEndMs as number) <= (value.sourceStartMs as number)) {
    fail(`${label}が不正です`);
  }
}

function assertStatusFlags(value: unknown): asserts value is CandidateReviewStatusFlagsV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'formalSelection', 'formalRenderer', 'completedShort', 'technicalQcCompleted'
    ])
    || value.formalSelection !== false
    || value.formalRenderer !== false
    || value.completedShort !== false
    || value.technicalQcCompleted !== false) fail('candidate reviewの非正式状態が不正です');
}

function resolveSourceVideoId(sourceUri: string): string {
  let sourceName = sourceUri;
  try {
    sourceName = new URL(sourceUri).pathname;
  } catch {
    // workspace pathはそのままbasenameへ渡す。
  }
  const basename = path.basename(sourceName);
  const extension = path.extname(basename);
  const id = extension.length > 0 ? basename.slice(0, -extension.length) : basename;
  return id.length > 0 ? id : fail('正式意味発話から元動画IDを解決できません');
}

function assertStringIds(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== 'string' || !FORMAL_ID.test(item))
    || new Set(value).size !== value.length) fail(`${label}が空・不正・重複しています`);
}

function inspectSourcePackage(
  value: RecordValue,
  sourcePackagePath: string,
  sourcePackageSha: string,
  semanticPath: string,
  semanticSha: string,
  semantic: SemanticUtteranceArtifactV001
): string {
  const expectedKeys = value.schemaVersion === 'distant-connection-luna-source-package-v002'
    ? [
        'schemaVersion', 'sourceVideoId', 'semanticUtteranceBinding',
        'commentVelocityAnchorBinding', 'plannedExecution', 'explorationTask', 'learningContext',
        'utteranceCount', 'anchorCount', 'utterances', 'anchors', 'responseContract'
      ]
    : [
        'schemaVersion', 'sourceVideoId', 'semanticUtteranceBinding',
        'commentVelocityAnchorBinding', 'plannedExecution', 'explorationTask', 'utteranceCount',
        'anchorCount', 'utterances', 'anchors', 'responseContract'
      ];
  if (!exactKeys(value, expectedKeys)
    || typeof value.schemaVersion !== 'string'
    || !SOURCE_PACKAGE_SCHEMAS.has(value.schemaVersion)
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || value.utteranceCount !== semantic.utteranceCount
    || JSON.stringify(value.utterances) !== JSON.stringify(semantic.utterances)
    || !isRecord(value.semanticUtteranceBinding)
    || !isRecord(value.responseContract)
    || value.responseContract.sourcePackagePath !== sourcePackagePath) {
    fail('Luna source packageの形・発話一覧・自己path bindingが不正です');
  }
  assertFormalBinding(value.semanticUtteranceBinding, 'Luna source packageの正式意味発話binding');
  if (value.semanticUtteranceBinding.path !== semanticPath
    || value.semanticUtteranceBinding.schemaVersion !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
    || value.semanticUtteranceBinding.fileSha256 !== semanticSha) {
    fail('Luna source packageが指定正式意味発話を束縛していません');
  }
  assertPath(sourcePackagePath, 'Luna source packageのpath');
  assertSha(sourcePackageSha, 'Luna source packageのSHA-256');
  return value.sourceVideoId;
}

function resolvePart(
  part: 'first' | 'second',
  ids: string[],
  utterances: SemanticUtteranceV001[],
  utteranceById: Map<string, SemanticUtteranceV001>
): CandidateReviewPartV001 {
  const rows = ids.map((id) => utteranceById.get(id)
    ?? fail(`${part}が未知の正式発話ID ${id} を参照しています`));
  for (const [index, row] of rows.entries()) {
    if (index > 0 && row.ordinal <= rows[index - 1].ordinal) {
      fail(`${part}の正式発話IDが時系列順ではありません`);
    }
  }
  const first = rows[0];
  const last = rows.at(-1)!;
  const enclosed = utterances.filter((row) =>
    row.ordinal >= first.ordinal && row.ordinal <= last.ordinal);
  if (enclosed.length === 0
    || enclosed[0].utteranceId !== first.utteranceId
    || enclosed.at(-1)!.utteranceId !== last.utteranceId) {
    fail(`${part}の外包区間を正式意味発話から決定できません`);
  }
  return {
    part,
    selectedSemanticUtteranceIds: [...ids],
    enclosedSemanticUtteranceIds: enclosed.map((row) => row.utteranceId),
    firstOrdinal: first.ordinal,
    lastOrdinal: last.ordinal,
    sourceInterval: {
      sourceStartMs: first.sourceStartMs,
      sourceEndMs: last.sourceEndMs
    }
  };
}

function seconds(milliseconds: number): string {
  return (milliseconds / 1_000).toFixed(3);
}

function buildFfmpegArgs(
  sourceVideoPath: string,
  outputPath: string,
  orderedParts: [CandidateReviewPartV001, CandidateReviewPartV001]
): string[] {
  const inputs = orderedParts.flatMap((part) => [
    '-ss', seconds(part.sourceInterval.sourceStartMs),
    '-to', seconds(part.sourceInterval.sourceEndMs),
    '-i', sourceVideoPath
  ]);
  const filterInputs = orderedParts.map((_, index) => `[${index}:v:0][${index}:a:0]`).join('');
  return [
    '-hide_banner', '-nostdin', '-n',
    ...inputs,
    '-filter_complex', `${filterInputs}concat=n=2:v=1:a=1[outv][outa]`,
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart',
    outputPath
  ];
}

function inspectJobSources(input: BuildDistantConnectionCandidateReviewJobInputV001) {
  assertId(input.jobId, 'review job ID');
  assertId(input.candidateId, 'candidate ID');
  for (const [value, label] of [
    [input.candidateResponsePath, '正式候補path'],
    [input.semanticUtterancePath, '正式意味発話path'],
    [input.sourcePackagePath, 'Luna source package path'],
    [input.sourceVideoPath, '元動画path'],
    [input.outputPath, 'review MP4出力path']
  ] as const) assertPath(value, label);
  if (path.extname(input.outputPath).toLowerCase() !== '.mp4') fail('review出力はmp4である必要があります');

  const candidateSha = checkedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  const semanticSha = checkedSha(
    input.semanticUtteranceBytes,
    input.expectedSemanticUtteranceSha256,
    '正式意味発話成果物'
  );
  const sourcePackageSha = checkedSha(
    input.sourcePackageBytes,
    input.expectedSourcePackageSha256,
    'Luna source package'
  );
  const sourceVideoSha = checkedObservedSha(
    input.observedSourceVideoSha256,
    input.expectedSourceVideoSha256,
    '元動画'
  );

  const semanticValue = parse(input.semanticUtteranceBytes, '正式意味発話成果物');
  assertSemanticUtteranceArtifactV001(semanticValue);
  const sourcePackage = parse(input.sourcePackageBytes, 'Luna source package');
  const sourceVideoId = inspectSourcePackage(
    sourcePackage,
    input.sourcePackagePath,
    sourcePackageSha,
    input.semanticUtterancePath,
    semanticSha,
    semanticValue
  );
  const semanticVideoId = resolveSourceVideoId(semanticValue.sourceUri);
  const sourcePathVideoId = resolveSourceVideoId(input.sourceVideoPath);
  if (sourceVideoId !== semanticVideoId || sourceVideoId !== sourcePathVideoId) {
    fail('元動画IDが正式候補・正式意味発話・source package・動画pathで一致しません');
  }

  const candidateResponse = parse(input.candidateResponseBytes, '正式候補成果物');
  if (!exactKeys(candidateResponse, [
    'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'
  ])
    || candidateResponse.schemaVersion !== CANDIDATE_RESPONSE_SCHEMA
    || candidateResponse.sourceVideoId !== sourceVideoId
    || !isRecord(candidateResponse.sourcePackageBinding)
    || !Array.isArray(candidateResponse.candidates)
    || candidateResponse.candidates.length === 0) fail('正式候補成果物のrootが不正です');
  assertFormalBinding(candidateResponse.sourcePackageBinding, '正式候補のsource package binding');
  if (candidateResponse.sourcePackageBinding.path !== input.sourcePackagePath
    || candidateResponse.sourcePackageBinding.schemaVersion !== sourcePackage.schemaVersion
    || candidateResponse.sourcePackageBinding.fileSha256 !== sourcePackageSha) {
    fail('正式候補が指定Luna source packageを束縛していません');
  }
  const matches = candidateResponse.candidates.filter((value) =>
    isRecord(value) && value.candidateId === input.candidateId);
  if (matches.length !== 1) fail('対象candidateが欠落または重複しています');
  const candidate = matches[0];
  if (!exactKeys(candidate, [
    'candidateId', 'anchorId', 'firstPartSemanticUtteranceIds',
    'secondPartSemanticUtteranceIds', 'addedUnderstanding', 'direction'
  ])
    || typeof candidate.anchorId !== 'string'
    || typeof candidate.addedUnderstanding !== 'string'
    || candidate.addedUnderstanding.length === 0
    || !['past', 'future'].includes(candidate.direction as string)) {
    fail('対象candidateの形または余分fieldが不正です');
  }
  assertStringIds(candidate.firstPartSemanticUtteranceIds, 'candidate前半発話ID');
  assertStringIds(candidate.secondPartSemanticUtteranceIds, 'candidate後半発話ID');
  const byId = new Map(semanticValue.utterances.map((row) => [row.utteranceId, row]));
  const first = resolvePart(
    'first', candidate.firstPartSemanticUtteranceIds, semanticValue.utterances, byId
  );
  const second = resolvePart(
    'second', candidate.secondPartSemanticUtteranceIds, semanticValue.utterances, byId
  );
  if (first.lastOrdinal >= second.firstOrdinal
    || first.sourceInterval.sourceEndMs > second.sourceInterval.sourceStartMs) {
    fail('candidateの前半→後半順序が不正です');
  }
  return {
    sourceVideoId,
    hashes: {candidateSha, semanticSha, sourcePackageSha, sourceVideoSha},
    schemas: {
      candidate: candidateResponse.schemaVersion as string,
      semantic: semanticValue.schemaVersion,
      sourcePackage: sourcePackage.schemaVersion as string
    },
    orderedParts: [first, second] as [CandidateReviewPartV001, CandidateReviewPartV001]
  };
}

export function buildDistantConnectionCandidateReviewJobV001(
  input: BuildDistantConnectionCandidateReviewJobInputV001
): DistantConnectionCandidateReviewJobV001 {
  const inspected = inspectJobSources(input);
  const statusFlags: CandidateReviewStatusFlagsV001 = {
    formalSelection: false,
    formalRenderer: false,
    completedShort: false,
    technicalQcCompleted: false
  };
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001,
    jobId: input.jobId,
    artifactClassification: ARTIFACT_CLASSIFICATION,
    sourceVideoId: inspected.sourceVideoId,
    candidateId: input.candidateId,
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: inspected.schemas.candidate,
        fileSha256: inspected.hashes.candidateSha
      },
      semanticUtterance: {
        path: input.semanticUtterancePath,
        schemaVersion: inspected.schemas.semantic,
        fileSha256: inspected.hashes.semanticSha
      },
      sourcePackage: {
        path: input.sourcePackagePath,
        schemaVersion: inspected.schemas.sourcePackage,
        fileSha256: inspected.hashes.sourcePackageSha
      },
      sourceVideo: {
        path: input.sourceVideoPath,
        fileSha256: inspected.hashes.sourceVideoSha
      }
    },
    orderedParts: inspected.orderedParts,
    output: {path: input.outputPath, container: 'mp4'},
    ffmpeg: {
      executable: 'ffmpeg',
      args: buildFfmpegArgs(input.sourceVideoPath, input.outputPath, inspected.orderedParts)
    },
    statusFlags,
    responsibilityPrinciple: RESPONSIBILITY
  };
}

export async function buildDistantConnectionCandidateReviewJobFromFilesV001(
  input: BuildDistantConnectionCandidateReviewJobFromFilesInputV001
): Promise<DistantConnectionCandidateReviewJobV001> {
  const [candidateResponseBytes, semanticUtteranceBytes, sourcePackageBytes,
    observedSourceVideoSha256] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.semanticUtterancePath)),
    readFile(path.join(input.workspaceRoot, input.sourcePackagePath)),
    sha256File(path.join(input.workspaceRoot, input.sourceVideoPath))
  ]);
  return buildDistantConnectionCandidateReviewJobV001({
    ...input,
    candidateResponseBytes,
    semanticUtteranceBytes,
    sourcePackageBytes,
    observedSourceVideoSha256
  });
}

function assertPart(value: unknown, expectedPart: 'first' | 'second'): void {
  if (!isRecord(value)
    || !exactKeys(value, [
      'part', 'selectedSemanticUtteranceIds', 'enclosedSemanticUtteranceIds',
      'firstOrdinal', 'lastOrdinal', 'sourceInterval'
    ])
    || value.part !== expectedPart
    || !Number.isSafeInteger(value.firstOrdinal)
    || !Number.isSafeInteger(value.lastOrdinal)
    || (value.firstOrdinal as number) < 1
    || (value.lastOrdinal as number) < (value.firstOrdinal as number)) {
    fail(`${expectedPart} partが不正です`);
  }
  assertStringIds(value.selectedSemanticUtteranceIds, `${expectedPart} partの選択発話ID`);
  assertStringIds(value.enclosedSemanticUtteranceIds, `${expectedPart} partの外包発話ID`);
  const enclosed = value.enclosedSemanticUtteranceIds;
  const selected = value.selectedSemanticUtteranceIds;
  if (enclosed.length !== (value.lastOrdinal as number) - (value.firstOrdinal as number) + 1
    || selected.some((id) => !enclosed.includes(id))) {
    fail(`${expectedPart} partの外包発話がordinal範囲または選択発話と一致しません`);
  }
  assertInterval(value.sourceInterval, `${expectedPart} partのsource interval`);
}

export function assertDistantConnectionCandidateReviewJobV001(
  value: unknown
): asserts value is DistantConnectionCandidateReviewJobV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'jobId', 'artifactClassification', 'sourceVideoId', 'candidateId',
      'sourceBindings', 'orderedParts', 'output', 'ffmpeg', 'statusFlags',
      'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001
    || value.artifactClassification !== ARTIFACT_CLASSIFICATION
    || value.responsibilityPrinciple !== RESPONSIBILITY
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0) fail('candidate review jobのrootが不正です');
  assertId(value.jobId, 'review job ID');
  assertId(value.candidateId, 'candidate ID');
  if (!isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, [
      'candidateResponse', 'semanticUtterance', 'sourcePackage', 'sourceVideo'
    ])) fail('candidate review jobのsource bindingが不正です');
  assertFormalBinding(value.sourceBindings.candidateResponse, '正式候補binding');
  assertFormalBinding(value.sourceBindings.semanticUtterance, '正式意味発話binding');
  assertFormalBinding(value.sourceBindings.sourcePackage, 'source package binding');
  assertByteBinding(value.sourceBindings.sourceVideo, '元動画binding');
  if (value.sourceBindings.candidateResponse.schemaVersion !== CANDIDATE_RESPONSE_SCHEMA
    || value.sourceBindings.semanticUtterance.schemaVersion
      !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
    || !SOURCE_PACKAGE_SCHEMAS.has(value.sourceBindings.sourcePackage.schemaVersion)) {
    fail('candidate review jobのsource schema bindingが不正です');
  }
  if (!Array.isArray(value.orderedParts) || value.orderedParts.length !== 2) {
    fail('candidate review jobのpart数が不正です');
  }
  assertPart(value.orderedParts[0], 'first');
  assertPart(value.orderedParts[1], 'second');
  const first = value.orderedParts[0] as CandidateReviewPartV001;
  const second = value.orderedParts[1] as CandidateReviewPartV001;
  if (first.lastOrdinal >= second.firstOrdinal
    || first.sourceInterval.sourceEndMs > second.sourceInterval.sourceStartMs) {
    fail('candidate review jobの前半→後半順序が不正です');
  }
  if (!isRecord(value.output)
    || !exactKeys(value.output, ['path', 'container'])
    || value.output.container !== 'mp4') fail('candidate review出力が不正です');
  assertPath(value.output.path, 'candidate review出力path');
  if (!isRecord(value.ffmpeg)
    || !exactKeys(value.ffmpeg, ['executable', 'args'])
    || value.ffmpeg.executable !== 'ffmpeg'
    || !Array.isArray(value.ffmpeg.args)
    || value.ffmpeg.args.some((arg) => typeof arg !== 'string')) fail('ffmpeg実行計画が不正です');
  const expectedArgs = buildFfmpegArgs(
    value.sourceBindings.sourceVideo.path,
    value.output.path,
    value.orderedParts as [CandidateReviewPartV001, CandidateReviewPartV001]
  );
  if (JSON.stringify(value.ffmpeg.args) !== JSON.stringify(expectedArgs)) {
    fail('ffmpeg argsが正式区間からの決定値と一致しません');
  }
  assertStatusFlags(value.statusFlags);
}

export function serializeDistantConnectionCandidateReviewJobV001(
  value: DistantConnectionCandidateReviewJobV001
): Buffer {
  assertDistantConnectionCandidateReviewJobV001(value);
  return formalBytes(value);
}

export async function writeDistantConnectionCandidateReviewJobV001(input: {
  workspaceRoot: string;
  outputPath: string;
  job: DistantConnectionCandidateReviewJobV001;
}): Promise<void> {
  assertPath(input.outputPath, 'candidate review job出力path');
  const absolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, serializeDistantConnectionCandidateReviewJobV001(input.job), {
    flag: 'wx'
  });
}

export function validateDistantConnectionCandidateReviewJobAgainstSourcesV001(
  value: DistantConnectionCandidateReviewJobV001,
  input: BuildDistantConnectionCandidateReviewJobInputV001
): void {
  assertDistantConnectionCandidateReviewJobV001(value);
  const rebuilt = buildDistantConnectionCandidateReviewJobV001(input);
  if (!formalBytes(value).equals(formalBytes(rebuilt))) {
    fail('candidate review jobが指定入力からの決定的再生成byteと一致しません');
  }
}

export function buildDistantConnectionCandidateReviewResultV001(
  input: BuildDistantConnectionCandidateReviewResultInputV001
): DistantConnectionCandidateReviewResultV001 {
  assertId(input.resultId, 'review result ID');
  assertIsoDateTime(input.generatedAt, '生成日時');
  assertPath(input.reviewJobPath, 'review job path');
  assertPath(input.reviewVideoPath, 'review MP4 path');
  const jobSha = checkedSha(input.reviewJobBytes, input.expectedReviewJobSha256, 'review job');
  const videoSha = checkedObservedSha(
    input.observedReviewVideoSha256,
    input.expectedReviewVideoSha256,
    'review MP4'
  );
  if (!Number.isSafeInteger(input.observedDurationMs) || input.observedDurationMs <= 0) {
    fail('review MP4の実測durationが正の整数ミリ秒ではありません');
  }
  if (input.observedVideoPresent !== true || input.observedAudioPresent !== true) {
    fail('review MP4に映像または音声trackがありません');
  }
  const job = parse(input.reviewJobBytes, 'review job');
  assertDistantConnectionCandidateReviewJobV001(job);
  if (job.output.path !== input.reviewVideoPath) fail('review MP4 pathがjob出力と一致しません');
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001,
    resultId: input.resultId,
    artifactClassification: ARTIFACT_CLASSIFICATION,
    sourceVideoId: job.sourceVideoId,
    candidateId: job.candidateId,
    generatedAt: input.generatedAt,
    reviewJobBinding: {
      path: input.reviewJobPath,
      schemaVersion: job.schemaVersion,
      fileSha256: jobSha
    },
    candidateResponseBinding: {...job.sourceBindings.candidateResponse},
    reviewVideo: {path: input.reviewVideoPath, fileSha256: videoSha},
    mediaInspection: {
      durationMs: input.observedDurationMs,
      videoPresent: true,
      audioPresent: true
    },
    evaluatedParts: structuredClone(job.orderedParts),
    generationStatus: 'succeeded',
    statusFlags: structuredClone(job.statusFlags),
    responsibilityPrinciple: RESPONSIBILITY
  };
}

export function assertDistantConnectionCandidateReviewResultV001(
  value: unknown
): asserts value is DistantConnectionCandidateReviewResultV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'resultId', 'artifactClassification', 'sourceVideoId', 'candidateId',
      'generatedAt', 'reviewJobBinding', 'candidateResponseBinding', 'reviewVideo',
      'mediaInspection', 'evaluatedParts', 'generationStatus', 'statusFlags',
      'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001
    || value.artifactClassification !== ARTIFACT_CLASSIFICATION
    || value.generationStatus !== 'succeeded'
    || value.responsibilityPrinciple !== RESPONSIBILITY
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0) fail('candidate review resultのrootが不正です');
  assertId(value.resultId, 'review result ID');
  assertId(value.candidateId, 'candidate ID');
  assertIsoDateTime(value.generatedAt, '生成日時');
  assertFormalBinding(value.reviewJobBinding, 'review job binding');
  assertFormalBinding(value.candidateResponseBinding, '正式候補binding');
  assertByteBinding(value.reviewVideo, 'review MP4 binding');
  if (!isRecord(value.mediaInspection)
    || !exactKeys(value.mediaInspection, ['durationMs', 'videoPresent', 'audioPresent'])
    || !Number.isSafeInteger(value.mediaInspection.durationMs)
    || (value.mediaInspection.durationMs as number) <= 0
    || value.mediaInspection.videoPresent !== true
    || value.mediaInspection.audioPresent !== true) {
    fail('candidate review resultのmedia inspectionが不正です');
  }
  if (!Array.isArray(value.evaluatedParts) || value.evaluatedParts.length !== 2) {
    fail('candidate review resultの評価part数が不正です');
  }
  assertPart(value.evaluatedParts[0], 'first');
  assertPart(value.evaluatedParts[1], 'second');
  const first = value.evaluatedParts[0] as CandidateReviewPartV001;
  const second = value.evaluatedParts[1] as CandidateReviewPartV001;
  if (first.lastOrdinal >= second.firstOrdinal
    || first.sourceInterval.sourceEndMs > second.sourceInterval.sourceStartMs) {
    fail('candidate review resultの前半→後半順序が不正です');
  }
  assertStatusFlags(value.statusFlags);
}

export function serializeDistantConnectionCandidateReviewResultV001(
  value: DistantConnectionCandidateReviewResultV001
): Buffer {
  assertDistantConnectionCandidateReviewResultV001(value);
  return formalBytes(value);
}

export async function writeDistantConnectionCandidateReviewResultV001(input: {
  workspaceRoot: string;
  outputPath: string;
  result: DistantConnectionCandidateReviewResultV001;
}): Promise<void> {
  assertPath(input.outputPath, 'candidate review result出力path');
  const absolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, serializeDistantConnectionCandidateReviewResultV001(input.result), {
    flag: 'wx'
  });
}

export function validateDistantConnectionCandidateReviewResultAgainstJobV001(
  value: DistantConnectionCandidateReviewResultV001,
  input: BuildDistantConnectionCandidateReviewResultInputV001
): void {
  assertDistantConnectionCandidateReviewResultV001(value);
  const rebuilt = buildDistantConnectionCandidateReviewResultV001(input);
  if (!formalBytes(value).equals(formalBytes(rebuilt))) {
    fail('candidate review resultがjob・MP4 bindingからの決定的再生成byteと一致しません');
  }
}

export function buildDistantConnectionCandidateHumanReviewResultV001(
  input: BuildDistantConnectionCandidateHumanReviewResultInputV001
): DistantConnectionCandidateHumanReviewResultV001 {
  assertId(input.reviewId, 'human review ID');
  assertIsoDateTime(input.reviewedAt, '評価日時');
  assertPath(input.candidateResponsePath, '正式候補path');
  assertPath(input.candidateReviewResultPath, 'candidate review result path');
  if (!['rejected', 'approved-for-interval-review'].includes(input.verdict)) {
    fail('人間評価verdictが不正です');
  }
  if (![
    'candidate-selection', 'connection-validity', 'payoff-strength',
    'visual-suitability', 'intervalization'
  ].includes(input.primaryCause)) fail('人間評価の主因が不正です');
  if (input.reason.trim().length === 0) fail('人間評価理由が空です');
  const candidateSha = checkedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  const reviewResultSha = checkedSha(
    input.candidateReviewResultBytes,
    input.expectedCandidateReviewResultSha256,
    'candidate review result'
  );
  const candidate = parse(input.candidateResponseBytes, '正式候補成果物');
  if (candidate.schemaVersion !== CANDIDATE_RESPONSE_SCHEMA) fail('正式候補schemaが不正です');
  const reviewResult = parse(input.candidateReviewResultBytes, 'candidate review result');
  assertDistantConnectionCandidateReviewResultV001(reviewResult);
  if (reviewResult.candidateResponseBinding.path !== input.candidateResponsePath
    || reviewResult.candidateResponseBinding.fileSha256 !== candidateSha
    || reviewResult.sourceVideoId !== candidate.sourceVideoId) {
    fail('candidate review resultが指定正式候補を束縛していません');
  }
  return {
    schemaVersion: DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001,
    reviewId: input.reviewId,
    sourceVideoId: reviewResult.sourceVideoId,
    candidateId: reviewResult.candidateId,
    reviewedAt: input.reviewedAt,
    reviewer: {kind: 'human', id: 'kawafmm'},
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: candidate.schemaVersion as string,
        fileSha256: candidateSha
      },
      candidateReviewResult: {
        path: input.candidateReviewResultPath,
        schemaVersion: reviewResult.schemaVersion,
        fileSha256: reviewResultSha
      }
    },
    evaluatedIntervals: {
      firstPartSourceInterval: {...reviewResult.evaluatedParts[0].sourceInterval},
      secondPartSourceInterval: {...reviewResult.evaluatedParts[1].sourceInterval}
    },
    verdict: input.verdict,
    primaryCause: input.primaryCause,
    reason: input.reason,
    selectionStatus: 'not-selected',
    responsibilityPrinciple: HUMAN_REVIEW_RESPONSIBILITY
  };
}

export function assertDistantConnectionCandidateHumanReviewResultV001(
  value: unknown
): asserts value is DistantConnectionCandidateHumanReviewResultV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'reviewId', 'sourceVideoId', 'candidateId', 'reviewedAt', 'reviewer',
      'sourceBindings', 'evaluatedIntervals', 'verdict', 'primaryCause', 'reason',
      'selectionStatus', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001
    || value.selectionStatus !== 'not-selected'
    || value.responsibilityPrinciple !== HUMAN_REVIEW_RESPONSIBILITY
    || !['rejected', 'approved-for-interval-review'].includes(value.verdict as string)
    || ![
      'candidate-selection', 'connection-validity', 'payoff-strength',
      'visual-suitability', 'intervalization'
    ].includes(value.primaryCause as string)
    || typeof value.reason !== 'string'
    || value.reason.trim().length === 0
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0) fail('candidate human review resultのrootが不正です');
  assertId(value.reviewId, 'human review ID');
  assertId(value.candidateId, 'candidate ID');
  assertIsoDateTime(value.reviewedAt, '評価日時');
  if (!isRecord(value.reviewer)
    || !exactKeys(value.reviewer, ['kind', 'id'])
    || value.reviewer.kind !== 'human'
    || value.reviewer.id !== 'kawafmm') fail('reviewerが人間kawafmmではありません');
  if (!isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, ['candidateResponse', 'candidateReviewResult'])) {
    fail('human reviewのsource bindingが不正です');
  }
  assertFormalBinding(value.sourceBindings.candidateResponse, '正式候補binding');
  assertFormalBinding(value.sourceBindings.candidateReviewResult, 'candidate review result binding');
  if (!isRecord(value.evaluatedIntervals)
    || !exactKeys(value.evaluatedIntervals, [
      'firstPartSourceInterval', 'secondPartSourceInterval'
    ])) fail('評価対象区間が不正です');
  assertInterval(value.evaluatedIntervals.firstPartSourceInterval, '前半評価対象区間');
  assertInterval(value.evaluatedIntervals.secondPartSourceInterval, '後半評価対象区間');
  if ((value.evaluatedIntervals.firstPartSourceInterval as CandidateReviewSourceIntervalV001)
    .sourceEndMs
    > (value.evaluatedIntervals.secondPartSourceInterval as CandidateReviewSourceIntervalV001)
      .sourceStartMs) {
    fail('人間評価対象の前半→後半順序が不正です');
  }
}

export function serializeDistantConnectionCandidateHumanReviewResultV001(
  value: DistantConnectionCandidateHumanReviewResultV001
): Buffer {
  assertDistantConnectionCandidateHumanReviewResultV001(value);
  return formalBytes(value);
}

export async function writeDistantConnectionCandidateHumanReviewResultV001(input: {
  workspaceRoot: string;
  outputPath: string;
  result: DistantConnectionCandidateHumanReviewResultV001;
}): Promise<void> {
  assertPath(input.outputPath, 'candidate human review result出力path');
  const absolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(
    absolute,
    serializeDistantConnectionCandidateHumanReviewResultV001(input.result),
    {flag: 'wx'}
  );
}

export function validateDistantConnectionCandidateHumanReviewResultAgainstSourcesV001(
  value: DistantConnectionCandidateHumanReviewResultV001,
  input: BuildDistantConnectionCandidateHumanReviewResultInputV001
): void {
  assertDistantConnectionCandidateHumanReviewResultV001(value);
  const rebuilt = buildDistantConnectionCandidateHumanReviewResultV001(input);
  if (!formalBytes(value).equals(formalBytes(rebuilt))) {
    fail('candidate human review resultが候補・review結果・人間入力からの決定的再生成byteと一致しません');
  }
}

/**
 * このguardはselectionを承認しない。候補IDが一致する人間不採用をselection入力へ
 * 進めようとした場合だけ必ず拒否し、後段の正式区間承認等は別契約へ残す。
 */
export function assertRejectedCandidateCannotEnterSelectionV001(
  review: DistantConnectionCandidateHumanReviewResultV001,
  proposedSelectionCandidateId: string
): void {
  assertDistantConnectionCandidateHumanReviewResultV001(review);
  assertId(proposedSelectionCandidateId, 'selection対象candidate ID');
  if (review.candidateId !== proposedSelectionCandidateId) {
    fail('selection対象candidateが人間評価対象と一致しません');
  }
  if (review.verdict === 'rejected') {
    fail('人間不採用candidateは正式selectionへ進めません');
  }
}

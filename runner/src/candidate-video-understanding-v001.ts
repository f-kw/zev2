import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001 =
  'candidate-video-understanding-job-v001';
export const CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001 =
  'candidate-video-understanding-result-v001';
export const CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001 =
  'candidate-video-understanding-provider-output-v001';
export const CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001 =
  'candidate-video-source-pts-mapping-v001';

export const CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001 =
  '候補発見後、人間が動画を見る前に必要だった内容観測を、実映像・音声・発話を使ってどこまで代替できるか検証する。境界発見能力の合否、候補探索、最終採否は扱わない。';

export const CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001 = [
  'この短い候補動画の映像・音声・発話だけを観測してください。',
  'core-event、cause、minimal-introduction、reaction、natural-endingについて、確認できた時間範囲と事実だけを返してください。',
  '外しても出来事や反応を損なわない範囲、映像上の注意、候補動画だけでは確認できない材料も返してください。',
  '候補の価値、点数、順位、採否、元動画時刻、正解境界を推測しないでください。',
  '確認できない内容を補完せず、指定されたJSON Schemaだけで回答してください。'
].join('\n');

export const CANDIDATE_VIDEO_ROLE_VALUES_V001 = Object.freeze([
  'core-event',
  'cause',
  'minimal-introduction',
  'reaction',
  'natural-ending'
] as const);

export const CANDIDATE_VIDEO_VISUAL_NOTE_VALUES_V001 = Object.freeze([
  'static-image-centered',
  'text-reading-centered',
  'menu-operation-centered',
  'on-screen-event-not-confirmed',
  'weak-reaction',
  'audio-dependent'
] as const);

export const CANDIDATE_VIDEO_MISSING_EVIDENCE_VALUES_V001 = Object.freeze([
  'cause',
  'premise',
  'result',
  'reaction',
  'visual-event'
] as const);

export const CANDIDATE_VIDEO_EVIDENCE_MODALITY_VALUES_V001 = Object.freeze([
  'video',
  'audio',
  'speech'
] as const);

export const CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001 = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'summary',
    'roleIntervals',
    'removableIntervals',
    'visualNotes',
    'insufficientEvidence'
  ],
  properties: {
    schemaVersion: {
      type: 'string',
      const: CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001
    },
    summary: {type: 'string'},
    roleIntervals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'observationId',
          'role',
          'startTimeMs',
          'endTimeMs',
          'factualDescription',
          'evidenceModalities'
        ],
        properties: {
          observationId: {type: 'string'},
          role: {type: 'string', enum: [...CANDIDATE_VIDEO_ROLE_VALUES_V001]},
          startTimeMs: {type: 'integer', minimum: 0},
          endTimeMs: {type: 'integer', minimum: 1},
          factualDescription: {type: 'string'},
          evidenceModalities: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: {type: 'string', enum: [...CANDIDATE_VIDEO_EVIDENCE_MODALITY_VALUES_V001]}
          }
        }
      }
    },
    removableIntervals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['startTimeMs', 'endTimeMs', 'factualDescription'],
        properties: {
          startTimeMs: {type: 'integer', minimum: 0},
          endTimeMs: {type: 'integer', minimum: 1},
          factualDescription: {type: 'string'}
        }
      }
    },
    visualNotes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'startTimeMs', 'endTimeMs', 'factualDescription'],
        properties: {
          kind: {type: 'string', enum: [...CANDIDATE_VIDEO_VISUAL_NOTE_VALUES_V001]},
          startTimeMs: {type: 'integer', minimum: 0},
          endTimeMs: {type: 'integer', minimum: 1},
          factualDescription: {type: 'string'}
        }
      }
    },
    insufficientEvidence: {
      type: 'object',
      additionalProperties: false,
      required: ['present', 'missingRoles', 'factualDescription'],
      properties: {
        present: {type: 'boolean'},
        missingRoles: {
          type: 'array',
          uniqueItems: true,
          items: {type: 'string', enum: [...CANDIDATE_VIDEO_MISSING_EVIDENCE_VALUES_V001]}
        },
        factualDescription: {type: 'string'}
      }
    }
  }
} as const);

type RecordValue = Record<string, unknown>;
type Role = typeof CANDIDATE_VIDEO_ROLE_VALUES_V001[number];
type VisualNoteKind = typeof CANDIDATE_VIDEO_VISUAL_NOTE_VALUES_V001[number];
type MissingEvidence = typeof CANDIDATE_VIDEO_MISSING_EVIDENCE_VALUES_V001[number];
type EvidenceModality = typeof CANDIDATE_VIDEO_EVIDENCE_MODALITY_VALUES_V001[number];

export type CandidateVideoUnderstandingBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type ExactRationalV001 = {numerator: number; denominator: number};

export type CandidateVideoSourceMappingSegmentV001 = {
  segmentId: string;
  candidateFrameStartIndex: number;
  candidateFrameEndIndexExclusive: number;
  candidateStartPts: number;
  candidateEndPtsExclusive: number;
  sourceFrameStartIndex: number | null;
  sourceFrameEndIndexExclusive: number | null;
  sourceStartPts: number;
  sourceEndPtsExclusive: number;
  sourceSelectionStartMs: number;
  sourceSelectionEndMs: number;
};

export type CandidateVideoUnmappedPtsIntervalV001 = {
  startPts: number;
  endPtsExclusive: number;
  reason: 'no-candidate-frame';
};

export type CandidateVideoClosedSourceMappingV001 = {
  schemaVersion: typeof CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001;
  status: 'closed';
  method: 'formal-frame-pts-piecewise-linear-v001';
  provenance: CandidateVideoUnderstandingBindingV001;
  candidateTimeBase: {numerator: number; denominator: number};
  sourceTimeBase: {numerator: number; denominator: number};
  candidateTimelineStartPts: number;
  candidateTimelineEndPtsExclusive: number;
  segments: CandidateVideoSourceMappingSegmentV001[];
  unmappedCandidatePts: CandidateVideoUnmappedPtsIntervalV001[];
};

export type CandidateVideoUnresolvedSourceMappingV001 = {
  schemaVersion: typeof CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001;
  status: 'unresolved';
  provenance: CandidateVideoUnderstandingBindingV001;
  reason: 'formal-provenance-missing-candidate-segment-frame-boundaries';
};

export type CandidateVideoSourceMappingV001 =
  | CandidateVideoClosedSourceMappingV001
  | CandidateVideoUnresolvedSourceMappingV001;

export type CandidateVideoProviderInputV001 = {
  itemId: string;
  file: {displayName: string; mimeType: 'video/mp4'};
  prompt: {utf8: string; sha256: string};
  responseSchema: {jsonSchema: unknown; canonicalSha256: string};
  settings: {
    model: 'gemini-3.8-flash';
    processing: 'static';
    framesPerSecond: 1;
    mediaResolution: 'high';
    thinkingLevel: 'medium';
    responseMimeType: 'application/json';
    maxVisibleOutputTokens: 4096;
    transport: 'files-api';
  };
};

type PendingPreflightV001 = {
  status: 'pending-exact-request-and-token-count';
  exactRequest: null;
  inputTokenCount: null;
  estimatedInputCostUsd: null;
  priceSnapshot: null;
  visibleOutputTokenLimit: 4096;
  maximumExperimentInferenceCount: 5;
  filesApiAncillaryCommunicationRequired: true;
  thinkingTokensBeforeExecution: 'not-exactly-fixable';
  totalCostBeforeExecution: 'not-exact';
};

type ReadyPreflightV001 = {
  status: 'ready';
  exactRequest: CandidateVideoUnderstandingBindingV001;
  inputTokenCount: number;
  estimatedInputCostUsd: string;
  priceSnapshot: CandidateVideoUnderstandingBindingV001;
  visibleOutputTokenLimit: 4096;
  maximumExperimentInferenceCount: 5;
  filesApiAncillaryCommunicationRequired: true;
  thinkingTokensBeforeExecution: 'not-exactly-fixable';
  totalCostBeforeExecution: 'not-exact';
};

export type CandidateVideoUnderstandingJobV001 = {
  schemaVersion: typeof CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001;
  jobId: string;
  experimentItem: {ordinal: number; opaqueItemId: string};
  purpose: typeof CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001;
  localCandidateId: string;
  localBindings: {
    candidate: CandidateVideoUnderstandingBindingV001;
    semanticUtterance: CandidateVideoUnderstandingBindingV001;
    sourceVideo: CandidateVideoUnderstandingBindingV001;
    candidateVideo: CandidateVideoUnderstandingBindingV001;
  };
  sourceVideoId: string;
  candidateMedia: {
    mimeType: 'video/mp4';
    containerDurationSeconds: ExactRationalV001;
    video: {
      codecName: string;
      width: number;
      height: number;
      frameRateNumerator: number;
      frameRateDenominator: number;
      frameCount: number;
      timeBaseNumerator: number;
      timeBaseDenominator: number;
      firstFramePts: number;
      lastFramePts: number;
      lastFrameDurationPts: number;
    };
    audio: {codecName: string; sampleRateHz: number; channels: number};
  };
  sourceMapping: CandidateVideoSourceMappingV001;
  providerInput: CandidateVideoProviderInputV001;
  providerInputCanonicalSha256: string;
  preflight: PendingPreflightV001 | ReadyPreflightV001;
  inferencePolicy: {inferencesForThisJob: 1; automaticRetryCount: 0; repairCallCount: 0};
};

export type CandidateVideoRoleIntervalV001 = {
  observationId: string;
  role: Role;
  startTimeMs: number;
  endTimeMs: number;
  factualDescription: string;
  evidenceModalities: EvidenceModality[];
};

export type CandidateVideoPlainIntervalV001 = {
  startTimeMs: number;
  endTimeMs: number;
  factualDescription: string;
};

export type CandidateVideoVisualNoteV001 = CandidateVideoPlainIntervalV001 & {
  kind: VisualNoteKind;
};

export type CandidateVideoUnderstandingProviderOutputV001 = {
  schemaVersion: typeof CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001;
  summary: string;
  roleIntervals: CandidateVideoRoleIntervalV001[];
  removableIntervals: CandidateVideoPlainIntervalV001[];
  visualNotes: CandidateVideoVisualNoteV001[];
  insufficientEvidence: {
    present: boolean;
    missingRoles: MissingEvidence[];
    factualDescription: string;
  };
};

export type CandidateVideoProjectedIntervalV001 = {
  mappingSegmentId: string;
  candidateStartTimeMs: ExactRationalV001;
  candidateEndTimeMs: ExactRationalV001;
  sourceStartTimeMs: ExactRationalV001;
  sourceEndTimeMs: ExactRationalV001;
  overlappingSemanticUtteranceIds: string[];
};

export type CandidateVideoProjectedObservationV001 = {
  observationId: string;
  sourceIntervals: CandidateVideoProjectedIntervalV001[];
  unmappedCandidateIntervals: Array<{
    candidateStartTimeMs: ExactRationalV001;
    candidateEndTimeMs: ExactRationalV001;
    reason: 'no-candidate-frame';
  }>;
};

export type CandidateVideoProjectionV001 = Omit<CandidateVideoProjectedObservationV001, 'observationId'>;

export type CandidateVideoUnderstandingResultV001 = {
  schemaVersion: typeof CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001;
  resultId: string;
  jobBinding: CandidateVideoUnderstandingBindingV001;
  execution: {
    attemptId: string;
    executedAt: string;
    httpStatus: number;
    completionStatus: 'completed' | 'failed';
    actualModel: string;
    providerExecutionId: string | null;
    automaticRetryCount: 0;
    repairCallCount: 0;
    exactRequest: CandidateVideoUnderstandingBindingV001;
    rawResponse: CandidateVideoUnderstandingBindingV001;
  };
  structuredValidation: {
    status: 'passed' | 'failed';
    violations: string[];
  };
  providerOutput: CandidateVideoUnderstandingProviderOutputV001 | null;
  projectedRoleIntervals: CandidateVideoProjectedObservationV001[];
  projectedRemovableIntervals: CandidateVideoProjectedObservationV001[];
  projectedVisualNotes: CandidateVideoProjectedObservationV001[];
  usage: {inputTokens: number; outputTokens: number; thinkingTokens: number};
  cost: {
    priceSnapshot: CandidateVideoUnderstandingBindingV001;
    estimatedTotalUsd: string;
    classification: 'estimate-from-provider-usage-not-invoice';
  };
};

export class CandidateVideoUnderstandingContractErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateVideoUnderstandingContractErrorV001';
  }
}

function fail(message: string): never {
  throw new CandidateVideoUnderstandingContractErrorV001(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(value: RecordValue, keys: readonly string[], label: string): void {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    fail(`${label}に不足または余分なfieldがあります`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label}が空または文字列ではありません`);
}

function assertSafeNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${label}が0以上の安全な整数ではありません`);
}

function assertSafePositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) fail(`${label}が正の安全な整数ではありません`);
}

function assertDecimalUsd(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(value)) {
    fail(`${label}が非負の10進表現ではありません`);
  }
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: number, denominator: number): ExactRationalV001 {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    fail('有理時刻が安全な整数で表現できません');
  }
  const divisor = gcd(numerator, denominator);
  return {numerator: numerator / divisor, denominator: denominator / divisor};
}

function assertRational(value: unknown, label: string): asserts value is ExactRationalV001 {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, ['numerator', 'denominator'], label);
  assertSafeNonNegativeInteger(value.numerator, `${label}.numerator`);
  assertSafePositiveInteger(value.denominator, `${label}.denominator`);
  if (gcd(value.numerator, value.denominator) !== 1) fail(`${label}が既約ではありません`);
}

function compareRational(left: ExactRationalV001, right: ExactRationalV001): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  if (!Number.isSafeInteger(difference)) fail('有理時刻の比較が安全な整数範囲を超えました');
  return Math.sign(difference);
}

function sha256Bytes(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSONに有限値ではないnumberがあります');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) fail('canonical JSONに未対応の値があります');
  return Object.fromEntries(Object.keys(value).sort().map((key) => {
    if (value[key] === undefined) fail('canonical JSONにundefinedがあります');
    return [key, canonicalize(value[key])];
  }));
}

export function canonicalJsonBytesV001(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, 'utf8');
}

function canonicalSha256(value: unknown): string {
  return sha256Bytes(canonicalJsonBytesV001(value));
}

function assertSafeRelativePath(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  if (path.posix.isAbsolute(value) || value.includes('\\') || value.includes('\0')) {
    fail(`${label}が安全なworkspace相対pathではありません`);
  }
  const parts = value.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')
    || path.posix.normalize(value) !== value) {
    fail(`${label}が安全なworkspace相対pathではありません`);
  }
}

function assertBinding(value: unknown, label: string): asserts value is CandidateVideoUnderstandingBindingV001 {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, ['path', 'schemaVersion', 'fileSha256'], label);
  assertSafeRelativePath(value.path, `${label}.path`);
  assertNonEmptyString(value.schemaVersion, `${label}.schemaVersion`);
  if (typeof value.fileSha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(value.fileSha256)) {
    fail(`${label}.fileSha256がSHA-256ではありません`);
  }
}

function assertUniqueStringArray(value: unknown, allowed: readonly string[], label: string, allowEmpty: boolean): void {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)
    || value.some((item) => typeof item !== 'string' || !allowed.includes(item))
    || new Set(value).size !== value.length) {
    fail(`${label}に空、未知値、または重複があります`);
  }
}

export function assertCandidateVideoProviderInputV001(
  value: unknown
): asserts value is CandidateVideoProviderInputV001 {
  if (!isRecord(value)) fail('provider inputがobjectではありません');
  assertExactKeys(value, ['itemId', 'file', 'prompt', 'responseSchema', 'settings'], 'provider input');
  if (typeof value.itemId !== 'string' || !/^item-[0-9]{4}$/u.test(value.itemId)) {
    fail('provider inputのitem IDが無意味な実験内番号ではありません');
  }
  if (!isRecord(value.file)) fail('provider input.fileがobjectではありません');
  assertExactKeys(value.file, ['displayName', 'mimeType'], 'provider input.file');
  if (value.file.displayName !== `${value.itemId}.mp4` || value.file.mimeType !== 'video/mp4') {
    fail('providerへ見せるfilenameまたはMIMEが許可値ではありません');
  }
  if (!isRecord(value.prompt)) fail('provider input.promptがobjectではありません');
  assertExactKeys(value.prompt, ['utf8', 'sha256'], 'provider input.prompt');
  if (value.prompt.utf8 !== CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001
    || value.prompt.sha256 !== sha256Bytes(CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001)) {
    fail('provider promptが固定観測指示と一致しません');
  }
  if (!isRecord(value.responseSchema)) fail('provider input.responseSchemaがobjectではありません');
  assertExactKeys(value.responseSchema, ['jsonSchema', 'canonicalSha256'], 'provider input.responseSchema');
  if (canonicalSha256(value.responseSchema.jsonSchema)
      !== canonicalSha256(CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001)
    || value.responseSchema.canonicalSha256
      !== canonicalSha256(CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001)) {
    fail('provider response schemaが固定schemaと一致しません');
  }
  if (!isRecord(value.settings)) fail('provider input.settingsがobjectではありません');
  assertExactKeys(value.settings, [
    'model',
    'processing',
    'framesPerSecond',
    'mediaResolution',
    'thinkingLevel',
    'responseMimeType',
    'maxVisibleOutputTokens',
    'transport'
  ], 'provider input.settings');
  if (value.settings.model !== 'gemini-3.8-flash'
    || value.settings.processing !== 'static'
    || value.settings.framesPerSecond !== 1
    || value.settings.mediaResolution !== 'high'
    || value.settings.thinkingLevel !== 'medium'
    || value.settings.responseMimeType !== 'application/json'
    || value.settings.maxVisibleOutputTokens !== 4096
    || value.settings.transport !== 'files-api') {
    fail('provider inputの実行条件が承認値と一致しません');
  }
}

function assertMappingSegment(
  value: unknown,
  label: string
): asserts value is CandidateVideoSourceMappingSegmentV001 {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, [
    'segmentId',
    'candidateFrameStartIndex',
    'candidateFrameEndIndexExclusive',
    'candidateStartPts',
    'candidateEndPtsExclusive',
    'sourceFrameStartIndex',
    'sourceFrameEndIndexExclusive',
    'sourceStartPts',
    'sourceEndPtsExclusive',
    'sourceSelectionStartMs',
    'sourceSelectionEndMs'
  ], label);
  if (typeof value.segmentId !== 'string' || !/^segment-[0-9]{4}$/u.test(value.segmentId)) {
    fail(`${label}.segmentIdが不正です`);
  }
  assertSafeNonNegativeInteger(value.candidateFrameStartIndex, `${label}.candidateFrameStartIndex`);
  assertSafePositiveInteger(value.candidateFrameEndIndexExclusive, `${label}.candidateFrameEndIndexExclusive`);
  assertSafeNonNegativeInteger(value.candidateStartPts, `${label}.candidateStartPts`);
  assertSafePositiveInteger(value.candidateEndPtsExclusive, `${label}.candidateEndPtsExclusive`);
  assertSafeNonNegativeInteger(value.sourceStartPts, `${label}.sourceStartPts`);
  assertSafePositiveInteger(value.sourceEndPtsExclusive, `${label}.sourceEndPtsExclusive`);
  assertSafeNonNegativeInteger(value.sourceSelectionStartMs, `${label}.sourceSelectionStartMs`);
  assertSafePositiveInteger(value.sourceSelectionEndMs, `${label}.sourceSelectionEndMs`);
  if (value.candidateFrameEndIndexExclusive <= value.candidateFrameStartIndex
    || value.candidateEndPtsExclusive <= value.candidateStartPts
    || value.sourceEndPtsExclusive <= value.sourceStartPts
    || value.sourceSelectionEndMs <= value.sourceSelectionStartMs) {
    fail(`${label}の時刻が逆転または空です`);
  }
  const bothSourceFrameBoundsAreNull = value.sourceFrameStartIndex === null
    && value.sourceFrameEndIndexExclusive === null;
  const bothSourceFrameBoundsAreIntegers = Number.isSafeInteger(value.sourceFrameStartIndex)
    && Number.isSafeInteger(value.sourceFrameEndIndexExclusive)
    && (value.sourceFrameStartIndex as number) >= 0
    && (value.sourceFrameEndIndexExclusive as number) > (value.sourceFrameStartIndex as number);
  if (!bothSourceFrameBoundsAreNull && !bothSourceFrameBoundsAreIntegers) {
    fail(`${label}の元動画frame範囲が片側欠落または不正です`);
  }
  if (bothSourceFrameBoundsAreIntegers
    && (value.sourceFrameEndIndexExclusive as number) - (value.sourceFrameStartIndex as number)
      !== value.candidateFrameEndIndexExclusive - value.candidateFrameStartIndex) {
    fail(`${label}の候補frame数と元動画frame数が一致しません`);
  }
}

function assertTimeBase(value: unknown, label: string): asserts value is {numerator: number; denominator: number} {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, ['numerator', 'denominator'], label);
  assertSafePositiveInteger(value.numerator, `${label}.numerator`);
  assertSafePositiveInteger(value.denominator, `${label}.denominator`);
  if (gcd(value.numerator, value.denominator) !== 1) fail(`${label}が既約ではありません`);
}

function assertUnmappedPtsInterval(
  value: unknown,
  label: string
): asserts value is CandidateVideoUnmappedPtsIntervalV001 {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, ['startPts', 'endPtsExclusive', 'reason'], label);
  assertSafeNonNegativeInteger(value.startPts, `${label}.startPts`);
  assertSafePositiveInteger(value.endPtsExclusive, `${label}.endPtsExclusive`);
  if (value.endPtsExclusive <= value.startPts || value.reason !== 'no-candidate-frame') {
    fail(`${label}が空・逆転、または未知理由です`);
  }
}

function assertSourceMapping(
  value: unknown,
  frameCount: number,
  videoTimeBaseNumerator: number,
  videoTimeBaseDenominator: number,
  firstFramePts: number,
  lastFramePts: number,
  lastFrameDurationPts: number
): asserts value is CandidateVideoSourceMappingV001 {
  if (!isRecord(value)) fail('source mappingがobjectではありません');
  if (value.status === 'unresolved') {
    assertExactKeys(value, ['schemaVersion', 'status', 'provenance', 'reason'], 'unresolved source mapping');
    if (value.schemaVersion !== CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001
      || value.reason !== 'formal-provenance-missing-candidate-segment-frame-boundaries') {
      fail('unresolved source mappingのschemaまたは理由が不正です');
    }
    assertBinding(value.provenance, 'unresolved source mapping.provenance');
    return;
  }
  assertExactKeys(value, [
    'schemaVersion',
    'status',
    'method',
    'provenance',
    'candidateTimeBase',
    'sourceTimeBase',
    'candidateTimelineStartPts',
    'candidateTimelineEndPtsExclusive',
    'segments',
    'unmappedCandidatePts'
  ], 'closed source mapping');
  if (value.schemaVersion !== CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001
    || value.status !== 'closed'
    || value.method !== 'formal-frame-pts-piecewise-linear-v001') {
    fail('closed source mappingのschema、status、またはmethodが不正です');
  }
  assertBinding(value.provenance, 'closed source mapping.provenance');
  assertTimeBase(value.candidateTimeBase, 'closed source mapping.candidateTimeBase');
  assertTimeBase(value.sourceTimeBase, 'closed source mapping.sourceTimeBase');
  assertSafeNonNegativeInteger(value.candidateTimelineStartPts, 'candidateTimelineStartPts');
  assertSafePositiveInteger(value.candidateTimelineEndPtsExclusive, 'candidateTimelineEndPtsExclusive');
  if (value.candidateTimeBase.numerator !== videoTimeBaseNumerator
    || value.candidateTimeBase.denominator !== videoTimeBaseDenominator
    || value.candidateTimelineStartPts !== firstFramePts
    || value.candidateTimelineEndPtsExclusive !== lastFramePts + lastFrameDurationPts) {
    fail('source mappingの候補PTS軸が実在video frame PTSと一致しません');
  }
  if (!Array.isArray(value.segments) || value.segments.length === 0) {
    fail('source mappingにsegmentがありません');
  }
  if (!Array.isArray(value.unmappedCandidatePts)) fail('unmapped candidate PTSがarrayではありません');
  let nextCandidateFrameIndex = 0;
  let previousSourceSelectionEndMs = -1;
  let previousSourceEndPtsExclusive = -1;
  const ids = new Set<string>();
  for (const [index, segment] of value.segments.entries()) {
    assertMappingSegment(segment, `source mapping.segments[${index}]`);
    if (ids.has(segment.segmentId)) fail('source mappingのsegment IDが重複しています');
    ids.add(segment.segmentId);
    if (segment.candidateFrameStartIndex !== nextCandidateFrameIndex) {
      fail('source mappingの候補frame範囲に隙間、重複、または順序逆転があります');
    }
    if (segment.sourceSelectionStartMs < previousSourceSelectionEndMs) {
      fail('source mappingの元動画時刻が重複または逆順です');
    }
    if (segment.sourceStartPts < previousSourceEndPtsExclusive) {
      fail('source mappingの元動画PTSが重複または逆順です');
    }
    nextCandidateFrameIndex = segment.candidateFrameEndIndexExclusive;
    previousSourceSelectionEndMs = segment.sourceSelectionEndMs;
    previousSourceEndPtsExclusive = segment.sourceEndPtsExclusive;
  }
  if (nextCandidateFrameIndex !== frameCount) {
    fail('source mappingが候補動画の全frameを過不足なく覆っていません');
  }
  value.unmappedCandidatePts.forEach((interval, index) =>
    assertUnmappedPtsInterval(interval, `source mapping.unmappedCandidatePts[${index}]`));
  const coverage = [
    ...value.segments.map((segment) => ({
      startPts: segment.candidateStartPts,
      endPtsExclusive: segment.candidateEndPtsExclusive,
      kind: 'mapped'
    })),
    ...value.unmappedCandidatePts.map((interval) => ({
      startPts: interval.startPts,
      endPtsExclusive: interval.endPtsExclusive,
      kind: 'unmapped'
    }))
  ].sort((left, right) => left.startPts - right.startPts);
  let nextPts = value.candidateTimelineStartPts;
  for (const interval of coverage) {
    if (interval.startPts !== nextPts) {
      fail('mapped segmentとunmapped PTSが候補動画PTS軸を隙間・重複なく覆っていません');
    }
    nextPts = interval.endPtsExclusive;
  }
  if (nextPts !== value.candidateTimelineEndPtsExclusive) {
    fail('source mappingが候補動画PTS軸の終端まで閉じていません');
  }
}

function assertPreflight(value: unknown): asserts value is PendingPreflightV001 | ReadyPreflightV001 {
  if (!isRecord(value)) fail('preflightがobjectではありません');
  assertExactKeys(value, [
    'status',
    'exactRequest',
    'inputTokenCount',
    'estimatedInputCostUsd',
    'priceSnapshot',
    'visibleOutputTokenLimit',
    'maximumExperimentInferenceCount',
    'filesApiAncillaryCommunicationRequired',
    'thinkingTokensBeforeExecution',
    'totalCostBeforeExecution'
  ], 'preflight');
  if (value.visibleOutputTokenLimit !== 4096
    || value.maximumExperimentInferenceCount !== 5
    || value.filesApiAncillaryCommunicationRequired !== true
    || value.thinkingTokensBeforeExecution !== 'not-exactly-fixable'
    || value.totalCostBeforeExecution !== 'not-exact') {
    fail('preflightの費用・回数契約が承認値と一致しません');
  }
  if (value.status === 'pending-exact-request-and-token-count') {
    if (value.exactRequest !== null || value.inputTokenCount !== null
      || value.estimatedInputCostUsd !== null || value.priceSnapshot !== null) {
      fail('未完了preflightに未確定値が入っています');
    }
    return;
  }
  if (value.status !== 'ready') fail('preflight.statusが未知です');
  assertBinding(value.exactRequest, 'preflight.exactRequest');
  assertSafeNonNegativeInteger(value.inputTokenCount, 'preflight.inputTokenCount');
  assertDecimalUsd(value.estimatedInputCostUsd, 'preflight.estimatedInputCostUsd');
  assertBinding(value.priceSnapshot, 'preflight.priceSnapshot');
}

export function assertCandidateVideoUnderstandingJobV001(
  value: unknown
): asserts value is CandidateVideoUnderstandingJobV001 {
  if (!isRecord(value)) fail('candidate video understanding jobがobjectではありません');
  assertExactKeys(value, [
    'schemaVersion',
    'jobId',
    'experimentItem',
    'purpose',
    'localCandidateId',
    'localBindings',
    'sourceVideoId',
    'candidateMedia',
    'sourceMapping',
    'providerInput',
    'providerInputCanonicalSha256',
    'preflight',
    'inferencePolicy'
  ], 'candidate video understanding job');
  if (value.schemaVersion !== CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001) fail('job schemaが不正です');
  assertNonEmptyString(value.jobId, 'jobId');
  assertNonEmptyString(value.localCandidateId, 'localCandidateId');
  assertNonEmptyString(value.sourceVideoId, 'sourceVideoId');
  if (value.purpose !== CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001) fail('実験目的が承認内容と一致しません');
  if (!isRecord(value.experimentItem)) fail('experimentItemがobjectではありません');
  assertExactKeys(value.experimentItem, ['ordinal', 'opaqueItemId'], 'experimentItem');
  assertSafePositiveInteger(value.experimentItem.ordinal, 'experimentItem.ordinal');
  if (value.experimentItem.ordinal > 5
    || value.experimentItem.opaqueItemId !== `item-${String(value.experimentItem.ordinal).padStart(4, '0')}`) {
    fail('experimentItemが1〜5の無意味な番号として閉じていません');
  }
  if (!isRecord(value.localBindings)) fail('localBindingsがobjectではありません');
  assertExactKeys(value.localBindings, [
    'candidate', 'semanticUtterance', 'sourceVideo', 'candidateVideo'
  ], 'localBindings');
  assertBinding(value.localBindings.candidate, 'localBindings.candidate');
  assertBinding(value.localBindings.semanticUtterance, 'localBindings.semanticUtterance');
  assertBinding(value.localBindings.sourceVideo, 'localBindings.sourceVideo');
  assertBinding(value.localBindings.candidateVideo, 'localBindings.candidateVideo');
  if (!isRecord(value.candidateMedia)) fail('candidateMediaがobjectではありません');
  assertExactKeys(value.candidateMedia, ['mimeType', 'containerDurationSeconds', 'video', 'audio'], 'candidateMedia');
  if (value.candidateMedia.mimeType !== 'video/mp4') fail('candidateMedia MIMEがvideo/mp4ではありません');
  assertRational(value.candidateMedia.containerDurationSeconds, 'candidateMedia.containerDurationSeconds');
  if (!isRecord(value.candidateMedia.video)) fail('candidateMedia.videoがobjectではありません');
  assertExactKeys(value.candidateMedia.video, [
    'codecName',
    'width',
    'height',
    'frameRateNumerator',
    'frameRateDenominator',
    'frameCount',
    'timeBaseNumerator',
    'timeBaseDenominator',
    'firstFramePts',
    'lastFramePts',
    'lastFrameDurationPts'
  ], 'candidateMedia.video');
  assertNonEmptyString(value.candidateMedia.video.codecName, 'candidateMedia.video.codecName');
  assertSafePositiveInteger(value.candidateMedia.video.width, 'candidateMedia.video.width');
  assertSafePositiveInteger(value.candidateMedia.video.height, 'candidateMedia.video.height');
  assertSafePositiveInteger(value.candidateMedia.video.frameRateNumerator, 'candidateMedia.video.frameRateNumerator');
  assertSafePositiveInteger(value.candidateMedia.video.frameRateDenominator, 'candidateMedia.video.frameRateDenominator');
  assertSafePositiveInteger(value.candidateMedia.video.frameCount, 'candidateMedia.video.frameCount');
  assertSafePositiveInteger(value.candidateMedia.video.timeBaseNumerator, 'candidateMedia.video.timeBaseNumerator');
  assertSafePositiveInteger(value.candidateMedia.video.timeBaseDenominator, 'candidateMedia.video.timeBaseDenominator');
  assertSafeNonNegativeInteger(value.candidateMedia.video.firstFramePts, 'candidateMedia.video.firstFramePts');
  assertSafeNonNegativeInteger(value.candidateMedia.video.lastFramePts, 'candidateMedia.video.lastFramePts');
  assertSafePositiveInteger(value.candidateMedia.video.lastFrameDurationPts, 'candidateMedia.video.lastFrameDurationPts');
  if (value.candidateMedia.video.lastFramePts < value.candidateMedia.video.firstFramePts) {
    fail('candidateMedia.videoのframe PTSが逆転しています');
  }
  if (!isRecord(value.candidateMedia.audio)) fail('candidateMedia.audioがobjectではありません');
  assertExactKeys(value.candidateMedia.audio, ['codecName', 'sampleRateHz', 'channels'], 'candidateMedia.audio');
  assertNonEmptyString(value.candidateMedia.audio.codecName, 'candidateMedia.audio.codecName');
  assertSafePositiveInteger(value.candidateMedia.audio.sampleRateHz, 'candidateMedia.audio.sampleRateHz');
  assertSafePositiveInteger(value.candidateMedia.audio.channels, 'candidateMedia.audio.channels');
  assertSourceMapping(
    value.sourceMapping,
    value.candidateMedia.video.frameCount,
    value.candidateMedia.video.timeBaseNumerator,
    value.candidateMedia.video.timeBaseDenominator,
    value.candidateMedia.video.firstFramePts,
    value.candidateMedia.video.lastFramePts,
    value.candidateMedia.video.lastFrameDurationPts
  );
  assertCandidateVideoProviderInputV001(value.providerInput);
  if (value.providerInput.itemId !== value.experimentItem.opaqueItemId
    || value.providerInputCanonicalSha256 !== canonicalSha256(value.providerInput)) {
    fail('provider inputが実験番号またはcanonical SHAと一致しません');
  }
  assertPreflight(value.preflight);
  if (!isRecord(value.inferencePolicy)) fail('inferencePolicyがobjectではありません');
  assertExactKeys(value.inferencePolicy, [
    'inferencesForThisJob', 'automaticRetryCount', 'repairCallCount'
  ], 'inferencePolicy');
  if (value.inferencePolicy.inferencesForThisJob !== 1
    || value.inferencePolicy.automaticRetryCount !== 0
    || value.inferencePolicy.repairCallCount !== 0) {
    fail('1動画1推論、retry 0、repair 0の契約に違反しています');
  }
}

export function assertCandidateVideoUnderstandingExperimentJobsV001(
  values: unknown
): asserts values is CandidateVideoUnderstandingJobV001[] {
  if (!Array.isArray(values) || values.length !== 5) {
    fail('比較実験jobは5件ちょうどでなければなりません');
  }
  values.forEach(assertCandidateVideoUnderstandingJobV001);
  const ordinals = values.map((job) => job.experimentItem.ordinal).sort((left, right) => left - right);
  if (ordinals.some((ordinal, index) => ordinal !== index + 1)
    || new Set(values.map((job) => job.jobId)).size !== values.length
    || new Set(values.map((job) => job.localBindings.candidateVideo.fileSha256)).size !== values.length
    || new Set(values.map((job) => job.providerInputCanonicalSha256)).size !== values.length) {
    fail('5件の実験番号、job ID、候補動画、またはprovider inputが一意ではありません');
  }
}

export function assertCandidateVideoUnderstandingJobReadyForExecutionV001(
  job: CandidateVideoUnderstandingJobV001
): void {
  assertCandidateVideoUnderstandingJobV001(job);
  if (job.sourceMapping.status !== 'closed') {
    fail('正式source mappingが閉じていないためprovider実行できません');
  }
  if (job.preflight.status !== 'ready') {
    fail('exact request、input token数、input費用、価格snapshotが未確定のためprovider実行できません');
  }
}

function assertTimedInterval(
  value: RecordValue,
  label: string,
  video: CandidateVideoUnderstandingJobV001['candidateMedia']['video']
): void {
  assertSafeNonNegativeInteger(value.startTimeMs, `${label}.startTimeMs`);
  assertSafePositiveInteger(value.endTimeMs, `${label}.endTimeMs`);
  if ((value.endTimeMs as number) <= (value.startTimeMs as number)) fail(`${label}が空または逆転しています`);
  const startPtsScaled = (value.startTimeMs as number) * video.timeBaseDenominator;
  const endPtsScaled = (value.endTimeMs as number) * video.timeBaseDenominator;
  const timelineScale = 1000 * video.timeBaseNumerator;
  if (startPtsScaled < video.firstFramePts * timelineScale
    || endPtsScaled > (video.lastFramePts + video.lastFrameDurationPts) * timelineScale) {
    fail(`${label}が候補動画の映像尺外です`);
  }
  assertNonEmptyString(value.factualDescription, `${label}.factualDescription`);
}

export function assertCandidateVideoUnderstandingProviderOutputV001(
  value: unknown,
  job: CandidateVideoUnderstandingJobV001
): asserts value is CandidateVideoUnderstandingProviderOutputV001 {
  assertCandidateVideoUnderstandingJobV001(job);
  if (!isRecord(value)) fail('provider outputがobjectではありません');
  assertExactKeys(value, [
    'schemaVersion',
    'summary',
    'roleIntervals',
    'removableIntervals',
    'visualNotes',
    'insufficientEvidence'
  ], 'provider output');
  if (value.schemaVersion !== CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001) {
    fail('provider output schemaが不正です');
  }
  assertNonEmptyString(value.summary, 'provider output.summary');
  if (!Array.isArray(value.roleIntervals)
    || !Array.isArray(value.removableIntervals)
    || !Array.isArray(value.visualNotes)) {
    fail('provider outputのinterval listがarrayではありません');
  }
  const observationIds = new Set<string>();
  const roleDuplicates = new Set<string>();
  for (const [index, item] of value.roleIntervals.entries()) {
    if (!isRecord(item)) fail(`roleIntervals[${index}]がobjectではありません`);
    assertExactKeys(item, [
      'observationId', 'role', 'startTimeMs', 'endTimeMs', 'factualDescription', 'evidenceModalities'
    ], `roleIntervals[${index}]`);
    if (typeof item.observationId !== 'string' || !/^observation-[0-9]{3,}$/u.test(item.observationId)
      || observationIds.has(item.observationId)) {
      fail('role intervalのobservation IDが不正または重複しています');
    }
    observationIds.add(item.observationId);
    if (typeof item.role !== 'string' || !CANDIDATE_VIDEO_ROLE_VALUES_V001.includes(item.role as Role)) {
      fail(`roleIntervals[${index}].roleが未知です`);
    }
    assertTimedInterval(item, `roleIntervals[${index}]`, job.candidateMedia.video);
    assertUniqueStringArray(
      item.evidenceModalities,
      CANDIDATE_VIDEO_EVIDENCE_MODALITY_VALUES_V001,
      `roleIntervals[${index}].evidenceModalities`,
      false
    );
    const duplicateKey = canonicalSha256({
      role: item.role,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs,
      factualDescription: item.factualDescription,
      evidenceModalities: [...(item.evidenceModalities as string[])].sort()
    });
    if (roleDuplicates.has(duplicateKey)) fail('完全重複したrole intervalがあります');
    roleDuplicates.add(duplicateKey);
  }
  const plainDuplicates = new Set<string>();
  for (const [index, item] of value.removableIntervals.entries()) {
    if (!isRecord(item)) fail(`removableIntervals[${index}]がobjectではありません`);
    assertExactKeys(item, ['startTimeMs', 'endTimeMs', 'factualDescription'], `removableIntervals[${index}]`);
    assertTimedInterval(item, `removableIntervals[${index}]`, job.candidateMedia.video);
    const duplicateKey = canonicalSha256(item);
    if (plainDuplicates.has(duplicateKey)) fail('完全重複したremovable intervalがあります');
    plainDuplicates.add(duplicateKey);
  }
  const visualDuplicates = new Set<string>();
  for (const [index, item] of value.visualNotes.entries()) {
    if (!isRecord(item)) fail(`visualNotes[${index}]がobjectではありません`);
    assertExactKeys(item, ['kind', 'startTimeMs', 'endTimeMs', 'factualDescription'], `visualNotes[${index}]`);
    if (typeof item.kind !== 'string'
      || !CANDIDATE_VIDEO_VISUAL_NOTE_VALUES_V001.includes(item.kind as VisualNoteKind)) {
      fail(`visualNotes[${index}].kindが未知です`);
    }
    assertTimedInterval(item, `visualNotes[${index}]`, job.candidateMedia.video);
    const duplicateKey = canonicalSha256(item);
    if (visualDuplicates.has(duplicateKey)) fail('完全重複したvisual noteがあります');
    visualDuplicates.add(duplicateKey);
  }
  if (!isRecord(value.insufficientEvidence)) fail('insufficientEvidenceがobjectではありません');
  assertExactKeys(value.insufficientEvidence, [
    'present', 'missingRoles', 'factualDescription'
  ], 'insufficientEvidence');
  if (typeof value.insufficientEvidence.present !== 'boolean') fail('insufficientEvidence.presentがbooleanではありません');
  assertUniqueStringArray(
    value.insufficientEvidence.missingRoles,
    CANDIDATE_VIDEO_MISSING_EVIDENCE_VALUES_V001,
    'insufficientEvidence.missingRoles',
    true
  );
  assertNonEmptyString(value.insufficientEvidence.factualDescription, 'insufficientEvidence.factualDescription');
  if (value.insufficientEvidence.present !== ((value.insufficientEvidence.missingRoles as unknown[]).length > 0)) {
    fail('insufficientEvidenceのpresentとmissingRolesが一致しません');
  }
}

function millisecondsToPts(
  milliseconds: number,
  timeBase: {numerator: number; denominator: number}
): ExactRationalV001 {
  return rational(milliseconds * timeBase.denominator, 1000 * timeBase.numerator);
}

function ptsToMilliseconds(
  pts: ExactRationalV001,
  timeBase: {numerator: number; denominator: number}
): ExactRationalV001 {
  return rational(
    pts.numerator * 1000 * timeBase.numerator,
    pts.denominator * timeBase.denominator
  );
}

function projectPtsPointToSourceMilliseconds(
  pointPts: ExactRationalV001,
  segment: CandidateVideoSourceMappingSegmentV001,
  sourceTimeBase: {numerator: number; denominator: number}
): ExactRationalV001 {
  const candidateDurationPts = segment.candidateEndPtsExclusive - segment.candidateStartPts;
  const offsetNumerator = pointPts.numerator - segment.candidateStartPts * pointPts.denominator;
  const sourceDurationPts = segment.sourceEndPtsExclusive - segment.sourceStartPts;
  const sourcePts = rational(
    segment.sourceStartPts * pointPts.denominator * candidateDurationPts
      + offsetNumerator * sourceDurationPts,
    pointPts.denominator * candidateDurationPts
  );
  return ptsToMilliseconds(sourcePts, sourceTimeBase);
}

export function projectCandidateIntervalToSourceV001(
  job: CandidateVideoUnderstandingJobV001,
  interval: {startTimeMs: number; endTimeMs: number}
): CandidateVideoProjectionV001 {
  assertCandidateVideoUnderstandingJobV001(job);
  if (job.sourceMapping.status !== 'closed') {
    fail('正式source mappingが閉じていないため時刻投影できません');
  }
  const mapping = job.sourceMapping;
  assertSafeNonNegativeInteger(interval.startTimeMs, '投影区間.startTimeMs');
  assertSafePositiveInteger(interval.endTimeMs, '投影区間.endTimeMs');
  const video = job.candidateMedia.video;
  const startPts = millisecondsToPts(interval.startTimeMs, mapping.candidateTimeBase);
  const endPts = millisecondsToPts(interval.endTimeMs, mapping.candidateTimeBase);
  const timelineStart = rational(mapping.candidateTimelineStartPts, 1);
  const timelineEnd = rational(mapping.candidateTimelineEndPtsExclusive, 1);
  if (interval.endTimeMs <= interval.startTimeMs
    || compareRational(startPts, timelineStart) < 0
    || compareRational(endPts, timelineEnd) > 0
    || video.timeBaseNumerator !== mapping.candidateTimeBase.numerator
    || video.timeBaseDenominator !== mapping.candidateTimeBase.denominator) {
    fail('投影区間が空、逆転、または候補動画尺外です');
  }
  const projected: CandidateVideoProjectedIntervalV001[] = [];
  for (const segment of mapping.segments) {
    const segmentStart = rational(segment.candidateStartPts, 1);
    const segmentEnd = rational(segment.candidateEndPtsExclusive, 1);
    const intersectionStart = compareRational(startPts, segmentStart) > 0 ? startPts : segmentStart;
    const intersectionEnd = compareRational(endPts, segmentEnd) < 0 ? endPts : segmentEnd;
    if (compareRational(intersectionStart, intersectionEnd) >= 0) continue;
    projected.push({
      mappingSegmentId: segment.segmentId,
      candidateStartTimeMs: ptsToMilliseconds(intersectionStart, mapping.candidateTimeBase),
      candidateEndTimeMs: ptsToMilliseconds(intersectionEnd, mapping.candidateTimeBase),
      sourceStartTimeMs: projectPtsPointToSourceMilliseconds(
        intersectionStart,
        segment,
        mapping.sourceTimeBase
      ),
      sourceEndTimeMs: projectPtsPointToSourceMilliseconds(
        intersectionEnd,
        segment,
        mapping.sourceTimeBase
      ),
      overlappingSemanticUtteranceIds: []
    });
  }
  const unmappedCandidateIntervals = mapping.unmappedCandidatePts.flatMap((gap) => {
    const gapStart = rational(gap.startPts, 1);
    const gapEnd = rational(gap.endPtsExclusive, 1);
    const intersectionStart = compareRational(startPts, gapStart) > 0 ? startPts : gapStart;
    const intersectionEnd = compareRational(endPts, gapEnd) < 0 ? endPts : gapEnd;
    if (compareRational(intersectionStart, intersectionEnd) >= 0) return [];
    return [{
      candidateStartTimeMs: ptsToMilliseconds(intersectionStart, mapping.candidateTimeBase),
      candidateEndTimeMs: ptsToMilliseconds(intersectionEnd, mapping.candidateTimeBase),
      reason: 'no-candidate-frame' as const
    }];
  });
  if (projected.length === 0 && unmappedCandidateIntervals.length === 0) {
    fail('投影区間がmapped segmentにもunmapped PTSにも交差しません');
  }
  return {sourceIntervals: projected, unmappedCandidateIntervals};
}

function assertProjectedInterval(value: unknown, label: string): asserts value is CandidateVideoProjectedIntervalV001 {
  if (!isRecord(value)) fail(`${label}がobjectではありません`);
  assertExactKeys(value, [
    'mappingSegmentId',
    'candidateStartTimeMs',
    'candidateEndTimeMs',
    'sourceStartTimeMs',
    'sourceEndTimeMs',
    'overlappingSemanticUtteranceIds'
  ], label);
  assertNonEmptyString(value.mappingSegmentId, `${label}.mappingSegmentId`);
  assertRational(value.candidateStartTimeMs, `${label}.candidateStartTimeMs`);
  assertRational(value.candidateEndTimeMs, `${label}.candidateEndTimeMs`);
  assertRational(value.sourceStartTimeMs, `${label}.sourceStartTimeMs`);
  assertRational(value.sourceEndTimeMs, `${label}.sourceEndTimeMs`);
  if (compareRational(value.candidateStartTimeMs, value.candidateEndTimeMs) >= 0
    || compareRational(value.sourceStartTimeMs, value.sourceEndTimeMs) >= 0) {
    fail(`${label}の候補時刻または元動画時刻が空・逆転しています`);
  }
  if (!Array.isArray(value.overlappingSemanticUtteranceIds)
    || value.overlappingSemanticUtteranceIds.some((id) => typeof id !== 'string' || id.length === 0)
    || new Set(value.overlappingSemanticUtteranceIds).size !== value.overlappingSemanticUtteranceIds.length) {
    fail(`${label}.overlappingSemanticUtteranceIdsが不正です`);
  }
}

function assertProjectedObservationList(value: unknown, label: string): void {
  if (!Array.isArray(value)) fail(`${label}がarrayではありません`);
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) fail(`${label}[${index}]がobjectではありません`);
    assertExactKeys(
      item,
      ['observationId', 'sourceIntervals', 'unmappedCandidateIntervals'],
      `${label}[${index}]`
    );
    assertNonEmptyString(item.observationId, `${label}[${index}].observationId`);
    if (ids.has(item.observationId)) fail(`${label}のobservation IDが重複しています`);
    ids.add(item.observationId);
    if (!Array.isArray(item.sourceIntervals) || !Array.isArray(item.unmappedCandidateIntervals)
      || (item.sourceIntervals.length === 0 && item.unmappedCandidateIntervals.length === 0)) {
      fail(`${label}[${index}]にmapped区間もunmapped区間もありません`);
    }
    item.sourceIntervals.forEach((interval, intervalIndex) =>
      assertProjectedInterval(interval, `${label}[${index}].sourceIntervals[${intervalIndex}]`));
    item.unmappedCandidateIntervals.forEach((interval, intervalIndex) => {
      const intervalLabel = `${label}[${index}].unmappedCandidateIntervals[${intervalIndex}]`;
      if (!isRecord(interval)) fail(`${intervalLabel}がobjectではありません`);
      assertExactKeys(
        interval,
        ['candidateStartTimeMs', 'candidateEndTimeMs', 'reason'],
        intervalLabel
      );
      assertRational(interval.candidateStartTimeMs, `${intervalLabel}.candidateStartTimeMs`);
      assertRational(interval.candidateEndTimeMs, `${intervalLabel}.candidateEndTimeMs`);
      if (compareRational(interval.candidateStartTimeMs, interval.candidateEndTimeMs) >= 0
        || interval.reason !== 'no-candidate-frame') {
        fail(`${intervalLabel}が空・逆転、または未知理由です`);
      }
    });
  }
}

function projectionWithoutUtteranceOverlap(interval: CandidateVideoProjectedIntervalV001): unknown {
  return {
    mappingSegmentId: interval.mappingSegmentId,
    candidateStartTimeMs: interval.candidateStartTimeMs,
    candidateEndTimeMs: interval.candidateEndTimeMs,
    sourceStartTimeMs: interval.sourceStartTimeMs,
    sourceEndTimeMs: interval.sourceEndTimeMs
  };
}

function assertProjectionMatchesProviderIntervals(
  job: CandidateVideoUnderstandingJobV001,
  actual: unknown,
  expectedInputs: Array<{id: string; startTimeMs: number; endTimeMs: number}>,
  label: string
): void {
  if (!Array.isArray(actual) || actual.length !== expectedInputs.length) {
    fail(`${label}の件数がprovider outputと一致しません`);
  }
  for (const [index, input] of expectedInputs.entries()) {
    const row = actual[index];
    if (!isRecord(row) || row.observationId !== input.id || !Array.isArray(row.sourceIntervals)) {
      fail(`${label}[${index}]がprovider outputの順序・IDと一致しません`);
    }
    const expectedProjection = projectCandidateIntervalToSourceV001(job, input);
    const expected = expectedProjection.sourceIntervals.map(projectionWithoutUtteranceOverlap);
    const observed = (row.sourceIntervals as CandidateVideoProjectedIntervalV001[])
      .map(projectionWithoutUtteranceOverlap);
    if (canonicalSha256(expected) !== canonicalSha256(observed)
      || canonicalSha256(expectedProjection.unmappedCandidateIntervals)
        !== canonicalSha256(row.unmappedCandidateIntervals)) {
      fail(`${label}[${index}]が決定的source projectionと一致しません`);
    }
  }
}

export function assertCandidateVideoUnderstandingResultV001(
  value: unknown,
  job?: CandidateVideoUnderstandingJobV001
): asserts value is CandidateVideoUnderstandingResultV001 {
  if (!isRecord(value)) fail('candidate video understanding resultがobjectではありません');
  assertExactKeys(value, [
    'schemaVersion',
    'resultId',
    'jobBinding',
    'execution',
    'structuredValidation',
    'providerOutput',
    'projectedRoleIntervals',
    'projectedRemovableIntervals',
    'projectedVisualNotes',
    'usage',
    'cost'
  ], 'candidate video understanding result');
  if (value.schemaVersion !== CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001) fail('result schemaが不正です');
  assertNonEmptyString(value.resultId, 'resultId');
  assertBinding(value.jobBinding, 'result.jobBinding');
  if (!isRecord(value.execution)) fail('result.executionがobjectではありません');
  assertExactKeys(value.execution, [
    'attemptId',
    'executedAt',
    'httpStatus',
    'completionStatus',
    'actualModel',
    'providerExecutionId',
    'automaticRetryCount',
    'repairCallCount',
    'exactRequest',
    'rawResponse'
  ], 'result.execution');
  assertNonEmptyString(value.execution.attemptId, 'result.execution.attemptId');
  assertNonEmptyString(value.execution.executedAt, 'result.execution.executedAt');
  if (Number.isNaN(Date.parse(value.execution.executedAt as string))) fail('実行時刻がISO日時ではありません');
  assertSafeNonNegativeInteger(value.execution.httpStatus, 'result.execution.httpStatus');
  if ((value.execution.httpStatus as number) > 599) fail('HTTP statusが範囲外です');
  if (value.execution.completionStatus !== 'completed' && value.execution.completionStatus !== 'failed') {
    fail('completion statusが未知です');
  }
  assertNonEmptyString(value.execution.actualModel, 'result.execution.actualModel');
  if (value.execution.providerExecutionId !== null) {
    assertNonEmptyString(value.execution.providerExecutionId, 'result.execution.providerExecutionId');
  }
  if (value.execution.automaticRetryCount !== 0 || value.execution.repairCallCount !== 0) {
    fail('resultがretryまたはrepairを記録しています');
  }
  assertBinding(value.execution.exactRequest, 'result.execution.exactRequest');
  assertBinding(value.execution.rawResponse, 'result.execution.rawResponse');
  if (!isRecord(value.structuredValidation)) fail('structuredValidationがobjectではありません');
  assertExactKeys(value.structuredValidation, ['status', 'violations'], 'structuredValidation');
  if (value.structuredValidation.status !== 'passed' && value.structuredValidation.status !== 'failed') {
    fail('structuredValidation.statusが未知です');
  }
  if (!Array.isArray(value.structuredValidation.violations)
    || value.structuredValidation.violations.some((item) => typeof item !== 'string' || item.length === 0)) {
    fail('structuredValidation.violationsが不正です');
  }
  const completed = value.execution.completionStatus === 'completed';
  if (completed !== (value.structuredValidation.status === 'passed')
    || completed !== (value.providerOutput !== null)) {
    fail('completion、structured validation、provider outputの状態が一致しません');
  }
  if (completed && ((value.execution.httpStatus as number) < 200 || (value.execution.httpStatus as number) >= 300)) {
    fail('completed resultのHTTP statusが成功範囲ではありません');
  }
  if (completed && value.structuredValidation.violations.length !== 0) {
    fail('passed resultにviolationがあります');
  }
  if (!completed && value.structuredValidation.violations.length === 0) {
    fail('failed resultに停止理由がありません');
  }
  if (value.providerOutput !== null) {
    if (!job) fail('completed resultの厳密検査にはjobが必要です');
    assertCandidateVideoUnderstandingJobV001(job);
    assertCandidateVideoUnderstandingProviderOutputV001(
      value.providerOutput,
      job
    );
  }
  assertProjectedObservationList(value.projectedRoleIntervals, 'projectedRoleIntervals');
  assertProjectedObservationList(value.projectedRemovableIntervals, 'projectedRemovableIntervals');
  assertProjectedObservationList(value.projectedVisualNotes, 'projectedVisualNotes');
  if (!completed && ((value.projectedRoleIntervals as unknown[]).length > 0
      || (value.projectedRemovableIntervals as unknown[]).length > 0
      || (value.projectedVisualNotes as unknown[]).length > 0)) {
    fail('failed resultに正式投影があります');
  }
  if (completed && job && value.providerOutput) {
    if (value.jobBinding.fileSha256 !== sha256Bytes(serializeCandidateVideoUnderstandingJobV001(job))) {
      fail('resultのjob SHAが検査対象jobのcanonical byteと一致しません');
    }
    assertProjectionMatchesProviderIntervals(
      job,
      value.projectedRoleIntervals,
      value.providerOutput.roleIntervals.map((item) => ({
        id: item.observationId,
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs
      })),
      'projectedRoleIntervals'
    );
    assertProjectionMatchesProviderIntervals(
      job,
      value.projectedRemovableIntervals,
      value.providerOutput.removableIntervals.map((item, index) => ({
        id: `removable-${String(index + 1).padStart(3, '0')}`,
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs
      })),
      'projectedRemovableIntervals'
    );
    assertProjectionMatchesProviderIntervals(
      job,
      value.projectedVisualNotes,
      value.providerOutput.visualNotes.map((item, index) => ({
        id: `visual-note-${String(index + 1).padStart(3, '0')}`,
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs
      })),
      'projectedVisualNotes'
    );
  }
  if (!isRecord(value.usage)) fail('result.usageがobjectではありません');
  assertExactKeys(value.usage, ['inputTokens', 'outputTokens', 'thinkingTokens'], 'result.usage');
  assertSafeNonNegativeInteger(value.usage.inputTokens, 'result.usage.inputTokens');
  assertSafeNonNegativeInteger(value.usage.outputTokens, 'result.usage.outputTokens');
  assertSafeNonNegativeInteger(value.usage.thinkingTokens, 'result.usage.thinkingTokens');
  if (!isRecord(value.cost)) fail('result.costがobjectではありません');
  assertExactKeys(value.cost, [
    'priceSnapshot', 'estimatedTotalUsd', 'classification'
  ], 'result.cost');
  assertBinding(value.cost.priceSnapshot, 'result.cost.priceSnapshot');
  assertDecimalUsd(value.cost.estimatedTotalUsd, 'result.cost.estimatedTotalUsd');
  if (value.cost.classification !== 'estimate-from-provider-usage-not-invoice') {
    fail('費用がprovider usage由来の推定値として分類されていません');
  }
}

export function serializeCandidateVideoUnderstandingJobV001(
  value: CandidateVideoUnderstandingJobV001
): Buffer {
  assertCandidateVideoUnderstandingJobV001(value);
  return canonicalJsonBytesV001(value);
}

export function serializeCandidateVideoUnderstandingResultV001(
  value: CandidateVideoUnderstandingResultV001,
  job?: CandidateVideoUnderstandingJobV001
): Buffer {
  assertCandidateVideoUnderstandingResultV001(value, job);
  return canonicalJsonBytesV001(value);
}

function parseCanonical(bytes: Uint8Array, label: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
  if (!canonicalJsonBytesV001(value).equals(Buffer.from(bytes))) {
    fail(`${label}がcanonical byteではありません`);
  }
  return value;
}

export function decodeCandidateVideoUnderstandingJobV001(
  bytes: Uint8Array
): CandidateVideoUnderstandingJobV001 {
  const value = parseCanonical(bytes, 'candidate video understanding job');
  assertCandidateVideoUnderstandingJobV001(value);
  return value;
}

export function decodeCandidateVideoUnderstandingResultV001(
  bytes: Uint8Array,
  job?: CandidateVideoUnderstandingJobV001
): CandidateVideoUnderstandingResultV001 {
  const value = parseCanonical(bytes, 'candidate video understanding result');
  assertCandidateVideoUnderstandingResultV001(value, job);
  return value;
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  assertSafeRelativePath(relativePath, 'binding path');
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail('binding pathがworkspace外を参照しています');
  }
  return resolved;
}

export async function verifyCandidateVideoUnderstandingJobFilesV001(
  job: CandidateVideoUnderstandingJobV001,
  workspaceRoot: string
): Promise<void> {
  assertCandidateVideoUnderstandingJobV001(job);
  const bindings = [
    job.localBindings.candidate,
    job.localBindings.semanticUtterance,
    job.localBindings.sourceVideo,
    job.localBindings.candidateVideo,
    job.sourceMapping.provenance
  ];
  for (const binding of bindings) {
    const actualSha = await sha256File(resolveWorkspacePath(workspaceRoot, binding.path));
    if (actualSha !== binding.fileSha256) fail(`${binding.path}のSHA-256がjob束縛と一致しません`);
  }
}

function readInteger(record: RecordValue, key: string, label: string): number {
  const value = record[key];
  assertSafeNonNegativeInteger(value, `${label}.${key}`);
  return value;
}

export async function verifyClosedSourceMappingProvenanceV001(
  job: CandidateVideoUnderstandingJobV001,
  workspaceRoot: string
): Promise<void> {
  assertCandidateVideoUnderstandingJobV001(job);
  if (job.sourceMapping.status !== 'closed') {
    fail('source mappingは未解決でありprovider実行へ昇格できません');
  }
  const provenancePath = resolveWorkspacePath(workspaceRoot, job.sourceMapping.provenance.path);
  const bytes = await readFile(provenancePath);
  if (sha256Bytes(bytes) !== job.sourceMapping.provenance.fileSha256) {
    fail('source mapping provenanceのSHA-256が一致しません');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('source mapping provenanceがJSONではありません');
  }
  if (!isRecord(parsed)) fail('source mapping provenanceのrootがobjectではありません');
  if (parsed.schemaVersion === CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001) {
    const evidenceBindings = parsed.evidenceBindings;
    const mapping = parsed.mapping;
    if (parsed.candidateId !== job.localCandidateId
      || parsed.sourceVideoId !== job.sourceVideoId
      || !isRecord(evidenceBindings)
      || !isRecord(evidenceBindings.candidateVideo)
      || !isRecord(evidenceBindings.sourceVideo)
      || evidenceBindings.candidateVideo.fileSha256 !== job.localBindings.candidateVideo.fileSha256
      || evidenceBindings.sourceVideo.fileSha256 !== job.localBindings.sourceVideo.fileSha256
      || !isRecord(mapping)) {
      fail('PTS mapping artifactの候補・動画束縛がjobと一致しません');
    }
    const jobMapping = {
      candidateTimeBase: job.sourceMapping.candidateTimeBase,
      sourceTimeBase: job.sourceMapping.sourceTimeBase,
      candidateTimelineStartPts: job.sourceMapping.candidateTimelineStartPts,
      candidateTimelineEndPtsExclusive: job.sourceMapping.candidateTimelineEndPtsExclusive,
      segments: job.sourceMapping.segments,
      unmappedCandidatePts: job.sourceMapping.unmappedCandidatePts
    };
    if (canonicalSha256(mapping) !== canonicalSha256(jobMapping)) {
      fail('jobのsource mappingがPTS mapping artifactと一致しません');
    }
    return;
  }
  if (parsed.schemaVersion !== 'distant-connection-video-intervalization-improvement-candidate-v001') {
    fail('正式frame境界を持つ既知のrender provenanceまたはPTS mapping artifactではありません');
  }
  if (parsed.candidateId !== job.localCandidateId) fail('mapping provenanceのcandidate IDがjobと一致しません');
  const sourceVideoBinding = parsed.sourceVideoBinding;
  const candidateResponseBinding = parsed.candidateResponseBinding;
  const semanticUtteranceBinding = parsed.semanticUtteranceBinding;
  const firstPart = parsed.firstPart;
  const secondPart = parsed.secondPart;
  const outputFrameMapping = parsed.outputFrameMapping;
  if (!isRecord(sourceVideoBinding) || !isRecord(candidateResponseBinding)
    || !isRecord(semanticUtteranceBinding) || !isRecord(firstPart)
    || !isRecord(secondPart) || !isRecord(outputFrameMapping)) {
    fail('mapping provenanceに正式束縛またはframe mappingがありません');
  }
  if (sourceVideoBinding.fileSha256 !== job.localBindings.sourceVideo.fileSha256
    || candidateResponseBinding.fileSha256 !== job.localBindings.candidate.fileSha256
    || semanticUtteranceBinding.fileSha256 !== job.localBindings.semanticUtterance.fileSha256) {
    fail('mapping provenanceのsource束縛がjobと一致しません');
  }
  const fps = readInteger(outputFrameMapping, 'fps', 'outputFrameMapping');
  const frameDurationNumerator = job.sourceMapping.candidateTimeBase.denominator;
  const frameDurationDenominator = job.sourceMapping.candidateTimeBase.numerator * fps;
  if (frameDurationNumerator % frameDurationDenominator !== 0) {
    fail('render provenanceのframe rateを候補PTS単位へ正確に変換できません');
  }
  const frameDurationPts = frameDurationNumerator / frameDurationDenominator;
  const sourcePtsPerMillisecondNumerator = job.sourceMapping.sourceTimeBase.denominator;
  const sourcePtsPerMillisecondDenominator = 1000 * job.sourceMapping.sourceTimeBase.numerator;
  if (sourcePtsPerMillisecondNumerator % sourcePtsPerMillisecondDenominator !== 0) {
    fail('render provenanceのms時刻を元動画PTSへ正確に変換できません');
  }
  const sourcePtsPerMillisecond = sourcePtsPerMillisecondNumerator
    / sourcePtsPerMillisecondDenominator;
  const firstPartFrameCount = readInteger(outputFrameMapping, 'firstPartFrameCount', 'outputFrameMapping');
  const totalFrameCount = readInteger(outputFrameMapping, 'totalFrameCount', 'outputFrameMapping');
  const expected = [
    {
      segmentId: 'segment-0001',
      candidateFrameStartIndex: 0,
      candidateFrameEndIndexExclusive: firstPartFrameCount,
      candidateStartPts: job.sourceMapping.candidateTimelineStartPts,
      candidateEndPtsExclusive: job.sourceMapping.candidateTimelineStartPts
        + firstPartFrameCount * frameDurationPts,
      sourceFrameStartIndex: null,
      sourceFrameEndIndexExclusive: null,
      sourceStartPts: readInteger(firstPart, 'sourceStartMs', 'firstPart') * sourcePtsPerMillisecond,
      sourceEndPtsExclusive: readInteger(firstPart, 'sourceEndMs', 'firstPart') * sourcePtsPerMillisecond,
      sourceSelectionStartMs: readInteger(firstPart, 'sourceStartMs', 'firstPart'),
      sourceSelectionEndMs: readInteger(firstPart, 'sourceEndMs', 'firstPart')
    },
    {
      segmentId: 'segment-0002',
      candidateFrameStartIndex: firstPartFrameCount,
      candidateFrameEndIndexExclusive: totalFrameCount,
      candidateStartPts: job.sourceMapping.candidateTimelineStartPts
        + firstPartFrameCount * frameDurationPts,
      candidateEndPtsExclusive: job.sourceMapping.candidateTimelineStartPts
        + totalFrameCount * frameDurationPts,
      sourceFrameStartIndex: null,
      sourceFrameEndIndexExclusive: null,
      sourceStartPts: readInteger(secondPart, 'sourceStartMs', 'secondPart') * sourcePtsPerMillisecond,
      sourceEndPtsExclusive: readInteger(secondPart, 'sourceEndMs', 'secondPart') * sourcePtsPerMillisecond,
      sourceSelectionStartMs: readInteger(secondPart, 'sourceStartMs', 'secondPart'),
      sourceSelectionEndMs: readInteger(secondPart, 'sourceEndMs', 'secondPart')
    }
  ];
  if (job.sourceMapping.unmappedCandidatePts.length !== 0
    || readInteger(outputFrameMapping, 'secondPartFrameCount', 'outputFrameMapping')
      !== expected[1].candidateFrameEndIndexExclusive - expected[1].candidateFrameStartIndex
    || canonicalSha256(expected) !== canonicalSha256(job.sourceMapping.segments)) {
    fail('jobのsource mappingがrender provenanceのframe境界と一致しません');
  }
}

export function candidateVideoProviderInputCanonicalSha256V001(
  value: CandidateVideoProviderInputV001
): string {
  assertCandidateVideoProviderInputV001(value);
  return canonicalSha256(value);
}

export function candidateVideoPromptSha256V001(): string {
  return sha256Bytes(CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001);
}

export function candidateVideoResponseSchemaSha256V001(): string {
  return canonicalSha256(CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001);
}

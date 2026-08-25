import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001,
  decodeCommentVelocityAnchorArtifactV001,
  type CommentVelocityAnchorArtifactV001
} from './comment-velocity-anchor-artifact-v001.js';
import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
  decodeSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001 =
  'distant-connection-luna-source-package-v001';
export const DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001 =
  'distant-connection-luna-response-v001';

export const DISTANT_CONNECTION_LUNA_ERROR_CODES_V001 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SEMANTIC_UTTERANCE_SHA_MISMATCH',
  'COMMENT_VELOCITY_ANCHOR_SHA_MISMATCH',
  'SEMANTIC_UTTERANCE_BINDING_MISMATCH',
  'SOURCE_VIDEO_MISMATCH',
  'ANCHOR_UNKNOWN_UTTERANCE',
  'SOURCE_PACKAGE_BINDING_MISMATCH',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'RESPONSE_INVALID',
  'UNKNOWN_ANCHOR_ID',
  'UNKNOWN_UTTERANCE_ID',
  'EMPTY_FIRST_PART',
  'EMPTY_SECOND_PART',
  'UTTERANCE_DUPLICATE',
  'UTTERANCE_ORDER_REVERSED',
  'ANCHOR_DIRECTION_MISMATCH'
] as const);

export type DistantConnectionLunaErrorCodeV001 =
  typeof DISTANT_CONNECTION_LUNA_ERROR_CODES_V001[number];

export class DistantConnectionLunaArtifactErrorV001 extends Error {
  readonly code: DistantConnectionLunaErrorCodeV001;

  constructor(code: DistantConnectionLunaErrorCodeV001, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaArtifactErrorV001';
    this.code = code;
  }
}

type FormalFileBinding = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionLunaExecutionPlanningV001 = {
  providerId: string;
  modelId: string;
  operationId: string;
  jobExperimentValues: Array<{
    name: string;
    value: string;
  }>;
};

export type DistantConnectionLunaSourcePackageV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001;
  sourceVideoId: string;
  semanticUtteranceBinding: FormalFileBinding;
  commentVelocityAnchorBinding: FormalFileBinding;
  plannedExecution: DistantConnectionLunaExecutionPlanningV001;
  explorationTask: {
    objective: string;
    anchorInstruction: string;
    returnInstruction: string;
    boundaryMeaning: string;
  };
  utteranceCount: number;
  anchorCount: number;
  utterances: SemanticUtteranceV001[];
  anchors: Array<{
    anchorId: string;
    semanticUtteranceId: string;
  }>;
  responseContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001;
    sourcePackagePath: string;
    jsonSchema: Record<string, unknown>;
  };
};

export type DistantConnectionCandidateV001 = {
  candidateId: string;
  anchorId: string;
  firstPartSemanticUtteranceIds: string[];
  secondPartSemanticUtteranceIds: string[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

export type DistantConnectionLunaResponseV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001;
  sourceVideoId: string;
  sourcePackageBinding: FormalFileBinding;
  candidates: DistantConnectionCandidateV001[];
};

export type BuildDistantConnectionLunaSourcePackageFromBytesInputV001 = {
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  commentVelocityAnchorPath: string;
  commentVelocityAnchorBytes: Uint8Array;
  sourcePackagePath: string;
  plannedExecution: DistantConnectionLunaExecutionPlanningV001;
};

type BuildDistantConnectionLunaSourcePackageFromFilesInputV001 = {
  workspaceRoot: string;
  semanticUtterancePath: string;
  commentVelocityAnchorPath: string;
  sourcePackagePath: string;
  plannedExecution: DistantConnectionLunaExecutionPlanningV001;
};

type WriteDistantConnectionLunaSourcePackageFromFilesInputV001 =
  BuildDistantConnectionLunaSourcePackageFromFilesInputV001 & {
    outputPath: string;
  };

export type ValidateDistantConnectionLunaResponseInputV001 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const EXPLORATION_TASK = Object.freeze({
  objective:
    '各コメント流量アンカーについて、配信全文の正式意味発話から時間的に離れた過去または未来の相方を探してください。2つの場面を前から後の順に組み合わせることで、後半単独では得られない理解、回収感、意外性、面白さのいずれかが明確に生まれる接続だけを候補にしてください。前振りと回収、予告と実現、原因と後の結果、過去の発言と後の反応、認識・予想と後の出来事、約束・宣言と後の実行、疑問と後の答え、以前の出来事によって後の発言の意味が変わる関係は例であり、閉じた分類ではありません。',
  anchorInstruction:
    'directionはanchorから見た相方の位置を表します。futureの場合はanchor発話をfirstPartに含め、相方を未来側のsecondPartに置いてください。pastの場合はanchor発話をsecondPartに含め、相方を過去側のfirstPartに置いてください。',
  returnInstruction:
    '候補ごとに、前半として必要な正式意味発話ID群、後半として必要な正式意味発話ID群、前半を付けることで後半の何が新しく分かるかを返してください。同じゲーム・人物・テーマ・設定に属するだけ、一般的な背景説明が後半にも当てはまるだけ、または前半を外しても後半の理解や面白さがほぼ変わらない接続は返さないでください。ただしゲーム紹介・一般説明そのものを除外せず、後半がそれを強く回収して前から後へ見る意味や面白さが明確に増える場合は候補にしてください。',
  boundaryMeaning:
    '返す正式意味発話IDは探索根拠であり、完成動画の最終切り出し位置ではありません。導入文脈や自然な終端は後続工程が決めます。'
});

function fail(code: DistantConnectionLunaErrorCodeV001, message: string, cause?: unknown): never {
  throw new DistantConnectionLunaArtifactErrorV001(
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
    fail('SOURCE_PACKAGE_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(value: unknown, label: string): asserts value is FormalFileBinding {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail('SOURCE_PACKAGE_INVALID', `${label}が不正です`);
  }
  assertWorkspaceRelativePath(value.path, `${label}のpath`);
}

function sourceVideoIdFromUri(sourceUri: string): string {
  let candidate = sourceUri;
  try {
    const parsed = new URL(sourceUri);
    if (parsed.hostname === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (parsed.hostname.endsWith('youtube.com')) {
      candidate = parsed.searchParams.get('v') ?? path.basename(parsed.pathname);
    } else {
      candidate = path.basename(parsed.pathname);
    }
  } catch {
    candidate = path.basename(sourceUri.split(/[?#]/u, 1)[0]);
  }
  const extension = path.extname(candidate);
  const sourceVideoId = extension ? candidate.slice(0, -extension.length) : candidate;
  if (!SOURCE_VIDEO_ID.test(sourceVideoId)) {
    fail('SOURCE_VIDEO_MISMATCH', '正式意味発話の動画参照から元動画IDを一意に解決できません');
  }
  return sourceVideoId;
}

function assertPlannedExecution(
  value: unknown
): asserts value is DistantConnectionLunaExecutionPlanningV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'providerId', 'modelId', 'operationId', 'jobExperimentValues'
  ])
    || typeof value.providerId !== 'string' || !FORMAL_ID.test(value.providerId)
    || typeof value.modelId !== 'string' || !FORMAL_ID.test(value.modelId)
    || typeof value.operationId !== 'string' || !FORMAL_ID.test(value.operationId)
    || !Array.isArray(value.jobExperimentValues)) {
    fail('SOURCE_PACKAGE_INVALID', 'provider/model予定値またはjob実験値の記録場所が不正です');
  }
  const seenNames = new Set<string>();
  for (const [index, item] of value.jobExperimentValues.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, ['name', 'value'])
      || typeof item.name !== 'string' || !FORMAL_ID.test(item.name)
      || typeof item.value !== 'string' || item.value.length === 0
      || seenNames.has(item.name)) {
      fail('SOURCE_PACKAGE_INVALID', `job実験値 ${index + 1}件目が不正です`);
    }
    seenNames.add(item.name);
  }
}

function buildResponseJsonSchema(
  sourceVideoId: string,
  sourcePackagePath: string
): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'],
    properties: {
      schemaVersion: {type: 'string', const: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001},
      sourceVideoId: {type: 'string', const: sourceVideoId},
      sourcePackageBinding: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'schemaVersion', 'fileSha256'],
        properties: {
          path: {type: 'string', const: sourcePackagePath},
          schemaVersion: {
            type: 'string',
            const: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001
          },
          fileSha256: {type: 'string', pattern: '^[0-9a-f]{64}$'}
        }
      },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'candidateId',
            'anchorId',
            'firstPartSemanticUtteranceIds',
            'secondPartSemanticUtteranceIds',
            'addedUnderstanding',
            'direction'
          ],
          properties: {
            candidateId: {type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'},
            anchorId: {
              type: 'string',
              pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'
            },
            firstPartSemanticUtteranceIds: {
              type: 'array',
              minItems: 1,
              items: {type: 'string', pattern: '^semantic-utterance-[0-9]{6}$'}
            },
            secondPartSemanticUtteranceIds: {
              type: 'array',
              minItems: 1,
              items: {type: 'string', pattern: '^semantic-utterance-[0-9]{6}$'}
            },
            addedUnderstanding: {type: 'string', minLength: 1},
            direction: {type: 'string', enum: ['past', 'future']}
          }
        }
      }
    }
  };
}

function assertResponseContract(
  value: unknown,
  sourceVideoId: string
): asserts value is DistantConnectionLunaSourcePackageV001['responseContract'] {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion', 'sourcePackagePath', 'jsonSchema'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna返答契約の構造または版が不正です');
  }
  assertWorkspaceRelativePath(value.sourcePackagePath, 'Luna source packageのpath');
  const expected = buildResponseJsonSchema(
    sourceVideoId,
    value.sourcePackagePath
  );
  if (JSON.stringify(value.jsonSchema) !== JSON.stringify(expected)) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna返答用JSON Schemaが正式入力からの導出値と一致しません');
  }
}

function buildSourcePackage(
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV001,
  semanticUtterances: SemanticUtteranceArtifactV001,
  anchors: CommentVelocityAnchorArtifactV001
): DistantConnectionLunaSourcePackageV001 {
  const semanticSha256 = sha256(input.semanticUtteranceBytes);
  if (anchors.semanticUtteranceBinding.path !== input.semanticUtterancePath) {
    fail('SEMANTIC_UTTERANCE_BINDING_MISMATCH', 'アンカーが束縛する正式意味発話pathと実入力が一致しません');
  }
  if (anchors.semanticUtteranceBinding.fileSha256 !== semanticSha256) {
    fail('SEMANTIC_UTTERANCE_SHA_MISMATCH', 'アンカーが束縛する正式意味発話SHA-256と実入力が一致しません');
  }
  const semanticSourceVideoId = sourceVideoIdFromUri(semanticUtterances.sourceUri);
  if (anchors.sourceVideoId !== semanticSourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', '正式意味発話とコメント流量アンカーの元動画が一致しません');
  }

  const knownUtteranceIds = new Set(semanticUtterances.utterances.map((item) => item.utteranceId));
  const projectedAnchors = anchors.anchors.map((anchor) => {
    if (!knownUtteranceIds.has(anchor.utteranceId)) {
      fail('ANCHOR_UNKNOWN_UTTERANCE', `アンカー ${anchor.anchorId} が未知の正式意味発話を参照しています`);
    }
    return {
      anchorId: anchor.anchorId,
      semanticUtteranceId: anchor.utteranceId
    };
  });

  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
    sourceVideoId: anchors.sourceVideoId,
    semanticUtteranceBinding: {
      path: input.semanticUtterancePath,
      schemaVersion: SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
      fileSha256: semanticSha256
    },
    commentVelocityAnchorBinding: {
      path: input.commentVelocityAnchorPath,
      schemaVersion: COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001,
      fileSha256: sha256(input.commentVelocityAnchorBytes)
    },
    plannedExecution: structuredClone(input.plannedExecution),
    explorationTask: structuredClone(EXPLORATION_TASK),
    utteranceCount: semanticUtterances.utteranceCount,
    anchorCount: projectedAnchors.length,
    utterances: structuredClone(semanticUtterances.utterances),
    anchors: projectedAnchors,
    responseContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
      sourcePackagePath: input.sourcePackagePath,
      jsonSchema: buildResponseJsonSchema(
        anchors.sourceVideoId,
        input.sourcePackagePath
      )
    }
  };
}

export function buildDistantConnectionLunaSourcePackageFromBytesV001(
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV001
): DistantConnectionLunaSourcePackageV001 {
  assertWorkspaceRelativePath(input.semanticUtterancePath, '正式意味発話成果物のpath');
  assertWorkspaceRelativePath(input.commentVelocityAnchorPath, 'コメント流量アンカー成果物のpath');
  assertWorkspaceRelativePath(input.sourcePackagePath, 'Luna source packageのpath');
  assertPlannedExecution(input.plannedExecution);
  const semanticUtterances = decodeSemanticUtteranceArtifactV001(input.semanticUtteranceBytes);
  const anchors = decodeCommentVelocityAnchorArtifactV001(input.commentVelocityAnchorBytes);
  const packageValue = buildSourcePackage(input, semanticUtterances, anchors);
  assertDistantConnectionLunaSourcePackageV001(packageValue);
  return packageValue;
}

export async function buildDistantConnectionLunaSourcePackageFromFilesV001(
  input: BuildDistantConnectionLunaSourcePackageFromFilesInputV001
): Promise<DistantConnectionLunaSourcePackageV001> {
  assertWorkspaceRelativePath(input.semanticUtterancePath, '正式意味発話成果物のpath');
  assertWorkspaceRelativePath(input.commentVelocityAnchorPath, 'コメント流量アンカー成果物のpath');
  const [semanticUtteranceBytes, commentVelocityAnchorBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.semanticUtterancePath)),
    readFile(path.join(input.workspaceRoot, input.commentVelocityAnchorPath))
  ]);
  return buildDistantConnectionLunaSourcePackageFromBytesV001({
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes,
    commentVelocityAnchorPath: input.commentVelocityAnchorPath,
    commentVelocityAnchorBytes,
    sourcePackagePath: input.sourcePackagePath,
    plannedExecution: input.plannedExecution
  });
}

export function serializeDistantConnectionLunaSourcePackageV001(
  sourcePackage: DistantConnectionLunaSourcePackageV001
): Buffer {
  assertDistantConnectionLunaSourcePackageV001(sourcePackage);
  return Buffer.from(`${JSON.stringify(sourcePackage, null, 2)}\n`, 'utf8');
}

export async function writeDistantConnectionLunaSourcePackageFromFilesV001(
  input: WriteDistantConnectionLunaSourcePackageFromFilesInputV001
): Promise<{sourcePackage: DistantConnectionLunaSourcePackageV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  if (input.outputPath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_INVALID', '出力pathと返答契約が束縛するsource package pathが一致しません');
  }
  const sourcePackage = await buildDistantConnectionLunaSourcePackageFromFilesV001(input);
  const bytes = serializeDistantConnectionLunaSourcePackageV001(sourcePackage);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {sourcePackage, bytes};
}

export function assertDistantConnectionLunaSourcePackageV001(
  value: unknown
): asserts value is DistantConnectionLunaSourcePackageV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceVideoId',
    'semanticUtteranceBinding',
    'commentVelocityAnchorBinding',
    'plannedExecution',
    'explorationTask',
    'utteranceCount',
    'anchorCount',
    'utterances',
    'anchors',
    'responseContract'
  ])) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source packageのroot構造が不正です');
  }
  if (value.schemaVersion !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source packageの版または元動画IDが不正です');
  }
  assertFormalBinding(value.semanticUtteranceBinding, '正式意味発話binding');
  assertFormalBinding(value.commentVelocityAnchorBinding, 'コメント流量アンカーbinding');
  if (value.semanticUtteranceBinding.schemaVersion !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
    || value.commentVelocityAnchorBinding.schemaVersion
      !== COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', '入力bindingのschema版が不正です');
  }
  assertPlannedExecution(value.plannedExecution);
  if (!isRecord(value.explorationTask)
    || !hasExactKeys(value.explorationTask, [
      'objective', 'anchorInstruction', 'returnInstruction', 'boundaryMeaning'
    ])
    || JSON.stringify(value.explorationTask) !== JSON.stringify(EXPLORATION_TASK)) {
    fail('SOURCE_PACKAGE_INVALID', '遠方接続の探索目的が正式定義と一致しません');
  }
  if (!Number.isSafeInteger(value.utteranceCount) || (value.utteranceCount as number) < 1
    || !Number.isSafeInteger(value.anchorCount) || (value.anchorCount as number) < 1
    || !Array.isArray(value.utterances) || value.utterances.length !== value.utteranceCount
    || !Array.isArray(value.anchors) || value.anchors.length !== value.anchorCount) {
    fail('SOURCE_PACKAGE_INVALID', '正式意味発話またはアンカーの件数が不正です');
  }

  const utteranceIds: string[] = [];
  for (const [index, item] of value.utterances.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'utteranceId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs', 'sourceSegmentIds'
    ])
      || item.utteranceId !== `semantic-utterance-${String(index + 1).padStart(6, '0')}`
      || item.ordinal !== index + 1
      || typeof item.text !== 'string' || item.text.length === 0
      || !Number.isSafeInteger(item.sourceStartMs) || (item.sourceStartMs as number) < 0
      || !Number.isSafeInteger(item.sourceEndMs)
      || (item.sourceEndMs as number) < (item.sourceStartMs as number)
      || !Array.isArray(item.sourceSegmentIds) || item.sourceSegmentIds.length === 0
      || item.sourceSegmentIds.some((id) => !Number.isSafeInteger(id) || (id as number) <= 0)) {
      fail('SOURCE_PACKAGE_INVALID', `正式意味発話 ${index + 1}件目が不正です`);
    }
    utteranceIds.push(item.utteranceId as string);
  }

  const knownUtteranceIds = new Set(utteranceIds);
  const seenAnchorIds = new Set<string>();
  for (const [index, item] of value.anchors.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, ['anchorId', 'semanticUtteranceId'])
      || typeof item.anchorId !== 'string' || !FORMAL_ID.test(item.anchorId)
      || typeof item.semanticUtteranceId !== 'string'
      || !knownUtteranceIds.has(item.semanticUtteranceId)
      || seenAnchorIds.has(item.anchorId)) {
      fail('SOURCE_PACKAGE_INVALID', `コメント流量アンカー ${index + 1}件目が不正です`);
    }
    seenAnchorIds.add(item.anchorId);
  }
  assertResponseContract(value.responseContract, value.sourceVideoId);
}

export function decodeDistantConnectionLunaSourcePackageV001(
  bytes: Uint8Array
): DistantConnectionLunaSourcePackageV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source packageがJSONとして読めません', error);
  }
  assertDistantConnectionLunaSourcePackageV001(value);
  return value;
}

export function validateDistantConnectionLunaSourcePackageAgainstInputsV001(
  sourcePackage: unknown,
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV001
): void {
  assertDistantConnectionLunaSourcePackageV001(sourcePackage);
  if (sourcePackage.semanticUtteranceBinding.path !== input.semanticUtterancePath
    || sourcePackage.commentVelocityAnchorBinding.path !== input.commentVelocityAnchorPath
    || sourcePackage.responseContract.sourcePackagePath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'Luna source packageが束縛する入力pathと実入力が一致しません');
  }
  if (sourcePackage.semanticUtteranceBinding.fileSha256 !== sha256(input.semanticUtteranceBytes)) {
    fail('SEMANTIC_UTTERANCE_SHA_MISMATCH', '正式意味発話成果物のSHA-256がbindingと一致しません');
  }
  if (sourcePackage.commentVelocityAnchorBinding.fileSha256
    !== sha256(input.commentVelocityAnchorBytes)) {
    fail('COMMENT_VELOCITY_ANCHOR_SHA_MISMATCH',
      'コメント流量アンカー成果物のSHA-256がbindingと一致しません');
  }
  const rebuilt = buildDistantConnectionLunaSourcePackageFromBytesV001(input);
  if (!serializeDistantConnectionLunaSourcePackageV001(sourcePackage)
    .equals(serializeDistantConnectionLunaSourcePackageV001(rebuilt))) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'Luna source packageが入力からの決定的再構築結果と一致しません');
  }
}

function assertOrderedUtteranceIds(
  ids: unknown,
  label: '前半' | '後半',
  ordinalById: Map<string, number>
): asserts ids is string[] {
  const emptyCode = label === '前半' ? 'EMPTY_FIRST_PART' : 'EMPTY_SECOND_PART';
  if (!Array.isArray(ids) || ids.length === 0) {
    fail(emptyCode, `${label}の正式意味発話ID群が空です`);
  }
  const seen = new Set<string>();
  let previousOrdinal = 0;
  for (const id of ids) {
    if (typeof id !== 'string' || !ordinalById.has(id)) {
      fail('UNKNOWN_UTTERANCE_ID', `${label}が未知の正式意味発話IDを参照しています`);
    }
    if (seen.has(id)) {
      fail('UTTERANCE_DUPLICATE', `${label}に同じ正式意味発話IDが重複しています`);
    }
    const ordinal = ordinalById.get(id)!;
    if (ordinal <= previousOrdinal) {
      fail('UTTERANCE_ORDER_REVERSED', `${label}の正式意味発話IDが時系列順ではありません`);
    }
    seen.add(id);
    previousOrdinal = ordinal;
  }
}

export function validateDistantConnectionLunaResponseV001(
  response: unknown,
  input: ValidateDistantConnectionLunaResponseInputV001
): asserts response is DistantConnectionLunaResponseV001 {
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  if (input.sourcePackagePath !== sourcePackage.responseContract.sourcePackagePath) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', '検査対象のsource package pathが正式入力と一致しません');
  }
  if (!isRecord(response) || !hasExactKeys(response, [
    'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'
  ])
    || response.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001
    || typeof response.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(response.sourceVideoId)
    || !Array.isArray(response.candidates)) {
    fail('RESPONSE_INVALID', 'Luna返答のroot構造が不正です');
  }
  if (response.sourceVideoId !== sourcePackage.sourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', 'Luna返答の元動画IDがsource packageと一致しません');
  }
  assertFormalBinding(response.sourcePackageBinding, 'Luna source package binding');
  if (response.sourcePackageBinding.path !== input.sourcePackagePath
    || response.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'Luna返答が束縛するsource packageのpathまたは版が一致しません');
  }
  if (response.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'Luna返答が束縛するsource packageのSHA-256が一致しません');
  }

  const ordinalById = new Map(sourcePackage.utterances.map((item) => [item.utteranceId, item.ordinal]));
  const anchorById = new Map(sourcePackage.anchors.map((item) => [item.anchorId, item]));
  const seenCandidateIds = new Set<string>();
  for (const [index, item] of response.candidates.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'candidateId',
      'anchorId',
      'firstPartSemanticUtteranceIds',
      'secondPartSemanticUtteranceIds',
      'addedUnderstanding',
      'direction'
    ])
      || typeof item.candidateId !== 'string' || !FORMAL_ID.test(item.candidateId)
      || seenCandidateIds.has(item.candidateId)
      || typeof item.anchorId !== 'string'
      || typeof item.addedUnderstanding !== 'string' || item.addedUnderstanding.length === 0
      || (item.direction !== 'past' && item.direction !== 'future')) {
      fail('RESPONSE_INVALID', `候補 ${index + 1}件目の構造または値が不正です`);
    }
    const anchor = anchorById.get(item.anchorId);
    if (!anchor) {
      fail('UNKNOWN_ANCHOR_ID', `候補 ${item.candidateId} が未知のアンカーを参照しています`);
    }
    assertOrderedUtteranceIds(item.firstPartSemanticUtteranceIds, '前半', ordinalById);
    assertOrderedUtteranceIds(item.secondPartSemanticUtteranceIds, '後半', ordinalById);
    const firstIds = item.firstPartSemanticUtteranceIds;
    const secondIds = item.secondPartSemanticUtteranceIds;
    const firstSet = new Set(firstIds);
    if (secondIds.some((id) => firstSet.has(id))) {
      fail('UTTERANCE_DUPLICATE', `候補 ${item.candidateId} の前半と後半に同じ発話があります`);
    }
    const finalFirstOrdinal = ordinalById.get(firstIds[firstIds.length - 1])!;
    const initialSecondOrdinal = ordinalById.get(secondIds[0])!;
    if (finalFirstOrdinal >= initialSecondOrdinal) {
      fail('UTTERANCE_ORDER_REVERSED',
        `候補 ${item.candidateId} の前半と後半が別の時系列位置を示していません`);
    }
    const anchorIsInExpectedPart = item.direction === 'past'
      ? secondIds.includes(anchor.semanticUtteranceId)
      : firstIds.includes(anchor.semanticUtteranceId);
    if (!anchorIsInExpectedPart) {
      fail('ANCHOR_DIRECTION_MISMATCH',
        `候補 ${item.candidateId} の方向とアンカーを含む側が一致しません`);
    }
    seenCandidateIds.add(item.candidateId);
  }
}

export function decodeDistantConnectionLunaResponseV001(
  bytes: Uint8Array,
  input: ValidateDistantConnectionLunaResponseInputV001
): DistantConnectionLunaResponseV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('RESPONSE_INVALID', 'Luna返答がJSONとして読めません', error);
  }
  validateDistantConnectionLunaResponseV001(value, input);
  return value;
}

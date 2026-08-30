import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001,
  type DistantConnectionLunaRequestSettingsV001
} from './distant-connection-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  decodeDistantConnectionLunaSourcePackageV002,
  serializeDistantConnectionLunaSourcePackageV002,
  type DistantConnectionLunaFormalFileBindingV002,
  type DistantConnectionLunaSourcePackageV002
} from './distant-connection-luna-source-package-v002.js';

export const DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002 =
  'openai-responses-distant-connection-request-v002';
export const DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002 =
  'distant-connection-luna-b5-local-manifest-v002';
export const DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002 =
  'distant-connection-luna-b5-measurement-v002';

export type DistantConnectionLunaRequestSettingsV002 =
  DistantConnectionLunaRequestSettingsV001;

export const DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002:
Readonly<DistantConnectionLunaRequestSettingsV002> =
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001;

export const DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V002 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'REQUEST_SETTINGS_MISMATCH',
  'REQUEST_INVALID',
  'RESPONSE_SCHEMA_BINDING_MISMATCH',
  'REQUEST_BINDING_MISMATCH',
  'MANIFEST_INVALID',
  'B6_REQUEST_BINDING_MISMATCH'
] as const);

export type DistantConnectionLunaB5ErrorCodeV002 =
  typeof DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V002[number];

export class DistantConnectionLunaB5LocalErrorV002 extends Error {
  readonly code: DistantConnectionLunaB5ErrorCodeV002;

  constructor(code: DistantConnectionLunaB5ErrorCodeV002, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaB5LocalErrorV002';
    this.code = code;
  }
}

export type DistantConnectionLunaExactRequestV002 = {
  model: 'gpt-5.6-luna';
  instructions: string;
  input: string;
  reasoning: {effort: 'medium'};
  text: {
    format: {
      type: 'json_schema';
      name: 'distant_connection_candidates_v001';
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  store: false;
};

export type DistantConnectionLunaB5LocalManifestV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  requestBinding: DistantConnectionLunaFormalFileBindingV002;
  requestSettings: DistantConnectionLunaRequestSettingsV002;
  measurementContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002;
    jsonSchema: Record<string, unknown>;
  };
  b6ContinuationContract: {
    requiredRequestBinding: DistantConnectionLunaFormalFileBindingV002;
  };
};

export type BuildDistantConnectionLunaB5LocalInputV002 = {
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  sourcePackageBytes: Uint8Array;
  requestPath: string;
  requestSettings: DistantConnectionLunaRequestSettingsV002;
};

export type BuildDistantConnectionLunaB5LocalFromFileInputV002 = Omit<
  BuildDistantConnectionLunaB5LocalInputV002,
  'sourcePackageBytes'
> & {workspaceRoot: string};

type WriteDistantConnectionLunaB5LocalArtifactsInputV002 =
  BuildDistantConnectionLunaB5LocalFromFileInputV002 & {manifestPath: string};

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const REQUEST_INSTRUCTIONS_PREFIX =
  '正式source packageのexplorationTaskとlearningContextに従って遠方接続候補を探索し、responseContract.jsonSchemaに適合するJSONだけを返してください。正式意味発話IDと学習履歴を変更、補完、推測しないでください。';

function fail(
  code: DistantConnectionLunaB5ErrorCodeV002,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionLunaB5LocalErrorV002(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('REQUEST_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(
  value: unknown,
  label: string,
  code: DistantConnectionLunaB5ErrorCodeV002 = 'MANIFEST_INVALID'
): asserts value is DistantConnectionLunaFormalFileBindingV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || !WORKSPACE_RELATIVE_PATH.test(value.path)
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail(code, `${label}が不正です`);
  }
}

function assertRequestSettings(
  value: unknown
): asserts value is DistantConnectionLunaRequestSettingsV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'providerId',
      'modelId',
      'operationId',
      'reasoningEffort',
      'responseFormatName',
      'store'
    ])
    || JSON.stringify(value) !== JSON.stringify(DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002)) {
    fail('REQUEST_SETTINGS_MISMATCH', 'provider/model/operation/reasoning設定が承認済み値と一致しません');
  }
}

function decodeBoundSourcePackage(
  input: BuildDistantConnectionLunaB5LocalInputV002
): DistantConnectionLunaSourcePackageV002 {
  assertFormalBinding(input.sourcePackageBinding, 'source package binding', 'SOURCE_PACKAGE_INVALID');
  if (input.sourcePackageBinding.schemaVersion
    !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002) {
    fail('SOURCE_PACKAGE_INVALID', 'source package bindingのschema版がv002ではありません');
  }
  if (input.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'source package byteのSHA-256がbindingと一致しません');
  }
  let sourcePackage: DistantConnectionLunaSourcePackageV002;
  try {
    sourcePackage = decodeDistantConnectionLunaSourcePackageV002(input.sourcePackageBytes);
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageがv002正式契約に適合しません', error);
  }
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackageBinding.path
    || !serializeDistantConnectionLunaSourcePackageV002(sourcePackage)
      .equals(Buffer.from(input.sourcePackageBytes))) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageのpathまたは正式byte表現がbindingと一致しません');
  }
  return sourcePackage;
}

function assertSourceExecutionPlan(
  sourcePackage: DistantConnectionLunaSourcePackageV002,
  settings: DistantConnectionLunaRequestSettingsV002
): void {
  if (sourcePackage.plannedExecution.providerId !== settings.providerId
    || sourcePackage.plannedExecution.modelId !== settings.modelId
    || sourcePackage.plannedExecution.operationId !== settings.operationId) {
    fail('REQUEST_SETTINGS_MISMATCH', 'source packageの実行予定値とexact request設定が一致しません');
  }
}

function responseSourcePackageBinding(
  sourcePackage: DistantConnectionLunaSourcePackageV002,
  sourcePackageBytes: Uint8Array
): DistantConnectionLunaFormalFileBindingV002 {
  return {
    path: sourcePackage.responseContract.sourcePackagePath,
    schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
    fileSha256: sha256(sourcePackageBytes)
  };
}

function buildRequestInstructions(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002
): string {
  return `${REQUEST_INSTRUCTIONS_PREFIX} 返答のsourcePackageBindingは次のexact値を一字も変えずに転記してください: ${JSON.stringify(sourcePackageBinding)}`;
}

function providerResponseSchema(
  sourcePackage: DistantConnectionLunaSourcePackageV002
): Record<string, unknown> {
  const schema = structuredClone(sourcePackage.responseContract.jsonSchema);
  const rootProperties = isRecord(schema.properties) ? schema.properties : undefined;
  const candidates = rootProperties && isRecord(rootProperties.candidates)
    ? rootProperties.candidates
    : undefined;
  const items = candidates && isRecord(candidates.items) ? candidates.items : undefined;
  const candidateProperties = items && isRecord(items.properties) ? items.properties : undefined;
  const firstPart = candidateProperties && isRecord(candidateProperties.firstPartSemanticUtteranceIds)
    ? candidateProperties.firstPartSemanticUtteranceIds
    : undefined;
  const secondPart = candidateProperties && isRecord(candidateProperties.secondPartSemanticUtteranceIds)
    ? candidateProperties.secondPartSemanticUtteranceIds
    : undefined;
  const anchorId = candidateProperties && isRecord(candidateProperties.anchorId)
    ? candidateProperties.anchorId
    : undefined;
  if (!anchorId
    || anchorId.pattern !== '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    || !firstPart || !isRecord(firstPart.items)
    || firstPart.items.pattern !== '^semantic-utterance-[0-9]{6}$'
    || !secondPart || !isRecord(secondPart.items)
    || secondPart.items.pattern !== '^semantic-utterance-[0-9]{6}$') {
    fail('RESPONSE_SCHEMA_BINDING_MISMATCH', 'provider向け返答schemaをsource packageから導出できません');
  }
  return schema;
}

function buildExactRequest(
  sourcePackage: DistantConnectionLunaSourcePackageV002,
  sourcePackageBytes: Uint8Array,
  settings: DistantConnectionLunaRequestSettingsV002
): DistantConnectionLunaExactRequestV002 {
  return {
    model: settings.modelId,
    instructions: buildRequestInstructions(
      responseSourcePackageBinding(sourcePackage, sourcePackageBytes)
    ),
    input: Buffer.from(sourcePackageBytes).toString('utf8'),
    reasoning: {effort: settings.reasoningEffort},
    text: {
      format: {
        type: 'json_schema',
        name: settings.responseFormatName,
        strict: true,
        schema: providerResponseSchema(sourcePackage)
      }
    },
    store: settings.store
  };
}

function formalBindingSchema(binding?: DistantConnectionLunaFormalFileBindingV002) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'schemaVersion', 'fileSha256'],
    properties: {
      path: binding ? {type: 'string', const: binding.path} : {type: 'string'},
      schemaVersion: binding
        ? {type: 'string', const: binding.schemaVersion}
        : {type: 'string'},
      fileSha256: binding
        ? {type: 'string', const: binding.fileSha256}
        : {type: 'string', pattern: '^[0-9a-f]{64}$'}
    }
  };
}

function buildMeasurementJsonSchema(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  requestBinding: DistantConnectionLunaFormalFileBindingV002,
  settings: DistantConnectionLunaRequestSettingsV002
): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion',
      'sourcePackageBinding',
      'requestBinding',
      'providerId',
      'modelId',
      'tokenMeasurement',
      'costEvaluation'
    ],
    properties: {
      schemaVersion: {
        type: 'string',
        const: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002
      },
      sourcePackageBinding: formalBindingSchema(sourcePackageBinding),
      requestBinding: formalBindingSchema(requestBinding),
      providerId: {type: 'string', const: settings.providerId},
      modelId: {type: 'string', const: settings.modelId},
      tokenMeasurement: {
        type: 'object',
        additionalProperties: false,
        required: ['rawResponseBinding', 'inputTokens'],
        properties: {
          rawResponseBinding: formalBindingSchema(),
          inputTokens: {type: 'integer', minimum: 0}
        }
      },
      costEvaluation: {
        type: 'object',
        additionalProperties: false,
        required: [
          'priceSnapshotBinding', 'maximumNanoUsd', 'projectedNanoUsd', 'decision'
        ],
        properties: {
          priceSnapshotBinding: formalBindingSchema(),
          maximumNanoUsd: {type: 'integer', minimum: 0},
          projectedNanoUsd: {type: 'integer', minimum: 0},
          decision: {type: 'string', enum: ['passed', 'stopped']}
        }
      }
    }
  };
}

function buildManifest(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  requestPath: string,
  requestBytes: Uint8Array,
  settings: DistantConnectionLunaRequestSettingsV002
): DistantConnectionLunaB5LocalManifestV002 {
  const requestBinding = {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002,
    fileSha256: sha256(requestBytes)
  };
  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002,
    sourcePackageBinding: structuredClone(sourcePackageBinding),
    requestBinding,
    requestSettings: structuredClone(settings),
    measurementContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002,
      jsonSchema: buildMeasurementJsonSchema(sourcePackageBinding, requestBinding, settings)
    },
    b6ContinuationContract: {requiredRequestBinding: structuredClone(requestBinding)}
  };
}

export function buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(
  input: BuildDistantConnectionLunaB5LocalInputV002
): {
    request: DistantConnectionLunaExactRequestV002;
    requestBytes: Buffer;
    manifest: DistantConnectionLunaB5LocalManifestV002;
    manifestBytes: Buffer;
  } {
  assertPath(input.requestPath, 'exact request path');
  assertRequestSettings(input.requestSettings);
  const sourcePackage = decodeBoundSourcePackage(input);
  assertSourceExecutionPlan(sourcePackage, input.requestSettings);
  const request = buildExactRequest(sourcePackage, input.sourcePackageBytes, input.requestSettings);
  const requestBytes = serializeDistantConnectionLunaExactRequestV002(request, sourcePackage);
  const manifest = buildManifest(
    input.sourcePackageBinding,
    input.requestPath,
    requestBytes,
    input.requestSettings
  );
  const manifestBytes = serializeDistantConnectionLunaB5LocalManifestV002(manifest);
  return {request, requestBytes, manifest, manifestBytes};
}

export async function buildDistantConnectionLunaB5LocalArtifactsFromFileV002(
  input: BuildDistantConnectionLunaB5LocalFromFileInputV002
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV002>> {
  assertFormalBinding(input.sourcePackageBinding, 'source package binding', 'SOURCE_PACKAGE_INVALID');
  assertPath(input.requestPath, 'exact request path');
  const sourcePackageBytes = await readFile(
    path.join(input.workspaceRoot, input.sourcePackageBinding.path)
  );
  return buildDistantConnectionLunaB5LocalArtifactsFromBytesV002({
    sourcePackageBinding: input.sourcePackageBinding,
    sourcePackageBytes,
    requestPath: input.requestPath,
    requestSettings: input.requestSettings
  });
}

export function assertDistantConnectionLunaExactRequestV002(
  value: unknown,
  sourcePackage: DistantConnectionLunaSourcePackageV002
): asserts value is DistantConnectionLunaExactRequestV002 {
  const sourcePackageBytes = serializeDistantConnectionLunaSourcePackageV002(sourcePackage);
  const expectedBinding = responseSourcePackageBinding(sourcePackage, sourcePackageBytes);
  if (!isRecord(value)
    || !hasExactKeys(value, ['model', 'instructions', 'input', 'reasoning', 'text', 'store'])
    || value.model !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002.modelId
    || value.instructions !== buildRequestInstructions(expectedBinding)
    || value.input !== sourcePackageBytes.toString('utf8')
    || value.store !== false
    || !isRecord(value.reasoning)
    || !hasExactKeys(value.reasoning, ['effort'])
    || value.reasoning.effort !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002.reasoningEffort
    || !isRecord(value.text)
    || !hasExactKeys(value.text, ['format'])
    || !isRecord(value.text.format)
    || !hasExactKeys(value.text.format, ['type', 'name', 'strict', 'schema'])
    || value.text.format.type !== 'json_schema'
    || value.text.format.name
      !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002.responseFormatName
    || value.text.format.strict !== true) {
    fail('REQUEST_INVALID', 'Luna exact request v002の構造または固定値が不正です');
  }
  if (JSON.stringify(value.text.format.schema)
    !== JSON.stringify(providerResponseSchema(sourcePackage))) {
    fail('RESPONSE_SCHEMA_BINDING_MISMATCH', '返答schemaがsource packageの契約と一致しません');
  }
}

export function serializeDistantConnectionLunaExactRequestV002(
  value: DistantConnectionLunaExactRequestV002,
  sourcePackage: DistantConnectionLunaSourcePackageV002
): Buffer {
  assertDistantConnectionLunaExactRequestV002(value, sourcePackage);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function assertDistantConnectionLunaB5LocalManifestV002(
  value: unknown
): asserts value is DistantConnectionLunaB5LocalManifestV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'requestBinding',
      'requestSettings',
      'measurementContract',
      'b6ContinuationContract'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002) {
    fail('MANIFEST_INVALID', 'B5 local manifest v002のroot構造が不正です');
  }
  assertFormalBinding(value.sourcePackageBinding, 'source package binding');
  assertFormalBinding(value.requestBinding, 'exact request binding');
  assertRequestSettings(value.requestSettings);
  if (value.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
    || value.requestBinding.schemaVersion !== DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002
    || !isRecord(value.measurementContract)
    || !hasExactKeys(value.measurementContract, ['schemaVersion', 'jsonSchema'])
    || value.measurementContract.schemaVersion
      !== DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002
    || !isRecord(value.b6ContinuationContract)
    || !hasExactKeys(value.b6ContinuationContract, ['requiredRequestBinding'])) {
    fail('MANIFEST_INVALID', 'B5 local manifest v002のbindingまたは後続契約が不正です');
  }
  assertFormalBinding(
    value.b6ContinuationContract.requiredRequestBinding,
    'B6必須request binding'
  );
  if (JSON.stringify(value.b6ContinuationContract.requiredRequestBinding)
      !== JSON.stringify(value.requestBinding)
    || JSON.stringify(value.measurementContract.jsonSchema)
      !== JSON.stringify(buildMeasurementJsonSchema(
        value.sourcePackageBinding,
        value.requestBinding,
        value.requestSettings
      ))) {
    fail('MANIFEST_INVALID', 'manifestのrequest bindingまたは計測契約が導出値と一致しません');
  }
}

export function serializeDistantConnectionLunaB5LocalManifestV002(
  value: DistantConnectionLunaB5LocalManifestV002
): Buffer {
  assertDistantConnectionLunaB5LocalManifestV002(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaB5LocalManifestV002(
  bytes: Uint8Array
): DistantConnectionLunaB5LocalManifestV002 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MANIFEST_INVALID', 'B5 local manifest v002がJSONとして読めません', error);
  }
  assertDistantConnectionLunaB5LocalManifestV002(value);
  return value;
}

export function validateDistantConnectionLunaB5LocalArtifactsV002(
  artifacts: {
    request: unknown;
    requestBytes: Uint8Array;
    manifest: unknown;
    manifestBytes: Uint8Array;
  },
  input: BuildDistantConnectionLunaB5LocalInputV002
): void {
  const sourcePackage = decodeBoundSourcePackage(input);
  assertDistantConnectionLunaExactRequestV002(artifacts.request, sourcePackage);
  assertDistantConnectionLunaB5LocalManifestV002(artifacts.manifest);
  const rebuilt = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(input);
  if (!Buffer.from(artifacts.requestBytes).equals(rebuilt.requestBytes)
    || !Buffer.from(artifacts.manifestBytes).equals(rebuilt.manifestBytes)
    || !serializeDistantConnectionLunaExactRequestV002(
      artifacts.request as DistantConnectionLunaExactRequestV002,
      sourcePackage
    ).equals(rebuilt.requestBytes)
    || !serializeDistantConnectionLunaB5LocalManifestV002(
      artifacts.manifest as DistantConnectionLunaB5LocalManifestV002
    ).equals(rebuilt.manifestBytes)) {
    fail('REQUEST_BINDING_MISMATCH', 'B5 local成果物がsource packageからの決定的再構築結果と一致しません');
  }
}

export function assertDistantConnectionLunaB6RequestBindingV002(
  b6RequestBinding: unknown,
  manifestBytes: Uint8Array,
  requestBytes: Uint8Array
): void {
  const manifest = decodeDistantConnectionLunaB5LocalManifestV002(manifestBytes);
  assertFormalBinding(b6RequestBinding, 'B6 request binding', 'B6_REQUEST_BINDING_MISMATCH');
  if (JSON.stringify(b6RequestBinding)
      !== JSON.stringify(manifest.b6ContinuationContract.requiredRequestBinding)
    || b6RequestBinding.fileSha256 !== sha256(requestBytes)) {
    fail('B6_REQUEST_BINDING_MISMATCH', 'B6が参照するrequestはB5 v002のexact requestと一致しません');
  }
}

export async function writeDistantConnectionLunaB5LocalArtifactsV002(
  input: WriteDistantConnectionLunaB5LocalArtifactsInputV002
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV002>> {
  assertPath(input.manifestPath, 'B5 local manifest path');
  if (input.requestPath === input.manifestPath) {
    fail('MANIFEST_INVALID', 'exact requestとmanifestは別pathである必要があります');
  }
  const artifacts = await buildDistantConnectionLunaB5LocalArtifactsFromFileV002(input);
  const requestAbsolute = path.join(input.workspaceRoot, input.requestPath);
  const manifestAbsolute = path.join(input.workspaceRoot, input.manifestPath);
  await mkdir(path.dirname(requestAbsolute), {recursive: true});
  await mkdir(path.dirname(manifestAbsolute), {recursive: true});
  await writeFile(requestAbsolute, artifacts.requestBytes, {flag: 'wx'});
  await writeFile(manifestAbsolute, artifacts.manifestBytes, {flag: 'wx'});
  return artifacts;
}

import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionLunaSourcePackageV001,
  type DistantConnectionLunaSourcePackageV001
} from './distant-connection-luna-source-package-v001.js';

export const DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V001 =
  'openai-responses-distant-connection-request-v001';
export const DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V001 =
  'distant-connection-luna-b5-local-manifest-v001';
export const DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001 =
  'distant-connection-luna-b5-measurement-v001';

export const DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V001 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'REQUEST_SETTINGS_MISMATCH',
  'REQUEST_INVALID',
  'RESPONSE_SCHEMA_BINDING_MISMATCH',
  'REQUEST_BINDING_MISMATCH',
  'REQUEST_SHA_MISMATCH',
  'MANIFEST_INVALID',
  'MEASUREMENT_RESULT_INVALID',
  'B6_REQUEST_BINDING_MISMATCH'
] as const);

export type DistantConnectionLunaB5ErrorCodeV001 =
  typeof DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V001[number];

export class DistantConnectionLunaB5LocalErrorV001 extends Error {
  readonly code: DistantConnectionLunaB5ErrorCodeV001;

  constructor(code: DistantConnectionLunaB5ErrorCodeV001, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaB5LocalErrorV001';
    this.code = code;
  }
}

export type DistantConnectionLunaFormalFileBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionLunaRequestSettingsV001 = {
  providerId: 'openai-api';
  modelId: 'gpt-5.6-luna';
  operationId: 'responses';
  reasoningEffort: 'medium';
  responseFormatName: 'distant_connection_candidates_v001';
  store: false;
};

export const DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001:
Readonly<DistantConnectionLunaRequestSettingsV001> = Object.freeze({
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  reasoningEffort: 'medium',
  responseFormatName: 'distant_connection_candidates_v001',
  store: false
});

export type DistantConnectionLunaExactRequestV001 = {
  model: 'gpt-5.6-luna';
  instructions: string;
  input: string;
  reasoning: {
    effort: 'medium';
  };
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

export type DistantConnectionLunaB5MeasurementV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001;
  requestBinding: DistantConnectionLunaFormalFileBindingV001;
  providerId: 'openai-api';
  modelId: 'gpt-5.6-luna';
  tokenMeasurement: {
    rawResponseBinding: DistantConnectionLunaFormalFileBindingV001;
    inputTokens: number;
  };
  costEvaluation: {
    priceSnapshotBinding: DistantConnectionLunaFormalFileBindingV001;
    maximumNanoUsd: number;
    projectedNanoUsd: number;
    decision: 'passed' | 'stopped';
  };
};

export type DistantConnectionLunaB5LocalManifestV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001;
  requestBinding: DistantConnectionLunaFormalFileBindingV001;
  requestSettings: DistantConnectionLunaRequestSettingsV001;
  measurementContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001;
    jsonSchema: Record<string, unknown>;
  };
  b6ContinuationContract: {
    requiredRequestBinding: DistantConnectionLunaFormalFileBindingV001;
  };
};

export type BuildDistantConnectionLunaB5LocalInputV001 = {
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001;
  sourcePackageBytes: Uint8Array;
  requestPath: string;
  requestSettings: DistantConnectionLunaRequestSettingsV001;
};

type BuildDistantConnectionLunaB5LocalFromFileInputV001 = {
  workspaceRoot: string;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001;
  requestPath: string;
  requestSettings: DistantConnectionLunaRequestSettingsV001;
};

type WriteDistantConnectionLunaB5LocalArtifactsInputV001 =
  BuildDistantConnectionLunaB5LocalFromFileInputV001 & {
    manifestPath: string;
  };

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const REQUEST_INSTRUCTIONS_PREFIX =
  '正式source packageのexplorationTaskに従って遠方接続候補を探索し、responseContract.jsonSchemaに適合するJSONだけを返してください。正式意味発話IDを変更、補完、推測しないでください。';

function fail(code: DistantConnectionLunaB5ErrorCodeV001, message: string, cause?: unknown): never {
  throw new DistantConnectionLunaB5LocalErrorV001(
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
    fail('REQUEST_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(
  value: unknown,
  label: string,
  invalidCode: DistantConnectionLunaB5ErrorCodeV001 = 'MANIFEST_INVALID'
): asserts value is DistantConnectionLunaFormalFileBindingV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value.path)
    || typeof value.schemaVersion !== 'string' || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string' || !SHA256.test(value.fileSha256)) {
    fail(invalidCode, `${label}が不正です`);
  }
}

function assertRequestSettings(
  value: unknown
): asserts value is DistantConnectionLunaRequestSettingsV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'providerId',
    'modelId',
    'operationId',
    'reasoningEffort',
    'responseFormatName',
    'store'
  ])
    || JSON.stringify(value) !== JSON.stringify(DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001)) {
    fail('REQUEST_SETTINGS_MISMATCH', 'Luna requestのprovider/model/reasoning予定値が正式値と一致しません');
  }
}

function assertSourcePackageBindingAndDecode(
  input: BuildDistantConnectionLunaB5LocalInputV001
): DistantConnectionLunaSourcePackageV001 {
  assertFormalBinding(input.sourcePackageBinding, 'Luna source package binding', 'SOURCE_PACKAGE_INVALID');
  if (input.sourcePackageBinding.schemaVersion
    !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source package bindingのschema版が不正です');
  }
  const actualSha256 = sha256(input.sourcePackageBytes);
  if (input.sourcePackageBinding.fileSha256 !== actualSha256) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'Luna source packageのSHA-256がbindingと一致しません');
  }
  let sourcePackage: DistantConnectionLunaSourcePackageV001;
  try {
    sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source packageの内容が正式schemaに適合しません', error);
  }
  return sourcePackage;
}

function assertSourcePackageExecutionPlan(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  settings: DistantConnectionLunaRequestSettingsV001
): void {
  if (sourcePackage.plannedExecution.providerId !== settings.providerId
    || sourcePackage.plannedExecution.modelId !== settings.modelId
    || sourcePackage.plannedExecution.operationId !== settings.operationId) {
    fail('REQUEST_SETTINGS_MISMATCH',
      'source packageのprovider/model/operation予定値とexact request設定が一致しません');
  }
}

function buildResponseSourcePackageBinding(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  sourcePackageBytes: Uint8Array
): DistantConnectionLunaFormalFileBindingV001 {
  return {
    path: sourcePackage.responseContract.sourcePackagePath,
    schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
    fileSha256: sha256(sourcePackageBytes)
  };
}

function buildRequestInstructions(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001
): string {
  return `${REQUEST_INSTRUCTIONS_PREFIX} 返答のsourcePackageBindingは次のexact値を一字も変えずに転記してください: ${JSON.stringify(sourcePackageBinding)}`;
}

export function assertDistantConnectionLunaResponseBindingDisclosureV001(
  request: DistantConnectionLunaExactRequestV001,
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  sourcePackageBytes: Uint8Array
): void {
  const expectedBinding = buildResponseSourcePackageBinding(sourcePackage, sourcePackageBytes);
  const expectedInstructions = buildRequestInstructions(expectedBinding);
  if (request.instructions !== expectedInstructions
    || request.input !== Buffer.from(sourcePackageBytes).toString('utf8')
    || JSON.stringify(request.text.format.schema)
      !== JSON.stringify(sourcePackage.responseContract.jsonSchema)) {
    fail('REQUEST_BINDING_MISMATCH',
      'Lunaへ返答を要求するbinding値がexact requestから参照できません');
  }
}

function buildExactRequest(
  sourcePackage: DistantConnectionLunaSourcePackageV001,
  sourcePackageBytes: Uint8Array,
  settings: DistantConnectionLunaRequestSettingsV001
): DistantConnectionLunaExactRequestV001 {
  const responseSourcePackageBinding = buildResponseSourcePackageBinding(
    sourcePackage,
    sourcePackageBytes
  );
  return {
    model: settings.modelId,
    instructions: buildRequestInstructions(responseSourcePackageBinding),
    input: Buffer.from(sourcePackageBytes).toString('utf8'),
    reasoning: {
      effort: settings.reasoningEffort
    },
    text: {
      format: {
        type: 'json_schema',
        name: settings.responseFormatName,
        strict: true,
        schema: structuredClone(sourcePackage.responseContract.jsonSchema)
      }
    },
    store: settings.store
  };
}

function buildMeasurementJsonSchema(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001,
  requestBinding: DistantConnectionLunaFormalFileBindingV001,
  settings: DistantConnectionLunaRequestSettingsV001
): Record<string, unknown> {
  const formalBindingSchema = (binding?: DistantConnectionLunaFormalFileBindingV001) => ({
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
  });
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
        const: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001
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
          'priceSnapshotBinding',
          'maximumNanoUsd',
          'projectedNanoUsd',
          'decision'
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
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV001,
  requestPath: string,
  requestBytes: Uint8Array,
  settings: DistantConnectionLunaRequestSettingsV001
): DistantConnectionLunaB5LocalManifestV001 {
  const requestBinding = {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V001,
    fileSha256: sha256(requestBytes)
  };
  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V001,
    sourcePackageBinding: structuredClone(sourcePackageBinding),
    requestBinding,
    requestSettings: structuredClone(settings),
    measurementContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001,
      jsonSchema: buildMeasurementJsonSchema(sourcePackageBinding, requestBinding, settings)
    },
    b6ContinuationContract: {
      requiredRequestBinding: structuredClone(requestBinding)
    }
  };
}

export function buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
  input: BuildDistantConnectionLunaB5LocalInputV001
): {
    request: DistantConnectionLunaExactRequestV001;
    requestBytes: Buffer;
    manifest: DistantConnectionLunaB5LocalManifestV001;
    manifestBytes: Buffer;
  } {
  assertWorkspaceRelativePath(input.requestPath, 'exact requestのpath');
  assertRequestSettings(input.requestSettings);
  const sourcePackage = assertSourcePackageBindingAndDecode(input);
  assertSourcePackageExecutionPlan(sourcePackage, input.requestSettings);
  const request = buildExactRequest(sourcePackage, input.sourcePackageBytes, input.requestSettings);
  const requestBytes = serializeDistantConnectionLunaExactRequestV001(request, sourcePackage);
  const manifest = buildManifest(
    input.sourcePackageBinding,
    input.requestPath,
    requestBytes,
    input.requestSettings
  );
  const manifestBytes = serializeDistantConnectionLunaB5LocalManifestV001(manifest);
  return {request, requestBytes, manifest, manifestBytes};
}

export async function buildDistantConnectionLunaB5LocalArtifactsFromFileV001(
  input: BuildDistantConnectionLunaB5LocalFromFileInputV001
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV001>> {
  assertWorkspaceRelativePath(input.sourcePackageBinding.path, 'Luna source packageのpath');
  const sourcePackageBytes = await readFile(
    path.join(input.workspaceRoot, input.sourcePackageBinding.path)
  );
  return buildDistantConnectionLunaB5LocalArtifactsFromBytesV001({
    sourcePackageBinding: input.sourcePackageBinding,
    sourcePackageBytes,
    requestPath: input.requestPath,
    requestSettings: input.requestSettings
  });
}

export async function writeDistantConnectionLunaB5LocalArtifactsV001(
  input: WriteDistantConnectionLunaB5LocalArtifactsInputV001
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV001>> {
  assertWorkspaceRelativePath(input.manifestPath, 'B5 local manifestのpath');
  if (input.requestPath === input.manifestPath) {
    fail('MANIFEST_INVALID', 'exact requestとB5 local manifestは別pathである必要があります');
  }
  const artifacts = await buildDistantConnectionLunaB5LocalArtifactsFromFileV001(input);
  const absoluteRequestPath = path.join(input.workspaceRoot, input.requestPath);
  const absoluteManifestPath = path.join(input.workspaceRoot, input.manifestPath);
  await mkdir(path.dirname(absoluteRequestPath), {recursive: true});
  await mkdir(path.dirname(absoluteManifestPath), {recursive: true});
  await writeFile(absoluteRequestPath, artifacts.requestBytes, {flag: 'wx'});
  await writeFile(absoluteManifestPath, artifacts.manifestBytes, {flag: 'wx'});
  return artifacts;
}

export function assertDistantConnectionLunaExactRequestV001(
  value: unknown,
  sourcePackage: DistantConnectionLunaSourcePackageV001
): asserts value is DistantConnectionLunaExactRequestV001 {
  const sourcePackageBytes = Buffer.from(`${JSON.stringify(sourcePackage, null, 2)}\n`, 'utf8');
  const expectedInstructions = buildRequestInstructions(
    buildResponseSourcePackageBinding(sourcePackage, sourcePackageBytes)
  );
  if (!isRecord(value) || !hasExactKeys(value, [
    'model', 'instructions', 'input', 'reasoning', 'text', 'store'
  ])
    || value.model !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001.modelId
    || value.instructions !== expectedInstructions
    || typeof value.input !== 'string'
    || value.store !== false
    || !isRecord(value.reasoning) || !hasExactKeys(value.reasoning, ['effort'])
    || value.reasoning.effort !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001.reasoningEffort
    || !isRecord(value.text) || !hasExactKeys(value.text, ['format'])
    || !isRecord(value.text.format) || !hasExactKeys(value.text.format, [
      'type', 'name', 'strict', 'schema'
    ])
    || value.text.format.type !== 'json_schema'
    || value.text.format.name !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001.responseFormatName
    || value.text.format.strict !== true) {
    fail('REQUEST_INVALID', 'Luna exact requestの構造または送信予定値が不正です');
  }
  if (value.input !== `${JSON.stringify(sourcePackage, null, 2)}\n`) {
    fail('REQUEST_BINDING_MISMATCH', 'Luna exact requestのinputがsource package byteと一致しません');
  }
  if (JSON.stringify(value.text.format.schema)
    !== JSON.stringify(sourcePackage.responseContract.jsonSchema)) {
    fail('RESPONSE_SCHEMA_BINDING_MISMATCH',
      'Luna exact requestのstructured-output schemaがsource packageと一致しません');
  }
  assertDistantConnectionLunaResponseBindingDisclosureV001(
    value as DistantConnectionLunaExactRequestV001,
    sourcePackage,
    sourcePackageBytes
  );
}

export function serializeDistantConnectionLunaExactRequestV001(
  request: DistantConnectionLunaExactRequestV001,
  sourcePackage: DistantConnectionLunaSourcePackageV001
): Buffer {
  assertDistantConnectionLunaExactRequestV001(request, sourcePackage);
  return Buffer.from(`${JSON.stringify(request, null, 2)}\n`, 'utf8');
}

export function assertDistantConnectionLunaB5LocalManifestV001(
  value: unknown
): asserts value is DistantConnectionLunaB5LocalManifestV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourcePackageBinding',
    'requestBinding',
    'requestSettings',
    'measurementContract',
    'b6ContinuationContract'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V001) {
    fail('MANIFEST_INVALID', 'B5 local manifestのroot構造または版が不正です');
  }
  assertFormalBinding(value.sourcePackageBinding, 'Luna source package binding');
  assertFormalBinding(value.requestBinding, 'Luna exact request binding');
  assertRequestSettings(value.requestSettings);
  if (value.sourcePackageBinding.schemaVersion
    !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001
    || value.requestBinding.schemaVersion !== DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V001
    || !isRecord(value.measurementContract)
    || !hasExactKeys(value.measurementContract, ['schemaVersion', 'jsonSchema'])
    || value.measurementContract.schemaVersion
      !== DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001
    || !isRecord(value.b6ContinuationContract)
    || !hasExactKeys(value.b6ContinuationContract, ['requiredRequestBinding'])) {
    fail('MANIFEST_INVALID', 'B5 local manifestのbindingまたは後続契約が不正です');
  }
  assertFormalBinding(
    value.b6ContinuationContract.requiredRequestBinding,
    'B6必須request binding'
  );
  if (JSON.stringify(value.b6ContinuationContract.requiredRequestBinding)
    !== JSON.stringify(value.requestBinding)) {
    fail('MANIFEST_INVALID', 'B6必須request bindingがB5 exact requestと一致しません');
  }
  const expectedMeasurementSchema = buildMeasurementJsonSchema(
    value.sourcePackageBinding,
    value.requestBinding,
    value.requestSettings
  );
  if (JSON.stringify(value.measurementContract.jsonSchema)
    !== JSON.stringify(expectedMeasurementSchema)) {
    fail('MANIFEST_INVALID', '外部token計測・費用判定の成果物schemaがbindingと一致しません');
  }
}

export function serializeDistantConnectionLunaB5LocalManifestV001(
  manifest: DistantConnectionLunaB5LocalManifestV001
): Buffer {
  assertDistantConnectionLunaB5LocalManifestV001(manifest);
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaB5LocalManifestV001(
  bytes: Uint8Array
): DistantConnectionLunaB5LocalManifestV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MANIFEST_INVALID', 'B5 local manifestがJSONとして読めません', error);
  }
  assertDistantConnectionLunaB5LocalManifestV001(value);
  return value;
}

export function validateDistantConnectionLunaB5LocalArtifactsV001(
  artifacts: {
    request: unknown;
    requestBytes: Uint8Array;
    manifest: unknown;
    manifestBytes: Uint8Array;
  },
  input: BuildDistantConnectionLunaB5LocalInputV001
): void {
  const rebuilt = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(input);
  const sourcePackage = assertSourcePackageBindingAndDecode(input);
  assertDistantConnectionLunaExactRequestV001(artifacts.request, sourcePackage);
  assertDistantConnectionLunaB5LocalManifestV001(artifacts.manifest);
  if (!Buffer.from(artifacts.requestBytes).equals(rebuilt.requestBytes)
    || !Buffer.from(artifacts.manifestBytes).equals(rebuilt.manifestBytes)
    || !serializeDistantConnectionLunaExactRequestV001(
      artifacts.request as DistantConnectionLunaExactRequestV001,
      sourcePackage
    ).equals(rebuilt.requestBytes)
    || !serializeDistantConnectionLunaB5LocalManifestV001(
      artifacts.manifest as DistantConnectionLunaB5LocalManifestV001
    ).equals(rebuilt.manifestBytes)) {
    fail('REQUEST_BINDING_MISMATCH', 'B5 local成果物がsource packageからの決定的再構築結果と一致しません');
  }
}

export function assertDistantConnectionLunaB6RequestBindingV001(
  b6RequestBinding: unknown,
  manifestBytes: Uint8Array,
  requestBytes: Uint8Array
): void {
  const manifest = decodeDistantConnectionLunaB5LocalManifestV001(manifestBytes);
  assertFormalBinding(b6RequestBinding, 'B6 request binding', 'B6_REQUEST_BINDING_MISMATCH');
  if (JSON.stringify(b6RequestBinding)
    !== JSON.stringify(manifest.b6ContinuationContract.requiredRequestBinding)
    || b6RequestBinding.fileSha256 !== sha256(requestBytes)) {
    fail('B6_REQUEST_BINDING_MISMATCH', 'B6が参照するrequestはB5で固定したexact requestと一致しません');
  }
}

export function assertDistantConnectionLunaB5MeasurementV001(
  value: unknown,
  manifest: DistantConnectionLunaB5LocalManifestV001
): asserts value is DistantConnectionLunaB5MeasurementV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourcePackageBinding',
    'requestBinding',
    'providerId',
    'modelId',
    'tokenMeasurement',
    'costEvaluation'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001
    || value.providerId !== manifest.requestSettings.providerId
    || value.modelId !== manifest.requestSettings.modelId) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5計測成果物のroot構造・版・provider/modelが不正です');
  }
  assertFormalBinding(value.sourcePackageBinding, '計測時source package binding', 'MEASUREMENT_RESULT_INVALID');
  assertFormalBinding(value.requestBinding, '計測時request binding', 'MEASUREMENT_RESULT_INVALID');
  if (JSON.stringify(value.sourcePackageBinding) !== JSON.stringify(manifest.sourcePackageBinding)
    || JSON.stringify(value.requestBinding) !== JSON.stringify(manifest.requestBinding)
    || !isRecord(value.tokenMeasurement)
    || !hasExactKeys(value.tokenMeasurement, ['rawResponseBinding', 'inputTokens'])
    || !Number.isSafeInteger(value.tokenMeasurement.inputTokens)
    || (value.tokenMeasurement.inputTokens as number) < 0
    || !isRecord(value.costEvaluation)
    || !hasExactKeys(value.costEvaluation, [
      'priceSnapshotBinding', 'maximumNanoUsd', 'projectedNanoUsd', 'decision'
    ])
    || !Number.isSafeInteger(value.costEvaluation.maximumNanoUsd)
    || (value.costEvaluation.maximumNanoUsd as number) < 0
    || !Number.isSafeInteger(value.costEvaluation.projectedNanoUsd)
    || (value.costEvaluation.projectedNanoUsd as number) < 0
    || (value.costEvaluation.decision !== 'passed'
      && value.costEvaluation.decision !== 'stopped')) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5計測値・費用判定・bindingが不正です');
  }
  assertFormalBinding(
    value.tokenMeasurement.rawResponseBinding,
    'token計測raw response binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  assertFormalBinding(
    value.costEvaluation.priceSnapshotBinding,
    '価格snapshot binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  const projectedNanoUsd = value.costEvaluation.projectedNanoUsd as number;
  const maximumNanoUsd = value.costEvaluation.maximumNanoUsd as number;
  const shouldPass = projectedNanoUsd <= maximumNanoUsd;
  if ((shouldPass && value.costEvaluation.decision !== 'passed')
    || (!shouldPass && value.costEvaluation.decision !== 'stopped')) {
    fail('MEASUREMENT_RESULT_INVALID', '費用投影と上限判定が一致しません');
  }
}

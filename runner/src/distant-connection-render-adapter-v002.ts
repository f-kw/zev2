import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  assertDistantConnectionEditPlanProjectionV001,
  validateDistantConnectionEditPlanProjectionsAgainstSourcesV001,
  type BuildDistantConnectionEditPlanProjectionsV001Input,
  type DistantConnectionEditPlanProjectionV001
} from './distant-connection-edit-plan-projection-v001.js';
import {
  DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
  assertDistantConnectionIntervalizationPlanV002,
  type DistantConnectionIntervalizationPlanV002
} from './distant-connection-intervalization-plan-v002.js';

export const DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V002 =
  'distant-connection-render-adapter-job-v002';

export class DistantConnectionRenderAdapterErrorV002 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionRenderAdapterErrorV002';
  }
}

type RecordValue = Record<string, unknown>;
type Binding = {path: string; schemaVersion: string; fileSha256: string};
type AssemblyDecisionBinding = Binding & {
  decisionId: string;
  payloadSha256: string;
  approvalRecordId: string;
};

export type PresentationBaseMediaBuildJobProjectionV002 = {
  schemaVersion: 'presentation-base-media-build-job-v001';
  jobId: string;
  assemblyDecision: {path: string; fileSha256: string};
  sourceArtifact: {
    sourceProvenance: string;
    sourceRef: string;
    sourceUri: string;
    path: string;
    fileSha256: string;
  };
  outputDirectory: string;
};

export type DistantConnectionRenderAdapterJobV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V002;
  jobId: string;
  sourceVideoId: string;
  sourceBindings: {
    intervalizationPlan: Binding;
    candidateResponse: Binding;
    semanticUtterance: Binding;
    sourcePackage: Binding;
    sourceVideo: {path: string; fileSha256: string};
  };
  candidateCount: number;
  candidates: Array<{
    candidateId: string;
    editPlanProjection: Binding;
    assemblyDecision: AssemblyDecisionBinding;
    baseMediaBuildJob: PresentationBaseMediaBuildJobProjectionV002;
  }>;
  responsibilityPrinciple: string;
};

export type ProjectionInputV002 = {
  candidateId: string;
  path: string;
  bytes: Uint8Array;
  expectedFileSha256: string;
};

export type AssemblyDecisionInputV002 = {
  candidateId: string;
  path: string;
  bytes: Uint8Array;
  expectedFileSha256: string;
  outputDirectory: string;
};

export type BuildDistantConnectionRenderAdapterJobV002Input = {
  jobId: string;
  intervalizationPlanPath: string;
  intervalizationPlanBytes: Uint8Array;
  expectedIntervalizationPlanSha256: string;
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
  sourceVideoUri: string;
  sourceVideoSha256: string;
  expectedSourceVideoSha256: string;
  editPlanProjections: ProjectionInputV002[];
  assemblyDecisions: AssemblyDecisionInputV002[];
};

const SHA256 = /^[0-9a-f]{64}$/u;
const RESPONSIBILITY =
  'render adapter v002は一般区間化計画v002を、候補別edit_plan_json projectionとその人間承認済み組立決定を介して既存基礎映像build jobへ投影する。候補探索・区間判断・人間採否・rendererの意味は所有しない。';

function fail(message: string): never {
  throw new DistantConnectionRenderAdapterErrorV002(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalSha256(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}

function parse(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionRenderAdapterErrorV002) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function exactSha(bytes: Uint8Array, expected: string, label: string): string {
  const actual = sha256(bytes);
  if (!SHA256.test(expected) || actual !== expected) fail(`${label}のSHA-256が一致しません`);
  return actual;
}

function assertBinding(value: unknown, label: string): asserts value is Binding {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || value.path.length === 0
    || typeof value.schemaVersion !== 'string'
    || value.schemaVersion.length === 0
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) fail(`${label}が不正です`);
}

function assertAssemblyBinding(value: unknown, label: string): void {
  if (!isRecord(value)
    || !exactKeys(value, [
      'path', 'schemaVersion', 'fileSha256', 'decisionId', 'payloadSha256', 'approvalRecordId'
    ])) fail(`${label}の構造が不正です`);
  assertBinding({
    path: value.path, schemaVersion: value.schemaVersion, fileSha256: value.fileSha256
  }, label);
  if (typeof value.decisionId !== 'string'
    || typeof value.approvalRecordId !== 'string'
    || typeof value.payloadSha256 !== 'string'
    || !SHA256.test(value.payloadSha256)) fail(`${label}の承認bindingが不正です`);
}

function projectionSourceInput(
  input: BuildDistantConnectionRenderAdapterJobV002Input
): BuildDistantConnectionEditPlanProjectionsV001Input {
  return {
    intervalizationPlanPath: input.intervalizationPlanPath,
    intervalizationPlanBytes: input.intervalizationPlanBytes,
    expectedIntervalizationPlanSha256: input.expectedIntervalizationPlanSha256,
    candidateResponsePath: input.candidateResponsePath,
    candidateResponseBytes: input.candidateResponseBytes,
    expectedCandidateResponseSha256: input.expectedCandidateResponseSha256,
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes: input.semanticUtteranceBytes,
    expectedSemanticUtteranceSha256: input.expectedSemanticUtteranceSha256,
    sourceVideoPath: input.sourceVideoPath,
    sourceVideoUri: input.sourceVideoUri,
    sourceVideoSha256: input.sourceVideoSha256,
    expectedSourceVideoSha256: input.expectedSourceVideoSha256
  };
}

function readPlan(input: BuildDistantConnectionRenderAdapterJobV002Input): {
  plan: DistantConnectionIntervalizationPlanV002;
  planSha: string;
  candidateSha: string;
  semanticSha: string;
  sourcePackageSha: string;
} {
  const planSha = exactSha(
    input.intervalizationPlanBytes, input.expectedIntervalizationPlanSha256, '一般区間化計画'
  );
  const candidateSha = exactSha(
    input.candidateResponseBytes, input.expectedCandidateResponseSha256, '正式候補'
  );
  const semanticSha = exactSha(
    input.semanticUtteranceBytes, input.expectedSemanticUtteranceSha256, '正式意味発話'
  );
  const sourcePackageSha = exactSha(
    input.sourcePackageBytes, input.expectedSourcePackageSha256, 'Luna source package'
  );
  if (!SHA256.test(input.expectedSourceVideoSha256)
    || input.sourceVideoSha256 !== input.expectedSourceVideoSha256) fail('元動画SHA-256が一致しません');
  const planValue = parse(input.intervalizationPlanBytes, '一般区間化計画');
  assertDistantConnectionIntervalizationPlanV002(planValue);
  const plan = planValue as DistantConnectionIntervalizationPlanV002;
  const candidates = parse(input.candidateResponseBytes, '正式候補');
  const semantic = parse(input.semanticUtteranceBytes, '正式意味発話');
  const sourcePackage = parse(input.sourcePackageBytes, 'Luna source package');
  const sourcePackageBinding = isRecord(candidates.sourcePackageBinding)
    ? candidates.sourcePackageBinding : fail('正式候補にsource package bindingがありません');
  if (plan.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || plan.sourceBindings.candidateResponse.fileSha256 !== candidateSha
    || plan.sourceBindings.semanticUtterance.path !== input.semanticUtterancePath
    || plan.sourceBindings.semanticUtterance.fileSha256 !== semanticSha
    || plan.sourceBindings.sourcePackage.path !== input.sourcePackagePath
    || plan.sourceBindings.sourcePackage.fileSha256 !== sourcePackageSha
    || sourcePackageBinding.path !== input.sourcePackagePath
    || sourcePackageBinding.fileSha256 !== sourcePackageSha
    || candidates.sourceVideoId !== plan.sourceVideoId
    || sourcePackage.sourceVideoId !== plan.sourceVideoId
    || sourcePackage.schemaVersion !== 'distant-connection-luna-source-package-v001'
    || !isRecord(sourcePackage.semanticUtteranceBinding)
    || sourcePackage.semanticUtteranceBinding.path !== input.semanticUtterancePath
    || sourcePackage.semanticUtteranceBinding.fileSha256 !== semanticSha
    || semantic.schemaVersion !== 'semantic-utterance-artifact-v001'
    || semantic.sourceUri !== input.sourceVideoUri) {
    fail('plan・候補・意味発話・source package・元動画のbindingが一致しません');
  }
  return {plan, planSha, candidateSha, semanticSha, sourcePackageSha};
}

function readProjections(
  input: BuildDistantConnectionRenderAdapterJobV002Input,
  plan: DistantConnectionIntervalizationPlanV002
): Array<{definition: ProjectionInputV002; value: DistantConnectionEditPlanProjectionV001; sha: string}> {
  if (input.editPlanProjections.length !== plan.candidates.length
    || JSON.stringify(input.editPlanProjections.map((row) => row.candidateId))
      !== JSON.stringify(plan.candidates.map((row) => row.candidateId))
    || new Set(input.editPlanProjections.map((row) => row.candidateId)).size
      !== input.editPlanProjections.length) fail('projectionが全candidateを同順でちょうど1回被覆していません');
  const rows = input.editPlanProjections.map((definition) => {
    const projectionSha = exactSha(
      definition.bytes, definition.expectedFileSha256, `${definition.candidateId}のprojection`
    );
    const value = parse(definition.bytes, `${definition.candidateId}のprojection`);
    assertDistantConnectionEditPlanProjectionV001(value);
    if (value.candidateId !== definition.candidateId) fail('projectionのcandidate IDが一致しません');
    return {definition, value, sha: projectionSha};
  });
  try {
    validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(
      rows.map((row) => row.value), projectionSourceInput(input)
    );
  } catch (error) {
    fail(`projectionの正本再照合に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
  return rows;
}

function inspectDecision(
  definition: AssemblyDecisionInputV002,
  projection: {definition: ProjectionInputV002; value: DistantConnectionEditPlanProjectionV001; sha: string},
  sourceVideoSha: string,
  sourceVideoPath: string
): {binding: AssemblyDecisionBinding; baseMediaBuildJob: PresentationBaseMediaBuildJobProjectionV002} {
  const fileSha = exactSha(
    definition.bytes, definition.expectedFileSha256, `${definition.candidateId}の組立決定`
  );
  const decision = parse(definition.bytes, `${definition.candidateId}の組立決定`);
  if (!exactKeys(decision, ['schemaVersion', 'decisionId', 'payload', 'approval'])
    || decision.schemaVersion !== 'presentation-base-media-assembly-decision-v001'
    || typeof decision.decisionId !== 'string'
    || !isRecord(decision.payload)
    || !exactKeys(decision.payload, ['basisEditPlan', 'sourceArtifact', 'segments', 'unresolvedEdits'])
    || !isRecord(decision.payload.basisEditPlan)
    || !isRecord(decision.payload.sourceArtifact)
    || !isRecord(decision.approval)) fail(`${definition.candidateId}の組立決定構造が不正です`);
  const expectedSegments = projection.value.segments.map(({sourceStartMs, sourceEndMs}) => ({
    sourceStartMs, sourceEndMs
  }));
  if (decision.payload.basisEditPlan.kind !== 'edit_plan_json'
    || decision.payload.basisEditPlan.path !== projection.definition.path
    || decision.payload.basisEditPlan.fileSha256 !== projection.sha
    || JSON.stringify(decision.payload.segments) !== JSON.stringify(expectedSegments)
    || !Array.isArray(decision.payload.unresolvedEdits)
    || decision.payload.unresolvedEdits.length !== 0
    || decision.payload.sourceArtifact.fileSha256 !== sourceVideoSha
    || decision.approval.status !== 'approved'
    || decision.approval.approverType !== 'human'
    || typeof decision.approval.recordId !== 'string'
    || decision.approval.targetPayloadSha256 !== canonicalSha256(decision.payload)) {
    fail(`${definition.candidateId}のprojection・区間・動画・人間承認bindingが不正です`);
  }
  const source = decision.payload.sourceArtifact;
  for (const key of ['sourceProvenance', 'sourceRef', 'sourceUri'] as const) {
    if (typeof source[key] !== 'string' || source[key].length === 0) {
      fail(`${definition.candidateId}の元動画来歴が不正です`);
    }
  }
  return {
    binding: {
      path: definition.path,
      schemaVersion: 'presentation-base-media-assembly-decision-v001',
      fileSha256: fileSha,
      decisionId: decision.decisionId,
      payloadSha256: canonicalSha256(decision.payload),
      approvalRecordId: decision.approval.recordId
    },
    baseMediaBuildJob: {
      schemaVersion: 'presentation-base-media-build-job-v001',
      jobId: `distant-connection-${projection.value.sourceVideoId}-${definition.candidateId}-base-media-build-v002`,
      assemblyDecision: {path: definition.path, fileSha256: fileSha},
      sourceArtifact: {
        sourceProvenance: source.sourceProvenance as string,
        sourceRef: source.sourceRef as string,
        sourceUri: source.sourceUri as string,
        path: sourceVideoPath,
        fileSha256: sourceVideoSha
      },
      outputDirectory: definition.outputDirectory
    }
  };
}

export function buildDistantConnectionRenderAdapterJobV002(
  input: BuildDistantConnectionRenderAdapterJobV002Input
): DistantConnectionRenderAdapterJobV002 {
  if (input.jobId.trim().length === 0) fail('adapter job IDが空です');
  const inspected = readPlan(input);
  const projections = readProjections(input, inspected.plan);
  if (input.assemblyDecisions.length !== inspected.plan.candidates.length
    || JSON.stringify(input.assemblyDecisions.map((row) => row.candidateId))
      !== JSON.stringify(inspected.plan.candidates.map((row) => row.candidateId))
    || new Set(input.assemblyDecisions.map((row) => row.candidateId)).size
      !== input.assemblyDecisions.length) fail('組立決定が全candidateを同順でちょうど1回被覆していません');
  const candidates = inspected.plan.candidates.map((candidate, index) => {
    const definition = input.assemblyDecisions[index];
    if (definition.candidateId !== candidate.candidateId) fail('組立決定のcandidate順が不正です');
    const decision = inspectDecision(
      definition, projections[index], input.sourceVideoSha256, input.sourceVideoPath
    );
    return {
      candidateId: candidate.candidateId,
      editPlanProjection: {
        path: projections[index].definition.path,
        schemaVersion: 'distant-connection-edit-plan-projection-v001',
        fileSha256: projections[index].sha
      },
      assemblyDecision: decision.binding,
      baseMediaBuildJob: decision.baseMediaBuildJob
    };
  });
  const job: DistantConnectionRenderAdapterJobV002 = {
    schemaVersion: DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V002,
    jobId: input.jobId,
    sourceVideoId: inspected.plan.sourceVideoId,
    sourceBindings: {
      intervalizationPlan: {
        path: input.intervalizationPlanPath,
        schemaVersion: DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
        fileSha256: inspected.planSha
      },
      candidateResponse: {...inspected.plan.sourceBindings.candidateResponse},
      semanticUtterance: {...inspected.plan.sourceBindings.semanticUtterance},
      sourcePackage: {...inspected.plan.sourceBindings.sourcePackage},
      sourceVideo: {path: input.sourceVideoPath, fileSha256: input.sourceVideoSha256}
    },
    candidateCount: candidates.length,
    candidates,
    responsibilityPrinciple: RESPONSIBILITY
  };
  assertDistantConnectionRenderAdapterJobV002(job);
  return job;
}

function assertBaseMediaJob(value: unknown, label: string): void {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'jobId', 'assemblyDecision', 'sourceArtifact', 'outputDirectory'
    ])
    || value.schemaVersion !== 'presentation-base-media-build-job-v001'
    || typeof value.jobId !== 'string'
    || !isRecord(value.assemblyDecision)
    || !exactKeys(value.assemblyDecision, ['path', 'fileSha256'])
    || typeof value.assemblyDecision.path !== 'string'
    || typeof value.assemblyDecision.fileSha256 !== 'string'
    || !SHA256.test(value.assemblyDecision.fileSha256)
    || !isRecord(value.sourceArtifact)
    || !exactKeys(value.sourceArtifact, [
      'sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256'
    ])
    || typeof value.outputDirectory !== 'string'
    || value.outputDirectory.length === 0) fail(`${label}のbase-media build jobが不正です`);
}

export function assertDistantConnectionRenderAdapterJobV002(
  value: unknown
): asserts value is DistantConnectionRenderAdapterJobV002 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'jobId', 'sourceVideoId', 'sourceBindings',
      'candidateCount', 'candidates', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V002
    || typeof value.jobId !== 'string'
    || value.jobId.length === 0
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || value.responsibilityPrinciple !== RESPONSIBILITY
    || !Number.isSafeInteger(value.candidateCount)
    || (value.candidateCount as number) <= 0
    || !Array.isArray(value.candidates)
    || value.candidates.length !== value.candidateCount
    || !isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, [
      'intervalizationPlan', 'candidateResponse', 'semanticUtterance', 'sourcePackage', 'sourceVideo'
    ])) fail('render adapter v002 jobのroot構造・固定責務が不正です');
  for (const key of [
    'intervalizationPlan', 'candidateResponse', 'semanticUtterance', 'sourcePackage'
  ] as const) assertBinding(value.sourceBindings[key], `${key} binding`);
  if (!isRecord(value.sourceBindings.sourceVideo)
    || !exactKeys(value.sourceBindings.sourceVideo, ['path', 'fileSha256'])
    || typeof value.sourceBindings.sourceVideo.path !== 'string'
    || typeof value.sourceBindings.sourceVideo.fileSha256 !== 'string'
    || !SHA256.test(value.sourceBindings.sourceVideo.fileSha256)) fail('元動画bindingが不正です');
  const ids: string[] = [];
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !exactKeys(candidate, [
        'candidateId', 'editPlanProjection', 'assemblyDecision', 'baseMediaBuildJob'
      ])
      || typeof candidate.candidateId !== 'string'
      || candidate.candidateId.length === 0) fail(`候補${index + 1}件目が不正です`);
    assertBinding(candidate.editPlanProjection, `候補${index + 1}件目のprojection`);
    assertAssemblyBinding(candidate.assemblyDecision, `候補${index + 1}件目の組立決定`);
    assertBaseMediaJob(candidate.baseMediaBuildJob, `候補${index + 1}件目`);
    const build = candidate.baseMediaBuildJob as PresentationBaseMediaBuildJobProjectionV002;
    const assembly = candidate.assemblyDecision as AssemblyDecisionBinding;
    if (build.assemblyDecision.path !== assembly.path
      || build.assemblyDecision.fileSha256 !== assembly.fileSha256
      || build.sourceArtifact.path !== value.sourceBindings.sourceVideo.path
      || build.sourceArtifact.fileSha256 !== value.sourceBindings.sourceVideo.fileSha256) {
      fail(`候補${index + 1}件目のbuild job bindingが不正です`);
    }
    ids.push(candidate.candidateId);
  }
  if (new Set(ids).size !== ids.length) fail('candidate IDが重複しています');
}

export function serializeDistantConnectionRenderAdapterJobV002(
  job: DistantConnectionRenderAdapterJobV002
): Buffer {
  assertDistantConnectionRenderAdapterJobV002(job);
  return Buffer.from(`${JSON.stringify(job, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionRenderAdapterJobAgainstSourcesV002(
  job: DistantConnectionRenderAdapterJobV002,
  input: BuildDistantConnectionRenderAdapterJobV002Input
): void {
  const rebuilt = buildDistantConnectionRenderAdapterJobV002(input);
  if (!serializeDistantConnectionRenderAdapterJobV002(job)
    .equals(serializeDistantConnectionRenderAdapterJobV002(rebuilt))) {
    fail('render adapter v002 jobが正本入力からの決定的再生成結果と一致しません');
  }
}

export async function writeDistantConnectionRenderAdapterJobV002(input: {
  workspaceRoot: string;
  outputPath: string;
  job: DistantConnectionRenderAdapterJobV002;
}): Promise<void> {
  const absolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, serializeDistantConnectionRenderAdapterJobV002(input.job), {flag: 'wx'});
}

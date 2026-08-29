import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
  assertDistantConnectionIntervalizationPlanV002,
  type DistantConnectionIntervalizationPlanV002
} from './distant-connection-intervalization-plan-v002.js';

export const DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V001 =
  'distant-connection-render-adapter-job-v001';
export const DISTANT_CONNECTION_RENDER_ADAPTER_RESULT_SCHEMA_V001 =
  'distant-connection-render-adapter-result-v001';

export class DistantConnectionRenderAdapterErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionRenderAdapterErrorV001';
  }
}

type RecordValue = Record<string, unknown>;
export type DistantConnectionRenderAdapterBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionAssemblyDecisionBindingV001 =
  DistantConnectionRenderAdapterBindingV001 & {
    decisionId: string;
    payloadSha256: string;
    approvalRecordId: string;
  };

export type PresentationBaseMediaBuildJobProjectionV001 = {
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

export type DistantConnectionRenderAdapterJobCandidateV001 = {
  candidateId: string;
  assemblyDecision: DistantConnectionAssemblyDecisionBindingV001;
  baseMediaBuildJob: PresentationBaseMediaBuildJobProjectionV001;
};

export type DistantConnectionRenderAdapterJobV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V001;
  jobId: string;
  sourceVideoId: string;
  sourceBindings: {
    intervalizationPlan: DistantConnectionRenderAdapterBindingV001;
    candidateResponse: DistantConnectionRenderAdapterBindingV001;
    semanticUtterance: DistantConnectionRenderAdapterBindingV001;
    sourceVideo: {path: string; fileSha256: string};
  };
  candidateCount: number;
  candidates: DistantConnectionRenderAdapterJobCandidateV001[];
  responsibilityPrinciple: string;
};

export type DistantConnectionRenderAdapterResultCandidateV001 = {
  candidateId: string;
  assemblyDecision: DistantConnectionAssemblyDecisionBindingV001;
  baseMediaTimeline: DistantConnectionRenderAdapterBindingV001;
  baseMediaTimelineValidation: DistantConnectionRenderAdapterBindingV001;
  captionOrder: DistantConnectionRenderAdapterBindingV001;
  rendererResult: DistantConnectionRenderAdapterBindingV001;
  technicalQc: DistantConnectionRenderAdapterBindingV001;
  status: 'passed';
};

export type DistantConnectionRenderAdapterResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_RENDER_ADAPTER_RESULT_SCHEMA_V001;
  resultId: string;
  jobBinding: DistantConnectionRenderAdapterBindingV001;
  sourceVideoId: string;
  candidateCount: number;
  candidates: DistantConnectionRenderAdapterResultCandidateV001[];
  status: 'passed';
  responsibilityPrinciple: string;
};

export type AssemblyDecisionInputV001 = {
  candidateId: string;
  path: string;
  bytes: Uint8Array;
  expectedFileSha256: string;
  outputDirectory: string;
};

export type BuildDistantConnectionRenderAdapterJobV001Input = {
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
  sourceVideoPath: string;
  sourceVideoSha256: string;
  expectedSourceVideoSha256: string;
  assemblyDecisions: AssemblyDecisionInputV001[];
};

export type DistantConnectionRenderOutputInputV001 = {
  candidateId: string;
  baseMediaTimeline: DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array};
  baseMediaTimelineValidation: DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array};
  captionOrder: DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array};
  rendererResult: DistantConnectionRenderAdapterBindingV001 & {bytes?: Uint8Array};
  technicalQc: DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array};
};

export type BuildDistantConnectionRenderAdapterResultV001Input = {
  resultId: string;
  jobPath: string;
  jobBytes: Uint8Array;
  expectedJobSha256: string;
  intervalizationPlanPath: string;
  intervalizationPlanBytes: Uint8Array;
  expectedIntervalizationPlanSha256: string;
  outputs: DistantConnectionRenderOutputInputV001[];
};

const SHA256 = /^[0-9a-f]{64}$/u;
const JOB_RESPONSIBILITY =
  '一般render adapterは承認済み一般区間化計画を既存基礎映像build jobへ決定的に投影する。候補探索・区間判断・人間採否・rendererの意味は所有しない。';
const RESULT_RESPONSIBILITY =
  '一般render adapter resultは基礎映像timeline・字幕注文・renderer結果・技術QCの既存成果物をSHAで閉じる。候補価値・人間採否・描画品質の意味判断は所有しない。';

function fail(message: string): never {
  throw new DistantConnectionRenderAdapterErrorV001(message);
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function canonicalSha256(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function parseJson(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionRenderAdapterErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function assertBinding(
  value: unknown,
  label: string
): asserts value is DistantConnectionRenderAdapterBindingV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || value.path.length === 0
    || typeof value.schemaVersion !== 'string'
    || value.schemaVersion.length === 0
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail(`${label}が不正です`);
  }
}

function assertAssemblyBinding(
  value: unknown,
  label: string
): asserts value is DistantConnectionAssemblyDecisionBindingV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'path', 'schemaVersion', 'fileSha256', 'decisionId', 'payloadSha256', 'approvalRecordId'
    ])) {
    fail(`${label}の構造が不正です`);
  }
  const base = {
    path: value.path,
    schemaVersion: value.schemaVersion,
    fileSha256: value.fileSha256
  };
  assertBinding(base, label);
  for (const key of ['decisionId', 'approvalRecordId'] as const) {
    if (typeof value[key] !== 'string' || value[key].length === 0) fail(`${label}.${key}が不正です`);
  }
  if (typeof value.payloadSha256 !== 'string' || !SHA256.test(value.payloadSha256)) {
    fail(`${label}.payloadSha256が不正です`);
  }
}

function readIntervalizationPlan(bytes: Uint8Array): DistantConnectionIntervalizationPlanV002 {
  const value = parseJson(bytes, '一般区間化計画');
  assertDistantConnectionIntervalizationPlanV002(value);
  return value;
}

function inspectAssemblyDecision(
  definition: AssemblyDecisionInputV001,
  plan: DistantConnectionIntervalizationPlanV002,
  planPath: string,
  sourceVideoSha256: string,
  planSha256: string
): {binding: DistantConnectionAssemblyDecisionBindingV001; buildJob: PresentationBaseMediaBuildJobProjectionV001} {
  const fileSha256 = sha256(definition.bytes);
  assertSha(fileSha256, definition.expectedFileSha256, `${definition.candidateId}の組立決定`);
  const decision = parseJson(definition.bytes, `${definition.candidateId}の組立決定`);
  if (!hasExactKeys(decision, ['schemaVersion', 'decisionId', 'payload', 'approval'])
    || decision.schemaVersion !== 'presentation-base-media-assembly-decision-v001'
    || typeof decision.decisionId !== 'string'
    || !isRecord(decision.payload)
    || !hasExactKeys(decision.payload, [
      'basisEditPlan', 'sourceArtifact', 'segments', 'unresolvedEdits'
    ])
    || !isRecord(decision.approval)
    || !hasExactKeys(decision.approval, [
      'status', 'approverType', 'recordId', 'recordedAt', 'targetPayloadSha256'
    ])) {
    fail(`${definition.candidateId}の組立決定構造が不正です`);
  }
  const candidate = plan.candidates.find((row) => row.candidateId === definition.candidateId)
    ?? fail(`${definition.candidateId}は一般区間化計画に存在しません`);
  const expectedSegments = [
    {sourceStartMs: candidate.firstPart.sourceStartMs, sourceEndMs: candidate.firstPart.sourceEndMs},
    {sourceStartMs: candidate.secondPart.sourceStartMs, sourceEndMs: candidate.secondPart.sourceEndMs}
  ];
  if (!isRecord(decision.payload.basisEditPlan)
    || decision.payload.basisEditPlan.kind !== 'edit_plan_json'
    || decision.payload.basisEditPlan.path !== planPath) {
    fail(`${definition.candidateId}の組立決定が一般区間化計画をbasisにしていません`);
  }
  if (decision.payload.basisEditPlan.fileSha256 !== planSha256
    || JSON.stringify(decision.payload.segments) !== JSON.stringify(expectedSegments)
    || !Array.isArray(decision.payload.unresolvedEdits)
    || decision.payload.unresolvedEdits.length !== 0
    || !isRecord(decision.payload.sourceArtifact)
    || decision.payload.sourceArtifact.fileSha256 !== sourceVideoSha256
    || typeof decision.payload.sourceArtifact.sourceProvenance !== 'string'
    || typeof decision.payload.sourceArtifact.sourceRef !== 'string'
    || typeof decision.payload.sourceArtifact.sourceUri !== 'string'
    || decision.approval.status !== 'approved'
    || decision.approval.approverType !== 'human'
    || typeof decision.approval.recordId !== 'string'
    || typeof decision.approval.targetPayloadSha256 !== 'string'
    || decision.approval.targetPayloadSha256 !== canonicalSha256(decision.payload)) {
    fail(`${definition.candidateId}の区間・動画・人間承認bindingが不正です`);
  }
  const sourceArtifact = decision.payload.sourceArtifact as RecordValue;
  const binding: DistantConnectionAssemblyDecisionBindingV001 = {
    path: definition.path,
    schemaVersion: 'presentation-base-media-assembly-decision-v001',
    fileSha256,
    decisionId: decision.decisionId,
    payloadSha256: canonicalSha256(decision.payload),
    approvalRecordId: decision.approval.recordId as string
  };
  return {
    binding,
    buildJob: {
      schemaVersion: 'presentation-base-media-build-job-v001',
      jobId: `distant-connection-${plan.sourceVideoId}-${definition.candidateId}-base-media-build-v001`,
      assemblyDecision: {path: definition.path, fileSha256},
      sourceArtifact: {
        sourceProvenance: sourceArtifact.sourceProvenance as string,
        sourceRef: sourceArtifact.sourceRef as string,
        sourceUri: sourceArtifact.sourceUri as string,
        path: '',
        fileSha256: sourceVideoSha256
      },
      outputDirectory: definition.outputDirectory
    }
  };
}

export function buildDistantConnectionRenderAdapterJobV001(
  input: BuildDistantConnectionRenderAdapterJobV001Input
): DistantConnectionRenderAdapterJobV001 {
  if (input.jobId.trim().length === 0) fail('adapter job IDが空です');
  const planSha256 = sha256(input.intervalizationPlanBytes);
  const candidateSha256 = sha256(input.candidateResponseBytes);
  const semanticSha256 = sha256(input.semanticUtteranceBytes);
  assertSha(planSha256, input.expectedIntervalizationPlanSha256, '一般区間化計画');
  assertSha(candidateSha256, input.expectedCandidateResponseSha256, '正式候補');
  assertSha(semanticSha256, input.expectedSemanticUtteranceSha256, '正式意味発話');
  assertSha(input.sourceVideoSha256, input.expectedSourceVideoSha256, '元動画');
  const plan = readIntervalizationPlan(input.intervalizationPlanBytes);
  if (plan.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || plan.sourceBindings.candidateResponse.fileSha256 !== candidateSha256
    || plan.sourceBindings.semanticUtterance.path !== input.semanticUtterancePath
    || plan.sourceBindings.semanticUtterance.fileSha256 !== semanticSha256) {
    fail('一般区間化計画の正式候補・正式意味発話bindingが入力と一致しません');
  }
  if (input.assemblyDecisions.length !== plan.candidates.length
    || JSON.stringify(input.assemblyDecisions.map((row) => row.candidateId))
      !== JSON.stringify(plan.candidates.map((row) => row.candidateId))
    || new Set(input.assemblyDecisions.map((row) => row.candidateId)).size
      !== input.assemblyDecisions.length) {
    fail('組立決定が全candidateを順序どおりちょうど1回被覆していません');
  }
  const candidates = input.assemblyDecisions.map((definition) => {
    const inspected = inspectAssemblyDecision(
      definition, plan, input.intervalizationPlanPath, input.sourceVideoSha256, planSha256
    );
    inspected.buildJob.sourceArtifact.path = input.sourceVideoPath;
    return {
      candidateId: definition.candidateId,
      assemblyDecision: inspected.binding,
      baseMediaBuildJob: inspected.buildJob
    };
  });
  const result: DistantConnectionRenderAdapterJobV001 = {
    schemaVersion: DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V001,
    jobId: input.jobId,
    sourceVideoId: plan.sourceVideoId,
    sourceBindings: {
      intervalizationPlan: {
        path: input.intervalizationPlanPath,
        schemaVersion: DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
        fileSha256: planSha256
      },
      candidateResponse: {...plan.sourceBindings.candidateResponse},
      semanticUtterance: {...plan.sourceBindings.semanticUtterance},
      sourceVideo: {path: input.sourceVideoPath, fileSha256: input.sourceVideoSha256}
    },
    candidateCount: candidates.length,
    candidates,
    responsibilityPrinciple: JOB_RESPONSIBILITY
  };
  assertDistantConnectionRenderAdapterJobV001(result);
  return result;
}

function assertBaseMediaBuildJob(value: unknown, label: string): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'jobId', 'assemblyDecision', 'sourceArtifact', 'outputDirectory'
    ])
    || value.schemaVersion !== 'presentation-base-media-build-job-v001'
    || typeof value.jobId !== 'string'
    || !isRecord(value.assemblyDecision)
    || !hasExactKeys(value.assemblyDecision, ['path', 'fileSha256'])
    || !isRecord(value.sourceArtifact)
    || !hasExactKeys(value.sourceArtifact, [
      'sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256'
    ])
    || typeof value.outputDirectory !== 'string'
    || value.outputDirectory.length === 0) {
    fail(`${label}の既存基礎映像build job投影が不正です`);
  }
}

export function assertDistantConnectionRenderAdapterJobV001(
  value: unknown
): asserts value is DistantConnectionRenderAdapterJobV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'jobId', 'sourceVideoId', 'sourceBindings',
      'candidateCount', 'candidates', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V001
    || typeof value.jobId !== 'string'
    || value.jobId.length === 0
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || value.responsibilityPrinciple !== JOB_RESPONSIBILITY
    || !Number.isSafeInteger(value.candidateCount)
    || (value.candidateCount as number) <= 0
    || !Array.isArray(value.candidates)
    || value.candidates.length !== value.candidateCount
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, [
      'intervalizationPlan', 'candidateResponse', 'semanticUtterance', 'sourceVideo'
    ])) {
    fail('一般render adapter jobのroot構造・固定責務が不正です');
  }
  assertBinding(value.sourceBindings.intervalizationPlan, '一般区間化計画binding');
  assertBinding(value.sourceBindings.candidateResponse, '正式候補binding');
  assertBinding(value.sourceBindings.semanticUtterance, '正式意味発話binding');
  if (!isRecord(value.sourceBindings.sourceVideo)
    || !hasExactKeys(value.sourceBindings.sourceVideo, ['path', 'fileSha256'])
    || typeof value.sourceBindings.sourceVideo.path !== 'string'
    || typeof value.sourceBindings.sourceVideo.fileSha256 !== 'string'
    || !SHA256.test(value.sourceBindings.sourceVideo.fileSha256)) {
    fail('元動画bindingが不正です');
  }
  const ids: string[] = [];
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, ['candidateId', 'assemblyDecision', 'baseMediaBuildJob'])
      || typeof candidate.candidateId !== 'string'
      || candidate.candidateId.length === 0) {
      fail(`adapter候補${index + 1}件目が不正です`);
    }
    assertAssemblyBinding(
      candidate.assemblyDecision,
      `adapter候補${index + 1}件目の組立決定binding`
    );
    assertBaseMediaBuildJob(candidate.baseMediaBuildJob, `adapter候補${index + 1}件目`);
    const assemblyDecision = candidate.assemblyDecision as DistantConnectionAssemblyDecisionBindingV001;
    const baseMediaBuildJob = candidate.baseMediaBuildJob as PresentationBaseMediaBuildJobProjectionV001;
    if (baseMediaBuildJob.assemblyDecision.path !== assemblyDecision.path
      || baseMediaBuildJob.assemblyDecision.fileSha256 !== assemblyDecision.fileSha256
      || baseMediaBuildJob.sourceArtifact.path !== value.sourceBindings.sourceVideo.path
      || baseMediaBuildJob.sourceArtifact.fileSha256
        !== value.sourceBindings.sourceVideo.fileSha256) {
      fail(`adapter候補${index + 1}件目の組立決定・元動画build job bindingが不正です`);
    }
    ids.push(candidate.candidateId);
  }
  if (new Set(ids).size !== ids.length) fail('adapter jobのcandidate IDが重複しています');
}

function inspectJsonOutput(
  value: DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array},
  label: string
): RecordValue {
  assertBinding(stripBytes(value), label);
  assertSha(sha256(value.bytes), value.fileSha256, label);
  const parsed = parseJson(value.bytes, label);
  if (parsed.schemaVersion !== value.schemaVersion) fail(`${label}のschema bindingが一致しません`);
  return parsed;
}

function frameBoundary(milliseconds: number): number {
  return Math.floor((milliseconds * 30 + 500) / 1000);
}

function validateOutputSet(
  output: DistantConnectionRenderOutputInputV001,
  candidate: DistantConnectionRenderAdapterJobCandidateV001,
  planCandidate: DistantConnectionIntervalizationPlanV002['candidates'][number],
  sourceVideoSha256: string
): DistantConnectionRenderAdapterResultCandidateV001 {
  if (output.candidateId !== candidate.candidateId) fail('render結果のcandidate順序がjobと一致しません');
  const timeline = inspectJsonOutput(output.baseMediaTimeline, `${output.candidateId}の基礎映像timeline`);
  const timelineValidation = inspectJsonOutput(
    output.baseMediaTimelineValidation,
    `${output.candidateId}の基礎映像timeline検査結果`
  );
  const captionOrder = inspectJsonOutput(output.captionOrder, `${output.candidateId}の字幕注文`);
  const technicalQc = inspectJsonOutput(output.technicalQc, `${output.candidateId}の技術QC`);
  assertBinding(output.rendererResult, `${output.candidateId}のrenderer結果`);
  if (output.rendererResult.bytes !== undefined) {
    assertSha(
      sha256(output.rendererResult.bytes),
      output.rendererResult.fileSha256,
      `${output.candidateId}のrenderer結果`
    );
  }
  const expectedFirstFrames = frameBoundary(
    planCandidate.firstPart.sourceEndMs - planCandidate.firstPart.sourceStartMs
  );
  const expectedSecondFrames = frameBoundary(
    planCandidate.secondPart.sourceEndMs - planCandidate.secondPart.sourceStartMs
  );
  if (timeline.candidateId !== output.candidateId
    || !isRecord(timeline.sourceVideoBinding)
    || timeline.sourceVideoBinding.fileSha256 !== sourceVideoSha256
    || !isRecord(timeline.firstPart)
    || timeline.firstPart.sourceStartMs !== planCandidate.firstPart.sourceStartMs
    || timeline.firstPart.sourceEndMs !== planCandidate.firstPart.sourceEndMs
    || !isRecord(timeline.secondPart)
    || timeline.secondPart.sourceStartMs !== planCandidate.secondPart.sourceStartMs
    || timeline.secondPart.sourceEndMs !== planCandidate.secondPart.sourceEndMs
    || !isRecord(timeline.outputFrameMapping)
    || timeline.outputFrameMapping.fps !== 30
    || timeline.outputFrameMapping.firstPartFrameCount !== expectedFirstFrames
    || timeline.outputFrameMapping.secondPartFrameCount !== expectedSecondFrames
    || timeline.outputFrameMapping.totalFrameCount !== expectedFirstFrames + expectedSecondFrames) {
    fail(`${output.candidateId}の区間・frame mapping・元動画bindingが一般区間化計画と一致しません`);
  }
  if (timelineValidation.sourceVideoId !== planCandidate.sourceVideoId
    || !Array.isArray(timelineValidation.candidates)
    || !timelineValidation.candidates.some((row) => isRecord(row)
      && row.candidateId === output.candidateId
      && isRecord(row.video)
      && row.video.fileSha256 === output.rendererResult.fileSha256
      && isRecord(row.qc)
      && row.qc.path === output.technicalQc.path
      && row.qc.fileSha256 === output.technicalQc.fileSha256
      && row.qc.status === 'passed')
    || !isRecord(timelineValidation.qc)
    || timelineValidation.qc.status !== 'passed') {
    fail(`${output.candidateId}のtimeline検査・renderer・QC bindingが一致しません`);
  }
  if (!Array.isArray(captionOrder.instructions)
    || captionOrder.instructions.length === 0
    || captionOrder.instructions.some((instruction) => !isRecord(instruction)
      || typeof instruction.instructionId !== 'string'
      || !instruction.instructionId.startsWith(`${output.candidateId}-`)
      || !isRecord(instruction.outputTime)
      || !Number.isSafeInteger(instruction.outputTime.startFrame)
      || !Number.isSafeInteger(instruction.outputTime.endFrameExclusive)
      || (instruction.outputTime.startFrame as number) < 0
      || (instruction.outputTime.endFrameExclusive as number)
        > expectedFirstFrames + expectedSecondFrames)
    || technicalQc.status !== 'passed'
    || !Array.isArray(technicalQc.violations)
    || technicalQc.violations.length !== 0
    || !isRecord(technicalQc.mediaEvidence)
    || technicalQc.mediaEvidence.expectedFrameCount !== expectedFirstFrames + expectedSecondFrames) {
    fail(`${output.candidateId}の字幕注文・renderer技術QCが不正です`);
  }
  return {
    candidateId: output.candidateId,
    assemblyDecision: {...candidate.assemblyDecision},
    baseMediaTimeline: stripBytes(output.baseMediaTimeline),
    baseMediaTimelineValidation: stripBytes(output.baseMediaTimelineValidation),
    captionOrder: stripBytes(output.captionOrder),
    rendererResult: stripBytes(output.rendererResult),
    technicalQc: stripBytes(output.technicalQc),
    status: 'passed'
  };
}

function stripBytes(
  value: DistantConnectionRenderAdapterBindingV001 & {bytes?: Uint8Array}
): DistantConnectionRenderAdapterBindingV001 {
  return {path: value.path, schemaVersion: value.schemaVersion, fileSha256: value.fileSha256};
}

export function buildDistantConnectionRenderAdapterResultV001(
  input: BuildDistantConnectionRenderAdapterResultV001Input
): DistantConnectionRenderAdapterResultV001 {
  if (input.resultId.trim().length === 0) fail('adapter result IDが空です');
  const jobSha256 = sha256(input.jobBytes);
  assertSha(jobSha256, input.expectedJobSha256, 'adapter job');
  const jobValue = parseJson(input.jobBytes, 'adapter job');
  assertDistantConnectionRenderAdapterJobV001(jobValue);
  const planSha256 = sha256(input.intervalizationPlanBytes);
  assertSha(planSha256, input.expectedIntervalizationPlanSha256, '一般区間化計画');
  const plan = readIntervalizationPlan(input.intervalizationPlanBytes);
  if (input.intervalizationPlanPath !== jobValue.sourceBindings.intervalizationPlan.path
    || planSha256 !== jobValue.sourceBindings.intervalizationPlan.fileSha256
    || plan.sourceVideoId !== jobValue.sourceVideoId
    || plan.sourceBindings.candidateResponse.path
      !== jobValue.sourceBindings.candidateResponse.path
    || plan.sourceBindings.candidateResponse.fileSha256
      !== jobValue.sourceBindings.candidateResponse.fileSha256
    || plan.sourceBindings.semanticUtterance.path
      !== jobValue.sourceBindings.semanticUtterance.path
    || plan.sourceBindings.semanticUtterance.fileSha256
      !== jobValue.sourceBindings.semanticUtterance.fileSha256) {
    fail('adapter resultの一般区間化計画bindingがjobと一致しません');
  }
  if (input.outputs.length !== jobValue.candidates.length
    || JSON.stringify(input.outputs.map((row) => row.candidateId))
      !== JSON.stringify(jobValue.candidates.map((row) => row.candidateId))) {
    fail('render結果が全candidateを順序どおりちょうど1回被覆していません');
  }
  const timelineValidation = parseJson(
    input.outputs[0]?.baseMediaTimelineValidation.bytes
      ?? fail('adapter result入力が空です'),
    '基礎映像timeline検査結果'
  );
  if (!isRecord(timelineValidation.sourceBindings)
    || !isRecord(timelineValidation.sourceBindings.candidateResponse)) {
    fail('既存timeline検査結果が正式候補bindingを所有していません');
  }
  const candidateResponsePath = jobValue.sourceBindings.candidateResponse.path;
  if (timelineValidation.sourceBindings.candidateResponse.path !== candidateResponsePath
    || timelineValidation.sourceBindings.candidateResponse.fileSha256
      !== jobValue.sourceBindings.candidateResponse.fileSha256) {
    fail('既存timeline検査結果の正式候補bindingがadapter jobと一致しません');
  }
  const candidates = jobValue.candidates.map((candidate, index) => {
    return validateOutputSet(
      input.outputs[index],
      candidate,
      plan.candidates[index],
      jobValue.sourceBindings.sourceVideo.fileSha256
    );
  });
  const result: DistantConnectionRenderAdapterResultV001 = {
    schemaVersion: DISTANT_CONNECTION_RENDER_ADAPTER_RESULT_SCHEMA_V001,
    resultId: input.resultId,
    jobBinding: {
      path: input.jobPath,
      schemaVersion: DISTANT_CONNECTION_RENDER_ADAPTER_JOB_SCHEMA_V001,
      fileSha256: jobSha256
    },
    sourceVideoId: jobValue.sourceVideoId,
    candidateCount: candidates.length,
    candidates,
    status: 'passed',
    responsibilityPrinciple: RESULT_RESPONSIBILITY
  };
  assertDistantConnectionRenderAdapterResultV001(result);
  return result;
}

export function assertDistantConnectionRenderAdapterResultV001(
  value: unknown
): asserts value is DistantConnectionRenderAdapterResultV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'resultId', 'jobBinding', 'sourceVideoId',
      'candidateCount', 'candidates', 'status', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_RENDER_ADAPTER_RESULT_SCHEMA_V001
    || typeof value.resultId !== 'string'
    || value.resultId.length === 0
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || value.status !== 'passed'
    || value.responsibilityPrinciple !== RESULT_RESPONSIBILITY
    || !Number.isSafeInteger(value.candidateCount)
    || (value.candidateCount as number) <= 0
    || !Array.isArray(value.candidates)
    || value.candidates.length !== value.candidateCount) {
    fail('一般render adapter resultのroot構造・固定責務が不正です');
  }
  assertBinding(value.jobBinding, 'adapter job binding');
  const ids: string[] = [];
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId', 'assemblyDecision', 'baseMediaTimeline',
        'baseMediaTimelineValidation', 'captionOrder', 'rendererResult', 'technicalQc', 'status'
      ])
      || typeof candidate.candidateId !== 'string'
      || candidate.candidateId.length === 0
      || candidate.status !== 'passed') {
      fail(`adapter result候補${index + 1}件目が不正です`);
    }
    assertAssemblyBinding(candidate.assemblyDecision, `result候補${index + 1}件目の組立決定`);
    for (const key of [
      'baseMediaTimeline', 'baseMediaTimelineValidation', 'captionOrder',
      'rendererResult', 'technicalQc'
    ] as const) assertBinding(candidate[key], `result候補${index + 1}件目.${key}`);
    ids.push(candidate.candidateId);
  }
  if (new Set(ids).size !== ids.length) fail('adapter resultのcandidate IDが重複しています');
}

export function serializeDistantConnectionRenderAdapterJobV001(
  job: DistantConnectionRenderAdapterJobV001
): Buffer {
  assertDistantConnectionRenderAdapterJobV001(job);
  return Buffer.from(`${JSON.stringify(job, null, 2)}\n`, 'utf8');
}

export function serializeDistantConnectionRenderAdapterResultV001(
  result: DistantConnectionRenderAdapterResultV001
): Buffer {
  assertDistantConnectionRenderAdapterResultV001(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionRenderAdapterJobAgainstSourcesV001(
  job: DistantConnectionRenderAdapterJobV001,
  input: BuildDistantConnectionRenderAdapterJobV001Input
): void {
  assertDistantConnectionRenderAdapterJobV001(job);
  const rebuilt = buildDistantConnectionRenderAdapterJobV001(input);
  if (!serializeDistantConnectionRenderAdapterJobV001(job)
    .equals(serializeDistantConnectionRenderAdapterJobV001(rebuilt))) {
    fail('一般render adapter jobが指定正本からの決定的再生成結果と一致しません');
  }
}

export function validateDistantConnectionRenderAdapterResultAgainstSourcesV001(
  result: DistantConnectionRenderAdapterResultV001,
  input: BuildDistantConnectionRenderAdapterResultV001Input
): void {
  assertDistantConnectionRenderAdapterResultV001(result);
  const rebuilt = buildDistantConnectionRenderAdapterResultV001(input);
  if (!serializeDistantConnectionRenderAdapterResultV001(result)
    .equals(serializeDistantConnectionRenderAdapterResultV001(rebuilt))) {
    fail('一般render adapter resultが指定正本からの決定的再生成結果と一致しません');
  }
}

export async function fileSha256StreamingV001(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

export async function writeDistantConnectionRenderAdapterArtifactsV001(input: {
  workspaceRoot: string;
  outputJobPath: string;
  outputResultPath: string;
  job: DistantConnectionRenderAdapterJobV001;
  result: DistantConnectionRenderAdapterResultV001;
}): Promise<void> {
  const jobBytes = serializeDistantConnectionRenderAdapterJobV001(input.job);
  if (input.result.jobBinding.path !== input.outputJobPath
    || input.result.jobBinding.fileSha256 !== sha256(jobBytes)) {
    fail('adapter resultのjob bindingが保存対象jobと一致しません');
  }
  await Promise.all([
    mkdir(path.dirname(path.join(input.workspaceRoot, input.outputJobPath)), {recursive: true}),
    mkdir(path.dirname(path.join(input.workspaceRoot, input.outputResultPath)), {recursive: true})
  ]);
  await writeFile(path.join(input.workspaceRoot, input.outputJobPath), jobBytes, {flag: 'wx'});
  await writeFile(
    path.join(input.workspaceRoot, input.outputResultPath),
    serializeDistantConnectionRenderAdapterResultV001(input.result),
    {flag: 'wx'}
  );
}

export async function readArtifactBindingV001(
  workspaceRoot: string,
  binding: DistantConnectionRenderAdapterBindingV001
): Promise<DistantConnectionRenderAdapterBindingV001 & {bytes: Uint8Array}> {
  const bytes = await readFile(path.join(workspaceRoot, binding.path));
  assertSha(sha256(bytes), binding.fileSha256, binding.path);
  return {...binding, bytes};
}

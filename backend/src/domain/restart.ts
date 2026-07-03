import path from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import {
  ARTIFACT_FILE_NAME_BY_KIND,
  findById,
  getFileRefKindForRequest,
  isStatusIn,
  unknownErrorMessage,
  WORKFLOW_STEPS,
  type AgentRequest,
  type ControlReference,
  type ControlReviewItem,
  type DecisionLog,
  type FileRef,
  type HumanReviewAction,
  type OutputEntity,
  type RequestDraft,
  type Zev2State
} from '@zev2/shared';
import { artifactUrl } from '../artifacts/artifact-path.js';
import {
  artifactRoot,
  isVideoMimeType,
  readArtifactFileMetadata,
  validateArtifactFileRefForKind,
  type ArtifactFileMetadata
} from '../artifacts/validation.js';
import { appendAgentOperationLog, appendAgentRequestOperationLog } from './operation-log.js';
import { createId } from './support.js';
import {
  fileRefForAgentRequest,
  latestSucceededAgentRequest,
  outputForAgentRequest,
  workflowStepIndex
} from './state-selectors.js';

export type GeneratedVideoChangeScope = 'theme_selection' | 'edit_plan' | 'adjustment';

export const generatedVideoChangeScopes: GeneratedVideoChangeScope[] = ['theme_selection', 'edit_plan', 'adjustment'];

export type CopiedEditRestart = {
  draft: RequestDraft;
  requests: AgentRequest[];
  queuedRequests: AgentRequest[];
  fileRefs: FileRef[];
  outputs: OutputEntity[];
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
};

export function restartArtifactFileName(sourceFileRef: FileRef, sourceArtifactPath: string): string {
  if (!isVideoMimeType(sourceFileRef.mimeType)) {
    return ARTIFACT_FILE_NAME_BY_KIND[sourceFileRef.kind];
  }

  const sourceFileName = path.basename(sourceArtifactPath);
  if (sourceFileName.toLowerCase().endsWith('.mp4')) {
    return sourceFileName;
  }

  return sourceFileRef.kind === 'source_video'
    ? 'source-video.mp4'
    : ARTIFACT_FILE_NAME_BY_KIND.output_video;
}

export async function copyArtifactFileForRestart(
  sourceFileRef: FileRef,
  sourceRequest: AgentRequest,
  requestDraftId: string
): Promise<({ uri: string } & ArtifactFileMetadata) | { error: string }> {
  const expectedKind = getFileRefKindForRequest(sourceRequest.type);
  if (sourceFileRef.kind !== expectedKind) {
    return { error: `${sourceRequest.label}の成果物種別が工程と一致しないため、編集コピーに引き継げません` };
  }

  const validation = await validateArtifactFileRefForKind(
    sourceRequest.requestDraftId,
    expectedKind,
    sourceFileRef.uri,
    sourceFileRef.mimeType
  );
  if ('error' in validation) {
    return { error: `${sourceRequest.label}の成果物参照をコピー前に確認できません: ${validation.error}` };
  }

  const fileName = restartArtifactFileName(sourceFileRef, validation.artifactPath);
  const destinationDirectory = path.join(artifactRoot(), requestDraftId);
  const destinationPath = path.join(destinationDirectory, fileName);

  try {
    await mkdir(destinationDirectory, { recursive: true });
    await copyFile(validation.artifactPath, destinationPath);
  } catch (error) {
    return {
      error: `${sourceFileRef.kind}の成果物ファイルをコピーできません: ${unknownErrorMessage(error)}`
    };
  }

  try {
    return {
      uri: artifactUrl(requestDraftId, fileName),
      ...await readArtifactFileMetadata(destinationPath)
    };
  } catch (error) {
    return {
      error: `${sourceFileRef.kind}のコピー後ファイル情報を確認できません: ${unknownErrorMessage(error)}`
    };
  }
}

export function createAgentRequestForDraftStep(
  draft: RequestDraft,
  type: AgentRequest['type'],
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): AgentRequest {
  const step = WORKFLOW_STEPS.find((item) => item.type === type);
  if (!step) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return {
    id: createId('agent'),
    requestDraftId: draft.id,
    type: step.type,
    label: step.label,
    target: {
      sourceUri: draft.source.uri
    },
    input: {
      purpose: draft.purpose,
      settings: { ...draft.settings }
    },
    constraints: { ...draft.settings },
    policy: { ...draft.policy },
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'queued',
    fileRefIds: [],
    createdAt,
    updatedAt: createdAt
  };
}

export function copyDraftForRestart(
  sourceDraft: RequestDraft,
  reason: string,
  createdAt: string,
  materialReselectInstruction?: string
): RequestDraft {
  const purposeLines = [sourceDraft.purpose];
  if (reason) {
    purposeLines.push(`やり直し理由: ${reason}`);
  }
  if (materialReselectInstruction) {
    purposeLines.push(`編集元場面の探し直し指示: ${materialReselectInstruction}`);
  }

  return {
    ...sourceDraft,
    id: createId('draft'),
    status: 'approved',
    purpose: purposeLines.join('\n'),
    source: { ...sourceDraft.source },
    settings: { ...sourceDraft.settings },
    policy: { ...sourceDraft.policy },
    steps: sourceDraft.steps.map((step) => ({ ...step })),
    createdAt,
    updatedAt: createdAt
  };
}

export async function copySucceededAgentRequestForDraft(
  state: Zev2State,
  sourceRequest: AgentRequest,
  requestDraftId: string,
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): Promise<{ request: AgentRequest; fileRef?: FileRef; output?: OutputEntity } | { error: string }> {
  if (sourceRequest.status !== 'succeeded') {
    return { error: `${sourceRequest.label}が完了していないため、編集コピーに引き継げません` };
  }

  const copiedRequest: AgentRequest = {
    ...sourceRequest,
    id: createId('agent'),
    requestDraftId,
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'succeeded',
    fileRefIds: [...sourceRequest.fileRefIds],
    ...(sourceRequest.result ? { result: { ...sourceRequest.result } } : {}),
    createdAt,
    updatedAt: createdAt
  };
  delete copiedRequest.errorMessage;
  if (!dependsOnAgentRequestId) {
    delete copiedRequest.dependsOnAgentRequestId;
  }

  if (!sourceRequest.result?.fileRefId && !sourceRequest.result?.outputId) {
    return { request: copiedRequest };
  }

  const sourceFileRef = fileRefForAgentRequest(state, sourceRequest);
  const sourceOutput = outputForAgentRequest(state, sourceRequest);
  if (!sourceFileRef || !sourceOutput || !sourceRequest.result) {
    return { error: `${sourceRequest.label}の成果物参照をコピーできません` };
  }

  const outputId = createId(sourceRequest.type);
  const fileRefId = createId('fileref');
  const copiedArtifact = await copyArtifactFileForRestart(sourceFileRef, sourceRequest, requestDraftId);
  if ('error' in copiedArtifact) {
    return copiedArtifact;
  }
  const fileRef: FileRef = {
    ...sourceFileRef,
    id: fileRefId,
    uri: copiedArtifact.uri,
    artifactFileName: copiedArtifact.artifactFileName,
    byteSize: copiedArtifact.byteSize,
    sha256: copiedArtifact.sha256,
    ownerId: outputId,
    createdAt
  };
  const output: OutputEntity = {
    ...sourceOutput,
    id: outputId,
    fileRefId
  };

  copiedRequest.fileRefIds = [fileRefId];
  copiedRequest.result = {
    ...sourceRequest.result,
    outputId,
    fileRefId
  };

  return { request: copiedRequest, fileRef, output };
}

export function copyApprovedReviewsForCopiedRequests(
  state: Zev2State,
  requestDraftId: string,
  copiedRequestIdsBySourceId: Map<string, string>,
  copiedFileRefIdsBySourceId: Map<string, string>,
  copiedOutputIdsBySourceId: Map<string, string>,
  createdAt: string
): {
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
} {
  const decisionLogs: DecisionLog[] = [];
  const controlReviewItems: ControlReviewItem[] = [];
  const humanReviewActions: HumanReviewAction[] = [];

  for (const sourceReview of state.controlReviewItems) {
    if (sourceReview.status !== 'approved') {
      continue;
    }

    const copiedAgentRequestId = copiedRequestIdsBySourceId.get(sourceReview.agentRequestId);
    if (!copiedAgentRequestId) {
      continue;
    }

    const sourceAgentRequest = findById(state.agentRequests, sourceReview.agentRequestId);
    const sourceDecisionLog = findById(state.decisionLogs, sourceReview.decisionLogId);
    const sourceAction = findById(state.humanReviewActions, sourceReview.resolvedByActionId);
    const decisionLogId = createId('decision');
    const humanReviewActionId = createId('human_review');
    const controlReviewItemId = createId('review');
    const remapReferences = (references: ControlReference[] = []) => references.map((reference) => {
      if (reference.kind === 'request_draft') {
        return { ...reference, refId: requestDraftId };
      }

      if (reference.kind === 'agent_request') {
        return { ...reference, refId: copiedRequestIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      if (reference.kind === 'file_ref') {
        return { ...reference, refId: copiedFileRefIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      if (reference.kind === 'output') {
        return { ...reference, refId: copiedOutputIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      return { ...reference };
    });
    const copiedReviewOptions = sourceReview.options.map((option) => ({
      ...option,
      evidenceRefs: remapReferences(option.evidenceRefs)
    }));

    const copiedDecisionLog: DecisionLog = sourceDecisionLog
      ? {
          ...sourceDecisionLog,
          id: decisionLogId,
          requestDraftId,
          agentRequestId: copiedAgentRequestId,
          evidenceRefs: remapReferences(sourceDecisionLog.evidenceRefs),
          inputRefs: remapReferences(sourceDecisionLog.inputRefs),
          artifactRefs: remapReferences(sourceDecisionLog.artifactRefs),
          createdAt
        }
      : {
          id: decisionLogId,
          requestDraftId,
          agentRequestId: copiedAgentRequestId,
          stepType: sourceAgentRequest?.type ?? 'propose_clip_themes',
          actor: 'backend',
          decisionType: sourceReview.kind,
          decision: `${sourceReview.title}を引き継ぐ`,
          reason: sourceReview.reason,
          evidenceRefs: remapReferences(sourceReview.evidenceRefs),
          inputRefs: [],
          artifactRefs: remapReferences(sourceReview.evidenceRefs),
          proposedNextState: sourceReview.proposedNextState,
          requiresHumanReview: true,
          humanQuestion: sourceReview.humanQuestion,
          ruleIds: ['control-plane:copied-human-review'],
          createdAt
        };

    const copiedAction: HumanReviewAction = {
      id: humanReviewActionId,
      reviewItemId: controlReviewItemId,
      requestDraftId,
      action: sourceAction?.action ?? 'approve',
      reason: sourceAction?.reason ?? `${sourceReview.title}を引き継ぐ`,
      ...(sourceAction?.selectedOptionId ? { selectedOptionId: sourceAction.selectedOptionId } : {}),
      createdAt
    };

    const copiedReview: ControlReviewItem = {
      ...sourceReview,
      id: controlReviewItemId,
      requestDraftId,
      agentRequestId: copiedAgentRequestId,
      status: 'approved',
      decisionLogId,
      evidenceRefs: remapReferences(sourceReview.evidenceRefs),
      options: copiedReviewOptions,
      resolvedAt: createdAt,
      resolvedByActionId: humanReviewActionId,
      createdAt,
      updatedAt: createdAt
    };

    decisionLogs.push(copiedDecisionLog);
    humanReviewActions.push(copiedAction);
    controlReviewItems.push(copiedReview);
  }

  return { decisionLogs, controlReviewItems, humanReviewActions };
}

export async function createCopiedEditRestart(
  state: Zev2State,
  requestDraftId: string,
  startType: AgentRequest['type'],
  reason: string,
  createdAt: string,
  materialReselectInstruction?: string
): Promise<CopiedEditRestart | { error: string }> {
  const sourceDraft = findById(state.requestDrafts, requestDraftId);
  if (!sourceDraft) {
    return { error: 'コピーする編集が見つかりません' };
  }

  const startIndex = workflowStepIndex(startType);
  const copiedDraft = copyDraftForRestart(sourceDraft, reason, createdAt, materialReselectInstruction);
  const requests: AgentRequest[] = [];
  const queuedRequests: AgentRequest[] = [];
  const fileRefs: FileRef[] = [];
  const outputs: OutputEntity[] = [];
  const copiedRequestIdsBySourceId = new Map<string, string>();
  const copiedFileRefIdsBySourceId = new Map<string, string>();
  const copiedOutputIdsBySourceId = new Map<string, string>();
  let dependsOnAgentRequestId: string | undefined;

  for (const step of WORKFLOW_STEPS.slice(0, startIndex)) {
    const sourceRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, step.type);
    if (!sourceRequest) {
      return { error: `${step.label}が完了していないため、そこから後ろを作り直せません` };
    }

    const copied = await copySucceededAgentRequestForDraft(
      state,
      sourceRequest,
      copiedDraft.id,
      dependsOnAgentRequestId,
      createdAt
    );
    if ('error' in copied) {
      return copied;
    }

    requests.push(copied.request);
    copiedRequestIdsBySourceId.set(sourceRequest.id, copied.request.id);
    if (copied.fileRef) {
      fileRefs.push(copied.fileRef);
      const sourceFileRefId = sourceRequest.result?.fileRefId;
      if (sourceFileRefId) {
        copiedFileRefIdsBySourceId.set(sourceFileRefId, copied.fileRef.id);
      }
    }
    if (copied.output) {
      outputs.push(copied.output);
      const sourceOutputId = sourceRequest.result?.outputId;
      if (sourceOutputId) {
        copiedOutputIdsBySourceId.set(sourceOutputId, copied.output.id);
      }
    }
    dependsOnAgentRequestId = copied.request.id;
  }

  for (const step of WORKFLOW_STEPS.slice(startIndex)) {
    const request = createAgentRequestForDraftStep(copiedDraft, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    queuedRequests.push(request);
    dependsOnAgentRequestId = request.id;
  }
  const copiedReviews = copyApprovedReviewsForCopiedRequests(
    state,
    copiedDraft.id,
    copiedRequestIdsBySourceId,
    copiedFileRefIdsBySourceId,
    copiedOutputIdsBySourceId,
    createdAt
  );

  return {
    draft: copiedDraft,
    requests,
    queuedRequests,
    fileRefs,
    outputs,
    ...copiedReviews
  };
}

export function appendCopiedRestartToState(
  state: Zev2State,
  restart: {
    draft: RequestDraft;
    requests: AgentRequest[];
    fileRefs: FileRef[];
    outputs: OutputEntity[];
    decisionLogs: DecisionLog[];
    controlReviewItems: ControlReviewItem[];
    humanReviewActions: HumanReviewAction[];
  }
) {
  state.requestDrafts.unshift(restart.draft);
  state.fileRefs.push(...restart.fileRefs);
  state.outputs.push(...restart.outputs);
  state.decisionLogs.push(...restart.decisionLogs);
  state.controlReviewItems.push(...restart.controlReviewItems);
  state.humanReviewActions.push(...restart.humanReviewActions);
  state.agentRequests.push(...restart.requests);
  appendAgentOperationLog(state, {
    eventType: 'draft_created',
    requestDraftId: restart.draft.id,
    actor: 'backend',
    toStatus: restart.draft.status,
    detail: '作り直し用の編集コピーを作成した',
    createdAt: restart.draft.createdAt
  });
  appendAgentOperationLog(state, {
    eventType: 'draft_approved',
    requestDraftId: restart.draft.id,
    actor: 'backend',
    toStatus: restart.draft.status,
    detail: '編集コピーをAIエージェント用作業へ進める状態にした',
    createdAt: restart.draft.updatedAt
  });
  for (const agentRequest of restart.requests) {
    appendAgentRequestOperationLog(
      state,
      agentRequest,
      'agent_request_created',
      agentRequest.status === 'succeeded'
        ? `${agentRequest.label}を完了済み工程として編集コピーへ引き継いだ`
        : `${agentRequest.label}を作り直し用のAIエージェント作業としてキューに追加した`,
      {
        actor: 'backend',
        toStatus: agentRequest.status,
        ...(agentRequest.result?.fileRefId ? { fileRefId: agentRequest.result.fileRefId } : {}),
        ...(agentRequest.result?.outputId ? { outputId: agentRequest.result.outputId } : {}),
        createdAt: agentRequest.createdAt
      }
    );
  }
}

export function restartStartTypeForGeneratedVideoChange(scope: GeneratedVideoChangeScope): AgentRequest['type'] {
  if (scope === 'theme_selection') {
    return 'build_clip_composition';
  }

  if (scope === 'adjustment') {
    return 'apply_adjustment';
  }

  return 'create_edit_plan';
}

export function generatedVideoChangeScopeFromInput(value: unknown): GeneratedVideoChangeScope | { error: string } {
  if (value === undefined) {
    return 'edit_plan';
  }

  if (generatedVideoChangeScopes.includes(value as GeneratedVideoChangeScope)) {
    return value as GeneratedVideoChangeScope;
  }

  return { error: '生成済み動画から作り直す範囲が不正です' };
}

export async function createCopiedRestartFromFailedRequest(
  state: Zev2State,
  failedRequestId: string,
  createdAt: string
): Promise<CopiedEditRestart | { error: string }> {
  const failedRequest = findById(state.agentRequests, failedRequestId);
  if (!failedRequest) {
    return { error: '再実行するAI工程が見つかりません' };
  }

  if (failedRequest.status !== 'failed') {
    return { error: '失敗したAI工程だけ再実行できます' };
  }

  return createCopiedEditRestart(
    state,
    failedRequest.requestDraftId,
    failedRequest.type,
    `${failedRequest.label}の失敗後に再実行する`,
    createdAt
  );
}

export function createAgentRequestAfter(
  sourceRequest: AgentRequest,
  type: AgentRequest['type'],
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): AgentRequest {
  const step = WORKFLOW_STEPS.find((item) => item.type === type);
  if (!step) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return {
    id: createId('agent'),
    requestDraftId: sourceRequest.requestDraftId,
    type: step.type,
    label: step.label,
    target: { ...sourceRequest.target },
    input: {
      purpose: sourceRequest.input.purpose,
      settings: { ...sourceRequest.input.settings }
    },
    constraints: { ...sourceRequest.constraints },
    policy: { ...sourceRequest.policy },
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'queued',
    fileRefIds: [],
    createdAt,
    updatedAt: createdAt
  };
}

export function markReplaceableRequestsAsReplaced(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  startType: AgentRequest['type'],
  updatedAt: string
) {
  const startIndex = workflowStepIndex(startType);
  const renderIndex = workflowStepIndex('render_video');

  for (const request of stateAgentRequests) {
    const requestIndex = workflowStepIndex(request.type);
    const shouldReplace =
      request.requestDraftId === requestDraftId &&
      requestIndex >= startIndex &&
      requestIndex <= renderIndex &&
      isStatusIn(request.status, ['queued', 'waiting', 'running', 'succeeded', 'failed']);

    if (!shouldReplace) {
      continue;
    }

    request.status = 'superseded';
    request.errorMessage = '人間のやり直し指示により、この工程は古い編集案として現在対象から外しました';
    request.updatedAt = updatedAt;
  }
}

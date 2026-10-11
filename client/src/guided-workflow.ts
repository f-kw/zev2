import { draftConfirmationIdentity, findById, getFileRefKindForRequest, getOutputTypeForRequest, isAgentRequestReady, type AgentRequest, type ControlReviewItem, type FileRef, type RequestDraft, type RuntimeConfig, type UiReviewMaterials, type Zev2State } from '@zev2/shared';

export const GUIDE_STEPS = ['依頼', '下書き', '内容確認', '作成前確認', '作成', '動画確認'];

function registeredFile(state: Zev2State, request: AgentRequest): FileRef | undefined {
  const file = findById(state.fileRefs, request.result?.fileRefId);
  const output = findById(state.outputs, request.result?.outputId);
  if (!file || !output || file.ownerId !== output.id || output.fileRefId !== file.id
    || output.type !== getOutputTypeForRequest(request.type) || request.result?.outputType !== output.type
    || file.kind !== getFileRefKindForRequest(request.type) || !request.fileRefIds.includes(file.id)
    || !file.uri || !file.sha256 || file.byteSize <= 0) return;
  return file;
}

/** Only the current producer's registered bytes may be presented as this request's output. */
export function currentOutput(state: Zev2State, draftId: string): FileRef | undefined {
  const request = state.agentRequests.filter(r => r.requestDraftId === draftId && r.type === 'render_video'
    && r.status !== 'superseded').reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!request || request.status !== 'succeeded' || !request.result?.fileRefId) return;
  const file = registeredFile(state, request);
  return file?.mimeType.startsWith('video/') ? file : undefined;
}

export function resumeBlockers(state: Zev2State, draftId: string): string[] {
  const ready = state.agentRequests.filter(r => isAgentRequestReady(state, r));
  if (!draftId || !ready.some(r => r.requestDraftId === draftId)) return ['この依頼に再開できる工程がありません。'];
  if (state.agentRequests.some(r => r.status === 'running')) {
    return ['取得中の作業があるため、競合する再開を停止しています。'];
  }
  return [];
}

export function executionBlockers(config: RuntimeConfig | null): string[] {
  if (!config) return ['実行条件を取得できていません。'];
  if (config.editPlan.mode === 'gemini') return ['外部AIへの送信・料金の見積もり確認が未接続です。実行は開始できません。'];
  return [];
}

export function draftStartBlockers(draft: RequestDraft, config: RuntimeConfig | null): string[] {
  const blockers: string[] = [];
  if (draft.status !== 'draft') blockers.push('この下書きは開始前の状態ではありません。');
  if (!draft.purpose.trim() || !draft.source.uri.trim()) blockers.push('依頼と使う素材を指定してください。');
  blockers.push(...executionBlockers(config));
  if (draft.productionType === 'digest') blockers.push('ダイジェストは計画検証まで接続済みです。内容確認から動画作成への接続が必要です。');
  return blockers;
}

export function reviewBlockers(state: Zev2State, draft: RequestDraft, review: ControlReviewItem, materials?: UiReviewMaterials | null): string[] {
  const blockers: string[] = [];
  const producer = findById(state.agentRequests, review.agentRequestId);
  const latest = state.controlReviewItems.filter(r => r.requestDraftId === draft.id && r.status === 'review_required')
    .reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (draft.status !== 'approved' || review.requestDraftId !== draft.id || latest?.id !== review.id
    || review.status !== 'review_required' || producer?.requestDraftId !== draft.id || producer.status !== 'succeeded') {
    blockers.push('この確認資料は現在の依頼・工程に一致しません。再読み込みしてください。');
  }
  const file = producer ? registeredFile(state, producer) : undefined;
  if (!file
    || !review.evidenceRefs.some(ref => ref.kind === 'file_ref' && ref.refId === file.id)) {
    blockers.push('保存済みの確認資料への参照が不足しています。');
  }
  if (review.kind === 'render_readiness') {
    blockers.push(...(materials?.blockers ?? ['登録済みの作成前確認資料を取得できていません。動画作成は停止しています。']));
  } else if (!review.options.length || review.options.some(o => !o.id || !o.title.trim() || !o.summary.trim() || !o.evidenceRefs.length)
    || new Set(review.options.map(o => o.id)).size !== review.options.length) {
    blockers.push('内容確認に必要な候補と判断材料が不足しています。');
  }
  return blockers;
}

export function guideStep(draft: RequestDraft | undefined, review: ControlReviewItem | undefined,
  hasOutput: boolean, enteringRequest: boolean, requestType?: AgentRequest['type']): number {
  if (enteringRequest || !draft) return 0;
  if (draft.status === 'draft' || draft.status === 'rejected') return 1;
  if (review) return review.kind === 'render_readiness' ? 3 : 2;
  if (hasOutput) return 5;
  if (requestType === 'render_video') return 4;
  if (requestType === 'create_edit_plan' || requestType === 'apply_adjustment') return 3;
  return 2;
}

export function draftIdentity(draft: RequestDraft): string {
  return draftConfirmationIdentity(draft);
}

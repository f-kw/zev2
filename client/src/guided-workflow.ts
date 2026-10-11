import { draftConfirmationIdentity, findById, getFileRefKindForRequest, getOutputTypeForRequest, isAgentRequestReady, type AgentRequest, type ControlReviewItem, type FileRef, type RequestDraft, type RuntimeConfig, type UiReviewMaterials, type UiSavedCandidate, type Zev2State } from '@zev2/shared';

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
  hasOutput: boolean, enteringRequest: boolean, requestType?: AgentRequest['type'], materials?: UiReviewMaterials | null): number {
  if (enteringRequest || !draft) return 0;
  if (draft.status === 'draft' || draft.status === 'rejected') return 1;
  if (review) return review.kind === 'render_readiness' ? 3 : 2;
  if (hasOutput) return 5;
  if (draft.productionType === 'digest' && requestType === 'validate_digest_plan'
    && materials?.requestDraftId === draft.id && materials.draftIdentity === draftConfirmationIdentity(draft)
    && materials.digestPreparation?.status === 'verified'
    && (materials.digestComposition?.status === 'current' || verifiedDigestRevision(materials))) return 3;
  if (requestType === 'render_video') return 4;
  if (requestType === 'create_edit_plan' || requestType === 'apply_adjustment') return 3;
  return 2;
}

export function creationCheckLabels(checks: UiReviewMaterials['creationChecks']) {
  return {
    audio: checks?.audioPreservation === 'preserve-source-only' ? '元の音声を保持する指定' : '元の音声を保持する指定：未確認',
    source: checks?.sourceAudioReference === 'registered' ? '元音声の参照と入力時計：登録資料との一致を確認' : '元音声の参照と入力時計：未確認',
    completion: '完成動画の実媒体検査と人間の採用判断：未実施（動画作成後に確認）'
  };
}

export function draftIdentity(draft: RequestDraft): string {
  return draftConfirmationIdentity(draft);
}

export function previewStatusLabel(candidate?: UiSavedCandidate): string {
  const state=candidate?.previewStatus?.state ?? 'unknown';
  return {unknown:'作成状況不明（登録資料・実行状態の確認待ち）',not_created:'未作成（登録済みの待機作業）',
    preparing:'準備中（処理実行中）',ready:'生成済みプレビュー',failed:'プレビュー準備失敗',cancelled:'プレビュー作業中止'}[state];
}
export function initialCandidateId(review: ControlReviewItem, materials?: UiReviewMaterials | null): string {
  const rec=materials?.recommendation;
  return rec && materials?.review?.id===review.id && materials.requestDraftId===review.requestDraftId
    && !materials.blockers.length && review.options.some(o=>o.id===rec.candidateId)
    ? rec.candidateId : review.options[0]?.id ?? '';
}
/** Match the live preparation view to the displayed chain; it never changes server execution blockers. */
export function verifiedDigestRevision(materials: UiReviewMaterials | null | undefined) {
  const v = materials?.digestRevision, c = materials?.digestComposition;
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!v || v.status !== 'verified' || !c || c.status !== 'revision_requested' || materials?.digestPreparation?.status !== 'verified'
    || v.requestDraftId !== materials.requestDraftId || v.draftIdentity !== materials.draftIdentity || v.fingerprint !== materials.fingerprint
    || !/^[0-9a-f]{64}$/u.test(v.requestHash) || !/^[0-9a-f]{64}$/u.test(v.preparationHash)
    || !equal(v.representedEditRequestIds, c.editRequestIds) || !equal(v.candidateIds, c.requestedCandidateIds)
    || !Array.isArray(v.appliedEdits) || !equal(v.appliedEdits.map(a => a.id), c.editRequestIds)
    || new Set(v.appliedEdits.map(a => a.candidateId)).size !== c.addedCandidateIds.length
    || !v.appliedEdits.every(a => c.addedCandidateIds.includes(a.candidateId) && materials.candidates.some(s => s.id === a.candidateId && s.title === a.title))
    || !Number.isFinite(v.durationMs) || !(v.durationMs! > 0) || !Array.isArray(v.segments) || !v.segments.length
    || !Array.isArray(v.remainingChecks) || !v.remainingChecks.length || !v.remainingChecks.every(b => typeof b === 'string' && b)
    || !equal(v.admission, { captionDisplayAnswers: 'unanswered', executionPermission: 'not-approved', humanQuality: 'pending' })) return;
  const source = new Map(materials.candidates.filter(s => c.requestedCandidateIds.includes(s.id)).flatMap(s => s.speeches.map(a => [a.id, a] as const)));
  const ids = v.segments.flatMap(s => s.speechIds);
  if (new Set(ids).size !== ids.length || !v.segments.every((s, i) => Number.isFinite(s.startMs) && Number.isFinite(s.endMs)
    && s.startMs >= 0 && s.endMs > s.startMs && (!i || v.segments[i - 1]!.endMs <= s.startMs) && s.speechIds.length
    && s.speechIds.every(id => source.has(id)) && s.caption === s.speechIds.map(id => source.get(id)!.text).join(''))) return;
  return v;
}
export function digestCandidateAdditionState(materials: UiReviewMaterials | null | undefined, id: string): 'unavailable' | 'adopted' | 'requested' | 'reflected' | 'overlap' | 'available' {
  const composition = materials?.digestComposition, candidate = materials?.candidates.find(c => c.id === id);
  if (materials?.digestPreparation?.status !== 'verified' || !composition || composition.status === 'source_changed' || !candidate?.ranges.length) return 'unavailable';
  if (composition.currentCandidateIds.includes(id)) return 'adopted';
  if (composition.requestedCandidateIds.includes(id)) return verifiedDigestRevision(materials)?.appliedEdits.some(a => a.candidateId === id) ? 'reflected' : 'requested';
  const start = Math.min(...candidate.ranges.map(r => r.startMs)), end = Math.max(...candidate.ranges.map(r => r.endMs));
  if (composition.requestedCandidateIds.some(other => {
    const ranges = materials.candidates.find(c => c.id === other)?.ranges;
    return !ranges?.length || (start < Math.max(...ranges.map(r => r.endMs)) && Math.min(...ranges.map(r => r.startMs)) < end);
  })) return 'overlap';
  return 'available';
}

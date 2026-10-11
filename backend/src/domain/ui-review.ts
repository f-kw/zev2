import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, lstat } from 'node:fs/promises';
import { findById, getFileRefKindForRequest, getOutputTypeForRequest, getRequiredControlReviewKind,
  draftConfirmationIdentity, runtimeConfirmationIdentity, recordValue, assertJsonArtifactForKind, assertApprovedAgentRequestInput,
  type AgentRequest, type FileRef, type RuntimeConfig, type UiReviewMaterials, type UiSpeechReference, type UiSavedCandidate, type TranscriptArtifact, type ThemeArtifact, type ClipCompositionArtifact, type EditPlanArtifact, type Zev2State } from '@zev2/shared';
import { validateArtifactFileRefForKind } from '../artifacts/validation.js';
import { populateDigestUiReview } from './digest-ui-review.js';

export class UiConfirmationConflict extends Error { readonly statusCode = 409; }
const conflict = (message: string): never => { throw new UiConfirmationConflict(message); };
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function newest(state: Zev2State, draftId: string, type: AgentRequest['type']) {
  return state.agentRequests.filter(r => r.requestDraftId === draftId && r.type === type && r.status !== 'superseded')
    .reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
export function registeredUiFile(state: Zev2State, request: AgentRequest): FileRef {
  const file = findById(state.fileRefs, request.result?.fileRefId), output = findById(state.outputs, request.result?.outputId);
  if (request.status !== 'succeeded' || !file || !output || output.id !== file.ownerId || output.fileRefId !== file.id
    || output.type !== getOutputTypeForRequest(request.type) || request.result?.outputType !== output.type
    || file.kind !== getFileRefKindForRequest(request.type) || !request.fileRefIds.includes(file.id)
    || !file.sha256 || file.byteSize <= 0) return conflict('登録済みの処理結果・成果物・保存ファイルが一致しません');
  return file;
}
export async function readRegisteredUiBytes(draftId: string, file: FileRef): Promise<Buffer> {
  const validated = await validateArtifactFileRefForKind(draftId, file.kind, file.uri, file.mimeType);
  if ('error' in validated) return conflict(validated.error);
  const before = await lstat(validated.artifactPath);
  if (!before.isFile() || before.isSymbolicLink()) return conflict('確認資料が通常ファイルではありません');
  let bytes: Buffer, observedHash: string, observedSize: number;
  if (file.mimeType.startsWith('video/')) {
    // Media is verified in a stream; review reads must not buffer a complete source video.
    const digest = createHash('sha256');observedSize = 0;
    for await (const chunk of createReadStream(validated.artifactPath)) { digest.update(chunk);observedSize += chunk.length; }
    observedHash = digest.digest('hex');bytes = Buffer.alloc(0);
  } else {
    bytes = await readFile(validated.artifactPath);observedSize = bytes.length;observedHash = hash(bytes);
  }
  const after = await lstat(validated.artifactPath);
  if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs
    || observedSize !== file.byteSize || observedHash !== file.sha256) return conflict('確認資料のbytesが登録時から変更されています');
  return bytes;
}
export function assertUiExecutionAllowed(config: RuntimeConfig): void {
  if (config.editPlan.mode === 'gemini') conflict('外部AIへの送信・料金の見積もり承認が未接続です。実行を拒否しました');
}
export function assertDraftConfirmation(draft: Parameters<typeof draftConfirmationIdentity>[0], config: RuntimeConfig, input: unknown) {
  const expected = recordValue(input);
  if (expected.draftIdentity !== draftConfirmationIdentity(draft) || expected.runtimeIdentity !== runtimeConfirmationIdentity(config)) {
    conflict('表示した下書き版または実行条件が変更されています。再確認してください');
  }
}
export async function confirmedOutput(state: Zev2State, draftId: string, input: unknown): Promise<FileRef> {
  const expected = recordValue(input), request = newest(state, draftId, 'render_video');
  if (!request) return conflict('表示した完成動画が現在の依頼にありません');
  const file = registeredUiFile(state, request);
  if (file.id !== expected.fileRefId || file.sha256 !== expected.sha256) return conflict('表示した完成動画が変更されています。再確認してください');
  await readRegisteredUiBytes(draftId, file);return file;
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function assertSpeechBindings(ids: number[], units: Array<{id:number;sourceStartMs:number;sourceEndMs:number;text:string}>,
  startMs: number, endMs: number, byId: Map<number,UiSpeechReference>, durationMs: number): void {
  if (endMs > durationMs || new Set(ids).size !== ids.length || units.length !== ids.length
    || new Set(units.map(u=>u.id)).size !== units.length) conflict('区間の長さまたは発話対応の件数が一致しません');
  for (const unit of units) {
    const original=byId.get(unit.id);
    if (!ids.includes(unit.id) || !original || original.text !== unit.text || original.startMs !== unit.sourceStartMs
      || original.endMs !== unit.sourceEndMs || unit.sourceStartMs < startMs || unit.sourceEndMs > endMs) {
      conflict('発話のID・元本文・時計が登録STTと一致しません');
    }
  }
}
function previewJobState(request: AgentRequest): NonNullable<UiSavedCandidate['previewStatus']> {
  if (request.status==='succeeded') return {state:'ready',requestId:request.id};
  if (request.status==='queued' || request.status==='waiting') return {state:'not_created',requestId:request.id};
  if (request.status==='failed') return {state:'failed',requestId:request.id};
  if (request.status==='cancelled' || request.status==='superseded') return {state:'cancelled',requestId:request.id};
  if (request.status==='running' && request.claimOwnerId?.trim() && request.claimedAt
    && Number.isFinite(Date.parse(request.claimedAt)) && Date.parse(request.claimedAt)<=Date.now()
    && request.claimExpiresAt && Date.parse(request.claimExpiresAt)>Date.now()) return {state:'preparing',requestId:request.id};
  return {state:'unknown',requestId:request.id};
}
export async function buildUiReviewMaterials(state: Zev2State, draftId: string, config: RuntimeConfig): Promise<UiReviewMaterials> {
  const draft = findById(state.requestDrafts, draftId);
  if (!draft) return conflict('確認する依頼がありません');
  const review = state.controlReviewItems.filter(r => r.requestDraftId === draftId && r.status === 'review_required')
    .reverse().sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
  const model: UiReviewMaterials = { requestDraftId: draftId, draftIdentity: draftConfirmationIdentity(draft), review,
    fingerprint: '', candidates: [], bindings: [], segments: [], blockers: [] };
  if (draft.productionType === 'digest') {
    await populateDigestUiReview(state, model, config, registeredUiFile);
    model.fingerprint = hash(JSON.stringify([model, runtimeConfirmationIdentity(config)]));
    return model;
  }
  async function read(type: AgentRequest['type']) {
    const producer = newest(state, draftId, type);
    if (!producer) return conflict(`${type}の登録資料がありません`);
    assertApprovedAgentRequestInput(state,producer);
    const file = registeredUiFile(state, producer), bytes = await readRegisteredUiBytes(draftId, file);
    model.bindings.push({ producerId: producer.id, outputId: file.ownerId, fileRefId: file.id, sha256: file.sha256 });
    if (file.mimeType.startsWith('video/')) return { file, value: {} };
    const value = recordValue(JSON.parse(bytes.toString('utf8')));
    if (value.kind !== file.kind) return conflict('資料の種類が登録内容と一致しません');
    assertJsonArtifactForKind(file.kind,value,`${type}の登録資料`);
    return { file, value };
  }
  try {
    const themes = await read('propose_clip_themes'), transcript = await read('run_stt');
    if (themes.value.sourceUri !== draft.source.uri || transcript.value.sourceUri !== draft.source.uri) conflict('候補の元素材が依頼と一致しません');
    const transcriptData=transcript.value as unknown as TranscriptArtifact,themeData=themes.value as unknown as ThemeArtifact;
    const durationMs=transcriptData.durationSec*1000;
    const speeches = transcriptData.segments.map(({id,text,startMs,endMs})=>({id,text,startMs,endMs})), byId = new Map(speeches.map(s => [s.id,s]));
    if (durationMs<=0 || speeches.some(s=>s.endMs>durationMs)) conflict('登録STTの長さと発話時計が一致しません');
    const themeReview = state.controlReviewItems.filter(r => r.requestDraftId === draftId && r.kind === 'theme_selection')
      .reverse().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if (themeReview?.agentRequestId !== newest(state,draftId,'propose_clip_themes')?.id
      || themeReview?.options.length !== themeData.themes.length) conflict('保存候補と確認項目のproducer・件数が一致しません');
    for (const item of themeData.themes) {
      const t = recordValue(item), option = themeReview?.options.find(o => o.id === t.id);
      if (!option || option.title !== item.title) conflict('保存候補と確認対象のID・題名が一致しません');
      const ids = [...new Set([...array(t.representativeSpeechIds), ...array(t.relatedSpeechIds)])];
      if (!ids.length || ids.some(id => !byId.has(id as number))) conflict('保存候補の発話参照が不足しています');
      const refs = ids.map(id => byId.get(id as number)!);
      const candidate: UiSavedCandidate = { id: option!.id, title: option!.title, summary: option!.summary, speeches: refs,
        ranges: refs.map(s => ({startMs:s.startMs,endMs:s.endMs})), previewStatus:{state:'unknown'} };
      // An existing candidate evidence link is required; browsing never creates a job.
      const previewJobs=option!.evidenceRefs.flatMap(ref=>state.agentRequests.filter(r=>r.requestDraftId===draftId && r.type==='render_video'
        && ((ref.kind==='agent_request' && r.id===ref.refId) || (ref.kind==='file_ref' && r.result?.fileRefId===ref.refId))));
      const job=[...new Map(previewJobs.map(r=>[r.id,r])).values()].reverse().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
      if (job) {
        assertApprovedAgentRequestInput(state,job);
        candidate.previewStatus=previewJobState(job);
        if (job.status==='succeeded') {
          const file=registeredUiFile(state,job);await readRegisteredUiBytes(draftId,file);candidate.preview=file;
          model.bindings.push({producerId:job.id,outputId:file.ownerId,fileRefId:file.id,sha256:file.sha256});
        }
      }
      model.candidates.push(candidate);
    }
    if (themes.value.recommendation !== undefined) {
      const rec=recordValue(themes.value.recommendation);
      if (typeof rec.candidateId !== 'string' || !model.candidates.some(c=>c.id===rec.candidateId)
        || typeof rec.reason !== 'string' || !rec.reason.trim()) conflict('登録された推薦ID・根拠が保存候補に対応していません');
      model.recommendation={candidateId:rec.candidateId as string,reason:rec.reason as string,
        producerId:newest(state,draftId,'propose_clip_themes')!.id,fileRefId:themes.file.id,sha256:themes.file.sha256};
    }

    let compositionData: ClipCompositionArtifact | undefined;
    if (review) {
      const producer = findById(state.agentRequests, review.agentRequestId);
      if (!producer || producer.requestDraftId !== draftId || newest(state,draftId,producer.type)?.id !== producer.id
        || getRequiredControlReviewKind(producer) !== review.kind) conflict('確認項目と現在の工程が一致しません');
      const file = registeredUiFile(state,producer!);await readRegisteredUiBytes(draftId,file);
      if (!review.evidenceRefs.some(r=>r.kind==='file_ref' && r.refId===file.id)) conflict('確認項目に登録資料の参照がありません');
      if (review.kind === 'material_confirmation' || review.kind === 'render_readiness') {
        const composition = await read('build_clip_composition');
        if (composition.value.sourceUri !== draft.source.uri) conflict('構成の元素材が依頼と一致しません');
        compositionData=composition.value as unknown as ClipCompositionArtifact;
        if (!themeData.themes.some(t=>t.id===compositionData!.selectedThemeId)) conflict('構成の採用候補IDが登録テーマと一致しません');
        for (const item of compositionData.parts) {
          const part = recordValue(item), ids = array(part.speechIds);
          assertSpeechBindings(item.speechIds,item.speechUnits,item.sourceStartMs,item.sourceEndMs,byId,durationMs);
          if (item.sourceStartMs<compositionData.sourceStartMs || item.sourceEndMs>compositionData.sourceEndMs) conflict('構成全体と断片の区間が一致しません');
          model.segments.push({startMs:part.sourceStartMs as number,endMs:part.sourceEndMs as number,
            caption: typeof part.transcriptText==='string'?part.transcriptText:'',speechIds:ids as number[],displaySummary:'演出の表示枠は準備前'});
        }
        if (!model.segments.length) conflict('構成の断片がありません');
      }
      if (review.kind === 'render_readiness') {
        const edit = await read('create_edit_plan'), patch = await read('apply_adjustment'),source=await read('prepare_video');
        const editData=edit.value as unknown as EditPlanArtifact;
        if ((!source.file.mimeType.startsWith('video/') && source.value.sourceUri !== draft.source.uri)
          || editData.selectedThemeId !== compositionData?.selectedThemeId
          || editData.geminiApiInput.some(i=>i.sourceUri !== draft.source.uri)) conflict('編集案・元動画・構成の素材または採用IDが一致しません');
        if (patch.value.editPlanUri !== edit.file.uri || patch.value.renderReady !== true) conflict('調整結果と編集案の参照・作成条件が一致しません');
        model.segments = editData.renderSegments.map(item => {
          const s = recordValue(item), layout = recordValue(s.screenLayout), ids = array(s.speechIds);
          assertSpeechBindings(item.speechIds,item.speechUnits,item.sourceStartMs,item.sourceEndMs,byId,durationMs);
          if (item.sourceStartMs<editData.sourceStartMs || item.sourceEndMs>editData.sourceEndMs) conflict('編集案全体と断片の区間が一致しません');
          return {startMs:s.sourceStartMs as number,endMs:s.sourceEndMs as number,caption:s.caption as string,
            speechIds:ids as number[],displaySummary:layout.displaySummary as string};
        });
        if (!model.segments.length) conflict('動画作成の断片がありません');
        model.creationChecks={inputValidation:'verified',audioPreservation:'unknown',sourceAudioReference:'unknown',runtimeIdentity:runtimeConfirmationIdentity(config)};
        model.blockers.push('作成前の音声保持指定と元音声参照が登録資料にありません。完成後のQC・人間採用は動画作成後に確認します。');
      }
    }
  } catch (e) { model.blockers.push(e instanceof Error ? e.message : '確認資料を読めません'); }
  model.fingerprint = hash(JSON.stringify([model, runtimeConfirmationIdentity(config)]));
  return model;
}
export async function assertReviewConfirmation(state: Zev2State, reviewId: string, input: unknown, config: RuntimeConfig, approve: boolean) {
  const expected = recordValue(input), review = findById(state.controlReviewItems,reviewId);
  if (!review || expected.reviewId !== review.id || expected.requestDraftId !== review.requestDraftId) conflict('表示した確認項目と依頼が一致しません');
  const model = await buildUiReviewMaterials(state,review!.requestDraftId,config);
  if (model.review?.id !== reviewId || expected.fingerprint !== model.fingerprint) conflict('表示した確認資料が変更されています。再確認してください');
  if (approve && model.blockers.length) conflict(model.blockers.join(' '));
}

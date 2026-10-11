import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, lstat } from 'node:fs/promises';
import { findById, getFileRefKindForRequest, getOutputTypeForRequest, getRequiredControlReviewKind,
  draftConfirmationIdentity, runtimeConfirmationIdentity, recordValue,
  type AgentRequest, type FileRef, type RuntimeConfig, type UiReviewMaterials, type UiSpeechReference, type Zev2State } from '@zev2/shared';
import { validateArtifactFileRefForKind } from '../artifacts/validation.js';

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
function speech(value: unknown): UiSpeechReference {
  const r = recordValue(value);
  if (!Number.isInteger(r.id) || typeof r.text !== 'string' || typeof r.startMs !== 'number' || typeof r.endMs !== 'number'
    || r.startMs < 0 || r.endMs <= r.startMs) return conflict('発話の本文・ID・区間が不足しています');
  return { id: r.id as number, text: r.text, startMs: r.startMs, endMs: r.endMs };
}
export async function buildUiReviewMaterials(state: Zev2State, draftId: string, config: RuntimeConfig): Promise<UiReviewMaterials> {
  const draft = findById(state.requestDrafts, draftId);
  if (!draft) return conflict('確認する依頼がありません');
  const review = state.controlReviewItems.filter(r => r.requestDraftId === draftId && r.status === 'review_required')
    .reverse().sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
  const model: UiReviewMaterials = { requestDraftId: draftId, draftIdentity: draftConfirmationIdentity(draft), review,
    fingerprint: '', candidates: [], bindings: [], segments: [], blockers: [] };
  async function read(type: AgentRequest['type']) {
    const producer = newest(state, draftId, type);
    if (!producer) return conflict(`${type}の登録資料がありません`);
    const file = registeredUiFile(state, producer), bytes = await readRegisteredUiBytes(draftId, file);
    model.bindings.push({ producerId: producer.id, outputId: file.ownerId, fileRefId: file.id, sha256: file.sha256 });
    if (file.mimeType.startsWith('video/')) return { file, value: {} };
    const value = recordValue(JSON.parse(bytes.toString('utf8')));
    if (value.kind !== file.kind) return conflict('資料の種類が登録内容と一致しません');
    return { file, value };
  }
  try {
    const themes = await read('propose_clip_themes'), transcript = await read('run_stt');
    if (themes.value.sourceUri !== draft.source.uri || transcript.value.sourceUri !== draft.source.uri) conflict('候補の元素材が依頼と一致しません');
    const speeches = array(transcript.value.segments).map(speech), byId = new Map(speeches.map(s => [s.id,s]));
    if (!speeches.length || byId.size !== speeches.length) conflict('発話資料が空またはIDが重複しています');
    const themeReview = state.controlReviewItems.filter(r => r.requestDraftId === draftId && r.kind === 'theme_selection')
      .reverse().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    for (const item of array(themes.value.themes)) {
      const t = recordValue(item), option = themeReview?.options.find(o => o.id === t.id);
      if (!option || typeof t.title !== 'string' || typeof t.summary !== 'string' || option.title !== t.title) conflict('保存候補と確認対象のID・題名が一致しません');
      const ids = [...new Set([...array(t.representativeSpeechIds), ...array(t.relatedSpeechIds)])];
      if (!ids.length || ids.some(id => !byId.has(id as number))) conflict('保存候補の発話参照が不足しています');
      const refs = ids.map(id => byId.get(id as number)!);
      const candidate = { id: option!.id, title: option!.title, summary: option!.summary, speeches: refs,
        ranges: refs.map(s => ({startMs:s.startMs,endMs:s.endMs})), preview: undefined as FileRef | undefined };
      // Only an explicit candidate evidence reference can bind a video; never borrow the latest final video.
      for (const ref of option!.evidenceRefs.filter(r => r.kind === 'file_ref')) {
        const producer = state.agentRequests.find(r => r.requestDraftId === draftId && r.result?.fileRefId === ref.refId && r.type === 'render_video');
        if (!producer) continue;
        const file = registeredUiFile(state, producer);await readRegisteredUiBytes(draftId,file);candidate.preview = file;
      }
      model.candidates.push(candidate);
    }
    if (!model.candidates.length || new Set(model.candidates.map(c=>c.id)).size !== model.candidates.length) conflict('保存候補が空またはIDが重複しています');
    if (review) {
      const producer = findById(state.agentRequests, review.agentRequestId);
      if (!producer || producer.requestDraftId !== draftId || newest(state,draftId,producer.type)?.id !== producer.id
        || getRequiredControlReviewKind(producer) !== review.kind) conflict('確認項目と現在の工程が一致しません');
      const file = registeredUiFile(state,producer!);await readRegisteredUiBytes(draftId,file);
      if (!review.evidenceRefs.some(r=>r.kind==='file_ref' && r.refId===file.id)) conflict('確認項目に登録資料の参照がありません');
      if (review.kind === 'material_confirmation' || review.kind === 'render_readiness') {
        const composition = await read('build_clip_composition');
        if (composition.value.sourceUri !== draft.source.uri) conflict('構成の元素材が依頼と一致しません');
        for (const item of array(composition.value.parts)) {
          const part = recordValue(item), ids = array(part.speechIds);
          if (typeof part.sourceStartMs !== 'number' || typeof part.sourceEndMs !== 'number' || part.sourceStartMs < 0
            || part.sourceEndMs <= part.sourceStartMs || !ids.length || ids.some(id=>!byId.has(id as number))) conflict('構成の区間・発話対応が不足しています');
          model.segments.push({startMs:part.sourceStartMs as number,endMs:part.sourceEndMs as number,
            caption: typeof part.transcriptText==='string'?part.transcriptText:'',speechIds:ids as number[],displaySummary:'演出の表示枠は準備前'});
        }
        if (!model.segments.length) conflict('構成の断片がありません');
      }
      if (review.kind === 'render_readiness') {
        const edit = await read('create_edit_plan'), patch = await read('apply_adjustment');await read('prepare_video');
        if (patch.value.editPlanUri !== edit.file.uri || patch.value.renderReady !== true) conflict('調整結果と編集案の参照・作成条件が一致しません');
        model.segments = array(edit.value.renderSegments).map(item => {
          const s = recordValue(item), layout = recordValue(s.screenLayout), ids = array(s.speechIds);
          if (typeof s.sourceStartMs!=='number' || typeof s.sourceEndMs!=='number' || s.sourceStartMs<0 || s.sourceEndMs<=s.sourceStartMs
            || typeof s.caption!=='string' || !ids.length || ids.some(id=>!byId.has(id as number)) || typeof layout.displaySummary!=='string') conflict('演出の区間・字幕・発話・表示枠が不足しています');
          return {startMs:s.sourceStartMs as number,endMs:s.sourceEndMs as number,caption:s.caption as string,
            speechIds:ids as number[],displaySummary:layout.displaySummary as string};
        });
        if (!model.segments.length) conflict('動画作成の断片がありません');
        // Existing PatchArtifact has renderReady, but no retained-audio or formal quality verdict.
        model.blockers.push('元音声保持・品質条件の正式な確認結果が既存資料にありません。動画作成の承認は停止しています。');
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

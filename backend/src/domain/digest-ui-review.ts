import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { readConsumedDigestPlanV001, readPreparedDigestCaptionJudgmentInputsV001,
  type DigestCaptionPreparationParametersV001 } from '@zev2/agent-runner/digest-readonly';
import { assertApprovedAgentRequestInput, assertDigestArtifactV001, digestArtifactFileNameV001,
  digestArtifactPathFromUriV001, digestProducerRequestIdsV001, draftConfirmationIdentity, runtimeConfirmationIdentity,
  type DigestByteBindingV001, type FileRef, type UiReviewMaterials, type RuntimeConfig, type Zev2State } from '@zev2/shared';
import { workspaceRoot } from '../config/runtime-config.js';
import { loadDigestUiPreparations, type DigestUiPreparationRegistration } from '../store/digest-ui-preparations.js';
import { populateDigestRequestedComposition } from './digest-ui-edit-requests.js';

type Obj = Record<string, any>;
const same = (a: unknown, b: unknown) => assert.deepEqual(a, b, '現在の登録資料が保存準備時から変更されています');
const record = (v: unknown): Obj => { assert(v && typeof v === 'object' && !Array.isArray(v), '登録値が不足しています'); return v as Obj; };
function exact(value: unknown, fields: string[]): Obj {
  const v = record(value);assert.deepEqual(Object.keys(v).sort(), fields.sort(), '登録情報の項目が一致しません');return v;
}
function byteBinding(value: unknown): DigestByteBindingV001 {
  const b = exact(value, ['path', 'fileSha256']);
  assert(typeof b.path === 'string' && /^[0-9a-f]{64}$/u.test(b.fileSha256), '登録参照が不正です');
  return { path: b.path, fileSha256: b.fileSha256 };
}
export function digestUiRegistrationInput(draftId: string, input: unknown): DigestUiPreparationRegistration {
  const body = exact(input, ['draftIdentity', 'parameters', 'manifestBinding']);
  const p = exact(body.parameters, ['inputRoot', 'inputPrefix', 'sourceRuntimeRoot', 'outputRoot', 'preparationId',
    'stateBinding', 'scopeBinding', 'styleTemplateBinding', 'expected']);
  for (const name of ['inputRoot', 'inputPrefix', 'sourceRuntimeRoot', 'outputRoot', 'preparationId']) assert(typeof p[name] === 'string' && p[name], '準備情報が不足しています');
  const expected = exact(p.expected, ['requestDraftId', 'planRequestId', 'executionRequestId', 'planSha256', 'executionSha256']);
  assert(expected.requestDraftId === draftId && typeof body.draftIdentity === 'string', '登録対象の依頼が一致しません');
  for (const name of ['planRequestId', 'executionRequestId']) assert(typeof expected[name] === 'string' && expected[name], '現在の処理IDが必要です');
  for (const name of ['planSha256', 'executionSha256']) assert(/^[0-9a-f]{64}$/u.test(expected[name]), '現在の登録SHAが必要です');
  return { requestDraftId: draftId, draftIdentity: body.draftIdentity,
    parameters: { ...p, stateBinding: byteBinding(p.stateBinding), scopeBinding: byteBinding(p.scopeBinding),
      styleTemplateBinding: byteBinding(p.styleTemplateBinding), expected } as DigestUiPreparationRegistration['parameters'],
    manifestBinding: byteBinding(body.manifestBinding), registeredAt: new Date().toISOString() };
}

/** Reuses both normal readers. No provider, preparation writer, job, permit or queue operation. */
export async function qualifyDigestUiPreparation(state: Zev2State, registration: DigestUiPreparationRegistration,
  registeredFile: (state: Zev2State, request: Zev2State['agentRequests'][number]) => FileRef) {
  const p: DigestCaptionPreparationParametersV001 = { ...registration.parameters, workspaceRoot: workspaceRoot() };
  const draft = state.requestDrafts.find(d => d.id === registration.requestDraftId);
  assert(draft?.productionType === 'digest' && draft.status === 'approved'
    && registration.draftIdentity === draftConfirmationIdentity(draft), '表示した依頼・素材・条件が変更されています');
  const requestFor = (type: 'prepare_digest_plan' | 'validate_digest_plan', id: string) => {
    const rows = state.agentRequests.filter(r => r.requestDraftId === draft.id && r.type === type && r.status !== 'superseded')
      .reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    assert(rows[0]?.id === id && rows[0].status === 'succeeded', '現在のDigest計画・実行入力と登録準備が一致しません');
    assertApprovedAgentRequestInput(state, rows[0]);return rows[0];
  };
  const planRequest = requestFor('prepare_digest_plan', p.expected.planRequestId), executionRequest = requestFor('validate_digest_plan', p.expected.executionRequestId);
  assert(p.expected.requestDraftId === draft.id && executionRequest.dependsOnAgentRequestId === planRequest.id, '準備の依頼・依存関係が一致しません');
  const planFile = registeredFile(state, planRequest), executionFile = registeredFile(state, executionRequest);
  assert(planFile.sha256 === p.expected.planSha256 && executionFile.sha256 === p.expected.executionSha256, '同じIDの保存資料のSHAが変更されています');
  const caption = await readPreparedDigestCaptionJudgmentInputsV001(p, registration.manifestBinding);
  const stable = await import(pathToFileURL(path.join(p.workspaceRoot, 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs')).href);
  const read = async (root: string, binding: DigestByteBindingV001): Promise<Buffer> => {
    const bytes: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({ workspaceRoot: root, relativePath: binding.path });
    assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.fileSha256, '登録資料のbytesが変更されています');return bytes;
  };
  const saved: Zev2State = JSON.parse((await read(p.inputRoot, p.stateBinding)).toString());
  same(saved.requestDrafts.filter(d => d.id === draft.id), [draft]);
  const producers = digestProducerRequestIdsV001(state, executionRequest);
  for (const id of producers) {
    const r = state.agentRequests.find(r => r.id === id)!;
    same(saved.agentRequests.filter(r => r.id === id), [r]);
    const f = registeredFile(state, r);
    same(saved.fileRefs.filter(v => v.id === f.id), [f]);
    same(saved.outputs.filter(v => v.id === f.ownerId), state.outputs.filter(v => v.id === f.ownerId));
  }
  const artifactRoot = path.join(p.sourceRuntimeRoot, 'artifacts');
  const physical = (logical: string) => path.relative(p.inputRoot, path.join(artifactRoot, draft.id,
    digestArtifactFileNameV001(logical, draft.id, producers))).split(path.sep).join('/');
  const registeredJson = async (f: FileRef, requestId: string) => {
    const logical = digestArtifactPathFromUriV001(f.uri, draft.id, requestId);
    const bytes = await read(p.inputRoot, { path: physical(logical), fileSha256: f.sha256 });
    assert.equal(bytes.length, f.byteSize, '登録資料のサイズが一致しません');return JSON.parse(bytes.toString());
  };
  const plan = await registeredJson(planFile, planRequest.id), execution = await registeredJson(executionFile, executionRequest.id);
  assertDigestArtifactV001(plan, 'digest_plan_json', { requestDraftId: draft.id, requestId: planRequest.id });
  assertDigestArtifactV001(execution, 'digest_execution_input_json', { requestDraftId: draft.id, requestId: executionRequest.id });
  assert(plan.kind === 'digest_plan_json' && execution.kind === 'digest_execution_input_json', '資料種別が一致しません');
  const consumed = await readConsumedDigestPlanV001({ preparation: { workspaceRoot: p.workspaceRoot, artifactRoot } }, { request: executionRequest, state });
  same(consumed.artifact, execution);assert.equal(consumed.status, 'consumed', '元時計の確認が未完了です');
  const document = async (binding: DigestByteBindingV001) => {
    assert(execution.dataBindings.some(b => b.path === binding.path && b.fileSha256 === binding.fileSha256), '未登録の資料参照です');
    return JSON.parse((await read(p.inputRoot, { path: physical(binding.path), fileSha256: binding.fileSha256 })).toString());
  };
  const transcript = await document(plan.transcriptBinding), preparation = await document(plan.preparationBinding);
  const candidates = await document(preparation.artifacts['candidate-set.json']);
  const selection = await document(preparation.artifacts['selection-adoption.json']);
  const discovery = await document(preparation.artifacts['candidate-response.json']);
  const utterances = await document(plan.utteranceBinding);
  assert(execution.sourceInspectionBinding && execution.clockResolutionBinding, '元時計の登録が不足しています');
  const inspection = await document(execution.sourceInspectionBinding), clock = await document(execution.clockResolutionBinding);
  const sourceAudioReference = inspection.media?.audioClock && Number.isFinite(inspection.media.audioClock.sampleRate)
    && inspection.media.audioClock.sampleRate > 0 && clock.mappings?.length
    && clock.mappings.every((m: Obj) => m.audioSamples && Number.isFinite(m.audioSamples.sourceStart) && Number.isFinite(m.audioSamples.sourceEnd))
    ? 'registered' as const : 'unknown' as const;
  const style = JSON.parse((await read(p.inputRoot, p.styleTemplateBinding)).toString());
  const contexts = style.reconstructionMap?.caseContexts;
  const audioPreservation = Array.isArray(contexts) && contexts.length && contexts.every(c => c?.resolvedStyle?.audioMode === 'preserve-source-only')
    ? 'preserve-source-only' as const : 'unknown' as const;
  // Caption preparation intentionally leaves declared media bytes unqualified; this is input provenance, never output QC.
  return { caption, transcript, candidates, selection, candidateSetBinding: preparation.artifacts['candidate-set.json'] as DigestByteBindingV001,
    selectionAdoptionBinding: preparation.artifacts['selection-adoption.json'] as DigestByteBindingV001,
    discovery, utterances, planFile, executionFile, audioPreservation, sourceAudioReference };
}

export async function populateDigestUiReview(state: Zev2State, model: UiReviewMaterials, config: RuntimeConfig,
  registeredFile: Parameters<typeof qualifyDigestUiPreparation>[2]): Promise<Awaited<ReturnType<typeof qualifyDigestUiPreparation>> | undefined> {
  model.creationChecks = { inputValidation: 'failed', audioPreservation: 'unknown', sourceAudioReference: 'unknown', runtimeIdentity: runtimeConfirmationIdentity(config) };
  try {
    const registration = (await loadDigestUiPreparations()).find(r => r.requestDraftId === model.requestDraftId);
    if (!registration) {
      model.digestPreparation = { status: 'not_registered', message: '保存済みの字幕準備情報が未登録です。作成前の指定は未確認です。' };
      model.blockers.push(model.digestPreparation.message);return;
    }
    const result = await qualifyDigestUiPreparation(state, registration, registeredFile);
    const speeches = result.transcript.segments as Array<{ id: number; text: string; startMs: number; endMs: number }>;
    const byId = new Map(speeches.map(s => [s.id, s]));
    model.segments = result.caption.segments.map(s => ({ startMs: s.sourceStartMs, endMs: s.sourceEndMs, speechIds: s.sourceSegmentIds,
      caption: s.sourceSegmentIds.map(id => { const v = byId.get(id);assert(v, '元本文が不足しています');return v.text; }).join(''),
      displaySummary: '保持済み本文。字幕の表示境界・描画は後続工程で確認します。' }));
    const rows = result.candidates.candidates;
    assert(Array.isArray(rows), '保存候補が不足しています');
    model.candidates = rows.map((c: Obj) => {
      const answer = result.discovery.answer.candidates.find((_: unknown, index: number) => c.candidateId === `candidate-${String(index + 1).padStart(4, '0')}`);
      assert(answer && answer.title === c.title && answer.contextStartUtteranceId === c.contextStartUtteranceId
        && answer.contextEndUtteranceId === c.contextEndUtteranceId && typeof answer.reason === 'string', '保存候補の要約参照が一致しません');
      const units: Obj[] = result.utterances.utterances;
      const start = units.findIndex(u => u.utteranceId === c.contextStartUtteranceId), end = units.findIndex(u => u.utteranceId === c.contextEndUtteranceId);
      assert(start >= 0 && end >= start, '保存候補の発話区間がありません');
      const ids: number[] = units.slice(start, end + 1).flatMap(u => u.sourceSegmentIds);
      assert(ids.length && ids.every(id => byId.has(id)), '保存候補と元本文が一致しません');
      const refs = ids.map(id => byId.get(id)!);
      return { id: c.candidateId, title: c.title, summary: answer.reason, speeches: refs,
        ranges: refs.map(s => ({ startMs: s.startMs, endMs: s.endMs })), previewStatus: { state: 'unknown' as const } };
    });
    for (const f of [result.planFile, result.executionFile]) model.bindings.push({ producerId: state.agentRequests.find(r => r.result?.fileRefId === f.id)!.id,
      outputId: f.ownerId, fileRefId: f.id, sha256: f.sha256 });
    model.creationChecks = { ...model.creationChecks, inputValidation: 'verified', audioPreservation: result.audioPreservation, sourceAudioReference: result.sourceAudioReference };
    model.digestPreparation = { status: 'verified', message: '現在の計画・実行入力・保存字幕準備を再照合しました。' };
    const basisReferences = { candidateSetBinding: { path: result.candidateSetBinding.path, fileSha256: result.candidateSetBinding.fileSha256 },
      selectionAdoptionBinding: { path: result.selectionAdoptionBinding.path, fileSha256: result.selectionAdoptionBinding.fileSha256 },
      captionManifestBinding: registration.manifestBinding, producerBindings: model.bindings };
    await populateDigestRequestedComposition(model, {
      identity: createHash('sha256').update(JSON.stringify([model.requestDraftId, model.draftIdentity, basisReferences])).digest('hex'), ...basisReferences
    }, result.selection.adoptedCandidates.map((c: Obj) => c.candidateId),
    model.segments.reduce((total, s) => total + s.endMs - s.startMs, 0));
    if (result.audioPreservation === 'unknown') model.blockers.push('元の音声を保持する指定が保存資料で確認できません。');
    if (result.sourceAudioReference === 'unknown') model.blockers.push('元音声の参照と入力時計が保存資料で確認できません。');
    model.blockers.push('動画作成の承認・製造経路は未接続です。完成動画の実媒体検査と人間の採用判断は未実施です。');
    return result;
  } catch (e) {
    model.candidates = [];model.segments = [];model.bindings = [];delete model.digestComposition;
    model.creationChecks = { ...model.creationChecks, inputValidation: 'failed', audioPreservation: 'unknown', sourceAudioReference: 'unknown' };
    model.digestPreparation = { status: 'rejected', message: '保存準備と現在の依頼の対応を確認できません。再登録が必要です。' };
    model.blockers.push(`${model.digestPreparation.message} ${e instanceof Error ? e.message : ''}`);
  }
}

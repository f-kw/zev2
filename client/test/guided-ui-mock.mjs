// Isolated local UI QA. Every /api request is intercepted; no production backend or provider is contacted.
// Run: node client/test/guided-ui-mock.mjs   (127.0.0.1:5179)
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const require = createRequire(root + '/client/package.json');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const shared = await import(pathToFileURL(root + '/packages/shared/dist/index.js'));
let state = shared.createInitialState(), sequence = 0;
const calls = [];
let digestAdditionIds = [];
const digestCompositions = new Map(), digestConfirmationRequests = new Map();
let digestConfirmationMode = 'normal';
let digestSavedRevision = null, digestRevisionMode = 'verified';
const config = { stt: { mode: 'fixed', localServerUrl: '', language: 'ja' }, contentDiscovery: { mode: 'fixed' },
  editPlan: { mode: 'fixed' }, adjustment: { mode: 'fixed' }, videoOutput: { encoder: 'libx264', extraArgs: [] },
  agentClaim: { ttlMilliseconds: 60000 }, artifactDelivery: { mode: 'local' },
  source: { defaultUri: 'file:///saved/mock-conversation.mp4', defaultPurpose: '会話の見どころをまとめる' } };
const now = () => new Date().toISOString();
const themes = [
  { id: 'opening', title: '話のきっかけ', summary: '何の話かが伝わる場面' },
  { id: 'turn', title: '考え方が変わったところ', summary: '会話が動く場面' },
  { id: 'ending', title: '最後のまとめ', summary: '結論が伝わる短い場面' }
].map((t, i) => ({ ...t, evidenceRefs: [{ kind: 'time_range', refId: 'range-' + i, meaning: '保存済み素材の場面' }] }));
const mockCandidates = () => themes.map((t,i)=>({...t,previewStatus:{state:'unknown'},speeches:[{id:i+1,text:t.summary,startMs:i*1000,endMs:(i+1)*1000}],ranges:[{startMs:i*1000,endMs:(i+1)*1000}]}));
function digestMockMaterials(draft) {
  const candidates=mockCandidates(),requested=themes.filter(t=>t.id==='opening'||digestAdditionIds.includes(t.id)).map(t=>t.id);
  const m={requestDraftId:draft.id,draftIdentity:shared.draftConfirmationIdentity(draft),fingerprint:'mock-digest-'+JSON.stringify([draft,digestAdditionIds]),candidates,bindings:[],
    digestPreparation:{status:'verified',message:'人工UI入力：現在の計画・実行入力・保存字幕準備を再照合しました。'},
    digestComposition:{basis:{identity:'a'.repeat(64),candidateSetBinding:{path:'artificial/candidates.json',fileSha256:'a'.repeat(64)},selectionAdoptionBinding:{path:'artificial/selection.json',fileSha256:'b'.repeat(64)},captionManifestBinding:{path:'artificial/manifest.json',fileSha256:'c'.repeat(64)},producerBindings:[]},
      status:digestAdditionIds.length?'revision_requested':'current',currentCandidateIds:['opening'],requestedCandidateIds:requested,addedCandidateIds:[...digestAdditionIds],
      currentDurationMs:1000,addedContextDurationMs:digestAdditionIds.length*1000,contextTotalUpperBoundMs:1000+digestAdditionIds.length*1000,editRequestIds:digestAdditionIds.map(id=>'mock-edit-'+id)},
    creationChecks:{inputValidation:digestAdditionIds.length?'failed':'verified',audioPreservation:'preserve-source-only',sourceAudioReference:'registered',runtimeIdentity:JSON.stringify(config)},
    segments:[{startMs:0,endMs:1000,caption:'人工入力の元本文',speechIds:[1],displaySummary:'保持済み本文。字幕の表示境界・描画は後続工程で確認します。'}],
    blockers:[...(digestAdditionIds.length?['場面追加の編集要求を保存しました。変更後の正式な新版準備・再照合は未接続です。旧準備では作成前確認へ進めません。',
      ...themes.filter(t=>digestAdditionIds.includes(t.id)).map(t=>`追加場面「${t.title}」の確認は未回答です。`)]:[]),'動画作成の承認・製造経路は未接続です。完成動画の実媒体検査と人間の採用判断は未実施です。']};
  if(digestSavedRevision) {
    const valid=digestRevisionMode==='verified'&&digestSavedRevision.fingerprint===m.fingerprint;
    m.digestRevision=valid?structuredClone(digestSavedRevision):{...structuredClone(digestSavedRevision),status:'rejected',
      message:'保存した新版資料は現在の依頼・構成に対応していません。反映済みとは扱えません。',representedEditRequestIds:[],candidateIds:[],appliedEdits:[],segments:[],remainingChecks:[...m.blockers]};
  }
  return m;
}
function digestMockComposition(m) {
  // Synthetic API view only, not a production request hash or formal qualification proof.
  const {digestRevision,...baseline}=m;
  const hash=createHash('sha256').update(JSON.stringify(baseline)).digest('hex'),snapshotBinding={path:`artifacts/${m.requestDraftId}/ui-composition-${hash}--snapshot.json`,fileSha256:hash};
  return {status:'composition-data-only',requestDraftId:m.requestDraftId,requestHash:hash,snapshotBinding,
    compositionBinding:{path:`artifacts/${m.requestDraftId}/ui-composition-${hash}--composition.json`,fileSha256:'d'.repeat(64)},representedEditRequestIds:m.digestComposition.editRequestIds,
    composition:{schemaVersion:'ui-digest-human-composition-data-v001',status:'composition-data-only',requestDraftId:m.requestDraftId,draftIdentity:m.draftIdentity,requestHash:hash,
      snapshotBinding,representedEditRequestIds:m.digestComposition.editRequestIds,beforeCandidateIds:m.digestComposition.currentCandidateIds,
      requestedCandidateIds:m.digestComposition.requestedCandidateIds,originalAiSelectionBinding:m.digestComposition.basis.selectionAdoptionBinding,
      scenes:m.digestComposition.requestedCandidateIds.map(candidateId=>({candidateId}))}};
}
function draftCopy(purpose = config.source.defaultPurpose, productionType = 'clip') {
  const draft = shared.createRequestDraft({ productionType, purpose, sourceUri: config.source.defaultUri,
    durationLabel: '60秒以内', themeCountLabel: '3候補', geminiModelName: shared.DEFAULT_GEMINI_MODEL,
    preset: 'shorts_default' }, now(), () => 'draft-' + (++sequence));
  draft.status = 'approved';state.requestDrafts.unshift(draft);return draft;
}
function registeredResult(draft, type) {
  const id = 'request-' + (++sequence), outputId = 'out-' + sequence, fileId = 'file-' + sequence;
  const file = { id: fileId, kind: shared.getFileRefKindForRequest(type), ownerId: outputId,
    uri: type === 'render_video' ? '/api/mock-video-' + sequence + '.mp4' : '/api/mock/' + fileId,
    mimeType: type === 'render_video' ? 'video/mp4' : 'application/json', access: 'internal', artifactFileName: fileId,
    byteSize: 1234, sha256: 'a'.repeat(64), createdAt: now() };
  const output = { id: outputId, type: shared.getOutputTypeForRequest(type), meaning: 'mock登録（実媒体ではない）', fileRefId: file.id };
  const request = { id, requestDraftId: draft.id, type, label: type === 'render_video' ? '動画生成' : '保存済み内容確認',
    status: 'succeeded', fileRefIds: [file.id], result: { fileRefId: file.id, outputId, outputType: output.type },
    createdAt: now(), updatedAt: now() };
  state.agentRequests.push(request);state.fileRefs.push(file);state.outputs.push(output);return { request, file };
}
function seedReview(draft, kind = 'theme_selection') {
  const { request, file } = registeredResult(draft, kind === 'render_readiness' ? 'apply_adjustment' : 'propose_clip_themes');
  state.controlReviewItems.push({ id: 'review-' + sequence, requestDraftId: draft.id, agentRequestId: request.id,
    kind, status: 'review_required', title: kind === 'render_readiness' ? '作成前確認' : '内容確認', summary: '保存済みの案を確認して進めます',
    reason: '人間による内容確認', humanQuestion: '保存済みの内容を確認', options: kind === 'render_readiness' ? [] : structuredClone(themes),
    evidenceRefs: [{ kind: 'file_ref', refId: file.id, meaning: '保存済み資料' }], decisionLogId: 'decision-' + sequence,
    proposedNextState: 'review_required', createdAt: now(), updatedAt: now() });
}
function seedQueue(draft) {
  const requests = shared.createAgentRequestsFromDraft(draft, now(), () => 'queued-' + (++sequence));
  state.agentRequests.push(...requests);return requests;
}
seedReview(draftCopy());
function seedScenario(scenario) {
        let draft = state.requestDrafts[0];
        state.controlReviewItems.forEach(r => { if (r.status === 'review_required') r.status = 'approved'; });
        if (scenario === 'digest-precreation' || scenario === 'digest-reflected') {
          digestAdditionIds=[];
          digestSavedRevision=null;digestRevisionMode='verified';
          digestCompositions.clear();digestConfirmationRequests.clear();digestConfirmationMode='normal';
          state = shared.createInitialState();draft = draftCopy('人工Digestの保存資料確認', 'digest');
          const requests=seedQueue(draft);requests.forEach(r=>r.status='succeeded');
          if(scenario==='digest-reflected') {
            digestAdditionIds=['turn'];const m=digestMockMaterials(draft),c=m.digestComposition;
            digestSavedRevision={status:'verified',message:'保存した追加要求を、現在の新版準備資料への反映として再照合しました。',
              requestDraftId:m.requestDraftId,draftIdentity:m.draftIdentity,fingerprint:m.fingerprint,requestHash:digestMockComposition(m).requestHash,preparationHash:'f'.repeat(64),
              representedEditRequestIds:[...c.editRequestIds],candidateIds:[...c.requestedCandidateIds],
              appliedEdits:c.addedCandidateIds.map(id=>({id:'mock-edit-'+id,candidateId:id,title:themes.find(t=>t.id===id).title})),
              segments:m.candidates.filter(t=>c.requestedCandidateIds.includes(t.id)).map(t=>({startMs:t.speeches[0].startMs,endMs:t.speeches[0].endMs,
                speechIds:[t.speeches[0].id],caption:t.speeches[0].text,displaySummary:'追加後の保持本文。字幕の表示判断と描画はまだです。'})),durationMs:2000,
              remainingChecks:['動画作成の承認・製造経路は未接続です。完成動画の実媒体検査と人間の採用判断は未実施です。','追加後の字幕の表示判断は未回答です。動画作成は始めません。'],
              admission:{captionDisplayAnswers:'unanswered',executionPermission:'not-approved',humanQuality:'pending'}};
          }
        }
        if (scenario === 'output') registeredResult(draft, 'render_video');
        if (scenario === 'readiness') seedReview(draft, 'render_readiness');
        if (scenario === 'failure') {
          draft = draftCopy('失敗からの復帰');const queue = seedQueue(draft);queue[0].status = 'failed';
          queue[0].errorMessage = 'mockの失敗。元素材は保持されています。';
        }
        if (scenario === 'waiting' || scenario === 'mixed-waiting') {
          state = shared.createInitialState();draft = draftCopy('待機中の依頼');seedQueue(draft);
          if (scenario === 'mixed-waiting') { const other = draftCopy('別の実行対象');seedQueue(other);state.requestDrafts.reverse(); }
        }
        if (scenario === 'registered-metadata') {
          seedReview(draft);
          const queued=registeredResult(draft,'render_video').request;queued.status='queued';queued.fileRefIds=[];delete queued.result;
          const running=registeredResult(draft,'render_video').request;running.status='running';running.claimOwnerId='isolated-preview-worker';running.claimedAt=now();running.fileRefIds=[];delete running.result;
          const review=state.controlReviewItems.at(-1);review.options[1].evidenceRefs.push({kind:'agent_request',refId:queued.id,meaning:'保存済みの候補作業'});
          review.options[2].evidenceRefs.push({kind:'agent_request',refId:running.id,meaning:'実行取得中の候補作業'});
        }
        if (scenario === 'new-version') { draft = draftCopy('新しい保存版');seedReview(draft); }
        if (scenario === 'fee') { state = shared.createInitialState();config.editPlan.mode = 'gemini'; }
}
if (process.env.ZEV_UI_QA_SCENARIO) seedScenario(process.env.ZEV_UI_QA_SCENARIO);
const server = await createServer({ root: root + '/client', configFile: root + '/client/vite.config.ts',
  server: { host: '127.0.0.1', port: 5179, strictPort: true }, plugins: [{ name: 'isolated-ui-mock', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/') && !req.url.startsWith('/__qa/')) return next();
      res.setHeader('content-type', 'application/json');
      const url = new URL(req.url, 'http://127.0.0.1:5179');let body = '';
      for await (const chunk of req) body += chunk;
      const data = body ? JSON.parse(body) : {};
      if (req.method !== 'GET' || url.pathname.startsWith('/__qa/') || /\/ui-digest-(composition-data|additional-retention-inputs)\//u.test(url.pathname)) {
        calls.push({ method: req.method, path: url.pathname, body: data });
        if (process.env.ZEV_UI_QA_LOG) writeFileSync(process.env.ZEV_UI_QA_LOG, JSON.stringify(calls, null, 2));
      }
      const send = x => res.end(JSON.stringify(x));
      if (url.pathname === '/__qa/scenario') {
        seedScenario(url.searchParams.get('name'));
        return send({ state, calls });
      }
      if (url.pathname === '/__qa/calls') return send({ calls, state });
      if (url.pathname === '/__qa/digest-revision') {
        digestRevisionMode=url.searchParams.get('mode')||'verified';return send({mode:digestRevisionMode,calls});
      }
      if (url.pathname === '/__qa/digest-confirmation') {
        digestConfirmationMode=url.searchParams.get('mode')||'normal';
        if (url.searchParams.get('add')==='ending'&&!digestAdditionIds.includes('ending')) digestAdditionIds.push('ending');
        return send({mode:digestConfirmationMode,calls});
      }
      if (url.pathname === '/api/human-auth/status') return send({ required: false, authenticated: true });
      if (url.pathname === '/api/runtime-config') return send(config);
      if (url.pathname === '/api/workflow') return send({ steps: shared.WORKFLOW_STEPS });
      if (url.pathname === '/api/state') return send(state);
      if (url.pathname.endsWith('/ui-review')) {
        const id=url.pathname.split('/')[3], draft=state.requestDrafts.find(d=>d.id===id);
        const review=state.controlReviewItems.filter(r=>r.requestDraftId===id&&r.status==='review_required').at(-1);
        const candidates=mockCandidates();
        if (draft?.productionType==='digest' && ['digest-precreation','digest-reflected'].includes(process.env.ZEV_UI_QA_SCENARIO)) return send(digestMockMaterials(draft));
        if (process.env.ZEV_UI_QA_SCENARIO==='registered-metadata') {
          for (const candidate of candidates) {
            const option=review?.options.find(o=>o.id===candidate.id),ref=option?.evidenceRefs.find(r=>r.kind==='agent_request');
            const job=state.agentRequests.find(r=>r.id===ref?.refId);
            if (job) candidate.previewStatus={state:job.status==='running'?'preparing':'not_created',requestId:job.id};
          }
        }
        return send({requestDraftId:id,draftIdentity:shared.draftConfirmationIdentity(draft),review,fingerprint:'mock-'+review?.id,candidates,bindings:[],
          recommendation:process.env.ZEV_UI_QA_SCENARIO==='registered-metadata'?{candidateId:'turn',reason:'保存資料にある推薦理由',producerId:review.agentRequestId,fileRefId:'fixture-themes',sha256:'a'.repeat(64)}:undefined,
          creationChecks:review?.kind==='render_readiness'?{inputValidation:'verified',audioPreservation:'unknown',sourceAudioReference:'unknown',runtimeIdentity:JSON.stringify(config)}:undefined,
          segments:review?.kind==='render_readiness'?[{startMs:1000,endMs:2000,caption:'保存済みの字幕',speechIds:[1],displaySummary:'話者を表示'}]:[],
          blockers:review?.kind==='render_readiness'?['作成前の音声保持指定と元音声参照が登録資料にありません。完成後のQC・人間採用は動画作成後に確認します。']:[]});
      }
      if (url.pathname === '/api/request-drafts' && req.method === 'POST') {
        const draft = shared.createRequestDraft(data, now(), () => 'draft-' + (++sequence));state.requestDrafts.unshift(draft);return send({ draft, state });
      }
      const draft = state.requestDrafts.find(d => d.id === url.pathname.split('/')[3]);
      if (/\/ui-digest-(composition-data|additional-retention-inputs)(\/|$)/u.test(url.pathname)) {
        const m=draft?.productionType==='digest'?digestMockMaterials(draft):null;
        if (!m || m.digestComposition.status!=='revision_requested') {res.statusCode=409;return send({error:'現在の追加場面の資料がありません。'});}
        const c=digestMockComposition(m),readHash=url.pathname.split('/')[5],isComposition=url.pathname.includes('/ui-digest-composition-data');
        if (req.method==='GET') {
          const saved=(isComposition?digestCompositions:digestConfirmationRequests).get(readHash);
          if (!saved || readHash!==c.requestHash || digestConfirmationMode==='missing') {res.statusCode=409;return send({error:'保存済みの発話資料が不足、または保存版が変わっています。資料を再読み込みしてください。'});}
          return send(digestConfirmationMode==='stale'?{...saved,requestHash:'0'.repeat(64)}:saved);
        }
        if (req.method!=='POST'||data.draftIdentity!==m.draftIdentity||data.fingerprint!==m.fingerprint
          ||Object.keys(data).length!==(isComposition?2:3)) {res.statusCode=409;return send({error:'現在の依頼・追加場面を再確認してください。'});}
        if (isComposition) {digestCompositions.set(c.requestHash,c);return send(c);}
        if (data.requestHash!==c.requestHash||!digestCompositions.has(c.requestHash)||digestConfirmationMode==='missing') {res.statusCode=409;return send({error:'保存済みの発話資料が不足しています。確認要求は未準備です。'});}
        const result={status:'awaiting-retention-answers',requestDraftId:draft.id,requestHash:c.requestHash,preparationHash:'e'.repeat(64),
          pendingCandidates:m.digestComposition.addedCandidateIds.map(id=>({candidateId:id,title:themes.find(t=>t.id===id).title,answerStatus:'unanswered'})),
          message:'人工mockの未回答要求。AI処理なし。',admission:{retentionIntegration:'not-prepared',captionPreparation:'not-prepared',executionPermission:'not-approved',humanQuality:'pending'}};
        digestConfirmationRequests.set(c.requestHash,result);
        if (process.env.ZEV_UI_QA_RETENTION_DELAY_MS) await new Promise(r=>setTimeout(r,Number(process.env.ZEV_UI_QA_RETENTION_DELAY_MS)));
        return send(result);
      }
      if (url.pathname.endsWith('/ui-digest-scene-additions')) {
        const m=draft?.productionType==='digest'?digestMockMaterials(draft):null;
        if (!m || data.draftIdentity!==m.draftIdentity || data.fingerprint!==m.fingerprint || !themes.some(t=>t.id===data.candidateId)) {res.statusCode=409;return send({error:'現在の構成を再確認してください'});}
        const changed=!m.digestComposition.requestedCandidateIds.includes(data.candidateId);
        if (changed) digestAdditionIds.push(data.candidateId);
        return send({changed,materials:digestMockMaterials(draft)});
      }
      if (url.pathname.endsWith('/approve') && draft) { draft.status = 'approved';draft.updatedAt = now();seedReview(draft);return send({ state }); }
      if (url.pathname.startsWith('/api/control-reviews/') && url.pathname.endsWith('/approve')) {
        const review = state.controlReviewItems.find(r => r.id === url.pathname.split('/')[3]);review.status = 'approved';
        seedReview(state.requestDrafts.find(d => d.id === review.requestDraftId), 'render_readiness');return send({ state });
      }
      if (url.pathname.endsWith('/activity')) return send({ requestDraftId: draft?.id,
        summary: { title: 'mock操作検証', detail: '実動画・AI処理なし', nextAction: '保存済み内容を確認' }, events: [] });
      if (url.pathname.endsWith('/web-gemini-review')) return send({ review: null, revisionBrief: null, runLog: null, preparedPromptText: '', outputVideoUri: '' });
      if (url.pathname.endsWith('/final-review')) {
        const request = state.agentRequests.filter(r => r.requestDraftId === draft.id && r.type === 'render_video').at(-1);
        const file = state.fileRefs.find(f => f.id === request.result.fileRefId);
        state.finalReviewActions.push({ id: 'final-' + (++sequence), requestDraftId: draft.id, action: data.action,
          reason: '人間確認（mock）', outputVideoUri: file.uri, createdAt: now() });return send({ state });
      }
      if (url.pathname.endsWith('/request-generated-video-changes')) {
        const copy = draftCopy(draft.purpose + '\n修正: ' + data.reason);seedReview(copy);return send({ draft: copy, state });
      }
      if (url.pathname.endsWith('/retry')) {
        const failed = state.agentRequests.find(r => r.id === url.pathname.split('/')[3]);
        const target = state.requestDrafts.find(d => d.id === failed.requestDraftId);
        const copy = draftCopy(target.purpose + '（再試行コピー）');
        seedReview(copy);return send({ draft: copy, state });
      }
      if (url.pathname.endsWith('/cancel-agent-work')) {
        state.agentRequests.filter(r => r.requestDraftId === draft.id && ['running', 'queued', 'waiting'].includes(r.status)).forEach(r => r.status = 'cancelled');
        return send({ draft, state });
      }
      if (url.pathname === '/api/agent-requests/resume') {
        let scope;
        try { scope = shared.assertAgentExecutionScope(state,data.scope);shared.assertExecutionRuntime(scope,config); }
        catch(e) { res.statusCode=409;return send({error:e.message}); }
        const ready = shared.findReadyAgentRequest({...state,agentRequests:state.agentRequests.filter(r=>r.requestDraftId===scope.requestDraftId)});
        const target = state.requestDrafts.find(d => d.id === ready?.requestDraftId);
        if (!target) {res.statusCode=409;return send({error:'mock: 再開できる対象がありません'});}
        state.agentRequests.filter(r => r.requestDraftId === target.id).forEach(r => r.status = 'superseded');seedReview(target);return send({ state });
      }
      res.statusCode = 404;return send({ error: 'isolated mock: endpoint unavailable (no real media)' });
    });
  } }] });
await server.listen();console.log('Isolated UI mock ready http://127.0.0.1:5179');

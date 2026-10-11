// Isolated local UI QA. Every /api request is intercepted; no production backend or provider is contacted.
// Run: node client/test/guided-ui-mock.mjs   (127.0.0.1:5179)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const require = createRequire(root + '/client/package.json');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const shared = await import(pathToFileURL(root + '/packages/shared/dist/index.js'));
let state = shared.createInitialState(), sequence = 0;
const calls = [];
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
function draftCopy(purpose = config.source.defaultPurpose) {
  const draft = shared.createRequestDraft({ productionType: 'clip', purpose, sourceUri: config.source.defaultUri,
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
const server = await createServer({ root: root + '/client', configFile: root + '/client/vite.config.ts',
  server: { host: '127.0.0.1', port: 5179, strictPort: true }, plugins: [{ name: 'isolated-ui-mock', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/') && !req.url.startsWith('/__qa/')) return next();
      res.setHeader('content-type', 'application/json');
      const url = new URL(req.url, 'http://127.0.0.1:5179');let body = '';
      for await (const chunk of req) body += chunk;
      const data = body ? JSON.parse(body) : {};
      if (req.method !== 'GET' || url.pathname.startsWith('/__qa/')) {
        calls.push({ method: req.method, path: url.pathname, body: data });
        if (process.env.ZEV_UI_QA_LOG) writeFileSync(process.env.ZEV_UI_QA_LOG, JSON.stringify(calls, null, 2));
      }
      const send = x => res.end(JSON.stringify(x));
      if (url.pathname === '/__qa/scenario') {
        const scenario = url.searchParams.get('name');let draft = state.requestDrafts[0];
        state.controlReviewItems.forEach(r => { if (r.status === 'review_required') r.status = 'approved'; });
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
        if (scenario === 'new-version') { draft = draftCopy('新しい保存版');seedReview(draft); }
        if (scenario === 'fee') { state = shared.createInitialState();config.editPlan.mode = 'gemini'; }
        return send({ state, calls });
      }
      if (url.pathname === '/__qa/calls') return send({ calls, state });
      if (url.pathname === '/api/human-auth/status') return send({ required: false, authenticated: true });
      if (url.pathname === '/api/runtime-config') return send(config);
      if (url.pathname === '/api/workflow') return send({ steps: shared.WORKFLOW_STEPS });
      if (url.pathname === '/api/state') return send(state);
      if (url.pathname === '/api/request-drafts' && req.method === 'POST') {
        const draft = shared.createRequestDraft(data, now(), () => 'draft-' + (++sequence));state.requestDrafts.unshift(draft);return send({ draft, state });
      }
      const draft = state.requestDrafts.find(d => d.id === url.pathname.split('/')[3]);
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
        const ready = shared.findReadyAgentRequest(state), target = state.requestDrafts.find(d => d.id === ready.requestDraftId);
        state.agentRequests.filter(r => r.requestDraftId === target.id).forEach(r => r.status = 'superseded');seedReview(target);return send({ state });
      }
      res.statusCode = 404;return send({ error: 'isolated mock: endpoint unavailable (no real media)' });
    });
  } }] });
await server.listen();console.log('Isolated UI mock ready http://127.0.0.1:5179');

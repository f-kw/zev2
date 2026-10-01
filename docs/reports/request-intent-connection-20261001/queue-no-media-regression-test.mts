import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, readdir, stat, appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn, type ChildProcess} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  assertApprovedAgentRequestInput, getRequiredControlReviewKind, isAgentRequestReady,
  getFileRefKindForRequest, recordValue,
  type Zev2State, type RequestDraftInput, type RequestDraft, type AgentRequest,
  type AgentRequestType, type FileRefKind, type ControlReviewKind, type ControlReviewItem,
} from '../../../packages/shared/dist/index.js';

// Only the explicit no-media entry, its isolated backend, and its state reader exist here.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const script = fileURLToPath(import.meta.url);
const report = path.join(root, 'docs/reports/request-intent-connection-20261001');
const runtime = path.join(root, 'runtime/artifacts/request-intent-no-media-regression-20261001-v001-attempt-002');
const evidencePath = path.join(report, 'queue-no-media-regression-evidence-attempt-002.json');
const loader = path.join(root, 'runner/node_modules/tsx/dist/loader.mjs');
const sourceUri = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4');
const mode = process.argv[2];
assert(['no-media', 'backend', 'read-state'].includes(mode ?? ''), '媒体なし専用入口を明示してください');
const relative = (p: string) => path.relative(root, p).split(path.sep).join('/');
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const env = () => ({...process.env, ZEV2_RUNTIME_DIR: runtime, ZEV2_DISABLE_AUTO_RUNNER: '1',
  ZEV2_HUMAN_API_TOKEN: 'isolated-human', ZEV2_AGENT_API_TOKEN: 'isolated-agent',
  GEMINI_API_KEY: '', GOOGLE_API_KEY: '', GOOGLE_CLOUD_PROJECT: ''});
const child = (args: string[]) => spawn(process.execPath, ['--import', loader, script, ...args],
  {cwd: root, env: env(), stdio: ['ignore', 'pipe', 'pipe']});
async function collect(p: ChildProcess) {
  let stdout = '', stderr = '';
  p.stdout?.on('data', b => stdout += b);
  p.stderr?.on('data', b => stderr += b);
  const exit = await new Promise<{exitCode: number | null; signal: string | null}>((resolve, reject) => {
    p.once('error', reject); p.once('close', (exitCode, signal) => resolve({exitCode, signal}));
  });
  return {...exit, stdout, stderr};
}
if (mode === 'backend') {
  assert.equal(process.env.ZEV2_RUNTIME_DIR, runtime);
  assert.equal(process.env.ZEV2_DISABLE_AUTO_RUNNER, '1');
  const {default: express} = await import('../../../backend/node_modules/express/index.js');
  const {default: control} = await import('../../../backend/src/routes/control.ts');
  const app = express(); app.use(express.json()); app.use('/api', control);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {server.once('listening', resolve); server.once('error', reject);});
  const address = server.address(); assert(address && typeof address !== 'string');
  console.log(JSON.stringify({port: address.port}));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} else if (mode === 'read-state') {
  assert.equal(process.env.ZEV2_RUNTIME_DIR, runtime);
  const before = await readFile(path.join(runtime, 'state.json'));
  const expected: Zev2State = JSON.parse(await readFile(path.join(runtime, 'api-final-state.json'), 'utf8'));
  const {loadState, readStateSnapshot} = await import('../../../backend/src/store/json-store.ts');
  const actual = await loadState();
  assert.deepEqual(actual, expected);
  assert.deepEqual(await readStateSnapshot(), expected);
  assert.deepEqual(await readFile(path.join(runtime, 'state.json')), before);
  assert.equal(actual.agentRequests.filter(r => r.status === 'running').length, 2);
  assert.equal(actual.agentRequests.filter(r => r.status === 'waiting').length, 9);
  assert.equal(actual.agentRequests.filter(r => r.status === 'succeeded').length, 0);
  for (const field of ['fileRefs', 'outputs', 'controlReviewItems', 'humanReviewActions', 'finalReviewActions'] as const)
    assert.equal(actual[field].length, 0);
  console.log(JSON.stringify({status: 'passed', stateSha256: sha(before), stateBytes: before.length,
    drafts: actual.requestDrafts.length, requests: actual.agentRequests.length, running: 2, waiting: 9,
    succeeded: 0, fileRefs: 0, outputs: 0, stateBytesUnchanged: true, actualStoreReader: 'loadState/readStateSnapshot'}));
} else {
  assert.equal(mode, 'no-media');
  await mkdir(runtime); // Existing attempts are never overwritten.
  const results: Array<{name: string; category: string; status: string; details: Record<string, unknown>}> = [];
  const apiCalls: Array<Record<string, unknown>> = [];
  const evidence: Record<string, unknown> = {schemaVersion: 'request-intent-no-media-regression-evidence-v001',
    status: 'in-progress', receivedHead: '5cb6c94c213390abefc187ce0553c8bcd2f9aab3', session: 'Codex2',
    modelMetadata: 'gpt-6.1-sol', productFixes: 5, setupFixes: 8,
    setup7: '先行承認済みの媒体なし入口分離。新test一経路のみ、一般上限・履歴不変',
    setup8: '正本§6の相談役個別承認。3fixtureの対象下書きを命令の依頼IDで選択、製品・期待値・一般上限・履歴不変',
    attempt: 'attempt-002', previousFailureEvidence: 'queue-no-media-regression-evidence-v001.json',
    previousTestCommit: 'b47999f7398118b1ef53b68b5b95a7ea922e7779', testFileSha256: sha(await readFile(script)),
    runtime: relative(runtime), runtimeBytesBefore: 0, results, apiCalls,
    memoryFixturesPersistedToStore: false, automaticRunnerDisabled: true,
    mediaRead: false, mediaHash: false, mediaCopy: false, mediaPut: false,
    sourceSttComplete: false, normalRunnerStarted: false, externalInference: false, rendering: false,
    oldRuntimeReadersExecuted: false, cleanupRepeated: false, ssdAccessed: false,
    notRun: ['upload transfer/worker-backend split/receiver-only consumption', 'MP4 normal complete',
      'inspection missing normal complete', 'two purposes through all three Skills', 'video production/human quality']};
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n', {flag: 'wx'});
  const checkpoint = () => writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  const record = async (name: string, category: string, details: Record<string, unknown> = {}) => {
    results.push({name, category, status: 'passed', details}); await checkpoint();
    console.log(JSON.stringify({name, category, status: 'passed'}));
  };
  const oldPaths = ['queue-storage-cleanup-20261001-v001.json', 'queue-integration-evidence-attempt-005.json',
    'queue-capacity-stop-evidence-attempt-005.json', 'queue-clock-capacity-readback-attempt-005.json',
    'queue-clock-reference-evidence-attempt-005.json', 'queue-clock-binding-failure-attempt-004.json'];
  const oldHashes = Object.fromEntries(await Promise.all(oldPaths.map(async n => [n, sha(await readFile(path.join(report, n)))])));
  evidence.oldRecordHashesBefore = oldHashes;
  const implementationPaths = ['packages/shared/src/index.ts', 'packages/shared/dist/index.js',
    'backend/src/routes/control.ts', 'backend/src/store/json-store.ts', 'backend/src/runner/auto-runner.ts'];
  evidence.actualImplementationHashes = Object.fromEntries(await Promise.all(implementationPaths.map(async n => [n, sha(await readFile(path.join(root, n)))])));
  let backend: ChildProcess | undefined;
  let backendDone: ReturnType<typeof collect> | undefined;
  try {
    const absentEntry = await collect(child([]));
    assert.equal(absentEntry.exitCode, 1); assert(absentEntry.stderr.includes('媒体なし専用入口を明示してください'));
    await record('引数なし入口は作用前に拒否', 'entry', {exitCode: absentEntry.exitCode, mediaFallback: false});
    backend = child(['backend']); backendDone = collect(backend);
    const lines = createInterface({input: backend.stdout!});
    const port = await new Promise<number>((resolve, reject) => {
      lines.on('line', line => {try {const value = recordValue(JSON.parse(line)); if (typeof value.port === 'number') resolve(value.port);} catch {}});
      backend!.once('error', reject); backend!.once('exit', code => reject(new Error('隔離backend終了: ' + code)));
    });
    lines.close(); const base = `http://127.0.0.1:${port}/api`;
    evidence.apiBase = base; evidence.backendPid = backend.pid;
    type Actor = 'human' | 'agent' | 'none';
    async function call<T>(route: string, method = 'GET', body?: unknown, actor: Actor = 'human') {
      assert(method === 'GET' || method === 'POST');
      assert(route === '/state' || route === '/agent-requests/next' || route === '/request-drafts'
        || /^\/request-drafts\/[^/]+\/approve$/u.test(route) || /^\/agent-requests\/[^/]+\/claim$/u.test(route));
      const response = await fetch(base + route, {method,
        headers: {'content-type': 'application/json', ...(actor === 'none' ? {} : {authorization: `Bearer isolated-${actor}`})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)})});
      const value: unknown = await response.json();
      const fields = recordValue(value);
      apiCalls.push({route, method, actor, status: response.status, error: fields.error ?? null, errors: fields.errors ?? null});
      return {status: response.status, body: value as T};
    }
    async function state() {const r = await call<Zev2State>('/state'); assert.equal(r.status, 200); return r.body;}
    const business = (s: Zev2State) => {const {agentOperationLogs: _audit, ...objects} = s; return objects;};
    const initial = await state(); assert.equal(initial.requestDrafts.length, 0); assert.equal(initial.agentRequests.length, 0);
    for (const [name, route, actor] of [['人間routeの未認証拒否', '/state', 'none'],
      ['人間tokenでagent routeを拒否', '/agent-requests/next', 'human'],
      ['agent tokenで人間routeを拒否', '/request-drafts', 'agent']] as const) {
      const r = await call(route, route === '/request-drafts' ? 'POST' : 'GET', route === '/request-drafts' ? {} : undefined, actor);
      assert.equal(r.status, 401); assert.deepEqual(business(await state()), business(initial));
      await record(name, 'api-store', {route, httpStatus: r.status, businessObjectsUnchanged: true});
    }
    const input: RequestDraftInput = {productionType: 'clip', purpose: '  自然な導入を残す。\n反応と結末をつなぐ。\n\n寄り道は主題との関係で判断する。  ',
      sourceUri, durationLabel: '  媒体なし試験の尺条件  ', themeCountLabel: '  媒体なし試験の候補条件  ',
      geminiModelName: '  通信しない入口回帰  ', preset: '  媒体なし試験の編集条件  '};
    const {productionType: _type, ...missingType} = input;
    const invalid: Array<[string, unknown]> = [['制作系統欠損', missingType], ['制作系統未知値', {...input, productionType: 'unknown'}],
      ['目的空', {...input, purpose: ''}], ['目的空白', {...input, purpose: ' \n\t '}]];
    for (const field of ['sourceUri', 'durationLabel', 'themeCountLabel', 'geminiModelName', 'preset'] as const)
      invalid.push([field + '空白', {...input, [field]: ' \n '}]);
    for (const [name, value] of invalid) {
      const r = await call<{errors: string[]}>('/request-drafts', 'POST', value);
      assert.equal(r.status, 400); assert(r.body.errors.length > 0);
      assert.deepEqual(business(await state()), business(initial));
      await record(name + 'を登録前に拒否', 'api-store', {route: '/request-drafts', httpStatus: r.status,
        actualErrors: r.body.errors, businessObjectsUnchanged: true});
    }
    const inputs: RequestDraftInput[] = [input, {...input, productionType: 'digest',
      purpose: '\n前振りと展開を保持する。\nゲーム本編の終わりと配信末尾の挨拶を区別する。\n  '}];
    const drafts: RequestDraft[] = [];
    for (const value of inputs) {
      const r = await call<{draft: RequestDraft; state: Zev2State}>('/request-drafts', 'POST', value);
      assert.equal(r.status, 201); assert.equal(r.body.draft.status, 'draft');
      assert.equal(r.body.draft.purpose, value.purpose.trim()); assert.equal(r.body.state.agentRequests.length, 0);
      drafts.push(r.body.draft);
    }
    const pendingState = await state();
    const nextPending = await call<{request: AgentRequest | null}>('/agent-requests/next', 'GET', undefined, 'agent');
    assert.equal(nextPending.status, 200); assert.equal(nextPending.body.request, null);
    const missingClaim = await call('/agent-requests/agent-not-created/claim', 'POST', {ownerId: 'codex2-no-media-regression'}, 'agent');
    assert.equal(missingClaim.status, 404); assert.deepEqual(business(await state()), business(pendingState));
    await record('未承認2依頼から命令0・nextなし・不存在claim拒否', 'api-store',
      {draftIds: drafts.map(d => d.id), commands: 0, next: null, missingClaimHttpStatus: 404});
    const expectedTypes: AgentRequestType[][] = [['prepare_video', 'run_stt', 'propose_clip_themes', 'build_clip_composition', 'create_edit_plan', 'apply_adjustment', 'render_video'],
      ['prepare_video', 'run_stt', 'prepare_digest_plan', 'validate_digest_plan']];
    const expectedKinds: FileRefKind[][] = [['source_video', 'transcript_json', 'theme_json', 'composition_json', 'edit_plan_json', 'patch_json', 'output_video'],
      ['source_video', 'transcript_json', 'digest_plan_json', 'digest_execution_input_json']];
    const approved: Array<{draft: RequestDraft; agentRequests: AgentRequest[]; state: Zev2State}> = [];
    for (let i = 0; i < drafts.length; i++) {
      const r = await call<{draft: RequestDraft; agentRequests: AgentRequest[]; state: Zev2State}>(`/request-drafts/${drafts[i].id}/approve`, 'POST', {});
      assert.equal(r.status, 200); assert.equal(r.body.draft.status, 'approved');
      assert.deepEqual(r.body.agentRequests.map(q => q.type), expectedTypes[i]);
      assert.deepEqual(r.body.draft.steps.map(q => q.type), expectedTypes[i]);
      assert.deepEqual(r.body.agentRequests.map(q => getFileRefKindForRequest(q.type)), expectedKinds[i]);
      const normalized = Object.fromEntries(['durationLabel', 'themeCountLabel', 'geminiModelName', 'preset'].map(k => [k, String(recordValue(inputs[i])[k]).trim()]));
      assert.deepEqual(r.body.draft.settings, normalized);
      for (let j = 0; j < r.body.agentRequests.length; j++) {
        const q = r.body.agentRequests[j]; assert.equal(q.requestDraftId, r.body.draft.id);
        assert.equal(q.input.productionType, inputs[i].productionType); assert.equal(q.input.purpose, inputs[i].purpose.trim());
        assert.equal(q.target.sourceUri, sourceUri); assert.deepEqual(q.input.settings, normalized); assert.deepEqual(q.constraints, normalized);
        assert.deepEqual(q.policy, r.body.draft.policy); assert.equal(q.status, 'queued'); assert.deepEqual(q.fileRefIds, []);
        assert.equal(q.dependsOnAgentRequestId, j === 0 ? undefined : r.body.agentRequests[j - 1].id);
        assertApprovedAgentRequestInput(r.body.state, q);
      }
      approved.push(r.body);
      await record(inputs[i].productionType + '正常承認・工程／kind／依存順／目的全文と条件', 'api-store',
        {route: `/request-drafts/${drafts[i].id}/approve`, httpStatus: 200, productionType: inputs[i].productionType,
          draftId: r.body.draft.id, purpose: r.body.draft.purpose, settings: r.body.draft.settings,
          types: expectedTypes[i], kinds: expectedKinds[i], requestIds: r.body.agentRequests.map(q => q.id),
          scope: '命令到達のみ。3Skillの内容判断・媒体処理は未実行'});
      const beforeDuplicate = await state();
      const duplicate = await call(`/request-drafts/${drafts[i].id}/approve`, 'POST', {});
      assert.equal(duplicate.status, 409); assert.deepEqual(business(await state()), business(beforeDuplicate));
      await record(inputs[i].productionType + '重複承認を拒否・工程増殖なし', 'api-store', {httpStatus: 409, unchanged: true});
      for (const q of r.body.agentRequests.slice(1)) {
        const blocked = await call<{request?: AgentRequest; state: Zev2State; error: string}>(`/agent-requests/${q.id}/claim`, 'POST', {ownerId: 'codex2-no-media-regression'}, 'agent');
        assert.equal(blocked.status, 409); assert.equal(blocked.body.error, '前工程の完了待ちです');
        const saved = blocked.body.state.agentRequests.find(v => v.id === q.id); assert(saved);
        assert.equal(saved.status, 'waiting'); assert.equal(saved.claimOwnerId, undefined); assert.equal(saved.result, undefined);
        assert.equal(blocked.body.state.fileRefs.length, 0); assert.equal(blocked.body.state.outputs.length, 0);
        await record(inputs[i].productionType + ':' + q.type + '未完了依存へのclaim拒否', 'api-store',
          {route: `/agent-requests/${q.id}/claim`, httpStatus: 409, savedStatus: 'waiting',
            error: blocked.body.error, scope: '依存境界のみ。人間確認ゲートの証明とは別'});
      }
      const first = r.body.agentRequests[0];
      const claimed = await call<{request: AgentRequest; state: Zev2State}>(`/agent-requests/${first.id}/claim`, 'POST', {ownerId: 'codex2-no-media-regression'}, 'agent');
      assert.equal(claimed.status, 200); assert.equal(claimed.body.request.status, 'running');
      assert.equal(claimed.body.request.claimOwnerId, 'codex2-no-media-regression');
      assert.equal(claimed.body.state.agentRequests.filter(q => q.status === 'succeeded').length, 0);
      await record(inputs[i].productionType + '最初の命令だけ実claim・処理／completeなし', 'api-store', {httpStatus: 200, requestId: first.id, savedStatus: 'running'});
    }
    const memoryBase = structuredClone(approved[0].state);
    const memoryRequest = approved[0].agentRequests[3];
    const fixtureDraft = (s: Zev2State) => {
      const matches = s.requestDrafts.filter(d => d.id === memoryRequest.requestDraftId);
      assert.equal(matches.length, 1);
      const draft = matches[0]; assert(draft); return draft;
    };
    assert.deepEqual(fixtureDraft(memoryBase), approved[0].draft);
    const reordered = structuredClone(memoryBase); reordered.requestDrafts.reverse();
    assert.deepEqual(fixtureDraft(reordered), fixtureDraft(memoryBase));
    await record('対象下書きの一意性・命令ID束縛・配列順非依存', 'fixture-selection',
      {requestDraftId: memoryRequest.requestDraftId, unique: true, orderIndependent: true, stored: false});
    const mutations: Array<[string, (s: Zev2State, q: AgentRequest) => void]> = [
      ['目的変更', (_s, q) => q.input.purpose += '別意図'], ['編集条件変更', (_s, q) => q.input.settings.preset += '変更'],
      ['外側条件変更', (_s, q) => q.constraints.durationLabel += '変更'], ['素材参照変更', (_s, q) => q.target.sourceUri += '.other'],
      ['制作系統変更', (_s, q) => q.input.productionType = 'digest'], ['policy変更', (_s, q) => q.policy.humanApprovalRequiredBeforeRender = true],
      ['依存不存在', (_s, q) => q.dependsOnAgentRequestId = 'agent-not-created'],
      ['依存工程違い', (_s, q) => q.dependsOnAgentRequestId = approved[0].agentRequests[0].id],
      ['依存別draft', (s, q) => {s.agentRequests.push(...structuredClone(approved[1].agentRequests)); q.dependsOnAgentRequestId = approved[1].agentRequests[0].id;}],
      ['下書き未承認', (s) => fixtureDraft(s).status = 'draft'], ['下書き不存在', (s) => s.requestDrafts = []],
      ['下書き重複', (s) => s.requestDrafts.push(structuredClone(fixtureDraft(s)))],
      ['工程列変更', (s) => fixtureDraft(s).steps.reverse()], ['Clip外工程', (_s, q) => q.type = 'prepare_digest_plan'],
    ];
    for (const [name, change] of mutations) {
      const s = structuredClone(memoryBase), q = structuredClone(memoryRequest); change(s, q);
      if (['下書き未承認', '下書き重複', '工程列変更'].includes(name)) {
        assert.deepEqual(s.requestDrafts.filter(d => d.id !== memoryRequest.requestDraftId),
          memoryBase.requestDrafts.filter(d => d.id !== memoryRequest.requestDraftId));
        assert.notDeepEqual(s.requestDrafts.filter(d => d.id === memoryRequest.requestDraftId),
          memoryBase.requestDrafts.filter(d => d.id === memoryRequest.requestDraftId));
      }
      assert.throws(() => assertApprovedAgentRequestInput(s, q)); assert.equal(isAgentRequestReady(s, q), false);
      await record('承認入力不一致:' + name, 'control-memory', {actualFunctions: ['assertApprovedAgentRequestInput', 'isAgentRequestReady'], stored: false});
    }
    for (const [producer, kind] of [[2, 'theme_selection'], [3, 'material_confirmation'], [5, 'render_readiness']] as const) {
      assert.equal(getRequiredControlReviewKind(approved[0].agentRequests[producer]), kind);
      await record(kind + 'を作る工程を維持', 'control-memory', {producer: approved[0].agentRequests[producer].type, kind, actualFunction: 'getRequiredControlReviewKind'});
    }
    for (const [index, kind] of [[3, 'theme_selection'], [4, 'material_confirmation'], [6, 'render_readiness']] as const) {
      const s = structuredClone(memoryBase), q = structuredClone(approved[0].agentRequests[index]);
      const dependency = s.agentRequests.find(v => v.id === q.dependsOnAgentRequestId); assert(dependency); dependency.status = 'succeeded';
      assert.equal(q.policy.humanApprovalRequiredBeforeRender, false);
      assertApprovedAgentRequestInput(s, q); assert.equal(isAgentRequestReady(s, q), false);
      const review: ControlReviewItem = {id: 'memory-only-review', requestDraftId: q.requestDraftId, agentRequestId: dependency.id, kind,
        status: 'review_required', title: '制御関数単体fixture', summary: '実人間回答ではない', reason: 'ゲート条件だけの比較', evidenceRefs: [], options: [],
        proposedNextState: '単体比較', humanQuestion: '単体fixtureのみ', decisionLogId: 'memory-only-log', createdAt: q.createdAt, updatedAt: q.createdAt};
      for (const status of ['review_required', 'rejected', 'changes_requested', 'approved'] as const) {
        s.controlReviewItems = [{...review, status}];
        assert.equal(isAgentRequestReady(s, q), status === 'approved');
      }
      s.controlReviewItems = [{...review, status: 'approved', requestDraftId: 'other-draft'}]; assert.equal(isAgentRequestReady(s, q), false);
      const otherKind: ControlReviewKind = kind === 'theme_selection' ? 'material_confirmation' : 'theme_selection';
      s.controlReviewItems = [{...review, status: 'approved', kind: otherKind}]; assert.equal(isAgentRequestReady(s, q), false);
      s.controlReviewItems = [{...review, status: 'approved'}, {...review, id: 'newer-memory-review', status: 'review_required'}];
      assert.equal(isAgentRequestReady(s, q), false);
      await record(kind + 'の独立ゲート比較', 'control-memory', {consumer: q.type, dependencySucceededOnlyInMemory: true,
        policyFalseDoesNotExempt: true, absent: false, required: false, rejected: false, changesRequested: false,
        matchingApproved: true, otherDraftApproved: false, wrongKindApproved: false, newerRequired: false, stored: false});
    }
    const finalState = await state();
    assert.equal(finalState.agentRequests.length, 11); assert.equal(finalState.fileRefs.length, 0); assert.equal(finalState.outputs.length, 0);
    assert.equal(finalState.controlReviewItems.length, 0); assert.equal(finalState.humanReviewActions.length, 0);
    assert.equal(finalState.agentRequests.filter(q => q.status === 'succeeded').length, 0);
    assert.equal(finalState.agentRequests.filter(q => q.status === 'running').length, 2);
    assert.equal(finalState.agentRequests.filter(q => q.status === 'waiting').length, 9);
    await writeFile(path.join(runtime, 'api-final-state.json'), JSON.stringify(finalState, null, 2) + '\n', {flag: 'wx'});
    backend.kill('SIGTERM'); const stopped = await backendDone;
    assert.equal(stopped.exitCode, 0); evidence.backendExitCode = stopped.exitCode;
    await appendFile(path.join(runtime, 'backend.log'), stopped.stdout + stopped.stderr);
    backend = undefined;
    const reread = await collect(child(['read-state'])); assert.equal(reread.exitCode, 0, reread.stderr);
    const proof: unknown = JSON.parse(reread.stdout.trim());
    await writeFile(path.join(runtime, 'reader-proof.json'), JSON.stringify(proof, null, 2) + '\n', {flag: 'wx'});
    await record('別processの通常store再読・API応答一致・state bytes不変', 'saved-state', {exitCode: 0, proof});
    const afterHashes = Object.fromEntries(await Promise.all(oldPaths.map(async n => [n, sha(await readFile(path.join(report, n)))])));
    assert.deepEqual(afterHashes, oldHashes); evidence.oldRecordHashesAfter = afterHashes;
    const files = await readdir(runtime); assert.deepEqual(files.sort(), ['api-final-state.json', 'backend.log', 'reader-proof.json', 'state.json']);
    evidence.runtimeFiles = await Promise.all(files.map(async n => ({path: relative(path.join(runtime, n)), bytes: (await stat(path.join(runtime, n))).size})));
    evidence.runtimeBytesAfter = (evidence.runtimeFiles as Array<{bytes: number}>).reduce((sum, f) => sum + f.bytes, 0);
    await record('旧記録不変・小state／JSON／logのみ・媒体作用0', 'saved-state', {oldRecords: oldPaths.length, files, automaticRunnerDisabled: true,
      actualHttpMethods: [...new Set(apiCalls.map(c => c.method))], completeCalls: 0, artifactCalls: 0});
    evidence.status = 'passed'; evidence.completedAt = new Date().toISOString(); evidence.resultCount = results.length; await checkpoint();
    console.log(JSON.stringify({status: 'passed', results: results.length, runtimeBytes: evidence.runtimeBytesAfter}));
  } catch (e) {
    evidence.status = 'failed'; evidence.error = e instanceof Error ? e.stack : String(e); await checkpoint(); throw e;
  } finally {
    if (backend && backend.exitCode === null) {backend.kill('SIGTERM'); await backendDone;}
  }
}

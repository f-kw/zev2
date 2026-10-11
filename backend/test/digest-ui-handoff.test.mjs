import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import express from 'express';
import { createInitialState, createAgentRequestsFromDraft } from '@zev2/shared';
import { handOffPreparedDigestUiMaterials } from '../../scripts/digest-ui-preparation-handoff.mjs';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';

const area = await createFixtureWorkspace();
let server;
after(async () => { if (server) await new Promise(resolve => server.close(resolve));await area.cleanup(); });
process.env.ZEV2_RUNTIME_DIR = area.runtime;
process.env.ZEV2_RUNTIME_CONFIG_PATH = path.join(area.runtime, 'config.json');
process.env.ZEV2_WORKSPACE_ROOT = workspace;
process.env.ZEV2_DISABLE_AUTO_RUNNER = '1';
process.env.ZEV2_HUMAN_API_TOKEN = 'isolated-handoff-human';
process.env.ZEV2_AGENT_API_TOKEN = 'isolated-handoff-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH, JSON.stringify({ stt: {mode:'fixed'},contentDiscovery:{mode:'fixed'},
  editPlan:{mode:'fixed'},adjustment:{mode:'fixed'},videoOutput:{encoder:'libx264',extraArgs:[]},
  artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''} }));
const { default: router } = await import('../src/routes/control.ts');
const { saveState, loadState } = await import('../src/store/json-store.ts');
const fixtures = [await makeDigestUiFixture(area, 'a'), await makeDigestUiFixture(area, 'b')];
const calls = [];let replaceBeforePost = false, redirectRead = false;
const app = express();app.use(express.json());app.use(async (request, response, next) => {
  calls.push({ method: request.method, path: request.path, body: request.body });
  if (request.path === '/api/state' && redirectRead) { response.redirect(307, '/must-not-follow');return; }
  if (request.path === '/api/state' && replaceBeforePost) {
    const old = await loadState(), changed = structuredClone(old);changed.requestDrafts[0].purpose += ' 差替え';
    await saveState(changed);response.json(old);return;
  }
  next();
});app.use('/api', router);server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const options = { backendOrigin: `http://127.0.0.1:${server.address().port}`, humanToken: process.env.ZEV2_HUMAN_API_TOKEN };
const params = f => ({ ...f.parameters, workspaceRoot: workspace });
const mutations = start => calls.slice(start).filter(c => c.method === 'POST');
const statePath = path.join(area.runtime, 'state.json'), registrationPath = path.join(area.runtime, 'ui-digest-preparations.json');
const registrations = () => readFile(registrationPath).catch(error => { if (error.code !== 'ENOENT') throw error;return null; });

test('unfinished current producer leaves preparation unregistered without approval, rerun or manufacture', async () => {
  const f = fixtures[0], partial = createInitialState();partial.requestDrafts.push(structuredClone(f.draft));
  let n = 0;partial.agentRequests = createAgentRequestsFromDraft(partial.requestDrafts[0], f.draft.createdAt, () => `pending-${++n}`);
  await saveState(partial);const before = await readFile(statePath), start = calls.length;
  await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, options), /HTTP 409/);
  assert.deepEqual(await readFile(statePath), before);assert.equal(await registrations(), null);
  assert.deepEqual(mutations(start).map(c => c.path), [`/api/request-drafts/${f.draft.id}/ui-digest-preparation`]);
  const response = await fetch(`${options.backendOrigin}/api/request-drafts/${f.draft.id}/ui-review`, {headers:{authorization:`Bearer ${options.humanToken}`}});
  const m = await response.json();assert.equal(m.digestPreparation.status, 'not_registered');assert.deepEqual(m.candidates, []);
});
test('failed STT with retained recognition text is not registered as a completed preparation', async () => {
  const f = fixtures[0], failed = structuredClone(f.state);
  failed.agentRequests = failed.agentRequests.filter(r => r.type === 'import_video' || r.type === 'run_stt');
  const source = failed.agentRequests.find(r => r.type === 'import_video'), stt = failed.agentRequests.find(r => r.type === 'run_stt');
  stt.status = 'failed';stt.error = '人工STT失敗。認識原文だけ保持';delete stt.result;stt.fileRefIds = [];
  const sourceIds = new Set(source.fileRefIds);failed.fileRefs = failed.fileRefs.filter(f => sourceIds.has(f.id));
  const outputIds = new Set(failed.fileRefs.map(f => f.ownerId));failed.outputs = failed.outputs.filter(o => outputIds.has(o.id));
  const rawPath = path.join(area.inputRoot, area.prefix, 'failed-recognition-text.json'), raw = JSON.stringify({status:'failed',text:'人工の未完成認識原文'});
  await writeFile(rawPath, raw);await saveState(failed);const before = await readFile(statePath), start = calls.length;
  await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, options), /HTTP 409/);
  assert.deepEqual(await readFile(statePath), before);assert.equal(await registrations(), null);assert.equal(await readFile(rawPath, 'utf8'), raw);
  assert.equal(mutations(start).length, 1);assert(!mutations(start).some(c => /approve|claim|resume|complete/.test(c.path)));
});
test('normal completed results from two distinct artificial sources reach the existing qualified registration endpoint', async () => {
  for (const f of fixtures) {
    await saveState(f.state);const before = await readFile(statePath), files = await readdir(f.directory), parameters = params(f), original = structuredClone(parameters), start = calls.length;
    const result = await handOffPreparedDigestUiMaterials(parameters, f.manifestBinding, options);
    assert.equal(result.materials.digestPreparation.status, 'verified');assert.equal(result.materials.creationChecks.audioPreservation, 'preserve-source-only');
    assert.equal(result.materials.creationChecks.sourceAudioReference, 'registered');assert.equal(result.materials.candidates.length, 2);
    assert(result.materials.candidates.every(c => c.title.includes(`人工${f.draft.id.slice(-1)}`)));assert(result.materials.blockers.some(s => s.includes('未接続')));
    assert.deepEqual(parameters, original);assert.deepEqual(await readFile(statePath), before);assert.deepEqual(await readdir(f.directory), files);
    assert.equal(mutations(start).length, 1);assert(!('workspaceRoot' in mutations(start)[0].body.parameters));
    const saved = await registrations();await handOffPreparedDigestUiMaterials(parameters, f.manifestBinding, options);assert.deepEqual(await registrations(), saved);
  }
});
test('CLI consumes saved normal parameters and the actual completed manifest reference without printing authentication', async () => {
  const f = fixtures[1];await saveState(f.state);const filename = path.join(area.inputRoot, area.prefix, 'normal-preparation-parameters.json');
  await writeFile(filename, JSON.stringify(params(f)));const before = [await readFile(statePath), await registrations()];
  const result = await promisify(execFile)(process.execPath, [path.join(workspace, 'scripts/digest-ui-preparation-handoff.mjs'),
    '--backend-origin', options.backendOrigin, '--parameters-file', filename, '--manifest-path', f.manifestBinding.path,
    '--manifest-sha256', f.manifestBinding.fileSha256], {cwd:workspace,env:process.env});
  assert.deepEqual(Object.keys(JSON.parse(result.stdout)).sort(), ['preparationId','preparationStatus','registeredAt','requestDraftId']);
  assert.equal(JSON.parse(result.stdout).preparationStatus, 'verified');assert(!result.stdout.includes(options.humanToken));assert.equal(result.stderr, '');
  assert.deepEqual([await readFile(statePath), await registrations()], before);
});
test('missing completed result, unexpected producer authority, other draft and agent-only credentials never register', async () => {
  const f = fixtures[0];await saveState(f.state);const before = [await readFile(statePath), await registrations()];let start = calls.length;
  await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), null, options));
  await assert.rejects(() => handOffPreparedDigestUiMaterials({...params(f),permit:{approved:true}}, f.manifestBinding, options));
  assert.equal(calls.length, start);
  await assert.rejects(() => handOffPreparedDigestUiMaterials(params(fixtures[1]), fixtures[1].manifestBinding, options), /登録先がありません/);
  await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, {...options,humanToken:process.env.ZEV2_AGENT_API_TOKEN}), /HTTP 401/);
  assert.equal(mutations(start).length, 0);assert.deepEqual([await readFile(statePath), await registrations()], before);
});
test('same-ID different source and manifest bytes are rejected by the unchanged server qualifications without retry', async () => {
  const f = fixtures[0], changed = structuredClone(f.state);changed.requestDrafts[0].source.uri = fixtures[1].draft.source.uri;
  for (const [state, binding] of [[changed,f.manifestBinding], [f.state,{...f.manifestBinding,fileSha256:'f'.repeat(64)}]]) {
    await saveState(state);const before = [await readFile(statePath), await registrations()], start = calls.length;
    await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), binding, options), /HTTP 409/);
    assert.equal(mutations(start).length, 1);assert.deepEqual([await readFile(statePath), await registrations()], before);
  }
});
test('draft replacement between current-state read and POST is refused, not retried with the new identity', async () => {
  const f = fixtures[0];await saveState(f.state);const saved = await registrations(), start = calls.length;replaceBeforePost = true;
  try { await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, options), /HTTP 409/); }
  finally { replaceBeforePost = false; }
  assert.equal(mutations(start).length, 1);assert.deepEqual(await registrations(), saved);
  const changed = await loadState();assert.equal(changed.requestDrafts[0].purpose, f.draft.purpose + ' 差替え');
  assert.deepEqual(changed.agentRequests, f.state.agentRequests);assert.deepEqual(changed.fileRefs, f.state.fileRefs);assert.deepEqual(changed.outputs, f.state.outputs);
});
test('non-loopback origins and redirects cannot send the existing human credential elsewhere', async () => {
  const f = fixtures[0];await saveState(f.state);const before = [await readFile(statePath), await registrations()], start = calls.length;
  for (const origin of ['https://example.com', options.backendOrigin + '/different-api', 'http://127.0.0.1:8080/?redirect=1']) {
    await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, {...options,backendOrigin:origin}), /loopback/);
  }
  assert.equal(calls.length, start);redirectRead = true;
  try { await assert.rejects(() => handOffPreparedDigestUiMaterials(params(f), f.manifestBinding, options)); }
  finally { redirectRead = false; }
  assert.deepEqual(calls.slice(start).map(c => c.path), ['/api/state']);assert.equal(mutations(start).length, 0);
  assert.deepEqual([await readFile(statePath), await registrations()], before);
});

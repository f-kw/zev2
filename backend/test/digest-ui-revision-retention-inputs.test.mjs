import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir, lstat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { digestArtifactFileNameV001 } from '@zev2/shared';
import { formal, canonicalSha } from '../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
import { assertInternalRetentionInputV001 } from '../../runner/src/skills/candidate-internal-retention-v001.ts';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';

// Uses the unchanged normal-reader fixture on the explicitly selected SSD. No provider or playable media.
const area = await createFixtureWorkspace();let server;
after(async () => { if (server) await new Promise(r => server.close(r));await area.cleanup(); });
process.env.ZEV2_RUNTIME_DIR = area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH = path.join(area.runtime, 'config.json');
process.env.ZEV2_WORKSPACE_ROOT = workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER = '1';
process.env.ZEV2_HUMAN_API_TOKEN = 'isolated-retention-human';process.env.ZEV2_AGENT_API_TOKEN = 'isolated-retention-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH, JSON.stringify({ stt: { mode: 'fixed' }, contentDiscovery: { mode: 'fixed' },
  editPlan: { mode: 'gemini' }, adjustment: { mode: 'fixed' }, videoOutput: { encoder: 'libx264', extraArgs: [] },
  artifactDelivery: { mode: 'local' }, source: { defaultUri: '', defaultPurpose: '' } }));
const { default: router } = await import('../src/routes/control.ts'), { saveState } = await import('../src/store/json-store.ts');
const fixtures = [await makeDigestUiFixture(area, 'a', 'first-only'), await makeDigestUiFixture(area, 'b', 'first-only')];
const compositions = new Map(), preparations = new Map(), baselines = new Map();
const app = express();app.use(express.json());app.use('/api', router);server = app.listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}/api`, statePath = path.join(area.runtime, 'state.json');
const editPath = path.join(area.runtime, 'ui-digest-edit-requests.json'), sha = b => createHash('sha256').update(b).digest('hex');
const endpoint = 'ui-digest-additional-retention-inputs';
async function api(f, route, body, token = 'isolated-retention-human') {
  const r = await fetch(`${origin}/request-drafts/${f.draft.id}/${route}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: r.status, body: await r.json() };
}
async function current(f) { const r = await api(f, 'ui-review');assert.equal(r.status, 200);return r.body; }
const confirm = m => ({ draftIdentity: m.draftIdentity, fingerprint: m.fingerprint });
async function activate(f) { await saveState(f.state);const r = await api(f, 'ui-digest-preparation', f.body);
  assert.equal(r.status, 200, JSON.stringify(r.body));return r.body.materials; }
const physical = (f, binding) => path.join(f.directory, digestArtifactFileNameV001(binding.path, f.draft.id));
const savedPath = (f, hash) => path.join(f.directory, `ui-retention-inputs-${hash}.json`);
const requestBody = (m, composition) => ({ ...confirm(m), requestHash: composition.requestHash });
const reader = (f, composition) => api(f, `${endpoint}/${composition.requestHash}`);
async function files(f) { const out = {};for (const name of (await readdir(f.directory)).sort())
  out[name] = sha(await readFile(path.join(f.directory, name)));return out; }
const immutable = async f => [await readFile(statePath), await readFile(editPath), await files(f)];
async function refused(f, operation, status = 409) { const before = await immutable(f), r = await operation();
  assert.equal(r.status, status, JSON.stringify(r.body));assert.deepEqual(await immutable(f), before);return r; }
async function oneJsonInventory(f, before, after, filename, t) {
  assert(!Object.hasOwn(before, filename) && Object.hasOwn(after, filename));
  const added = Object.keys(after).filter(n => !Object.hasOwn(before, n)).sort(), metadata = [];
  for (const name of added) {
    if (name === filename) continue;
    assert.equal(name, `._${filename}`, 'Only an exact new-JSON AppleDouble companion is admissible');
    const file = path.join(f.directory, name), info = await lstat(file), b = await readFile(file);
    assert(info.isFile() && !info.isSymbolicLink() && info.nlink === 1);assert.equal(sha(b), after[name]);assert(b.length >= 26);
    assert.equal(b.readUInt32BE(0), 0x00051607);assert.equal(b.readUInt32BE(4), 0x00020000);
    const count = b.readUInt16BE(24), end = 26 + count * 12, ids = new Set(), ranges = [];
    assert(count > 0 && end <= b.length);
    for (let i = 0; i < count; i++) { const at = 26 + i * 12, id = b.readUInt32BE(at), start = b.readUInt32BE(at + 4),
      stop = start + b.readUInt32BE(at + 8);assert(id > 0 && !ids.has(id));ids.add(id);assert(start >= end && stop <= b.length);
      ranges.push({ start, stop }); }
    ranges.sort((a, b) => a.start - b.start || a.stop - b.stop);
    for (let i = 1; i < ranges.length; i++) assert(ranges[i - 1].stop <= ranges[i].start);
    metadata.push({ name, sizeBytes: b.length, sha256: sha(b) });
  }
  assert.deepEqual(added, [filename, ...metadata.map(v => v.name)].sort());
  for (const [name, hash] of Object.entries(before)) assert.equal(after[name], hash, `Changed old file: ${name}`);
  t.diagnostic(JSON.stringify({ filesystemAuxiliaryFiles: metadata }));
}

test('preparation requires both already-saved composition JSON files; it never creates them implicitly', async () => {
  for (const f of fixtures) {
    const initial = await activate(f), addition = await api(f, 'ui-digest-scene-additions', { ...confirm(initial), candidateId: 'candidate-0002' });
    assert.equal(addition.status, 200);const m = await current(f);
    assert.equal(m.digestComposition.status, 'revision_requested');
    assert(m.blockers.some(b => b.includes(`「人工${f.draft.id.at(-1)}の場面2」`) && b.includes('保持判断は未回答')));
    assert(!m.blockers.some(b => b.includes('場面1') && b.includes('保持判断は未回答')));
    const snapshot = { schemaVersion: 'ui-digest-human-request-snapshot-v001', requestDraftId: f.draft.id,
      draftIdentity: m.draftIdentity, confirmationFingerprint: m.fingerprint, sourceBasis: m.digestComposition.basis,
      requests: [addition.body.editRequest] }, requestHash = sha(formal(snapshot));
    await refused(f, () => api(f, endpoint, { ...confirm(m), requestHash }));
    const saved = await api(f, 'ui-digest-composition-data', confirm(m));assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.requestHash, requestHash);compositions.set(f.draft.id, saved.body);
    baselines.set(f.draft.id, await files(f));
  }
});

test('A/B prepare only added-scene closed inputs; duplicate clicks are idempotent and old full answers stay unchanged', async t => {
  for (const f of fixtures) {
    await activate(f);const m = await current(f), c = compositions.get(f.draft.id), before = await immutable(f);
    const replies = await Promise.all([api(f, endpoint, requestBody(m, c)), api(f, endpoint, requestBody(m, c))]);
    assert(replies.every(r => r.status === 200), JSON.stringify(replies));assert.deepEqual(replies[0].body, replies[1].body);
    const summary = replies[0].body;preparations.set(f.draft.id, summary);
    assert.deepEqual(Object.keys(summary).sort(), ['admission', 'message', 'pendingCandidates', 'preparationHash', 'requestDraftId', 'requestHash', 'status'].sort());
    assert.equal(summary.status, 'awaiting-retention-answers');assert(summary.message.includes('未回答') && summary.message.includes('実行しません'));
    assert.deepEqual(summary.pendingCandidates, [{ candidateId: 'candidate-0002', title: m.candidates[1].title, answerStatus: 'unanswered' }]);
    assert.deepEqual(summary.admission, { retentionIntegration: 'not-prepared', captionPreparation: 'not-prepared', executionPermission: 'not-approved', humanQuality: 'pending' });
    const file = savedPath(f, c.requestHash), raw = await readFile(file), bundle = JSON.parse(raw.toString());
    assert.equal(sha(raw), summary.preparationHash);assert.equal(bundle.requestHash, c.requestHash);
    assert.deepEqual(bundle.snapshotBinding, c.snapshotBinding);assert.deepEqual(bundle.compositionBinding, c.compositionBinding);
    assert.deepEqual(bundle.representedEditRequestIds, c.representedEditRequestIds);
    assert.equal(bundle.requests.length, 1);assert.deepEqual(Object.keys(bundle.originalRetentionBindings).sort(), ['request', 'response', 'result', 'validation']);
    const plan = JSON.parse(await readFile(path.join(f.directory, f.planFile.artifactFileName), 'utf8'));
    const p = JSON.parse(await readFile(physical(f, plan.preparationBinding), 'utf8'));
    for (const [kind, binding] of Object.entries(bundle.originalRetentionBindings)) {
      assert.deepEqual(binding, p.artifacts[`retention-${kind}.json`]);assert.equal(sha(await readFile(physical(f, binding))), binding.fileSha256);
    }
    assert.deepEqual(bundle.sourceBindings, { sourceVideo: plan.sourceVideoBinding, transcript: plan.transcriptBinding, utterances: plan.utteranceBinding });
    const item = bundle.requests[0], r = item.request;
    assert.equal(item.answerStatus, 'unanswered');assert.equal(item.requestFileSha256, sha(formal(r)));
    assert.equal(r.editRequestId, c.composition.scenes[1].inclusion.editRequestId);
    assert.equal(r.candidateId, 'candidate-0002');assert.deepEqual(r.snapshotBinding, c.snapshotBinding);assert.deepEqual(r.compositionBinding, c.compositionBinding);
    assert.equal(r.inputCanonicalSha256, canonicalSha(r.input));assertInternalRetentionInputV001(r.input);
    assert.equal(r.input.taskDescription, f.draft.purpose);assert.deepEqual(r.input.candidates.map(v => v.candidateId), ['candidate-0002']);
    const discovery = JSON.parse(await readFile(physical(f, r.summarySource.binding), 'utf8'));
    assert.deepEqual(r.summarySource.binding, p.artifacts['candidate-response.json']);assert.equal(r.summarySource.candidateIndex, 1);
    const chosen = r.input.candidates[0];assert.equal(chosen.highlightReason, discovery.answer.candidates[1].reason);
    assert.notEqual(chosen.highlightReason, c.composition.scenes[1].originalAiJudgment.reason);
    const utterances = JSON.parse(await readFile(physical(f, plan.utteranceBinding), 'utf8')).utterances;
    const segments = JSON.parse(await readFile(physical(f, plan.transcriptBinding), 'utf8')).segments;
    const context = c.composition.scenes[1].candidateContext;
    assert.deepEqual(chosen.utterances, context.includedUtteranceIds.map(id => {
      const u = utterances.find(v => v.utteranceId === id);
      return { utteranceId: id, atoms: u.sourceSegmentIds.map(id => ({ sourceSegmentId: id, text: segments.find(a => a.id === id).text })) };
    }));
    const originalResponse = JSON.parse(await readFile(physical(f, bundle.originalRetentionBindings.response), 'utf8'));
    assert.equal(originalResponse.requestFileSha256, bundle.originalRetentionBindings.request.fileSha256);
    assert.notEqual(originalResponse.requestFileSha256, item.requestFileSha256);
    assert.equal(originalResponse.answer.candidates.length, 1);assert.equal(originalResponse.answer.candidates[0].candidateId, 'candidate-0001');
    assert(!Object.hasOwn(bundle, 'originalRetentionDocuments'));assert(!Object.hasOwn(item, 'response'));assert(!Object.hasOwn(item, 'result'));
    assert(!JSON.stringify(summary).includes('retention-request.json'));assert(!JSON.stringify(summary).includes('originalRetentionBindings'));
    await oneJsonInventory(f, before[2], await files(f), path.basename(file), t);
    assert.deepEqual([await readFile(statePath), await readFile(editPath)], before.slice(0, 2));
    assert.deepEqual(await current(f), m);assert.deepEqual((await reader(f, c)).body, summary);
    assert.deepEqual(c.composition.scenes[1].originalAiJudgment.decision, 'reject');
  }
  assert.notEqual(compositions.get('digest-a').requestHash, compositions.get('digest-b').requestHash);
  assert.notEqual(preparations.get('digest-a').preparationHash, preparations.get('digest-b').preparationHash);
});

test('human auth, stale display, extra permissions, another material and unknown candidate never write', async () => {
  const f = fixtures[0];await activate(f);const m = await current(f), c = compositions.get(f.draft.id), body = requestBody(m, c);
  await refused(f, () => api(f, endpoint, body, 'isolated-retention-agent'), 401);
  await refused(f, () => api(f, `${endpoint}/${c.requestHash}`, undefined, 'isolated-retention-agent'), 401);
  for (const changed of [{ ...body, fingerprint: 'stale' }, { ...body, draftIdentity: 'stale' }, { ...body, job: { approved: true } },
    { ...body, candidateId: 'candidate-0001' }, { ...body, requestHash: compositions.get('digest-b').requestHash }])
    await refused(f, () => api(f, endpoint, changed));
  await refused(f, () => api(f, `${endpoint}/${compositions.get('digest-b').requestHash}`));
  await refused(f, () => api(f, 'ui-digest-scene-additions', { ...confirm(m), candidateId: 'absent' }));
  const changed = structuredClone(f.state);changed.requestDrafts[0].source.uri = 'file:///different-artificial-source.mp4';await saveState(changed);
  try { await refused(f, () => api(f, endpoint, body));await refused(f, () => reader(f, c)); } finally { await saveState(f.state); }
});

test('missing or altered saved inputs/snapshot/composition reject read and preparation without overwrite', async () => {
  const f = fixtures[0];await activate(f);const m = await current(f), c = compositions.get(f.draft.id), body = requestBody(m, c);
  for (const file of [savedPath(f, c.requestHash), path.join(area.runtime, c.snapshotBinding.path), path.join(area.runtime, c.compositionBinding.path)]) {
    const original = await readFile(file);await writeFile(file, Buffer.concat([original, Buffer.from('\n')]));
    try { await refused(f, () => reader(f, c));await refused(f, () => api(f, endpoint, body)); } finally { await writeFile(file, original); }
    await unlink(file);
    try { await refused(f, () => reader(f, c));
      if (file !== savedPath(f, c.requestHash)) await refused(f, () => api(f, endpoint, body));
    } finally { await writeFile(file, original); }
  }
  assert.deepEqual((await reader(f, c)).body, preparations.get(f.draft.id));
});

test('old four retention records and source graph are requalified; missing/tampered originals cannot become added-scene answers', async () => {
  const f = fixtures[0];await activate(f);const m = await current(f), c = compositions.get(f.draft.id), body = requestBody(m, c);
  const bundle = JSON.parse(await readFile(savedPath(f, c.requestHash), 'utf8'));
  const bindings = [...Object.values(bundle.originalRetentionBindings), bundle.sourceBindings.transcript, bundle.sourceBindings.utterances,
    m.digestComposition.basis.candidateSetBinding, m.digestComposition.basis.selectionAdoptionBinding, bundle.requests[0].request.summarySource.binding];
  for (const binding of bindings) {
    const file = physical(f, binding), original = await readFile(file);await writeFile(file, Buffer.concat([original, Buffer.from('\n')]));
    try { await refused(f, () => api(f, endpoint, body));await refused(f, () => reader(f, c));
      const rejected = await current(f);assert.equal(rejected.digestPreparation.status, 'rejected');
      assert.equal(rejected.creationChecks.inputValidation, 'failed');assert.equal(rejected.creationChecks.audioPreservation, 'unknown');
    } finally { await writeFile(file, original); }
    if (Object.values(bundle.originalRetentionBindings).some(b => b.path === binding.path)) {
      await unlink(file);try { await refused(f, () => api(f, endpoint, body));await refused(f, () => reader(f, c)); }
      finally { await writeFile(file, original); }
    }
  }
  for (const [name, hash] of Object.entries(baselines.get(f.draft.id))) assert.equal((await files(f))[name], hash);
  assert.deepEqual((await reader(f, c)).body, preparations.get(f.draft.id));
});

test('an unsupported stored addition or changed chain cannot reuse a former request', async () => {
  const f = fixtures[0];await activate(f);const m = await current(f), c = compositions.get(f.draft.id), body = requestBody(m, c);
  const original = await readFile(editPath);
  for (const kind of ['unknown-candidate', 'changed-chain']) {
    const store = JSON.parse(original.toString()), r = store.requests.find(v => v.requestDraftId === f.draft.id);
    if (kind === 'unknown-candidate') { r.candidateId = 'absent';r.requestedCandidateIds = ['candidate-0001', 'absent']; }
    else r.id += '-different-chain';
    await writeFile(editPath, JSON.stringify(store));
    try { await refused(f, () => api(f, endpoint, body));await refused(f, () => reader(f, c)); } finally { await writeFile(editPath, original); }
  }
});

test('missing or incompatible saved discovery summary refuses preparation rather than inventing a reason', async () => {
  const f = fixtures[0];await activate(f);const m = await current(f), c = compositions.get(f.draft.id), body = requestBody(m, c);
  const bundle = JSON.parse(await readFile(savedPath(f, c.requestHash), 'utf8'));
  const file = physical(f, bundle.requests[0].request.summarySource.binding), original = await readFile(file);
  for (const kind of ['blank', 'incompatible']) {
    const discovery = JSON.parse(original.toString());
    if (kind === 'blank') discovery.answer.candidates[1].reason = '';
    else discovery.answer.candidates[1].contextEndUtteranceId = discovery.answer.candidates[0].contextEndUtteranceId;
    await writeFile(file, formal(discovery));
    try { await refused(f, () => api(f, endpoint, body));await refused(f, () => reader(f, c)); } finally { await writeFile(file, original); }
  }
});

test('a fresh compiled backend process re-reads B with the same result, no state/queue/original writes', async () => {
  const f = fixtures[1];await activate(f);const c = compositions.get(f.draft.id), before = await immutable(f);
  const command = `import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {readDigestUiAdditionalRetentionInputs} from './dist/domain/digest-ui-composition-data.js';process.stdout.write(JSON.stringify(await readDigestUiAdditionalRetentionInputs(await loadState(),'${f.draft.id}',await loadRuntimeConfig(),'${c.requestHash}')));`;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', command], { cwd: path.join(workspace, 'backend'), env: process.env, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);assert.deepEqual(JSON.parse(child.stdout), preparations.get(f.draft.id));
  assert.deepEqual(await immutable(f), before);
  for (const [name, hash] of Object.entries(baselines.get(f.draft.id))) assert.equal((await files(f))[name], hash);
});

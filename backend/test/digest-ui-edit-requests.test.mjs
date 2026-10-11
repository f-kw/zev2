import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';
const area = await createFixtureWorkspace(), areas = [area];let server;
after(async () => { if (server) await new Promise(r=>server.close(r));for (const a of areas) await a.cleanup(); });
process.env.ZEV2_RUNTIME_DIR=area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH=path.join(area.runtime,'config.json');
process.env.ZEV2_WORKSPACE_ROOT=workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.ZEV2_HUMAN_API_TOKEN='isolated-edit-human';process.env.ZEV2_AGENT_API_TOKEN='isolated-edit-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},editPlan:{mode:'gemini'},adjustment:{mode:'fixed'},
  videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''}}));
const {default:router}=await import('../src/routes/control.ts');
const {saveState}=await import('../src/store/json-store.ts');
const {saveDigestSceneAddition}=await import('../src/domain/digest-ui-edit-requests.ts');
const fixtures=[await makeDigestUiFixture(area,'a','first-only'),await makeDigestUiFixture(area,'b','first-only')];
const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}/api`,statePath=path.join(area.runtime,'state.json'),editPath=path.join(area.runtime,'ui-digest-edit-requests.json');
async function edits(){return readFile(editPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});}
async function api(f,endpoint,body,token='isolated-edit-human'){
  const response=await fetch(`${base}/request-drafts/${f.draft.id}/${endpoint}`,{method:body===undefined?'GET':'POST',
    headers:{'content-type':'application/json',authorization:`Bearer ${token}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json()};
}
const get=async f=>{const r=await api(f,'ui-review');assert.equal(r.status,200);return r.body;};
const input=(m,id='candidate-0002')=>({draftIdentity:m.draftIdentity,fingerprint:m.fingerprint,candidateId:id});
async function activate(f){await saveState(f.state);const r=await api(f,'ui-digest-preparation',f.body);assert.equal(r.status,200,JSON.stringify(r.body));return r.body.materials;}
async function directoryBytes(f){const out={};for(const name of (await readdir(f.directory)).sort())out[name]=createHash('sha256').update(await readFile(path.join(f.directory,name))).digest('hex');return out;}
async function rejectUnchanged(f,body,token){const before=[await readFile(statePath),await edits(),await directoryBytes(f)];const r=await api(f,'ui-digest-scene-additions',body,token);
  assert.equal(r.status,token==='isolated-edit-agent'?401:409,JSON.stringify(r.body));assert.deepEqual([await readFile(statePath),await edits(),await directoryBytes(f)],before);return r;}

test('current A/B composition is read from real saved selection; viewing never saves or executes',async()=>{
  for(const f of fixtures){const m=await activate(f),before=[await readFile(statePath),await edits(),await directoryBytes(f)];
    assert.equal(m.digestComposition.status,'current');assert.deepEqual(m.digestComposition.currentCandidateIds,['candidate-0001']);
    assert.deepEqual(m.digestComposition.requestedCandidateIds,['candidate-0001']);assert.equal(m.digestComposition.addedContextDurationMs,0);
    assert.equal(m.digestComposition.currentDurationMs,f.draft.id==='digest-a'?1500:2000);
    for(let i=0;i<2;i++)assert.deepEqual(await get(f),m);assert.deepEqual([await readFile(statePath),await edits(),await directoryBytes(f)],before);
  }
});
test('explicit addition records intent once, preserves every producer byte and never approves fees or execution',async()=>{
  for(const f of fixtures){const m=await activate(f),before=[await readFile(statePath),await directoryBytes(f)];
    const replies=await Promise.all([api(f,'ui-digest-scene-additions',input(m)),api(f,'ui-digest-scene-additions',input(m))]);
    assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(replies.filter(r=>r.body.changed).length,1);
    const r=replies.find(r=>r.body.changed);assert(replies.every(other=>other.body.editRequest.id===r.body.editRequest.id));
    const saved=r.body.editRequest;assert.equal(saved.candidateId,'candidate-0002');assert.deepEqual(saved.beforeCandidateIds,['candidate-0001']);
    assert.deepEqual(saved.requestedCandidateIds,['candidate-0001','candidate-0002']);assert.deepEqual(saved.basis,m.digestComposition.basis);
    assert.equal(saved.confirmationFingerprint,m.fingerprint);
    const next=r.body.materials;assert.equal(next.digestComposition.status,'revision_requested');assert.equal(next.creationChecks.inputValidation,'failed');
    assert.deepEqual(next.digestComposition.addedCandidateIds,['candidate-0002']);assert(next.blockers.some(s=>s.includes('新版準備')));
    assert.equal(next.digestComposition.addedContextDurationMs,f.draft.id==='digest-a'?1500:2000);
    assert.equal(next.digestComposition.contextTotalUpperBoundMs,next.digestComposition.currentDurationMs+next.digestComposition.addedContextDurationMs);
    assert.deepEqual([await readFile(statePath),await directoryBytes(f)],before);assert.deepEqual(await get(f),next);
  }
});
test('same save retried in parallel is idempotent; already adopted and requested scenes are no-ops',async()=>{
  const f=fixtures[0];await activate(f);const saved=JSON.parse((await edits()).toString()).requests.find(r=>r.requestDraftId===f.draft.id);
  const before=await edits();const body={draftIdentity:saved.draftIdentity,fingerprint:saved.confirmationFingerprint,candidateId:saved.candidateId};
  const replies=await Promise.all([api(f,'ui-digest-scene-additions',body),api(f,'ui-digest-scene-additions',body)]);
  assert(replies.every(r=>r.status===200&&r.body.changed===false&&r.body.editRequest.id===saved.id));assert.deepEqual(await edits(),before);
  const m=await get(f);for(const id of ['candidate-0001','candidate-0002']){const r=await api(f,'ui-digest-scene-additions',input(m,id));assert.equal(r.status,200);assert.equal(r.body.changed,false);}
  assert.deepEqual(await edits(),before);
});
test('editing request reconstruction failure clears qualified input and audio checks without saving anything',async()=>{
  const f=fixtures[0];await activate(f);const current=await get(f);
  assert.equal(current.digestPreparation.status,'verified');assert.equal(current.creationChecks.audioPreservation,'preserve-source-only');
  assert.equal(current.creationChecks.sourceAudioReference,'registered');assert.equal(current.digestComposition.status,'revision_requested');
  const original=await edits(),corrupt=JSON.parse(original.toString());
  const request=corrupt.requests.find(r=>r.requestDraftId===f.draft.id);
  // Structurally valid add-one request, but its before/after set does not match the formally qualified base.
  request.beforeCandidateIds=['absent'];request.requestedCandidateIds=['absent',request.candidateId];
  await writeFile(editPath,JSON.stringify(corrupt));
  try {
    const before=[await readFile(statePath),await edits(),await directoryBytes(f)],rejected=await get(f);
    assert.equal(rejected.digestPreparation.status,'rejected');assert.deepEqual(rejected.candidates,[]);
    assert.deepEqual(rejected.segments,[]);assert.deepEqual(rejected.bindings,[]);assert.equal(rejected.digestComposition,undefined);
    assert.equal(rejected.creationChecks.inputValidation,'failed');assert.equal(rejected.creationChecks.audioPreservation,'unknown');
    assert.equal(rejected.creationChecks.sourceAudioReference,'unknown');
    assert.deepEqual(rejected.creationChecks,{...current.creationChecks,inputValidation:'failed',audioPreservation:'unknown',sourceAudioReference:'unknown'});
    assert(rejected.blockers.some(s=>s.includes('再登録が必要')));
    assert.deepEqual([await readFile(statePath),await edits(),await directoryBytes(f)],before);
    await rejectUnchanged(f,input(current));
  } finally {await writeFile(editPath,original);}
  const restored=await get(f);assert.equal(restored.digestComposition.status,'revision_requested');
  assert.equal(restored.creationChecks.inputValidation,'failed');assert(restored.blockers.some(s=>s.includes('旧準備では作成前確認へ進めません')));
  assert(restored.blockers.some(s=>s.includes('動画作成の承認・製造経路は未接続')));
});
test('stale or missing choices, extra authority fields and agent credentials cannot save',async()=>{
  const f=fixtures[0];await activate(f);const m=await get(f);
  await rejectUnchanged(f,{...input(m),fingerprint:'stale'});await rejectUnchanged(f,{...input(m),candidateId:'absent'});
  await rejectUnchanged(f,{...input(m),draftIdentity:'other'});await rejectUnchanged(f,{...input(m),job:{approved:true}});
  await rejectUnchanged(f,input(m),'isolated-edit-agent');
});
test('changed source or manifest bytes invalidate current choices without writing or retrying preparation',async()=>{
  const f=fixtures[0];await activate(f);const m=await get(f);
  const changed=structuredClone(f.state);changed.requestDrafts[0].source.uri='file:///another-artificial-source.mp4';await saveState(changed);await rejectUnchanged(f,input(m));
  await saveState(f.state);const p=path.join(f.parameters.inputRoot,f.manifestBinding.path),before=await readFile(p);await writeFile(p,Buffer.concat([before,Buffer.from('\n')]));
  try{await rejectUnchanged(f,input(m));const stale=await get(f);assert.equal(stale.digestPreparation.status,'rejected');assert.equal(stale.digestComposition,undefined);assert.deepEqual(stale.candidates,[]);}finally{await writeFile(p,before);}
});
test('new formally qualified base never silently fulfills an older human request',async()=>{
  const f=fixtures[0],other=await createFixtureWorkspace();areas.push(other);const next=await makeDigestUiFixture(other,'a','first-only');
  const before=await edits();const m=await activate(next);assert.equal(m.digestPreparation.status,'verified');assert.equal(m.digestComposition.status,'source_changed');
  assert.equal(m.creationChecks.inputValidation,'failed');await rejectUnchanged(next,input(m));assert.deepEqual(await edits(),before);
  await activate(f);
});
test('overlapping context is refused rather than silently dropping or replacing another scene',async()=>{
  const f=fixtures[0];await activate(f);const m=await get(f);const synthetic=structuredClone(m);
  synthetic.digestComposition.requestedCandidateIds=['candidate-0001'];synthetic.candidates[1].ranges=synthetic.candidates[0].ranges;
  synthetic.fingerprint='overlap-unit';const before=await edits();await assert.rejects(()=>saveDigestSceneAddition(synthetic,input(synthetic)),/重複/);assert.deepEqual(await edits(),before);
});
test('new backend process rereads the editing request and retains the preparation blocker',async()=>{
  const f=fixtures[1];await activate(f);
  const command=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {buildUiReviewMaterials} from './dist/domain/ui-review.js';const m=await buildUiReviewMaterials(await loadState(),'${f.draft.id}',await loadRuntimeConfig());if(m.digestComposition?.status!=='revision_requested'||m.creationChecks?.inputValidation!=='failed')throw new Error(JSON.stringify(m));process.stdout.write(JSON.stringify({status:m.digestComposition.status,added:m.digestComposition.addedCandidateIds}));`;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',command],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).status,'revision_requested');
});

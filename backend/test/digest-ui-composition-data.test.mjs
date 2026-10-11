import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';
const area=await createFixtureWorkspace();let server;
after(async()=>{if(server)await new Promise(r=>server.close(r));await area.cleanup();});
process.env.ZEV2_RUNTIME_DIR=area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH=path.join(area.runtime,'config.json');
process.env.ZEV2_WORKSPACE_ROOT=workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.ZEV2_HUMAN_API_TOKEN='isolated-composition-human';process.env.ZEV2_AGENT_API_TOKEN='isolated-composition-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},editPlan:{mode:'gemini'},adjustment:{mode:'fixed'},
  videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''}}));
const {default:router}=await import('../src/routes/control.ts'),{saveState}=await import('../src/store/json-store.ts');
const fixtures=[await makeDigestUiFixture(area,'a','first-only'),await makeDigestUiFixture(area,'b','first-only')],saved=new Map();
const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const origin=`http://127.0.0.1:${server.address().port}/api`,statePath=path.join(area.runtime,'state.json'),editPath=path.join(area.runtime,'ui-digest-edit-requests.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function api(f,endpoint,body,token='isolated-composition-human'){
  const r=await fetch(`${origin}/request-drafts/${f.draft.id}/${endpoint}`,{method:body===undefined?'GET':'POST',
    headers:{'content-type':'application/json',authorization:`Bearer ${token}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json()};
}
const current=async f=>{const r=await api(f,'ui-review');assert.equal(r.status,200);return r.body;};
const confirmation=m=>({draftIdentity:m.draftIdentity,fingerprint:m.fingerprint});
async function activate(f){await saveState(f.state);const r=await api(f,'ui-digest-preparation',f.body);assert.equal(r.status,200,JSON.stringify(r.body));return r.body.materials;}
async function files(f){const out={};for(const name of (await readdir(f.directory)).sort())out[name]=sha(await readFile(path.join(f.directory,name)));return out;}
async function compositionInventory(f,before,after,result,t){
  const json=[path.basename(result.snapshotBinding.path),path.basename(result.compositionBinding.path)].sort();
  assert.equal(new Set(json).size,2);
  assert(json.every(n=>!Object.hasOwn(before,n)&&Object.hasOwn(after,n)),'Expected two new composition JSON files');
  const added=Object.keys(after).filter(n=>!Object.hasOwn(before,n)).sort(),metadata=[];
  for(const name of added){
    if(json.includes(name))continue;
    assert(json.some(n=>name===`._${n}`),`Unexpected added file: ${name}`);
    const p=path.join(f.directory,name),info=await lstat(p);
    assert(info.isFile()&&!info.isSymbolicLink()&&info.nlink===1,'AppleDouble must be a regular single-link file');
    const b=await readFile(p);assert.equal(sha(b),after[name]);assert(b.length>=26,'AppleDouble header missing');
    assert.equal(b.readUInt32BE(0),0x00051607,'AppleDouble magic');
    assert.equal(b.readUInt32BE(4),0x00020000,'AppleDouble version');
    const count=b.readUInt16BE(24),tableEnd=26+12*count;
    assert(count>0&&tableEnd<=b.length,'AppleDouble entry table bounds');
    const ids=new Set(),ranges=[];
    for(let i=0;i<count;i++){
      const at=26+12*i,id=b.readUInt32BE(at),start=b.readUInt32BE(at+4),end=start+b.readUInt32BE(at+8);
      assert(id>0&&!ids.has(id),'AppleDouble duplicate/invalid entry ID');ids.add(id);
      assert(start>=tableEnd&&end<=b.length,`AppleDouble entry bounds: ${start}..${end}/${b.length}`);
      ranges.push({start,end});
    }
    ranges.sort((a,b)=>a.start-b.start||a.end-b.end);
    for(let i=1;i<ranges.length;i++)assert(ranges[i-1].end<=ranges[i].start,'AppleDouble overlapping entries');
    metadata.push({name,sizeBytes:b.length,sha256:sha(b)});
  }
  assert.deepEqual(added,[...json,...metadata.map(v=>v.name)].sort());
  t.diagnostic(JSON.stringify({filesystemAuxiliaryFiles:metadata}));
}
async function unchanged(f,operation,status=409){const before=[await readFile(statePath),await readFile(editPath),await files(f)];
  const r=await operation();assert.equal(r.status,status,JSON.stringify(r.body));assert.deepEqual([await readFile(statePath),await readFile(editPath),await files(f)],before);return r;}
const reader=(f,result)=>api(f,`ui-digest-composition-data/${result.requestHash}`);

test('current additions in A/B produce only two immutable JSON files, keep original adoption and original AI reject reason',async t=>{
  for(const f of fixtures){
    const m=await activate(f),add=await api(f,'ui-digest-scene-additions',{...confirmation(m),candidateId:'candidate-0002'});assert.equal(add.status,200);
    const pending=await current(f),before=[await readFile(statePath),await readFile(editPath)],originalFiles=await files(f);
    assert.equal(pending.digestComposition.status,'revision_requested');
    const replies=await Promise.all([api(f,'ui-digest-composition-data',confirmation(pending)),api(f,'ui-digest-composition-data',confirmation(pending))]);
    assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.deepEqual(replies[0].body,replies[1].body);
    const result=replies[0].body;saved.set(f.draft.id,result);
    assert.equal(result.status,'composition-data-only');assert.equal(result.requestHash,result.snapshotBinding.fileSha256);
    assert.deepEqual(result.representedEditRequestIds,pending.digestComposition.editRequestIds);
    assert.deepEqual(result.composition.beforeCandidateIds,['candidate-0001']);assert.deepEqual(result.composition.requestedCandidateIds,['candidate-0001','candidate-0002']);
    assert.deepEqual(result.composition.scenes.map(s=>s.candidateId),['candidate-0001','candidate-0002']);
    assert.deepEqual(result.composition.scenes.map(s=>s.inclusion.kind),['original-ai-adoption','human-addition']);
    assert.deepEqual(result.composition.scenes.map(s=>s.originalAiJudgment.decision),['adopt','reject']);
    const snapshot=JSON.parse(await readFile(path.join(area.runtime,result.snapshotBinding.path),'utf8'));
    assert.deepEqual(snapshot.requests,[add.body.editRequest]);assert.deepEqual(snapshot.sourceBasis,pending.digestComposition.basis);
    const selectionFile=f.plan.id+'--selection-adoption.json',originalSelection=JSON.parse(await readFile(path.join(f.directory,selectionFile),'utf8'));
    assert.deepEqual(result.composition.scenes[1].originalAiJudgment,originalSelection.rejectedCandidates[0].judgment);
    assert.deepEqual(result.composition.admission,{sourceRanges:'candidate-context-only',retention:'not-prepared',captionPreparation:'not-prepared',executionPermission:'not-approved',humanQuality:'pending'});
    assert.equal(sha(await readFile(path.join(area.runtime,result.snapshotBinding.path))),result.snapshotBinding.fileSha256);
    assert.equal(sha(await readFile(path.join(area.runtime,result.compositionBinding.path))),result.compositionBinding.fileSha256);
    const afterFiles=await files(f);await compositionInventory(f,originalFiles,afterFiles,result,t);
    for(const [name,hash]of Object.entries(originalFiles))assert.equal(afterFiles[name],hash);
    assert.deepEqual([await readFile(statePath),await readFile(editPath)],before);
    assert.deepEqual(await current(f),pending);assert.deepEqual((await reader(f,result)).body,result);
  }
  assert.notEqual(saved.get('digest-a').requestHash,saved.get('digest-b').requestHash);
});
test('human auth, stale confirmation, extra execution fields and another source cannot write or re-read',async()=>{
  const f=fixtures[0];await activate(f);const m=await current(f),result=saved.get(f.draft.id);
  await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m),'isolated-composition-agent'),401);
  await unchanged(f,()=>api(f,`ui-digest-composition-data/${result.requestHash}`,undefined,'isolated-composition-agent'),401);
  await unchanged(f,()=>api(f,'ui-digest-composition-data',{...confirmation(m),fingerprint:'old-chain'}));
  await unchanged(f,()=>api(f,'ui-digest-composition-data',{...confirmation(m),job:{approved:true}}));
  await unchanged(f,()=>api(f,`ui-digest-composition-data/${saved.get('digest-b').requestHash}`));
  const changed=structuredClone(f.state);changed.requestDrafts[0].source.uri='file:///different-artificial-source.mp4';await saveState(changed);
  try{await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m)));await unchanged(f,()=>reader(f,result));}finally{await saveState(f.state);}
});
test('snapshot or composition tampering is refused on read and repeat save, without repair or overwrite',async()=>{
  const f=fixtures[0];await activate(f);const m=await current(f),result=saved.get(f.draft.id);
  for(const binding of [result.snapshotBinding,result.compositionBinding]){
    const p=path.join(area.runtime,binding.path),original=await readFile(p);await writeFile(p,Buffer.concat([original,Buffer.from('\n')]));
    try{await unchanged(f,()=>reader(f,result));await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m)));}finally{await writeFile(p,original);}
  }
});
test('a changed chain hash cannot silently reuse the former snapshot or old displayed confirmation',async()=>{
  const f=fixtures[0];await activate(f);const m=await current(f),result=saved.get(f.draft.id),original=await readFile(editPath),changed=JSON.parse(original.toString());
  changed.requests.find(r=>r.requestDraftId===f.draft.id).id+='-changed-chain';await writeFile(editPath,JSON.stringify(changed));
  try{await unchanged(f,()=>reader(f,result));await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m)));}finally{await writeFile(editPath,original);}
  assert.equal((await reader(f,result)).status,200);
});
test('duplicate, reversed order and mismatched before sets are rejected before saving a snapshot',async()=>{
  const f=fixtures[0];await activate(f);const m=await current(f),original=await readFile(editPath);
  for(const corrupt of ['duplicate','reversed','wrong-before']){
    const store=JSON.parse(original.toString()),r=store.requests.find(v=>v.requestDraftId===f.draft.id);
    if(corrupt==='duplicate')r.requestedCandidateIds.push(r.candidateId);
    if(corrupt==='reversed')r.requestedCandidateIds.reverse();
    if(corrupt==='wrong-before'){r.beforeCandidateIds=['absent'];r.requestedCandidateIds=['absent',r.candidateId];}
    await writeFile(editPath,JSON.stringify(store));try{await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m)));}finally{await writeFile(editPath,original);}
  }
});
test('source graph bytes are requalified; original AI changes cannot be hidden in a data revision',async()=>{
  const f=fixtures[0];await activate(f);const m=await current(f),result=saved.get(f.draft.id),p=path.join(f.directory,f.plan.id+'--selection-adoption.json'),original=await readFile(p);
  const selection=JSON.parse(original.toString());selection.rejectedCandidates[0].judgment.reason='tampered artificial reason';await writeFile(p,JSON.stringify(selection));
  try{await unchanged(f,()=>reader(f,result));await unchanged(f,()=>api(f,'ui-digest-composition-data',confirmation(m)));}finally{await writeFile(p,original);}
});
test('new compiled backend process reconstructs the saved chain and result without changing its files',async()=>{
  const f=fixtures[1];await activate(f);const result=saved.get(f.draft.id),before=[await readFile(statePath),await readFile(editPath),await files(f)];
  const command=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {readDigestUiCompositionData} from './dist/domain/digest-ui-composition-data.js';process.stdout.write(JSON.stringify(await readDigestUiCompositionData(await loadState(),'${f.draft.id}',await loadRuntimeConfig(),'${result.requestHash}')));`;
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',command],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),result);
  assert.deepEqual([await readFile(statePath),await readFile(editPath),await files(f)],before);
});

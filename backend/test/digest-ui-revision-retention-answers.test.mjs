import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir, lstat, unlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { digestArtifactFileNameV001 } from '@zev2/shared';
import { formal } from '../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';

// Existing isolated SSD JSON fixture and frozen normal readers. No provider, STT or playable media.
const area = await createFixtureWorkspace();let server;
after(async () => { if (server) await new Promise(r => server.close(r));await area.cleanup(); });
process.env.ZEV2_RUNTIME_DIR=area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH=path.join(area.runtime,'config.json');
process.env.ZEV2_WORKSPACE_ROOT=workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.ZEV2_HUMAN_API_TOKEN='retention-answer-human';process.env.ZEV2_AGENT_API_TOKEN='retention-answer-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},
  editPlan:{mode:'gemini'},adjustment:{mode:'fixed'},videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},
  source:{defaultUri:'',defaultPurpose:''}}));
const {default:router}=await import('../src/routes/control.ts'),{saveState}=await import('../src/store/json-store.ts');
const fixtures=[await makeDigestUiFixture(area,'a','first-only'),await makeDigestUiFixture(area,'b','first-only')];
const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const origin=`http://127.0.0.1:${server.address().port}/api`,statePath=path.join(area.runtime,'state.json'),
  editPath=path.join(area.runtime,'ui-digest-edit-requests.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function call(route,body,token='retention-answer-agent') {
  const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',
    ...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
}
const human=(f,route,body)=>call(`/request-drafts/${f.draft.id}/${route}`,body,'retention-answer-human');
const caller=(f,suffix,body,token)=>call(`/agent-digest-retention/${f.draft.id}/${f.composition.requestHash}/${suffix}`,body,token);
async function activate(f) {await saveState(f.state);const r=await human(f,'ui-digest-preparation',f.body);assert.equal(r.status,200,JSON.stringify(r.body));}
async function inventory(f) {const out={};for(const name of (await readdir(f.directory)).sort())out[name]=sha(await readFile(path.join(f.directory,name)));return out;}
const immutable=async f=>[await readFile(statePath),await readFile(editPath),await inventory(f)];
async function refused(f,operation,status=409) {const before=await immutable(f),r=await operation();assert.equal(r.status,status,JSON.stringify(r.body));assert.deepEqual(await immutable(f),before);return r;}
const physical=(f,b)=>path.join(f.directory,digestArtifactFileNameV001(b.path,f.draft.id));
const answerBody=(f,response=f.response)=>({draftIdentity:f.materials.draftIdentity,fingerprint:f.materials.fingerprint,
  preparationHash:f.inputs.binding.fileSha256,requestId:f.inputs.bundle.requests[0].request.requestId,response});
function artificialResponse(item) {
  const c=item.request.input.candidates[0],ids=c.utterances.flatMap(u=>u.atoms.map(a=>a.sourceSegmentId));assert(ids.length>=3);
  return {schemaVersion:'candidate-internal-retention-response-v001',requestFileSha256:item.requestFileSha256,
    answer:{status:'complete',candidates:[{candidateId:c.candidateId,meaningPreserved:'人工入力の前後の意味を保持',blocks:[
      {action:'keep',startSourceSegmentId:ids[0],endSourceSegmentId:ids[0],roles:['lead-in'],reason:'人工の導入'},
      {action:'drop',startSourceSegmentId:ids[1],endSourceSegmentId:ids[1],roles:['dispensable'],reason:'人工の省略'},
      {action:'keep',startSourceSegmentId:ids[2],endSourceSegmentId:ids.at(-1),roles:['payoff'],reason:'人工の結び'}]}]},
    judgmentNote:'手元の人工回答。生成・通信しない'};
}

test('full caller input reuses current saved A/B bundles; ordinary UI exposes its unchanged summary only',async()=>{
  for(const f of fixtures) {
    await activate(f);const initial=(await human(f,'ui-review')).body;
    assert.equal((await human(f,'ui-digest-scene-additions',{draftIdentity:initial.draftIdentity,fingerprint:initial.fingerprint,candidateId:'candidate-0002'})).status,200);
    f.materials=(await human(f,'ui-review')).body;
    const confirmation={draftIdentity:f.materials.draftIdentity,fingerprint:f.materials.fingerprint};
    const c=await human(f,'ui-digest-composition-data',confirmation);assert.equal(c.status,200);f.composition=c.body;
    const prepared=await human(f,'ui-digest-additional-retention-inputs',{...confirmation,requestHash:c.body.requestHash});assert.equal(prepared.status,200);
    const before=await immutable(f),r=await caller(f,'inputs');assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.cache,'no-store');f.inputs=r.body;
    const raw=await readFile(path.join(area.runtime,r.body.binding.path));assert.equal(sha(raw),r.body.binding.fileSha256);assert.deepEqual(JSON.parse(raw.toString()),r.body.bundle);
    assert.equal(r.body.binding.fileSha256,prepared.body.preparationHash);assert.equal(r.body.bundle.requests.length,1);
    assert.equal(r.body.bundle.requests[0].requestFileSha256,sha(formal(r.body.bundle.requests[0].request)));
    const ui=(await human(f,`ui-digest-additional-retention-inputs/${c.body.requestHash}`)).body;
    assert(!Object.hasOwn(ui,'bundle'));assert(!Object.hasOwn(ui,'originalRetentionBindings'));assert(!JSON.stringify(ui).includes('retention-request.json'));
    assert.deepEqual(await immutable(f),before);f.response=artificialResponse(r.body.bundle.requests[0]);f.baseline=await inventory(f);
  }
  assert.notEqual(fixtures[0].inputs.binding.fileSha256,fixtures[1].inputs.binding.fileSha256);
});

test('full input and supplied answers require configured agent auth; human UI token cannot substitute',async()=>{
  const f=fixtures[0];await activate(f);
  for(const token of ['', 'wrong', 'retention-answer-human']) {
    await refused(f,()=>caller(f,'inputs',undefined,token),401);
    await refused(f,()=>caller(f,'answers',answerBody(f),token),401);
    await refused(f,()=>caller(f,`answers/${'a'.repeat(64)}`,undefined,token),401);
  }
  await refused(f,()=>call(`/request-drafts/${f.draft.id}/ui-digest-additional-retention-inputs/${f.composition.requestHash}`),401);
  const token=process.env.ZEV2_AGENT_API_TOKEN;delete process.env.ZEV2_AGENT_API_TOKEN;
  try {for(const suffix of ['inputs',`answers/${'a'.repeat(64)}`])await refused(f,()=>caller(f,suffix),503);
    await refused(f,()=>caller(f,'answers',answerBody(f)),503);
  } finally {process.env.ZEV2_AGENT_API_TOKEN=token;}
});

test('A/B supplied answers pass the existing provenance/IDs/cut validator and save one immutable record on repeated clicks',async t=>{
  for(const f of fixtures) {
    await activate(f);const before=await immutable(f),body=answerBody(f);
    const replies=await Promise.all([caller(f,'answers',body),caller(f,'answers',body)]);
    assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.deepEqual(replies[0].body,replies[1].body);f.accepted=replies[0].body;
    assert.equal(f.accepted.status,'answer-validated-only');assert.deepEqual(f.accepted.admission,f.inputs.bundle.admission);
    assert.equal(f.accepted.admission.retentionIntegration,'not-prepared');assert.equal(f.accepted.admission.captionPreparation,'not-prepared');
    assert.equal(f.accepted.admission.executionPermission,'not-approved');assert.equal(f.accepted.admission.humanQuality,'pending');
    const raw=await readFile(path.join(area.runtime,f.accepted.binding.path));assert.equal(sha(raw),f.accepted.answerHash);
    const read=await caller(f,`answers/${f.accepted.answerHash}`);assert.equal(read.status,200,JSON.stringify(read.body));f.record=read.body.record;
    assert.deepEqual(f.record.response,f.response);assert.deepEqual(f.record.result.answer,f.response.answer);assert.equal(f.record.validation.status,'resolved');
    assert.equal(f.record.validation.segments.length,2);assert.equal(f.record.validation.candidates[0].blocks[1].action,'drop');
    assert.deepEqual(f.record.preparationBinding,f.inputs.binding);assert.equal(f.record.requestFileSha256,f.inputs.bundle.requests[0].requestFileSha256);
    const afterFiles=await inventory(f),filename=path.basename(f.accepted.binding.path),added=Object.keys(afterFiles).filter(n=>!Object.hasOwn(before[2],n));
    assert(added.includes(filename));assert(added.every(n=>n===filename||n===`._${filename}`));
    for(const n of added) {const st=await lstat(path.join(f.directory,n));assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);
      if(n.startsWith('._')) {const b=await readFile(path.join(f.directory,n));assert.equal(b.readUInt32BE(0),0x00051607);assert.equal(b.readUInt32BE(4),0x00020000);}}
    for(const [n,h] of Object.entries(before[2]))assert.equal(afterFiles[n],h,`Changed original ${n}`);
    assert.deepEqual([await readFile(statePath),await readFile(editPath)],before.slice(0,2));assert.deepEqual((await caller(f,'inputs')).body,f.inputs);
    t.diagnostic(JSON.stringify({draft:f.draft.id,requestHash:f.composition.requestHash,requestFileSha256:f.record.requestFileSha256,answerHash:f.accepted.answerHash,newFiles:added}));
  }
});

test('wrong full-request SHA, invented authority, incomplete text and invalid keep/drop answers are refused without writes',async()=>{
  const f=fixtures[0];await activate(f);const old=JSON.parse(await readFile(physical(f,f.inputs.bundle.originalRetentionBindings.response),'utf8'));
  const changes=[r=>r.requestFileSha256=f.inputs.bundle.requests[0].request.inputCanonicalSha256,
    r=>r.requestFileSha256=fixtures[1].response.requestFileSha256,r=>r.requestFileSha256=old.requestFileSha256,
    r=>r.executionPermission='approved',r=>r.answer={status:'abstained',reason:'人工棄権'},
    r=>r.answer.candidates[0].candidateId='candidate-0001',r=>r.answer.candidates[0].meaningPreserved='',
    r=>r.answer.candidates[0].blocks[0].startSourceSegmentId=999999,
    r=>r.answer.candidates[0].blocks.splice(1,1),
    r=>r.answer.candidates[0].blocks[1].startSourceSegmentId=r.answer.candidates[0].blocks[0].startSourceSegmentId,
    r=>r.answer.candidates[0].blocks[2].endSourceSegmentId=r.answer.candidates[0].blocks[0].endSourceSegmentId,
    r=>r.answer.candidates[0].blocks.forEach(b=>{b.action='drop';b.roles=['dispensable'];})];
  for(const change of changes) {const r=structuredClone(f.response);change(r);await refused(f,()=>caller(f,'answers',answerBody(f,r)));}
  await refused(f,()=>caller(f,'answers',answerBody(f,old)));
});

test('stale confirmation, wrong bundle/request and extra execution fields cannot save an answer',async()=>{
  const f=fixtures[0];await activate(f);const b=answerBody(f);
  for(const changed of [{...b,draftIdentity:'stale'},{...b,fingerprint:'stale'},{...b,preparationHash:fixtures[1].inputs.binding.fileSha256},
    {...b,requestId:fixtures[1].inputs.bundle.requests[0].request.requestId},{...b,approve:true}])await refused(f,()=>caller(f,'answers',changed));
  await refused(f,()=>call(`/agent-digest-retention/${f.draft.id}/${fixtures[1].composition.requestHash}/inputs`));
  await refused(f,()=>caller(f,`answers/${fixtures[1].accepted.answerHash}`));
});

test('missing/tampered bundle, original source and saved answer reject without repair or overwrite',async()=>{
  const f=fixtures[0];await activate(f);
  const files=[path.join(area.runtime,f.inputs.binding.path),path.join(area.runtime,f.composition.snapshotBinding.path),
    physical(f,f.inputs.bundle.originalRetentionBindings.response),physical(f,f.inputs.bundle.sourceBindings.transcript),
    path.join(area.runtime,f.accepted.binding.path)];
  for(const file of files) {
    const original=await readFile(file);await writeFile(file,Buffer.concat([original,Buffer.from('\n')]));
    try {await refused(f,()=>caller(f,'answers',answerBody(f)));await refused(f,()=>caller(f,`answers/${f.accepted.answerHash}`));
      if(file!==path.join(area.runtime,f.accepted.binding.path))await refused(f,()=>caller(f,'inputs'));
    } finally {await writeFile(file,original);}
    if(file!==path.join(area.runtime,f.accepted.binding.path)) {
      await unlink(file);try {await refused(f,()=>caller(f,'answers',answerBody(f)));await refused(f,()=>caller(f,'inputs'));}
      finally {await writeFile(file,original);}
    }
  }
  const file=path.join(area.runtime,f.accepted.binding.path),raw=await readFile(file);await unlink(file);await symlink(physical(f,f.inputs.bundle.originalRetentionBindings.response),file);
  try {const beforeOriginal=await readFile(physical(f,f.inputs.bundle.originalRetentionBindings.response));
    const r=await caller(f,'answers',answerBody(f));assert.equal(r.status,409);assert((await lstat(file)).isSymbolicLink());
    assert.deepEqual(await readFile(physical(f,f.inputs.bundle.originalRetentionBindings.response)),beforeOriginal);
  } finally {await unlink(file);await writeFile(file,raw);}
});

test('a changed current request or composition chain preserves old accepted bytes but refuses their application',async()=>{
  const f=fixtures[0];await activate(f);const savedFile=path.join(area.runtime,f.accepted.binding.path),saved=await readFile(savedFile);
  for(const field of ['purpose','source']) {
    const state=structuredClone(f.state);if(field==='purpose')state.requestDrafts[0].purpose+=' different';else state.requestDrafts[0].source.uri='file:///another-artificial.mp4';
    await saveState(state);try {await refused(f,()=>caller(f,'inputs'));await refused(f,()=>caller(f,'answers',answerBody(f)));await refused(f,()=>caller(f,`answers/${f.accepted.answerHash}`));}
    finally {await saveState(f.state);}assert.deepEqual(await readFile(savedFile),saved);
  }
  const original=await readFile(editPath),edits=JSON.parse(original.toString());edits.requests.find(r=>r.requestDraftId===f.draft.id).id+='-new-version';
  await writeFile(editPath,JSON.stringify(edits));try {await refused(f,()=>caller(f,'inputs'));await refused(f,()=>caller(f,'answers',answerBody(f)));await refused(f,()=>caller(f,`answers/${f.accepted.answerHash}`));}
  finally {await writeFile(editPath,original);}assert.deepEqual(await readFile(savedFile),saved);
  assert.equal((await caller(f,`answers/${f.accepted.answerHash}`)).status,200);
});

test('a fresh compiled backend process requalifies B full input and saved answer with no state/queue/original writes',async()=>{
  const f=fixtures[1];await activate(f);const before=await immutable(f);
  const code=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {readDigestUiRetentionCallerInputs,readDigestUiRetentionCallerAnswer} from './dist/domain/digest-ui-composition-data.js';const s=await loadState(),c=await loadRuntimeConfig();process.stdout.write(JSON.stringify({inputs:await readDigestUiRetentionCallerInputs(s,${JSON.stringify(f.draft.id)},c,${JSON.stringify(f.composition.requestHash)}),answer:await readDigestUiRetentionCallerAnswer(s,${JSON.stringify(f.draft.id)},c,${JSON.stringify(f.composition.requestHash)},${JSON.stringify(f.accepted.answerHash)})}));`;
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);const out=JSON.parse(child.stdout);assert.deepEqual(out.inputs,f.inputs);assert.deepEqual(out.answer.record,f.record);
  assert.deepEqual(await immutable(f),before);
  for(const variant of fixtures)for(const [name,h] of Object.entries(variant.baseline))assert.equal((await inventory(variant))[name],h,`Original changed ${name}`);
});

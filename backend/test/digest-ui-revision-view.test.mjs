import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir, lstat, readlink, unlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { digestArtifactFileNameV001 } from '@zev2/shared';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';

// Existing isolated SSD/JSON fixture. No provider call, source decode, renderer, or formal production state.
const area=await createFixtureWorkspace();let server;
after(async()=>{if(server)await new Promise(r=>server.close(r));await area.cleanup();});
process.env.ZEV2_RUNTIME_DIR=area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH=path.join(area.runtime,'config.json');
process.env.ZEV2_WORKSPACE_ROOT=workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.ZEV2_HUMAN_API_TOKEN='revision-view-human';process.env.ZEV2_AGENT_API_TOKEN='revision-view-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},
  editPlan:{mode:'gemini'},adjustment:{mode:'fixed'},videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''}}));
const {default:router}=await import('../src/routes/control.ts'),{saveState}=await import('../src/store/json-store.ts');
const fixtures=[await makeDigestUiFixture(area,'a','first-only'),await makeDigestUiFixture(area,'b','first-only'),
  await makeDigestUiFixture(area,'b','first-only',{candidateCount:3,idSuffix:'-view-multi'})];
const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}/api`;
const sha=b=>createHash('sha256').update(b).digest('hex'),registrationPath=path.join(area.runtime,'ui-digest-preparations.json');
async function call(route,body,token='revision-view-agent') {
  const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',
    ...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
}
const human=(f,route,body)=>call(`/request-drafts/${f.draft.id}/${route}`,body,'revision-view-human');
const caller=(f,suffix,body,token)=>call(`/agent-digest-retention/${f.draft.id}/${f.composition.requestHash}/${suffix}`,body,token);
const readRevision=f=>caller(f,`revision-preparation/${f.prepared.preparationHash}?outputRoot=${encodeURIComponent(f.writer.output.outputRoot)}`);
const physical=(f,b)=>path.join(f.directory,digestArtifactFileNameV001(b.path,f.draft.id));
async function inventory(root) {
  const out={};async function walk(dir){for(const name of (await readdir(dir)).sort()) {
    const p=path.join(dir,name),key=path.relative(root,p),s=await lstat(p);
    if(s.isSymbolicLink())out[key]=`link:${await readlink(p)}`;
    else if(s.isDirectory()){out[key]='directory';await walk(p);}else out[key]=sha(await readFile(p));
  }}await walk(root);return out;
}
const everything=()=>inventory(area.inputRoot);
async function activate(f){await saveState(f.state);const r=await human(f,'ui-digest-preparation',f.body);assert.equal(r.status,200,JSON.stringify(r.body));}
async function refused(operation,status=409){const before=await everything(),r=await operation();assert.equal(r.status,status,JSON.stringify(r.body));assert.deepEqual(await everything(),before);return r;}
function response(item) {
  const c=item.request.input.candidates[0],ids=c.utterances.flatMap(u=>u.atoms.map(a=>a.sourceSegmentId));assert(ids.length>=3);
  return {schemaVersion:'candidate-internal-retention-response-v001',requestFileSha256:item.requestFileSha256,
    answer:{status:'complete',candidates:[{candidateId:c.candidateId,meaningPreserved:'人工前後を保持',blocks:[
      {action:'keep',startSourceSegmentId:ids[0],endSourceSegmentId:ids[0],roles:['lead-in'],reason:'人工導入'},
      {action:'drop',startSourceSegmentId:ids[1],endSourceSegmentId:ids[1],roles:['dispensable'],reason:'人工省略'},
      {action:'keep',startSourceSegmentId:ids[2],endSourceSegmentId:ids.at(-1),roles:['payoff'],reason:'人工結び'}]}]},judgmentNote:'保存人工回答。APIなし'};
}
function notReflected(m){assert.notEqual(m.digestRevision?.status,'verified');assert(!m.digestRevision||!m.digestRevision.appliedEdits.length);}

test('A/B and two additions prepare qualified current human manifests while UI remains unreflected until explicit reference registration',async()=>{
  for(const f of fixtures){
    f.originalFiles=await inventory(f.directory);f.sourceBytes=await readFile(new URL(f.draft.source.uri));await activate(f);
    for(const c of (await human(f,'ui-review')).body.candidates.slice(1)) {
      const m=(await human(f,'ui-review')).body;
      assert.equal((await human(f,'ui-digest-scene-additions',{draftIdentity:m.draftIdentity,fingerprint:m.fingerprint,candidateId:c.id})).status,200);
    }
    const m=(await human(f,'ui-review')).body;f.materials=m;notReflected(m);
    const confirmation={draftIdentity:m.draftIdentity,fingerprint:m.fingerprint};
    const comp=await human(f,'ui-digest-composition-data',confirmation);assert.equal(comp.status,200);f.composition=comp.body;
    assert.equal((await human(f,'ui-digest-additional-retention-inputs',{...confirmation,requestHash:f.composition.requestHash})).status,200);
    const inputs=await caller(f,'inputs');assert.equal(inputs.status,200);f.inputs=inputs.body;f.answers=[];
    for(const item of f.inputs.bundle.requests){const r=await caller(f,'answers',{...confirmation,preparationHash:f.inputs.binding.fileSha256,
      requestId:item.request.requestId,response:response(item)});assert.equal(r.status,200,JSON.stringify(r.body));f.answers.push({requestId:item.request.requestId,answerHash:r.body.answerHash,binding:r.body.binding});}
    const preparationId=`artificial-view-${f.draft.id}`,scopePath='docs/reports/zev-ui-b-implementation-20261011/revision-integration-connection.md';
    f.writer={...confirmation,preparationHash:f.inputs.binding.fileSha256,answers:f.answers.map(({requestId,answerHash})=>({requestId,answerHash})),
      output:{preparationId,outputRoot:path.join(area.inputRoot,area.prefix,preparationId),scopeBinding:{path:scopePath,fileSha256:sha(await readFile(path.join(workspace,scopePath)))}}};
    const prepared=await caller(f,'revision-preparation',f.writer);assert.equal(prepared.status,200,JSON.stringify(prepared.body));f.prepared=prepared.body;
    const r=await readRevision(f);assert.equal(r.status,200);f.revision=r.body;
    f.reference={...confirmation,outputRoot:f.writer.output.outputRoot,manifestBinding:f.prepared.manifestBinding};
    notReflected((await human(f,'ui-review')).body);
  }
});

test('explicit reference registration changes only the existing preparation record, is idempotent, and every UI GET matches current full outputs',async t=>{
  for(const f of fixtures){await activate(f);const before=await everything();
    const r=await caller(f,'revision-reference',f.reference);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.cache,'no-store');
    assert.equal(r.body.status,'reference-saved');assert.equal(r.body.preparationHash,f.prepared.preparationHash);
    const after=await everything(),changed=Object.keys(after).filter(k=>after[k]!==before[k]);
    assert.deepEqual(changed,[path.relative(area.inputRoot,registrationPath)]);assert.deepEqual(Object.keys(after),Object.keys(before));
    assert.deepEqual((await caller(f,'revision-reference',f.reference)).body,r.body);assert.deepEqual(await everything(),after);
    const ui=await human(f,'ui-review');assert.equal(ui.status,200,JSON.stringify(ui.body));const m=ui.body,v=m.digestRevision;f.view=m;
    assert.equal(v.status,'verified');assert.equal(m.fingerprint,f.materials.fingerprint);
    assert.deepEqual(v.representedEditRequestIds,f.composition.representedEditRequestIds);assert.deepEqual(v.candidateIds,m.digestComposition.requestedCandidateIds);
    assert.deepEqual(v.appliedEdits.map(a=>a.id),m.digestComposition.editRequestIds);assert.deepEqual(v.appliedEdits.map(a=>a.candidateId),m.digestComposition.addedCandidateIds);
    assert(v.appliedEdits.every(a=>m.candidates.find(c=>c.id===a.candidateId).title===a.title));
    const out=f.revision.outputs,atoms=out['meaning-input.json'].atomOccurrences,parts=out['revision-edit-plan.json'].segments;
    assert.deepEqual(v.segments.map(s=>s.speechIds),parts.map(s=>s.sourceSegmentIds));
    assert.deepEqual(v.segments.map(s=>[s.startMs,s.endMs]),parts.map(s=>[s.sourceStartMs,s.sourceEndMs]));
    assert.deepEqual(v.segments.map(s=>s.caption),parts.map(s=>s.sourceSegmentIds.map(id=>atoms.find(a=>a.sourceSegmentId===id).text).join('')));
    assert.equal(v.durationMs,out['revision-clock-resolution.json'].resolution.mappings.at(-1).outputEndFrame*1000/30);
    assert.equal(v.requestHash,f.composition.requestHash);assert.equal(v.preparationHash,f.prepared.preparationHash);
    assert.deepEqual(v.admission,{captionDisplayAnswers:'unanswered',executionPermission:'not-approved',humanQuality:'pending'});
    assert.equal(m.digestComposition.status,'revision_requested');assert.equal(m.creationChecks.inputValidation,'failed');assert.deepEqual(m.blockers,f.materials.blockers);
    assert(v.remainingChecks.some(b=>b.includes('字幕の表示判断は未回答')));assert(v.remainingChecks.some(b=>b.includes('製造経路は未接続')));
    assert(!v.remainingChecks.some(b=>b.includes('変更後の正式な新版準備・再照合は未接続')));
    for(const hidden of ['outputRoot','manifestBinding','originalRetentionBindings','implementations','revision-preparation-manifest.json'])assert(!JSON.stringify(v).includes(hidden));
    assert.deepEqual(await everything(),after);assert.deepEqual((await readRevision(f)).body,f.revision);assert.deepEqual(await everything(),after);
    t.diagnostic(JSON.stringify({draft:f.draft.id,editIds:v.representedEditRequestIds,parts:v.segments.length,durationMs:v.durationMs,reflected:true,manufacturing:false}));
  }
});

test('registration refuses unauthenticated, old identity/hash/chain, wrong root/binding, normal AI manifest and invented permissions without writes',async()=>{
  const f=fixtures[0];await activate(f);
  for(const token of ['', 'wrong', 'revision-view-human'])await refused(()=>caller(f,'revision-reference',f.reference,token),401);
  const token=process.env.ZEV2_AGENT_API_TOKEN;delete process.env.ZEV2_AGENT_API_TOKEN;
  try{await refused(()=>caller(f,'revision-reference',f.reference),503);}finally{process.env.ZEV2_AGENT_API_TOKEN=token;}
  for(const b of [{...f.reference,draftIdentity:'old'},{...f.reference,fingerprint:'old'},
    {...f.reference,manifestBinding:{...f.reference.manifestBinding,path:f.reference.manifestBinding.path+'-other'}},
    {...f.reference,manifestBinding:{...f.reference.manifestBinding,fileSha256:'0'.repeat(64)}},
    {...f.reference,outputRoot:fixtures[1].reference.outputRoot,manifestBinding:fixtures[1].reference.manifestBinding},
    {...f.reference,outputRoot:f.parameters.outputRoot,manifestBinding:f.manifestBinding},
    {...f.reference,executionPermission:'approved'},{...f.reference,applied:true}])await refused(()=>caller(f,'revision-reference',b));
  await refused(()=>call(`/agent-digest-retention/${f.draft.id}/${'0'.repeat(64)}/revision-reference`,f.reference));
});

test('all saved revision outputs and pending display inputs are requalified on every UI read; tamper, missing and symlink never repair or retain reflected status',async()=>{
  const f=fixtures[0];await activate(f);
  for(const b of f.revision.manifest.outputs){const p=path.join(area.inputRoot,b.path),raw=await readFile(p);await writeFile(p,Buffer.concat([raw,Buffer.from('\n')]));
    try{const before=await everything();const r=await human(f,'ui-review');assert.equal(r.status,200);assert.equal(r.body.digestRevision.status,'rejected');notReflected(r.body);assert.deepEqual(await everything(),before);await refused(()=>caller(f,'revision-reference',f.reference));}
    finally{await writeFile(p,raw);}assert.equal((await human(f,'ui-review')).body.digestRevision.status,'verified');}
  const p=path.join(f.writer.output.outputRoot,'meaning-input.json'),raw=await readFile(p);await unlink(p);
  try{const before=await everything();notReflected((await human(f,'ui-review')).body);assert.deepEqual(await everything(),before);}
  finally{await writeFile(p,raw);}
  await unlink(p);await symlink(physical(f,f.inputs.bundle.originalRetentionBindings.response),p);
  try{const before=await everything();notReflected((await human(f,'ui-review')).body);assert.deepEqual(await everything(),before);}
  finally{await unlink(p);await writeFile(p,raw);}
  assert.equal((await human(f,'ui-review')).body.digestRevision.status,'verified');
});

test('manifest, supplied answer, bundle and baseline style tampering remove reflection without changing old output bytes or granting execution',async()=>{
  const f=fixtures[0];await activate(f);
  for(const p of [path.join(area.inputRoot,f.prepared.manifestBinding.path),path.join(area.runtime,f.answers[0].binding.path),
    path.join(area.runtime,f.inputs.binding.path),path.join(area.inputRoot,f.parameters.styleTemplateBinding.path)]){
    const raw=await readFile(p);await writeFile(p,Buffer.concat([raw,Buffer.from('\n')]));
    try{const before=await everything(),r=await human(f,'ui-review');assert.equal(r.status,200);notReflected(r.body);assert(r.body.blockers.length);assert.deepEqual(await everything(),before);await refused(()=>caller(f,'revision-reference',f.reference));}
    finally{await writeFile(p,raw);}assert.equal((await human(f,'ui-review')).body.digestRevision.status,'verified');
  }
});

test('changed request/source/represented edit IDs reject old references and a baseline re-registration retains the reference for live rejection',async()=>{
  const f=fixtures[0];await activate(f);const saved=await inventory(f.writer.output.outputRoot),ref=JSON.parse(await readFile(registrationPath)).registrations.find(r=>r.requestDraftId===f.draft.id).humanRevision;
  for(const field of ['purpose','source']){const state=structuredClone(f.state);if(field==='purpose')state.requestDrafts[0].purpose+=' changed';else state.requestDrafts[0].source.uri='file:///other-artificial.mp4';await saveState(state);
    try{const before=await everything(),r=await human(f,'ui-review');assert.equal(r.status,200);notReflected(r.body);await refused(()=>caller(f,'revision-reference',f.reference));assert.deepEqual(await everything(),before);}finally{await saveState(f.state);}}
  const edits=path.join(area.runtime,'ui-digest-edit-requests.json'),raw=await readFile(edits),value=JSON.parse(raw.toString());
  value.requests.find(r=>r.requestDraftId===f.draft.id).id+='-later';await writeFile(edits,JSON.stringify(value));
  try{notReflected((await human(f,'ui-review')).body);await refused(()=>caller(f,'revision-reference',f.reference));const r=await human(f,'ui-digest-preparation',f.body);assert.equal(r.status,200);notReflected(r.body.materials);
    assert.deepEqual(JSON.parse(await readFile(registrationPath)).registrations.find(r=>r.requestDraftId===f.draft.id).humanRevision,ref);}finally{await writeFile(edits,raw);}
  assert.deepEqual(await inventory(f.writer.output.outputRoot),saved);assert.equal((await human(f,'ui-review')).body.digestRevision.status,'verified');
});

test('fresh compiled backend reconstructs the multiple-addition display without writes, new authority, source changes or duplicate ledgers',async()=>{
  const f=fixtures[2];await activate(f);const ui=(await human(f,'ui-review')).body,before=await everything();
  const code=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {buildUiReviewMaterials} from './dist/domain/ui-review.js';process.stdout.write(JSON.stringify(await buildUiReviewMaterials(await loadState(),${JSON.stringify(f.draft.id)},await loadRuntimeConfig())));`;
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),ui);assert.deepEqual(await everything(),before);
  const resume=await call('/agent-requests/resume',{scope:{requestDraftId:f.draft.id,draftIdentity:ui.draftIdentity,runtimeIdentity:ui.creationChecks.runtimeIdentity}},'revision-view-human');
  assert.equal(resume.status,409);assert.deepEqual(await everything(),before);
  for(const variant of fixtures){const actual=await inventory(variant.directory);for(const [k,v] of Object.entries(variant.originalFiles))assert.equal(actual[k],v);assert.deepEqual(await readFile(new URL(variant.draft.source.uri)),variant.sourceBytes);}
});

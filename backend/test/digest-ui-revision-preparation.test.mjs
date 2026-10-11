import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir, lstat, readlink, unlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { digestArtifactFileNameV001 } from '@zev2/shared';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';

// Existing explicit SSD fixture, backend-local loader and serial tests. Synthetic JSON only, no provider/media processing.
const area = await createFixtureWorkspace();let server;
after(async () => { if (server) await new Promise(r => server.close(r));await area.cleanup(); });
process.env.ZEV2_RUNTIME_DIR=area.runtime;process.env.ZEV2_RUNTIME_CONFIG_PATH=path.join(area.runtime,'config.json');
process.env.ZEV2_WORKSPACE_ROOT=workspace;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.ZEV2_HUMAN_API_TOKEN='revision-human';process.env.ZEV2_AGENT_API_TOKEN='revision-agent';
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},
  editPlan:{mode:'gemini'},adjustment:{mode:'fixed'},videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''}}));
const {default:router}=await import('../src/routes/control.ts'),{saveState}=await import('../src/store/json-store.ts');
const {integrateDigestUiRevisionRetentionScenes:join}=await import('../src/domain/digest-ui-revision-preparation.ts');
const fixtures=[await makeDigestUiFixture(area,'a','first-only'),await makeDigestUiFixture(area,'b','first-only'),
  await makeDigestUiFixture(area,'b','first-only',{candidateCount:3,idSuffix:'-multi'})];
const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}/api`;
const sha=b=>createHash('sha256').update(b).digest('hex');
async function call(route,body,token='revision-agent') {
  const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',
    ...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
}
const human=(f,route,body)=>call(`/request-drafts/${f.draft.id}/${route}`,body,'revision-human');
const caller=(f,suffix,body,token)=>call(`/agent-digest-retention/${f.draft.id}/${f.composition.requestHash}/${suffix}`,body,token);
const readRevision=(f,token)=>caller(f,`revision-preparation/${f.prepared.preparationHash}?outputRoot=${encodeURIComponent(f.writer.output.outputRoot)}`,undefined,token);
const physical=(f,b)=>path.join(f.directory,digestArtifactFileNameV001(b.path,f.draft.id));
async function activate(f) {await saveState(f.state);const r=await human(f,'ui-digest-preparation',f.body);assert.equal(r.status,200,JSON.stringify(r.body));}
async function inventory(root) {
  const out={};async function walk(dir) {for(const name of (await readdir(dir)).sort()) {
    const p=path.join(dir,name),key=path.relative(root,p),s=await lstat(p);
    if(s.isSymbolicLink())out[key]=`link:${await readlink(p)}`;
    else if(s.isDirectory()){out[key]='directory';await walk(p);}else out[key]=sha(await readFile(p));
  }}await walk(root);return out;
}
const originals=()=>inventory(area.runtime),everything=()=>inventory(area.inputRoot);
async function refused(f,operation,status=409) {const before=await everything(),r=await operation();assert.equal(r.status,status,JSON.stringify(r.body));assert.deepEqual(await everything(),before);return r;}
function response(item) {
  const c=item.request.input.candidates[0],ids=c.utterances.flatMap(u=>u.atoms.map(a=>a.sourceSegmentId));assert(ids.length>=3);
  return {schemaVersion:'candidate-internal-retention-response-v001',requestFileSha256:item.requestFileSha256,
    answer:{status:'complete',candidates:[{candidateId:c.candidateId,meaningPreserved:'人工本文の前後を保持',blocks:[
      {action:'keep',startSourceSegmentId:ids[0],endSourceSegmentId:ids[0],roles:['lead-in'],reason:'人工導入'},
      {action:'drop',startSourceSegmentId:ids[1],endSourceSegmentId:ids[1],roles:['dispensable'],reason:'人工省略'},
      {action:'keep',startSourceSegmentId:ids[2],endSourceSegmentId:ids.at(-1),roles:['payoff'],reason:'人工結び'}]}]},judgmentNote:'保存する人工回答。API判断なし'};
}

test('A/B and multiple additions use original qualified scene and saved-answer records without starting production',async()=>{
  for(const f of fixtures) {
    await activate(f);
    for(const c of (await human(f,'ui-review')).body.candidates.slice(1)) {
      const m=(await human(f,'ui-review')).body;
      assert.equal((await human(f,'ui-digest-scene-additions',{draftIdentity:m.draftIdentity,fingerprint:m.fingerprint,candidateId:c.id})).status,200);
    }
    const m=(await human(f,'ui-review')).body;f.materials=m;
    const confirmation={draftIdentity:m.draftIdentity,fingerprint:m.fingerprint};
    const composition=await human(f,'ui-digest-composition-data',confirmation);assert.equal(composition.status,200);f.composition=composition.body;
    assert.equal((await human(f,'ui-digest-additional-retention-inputs',{...confirmation,requestHash:f.composition.requestHash})).status,200);
    const inputs=await caller(f,'inputs');assert.equal(inputs.status,200);f.inputs=inputs.body;f.answers=[];
    for(const item of f.inputs.bundle.requests) {
      const saved=await caller(f,'answers',{...confirmation,preparationHash:f.inputs.binding.fileSha256,requestId:item.request.requestId,response:response(item)});
      assert.equal(saved.status,200,JSON.stringify(saved.body));
      const read=await caller(f,`answers/${saved.body.answerHash}`);assert.equal(read.status,200);
      f.answers.push({requestId:item.request.requestId,answerHash:saved.body.answerHash,candidateId:item.request.candidateId,
        binding:saved.body.binding,validation:read.body.record.validation});
    }
    const preparationId=`artificial-revision-${f.draft.id}`;
    const scopePath='docs/reports/zev-ui-b-implementation-20261011/revision-integration-connection.md';
    f.writer={...confirmation,preparationHash:f.inputs.binding.fileSha256,
      answers:f.answers.map(({requestId,answerHash})=>({requestId,answerHash})),output:{preparationId,
        outputRoot:path.join(area.inputRoot,area.prefix,preparationId),scopeBinding:{path:scopePath,fileSha256:sha(await readFile(path.join(workspace,scopePath)))}}};
    f.original=JSON.parse(await readFile(physical(f,f.inputs.bundle.originalRetentionBindings.validation),'utf8'));
    assert.equal(f.inputs.bundle.requests.length,f===fixtures[2]?2:1);
    f.originalFiles=await inventory(f.directory);
  }
});

test('immutable A/B and multiple-addition writer preserves origin IDs/text/cuts and prepares whole clock plus keep/drop caption inputs',async t=>{
  for(const f of fixtures) {
    await activate(f);const before=await originals();
    const replies=await Promise.all([caller(f,'revision-preparation',f.writer),caller(f,'revision-preparation',f.writer)]);
    assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.deepEqual(replies[0].body,replies[1].body);f.prepared=replies[0].body;
    const read=await readRevision(f);assert.equal(read.status,200,JSON.stringify(read.body));assert.equal(read.cache,'no-store');f.revision=read.body;
    const out=read.body.outputs,r=out['revision-retention.json'],edit=out['revision-edit-plan.json'],clock=out['revision-clock-resolution.json'].resolution,
      meaning=out['meaning-input.json'],requests=Object.entries(out).filter(([n])=>n.startsWith('display-request-')).map(([,v])=>v);
    assert.equal(read.body.manifest.schemaVersion,'ui-digest-human-revision-preparation-v001');
    assert.equal(r.schemaVersion,'ui-digest-human-retention-integration-v001');assert.equal(r.status,'human-revision-data-only');
    assert.deepEqual(r.representedEditRequestIds,f.inputs.bundle.representedEditRequestIds);
    assert.deepEqual(r.originalRetentionBindings,f.inputs.bundle.originalRetentionBindings);
    assert.deepEqual(r.scenes.map(s=>s.candidateId),f.composition.composition.requestedCandidateIds);
    const oldScene=r.scenes[0];assert.equal(oldScene.inclusion.kind,'original-ai-adoption');assert.equal(oldScene.retentionSource.kind,'original-retention');
    assert.deepEqual(oldScene.blocks,f.original.candidates[0].blocks);assert.deepEqual(oldScene.segments,f.original.segments);
    for(const [i,s] of r.scenes.slice(1).entries()) {
      assert.equal(s.inclusion.kind,'human-addition');assert.equal(s.retentionSource.kind,'additional-supplied-answer');
      assert.deepEqual(s.retentionSource.binding,f.answers[i].binding);assert.deepEqual(s.blocks,f.answers[i].validation.candidates[0].blocks);
      assert.deepEqual(s.segments,f.answers[i].validation.segments);assert.equal(s.originalAiJudgment.decision,'reject');
    }
    assert.equal(r.segments.length,1+2*f.answers.length);assert.equal(new Set(r.segments.map(s=>s.segmentId)).size,r.segments.length);
    const originalSegments=r.scenes.flatMap(s=>s.segments);
    for(const [i,s] of r.segments.entries()) {
      const original=originalSegments[i];assert.equal(s.segmentId,`segment-${String(i+1).padStart(4,'0')}`);assert.equal(s.outputOrdinal,i+1);
      assert.equal(s.origin.originalSegmentId,original.segmentId);assert.equal(s.origin.candidateId,original.candidateId);
      for(const key of ['candidateId','sourceSegmentIds','sourceStartMs','sourceEndMs','cutBoundaryEvidence','meaningRoles','reason','blockOrdinal'])assert.deepEqual(s[key],original[key]);
    }
    assert(new Set(r.segments.map(s=>s.origin.originalSegmentId)).size<r.segments.length,'Fixture must actually exercise original segment ID collisions');
    assert.deepEqual(edit.segments.map(s=>s.segmentId),r.segments.map(s=>s.segmentId));assert.equal(clock.status,'passed');assert.equal(clock.mappings.length,r.segments.length);
    let outputFrame=0;
    for(const [i,m] of clock.mappings.entries()) {
      const s=r.segments[i],length=(s.sourceEndMs-s.sourceStartMs)*30/1000;
      assert.equal(m.segmentId,s.segmentId);assert.equal(m.sourceStartMs,s.sourceStartMs);assert.equal(m.sourceEndMs,s.sourceEndMs);
      assert.equal(m.sourceStartFrame30,s.sourceStartMs*30/1000);assert.equal(m.sourceEndFrame30,s.sourceEndMs*30/1000);
      assert.equal(m.outputStartFrame,outputFrame);outputFrame+=length;assert.equal(m.outputEndFrame,outputFrame);
      assert.deepEqual(m.audioSamples,{sourceStart:s.sourceStartMs*48,sourceEnd:s.sourceEndMs*48,outputStart:m.outputStartFrame*1600,outputEnd:m.outputEndFrame*1600});
    }
    assert.deepEqual(meaning.atomOccurrences.map(a=>a.sourceSegmentId),r.retainedSourceSegmentIds);
    const transcript=JSON.parse(await readFile(physical(f,f.inputs.bundle.sourceBindings.transcript),'utf8'));
    for(const a of meaning.atomOccurrences)assert.equal(a.text,transcript.segments.find(s=>s.id===a.sourceSegmentId).text);
    assert(!meaning.atomOccurrences.some(a=>r.droppedSourceSegmentIds.includes(a.sourceSegmentId)));
    assert.equal(requests.length,r.segments.length);assert.deepEqual(requests.map(q=>q.timelineSegmentId),r.segments.map(s=>s.segmentId));
    assert.equal(meaning.machineAdoptionBinding.schemaVersion,r.schemaVersion);assert.deepEqual(meaning.machineAdoptionBinding,edit.retentionIntegrationBinding);
    assert.deepEqual(requests.flatMap(q=>q.input.captions.flatMap(c=>c.boundaryCandidates.map(b=>b.text))),meaning.atomOccurrences.map(a=>a.text));
    assert.equal(read.body.admission.executionPermission,'not-approved');assert.equal(read.body.admission.humanQuality,'pending');
    assert.equal(read.body.admission.captionDisplayAnswers,'unanswered');assert.equal(read.body.admission.uiApplication,'not-connected');
    assert.equal(read.body.manifest.renderExecuted,false);assert.equal(read.body.manifest.backendCompletionRegistered,false);
    for(const b of read.body.manifest.outputs)assert.equal(sha(await readFile(path.join(area.inputRoot,b.path))),b.fileSha256);
    assert.equal(sha(await readFile(path.join(area.inputRoot,f.prepared.manifestBinding.path))),f.prepared.preparationHash);
    assert.deepEqual(await originals(),before);
    const ui=(await human(f,'ui-review')).body;assert.equal(ui.digestComposition.status,'revision_requested');assert.equal(ui.creationChecks.inputValidation,'failed');
    assert(!Object.hasOwn(ui,'inspection'));assert(!Object.hasOwn(ui,'style'));assert(!JSON.stringify(ui).includes('human-revision-inputs-prepared'));
    t.diagnostic(JSON.stringify({draft:f.draft.id,additions:f.answers.length,parts:r.segments.length,keepIds:r.retainedSourceSegmentIds,dropIds:r.droppedSourceSegmentIds,
      preparationHash:f.prepared.preparationHash,outputFrames:outputFrame}));
  }
});

test('new writer/reader require configured agent auth and cannot register human revision as normal AI preparation',async()=>{
  const f=fixtures[0];await activate(f);
  for(const token of ['', 'wrong', 'revision-human']) {
    await refused(f,()=>caller(f,'revision-preparation',f.writer,token),401);await refused(f,()=>readRevision(f,token),401);
  }
  const old=process.env.ZEV2_AGENT_API_TOKEN;delete process.env.ZEV2_AGENT_API_TOKEN;
  try {await refused(f,()=>caller(f,'revision-preparation',f.writer),503);await refused(f,()=>readRevision(f),503);}finally{process.env.ZEV2_AGENT_API_TOKEN=old;}
  await refused(f,()=>human(f,'ui-digest-preparation',{draftIdentity:f.writer.draftIdentity,
    parameters:{...f.parameters,outputRoot:f.writer.output.outputRoot,preparationId:f.writer.output.preparationId},manifestBinding:f.prepared.manifestBinding}));
  assert.equal((await human(f,'ui-review')).body.digestComposition.status,'revision_requested');
});

test('missing/duplicate/other-chain answers, stale input, invented authority and unsafe output roots reject before writes',async()=>{
  const f=fixtures[2];await activate(f);const b=f.writer;
  const variants=[{...b,answers:[]},{...b,answers:b.answers.slice(0,1)},{...b,answers:[b.answers[0],b.answers[0]]},
    {...b,answers:[...b.answers].reverse()},{...b,answers:[fixtures[0].writer.answers[0],b.answers[1]]},
    {...b,answers:[{...b.answers[0],answerHash:fixtures[0].writer.answers[0].answerHash},b.answers[1]]},
    {...b,draftIdentity:'stale'},{...b,fingerprint:'stale'},{...b,preparationHash:'0'.repeat(64)},{...b,approve:true},
    {...b,output:{...b.output,scopeBinding:{...b.output.scopeBinding,fileSha256:'0'.repeat(64)}}}];
  for(const changed of variants)await refused(f,()=>caller(f,'revision-preparation',changed));
  for(const root of ['/tmp/ui68-invalid-output',f.parameters.outputRoot,area.runtime,path.join(area.inputRoot,area.prefix)]) {
    await refused(f,()=>caller(f,'revision-preparation',{...b,output:{...b.output,outputRoot:root,preparationId:path.basename(root)}}));
  }
  await refused(f,()=>caller(f,`revision-preparation/${f.prepared.preparationHash}?outputRoot=${encodeURIComponent('/tmp/other-root')}`));
  await refused(f,()=>caller(f,`revision-preparation/${f.prepared.preparationHash}?outputRoot=${encodeURIComponent(b.output.outputRoot)}&approve=true`));
  const alias=path.join(area.inputRoot,area.prefix,'revision-alias');await symlink(b.output.outputRoot,alias);
  try {await refused(f,()=>caller(f,'revision-preparation',{...b,output:{...b.output,outputRoot:alias,preparationId:'revision-alias'}}));}
  finally {await unlink(alias);}
});

test('saved output, source/style/inspection and manifest provenance tampering rejects; an explicit exact retry reuses known partial bytes',async()=>{
  const f=fixtures[0];await activate(f);
  const names=['revision-retention.json','revision-clock-resolution.json','meaning-input.json','display-request-0001.json','revision-preparation-manifest.json'];
  for(const name of names) {
    const p=path.join(f.writer.output.outputRoot,name),raw=await readFile(p);await writeFile(p,Buffer.concat([raw,Buffer.from('\n')]));
    try {await refused(f,()=>readRevision(f));await refused(f,()=>caller(f,'revision-preparation',f.writer));}finally{await writeFile(p,raw);}
  }
  const inspectionBinding=f.revision.manifest.sourceInspectionBinding;
  for(const p of [physical(f,f.inputs.bundle.originalRetentionBindings.response),physical(f,inspectionBinding),path.join(area.inputRoot,f.parameters.styleTemplateBinding.path),
    path.join(area.runtime,f.answers[0].binding.path)]) {
    const raw=await readFile(p);await writeFile(p,Buffer.concat([raw,Buffer.from('\n')]));
    try {await refused(f,()=>readRevision(f));await refused(f,()=>caller(f,'revision-preparation',f.writer));}finally{await writeFile(p,raw);}
  }
  const meaning=path.join(f.writer.output.outputRoot,'meaning-input.json'),raw=await readFile(meaning);await unlink(meaning);
  try {await refused(f,()=>readRevision(f));const saved=await caller(f,'revision-preparation',f.writer);assert.equal(saved.status,200);
    assert.deepEqual(saved.body,f.prepared);assert.deepEqual(await readFile(meaning),raw);}finally{await writeFile(meaning,raw);}
  await unlink(meaning);await symlink(physical(f,f.inputs.bundle.originalRetentionBindings.response),meaning);
  try {await refused(f,()=>readRevision(f));await refused(f,()=>caller(f,'revision-preparation',f.writer));}finally{await unlink(meaning);await writeFile(meaning,raw);}
  const manifestFile=path.join(area.inputRoot,f.prepared.manifestBinding.path),saved=await readFile(manifestFile),changed=JSON.parse(saved.toString());
  changed.implementations[0].fileSha256='a'.repeat(64);const forged=Buffer.from(JSON.stringify(changed,null,2)+'\n');await writeFile(manifestFile,forged);
  try {await refused(f,()=>caller(f,`revision-preparation/${sha(forged)}?outputRoot=${encodeURIComponent(f.writer.output.outputRoot)}`));}
  finally{await writeFile(manifestFile,saved);}
});

test('the dedicated join refuses source ID reuse and cross-scene range conflicts before assigning whole-sequence IDs',()=>{
  const f=fixtures[0],c=f.composition.composition,old=f.original,bindings=f.inputs.bundle.originalRetentionBindings;
  const answers=f.answers.map(({candidateId,requestId,binding,validation})=>({candidateId,requestId,binding,validation}));
  const before=structuredClone({c,old,answers});assert.equal(join(c,old,bindings,answers).segments.length,3);
  const dupC=structuredClone(c),dup=structuredClone(answers),id=old.candidates[0].blocks[0].sourceSegmentIds[0];
  dupC.scenes[1].candidateContext.sourceSegmentIds[0]=id;dup[0].validation.candidates[0].blocks[0].sourceSegmentIds[0]=id;dup[0].validation.segments[0].sourceSegmentIds[0]=id;
  assert.throws(()=>join(dupC,old,bindings,dup),/元字幕断片が重複/);
  const overlap=structuredClone(answers);overlap[0].validation.segments[0].sourceStartMs=old.segments.at(-1).sourceEndMs-1;
  assert.throws(()=>join(c,old,bindings,overlap),/元区間が逆順または重複/);
  const gap=structuredClone(answers);gap[0].validation.candidates[0].blocks.splice(1,1);assert.throws(()=>join(c,old,bindings,gap),/全文所属/);
  assert.throws(()=>join({...c,scenes:c.scenes.slice(1)},old,bindings,answers),/元採用scene/);
  assert.deepEqual({c,old,answers},before);
});

test('changed current request/source/chain keeps saved revision bytes but refuses applying the old preparation',async()=>{
  const f=fixtures[0];await activate(f);const saved=await inventory(f.writer.output.outputRoot);
  for(const field of ['purpose','source']) {
    const state=structuredClone(f.state);if(field==='purpose')state.requestDrafts[0].purpose+=' changed';else state.requestDrafts[0].source.uri='file:///other-artificial.mp4';
    await saveState(state);try {await refused(f,()=>readRevision(f));await refused(f,()=>caller(f,'revision-preparation',f.writer));}finally{await saveState(f.state);}
    assert.deepEqual(await inventory(f.writer.output.outputRoot),saved);
  }
  const editPath=path.join(area.runtime,'ui-digest-edit-requests.json'),raw=await readFile(editPath),edits=JSON.parse(raw.toString());
  edits.requests.find(r=>r.requestDraftId===f.draft.id).id+='-later';await writeFile(editPath,JSON.stringify(edits));
  try {await refused(f,()=>readRevision(f));await refused(f,()=>caller(f,'revision-preparation',f.writer));}finally{await writeFile(editPath,raw);}
  assert.deepEqual(await inventory(f.writer.output.outputRoot),saved);assert.equal((await readRevision(f)).status,200);
});

test('a fresh compiled backend process reconstructs multiple-addition manifest and all outputs with original/state/queue bytes unchanged',async()=>{
  const f=fixtures[2];await activate(f);const before=await everything();
  const code=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {readDigestUiRevision} from './dist/domain/digest-ui-revision-preparation.js';process.stdout.write(JSON.stringify(await readDigestUiRevision(await loadState(),${JSON.stringify(f.draft.id)},await loadRuntimeConfig(),${JSON.stringify(f.composition.requestHash)},${JSON.stringify(f.writer.output.outputRoot)},${JSON.stringify(f.prepared.preparationHash)})));`;
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),f.revision);assert.deepEqual(await everything(),before);
  for(const variant of fixtures)assert.deepEqual(await inventory(variant.directory),variant.originalFiles);
});

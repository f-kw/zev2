import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { createFixtureWorkspace, makeDigestUiFixture, workspace } from './digest-ui-fixture.mts';
const area = await createFixtureWorkspace();
let server;
after(async () => { if (server) await new Promise(r => server.close(r));await area.cleanup(); });
process.env.ZEV2_RUNTIME_DIR = area.runtime;
process.env.ZEV2_RUNTIME_CONFIG_PATH = path.join(area.runtime, 'config.json');
process.env.ZEV2_WORKSPACE_ROOT = workspace;
process.env.ZEV2_DISABLE_AUTO_RUNNER = '1';
process.env.ZEV2_HUMAN_API_TOKEN = 'isolated-ui-human';
process.env.ZEV2_AGENT_API_TOKEN = 'isolated-ui-agent';
const config = { stt: {mode:'fixed'},contentDiscovery:{mode:'fixed'},editPlan:{mode:'fixed'},adjustment:{mode:'fixed'},
  videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'',defaultPurpose:''} };
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH, JSON.stringify(config));
const { default: router } = await import('../src/routes/control.ts');
const { saveState, loadState } = await import('../src/store/json-store.ts');
const { buildUiReviewMaterials, registeredUiFile } = await import('../src/domain/ui-review.ts');
const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
const { digestUiRegistrationInput, qualifyDigestUiPreparation } = await import('../src/domain/digest-ui-review.ts');
const fixtures = [await makeDigestUiFixture(area, 'a'), await makeDigestUiFixture(area, 'b')];
const app = express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
const statePath=path.join(area.runtime,'state.json'), registrationPath=path.join(area.runtime,'ui-digest-preparations.json');
const registrations=async()=>readFile(registrationPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
async function post(f, body=f.body, token='isolated-ui-human') {
  const response=await fetch(`${base}/request-drafts/${f.draft.id}/ui-digest-preparation`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
}
async function noWrite(f,body=f.body) {
  const before=[await readFile(statePath),await registrations()];const response=await post(f,body);assert.equal(response.status,409,JSON.stringify(response.body));
  assert.deepEqual([await readFile(statePath),await registrations()],before);return response;
}
test('two different artificial sources qualify through actual readers and display only precreation instructions',async()=>{
  for(const f of fixtures) {
    await saveState(f.state);const before=await readFile(statePath);const result=await post(f);assert.equal(result.status,200,JSON.stringify(result.body));
    const m=result.body.materials;assert.equal(m.digestPreparation.status,'verified');assert.equal(m.creationChecks.inputValidation,'verified');
    assert.equal(m.creationChecks.audioPreservation,'preserve-source-only');assert.equal(m.creationChecks.sourceAudioReference,'registered');
    assert.equal(m.candidates.length,2);assert(m.candidates.every(c=>c.title.includes(`人工${f.draft.id.slice(-1)}`)&&c.summary.includes('保存済み要約')&&c.previewStatus.state==='unknown'));
    assert.deepEqual(m.segments.flatMap(s=>s.speechIds),f.state.requestDrafts[0].id==='digest-a'?[101,102,103,104,105,106]:[701,702,703,704,705,706,707,708]);
    assert(m.blockers.some(s=>s.includes('未接続')));assert(m.blockers.some(s=>s.includes('未実施')));assert.equal(m.review,undefined);
    assert.deepEqual(await readFile(statePath),before);
    const registrationBefore=await registrations();assert.equal((await post(f)).status,200);assert.deepEqual(await registrations(),registrationBefore);
    const filesBefore=await readdir(f.directory);const repeated=await buildUiReviewMaterials(await loadState(),f.draft.id,await loadRuntimeConfig());
    assert.deepEqual(repeated,m);assert.deepEqual(await readdir(f.directory),filesBefore);assert.deepEqual(await readFile(statePath),before);
  }
});
test('human authentication and exact server-owned parameter boundary cannot become producer authority',async()=>{
  const f=fixtures[0];await saveState(f.state);assert.equal((await post(f,f.body,'isolated-ui-agent')).status,401);
  await noWrite(f,{...f.body,parameters:{...f.parameters,workspaceRoot:'/tmp/forged-code'}});
  await noWrite(f,{...f.body,parameters:{...f.parameters,job:{approved:true}}});
});
test('different source, same ID changed SHA, unregistered references and replaced current producer are rejected without writes',async()=>{
  const f=fixtures[0];await saveState(f.state);
  await noWrite(f,{...f.body,parameters:{...f.parameters,expected:{...f.parameters.expected,requestDraftId:'digest-b'}}});
  const source=structuredClone(f.state);source.requestDrafts[0].source.uri='file:///different-source.mp4';await saveState(source);await noWrite(f);
  const hash=structuredClone(f.state);hash.fileRefs.find(v=>v.id===f.planFile.id).sha256='f'.repeat(64);await saveState(hash);await noWrite(f);
  const absent=structuredClone(f.state);absent.outputs=absent.outputs.filter(v=>v.id!==f.executionFile.ownerId);await saveState(absent);await noWrite(f);
  const replaced=structuredClone(f.state);replaced.agentRequests.push({...replaced.agentRequests.at(-1),id:'newer-execution',createdAt:'2026-10-11T05:00:00Z'});await saveState(replaced);await noWrite(f);
  await saveState(f.state);await noWrite(f,{...f.body,manifestBinding:{...f.manifestBinding,fileSha256:'f'.repeat(64)}});
});
test('clock bytes tampering is rejected and stale candidates/audio disappear on reread',async()=>{
  const f=fixtures[0];await saveState(f.state);assert.equal((await post(f)).status,200);
  const b=f.consumed.artifact.clockResolutionBinding, filename=path.join(f.directory,b.path.split('/').slice(-2).join('--'));
  const before=await readFile(filename);const clock=JSON.parse(before);clock.mappings[0].sourceEndMs+=1;await writeFile(filename,JSON.stringify(clock));
  try {
    await noWrite(f);const m=await buildUiReviewMaterials(await loadState(),f.draft.id,await loadRuntimeConfig());
    assert.equal(m.digestPreparation.status,'rejected');assert.equal(m.creationChecks.audioPreservation,'unknown');assert.deepEqual(m.candidates,[]);assert.deepEqual(m.segments,[]);
  } finally {await writeFile(filename,before);}
});
test('saved reader works in a fresh compiled backend process with its existing TSX loader',async()=>{
  const f=fixtures[1];await saveState(f.state);
  const command=`import {loadState} from './dist/store/json-store.js';import {loadRuntimeConfig} from './dist/config/runtime-config.js';import {buildUiReviewMaterials} from './dist/domain/ui-review.js';const m=await buildUiReviewMaterials(await loadState(),'${f.draft.id}',await loadRuntimeConfig());if(m.digestPreparation?.status!=='verified')throw new Error(JSON.stringify(m));process.stdout.write(JSON.stringify({status:m.digestPreparation.status,segments:m.segments.length}));`;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',command],{cwd:path.join(workspace,'backend'),env:process.env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).status,'verified');
});
test('missing registration never guesses preparation data and a non-SSD root remains rejected',async()=>{
  const f=fixtures[0];await saveState(f.state);const missing=structuredClone(f.state);missing.requestDrafts[0].id='no-registration';
  const m=await buildUiReviewMaterials(missing,'no-registration',await loadRuntimeConfig());assert.equal(m.digestPreparation.status,'not_registered');assert.equal(m.creationChecks.audioPreservation,'unknown');
  const registration=digestUiRegistrationInput(f.draft.id,{...f.body,parameters:{...f.parameters,inputRoot:workspace}});
  await assert.rejects(()=>qualifyDigestUiPreparation(f.state,registration,registeredUiFile),/SSD_INPUT_ROOT_REQUIRED/);
});

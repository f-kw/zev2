import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import * as shared from '@zev2/shared';

const root = await mkdtemp(path.join(tmpdir(),'zev-ui-confirmation-'));
process.env.ZEV2_RUNTIME_DIR = root;
process.env.ZEV2_RUNTIME_CONFIG_PATH = path.join(root,'runtime.json');
process.env.ZEV2_DISABLE_AUTO_RUNNER = '1';
process.env.ZEV2_HUMAN_API_TOKEN = '';
process.env.ZEV2_AGENT_API_TOKEN = 'isolated-test-only';
const { default: router } = await import('../src/routes/control.ts');
const { buildUiReviewMaterials } = await import('../src/domain/ui-review.ts');
const { saveState, loadState } = await import('../src/store/json-store.ts');
const { loadRuntimeConfig, createRunnerEnvironmentFromConfig } = await import('../src/config/runtime-config.ts');
const config = { stt:{mode:'fixed'},contentDiscovery:{mode:'fixed'},editPlan:{mode:'fixed'},adjustment:{mode:'fixed'},
  videoOutput:{encoder:'libx264',extraArgs:[]},artifactDelivery:{mode:'local'},source:{defaultUri:'file:///saved/test.mp4',defaultPurpose:'保存済み入力'} };
await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify(config));
const app = express();app.use(express.json());app.use('/api',router);
const server = app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base = `http://127.0.0.1:${server.address().port}/api`;
after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
async function post(route,body) { const r = await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer isolated-test-only'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}; }
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = 'file:///saved/test.mp4', speech = {id:7,startMs:1000,endMs:2000,text:'保存済みの発話'};
const speechUnit = {id:7,sourceStartMs:1000,sourceEndMs:2000,text:speech.text};
const theme = {id:'saved-scene',title:'会話の転機',summary:'保存された要約',representativeText:speech.text,
  representativeSpeechIds:[7],relatedSpeechIds:[7],whyItCanBeClipped:'話が動く',compositionNote:'本文保持',evidenceRefs:[{kind:'time_range',refId:'speech-7',meaning:'元の発話'}]};
const layout = {screenLayoutId:'speaker_only',detections:{},viewports:{speaker:[0,0,1,1]},displaySummary:'話者を表示'};
const payloads = {
  prepare_video:{kind:'source_video',mode:'local-source-reference',sourceUri:source,purpose:'保存済み入力',registeredAt:'2026-10-11T02:00:00Z'},
  run_stt:{kind:'transcript_json',mode:'zev-sample-stt',sourceUri:source,notes:[],generatedAt:'2026-10-11T02:00:00Z',language:'ja',durationSec:3,segmentCount:1,segments:[speech],speechUnitGroups:[[7]]},
  propose_clip_themes:{kind:'theme_json',mode:'transcript-content-options',generatedAt:'2026-10-11T02:00:00Z',sourceUri:source,themes:[theme]},
  build_clip_composition:{kind:'composition_json',mode:'transcript-multi-part-composition',generatedAt:'2026-10-11T02:00:00Z',sourceUri:source,selectedThemeId:theme.id,title:theme.title,themeSummary:theme.summary,sourceStartMs:1000,sourceEndMs:2000,
    parts:[{id:'part-1',sourceStartMs:1000,sourceEndMs:2000,role:'body',transcriptText:speech.text,speechIds:[7],speechUnits:[speechUnit],connectionNote:'単一の保存区間'}],assemblyPlan:'元順序'},
  create_edit_plan:{kind:'edit_plan_json',mode:'sample-edit-plan',generatedAt:'2026-10-11T02:00:00Z',selectedThemeId:theme.id,title:theme.title,hookText:theme.title,sourceStartMs:1000,sourceEndMs:2000,geminiApiInput:[],
    renderSegments:[{sourceStartMs:1000,sourceEndMs:2000,role:'body',caption:speech.text,speechIds:[7],speechUnits:[speechUnit],screenLayout:layout}],telopPlan:[{sourceSpeechIds:[7],text:speech.text,role:'body'}]},
  apply_adjustment:{kind:'patch_json',mode:'fixed-adjustment',generatedAt:'2026-10-11T02:00:00Z',editPlanUri:'',changes:[{target:'all',action:'keep',reason:'保存済み案'}],renderReady:true}
};
async function fixture(kind='theme_selection') {
  let sequence=0;const state=shared.createInitialState();
  const draft=shared.createRequestDraft({productionType:'clip',purpose:'保存済み入力',sourceUri:source,durationLabel:'60秒以内',themeCountLabel:'3候補',geminiModelName:shared.DEFAULT_GEMINI_MODEL,preset:'shorts_default'},'2026-10-11T02:00:00Z',()=> 'draft-fixture');
  draft.status='approved';state.requestDrafts.push(draft);
  const requests=shared.createAgentRequestsFromDraft(draft,draft.createdAt,()=> 'request-'+(++sequence));
  state.agentRequests.push(...requests);await mkdir(path.join(root,'artifacts',draft.id),{recursive:true});
  for (const request of requests) {
    const outputId='output-'+request.id,fileId='file-'+request.id;
    // Header-only MP4-shaped bytes are a registration fixture, not a produced playable video.
    let bytes = Buffer.from('0000ftypisom-fixture-only');
    if (request.type!=='render_video') {
      const payload=structuredClone(payloads[request.type]);
      if (request.type==='apply_adjustment') payload.editPlanUri=state.fileRefs.find(f=>f.kind==='edit_plan_json').uri;
      bytes=Buffer.from(JSON.stringify(payload));
    }
    const name=request.type+(request.type==='render_video'?'.mp4':'.json');
    await writeFile(path.join(root,'artifacts',draft.id,name),bytes);
    const file={id:fileId,kind:shared.getFileRefKindForRequest(request.type),ownerId:outputId,
      uri:`/api/artifacts/${draft.id}/${name}`,mimeType:request.type==='render_video'?'video/mp4':'application/json',access:'internal',artifactFileName:name,
      byteSize:bytes.length,sha256:sha(bytes),createdAt:draft.createdAt};
    state.fileRefs.push(file);state.outputs.push({id:outputId,type:shared.getOutputTypeForRequest(request.type),meaning:'登録fixture',fileRefId:file.id});
    request.status='succeeded';request.fileRefIds=[file.id];request.result={outputId,outputType:shared.getOutputTypeForRequest(request.type),fileRefId:file.id,meaning:'保存済みfixture'};
  }
  const producer=requests.find(r=>r.type===(kind==='render_readiness'?'apply_adjustment':'propose_clip_themes'));
  const review={id:'review-fixture',requestDraftId:draft.id,agentRequestId:producer.id,kind,status:'review_required',title:'保存済みの確認',summary:'元資料を確認',reason:'人間確認',humanQuestion:'この内容で進めますか',
    options:kind==='theme_selection'?[{id:theme.id,title:theme.title,summary:theme.summary,evidenceRefs:structuredClone(theme.evidenceRefs)}]:[],
    evidenceRefs:[{kind:'file_ref',refId:producer.result.fileRefId,meaning:'登録資料'}],decisionLogId:'decision-fixture',proposedNextState:'review_required',createdAt:draft.createdAt,updatedAt:draft.createdAt};
  if (kind !== 'theme_selection') {
    const themeProducer=requests.find(r=>r.type==='propose_clip_themes');
    state.controlReviewItems.push({...review,id:'accepted-theme-review',kind:'theme_selection',status:'approved',agentRequestId:themeProducer.id,
      options:[{id:theme.id,title:theme.title,summary:theme.summary,evidenceRefs:structuredClone(theme.evidenceRefs)}],
      evidenceRefs:[{kind:'file_ref',refId:themeProducer.result.fileRefId,meaning:'保存済み候補'}]});
  }
  state.controlReviewItems.push(review);await saveState(state);return {state,draft,review};
}
async function materials(id='draft-fixture') { return buildUiReviewMaterials(await loadState(),id,await loadRuntimeConfig()); }
function confirmation(m) { return {requestDraftId:m.requestDraftId,reviewId:m.review.id,fingerprint:m.fingerprint}; }
async function unchangedAfter(operation) { const before=await readFile(path.join(root,'state.json'));const result=await operation();assert.equal(result.status,409);assert.deepEqual(await readFile(path.join(root,'state.json')),before);return result; }

test('saved candidate and speech clock are read without manufacturing or recommendation',async()=>{
  await fixture();const m=await materials();assert.deepEqual(m.blockers,[]);assert.equal(m.candidates[0].speeches[0].id,7);
  assert.deepEqual(m.candidates[0].ranges,[{startMs:1000,endMs:2000}]);assert.equal(m.candidates[0].preview,undefined);
});
test('review fingerprint rejects changed content, wrong request and missing confirmation without state writes',async()=>{
  const {state,review}=await fixture();const m=await materials();review.options[0].summary='差し替え';await saveState(state);
  await unchangedAfter(()=>post(`/control-reviews/${review.id}/approve`,{selectedOptionId:theme.id,confirmation:confirmation(m)}));
  await unchangedAfter(()=>post(`/control-reviews/${review.id}/approve`,{selectedOptionId:theme.id,confirmation:{...confirmation(m),requestDraftId:'other'}}));
  await unchangedAfter(()=>post(`/control-reviews/${review.id}/approve`,{selectedOptionId:theme.id}));
});
test('registered artifact bytes replacement is rejected even when state metadata stays unchanged',async()=>{
  const {review}=await fixture();const m=await materials();await writeFile(path.join(root,'artifacts','draft-fixture','propose_clip_themes.json'),JSON.stringify({...payloads.propose_clip_themes,themes:[]}));
  await unchangedAfter(()=>post(`/control-reviews/${review.id}/approve`,{selectedOptionId:theme.id,confirmation:confirmation(m)}));
});
test('concurrent duplicate review approval is serialized and saved once',async()=>{
  const {review}=await fixture();const m=await materials();const body={selectedOptionId:theme.id,confirmation:confirmation(m)};
  const results=await Promise.all([post(`/control-reviews/${review.id}/approve`,body),post(`/control-reviews/${review.id}/approve`,body)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await loadState()).humanReviewActions.length,1);
});
test('readiness displays validated inputs but missing precreation audio instruction/reference rejects approval',async()=>{
  const {review}=await fixture('render_readiness');const m=await materials();assert.equal(m.segments.length,1,JSON.stringify(m));assert.equal(m.segments[0].caption,speech.text);assert.equal(m.bindings.length,6);
  assert(m.blockers.some(b=>b.includes('音声保持指定')));assert.equal(m.creationChecks.inputValidation,'verified');await unchangedAfter(()=>post(`/control-reviews/${review.id}/approve`,{confirmation:confirmation(m)}));
});
test('draft approval binds displayed contents and current runtime, without legacy empty-body acceptance',async()=>{
  const {state,draft}=await fixture();draft.status='draft';state.agentRequests=[];state.controlReviewItems=[];await saveState(state);
  const expected={draftIdentity:shared.draftConfirmationIdentity(draft),runtimeIdentity:shared.runtimeConfirmationIdentity(await loadRuntimeConfig())};
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/approve`,{}));draft.purpose='別の版';await saveState(state);
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/approve`,{confirmation:expected}));
  expected.draftIdentity=shared.draftConfirmationIdentity(draft);
  const results=await Promise.all([post(`/request-drafts/${draft.id}/approve`,{confirmation:expected}),post(`/request-drafts/${draft.id}/approve`,{confirmation:expected})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await loadState()).agentRequests.length,7);
});
test('final approval rejects a different newest video instead of silently choosing it',async()=>{
  const {state,draft}=await fixture();const file=state.fileRefs.find(f=>f.kind==='output_video');
  const expected={fileRefId:file.id,sha256:file.sha256};
  state.agentRequests.push({...state.agentRequests.at(-1),id:'new-render',createdAt:'2026-10-11T02:01:00Z',status:'failed',result:undefined});await saveState(state);
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/final-review`,{action:'final_complete',confirmation:expected}));
});
test('final approval binds the shown FileRef/hash and records it only once',async()=>{
  const {draft}=await fixture();const file=(await loadState()).fileRefs.find(f=>f.kind==='output_video');
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/final-review`,{action:'final_complete',confirmation:{fileRefId:'another',sha256:file.sha256}}));
  const body={action:'final_complete',confirmation:{fileRefId:file.id,sha256:file.sha256}};
  const results=await Promise.all([post(`/request-drafts/${draft.id}/final-review`,body),post(`/request-drafts/${draft.id}/final-review`,body)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await loadState()).finalReviewActions[0].outputVideoUri,file.uri);
});
test('server rejects UI dispatch with absent external cost approval before touching state',async()=>{
  const {draft,review}=await fixture();await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({...config,editPlan:{mode:'gemini'}}));
  for (const route of [`/request-drafts/${draft.id}/approve`,`/control-reviews/${review.id}/approve`,`/agent-requests/resume`,`/agent-requests/missing/retry`,`/request-drafts/${draft.id}/request-generated-video-changes`,`/request-drafts/${draft.id}/apply-web-gemini-review`]) {
    const r=await unchangedAfter(()=>post(route,{}));assert.match(r.body.error,/料金/);
  }
  await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify(config));
});
async function twoQueuedDrafts() {
  const {state,draft}=await fixture();state.controlReviewItems=[];state.agentRequests.forEach(r=>{r.status='queued';delete r.result;r.fileRefIds=[];});
  const other={...structuredClone(draft),id:'other-draft',createdAt:'2026-10-11T02:05:00Z'};state.requestDrafts.unshift(other);let n=0;
  state.agentRequests.push(...shared.createAgentRequestsFromDraft(other,other.createdAt,()=> 'other-request-'+(++n)));
  await saveState(state);return {state,draft,other,scope:shared.executionScopeForDraft(draft,shared.runtimeConfirmationIdentity(await loadRuntimeConfig()))};
}
test('resume/next stay in the selected older request and reject missing or stale scope',async()=>{
  const {state,draft,other,scope}=await twoQueuedDrafts();
  await unchangedAfter(()=>post('/agent-requests/resume',{}));
  await unchangedAfter(()=>post('/agent-requests/resume',{scope:{...scope,draftIdentity:'stale'}}));
  const resumed=await post('/agent-requests/resume',{scope});assert.equal(resumed.status,200);assert.equal(resumed.body.request.requestDraftId,draft.id);
  const r=await fetch(base+'/agent-requests/next?scope='+encodeURIComponent(JSON.stringify(scope)),{headers:{authorization:'Bearer isolated-test-only'}});
  assert.equal(r.status,200);assert.equal((await r.json()).request.requestDraftId,draft.id);
  assert.deepEqual((await loadState()).agentRequests.filter(r=>r.requestDraftId===other.id),state.agentRequests.filter(r=>r.requestDraftId===other.id));
});
test('claim/complete/fail reject a request outside scope without a state write; duplicate claim runs once',async()=>{
  const {state,draft,other,scope}=await twoQueuedDrafts();const foreign=state.agentRequests.find(r=>r.requestDraftId===other.id);
  for (const action of ['claim','complete','fail']) await unchangedAfter(()=>post(`/agent-requests/${foreign.id}/${action}`,{ownerId:'qa',message:'test',scope}));
  const target=state.agentRequests.find(r=>r.requestDraftId===draft.id);
  const results=await Promise.all([post(`/agent-requests/${target.id}/claim`,{ownerId:'qa',scope}),post(`/agent-requests/${target.id}/claim`,{ownerId:'qa',scope})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  await unchangedAfter(()=>post('/agent-requests/resume',{scope}));
  await unchangedAfter(()=>post(`/agent-requests/${foreign.id}/claim`,{ownerId:'other-qa',scope:shared.executionScopeForDraft(other,scope.runtimeIdentity)}));
  assert.deepEqual((await loadState()).agentRequests.filter(r=>r.requestDraftId===other.id),state.agentRequests.filter(r=>r.requestDraftId===other.id));
});
test('expired claim recovery stays within scope and does not accept the expired owner completion',async()=>{
  const {state,draft,other,scope}=await twoQueuedDrafts();const own=state.agentRequests.find(r=>r.requestDraftId===draft.id),foreign=state.agentRequests.find(r=>r.requestDraftId===other.id);
  for (const r of [own,foreign]) Object.assign(r,{status:'running',claimOwnerId:'expired',claimedAt:'2026-01-01T00:00:00Z',claimExpiresAt:'2026-01-01T00:01:00Z'});
  await saveState(state);const result=await post(`/agent-requests/${own.id}/complete`,{ownerId:'expired',scope});assert.equal(result.status,409);
  const after=await loadState();assert.equal(after.agentRequests.find(r=>r.id===own.id).status,'queued');assert.deepEqual(after.agentRequests.find(r=>r.id===foreign.id),foreign);
});
async function fixtureRunner(scope,config,reply,overrides={}) {
  const calls=[],fake=express();fake.use(express.json());fake.use((req,res)=>{
    calls.push({path:req.path,query:req.query,body:req.body});res.json(reply(req));
  });
  const fakeServer=fake.listen(0,'127.0.0.1');await new Promise(r=>fakeServer.once('listening',r));
  try {
    const runnerDir=fileURLToPath(new URL('../../runner/',import.meta.url));
    const child=spawn(path.join(runnerDir,'node_modules/.bin/tsx'),['src/index.ts',`--api=http://127.0.0.1:${fakeServer.address().port}`],
      {cwd:runnerDir,env:{...process.env,...createRunnerEnvironmentFromConfig(config),...overrides,ZEV2_EXECUTION_SCOPE_JSON:JSON.stringify(scope)}});
    let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
    return {code,output,calls};
  } finally {await new Promise(r=>fakeServer.close(r));}
}
test('actual runner refuses a foreign next response before claim or media work',async()=>{
  const {state,other,scope}=await twoQueuedDrafts();
  const {code,output,calls}=await fixtureRunner(scope,await loadRuntimeConfig(),()=>({request:state.agentRequests.find(r=>r.requestDraftId===other.id)}));
  assert.equal(code,1);assert.match(output,/指定外の依頼/);assert.equal(calls.length,1);assert.equal(calls[0].path,'/agent-requests/next');
  assert.deepEqual(JSON.parse(calls[0].query.scope),scope);assert.equal(calls.some(c=>c.path.includes('/claim')),false);
});
test('actual runner refuses a changed claim response before building or reporting failure against a request',async()=>{
  const {state,draft,other,scope}=await twoQueuedDrafts(), own=state.agentRequests.find(r=>r.requestDraftId===draft.id),foreign=state.agentRequests.find(r=>r.requestDraftId===other.id);
  const {code,output,calls}=await fixtureRunner(scope,await loadRuntimeConfig(),req=>({request:req.path.endsWith('/claim')?foreign:own,state}));
  assert.equal(code,1);assert.match(output,/取得応答が指定した作業と一致/);
  assert.deepEqual(calls.map(c=>c.path),['/agent-requests/next',`/agent-requests/${own.id}/claim`]);
  assert.deepEqual(calls[1].body.scope,scope);
});
test('actual runner refuses a different effective STT endpoint before any queue call',async()=>{
  const {draft}=await twoQueuedDrafts(),local={...await loadRuntimeConfig(),stt:{mode:'local',localServerUrl:'http://127.0.0.1:9090',language:'ja'}};
  const scope=shared.executionScopeForDraft(draft,shared.runtimeConfirmationIdentity(local));
  const {code,output,calls}=await fixtureRunner(scope,local,()=>({request:null}),{STT_BASE_URL:'http://unconfirmed.invalid'});
  assert.equal(code,1);assert.match(output,/実効設定が一致/);assert.equal(calls.length,0);
});

test('runtime setting changes reject scoped resume, next and claim without touching either queue',async()=>{
  const {state,draft,scope}=await twoQueuedDrafts();
  await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify({...config,stt:{mode:'local',localServerUrl:'http://127.0.0.1:9090'}}));
  try {
    await unchangedAfter(()=>post('/agent-requests/resume',{scope}));
    const before=await readFile(path.join(root,'state.json'));
    const r=await fetch(base+'/agent-requests/next?scope='+encodeURIComponent(JSON.stringify(scope)),{headers:{authorization:'Bearer isolated-test-only'}});
    assert.equal(r.status,409);assert.deepEqual(await readFile(path.join(root,'state.json')),before);
    const own=state.agentRequests.find(r=>r.requestDraftId===draft.id);
    await unchangedAfter(()=>post(`/agent-requests/${own.id}/claim`,{ownerId:'qa',scope}));
  } finally {await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH,JSON.stringify(config));}
});


test('video revision rejects the older displayed output without creating a copied request',async()=>{
  const {state,draft}=await fixture();state.controlReviewItems=[];await saveState(state);
  const file=state.fileRefs.find(f=>f.kind==='output_video');
  const body={reason:'字幕を修正',scope:'adjustment',runtimeIdentity:shared.runtimeConfirmationIdentity(await loadRuntimeConfig()),confirmation:{fileRefId:'older-file',sha256:file.sha256}};
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/request-generated-video-changes`,body));
});

test('streamed video hash verification rejects replaced bytes with unchanged registered metadata',async()=>{
  const {state,draft}=await fixture();const file=state.fileRefs.find(f=>f.kind==='output_video');
  await writeFile(path.join(root,'artifacts',draft.id,'render_video.mp4'),Buffer.from('0000ftypisom-fixture-onlz'));
  await unchangedAfter(()=>post(`/request-drafts/${draft.id}/final-review`,{action:'final_complete',confirmation:{fileRefId:file.id,sha256:file.sha256}}));
});

async function replaceJson(state,type,payload) {
  const request=state.agentRequests.find(r=>r.type===type),file=state.fileRefs.find(f=>f.id===request.result.fileRefId);
  const bytes=Buffer.from(JSON.stringify(payload));await writeFile(path.join(root,'artifacts',request.requestDraftId,file.artifactFileName),bytes);
  file.byteSize=bytes.length;file.sha256=sha(bytes);await saveState(state);return file;
}
async function variableMaterial({uri='file:///saved/another-input.mp4',count=2,durationSec=144.25,offsetMs=1000}={},kind='render_readiness') {
  const result=await fixture(kind),{state,draft}=result;draft.source.uri=uri;state.agentRequests.forEach(r=>r.target.sourceUri=uri);
  const speeches=Array.from({length:count},(_,i)=>({id:100+i*23,startMs:offsetMs+i*3000,endMs:offsetMs+1500+i*3000,text:`新素材の発話${i+1}`}));
  const units=speeches.map(s=>({id:s.id,sourceStartMs:s.startMs,sourceEndMs:s.endMs,text:s.text}));
  const themes=speeches.map((s,i)=>({...structuredClone(theme),id:`candidate-${i}`,title:`候補${i+1}`,summary:`要約${i+1}`,representativeText:s.text,
    representativeSpeechIds:[s.id],relatedSpeechIds:[s.id]}));
  const start=speeches[0].startMs,end=speeches.at(-1).endMs;
  const parts=speeches.map((s,i)=>({id:`part-${i}`,sourceStartMs:s.startMs,sourceEndMs:s.endMs,role:'body',transcriptText:s.text,
    speechIds:[s.id],speechUnits:[units[i]],connectionNote:'保存順序'}));
  const transcript={...structuredClone(payloads.run_stt),sourceUri:uri,durationSec,segmentCount:count,segments:speeches,speechUnitGroups:speeches.map(s=>[s.id])};
  const themesPayload={...structuredClone(payloads.propose_clip_themes),sourceUri:uri,themes};
  const composition={...structuredClone(payloads.build_clip_composition),sourceUri:uri,selectedThemeId:themes[0].id,sourceStartMs:start,sourceEndMs:end,parts};
  const edit={...structuredClone(payloads.create_edit_plan),selectedThemeId:themes[0].id,sourceStartMs:start,sourceEndMs:end,
    renderSegments:parts.map(p=>({...p,caption:p.transcriptText,screenLayout:structuredClone(layout)})),telopPlan:speeches.map(s=>({sourceSpeechIds:[s.id],text:s.text,role:'body'}))};
  for (const review of state.controlReviewItems.filter(r=>r.kind==='theme_selection')) review.options=themes.map(t=>({id:t.id,title:t.title,summary:t.summary,evidenceRefs:t.evidenceRefs}));
  await replaceJson(state,'prepare_video',{...payloads.prepare_video,sourceUri:uri});
  await replaceJson(state,'run_stt',transcript);await replaceJson(state,'propose_clip_themes',themesPayload);
  await replaceJson(state,'build_clip_composition',composition);await replaceJson(state,'create_edit_plan',edit);
  return {...result,transcript,themesPayload,composition,edit};
}

test('runner and backend use the same shared pure validators, with the original rejection semantics',async()=>{
  const runner=await import('../../runner/src/workflow-artifact-validation.ts');
  for (const name of ['assertTranscriptArtifact','assertThemeArtifact','assertClipCompositionArtifact','assertEditPlanArtifact','assertPatchArtifact','assertJsonArtifactForKind']) assert.equal(runner[name],shared[name]);
  for (const type of ['run_stt','propose_clip_themes','build_clip_composition','create_edit_plan']) {
    const payload=structuredClone(payloads[type]),kind=shared.getFileRefKindForRequest(type);
    assert.doesNotThrow(()=>shared.assertJsonArtifactForKind(kind,payload,'fixture'));
    payload.mode='unsupported';assert.throws(()=>runner.assertJsonArtifactForKind(kind,payload,'fixture'),/作成方法/);
  }
  const broken=structuredClone(payloads.run_stt);broken.segmentCount+=1;assert.throws(()=>shared.assertTranscriptArtifact(broken),/件数/);
});
test('different source URIs, speech IDs, candidate counts and lengths display their own saved data',async()=>{
  for (const spec of [{uri:'file:///saved/input-a.mp4',count:2,durationSec:24.2},{uri:'https://example.invalid/video-b',count:4,durationSec:620.75,offsetMs:600000}]) {
    const {draft,transcript}=await variableMaterial(spec),m=await materials(draft.id);
    assert.equal(m.candidates.length,spec.count);assert.equal(m.segments.length,spec.count);
    assert.deepEqual(m.candidates.map(c=>c.speeches[0].id),transcript.segments.map(s=>s.id));
    assert.equal(m.segments[0].startMs,transcript.segments[0].startMs);assert.equal(m.creationChecks.inputValidation,'verified');assert.equal(m.blockers.length,1);assert.match(m.blockers[0],/作成前の音声保持指定/);
  }
});
test('cross-artifact source mismatch is rejected before approval even with matching stored hashes',async()=>{
  for (const type of ['run_stt','propose_clip_themes','build_clip_composition','prepare_video']) {
    const f=await variableMaterial(),payload=type==='run_stt'?f.transcript:type==='propose_clip_themes'?f.themesPayload:type==='build_clip_composition'?f.composition:{...payloads.prepare_video,sourceUri:f.draft.source.uri};
    await replaceJson(f.state,type,{...payload,sourceUri:'file:///saved/wrong-source.mp4'});
    const m=await materials();assert(m.blockers.some(b=>/素材|元動画/.test(b)));assert.equal(m.creationChecks,undefined);
    await unchangedAfter(()=>post(`/control-reviews/${f.review.id}/approve`,{confirmation:confirmation(m)}));
  }
});
test('unknown speech IDs, wrong counts, lengths and altered speech clocks are rejected',async()=>{
  const cases=[
    ['propose_clip_themes',f=>({...f.themesPayload,themes:[{...f.themesPayload.themes[0],relatedSpeechIds:[999]},...f.themesPayload.themes.slice(1)]})],
    ['run_stt',f=>({...f.transcript,segmentCount:99})],
    ['run_stt',f=>({...f.transcript,durationSec:0.1})],
    ['build_clip_composition',f=>({...f.composition,parts:[{...f.composition.parts[0],speechUnits:[{...f.composition.parts[0].speechUnits[0],sourceStartMs:1001}]}]})],
    ['create_edit_plan',f=>({...f.edit,renderSegments:[{...f.edit.renderSegments[0],speechUnits:[{...f.edit.renderSegments[0].speechUnits[0],text:'別の発話'}]}]})]
  ];
  for (const [type,mutate] of cases) {
    const f=await variableMaterial();await replaceJson(f.state,type,mutate(f));const m=await materials();
    assert(m.blockers.some(b=>/発話|件数|長さ/.test(b)));await unchangedAfter(()=>post(`/control-reviews/${f.review.id}/approve`,{confirmation:confirmation(m)}));
  }
});
test('a same-ID artifact with a new registered hash invalidates the displayed confirmation',async()=>{
  const f=await variableMaterial({},'theme_selection'),old=await materials(),oldFile=f.state.fileRefs.find(r=>r.kind==='theme_json');
  const oldHash=oldFile.sha256;await replaceJson(f.state,'propose_clip_themes',{...f.themesPayload,recommendation:{candidateId:f.themesPayload.themes[1].id,reason:'保存された推薦理由'}});
  const current=await materials();assert.equal(current.blockers.length,0);assert.notEqual(current.fingerprint,old.fingerprint);
  assert.equal(oldFile.id,current.recommendation.fileRefId);assert.notEqual(oldHash,current.recommendation.sha256);
  await unchangedAfter(()=>post(`/control-reviews/${f.review.id}/approve`,{selectedOptionId:f.themesPayload.themes[0].id,confirmation:confirmation(old)}));
});
test('registered recommendation has a real candidate ID and reason; absence never manufactures one',async()=>{
  const f=await variableMaterial({},'theme_selection');assert.equal((await materials()).recommendation,undefined);
  await replaceJson(f.state,'propose_clip_themes',{...f.themesPayload,recommendation:{candidateId:f.themesPayload.themes[1].id,reason:'元の発話がまとまっている'}});
  const m=await materials();assert.equal(m.recommendation.candidateId,f.themesPayload.themes[1].id);assert.equal(m.recommendation.reason,'元の発話がまとまっている');
  assert.equal(m.recommendation.producerId,f.state.agentRequests.find(r=>r.type==='propose_clip_themes').id);
  await replaceJson(f.state,'propose_clip_themes',{...f.themesPayload,recommendation:{candidateId:'unregistered',reason:'推測'}});
  assert((await materials()).blockers.some(b=>b.includes('推薦ID')));
});
test('preview state requires an explicit saved candidate job and an actual claim for preparing',async()=>{
  for (const status of ['queued','running','succeeded','failed']) {
    const {state,review}=await fixture();const job=state.agentRequests.find(r=>r.type==='render_video');
    job.status=status;if (status==='running') Object.assign(job,{claimOwnerId:'fixture-runner',claimedAt:'2026-10-11T02:00:00Z'});
    review.options[0].evidenceRefs.push({kind:'agent_request',refId:job.id,meaning:'この候補の登録済みプレビュー作業'});await saveState(state);
    const m=await materials();assert.deepEqual(m.blockers,[]);
    assert.equal(m.candidates[0].previewStatus.state,{queued:'not_created',running:'preparing',succeeded:'ready',failed:'failed'}[status]);
    assert.equal(Boolean(m.candidates[0].preview),status==='succeeded');
  }
  const {state,review}=await fixture(),job=state.agentRequests.find(r=>r.type==='render_video');job.status='running';
  review.options[0].evidenceRefs.push({kind:'agent_request',refId:job.id,meaning:'登録のみ、取得なし'});await saveState(state);
  assert.equal((await materials()).candidates[0].previewStatus.state,'unknown');
});
test('a newer failed preview job never restores the old generated preview',async()=>{
  const {state,review}=await fixture(),old=state.agentRequests.find(r=>r.type==='render_video');
  const next={...structuredClone(old),id:'new-preview',createdAt:'2026-10-11T02:01:00Z',status:'failed',fileRefIds:[],result:undefined};
  state.agentRequests.push(next);review.options[0].evidenceRefs.push({kind:'file_ref',refId:old.result.fileRefId,meaning:'以前のプレビュー'},
    {kind:'agent_request',refId:next.id,meaning:'今回のプレビュー作業'});await saveState(state);
  const m=await materials();assert.equal(m.candidates[0].preview,undefined);assert.equal(m.candidates[0].previewStatus.requestId,next.id);assert.equal(m.candidates[0].previewStatus.state,'failed');
});


test('a newer saved review makes the older review confirmation unusable',async()=>{
  const f=await variableMaterial({},'theme_selection'),old=await materials();
  f.state.controlReviewItems.push({...structuredClone(f.review),id:'review-new',createdAt:'2026-10-11T02:01:00Z',summary:'新しい確認版'});await saveState(f.state);
  await unchangedAfter(()=>post(`/control-reviews/${f.review.id}/approve`,{selectedOptionId:f.themesPayload.themes[0].id,confirmation:confirmation(old)}));
});
test('foreign or nonexistent preview links and expired claims cannot appear as preparing',async()=>{
  const {state,review}=await fixture(),job=state.agentRequests.find(r=>r.type==='render_video');
  const foreign={...structuredClone(job),id:'foreign-preview',requestDraftId:'other',status:'running',claimOwnerId:'qa',claimedAt:'2026-10-11T02:00:00Z'};
  state.agentRequests.push(foreign);review.options[0].evidenceRefs.push({kind:'agent_request',refId:foreign.id,meaning:'他依頼'},
    {kind:'agent_request',refId:'missing-preview',meaning:'未登録'});await saveState(state);
  assert.equal((await materials()).candidates[0].previewStatus.state,'unknown');
  Object.assign(job,{status:'running',claimOwnerId:'qa',claimedAt:'2026-01-01T00:00:00Z',claimExpiresAt:'2026-01-01T00:01:00Z'});
  review.options[0].evidenceRefs.push({kind:'agent_request',refId:job.id,meaning:'期限切れ作業'});await saveState(state);
  const before=await readFile(path.join(root,'state.json'));assert.equal((await materials()).candidates[0].previewStatus.state,'unknown');
  assert.deepEqual(await readFile(path.join(root,'state.json')),before);
});

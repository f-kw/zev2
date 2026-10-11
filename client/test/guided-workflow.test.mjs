import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');
const sharedURL = pathToFileURL(path.join(root, 'packages/shared/dist/index.js')).href;
const shared = await import(sharedURL);
const dataURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
async function compiled(file, imports) {
  let js = ts.transpileModule(await readFile(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  for (const [from, to] of Object.entries(imports)) js = js.replaceAll(`'${from}'`, `'${to}'`);
  return dataURL(js);
}
const guideURL = await compiled('client/src/guided-workflow.ts', { '@zev2/shared': sharedURL });
const { currentOutput, draftIdentity, draftStartBlockers, resumeBlockers, reviewBlockers, guideStep, previewStatusLabel, initialCandidateId, creationCheckLabels, digestCandidateAdditionState } = await import(guideURL);
const apiNames = ['createDraft','approveDraft','fetchState','fetchRuntimeConfig','fetchWorkflow','fetchUiReviewMaterials','submitHumanReviewAction',
  'requestGeneratedVideoChanges','submitFinalReview','retryAgentRequest','resumeAgentWork','cancelDraftAgentWork','applyWebGeminiReview','saveDigestSceneAddition',
  'saveDigestCompositionData','fetchDigestCompositionData','prepareDigestRetentionInputs','fetchDigestRetentionInputs'];
const apiURL = dataURL(`export const handlers = {}; ${apiNames.map(n => `export const ${n} = (...args) => handlers.${n}(...args);`).join('\n')}
export const formatApiError = e => e.message;`);
const { handlers } = await import(apiURL);
const piniaURL = pathToFileURL(require.resolve('pinia')).href;
const { setActivePinia, createPinia } = await import(piniaURL);
const storeURL = await compiled('client/src/stores/controlQueue.ts', {
  '@zev2/shared': sharedURL, '../guided-workflow': guideURL, '../api': apiURL, pinia: piniaURL
});
const { useControlQueueStore } = await import(storeURL);
// Store polling only: no browser, backend, provider or renderer is started by these tests.
globalThis.window = { setTimeout: cb => setTimeout(cb, 0) };
const config = { stt: {mode:'fixed'}, contentDiscovery: {mode:'fixed'}, editPlan: {mode:'fixed'},
  adjustment: {mode:'fixed'}, videoOutput:{encoder:'libx264',extraArgs:[]}, artifactDelivery:{mode:'local'},
  source:{defaultUri:'file:///saved/source.mp4',defaultPurpose:'会話の見どころ'}, agentClaim:{ttlMilliseconds:1} };
const input = { productionType:'clip', purpose:'会話の見どころ', sourceUri:'file:///saved/source.mp4', durationLabel:'60秒以内',
  themeCountLabel:'3候補', geminiModelName:shared.DEFAULT_GEMINI_MODEL, preset:'shorts_default' };
function fixture() {
  const state = shared.createInitialState();
  const draft = shared.createRequestDraft(input, '2026-10-11T01:00:00Z', () => 'draft-1');
  state.requestDrafts.push(draft);
  return {state,draft};
}
function renderFixture() {
  const {state,draft} = fixture();draft.status='approved';
  const file = {id:'video-1',kind:'output_video',uri:'/api/files/video-1.mp4',mimeType:'video/mp4',ownerId:'output-1',
    sha256:'a'.repeat(64),byteSize:1234,createdAt:'2026-10-11T01:10:00Z'};
  const request = {id:'render-1',requestDraftId:draft.id,type:'render_video',status:'succeeded',createdAt:file.createdAt,
    fileRefIds:[file.id],result:{fileRefId:file.id,outputId:'output-1',outputType:'OutputVideo'}};
  state.agentRequests.push(request);state.fileRefs.push(file);state.outputs.push({id:'output-1',type:'OutputVideo',fileRefId:file.id});
  return {state,draft,file,request};
}
function reviewFixture() {
  const {state,draft}=fixture();draft.status='approved';
  const producer={id:'themes-1',requestDraftId:draft.id,type:'propose_clip_themes',status:'succeeded',fileRefIds:['themes-file'],
    result:{fileRefId:'themes-file',outputId:'themes-output',outputType:'ThemeCandidates'}};
  state.agentRequests.push(producer);state.fileRefs.push({id:'themes-file',ownerId:'themes-output',kind:'themes_json',uri:'/api/mock/themes.json',sha256:'b'.repeat(64),byteSize:321});
  state.fileRefs[0].kind=shared.getFileRefKindForRequest(producer.type);
  state.outputs.push({id:'themes-output',type:'ThemeCandidates',fileRefId:'themes-file'});
  const review={id:'review-1',requestDraftId:draft.id,agentRequestId:producer.id,kind:'theme_selection',status:'review_required',
    createdAt:'2026-10-11T01:05:00Z',updatedAt:'2026-10-11T01:05:00Z', evidenceRefs:[{kind:'file_ref',refId:'themes-file'}],
    options:[{id:'scene-1',title:'見どころ',summary:'短い要約',evidenceRefs:[{kind:'time_range',refId:'range-1'}]}]};
  state.controlReviewItems.push(review);return {state,draft,review,producer};
}
function storeFor(state) {setActivePinia(createPinia());const s=useControlQueueStore();s.state=state;s.runtimeConfig=config;s.activeDraftId=state.requestDrafts[0]?.id||'';return s;}

test('saving a draft performs one save and zero approvals, even after repeated click', async()=>{
  const {state,draft}=fixture();const s=storeFor(shared.createInitialState());let saves=0, approvals=0, resolve;
  handlers.createDraft=()=>{saves++;return new Promise(r=>resolve=r);};handlers.approveDraft=()=>{approvals++;};
  const save=s.createRequestDraft(input);await s.createRequestDraft(input);resolve({draft,state});await save;
  assert.equal(saves,1);assert.equal(approvals,0);assert.equal(s.activeDraftId,draft.id);assert.equal(s.runPhase,'idle');
});
test('draft approval requires the exact confirmed version and available execution conditions',async()=>{
  const {state,draft}=fixture();const s=storeFor(state);let calls=0;
  handlers.approveDraft=async()=>{calls++;const next=structuredClone(state);next.requestDrafts[0].status='approved';return next;};
  const old=draftIdentity(draft);s.state.requestDrafts[0].purpose='変更後';await s.approveRequestDraft(draft.id,old);assert.equal(calls,0);
  const current=draftIdentity(s.state.requestDrafts[0]);s.runtimeConfig={...config,editPlan:{mode:'gemini'}};
  await s.approveRequestDraft(draft.id,current);assert.equal(calls,0);
  s.runtimeConfig=config;await s.approveRequestDraft(draft.id,current);assert.equal(calls,1);
});
test('digest registration and absent runtime are blocked without pretending video support',()=>{
  const {draft}=fixture();draft.productionType='digest';assert(draftStartBlockers(draft,config).length);
  draft.productionType='clip';assert(draftStartBlockers(draft,null).length);
});
test('Digest precreation progress requires current qualified material and never implies media completion',()=>{
  const {draft}=fixture();draft.productionType='digest';draft.status='approved';
  const m={requestDraftId:draft.id,draftIdentity:draftIdentity(draft),digestPreparation:{status:'verified'},digestComposition:{status:'current'}};
  assert.equal(guideStep(draft,undefined,false,false,'validate_digest_plan',m),3);
  assert.equal(guideStep(draft,undefined,false,false,'validate_digest_plan',{...m,draftIdentity:'old'}),2);
  assert.equal(guideStep(draft,undefined,false,false,'validate_digest_plan',{...m,requestDraftId:'other'}),2);
  assert.equal(guideStep(draft,undefined,false,false,'validate_digest_plan',{...m,digestPreparation:{status:'rejected'}}),2);
  const text=creationCheckLabels({audioPreservation:'preserve-source-only',sourceAudioReference:'registered'});
  assert.equal(text.audio,'元の音声を保持する指定');assert(text.completion.includes('未実施'));
  assert(creationCheckLabels(undefined).audio.includes('未確認'));assert(creationCheckLabels(undefined).source.includes('未確認'));
});

function digestAdditionFixture() {
  const {state,draft}=fixture();draft.productionType='digest';draft.status='approved';
  const candidates=['first','second'].map((id,i)=>({id,title:id,summary:id,speeches:[],ranges:[{startMs:i*1000,endMs:(i+1)*1000}]}));
  const materials={requestDraftId:draft.id,draftIdentity:draftIdentity(draft),fingerprint:'current-digest',candidates,segments:[],bindings:[],blockers:['製造未接続'],
    digestPreparation:{status:'verified'},digestComposition:{status:'current',currentCandidateIds:['first'],requestedCandidateIds:['first'],addedCandidateIds:[],editRequestIds:[]}};
  return {state,draft,materials};
}
function digestConfirmationFixture() {
  const f=digestAdditionFixture(),m=f.materials;m.fingerprint='added-scene-version';
  m.digestComposition={...m.digestComposition,status:'revision_requested',requestedCandidateIds:['first','second'],addedCandidateIds:['second'],editRequestIds:['human-addition'],
    basis:{selectionAdoptionBinding:{path:'original-selection.json',fileSha256:'b'.repeat(64)}}};
  const hash='c'.repeat(64),snapshotBinding={path:`artifacts/${f.draft.id}/ui-composition-${hash}--snapshot.json`,fileSha256:hash};
  const composition={status:'composition-data-only',requestDraftId:f.draft.id,requestHash:hash,snapshotBinding,
    compositionBinding:{path:`artifacts/${f.draft.id}/ui-composition-${hash}--composition.json`,fileSha256:'d'.repeat(64)},representedEditRequestIds:['human-addition'],
    composition:{schemaVersion:'ui-digest-human-composition-data-v001',status:'composition-data-only',requestDraftId:f.draft.id,draftIdentity:m.draftIdentity,requestHash:hash,
      snapshotBinding,representedEditRequestIds:['human-addition'],beforeCandidateIds:['first'],requestedCandidateIds:['first','second'],
      originalAiSelectionBinding:m.digestComposition.basis.selectionAdoptionBinding,scenes:[{candidateId:'first'},{candidateId:'second'}]}};
  const summary={status:'awaiting-retention-answers',requestDraftId:f.draft.id,requestHash:hash,preparationHash:'e'.repeat(64),
    pendingCandidates:[{candidateId:'second',title:'second',answerStatus:'unanswered'}],message:'未回答',
    admission:{retentionIntegration:'not-prepared',captionPreparation:'not-prepared',executionPermission:'not-approved',humanQuality:'pending'}};
  const s=storeFor(f.state);s.reviewMaterials=m;return {...f,s,composition,summary};
}
function digestConfirmationHandlers(f) {
  handlers.saveDigestCompositionData=async(id,input)=>{assert.equal(id,f.draft.id);assert.deepEqual(input,{draftIdentity:f.materials.draftIdentity,fingerprint:f.materials.fingerprint});return f.composition;};
  handlers.prepareDigestRetentionInputs=async(id,input)=>{assert.equal(id,f.draft.id);assert.deepEqual(input,{draftIdentity:f.materials.draftIdentity,fingerprint:f.materials.fingerprint,requestHash:f.composition.requestHash});return f.summary;};
  handlers.fetchDigestCompositionData=async(id,hash)=>{assert.equal(id,f.draft.id);assert.equal(hash,f.composition.requestHash);return f.composition;};
  handlers.fetchDigestRetentionInputs=async(id,hash)=>{assert.equal(id,f.draft.id);assert.equal(hash,f.composition.requestHash);return f.summary;};
  handlers.approveDraft=handlers.submitHumanReviewAction=handlers.resumeAgentWork=()=>assert.fail('Input preparation must not execute');
}
test('Digest confirmation saves the exact version once during repeated clicks, with no execution or state changes',async()=>{
  const f=digestConfirmationFixture();digestConfirmationHandlers(f);let resolve,saves=0,prepares=0;
  const save=handlers.saveDigestCompositionData,prepare=handlers.prepareDigestRetentionInputs;
  handlers.saveDigestCompositionData=async(...args)=>{saves++;await new Promise(r=>resolve=r);return save(...args);};
  handlers.prepareDigestRetentionInputs=async(...args)=>{prepares++;return prepare(...args);};
  const before=JSON.stringify(f.s.state),pending=f.s.prepareDigestConfirmation(f.materials.fingerprint);
  assert.equal(f.s.digestRetentionOperation,'preparing');assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),false);
  assert.equal(f.s.displayedDigestRetention,null);resolve();assert.equal(await pending,true);
  assert.equal(saves,1);assert.equal(prepares,1);assert.equal(f.s.digestRetentionOperation,'idle');
  assert.deepEqual(f.s.displayedDigestRetention,f.summary);assert.equal(JSON.stringify(f.s.state),before);
  assert(f.s.message.includes('未回答')&&f.s.message.includes('課金')&&f.s.message.includes('始まりません'));
});
test('Digest confirmation rejects old display and absent/changed source before any preparation request',async()=>{
  const f=digestConfirmationFixture();handlers.saveDigestCompositionData=()=>assert.fail('Invalid display must not write');
  assert.equal(await f.s.prepareDigestConfirmation('old'),false);
  f.s.reviewMaterials.digestComposition.status='source_changed';assert.equal(f.s.canPrepareDigestRetention,false);
  assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),false);
  f.s.reviewMaterials=null;assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),false);
  assert.equal(await f.s.rereadDigestConfirmation(),false);
});
test('Digest confirmation checks the full displayed chain and original adoption reference before preparing new inputs',async()=>{
  for(const kind of ['draft','hash','requests','before','scenes','original-adoption']) {
    const f=digestConfirmationFixture();digestConfirmationHandlers(f);const changed=structuredClone(f.composition);
    if(kind==='draft')changed.composition.draftIdentity='old';
    if(kind==='hash')changed.snapshotBinding.fileSha256='0'.repeat(64);
    if(kind==='requests')changed.representedEditRequestIds=['old-human-addition'];
    if(kind==='before')changed.composition.beforeCandidateIds=['second'];
    if(kind==='scenes')changed.composition.scenes.reverse();
    if(kind==='original-adoption')changed.composition.originalAiSelectionBinding.fileSha256='0'.repeat(64);
    handlers.saveDigestCompositionData=async()=>changed;handlers.prepareDigestRetentionInputs=()=>assert.fail('Mismatched chain must not prepare');
    assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),false);assert.equal(f.s.displayedDigestRetention,null);
  }
});
test('Digest confirmation does not display mismatched hashes/scenes or an invented answered/execution status',async()=>{
  for(const kind of ['hash','draft','scene','title','answered','execution']) {
    const f=digestConfirmationFixture();digestConfirmationHandlers(f);const changed=structuredClone(f.summary);
    if(kind==='hash')changed.requestHash='0'.repeat(64);if(kind==='draft')changed.requestDraftId='other';
    if(kind==='scene')changed.pendingCandidates[0].candidateId='first';if(kind==='title')changed.pendingCandidates[0].title='wrong';
    if(kind==='answered')changed.pendingCandidates[0].answerStatus='answered';if(kind==='execution')changed.admission.executionPermission='approved';
    handlers.prepareDigestRetentionInputs=async()=>changed;
    assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),false);assert.equal(f.s.displayedDigestRetention,null);
    assert(f.s.errorMessage.includes('一致しません'));assert.equal(f.s.canReadDigestRetention,true);
  }
});
test('Digest confirmation read uses only GETs and checks the same stored request version',async()=>{
  const f=digestConfirmationFixture();digestConfirmationHandlers(f);assert.equal(await f.s.prepareDigestConfirmation(f.materials.fingerprint),true);
  handlers.saveDigestCompositionData=handlers.prepareDigestRetentionInputs=()=>assert.fail('Read must not write');
  let resolve,reads=0;const read=handlers.fetchDigestCompositionData;
  handlers.fetchDigestCompositionData=async(...args)=>{reads++;await new Promise(r=>resolve=r);return read(...args);};
  const before=JSON.stringify(f.s.state),pending=f.s.rereadDigestConfirmation();
  assert.equal(f.s.digestRetentionOperation,'reading');assert.equal(f.s.displayedDigestRetention,null);
  assert.equal(await f.s.rereadDigestConfirmation(),false);resolve();assert.equal(await pending,true);assert.equal(reads,1);
  assert.deepEqual(f.s.displayedDigestRetention,f.summary);assert.equal(JSON.stringify(f.s.state),before);
});
test('Digest confirmation read failure clears the former result and permits a verified retry without writes',async()=>{
  const f=digestConfirmationFixture();digestConfirmationHandlers(f);await f.s.prepareDigestConfirmation(f.materials.fingerprint);
  const read=handlers.fetchDigestRetentionInputs;handlers.fetchDigestRetentionInputs=async()=>{throw new Error('保存済みの発話資料が不足しています。');};
  assert.equal(await f.s.rereadDigestConfirmation(),false);assert.equal(f.s.displayedDigestRetention,null);assert(f.s.errorMessage.includes('不足'));
  handlers.fetchDigestRetentionInputs=read;assert.equal(await f.s.rereadDigestConfirmation(),true);assert.deepEqual(f.s.displayedDigestRetention,f.summary);
  handlers.fetchDigestCompositionData=async()=>({...f.composition,requestHash:'0'.repeat(64)});
  handlers.fetchDigestRetentionInputs=()=>assert.fail('Wrong stored version must not be read as current');
  assert.equal(await f.s.rereadDigestConfirmation(),false);assert.equal(f.s.displayedDigestRetention,null);
});
test('Digest confirmation hides an older result on source/display change, even if its original request hash still exists',async()=>{
  const f=digestConfirmationFixture();digestConfirmationHandlers(f);await f.s.prepareDigestConfirmation(f.materials.fingerprint);
  f.s.reviewMaterials={...f.s.reviewMaterials,fingerprint:'newer-display'};
  assert.equal(f.s.displayedDigestRetention,null);assert.equal(f.s.canReadDigestRetention,false);
  handlers.fetchDigestCompositionData=()=>assert.fail('Old request version cannot be read from a new display');
  assert.equal(await f.s.rereadDigestConfirmation(),false);
});
test('Digest confirmation ignores late save/read responses after navigation or material refresh',async()=>{
  for(const phase of ['composition','inputs','read']) {
    const f=digestConfirmationFixture();digestConfirmationHandlers(f);let resolve;
    if(phase==='read')await f.s.prepareDigestConfirmation(f.materials.fingerprint);
    const name=phase==='composition'?'saveDigestCompositionData':phase==='inputs'?'prepareDigestRetentionInputs':'fetchDigestCompositionData';
    const original=handlers[name];handlers[name]=(...args)=>new Promise(r=>resolve=()=>r(original(...args)));
    const pending=phase==='read'?f.s.rereadDigestConfirmation():f.s.prepareDigestConfirmation(f.materials.fingerprint);
    while(!resolve)await new Promise(r=>setImmediate(r));
    f.s.activeDraftId='other';f.s.uiMaterialReadNumber++;resolve();assert.equal(await pending,false);
    assert.equal(f.s.displayedDigestRetention,null);assert.equal(f.s.digestRetentionOperation,'idle');
  }
});
test('Digest scene addition saves only an editing request once and returns to content confirmation',async()=>{
  const {state,draft,materials}=digestAdditionFixture(),s=storeFor(state);s.reviewMaterials=materials;let calls=0,resolve;
  handlers.saveDigestSceneAddition=(id,input)=>{calls++;assert.equal(id,draft.id);assert.deepEqual(input,{draftIdentity:materials.draftIdentity,fingerprint:materials.fingerprint,candidateId:'second'});return new Promise(r=>resolve=r);};
  handlers.approveDraft=handlers.submitHumanReviewAction=handlers.resumeAgentWork=()=>{assert.fail('Saving intent must not execute');};
  const first=s.requestDigestSceneAddition('second',materials.fingerprint);assert.equal(await s.requestDigestSceneAddition('second',materials.fingerprint),false);
  const after={...materials,fingerprint:'after-addition',digestComposition:{...materials.digestComposition,status:'revision_requested',requestedCandidateIds:['first','second'],addedCandidateIds:['second']}};
  resolve({changed:true,materials:after});assert.equal(await first,true);assert.equal(calls,1);assert.deepEqual(s.state,state);
  assert.equal(s.runPhase,'review_required');assert.equal(guideStep(draft,undefined,false,false,'validate_digest_plan',s.reviewMaterials),2);
  assert.equal(await s.requestDigestSceneAddition('second',after.fingerprint),false);assert.equal(calls,1);
});
test('Digest addition refuses stale, absent, already adopted and changed-base candidates without sending',async()=>{
  const {state,materials}=digestAdditionFixture(),s=storeFor(state);s.reviewMaterials=materials;
  handlers.saveDigestSceneAddition=()=>assert.fail('Invalid choice must not be sent');
  for(const [id,fp] of [['first',materials.fingerprint],['absent',materials.fingerprint],['second','old']]) assert.equal(await s.requestDigestSceneAddition(id,fp),false);
  s.reviewMaterials.digestComposition.status='source_changed';assert.equal(await s.requestDigestSceneAddition('second',materials.fingerprint),false);
  assert.equal(digestCandidateAdditionState(materials,'second'),'unavailable');
});
test('late Digest addition response never replaces another draft or newer material read',async()=>{
  const {state,materials}=digestAdditionFixture(),s=storeFor(state);s.reviewMaterials=materials;let resolve;
  handlers.saveDigestSceneAddition=()=>new Promise(r=>resolve=r);const pending=s.requestDigestSceneAddition('second',materials.fingerprint);
  s.activeDraftId='other';s.reviewMaterials=null;resolve({changed:true,materials});assert.equal(await pending,false);assert.equal(s.reviewMaterials,null);
});
test('Digest candidate state separates base adoption, requested addition, unavailable and overlapping scenes',()=>{
  const {materials}=digestAdditionFixture();assert.equal(digestCandidateAdditionState(materials,'first'),'adopted');assert.equal(digestCandidateAdditionState(materials,'second'),'available');
  materials.digestComposition.requestedCandidateIds.push('second');assert.equal(digestCandidateAdditionState(materials,'second'),'requested');
  materials.digestComposition.requestedCandidateIds.pop();materials.candidates[1].ranges=[{startMs:500,endMs:1500}];assert.equal(digestCandidateAdditionState(materials,'second'),'overlap');
  assert.equal(digestCandidateAdditionState(materials,'absent'),'unavailable');
});
test('current output binds owner, kind, bytes, output record and newest producer',()=>{
  const {state,draft,file}=renderFixture();assert.equal(currentOutput(state,draft.id)?.id,file.id);
  for(const field of ['ownerId','kind','sha256','mimeType']) {const bad=structuredClone(state);bad.fileRefs[0][field]='wrong';
    if(field==='sha256') bad.fileRefs[0][field]=''; assert.equal(currentOutput(bad,draft.id),undefined);}
  const unrelated=structuredClone(state);unrelated.agentRequests[0].requestDraftId='another';assert.equal(currentOutput(unrelated,draft.id),undefined);
  const disconnected=structuredClone(state);disconnected.outputs[0].fileRefId='another';assert.equal(currentOutput(disconnected,draft.id),undefined);
  state.agentRequests.push({id:'render-2',requestDraftId:draft.id,type:'render_video',status:'failed',createdAt:'2026-10-11T01:11:00Z'});
  assert.equal(currentOutput(state,draft.id),undefined);
});
test('missing or stale content material is rejected at the store approval boundary',async()=>{
  const {state,draft,review,producer}=reviewFixture();assert.equal(reviewBlockers(state,draft,review).length,0);
  const s=storeFor(state);let calls=0;handlers.submitHumanReviewAction=async()=>{calls++;return state;};
  await s.submitControlReview(review.id,'approve','確認','absent');assert.equal(calls,0);
  producer.status='superseded';await s.submitControlReview(review.id,'approve','確認','scene-1');assert.equal(calls,0);
});
test('render readiness never treats an arbitrary text option as a complete confirmation package',()=>{
  const {state,draft,review}=reviewFixture();review.kind='render_readiness';assert(reviewBlockers(state,draft,review).length);
});
test('same-request older pending review cannot authorize current review',()=>{
  const {state,draft,review}=reviewFixture();state.controlReviewItems.push({...review,id:'review-2',createdAt:'2026-10-11T01:06:00Z'});
  assert(reviewBlockers(state,draft,review).length);
});
test('latest refresh wins and late read cannot overwrite saved draft mutation',async()=>{
  const {state,draft}=fixture();const s=storeFor(shared.createInitialState());let resolves=[];
  handlers.fetchWorkflow=async()=>({steps:[]});handlers.fetchRuntimeConfig=async()=>config;
  handlers.fetchState=()=>new Promise(r=>resolves.push(r));
  const first=s.refresh();const second=s.refresh();resolves[1](state);await second;
  resolves[0](shared.createInitialState());await first;assert.equal(s.state.requestDrafts[0].id,draft.id);
  const oldRead=s.refresh();handlers.createDraft=async()=>({draft,state});await s.createRequestDraft(input);
  resolves[2](shared.createInitialState());await oldRead;assert.equal(s.state.requestDrafts[0].id,draft.id);
});
test('final review cannot save a different draft or an output with missing registration',async()=>{
  const {state,draft}=renderFixture();const s=storeFor(state);let calls=0;
  handlers.submitFinalReview=async()=>{calls++;return {state};};s.activeDraftId='another';
  await s.submitFinalReview(draft.id,'final_complete');assert.equal(calls,0);
  s.activeDraftId=draft.id;s.state.outputs=[];await s.submitFinalReview(draft.id,'final_complete');assert.equal(calls,0);
});
test('guide maps saved draft, content, readiness and completed video without reusing past result',()=>{
  const {draft}=fixture();assert.equal(guideStep(draft,undefined,false,false),1);draft.status='approved';
  assert.equal(guideStep(draft,{kind:'theme_selection'},false,false),2);assert.equal(guideStep(draft,{kind:'render_readiness'},false,false),3);
  assert.equal(guideStep(draft,undefined,false,false),2);assert.equal(guideStep(draft,undefined,false,false,'run_stt'),2);
  assert.equal(guideStep(draft,undefined,false,false,'create_edit_plan'),3);assert.equal(guideStep(draft,undefined,false,false,'render_video'),4);
  assert.equal(guideStep(draft,undefined,true,false),5);
  assert.equal(guideStep(draft,undefined,true,true),0);
});
test('reload binds the displayed saved draft before final actions',async()=>{
  const {state,draft}=renderFixture();const s=storeFor(shared.createInitialState());
  handlers.fetchWorkflow=async()=>({steps:[]});handlers.fetchRuntimeConfig=async()=>config;handlers.fetchState=async()=>state;
  await s.refresh();assert.equal(s.activeDraftId,draft.id);assert.equal(s.runPhase,'completed');
});
test('registered content requires the producer output ID and file owner to agree',()=>{
  const {state,draft,review}=reviewFixture();assert.equal(reviewBlockers(state,draft,review).length,0);
  state.fileRefs[0].ownerId=draft.id;assert(reviewBlockers(state,draft,review).length);
});
test('resume sends the active approved version even when another request is ready',async()=>{
  const {state,draft}=fixture();draft.status='approved';let index=0;
  state.agentRequests=shared.createAgentRequestsFromDraft(draft,'2026-10-11T01:00:00Z',()=> 'queue-'+(++index));
  assert.deepEqual(resumeBlockers(state,draft.id),[]);
  const other=shared.createRequestDraft(input,'2026-10-11T01:20:00Z',()=> 'other');other.status='approved';state.requestDrafts.push(other);
  state.agentRequests.push(...shared.createAgentRequestsFromDraft(other,other.createdAt,()=> 'queue-'+(++index)));
  const s=storeFor(state);s.activeDraftId=draft.id;let calls=0;
  handlers.resumeAgentWork=async scope=>{calls++;assert.deepEqual(scope,shared.executionScopeForDraft(draft));
    const next=structuredClone(state);next.agentRequests.filter(r=>r.requestDraftId===draft.id).forEach(r=>r.status='cancelled');return next;};
  await s.resumeAgentWork();assert.equal(calls,1);assert(s.state.agentRequests.some(r=>r.requestDraftId===other.id&&r.status==='queued'));
  s.state.agentRequests.find(r=>r.requestDraftId===other.id).status='running';
  s.state.agentRequests.find(r=>r.requestDraftId===draft.id).status='queued';await s.resumeAgentWork();assert.equal(calls,1);
});
test('retry and cancel are scoped to the active saved request',async()=>{
  const {state,draft}=fixture();state.agentRequests.push({id:'old-failure',requestDraftId:'other',status:'failed'});
  const s=storeFor(state);let retries=0,cancels=0;handlers.retryAgentRequest=async()=>{retries++;};handlers.cancelDraftAgentWork=async()=>{cancels++;};
  await s.retryAgentRequest('old-failure');await s.cancelDraftAgentWork('other');assert.equal(retries,0);assert.equal(cancels,0);
  s.activeDraftId=draft.id;assert.equal(s.loading,false);
});
test('revision cannot create a copy from an absent or different current output',async()=>{
  const {state,draft}=renderFixture();const s=storeFor(state);let calls=0;
  handlers.requestGeneratedVideoChanges=async()=>{calls++;};
  await s.requestGeneratedVideoChanges('other','字幕','edit_plan');await s.requestGeneratedVideoChanges(draft.id,'','edit_plan');
  s.state.outputs=[];await s.requestGeneratedVideoChanges(draft.id,'字幕','edit_plan');assert.equal(calls,0);
});
test('a newer attempt with the same saved clock hides an older video',()=>{
  const {state,draft,request}=renderFixture();state.agentRequests.push({...request,id:'render-new',status:'failed',result:undefined});
  assert.equal(currentOutput(state,draft.id),undefined);
});


test('late material fetch cannot replace another draft or a newer displayed confirmation',async()=>{
  const {state,draft,review}=reviewFixture();const s=storeFor(state);let pending=[];
  handlers.fetchUiReviewMaterials=()=>new Promise(r=>pending.push(r));
  const model={requestDraftId:draft.id,draftIdentity:draftIdentity(draft),review,fingerprint:'latest',candidates:[],segments:[],bindings:[],blockers:[]};
  const older=s.refreshUiReviewMaterials(draft.id),newer=s.refreshUiReviewMaterials(draft.id);
  pending[1](model);await newer;pending[0]({...model,fingerprint:'stale'});await older;
  assert.equal(s.reviewMaterials.fingerprint,'latest');
  const late=s.refreshUiReviewMaterials(draft.id);s.activeDraftId='other';pending[2](model);await late;
  assert.equal(s.reviewMaterials,null);
});


test('registered recommendation selects only a candidate in the current matching review',()=>{
  const {draft,review}=reviewFixture();review.options.push({...review.options[0],id:'scene-2'});
  const m={requestDraftId:draft.id,review,blockers:[],recommendation:{candidateId:'scene-2',reason:'保存根拠'}};
  assert.equal(initialCandidateId(review,m),'scene-2');assert.equal(initialCandidateId(review,{...m,requestDraftId:'other'}),'scene-1');
  assert.equal(initialCandidateId(review,{...m,blockers:['資料不足']}),'scene-1');assert.equal(initialCandidateId(review,null),'scene-1');
});
test('preview labels distinguish unknown, registered waiting, claimed preparing and generated',()=>{
  assert.match(previewStatusLabel(),/不明/);
  assert.match(previewStatusLabel({preview:{id:'unqualified'}}),/不明/);
  for (const [state,label] of [['not_created','未作成'],['preparing','準備中'],['ready','生成済み'],['failed','失敗'],['cancelled','中止']]) {
    assert(previewStatusLabel({previewStatus:{state,requestId:'registered-job'}}).includes(label));
  }
});

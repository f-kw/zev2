import assert from 'node:assert/strict';
import {test,before} from 'node:test';
import {readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT,type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  readRepairBoundBytesV001,loadCaptionRepairContextV001,describeCaptionRepairV001,createCaptionRepairSessionV001,
  observeCaptionRepairFrameV001,saveCaptionRepairObservationV001,savedCaptionRepairObservationsV001,
  validateCaptionLocalRepairV001,captionRepairApprovalDraftV001,adoptCaptionLocalRepairV001,
  reconstructCaptionLocalRepairV001,publishCaptionLocalRepairV001,verifyCaptionRepairScopeV001,
} from './caption_local_repair_common_v001.mts';
import {reconstructHistoricalCaptionRepairV001,HISTORICAL_FIXTURE_BINDING_V001,REPAIR_WORK_V001} from './replay_caption_local_repair_v001.mts';
import {startCaptionRepairUIV001} from './caption_local_repair_ui_v001.mts';

let digest:Awaited<ReturnType<typeof reconstructHistoricalCaptionRepairV001>>;
let distant:typeof digest;
before(async()=>{digest=await reconstructHistoricalCaptionRepairV001('digest','test');distant=await reconstructHistoricalCaptionRepairV001('distant','test');});

test('both historical fixtures reconstruct every final caption field, text ID, frame and line end',()=>{
  assert.deepEqual(digest.actualInputs,digest.expectedInputs);assert.equal(digest.actualInputs.instructions.length,32);
  assert.deepEqual(distant.actualInputs,distant.expectedInputs);assert.equal(distant.actualInputs.instructions.length,4);
  assert.deepEqual(digest.records.map(row=>row.operation.kind),['exclude-caption','change-boundaries','change-boundaries']);
  assert.equal(digest.records[1].operation.start.mode,'observed');assert.equal(digest.records[1].operation.end.mode,'keep-current');
  assert.equal(digest.records[2].operation.start.mode,'keep-current');assert.equal(digest.records[2].operation.end.mode,'observed');
  assert.equal(distant.records[1].operation.start.mode,'observed');assert.equal(distant.records[1].operation.end.mode,'observed');
  for(const b of [digest,distant]){assert.equal(b.rebuilt.core.captionAdoption.newHumanJudgment,false);assert.equal(b.rebuilt.core.captionAdoption.purpose,'fixture-replay');verifyCaptionRepairScopeV001(b.context,b.rebuilt.core,b.adoption);}
});
test('final frame endpoint and explicitly kept endpoints preserve the existing Core clock',()=>{
  const last=distant.rebuilt.core.captionAdoption.changes.at(-1);
  assert.equal(last.frames.endFrameExclusive,1671);assert.equal(last.observed.end.presentedVideoFrame,1670);
  assert.equal(last.observed.end.selectedVideoFrame,1671);assert.equal(last.observed.end.outputAudioSample,1671*44100/30);
  assert.deepEqual(digest.actualInputs.instructions[13].outputTime,{startFrame:1723,endFrameExclusive:1794});
  assert.deepEqual(digest.actualInputs.instructions[14].outputTime,{startFrame:2673,endFrameExclusive:2708});
});
for(const [name,mutate] of [
  ['other video SHA',(op:any)=>op.target.completedMediaSha256='0'.repeat(64)],
  ['base video SHA',(op:any)=>op.target.baseMediaSha256='0'.repeat(64)],
  ['other subtitle ID',(op:any)=>op.target.instructionId=distant.source.allowedTargets[0].instructionId],
  ['different text IDs',(op:any)=>op.target.textIds[0]='unrelated-text'],
  ['different caption text',(op:any)=>op.target.text+='変更'],
  ['audio packet SHA',(op:any)=>op.target.audioPacketSha256='0'.repeat(64)],
  ['original formal input SHA',(op:any)=>op.target.originalFormalInputSha256='0'.repeat(64)],
  ['unobserved receipt',(op:any)=>op.start.observation.observationId=randomUUID()],
  ['unobserved frame substitution',(op:any)=>op.start.observation.selectedVideoFrame++],
  ['unobserved presented frame',(op:any)=>op.start.observation.presentedVideoFrame++],
  ['wrong output audio sample',(op:any)=>op.start.observation.outputAudioSample++],
  ['wrong source audio sample',(op:any)=>op.start.observation.sourceAudioSample++],
  ['wrong source frame',(op:any)=>op.start.observation.sourceVideoFrame++],
  ['fixture disguised as human frame',(op:any)=>op.start.observation.purpose='human-observation'],
  ['extra exclusion field on boundary operation',(op:any)=>op.reason='exclude instead'],
  ['hidden value on kept boundary',(op:any)=>{op.end={mode:'keep-current',observation:op.end.observation};}],
] as const)test(`common validator rejects ${name}`,()=>{
  const op=structuredClone(distant.records[1].operation);mutate(op);assert.throws(()=>saveCaptionRepairObservationV001(distant.session,op));
});
for(const [name,mutate] of [
  ['boundary fields on exclusion',(op:any)=>op.start={mode:'keep-current'}],
  ['exclusion disguised as zero interval',(op:any)=>{op.kind='change-boundaries';op.start={mode:'keep-current'};op.end={mode:'keep-current'};}],
  ['unconfirmed excluded text',(op:any)=>op.confirmedText='別の字幕'],
  ['missing explicit exclusion reason',(op:any)=>op.reason='  '],
] as const)test(`common validator rejects ${name}`,()=>{
  const op=structuredClone(digest.records[0].operation);mutate(op);assert.throws(()=>saveCaptionRepairObservationV001(digest.session,op));
});
test('exclusion permission is distinct from boundary permission',()=>{
  const target=describeCaptionRepairV001(distant.context).targets[1];
  assert.throws(()=>saveCaptionRepairObservationV001(distant.session,{kind:'exclude-caption',target,reason:'test',confirmedText:target.text}));
});
for(const frame of [-1,1505.5,NaN,Infinity,900,1671])test(`reject invalid or unseen presentation frame ${frame}`,()=>{
  assert.throws(()=>observeCaptionRepairFrameV001(distant.session,distant.source.allowedTargets[1].instructionId,frame));
});
test('reject start >= end even when both frame receipts were issued',()=>{
  const target=describeCaptionRepairV001(distant.context).targets[1];
  for(const endFrame of [1505,1504]) {
    const start=observeCaptionRepairFrameV001(distant.session,target.instructionId,1505);
    const end=observeCaptionRepairFrameV001(distant.session,target.instructionId,endFrame);
    assert.throws(()=>saveCaptionRepairObservationV001(distant.session,{kind:'change-boundaries',target,
      start:{mode:'observed',observation:start},end:{mode:'observed',observation:end}}));
  }
});
test('reject overlap with untouched caption instead of moving that caption',()=>{
  const target=describeCaptionRepairV001(distant.context).targets[1];
  const start=observeCaptionRepairFrameV001(distant.session,target.instructionId,1300);
  const end=observeCaptionRepairFrameV001(distant.session,target.instructionId,1505);
  const row=saveCaptionRepairObservationV001(distant.session,{kind:'change-boundaries',target,start:{mode:'observed',observation:start},end:{mode:'observed',observation:end}});
  assert.throws(()=>validateCaptionLocalRepairV001(distant.session,[row]));
});
test('validation does not accept a replaced or relabeled saved fixture',()=>{
  const rows=structuredClone(digest.records);rows[0].purpose='human-observation';
  assert.throws(()=>validateCaptionLocalRepairV001(digest.session,rows));
  assert.throws(()=>validateCaptionLocalRepairV001(digest.session,[digest.records[0],digest.records[0]]));
});
test('fixture receipt cannot cross into a live human session',async()=>{
  const session=await createCaptionRepairSessionV001(distant.context,'human-observation');
  assert.throws(()=>saveCaptionRepairObservationV001(session,distant.records[1].operation));
  await assert.rejects(()=>createCaptionRepairSessionV001(distant.context,'human-observation',[HISTORICAL_FIXTURE_BINDING_V001]));
});
test('observation and validation have no formal execution authority',async()=>{
  assert.throws(()=>adoptCaptionLocalRepairV001(digest.records[0] as any,digest.approval));
  await assert.rejects(()=>reconstructCaptionLocalRepairV001(digest.validation as any,`${REPAIR_WORK_V001}/unauthorized`,'invalid'));
  const approval=structuredClone(digest.approval);approval.observationSha256s.pop();
  assert.throws(()=>adoptCaptionLocalRepairV001(digest.validation,approval));
  const relabeled=structuredClone(digest.approval);relabeled.purpose='human-observation';
  assert.throws(()=>adoptCaptionLocalRepairV001(digest.validation,relabeled));
});
test('historical file substitution fails against the separately pinned evidence binding',async()=>{
  await assert.rejects(()=>readRepairBoundBytesV001({...HISTORICAL_FIXTURE_BINDING_V001,fileSha256:'0'.repeat(64)}));
});
for(const [name,mutate] of [
  ['untargeted caption frame',(core:any)=>core.instruction.instructions[0].outputTime.endFrameExclusive++],
  ['other caption text',(core:any)=>core.instruction.instructions[0].content.text+='変化'],
  ['caption line ending',(core:any)=>core.selection.response.captions[0].cues[0].lineEndBoundaryIds.reverse()],
  ['retained media segment',(core:any)=>core.meaning.orderedCandidates[0].timelineSegmentId='different'],
  ['base media',(core:any)=>core.rendererJob.cropAppliedBaseMedia.baseMedia.fileSha256='0'.repeat(64)],
  ['audio/media generation',(core:any)=>core.rendererJob.cropAppliedBaseMedia.generationManifest.fileSha256='0'.repeat(64)],
  ['timeline',(core:any)=>core.instruction.sourceBindings.timeline.fileSha256='0'.repeat(64)],
  ['style',(core:any)=>core.rendererJob.executionInputs.visualStateId='different-style'],
  ['renderer',(core:any)=>core.rendererJob.rendererImplementationBindings[0].fileSha256='0'.repeat(64)],
  ['QC rules',(core:any)=>core.rendererJob.registryBindings.rendererTrust.fileSha256='0'.repeat(64)],
] as const)test(`scope rejects ${name}`,()=>{
  const core=structuredClone(distant.rebuilt.core);mutate(core);assert.throws(()=>verifyCaptionRepairScopeV001(distant.context,core,distant.adoption));
});
test('publication rejects tampering with an already reconstructed provenance graph or destination',async()=>{
  const b=await reconstructHistoricalCaptionRepairV001('distant','tamper-test');
  b.rebuilt.core.captionAdoption.purpose='human-observation';
  await assert.rejects(()=>publishCaptionLocalRepairV001(b.rebuilt));
  const c=await reconstructHistoricalCaptionRepairV001('distant','path-test');c.rebuilt.artifacts.instruction.path=distant.source.artifacts.instruction.path;
  await assert.rejects(()=>publishCaptionLocalRepairV001(c.rebuilt));
});

test('shared HTTP UI saves, reloads, validates and explicitly approves through the same render path',async()=>{
  let renderCalls=0;
  const outputRoot=`${REPAIR_WORK_V001}/http-test-${randomUUID()}`;
  const ui=await startCaptionRepairUIV001({cases:[{id:'distant',title:'遠方接続',context:distant.context,seed:distant.records}],purpose:'ui-verification',outputRoot,
    render:async b=>{renderCalls++;verifyCaptionRepairScopeV001(b.context,b.core,b.token);return {execution:{},admission:{},lineLayout:{},qc:'passed',video:distant.fixture.expectedVideo} as any;}});
  try {
    const state=await (await fetch(ui.url+'api/state')).json();const c=state.cases[0];
    assert.equal(c.purpose,'ui-verification');assert.equal(c.records.length,3);assert(c.records.every((r:any)=>r.purpose==='ui-verification'));
    const headers={'Content-Type':'application/json',Origin:ui.url.slice(0,-1)};
    const post=async(route:string,extra:Json={})=>fetch(ui.url+route,{method:'POST',headers,body:JSON.stringify({caseId:'distant',sourceSha256:c.sourceSha256,...extra})});
    assert.equal((await post('api/render',{approvalId:'fake',approval:{}})).status,400);assert.equal(renderCalls,0);
    const preview=await (await post('api/validate')).json();assert.equal(renderCalls,0);
    const response=await post('api/render',{approvalId:preview.approvalId,approval:preview.approval});assert.equal(response.status,202);
    let next;
    do {next=await (await fetch(ui.url+'api/state')).json();await new Promise(resolve=>setTimeout(resolve,20));} while(next.cases[0].run.status==='running');
    assert.equal(next.cases[0].run.status,'completed');assert.equal(renderCalls,1);
    assert.equal((await post('api/render',{approvalId:preview.approvalId,approval:preview.approval})).status,200);assert.equal(renderCalls,1);
    assert.equal((await post('api/save',{operation:c.records[0].operation})).status,200);
    const revised=await (await fetch(ui.url+'api/state')).json();
    assert.equal(revised.cases[0].run,null,'saving a new draft must hide the prior completed preview');
    assert.equal((await fetch(ui.url+'media/distant/after')).status,400);
    assert.equal((await post('api/render',{approvalId:preview.approvalId,approval:preview.approval})).status,400);
    assert.equal(renderCalls,1,'editing the draft cannot trigger a new render');
    const range=await fetch(ui.url+'media/distant/before',{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,32);
    assert.equal((await fetch(ui.url+'media/distant/before',{headers:{Range:'bytes=999999999999-'}})).status,416);
    assert.equal((await fetch(ui.url+'api/save',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://example.invalid'},body:'{}'})).status,403);
    assert.equal((await post('api/frame',{instructionId:c.targets[1].instructionId,presentedVideoFrame:1505,boundaryKind:'frame-start',purpose:'human-observation'})).status,400);
    const file=path.join(ROOT,outputRoot,c.records[0].observationId+'.json');const raw=await readFile(file,'utf8');
    await writeFile(file,raw.replace('ui-verification','human-observation'));
    assert.equal((await fetch(ui.url+'api/state')).status,400);
  } finally {await ui.close();await rm(path.join(ROOT,outputRoot),{recursive:true,force:true});}
});

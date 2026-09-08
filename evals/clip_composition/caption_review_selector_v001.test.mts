import assert from 'node:assert/strict';
import {test,before} from 'node:test';
import {readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {selectCaptionReviewV001,type CaptionReviewFeaturesV001} from '../../packages/shared/src/caption-review-selector-v001.js';
import {ROOT} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadCaptionReviewInputsV001,reconstructCaptionReviewTruthV001,evaluateCaptionReviewsV001,
  createSelectedCaptionReviewCasesV001,captionReviewSummaryV001,REVIEW_WORK_V001} from './caption_review_selector_v001.mts';
import {startCaptionRepairUIV001} from './caption_local_repair_ui_v001.mts';
import {loadHistoricalCaptionRepairFixtureV001} from './replay_caption_local_repair_v001.mts';

const clean = ():CaptionReviewFeaturesV001=>({sttIntervals:[{startMs:1000,endMs:2000}],display:{startFrame:30,endFrameExclusive:60},
  previousEndFrame:30,nextStartFrame:60,mappingAvailable:true,
  acoustic:{available:true,startResolved:true,endResolved:true,startOutputFrame:30,endOutputFrame:60,whollyOutsideAdoptedUnitCount:0}});

test('short duration and contiguous neighbors alone do not trigger review',()=>{
  const f=clean();f.display.endFrameExclusive=31;f.nextStartFrame=31;f.acoustic.endOutputFrame=31;
  f.sttIntervals=[{startMs:1000,endMs:1001}];assert.equal(selectCaptionReviewV001(f).status,'no-review-signal');
});
test('missing observations never become a synchronization approval or fabricated boundary',()=>{
  const f=clean();f.acoustic={available:false,startResolved:false,endResolved:false,startOutputFrame:null,endOutputFrame:null,whollyOutsideAdoptedUnitCount:0};
  const r=selectCaptionReviewV001(f);assert.equal(r.status,'insufficient-evidence');assert.deepEqual(r.signals,[]);
  assert(r.missingEvidence.includes('saved-acoustic-observation-missing'));assert(!('correct' in r));
});
test('unobserved window origin cannot be interpreted as a resolved speech onset',()=>{
  const f=clean();f.acoustic.startResolved=false;f.acoustic.startOutputFrame=null;
  assert.deepEqual(selectCaptionReviewV001(f).signals,['unresolved-acoustic-boundary']);
});
test('nonpositive recognition remains a distinct technical signal even without acoustics',()=>{
  const f=clean();f.sttIntervals=[{startMs:1000,endMs:1000}];
  assert.deepEqual(selectCaptionReviewV001(f).signals,['nonpositive-recognition']);
  f.sttIntervals[0].endMs=999;assert.equal(selectCaptionReviewV001(f).status,'review-required');
});
test('touching, overlapping and disjoint half-open intervals are distinguished without a seconds threshold',()=>{
  const f=clean();f.acoustic.endOutputFrame=30;f.acoustic.startOutputFrame=29;
  assert.deepEqual(selectCaptionReviewV001(f).signals,['acoustic-display-disjoint']);
  f.acoustic.endOutputFrame=30.01;assert.deepEqual(selectCaptionReviewV001(f).signals,[]);
  f.previousEndFrame=31;assert.deepEqual(selectCaptionReviewV001(f).signals,['caption-overlap']);
});
test('signals are independent and the selector is pure, translation invariant and insensitive to identity or labels',()=>{
  const f=clean();f.acoustic.whollyOutsideAdoptedUnitCount=1;f.previousEndFrame=31;
  const before=structuredClone(f), expected=selectCaptionReviewV001(f);
  assert.deepEqual(expected.signals,['acoustic-outside-adopted-media','caption-overlap']);assert.deepEqual(f,before);
  const shifted=structuredClone(f);for(const s of shifted.sttIntervals){s.startMs+=7000;s.endMs+=7000;}
  shifted.display.startFrame+=210;shifted.display.endFrameExclusive+=210;shifted.previousEndFrame!+=210;shifted.nextStartFrame!+=210;
  shifted.acoustic.startOutputFrame!+=210;shifted.acoustic.endOutputFrame!+=210;
  assert.deepEqual(selectCaptionReviewV001(shifted),expected);
  assert.deepEqual(selectCaptionReviewV001({...f,text:'unseen text',captionId:'unknown',humanEvaluation:'no-issue'} as any),expected);
  assert.deepEqual(selectCaptionReviewV001({...f,text:'different',captionId:'other',humanEvaluation:'issue'} as any),expected);
});

let inputs:Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>;
before(async()=>{inputs=await loadCaptionReviewInputsV001();});
test('all 73 caption instances retain exact independent features and only 16 explicit state-bound labels',async()=>{
  const truth=await reconstructCaptionReviewTruthV001(inputs);
  const savedTruth=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'ground-truth-v001.json'),'utf8'));
  assert.deepEqual(truth,savedTruth);assert.equal(truth.labels.length,16);
  assert.equal(truth.labels.filter(r=>r.result==='issue').length,6);assert.equal(truth.nonCaptionFacts.length,1);
  const saved=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'features-v001.json'),'utf8'));
  assert.deepEqual(inputs.cases.map(c=>({caseId:c.def.id,source:c.source,rows:c.rows})),saved.cases);
  const counts=inputs.cases.map(c=>[c.rows.length,truth.labels.filter(l=>l.caseId===c.def.id).length]);
  assert.deepEqual(counts,[[33,8],[4,3],[32,2],[4,3]]);
  assert(!truth.labels.some(l=>l.caseId==='distant-before'&&l.instructionId===inputs.cases[1].rows[0].instructionId));
});
test('frozen detector and first evaluation remain byte-bound; label inversion cannot change selected captions',async()=>{
  const freeze=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'signal-freeze-v001.json'),'utf8'));
  assert.equal(createHash('sha256').update(await readFile(path.join(ROOT,freeze.selector.path))).digest('hex'),freeze.selector.fileSha256);
  const truth=await reconstructCaptionReviewTruthV001(inputs), actual=evaluateCaptionReviewsV001(inputs,truth);
  const first=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'evaluation-v001.json'),'utf8'));assert.deepEqual(actual,first.results);
  const flipped={labels:truth.labels.map(l=>({...l,result:l.result==='issue'?'no-issue':'issue'}))};
  assert.deepEqual(actual.map(c=>c.rows.map(r=>r.result)),evaluateCaptionReviewsV001(inputs,flipped).map(c=>c.rows.map(r=>r.result)));
  assert.deepEqual(actual.map(c=>[c.reviewRequired,c.caughtIssues,c.extraNoIssues,c.insufficientEvidence]),[[8,3,5,0],[0,0,0,4],[7,0,2,0],[0,0,0,4]]);
});
test('post-repair controls keep original STT and acoustic evidence; repair provenance cannot act as a feature',()=>{
  for(const family of ['digest','distant']){
    const before=inputs.cases.find(c=>c.def.family===family&&c.def.phase==='before')!,after=inputs.cases.find(c=>c.def.family===family&&c.def.phase==='after')!;
    for(const r of after.rows){const old=before.rows.find(b=>JSON.stringify(b.textIds)===JSON.stringify(r.textIds))!;assert(old);
      assert.deepEqual(r.features.sttIntervals,old.features.sttIntervals);assert.deepEqual(r.acousticEvidence,old.acousticEvidence);}
  }
});
test('only machine-selected captions enter the common UI, and insufficient evidence is disclosed',async()=>{
  const cases=await createSelectedCaptionReviewCasesV001(inputs);assert.equal(cases.length,1);assert.equal(cases[0].reviewCandidates.length,8);
  assert.equal(cases[0].source.allowedTargets.length,8);
  assert(captionReviewSummaryV001(inputs).includes('全4字幕中、要確認0字幕、観測不足4字幕'));
  for(const t of cases[0].source.allowedTargets){assert(t.reviewWindow.endFrameExclusive>t.reviewWindow.startFrame);assert(t.operations.includes('exclude-caption'));}
});
test('review UI saves no-issue without repair and requires explicit issue before common boundary/exclusion save',async()=>{
  const cases=await createSelectedCaptionReviewCasesV001(inputs),historical=await loadHistoricalCaptionRepairFixtureV001('digest');
  let renderCalls=0;const outputRoot=`${REVIEW_WORK_V001}/http-test-${randomUUID()}`;
  const ui=await startCaptionRepairUIV001({cases,purpose:'ui-verification',reviewSummary:captionReviewSummaryV001(inputs),outputRoot,
    render:async()=>{renderCalls++;throw new Error('RENDER_NOT_PART_OF_REVIEW_SELECTOR_TEST');}});
  try{
    const get=async()=>{const r=await fetch(ui.url+'api/state');assert.equal(r.status,200);return (await r.json()).cases[0];};
    const c=await get(),headers={'Content-Type':'application/json',Origin:ui.url.slice(0,-1)};
    const post=(route:string,data:any={})=>fetch(ui.url+route,{method:'POST',headers,body:JSON.stringify({caseId:c.id,sourceSha256:c.sourceSha256,...data})});
    assert.equal(c.records.length,0);assert.equal(c.reviewAnswers.length,0);assert.equal(c.reviewCandidates.length,8);
    assert.equal((await post('api/review',{instructionId:'not-selected',answer:'issue'})).status,400);
    assert.equal((await post('api/review',{instructionId:c.targets[0].instructionId,answer:'correct'})).status,400);
    assert.equal((await post('api/validate')).status,400);assert.equal(renderCalls,0);
    const good=c.targets.find((t:any)=>t.instructionId===c.targets[1].instructionId);
    const noIssue=await (await post('api/review',{instructionId:good.instructionId,answer:'no-issue'})).json();
    assert.equal(noIssue.newHumanJudgment,false);assert.equal(noIssue.purpose,'ui-verification');
    assert.deepEqual((await get()).records,[]);assert.equal((await get()).run,null);
    assert.equal((await post('api/save',{operation:{kind:'exclude-caption',target:good,reason:'synthetic test',confirmedText:good.text}})).status,400);
    for(const original of historical.records){
      const t=c.targets.find((t:any)=>t.instructionId===original.operation.target.instructionId);assert(t);
      assert.equal((await post('api/save',{operation:{...original.operation,target:t}})).status,400);
      assert.equal((await post('api/review',{instructionId:t.instructionId,answer:'issue'})).status,200);
      const op:any=structuredClone(original.operation);op.target=t;
      if(op.kind==='change-boundaries')for(const side of ['start','end'])if(op[side].mode==='observed'){
        const f=op[side].observation;
        const response=await post('api/frame',{instructionId:t.instructionId,presentedVideoFrame:f.presentedVideoFrame,boundaryKind:f.boundaryKind});
        assert.equal(response.status,200);op[side].observation=await response.json();
      }
      const response=await post('api/save',{operation:op});assert.equal(response.status,200);const saved=await response.json();
      assert.equal(saved.purpose,'ui-verification');assert.deepEqual(saved.operation,op);
      assert.equal((await post('api/review',{instructionId:t.instructionId,answer:'no-issue'})).status,400);
    }
    const preview=await post('api/validate');assert.equal(preview.status,200);const body=await preview.json();
    assert.equal(body.operations.length,3);assert.equal(body.operations[0].kind,'exclude-caption');
    assert.equal(body.operations[1].start.observation.selectedVideoFrame,1723);
    assert.equal(body.operations[2].end.observation.selectedVideoFrame,2708);
    assert.equal((await get()).run,null);assert.equal(renderCalls,0);
    assert.equal((await fetch(ui.url+'media/'+c.id+'/before',{headers:{Range:'bytes=0-31'}})).status,206);
    assert.equal((await post('api/render',{approvalId:'invented',approval:{}})).status,400);assert.equal(renderCalls,0);
  }finally{await ui.close();await rm(path.join(ROOT,outputRoot),{recursive:true,force:true});}
});

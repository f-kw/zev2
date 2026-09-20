import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalHash} from './validate.mjs';
import {sourcePartsForRange} from './clock.mjs';
import {convertQualityReview} from './review.mjs';
import {blankAnswers,validateAnswers,frameRange} from '../point-review/core.mjs';

const range=(startFrame,endFrameExclusive)=>({startFrame,endFrameExclusive});
function fixture() {
  const media={id:'HRB-test',path:'/tmp/q3-test-media.mp4',sha256:'a'.repeat(64),fpsNum:30,fpsDen:1,frameCount:8,audioSampleRate:44100,audioSampleCount:8*1470};
  const clock={schemaVersion:'digest-quality-clock-v001',mediaSha256:media.sha256,frameRate:30,baselineFrameCount:6,completedFrameCount:8,
    playbackSampleRate:44100,observationSampleRate:16000,sourceClockSha256:'b'.repeat(64),projectionSha256:'c'.repeat(64),
    sourceVideoClock:{videoPresentationOffsetMs:0},provenance:{mapping:'synthetic test only'},spans:[
      {kind:'retained',range:range(0,3),baselineRange:range(0,3),originalVideoStartFrame:0,originalAudioStartSample:0,segmentId:'seg-a',connectionId:null},
      {kind:'inserted',range:range(3,5),baselineRange:null,originalVideoStartFrame:null,originalAudioStartSample:null,segmentId:null,connectionId:'connection-1'},
      {kind:'retained',range:range(5,8),baselineRange:range(3,6),originalVideoStartFrame:9,originalAudioStartSample:9*1470,segmentId:'seg-b',connectionId:null}]};
  const units=[{id:'caption-a',kind:'caption',text:'前の発話',range:range(0,3)},
    {id:'no-caption-3-5',kind:'no-caption',text:null,range:range(3,5)},
    {id:'caption-b',kind:'caption',text:'次の発話',range:range(5,8)},
    {id:'connection-1',kind:'connection',text:null,range:range(3,5)}].map(u=>({...u,display:{},sourceParts:sourcePartsForRange(clock,u.range),evidenceIds:[`e-${u.id}`]}));
  const packet={schemaVersion:'digest-quality-input-v001',media,clock,
    references:[{id:'original-source-media',path:'/tmp/q3-test-source.mp4',sha256:'d'.repeat(64),kind:'source'}],
    units,evidence:units.map(u=>({id:`e-${u.id}`,kind:'saved-source-mapping',range:u.range,unitIds:[u.id],method:'synthetic test data',facts:{},limitations:['fixture only'],referenceIds:['original-source-media']})),limitations:['fixture only']};
  packet.inputSha256=canonicalHash(packet);
  const candidate={id:'Q3-C001',unitIds:['caption-a'],range:range(1,2),evidenceIds:['e-caption-a'],observedFacts:[{evidenceId:'e-caption-a',statement:'区間の対応を保存した。'}],
    hypothesis:'発話の受け取り方を確認する仮説',missingInformation:['視聴未実施'],normalExplanations:['現状で伝わる可能性'],humanQuestion:'この発話は現状で伝わりますか。',reflectionTargets:['字幕の見せ方']};
  const reply={schemaVersion:'digest-quality-judgment-v001',inputSha256:packet.inputSha256,mediaSha256:media.sha256,status:'complete',
    processedUnits:units.map(u=>({unitId:u.id,state:'reviewed-with-available-evidence',evidenceIds:u.evidenceIds,summary:'利用可能な根拠を考慮。視聴は未実施。'})),candidates:[candidate],limitations:['視聴未実施'],failureReason:null};
  return {packet,reply};
}
function comparison(packet,raw,entries) {
  return {schemaVersion:'digest-quality-post-comparison-v001',inputSha256:packet.inputSha256,rawReplySha256:createHash('sha256').update(raw).digest('hex'),
    references:[],judgmentConditions:'実例ではなくconverter検査用fixture',entries};
}
const presented=()=>({candidateId:'Q3-C001',disposition:'present',reason:'fixture question',knownRelations:[],reviewId:'HR-Q3-T001',reviewTitle:'対象の発話',scopeExclusions:['他の機能の採否'],contextRange:range(0,3)});
test('accepted hypothesis becomes one current-video point with the same question and exact completed clock',()=>{
  const {packet,reply}=fixture(), raw=Buffer.from(JSON.stringify(reply));
  const result=convertQualityReview(packet,raw,comparison(packet,raw,[presented()]));
  assert.equal(result.qualityApproved,false);
  assert.equal(result.review.points[0].question,reply.candidates[0].humanQuestion);
  assert.equal(result.review.points[0].title,'対象の発話');
  assert.ok(result.review.points[0].scope.does_not_apply_to.includes('他の機能の採否'));
  assert.deepEqual(result.review.points[0].views.map(v=>v.role),['candidate']);
  assert.equal(result.review.media[0].sha256,packet.media.sha256);
  assert.deepEqual(frameRange(result.review,result.review.points[0].views[0]),{start:1/30,end:2/30,start_frame:1,end_frame:2,timeline_start_frame:1,timeline_end_frame:2});
  const hash=canonicalHash(result.review), answers=blankAnswers(result.review,hash);
  assert.equal(answers.answers[0].choice,null);
  const wrong=structuredClone(answers);wrong.answers[0].offered_views[0].sha256='f'.repeat(64);
  assert.throws(()=>validateAnswers(wrong,result.review,hash),/一致しません/);
});
test('zero candidates and withheld known concerns create no invented review point',()=>{
  const {packet,reply}=fixture(); reply.candidates=[]; const raw=Buffer.from(JSON.stringify(reply));
  assert.equal(convertQualityReview(packet,raw,comparison(packet,raw,[])).review,null);
  const real=fixture(), raw2=Buffer.from(JSON.stringify(real.reply));
  const withheld={candidateId:'Q3-C001',disposition:'withheld',reason:'既知回答で扱いが決まっている',knownRelations:[{id:'HRC001',relationship:'同じ対象'}],reviewId:null,reviewTitle:null,scopeExclusions:[],contextRange:null};
  const result=convertQualityReview(real.packet,raw2,comparison(real.packet,raw2,[withheld]));
  assert.equal(result.status,'complete-no-presented-candidates');assert.equal(result.internalCandidates,1);assert.equal(result.qualityApproved,false);
});
test('incomplete, wrong-version or unattributed dispositions cannot enter standard review',()=>{
  const {packet,reply}=fixture();
  reply.status='incomplete';reply.failureReason='未処理';let raw=Buffer.from(JSON.stringify(reply));
  assert.throws(()=>convertQualityReview(packet,raw,comparison(packet,raw,[presented()])),/incomplete/);
  reply.status='complete';reply.failureReason=null;reply.mediaSha256='e'.repeat(64);raw=Buffer.from(JSON.stringify(reply));
  assert.throws(()=>convertQualityReview(packet,raw,comparison(packet,raw,[presented()])),/SHA mismatch/);
  reply.mediaSha256=packet.media.sha256;raw=Buffer.from(JSON.stringify(reply));
  assert.throws(()=>convertQualityReview(packet,raw,comparison(packet,raw,[])),/incomplete or duplicated/);
  const entry=presented();entry.contextRange=range(0,9);
  assert.throws(()=>convertQualityReview(packet,raw,comparison(packet,raw,[entry])),/outside this media clock/);
  const noScope=presented();noScope.scopeExclusions=[];
  assert.throws(()=>convertQualityReview(packet,raw,comparison(packet,raw,[noScope])),/outside this media clock/);
  const binding=comparison(packet,raw,[presented()]);binding.rawReplySha256='0'.repeat(64);
  assert.throws(()=>convertQualityReview(packet,raw,binding),/binding is invalid/);
});

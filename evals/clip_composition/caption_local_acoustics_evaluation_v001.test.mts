import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadCaptionReviewInputsV001} from './caption_review_selector_v001.mts';
import {attachCaptionAcousticsV001,verifySensorBindingV001,ACOUSTIC_WORK_V001} from './caption_local_acoustics_evaluation_v001.mts';
import {selectCaptionReviewV001} from '../../packages/shared/src/caption-review-selector-v001.js';

const original=await loadCaptionReviewInputsV001();
const freeze=JSON.parse(await readFile(`${ACOUSTIC_WORK_V001}/pre-observation-freeze-v001.json`,'utf8'));
function fixtures() {
  return freeze.cases.flatMap((c:any)=>c.rows.map((r:any)=>({caseId:c.caseId,instructionId:r.instructionId,text:r.text,textIds:r.textIds,
    sensorEvidenceOnly:true,humanQualityApproved:false,freezeBinding:{fixture:true},
    acoustic:{available:true,startResolved:false,endResolved:true,startOutputFrame:null,endOutputFrame:r.featuresWithoutAcoustics.display.endFrameExclusive,whollyOutsideAdoptedUnitCount:0}})));
}

test('only acoustic evidence changes; all 37 captions, current frames and identities are preserved',()=>{
  const before=structuredClone(original),attached=attachCaptionAcousticsV001(original,freeze,fixtures());
  assert.deepEqual(original,before);
  assert.deepEqual(attached.cases.map(c=>c.rows.length),[33,4]);
  for(const c of attached.cases)for(const r of c.rows) {
    const old=original.cases.find(x=>x.def.id===c.def.id)!.rows.find(x=>x.instructionId===r.instructionId)!;
    const {acoustic:a,...f}=r.features,{acoustic:b,...g}=old.features;
    assert.deepEqual(f,g);assert.deepEqual(r.textIds,old.textIds);assert.equal(r.text,old.text);
    assert.equal(c.def.humanTargets,undefined);
  }
});

test('unresolved observed onset fires the unchanged selector; it does not imply a human defect or fix',()=>{
  const attached=attachCaptionAcousticsV001(original,freeze,fixtures());
  for(const c of attached.cases)for(const r of c.rows) {
    const selected=selectCaptionReviewV001(r.features);
    assert.equal(selected.status,'review-required');
    assert(selected.signals.includes('unresolved-acoustic-boundary'));
  }
});

test('observation text, identity and duplicate records fail closed',()=>{
  const text=fixtures();text[0].text+='別';assert.throws(()=>attachCaptionAcousticsV001(original,freeze,text),/TEXT_MISMATCH/);
  const ids=fixtures();ids[0].textIds=['wrong'];assert.throws(()=>attachCaptionAcousticsV001(original,freeze,ids),/TEXT_IDS_MISMATCH/);
  const dup=fixtures();dup[1]=dup[0];assert.throws(()=>attachCaptionAcousticsV001(original,freeze,dup),/ID_NOT_UNIQUE/);
});

test('source timing drift and human approval injection are rejected',()=>{
  const f=structuredClone(freeze);f.cases[0].rows[0].featuresWithoutAcoustics.display.startFrame++;
  assert.throws(()=>attachCaptionAcousticsV001(original,f,fixtures()),/NONACOUSTIC_FEATURE_CHANGED/);
  const o=fixtures();o[0].humanQualityApproved=true;assert.throws(()=>attachCaptionAcousticsV001(original,freeze,o));
});

test('failed observation stays unavailable and is not silently converted to review success',()=>{
  const obs=fixtures();for(const o of obs)o.acoustic={available:false,startResolved:false,endResolved:false,startOutputFrame:null,endOutputFrame:null,whollyOutsideAdoptedUnitCount:0};
  const attached=attachCaptionAcousticsV001(original,freeze,obs);
  for(const row of attached.cases.find(c=>c.def.id==='distant-before')!.rows)
    assert.equal(selectCaptionReviewV001(row.features).status,'insufficient-evidence');
});

test('absolute sensor bindings are streamed and byte/hash changes are rejected',async()=>{
  const ref=freeze.selectorBinding;
  await verifySensorBindingV001(ref);
  await assert.rejects(verifySensorBindingV001({...ref,bytes:ref.bytes+1}),/SENSOR_BYTES_CHANGED/);
  await assert.rejects(verifySensorBindingV001({...ref,fileSha256:'0'.repeat(64)}),/SENSOR_SHA_CHANGED/);
  await assert.rejects(verifySensorBindingV001({...ref,path:'relative.json'}),/INVALID_SENSOR_BINDING/);
});

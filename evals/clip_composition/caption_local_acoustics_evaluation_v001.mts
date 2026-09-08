import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {ROOT, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadCaptionReviewInputsV001, evaluateCaptionReviewsV001, createSelectedCaptionReviewCasesV001,
  captionReviewSummaryV001, REVIEW_WORK_V001} from './caption_review_selector_v001.mts';
import {selectCaptionReviewV001} from '../../packages/shared/src/caption-review-selector-v001.js';

export const ACOUSTIC_WORK_V001 = 'evals/clip_composition/outputs/presentation/work-caption-local-acoustics-20260908-v001';
const read = async (name: string) => JSON.parse(await readFile(path.join(ROOT,ACOUSTIC_WORK_V001,name),'utf8'));
/** Sensor freeze includes existing external model/runtime paths; the repair UI's repository-only binding stays unchanged. */
export async function verifySensorBindingV001(ref: {path:string;fileSha256:string;bytes:number}) {
  assert(path.isAbsolute(ref.path)&&/^[a-f0-9]{64}$/u.test(ref.fileSha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>=0,'INVALID_SENSOR_BINDING');
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(ref.path)){hash.update(chunk);bytes+=chunk.length;}
  assert.equal(bytes,ref.bytes,'SENSOR_BYTES_CHANGED');
  assert.equal(hash.digest('hex'),ref.fileSha256,'SENSOR_SHA_CHANGED');
}
const bound = async (ref: Parameters<typeof verifySensorBindingV001>[0]) => {
  await verifySensorBindingV001(ref);
  return JSON.parse(await readFile(ref.path,'utf8'));
};
const save = async (name:string,value:unknown) => writeFile(path.join(ROOT,ACOUSTIC_WORK_V001,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});

/** All nonacoustic features are byte-for-value equal to 017 and independently reconstructed by the sensor. */
export function attachCaptionAcousticsV001(inputs: Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>, freeze: Json, observations: Json[]) {
  const result=structuredClone(inputs);
  result.cases=result.cases.filter(c=>c.def.phase==='before');
  assert.equal(observations.length,result.cases.reduce((n,c)=>n+c.rows.length,0));
  for(const c of result.cases) {
    // Neither generation nor the technical UI uses historical human review windows.
    delete c.def.humanTargets;
    const fixed=freeze.cases.find((x:Json)=>x.caseId===c.def.id);assert(fixed);
    assert.equal(fixed.rows.length,c.rows.length);
    for(const row of c.rows) {
      const before=fixed.rows.find((x:Json)=>x.instructionId===row.instructionId);assert(before);
      const matches=observations.filter(o=>o.caseId===c.def.id&&o.instructionId===row.instructionId);
      assert.equal(matches.length,1,'OBSERVATION_ID_NOT_UNIQUE');
      const observation=matches[0];
      assert.equal(observation.text,row.text,'OBSERVATION_TEXT_MISMATCH');
      assert.deepEqual(observation.textIds,row.textIds,'OBSERVATION_TEXT_IDS_MISMATCH');
      assert.equal(before.text,row.text);assert.deepEqual(before.textIds,row.textIds);
      const {acoustic:previousAcoustics,...unchanged}=row.features;
      assert.deepEqual(unchanged,before.featuresWithoutAcoustics,'NONACOUSTIC_FEATURE_CHANGED');
      assert.equal(observation.sensorEvidenceOnly,true);assert.equal(observation.humanQualityApproved,false);
      row.features={...unchanged,acoustic:observation.acoustic};
      (row as Json).acousticEvidence={freezeBinding:observation.freezeBinding,observation,previousAcousticsUsed:false};
    }
  }
  return result;
}

export async function loadNewCaptionAcousticsV001() {
  const index=await read('observation-index-v001.json'),freeze=await bound(index.freezeBinding);
  await verifySensorBindingV001(freeze.selectorBinding);
  // Verify the exact generating implementation/model/audio bindings again at handoff.
  for(const ref of [...freeze.implementationBindings,...freeze.modelBindings,...freeze.sourceBindings])
    await verifySensorBindingV001(ref);
  const observations=[];
  for(const ref of index.observations) {
    const observation=await bound(ref);assert.deepEqual(observation.freezeBinding,index.freezeBinding);
    observations.push(observation);
  }
  const old=await loadCaptionReviewInputsV001();
  return {inputs:attachCaptionAcousticsV001(old,freeze,observations),freeze,observations,old};
}

export async function evaluateNewCaptionAcousticsV001() {
  const {inputs,freeze,observations,old}=await loadNewCaptionAcousticsV001();
  // First and only human-answer read in this path; observation files already exist and are bound.
  const truth=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'ground-truth-v001.json'),'utf8'));
  const results=evaluateCaptionReviewsV001(inputs,truth);
  const before=evaluateCaptionReviewsV001({...old,cases:old.cases.filter(c=>c.def.phase==='before')},truth);
  const summaries=results.map(({rows,...summary})=>{
    const prior=before.find(c=>c.caseId===summary.caseId)!;
    const observed=observations.filter(o=>o.caseId===summary.caseId);
    return {...summary,audioObserved:observed.filter(o=>o.acoustic.available).length,
      uniqueBoundaryPairs:observed.filter(o=>o.uniqueBoundaryPair).length,
      startResolved:observed.filter(o=>o.startBoundary.resolved).length,endResolved:observed.filter(o=>o.endBoundary.resolved).length,
      retriedCaptions:observed.filter(o=>o.attempts.length>o.chosenAttemptIndices.length).length,
      unresolvedBoundaryReviews:rows.filter(r=>r.result.signals.includes('unresolved-acoustic-boundary')).length,
      previous:{reviewRequired:prior.reviewRequired,insufficientEvidence:prior.insufficientEvidence,caughtIssues:prior.caughtIssues,extraNoIssues:prior.extraNoIssues},
      insufficientEvidenceReduction:prior.insufficientEvidence-summary.insufficientEvidence,
      transitions:rows.map(r=>({instructionId:r.instructionId,text:r.text,previous:selectCaptionReviewV001(old.cases.find(c=>c.def.id===summary.caseId)!.rows.find(x=>x.instructionId===r.instructionId)!.features),current:r.result,
        humanEvaluation:r.humanEvaluation?.result??'unevaluated',startBoundary:observed.find(o=>o.instructionId===r.instructionId).startBoundary,
        endBoundary:observed.find(o=>o.instructionId===r.instructionId).endBoundary}))};
  });
  await save('selector-evaluation-v001.json',{selectorBinding:freeze.selectorBinding,signalChanges:false,results});
  await save('evaluation-summary-v001.json',{summaries,newHumanJudgment:false,
    interpretation:'A resolved boundary is one structurally identified sensor candidate, not a verified speech boundary. Unresolved acoustic evidence may itself trigger the unchanged review signal. Unreviewed captions stay unreviewed.'});
  const cases=await createSelectedCaptionReviewCasesV001(inputs);
  await save('common-repair-handoff-v001.json',{purpose:'ui-verification',newHumanJudgment:false,renderCount:0,
    cases:cases.map(c=>({id:c.id,source:c.source,reviewCandidates:c.reviewCandidates})),summary:captionReviewSummaryV001(inputs)});
  console.log(JSON.stringify(summaries.map(({transitions,bySignal,missedIssues,...r})=>r),null,2));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--evaluate'))await evaluateNewCaptionAcousticsV001();
  else if(process.argv.includes('--ui')) {
    const {inputs}=await loadNewCaptionAcousticsV001();
    const {startCaptionRepairUIV001}=await import('./caption_local_repair_ui_v001.mts');
    const ui=await startCaptionRepairUIV001({cases:await createSelectedCaptionReviewCasesV001(inputs),purpose:'ui-verification',
      reviewSummary:captionReviewSummaryV001(inputs),outputRoot:`${ACOUSTIC_WORK_V001}/ui-verification-v001`});
    console.log(ui.url);
  } else throw new Error('--evaluate or --ui required');
}

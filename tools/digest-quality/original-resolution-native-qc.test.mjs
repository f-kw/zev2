import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {readOriginalNativeV001} from './original-resolution-native-qc.mjs';
import {restoreIntegratedNativeQcInputV001 as restore} from './integrated-native-qc-input-v001.mjs';
import {bindDigestStructureFileV001 as bind} from './digest-structure-evidence.mjs';
import {canonicalSha256 as hash} from './clock.mjs';
import {readPresentationQcEvidenceV001 as readEvidence} from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {validatePresentationNativeFrameQcInspectionsV001 as validate,classifyPresentationNativeFrameRgbV001 as classify} from '../../evals/clip_composition/presentation_native_frame_qc_integrated_v001.mjs';
import {classifyPresentationNativeFrameRgbV001 as priorClassify} from '../../evals/clip_composition/presentation_native_frame_qc_v001.mjs';
const base=path.resolve('runtime/artifacts/original-resolution-connection-20260930-v001/native-001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
test('actual native evidence rejects missing candidate, sample and drawing state',async()=>{
 const c=await json(base+'/completion.json'),q=await readEvidence(c.nativeRef.path,{expectedFileSha256:c.nativeRef.fileSha256}),view=await restore(await json(c.inputRef.path)),plan=scope(view.resolvedPlan,view.renderRange);
 for(const mutate of [x=>x[0].nativeFrameQc.samples[0].references.pop(),x=>x[0].nativeFrameQc.samples.pop(),x=>x[0].nativeFrameQc.sceneBindings[0].states.pop(),x=>x[0].nativeFrameQc.schemaVersion='unknown']){
  const inspections=structuredClone(q.inspections);mutate(inspections);const result=await validate({plan,inspections,renderRange:view.renderRange});assert(result.violations.length>0);
 }
});
test('incomplete, altered, missing and other saved inputs are rejected without touching originals',async()=>{
 const c=await json(base+'/completion.json'),e=await json(c.inputRef.path),dir=await mkdtemp('/private/tmp/zev-native-fault-');
 try{
  for(const status of ['incomplete','native-failed']){const p=path.join(dir,status+'.json');await writeFile(p,JSON.stringify({...c,status}));await assert.rejects(readOriginalNativeV001(p));}
  const media=await json(c.mediaRef.path);for(const [name,mutate]of [['unfinished',x=>x.status='incomplete'],['outline',x=>x.outlineChoice='A'],['other-source',x=>x.inputRef={...x.inputRef,path:'/private/tmp/not-a-source.json'}]]){
   const m=structuredClone(media);mutate(m);const p=path.join(dir,name+'.json');await writeFile(p,JSON.stringify(m));const f={...e,mediaRef:await bind(p)};const{evidenceSha256,...body}=f;f.evidenceSha256=hash(body);await assert.rejects(restore(f));
  }
  const truncated=path.join(dir,'partial-qc.json'),raw=await readFile(c.nativeRef.path);await writeFile(truncated,raw.subarray(0,Math.floor(raw.length/2)));await assert.rejects(readEvidence(truncated));
  const corrupted=Buffer.from(raw);corrupted[100]=corrupted[100]^1;const cp=path.join(dir,'corrupt-qc.json');await writeFile(cp,corrupted);await assert.rejects(readEvidence(cp,{expectedFileSha256:c.nativeRef.fileSha256}));
 }finally{await rm(dir,{recursive:true});}
});
test('missing, duplicate and substituted pixels retain the old strict rejection',()=>{
 for(const completedRgb of [Buffer.from([0,0,0]),Buffer.from([5,6,7]),Buffer.from([9,8,7])]){
  const references=[{id:'expected',rgb:Buffer.from([1,2,3])},{id:'omitted',rgb:Buffer.from([0,0,0])},{id:'duplicate',rgb:Buffer.from([5,6,7])},{id:'other-caption',rgb:Buffer.from([9,8,7])}];const input={completedRgb,references};assert.deepEqual(classify(input),priorClassify(input));assert.equal(classify(input).visible,false);
 }
});

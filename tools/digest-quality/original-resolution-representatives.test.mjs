import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {selectOriginalRepresentativesV001} from './original-resolution-representatives.mjs';
import {editIntegrationPreviewV001,resolveIntegrationPreviewV001} from './integration-preparation.mjs';
import {representativeExpectedFadeV001} from './original-resolution-representative-background.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8')),inventory=await json('docs/reports/integrated-preview-20260930/final-output-inputs.json'),draft=await json(inventory.captionPreparation.path),baseManifest=await json(inventory.savedInputs.find(r=>r.path.endsWith('/base-manifest.json')).path),resolved=resolveIntegrationPreviewV001(draft,editIntegrationPreviewV001(draft,null,{outline:'A',framing:'Reset'}));
test('saved list is deterministic, finite, full-state and independent of QC verdicts',async()=>{
 const list=selectOriginalRepresentativesV001({draft,baseManifest,resolved});assert.deepEqual(list,await json('docs/reports/original-resolution-representatives-20260930/selection.json'));assert.equal(list.totalFrames,257);assert.equal(list.intervals.length,7);assert.deepEqual(list.categories.find(c=>c.category==='Pulse'),{category:'Pulse',status:'absent-in-saved-input'});assert.equal(resolved.plan.elements.filter(e=>e.presentationPulse).length,0);
 for(const r of list.intervals){assert.deepEqual(r.range,{...r.recipe.workingRange,fullFrameCount:17613});if(r.categories.some(c=>['Yellow','LightSkyBlue','Bounce','Shake'].includes(c))){const target=resolved.plan.elements.find(e=>e.instructionId===r.targets[0]);assert.equal(r.range.startFrame,target.startFrame);assert.equal(r.range.endFrameExclusive,target.startFrame+target.displayFrameCount);}assert(!r.targets.some(t=>t.endsWith('000119')));}
 const other=structuredClone(resolved);other.qcVerdict='failed';assert.deepEqual(selectOriginalRepresentativesV001({draft,baseManifest,resolved:other}),list);
 assert.equal(list.intervals.find(r=>r.categories.includes('Bounce')).states.length,6);assert.equal(list.intervals.find(r=>r.categories.includes('Shake')).states.length,7);
});
test('separator arithmetic retains all original integer channel values',()=>{
 const source=Buffer.from(Array.from({length:384},(_,i)=>i%256)),black=Buffer.concat([Buffer.alloc(256,16),Buffer.alloc(128,128)]);
 for(let n=0;n<=5;n++){const b=representativeExpectedFadeV001(source,n,256,black);for(let j=0;j<b.length;j++)assert.equal(b[j],Math.floor((source[j]*n+(j<256?16:128)*(5-n)+2)/5));}
});
test('v002 changes only native input entry and schema version; frozen v001 is unchanged',async()=>{
 for(const stem of ['presentation_native_frame_qc_preparation_integrated','presentation_native_frame_qc_integrated']){const p='evals/clip_composition/'+stem;const prior=await readFile(p+'_v001.mjs','utf8');assert.equal(prior,execFileSync('git',['show','6d50a7a0:'+p+'_v001.mjs']).toString());const expected=prior.replaceAll('integrated_v001.mjs','integrated_v002.mjs').replaceAll('integrated-native-qc-input-v001.mjs','integrated-native-qc-input-v002.mjs').replaceAll('assertIntegratedNativeScopeV001','assertIntegratedNativeScopeV002').replaceAll('integratedNativeAlternativesV001','integratedNativeAlternativesV002').replaceAll('exportIntegratedNativeQcInputV001','exportIntegratedNativeQcInputV002').replaceAll('restoreIntegratedNativeQcInputV001','restoreIntegratedNativeQcInputV002').replaceAll('frame-qc-integrated-v001','frame-qc-integrated-v002').replaceAll('frame-qc-preparation-integrated-v001','frame-qc-preparation-integrated-v002');assert.equal(await readFile(p+'_v002.mjs','utf8'),expected);}
 for(const f of ['tools/digest-quality/original-resolution-local.mjs','tools/digest-quality/integrated-native-qc-input-v001.mjs','evals/clip_composition/presentation_native_qc_streaming_v001.mjs','evals/clip_composition/presentation_qc_evidence_store_v001.mjs'])assert.equal(await readFile(f,'utf8'),execFileSync('git',['show','6d50a7a0:'+f]).toString());
});

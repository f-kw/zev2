import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {REPRESENTATIVE_AREA} from './original-resolution-representatives.mjs';
import {restoreIntegratedNativeQcInputV002 as restore,exportIntegratedNativeQcInputV002 as exportView,assertIntegratedNativeScopeV002 as valid,integratedNativeAlternativesV002 as alternatives} from './integrated-native-qc-input-v002.mjs';
import {canonicalSha256 as hash} from './clock.mjs';
import {readPresentationQcEvidenceV001 as readEvidence} from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {validatePresentationNativeFrameQcInspectionsV001 as validate} from '../../evals/clip_composition/presentation_native_frame_qc_integrated_v002.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const input=async n=>json(path.join(REPRESENTATIVE_AREA,`representative-0${n}-qc-001/input.json`));
const seal=e=>{const {evidenceSha256,...body}=e;return {...body,evidenceSha256:hash(body)};};
test('registered representative keeps the saved blue whole-color and rejects altered plan/scope',async()=>{
 const e=await input(7),v=await restore(e);assert.deepEqual(exportView(v),e);const plan=scope(v.resolvedPlan,v.renderRange),baselinePlan=scope(v.projectedNormalPlan,v.renderRange);valid({view:v,plan,baselinePlan,renderRange:v.renderRange});
 const row=alternatives(v).alternatives.find(r=>r.captionId===plan.elements[0].instructionId);assert.equal(row.entries.find(r=>r.kind==='whole-color').element.presentationColorRange.fontColor,'#87CEFA');
 for(const mutate of [p=>p.elements[0].startFrame++,p=>p.elements[0].visualState.textStyle.borderWidthPx=4,p=>p.elements[0].presentationColorRange.fontColor='#FFD65A',p=>p.elements.pop()]){const p=structuredClone(plan);mutate(p);assert.throws(()=>valid({view:v,plan:p,baselinePlan,renderRange:v.renderRange}));}
 assert.throws(()=>valid({view:v,plan,baselinePlan,renderRange:{...v.renderRange,startFrame:v.renderRange.startFrame+1}}));assert.throws(()=>exportView(structuredClone(v)));
});
test('a different interval receipt, unknown interval, changed list, incomplete input and unknown version are refused',async()=>{
 const e=await input(1),other=await input(7);
 for(const mutate of [x=>x.mediaRef=other.mediaRef,x=>x.intervalId='arbitrary-new-interval',x=>x.listRef.fileSha256='0'.repeat(64),x=>x.baselineRef.canonicalSha256='0'.repeat(64),x=>x.schemaVersion='unknown',x=>delete x.mediaRef]){const x=structuredClone(e);mutate(x);await assert.rejects(restore(seal(x)));}
});
test('actual finite-motion evidence rejects missing state, sample and candidate',async()=>{
 const c=await json(path.join(REPRESENTATIVE_AREA,'representative-03-state-completion-001/completion.json')),e=await input(3),v=await restore(e),plan=scope(v.resolvedPlan,v.renderRange),q=await readEvidence(c.nativeRef.path,{expectedFileSha256:c.nativeRef.fileSha256});
 assert.deepEqual((await validate({plan,inspections:q.inspections,renderRange:v.renderRange})).violations,[]);
 for(const mutate of [x=>delete x[0].motion,x=>x[0].motion.states[0].overlaySha256='0'.repeat(64),x=>x[0].nativeFrameQc.sceneBindings[0].states.pop(),x=>x[0].nativeFrameQc.samples.pop(),x=>x[0].nativeFrameQc.samples[0].references.pop()]){const inspections=structuredClone(q.inspections);mutate(inspections);const result=await validate({plan,inspections,renderRange:v.renderRange});assert(result.violations.length>0);}
});

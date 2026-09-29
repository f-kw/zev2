import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {restoreIntegratedNativeQcInputV001 as restore,exportIntegratedNativeQcInputV001 as exportView,assertIntegratedNativeScopeV001 as valid,integratedNativeAlternativesV001 as alternatives} from './integrated-native-qc-input-v001.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {canonicalSha256 as hash} from './clock.mjs';
const evidenceFile=path.resolve('runtime/artifacts/original-resolution-connection-20260930-v001/connection-input-001.json');
const evidence=JSON.parse(await readFile(evidenceFile,'utf8'));
test('strict separate-process restore/export and common A baseline retain the saved source',async()=>{
 const view=await restore(evidence);assert.deepEqual(exportView(view),evidence);assert.equal(view.resolvedPlan.elements.length,265);assert.equal(view.outlineChoice,null);
 const range=view.renderRange,plan=scope(view.resolvedPlan,range),baselinePlan=scope(view.projectedNormalPlan,range);valid({view,plan,baselinePlan,renderRange:range});
 for(const e of baselinePlan.elements)assert.equal(e.visualState.textStyle.borderWidthPx,8);
 const code=`import {readFileSync} from 'node:fs';import {restoreIntegratedNativeQcInputV001 as r,exportIntegratedNativeQcInputV001 as e} from './tools/digest-quality/integrated-native-qc-input-v001.mjs';console.log(JSON.stringify(e(await r(JSON.parse(readFileSync(process.argv[1],'utf8'))))));`;
 assert.deepEqual(JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code,evidenceFile],{maxBuffer:1024*1024}).toString()),evidence);
 for(const field of ['plan','baselinePlan','renderRange']){const input={view,plan:structuredClone(plan),baselinePlan:structuredClone(baselinePlan),renderRange:structuredClone(range)};if(field==='renderRange')input[field].startFrame++;else input[field].elements[0].startFrame++;assert.throws(()=>valid(input));}
 for(const change of [p=>p.elements.pop(),p=>p.elements[1].visualState.textStyle.borderWidthPx=4,p=>p.elements[0].visualState.textStyle.fontColor='#000000']){const p=structuredClone(plan);change(p);assert.throws(()=>valid({view,plan:p,baselinePlan,renderRange:range}));}
 assert.throws(()=>exportView(structuredClone(view)));assert.throws(()=>valid({view:Promise.resolve(view),plan,baselinePlan,renderRange:range}));
 const rows=alternatives(view).alternatives;assert.equal(rows.length,265);let blue=0;
 for(const r of rows){assert.equal(r.entries[0].kind,'normal');const selected=view.resolvedPlan.elements.find(e=>e.instructionId===r.captionId);const whole=r.entries.find(e=>e.kind==='whole-color');if(whole){assert.equal(whole.element.presentationColorRange.fontColor,selected.presentationColorRange.fontColor);if(selected.presentationColorRange.fontColor==='#87CEFA')blue++;}}
 assert(blue>0,'saved blue counterfactual must not revert to yellow');
});
test('unknown version, changed binding, missing input and forged baseline cannot become a view',async()=>{
 for(const mutate of [e=>e.schemaVersion='unknown',e=>e.expectedReconstructionSha256='0'.repeat(64),e=>e.mediaRef.path='/private/tmp/missing-integrated-native.json',e=>e.baselineRef.canonicalSha256='0'.repeat(64),e=>e.implementation.pop()]){const e=structuredClone(evidence);mutate(e);const {evidenceSha256,...body}=e;e.evidenceSha256=hash(body);await assert.rejects(restore(e));}
});
test('numerical native processing and all old entry files are byte unchanged',async()=>{
 const prefix='evals/clip_composition/';
 const old=execFileSync('git',['show','65d47fa9:'+prefix+'presentation_native_frame_qc_v001.mjs']).toString();
 const next=await readFile(prefix+'presentation_native_frame_qc_integrated_v001.mjs','utf8');
 const a=old.indexOf('function deriveRecipes('),b=old.indexOf('function checkInputManifest(');assert(a>=0&&b>a);assert.equal(next.slice(next.indexOf('function deriveRecipes('),next.indexOf('function checkInputManifest(')),old.slice(a,b));
 for(const f of ['presentation_native_frame_qc_v001.mjs','presentation_native_frame_qc_preparation_v001.mjs','presentation_native_qc_streaming_v001.mjs','presentation_qc_evidence_store_v001.mjs','presentation_orchestration_render_scope_v001.mjs'])assert.equal(await readFile(prefix+f,'utf8'),execFileSync('git',['show','65d47fa9:'+prefix+f]).toString());
});

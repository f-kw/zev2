import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {FULL_PREPARATION_AREA as area,fullPreparationInputsV001 as inputs,assertFullPreparationInputV001 as assertInput,assertFullPreparationRecordsV001 as assertRecords,evaluateFullDrawingV001 as evaluate,readFullPreparationV001 as independent} from './original-resolution-full-preparation.mjs';
import {verifyDigestStructureFileV001 as verify} from './digest-structure-evidence.mjs';
const file=path.join(area,'attempt-001/completion.json'),json=async p=>JSON.parse(await readFile(p,'utf8'));
const c=await json(file),saved=await json(c.inputRef.path),{body,i}=await inputs();
test('full preparation reconstructs all saved clocks and finite states, never claims completed media',()=>{
 assertInput(saved,body);assertRecords(body,c);assert.equal(body.frameMap.length,17613);assert.equal(body.rows.length,307);assert.equal(body.plan.elements.length,265);assert.equal(body.plan.elements.filter(e=>e.presentationColorRange).length,18);assert.equal(body.frameMap.filter(r=>r.kind==='inserted-black-and-silence').length,24);assert.equal(c.fullVideo,'not-produced');assert.equal(c.fullNativeQc,'not-connected');assert.equal(c.outlineChoice,null);
 for(const old of i.recipe.frameSourceMap){const row=body.frameMap[old.displayFrame];assert.deepEqual([row.baseFrame,row.sourceFrame30,row.sourceFrame60],[old.baseFrame,old.sourceFrame30,old.sourceFrame60]);}
 assert.equal(body.frameMap.at(-1).outputAudioStartSample+1470,17613*1470);
});
test('different input, text, time, color, outline and state ordering cannot replace saved preparation',()=>{
 for(const mutate of [x=>x.source.fileSha256='0'.repeat(64),x=>x.plan.elements[0].text='altered',x=>x.plan.elements[0].startFrame++,x=>x.plan.elements.find(e=>e.presentationColorRange).presentationColorRange.fontColor='#ffffff',x=>x.rows[0].props.visualState.textStyle.borderWidthPx++,x=>x.rows.reverse()]){const x=structuredClone(saved);mutate(x);assert.throws(()=>assertInput(x,body));}
});
test('missing, duplicate, substituted PNG and incomplete-as-passed are rejected',()=>{
 for(const mutate of [x=>x.records.pop(),x=>x.records[1]=structuredClone(x.records[0]),x=>x.records[0].png=structuredClone(x.records[2].png),x=>delete x.records[0].png,x=>x.fullVideo='verified',x=>{x.records.pop();x.renderedStates--;x.status='preparation-passed'}]){const x=structuredClone(c);mutate(x);assert.throws(()=>assertRecords(body,x));}
});
test('existing geometry validator rejects absent per-line pixels and missing finite motion state',()=>{
 const pass=evaluate(body.plan,c.records);assert.equal(pass.status,'passed');
 const lines=structuredClone(c.records);lines[0].inspection.lineAlphaBounds=[];assert.equal(evaluate(body.plan,lines).status,'failed');
 const missing=structuredClone(c.records);const n=missing.findIndex(r=>r.state!=='static');missing.splice(n,1);assert.throws(()=>assertRecords(body,{...c,records:missing,renderedStates:missing.length}));
});
test('byte-tampered or absent saved PNG is rejected by the reader file verifier',async()=>{
 const dir=path.join(area,'test-files');await mkdir(dir);const p=path.join(dir,'tampered.png');const source=c.records[0].png;const b=await readFile(source.path);b[b.length-1]^=1;await writeFile(p,b,{flag:'wx'});try{await assert.rejects(verify({...source,path:p}));await assert.rejects(verify({...source,path:path.join(dir,'missing.png')}));}finally{await rm(p);await rm(dir,{recursive:true});}
});
test('black-separator PNGs are now bound to distinct independent drawing files',()=>{
 const linked=c.records.filter(r=>r.previousMatches.some(p=>p.receipt.path.includes('representative-05-media-002')));assert.equal(linked.length,2);for(const r of linked){assert.equal(r.reused,false);assert.notEqual(r.png.path,r.repeat.path);assert.equal(r.png.fileSha256,r.repeat.fileSha256);assert(r.previousMatches.every(p=>p.matches));}
});
test('previous rendering, local QC, streaming, store and strict readers remain byte unchanged',async()=>{
 for(const p of ['tools/digest-quality/original-resolution-local.mjs','tools/digest-quality/original-resolution-representative-media.mjs','tools/digest-quality/original-resolution-representative-qc.mjs','tools/digest-quality/integrated-native-qc-input-v002.mjs','evals/clip_composition/render_presentation_v002.mjs','evals/clip_composition/presentation_renderer_qc_v002.mjs','evals/clip_composition/presentation_native_frame_qc_integrated_v002.mjs','evals/clip_composition/presentation_native_qc_streaming_v001.mjs','evals/clip_composition/presentation_qc_evidence_store_v001.mjs'])assert.equal(await readFile(p,'utf8'),execFileSync('git',['show','8613ca7c:'+p]).toString());
});

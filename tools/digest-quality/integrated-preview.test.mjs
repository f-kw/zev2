import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';
import {integratedBackgroundArgsV001 as background,integratedRecordsV001 as records,readIntegratedPreviewV001 as read} from './integrated-preview.mjs';
import {editIntegrationPreviewV001 as edit,resolveIntegrationPreviewV001 as resolve} from './integration-preparation.mjs';
import {saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
assert(process.env.INTEGRATION_DRAFT,'saved input required; no skipped test');
const d=JSON.parse(await readFile(process.env.INTEGRATION_DRAFT)),initial=edit(d,null,{outline:null,framing:'Reset'});
test('full background uses only the fixed 82 frames and preserves audio packets',()=>{
 const a=background(d,'/private/tmp/diagnostic-no-execution.nut'),filter=a[a.indexOf('-filter_complex')+1];
 assert.match(filter,/end_frame=9771/);assert.match(filter,/start_frame=9771:end_frame=9853/);assert.match(filter,/start_frame=9853:end_frame=17613/);
 assert.match(filter,/crop=800:450:160:90:exact=1,scale=960:540:flags=lanczos/);
 assert.equal(a[a.indexOf('-c:a')+1],'copy');assert(a.includes('-n'));
 assert.throws(()=>background(d,d.input.background.path));
});
test('A/B composite records retain all static, Pulse and Motion states in order',()=>{
 for(const outline of ['A','B']){const r=resolve(d,edit(d,initial,{outline,framing:'Reset'})),rows=r.states.map((s,i)=>({...s,png:{path:'/diagnostic/'+i+'.png'}}));
  const grouped=records(r,rows);assert.equal(grouped.length,265);
  const flattened=grouped.flatMap(g=>g.motionStates??g.pulseStates??[{element:g.element,pngPath:g.pngPath}]);
  assert.equal(flattened.length,307);assert.deepEqual(flattened.map(s=>s.pngPath),rows.map(s=>s.png.path));assert.deepEqual(grouped.map(g=>g.element),r.plan.elements);
  assert.throws(()=>records(r,rows.slice(1)));
 }
});
test('A Normal and off are the same; Reset restores the unselected original and reaction',()=>{
 const selected=edit(d,initial,{outline:'A',framing:'Reset'}),normal=edit(d,selected,{outline:'A',framing:'Normal'});
 assert.deepEqual(normal,edit(d,selected,{outline:'A',framing:'off'}));assert.deepEqual(resolve(d,selected).plan,resolve(d,normal).plan);
 const reset=edit(d,normal,{outline:'Reset',framing:'Reset'});assert.deepEqual(reset,initial);assert.equal(resolve(d,reset).outlinePreview,null);assert.equal(resolve(d,reset).framing.state,'reaction-close-up');
});
test('candidate B failure cannot become a completed A/B receipt',async()=>{
 const dir=await mkdtemp('/private/tmp/zev-integrated-reader-test-');try{
  const ref=await save(path.join(dir,'incomplete.json'),{schemaVersion:'digest-integrated-preview-v001',status:'incomplete',outputs:[{variant:'A',status:'development-preview-ready'},{variant:'B',status:'raster-failed'}]});
  await assert.rejects(()=>read(ref));
  await assert.rejects(()=>read({...ref,fileSha256:'0'.repeat(64)}));
  const wrong=await save(path.join(dir,'forged.json'),{schemaVersion:'digest-integrated-preview-v001',status:'incomplete',outputs:[]});
  await assert.rejects(()=>read(wrong,{allowIncomplete:true}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('modified source interval cannot enter the composite command',()=>{
 const changed=structuredClone(d);changed.input.reaction.interval.endFrameExclusive++;assert.throws(()=>background(changed,'/private/tmp/no-render.nut'));
});

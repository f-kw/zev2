import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {originalLocalRecipeV001,originalSourceArgumentsV001,readOriginalLocalV001} from './original-resolution-local.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const inventory=await read('docs/reports/integrated-preview-20260930/final-output-inputs.json');
const input={inventory,draft:await read(inventory.captionPreparation.path),inspection:await read(inventory.sourceInspection.path),baseManifest:await read(inventory.savedInputs.find(r=>r.path.endsWith('/base-manifest.json')).path)};
test('display clock removes saved connection shift and retains global-even source frames and exact samples',()=>{
 const r=originalLocalRecipeV001(input);assert.equal(r.shiftFrames,12);assert.equal(r.frameSourceMap.length,210);
 for(const row of r.frameSourceMap){assert.equal(row.baseFrame,row.displayFrame-12);assert.equal(row.sourceFrame60,row.sourceFrame30*2);assert.equal(row.sourcePts,row.sourceFrame60*256);}
 assert.equal(r.sourceSamples.end-r.sourceSamples.start,308700);assert.equal(r.sourceSamples.start,r.sourceFrame30.start*1470);assert.equal(r.closeEnd-r.closeStart,82);
 assert.deepEqual(r.crop,{left:320,top:180,width:1600,height:900});
 const args=originalSourceArgumentsV001({recipe:r,inventory},'/private/tmp/not-created.nut');assert(!r.videoFilter.includes('scale='));assert.equal(args.filter(v=>v===inventory.source.path).length,2);assert(args.indexOf('-ss')<args.indexOf('-i'));
 assert.throws(()=>originalSourceArgumentsV001({recipe:r,inventory},inventory.source.path));
});
test('wrong input, changed saved caption clock, and changed source mapping are rejected',()=>{
 for(const mutate of [x=>x.inspection.sourceVideoBinding.fileSha256='0'.repeat(64),x=>x.draft.input.plan.elements[0].startFrame++,x=>x.baseManifest.segments[2].sourceStartFrame30++,x=>x.inventory.sourceRanges[2].outputStartFrame++]){const x=structuredClone(input);mutate(x);assert.throws(()=>originalLocalRecipeV001(x));}
});
test('missing completion does not become verified evidence',async()=>{await assert.rejects(readOriginalLocalV001('/private/tmp/zev-missing-original-resolution-completion.json'));});

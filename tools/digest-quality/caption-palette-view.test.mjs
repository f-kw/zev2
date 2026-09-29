import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalSha256} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,readDigestStructureDrawingEvidenceV001} from './digest-structure-evidence.mjs';
import {createCaptionPaletteAutoV001,createCaptionPaletteOverridesV001,editCaptionPaletteOverrideV001,
  exportCaptionPaletteStateV001} from './caption-palette-policy.mjs';
import {captionPaletteSourceV001,createCaptionPaletteDrawingViewV001,assertCaptionPaletteDrawingViewV001,
  createCaptionPaletteRenderScopeV001,saveCaptionPaletteDrawingEvidenceV001,readCaptionPaletteDrawingEvidenceV001} from './caption-palette-view.mjs';

let fixturePromise;
async function fixture(t) {
  fixturePromise??=(async()=>{
    const ref=await bind(fileURLToPath(new URL('../../runtime/artifacts/digest-structure-20260929-v001/drawing-evidence.json',import.meta.url)));
    const sourceView=await readDigestStructureDrawingEvidenceV001({evidenceRef:ref}),source=captionPaletteSourceV001(sourceView);
    const automatic=createCaptionPaletteAutoV001({source,choices:source.effectiveSelections.filter(s=>s.selection.role==='Focus')
      .map(s=>({captionId:s.captionId,paletteId:'light-sky-blue',reason:'技術試験だけの固定配色。'}))});
    const overrides=createCaptionPaletteOverridesV001({source,automatic});
    return {sourceView,source,automatic,overrides,ref};
  })();
  try{return await fixturePromise;}catch(error){if(error.code==='ENOENT'){t.skip('saved 7B fixture unavailable');return null;}throw error;}
}
const state=m=>exportCaptionPaletteStateV001(m);
const derive=(m,saved=state(m))=>createCaptionPaletteDrawingViewV001({sourceView:m.sourceView,saved,
  sourceEvidenceRef:m.ref,stateRef:{path:'/test/finite-palette.json',fileSha256:canonicalSha256(saved)}});

test('real saved 7B palette changes only existing Color font values and preserves structure, glyphs, clocks and all other effects',async t=>{
  const m=await fixture(t);if(!m)return;const before=canonicalSha256(m.sourceView),view=derive(m);
  let changed=0;
  view.resolvedPlan.elements.forEach((e,i)=>{
    const prior=m.sourceView.resolvedPlan.elements[i],copy=structuredClone(e);
    if(prior.presentationColorRange){changed++;assert.equal(copy.presentationColorRange.fontColor,'#87CEFA');copy.presentationColorRange.fontColor=prior.presentationColorRange.fontColor;}
    assert.deepEqual(copy,prior);
  });
  assert.equal(changed,18);assert.equal(view.resolvedPlan.elements.length,265);
  for(const key of ['projection','projectedNormalPlan','captionTimings','preserved','candidateExecution'])assert.deepEqual(view[key],m.sourceView[key]);
  assert.equal(canonicalSha256(m.sourceView),before);assert.equal(view.humanQuality,'not-evaluated');assert.equal(view.productionDefaultChanged,false);
  assert.throws(()=>assertCaptionPaletteDrawingViewV001(structuredClone(view)),/verified saved sources/);
  assert.throws(()=>createCaptionPaletteDrawingViewV001({sourceView:structuredClone(m.sourceView),saved:state(m)}),/rederived/);
});
test('palette range scope preserves global source clock and refuses out-of-range or forged views',async t=>{
  const m=await fixture(t);if(!m)return;const view=derive(m),scope=createCaptionPaletteRenderScopeV001(view,{startFrame:780,endFrameExclusive:910});
  assert.equal(scope.scope.frameCount,130);assert.equal(scope.scope.playbackStartSample,780*1470);
  assert.equal(scope.scope.viewSha256,view.viewSha256);assert.equal(scope.resolvedPlan.elements.find(e=>e.presentationColorRange).presentationColorRange.fontColor,'#87CEFA');
  assert.throws(()=>createCaptionPaletteRenderScopeV001(view,{startFrame:0,endFrameExclusive:17614}));
  assert.throws(()=>createCaptionPaletteRenderScopeV001(structuredClone(view),{startFrame:780,endFrameExclusive:910}));
});
test('one finite override and Reset reconstruct the exact saved automatic plan without changing unrelated captions',async t=>{
  const m=await fixture(t);if(!m)return;const captionId=m.automatic.choices[0].captionId;
  const changed={...m,overrides:editCaptionPaletteOverrideV001({...m,captionId,selection:{paletteId:'yellow'}})};
  const a=derive(m),b=derive(changed);
  assert.equal(b.resolvedPlan.elements.filter((e,i)=>canonicalSha256(e)!==canonicalSha256(a.resolvedPlan.elements[i])).length,1);
  const reset={...changed,overrides:editCaptionPaletteOverrideV001({...changed,captionId,selection:'Reset'})};
  assert.deepEqual(derive(reset),a);
});
test('separate process rederives saved palette evidence; missing/changed state and forged semantic receipt are rejected',async t=>{
  const m=await fixture(t);if(!m)return;const dir=await mkdtemp('/private/tmp/zev-palette-evidence-');t.after(()=>rm(dir,{recursive:true,force:true}));
  const result=await saveCaptionPaletteDrawingEvidenceV001({sourceEvidenceRef:m.ref,saved:state(m),outputStatePath:dir+'/state.json',outputEvidencePath:dir+'/evidence.json'});
  const restored=await readCaptionPaletteDrawingEvidenceV001({evidenceRef:result.evidenceRef});assert.deepEqual(restored,result.view);
  const child=spawnSync(process.execPath,['--input-type=module','-e',`import {readCaptionPaletteDrawingEvidenceV001 as read} from ${JSON.stringify(import.meta.url.replace('caption-palette-view.test.mjs','caption-palette-view.mjs'))};const v=await read({evidenceRef:${JSON.stringify(result.evidenceRef)}});console.log(v.viewSha256);`],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),result.view.viewSha256);
  const bytes=await readFile(result.stateRef.path);await writeFile(result.stateRef.path,Buffer.concat([bytes,Buffer.from(' ')]));
  await assert.rejects(readCaptionPaletteDrawingEvidenceV001({evidenceRef:result.evidenceRef}),/changed/);
  await writeFile(result.stateRef.path,bytes);const bad=JSON.parse(await readFile(result.evidenceRef.path,'utf8'));
  bad.expectedViewSha256='0'.repeat(64);const {evidenceSha256,...body}=bad;bad.evidenceSha256=canonicalSha256(body);
  await writeFile(dir+'/forged.json',JSON.stringify(bad));await assert.rejects(readCaptionPaletteDrawingEvidenceV001({evidenceRef:await bind(dir+'/forged.json')}),/reconstructed view differs/);
});

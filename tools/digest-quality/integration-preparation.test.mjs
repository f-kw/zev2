import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalSha256 as hash} from './clock.mjs';
import {validateIntegrationDraftV001 as validate, editIntegrationPreviewV001 as edit,
  resolveIntegrationPreviewV001 as resolve, createIntegrationDraftV001 as create,
  readIntegrationPreparationV001 as read} from './integration-preparation.mjs';

assert(process.env.INTEGRATION_DRAFT, 'explicit saved preparation required; do not silently skip');
const draft=JSON.parse(await readFile(process.env.INTEGRATION_DRAFT,'utf8'));
const initial=edit(draft,null,{outline:null,framing:'Reset'});
const seal=body=>({...body,recordSha256:hash(body)});
test('unanswered outline stays unanswered; no render/adoption claim',()=>{
  validate(draft); const r=resolve(draft,initial);
  assert.equal(draft.outlineChoice,null);assert.equal(r.outlinePreview,null);
  assert.equal(r.humanOutlineSelected,false);assert.equal(r.finalRenderExecuted,false);
  assert.deepEqual(r.plan,draft.input.plan);
});
test('both outline previews preserve all content, clocks, colors, panels and finite states',()=>{
  const source=resolve(draft,initial);
  for(const outline of ['A','B']) {
    const r=resolve(draft,edit(draft,initial,{outline,framing:'Reset'}));
    assert.equal(r.states.length,307);
    r.states.forEach((row,i)=>{
      const e=structuredClone(row.element),prior=source.states[i].element;
      if(!e.visualState.background)Object.assign(e.visualState.textStyle,{
        borderWidthPx:prior.visualState.textStyle.borderWidthPx,glowWidthPx:prior.visualState.textStyle.glowWidthPx});
      assert.deepEqual(e,prior);
    });
    assert.deepEqual(r.backgroundAssembly,source.backgroundAssembly);
  }
});
test('Normal framing preserves selected preview and all caption settings',()=>{
  const a=edit(draft,initial,{outline:'B',framing:'reaction-close-up'});
  const normal=edit(draft,a,{outline:'B',framing:'Normal'});
  assert.deepEqual(resolve(draft,a).plan,resolve(draft,normal).plan);
  assert.equal(resolve(draft,normal).framing.state,'normal-framing');
  assert.equal(resolve(draft,normal).backgroundAssembly.localFilter,'[0:v]null[v]');
});
test('Reset returns exactly to saved unselected original, not Normal or a chosen outline',()=>{
  const b=edit(draft,initial,{outline:'B',framing:'Normal'});
  const reset=edit(draft,b,{outline:'Reset',framing:'Reset'});
  assert.deepEqual(reset,initial);assert.deepEqual(resolve(draft,reset),resolve(draft,initial));
});
test('unknown choices and non-preview fields are rejected',()=>{
  assert.throws(()=>edit(draft,initial,{outline:'C',framing:'Reset'}));
  assert.throws(()=>edit(draft,initial,{outline:'A',framing:'auto-track'}));
  const {recordSha256,...body}=initial;
  assert.throws(()=>resolve(draft,seal({...body,humanAdopted:true})));
});
test('foreign input, changed source, changed interval and forged selection rejected',()=>{
  const changed=structuredClone(initial);changed.draftSha256='0'.repeat(64);
  const {recordSha256,...body}=changed;assert.throws(()=>resolve(draft,seal(body)));
  const input=structuredClone(draft.input);input.viewSha256='0'.repeat(64);assert.throws(()=>create(input));
  const candidate=structuredClone(draft);candidate.input.reaction.interval.startFrame++;assert.throws(()=>validate(candidate));
  const {recordSha256:ignored,...d}=draft;assert.throws(()=>validate(seal({...d,outlineChoice:'A'})));
});
test('missing or incomplete receipt is not a verified integration',async()=>{
  await assert.rejects(()=>read({path:'/__missing_zev_integration_receipt__.json',fileSha256:'0'.repeat(64)}));
  assert.throws(()=>validate({...draft,status:'completed'}));
});
test('full background range partitions exactly and only original local interval changes',()=>{
  const parts=resolve(draft,initial).backgroundAssembly.parts;
  assert.deepEqual(parts.map(p=>p.recipe.displayRange),[
    {startFrame:0,endFrameExclusive:9708},{startFrame:9708,endFrameExclusive:9918},
    {startFrame:9918,endFrameExclusive:17613}]);
  assert.equal(parts.reduce((n,p)=>n+p.recipe.frameCount,0),17613);
  assert.equal(draft.input.reaction.interval.endFrameExclusive-draft.input.reaction.interval.startFrame,82);
  assert.equal(draft.input.colorBindings.length,18);
});

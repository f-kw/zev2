import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from '../../tools/digest-quality/clock.mjs';
import {bindDigestStructureFileV001 as bind,readDigestStructureDrawingEvidenceV001}
  from '../../tools/digest-quality/digest-structure-evidence.mjs';
import {createCaptionPaletteAutoV001,createCaptionPaletteOverridesV001,exportCaptionPaletteStateV001}
  from '../../tools/digest-quality/caption-palette-policy.mjs';
import {captionPaletteSourceV001,createCaptionPaletteDrawingViewV001,createCaptionPaletteRenderScopeV001}
  from '../../tools/digest-quality/caption-palette-view.mjs';
import {buildReadabilityCandidateRegistryV001} from '../../tools/digest-quality/caption-readability-candidate.mjs';
import {buildPresentationRendererOverlayAdapterV001,buildPresentationCompositeArgumentsV001}
  from './render_presentation_v002.mjs';
import {buildPresentationDevProxyRangeRecipeV001} from './presentation_dev_proxy_render_v001.mjs';
import {buildPresentationDevProxyPaletteStructureV001,validatePresentationDevProxyPaletteV001,
  renderPresentationDevProxyPaletteV001,readPresentationDevProxyPaletteV001}
  from './presentation_dev_proxy_palette_render_v001.mjs';

const profileId='dev-proxy-540p-v001',clone=structuredClone,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const tools={remotionPath:'/fixture/remotion',chromiumPath:'/fixture/chromium'};
const registry=buildReadabilityCandidateRegistryV001({version:'candidate-readability-v001',registry:JSON.parse(await readFile(
  new URL('./registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json',import.meta.url),'utf8'))});
let fixturePromise;
async function fixture(t,paletteId='light-sky-blue') {
  fixturePromise??=(async()=>{
    const ref=await bind(fileURLToPath(new URL('../../runtime/artifacts/digest-structure-20260929-v001/drawing-evidence.json',import.meta.url)));
    const sourceView=await readDigestStructureDrawingEvidenceV001({evidenceRef:ref});return {sourceView,ref};
  })();
  let m;try{m=await fixturePromise;}catch(error){if(error.code==='ENOENT'){t.skip('saved 7B fixture unavailable');return null;}throw error;}
  const source=captionPaletteSourceV001(m.sourceView);
  const automatic=createCaptionPaletteAutoV001({source,choices:source.effectiveSelections.filter(s=>s.selection.role==='Focus')
    .map(s=>({captionId:s.captionId,paletteId,reason:'Finite palette renderer regression fixture only.'}))});
  const overrides=createCaptionPaletteOverridesV001({source,automatic}),saved=exportCaptionPaletteStateV001({source,automatic,overrides});
  return {sourceView:m.sourceView,view:createCaptionPaletteDrawingViewV001({sourceView:m.sourceView,saved,
    sourceEvidenceRef:m.ref,stateRef:{path:'/fixture/palette.json',fileSha256:hash(saved)}})};
}
function completionFor(view,range={startFrame:780,endFrameExclusive:910}) {
  const structure=buildPresentationDevProxyPaletteStructureV001({view,profileId,range});
  const plan=createCaptionPaletteRenderScopeV001(view,range).resolvedPlan;
  const builder=buildPresentationRendererOverlayAdapterV001({...tools,processObserver:{run(){assert.fail('pure fixture');}}}).buildProps;
  let index=0;
  const stateRecords=structure.captions.flatMap(c=>c.states.map(s=>{
    const props=builder(s.element,plan,registry);
    return {captionId:c.captionId,...clone(s),props,propsCanonicalSha256:hash(props),calibration:null,
      png:{path:'/fixture/state-'+index+++'.png',fileSha256:sha('fixture')},pngCanvas:clone(structure.profile.outputCanvas),
      alphaObservation:{alphaMax:1,alphaBounds:{left:100,top:100,right:200,bottom:200}}};
  }));
  const baseSourceClock={schemaVersion:'presentation-dev-proxy-source-clock-v001',kind:'projected-background',inputFps:30,
    inputFrameCount:view.projection.displayFrameCount,logicalStartFrame:0,logicalEndFrameExclusive:view.projection.displayFrameCount,
    sourceClockSha256:view.projection.sourceClockSha256,projectionSha256:view.projection.projectionSha256,
    audio:{sampleRate:view.projection.sourceClock.playbackSampleRate,channels:2}};
  const localMedia={recipe:buildPresentationDevProxyRangeRecipeV001({sourceClock:baseSourceClock,scope:structure.scope}),
    videoAndPcm:{path:'/fixture/range.nut'},audio:{path:'/fixture/audio.m4a'}};
  let cursor=0;
  const records=structure.captions.map(c=>{const rows=stateRecords.slice(cursor,cursor+c.states.length);cursor+=rows.length;
    return c.kind==='static'?{element:clone(c.element),pngPath:rows[0].png.path}:{element:clone(c.element),
      [c.kind==='motion'?'motionStates':'pulseStates']:rows.map(r=>({state:r.state,element:clone(r.element),pngPath:r.png.path}))};});
  const inputAudio={codecName:'aac',sampleRate:44100,channelLayout:'stereo',packetPayloadSha256:sha('audio')};
  return {schemaVersion:'presentation-dev-proxy-palette-completion-v001',status:'development-proxy-palette-ready',
    profileId,profile:structure.profile,range,structure,tools,registry,stateRecords,sourceReferences:clone(view.paletteSourceReferences),
    logicalPlanCanonicalSha256:hash(plan),baseSourceClock,localMedia,inputAudio,
    outputMedia:{video:{codecName:'h264',...structure.profile.outputCanvas,frameCount:structure.scope.frameCount},audio:clone(inputAudio)},
    compositorArguments:buildPresentationCompositeArgumentsV001({baseMediaPath:localMedia.videoAndPcm.path,plan,overlayRecords:records,
      expectedFrameCount:structure.scope.frameCount,serializePngAndFilters:true,audioMediaPath:localMedia.audio.path,renderRange:structure.renderRange}),
    structuralQc:{status:'passed'},finalPixelQc:'not-run-dev-only',humanQuality:'not-evaluated'};
}

test('two approved finite candidate palettes retain the same range, targets, 1080p layout and 540p development meaning',async t=>{
  let reference;
  for(const [paletteId,color] of [['yellow','#FFD65A'],['light-sky-blue','#87CEFA']]) {
    const m=await fixture(t,paletteId);if(!m)return;
    const completion=completionFor(m.view),s=completion.structure;
    assert.equal(validatePresentationDevProxyPaletteV001({completion,view:m.view}).status,'passed');
    assert.deepEqual(s.profile.sourceCanvas,{width:1920,height:1080,fps:30});assert.deepEqual(s.profile.outputCanvas,{width:960,height:540,fps:30});
    assert.equal(s.scope.frameCount,130);assert.equal(completion.localMedia.recipe.logicalSampleCount,130*1470);
    const target=s.captions.find(c=>c.element.presentationColorRange);assert(target);assert.equal(target.element.presentationColorRange.fontColor,color);
    const normalized=s.captions.map(c=>{const e=clone(c.element);if(e.presentationColorRange)e.presentationColorRange.fontColor='comparison-only';return e;});
    if(reference)assert.deepEqual(normalized,reference);else reference=normalized;
    assert.equal(completion.finalPixelQc,'not-run-dev-only');assert.equal(completion.humanQuality,'not-evaluated');
  }
});

test('short ranges retain the saved finite motion state order and global start clock',async t=>{
  const m=await fixture(t);if(!m)return;
  const motion=m.sourceView.resolvedPlan.elements.find(e=>e.presentationMotion);
  const range={startFrame:motion.startFrame+1,endFrameExclusive:motion.endFrameExclusive-1};
  const c=completionFor(m.view,range),motionRecord=c.structure.captions.find(r=>r.captionId===motion.instructionId);
  assert.deepEqual(motionRecord.element,motion);assert.equal(motionRecord.kind,'motion');assert(motionRecord.states.length>1);
  assert.equal(validatePresentationDevProxyPaletteV001({completion:c,view:m.view}).status,'passed');
  assert(c.compositorArguments.join(' ').includes('(N+1)'));
  const mutated=clone(c);[mutated.stateRecords[0],mutated.stateRecords[1]]=[mutated.stateRecords[1],mutated.stateRecords[0]];
  assert.throws(()=>validatePresentationDevProxyPaletteV001({completion:mutated,view:m.view}));
});

test('Panel geometry remains the saved geometry when the finite palette view is scoped',async t=>{
  const m=await fixture(t);if(!m)return;
  const panel=m.sourceView.resolvedPlan.elements.find(e=>e.visualState.background);
  const s=buildPresentationDevProxyPaletteStructureV001({view:m.view,profileId,range:{startFrame:panel.startFrame,endFrameExclusive:panel.endFrameExclusive}});
  assert.deepEqual(s.captions.find(r=>r.captionId===panel.instructionId).element,panel);
});

test('missing, unknown and final profiles fail before accessing a renderer or output',async t=>{
  const m=await fixture(t);if(!m)return;
  for(const invalid of [undefined,'','unknown','final-1080p-v001']) {
    assert.throws(()=>buildPresentationDevProxyPaletteStructureV001({view:m.view,profileId:invalid,range:{startFrame:780,endFrameExclusive:910}}));
    await assert.rejects(renderPresentationDevProxyPaletteV001({profileId:invalid}));
  }
});

test('missing/full/outside ranges and cloned unverified views fail before drawing',async t=>{
  const m=await fixture(t);if(!m)return;
  for(const range of [undefined,null,{startFrame:0,endFrameExclusive:m.view.projection.displayFrameCount},
    {startFrame:-1,endFrameExclusive:10},{startFrame:0,endFrameExclusive:m.view.projection.displayFrameCount+1}])
    assert.throws(()=>buildPresentationDevProxyPaletteStructureV001({view:m.view,profileId,range}));
  assert.throws(()=>buildPresentationDevProxyPaletteStructureV001({view:clone(m.view),profileId,range:{startFrame:780,endFrameExclusive:910}}),/verified saved sources/);
  await assert.rejects(renderPresentationDevProxyPaletteV001({profileId}),/short range/);
});

test('saved structural receipt rejects omitted/changed glyphs, range, clock, geometry, palette or drawing props',async t=>{
  const m=await fixture(t);if(!m)return;const good=completionFor(m.view);
  const cases=[
    c=>c.stateRecords.pop(),c=>{c.stateRecords[0].element.startFrame++;},c=>{c.logicalPlanCanonicalSha256=sha('changed');},
    c=>{c.stateRecords[0].element.visualState.textStyle.fontSizePx++;},c=>{c.range.startFrame++;},
    c=>{c.stateRecords[0].props.text='different';c.stateRecords[0].propsCanonicalSha256=hash(c.stateRecords[0].props);},
    c=>{c.stateRecords.find(r=>r.element.presentationColorRange).element.presentationColorRange.fontColor='#123456';},
    c=>{c.stateRecords.find(r=>r.element.presentationColorRange).element.presentationColorRange.end++;},
    c=>{c.sourceReferences[0].fileSha256=sha('changed');},
  ];
  for(const change of cases){const c=clone(good);change(c);assert.throws(()=>validatePresentationDevProxyPaletteV001({completion:c,view:m.view}));}
});

test('saved receipt rejects missing alpha, overflow, false final/human approval and changed media clocks',async t=>{
  const m=await fixture(t);if(!m)return;const good=completionFor(m.view);
  const cases=[c=>{c.stateRecords[0].alphaObservation.alphaMax=0;},c=>{c.stateRecords[0].alphaObservation.alphaBounds.right=961;},
    c=>{c.stateRecords[0].pngCanvas.width=1920;},c=>{c.finalPixelQc='passed';},c=>{c.humanQuality='approved';},
    c=>{c.status='completed-final';},c=>{c.schemaVersion='presentation-dev-proxy-completion-v001';},
    c=>{c.outputMedia.video.frameCount--;},c=>{c.outputMedia.audio.packetPayloadSha256=sha('different');},
    c=>{c.localMedia.recipe.inputStartSample++;},c=>{c.compositorArguments.push('-shortest');}];
  for(const change of cases){const c=clone(good);change(c);assert.throws(()=>validatePresentationDevProxyPaletteV001({completion:c,view:m.view}));}
});

test('independent reader rejects changed completion bytes or a symlink before reading source media or launching tools',async t=>{
  const dir=await mkdtemp('/private/tmp/zev-palette-completion-');t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=dir+'/completion.json';await writeFile(file,'{}\n');const ref=await bind(file);
  await writeFile(file,'{"status":"development-proxy-palette-ready"}\n');
  await assert.rejects(readPresentationDevProxyPaletteV001({completionRef:ref}),/input bytes changed/);
  const {symlink}=await import('node:fs/promises');await symlink(file,dir+'/link.json');
  await assert.rejects(readPresentationDevProxyPaletteV001({completionRef:{...ref,path:dir+'/link.json'}}));
});

/** Finite palette candidate, short 540p ranges only. The saved 7B renderer and
 * its execution hashes stay frozen. Its necessary private save/render/read
 * lifecycle is retained here; exported geometry, finite programs, rasterizer,
 * range recipe, compositor and media checks are reused without modification.
 * This receipt is not final 1080p QC or human palette adoption. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {CAPTION_PALETTE_VIEW_VERSION,assertCaptionPaletteDrawingViewV001,createCaptionPaletteRenderScopeV001,
  readCaptionPaletteDrawingEvidenceV001} from '../../tools/digest-quality/caption-palette-view.mjs';
import {assertPresentationDevProxyProfileV001,assertPresentationDevProxySourceCanvasV001} from './presentation_dev_proxy_profile_v001.mjs';
import {buildPresentationDevProxyRangeArgumentsV001,buildPresentationDevProxyRangeRecipeV001,
  assertPresentationDevProxyAlphaBoundsV001} from './presentation_dev_proxy_render_v001.mjs';
import {readPresentationDevProxyStructureBackgroundV001} from './presentation_dev_proxy_structure_background_v001.mjs';
import {createPresentationDevProxyOverlaySessionV001} from './presentation_dev_proxy_overlay_session_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001,verifyEditedOrchestrationDrawingRulesRefV001} from './presentation_orchestration_edited_render_v001.mjs';
import {getPresentationCaptionMotionProgramV001,buildPresentationCaptionMotionStateElementsV001,
  assertPresentationCaptionMotionLayoutsV001} from './presentation_caption_motion_v001.mjs';
import {getPresentationPulseProgramV001,buildPresentationPulseStateElementsV001,assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';
import {isPresentationPanelBackgroundV002} from './presentation_panel_presets_v002.mjs';
import {resolveVisibleCenterOffsetsV001} from './presentation_renderer_text_layout_v001.mjs';
import {createPresentationRendererOverlayJobV001,buildPresentationRendererOverlayAdapterV001,composePresentationMediaV001,
  buildPresentationCompositeArgumentsV001,runPresentationRendererChildProcessV001} from './render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001,inspectOverlayPngWithToolV001} from './presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from './presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(directory,'../..');
const hash=x=>createHash('sha256').update(canonicalJson(x)).digest('hex'),clone=structuredClone;
const same=(a,b,message)=>assert.equal(canonicalJson(a),canonicalJson(b),message);
const json=async file=>JSON.parse(await readFile(file,'utf8'));
export const PRESENTATION_DEV_PROXY_PALETTE_COMPLETION_V001='presentation-dev-proxy-palette-completion-v001';
const ownNames=['presentation_dev_proxy_palette_render_v001.mjs','presentation_dev_proxy_render_v001.mjs',
  'presentation_dev_proxy_profile_v001.mjs','presentation_dev_proxy_overlay_session_v001.mjs',
  'presentation_dev_proxy_structure_background_v001.mjs','../../tools/digest-quality/caption-palette-view.mjs',
  '../../tools/digest-quality/caption-palette-policy.mjs','presentation_auto_effects_palette_v001.mjs','../../tools/digest-quality/digest-structure-view.mjs',
  '../../tools/digest-quality/digest-structure-evidence.mjs','../../tools/digest-quality/digest-structure-policy.mjs',
  '../../tools/digest-quality/digest-structure-new-captions.mjs'];
async function bind(file) {
  assert(path.isAbsolute(file));const before=await lstat(file);assert(before.isFile()&&!before.isSymbolicLink());
  const sha=createHash('sha256');for await(const b of createReadStream(file))sha.update(b);
  const after=await lstat(file);for(const key of ['ino','size','mtimeMs'])assert.equal(after[key],before[key]);
  return {path:file,bytes:after.size,fileSha256:sha.digest('hex')};
}
async function verify(ref) {const actual=await bind(ref.path);assert.equal(actual.fileSha256,ref.fileSha256,'input bytes changed: '+ref.path);
  if(ref.bytes!==undefined)assert.equal(actual.bytes,ref.bytes);return actual;}
async function save(file,value) {await writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return bind(file);}
function scopeFor(view,range) {
  assert.equal(view.schemaVersion,CAPTION_PALETTE_VIEW_VERSION);assertCaptionPaletteDrawingViewV001(view);
  assert(range&&typeof range==='object','explicit short range required');
  const scope=createCaptionPaletteRenderScopeV001(view,range);
  assert(scope.scope.frameCount<view.projection.displayFrameCount,'full timeline palette rendering is not authorized');
  assert(scope.resolvedPlan.elements.length>0,'palette range contains no captions');
  return scope;
}
function finite(element,canvas) {
  assert(!(element.presentationMotion&&element.presentationPulse));
  if(element.presentationMotion)return {kind:'motion',program:getPresentationCaptionMotionProgramV001({element,canvas}),states:buildPresentationCaptionMotionStateElementsV001({element,canvas})};
  if(element.presentationPulse)return {kind:'pulse',program:getPresentationPulseProgramV001({element,canvas}),states:buildPresentationPulseStateElementsV001({element,canvas})};
  return {kind:'static',program:null,states:[{state:'static',element}]};
}
export function buildPresentationDevProxyPaletteStructureV001({view,profileId,range}) {
  const profile=assertPresentationDevProxyProfileV001(profileId),derived=scopeFor(view,range),plan=derived.resolvedPlan;
  assertPresentationDevProxySourceCanvasV001(plan.canvas);
  const captions=plan.elements.map(element=>({captionId:element.instructionId,element:clone(element),...clone(finite(element,plan.canvas))}));
  return {schemaVersion:'presentation-dev-proxy-palette-structure-v001',profile:clone(profile),viewSha256:view.viewSha256,
    projectionSha256:view.projection.projectionSha256,fourSavedSha256:clone(view.fourSavedSha256),scope:clone(derived.scope),
    renderRange:clone(derived.renderRange),sourcePlanCanonicalSha256:hash(plan),normalPlanCanonicalSha256:hash(derived.normalPlan),
    captions,stateCount:captions.reduce((n,c)=>n+c.states.length,0),finalPixelQc:'not-run-dev-only',humanQuality:'not-evaluated'};
}
function options(tools) {
  for(const name of ['ffmpegPath','ffprobePath','imageMagickPath','remotionPath','chromiumPath','tsxPath'])assert(path.isAbsolute(tools?.[name]??''),'explicit tool required: '+name);
  return {...tools,layoutInspectorPath:path.join(directory,'inspect_presentation_render_layout_v001.ts')};
}
async function executionBinding(view,tools) {
  const originalRules=await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion:view.candidateExecution?.version??null});
  const toolBindings=Object.fromEntries(await Promise.all(Object.entries(tools).map(async([role,command])=>[role,{command,executable:await bind(await realpath(command))}])));
  return {originalRules,toolBindings,developmentImplementation:await Promise.all([...ownNames.map(p=>path.resolve(directory,p)),process.execPath].map(bind))};
}
async function verifyExecutionBinding(record,tools) {
  await verifyEditedOrchestrationDrawingRulesRefV001(record.originalRules);
  same(record.developmentImplementation.map(r=>r.path),[...ownNames.map(p=>path.resolve(directory,p)),process.execPath],'implementation coverage changed');
  for(const ref of record.developmentImplementation)await verify(ref);
  same(Object.keys(record.toolBindings).sort(),Object.keys(tools).sort());
  for(const [role,command] of Object.entries(tools)){assert.equal(record.toolBindings[role].command,command);same(await bind(await realpath(command)),record.toolBindings[role].executable);}
}
async function loadInput({drawingEvidenceRef,profileId,range,baseProxyManifestRef,backgroundProofRef,tools}) {
  assertPresentationDevProxyProfileV001(profileId);assert(range,'explicit short range required');
  await verify(drawingEvidenceRef);const view=await readCaptionPaletteDrawingEvidenceV001({evidenceRef:drawingEvidenceRef});
  const structure=buildPresentationDevProxyPaletteStructureV001({view,profileId,range});
  for(const ref of view.paletteSourceReferences)await verify(ref);
  await verify(baseProxyManifestRef);await verify(backgroundProofRef);
  // Saved 7B is an immutable, verified input. This new reader independently
  // observes its new short output, not another run of 7B's complete source QC.
  const proxy=await readPresentationDevProxyStructureBackgroundV001({manifestRef:baseProxyManifestRef,profileId,
    tools:{ffmpegPath:tools.ffmpegPath,ffprobePath:tools.ffprobePath},expectedProjection:view.projection,verification:'saved-receipt'});
  same(await json(backgroundProofRef.path),proxy.backgroundProof,'saved 7B background/projection differs');
  return {view,structure,proxy,baseManifest:proxy.manifest};
}
function records(structure,stateRecords) {
  let cursor=0;return structure.captions.map(c=>{const rows=stateRecords.slice(cursor,cursor+c.states.length);cursor+=c.states.length;
    return c.kind==='static'?{element:clone(c.element),pngPath:rows[0].png.path}:{element:clone(c.element),
      [c.kind==='motion'?'motionStates':'pulseStates']:rows.map((r,i)=>({state:c.states[i].state,element:clone(c.states[i].element),pngPath:r.png.path}))};});
}
function checkMedia(media,structure,audio) {
  same(media.video,{codecName:'h264',...structure.profile.outputCanvas,frameCount:structure.scope.frameCount});
  assert(media.audio&&audio&&media.audio.codecName==='aac');
  for(const k of ['codecName','sampleRate','channelLayout','packetPayloadSha256'])assert.equal(media.audio[k],audio[k],'audio packet stream changed: '+k);
}
const audioArguments=({sourcePath,outputPath,recipe})=>['-hide_banner','-nostdin','-v','error','-n','-i',sourcePath,'-map','0:a:0','-vn',
  '-af',`asettb=expr=1/${recipe.sampleRate},asetpts=N`,'-c:a','aac','-b:a','192k','-ar',String(recipe.sampleRate),'-ac','2',
  '-movie_timescale','30','-movflags','+faststart','-map_metadata','-1','-f','mp4',outputPath];
async function audioPayload(file,filter,tools,processObserver=null) {
  const result=await runPresentationRendererChildProcessV001(tools.ffmpegPath,['-hide_banner','-nostdin','-v','error','-i',file,'-map','0:a:0','-vn',
    ...(filter?['-af',filter]:[]),'-c:a','pcm_f32le','-f','hash','-hash','sha256','-'],{processObserver,observationLabel:'palette-range-pcm'});
  const value=result.stdout.toString('utf8').trim();assert(/^SHA256=[a-f0-9]{64}$/.test(value));return value.slice(7);
}
async function frameClock(file,frameCount,tools,processObserver=null) {
  const r=await runPresentationRendererChildProcessV001(tools.ffprobePath,['-v','error','-select_streams','v:0','-show_streams','-show_frames',
    '-show_entries','stream=time_base:frame=best_effort_timestamp','-of','json',file],{processObserver,observationLabel:'palette-frame-clock'});
  const observation=JSON.parse(r.stdout.toString('utf8'));assert.equal(observation.streams.length,1);assert.equal(observation.frames.length,frameCount);
  const [n,d]=observation.streams[0].time_base.split('/').map(BigInt);
  observation.frames.forEach((f,i)=>assert.equal(BigInt(f.best_effort_timestamp)*n*30n,BigInt(i)*d));
  return {status:'passed',frameCount,fps:30,timeBase:observation.streams[0].time_base,decodedFrameClockCanonicalSha256:hash(observation)};
}
async function prepareRange(input,outputDirectory,tools,processObserver) {
  const recipe=buildPresentationDevProxyRangeRecipeV001({sourceClock:input.baseManifest.sourceClock,scope:input.structure.scope});
  assert.equal(input.baseManifest.audio.source.codec,'pcm_f32le');
  const dir=path.join(outputDirectory,'range');await mkdir(dir);const base=path.join(dir,'background.nut'),audio=path.join(dir,'audio.m4a');
  const args=buildPresentationDevProxyRangeArgumentsV001({sourcePath:input.proxy.mediaRef.path,outputPath:base,recipe});
  await runPresentationRendererChildProcessV001(tools.ffmpegPath,args,{processObserver,observationLabel:'palette-range-cut'});
  const sourcePcmSha256=await audioPayload(input.proxy.mediaRef.path,recipe.audioFilter,tools,processObserver);
  const rangePcmSha256=await audioPayload(base,null,tools,processObserver);assert.equal(rangePcmSha256,sourcePcmSha256);
  const videoClock=await frameClock(base,recipe.frameCount,tools,processObserver),audioArgs=audioArguments({sourcePath:base,outputPath:audio,recipe});
  await runPresentationRendererChildProcessV001(tools.ffmpegPath,audioArgs,{processObserver,observationLabel:'palette-range-aac'});
  const audioClock=await inspectOrchestrationEncodedAudioV001({audioPath:audio,logicalSampleCount:recipe.logicalSampleCount,sampleRate:recipe.sampleRate,...tools});
  return {schemaVersion:'presentation-dev-proxy-palette-range-v001',sourceProxyRef:input.proxy.mediaRef,recipe,videoAndPcm:await bind(base),audio:await bind(audio),
    sourcePcmSha256,rangePcmSha256,videoClock,audioClock,rangeCommand:{command:tools.ffmpegPath,args},audioCommand:{command:tools.ffmpegPath,args:audioArgs}};
}
export function validatePresentationDevProxyPaletteV001({completion,view}) {
  assert.equal(completion.schemaVersion,PRESENTATION_DEV_PROXY_PALETTE_COMPLETION_V001);assert.equal(completion.status,'development-proxy-palette-ready');
  const structure=buildPresentationDevProxyPaletteStructureV001({view,profileId:completion.profileId,range:completion.range});
  same(completion.structure,structure);same(completion.profile,structure.profile);same(completion.sourceReferences,view.paletteSourceReferences);
  assert.equal(completion.finalPixelQc,'not-run-dev-only');assert.equal(completion.humanQuality,'not-evaluated');assert.equal(completion.structuralQc.status,'passed');
  const plan=scopeFor(view,completion.range).resolvedPlan;
  const builder=buildPresentationRendererOverlayAdapterV001({remotionPath:completion.tools.remotionPath,chromiumPath:completion.tools.chromiumPath,
    processObserver:{run(){throw Error('pure props builder');}}}).buildProps;
  const wanted=structure.captions.flatMap(c=>c.states.map(s=>({captionId:c.captionId,...s}))),paths=new Set();
  assert.equal(completion.stateRecords.length,wanted.length);
  completion.stateRecords.forEach((row,i)=>{
    assert.equal(row.captionId,wanted[i].captionId);assert.equal(row.state,wanted[i].state);same(row.element,wanted[i].element);
    const props=builder(wanted[i].element,plan,completion.registry),needsCalibration=wanted[i].element.visualState.position.preset==='top-band'||isPresentationPanelBackgroundV002(wanted[i].element.visualState.background);
    assert.equal(row.calibration!==null,needsCalibration);
    if(row.calibration)props.renderVisibleCenterCorrectionPx=resolveVisibleCenterOffsetsV001({containerBounds:row.calibration.containerBounds,lineBounds:row.calibration.lines.map(l=>l.alphaBounds)});
    same(row.props,props,'palette props differ from saved finite selection');assert.equal(row.propsCanonicalSha256,hash(props));
    assert(!paths.has(row.png.path));paths.add(row.png.path);same(row.pngCanvas,structure.profile.outputCanvas);
    assertPresentationDevProxyAlphaBoundsV001({element:row.element,canvas:plan.canvas,profileId:completion.profileId,observation:row.alphaObservation});
  });
  assert.equal(completion.logicalPlanCanonicalSha256,hash(plan));
  same(completion.localMedia.recipe,buildPresentationDevProxyRangeRecipeV001({sourceClock:completion.baseSourceClock,scope:structure.scope}));
  same(completion.compositorArguments,buildPresentationCompositeArgumentsV001({baseMediaPath:completion.localMedia.videoAndPcm.path,plan,
    overlayRecords:records(structure,completion.stateRecords),expectedFrameCount:structure.scope.frameCount,serializePngAndFilters:true,
    audioMediaPath:completion.localMedia.audio.path,renderRange:structure.renderRange}));
  checkMedia(completion.outputMedia,structure,completion.inputAudio);
  return {status:'passed',captionCount:structure.captions.length,stateCount:structure.stateCount,finalPixelQc:'not-run-dev-only',humanQuality:'not-evaluated'};
}

export async function renderPresentationDevProxyPaletteV001({drawingEvidenceRef,profileId,baseProxyManifestRef,backgroundProofRef,outputDirectory,range,
  tools:requestedTools,onProgress=()=>{}}) {
  assertPresentationDevProxyProfileV001(profileId);assert(range,'explicit short range required');
  const tools=options(requestedTools),input=await loadInput({drawingEvidenceRef,profileId,range,baseProxyManifestRef,backgroundProofRef,tools});
  const {view,structure}=input,plan=scopeFor(view,range).resolvedPlan;
  const guarded=assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});await mkdir(outputDirectory);
  const start=performance.now(),timings={},processObserver=createPresentationRendererProcessObserverV001({observationDirectory:path.join(outputDirectory,'processes')});
  let session,calibrationAdapter;
  try {
    const implementation=await executionBinding(view,tools),registry=implementation.originalRules.candidateExecution.registry;
    const builder=buildPresentationRendererOverlayAdapterV001({...tools,processObserver}).buildProps;
    const states=structure.captions.flatMap(c=>c.states.map(s=>({captionId:c.captionId,...clone(s)}))),props=states.map(s=>builder(s.element,plan,registry));
    const layoutInput=path.join(outputDirectory,'layout-input.json'),layoutOutput=path.join(outputDirectory,'layout-output.json');
    await save(layoutInput,{canvas:plan.canvas,overlays:props});const layoutStart=performance.now();
    await runPresentationRendererChildProcessV001(tools.tsxPath,[tools.layoutInspectorPath,layoutInput,layoutOutput],
      {processObserver,observationLabel:'palette-logical-layout',env:{NODE_PATH:path.join(repo,'runner/node_modules')}});
    const layout=await json(layoutOutput);assert.equal(layout.status,'passed');assert.equal(layout.items.length,states.length);
    let cursor=0;for(const c of structure.captions){const items=layout.items.slice(cursor,cursor+c.states.length);cursor+=c.states.length;
      assert(items.every(r=>r.instructionId===c.captionId));if(c.kind==='motion')assertPresentationCaptionMotionLayoutsV001({element:c.element,canvas:plan.canvas,layoutItems:items});
      if(c.kind==='pulse')assertPresentationPulseAnchorsV001(items);}
    timings.logicalLayoutMilliseconds=performance.now()-layoutStart;
    const overlays=path.join(outputDirectory,'overlays');await mkdir(overlays);
    session=createPresentationDevProxyOverlaySessionV001({repositoryRoot:repo,entryPoint:path.join(directory,'presentation_renderer_entry_v001.tsx'),
      publicDir:path.join(repo,'runner/public'),remotionPath:tools.remotionPath,chromiumPath:tools.chromiumPath,processObserver,profileId});
    const stateRecords=[],drawStart=performance.now();
    for(const [i,state] of states.entries()) {
      await onProgress({phase:'palette-overlays',index:i,count:states.length});let actual=props[i],calibration=null;
      if(state.element.visualState.position.preset==='top-band'||isPresentationPanelBackgroundV002(state.element.visualState.background)) {
        calibrationAdapter??=createPresentationRendererOverlayJobV001({...tools,processObserver});const lines=[];
        for(const line of state.element.indexedLines){const file=path.join(overlays,`${i}-calibration-${line.lineIndex}.png`);
          await calibrationAdapter.renderLineMask(actual,line.lineIndex,file);const measured=await inspectOverlayPngWithToolV001({instructionId:state.captionId,pngPath:file,imageMagickPath:tools.imageMagickPath,processObserver});
          assert(measured.alphaBounds);lines.push({lineIndex:line.lineIndex,file:await bind(file),alphaBounds:measured.alphaBounds});}
        const w=layout.items[i].wrapper,containerBounds={left:w.left,top:w.top,right:w.left+w.width,bottom:w.top+w.height};
        calibration={coordinateSpace:'saved-1080p',containerBounds,lines};actual={...actual,renderVisibleCenterCorrectionPx:resolveVisibleCenterOffsetsV001({containerBounds,lineBounds:lines.map(r=>r.alphaBounds)})};
      }
      const pngPath=path.join(overlays,`${i}.png`);await session.render(actual,pngPath);
      const alphaObservation=assertPresentationDevProxyAlphaBoundsV001({element:state.element,canvas:plan.canvas,profileId,
        observation:await inspectOverlayPngWithToolV001({instructionId:state.captionId,pngPath,imageMagickPath:tools.imageMagickPath,processObserver})});
      stateRecords.push({...state,props:actual,propsCanonicalSha256:hash(actual),png:await bind(pngPath),pngCanvas:clone(structure.profile.outputCanvas),alphaObservation,calibration});
    }
    timings.overlayMilliseconds=performance.now()-drawStart;await session.close();session=null;
    const mediaStart=performance.now(),localMedia=await prepareRange(input,outputDirectory,tools,processObserver);
    timings.rangePreparationMilliseconds=performance.now()-mediaStart;
    const inputMedia=await inspectRenderedMediaWithToolsV001(localMedia.audio.path,{...tools,processObserver});
    const videoPath=path.join(outputDirectory,'development-palette-proxy.mp4'),composite={baseMediaPath:localMedia.videoAndPcm.path,plan,
      overlayRecords:records(structure,stateRecords),expectedFrameCount:structure.scope.frameCount,outputPath:videoPath,ffmpegPath:tools.ffmpegPath,
      processObserver,serializePngAndFilters:true,audioMediaPath:localMedia.audio.path,renderRange:structure.renderRange};
    const compositeStart=performance.now();await onProgress({phase:'palette-composite'});await composePresentationMediaV001(composite);timings.compositeMilliseconds=performance.now()-compositeStart;
    const outputMedia=await inspectRenderedMediaWithToolsV001(videoPath,{...tools,processObserver});checkMedia(outputMedia,structure,inputMedia.audio);
    const outputVideoClock=await frameClock(videoPath,structure.scope.frameCount,tools,processObserver);
    const outputAudioClock=await inspectOrchestrationEncodedAudioV001({audioPath:videoPath,logicalSampleCount:localMedia.recipe.logicalSampleCount,sampleRate:localMedia.recipe.sampleRate,...tools});
    assert.equal(outputAudioClock.packetPayloadSha256,localMedia.audioClock.packetPayloadSha256);
    const completion={schemaVersion:PRESENTATION_DEV_PROXY_PALETTE_COMPLETION_V001,status:'development-proxy-palette-ready',profileId,profile:clone(structure.profile),
      drawingEvidenceRef,baseProxyManifestRef,backgroundProofRef,range,tools,guarded,structure,registry,stateRecords,layoutRef:await bind(layoutOutput),
      logicalPlanCanonicalSha256:hash(plan),localMedia,baseSourceClock:input.baseManifest.sourceClock,implementation,sourceReferences:clone(view.paletteSourceReferences),
      outputVideo:await bind(videoPath),outputMedia,outputVideoClock,outputAudioClock,inputAudio:inputMedia.audio,inputAudioClock:localMedia.audioClock,
      compositorArguments:buildPresentationCompositeArgumentsV001(composite),structuralQc:{status:'passed',scope:'palette-derived decisions, unchanged source clocks and geometry, local frame/audio/state verification'},
      finalPixelQc:'not-run-dev-only',humanQuality:'not-evaluated',backgroundVerification:input.proxy.verification,
      timings:{...timings,elapsedMilliseconds:performance.now()-start},processTimings:processObserver.getPerformance()};
    validatePresentationDevProxyPaletteV001({completion,view});for(const ref of completion.sourceReferences)await verify(ref);await verifyExecutionBinding(implementation,tools);
    return {completion,completionRef:await save(path.join(outputDirectory,'completion.json'),completion),mediaRef:completion.outputVideo};
  } catch(error) {
    await save(path.join(outputDirectory,'failure.json'),{schemaVersion:'presentation-dev-proxy-palette-failure-v001',status:'incomplete',profileId,drawingEvidenceRef,
      message:String(error.message),timings,finalPixelQc:'not-run-dev-only'});throw error;
  } finally {await session?.close();await calibrationAdapter?.close();}
}

export async function readPresentationDevProxyPaletteV001({completionRef}) {
  await verify(completionRef);const completion=await json(completionRef.path),tools=options(completion.tools);
  const {view,structure,proxy,baseManifest}=await loadInput({...completion,tools});
  validatePresentationDevProxyPaletteV001({completion,view});await verifyExecutionBinding(completion.implementation,tools);
  same(completion.baseSourceClock,baseManifest.sourceClock);same(completion.localMedia.sourceProxyRef,proxy.mediaRef);
  same(completion.sourceReferences,view.paletteSourceReferences);same(completion.registry,completion.implementation.originalRules.candidateExecution.registry);
  same(completion.backgroundVerification,proxy.verification);
  same(completion.localMedia.rangeCommand,{command:tools.ffmpegPath,args:buildPresentationDevProxyRangeArgumentsV001({sourcePath:proxy.mediaRef.path,outputPath:completion.localMedia.videoAndPcm.path,recipe:completion.localMedia.recipe})});
  same(completion.localMedia.audioCommand,{command:tools.ffmpegPath,args:audioArguments({sourcePath:completion.localMedia.videoAndPcm.path,outputPath:completion.localMedia.audio.path,recipe:completion.localMedia.recipe})});
  await verify(completion.layoutRef);const layout=await json(completion.layoutRef.path);assert.equal(layout.status,'passed');assert.equal(layout.items.length,completion.stateRecords.length);
  for(const row of completion.stateRecords) {
    await verify(row.png);const header=await readFile(row.png.path);assert.equal(header.readUInt32BE(16),960);assert.equal(header.readUInt32BE(20),540);
    const actual=await inspectOverlayPngWithToolV001({instructionId:row.captionId,pngPath:row.png.path,imageMagickPath:tools.imageMagickPath});
    same(assertPresentationDevProxyAlphaBoundsV001({element:row.element,canvas:view.resolvedPlan.canvas,profileId:completion.profileId,observation:actual}),row.alphaObservation);
    for(const line of row.calibration?.lines??[]){await verify(line.file);const measured=await inspectOverlayPngWithToolV001({instructionId:row.captionId,pngPath:line.file.path,imageMagickPath:tools.imageMagickPath});same(measured.alphaBounds,line.alphaBounds);}
  }
  await verify(completion.localMedia.videoAndPcm);await verify(completion.localMedia.audio);
  same(await frameClock(completion.localMedia.videoAndPcm.path,structure.scope.frameCount,tools),completion.localMedia.videoClock);
  const pcm=await audioPayload(completion.localMedia.videoAndPcm.path,null,tools);
  assert.equal(pcm,completion.localMedia.rangePcmSha256);assert.equal(pcm,completion.localMedia.sourcePcmSha256);
  assert.equal(pcm,await audioPayload(proxy.mediaRef.path,completion.localMedia.recipe.audioFilter,tools));
  const audio=await inspectOrchestrationEncodedAudioV001({audioPath:completion.localMedia.audio.path,logicalSampleCount:completion.localMedia.recipe.logicalSampleCount,sampleRate:completion.localMedia.recipe.sampleRate,...tools});
  same(audio,completion.inputAudioClock);same(audio,completion.localMedia.audioClock);
  await verify(completion.outputVideo);const media=await inspectRenderedMediaWithToolsV001(completion.outputVideo.path,tools);same(media,completion.outputMedia);checkMedia(media,structure,completion.inputAudio);
  same(await frameClock(completion.outputVideo.path,structure.scope.frameCount,tools),completion.outputVideoClock);
  const outAudio=await inspectOrchestrationEncodedAudioV001({audioPath:completion.outputVideo.path,logicalSampleCount:completion.localMedia.recipe.logicalSampleCount,sampleRate:completion.localMedia.recipe.sampleRate,...tools});
  same(outAudio,completion.outputAudioClock);assert.equal(outAudio.packetPayloadSha256,audio.packetPayloadSha256);await verify(completionRef);
  return {status:'development-proxy-palette-ready',completion,completionRef,mediaRef:completion.outputVideo,
    verification:{newLocalMedia:'independently-observed',saved7BBackground:'saved-receipt-byte-bindings'},finalPixelQc:'not-run-dev-only',humanQuality:'not-evaluated'};
}

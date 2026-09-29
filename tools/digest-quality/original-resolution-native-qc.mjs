/** Explicit seven-second QC continuation; the original media receipt stays immutable. */
import assert from 'node:assert/strict';
import {readFile,mkdir,statfs} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {originalLocalInputsV001,ORIGINAL_LOCAL_RANGE as range} from './original-resolution-local.mjs';
import {createIntegratedNativeQcInputV001 as create,restoreIntegratedNativeQcInputV001 as restore} from './integrated-native-qc-input-v001.mjs';
import {preparePresentationNativeFrameQcV001 as prepare} from '../../evals/clip_composition/presentation_native_frame_qc_preparation_integrated_v001.mjs';
import {inspectPresentationNativeFrameQcV001 as inspect,validatePresentationNativeFrameQcInspectionsV001 as validate,validatePresentationNativeFrameQcScopeV001 as validateScope,buildPresentationNativeFrameQcRecipeV001 as recipe} from '../../evals/clip_composition/presentation_native_frame_qc_integrated_v001.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {writePresentationQcEvidenceV001 as writeEvidence,readPresentationQcEvidenceV001 as readEvidence} from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {verifyPresentationNativeSampleReceiptsV001 as receipts} from '../../evals/clip_composition/presentation_native_qc_streaming_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001 as adapter,runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {createPresentationOverlayRenderSessionV001 as overlaySession} from '../../evals/clip_composition/presentation_overlay_render_session_v001.mjs';
import {createPresentationRendererProcessObserverV001 as observer} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectOverlayPngWithToolV001 as png} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),area=path.join(root,'runtime/artifacts/original-resolution-connection-20260930-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const space=async()=>{const s=await statfs(root);return {at:new Date().toISOString(),availableBytes:s.bavail*s.bsize};};
export async function runOriginalNativeV001(destination){assert(path.resolve(destination).startsWith(area+path.sep));await mkdir(destination);const start=performance.now(),startedAt=new Date().toISOString(),spaces=[await space()],o=observer({observationDirectory:path.join(destination,'processes')});let session;
 try {const i=await originalLocalInputsV001(),mediaRef=await bind(path.join(area,'attempt-002/completion.json')),c=await json(mediaRef.path);
  const {evidence,view}=await create({mediaRef,baselinePath:path.join(destination,'normal-plan.json')});const inputRef=await save(path.join(destination,'input.json'),evidence);
  const build=adapter({...i.tools,processObserver:o}).buildProps;
  const records=c.rows.map((r,n)=>({element:r.element,fileStem:String(n),props:r.props,pngPath:r.png.path,pngSha256:r.png.fileSha256,
   inspection:{...r.alpha,appliedOverlayPropsCanonicalSha256:hash(r.props),overlaySha256:r.png.fileSha256,overlayFile:path.basename(r.png.path)},
   ...(r.calibration?{visibleCenterCalibration:{schemaVersion:'presentation-visible-center-calibration-v001',containerBounds:r.calibration.containerBounds,
    uncorrectedPropsCanonicalSha256:hash(build(r.element,i.plan,i.registry)),lineMasks:r.calibration.lines.map(l=>({lineIndex:l.lineIndex,pngPath:l.file.path,pngSha256:l.file.fileSha256,alphaBounds:l.alphaBounds}))}}:{})}));
  session=overlaySession({repositoryRoot:root,entryPoint:path.join(root,'evals/clip_composition/presentation_renderer_entry_v001.tsx'),publicDir:path.join(root,'runner/public'),...i.tools,processObserver:o});
  const prepStarted=performance.now();const prepared=await prepare({plan:i.plan,records,presentationTimeline:null,presetRegistry:i.registry,
   overlayAdapter:{buildProps:build,renderStill:(...args)=>session.render(...args)},inspectPng:args=>png({...args,...i.tools,processObserver:o}),
   inspectLayout:async overlays=>{const p=path.join(destination,'layout-input.json'),q=path.join(destination,'layout-output.json');await save(p,{canvas:i.plan.canvas,overlays});await child(i.tools.tsxPath,[i.tools.layoutInspectorPath,p,q],{processObserver:o,observationLabel:'native-independent-layout',env:{NODE_PATH:path.join(root,'runner/node_modules')}});return json(q);},
   scratchDirectory:path.join(destination,'preparation'),orchestrationDrawingView:view,renderRange:range});
  await session.close();session=null;const preparationSeconds=(performance.now()-prepStarted)/1000;
  const preparationRef=await save(path.join(destination,'preparation.json'),prepared);
  const specification=recipe({plan:i.plan,baselinePlan:scope(view.projectedNormalPlan,range),records:prepared.records,orchestrationDrawingView:view,renderRange:range});
  const capacity=specification.samples.map(s=>({frame:s.frame,candidates:s.references.length,rgbBytesPerImage:s.crop.width*s.crop.height*3,allReferenceBytes:s.references.length*s.crop.width*s.crop.height*3}));spaces.push(await space());await save(path.join(destination,'preflight.json'),{space:spaces.at(-1),capacity,logicalReferenceBytes:capacity.reduce((n,s)=>n+s.allReferenceBytes,0),sampleCount:specification.samples.length,recipe:specification,mediaReused:mediaRef});console.log('native QC start',specification.samples.length);
  const q=await inspect({plan:i.plan,records:prepared.records,provenance:prepared.provenance,media:{base:c.closed,completed:c.videos[0].video},
   tools:{ffmpeg:await bind(i.tools.ffmpegPath),imageMagick:await bind(i.tools.imageMagickPath)},scratchDirectory:path.join(destination,'native'),processObserver:o,renderRange:range,
   referenceRetention:'verified-pass-regenerable-v001',executionControl:{beforeHeavyBatch:async()=>{spaces.push(await space());}}});
  const saved=await writeEvidence(path.join(destination,'native-qc.json'),q),nativeRef={path:path.join(destination,'native-qc.json'),fileSha256:saved.fileSha256,bytes:saved.bytes};
  const read=await readEvidence(nativeRef.path,{expectedFileSha256:nativeRef.fileSha256});const reread=await receipts({samples:read.evidence.samples});
  await verify(mediaRef);await verify(inputRef);spaces.push(await space());
  const result={schemaVersion:'original-resolution-native-qc-v001',status:q.status==='passed'?'technical-passed':'native-failed',outlineChoice:null,humanQuality:'not-reviewed',inputRef,mediaRef,preparationRef,nativeRef,
   implementation:await bind(fileURLToPath(import.meta.url)),startedAt,endedAt:new Date().toISOString(),seconds:(performance.now()-start)/1000,preparationSeconds,performance:q.performance,
   samples:q.evidence.samples.length,captions:i.plan.elements.length,violations:q.violations,reread,spaces,processTimings:o.getPerformance()};
  await save(path.join(destination,'completion.json'),result);return result;
 }catch(e){await save(path.join(destination,'failure.json'),{status:'incomplete',message:e.message,stack:e.stack,native:e.nativeFrameQcFailure??null,startedAt,spaces});throw e;}finally{await session?.close();}}
export async function readOriginalNativeV001(file){const completionRef=await bind(file),c=await json(file);assert.equal(c.schemaVersion,'original-resolution-native-qc-v001');assert(['technical-passed','native-failed'].includes(c.status));assert.equal(c.outlineChoice,null);assert.equal(c.humanQuality,'not-reviewed');
 for(const r of [c.inputRef,c.mediaRef,c.preparationRef,c.nativeRef,c.implementation])await verify(r);assert.deepEqual(c.implementation,await bind(fileURLToPath(import.meta.url)));
 const view=await restore(await json(c.inputRef.path)),plan=scope(view.resolvedPlan,range),q=await readEvidence(c.nativeRef.path,{expectedFileSha256:c.nativeRef.fileSha256});await validateScope({plan,evidence:q.evidence,renderRange:range});
 const checked=await validate({plan,inspections:q.inspections,renderRange:range});assert.deepEqual(checked.violations,q.violations);assert.deepEqual(c.violations,q.violations);assert.equal(c.status,checked.violations.length?'native-failed':'technical-passed');
 assert.equal(c.samples,q.evidence.samples.length);assert.equal(c.captions,plan.elements.length);const retained=await receipts({samples:q.evidence.samples});await verify(completionRef);
 return {status:c.status,samples:c.samples,captions:c.captions,violations:c.violations,retained,outlineChoice:null};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const[cmd,target]=process.argv.slice(2);console.log(JSON.stringify(cmd==='run'?await runOriginalNativeV001(path.resolve(target)):cmd==='read'?await readOriginalNativeV001(path.resolve(target)):assert.fail('run/read'),null,2));}

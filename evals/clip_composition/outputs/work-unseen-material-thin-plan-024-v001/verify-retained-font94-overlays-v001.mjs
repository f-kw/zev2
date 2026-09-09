import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile, readdir, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationRenderApplicationResults,
  PRESENTATION_RENDERER_OUTPUT_NAMES} from '../../render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from '../../presentation_renderer_process_observation_v001.mjs';
import {buildPresentationInstructionCommonCorePlanV001} from '../../run_presentation_instruction_renderer_job_v002.ts';
import {inspectOverlayPngWithToolV001, evaluatePresentationRendererQcV002} from '../../presentation_renderer_qc_v002.mjs';

const root=path.resolve(fileURLToPath(new URL('../../../..',import.meta.url)));
const work=path.dirname(fileURLToPath(import.meta.url));
const retained=path.join(root,'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/.render-v007.presentation-renderer-v002-work-94CMqV');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const bind=async p=>({path:path.relative(root,p),bytes:(await stat(p)).size,fileSha256:hash(await readFile(p))});
const bound=async ref=>{const p=path.join(root,ref.path);assert.equal(hash(await readFile(p)),ref.fileSha256);return read(p);};
const save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const jobPath=path.join(work,'formal-v004/render-attempt-v007/renderer-job.json');
const job=await read(jobPath);
for(const ref of job.rendererImplementationBindings)assert.equal(hash(await readFile(path.join(root,ref.path))),ref.fileSha256);
for(const ref of Object.values(job.runtimeBindings))assert.equal(hash(await readFile(ref.path)),ref.fileSha256);
const style=await bound(job.registryBindings.styleProfileRegistry);
const trust=await bound(job.registryBindings.rendererTrust);
const instruction=await bound(job.instructionArtifactBinding);
const lineLayout=await read(path.join(root,job.publication.lineLayoutPath));
const common=buildPresentationInstructionCommonCorePlanV001({job,visualStateId:job.executionInputs.visualStateId,instructionArtifact:instruction,lineLayout,styleProfileRegistry:style,rendererTrust:trust});
assert.equal(common.status,'built');assert.equal(common.plan.elements.length,343);
const drawnInput=await read(path.join(retained,'scratch/layout-input.json'));
const layout=await read(path.join(retained,'scratch/layout-output.json'));assert.equal(layout.status,'passed');
const observer=createPresentationRendererProcessObserverV001({observationDirectory:path.join(work,'font94-retained-png-reinspection-process-v001')});
const adapter=buildPresentationRendererOverlayAdapterV001({remotionPath:job.runtimeBindings.remotion.path,chromiumPath:job.runtimeBindings.chromium.path,processObserver:observer});
const records=[];
for(const [index,element] of common.plan.elements.entries()){
  assert.notEqual(element.visualState.position.preset,'top-band');
  const props=adapter.buildProps(element,common.plan,style);assert.deepEqual(props,drawnInput.overlays[index]);
  assert.equal(props.visualState.textStyle.fontSizePx,94);
  const stem=`${String(index+1).padStart(2,'0')}-${hash(element.instructionId).slice(0,12)}`;
  const pngPath=path.join(retained,'publish/overlays',stem+'.png');
  const repeatPath=path.join(retained,'scratch/frames',stem+'.repeat.png');
  const pngSha=hash(await readFile(pngPath));assert.equal(pngSha,hash(await readFile(repeatPath)));
  const lineBounds=[];
  for(const line of element.indexedLines){
    const mask=path.join(retained,'scratch/frames',`${stem}-line-${String(line.lineIndex+1).padStart(2,'0')}.png`);
    const inspected=await inspectOverlayPngWithToolV001({instructionId:element.instructionId,pngPath:mask,imageMagickPath:job.runtimeBindings.imageMagick.path,processObserver:observer,observationLabelPrefix:'retained-line'});
    assert(inspected.alphaBounds);lineBounds.push({lineIndex:line.lineIndex,...inspected.alphaBounds});
  }
  const li=layout.items.find(x=>x.instructionId===element.instructionId);assert(li);
  const inspection=await inspectOverlayPngWithToolV001({instructionId:element.instructionId,pngPath,imageMagickPath:job.runtimeBindings.imageMagick.path,processObserver:observer,observationLabelPrefix:'retained-png',lineRects:li.lineRects,lineAlphaBounds:lineBounds,appliedOverlayPropsCanonicalSha256:hash(JSON.stringify(canonical(props))),overlayFile:'overlays/'+stem+'.png',overlaySha256:pngSha});
  records.push({element,props,fileStem:stem,pngPath,pngSha256:pngSha,inspection});
  if((index+1)%50===0)console.log(JSON.stringify({inspected:index+1,total:343}));
}
const prior=await read(path.join(work,'formal-v004/render-attempt-v006/renderer-result.json'));
const media=prior.result.failure.nested.mediaEvidence;
const applicationResults=buildPresentationRenderApplicationResults(records,PRESENTATION_RENDERER_OUTPUT_NAMES);
const qc=evaluatePresentationRendererQcV002({plan:common.plan,applicationResults,overlayInspections:records.map(r=>r.inspection),mediaInspection:media.observed,expectedAudio:media.expectedAudio,canvas:common.plan.canvas,requireFinalVisibility:false});
assert.equal(qc.status,'passed');assert.equal(qc.instructionCount,343);assert.equal(qc.violations.length,0);
const files=[];
async function inventory(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert(!e.isSymbolicLink());if(e.isDirectory())await inventory(p);else files.push(await bind(p));}}
await inventory(retained);files.sort((a,b)=>a.path.localeCompare(b.path));
await save(path.join(work,'render-v007-retained-artifacts-v001.json'),{schemaVersion:'unseen-material-retained-render-artifacts-v001',workRoot:path.relative(root,retained),files});
const out={schemaVersion:'unseen-material-all-retained-font94-png-verification-v001',status:'passed',scope:'all-retained-actual-pngs-and-repeat-and-line-masks-not-final-video-qc',rendererJob:await bind(jobPath),implementation:await bind(fileURLToPath(import.meta.url)),sourceLayoutInput:await bind(path.join(retained,'scratch/layout-input.json')),retainedInventory:await bind(path.join(work,'render-v007-retained-artifacts-v001.json')),allPropsExactlyMatchCurrentJob:true,actualPngCount:343,deterministicRepeatCount:343,fontSizePx:94,mainVideoEncoded:false,finalVisibilityQc:'not-reached',qc};
await save(path.join(work,'font94-all-actual-png-verification-v001.json'),out);
console.log(JSON.stringify({status:qc.status,inspected:343,violations:qc.violations.length,retainedFiles:files.length}));

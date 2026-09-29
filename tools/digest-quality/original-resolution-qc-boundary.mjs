/** Read-only reproduction of the existing native-QC input boundary. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readCaptionPaletteDrawingEvidenceV001,createCaptionPaletteRenderScopeV001} from './caption-palette-view.mjs';
import {bindDigestStructureFileV001 as bind} from './digest-structure-evidence.mjs';
import {buildPresentationNativeQcAlternativeElementsV001} from '../../evals/clip_composition/presentation_native_frame_qc_preparation_v001.mjs';
import {exportOrchestrationDrawingViewEvidenceV001,restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
const evidenceRef=await bind(''+process.cwd()+'/runtime/artifacts/caption-palette-20260929-v001/drawing-evidence.json');
const savedBytes=await readFile(evidenceRef.path);
const view=await readCaptionPaletteDrawingEvidenceV001({evidenceRef});
const scoped=createCaptionPaletteRenderScopeV001(view,{startFrame:9708,endFrameExclusive:9918});
const attempts=[];
for(const [name,operation] of [
 ['native-alternatives',()=>buildPresentationNativeQcAlternativeElementsV001({plan:scoped.resolvedPlan,baselinePlan:scoped.normalPlan,orchestrationDrawingView:view,presentationTimeline:null,renderRange:scoped.renderRange})],
 ['native-evidence-export',()=>exportOrchestrationDrawingViewEvidenceV001(view)],
 ['native-evidence-restore',()=>restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(Buffer.from(savedBytes).toString('utf8')))],
]) {
 let rejected=false;try{operation();}catch(e){rejected=true;attempts.push({name,rejected,message:e.message});}
 assert(rejected,'boundary unexpectedly accepted the current palette/structure evidence');
}
console.log(JSON.stringify({status:'input-contract-mismatch-reproduced',evidenceRef,viewSchema:view.schemaVersion,renderRange:scoped.renderRange,captionCount:scoped.resolvedPlan.elements.length,attempts,qcExecuted:false},null,2));

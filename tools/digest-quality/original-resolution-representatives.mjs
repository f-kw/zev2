/** Finite representative selection from the saved Digest; never selects using QC outcomes. */
import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalLocalInputsV001} from './original-resolution-local.mjs';
import {editIntegrationPreviewV001,resolveIntegrationPreviewV001} from './integration-preparation.mjs';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {deriveOrchestrationBackgroundRangeV001 as backgroundRange} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const REPRESENTATIVE_LIST_PATH=path.join(root,'docs/reports/original-resolution-representatives-20260930/selection.json');
export const REPRESENTATIVE_AREA=path.join(root,'runtime/artifacts/original-resolution-representatives-20260930-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const compare=(a,b)=>(a.end-a.start)-(b.end-b.start)||a.start-b.start||(a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0);
export function selectOriginalRepresentativesV001({draft,baseManifest,resolved}){
 const p=draft.input.projection,elements=resolved.plan.elements,categories=[],chosen=[];
 const pick=(category,candidates)=>{candidates.sort(compare);if(!candidates.length){categories.push({category,status:'absent-in-saved-input'});return;}const c=candidates[0];categories.push({category,status:'selected',targetId:c.targetId});chosen.push({...c,categories:[category]});};
 for(const[color,label]of [['#FFD65A','Yellow'],['#87CEFA','LightSkyBlue']]){
  const candidates=elements.filter(e=>e.presentationColorRange?.fontColor===color).map(e=>({targetId:e.instructionId,start:e.startFrame,end:e.startFrame+e.displayFrameCount,partial:e.presentationColorRange.startCodePoint!==0||e.presentationColorRange.endCodePointExclusive!==e.indexedLines.flatMap(l=>l.codePointIndices).length}));
  pick(label,candidates.some(c=>c.partial)?candidates.filter(c=>c.partial):candidates);
 }
 for(const[kind,label]of [['provisional-pulse','Pulse'],['provisional-bounce','Bounce'],['provisional-shake','Shake']])pick(label,elements.filter(e=>e.presentationPulse?.presentation===kind||e.presentationMotion?.presentation===kind).map(e=>({targetId:e.instructionId,start:e.startFrame,end:e.startFrame+e.displayFrameCount})));
 for(const kind of [...new Set(p.connections.map(c=>c.preset))]){
  const candidates=p.connections.filter(c=>c.preset===kind).map(c=>{const inserted=p.insertedSpans.find(s=>s.connectionId===c.connectionId),after=p.retainedSpans.find(s=>s.segmentId===c.afterSegmentId);
   const proposed={startFrame:(inserted?.displayStartFrame??after.displayStartFrame)-1,endFrameExclusive:after.displayStartFrame+1};
   const recipe=backgroundRange({projection:p,range:proposed});return {targetId:c.connectionId,start:recipe.workingRange.startFrame,end:recipe.workingRange.endFrameExclusive,connection:c};});pick(kind,candidates);
 }
 chosen.sort((a,b)=>a.start-b.start);const merged=[];for(const c of chosen){const previous=merged.at(-1);if(previous&&c.start<=previous.end){previous.end=Math.max(previous.end,c.end);previous.categories.push(...c.categories);previous.targets.push(c.targetId);}else merged.push({...c,targets:[c.targetId]});}
 const intervals=merged.map((c,n)=>{const range={startFrame:c.start,endFrameExclusive:c.end,fullFrameCount:p.displayFrameCount},recipe=backgroundRange({projection:p,range:{startFrame:c.start,endFrameExclusive:c.end}}),plan=scope(resolved.plan,range),ids=new Set(plan.elements.map(e=>e.instructionId));
  assert.deepEqual(recipe.workingRange,{startFrame:c.start,endFrameExclusive:c.end});
  const sourceParts=baseManifest.segments.flatMap(s=>{const start=Math.max(recipe.sourceRange.startFrame,s.outputStartFrame),end=Math.min(recipe.sourceRange.endFrameExclusive,s.outputEndFrame);if(end<=start)return[];return [{segmentId:s.segmentId,baseStart:start,baseEnd:end,sourceStartFrame30:s.sourceStartFrame30+start-s.outputStartFrame,sourceEndFrame30:s.sourceStartFrame30+end-s.outputStartFrame,audioStartSample:s.audioSamples.sourceStart+(start-s.outputStartFrame)*1470,audioEndSample:s.audioSamples.sourceStart+(end-s.outputStartFrame)*1470}];});
  assert.equal(sourceParts.reduce((sum,s)=>sum+s.baseEnd-s.baseStart,0),recipe.sourceRange.endFrameExclusive-recipe.sourceRange.startFrame);
  return {id:'representative-'+String(n+1).padStart(2,'0'),categories:c.categories,targets:c.targets,range,frameCount:c.end-c.start,recipe,sourceParts,captions:plan.elements.map(e=>({captionId:e.instructionId,startFrame:e.startFrame,endFrameExclusive:e.startFrame+e.displayFrameCount})),states:resolved.states.filter(s=>ids.has(s.captionId)).map(s=>({captionId:s.captionId,state:s.state,elementSha256:hash(s.element)}))};});
 return {schemaVersion:'original-resolution-representative-list-v001',selectionRule:'shortest full-caption or complete-connection-effect range; then display start and ID; no QC outcome selection',inputSha256:draft.recordSha256,outlineChoice:null,outlineTechnicalInput:'A-8-4',categories,intervals,totalFrames:intervals.reduce((sum,r)=>sum+r.frameCount,0)};
}
export async function originalRepresentativeInputsV001(){const i=await originalLocalInputsV001(),selection=editIntegrationPreviewV001(i.draft,null,{outline:'A',framing:'Reset'}),resolved=resolveIntegrationPreviewV001(i.draft,selection),baseManifest=await json(i.inventory.savedInputs.find(r=>r.path.endsWith('/base-manifest.json')).path),list=selectOriginalRepresentativesV001({draft:i.draft,baseManifest,resolved});return {...i,selection,resolved,baseManifest,list};}
export async function readOriginalRepresentativeListV001(ref){assert.equal(ref.path,REPRESENTATIVE_LIST_PATH);await verify(ref);const i=await originalRepresentativeInputsV001();assert.deepEqual(await json(ref.path),i.list);return i;}
export async function representativeCodeRefsV001(){return Promise.all(['./original-resolution-representatives.mjs','./original-resolution-representative-background.mjs','../../evals/clip_composition/connection_expression_v001.mjs','../../evals/clip_composition/presentation_orchestration_background_v001.mjs','./original-resolution-representative-media.mjs','./original-resolution-representative-qc.mjs','./integrated-native-qc-input-v002.mjs','../../evals/clip_composition/presentation_native_frame_qc_preparation_integrated_v002.mjs','../../evals/clip_composition/presentation_native_frame_qc_integrated_v002.mjs'].map(async s=>bind(await realpath(fileURLToPath(new URL(s,import.meta.url))))));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'select');const i=await originalRepresentativeInputsV001();console.log(await save(REPRESENTATIVE_LIST_PATH,i.list));console.log(i.list.intervals.map(r=>({id:r.id,classes:r.categories,frames:r.frameCount,range:r.range,states:r.states.length})));}

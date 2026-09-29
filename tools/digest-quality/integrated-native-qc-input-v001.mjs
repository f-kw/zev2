/** Strict saved-source reconstruction for the explicit A native-QC execution. */
import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {originalLocalInputsV001,ORIGINAL_LOCAL_RANGE} from './original-resolution-local.mjs';
import {materializeCaptionPaletteColorV001} from './caption-palette-policy.mjs';
import {omitPresentationPanelPlateForInspectionV002} from '../../evals/clip_composition/presentation_panel_presets_v002.mjs';
import {scopeOrchestrationPlanV001} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
const data=new WeakMap(),same=assert.deepEqual,clone=structuredClone;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const exact=(o,keys)=>same(Object.keys(o).sort(),keys.sort());
const registered=v=>{assert(data.has(v),'integrated QC view must be reconstructed from bound saved files');return data.get(v);};
const code=async()=>Promise.all(['./integrated-native-qc-input-v001.mjs','./original-resolution-local.mjs','./caption-palette-view.mjs','./caption-palette-policy.mjs','../../evals/clip_composition/presentation_native_frame_qc_integrated_v001.mjs','../../evals/clip_composition/presentation_native_frame_qc_preparation_integrated_v001.mjs'].map(async s=>bind(await realpath(fileURLToPath(new URL(s,import.meta.url))))));
function normalPlan(i){const p=clone(i.palette.projectedNormalPlan);for(const e of p.elements){assert(!e.visualState.background);const s=e.visualState.textStyle;same([s.borderWidthPx,s.glowWidthPx],[4,4]);s.borderWidthPx=8;s.glowWidthPx=4;}return p;}
async function rebuild(mediaRef){await verify(mediaRef);const c=await json(mediaRef.path);same(c.schemaVersion,'original-resolution-local-v001');same(c.status,'media-verified-native-qc-pending');same(c.outlineChoice,null);same(c.nativeQc,'not-executed');
 await verify(c.inputRef);const saved=await json(c.inputRef.path),i=await originalLocalInputsV001();same(saved,{inventoryRef:i.inventoryRef,recipe:i.recipe,selection:i.selection,plan:i.plan,rows:i.rows,implementation:i.implementation,outlineChoice:null});
 for(const r of [...i.implementation,c.source,c.closed,...c.videos.map(v=>v.video),...c.rows.map(r=>r.png)])await verify(r);same(c.videos.map(v=>v.series),['normal','repeat']);same(c.videos[0].video.fileSha256,c.videos[1].video.fileSha256);
 const resolved=clone(i.draft.input.plan);resolved.elements=resolved.elements.map(e=>{const n=clone(e);if(!n.visualState.background)n.visualState.textStyle.borderWidthPx=8;return n;});same(scopeOrchestrationPlanV001(resolved,ORIGINAL_LOCAL_RANGE),i.plan);
 const body={schemaVersion:'integrated-native-qc-view-v001',outlineTechnicalInput:'A-8-4',outlineChoice:null,
  baseline:normalPlan(i),resolvedPlan:resolved,effectiveSelections:clone(i.palette.effectiveSelections),projection:clone(i.palette.projection),
  paletteEvidenceRef:i.draft.input.refs.palette,draftRef:i.inventory.captionPreparation,inventoryRef:i.inventoryRef,mediaRef,
  sourceRef:i.inventory.source,background:c.closed,completed:c.videos[0].video,pngs:c.rows.map(r=>r.png),renderRange:ORIGINAL_LOCAL_RANGE,
  sourcePaletteViewSha256:i.palette.viewSha256,selection:i.selection,humanQuality:'not-reviewed'};
 return {i,c,body};}
export async function createIntegratedNativeQcInputV001({mediaRef,baselinePath}){
 const {body}=await rebuild(mediaRef);const ref=await save(baselinePath,body.baseline);const baselineRef={...ref,canonicalSha256:hash(body.baseline)};
 const evidenceBody={schemaVersion:'integrated-native-qc-input-v001',mediaRef,baselineRef,expectedReconstructionSha256:hash(body),implementation:await code()};
 const evidence={...evidenceBody,evidenceSha256:hash(evidenceBody)};return {evidence,view:await restoreIntegratedNativeQcInputV001(evidence)};
}
export async function restoreIntegratedNativeQcInputV001(evidence){exact(evidence,['schemaVersion','mediaRef','baselineRef','expectedReconstructionSha256','implementation','evidenceSha256']);
 const {evidenceSha256,...body}=evidence;same(evidence.schemaVersion,'integrated-native-qc-input-v001');same(evidenceSha256,hash(body));same(evidence.implementation,await code());for(const r of evidence.implementation)await verify(r);
 const {body:built}=await rebuild(evidence.mediaRef);same(hash(built),evidence.expectedReconstructionSha256);await verify(evidence.baselineRef);same(await json(evidence.baselineRef.path),built.baseline);same(evidence.baselineRef.canonicalSha256,hash(built.baseline));
 const view=freeze({...built,projectedNormalPlan:built.baseline,baselineRef:clone(evidence.baselineRef),resolution:{caption:{captions:built.effectiveSelections.map(r=>({captionId:r.captionId,effectiveSelection:r.selection}))}}});data.set(view,freeze(clone(evidence)));return view;
}
export function exportIntegratedNativeQcInputV001(view){return clone(registered(view));}
export function assertIntegratedNativeScopeV001({view,plan,baselinePlan,renderRange}){registered(view);same(renderRange,view.renderRange);same(renderRange,ORIGINAL_LOCAL_RANGE);same(plan,scopeOrchestrationPlanV001(view.resolvedPlan,renderRange));same(baselinePlan,scopeOrchestrationPlanV001(view.projectedNormalPlan,renderRange));return true;}
export function integratedNativeAlternativesV001(view){registered(view);const alternatives=view.effectiveSelections.map(r=>{const normal=view.projectedNormalPlan.elements.find(e=>e.instructionId===r.captionId),selected=view.resolvedPlan.elements.find(e=>e.instructionId===r.captionId);assert(normal&&selected);const entries=[{kind:'normal',element:clone(normal)}];
 if(r.selection.role==='Focus'&&r.selection.scope==='partial-caption'){const selection={role:'Focus',presentation:'provisional-focus',scope:'whole-caption',...(Object.hasOwn(r.selection,'paletteId')?{paletteId:r.selection.paletteId}:{})};const whole=materializeCaptionPaletteColorV001({element:clone(normal),canvas:view.projectedNormalPlan.canvas,selection});same(whole.presentationColorRange.fontColor,selected.presentationColorRange.fontColor);entries.push({kind:'whole-color',element:whole});}
 if(r.selection.role==='Panel accent'){const e=clone(selected);e.visualState.background=omitPresentationPanelPlateForInspectionV002(e.visualState.background);entries.push({kind:'panel-plate-omitted',element:e});}
 return {captionId:r.captionId,entries};});return freeze({alternatives,resolution:clone(view.resolution)});}

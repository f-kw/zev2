/** A finite palette candidate reuses the verified 7B structure and 7A layout.
 * Original evidence/code is immutable; a new receipt reconstructs only colors. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {assertDigestStructureDrawingViewV001, createDigestStructureRenderScopeV001} from './digest-structure-view.mjs';
import {readDigestStructureDrawingEvidenceV001, verifyDigestStructureFileV001 as verify,
  saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {restoreCaptionPaletteStateV001} from './caption-palette-policy.mjs';
import {scopeOrchestrationPlanV001} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';

const views = new WeakSet(), sources = new WeakMap(), clone = structuredClone;
const same = (a,b,why) => assert.equal(canonicalJson(a),canonicalJson(b),why);
const freeze = value => {if(value && typeof value==='object') {Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const exact = (value,keys) => {assert(value && typeof value==='object' && !Array.isArray(value));same(Object.keys(value).sort(),keys.sort(),'unexpected record fields');};
export const CAPTION_PALETTE_VIEW_VERSION = 'caption-palette-drawing-view-v001';

export function captionPaletteSourceV001(view) {
  assertDigestStructureDrawingViewV001(view);
  return {sourceViewSha256:view.viewSha256,resolvedPlan:view.resolvedPlan,
    projectedNormalPlan:view.projectedNormalPlan,effectiveSelections:view.effectiveSelections};
}
export function createCaptionPaletteDrawingViewV001({sourceView,saved,sourceEvidenceRef,stateRef}) {
  const source=captionPaletteSourceV001(sourceView),state=restoreCaptionPaletteStateV001({source,saved});
  const {viewSha256:oldHash,...original}=clone(sourceView);
  const body={...original,schemaVersion:CAPTION_PALETTE_VIEW_VERSION,paletteSourceViewSha256:oldHash,
    paletteStateSha256:saved.stateSha256,paletteResolutionSha256:state.resolution.resolutionSha256,
    resolvedPlan:clone(state.resolution.plan),effectiveSelections:clone(state.resolution.effectiveSelections),
    colorBindings:clone(state.resolution.colorBindings),
    paletteSourceReferences:[clone(sourceEvidenceRef),clone(stateRef),...clone(sourceView.structureSourceReferences)],
    humanQuality:'not-evaluated',productionDefaultChanged:false};
  const view=freeze({...body,viewSha256:canonicalSha256(body)});views.add(view);sources.set(view,sourceView);return view;
}
export function assertCaptionPaletteDrawingViewV001(view) {
  assert(views.has(view),'palette view must be reconstructed from verified saved sources');return true;
}
export function createCaptionPaletteRenderScopeV001(view,range=null) {
  assertCaptionPaletteDrawingViewV001(view);
  const scope=createDigestStructureRenderScopeV001(sources.get(view),range);
  return {...scope,scope:{...scope.scope,viewSha256:view.viewSha256},
    resolvedPlan:scopeOrchestrationPlanV001(view.resolvedPlan,scope.renderRange)};
}
export async function saveCaptionPaletteDrawingEvidenceV001({sourceEvidenceRef,saved,outputStatePath,outputEvidencePath}) {
  // Refuse a stale/forged source or state before creating any new saved artifact.
  const sourceView=await readDigestStructureDrawingEvidenceV001({evidenceRef:sourceEvidenceRef});
  restoreCaptionPaletteStateV001({source:captionPaletteSourceV001(sourceView),saved});
  const stateRef=await save(outputStatePath,saved);
  const view=createCaptionPaletteDrawingViewV001({sourceView,saved,sourceEvidenceRef,stateRef});
  const body={schemaVersion:'caption-palette-drawing-evidence-v001',sourceEvidenceRef,stateRef,
    expectedViewSha256:view.viewSha256,expectedSourceViewSha256:sourceView.viewSha256};
  const evidenceRef=await save(outputEvidencePath,{...body,evidenceSha256:canonicalSha256(body)});
  return {evidenceRef,stateRef,view};
}
export async function readCaptionPaletteDrawingEvidenceV001({evidenceRef}) {
  await verify(evidenceRef);const e=JSON.parse(await readFile(evidenceRef.path,'utf8'));
  exact(e,['schemaVersion','sourceEvidenceRef','stateRef','expectedViewSha256','expectedSourceViewSha256','evidenceSha256']);
  const {evidenceSha256,...body}=e;
  assert.equal(e.schemaVersion,'caption-palette-drawing-evidence-v001');
  assert.equal(canonicalSha256(body),evidenceSha256,'palette receipt changed');
  const sourceView=await readDigestStructureDrawingEvidenceV001({evidenceRef:e.sourceEvidenceRef});
  assert.equal(sourceView.viewSha256,e.expectedSourceViewSha256,'palette source view differs');
  await verify(e.stateRef);const saved=JSON.parse(await readFile(e.stateRef.path,'utf8'));
  const view=createCaptionPaletteDrawingViewV001({sourceView,saved,sourceEvidenceRef:e.sourceEvidenceRef,stateRef:e.stateRef});
  assert.equal(view.viewSha256,e.expectedViewSha256,'palette reconstructed view differs');
  await verify(evidenceRef);return view;
}

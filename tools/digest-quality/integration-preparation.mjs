/** Fixed 7A/7B/palette/framing integration preparation, not a render job or adoption. */
import assert from 'node:assert/strict';
import {mkdir, readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind, verifyDigestStructureFileV001 as verify,
  saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {readCaptionPaletteDrawingEvidenceV001 as readPalette,
  createCaptionPaletteRenderScopeV001 as scopeFor} from './caption-palette-view.mjs';
import {validateReactionCloseUpCandidateV001 as validateReaction,
  editReactionCloseUpV001 as editReaction, resolveReactionCloseUpV001 as resolveReaction,
  reactionCloseUpFilterV001 as reactionFilter} from './reaction-close-up-policy.mjs';
import {readReactionProofV001} from './reaction-close-up-proof.mjs';
import {buildPresentationCaptionMotionStateElementsV001 as motionStates} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {buildPresentationPulseStateElementsV001 as pulseStates} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {buildPresentationDevProxyRangeRecipeV001 as rangeRecipe} from '../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = path.join(root, 'runtime/artifacts');
const area = path.join(artifacts, 'integration-preparation-20260930-v001');
const clone = structuredClone, same = assert.deepEqual;
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const seal = body => ({...body, recordSha256: hash(body)});
function check(record) {const {recordSha256, ...body} = record; assert.equal(recordSha256, hash(body), 'preparation record changed'); return body;}
const files = {
  palette: 'caption-palette-20260929-v001/drawing-evidence.json',
  paletteJob: 'caption-palette-20260929-v001/job.json',
  structure: 'digest-structure-20260929-v001/candidate/completion.json',
  reaction: 'reaction-close-up-20260929-v001/proof-v002/completion.json',
  outlines: 'caption-outline-comparison-20260929-v001/attempt-003/verification.json',
};

/** Selection stays null. A/B resolution below is a technical preview only. */
export function createIntegrationDraftV001(input) {
  validateReaction(input.reaction);
  assert.equal(input.reaction.sourceViewSha256, input.viewSha256);
  assert.equal(input.reaction.sourceMediaSha256, input.background.fileSha256);
  assert.equal(input.plan.elements.length, 265);
  assert.equal(input.frameCount, 17613);
  assert.equal(input.reaction.interval.endFrameExclusive - input.reaction.interval.startFrame, 82);
  same(input.variants.map(({id, borderWidthPx, glowWidthPx}) => ({id, borderWidthPx, glowWidthPx})),
    [{id:'A', borderWidthPx:8, glowWidthPx:4}, {id:'B', borderWidthPx:8, glowWidthPx:12}]);
  const target = input.plan.elements.filter(e => e.instructionId.endsWith('000119'));
  assert.equal(target.length, 1);
  assert.equal(target[0].startFrame, input.reaction.interval.startFrame);
  assert.equal(target[0].endFrameExclusive, input.reaction.interval.endFrameExclusive);
  return seal({schemaVersion:'digest-integration-preparation-v001', status:'prepared-outline-choice-pending',
    input:clone(input), outlineChoice:null,
    reactionOverride:editReaction(input.reaction, null, 'Reset'),
    humanReview:{fontSize:'positive-local-review', splitting:'positive-for-text-not-requiring-deliberate-reading',
      outline:'unanswered', fullVideo:'not-reviewed'},
    productionDefaultChanged:false, finalRenderExecuted:false});
}
export function validateIntegrationDraftV001(draft) {
  check(draft); same(draft, createIntegrationDraftV001(draft.input)); return draft;
}
export function editIntegrationPreviewV001(draft, saved, {outline, framing}) {
  validateIntegrationDraftV001(draft);
  if (saved) resolveIntegrationPreviewV001(draft, saved);
  assert([null,'A','B','Reset'].includes(outline), 'unknown outline option');
  assert(['reaction-close-up','Normal','off','Reset'].includes(framing));
  return seal({schemaVersion:'digest-integration-preview-v001', draftSha256:draft.recordSha256,
    outlinePreview:outline==='Reset'?null:outline,
    reactionOverride:editReaction(draft.input.reaction, saved?.reactionOverride ?? draft.reactionOverride, framing),
    purpose:'technical-preview-not-human-selection'});
}
function applyOutline(element, variant) {
  const e = clone(element);
  if (!variant || e.visualState.background) return e; // Panel retains its own border semantics.
  const style = e.visualState.textStyle;
  assert.equal(style.borderWidthPx, 4); assert.equal(style.glowWidthPx, 4);
  assert.equal(style.borderColor, '#2F4F4F'); assert.equal(style.glowColor, '#2F4F4F');
  assert.equal(style.glowOpacityPercent, 82);
  style.borderWidthPx = variant.borderWidthPx; style.glowWidthPx = variant.glowWidthPx;
  const restored = clone(e);
  Object.assign(restored.visualState.textStyle, {borderWidthPx:4, glowWidthPx:4});
  same(restored, element, 'outline resolution changed content, timing, color or motion');
  return e;
}
export function resolveIntegrationPreviewV001(draft, saved) {
  validateIntegrationDraftV001(draft); check(saved);
  same(Object.keys(saved).sort(), ['schemaVersion','draftSha256','outlinePreview','reactionOverride','purpose','recordSha256'].sort());
  assert.equal(saved.schemaVersion, 'digest-integration-preview-v001');
  assert.equal(saved.purpose, 'technical-preview-not-human-selection');
  assert.equal(saved.draftSha256, draft.recordSha256, 'preview belongs to different saved inputs');
  assert([null,'A','B'].includes(saved.outlinePreview));
  const input = draft.input, variant = input.variants.find(v => v.id === saved.outlinePreview);
  const plan = {...clone(input.plan), elements:input.plan.elements.map(e => applyOutline(e, variant))};
  const states = plan.elements.flatMap(element => {
    assert(!(element.presentationMotion && element.presentationPulse));
    const rows = element.presentationMotion ? motionStates({element, canvas:plan.canvas})
      : element.presentationPulse ? pulseStates({element, canvas:plan.canvas}) : [{state:'static',element}];
    return rows.map(row => ({captionId:element.instructionId, ...row}));
  });
  const framing = resolveReaction(input.reaction, saved.reactionOverride);
  return {plan, states, framing, outlinePreview:saved.outlinePreview,
    backgroundAssembly:{source:input.background, frameCount:input.frameCount,
      parts:clone(input.backgroundParts), localFilter:reactionFilter(input.reaction, saved.reactionOverride),
      layerOrder:['saved-background','fixed-local-framing','caption-overlays'], audio:'unchanged-saved-full-audio'},
    humanOutlineSelected:false, finalRenderExecuted:false};
}

async function loadInputs(refs) {
  for (const ref of Object.values(refs)) await verify(ref);
  const view = await readPalette({evidenceRef:refs.palette}), job = await json(refs.paletteJob.path);
  same(job.evidenceRef, refs.palette);
  const structure = await json(refs.structure.path), proof = await json(refs.reaction.path);
  same(proof.evidenceRef, refs.palette); same(proof.priorRef, refs.structure);
  // Use the existing independent verifier, including media, clocks, PNGs, tools and Reset.
  const proofRead = await readReactionProofV001(refs.reaction);
  const reaction = await json(proof.candidateRef.path), outline = await json(refs.outlines.path);
  assert.equal(outline.status, 'comparison-ready-human-choice-pending'); assert.equal(outline.adoptedVariant, null);
  for (const ref of [...outline.inputs, ...outline.implementation, outline.video]) await verify(ref);
  for (const row of outline.raster) await verify(row.png);
  await verify(structure.outputVideo); await verify(job.baseProxyManifestRef); await verify(job.backgroundProofRef);
  await verify(structure.localMedia.audio);
  const manifest = await json(job.baseProxyManifestRef.path);
  const full = scopeFor(view), ranges = [
    {startFrame:0,endFrameExclusive:reaction.window.startFrame}, reaction.window,
    {startFrame:reaction.window.endFrameExclusive,endFrameExclusive:view.projection.displayFrameCount}];
  const backgroundParts = ranges.map((range, i) => ({role:i===1?'verified-local-framing':'normal-context',
    recipe:rangeRecipe({sourceClock:manifest.sourceClock, scope:scopeFor(view, range).scope})}));
  assert.equal(backgroundParts.reduce((n,p) => n+p.recipe.frameCount, 0), full.scope.frameCount);
  same(backgroundParts[1].recipe, proof.recipe);
  assert.equal(structure.stateRecords.length, 307);
  const own = ['integration-preparation.mjs','reaction-close-up-policy.mjs','reaction-close-up-proof.mjs',
    'caption-palette-view.mjs','caption-palette-policy.mjs','digest-structure-view.mjs','digest-structure-evidence.mjs'];
  const implementation = await Promise.all([...own.map(p=>path.join(root,'tools/digest-quality',p)),process.execPath]
    .map(async p=>bind(await realpath(p))));
  const protectedFiles = [structure.outputVideo, structure.localMedia.audio, proof.source,
    ...proof.rows.map(r=>r.video), ...outline.raster.map(r=>r.png), outline.video];
  const input = {viewSha256:view.viewSha256, projection:clone(view.projection), plan:clone(full.resolvedPlan),
    frameCount:full.scope.frameCount, background:proof.source, audio:structure.localMedia.audio,
    reaction, variants:outline.variants.map(({id,borderWidthPx,glowWidthPx})=>({id,borderWidthPx,glowWidthPx})),
    colorBindings:clone(view.colorBindings), backgroundParts, refs:clone(refs), implementation};
  return {input, proofRead, protectedFiles};
}
function checkPreviews(draft) {
  const original = editIntegrationPreviewV001(draft, null, {outline:null,framing:'Reset'});
  const initial = resolveIntegrationPreviewV001(draft, original);
  const rows = [['A','reaction-close-up'],['B','reaction-close-up'],['B','Normal'],['Reset','Reset']];
  let state=original; const results=[];
  for (const [outline,framing] of rows) {
    state=editIntegrationPreviewV001(draft,state,{outline,framing});
    const resolved=resolveIntegrationPreviewV001(draft,state);
    assert.equal(resolved.states.length,307);
    // Each finite state can only acquire the two preview outline widths.
    resolved.states.forEach((s,i)=>same(s.element,applyOutline(initial.states[i].element,
      draft.input.variants.find(v=>v.id===resolved.outlinePreview))));
    results.push({action:{outline,framing},saved:state,planSha256:hash(resolved.plan),
      stateSha256:hash(resolved.states),assemblySha256:hash(resolved.backgroundAssembly),
      captionCount:resolved.plan.elements.length,stateCount:resolved.states.length});
  }
  same(state,original); same(resolveIntegrationPreviewV001(draft,state),initial);
  return {initial:original,results,resetRestoresUnselectedOriginal:true};
}
export async function prepareIntegrationV001(destination) {
  assert(path.resolve(destination).startsWith(area+path.sep), 'new preparation directory required');
  await mkdir(destination, {recursive:false}); const start=performance.now();
  const refs=Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k,v])=>[k,await bind(path.join(artifacts,v))])));
  const {input,proofRead,protectedFiles}=await loadInputs(refs),draft=createIntegrationDraftV001(input),checks=checkPreviews(draft);
  const draftRef=await save(path.join(destination,'draft.json'),draft);
  const previewsRef=await save(path.join(destination,'previews.json'),checks);
  for(const ref of [...protectedFiles,...input.implementation])await verify(ref);
  const completion=seal({schemaVersion:'digest-integration-preparation-receipt-v001',status:'prepared-not-rendered',
    draftRef,previewsRef,refs,protectedFiles,proofRead,seconds:(performance.now()-start)/1000,
    implementation:input.implementation,finalRenderExecuted:false});
  return save(path.join(destination,'completion.json'),completion);
}
export async function readIntegrationPreparationV001(completionRef) {
  await verify(completionRef); const c=await json(completionRef.path); check(c);
  assert.equal(c.schemaVersion,'digest-integration-preparation-receipt-v001');
  assert.equal(c.status,'prepared-not-rendered'); assert.equal(c.finalRenderExecuted,false);
  for(const ref of [c.draftRef,c.previewsRef,...c.implementation,...c.protectedFiles])await verify(ref);
  const {input,proofRead,protectedFiles}=await loadInputs(c.refs);
  same(input.implementation,c.implementation); same(protectedFiles,c.protectedFiles); same(proofRead,c.proofRead);
  const draft=await json(c.draftRef.path); same(draft,createIntegrationDraftV001(input));
  same(await json(c.previewsRef.path),checkPreviews(draft)); await verify(completionRef);
  return {status:'passed',captionCount:265,stateCount:307,frameCount:17613,
    paletteTargets:input.colorBindings.length,framingFrames:82,outlineChoice:null,
    resetRestoresUnselectedOriginal:true,finalRenderExecuted:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,target]=process.argv.slice(2); assert(target);
  const start=performance.now();
  const result=command==='prepare'?await prepareIntegrationV001(path.resolve(target))
    :command==='read'?await readIntegrationPreparationV001(await bind(path.resolve(target))):assert.fail('prepare | read');
  console.log(JSON.stringify({result,seconds:(performance.now()-start)/1000,parentMaxRssBytes:process.resourceUsage().maxRSS*1024},null,2));
}

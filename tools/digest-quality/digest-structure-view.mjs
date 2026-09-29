/** A structure candidate changes segment membership and integer clocks only.
 * The saved 7A drawing evidence remains the authority for retained captions. */
import assert from 'node:assert/strict';
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {assertOrchestrationDrawingViewV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {createOrchestrationProjectionV001, projectCaptionPlanV001}
  from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {scopeOrchestrationPlanV001} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';

const clone = structuredClone, views = new WeakSet();
const same = (a,b,label) => assert.equal(canonicalJson(a), canonicalJson(b), label);
const freeze = v => {if(v && typeof v === 'object') {Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const DIGEST_STRUCTURE_VIEW_VERSION = 'digest-structure-drawing-view-v001';

export function shiftDigestStructureCaptionV001(element, frames) {
  assert(Number.isSafeInteger(frames));
  const e = clone(element);
  e.startFrame += frames; e.endFrameExclusive += frames;
  assert(e.startFrame >= 0 && e.endFrameExclusive > e.startFrame);
  if(e.presentationPulse) e.presentationPulse.anchorFrame += frames;
  if(e.presentationMotion?.speechEndFrame !== undefined) e.presentationMotion.speechEndFrame += frames;
  return e;
}

/** New captions are already resolved by the existing 7A general width rule on
 * the unprojected new base clock. Retained captions never re-enter segmentation. */
export function buildDigestStructureCaptionPlansV001({sourceView, timeline, newCaptions, structureResolution}) {
  assertOrchestrationDrawingViewV001(sourceView);
  assert.equal(sourceView.candidateExecution?.version, 'candidate-readability-v001');
  same(newCaptions.normalPlan,newCaptions.resolvedPlan,'new normal/resolved caption coverage differs');
  const originalSegments = new Map(sourceView.projection.retainedSpans.map(s=>[s.segmentId,s]));
  same(timeline.segments,structureResolution.baseMappings.map(({audioSamples,...row})=>row),
    'timeline differs from source-validated structure mapping');
  const normal = [], resolved = [], preserved = [];
  const newIds = new Set();
  assert.equal(timeline.segments.length,structureResolution.selectedSegments.length);
  for(const [segmentIndex,segment] of timeline.segments.entries()) {
    const identity=structureResolution.selectedSegments[segmentIndex];
    const old=originalSegments.get(identity.segmentId);
    if(old) {
      assert.equal(segment.outputEndFrame-segment.outputStartFrame,
        old.displayEndFrameExclusive-old.displayStartFrame, 'main internal duration changed');
      const shift = segment.outputStartFrame-old.displayStartFrame;
      const children = sourceView.resolvedPlan.elements.filter(e=>e.timelineSegmentId===identity.segmentId);
      assert(children.length>0, 'retained segment has no source captions');
      for(const child of children) {
        assert(child.sourceStartMs>=segment.sourceStartMs && child.sourceEndMs<=segment.sourceEndMs,
          'retained source caption escaped its unchanged main');
        const n=sourceView.projectedNormalPlan.elements.find(e=>e.instructionId===child.instructionId);
        assert(n); normal.push({...shiftDigestStructureCaptionV001(n,shift),timelineSegmentId:segment.segmentId});
        resolved.push({...shiftDigestStructureCaptionV001(child,shift),timelineSegmentId:segment.segmentId});
        preserved.push({captionId:child.instructionId,originalSegmentId:identity.segmentId,segmentId:segment.segmentId,shiftFrames:shift,
          originalCanonicalSha256:canonicalSha256(child)});
      }
    } else {
      const normals=newCaptions.normalPlan.elements.filter(e=>e.timelineSegmentId===segment.segmentId);
      const selected=newCaptions.resolvedPlan.elements.filter(e=>e.timelineSegmentId===segment.segmentId);
      assert(normals.length>0 && normals.length===selected.length, 'new segment captions missing');
      same(normals, selected, 'new intro/closure uses ordinary captions');
      for(const e of normals) {assert(e.startFrame>=segment.outputStartFrame && e.endFrameExclusive<=segment.outputEndFrame);
        assert(!newIds.has(e.instructionId));newIds.add(e.instructionId);}
      normal.push(...clone(normals));resolved.push(...clone(selected));
    }
  }
  same([...newIds],newCaptions.normalPlan.elements.map(e=>e.instructionId), 'new caption coverage differs');
  assert.equal(new Set(resolved.map(e=>e.instructionId)).size,resolved.length);
  for(let i=1;i<resolved.length;i++) assert(resolved[i].startFrame>=resolved[i-1].endFrameExclusive,'caption overlap/order');
  const base = {...clone(sourceView.projectedNormalPlan),schemaVersion:'presentation-output-common-core-plan-v001'};
  return {normalPlan:{...base,elements:normal},resolvedPlan:{...clone(base),elements:resolved},preserved};
}

/** Reuses a saved connection only for the same adjacent source pair. New
 * intro/closure boundaries use the existing normal cut, without new effects. */
export function digestStructureConnectionsV001({sourceView,timeline,structureResolution}) {
  return timeline.segments.slice(0,-1).map((s,i)=> {
    const after=timeline.segments[i+1];
    const old=sourceView.projection.connections.find(c=>c.beforeSegmentId===structureResolution.selectedSegments[i].segmentId && c.afterSegmentId===structureResolution.selectedSegments[i+1].segmentId);
    return {connectionId:'connection-'+String(i+1).padStart(2,'0'),preset:old?.preset??'normal-cut',presetVersion:'v001'};
  });
}

export function createDigestStructureDrawingViewV001({sourceView,timeline,newCaptions,sourcePlans,structureResolution,
  projectionInput,structureStateSha256,sourceReferences}) {
  const expected=buildDigestStructureCaptionPlansV001({sourceView,timeline,newCaptions,structureResolution});
  same(sourcePlans,expected,'saved source composition plan differs');
  same(JSON.parse(projectionInput.planBytes),expected.normalPlan,'bound caption plan differs');
  same(JSON.parse(projectionInput.timelineBytes),timeline,'bound timeline differs');
  same(projectionInput.connections,digestStructureConnectionsV001({sourceView,timeline,structureResolution}),'connection selection differs');
  const projection=createOrchestrationProjectionV001(projectionInput);
  const projected=projectCaptionPlanV001({projection,planBytes:projectionInput.planBytes});
  const elements=expected.resolvedPlan.elements.map(e=> {
    const timing=projected.captionTimings.find(t=>t.source.captionId===e.instructionId);assert(timing);
    return shiftDigestStructureCaptionV001(e,timing.startFrame-e.startFrame);
  });
  const kept=new Set(expected.preserved.map(r=>r.captionId));
  const selections=new Map([...sourceView.effectiveSelections.filter(s=>kept.has(s.captionId)).map(s=>[s.captionId,clone(s)]),
    ...newCaptions.normalPlan.elements.map(e=>[e.instructionId,{captionId:e.instructionId,
      selection:{role:'Normal'},origin:'new-source-intro-closure',hasOverride:false}])]);
  const body={schemaVersion:DIGEST_STRUCTURE_VIEW_VERSION,
    candidateExecution:clone(sourceView.candidateExecution),
    sourceViewSha256:sourceView.viewSha256,structureStateSha256,
    fourSavedSha256:clone(sourceView.fourSavedSha256),projection,
    sourceRefs:clone(sourceView.sourceRefs),structureSourceReferences:clone(sourceReferences),
    projectedNormalPlan:clone(projected.plan),resolvedPlan:{...clone(projected.plan),elements},
    captionTimings:clone(projected.captionTimings),preserved:clone(expected.preserved),
    effectiveSelections:elements.map(e=>{const row=selections.get(e.instructionId);assert(row);return row;}),
    humanQuality:'not-evaluated',productionDefaultChanged:false};
  const view=freeze({...body,viewSha256:canonicalSha256(body)});views.add(view);return view;
}
export function assertDigestStructureDrawingViewV001(view) {
  assert(views.has(view),'structure view must be rederived from saved sources');return true;
}
export function createDigestStructureRenderScopeV001(view,range=null) {
  assertDigestStructureDrawingViewV001(view);
  const fullFrameCount=view.projection.displayFrameCount;
  const actual=range??{startFrame:0,endFrameExclusive:fullFrameCount};
  same(Object.keys(actual).sort(),['endFrameExclusive','startFrame']);
  assert(Number.isSafeInteger(actual.startFrame)&&actual.startFrame>=0
    &&Number.isSafeInteger(actual.endFrameExclusive)&&actual.endFrameExclusive>actual.startFrame
    &&actual.endFrameExclusive<=fullFrameCount);
  const renderRange=range===null?null:{...actual,fullFrameCount};
  const perFrame=view.projection.sourceClock.playbackSampleRate/30;assert(Number.isSafeInteger(perFrame));
  const scope={kind:range===null?'full':'range',...actual,fullFrameCount,
    frameCount:actual.endFrameExclusive-actual.startFrame,viewSha256:view.viewSha256,
    projectionSha256:view.projection.projectionSha256,fourSavedSha256:view.fourSavedSha256,
    playbackStartSample:actual.startFrame*perFrame,playbackEndSampleExclusive:actual.endFrameExclusive*perFrame};
  return {scope,renderRange,normalPlan:scopeOrchestrationPlanV001(view.projectedNormalPlan,renderRange),
    resolvedPlan:scopeOrchestrationPlanV001(view.resolvedPlan,renderRange)};
}

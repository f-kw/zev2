/** Immutable inputs and independent reconstruction for a finite 7B candidate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalSha256} from './clock.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {restoreDigestStructureStateV001} from './digest-structure-policy.mjs';
import {createDigestStructureDrawingViewV001,digestStructureConnectionsV001} from './digest-structure-view.mjs';
import {buildReadabilityCandidateRegistryV001} from './caption-readability-candidate.mjs';
import {fileURLToPath} from 'node:url';

export async function bindDigestStructureFileV001(file) {
  assert(path.isAbsolute(file));const before=await lstat(file);assert(before.isFile()&&!before.isSymbolicLink());
  const sha=createHash('sha256');for await(const chunk of createReadStream(file))sha.update(chunk);
  const after=await lstat(file);for(const key of ['ino','size','mtimeMs'])assert.equal(after[key],before[key]);
  return {path:file,bytes:after.size,fileSha256:sha.digest('hex')};
}
export async function verifyDigestStructureFileV001(ref) {
  const actual=await bindDigestStructureFileV001(ref.path);
  assert.equal(actual.fileSha256,ref.fileSha256,'source artifact changed: '+ref.path);
  if(ref.bytes!==undefined)assert.equal(actual.bytes,ref.bytes);return actual;
}
export async function saveDigestStructureFileV001(file,value) {
  await writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return bindDigestStructureFileV001(file);
}
const json=async ref=>{await verifyDigestStructureFileV001(ref);return JSON.parse(await readFile(ref.path,'utf8'));};
const plainRef=({path,fileSha256})=>({path,fileSha256});

export async function readDigestStructureDrawingEvidenceV001({evidenceRef}) {
  const e=await json(evidenceRef),{evidenceSha256,...body}=e;
  assert.equal(e.schemaVersion,'digest-structure-drawing-evidence-v001');
  assert.equal(canonicalSha256(body),evidenceSha256,'structure evidence content changed');
  const saved=await json(e.structureStateRef);
  const transcriptBytes=await readFile(saved.autoPlan.transcriptRef.path);
  const priorEditPlanBytes=await readFile(saved.autoPlan.priorEditPlanRef.path);
  const state=restoreDigestStructureStateV001({saved,transcriptBytes,priorEditPlanBytes});
  await verifyDigestStructureFileV001(saved.autoPlan.sourceRef);
  const sourceView=restoreOrchestrationDrawingViewEvidenceV001(await json(e.sourceDrawingEvidenceRef));
  const timeline=await json(e.timelineRef),sourcePlans=await json(e.sourcePlansRef);
  const planBytes=await readFile(e.planRef.path,'utf8'),timelineBytes=await readFile(e.timelineRef.path,'utf8');
  await verifyDigestStructureFileV001(e.planRef);await verifyDigestStructureFileV001(e.baseMediaRef);
  const semanticDecisions=await json(e.semanticDecisionsRef);
  const newCaptions=await readNewCaptions(e.newCaptionPackageRef,await digestStructureNewCaptionInputV001({
    transcript:JSON.parse(transcriptBytes),timeline,sourceView,resolution:state.resolution,semanticDecisions}));
  const projectionInput={digestRef:{version:'digest-structure-v001',sha256:state.resolution.resolutionSha256},
    planRef:plainRef(e.planRef),timelineRef:plainRef(e.timelineRef),mediaRef:plainRef(e.baseMediaRef),
    planBytes,timelineBytes,playbackSampleRate:state.autoPlan.audioClock.sampleRate,observationSampleRate:16000,
    connections:digestStructureConnectionsV001({sourceView,timeline,structureResolution:state.resolution})};
  const references=[e.structureStateRef,e.sourceDrawingEvidenceRef,e.timelineRef,e.sourcePlansRef,e.planRef,
    e.baseMediaRef,e.newCaptionPackageRef,e.semanticDecisionsRef,state.autoPlan.sourceRef,state.autoPlan.transcriptRef,state.autoPlan.priorEditPlanRef];
  const view=createDigestStructureDrawingViewV001({sourceView,timeline,newCaptions,sourcePlans,projectionInput,
    structureResolution:state.resolution,structureStateSha256:saved.stateSha256,sourceReferences:references});
  assert.equal(view.viewSha256,e.expectedViewSha256,'structure reconstructed view differs');
  return view;
}

export async function digestStructureNewCaptionInputV001({transcript,timeline,sourceView,resolution,semanticDecisions}) {
  const registryPath=fileURLToPath(new URL('../../evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json',import.meta.url));
  const registry=buildReadabilityCandidateRegistryV001({registry:JSON.parse(await readFile(registryPath,'utf8')),version:'candidate-readability-v001'});
  const segments=resolution.selectedSegments.flatMap((s,i)=>['intro','closure'].includes(s.role)?[{
    role:s.role,segmentId:timeline.segments[i].segmentId,startSourceSegmentId:s.sourceSegmentIds[0],
    endSourceSegmentId:s.sourceSegmentIds.at(-1),sourceStartMs:s.sourceStartMs,sourceEndMs:s.sourceEndMs}]:[]);
  return {transcript,segments,baseTimeline:timeline,projection:null,normalTemplate:{
    canvas:sourceView.projectedNormalPlan.canvas,layoutRules:sourceView.projectedNormalPlan.layoutRules,
    element:sourceView.projectedNormalPlan.elements[0]},registry,semanticDecisions};
}
async function readNewCaptions(ref,input) {
  const {readDigestStructureNewCaptionsV001}=await import('./digest-structure-new-captions.mjs');
  return readDigestStructureNewCaptionsV001({input,savedRef:ref});
}

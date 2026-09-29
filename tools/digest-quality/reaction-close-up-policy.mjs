/** One explicit local framing candidate, never a detector or production default. */
import assert from 'node:assert/strict';
import {canonicalSha256} from './clock.mjs';
const clone=structuredClone;
const exact=(v,keys)=>{assert(v&&typeof v==='object'&&!Array.isArray(v));assert.deepEqual(Object.keys(v).sort(),keys.slice().sort());};
const digest=v=>canonicalSha256(v);
const seal=v=>({...clone(v),recordSha256:digest(v)});
const check=v=>{const {recordSha256,...body}=v;assert.equal(recordSha256,digest(body));return body;};
const range=r=>{exact(r,['startFrame','endFrameExclusive']);assert(Number.isSafeInteger(r.startFrame)&&r.startFrame>=0&&Number.isSafeInteger(r.endFrameExclusive)&&r.endFrameExclusive>r.startFrame);};
export function createReactionCloseUpCandidateV001({sourceViewSha256,sourceMediaSha256,mainRange,window,interval,reason}){
 assert([sourceViewSha256,sourceMediaSha256].every(s=>/^[a-f0-9]{64}$/.test(s)));assert(typeof reason==='string'&&reason.trim());
 for(const r of [mainRange,window,interval])range(r);
 assert(mainRange.startFrame<=window.startFrame&&window.endFrameExclusive<=mainRange.endFrameExclusive,'proof must stay inside one saved main segment');
 assert(window.startFrame<interval.startFrame&&interval.endFrameExclusive<window.endFrameExclusive,'normal context required on both sides');
 // Latest instruction explicitly authorizes one selected 1.15–1.25 enlargement.
 // The 1.2 choice preserves right/bottom edges; viewport convention follows the
 // existing screen-layout module: normalized [left, top, right, bottom].
 return seal({schemaVersion:'reaction-close-up-candidate-v001',sourceViewSha256,sourceMediaSha256,mainRange,window,interval,reason,
  state:'reaction-close-up',viewport:[1/6,1/6,1,1],pixelCrop:{left:160,top:90,width:800,height:450},
  canvas:{width:960,height:540,fps:30},scale:{numerator:6,denominator:5},transition:'instant',
  origin:'explicit-local-fixed-framing-proof',humanQuality:'not-evaluated',productionDefaultChanged:false});
}
export function validateReactionCloseUpCandidateV001(candidate){
 check(candidate);const {sourceViewSha256,sourceMediaSha256,mainRange,window,interval,reason}=candidate;
 assert.deepEqual(candidate,createReactionCloseUpCandidateV001({sourceViewSha256,sourceMediaSha256,mainRange,window,interval,reason}));return candidate;
}
export function editReactionCloseUpV001(candidate,saved,action){
 validateReactionCloseUpCandidateV001(candidate);
 if(saved)resolveReactionCloseUpV001(candidate,saved);
 assert(['reaction-close-up','Normal','off','Reset'].includes(action),'unknown finite framing operation');
 return seal({schemaVersion:'reaction-close-up-override-v001',candidateSha256:candidate.recordSha256,
  selection:action==='Reset'?null:(['Normal','off'].includes(action)?'normal-framing':'reaction-close-up')});
}
export function resolveReactionCloseUpV001(candidate,saved){
 validateReactionCloseUpCandidateV001(candidate);exact(saved,['schemaVersion','candidateSha256','selection','recordSha256']);check(saved);
 assert.equal(saved.schemaVersion,'reaction-close-up-override-v001');assert.equal(saved.candidateSha256,candidate.recordSha256);
 assert([null,'normal-framing','reaction-close-up'].includes(saved.selection));
 return {state:saved.selection??candidate.state,viewport:saved.selection==='normal-framing'?[0,0,1,1]:clone(candidate.viewport),
  window:clone(candidate.window),interval:clone(candidate.interval),candidateSha256:candidate.recordSha256};
}
export function reactionCloseUpFilterV001(candidate,saved){
 const resolved=resolveReactionCloseUpV001(candidate,saved);if(resolved.state==='normal-framing')return '[0:v]null[v]';
 const a=candidate.interval.startFrame-candidate.window.startFrame,b=candidate.interval.endFrameExclusive-candidate.window.startFrame;
 const count=candidate.window.endFrameExclusive-candidate.window.startFrame;
 return `[0:v]split=3[a][b][c];[a]trim=start_frame=0:end_frame=${a},setpts=PTS-STARTPTS[pre];`+
  `[b]trim=start_frame=${a}:end_frame=${b},setpts=PTS-STARTPTS,crop=800:450:160:90:exact=1,scale=960:540:flags=lanczos,setsar=1[close];`+
  `[c]trim=start_frame=${b}:end_frame=${count},setpts=PTS-STARTPTS[post];[pre][close][post]concat=n=3:v=1:a=0[v]`;
}

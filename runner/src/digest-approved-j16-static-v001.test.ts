/** Synthetic contract fixtures only; no network, hardware activation or real manufacture. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateApprovedJ16StaticInputV001,projectApprovedJ16BoundCoreStyleV001} from './digest-approved-inputs-v001.js';
import {DIGEST_APPROVED_JOB_GUARD_V001,validateDigestApprovedJobConfigurationV001} from './digest-approved-job-v001.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=async(p:string)=>import(pathToFileURL(root+'/'+p).href);
const orchestration=await load('evals/clip_composition/presentation_orchestration_v001.mjs');
const stage=await load('evals/clip_composition/presentation_j16_staged_boundary_v001.mjs');
const {fixture}=await load('evals/clip_composition/presentation_orchestration_v001.test.mjs');
const {canonicalJson}=await load('evals/clip_composition/presentation_caption_contract_v002.mjs');
const hash=(v:string)=>createHash('sha256').update(v).digest('hex'),canonical=(v:unknown)=>hash(canonicalJson(v));
const text=(v:unknown)=>JSON.stringify(v)+'\n';
function staticFixture(ids:string[],font=87) {
  const f=fixture({ids}),source=structuredClone(f.source),plan=structuredClone(f.plan);
  for(const [i,row] of plan.elements.entries()) {
    row.text='試験専用の異なる文章 '+i;row.indexedLines=[{lineIndex:0,text:row.text}];
    row.targetProvenance={sourceAtomIds:['synthetic-atom-'+i]};
    row.visualState.textStyle={...row.visualState.textStyle,fontSizePx:font,borderWidthPx:5,glowWidthPx:7};
    if(i===1){row.endFrameExclusive=row.startFrame+6;row.displayFrameCount=6;}
  }
  source.planBytes=text(plan);source.planRef.fileSha256=hash(source.planBytes);
  source.captionContext.baselineRef={...source.planRef,canonicalSha256:canonical(plan)};
  const timeline=JSON.parse(source.timelineBytes);timeline.baseMedia.expectedFrameCount=ids.length*120;
  source.timelineBytes=text(timeline);source.timelineRef.fileSha256=hash(source.timelineBytes);
  const evidence=structuredClone(f.evidence);
  evidence.captions=plan.elements.map((r:any,i:number)=>({...evidence.captions[i],text:r.text,startFrame:r.startFrame,endFrameExclusive:r.endFrameExclusive}));
  const context=orchestration.createOrchestrationContextV001(source);
  const input=orchestration.createOrchestrationJudgmentInputV001({context,evidence});
  const reply=structuredClone(f.reply);reply.inputSha256=input.inputSha256;
  for(const [i,row] of reply.captions.entries()) {row.semanticRole=i===0?'focus':'normal';row.allowedPresets=[i===0?{preset:'color',scope:'whole-caption'}:{preset:'normal'}];}
  for(const [i,row] of reply.connections.entries()) {row.semanticRole=i%2?'separator':'continuation';row.allowedPresets=[i%2?'soft-separator':'normal-cut'];}
  const state=orchestration.fixOrchestrationJudgmentV001({context,input,replyBytes:text(reply)});
  const view=orchestration.resolveOrchestrationDrawingViewV001({context,state});
  const manifestBinding={path:'runtime/artifacts/synthetic-arbitrary-candidate/files.json',fileSha256:hash('fixture manifest'),sizeBytes:17};
  const adoptionBinding={path:'runtime/artifacts/synthetic-arbitrary-candidate/adoption.json',fileSha256:hash('fixture adoption'),sizeBytes:18};
  const entries=ids.map((instructionId,i)=>({instructionId,decision:i===2?'suppress':'show'}));
  const counts={totalInstructions:ids.length,shownInstructions:ids.length-1,suppressedInstructions:1};
  const selection={schemaVersion:'digest-caption-visibility-selection-v001',mode:'explicit-cue-adoption-v001',
    manifestBinding,adoptionBinding,rendererPlanCanonicalSha256:canonical(view.resolvedPlan),entries,counts};
  const adoption={mode:'explicit-cue-adoption-v001',sourceCandidateManifestBinding:manifestBinding,
    sourceSelectionRecordSha256:view.selectionRecordSha256,sourceClockSha256:view.projection.sourceClockSha256,
    approval:{userMessageId:'TEST-SYNTHETIC-NO-USER',userText:'Fixture only, no real adoption.',sourceThreadId:'TEST-NO-AUTHORITY'},
    decisions:entries.map(row=>({...row,reason:'Explicit synthetic fixture decision; never a duration threshold.'})),
    counts:{totalCues:ids.length,visibleCues:ids.length-1,suppressedCues:1}};
  return {view,source,selection,adoption,manifestBinding,adoptionBinding,plan,
    expected:{frames:view.projection.displayFrameCount,audioSamples:view.projection.displayPlaybackSampleCount,groups:ids.length,atoms:ids.length,cues:ids.length}};
}
test('different ID vocabularies and cue counts preserve the whole clock and an explicitly shown six-frame cue',async()=>{
  for(const ids of [['alpha','omega','tau'],['speech-A','speech-D','speech-H','speech-M','speech-Q']]) {
    const f=staticFixture(ids);const result=await validateApprovedJ16StaticInputV001(f);
    assert.equal(result.logicalCueCount,ids.length);assert.equal(result.visibilityCounts.shownInstructions,ids.length-1);
    assert.equal(f.view.resolvedPlan.elements[1].displayFrameCount,6);assert.equal(f.selection.entries[1].decision,'show');
    assert.equal(f.view.resolvedPlan.elements.length,ids.length);assert.equal(f.view.projection.connections[0].preset,'normal-cut');
    assert.equal(f.view.resolvedPlan.elements[0].visualState.textStyle.fontSizePx,87);
  }
});
test('adoption, all-cue/atom/clock coverage and opaque Core view cannot be substituted',async()=>{
  const edits=[(f:any)=>f.expected.cues--,(f:any)=>f.expected.atoms--,(f:any)=>f.expected.frames--,
    (f:any)=>f.expected.audioSamples--,(f:any)=>f.adoption.decisions[0].decision='suppress',
    (f:any)=>f.adoption.sourceClockSha256='0'.repeat(64),(f:any)=>f.adoption.sourceSelectionRecordSha256='0'.repeat(64),
    (f:any)=>f.adoption.approval.userMessageId='',(f:any)=>f.selection.entries.reverse(),
    (f:any)=>f.adoption.decisions[0].reason='',(f:any)=>f.view=structuredClone(f.view)];
  for(const edit of edits){const f=staticFixture(['custom-4','custom-8','custom-15']);edit(f);await assert.rejects(validateApprovedJ16StaticInputV001(f));}
});
test('static feature gate rejects Pulse, Motion, Panel, unresolved and black separator without fallback',()=>{
  const f=staticFixture(['no-fixed-number-x','no-fixed-number-y','no-fixed-number-z']);
  assert.equal(stage.assertJ16StaticManufacturingViewV001(f.view),f.view);
  const edits=[(v:any)=>v.resolvedPlan.elements[0].presentationPulse={},(v:any)=>v.resolvedPlan.elements[0].presentationMotion={},
    (v:any)=>v.resolvedPlan.elements[0].presentationPanel={},(v:any)=>v.resolution.counts.captions.unresolved=1,
    (v:any)=>v.projection.connections[0].preset='black-separator'];
  for(const edit of edits){const v=structuredClone(f.view);edit(v);assert.throws(()=>stage.assertJ16StaticManufacturingViewV001(v));}
});
test('J16 binds its original Core style instead of applying a different Digest typography formula',()=>{
  const f=staticFixture(['font-input-a','font-input-b','font-input-c'],133),style=projectApprovedJ16BoundCoreStyleV001(structuredClone(f.plan),f.plan);
  assert.equal(style.instructions[0].visualState.textStyle.fontSizePx,133);
  assert.equal(style.instructions[0].visualState.textStyle.borderWidthPx,5);assert.equal(style.instructions[0].visualState.textStyle.glowWidthPx,7);
  const changed=structuredClone(f.plan);changed.elements[0].visualState.textStyle.glowWidthPx=4;
  assert.throws(()=>projectApprovedJ16BoundCoreStyleV001(changed,f.plan));
  assert.throws(()=>projectApprovedJ16BoundCoreStyleV001({fontSizePx:133},f.plan));
});

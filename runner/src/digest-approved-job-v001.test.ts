import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIGEST_APPROVED_JOB_GUARD_V001 as guard, validateDigestApprovedJobConfigurationV001 as validate,
  assertQualifiedDigestApprovedJobV001} from './digest-approved-job-v001.js';
import {assertQualifiedApprovedDigestStorageContextV001, estimateApprovedDigestBaseAllocationV001, projectApprovedDigestManufacturingCompletionV001} from './digest-approved-job-runner-v001.js';
import {resolveDigestTypographySettingsV001} from './digest-formal-handoff-v001.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const binding=(p:string)=>({path:p,fileSha256:'a'.repeat(64)});
function fixture(frames=61,font=144) {
  // Synthetic pure-validation data; these objects are never written or used to launch a worker.
  const paths=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts','runner/src/digest-approved-inputs-v001.ts',
    'runner/src/digest-formal-handoff-v001.ts','evals/clip_composition/adopted_media_manufacturing_v001.mts',
    'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs','evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
    'evals/clip_composition/render_presentation_v002.mjs','tools/digest-quality/original-resolution-low-memory-composite.mjs',
    'tools/digest-quality/original-resolution-full-supervisor-v002.py','evals/clip_composition/digest_representative_completion_v001.mjs'];
  const job:any={schemaVersion:'digest-approved-job-v001',planId:'test-only-'+frames+'-'+font,outputRoot:'runtime/artifacts/test-only-'+frames+'-'+font+'/attempt-001',
    inputs:{preparationParameters:{testOnly:true},preparationManifestBinding:binding('runtime/artifacts/test-only/preparation.json'),
      candidateManifestBinding:binding('runtime/artifacts/test-only/candidate.json'),typographySettingsBinding:binding('runtime/artifacts/test-only/font-'+font+'.json'),
      rendererTemplateBinding:binding('runtime/artifacts/test-only/renderer.json')},
    storage:{guestRoot:'/Volumes/TestGuest',guestVolumeUuid:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',hostRoot:'/Volumes/TestHost',
      hostVolumeUuid:'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',imagePath:'/Volumes/TestHost/test.sparsebundle',imageMaximumBytes:100_000_000_000,
      hostMetadataReserveBytes:6_000_000_000,internalRoot:ROOT,guestDevice:11,hostDevice:12},
    expected:{frames,audioSamples:frames*1470,groups:1,atoms:4,cues:2},implementation:{sha:'b'.repeat(40),bindings:paths.map(binding),nodeBinding:binding(process.execPath)},guard:{...guard},
    allocationBudget:{baseBuildBytes:22_000_000_000,rendererPreparationBytes:1_000_000_000}};
  const jobBinding={...binding(ROOT+'/runtime/artifacts/test-only/job.json'),sizeBytes:123},authorizationBinding={...binding(ROOT+'/runtime/artifacts/test-only/authorization.json'),fileSha256:'c'.repeat(64),sizeBytes:456};
  const authorization:any={schemaVersion:'digest-approved-job-authorization-v001',recordId:'test-only-synthetic-grant',
    userApproval:{at:'2026-10-04T00:00:00Z',messageId:'test-only',text:'Synthetic validation fixture; no manufacturing permission',sourceThreadId:'test-only'},
    actions:['manufacture-one-approved-plan'],jobBinding,planId:job.planId,manifestBinding:job.inputs.candidateManifestBinding,
    typographySettingsBinding:job.inputs.typographySettingsBinding,outputRoot:job.outputRoot,storage:structuredClone(job.storage),guard:structuredClone(job.guard),
    implementation:structuredClone(job.implementation),normalCandidates:1};
  return {job,authorization,options:{workspaceRoot:ROOT,jobBinding,authorizationBinding,trustedJobSha256:jobBinding.fileSha256,trustedAuthorizationSha256:authorizationBinding.fileSha256}};
}
test('two different durations and typography configurations use the same validator and calculation',()=>{
  for(const [frames,font] of [[61,144],[421,240],[27691,216]]) {const f=fixture(frames,font);const out=validate(f.job,f.authorization,f.options);
    assert.equal(out.expected.frames,frames);assert.equal(out.status,'validated-configuration');
    const values=resolveDigestTypographySettingsV001({fontSizePx:font,horizontalMargin:{unit:'font-character',value:0.5},maxLinesPerCue:2});
    assert.equal(values.fontSizePx,font);assert.equal(values.horizontalMarginPx,font/2);}
});
test('separate caller anchors, plan, manifest, settings and storage mismatch are rejected',()=>{
  const changes=[(f:any)=>f.options.trustedAuthorizationSha256='d'.repeat(64),(f:any)=>f.options.trustedJobSha256='e'.repeat(64),
    (f:any)=>f.authorization.planId='other-plan',(f:any)=>f.authorization.manifestBinding.fileSha256='f'.repeat(64),
    (f:any)=>f.authorization.typographySettingsBinding={...f.authorization.typographySettingsBinding,path:'other/settings.json'},
    (f:any)=>f.authorization.storage.guestRoot='/Volumes/OtherGuest'];
  for(const change of changes) {const f=fixture();f.authorization.manifestBinding=structuredClone(f.authorization.manifestBinding);change(f);assert.throws(()=>validate(f.job,f.authorization,f.options));}
});
test('missing inputs, missing safety, invalid duration, root traversal and missing actual code binding are rejected',()=>{
  const changes=[(f:any)=>delete f.job.inputs.typographySettingsBinding,(f:any)=>delete f.job.allocationBudget,
    (f:any)=>f.job.expected.frames=0,(f:any)=>f.job.outputRoot='runtime/artifacts/../escape',
    (f:any)=>f.job.guard.reserveBytes=1,(f:any)=>f.job.implementation.bindings.pop()];
  for(const change of changes) {const f=fixture();change(f);assert.throws(()=>validate(f.job,f.authorization,f.options));}
});
test('historical recovery/failure keys and duplicate implementation bindings have no default in a normal job',()=>{
  for(const key of ['entryRetry','bodyContinuation','previousGrant','failureBindings']) {const f=fixture();f.job[key]={};assert.throws(()=>validate(f.job,f.authorization,f.options));}
  const f=fixture();f.job.implementation.bindings.push({...f.job.implementation.bindings[0]});assert.throws(()=>validate(f.job,f.authorization,f.options));
});
test('a validated JSON, clone or caller resolver cannot manufacture opaque job/storage capabilities',async()=>{
  const f=fixture(); const pure=validate(f.job,f.authorization,f.options);
  await assert.rejects(assertQualifiedDigestApprovedJobV001(pure));await assert.rejects(assertQualifiedDigestApprovedJobV001(f.job));
  await assert.rejects(assertQualifiedApprovedDigestStorageContextV001({outputRoot:f.job.outputRoot,resolve:()=>'/tmp/fake',assertCurrent:async()=>{}}));
});
test('base allocation uses explicit source size and source/target audio clocks',()=>{
  const media={decodedFrameCount:600,fps:30,audioClock:{sampleRate:44100,channels:2,sourceGridSampleCount:882000}};
  const short=estimateApprovedDigestBaseAllocationV001(100_000_000,media,{audioSamples:1470*61});
  const longer=estimateApprovedDigestBaseAllocationV001(200_000_000,media,{audioSamples:1470*421});
  assert.equal(longer-short,100_000_000+(421-61)*1470*2*4*2);
  assert.throws(()=>estimateApprovedDigestBaseAllocationV001(1,{...media,audioClock:{sampleRate:44100,channels:2}},{audioSamples:1}));
});

test('representative policy is bound to both independent authorization and a future confirmation path',()=>{
  for(const ids of [['one'],['one','two']]) {
    const f=fixture(),p={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',
      representativeInstructionIds:ids,permittedMethods:['still-frame','text-clock-context'],confirmationRecordPath:f.job.outputRoot+'/confirmation.json'};
    f.job.verificationPolicy=p;f.authorization.verificationPolicy=structuredClone(p);
    assert.equal(validate(f.job,f.authorization,f.options).status,'validated-configuration');
    assert.equal(f.job.verificationPolicy.completedMedia,undefined);
    delete f.authorization.verificationPolicy;assert.throws(()=>validate(f.job,f.authorization,f.options));
    f.authorization.verificationPolicy={...p,permittedMethods:['video-playback']};assert.throws(()=>validate(f.job,f.authorization,f.options));
  }
});
test('confirmation policy cannot leak into an unapproved default or demand an unborn video hash',()=>{
  const f=fixture();f.authorization.verificationPolicy={mode:'representative-plus-rules-v001'};
  assert.throws(()=>validate(f.job,f.authorization,f.options));
  delete f.authorization.verificationPolicy;
  f.job.verificationPolicy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',
    representativeInstructionIds:['one'],permittedMethods:['still-frame'],confirmationRecordPath:f.job.outputRoot+'/confirmation.json',completedMedia:{fileSha256:'f'.repeat(64)}};
  f.authorization.verificationPolicy=structuredClone(f.job.verificationPolicy);assert.throws(()=>validate(f.job,f.authorization,f.options));
});
test('final manufacturing projection keeps pending incomplete, full visibility unexecuted and legacy unchanged',()=>{
  assert.deepEqual(projectApprovedDigestManufacturingCompletionV001({qc:'passed'}),{status:'completed',technicalQc:'passed'});
  const checks={wholeRules:{status:'passed'},media:{status:'passed'},audioPreservation:{status:'passed'},fullVisibility:{status:'not-executed'}};
  for(const status of ['passed-representative','confirmation-pending']) {
    const verification={schemaVersion:'digest-representative-completion-v001',status,mode:'representative-plus-rules-v001',checks};
    const result=projectApprovedDigestManufacturingCompletionV001({qc:status,complete:status==='passed-representative',verification});
    assert.equal(result.status,status==='passed-representative'?'completed':'confirmation-pending');
    assert.equal(result.verification,verification);assert.equal(result.technicalQc.fullVisibility.status,'not-executed');
    assert.throws(()=>projectApprovedDigestManufacturingCompletionV001({qc:status,complete:status!=='passed-representative',verification}));
  }
});

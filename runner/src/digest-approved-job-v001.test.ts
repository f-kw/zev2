import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DIGEST_APPROVED_JOB_GUARD_V001 as guard, validateDigestApprovedJobConfigurationV001 as validate,
  assertQualifiedDigestApprovedJobV001} from './digest-approved-job-v001.js';
import {assertQualifiedApprovedDigestStorageContextV001, estimateApprovedDigestBaseAllocationV001, projectApprovedDigestManufacturingCompletionV001, projectApprovedDigestBaseMediaJobV001} from './digest-approved-job-runner-v001.js';
import {resolveDigestTypographySettingsV001} from './digest-formal-handoff-v001.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const binding=(p:string)=>({path:p,fileSha256:'a'.repeat(64)});
function fixture(frames=61,font=144) {
  // Synthetic pure-validation data; these objects are never written or used to launch a worker.
  const paths=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts','runner/src/digest-approved-inputs-v001.ts',
    'runner/src/digest-formal-handoff-v001.ts','runner/src/digest-caption-registration-migration-v001.ts','evals/clip_composition/adopted_media_manufacturing_v001.mts',
    'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs','evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
    'evals/clip_composition/render_presentation_v002.mjs','tools/digest-quality/original-resolution-low-memory-composite.mjs',
    'tools/digest-quality/original-resolution-full-supervisor-v002.py','evals/clip_composition/digest_representative_completion_v001.mjs','runner/src/digest-approved-record-finalize-v001.ts'];
  const job:any={schemaVersion:'digest-approved-job-v002',planId:'test-only-'+frames+'-'+font,outputRoot:'runtime/artifacts/test-only-'+frames+'-'+font+'/attempt-001',
    inputs:{preparationParameters:{testOnly:true},preparationManifestBinding:binding('runtime/artifacts/test-only/preparation.json'),
      candidateManifestBinding:binding('runtime/artifacts/test-only/candidate.json'),typographySettingsBinding:binding('runtime/artifacts/test-only/font-'+font+'.json'),
      rendererTemplateBinding:binding('runtime/artifacts/test-only/renderer.json')},
    storage:{guestRoot:'/Volumes/TestGuest',guestVolumeUuid:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',hostRoot:'/Volumes/TestHost',
      hostVolumeUuid:'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',imagePath:'/Volumes/TestHost/test.sparsebundle',imageMaximumBytes:100_000_000_000,
      hostMetadataReserveBytes:6_000_000_000,internalRoot:ROOT,guestDevice:11,hostDevice:12},
    expected:{frames,audioSamples:frames*1470,groups:1,atoms:4,cues:2},implementation:{sha:'b'.repeat(40),bindings:paths.map(binding),nodeBinding:binding(process.execPath)},guard:{...guard},
    allocationBudget:{baseBuildBytes:22_000_000_000,rendererPreparationBytes:1_000_000_000}};
  const inputPrefix=`runtime/artifacts/${job.planId}/current-inputs-v001`;
  job.inputs={...job.inputs,inputRoot:job.storage.guestRoot,inputPrefix,migrationApprovalEvidenceBinding:binding(inputPrefix+'/migration.json')};
  for(const key of ['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding']) job.inputs[key].path=inputPrefix+'/'+key+'.json';
  job.inputs.preparationParameters={workspaceRoot:ROOT,inputRoot:job.storage.guestRoot,inputPrefix,outputRoot:job.storage.guestRoot+'/'+inputPrefix+'/prepared',sourceRuntimeRoot:job.storage.guestRoot+'/'+inputPrefix+'/source',stateBinding:binding(inputPrefix+'/state.json'),styleTemplateBinding:binding(inputPrefix+'/style.json'),scopeBinding:binding('test-only/scope.json')};
  const jobBinding={...binding(ROOT+'/runtime/artifacts/test-only/job.json'),sizeBytes:123},authorizationBinding={...binding(ROOT+'/runtime/artifacts/test-only/authorization.json'),fileSha256:'c'.repeat(64),sizeBytes:456};
  const authorization:any={schemaVersion:'digest-approved-job-authorization-v002',recordId:'test-only-synthetic-grant',
    userApproval:{at:'2026-10-04T00:00:00Z',messageId:'test-only',text:'Synthetic validation fixture; no manufacturing permission',sourceThreadId:'test-only'},
    actions:['manufacture-one-approved-plan'],jobBinding,planId:job.planId,manifestBinding:job.inputs.candidateManifestBinding,
    typographySettingsBinding:job.inputs.typographySettingsBinding,migrationApprovalEvidenceBinding:job.inputs.migrationApprovalEvidenceBinding,outputRoot:job.outputRoot,storage:structuredClone(job.storage),guard:structuredClone(job.guard),
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


function recoveryFixture() {
  const f=fixture();
  f.job.verificationPolicy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',
    representativeInstructionIds:['one'],permittedMethods:['still-frame'],confirmationRecordPath:f.job.outputRoot+'/confirmation.json'};
  f.authorization.verificationPolicy=structuredClone(f.job.verificationPolicy);
  f.job.recoveryBinding={...binding('runtime/artifacts/test-only/saved-recovery.json'),sizeBytes:123};
  f.authorization.recoveryBinding=structuredClone(f.job.recoveryBinding);
  return f;
}
test('recovery byte binding is optional for ordinary jobs and identical in the representative authorization',()=>{
  const ordinary=fixture();assert.equal(validate(ordinary.job,ordinary.authorization,ordinary.options).status,'validated-configuration');
  const f=recoveryFixture();assert.equal(validate(f.job,f.authorization,f.options).status,'validated-configuration');
});
test('recovery binding cannot be present in one record only or substituted in authorization',()=>{
  for(const change of [(f:any)=>delete f.job.recoveryBinding,(f:any)=>delete f.authorization.recoveryBinding,
    (f:any)=>f.authorization.recoveryBinding.path='runtime/artifacts/test-only/other.json',
    (f:any)=>f.authorization.recoveryBinding.fileSha256='b'.repeat(64),(f:any)=>f.authorization.recoveryBinding.sizeBytes++]) {
    const f=recoveryFixture();change(f);assert.throws(()=>validate(f.job,f.authorization,f.options));
  }
});
test('recovery requires an exact safe repository-relative byte binding and positive size',()=>{
  for(const value of [null,{}, {path:'/tmp/recovery.json',fileSha256:'a'.repeat(64),sizeBytes:1},
    {path:'../recovery.json',fileSha256:'a'.repeat(64),sizeBytes:1},
    {path:'runtime//recovery.json',fileSha256:'a'.repeat(64),sizeBytes:1},
    {path:'runtime/recovery.json',fileSha256:'bad',sizeBytes:1},
    {path:'runtime/recovery.json',fileSha256:'a'.repeat(64)},
    ...[0,-1,1.5,true].map(sizeBytes=>({path:'runtime/recovery.json',fileSha256:'a'.repeat(64),sizeBytes})),
    {path:'runtime/recovery.json',fileSha256:'a'.repeat(64),sizeBytes:1,schemaVersion:'unbound-extra'}]) {
    const f=recoveryFixture();f.job.recoveryBinding=value;f.authorization.recoveryBinding=structuredClone(value);
    assert.throws(()=>validate(f.job,f.authorization,f.options));
  }
});
test('recovery cannot select full QC or weaken independent anchors and safety',()=>{
  for(const change of [(f:any)=>{delete f.job.verificationPolicy;delete f.authorization.verificationPolicy;},
    (f:any)=>{f.job.verificationPolicy.mode='full-qc';f.authorization.verificationPolicy.mode='full-qc';},
    (f:any)=>f.options.trustedAuthorizationSha256='b'.repeat(64),(f:any)=>f.job.guard.reserveBytes=1]) {
    const f=recoveryFixture();change(f);assert.throws(()=>validate(f.job,f.authorization,f.options));
  }
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


test('published adoption is projected to the unchanged base-job byte contract before media',async()=>{
  const base=await import(pathToFileURL(path.join(ROOT,'evals/clip_composition/presentation_base_media_build_v003.mjs')).href);
  const wire=await import(pathToFileURL(path.join(ROOT,'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
  const out='runtime/artifacts/test-only-published-adoption/attempt-001';
  const adoption={schemaVersion:'test-only-adoption',artifactId:'test-only',decision:'fixture-only-no-permission'};
  const published=wire.bind(out+'/machine-adoption.json',adoption);
  const original={schemaVersion:base.PRESENTATION_BASE_MEDIA_BUILD_JOB_SCHEMA_VERSION,jobId:'test-only-original',
    assemblyDecision:binding('runtime/artifacts/test-only/original.json'),
    sourceArtifact:{sourceProvenance:'test-only',sourceRef:'test-only',sourceUri:'fixture:source',...binding('runtime/artifacts/test-only/source.mp4')},
    outputDirectory:'runtime/artifacts/test-only/original-base'};
  const before=structuredClone(original);
  assert.equal(base.validatePresentationBaseMediaBuildJobV001({...original,assemblyDecision:published}).status,'failed');
  const projected=projectApprovedDigestBaseMediaJobV001(original,'test-only',out,published);
  assert.equal(base.validatePresentationBaseMediaBuildJobV001(projected).status,'passed');
  assert.deepEqual(projected.assemblyDecision,{path:published.path,fileSha256:wire.sha(wire.formal(adoption))});
  assert.deepEqual(projected.sourceArtifact,original.sourceArtifact);assert.deepEqual(original,before);
  assert.throws(()=>projectApprovedDigestBaseMediaJobV001(original,'test-only',out,{...published,path:out+'/other.json'}));
  assert.throws(()=>projectApprovedDigestBaseMediaJobV001(original,'test-only',out,{...published,fileSha256:'invalid'}));
  assert.equal(base.validatePresentationBaseMediaBuildJobV001({...projected,assemblyDecision:{...projected.assemblyDecision,extra:true}}).status,'failed');
});

function withBaseReuse() {
  const f=fixture();f.job.inputs.baseReuseBundleBinding={...binding(f.job.inputs.inputPrefix+'/base-reuse.json'),sizeBytes:123,schemaVersion:'digest-approved-base-reuse-input-v001'};
  f.job.implementation.bindings.push(binding('runner/src/digest-approved-base-reuse-v001.ts'));
  f.authorization.baseReuseBundleBinding=structuredClone(f.job.inputs.baseReuseBundleBinding);f.authorization.implementation=structuredClone(f.job.implementation);return f;
}
test('reuse is opt-in and explicitly bound to current authorization, input prefix and helper bytes',()=>{
  const f=withBaseReuse();assert.equal(validate(f.job,f.authorization,f.options).status,'validated-configuration');
  for(const change of [(v:any)=>delete v.authorization.baseReuseBundleBinding,(v:any)=>delete v.job.inputs.baseReuseBundleBinding,
    (v:any)=>v.authorization.baseReuseBundleBinding.fileSha256='f'.repeat(64),
    (v:any)=>{v.job.inputs.baseReuseBundleBinding.path='runtime/artifacts/old/reuse.json';v.authorization.baseReuseBundleBinding=structuredClone(v.job.inputs.baseReuseBundleBinding);},
    (v:any)=>{delete v.job.inputs.baseReuseBundleBinding.sizeBytes;v.authorization.baseReuseBundleBinding=structuredClone(v.job.inputs.baseReuseBundleBinding);},
    (v:any)=>{v.job.implementation.bindings.pop();v.authorization.implementation=structuredClone(v.job.implementation);},
    (v:any)=>{v.job.inputs.baseReuseBundleBinding.schemaVersion='old';v.authorization.baseReuseBundleBinding=structuredClone(v.job.inputs.baseReuseBundleBinding);}
  ]){const v=withBaseReuse();change(v);assert.throws(()=>validate(v.job,v.authorization,v.options));}
});
test('reuse cannot be combined with failed-work recovery or turn pure validation into permission',async()=>{
  const f=recoveryFixture();f.job.inputs.baseReuseBundleBinding={...binding(f.job.inputs.inputPrefix+'/reuse.json'),sizeBytes:1,schemaVersion:'digest-approved-base-reuse-input-v001'};
  f.authorization.baseReuseBundleBinding=structuredClone(f.job.inputs.baseReuseBundleBinding);assert.throws(()=>validate(f.job,f.authorization,f.options),/BASE_REUSE_RECOVERY_CONFLICT/);
  const r=withBaseReuse();await assert.rejects(assertQualifiedDigestApprovedJobV001(validate(r.job,r.authorization,r.options)),/QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/);
});


function j16Fixture() {
  const f=fixture(),prefix=f.job.inputs.inputPrefix;
  f.job.inputs={kind:'j16-staged-static-v001',inputRoot:f.job.storage.guestRoot,inputPrefix:prefix,
    candidateManifestBinding:{...binding('runtime/artifacts/arbitrary-original-live-candidate/files.json'),sizeBytes:123,schemaVersion:'presentation-j16-live-candidate-files-v001'},
    ...Object.fromEntries(['visibilitySelectionBinding','visibilityAdoptionBinding','typographySettingsBinding','rendererTemplateBinding'].map(key=>[key,{...binding(prefix+'/'+key+'.json'),sizeBytes:234}]))};
  f.job.verificationPolicy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',representativeInstructionIds:['arbitrary-cue'],permittedMethods:['still-frame'],confirmationRecordPath:f.job.outputRoot+'/confirmation.json'};
  for(const p of ['presentation_j16_staged_boundary_v001.mjs','presentation_orchestration_v001.mjs','presentation_orchestration_projection_v001.mjs','presentation_orchestration_background_v001.mjs'])f.job.implementation.bindings.push(binding('evals/clip_composition/'+p));
  delete f.authorization.migrationApprovalEvidenceBinding;
  Object.assign(f.authorization,{inputKind:f.job.inputs.kind,manifestBinding:f.job.inputs.candidateManifestBinding,
    typographySettingsBinding:f.job.inputs.typographySettingsBinding,visibilitySelectionBinding:f.job.inputs.visibilitySelectionBinding,
    visibilityAdoptionBinding:f.job.inputs.visibilityAdoptionBinding,rendererTemplateBinding:f.job.inputs.rendererTemplateBinding,
    implementation:structuredClone(f.job.implementation),verificationPolicy:structuredClone(f.job.verificationPolicy)});
  return f;
}
test('J16 is an explicit generic input kind with independently bound adoption and original candidate',()=>{
  const f=j16Fixture();assert.equal(validate(f.job,f.authorization,f.options).status,'validated-configuration');
  assert.equal(f.job.inputs.preparationManifestBinding,undefined);assert.equal(f.job.inputs.migrationApprovalEvidenceBinding,undefined);
  for(const change of [(x:any)=>x.authorization.inputKind='normal',
    (x:any)=>x.authorization.visibilityAdoptionBinding={...x.authorization.visibilityAdoptionBinding,fileSha256:'f'.repeat(64)},
    (x:any)=>x.authorization.visibilitySelectionBinding={...x.authorization.visibilitySelectionBinding,sizeBytes:235},
    (x:any)=>x.authorization.rendererTemplateBinding={...x.authorization.rendererTemplateBinding,path:x.job.inputs.inputPrefix+'/other.json'},
    (x:any)=>{x.job.inputs.candidateManifestBinding={...x.job.inputs.candidateManifestBinding,path:x.job.inputs.inputPrefix+'/files.json'};x.authorization.manifestBinding=x.job.inputs.candidateManifestBinding;},
    (x:any)=>{delete x.job.verificationPolicy;delete x.authorization.verificationPolicy;},
    (x:any)=>x.job.inputs.baseReuseBundleBinding=binding(x.job.inputs.inputPrefix+'/reuse.json'),
    (x:any)=>{x.job.recoveryBinding={...binding('runtime/artifacts/synthetic-recovery.json'),sizeBytes:1};x.authorization.recoveryBinding=x.job.recoveryBinding;},
    (x:any)=>{x.job.implementation.bindings.pop();x.authorization.implementation=x.job.implementation;},
    (x:any)=>x.job.inputs.visibilitySelectionBinding.sizeBytes=0]){
    const changed=j16Fixture();change(changed);assert.throws(()=>validate(changed.job,changed.authorization,changed.options));
  }
});

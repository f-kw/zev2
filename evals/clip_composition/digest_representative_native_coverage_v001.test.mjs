import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import * as qc from './presentation_renderer_qc_v002.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {evaluateDigestRepresentativeCompletionV001 as evaluate,validateDigestRepresentativeVerificationPolicyV001} from './digest_representative_completion_v001.mjs';

// Execute actual shared function bodies with an explicit in-memory bound-byte store.
// Environment/opaque qualification is stubbed only here; no production capability,
// filesystem output, image, renderer, QC tool, device or manufacturing grant is created.
const source=await readFile(new URL('./digest_representative_completion_v001.mjs',import.meta.url),'utf8');
const hash=b=>createHash('sha256').update(b).digest('hex'),canonicalSha=v=>hash(canonicalJson(v));
const clone=v=>structuredClone(v);
function exact(v,keys,label){assert(v&&typeof v==='object'&&!Array.isArray(v),label);assert.deepEqual(Object.keys(v).sort(),[...keys].sort(),label);}
function binding(v){assert(v&&typeof v.path==='string'&&/^[a-f0-9]{64}$/u.test(v.fileSha256)&&Number.isSafeInteger(v.sizeBytes)&&v.sizeBytes>0);}
function relative(v){assert(typeof v==='string'&&!path.isAbsolute(v)&&!v.split('/').some(s=>['','.','..'].includes(s)));return v;}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function compile(name,deps,async=true){
  const marker=(async?'export async function ':'function ')+name+'(',start=source.indexOf(marker);
  assert(start>=0,name);const end=source.indexOf('\n}\n',start)+3;assert(end>start,name);
  const body=source.slice(start,end).replace(/^export /u,'').replaceAll("const {evaluatePresentationRendererQcV002}=await import('./presentation_renderer_qc_v002.mjs');","const {evaluatePresentationRendererQcV002}=qc;");
  return Function(...Object.keys(deps),'return ('+body+');')(...Object.values(deps));
}
const savedNativeCoverage=compile('savedNativeCoverage',{assert},false);
function fixture(){
  const out='runtime/artifacts/test-native-shared/attempt-001',guest='/test-virtual-guest',files=new Map();
  const ref=label=>({path:'/test-only/'+label+'.json',fileSha256:hash(label),sizeBytes:label.length});
  const q={jobBinding:ref('approved-job'),authorizationBinding:ref('authorization'),job:{planId:'synthetic-native-job',outputRoot:out,
    storage:{guestRoot:guest},implementation:{sha:'a'.repeat(40),bindings:[]},expected:{frames:4,cues:2},inputs:{candidateManifestBinding:ref('manifest'),typographySettingsBinding:ref('settings')}}};
  const policy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',representativeInstructionIds:['first'],
    permittedMethods:['text-clock-context'],confirmationRecordPath:out+'/confirmation.json'};
  q.job.verificationPolicy=policy;q.authorization={verificationPolicy:policy};
  const bounds={left:10,top:10,right:20,bottom:20,width:10,height:10};
  const plan={schemaVersion:'presentation-render-plan-v002',canvas:{width:64,height:64,fps:30,safeAreaPx:{left:0,right:0,top:0,bottom:0}},
    elements:['first','second'].map((instructionId,i)=>({instructionId,text:'synthetic',startFrame:i*2,endFrameExclusive:i*2+2,displayFrameCount:2,
      presetId:'Normal',registryVersion:'synthetic',indexedLines:[{lineIndex:0,text:'synthetic'}],visualState:{layout:{maxLines:2},position:{preset:'bottom-center'},background:null}}))};
  function save(logical,value,binary=false){const bytes=binary?Buffer.from(value):Buffer.from(JSON.stringify(value)+'\n');files.set(guest+'/'+logical,bytes);return {path:logical,fileSha256:hash(bytes),sizeBytes:bytes.length};}
  const media=save(out+'/render/presentation-rendered-v002.mp4','opaque synthetic media bytes',true);
  const pngs=['first','second'].map(id=>save(out+'/render/overlays/'+id+'.png','opaque synthetic primary '+id,true));
  const inspections=plan.elements.map((e,i)=>({instructionId:e.instructionId,overlayFile:'overlays/'+e.instructionId+'.png',overlaySha256:pngs[i].fileSha256,
    appliedOverlayPropsCanonicalSha256:hash('props'+i),alphaMax:255,alphaBounds:bounds,lineCount:1,lineRects:[bounds],
    lineAlphaBounds:i===0?[{lineIndex:0,pngSha256:hash('mask'),...bounds}]:[]}));
  const applications=plan.elements.map((e,i)=>({instructionId:e.instructionId,requestedPresetId:e.presetId,appliedPresetId:e.presetId,appliedPresetRegistryVersion:e.registryVersion,
    overlayFile:inspections[i].overlayFile,overlaySha256:pngs[i].fileSha256,appliedOverlayPropsCanonicalSha256:inspections[i].appliedOverlayPropsCanonicalSha256,
    finalPlanElementReference:{planFile:'presentation-render-plan-v002.json',instructionId:e.instructionId,canonicalSha256:canonicalSha({...e,overlaySha256:pngs[i].fileSha256})}}));
  const expectedBindings={approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,implementationSha:q.job.implementation.sha};
  const coverage={schemaVersion:'digest-native-sampling-coverage-v001',rendererPlanCanonicalSha256:canonicalSha(plan),policyCanonicalSha256:canonicalSha(policy),...expectedBindings,
    entries:plan.elements.map((e,i)=>({instructionId:e.instructionId,primarySha256:pngs[i].fileSha256,repeat:i===0?{status:'performed',sha256:pngs[i].fileSha256}:{status:'not-executed'},
      lineMasks:i===0?{status:'performed',scope:'representative',masks:[{lineIndex:0,pngSha256:hash('mask'),alphaBounds:bounds}]}:{status:'not-executed'},calibration:{status:'not-executed'}}))};
  const outputMedia={durationMs:4*1000/30,video:{width:64,height:64,fps:30,frameCount:4}},expectedAudio={present:false};
  const input={plan,applicationResults:applications,overlayInspections:inspections,mediaInspection:outputMedia,expectedAudio,expectedFrameCount:4,canvas:plan.canvas,requireFinalVisibility:false};
  const bindings={planId:q.job.planId,outputRoot:out,...expectedBindings,manifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,
    rendererPlanCanonicalSha256:canonicalSha(plan),completedMedia:{...media,path:guest+'/'+media.path}};
  return {out,guest,files,save,q,policy,plan,inspections,applications,coverage,expectedBindings,outputMedia,expectedAudio,input,bindings,media,pngs};
}
function pure(f,overrides={}){
  const ruleQc=qc.evaluateDigestRepresentativeRendererQcV001(f.input,{policy:f.policy,nativeCoverage:f.coverage,expectedBindings:f.expectedBindings});
  return evaluate({policy:f.policy,bindings:f.bindings,plan:f.plan,ruleQc,nativeCoverage:f.coverage,overlayInspections:f.inspections,applicationResults:f.applications,...overrides});
}
function wiring(f){
  const qualifiedResults=new WeakMap(),qualifiedPending=new WeakMap();
  const generatedPath=(q,p)=>{assert(relative(p).startsWith(q.job.outputRoot+'/'));return q.job.storage.guestRoot+'/'+p;};
  function readBytes(file){if(!f.files.has(file))throw Object.assign(Error('synthetic ENOENT'),{code:'ENOENT'});return f.files.get(file);}
  const stableBinding=async(file,logical=file)=>{const bytes=readBytes(file);return {path:logical,fileSha256:hash(bytes),sizeBytes:bytes.length};};
  const readSavedJson=async(q,ref)=>{const bytes=readBytes(generatedPath(q,ref.path));assert.equal(hash(bytes),ref.fileSha256,'PENDING_SAVED_BYTES_CHANGED');if(ref.sizeBytes!==undefined)assert.equal(bytes.length,ref.sizeBytes);return JSON.parse(bytes.toString());};
  const verifySaved=async(q,ref)=>{const actual=await stableBinding(generatedPath(q,ref.path),ref.path);assert.equal(actual.fileSha256,ref.fileSha256,'PENDING_SAVED_ARTIFACT_CHANGED');assert.equal(actual.sizeBytes,ref.sizeBytes);};
  const context={approvedJob:f.q,outputRoot:f.out,generatedRoot:f.guest+'/'+f.out,resolve:p=>f.guest+'/'+p,
    publish:async(p,v)=>f.save(p,v),readBound:async ref=>readSavedJson(f.q,ref)};
  const deps={assert,path,freeze,binding,relative,exact,object:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),canonicalSha,digest:hash,schema:'digest-representative-completion-v001',HASH:/^[a-f0-9]{64}$/u,
    qc,qualifiedResults,qualifiedPending,stableBinding,generatedPath,readSavedJson,verifySaved,savedNativeCoverage,
    readFile:async p=>readBytes(p),owned:(c,p)=>assert(p.startsWith(c.generatedRoot+'/')),verifyReference:async(c,r)=>verifySaved(c.approvedJob,r),
    resolveApprovedDigestVerificationPolicyV001:async()=>f.policy,assertRecordedJob:async()=>{},assertPendingJob:async()=>{},assertRecordedInvocation:async()=>{},
    validateDigestRepresentativeSelectionV001:(policy,plan)=>assert(policy.representativeInstructionIds.every(id=>plan.elements.some(e=>e.instructionId===id))),
    validateDigestRepresentativeVerificationPolicyV001,evaluateDigestRepresentativeCompletionV001:evaluate,evaluateDigestRepresentativeRendererQcV001:qc.evaluateDigestRepresentativeRendererQcV001,
    validateDigestNativeSamplingCoverageV001:qc.validateDigestNativeSamplingCoverageV001,
    assertQualifiedDigestRepresentativeCompletionV001:async v=>assert(qualifiedResults.has(v),'test factory qualification'),
    assertApprovedDigestPendingVerificationV001:async p=>assert(qualifiedPending.has(p),'test saved pending qualification')};
  const finish=compile('finishApprovedDigestRepresentativeCompletionV001',deps);deps.finishApprovedDigestRepresentativeCompletionV001=finish;
  return {context,finish,persist:compile('persistApprovedDigestRepresentativePendingEvidenceV001',deps),readPending:compile('readApprovedDigestPendingVerificationV001',deps),
    requalify:compile('requalifyApprovedDigestRecordedRepresentativeV001',deps),readCompleted:compile('readApprovedDigestInitialCompletedReceiptV001',deps),
    args:{storageContext:context,plan:f.plan,workVideo:f.bindings.completedMedia.path,applicationResults:f.applications,
      overlayRecords:f.plan.elements.map((element,i)=>({element,inspection:f.inspections[i],pngSha256:f.pngs[i].fileSha256})),
      outputMedia:f.outputMedia,expectedAudio:f.expectedAudio,expectedFrameCount:4,nativeCoverage:f.coverage}};
}
function record(f){return {schemaVersion:'digest-representative-verification-record-v001',planId:f.q.job.planId,approvedJobBinding:f.q.jobBinding,authorizationBinding:f.q.authorizationBinding,
  manifestBinding:f.q.job.inputs.candidateManifestBinding,typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,rendererPlanCanonicalSha256:canonicalSha(f.plan),
  completedMedia:{fileSha256:f.media.fileSha256,sizeBytes:f.media.sizeBytes},confirmedAt:new Date().toISOString(),
  representatives:[{instructionId:'first',startFrame:0,endFrameExclusive:2,observedAtFrame:1,method:'text-clock-context',result:'accepted',evidenceBinding:f.save(f.out+'/evidence.json',{synthetic:true}),note:'Synthetic structural fixture only; no actual human viewing.'}],
  observations:{wholeVideoPlayback:'not-evaluated',audioListening:'not-evaluated',humanQualityAdoption:'not-evaluated'}};}
async function savedPending(f,w){
  const verification=await w.finish(w.args);assert.equal(verification.status,'confirmation-pending');
  const draw={resolvedPlan:f.plan,applicationResults:f.applications,overlayRecords:w.args.overlayRecords,outputMedia:f.outputMedia,completedExpectedAudio:f.expectedAudio,nativeCoverage:f.coverage};
  const refs=await w.persist({draw,verification,storageContext:w.context,publishedMediaPath:f.bindings.completedMedia.path});
  const planBinding=f.save(f.out+'/core-plan.json',{schemaVersion:'digest-approved-candidate-core-plan-v001',planId:f.q.job.planId,outputRoot:f.out,approvedJobBinding:f.q.jobBinding,approvalRecordBinding:f.q.authorizationBinding,
    acceptedManifestBinding:f.q.job.inputs.candidateManifestBinding,typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,implementationBindings:[],verificationPolicy:f.policy});
  const p={schemaVersion:'digest-approved-manufacturing-result-v001',status:'confirmation-pending',complete:false,completedAt:null,approvedJobBinding:f.q.jobBinding,
    authorizationBinding:f.q.authorizationBinding,implementationSha:f.q.job.implementation.sha,typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,planBinding,verification,...refs,
    result:{verification,...refs,video:{path:f.media.path,fileSha256:f.media.fileSha256}}};
  const pendingReceiptBinding=f.save(f.out+'/result.json',p);
  return {p,draw,verification,pendingReceiptBinding,options:{qualified:f.q,pendingReceiptBinding,trustedPendingReceiptSha256:pendingReceiptBinding.fileSha256}};
}

test('new sampled rules retain all-primary/actual native scope and cannot claim unperformed full QC',()=>{
  const f=fixture(),r=pure(f);assert.equal(r.status,'confirmation-pending');assert.equal(r.complete,false);
  assert.deepEqual(r.nativeCoverage,f.coverage);assert.equal(r.checks.nativeSampling.summary.primaryInspectionCount,2);
  assert.equal(r.checks.nativeSampling.summary.repeatInspectionCount,1);assert.equal(r.checks.nativeSampling.summary.lineMaskNotExecutedInstructionCount,1);
  assert.equal(r.checks.fullVisibility.status,'not-executed');assert.deepEqual(r.existingRuleEvidence.applicationResults,f.applications);
});
test('pure completion rejects substituted bindings, omitted coverage, failed repeat/mask and altered counts',()=>{
  for(const change of [f=>f.coverage.approvedJobBinding={...f.coverage.approvedJobBinding,fileSha256:hash('other')},f=>f.coverage.authorizationBinding={...f.coverage.authorizationBinding,fileSha256:hash('other')},
    f=>f.coverage.implementationSha='b'.repeat(40),f=>f.coverage.entries[0].repeat={status:'not-executed'},
    f=>f.coverage.entries[0].repeat.sha256=hash('wrong'),f=>f.coverage.entries[0].lineMasks.masks=[]]){
    const f=fixture();change(f);assert.equal(pure(f).status,'failed');
  }
  const f=fixture();assert.equal(pure(f,{nativeCoverage:null}).status,'failed');
  const good=qc.evaluateDigestRepresentativeRendererQcV001(f.input,{policy:f.policy,nativeCoverage:f.coverage,expectedBindings:f.expectedBindings});
  good.checks.nativeSampling.summary.repeatInspectionCount++;assert.equal(pure(f,{ruleQc:good}).status,'failed');
});
test('actual factory -> technical save -> pending get/readback -> record-only requalification preserves coverage',async()=>{
  const f=fixture(),w=wiring(f),saved=await savedPending(f,w),pending=await w.readPending(saved.options);
  assert.deepEqual(pending.technicalEvidence.nativeCoverage,f.coverage);assert.deepEqual(pending.pendingReceipt.verification.nativeCoverage,f.coverage);
  f.save(f.policy.confirmationRecordPath,record(f));
  const recordContext={...w.context,scope:'digest-record-only-finalization-v001',pending};
  const completed=await w.requalify({pending,recordContext});assert.equal(completed.status,'passed-representative');
  assert.deepEqual(completed.nativeCoverage,f.coverage);assert.deepEqual(completed.checks.nativeSampling,saved.verification.checks.nativeSampling);
  const altered=clone(f.coverage);altered.entries[0].repeat={status:'not-executed'};
  await assert.rejects(w.finish({...w.args,storageContext:recordContext,nativeCoverage:altered}),/RECORD_ONLY_TECHNICAL_INPUT_SUBSTITUTION/);
});
test('technical persistence rejects draw/verification coverage loss before publishing any technical bytes',async()=>{
  const f=fixture(),w=wiring(f),v=await w.finish(w.args),draw={resolvedPlan:f.plan,applicationResults:f.applications,overlayRecords:w.args.overlayRecords,outputMedia:f.outputMedia,completedExpectedAudio:f.expectedAudio};
  await assert.rejects(w.persist({draw,verification:v,storageContext:w.context,publishedMediaPath:f.bindings.completedMedia.path}),/PENDING_NATIVE_COVERAGE_CHANGED/);
  assert(!f.files.has(f.guest+'/'+f.out+'/representative-technical-evidence-v001.json'));
});
test('pending reader refuses different or missing technical coverage even with a newly anchored JSON receipt',async()=>{
  for(const missing of [false,true]){
    const f=fixture(),w=wiring(f),s=await savedPending(f,w),t=JSON.parse(f.files.get(f.guest+'/'+s.p.technicalEvidenceBinding.path));
    if(missing)delete t.nativeCoverage;else t.nativeCoverage.entries[0].repeat={status:'not-executed'};
    const ref=f.save(s.p.technicalEvidenceBinding.path,t);s.p.technicalEvidenceBinding=ref;s.p.result.technicalEvidenceBinding=ref;
    const rb=f.save(f.out+'/result.json',s.p);await assert.rejects(w.readPending({...s.options,pendingReceiptBinding:rb,trustedPendingReceiptSha256:rb.fileSha256}),/PENDING_NATIVE_COVERAGE_SUBSTITUTION/);
  }
});
test('completed reader accepts actual caller shape without applicationResults and rechecks stored coverage/current primary bytes',async()=>{
  const f=fixture(),w=wiring(f),s=await savedPending(f,w);f.save(f.policy.confirmationRecordPath,record(f));const verification=await w.finish(w.args);
  const execution=f.save(f.out+'/renderer-result.json',{exitCode:0,result:{status:'completed',verification,qc:verification,commonCorePlan:f.plan,
    publication:{status:'published',outputDirectory:path.dirname(f.bindings.completedMedia.path)}}});
  const p={...s.p,status:'completed',complete:true,completedAt:new Date().toISOString(),verification,humanQuality:'not-evaluated',outlineChoice:null,
    result:{...s.p.result,status:'completed',complete:true,qc:verification.status,verification,counterfactualQcExecuted:false,execution,
      admission:f.save(f.out+'/admission.json',{synthetic:true}),lineLayout:f.save(f.out+'/line-layout.json',{synthetic:true})}};
  const rb=f.save(f.out+'/result.json',p),options={qualified:f.q,receiptBinding:rb,trustedReceiptSha256:rb.fileSha256};
  const read=await w.readCompleted(options);assert.equal(read.status,'completed');assert.deepEqual(read.verification.nativeCoverage,f.coverage);
  assert.equal(read.verification.checks.nativeSampling.summary.repeatNotExecutedCount,1);
  const originalExecution=Buffer.from(f.files.get(f.guest+'/'+execution.path));
  for(const mutate of [v=>{delete v.nativeCoverage;},v=>{v.nativeCoverage.entries[0].repeat={status:'not-executed'};},
    v=>{v.nativeCoverage.authorizationBinding={...v.nativeCoverage.authorizationBinding,fileSha256:hash('substituted grant')};}]){
    const altered=clone(p);mutate(altered.verification);altered.result.verification=altered.verification;
    const changedExecution=JSON.parse(originalExecution);changedExecution.result.verification=altered.verification;changedExecution.result.qc=altered.verification;
    altered.result.execution=f.save(execution.path,changedExecution);
    const changed=f.save(f.out+'/result.json',altered);
    await assert.rejects(w.readCompleted({...options,receiptBinding:changed,trustedReceiptSha256:changed.fileSha256}));
    f.files.set(f.guest+'/'+execution.path,originalExecution);f.save(f.out+'/result.json',p);
  }
  f.files.set(f.guest+'/'+f.pngs[1].path,Buffer.from('changed unselected primary'));
  await assert.rejects(w.readCompleted(options),/COMPLETED_NATIVE_PRIMARY_CHANGED/);
});
test('recorded native coverage cannot disappear into historical full mode',async()=>{
  const f=fixture(),w=wiring(f),s=await savedPending(f,w),altered=clone(s.p);delete altered.verification.nativeCoverage;delete altered.result.verification.nativeCoverage;
  const rb=f.save(f.out+'/result.json',altered);await assert.rejects(w.readPending({...s.options,pendingReceiptBinding:rb,trustedPendingReceiptSha256:rb.fileSha256}),/RECORDED_NATIVE_COVERAGE_REQUIRED|PENDING_NATIVE_COVERAGE_SUBSTITUTION/);
});

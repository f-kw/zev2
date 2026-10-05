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
  const markers=async?['export async function '+name+'(','async function '+name+'(']:['function '+name+'('];
  const start=markers.map(marker=>source.indexOf(marker)).find(index=>index>=0);
  assert(start!==undefined,name);const end=source.indexOf('\n}\n',start)+3;assert(end>start,name);
  const body=source.slice(start,end).replace(/^export /u,'').replaceAll("const {evaluatePresentationRendererQcV002}=await import('./presentation_renderer_qc_v002.mjs');","const {evaluatePresentationRendererQcV002}=qc;");
  return Function(...Object.keys(deps),'return ('+body+');')(...Object.values(deps));
}
const savedNativeCoverage=compile('savedNativeCoverage',{assert},false);
const savedVisibilitySelection=compile('savedVisibilitySelection',{assert},false);
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
    qc,qualifiedResults,qualifiedPending,stableBinding,generatedPath,readSavedJson,verifySaved,savedNativeCoverage,savedVisibilitySelection,
    readFile:async p=>readBytes(p),owned:(c,p)=>assert(p.startsWith(c.generatedRoot+'/')),verifyReference:async(c,r)=>verifySaved(c.approvedJob,r),
    resolveApprovedDigestVerificationPolicyV001:async()=>f.policy,
    resolveApprovedDigestCaptionVisibilitySelectionV001:async()=>f.visibilitySelection??null,readCurrentVisibility:async()=>{f.currentVisibilityReads=(f.currentVisibilityReads??0)+1;return f.visibilitySelection??null;},
    assertRecordedJob:async()=>{},assertPendingJob:async()=>{},assertRecordedInvocation:async()=>{},
    validateDigestRepresentativeSelectionV001:(policy,plan)=>assert(policy.representativeInstructionIds.every(id=>plan.elements.some(e=>e.instructionId===id))),
    validateDigestRepresentativeVerificationPolicyV001,evaluateDigestRepresentativeCompletionV001:evaluate,evaluateDigestRepresentativeRendererQcV001:qc.evaluateDigestRepresentativeRendererQcV001,
    validateDigestNativeSamplingCoverageV001:qc.validateDigestNativeSamplingCoverageV001,
    validateDigestCaptionVisibilitySelectionV001:qc.validateDigestCaptionVisibilitySelectionV001,
    validateDigestCaptionVisibilityCompositionV001:qc.validateDigestCaptionVisibilityCompositionV001,
    assertQualifiedDigestRepresentativeCompletionV001:async v=>assert(qualifiedResults.has(v),'test factory qualification'),
    assertApprovedDigestPendingVerificationV001:async p=>assert(qualifiedPending.has(p),'test saved pending qualification')};
  deps.verifyVisibilityComposition=compile('verifyVisibilityComposition',deps);
  // Actual private qualification/assertion bodies; only environment and input capability reads are modeled.
  deps.assertQualifiedDigestRepresentativeCompletionV001=compile('assertQualifiedDigestRepresentativeCompletionV001',deps);
  deps.assertApprovedDigestPendingVerificationV001=compile('assertApprovedDigestPendingVerificationV001',deps);
  const finish=compile('finishApprovedDigestRepresentativeCompletionV001',deps);deps.finishApprovedDigestRepresentativeCompletionV001=finish;
  return {context,finish,persist:compile('persistApprovedDigestRepresentativePendingEvidenceV001',deps),readPending:compile('readApprovedDigestPendingVerificationV001',deps),
    requalify:compile('requalifyApprovedDigestRecordedRepresentativeV001',deps),readCompleted:compile('readApprovedDigestInitialCompletedReceiptV001',deps),
    args:{storageContext:context,plan:f.plan,workVideo:f.bindings.completedMedia.path,applicationResults:f.applications,
      overlayRecords:f.plan.elements.map((element,i)=>({element,inspection:f.inspections[i],pngSha256:f.pngs[i].fileSha256})),
      outputMedia:f.outputMedia,expectedAudio:f.expectedAudio,expectedFrameCount:4,nativeCoverage:f.coverage,
      visibilitySelection:f.visibilitySelection??null,visibilityComposition:f.visibilityComposition??null}};
}
function record(f){return {schemaVersion:'digest-representative-verification-record-v001',planId:f.q.job.planId,approvedJobBinding:f.q.jobBinding,authorizationBinding:f.q.authorizationBinding,
  manifestBinding:f.q.job.inputs.candidateManifestBinding,typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,rendererPlanCanonicalSha256:canonicalSha(f.plan),
  completedMedia:{fileSha256:f.media.fileSha256,sizeBytes:f.media.sizeBytes},confirmedAt:new Date().toISOString(),
  representatives:[{instructionId:'first',startFrame:0,endFrameExclusive:2,observedAtFrame:1,method:'text-clock-context',result:'accepted',evidenceBinding:f.save(f.out+'/evidence.json',{synthetic:true}),note:'Synthetic structural fixture only; no actual human viewing.'}],
  observations:{wholeVideoPlayback:'not-evaluated',audioListening:'not-evaluated',humanQualityAdoption:'not-evaluated'}};}
async function savedPending(f,w){
  const verification=await w.finish(w.args);assert.equal(verification.status,'confirmation-pending');
  const draw={resolvedPlan:f.plan,applicationResults:f.applications,overlayRecords:w.args.overlayRecords,outputMedia:f.outputMedia,completedExpectedAudio:f.expectedAudio,nativeCoverage:f.coverage,
    ...(f.visibilitySelection?{visibilitySelection:f.visibilitySelection,visibilityComposition:f.visibilityComposition}:{})};
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


// A bound-byte structural fixture, not a genuine encoder or human observation.
function visibilityFixture(decisions = ['suppress', 'show']) {
  const f = fixture(); f.policy.permittedMethods = ['still-frame', 'text-clock-context'];
  f.coverage.policyCanonicalSha256 = canonicalSha(f.policy);
  const manifest = f.save(f.out + '/manifest.json', {synthetic: 'current visibility manifest'});
  const adoption = f.save(f.out + '/adoption.json', {synthetic: 'explicit cue adoption'});
  f.q.job.inputs.candidateManifestBinding = manifest; f.bindings.manifestBinding = manifest;
  const selection = {schemaVersion: 'digest-caption-visibility-selection-v001', mode: 'explicit-cue-adoption-v001',
    adoptionBinding: adoption, manifestBinding: manifest, rendererPlanCanonicalSha256: canonicalSha(f.plan),
    entries: f.plan.elements.map((e, i) => ({instructionId: e.instructionId, decision: decisions[i]})),
    counts: {totalInstructions: 2, shownInstructions: decisions.filter(d => d === 'show').length, suppressedInstructions: decisions.filter(d => d === 'suppress').length}};
  const shown = selection.entries.filter(e => e.decision === 'show').map(e => e.instructionId), suppressed = selection.entries.filter(e => e.decision === 'suppress').map(e => e.instructionId);
  const graph = '[0:v]fps=30,format=yuv420p[video]';
  const composition = {schemaVersion: 'digest-caption-visibility-composition-v001', selectionCanonicalSha256: canonicalSha(selection),
    rendererPlanCanonicalSha256: canonicalSha(f.plan), adoptionBinding: adoption, manifestBinding: manifest,
    shownInstructionIds: shown, suppressedInstructionIds: suppressed, counts: selection.counts,
    rangeEvidence: [{startFrame: 0, endFrameExclusive: 4, shownInstructionIds: shown, graphSha256: hash(graph)}]};
  f.visibilitySelection = selection; f.visibilityComposition = composition;
  f.compositeReceipt = {schemaVersion: 'digest-formal-low-memory-composite-v001', status: 'completed', expectedOverlayCount: 2,
    scope: {startFrame: 0, endFrameExclusive: 4, frameCount: 4}, visibilityComposition: composition,
    segments: [{range: {startFrame: 0, endFrameExclusive: 4}, shownInstructionIds: shown, graphSha256: hash(graph),
      captionCount: shown.length, stateCount: shown.length, inputCount: shown.length + 1, exitCode: 0, signal: null,
      args: ['-i', 'synthetic base', ...shown.flatMap(id => ['-i', 'synthetic ' + id + '.png']), '-filter_complex', graph, '-frames:v', '4']}]};
  f.compositionBinding = f.save(f.out + '/low-memory-composite.json', f.compositeReceipt);
  return f;
}
function visibilityRecord(f) {
  const r = record(f); r.schemaVersion = 'digest-representative-verification-record-v002';
  r.visibilitySelectionCanonicalSha256 = canonicalSha(f.visibilitySelection);
  r.representatives[0].method = 'still-frame'; r.representatives[0].expectedVisibility = f.visibilitySelection.entries[0].decision === 'show' ? 'shown' : 'suppressed';
  r.representatives[0].note = 'Synthetic structural fixture; expected visibility only, no real pixels or viewing.';
  return r;
}
async function savedCompleted(f, w) {
  const s = await savedPending(f, w); f.save(f.policy.confirmationRecordPath, visibilityRecord(f));
  const verification = await w.finish(w.args);
  const execution = f.save(f.out + '/renderer-result.json', {exitCode: 0, result: {status: 'completed', verification, qc: verification, commonCorePlan: f.plan,
    publication: {status: 'published', outputDirectory: path.dirname(f.bindings.completedMedia.path)}}});
  const p = {...s.p, status: 'completed', complete: true, completedAt: new Date().toISOString(), verification, humanQuality: 'not-evaluated', outlineChoice: null,
    result: {...s.p.result, status: 'completed', complete: true, qc: verification.status, verification, counterfactualQcExecuted: false, execution,
      admission: f.save(f.out + '/admission.json', {synthetic: true}), lineLayout: f.save(f.out + '/line-layout.json', {synthetic: true})}};
  const receiptBinding = f.save(f.out + '/result.json', p);
  return {p, receiptBinding, options: {qualified: f.q, receiptBinding, trustedReceiptSha256: receiptBinding.fileSha256}};
}
for (const decisions of [['suppress','show'], ['suppress','suppress']]) test('actual factory -> pending/get -> record-only -> completed read preserves explicit adoption with ' + decisions.filter(d => d === 'show').length + ' shown', async () => {
  const f = visibilityFixture(decisions), w = wiring(f), s = await savedPending(f, w);
  assert.equal(s.verification.status, 'confirmation-pending'); assert.equal(s.verification.complete, false);
  const pending = await w.readPending(s.options); assert.deepEqual(pending.technicalEvidence.visibilitySelection, f.visibilitySelection);
  assert.deepEqual(pending.technicalEvidence.visibilityCompositionBinding, f.compositionBinding);
  assert.equal(pending.pendingReceipt.verification.checks.nativeSampling.summary.primaryInspectionCount, 2);
  const r = visibilityRecord(f); f.save(f.policy.confirmationRecordPath, r);
  const completed = await w.requalify({pending, recordContext: {...w.context, scope: 'digest-record-only-finalization-v001', pending}});
  assert.equal(completed.status, 'passed-representative'); assert.equal(completed.checks.visibilityAdoption.shownRepresentativeCount, 0);
  assert.equal(completed.checks.visibilityAdoption.suppressedRepresentativeCount, 1); assert.equal(completed.checks.fullVisibility.status, 'not-executed');
  assert.deepEqual(completed.visibilitySelection, f.visibilitySelection); assert.deepEqual(completed.visibilityCompositionBinding, f.compositionBinding);
  // The original manufacture finish can also complete directly after a genuine record; reader uses actual caller shape.
  f.files.delete(f.guest + '/' + f.policy.confirmationRecordPath);
  const saved = await savedCompleted(f, w), read = await w.readCompleted(saved.options);
  assert.equal(read.status, 'completed'); assert.deepEqual(read.verification.visibilitySelection, f.visibilitySelection);
  assert.deepEqual(read.verification.checks.visibilityAdoption.counts, f.visibilitySelection.counts);
});
test('v002 confirmation is required and suppressed absence needs a real-media method, with issue-found staying failed', async () => {
  for (const alter of [r => r.schemaVersion = 'digest-representative-verification-record-v001', r => delete r.visibilitySelectionCanonicalSha256,
    r => r.visibilitySelectionCanonicalSha256 = hash('other selection'), r => r.representatives[0].expectedVisibility = 'shown',
    r => r.representatives[0].method = 'text-clock-context', r => r.representatives[0].result = 'issue-found']) {
    const f = visibilityFixture(), w = wiring(f), r = visibilityRecord(f); alter(r); f.save(f.policy.confirmationRecordPath, r);
    assert.equal((await w.finish(w.args)).status, 'failed');
  }
  const f = fixture(), w = wiring(f), r = record(f); r.schemaVersion = 'digest-representative-verification-record-v002';
  f.save(f.policy.confirmationRecordPath, r); assert.equal((await w.finish(w.args)).status, 'failed', 'null adoption remains v001-only');
});
test('actual saved composition must exist, bind the complete clock and match successful child command evidence', async () => {
  for (const alter of [f => f.files.delete(f.guest + '/' + f.compositionBinding.path),
    f => {f.compositeReceipt.segments[0].exitCode = 1; f.save(f.compositionBinding.path, f.compositeReceipt);},
    f => {f.compositeReceipt.segments[0].inputCount++; f.save(f.compositionBinding.path, f.compositeReceipt);},
    f => {f.compositeReceipt.segments[0].args[1] = 'changed base'; f.compositeReceipt.segments[0].args.push('-i', 'extra hidden PNG'); f.save(f.compositionBinding.path, f.compositeReceipt);},
    f => {f.compositeReceipt.segments[0].args[f.compositeReceipt.segments[0].args.indexOf('-filter_complex')+1] = 'foreign graph'; f.save(f.compositionBinding.path, f.compositeReceipt);},
    f => {f.compositeReceipt.scope.frameCount--; f.save(f.compositionBinding.path, f.compositeReceipt);},
    f => {f.compositeReceipt.expectedOverlayCount--; f.save(f.compositionBinding.path, f.compositeReceipt);}]) {
    const f = visibilityFixture(); alter(f); const w = wiring(f); await assert.rejects(w.finish(w.args));
  }
  const f = visibilityFixture(), w = wiring(f);
  await assert.rejects(w.finish({...w.args, visibilitySelection: null, visibilityComposition: null}), /VISIBILITY_INPUT_SUBSTITUTION/);
  await assert.rejects(w.finish({...w.args, nativeCoverage: null}), /VISIBILITY_NATIVE_EVIDENCE_REQUIRED/);
});
test('pending and completed reads reject current adoption substitution and saved composition byte changes', async () => {
  const f = visibilityFixture(), w = wiring(f), s = await savedPending(f, w);
  const original = clone(f.visibilitySelection); f.visibilitySelection.entries[0].decision = 'show';
  await assert.rejects(w.readPending(s.options), /PENDING_CURRENT_VISIBILITY_CHANGED/); f.visibilitySelection = original; w.args.visibilitySelection = original;
  const oldBytes = f.files.get(f.guest + '/' + f.compositionBinding.path); f.files.set(f.guest + '/' + f.compositionBinding.path, Buffer.from('changed composition'));
  await assert.rejects(w.readPending(s.options), /PENDING_SAVED_BYTES_CHANGED/); f.files.set(f.guest + '/' + f.compositionBinding.path, oldBytes);
  const saved = await savedCompleted(f, w); f.visibilitySelection = {...f.visibilitySelection, manifestBinding: {...f.visibilitySelection.manifestBinding, fileSha256: hash('changed manifest')}};
  await assert.rejects(w.readCompleted(saved.options), /COMPLETED_VISIBILITY_ADOPTION_CHANGED/);
});
test('stripping pending adoption or substituting record-only input never completes', async () => {
  const f = visibilityFixture(), w = wiring(f), s = await savedPending(f, w), t = JSON.parse(f.files.get(f.guest + '/' + s.p.technicalEvidenceBinding.path));
  delete t.visibilitySelection; const ref = f.save(s.p.technicalEvidenceBinding.path, t); s.p.technicalEvidenceBinding = ref; s.p.result.technicalEvidenceBinding = ref;
  const rb = f.save(f.out + '/result.json', s.p); await assert.rejects(w.readPending({...s.options, pendingReceiptBinding: rb, trustedPendingReceiptSha256: rb.fileSha256}), /VISIBILITY_SELECTION_SUBSTITUTION/);
  const fresh = visibilityFixture(), fw = wiring(fresh), fs = await savedPending(fresh, fw), pending = await fw.readPending(fs.options);
  fresh.save(fresh.policy.confirmationRecordPath, visibilityRecord(fresh));
  await assert.rejects(fw.finish({...fw.args, storageContext: {...fw.context, scope: 'digest-record-only-finalization-v001', pending},
    visibilityComposition: {...fresh.visibilityComposition, counts: {...fresh.visibilityComposition.counts, suppressedInstructions: 0}}}), /RECORD_ONLY_TECHNICAL_INPUT_SUBSTITUTION/);
});


test('pending/completed readers rederive visibility counts and refuse fabricated visibility pass descriptions', async () => {
  for (const change of [v => v.checks.visibilityAdoption.counts.shownInstructions++,
    v => v.existingRuleEvidence.visibilityAdoption.scope = 'all hidden pixels verified', v => delete v.checks.visibilityAdoption]) {
    const f = visibilityFixture(), w = wiring(f), saved = await savedPending(f, w), altered = clone(saved.p);
    change(altered.verification); altered.result.verification = altered.verification;
    const rb = f.save(f.out + '/result.json', altered);
    await assert.rejects(w.readPending({...saved.options,pendingReceiptBinding:rb,trustedPendingReceiptSha256:rb.fileSha256}), /PENDING_VISIBILITY_|RECORDED_VISIBILITY_/);
  }
  const f = visibilityFixture(), w = wiring(f), saved = await savedCompleted(f, w), altered = clone(saved.p);
  altered.verification.checks.visibilityAdoption.shownRepresentativeCount = 1;
  altered.result.verification = altered.verification;
  const execution = JSON.parse(f.files.get(f.guest + '/' + altered.result.execution.path)); execution.result.verification = altered.verification; execution.result.qc = altered.verification;
  altered.result.execution = f.save(altered.result.execution.path, execution);
  const rb = f.save(f.out + '/result.json', altered);
  await assert.rejects(w.readCompleted({...saved.options,receiptBinding:rb,trustedReceiptSha256:rb.fileSha256}), /COMPLETED_VISIBILITY_COUNTS_CHANGED/);
});
test('full-mode completed read rechecks current null adoption and does not accept hidden-caption metadata', async () => {
  const f = fixture(), w = wiring(f); delete f.q.job.verificationPolicy; delete f.q.authorization.verificationPolicy;
  const rules = {schemaVersion:'presentation-render-qc-v002',status:'passed',instructionCount:2,violations:[],
    checks:{instructionApplication:{status:'passed'},layoutAndVisibility:{status:'passed'},media:{status:'passed'}},mediaEvidence:{expectedFrameCount:4}};
  const execution = f.save(f.out + '/renderer-result.json',{exitCode:0,result:{status:'completed',qc:rules,commonCorePlan:f.plan,
    publication:{status:'published',outputDirectory:path.dirname(f.bindings.completedMedia.path)}}});
  const planBinding = f.save(f.out + '/core-plan.json',{schemaVersion:'digest-approved-candidate-core-plan-v001',planId:f.q.job.planId,outputRoot:f.out,
    approvedJobBinding:f.q.jobBinding,approvalRecordBinding:f.q.authorizationBinding,acceptedManifestBinding:f.q.job.inputs.candidateManifestBinding,
    typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,implementationBindings:[]});
  const p = {schemaVersion:'digest-approved-manufacturing-result-v001',status:'completed',complete:true,completedAt:new Date().toISOString(),technicalQc:'passed',
    approvedJobBinding:f.q.jobBinding,authorizationBinding:f.q.authorizationBinding,implementationSha:f.q.job.implementation.sha,
    typographySettingsBinding:f.q.job.inputs.typographySettingsBinding,planBinding,humanQuality:'not-evaluated',outlineChoice:null,
    result:{status:'completed',qc:'passed',execution,admission:f.save(f.out + '/admission.json',{synthetic:true}),lineLayout:f.save(f.out + '/line-layout.json',{synthetic:true}),
      video:{path:f.media.path,fileSha256:f.media.fileSha256}}};
  const rb = f.save(f.out + '/result.json',p), opts = {qualified:f.q,receiptBinding:rb,trustedReceiptSha256:rb.fileSha256};
  assert.equal((await w.readCompleted(opts)).status,'completed'); assert.equal(f.currentVisibilityReads,1);
  f.visibilitySelection = {schemaVersion:'synthetic nonnull adoption'};
  await assert.rejects(w.readCompleted(opts), /COMPLETED_FULL_MODE_VISIBILITY_FORBIDDEN/);
});

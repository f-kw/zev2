/** Representative completion for one qualified Normal job; no general QC waiver. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const qualifiedResults=new WeakMap();
const qualifiedPending=new WeakMap();
const HASH=/^[a-f0-9]{64}$/u;
const METHODS=['still-frame','text-clock-context','video-playback'];
const schema='digest-representative-completion-v001';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonicalSha=value=>digest(canonicalJson(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function exact(value,keys,label){assert(object(value),label);assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),label);}
function freeze(value){if(object(value)||Array.isArray(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function relative(value){assert(typeof value==='string'&&/^[A-Za-z0-9._\-/]+$/u.test(value)&&!value.startsWith('/')&&!value.split('/').some(p=>['','.','..'].includes(p)),'REPRESENTATIVE_PATH_INVALID');return value;}
function binding(value){assert(object(value)&&typeof value.path==='string'&&HASH.test(value.fileSha256),'REPRESENTATIVE_BINDING_INVALID');
  assert(Number.isSafeInteger(value.sizeBytes)&&value.sizeBytes>0,'REPRESENTATIVE_BINDING_SIZE_REQUIRED');}

export function validateDigestRepresentativeVerificationPolicyV001(policy,outputRoot){
  exact(policy,['schemaVersion','mode','representativeInstructionIds','permittedMethods','confirmationRecordPath'],'REPRESENTATIVE_POLICY_FIELDS');
  assert.equal(policy.schemaVersion,'digest-representative-verification-policy-v001');assert.equal(policy.mode,'representative-plus-rules-v001');
  for(const key of ['representativeInstructionIds','permittedMethods']){
    assert(Array.isArray(policy[key])&&policy[key].length>0&&policy[key].every(v=>typeof v==='string'&&v.trim().length>0),'REPRESENTATIVE_POLICY_SELECTION_REQUIRED');
    assert.equal(new Set(policy[key]).size,policy[key].length,'REPRESENTATIVE_POLICY_DUPLICATE');
  }
  assert(policy.permittedMethods.every(method=>METHODS.includes(method)),'REPRESENTATIVE_METHOD_INVALID');
  assert(relative(policy.confirmationRecordPath).startsWith(relative(outputRoot)+'/')&&policy.confirmationRecordPath.endsWith('.json'),'REPRESENTATIVE_RECORD_OUTPUT_ROOT');
  return policy;
}

export function validateDigestRepresentativeSelectionV001(policy,plan){
  assert(Array.isArray(plan?.elements)&&plan.elements.length>0,'REPRESENTATIVE_NORMAL_PLAN_REQUIRED');
  assert(!plan.elements.some(e=>Object.hasOwn(e,'presentationPulse')||Object.hasOwn(e,'presentationMotion')),'REPRESENTATIVE_NORMAL_ONLY');
  const ids=plan.elements.map(e=>e.instructionId);assert.equal(new Set(ids).size,ids.length,'REPRESENTATIVE_PLAN_DUPLICATE');
  assert(policy.representativeInstructionIds.every(id=>ids.includes(id)),'REPRESENTATIVE_SELECTION_NOT_IN_PLAN');
}

export async function resolveApprovedDigestVerificationPolicyV001(storageContext){
  if(storageContext?.approvedJob===undefined)return null;
  if(storageContext.scope==='digest-record-only-finalization-v001'){
    const {assertQualifiedDigestRecordFinalizationContextV001}=await import(pathToFileURL(path.join(ROOT,'runner/src/digest-approved-record-finalize-v001.ts')).href);
    await assertQualifiedDigestRecordFinalizationContextV001(storageContext);
  }else{
    const {assertQualifiedApprovedDigestStorageContextV001}=await import(pathToFileURL(path.join(ROOT,'runner/src/digest-approved-job-runner-v001.ts')).href);
    await assertQualifiedApprovedDigestStorageContextV001(storageContext);
  }
  const q=storageContext.approvedJob;
  if(q.job.verificationPolicy===undefined)return null;
  validateDigestRepresentativeVerificationPolicyV001(q.job.verificationPolicy,q.job.outputRoot);
  assert.deepEqual(q.authorization.verificationPolicy,q.job.verificationPolicy,'REPRESENTATIVE_POLICY_AUTHORIZATION_MISMATCH');
  return q.job.verificationPolicy;
}

function frameInterval(element){
  const {startFrame,endFrameExclusive}=element;
  assert(Number.isSafeInteger(startFrame)&&Number.isSafeInteger(endFrameExclusive)&&startFrame>=0&&endFrameExclusive>startFrame,'REPRESENTATIVE_ELEMENT_CLOCK_REQUIRED');
  return {startFrame,endFrameExclusive};
}

/** Pure structural evaluation does not mint a result capability or publish media. */
export function evaluateDigestRepresentativeCompletionV001({policy,bindings,plan,ruleQc,representativeRecord=null,representativeRecordBinding=null}){
  validateDigestRepresentativeVerificationPolicyV001(policy,bindings.outputRoot);validateDigestRepresentativeSelectionV001(policy,plan);
  binding(bindings.completedMedia);assert(HASH.test(bindings.rendererPlanCanonicalSha256));
  const violations=[];
  const wholeRulesPassed=ruleQc?.status==='passed'&&ruleQc?.checks?.instructionApplication?.status==='passed'
    &&ruleQc?.checks?.layoutAndVisibility?.status==='passed'&&ruleQc?.instructionCount===plan.elements.length;
  const mediaPassed=ruleQc?.checks?.media?.status==='passed';
  if(!wholeRulesPassed||!mediaPassed||ruleQc?.violations?.length!==0)violations.push({code:'REPRESENTATIVE_RULE_OR_MEDIA_FAILED',details:{originalViolations:ruleQc?.violations??null}});
  const actual=ruleQc?.mediaEvidence?.observed?.audio,expected=ruleQc?.mediaEvidence?.expectedAudio;
  const audioPassed=expected?.present===false?!actual:expected?.present===true&&HASH.test(expected.packetPayloadSha256??'')
    &&actual?.packetPayloadSha256===expected.packetPayloadSha256&&actual?.codecName===expected.codecName;
  if(!audioPassed)violations.push({code:'REPRESENTATIVE_AUDIO_PRESERVATION_FAILED'});
  let pending=representativeRecord===null,representatives=[];
  if(!pending){try{
    const r=representativeRecord;
    exact(r,['schemaVersion','planId','approvedJobBinding','authorizationBinding','manifestBinding','typographySettingsBinding',
      'rendererPlanCanonicalSha256','completedMedia','confirmedAt','representatives','observations'],'REPRESENTATIVE_RECORD_FIELDS');
    assert.equal(r.schemaVersion,'digest-representative-verification-record-v001');
    for(const key of ['planId','approvedJobBinding','authorizationBinding','manifestBinding','typographySettingsBinding','rendererPlanCanonicalSha256'])assert.deepEqual(r[key],bindings[key],'REPRESENTATIVE_RECORD_'+key+'_MISMATCH');
    exact(r.completedMedia,['fileSha256','sizeBytes'],'REPRESENTATIVE_RECORD_MEDIA_FIELDS');
    assert.equal(r.completedMedia.fileSha256,bindings.completedMedia.fileSha256,'REPRESENTATIVE_RECORD_MEDIA_SHA_MISMATCH');
    assert.equal(r.completedMedia.sizeBytes,bindings.completedMedia.sizeBytes,'REPRESENTATIVE_RECORD_MEDIA_SIZE_MISMATCH');
    assert(typeof r.confirmedAt==='string'&&Number.isFinite(Date.parse(r.confirmedAt))&&/(?:Z|\+00:00)$/u.test(r.confirmedAt),'REPRESENTATIVE_RECORD_TIME');
    binding(representativeRecordBinding);assert.equal(representativeRecordBinding.path,policy.confirmationRecordPath,'REPRESENTATIVE_RECORD_PATH_MISMATCH');
    exact(r.observations,['wholeVideoPlayback','audioListening','humanQualityAdoption'],'REPRESENTATIVE_OBSERVATIONS_REQUIRED');
    for(const value of Object.values(r.observations))assert.equal(value,'not-evaluated','REPRESENTATIVE_UNSUPPORTED_ADOPTION_OR_WHOLE_VIEW');
    assert(Array.isArray(r.representatives)&&r.representatives.length===policy.representativeInstructionIds.length,'REPRESENTATIVE_RECORD_COVERAGE');
    representatives=r.representatives.map((item,index)=>{
      exact(item,['instructionId','startFrame','endFrameExclusive','observedAtFrame','method','result','evidenceBinding','note'],'REPRESENTATIVE_SAMPLE_FIELDS');
      assert.equal(item.instructionId,policy.representativeInstructionIds[index],'REPRESENTATIVE_SAMPLE_ID_MISMATCH');
      const element=plan.elements.find(e=>e.instructionId===item.instructionId),clock=frameInterval(element);
      assert.equal(item.startFrame,clock.startFrame,'REPRESENTATIVE_SAMPLE_CLOCK_MISMATCH');assert.equal(item.endFrameExclusive,clock.endFrameExclusive,'REPRESENTATIVE_SAMPLE_CLOCK_MISMATCH');
      assert(Number.isSafeInteger(item.observedAtFrame)&&item.observedAtFrame>=clock.startFrame&&item.observedAtFrame<clock.endFrameExclusive,'REPRESENTATIVE_SAMPLE_POSITION');
      assert(policy.permittedMethods.includes(item.method),'REPRESENTATIVE_SAMPLE_METHOD_MISMATCH');
      assert(['accepted','issue-found'].includes(item.result),'REPRESENTATIVE_SAMPLE_RESULT');
      assert(typeof item.note==='string'&&item.note.trim().length>0,'REPRESENTATIVE_SAMPLE_DESCRIPTION');binding(item.evidenceBinding);
      assert(relative(item.evidenceBinding.path).startsWith(bindings.outputRoot+'/'),'REPRESENTATIVE_SAMPLE_EVIDENCE_ROOT');
      if(item.result==='issue-found')violations.push({code:'REPRESENTATIVE_CONFIRMED_ISSUE',relatedIds:[item.instructionId],details:{note:item.note}});
      return structuredClone(item);
    });
  }catch(error){violations.push({code:'REPRESENTATIVE_RECORD_INVALID',details:{reason:error.message}});}}
  const status=violations.length>0?'failed':pending?'confirmation-pending':'passed-representative';
  return freeze({schemaVersion:schema,status,complete:status==='passed-representative',mode:policy.mode,policy:structuredClone(policy),
    bindings:structuredClone(bindings),representativeRecordBinding:representativeRecordBinding?structuredClone(representativeRecordBinding):null,
    checks:{wholeRules:{status:wholeRulesPassed?'passed':'failed',scope:'all-planned-instructions; existing normal input and overlay rules'},
      media:{status:mediaPassed?'passed':'failed',scope:'existing completed-media inspection'},audioPreservation:{status:audioPassed?'passed':'failed',scope:'original AAC packet payload'},
      representatives:{status:status==='passed-representative'?'passed':status==='confirmation-pending'?'pending':'failed',count:representatives.length},
      fullVisibility:{status:'not-executed',scope:'no counterfactual or completed-frame comparison'}},
    observations:{representativeMethods:Object.fromEntries(METHODS.map(m=>[m,{status:representatives.some(r=>r.method===m)?'performed':'not-evaluated',count:representatives.filter(r=>r.method===m).length}])),
      wholeVideoPlayback:'not-evaluated',audioListening:'not-evaluated',humanQualityAdoption:'not-evaluated'},representatives,violations,
    existingRuleEvidence:{instructionApplication:structuredClone(ruleQc?.checks?.instructionApplication??null),
      mediaEvidence:structuredClone(ruleQc?.mediaEvidence??null),violations:structuredClone(ruleQc?.violations??null)}});
}

async function streamSha(file){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
async function stableBinding(file,logicalPath=file){
  assert(path.isAbsolute(file)&&path.normalize(file)===file,'REPRESENTATIVE_ABSOLUTE_FILE_REQUIRED');assert.equal(await realpath(file),file,'REPRESENTATIVE_SYMLINK_FILE');
  const before=await lstat(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.size>0n,'REPRESENTATIVE_REGULAR_FILE_REQUIRED');
  const first=await streamSha(file),second=await streamSha(file),after=await lstat(file,{bigint:true});
  for(const key of ['ino','dev','size','mtimeNs','ctimeNs'])assert.equal(after[key],before[key],'REPRESENTATIVE_UNSTABLE_FILE');assert.equal(first,second,'REPRESENTATIVE_UNSTABLE_BYTES');
  return {path:logicalPath,fileSha256:first,sizeBytes:Number(after.size)};
}
function owned(context,file){assert(path.isAbsolute(file)&&file.startsWith(context.generatedRoot+'/'),'REPRESENTATIVE_OWNED_MEDIA_REQUIRED');}
async function verifyReference(context,ref){binding(ref);assert(relative(ref.path).startsWith(context.outputRoot+'/'),'REPRESENTATIVE_REFERENCE_ROOT');const actual=await stableBinding(context.resolve(ref.path),ref.path);assert.deepEqual(actual,ref,'REPRESENTATIVE_REFERENCE_BYTES_CHANGED');}

export async function finishApprovedDigestRepresentativeCompletionV001({storageContext,plan,workVideo,applicationResults,overlayRecords,outputMedia,expectedAudio,expectedFrameCount}){
  const policy=await resolveApprovedDigestVerificationPolicyV001(storageContext);assert(policy,'QUALIFIED_REPRESENTATIVE_POLICY_REQUIRED');
  if(storageContext.scope==='digest-record-only-finalization-v001'){
    await assertApprovedDigestPendingVerificationV001(storageContext.pending);
    const saved=storageContext.pending.technicalEvidence;
    for(const [actual,expected] of [[plan,saved.plan],[applicationResults,saved.applicationResults],[outputMedia,saved.outputMedia],[expectedAudio,saved.expectedAudio],[expectedFrameCount,saved.expectedFrameCount]])assert.deepEqual(actual,expected,'RECORD_ONLY_TECHNICAL_INPUT_SUBSTITUTION');
    assert.deepEqual(overlayRecords.map(r=>({element:r.element,inspection:r.inspection})),saved.overlayRecords.map(r=>({element:r.element,inspection:r.inspection})),'RECORD_ONLY_OVERLAY_SUBSTITUTION');
  }
  validateDigestRepresentativeSelectionV001(policy,plan);owned(storageContext,workVideo);
  const q=storageContext.approvedJob;assert.equal(expectedFrameCount,q.job.expected.frames,'REPRESENTATIVE_FRAME_BINDING_MISMATCH');
  assert.equal(plan.elements.length,q.job.expected.cues,'REPRESENTATIVE_CUE_BINDING_MISMATCH');
  const {evaluatePresentationRendererQcV002}=await import('./presentation_renderer_qc_v002.mjs');
  const ruleQc=evaluatePresentationRendererQcV002({plan,applicationResults,overlayInspections:overlayRecords.map(r=>r.inspection),
    mediaInspection:outputMedia,expectedAudio,expectedFrameCount,canvas:plan.canvas,requireFinalVisibility:false});
  const completedMedia=await stableBinding(workVideo);
  const bindings={planId:q.job.planId,outputRoot:q.job.outputRoot,approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
    manifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,
    rendererPlanCanonicalSha256:canonicalSha(plan),completedMedia};
  let representativeRecord=null,representativeRecordBinding=null,recordReadError=null;
  try{
    representativeRecordBinding=await stableBinding(storageContext.resolve(policy.confirmationRecordPath),policy.confirmationRecordPath);
    const bytes=await readFile(storageContext.resolve(policy.confirmationRecordPath));assert.equal(digest(bytes),representativeRecordBinding.fileSha256,'REPRESENTATIVE_RECORD_BYTES_CHANGED');
    representativeRecord=JSON.parse(bytes.toString());
  }catch(error){if(error.code!=='ENOENT')recordReadError=error;}
  let result;
  if(recordReadError){result=evaluateDigestRepresentativeCompletionV001({policy,bindings,plan,ruleQc,representativeRecord:{invalidRecord:recordReadError.message},representativeRecordBinding});}
  else result=evaluateDigestRepresentativeCompletionV001({policy,bindings,plan,ruleQc,representativeRecord,representativeRecordBinding});
  if(result.status==='passed-representative'){
    for(const item of result.representatives)await verifyReference(storageContext,item.evidenceBinding);
    await verifyReference(storageContext,representativeRecordBinding);
  }
  await resolveApprovedDigestVerificationPolicyV001(storageContext);
  qualifiedResults.set(result,{storageContext,qualified:q,recordBinding:representativeRecordBinding,
    evidenceBindings:result.representatives.map(item=>item.evidenceBinding),completedMedia});
  return result;
}

/** JSON copies, foreign context, media substitution and changed confirmation evidence never qualify. */
export async function assertQualifiedDigestRepresentativeCompletionV001(result,storageContext,completedMediaPath){
  const saved=qualifiedResults.get(result);assert(saved&&saved.storageContext===storageContext,'QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED');
  assert(['passed-representative','confirmation-pending'].includes(result.status),'REPRESENTATIVE_COMPLETION_REJECTED');
  const policy=await resolveApprovedDigestVerificationPolicyV001(storageContext);assert.deepEqual(policy,result.policy,'REPRESENTATIVE_CURRENT_POLICY_CHANGED');
  assert.equal(storageContext.approvedJob,saved.qualified,'REPRESENTATIVE_CURRENT_JOB_CHANGED');
  owned(storageContext,completedMediaPath);const actual=await stableBinding(completedMediaPath);
  assert.equal(actual.fileSha256,saved.completedMedia.fileSha256,'REPRESENTATIVE_COMPLETED_MEDIA_CHANGED');assert.equal(actual.sizeBytes,saved.completedMedia.sizeBytes,'REPRESENTATIVE_COMPLETED_MEDIA_CHANGED');
  if(saved.recordBinding)await verifyReference(storageContext,saved.recordBinding);
  for(const ref of saved.evidenceBindings)await verifyReference(storageContext,ref);
}

/** Rebind the same actual completed bytes after the owned directory rename. */
export async function rebindPublishedDigestRepresentativeCompletionV001(verification,storageContext,publishedMediaPath){
  await assertQualifiedDigestRepresentativeCompletionV001(verification,storageContext,publishedMediaPath);
  const q=storageContext.approvedJob,canonicalPublished=path.join(q.job.storage.guestRoot,q.job.outputRoot,'render/presentation-rendered-v002.mp4');
  assert.equal(publishedMediaPath,canonicalPublished,'REPRESENTATIVE_PUBLISHED_MEDIA_PATH');
  const completedMedia=await stableBinding(publishedMediaPath);
  const rebound=freeze({...verification,bindings:{...verification.bindings,completedMedia}});
  assert.equal(rebound.status,verification.status);assert.equal(rebound.complete,verification.complete);
  qualifiedResults.set(rebound,{...qualifiedResults.get(verification),completedMedia});
  return rebound;
}

/** Persist only original, actually inspected Normal data and published artifact bindings. */
export async function persistApprovedDigestRepresentativePendingEvidenceV001({draw,verification,storageContext,publishedMediaPath}){
  await assertQualifiedDigestRepresentativeCompletionV001(verification,storageContext,publishedMediaPath);
  assert.equal(verification.status,'confirmation-pending');assert.equal(verification.complete,false);
  assert.equal(verification.bindings.completedMedia.path,publishedMediaPath,'PENDING_PUBLISHED_REFERENCE_REQUIRED');
  const q=storageContext.approvedJob,out=q.job.outputRoot;
  const plan=draw.resolvedPlan;
  assert.equal(canonicalSha(plan),verification.bindings.rendererPlanCanonicalSha256,'PENDING_RENDER_PLAN_CHANGED');
  assert.equal(draw.applicationResults.length,plan.elements.length);assert.equal(draw.overlayRecords.length,plan.elements.length);
  const publishedMediaBinding=await stableBinding(publishedMediaPath,out+'/render/presentation-rendered-v002.mp4');
  const overlayRecords=[];
  for(const [index,r] of draw.overlayRecords.entries()){
    assert.deepEqual(r.element,plan.elements[index],'PENDING_OVERLAY_PLAN_CHANGED');
    const app=draw.applicationResults[index];assert.equal(app.instructionId,r.element.instructionId);
    assert(typeof app.overlayFile==='string'&&relative(app.overlayFile).startsWith('overlays/'),'PENDING_OVERLAY_PATH_INVALID');
    const logicalPath=out+'/render/'+app.overlayFile;
    const pngBinding=await stableBinding(storageContext.resolve(logicalPath),logicalPath);
    assert.equal(pngBinding.fileSha256,r.pngSha256,'PENDING_RENDERED_PNG_CHANGED');assert.equal(app.overlaySha256,pngBinding.fileSha256,'PENDING_APPLICATION_PNG_CHANGED');
    assert.equal(r.inspection.overlaySha256,pngBinding.fileSha256,'PENDING_INSPECTION_PNG_CHANGED');
    // Draw-only props, mask scratch paths and process-local capabilities are not recovery inputs.
    overlayRecords.push({element:structuredClone(r.element),inspection:structuredClone(r.inspection),pngBinding});
  }
  const evidence={schemaVersion:'digest-representative-technical-evidence-v001',planId:q.job.planId,
    approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,manifestBinding:q.job.inputs.candidateManifestBinding,
    typographySettingsBinding:q.job.inputs.typographySettingsBinding,implementationSha:q.job.implementation.sha,
    verificationPolicy:q.job.verificationPolicy,publishedMediaBinding,rendererPlanCanonicalSha256:canonicalSha(plan),
    plan,applicationResults:draw.applicationResults,overlayRecords,outputMedia:draw.outputMedia,
    expectedAudio:draw.completedExpectedAudio,expectedFrameCount:q.job.expected.frames};
  const file=out+'/representative-technical-evidence-v001.json';await storageContext.publish(file,evidence);
  const technicalEvidenceBinding=await stableBinding(storageContext.resolve(file),file);
  await storageContext.readBound(technicalEvidenceBinding);
  await assertQualifiedDigestRepresentativeCompletionV001(verification,storageContext,publishedMediaPath);
  return freeze({technicalEvidenceBinding,publishedMediaBinding});
}

function compareByteRef(expected,actual,label){binding(expected);assert.equal(actual.path,expected.path,label);assert.equal(actual.fileSha256,expected.fileSha256,label);assert.equal(actual.sizeBytes,expected.sizeBytes,label);}
function generatedPath(q,logicalPath){assert(relative(logicalPath).startsWith(q.job.outputRoot+'/'),'PENDING_REFERENCE_ROOT');return path.join(q.job.storage.guestRoot,logicalPath);}
async function readSavedJson(q,ref){
  assert(object(ref)&&HASH.test(ref.fileSha256),'PENDING_JSON_BINDING_INVALID');
  const file=generatedPath(q,ref.path),actual=await stableBinding(file,ref.path);assert.equal(actual.fileSha256,ref.fileSha256,'PENDING_SAVED_BYTES_CHANGED');
  if(ref.sizeBytes!==undefined)assert.equal(actual.sizeBytes,ref.sizeBytes,'PENDING_SAVED_BYTES_CHANGED');
  const bytes=await readFile(file);assert.equal(digest(bytes),ref.fileSha256,'PENDING_SAVED_JSON_CHANGED');const value=JSON.parse(bytes.toString());
  if(ref.schemaVersion!==undefined)assert.equal(value.schemaVersion,ref.schemaVersion,'PENDING_JSON_SCHEMA_CHANGED');
  if(ref.canonicalSha256!==undefined)assert.equal(canonicalSha(value),ref.canonicalSha256,'PENDING_JSON_CANONICAL_CHANGED');return value;
}
async function verifySaved(q,ref){const actual=await stableBinding(generatedPath(q,ref.path),ref.path);compareByteRef(ref,actual,'PENDING_SAVED_ARTIFACT_CHANGED');}
async function assertRecordedJob(q){
  const {assertQualifiedDigestApprovedJobV001}=await import(pathToFileURL(path.join(ROOT,'runner/src/digest-approved-job-v001.ts')).href);
  await assertQualifiedDigestApprovedJobV001(q);
  for(const key of ['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding'])await q.readBinding(q.job.inputs[key]);
  const root=path.join(q.job.storage.guestRoot,q.job.outputRoot);assert.equal(await realpath(root),root,'PENDING_OUTPUT_REAL_PATH_CHANGED');
  assert.equal((await lstat(root)).dev,q.job.storage.guestDevice,'PENDING_OUTPUT_DEVICE_CHANGED');
}


async function assertRecordedInvocation(q,receipt){
  if(receipt.invocationBinding===undefined)return;
  assert.equal(receipt.invocationBinding.path,q.job.outputRoot+'/core-invocation.json','RECORDED_INVOCATION_CANONICAL_PATH');
  const value=await readSavedJson(q,receipt.invocationBinding);assert.equal(value.schemaVersion,'digest-approved-core-invocation-v001');
  for(const [actual,expected] of [[value.approvedJobBinding,q.jobBinding],[value.authorizationBinding,q.authorizationBinding],
    [value.planBinding,receipt.planBinding],[value.acceptedManifestBinding,q.job.inputs.candidateManifestBinding],
    [value.implementationSha,q.job.implementation.sha]])assert.deepEqual(actual,expected,'RECORDED_INVOCATION_BINDING_CHANGED');
}
async function assertPendingJob(q){
  await assertRecordedJob(q);
  validateDigestRepresentativeVerificationPolicyV001(q.job.verificationPolicy,q.job.outputRoot);
  assert.deepEqual(q.authorization.verificationPolicy,q.job.verificationPolicy,'PENDING_POLICY_AUTHORIZATION_CHANGED');
}

/** Read an independently anchored initial completion; this never mints QC/publication authority. */
export async function readApprovedDigestInitialCompletedReceiptV001({qualified:q,receiptBinding,trustedReceiptSha256}){
  await assertRecordedJob(q);exact(receiptBinding,['path','fileSha256','sizeBytes'],'COMPLETED_RECEIPT_BINDING_FIELDS');binding(receiptBinding);
  assert.equal(receiptBinding.path,q.job.outputRoot+'/result.json','COMPLETED_RESULT_CANONICAL_PATH');
  assert(HASH.test(trustedReceiptSha256),'COMPLETED_INDEPENDENT_ANCHOR_REQUIRED');assert.equal(receiptBinding.fileSha256,trustedReceiptSha256,'COMPLETED_ANCHOR_MISMATCH');
  const p=await readSavedJson(q,receiptBinding);
  assert.equal(p.schemaVersion,'digest-approved-manufacturing-result-v001');assert.equal(p.status,'completed');
  assert(typeof p.completedAt==='string'&&Number.isFinite(Date.parse(p.completedAt))&&/(?:Z|\+00:00)$/u.test(p.completedAt),'COMPLETED_TIME_REQUIRED');
  for(const [actual,expected] of [[p.approvedJobBinding,q.jobBinding],[p.authorizationBinding,q.authorizationBinding],
    [p.implementationSha,q.job.implementation.sha],[p.typographySettingsBinding,q.job.inputs.typographySettingsBinding]])assert.deepEqual(actual,expected,'COMPLETED_JOB_BINDING_CHANGED');
  assert.equal(p.humanQuality,'not-evaluated');assert.equal(p.outlineChoice,null);
  assert.equal(p.planBinding.path,q.job.outputRoot+'/core-plan.json');const corePlan=await readSavedJson(q,p.planBinding);
  assert.equal(corePlan.schemaVersion,'digest-approved-candidate-core-plan-v001');
  for(const [actual,expected] of [[corePlan.planId,q.job.planId],[corePlan.outputRoot,q.job.outputRoot],
    [corePlan.approvedJobBinding,q.jobBinding],[corePlan.approvalRecordBinding,q.authorizationBinding],
    [corePlan.acceptedManifestBinding,q.job.inputs.candidateManifestBinding],[corePlan.typographySettingsBinding,q.job.inputs.typographySettingsBinding],
    [corePlan.implementationBindings,q.job.implementation.bindings],[corePlan.verificationPolicy,q.job.verificationPolicy]])assert.deepEqual(actual,expected,'COMPLETED_CORE_PLAN_CHANGED');
  await assertRecordedInvocation(q,p);
  for(const key of ['execution','admission','lineLayout'])assert(object(p.result[key]),'COMPLETED_RENDER_REFERENCE_REQUIRED');
  assert.equal(p.result.execution.path,q.job.outputRoot+'/renderer-result.json');
  const execution=await readSavedJson(q,p.result.execution);assert.equal(execution.exitCode,0);assert.equal(execution.result.status,'completed');
  await readSavedJson(q,p.result.admission);await readSavedJson(q,p.result.lineLayout);
  const mediaPath=q.job.outputRoot+'/render/presentation-rendered-v002.mp4';assert.equal(p.result.video.path,mediaPath);
  const media=await stableBinding(generatedPath(q,mediaPath),mediaPath);assert.equal(media.fileSha256,p.result.video.fileSha256,'COMPLETED_MEDIA_BYTES_CHANGED');
  assert.equal(execution.result.publication.status,'published');assert.equal(execution.result.publication.outputDirectory,path.dirname(generatedPath(q,mediaPath)));
  if(q.job.verificationPolicy===undefined){
    assert.equal(p.verification,undefined);assert.equal(p.result.verification,undefined);assert.notEqual(p.complete,false);
    assert.equal(p.technicalQc,'passed');assert.equal(p.result.qc,'passed');
    const qc=execution.result.qc;assert.equal(qc.schemaVersion,'presentation-render-qc-v002');assert.equal(qc.status,'passed');
    assert.equal(qc.instructionCount,q.job.expected.cues);assert.deepEqual(qc.violations,[]);
    for(const key of ['instructionApplication','layoutAndVisibility','media'])assert.equal(qc.checks[key].status,'passed');
    assert.equal(qc.mediaEvidence.expectedFrameCount,q.job.expected.frames);
  }else{
    validateDigestRepresentativeVerificationPolicyV001(q.job.verificationPolicy,q.job.outputRoot);
    assert.deepEqual(q.authorization.verificationPolicy,q.job.verificationPolicy);
    const v=p.verification;assert.equal(v.schemaVersion,schema);assert.equal(v.status,'passed-representative');assert.equal(v.complete,true);assert.equal(p.complete,true);
    assert.equal(p.result.qc,v.status);assert.equal(p.result.status,'completed');assert.equal(p.result.complete,true);
    assert.deepEqual(p.result.verification,v);assert.deepEqual(execution.result.verification,v);assert.deepEqual(execution.result.qc,v);
    assert.deepEqual(v.policy,q.job.verificationPolicy);assert.equal(v.checks.fullVisibility.status,'not-executed');assert.deepEqual(v.violations,[]);
    for(const key of ['wholeRules','media','audioPreservation','representatives'])assert.equal(v.checks[key].status,'passed');
    for(const [actual,expected] of [[v.bindings.planId,q.job.planId],[v.bindings.outputRoot,q.job.outputRoot],
      [v.bindings.approvedJobBinding,q.jobBinding],[v.bindings.authorizationBinding,q.authorizationBinding],
      [v.bindings.manifestBinding,q.job.inputs.candidateManifestBinding],[v.bindings.typographySettingsBinding,q.job.inputs.typographySettingsBinding],
      [v.bindings.completedMedia,{...media,path:generatedPath(q,mediaPath)}],[p.publishedMediaBinding,media],
      [p.result.publishedMediaBinding,media]])assert.deepEqual(actual,expected,'COMPLETED_REPRESENTATIVE_BINDING_CHANGED');
    const plan=execution.result.effectivePlan??execution.result.commonCorePlan;assert.equal(canonicalSha(plan),v.bindings.rendererPlanCanonicalSha256,'COMPLETED_RENDER_PLAN_CHANGED');
    const record=await readSavedJson(q,v.representativeRecordBinding);await verifySaved(q,v.representativeRecordBinding);
    for(const item of v.representatives)await verifySaved(q,item.evidenceBinding);
    // The original QC is read under the independent receipt anchor. Re-evaluate
    // only the confirmation record's IDs/clocks/methods/media/evidence structure.
    const rules={status:v.existingRuleEvidence.violations?.length===0?'passed':'failed',instructionCount:plan.elements.length,
      checks:{instructionApplication:v.existingRuleEvidence.instructionApplication,layoutAndVisibility:{status:v.checks.wholeRules.status},media:{status:v.checks.media.status}},
      mediaEvidence:v.existingRuleEvidence.mediaEvidence,violations:v.existingRuleEvidence.violations};
    const checked=evaluateDigestRepresentativeCompletionV001({policy:q.job.verificationPolicy,bindings:v.bindings,plan,ruleQc:rules,
      representativeRecord:record,representativeRecordBinding:v.representativeRecordBinding});
    assert.equal(checked.status,'passed-representative','COMPLETED_CONFIRMATION_RECORD_CHANGED');assert.deepEqual(checked.representatives,v.representatives);
    assert.deepEqual(checked.observations,v.observations);assert.equal(p.result.counterfactualQcExecuted,false);
  }
  await assertRecordedJob(q);await verifySaved(q,receiptBinding);
  const finalMedia=await stableBinding(generatedPath(q,mediaPath),mediaPath);assert.deepEqual(finalMedia,media,'COMPLETED_MEDIA_CHANGED_DURING_READ');
  return freeze({...p,receiptBinding:structuredClone(receiptBinding)});
}

/** Rebuild technical qualification from independently anchored pending bytes, never its passed flags. */
export async function readApprovedDigestPendingVerificationV001({qualified:q,pendingReceiptBinding,trustedPendingReceiptSha256}){
  await assertPendingJob(q);binding(pendingReceiptBinding);
  assert.equal(pendingReceiptBinding.path,q.job.outputRoot+'/result.json','PENDING_RESULT_CANONICAL_PATH');
  assert(HASH.test(trustedPendingReceiptSha256),'PENDING_INDEPENDENT_ANCHOR_REQUIRED');assert.equal(pendingReceiptBinding.fileSha256,trustedPendingReceiptSha256,'PENDING_ANCHOR_MISMATCH');
  const p=await readSavedJson(q,pendingReceiptBinding);
  assert.equal(p.schemaVersion,'digest-approved-manufacturing-result-v001');assert.equal(p.status,'confirmation-pending');assert.equal(p.complete,false);assert.equal(p.completedAt,null);
  assert.deepEqual(p.approvedJobBinding,q.jobBinding);assert.deepEqual(p.authorizationBinding,q.authorizationBinding);assert.equal(p.implementationSha,q.job.implementation.sha);
  assert.deepEqual(p.typographySettingsBinding,q.job.inputs.typographySettingsBinding);
  const corePlan=await readSavedJson(q,p.planBinding);
  for(const [actual,expected] of [[corePlan.planId,q.job.planId],[corePlan.outputRoot,q.job.outputRoot],[corePlan.approvedJobBinding,q.jobBinding],
    [corePlan.approvalRecordBinding,q.authorizationBinding],[corePlan.acceptedManifestBinding,q.job.inputs.candidateManifestBinding],
    [corePlan.typographySettingsBinding,q.job.inputs.typographySettingsBinding],[corePlan.verificationPolicy,q.job.verificationPolicy]])assert.deepEqual(actual,expected,'PENDING_CORE_PLAN_CHANGED');
  await assertRecordedInvocation(q,p);
  const v=p.verification;assert.equal(v.schemaVersion,schema);assert.equal(v.status,'confirmation-pending');assert.equal(v.complete,false);
  assert.equal(v.checks.fullVisibility.status,'not-executed');assert.deepEqual(v.policy,q.job.verificationPolicy);
  assert.deepEqual(p.result.verification,v,'PENDING_RESULT_VERIFICATION_MISMATCH');
  for(const [actual,expected] of [[v.bindings.planId,q.job.planId],[v.bindings.outputRoot,q.job.outputRoot],[v.bindings.approvedJobBinding,q.jobBinding],
    [v.bindings.authorizationBinding,q.authorizationBinding],[v.bindings.manifestBinding,q.job.inputs.candidateManifestBinding],
    [v.bindings.typographySettingsBinding,q.job.inputs.typographySettingsBinding]])assert.deepEqual(actual,expected,'PENDING_VERIFICATION_JOB_MISMATCH');
  const technicalEvidenceBinding=p.technicalEvidenceBinding;
  const publishedMediaBinding=p.publishedMediaBinding;
  assert(technicalEvidenceBinding&&publishedMediaBinding,'PENDING_RECOVERY_EVIDENCE_REQUIRED');
  assert.deepEqual(technicalEvidenceBinding,p.result.technicalEvidenceBinding,'PENDING_TECHNICAL_REFERENCE_MISMATCH');assert.deepEqual(publishedMediaBinding,p.result.publishedMediaBinding,'PENDING_MEDIA_REFERENCE_MISMATCH');
  assert.equal(technicalEvidenceBinding.path,q.job.outputRoot+'/representative-technical-evidence-v001.json','PENDING_TECHNICAL_CANONICAL_PATH');
  assert.equal(publishedMediaBinding.path,q.job.outputRoot+'/render/presentation-rendered-v002.mp4','PENDING_MEDIA_CANONICAL_PATH');
  assert.equal(p.result.video.path,publishedMediaBinding.path);assert.equal(p.result.video.fileSha256,publishedMediaBinding.fileSha256);
  assert.deepEqual(v.bindings.completedMedia,{...publishedMediaBinding,path:generatedPath(q,publishedMediaBinding.path)},'PENDING_STAGING_OR_FOREIGN_MEDIA_REFERENCE');
  const t=await readSavedJson(q,technicalEvidenceBinding);
  assert.equal(t.schemaVersion,'digest-representative-technical-evidence-v001');
  for(const [actual,expected] of [[t.planId,q.job.planId],[t.approvedJobBinding,q.jobBinding],[t.authorizationBinding,q.authorizationBinding],
    [t.manifestBinding,q.job.inputs.candidateManifestBinding],[t.typographySettingsBinding,q.job.inputs.typographySettingsBinding],
    [t.implementationSha,q.job.implementation.sha],[t.verificationPolicy,q.job.verificationPolicy],[t.publishedMediaBinding,publishedMediaBinding]])assert.deepEqual(actual,expected,'PENDING_TECHNICAL_JOB_MISMATCH');
  assert.equal(t.expectedFrameCount,q.job.expected.frames);assert.equal(t.plan.elements.length,q.job.expected.cues);validateDigestRepresentativeSelectionV001(q.job.verificationPolicy,t.plan);
  assert.equal(canonicalSha(t.plan),t.rendererPlanCanonicalSha256,'PENDING_PLAN_CANONICAL_CHANGED');assert.equal(t.rendererPlanCanonicalSha256,v.bindings.rendererPlanCanonicalSha256);
  assert.equal(t.overlayRecords.length,t.plan.elements.length);assert.equal(t.applicationResults.length,t.plan.elements.length);
  await verifySaved(q,publishedMediaBinding);
  for(const [index,r] of t.overlayRecords.entries()){
    exact(r,['element','inspection','pngBinding'],'PENDING_OVERLAY_FIELDS');assert.deepEqual(r.element,t.plan.elements[index]);
    const app=t.applicationResults[index];assert.equal(app.instructionId,r.element.instructionId);
    assert(relative(app.overlayFile).startsWith('overlays/'));assert.equal(r.pngBinding.path,q.job.outputRoot+'/render/'+app.overlayFile);
    assert.equal(app.overlaySha256,r.pngBinding.fileSha256);assert.equal(r.inspection.overlaySha256,r.pngBinding.fileSha256);await verifySaved(q,r.pngBinding);
  }
  const {evaluatePresentationRendererQcV002}=await import('./presentation_renderer_qc_v002.mjs');
  const rules=evaluatePresentationRendererQcV002({plan:t.plan,applicationResults:t.applicationResults,overlayInspections:t.overlayRecords.map(r=>r.inspection),
    mediaInspection:t.outputMedia,expectedAudio:t.expectedAudio,expectedFrameCount:t.expectedFrameCount,canvas:t.plan.canvas,requireFinalVisibility:false});
  const rebuilt=evaluateDigestRepresentativeCompletionV001({policy:q.job.verificationPolicy,bindings:v.bindings,plan:t.plan,ruleQc:rules});
  assert.equal(rebuilt.status,'confirmation-pending','PENDING_RULE_OR_MEDIA_REVALIDATION_FAILED');
  // Original validation observations are rederived above; no saved status authorizes finalization.
  const pending=freeze({qualified:q,pendingReceiptBinding:structuredClone(pendingReceiptBinding),pendingReceipt:p,
    technicalEvidenceBinding,technicalEvidence:t,publishedMediaBinding,policy:q.job.verificationPolicy});
  qualifiedPending.set(pending,{qualified:q,pendingReceiptBinding:structuredClone(pendingReceiptBinding),technicalEvidenceBinding,publishedMediaBinding,
    pngBindings:t.overlayRecords.map(r=>r.pngBinding)});
  await assertApprovedDigestPendingVerificationV001(pending);return pending;
}

export async function assertApprovedDigestPendingVerificationV001(pending){
  const saved=qualifiedPending.get(pending);assert(saved,'QUALIFIED_RECORDED_PENDING_REQUIRED');await assertPendingJob(saved.qualified);
  for(const ref of [saved.pendingReceiptBinding,saved.technicalEvidenceBinding,saved.publishedMediaBinding,...saved.pngBindings])await verifySaved(saved.qualified,ref);
}

export async function requalifyApprovedDigestRecordedRepresentativeV001({pending,recordContext}){
  await assertApprovedDigestPendingVerificationV001(pending);
  assert.equal(recordContext.scope,'digest-record-only-finalization-v001');assert.equal(recordContext.pending,pending,'RECORD_ONLY_PENDING_SUBSTITUTION');
  assert.equal(recordContext.approvedJob,pending.qualified,'RECORD_ONLY_JOB_SUBSTITUTION');
  await resolveApprovedDigestVerificationPolicyV001(recordContext);
  const t=pending.technicalEvidence;
  const result=await finishApprovedDigestRepresentativeCompletionV001({storageContext:recordContext,plan:t.plan,
    workVideo:generatedPath(pending.qualified,pending.publishedMediaBinding.path),applicationResults:t.applicationResults,
    overlayRecords:t.overlayRecords.map(r=>({element:r.element,inspection:r.inspection})),outputMedia:t.outputMedia,
    expectedAudio:t.expectedAudio,expectedFrameCount:t.expectedFrameCount});
  await assertApprovedDigestPendingVerificationV001(pending);return result;
}

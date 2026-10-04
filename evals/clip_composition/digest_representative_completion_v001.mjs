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
  const {assertQualifiedApprovedDigestStorageContextV001}=await import(pathToFileURL(path.join(ROOT,'runner/src/digest-approved-job-runner-v001.ts')).href);
  await assertQualifiedApprovedDigestStorageContextV001(storageContext);
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

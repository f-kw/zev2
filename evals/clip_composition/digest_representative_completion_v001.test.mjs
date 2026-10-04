import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validateDigestRepresentativeVerificationPolicyV001 as validatePolicy,validateDigestRepresentativeSelectionV001 as validateSelection,
  evaluateDigestRepresentativeCompletionV001 as evaluate,resolveApprovedDigestVerificationPolicyV001 as resolvePolicy,
  assertQualifiedDigestRepresentativeCompletionV001 as qualify} from './digest_representative_completion_v001.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(ids=['first','third']){
  const out='runtime/artifacts/test-representative/attempt-001';
  const ref=name=>({path:out+'/'+name,fileSha256:hash(name),sizeBytes:name.length});
  const policy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',
    representativeInstructionIds:ids,permittedMethods:['still-frame','text-clock-context','video-playback'],confirmationRecordPath:out+'/representative-confirmation.json'};
  const plan={canvas:{width:1920,height:1080,fps:30},elements:['first','second','third'].map((id,index)=>({instructionId:id,text:id,startFrame:index*60,endFrameExclusive:index*60+45}))};
  const bindings={planId:'test-only',outputRoot:out,approvedJobBinding:ref('job.json'),authorizationBinding:ref('authorization.json'),
    manifestBinding:ref('manifest.json'),typographySettingsBinding:ref('settings.json'),rendererPlanCanonicalSha256:hash(canonicalJson(plan)),completedMedia:ref('made.mp4')};
  const audio={codecName:'aac',packetPayloadSha256:hash('original AAC packets')};
  const ruleQc={status:'passed',instructionCount:3,violations:[],checks:{instructionApplication:{status:'passed'},layoutAndVisibility:{status:'passed'},media:{status:'passed'}},
    mediaEvidence:{observed:{video:{frameCount:180},audio},expectedAudio:{present:true,...audio},expectedFrameCount:180}};
  const representativeRecord={schemaVersion:'digest-representative-verification-record-v001',planId:bindings.planId,
    approvedJobBinding:bindings.approvedJobBinding,authorizationBinding:bindings.authorizationBinding,manifestBinding:bindings.manifestBinding,
    typographySettingsBinding:bindings.typographySettingsBinding,rendererPlanCanonicalSha256:bindings.rendererPlanCanonicalSha256,
    completedMedia:{fileSha256:bindings.completedMedia.fileSha256,sizeBytes:bindings.completedMedia.sizeBytes},confirmedAt:new Date().toISOString(),
    representatives:ids.map((id,index)=>{const e=plan.elements.find(e=>e.instructionId===id);return {instructionId:id,startFrame:e.startFrame,endFrameExclusive:e.endFrameExclusive,
      observedAtFrame:e.startFrame+20,method:index===0?'still-frame':'text-clock-context',result:'accepted',evidenceBinding:ref(id+'.json'),note:'Synthetic evidence for branch validation only; no actual viewing or manufacturing grant.'};}),
    observations:{wholeVideoPlayback:'not-evaluated',audioListening:'not-evaluated',humanQualityAdoption:'not-evaluated'}};
  return {policy,bindings,plan,ruleQc,representativeRecord,representativeRecordBinding:ref('representative-confirmation.json')};
}
test('normal representative structural result separates every scope without full-QC passed',()=>{
  for(const ids of [['second'],['first','second','third']]){
    const r=evaluate(fixture(ids));assert.equal(r.status,'passed-representative');assert.equal(r.complete,true);
    assert.equal(r.checks.fullVisibility.status,'not-executed');assert.equal(r.observations.wholeVideoPlayback,'not-evaluated');
    assert.equal(r.observations.audioListening,'not-evaluated');assert.equal(r.observations.humanQualityAdoption,'not-evaluated');
    assert.equal(r.representatives.length,ids.length);assert.equal(r.existingRuleEvidence.layoutAndVisibility,undefined);assert(Object.isFrozen(r));
  }
});
test('missing post-generation record is confirmation-pending and cannot complete',()=>{
  const f=fixture();f.representativeRecord=null;f.representativeRecordBinding=null;
  const r=evaluate(f);assert.equal(r.status,'confirmation-pending');assert.equal(r.complete,false);assert.equal(r.checks.representatives.status,'pending');
  assert.equal(r.checks.wholeRules.status,'passed');assert.equal(r.checks.media.status,'passed');assert.equal(r.checks.fullVisibility.status,'not-executed');
});
test('different completed bytes, plan, manifest, settings, grant or original renderer plan are rejected',()=>{
  const changes=[f=>f.representativeRecord.completedMedia.fileSha256=hash('other MP4'),f=>f.representativeRecord.completedMedia.sizeBytes++,
    f=>f.representativeRecord.planId='other-plan',f=>f.representativeRecord.manifestBinding={...f.bindings.manifestBinding,fileSha256:hash('other manifest')},
    f=>f.representativeRecord.typographySettingsBinding={...f.bindings.typographySettingsBinding,fileSha256:hash('other font')},
    f=>f.representativeRecord.authorizationBinding={...f.bindings.authorizationBinding,fileSha256:hash('other grant')},f=>f.representativeRecord.rendererPlanCanonicalSha256=hash('other clock')];
  for(const change of changes){const f=fixture();change(f);assert.equal(evaluate(f).status,'failed');}
});
test('incorrect position, method, missing sample and foreign evidence are rejected',()=>{
  const changes=[f=>f.representativeRecord.representatives[0].observedAtFrame=90,f=>f.representativeRecord.representatives[0].startFrame++,
    f=>f.representativeRecord.representatives[0].method='all-captions-visual-qc',f=>f.representativeRecord.representatives.pop(),
    f=>f.representativeRecord.representatives[0].evidenceBinding.path='runtime/artifacts/other/evidence.json',f=>f.representativeRecordBinding.path=f.bindings.outputRoot+'/other-record.json'];
  for(const change of changes){const f=fixture();change(f);assert.equal(evaluate(f).status,'failed');}
});
test('real rule/media/audio failures reject even with an absent confirmation record',()=>{
  const changes=[f=>{f.ruleQc.status='failed';f.ruleQc.violations=[{code:'INSTRUCTION_RENDER_MISSING'}];},
    f=>f.ruleQc.checks.media.status='failed',f=>f.ruleQc.instructionCount--,
    f=>f.ruleQc.mediaEvidence.observed.audio.packetPayloadSha256=hash('changed original audio')];
  for(const change of changes){const f=fixture();change(f);f.representativeRecord=null;f.representativeRecordBinding=null;assert.equal(evaluate(f).status,'failed');}
});
test('a found representative issue rejects and unviewed scope cannot be converted to human adoption',()=>{
  let f=fixture();f.representativeRecord.representatives[0].result='issue-found';assert.equal(evaluate(f).status,'failed');
  for(const key of ['wholeVideoPlayback','audioListening','humanQualityAdoption']){f=fixture();f.representativeRecord.observations[key]='performed';assert.equal(evaluate(f).status,'failed');}
  f=fixture();f.representativeRecord.representatives[0].method='video-playback';const r=evaluate(f);
  assert.equal(r.observations.representativeMethods['video-playback'].status,'performed');assert.equal(r.observations.wholeVideoPlayback,'not-evaluated');
});
test('start policy requires only intended selection/method/path and rejects an unborn MP4 SHA or public waiver',()=>{
  const f=fixture();validatePolicy(f.policy,f.bindings.outputRoot);assert.equal(f.policy.completedMedia,undefined);
  for(const change of [p=>p.completedMedia={fileSha256:hash('unborn')},p=>p.runCounterfactualQc=false,p=>p.representativeInstructionIds=[],p=>p.permittedMethods=['unknown'],p=>p.confirmationRecordPath='runtime/artifacts/other/record.json']){
    const p=structuredClone(f.policy);change(p);assert.throws(()=>validatePolicy(p,f.bindings.outputRoot));
  }
  const p=structuredClone(f.policy);p.representativeInstructionIds=['not-in-plan'];assert.throws(()=>validateSelection(p,f.plan));
});
test('pure evaluation or a JSON copy never grants publication and absent policy keeps the previous mode',async()=>{
  assert.equal(await resolvePolicy(undefined),null);assert.equal(await resolvePolicy({}),null);
  const r=evaluate(fixture());await assert.rejects(qualify(r,{},'/tmp/made.mp4'),/QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED/);
  await assert.rejects(qualify(structuredClone(r),{},'/tmp/made.mp4'),/QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED/);
});

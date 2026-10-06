"""Current-format reuse admission and ongoing readback, without launching a worker.

On the explicit Mac test profile the filesystem/SSD inputs, independent raw SHA
anchors, Node/code readback and input/owner replacement checks are real. Git state
and image qualification are modeled; all user/permit records are synthetic test
controls. This cannot qualify production authority or establish performance/QC.
"""
import sys
sys.dont_write_bytecode=True
import unittest,tempfile,importlib.util,copy,json,hashlib,os,uuid,shutil
from pathlib import Path
from datetime import datetime,timezone
from unittest import mock
SOURCE=Path(__file__).with_name('original-resolution-full-supervisor-v002.py')
spec=importlib.util.spec_from_file_location('reuse_supervisor',SOURCE);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=SOURCE.parents[2]
CONTROL=ROOT/'runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/inputs-v001/approved-visibility-two-cues-job-v001/job.json'
def bind(p):
 b=p.read_bytes();return {'path':str(p),'fileSha256':hashlib.sha256(b).hexdigest(),'sizeBytes':len(b)}
@unittest.skipUnless(os.environ.get('ZEV_BASE_REUSE_SSD_TEST')=='1','explicit bounded SSD test profile required')
class ReuseSupervisorTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.repo=Path(self.temp.name).resolve()
  patch=mock.patch.object(m,'FORMAL_REPO',str(self.repo));patch.start();self.addCleanup(patch.stop)
  self.storage=copy.deepcopy(json.loads(CONTROL.read_text())['storage']);self.storage['internalRoot']=str(self.repo)
  guest=Path(self.storage['guestRoot']);self.assertEqual(guest.stat().st_dev,self.storage['guestDevice'])
  self.assertGreater(shutil.disk_usage(guest).free,50_000_000_000)
  self.plan='test-only-base-reuse-supervisor-'+str(uuid.uuid4());self.prefix='runtime/artifacts/'+self.plan+'/current-inputs-v001';self.out='runtime/artifacts/'+self.plan+'/output';self.scratch=guest/'runtime/artifacts'/self.plan
  self.scratch.mkdir();self.addCleanup(shutil.rmtree,self.scratch);inputdir=guest/self.prefix;inputdir.mkdir()
  inputs={'inputRoot':str(guest),'inputPrefix':self.prefix,'preparationParameters':{'workspaceRoot':str(self.repo),'inputRoot':str(guest),'inputPrefix':self.prefix,'outputRoot':str(inputdir/'prepared'),'sourceRuntimeRoot':str(inputdir/'source')}}
  for k in m.APPROVED_INPUT_BINDING_KEYS:
   p=inputdir/(k+'.json');p.write_text('{}\n');inputs[k]={**bind(p),'path':self.prefix+'/'+p.name}
  for k in ('stateBinding','styleTemplateBinding'):inputs['preparationParameters'][k]={'path':self.prefix+'/'+k+'.json','fileSha256':'a'*64}
  inputs['preparationParameters']['scopeBinding']={'path':'test-only/scope.json','fileSha256':'a'*64}
  self.node=self.repo/'node';self.node.write_bytes(b'Test-only Node fixture, never executed')
  code=[]
  for name in m.APPROVED_CODE+['runner/src/digest-approved-base-reuse-v001.ts']:
   p=self.repo/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('Test-only bound source, never executed '+name);code.append({**bind(p),'path':name})
  self.job={'schemaVersion':'digest-approved-job-v002','planId':self.plan,'outputRoot':self.out,'inputs':inputs,'storage':self.storage,'expected':{'frames':30,'audioSamples':44100,'groups':1,'atoms':1,'cues':1},'implementation':{'sha':'a'*40,'bindings':code,'nodeBinding':bind(self.node)},'guard':copy.deepcopy(m.APPROVED_GUARD),'allocationBudget':{'baseBuildBytes':1_048_576,'rendererPreparationBytes':1_048_576}}
  p=inputdir/'base-reuse.json';p.write_text(json.dumps({'schemaVersion':'digest-approved-base-reuse-input-v001','testOnlyNotAQualifiedOrigin':True})+'\n');self.reuse=p;inputs['baseReuseBundleBinding']={**bind(p),'path':self.prefix+'/'+p.name,'schemaVersion':'digest-approved-base-reuse-input-v001'}
  self.jobfile=self.repo/'job.json';self.jobfile.write_text(json.dumps(self.job));self.auth={'schemaVersion':'digest-approved-job-authorization-v002','recordId':'test-only-not-an-approval','userApproval':{'at':'2026-10-06T00:00:00Z','messageId':'TEST-NOT-A-MESSAGE','text':'Synthetic controls for a test. No manufacturing permission.','sourceThreadId':'TEST-NOT-A-THREAD'},'actions':['manufacture-one-approved-plan'],'jobBinding':bind(self.jobfile),'planId':self.plan,'manifestBinding':inputs['candidateManifestBinding'],'typographySettingsBinding':inputs['typographySettingsBinding'],'migrationApprovalEvidenceBinding':inputs['migrationApprovalEvidenceBinding'],'outputRoot':self.out,'storage':copy.deepcopy(self.storage),'guard':copy.deepcopy(m.APPROVED_GUARD),'implementation':copy.deepcopy(self.job['implementation']),'normalCandidates':1,'baseReuseBundleBinding':copy.deepcopy(inputs['baseReuseBundleBinding'])}
  self.authfile=self.repo/'auth.json';self.authfile.write_text(json.dumps(self.auth));self.permitfile=self.repo/'permit.json';output=guest/self.out;output.mkdir();(output/'monitor').mkdir()
  self.owner={'schemaVersion':'digest-approved-job-exclusive-owner-v001','exclusiveOwnerId':str(uuid.uuid4()),'createdAt':datetime.now(timezone.utc).isoformat(),'controllerPid':os.getpid(),'jobSha256':bind(self.jobfile)['fileSha256'],'authorizationSha256':bind(self.authfile)['fileSha256'],'outputRoot':self.out,'commandPermitPath':str(self.permitfile),'implementationSha':'a'*40};self.ownerfile=output/'ownership.json';self.ownerfile.write_text(json.dumps(self.owner))
  self.command=[str(self.node),'--import',str(self.repo/'runner/node_modules/tsx/dist/loader.mjs'),str(self.repo/m.APPROVED_WORKER),'--permit',str(self.permitfile),'--job-sha256',self.owner['jobSha256'],'--authorization-sha256',self.owner['authorizationSha256']]
  self.permit={'schemaVersion':'digest-approved-job-command-permit-v001','status':'verified-approved-digest-job-v001','jobBinding':bind(self.jobfile),'authorizationBinding':bind(self.authfile),'bindings':{'planId':self.plan,'logicalPrefix':self.out,'planManifest':m.absolute_input_binding(self.job,inputs['candidateManifestBinding']),'approvalRecord':bind(self.authfile),'implementationSha':'a'*40,'commandPermitPath':str(self.permitfile)},'storage':self.storage,'implementation':[m.absolute_repo_binding(b) for b in code],'monitorDirectory':str(output/'monitor'),'command':self.command,'ownerBinding':bind(self.ownerfile)};self.permitfile.write_text(json.dumps(self.permit))
 def qualify(self):
  def git(args,**kw):
   if args[-2:]==['rev-parse','HEAD']:return 'a'*40+'\n'
   if args[-2:]==['status','--porcelain=v1']:return ''
   raise AssertionError('Unexpected command '+repr(args))
  with mock.patch.object(m.subprocess,'check_output',side_effect=git),mock.patch.object(m,'approved_image_identity',return_value={'testOnlyModeledImage':True}),mock.patch.object(m,'volume_identity'):
   # Ancestors, expected physical device, raw bytes and control identities are real.
   return m.validate_approved_job_permit(self.permit,self.permit['monitorDirectory'],self.command,str(self.permitfile),self.owner['jobSha256'],self.owner['authorizationSha256'])
 def ongoing(self,result):
  with mock.patch.object(m.subprocess,'check_output',side_effect=lambda args,**kw:'a'*40+'\n' if args[-2:]==['rev-parse','HEAD'] else ''),mock.patch.object(m,'volume_identity'):
   result['revalidate']()
 def test_reuse_and_ordinary_configuration_share_guard_and_require_no_old_values(self):
  m.validate_approved_job_config(self.job,self.auth);self.assertEqual(len(m.approved_input_binding_keys(self.job)),6)
  j,a=copy.deepcopy(self.job),copy.deepcopy(self.auth);j['inputs'].pop('baseReuseBundleBinding');a.pop('baseReuseBundleBinding');j['implementation']['bindings'].pop();a['implementation']=copy.deepcopy(j['implementation']);m.validate_approved_job_config(j,a);self.assertEqual(m.approved_input_binding_keys(j),m.APPROVED_INPUT_BINDING_KEYS);self.assertEqual(j['guard'],m.APPROVED_GUARD)
 def test_auth_schema_size_prefix_helper_and_recovery_mismatches_are_rejected(self):
  changes=[lambda j,a:a.pop('baseReuseBundleBinding'),lambda j,a:j['inputs'].pop('baseReuseBundleBinding'),lambda j,a:a['baseReuseBundleBinding'].update(fileSha256='b'*64),lambda j,a:a['baseReuseBundleBinding'].update(sizeBytes=True),lambda j,a:a['baseReuseBundleBinding'].update(sizeBytes=float(a['baseReuseBundleBinding']['sizeBytes'])),lambda j,a:j['inputs']['baseReuseBundleBinding'].pop('sizeBytes'),lambda j,a:j['inputs']['baseReuseBundleBinding'].update(schemaVersion='old'),lambda j,a:j['inputs']['baseReuseBundleBinding'].update(path='../outside'),lambda j,a:j['implementation']['bindings'].pop(),lambda j,a:j['guard'].update(reserveBytes=1),lambda j,a:j.update(recoveryBinding={'path':'runtime/artifacts/test-only/recovery.json','fileSha256':'a'*64,'sizeBytes':1},verificationPolicy={'schemaVersion':'digest-representative-verification-policy-v001','mode':'representative-plus-rules-v001','representativeInstructionIds':['one'],'permittedMethods':['still-frame'],'confirmationRecordPath':j['outputRoot']+'/confirmation.json'})]
  for change in changes:
   j,a=copy.deepcopy(self.job),copy.deepcopy(self.auth);change(j,a)
   with self.subTest(change=change),self.assertRaises((ValueError,KeyError,TypeError)):m.validate_approved_job_config(j,a)
 def test_permit_revalidates_reuse_input_and_actual_bound_helper_bytes(self):
  result=self.qualify();self.ongoing(result);self.reuse.write_text('changed test-only reuse input')
  with self.assertRaisesRegex(ValueError,'SHA|size'):self.ongoing(result)
 def test_actual_helper_hash_replacement_fails_before_any_worker(self):
  result=self.qualify();p=self.repo/'runner/src/digest-approved-base-reuse-v001.ts';p.write_text('changed code')
  with self.assertRaisesRegex(ValueError,'SHA|size'):self.ongoing(result)
 def test_approval_or_owner_same_byte_replacement_fails_on_identity(self):
  result=self.qualify();replacement=self.authfile.with_suffix('.replacement');replacement.write_bytes(self.authfile.read_bytes());replacement.replace(self.authfile)
  with self.assertRaisesRegex(ValueError,'identity'):self.ongoing(result)
 def test_independent_job_or_auth_anchor_is_required_before_files(self):
  with self.assertRaisesRegex(ValueError,'anchor'):m.validate_approved_job_permit(self.permit,self.permit['monitorDirectory'],self.command,str(self.permitfile),'b'*64,self.owner['authorizationSha256'])
 def test_changed_physical_device_and_symlink_input_are_refused(self):
  storage=copy.deepcopy(self.job['storage']);storage['guestDevice']+=1;j=copy.deepcopy(self.job);j['storage']=storage
  with mock.patch.object(m,'volume_identity'),self.assertRaises(ValueError):m.verify_approved_inputs(j)
  p=self.reuse;p.unlink();p.symlink_to(self.authfile)
  with mock.patch.object(m,'volume_identity'),self.assertRaisesRegex(ValueError,'symlink|relocated'):m.verify_approved_inputs(self.job)
if __name__=='__main__':unittest.main()

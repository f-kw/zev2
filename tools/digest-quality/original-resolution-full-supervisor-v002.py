"""Explicitly approved Digest jobs and isolated legacy recovery supervision."""
import os, sys, json, time, signal, selectors, subprocess, importlib.util, hashlib, plistlib, stat, re
from pathlib import Path
sys.dont_write_bytecode = True
_spec=importlib.util.spec_from_file_location('original_monitor',Path(__file__).with_name('original-resolution-full-supervisor.py'))
old=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(old)

def members(group):
    rows=[]
    for line in subprocess.check_output(['ps','-axo','pid=,ppid=,pgid=,stat=,rss=,comm='],text=True).splitlines():
        a=line.strip().split(None,5)
        if len(a)==6 and int(a[2])==group: rows.append(dict(pid=int(a[0]),ppid=int(a[1]),pgid=int(a[2]),state=a[3],rssBytes=int(a[4])*1024,tool=a[5]))
    return rows

def observe_group(group, filesystem):
    sample=old.observe(0,filesystem)
    rows=members(group)
    sample.update(processes=rows,parentRssBytes=next((r['rssBytes'] for r in rows if r['pid']==group),0),treeRssBytes=sum(r['rssBytes'] for r in rows))
    return sample

def shutdown(p,report):
    """Wait for the group, never substitute parent exit for group termination."""
    events=[]
    def live():return [r for r in members(p.pid) if not r['state'].startswith('Z')]
    def capture(label):
        rows=members(p.pid);event=dict(at=time.time(),action=label,members=rows,treeRssBytes=sum(r['rssBytes'] for r in rows))
        try:event['system']=old.observe(0,str(Path(report).parent) if report is not None else FORMAL_REPO)
        except BaseException as e:event['systemObservationError']=str(e)
        events.append(event)
        if report is not None:Path(report).write_text(json.dumps(dict(group=p.pid,events=events,remainingRunning=None),indent=2)+'\n')
        return rows
    capture('before-stop')
    if live():
        try:os.killpg(p.pid,signal.SIGTERM)
        except ProcessLookupError:pass
    deadline=time.monotonic()+5 # unchanged original termination grace; not a resource threshold
    next_observation=time.monotonic()+1
    while live() and time.monotonic()<deadline:
        p.poll();time.sleep(0.05)
        if time.monotonic()>=next_observation:capture('termination-wait');next_observation=time.monotonic()+1
    if live():
        capture('SIGTERM-survivors')
        try:os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError:pass
    p.wait()
    deadline=time.monotonic()+5
    while live() and time.monotonic()<deadline:time.sleep(0.05)
    remaining=capture('after-stop')
    result=dict(group=p.pid,events=events,remaining=remaining,remainingRunning=[r for r in remaining if not r['state'].startswith('Z')])
    if report is not None:Path(report).write_text(json.dumps(result,indent=2)+'\n')
    if result['remainingRunning']:raise RuntimeError('owned process group still running after SIGKILL')
    return result

def run_resume(directory,command,resume_permit):
    os.mkdir(directory);started=time.time();p=None;reason=None;stage=None;samples=0;peak=0;parent_peak=0;minimum=None;stopped=None;sel=None
    def record(s):
        nonlocal samples,peak,parent_peak,minimum
        samples+=1;peak=max(peak,s['treeRssBytes']);parent_peak=max(parent_peak,s['parentRssBytes']);minimum=min(minimum or s['availableBytes'],s['availableBytes']);observations.write(json.dumps(s)+'\n');observations.flush()
    with open(directory+'/resource.jsonl','x') as observations,open(directory+'/worker.log','xb') as log:
        try:
            # The dedicated Node preflight verifies the immutable original start and resume stages.
            permit=json.loads(Path(resume_permit).read_text());assert permit['status']=='verified-same-run-resume';assert permit['originalStartAvailableBytes']>=old.START
            assert os.path.abspath(directory)==permit['monitorDirectory'],'monitor destination changed'
            assert command==permit['command'],'resume command changed'
            for ref in permit['implementation']:
                assert hashlib.sha256(Path(ref['path']).read_bytes()).hexdigest()==ref['fileSha256'],'resume implementation changed'
            initial=old.observe(0,directory);record(initial);reason=old.decision(initial)
            if reason:raise RuntimeError(reason)
            p=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,start_new_session=True,env={**os.environ,'ZEV_FULL_SUPERVISED':'1'})
            Path(directory+'/owned-group.json').write_text(json.dumps(dict(group=p.pid,parentPid=p.pid,spawnedAt=time.time(),command=command),indent=2)+'\n')
            sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);buffer=b'';last=0;sample=None
            while p.poll() is None:
                now=time.monotonic()
                if now-last>=1:
                    sample=observe_group(p.pid,directory);record(sample);last=now;reason=old.decision(sample)
                    if reason:raise RuntimeError(reason)
                for key,_ in sel.select(max(0,1-(time.monotonic()-last))):
                    chunk=os.read(key.fd,65536)
                    if not chunk:
                        sel.unregister(key.fileobj)
                        if p.poll() is None:raise RuntimeError('worker supervision communication disconnected')
                        continue
                    log.write(chunk);log.flush();buffer+=chunk
                    while b'\n' in buffer:
                        line,buffer=buffer.split(b'\n',1)
                        if not line.startswith(b'@@RESOURCE_CHECK '):continue
                        request=json.loads(line[len(b'@@RESOURCE_CHECK '):]);stage=request['stage']
                        if stage=='body':
                            sample=observe_group(p.pid,directory);sample['phase']='immediately-before-body';record(sample);last=time.monotonic()
                        fs=os.statvfs(directory);current={**sample,'availableBytes':fs.f_bavail*fs.f_frsize};reason=old.decision(current,request['newBytes'])
                        if reason:raise RuntimeError(reason)
                        p.stdin.write((json.dumps(dict(id=request['id'],sample=current))+'\n').encode());p.stdin.flush()
            p.wait();reason=reason or (None if p.returncode==0 else 'worker nonzero exit')
            if any(not r['state'].startswith('Z') for r in members(p.pid)):reason=reason or 'worker exited with live descendants'
        except BaseException as e:reason=str(e) or type(e).__name__
        finally:
            if p:
                try:stopped=shutdown(p,directory+'/group-shutdown.json')
                except BaseException as e:
                    reason=(reason or '')+'; shutdown failure: '+str(e)
                    # The saved group was created by this supervisor; inability to inspect it is not zero survivors.
                    try:os.killpg(p.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                    try:p.wait(timeout=5)
                    except subprocess.TimeoutExpired:reason+='; parent termination unverified'
                    Path(directory+'/shutdown-error.json').write_text(json.dumps(dict(group=p.pid,at=time.time(),error=str(e),remainingRunning=None),indent=2)+'\n')
                finally:
                    if p.stdin:p.stdin.close()
                    if p.stdout:p.stdout.close()
            if sel:sel.close()
            result=dict(status='completed' if p and p.returncode==0 and not reason else 'interrupted',reason=reason,stage=stage,command=command,resumePermit=resume_permit,startedAt=started,endedAt=time.time(),seconds=time.time()-started,exitCode=p.returncode if p else None,samples=samples,observedTreePeakBytes=peak,observedParentPeakBytes=parent_peak,minimumAvailableBytes=minimum,remainingRunning=stopped['remainingRunning'] if stopped else None,sampleIntervalSeconds=1,limits=dict(initialRunStartBytes=old.START,reserveBytes=old.RESERVE,treeRssBytes=old.RSS),scope='same run resume, original start verified; owned process group; sampled peaks')
            Path(directory+'/summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
    return 0 if result['status']=='completed' else 1

# These limits and two devices belong to the expressly approved single run.
# They are not defaults for another plan or an alternate storage location.
FORMAL_REPO = str(Path(__file__).resolve().parents[2])
FORMAL_MANIFEST = '784775c621913ba263057671b580b34082a349e007b8c155ed4bb0bafe351444'  # Saved/read-back actual candidate, not an execution permit
FORMAL_MANIFEST_PATH = 'runtime/artifacts/digest-caption-216px-reflow-20261003-v001/attempt-002/manifest.json'
FORMAL_STORAGE = dict(guestRoot='/Volumes/ZEV-Digest-20261003-01',
    guestVolumeUuid='7212F3BB-32FB-4F02-A71C-E570421FF2E0',
    hostRoot='/Volumes/KIOXIA',hostVolumeUuid='0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1',
    imagePath='/Volumes/KIOXIA/zev2-digest-formal-handoff-20261003-v001/digest-100GB.sparsebundle',
    imageMaximumBytes=100_000_000_000,hostMetadataReserveBytes=6_254_231_552,internalRoot=FORMAL_REPO)
FORMAL_CODE = ['runner/src/digest-formal-handoff-v001.ts',
    'evals/clip_composition/adopted_media_manufacturing_v001.mts',
    'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
    'evals/clip_composition/render_presentation_v002.mjs',
    'tools/digest-quality/original-resolution-low-memory-composite.mjs',
    'tools/digest-quality/original-resolution-full-supervisor-v002.py',
    'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs']

def verified_file(ref):
    path=Path(ref['path']);assert path.is_absolute() and path.is_file() and not path.is_symlink(),'bound file missing or symlink'
    assert str(path.resolve())==str(path),'bound file realpath changed'
    assert re.fullmatch('[0-9a-f]{64}',ref['fileSha256']),'invalid bound SHA'
    assert hashlib.sha256(path.read_bytes()).hexdigest()==ref['fileSha256'],'formal bound file changed: '+str(path)
    return path

def verified_repo_authorization(ref,relative_path):
    assert ref['path'] in (relative_path,FORMAL_REPO+'/'+relative_path),'different supporting authorization path'
    return verified_file({**ref,'path':FORMAL_REPO+'/'+relative_path})

def validate_216_authorization(approval):
    assert isinstance(FORMAL_MANIFEST,str) and re.fullmatch('[0-9a-f]{64}',FORMAL_MANIFEST),'216px manifest actual SHA not yet bound'
    assert approval['schemaVersion']=='digest-formal-user-manufacturing-authorization-v002','new 216px authorization required'
    assert approval['userApproval']==dict(atMinuteUtc='2026-10-03T09:52Z',
        messageId='Sentinel_1e76075a886c8191aa441b21201f9b00',
        text='調査したんだけど、フォントは１.５倍くらいが良い。左右には半文字分くらいのスペースが必要。それで進めて',
        sourceThreadId='01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6'),'different 216px user approval'
    assert approval['candidateConditions']==dict(fontSizePx=216,actualInkMarginPx=108,
        maxLogicalWidthPerLine=15,maxLinesPerCue=2,horizontalSafeMarginRatio=.05625,layoutRulesChanged=True),'different 216px conditions'
    assert approval['originalCandidateManifestSha256']=='04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41','original candidate history changed'
    assert approval['planManifestSha256']==FORMAL_MANIFEST,'216px authorization manifest changed'
    assert approval['planId']=='digest-formal-handoff-20261003-v001','different 216px authorization plan'
    assert approval['outputRoot']=='runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001','different 216px authorization output prefix'
    assert approval['implementationPaths']==FORMAL_CODE,'216px authorization implementation paths changed'
    assert approval['acceptedMain']=='becf6f69e67fc1afb0c910268a540fcc7f0179c4','different accepted 216px start commit'
    assert approval['normalCandidates']==1 and approval['humanQuality']=='pending' and approval['outlineChoice'] is None,'different candidate quality scope'
    assert approval['guard']==dict(startBytes=50_000_000_000,reserveBytes=12_000_000_000,
        maximumRssBytes=17_179_869_184,maximumPressure=1,observationIntervalSeconds=1,
        nextUnitPlusReserve=True,stopOwnProcessGroup=True,restartOnReconnect=False),'216px safety conditions changed'
    verified_repo_authorization(approval['originalManufacturingAuthorizationBinding'],
        'docs/reports/digest-formal-apfs-preflight-20261003/authorization-record.json')
    verified_repo_authorization(approval['captionAuthorizationBinding'],
        'docs/reports/digest-caption-216px-reflow-20261003/authorization-record.json')

    for key,relative,expected_sha,size in (
        ('typographyAdoptionBinding','docs/reports/digest-caption-216px-reflow-20261003/typography-adoption-record.json',
         'f0e1466475034e396478d7bfb3fef716050f0d17c6d53ab174bd1fc1666b3884',1451),
        ('typographyConfigurationBinding','docs/reports/digest-caption-216px-reflow-20261003/typography-settings-user-record.json',
         'a7e228fe5814b32cb168e737bcc23b7f287d43f3ee852546172e3c56ab6c67bf',1832),
        ('sourceConnectionDecisionBinding','docs/reports/digest-caption-216px-reflow-20261003/source-connection-decision-record.json',
         '8255c2579b072ddb2bf339fd56f179e87b97154bc763aecd44f04a199cd71a40',1668)):
        binding=approval[key]
        assert binding['fileSha256']==expected_sha and binding.get('sizeBytes')==size,'different typography authorization record'
        verified_repo_authorization(binding,relative)

def validate_formal_permit(permit,directory,command):
    assert permit['status']=='verified-formal-handoff-v001','new formal permit required'
    assert os.geteuid()!=0,'formal run requires nonroot UID'
    assert os.path.abspath(directory)==permit['monitorDirectory'],'formal monitor destination changed'
    assert command==permit['command'],'formal command changed'
    assert len(command)==6 and Path(command[0]).is_absolute() and Path(command[0]).is_file(),'invalid formal node command'
    assert command[1:]==['--import',FORMAL_REPO+'/runner/node_modules/tsx/dist/loader.mjs',
        FORMAL_REPO+'/runner/src/digest-formal-handoff-v001.ts','--permit',permit['bindings']['commandPermitPath']],'formal entry command changed'
    storage=permit['storage'];devices={key:storage.get(key) for key in ('guestDevice','hostDevice')}
    assert all(type(value) is int and value>0 for value in devices.values()),'observed storage device binding missing'
    assert devices['guestDevice']!=devices['hostDevice'],'guest and host must remain separate devices'
    assert {key:value for key,value in storage.items() if key not in devices}==FORMAL_STORAGE,'formal storage binding changed'
    bindings=permit['bindings'];prefix=bindings['logicalPrefix']
    assert prefix=='runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001','different formal logical prefix'
    assert not prefix.endswith('/') and all(p not in ('','..','.') for p in prefix.split('/')),'invalid formal prefix components'
    output_root=Path(FORMAL_STORAGE['guestRoot'])/prefix
    assert output_root in Path(directory).parents,'monitor is not inside the approved output prefix'
    assert str(Path(directory).parent.resolve())==str(Path(directory).parent),'monitor parent is symlink or absent'
    assert isinstance(FORMAL_MANIFEST,str) and re.fullmatch('[0-9a-f]{64}',FORMAL_MANIFEST),'216px manifest actual SHA not yet bound'
    assert bindings['planManifest']['fileSha256']==FORMAL_MANIFEST,'different 216px candidate manifest'
    manifest=verified_file(bindings['planManifest']);approval=verified_file(bindings['approvalRecord'])
    assert str(manifest)==FORMAL_REPO+'/'+FORMAL_MANIFEST_PATH,'different 216px manifest path'
    assert Path(FORMAL_REPO) in approval.parents,'approval must remain repository bound'
    authorization=json.loads(approval.read_text());validate_216_authorization(authorization)
    assert authorization['storage']==storage,'216px authorization storage changed'
    assert bindings['planId']=='digest-formal-handoff-20261003-v001','different formal plan ID'
    head=subprocess.check_output(['git','-C',FORMAL_REPO,'rev-parse','HEAD'],text=True).strip()
    assert re.fullmatch('[0-9a-f]{40}',bindings['implementationSha']) and head==bindings['implementationSha'],'implementation commit changed'
    implementation=permit['implementation']
    assert len(implementation)==len(FORMAL_CODE),'formal implementation path count changed'
    assert sorted(r['path'] for r in implementation)==sorted(FORMAL_REPO+'/'+p for p in FORMAL_CODE),'formal implementation path set changed'
    for ref in implementation:verified_file(ref)
    storage=permit['storage'];image=Path(storage['imagePath']);metadata=image/'Info.plist'
    assert image.is_dir() and not image.is_symlink() and str(image.resolve())==str(image),'image missing or relocated'
    image_stat=image.stat();info=plistlib.loads(metadata.read_bytes())
    assert info['diskimage-bundle-type']=='com.apple.diskimage.sparsebundle','different backing image type'
    assert isinstance(info['size'],int) and 0<info['size']<=storage['imageMaximumBytes'],'image exceeds approved maximum'
    return dict(imageInode=image_stat.st_ino,imageDevice=image_stat.st_dev,
        imageMetadataSha256=hashlib.sha256(metadata.read_bytes()).hexdigest(),imageLogicalBytes=info['size'])

# Normal approved jobs deliberately share no legacy video/approval/failure values.
APPROVED_GUARD = dict(startBytes=50_000_000_000, reserveBytes=12_000_000_000,
    maximumRssBytes=17_179_869_184, maximumPressure=1, observationIntervalSeconds=1,
    nextUnitPlusReserve=True, stopOwnProcessGroup=True, restartOnReconnect=False)
APPROVED_INPUT_KEYS = {'preparationParameters', 'preparationManifestBinding',
    'candidateManifestBinding', 'typographySettingsBinding', 'rendererTemplateBinding'}
APPROVED_STORAGE_KEYS = {'guestRoot', 'guestVolumeUuid', 'guestDevice', 'hostRoot',
    'hostVolumeUuid', 'hostDevice', 'imagePath', 'imageMaximumBytes',
    'hostMetadataReserveBytes', 'internalRoot'}
APPROVED_EXPECTED_KEYS = {'frames', 'audioSamples', 'groups', 'atoms', 'cues'}
APPROVED_WORKER = 'runner/src/digest-approved-job-runner-v001.ts'
APPROVED_RECORD_WORKER = 'runner/src/digest-approved-record-finalize-v001.ts'
APPROVED_CODE = ['runner/src/digest-approved-job-v001.ts', APPROVED_WORKER,
    APPROVED_RECORD_WORKER,
    'runner/src/digest-approved-inputs-v001.ts', 'runner/src/digest-formal-handoff-v001.ts',
    'evals/clip_composition/adopted_media_manufacturing_v001.mts',
    'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
    'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
    'evals/clip_composition/render_presentation_v002.mjs',
    'evals/clip_composition/digest_representative_completion_v001.mjs',
    'tools/digest-quality/original-resolution-low-memory-composite.mjs',
    'tools/digest-quality/original-resolution-full-supervisor-v002.py']
JS_SAFE_INTEGER = (1 << 53) - 1

def positive_integer(value):
    return type(value) is int and 0 < value <= JS_SAFE_INTEGER

def required(condition, reason):
    if not condition:
        raise ValueError(reason)

def exact_keys(value, keys, label):
    required(type(value) is dict and set(value) == set(keys), label + ' exact fields required')

def valid_sha(value, length=64):
    return type(value) is str and re.fullmatch('[0-9a-f]{' + str(length) + '}', value) is not None

def safe_relative(value):
    return type(value) is str and re.fullmatch('[A-Za-z0-9._/-]+', value) is not None \
        and not value.startswith('/') and all(part not in ('', '.', '..') for part in value.split('/'))

def absolute_path(value):
    return type(value) is str and os.path.isabs(value) and os.path.normpath(value) == value \
        and '\x00' not in value and '\\' not in value

def validate_binding(ref, absolute=False, require_size=False):
    required(type(ref) is dict and {'path', 'fileSha256'} <= set(ref)
        and set(ref) <= {'path', 'fileSha256', 'sizeBytes', 'schemaVersion', 'canonicalSha256'}, 'invalid binding fields')
    required(absolute_path(ref['path']) if absolute else safe_relative(ref['path']), 'invalid binding path')
    required(valid_sha(ref['fileSha256']), 'invalid binding SHA')
    if require_size:
        required('sizeBytes' in ref, 'bound size required')
    if 'sizeBytes' in ref:
        required(positive_integer(ref['sizeBytes']), 'invalid bound size')
    if 'schemaVersion' in ref:
        required(type(ref['schemaVersion']) is str and bool(ref['schemaVersion']), 'invalid bound schema')
    if 'canonicalSha256' in ref:
        required(valid_sha(ref['canonicalSha256']), 'invalid canonical SHA')

def absolute_repo_binding(ref):
    validate_binding(ref)
    return {**ref, 'path': str(Path(FORMAL_REPO) / ref['path'])}

def stable_bound_bytes(ref):
    validate_binding(ref, absolute=True)
    target = Path(ref['path'])
    before = target.lstat()
    required(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
        and str(target.resolve()) == str(target), 'bound file missing, relocated or symlink')
    data = target.read_bytes()
    after = target.lstat()
    required(all(getattr(before, key) == getattr(after, key)
        for key in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')), 'bound file changed during read')
    required(hashlib.sha256(data).hexdigest() == ref['fileSha256'], 'bound SHA changed: ' + str(target))
    if 'sizeBytes' in ref:
        required(len(data) == ref['sizeBytes'], 'bound size changed: ' + str(target))
    return data

def stable_bound_json(ref):
    data = stable_bound_bytes(ref)
    value = json.loads(data)
    if 'schemaVersion' in ref:
        required(type(value) is dict and value.get('schemaVersion') == ref['schemaVersion'], 'bound schema changed')
    return value

def validate_verification_policy(policy, output_root):
    exact_keys(policy, {'schemaVersion', 'mode', 'representativeInstructionIds',
        'permittedMethods', 'confirmationRecordPath'}, 'representative verification policy')
    required(policy['schemaVersion'] == 'digest-representative-verification-policy-v001'
        and policy['mode'] == 'representative-plus-rules-v001', 'approved representative verification mode required')
    ids = policy['representativeInstructionIds']
    required(type(ids) is list and bool(ids) and all(type(value) is str and bool(value.strip()) for value in ids),
        'nonempty representative instruction IDs required')
    required(len(set(ids)) == len(ids), 'duplicate representative instruction IDs')
    methods = policy['permittedMethods']
    required(type(methods) is list and bool(methods)
        and all(type(value) is str and value in {'still-frame', 'text-clock-context', 'video-playback'} for value in methods),
        'supported nonempty representative verification methods required')
    required(len(set(methods)) == len(methods), 'duplicate representative verification methods')
    target = policy['confirmationRecordPath']
    required(safe_relative(target) and target.startswith(output_root + '/') and target.endswith('.json'),
        'confirmation record must be a safe relative JSON path inside the approved output root')

def validate_approved_job_config(job, authorization):
    exact_keys(job, {'schemaVersion', 'planId', 'outputRoot', 'inputs', 'storage',
        'expected', 'implementation', 'guard', 'allocationBudget'}
        | ({'verificationPolicy'} if type(job) is dict and 'verificationPolicy' in job else set())
        | ({'recoveryBinding'} if type(job) is dict and 'recoveryBinding' in job else set()), 'approved job')
    required(job['schemaVersion'] == 'digest-approved-job-v001', 'approved job schema required')
    required(type(job['planId']) is str and re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*', job['planId']), 'invalid approved plan ID')
    required(safe_relative(job['outputRoot']) and job['outputRoot'].startswith('runtime/artifacts/') and len(job['outputRoot'].split('/')) >= 4, 'invalid approved output root')
    if 'verificationPolicy' in job:
        validate_verification_policy(job['verificationPolicy'], job['outputRoot'])
    if 'recoveryBinding' in job:
        exact_keys(job['recoveryBinding'], {'path', 'fileSha256', 'sizeBytes'}, 'approved recovery byte binding')
        validate_binding(job['recoveryBinding'], require_size=True)
        required(job.get('verificationPolicy', {}).get('mode') == 'representative-plus-rules-v001',
            'approved recovery requires representative verification policy')
    exact_keys(job['inputs'], APPROVED_INPUT_KEYS, 'approved inputs')
    required(type(job['inputs']['preparationParameters']) is dict, 'preparation parameters object required')
    for name in APPROVED_INPUT_KEYS - {'preparationParameters'}:
        validate_binding(job['inputs'][name])
    exact_keys(job['expected'], APPROVED_EXPECTED_KEYS, 'approved expected counts')
    required(all(positive_integer(value) for value in job['expected'].values()), 'expected counts must be positive integers')
    exact_keys(job['allocationBudget'], {'baseBuildBytes', 'rendererPreparationBytes'}, 'approved allocation budget')
    required(all(positive_integer(value) for value in job['allocationBudget'].values()), 'explicit positive allocation budgets required')
    exact_keys(job['guard'], APPROVED_GUARD, 'approved guard')
    required(all(type(job['guard'][key]) is type(value) and job['guard'][key] == value
        for key, value in APPROVED_GUARD.items()), 'approved safety limits cannot change')
    storage = job['storage']
    exact_keys(storage, APPROVED_STORAGE_KEYS, 'approved storage')
    required(all(absolute_path(storage[key]) and storage[key] != '/'
        for key in ('guestRoot', 'hostRoot', 'imagePath', 'internalRoot')), 'invalid approved storage paths')
    required(storage['internalRoot'] == FORMAL_REPO, 'internal observation must remain at the repository filesystem')
    required(storage['guestRoot'].startswith('/Volumes/') and storage['hostRoot'].startswith('/Volumes/')
        and storage['guestRoot'] != storage['hostRoot']
        and not Path(storage['guestRoot']).is_relative_to(Path(storage['hostRoot']))
        and not Path(storage['hostRoot']).is_relative_to(Path(storage['guestRoot'])), 'separate guest/host roots required')
    required(Path(storage['imagePath']).is_relative_to(Path(storage['hostRoot']))
        and storage['imagePath'].endswith('.sparsebundle'), 'backing image must stay inside approved host root')
    required(all(positive_integer(storage[key])
        for key in ('guestDevice', 'hostDevice', 'imageMaximumBytes')), 'positive observed storage integers required')
    required(storage['guestDevice'] != storage['hostDevice'], 'separate observed guest/host devices required')
    required(positive_integer(storage['hostMetadataReserveBytes']) and storage['imageMaximumBytes'] > job['guard']['startBytes'], 'invalid image capacity or metadata reserve')
    required(all(type(storage[key]) is str and re.fullmatch('[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}', storage[key])
        for key in ('guestVolumeUuid', 'hostVolumeUuid')), 'observed volume UUID required')
    exact_keys(job['implementation'], {'sha', 'bindings', 'nodeBinding'}, 'approved implementation')
    validate_binding(job['implementation']['nodeBinding'], absolute=True)
    required(Path(job['implementation']['nodeBinding']['path']).name == 'node', 'approved Node executable basename required')
    required(valid_sha(job['implementation']['sha'], 40), 'approved implementation commit required')
    bindings = job['implementation']['bindings']
    required(type(bindings) is list and bool(bindings), 'approved implementation bindings required')
    for ref in bindings:
        validate_binding(ref)
    paths = [ref['path'] for ref in bindings]
    required(len(set(paths)) == len(paths) and set(APPROVED_CODE) <= set(paths),
        'unique complete approved implementation bindings required')
    exact_keys(authorization, {'schemaVersion', 'recordId', 'userApproval', 'actions', 'jobBinding',
        'planId', 'manifestBinding', 'typographySettingsBinding', 'outputRoot', 'storage', 'guard',
        'implementation', 'normalCandidates'}
        | ({'verificationPolicy'} if type(authorization) is dict and 'verificationPolicy' in authorization else set())
        | ({'recoveryBinding'} if type(authorization) is dict and 'recoveryBinding' in authorization else set()), 'approved authorization')
    required(('recoveryBinding' in authorization) == ('recoveryBinding' in job),
        'authorization/job recovery binding presence mismatch')
    if 'recoveryBinding' in job:
        exact_keys(authorization['recoveryBinding'], {'path', 'fileSha256', 'sizeBytes'}, 'authorized recovery byte binding')
        validate_binding(authorization['recoveryBinding'], require_size=True)
        required(authorization['recoveryBinding'] == job['recoveryBinding'],
            'authorization/job recovery binding mismatch')
    required(('verificationPolicy' in authorization) == ('verificationPolicy' in job),
        'authorization/job verification policy presence mismatch')
    if 'verificationPolicy' in job:
        required(authorization['verificationPolicy'] == job['verificationPolicy'],
            'authorization/job verification policy mismatch')
    required(authorization['schemaVersion'] == 'digest-approved-job-authorization-v001', 'approved authorization schema required')
    required(type(authorization['recordId']) is str and re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*', authorization['recordId']), 'authorization record ID required')
    exact_keys(authorization['userApproval'], {'at', 'messageId', 'text', 'sourceThreadId'}, 'user approval')
    required(all(type(value) is str and bool(value.strip()) for value in authorization['userApproval'].values()), 'real user approval fields required')
    from datetime import datetime
    try:
        timestamp = datetime.fromisoformat(authorization['userApproval']['at'].replace('Z', '+00:00'))
    except ValueError:
        raise ValueError('user approval timestamp must include a timezone') from None
    required(timestamp.tzinfo is not None and re.search(r'(?:Z|\+00:00)$', authorization['userApproval']['at']), 'user approval UTC timezone required')
    required(authorization['actions'] == ['manufacture-one-approved-plan']
        and type(authorization['normalCandidates']) is int and authorization['normalCandidates'] == 1,
        'one explicitly approved manufacture action required')
    validate_binding(authorization['jobBinding'], absolute=True, require_size=True)
    for key in ('planId', 'outputRoot', 'storage', 'guard', 'implementation'):
        required(authorization[key] == job[key], 'authorization/job mismatch: ' + key)
    required(authorization['manifestBinding'] == job['inputs']['candidateManifestBinding'], 'authorized manifest differs')
    required(authorization['typographySettingsBinding'] == job['inputs']['typographySettingsBinding'], 'authorized settings differ')
    return job

def approved_image_identity(storage):
    image = Path(storage['imagePath'])
    actual = image.lstat()
    required(stat.S_ISDIR(actual.st_mode) and not stat.S_ISLNK(actual.st_mode)
        and str(image.resolve()) == str(image), 'approved backing image missing or relocated')
    required(actual.st_dev == storage['hostDevice'], 'approved backing image host device differs')
    info_path = image / 'Info.plist'
    before = info_path.lstat()
    required(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
        and str(info_path.resolve()) == str(info_path), 'approved image metadata missing or symlink')
    raw = info_path.read_bytes()
    after = info_path.lstat()
    required(all(getattr(before, key) == getattr(after, key)
        for key in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')), 'image metadata changed during read')
    info = plistlib.loads(raw)
    required(info['diskimage-bundle-type'] == 'com.apple.diskimage.sparsebundle'
        and type(info['size']) is int and 0 < info['size'] <= storage['imageMaximumBytes'], 'approved image capacity/type differs')
    return dict(imageInode=actual.st_ino, imageDevice=actual.st_dev,
        imageMetadataSha256=hashlib.sha256(raw).hexdigest(), imageLogicalBytes=info['size'])

def validate_approved_job_permit(permit, directory, command, permit_file,
    approved_job_sha256, authorization_sha256):
    required(valid_sha(approved_job_sha256) and valid_sha(authorization_sha256), 'independent approved job and authorization SHA anchors required')
    exact_keys(permit, {'schemaVersion', 'status', 'jobBinding', 'authorizationBinding', 'bindings',
        'storage', 'implementation', 'monitorDirectory', 'command', 'ownerBinding'}, 'approved command permit')
    required(permit['schemaVersion'] == 'digest-approved-job-command-permit-v001'
        and permit['status'] == 'verified-approved-digest-job-v001', 'normal approved command permit required')
    required(os.geteuid() != 0 and 'NODE_OPTIONS' not in os.environ, 'approved job requires nonroot UID and no NODE_OPTIONS')
    for key in ('jobBinding', 'authorizationBinding', 'ownerBinding'):
        validate_binding(permit[key], absolute=True, require_size=True)
    required(all(Path(FORMAL_REPO) in Path(permit[key]['path']).parents for key in ('jobBinding', 'authorizationBinding')),
        'approved job/authorization must remain repository bound')
    required(permit['jobBinding']['fileSha256'] == approved_job_sha256
        and permit['authorizationBinding']['fileSha256'] == authorization_sha256, 'independent approval anchor mismatch')
    job = stable_bound_json(permit['jobBinding'])
    authorization = stable_bound_json(permit['authorizationBinding'])
    validate_approved_job_config(job, authorization)
    required(authorization['jobBinding'] == permit['jobBinding'], 'authorization must bind these exact job bytes')
    bindings = permit['bindings']
    exact_keys(bindings, {'planId', 'logicalPrefix', 'planManifest', 'approvalRecord',
        'implementationSha', 'commandPermitPath'}, 'approved runtime bindings')
    required(absolute_path(permit_file) and bindings['commandPermitPath'] == permit_file, 'approved permit path differs')
    required(bindings['planId'] == job['planId'] and bindings['logicalPrefix'] == job['outputRoot']
        and bindings['implementationSha'] == job['implementation']['sha'], 'approved runtime job bindings differ')
    required(bindings['planManifest'] == absolute_repo_binding(job['inputs']['candidateManifestBinding'])
        and bindings['approvalRecord'] == permit['authorizationBinding'], 'approved runtime authorization or manifest differs')
    required(permit['storage'] == job['storage'], 'approved runtime storage differs')
    expected_implementation = [absolute_repo_binding(ref) for ref in job['implementation']['bindings']]
    required(permit['implementation'] == expected_implementation, 'approved runtime implementation bindings differ')
    required(type(command) is list and len(command) == 10 and absolute_path(command[0])
        and Path(command[0]).is_file() and not Path(command[0]).is_symlink(), 'approved Node command required')
    required(command[0] == job['implementation']['nodeBinding']['path'], 'approved Node command path differs')
    node_identity = bound_node_identity(job['implementation']['nodeBinding'])
    required(command == permit['command'] and command[1:] == ['--import',
        FORMAL_REPO + '/runner/node_modules/tsx/dist/loader.mjs', FORMAL_REPO + '/' + APPROVED_WORKER,
        '--permit', permit_file, '--job-sha256', approved_job_sha256,
        '--authorization-sha256', authorization_sha256], 'approved worker command/anchors differ')
    root = Path(job['storage']['guestRoot']) / job['outputRoot']
    required(absolute_path(directory) and directory == permit['monitorDirectory']
        and directory == str(root / 'monitor'), 'approved monitor must be this output root monitor')
    required(str(Path(directory).parent.resolve()) == str(Path(directory).parent)
        and Path(directory).parent.is_dir(), 'approved monitor parent missing or symlink')
    required(permit['ownerBinding']['path'] == str(root / 'ownership.json'), 'approved exclusive owner path differs')
    owner = stable_bound_json(permit['ownerBinding'])
    exact_keys(owner, {'schemaVersion', 'exclusiveOwnerId', 'createdAt', 'controllerPid',
        'jobSha256', 'authorizationSha256', 'outputRoot', 'commandPermitPath', 'implementationSha'}, 'approved exclusive owner')
    required(owner['schemaVersion'] == 'digest-approved-job-exclusive-owner-v001', 'normal exclusive owner schema required')
    required(type(owner) is dict and owner.get('controllerPid') == os.getpid()
        and type(owner.get('controllerPid')) is int, 'approved owner must be this supervisor')
    required(type(owner.get('exclusiveOwnerId')) is str
        and re.fullmatch('[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}', owner['exclusiveOwnerId']), 'approved exclusive owner UUID required')
    for key, expected in (('jobSha256', approved_job_sha256), ('authorizationSha256', authorization_sha256),
        ('outputRoot', job['outputRoot']), ('commandPermitPath', permit_file), ('implementationSha', job['implementation']['sha'])):
        required(owner.get(key) == expected, 'approved exclusive owner binding differs: ' + key)
    from datetime import datetime
    required(type(owner['createdAt']) is str and re.search(r'(?:Z|\+00:00)$', owner['createdAt']), 'owner UTC creation time required')
    created = datetime.fromisoformat(owner['createdAt'].replace('Z', '+00:00'))
    age = time.time() - created.timestamp()
    required(0 <= age < 600, 'approved exclusive owner is not fresh')
    for key in APPROVED_INPUT_KEYS - {'preparationParameters'}:
        stable_bound_bytes(absolute_repo_binding(job['inputs'][key]))
    image_identity = approved_image_identity(job['storage'])
    permit_raw = Path(permit_file).read_bytes()
    permit_ref = dict(path=permit_file, fileSha256=hashlib.sha256(permit_raw).hexdigest(), sizeBytes=len(permit_raw))
    required(stable_bound_json(permit_ref) == permit, 'approved permit changed during qualification')
    anchor_identities = [bound_file_identity(ref) for ref in
        (permit_ref, permit['jobBinding'], permit['authorizationBinding'], permit['ownerBinding'])]
    def revalidate():
        for identity in anchor_identities:
            verify_file_identity(identity)
        stable_bound_bytes(permit_ref)
        stable_bound_bytes(permit['jobBinding'])
        stable_bound_bytes(permit['authorizationBinding'])
        stable_bound_bytes(permit['ownerBinding'])
        os.kill(owner['controllerPid'], 0)
        verify_node_identity(node_identity)
        required(subprocess.check_output(['git', '-C', FORMAL_REPO, 'rev-parse', 'HEAD'], text=True).strip()
            == job['implementation']['sha'], 'approved implementation HEAD changed')
        required(subprocess.check_output(['git', '-C', FORMAL_REPO, 'status', '--porcelain=v1'], text=True) == '',
            'approved implementation must remain clean')
        for ref in expected_implementation:
            stable_bound_bytes(ref)
    revalidate()
    return dict(job=job, authorization=authorization, imageIdentity=image_identity,
        guard=job['guard'], revalidate=revalidate, observedNodeIdentity=node_identity)


def bound_file_identity(ref):
    validate_binding(ref, absolute=True)
    target = Path(ref['path']); actual = target.lstat()
    required(stat.S_ISREG(actual.st_mode) and not stat.S_ISLNK(actual.st_mode)
        and str(target.resolve()) == str(target), 'approved anchor file type or realpath differs')
    return dict(path=str(target), device=actual.st_dev, inode=actual.st_ino,
        sizeBytes=actual.st_size, mtimeNs=actual.st_mtime_ns, ctimeNs=actual.st_ctime_ns)

def verify_file_identity(identity):
    target = Path(identity['path']); actual = target.lstat()
    required(stat.S_ISREG(actual.st_mode) and not stat.S_ISLNK(actual.st_mode)
        and str(target.resolve()) == str(target), 'approved anchor file path or type changed')
    for key, field in (('device', 'st_dev'), ('inode', 'st_ino'), ('sizeBytes', 'st_size'),
        ('mtimeNs', 'st_mtime_ns'), ('ctimeNs', 'st_ctime_ns')):
        required(getattr(actual, field) == identity[key], 'approved anchor file identity changed: ' + key)

def bound_node_identity(ref):
    validate_binding(ref, absolute=True)
    target = Path(ref['path'])
    before = target.lstat()
    required(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
        and str(target.resolve()) == str(target), 'approved Node missing, relocated or symlink')
    digest = hashlib.sha256()
    with target.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    after = target.lstat()
    required(all(getattr(before, key) == getattr(after, key)
        for key in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')), 'approved Node changed during read')
    required(digest.hexdigest() == ref['fileSha256'], 'approved Node SHA differs')
    if 'sizeBytes' in ref:
        required(before.st_size == ref['sizeBytes'], 'approved Node size differs')
    return dict(path=str(target), fileSha256=ref['fileSha256'], device=before.st_dev,
        inode=before.st_ino, sizeBytes=before.st_size, mtimeNs=before.st_mtime_ns, ctimeNs=before.st_ctime_ns)

def verify_node_identity(identity):
    target = Path(identity['path'])
    actual = target.lstat()
    required(stat.S_ISREG(actual.st_mode) and not stat.S_ISLNK(actual.st_mode)
        and str(target.resolve()) == str(target), 'running approved Node path changed')
    for key, field in (('device', 'st_dev'), ('inode', 'st_ino'), ('sizeBytes', 'st_size'),
        ('mtimeNs', 'st_mtime_ns'), ('ctimeNs', 'st_ctime_ns')):
        required(getattr(actual, field) == identity[key], 'running approved Node identity changed: ' + key)

def approved_current_implementation(job):
    required(subprocess.check_output(['git', '-C', FORMAL_REPO, 'rev-parse', 'HEAD'], text=True).strip()
        == job['implementation']['sha'], 'approved implementation HEAD changed')
    required(subprocess.check_output(['git', '-C', FORMAL_REPO, 'status', '--porcelain=v1'], text=True) == '',
        'approved implementation must remain clean')
    for ref in job['implementation']['bindings']:
        stable_bound_bytes(absolute_repo_binding(ref))

def read_approved_job_files(job_file, authorization_file, approved_job_sha256, authorization_sha256):
    required(valid_sha(approved_job_sha256) and valid_sha(authorization_sha256),
        'independent approved job and authorization SHA anchors required')
    refs = []
    for filename, anchor in ((job_file, approved_job_sha256), (authorization_file, authorization_sha256)):
        required(absolute_path(filename) and Path(FORMAL_REPO) in Path(filename).parents,
            'approved job/authorization must be repository-bound absolute files')
        refs.append(dict(path=filename, fileSha256=anchor, sizeBytes=Path(filename).lstat().st_size))
    job_ref, authorization_ref = refs
    job, authorization = stable_bound_json(job_ref), stable_bound_json(authorization_ref)
    validate_approved_job_config(job, authorization)
    required(authorization['jobBinding'] == job_ref, 'authorization binds different job bytes')
    for key in APPROVED_INPUT_KEYS - {'preparationParameters'}:
        stable_bound_bytes(absolute_repo_binding(job['inputs'][key]))
    approved_current_implementation(job)
    return dict(job=job, authorization=authorization, jobBinding=job_ref, authorizationBinding=authorization_ref)

def inspect_output_ancestors(root, storage, allow_missing=False):
    guest = Path(storage['guestRoot'])
    required(Path(root).is_relative_to(guest), 'approved output is outside guest root')
    chain = [guest]
    relative = Path(root).relative_to(guest)
    for part in relative.parts:
        chain.append(chain[-1] / part)
    missing = False
    for target in chain:
        if missing:
            continue
        try:
            actual = target.lstat()
        except FileNotFoundError:
            required(allow_missing, 'approved output ancestor is missing')
            missing = True
            continue
        required(stat.S_ISDIR(actual.st_mode) and not stat.S_ISLNK(actual.st_mode)
            and str(target.resolve()) == str(target) and actual.st_dev == storage['guestDevice'],
            'approved output ancestor type, device or realpath differs: ' + str(target))

def prepare_approved_job(job_file, authorization_file, approved_job_sha256, authorization_sha256, node_path):
    """Read-only readiness for an already supplied grant; grants no new permission."""
    required(os.geteuid() != 0 and 'NODE_OPTIONS' not in os.environ, 'normal job requires nonroot and no NODE_OPTIONS')
    configured = read_approved_job_files(job_file, authorization_file, approved_job_sha256, authorization_sha256)
    job = configured['job']
    required(absolute_path(node_path) and node_path == job['implementation']['nodeBinding']['path'], 'explicit approved Node path differs')
    node_identity = bound_node_identity(job['implementation']['nodeBinding'])
    image_identity = approved_image_identity(job['storage'])
    root = Path(job['storage']['guestRoot']) / job['outputRoot']
    inspect_output_ancestors(root.parent, job['storage'], allow_missing=True)
    try:
        root.lstat()
    except FileNotFoundError:
        pass
    else:
        raise ValueError('approved output root already exists; no reuse or overwrite')
    observation_permit = dict(storage=job['storage'], _approvedGuard=job['guard'])
    sample = observe_formal(0, observation_permit, image_identity)
    largest_unit = max(job['allocationBudget'].values())
    reason = formal_decision(sample, largest_unit, starting=True, guard=job['guard'])
    required(reason is None, reason or 'approved launch resources unavailable')
    return {**configured, 'status': 'ready-for-explicit-approved-job-launch-v001',
        'outputDirectory': str(root), 'observedNodeIdentity': node_identity, 'imageIdentity': image_identity,
        'initialResourceSample': sample, 'manufacturePermissionGranted': False,
        'permissionMeaning': 'Validates the explicitly supplied approval bindings; grants no new permission.',
        'processesStarted': 0, 'rootClaimed': False}

def launch_approved_job(job_file, authorization_file, approved_job_sha256, authorization_sha256, node_path):
    """Explicit launch, exclusive claim, self-owned lease, then the normal supervisor."""
    from datetime import datetime, timezone
    from uuid import uuid4
    configured = prepare_approved_job(job_file, authorization_file, approved_job_sha256, authorization_sha256, node_path)
    job = configured['job']; storage = job['storage']; root = Path(configured['outputDirectory'])
    guest = Path(storage['guestRoot'])
    # Only the approved output's parent chain is visited or created. Existing SSD
    # content is never scanned, moved or removed. Existing roots are never reused.
    target = guest
    for part in root.parent.relative_to(guest).parts:
        target = target / part
        try:
            target.mkdir(mode=0o700)
        except FileExistsError:
            pass
        inspect_output_ancestors(target, storage)
    inspect_output_ancestors(root.parent, storage)
    guest_now = volume_identity(storage['guestRoot'],storage['guestVolumeUuid'],storage['guestDevice'],'apfs')
    host_now = volume_identity(storage['hostRoot'],storage['hostVolumeUuid'],storage['hostDevice'],'exfat')
    required(guest_now['writable'] is True and guest_now['permissionsEnabled'] is True
        and host_now['writable'] is True, 'approved device permissions changed before claim')
    verify_node_identity(configured['observedNodeIdentity'])
    root.mkdir(mode=0o700)  # The exclusive, non-reusable one-time claim.
    try:
        inspect_output_ancestors(root, storage)
        (root / 'temp').mkdir(mode=0o700)
        permit_file = root / 'command-permit.json'
        owner_file = root / 'ownership.json'
        owner = dict(schemaVersion='digest-approved-job-exclusive-owner-v001', exclusiveOwnerId=str(uuid4()),
            createdAt=datetime.now(timezone.utc).isoformat(), controllerPid=os.getpid(),
            jobSha256=approved_job_sha256, authorizationSha256=authorization_sha256, outputRoot=job['outputRoot'],
            commandPermitPath=str(permit_file), implementationSha=job['implementation']['sha'])
        def publish_json(path, value):
            data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
            with path.open('xb') as stream:
                stream.write(data); stream.flush(); os.fsync(stream.fileno())
            path.chmod(0o444)
            ref = dict(path=str(path), fileSha256=hashlib.sha256(data).hexdigest(), sizeBytes=len(data))
            stable_bound_bytes(ref)
            return ref
        owner_ref = publish_json(owner_file, owner)
        command = [node_path, '--import', FORMAL_REPO + '/runner/node_modules/tsx/dist/loader.mjs',
            FORMAL_REPO + '/' + APPROVED_WORKER, '--permit', str(permit_file), '--job-sha256', approved_job_sha256,
            '--authorization-sha256', authorization_sha256]
        permit = dict(schemaVersion='digest-approved-job-command-permit-v001', status='verified-approved-digest-job-v001',
            jobBinding=configured['jobBinding'], authorizationBinding=configured['authorizationBinding'],
            bindings=dict(planId=job['planId'], logicalPrefix=job['outputRoot'],
                planManifest=absolute_repo_binding(job['inputs']['candidateManifestBinding']),
                approvalRecord=configured['authorizationBinding'], implementationSha=job['implementation']['sha'],
                commandPermitPath=str(permit_file)), storage=storage,
            implementation=[absolute_repo_binding(ref) for ref in job['implementation']['bindings']],
            monitorDirectory=str(root / 'monitor'), command=command, ownerBinding=owner_ref)
        publish_json(permit_file, permit)
        return run(str(root / 'monitor'), command, str(permit_file), approved_job_sha256, authorization_sha256)
    except BaseException as error:
        # A partial claim is evidence, never an automatic retry/overwrite permit.
        raise RuntimeError('Approved launch failed; exclusive claim retained without reuse: '
            + str(root) + '; ' + str(error)) from error


def prepare_approved_record_job(job_file, authorization_file, approved_job_sha256, authorization_sha256,
    pending_result_file, pending_result_file_sha256, pending_result_size_bytes, node_path=None,
    registration_bundle_file=None, registration_bundle_sha256=None, registration_bundle_size_bytes=None,
    finalize=False):
    """Read-only environment qualification; only the fixed TS utility judges results."""
    required(type(finalize) is bool, 'record-only operation mode required')
    required(os.geteuid() != 0 and 'NODE_OPTIONS' not in os.environ, 'record-only requires nonroot and no NODE_OPTIONS')
    configured = read_approved_job_files(job_file, authorization_file, approved_job_sha256, authorization_sha256)
    job = configured['job']
    if finalize:required('verificationPolicy' in job, 'record finalization requires the approved representative policy')
    root = Path(job['storage']['guestRoot']) / job['outputRoot']
    inspect_output_ancestors(root, job['storage'])
    required(absolute_path(pending_result_file) and pending_result_file == str(root / 'result.json'),
        'pending result must be this approved output root result.json')
    pending_ref = dict(path=pending_result_file, fileSha256=pending_result_file_sha256, sizeBytes=pending_result_size_bytes)
    validate_binding(pending_ref, absolute=True, require_size=True)
    stable_bound_bytes(pending_ref)  # No status or QC interpretation in Python.
    bundle_ref = None;bundle_available = False
    if finalize:
        bundle_ref = dict(path=registration_bundle_file, fileSha256=registration_bundle_sha256, sizeBytes=registration_bundle_size_bytes)
        validate_binding(bundle_ref, absolute=True, require_size=True)
        try:Path(bundle_ref['path']).lstat()
        except FileNotFoundError:
            # A completed same-bundle retry is qualified from the TS-owned
            # stored bundle. Missing fresh input never qualifies in Python.
            pass
        else:
            stable_bound_bytes(bundle_ref);bundle_available = True
    else:
        required(registration_bundle_file is None and registration_bundle_sha256 is None
            and registration_bundle_size_bytes is None, 'get-result cannot register or finalize evidence')
    approved_node = job['implementation']['nodeBinding']['path']
    required(node_path is None or node_path == approved_node, 'explicit approved Node path differs')
    node_identity = bound_node_identity(job['implementation']['nodeBinding'])
    image_identity = approved_image_identity(job['storage'])
    anchor_refs = [configured['jobBinding'], configured['authorizationBinding'], pending_ref] + ([bundle_ref] if bundle_available else [])
    identities = [bound_file_identity(ref) for ref in anchor_refs]
    def revalidate():
        for identity in identities:verify_file_identity(identity)
        for ref in anchor_refs:stable_bound_bytes(ref)
        for key in APPROVED_INPUT_KEYS - {'preparationParameters'}:
            stable_bound_bytes(absolute_repo_binding(job['inputs'][key]))
        verify_node_identity(node_identity)
        approved_current_implementation(job)
        inspect_output_ancestors(root, job['storage'])
    mode = '--finalize-job' if finalize else '--get-job-result'
    command = [approved_node, '--import', FORMAL_REPO + '/runner/node_modules/tsx/dist/loader.mjs',
        FORMAL_REPO + '/' + APPROVED_RECORD_WORKER, mode,
        '--job-file', job_file, '--authorization-file', authorization_file,
        '--job-sha256', approved_job_sha256, '--authorization-sha256', authorization_sha256,
        '--pending-result-file', pending_result_file, '--pending-result-file-sha256', pending_result_file_sha256,
        '--pending-result-size-bytes', str(pending_result_size_bytes)]
    if finalize:
        command += ['--registration-bundle-file', registration_bundle_file,
            '--registration-bundle-sha256', registration_bundle_sha256,
            '--registration-bundle-size-bytes', str(registration_bundle_size_bytes)]
    revalidate()
    return {**configured, 'operationMode': mode, 'command': command, 'pendingResultBinding': pending_ref,
        'registrationBundleBinding': bundle_ref, 'observedNodeIdentity': node_identity,
        'imageIdentity': image_identity, 'revalidate': revalidate}

def run_approved_record_worker(configured):
    """One fixed read/finalize utility; no manufacture permit, owner, root or retry."""
    job = configured['job']; guard = job['guard']; finalize = configured['operationMode'] == '--finalize-job'
    permit = dict(storage=job['storage'], _approvedGuard=guard)
    samples=[];started=time.time();p=None;sel=None;reason=None;stopped=None;stdout=bytearray();stderr=bytearray()
    def observe(group, phase):
        configured['revalidate']()
        sample=observe_formal(group, permit, configured['imageIdentity']);sample['phase']=phase;samples.append(sample)
        return sample
    try:
        initial=observe(0,'record-only-start')
        reason=formal_decision(initial,new_bytes=0,starting=finalize,guard=guard)
        if reason:raise RuntimeError(reason)
        env={key:value for key,value in os.environ.items() if key not in {
            'ZEV_FULL_SUPERVISED','ZEV_APPROVED_JOB_PERMIT','ZEV_APPROVED_JOB_SHA256',
            'ZEV_APPROVED_AUTHORIZATION_SHA256','ZEV_FORMAL_HANDOFF_PERMIT','ZEV_APPROVED_RECORD_FINALIZE_SUPERVISED'}}
        env['NODE_PATH']=str(Path(FORMAL_REPO)/'runner/node_modules')
        if finalize:env['ZEV_APPROVED_RECORD_FINALIZE_SUPERVISED']='1'
        p=subprocess.Popen(configured['command'],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            start_new_session=True,env=env)
        sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ,'stdout');sel.register(p.stderr,selectors.EVENT_READ,'stderr');last=0
        while p.poll() is None or sel.get_map():
            if time.monotonic()-last>=guard['observationIntervalSeconds']:
                current=observe(p.pid,'record-only-interval');last=time.monotonic()
                reason=formal_decision(current,new_bytes=0,guard=guard)
                if reason:raise RuntimeError(reason)
            for key,_ in sel.select(max(0,guard['observationIntervalSeconds']-(time.monotonic()-last))):
                chunk=os.read(key.fd,65536)
                if not chunk:sel.unregister(key.fileobj)
                elif key.data=='stdout':stdout.extend(chunk)
                else:stderr.extend(chunk)
            if p.poll() is not None and any(not row['state'].startswith('Z') for row in members(p.pid)):
                raise RuntimeError('record-only utility exited with live descendants')
        p.wait()
        required(p.returncode==0,'record-only utility nonzero exit')
        final=observe(0,'record-only-final');reason=formal_decision(final,new_bytes=0,guard=guard)
        if reason:raise RuntimeError(reason)
        # The trusted TS reader/transaction provides the result, not a Python
        # interpretation of JSON passed/status. Preserve its event verbatim.
        payload=json.loads(stdout.decode())
        required(type(payload) is dict and 'result' in payload and 'event' in payload,
            'fixed record-only utility returned no result envelope')
    except BaseException as error:
        reason=str(error) or type(error).__name__;payload=None
    finally:
        if p:
            try:stopped=shutdown(p,None)
            except BaseException as error:
                reason=(reason or '')+'; shutdown failure: '+str(error)
                try:os.killpg(p.pid,signal.SIGKILL)
                except ProcessLookupError:pass
                try:p.wait(timeout=5)
                except subprocess.TimeoutExpired:reason+='; parent termination unverified'
            if p.stdout:p.stdout.close()
            if p.stderr:p.stderr.close()
        if sel:sel.close()
    success=payload is not None and reason is None and stopped is not None and not stopped['remainingRunning']
    summary=dict(schemaVersion='digest-approved-record-only-supervision-v001',status='worker-finished' if success else 'interrupted',
        operation=configured['operationMode'],reason=reason,command=configured['command'],startedAt=started,endedAt=time.time(),
        exitCode=p.returncode if p else None,ownProcessGroup=p.pid if p else None,remainingRunning=stopped['remainingRunning'] if stopped else None,
        guard=guard,recordOnly=True,mediaGenerated=False,ownerCreatedBySupervisor=False,rootClaimedBySupervisor=False,
        samples=len(samples),observedTreePeakBytes=max((s['treeRssBytes'] for s in samples),default=0),
        minimumGuestAvailableBytes=min((s['availableBytes'] for s in samples),default=None),
        jobBinding=configured['jobBinding'],authorizationBinding=configured['authorizationBinding'],
        pendingResultBinding=configured['pendingResultBinding'],registrationBundleBinding=configured['registrationBundleBinding'])
    result={**payload,'supervision':summary} if success else dict(event='record-only-interrupted',result=None,supervision=summary,
        stderr=stderr.decode(errors='replace'))
    print(json.dumps(result),flush=True)
    return 0 if success else 1

def operate_approved_record_job(*args, **kwargs):
    return run_approved_record_worker(prepare_approved_record_job(*args, **kwargs))

def volume_identity(root,uuid,device,filesystem):
    actual=os.lstat(root)
    assert stat.S_ISDIR(actual.st_mode) and not stat.S_ISLNK(actual.st_mode),'volume root missing or symlink: '+root
    assert os.path.realpath(root)==root and actual.st_dev==device,'volume device or root changed: '+root
    info=plistlib.loads(subprocess.check_output(['diskutil','info','-plist',root]))
    assert info.get('VolumeUUID','').upper()==uuid and info.get('MountPoint')==root,'volume UUID or mount changed: '+root
    assert info.get('FilesystemType','').lower()==filesystem,'volume filesystem changed: '+root
    return dict(root=root,volumeUuid=uuid,device=device,deviceNode=info['DeviceNode'],filesystem=filesystem,
        writable=info.get('WritableVolume'),permissionsEnabled=info.get('GlobalPermissionsEnabled'))

def observe_formal(group,permit,image_identity):
    storage=permit['storage'];guard=permit.get('_approvedGuard',APPROVED_GUARD);guest=volume_identity(storage['guestRoot'],storage['guestVolumeUuid'],storage['guestDevice'],'apfs')
    host=volume_identity(storage['hostRoot'],storage['hostVolumeUuid'],storage['hostDevice'],'exfat')
    if '_approvedGuard' in permit:
        required(guest['writable'] is True and host['writable'] is True and guest['permissionsEnabled'] is True,
            'approved guest/host must be writable and APFS permissions enabled')
    image=Path(storage['imagePath']);actual=image.lstat()
    assert stat.S_ISDIR(actual.st_mode) and str(image.resolve())==str(image),'backing image disappeared or became symlink'
    assert actual.st_ino==image_identity['imageInode'] and actual.st_dev==image_identity['imageDevice']==storage['hostDevice'],'backing image identity changed'
    assert hashlib.sha256((image/'Info.plist').read_bytes()).hexdigest()==image_identity['imageMetadataSha256'],'image capacity metadata changed'
    images=plistlib.loads(subprocess.check_output(['hdiutil','info','-plist']))['images']
    attached=[row for row in images if row.get('image-path')==str(image)]
    assert len(attached)==1 and any(row.get('mount-point')==guest['root'] and row.get('dev-entry')==guest['deviceNode'] for row in attached[0]['system-entities']),'guest is not the bound backing image'
    # Measure only this newly-created bundle, never scan other SSD contents.
    allocated=int(subprocess.check_output(['du','-sk',str(image)],text=True).split()[0])*1024
    assert allocated>=0,'image allocation observation failed'
    sample=observe_group(group,guest['root']) if group else old.observe(0,guest['root'])
    def available(root):
        fs=os.statvfs(root);return fs.f_bavail*fs.f_frsize
    remaining=max(0,storage['imageMaximumBytes']-min(allocated,storage['imageMaximumBytes']))
    sample.update(guest=guest,host=host,imagePath=str(image),imageAllocatedBytes=allocated,
        imageRemainingGrowthBytes=remaining,hostAvailableBytes=available(host['root']),
        hostRequiredBytes=remaining+guard['reserveBytes']+storage['hostMetadataReserveBytes'],
        hostStartRequiredBytes=storage['imageMaximumBytes']+guard['reserveBytes']+storage['hostMetadataReserveBytes'],
        internalAvailableBytes=available(storage['internalRoot']),internalRoot=storage['internalRoot'])
    return sample

def formal_decision(sample,new_bytes=0,starting=False,guard=None):
    guard=APPROVED_GUARD if guard is None else guard
    if type(new_bytes) is not int or new_bytes<0:return 'invalid next allocation'
    if sample['pressure']!=guard['maximumPressure']:return 'OS memory pressure warning/critical or unknown'
    if sample['treeRssBytes']>=guard['maximumRssBytes']:return 'parent/child RSS reached approved boundary'
    if sample['availableBytes']<=guard['reserveBytes']:return 'disk reached approved reserve'
    if starting and sample['availableBytes']<guard['startBytes']:return 'insufficient start space'
    if sample['availableBytes']<guard['reserveBytes']+new_bytes:return 'next unit plus reserve will not fit'
    host_required=sample['hostStartRequiredBytes'] if starting else sample['hostRequiredBytes']
    if sample['hostAvailableBytes']<host_required:return 'host image growth plus reserve and metadata will not fit'
    if sample['internalAvailableBytes']<=guard['reserveBytes']:return 'internal OS disk reached approved reserve'
    return None

def run_formal(directory,command,permit_file,approved_job_sha256=None,authorization_sha256=None):
    # Exclusive directory is the one-time claim. No resume or fallback branch.
    permit=json.loads(Path(permit_file).read_text())
    normal=permit.get('status')=='verified-approved-digest-job-v001'
    if normal:
        approved=validate_approved_job_permit(permit,directory,command,permit_file,approved_job_sha256,authorization_sha256)
        image_identity=approved['imageIdentity'];guard=approved['guard']
        observation_permit={**permit,'_approvedGuard':guard}
    else:
        assert os.path.abspath(permit_file)==permit['bindings']['commandPermitPath'],'formal permit path changed'
        image_identity=validate_formal_permit(permit,directory,command);guard=APPROVED_GUARD
        observation_permit=permit
    def observe(group):
        if normal:approved['revalidate']()
        return observe_formal(group,observation_permit,image_identity)
    os.mkdir(directory);started=time.time();p=None;reason=None;stage=None;stopped=None;sel=None
    samples=0;peak=0;parent_peak=0;minimum=None;host_minimum=None;internal_minimum=None
    def record(sample):
        nonlocal samples,peak,parent_peak,minimum,host_minimum,internal_minimum
        samples+=1;peak=max(peak,sample['treeRssBytes']);parent_peak=max(parent_peak,sample['parentRssBytes'])
        minimum=min(minimum if minimum is not None else sample['availableBytes'],sample['availableBytes'])
        host_minimum=min(host_minimum if host_minimum is not None else sample['hostAvailableBytes'],sample['hostAvailableBytes'])
        internal_minimum=min(internal_minimum if internal_minimum is not None else sample['internalAvailableBytes'],sample['internalAvailableBytes'])
        observations.write(json.dumps(sample)+'\n');observations.flush()
    with open(directory+'/resource.jsonl','x') as observations,open(directory+'/worker.log','xb') as log:
        try:
            initial=observe(0);initial['phase']='formal-start';record(initial)
            reason=formal_decision(initial,starting=True,guard=guard)
            if reason:raise RuntimeError(reason)
            p=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,start_new_session=True,
                env={**os.environ,'ZEV_FULL_SUPERVISED':'1',**(dict(ZEV_APPROVED_JOB_PERMIT=permit_file,
                    ZEV_APPROVED_JOB_SHA256=approved_job_sha256,ZEV_APPROVED_AUTHORIZATION_SHA256=authorization_sha256,
                    NODE_PATH=str(Path(FORMAL_REPO)/'runner/node_modules'))
                    if normal else dict(ZEV_FORMAL_HANDOFF_PERMIT=os.path.abspath(permit_file)))})
            Path(directory+'/owned-group.json').write_text(json.dumps(dict(group=p.pid,parentPid=p.pid,
                spawnedAt=time.time(),command=command,permitFile=permit_file,bindings=permit['bindings'],
                storage=permit['storage'],imageIdentity=image_identity,
                **(dict(jobBinding=permit['jobBinding'],authorizationBinding=permit['authorizationBinding'],
                    ownerBinding=permit['ownerBinding'],observedNodeIdentity=approved.get('observedNodeIdentity')) if normal else {})),indent=2)+'\n')
            sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);buffer=b'';last=0
            while p.poll() is None:
                if time.monotonic()-last>=1:
                    sample=observe(p.pid);record(sample);last=time.monotonic()
                    reason=formal_decision(sample,guard=guard)
                    if reason:raise RuntimeError(reason)
                for key,_ in sel.select(max(0,1-(time.monotonic()-last))):
                    chunk=os.read(key.fd,65536)
                    if not chunk:
                        sel.unregister(key.fileobj)
                        if p.poll() is None:raise RuntimeError('formal worker supervision communication disconnected')
                        continue
                    log.write(chunk);log.flush();buffer+=chunk
                    while b'\n' in buffer:
                        line,buffer=buffer.split(b'\n',1)
                        if not line.startswith(b'@@RESOURCE_CHECK '):continue
                        request=json.loads(line[len(b'@@RESOURCE_CHECK '):]);stage=request['stage']
                        assert type(request['id']) is int and request['id']>0 and isinstance(stage,str) and stage,'invalid formal resource request'
                        # Refresh UUID/device, all disks and pressure before every
                        # next-unit acknowledgement; old samples are not permits.
                        current=observe(p.pid);current['phase']='before-'+stage;record(current);last=time.monotonic()
                        reason=formal_decision(current,request['newBytes'],guard=guard)
                        if reason:raise RuntimeError(reason)
                        p.stdin.write((json.dumps(dict(id=request['id'],sample=current))+'\n').encode());p.stdin.flush()
            p.wait();reason=None if p.returncode==0 else 'formal worker nonzero exit'
            if any(not row['state'].startswith('Z') for row in members(p.pid)):reason=reason or 'formal worker exited with live descendants'
            final=observe(0);final['phase']='formal-final';record(final)
            reason=reason or formal_decision(final,guard=guard)
        except BaseException as error:reason=str(error) or type(error).__name__
        finally:
            if p:
                try:stopped=shutdown(p,directory+'/group-shutdown.json')
                except BaseException as error:
                    reason=(reason or '')+'; shutdown failure: '+str(error)
                    try:os.killpg(p.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                    try:p.wait(timeout=5)
                    except subprocess.TimeoutExpired:reason+='; parent termination unverified'
                    Path(directory+'/shutdown-error.json').write_text(json.dumps(dict(group=p.pid,at=time.time(),error=str(error),remainingRunning=None),indent=2)+'\n')
                finally:
                    if p.stdin:p.stdin.close()
                    if p.stdout:p.stdout.close()
            if sel:sel.close()
            result=dict(status='completed' if p and p.returncode==0 and not reason else 'interrupted',reason=reason,
                stage=stage,command=command,formalPermit=permit_file,startedAt=started,endedAt=time.time(),
                seconds=time.time()-started,exitCode=p.returncode if p else None,samples=samples,
                observedTreePeakBytes=peak,observedParentPeakBytes=parent_peak,minimumGuestAvailableBytes=minimum,
                minimumHostAvailableBytes=host_minimum,minimumInternalAvailableBytes=internal_minimum,
                remainingRunning=stopped['remainingRunning'] if stopped else None,sampleIntervalSeconds=guard['observationIntervalSeconds'],
                limits=dict(startBytes=guard['startBytes'],reserveBytes=guard['reserveBytes'],treeRssBytes=guard['maximumRssBytes'],
                    imageMaximumBytes=permit['storage']['imageMaximumBytes'],hostMetadataReserveBytes=permit['storage']['hostMetadataReserveBytes']),
                imageIdentity=image_identity,scope='one approved job; three disks measured separately; owned PGID; no automatic resume' if normal else 'legacy recovery only; three disks measured separately; owned PGID',
                **(dict(jobBinding=permit['jobBinding'],authorizationBinding=permit['authorizationBinding'],
                    ownerBinding=permit['ownerBinding'],guard=guard,observedNodeIdentity=approved.get('observedNodeIdentity')) if normal else {}))
            Path(directory+'/summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
    return 0 if result['status']=='completed' else 1

def run(directory,command,permit_file,approved_job_sha256=None,authorization_sha256=None,legacy_recovery_only=False):
    permit=json.loads(Path(permit_file).read_text())
    if permit.get('status')=='verified-approved-digest-job-v001':
        required(not legacy_recovery_only, 'normal approved jobs cannot use legacy recovery mode')
        return run_formal(directory,command,permit_file,approved_job_sha256,authorization_sha256)
    required(legacy_recovery_only and approved_job_sha256 is None and authorization_sha256 is None,
        'old permits require explicit legacy-recovery-only mode; no fallback')
    if permit.get('status')=='verified-formal-handoff-v001':return run_formal(directory,command,permit_file)
    if permit.get('status')=='verified-same-run-resume':return run_resume(directory,command,permit_file)
    raise RuntimeError('unknown supervisor permit status; no fallback')

def main(argv=None):
    import argparse
    parser=argparse.ArgumentParser(description='Validate an explicitly supplied Digest grant, launch once, or explicitly recover legacy work.')
    parser.add_argument('--approved-job-sha256')
    parser.add_argument('--authorization-sha256')
    parser.add_argument('--legacy-recovery-only',action='store_true')
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare-job',action='store_true',help='Read-only readiness check; grants no new permission and starts no worker.')
    mode.add_argument('--launch-job',action='store_true',help='Explicitly claim the approved fresh output and supervise one worker.')
    mode.add_argument('--get-job-result',action='store_true',help='Use the fixed Node read-only result qualifier; no owner or manufacture.')
    mode.add_argument('--finalize-job',action='store_true',help='Supervise only registration/finalization of this anchored pending result; no new media.')
    parser.add_argument('--job-file')
    parser.add_argument('--authorization-file')
    parser.add_argument('--node-path')
    parser.add_argument('--pending-result-file')
    parser.add_argument('--pending-result-file-sha256')
    parser.add_argument('--pending-result-size-bytes',type=int)
    parser.add_argument('--registration-bundle-file')
    parser.add_argument('--registration-bundle-sha256')
    parser.add_argument('--registration-bundle-size-bytes',type=int)
    parser.add_argument('directory',nargs='?')
    parser.add_argument('permit',nargs='?')
    parser.add_argument('command',nargs=argparse.REMAINDER)
    args=parser.parse_args(argv)
    record_options=[args.pending_result_file,args.pending_result_file_sha256,args.pending_result_size_bytes,
        args.registration_bundle_file,args.registration_bundle_sha256,args.registration_bundle_size_bytes]
    if args.get_job_result or args.finalize_job:
        required(not args.legacy_recovery_only and args.directory is None and args.permit is None and not args.command,
            'record-only utility cannot use legacy or direct-command arguments')
        return operate_approved_record_job(args.job_file,args.authorization_file,args.approved_job_sha256,args.authorization_sha256,
            args.pending_result_file,args.pending_result_file_sha256,args.pending_result_size_bytes,node_path=args.node_path,
            registration_bundle_file=args.registration_bundle_file,registration_bundle_sha256=args.registration_bundle_sha256,
            registration_bundle_size_bytes=args.registration_bundle_size_bytes,finalize=args.finalize_job)
    required(all(value is None for value in record_options), 'record-specific arguments require explicit get or finalize mode')
    if args.prepare_job or args.launch_job:
        required(not args.legacy_recovery_only and args.directory is None and args.permit is None and not args.command,
            'approved launcher cannot use legacy or direct-command arguments')
        operation=launch_approved_job if args.launch_job else prepare_approved_job
        result=operation(args.job_file,args.authorization_file,args.approved_job_sha256,args.authorization_sha256,args.node_path)
        if args.prepare_job:print(json.dumps(result),flush=True);return 0
        return result
    required(args.job_file is None and args.authorization_file is None and args.node_path is None,
        'job-file and node-path options require explicit prepare or launch mode')
    required(args.directory is not None and args.permit is not None and bool(args.command), 'supervised directory, permit and command required')
    return run(args.directory,args.command,args.permit,args.approved_job_sha256,args.authorization_sha256,args.legacy_recovery_only)

if __name__=='__main__':
    def cancelled(signum,frame):raise RuntimeError('supervisor interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM,cancelled)
    sys.exit(main())

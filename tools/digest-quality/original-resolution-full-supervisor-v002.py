"""Same-material resume supervisor. Keeps the original bound supervisor unchanged."""
import os, sys, json, time, signal, selectors, subprocess, importlib.util, hashlib, plistlib, stat, re
from pathlib import Path
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
        try:event['system']=old.observe(0,str(Path(report).parent))
        except BaseException as e:event['systemObservationError']=str(e)
        events.append(event);Path(report).write_text(json.dumps(dict(group=p.pid,events=events,remainingRunning=None),indent=2)+'\n');return rows
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
    Path(report).write_text(json.dumps(result,indent=2)+'\n')
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

def volume_identity(root,uuid,device,filesystem):
    actual=os.lstat(root)
    assert stat.S_ISDIR(actual.st_mode) and not stat.S_ISLNK(actual.st_mode),'volume root missing or symlink: '+root
    assert os.path.realpath(root)==root and actual.st_dev==device,'volume device or root changed: '+root
    info=plistlib.loads(subprocess.check_output(['diskutil','info','-plist',root]))
    assert info.get('VolumeUUID','').upper()==uuid and info.get('MountPoint')==root,'volume UUID or mount changed: '+root
    assert info.get('FilesystemType','').lower()==filesystem,'volume filesystem changed: '+root
    return dict(root=root,volumeUuid=uuid,device=device,deviceNode=info['DeviceNode'],filesystem=filesystem)

def observe_formal(group,permit,image_identity):
    storage=permit['storage'];guest=volume_identity(storage['guestRoot'],storage['guestVolumeUuid'],storage['guestDevice'],'apfs')
    host=volume_identity(storage['hostRoot'],storage['hostVolumeUuid'],storage['hostDevice'],'exfat')
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
        hostRequiredBytes=remaining+old.RESERVE+storage['hostMetadataReserveBytes'],
        hostStartRequiredBytes=storage['imageMaximumBytes']+old.RESERVE+storage['hostMetadataReserveBytes'],
        internalAvailableBytes=available(storage['internalRoot']),internalRoot=storage['internalRoot'])
    return sample

def formal_decision(sample,new_bytes=0,starting=False):
    if type(new_bytes) is not int or new_bytes<0:return 'invalid next allocation'
    reason=old.decision(sample,new_bytes,starting)
    if reason:return reason
    host_required=(FORMAL_STORAGE['imageMaximumBytes']+old.RESERVE+FORMAL_STORAGE['hostMetadataReserveBytes']) if starting else sample['hostRequiredBytes']
    if sample['hostAvailableBytes']<host_required:return 'host image growth plus reserve and metadata will not fit'
    if sample['internalAvailableBytes']<=old.RESERVE:return 'internal OS disk reached approved reserve'
    return None

def run_formal(directory,command,permit_file):
    # Exclusive directory is the one-time claim. No resume or fallback branch.
    permit=json.loads(Path(permit_file).read_text())
    assert os.path.abspath(permit_file)==permit['bindings']['commandPermitPath'],'formal permit path changed'
    image_identity=validate_formal_permit(permit,directory,command)
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
            initial=observe_formal(0,permit,image_identity);initial['phase']='formal-start';record(initial)
            reason=formal_decision(initial,starting=True)
            if reason:raise RuntimeError(reason)
            p=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,start_new_session=True,
                env={**os.environ,'ZEV_FULL_SUPERVISED':'1','ZEV_FORMAL_HANDOFF_PERMIT':os.path.abspath(permit_file)})
            Path(directory+'/owned-group.json').write_text(json.dumps(dict(group=p.pid,parentPid=p.pid,
                spawnedAt=time.time(),command=command,permitFile=permit_file,bindings=permit['bindings'],
                storage=permit['storage'],imageIdentity=image_identity),indent=2)+'\n')
            sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);buffer=b'';last=0
            while p.poll() is None:
                if time.monotonic()-last>=1:
                    sample=observe_formal(p.pid,permit,image_identity);record(sample);last=time.monotonic()
                    reason=formal_decision(sample)
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
                        current=observe_formal(p.pid,permit,image_identity);current['phase']='before-'+stage;record(current);last=time.monotonic()
                        reason=formal_decision(current,request['newBytes'])
                        if reason:raise RuntimeError(reason)
                        p.stdin.write((json.dumps(dict(id=request['id'],sample=current))+'\n').encode());p.stdin.flush()
            p.wait();reason=None if p.returncode==0 else 'formal worker nonzero exit'
            if any(not row['state'].startswith('Z') for row in members(p.pid)):reason=reason or 'formal worker exited with live descendants'
            final=observe_formal(0,permit,image_identity);final['phase']='formal-final';record(final)
            reason=reason or formal_decision(final)
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
                remainingRunning=stopped['remainingRunning'] if stopped else None,sampleIntervalSeconds=1,
                limits=dict(startBytes=old.START,reserveBytes=old.RESERVE,treeRssBytes=old.RSS,
                    imageMaximumBytes=FORMAL_STORAGE['imageMaximumBytes'],hostMetadataReserveBytes=FORMAL_STORAGE['hostMetadataReserveBytes']),
                imageIdentity=image_identity,scope='one new formal plan; three disks measured separately; owned PGID; no automatic resume')
            Path(directory+'/summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
    return 0 if result['status']=='completed' else 1

def run(directory,command,permit_file):
    permit=json.loads(Path(permit_file).read_text())
    if permit.get('status')=='verified-formal-handoff-v001':return run_formal(directory,command,permit_file)
    if permit.get('status')=='verified-same-run-resume':return run_resume(directory,command,permit_file)
    raise RuntimeError('unknown supervisor permit status; no fallback')
if __name__=='__main__':
    def cancelled(signum,frame):raise RuntimeError('supervisor interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM,cancelled)
    sys.exit(run(sys.argv[1],sys.argv[3:],sys.argv[2]))

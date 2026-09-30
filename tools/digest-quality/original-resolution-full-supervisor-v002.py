"""Same-material resume supervisor. Keeps the original bound supervisor unchanged."""
import os, sys, json, time, signal, selectors, subprocess, importlib.util, hashlib
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

def run(directory,command,resume_permit):
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
if __name__=='__main__':
    def cancelled(signum,frame):raise RuntimeError('supervisor interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM,cancelled)
    sys.exit(run(sys.argv[1],sys.argv[3:],sys.argv[2]))

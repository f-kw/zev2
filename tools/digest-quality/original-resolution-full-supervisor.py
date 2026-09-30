"""One approved same-material run; 1 s observation, no global limits/defaults."""
import os, sys, json, time, signal, selectors, subprocess
START = 50_000_000_000
RESERVE = 12_000_000_000
RSS = 17_179_869_184

def decision(sample, new_bytes=0, starting=False):
    if not isinstance(new_bytes,int) or new_bytes < 0: return 'invalid next allocation'
    if sample['pressure'] != 1: return 'OS memory pressure warning/critical or unknown'
    if sample['treeRssBytes'] >= RSS: return 'parent/child RSS reached approved boundary'
    if sample['availableBytes'] <= RESERVE: return 'disk reached approved reserve'
    if starting and sample['availableBytes'] < START: return 'insufficient start space'
    if sample['availableBytes'] < RESERVE + new_bytes: return 'next unit plus reserve will not fit'
    return None

def observe(root, filesystem):
    pressure=int(subprocess.check_output(['sysctl','-n','kern.memorystatus_vm_pressure_level'],text=True))
    memory=int(subprocess.check_output(['sysctl','-n','hw.memsize'],text=True))
    rows=[]
    for line in subprocess.check_output(['ps','-axo','pid=,ppid=,rss=,comm='],text=True).splitlines():
        a=line.strip().split(None,3)
        if len(a)==4: rows.append(dict(pid=int(a[0]),ppid=int(a[1]),rssBytes=int(a[2])*1024,tool=a[3]))
    owned={root} if root else set()
    while True:
        extra={r['pid'] for r in rows if r['ppid'] in owned}
        if extra<=owned: break
        owned|=extra
    members=[r for r in rows if r['pid'] in owned]
    if root and not any(r['pid']==root for r in members): raise RuntimeError('worker observation missing')
    fs=os.statvfs(filesystem)
    return dict(at=time.time(),availableBytes=fs.f_bavail*fs.f_frsize,pressure=pressure,memoryBytes=memory,parentRssBytes=next((r['rssBytes'] for r in members if r['pid']==root),0),treeRssBytes=sum(r['rssBytes'] for r in members),processes=members)

def run(directory,command):
    os.mkdir(directory)
    started=time.time(); samples=0; peak=0; parent_peak=0; minimum=None; reason=None; p=None; stage=None
    def record(s):
        nonlocal samples,peak,parent_peak,minimum
        samples+=1; peak=max(peak,s['treeRssBytes']);parent_peak=max(parent_peak,s['parentRssBytes']);minimum=min(minimum or s['availableBytes'],s['availableBytes'])
        observations.write(json.dumps(s)+'\n');observations.flush()
    with open(directory+'/resource.jsonl','x') as observations,open(directory+'/worker.log','xb') as log:
        try:
            initial=observe(0,directory);record(initial);reason=decision(initial,starting=True)
            if reason: raise RuntimeError(reason)
            p=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,start_new_session=True,env={**os.environ,'ZEV_FULL_SUPERVISED':'1'})
            sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);buffer=b'';last=0;sample=None
            while p.poll() is None:
                now=time.monotonic()
                if now-last>=1:
                    sample=observe(p.pid,directory);record(sample);last=now
                    reason=decision(sample)
                    if reason: raise RuntimeError(reason)
                for key,_ in sel.select(max(0,1-(time.monotonic()-last))):
                    chunk=os.read(key.fd,65536)
                    if not chunk: sel.unregister(key.fileobj);continue
                    log.write(chunk);log.flush();buffer+=chunk
                    while b'\n' in buffer:
                        line,buffer=buffer.split(b'\n',1)
                        if not line.startswith(b'@@RESOURCE_CHECK '): continue
                        request=json.loads(line[len(b'@@RESOURCE_CHECK '):]);stage=request['stage']
                        fs=os.statvfs(directory);current={**sample,'availableBytes':fs.f_bavail*fs.f_frsize}
                        reason=decision(current,request['newBytes'])
                        if reason: raise RuntimeError(reason)
                        p.stdin.write((json.dumps(dict(id=request['id'],sample=current))+'\n').encode());p.stdin.flush()
            p.wait();reason=reason or (None if p.returncode==0 else 'worker nonzero exit')
        except BaseException as e:
            reason=str(e)
            if p and p.poll() is None:
                os.killpg(p.pid,signal.SIGTERM)
                try:p.wait(timeout=5)
                except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
        finally:
            result=dict(status='completed' if p and p.returncode==0 and not reason else 'interrupted',reason=reason,stage=stage,command=command,startedAt=started,endedAt=time.time(),seconds=time.time()-started,exitCode=p.returncode if p else None,samples=samples,observedTreePeakBytes=peak,observedParentPeakBytes=parent_peak,minimumAvailableBytes=minimum,sampleIntervalSeconds=1,limits=dict(startBytes=START,reserveBytes=RESERVE,treeRssBytes=RSS),scope='this run only; owned process group; sampled peaks, no physical I/O measurement')
            with open(directory+'/summary.json','x') as f:json.dump(result,f,indent=2)
            print(json.dumps(result),flush=True)
    return 0 if result['status']=='completed' else 1
if __name__=='__main__':sys.exit(run(sys.argv[1],sys.argv[2:]))

"""Task-local RSS observation; sampling interval is measurement resolution, not an execution guard."""
import subprocess, os, time, json, sys
out, *cmd = sys.argv[1:]
t0=time.monotonic()
with open(out+'.log','xb') as log:
    p=subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)
    samples=[]
    while p.poll() is None:
        listing=subprocess.check_output(['ps','-axo','pid=,ppid=,rss=,comm='],text=True)
        rows=[]
        for line in listing.splitlines():
            a=line.strip().split(None,3)
            if len(a)==4: rows.append(dict(pid=int(a[0]),ppid=int(a[1]),rssBytes=int(a[2])*1024,tool=a[3]))
        owned={p.pid}
        while True:
            extra={r['pid'] for r in rows if r['ppid'] in owned}
            if extra<=owned: break
            owned|=extra
        children=[r for r in rows if r['pid'] in owned and r['pid']!=p.pid]
        parent=next((r['rssBytes'] for r in rows if r['pid']==p.pid),0)
        disk=os.statvfs('.')
        samples.append(dict(seconds=time.monotonic()-t0,parentRssBytes=parent,children=children,simultaneousTreeRssBytes=parent+sum(r['rssBytes'] for r in children),availableBytes=disk.f_bavail*disk.f_frsize))
        time.sleep(1)
    result=dict(command=cmd,exitCode=p.returncode,seconds=time.monotonic()-t0,sampleIntervalSeconds=1,meaning='Observed samples only; may miss subsecond peaks; no sum of maxima at different times',parentObservedPeakBytes=max((r['parentRssBytes'] for r in samples),default=0),simultaneousTreeObservedPeakBytes=max((r['simultaneousTreeRssBytes'] for r in samples),default=0),samples=samples)
    with open(out,'x') as f:json.dump(result,f,ensure_ascii=False,indent=2)
sys.exit(p.returncode)

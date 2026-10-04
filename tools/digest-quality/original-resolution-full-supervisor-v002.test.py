"""Small fault injection only; no media or GPU processes."""
import importlib.util,unittest,tempfile,subprocess,sys,os,time,json,signal
from pathlib import Path
s=importlib.util.spec_from_file_location('monitor',Path(__file__).with_name('original-resolution-full-supervisor-v002.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
CHILD="import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print('ready',flush=True);time.sleep(60)"
def parent_code(exit_parent):
 return "import subprocess,sys,time;from pathlib import Path;p=subprocess.Popen([sys.executable,'-u','-c',"+repr(CHILD)+"],stdout=subprocess.PIPE);p.stdout.readline();Path(sys.argv[1]).write_text(str(p.pid));"+("sys.exit(0)" if exit_parent else "time.sleep(60)")
class ShutdownTest(unittest.TestCase):
 def test_group_survives_parent_exit_and_ignores_term(self):
  with tempfile.TemporaryDirectory() as d:
   ready=Path(d)/'ready';p=subprocess.Popen([sys.executable,'-u','-c',parent_code(True),str(ready)],start_new_session=True);p.wait()
   self.assertTrue(ready.exists());self.assertTrue(m.members(p.pid))
   result=m.shutdown(p,Path(d)/'shutdown.json');self.assertEqual(result['remainingRunning'],[]);self.assertTrue(any(e['action']=='SIGTERM-survivors' for e in result['events']))
 def test_normal_group_exit(self):
  with tempfile.TemporaryDirectory() as d:
   p=subprocess.Popen([sys.executable,'-c','pass'],start_new_session=True);p.wait();self.assertEqual(m.shutdown(p,Path(d)/'stop.json')['remainingRunning'],[])
 def test_pressure_fault_stops_group_but_leaves_unrelated_process(self):
  with tempfile.TemporaryDirectory() as d:
   ready=Path(d)/'ready';permit=Path(d)/'permit.json';command=[sys.executable,'-u','-c',parent_code(False),str(ready)];permit.write_text(json.dumps({'status':'verified-same-run-resume','originalStartAvailableBytes':m.old.START,'implementation':[],'monitorDirectory':d+'/run','command':command}))
   outsider=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)'],start_new_session=True)
   original=m.old.observe
   def observation(root,filesystem):
    return dict(at=time.time(),availableBytes=m.old.START,pressure=2 if ready.exists() else 1,memoryBytes=0,parentRssBytes=0,treeRssBytes=0,processes=[])
   try:
    m.old.observe=observation
    rc=m.run(d+'/run',command,str(permit),legacy_recovery_only=True)
    self.assertEqual(rc,1);summary=json.loads(Path(d+'/run/summary.json').read_text());self.assertEqual(summary['remainingRunning'],[]);self.assertIn('pressure',summary['reason']);self.assertIsNone(outsider.poll())
   finally:m.old.observe=original;outsider.terminate();outsider.wait()
 def fault(self,kind):
  with tempfile.TemporaryDirectory() as d:
   ready=Path(d)/'ready';permit=Path(d)/'permit.json'
   code=parent_code(kind=='normal-parent-exit')
   if kind=='disconnect':code=code.rsplit('time.sleep(60)',1)[0]+"__import__('os').close(1);time.sleep(60)"
   command=[sys.executable,'-u','-c',code,str(ready)]
   permit.write_text(json.dumps(dict(status='verified-same-run-resume',originalStartAvailableBytes=m.old.START,implementation=[],monitorDirectory=d+'/run',command=command)))
   original=m.old.observe
   def observation(root,filesystem):
    if ready.exists() and kind=='observation-error':raise RuntimeError('injected observation failure')
    if ready.exists() and kind=='cancel':raise KeyboardInterrupt('injected cancellation')
    return dict(at=time.time(),availableBytes=m.old.START,pressure=1,memoryBytes=0,parentRssBytes=0,treeRssBytes=0,processes=[])
   try:
    m.old.observe=observation
    self.assertEqual(m.run(d+'/run',command,str(permit),legacy_recovery_only=True),1)
    summary=json.loads(Path(d+'/run/summary.json').read_text());self.assertEqual(summary['remainingRunning'],[]);self.assertEqual(summary['status'],'interrupted')
    self.assertTrue(Path(d+'/run/owned-group.json').exists())
    cleanup=json.loads(Path(d+'/run/group-shutdown.json').read_text());self.assertTrue(any(e['action']=='SIGTERM-survivors' for e in cleanup['events']))
   finally:m.old.observe=original
 def test_observation_failure(self):self.fault('observation-error')
 def test_cancellation(self):self.fault('cancel')
 def test_communication_disconnect(self):self.fault('disconnect')
 def test_normal_parent_exit_cannot_complete_with_child(self):self.fault('normal-parent-exit')
 def test_body_refreshes_pressure_before_reply(self):
  with tempfile.TemporaryDirectory() as d:
   command=[sys.executable,'-u','-c',"import sys,time;print('@@RESOURCE_CHECK {\"id\":1,\"stage\":\"body\",\"newBytes\":0}',flush=True);sys.stdin.readline();time.sleep(60)"]
   permit=Path(d)/'permit.json';permit.write_text(json.dumps(dict(status='verified-same-run-resume',originalStartAvailableBytes=m.old.START,implementation=[],monitorDirectory=d+'/run',command=command)))
   original=m.old.observe;calls=0
   def observation(root,filesystem):
    nonlocal calls
    calls+=1
    return dict(at=time.time(),availableBytes=m.old.START,pressure=2 if calls>=3 else 1,memoryBytes=0,parentRssBytes=0,treeRssBytes=0,processes=[])
   try:
    m.old.observe=observation;self.assertEqual(m.run(d+'/run',command,str(permit),legacy_recovery_only=True),1)
    rows=[json.loads(x) for x in Path(d+'/run/resource.jsonl').read_text().splitlines()]
    body=[x for x in rows if x.get('phase')=='immediately-before-body'];self.assertEqual(len(body),1);self.assertEqual(body[0]['pressure'],2)
   finally:m.old.observe=original
if __name__=='__main__':unittest.main()



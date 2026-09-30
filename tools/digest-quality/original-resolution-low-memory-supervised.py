"""Short trial using the approved v002 group observation and shutdown semantics."""
import importlib.util
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).parent
def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

monitor = load('monitor_v002', 'original-resolution-full-supervisor-v002.py')
limits = monitor.old

def run(directory, command):
    os.mkdir(directory)
    started = time.time()
    process = None
    reason = None
    observations = []
    stopped = None
    with open(directory + '/resource.jsonl', 'x') as resource, open(directory + '/worker.log', 'xb') as worker_log:
        try:
            initial = limits.observe(0, directory)
            observations.append(initial)
            resource.write(json.dumps(initial) + '\n')
            resource.flush()
            reason = limits.decision(initial)
            if reason:
                raise RuntimeError(reason)
            process = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=worker_log,
                                       stderr=subprocess.STDOUT, start_new_session=True)
            Path(directory + '/owned-group.json').write_text(json.dumps({'group': process.pid, 'command': command}) + '\n')
            while process.poll() is None:
                sample = monitor.observe_group(process.pid, directory)
                observations.append(sample)
                resource.write(json.dumps(sample) + '\n')
                resource.flush()
                reason = limits.decision(sample)
                if reason:
                    raise RuntimeError(reason)
                time.sleep(1)
            if process.returncode != 0:
                reason = 'worker nonzero exit'
        except BaseException as error:
            reason = str(error) or type(error).__name__
        finally:
            if process:
                try:
                    stopped = monitor.shutdown(process, directory + '/group-shutdown.json')
                except BaseException as error:
                    reason = (reason or '') + '; shutdown failure: ' + str(error)
            result = {'status': 'completed' if process and process.returncode == 0 and not reason else 'interrupted',
                      'reason': reason, 'command': command, 'startedAt': started, 'endedAt': time.time(),
                      'exitCode': process.returncode if process else None, 'samples': len(observations),
                      'maximumParentRssBytes': max((s['parentRssBytes'] for s in observations), default=None),
                      'maximumTreeRssBytes': max((s['treeRssBytes'] for s in observations), default=None),
                      'minimumAvailableBytes': min((s['availableBytes'] for s in observations), default=None),
                      'pressureValues': sorted(set(s['pressure'] for s in observations)),
                      'maximumObservedProcesses': max((len(s['processes']) for s in observations), default=None),
                      'remainingRunning': stopped['remainingRunning'] if stopped else None,
                      'limits': {'reserveBytes': limits.RESERVE, 'treeRssBytes': limits.RSS,
                                 'pressure': 'normal only'}, 'sampleIntervalSeconds': 1}
            Path(directory + '/summary.json').write_text(json.dumps(result, indent=2) + '\n')
            print(json.dumps(result), flush=True)
            return 0 if result['status'] == 'completed' else 1

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(RuntimeError('trial cancelled')))
    sys.exit(run(sys.argv[1], sys.argv[2:]))

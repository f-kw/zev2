"""Wait for the unchanged main encode, verify it, then stop only its legacy QC child."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT = Path('/Users/kawafmm/workspace/zev2')
WORK = ROOT / 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001'
SOURCE = WORK / 'formal-v004/render-attempt-v008'
PROCESS = SOURCE / 'process-observations/unseen-SsdxVhwxyYo-024-v001-render-v008/1464-video-composite'
CAPTURE = WORK / 'render-v008-completed-main-verification-v001.json'
PARENT = 26979
ENTRY = ROOT / 'evals/clip_composition/run_unseen_material_qc_only_v001.mjs'

def save(name, value):
    with (WORK / name).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')

def sha(p):
    with p.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

proof_path = WORK / 'qc-lossless-verification-v001.json'
proof = json.loads(proof_path.read_text())
assert proof['status'] == 'passed'
for ref in proof['implementationBindings'] + proof['artifacts']:
    assert sha(ROOT / ref['path']) == ref['fileSha256'], ref['path']
decision_path = WORK / 'advisor-qc-lossless-cache-decision-v001.json'
decision = json.loads(decision_path.read_text())
assert decision['decision'] == 'continue' and decision['allowCompletedMainVideoAsQcOnlyInput']
assert CAPTURE.is_file()
assert (PROCESS / 'exit-code.txt').read_text().strip() == '0'
assert (PROCESS / 'signal.txt').read_text().strip() == 'none'
captured = json.loads(CAPTURE.read_text())
assert captured['status'] == 'main-video-completed-and-verified'
assert captured['media']['video']['frameCount'] == 65363
assert sha(ROOT / captured['video']['path']) == captured['video']['fileSha256']
assert sha(ENTRY) == captured['captureImplementation']['fileSha256']
print('Main media verified. Locating only the owned legacy counterfactual encoder.', flush=True)
while True:
    lines = subprocess.check_output(['ps', '-axww', '-o', 'pid=,ppid=,command='], text=True).splitlines()
    processes = {}
    for line in lines:
        parts = line.strip().split(None, 2)
        if len(parts) == 3:
            processes[int(parts[0])] = {'pid': int(parts[0]), 'ppid': int(parts[1]), 'commandRepresentation': parts[2]}
    targets = []
    for pid, row in processes.items():
        command = row['commandRepresentation']
        if not (command.startswith('/opt/homebrew/bin/ffmpeg ') and 'frag_keyframe+empty_moov+default_base_moof' in command):
            continue
        lineage = []
        current = row
        seen = set()
        while current['pid'] != PARENT and current['pid'] not in seen:
            seen.add(current['pid'])
            lineage.append(current)
            current = processes.get(current['ppid'])
            if current is None:
                break
        if current is None or current['pid'] != PARENT:
            continue
        assert any('render_presentation_v002.mjs --counterfactual-frame' in item['commandRepresentation']
                   and '.render-v008.presentation-renderer-v002-work-J6DQda/scratch/frames/' in item['commandRepresentation']
                   for item in lineage[1:]), 'QC helper ownership was not observed'
        assert 'formal-v004/base-media/base-media.mp4' in command
        assert '-f mp4 pipe:1' in command
        targets.append({**row, 'ownedAncestry': lineage[1:] + [current]})
    assert len(targets) <= 1
    if targets:
        break
    assert not (SOURCE / 'renderer-result.json').exists(), 'Source execution already ended; inspect before switching'
    os.kill(PARENT, 0)
    time.sleep(1)
target = targets[0]
save('render-v008-qc-only-switch-before-signal-v001.json', {
    'status': 'planned-qc-only-switch-main-complete', 'target': target,
    'action': 'SIGINT only to the legacy counterfactual QC encoder after successful full-main verification',
    'mainCompletionPath': str(CAPTURE.relative_to(ROOT)), 'mainCompletionSha256': sha(CAPTURE),
    'equivalenceProofSha256': sha(proof_path), 'advisorDecisionSha256': sha(decision_path),
    'mainFfmpegExitCode': 0, 'mainProcessSignalled': False,
    'reason': 'Proceed with the approved separate lossless QC execution; preserve the source execution interruption honestly.'})
os.kill(target['pid'], signal.SIGINT)
print('SIGINT sent only to legacy QC encoder ' + str(target['pid']), flush=True)
while not (SOURCE / 'renderer-result.json').exists():
    time.sleep(1)
source_result = json.loads((SOURCE / 'renderer-result.json').read_text())
save('render-v008-qc-only-switch-result-v001.json', {
    'status': 'legacy-qc-ended-after-planned-switch', 'targetPid': target['pid'],
    'sourceExecutionPath': str((SOURCE / 'renderer-result.json').relative_to(ROOT)),
    'sourceExecutionSha256': sha(SOURCE / 'renderer-result.json'),
    'sourceExecutionExitCode': source_result['exitCode'],
    'mainCompletionPath': str(CAPTURE.relative_to(ROOT)), 'mainCompletionSha256': sha(CAPTURE),
    'finalVisibilityQc': 'pending-separate-approved-execution'})
print('Source execution saved. Ready for separate QC.', flush=True)

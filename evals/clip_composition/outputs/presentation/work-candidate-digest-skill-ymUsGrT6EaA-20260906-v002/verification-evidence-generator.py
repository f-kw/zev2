import base64, hashlib, json, subprocess
from pathlib import Path

ROOT = Path('/Users/kawafmm/workspace/zev2')
P = ROOT / 'evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002'
def read(name):
    return json.loads((P / name).read_text())
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()
def ref(path):
    return {'path': str(path.relative_to(ROOT)), 'fileSha256': digest(path), 'sizeBytes': path.stat().st_size}
def save(name, value):
    with (P / name).open('x') as f:
        f.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

m, verified, execution = read('manifest.json'), read('verification.json'), read('renderer-result.json')
assert verified['status'] == 'passed'
assert execution['exitCode'] == 0 and execution['result']['status'] == 'completed'
qc = execution['result']['qc']
assert qc['status'] == 'passed' and not qc['violations'] and qc['instructionCount'] == 51
a, e, g = read('machine-adoption.json'), read('edit-plan.json'), read('base-media/generation-manifest.json')
job, admission, invocation = read('renderer-job.json'), read('admission-receipt.json'), read('core-invocation.json')
plan = read('plan-snapshot.json')
assert g['source']['fileSha256'] == plan['request']['sourceVideo']['fileSha256']
assert g['source']['path'] == plan['request']['sourceVideo']['path']
assert g['assemblyDecision']['fileSha256'] == digest(P / 'machine-adoption.json')
assert g['basisEditPlan']['fileSha256'] == digest(P / 'edit-plan.json')
assert invocation['legacyHumanApprovalJobEntry'] == 'not-invoked'
assert invocation['individualCandidateHumanApproval'] == 'not-performed'
assert job['cropAppliedBaseMedia'] == m['baseMedia']
assert admission['status'] == 'accepted'
assert admission['rendererJobBinding'] == m['core']['rendererJob']
assert g['outputs']['baseMedia']['fileSha256'] == digest(P / 'base-media/base-media.mp4')
assert m['renderer']['video']['fileSha256'] == digest(ROOT / m['renderer']['video']['path'])
old = P.parent / 'work-candidate-digest-skill-ymUsGrT6EaA-20260906-v001'
for name in ['candidate-request.json', 'candidate-response.json', 'candidate-result.json']:
    assert (P / name).read_bytes() == (old / name).read_bytes()
utterances = json.loads((ROOT / plan['request']['utterances']['path']).read_text())['utterances']
by_id = {v['utteranceId']: v for v in utterances}
for selected, interval in zip(a['selectedCandidates'], e['segments']):
    expected_ids = [i for u in selected['includedUtteranceIds'] for i in by_id[u]['sourceSegmentIds']]
    assert selected['sourceSegmentIds'] == interval['sourceSegmentIds'] == expected_ids
    assert interval['sourceStartMs'] == by_id[selected['includedUtteranceIds'][0]]['sourceStartMs']
    assert interval['sourceEndMs'] == by_id[selected['includedUtteranceIds'][-1]]['sourceEndMs']
assert len(a['selectedCandidates']) == 3
assert len({i for v in a['selectedCandidates'] for i in v['sourceSegmentIds']}) == 693
meaning, instruction = read('meaning-input.json'), read('instruction.json')
assert ''.join(v['content']['text'] for v in instruction['instructions']) == meaning['captions'][0]['text']
assert len(instruction['instructions']) == 51
for row in qc['instructionEvidence']:
    assert row['visibilityComparisonBasis'] == 'same-composite-with-instruction-omitted'
    assert row['changedPixelsAgainstInstructionOmittedFrame'] > 0

historical = []
for record_name in ['renderer-environment-continuation.json', 'renderer-layout-continuation.json']:
    continuation = read(record_name)
    for item in continuation['preservedFiles']:
        preserved = ROOT / continuation['priorFailureDirectory'] / item['path']
        assert digest(preserved) == item['fileSha256']
        historical.append({'originalPath': str((P / item['path']).relative_to(ROOT)),
            'preservedPath': str(preserved.relative_to(ROOT)), 'fileSha256': item['fileSha256']})
old_plan = json.loads((ROOT / 'evals/clip_composition/jobs/presentation/candidate-digest-skill-e2e/fixed-plan-v001.json').read_text())
old_implementation = []
checkpoint = '664380fbd73378693066d02ea1be84043b1be462'
for binding in old_plan['implementationBindings']:
    blob = subprocess.check_output(['git', 'show', f"{checkpoint}:{binding['path']}"], cwd=ROOT)
    assert hashlib.sha256(blob).hexdigest() == binding['fileSha256']
    old_implementation.append({'commit': checkpoint, **binding})
for binding in plan['implementationBindings']:
    assert digest(ROOT / binding['path']) == binding['fileSha256']
save('recovery-history-resolution.json', {'schemaVersion': 'candidate-digest-recovery-history-resolution-v001',
    'status': 'passed', 'historicalArtifactLocations': historical,
    'initialJudgmentImplementation': old_implementation,
    'currentPlanImplementationSha': 'exact',
    'resolutionRule': '過去の失敗記録内の元pathとSHAは、この保存先対応表または初回実行checkpointで解決する。現在の成果pathへ過去のSHAを当てて同一成果と扱わない。'})

observations = []
for parent in [P / 'process-observations', P / 'failed-renderer-attempt-v001/process-observations', P / 'failed-layout-attempt-v001/process-observations']:
    for f in sorted(parent.rglob('*')):
        if f.is_file():
            observations.append({**ref(f), 'encoding': 'base64', 'bytes': base64.b64encode(f.read_bytes()).decode('ascii')})
save('process-observation-evidence.json', {'schemaVersion': 'candidate-digest-process-observation-evidence-v001',
    'status': 'captured-exact-bytes', 'files': observations})

names = ['manifest.json', 'verification.json', 'test-evidence.json', 'caption-repair-scope-verification.json',
    'candidate-request.json', 'candidate-response.json', 'candidate-result.json', 'machine-adoption.json',
    'edit-plan.json', 'plan-snapshot.json', 'core-invocation.json', 'base-media/generation-manifest.json',
    'base-media/timeline.json', 'base-media/validation-receipt.json', 'meaning-input.json', 'source-package.json',
    'instruction.json', 'renderer-job.json', 'admission-receipt.json', 'renderer-result.json',
    'renderer-environment-continuation.json', 'renderer-layout-continuation.json', 'process-observation-evidence.json',
    'recovery-history-resolution.json', 'base-media-negative-test-evidence.json']
displays = []
for i in range(1, 4):
    request = read(f'display-{i}-request.json')
    response = read(f'display-{i}-response.json')
    names += [f'display-{i}-{name}.json' for name in ['request', 'response', 'result']]
    displays.append({'request': ref(P / f'display-{i}-request.json'),
        'inputText': ''.join(v['text'] for v in request['input']['captions'][0]['boundaryCandidates']),
        'response': response})
claims = {'status': 'passed', 'candidateRequestAndAnswerUnchangedAfterRecovery': True,
    'newCandidateJudgmentsForThisWork': 1, 'adoptedCandidates': 3, 'selectedSourceTextAtoms': 693,
    'candidateIdsToSourceIntervals': 'exact', 'manufacturingInputSourceSha': 'exact',
    'manufacturingAdoptionAndEditPlanSha': 'exact', 'rendererConsumesNewBaseMedia': 'exact',
    'baseMediaSha': 'exact', 'finalVideoSha': 'exact', 'captionTextPreservation': 'exact',
    'actualCaptionVisibilityChecksPassed': 51, 'individualCandidateHumanApproval': 'not-performed',
    'humanQuality': 'not-evaluated'}
save('provenance-verification.json', {'schemaVersion': 'candidate-digest-provenance-verification-v001', **claims})
names += ['provenance-verification.json']
save('audit-evidence.json', {'schemaVersion': 'candidate-digest-audit-evidence-v001',
    'instruction': 'ZEV進行管理２ 指示-001', 'claims': claims, 'artifacts': [ref(P / n) for n in names],
    'continuationImplementation': ref(ROOT / 'evals/clip_composition/resume_candidate_digest_renderer_after_environment_failure_v001.mts'),
    'recoveryHistoryResolution': ref(P / 'recovery-history-resolution.json'),
    'plan': plan, 'candidateRequest': read('candidate-request.json'), 'candidateResponse': read('candidate-response.json'),
    'candidateResult': read('candidate-result.json'), 'adoption': a, 'coreInvocation': invocation,
    'baseMediaGeneration': g, 'baseMediaValidation': read('base-media/validation-receipt.json'),
    'displayJudgments': displays, 'captionRepairScope': read('caption-repair-scope-verification.json'),
    'captionInstructionSummary': [{'instructionId': v['instructionId'], 'content': v['content'],
        'outputTime': v['outputTime']} for v in instruction['instructions']],
    'technicalQc': qc, 'testEvidence': read('test-evidence.json'), 'verification': verified,
    'video': ref(ROOT / m['renderer']['video']['path']), 'baseMedia': ref(P / 'base-media/base-media.mp4'),
    'scope': '実行artifactの監査用抽出。source codeを含めず、全原文のpath/SHAはartifactsで参照する。'})
print(json.dumps({'video': ref(ROOT / m['renderer']['video']['path']),
    'auditEvidence': ref(P / 'audit-evidence.json'), 'processFiles': len(observations), 'claims': claims}, ensure_ascii=False))

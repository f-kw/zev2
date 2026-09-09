"""Verify the completed render against the already accepted new-source artifacts."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001'
FORMAL = WORK / 'formal-v004'


def read(path):
    return json.loads(path.read_text())


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def binding(path):
    return {'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size,
            'fileSha256': digest(path)}


def check(ref):
    path = ROOT / ref['path']
    assert digest(path) == ref['fileSha256'], str(path)
    return read(path)


def main():
    completion = read(FORMAL / 'render-completion.json')
    assert completion['status'] == 'technical-render-complete'
    assert completion['qc'] == 'passed' and completion['humanQuality'] == 'not-evaluated'
    check(completion['planBinding'])
    adoption = check(completion['machineAdoptionBinding'])
    assert len(adoption['selectedCandidates']) == 10
    execution = check(completion['execution'])
    assert execution['exitCode'] == 0 and execution['result']['status'] == 'completed'
    setup = check(execution['setupFixBinding'])
    optimization = check(setup['qcEquivalenceBinding'])
    assert optimization['status'] == 'passed'
    assert optimization['omittedFramesPixelIdentical'] and optimization['mainEncodingArgumentsUnchanged']
    assert optimization['allRequiredNegativeCasesVerified']
    job = check(execution['rendererJobBinding'])
    admission = check(completion['admission'])
    layout = check(completion['lineLayout'])
    assert admission['status'] == 'accepted'
    assert admission['rendererJobBinding'] == execution['rendererJobBinding']
    assert layout['instructionArtifactBinding'] == job['instructionArtifactBinding']
    instruction = check(job['instructionArtifactBinding'])
    linkage = read(WORK / 'core-caption-linkage-verification-v001.json')
    assert linkage['status'] == 'passed'
    for ref in linkage['artifacts']:
        assert digest(ROOT / ref['path']) == ref['fileSha256'], ref['path']
    ids = [row['instructionId'] for row in instruction['instructions']]
    assert len(ids) == 343 and len(set(ids)) == len(ids)
    assert [row['instructionId'] for row in layout['entries']] == ids
    for row, entry in zip(instruction['instructions'], layout['entries']):
        assert ''.join(line['text'] for line in entry['lines']) == row['content']['text']
        assert [unit for line in entry['lines'] for unit in line['sourceUnitIds']] == row['targetProvenance']['atomOccurrenceIds']
    before = read(FORMAL / 'render-attempt-v003/renderer-job.json')
    for key in ['instructionArtifactBinding', 'lineEndProjectionBinding', 'executionInputs',
                'cropAppliedBaseMedia', 'runtimeBindings', 'approvedContractBindings']:
        assert job[key] == before[key], key
    implementation_changes = []
    assert len(job['rendererImplementationBindings']) == len(before['rendererImplementationBindings'])
    for old, new in zip(before['rendererImplementationBindings'], job['rendererImplementationBindings']):
        assert old['role'] == new['role'] and old['path'] == new['path']
        assert digest(ROOT / new['path']) == new['fileSha256']
        if old != new:
            assert new['path'] == optimization['implementationBinding']['path']
            assert new['fileSha256'] == optimization['implementationBinding']['fileSha256']
            implementation_changes.append({'before': old, 'after': new})
    assert len(implementation_changes) == 1
    original = check(before['registryBindings']['styleProfileRegistry'])
    adjusted = check(job['registryBindings']['styleProfileRegistry'])

    def changes(left, right, path=''):
        if isinstance(left, dict) and isinstance(right, dict):
            assert left.keys() == right.keys(), path
            return [r for k in left for r in changes(left[k], right[k], path + '/' + k)]
        if isinstance(left, list) and isinstance(right, list):
            assert len(left) == len(right), path
            return [r for i, (a, b) in enumerate(zip(left, right)) for r in changes(a, b, path + '/' + str(i))]
        return [] if left == right else [{'path': path, 'before': left, 'after': right}]

    changed = changes(original, adjusted)
    assert len(changed) == 1 and changed[0]['path'].endswith('/textStyle/fontSizePx')
    font_selection = check(setup['fontSizeSelectionBinding'])
    assert font_selection['status'] == 'single-caption-probe-passed'
    assert changed[0]['before'] == 96
    assert changed[0]['after'] == font_selection['selectedFontSizePx'] == 94
    old_trust = check(before['registryBindings']['rendererTrust'])
    new_trust = check(job['registryBindings']['rendererTrust'])
    assert {**new_trust, 'presetRegistry': old_trust['presetRegistry']} == old_trust
    assert new_trust['presetRegistry']['fileSha256'] == job['registryBindings']['styleProfileRegistry']['fileSha256']
    pre_render_layout = read(WORK / 'pre-render-layout-font94-verification-v001.json')
    assert pre_render_layout['status'] == 'passed' and pre_render_layout['inspectedCaptions'] == len(ids)
    assert pre_render_layout['violationCount'] == 0 and pre_render_layout['maximumWrapperWidthPx'] <= 1760
    qc = execution['result']['qc']
    assert qc['status'] == 'passed' and not qc['violations']
    assert qc['instructionCount'] == len(ids)
    assert [row['instructionId'] for row in qc['instructionEvidence']] == ids
    assert all(row['status'] == 'passed' for row in qc['checks'].values())
    safe = adjusted['canvas']['safeAreaPx']
    for evidence in qc['instructionEvidence']:
        for bounds in [evidence['alphaBounds'], *evidence['lineAlphaBounds']]:
            assert bounds['left'] >= safe['left']
            assert bounds['right'] <= adjusted['canvas']['width'] - safe['right']
            assert bounds['top'] >= safe['top']
            assert bounds['bottom'] <= adjusted['canvas']['height'] - safe['bottom']
    video = ROOT / completion['video']['path']
    assert digest(video) == completion['video']['fileSha256']
    output_qc = video.parent / 'presentation-render-qc-v002.json'
    assert read(output_qc) == qc
    timeline = read(FORMAL / 'base-media/timeline.json')
    assert qc['mediaEvidence']['expectedFrameCount'] == timeline['baseMedia']['expectedFrameCount'] == 65363
    assert qc['mediaEvidence']['observed']['video']['frameCount'] == 65363
    preexisting = read(ROOT / 'evals/clip_composition/outputs/presentation/work-contrast-thin-plan-human-closure-20260909-v001/preexisting-work.json')
    for row in preexisting['files']:
        assert digest(ROOT / row['path']) == row['fileSha256'], row['path']
    result = {'schemaVersion': 'unseen-material-final-render-verification-v001', 'status': 'passed',
              'sourceId': 'SsdxVhwxyYo', 'captionCount': len(ids), 'adoptedCandidates': 10,
              'frameCount': 65363, 'durationSeconds': 65363 / 30,
              'video': binding(video), 'qc': binding(output_qc),
              'completion': binding(FORMAL / 'render-completion.json'),
              'coreLinkage': binding(WORK / 'core-caption-linkage-verification-v001.json'),
              'preRenderLayoutCalculation': binding(WORK / 'pre-render-layout-font94-verification-v001.json'),
              'approvedDisplayChange': changed, 'preexistingFilesUnchanged': len(preexisting['files']),
              'approvedQcImplementationChange': implementation_changes,
              'qcOptimization': setup['qcEquivalenceBinding'],
              'fontSizeSelection': setup['fontSizeSelectionBinding'],
              'actualPngSafeAreaPassed': len(qc['instructionEvidence']),
              'checks': ['original-caption-artifacts-same-bytes', 'all-cues-and-lines-exact',
                         'unchanged-renderer-inputs', 'only-approved-qc-implementation-change', 'only-approved-font-size-change',
                         'trust-rules-font-assets-dependencies-unchanged', 'all-pre-render-layout-calculations-passed',
                         'all-343-actual-png-safe-areas-passed', 'all-final-render-qc-passed', 'all-instructions-applied-once',
                         'rendered-frames-match-adopted-timeline', 'final-video-sha256-exact'],
              'humanQuality': 'not-evaluated', 'independentBlindTrialClaim': False}
    target = WORK / 'final-render-verification-v001.json'
    with target.open('x') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

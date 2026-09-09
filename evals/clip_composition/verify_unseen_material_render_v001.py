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
    assert completion['schemaVersion'] == 'unseen-material-render-completion-v002'
    assert completion['status'] == 'technical-render-complete'
    assert completion['qc'] == 'passed' and completion['humanQuality'] == 'not-evaluated'
    check(completion['planBinding'])
    adoption = check(completion['machineAdoptionBinding'])
    assert len(adoption['selectedCandidates']) == 10
    execution = check(completion['execution'])
    assert execution['status'] == 'completed' and execution['mode'] == 'qc-only-existing-main'
    main = check(completion['sourceMainCompletion'])
    assert completion['sourceMainCompletion'] == execution['sourceMainCompletionBinding']
    assert main['status'] == 'main-video-completed-and-verified'
    source_execution = check(execution['sourceRendererExecutionBinding'])
    assert source_execution['rendererJobBinding'] == execution['sourceRendererJobBinding'] == main['sourceRendererJobBinding']
    switch_before_path = WORK / 'render-v008-qc-only-switch-before-signal-v001.json'
    switch_after_path = WORK / 'render-v008-qc-only-switch-result-v001.json'
    switch_before, switch_after = read(switch_before_path), read(switch_after_path)
    assert switch_before['status'] == 'planned-qc-only-switch-main-complete'
    assert switch_before['mainFfmpegExitCode'] == 0 and switch_before['mainProcessSignalled'] is False
    assert switch_before['mainCompletionSha256'] == completion['sourceMainCompletion']['fileSha256']
    assert switch_after['status'] == 'legacy-qc-ended-after-planned-switch'
    assert switch_after['targetPid'] == switch_before['target']['pid']
    assert switch_after['sourceExecutionSha256'] == execution['sourceRendererExecutionBinding']['fileSha256']
    assert switch_after['sourceExecutionExitCode'] == source_execution['exitCode'] != 0
    setup = check(source_execution['setupFixBinding'])
    for ref in main['mainProcessEvidence']:
        path = ROOT / ref['path']
        assert digest(path) == ref['fileSha256']
        if path.name == 'exit-code.txt':
            assert path.read_text().strip() == '0'
        if path.name == 'signal.txt':
            assert path.read_text().strip() == 'none'
    actual_args = check(main['sourceActualArguments'])
    assert actual_args['commandRepresentation'] == ' '.join(main['expectedArguments'])
    cache_proof = check(execution['equivalenceProofBinding'])
    assert cache_proof['status'] == 'passed'
    assert cache_proof['allPreEncodePixelsIdentical'] and cache_proof['allEncodedDecodedPixelsIdentical']
    assert cache_proof['allRepresentativePngsIdentical'] and cache_proof['overlappingInputsRejected']
    for ref in [*cache_proof['implementationBindings'], *cache_proof['artifacts']]:
        assert digest(ROOT / ref['path']) == ref['fileSha256']
    provenance = check(execution['provenanceBinding'])
    assert provenance['mainVideoProducer'] == completion['sourceMainCompletion']
    assert provenance['sourceRendererExecution'] == execution['sourceRendererExecutionBinding']
    assert provenance['newMainVideoEncodes'] == provenance['newlyRenderedOverlayPngs'] == 0
    actual_cache = check(provenance['cacheProof'])
    assert actual_cache['status'] == 'passed' and actual_cache['actualEncodedFramesIdentical'] == 65363
    assert actual_cache['decodedComparisonPixelFormat'] == 'rgba'
    optimization = check(setup['qcEquivalenceBinding'])
    assert optimization['status'] == 'passed'
    assert optimization['omittedFramesPixelIdentical'] and optimization['mainEncodingArgumentsUnchanged']
    assert optimization['allRequiredNegativeCasesVerified']
    resources = check(setup['resourceEquivalenceBinding'])
    assert resources['status'] == 'passed'
    assert resources['defaultArgumentsUnchanged'] and resources['allDecodedFramesIdentical']
    assert resources['streamedQcFramesIdentical'] and resources['baseDecoderAndEncoderThreadsUnchanged']
    assert setup['executionControl'] == {'serializePngAndFilters': True}
    for ref in [*resources['implementationBindings'], *resources['artifacts']]:
        assert digest(ROOT / ref['path']) == ref['fileSha256'], ref['path']
    job = check(execution['sourceRendererJobBinding'])
    assert job['rendererImplementationBindings'] == main['sourceImplementationBindings']
    admission = check(completion['admission'])
    layout = check(completion['lineLayout'])
    assert admission['status'] == 'accepted'
    assert admission['rendererJobBinding'] == execution['sourceRendererJobBinding']
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
    runtime_verification = []
    for role, ref in job['runtimeBindings'].items():
        resolved = Path(ref['path']).resolve(strict=True)
        assert digest(resolved) == ref['fileSha256'], ref['path']
        assert Path(ref['path']).resolve(strict=True) == resolved
        runtime_verification.append({'role': role, 'path': ref['path'],
                                     'resolvedPath': str(resolved), 'fileSha256': ref['fileSha256']})
    implementation_changes = []
    permitted = {row['path']: row for row in resources['implementationBindings']}
    previous = {row['path']: row for row in resources['priorImplementationBindings']}
    assert len(job['rendererImplementationBindings']) == len(before['rendererImplementationBindings'])
    for old, new in zip(before['rendererImplementationBindings'], job['rendererImplementationBindings']):
        assert old['role'] == new['role'] and old['path'] == new['path']
        assert digest(ROOT / new['path']) == new['fileSha256']
        if old != new:
            assert new['fileSha256'] == permitted[new['path']]['fileSha256']
            if new['path'] == optimization['implementationBinding']['path']:
                assert old['fileSha256'] == optimization['legacyImplementationFileSha256']
                assert previous[new['path']]['fileSha256'] == optimization['implementationBinding']['fileSha256']
            else:
                assert new['path'] == 'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts'
                assert old['fileSha256'] == previous[new['path']]['fileSha256']
            implementation_changes.append({'before': old, 'after': new})
    assert len(implementation_changes) == 2
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
    qc = execution['qc']
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
    assert completion['video']['fileSha256'] == main['video']['fileSha256']
    assert digest(ROOT / main['video']['path']) == main['video']['fileSha256']
    assert qc['mediaEvidence']['observed'] == main['media']
    assert len(provenance['measuredCaptions']) == 343
    for ref, instruction_id in zip(provenance['measuredCaptions'], ids):
        measured = check(ref)
        assert measured['instructionId'] == instruction_id and measured['changedPixels'] > 0
        request = check(measured['request'])
        assert request['instructionId'] == instruction_id
        assert measured['outcome']['status'] == 'completed'
        assert measured['outcome']['outputFileSha256'] == measured['omittedFrame']['fileSha256']
        for frame in [measured['fullFrame'], measured['omittedFrame']]:
            assert digest(ROOT / frame['path']) == frame['fileSha256']
    output_qc = video.parent / 'presentation-render-qc-v002.json'
    assert read(output_qc) == qc
    retained = check(setup['retainedPngVerificationBinding'])
    assert retained['status'] == 'passed' and retained['actualPngCount'] == 343
    reused = check(source_execution['overlayRestartProvenanceBinding'])
    assert reused['mode'] == 'one-time-restart-with-verified-retained-artifacts'
    assert reused['newlyRenderedPngs'] == 0
    assert reused['verifiedDrawInputCount'] == 343 and reused['drawInputsExactlyVerified']
    assert reused['sourceRendererJobBinding'] == setup['priorRendererJobBinding']
    assert reused['sourcePngVerificationBinding'] == setup['retainedPngVerificationBinding']
    expected_copies = 343 * 2 + sum(len(row['lines']) for row in layout['entries'])
    assert len(reused['copiedArtifacts']) == expected_copies
    assert len({row['destination'] for row in reused['copiedArtifacts']}) == expected_copies
    main_copies = [row for row in reused['copiedArtifacts'] if row['kind'] == 'retained-v007-main']
    repeat_copies = [row for row in reused['copiedArtifacts'] if row['kind'] == 'retained-v007-repeat']
    assert [row['instructionId'] for row in main_copies] == ids
    assert [row['instructionId'] for row in repeat_copies] == ids
    for copied in reused['copiedArtifacts']:
        assert digest(ROOT / copied['source']['path']) == copied['source']['fileSha256'] == copied['fileSha256']
    for main_copy, repeat_copy in zip(main_copies, repeat_copies):
        assert main_copy['fileSha256'] == repeat_copy['fileSha256']
        assert digest(video.parent / 'overlays' / Path(main_copy['destination']).name) == main_copy['fileSha256']
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
              'executionResources': setup['resourceEquivalenceBinding'],
              'overlayRestartProvenance': source_execution['overlayRestartProvenanceBinding'],
              'mainVideoProducer': completion['sourceMainCompletion'],
              'plannedQcSwitch': [binding(switch_before_path), binding(switch_after_path)],
              'qcOnlyExecution': completion['execution'],
              'losslessQcEquivalence': execution['equivalenceProofBinding'],
              'twoStageProvenance': execution['provenanceBinding'],
              'actualCacheVerification': provenance['cacheProof'],
              'runtimeFilesVerifiedAtCompletion': runtime_verification,
              'fontSizeSelection': setup['fontSizeSelectionBinding'],
              'actualPngSafeAreaPassed': len(qc['instructionEvidence']),
              'checks': ['original-caption-artifacts-same-bytes', 'all-cues-and-lines-exact',
                         'unchanged-renderer-inputs', 'only-approved-qc-and-execution-resource-changes', 'only-approved-font-size-change',
                         'trust-rules-font-assets-dependencies-unchanged', 'all-pre-render-layout-calculations-passed',
                         'all-343-actual-png-safe-areas-passed', 'all-final-render-qc-passed', 'all-instructions-applied-once',
                         'v007-retained-overlay-provenance-exact-and-no-new-render-claim',
                         'rendered-frames-match-adopted-timeline', 'final-video-sha256-exact'],
              'humanQuality': 'not-evaluated', 'independentBlindTrialClaim': False}
    target = WORK / 'final-render-verification-v001.json'
    with target.open('x') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

"""Bounded supplementary inputs for the unchanged fixed-text acoustic observer."""
import os
from pathlib import Path
import subprocess
import sys

from digest_v1_phase2_acoustics import ROOT, observer, runtime, binding, read, save, checked


DIRECTORY = 'acoustics-supplemental-v001'


def prepare(job_path):
    job = read(job_path)
    output = ROOT / job['outputRoot']
    decision_path = output / 'retention-boundary-advisor-decision.json'
    decision = read(decision_path)
    assert decision['decision'] == 'continue'
    for ref in decision['frozenArtifacts']:
        checked(ref)
    original_path = output / 'acoustics/acoustic-preflight-v001.json'
    original = read(original_path)
    for ref in original['modelBindings'] + original['implementationBindings'] + original['sourceBindings']:
        assert binding(ref['path']) == ref
    unresolved_path = output / 'retention-range-unresolved.json'
    unresolved = read(unresolved_path)
    checked(unresolved['originalResponse'])
    checked(unresolved['acousticValidationBinding'])
    acoustic = read(ROOT / unresolved['acousticValidationBinding']['path'])
    rule = decision['fallbacks']['start']
    targets = {}
    for issue in unresolved['result']['unresolved']:
        for endpoint in issue['endpoints']:
            if endpoint['side'] != 'start' or endpoint['reason'] != rule['originalFailureReason']:
                continue
            sid = endpoint['sourceSegmentId']
            matches = [u for c in acoustic['chunks'] for u in c['units']
                       if u['startBoundary'] and u['startBoundary']['after'] == sid]
            assert len(matches) == 1
            unit = matches[0]
            assert unit['startTimeRole'] == 'alignment-window-origin-not-speech-onset'
            assert unit['startMs'] < unit['endMs']
            targets[sid] = {'sourceSegmentId': sid, 'originalFailureReason': endpoint['reason'],
                            'originalUnit': unit, 'centerMs': unit['startMs']}
    assert len(targets) == rule['currentAffectedBoundaryCount']
    source = checked(job['request']['sourceVideo'])
    transcript_path = checked(job['request']['transcript'])
    transcript = read(transcript_path)['segments']
    target = output / DIRECTORY
    target.mkdir()
    (target / 'inputs').mkdir()
    chunks, windows, commands = [], [], []
    for index, item in enumerate(sorted(targets.values(), key=lambda x: x['centerMs'])):
        lo = item['centerMs'] - rule['windowBeforeMs']
        hi = item['centerMs'] + rule['windowAfterMs']
        selected = [s for s in transcript if lo <= s['startMs'] and s['endMs'] <= hi]
        assert selected and all(a['id'] + 1 == b['id'] for a, b in zip(selected, selected[1:]))
        ids = [s['id'] for s in selected]
        assert item['sourceSegmentId'] in ids[1:-1]
        start, end = selected[0]['startMs'], selected[-1]['endMs']
        assert lo <= start < item['centerMs'] < end <= hi
        atoms = [{'sourceSegmentId': s['id'], 'text': s['text']} for s in selected]
        text = ''.join(a['text'] for a in atoms)
        audio = target / 'inputs' / f'chunk-{index:04d}.flac'
        fixed = audio.with_suffix('.formal-text.json')
        save(fixed, {'schemaVersion': 'digest-v1-phase2-supplemental-fixed-text-v001',
                     'transcriptBinding': job['request']['transcript'], 'atoms': atoms, 'text': text})
        args = ['ffmpeg', '-hide_banner', '-nostdin', '-v', 'error',
                '-ss', str(start / 1000), '-i', str(source), '-t', str((end - start) / 1000),
                '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', '-n', str(audio)]
        subprocess.run(args, check=True)
        commands.append(args)
        chunks.append({'index': index, 'startMs': start, 'endMs': end, 'atoms': atoms, 'text': text,
                       'audioBinding': binding(audio), 'rawTextBinding': binding(fixed)})
        windows.append({**item, 'chunkIndex': index, 'nominalStartMs': lo, 'nominalEndMs': hi,
                        'audioStartMs': start, 'audioEndMs': end, 'sourceSegmentIds': ids})
    preparation = target / 'audio-preparation.json'
    save(preparation, {'schemaVersion': 'digest-v1-phase2-supplemental-audio-preparation-v001',
        'advisorDecisionBinding': binding(decision_path), 'sourceVideoBinding': job['request']['sourceVideo'],
        'originalFailureBinding': binding(unresolved_path), 'originalPreflightBinding': binding(original_path),
        'windows': windows, 'ffmpegBinding': binding('/opt/homebrew/bin/ffmpeg'), 'commands': commands,
        'sourceTimesRole': 'window construction only; not final cut times',
        'newTranscription': False, 'externalCommunication': False, 'observationsPerBoundary': 1})
    save(target / 'acoustic-preflight-v001.json', {
        'schemaVersion': original['schemaVersion'], 'instruction': 'ZEV進行管理３ Phase 2 保持端点 GPT_DECISION',
        'method': original['method'], 'modelPath': original['modelPath'], 'modelBindings': original['modelBindings'],
        'compute': original['compute'], 'versions': original['versions'],
        'implementationBindings': original['implementationBindings'] + [binding(__file__)],
        'sourceBindings': original['sourceBindings'] + [binding(original_path), binding(unresolved_path),
                                                     binding(decision_path), binding(preparation)],
        'chunks': chunks})
    print({'stage': 'supplemental-preflight-saved', 'windows': windows}, flush=True)


def observe(job_path):
    job = read(job_path)
    target = ROOT / job['outputRoot'] / DIRECTORY
    # Save-before-execution: a partial run cannot silently become a second observation.
    save(target / 'execution-started.json', {'schemaVersion': 'digest-v1-phase2-supplemental-execution-v001',
        'preflightBinding': binding(target / 'acoustic-preflight-v001.json'),
        'adapterBinding': binding(__file__), 'observerBinding': binding(observer.__file__),
        'runtime': sys.executable, 'newTranscription': False, 'externalCommunication': False})
    observer.OUT = target
    os.environ.update({'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_DATASETS_OFFLINE': '1'})

    def deny_network(event, args):
        if event in {'socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'socket.sendto'}:
            raise RuntimeError('OFFLINE_SENSOR_NETWORK_FORBIDDEN')

    sys.addaudithook(deny_network)
    sys.meta_path.insert(0, runtime.ExcludeUnusedConversionFrameworks())
    observer.observe()


if __name__ == '__main__':
    action, relative_job = sys.argv[1:]
    {'prepare': prepare, 'observe': observe}[action](ROOT / relative_job)

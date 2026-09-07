"""指示-014: 正式入力から人間frame観測画面の束縛だけを作る。字幕は変更しない。"""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'evals/clip_composition/outputs/presentation/work-distant-connection-skill-e2e-20260907-v001'
HERE = WORK / 'human-caption-boundary-v001'
RUN = WORK / 'run-v001'

def read(p): return json.loads(p.read_text())
def binding(p):
    raw = p.read_bytes()
    return {'path': str(p.relative_to(ROOT)), 'fileSha256': hashlib.sha256(raw).hexdigest(), 'sizeBytes': len(raw)}
def save(name, value):
    with (HERE / name).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2); f.write('\n')

def build():
    HERE.mkdir(exist_ok=True)
    parent = read(WORK / 'completion-MANIFEST.json')
    for ref in parent['files'] + parent['media']:
        assert binding(ROOT / ref['path'])['fileSha256'] == ref['fileSha256'], ref['path']
    ins, meaning = read(RUN / 'instruction.json'), read(RUN / 'meaning-input.json')
    final, base = read(RUN / 'final-verification.json'), read(RUN / 'base-media-bindings.json')
    timeline, generation = read(RUN / 'base-media/timeline.json'), read(RUN / 'base-media/generation-manifest.json')
    fps, rate, total = 30, generation['audio']['sampleRate'], timeline['baseMedia']['expectedFrameCount']
    assert rate % fps == 0 and total == 1671 and len(ins['instructions']) == 4
    media, base_media = binding(ROOT / final['video']['path']), binding(ROOT / base['baseMedia']['path'])
    packet_sha = generation['audio']['encoded']['packetPayloadSha256']
    probes = []
    for ref in [media, base_media]:
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(ROOT/ref['path']), '-map', '0:a:0', '-c', 'copy', '-f', 'data', '-'])
        assert hashlib.sha256(raw).hexdigest() == packet_sha
        probe = read_probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(ROOT/ref['path'])]))
        times = [float(f['best_effort_timestamp_time']) for f in probe['frames']]
        assert len(times) == total and all(abs(t - i / fps) < 0.000001 for i, t in enumerate(times))
        probes.append({'media': ref, 'frameCount': len(times), 'frameClock': 'zero-origin-30fps-every-frame-verified', 'audioPacketPayloadSha256': packet_sha})
    atoms = {a['atomOccurrenceId']: a for a in meaning['atomOccurrences']}
    targets = []
    for n, row in enumerate(ins['instructions'][1:]):
        ids = row['targetProvenance']['atomOccurrenceIds']
        assert ''.join(atoms[i]['text'] for i in ids) == row['content']['text']
        segments = {s['timelineSegmentId'] for i in ids for s in atoms[i]['retainedSpans']}
        assert len(segments) == 1
        seg = next(s for s in generation['segments'] if s['segmentId'] in segments)
        targets.append({'id': f'caption-{n+2}', 'ordinal': n+2, 'instructionId': row['instructionId'],
            'text': row['content']['text'], 'textIds': ids,
            'sourceSegmentIds': [atoms[i]['sourceSegmentId'] for i in ids],
            'semanticUtteranceIds': [atoms[i]['semanticUtteranceId'] for i in ids],
            'currentFrames': row['outputTime'], 'optionalStart': n == 0, 'timelineSegment': seg})
    sources = [binding(RUN / (n+'.json')) for n in ['instruction', 'meaning-input', 'base-media-bindings', 'base-media/timeline', 'base-media/generation-manifest', 'final-verification', 'machine-adoption', 'edit-plan', 'selection', 'renderer-job']]
    config = {'schemaVersion': 'distant-human-caption-boundary-review-v001', 'authority': 'ZEV進行管理２ 指示-014',
        'mediaServing': 'completed-file-exact-bytes-with-25-second-bounded-playback-no-transcoding',
        'windowStartFrame': total-25*fps, 'windowEndFrameExclusive': total, 'framesPerSecond': fps, 'audioSampleRate': rate,
        'completedMediaBinding': media, 'baseMediaBinding': base_media, 'audioPacketPayloadSha256': packet_sha,
        'sources': sources, 'targets': targets, 'endMeaning': 'first-frame-where-caption-is-absent; exclusive-end',
        'adoptionPolicy': 'human-observation-only-no-timing-promotion-before-all-three-confirmed'}
    save('config.json', config)
    save('human-review-result.json', {'schemaVersion': 'distant-human-review-result-v001', 'authority': 'ZEV進行管理２ 指示-014',
        'completedMediaBinding': media, 'reportedBy': 'kawafmm via ZEV相談役',
        'evaluations': {'遠方接続そのもの': '意図どおり', '前半の前振り': '意図どおり', '後半の恐怖映像': '意図どおり',
          '前半→後半の意味的回収': '意図どおり', '文脈・構成・見心地': '問題なし'},
        'captionTimingIssues': [{'instructionId': t['instructionId'], 'text': t['text'], 'finding': '長く表示されすぎている' if i == 0 else 'タイミングが壊れている'} for i, t in enumerate(targets)],
        'scope': '終盤3字幕だけ。意味・文脈・構成・見心地は再評価しない。', 'humanFrames': 'awaiting-explicit-selection'})
    save('preparation-verification.json', {'status': 'passed', 'parentManifest': binding(WORK/'completion-MANIFEST.json'),
        'parentFilesAndMedia': {'verified': len(parent['files'])+len(parent['media']), 'unchanged': True},
        'configBinding': binding(HERE/'config.json'), 'actualMediaChecks': probes,
        'sourceTextAndIdReconstruction': 'exact-all-three', 'productionCaptionTimesChanged': False,
        'humanFrameSelections': 0, 'previewLengthSeconds': 25})
    print(json.dumps({'status': 'prepared-human-decision', 'targets': [{'text':t['text'], 'frames':t['currentFrames']} for t in targets]}, ensure_ascii=False))

if __name__ == '__main__': build()

"""指示-011/012の完成動画を20秒単位で提示する。内容判断と本編の再編集は行わない。"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
run = ROOT / sys.argv[1]
review = run.parent / 'review'
evidence = json.loads((run / 'final-verification.json').read_text())
video = ROOT / evidence['video']['path']
assert hashlib.sha256(video.read_bytes()).hexdigest() == evidence['video']['fileSha256']
assert evidence['technicalStatus'] == 'passed'
frames = evidence['checks']['frameCount']
first = evidence['checks']['firstPartFrameCount']
assert 1200 < frames <= 1800 and 0 < first < 600, '今回の3区間提示と実動画の尺が一致しない'
# ユーザー指定の一回20〜30秒に合わせた、完成済み30fps動画上の提示区間。
windows = [
    {'id': 'review-1', 'label': '前振りと恐怖場面', 'ranges': [[0, 600]],
     'description': '完成動画の冒頭20秒。連続区間。'},
    {'id': 'review-2', 'label': 'その後の流れ', 'ranges': [[600, 1200]],
     'description': '完成動画の20〜40秒。連続区間。'},
    {'id': 'review-3', 'label': '前振りの回収', 'ranges': [[0, first], [1200, frames]],
     'description': '対応確認の抜粋。前振り＋40秒以降。中間は確認1・2で提示。本編自体は不変。'},
]
review.mkdir(exist_ok=True)
for item in windows:
    destination = review / (item['id'] + '.mp4')
    filters = []
    labels = []
    for i, (start, end) in enumerate(item['ranges']):
        filters += [f'[0:v]trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS[v{i}]',
                    f'[0:a]atrim=start={start / 30:.12f}:end={end / 30:.12f},asetpts=PTS-STARTPTS[a{i}]']
        labels += [f'[v{i}][a{i}]']
    filters.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=1[v][a]')
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-i', str(video),
               '-filter_complex', ';'.join(filters), '-map', '[v]', '-map', '[a]',
               '-c:v', 'libx264', '-preset', 'fast', '-crf', '0', '-c:a', 'aac', '-b:a', '192k',
               '-movflags', '+faststart', str(destination)]
    subprocess.run(command, check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames',
        '-show_entries', 'stream=codec_type,nb_read_frames,sample_rate:format=duration', '-of', 'json', str(destination)]))
    observed = int(next(s['nb_read_frames'] for s in probe['streams'] if s['codec_type'] == 'video'))
    expected = sum(end - start for start, end in item['ranges'])
    assert observed == expected
    assert any(s['codec_type'] == 'audio' for s in probe['streams'])
    assert 20 <= expected / 30 <= 30
    selection = '+'.join(f'between(n,{start},{end - 1})' for start, end in item['ranges'])
    def frame_hashes(media, vf=None):
        args = ['ffmpeg', '-v', 'error', '-i', str(media), '-map', '0:v', '-an']
        if vf:
            args += ['-vf', vf, '-fps_mode', 'passthrough']
        raw = subprocess.check_output(args + ['-f', 'framemd5', '-']).decode()
        return [line.split(',')[-1].strip() for line in raw.splitlines() if line and not line.startswith('#')]
    expected_hashes = frame_hashes(video, f"select='{selection}'")
    assert expected_hashes == frame_hashes(destination), '確認用抜粋の映像frame内容が本編と不一致'
    item.update({'path': str(destination.relative_to(ROOT)), 'fileSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                 'frameCount': observed, 'durationSeconds': expected / 30, 'mediaProbe': probe,
                 'decodedFrameContent': 'exact-match-to-selected-completed-video-frames',
                 'command': command})
assert hashlib.sha256(video.read_bytes()).hexdigest() == evidence['video']['fileSha256']
result = {'schemaVersion': 'distant-connection-short-review-v001', 'status': 'passed',
          'sourceVideoBinding': evidence['video'], 'humanQuality': 'not-evaluated',
          'frameRate': '30/1', 'windows': windows, 'sourceVideoUnchanged': True,
          'timelineCoverage': '全編を確認1、2、3の後半で被覆。前振りだけを確認3で繰り返す。',
          'notSelected': '元配信の二部分間の約11分47秒。薬の別候補。採用した部分内部の削除はなし。'}
with (review / 'review-manifest.json').open('x') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(json.dumps({'status': 'passed', 'clips': [{'id': w['id'], 'seconds': w['durationSeconds']} for w in windows]}, ensure_ascii=False))

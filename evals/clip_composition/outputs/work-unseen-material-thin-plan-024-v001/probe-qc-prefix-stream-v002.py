"""Synthetic proof: stop a full counterfactual encoder only after its target frame is decoded.

The encoder receives the complete, unchanged input and filter graph. Fragmented
MP4 only delivers already encoded packets early. No timeline trimming or encoder
EOF is introduced before the requested encoded frame has been decoded.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'qc-prefix-fixture-v002'
FFMPEG = '/opt/homebrew/bin/ffmpeg'
MAGICK = '/opt/homebrew/bin/magick'
FPS, FRAMES = 30, 900


def run(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert result.returncode == 0, result.stderr.decode(errors='replace')
    return result.stdout


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def graph(records):
    inputs, filters, previous = [], [], '0:v'
    for index, row in enumerate(records):
        inputs += ['-loop', '1', '-framerate', str(FPS), '-i', str(row['png'])]
        alpha = f"alpha(X,Y)*min(1,min((N+1)/4,({row['count']}-N)/4))"
        filters += [f'[{index+1}:v]format=rgba,trim=end_frame={row["count"]},setpts=PTS-STARTPTS,'
                    f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='{alpha}',"
                    f'setpts=PTS+{row["start"]}/{FPS}/TB[overlay{index}]']
        following = f'video{index+1}'
        filters += [f'[{previous}][overlay{index}]overlay=0:0:eof_action=pass:shortest=0:repeatlast=0[{following}]']
        previous = following
    filters += [f'[{previous}]fps={FPS},format=yuv420p[video]']
    return inputs + ['-filter_complex', ';'.join(filters), '-map', '[video]', '-map', '0:a?',
                     '-frames:v', str(FRAMES), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                     '-pix_fmt', 'yuv420p', '-c:a', 'copy']


def command(records):
    return [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(OUT / 'base.mp4')] + graph(records)


def legacy(records, frame, stem):
    video, png = OUT / f'{stem}-legacy.mp4', OUT / f'{stem}-legacy.png'
    started = time.monotonic()
    run(command(records) + ['-movflags', '+faststart', str(video)])
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(video),
         '-vf', f'select=eq(n\\,{frame})', '-vsync', '0', '-frames:v', '1', str(png)])
    return png, time.monotonic() - started


def streamed(records, frame, stem):
    png, progress = OUT / f'{stem}-stream.png', OUT / f'{stem}-progress.txt'
    enc_log, dec_log = OUT / f'{stem}-encoder.log', OUT / f'{stem}-decoder.log'
    started = time.monotonic()
    with enc_log.open('wb') as enc_err, dec_log.open('wb') as dec_err:
        producer = subprocess.Popen(command(records) + ['-progress', str(progress),
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=enc_err)
        consumer = subprocess.Popen([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0',
            '-vf', f'select=eq(n\\,{frame})', '-vsync', '0', '-frames:v', '1', str(png)],
            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=dec_err)
        forwarding = threading.Event()
        forwarding.set()
        pump_errors = []

        def pump():
            try:
                while True:
                    data = producer.stdout.read1(65536)
                    if not data:
                        break
                    if forwarding.is_set():
                        try:
                            consumer.stdin.write(data)
                            consumer.stdin.flush()
                        except BrokenPipeError:
                            forwarding.clear()
                try:
                    consumer.stdin.close()
                except BrokenPipeError:
                    pass
            except BaseException as error:
                pump_errors.append(str(error))

        worker = threading.Thread(target=pump)
        worker.start()
        decoded = consumer.wait()
        forwarding.clear()
        requested_quit = producer.poll() is None
        if requested_quit:
            try:
                producer.stdin.write(b'q\n')
                producer.stdin.flush()
            except BrokenPipeError:
                requested_quit = False
        encoded = producer.wait()
        worker.join()
        assert decoded == 0 and encoded == 0 and not pump_errors, (decoded, encoded, pump_errors)
    assert png.is_file()
    frame_lines = [int(s.split('=', 1)[1]) for s in progress.read_text().splitlines() if s.startswith('frame=')]
    return png, {'encoderExit': encoded, 'decoderExit': decoded, 'requestedQuitAfterDecodedTarget': requested_quit,
                 'encodedFrames': frame_lines[-1], 'expectedFullFrames': FRAMES,
                 'wallSeconds': time.monotonic() - started, 'pngSha256': digest(png)}


def pixels(path):
    return run([MAGICK, str(path), '-depth', '8', 'rgba:-'])


def main():
    OUT.mkdir()
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
         f'testsrc2=size=1920x1080:rate={FPS}', '-frames:v', str(FRAMES), '-c:v', 'libx264',
         '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', str(OUT / 'base.mp4')])
    for name, rectangle, color in [('target', '120,820 1000,970', 'white'),
                                   ('other', '1250,100 1720,260', 'yellow'),
                                   ('moved', '420,700 1300,850', 'white')]:
        run([MAGICK, '-size', '1920x1080', 'xc:none', '-fill', color, '-draw', 'rectangle ' + rectangle,
             'PNG32:' + str(OUT / f'{name}.png')])
    run([MAGICK, '-size', '1920x1080', 'xc:none', 'PNG32:' + str(OUT / 'transparent.png')])
    results = []
    for name, start, count, other_start, other_count, empty in [
            ('regular', 90, 61, 10, 25, False),
            ('short-fade', 190, 3, 10, 25, False),
            ('simultaneous', 280, 41, 270, 61, False),
            ('transparent', 410, 31, 400, 61, True)]:
        frame = start + count // 2
        records = [{'png': OUT / ('transparent.png' if empty else 'target.png'), 'start': start, 'count': count},
                   {'png': OUT / 'other.png', 'start': other_start, 'count': other_count}]
        omitted = [{**records[0], 'png': OUT / 'transparent.png'}, records[1]]
        old, wall = legacy(omitted, frame, name + '-omitted')
        new, obs = streamed(omitted, frame, name + '-omitted')
        equal = pixels(old) == pixels(new)
        results.append({'case': name, 'representativeFrame': frame, 'omittedPixelsIdentical': equal,
                        'legacyWallSeconds': wall, 'streamObservation': obs})
        print(json.dumps(results[-1]), flush=True)
        assert equal, 'OMITTED_PIXELS_DIFFER'
        if name in ['transparent', 'simultaneous']:
            full, _ = legacy(records, frame, name + '-full')
            new_full, full_obs = streamed(records, frame, name + '-full')
            assert pixels(full) == pixels(new_full), 'FULL_PIXELS_DIFFER'
            results[-1]['fullPixelsIdentical'] = True
            if empty:
                assert pixels(full) == pixels(old), 'EMPTY_TARGET_PRODUCED_DIFFERENCE'
                results[-1]['transparentTargetNotVisible'] = True
            if name == 'simultaneous':
                wrong = [records[0], {**records[1], 'png': OUT / 'transparent.png'}]
                wrong_image, _ = streamed(wrong, frame, 'wrong-omission')
                assert pixels(old) != pixels(wrong_image), 'WRONG_OMISSION_NOT_DETECTED'
                moved = [{**records[0], 'png': OUT / 'moved.png'}, records[1]]
                moved_image, _ = streamed(moved, frame, 'moved-target')
                assert pixels(full) != pixels(moved_image), 'MOVED_TARGET_NOT_DETECTED'
                results[-1]['wrongOmissionDetectedByCanonicalComparison'] = True
                results[-1]['changedTargetPositionDetectedByFullFrameComparison'] = True
    result = {'schemaVersion': 'unseen-material-qc-prefix-stream-equivalence-v001', 'status': 'passed',
              'earlyStopObserved': any(r['streamObservation']['encodedFrames'] < FRAMES for r in results),
              'algorithm': 'same full input and encode; fragmented MP4 delivery; request q only after target decoded',
              'mainVideoEncodingChanged': False, 'cases': results,
              'limitations': 'This probe proves these dynamic synthetic fixtures. Production integration and all 343 final checks remain unexecuted.'}
    assert result['earlyStopObserved'], 'NO_ACTUAL_COMPUTATION_SAVING_OBSERVED'
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'result': str(OUT / 'result.json')}), flush=True)


if __name__ == '__main__':
    main()

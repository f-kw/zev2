#!/usr/bin/env python3
"""Bounded Stage-II media checks, actual faults, and one three-example candidate.

Run after connection_expression_fixture_v001.mjs. No original media overwrite,
external upload, UI automation, or human/AI selection is performed here.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path


def digest(p):
    with Path(p).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(p, x):
    with Path(p).open('x') as f:
        json.dump(x, f, indent=2, ensure_ascii=False)
        f.write('\n')


def invoke(out, name, cmd, expected=0):
    process = subprocess.run([str(x) for x in cmd], capture_output=True)
    save(out / (name + '-command.json'), {'command': [str(x) for x in cmd], 'exitCode': process.returncode})
    (out / (name + '.stderr')).write_bytes(process.stderr)
    (out / (name + '.stdout')).write_bytes(process.stdout)
    assert process.returncode == expected, (name, process.returncode, process.stderr[-2000:].decode(errors='replace'))
    return process.stdout


def decoded_hashes(ffmpeg, media):
    command = [ffmpeg, '-v', 'error', '-nostdin', '-i', str(media), '-map', '0:v:0', '-an',
               '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'framehash', '-hash', 'sha256', '-']
    text = subprocess.check_output(command, text=True)
    return [line.split(',')[-1].strip() for line in text.splitlines() if line and not line.startswith('#')]


def decoded_pcm(ffmpeg, media):
    return subprocess.check_output([ffmpeg, '-v', 'error', '-nostdin', '-i', str(media),
                                    '-map', '0:a:0', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture-directory', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    assert args.fixture_directory.is_absolute() and args.output.is_absolute()
    args.output.mkdir()  # An existing run is never overwritten.
    out = args.output
    fixture = json.loads((args.fixture_directory / 'fixture-result.json').read_text())
    manifest = json.loads((args.fixture_directory / 'manifest-copy.json').read_text())
    assert fixture['status'] == 'rendered-awaiting-independent-media-check'
    ffmpeg, ffprobe = manifest['ffmpegPath'], manifest['ffprobePath']
    checker = Path(__file__).with_name('connection_expression_media_check_v001.py')
    checked = []

    def check(record, expected=0):
        proof = out / (record['label'] + '-proof')
        cmd = [sys.executable, checker, '--input-lossless', record['inputPath'],
               '--output-lossless', record['outputPath'], '--mode', record['mode'],
               '--boundary-frame', str(record['boundaryFrame']), '--input-frames', str(record['inputFrameCount']),
               '--ffmpeg', ffmpeg, '--ffprobe', ffprobe, '--evidence-directory', proof]
        invoke(out, record['label'] + '-check', cmd, expected)
        result_file = proof / 'result.json'
        result = json.loads(result_file.read_text())
        assert not result['commandFailures'], 'tool failure cannot count as fault rejection'
        if expected:
            assert result['status'] == 'failed'
            assert [v['code'] for v in result['violations']] == ['VIDEO_FRAME_BYTES_MISMATCH']
            assert result['checks']['losslessVideo']['mismatchedDisplayFrames']
            assert result['checks']['losslessAudio']['status'] == 'passed'
        else:
            assert result['status'] == 'passed' and not result['violations']
        checked.append({'label': record['label'], 'outputPath': record['outputPath'],
                        'mediaSha256': digest(record['outputPath']), 'expectedRejection': expected != 0,
                        'proofPath': str(result_file), 'proofSha256': digest(result_file), 'result': result})
        return result

    for record in fixture['records']:
        assert digest(record['outputPath']) == record['sha256']
        check(record, 1 if record['label'].startswith('fault-') else 0)
    soft = [r for r in fixture['records'] if r['label'].endswith('-soft-original')]
    assert len(soft) == 3
    first = soft[0]
    black = next(r for r in fixture['records'] if r['label'] == 'connection-01-black-original')
    # Reuse the actual Black output as the missing-fade fault. No redundant media generation.
    check({**black, 'label': 'fault-no-fade', 'mode': 'soft'}, 1)
    fault_filters = {
        'fault-no-return': "lutyuv=y='floor((val*4+16+2)/5)':u='floor((val*4+128+2)/5)':v='floor((val*4+128+2)/5)':enable='gte(n,137)'",
        'fault-outside-window': "lutyuv=y='mod(val+1,256)':enable='eq(n,20)'",
    }
    for name, filter_text in fault_filters.items():
        media = out / (name + '.nut')
        invoke(out, name, [ffmpeg, '-hide_banner', '-nostdin', '-v', 'error', '-n',
                           '-i', first['outputPath'], '-vf', filter_text, '-map', '0:v:0', '-map', '0:a:0',
                           '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough',
                           '-c:a', 'copy', '-f', 'nut', media])
        check({**first, 'label': name, 'outputPath': str(media)}, 1)

    # Full decoded identity after re-read/reset, including the original Black case.
    reset_proofs = []
    for original_label, reset_label in [('connection-01-soft-original', 'connection-01-soft-reset'),
                                        ('connection-01-black-original', 'connection-01-black-reset')]:
        original = next(r for r in fixture['records'] if r['label'] == original_label)
        restored = next(r for r in fixture['records'] if r['label'] == reset_label)
        frames = decoded_hashes(ffmpeg, original['outputPath'])
        pcm = decoded_pcm(ffmpeg, original['outputPath'])
        assert frames == decoded_hashes(ffmpeg, restored['outputPath'])
        assert pcm == decoded_pcm(ffmpeg, restored['outputPath'])
        reset_proofs.append({'original': original_label, 'reset': reset_label, 'allFrameCount': len(frames),
                             'allFloatPcmBytes': len(pcm), 'allFramesAndPcmEqual': True})

    concat = out / 'candidate-sources.txt'
    with concat.open('x') as f:
        for r in soft:
            assert "'" not in r['outputPath'] and '\n' not in r['outputPath']
            f.write("file '" + r['outputPath'] + "'\n")
            f.write('duration 8.4\n')  # Verified 252/30 clock, independent of container duration estimates.
    bundle = out / 'candidate-lossless.nut'
    invoke(out, 'bundle-lossless', [ffmpeg, '-hide_banner', '-nostdin', '-v', 'error', '-n',
                                   '-f', 'concat', '-safe', '0', '-i', concat, '-map', '0:v:0', '-map', '0:a:0',
                                   '-c', 'copy', '-f', 'nut', bundle])
    expected_frames = sum([decoded_hashes(ffmpeg, r['outputPath']) for r in soft], [])
    expected_pcm = b''.join(decoded_pcm(ffmpeg, r['outputPath']) for r in soft)
    assert decoded_hashes(ffmpeg, bundle) == expected_frames
    assert decoded_pcm(ffmpeg, bundle) == expected_pcm
    assert len(expected_frames) == 756 and len(expected_pcm) == 1209600 * 2 * 4
    candidate = out / 'connection-expression-stage2-candidate-v001.mp4'
    reference = out / 'technical-encode-reference.mp4'
    # Same existing H.264/AAC settings, with one encoder thread for repeatable technical replay.
    encoding = ['-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                '-threads', '1', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'aac', '-movflags', '+faststart']
    for name, media in [('candidate', candidate), ('technical-encode-reference', reference)]:
        invoke(out, name, [ffmpeg, '-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', bundle, *encoding, media])
    final_frames = decoded_hashes(ffmpeg, candidate)
    final_pcm = decoded_pcm(ffmpeg, candidate)
    assert final_frames == decoded_hashes(ffmpeg, reference)
    assert final_pcm == decoded_pcm(ffmpeg, reference)
    assert len(final_frames) == 756
    # The repeat encode is transport evidence only; independent pixel arithmetic above proves the effect.
    # Review clock and insertion-edge observations are delegated to the independent checker module.
    spec = importlib.util.spec_from_file_location('connection_media_check', checker)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    review = module.inspect_review(ffmpeg=ffmpeg, ffprobe=ffprobe, media=candidate,
                                   expected_frame_count=756,
                                   inserted_ranges=[(120, 132), (372, 384), (624, 636)],
                                   evidence_directory=out / 'candidate-review-proof',
                                   expected_dimensions=(1920, 1080))
    save(out / 'candidate-review-media.json', review)
    examples = []
    for i, r in enumerate(soft):
        offset = i * 252
        examples.append({'connectionId': r['connectionId'], 'candidateFrameRange': [offset, offset + 252],
                         'candidateSecondsRange': [offset / 30, (offset + 252) / 30],
                         'fadeOutFrames': [offset + 114, offset + 120],
                         'insertedBlackFrames': [offset + 120, offset + 132],
                         'fadeInFrames': [offset + 132, offset + 138],
                         'canonicalBoundaryFrame': r['canonicalBoundaryFrame']})
    summary = {'schemaVersion': 'connection-expression-stage2-media-evidence-v001', 'status': 'passed',
               'createdBy': 'development-fixture', 'actualAiSelections': 0, 'humanEvaluations': 0,
               'checks': checked, 'savedResetRenders': reset_proofs,
               'bundleAllSourceFramesAndFloatPcmEqual': True, 'bundleFrames': len(expected_frames),
               'bundleLogicalSamplesPerChannel': len(expected_pcm) // 8,
               'candidate': {'path': str(candidate), 'bytes': candidate.stat().st_size, 'sha256': digest(candidate),
                             'frameCount': len(final_frames), 'durationSeconds': len(final_frames) / 30,
                             'independentArithmeticOracleBeforeEncode': True,
                             'repeatEncodeFullDecodedVideoAndAudioEqual': True,
                             'repeatEncodeProves': 'transport only; not the sole evidence of fade correctness',
                             'humanQuality': 'not assessed', 'browserPlayback': 'not verified; existing UI restriction not bypassed'},
               'examples': examples, 'packageJoinFrames': [252, 504],
               'packageJoinsAreActualDigestConnections': False, 'review': review}
    save(out / 'completion.json', summary)
    print(json.dumps({'status': 'passed', 'candidate': summary['candidate'], 'mediaChecks': len(checked)}, ensure_ascii=False))


if __name__ == '__main__':
    main()

import importlib.util
import contextlib
import io
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

import numpy as np

spec = importlib.util.spec_from_file_location('sensor', Path(__file__).with_name('presentation_vocal_observation_v001.py'))
sensor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sensor)


class ObservationTests(unittest.TestCase):
    def test_rms_uses_physical_amplitude_and_retains_silence(self):
        self.assertEqual(sensor.rms_dbfs(struct.pack('<h', 0)), -96)
        self.assertEqual(sensor.rms_dbfs(struct.pack('<h', -32768)), 0)
        self.assertAlmostEqual(sensor.rms_dbfs(struct.pack('<h', 16384)), 20 * math.log10(.5))

    def test_short_rms_tail_is_measured_without_padding_or_loss(self):
        pcm = struct.pack('<321h', *([0] * 320 + [16384]))
        rows = sensor.measure_rms(pcm)
        self.assertEqual([(r['startSample'], r['endSampleExclusive']) for r in rows], [(0, 320), (320, 321)])
        self.assertAlmostEqual(rows[-1]['rmsDbfs'], 20 * math.log10(.5))
        self.assertEqual(sensor.verify_coverage(rows, 321)['coveredSamples'], 321)

    def test_empty_or_broken_pcm_is_rejected(self):
        for pcm in [b'', b'\x00']:
            with self.assertRaises(ValueError):
                sensor.measure_rms(pcm)

    def test_coverage_rejects_gaps_overlaps_and_missing_tail(self):
        for rows in [
            [{'startSample': 1, 'endSampleExclusive': 5}],
            [{'startSample': 0, 'endSampleExclusive': 3}, {'startSample': 2, 'endSampleExclusive': 5}],
            [{'startSample': 0, 'endSampleExclusive': 4}],
        ]:
            with self.assertRaises(ValueError):
                sensor.verify_coverage(rows, 5)

    def test_voice_retains_every_probability_and_continuous_state(self):
        class Model:
            def get_initial_states(self, batch_size):
                return 0, 100

            def __call__(self, chunk, state, context, sr):
                self_test.assertEqual((len(chunk), context, sr), (512, 100 + state, 16000))
                if state == 2:
                    self_test.assertEqual(chunk[0], .25)
                    self_test.assertTrue(np.all(chunk[1:] == 0))
                return np.array([[state / 2]], dtype=np.float32), state + 1, context + 1

        self_test = self
        rows = sensor.measure_voice(np.full(1025, .25, dtype=np.float32), Model(), np)
        self.assertEqual([r['voiceProbability'] for r in rows], [0, .5, 1])
        self.assertEqual([r['modelPaddingSamples'] for r in rows], [0, 0, 511])
        self.assertEqual(sensor.verify_coverage(rows, 1025)['coveredSamples'], 1025)

    def test_voice_rejects_invalid_model_values(self):
        class Model:
            def get_initial_states(self, batch_size):
                return None, None

            def __call__(self, chunk, state, context, sr):
                return np.array([[float('nan')]]), None, None

        with self.assertRaises(ValueError):
            sensor.measure_voice(np.zeros(1, dtype=np.float32), Model(), np)

    def test_local_maxima_keep_small_large_and_plateau_peaks_without_quota(self):
        rows = [{'startSample': i, 'endSampleExclusive': i + 1, 'rmsDbfs': value}
                for i, value in enumerate([-80, -79, -80, -20, -20, -80, -78, -80])]
        maxima = sensor.local_rms_maxima(rows)
        self.assertEqual([(r['startSample'], r['endSampleExclusive']) for r in maxima], [(1, 2), (3, 5), (6, 7)])
        self.assertEqual([r['rmsDbfs'] for r in maxima], [-79, -20, -78])

    def test_constant_silence_is_retained_in_series_without_inventing_events(self):
        rows = sensor.measure_rms(b'\x00\x00' * 1000)
        self.assertEqual(len(rows), 4)
        self.assertEqual(sensor.local_rms_maxima(rows), [])
        self.assertEqual(sensor.verify_coverage(rows, 1000)['coveredSamples'], 1000)

    def test_changed_reference_during_observation_cannot_publish_success(self):
        names = ['source', 'implementation', 'runtime', 'voiceImplementation',
                 'voiceModel', 'ffmpeg', 'ffprobe']
        for changed in names:
            with self.subTest(changed=changed), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                files = {name: root / name for name in names}
                for name, file in files.items():
                    file.write_bytes(('original ' + name).encode())

                class Model:
                    def get_initial_states(self, batch_size):
                        return None, None

                    def __call__(self, chunk, state, context, sr):
                        files[changed].write_bytes(('changed ' + changed).encode())
                        return np.array([[.5]], dtype=np.float32), state, context

                vad = types.SimpleNamespace(__file__=str(files['voiceImplementation']),
                                            SileroVADModel=lambda _: Model())

                def fake_command(args, output, name):
                    if name == 'audio-metadata':
                        return b'{"streams":[{"index":0}]}'
                    self.assertEqual(name, 'complete-audio-decode')
                    return b'\x00\x00' * 512

                output = root / 'observation'
                captured = io.StringIO()
                with patch.object(sensor, 'load_runtime', return_value=(np, vad, files['voiceModel'])), \
                     patch.object(sensor, '__file__', str(files['implementation'])), \
                     patch.object(sensor.sys, 'executable', str(files['runtime'])), \
                     patch.object(sensor.shutil, 'which', side_effect=lambda name: str(files[name])), \
                     patch.object(sensor.importlib.metadata, 'version', return_value='fixture'), \
                     patch.object(sensor, 'run_command', side_effect=fake_command), \
                     contextlib.redirect_stdout(captured):
                    with self.assertRaisesRegex(RuntimeError, 'AUDIO_OBSERVATION_BOUND_INPUT_CHANGED: ' + changed):
                        sensor.observe(files['source'], output)
                self.assertTrue((output / 'preflight.json').exists())
                self.assertFalse((output / 'summary.json').exists())
                self.assertEqual(captured.getvalue(), '')

    def test_installed_fftools_reject_http_playlist_before_network_access(self):
        ffprobe, ffmpeg = shutil.which('ffprobe'), shutil.which('ffmpeg')
        self.assertTrue(ffprobe and ffmpeg, 'Existing local FFmpeg and ffprobe are required')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'denied.m3u8'
            source.write_text('#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXT-X-MEDIA-SEQUENCE:0\n'
                              '#EXTINF:1,\nhttp://127.0.0.1:1/never-fetch.ts\n#EXT-X-ENDLIST\n')
            commands = [sensor.audio_metadata_command(ffprobe, source),
                        sensor.audio_decode_command(ffmpeg, source)]
            for command in commands:
                with self.subTest(tool=command[0]):
                    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                            check=False, timeout=10)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn(b"Protocol 'http' not on whitelist 'file,pipe'", result.stderr)
                    self.assertNotIn(b'Connection refused', result.stderr)
                    self.assertNotIn(b'Failed to resolve', result.stderr)

    def test_installed_fftools_still_read_a_local_mp4(self):
        ffprobe, ffmpeg = shutil.which('ffprobe'), shutil.which('ffmpeg')
        self.assertTrue(ffprobe and ffmpeg, 'Existing local FFmpeg and ffprobe are required')
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'local.mp4'
            subprocess.run([ffmpeg, '-hide_banner', '-nostdin', '-v', 'error',
                            '-protocol_whitelist', 'file,pipe', '-f', 's16le', '-ar', '16000',
                            '-ac', '1', '-i', 'pipe:0', '-c:a', 'aac', str(source)],
                           input=b'\x00\x00' * 1024, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           check=True, timeout=10)
            metadata = subprocess.run(sensor.audio_metadata_command(ffprobe, source),
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=10)
            self.assertEqual(len(json.loads(metadata.stdout)['streams']), 1)
            decoded = subprocess.run(sensor.audio_decode_command(ffmpeg, source),
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=10)
            self.assertGreater(len(decoded.stdout), 0)
            self.assertEqual(len(decoded.stdout) % 2, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)

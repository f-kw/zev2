"""Meaningful invariants for whole-audio acoustic discovery and ASR evidence."""
import unittest

import numpy as np
from scipy import signal

import presentation_vocal_audio_probe_v001 as probe


def frames(levels, probability=0.0):
    rms = [{'startSample': index * 320, 'endSampleExclusive': (index + 1) * 320,
            'rmsDbfs': float(level)} for index, level in enumerate(levels)]
    voice = [{'startSample': index * 512, 'endSampleExclusive': min(len(levels) * 320, (index + 1) * 512),
              'voiceProbability': probability}
             for index in range((len(levels) * 320 + 511) // 512)]
    return rms, voice


class WholeAudioCandidateTests(unittest.TestCase):
    def discover(self, levels, probability=0.0):
        rms, voice = frames(levels, probability)
        return probe.acoustic_events(rms, voice, len(levels) * 320, np, signal)

    def test_constant_audio_has_no_false_energy_change(self):
        peaks, candidates, integrated = self.discover([-30.0] * 500)
        self.assertEqual(peaks, [])
        self.assertEqual(candidates, [])
        self.assertEqual(len(integrated), 500)
        self.assertAlmostEqual(integrated[0]['integratedRmsDbfs'], -30.0)
        self.assertAlmostEqual(integrated[-1]['integratedRmsDbfs'], -30.0)

    def test_quiet_voice_probability_does_not_delete_short_events(self):
        levels = [-50.0] * 500
        levels[100:105] = [-15.0] * 5
        levels[160:165] = [-15.0] * 5
        _, low, _ = self.discover(levels, 0.0)
        _, high, _ = self.discover(levels, 0.99)
        self.assertEqual(len(low), 2)
        self.assertEqual([(row['startSample'], row['endSampleExclusive']) for row in low],
                         [(row['startSample'], row['endSampleExclusive']) for row in high])
        self.assertTrue(all(row['metrics']['voiceProbabilityMax'] == 0 for row in low))
        self.assertTrue(all(row['asrOverlap'] == [] for row in low))

    def test_all_disjoint_events_survive_without_quota(self):
        levels = [-50.0] * 10000
        for start in range(50, 9950, 100):
            levels[start:start + 5] = [-10.0] * 5
        peaks, candidates, _ = self.discover(levels)
        self.assertEqual(len(candidates), 99)
        self.assertEqual(sum(row['qualifies'] for row in peaks), 99)
        for candidate in candidates:
            self.assertGreaterEqual(candidate['startSample'], 0)
            self.assertLessEqual(candidate['endSampleExclusive'], len(levels) * 320)
            self.assertEqual(candidate['metrics']['durationSec'],
                             (candidate['endSampleExclusive'] - candidate['startSample']) / 16000)
            self.assertAlmostEqual(candidate['metrics']['durationSec'], candidate['endSec'] - candidate['startSec'])

    def test_below_threshold_peak_is_retained_with_reason(self):
        levels = [-40.0] * 300
        levels[100:105] = [-36.0] * 5
        peaks, candidates, _ = self.discover(levels)
        self.assertEqual(len(peaks), 1)
        self.assertEqual(candidates, [])
        self.assertFalse(peaks[0]['qualifies'])
        self.assertEqual(peaks[0]['reasons'], ['LOCAL_ENERGY_PROMINENCE_BELOW_9_DB'])

    def test_sustained_rise_has_full_measurement_but_no_closed_peak(self):
        levels = [-50.0] * 100 + [-10.0] * 400
        _, candidates, integrated = self.discover(levels)
        self.assertEqual(candidates, [])
        self.assertEqual(len(integrated), len(levels))
        self.assertEqual(integrated[0]['startSample'], 0)
        self.assertEqual(integrated[-1]['endSampleExclusive'], len(levels) * 320)

    def test_boundary_maxima_are_measured_but_not_interior_candidates(self):
        for levels in [[-10.0] * 10 + [-50.0] * 290, [-50.0] * 290 + [-10.0] * 10]:
            _, candidates, integrated = self.discover(levels)
            self.assertEqual(candidates, [])
            self.assertEqual(len(integrated), len(levels))

    def test_asr_direct_overlap_and_nearby_context_remain_distinct(self):
        candidate = {'startSec': 3.0, 'endSec': 3.2, 'asrOverlap': [], 'asrContext': []}
        segments = [
            {'id': 'direct', 'startSec': 3.1, 'endSec': 3.4, 'text': 'direct', 'avgLogprob': -0.1, 'noSpeechProbability': 0.01},
            {'id': 'nearby', 'startSec': 2.5, 'endSec': 2.9, 'text': 'nearby', 'avgLogprob': -0.2, 'noSpeechProbability': 0.02},
            {'id': 'outside', 'startSec': 1.0, 'endSec': 2.0, 'text': 'outside', 'avgLogprob': -0.3, 'noSpeechProbability': 0.03},
        ]
        probe.add_asr_overlap([candidate], segments)
        self.assertEqual([row['segmentId'] for row in candidate['asrOverlap']], ['direct'])
        self.assertEqual([row['segmentId'] for row in candidate['asrContext']], ['direct', 'nearby'])
        empty = {'startSec': 10.0, 'endSec': 10.1}
        probe.add_asr_overlap([empty], segments)
        self.assertEqual(empty['asrOverlap'], [])
        self.assertEqual(empty['asrContext'], [])


if __name__ == '__main__':
    unittest.main()

import copy
import json
import unittest
from unittest.mock import patch

import caption_local_acoustics_v001 as sensor


def atom(i, text, start, end):
    return {'sourceSegmentId': i, 'text': text, 'startMs': start, 'endMs': end}


def word(text, token, start, end):
    return {'word': text, 'tokens': [token], 'start': start, 'end': end, 'probability': 1}


class SensorTests(unittest.TestCase):
    def setUp(self):
        self.window = {'startMs': 1000, 'endMs': 4000, 'text': '前本後',
                       'atoms': [atom(1, '前', 1000, 1500), atom(2, '本', 1800, 2100), atom(3, '後', 2500, 3000)]}
        self.words = [word('前', 1, 0, .5), word('本', 2, .8, 1.1), word('後', 3, 1.5, 2)]

    def test_context_origin_does_not_invalidate_internal_target(self):
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [2], 20)
        self.assertTrue(r['targetStart']['resolved'])
        self.assertEqual(r['targetStart']['candidateMs'], 1800)
        self.assertFalse(r['edgeContact'])

    def test_window_origin_is_not_speech_onset(self):
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [1], 20)
        self.assertFalse(r['targetStart']['resolved'])
        self.assertTrue(r['edgeContact'])

    def test_last_alignment_cell_is_not_known_offset(self):
        self.words[-1]['end'] = 2.98
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [3], 20)
        self.assertFalse(r['targetEnd']['resolved'])
        self.assertTrue(r['edgeContact'])

    def test_token_interior_is_not_interpolated(self):
        r = sensor.interpret(self.window, [word('前本', 1, .2, 1.1), self.words[-1]], [1, 3], [2], 20)
        self.assertFalse(r['targetStart']['resolved'])
        self.assertIsNone(r['targetStart']['candidateMs'])
        self.assertTrue(r['targetEnd']['resolved'])

    def test_nonpositive_token_is_unresolved(self):
        self.words[1]['end'] = .8
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [2], 20)
        self.assertFalse(r['targetStart']['resolved'])
        self.assertFalse(r['targetEnd']['resolved'])

    def test_wrong_text_or_tokens_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'TOKEN_COVERAGE'):
            sensor.interpret(self.window, self.words, [7], [2], 20)
        self.words[1]['word'] = '別'
        with self.assertRaisesRegex(AssertionError, 'TEXT_COVERAGE'):
            sensor.interpret(self.window, self.words, [1, 2, 3], [2], 20)

    def test_repeated_text_matched_by_ordered_identity(self):
        self.window['text'] = '本本後'; self.window['atoms'][0]['text'] = '本'; self.words[0]['word'] = '本'
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [2], 20)
        self.assertEqual(r['targetStart']['candidateMs'], 1800)
        self.assertEqual(r['targetUnitOrdinals'], [2])

    def test_window_hull_includes_original_target_outside_adopted_media(self):
        chunk = copy.deepcopy(self.window)
        r = sensor.plan_window(chunk, [1], {'sourceStartMs': 2000, 'sourceEndMs': 2500}, [2100, 2400])
        self.assertEqual((r['startMs'], r['endMs']), (1000, 2500))
        self.assertEqual(r['text'], '前本')

    def test_window_is_clipped_to_existing_chunk(self):
        r = sensor.plan_window(self.window, [2], {'sourceStartMs': 0, 'sourceEndMs': 6000}, [0, 6000])
        self.assertEqual((r['startMs'], r['endMs']), (1000, 4000))

    def test_alignment_excludes_feature_extractor_padding(self):
        self.assertEqual(sensor.alignment_frame_count(181654, 160, 3000), 1135)
        self.assertEqual(sensor.alignment_frame_count(480000, 160, 3000), 3000)
        with self.assertRaises(AssertionError):
            sensor.alignment_frame_count(480160, 160, 3000)

    def test_model_numpy_scalars_produce_serializable_sensor_evidence(self):
        import numpy as np
        for w in self.words:
            w['start'] = np.float64(w['start'])
            w['end'] = np.float64(w['end'])
            w['probability'] = np.float32(w['probability'])
        r = sensor.interpret(self.window, self.words, [1, 2, 3], [2], 20)
        self.assertEqual(json.loads(json.dumps(r)), r)

    def test_original_inputs_do_not_read_human_answers_or_old_observations(self):
        original = sensor.read
        opened = []
        def guarded(p):
            name = str(p)
            self.assertFalse(any(s in name for s in ['human', 'review-final', 'groups.json', 'acoustic-', 'caption-review-selector']))
            opened.append(name)
            return original(p)
        with patch.object(sensor, 'read', guarded):
            first = sensor.inputs()
        self.assertEqual([len(c['rows']) for c in first['cases']], [33, 4])
        self.assertTrue(opened)
        self.assertEqual(sum(len(c['rows']) for c in first['cases']), 37)


if __name__ == '__main__':
    unittest.main()

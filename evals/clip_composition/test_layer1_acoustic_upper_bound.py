import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from analyze_layer1_acoustic_upper_bound import classify, contiguous_runs


class AcousticUpperBoundTest(unittest.TestCase):
    def test_contiguous_runs_preserve_exact_400ms(self):
        flags = [False] * 3 + [True] * 20 + [False]
        self.assertEqual(contiguous_runs(flags), [{"startMs": 60, "endMs": 460, "durationMs": 400}])

    def test_mode3_only_is_not_confirmed(self):
        volume = {"observed400ms": False}
        mode0 = {"observed400ms": False, "speechFlags": [True] * 20}
        mode3 = {"observed400ms": True, "speechFlags": [False] * 20}
        result = classify(volume, mode0, mode3)
        self.assertEqual(result["voiceState"], "厳しい設定のみ声なし")
        self.assertFalse(result["confirmedAcousticGap"])

    def test_volume_or_voice_consensus_confirms_gap(self):
        self.assertTrue(classify(
            {"observed400ms": True},
            {"observed400ms": False, "speechFlags": [True] * 20},
            {"observed400ms": False, "speechFlags": [True] * 20},
        )["confirmedAcousticGap"])
        self.assertTrue(classify(
            {"observed400ms": False},
            {"observed400ms": True, "speechFlags": [False] * 20},
            {"observed400ms": True, "speechFlags": [False] * 20},
        )["confirmedAcousticGap"])

    def test_separate_absence_runs_are_not_consensus(self):
        mode0_flags = [False] * 20 + [True] * 20
        mode3_flags = [True] * 20 + [False] * 20
        result = classify(
            {"observed400ms": False},
            {"observed400ms": True, "speechFlags": mode0_flags},
            {"observed400ms": True, "speechFlags": mode3_flags},
        )
        self.assertFalse(result["voiceConsensusObserved"])


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""1つの外側区間から層1v002用の声なし区間を決定的に取り出す。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from analyze_layer1_acoustic_upper_bound import (
    FRAME_BYTES,
    MIN_ABSENCE_MS,
    analyze_voice,
    analyze_volume,
    classify,
    extract_pcm,
)


def without_frame_flags(voice: dict[str, object]) -> dict[str, object]:
    return {key: value for key, value in voice.items() if key != "speechFlags"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--start-ms", type=int, required=True)
    parser.add_argument("--end-ms", type=int, required=True)
    args = parser.parse_args()
    pcm = extract_pcm(args.source, args.start_ms, args.end_ms)
    frames = [pcm[offset:offset + FRAME_BYTES] for offset in range(0, len(pcm) - FRAME_BYTES + 1, FRAME_BYTES)]
    duration_ms = len(pcm) // 2 * 1000 // 16_000
    volume = analyze_volume(pcm, duration_ms)
    mode0 = analyze_voice(frames, 0)
    mode3 = analyze_voice(frames, 3)
    classification = classify(volume, mode0, mode3)
    result = {
        "kind": "layer1_voice_absence_evidence",
        "version": "layer1-voice-absence-v001",
        "sourcePath": str(args.source),
        "outerRange": {"startMs": args.start_ms, "endMs": args.end_ms},
        "minimumAbsenceMs": MIN_ABSENCE_MS,
        "durationMs": duration_ms,
        "volume": volume,
        "voice": {
            "method": "WebRTC VAD 2.0.14",
            "mode0": without_frame_flags(mode0),
            "mode3": without_frame_flags(mode3),
            "consensusRuns": classification["voiceConsensusRuns"],
            "consensusLongestMs": classification["voiceConsensusLongestMs"],
        },
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

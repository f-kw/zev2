#!/usr/bin/env python3
"""層1v002の実装前に、固定33区間の音響上界だけを測る。"""

from __future__ import annotations

import argparse
import array
import html
import json
import math
import re
import subprocess
import sys
from pathlib import Path

try:
    import webrtcvad
except ImportError as error:
    raise SystemExit(
        "webrtcvad-wheels 2.0.14 が必要です。リポジトリへ依存を追加せず、"
        "PYTHONPATHで一時導入先を指定してください。"
    ) from error


ROOT = Path(__file__).resolve().parents[2]
V001_RESULT = ROOT / "evals/clip_composition/outputs/internal-edit/20260717-layer1-trim-v001/result.json"
OUTPUT_ROOT = ROOT / "evals/clip_composition/outputs/internal-edit/20260717-layer1-acoustic-upper-bound-v001"
SAMPLE_RATE = 16_000
FRAME_MS = 20
FRAME_BYTES = SAMPLE_RATE * FRAME_MS // 1000 * 2
MIN_ABSENCE_MS = 400
VOLUME_THRESHOLD_DBFS = -60.0

SOURCE_PATHS = {
    "r_ztjHaHmcg_partial_material_v001": "evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4",
    "aX-axQMWR3c_single_material_v001": "evals/clip_composition/research/downloads/aX-axQMWR3c/sources/SGQqVJXsNNE/SGQqVJXsNNE.mp4",
    "nOEWCNc77MI_multiblock_material_v001": "evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4",
    "9dtwF5Exu5w_multiblock_material_v001": "evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4",
    "nE_bNeBNp4E_multiblock_material_v001": "evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4",
}


def run_checked(args: list[str], *, input_bytes: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(args, input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


def extract_pcm(source_path: Path, start_ms: int, end_ms: int) -> bytes:
    duration_ms = end_ms - start_ms
    if duration_ms <= 0:
        raise ValueError("診断区間の長さが正ではありません")
    completed = run_checked([
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-ss", f"{start_ms / 1000:.3f}", "-t", f"{duration_ms / 1000:.3f}",
        "-i", str(source_path), "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE),
        "-f", "s16le", "pipe:1",
    ])
    if not completed.stdout:
        raise RuntimeError(f"音声を抽出できません: {source_path} {start_ms}-{end_ms}ms")
    return completed.stdout


def contiguous_runs(flags: list[bool], frame_ms: int = FRAME_MS) -> list[dict[str, int]]:
    runs: list[dict[str, int]] = []
    start_index: int | None = None
    for index, enabled in enumerate(flags + [False]):
        if enabled and start_index is None:
            start_index = index
        elif not enabled and start_index is not None:
            runs.append({
                "startMs": start_index * frame_ms,
                "endMs": index * frame_ms,
                "durationMs": (index - start_index) * frame_ms,
            })
            start_index = None
    return runs


def longest_duration(runs: list[dict[str, int]]) -> int:
    return max((item["durationMs"] for item in runs), default=0)


def analyze_voice(frames: list[bytes], mode: int) -> dict[str, object]:
    vad = webrtcvad.Vad(mode)
    speech_flags = [bool(vad.is_speech(frame, SAMPLE_RATE)) for frame in frames]
    absence_runs = contiguous_runs([not value for value in speech_flags])
    longest_ms = longest_duration(absence_runs)
    return {
        "mode": mode,
        "speechFlags": speech_flags,
        "absenceRuns": absence_runs,
        "longestAbsenceMs": longest_ms,
        "absenceRatio": round(sum(not value for value in speech_flags) / len(speech_flags), 4) if speech_flags else 0,
        "observed400ms": longest_ms >= MIN_ABSENCE_MS,
    }


SILENCE_START = re.compile(r"silence_start:\s*([0-9.]+)")
SILENCE_END = re.compile(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)")


def analyze_volume(pcm: bytes, duration_ms: int) -> dict[str, object]:
    completed = run_checked([
        "ffmpeg", "-hide_banner", "-nostats", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1",
        "-i", "pipe:0", "-af", f"silencedetect=d={MIN_ABSENCE_MS / 1000:g}", "-f", "null", "-",
    ], input_bytes=pcm)
    lines = completed.stderr.decode("utf-8", errors="replace").splitlines()
    starts: list[float] = []
    runs: list[dict[str, int]] = []
    for line in lines:
        start_match = SILENCE_START.search(line)
        if start_match:
            starts.append(float(start_match.group(1)))
        end_match = SILENCE_END.search(line)
        if end_match:
            end_seconds = float(end_match.group(1))
            duration_seconds = float(end_match.group(2))
            start_seconds = starts.pop(0) if starts else max(0.0, end_seconds - duration_seconds)
            runs.append({
                "startMs": round(start_seconds * 1000),
                "endMs": round(end_seconds * 1000),
                "durationMs": round(duration_seconds * 1000),
            })
    for start_seconds in starts:
        start_ms = round(start_seconds * 1000)
        runs.append({"startMs": start_ms, "endMs": duration_ms, "durationMs": duration_ms - start_ms})
    longest_ms = longest_duration(runs)
    return {
        "method": "ffmpeg silencedetect",
        "noiseThreshold": "default 0.001 amplitude (approximately -60 dBFS)",
        "minimumDurationMs": MIN_ABSENCE_MS,
        "silenceRuns": runs,
        "longestSilenceMs": longest_ms,
        "observed400ms": longest_ms >= MIN_ABSENCE_MS,
    }


def rms_dbfs(frame: bytes) -> float:
    samples = array.array("h")
    samples.frombytes(frame)
    if sys.byteorder == "big":
        samples.byteswap()
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) if samples else 0
    if rms <= 0:
        return -96.0
    return max(-96.0, 20 * math.log10(rms / 32768))


def build_targets(v001: dict[str, object]) -> list[dict[str, object]]:
    targets: list[dict[str, object]] = []
    for item in v001["positiveTargets"]["items"]:
        targets.append({
            "targetType": "C分類",
            "targetId": item["key"],
            "fixtureId": item["fixtureId"],
            "expectedIndex": item["expectedIndex"],
            "transitionIndex": item["transitionIndex"],
            "startMs": item["gapStartMs"],
            "endMs": item["gapEndMs"],
            "description": item.get("omittedText", ""),
        })
    for index, item in enumerate(v001["protectedTargets"]["items"], start=1):
        targets.append({
            "targetType": "保護正解",
            "targetId": f"protected-{index}",
            "fixtureId": item["fixtureId"],
            "expectedIndex": item["expectedIndex"],
            "transitionIndex": None,
            "startMs": item["startMs"],
            "endMs": item["endMs"],
            "description": item["description"],
        })
    return targets


def classify(volume: dict[str, object], mode0: dict[str, object], mode3: dict[str, object]) -> dict[str, object]:
    consensus_runs = contiguous_runs([
        not mode0_speech and not mode3_speech
        for mode0_speech, mode3_speech in zip(mode0["speechFlags"], mode3["speechFlags"])
    ])
    consensus_longest_ms = longest_duration(consensus_runs)
    voice_consensus = consensus_longest_ms >= MIN_ABSENCE_MS
    mode3_only = bool(mode3["observed400ms"] and not mode0["observed400ms"])
    if voice_consensus:
        voice_state = "両設定で声なし"
    elif mode3_only:
        voice_state = "厳しい設定のみ声なし"
    else:
        voice_state = "声なし未観測"
    confirmed = bool(volume["observed400ms"] or voice_consensus)
    return {
        "voiceState": voice_state,
        "voiceConsensusRuns": consensus_runs,
        "voiceConsensusLongestMs": consensus_longest_ms,
        "voiceConsensusObserved": voice_consensus,
        "voiceMode3OnlyObserved": mode3_only,
        "volumeAbsentVoiceAbsentDifference": bool(not volume["observed400ms"] and voice_consensus),
        "confirmedAcousticGap": confirmed,
    }


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def render_html(result: dict[str, object]) -> str:
    rows = []
    cards = []
    for index, item in enumerate(result["items"]):
        volume = item["volume"]
        mode0 = item["voice"]["mode0"]
        mode3 = item["voice"]["mode3"]
        classification = item["classification"]
        rows.append(
            f"<tr><td>{esc(item['targetType'])}</td><td>{esc(item['targetId'])}</td>"
            f"<td>{item['durationMs']}</td><td>{'あり' if volume['observed400ms'] else 'なし'} ({volume['longestSilenceMs']}ms)</td>"
            f"<td>{esc(classification['voiceState'])} (緩:{mode0['longestAbsenceMs']}ms / 厳:{mode3['longestAbsenceMs']}ms)</td>"
            f"<td>{'あり' if classification['confirmedAcousticGap'] else 'なし'}</td></tr>"
        )
        payload = html.escape(json.dumps({
            "rms": item["rmsDbfs"],
            "mode0": mode0["speechFlags"],
            "mode3": mode3["speechFlags"],
        }, ensure_ascii=False), quote=True)
        cards.append(
            f"<section class='card'><h3>{index + 1}. {esc(item['targetType'])} / {esc(item['targetId'])}</h3>"
            f"<p>{item['durationMs']}ms / 音量無音 {'あり' if volume['observed400ms'] else 'なし'} / {esc(classification['voiceState'])}</p>"
            f"<canvas width='1000' height='150' data-series='{payload}'></canvas></section>"
        )
    summary = result["summary"]
    return f"""<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>層1 音響上界診断</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f5f7fa;color:#172033}}main{{max-width:1180px;margin:auto;padding:24px}}section,table{{background:white;border:1px solid #d7deea;border-radius:12px}}.lead,.card{{padding:16px;margin-bottom:16px}}table{{width:100%;border-collapse:collapse;margin-bottom:20px;overflow:hidden}}th,td{{padding:8px;border-bottom:1px solid #e4e9f0;text-align:left;font-size:13px}}canvas{{width:100%;height:150px;background:#fbfcfe}}code{{background:#eef2f7;padding:2px 4px}}</style></head><body><main>
<section class=\"lead\"><h1>層1 音響上界診断</h1><p>C分類30箇所と保護3件を、同じ400ms基準で音量と声の両方から測定した。自動カット実装ではない。</p>
<ul><li>C分類で音量無音: {summary['cTargets']['volumeObserved']}/30</li><li>C分類で両VAD設定が声なし: {summary['cTargets']['voiceConsensusObserved']}/30</li><li>BGM等で音量無音なし・声なしあり: {summary['cTargets']['volumeAbsentVoiceAbsentDifference']}/30</li><li>確認できた音響ギャップ: {summary['cTargets']['confirmedAcousticGap']}/30</li></ul></section>
<table><thead><tr><th>種別</th><th>ID</th><th>長さ</th><th>音量</th><th>声</th><th>音響ギャップ</th></tr></thead><tbody>{''.join(rows)}</tbody></table>
{''.join(cards)}
<script>document.querySelectorAll('canvas').forEach(c=>{{const s=JSON.parse(c.dataset.series),x=c.getContext('2d'),w=c.width,h=c.height,n=Math.max(1,s.rms.length-1);x.strokeStyle='#c7d0dd';x.beginPath();x.moveTo(0,60);x.lineTo(w,60);x.stroke();x.strokeStyle='#2459a6';x.beginPath();s.rms.forEach((v,i)=>{{const y=10+Math.max(0,Math.min(80,-v))/80*70;const px=i/n*w;i?x.lineTo(px,y):x.moveTo(px,y)}});x.stroke();[['mode0',95],['mode3',125]].forEach(([k,y])=>{{s[k].forEach((speech,i)=>{{x.fillStyle=speech?'#d96b5f':'#62a86b';x.fillRect(i/n*w,y,Math.max(1,w/n),18)}})}});x.fillStyle='#172033';x.fillText('音量（上段、-60dB線）',8,12);x.fillText('声VAD 緩',8,92);x.fillText('声VAD 厳',8,122)}});</script>
</main></body></html>"""


def summarize(items: list[dict[str, object]], target_type: str) -> dict[str, int]:
    selected = [item for item in items if item["targetType"] == target_type]
    return {
        "total": len(selected),
        "volumeObserved": sum(bool(item["volume"]["observed400ms"]) for item in selected),
        "voiceConsensusObserved": sum(bool(item["classification"]["voiceConsensusObserved"]) for item in selected),
        "voiceMode3OnlyObserved": sum(bool(item["classification"]["voiceMode3OnlyObserved"]) for item in selected),
        "volumeAbsentVoiceAbsentDifference": sum(bool(item["classification"]["volumeAbsentVoiceAbsentDifference"]) for item in selected),
        "confirmedAcousticGap": sum(bool(item["classification"]["confirmedAcousticGap"]) for item in selected),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_ROOT)
    args = parser.parse_args()
    v001 = json.loads(V001_RESULT.read_text())
    items: list[dict[str, object]] = []
    for target in build_targets(v001):
        source_relative = SOURCE_PATHS[target["fixtureId"]]
        source_path = ROOT / source_relative
        pcm = extract_pcm(source_path, target["startMs"], target["endMs"])
        frames = [pcm[offset:offset + FRAME_BYTES] for offset in range(0, len(pcm) - FRAME_BYTES + 1, FRAME_BYTES)]
        duration_ms = len(pcm) // 2 * 1000 // SAMPLE_RATE
        volume = analyze_volume(pcm, duration_ms)
        mode0 = analyze_voice(frames, 0)
        mode3 = analyze_voice(frames, 3)
        classification = classify(volume, mode0, mode3)
        items.append({
            **target,
            "sourcePath": source_relative,
            "durationMs": duration_ms,
            "rmsDbfs": [round(rms_dbfs(frame), 1) for frame in frames],
            "volume": volume,
            "voice": {"method": "WebRTC VAD 2.0.14", "frameMs": FRAME_MS, "mode0": mode0, "mode3": mode3},
            "classification": classification,
        })
    result = {
        "kind": "layer1_acoustic_upper_bound_diagnostic",
        "version": "layer1-acoustic-upper-bound-v001",
        "runDate": "2026-07-17",
        "purpose": "C分類が音響的な層1正解になり得るかを測る。自動カット実装ではない。",
        "methods": {
            "volume": {"tool": "FFmpeg silencedetect", "noiseThreshold": "default 0.001 amplitude (approximately -60 dBFS)", "minimumDurationMs": MIN_ABSENCE_MS},
            "voice": {"tool": "WebRTC VAD", "packageVersion": "2.0.14", "sampleRate": SAMPLE_RATE, "frameMs": FRAME_MS, "modes": [0, 3], "minimumDurationMs": MIN_ABSENCE_MS},
        },
        "classificationRule": "音量無音あり、またはWebRTC VADのmode 0と3の両方で声なしが400ms以上あれば、音響ギャップ確認。mode 3のみは不確実として正解へ入れない。",
        "items": items,
        "summary": {"cTargets": summarize(items, "C分類"), "protectedTargets": summarize(items, "保護正解")},
        "limitations": [
            "音量判定は配信の混合音声を測るため、BGM・ゲーム音があれば話者が黙っていても無音にならない。",
            "WebRTC VADは人声向けだが、ボーカル曲BGMやゲーム内ボイスを人声と誤認し得る。笑い・叫び・息を声として拾うかは一定しない。",
            "mode 0と3の両端を並記し、結果を見てから単一モードを選ばない。",
            "音響ギャップが見えても、意味上の溜め・反応待ち・余韻は削除根拠にならない。保護3件は上界の負例として別集計する。",
        ],
        "humanWork": {"itemCount": 0, "estimatedMinutes": 0},
    }
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (args.output / "diagnostic.html").write_text(render_html(result))
    print(json.dumps({"output": str(args.output.relative_to(ROOT)), "summary": result["summary"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

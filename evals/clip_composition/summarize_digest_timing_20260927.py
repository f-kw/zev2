#!/usr/bin/env python3
"""Reconstruct the 2026-09-26 run from saved records; never execute media work.

Only the two 14.1 timing-baseline report files are written. All source evidence,
including failed executions, is read-only. This is a run-specific report helper,
not a production scheduler or a claim of an end-to-end normal-run measurement.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "docs/reports/qc-evidence-common-20260927"
SOURCE = ROOT / "docs/reports/new-material-digest-20260926/timing-verification.json"
RUN = ROOT / "runtime/artifacts/digest-new-material-20260926-v001"


def read(path):
    return json.loads(Path(path).read_text())


def instant(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def seconds(start, end):
    return (instant(end) - instant(start)).total_seconds()


def duration(value):
    if value is None:
        return "未計測"
    return f"{int(value // 3600)}時間{int(value % 3600 // 60):02d}分{value % 60:06.3f}秒"


def evidence(path, pointer=None):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    result = {"path": str(path.relative_to(ROOT)),
              "bytes": path.stat().st_size,
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    if pointer is not None:
        result["jsonPointer"] = pointer
    return result


source = read(SOURCE)
original = source["stages"]
assert len(original) == 33
for index, suffix in {
    7: "execution/stt-no-diarization-2026-09-26T09-46-13.148Z.json",
    17: "presentation/execution/render-2026-09-26T15-03-24.914Z.json",
    22: "presentation/qc-resume-attempt-002/publish-execution.json",
    23: "presentation/qc-resume-attempt-002/qc-execution.json",
    25: "presentation/qc-resume-attempt-002/resolve-execution.json",
    27: "source/acquisition-execution.json", 28: "base-attempt-002/execution.json",
    30: "presentation/codec-diagnosis-000103-v001/execution.json",
    31: "presentation/codec-diagnosis-000103-v001/window-alignment-proof.json",
    32: "presentation/audio/summary.json",
}.items():
    assert original[index]["record"] == str((RUN / suffix).relative_to(ROOT))
categories = [
    "failed/retry", "required", "required", "required", "required", "required",
    "failed/retry", "required", "required", "required", "required", "failed/retry",
    "failed/retry", "required", "required", "failed/retry", "failed/retry", "failed/retry",
    "failed/retry", "recovery", "recovery", "recovery", "required", "failed/retry",
    "recovery", "recovery", "duplicate-verification-candidate", "required", "required",
    "required", "recovery", "recovery", "required",
]
rows = []
source_ref = evidence(SOURCE)


def add(stage, purpose, category, elapsed, *, start=None, end=None, refs=None,
        basis="saved-monotonic-elapsed", parent=None, parallel=None, reuse=False,
        note=None, **extra):
    row = {"stage": stage, "purpose": purpose, "startedAt": start, "endedAt": end,
           "elapsedSeconds": elapsed, "category": category, "parallelWith": parallel or [],
           "couldPotentiallyReuse": reuse, "evidence": refs or [], "timeBasis": basis,
           "parentStage": parent, **extra}
    if note:
        row["note"] = note
    rows.append(row)
    return row


notes = {
    7: "キュー待ちを内包。正常参考ではこの外側呼出し時間から記録済みキュー待ちだけを控除する。",
    17: "本体動画と全編再現検査は成功。後続の大容量入力SHA読込みで失敗。全体を失敗コストとして除くと必要処理も失う。",
    23: "424サンプル比較完了後のJSON保存で失敗。必要QCと保存失敗末尾の独立計時がなく、正常参考では包括値を代用する。",
    25: "字幕000103限定解決の最終処理。通常必要なvalidator・音声・入力照合と復旧専用再読・正規化・GCを分離計時していない。",
    26: "全編再現encode中に完走。実走の追加クリティカルパス時間は0と扱い、子処理時間は保持する。",
    28: "実走上は再試行だが、成功した土台生成1回分の代表値として正常参考へ採用する。",
    29: "外側STT呼出しと同一job。二重に合計しない。",
    32: "初回失敗土台の完成byteを利用し成功土台再試行と並行。開始・終了時刻は未保存。失敗のない経路で同じ並列が成立した証拠にはならない。",
}
for index, value in enumerate(original):
    parent = {1: "judgment-1", 2: "judgment-4", 4: "judgment-3",
              5: "judgment-2", 10: "judgment-5", 29: "stage-08"}.get(index)
    parallel = {19: ["stage-24"], 20: ["stage-24"], 21: ["stage-24", "stage-20"],
                26: ["exact-replay"], 32: ["stage-29"]}.get(index, [])
    row = add(f"stage-{index + 1:02d}", value["meaning"], categories[index], value["elapsedSeconds"],
              start=value.get("startedAt"), end=value.get("endedAt"),
              refs=[evidence(value["record"]), {**source_ref, "jsonPointer": f"/stages/{index}"}],
              parent=parent, parallel=parallel, reuse=index in [3, 8, 9, 13, 14, 26, 27, 28, 32],
              note=notes.get(index), originalStatus=value.get("status", "recorded"))
    if index == 19:
        row["timeBasis"] = "filesystem-observation-not-monotonic"

for index, value in enumerate(source["judgmentStageWallIntervals"]):
    add(f"judgment-{index + 1}", value["meaning"], "required", value["elapsedSeconds"],
        start=value["startedAt"], end=value["endedAt"], basis="saved-wall-interval",
        refs=[{**source_ref, "jsonPointer": f"/judgmentStageWallIntervals/{index}"}],
        note=value["timeBasis"], reuse=True)

# Server queue and GPU job clocks are distinct from the client clock.
job_path = RUN / "stt-attempt-003-no-diarization/gpu-stt-status.json"
job = read(job_path)
receipt_path = RUN / "stt-attempt-003-no-diarization/gpu-stt-job.json"
receipt = read(receipt_path)
stt_client = original[29]
stt_parts = [
    ("stt-upload", "入力SHA確認・転送・受付保存", "required", stt_client["startedAt"], receipt["registeredAt"]),
    ("stt-queue", "GPU先行jobの終了待ち", "waiting", job["registeredAt"], job["startedAt"]),
    ("stt-processing", "全編文字認識・時刻合わせ", "required", job["startedAt"], job["endedAt"]),
    ("stt-result", "完了検知・結果取得・変換終了まで", "required", job["endedAt"], stt_client["endedAt"]),
]
for stage, purpose, category, start, end in stt_parts:
    add(stage, purpose, category, seconds(start, end), start=start, end=end,
        basis="saved-wall-interval", parent="stage-30",
        refs=[evidence(job_path), evidence(receipt_path), evidence(stt_client["record"])],
        reuse=category == "required", note="GPUはserver、送信前後はclient時計。受付時刻の約0.05秒差があり内訳の単純和で外側記録を置換しない。")
for stage, purpose, elapsed in [("stt-whisper", "新jobの文字認識のみ", None),
                                ("stt-alignment", "新jobの時刻合わせのみ", None),
                                ("stt-diarization", "話者分離", 0)]:
    add(stage, purpose, "required", elapsed, parent="stt-processing", reuse=True,
        refs=[evidence(job_path)], basis="not-reported" if elapsed is None else "disabled-skipped",
        note="旧jobの時間を流用しない。" if elapsed is None else "今回明示的に無効。")

replay_path = ROOT / "evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP/scratch/exact-replay-result.json"
replay = read(replay_path)
replay_seconds = replay["performance"]["wallClockMs"] / 1000
replay_row = add("exact-replay", "全編を同一条件で再描画し完成byteとの一致を検査", "duplicate-verification-candidate",
                 replay_seconds, refs=[evidence(replay_path, "/performance")], parent="stage-18",
                 parallel=["stage-27"], reuse=True,
                 note="現行では必須・今回省略不可。子encode時間を追加で合計しない。開始終了の絶対時刻は未保存。")

# Process observers persist timing.json only after child completion. mtime is
# an observed upper endpoint, not a fabricated execution timestamp.
composite_timing = RUN / "presentation/render-processes/2841-video-composite/timing.json"
composite = read(composite_timing)
composite_saved_at = datetime.fromtimestamp(composite_timing.stat().st_mtime, timezone.utc).isoformat()
generation_seconds = seconds(original[17]["startedAt"], composite_saved_at)
encode_seconds = composite["childMilliseconds"] / 1000
before_encode = generation_seconds - encode_seconds
after_encode_other = original[17]["elapsedSeconds"] - generation_seconds - replay_seconds
assert before_encode > 0 and after_encode_other > 0
add("first-video-generation", "描画開始から最初の本体合成完了記録保存まで", "required", generation_seconds,
    start=original[17]["startedAt"], end=composite_saved_at,
    basis="stage-clock-to-filesystem-observation", parent="stage-18", reuse=True,
    refs=[evidence(original[17]["record"]), evidence(composite_timing)],
    note="終点は子処理終了後の記録mtime。厳密な合成終了時計ではなく、QC前参考の近接観測境界。")
add("render-before-encode", "入力準備・字幕画像・描画前検査等（本体encode以外）", "required", before_encode,
    start=original[17]["startedAt"], basis="residual-derived-from-observation", parent="first-video-generation",
    refs=[evidence(original[17]["record"]), evidence(composite_timing)], reuse=True,
    note="合成完了記録までの観測区間から単調時計のencode時間を控除した残差。SHA・描画・検査の内訳は分離不能。")
add("post-encode-other", "完成媒体走査・native比較の準備等（再現検査以外）", "duplicate-verification-candidate",
    after_encode_other, basis="residual-derived-from-observation", parent="stage-18", reuse=True,
    refs=[evidence(original[17]["record"]), evidence(composite_timing), evidence(replay_path, "/performance")],
    note="描画試行全体から本体完成までと全編再現検査を控除。最後の入力SHA失敗と失敗記録処理を含み、その全量は未分離。")

group_purposes = {
    "native-qc-tool-version": "QCツール版の取得", "native-qc-source-frames-extract": "比較元の対象フレーム抽出",
    "native-qc-completed-frames-extract": "完成動画の対象フレーム抽出",
    "native-qc-native-layer-prepare": "比較用字幕層の準備", "native-qc-native-layer-decode": "比較用字幕層の復号",
    "native-qc-completed-rgb-crop": "完成フレームの比較範囲RGB読取り",
    "native-qc-native-reference-composite": "字幕状態ごとの比較候補合成",
    "orchestration-audio-inspection-ffprobe": "演出用音声の媒体情報確認",
    "orchestration-audio-inspection-audio-payload": "演出用音声の圧縮packet照合",
    "layout-inspection": "字幕配置の検査", "overlay-still": "字幕画像の描画",
    "overlay-line-mask": "字幕行の比較mask作成", "overlay-line-inspection-alpha": "字幕行の透明度検査",
    "overlay-line-inspection-bounds": "字幕行の領域検査", "overlay-final-inspection-alpha": "字幕画像の透明度検査",
    "overlay-final-inspection-bounds": "字幕画像の領域検査", "motion-native-canvas-inspection": "動く字幕の描画領域検査",
    "overlay-calibration-inspection-alpha": "字幕位置校正用の透明度検査",
    "overlay-calibration-inspection-bounds": "字幕位置校正用の領域検査", "video-composite": "本体動画合成",
    "output-media-inspection-ffprobe": "完成媒体の形式・フレーム走査",
    "output-media-inspection-audio-payload": "完成媒体の音声packet照合", "output-frame-count": "完成媒体のフレーム数走査",
    "exact-replay-version-ffmpeg": "再現検査の描画ツール版確認",
    "exact-replay-version-ffprobe": "再現検査の検査ツール版確認", "exact-replay-encode": "全編再現encode",
    "exact-replay-video-probe-completed": "再現照合前の完成動画情報確認",
    "exact-replay-video-probe-replay": "再現照合前の再現動画情報確認",
    "native-center-layout-reconstruction": "字幕中心配置の再構築",
    "native-qc-diagnostic-overlay-inspection-alpha": "比較候補字幕の透明度検査",
    "native-qc-diagnostic-overlay-inspection-bounds": "比較候補字幕の領域検査",
}
for attempt, groups in source["subprocessAttemptGroups"].items():
    parent = {"render-processes": "stage-18", "render-processes-attempt-002": "stage-17",
              "qc-resume-attempt-002": "stage-24"}[attempt]
    for label, group in groups.items():
        category = "required" if label in ["video-composite", "overlay-still"] else "duplicate-verification-candidate"
        if attempt == "render-processes-attempt-002":
            category = "failed/retry"
        add(f"processes/{attempt}/{label}", group_purposes[label], category, group["childSeconds"],
            refs=[{**source_ref, "jsonPointer": f"/subprocessAttemptGroups/{attempt}/{label}"}],
            basis="sum-of-child-monotonic-durations-not-a-stage-wall-interval", parent=parent,
            reuse=category != "failed/retry", childCount=group["calls"], evidenceWriteSeconds=group["evidenceWriteSeconds"],
            note="絶対開始終了は未保存。親工程へ内包し、正常参考では親と二重加算しない。再利用候補は省略許可を意味しない。")

for index, value in enumerate(source["codecDiagnosticProcesses"]):
    add(f"diagnostic-child-{index + 1}", "字幕000103限定診断: " + value["label"], "recovery", value["elapsedSeconds"],
        start=value["startedAt"], end=value["endedAt"], parent="stage-31",
        refs=[{**source_ref, "jsonPointer": f"/codecDiagnosticProcesses/{index}"}])
for index, value in enumerate(source["testExecutions"]):
    add(f"test-{index + 1}", "開発回帰試験: " + Path(value["record"]).name, "required",
        value["duration_ms"] / 1000, refs=[evidence(value["record"])],
        basis="test-runner-monotonic-duration", scope="development-test-not-per-video-stage",
        note=f"{value['tests']}件中{value['pass']}合格/{value['fail']}失敗。制作1本の正常参考へは算入しない。")

# All wall intervals use a union, never a naive sum. Uncovered intervals are
# not classified as human wait: they may contain debugging or unlogged work.
overall = source["overall"]
begin, finish = instant(overall["startedAt"]), instant(overall["endedAt"])
intervals = []
for value in original + source["judgmentStageWallIntervals"]:
    if value.get("startedAt") and value.get("endedAt"):
        a, b = max(begin, instant(value["startedAt"])), min(finish, instant(value["endedAt"]))
        if b >= a:
            intervals.append((a, b))
merged = []
for a, b in sorted(intervals):
    if merged and a <= merged[-1][1]:
        merged[-1][1] = max(b, merged[-1][1])
    else:
        merged.append([a, b])
covered = sum((b-a).total_seconds() for a, b in merged)
gaps = []
previous = begin
for a, b in merged:
    if a > previous:
        gaps.append({"startedAt": previous.isoformat(), "endedAt": a.isoformat(),
                     "elapsedSeconds": (a-previous).total_seconds(), "category": None,
                     "reason": "個別工程の計時計録なし。人間待ち・修正・思考等へ恣意的に配賦しない。"})
    previous = max(previous, b)
if previous < finish:
    gaps.append({"startedAt": previous.isoformat(), "endedAt": finish.isoformat(),
                 "elapsedSeconds": (finish-previous).total_seconds(), "category": None})
assert abs(covered + sum(g["elapsedSeconds"] for g in gaps) - overall["elapsedSeconds"]) < 0.00001

terms = []


def term(stage, purpose, elapsed, *, before_qc=True, certainty="measured-one-run", note=None):
    terms.append({"stage": stage, "purpose": purpose, "contributionSeconds": elapsed,
                  "beforeQc": before_qc, "certainty": certainty, "note": note})


term("stage-28", "素材取得", original[27]["elapsedSeconds"])
term("stage-08-minus-stt-queue", "STT送信・処理・結果取得（キューを除く外側呼出し）",
     original[7]["elapsedSeconds"] - source["sttBreakdownSeconds"]["queue"], certainty="mixed-clock-derived")
term("stage-04", "文字起こし入力準備", original[3]["elapsedSeconds"])
for i in range(3):
    term(f"judgment-{i+1}", source["judgmentStageWallIntervals"][i]["meaning"],
         source["judgmentStageWallIntervals"][i]["elapsedSeconds"], certainty="measured-judgment-and-operation-interval")
term("stage-29", "成功した土台生成1回", original[28]["elapsedSeconds"])
term("stage-33", "成功土台を使う独立音声観測1回", original[32]["elapsedSeconds"],
     certainty="measured-duration-with-serial-dependency-assumption",
     note="失敗土台を流用した実走の並行を正常一発経路へ転用しない。土台完了後に置く直列参考。")
term("judgment-4", "字幕区切り判断と検証", source["judgmentStageWallIntervals"][3]["elapsedSeconds"], certainty="measured-judgment-and-operation-interval")
for index in [13, 9, 14]:
    term(f"stage-{index+1:02d}", original[index]["meaning"], original[index]["elapsedSeconds"])
term("judgment-5", "演出・接続判断と検証", source["judgmentStageWallIntervals"][4]["elapsedSeconds"], certainty="measured-judgment-and-operation-interval")
term("stage-09", "接続後背景・音声と非変更確認", original[8]["elapsedSeconds"])
term("render-before-encode", "字幕画像・描画前の準備と検査", before_encode, certainty="observed-boundary-residual")
term("processes/render-processes/video-composite", "本体動画合成", encode_seconds)
term("post-encode-other", "完成媒体検査・比較準備等", after_encode_other, before_qc=False,
     certainty="failure-containing-proxy", note="終端SHA失敗と記録処理を完全分離できない。削減可能時間と断定しない。")
term("exact-replay", "全編再現一致QC", replay_seconds, before_qc=False,
     note="省略しない。本体描画と二重加算しない。")
term("stage-24", "字幕状態QC1回・証拠保存までの包括時間", original[23]["elapsedSeconds"], before_qc=False,
     certainty="failure-containing-proxy", note="JSON保存失敗末尾と入力事前照合の時間を分離できず包括値を代用。")
term("stage-26", "最終validator・音声・入力照合を含む包括時間", original[25]["elapsedSeconds"], before_qc=False,
     certainty="recovery-containing-proxy", note="復旧専用再読・正規化・GCを含み、正常処理のみの実測ではない。")
term("stage-23", "初稿固定保存", original[22]["elapsedSeconds"], before_qc=False)
normal = sum(t["contributionSeconds"] for t in terms)
pre_qc = sum(t["contributionSeconds"] for t in terms if t["beforeQc"])
mixed = sum(t["contributionSeconds"] for t in terms
            if t["certainty"] in ["failure-containing-proxy", "recovery-containing-proxy"])
assert abs(normal - (sum(t["contributionSeconds"] for t in terms if not t["beforeQc"]) + pre_qc)) < 0.000001

ranked = sorted(terms, key=lambda t: t["contributionSeconds"], reverse=True)
for rank, value in enumerate(ranked, 1):
    value["rank"] = rank
    value["required"] = True
    value["mayOmitInCurrentScope"] = False
    value["reuseCondition"] = "同じ入力byte・判断・描画条件・ツール・検査条件への束縛が必要。再利用可否の実装評価前。"
    value["implementationCandidate"] = {
        "stage-24": "14.8.1 共通証拠の保存・再読重複。比較画像・RGB逐次処理は14.8.2候補。",
        "stage-26": "共通資料再展開・巨大JSON読込み・canonical化・GC。14.8.1で対象範囲を測定する。",
        "exact-replay": "全編再現を今回は維持。省略・代替には別指示と品質保証の根拠が必要。",
        "processes/render-processes/video-composite": "14.9.1 字幕合成局所化の候補。今回は描画方式を変更しない。",
        "render-before-encode": "同じ字幕画像・共通入力照合の再利用候補。今回の証拠表現変更以外は実装しない。",
        "stage-08-minus-stt-queue": "認識・時刻合わせ内訳は未計測。今回はSTTを変更しない。",
    }.get(value["stage"], "順位だけでは短縮可能性を判定しない。今回追加実装なし。")
    value["specificationChangeRequiredToOmit"] = True

result = {
    "scope": "14.1 計測基準整理（既存runの再構成、全編再実行なし）",
    "source": source_ref,
    "categories": {"required": "正常経路の必要処理。保存結果の再利用候補も含む。",
                   "waiting": "外部処理待ちとして記録から特定できた時間。",
                   "failed/retry": "失敗・再試行の包括記録。必要な成功部分の内包は別記する。",
                   "recovery": "今回の不具合・容量・判定の復旧。通常必要処理を内包する場合も明記。",
                   "duplicate-verification-candidate": "重複の可能性を調べる対象。現在の省略許可ではない。"},
    "recordCountsByCategory": dict(Counter(row["category"] for row in rows)),
    "stages": rows,
    "wallCoverage": {"overall": overall, "recordedIntervalUnionSeconds": covered,
                     "unassignedSeconds": sum(g["elapsedSeconds"] for g in gaps), "unassignedIntervals": gaps,
                     "note": "時刻付き親・子・判断区間の和集合。音声観測・test・子処理の絶対時刻不明分は新たに配賦しない。"},
    "referenceReconstruction": {
        "status": "conditional-reference-not-a-normal-run-measurement-or-guaranteed-bound",
        "normalReferenceSeconds": normal,
        "nonMixedContributionSeconds": normal - mixed,
        "failureOrRecoveryContainingProxySeconds": mixed,
        "videoBeforePostRenderQcReferenceSeconds": pre_qc,
        "sameCaseWithRecordedExceptionalDiagnosisSeconds": normal + original[30]["elapsedSeconds"] + original[31]["elapsedSeconds"],
        "terms": terms,
        "parallelHandling": [
            "全編decode15.368秒は再現encodeと並行。参考経過には追加しない。",
            "QC中の圧縮3記録は復旧。QCと重なるので正常参考へ追加しない。",
            "音声観測は失敗土台を使って成功土台再試行と並行した。正常一発経路の並列成立は未検証なので、成功土台後の直列参考へ置く。",
            "判断区間に内包する検証時間、STT内側client、描画親/子、全編再現親/子、QC reference生成子時間を二重加算しない。",
        ],
        "limitations": [
            "正常全通し実測は存在しない。失敗のない時間を測るための全編再実行は行わない。",
            "QC保存失敗末尾、入力再照合、復旧専用再読・正規化・GCの独立時間がないため包括値を代用している。精密な正常時間、最短値、上限値ではない。",
            "実走時のCPU/I/O競合がなくなった場合の時間は不明。同じ各処理時間が再現する保証はない。",
            "字幕修正・操作・監査待ち等の個別時間は未計測。未知時間を0秒の正常処理として保証しない。",
            "000103の元native failureは残る。今回素材の完了を再現するなら限定診断211.439秒と対応確認0.609秒を別途要する。正常参考をQC合格の主張にしない。",
        ],
        "previousReferenceCorrection": {
            "previousClaimMinutes": 665, "previousTableMinutes": [87, 65, 216, 148, 49],
            "previousTableSumMinutes": 565, "arithmeticDifferenceMinutes": 100,
            "finding": "以前の約11時間5分は自身の表の合計と100分不一致。正式基準へ昇格せず訂正する。",
            "previousSixHourFinding": "以前のQC前約6時間は全編再現検査等を含む描画試行全体を参照しており、QC前の境界ではない。",
        },
    },
    "bottleneckRanking": ranked,
    "unmeasured": ["新jobのWhisper単体時間", "新jobのalignment単体時間", "判断のモデル単体時間",
                   "人間判断待ちだけの時間", "コード修正だけの時間", "各SHA走査だけの時間",
                   "QC保存失敗末尾だけの時間", "通常の最終validatorと復旧専用処理の分離時間"],
    "prohibitedActionsPerformed": {"fullVideoReruns": 0, "encodes": 0, "sttRuns": 0,
                                   "paidApiCalls": 0, "oldEvidenceWrites": 0},
}

REPORT.mkdir(parents=True, exist_ok=True)
(REPORT / "timing-baseline.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
lines = [
    "# 14.1 制作時間の基準整理", "", "担当: Codex2。2026-09-26の保存済み実走記録を再構成。全編再実行・動画再encode・STT・API呼出し・既存証拠の変更は0。", "",
    "## 結論", "", "| 種類 | 時間 | 性質 |", "|---|---:|---|",
    f"| 実走総経過 | {duration(overall['elapsedSeconds'])} | 素材取得開始→初稿固定の実測。待機・失敗・復旧込み |",
    f"| 正常経路参考 | **約{int(normal//3600)}時間{round(normal%3600/60):02d}分**（算出値 {duration(normal)}） | 独立音声観測を成功土台後に置く条件付き再構成。QC等の未分離包括値を代用 |",
    f"| QC前の動画生成参考 | **約{int(pre_qc//3600)}時間{round(pre_qc%3600/60):02d}分**（算出値 {duration(pre_qc)}） | 最初の本体合成完了記録まで。終点は保存記録mtimeによる近接観測 |",
    "", "**正常全通しの実測でも、保証された最短時間でもない。** 同一条件で成功した1回分を選び直し、外部キュー・失敗した別試行・証拠復旧を除いた参考。ただしQC保存失敗末尾と通常検証を分離した計時がないため、QCの包括時間を代用している。正常時間の小数精度を主張しない。", "",
    f"この合計のうち {duration(mixed)} は失敗・復旧処理が混在する包括値の代用。残りの {duration(normal-mixed)} は個別計測と観測境界から組んだ寄与である。前者をすべて不要時間とすることも、すべて正常必須時間とすることもできない。", "",
    "## 以前の参考値の訂正", "",
    "以前の『約11時間5分』は、同じ回答の表 `87+65+216+148+49=565分（9時間25分）` と100分不一致だった。計算誤りであり、正式基準として引き継がない。以前の『QC前約6時間』にも全編再現検査などが混在していた。今回、本体合成の完了境界を分け直した。", "",
    "独立音声観測38分08.892秒は、実走では失敗した初回土台のbyteを使い、成功土台の再試行と並行した。失敗がない正常経路でこの並行をそのまま控除できる証拠はない。本参考では成功土台の後へ直列に置く。音声観測と字幕準備等の新しい並列化は仮定しない。", "",
    "## 分類と二重計上の排除", "",
    "全33工程、判断5区間、新STT内訳、子処理群、限定診断内訳、開発testを [timing-baseline.json](timing-baseline.json) に分類した。全行が処理目的・開始終了（不明はnull）・経過・分類・並行相手・再利用候補・証拠参照を持つ。記録件数は時間の構成比ではない。", "",
    "| 分類 | 主な対象 |", "|---|---|",
    "| 必須 | 素材取得、STT、候補・採用・保持・字幕・演出判断、成功土台、独立音声観測、背景、本体合成、固定保存 |",
    "| 外部待機 | 新GPU jobのキュー95分31.072秒。人間判断待ちは独立計時なし |",
    "| 失敗・再試行 | 旧jobのクライアント中断、初回土台、演出入力失敗、描画試行1/2、描画後の入力SHA失敗、QC保存失敗 |",
    "| 復旧 | QC証拠復元58分57.099秒、APFS圧縮、字幕000103限定診断、ツール同一性正規化を含む最終照合 |",
    "| 重複検証候補 | 全編再現encode、比較候補合成、入力/画像照合、媒体の複数scan/decode。**必須検査の省略許可ではない** |", "",
    "描画試行3は最後に失敗したが、最終MP4と全編再現一致検査を生成している。丸ごと失敗コストとして除かない。成功土台も名称は再試行だが、必要な土台生成1回として採用した。", "",
    "- STT外側呼出しと内側client、判断と結果検証、描画全体とencode、再現検査とそのencode、QC全体と比較生成を重複加算しない。",
    "- 全編decode15.368秒は全編再現encode中に完走。追加経過は計上しない。",
    "- QC中の圧縮は復旧かつ並行。QCへ足していない。",
    f"- 時刻付き工程・判断区間の和集合は {duration(covered)}。残る {duration(sum(g['elapsedSeconds'] for g in gaps))} は個別分類不能で、人間待ちやLLM思考へ推測配賦しない。", "",
    "## 正常参考の構成", "", "| 処理 | 参考への寄与 | 扱い |", "|---|---:|---|",
]
certainty_labels = {
    "measured-one-run": "成功1回分の実測", "mixed-clock-derived": "client/server時計から差引き",
    "measured-judgment-and-operation-interval": "判断・操作・検証を含む区間実測",
    "measured-duration-with-serial-dependency-assumption": "実測時間を直列に置く仮定",
    "observed-boundary-residual": "保存時刻の観測境界から差引き",
    "failure-containing-proxy": "失敗末尾を含む包括値の代用",
    "recovery-containing-proxy": "復旧処理を含む包括値の代用",
}
for value in terms:
    lines.append(f"| {value['purpose']} | {duration(value['contributionSeconds'])} | {certainty_labels[value['certainty']]} |")
lines += ["", "QC前は本体合成まで。配置・文字欠けなど描画に付随する事前検査は含み、全編再現検査・完成動画走査・字幕状態QC・最終照合・固定保存を後段に分けた。", "",
          f"元native QCの000103は不合格のまま。本素材の例外解決を含む完了経路の参考は限定診断・対応確認を加え {duration(normal + original[30]['elapsedSeconds'] + original[31]['elapsedSeconds'])}。これも包括値代用の参考であり、診断や元failureを消して正常合格へ書き換えていない。", "",
          "## ボトルネック上位（正常参考へのwall time寄与順）", "", "| 順位 | 処理 | 寄与 | 必須性・次の候補 |", "|---:|---|---:|---|"]
for value in ranked[:10]:
    lines.append(f"| {value['rank']} | {value['purpose']} | {duration(value['contributionSeconds'])} | 必須・省略不可。{value['implementationCandidate']} |")
lines += ["", "この順位は包括値の代用を含む。例えば最終照合48分24.893秒には復旧専用再読・正規化・GCが含まれ、正常validatorだけの順位とは断定できない。再利用可能とするには同一入力・版・ツール・時計・検査条件への束縛が必要。検査の削除・合格条件の変更は今回行わない。", "",
          "## 次の改善候補と今回の境界", "",
          "1. **今回14.8.1**: 共通判断資料の保存・再読重複を除く。同一validator判定を保ち、bytes・memory・保存/再読時間を別途実測する。",
          "2. **14.8.2候補**: 比較画像生成・RGB比較・保持のstream/chunk化。比較候補合成だけで424呼出し・5,483.758秒（QC親時間の内数）。今回着手しない。",
          "3. **14.9.1候補**: 本体合成5,116.859秒の局所化。全編再現のencode5,118.652秒は別の必須検査。今回は双方を維持する。",
          "4. 同じ媒体の複数scan/SHAには再利用余地があるが、各SHAの独立時間がなく、削減時間は未算出。検査境界を壊さない根拠が必要。",
          "5. STTの65分29.823秒をWhisper/時刻合わせへ分ける記録はない。旧jobの時間や係数から補完しない。STT変更は今回範囲外。", "",
          "## 再現と未計測", "",
          "再構成: `python3 evals/clip_composition/summarize_digest_timing_20260927.py`。書込み先は今回の timing-baseline 2ファイルだけ。既存timing・証拠・動画には書き込まない。", "",
          "未計測: 新jobの認識/時刻合わせ内訳、モデル単体の判断時間、個別の人間待ち、コード修正時間、SHA走査単独時間、保存失敗末尾、最終検証と復旧処理の切分け。未知値はnullとし、0秒へ読み替えない。", "",
          "測定環境のCPU・I/O競合、異常のない新規runでの並列成立は未検証。今回の参考値の差を、14.8.1による実測短縮量と混同しない。効果はQC証拠の同条件比較で報告する。", ""]
(REPORT / "timing-baseline.md").write_text("\n".join(lines))
print(json.dumps({"rows": len(rows), "normalReferenceSeconds": normal, "preQcReferenceSeconds": pre_qc,
                  "overallSeconds": overall["elapsedSeconds"], "unassignedSeconds": sum(g["elapsedSeconds"] for g in gaps)}, ensure_ascii=False))

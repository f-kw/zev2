"""Package completed evidence; no rendering, adoption or source edits."""
from pathlib import Path
import hashlib
import json
import os

work = Path(__file__).resolve().parent
repository = work.parents[4]
previous = work.with_name("work-candidate-selection-20260908-v001")


def read(p):
    return json.loads(p.read_text())


def relative(p):
    return str(p.relative_to(repository))


def sha_file(p):
    h = hashlib.sha256()
    with p.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def binding(p):
    if p.is_symlink():
        target = os.readlink(p)
        data = target.encode()
        resolved = p.resolve(strict=True)
        assert resolved.is_relative_to(repository)
        return {"path": relative(p), "kind": "symlink", "target": target, "bytes": len(data),
                "fileSha256": hashlib.sha256(data).hexdigest(), "resolvedFileSha256": sha_file(resolved),
                "resolvedBytes": resolved.stat().st_size}
    return {"path": relative(p), "kind": "file", "bytes": p.stat().st_size, "fileSha256": sha_file(p)}


names = ["evaluation-summary.json", "audit-evidence.json", "MANIFEST.json"]
assert all(not (work / name).exists() for name in names)
final = read(work / "final-verification.json")
independent = read(work / "final-independent-verification-v001.json")
provenance = read(work / "provenance-verification-v001.json")
preservation = read(work / "preservation-verification-final-v001.json")
ui = read(work / "review-ui-verification-v001.json")
for record in [final, independent, provenance, preservation, ui]:
    assert record["status"] == "passed"
assert final["humanQuality"] == "not-evaluated"
adoption = read(work / "machine-adoption.json")
result = read(work / "selection-result.json")
request = read(work / "selection-request.json")
preliminary = read(work / "verification.json")
repair = read(work / "caption-repair-equivalence.json")
before = read(work / "review-before-media-v001.json")
execution = read(repository / final["renderer"]["execution"]["path"])
assert execution["exitCode"] == 0 and execution["result"]["qc"]["status"] == "passed"
assert sha_file(repository / final["renderer"]["video"]["path"]) == final["renderer"]["video"]["fileSha256"]
summary = {
    "schemaVersion": "candidate-selection-evaluation-summary-v001", "instruction": "ZEV進行管理２ 指示-019",
    "technicalStatus": "passed", "humanQuality": "not-evaluated", "counts": final["counts"],
    "rejectedAsRedundant": preliminary["rejectedAsRedundant"], "rejectedAsWeak": preliminary["rejectedAsWeak"],
    "requiredRetained": preliminary["requiredRetained"], "decisions": result["answer"]["decisions"],
    "beforeFrames": 4831, "afterFrames": final["finalFrames"], "framesPerSecond": 30,
    "beforeDurationSeconds": 4831 / 30, "afterDurationSeconds": final["finalDurationSeconds"],
    "removedFrames": 4831 - final["finalFrames"], "formalCaptionCount": repair["formalCaptionCount"],
    "changeMeaning": "覗かれる場面と逃走・捕縛を残し、角度・時間差の振り返りと総評を外した。独自の解説を失う判断であり、完全な重複除去ではない。",
    "qualityLimitations": ["一候補群の限定実証。重複除去や必須文脈の維持を広く実証したとは扱わない。",
                           "採否は保存済み本文に基づく。冒頭の確認文は既存字幕補修で除外しており、理由の全発話が完成映像に存在することは保証しない。",
                           "短縮は改善の証明ではない。除外の妥当性、残した候補の強さ、文脈、見どころ、全体の改善は人間未判定。"],
    "newHumanSubtitleJudgment": False, "paidApiCalls": 0, "paidApiCostUsd": 0, "newMaterial": False,
    "video": final["renderer"]["video"], "review": ui, "tests": {"selection": 23, "integration": 6, "commonCaptionRepair": 47, "uniqueTotal": 76},
    "finalEntry": relative(work / "final-independent-verification-v001.json"),
}
evidence = {
    "schemaVersion": "candidate-selection-audit-evidence-v001", "instruction": summary["instruction"],
    "status": "passed", "humanQuality": "not-evaluated", "plan": read(work / "fixed-plan.json"),
    "candidateSet": read(work / "candidate-set.json"), "actualJudgmentInput": request["input"],
    "newJudgment": result, "validation": read(work / "selection-validation.json"), "machineAdoption": adoption,
    "provenanceVerification": provenance, "finalVerification": final, "independentVerification": independent,
    "knownCaptionRepairMapping": read(work / "caption-repair-mapping-proof.json"), "captionEquivalence": repair,
    "finalQc": {"status": execution["result"]["qc"]["status"], "violations": execution["result"]["qc"]["violations"],
                "observedMedia": execution["result"]["qc"]["mediaEvidence"]["observed"], "execution": final["renderer"]["execution"]},
    "typeFixProof": read(work / "type-fix-reexecution-proof-v001.json"),
    "judgmentReexecution": read(work / "judgment-reexecution-verification-v001.json"),
    "mediaAndDisplayReexecution": read(work / "media-display-reexecution-verification-v001.json"),
    "preservation": preservation, "reviewBeforeMedia": before, "reviewUi": ui, "qualityLimitations": summary["qualityLimitations"],
    "testEvidence": [binding(p) for p in [work / "unit-tests-v001.tap", work / "integration-tests-v001.tap",
                    previous / "common-caption-repair-tests-v001.tap", previous / "common-caption-repair-http-test-v002.tap"]],
    "commonTestAccounting": "46 non-HTTP tests passed; the HTTP test first hit local listen EPERM, then passed alone with 46 skipped. 47 distinct common tests passed.",
}
for name, record in zip(names[:2], [summary, evidence]):
    with (work / name).open("x") as stream:
        json.dump(record, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
sources = [repository / "runner/src/skills/candidate-selection-v001.ts"]
sources += [repository / "evals/clip_composition" / name for name in [
    "candidate_selection_validation_v001.mts", "run_candidate_selection_e2e_v001.mts",
    "candidate_selection_v001.test.mts", "candidate_selection_e2e_v001.test.mts",
    "verify_candidate_selection_e2e_v001.mts", "reuse_selected_caption_repairs_v001.mts",
    "resume_candidate_selection_renderer_v001.mts"]]
sources.append(repository / "docs/reports/candidate-selection-output-judgment-v001.md")
all_files = sources + [p for root in [previous, work] for p in root.rglob("*") if p.is_file() or p.is_symlink()]
assert not any(".presentation-renderer-v002-work-" in str(p) for p in work.rglob("*"))
rows = [binding(p) for p in sorted(set(all_files))]
manifest = {"schemaVersion": "candidate-selection-delivery-manifest-v001", "instruction": summary["instruction"],
            "finalRoot": relative(work), "supersededRoot": relative(previous), "humanQuality": "not-evaluated",
            "files": rows, "fileCountExcludingThisManifest": len(rows),
            "selfBinding": "This manifest is bound by the commit and the external Drive delivery manifest.",
            "commitBinding": "Recorded after commit in the external Drive delivery manifest; no self-referential SHA."}
with (work / "MANIFEST.json").open("x") as stream:
    json.dump(manifest, stream, ensure_ascii=False, indent=2)
    stream.write("\n")
stage_paths = sorted({row["path"] for row in rows} | {relative(work / "MANIFEST.json")})
Path("/tmp/zev019-owned-paths.nul").write_bytes(b"\0".join(p.encode() for p in stage_paths) + b"\0")
print(json.dumps({"status": "passed", "manifestFiles": len(rows), "stagePaths": len(stage_paths),
                  "manifestSha256": sha_file(work / "MANIFEST.json")}, ensure_ascii=False))

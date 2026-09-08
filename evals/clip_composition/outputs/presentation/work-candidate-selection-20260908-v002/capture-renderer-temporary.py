"""Capture complete process bytes before removing only this work's completed renderer scratch."""
from pathlib import Path
import base64
import hashlib
import json
import os
import shutil
import sys

work = Path(__file__).resolve().parent
repository = work.parents[4]
root = Path(sys.argv[1]).resolve()
verification_path = Path(sys.argv[2]).resolve()
label = sys.argv[3]
assert root in (work, work / "caption-repair-v001")
assert label in ("preliminary", "final")


def digest(p):
    value = hashlib.sha256()
    with p.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def relative(p):
    return str(p.relative_to(repository))


verification = json.loads(verification_path.read_text())
execution_binding = verification["renderer"]["execution"]
execution_path = repository / execution_binding["path"]
assert execution_path.parent == root
assert digest(execution_path) == execution_binding["fileSha256"]
execution = json.loads(execution_path.read_text())
assert execution["exitCode"] == 0
assert execution["result"]["qc"]["status"] == "passed"
assert execution["result"]["qc"]["violations"] == []
video = repository / verification["renderer"]["video"]["path"]
assert digest(video) == verification["renderer"]["video"]["fileSha256"]
formal = [p for p in (root / "render").rglob("*") if p.is_file()]
assert any(p.suffix == ".png" for p in formal)
retained = [{"path": relative(p), "bytes": p.stat().st_size, "fileSha256": digest(p)} for p in formal]
process = root / "process-observations"
records = []
for p in sorted(process.rglob("*")):
    if p.is_file():
        assert not p.is_symlink()
        data = p.read_bytes()
        records.append({"path": relative(p), "bytes": len(data), "fileSha256": hashlib.sha256(data).hexdigest(),
                        "base64": base64.b64encode(data).decode()})
assert records
scratch = list(root.glob(".render.presentation-renderer-v002-work-*"))
locks = list(root.glob(".render.presentation-renderer-v002.lock"))
assert len(scratch) == 1
inventory = []
for top in scratch + locks:
    for p in ([top] if top.is_file() else sorted(top.rglob("*"))):
        if p.is_symlink():
            inventory.append({"path": relative(p), "kind": "symlink", "target": os.readlink(p)})
        elif p.is_file():
            inventory.append({"path": relative(p), "bytes": p.stat().st_size, "fileSha256": digest(p)})
evidence = {"schemaVersion": "candidate-selection-renderer-temporary-evidence-v001",
            "status": "captured-before-cleanup", "rendererExecutionBinding": execution_binding,
            "processRecords": records, "scratchInventory": inventory, "retainedFormalFiles": retained,
            "scope": "Only completed renderer process logs and regenerable scratch in this output root."}
destination = work / f"{label}-renderer-temporary-evidence-v001.json"
with destination.open("x") as stream:
    json.dump(evidence, stream, ensure_ascii=False, indent=2)
    stream.write("\n")
saved = json.loads(destination.read_text())
assert len(saved["processRecords"]) == len(records)
for row in saved["processRecords"]:
    data = base64.b64decode(row["base64"])
    assert len(data) == row["bytes"] and hashlib.sha256(data).hexdigest() == row["fileSha256"]
for top in [process] + scratch + locks:
    if top.is_dir():
        shutil.rmtree(top)
    else:
        top.unlink()
for row in retained:
    assert digest(repository / row["path"]) == row["fileSha256"]
result = {"status": "passed", "processRecordCount": len(records), "scratchFileCount": len(inventory),
          "formalFileCount": len(retained), "evidencePath": relative(destination),
          "evidenceFileSha256": digest(destination), "formalOutputsPreserved": True}
with (work / f"{label}-renderer-cleanup-v001.json").open("x") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps(result))

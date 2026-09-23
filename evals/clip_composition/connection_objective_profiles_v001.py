#!/usr/bin/env python3
"""Assemble eleven factual connection profiles from pinned, existing evidence.

This research-only script uses the Python standard library, reads no media, and
performs no new image/audio measurement. It creates one new JSON document.
"""

import argparse
import copy
import datetime
import hashlib
import json
from pathlib import Path
import subprocess


CHECKPOINT = "543ec3356f5bf976a5378317c09249aac61bea0d"
TECHNICAL_REPORT = "docs/reports/digest-connection-technical-evidence-20260917.json"
PHYSICAL_REPORT = "docs/reports/digest-connection-physical-observation-20260917.md"
SCHEMA = "digest-connection-objective-profiles-research-v001"
SEGMENT_KEYS = (
    "segmentId", "sourceStartMs", "sourceEndMs", "sourceStartFrame30",
    "sourceEndFrame30", "outputStartFrame", "outputEndFrame",
)
RETAINED_KEYS = (
    "candidateId", "blockOrdinal", "sourceStartMs", "sourceEndMs", "segmentId",
)
SHARED_KEYS = (
    "connectionId", "inventoryConnectionId", "sourceId", "canonicalBoundaryFrame",
    "canonicalBoundarySeconds", "sourceGapNominalMilliseconds",
    "sourceGapLogicalFrames30", "captionCountChecked", "captionCrossingCount",
    "captionFreeFramesBeforeBoundary", "captionFreeFramesAfterBoundary",
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False)


def same_value(actual, expected, label):
    require(encoded(actual) == encoded(expected), f"{label}: input value changed")


class Sources:
    def __init__(self):
        self.records = {}

    def read(self, path, expected=None):
        path = Path(path)
        require(path.is_absolute(), f"absolute input path required: {path}")
        resolved = path.resolve(strict=True)
        require(resolved.is_file(), f"regular input file required: {path}")
        data = resolved.read_bytes()
        record = {"path": str(path), "resolvedPath": str(resolved),
                  "bytes": len(data), "sha256": sha256(data)}
        if expected is not None:
            for key in ("bytes", "sha256"):
                same_value(record[key], expected[key], f"{path} {key}")
        if str(path) in self.records:
            same_value(record, self.records[str(path)], f"{path} repeated read")
        self.records[str(path)] = record
        return data, copy.deepcopy(record)

    def unchanged(self):
        for before in list(self.records.values()):
            self.read(Path(before["path"]), expected=before)
        return len(self.records)


def pinned_report(repo, relative_path, sources):
    checkpoint_bytes = subprocess.run(
        ["git", "-C", str(repo), "show", f"{CHECKPOINT}:{relative_path}"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ).stdout
    data, binding = sources.read(repo / relative_path)
    require(data == checkpoint_bytes,
            f"working report differs from fixed checkpoint: {relative_path}")
    binding.update({"repositoryRelativePath": relative_path,
                    "checkpointCommit": CHECKPOINT,
                    "checkpointBytes": len(checkpoint_bytes),
                    "checkpointSha256": sha256(checkpoint_bytes),
                    "diskBytesEqualCheckpointBytes": True})
    return data, binding


def project_retained_side(side):
    return {
        "segment": {key: copy.deepcopy(side["segment"][key]) for key in SEGMENT_KEYS},
        "retainedRanges": [
            {key: copy.deepcopy(retained[key]) for key in RETAINED_KEYS}
            for retained in side["retainedRanges"]
        ],
    }


def make_profile(summary, structure, detail_references, report_binding, index):
    ordinal = index + 1
    require(summary["ordinal"] == ordinal, "connection ordinal/order differs")
    require(summary["connectionId"] == f"connection-{ordinal:02d}",
            "observation connection ID differs")
    require(summary["inventoryConnectionId"] == f"connection-{ordinal:04d}",
            "inventory connection ID differs")
    for key in SHARED_KEYS:
        same_value(structure[key], summary[key], f"{summary['connectionId']} {key}")
    for side in ("before", "after"):
        same_value(structure[side]["segment"]["segmentId"],
                   summary[f"{side}SegmentId"], f"{side} segment identity")
        require(len(structure[side]["prospectIds"]) == 1,
                "this fixed evidence requires one Prospect per retained segment")
        for retained in structure[side]["retainedRanges"]:
            require(retained["candidateId"] in structure[side]["prospectIds"],
                    "retained range Prospect differs")
            same_value(retained["segmentId"], summary[f"{side}SegmentId"],
                       "retained range segment identity")

    mapping = structure["sourceFrameMapping"]
    local_boundary = structure["localBoundaryFrame"]
    require(len(mapping) == summary["checkedFrames"] == 240,
            "full frame mapping does not contain the recorded 240 frames")
    require(local_boundary == 120, "recorded local boundary differs")
    boundary_mapping = {
        "immediatelyBefore": copy.deepcopy(mapping[local_boundary - 1]),
        "immediatelyAfter": copy.deepcopy(mapping[local_boundary]),
    }
    for name, offset, segment_key in (
            ("immediatelyBefore", -1, "beforeSegmentId"),
            ("immediatelyAfter", 0, "afterSegmentId")):
        entry = boundary_mapping[name]
        require(entry["excerptFrame"] == local_boundary + offset,
                "boundary mapping excerpt frame differs")
        require(entry["canonicalFrame"] == summary["canonicalBoundaryFrame"] + offset,
                "boundary mapping canonical frame differs")
        same_value(entry["segmentId"], summary[segment_key], "boundary mapping segment")
        same_value(entry["sourceId"], summary["sourceId"], "boundary mapping source")

    nearest_before = structure["nearestCaptionBefore"]
    nearest_after = structure["nearestCaptionAfter"]
    for nearest in (nearest_before, nearest_after):
        if nearest is not None:
            matches = [c for c in structure["captions"]
                       if c["captionId"] == nearest["captionId"]]
            require(len(matches) == 1, "nearest caption does not have one saved record")
            same_value(matches[0], nearest, "nearest caption copied from full records")
    before_ids = structure["before"]["prospectIds"]
    after_ids = structure["after"]["prospectIds"]
    structure_reference = next(
        r for r in detail_references if r["relativePath"].endswith("/connection-structure.json")
    )
    summary_reference = {
        "path": report_binding["path"], "bytes": report_binding["bytes"],
        "sha256": report_binding["sha256"],
        "jsonPointer": f"/allEleven/connections/{index}",
    }
    return {
        "ordinal": summary["ordinal"],
        "connectionId": summary["connectionId"],
        "inventoryConnectionId": summary["inventoryConnectionId"],
        "canonicalBoundaryFrame": summary["canonicalBoundaryFrame"],
        "canonicalBoundarySeconds": summary["canonicalBoundarySeconds"],
        "identityBinding": {
            "observationConnectionId": summary["connectionId"],
            "inventoryConnectionId": summary["inventoryConnectionId"],
            "beforeSegmentId": summary["beforeSegmentId"],
            "afterSegmentId": summary["afterSegmentId"],
            "canonicalBoundaryFrame": summary["canonicalBoundaryFrame"],
        },
        "prospectRelation": {
            "beforeProspectIds": copy.deepcopy(before_ids),
            "afterProspectIds": copy.deepcopy(after_ids),
            "relationship": "within-prospect" if before_ids == after_ids else "between-prospects",
        },
        "retainedBoundary": {
            "before": project_retained_side(structure["before"]),
            "after": project_retained_side(structure["after"]),
            "sourceId": structure["sourceId"],
            "sameSource": structure["sameSource"],
            "sourceContinuous": structure["sourceContinuous"],
            "observationFrames": copy.deepcopy(structure["observationFrames"]),
            "localBoundaryFrame": local_boundary,
            "sourceGapNominalMilliseconds": structure["sourceGapNominalMilliseconds"],
            "sourceGapLogicalFrames30": structure["sourceGapLogicalFrames30"],
            "boundaryFrameMappings": boundary_mapping,
            "mappingScope": structure["mappingScope"],
        },
        "captions": {
            "nearestBefore": copy.deepcopy(nearest_before),
            "nearestAfter": copy.deepcopy(nearest_after),
            "beforePresent": nearest_before is not None,
            "afterPresent": nearest_after is not None,
            "beforePresentMeaning": "A nearest caption before the boundary exists in the saved full plan.",
            "afterPresentMeaning": "A nearest caption after the boundary exists in the saved full plan.",
            "captionImmediatelyBeforeBoundary": (
                nearest_before is not None and structure["captionFreeFramesBeforeBoundary"] == 0),
            "captionImmediatelyAfterBoundary": (
                nearest_after is not None and structure["captionFreeFramesAfterBoundary"] == 0),
            "captionCountChecked": structure["captionCountChecked"],
            "captionCrossingCount": structure["captionCrossingCount"],
            "captionFreeFramesBeforeBoundary": structure["captionFreeFramesBeforeBoundary"],
            "captionFreeFramesAfterBoundary": structure["captionFreeFramesAfterBoundary"],
            "captionFreeIntervalMeaning": structure["captionFreeIntervalMeaning"],
        },
        "physicalSummary": copy.deepcopy(summary),
        "evidenceReferences": {
            "physicalSummary": summary_reference,
            "structure": copy.deepcopy(structure_reference),
            "fullFrameMappingJsonPointer": "/sourceFrameMapping",
            "fullCaptionRelationsJsonPointer": "/captions",
            "detailFiles": copy.deepcopy(detail_references),
        },
    }


def validate_profiles(profiles, connections, structures):
    require(len(profiles) == len(connections) == len(structures) == 11,
            "exactly eleven profiles are required")
    for profile, original, structure in zip(profiles, connections, structures):
        same_value(profile["physicalSummary"], original, "full physical summary")
        for side, caption_key in (("before", "nearestBefore"), ("after", "nearestAfter")):
            same_value(profile["retainedBoundary"][side],
                       project_retained_side(structure[side]), "retained factual fields")
            same_value(profile["captions"][caption_key],
                       structure[f"nearestCaption{side.title()}"], "nearest caption")
        local = structure["localBoundaryFrame"]
        same_value(profile["retainedBoundary"]["boundaryFrameMappings"]["immediatelyBefore"],
                   structure["sourceFrameMapping"][local - 1], "preceding frame/sample mapping")
        same_value(profile["retainedBoundary"]["boundaryFrameMappings"]["immediatelyAfter"],
                   structure["sourceFrameMapping"][local], "following frame/sample mapping")

    def reject_semantic_fields(value):
        if isinstance(value, dict):
            require(not ({"meaningRoles", "reason", "retentionReason", "hypothesis",
                          "humanObservation"} & set(value)), "semantic or human input field copied")
            for child in value.values():
                reject_semantic_fields(child)
        elif isinstance(value, list):
            for child in value:
                reject_semantic_fields(child)
    reject_semantic_fields(profiles)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--evidence-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    for path in (args.repo_root, args.evidence_root, args.output):
        require(path.is_absolute(), "all CLI paths must be absolute")
    require(not args.output.exists(), "output already exists; this script never overwrites")
    require(args.output.parent.is_dir(), "output parent must already exist")
    sources = Sources()
    raw_report, report_binding = pinned_report(args.repo_root, TECHNICAL_REPORT, sources)
    _, physical_report_binding = pinned_report(args.repo_root, PHYSICAL_REPORT, sources)
    _, script_binding = sources.read(Path(__file__).resolve(strict=True))
    report = json.loads(raw_report)
    all_eleven = report["allEleven"]
    require(all_eleven["status"] == "passed" and all_eleven["connectionCount"] == 11,
            "the pinned all-eleven evidence has a different status/count")
    index = report["allElevenEvidenceFiles"]
    require(len(index) == 139, "the pinned evidence index must contain 139 files")
    require(len({item["relativePath"] for item in index}) == 139,
            "the pinned evidence index contains duplicate paths")
    references = {}
    for item in index:
        relative = Path(item["relativePath"])
        require(not relative.is_absolute() and ".." not in relative.parts,
                "evidence index path must stay inside the supplied root")
        path = args.evidence_root / relative
        _, binding = sources.read(path, expected=item)
        binding["relativePath"] = item["relativePath"]
        references[item["relativePath"]] = binding

    connections = all_eleven["connections"]
    profiles, structures = [], []
    for i, summary in enumerate(connections):
        directory = summary["detailDirectory"]
        require(directory == f"connection-{i + 1:02d}", "detail directory differs")
        structure_key = f"{directory}/connection-structure.json"
        data, _ = sources.read(args.evidence_root / structure_key,
                               expected=references[structure_key])
        structure = json.loads(data)
        result_key = f"{directory}/connection-result.json"
        result_data, _ = sources.read(args.evidence_root / result_key,
                                      expected=references[result_key])
        same_value(json.loads(result_data)["summary"], summary,
                   "pinned report summary and original per-connection result")
        details = [r for key, r in references.items() if key.startswith(f"{directory}/")]
        require(len(details) == 12, "each existing connection has twelve detail files")
        profiles.append(make_profile(summary, structure, details, report_binding, i))
        structures.append(structure)
    validate_profiles(profiles, connections, structures)
    unchanged_count = sources.unchanged()
    output = {
        "schemaVersion": SCHEMA,
        "scope": "Factual consolidation of the fixed eleven existing connection records; no new measurements.",
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "baselineCommit": CHECKPOINT,
        "canonicalCompletionId": all_eleven["canonicalCompletionId"],
        "recordedCanonicalMediaIdentity": copy.deepcopy(all_eleven["canonicalMedia"]),
        "recordedOriginalSourceIdentity": copy.deepcopy(all_eleven["originalSourceIdentity"]),
        "recordedMediaIdentityScope": "Copied from pinned evidence; this consolidation does not read media files.",
        "sourceMappingScope": all_eleven["originalSourceMappingScope"],
        "frameAndSampleIntervals": "Start inclusive, end exclusive; values copied from existing evidence.",
        "prospectRelationMeaning": "Equality or difference of the stored Prospect IDs, not a semantic assessment.",
        "physicalSummaryCopyScope": "Complete original summary including its existing not-assessed fields; no verdict is added.",
        "profileCount": len(profiles),
        "profiles": profiles,
        "provenance": {
            "technicalEvidence": report_binding,
            "physicalObservationReport": physical_report_binding,
            "generator": script_binding,
            "physicalEvidenceIndexJsonPointer": "/allElevenEvidenceFiles",
            "physicalEvidenceRoot": str(args.evidence_root),
            "physicalEvidenceFiles": list(references.values()),
        },
        "validation": {
            "profileCount": len(profiles),
            "physicalSummariesExactlyEqualPinnedInput": len(profiles),
            "structureFilesMatchedPinnedIndex": len(structures),
            "allIndexedEvidenceFilesMatched": len(references),
            "nearestCaptionsAndBoundaryMappingsEqualOriginalRecords": len(profiles),
            "baselineReportFilesByteEqualCheckpoint": 2,
            "readInputFilesUnchanged": unchanged_count,
        },
    }
    serialized = json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    round_trip = json.loads(serialized)
    validate_profiles(round_trip["profiles"], connections, structures)
    with args.output.open("x", encoding="utf-8") as stream:
        stream.write(serialized)
    actual = args.output.read_bytes()
    require(actual == serialized.encode("utf-8"), "saved document bytes differ")
    validate_profiles(json.loads(actual)["profiles"], connections, structures)
    sources.unchanged()
    print(json.dumps({"status": "passed", "output": str(args.output),
                      "bytes": len(actual), "sha256": sha256(actual),
                      "validation": output["validation"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

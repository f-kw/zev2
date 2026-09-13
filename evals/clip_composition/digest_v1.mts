import assert from 'node:assert/strict';
import {
  bind, same, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

export type RetainedRangeV1 = {
  candidateId: string; segmentId: string; blockOrdinal: number;
  sourceStartMs: number; sourceEndMs: number; sourceSegmentIds: number[];
  [key: string]: unknown;
};
export type DigestRangeV1 = {
  segmentId: string; sourceStartMs: number; sourceEndMs: number;
  sourceSegmentIds: number[]; candidateIds: string[]; retainedRanges: RetainedRangeV1[];
};
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** A/B/Cの採否の後に使う固定処理。採否や保持位置をここで判断しない。 */
export function composeSelectedDigestRangesV1(
  candidateIds: readonly string[], adoptedIds: readonly string[],
  retained: readonly RetainedRangeV1[], transcript: readonly {id: number}[],
): DigestRangeV1[] {
  assert(candidateIds.length > 0 && new Set(candidateIds).size === candidateIds.length, 'DIGEST_CANDIDATE_IDS_INVALID');
  assert(adoptedIds.length > 0 && new Set(adoptedIds).size === adoptedIds.length
    && adoptedIds.every(id => candidateIds.includes(id)), 'DIGEST_ADOPTED_IDS_INVALID');
  const sourceOrder = new Map(transcript.map((s, i) => [s.id, i]));
  assert.equal(sourceOrder.size, transcript.length, 'DIGEST_TRANSCRIPT_IDS_DUPLICATED');
  const selected = new Set(adoptedIds);
  const ranges = retained.filter(r => selected.has(r.candidateId)).map(r => structuredClone(r));
  assert(adoptedIds.every(id => ranges.some(r => r.candidateId === id)), 'DIGEST_RETENTION_MISSING');
  for (const r of ranges) {
    assert(Number.isFinite(r.sourceStartMs) && Number.isFinite(r.sourceEndMs)
      && r.sourceStartMs >= 0 && r.sourceStartMs < r.sourceEndMs, 'DIGEST_RETAINED_RANGE_INVALID');
    assert(r.sourceSegmentIds.length > 0 && new Set(r.sourceSegmentIds).size === r.sourceSegmentIds.length,
      'DIGEST_RETAINED_SOURCE_IDS_INVALID');
    let previous = -1;
    for (const id of r.sourceSegmentIds) {
      const ordinal = sourceOrder.get(id);
      assert(ordinal !== undefined && ordinal > previous, 'DIGEST_RETAINED_SOURCE_ORDER_INVALID');
      previous = ordinal;
    }
  }
  // Prospect外端や候補入力順ではなく、保持後の実際の元素材時刻で整列する。
  ranges.sort((a, b) => a.sourceStartMs - b.sourceStartMs || a.sourceEndMs - b.sourceEndMs
    || compareId(a.candidateId, b.candidateId) || a.blockOrdinal - b.blockOrdinal
    || compareId(a.segmentId, b.segmentId));
  const groups: RetainedRangeV1[][] = [];
  let end = -1;
  for (const r of ranges) {
    // 半開区間の共通部分がある時だけ統合する。隙間も隣接境界も延長しない。
    if (groups.length && r.sourceStartMs < end) {
      groups.at(-1)!.push(r);
      end = Math.max(end, r.sourceEndMs);
    } else {groups.push([r]); end = r.sourceEndMs;}
  }
  return groups.map((group, i) => ({
    segmentId: `segment-${String(i + 1).padStart(4, '0')}`,
    sourceStartMs: group[0].sourceStartMs,
    sourceEndMs: Math.max(...group.map(r => r.sourceEndMs)),
    sourceSegmentIds: [...new Set(group.flatMap(r => r.sourceSegmentIds))]
      .sort((a, b) => sourceOrder.get(a)! - sourceOrder.get(b)!),
    candidateIds: [...new Set(group.map(r => r.candidateId))].sort(compareId),
    retainedRanges: group,
  }));
}

/** Cは一覧の全IDを渡すだけ。以後の製造にC専用の分岐を持ち込まない。 */
export function selectAllCandidatesV1(candidates: readonly {candidateId: string}[]) {
  const ids = candidates.map(c => c.candidateId);
  assert(ids.length > 0 && new Set(ids).size === ids.length, 'DIGEST_CANDIDATE_IDS_INVALID');
  return ids;
}

/** 保存済み表示区切りと音声同期の位置を、採用された保持区間へ投影する。
 * 分割・本文・時刻の新しい判断はしない。既存cueが途中で切れる場合は不足を返す。
 */
export function projectSavedDigestCaptionsV1(c: Json, adoption: Json, base: Json, saved: Json) {
  const {meaning: old, sourcePackage: oldSource, selection: oldSelection, bindings} = saved;
  assert.equal(old.captions.length, 1, 'DIGEST_CAPTION_SOURCE_COUNT_INVALID');
  assert.equal(oldSource.promptInput.captions.length, 1, 'DIGEST_CAPTION_SOURCE_COUNT_INVALID');
  assert.equal(oldSelection.response.captions.length, 1, 'DIGEST_CAPTION_SOURCE_COUNT_INVALID');
  const originalAtoms = new Map<string, Json>(old.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  const oldMap = oldSource.reconstructionMap.captions[0];
  const boundaryIndex = new Map<string, number>(oldMap.boundaries.map((b: Json, i: number) => [b.boundaryId, i]));
  const omitted = new Set<number>(saved.omittedSourceSegmentIds);
  const assigned = new Map<number, DigestRangeV1>();
  for (const segment of adoption.segments as DigestRangeV1[]) for (const id of segment.sourceSegmentIds) {
    assert(!assigned.has(id), 'DIGEST_SOURCE_ID_IN_SEPARATE_RANGES');
    assigned.set(id, segment);
  }
  const chosen: Array<{segment: DigestRangeV1; atoms: Json[]; cue: Json; ordinal: number}> = [];
  let first = 0;
  for (const [ordinal, cue] of oldSelection.response.captions[0].cues.entries()) {
    const last = boundaryIndex.get(cue.cueEndBoundaryId);
    assert(last !== undefined && last >= first, 'DIGEST_SAVED_CUE_ORDER_INVALID');
    const atoms = oldMap.boundaries.slice(first, last + 1).map((b: Json) => {
      const atom = originalAtoms.get(b.afterAtomOccurrenceId);
      assert(atom, 'DIGEST_SAVED_ATOM_MISSING'); return atom;
    });
    first = last + 1;
    const retainedAtoms = atoms.filter((a: Json) => assigned.has(a.sourceSegmentId));
    if (!retainedAtoms.length) continue;
    assert.equal(retainedAtoms.length, atoms.length, 'DIGEST_SAVED_DISPLAY_DOES_NOT_COVER_NEW_CUT');
    const segment = assigned.get(atoms[0].sourceSegmentId)!;
    assert(atoms.every((a: Json) => assigned.get(a.sourceSegmentId) === segment),
      'DIGEST_SAVED_CUE_CROSSES_NEW_CUT');
    for (const atom of atoms) {
      assert.equal(atom.retainedSpans.length, 1, 'DIGEST_SAVED_TIMING_AMBIGUOUS');
      const span = atom.retainedSpans[0];
      assert(span.sourceStartMs >= segment.sourceStartMs && span.sourceEndMs <= segment.sourceEndMs
        && span.sourceStartMs < span.sourceEndMs, 'DIGEST_SAVED_TIMING_OUTSIDE_RETAINED_RANGE');
    }
    chosen.push({segment, atoms, cue, ordinal});
  }
  assert.equal(first, oldMap.boundaries.length, 'DIGEST_SAVED_DISPLAY_INCOMPLETE');
  const rangeOrder = new Map(adoption.segments.map((s: Json, i: number) => [s.segmentId, i]));
  chosen.sort((a, b) => Number(rangeOrder.get(a.segment.segmentId)) - Number(rangeOrder.get(b.segment.segmentId))
    || a.atoms[0].retainedSpans[0].sourceStartMs - b.atoms[0].retainedSpans[0].sourceStartMs || a.ordinal - b.ordinal);
  const atoms: Json[] = [];
  const covered = new Set<number>();
  for (const row of chosen) for (const original of row.atoms) {
    assert(!covered.has(original.sourceSegmentId), 'DIGEST_CAPTION_SOURCE_DUPLICATED');
    covered.add(original.sourceSegmentId);
    const atom = structuredClone(original);
    atom.ordinal = atoms.length + 1;
    atom.retainedSpans[0].timelineSegmentId = row.segment.segmentId;
    atoms.push(atom);
  }
  for (const id of assigned.keys()) {
    assert(covered.has(id) || omitted.has(id), 'DIGEST_EXISTING_CAPTION_JUDGMENT_MISSING');
    assert(!(covered.has(id) && omitted.has(id)), 'DIGEST_CAPTION_OMISSION_CONFLICT');
  }
  assert(atoms.length > 0, 'DIGEST_NO_SAVED_CAPTIONS');
  const meaning = structuredClone(old);
  meaning.artifactId = `${c.plan.planId}-meaning`;
  meaning.originalMeaningBinding = bindings.meaning;
  meaning.machineAdoptionBinding = bind(`${c.plan.outputRoot}/machine-adoption.json`, adoption);
  meaning.atomOccurrences = atoms;
  meaning.orderedSegments = adoption.segments.map((s: Json) => ({candidateIds: s.candidateIds,
    timelineSegmentId: s.segmentId,
    atomOccurrenceIds: atoms.filter(a => a.retainedSpans[0].timelineSegmentId === s.segmentId).map(a => a.atomOccurrenceId)}));
  meaning.captions = [{...old.captions[0], text: atoms.map(a => a.text).join(''),
    atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}];
  const sourcePackage = structuredClone(oldSource);
  sourcePackage.packageId = `${c.plan.planId}-source-package`;
  const captionId = oldSource.promptInput.captions[0].captionId;
  const oldBoundaryForAtom = new Map(oldMap.boundaries.map((b: Json) => [b.afterAtomOccurrenceId, b.boundaryId]));
  const replacements = new Map<string, string>();
  const boundaries = atoms.map((a, i) => {
    const boundaryId = `${captionId}-boundary-${String(i + 1).padStart(6, '0')}`;
    replacements.set(String(oldBoundaryForAtom.get(a.atomOccurrenceId)), boundaryId);
    return {boundaryId, ordinal: i + 1, afterAtomOccurrenceId: a.atomOccurrenceId};
  });
  const meaningBinding = bind(`${c.plan.outputRoot}/meaning-input.json`, meaning);
  sourcePackage.promptInput.captions = [{captionId,
    boundaryCandidates: boundaries.map((b, i) => ({boundaryId: b.boundaryId, text: atoms[i].text}))}];
  const context = structuredClone(oldSource.reconstructionMap.caseContexts[0]);
  context.caseId = c.plan.planId; context.meaningPackageBinding = meaningBinding; context.baseMediaInput = base;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding],
    captions: [{...oldMap, atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId), boundaries}], caseContexts: [context]};
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: c.plan.implementationBindings.map((b: Json, i: number) => ({role: `digest-source-${i + 1}`, ...b})),
    approvedContractBindings: [c.plan.authorization]};
  const cues = chosen.map(row => ({cueEndBoundaryId: replacements.get(row.cue.cueEndBoundaryId),
    lineEndBoundaryIds: row.cue.lineEndBoundaryIds.map((id: string) => {
      const mapped = replacements.get(id); assert(mapped, 'DIGEST_SAVED_LINE_MISSING'); return mapped;
    })}));
  // 保存済みの1行・2行構成も新しい意味判断なしで保つ。
  assert(same(sourcePackage.promptInput.styleLimits, oldSource.promptInput.styleLimits));
  return {meaning, sourcePackage, traces: [{cues}],
    counts: {captionAtoms: atoms.length, captions: cues.length,
      explicitlyOmittedAtoms: [...assigned.keys()].filter(id => omitted.has(id)).length}};
}

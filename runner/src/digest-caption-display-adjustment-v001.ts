/** Pure, bound display-span derivation. This module grants no file, task, or manufacturing capability. */
import assert from 'node:assert/strict';

type Json = Record<string, any>;
export type DigestCaptionDisplayAdjustmentParametersV001 = {
  originalMeaning: Json; originalRows: Json[]; mappings: Json[]; sourceFrameClock: Json;
  declaredChanges: Json[];
  bindings: {originalMeaningBinding: Json; originalCandidateManifestBinding: Json;
    originalCorrespondenceBinding: Json; originalClockBinding: Json};
};
export type DigestCaptionDisplayAdjustmentValidationParametersV001 = DigestCaptionDisplayAdjustmentParametersV001 & {
  derivedMeaning: Json; candidateRows: Json[]; adoption: Json;
};
const TIMING = ['sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30',
  'startFrame', 'endFrameExclusive', 'displayFrameCount'];
const IDENTITY = ['groupOrdinal', 'candidateId', 'timelineSegmentId', 'captionId', 'atomOccurrenceIds',
  'sourceSegmentIds', 'semanticUtteranceIds'];
const INTERPRETATION = 'display-spans-only; original-STT-observations-retained';
const clone = <T>(value: T): T => structuredClone(value);
const obj = (value: any): Json => {assert(value && typeof value === 'object' && !Array.isArray(value), 'DISPLAY_ADJUSTMENT_OBJECT_REQUIRED'); return value;};
const rows = (value: any): Json[] => {assert(Array.isArray(value) && value.length && value.every(v => v && typeof v === 'object' && !Array.isArray(v)), 'DISPLAY_ADJUSTMENT_ROWS_REQUIRED'); return value;};
const exact = (value: Json, required: string[], optional: string[] = []) => {
  obj(value); assert(required.every(k => Object.hasOwn(value, k))
    && Object.keys(value).every(k => required.includes(k) || optional.includes(k)), 'DISPLAY_ADJUSTMENT_FIELDS_INVALID');
};
const integer = (value: any) => assert(Number.isSafeInteger(value) && value >= 0, 'DISPLAY_ADJUSTMENT_INTEGER_REQUIRED');
const ids = (value: any): string[] => {assert(Array.isArray(value) && value.length && value.every(v => typeof v === 'string' && v.length)
  && new Set(value).size === value.length, 'DISPLAY_ADJUSTMENT_ATOM_IDS_INVALID'); return value;};
const text = (row: Json): string => {
  const joined = rows(row.lines).map(line => {assert(typeof line.text === 'string' && line.text.length); return line.text;}).join('');
  if (Object.hasOwn(row, 'text')) assert.equal(row.text, joined, 'DISPLAY_ADJUSTMENT_ROW_TEXT_INVALID'); return joined;
};
const take = (value: Json, keys: string[]) => Object.fromEntries(keys.map(k => [k, value[k]]));
function binding(value: Json) {
  exact(value, ['path', 'fileSha256'], ['schemaVersion', 'canonicalSha256', 'sizeBytes']);
  assert(typeof value.path === 'string' && value.path.endsWith('.json') && !value.path.startsWith('/')
    && !value.path.includes('\\') && !value.path.includes('\0')
    && value.path.split('/').every((p: string) => p && p !== '.' && p !== '..'), 'DISPLAY_ADJUSTMENT_BINDING_PATH_INVALID');
  assert(/^[0-9a-f]{64}$/u.test(value.fileSha256), 'DISPLAY_ADJUSTMENT_BINDING_SHA_INVALID');
  if (value.canonicalSha256 !== undefined) assert(/^[0-9a-f]{64}$/u.test(value.canonicalSha256));
  if (value.schemaVersion !== undefined) assert(typeof value.schemaVersion === 'string' && value.schemaVersion.length);
  if (value.sizeBytes !== undefined) {integer(value.sizeBytes); assert(value.sizeBytes > 0);}
}
async function modules() {
  const frame = await import(new URL('../../evals/clip_composition/presentation_base_media_timeline_v004.mjs', import.meta.url).href);
  const formal = await import(new URL('../../evals/clip_composition/presentation_output_crop_application_v001.mjs', import.meta.url).href);
  return {frame, canonicalSha: formal.canonicalSha256PresentationOutputFiniteJsonV001 as (value: any) => string};
}

async function derive(params: DigestCaptionDisplayAdjustmentParametersV001) {
  const {frame, canonicalSha} = await modules(), original = obj(params.originalMeaning), originalRows = rows(params.originalRows);
  const mappings = rows(params.mappings), clock = obj(params.sourceFrameClock), changes = rows(params.declaredChanges);
  // Reject non-JSON/sparse/nonfinite inputs before cloning or making a proof digest.
  canonicalSha({original, originalRows, mappings, clock, changes, bindings: params.bindings});
  exact(params.bindings, ['originalMeaningBinding', 'originalCandidateManifestBinding', 'originalCorrespondenceBinding', 'originalClockBinding']);
  Object.values(params.bindings).forEach(binding);
  if (params.bindings.originalMeaningBinding.canonicalSha256 !== undefined)
    assert.equal(params.bindings.originalMeaningBinding.canonicalSha256, canonicalSha(original), 'DISPLAY_ADJUSTMENT_ORIGINAL_MEANING_BINDING_MISMATCH');
  assert(['30/1', '60/1'].includes(clock.inputFrameRate), 'DISPLAY_ADJUSTMENT_SOURCE_FRAME_CLOCK_INVALID');
  integer(clock.decodedFrameCount); assert(clock.decodedFrameCount > 0); integer(clock.videoPresentationOffsetMs);
  const atoms = rows(original.atomOccurrences), allIds = atoms.map(a => a.atomOccurrenceId); ids(allIds);
  const atomById = new Map(atoms.map(atom => [atom.atomOccurrenceId, atom]));
  const mappingById = new Map(mappings.map(m => [m.segmentId, m])); assert.equal(mappingById.size, mappings.length);
  for (const m of mappings) {
    assert(typeof m.segmentId === 'string' && m.segmentId.length);
    for (const key of ['sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame']) integer(m[key]);
    assert(m.sourceStartMs < m.sourceEndMs && m.outputStartFrame < m.outputEndFrame);
    assert.equal(frame.frameBoundaryWithVideoOffsetV001(m.sourceStartMs, clock.videoPresentationOffsetMs), m.sourceStartFrame30);
    assert.equal(frame.sourceEndFrameBoundaryWithVideoOffsetV001(m.sourceEndMs, clock), m.sourceEndFrame30);
    assert.equal(m.outputEndFrame - m.outputStartFrame, m.sourceEndFrame30 - m.sourceStartFrame30);
  }
  assert.deepEqual(originalRows.flatMap(r => ids(r.atomOccurrenceIds)), allIds, 'DISPLAY_ADJUSTMENT_ORIGINAL_ATOM_COVERAGE_INVALID');
  const timing = (segmentId: string, sourceStartMs: number, sourceEndMs: number) => {
    const m = mappingById.get(segmentId); assert(m, 'DISPLAY_ADJUSTMENT_MAPPING_MISSING');
    integer(sourceStartMs); integer(sourceEndMs);
    assert(sourceStartMs >= m.sourceStartMs && sourceEndMs <= m.sourceEndMs && sourceEndMs > sourceStartMs, 'DISPLAY_ADJUSTMENT_SOURCE_RANGE_INVALID');
    const sourceStartFrame30 = frame.frameBoundaryWithVideoOffsetV001(sourceStartMs, clock.videoPresentationOffsetMs);
    const sourceEndFrame30 = frame.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, clock);
    integer(sourceStartFrame30); integer(sourceEndFrame30);
    const startFrame = m.outputStartFrame + sourceStartFrame30 - m.sourceStartFrame30;
    const endFrameExclusive = m.outputStartFrame + sourceEndFrame30 - m.sourceStartFrame30;
    assert(startFrame >= m.outputStartFrame && endFrameExclusive <= m.outputEndFrame && endFrameExclusive > startFrame, 'DISPLAY_ADJUSTMENT_FRAME_RANGE_INVALID');
    return {sourceStartMs, sourceEndMs, sourceStartFrame30, sourceEndFrame30, startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame};
  };
  const cueFromAtoms = (row: Json, rowAtoms: Json[]) => {
    assert(rowAtoms.length && rowAtoms.every(a => Array.isArray(a.retainedSpans) && a.retainedSpans.length === 1));
    const spans = rowAtoms.map(a => a.retainedSpans[0]);
    assert(spans.every((s, i) => s.timelineSegmentId === row.timelineSegmentId && s.sourceStartMs < s.sourceEndMs
      && (!i || (s.sourceStartMs >= spans[i - 1].sourceStartMs && s.sourceEndMs >= spans[i - 1].sourceEndMs))), 'DISPLAY_ADJUSTMENT_ATOM_SPANS_INVALID');
    const result = {groupOrdinal: row.groupOrdinal, candidateId: row.candidateId, timelineSegmentId: row.timelineSegmentId,
      captionId: row.captionId, atomOccurrenceIds: rowAtoms.map(a => a.atomOccurrenceId), sourceSegmentIds: rowAtoms.map(a => a.sourceSegmentId),
      semanticUtteranceIds: [...new Set(rowAtoms.map(a => a.semanticUtteranceId))], text: rowAtoms.map(a => a.text).join(''),
      ...timing(row.timelineSegmentId, spans[0].sourceStartMs, spans.at(-1).sourceEndMs)};
    assert(rowAtoms.every(a => typeof a.text === 'string' && a.text.length), 'DISPLAY_ADJUSTMENT_ATOM_TEXT_INVALID'); return result;
  };
  let previousFrameEnd = -1; const previousSourceEnds = new Map<string, number>();
  const nonoverlap = (cue: Json) => {
    assert(cue.startFrame >= previousFrameEnd, 'DISPLAY_ADJUSTMENT_OVERLAP'); previousFrameEnd = cue.endFrameExclusive;
    assert(cue.sourceStartMs >= (previousSourceEnds.get(cue.timelineSegmentId) ?? -1), 'DISPLAY_ADJUSTMENT_SOURCE_OVERLAP');
    previousSourceEnds.set(cue.timelineSegmentId, cue.sourceEndMs);
  };
  for (const row of originalRows) {
    const cue = cueFromAtoms(row, row.atomOccurrenceIds.map((id: string) => atomById.get(id)!));
    assert.deepEqual(take(row, [...IDENTITY, ...TIMING]), take(cue, [...IDENTITY, ...TIMING]), 'DISPLAY_ADJUSTMENT_ORIGINAL_ROW_INVALID');
    assert.equal(text(row), cue.text, 'DISPLAY_ADJUSTMENT_ORIGINAL_TEXT_INVALID'); nonoverlap(cue);
  }
  const chooseMs = (m: Json, outputFrame: number, supplied: any) => {
    integer(outputFrame); assert(outputFrame >= m.outputStartFrame && outputFrame <= m.outputEndFrame, 'DISPLAY_ADJUSTMENT_WINDOW_INVALID');
    // At adopted segment edges use the already qualified exact source edge.
    const edge = outputFrame === m.outputStartFrame ? m.sourceStartMs : outputFrame === m.outputEndFrame ? m.sourceEndMs : undefined;
    const starts = originalRows.filter(r => r.timelineSegmentId === m.segmentId && r.startFrame === outputFrame).map(r => r.sourceStartMs);
    const ends = originalRows.filter(r => r.timelineSegmentId === m.segmentId && r.endFrameExclusive === outputFrame).map(r => r.sourceEndMs);
    const anchors = edge === undefined ? [...starts, ...ends] : [edge];
    const inverse = Math.round((m.sourceStartFrame30 + outputFrame - m.outputStartFrame) * 1000 / 30 + clock.videoPresentationOffsetMs);
    const value = supplied === undefined ? anchors[0] ?? inverse : supplied; integer(value);
    assert(anchors.length ? anchors.includes(value) : value === inverse, 'DISPLAY_ADJUSTMENT_MS_ANCHOR_INVALID'); return value;
  };
  const derivedMeaning = clone(original), derivedAtoms = new Map<string, Json>(derivedMeaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  const replacements = new Map<number, {count: number; cues: Json[]}>(), derivedCues: Json[] = [];
  let previousChangeEnd = -1; const changeIds = new Set<string>();
  for (const change of changes) {
    exact(change, ['changeId', 'kind', 'timelineSegmentId', 'from', 'to']);
    assert(typeof change.changeId === 'string' && change.changeId.length && !changeIds.has(change.changeId)); changeIds.add(change.changeId);
    assert(['display-span', 'merge-only'].includes(change.kind), 'DISPLAY_ADJUSTMENT_KIND_INVALID');
    const from = rows(change.from), to = rows(change.to), first = ids(from[0].atomOccurrenceIds)[0];
    const index = originalRows.findIndex(r => r.atomOccurrenceIds[0] === first);
    assert(index > previousChangeEnd, 'DISPLAY_ADJUSTMENT_CHANGE_ORDER_INVALID'); previousChangeEnd = index + from.length - 1;
    assert.deepEqual(originalRows.slice(index, index + from.length), from, 'DISPLAY_ADJUSTMENT_FROM_ROW_MISMATCH');
    const base = from[0], m = mappingById.get(change.timelineSegmentId); assert(m);
    assert(from.every(r => r.timelineSegmentId === change.timelineSegmentId && r.groupOrdinal === base.groupOrdinal
      && r.candidateId === base.candidateId && r.captionId === base.captionId), 'DISPLAY_ADJUSTMENT_GROUP_CHANGED');
    assert.deepEqual(to.flatMap(t => ids(t.atomOccurrenceIds)), from.flatMap(r => r.atomOccurrenceIds), 'DISPLAY_ADJUSTMENT_TARGET_COVERAGE_INVALID');
    const before = originalRows[index - 1], after = originalRows[index + from.length];
    const windowStart = before?.timelineSegmentId === m.segmentId ? before.endFrameExclusive : m.outputStartFrame;
    const windowEnd = after?.timelineSegmentId === m.segmentId ? after.startFrame : m.outputEndFrame;
    const next: Json[] = [];
    for (const target of to) {
      exact(target, ['atomOccurrenceIds', 'startFrame', 'endFrameExclusive'], ['sourceStartMs', 'sourceEndMs']);
      integer(target.startFrame); integer(target.endFrameExclusive);
      assert(target.startFrame >= windowStart && target.endFrameExclusive <= windowEnd && target.endFrameExclusive > target.startFrame, 'DISPLAY_ADJUSTMENT_WINDOW_INVALID');
      const targetAtoms = target.atomOccurrenceIds.map((id: string) => derivedAtoms.get(id)!);
      if (change.kind === 'display-span') {
        const sourceStartMs = chooseMs(m, target.startFrame, target.sourceStartMs), sourceEndMs = chooseMs(m, target.endFrameExclusive, target.sourceEndMs);
        const mapped = timing(m.segmentId, sourceStartMs, sourceEndMs);
        assert.equal(mapped.startFrame, target.startFrame, 'DISPLAY_ADJUSTMENT_FRAME_ROUNDTRIP_INVALID');
        assert.equal(mapped.endFrameExclusive, target.endFrameExclusive, 'DISPLAY_ADJUSTMENT_FRAME_ROUNDTRIP_INVALID');
        for (const atom of targetAtoms) atom.retainedSpans = [{timelineSegmentId: m.segmentId, sourceStartMs, sourceEndMs}];
      }
      const cue = cueFromAtoms(base, targetAtoms);
      assert.equal(cue.startFrame, target.startFrame, 'DISPLAY_ADJUSTMENT_FRAME_ROUNDTRIP_INVALID');
      assert.equal(cue.endFrameExclusive, target.endFrameExclusive, 'DISPLAY_ADJUSTMENT_FRAME_ROUNDTRIP_INVALID');
      if (target.sourceStartMs !== undefined) assert.equal(cue.sourceStartMs, target.sourceStartMs, 'DISPLAY_ADJUSTMENT_MERGE_SPAN_CHANGED');
      if (target.sourceEndMs !== undefined) assert.equal(cue.sourceEndMs, target.sourceEndMs, 'DISPLAY_ADJUSTMENT_MERGE_SPAN_CHANGED');
      next.push(cue); derivedCues.push({changeId: change.changeId, kind: change.kind, ...clone(cue)});
    }
    replacements.set(index, {count: from.length, cues: next});
  }
  const expectedRows: {cue: Json; originalRow?: Json}[] = [];
  for (let i = 0; i < originalRows.length;) {
    const replacement = replacements.get(i);
    if (replacement) {replacement.cues.forEach(cue => {
      const originalRow = originalRows.slice(i, i + replacement.count).find(row =>
        row.atomOccurrenceIds.length === cue.atomOccurrenceIds.length && row.atomOccurrenceIds.every((id: string, j: number) => id === cue.atomOccurrenceIds[j]));
      expectedRows.push({cue, originalRow});
    }); i += replacement.count;}
    else {const row = originalRows[i++]; expectedRows.push({cue: cueFromAtoms(row, row.atomOccurrenceIds.map((id: string) => derivedAtoms.get(id)!)), originalRow: row});}
  }
  previousFrameEnd = -1; previousSourceEnds.clear(); expectedRows.forEach(({cue}) => nonoverlap(cue));
  const adoption = {schemaVersion: 'digest-caption-display-adjustment-v001', bindings: clone(params.bindings),
    originalMeaningCanonicalSha256: canonicalSha(original), originalRowsCanonicalSha256: canonicalSha(originalRows),
    mappingsCanonicalSha256: canonicalSha(mappings), sourceFrameClockCanonicalSha256: canonicalSha(clock),
    declaredChanges: clone(changes), derivedMeaningCanonicalSha256: canonicalSha(derivedMeaning), derivedCues,
    timingInterpretation: INTERPRETATION};
  return {derivedMeaning, adoption, expectedRows};
}

/** Deterministic JSON values only; the caller must independently qualify the source file bindings. */
export async function buildDigestCaptionDisplayAdjustmentV001(params: DigestCaptionDisplayAdjustmentParametersV001) {
  const {derivedMeaning, adoption} = await derive(params); return {derivedMeaning, adoption};
}

/** Re-derive instead of trusting a saved adoption, cloned meaning, or proposed display correspondence. */
export async function assertDigestCaptionDisplayAdjustmentV001(params: DigestCaptionDisplayAdjustmentValidationParametersV001): Promise<void> {
  const expected = await derive(params);
  assert.deepEqual(params.adoption, expected.adoption, 'DISPLAY_ADJUSTMENT_ADOPTION_MISMATCH');
  assert.deepEqual(params.derivedMeaning, expected.derivedMeaning, 'DISPLAY_ADJUSTMENT_MEANING_MISMATCH');
  const candidateRows = rows(params.candidateRows);
  assert.equal(candidateRows.length, expected.expectedRows.length, 'DISPLAY_ADJUSTMENT_CANDIDATE_COUNT_INVALID');
  for (const [i, row] of candidateRows.entries()) {
    const {cue, originalRow} = expected.expectedRows[i];
    assert.deepEqual(take(row, [...IDENTITY, ...TIMING]), take(cue, [...IDENTITY, ...TIMING]), 'DISPLAY_ADJUSTMENT_CANDIDATE_ROW_MISMATCH');
    assert.equal(text(row), cue.text, 'DISPLAY_ADJUSTMENT_CANDIDATE_TEXT_MISMATCH');
    // Renumbered cue/instruction IDs and fresh geometry are checked by the normal reader, not treated as text edits.
    if (originalRow) for (const key of ['cueEndBoundaryId', 'lineEndBoundaryIds', 'lines'])
      assert.deepEqual(row[key], originalRow[key], 'DISPLAY_ADJUSTMENT_NON_TARGET_ROW_CHANGED');
  }
}

import assert from 'node:assert/strict';

type Json = Record<string, any>;
/** Match by complete ordered text coverage; never search repeated words or interpolate token interiors. */
export function validateAcousticChunkV001(chunk: Json, observation: Json) {
  assert.equal(observation.chunkIndex, chunk.index, 'CHUNK_ID_MISMATCH');
  assert.equal(chunk.atoms.map((a: Json) => a.text).join(''), chunk.text, 'SOURCE_TEXT_MISMATCH');
  assert.equal(new Set(chunk.atoms.map((a: Json) => a.sourceSegmentId)).size, chunk.atoms.length, 'SOURCE_ID_DUPLICATE');
  assert.equal(observation.words.map((w: Json) => w.word).join(''), chunk.text, 'OBSERVED_TEXT_MISMATCH');
  assert.deepEqual(observation.words.flatMap((w: Json) => w.tokens), observation.textTokens, 'TOKEN_COVERAGE_MISMATCH');
  assert.equal(observation.audioSamples / observation.sampleRate * 1000, chunk.endMs - chunk.startMs, 'AUDIO_DURATION_MISMATCH');
  const sourceBoundaries = new Map<number, {before: number | null; after: number | null}>();
  let offset = 0;
  sourceBoundaries.set(0, {before: null, after: chunk.atoms[0].sourceSegmentId});
  for (const [i, a] of chunk.atoms.entries()) {
    assert(Number.isSafeInteger(a.sourceSegmentId) && a.sourceSegmentId > 0 && typeof a.text === 'string' && a.text.length > 0);
    if (i) assert(a.sourceSegmentId === chunk.atoms[i - 1].sourceSegmentId + 1, 'SOURCE_ID_ORDER_INVALID');
    offset += [...a.text].length;
    sourceBoundaries.set(offset, {before: a.sourceSegmentId, after: chunk.atoms[i + 1]?.sourceSegmentId ?? null});
  }
  let position = 0, priorEnd = 0;
  const units = observation.words.map((word: Json, i: number) => {
    assert(typeof word.word === 'string' && word.word.length > 0 && Array.isArray(word.tokens) && word.tokens.length > 0);
    assert(Number.isFinite(word.start) && Number.isFinite(word.end) && Number.isFinite(word.probability));
    assert(word.start >= priorEnd && word.end >= word.start && word.end * 1000 <= chunk.endMs - chunk.startMs, 'ACOUSTIC_TIME_ORDER_INVALID');
    priorEnd = word.end;
    const startOffset = position;
    position += [...word.word].length;
    const first = sourceBoundaries.get(startOffset), last = sourceBoundaries.get(position);
    const sourceSegmentIds = first?.after !== null && first?.after !== undefined && last?.before !== null && last?.before !== undefined
      ? chunk.atoms.filter((a: Json) => a.sourceSegmentId >= first.after! && a.sourceSegmentId <= last.before!).map((a: Json) => a.sourceSegmentId) : [];
    return {unitId: `chunk-${chunk.index}-unit-${i + 1}`, text: word.word, sourceSegmentIds,
      startBoundary: first ?? null, endBoundary: last ?? null,
      startTimeRole: i === 0 && word.start === 0 ? 'alignment-window-origin-not-speech-onset' : 'acoustic-token-boundary',
      startMs: chunk.startMs + Math.round(word.start * 1000), endMs: chunk.startMs + Math.round(word.end * 1000),
      timeOrigin: 'fixed-text-acoustic-token-group', individualCharacterTimes: 'not-observed'};
  });
  return {chunkIndex: chunk.index, textAndTokenCoverage: 'exact', sourceIds: 'exact-ordered', units};
}

/** Resolve each endpoint independently. Unknown onset does not invalidate an independently measured offset. */
export function resolveAcousticCueV001(sourceSegmentIds: number[], chunks: Json[], sourceInterval: Json, original?: Json) {
  assert(sourceSegmentIds.length > 0 && new Set(sourceSegmentIds).size === sourceSegmentIds.length);
  assert(sourceSegmentIds.every((id, i) => i === 0 || id === sourceSegmentIds[i - 1] + 1), 'CUE_ID_ORDER_INVALID');
  const units = chunks.flatMap(c => c.units);
  const start = units.filter(u => u.startBoundary?.after === sourceSegmentIds[0]);
  const end = units.filter(u => u.endBoundary?.before === sourceSegmentIds.at(-1));
  const first = start.length === 1 ? start[0] : null, last = end.length === 1 ? end[0] : null;
  const endpoint = (unit: Json | null, side: 'start' | 'end') => {
    if (!unit) return {status: 'unresolved', reason: 'cue-boundary-inside-acoustic-token-or-not-unique'};
    if (side === 'start' && unit.startTimeRole === 'alignment-window-origin-not-speech-onset') return {status: 'unresolved', reason: 'window-origin-does-not-observe-speech-onset'};
    const measured = unit[`${side}Ms`];
    if ((side === 'start' && measured >= sourceInterval.sourceEndMs) || (side === 'end' && measured <= sourceInterval.sourceStartMs)) {
      return {status: 'unresolved', reason: 'acoustic-endpoint-outside-retained-media', observedMs: measured, unitId: unit.unitId};
    }
    return {status: 'resolved', unitId: unit.unitId, observedMs: measured,
      sourceMs: side === 'start' ? Math.max(measured, sourceInterval.sourceStartMs) : Math.min(measured, sourceInterval.sourceEndMs)};
  };
  const startResolution = endpoint(first, 'start'), endResolution = endpoint(last, 'end');
  if (first && last && first.startMs >= last.endMs) return {status: 'unresolved', reason: 'nonpositive-acoustic-cue-interval', sourceSegmentIds};
  // If the complete observed cue is outside the fixed media, neither endpoint is eligible.
  if (first && last && (last.endMs <= sourceInterval.sourceStartMs || first.startMs >= sourceInterval.sourceEndMs)) {
    return {status: 'unresolved', reason: 'acoustic-cue-outside-retained-media', sourceSegmentIds};
  }
  const sourceStartMs = startResolution.status === 'resolved' ? startResolution.sourceMs : original?.sourceStartMs;
  const sourceEndMs = endResolution.status === 'resolved' ? endResolution.sourceMs : original?.sourceEndMs;
  const status = startResolution.status === 'resolved' && endResolution.status === 'resolved' ? 'resolved'
    : startResolution.status === 'resolved' || endResolution.status === 'resolved' ? 'partial' : 'unresolved';
  return {status, sourceSegmentIds, startResolution, endResolution,
    sourceStartMs, sourceEndMs, observedStartMs: first?.startMs, observedEndMs: last?.endMs,
    intersectionWithUnchangedComposition: (startResolution.status === 'resolved' && sourceStartMs !== first?.startMs)
      || (endResolution.status === 'resolved' && sourceEndMs !== last?.endMs)};
}

/** Keep only the conflicting endpoint unresolved; never invent a shared boundary or discard unrelated observations. */
export function retainUnresolvedTimingV001(cues: Json[]) {
  const result = structuredClone(cues);
  for (const c of result) {
    c.resolution.startResolution ??= {status: 'unresolved', reason: c.resolution.reason};
    c.resolution.endResolution ??= {status: 'unresolved', reason: c.resolution.reason};
    c.resolution.sourceStartMs ??= c.oldStartMs;
    c.resolution.sourceEndMs ??= c.oldEndMs;
  }
  const revert = (c: Json, side: 'start' | 'end', reason: string) => {
    const key = `${side}Resolution`, r = c.resolution;
    assert.equal(r[key].status, 'resolved', 'UNRESOLVED_ENDPOINT_CANNOT_BE_REVERTED');
    r[key] = {status: 'unresolved', reason, notPromotedObservation: r[key]};
    r[side === 'start' ? 'sourceStartMs' : 'sourceEndMs'] = c[side === 'start' ? 'oldStartMs' : 'oldEndMs'];
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of result) {
      if (c.resolution.sourceStartMs < c.resolution.sourceEndMs) continue;
      const corrected = (['start', 'end'] as const).filter(s => c.resolution[`${s}Resolution`].status === 'resolved');
      assert(corrected.length, 'ORIGINAL_CUE_NONPOSITIVE');
      for (const side of corrected) revert(c, side, 'corrected-endpoint-conflicts-with-unresolved-other-endpoint');
      changed = true;
    }
    for (let i = 1; i < result.length; i++) {
      const a = result[i - 1], b = result[i];
      if (a.timelineSegmentId !== b.timelineSegmentId) continue;
      const end = a.resolution.sourceEndMs, start = b.resolution.sourceStartMs;
      if (end <= start) continue;
      const corrected = [[a, 'end'], [b, 'start']].filter(([c, side]) => (c as Json).resolution[`${side}Resolution`].status === 'resolved') as [Json, 'start' | 'end'][];
      assert(corrected.length < 2, 'OBSERVED_CUES_OVERLAP');
      assert(corrected.length, 'ORIGINAL_CUES_OVERLAP');
      for (const [c, side] of corrected) {
        revert(c, side, 'corrected-endpoint-conflicts-with-adjacent-unresolved-endpoint');
        changed = true;
      }
    }
  }
  for (const c of result) {
    const count = ['startResolution', 'endResolution'].filter(k => c.resolution[k].status === 'resolved').length;
    c.resolution.status = count === 2 ? 'resolved' : count === 1 ? 'partial' : 'unresolved';
    c.changes = {startMs: c.resolution.sourceStartMs - c.oldStartMs, endMs: c.resolution.sourceEndMs - c.oldEndMs};
  }
  return result;
}

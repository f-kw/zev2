import assert from 'node:assert/strict';
import {
  assertInternalRetentionInputV001, assertInternalRetentionResultV001,
  type InternalRetentionInputV001,
} from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {same, keys, sha, formal, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const validated = new WeakMap<object, Json>();
export type ValidatedInternalRetention = Readonly<{status: 'validated-internal-retention-ids'}>;

/** 時刻を受け取らない段階で、本文全体の所属・順序・保持/削除の明示を閉じる。 */
export function validateInternalRetentionIdsV001(input: InternalRetentionInputV001, result: unknown): ValidatedInternalRetention {
  assertInternalRetentionInputV001(input);
  assertInternalRetentionResultV001(result);
  const answer = result.answer as Json;
  assert.equal(answer.status, 'complete', 'INTERNAL_RETENTION_ABSTAINED');
  assert.deepEqual(answer.candidates.map((c: Json) => c.candidateId), input.candidates.map(c => c.candidateId), 'CANDIDATE_MEMBERSHIP_OR_ORDER_CHANGED');
  const candidates = input.candidates.map((candidate, i) => {
    const atoms = candidate.utterances.flatMap(u => u.atoms), chosen = answer.candidates[i];
    const index = new Map(atoms.map((a, j) => [a.sourceSegmentId, j]));
    let next = 0, kept = 0;
    const blocks = chosen.blocks.map((b: Json, j: number) => {
      const first = index.get(b.startSourceSegmentId), last = index.get(b.endSourceSegmentId);
      assert(first !== undefined && last !== undefined, 'SOURCE_ID_OUTSIDE_ADOPTED_CANDIDATE');
      assert.equal(first, next, 'RETENTION_GAP_OVERLAP_OR_ORDER_INVALID');
      assert(last >= first, 'RETENTION_REVERSED_RANGE');
      next = last + 1;
      if (b.action === 'keep') kept++;
      const included = atoms.slice(first, last + 1);
      return {...structuredClone(b), blockOrdinal: j + 1, sourceSegmentIds: included.map(a => a.sourceSegmentId),
        text: included.map(a => a.text).join('')};
    });
    assert.equal(next, atoms.length, 'FULL_SOURCE_TEXT_ACCOUNTING_REQUIRED');
    assert(kept > 0, 'ADOPTED_CANDIDATE_CANNOT_BE_DROPPED');
    return {candidateId: candidate.candidateId, meaningPreserved: chosen.meaningPreserved, blocks};
  });
  const token = Object.freeze({status: 'validated-internal-retention-ids' as const});
  validated.set(token, structuredClone({input, result, candidates}));
  return token;
}
export function validateInternalRetentionProvenanceV001(request: Json, response: Json, result: Json,
  expectedInput: InternalRetentionInputV001) {
  assert(same(request.input, expectedInput), 'INTERNAL_RETENTION_REQUEST_CHANGED');
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-internal-retention-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim().length > 0,
  'INTERNAL_RETENTION_PROVENANCE_MISMATCH');
  return validateInternalRetentionIdsV001(expectedInput, result);
}

/** 新しく切る位置は選ばれたID境界の一意な観測そのもの。補間・近傍探索・clipはしない。 */
export function resolveInternalCutEndpointV001(sourceSegmentId: number, side: 'start' | 'end', parent: Json, chunks: Json[]) {
  assert(parent.sourceSegmentIds.includes(sourceSegmentId), 'CUT_ID_OUTSIDE_PARENT');
  if (sourceSegmentId === (side === 'start' ? parent.sourceSegmentIds[0] : parent.sourceSegmentIds.at(-1))) {
    return {status: 'inherited-parent-edge', sourceSegmentId, side,
      sourceMs: parent.sourceInterval[side === 'start' ? 'sourceStartMs' : 'sourceEndMs'],
      observation: '旧候補外端を継承・音響補正未適用'};
  }
  const units = chunks.flatMap(c => c.units).filter(u => side === 'start'
    ? u.startBoundary?.after === sourceSegmentId : u.endBoundary?.before === sourceSegmentId);
  if (units.length !== 1) return {status: 'unresolved', sourceSegmentId, side, reason: 'boundary-inside-token-or-not-unique'};
  const u = units[0], ms = u[`${side}Ms`];
  if (side === 'start' && u.startTimeRole === 'alignment-window-origin-not-speech-onset')
    return {status: 'unresolved', sourceSegmentId, side, reason: 'window-origin-is-not-speech-onset'};
  if (!(u.startMs < u.endMs) || !Number.isFinite(ms)
    || ms <= parent.sourceInterval.sourceStartMs || ms >= parent.sourceInterval.sourceEndMs)
    return {status: 'unresolved', sourceSegmentId, side, reason: 'observed-boundary-not-inside-parent-or-nonpositive-unit'};
  return {status: 'resolved-acoustic-boundary', sourceSegmentId, side, sourceMs: ms,
    unitId: u.unitId, timeOrigin: u.timeOrigin};
}

/** 検査済みsnapshot以外は昇格できない。必要意味を時刻の都合で削除しない。 */
export function resolveInternalRetentionV001(token: ValidatedInternalRetention, parents: Json[], chunks: Json[]) {
  const value = validated.get(token);
  assert(value, 'VALIDATED_INTERNAL_RETENTION_REQUIRED');
  assert.deepEqual(value.candidates.map((c: Json) => c.candidateId), parents.map(c => c.candidateId), 'PARENT_CANDIDATE_ORDER_CHANGED');
  const segments: Json[] = [], unresolved: Json[] = [];
  for (const [i, c] of value.candidates.entries()) {
    const parent = parents[i];
    assert.deepEqual(value.input.candidates[i].utterances.flatMap((u: Json) => u.atoms.map((a: Json) => a.sourceSegmentId)),
      parent.sourceSegmentIds, 'PARENT_SOURCE_MEMBERSHIP_CHANGED');
    for (const block of c.blocks.filter((b: Json) => b.action === 'keep')) {
      const start = resolveInternalCutEndpointV001(block.sourceSegmentIds[0], 'start', parent, chunks);
      const end = resolveInternalCutEndpointV001(block.sourceSegmentIds.at(-1), 'end', parent, chunks);
      const failures = [start, end].filter(e => e.status === 'unresolved');
      if (failures.length) {unresolved.push({candidateId: c.candidateId, blockOrdinal: block.blockOrdinal, endpoints: failures}); continue;}
      if (start.sourceMs! >= end.sourceMs!) {
        unresolved.push({candidateId: c.candidateId, blockOrdinal: block.blockOrdinal, reason: 'nonpositive-observed-range'}); continue;
      }
      segments.push({candidateId: c.candidateId, blockOrdinal: block.blockOrdinal,
        segmentId: `segment-${String(segments.length + 1).padStart(4, '0')}`,
        sourceSegmentIds: [...block.sourceSegmentIds], sourceStartMs: start.sourceMs, sourceEndMs: end.sourceMs,
        cutBoundaryEvidence: {start, end}, meaningRoles: block.roles, reason: block.reason});
    }
  }
  if (unresolved.length) return {status: 'requires-new-meaning-judgment', unresolved,
    rejectedProposal: structuredClone(value.candidates), promotedSegments: []};
  for (let i = 1; i < segments.length; i++) assert(segments[i - 1].sourceEndMs <= segments[i].sourceStartMs, 'OBSERVED_INTERNAL_RANGES_OVERLAP');
  return {status: 'resolved', candidates: structuredClone(value.candidates), segments};
}

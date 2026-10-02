import assert from 'node:assert/strict';
import {assertCaptionDisplayInputV001, type CaptionDisplayInputV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';

type ByteBinding = {path: string; fileSha256: string};
type JsonBinding = ByteBinding & {schemaVersion: string; canonicalSha256: string};
// Existing formal serialization/binding implementation, loaded without importing legacy CLI types.
const formalModule = await import(new URL('./run_candidate_discovery_digest_skill_e2e_v001.mts', import.meta.url).href);
const bind: (p: string, value: Record<string, unknown>) => JsonBinding = formalModule.bind;
const canonicalSha: (value: unknown) => string = formalModule.canonicalSha;
export type AdoptedCaptionJudgmentParametersV001 = {
  preparationId: string; meaningPath: string;
  planBinding: ByteBinding; machineAdoptionBinding: JsonBinding;
  transcriptBinding: ByteBinding; utteranceBinding: JsonBinding; sourceVideoBinding: ByteBinding;
  parts: Array<{candidateId: string; timelineSegmentId: string; sourceSegmentIds: number[];
    sourceInterval: {sourceStartMs: number; sourceEndMs: number}}>;
  retainedSourceSegmentIds: number[]; droppedSourceSegmentIds: number[];
  transcript: {segments: Array<{id: number; text: string; startMs: number; endMs: number}>};
  utterances: {utterances: Array<{utteranceId: string; sourceSegmentIds: number[]}>};
  taskDescription: string; styleLimits: CaptionDisplayInputV001['styleLimits'];
};

/** Limited derivation of adopted_media_manufacturing_v001.mts:175–235.
 * Only text/atoms/groups/boundaries/requests; no source package, base or judgment. */
export function buildAdoptedCaptionJudgmentInputsV001(p: AdoptedCaptionJudgmentParametersV001) {
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(p.preparationId), 'CAPTION_PREPARATION_ID_INVALID');
  assert(p.parts.length > 0 && p.retainedSourceSegmentIds.length > 0, 'CAPTION_KEEP_MISSING');
  const ids = p.parts.flatMap(part => part.sourceSegmentIds);
  assert(new Set(ids).size === ids.length, 'CAPTION_KEEP_DUPLICATE');
  assert(ids.every(id => !p.droppedSourceSegmentIds.includes(id)), 'CAPTION_DROP_INCLUDED');
  assert.deepEqual(ids, p.retainedSourceSegmentIds, 'CAPTION_KEEP_MEMBERSHIP_OR_ORDER_CHANGED');
  assert(new Set(p.parts.map(part => part.timelineSegmentId)).size === p.parts.length, 'CAPTION_GROUP_DUPLICATE');
  const bySourceId = new Map(p.transcript.segments.map(s => [s.id, s]));
  assert(bySourceId.size === p.transcript.segments.length, 'CAPTION_SOURCE_ID_DUPLICATE');
  const utteranceFor = new Map<number, string>();
  for (const u of p.utterances.utterances) for (const id of u.sourceSegmentIds) {
    assert(!utteranceFor.has(id), 'CAPTION_UTTERANCE_MEMBERSHIP_DUPLICATE');
    utteranceFor.set(id, u.utteranceId);
  }
  const atoms: Array<{atomOccurrenceId: string; ordinal: number; text: string; sourceSegmentId: number;
    semanticUtteranceId: string; retainedSpans: Array<{timelineSegmentId: string; sourceStartMs: number; sourceEndMs: number}>}> = [];
  const groups = p.parts.map(part => {
    assert(part.sourceSegmentIds.length > 0, 'CAPTION_GROUP_EMPTY');
    const atomIds = part.sourceSegmentIds.map(id => {
      const s = bySourceId.get(id), utteranceId = utteranceFor.get(id);
      assert(s && utteranceId && s.startMs >= part.sourceInterval.sourceStartMs
        && s.endMs <= part.sourceInterval.sourceEndMs, 'CAPTION_ATOM_SOURCE_MISMATCH');
      const atomId = `${p.preparationId}-atom-${String(atoms.length + 1).padStart(6, '0')}`;
      atoms.push({atomOccurrenceId: atomId, ordinal: atoms.length + 1, text: s.text, sourceSegmentId: id,
        semanticUtteranceId: utteranceId,
        retainedSpans: [{timelineSegmentId: part.timelineSegmentId, sourceStartMs: s.startMs, sourceEndMs: s.endMs}]});
      return atomId;
    });
    return {candidateId: part.candidateId, timelineSegmentId: part.timelineSegmentId, atomOccurrenceIds: atomIds};
  });
  const captionId = `${p.preparationId}-caption`, inputCaptionId = `${p.preparationId}-input-caption`;
  const meaning = {schemaVersion: 'digest-caption-judgment-meaning-input-v001', artifactId: `${p.preparationId}-meaning`,
    machineAdoptionBinding: p.machineAdoptionBinding, transcriptBinding: p.transcriptBinding,
    utteranceBinding: p.utteranceBinding, sourceVideoBinding: p.sourceVideoBinding,
    orderedCandidates: groups, atomOccurrences: atoms,
    captions: [{captionId, ordinal: 1, text: atoms.map(a => a.text).join(''), atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}]};
  const meaningBinding = bind(p.meaningPath, meaning);
  const boundaries = atoms.map((a, i) => ({boundaryId: `${inputCaptionId}-boundary-${String(i + 1).padStart(6, '0')}`, text: a.text}));
  let offset = 0;
  const requests = groups.map((group, i) => {
    const count = group.atomOccurrenceIds.length;
    const input: CaptionDisplayInputV001 = {schemaVersion: 'presentation-zevo-caption-selection-input-v001',
      taskDescription: p.taskDescription,
      captions: [{captionId: `${inputCaptionId}-segment-${i + 1}`, boundaryCandidates: boundaries.slice(offset, offset + count)}],
      styleLimits: structuredClone(p.styleLimits)};
    offset += count;
    assertCaptionDisplayInputV001(input);
    return {schemaVersion: 'digest-caption-judgment-display-request-v001', requestId: `${p.preparationId}-display-${i + 1}`,
      planBinding: p.planBinding, machineAdoptionBinding: meaning.machineAdoptionBinding,
      meaningInputBinding: meaningBinding, candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId,
      input, inputCanonicalSha256: canonicalSha(input)};
  });
  return {meaning, requests};
}

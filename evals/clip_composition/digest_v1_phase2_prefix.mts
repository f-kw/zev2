import assert from 'node:assert/strict';
import {canonicalSha, sha, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';

/** 原観測全体の拒否を維持し、最初の不正wordより前の最大prefixだけを独立検証する。 */
export function validateSupplementalEndpointPrefixEvidenceV1(chunk: Json, observation: Json,
  targetId: number, parent: Json, savedFailure: Json, actualBindings: Json) {
  assert(same(actualBindings.observation, savedFailure.observationBinding), 'PHASE2_PREFIX_RAW_BINDING_CHANGED');
  assert(same(actualBindings.formalText, chunk.rawTextBinding), 'PHASE2_PREFIX_FORMAL_TEXT_BINDING_CHANGED');
  let rejection: string | null = null;
  try {validateAcousticChunkV001(chunk, observation);} catch (error) {rejection = String(error);}
  assert(rejection && savedFailure.status === 'rejected' && rejection === savedFailure.reason,
    'PHASE2_PREFIX_ORIGINAL_REJECTION_REQUIRED');
  // 文字列・token・source所属・音声長の全量対応を、prefix生成前に検査する。
  assert.equal(observation.chunkIndex, chunk.index);
  assert(chunk.atoms.length && observation.words.length);
  assert.equal(chunk.atoms.map((a: Json) => a.text).join(''), chunk.text, 'PHASE2_PREFIX_FULL_TEXT_CHANGED');
  assert.equal(observation.words.map((w: Json) => w.word).join(''), chunk.text, 'PHASE2_PREFIX_OBSERVED_TEXT_CHANGED');
  assert.deepEqual(observation.words.flatMap((w: Json) => w.tokens), observation.textTokens, 'PHASE2_PREFIX_FULL_TOKENS_CHANGED');
  assert.equal(observation.audioSamples / observation.sampleRate * 1000, chunk.endMs - chunk.startMs);
  assert(Number.isFinite(chunk.startMs) && Number.isFinite(chunk.endMs) && chunk.startMs < chunk.endMs);
  chunk.atoms.forEach((a: Json, i: number) => {
    assert(Number.isSafeInteger(a.sourceSegmentId) && a.sourceSegmentId > 0
      && typeof a.text === 'string' && a.text.length > 0, 'PHASE2_PREFIX_FORMAL_ATOM_INVALID');
    if (i) assert.equal(a.sourceSegmentId, chunk.atoms[i - 1].sourceSegmentId + 1, 'PHASE2_PREFIX_SOURCE_ID_ORDER_INVALID');
  });
  let priorEnd = 0, invalidIndex = -1;
  for (const [i, word] of observation.words.entries()) {
    const valid = typeof word.word === 'string' && word.word.length > 0
      && Array.isArray(word.tokens) && word.tokens.length > 0
      && Number.isFinite(word.start) && Number.isFinite(word.end) && Number.isFinite(word.probability)
      && word.start >= priorEnd && word.end >= word.start
      && word.end * 1000 <= chunk.endMs - chunk.startMs;
    if (!valid) {invalidIndex = i; break;}
    priorEnd = word.end;
  }
  assert(invalidIndex > 0, 'PHASE2_PREFIX_NO_VALID_WORD_PREFIX');
  const words = structuredClone(observation.words.slice(0, invalidIndex));
  const text = words.map((w: Json) => w.word).join('');
  let built = '', atomCount = -1;
  for (const [i, atom] of chunk.atoms.entries()) {
    built += atom.text;
    if (built === text) {atomCount = i + 1; break;}
    if (built.length >= text.length) break;
  }
  assert(atomCount > 0, 'PHASE2_PREFIX_NOT_AT_COMPLETE_SOURCE_BOUNDARY');
  const atoms = structuredClone(chunk.atoms.slice(0, atomCount));
  assert.equal(atoms.map((a: Json) => a.text).join(''), text);
  const tokens = words.flatMap((w: Json) => w.tokens);
  assert.deepEqual(tokens, observation.textTokens.slice(0, tokens.length));
  const projectedChunk = {...structuredClone(chunk), atoms, text};
  const projectedObservation = {...structuredClone(observation), words, textTokens: tokens};
  const validatedChunk = validateAcousticChunkV001(projectedChunk, projectedObservation);
  const targets = validatedChunk.units.filter((u: Json) => u.startBoundary?.after === targetId);
  assert.equal(targets.length, 1, 'PHASE2_PREFIX_TARGET_NOT_UNIQUE_OR_OUTSIDE_PREFIX');
  const target = targets[0], targetIndex = validatedChunk.units.indexOf(target);
  assert(target.sourceSegmentIds.length > 0 && target.sourceSegmentIds.every((id: number) => atoms.some((a: Json) => a.sourceSegmentId === id)),
    'PHASE2_PREFIX_TARGET_NOT_COMPLETELY_INSIDE');
  assert.equal(target.startTimeRole, 'acoustic-token-boundary', 'PHASE2_PREFIX_TARGET_IS_WINDOW_ORIGIN');
  assert(Number.isFinite(target.startMs) && Number.isFinite(target.endMs) && target.startMs < target.endMs,
    'PHASE2_PREFIX_TARGET_TIME_INVALID');
  assert(parent.sourceSegmentIds.includes(targetId)
    && parent.sourceInterval.sourceStartMs < target.startMs && target.startMs < parent.sourceInterval.sourceEndMs,
    'PHASE2_PREFIX_TARGET_OUTSIDE_PARENT');
  return {schemaVersion: 'digest-v1-phase2-endpoint-prefix-evidence-v001',
    fullValidationStatus: 'rejected', fullValidationFailureReason: rejection,
    firstInvalidWordOrdinal: invalidIndex + 1, firstInvalidWord: structuredClone(observation.words[invalidIndex]),
    audioDurationMs: chunk.endMs - chunk.startMs,
    maximalValidPrefixWordCount: words.length, prefixSourceSegmentIds: atoms.map((a: Json) => a.sourceSegmentId),
    prefixTextSha256: sha(Buffer.from(text, 'utf8')), prefixTokenCanonicalSha256: canonicalSha(tokens),
    projectedChunk, projectedObservation, prefixValidatorResult: validatedChunk,
    targetSourceSegmentId: targetId, targetWordOrdinal: targetIndex + 1,
    targetRawWord: structuredClone(observation.words[targetIndex]), targetUnit: target,
    resolvedSourceMs: target.startMs, resolutionMethod: 'rejected-window-maximal-valid-prefix-start-boundary',
    observationChanged: false, audioChanged: false, semanticAnswerChanged: false,
    formalSourceChanged: false, fullObservationPromoted: false, evidenceScope: 'target-start-endpoint-only'};
}

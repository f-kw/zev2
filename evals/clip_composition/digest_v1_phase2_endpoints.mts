import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, publish, same, sha, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadPhase2DiscoveryContext, validatePhase2Retention, phase2Out as out, requireAbsent}
  from './digest_v1_phase2_retention.mts';
import {reconstructAcoustics, withRetention} from './digest_v1_phase2_timing.mts';
import {resolveDigestRetentionParentsV1} from './digest_v1_retention.mts';
import {resolveInternalCutEndpointV001, resolveInternalRetentionV001}
  from './candidate_internal_retention_validation_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {validateSupplementalEndpointPrefixEvidenceV1} from './digest_v1_phase2_prefix.mts';

export type EndpointCollection = {kind: 'original' | 'supplemental'; chunks: Json[]};
const matching = (collection: EndpointCollection, id: number, side: 'start' | 'end') =>
  collection.chunks.flatMap(chunk => chunk.units.filter((u: Json) => side === 'start'
    ? u.startBoundary?.after === id : u.endBoundary?.before === id)
    .filter((u: Json) => !chunk.endpointPrefixEvidence
      || (side === 'start' && chunk.endpointPrefixEvidence.targetSourceSegmentId === id))
    .map((unit: Json) => ({unit, observationBinding: chunk.observationBinding,
      ...(chunk.endpointPrefixEvidence ? {endpointPrefixEvidence: chunk.endpointPrefixEvidence} : {})})));
const inside = (ms: number, parent: Json) => Number.isFinite(ms)
  && parent.sourceInterval.sourceStartMs < ms && ms < parent.sourceInterval.sourceEndMs;

/** 原resolverを先に使う。許可された理由・側・一意な証拠だけを補助経路で解く。 */
export function resolvePhase2CutEndpoint(id: number, side: 'start' | 'end', parent: Json,
  original: EndpointCollection, supplemental: EndpointCollection): Json {
  const initial = resolveInternalCutEndpointV001(id, side, parent, original.chunks);
  if (initial.status === 'inherited-parent-edge') return {...initial,
    resolutionMethod: 'inherited-parent-edge', observationBinding: null, originalFailureReason: null,
    supplementalObservation: false, unitId: null, unitStartMs: null, unitEndMs: null,
    unitDurationMs: null, zeroDuration: null, individualCharacterAcousticTime: 'not-claimed'};
  const originalMatches = matching(original, id, side);
  const evidence = (match: Json, method: string, supplementary: boolean): Json => {
    const u = match.unit;
    assert(match.observationBinding, 'PHASE2_ENDPOINT_OBSERVATION_BINDING_REQUIRED');
    return {status: 'resolved-acoustic-boundary', sourceSegmentId: id, side, sourceMs: u[`${side}Ms`],
      resolutionMethod: method, unitId: u.unitId, timeOrigin: u.timeOrigin,
      observationBinding: match.observationBinding, originalResolution: initial,
      originalFailureReason: initial.status === 'unresolved' ? initial.reason : null,
      originalObservationBindings: originalMatches.map(x => x.observationBinding),
      supplementalObservation: supplementary, unitStartMs: u.startMs, unitEndMs: u.endMs,
      unitDurationMs: u.endMs - u.startMs, zeroDuration: u.startMs === u.endMs,
      individualCharacterAcousticTime: 'not-claimed',
      ...(match.endpointPrefixEvidence ? {endpointPrefixEvidence: match.endpointPrefixEvidence} : {})};
  };
  if (initial.status === 'resolved-acoustic-boundary') {
    assert.equal(originalMatches.length, 1);
    return evidence(originalMatches[0], 'existing-internal-cut-resolver', false);
  }
  if (side === 'start' && initial.reason === 'window-origin-is-not-speech-onset') {
    const matches = matching(supplemental, id, 'start')
      .filter(x => x.unit.startTimeRole === 'acoustic-token-boundary');
    if (matches.length !== 1) return {...initial, supplementalFailure: 'supplemental-start-not-unique',
      supplementalMatchingCount: matches.length};
    const u = matches[0].unit;
    if (!Number.isFinite(u.endMs) || !(u.startMs < u.endMs) || !inside(u.startMs, parent))
      return {...initial, supplementalFailure: 'supplemental-start-nonpositive-nonfinite-or-outside-parent'};
    return evidence(matches[0], matches[0].endpointPrefixEvidence
      ? 'rejected-window-maximal-valid-prefix-start-boundary' : 'supplemental-centered-fixed-text-acoustic-boundary', true);
  }
  if (side === 'end' && initial.reason === 'observed-boundary-not-inside-parent-or-nonpositive-unit'
    && originalMatches.length === 1) {
    const u = originalMatches[0].unit;
    if (u.startMs === u.endMs && inside(u.endMs, parent))
      return evidence(originalMatches[0], 'zero-duration-unit-end-boundary', false);
  }
  return initial;
}

/** 検証済みtokenから既存resolverが返した全量snapshotを使い、時刻だけを再解決する。 */
export function resolvePhase2EndpointRanges(c: Json, original: EndpointCollection, supplemental: EndpointCollection): Json {
  const validated = validatePhase2Retention(c, c.retentionResponse, c.retentionResult);
  assert.equal(validated.status, 'validated', 'PHASE2_RETENTION_NOT_COMPLETE');
  if (validated.status !== 'validated') throw new Error('PHASE2_RETENTION_NOT_COMPLETE');
  const parents = resolveDigestRetentionParentsV1(c), candidates: Json[] = [], segments: Json[] = [], unresolved: Json[] = [];
  validated.tokens.forEach((token, i) => {
    const parent = parents[i], legacy = resolveInternalRetentionV001(token, [parent], original.chunks);
    const snapshot = legacy.status === 'resolved' ? legacy.candidates! : legacy.rejectedProposal!;
    assert.equal(snapshot.length, 1, 'PHASE2_VALIDATED_SNAPSHOT_REQUIRED');
    const candidate = snapshot[0]; candidates.push(candidate);
    const candidateSegments: Json[] = [];
    for (const block of candidate.blocks.filter((b: Json) => b.action === 'keep')) {
      const start = resolvePhase2CutEndpoint(block.sourceSegmentIds[0], 'start', parent, original, supplemental);
      const end = resolvePhase2CutEndpoint(block.sourceSegmentIds.at(-1), 'end', parent, original, supplemental);
      const failures = [start, end].filter(e => e.status === 'unresolved');
      if (failures.length) {
        unresolved.push({candidateId: candidate.candidateId, blockOrdinal: block.blockOrdinal, endpoints: failures});
        continue;
      }
      if (!(Number.isFinite(start.sourceMs) && Number.isFinite(end.sourceMs) && start.sourceMs < end.sourceMs)) {
        unresolved.push({candidateId: candidate.candidateId, blockOrdinal: block.blockOrdinal,
          reason: 'nonpositive-observed-range', cutBoundaryEvidence: {start, end}}); continue;
      }
      candidateSegments.push({candidateId: candidate.candidateId, blockOrdinal: block.blockOrdinal,
        sourceSegmentIds: [...block.sourceSegmentIds], sourceStartMs: start.sourceMs, sourceEndMs: end.sourceMs,
        cutBoundaryEvidence: {start, end}, meaningRoles: block.roles, reason: block.reason});
    }
    for (let j = 1; j < candidateSegments.length; j++) {
      if (candidateSegments[j - 1].sourceEndMs > candidateSegments[j].sourceStartMs)
        unresolved.push({candidateId: candidate.candidateId, reason: 'observed-internal-ranges-overlap'});
    }
    for (const segment of candidateSegments) segments.push({...segment,
      segmentId: `segment-${String(segments.length + 1).padStart(4, '0')}`});
  });
  return unresolved.length ? {status: 'unresolved', unresolved, promotedSegments: []}
    : {status: 'resolved', candidates, segments};
}

const supplementaryDirectory = 'acoustics-supplemental-v001';
const implementationPath = 'evals/clip_composition/digest_v1_phase2_endpoints.mts';
async function checkBytes(ref: Json) {
  assert.equal(await fileSha(path.isAbsolute(ref.path) ? ref.path : path.join(ROOT, ref.path)),
    ref.fileSha256, 'PHASE2_ENDPOINT_BYTES_CHANGED');
}
async function byteJson(p: string) {return JSON.parse((await readFile(path.join(ROOT, p))).toString('utf8'));}

/** 元観測と補助観測を別集合で検証し、補助入力の製造規則も原本から再構築する。 */
export async function loadPhase2EndpointEvidence(jobPath: string) {
  const c = await withRetention(await loadPhase2DiscoveryContext(jobPath));
  const decisionPath = out(c, 'retention-boundary-advisor-decision.json'), decision = await readJson(decisionPath);
  assert.equal(decision.schemaVersion, 'digest-v1-phase2-endpoint-advisor-decision-v001');
  assert.equal(decision.decision, 'continue');
  for (const ref of decision.frozenArtifacts) await checkBytes(ref);
  const original = await reconstructAcoustics(c), savedOriginal = await readJson(out(c, 'acoustic-validation.json'));
  assert(same(original, savedOriginal), 'PHASE2_ORIGINAL_ACOUSTICS_CHANGED');
  const failure = await readJson(out(c, 'retention-range-unresolved.json'));
  assert(same(failure.acousticValidationBinding, bind(out(c, 'acoustic-validation.json'), savedOriginal)));
  const prefix = out(c, supplementaryDirectory), preflightPath = `${prefix}/acoustic-preflight-v001.json`;
  const preflight = await byteJson(preflightPath), preparation = await byteJson(`${prefix}/audio-preparation.json`);
  const execution = await byteJson(`${prefix}/execution-started.json`);
  await checkBytes(execution.preflightBinding); await checkBytes(execution.adapterBinding); await checkBytes(execution.observerBinding);
  assert.equal(execution.preflightBinding.path, path.join(ROOT, preflightPath));
  const originalPreflight = await byteJson(out(c, 'acoustics/acoustic-preflight-v001.json'));
  assert(same(preflight.compute, originalPreflight.compute) && preflight.modelPath === originalPreflight.modelPath
    && same(preflight.modelBindings, originalPreflight.modelBindings) && same(preflight.versions, originalPreflight.versions),
    'PHASE2_SUPPLEMENTAL_METHOD_CHANGED');
  for (const ref of preflight.sourceBindings) await checkBytes(ref);
  // 既存observerと同じruntime byte照合。Python実行pathのsymlinkも原本どおり扱う。
  assert(same(preflight.implementationBindings.slice(0, -1), originalPreflight.implementationBindings));
  assert(same(preflight.implementationBindings.at(-1), execution.adapterBinding));
  for (const ref of preflight.implementationBindings)
    assert.equal(sha(await readFile(ref.path)), ref.fileSha256, 'PHASE2_RUNTIME_BYTES_CHANGED');
  assert.equal(preparation.advisorDecisionBinding.fileSha256, bind(decisionPath, decision).fileSha256);
  assert.equal(preparation.originalFailureBinding.fileSha256, bind(out(c, 'retention-range-unresolved.json'), failure).fileSha256);
  assert(same(preparation.sourceVideoBinding, c.plan.request.sourceVideo), 'PHASE2_SUPPLEMENTAL_SOURCE_CHANGED');
  const rule = decision.fallbacks.start;
  const targets = [...new Set<number>(failure.result.unresolved.flatMap((r: Json) => r.endpoints)
    .filter((e: Json) => e.side === 'start' && e.reason === rule.originalFailureReason)
    .map((e: Json) => e.sourceSegmentId))];
  assert.equal(targets.length, rule.currentAffectedBoundaryCount);
  assert.equal(preflight.chunks.length, targets.length); assert.equal(preparation.windows.length, targets.length);
  assert.deepEqual([...preparation.windows.map((r: Json) => r.sourceSegmentId)].sort((a, b) => a - b),
    [...targets].sort((a, b) => a - b));
  const prefixDecisionPath = out(c, 'supplemental-prefix-advisor-decision.json');
  const prefixDecision = await readJson(prefixDecisionPath);
  assert.equal(prefixDecision.schemaVersion, 'digest-v1-phase2-prefix-advisor-decision-v001');
  assert.equal(prefixDecision.decision, 'continue');
  await checkBytes(prefixDecision.sourceFailureBinding);
  const prefixFailure = await readJson(prefixDecision.sourceFailureBinding.path);
  assert.equal(prefixFailure.preflightBinding.fileSha256, execution.preflightBinding.fileSha256);
  const parents = resolveDigestRetentionParentsV1(c);
  const supplementalChunks: Json[] = [], observationBindings: Json[] = [], prefixArtifacts: Json[] = [];
  for (const [i, window] of preparation.windows.entries()) {
    const oldUnits = original.chunks.flatMap((chunk: Json) => chunk.units)
      .filter((u: Json) => u.startBoundary?.after === window.sourceSegmentId);
    assert.equal(oldUnits.length, 1); assert(same(window.originalUnit, oldUnits[0]));
    assert.equal(oldUnits[0].startTimeRole, 'alignment-window-origin-not-speech-onset');
    const lo = oldUnits[0].startMs - rule.windowBeforeMs, hi = oldUnits[0].startMs + rule.windowAfterMs;
    const selected = c.transcript.segments.filter((s: Json) => lo <= s.startMs && s.endMs <= hi);
    assert(selected.length > 2 && selected.every((s: Json, j: number) => j === 0 || s.id === selected[j - 1].id + 1));
    const ids = selected.map((s: Json) => s.id);
    assert(ids.slice(1, -1).includes(window.sourceSegmentId));
    const chunk = preflight.chunks[i], atoms = selected.map((s: Json) => ({sourceSegmentId: s.id, text: s.text}));
    assert.equal(chunk.index, i); assert.equal(window.chunkIndex, i);
    assert.equal(window.nominalStartMs, lo); assert.equal(window.nominalEndMs, hi);
    assert.equal(window.centerMs, oldUnits[0].startMs); assert.deepEqual(window.sourceSegmentIds, ids);
    assert.equal(chunk.startMs, selected[0].startMs); assert.equal(chunk.endMs, selected.at(-1).endMs);
    assert.equal(window.audioStartMs, chunk.startMs); assert.equal(window.audioEndMs, chunk.endMs);
    assert(chunk.startMs < window.centerMs && window.centerMs < chunk.endMs);
    assert(same(chunk.atoms, atoms) && chunk.text === atoms.map((a: Json) => a.text).join(''));
    await checkBytes(chunk.audioBinding); await checkBytes(chunk.rawTextBinding);
    const text = await byteJson(path.relative(ROOT, chunk.rawTextBinding.path));
    assert(same(text.atoms, atoms) && text.text === chunk.text);
    const p = `${prefix}/acoustic-observation-chunk-${String(i).padStart(4, '0')}-v001.json`;
    const observation = await byteJson(p);
    assert.equal(observation.preflightBinding.fileSha256, execution.preflightBinding.fileSha256);
    const observationBinding = {path: p, fileSha256: await fileSha(path.join(ROOT, p))};
    observationBindings.push(observationBinding);
    const savedResult = prefixFailure.results.find((r: Json) => r.chunkIndex === i);
    assert(savedResult && same(savedResult.observationBinding, observationBinding), 'PHASE2_RAW_OBSERVATION_BINDING_CHANGED');
    let validatedChunk: Json | null = null;
    try {validatedChunk = validateAcousticChunkV001(chunk, observation);} catch (error) {
      assert.equal(String(error), savedResult.reason, 'PHASE2_FULL_REJECTION_CHANGED');
    }
    if (validatedChunk) {
      assert.equal(savedResult.status, 'validated');
      supplementalChunks.push({...validatedChunk, observationBinding});
    } else {
      assert(prefixDecision.allowedTargetSourceSegmentIds.includes(window.sourceSegmentId), 'PHASE2_PREFIX_TARGET_NOT_AUTHORIZED');
      const affectedParents = parents.filter((parent: Json) => parent.sourceSegmentIds.includes(window.sourceSegmentId));
      assert(affectedParents.length > 0);
      const proofs = affectedParents.map((parent: Json) => validateSupplementalEndpointPrefixEvidenceV1(
        chunk, observation, window.sourceSegmentId, parent, savedResult,
        {observation: observationBinding, formalText: chunk.rawTextBinding}));
      assert(proofs.every(proof => same(proof, proofs[0])), 'PHASE2_PREFIX_PARENT_EVIDENCE_DIFFERS');
      const proof = {...proofs[0], rawObservationBinding: observationBinding,
        rawPreflightBinding: {path: preflightPath, fileSha256: execution.preflightBinding.fileSha256},
        formalTextBinding: chunk.rawTextBinding, originalFullRejectionBinding: prefixDecision.sourceFailureBinding,
        advisorDecisionBinding: bind(prefixDecisionPath, prefixDecision),
        validatorImplementationBinding: {path: 'evals/clip_composition/digest_acoustic_timing_validation_v001.mts',
          fileSha256: await fileSha(path.join(ROOT, 'evals/clip_composition/digest_acoustic_timing_validation_v001.mts'))},
        projectionImplementationBinding: {path: 'evals/clip_composition/digest_v1_phase2_prefix.mts',
          fileSha256: await fileSha(path.join(ROOT, 'evals/clip_composition/digest_v1_phase2_prefix.mts'))}};
      const proofPath = out(c, `supplemental-prefix-evidence-chunk-${String(i).padStart(4, '0')}-v001.json`);
      const proofBinding = bind(proofPath, proof);
      prefixArtifacts.push({path: proofPath, artifact: proof, binding: proofBinding});
      supplementalChunks.push({...proof.prefixValidatorResult, observationBinding,
        endpointPrefixEvidence: {binding: proofBinding, targetSourceSegmentId: window.sourceSegmentId,
          evidenceScope: proof.evidenceScope, fullValidationStatus: proof.fullValidationStatus}});
    }
  }
  const originalChunks = original.chunks.map((chunk: Json) => {
    const p = out(c, `acoustics/acoustic-observation-chunk-${String(chunk.chunkIndex).padStart(4, '0')}-v001.json`);
    const binding = original.sourceBindings.find((b: Json) => b.path === p);
    assert(binding, 'PHASE2_ORIGINAL_OBSERVATION_BINDING_MISSING');
    return {...chunk, observationBinding: binding};
  });
  return {...c, decision, decisionBinding: bind(decisionPath, decision), failure, prefixArtifacts,
    original: {kind: 'original' as const, chunks: originalChunks},
    supplemental: {kind: 'supplemental' as const, chunks: supplementalChunks},
    supplementalBindings: {preflight: {path: preflightPath, fileSha256: execution.preflightBinding.fileSha256},
      preparation: {path: `${prefix}/audio-preparation.json`, fileSha256: await fileSha(path.join(ROOT, prefix, 'audio-preparation.json'))},
      observations: observationBindings},
    originalAcousticBinding: bind(out(c, 'acoustic-validation.json'), savedOriginal)};
}

export async function executePhase2Endpoints(jobPath: string) {
  const c = await loadPhase2EndpointEvidence(jobPath);
  await requireAbsent(out(c, 'retention-endpoint-resolution-v001.json'));
  await requireAbsent(out(c, 'retention-adoption.json'));
  const result = resolvePhase2EndpointRanges(c, c.original, c.supplemental);
  for (const proof of c.prefixArtifacts) await publish(proof.path, proof.artifact);
  const artifact = {schemaVersion: 'digest-v1-phase2-endpoint-resolution-v001', ...result,
    advisorDecisionBinding: c.decisionBinding, originalFailureBinding: bind(out(c, 'retention-range-unresolved.json'), c.failure),
    originalAcousticBinding: c.originalAcousticBinding, supplementalBindings: c.supplementalBindings,
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))},
    answerChanged: false, humanQuality: 'not-evaluated'};
  const resolutionBinding = await publish(out(c, 'retention-endpoint-resolution-v001.json'), artifact);
  if (result.status === 'resolved')
    await publish(out(c, 'retention-adoption.json'), buildPhase2RetentionAdoption(c, result, resolutionBinding));
  process.stdout.write(JSON.stringify({status: result.status, unresolved: result.unresolved ?? [],
    candidates: result.candidates?.length ?? 0, ranges: result.segments?.length ?? 0}) + '\n');
  return artifact;
}

function buildPhase2RetentionAdoption(c: Json, result: Json, resolutionBinding: Json) {
  assert.equal(result.status, 'resolved');
  return {schemaVersion: 'candidate-internal-edit-machine-adoption-v001',
    artifactId: `${c.plan.planId}-retention`, authorityKind: 'C-all-new-retention-validated-source-ranges',
    planBinding: c.planBinding, authorizationBinding: c.plan.authorization,
    parentAdoptionBinding: c.candidateSet.origins.formalIdentityCatalog,
    acousticValidationBinding: c.originalAcousticBinding, endpointResolutionBinding: resolutionBinding,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    judgment: {request: bind(out(c, 'retention-request.json'), c.retentionRequest),
      response: bind(out(c, 'retention-response.json'), c.retentionResponse),
      result: bind(out(c, 'retention-result.json'), c.retentionResult)},
    candidates: result.candidates, segments: result.segments, humanQuality: 'not-evaluated'};
}

/** 保存済み正式区間を原回答・元観測・限定証拠から再構築して共通後段へ渡す。 */
export async function loadPhase2ResolvedEndpointContext(jobPath: string) {
  const c = await loadPhase2EndpointEvidence(jobPath);
  const resolution = await readJson(out(c, 'retention-endpoint-resolution-v001.json'));
  await checkBytes(resolution.implementationBinding);
  const reconstructed = resolvePhase2EndpointRanges(c, c.original, c.supplemental);
  assert.equal(reconstructed.status, 'resolved');
  assert(resolution.status === 'resolved' && same(resolution.candidates, reconstructed.candidates)
    && same(resolution.segments, reconstructed.segments), 'PHASE2_SAVED_ENDPOINT_RESOLUTION_CHANGED');
  assert(same(resolution.advisorDecisionBinding, c.decisionBinding)
    && same(resolution.originalFailureBinding, bind(out(c, 'retention-range-unresolved.json'), c.failure))
    && same(resolution.originalAcousticBinding, c.originalAcousticBinding)
    && same(resolution.supplementalBindings, c.supplementalBindings), 'PHASE2_ENDPOINT_PROVENANCE_CHANGED');
  for (const proof of c.prefixArtifacts) assert(same(await readJson(proof.path), proof.artifact), 'PHASE2_PREFIX_ARTIFACT_CHANGED');
  const retention = await readJson(out(c, 'retention-adoption.json'));
  assert(same(retention, buildPhase2RetentionAdoption(c, reconstructed,
    bind(out(c, 'retention-endpoint-resolution-v001.json'), resolution))), 'PHASE2_RETENTION_ADOPTION_CHANGED');
  return {...c, retention, endpointResolution: resolution,
    retentionBinding: bind(out(c, 'retention-adoption.json'), retention),
    candidateSetBinding: bind(out(c, 'candidate-set.json'), c.candidateSet)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  if (mode !== 'resolve' || !job) throw new Error('usage: resolve job.json');
  try {await executePhase2Endpoints(job);} catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}

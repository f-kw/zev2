import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, readBound, publish, same, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadPhase2DiscoveryContext, resolvePhase2Retention, phase2Out as out, requireAbsent}
  from './digest_v1_phase2_retention.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {reconstructDigestRetentionV1} from './digest_v1_retention.mts';

const timingPath = 'evals/clip_composition/digest_acoustic_timing_validation_v001.mts';
async function checkBytes(ref: Json) {
  assert.equal(await fileSha(path.isAbsolute(ref.path) ? ref.path : path.join(ROOT, ref.path)),
    ref.fileSha256, 'PHASE2_ACOUSTIC_BYTES_CHANGED');
}

/** 既存STTの窓・本文・IDと、今回の固定本文観測を照合する。 */
async function reconstructAcoustics(c: Json) {
  const prefix = out(c, 'acoustics'), preflightPath = `${prefix}/acoustic-preflight-v001.json`;
  const preflight = await readJson(preflightPath), runtime = await readJson(`${prefix}/runtime.json`);
  const preflightSha = await fileSha(path.join(ROOT, preflightPath));
  assert.equal(runtime.preflightBinding.fileSha256, preflightSha, 'PHASE2_ACOUSTIC_PREFLIGHT_CHANGED');
  assert(same(preflight.compute, {device: 'cpu', compute_type: 'float32', otherParameters: 'installed defaults'}),
    'PHASE2_ACOUSTIC_METHOD_CHANGED');
  await checkBytes(runtime.adapterBinding); await checkBytes(runtime.observerBinding);
  for (const b of preflight.sourceBindings) await checkBytes(b);
  assert.equal(preflight.sourceBindings[0].fileSha256, c.plan.request.transcript.fileSha256);
  assert.equal(preflight.sourceBindings[2].fileSha256, bind(out(c, 'retention-request.json'), c.retentionRequest).fileSha256);
  assert.equal(preflight.sourceBindings[3].fileSha256, bind(out(c, 'retention-result.json'), c.retentionResult).fileSha256);
  assert.equal(preflight.sourceBindings[4].fileSha256, c.planBinding.fileSha256);
  const catalogue = await readJson(path.relative(ROOT, preflight.sourceBindings[1].path));
  const wanted = new Set<number>(c.retentionRequest.input.candidates.flatMap((x: Json) =>
    x.utterances.flatMap((u: Json) => u.atoms.map((a: Json) => a.sourceSegmentId))));
  const expected: Json[] = [], byId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  let offset = 0;
  for (const row of catalogue.chunks) {
    const ids = Array.from({length: row.segmentCount}, (_, i) => offset + i + 1);
    if (ids.some(id => wanted.has(id))) expected.push({index: row.index, startMs: row.startMs, endMs: row.endMs,
      atoms: ids.map(sourceSegmentId => ({sourceSegmentId, text: byId.get(sourceSegmentId)!.text}))});
    offset += row.segmentCount;
  }
  assert.equal(offset, c.transcript.segments.length, 'PHASE2_CHUNK_CATALOGUE_COVERAGE_INVALID');
  assert.deepEqual(preflight.chunks.map((x: Json) => ({index: x.index, startMs: x.startMs, endMs: x.endMs, atoms: x.atoms})),
    expected, 'PHASE2_ACOUSTIC_INPUT_MEMBERSHIP_CHANGED');
  const chunks: Json[] = [], observations: Json[] = [];
  for (const chunk of preflight.chunks) {
    await checkBytes(chunk.audioBinding); await checkBytes(chunk.rawTextBinding);
    const text = await readJson(path.relative(ROOT, chunk.rawTextBinding.path));
    assert(same(text.atoms, chunk.atoms) && text.text === chunk.text, 'PHASE2_ACOUSTIC_TEXT_CHANGED');
    const p = `${prefix}/acoustic-observation-chunk-${String(chunk.index).padStart(4, '0')}-v001.json`;
    const observation = await readJson(p);
    assert.equal(observation.preflightBinding.fileSha256, preflightSha, 'PHASE2_OBSERVATION_PARENT_CHANGED');
    chunks.push(validateAcousticChunkV001(chunk, observation));
    observations.push({path: p, fileSha256: await fileSha(path.join(ROOT, p))});
  }
  return {schemaVersion: 'digest-v1-phase2-acoustic-validation-v001', status: 'validated',
    sourceBindings: [{path: preflightPath, fileSha256: preflightSha}, ...observations,
      {path: `${prefix}/runtime.json`, fileSha256: await fileSha(path.join(ROOT, prefix, 'runtime.json'))}],
    implementationBinding: {path: timingPath, fileSha256: await fileSha(path.join(ROOT, timingPath))},
    chunks, individualCharacterAcousticTimes: 'not-claimed'};
}

async function withRetention(c: Json) {
  const [retentionResponse, retentionResult, executor] = await Promise.all([
    readJson(out(c, 'retention-response.json')), readJson(out(c, 'retention-result.json')),
    readJson(out(c, 'retention-executor.json'))]);
  await checkBytes(executor.implementationBinding);
  assert(same(executor.requestBinding, bind(out(c, 'retention-request.json'), c.retentionRequest)));
  return {...c, retentionResponse, retentionResult};
}

export async function resolvePhase2Timing(jobPath: string) {
  const c = await withRetention(await loadPhase2DiscoveryContext(jobPath));
  await requireAbsent(out(c, 'acoustic-validation.json'));
  const acoustic = await reconstructAcoustics(c);
  const acousticBinding = await publish(out(c, 'acoustic-validation.json'), acoustic);
  const result = resolvePhase2Retention(c, c.retentionResponse, c.retentionResult, acoustic.chunks);
  if (result.status !== 'resolved') {
    const byId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
    const issues = (result.unresolved ?? []).map((row: Json) => ({...row,
      endpoints: row.endpoints?.map((e: Json) => ({...e,
        adjacentText: [-2, -1, 0, 1, 2].map(delta => byId.get(e.sourceSegmentId + delta)).filter(Boolean)
          .map(s => ({sourceSegmentId: s.id, text: s.text})),
        adjacentObservations: acoustic.chunks.flatMap((x: Json) => x.units).filter((u: Json) =>
          u.sourceSegmentIds.includes(e.sourceSegmentId) || u.startBoundary?.after === e.sourceSegmentId
          || u.endBoundary?.before === e.sourceSegmentId)}))}));
    const failure = {schemaVersion: 'digest-v1-phase2-retention-range-resolution-v001', status: result.status,
      acousticValidationBinding: acousticBinding, originalResponse: bind(out(c, 'retention-response.json'), c.retentionResponse),
      result, issues, answerChanged: false, promotedSegments: [], next: 'GPT_DECISION'};
    await publish(out(c, 'retention-range-unresolved.json'), failure);
    process.stdout.write(JSON.stringify({status: result.status, issueCount: issues.length, next: 'GPT_DECISION'}) + '\n');
    return failure;
  }
  const retention = {schemaVersion: 'candidate-internal-edit-machine-adoption-v001',
    artifactId: `${c.plan.planId}-retention`, authorityKind: 'C-all-new-retention-validated-source-ranges',
    planBinding: c.planBinding, authorizationBinding: c.plan.authorization,
    parentAdoptionBinding: c.candidateSet.origins.formalIdentityCatalog,
    acousticValidationBinding: acousticBinding,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    judgment: {request: bind(out(c, 'retention-request.json'), c.retentionRequest),
      response: bind(out(c, 'retention-response.json'), c.retentionResponse), result: bind(out(c, 'retention-result.json'), c.retentionResult)},
    candidates: result.candidates, segments: result.segments,
    humanQuality: 'not-evaluated'};
  await publish(out(c, 'retention-adoption.json'), retention);
  process.stdout.write(JSON.stringify({status: 'resolved', candidates: result.candidates.length, ranges: result.segments.length}) + '\n');
  return retention;
}

export async function loadPhase2ResolvedContext(jobPath: string) {
  const c = await withRetention(await loadPhase2DiscoveryContext(jobPath));
  const acoustic = await reconstructAcoustics(c), retention = await readJson(out(c, 'retention-adoption.json'));
  const savedAcoustic = await readBound(retention.acousticValidationBinding);
  assert(same(acoustic, savedAcoustic), 'PHASE2_SAVED_ACOUSTICS_CHANGED');
  assert(same(retention.planBinding, c.planBinding)
    && same(retention.parentAdoptionBinding, c.candidateSet.origins.formalIdentityCatalog), 'PHASE2_RETENTION_BINDING_CHANGED');
  const plan = {...c.plan, request: {...c.plan.request, candidateSet: bind(out(c, 'candidate-set.json'), c.candidateSet)},
    reuseInternalRetention: bind(out(c, 'retention-adoption.json'), retention), acousticValidation: retention.acousticValidationBinding};
  const source = {...c, plan, retention, chunks: acoustic.chunks};
  reconstructDigestRetentionV1(source);
  return {...source, sourceContext: source, job: {authorization: c.plan.authorization}};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  if (mode !== 'resolve' || !job) throw new Error('usage: resolve job.json');
  try {await resolvePhase2Timing(job);} catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}

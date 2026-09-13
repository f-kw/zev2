import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, publish, same, keys, sha, formal, canonicalSha, fileSha,
  judgeThroughStdinV001, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadPhase2ResolvedEndpointContext} from './digest_v1_phase2_endpoints.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {selectAllCandidatesV1, composeSelectedDigestRangesV1} from './digest_v1.mts';
import {internalCaptionTextV001, validateInternalDisplayV001} from './candidate_internal_edit_core_v001.mts';
import {assertCaptionDisplayInputV001, assertCaptionDisplayResultV001, runCaptionDisplayBoundariesV001}
  from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {resolveAcousticCueV001, retainUnresolvedTimingV001} from './digest_acoustic_timing_validation_v001.mts';

const implementationPath = 'evals/clip_composition/digest_v1_phase2_captions.mts';

/** 新しい保持回答を検証した入口から、Phase 1の全採用・sort/unionへ値だけを渡す。 */
export function buildPhase2Composition(c: Json) {
  const adoptedIds = selectAllCandidatesV1(c.candidateSet.candidates);
  const segments = composeSelectedDigestRangesV1(c.candidateSet.candidates.map((v: Json) => v.candidateId),
    adoptedIds, c.retention.segments, c.transcript.segments);
  const adoption = {schemaVersion: 'candidate-digest-machine-adoption-v001', artifactId: `${c.plan.planId}-adoption`,
    authorityKind: 'approved-digest-candidate-ids', authorizationBinding: c.plan.authorization,
    planBinding: c.planBinding, candidateSetBinding: c.candidateSetBinding,
    reusedInternalRetentionBinding: c.retentionBinding,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances, selectedCandidates: c.candidateSet.candidates,
    segments, policy: {order: 'retained-source-time', overlap: 'exact-union', fillGaps: false},
    humanQuality: 'not-evaluated', individualCandidateHumanApproval: 'not-performed'};
  const editPlan = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo, segments, unresolvedEdits: [], quality: 'human-review-pending'};
  return {adoption, editPlan};
}

/** 既存本文製造の単数候補来歴を、共通union後の候補集合来歴へ写像する。 */
export function buildPhase2DisplayInput(c: Json, adoption: Json) {
  const text = internalCaptionTextV001(c as any, adoption);
  text.textInput.orderedSegments = text.textInput.orderedSegments.map(({candidateId: _unused, ...group}: Json, i: number) =>
    ({...group, candidateIds: adoption.segments[i].candidateIds}));
  const textBinding = bind(out(c, 'caption-text-input.json'), text.textInput);
  text.requests = text.requests.map(({candidateId: _unused, ...request}: Json, i: number) =>
    ({...request, candidateIds: adoption.segments[i].candidateIds, textInputBinding: textBinding}));
  const input = {...structuredClone(text.promptInput), captions: text.requests.flatMap((r: Json) => r.input.captions)};
  assertCaptionDisplayInputV001(input);
  const request = {schemaVersion: 'digest-v1-phase2-display-request-v001', requestId: `${c.plan.planId}-display-all`,
    planBinding: c.planBinding, machineAdoptionBinding: text.textInput.machineAdoptionBinding,
    textInputBinding: textBinding, input, inputCanonicalSha256: canonicalSha(input)};
  return {...text, request};
}

/** 全区間一回の回答を再判断せず既存の区間単位validatorへ投影する。 */
export function validatePhase2Display(text: Json, response: Json, result: Json) {
  assertCaptionDisplayResultV001(result);
  const request = text.request;
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'digest-v1-phase2-display-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim()
    && request.inputCanonicalSha256 === canonicalSha(request.input), 'PHASE2_DISPLAY_PROVENANCE_CHANGED');
  assert.equal(result.answer.status, 'complete', 'PHASE2_DISPLAY_ABSTAINED');
  assert.deepEqual(result.answer.captions.map((v: Json) => v.captionId),
    request.input.captions.map((v: Json) => v.captionId), 'PHASE2_DISPLAY_CAPTION_MEMBERSHIP_CHANGED');
  return text.requests.map((r: Json, i: number) => {
    const answer = {status: 'complete', captions: [result.answer.captions[i]]};
    const projected = {schemaVersion: 'candidate-internal-edit-display-response-v001',
      requestFileSha256: sha(formal(r)), answer, judgmentNote: response.judgmentNote};
    const projectedResult = {...result, answer};
    return validateInternalDisplayV001(r, projected, projectedResult);
  });
}

export function resolvePhase2CaptionTiming(c: Json, adoption: Json, text: Json, traces: Json[]) {
  const byId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const rows: Json[] = [];
  let offset = 0;
  traces.forEach((trace, i) => {
    const segment = adoption.segments[i], boundaries = trace.request.input.captions[0].boundaryCandidates;
    const indices = new Map<string, number>(boundaries.map((b: Json, j: number) => [b.boundaryId, j]));
    let start = 0;
    for (const cue of trace.cues) {
      const end = indices.get(cue.cueEndBoundaryId)!;
      const atoms = text.textInput.atomOccurrences.slice(offset + start, offset + end + 1);
      const sourceIds = atoms.map((a: Json) => a.sourceSegmentId);
      const original = {sourceStartMs: byId.get(sourceIds[0])!.startMs, sourceEndMs: byId.get(sourceIds.at(-1))!.endMs};
      rows.push({unitId: `${c.plan.planId}-caption-timing-${rows.length + 1}`, timelineSegmentId: segment.segmentId,
        atomOccurrenceIds: atoms.map((a: Json) => a.atomOccurrenceId), sourceSegmentIds: sourceIds,
        text: atoms.map((a: Json) => a.text).join(''), oldStartMs: original.sourceStartMs, oldEndMs: original.sourceEndMs,
        resolution: resolveAcousticCueV001(sourceIds, c.original.chunks, segment, original)});
      start = end + 1;
    }
    offset += boundaries.length;
  });
  try {
    const resolved = retainUnresolvedTimingV001(rows);
    const outside = resolved.filter(r => {
      const segment = adoption.segments.find((s: Json) => s.segmentId === r.timelineSegmentId);
      return !(r.resolution.sourceStartMs >= segment.sourceStartMs && r.resolution.sourceEndMs <= segment.sourceEndMs
        && r.resolution.sourceStartMs < r.resolution.sourceEndMs);
    });
    return {status: outside.length ? 'unresolved' : 'resolved', originalRows: rows, cues: resolved, issues: outside,
      failureReason: outside.length ? 'DISPLAY_TIMING_NOT_CONTAINED_IN_NEW_COMPOSITION' : null};
  } catch (error) {
    return {status: 'unresolved', originalRows: rows, cues: [], issues: [], failureReason: String(error)};
  }
}

export async function loadPhase2CaptionContext(job: string) {
  const c = await loadPhase2ResolvedEndpointContext(job), composition = buildPhase2Composition(c);
  for (const [key, filename] of [['adoption', 'machine-adoption.json'], ['editPlan', 'edit-plan.json']])
    assert(same(await readJson(out(c, filename)), composition[key]), 'PHASE2_COMPOSITION_CHANGED');
  const text = buildPhase2DisplayInput(c, composition.adoption);
  assert(same(await readJson(out(c, 'caption-text-input.json')), text.textInput), 'PHASE2_CAPTION_TEXT_CHANGED');
  assert(same(await readJson(out(c, 'display-all-request.json')), text.request), 'PHASE2_DISPLAY_REQUEST_CHANGED');
  const preflight = await readJson(out(c, 'display-input-preflight.json'));
  assert.equal(await fileSha(path.join(ROOT, implementationPath)), preflight.implementationBinding.fileSha256,
    'PHASE2_CAPTION_EXECUTOR_CHANGED');
  return {...c, ...composition, text};
}

export async function preparePhase2Captions(job: string) {
  const c = await loadPhase2ResolvedEndpointContext(job), {adoption, editPlan} = buildPhase2Composition(c);
  await requireAbsent(out(c, 'machine-adoption.json'));
  const text = buildPhase2DisplayInput(c, adoption);
  await publish(out(c, 'machine-adoption.json'), adoption); await publish(out(c, 'edit-plan.json'), editPlan);
  await publish(out(c, 'caption-text-input.json'), text.textInput);
  await publish(out(c, 'display-all-request.json'), text.request);
  await publish(out(c, 'display-input-preflight.json'), {schemaVersion: 'digest-v1-phase2-display-preflight-v001', status: 'passed',
    planBinding: c.planBinding, retentionBinding: c.retentionBinding,
    requestBinding: bind(out(c, 'display-all-request.json'), text.request),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))},
    candidates: adoption.selectedCandidates.length, ranges: adoption.segments.length, atoms: text.textInput.atomOccurrences.length,
    totalRetainedMs: adoption.segments.reduce((n: number, s: Json) => n + s.sourceEndMs - s.sourceStartMs, 0),
    displayCalls: 0, judgmentMethod: 'current-codex-stdin-v001', groupingSkillCalls: 0,
    textManufacturing: 'existing-internal-caption-text-v001; preserve-union-candidate-id-sets'});
  process.stdout.write(JSON.stringify({status: 'prepared', ranges: adoption.segments.length,
    atoms: text.textInput.atomOccurrences.length, styleLimits: text.request.input.styleLimits}) + '\n');
}

export async function executePhase2Captions(job: string) {
  const c = await loadPhase2CaptionContext(job);
  await requireAbsent(out(c, 'display-all-response.json'));
  await publish(out(c, 'display-execution-started.json'), {schemaVersion: 'digest-v1-phase2-display-execution-started-v001',
    requestBinding: bind(out(c, 'display-all-request.json'), c.text.request), plannedDisplayCalls: 1});
  let response: Json | undefined;
  const result = await runCaptionDisplayBoundariesV001(c.text.request.input, async input => {
    assert(same(input, c.text.request.input)); response = await judgeThroughStdinV001(c.text.request);
    await publish(out(c, 'display-all-response.json'), response!); return response!.answer;
  });
  await publish(out(c, 'display-all-result.json'), result);
  const traces = validatePhase2Display(c.text, response!, result);
  for (const [i, trace] of traces.entries()) for (const key of ['request', 'response', 'result'])
    await publish(out(c, `display-${i + 1}-${key}.json`), trace[key]);
  const validation = await publish(out(c, 'display-validation.json'), {schemaVersion: 'digest-v1-phase2-display-validation-v001',
    status: 'passed', requestBinding: bind(out(c, 'display-all-request.json'), c.text.request),
    responseBinding: bind(out(c, 'display-all-response.json'), response!), resultBinding: bind(out(c, 'display-all-result.json'), result),
    perRangeProjection: 'deterministic-no-new-judgment', displayCalls: 1, captionCount: traces.reduce((n, t) => n + t.cues.length, 0),
    ranges: traces.length, fullTextCoverage: 'passed', widthAndLineValidation: 'passed', humanQuality: 'not-evaluated'});
  const fresh = await loadPhase2CaptionContext(job);
  const timing = resolvePhase2CaptionTiming(fresh, fresh.adoption, fresh.text, traces);
  await publish(out(c, 'caption-timing-resolution-v001.json'), {schemaVersion: 'digest-v1-phase2-caption-timing-resolution-v001',
    ...timing, displayValidationBinding: validation, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), c.adoption),
    acousticValidationBinding: c.originalAcousticBinding, policy: 'existing-cue-endpoint-resolution-and-explicit-unresolved-transcript-fallback',
    supplementalRetentionEndpointEvidenceUsedForCaption: false, humanSync: 'not-evaluated'});
  process.stdout.write(JSON.stringify({status: timing.status, cues: timing.cues.length,
    issueCount: timing.issues.length, failureReason: timing.failureReason}) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  try {
    if (mode === 'prepare' && job) await preparePhase2Captions(job);
    else if (mode === 'execute' && job) await executePhase2Captions(job);
    else throw new Error('usage: prepare|execute job.json');
  } catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}

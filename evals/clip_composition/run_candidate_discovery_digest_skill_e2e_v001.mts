import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {
  CANDIDATE_DISCOVERY_SKILL_V001, assertCandidateDiscoveryInputV001,
  assertCandidateDiscoveryResultV001, runCandidateDiscoveryV001,
  type CandidateDiscoveryInputV001, type CandidateDiscoveryAnswerV001,
} from '../../runner/src/skills/candidate-discovery-v001.js';
import {
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances,
} from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {speechRange, speechUnitsByIds} from '../../runner/src/transcript-utils.js';
import {
  decodePresentationOutputFiniteJsonV001 as decode,
  serializePresentationOutputCropApplicationFormalJsonV001 as formal,
  canonicalSha256PresentationOutputFiniteJsonV001 as canonicalSha,
  sha256PresentationOutputCropApplicationBytesV001 as sha,
} from './presentation_output_crop_application_v001.mjs';
import {readPresentationMeaningWorkspaceFileStableV001 as stableRead, hashAbsoluteStableStreaming as fileSha}
  from './presentation_timeline_composition_decision_v001.mjs';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyByte}
  from './presentation_first_real_data_gate_v001.mjs';
import {decodePresentationCaptionB1StrictJsonV001 as decodeWire}
  from './presentation_caption_semantic_source_package_v001.mjs';

export type Json = Record<string, any>;
export type Binding = {schemaVersion: string; path: string; fileSha256: string; canonicalSha256: string};
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PLAN_SCHEMA = 'candidate-discovery-digest-fixed-plan-v002';
export const PATHS = Object.freeze({
  skill: 'runner/src/skills/candidate-discovery-v001.ts',
  executor: 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  coreAdapter: 'evals/clip_composition/candidate_digest_core_adapter_v001.mts',
  displaySkill: 'runner/src/skills/caption-display-boundaries-v001.ts',
  question: 'evals/clip_composition/prompts/theme_generation_prompt_v002.md',
  utterance: 'runner/src/distant-connection-common-utterance-artifact-v001.ts',
  compositionRanges: 'runner/src/transcript-utils.ts',
});
export const POLICY = Object.freeze({
  adoption: 'all-validated-candidates-for-this-review-v001',
  composition: 'multiple-disjoint-evidence-contained-context-ranges',
  order: 'source-utterance-order', context: 'proposed-contiguous-utterance-ids',
  finalTime: 'existing-transcript-position-and-core-frame-projection',
  quality: 'human-review-after-render',
});
// 既存候補探索promptの目的・禁止・判断方針を包む。件数や尺の係数を加えない。
export const CRITERIA = Object.freeze([
  '元配信単体の確定発話だけから、見どころが説明できる具体的な候補を提案する。',
  '単独で視聴者に伝わるフリ、展開、反応、結論がある場面を優先する。',
  '必要な文脈は連続した既存発話IDの開始と終端で示し、根拠発話IDをその内側から選ぶ。',
  '配信全体や長い雑談を大きく囲わず、別話題や無関係な部分を含めない。',
  '本文にない場面や反応を作らず、弱い候補を無理に埋めない。候補がなければabstainedを返す。',
  '時刻、正式採用、最終順、尺、字幕、描画値は返さない。',
]);
const H = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WP = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\\)(?!.*\/\/)[A-Za-z0-9._\-/]+$/u;
export const object = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);
export const keys = (v: unknown, expected: string[]): v is Json => object(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
export const same = (a: unknown, b: unknown) => canonicalSha(a) === canonicalSha(b);
export function fail(code: string): never {throw new Error(`DIGEST_SKILL_E2E: ${code}`);}
export const pass = (value: Json, code: string) => {
  if (!['passed', 'built', 'resolved'].includes(value?.status)) fail(`${code}: ${JSON.stringify(value)}`);
  return value;
};
export const bind = (p: string, value: Json): Binding => ({schemaVersion: value.schemaVersion, path: p,
  fileSha256: sha(formal(value)), canonicalSha256: canonicalSha(value)});
export {formal, canonicalSha, sha, fileSha};
export function assertByteBinding(v: unknown) {
  if (!keys(v, ['path', 'fileSha256']) || !WP.test(v.path) || !H.test(v.fileSha256)) fail('BYTE_BINDING_INVALID');
}
export function assertBinding(v: unknown): asserts v is Binding {
  if (!keys(v, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
    || !ID.test(v.schemaVersion) || !WP.test(v.path) || !H.test(v.fileSha256)
    || !H.test(v.canonicalSha256)) fail('FORMAL_BINDING_INVALID');
}
export async function readBound(binding: Binding) {
  assertBinding(binding);
  const bytes = await stableRead({workspaceRoot: ROOT, relativePath: binding.path});
  const d = decode(bytes);
  if (d.status !== 'decoded' || !same(bind(binding.path, d.value), binding)) fail('BOUND_BYTES_MISMATCH');
  return d.value;
}
export async function readJson(p: string) {
  if (!WP.test(p)) fail('PATH_INVALID');
  const bytes = await stableRead({workspaceRoot: ROOT, relativePath: p});
  const d = decode(bytes);
  if (d.status !== 'decoded') fail('JSON_INVALID');
  return d.value;
}
export async function publish(p: string, value: Json) {
  if (!WP.test(p)) fail('PATH_INVALID');
  await mkdir(path.dirname(path.join(ROOT, p)), {recursive: true});
  const bytes = formal(value);
  await writeFile(path.join(ROOT, p), bytes, {flag: 'wx'});
  const observed = await stableRead({workspaceRoot: ROOT, relativePath: p});
  if (!observed.equals(bytes)) fail('PUBLICATION_MISMATCH');
  return bind(p, value);
}
export function assertDigestPlanV001(p: unknown): asserts p is Json {
  if (!keys(p, ['schemaVersion', 'planId', 'authorization', 'request', 'skills', 'policy',
    'implementationBindings', 'outputRoot', 'priorCandidateJudgment']) || p.schemaVersion !== PLAN_SCHEMA || !ID.test(p.planId)
    || !WP.test(p.outputRoot) || !p.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-candidate-digest-skill-')
    || !keys(p.request, ['purpose', 'sourceId', 'sourceVideo', 'transcript', 'utterances',
      'rendererTemplate', 'captionStyleTemplate']) || !ID.test(p.request.sourceId)
    || typeof p.request.purpose !== 'string' || p.request.purpose.length === 0
    || !same(p.policy, POLICY) || !same(p.skills, [
      {id: 'candidate-discovery', version: 'v001', mode: 'current-codex-stdin-v001', api: 'forbidden'},
      {id: 'caption-display-boundaries', version: 'v001', mode: 'current-codex-stdin-v001', api: 'forbidden'},
    ]) || !Array.isArray(p.implementationBindings)
    || p.implementationBindings.length !== Object.values(PATHS).length) fail('PLAN_INVALID');
  assertBinding(p.authorization);
  assertByteBinding(p.request.sourceVideo);
  assertByteBinding(p.request.transcript);
  for (const k of ['utterances', 'rendererTemplate', 'captionStyleTemplate']) assertBinding(p.request[k]);
  Object.values(PATHS).forEach((expected, i) => {
    assertByteBinding(p.implementationBindings[i]);
    if (p.implementationBindings[i].path !== expected) fail('IMPLEMENTATION_BINDING_INVALID');
  });
  if (p.priorCandidateJudgment !== null) {
    if (!keys(p.priorCandidateJudgment, ['planSnapshot', 'request', 'response', 'result', 'failure'])) fail('PRIOR_JUDGMENT_BINDINGS_INVALID');
    for (const b of Object.values(p.priorCandidateJudgment)) assertBinding(b);
  }
}
export async function loadDigestContextV001(planPath: string) {
  const plan = await readJson(planPath);
  assertDigestPlanV001(plan);
  const [authorization, utterances, rendererTemplate, captionStyleTemplate, transcriptBytes] = await Promise.all([
    readBound(plan.authorization), readBound(plan.request.utterances),
    readBound(plan.request.rendererTemplate), readBound(plan.request.captionStyleTemplate),
    stableRead({workspaceRoot: ROOT, relativePath: plan.request.transcript.path}),
  ]);
  if (!keys(authorization, ['schemaVersion', 'recordId', 'origin', 'instruction', 'scope', 'individualCandidateHumanReview'])
    || authorization.schemaVersion !== 'candidate-digest-user-authorization-record-v001'
    || authorization.instruction !== 'ZEV進行管理２ 指示-001'
    || authorization.individualCandidateHumanReview !== 'not-performed'
    || !same(authorization.scope, {existingMaterialOnly: true, candidateDiscovery: true,
      fixedPlanAdoption: true, existingCoreRender: true, localCodexJudgment: true,
      apiCommunication: false, newProvider: false, humanQualityAfterRender: true})) fail('AUTHORIZATION_INVALID');
  if (sha(transcriptBytes) !== plan.request.transcript.fileSha256) fail('TRANSCRIPT_SHA_MISMATCH');
  validateUtterances(utterances, {sourceTranscriptPath: plan.request.transcript.path,
    sourceTranscriptBytes: transcriptBytes});
  const transcript = JSON.parse(transcriptBytes.toString());
  if (utterances.sourceUri !== path.join(ROOT, plan.request.sourceVideo.path)
    || transcript.sourceUri !== utterances.sourceUri) fail('SOURCE_MEMBERSHIP_MISMATCH');
  for (const v of [plan.request.sourceVideo, ...plan.implementationBindings]) {
    await verifyByte(v);
  }
  let priorCandidate: Json | null = null;
  if (plan.priorCandidateJudgment !== null) {
    priorCandidate = Object.fromEntries(await Promise.all(Object.entries(plan.priorCandidateJudgment)
      .map(async ([k, b]) => [k, await readBound(b as Binding)])));
    const old = priorCandidate.planSnapshot;
    const r = priorCandidate.request;
    if (!same(old.request, plan.request) || !same(old.skills, plan.skills) || !same(old.policy, plan.policy)
      || !same(old.authorization, plan.authorization)
      || !same(r.planBinding, plan.priorCandidateJudgment.planSnapshot)
      || priorCandidate.failure.stage !== 'core-adapter-module-load' || priorCandidate.failure.observedExitCode !== 13
      || priorCandidate.response.requestFileSha256 !== plan.priorCandidateJudgment.request.fileSha256
      || !same(priorCandidate.response.answer, priorCandidate.result.answer)) fail('PRIOR_JUDGMENT_PROVENANCE_MISMATCH');
    for (const oldBinding of old.implementationBindings) {
      // 通常修正を許された実行配線以外の入力・意味判断実装は同一に固定する。
      if (![PATHS.executor, PATHS.coreAdapter].includes(oldBinding.path)
        && !same(oldBinding, plan.implementationBindings.find((v: Json) => v.path === oldBinding.path))) fail('PRIOR_JUDGMENT_SEMANTICS_CHANGED');
    }
    assertCandidateDiscoveryResultV001(priorCandidate.result);
  }
  const c = {plan, planBinding: bind(planPath, plan), authorization, utterances, transcript,
    rendererTemplate, captionStyleTemplate, priorCandidate};
  if (priorCandidate && (!same(priorCandidate.request.input, buildCandidateInputV001(c))
    || priorCandidate.request.inputCanonicalSha256 !== canonicalSha(buildCandidateInputV001(c)))) fail('PRIOR_JUDGMENT_INPUT_CHANGED');
  return c;
}
export type Context = Awaited<ReturnType<typeof loadDigestContextV001>>;
export function buildCandidateInputV001(c: Context): CandidateDiscoveryInputV001 {
  const input: CandidateDiscoveryInputV001 = {
    schemaVersion: 'candidate-discovery-skill-input-v001', productionRequest: c.plan.request.purpose,
    editorialCriteria: [...CRITERIA], sourceId: c.plan.request.sourceId,
    utterances: c.utterances.utterances.map((u: Json) => ({utteranceId: u.utteranceId, text: u.text})),
  };
  assertCandidateDiscoveryInputV001(input);
  return input;
}
export function buildCandidateRequestV001(c: Context) {
  if (c.priorCandidate) return structuredClone(c.priorCandidate.request);
  const input = buildCandidateInputV001(c);
  return {schemaVersion: 'candidate-discovery-judgment-request-v001', requestId: `${c.plan.planId}-candidates`,
    planBinding: c.planBinding, input, inputCanonicalSha256: canonicalSha(input)};
}
const validated = new WeakMap<object, Json>();
export type ValidatedCandidates = Readonly<{status: 'validated-machine-adoption'}>;
/** 生result・JSONコピーは採用できない。ID検査と来歴検査を通過したsnapshotだけを昇格する。 */
export function validateCandidateAdoptionV001(context: Context, request: Json, response: Json,
  result: unknown): ValidatedCandidates {
  const c = structuredClone(context);
  assertDigestPlanV001(c.plan);
  assertCandidateDiscoveryResultV001(result);
  const answer = result.answer as CandidateDiscoveryAnswerV001;
  if (!same(request, buildCandidateRequestV001(c))
    || !keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'candidate-discovery-judgment-response-v001'
    || response.requestFileSha256 !== sha(formal(request)) || !same(response.answer, answer)
    || typeof response.judgmentNote !== 'string' || response.judgmentNote.length === 0) fail('JUDGMENT_PROVENANCE_MISMATCH');
  if (c.priorCandidate && (!same(response, c.priorCandidate.response) || !same(result, c.priorCandidate.result))) fail('PRIOR_JUDGMENT_CHANGED');
  if (answer.status !== 'complete') fail('CANDIDATE_SKILL_ABSTAINED');
  // 「複数箇所」という承認済み構成条件。独自の上限や採点規則ではない。
  if (answer.candidates.length < 2) fail('MULTIPLE_HIGHLIGHTS_REQUIRED');
  const index = new Map<string, number>(c.utterances.utterances.map((u: Json, i: number) => [u.utteranceId, i]));
  const rows = answer.candidates.map((candidate, resultOrdinal) => {
    if (candidate.sourceId !== c.plan.request.sourceId) fail('CANDIDATE_SOURCE_MISMATCH');
    const start = index.get(candidate.contextStartUtteranceId), end = index.get(candidate.contextEndUtteranceId);
    if (start === undefined || end === undefined) fail('UNKNOWN_CONTEXT_ID');
    if (start > end) fail('CONTEXT_ORDER_INVALID');
    let previous = -1;
    for (const id of candidate.evidenceUtteranceIds) {
      const n = index.get(id);
      if (n === undefined) fail('UNKNOWN_EVIDENCE_ID');
      if (n < start || n > end) fail('EVIDENCE_OUTSIDE_CONTEXT');
      if (n <= previous) fail('EVIDENCE_DUPLICATE_OR_ORDER_INVALID');
      previous = n;
    }
    const included = c.utterances.utterances.slice(start, end + 1);
    const sourceSegmentIds = included.flatMap((u: Json) => u.sourceSegmentIds);
    if (!sourceSegmentIds.length) fail('EMPTY_CONTEXT');
    const units = speechUnitsByIds(c.transcript, sourceSegmentIds);
    if (!same(units.map(u => u.id), sourceSegmentIds)) fail('CONTEXT_SOURCE_IDS_MISMATCH');
    const range = speechRange(c.transcript, sourceSegmentIds);
    if (range.sourceStartMs !== included[0].sourceStartMs || range.sourceEndMs !== included.at(-1).sourceEndMs
      || range.sourceEndMs <= range.sourceStartMs) fail('OFFICIAL_RANGE_MISMATCH');
    return {resultOrdinal: resultOrdinal + 1, candidateId: `candidate-${String(resultOrdinal + 1).padStart(4, '0')}`,
      title: candidate.title, reason: candidate.reason, evidenceUtteranceIds: [...candidate.evidenceUtteranceIds],
      includedUtteranceIds: included.map((u: Json) => u.utteranceId), sourceSegmentIds,
      sourceInterval: range, startOrdinal: start, endOrdinal: end};
  });
  rows.sort((a, b) => a.startOrdinal - b.startOrdinal);
  rows.forEach((r, i) => {
    if (i && (r.startOrdinal <= rows[i - 1].endOrdinal
      || r.sourceInterval.sourceStartMs < rows[i - 1].sourceInterval.sourceEndMs)) fail('CANDIDATE_CONTEXT_OVERLAP');
  });
  const out = (name: string) => `${c.plan.outputRoot}/${name}`;
  const adoption = {
    schemaVersion: 'candidate-digest-machine-adoption-v001', artifactId: `${c.plan.planId}-machine-adoption`,
    authorityKind: 'fixed-plan-machine-adoption-for-human-review',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    requestBinding: bind(out('candidate-request.json'), request),
    responseBinding: bind(out('candidate-response.json'), response),
    resultBinding: bind(out('candidate-result.json'), result),
    priorCandidateJudgmentBindings: c.plan.priorCandidateJudgment,
    validation: {provenance: 'passed', idMembershipOrder: 'passed', evidenceContained: 'passed',
      contextCoverage: 'passed', noOverlap: 'passed', compositionCondition: 'passed'},
    policy: c.plan.policy,
    humanQuality: 'not-evaluated', individualCandidateHumanApproval: 'not-performed',
    selectedCandidates: rows.map(({startOrdinal, endOrdinal, ...r}, i) => ({...r,
      outputOrdinal: i + 1, timelineSegmentId: `segment-${String(i + 1).padStart(4, '0')}`})),
  };
  const editPlan = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(out('machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo,
    segments: adoption.selectedCandidates.map((r: Json) => ({candidateId: r.candidateId,
      segmentId: r.timelineSegmentId, ...r.sourceInterval, sourceSegmentIds: r.sourceSegmentIds})),
    unresolvedEdits: [], quality: 'human-review-pending'};
  const token = Object.freeze({status: 'validated-machine-adoption' as const});
  validated.set(token, structuredClone({adoption, editPlan}));
  return token;
}
export function promoteCandidateAdoptionV001(token: ValidatedCandidates) {
  const v = validated.get(token);
  if (!v) fail('VALIDATED_MACHINE_ADOPTION_REQUIRED');
  return structuredClone(v);
}

// CLI・Core配線は下記に置く。Skill本体に採用・媒体・rendererの権限を入れない。
export function decodeDigestTransportV001(line: string): Json {
  const d = decodeWire(Buffer.from(line, 'utf8'));
  if (d.status !== 'decoded' || !object(d.value)) fail('JUDGMENT_ENVELOPE_INVALID');
  return structuredClone(d.value);
}
export async function judgeThroughStdinV001(request: Json) {
  process.stdout.write(`${JSON.stringify({event: 'candidate-digest-judgment-required',
    requestFileSha256: sha(formal(request)), request})}\n`);
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
  try {
    for await (const line of lines) return decodeDigestTransportV001(line);
    return fail('JUDGMENT_INPUT_CLOSED');
  } finally {lines.close();}
}
export async function executeDigestE2EV001(planPath: string) {
  const c = await loadDigestContextV001(planPath);
  const target = (p: string) => `${c.plan.outputRoot}/${p}`;
  await mkdir(path.join(ROOT, c.plan.outputRoot));
  let stage = 'candidate-discovery';
  try {
    await publish(target('plan-snapshot.json'), c.plan);
    const request = buildCandidateRequestV001(c);
    const req = await publish(target('candidate-request.json'), request);
    let response: Json | undefined = c.priorCandidate?.response;
    const result = c.priorCandidate?.result ?? await runCandidateDiscoveryV001(request.input, async input => {
      if (!same(input, request.input)) fail('SKILL_INPUT_CHANGED');
      response = await judgeThroughStdinV001(request);
      await publish(target('candidate-response.json'), response);
      return response.answer;
    });
    if (c.priorCandidate) await publish(target('candidate-response.json'), response!);
    const res = await publish(target('candidate-result.json'), result);
    const current = await loadDigestContextV001(planPath);
    if (!same(current.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    const promoted = promoteCandidateAdoptionV001(validateCandidateAdoptionV001(current, request, response!, result));
    const ad = await publish(target('machine-adoption.json'), promoted.adoption);
    const ep = await publish(target('edit-plan.json'), promoted.editPlan);
    stage = 'base-media';
    process.stdout.write(`${JSON.stringify({event: 'candidate-digest-base-media-start',
      adoptedCandidates: promoted.adoption.selectedCandidates.map((r: Json) => ({candidateId: r.candidateId,
        title: r.title, sourceInterval: r.sourceInterval}))})}\n`);
    const adapter = await import('./candidate_digest_core_adapter_v001.mts');
    const base = await adapter.buildDigestBaseMediaV001(current);
    await publish(target('base-media-bindings.json'), {schemaVersion: 'candidate-digest-base-media-bindings-v001', ...base});
    const inputs = adapter.buildDigestCaptionInputsV001(current, promoted.adoption, base);
    const tokens: object[] = [];
    const displayJudgments: Json[] = [];
    const {runCaptionDisplayBoundariesV001} = await import('../../runner/src/skills/caption-display-boundaries-v001.js');
    for (const [i, displayRequest] of inputs.requests.entries()) {
      stage = `caption-display-${i + 1}`;
      const requestBinding = await publish(target(`display-${i + 1}-request.json`), displayRequest);
      let displayResponse: Json | undefined;
      const displayResult = await runCaptionDisplayBoundariesV001(displayRequest.input, async input => {
        if (!same(input, displayRequest.input)) fail('DISPLAY_SKILL_INPUT_CHANGED');
        displayResponse = await judgeThroughStdinV001(displayRequest);
        await publish(target(`display-${i + 1}-response.json`), displayResponse);
        return displayResponse.answer;
      });
      const resultBinding = await publish(target(`display-${i + 1}-result.json`), displayResult);
      tokens.push(adapter.validateDigestDisplayV001(displayRequest, displayResponse!, displayResult));
      displayJudgments.push({request: requestBinding,
        response: bind(target(`display-${i + 1}-response.json`), displayResponse!), result: resultBinding});
    }
    stage = 'core';
    const fresh = await loadDigestContextV001(planPath);
    if (!same(fresh.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    await adapter.verifyDigestAdoptionV001(fresh);
    const core = await adapter.constructDigestCaptionCoreV001(fresh, promoted.adoption, base, tokens);
    const artifacts: Json = {};
    for (const [name, filename] of Object.entries(adapter.CORE_FILES)) {
      artifacts[name] = await publish(target(filename), core[name as keyof typeof core]);
    }
    stage = 'renderer';
    const renderer = await adapter.renderDigestV001(fresh, artifacts);
    const manifest = {schemaVersion: 'candidate-discovery-digest-skill-e2e-manifest-v001', status: 'review-ready',
      instruction: 'ZEV進行管理２ 指示-001', planBinding: fresh.planBinding,
      candidateJudgment: {request: req, response: bind(target('candidate-response.json'), response!), result: res},
      candidateJudgmentMode: c.priorCandidate ? 'continue-same-new-codex-judgment-after-cli-repair' : 'new-current-codex-judgment',
      priorCandidateJudgmentBindings: c.plan.priorCandidateJudgment,
      machineAdoption: ad, editPlan: ep, baseMedia: base,
      displayJudgments, reusedDisplaySkill: c.plan.implementationBindings.find((v: Json) => v.path === PATHS.displaySkill),
      core: artifacts, renderer,
      trace: {sourceVideo: c.plan.request.sourceVideo,
        adoptedCandidateCount: promoted.adoption.selectedCandidates.length,
        selectedSourceRanges: promoted.editPlan.segments,
        outputOrder: promoted.adoption.selectedCandidates.map((r: Json) => r.candidateId)},
      operations: {newCandidateJudgments: 1, newDisplayJudgments: displayJudgments.length,
        apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'},
      humanDecision: {status: 'pending', video: renderer.video,
        questions: ['選ばれた箇所が見どころとして妥当か', '不要な箇所が多くないか',
          '必要な文脈が欠けていないか', '全体としてダイジェストとして気持ちよく見られるか']}};
    await publish(target('manifest.json'), manifest);
    return manifest;
  } catch (error) {
    await publish(target('failure.json'), {schemaVersion: 'candidate-digest-e2e-failure-v001', stage,
      message: error instanceof Error ? error.message : String(error)});
    throw error;
  }
}

/** 再判断・再描画せず、採用と全字幕/Core入力を同一byteから再構築する。 */
export async function verifyDigestE2EV001(manifestPath: string) {
  const m = await readJson(manifestPath);
  if (m.schemaVersion !== 'candidate-discovery-digest-skill-e2e-manifest-v001' || m.status !== 'review-ready') fail('MANIFEST_INVALID');
  const c = await loadDigestContextV001(m.planBinding.path);
  if (!same(c.planBinding, m.planBinding)) fail('MANIFEST_PLAN_MISMATCH');
  const adapter = await import('./candidate_digest_core_adapter_v001.mts');
  const {adoption, editPlan} = await adapter.verifyDigestAdoptionV001(c);
  if (!same(adoption, await readBound(m.machineAdoption)) || !same(editPlan, await readBound(m.editPlan))) fail('MANIFEST_ADOPTION_MISMATCH');
  for (const b of Object.values(m.candidateJudgment)) await readBound(b as Binding);
  for (const [name, b] of Object.entries(m.baseMedia)) {
    if (name === 'baseMedia') {
      const v = b as Json;
      if (await fileSha(path.join(ROOT, v.path)) !== v.fileSha256) fail('BASE_MEDIA_SHA_MISMATCH');
    } else await readBound(b as Binding);
  }
  const inputs = adapter.buildDigestCaptionInputsV001(c, adoption, m.baseMedia);
  if (!Array.isArray(m.displayJudgments) || m.displayJudgments.length !== inputs.requests.length) fail('DISPLAY_RESULTS_MISSING');
  const tokens = [];
  for (const [i, b] of m.displayJudgments.entries()) {
    const request = await readBound(b.request), response = await readBound(b.response), result = await readBound(b.result);
    if (!same(request, inputs.requests[i])) fail('DISPLAY_REQUEST_CHANGED');
    tokens.push(adapter.validateDigestDisplayV001(request, response, result));
  }
  const core = await adapter.constructDigestCaptionCoreV001(c, adoption, m.baseMedia, tokens);
  for (const key of Object.keys(adapter.CORE_FILES)) {
    if (!same(core[key as keyof typeof core], await readBound(m.core[key]))) fail('CORE_RECONSTRUCTION_MISMATCH');
  }
  for (const name of ['execution', 'admission', 'lineLayout']) await readBound(m.renderer[name]);
  if (await fileSha(path.join(ROOT, m.renderer.video.path)) !== m.renderer.video.fileSha256) fail('VIDEO_SHA_MISMATCH');
  const execution = await readBound(m.renderer.execution);
  if (execution.exitCode !== 0 || execution.result?.status !== 'completed' || execution.result?.qc?.status !== 'passed') fail('TECHNICAL_QC_NOT_PASSED');
  const {validatePresentationBaseMediaSegmentPlanV002, validatePresentationBaseMediaGenerationManifestV003,
    inspectPresentationBaseMediaTimelineQcV002} = await import('./presentation_base_media_build_v003.mjs');
  const inspection = await readJson(`${c.plan.outputRoot}/source-media-inspection.json`);
  const media = inspection.media;
  const mapping = pass(validatePresentationBaseMediaSegmentPlanV002(
    editPlan.segments.map((r: Json) => ({sourceStartMs: r.sourceStartMs, sourceEndMs: r.sourceEndMs})),
    {fps: media.fps, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
      presentationOffsetMs: media.videoClock.presentationOffsetMs}, media.audioClock), 'FRAME_MAPPING_INVALID');
  const generation = await readBound(m.baseMedia.generationManifest), timeline = await readBound(m.baseMedia.timeline);
  pass(validatePresentationBaseMediaGenerationManifestV003(generation), 'BASE_MEDIA_MANIFEST_INVALID');
  if (!same(generation.segments, mapping.mappings)) fail('CANDIDATE_MEDIA_MAPPING_MISMATCH');
  inspectPresentationBaseMediaTimelineQcV002(timeline, generation, {fileSha256: m.baseMedia.baseMedia.fileSha256,
    frameCount: timeline.baseMedia.expectedFrameCount, timelineFileSha256: m.baseMedia.timeline.fileSha256});
  if (!same(m.trace.selectedSourceRanges, editPlan.segments)
    || !same(m.trace.outputOrder, adoption.selectedCandidates.map((r: Json) => r.candidateId))) fail('TRACE_MISMATCH');
  return {status: 'passed', deterministicAdoptionAndCoreReconstruction: 'exact',
    candidateToMediaMappings: 'exact', sourceAndVideoSha256: 'exact',
    selectedCandidates: adoption.selectedCandidates.length,
    finalFrames: timeline.baseMedia.expectedFrameCount, humanDecision: 'pending'};
}
async function main() {
  const [command, p] = process.argv.slice(2);
  if (!p) fail('ARGUMENT_REQUIRED');
  if (command === 'preflight') {
    const c = await loadDigestContextV001(p);
    process.stdout.write(`${JSON.stringify({status: 'passed', planBinding: c.planBinding,
      inputUtterances: buildCandidateInputV001(c).utterances.length})}\n`);
  } else if (command === 'run') process.stdout.write(`${JSON.stringify(await executeDigestE2EV001(p))}\n`);
  else if (command === 'verify') process.stdout.write(`${JSON.stringify(await verifyDigestE2EV001(p))}\n`);
  else fail('COMMAND_INVALID');
}
// CLIのPromiseをmodule評価に含めない。adapterがこのmoduleの純粋関数を参照しても
// 最上位awaitの循環で終了せず、明示的な失敗はstderrと非0終了へ伝える。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {console.error(error); process.exitCode = 1;});
}

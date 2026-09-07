import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {
  ROOT, readJson, readBound, bind, publish, fileSha, canonicalSha, same, keys, sha,
  loadDigestContextV001, judgeThroughStdinV001, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {verifyDigestAdoptionV001} from './candidate_digest_core_adapter_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {readPresentationMeaningWorkspaceFileStableV001 as stableRead} from './presentation_timeline_composition_decision_v001.mjs';
import {
  assertInternalRetentionInputV001, runInternalRetentionV001,
  type InternalRetentionInputV001,
} from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {validateInternalRetentionProvenanceV001, resolveInternalRetentionV001}
  from './candidate_internal_retention_validation_v001.mts';

export const INTERNAL_TASK = [
  '採用済み候補の中で、意味と見どころを保ちながら残す部分と削れる部分を判断する。',
  '候補の追加・採否・並べ替えはしない。本文と既存IDだけを使い、時刻や目標尺を生成しない。',
  '全本文を順番どおり連続したkeep/drop範囲に分け、開始・終了の既存本文片ID、役割、理由を返す。',
  'keepの役割はlead-in（導入）、development（展開）、payoff（オチ・結論）、reaction（反応）。',
  'dropの役割はduplicate（重複）、digression（脱線）、dispensable（無くても意味が通る）。',
  '一つのkeep範囲内では映像を連続して残す。keepを別範囲へ分けると、間の映像も除かれる。',
  '連続したkeep同士を分ける場合も、意味上その接続が成立する理由を示す。単純な語間削除はしない。',
  '文字数、秒数、固定割合で短くしない。必要な前提・展開・反応・結論は、反復表現であっても残す。',
  '候補ごとに保持できる意味を説明する。本文にない映像内容を見たと主張せず、判断不能ならabstainedを返す。',
].join('\n');
export const INTERNAL_POLICY = Object.freeze({
  candidates: 'preserve-all-adopted-candidates-in-original-order',
  meaning: 'new-id-grounded-judgment-with-full-text-accounting-before-time-resolution',
  cuts: 'unique-observed-internal-endpoints-or-explicit-parent-edge-inheritance',
  unresolved: 'reject-proposal-and-request-new-meaning-judgment-without-nearby-time-substitution',
  duration: 'derived-from-retained-meaning; no-target',
  quality: 'human-review-after-existing-core-and-technical-qc',
});
export const INTERNAL_IMPLEMENTATIONS = [
  'runner/src/skills/candidate-internal-retention-v001.ts',
  'evals/clip_composition/candidate_internal_retention_validation_v001.mts',
  'evals/clip_composition/run_candidate_internal_edit_v001.mts',
  'evals/clip_composition/candidate_internal_edit_core_v001.mts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'evals/clip_composition/digest_acoustic_timing_validation_v001.mts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/candidate_digest_core_adapter_v001.mts',
];
export const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;
export async function readByteJson(b: Json) {
  const bytes = await stableRead({workspaceRoot: ROOT, relativePath: b.path});
  assert.equal(sha(bytes), b.fileSha256, 'INPUT_BYTES_CHANGED');
  // 保存済み観測はraw JSON。正式JSONの数値表記への再serializationを要求しない。
  return JSON.parse(bytes.toString('utf8'));
}
export async function loadInternalContextV001(planPath: string) {
  const plan = await readJson(planPath);
  assert(keys(plan, ['schemaVersion', 'planId', 'authorization', 'priorManifest', 'syncVerification',
    'syncTimingAdoption', 'acousticValidation', 'request', 'taskDescription', 'policy', 'skills',
    'implementationBindings', 'outputRoot']));
  assert.equal(plan.schemaVersion, 'candidate-internal-edit-fixed-plan-v001');
  assert.equal(plan.taskDescription, INTERNAL_TASK);
  assert(same(plan.policy, INTERNAL_POLICY));
  assert.equal(plan.outputRoot, 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/internal-edit-v001');
  assert(/^[A-Za-z0-9._-]+$/u.test(plan.planId));
  assert(same(plan.skills, [
    {id: 'candidate-internal-retention', version: 'v001', mode: 'current-codex-stdin-v001', api: 'forbidden'},
    {id: 'caption-display-boundaries', version: 'v001', mode: 'current-codex-stdin-v001', api: 'forbidden'},
  ]));
  assert.deepEqual(plan.implementationBindings.map((b: Json) => b.path), INTERNAL_IMPLEMENTATIONS);
  for (const b of plan.implementationBindings) assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256, 'IMPLEMENTATION_CHANGED');
  const authorization = await readBound(plan.authorization);
  assert.equal(authorization.schemaVersion, 'candidate-internal-edit-received-instruction-record-v001');
  assert.deepEqual(authorization.instructions, ['ZEV進行管理２ 指示-002', 'ZEV進行管理２ 指示-003', 'ZEV進行管理２ 指示-004']);
  const prior = await readBound(plan.priorManifest), old = await loadDigestContextV001(prior.planBinding.path);
  assert(same(old.planBinding, prior.planBinding) && same(plan.request, old.plan.request), 'PARENT_INPUT_CHANGED');
  const parent = await verifyDigestAdoptionV001(old);
  assert(same(parent.adoption, await readBound(prior.machineAdoption)), 'PARENT_ADOPTION_CHANGED');
  const sync = await readBound(plan.syncVerification), syncTiming = await readBound(plan.syncTimingAdoption);
  assert.equal(sync.technicalStatus, 'passed');
  assert(same(sync.originalManifestBinding, plan.priorManifest), 'SYNC_WRONG_PARENT');
  const syncManifest = await readBound(sync.syncManifestBinding);
  assert(same(syncManifest.timingAdoption, plan.syncTimingAdoption));
  assert(same(syncTiming.observationValidation, plan.acousticValidation));
  const validation = await readByteJson(plan.acousticValidation);
  for (const b of [...validation.sourceBindings, validation.implementationBinding]) await readByteOrImplementation(b);
  const preflight = await readByteJson(validation.sourceBindings[0]);
  assert.equal(preflight.sourceBindings[0].path, path.join(ROOT, plan.request.transcript.path));
  assert.equal(preflight.sourceBindings[0].fileSha256, plan.request.transcript.fileSha256);
  const transcriptAtoms = new Map<number, Json>(old.transcript.segments.map((s: Json) => [s.id, s]));
  for (const chunk of preflight.chunks) for (const atom of chunk.atoms)
    assert.equal(atom.text, transcriptAtoms.get(atom.sourceSegmentId)?.text, 'ACOUSTIC_SOURCE_TEXT_CHANGED');
  const observations = await Promise.all(validation.sourceBindings.slice(1, -1).map(readByteJson));
  const chunks = preflight.chunks.map((chunk: Json, i: number) => {
    assert.equal(observations[i].preflightBinding.fileSha256, validation.sourceBindings[0].fileSha256);
    return validateAcousticChunkV001(chunk, observations[i]);
  });
  assert(same(chunks, validation.chunks), 'ACOUSTIC_UNITS_RECONSTRUCTION_MISMATCH');
  return {...old, plan, planBinding: bind(planPath, plan), authorization, prior,
    parents: parent.adoption.selectedCandidates, parentAdoption: parent.adoption, sync, syncTiming, chunks};
}
async function readByteOrImplementation(b: Json) {assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);}
export type InternalContext = Awaited<ReturnType<typeof loadInternalContextV001>>;
export function buildInternalRetentionInputV001(c: InternalContext): InternalRetentionInputV001 {
  const atoms = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utterances = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input = {schemaVersion: 'candidate-internal-retention-input-v001' as const,
    taskDescription: c.plan.taskDescription,
    candidates: c.parents.map((p: Json) => ({candidateId: p.candidateId, title: p.title, highlightReason: p.reason,
      utterances: p.includedUtteranceIds.map((id: string) => {
        const u = utterances.get(id)!;
        return {utteranceId: id, atoms: u.sourceSegmentIds.map((sid: number) => ({sourceSegmentId: sid, text: atoms.get(sid)!.text}))};
      })}))};
  assertInternalRetentionInputV001(input);
  return input;
}
export function internalRequestV001(c: InternalContext, revision: number, previousRejection: Json | null) {
  return {schemaVersion: 'candidate-internal-retention-request-v001', requestId: `${c.plan.planId}-meaning-${revision}`,
    planBinding: c.planBinding, parentAdoptionBinding: c.prior.machineAdoption,
    input: buildInternalRetentionInputV001(c), previousRejection};
}
export async function reconstructInternalAdoptionV001(c: InternalContext, judgment: Json) {
  const request = await readBound(judgment.request), response = await readBound(judgment.response), result = await readBound(judgment.result);
  assert(same(request, internalRequestV001(c, judgment.revision, request.previousRejection)), 'REQUEST_CHANGED');
  assert(Number.isSafeInteger(judgment.revision) && judgment.revision > 0);
  if (request.previousRejection) {
    const rejection = await readBound(request.previousRejection);
    assert.equal(rejection.schemaVersion, 'candidate-internal-edit-cut-rejection-v001');
    assert.equal(rejection.status, 'requires-new-meaning-judgment');
    assert.equal(rejection.judgment.revision, judgment.revision - 1);
    const priorRequest = await readBound(rejection.judgment.request);
    assert(same(priorRequest.planBinding, c.planBinding), 'REJECTION_FROM_DIFFERENT_PLAN');
  } else assert.equal(judgment.revision, 1, 'MISSING_REJECTION_BASIS');
  const token = validateInternalRetentionProvenanceV001(request, response, result, buildInternalRetentionInputV001(c));
  const resolved = resolveInternalRetentionV001(token, c.parents, c.chunks);
  if (resolved.status !== 'resolved') return {resolved};
  const adoption = {schemaVersion: 'candidate-internal-edit-machine-adoption-v001', artifactId: `${c.plan.planId}-adoption`,
    authorityKind: 'validated-internal-meaning-and-acoustic-boundaries-for-human-review',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding, parentAdoptionBinding: c.prior.machineAdoption,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances, acousticValidationBinding: c.plan.acousticValidation,
    judgment, policy: c.plan.policy, candidates: resolved.candidates, segments: resolved.segments,
    checks: {idMembershipOrder: 'passed', fullTextAccounting: 'passed', allParentCandidatesRetained: 'passed',
      internalCutObservation: 'passed', humanQuality: 'not-evaluated'}};
  const editPlan = {schemaVersion: 'candidate-internal-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo, segments: resolved.segments,
    unresolvedEdits: [], quality: 'human-review-pending'};
  return {resolved, adoption, editPlan};
}
export async function verifyInternalAdoptionV001(c: InternalContext) {
  const adoption = await readJson(out(c, 'machine-adoption.json')), editPlan = await readJson(out(c, 'edit-plan.json'));
  const expected = await reconstructInternalAdoptionV001(c, adoption.judgment);
  assert(same(adoption, expected.adoption) && same(editPlan, expected.editPlan), 'INTERNAL_ADOPTION_RECONSTRUCTION_MISMATCH');
  return {adoption, editPlan};
}
export async function executeInternalEditV001(planPath: string) {
  const c = await loadInternalContextV001(planPath);
  await mkdir(path.join(ROOT, c.plan.outputRoot));
  await publish(out(c, 'plan-snapshot.json'), c.plan);
  let previousRejection: Json | null = null, adopted: Json | undefined, stage = 'internal-meaning';
  try {
    for (let revision = 1; !adopted; revision++) {
      const prefix = `meaning-${revision}`;
      const request = internalRequestV001(c, revision, previousRejection), rb = await publish(out(c, `${prefix}-request.json`), request);
      let response: Json | undefined;
      const result = await runInternalRetentionV001(request.input, async input => {
        assert(same(input, request.input));
        response = await judgeThroughStdinV001(request);
        await publish(out(c, `${prefix}-response.json`), response);
        return response.answer;
      });
      const resultBinding = await publish(out(c, `${prefix}-result.json`), result);
      const fresh = await loadInternalContextV001(planPath);
      assert(same(fresh.planBinding, c.planBinding));
      const judgment = {revision, request: rb, response: bind(out(c, `${prefix}-response.json`), response!), result: resultBinding};
      const built = await reconstructInternalAdoptionV001(fresh, judgment);
      if (built.resolved.status !== 'resolved') {
        previousRejection = await publish(out(c, `${prefix}-rejection.json`), {
          schemaVersion: 'candidate-internal-edit-cut-rejection-v001', judgment,
          status: built.resolved.status, unresolved: built.resolved.unresolved,
          nextAction: '意味を保つ別の既存ID範囲を新規判断する。切断可能時刻の一覧・補間・近傍移動は使わない。'});
        process.stdout.write(`${JSON.stringify({event: 'internal-cut-proposal-rejected', rejection: await readBound(previousRejection)})}\n`);
        continue;
      }
      await publish(out(c, 'id-validation.json'), {schemaVersion: 'candidate-internal-retention-id-validation-v001',
        status: 'passed', judgment, candidates: built.resolved.candidates});
      await publish(out(c, 'machine-adoption.json'), built.adoption!);
      await publish(out(c, 'edit-plan.json'), built.editPlan!);
      adopted = built.adoption;
    }
    const adapter = await import('./candidate_internal_edit_core_v001.mts');
    stage = 'base-media';
    process.stdout.write(`${JSON.stringify({event: 'internal-edit-base-media-start', retainedRanges: adopted.segments.length})}\n`);
    const base = await adapter.buildInternalBaseMediaV001(c);
    await publish(out(c, 'base-media-bindings.json'), {schemaVersion: 'candidate-internal-edit-base-media-bindings-v001', ...base});
    stage = 'caption-display';
    const caption = await adapter.executeInternalCaptionsV001(c, adopted, base);
    stage = 'renderer';
    const renderer = await adapter.renderInternalEditV001(c, caption.artifacts);
    const manifest = {schemaVersion: 'candidate-internal-edit-manifest-v001', status: 'review-ready',
      planBinding: c.planBinding, machineAdoption: bind(out(c, 'machine-adoption.json'), adopted),
      editPlan: bind(out(c, 'edit-plan.json'), await readJson(out(c, 'edit-plan.json'))),
      baseMedia: base, caption, renderer, previousVideo: c.prior.renderer.video,
      syncComparisonVideo: (await readBound(c.sync.syncManifestBinding)).renderer.video,
      operations: {candidateDiscovery: 'not-rerun', newInternalJudgments: adopted.judgment.revision,
        apiCommunication: 'none', newMaterial: 'none', durationTarget: 'none'},
      humanDecision: {status: 'pending', questions: ['不要部分が減ったか', '文脈を失っていないか',
        '各場面の見どころが維持されているか', '全体のテンポ・見心地が改善したか', '字幕ずれが解消したか']}};
    await publish(out(c, 'manifest.json'), manifest);
    return manifest;
  } catch (error) {
    await publish(out(c, 'failure.json'), {schemaVersion: 'candidate-internal-edit-failure-v001', stage,
      message: error instanceof Error ? error.message : String(error)});
    throw error;
  }
}
async function main() {
  const [command, p] = process.argv.slice(2);
  assert(p, 'PLAN_REQUIRED');
  if (command === 'preflight') {const c = await loadInternalContextV001(p); console.log(JSON.stringify({status: 'passed', plan: c.planBinding, candidates: c.parents.length}));}
  else if (command === 'run') console.log(JSON.stringify(await executeInternalEditV001(p)));
  else throw new Error('Expected preflight or run');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error); process.exitCode = 1;});

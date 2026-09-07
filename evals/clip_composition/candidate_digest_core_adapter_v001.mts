import {
  ROOT, bind, readJson, publish, pass, fail, same,
  validateCandidateAdoptionV001, promoteCandidateAdoptionV001,
  type Context, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob}
  from './presentation_base_media_build_v003.mjs';
import {
  buildAdoptedBaseMediaV001, buildAdoptedCaptionInputsV001, validateDisplayForAdoptionV001,
  readValidatedDisplayTracesV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001,
} from './adopted_media_manufacturing_v001.mts';
export {CORE_FILES} from './adopted_media_manufacturing_v001.mts';
const out = (c: Context, p: string) => `${c.plan.outputRoot}/${p}`;

/** 保存された新規判断から採用を毎回再構築する。採用済み印だけでは製造しない。 */
export async function verifyDigestAdoptionV001(c: Context) {
  const [request, response, result, adoption, editPlan] = await Promise.all([
    readJson(out(c, 'candidate-request.json')), readJson(out(c, 'candidate-response.json')),
    readJson(out(c, 'candidate-result.json')), readJson(out(c, 'machine-adoption.json')),
    readJson(out(c, 'edit-plan.json')),
  ]);
  const expected = promoteCandidateAdoptionV001(validateCandidateAdoptionV001(c, request, response, result));
  if (!same(adoption, expected.adoption) || !same(editPlan, expected.editPlan)) fail('ADOPTION_RECONSTRUCTION_MISMATCH');
  return {adoption, editPlan};
}

/**
 * 指示-001の専用接続。旧個別人間承認job入口とそのvalidatorは呼ばない／変更しない。
 * 製造値だけは既存job schemaへ投影するが、参照先は新しい機械採用schemaのまま。
 * 人間個別承認への変換はない。実際に用いたCore製造関数・検査と専用接続の来歴を別々に束縛する。
 */
export async function buildDigestBaseMediaV001(c: Context) {
  const {adoption, editPlan} = await verifyDigestAdoptionV001(c);
  const ad = bind(out(c, 'machine-adoption.json'), adoption);
  const ep = bind(out(c, 'edit-plan.json'), editPlan);
  const source = {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
    sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo};
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${c.plan.planId}-manufacturing-values`, assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: source, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = {schemaVersion: 'candidate-digest-core-invocation-v001',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding, machineAdoptionBinding: ad,
    editPlanBinding: ep, manufacturingValuesBinding: jb,
    admission: 'candidate-digest-validated-machine-adoption-v001',
    legacyHumanApprovalJobEntry: 'not-invoked', individualCandidateHumanApproval: 'not-performed',
    adapterBinding: c.plan.implementationBindings.find((v: Json) => v.path.endsWith('candidate_digest_core_adapter_v001.mts'))};
  const invocationBinding = await publish(out(c, 'core-invocation.json'), invocation);
  return buildAdoptedBaseMediaV001(c, adoption, editPlan, manufacturingJob, jb, invocationBinding,
    {inspection: 'candidate-digest-source-inspection-v001', receipt: 'candidate-digest-base-media-validation-v001'});
}

export function buildDigestCaptionInputsV001(c: Context, adoption: Json, base: Json) {
  return buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates,
    bind(out(c, 'machine-adoption.json'), adoption), base,
    {meaning: 'candidate-digest-presentation-meaning-input-v001',
      displayRequest: 'candidate-digest-display-request-v001', sourceRole: 'digest-source'});
}
export function validateDigestDisplayV001(request: Json, response: Json, result: unknown) {
  return validateDisplayForAdoptionV001(request, response, result, 'candidate-digest-display-response-v001');
}
export async function constructDigestCaptionCoreV001(c: Context, adopted: Json, base: Json, tokens: object[]) {
  const input = buildDigestCaptionInputsV001(c, adopted, base);
  const traces = readValidatedDisplayTracesV001(input.requests, tokens);
  const coreAdoption = {schemaVersion: 'candidate-digest-caption-adoption-v001',
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adopted),
    meaningInputBinding: bind(out(c, 'meaning-input.json'), input.meaning),
    displayJudgments: traces.map((v, i) => ({candidateId: v.request.candidateId,
      request: bind(out(c, `display-${i + 1}-request.json`), v.request),
      response: bind(out(c, `display-${i + 1}-response.json`), v.response),
      result: bind(out(c, `display-${i + 1}-result.json`), v.result),
      cueEndBoundaryIds: v.cues.map((x: Json) => x.cueEndBoundaryId)})),
    composition: 'validated-display-cues-in-adopted-source-order', quality: 'not-evaluated'};
  return assembleAdoptedCaptionCoreV001(c, input, base, coreAdoption, traces);
}
export async function renderDigestV001(c: Context, artifacts: Json) {
  return renderAdoptedVideoV001(c, artifacts, 'candidate-digest-renderer-execution-v001');
}

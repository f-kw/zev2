import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, keys, type Json,
  judgeThroughStdinV001} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadInternalContextV001, verifyInternalAdoptionV001, out} from './run_candidate_internal_edit_v001.mts';
import {constructInternalCaptionCoreV001, INTERNAL_CORE_FILES, validateInternalDisplayV001}
  from './candidate_internal_edit_core_v001.mts';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {runPresentationInstructionRendererJobFileV002 as render} from './run_presentation_instruction_renderer_job_v002.ts';

const SELF = 'evals/clip_composition/resume_internal_edit_caption_v001.mts';
const PLAN = 'evals/clip_composition/jobs/presentation/candidate-internal-edit/caption-revision-plan-v001.json';
const ORIGINAL = 'evals/clip_composition/jobs/presentation/candidate-internal-edit/fixed-plan-v002.json';
const revisionRoot = (c: Json) => out(c, 'caption-revision-v001');
const originalFiles = async (c: Json) => Object.fromEntries(await Promise.all(Object.entries(INTERNAL_CORE_FILES)
  .map(async ([key, name]) => [key, bind(out(c, name), await readJson(out(c, name)))])));
export async function loadCaptionRevisionV001(planPath: string) {
  const plan = await readJson(planPath);
  assert(keys(plan, ['schemaVersion', 'originalPlan', 'failedRenderer', 'originalArtifacts',
    'displayJudgments', 'targetDisplay', 'outputRoot', 'policy', 'implementation']));
  assert.equal(plan.schemaVersion, 'candidate-internal-edit-caption-revision-plan-v001');
  assert.equal(plan.policy, 'new-display-judgment-only; immutable-meaning-cuts-base-style-and-qc; preserve-failure');
  assert.equal(plan.implementation.path, SELF);
  assert.equal(await fileSha(path.join(ROOT, SELF)), plan.implementation.fileSha256);
  const c = await loadInternalContextV001(plan.originalPlan.path);
  assert(same(c.planBinding, plan.originalPlan));
  assert.equal(plan.outputRoot, revisionRoot(c));
  assert.equal(plan.targetDisplay, 6);
  const failed = await readBound(plan.failedRenderer);
  assert.equal(failed.result.failure.stage, 'layout-preflight');
  assert.deepEqual(failed.result.failure.violations.map((v: Json) => v.code), ['LAYOUT_SAFE_AREA_VIOLATION']);
  assert(same(plan.originalArtifacts, await originalFiles(c)));
  assert(same(plan.displayJudgments, (await readBound(plan.originalArtifacts.captionAdoption)).displayJudgments));
  for (const judgment of plan.displayJudgments) for (const b of Object.values(judgment)) await readBound(b as Json);
  const baseBindings = await readJson(out(c, 'base-media-bindings.json'));
  const {schemaVersion, ...base} = baseBindings;
  assert.equal(schemaVersion, 'candidate-internal-edit-base-media-bindings-v001');
  for (const [key, b] of Object.entries(base) as [string, Json][]) {
    if (key === 'baseMedia') assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);
    else await readBound(b);
  }
  const {adoption, editPlan} = await verifyInternalAdoptionV001(c);
  return {c, plan, planBinding: bind(planPath, plan), base, adoption, editPlan};
}

/** Rebind the existing Core's result graph into a new publication directory.
 * No source text, cut, display decision, timing value, or renderer rule is invented here.
 */
export function rebindCaptionArtifactsV001(core: Json, c: Json, planBinding: Json,
  actualJudgments: Json[], targetRoot: string) {
  const replacements = new Map<string, Json>();
  for (let i = 0; i < actualJudgments.length; i++) for (const key of ['request', 'response', 'result']) {
    const from = core.captionAdoption.displayJudgments[i][key], to = actualJudgments[i][key];
    assert.equal(from.fileSha256, to.fileSha256, 'DISPLAY_BYTES_NOT_THE_ACTUAL_JUDGMENT');
    assert.equal(from.canonicalSha256, to.canonicalSha256);
    replacements.set(from.fileSha256, to);
  }
  function substitute(value: any): any {
    if (Array.isArray(value)) return value.map(substitute);
    if (!value || typeof value !== 'object') return value;
    const replacement = replacements.get(value.fileSha256);
    const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v)]));
    if (replacement) {
      if (Object.hasOwn(value, 'canonicalSha256')) assert.equal(value.canonicalSha256, replacement.originalCanonicalSha256 ?? replacement.canonicalSha256);
      result.fileSha256 = replacement.fileSha256;
      if (Object.hasOwn(value, 'path')) result.path = replacement.path;
      if (Object.hasOwn(value, 'canonicalSha256')) result.canonicalSha256 = replacement.canonicalSha256;
    }
    return result;
  }
  const revised: Json = {}, artifacts: Json = {};
  for (const [key, filename] of Object.entries(INTERNAL_CORE_FILES)) {
    const originalBinding = bind(out(c, filename), core[key]);
    const value = substitute(core[key]);
    if (key === 'captionAdoption') value.displayRevision = {planBinding,
      scope: 'display-boundaries-only; original-meaning-and-base-media-retained'};
    if (key === 'rendererJob') {
      value.jobId += '-caption-revision-v001'; value.attemptId += '-caption-revision-v001';
      value.publication = {admissionReceiptPath: `${targetRoot}/admission-receipt.json`,
        lineLayoutPath: `${targetRoot}/line-layout.json`, renderOutputRoot: `${targetRoot}/render`};
    }
    const newBinding = bind(`${targetRoot}/${filename}`, value);
    replacements.set(originalBinding.fileSha256, {...newBinding, originalCanonicalSha256: originalBinding.canonicalSha256});
    revised[key] = value; artifacts[key] = newBinding;
  }
  return {core: revised, artifacts};
}

export async function reconstructCaptionRevisionV001(planPath: string, actualJudgments: Json[]) {
  const loaded = await loadCaptionRevisionV001(planPath), {c, plan, base, adoption} = loaded;
  assert.equal(actualJudgments.length, plan.displayJudgments.length);
  for (let i = 0; i < actualJudgments.length; i++) {
    if (i !== plan.targetDisplay - 1) assert(same(actualJudgments[i], plan.displayJudgments[i]), 'UNRELATED_DISPLAY_CHANGED');
    else for (const key of ['request', 'response', 'result'])
      assert.equal(actualJudgments[i][key].path, `${plan.outputRoot}/display-${plan.targetDisplay}-${key}.json`);
  }
  const traces = await Promise.all(actualJudgments.map(async j => ({
    request: await readBound(j.request), response: await readBound(j.response), result: await readBound(j.result)})));
  const raw = await constructInternalCaptionCoreV001(c, adoption, base, traces);
  const revised = rebindCaptionArtifactsV001(raw, c, loaded.planBinding, actualJudgments, plan.outputRoot);
  assert(same(revised.core.rendererJob.cropAppliedBaseMedia, base));
  return {...loaded, ...revised};
}

async function prepare() {
  const c = await loadInternalContextV001(ORIGINAL), artifacts = await originalFiles(c);
  const failed = await readJson(out(c, 'renderer-result.json'));
  const plan = {schemaVersion: 'candidate-internal-edit-caption-revision-plan-v001', originalPlan: c.planBinding,
    failedRenderer: bind(out(c, 'renderer-result.json'), failed), originalArtifacts: artifacts,
    displayJudgments: (await readBound(artifacts.captionAdoption)).displayJudgments, targetDisplay: 6,
    outputRoot: revisionRoot(c),
    policy: 'new-display-judgment-only; immutable-meaning-cuts-base-style-and-qc; preserve-failure',
    implementation: {path: SELF, fileSha256: await fileSha(path.join(ROOT, SELF))}};
  await publish(PLAN, plan);
  await loadCaptionRevisionV001(PLAN);
  console.log(JSON.stringify({status: 'prepared', plan: bind(PLAN, plan)}));
}
async function run(planPath: string) {
  const loaded = await loadCaptionRevisionV001(planPath), {c, plan} = loaded;
  await mkdir(path.join(ROOT, plan.outputRoot));
  const prefix = `${plan.outputRoot}/display-${plan.targetDisplay}`;
  // The immutable input is deliberately identical; this is a new judgment after the saved failure.
  const request = await readBound(plan.displayJudgments[plan.targetDisplay - 1].request);
  const rb = await publish(`${prefix}-request.json`, request);
  let response: Json | undefined;
  const result = await runCaptionDisplayBoundariesV001(request.input, async input => {
    assert(same(input, request.input)); response = await judgeThroughStdinV001(request);
    await publish(`${prefix}-response.json`, response!); return response!.answer;
  });
  const resultBinding = await publish(`${prefix}-result.json`, result);
  validateInternalDisplayV001(request, response!, result);
  const judgments = structuredClone(plan.displayJudgments);
  judgments[plan.targetDisplay - 1] = {request: rb, response: bind(`${prefix}-response.json`, response!), result: resultBinding};
  const built = await reconstructCaptionRevisionV001(planPath, judgments);
  for (const [key, b] of Object.entries(built.artifacts) as [string, Json][]) await publish(b.path, built.core[key]);
  const rendered = await render(built.artifacts.rendererJob.path, {workspaceRoot: ROOT});
  const execution = await publish(`${plan.outputRoot}/renderer-result.json`, {
    schemaVersion: 'candidate-internal-edit-renderer-execution-v001', rendererJobBinding: built.artifacts.rendererJob,
    exitCode: rendered.exitCode, result: rendered.result});
  assert(rendered.exitCode === 0 && rendered.result?.status === 'completed' && rendered.result?.qc?.status === 'passed', 'REVISED_RENDER_OR_QC_FAILED');
  const renderer = {execution, admission: bind(`${plan.outputRoot}/admission-receipt.json`, await readJson(`${plan.outputRoot}/admission-receipt.json`)),
    lineLayout: bind(`${plan.outputRoot}/line-layout.json`, await readJson(`${plan.outputRoot}/line-layout.json`)), qc: 'passed',
    video: {path: `${plan.outputRoot}/render/presentation-rendered-v002.mp4`, fileSha256: await fileSha(path.join(ROOT, `${plan.outputRoot}/render/presentation-rendered-v002.mp4`))}};
  const manifest = {schemaVersion: 'candidate-internal-edit-manifest-v001', status: 'review-ready',
    planBinding: c.planBinding, machineAdoption: bind(out(c, 'machine-adoption.json'), built.adoption),
    editPlan: bind(out(c, 'edit-plan.json'), built.editPlan), baseMedia: built.base,
    caption: {artifacts: built.artifacts, displayJudgments: judgments,
      reusedSkill: c.plan.implementationBindings.find((b: Json) => b.path === 'runner/src/skills/caption-display-boundaries-v001.ts'),
      displayRevision: built.planBinding}, renderer, previousVideo: c.prior.renderer.video,
    syncComparisonVideo: (await readBound(c.sync.syncManifestBinding)).renderer.video,
    operations: {candidateDiscovery: 'not-rerun', newInternalJudgments: built.adoption.judgment.revision,
      captionDisplayJudgments: judgments.length + 1, apiCommunication: 'none', newMaterial: 'none', durationTarget: 'none'},
    humanDecision: {status: 'pending', questions: ['不要部分が減ったか', '文脈を失っていないか',
      '各場面の見どころが維持されているか', '全体のテンポ・見心地が改善したか', '字幕ずれが解消したか']}};
  await publish(out(c, 'manifest.json'), manifest);
  console.log(JSON.stringify({status: 'completed', renderer}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (process.argv[2] === 'prepare' ? prepare() : run(process.argv[3] ?? PLAN)).catch(error => {console.error(error); process.exitCode = 1;});
}

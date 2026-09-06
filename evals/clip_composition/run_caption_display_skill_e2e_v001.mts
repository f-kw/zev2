import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {
  CAPTION_DISPLAY_SKILL_V001, assertCaptionDisplayInputV001,
  assertCaptionDisplayResultV001, runCaptionDisplayBoundariesV001,
  type CaptionDisplayResultV001,
} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {assertDistantConnectionPresentationMeaningInputV001}
  from '../../runner/src/distant-connection-presentation-meaning-input-v001.js';
import {
  decodePresentationOutputFiniteJsonV001 as decode,
  serializePresentationOutputCropApplicationFormalJsonV001 as formal,
  canonicalSha256PresentationOutputFiniteJsonV001 as canonicalSha,
  sha256PresentationOutputCropApplicationBytesV001 as sha,
} from './presentation_output_crop_application_v001.mjs';
import {readPresentationMeaningWorkspaceFileStableV001 as stableRead}
  from './presentation_timeline_composition_decision_v001.mjs';
import {fileSha256V002 as fileSha} from './presentation_renderer_qc_v002.mjs';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyFileReference}
  from './presentation_first_real_data_gate_v001.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001 as validateSource}
  from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  buildPresentationCueEndProjectionV001 as cueProjection,
  buildPresentationCueEndProjectionBindingV001 as cueBinding,
  buildPresentationSemanticLineEndProjectionV001 as lineProjection,
  buildPresentationSemanticLineEndProjectionBindingV001 as lineBinding,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV002 as instructionArtifact,
  buildPresentationInstructionArtifactBindingV002 as instructionBinding,
} from './presentation_instruction_artifact_v002.mjs';
import {buildPresentationRendererLineLayoutV002 as lineLayout}
  from './presentation_renderer_line_layout_rule_v002.mjs';
import {codePointWeightV001} from './presentation_renderer_text_layout_v001.mjs';
import {validatePresentationInstructionRendererJobV002 as validateRendererJob}
  from './presentation_renderer_admission_receipt_v002.mjs';
import {
  runPresentationInstructionRendererJobFileV002 as render,
  resolvePresentationRendererAppearanceV001 as appearance,
} from './run_presentation_instruction_renderer_job_v002.ts';

type Json = Record<string, any>;
type Binding = {schemaVersion: string; path: string; fileSha256: string; canonicalSha256: string};
type ByteBinding = {path: string; fileSha256: string};
export const PLAN_SCHEMA = 'caption-display-skill-fixed-plan-v001';
const SKILL_PATH = 'runner/src/skills/caption-display-boundaries-v001.ts';
const EXECUTOR_PATH = 'evals/clip_composition/run_caption_display_skill_e2e_v001.mts';
const H = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\\)(?!.*\/\/)[A-Za-z0-9._\-/]+$/u;
const object = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: unknown, expected: string[]): v is Json => object(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const clone = <T>(v: T): T => structuredClone(v);
const same = (a: unknown, b: unknown) => canonicalSha(a) === canonicalSha(b);
function fail(code: string): never { throw new Error(`CAPTION_SKILL_E2E: ${code}`); }
const pass = (result: Json, code: string) => {
  if (!['passed', 'built', 'resolved'].includes(result?.status)) fail(`${code}: ${JSON.stringify(result)}`);
  return result;
};
export const bind = (filePath: string, value: Json): Binding => ({
  schemaVersion: value.schemaVersion, path: filePath,
  fileSha256: sha(formal(value)), canonicalSha256: canonicalSha(value),
});
function assertByteBinding(v: unknown): asserts v is ByteBinding {
  if (!keys(v, ['path', 'fileSha256']) || !WORKSPACE_PATH.test(v.path) || !H.test(v.fileSha256)) {
    fail('BYTE_BINDING_INVALID');
  }
}
function assertBinding(v: unknown): asserts v is Binding {
  if (!keys(v, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
    || !ID.test(v.schemaVersion) || !WORKSPACE_PATH.test(v.path)
    || !H.test(v.fileSha256) || !H.test(v.canonicalSha256)) fail('FORMAL_BINDING_INVALID');
}
export function assertCaptionDisplayPlanV001(plan: unknown): asserts plan is Json {
  if (!keys(plan, ['schemaVersion', 'planId', 'request', 'skill', 'adoptionPolicy',
    'implementationBindings', 'outputRoot', 'priorJudgment']) || plan.schemaVersion !== PLAN_SCHEMA
    || !ID.test(plan.planId) || !WORKSPACE_PATH.test(plan.outputRoot)
    || !plan.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-caption-display-skill-')
    || !keys(plan.request, ['purpose', 'caseId', 'meaningInput', 'sourcePackage', 'baseMedia',
      'rendererTemplate', 'baselineVideo', 'sourceVideo'])
    || typeof plan.request.purpose !== 'string' || !plan.request.purpose.length
    || !ID.test(plan.request.caseId)
    || !same(plan.skill, {id: CAPTION_DISPLAY_SKILL_V001.id, version: 'v001',
      judgmentMode: 'current-codex-stdin-v001', apiCommunication: 'forbidden'})
    || plan.adoptionPolicy !== 'validated-boundaries-for-review-only-v001'
    || !Array.isArray(plan.implementationBindings) || plan.implementationBindings.length !== 2) {
    fail('PLAN_INVALID');
  }
  for (const [index, expected] of [SKILL_PATH, EXECUTOR_PATH].entries()) {
    assertByteBinding(plan.implementationBindings[index]);
    if (plan.implementationBindings[index].path !== expected) fail('IMPLEMENTATION_PATH_INVALID');
  }
  if (plan.priorJudgment !== null) {
    if (!keys(plan.priorJudgment, ['planSnapshot', 'request', 'response', 'result'])) fail('PRIOR_JUDGMENT_INVALID');
    for (const v of Object.values(plan.priorJudgment)) assertBinding(v);
  }
  for (const name of ['meaningInput', 'sourcePackage', 'rendererTemplate']) assertBinding(plan.request[name]);
  for (const name of ['baselineVideo', 'sourceVideo']) assertByteBinding(plan.request[name]);
  if (!keys(plan.request.baseMedia, ['media', 'timeline', 'generationManifest', 'validationReceipt'])) {
    fail('BASE_MEDIA_BINDING_INVALID');
  }
  assertByteBinding(plan.request.baseMedia.media);
  for (const name of ['timeline', 'generationManifest', 'validationReceipt']) {
    assertBinding(plan.request.baseMedia[name]);
  }
}
async function readBound(root: string, binding: Binding) {
  assertBinding(binding);
  const bytes = await stableRead({workspaceRoot: root, relativePath: binding.path});
  const d = decode(bytes);
  if (sha(bytes) !== binding.fileSha256 || d.status !== 'decoded'
    || !same(bind(binding.path, d.value), binding)) fail('PROVENANCE_MISMATCH');
  return d.value;
}
async function readJson(root: string, filePath: string) {
  const bytes = await stableRead({workspaceRoot: root, relativePath: filePath});
  const d = decode(bytes);
  if (d.status !== 'decoded') fail('FORMAL_JSON_INVALID');
  return d.value;
}
async function verifyByte(root: string, binding: ByteBinding) {
  assertByteBinding(binding);
  if (path.resolve(root) !== path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')) {
    fail('WORKSPACE_MISMATCH');
  }
  // 既存のstreaming検査は大容量かつhardlink済み元媒体も一括読込せず照合する。
  await verifyFileReference(binding);
}

/** 固定済みZEVGと表示入力の閉包。Skillへ渡すのは本文側のみ。 */
export async function loadCaptionDisplayContextV001(root: string, planPath: string) {
  const plan = await readJson(root, planPath);
  assertCaptionDisplayPlanV001(plan);
  const planBinding = bind(planPath, plan);
  const [sourcePackage, meaning, timeline, rendererTemplate] = await Promise.all([
    readBound(root, plan.request.sourcePackage), readBound(root, plan.request.meaningInput),
    readBound(root, plan.request.baseMedia.timeline), readBound(root, plan.request.rendererTemplate),
  ]);
  await Promise.all([
    ...plan.implementationBindings.map((v: ByteBinding) => verifyByte(root, v)),
    verifyByte(root, plan.request.baseMedia.media), verifyByte(root, plan.request.baselineVideo),
    verifyByte(root, plan.request.sourceVideo),
    readBound(root, plan.request.baseMedia.generationManifest),
    readBound(root, plan.request.baseMedia.validationReceipt),
  ]);
  pass(validateSource(sourcePackage), 'SOURCE_INVALID');
  assertDistantConnectionPresentationMeaningInputV001(meaning);
  assertCaptionDisplayInputV001(sourcePackage.promptInput);
  pass(validateRendererJob(rendererTemplate), 'RENDERER_TEMPLATE_INVALID');
  // このexecutorの技法adapterは既存二場面入力だけ。Skillの問いに技法分岐を入れない。
  const mapped = sourcePackage.reconstructionMap;
  if (meaning.candidateId !== plan.request.caseId || mapped.captions.length !== 1
    || mapped.caseContexts.length !== 1 || mapped.caseContexts[0].caseId !== plan.request.caseId
    || !same(mapped.meaningPackageBindings, [plan.request.meaningInput])
    || !same(mapped.caseContexts[0].meaningPackageBinding, plan.request.meaningInput)
    || !same(mapped.caseContexts[0].baseMediaInput, {
      baseMedia: plan.request.baseMedia.media, timeline: plan.request.baseMedia.timeline,
      generationManifest: plan.request.baseMedia.generationManifest,
      validationReceipt: plan.request.baseMedia.validationReceipt,
    })) fail('INPUT_CLOSURE_MISMATCH');
  const caption = meaning.captions[0];
  const inputCaption = sourcePackage.promptInput.captions[0];
  const reconstruction = mapped.captions[0];
  if (reconstruction.semanticCaptionId !== caption.captionId
    || !same(reconstruction.atomOccurrenceIds, caption.atomOccurrenceIds)
    || inputCaption.boundaryCandidates.length !== meaning.atomOccurrences.length
    || inputCaption.boundaryCandidates.map((v: Json) => v.text).join('') !== caption.text) {
    fail('INPUT_TEXT_MISMATCH');
  }
  meaning.atomOccurrences.forEach((atom: Json, i: number) => {
    const boundary = reconstruction.boundaries[i];
    if (inputCaption.boundaryCandidates[i].text !== atom.text || boundary.ordinal !== i + 1
      || boundary.afterAtomOccurrenceId !== atom.atomOccurrenceId
      || boundary.boundaryId !== inputCaption.boundaryCandidates[i].boundaryId) {
      fail('INPUT_ATOM_MISMATCH');
    }
  });
  const style = await readBound(root, rendererTemplate.registryBindings.styleProfileRegistry);
  const trust = await readBound(root, rendererTemplate.registryBindings.rendererTrust);
  let priorJudgment: Json | null = null;
  if (plan.priorJudgment !== null) {
    priorJudgment = Object.fromEntries(await Promise.all(Object.entries(plan.priorJudgment)
      .map(async ([name, binding]) => [name, await readBound(root, binding as Binding)])));
    const previous = priorJudgment.planSnapshot;
    const request = priorJudgment.request;
    // 描画準備失敗からの再開だけ。新しい判断の呼出・回答の書換えには数えない。
    if (!same(previous.request, plan.request) || !same(previous.skill, plan.skill)
      || previous.planId !== plan.planId || previous.adoptionPolicy !== plan.adoptionPolicy
      || !same(previous.implementationBindings[0], plan.implementationBindings[0])
      || request.planBinding.fileSha256 !== plan.priorJudgment.planSnapshot.fileSha256
      || request.planBinding.canonicalSha256 !== plan.priorJudgment.planSnapshot.canonicalSha256
      || !same(request.input, sourcePackage.promptInput)
      || request.inputCanonicalSha256 !== canonicalSha(sourcePackage.promptInput)) fail('PRIOR_JUDGMENT_INPUT_MISMATCH');
  }
  return {root, plan, planBinding, sourcePackage, meaning, timeline, rendererTemplate, style, trust, priorJudgment};
}
export type CaptionDisplayContextV001 = Awaited<ReturnType<typeof loadCaptionDisplayContextV001>>;

/** 一回の判断呼出の入力を先に固定する。過去selectionはここへ渡さない。 */
export function buildCaptionDisplayJudgmentRequestV001(context: CaptionDisplayContextV001) {
  return {
    schemaVersion: 'caption-display-skill-judgment-request-v001',
    requestId: `${context.plan.planId}-judgment`,
    planBinding: clone(context.planBinding),
    skill: clone(context.plan.skill),
    input: clone(context.sourcePackage.promptInput),
    inputCanonicalSha256: canonicalSha(context.sourcePackage.promptInput),
  };
}
const target = (c: CaptionDisplayContextV001, filename: string) => `${c.plan.outputRoot}/${filename}`;

// 検査済み結果をコピーしたJSONや生Skill resultでは昇格できない。内部に不変snapshotを保持する。
const validated = new WeakMap<object, {context: CaptionDisplayContextV001; adoption: Json; artifacts: Json}>();
export type ValidatedCaptionDisplayV001 = Readonly<{status: 'validated-for-review'}>;

function constructArtifacts(context: CaptionDisplayContextV001, result: CaptionDisplayResultV001, adoption: Json) {
  const {plan, meaning, timeline, rendererTemplate} = context;
  const producer = bind(target(context, 'validation-and-adoption.json'), adoption);
  const sourcePackage = clone(context.sourcePackage);
  sourcePackage.packageId = `${plan.planId}-source-package`;
  sourcePackage.provenance = {
    sourcePackageJobBinding: context.planBinding,
    implementationBindings: plan.implementationBindings.map((v: ByteBinding, i: number) => ({
      role: i === 0 ? 'caption-display-skill-v001' : 'caption-display-skill-executor-v001', ...v,
    })),
    approvedContractBindings: [plan.request.meaningInput],
  };
  pass(validateSource(sourcePackage), 'PROMOTED_SOURCE_INVALID');
  const sourceBinding = bind(target(context, 'source-package.json'), sourcePackage);
  const answer = result.answer as Json;
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${plan.planId}-selection`, sourcePackageBinding: sourceBinding,
    response: {captions: clone(answer.captions)},
  };
  const selectedBinding = bind(target(context, 'selection.json'), selection);
  const digest = {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: selectedBinding.fileSha256, canonicalSha256: selectedBinding.canonicalSha256};
  const cue = pass(cueProjection({projectionId: `${plan.planId}-cue-end`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: digest, producerJobBinding: producer, sourcePackage, selection}), 'CUE_INVALID').projection;
  const cb = cueBinding({path: target(context, 'cue-end-projection.json'), projection: cue});
  const line = pass(lineProjection({projectionId: `${plan.planId}-line-end`, sourcePackageBinding: sourceBinding,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: producer,
    sourcePackage, selection, cueEndProjection: cue}), 'LINE_INVALID').projection;
  const lb = lineBinding({path: target(context, 'line-end-projection.json'), projection: line});
  const instruction = pass(instructionArtifact({artifactId: `${plan.planId}-instruction`,
    sourceCaseId: plan.request.caseId, meaningInformationPackageBinding: plan.request.meaningInput,
    timelineBinding: plan.request.baseMedia.timeline, cueEndProjectionBinding: cb,
    producerJobBinding: producer,
    styleProfileId: sourcePackage.reconstructionMap.caseContexts[0].resolvedStyle.presetId,
    meaningPackage: meaning, timeline, cueEndProjection: cue}), 'INSTRUCTION_INVALID').artifact;
  const ib = instructionBinding({path: target(context, 'instruction.json'), artifact: instruction});
  const resolved = pass(appearance({instructionArtifact: instruction, styleProfileRegistry: context.style,
    visualStateId: rendererTemplate.executionInputs.visualStateId}), 'STYLE_INVALID');
  const width = resolved.profile.maxLogicalWidth ?? resolved.visualState.layout?.maxCharsPerLine;
  const maxLines = resolved.profile.maxLines ?? resolved.visualState.layout?.maxLines;
  const limits = sourcePackage.promptInput.styleLimits;
  if (limits.maxLogicalWidthPerLine !== width || limits.maxLinesPerCue !== maxLines
    || limits.characterWidthRule !== context.trust.layoutRules.characterWidthRule) fail('STYLE_LIMIT_MISMATCH');
  pass(lineLayout({layoutId: `${plan.planId}-validation-layout`, instructionArtifactBinding: ib,
    instructionArtifact: instruction, meaningPackage: meaning, lineEndProjection: line,
    lineEndSourcePackage: sourcePackage, maxLogicalWidth: width, maxLines,
    characterWidthRule: limits.characterWidthRule,
    lineLayoutRules: rendererTemplate.executionInputs.lineLayoutRules}), 'LAYOUT_INVALID');
  // 既存規約「一行に収まる本文を改行しない」。幅の計算規則も既存実装を使用する。
  instruction.instructions.forEach((row: Json, i: number) => {
    const w = [...row.content.text].reduce((sum, char) => sum + codePointWeightV001(char, limits.characterWidthRule), 0);
    if (w <= width && answer.captions[0].cues[i].lineEndBoundaryIds.length !== 1) fail('UNNECESSARY_LINE_BREAK');
  });
  const rendererJob = clone(rendererTemplate);
  rendererJob.jobId = `${plan.planId}-renderer`;
  rendererJob.attemptId = plan.planId;
  rendererJob.instructionArtifactBinding = ib;
  rendererJob.lineEndProjectionBinding = lb;
  rendererJob.cropAppliedBaseMedia = {baseMedia: plan.request.baseMedia.media,
    timeline: plan.request.baseMedia.timeline, generationManifest: plan.request.baseMedia.generationManifest,
    validationReceipt: plan.request.baseMedia.validationReceipt};
  rendererJob.publication = {admissionReceiptPath: target(context, 'admission-receipt.json'),
    lineLayoutPath: target(context, 'line-layout.json'), renderOutputRoot: target(context, 'render')};
  pass(validateRendererJob(rendererJob), 'RENDERER_JOB_INVALID');
  return {sourcePackage, selection, cueEndProjection: cue, lineEndProjection: line, instruction, rendererJob};
}

/** strict検査後、固定planのreview用採用規則だけを適用。品質の合格は決めない。 */
export function validateAndAdoptCaptionDisplayV001(context: CaptionDisplayContextV001,
  request: Json, response: Json, result: unknown): ValidatedCaptionDisplayV001 {
  const c = clone(context);
  assertCaptionDisplayPlanV001(c.plan);
  assertCaptionDisplayResultV001(result);
  const r = clone(result);
  if (c.priorJudgment !== null && (!same(response, c.priorJudgment.response)
    || !same(r, c.priorJudgment.result))) fail('PRIOR_JUDGMENT_PROVENANCE_MISMATCH');
  if (!same(request, c.priorJudgment?.request ?? buildCaptionDisplayJudgmentRequestV001(c))
    || !keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'caption-display-skill-judgment-response-v001'
    || response.requestFileSha256 !== sha(formal(request))
    || typeof response.judgmentNote !== 'string' || !response.judgmentNote.length
    || !same(response.answer, r.answer)) fail('JUDGMENT_PROVENANCE_MISMATCH');
  if ((r.answer as Json).status === 'abstained') fail('SKILL_ABSTAINED');
  const adoption = {
    schemaVersion: 'caption-display-skill-validation-adoption-v001',
    planBinding: c.planBinding,
    requestBinding: bind(target(c, 'judgment-request.json'), request),
    responseBinding: bind(target(c, 'judgment-response.json'), response),
    resultBinding: bind(target(c, 'skill-result.json'), r),
    priorJudgmentBindings: clone(c.plan.priorJudgment),
    inputCanonicalSha256: request.inputCanonicalSha256,
    validation: {input: 'passed', output: 'passed', sourceClosure: 'passed',
      boundaryMembershipOrderCoverage: 'passed', lineLayout: 'passed', provenance: 'passed'},
    adoption: {policy: c.plan.adoptionPolicy, purpose: 'human-review', quality: 'not-evaluated'},
  };
  // 組立ては検査用のメモリ内候補。全検査成功前には公開しない。
  const artifacts = constructArtifacts(c, r, adoption);
  const token = Object.freeze({status: 'validated-for-review' as const});
  validated.set(token, {context: c, adoption, artifacts});
  return token;
}
export function promoteCaptionDisplayV001(token: ValidatedCaptionDisplayV001) {
  const v = validated.get(token);
  if (!v) fail('VALIDATED_ADOPTION_REQUIRED');
  return clone({adoption: v.adoption, ...v.artifacts});
}

const ARTIFACT_NAMES = {sourcePackage: 'source-package.json', selection: 'selection.json',
  cueEndProjection: 'cue-end-projection.json', lineEndProjection: 'line-end-projection.json',
  instruction: 'instruction.json', rendererJob: 'renderer-job.json'};
async function publish(root: string, relative: string, value: Json) {
  const bytes = formal(value);
  await writeFile(path.join(root, relative), bytes, {flag: 'wx'});
  const reread = await stableRead({workspaceRoot: root, relativePath: relative});
  if (!bytes.equals(reread)) fail('PUBLICATION_MISMATCH');
  return bind(relative, value);
}

/** stdinは新規のCodex判断の受渡し口。API client/自動回答/保存回答fallbackを持たない。 */
async function judgeThroughStdin(request: Json): Promise<Json> {
  process.stdout.write(`${JSON.stringify({event: 'caption-skill-judgment-required',
    requestFileSha256: sha(formal(request)), request})}\n`);
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
  try {
    for await (const line of lines) {
      const value = JSON.parse(line);
      if (!object(value)) fail('JUDGMENT_ENVELOPE_INVALID');
      return value;
    }
    return fail('JUDGMENT_INPUT_CLOSED');
  } finally { lines.close(); }
}
export async function executeCaptionDisplaySkillE2EV001(root: string, planPath: string) {
  const c = await loadCaptionDisplayContextV001(root, planPath);
  // 新しい出力rootを排他的に作る。既存の出力には入らない。
  await mkdir(path.join(root, c.plan.outputRoot));
  const request = c.priorJudgment?.request ?? buildCaptionDisplayJudgmentRequestV001(c);
  const requestBinding = await publish(root, target(c, 'judgment-request.json'), request);
  let response: Json | undefined = c.priorJudgment?.response;
  const result = c.priorJudgment?.result ?? await runCaptionDisplayBoundariesV001(request.input, async input => {
    if (!same(input, request.input)) fail('SKILL_INPUT_CHANGED');
    response = await judgeThroughStdin(request);
    // 受信した回答を検査前にformal JSONで保存。B6由来と称さない。
    await publish(root, target(c, 'judgment-response.json'), response);
    return response.answer;
  });
  if (c.priorJudgment !== null) {
    // 元実行の検査前回答・権限なしresultを同じbyteで保持し、その由来をmanifestへ残す。
    await publish(root, target(c, 'judgment-response.json'), response!);
  }
  const resultBinding = await publish(root, target(c, 'skill-result.json'), result);
  const current = await loadCaptionDisplayContextV001(root, planPath);
  if (!same(c.planBinding, current.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
  const token = validateAndAdoptCaptionDisplayV001(current, request, response!, result);
  const promoted = promoteCaptionDisplayV001(token);
  const adoptionBinding = await publish(root, target(c, 'validation-and-adoption.json'), promoted.adoption);
  const artifacts: Json = {};
  for (const [name, filename] of Object.entries(ARTIFACT_NAMES)) {
    artifacts[name] = await publish(root, target(c, filename), promoted[name]);
  }
  const outcome = await render(artifacts.rendererJob.path, {workspaceRoot: root});
  const rendererResult = {schemaVersion: 'caption-display-skill-renderer-execution-v001',
    rendererJobBinding: artifacts.rendererJob, exitCode: outcome.exitCode, result: outcome.result};
  const rendererResultBinding = await publish(root, target(c, 'renderer-result.json'), rendererResult);
  if (outcome.exitCode !== 0 || outcome.result?.status !== 'completed'
    || outcome.result?.qc?.status !== 'passed') fail('RENDER_OR_QC_FAILED');
  const videoPath = target(c, 'render/presentation-rendered-v002.mp4');
  const manifest = {
    schemaVersion: 'caption-display-skill-e2e-manifest-v001', status: 'review-ready',
    planBinding: c.planBinding, judgment: {mode: c.priorJudgment === null
      ? c.plan.skill.judgmentMode : 'resume-original-current-codex-judgment-v001',
      priorJudgmentBindings: clone(c.plan.priorJudgment),
      request: requestBinding, response: bind(target(c, 'judgment-response.json'), response!), result: resultBinding},
    validationAndAdoption: adoptionBinding, promoted: artifacts,
    renderer: {execution: rendererResultBinding,
      admission: bind(target(c, 'admission-receipt.json'), await readJson(root, target(c, 'admission-receipt.json'))),
      lineLayout: bind(target(c, 'line-layout.json'), await readJson(root, target(c, 'line-layout.json'))),
      qc: 'passed', video: {path: videoPath, fileSha256: await fileSha(path.join(root, videoPath))}},
    comparison: {baseline: c.plan.request.baselineVideo, original: c.plan.request.sourceVideo,
      sourceIntervals: c.meaning.orderedParts.map((v: Json) => v.sourceInterval),
      humanDecision: 'pending'},
    limits: {apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'},
  };
  await publish(root, target(c, 'manifest.json'), manifest);
  return manifest;
}

export async function verifyCaptionDisplaySkillE2EV001(root: string, manifestPath: string) {
  const m = await readJson(root, manifestPath);
  if (m.schemaVersion !== 'caption-display-skill-e2e-manifest-v001' || m.status !== 'review-ready') {
    fail('MANIFEST_INVALID');
  }
  await readBound(root, m.planBinding);
  const c = await loadCaptionDisplayContextV001(root, m.planBinding.path);
  const request = await readBound(root, m.judgment.request);
  const response = await readBound(root, m.judgment.response);
  const result = await readBound(root, m.judgment.result);
  const promoted = promoteCaptionDisplayV001(validateAndAdoptCaptionDisplayV001(c, request, response, result));
  if (!same(promoted.adoption, await readBound(root, m.validationAndAdoption))) fail('ADOPTION_MISMATCH');
  for (const name of Object.keys(ARTIFACT_NAMES)) {
    if (!same(promoted[name], await readBound(root, m.promoted[name]))) fail('PROMOTION_MISMATCH');
  }
  const execution = await readBound(root, m.renderer.execution);
  if (execution.exitCode !== 0 || execution.result?.qc?.status !== 'passed'
    || execution.result?.status !== 'completed' || !same(execution.rendererJobBinding, m.promoted.rendererJob)) {
    fail('QC_MISMATCH');
  }
  await readBound(root, m.renderer.admission);
  await readBound(root, m.renderer.lineLayout);
  await verifyByte(root, m.renderer.video);
  await verifyByte(root, m.comparison.baseline);
  await verifyByte(root, m.comparison.original);
  return {status: 'passed', deterministicPromotion: 'exact', video: m.renderer.video, humanQuality: 'pending'};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, file] = process.argv.slice(2);
  const task = action === 'run' ? executeCaptionDisplaySkillE2EV001(process.cwd(), file)
    : action === 'verify' ? verifyCaptionDisplaySkillE2EV001(process.cwd(), file)
      : action === 'preflight' ? loadCaptionDisplayContextV001(process.cwd(), file).then(c => ({
        status: 'passed', plan: c.planBinding, inputCanonicalSha256: canonicalSha(c.sourcePackage.promptInput),
      })) : Promise.reject(new Error('action: preflight | run | verify'));
  task.then(result => process.stdout.write(`${JSON.stringify(result)}\n`)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;
  });
}

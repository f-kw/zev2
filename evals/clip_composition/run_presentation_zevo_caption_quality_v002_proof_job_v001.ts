import {spawnSync} from 'node:child_process';
import {constants as fsConstants} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROOF_JOB_SCHEMA = 'presentation-zevo-caption-quality-v002-proof-job-v001';
const OUTPUT_REQUEST_SCHEMA = 'presentation-zevo-caption-quality-v002-output-request-v001';
const REVIEW_INPUT_SCHEMA = 'presentation-zevo-caption-quality-v002-review-input-v001';
const COMPLETION_SCHEMA = 'presentation-zevo-caption-quality-v002-completion-report-v001';
const REJECTION_SCHEMA = 'presentation-zevo-caption-quality-v002-rejection-report-v001';
const FATAL_SCHEMA = 'presentation-zevo-caption-quality-v002-fatal-observation-v001';
const CLI_SCHEMA = 'presentation-zevo-caption-local-cli-result-v001';
const MODULE_PATH = 'evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts';
const MODULE_ABSOLUTE = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(MODULE_ABSOLUTE), '../..');
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const clone = value => structuredClone(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : isObject(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const canonicalSha = value => sha256(Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'));
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const absoluteWorkspacePath = relativePath => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new TypeError('workspace path is invalid');
  const absolute = path.resolve(WORKSPACE_ROOT, relativePath);
  if (!absolute.startsWith(`${WORKSPACE_ROOT}${path.sep}`)) throw new TypeError('workspace path escapes root');
  return absolute;
};
const workspaceRelative = absolute => path.relative(WORKSPACE_ROOT, absolute).split(path.sep).join('/');

const CASES = Object.freeze([
  Object.freeze({caseId: 'voice-013', inputCaptionId: 'input-caption-000001', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013'}),
  Object.freeze({caseId: 'voice-067', inputCaptionId: 'input-caption-000002', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067'}),
  Object.freeze({caseId: 'voice-190', inputCaptionId: 'input-caption-000003', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190'}),
]);
const RUNTIME_KEYS = Object.freeze(['node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick']);
const RUNTIME_BINDINGS = Object.freeze({
  node: Object.freeze({
    path: '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node',
    fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c',
  }),
  tsx: Object.freeze({
    path: '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs',
    fileSha256: '5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8',
  }),
  remotion: Object.freeze({
    path: '/Users/kawafmm/workspace/zev2/runner/node_modules/@remotion/cli/remotion-cli.js',
    fileSha256: 'a10a711f052487d302dcf52dc08729c84c4deca0dc41c5b708edd1a7b7b48bfa',
  }),
  browser: Object.freeze({
    path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    fileSha256: 'ee37661755341e9fc1babf9c20ec09d6a36e50aa8713ceb08082f8bbe2d8217d',
  }),
  ffmpeg: Object.freeze({
    path: '/opt/homebrew/bin/ffmpeg',
    fileSha256: 'd105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798',
  }),
  ffprobe: Object.freeze({
    path: '/opt/homebrew/bin/ffprobe',
    fileSha256: 'dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9',
  }),
  imageMagick: Object.freeze({
    path: '/opt/homebrew/bin/magick',
    fileSha256: '78311032c39a3192ad4ed34ffdf6aab60e21b8e635005f9398095d73c9bd7a29',
  }),
});
const CONTRACT_BINDINGS = Object.freeze([
  ['caption-quality-atomic-publication-b6-owner-scope-revision-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['caption-quality-b6-credential-unavailable-owner-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['caption-quality-complete-implementation-design', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['caption-quality-complete-implementation-design-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['caption-quality-dependency-load-stage-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['caption-quality-dependency-unit-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['caption-quality-formal-capability-read-entry-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['caption-quality-fu-fixture-manufacturing-contract-design', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md', '8312ab82095dec1e0fd96fea00f6c5e61e04997ae0a9956799fe2b30be17b554'],
  ['caption-quality-parent-contract', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['caption-quality-pre-staging-inner-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['caption-quality-proof-capability-and-tsx-namespace-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['caption-quality-resolved-url-evaluation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['caption-quality-runtime-live-binding-separation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['caption-quality-selection-runtime-value-wiring-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['caption-quality-source-final-package-validator-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['caption-quality-tsx-wrapper-descriptor-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
  ['rendering-decoupling-contract-design-v001', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md', 'aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94'],
  ['rendering-decoupling-contract-addendum-v001', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md', '2643e7bf7ad8cdac6dd81a4fa1f1bb5c884b6f2968ec4db465554ad91bee1fad'],
  ['rendering-decoupling-contract-addendum-v002', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v002.md', 'f19a0ff9a27de640959bbbc81fcf7920b63f7a0c19354bc7bf7c6b2a5fcdf47b'],
  ['rendering-decoupling-contract-addendum-v003', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260818-v003.md', 'cd4bfb75f8dfe0aec325ee8ae79cb136908ea7fa7e5fd2e610a430bfb4d1b16d'],
  ['rendering-decoupling-contract-addendum-v004', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md', '8321a7ba99672af164f6a66285a3802f05b7f876e6c4fbf94e4211b0524f4d36'],
].map(([role, bindingPath, fileSha256]) => Object.freeze({role, path: bindingPath, fileSha256})));

export const PRESENTATION_ZEVO_CAPTION_RENDERER_TRUST_RUNTIME_BINDING_V002 = Object.freeze({
  role: 'presentation-renderer-trust-v002',
  path: 'evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json',
  fileSha256: '6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a',
});

const PROOF_IMPLEMENTATION_ROLE_PATHS = Object.freeze([
  ['atomic-directory-publisher-adapter-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
  ['atomic-directory-publisher-native-darwin-arm64-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64'],
  ['atomic-directory-publisher-native-source-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.c'],
  ['caption-cue-selection', 'evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs'],
  ['caption-cue-source-contract', 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs'],
  ['dep-base-media-timeline-v002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['dep-caption-contract-v002', 'evals/clip_composition/presentation_caption_contract_v002.mjs'],
  ['dep-caption-contract-v003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['dep-caption-display-pair-v003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['dep-caption-display-pair-v004', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['dep-caption-semantic-output-v001', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['dep-fatal-observation-v002', 'evals/clip_composition/presentation_fatal_observation_v002.mjs'],
  ['dep-formal-json-codec', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['dep-inspect-preset-layout', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['dep-instruction-contract-v002', 'evals/clip_composition/presentation_instruction_contract_v002.mjs'],
  ['dep-instruction-contract-v003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['dep-instruction-contract-v004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['dep-meaning-package-v001', 'evals/clip_composition/presentation_meaning_information_package_v001.mjs'],
  ['dep-meaning-package-v002', 'evals/clip_composition/presentation_a_meaning_information_package_v002.mjs'],
  ['dep-output-base-media-v001', 'evals/clip_composition/presentation_output_base_media_v001.mjs'],
  ['dep-output-contract-v001', 'evals/clip_composition/presentation_output_contract_v001.mjs'],
  ['dep-output-crop-application-v001', 'evals/clip_composition/presentation_output_crop_application_v001.mjs'],
  ['dep-page-line-planner-v001', 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'],
  ['dep-page-line-planner-v002', 'evals/clip_composition/presentation_output_page_line_planner_v002.mjs'],
  ['dep-piecewise-timeline-v002', 'evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs'],
  ['dep-render-plan-v001', 'evals/clip_composition/presentation_output_render_plan_v001.mjs'],
  ['dep-render-plan-v002', 'evals/clip_composition/presentation_output_render_plan_v002.mjs'],
  ['dep-renderer-core-v002', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['dep-renderer-plan-v002', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
  ['dep-renderer-qc-v002', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['dep-renderer-text-layout-v001', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['instruction-renderer-runner-v001', 'evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts'],
  ['presentation-cue-end-projection-v001', 'evals/clip_composition/presentation_cue_end_projection_v001.mjs'],
  ['presentation-instruction-artifact-v001', 'evals/clip_composition/presentation_instruction_artifact_v001.mjs'],
  ['presentation-renderer-admission-v001', 'evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs'],
  ['presentation-renderer-line-layout-v001', 'evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs'],
  ['presentation-renderer-process-observation-v001', 'evals/clip_composition/presentation_renderer_process_observation_v001.mjs'],
  ['dep-retained-source-atoms-v001', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['dep-segmenter-boundary-evidence-v001', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['dep-segmenter-boundary-preflight-v001', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['dep-source-sequence-v002', 'evals/clip_composition/presentation_a_source_sequence_v002.mjs'],
  ['dep-source-speaker-policy-v001', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['dep-style-resolver-v001', 'evals/clip_composition/presentation_output_style_resolver_v001.ts'],
  ['dep-telop-glow', 'runner/src/shared/telop-glow.ts'],
  ['dep-telop-line-break', 'runner/src/telop/telop-line-break.ts'],
  ['dep-telop-render-model', 'runner/src/telop/telop-render-model.ts'],
  ['dep-text-metrics', 'runner/src/telop/text-metrics.ts'],
  ['dep-timeline-composition-decision-v001', 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'],
  ['dep-vertical-review-renderer-v001', 'evals/clip_composition/render_presentation_vertical_review_v001.ts'],
  ['layout-inspector-v001', 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'],
  ['page-line-planner-v003', 'evals/clip_composition/presentation_output_page_line_planner_v003.mjs'],
  ['proof-runner', MODULE_PATH],
  ['render-plan-v003', 'evals/clip_composition/presentation_output_render_plan_v003.mjs'],
  ['renderer-entry-v001', 'evals/clip_composition/presentation_renderer_entry_v001.tsx'],
  ['renderer-telop-font', 'runner/src/remotion/utils/telop-font.ts'],
  ['renderer-telop-text', 'runner/src/remotion/components/TelopText.tsx'],
  ['review-ui', 'evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs'],
].sort(([leftRole, leftPath], [rightRole, rightPath]) => leftRole.localeCompare(rightRole) || leftPath.localeCompare(rightPath)));

const validateFormalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const validateByteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const validateImplementationBinding = value => exactKeys(value, ['role', 'path', 'fileSha256'])
  && nonempty(value.role) && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const validateRuntimeProfile = value => exactKeys(value, RUNTIME_KEYS)
  && RUNTIME_KEYS.every(key => exactKeys(value[key], ['path', 'fileSha256'])
    && path.isAbsolute(value[key].path) && SHA256.test(value[key].fileSha256)
    && value[key].path === RUNTIME_BINDINGS[key].path
    && value[key].fileSha256 === RUNTIME_BINDINGS[key].fileSha256);

export const derivePresentationZevoCaptionQualityV002ExecutionPathsV001 = input => {
  if (!exactKeys(input, ['jobId', 'attemptId', 'proofOutputRoot', 'cases', 'rendererWorkParent'])
    || !FORMAL_ID.test(input.jobId)
    || !FORMAL_ID.test(input.attemptId)
    || !WORKSPACE_PATH.test(input.proofOutputRoot)
    || !WORKSPACE_PATH.test(input.rendererWorkParent)
    || !dense(input.cases)
    || input.cases.length !== CASES.length
    || !input.cases.every((entry, index) => exactKeys(entry, ['caseId'])
      && entry.caseId === CASES[index].caseId)) {
    throw new TypeError('caption quality execution path projection input is invalid');
  }
  const proofStagingRoot = `${input.proofOutputRoot}.staging`;
  const rendererExecutionScopeRoot = `${input.rendererWorkParent}/.${input.jobId}-${input.attemptId}`;
  const cases = input.cases.map(({caseId}) => {
    const proofCaseRoot = `${input.proofOutputRoot}/${caseId}/horizontal-formal`;
    const proofStagingCaseRoot = `${proofStagingRoot}/${caseId}/horizontal-formal`;
    const rendererCaseParent = `${rendererExecutionScopeRoot}/${caseId}`;
    const rendererOutputRoot = `${rendererCaseParent}/horizontal-formal`;
    return Object.freeze({
      caseId,
      proofCaseRoot,
      proofStagingCaseRoot,
      rendererCaseParent,
      rendererOutputRoot,
      rendererLockRoot: `${rendererCaseParent}/.horizontal-formal.presentation-renderer-v002.lock`,
      rendererWorkPrefixParent: rendererCaseParent,
      rendererWorkPrefix: '.horizontal-formal.presentation-renderer-v002-work-',
    });
  });
  return Object.freeze({
    proofOutputRoot: input.proofOutputRoot,
    proofStagingRoot,
    proofReviewRoot: `${input.proofOutputRoot}/review`,
    proofStagingReviewRoot: `${proofStagingRoot}/review`,
    rendererExecutionScopeRoot,
    cases: Object.freeze(cases),
  });
};
const validateCase = value => exactKeys(value, ['caseId', 'inputCaptionId', 'candidateId'])
  && nonempty(value.caseId) && nonempty(value.inputCaptionId) && nonempty(value.candidateId);
const exactBindingSet = (bindings, expected, withFixedSha = false) => dense(bindings)
  && bindings.length === expected.length
  && bindings.every((binding, index) => validateImplementationBinding(binding)
    && binding.role === expected[index][0]
    && binding.path === expected[index][1]
    && (!withFixedSha || binding.fileSha256 === expected[index][2]));

const violation = (code, pointer, relatedPaths = []) => Object.freeze({
  code,
  path: pointer,
  relatedPaths: Object.freeze([...relatedPaths].sort()),
});
const rejectedValidation = (code, pointer) => Object.freeze({
  status: 'rejected', violations: Object.freeze([violation(code, pointer)]),
});

export function validatePresentationZevoCaptionQualityV002ProofJobV001(value) {
  const violations = [];
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'attemptId', 'sourcePackageBinding', 'selectionBinding',
    'selectionReportBinding', 'cases', 'runtimeProfile', 'runtimeDataBindings',
    'outputRoot', 'implementationBindings', 'approvedContractBindings',
  ])) violations.push(violation('CUE_PROOF_JOB_INVALID', '/'));
  else {
    if (value.schemaVersion !== PROOF_JOB_SCHEMA) violations.push(violation('CUE_PROOF_JOB_INVALID', '/schemaVersion'));
    if (!FORMAL_ID.test(value.jobId)) violations.push(violation('CUE_PROOF_JOB_INVALID', '/jobId'));
    if (!FORMAL_ID.test(value.attemptId)) violations.push(violation('CUE_PROOF_JOB_INVALID', '/attemptId'));
    for (const [key, binding] of [
      ['sourcePackageBinding', value.sourcePackageBinding],
      ['selectionBinding', value.selectionBinding],
      ['selectionReportBinding', value.selectionReportBinding],
    ]) if (!validateFormalBinding(binding)) violations.push(violation('CUE_PROOF_JOB_INVALID', `/${key}`));
    if (!dense(value.cases) || value.cases.length !== 3 || !value.cases.every(validateCase)
      || !value.cases.every((entry, index) => same(entry, CASES[index]))) {
      violations.push(violation('CUE_PROOF_CASE_SET_MISMATCH', '/cases'));
    }
    if (!validateRuntimeProfile(value.runtimeProfile)) violations.push(violation('CUE_PROOF_JOB_INVALID', '/runtimeProfile'));
    if (!dense(value.runtimeDataBindings) || value.runtimeDataBindings.length !== 2
      || !validateImplementationBinding(value.runtimeDataBindings[0])
      || value.runtimeDataBindings[0].role !== 'renderer-core-speaker-registry'
      || value.runtimeDataBindings[0].path !== 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'
      || !same(value.runtimeDataBindings[1], PRESENTATION_ZEVO_CAPTION_RENDERER_TRUST_RUNTIME_BINDING_V002)) {
      violations.push(violation('CUE_PROOF_JOB_INVALID', '/runtimeDataBindings'));
    }
    if (!WORKSPACE_PATH.test(value.outputRoot) || !value.outputRoot.includes('/outputs/presentation/')) {
      violations.push(violation('CUE_PROOF_JOB_INVALID', '/outputRoot'));
    }
    if (!exactBindingSet(value.implementationBindings, PROOF_IMPLEMENTATION_ROLE_PATHS)) {
      violations.push(violation('CUE_PROOF_JOB_INVALID', '/implementationBindings'));
    }
    const contractTuples = CONTRACT_BINDINGS.map(binding => [binding.role, binding.path, binding.fileSha256]);
    if (!exactBindingSet(value.approvedContractBindings, contractTuples, true)) {
      violations.push(violation('CUE_PROOF_JOB_INVALID', '/approvedContractBindings'));
    }
  }
  return violations.length === 0
    ? Object.freeze({status: 'passed', violations: Object.freeze([])})
    : Object.freeze({status: 'rejected', violations: Object.freeze(violations)});
}

export function decodePresentationZevoCaptionQualityV002ProofJobV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes[0] !== 0x7b
    || bytes.at(-1) !== 0x0a || bytes.at(-2) !== 0x7d || bytes.includes(0x0d)) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  if (!formalBytes(value).equals(bytes)) return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  return validatePresentationZevoCaptionQualityV002ProofJobV001(value).status === 'passed'
    ? Object.freeze({status: 'decoded', value})
    : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
}

const validateBaseMediaInput = value => exactKeys(value, [
  'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
]) && validateByteBinding(value.baseMedia) && validateFormalBinding(value.timeline)
  && validateFormalBinding(value.generationManifest) && validateFormalBinding(value.validationReceipt);
const validateStyleInput = value => exactKeys(value, [
  'format', 'screenLayoutId', 'presetBinding', 'captionLayoutPolicy', 'cropPolicy',
  'sceneTransitionPolicy', 'audioPolicy', 'materials',
]) && value.format === 'normal-landscape' && value.screenLayoutId === null
  && isObject(value.presetBinding) && isObject(value.captionLayoutPolicy)
  && isObject(value.cropPolicy) && isObject(value.sceneTransitionPolicy)
  && isObject(value.audioPolicy) && dense(value.materials);
const validateOutputRequest = value => exactKeys(value, [
  'schemaVersion', 'requestId', 'caseId', 'inputCaptionId', 'sourcePackageBinding',
  'selectionBinding', 'selectionReportBinding', 'meaningPackageBinding',
  'baseMediaInput', 'styleInput', 'publication',
]) && value.schemaVersion === OUTPUT_REQUEST_SCHEMA && FORMAL_ID.test(value.requestId)
  && nonempty(value.caseId) && nonempty(value.inputCaptionId)
  && validateFormalBinding(value.sourcePackageBinding) && validateFormalBinding(value.selectionBinding)
  && validateFormalBinding(value.selectionReportBinding) && validateFormalBinding(value.meaningPackageBinding)
  && validateBaseMediaInput(value.baseMediaInput) && validateStyleInput(value.styleInput)
  && exactKeys(value.publication, ['outputId', 'renderOutputRoot'])
  && FORMAL_ID.test(value.publication.outputId) && WORKSPACE_PATH.test(value.publication.renderOutputRoot);

export function buildPresentationZevoCaptionQualityV002OutputRequestV001(input) {
  if (!exactKeys(input, ['proofJob', 'caseContext'])
    || validatePresentationZevoCaptionQualityV002ProofJobV001(input.proofJob).status !== 'passed'
    || !isObject(input.caseContext)) return rejectedValidation('CUE_RENDER_INPUT_INVALID', '/');
  const proofCase = input.proofJob.cases.find(entry => entry.caseId === input.caseContext.caseId);
  if (proofCase === undefined || proofCase.inputCaptionId !== input.caseContext.inputCaptionId
    || !validateFormalBinding(input.caseContext.meaningPackageBinding)
    || !validateBaseMediaInput(input.caseContext.baseMediaInput)
    || !validateStyleInput(input.caseContext.horizontalStyleInput)) {
    return rejectedValidation('CUE_RENDER_BINDING_MISMATCH', '/caseContext');
  }
  const requestId = `${input.proofJob.jobId}-${proofCase.caseId}-horizontal-request`;
  const outputRequest = Object.freeze({
    schemaVersion: OUTPUT_REQUEST_SCHEMA,
    requestId,
    caseId: proofCase.caseId,
    inputCaptionId: proofCase.inputCaptionId,
    sourcePackageBinding: clone(input.proofJob.sourcePackageBinding),
    selectionBinding: clone(input.proofJob.selectionBinding),
    selectionReportBinding: clone(input.proofJob.selectionReportBinding),
    meaningPackageBinding: clone(input.caseContext.meaningPackageBinding),
    baseMediaInput: clone(input.caseContext.baseMediaInput),
    styleInput: clone(input.caseContext.horizontalStyleInput),
    publication: Object.freeze({
      outputId: `${requestId}-output`,
      renderOutputRoot: `${input.proofJob.outputRoot}/${proofCase.caseId}/horizontal-formal`,
    }),
  });
  if (!validateOutputRequest(outputRequest)) return rejectedValidation('CUE_RENDER_INPUT_INVALID', '/');
  return Object.freeze({status: 'passed', value: Object.freeze({outputRequest})});
}

export function buildPresentationZevoCaptionQualityV002RendererJobV001(input) {
  if (!exactKeys(input, [
    'proofJob', 'caseContext', 'instructionArtifactBinding', 'lineEndProjectionBinding',
    'styleProfileRegistry',
    'rendererTrust', 'rendererTrustBinding', 'rendererImplementationBindings',
    'approvedContractBindings', 'publication',
  ])
    || validatePresentationZevoCaptionQualityV002ProofJobV001(input.proofJob).status
      !== 'passed'
    || !isObject(input.caseContext)
    || !validateFormalBinding(input.instructionArtifactBinding)
    || !validateFormalBinding(input.lineEndProjectionBinding)
    || input.lineEndProjectionBinding.schemaVersion
      !== 'presentation-semantic-line-end-projection-v001'
    || !isObject(input.styleProfileRegistry)
    || !isObject(input.rendererTrust)
    || !validateFormalBinding(input.rendererTrustBinding)
    || !dense(input.rendererImplementationBindings)
    || !input.rendererImplementationBindings.every(validateImplementationBinding)
    || !dense(input.approvedContractBindings)
    || !input.approvedContractBindings.every(validateImplementationBinding)
    || !exactKeys(input.publication, [
      'admissionReceiptPath', 'lineLayoutPath', 'renderOutputRoot',
    ])
    || !Object.values(input.publication).every(value => WORKSPACE_PATH.test(value))) {
    return rejectedValidation('CUE_RENDER_INPUT_INVALID', '/');
  }
  const proofCase = input.proofJob.cases.find(
    row => row.caseId === input.caseContext.caseId,
  );
  const style = input.caseContext.resolvedStyle;
  const presetBinding = input.caseContext.horizontalStyleInput?.presetBinding;
  const profiles = input.styleProfileRegistry.presets?.filter(
    row => row?.presetId === style?.presetId,
  ) ?? [];
  const visualStates = profiles.length === 1
    ? profiles[0].visualStates?.filter(row => row?.stateId === style?.visualStateId) ?? []
    : [];
  if (proofCase === undefined
    || proofCase.inputCaptionId !== input.caseContext.inputCaptionId
    || !validateBaseMediaInput(input.caseContext.baseMediaInput)
    || !validateStyleInput(input.caseContext.horizontalStyleInput)
    || !isObject(style)
    || !FORMAL_ID.test(style.presetId)
    || !FORMAL_ID.test(style.visualStateId)
    || style.format !== input.caseContext.horizontalStyleInput.format
    || style.screenLayoutId !== input.caseContext.horizontalStyleInput.screenLayoutId
    || profiles.length !== 1
    || visualStates.length !== 1
    || !isObject(input.styleProfileRegistry.canvas)
    || !positive(input.styleProfileRegistry.canvas.width)
    || !positive(input.styleProfileRegistry.canvas.height)
    || !positive(input.styleProfileRegistry.canvas.fps)
    || !isObject(presetBinding)
    || !validateFormalBinding(presetBinding.presetRegistry)
    || !validateFormalBinding(presetBinding.materialValidationIndex)
    || input.rendererTrust.schemaVersion !== input.rendererTrustBinding.schemaVersion
    || !dense(input.rendererTrust.fontAssets)) {
    return rejectedValidation('CUE_RENDER_BINDING_MISMATCH', '/caseContext');
  }
  const runtime = input.proofJob.runtimeProfile;
  const rendererJob = Object.freeze({
    schemaVersion: 'presentation-instruction-renderer-job-v001',
    jobId: `${input.proofJob.jobId}-${proofCase.caseId}-instruction-render-v001`,
    attemptId: input.proofJob.attemptId,
    instructionArtifactBinding: clone(input.instructionArtifactBinding),
    lineEndProjectionBinding: clone(input.lineEndProjectionBinding),
    cropAppliedBaseMedia: clone(input.caseContext.baseMediaInput),
    executionInputs: Object.freeze({
      format: style.format,
      canvas: Object.freeze({
        width: input.styleProfileRegistry.canvas.width,
        height: input.styleProfileRegistry.canvas.height,
        fps: input.styleProfileRegistry.canvas.fps,
      }),
      screenLayoutId: style.screenLayoutId,
      visualStateId: style.visualStateId,
      cropPolicy: Object.freeze({mode: 'already-applied'}),
      sceneTransitionPolicy: Object.freeze({mode: 'straight-cut'}),
      audioPolicy: Object.freeze({mode: 'preserve-source'}),
      lineLayoutRules: Object.freeze({
        'speech-caption': 'semantic-line-end-projection-v001',
        title: 'greedy-code-point-v001',
      }),
    }),
    registryBindings: Object.freeze({
      styleProfileRegistry: clone(presetBinding.presetRegistry),
      materialRegistry: clone(presetBinding.materialValidationIndex),
      fontLedger: Object.freeze({
        ...clone(input.rendererTrustBinding),
        jsonPointer: '/fontAssets',
        valueCanonicalSha256: canonicalSha(input.rendererTrust.fontAssets),
      }),
      rendererTrust: clone(input.rendererTrustBinding),
    }),
    runtimeBindings: Object.freeze({
      ffmpeg: clone(runtime.ffmpeg),
      ffprobe: clone(runtime.ffprobe),
      imageMagick: clone(runtime.imageMagick),
      remotion: clone(runtime.remotion),
      tsx: clone(runtime.tsx),
      chromium: clone(runtime.browser),
    }),
    rendererImplementationBindings: Object.freeze(clone(
      input.rendererImplementationBindings,
    )),
    approvedContractBindings: Object.freeze(clone(input.approvedContractBindings)),
    publication: Object.freeze(clone(input.publication)),
  });
  return Object.freeze({status: 'passed', value: Object.freeze({rendererJob})});
}

export function derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001(input) {
  if (!exactKeys(input, ['resolvedTransition', 'rendererBinding'])
    || !isObject(input.resolvedTransition) || !validateImplementationBinding(input.rendererBinding)) {
    throw new TypeError('fade observation input is invalid');
  }
  if (input.rendererBinding.role !== 'dep-renderer-core-v002'
    || input.rendererBinding.path !== 'evals/clip_composition/render_presentation_v002.mjs'
    || input.rendererBinding.fileSha256 !== 'c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292') {
    return Object.freeze({status: 'rejected', reason: 'renderer-binding-mismatch'});
  }
  const transition = input.resolvedTransition;
  if (!exactKeys(transition, ['transitionId', 'entry', 'exit'])
    || transition.transitionId !== 'quick-fade-4f-v001'
    || !exactKeys(transition.entry, ['type', 'frames'])
    || !exactKeys(transition.exit, ['type', 'frames'])
    || transition.entry.type !== 'alpha-fade' || transition.entry.frames !== 4
    || transition.exit.type !== 'alpha-fade' || transition.exit.frames !== 4) {
    return Object.freeze({status: 'rejected', reason: 'transition-mismatch'});
  }
  return Object.freeze({status: 'passed', value: Object.freeze({observedFadeFrameCount: 4})});
}

const stableRead = async absolute => {
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) throw new Error('unsafe file');
  const bytes = await readFile(absolute);
  const after = await lstat(absolute, {bigint: true});
  if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino
    || before.size !== after.size || before.mtimeNs !== after.mtimeNs
    || await realpath(absolute) !== absolute) throw new Error('file changed during read');
  return bytes;
};
const readBoundBytes = async (binding, capabilities) => {
  try {
    const bytes = await capabilities.readStableBytes({absolutePath: absoluteWorkspacePath(binding.path)});
    if (sha256(bytes) !== binding.fileSha256) {
      throw Object.assign(new Error(), {
        proofFailureKind: 'binding-mismatch',
        targetFile: failureTarget(binding),
      });
    }
    return bytes;
  } catch (error) {
    if (error?.proofFailureKind === 'binding-mismatch') throw error;
    throw Object.assign(new Error(), {
      proofFailureKind: 'read-fatal',
      innerCode: classifyInner(error),
      osCode: error?.code,
      targetFile: failureTarget(binding),
    });
  }
};
const readFormalBound = async (binding, capabilities) => {
  const bytes = await readBoundBytes(binding, capabilities);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch {
    throw Object.assign(new Error(), {
      proofFailureKind: 'binding-mismatch', targetFile: failureTarget(binding),
    });
  }
  if (!formalBytes(value).equals(bytes) || canonicalSha(value) !== binding.canonicalSha256
    || value.schemaVersion !== binding.schemaVersion) {
    throw Object.assign(new Error(), {
      proofFailureKind: 'binding-mismatch', targetFile: failureTarget(binding),
    });
  }
  return Object.freeze({bytes, value});
};
const bindingForFormal = (schemaVersion, formalPath, value) => ({
  schemaVersion,
  path: formalPath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha(value),
});
const bindingForBytes = (formalPath, bytes) => ({path: formalPath, fileSha256: sha256(bytes)});
const ensureAbsent = async absolute => {
  try { await lstat(absolute); return false; } catch (error) { if (error?.code === 'ENOENT') return true; throw error; }
};
const writeNoReplace = async (absolute, bytes) => {
  await mkdir(path.dirname(absolute), {recursive: true});
  const handle = await open(absolute, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o444);
  try { await handle.writeFile(bytes); } finally { await handle.close(); }
  const reread = await stableRead(absolute);
  if (!reread.equals(bytes)) throw new Error('published bytes mismatch');
};
const runtimeBindingCheck = async runtime => {
  const before = await realpath(runtime.path);
  const bytes = await stableRead(before);
  const after = await realpath(runtime.path);
  return before === after && sha256(bytes) === runtime.fileSha256;
};
const CAPABILITY_KEYS = Object.freeze([
  'ensurePathAbsent', 'createDirectory', 'createDirectoryTree', 'readStableBytes', 'writeNoReplaceBytes',
  'copyNoReplaceBytes', 'verifyRuntimeBinding', 'rereadCaseInputs',
  'runInstructionRendererJob', 'resolveStyle',
  'deriveObservedFadeFrameCount', 'validateReviewInput', 'decodeReviewInput',
  'buildReviewHtml', 'publishDirectory',
]);
const exactCapabilityInput = (value, keys, label) => {
  if (!exactKeys(value, keys)) throw new TypeError(`${label} capability input is invalid`);
};
function formalEnsurePathAbsent(input) {
  exactCapabilityInput(input, ['absolutePath'], 'ensurePathAbsent');
  return ensureAbsent(input.absolutePath);
}
function formalCreateDirectory(input) {
  exactCapabilityInput(input, ['absolutePath'], 'createDirectory');
  return mkdir(input.absolutePath, {recursive: false});
}
function formalCreateDirectoryTree(input) {
  exactCapabilityInput(input, ['absolutePath'], 'createDirectoryTree');
  return mkdir(input.absolutePath, {recursive: true});
}
function formalReadStableBytes(input) {
  exactCapabilityInput(input, ['absolutePath'], 'readStableBytes');
  return stableRead(input.absolutePath);
}
function formalWriteNoReplaceBytes(input) {
  exactCapabilityInput(input, ['absolutePath', 'bytes'], 'writeNoReplaceBytes');
  return writeNoReplace(input.absolutePath, input.bytes);
}
function formalCopyNoReplaceBytes(input) {
  exactCapabilityInput(input, ['sourceAbsolutePath', 'targetAbsolutePath'], 'copyNoReplaceBytes');
  return copyFile(input.sourceAbsolutePath, input.targetAbsolutePath, fsConstants.COPYFILE_EXCL);
}
function formalVerifyRuntimeBinding(input) {
  exactCapabilityInput(input, ['binding'], 'verifyRuntimeBinding');
  return runtimeBindingCheck(input.binding);
}
function formalRereadCaseInputs(input) {
  exactCapabilityInput(input, ['sourcePackage', 'verifiedDependencies'], 'rereadCaseInputs');
  return input.verifiedDependencies.selectionModule.rereadPresentationOutputCaptionCueCaseInputsV001({
    workspaceRoot: WORKSPACE_ROOT,
    sourcePackage: input.sourcePackage,
    rereadDependencies: input.verifiedDependencies.rereadDependencies,
  });
}
function formalRunInstructionRendererJob(input) {
  exactCapabilityInput(input, ['jobPath', 'instructionRendererModule'], 'runInstructionRendererJob');
  return input.instructionRendererModule.runPresentationInstructionRendererJobFileV001(
    input.jobPath,
    {workspaceRoot: WORKSPACE_ROOT},
  );
}
function formalResolveStyle(input) {
  exactCapabilityInput(input, [
    'styleInput', 'artifacts', 'baseMediaInput', 'baseMediaInspection', 'styleModule',
  ], 'resolveStyle');
  return input.styleModule.resolvePresentationOutputStyleV001({
    styleInput: input.styleInput,
    artifacts: input.artifacts,
    baseMediaInput: input.baseMediaInput,
    baseMediaInspection: input.baseMediaInspection,
  });
}
function formalDeriveObservedFadeFrameCount(input) {
  exactCapabilityInput(input, ['resolvedTransition', 'rendererBinding'], 'deriveObservedFadeFrameCount');
  return derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001(input);
}
function formalValidateReviewInput(input) {
  exactCapabilityInput(input, ['reviewInput', 'reviewModule'], 'validateReviewInput');
  return input.reviewModule.validatePresentationZevoCaptionQualityV002ReviewInputV001(input.reviewInput);
}
function formalDecodeReviewInput(input) {
  exactCapabilityInput(input, ['bytes', 'reviewModule'], 'decodeReviewInput');
  return input.reviewModule.decodePresentationZevoCaptionQualityV002ReviewInputV001(input.bytes);
}
function formalBuildReviewHtml(input) {
  exactCapabilityInput(input, ['reviewInput', 'reviewModule'], 'buildReviewHtml');
  return input.reviewModule.buildPresentationZevoCaptionQualityV002ReviewHtmlV001(input.reviewInput);
}
function formalPublishDirectory(input) {
  exactCapabilityInput(input, [
    'publisher', 'workspaceRoot', 'stagingRoot', 'outputRoot',
    'verifiedImplementationBindings',
  ], 'publishDirectory');
  return input.publisher({
    workspaceRoot: input.workspaceRoot,
    stagingRoot: input.stagingRoot,
    outputRoot: input.outputRoot,
    verifiedImplementationBindings: input.verifiedImplementationBindings,
  });
}
const FORMAL_PROOF_CAPABILITIES_V001 = {
  ensurePathAbsent: formalEnsurePathAbsent,
  createDirectory: formalCreateDirectory,
  createDirectoryTree: formalCreateDirectoryTree,
  readStableBytes: formalReadStableBytes,
  writeNoReplaceBytes: formalWriteNoReplaceBytes,
  copyNoReplaceBytes: formalCopyNoReplaceBytes,
  verifyRuntimeBinding: formalVerifyRuntimeBinding,
  rereadCaseInputs: formalRereadCaseInputs,
  runInstructionRendererJob: formalRunInstructionRendererJob,
  resolveStyle: formalResolveStyle,
  deriveObservedFadeFrameCount: formalDeriveObservedFadeFrameCount,
  validateReviewInput: formalValidateReviewInput,
  decodeReviewInput: formalDecodeReviewInput,
  buildReviewHtml: formalBuildReviewHtml,
  publishDirectory: formalPublishDirectory,
};
for (const capability of Object.values(FORMAL_PROOF_CAPABILITIES_V001)) Object.freeze(capability);
Object.freeze(FORMAL_PROOF_CAPABILITIES_V001);
export function readPresentationZevoCaptionQualityV002FormalCapabilitiesV001() {
  if (arguments.length !== 0) throw new TypeError('formal capability reader takes no arguments');
  return FORMAL_PROOF_CAPABILITIES_V001;
}
const validCapabilities = value => exactKeys(value, CAPABILITY_KEYS)
  && CAPABILITY_KEYS.every(key => typeof value[key] === 'function');
const PRE_STAGING_OS_CODES = Object.freeze(new Set([
  'EACCES', 'EPERM', 'ENOENT', 'EIO', 'ENOTDIR', 'EEXIST', 'ENOSPC', 'EMFILE',
  'ENFILE', 'EROFS', 'EINVAL', 'ENAMETOOLONG', 'ELOOP', 'EXDEV', 'ERR_FS_FILE_TOO_LARGE',
]));
const ERROR_CODE_IDENTIFIER = /^(?:E[A-Z0-9_]+|ERR_[A-Z0-9_]+)$/u;
const verifiedWorkspaceTargetPath = value => {
  if (typeof value !== 'string') return null;
  if (WORKSPACE_PATH.test(value)) return value;
  if (!path.isAbsolute(value)) return null;
  const relative = workspaceRelative(value);
  return WORKSPACE_PATH.test(relative) && !relative.startsWith('../') ? relative : null;
};
const preStagingObservation = (state, error = null) => {
  if (state === null) return null;
  const {checkpoint: checkpointId, operation, targetPath = null} = state;
  const errorTargetPath = verifiedWorkspaceTargetPath(error?.targetFile?.path);
  const osCodeCandidate = typeof error?.osCode === 'string' ? error.osCode : error?.code;
  const errorCodeIdentifierCandidate = typeof error?.code === 'string' ? error.code : null;
  return Object.freeze({
    checkpoint: checkpointId,
    operation,
    targetPath: errorTargetPath ?? verifiedWorkspaceTargetPath(targetPath),
    osCode: PRE_STAGING_OS_CODES.has(osCodeCandidate) ? osCodeCandidate : null,
    errorCodeIdentifier: ERROR_CODE_IDENTIFIER.test(errorCodeIdentifierCandidate ?? '')
      ? errorCodeIdentifierCandidate : null,
  });
};
const cliResult = ({status, job = null, stage, primaryCode, innerObservation = null}) => Object.freeze({
  schemaVersion: CLI_SCHEMA,
  status,
  action: 'proof-run',
  jobId: job?.jobId ?? null,
  attemptId: job?.attemptId ?? null,
  outputRoot: job?.outputRoot ?? null,
  stage,
  primaryCode,
  innerObservation,
});

const DYNAMIC_DEPENDENCY_LOADERS = Object.freeze([
  Object.freeze({key: 'source', targetPath: 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs', specifier: './presentation_output_caption_cue_source_package_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'selection', targetPath: 'evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs', specifier: './presentation_output_caption_cue_selection_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'cueProjection', targetPath: 'evals/clip_composition/presentation_cue_end_projection_v001.mjs', specifier: './presentation_cue_end_projection_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'instructionArtifact', targetPath: 'evals/clip_composition/presentation_instruction_artifact_v001.mjs', specifier: './presentation_instruction_artifact_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'rendererAdmission', targetPath: 'evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs', specifier: './presentation_renderer_admission_receipt_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'instructionRenderer', targetPath: 'evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts', specifier: './run_presentation_instruction_renderer_job_v001.ts', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'review', targetPath: 'evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs', specifier: './presentation_zevo_caption_quality_v002_review_ui_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'style', targetPath: 'evals/clip_composition/presentation_output_style_resolver_v001.ts', specifier: './presentation_output_style_resolver_v001.ts', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'timeline', targetPath: 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs', specifier: './presentation_timeline_composition_decision_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'meaningV2', targetPath: 'evals/clip_composition/presentation_a_meaning_information_package_v002.mjs', specifier: './presentation_a_meaning_information_package_v002.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'sourceSequenceV2', targetPath: 'evals/clip_composition/presentation_a_source_sequence_v002.mjs', specifier: './presentation_a_source_sequence_v002.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'semantic', targetPath: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs', specifier: './presentation_caption_semantic_source_package_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'finite', targetPath: 'evals/clip_composition/presentation_output_crop_application_v001.mjs', specifier: './presentation_output_crop_application_v001.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'piecewise', targetPath: 'evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs', specifier: './presentation_output_piecewise_timeline_v002.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'qc', targetPath: 'evals/clip_composition/presentation_renderer_qc_v002.mjs', specifier: './presentation_renderer_qc_v002.mjs', load: resolvedUrl => import(resolvedUrl)}),
  Object.freeze({key: 'fatal', targetPath: 'evals/clip_composition/presentation_fatal_observation_v002.mjs', specifier: './presentation_fatal_observation_v002.mjs', load: resolvedUrl => import(resolvedUrl)}),
]);

const dynamicDependencies = async setActiveDependencyObservation => {
  const dependencies = {};
  for (const dependency of DYNAMIC_DEPENDENCY_LOADERS) {
    setActiveDependencyObservation(Object.freeze({
      checkpoint: 'dependency-resolve', operation: 'resolve-dependency',
      targetPath: dependency.targetPath,
    }));
    const resolvedUrl = new URL(dependency.specifier, import.meta.url);
    const resolvedAbsolutePath = fileURLToPath(resolvedUrl);
    const resolvedPath = workspaceRelative(resolvedAbsolutePath);
    if (!resolvedAbsolutePath.startsWith(`${WORKSPACE_ROOT}${path.sep}`)
      || resolvedPath !== dependency.targetPath) {
      throw new TypeError('dependency target mismatch');
    }
    setActiveDependencyObservation(Object.freeze({
      checkpoint: 'dependency-evaluate', operation: 'evaluate-dependency',
      targetPath: dependency.targetPath,
    }));
    const namespace = await dependency.load(resolvedUrl.href);
    setActiveDependencyObservation(Object.freeze({
      checkpoint: 'dependency-namespace-verify', operation: 'verify-dependency-namespace',
      targetPath: dependency.targetPath,
    }));
    if (namespace === null || typeof namespace !== 'object') {
      throw new TypeError('dependency namespace invalid');
    }
    setActiveDependencyObservation(Object.freeze({
      checkpoint: 'dependency-store', operation: 'store-dependency',
      targetPath: dependency.targetPath,
    }));
    dependencies[dependency.key] = namespace;
  }
  return dependencies;
};

const classifyInner = error => {
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'OS_PERMISSION_DENIED';
  if (error?.code === 'ERR_FS_FILE_TOO_LARGE') return 'ERR_FS_FILE_TOO_LARGE';
  if (error?.code === 'ENOENT' || error?.code === 'EIO') return 'FILE_CHANGED_DURING_READ';
  return 'UNCLASSIFIED';
};
const failureTarget = binding => binding === null || binding === undefined
  ? null
  : Object.freeze({path: binding.path, fileSha256: binding.fileSha256});
const checkpoint = (checkpoints, stage, event, caseId = null, targetFile = null, toolExitCode = null) => {
  checkpoints.push(Object.freeze({stage, event, caseId, targetFile, toolExitCode}));
};
const strictSortBindings = bindings => [...bindings]
  .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
const checksForRejectedStage = stage => {
  const order = ['input', 'plans', 'rendering', 'qc', 'rejectionPublication', 'rootPublication'];
  const failedAt = stage === 'input-read' || stage === 'style-resolution' ? 0
    : stage === 'page-line-planner' || stage === 'render-plan' ? 1
      : stage === 'renderer-work' || stage === 'rendering' ? 2
        : stage === 'qc' ? 3 : 4;
  return Object.fromEntries(order.map((key, index) => [
    key,
    index < failedAt ? 'passed' : index === failedAt ? 'failed' : 'blocked',
  ]));
};
const buildRejectionReport = ({job, proofJobBinding, stage, primaryCode, targetFile,
  evidenceBindings, rendererWorkEvidence, retentionPaths}) => Object.freeze({
  schemaVersion: REJECTION_SCHEMA,
  reportId: `${job.jobId}-rejection-report-v001`,
  status: 'rejected',
  proofJobBinding,
  stage,
  primaryCode,
  targetFile,
  evidenceBindings: strictSortBindings(evidenceBindings),
  checks: checksForRejectedStage(stage),
  rendererWorkEvidence: clone(rendererWorkEvidence),
  retentionPaths: [...new Set(retentionPaths)].sort(),
  implementationBindings: clone(job.implementationBindings),
});
const buildFatalObservation = ({proofJobBinding, stage, innerCode, targetFile, toolExitCode,
  checkpoints, rendererWorkEvidence, retentionPaths}) => Object.freeze({
  schemaVersion: FATAL_SCHEMA,
  status: 'fatal',
  proofJobBinding,
  stage,
  innerCode,
  targetFile,
  toolExitCode,
  checkpoints: clone(checkpoints),
  rendererWorkEvidence: clone(rendererWorkEvidence),
  retentionPaths: [...new Set(retentionPaths)].sort(),
});
const publishFailureRoot = async ({job, proofJobBinding, stagingAbsolute, publisher, capabilities,
  verifiedBindings, report, reportName, cliStatus, cliStage, primaryCode}) => {
  try {
    const reportBytes = formalBytes(report);
    await capabilities.writeNoReplaceBytes({absolutePath: path.join(stagingAbsolute, reportName), bytes: reportBytes});
    const stableReport = await capabilities.readStableBytes({absolutePath: path.join(stagingAbsolute, reportName)});
    if (!stableReport.equals(reportBytes)) throw new Error('failure report changed');
    await Promise.all([
      ...job.implementationBindings.map(binding => readBoundBytes(binding, capabilities)),
      ...job.approvedContractBindings.map(binding => readBoundBytes(binding, capabilities)),
      ...job.runtimeDataBindings.map(binding => readBoundBytes(binding, capabilities)),
    ]);
    const published = await capabilities.publishDirectory({
      publisher,
      workspaceRoot: WORKSPACE_ROOT,
      stagingRoot: `${job.outputRoot}.staging`,
      outputRoot: job.outputRoot,
      verifiedImplementationBindings: verifiedBindings,
    });
    if (published.status !== 'published') {
      return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED'});
    }
    return cliResult({status: cliStatus, job, stage: cliStage, primaryCode});
  } catch {
    return cliResult({status: 'fatal', job, stage: 'artifact-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED'});
  }
};
const oldFixtureFor = caseId => {
  const base = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008';
  const rows = {
    'voice-013': [
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/horizontal-formal/render-plan-v002.json', '86d8769415b00c5a9379164fdaa209e07b78a0179745382d67612cb1a19cbd5e', '9f91df2f907291c0f312baa6faedf912bdc87d545dd4c1edf1720d4528754c5f'],
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/vertical-caption-diagnostic/render-plan-v002.json', '5ebed5a6bb21e29af5c347e17af619737e2b06db55fd4d82336c8ad43cce1ca5', '1d25b2a12c0a388f67f5f67df5dd5bc1eea8e781cefeb43ca3ee0a14bb173c60'],
    ],
    'voice-067': [
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/horizontal-formal/render-plan-v002.json', '4c82f3ecd81153befcc4ce470322a4fdbe6a777441fb0ff89f03a2d9c256c0e3', 'a84bb0653477253b9a39418d0d30dfa7f4a0057f499780bda32981c5c04135d1'],
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/vertical-caption-diagnostic/render-plan-v002.json', '476fe41ad5b0e659641819f78e49f7b992044f37cf2f9bb56b6973decad1ff92', '14dff3764fb2a5502bb908a4f94b8c9aa94ae2bcc72e2a4c991d01dfe9820071'],
    ],
    'voice-190': [
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/horizontal-formal/render-plan-v002.json', '613f2862bc6ed7a331a37dad0c03b94fbf0d17b8a1d04958790d9f80d3b72e01', '9da441d1c2265067837602483c8c6b03da9ff39aa1c49f1ac2842db3473bfd57'],
      ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/vertical-caption-diagnostic/render-plan-v002.json', 'f153fc409cbb07a9514a80c0f27c6c7f165495ffd23c6eda68ed0b49b139d317', 'ff2834ad902706927998d8412e3fd7a0b871131cac21d7c2c787700157a29a3a'],
    ],
  }[caseId];
  return rows.map(([suffix, fileSha256, canonicalSha256]) => ({
    schemaVersion: 'presentation-output-render-plan-v002', path: `${base}/${suffix}`, fileSha256, canonicalSha256,
  }));
};
const patternsFor = caseId => ({
  'voice-013': [{issueId: 'old-break-004', splitText: 'マリ/ン', occurrences: [
    {caseId, format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000020'},
    {caseId, format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
  ]}],
  'voice-067': [{issueId: 'old-break-001', splitText: 'ス/イちゃん', occurrences: [
    {caseId, format: 'horizontal', boundaryKind: 'page-end', afterAtomOccurrenceId: 'atom-occurrence-000042'},
  ]}],
  'voice-190': [
    {issueId: 'old-break-002', splitText: 'じ/ゃ報告', occurrences: [
      {caseId, format: 'horizontal', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
      {caseId, format: 'vertical-caption-diagnostic', boundaryKind: 'page-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
    ]},
    {issueId: 'old-break-003', splitText: '言ってほし/いみたいな', occurrences: [
      {caseId, format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000015'},
    ]},
    {issueId: 'old-break-005', splitText: 'サク/サク', occurrences: [
      {caseId, format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000062'},
    ]},
  ],
}[caseId]);

const questionSet = () => [
  {questionId: 'prior-caption-residue', prompt: '前の発話の文字が次の発話まで残っていないか。'},
  {questionId: 'short-cue-line-break', prompt: '一行に収まる短い発話が改行されていないか。'},
  {questionId: 'long-cue-line-break', prompt: '長い発話だけが必要な位置で自然に二行へ分かれているか。'},
  {questionId: 'text-closure', prompt: '全文を通して文字の欠落・重複・逆順がないか。'},
  {questionId: 'short-cue-fade', prompt: '最短cueで既存4frame fadeにより読めない・不自然に瞬く見え方がないか。'},
];

export async function executePresentationZevoCaptionQualityV002ProofJobV001(input) {
  let activePreStagingObservation = preStagingObservation({
    checkpoint: 'entry-validation', operation: 'validate-entry', targetPath: null,
  });
  if (!exactKeys(input, ['jobPath', 'atomicDirectoryPublisherLoader', 'capabilities'])
    || !WORKSPACE_PATH.test(input.jobPath) || typeof input.atomicDirectoryPublisherLoader !== 'function'
    || !validCapabilities(input.capabilities)) {
    return cliResult({
      status: 'rejected', stage: 'job-read', primaryCode: 'CUE_PROOF_JOB_INVALID',
      innerObservation: activePreStagingObservation,
    });
  }
  const capabilities = input.capabilities;
  let job;
  let publisher;
  let stagingAbsolute;
  let executionPaths;
  let proofJobBinding;
  let activeFatalStage = 'input-read';
  let activeCliStage = 'input-reread';
  let activePrimaryCode = 'CUE_PROOF_EXECUTION_FAILED';
  let activeTargetFile = null;
  let activeToolExitCode = null;
  const checkpoints = [];
  const evidenceBindings = [];
  const failureRendererWorkEvidence = [];
  const retentionPaths = [];
  const rejectAfterStaging = async ({stage, cliStage, primaryCode, targetFile = null}) => {
    const report = buildRejectionReport({
      job, proofJobBinding, stage, primaryCode, targetFile,
      evidenceBindings, rendererWorkEvidence: failureRendererWorkEvidence, retentionPaths,
    });
    return publishFailureRoot({
      job, proofJobBinding, stagingAbsolute, publisher, capabilities,
      verifiedBindings: job.implementationBindings,
      report, reportName: 'rejection-report-v001.json',
      cliStatus: 'rejected', cliStage, primaryCode,
    });
  };
  try {
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'job-byte-read', operation: 'read-job', targetPath: input.jobPath,
    });
    const jobBytes = await capabilities.readStableBytes({absolutePath: absoluteWorkspacePath(input.jobPath)});
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'job-decode-validation', operation: 'decode-and-validate-job', targetPath: input.jobPath,
    });
    const decoded = decodePresentationZevoCaptionQualityV002ProofJobV001(jobBytes);
    if (decoded.status !== 'decoded') {
      let primaryCode = 'CUE_PROOF_JOB_INVALID';
      try {
        const candidate = JSON.parse(jobBytes.toString('utf8'));
        if (formalBytes(candidate).equals(jobBytes)) {
          const validation = validatePresentationZevoCaptionQualityV002ProofJobV001(candidate);
          if (validation.violations.length > 0
            && validation.violations.every(item => item.code === 'CUE_PROOF_CASE_SET_MISMATCH')) {
            primaryCode = 'CUE_PROOF_CASE_SET_MISMATCH';
          }
        }
      } catch {
        // Strict decoding owns malformed bytes; no raw parse failure is persisted.
      }
      return cliResult({
        status: 'rejected', stage: 'job-read', primaryCode,
        innerObservation: activePreStagingObservation,
      });
    }
    job = decoded.value;
    if (path.basename(input.jobPath, path.extname(input.jobPath)) !== job.jobId) {
      return cliResult({
        status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_PROOF_JOB_INVALID',
        innerObservation: activePreStagingObservation,
      });
    }
    let bindingReads;
    try {
      activePreStagingObservation = preStagingObservation({
        checkpoint: 'binding-pre-read', operation: 'read-bound-input', targetPath: null,
      });
      bindingReads = await Promise.all([
        ...job.implementationBindings.map(binding => readBoundBytes(binding, capabilities)),
        ...job.approvedContractBindings.map(binding => readBoundBytes(binding, capabilities)),
        ...job.runtimeDataBindings.map(binding => readBoundBytes(binding, capabilities)),
      ]);
      if (bindingReads.length !== 69) {
        return cliResult({
          status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_PROOF_JOB_INVALID',
          innerObservation: activePreStagingObservation,
        });
      }
      activePreStagingObservation = preStagingObservation({
        checkpoint: 'runtime-verification', operation: 'verify-runtime-binding', targetPath: null,
      });
      if (!(await Promise.all(RUNTIME_KEYS.map(key => capabilities.verifyRuntimeBinding({binding: job.runtimeProfile[key]})))).every(Boolean)) {
        return cliResult({
          status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_PROOF_JOB_INVALID',
          innerObservation: activePreStagingObservation,
        });
      }
    } catch (error) {
      return cliResult({
        status: error?.proofFailureKind === 'binding-mismatch' ? 'rejected' : 'fatal',
        job,
        stage: 'job-read',
        primaryCode: error?.proofFailureKind === 'binding-mismatch'
          ? 'CUE_PROOF_JOB_INVALID' : 'CUE_PROOF_EXECUTION_FAILED',
        innerObservation: preStagingObservation(activePreStagingObservation, error),
      });
    }
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'publisher-load', operation: 'load-atomic-publisher', targetPath: null,
    });
    publisher = await input.atomicDirectoryPublisherLoader();
    if (typeof publisher !== 'function') {
      return cliResult({
        status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
        innerObservation: activePreStagingObservation,
      });
    }
    const dependencies = await dynamicDependencies(observation => {
      activePreStagingObservation = preStagingObservation(observation);
    });
    try {
      activePreStagingObservation = preStagingObservation({
        checkpoint: 'binding-post-import-reread', operation: 'read-bound-input', targetPath: null,
      });
      await Promise.all([
        ...job.implementationBindings.map(binding => readBoundBytes(binding, capabilities)),
        ...job.approvedContractBindings.map(binding => readBoundBytes(binding, capabilities)),
        ...job.runtimeDataBindings.map(binding => readBoundBytes(binding, capabilities)),
      ]);
    } catch (error) {
      return cliResult({
        status: error?.proofFailureKind === 'binding-mismatch' ? 'rejected' : 'fatal',
        job,
        stage: 'job-read',
        primaryCode: error?.proofFailureKind === 'binding-mismatch'
          ? 'CUE_PROOF_JOB_INVALID' : 'CUE_PROOF_EXECUTION_FAILED',
        innerObservation: preStagingObservation(activePreStagingObservation, error),
      });
    }
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'output-root-resolution', operation: 'resolve-workspace-root', targetPath: job.outputRoot,
    });
    executionPaths = derivePresentationZevoCaptionQualityV002ExecutionPathsV001({
      jobId: job.jobId,
      attemptId: job.attemptId,
      proofOutputRoot: job.outputRoot,
      cases: job.cases.map(({caseId}) => ({caseId})),
      rendererWorkParent: 'evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-renderer-work',
    });
    const outputAbsolute = absoluteWorkspacePath(executionPaths.proofOutputRoot);
    stagingAbsolute = absoluteWorkspacePath(executionPaths.proofStagingRoot);
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'output-root-absence-check', operation: 'inspect-output-root-absence', targetPath: job.outputRoot,
    });
    if (!(await capabilities.ensurePathAbsent({absolutePath: outputAbsolute}))) {
      return cliResult({
        status: 'rejected', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
        innerObservation: activePreStagingObservation,
      });
    }
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'staging-root-absence-check', operation: 'inspect-staging-root-absence',
      targetPath: executionPaths.proofStagingRoot,
    });
    if (!(await capabilities.ensurePathAbsent({absolutePath: stagingAbsolute}))) {
      return cliResult({
        status: 'rejected', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
        innerObservation: activePreStagingObservation,
      });
    }
    activePreStagingObservation = preStagingObservation({
      checkpoint: 'staging-root-acquisition', operation: 'create-staging-root',
      targetPath: executionPaths.proofStagingRoot,
    });
    await capabilities.createDirectory({absolutePath: stagingAbsolute});
    activePreStagingObservation = null;
    proofJobBinding = bindingForFormal(PROOF_JOB_SCHEMA, input.jobPath, job);
    evidenceBindings.push(clone(job.sourcePackageBinding), clone(job.selectionBinding), clone(job.selectionReportBinding));
    checkpoint(checkpoints, 'input-read', 'entered');
    activeFatalStage = 'input-read';
    activeCliStage = 'input-reread';
    activePrimaryCode = 'CUE_PROOF_EXECUTION_FAILED';
    activeTargetFile = failureTarget(job.sourcePackageBinding);
    const sourceArtifact = await readFormalBound(job.sourcePackageBinding, capabilities);
    activeTargetFile = failureTarget(job.selectionBinding);
    const selectionArtifact = await readFormalBound(job.selectionBinding, capabilities);
    activeTargetFile = failureTarget(job.selectionReportBinding);
    const selectionReportArtifact = await readFormalBound(job.selectionReportBinding, capabilities);
    const sourcePackage = sourceArtifact.value;
    const selection = selectionArtifact.value;
    const selectionReport = selectionReportArtifact.value;
    if (sourcePackage?.schemaVersion !== 'presentation-output-caption-cue-source-package-v001'
      || selection?.schemaVersion !== 'presentation-output-caption-cue-selection-v001'
      || selectionReport?.schemaVersion !== 'presentation-output-caption-cue-selection-report-v001'
      || selectionReport.status !== 'passed') {
      return rejectAfterStaging({
        stage: 'input-read', cliStage: 'input-reread', primaryCode: 'CUE_PROOF_JOB_INVALID',
        targetFile: activeTargetFile,
      });
    }
    const rereadDependencies = {
      readWorkspaceFileStable: dependencies.timeline.readPresentationMeaningWorkspaceFileStableV001,
      validateMeaningPackageFormalBytes: dependencies.meaningV2.validatePresentationAMeaningInformationPackageFormalBytesV002,
      canonicalSha256MeaningJson: dependencies.sourceSequenceV2.canonicalSha256PresentationAJsonV002,
      hashMeaningBytes: dependencies.semantic.sha256PresentationCaptionB1BytesV001,
      decodeFiniteJson: dependencies.finite.decodePresentationOutputFiniteJsonV001,
      serializeFiniteJson: dependencies.finite.serializePresentationOutputCropApplicationFormalJsonV001,
      canonicalSha256FiniteJson: dependencies.finite.canonicalSha256PresentationOutputFiniteJsonV001,
      hashFiniteBytes: dependencies.finite.sha256PresentationOutputCropApplicationBytesV001,
      hashStableMedia: dependencies.timeline.hashAbsoluteStableStreaming,
      classifyFatalInnerCode: dependencies.fatal.classifyPresentationFatalInnerCodeV002,
    };
    const caseInputResult = await capabilities.rereadCaseInputs({
      sourcePackage,
      verifiedDependencies: {selectionModule: dependencies.selection, rereadDependencies},
    });
    if (caseInputResult.status !== 'passed') {
      if (caseInputResult.status === 'rejected') {
        return rejectAfterStaging({
          stage: 'input-read', cliStage: 'input-reread', primaryCode: 'CUE_PROOF_JOB_INVALID',
          targetFile: caseInputResult.targetFile ?? null,
        });
      }
      activeTargetFile = caseInputResult.targetFile ?? null;
      activeFatalStage = 'input-read';
      activeCliStage = 'input-reread';
      activePrimaryCode = 'CUE_PROOF_EXECUTION_FAILED';
      throw Object.assign(new Error(), {innerCode: caseInputResult.innerCode ?? 'UNCLASSIFIED'});
    }
    checkpoint(checkpoints, 'input-read', 'completed');
    const rendererTrustRuntimeBinding = job.runtimeDataBindings.find(
      binding => binding.role === PRESENTATION_ZEVO_CAPTION_RENDERER_TRUST_RUNTIME_BINDING_V002.role,
    );
    const rendererTrustBytes = await capabilities.readStableBytes({
      absolutePath: absoluteWorkspacePath(rendererTrustRuntimeBinding.path),
    });
    if (sha256(rendererTrustBytes) !== rendererTrustRuntimeBinding.fileSha256) {
      return rejectAfterStaging({
        stage: 'dependency-initialization',
        cliStage: 'dependency-initialization',
        primaryCode: 'CUE_PROOF_EXECUTION_FAILED',
        targetFile: failureTarget(rendererTrustRuntimeBinding),
      });
    }
    const rendererTrust = JSON.parse(rendererTrustBytes.toString('utf8'));
    const rendererTrustBinding = bindingForFormal(
      rendererTrust.schemaVersion,
      rendererTrustRuntimeBinding.path,
      rendererTrust,
    );
    const rendererImplementationBindings = dependencies.instructionRenderer
      .PRESENTATION_INSTRUCTION_RENDERER_IMPLEMENTATION_ROLE_PATHS_V001.map(([role, bindingPath]) => {
        const bound = job.implementationBindings.find(binding => binding.path === bindingPath);
        if (bound === undefined) throw new Error(`renderer implementation is not job-bound: ${bindingPath}`);
        return Object.freeze({role, path: bindingPath, fileSha256: bound.fileSha256});
      });
    const rendererContractBindings = dependencies.instructionRenderer
      .PRESENTATION_INSTRUCTION_RENDERER_CONTRACT_ROLE_PATHS_V001.map(([role, bindingPath]) => {
        const bound = job.approvedContractBindings.find(binding => binding.path === bindingPath);
        if (bound === undefined) throw new Error(`renderer contract is not job-bound: ${bindingPath}`);
        return Object.freeze({role, path: bindingPath, fileSha256: bound.fileSha256});
      });
    const oldCompletionOracles = Object.freeze({
      'voice-013': Object.freeze({
        pageLinePlanBinding: Object.freeze({schemaVersion: 'presentation-output-page-line-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-013/horizontal-formal/page-line-plan-v003.json', fileSha256: '71d47f3e069ddcf5d27c075ef19658face39de835cd954ed5e29cccde54029e9', canonicalSha256: '2bb831e3e264e0c514b03d4ebd8ae1c5b4d46611c97a40223da7f6297e5e9489'}),
        renderPlanBinding: Object.freeze({schemaVersion: 'presentation-output-render-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-013/horizontal-formal/render-plan-v003.json', fileSha256: 'd78c5486d172dd323b1bddbc8c99344260b448527589879fc356819aa54206c6', canonicalSha256: 'ad329d350b133abb0d9120191ab2badf7735a361e3bfa5bbc998d0d25fabc96a'}),
      }),
      'voice-067': Object.freeze({
        pageLinePlanBinding: Object.freeze({schemaVersion: 'presentation-output-page-line-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-067/horizontal-formal/page-line-plan-v003.json', fileSha256: '63e7e35d3ef967ccf42bcba1a0448d31d59224bbefbe4cb31dbf78862ed6792f', canonicalSha256: '7ac64db04f1fd9527e4f6581dcc1d1964f888cc29199865cd47663bdf62d604d'}),
        renderPlanBinding: Object.freeze({schemaVersion: 'presentation-output-render-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-067/horizontal-formal/render-plan-v003.json', fileSha256: '34624c6b33eae0ebc8b18d4221f0aa3cc45d54ea8838d0b87b2869e0908bce85', canonicalSha256: '8da0683c4f11c8181bf4d078cf4e0a0ad71ead11f4021bc06703e7347ab69798'}),
      }),
      'voice-190': Object.freeze({
        pageLinePlanBinding: Object.freeze({schemaVersion: 'presentation-output-page-line-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-190/horizontal-formal/page-line-plan-v003.json', fileSha256: 'f93a442e9a272e1fa8f66b89e872ef9d130fa95a001605f9be655321e751fd8f', canonicalSha256: 'e5b9f98e4d2949cd270a21f055e1ca4056f5776fa72ec101b36249186df9aeb5'}),
        renderPlanBinding: Object.freeze({schemaVersion: 'presentation-output-render-plan-v003', path: 'evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-190/horizontal-formal/render-plan-v003.json', fileSha256: '7f24f356a3aa94fd9c86049d3b661418f8a4f22c06c0597d5057b1620eebc636', canonicalSha256: 'da5088d79c82a229f70b6d0358dd73e75f77601b8b24212d73d9145f8c7421a9'}),
      }),
    });
    const completionItems = [];
    const reviewItems = [];
    for (const expected of CASES) {
      const context = sourcePackage.reconstructionMap.caseContexts.find(entry => entry.caseId === expected.caseId);
      const caseInput = caseInputResult.caseInputs.find(entry => entry.caseId === expected.caseId);
      if (context === undefined || caseInput === undefined
        || context.inputCaptionId !== expected.inputCaptionId) {
        return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_PROOF_CASE_SET_MISMATCH'});
      }
      const casePaths = executionPaths.cases.find(entry => entry.caseId === expected.caseId);
      if (casePaths === undefined) throw new TypeError('caption quality case path projection is missing');
      const caseRoot = casePaths.proofCaseRoot;
      const stagingCaseRoot = absoluteWorkspacePath(casePaths.proofStagingCaseRoot);

      activeTargetFile = null;
      activeFatalStage = 'output-request';
      activeCliStage = 'artifact-publication';
      activePrimaryCode = 'CUE_PROOF_PUBLICATION_FAILED';
      checkpoint(checkpoints, 'output-request', 'entered', expected.caseId);
      const outputResult = buildPresentationZevoCaptionQualityV002OutputRequestV001({
        proofJob: job,
        caseContext: context,
      });
      if (outputResult.status !== 'passed') return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
      });
      const outputRequest = outputResult.value.outputRequest;
      const outputRequestPath = `${caseRoot}/output-request-v001.json`;
      await capabilities.writeNoReplaceBytes({
        absolutePath: path.join(stagingCaseRoot, 'output-request-v001.json'),
        bytes: formalBytes(outputRequest),
      });
      const outputRequestBinding = bindingForFormal(OUTPUT_REQUEST_SCHEMA, outputRequestPath, outputRequest);
      const outputRequestReread = await capabilities.readStableBytes({
        absolutePath: path.join(stagingCaseRoot, 'output-request-v001.json'),
      });
      if (!outputRequestReread.equals(formalBytes(outputRequest))) return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
        targetFile: failureTarget(outputRequestBinding),
      });
      evidenceBindings.push(outputRequestBinding);
      checkpoint(checkpoints, 'output-request', 'completed', expected.caseId, failureTarget(outputRequestBinding));

      activeFatalStage = 'renderer-work';
      activeCliStage = 'renderer-work';
      activePrimaryCode = 'CUE_PROOF_EXECUTION_FAILED';
      checkpoint(checkpoints, 'renderer-work', 'entered', expected.caseId);
      const rendererCaseAbsolute = absoluteWorkspacePath(casePaths.rendererCaseParent);
      if (!(await capabilities.ensurePathAbsent({absolutePath: rendererCaseAbsolute}))) {
        throw new Error('renderer case root is already used');
      }
      await capabilities.createDirectoryTree({absolutePath: rendererCaseAbsolute});

      const projectionBuilt = dependencies.cueProjection.buildPresentationCueEndProjectionV001({
        projectionId: `${job.jobId}-${expected.caseId}-cue-end-projection-v001`,
        sourcePackageBinding: selection.sourcePackageBinding,
        sourceSelectionDigest: {
          schemaVersion: selection.schemaVersion,
          artifactId: selection.selectionId,
          fileSha256: job.selectionBinding.fileSha256,
          canonicalSha256: job.selectionBinding.canonicalSha256,
        },
        producerJobBinding: proofJobBinding,
        sourcePackage,
        selection,
      });
      if (projectionBuilt.status !== 'built') return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
      });
      const projectionPath = `${casePaths.rendererCaseParent}/cue-end-projection-v001.json`;
      await capabilities.writeNoReplaceBytes({
        absolutePath: absoluteWorkspacePath(projectionPath),
        bytes: dependencies.cueProjection.serializePresentationCueEndProjectionV001(projectionBuilt.projection),
      });
      const projectionBinding = dependencies.cueProjection.buildPresentationCueEndProjectionBindingV001({
        path: projectionPath,
        projection: projectionBuilt.projection,
      });

      const lineProjectionBuilt = dependencies.cueProjection
        .buildPresentationSemanticLineEndProjectionV001({
          projectionId: `${job.jobId}-${expected.caseId}-semantic-line-end-projection-v001`,
          sourcePackageBinding: selection.sourcePackageBinding,
          cueEndProjectionBinding: projectionBinding,
          sourceSelectionDigest: {
            schemaVersion: selection.schemaVersion,
            artifactId: selection.selectionId,
            fileSha256: job.selectionBinding.fileSha256,
            canonicalSha256: job.selectionBinding.canonicalSha256,
          },
          producerJobBinding: proofJobBinding,
          sourcePackage,
          selection,
          cueEndProjection: projectionBuilt.projection,
        });
      if (lineProjectionBuilt.status !== 'built') return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
      });
      const lineProjectionPath = `${casePaths.rendererCaseParent}`
        + '/semantic-line-end-projection-v001.json';
      await capabilities.writeNoReplaceBytes({
        absolutePath: absoluteWorkspacePath(lineProjectionPath),
        bytes: dependencies.cueProjection.serializePresentationSemanticLineEndProjectionV001(
          lineProjectionBuilt.projection,
        ),
      });
      const lineProjectionBinding = dependencies.cueProjection
        .buildPresentationSemanticLineEndProjectionBindingV001({
          path: lineProjectionPath,
          projection: lineProjectionBuilt.projection,
        });

      const instructionBuilt = dependencies.instructionArtifact
        .buildPresentationCaptionInstructionArtifactV001({
          artifactId: `${job.jobId}-${expected.caseId}-presentation-instruction-v001`,
          sourceCaseId: expected.caseId,
          meaningInformationPackageBinding: context.meaningPackageBinding,
          timelineBinding: context.baseMediaInput.timeline,
          cueEndProjectionBinding: projectionBinding,
          producerJobBinding: proofJobBinding,
          styleProfileId: context.resolvedStyle.presetId,
          meaningPackage: caseInput.meaningPackage,
          timeline: caseInput.baseMediaResolverInput.timeline,
          cueEndProjection: projectionBuilt.projection,
        });
      if (instructionBuilt.status !== 'built') return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
      });
      const instructionPath = `${casePaths.rendererCaseParent}/presentation-instruction-v001.json`;
      await capabilities.writeNoReplaceBytes({
        absolutePath: absoluteWorkspacePath(instructionPath),
        bytes: dependencies.instructionArtifact.serializePresentationInstructionArtifactV001(
          instructionBuilt.artifact,
        ),
      });
      const instructionBinding = dependencies.instructionArtifact
        .buildPresentationInstructionArtifactBindingV001({
          path: instructionPath,
          artifact: instructionBuilt.artifact,
        });

      const rendererJobBuilt = buildPresentationZevoCaptionQualityV002RendererJobV001({
        proofJob: job,
        caseContext: context,
        instructionArtifactBinding: instructionBinding,
        lineEndProjectionBinding: lineProjectionBinding,
        styleProfileRegistry: caseInput.styleArtifacts.presetRegistry,
        rendererTrust,
        rendererTrustBinding,
        rendererImplementationBindings,
        approvedContractBindings: rendererContractBindings,
        publication: {
          admissionReceiptPath: `${casePaths.rendererCaseParent}/admission-receipt-v001.json`,
          lineLayoutPath: `${casePaths.rendererCaseParent}/line-layout-v001.json`,
          renderOutputRoot: casePaths.rendererOutputRoot,
        },
      });
      if (rendererJobBuilt.status !== 'passed') return rejectAfterStaging({
        stage: 'render-plan', cliStage: 'render-plan', primaryCode: 'CUE_RENDER_INPUT_INVALID',
      });
      const rendererJob = rendererJobBuilt.value.rendererJob;
      const rendererJobPath = `${casePaths.rendererCaseParent}/renderer-job-v001.json`;
      await capabilities.writeNoReplaceBytes({
        absolutePath: absoluteWorkspacePath(rendererJobPath),
        bytes: dependencies.rendererAdmission.serializePresentationInstructionRendererJobV001(rendererJob),
      });
      const rendererJobBinding = bindingForFormal(rendererJob.schemaVersion, rendererJobPath, rendererJob);
      const rendered = await capabilities.runInstructionRendererJob({
        jobPath: absoluteWorkspacePath(rendererJobPath),
        instructionRendererModule: dependencies.instructionRenderer,
      });
      if (rendered.exitCode !== 0 || rendered.result?.status !== 'completed') {
        if (rendered.exitCode === 1) return rejectAfterStaging({
          stage: 'rendering', cliStage: 'rendering', primaryCode: 'CUE_PROOF_RENDER_FAILED',
        });
        activeToolExitCode = rendered.result?.failure?.toolExitCode ?? null;
        throw Object.assign(new Error(), {innerCode: rendered.result?.failure?.stage ?? 'UNCLASSIFIED'});
      }
      const receiptBinding = bindingForFormal(
        rendered.result.receipt.schemaVersion,
        rendererJob.publication.admissionReceiptPath,
        rendered.result.receipt,
      );
      const lineLayoutBinding = bindingForFormal(
        rendered.result.lineLayout.schemaVersion,
        rendererJob.publication.lineLayoutPath,
        rendered.result.lineLayout,
      );
      const workVideoPath = `${casePaths.rendererOutputRoot}/presentation-rendered-v002.mp4`;
      const workVideoBytes = await capabilities.readStableBytes({
        absolutePath: absoluteWorkspacePath(workVideoPath),
      });
      const videoPath = `${caseRoot}/video.mp4`;
      await capabilities.copyNoReplaceBytes({
        sourceAbsolutePath: absoluteWorkspacePath(workVideoPath),
        targetAbsolutePath: path.join(stagingCaseRoot, 'video.mp4'),
      });
      const qcPath = `${caseRoot}/renderer-qc-v002.json`;
      await capabilities.writeNoReplaceBytes({
        absolutePath: path.join(stagingCaseRoot, 'renderer-qc-v002.json'),
        bytes: formalBytes(rendered.result.qc),
      });
      const videoBinding = bindingForBytes(videoPath, workVideoBytes);
      const qcBinding = bindingForFormal(rendered.result.qc.schemaVersion, qcPath, rendered.result.qc);
      const oracle = oldCompletionOracles[expected.caseId];
      for (const binding of [oracle.pageLinePlanBinding, oracle.renderPlanBinding]) {
        const oracleBytes = await readBoundBytes(binding, capabilities);
        const oracleValue = JSON.parse(oracleBytes.toString('utf8'));
        if (oracleValue.schemaVersion !== binding.schemaVersion
          || canonicalSha(oracleValue) !== binding.canonicalSha256) throw new Error('byte oracle changed');
      }
      evidenceBindings.push(
        projectionBinding,
        lineProjectionBinding,
        instructionBinding,
        rendererJobBinding,
        receiptBinding,
        lineLayoutBinding,
        videoBinding,
        qcBinding,
      );
      checkpoint(checkpoints, 'renderer-work', 'completed', expected.caseId, failureTarget(videoBinding));
      checkpoint(checkpoints, 'rendering', 'entered', expected.caseId, failureTarget(videoBinding));
      checkpoint(checkpoints, 'rendering', 'completed', expected.caseId, failureTarget(videoBinding));
      checkpoint(checkpoints, 'qc', 'entered', expected.caseId, failureTarget(qcBinding));
      checkpoint(checkpoints, 'qc', 'completed', expected.caseId, failureTarget(qcBinding));

      const cueTimingSummary = instructionBuilt.artifact.instructions.map((instruction, index) => ({
        cueId: instruction.instructionId,
        startFrame: instruction.outputTime.startFrame,
        endFrameExclusive: instruction.outputTime.endFrameExclusive,
        displayFrameCount: instruction.outputTime.endFrameExclusive - instruction.outputTime.startFrame,
        lineTexts: rendered.result.lineLayout.entries[index].lines.map(line => line.text),
      }));
      const shortest = [...cueTimingSummary].sort((left, right) => (
        left.displayFrameCount - right.displayFrameCount || left.cueId.localeCompare(right.cueId)
      ))[0];
      const frameCount = rendered.result.qc.mediaEvidence.observed.video.frameCount;
      const durationMilliseconds = rendered.result.qc.mediaEvidence.observed.durationMs;
      const rendererWorkEvidence = {
        outputDirectory: casePaths.rendererOutputRoot,
        workDirectory: null,
        lockDirectory: null,
        ownerFileBinding: null,
        workVideoBinding: bindingForBytes(workVideoPath, workVideoBytes),
        retentionStatus: 'published',
      };
      completionItems.push({
        caseId: expected.caseId,
        inputCaptionId: expected.inputCaptionId,
        candidateId: expected.candidateId,
        pageLinePlanBinding: oracle.pageLinePlanBinding,
        renderPlanBinding: oracle.renderPlanBinding,
        cueEndProjectionBinding: projectionBinding,
        instructionArtifactBinding: instructionBinding,
        rendererJobBinding,
        admissionReceiptBinding: receiptBinding,
        lineLayoutBinding,
        videoBinding,
        qcBinding,
        durationMilliseconds,
        frameCount,
        shortestCueId: shortest.cueId,
        shortestCueDisplayFrameCount: shortest.displayFrameCount,
        rendererWorkEvidence,
      });
      reviewItems.push({
        caseId: expected.caseId,
        inputCaptionId: expected.inputCaptionId,
        candidateId: expected.candidateId,
        humanObservationFixture: {
          oldRenderPlanBindings: oldFixtureFor(expected.caseId),
          knownIssuePatterns: patternsFor(expected.caseId),
        },
        horizontal: {videoBinding, qcBinding, durationMilliseconds, frameCount},
        cueTimingSummary,
      });
    }
    const rendererBinding = job.implementationBindings.find(binding => binding.role === 'dep-renderer-core-v002');
    const firstContext = sourcePackage.reconstructionMap.caseContexts[0];
    const firstCaseInput = caseInputResult.caseInputs[0];
    const styleResolution = await capabilities.resolveStyle({
      styleInput: firstContext.horizontalStyleInput,
      artifacts: firstCaseInput.styleArtifacts,
      baseMediaInput: firstCaseInput.baseMediaResolverInput,
      baseMediaInspection: null,
      styleModule: dependencies.style,
    });
    const fade = await capabilities.deriveObservedFadeFrameCount({
      resolvedTransition: styleResolution.layoutContext.transition,
      rendererBinding,
    });
    if (fade.status !== 'passed') return rejectAfterStaging({
      stage: 'style-resolution', cliStage: 'style-resolution', primaryCode: 'CUE_PROOF_RENDER_FAILED',
      targetFile: failureTarget(rendererBinding),
    });
    const reviewInput = {
      schemaVersion: REVIEW_INPUT_SCHEMA,
      reviewId: `${job.jobId}-review`,
      observedFadeFrameCount: fade.value.observedFadeFrameCount,
      proofJobBinding,
      reviewQuestions: questionSet(),
      items: reviewItems,
    };
    const reviewChecked = await capabilities.validateReviewInput({
      reviewInput,
      reviewModule: dependencies.review,
    });
    activeFatalStage = 'review-publication';
    activeCliStage = 'review-publication';
    activePrimaryCode = 'CUE_PROOF_PUBLICATION_FAILED';
    checkpoint(checkpoints, 'review-publication', 'entered');
    if (reviewChecked.status !== 'passed') throw Object.assign(new Error(), {innerCode: 'REPORT_TARGET_INVALID'});
    const reviewInputPath = `${executionPaths.proofReviewRoot}/review-input-v001.json`;
    await capabilities.writeNoReplaceBytes({
      absolutePath: path.join(absoluteWorkspacePath(executionPaths.proofStagingReviewRoot), 'review-input-v001.json'),
      bytes: formalBytes(reviewInput),
    });
    const reviewInputBinding = bindingForFormal(REVIEW_INPUT_SCHEMA, reviewInputPath, reviewInput);
    const reviewInputDecoded = await capabilities.decodeReviewInput({
      bytes: await capabilities.readStableBytes({absolutePath: path.join(absoluteWorkspacePath(executionPaths.proofStagingReviewRoot), 'review-input-v001.json')}),
      reviewModule: dependencies.review,
    });
    if (reviewInputDecoded.status !== 'decoded' || !same(reviewInputDecoded.value, reviewInput)) {
      throw Object.assign(new Error(), {innerCode: 'REPORT_PUBLICATION_FAILED'});
    }
    const reviewBuilt = await capabilities.buildReviewHtml({
      reviewInput,
      reviewModule: dependencies.review,
    });
    if (reviewBuilt.status !== 'passed') throw new Error('review html invalid');
    const reviewHtmlPath = `${executionPaths.proofReviewRoot}/review.html`;
    await capabilities.writeNoReplaceBytes({
      absolutePath: path.join(absoluteWorkspacePath(executionPaths.proofStagingReviewRoot), 'review.html'),
      bytes: reviewBuilt.bytes,
    });
    const reviewHtmlBinding = bindingForBytes(reviewHtmlPath, reviewBuilt.bytes);
    if (sha256(await capabilities.readStableBytes({absolutePath: path.join(absoluteWorkspacePath(executionPaths.proofStagingReviewRoot), 'review.html')})) !== reviewHtmlBinding.fileSha256) {
      throw Object.assign(new Error(), {innerCode: 'REPORT_PUBLICATION_FAILED'});
    }
    evidenceBindings.push(reviewInputBinding, reviewHtmlBinding);
    checkpoint(checkpoints, 'review-publication', 'completed');
    activeFatalStage = 'completion-publication';
    activeCliStage = 'completion-publication';
    activePrimaryCode = 'CUE_PROOF_PUBLICATION_FAILED';
    checkpoint(checkpoints, 'completion-publication', 'entered');
    const completion = {
      schemaVersion: COMPLETION_SCHEMA,
      reportId: `${job.jobId}-completion-report-v001`,
      status: 'passed',
      proofJobBinding,
      sourcePackageBinding: clone(job.sourcePackageBinding),
      selectionBinding: clone(job.selectionBinding),
      selectionReportBinding: clone(job.selectionReportBinding),
      items: completionItems,
      reviewInputBinding,
      reviewHtmlBinding,
      checks: {
        cases: 'passed', selection: 'passed', plans: 'passed', rendering: 'passed', qc: 'passed',
        rendererWorkRetention: 'passed', fadeEvidence: 'passed', reviewPublication: 'passed', oldTree: 'passed',
      },
      implementationBindings: clone(job.implementationBindings),
    };
    await capabilities.writeNoReplaceBytes({
      absolutePath: path.join(stagingAbsolute, 'completion-report-v001.json'),
      bytes: formalBytes(completion),
    });
    const completionReread = await capabilities.readStableBytes({
      absolutePath: path.join(stagingAbsolute, 'completion-report-v001.json'),
    });
    if (!completionReread.equals(formalBytes(completion))) {
      throw Object.assign(new Error(), {innerCode: 'REPORT_PUBLICATION_FAILED'});
    }
    checkpoint(checkpoints, 'completion-publication', 'completed');
    await Promise.all([
      ...job.implementationBindings.map(binding => readBoundBytes(binding, capabilities)),
      ...job.approvedContractBindings.map(binding => readBoundBytes(binding, capabilities)),
      ...job.runtimeDataBindings.map(binding => readBoundBytes(binding, capabilities)),
    ]);
    activeFatalStage = 'root-publication';
    activeCliStage = 'root-publication';
    activePrimaryCode = 'CUE_PROOF_PUBLICATION_FAILED';
    const published = await capabilities.publishDirectory({
      publisher,
      workspaceRoot: WORKSPACE_ROOT,
      stagingRoot: executionPaths.proofStagingRoot,
      outputRoot: executionPaths.proofOutputRoot,
      verifiedImplementationBindings: job.implementationBindings,
    });
    if (published.status !== 'published') {
      return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED'});
    }
    return cliResult({status: 'passed', job, stage: 'completed', primaryCode: null});
  } catch (error) {
    if (job === undefined) {
      return cliResult({
        status: 'fatal', stage: 'job-read', primaryCode: 'CUE_PROOF_EXECUTION_FAILED',
        innerObservation: preStagingObservation(activePreStagingObservation, error),
      });
    }
    if (stagingAbsolute === undefined || proofJobBinding === undefined || publisher === undefined) {
      return cliResult({
        status: 'fatal', job, stage: activeCliStage, primaryCode: activePrimaryCode,
        innerObservation: preStagingObservation(activePreStagingObservation, error),
      });
    }
    if (activeFatalStage === 'root-publication') {
      return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED'});
    }
    if (error?.proofFailureKind === 'binding-mismatch') {
      return rejectAfterStaging({
        stage: activeFatalStage === 'input-read' ? 'input-read' : 'render-plan',
        cliStage: activeFatalStage === 'input-read' ? 'input-reread' : 'render-plan',
        primaryCode: activeFatalStage === 'input-read' ? 'CUE_PROOF_JOB_INVALID' : 'CUE_RENDER_BINDING_MISMATCH',
        targetFile: error.targetFile ?? activeTargetFile,
      });
    }
    const observation = buildFatalObservation({
      proofJobBinding,
      stage: activeFatalStage,
      innerCode: error?.innerCode ?? classifyInner(error),
      targetFile: error?.targetFile ?? activeTargetFile,
      toolExitCode: activeToolExitCode,
      checkpoints,
      rendererWorkEvidence: failureRendererWorkEvidence,
      retentionPaths,
    });
    return publishFailureRoot({
      job, proofJobBinding, stagingAbsolute, publisher, capabilities,
      verifiedBindings: job.implementationBindings,
      report: observation, reportName: 'fatal-observation-v001.json',
      cliStatus: 'fatal', cliStage: activeCliStage, primaryCode: activePrimaryCode,
    });
  }
}

const isDirectExecution = async () => {
  if (process.argv.length < 2 || process.argv[1] === undefined) return false;
  try {
    const [argumentBefore, moduleReal, argumentAfter] = await Promise.all([
      realpath(process.argv[1]), realpath(MODULE_ABSOLUTE), realpath(process.argv[1]),
    ]);
    return argumentBefore === argumentAfter && argumentBefore === moduleReal;
  } catch { return false; }
};

const runCliIfDirect = async () => {
  if (!(await isDirectExecution())) return;
    if (process.argv.length !== 3) {
      process.stderr.write('usage: run_presentation_zevo_caption_quality_v002_proof_job_v001.ts <job-path>\n');
      process.exitCode = 2;
      return;
    }
    const result = await executePresentationZevoCaptionQualityV002ProofJobV001({
      jobPath: process.argv[2],
      atomicDirectoryPublisherLoader: async function atomicDirectoryPublisherLoader() {
        if (arguments.length !== 0) throw new TypeError('atomic publisher loader takes no arguments');
        const namespace = await import('./presentation_atomic_directory_publish_v001.mjs');
        const expected = [
          'classifyPresentationAtomicDirectoryPublishObservationV001',
          'executePresentationAtomicDirectoryNativeHelperV001',
          'preparePresentationDirectoryAtomicPublishV001',
          'publishPresentationDirectoryAtomicallyNoReplaceV001',
        ];
        if (!isObject(namespace) || !expected.every(key => typeof namespace[key] === 'function')
          || Object.keys(namespace).sort().join('\0') !== expected.sort().join('\0')) {
          throw new TypeError('atomic publisher surface invalid');
        }
        return namespace.publishPresentationDirectoryAtomicallyNoReplaceV001;
      },
      capabilities: FORMAL_PROOF_CAPABILITIES_V001,
    });
    process.stdout.write(formalBytes(result));
    process.exitCode = result.status === 'passed' ? 0 : result.status === 'rejected' ? 1 : 2;
};

void runCliIfDirect();

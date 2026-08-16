import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {
  lstat,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const JOB_SCHEMA = 'presentation-output-caption-cue-source-package-job-v001';
const PACKAGE_SCHEMA = 'presentation-output-caption-cue-source-package-v001';
const PROMPT_SCHEMA = 'presentation-zevo-caption-selection-input-v001';
const CLI_SCHEMA = 'presentation-output-caption-cue-source-cli-result-v001';
const MEANING_SCHEMA = 'zev-meaning-information-package-v002';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const TASK_DESCRIPTION = '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const FIXED_NODE = Object.freeze({
  path: '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node',
  fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c',
});
const FIXED_TSX = Object.freeze({
  path: '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs',
  fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f',
});

const JOB_KEYS = Object.freeze([
  'schemaVersion', 'jobId', 'packageId', 'meaningPackageBindings', 'styleLimits',
  'caseContexts', 'outputPath', 'runtimeProfile', 'implementationBindings',
  'runtimeDataBindings', 'approvedContractBindings',
]);
const STYLE_LIMIT_KEYS = Object.freeze([
  'maxLogicalWidthPerLine', 'maxLinesPerCue', 'characterWidthRule',
]);
const JOB_CASE_KEYS = Object.freeze([
  'caseId', 'inputCaptionId', 'meaningPackageBinding', 'baseMediaInput',
  'horizontalStyleInput', 'styleBindings',
]);
const CASE_INPUT_KEYS = Object.freeze([
  'caseId', 'meaningPackage', 'resolvedStyle', 'layoutContext',
]);
const BASE_MEDIA_KEYS = Object.freeze([
  'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
]);
const STYLE_INPUT_KEYS = Object.freeze([
  'format', 'screenLayoutId', 'presetBinding', 'captionLayoutPolicy', 'cropPolicy',
  'sceneTransitionPolicy', 'audioPolicy', 'materials',
]);
const PRESET_BINDING_KEYS = Object.freeze([
  'trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex',
  'materialValidationIndex', 'rendererTrust', 'presetId',
]);
const STYLE_BINDING_KEYS = Object.freeze([
  'trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex',
  'materialValidationIndex', 'rendererTrust',
]);
const STYLE_VERSION_FIELD_BY_ROLE = Object.freeze({
  trustedRegistryBindings: 'schemaVersion',
  presetRegistry: 'schemaVersion',
  presetValidationIndex: 'registryVersion',
  materialValidationIndex: 'registryVersion',
  rendererTrust: 'schemaVersion',
});
const CAPTION_POLICY_KEYS = Object.freeze([
  'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
  'pageBreakPolicy',
]);
const RESOLVED_STYLE_KEYS = Object.freeze([
  'format', 'screenLayoutId', 'presetId', 'visualStateId',
  'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
  'cropMode', 'sceneTransitionMode', 'audioMode',
]);
const PACKAGE_KEYS = Object.freeze([
  'schemaVersion', 'packageId', 'promptInput', 'reconstructionMap', 'provenance',
]);
const PROMPT_KEYS = Object.freeze([
  'schemaVersion', 'taskDescription', 'captions', 'styleLimits',
]);
const PROMPT_CAPTION_KEYS = Object.freeze(['captionId', 'boundaryCandidates']);
const PROMPT_BOUNDARY_KEYS = Object.freeze(['boundaryId', 'text']);
const RECONSTRUCTION_KEYS = Object.freeze([
  'meaningPackageBindings', 'captions', 'caseContexts',
]);
const RECONSTRUCTION_CAPTION_KEYS = Object.freeze([
  'captionId', 'meaningPackageOrdinal', 'semanticCaptionId',
  'atomOccurrenceIds', 'boundaries',
]);
const RECONSTRUCTION_BOUNDARY_KEYS = Object.freeze([
  'boundaryId', 'ordinal', 'afterAtomOccurrenceId',
]);
const RECONSTRUCTION_CASE_KEYS = Object.freeze([
  'caseId', 'inputCaptionId', 'meaningPackageBinding', 'baseMediaInput',
  'horizontalStyleInput', 'styleBindings', 'resolvedStyle',
]);
const PROVENANCE_KEYS = Object.freeze([
  'sourcePackageJobBinding', 'implementationBindings', 'approvedContractBindings',
]);
const CLI_KEYS = Object.freeze([
  'schemaVersion', 'status', 'jobId', 'packageId', 'outputPath', 'stage',
  'primaryCode',
]);
const EXECUTION_KEYS = Object.freeze(['jobPath', 'atomicDirectoryPublisherLoader']);

const SOURCE_IMPLEMENTATION_ROLE_PATHS = Object.freeze([
  ['atomic-directory-publisher-adapter-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
  ['atomic-directory-publisher-native-darwin-arm64-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64'],
  ['atomic-directory-publisher-native-source-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.c'],
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
  ['dep-output-crop-application-v001', 'evals/clip_composition/presentation_output_crop_application_v001.mjs'],
  ['dep-renderer-core-v002', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['dep-renderer-plan-v002', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
  ['dep-renderer-qc-v002', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['dep-renderer-text-layout-v001', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
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
]);
const SOURCE_CONTRACT_BINDINGS = Object.freeze([
  Object.freeze({
    role: 'caption-quality-atomic-publication-b6-owner-scope-revision-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md',
    fileSha256: '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade',
  }),
  Object.freeze({
    role: 'caption-quality-atomic-runtime-lc-uuid-compatibility-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md',
    fileSha256: 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e',
  }),
  Object.freeze({
    role: 'caption-quality-complete-implementation-design',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md',
    fileSha256: '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4',
  }),
  Object.freeze({
    role: 'caption-quality-complete-implementation-design-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md',
    fileSha256: 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d',
  }),
  Object.freeze({
    role: 'caption-quality-dependency-load-stage-observation-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md',
    fileSha256: '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc',
  }),
  Object.freeze({
    role: 'caption-quality-dependency-unit-observation-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md',
    fileSha256: '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501',
  }),
  Object.freeze({
    role: 'caption-quality-formal-capability-read-entry-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md',
    fileSha256: '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110',
  }),
  Object.freeze({
    role: 'caption-quality-parent-contract',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md',
    fileSha256: '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba',
  }),
  Object.freeze({
    role: 'caption-quality-pre-staging-inner-observation-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md',
    fileSha256: '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f',
  }),
  Object.freeze({
    role: 'caption-quality-proof-capability-and-tsx-namespace-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md',
    fileSha256: 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a',
  }),
  Object.freeze({
    role: 'caption-quality-resolved-url-evaluation-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md',
    fileSha256: '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275',
  }),
  Object.freeze({
    role: 'caption-quality-runtime-live-binding-separation-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md',
    fileSha256: '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1',
  }),
  Object.freeze({
    role: 'caption-quality-source-final-package-validator-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md',
    fileSha256: '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053',
  }),
  Object.freeze({
    role: 'caption-quality-tsx-wrapper-descriptor-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md',
    fileSha256: '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010',
  }),
  Object.freeze({
    role: 'caption-quality-meaning-small-unit-criteria-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-meaning-small-unit-criteria-addendum-20260816-v021.md',
    fileSha256: '7532e5e5ad788a47f9c672486e183e2dc859b83334f94954c9317538fb53a4a9',
  }),
  Object.freeze({
    role: 'caption-quality-logical-width-physical-alignment-addendum',
    path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-logical-width-physical-alignment-addendum-20260816-v022.md',
    fileSha256: 'f1e0eb7061b44b27785a30842220bcaa9adb83c12dc4984176eb5383dd01c651',
  }),
]);
const RUNTIME_DATA_ROLE_PATHS = Object.freeze([
  ['renderer-core-speaker-registry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
]);

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const nonempty = value => typeof value === 'string' && value.length > 0;
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
};
const canonicalBytes = value => Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const clone = value => structuredClone(value);
const violation = (code, pointer, relatedPaths = []) => Object.freeze({
  code,
  path: pointer,
  relatedPaths: Object.freeze([...new Set(relatedPaths)].sort()),
});
const rejected = (primaryCode, pointer) => Object.freeze({
  status: 'rejected',
  primaryCode,
  violations: Object.freeze([violation(primaryCode, pointer)]),
});
const passedValidation = () => Object.freeze({
  status: 'passed',
  violations: Object.freeze([]),
});

const jsonValueValid = (value, seen = new Set()) => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isSafeInteger(value) && !Object.is(value, -0);
  if (Array.isArray(value)) return dense(value) && value.every(item => jsonValueValid(item, seen));
  if (!isObject(value) || seen.has(value)) return false;
  seen.add(value);
  const valid = Object.values(value).every(item => jsonValueValid(item, seen));
  seen.delete(value);
  return valid;
};
const parseFormalJson = bytes => {
  if (!Buffer.isBuffer(bytes)) return null;
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { return null; }
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (!jsonValueValid(value) || !formalBytes(value).equals(bytes)) return null;
  return value;
};

const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const byteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const roleBinding = value => exactKeys(value, ['role', 'path', 'fileSha256'])
  && nonempty(value.role) && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const rolePathsEqual = (bindings, expected) => dense(bindings)
  && bindings.length === expected.length
  && bindings.every(roleBinding)
  && bindings.every((binding, index) => (
    binding.role === expected[index][0] && binding.path === expected[index][1]
  ));
const uniqueRolesAndPaths = bindings => new Set(bindings.map(item => item.role)).size === bindings.length
  && new Set(bindings.map(item => item.path)).size === bindings.length;
const bindingMember = (binding, values) => values.filter(value => same(value, binding)).length === 1;

const validateStyleLimits = value => exactKeys(value, STYLE_LIMIT_KEYS)
  && positiveInteger(value.maxLogicalWidthPerLine)
  && positiveInteger(value.maxLinesPerCue)
  && value.maxLinesPerCue <= 99
  && value.characterWidthRule === WIDTH_RULE;
const validateResolvedStyle = value => exactKeys(value, RESOLVED_STYLE_KEYS)
  && value.format === 'normal-landscape' && value.screenLayoutId === null
  && nonempty(value.presetId) && nonempty(value.visualStateId)
  && positiveInteger(value.maxLogicalWidthPerLine)
  && positiveInteger(value.maxLinesPerDisplayPage)
  && value.characterWidthRule === WIDTH_RULE
  && value.cropMode === 'identity'
  && value.sceneTransitionMode === 'straight-cut-only'
  && value.audioMode === 'preserve-source-only';
const validateStyleInput = value => exactKeys(value, STYLE_INPUT_KEYS)
  && value.format === 'normal-landscape' && value.screenLayoutId === null
  && exactKeys(value.presetBinding, PRESET_BINDING_KEYS)
  && STYLE_BINDING_KEYS.every(key => formalBinding(value.presetBinding[key]))
  && nonempty(value.presetBinding.presetId)
  && exactKeys(value.captionLayoutPolicy, CAPTION_POLICY_KEYS)
  && positiveInteger(value.captionLayoutPolicy.maxLogicalWidthPerLine)
  && positiveInteger(value.captionLayoutPolicy.maxLinesPerDisplayPage)
  && value.captionLayoutPolicy.characterWidthRule === WIDTH_RULE
  && value.captionLayoutPolicy.pageBreakPolicy === 'split-at-source-atom-boundary-or-reject'
  && same(value.cropPolicy, {mode: 'identity'})
  && same(value.sceneTransitionPolicy, {mode: 'straight-cut-only'})
  && same(value.audioPolicy, {mode: 'preserve-source-only'})
  && dense(value.materials) && value.materials.length === 0;
const validateBaseMedia = value => exactKeys(value, BASE_MEDIA_KEYS)
  && byteBinding(value.baseMedia)
  && formalBinding(value.timeline)
  && formalBinding(value.generationManifest)
  && formalBinding(value.validationReceipt);
const validateStyleBindings = (value, styleInput) => exactKeys(value, STYLE_BINDING_KEYS)
  && STYLE_BINDING_KEYS.every(key => formalBinding(value[key])
    && same(value[key], styleInput.presetBinding[key]));

export function validatePresentationOutputCaptionCueSourceJobV001(value) {
  const fail = pointer => Object.freeze({
    status: 'rejected',
    violations: Object.freeze([violation('CUE_SOURCE_JOB_INVALID', pointer)]),
  });
  if (!exactKeys(value, JOB_KEYS) || value.schemaVersion !== JOB_SCHEMA
    || !FORMAL_ID.test(value.jobId) || !FORMAL_ID.test(value.packageId)) return fail('/');
  if (!dense(value.meaningPackageBindings) || value.meaningPackageBindings.length < 1
    || !value.meaningPackageBindings.every(binding => formalBinding(binding)
      && binding.schemaVersion === MEANING_SCHEMA)
    || new Set(value.meaningPackageBindings.map(binding => binding.path)).size
      !== value.meaningPackageBindings.length) return fail('/meaningPackageBindings');
  if (!validateStyleLimits(value.styleLimits)) return fail('/styleLimits');
  if (!dense(value.caseContexts) || value.caseContexts.length < 1) return fail('/caseContexts');
  for (const [index, context] of value.caseContexts.entries()) {
    if (!exactKeys(context, JOB_CASE_KEYS) || !FORMAL_ID.test(context.caseId)
      || context.inputCaptionId !== `input-caption-${String(index + 1).padStart(6, '0')}`
      || !formalBinding(context.meaningPackageBinding)
      || !bindingMember(context.meaningPackageBinding, value.meaningPackageBindings)
      || !validateBaseMedia(context.baseMediaInput)
      || !validateStyleInput(context.horizontalStyleInput)
      || !validateStyleBindings(context.styleBindings, context.horizontalStyleInput)) {
      return fail(`/caseContexts/${index}`);
    }
  }
  if (new Set(value.caseContexts.map(item => item.caseId)).size !== value.caseContexts.length
    || new Set(value.caseContexts.map(item => item.inputCaptionId)).size
      !== value.caseContexts.length) return fail('/caseContexts');
  const expectedOutput = `evals/clip_composition/outputs/presentation/output-caption-cue-source-packages/${value.packageId}/source-package-v001.json`;
  if (value.outputPath !== expectedOutput) return fail('/outputPath');
  if (!exactKeys(value.runtimeProfile, ['node', 'tsx'])
    || !same(value.runtimeProfile.node, FIXED_NODE)
    || !same(value.runtimeProfile.tsx, FIXED_TSX)) return fail('/runtimeProfile');
  if (!rolePathsEqual(value.implementationBindings, SOURCE_IMPLEMENTATION_ROLE_PATHS)
    || !uniqueRolesAndPaths(value.implementationBindings)) return fail('/implementationBindings');
  if (!rolePathsEqual(value.runtimeDataBindings, RUNTIME_DATA_ROLE_PATHS)
    || !uniqueRolesAndPaths(value.runtimeDataBindings)) return fail('/runtimeDataBindings');
  const expectedContracts = SOURCE_CONTRACT_BINDINGS.map(item => [item.role, item.path]);
  if (!rolePathsEqual(value.approvedContractBindings, expectedContracts)
    || !uniqueRolesAndPaths(value.approvedContractBindings)
    || !value.approvedContractBindings.every((item, index) => (
      item.fileSha256 === SOURCE_CONTRACT_BINDINGS[index].fileSha256
    ))) return fail('/approvedContractBindings');
  return passedValidation();
}

export function decodePresentationOutputCaptionCueSourceJobV001(bytes) {
  const value = parseFormalJson(bytes);
  if (value === null) return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  const checked = validatePresentationOutputCaptionCueSourceJobV001(value);
  return checked.status === 'passed'
    ? Object.freeze({status: 'decoded', value})
    : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
}

const validateMeaningEnvelope = value => exactKeys(value, [
  'schemaVersion', 'packageId', 'sourceMedia', 'timelineComposition',
  'atomOccurrences', 'captions', 'title', 'semanticObservations', 'provenance',
]) && value.schemaVersion === MEANING_SCHEMA
  && FORMAL_ID.test(value.packageId)
  && dense(value.atomOccurrences) && value.atomOccurrences.length > 0
  && dense(value.captions) && value.captions.length > 0;
const atomByIdFor = meaningPackage => new Map(
  meaningPackage.atomOccurrences.map(item => [item.atomOccurrenceId, item]),
);

const finalPackageViolation = (pointer, rule) => Object.freeze({path: pointer, rule});
const finalPackageValidationResult = violations => Object.freeze(violations.length === 0
  ? {status: 'passed', violations: Object.freeze([])}
  : {status: 'rejected', violations: Object.freeze(violations)});

export function validatePresentationOutputCaptionCueSourcePackageV001(value) {
  const violations = [];
  const add = (pointer, rule) => violations.push(finalPackageViolation(pointer, rule));
  if (!exactKeys(value, PACKAGE_KEYS)) {
    add('/', 'exact-key-set');
    return finalPackageValidationResult(violations);
  }
  if (value.schemaVersion !== PACKAGE_SCHEMA) add('/schemaVersion', 'schema-version');
  if (!FORMAL_ID.test(value.packageId)) add('/packageId', 'formal-id');

  let promptCaptions = null;
  let promptStyleLimits = null;
  if (!exactKeys(value.promptInput, PROMPT_KEYS)) {
    add('/promptInput', 'exact-key-set');
  } else {
    if (value.promptInput.schemaVersion !== PROMPT_SCHEMA) {
      add('/promptInput/schemaVersion', 'schema-version');
    }
    if (value.promptInput.taskDescription !== TASK_DESCRIPTION) {
      add('/promptInput/taskDescription', 'task-description');
    }
    if (!dense(value.promptInput.captions) || value.promptInput.captions.length === 0) {
      add('/promptInput/captions', 'dense-nonempty-array');
    } else {
      promptCaptions = value.promptInput.captions;
      const captionIds = new Set();
      for (const [captionIndex, caption] of promptCaptions.entries()) {
        const captionPath = `/promptInput/captions/${captionIndex}`;
        if (!exactKeys(caption, PROMPT_CAPTION_KEYS)) {
          add(captionPath, 'exact-key-set');
          continue;
        }
        if (!nonempty(caption.captionId)) add(`${captionPath}/captionId`, 'nonempty-string');
        else if (captionIds.has(caption.captionId)) add(`${captionPath}/captionId`, 'unique-id');
        else captionIds.add(caption.captionId);
        if (!dense(caption.boundaryCandidates) || caption.boundaryCandidates.length === 0) {
          add(`${captionPath}/boundaryCandidates`, 'dense-nonempty-array');
          continue;
        }
        const boundaryIds = new Set();
        for (const [boundaryIndex, boundary] of caption.boundaryCandidates.entries()) {
          const boundaryPath = `${captionPath}/boundaryCandidates/${boundaryIndex}`;
          if (!exactKeys(boundary, PROMPT_BOUNDARY_KEYS)) {
            add(boundaryPath, 'exact-key-set');
            continue;
          }
          if (!nonempty(boundary.boundaryId)) {
            add(`${boundaryPath}/boundaryId`, 'nonempty-string');
          } else if (boundaryIds.has(boundary.boundaryId)) {
            add(`${boundaryPath}/boundaryId`, 'unique-id');
          } else {
            boundaryIds.add(boundary.boundaryId);
          }
          if (!nonempty(boundary.text)) add(`${boundaryPath}/text`, 'nonempty-string');
        }
      }
    }
    promptStyleLimits = value.promptInput.styleLimits;
    if (!exactKeys(promptStyleLimits, STYLE_LIMIT_KEYS)) {
      add('/promptInput/styleLimits', 'exact-key-set');
      promptStyleLimits = null;
    } else {
      if (!positiveInteger(promptStyleLimits.maxLogicalWidthPerLine)) {
        add('/promptInput/styleLimits/maxLogicalWidthPerLine', 'positive-integer');
      }
      if (!positiveInteger(promptStyleLimits.maxLinesPerCue)) {
        add('/promptInput/styleLimits/maxLinesPerCue', 'positive-integer');
      } else if (promptStyleLimits.maxLinesPerCue > 99) {
        add('/promptInput/styleLimits/maxLinesPerCue', 'style-limit-mismatch');
      }
      if (promptStyleLimits.characterWidthRule !== WIDTH_RULE) {
        add('/promptInput/styleLimits/characterWidthRule', 'style-limit-mismatch');
      }
    }
  }

  let reconstructionCaptions = null;
  if (!exactKeys(value.reconstructionMap, RECONSTRUCTION_KEYS)) {
    add('/reconstructionMap', 'exact-key-set');
  } else {
    if (!dense(value.reconstructionMap.meaningPackageBindings)) {
      add('/reconstructionMap/meaningPackageBindings', 'dense-nonempty-array');
    }
    if (!dense(value.reconstructionMap.captions)) {
      add('/reconstructionMap/captions', 'dense-nonempty-array');
    } else {
      reconstructionCaptions = value.reconstructionMap.captions;
      for (const [captionIndex, caption] of reconstructionCaptions.entries()) {
        const captionPath = `/reconstructionMap/captions/${captionIndex}`;
        if (!exactKeys(caption, RECONSTRUCTION_CAPTION_KEYS)) {
          add(captionPath, 'exact-key-set');
          continue;
        }
        if (!nonempty(caption.captionId)) add(`${captionPath}/captionId`, 'nonempty-string');
        if (!positiveInteger(caption.meaningPackageOrdinal)) {
          add(`${captionPath}/meaningPackageOrdinal`, 'positive-integer');
        }
        if (!nonempty(caption.semanticCaptionId)) {
          add(`${captionPath}/semanticCaptionId`, 'nonempty-string');
        }
        if (!dense(caption.atomOccurrenceIds) || caption.atomOccurrenceIds.length === 0) {
          add(`${captionPath}/atomOccurrenceIds`, 'dense-nonempty-array');
        }
        if (!dense(caption.boundaries)) {
          add(`${captionPath}/boundaries`, 'dense-nonempty-array');
        } else {
          for (const [boundaryIndex, boundary] of caption.boundaries.entries()) {
            const boundaryPath = `${captionPath}/boundaries/${boundaryIndex}`;
            if (!exactKeys(boundary, RECONSTRUCTION_BOUNDARY_KEYS)) {
              add(boundaryPath, 'exact-key-set');
              continue;
            }
            if (!nonempty(boundary.boundaryId)) {
              add(`${boundaryPath}/boundaryId`, 'nonempty-string');
            }
            if (!positiveInteger(boundary.ordinal)) {
              add(`${boundaryPath}/ordinal`, 'positive-integer');
            }
            if (!nonempty(boundary.afterAtomOccurrenceId)) {
              add(`${boundaryPath}/afterAtomOccurrenceId`, 'nonempty-string');
            }
          }
        }
      }
    }
    if (!dense(value.reconstructionMap.caseContexts)) {
      add('/reconstructionMap/caseContexts', 'dense-nonempty-array');
    } else {
      for (const [caseIndex, context] of value.reconstructionMap.caseContexts.entries()) {
        const casePath = `/reconstructionMap/caseContexts/${caseIndex}`;
        if (!exactKeys(context, RECONSTRUCTION_CASE_KEYS)) {
          add(casePath, 'exact-key-set');
          continue;
        }
        if (!validateResolvedStyle(context.resolvedStyle)) {
          add(`${casePath}/resolvedStyle`, 'resolved-style');
        } else if (promptStyleLimits !== null && (
          context.resolvedStyle.maxLogicalWidthPerLine
            !== promptStyleLimits.maxLogicalWidthPerLine
          || context.resolvedStyle.maxLinesPerDisplayPage !== promptStyleLimits.maxLinesPerCue
          || context.resolvedStyle.characterWidthRule !== promptStyleLimits.characterWidthRule
        )) {
          add(`${casePath}/resolvedStyle`, 'style-limit-mismatch');
        }
      }
    }
  }

  if (promptCaptions !== null && reconstructionCaptions !== null) {
    const count = Math.min(promptCaptions.length, reconstructionCaptions.length);
    for (let captionIndex = 0; captionIndex < count; captionIndex += 1) {
      const promptCaption = promptCaptions[captionIndex];
      const reconstructionCaption = reconstructionCaptions[captionIndex];
      if (!exactKeys(promptCaption, PROMPT_CAPTION_KEYS)
        || !exactKeys(reconstructionCaption, RECONSTRUCTION_CAPTION_KEYS)) continue;
      if (promptCaption.captionId !== reconstructionCaption.captionId) {
        add(`/reconstructionMap/captions/${captionIndex}/captionId`, 'reconstruction-caption-mismatch');
      }
      if (!dense(promptCaption.boundaryCandidates)
        || !dense(reconstructionCaption.boundaries)) continue;
      const boundaryCount = Math.min(
        promptCaption.boundaryCandidates.length,
        reconstructionCaption.boundaries.length,
      );
      for (let boundaryIndex = 0; boundaryIndex < boundaryCount; boundaryIndex += 1) {
        const promptBoundary = promptCaption.boundaryCandidates[boundaryIndex];
        const reconstructionBoundary = reconstructionCaption.boundaries[boundaryIndex];
        if (!exactKeys(promptBoundary, PROMPT_BOUNDARY_KEYS)
          || !exactKeys(reconstructionBoundary, RECONSTRUCTION_BOUNDARY_KEYS)) continue;
        if (promptBoundary.boundaryId !== reconstructionBoundary.boundaryId) {
          add(
            `/reconstructionMap/captions/${captionIndex}/boundaries/${boundaryIndex}/boundaryId`,
            'reconstruction-boundary-mismatch',
          );
        }
      }
      if (promptCaption.boundaryCandidates.length !== reconstructionCaption.boundaries.length) {
        add(`/reconstructionMap/captions/${captionIndex}/boundaries`, 'reconstruction-boundary-mismatch');
      }
    }
    if (promptCaptions.length !== reconstructionCaptions.length) {
      add('/reconstructionMap/captions', 'reconstruction-caption-mismatch');
    }
  }

  if (!exactKeys(value.provenance, PROVENANCE_KEYS)) {
    add('/provenance', 'exact-key-set');
  } else {
    if (!formalBinding(value.provenance.sourcePackageJobBinding)) {
      add('/provenance/sourcePackageJobBinding', 'formal-binding');
    }
    if (!dense(value.provenance.implementationBindings)) {
      add('/provenance/implementationBindings', 'dense-nonempty-array');
    }
    if (!dense(value.provenance.approvedContractBindings)) {
      add('/provenance/approvedContractBindings', 'dense-nonempty-array');
    }
  }
  return finalPackageValidationResult(violations);
}

export function buildPresentationOutputCaptionCueSourcePackageV001(input) {
  if (!exactKeys(input, ['job', 'sourcePackageJobBinding', 'caseInputs'])) {
    return rejected('CUE_SOURCE_INPUT_BINDING_INVALID', '/input');
  }
  const {job, sourcePackageJobBinding, caseInputs} = input;
  if (validatePresentationOutputCaptionCueSourceJobV001(job).status !== 'passed') {
    return rejected('CUE_SOURCE_JOB_INVALID', '/job');
  }
  if (!formalBinding(sourcePackageJobBinding)
    || sourcePackageJobBinding.schemaVersion !== JOB_SCHEMA
    || sourcePackageJobBinding.path
      !== `evals/clip_composition/jobs/presentation/output-caption-cue-source-jobs/${job.jobId}.json`) {
    return rejected('CUE_SOURCE_INPUT_BINDING_INVALID', '/sourcePackageJobBinding');
  }
  if (!dense(caseInputs) || caseInputs.length !== job.caseContexts.length) {
    return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', '/caseInputs');
  }
  for (const [index, item] of caseInputs.entries()) {
    if (!exactKeys(item, CASE_INPUT_KEYS) || item.caseId !== job.caseContexts[index].caseId
      || !validateMeaningEnvelope(item.meaningPackage)
      || !validateResolvedStyle(item.resolvedStyle)
      || !isObject(item.layoutContext)) {
      return rejected('CUE_SOURCE_INPUT_BINDING_INVALID', `/caseInputs/${index}`);
    }
    if (item.resolvedStyle.maxLogicalWidthPerLine !== job.styleLimits.maxLogicalWidthPerLine
      || item.resolvedStyle.maxLinesPerDisplayPage !== job.styleLimits.maxLinesPerCue
      || item.resolvedStyle.characterWidthRule !== job.styleLimits.characterWidthRule) {
      return rejected('CUE_SOURCE_STYLE_INVALID', `/caseInputs/${index}/resolvedStyle`);
    }
  }

  const promptCaptions = [];
  const reconstructionCaptions = [];
  const reconstructionCases = [];
  let globalCaptionOrdinal = 0;
  for (const [packageIndex, binding] of job.meaningPackageBindings.entries()) {
    const indexes = job.caseContexts.flatMap((context, index) => (
      same(context.meaningPackageBinding, binding) ? [index] : []
    ));
    if (indexes.length < 1) {
      return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', '/caseInputs');
    }
    const meaningPackage = caseInputs[indexes[0]].meaningPackage;
    if (indexes.some(index => !same(caseInputs[index].meaningPackage, meaningPackage))
      || indexes.length !== meaningPackage.captions.length) {
      return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', '/caseInputs');
    }
    const atomById = atomByIdFor(meaningPackage);
    for (const [captionIndex, semanticCaption] of meaningPackage.captions.entries()) {
      const caseIndex = indexes[captionIndex];
      const context = job.caseContexts[caseIndex];
      const item = caseInputs[caseIndex];
      globalCaptionOrdinal += 1;
      const captionId = `input-caption-${String(globalCaptionOrdinal).padStart(6, '0')}`;
      if (context.inputCaptionId !== captionId
        || !exactKeys(semanticCaption, ['captionId', 'ordinal', 'text', 'atomOccurrenceIds'])
        || semanticCaption.ordinal !== captionIndex + 1
        || !dense(semanticCaption.atomOccurrenceIds)
        || semanticCaption.atomOccurrenceIds.length < 1) {
        return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', `/caseInputs/${caseIndex}/meaningPackage`);
      }
      const atoms = semanticCaption.atomOccurrenceIds.map(id => atomById.get(id));
      if (atoms.some(atom => !atom || !nonempty(atom.text))
        || atoms.map(atom => atom.text).join('') !== semanticCaption.text
        || new Set(semanticCaption.atomOccurrenceIds).size !== semanticCaption.atomOccurrenceIds.length) {
        return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', `/caseInputs/${caseIndex}/meaningPackage`);
      }
      const boundaryCandidates = atoms.map((atom, atomIndex) => ({
        boundaryId: `display-boundary-${String(globalCaptionOrdinal).padStart(6, '0')}-${String(atomIndex + 1).padStart(6, '0')}`,
        text: atom.text,
      }));
      promptCaptions.push({captionId, boundaryCandidates});
      reconstructionCaptions.push({
        captionId,
        meaningPackageOrdinal: packageIndex + 1,
        semanticCaptionId: semanticCaption.captionId,
        atomOccurrenceIds: clone(semanticCaption.atomOccurrenceIds),
        boundaries: boundaryCandidates.map((boundary, atomIndex) => ({
          boundaryId: boundary.boundaryId,
          ordinal: atomIndex + 1,
          afterAtomOccurrenceId: semanticCaption.atomOccurrenceIds[atomIndex],
        })),
      });
      reconstructionCases.push({
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        meaningPackageBinding: clone(context.meaningPackageBinding),
        baseMediaInput: clone(context.baseMediaInput),
        horizontalStyleInput: clone(context.horizontalStyleInput),
        styleBindings: clone(context.styleBindings),
        resolvedStyle: clone(item.resolvedStyle),
      });
    }
  }
  if (globalCaptionOrdinal !== job.caseContexts.length) {
    return rejected('CUE_SOURCE_ATOM_CLOSURE_INVALID', '/caseInputs');
  }
  const sourcePackage = {
    schemaVersion: PACKAGE_SCHEMA,
    packageId: job.packageId,
    promptInput: {
      schemaVersion: PROMPT_SCHEMA,
      taskDescription: TASK_DESCRIPTION,
      captions: promptCaptions,
      styleLimits: clone(job.styleLimits),
    },
    reconstructionMap: {
      meaningPackageBindings: clone(job.meaningPackageBindings),
      captions: reconstructionCaptions,
      caseContexts: reconstructionCases,
    },
    provenance: {
      sourcePackageJobBinding: clone(sourcePackageJobBinding),
      implementationBindings: clone(job.implementationBindings),
      approvedContractBindings: clone(job.approvedContractBindings),
    },
  };
  if (validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage).status !== 'passed') {
    return rejected('CUE_SOURCE_PROMPT_PROJECTION_INVALID', '/sourcePackage');
  }
  return Object.freeze({
    status: 'passed',
    value: Object.freeze({sourcePackage}),
  });
}

const cliResult = ({status, job = null, stage, primaryCode}) => {
  const result = {
    schemaVersion: CLI_SCHEMA,
    status,
    jobId: job?.jobId ?? null,
    packageId: job?.packageId ?? null,
    outputPath: job?.outputPath ?? null,
    stage,
    primaryCode,
  };
  if (!exactKeys(result, CLI_KEYS)) throw new TypeError('invalid CLI result');
  return Object.freeze(result);
};
const inferWorkspaceRoot = jobPath => {
  if (!path.isAbsolute(jobPath)) return process.cwd();
  const marker = `${path.sep}evals${path.sep}`;
  const offset = jobPath.indexOf(marker);
  return offset > 0 ? jobPath.slice(0, offset) : process.cwd();
};
const relativeJobPath = (workspaceRoot, jobPath) => path.isAbsolute(jobPath)
  ? path.relative(workspaceRoot, jobPath).split(path.sep).join('/')
  : jobPath;
const absoluteWorkspacePath = (workspaceRoot, relativePath) => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new Error('unsafe-path');
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!absolute.startsWith(`${path.resolve(workspaceRoot)}${path.sep}`)) throw new Error('unsafe-path');
  return absolute;
};
const stableRead = async (workspaceRoot, relativePath) => {
  const absolute = absoluteWorkspacePath(workspaceRoot, relativePath);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) {
    throw new Error('unsafe-file');
  }
  const bytes = await readFile(absolute);
  const after = await lstat(absolute, {bigint: true});
  if (!after.isFile() || after.isSymbolicLink() || before.dev !== after.dev
    || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs
    || await realpath(absolute) !== absolute) throw new Error('unstable-file');
  return bytes;
};
const streamingSha = async absolute => new Promise((resolve, rejectStream) => {
  const digest = createHash('sha256');
  const stream = createReadStream(absolute);
  stream.on('data', chunk => digest.update(chunk));
  stream.on('error', rejectStream);
  stream.on('end', () => resolve(digest.digest('hex')));
});
const stableStreamingSha = async (workspaceRoot, relativePath) => {
  const absolute = absoluteWorkspacePath(workspaceRoot, relativePath);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) {
    throw new Error('unsafe-file');
  }
  const digest = await streamingSha(absolute);
  const after = await lstat(absolute, {bigint: true});
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs || await realpath(absolute) !== absolute) {
    throw new Error('unstable-file');
  }
  return digest;
};
const observeRoleBindings = async (workspaceRoot, bindings) => {
  const observed = [];
  for (const binding of bindings) {
    const bytes = await stableRead(workspaceRoot, binding.path);
    const digest = sha256(bytes);
    if (digest !== binding.fileSha256) return Object.freeze({status: 'mismatch'});
    observed.push(Object.freeze({role: binding.role, path: binding.path, fileSha256: digest}));
  }
  return Object.freeze({status: 'passed', observed: Object.freeze(observed)});
};
const observeRuntime = async job => {
  if (Object.hasOwn(process.env, 'NODE_OPTIONS')) return false;
  for (const binding of [job.runtimeProfile.node, job.runtimeProfile.tsx]) {
    const before = await realpath(binding.path);
    const after = await realpath(binding.path);
    if (before !== after || await streamingSha(after) !== binding.fileSha256) return false;
  }
  return await realpath(process.execPath) === await realpath(job.runtimeProfile.node.path);
};
const codecFormalBytes = (codec, value) => {
  const result = codec.serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal-json-invalid');
  return result.bytes;
};
const codecCanonicalBytes = (codec, value) => {
  const result = codec.canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonical-json-invalid');
  return result.bytes;
};
const codecHash = (codec, bytes) => {
  const result = codec.sha256PresentationCaptionB1BytesV001(bytes);
  if (result.status !== 'hashed') throw new TypeError('hash-input-invalid');
  return result.sha256;
};
const readBoundJson = async ({
  workspaceRoot,
  binding,
  versionField,
  validate,
  modules,
  finite = false,
}) => {
  if (!['schemaVersion', 'registryVersion'].includes(versionField)) {
    throw new TypeError('invalid-version-field');
  }
  const bytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const decoded = finite
    ? modules.finite.decodePresentationOutputFiniteJsonV001(bytes)
    : modules.codec.decodePresentationCaptionB1StrictJsonV001(bytes);
  const value = decoded.status === 'decoded' ? decoded.value : null;
  const canonicalSha256 = value === null
    ? null
    : finite
      ? modules.finite.canonicalSha256PresentationOutputFiniteJsonV001(value)
      : codecHash(modules.codec, codecCanonicalBytes(modules.codec, value));
  if (value === null || value[versionField] !== binding.schemaVersion
    || codecHash(modules.codec, bytes) !== binding.fileSha256
    || canonicalSha256 !== binding.canonicalSha256
    || (validate && !validate(value))) return Object.freeze({status: 'mismatch'});
  return Object.freeze({status: 'passed', bytes, value});
};
const observeCaseInputs = async ({workspaceRoot, job, modules}) => {
  const meaningByPath = new Map();
  for (const binding of job.meaningPackageBindings) {
    const observed = await readBoundJson({
      workspaceRoot,
      binding,
      versionField: 'schemaVersion',
      modules,
      validate: value => modules.meaning.validatePresentationAMeaningInformationPackageV002(value),
    });
    if (observed.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
    meaningByPath.set(binding.path, observed.value);
  }
  const caseInputs = [];
  for (const context of job.caseContexts) {
    if (!meaningByPath.has(context.meaningPackageBinding.path)) {
      return Object.freeze({status: 'binding-mismatch'});
    }
    const baseArtifacts = {};
    const mediaObservation = await modules.publication
      .observePresentationMeaningWorkspaceFileStableStreamingV001({
        workspaceRoot,
        relativePath: context.baseMediaInput.baseMedia.path,
      });
    if (mediaObservation.fileSha256 !== context.baseMediaInput.baseMedia.fileSha256) {
      return Object.freeze({status: 'binding-mismatch'});
    }
    baseArtifacts.baseMedia = clone(context.baseMediaInput.baseMedia);
    for (const role of ['timeline', 'generationManifest', 'validationReceipt']) {
      const observed = await readBoundJson({
        workspaceRoot,
        binding: context.baseMediaInput[role],
        versionField: 'schemaVersion',
        modules,
        finite: true,
      });
      if (observed.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
      baseArtifacts[role] = observed.value;
    }
    const artifacts = {};
    for (const role of STYLE_BINDING_KEYS) {
      const observed = await readBoundJson({
        workspaceRoot,
        binding: context.styleBindings[role],
        versionField: STYLE_VERSION_FIELD_BY_ROLE[role],
        modules,
        finite: true,
      });
      if (observed.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
      artifacts[role] = observed.value;
    }
    let resolved;
    try {
      resolved = await modules.style.resolvePresentationOutputStyleV001({
        styleInput: context.horizontalStyleInput,
        artifacts,
        baseMediaInput: context.baseMediaInput,
        baseMediaInspection: null,
      });
    } catch {
      return Object.freeze({status: 'execution-failed', stage: 'style-resolution'});
    }
    if (resolved.status !== 'resolved') {
      return Object.freeze({status: 'style-invalid'});
    }
    caseInputs.push({
      caseId: context.caseId,
      meaningPackage: meaningByPath.get(context.meaningPackageBinding.path),
      resolvedStyle: resolved.resolvedStyle,
      layoutContext: resolved.layoutContext,
    });
  }
  return Object.freeze({status: 'passed', caseInputs: Object.freeze(caseInputs)});
};
const rereadSnapshot = async (workspaceRoot, bindings, snapshot) => {
  const observed = await observeRoleBindings(workspaceRoot, bindings);
  return observed.status === 'passed' && same(observed.observed, snapshot);
};
export async function executePresentationOutputCaptionCueSourceJobV001(input) {
  if (!exactKeys(input, EXECUTION_KEYS)
    || !nonempty(input.jobPath)
    || typeof input.atomicDirectoryPublisherLoader !== 'function') {
    return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_SOURCE_JOB_INVALID'});
  }
  const {jobPath, atomicDirectoryPublisherLoader} = input;
  const workspaceRoot = inferWorkspaceRoot(jobPath);
  const relativePath = relativeJobPath(workspaceRoot, jobPath);
  let jobBytes;
  let job;
  try {
    jobBytes = await stableRead(workspaceRoot, relativePath);
    const decoded = decodePresentationOutputCaptionCueSourceJobV001(jobBytes);
    if (decoded.status !== 'decoded') {
      return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_SOURCE_JOB_INVALID'});
    }
    job = decoded.value;
    const expectedJobPath = `evals/clip_composition/jobs/presentation/output-caption-cue-source-jobs/${job.jobId}.json`;
    if (relativePath !== expectedJobPath || !await observeRuntime(job)) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SOURCE_JOB_INVALID'});
    }
  } catch {
    return cliResult({status: 'fatal', stage: 'job-read', primaryCode: 'CUE_SOURCE_EXECUTION_FAILED'});
  }

  let implementationStart;
  let runtimeDataStart;
  let contractStart;
  let modules;
  let atomicDirectoryPublisher;
  try {
    implementationStart = await observeRoleBindings(workspaceRoot, job.implementationBindings);
    runtimeDataStart = await observeRoleBindings(workspaceRoot, job.runtimeDataBindings);
    contractStart = await observeRoleBindings(workspaceRoot, job.approvedContractBindings);
    if ([implementationStart, runtimeDataStart, contractStart].some(item => item.status !== 'passed')) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SOURCE_JOB_INVALID'});
    }
    const style = await import('./presentation_output_style_resolver_v001.ts');
    if (!isObject(style)
      || typeof style.resolvePresentationOutputStyleV001 !== 'function') {
      throw new Error('style-export-missing');
    }
    const codec = await import('./presentation_caption_semantic_source_package_v001.mjs');
    const meaning = await import('./presentation_a_meaning_information_package_v002.mjs');
    const finite = await import('./presentation_output_crop_application_v001.mjs');
    const publication = await import('./presentation_timeline_composition_decision_v001.mjs');
    modules = {style, codec, meaning, finite, publication};
  } catch {
    return cliResult({status: 'fatal', job, stage: 'input-reread', primaryCode: 'CUE_SOURCE_EXECUTION_FAILED'});
  }
  try {
    atomicDirectoryPublisher = await atomicDirectoryPublisherLoader();
    if (typeof atomicDirectoryPublisher !== 'function') {
      throw new TypeError('atomic publisher loader did not return a function');
    }
    if (!await rereadSnapshot(workspaceRoot, job.implementationBindings, implementationStart.observed)
      || !await rereadSnapshot(workspaceRoot, job.runtimeDataBindings, runtimeDataStart.observed)
      || !await rereadSnapshot(workspaceRoot, job.approvedContractBindings, contractStart.observed)) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SOURCE_JOB_INVALID'});
    }
  } catch {
    return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
  }

  let inputs;
  try {
    inputs = await observeCaseInputs({workspaceRoot, job, modules});
  } catch {
    return cliResult({status: 'fatal', job, stage: 'input-reread', primaryCode: 'CUE_SOURCE_EXECUTION_FAILED'});
  }
  if (inputs.status === 'binding-mismatch') {
    return cliResult({status: 'rejected', job, stage: 'input-reread', primaryCode: 'CUE_SOURCE_INPUT_BINDING_INVALID'});
  }
  if (inputs.status === 'execution-failed') {
    return cliResult({status: 'fatal', job, stage: 'style-resolution', primaryCode: 'CUE_SOURCE_EXECUTION_FAILED'});
  }
  if (inputs.status === 'style-invalid') {
    return cliResult({status: 'rejected', job, stage: 'style-resolution', primaryCode: 'CUE_SOURCE_STYLE_INVALID'});
  }
  const sourcePackageJobBinding = {
    schemaVersion: JOB_SCHEMA,
    path: relativePath,
    fileSha256: codecHash(modules.codec, jobBytes),
    canonicalSha256: codecHash(modules.codec, codecCanonicalBytes(modules.codec, job)),
  };
  let built;
  try {
    built = buildPresentationOutputCaptionCueSourcePackageV001({
      job,
      sourcePackageJobBinding,
      caseInputs: inputs.caseInputs,
    });
  } catch {
    return cliResult({status: 'fatal', job, stage: 'package-build', primaryCode: 'CUE_SOURCE_EXECUTION_FAILED'});
  }
  if (built.status !== 'passed') {
    const stage = built.primaryCode === 'CUE_SOURCE_STYLE_INVALID'
      ? 'style-resolution'
      : built.primaryCode === 'CUE_SOURCE_PROMPT_PROJECTION_INVALID'
        ? 'package-validation'
        : built.primaryCode === 'CUE_SOURCE_INPUT_BINDING_INVALID'
          ? 'input-reread'
          : 'package-build';
    return cliResult({status: 'rejected', job, stage, primaryCode: built.primaryCode});
  }
  const bytes = codecFormalBytes(modules.codec, built.value.sourcePackage);
  const decodedResult = modules.codec.decodePresentationCaptionB1StrictJsonV001(bytes);
  const decodedOutput = decodedResult.status === 'decoded' ? decodedResult.value : null;
  if (decodedOutput === null
    || validatePresentationOutputCaptionCueSourcePackageV001(decodedOutput).status !== 'passed'
    || !same(decodedOutput, built.value.sourcePackage)) {
    return cliResult({status: 'rejected', job, stage: 'package-validation', primaryCode: 'CUE_SOURCE_PROMPT_PROJECTION_INVALID'});
  }
  let claim;
  try {
    claim = await modules.publication.createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot: path.posix.dirname(job.outputPath),
    });
  } catch (error) {
    if (['publication-target-exists', 'publication-staging-exists'].includes(error?.message)) {
      return cliResult({status: 'rejected', job, stage: 'root-publication', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
    }
    return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
  }
  try {
    const stagedPath = path.join(claim.stagingAbsolute, 'source-package-v001.json');
    await writeFile(stagedPath, bytes, {flag: 'wx'});
    const stagedBytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: `${claim.stagingRelative}/source-package-v001.json`,
    });
    const stagedDecoded = modules.codec.decodePresentationCaptionB1StrictJsonV001(stagedBytes);
    const stagedValue = stagedDecoded.status === 'decoded' ? stagedDecoded.value : null;
    if (!stagedBytes.equals(bytes) || stagedValue === null
      || validatePresentationOutputCaptionCueSourcePackageV001(stagedValue).status !== 'passed') {
      throw new Error('source-package-reread-failed');
    }
    const currentJob = await stableRead(workspaceRoot, relativePath);
    if (!currentJob.equals(jobBytes)
      || !await rereadSnapshot(workspaceRoot, job.implementationBindings, implementationStart.observed)
      || !await rereadSnapshot(workspaceRoot, job.runtimeDataBindings, runtimeDataStart.observed)
      || !await rereadSnapshot(workspaceRoot, job.approvedContractBindings, contractStart.observed)) {
      throw new Error('prepublication-reread-failed');
    }
  } catch {
    return cliResult({status: 'fatal', job, stage: 'package-validation', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
  }
  try {
    const published = await atomicDirectoryPublisher({
      workspaceRoot,
      stagingRoot: claim.stagingAbsolute,
      outputRoot: claim.outputAbsolute,
      verifiedImplementationBindings: job.implementationBindings,
    });
    if (published.status !== 'published') {
      return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
    }
  } catch {
    return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED'});
  }
  return cliResult({status: 'passed', job, stage: 'completed', primaryCode: null});
}

const MODULE_PATH = fileURLToPath(import.meta.url);
const loadFormalAtomicDirectoryPublisherV001 = async () => {
  const atomic = await import('./presentation_atomic_directory_publish_v001.mjs');
  const expected = [
    'classifyPresentationAtomicDirectoryPublishObservationV001',
    'executePresentationAtomicDirectoryNativeHelperV001',
    'preparePresentationDirectoryAtomicPublishV001',
    'publishPresentationDirectoryAtomicallyNoReplaceV001',
  ];
  if (!isObject(atomic)
    || !same(Object.keys(atomic), expected)
    || !expected.every(name => typeof atomic[name] === 'function')) {
    throw new TypeError('atomic publisher export set invalid');
  }
  return atomic.publishPresentationDirectoryAtomicallyNoReplaceV001;
};
if (process.argv[1] && path.basename(process.argv[1]) === path.basename(MODULE_PATH)) {
  let direct = false;
  try {
    const first = await realpath(process.argv[1]);
    const second = await realpath(process.argv[1]);
    direct = first === second && first === await realpath(MODULE_PATH);
  } catch {}
  if (direct) {
    if (process.argv.slice(2).length !== 1) {
      process.stderr.write('usage: presentation_output_caption_cue_source_package_v001.mjs <job-path>\n');
      process.exitCode = 2;
    } else {
      const result = await executePresentationOutputCaptionCueSourceJobV001({
        jobPath: process.argv[2],
        atomicDirectoryPublisherLoader: loadFormalAtomicDirectoryPublisherV001,
      });
      process.stdout.write(formalBytes(result));
      process.exitCode = result.status === 'passed' ? 0 : result.status === 'rejected' ? 1 : 2;
    }
  }
}

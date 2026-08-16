import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const JOB_SCHEMA = 'presentation-output-caption-cue-selection-job-v001';
const SELECTION_SCHEMA = 'presentation-output-caption-cue-selection-v001';
const REPORT_SCHEMA = 'presentation-output-caption-cue-selection-report-v001';
const CLI_SCHEMA = 'presentation-zevo-caption-local-cli-result-v001';
const SOURCE_SCHEMA = 'presentation-output-caption-cue-source-package-v001';
const B6_MANIFEST_SCHEMA = 'presentation-output-caption-cue-b6-manifest-v001';
const ENVELOPE_SCHEMA = 'presentation-output-caption-cue-provider-response-envelope-v001';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const FIXED_NODE = Object.freeze({
  path: '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node',
  fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c',
});
const FIXED_TSX = Object.freeze({
  path: '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs',
  fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f',
});

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;

const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
};
const canonicalBytes = value => Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const logicalWidth = text => [...text].reduce(
  (total, character) => total + (character.codePointAt(0) <= 0xff ? 1 : 2),
  0,
);

const byteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && FORMAL_ID.test(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const roleBinding = value => exactKeys(value, ['role', 'path', 'fileSha256'])
  && FORMAL_ID.test(value.role) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);
const violation = (code, pointer, relatedIds = []) => Object.freeze({
  code,
  path: pointer,
  relatedIds: Object.freeze([...new Set(relatedIds)].sort()),
});
const rejected = (primaryCode, pointer, relatedIds = []) => Object.freeze({
  status: 'rejected',
  primaryCode,
  violations: Object.freeze([violation(primaryCode, pointer, relatedIds)]),
});
const failedProjection = (failedProjectionClass, {
  caseId = null,
  inputCaptionId = null,
  violationPath,
  relatedIds = [],
}) => Object.freeze({
  status: 'rejected',
  failedProjectionClass,
  failureDetail: Object.freeze({
    caseId,
    inputCaptionId,
    violationPath,
    relatedIds: Object.freeze([...new Set(relatedIds)].sort()),
  }),
});
const stageError = ({failedProjectionClass, dependencyKey, caseId, inputCaptionId, cause}) =>
  Object.freeze({
    tag: 'presentation-output-caption-cue-shared-stage-error-v001',
    failedProjectionClass,
    dependencyKey,
    caseId,
    inputCaptionId,
    cause,
  });

const JOB_KEYS = Object.freeze([
  'schemaVersion', 'jobId', 'attemptId', 'sourcePackageBinding',
  'b6ManifestBinding', 'providerEnvelopeBinding', 'outputRoot', 'runtimeProfile',
  'implementationBindings', 'runtimeDataBindings', 'approvedContractBindings',
]);
const CHECK_KEYS = Object.freeze([
  'sourceBinding', 'providerEnvelope', 'responseSchema', 'captionSet',
  'cueBoundaryResolution', 'cueOrder', 'lineBoundaryResolution', 'lineOrder',
  'atomClosure', 'logicalWidth', 'deterministicReconstruction', 'physicalLayout',
  'timelineMapping',
]);
const ALL_CODES = Object.freeze([
  'CUE_SELECTION_JOB_INVALID', 'CUE_SELECTION_INPUT_BINDING_MISMATCH',
  'CUE_PROVIDER_RESPONSE_INVALID', 'CUE_PROVIDER_ABSTAINED',
  'CUE_CAPTION_SET_MISMATCH', 'CUE_BOUNDARY_ID_INVALID', 'CUE_ORDER_INVALID',
  'CUE_LINE_END_INVALID', 'CUE_ATOM_COVERAGE_INVALID', 'CUE_LINE_WIDTH_INVALID',
  'CUE_PHYSICAL_LAYOUT_INVALID', 'CUE_TIMELINE_MAPPING_INVALID',
  'CUE_SELECTION_EXECUTION_FAILED', 'CUE_SELECTION_PUBLICATION_FAILED',
]);

const CONTRACTS = Object.freeze([
  Object.freeze({role: 'caption-quality-atomic-publication-b6-owner-scope-revision-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', fileSha256: '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'}),
  Object.freeze({role: 'caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', fileSha256: 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'}),
  Object.freeze({role: 'caption-quality-b6-credential-unavailable-owner-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', fileSha256: '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'}),
  Object.freeze({role: 'caption-quality-complete-implementation-design', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', fileSha256: '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'}),
  Object.freeze({role: 'caption-quality-complete-implementation-design-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', fileSha256: 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'}),
  Object.freeze({role: 'caption-quality-dependency-load-stage-observation-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', fileSha256: '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'}),
  Object.freeze({role: 'caption-quality-dependency-unit-observation-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', fileSha256: '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'}),
  Object.freeze({role: 'caption-quality-formal-capability-read-entry-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', fileSha256: '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'}),
  Object.freeze({role: 'caption-quality-parent-contract', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', fileSha256: '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'}),
  Object.freeze({role: 'caption-quality-pre-staging-inner-observation-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', fileSha256: '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'}),
  Object.freeze({role: 'caption-quality-proof-capability-and-tsx-namespace-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', fileSha256: 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'}),
  Object.freeze({role: 'caption-quality-resolved-url-evaluation-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', fileSha256: '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'}),
  Object.freeze({role: 'caption-quality-runtime-live-binding-separation-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', fileSha256: '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'}),
  Object.freeze({role: 'caption-quality-selection-runtime-value-wiring-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', fileSha256: '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'}),
  Object.freeze({role: 'caption-quality-source-final-package-validator-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', fileSha256: '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'}),
  Object.freeze({role: 'caption-quality-tsx-wrapper-descriptor-addendum', path: 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', fileSha256: '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'}),
]);

const SELECTION_ROLE_PATHS = Object.freeze([
  ['atomic-directory-publisher-adapter-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
  ['atomic-directory-publisher-native-darwin-arm64-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64'],
  ['atomic-directory-publisher-native-source-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.c'],
  ['caption-cue-api-runner', 'evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs'],
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
  ['dep-output-crop-application-v001', 'evals/clip_composition/presentation_output_crop_application_v001.mjs'],
  ['dep-page-line-planner-v001', 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'],
  ['dep-page-line-planner-v002', 'evals/clip_composition/presentation_output_page_line_planner_v002.mjs'],
  ['dep-piecewise-timeline-v002', 'evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs'],
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

const rolePathsMatch = (bindings, expected) => dense(bindings)
  && bindings.length === expected.length
  && bindings.every(roleBinding)
  && bindings.every((binding, index) => binding.role === expected[index][0]
    && binding.path === expected[index][1]);

export function validatePresentationOutputCaptionCueSelectionJobV001(value) {
  const fail = pointer => Object.freeze({
    status: 'rejected',
    violations: Object.freeze([violation('CUE_SELECTION_JOB_INVALID', pointer)]),
  });
  if (!exactKeys(value, JOB_KEYS) || value.schemaVersion !== JOB_SCHEMA
    || !FORMAL_ID.test(value.jobId) || !FORMAL_ID.test(value.attemptId)
    || !formalBinding(value.sourcePackageBinding)
    || value.sourcePackageBinding.schemaVersion !== SOURCE_SCHEMA
    || !formalBinding(value.b6ManifestBinding)
    || value.b6ManifestBinding.schemaVersion !== B6_MANIFEST_SCHEMA
    || !formalBinding(value.providerEnvelopeBinding)
    || value.providerEnvelopeBinding.schemaVersion !== ENVELOPE_SCHEMA
    || !WORKSPACE_PATH.test(value.outputRoot)) return fail('/');
  if (value.outputRoot !== `evals/clip_composition/outputs/presentation/output-caption-cue-selections/${value.jobId}-${value.attemptId}`) {
    return fail('/outputRoot');
  }
  if (!exactKeys(value.runtimeProfile, ['node', 'tsx'])
    || !same(value.runtimeProfile.node, FIXED_NODE)
    || !same(value.runtimeProfile.tsx, FIXED_TSX)) return fail('/runtimeProfile');
  if (!rolePathsMatch(value.implementationBindings, SELECTION_ROLE_PATHS)) {
    return fail('/implementationBindings');
  }
  if (!rolePathsMatch(value.runtimeDataBindings, [[
    'renderer-core-speaker-registry',
    'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json',
  ]])) return fail('/runtimeDataBindings');
  const expectedContracts = CONTRACTS.map(item => [item.role, item.path]);
  if (!rolePathsMatch(value.approvedContractBindings, expectedContracts)
    || !value.approvedContractBindings.every((item, index) => (
      item.fileSha256 === CONTRACTS[index].fileSha256
    ))) return fail('/approvedContractBindings');
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

const strictParse = bytes => {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return null;
  const text = bytes.toString('utf8');
  if (Buffer.byteLength(text, 'utf8') !== bytes.length
    || text.startsWith('{') === false
    || !(text.endsWith('}') || text.endsWith('}\n'))
    || text.endsWith('\n') && !text.endsWith('}\n')
    || /^[\s]|[\t\r ]$/u.test(text)
    || text.includes('```')) return null;
  try {
    const value = JSON.parse(text);
    if (!isObject(value) || !same(formalBytes(value), bytes)) return null;
    return value;
  } catch {
    return null;
  }
};

export function decodePresentationOutputCaptionCueSelectionJobV001(bytes) {
  const value = strictParse(bytes);
  if (value === null) return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  return validatePresentationOutputCaptionCueSelectionJobV001(value).status === 'passed'
    ? Object.freeze({status: 'decoded', value})
    : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
}

const deriveMeaningValues = ({sourcePackage, sourceCaseContext, meaningPackage}) => {
  if (!isObject(sourcePackage) || !isObject(sourceCaseContext) || !isObject(meaningPackage)) {
    throw new TypeError('meaning values input is invalid');
  }
  const captionIndex = sourcePackage.promptInput.captions.findIndex(
    item => item.captionId === sourceCaseContext.inputCaptionId,
  );
  if (captionIndex < 0) throw new TypeError('source caption is unresolved');
  const reconstructionCaption = sourcePackage.reconstructionMap.captions[captionIndex];
  const packageIndex = reconstructionCaption.meaningPackageOrdinal - 1;
  if (!nonnegative(packageIndex)
    || !same(sourcePackage.reconstructionMap.meaningPackageBindings[packageIndex], sourceCaseContext.meaningPackageBinding)) {
    throw new TypeError('meaning binding is unresolved');
  }
  const candidates = meaningPackage.captions.filter(
    item => item.captionId === reconstructionCaption.semanticCaptionId,
  );
  if (candidates.length !== 1) throw new TypeError('semantic caption is unresolved');
  const semanticCaption = candidates[0];
  const semanticIndex = meaningPackage.captions.indexOf(semanticCaption);
  if (semanticCaption.ordinal !== semanticIndex + 1
    || !same(semanticCaption.atomOccurrenceIds, reconstructionCaption.atomOccurrenceIds)) {
    throw new TypeError('semantic caption closure is invalid');
  }
  const occurrenceById = new Map(meaningPackage.atomOccurrences.map(item => [
    item.atomOccurrenceId,
    item,
  ]));
  const records = semanticCaption.atomOccurrenceIds.map(id => {
    const occurrence = occurrenceById.get(id);
    if (!isObject(occurrence)) throw new TypeError('atom occurrence is unresolved');
    return {
      atomRef: {
        atomOccurrenceId: occurrence.atomOccurrenceId,
        sourceMediaId: occurrence.sourceMediaId,
        sourceAtomId: occurrence.sourceAtomId,
      },
      text: occurrence.text,
      startMs: occurrence.sourceAtomInterval.sourceStartMs,
      endMs: occurrence.sourceAtomInterval.sourceEndMs,
      retainedSpans: clone(occurrence.retainedSpans),
    };
  });
  if (records.map(item => item.text).join('') !== semanticCaption.text) {
    throw new TypeError('atom text closure is invalid');
  }
  return Object.freeze({semanticCaption: clone(semanticCaption), records: clone(records)});
};

const targetFileFrom = binding => formalBinding(binding) || byteBinding(binding)
  ? Object.freeze({path: binding.path, fileSha256: binding.fileSha256})
  : null;
const idsFor = context => [context.caseId, context.inputCaptionId].sort();
const failureDetail = ({context, violationPath = null, innerCode = null, targetFile = null}) =>
  Object.freeze({
    caseId: context?.caseId ?? null,
    inputCaptionId: context?.inputCaptionId ?? null,
    violationPath,
    innerCode,
    targetFile,
    toolExitCode: null,
  });

const safeFatalCode = (cause, classifier) => {
  let evidence;
  if (isObject(cause) && typeof cause.code === 'string') {
    evidence = {kind: 'node-error', code: cause.code};
  } else if (exactKeys(cause, ['kind']) && [
    'file-changed-during-read', 'formal-json-value-invalid',
    'binding-reference-mismatch', 'required-export-missing',
    'publication-failed', 'unclassified',
  ].includes(cause.kind)) {
    evidence = {kind: cause.kind};
  } else {
    evidence = {kind: 'unclassified'};
  }
  const code = classifier(evidence);
  return [
    'ERR_FS_FILE_TOO_LARGE', 'FILE_CHANGED_DURING_READ', 'NUMERIC_TOKEN_INVALID',
    'FORMAL_JSON_VALUE_INVALID', 'BINDING_REFERENCE_MISMATCH',
    'REQUIRED_EXPORT_MISSING', 'OS_PERMISSION_DENIED', 'PUBLICATION_FAILED',
    'UNCLASSIFIED',
  ].includes(code) ? code : 'UNCLASSIFIED';
};

const validateDependencies = (value, keys) => exactKeys(value, keys)
  && keys.every(key => typeof value[key] === 'function');

export async function rereadPresentationOutputCaptionCueCaseInputsV001(input) {
  const dependencyKeys = [
    'readWorkspaceFileStable', 'validateMeaningPackageFormalBytes',
    'canonicalSha256MeaningJson', 'hashMeaningBytes', 'decodeFiniteJson',
    'serializeFiniteJson', 'canonicalSha256FiniteJson', 'hashFiniteBytes',
    'hashStableMedia', 'classifyFatalInnerCode',
  ];
  if (!exactKeys(input, ['workspaceRoot', 'sourcePackage', 'rereadDependencies'])
    || typeof input.workspaceRoot !== 'string'
    || !validateDependencies(input.rereadDependencies, dependencyKeys)) {
    throw new TypeError('case input reader argument is invalid');
  }
  const {workspaceRoot, sourcePackage, rereadDependencies: dependencies} = input;
  const validatedMeaningCases = [];
  const meaningByPath = new Map();

  for (const [caseIndex, context] of sourcePackage.reconstructionMap.caseContexts.entries()) {
    const binding = context.meaningPackageBinding;
    const pointer = `/reconstructionMap/caseContexts/${caseIndex}/meaningPackageBinding`;
    try {
      let observed = meaningByPath.get(binding.path);
      if (observed === undefined) {
        const bytes = await dependencies.readWorkspaceFileStable({
          workspaceRoot,
          relativePath: binding.path,
          allowHardlink: false,
        });
        const decoded = dependencies.validateMeaningPackageFormalBytes(bytes, {});
        const hashed = dependencies.hashMeaningBytes(bytes);
        if (decoded?.status !== 'passed' || !isObject(decoded.value)
          || hashed?.status !== 'hashed' || hashed.sha256 !== binding.fileSha256
          || dependencies.canonicalSha256MeaningJson(decoded.value) !== binding.canonicalSha256
          || decoded.value.schemaVersion !== binding.schemaVersion) {
          return Object.freeze({
            status: 'rejected',
            failedInputClass: 'meaning-binding',
            primaryCode: 'CUE_SELECTION_INPUT_BINDING_MISMATCH',
            violations: Object.freeze([violation(
              'CUE_SELECTION_INPUT_BINDING_MISMATCH', pointer, idsFor(context),
            )]),
            failureDetail: failureDetail({context, violationPath: pointer, targetFile: targetFileFrom(binding)}),
            validatedMeaningCases: Object.freeze(validatedMeaningCases),
          });
        }
        observed = decoded.value;
        meaningByPath.set(binding.path, observed);
      }
      const values = deriveMeaningValues({sourcePackage, sourceCaseContext: context, meaningPackage: observed});
      validatedMeaningCases.push(Object.freeze({
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        meaningPackageBinding: clone(binding),
        meaningPackage: clone(observed),
        semanticCaption: values.semanticCaption,
        records: values.records,
      }));
    } catch (cause) {
      if (cause instanceof TypeError) {
        const captionIndex = sourcePackage.promptInput.captions.findIndex(
          item => item.captionId === context.inputCaptionId,
        );
        const violationPath = `/reconstructionMap/captions/${captionIndex}`;
        return Object.freeze({
          status: 'rejected',
          failedInputClass: 'meaning-closure',
          primaryCode: 'CUE_ATOM_COVERAGE_INVALID',
          violations: Object.freeze([violation('CUE_ATOM_COVERAGE_INVALID', violationPath, idsFor(context))]),
          failureDetail: failureDetail({context, violationPath, targetFile: targetFileFrom(binding)}),
          validatedMeaningCases: Object.freeze(validatedMeaningCases),
        });
      }
      return Object.freeze({
        status: 'fatal',
        failedInputClass: 'meaning-read',
        failureDetail: failureDetail({
          context,
          innerCode: safeFatalCode(cause, dependencies.classifyFatalInnerCode),
          targetFile: targetFileFrom(binding),
        }),
        validatedMeaningCases: Object.freeze(validatedMeaningCases),
      });
    }
  }

  const valueCache = new Map();
  const mediaCache = new Map();
  const readFinite = async (binding, versionField) => {
    if (valueCache.has(binding.path)) return valueCache.get(binding.path);
    const bytes = await dependencies.readWorkspaceFileStable({
      workspaceRoot,
      relativePath: binding.path,
      allowHardlink: false,
    });
    const decoded = dependencies.decodeFiniteJson(bytes);
    if (decoded?.status !== 'decoded'
      || !Buffer.from(dependencies.serializeFiniteJson(decoded.value)).equals(bytes)
      || dependencies.hashFiniteBytes(bytes) !== binding.fileSha256
      || dependencies.canonicalSha256FiniteJson(decoded.value) !== binding.canonicalSha256
      || decoded.value?.[versionField] !== binding.schemaVersion) {
      throw Object.freeze({kind: 'binding-reference-mismatch'});
    }
    valueCache.set(binding.path, decoded.value);
    return decoded.value;
  };
  const caseInputs = [];
  const styleRoles = [
    ['trustedRegistryBindings', 'schemaVersion'], ['presetRegistry', 'schemaVersion'],
    ['presetValidationIndex', 'registryVersion'], ['materialValidationIndex', 'registryVersion'],
    ['rendererTrust', 'schemaVersion'],
  ];
  const baseRoles = [
    ['baseMedia', null], ['timeline', 'schemaVersion'],
    ['generationManifest', 'schemaVersion'], ['validationReceipt', 'schemaVersion'],
  ];
  for (const [caseIndex, context] of sourcePackage.reconstructionMap.caseContexts.entries()) {
    const meaning = validatedMeaningCases[caseIndex];
    const styleArtifacts = {};
    const baseMediaResolverInput = {};
    try {
      for (const [role, versionField] of styleRoles) {
        const binding = context.styleBindings[role];
        styleArtifacts[role] = clone(await readFinite(binding, versionField));
      }
      for (const [role, versionField] of baseRoles) {
        const binding = context.baseMediaInput[role];
        if (role === 'baseMedia') {
          let digest = mediaCache.get(binding.path);
          if (digest === undefined) {
            const absolute = path.resolve(workspaceRoot, binding.path);
            if (absolute !== workspaceRoot && !absolute.startsWith(`${workspaceRoot}${path.sep}`)) {
              throw Object.freeze({kind: 'binding-reference-mismatch'});
            }
            digest = await dependencies.hashStableMedia(absolute);
            mediaCache.set(binding.path, digest);
          }
          if (digest !== binding.fileSha256) throw Object.freeze({kind: 'binding-reference-mismatch'});
          baseMediaResolverInput.baseMedia = clone(binding);
        } else {
          baseMediaResolverInput[role] = clone(await readFinite(binding, versionField));
        }
      }
    } catch (cause) {
      const styleRole = styleRoles.find(([role]) => styleArtifacts[role] === undefined)?.[0];
      const baseRole = baseRoles.find(([role]) => baseMediaResolverInput[role] === undefined)?.[0];
      const role = styleRole ?? baseRole;
      const owner = styleRole === undefined ? 'baseMediaInput' : 'styleBindings';
      const binding = context[owner][role];
      const pointer = `/reconstructionMap/caseContexts/${caseIndex}/${owner}/${role}`;
      const checked = exactKeys(cause, ['kind']) && cause.kind === 'binding-reference-mismatch';
      if (checked) {
        return Object.freeze({
          status: 'rejected',
          failedInputClass: 'style-or-base-binding',
          primaryCode: 'CUE_SELECTION_INPUT_BINDING_MISMATCH',
          violations: Object.freeze([violation('CUE_SELECTION_INPUT_BINDING_MISMATCH', pointer, idsFor(context))]),
          failureDetail: failureDetail({context, violationPath: pointer, targetFile: targetFileFrom(binding)}),
          validatedMeaningCases: Object.freeze(validatedMeaningCases),
        });
      }
      return Object.freeze({
        status: 'fatal',
        failedInputClass: 'style-or-base-read',
        failureDetail: failureDetail({
          context,
          innerCode: safeFatalCode(cause, dependencies.classifyFatalInnerCode),
          targetFile: targetFileFrom(binding),
        }),
        validatedMeaningCases: Object.freeze(validatedMeaningCases),
      });
    }
    caseInputs.push(Object.freeze({
      ...clone(meaning),
      baseMediaBindings: clone(context.baseMediaInput),
      baseMediaResolverInput,
      styleArtifacts,
    }));
  }
  return Object.freeze({
    status: 'passed',
    validatedMeaningCases: Object.freeze(validatedMeaningCases),
    caseInputs: Object.freeze(caseInputs),
  });
}

const cueRangesFor = ({sourcePackage, selectionCaption, validatedMeaningCase, captionIndex}) => {
  const promptCaption = sourcePackage.promptInput.captions[captionIndex];
  const reconstructionCaption = sourcePackage.reconstructionMap.captions[captionIndex];
  if (!isObject(selectionCaption) || selectionCaption.captionId !== promptCaption.captionId
    || !dense(selectionCaption.cues) || selectionCaption.cues.length === 0
    || promptCaption.boundaryCandidates.length !== validatedMeaningCase.records.length
    || reconstructionCaption.boundaries.length !== validatedMeaningCase.records.length) return null;
  const ordinalByBoundary = new Map();
  for (const [index, boundary] of promptCaption.boundaryCandidates.entries()) {
    const reconstructionBoundary = reconstructionCaption.boundaries[index];
    const record = validatedMeaningCase.records[index];
    if (!exactKeys(boundary, ['boundaryId', 'text'])
      || boundary.text !== record.text
      || !exactKeys(reconstructionBoundary, ['boundaryId', 'ordinal', 'afterAtomOccurrenceId'])
      || reconstructionBoundary.boundaryId !== boundary.boundaryId
      || reconstructionBoundary.ordinal !== index + 1
      || reconstructionBoundary.afterAtomOccurrenceId !== record.atomRef.atomOccurrenceId) return null;
    ordinalByBoundary.set(boundary.boundaryId, index + 1);
  }
  const cueRanges = [];
  let cueStart = 0;
  for (const [cueIndex, cue] of selectionCaption.cues.entries()) {
    if (!exactKeys(cue, ['cueEndBoundaryId', 'lineEndBoundaryIds'])
      || !dense(cue.lineEndBoundaryIds)
      || cue.lineEndBoundaryIds.length < 1 || cue.lineEndBoundaryIds.length > 2) return null;
    const cueEnd = ordinalByBoundary.get(cue.cueEndBoundaryId);
    if (!positive(cueEnd) || cueEnd <= cueStart) return null;
    const lineEnds = cue.lineEndBoundaryIds.map(id => ordinalByBoundary.get(id));
    if (lineEnds.some((end, index) => !positive(end)
      || end <= (index === 0 ? cueStart : lineEnds[index - 1]) || end > cueEnd)
      || lineEnds.at(-1) !== cueEnd) return null;
    const cueRecords = validatedMeaningCase.records.slice(cueStart, cueEnd);
    const cueOrdinal = cueIndex + 1;
    const cueId = `cue-${String(captionIndex + 1).padStart(6, '0')}-${String(cueOrdinal).padStart(6, '0')}`;
    const lineRanges = [];
    let lineStart = cueStart;
    for (const [lineIndex, lineEnd] of lineEnds.entries()) {
      const lineRecords = validatedMeaningCase.records.slice(lineStart, lineEnd);
      lineRanges.push(Object.freeze({
        lineId: `line-${String(captionIndex + 1).padStart(6, '0')}-${String(cueOrdinal).padStart(6, '0')}-${String(lineIndex + 1).padStart(2, '0')}`,
        lineOrdinal: lineIndex + 1,
        startBoundaryOrdinal: lineStart,
        endBoundaryOrdinal: lineEnd,
        atomOccurrenceIds: Object.freeze(lineRecords.map(item => item.atomRef.atomOccurrenceId)),
        text: lineRecords.map(item => item.text).join(''),
      }));
      lineStart = lineEnd;
    }
    cueRanges.push(Object.freeze({
      cueId,
      cueOrdinal,
      cueEndBoundaryId: cue.cueEndBoundaryId,
      lineEndBoundaryIds: Object.freeze([...cue.lineEndBoundaryIds]),
      startBoundaryOrdinal: cueStart,
      endBoundaryOrdinal: cueEnd,
      lineEndBoundaryOrdinals: Object.freeze(lineEnds),
      atomOccurrenceIds: Object.freeze(cueRecords.map(item => item.atomRef.atomOccurrenceId)),
      text: cueRecords.map(item => item.text).join(''),
      retainedSpans: Object.freeze(cueRecords.flatMap(item => clone(item.retainedSpans))),
      lineRanges: Object.freeze(lineRanges),
    }));
    cueStart = cueEnd;
  }
  if (cueStart !== validatedMeaningCase.records.length
    || cueRanges.flatMap(item => item.atomOccurrenceIds).join('\u0000')
      !== validatedMeaningCase.records.map(item => item.atomRef.atomOccurrenceId).join('\u0000')
    || cueRanges.map(item => item.text).join('') !== validatedMeaningCase.semanticCaption.text) return null;
  return Object.freeze(cueRanges);
};

export function buildPresentationOutputCaptionCueSourceClosureV001(input) {
  if (!exactKeys(input, ['sourcePackage', 'selection', 'validatedMeaningCases'])) {
    throw stageError({
      failedProjectionClass: 'source-closure',
      dependencyKey: 'buildPresentationOutputCaptionCueSourceClosureV001',
      caseId: null,
      inputCaptionId: null,
      cause: {kind: 'formal-json-value-invalid'},
    });
  }
  const {sourcePackage, selection, validatedMeaningCases} = input;
  const contexts = sourcePackage?.reconstructionMap?.caseContexts;
  const captions = sourcePackage?.promptInput?.captions;
  if (!dense(contexts) || !dense(captions) || !dense(validatedMeaningCases)
    || contexts.length !== captions.length || validatedMeaningCases.length !== captions.length
    || selection?.status !== undefined || selection?.response?.status !== 'complete'
    || !dense(selection.response.captions)
    || selection.response.captions.length !== captions.length) {
    return failedProjection('meaning-case-binding', {
      violationPath: '/reconstructionMap/caseContexts',
      relatedIds: dense(contexts) ? contexts.flatMap(idsFor) : [],
    });
  }
  const cases = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    const validated = validatedMeaningCases[index];
    const selectionCaption = selection.response.captions[index];
    if (!isObject(validated) || validated.caseId !== context.caseId
      || validated.inputCaptionId !== context.inputCaptionId
      || !same(validated.meaningPackageBinding, context.meaningPackageBinding)
      || selectionCaption?.captionId !== context.inputCaptionId) {
      return failedProjection('meaning-case-binding', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/caseContexts/${index}`,
        relatedIds: idsFor(context),
      });
    }
    let values;
    try {
      values = deriveMeaningValues({
        sourcePackage,
        sourceCaseContext: context,
        meaningPackage: validated.meaningPackage,
      });
    } catch {
      return failedProjection('meaning-case-binding', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/captions/${index}`,
        relatedIds: idsFor(context),
      });
    }
    if (!same(values.semanticCaption, validated.semanticCaption)
      || !same(values.records, validated.records)) {
      return failedProjection('meaning-case-binding', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/captions/${index}`,
        relatedIds: idsFor(context),
      });
    }
    const cueRanges = cueRangesFor({
      sourcePackage,
      selectionCaption,
      validatedMeaningCase: validated,
      captionIndex: index,
    });
    if (cueRanges === null) {
      return failedProjection('source-closure', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/captions/${index}`,
        relatedIds: idsFor(context),
      });
    }
    cases.push(Object.freeze({
      caseId: context.caseId,
      inputCaptionId: context.inputCaptionId,
      cueRanges,
    }));
  }
  return Object.freeze({status: 'passed', cases: Object.freeze(cases)});
}

const hashText = (text, hashBytes) => {
  const result = hashBytes(Buffer.from(text, 'utf8'));
  if (!exactKeys(result, ['status', 'sha256'])
    || result.status !== 'hashed' || !SHA256.test(result.sha256)) {
    throw new TypeError('text hash result is invalid');
  }
  return result.sha256;
};

export function buildPresentationOutputCaptionCueReconstructionProjectionV001(input) {
  if (!exactKeys(input, [
    'sourceCaseContext', 'selectionCaption', 'cueRanges',
    'canonicalSha256FiniteJson', 'hashBytes',
  ]) || typeof input.canonicalSha256FiniteJson !== 'function'
    || typeof input.hashBytes !== 'function' || !dense(input.cueRanges)) {
    return rejected('CUE_RECONSTRUCTION_FAILED', '/input');
  }
  try {
    return Object.freeze({
      status: 'passed',
      value: Object.freeze({
        projection: Object.freeze({
          inputCaptionId: input.sourceCaseContext.inputCaptionId,
          caseId: input.sourceCaseContext.caseId,
          cues: Object.freeze(input.cueRanges.map(cue => Object.freeze({
            cueId: cue.cueId,
            cueEndBoundaryId: cue.cueEndBoundaryId,
            lineEndBoundaryIds: clone(cue.lineEndBoundaryIds),
            atomOccurrenceIds: clone(cue.atomOccurrenceIds),
            textSha256: hashText(cue.text, input.hashBytes),
            retainedSpansCanonicalSha256: input.canonicalSha256FiniteJson(cue.retainedSpans),
          }))),
        }),
      }),
    });
  } catch {
    return rejected('CUE_RECONSTRUCTION_FAILED', '/reconstruction');
  }
}

export function buildPresentationOutputCaptionCuePhysicalProjectionV001(input) {
  if (!exactKeys(input, [
    'sourceCaseContext', 'selectionCaption', 'cueRanges', 'resolvedStyle',
    'layoutContext', 'selectedPhysicalEdges', 'canonicalSha256FiniteJson', 'hashBytes',
  ]) || typeof input.canonicalSha256FiniteJson !== 'function'
    || typeof input.hashBytes !== 'function' || !dense(input.cueRanges)
    || !dense(input.selectedPhysicalEdges)
    || input.cueRanges.length !== input.selectedPhysicalEdges.length) {
    return rejected('CUE_PLANNER_PHYSICAL_INVALID', '/input');
  }
  try {
    const cues = input.cueRanges.map((cue, cueIndex) => {
      const edge = input.selectedPhysicalEdges[cueIndex];
      if (!exactKeys(edge, [
        'startBoundaryOrdinal', 'endBoundaryOrdinal', 'lineEndBoundaryOrdinals',
        'lines', 'sourceInterval',
      ]) || edge.startBoundaryOrdinal !== cue.startBoundaryOrdinal
        || edge.endBoundaryOrdinal !== cue.endBoundaryOrdinal
        || !same(edge.lineEndBoundaryOrdinals, cue.lineEndBoundaryOrdinals)
        || !dense(edge.lines) || edge.lines.length !== cue.lineRanges.length) {
        throw new TypeError('selected edge mismatch');
      }
      return Object.freeze({
        cueId: cue.cueId,
        startBoundaryOrdinal: cue.startBoundaryOrdinal,
        endBoundaryOrdinal: cue.endBoundaryOrdinal,
        lineEndBoundaryOrdinals: clone(cue.lineEndBoundaryOrdinals),
        lines: Object.freeze(cue.lineRanges.map((lineRange, lineIndex) => {
          const edgeLine = edge.lines[lineIndex];
          if (!exactKeys(edgeLine, ['atomRefs', 'text', 'logicalWidth'])
            || edgeLine.text !== lineRange.text || !positive(edgeLine.logicalWidth)) {
            throw new TypeError('line edge mismatch');
          }
          return Object.freeze({
            lineOrdinal: lineRange.lineOrdinal,
            atomOccurrenceIds: clone(lineRange.atomOccurrenceIds),
            textSha256: hashText(lineRange.text, input.hashBytes),
            logicalWidth: edgeLine.logicalWidth,
          });
        })),
      });
    });
    return Object.freeze({
      status: 'passed',
      value: Object.freeze({
        projection: Object.freeze({
          inputCaptionId: input.sourceCaseContext.inputCaptionId,
          caseId: input.sourceCaseContext.caseId,
          resolvedStyleCanonicalSha256: input.canonicalSha256FiniteJson(input.resolvedStyle),
          layoutContextCanonicalSha256: input.canonicalSha256FiniteJson(input.layoutContext),
          cues: Object.freeze(cues),
        }),
      }),
    });
  } catch {
    return rejected('CUE_PLANNER_PHYSICAL_INVALID', '/physical');
  }
}

export function buildPresentationOutputCaptionCueTimelineProjectionV001(input) {
  if (!exactKeys(input, [
    'sourceCaseContext', 'selectionCaption', 'cueRanges', 'timelineMappings',
  ]) || !dense(input.cueRanges) || !dense(input.timelineMappings)
    || input.cueRanges.length !== input.timelineMappings.length) {
    return rejected('CUE_PLANNER_TIMELINE_INVALID', '/input');
  }
  try {
    const cues = input.cueRanges.map((cue, index) => {
      const mapping = input.timelineMappings[index];
      if (!exactKeys(mapping, [
        'cueEndBoundaryId', 'retainedSpans', 'sourceSpanEnvelopes', 'frameMappings',
        'startFrame', 'endFrameExclusive', 'displayFrameCount',
      ]) || mapping.cueEndBoundaryId !== cue.cueEndBoundaryId
        || !same(mapping.retainedSpans, cue.retainedSpans)
        || !nonnegative(mapping.startFrame) || !positive(mapping.endFrameExclusive)
        || mapping.endFrameExclusive <= mapping.startFrame
        || mapping.displayFrameCount !== mapping.endFrameExclusive - mapping.startFrame) {
        throw new TypeError('timeline mapping mismatch');
      }
      return Object.freeze({
        cueId: cue.cueId,
        retainedSpans: clone(mapping.retainedSpans),
        sourceSpanEnvelopes: clone(mapping.sourceSpanEnvelopes),
        frameMappings: clone(mapping.frameMappings),
        startFrame: mapping.startFrame,
        endFrameExclusive: mapping.endFrameExclusive,
        displayFrameCount: mapping.displayFrameCount,
      });
    });
    return Object.freeze({
      status: 'passed',
      value: Object.freeze({
        projection: Object.freeze({
          inputCaptionId: input.sourceCaseContext.inputCaptionId,
          caseId: input.sourceCaseContext.caseId,
          cues: Object.freeze(cues),
        }),
      }),
    });
  } catch {
    return rejected('CUE_PLANNER_TIMELINE_INVALID', '/timeline');
  }
}

const projectionRejection = (failedClass, context, captionIndex, cueIndex = null) =>
  failedProjection(failedClass, {
    caseId: context.caseId,
    inputCaptionId: context.inputCaptionId,
    violationPath: cueIndex === null
      ? `/reconstructionMap/captions/${captionIndex}`
      : `/response/captions/${captionIndex}/cues/${cueIndex}`,
    relatedIds: idsFor(context),
  });

const physicalEdgeMatches = ({edge, cueRange, records}) => {
  if (!exactKeys(edge, [
    'startBoundaryOrdinal', 'endBoundaryOrdinal', 'lineEndBoundaryOrdinals',
    'lines', 'sourceInterval',
  ]) || edge.startBoundaryOrdinal !== cueRange.startBoundaryOrdinal
    || edge.endBoundaryOrdinal !== cueRange.endBoundaryOrdinal
    || !same(edge.lineEndBoundaryOrdinals, cueRange.lineEndBoundaryOrdinals)
    || !dense(edge.lines) || edge.lines.length !== cueRange.lineRanges.length
    || !exactKeys(edge.sourceInterval, ['sourceStartMs', 'sourceEndMs'])
    || edge.sourceInterval.sourceStartMs !== records[cueRange.startBoundaryOrdinal].startMs
    || edge.sourceInterval.sourceEndMs !== records[cueRange.endBoundaryOrdinal - 1].endMs) return false;
  return edge.lines.every((line, index) => {
    const range = cueRange.lineRanges[index];
    const expectedRecords = records.slice(range.startBoundaryOrdinal, range.endBoundaryOrdinal);
    return exactKeys(line, ['atomRefs', 'text', 'logicalWidth'])
      && dense(line.atomRefs)
      && same(line.atomRefs, expectedRecords.map(item => item.atomRef))
      && line.text === range.text
      && positive(line.logicalWidth);
  });
};

const captionDisplayFrom = ({captionIndex, caseInput, cueRanges, selectedEdges, timelineMappings}) =>
  Object.freeze({
    displayCaptionId: `display-caption-${String(captionIndex + 1).padStart(6, '0')}`,
    inputCaptionId: caseInput.inputCaptionId,
    semanticCaptionId: caseInput.semanticCaption.captionId,
    ordinal: captionIndex + 1,
    cues: Object.freeze(cueRanges.map((cueRange, cueIndex) => {
      const edge = selectedEdges[cueIndex];
      const mapping = timelineMappings[cueIndex];
      return Object.freeze({
        cueId: cueRange.cueId,
        cueOrdinal: cueRange.cueOrdinal,
        cueEndBoundaryId: cueRange.cueEndBoundaryId,
        lineEndBoundaryIds: clone(cueRange.lineEndBoundaryIds),
        atomOccurrenceIds: clone(cueRange.atomOccurrenceIds),
        text: cueRange.text,
        retainedSpans: clone(cueRange.retainedSpans),
        sourceSpanEnvelopes: clone(mapping.sourceSpanEnvelopes),
        frameMappings: clone(mapping.frameMappings),
        startFrame: mapping.startFrame,
        endFrameExclusive: mapping.endFrameExclusive,
        displayFrameCount: mapping.displayFrameCount,
        lines: Object.freeze(cueRange.lineRanges.map((lineRange, lineIndex) => Object.freeze({
          lineId: lineRange.lineId,
          lineOrdinal: lineRange.lineOrdinal,
          atomOccurrenceIds: clone(lineRange.atomOccurrenceIds),
          text: lineRange.text,
          logicalWidth: edge.lines[lineIndex].logicalWidth,
        }))),
      });
    })),
  });

export async function buildPresentationOutputCaptionCueProjectionSetV001(input) {
  const dependencyKeys = [
    'resolveStyle', 'validateResolvedStyle', 'buildPhysicalPageGraph',
    'mapPiecewiseTimeline', 'canonicalSha256MeaningJson',
    'canonicalSha256FiniteJson', 'serializeFiniteJson', 'hashBytes',
  ];
  if (!exactKeys(input, [
    'sourcePackage', 'selection', 'caseInputResult', 'sourceClosureResult',
    'projectionDependencies',
  ]) || !validateDependencies(input.projectionDependencies, dependencyKeys)) {
    throw stageError({
      failedProjectionClass: 'reconstruction-invalid',
      dependencyKey: 'buildPresentationOutputCaptionCueReconstructionProjectionV001',
      caseId: null,
      inputCaptionId: null,
      cause: {kind: 'formal-json-value-invalid'},
    });
  }
  const {
    sourcePackage, selection, caseInputResult, sourceClosureResult,
    projectionDependencies: dependencies,
  } = input;
  const contexts = sourcePackage.reconstructionMap.caseContexts;
  const selectionCaptions = selection.response?.captions;
  const workingCases = caseInputResult.status === 'passed'
    ? caseInputResult.caseInputs
    : caseInputResult.validatedMeaningCases;
  if (!dense(contexts) || !dense(selectionCaptions) || !dense(workingCases)
    || !dense(sourceClosureResult?.cases)
    || [selectionCaptions, workingCases, sourceClosureResult.cases]
      .some(values => values.length !== contexts.length)) {
    return failedProjection('meaning-case-binding', {
      violationPath: '/reconstructionMap/caseContexts',
      relatedIds: contexts.flatMap(idsFor),
    });
  }
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    const workingCase = workingCases[index];
    const closureCase = sourceClosureResult.cases[index];
    if (workingCase.caseId !== context.caseId
      || workingCase.inputCaptionId !== context.inputCaptionId
      || !same(workingCase.meaningPackageBinding, context.meaningPackageBinding)
      || selectionCaptions[index].captionId !== context.inputCaptionId
      || closureCase.caseId !== context.caseId
      || closureCase.inputCaptionId !== context.inputCaptionId) {
      return failedProjection('meaning-case-binding', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/caseContexts/${index}`,
        relatedIds: idsFor(context),
      });
    }
    let values;
    try {
      values = deriveMeaningValues({
        sourcePackage,
        sourceCaseContext: context,
        meaningPackage: workingCase.meaningPackage,
      });
    } catch {
      return projectionRejection('meaning-case-binding', context, index);
    }
    if (!same(values.semanticCaption, workingCase.semanticCaption)
      || !same(values.records, workingCase.records)) {
      return projectionRejection('meaning-case-binding', context, index);
    }
  }

  const reconstructionItems = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    let result;
    try {
      result = buildPresentationOutputCaptionCueReconstructionProjectionV001({
        sourceCaseContext: context,
        selectionCaption: selectionCaptions[index],
        cueRanges: sourceClosureResult.cases[index].cueRanges,
        canonicalSha256FiniteJson: dependencies.canonicalSha256FiniteJson,
        hashBytes: dependencies.hashBytes,
      });
    } catch (cause) {
      throw stageError({
        failedProjectionClass: 'reconstruction-invalid',
        dependencyKey: 'buildPresentationOutputCaptionCueReconstructionProjectionV001',
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        cause,
      });
    }
    if (result?.status !== 'passed' || !exactKeys(result.value, ['projection'])) {
      return projectionRejection('reconstruction-invalid', context, index);
    }
    reconstructionItems.push(result.value.projection);
  }

  if (caseInputResult.status === 'rejected') {
    return failedProjection('style-base-case-binding', {
      caseId: caseInputResult.failureDetail.caseId,
      inputCaptionId: caseInputResult.failureDetail.inputCaptionId,
      violationPath: caseInputResult.failureDetail.violationPath,
      relatedIds: caseInputResult.violations[0].relatedIds,
    });
  }
  if (caseInputResult.status === 'fatal') {
    return Object.freeze({
      status: 'input-fatal',
      failedInputClass: 'style-or-base-read',
      failureDetail: caseInputResult.failureDetail,
    });
  }
  if (caseInputResult.status !== 'passed') {
    return failedProjection('style-base-case-binding', {
      violationPath: '/reconstructionMap/caseContexts',
      relatedIds: contexts.flatMap(idsFor),
    });
  }
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    const caseInput = caseInputResult.caseInputs[index];
    if (!same(caseInput.baseMediaBindings, context.baseMediaInput)
      || !same(caseInput.baseMediaResolverInput.baseMedia, context.baseMediaInput.baseMedia)) {
      return failedProjection('style-base-case-binding', {
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        violationPath: `/reconstructionMap/caseContexts/${index}/baseMediaInput/baseMedia`,
        relatedIds: idsFor(context),
      });
    }
  }

  const resolved = [];
  const graphs = [];
  const selectedByCase = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    const caseInput = caseInputResult.caseInputs[index];
    let styleResolution;
    try {
      styleResolution = await dependencies.resolveStyle({
        styleInput: context.horizontalStyleInput,
        artifacts: caseInput.styleArtifacts,
        baseMediaInput: caseInput.baseMediaResolverInput,
        baseMediaInspection: null,
      });
    } catch (cause) {
      throw stageError({
        failedProjectionClass: 'style-resolution', dependencyKey: 'resolveStyle',
        caseId: context.caseId, inputCaptionId: context.inputCaptionId, cause,
      });
    }
    if (!exactKeys(styleResolution, [
      'status', 'resolvedStyle', 'layoutContext', 'cropContext',
    ]) || styleResolution.status !== 'resolved'
      || dependencies.validateResolvedStyle(styleResolution.resolvedStyle) !== true
      || !Buffer.from(dependencies.serializeFiniteJson(styleResolution.resolvedStyle))
        .equals(Buffer.from(dependencies.serializeFiniteJson(context.resolvedStyle)))) {
      return projectionRejection('style-resolution', context, index);
    }
    resolved.push(styleResolution);
    let graph;
    try {
      graph = await dependencies.buildPhysicalPageGraph({
        caption: caseInput.semanticCaption,
        records: caseInput.records,
        styleResolution: {
          resolvedStyle: styleResolution.resolvedStyle,
          layoutContext: styleResolution.layoutContext,
        },
        resolvedStyleValidator: dependencies.validateResolvedStyle,
        resourceObserver: undefined,
      });
    } catch (cause) {
      throw stageError({
        failedProjectionClass: 'physical-layout', dependencyKey: 'buildPhysicalPageGraph',
        caseId: context.caseId, inputCaptionId: context.inputCaptionId, cause,
      });
    }
    if (!dense(graph)) {
      throw stageError({
        failedProjectionClass: 'physical-layout', dependencyKey: 'buildPhysicalPageGraph',
        caseId: context.caseId, inputCaptionId: context.inputCaptionId,
        cause: {kind: 'formal-json-value-invalid'},
      });
    }
    const selectedEdges = [];
    for (const [cueIndex, cueRange] of sourceClosureResult.cases[index].cueRanges.entries()) {
      const matches = graph.filter(edge => physicalEdgeMatches({
        edge,
        cueRange,
        records: caseInput.records,
      }));
      if (matches.length === 0) return projectionRejection('selected-edge-not-found', context, index, cueIndex);
      if (matches.length !== 1) return projectionRejection('physical-invalid', context, index, cueIndex);
      selectedEdges.push(matches[0]);
    }
    graphs.push(graph);
    selectedByCase.push(Object.freeze(selectedEdges));
  }

  const physicalItems = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    let result;
    try {
      result = buildPresentationOutputCaptionCuePhysicalProjectionV001({
        sourceCaseContext: context,
        selectionCaption: selectionCaptions[index],
        cueRanges: sourceClosureResult.cases[index].cueRanges,
        resolvedStyle: resolved[index].resolvedStyle,
        layoutContext: resolved[index].layoutContext,
        selectedPhysicalEdges: selectedByCase[index],
        canonicalSha256FiniteJson: dependencies.canonicalSha256FiniteJson,
        hashBytes: dependencies.hashBytes,
      });
    } catch (cause) {
      throw stageError({
        failedProjectionClass: 'physical-layout',
        dependencyKey: 'buildPresentationOutputCaptionCuePhysicalProjectionV001',
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        cause,
      });
    }
    if (result?.status !== 'passed' || !exactKeys(result.value, ['projection'])) {
      return projectionRejection('physical-invalid', context, index);
    }
    physicalItems.push(result.value.projection);
  }

  const timelineByCase = [];
  const timelineItems = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index];
    const mappings = [];
    const cueRanges = sourceClosureResult.cases[index].cueRanges;
    for (const [cueIndex, cueRange] of cueRanges.entries()) {
      let mapped;
      try {
        mapped = dependencies.mapPiecewiseTimeline({
          retainedSpans: cueRange.retainedSpans,
          baseMediaTimeline: caseInputResult.caseInputs[index].baseMediaResolverInput.timeline,
        });
      } catch (cause) {
        throw stageError({
          failedProjectionClass: 'timeline-mapping', dependencyKey: 'mapPiecewiseTimeline',
          caseId: context.caseId, inputCaptionId: context.inputCaptionId, cause,
        });
      }
      if (!exactKeys(mapped, [
        'status', 'retainedSpans', 'sourceSpanEnvelopes', 'frameMappings',
        'displayFrameRange',
      ]) || mapped.status !== 'mapped'
        || !exactKeys(mapped.displayFrameRange, [
          'startFrame', 'endFrameExclusive', 'displayFrameCount',
        ])) return projectionRejection('timeline-invalid', context, index, cueIndex);
      const current = Object.freeze({
        cueEndBoundaryId: cueRange.cueEndBoundaryId,
        retainedSpans: clone(mapped.retainedSpans),
        sourceSpanEnvelopes: clone(mapped.sourceSpanEnvelopes),
        frameMappings: clone(mapped.frameMappings),
        startFrame: mapped.displayFrameRange.startFrame,
        endFrameExclusive: mapped.displayFrameRange.endFrameExclusive,
        displayFrameCount: mapped.displayFrameRange.displayFrameCount,
      });
      if (mappings.length > 0 && mappings.at(-1).endFrameExclusive > current.startFrame) {
        return projectionRejection('overlap-invalid', context, index, cueIndex);
      }
      mappings.push(current);
    }
    timelineByCase.push(Object.freeze(mappings));
    let result;
    try {
      result = buildPresentationOutputCaptionCueTimelineProjectionV001({
        sourceCaseContext: context,
        selectionCaption: selectionCaptions[index],
        cueRanges,
        timelineMappings: mappings,
      });
    } catch (cause) {
      throw stageError({
        failedProjectionClass: 'timeline-mapping',
        dependencyKey: 'buildPresentationOutputCaptionCueTimelineProjectionV001',
        caseId: context.caseId,
        inputCaptionId: context.inputCaptionId,
        cause,
      });
    }
    if (result?.status !== 'passed' || !exactKeys(result.value, ['projection'])) {
      return projectionRejection('timeline-invalid', context, index);
    }
    timelineItems.push(result.value.projection);
  }

  const reconstructionProjection = Object.freeze({captions: Object.freeze(reconstructionItems)});
  const physicalProjection = Object.freeze({captions: Object.freeze(physicalItems)});
  const timelineProjection = Object.freeze({captions: Object.freeze(timelineItems)});
  const captionDisplays = Object.freeze(contexts.map((_, index) => captionDisplayFrom({
    captionIndex: index,
    caseInput: caseInputResult.caseInputs[index],
    cueRanges: sourceClosureResult.cases[index].cueRanges,
    selectedEdges: selectedByCase[index],
    timelineMappings: timelineByCase[index],
  })));
  const renderSupports = Object.freeze(contexts.map((context, index) => Object.freeze({
    caseId: context.caseId,
    inputCaptionId: context.inputCaptionId,
    resolvedStyle: clone(resolved[index].resolvedStyle),
    layoutContext: clone(resolved[index].layoutContext),
  })));
  const captionProjection = Object.freeze(contexts.map((context, index) => {
    const selectedCaption = selectionCaptions[index];
    const mappings = timelineByCase[index];
    return Object.freeze({
      inputCaptionId: context.inputCaptionId,
      caseId: context.caseId,
      cueCount: selectedCaption.cues.length,
      lineCount: selectedCaption.cues.reduce((total, cue) => total + cue.lineEndBoundaryIds.length, 0),
      selectedCueEndBoundaryIds: Object.freeze(selectedCaption.cues.map(cue => cue.cueEndBoundaryId)),
      selectedLineEndBoundaryIds: Object.freeze(selectedCaption.cues.flatMap(cue => cue.lineEndBoundaryIds)),
      atomOccurrenceCount: caseInputResult.caseInputs[index].records.length,
      firstStartFrame: mappings[0].startFrame,
      lastEndFrameExclusive: mappings.at(-1).endFrameExclusive,
    });
  }));
  const selectionProjection = Object.freeze({
    captionCount: contexts.length,
    cueCount: selectionCaptions.reduce((total, caption) => total + caption.cues.length, 0),
    lineCount: selectionCaptions.reduce((total, caption) => total
      + caption.cues.reduce((sum, cue) => sum + cue.lineEndBoundaryIds.length, 0), 0),
    selectedBoundaryCount: selectionCaptions.reduce((total, caption) => total
      + caption.cues.reduce((sum, cue) => sum + 1 + cue.lineEndBoundaryIds.length, 0), 0),
    reconstructionCanonicalSha256: dependencies.canonicalSha256FiniteJson(reconstructionProjection),
    physicalProjectionCanonicalSha256: dependencies.canonicalSha256FiniteJson(physicalProjection),
    timelineProjectionCanonicalSha256: dependencies.canonicalSha256FiniteJson(timelineProjection),
  });
  return Object.freeze({
    status: 'passed',
    value: Object.freeze({
      reconstructionProjection,
      physicalProjection,
      timelineProjection,
      selectionProjection,
      captionProjection,
      captionDisplays,
      renderSupports,
    }),
  });
}

const checkRecord = failedIndex => Object.freeze(Object.fromEntries(
  CHECK_KEYS.map((key, index) => [
    key,
    failedIndex === null ? 'passed' : index < failedIndex ? 'passed' : index === failedIndex ? 'failed' : 'blocked',
  ]),
));
const reportCore = ({
  job,
  selectionJobBinding,
  b6Manifest,
  providerEnvelope,
  rawResponseBinding,
  status,
  failedCheckIndex = null,
  violations = [],
  fatalObservation = null,
  selectionProjection = null,
  captionProjection = [],
}) => Object.freeze({
  schemaVersion: 'presentation-output-caption-cue-selection-report-core-v001',
  reportId: `${job.jobId}-selection-report-v001`,
  status,
  selectionJobBinding: clone(selectionJobBinding),
  sourcePackageBinding: clone(job.sourcePackageBinding),
  b6ManifestBinding: clone(job.b6ManifestBinding),
  providerEnvelopeBinding: clone(job.providerEnvelopeBinding),
  rawResponseBinding: clone(rawResponseBinding),
  checks: checkRecord(failedCheckIndex),
  violations: Object.freeze(clone(violations)),
  fatalObservation,
  selectionProjection: selectionProjection === null ? null : clone(selectionProjection),
  captionProjection: Object.freeze(clone(captionProjection)),
  implementationBindings: Object.freeze(clone(job.implementationBindings)),
});

const admissionRejected = ({
  job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
  primaryCode, pointer, relatedIds = [], failedCheckIndex,
}) => {
  const violations = [violation(primaryCode, pointer, relatedIds)];
  const core = reportCore({
    job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
    status: 'rejected', failedCheckIndex, violations,
  });
  return Object.freeze({
    status: 'rejected', primaryCode,
    violations: Object.freeze(violations),
    value: Object.freeze({reportCore: core}),
  });
};

const validateProviderResponseShape = value => {
  if (exactKeys(value, ['status']) && value.status === 'abstained') return true;
  return exactKeys(value, ['status', 'captions']) && value.status === 'complete'
    && dense(value.captions) && value.captions.length > 0
    && value.captions.every(caption => exactKeys(caption, ['captionId', 'cues'])
      && typeof caption.captionId === 'string' && caption.captionId.length > 0
      && dense(caption.cues) && caption.cues.length > 0
      && caption.cues.every(cue => exactKeys(cue, [
        'cueEndBoundaryId', 'lineEndBoundaryIds',
      ]) && typeof cue.cueEndBoundaryId === 'string'
        && dense(cue.lineEndBoundaryIds)
        && cue.lineEndBoundaryIds.length >= 1 && cue.lineEndBoundaryIds.length <= 2
        && cue.lineEndBoundaryIds.every(id => typeof id === 'string' && id.length > 0)));
};

const parseProviderMeaning = semanticText => {
  if (typeof semanticText !== 'string') return null;
  const bytes = Buffer.from(semanticText, 'utf8');
  if (!(semanticText.startsWith('{')
    && (semanticText.endsWith('}') || semanticText.endsWith('}\n')))
    || semanticText.includes('```') || /^[\s]|[\t\r ]$/u.test(semanticText)) return null;
  try {
    const value = JSON.parse(semanticText);
    return validateProviderResponseShape(value) ? value : null;
  } catch {
    return null;
  }
};

const responseChecks = ({sourcePackage, response}) => {
  const promptCaptions = sourcePackage.promptInput.captions;
  if (!dense(response.captions)
    || response.captions.length !== promptCaptions.length
    || response.captions.some((caption, index) => caption.captionId !== promptCaptions[index].captionId)
    || new Set(response.captions.map(item => item.captionId)).size !== response.captions.length) {
    return {code: 'CUE_CAPTION_SET_MISMATCH', pointer: '/captions', failedIndex: 3};
  }
  for (const [captionIndex, selectionCaption] of response.captions.entries()) {
    const promptCaption = promptCaptions[captionIndex];
    const ordinal = new Map(promptCaption.boundaryCandidates.map((item, index) => [
      item.boundaryId, index + 1,
    ]));
    for (const [cueIndex, cue] of selectionCaption.cues.entries()) {
      if (!ordinal.has(cue.cueEndBoundaryId)
        || cue.lineEndBoundaryIds.some(id => !ordinal.has(id))) {
        return {
          code: 'CUE_BOUNDARY_ID_INVALID',
          pointer: `/captions/${captionIndex}/cues/${cueIndex}`,
          failedIndex: 4,
        };
      }
    }
    const cueEnds = selectionCaption.cues.map(cue => ordinal.get(cue.cueEndBoundaryId));
    if (cueEnds.some((end, index) => end <= (index === 0 ? 0 : cueEnds[index - 1]))
      || cueEnds.at(-1) !== promptCaption.boundaryCandidates.length) {
      return {code: 'CUE_ORDER_INVALID', pointer: `/captions/${captionIndex}/cues`, failedIndex: 5};
    }
    let cueStart = 0;
    for (const [cueIndex, cue] of selectionCaption.cues.entries()) {
      const cueEnd = cueEnds[cueIndex];
      const lineEnds = cue.lineEndBoundaryIds.map(id => ordinal.get(id));
      if (lineEnds.some(end => !positive(end))) {
        return {
          code: 'CUE_LINE_END_INVALID', pointer: `/captions/${captionIndex}/cues/${cueIndex}/lineEndBoundaryIds`, failedIndex: 6,
        };
      }
      if (lineEnds.some((end, lineIndex) => end <= (lineIndex === 0 ? cueStart : lineEnds[lineIndex - 1]) || end > cueEnd)
        || lineEnds.at(-1) !== cueEnd) {
        return {
          code: 'CUE_LINE_END_INVALID', pointer: `/captions/${captionIndex}/cues/${cueIndex}/lineEndBoundaryIds`, failedIndex: 7,
        };
      }
      cueStart = cueEnd;
    }
  }
  return null;
};

const failedClassMapping = Object.freeze({
  'meaning-case-binding': ['CUE_SELECTION_INPUT_BINDING_MISMATCH', 8],
  'source-closure': ['CUE_ATOM_COVERAGE_INVALID', 8],
  'reconstruction-invalid': ['CUE_ATOM_COVERAGE_INVALID', 10],
  'style-base-case-binding': ['CUE_SELECTION_INPUT_BINDING_MISMATCH', 11],
  'style-resolution': ['CUE_PHYSICAL_LAYOUT_INVALID', 11],
  'selected-edge-not-found': ['CUE_PHYSICAL_LAYOUT_INVALID', 11],
  'physical-invalid': ['CUE_PHYSICAL_LAYOUT_INVALID', 11],
  'timeline-invalid': ['CUE_TIMELINE_MAPPING_INVALID', 12],
  'overlap-invalid': ['CUE_TIMELINE_MAPPING_INVALID', 12],
});

export async function admitPresentationOutputCaptionCueSelectionV001(input) {
  const rereadKeys = [
    'readWorkspaceFileStable', 'validateMeaningPackageFormalBytes',
    'canonicalSha256MeaningJson', 'hashMeaningBytes', 'decodeFiniteJson',
    'serializeFiniteJson', 'canonicalSha256FiniteJson', 'hashFiniteBytes',
    'hashStableMedia', 'classifyFatalInnerCode',
  ];
  const verifiedKeys = [
    'resolveStyle', 'validateResolvedStyle', 'buildPhysicalPageGraph',
    'mapPiecewiseTimeline', 'hashRawResponseBytes', 'canonicalSha256MeaningJson',
    'canonicalSha256FiniteJson', 'serializeFiniteJson', 'classifyFatalInnerCode',
  ];
  if (!exactKeys(input, [
    'job', 'selectionJobBinding', 'sourcePackage', 'b6Manifest',
    'providerEnvelope', 'rawResponseBytes', 'rawResponseBinding', 'workspaceRoot',
    'rereadDependencies', 'verifiedDependencies',
  ]) || validatePresentationOutputCaptionCueSelectionJobV001(input.job).status !== 'passed'
    || !formalBinding(input.selectionJobBinding)
    || !Buffer.isBuffer(input.rawResponseBytes)
    || !byteBinding(input.rawResponseBinding)
    || !validateDependencies(input.rereadDependencies, rereadKeys)
    || !validateDependencies(input.verifiedDependencies, verifiedKeys)) {
    throw new TypeError('selection admission argument is invalid');
  }
  const {
    job, selectionJobBinding, sourcePackage, b6Manifest, providerEnvelope,
    rawResponseBytes, rawResponseBinding, workspaceRoot, rereadDependencies,
    verifiedDependencies,
  } = input;
  const reject = (primaryCode, pointer, failedCheckIndex, relatedIds = []) =>
    admissionRejected({
      job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
      primaryCode, pointer, relatedIds, failedCheckIndex,
    });
  if (!same(job.sourcePackageBinding, sourcePackage?.provenance === undefined
    ? null : job.sourcePackageBinding)
    || sourcePackage?.schemaVersion !== SOURCE_SCHEMA) {
    return reject('CUE_SELECTION_INPUT_BINDING_MISMATCH', '/sourcePackageBinding', 0);
  }
  if (b6Manifest?.schemaVersion !== B6_MANIFEST_SCHEMA
    || b6Manifest.status !== 'passed-transport'
    || providerEnvelope?.schemaVersion !== ENVELOPE_SCHEMA
    || !same(b6Manifest.providerEnvelopeBinding, job.providerEnvelopeBinding)) {
    return reject('CUE_SELECTION_INPUT_BINDING_MISMATCH', '/providerEnvelopeBinding', 1);
  }
  const rawHash = verifiedDependencies.hashRawResponseBytes(rawResponseBytes);
  if (!same(rawResponseBinding, providerEnvelope.rawResponseBinding)
    || !same(rawResponseBinding, b6Manifest.rawResponseBinding)
    || rawHash?.status !== 'hashed' || rawHash.sha256 !== rawResponseBinding.fileSha256) {
    return reject('CUE_SELECTION_INPUT_BINDING_MISMATCH', '/rawResponseBinding', 1);
  }
  let response;
  try {
    response = parseProviderMeaning(providerEnvelope.semanticText);
  } catch {
    response = null;
  }
  if (response === null) return reject('CUE_PROVIDER_RESPONSE_INVALID', '/response', 2);
  if (response.status === 'abstained') {
    const core = reportCore({
      job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
      status: 'abstained', failedCheckIndex: 2,
      violations: [violation('CUE_PROVIDER_ABSTAINED', '/status')],
    });
    return Object.freeze({status: 'abstained', value: Object.freeze({reportCore: core})});
  }
  const providerFailure = responseChecks({sourcePackage, response});
  if (providerFailure !== null) {
    return reject(providerFailure.code, providerFailure.pointer, providerFailure.failedIndex);
  }
  const selection = Object.freeze({
    schemaVersion: SELECTION_SCHEMA,
    selectionId: `${job.jobId}-selection`,
    sourcePackageBinding: clone(job.sourcePackageBinding),
    b6ManifestBinding: clone(job.b6ManifestBinding),
    providerEnvelopeBinding: clone(job.providerEnvelopeBinding),
    response: clone(response),
  });
  const caseInputResult = await rereadPresentationOutputCaptionCueCaseInputsV001({
    workspaceRoot,
    sourcePackage,
    rereadDependencies,
  });
  if (caseInputResult.status === 'rejected'
    && ['meaning-binding', 'meaning-closure'].includes(caseInputResult.failedInputClass)) {
    return reject(
      caseInputResult.primaryCode,
      caseInputResult.failureDetail.violationPath,
      8,
      caseInputResult.violations[0].relatedIds,
    );
  }
  if (caseInputResult.status === 'fatal' && caseInputResult.failedInputClass === 'meaning-read') {
    throw Object.freeze({
      schemaVersion: 'presentation-output-caption-cue-selection-admission-fatal-v001',
      status: 'fatal',
      primaryCode: 'CUE_SELECTION_EXECUTION_FAILED',
      reportCore: reportCore({
        job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
        status: 'fatal', failedCheckIndex: 8, violations: [],
        fatalObservation: Object.freeze({
          schemaVersion: 'presentation-output-caption-cue-selection-fatal-observation-v001',
          status: 'fatal', stage: 'case-context-reread',
          innerCode: caseInputResult.failureDetail.innerCode,
          targetFile: caseInputResult.failureDetail.targetFile,
          toolExitCode: null,
          checkpoints: Object.freeze([Object.freeze({
            stage: 'case-context-reread', event: 'entered',
            inputCaptionId: caseInputResult.failureDetail.inputCaptionId,
            targetFile: caseInputResult.failureDetail.targetFile,
            toolExitCode: null,
          })]),
        }),
      }),
    });
  }
  const sourceClosureResult = buildPresentationOutputCaptionCueSourceClosureV001({
    sourcePackage,
    selection,
    validatedMeaningCases: caseInputResult.validatedMeaningCases,
  });
  if (sourceClosureResult.status !== 'passed') {
    return reject(
      sourceClosureResult.failedProjectionClass === 'meaning-case-binding'
        ? 'CUE_SELECTION_INPUT_BINDING_MISMATCH' : 'CUE_ATOM_COVERAGE_INVALID',
      sourceClosureResult.failureDetail.violationPath,
      8,
      sourceClosureResult.failureDetail.relatedIds,
    );
  }
  for (const [captionIndex, closureCase] of sourceClosureResult.cases.entries()) {
    const maxWidth = sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine;
    for (const [cueIndex, cueRange] of closureCase.cueRanges.entries()) {
      const wholeWidth = logicalWidth(cueRange.text);
      const lineWidths = cueRange.lineRanges.map(item => logicalWidth(item.text));
      if ((wholeWidth <= maxWidth && lineWidths.length !== 1)
        || lineWidths.some(width => width > maxWidth)) {
        return reject(
          'CUE_LINE_WIDTH_INVALID',
          `/captions/${captionIndex}/cues/${cueIndex}/lineEndBoundaryIds`,
          9,
          idsFor(sourcePackage.reconstructionMap.caseContexts[captionIndex]),
        );
      }
    }
  }
  const projectionDependencies = {
    resolveStyle: verifiedDependencies.resolveStyle,
    validateResolvedStyle: verifiedDependencies.validateResolvedStyle,
    buildPhysicalPageGraph: verifiedDependencies.buildPhysicalPageGraph,
    mapPiecewiseTimeline: verifiedDependencies.mapPiecewiseTimeline,
    canonicalSha256MeaningJson: verifiedDependencies.canonicalSha256MeaningJson,
    canonicalSha256FiniteJson: verifiedDependencies.canonicalSha256FiniteJson,
    serializeFiniteJson: verifiedDependencies.serializeFiniteJson,
    hashBytes: verifiedDependencies.hashRawResponseBytes,
  };
  let projectionSet;
  try {
    projectionSet = await buildPresentationOutputCaptionCueProjectionSetV001({
      sourcePackage,
      selection,
      caseInputResult,
      sourceClosureResult,
      projectionDependencies,
    });
  } catch (cause) {
    const known = isObject(cause)
      && cause.tag === 'presentation-output-caption-cue-shared-stage-error-v001';
    const detail = known
      ? sourcePackage.reconstructionMap.caseContexts.find(context => (
        context.caseId === cause.caseId && context.inputCaptionId === cause.inputCaptionId
      ))
      : null;
    const failedIndex = known && cause.failedProjectionClass === 'timeline-mapping'
      ? 12 : known && cause.failedProjectionClass === 'physical-layout'
        ? 11 : 10;
    throw Object.freeze({
      schemaVersion: 'presentation-output-caption-cue-selection-admission-fatal-v001',
      status: 'fatal',
      primaryCode: 'CUE_SELECTION_EXECUTION_FAILED',
      reportCore: reportCore({
        job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
        status: 'fatal', failedCheckIndex: failedIndex, violations: [],
        fatalObservation: Object.freeze({
          schemaVersion: 'presentation-output-caption-cue-selection-fatal-observation-v001',
          status: 'fatal',
          stage: failedIndex === 12 ? 'timeline-mapping'
            : failedIndex === 11 ? 'physical-layout' : 'case-context-reread',
          innerCode: safeFatalCode(known ? cause.cause : cause, verifiedDependencies.classifyFatalInnerCode),
          targetFile: null,
          toolExitCode: null,
          checkpoints: Object.freeze([Object.freeze({
            stage: failedIndex === 12 ? 'timeline-mapping'
              : failedIndex === 11 ? 'physical-layout' : 'case-context-reread',
            event: 'entered', inputCaptionId: detail?.inputCaptionId ?? null,
            targetFile: null, toolExitCode: null,
          })]),
        }),
      }),
    });
  }
  if (projectionSet.status === 'input-fatal') {
    throw Object.freeze({
      schemaVersion: 'presentation-output-caption-cue-selection-admission-fatal-v001',
      status: 'fatal', primaryCode: 'CUE_SELECTION_EXECUTION_FAILED',
      reportCore: reportCore({
        job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
        status: 'fatal', failedCheckIndex: 11, violations: [],
        fatalObservation: Object.freeze({
          schemaVersion: 'presentation-output-caption-cue-selection-fatal-observation-v001',
          status: 'fatal', stage: 'case-context-reread',
          innerCode: projectionSet.failureDetail.innerCode,
          targetFile: projectionSet.failureDetail.targetFile,
          toolExitCode: null,
          checkpoints: Object.freeze([Object.freeze({
            stage: 'case-context-reread', event: 'entered',
            inputCaptionId: projectionSet.failureDetail.inputCaptionId,
            targetFile: projectionSet.failureDetail.targetFile, toolExitCode: null,
          })]),
        }),
      }),
    });
  }
  if (projectionSet.status !== 'passed') {
    const [code, failedCheckIndex] = failedClassMapping[projectionSet.failedProjectionClass]
      ?? ['CUE_SELECTION_EXECUTION_FAILED', 10];
    return reject(code, projectionSet.failureDetail.violationPath, failedCheckIndex,
      projectionSet.failureDetail.relatedIds);
  }
  const core = reportCore({
    job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
    status: 'passed', failedCheckIndex: null, violations: [],
    selectionProjection: projectionSet.value.selectionProjection,
    captionProjection: projectionSet.value.captionProjection,
  });
  return Object.freeze({
    status: 'passed',
    value: Object.freeze({selection, reportCore: core}),
  });
}

const validReportCore = value => exactKeys(value, [
  'schemaVersion', 'reportId', 'status', 'selectionJobBinding',
  'sourcePackageBinding', 'b6ManifestBinding', 'providerEnvelopeBinding',
  'rawResponseBinding', 'checks', 'violations', 'fatalObservation',
  'selectionProjection', 'captionProjection', 'implementationBindings',
]) && value.schemaVersion === 'presentation-output-caption-cue-selection-report-core-v001'
  && ['passed', 'rejected', 'abstained', 'fatal'].includes(value.status)
  && exactKeys(value.checks, CHECK_KEYS)
  && CHECK_KEYS.every(key => ['passed', 'failed', 'blocked'].includes(value.checks[key]))
  && dense(value.violations) && dense(value.captionProjection)
  && formalBinding(value.selectionJobBinding)
  && formalBinding(value.sourcePackageBinding)
  && formalBinding(value.b6ManifestBinding)
  && formalBinding(value.providerEnvelopeBinding)
  && byteBinding(value.rawResponseBinding)
  && dense(value.implementationBindings) && value.implementationBindings.every(roleBinding);

export function finalizePresentationOutputCaptionCueSelectionReportV001(input) {
  if (!exactKeys(input, ['reportCore', 'selectionBinding', 'selectionPublicationFailure'])
    || !validReportCore(input.reportCore)) {
    throw new TypeError('selection report finalizer input is invalid');
  }
  const {reportCore: core, selectionBinding, selectionPublicationFailure} = input;
  let status = core.status;
  let binding = selectionBinding;
  let checks = core.checks;
  let violations = core.violations;
  let fatalObservation = core.fatalObservation;
  let selectionProjection = core.selectionProjection;
  let captionProjection = core.captionProjection;
  if (core.status === 'passed' && selectionBinding === null
    && isObject(selectionPublicationFailure)) {
    status = 'fatal';
    binding = null;
    checks = checkRecord(null);
    violations = [];
    fatalObservation = selectionPublicationFailure;
    selectionProjection = null;
    captionProjection = [];
  } else if (core.status === 'passed') {
    if (!formalBinding(selectionBinding) || selectionPublicationFailure !== null) {
      throw new TypeError('passed selection binding is invalid');
    }
  } else if (selectionBinding !== null || selectionPublicationFailure !== null) {
    throw new TypeError('non-passed selection tuple is invalid');
  }
  return Object.freeze({
    schemaVersion: REPORT_SCHEMA,
    reportId: core.reportId,
    status,
    selectionJobBinding: clone(core.selectionJobBinding),
    sourcePackageBinding: clone(core.sourcePackageBinding),
    b6ManifestBinding: clone(core.b6ManifestBinding),
    providerEnvelopeBinding: clone(core.providerEnvelopeBinding),
    rawResponseBinding: clone(core.rawResponseBinding),
    selectionBinding: binding === null ? null : clone(binding),
    checks: clone(checks),
    violations: clone(violations),
    fatalObservation: fatalObservation === null ? null : clone(fatalObservation),
    selectionProjection: selectionProjection === null ? null : clone(selectionProjection),
    captionProjection: clone(captionProjection),
    implementationBindings: clone(core.implementationBindings),
  });
}

const EXECUTION_KEYS = Object.freeze(['jobPath', 'atomicDirectoryPublisherLoader']);
const CLI_KEYS = Object.freeze([
  'schemaVersion', 'status', 'action', 'jobId', 'attemptId', 'outputRoot',
  'stage', 'primaryCode',
]);
const cliResult = ({status, job = null, stage, primaryCode}) => Object.freeze({
  schemaVersion: CLI_SCHEMA,
  status,
  action: 'selection-admission',
  jobId: job?.jobId ?? null,
  attemptId: job?.attemptId ?? null,
  outputRoot: job?.outputRoot ?? null,
  stage,
  primaryCode,
});
const streamingSha = absolute => new Promise((resolve, rejectStream) => {
  const digest = createHash('sha256');
  const stream = createReadStream(absolute);
  stream.on('data', chunk => digest.update(chunk));
  stream.on('error', rejectStream);
  stream.on('end', () => resolve(digest.digest('hex')));
});
const absoluteWorkspacePath = (workspaceRoot, relativePath) => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new Error('unsafe-path');
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!absolute.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error('unsafe-path');
  return absolute;
};
const stableReadLocal = async (workspaceRoot, relativePath) => {
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
const observeBindings = async (workspaceRoot, bindings) => {
  const observed = [];
  for (const binding of bindings) {
    const bytes = await stableReadLocal(workspaceRoot, binding.path);
    const digest = sha256(bytes);
    if (digest !== binding.fileSha256) return Object.freeze({status: 'mismatch'});
    observed.push(Object.freeze({
      role: binding.role,
      path: binding.path,
      fileSha256: digest,
    }));
  }
  return Object.freeze({status: 'passed', observed: Object.freeze(observed)});
};
const rereadBindings = async (workspaceRoot, bindings, expected) => {
  const observed = await observeBindings(workspaceRoot, bindings);
  return observed.status === 'passed' && same(observed.observed, expected);
};
const observeRuntime = async job => {
  if (Object.hasOwn(process.env, 'NODE_OPTIONS')) return false;
  for (const binding of [job.runtimeProfile.node, job.runtimeProfile.tsx]) {
    const first = await realpath(binding.path);
    const second = await realpath(binding.path);
    if (first !== second || await streamingSha(first) !== binding.fileSha256) return false;
  }
  return await realpath(process.execPath) === await realpath(job.runtimeProfile.node.path);
};
const bindingMatchesFormalValue = (binding, bytes, value) => formalBinding(binding)
  && value?.schemaVersion === binding.schemaVersion
  && sha256(bytes) === binding.fileSha256
  && sha256(canonicalBytes(value)) === binding.canonicalSha256;
const validUsage = value => exactKeys(value, [
  'promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount',
]) && Object.values(value).every(nonnegative)
  && value.totalTokenCount === value.promptTokenCount
    + value.candidatesTokenCount + value.thoughtsTokenCount;
const validProviderEnvelope = value => exactKeys(value, [
  'schemaVersion', 'envelopeId', 'httpStatus', 'contentType', 'rawResponseBinding',
  'responseModelVersion', 'observedServiceTier', 'usageMetadata', 'semanticText',
]) && value.schemaVersion === ENVELOPE_SCHEMA && FORMAL_ID.test(value.envelopeId)
  && value.httpStatus === 200 && value.contentType === 'application/json; charset=UTF-8'
  && byteBinding(value.rawResponseBinding)
  && typeof value.responseModelVersion === 'string' && value.responseModelVersion.length > 0
  && [null, 'standard'].includes(value.observedServiceTier)
  && validUsage(value.usageMetadata)
  && typeof value.semanticText === 'string' && value.semanticText.length > 0;
const validB6Manifest = value => exactKeys(value, [
  'schemaVersion', 'manifestId', 'status', 'executedAt', 'b6JobBinding',
  'b5ManifestBinding', 'generateRequestBinding', 'rawResponseBinding',
  'providerEnvelopeBinding', 'transport', 'usageListPriceEstimate', 'checks',
  'primaryRejectionCode', 'implementationBindings',
]) && value.schemaVersion === B6_MANIFEST_SCHEMA && FORMAL_ID.test(value.manifestId)
  && value.status === 'passed-transport' && formalBinding(value.b6JobBinding)
  && formalBinding(value.b5ManifestBinding) && byteBinding(value.generateRequestBinding)
  && byteBinding(value.rawResponseBinding) && formalBinding(value.providerEnvelopeBinding)
  && value.primaryRejectionCode === null && dense(value.implementationBindings)
  && value.implementationBindings.every(roleBinding);
const validSelection = value => exactKeys(value, [
  'schemaVersion', 'selectionId', 'sourcePackageBinding', 'b6ManifestBinding',
  'providerEnvelopeBinding', 'response',
]) && value.schemaVersion === SELECTION_SCHEMA && FORMAL_ID.test(value.selectionId)
  && formalBinding(value.sourcePackageBinding) && formalBinding(value.b6ManifestBinding)
  && formalBinding(value.providerEnvelopeBinding) && isObject(value.response);
const validSelectionReport = value => exactKeys(value, [
  'schemaVersion', 'reportId', 'status', 'selectionJobBinding',
  'sourcePackageBinding', 'b6ManifestBinding', 'providerEnvelopeBinding',
  'rawResponseBinding', 'selectionBinding', 'checks', 'violations',
  'fatalObservation', 'selectionProjection', 'captionProjection',
  'implementationBindings',
]) && value.schemaVersion === REPORT_SCHEMA && FORMAL_ID.test(value.reportId)
  && ['passed', 'rejected', 'abstained', 'fatal'].includes(value.status)
  && formalBinding(value.selectionJobBinding) && formalBinding(value.sourcePackageBinding)
  && formalBinding(value.b6ManifestBinding) && formalBinding(value.providerEnvelopeBinding)
  && byteBinding(value.rawResponseBinding) && exactKeys(value.checks, CHECK_KEYS)
  && dense(value.violations) && dense(value.captionProjection)
  && dense(value.implementationBindings) && value.implementationBindings.every(roleBinding)
  && ((value.status === 'passed' && formalBinding(value.selectionBinding)
      && value.fatalObservation === null && value.violations.length === 0)
    || (value.status !== 'passed' && value.selectionBinding === null));
const formalBindingFor = (schemaVersion, relativePath, bytes, value) => Object.freeze({
  schemaVersion,
  path: relativePath,
  fileSha256: sha256(bytes),
  canonicalSha256: sha256(canonicalBytes(value)),
});
const selectionPublicationObservation = (cause, classifier) => Object.freeze({
  schemaVersion: 'presentation-output-caption-cue-selection-fatal-observation-v001',
  status: 'fatal',
  stage: 'selection-publication',
  innerCode: safeFatalCode(cause, classifier),
  targetFile: null,
  toolExitCode: null,
  checkpoints: Object.freeze([Object.freeze({
    stage: 'selection-publication', event: 'entered', inputCaptionId: null,
    targetFile: null, toolExitCode: null,
  })]),
});
const stageForReport = report => {
  if (report.status === 'passed') return 'completed';
  if (report.status === 'fatal') {
    return {
      'provider-validation': 'selection-validation',
      'case-context-reread': 'input-reread',
      'style-resolution': 'style-resolution',
      'physical-layout': 'style-resolution',
      'timeline-mapping': 'selection-validation',
      'selection-publication': 'artifact-publication',
    }[report.fatalObservation?.stage] ?? 'selection-validation';
  }
  return ['CUE_SELECTION_INPUT_BINDING_MISMATCH'].includes(report.violations[0]?.code)
    ? 'input-reread'
    : ['CUE_PHYSICAL_LAYOUT_INVALID'].includes(report.violations[0]?.code)
      ? 'style-resolution' : 'selection-validation';
};
const primaryCodeForReport = report => report.status === 'passed' ? null
  : report.status === 'fatal' ? (report.fatalObservation?.stage === 'selection-publication'
    ? 'CUE_SELECTION_PUBLICATION_FAILED' : 'CUE_SELECTION_EXECUTION_FAILED')
    : report.violations[0]?.code ?? 'CUE_SELECTION_EXECUTION_FAILED';

export async function executePresentationOutputCaptionCueSelectionJobV001(input) {
  if (!exactKeys(input, EXECUTION_KEYS) || typeof input.jobPath !== 'string'
    || input.jobPath.length === 0 || typeof input.atomicDirectoryPublisherLoader !== 'function') {
    return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_SELECTION_JOB_INVALID'});
  }
  const workspaceRoot = await realpath(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  );
  const relativeJobPath = path.isAbsolute(input.jobPath)
    ? path.relative(workspaceRoot, input.jobPath).split(path.sep).join('/')
    : input.jobPath;
  let jobBytes;
  let job;
  try {
    jobBytes = await stableReadLocal(workspaceRoot, relativeJobPath);
    const decoded = decodePresentationOutputCaptionCueSelectionJobV001(jobBytes);
    if (decoded.status !== 'decoded') {
      return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_SELECTION_JOB_INVALID'});
    }
    job = decoded.value;
    if (relativeJobPath !== `evals/clip_composition/jobs/presentation/output-caption-cue-selection-jobs/${job.jobId}.json`
      || !await observeRuntime(job)) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SELECTION_JOB_INVALID'});
    }
  } catch {
    return cliResult({status: 'fatal', stage: 'job-read', primaryCode: 'CUE_SELECTION_EXECUTION_FAILED'});
  }

  let implementationStart;
  let runtimeStart;
  let contractStart;
  let modules;
  let atomicPublisher;
  try {
    implementationStart = await observeBindings(workspaceRoot, job.implementationBindings);
    runtimeStart = await observeBindings(workspaceRoot, job.runtimeDataBindings);
    contractStart = await observeBindings(workspaceRoot, job.approvedContractBindings);
    if ([implementationStart, runtimeStart, contractStart].some(item => item.status !== 'passed')) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SELECTION_JOB_INVALID'});
    }
    const sourceContract = await import('./presentation_output_caption_cue_source_package_v001.mjs');
    const apiRunner = await import('./run_presentation_output_caption_cue_b5_b6_v001.mjs');
    const style = await import('./presentation_output_style_resolver_v001.ts');
    const physical = await import('./presentation_output_page_line_planner_v001.mjs');
    const resolved = await import('./presentation_output_page_line_planner_v002.mjs');
    const timeline = await import('./presentation_output_piecewise_timeline_v002.mjs');
    const publication = await import('./presentation_timeline_composition_decision_v001.mjs');
    const meaning = await import('./presentation_a_meaning_information_package_v002.mjs');
    const sourceSequence = await import('./presentation_a_source_sequence_v002.mjs');
    const codec = await import('./presentation_caption_semantic_source_package_v001.mjs');
    const finite = await import('./presentation_output_crop_application_v001.mjs');
    const fatal = await import('./presentation_fatal_observation_v002.mjs');
    const required = [
      [sourceContract, 'validatePresentationOutputCaptionCueSourcePackageV001'],
      [style, 'resolvePresentationOutputStyleV001'],
      [physical, 'buildPresentationOutputPhysicalPageGraphV001'],
      [resolved, 'validatePresentationOutputResolvedStyleV002'],
      [timeline, 'mapPresentationOutputPiecewiseTimelineV002'],
      [publication, 'readPresentationMeaningWorkspaceFileStableV001'],
      [publication, 'hashAbsoluteStableStreaming'],
      [meaning, 'validatePresentationAMeaningInformationPackageFormalBytesV002'],
      [sourceSequence, 'canonicalSha256PresentationAJsonV002'],
      [codec, 'sha256PresentationCaptionB1BytesV001'],
      [finite, 'decodePresentationOutputFiniteJsonV001'],
      [finite, 'serializePresentationOutputCropApplicationFormalJsonV001'],
      [finite, 'canonicalSha256PresentationOutputFiniteJsonV001'],
      [finite, 'sha256PresentationOutputCropApplicationBytesV001'],
      [fatal, 'classifyPresentationFatalInnerCodeV002'],
    ];
    if (!isObject(apiRunner) || required.some(([namespace, name]) => (
      !isObject(namespace) || typeof namespace[name] !== 'function'
    ))) throw new Error('required-export-missing');
    modules = {sourceContract, style, physical, resolved, timeline, publication,
      meaning, sourceSequence, codec, finite, fatal};
    atomicPublisher = await input.atomicDirectoryPublisherLoader();
    if (typeof atomicPublisher !== 'function') throw new Error('atomic-publisher-missing');
    if (!await rereadBindings(workspaceRoot, job.implementationBindings, implementationStart.observed)
      || !await rereadBindings(workspaceRoot, job.runtimeDataBindings, runtimeStart.observed)
      || !await rereadBindings(workspaceRoot, job.approvedContractBindings, contractStart.observed)) {
      return cliResult({status: 'rejected', job, stage: 'job-read', primaryCode: 'CUE_SELECTION_JOB_INVALID'});
    }
  } catch {
    return cliResult({status: 'fatal', job, stage: 'input-reread', primaryCode: 'CUE_SELECTION_EXECUTION_FAILED'});
  }

  let sourceBytes;
  let sourcePackage;
  let manifestBytes;
  let b6Manifest;
  let envelopeBytes;
  let providerEnvelope;
  let rawResponseBytes;
  try {
    sourceBytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot, relativePath: job.sourcePackageBinding.path,
    });
    manifestBytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot, relativePath: job.b6ManifestBinding.path,
    });
    envelopeBytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot, relativePath: job.providerEnvelopeBinding.path,
    });
    sourcePackage = strictParse(sourceBytes);
    b6Manifest = strictParse(manifestBytes);
    providerEnvelope = strictParse(envelopeBytes);
    if (sourcePackage === null || b6Manifest === null || providerEnvelope === null) {
      return cliResult({status: 'rejected', job, stage: 'input-reread', primaryCode: 'CUE_SELECTION_INPUT_BINDING_MISMATCH'});
    }
    rawResponseBytes = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot, relativePath: providerEnvelope.rawResponseBinding?.path ?? '',
    });
  } catch {
    return cliResult({status: 'fatal', job, stage: 'input-reread', primaryCode: 'CUE_SELECTION_EXECUTION_FAILED'});
  }

  const sourceValid = modules.sourceContract
    .validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage).status === 'passed';
  const upstreamBindingsMatch = bindingMatchesFormalValue(job.sourcePackageBinding, sourceBytes, sourcePackage)
    && bindingMatchesFormalValue(job.b6ManifestBinding, manifestBytes, b6Manifest)
    && bindingMatchesFormalValue(job.providerEnvelopeBinding, envelopeBytes, providerEnvelope);
  const selectionJobBinding = formalBindingFor(JOB_SCHEMA, relativeJobPath, jobBytes, job);
  const rawResponseBinding = byteBinding(providerEnvelope.rawResponseBinding)
    ? providerEnvelope.rawResponseBinding : {path: 'invalid', fileSha256: '0'.repeat(64)};
  let admission;
  if (!sourceValid || !upstreamBindingsMatch) {
    admission = admissionRejected({
      job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
      primaryCode: 'CUE_SELECTION_INPUT_BINDING_MISMATCH',
      pointer: '/sourcePackageBinding', failedCheckIndex: 0,
    });
  } else if (!validB6Manifest(b6Manifest) || !validProviderEnvelope(providerEnvelope)
    || !same(b6Manifest.providerEnvelopeBinding, job.providerEnvelopeBinding)
    || !same(b6Manifest.rawResponseBinding, providerEnvelope.rawResponseBinding)) {
    admission = admissionRejected({
      job, selectionJobBinding, b6Manifest, providerEnvelope, rawResponseBinding,
      primaryCode: 'CUE_SELECTION_INPUT_BINDING_MISMATCH',
      pointer: '/providerEnvelopeBinding', failedCheckIndex: 1,
    });
  } else try {
    admission = await admitPresentationOutputCaptionCueSelectionV001({
      job,
      selectionJobBinding,
      sourcePackage,
      b6Manifest,
      providerEnvelope,
      rawResponseBytes,
      rawResponseBinding,
      workspaceRoot,
      rereadDependencies: {
        readWorkspaceFileStable: modules.publication.readPresentationMeaningWorkspaceFileStableV001,
        validateMeaningPackageFormalBytes: modules.meaning.validatePresentationAMeaningInformationPackageFormalBytesV002,
        canonicalSha256MeaningJson: modules.sourceSequence.canonicalSha256PresentationAJsonV002,
        hashMeaningBytes: modules.codec.sha256PresentationCaptionB1BytesV001,
        decodeFiniteJson: modules.finite.decodePresentationOutputFiniteJsonV001,
        serializeFiniteJson: modules.finite.serializePresentationOutputCropApplicationFormalJsonV001,
        canonicalSha256FiniteJson: modules.finite.canonicalSha256PresentationOutputFiniteJsonV001,
        hashFiniteBytes: modules.finite.sha256PresentationOutputCropApplicationBytesV001,
        hashStableMedia: modules.publication.hashAbsoluteStableStreaming,
        classifyFatalInnerCode: modules.fatal.classifyPresentationFatalInnerCodeV002,
      },
      verifiedDependencies: {
        resolveStyle: modules.style.resolvePresentationOutputStyleV001,
        validateResolvedStyle: modules.resolved.validatePresentationOutputResolvedStyleV002,
        buildPhysicalPageGraph: modules.physical.buildPresentationOutputPhysicalPageGraphV001,
        mapPiecewiseTimeline: modules.timeline.mapPresentationOutputPiecewiseTimelineV002,
        hashRawResponseBytes: modules.codec.sha256PresentationCaptionB1BytesV001,
        canonicalSha256MeaningJson: modules.sourceSequence.canonicalSha256PresentationAJsonV002,
        canonicalSha256FiniteJson: modules.finite.canonicalSha256PresentationOutputFiniteJsonV001,
        serializeFiniteJson: modules.finite.serializePresentationOutputCropApplicationFormalJsonV001,
        classifyFatalInnerCode: modules.fatal.classifyPresentationFatalInnerCodeV002,
      },
    });
  } catch (failure) {
    if (failure?.schemaVersion === 'presentation-output-caption-cue-selection-admission-fatal-v001'
      && failure.status === 'fatal' && validReportCore(failure.reportCore)) {
      admission = Object.freeze({status: 'fatal', value: Object.freeze({reportCore: failure.reportCore})});
    } else {
      return cliResult({status: 'fatal', job, stage: 'selection-validation', primaryCode: 'CUE_SELECTION_EXECUTION_FAILED'});
    }
  }

  let claim;
  try {
    claim = await modules.publication.createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot, relativeOutputRoot: job.outputRoot,
    });
  } catch (error) {
    const status = ['publication-target-exists', 'publication-staging-exists'].includes(error?.message)
      ? 'rejected' : 'fatal';
    return cliResult({status, job, stage: 'root-publication', primaryCode: 'CUE_SELECTION_PUBLICATION_FAILED'});
  }

  let selectionBinding = null;
  let selectionFailure = null;
  if (admission.status === 'passed') {
    try {
      const selection = admission.value.selection;
      const selectionBytes = formalBytes(selection);
      const relativeSelectionPath = `${claim.stagingRelative}/selection-v001.json`;
      await writeFile(path.join(claim.stagingAbsolute, 'selection-v001.json'), selectionBytes, {flag: 'wx'});
      const reread = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
        workspaceRoot, relativePath: relativeSelectionPath,
      });
      const decoded = strictParse(reread);
      if (!reread.equals(selectionBytes) || decoded === null || !validSelection(decoded)) {
        throw new Error('selection-reread-invalid');
      }
      selectionBinding = formalBindingFor(
        SELECTION_SCHEMA, `${job.outputRoot}/selection-v001.json`, reread, decoded,
      );
    } catch (cause) {
      selectionFailure = selectionPublicationObservation(
        cause, modules.fatal.classifyPresentationFatalInnerCodeV002,
      );
    }
  }
  const report = finalizePresentationOutputCaptionCueSelectionReportV001({
    reportCore: admission.value.reportCore,
    selectionBinding,
    selectionPublicationFailure: selectionFailure,
  });
  const reportBytes = formalBytes(report);
  try {
    await writeFile(path.join(claim.stagingAbsolute, 'selection-report-v001.json'), reportBytes, {flag: 'wx'});
    const reportReread = await modules.publication.readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot, relativePath: `${claim.stagingRelative}/selection-report-v001.json`,
    });
    const reportDecoded = strictParse(reportReread);
    if (!reportReread.equals(reportBytes) || reportDecoded === null
      || !validSelectionReport(reportDecoded)
      || !await rereadBindings(workspaceRoot, job.implementationBindings, implementationStart.observed)
      || !await rereadBindings(workspaceRoot, job.runtimeDataBindings, runtimeStart.observed)
      || !await rereadBindings(workspaceRoot, job.approvedContractBindings, contractStart.observed)
      || !await stableReadLocal(workspaceRoot, relativeJobPath).then(bytes => bytes.equals(jobBytes))) {
      throw new Error('selection-report-reread-invalid');
    }
  } catch {
    return cliResult({status: 'fatal', job, stage: 'artifact-publication', primaryCode: 'CUE_SELECTION_PUBLICATION_FAILED'});
  }
  try {
    const published = await atomicPublisher({
      workspaceRoot,
      stagingRoot: claim.stagingAbsolute,
      outputRoot: claim.outputAbsolute,
      verifiedImplementationBindings: job.implementationBindings,
    });
    if (published.status !== 'published') throw new Error('publication-failed');
  } catch {
    return cliResult({status: 'fatal', job, stage: 'root-publication', primaryCode: 'CUE_SELECTION_PUBLICATION_FAILED'});
  }
  return cliResult({
    status: report.status,
    job,
    stage: stageForReport(report),
    primaryCode: primaryCodeForReport(report),
  });
}

const MODULE_PATH = fileURLToPath(import.meta.url);
const loadFormalAtomicDirectoryPublisherV001 = async () => {
  const atomic = await import('./presentation_atomic_directory_publish_v001.mjs');
  const names = [
    'classifyPresentationAtomicDirectoryPublishObservationV001',
    'executePresentationAtomicDirectoryNativeHelperV001',
    'preparePresentationDirectoryAtomicPublishV001',
    'publishPresentationDirectoryAtomicallyNoReplaceV001',
  ];
  if (!isObject(atomic) || !same(Object.keys(atomic), names)
    || !names.every(name => typeof atomic[name] === 'function')) {
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
      process.stderr.write('usage: presentation_output_caption_cue_selection_v001.mjs <job-path>\n');
      process.exitCode = 2;
    } else {
      const result = await executePresentationOutputCaptionCueSelectionJobV001({
        jobPath: process.argv[2],
        atomicDirectoryPublisherLoader: loadFormalAtomicDirectoryPublisherV001,
      });
      if (!exactKeys(result, CLI_KEYS)) throw new TypeError('invalid CLI result');
      process.stdout.write(formalBytes(result));
      process.exitCode = result.status === 'passed' ? 0
        : ['rejected', 'abstained'].includes(result.status) ? 1 : 2;
    }
  }
}

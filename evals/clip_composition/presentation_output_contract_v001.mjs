import path from 'node:path';

import {
  canonicalSha256PresentationMeaningInformationJsonV001,
  validatePresentationMeaningImplementationBindingV001,
  validatePresentationMeaningJsonBindingV001,
  validatePresentationMeaningMediaBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
} from './presentation_renderer_text_layout_v001.mjs';

export const PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001 =
  'presentation-output-request-v001';
export const PRESENTATION_OUTPUT_ACCEPTANCE_REPORT_SCHEMA_V001 =
  'presentation-output-acceptance-report-v001';
export const PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001 =
  'presentation-output-formal-job-v001';

export const PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001 = Object.freeze([
  'OUTPUT_REQUEST_INVALID',
  'OUTPUT_REQUEST_BINDING_MISMATCH',
  'MEANING_PACKAGE_INVALID',
  'MEANING_PACKAGE_BINDING_MISMATCH',
  'BASE_MEDIA_INPUT_MISMATCH',
  'SOURCE_MEDIA_CAPABILITY_UNSUPPORTED',
  'SOURCE_MEDIA_BINDING_MISMATCH',
  'TIMELINE_COMPOSITION_UNSUPPORTED',
  'TIMELINE_FRAME_MAPPING_INVALID',
  'CAPTION_SOURCE_RESOLUTION_FAILED',
  'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
  'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
  'TITLE_STYLE_UNAVAILABLE',
  'STYLE_BINDING_MISMATCH',
  'PRESET_CAPABILITY_MISMATCH',
  'CROP_BINDING_MISMATCH',
  'MEANING_PROJECTION_CHANGED',
  'OUTPUT_PUBLICATION_TARGET_INVALID',
  'COMMON_RENDER_PLAN_INVALID',
]);

export const PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001 = Object.freeze([
  'requestSchema',
  'meaningPackageBinding',
  'meaningPackage',
  'baseMediaInput',
  'sourceMediaCapability',
  'timelineCapability',
  'timelineFrameMapping',
  'styleResolution',
  'cropResolution',
  'captionSourceResolution',
  'captionDisplayLayout',
  'captionDisplayTimeline',
  'titleCapability',
  'meaningPreservation',
  'publicationTarget',
  'commonRenderPlan',
]);

export const PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001 = Object.freeze({
  requestSchema: Object.freeze([]),
  meaningPackageBinding: Object.freeze(['requestSchema']),
  meaningPackage: Object.freeze(['meaningPackageBinding']),
  baseMediaInput: Object.freeze(['meaningPackage']),
  sourceMediaCapability: Object.freeze(['meaningPackage', 'baseMediaInput']),
  timelineCapability: Object.freeze(['meaningPackage']),
  timelineFrameMapping: Object.freeze(['timelineCapability', 'baseMediaInput']),
  styleResolution: Object.freeze(['requestSchema']),
  cropResolution: Object.freeze(['styleResolution', 'baseMediaInput']),
  captionSourceResolution: Object.freeze(['meaningPackage', 'timelineCapability']),
  captionDisplayLayout: Object.freeze(['captionSourceResolution', 'styleResolution']),
  captionDisplayTimeline: Object.freeze(['captionDisplayLayout', 'timelineFrameMapping']),
  titleCapability: Object.freeze(['meaningPackage', 'styleResolution']),
  meaningPreservation: Object.freeze(['captionDisplayTimeline', 'titleCapability']),
  publicationTarget: Object.freeze(['requestSchema']),
  commonRenderPlan: Object.freeze([
    'meaningPreservation',
    'cropResolution',
    'publicationTarget',
  ]),
});

export const PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001 = Object.freeze({
  OUTPUT_REQUEST_INVALID: 'requestSchema',
  OUTPUT_REQUEST_BINDING_MISMATCH: 'requestSchema',
  MEANING_PACKAGE_INVALID: 'meaningPackage',
  MEANING_PACKAGE_BINDING_MISMATCH: 'meaningPackageBinding',
  BASE_MEDIA_INPUT_MISMATCH: 'baseMediaInput',
  SOURCE_MEDIA_CAPABILITY_UNSUPPORTED: 'sourceMediaCapability',
  SOURCE_MEDIA_BINDING_MISMATCH: 'sourceMediaCapability',
  TIMELINE_COMPOSITION_UNSUPPORTED: 'timelineCapability',
  TIMELINE_FRAME_MAPPING_INVALID: 'timelineFrameMapping',
  CAPTION_SOURCE_RESOLUTION_FAILED: 'captionSourceResolution',
  DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE: 'captionDisplayLayout',
  DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE: 'captionDisplayTimeline',
  TITLE_STYLE_UNAVAILABLE: 'titleCapability',
  STYLE_BINDING_MISMATCH: 'styleResolution',
  PRESET_CAPABILITY_MISMATCH: 'styleResolution',
  CROP_BINDING_MISMATCH: 'cropResolution',
  MEANING_PROJECTION_CHANGED: 'meaningPreservation',
  OUTPUT_PUBLICATION_TARGET_INVALID: 'publicationTarget',
  COMMON_RENDER_PLAN_INVALID: 'commonRenderPlan',
});

export const PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001 = Object.freeze([
  Object.freeze({
    role: 'output-contract',
    path: 'evals/clip_composition/presentation_output_contract_v001.mjs',
  }),
  Object.freeze({
    role: 'page-line-planner',
    path: 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs',
  }),
  Object.freeze({
    role: 'style-resolver',
    path: 'evals/clip_composition/presentation_output_style_resolver_v001.ts',
  }),
  Object.freeze({
    role: 'crop-application',
    path: 'evals/clip_composition/presentation_output_crop_application_v001.mjs',
  }),
  Object.freeze({
    role: 'render-plan',
    path: 'evals/clip_composition/presentation_output_render_plan_v001.mjs',
  }),
  Object.freeze({
    role: 'output-runner',
    path: 'evals/clip_composition/run_presentation_output_job_v001.ts',
  }),
  Object.freeze({
    role: 'landscape-preset',
    path: 'evals/clip_composition/presentation_renderer_plan_v002.mjs',
  }),
  Object.freeze({
    role: 'landscape-layout',
    path: 'evals/clip_composition/inspect_presentation_preset_layout.ts',
  }),
  Object.freeze({
    role: 'common-renderer',
    path: 'evals/clip_composition/render_presentation_v002.mjs',
  }),
  Object.freeze({
    role: 'vertical-layout',
    path: 'evals/clip_composition/render_presentation_vertical_review_v001.ts',
  }),
  Object.freeze({
    role: 'strict-json',
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  }),
  Object.freeze({
    role: 'fatal-observation',
    path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
  }),
]);

export const PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001 = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
    role: 'output-side-contract',
  }),
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const RUNTIME_ROLES = Object.freeze([
  'node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick',
]);
const FORMATS = Object.freeze(['normal-landscape', 'vertical-short-1080x1920']);
const VERTICAL_SCREEN_LAYOUTS = Object.freeze([
  'speaker_only', 'screen_speaker', 'speaker_pair',
]);
const OUTPUT_ACCEPTANCE_REQUEST_BINDING_PATH =
  /^evals\/clip_composition\/outputs\/presentation\/meaning-output-control\/([^/]+)\/output-request\.json$/u;
const FORMAL_OUTPUT_REQUEST_BINDING_PATH =
  /^evals\/clip_composition\/outputs\/presentation\/meaning-output-jobs\/([^/]+)\/output-request\.json$/u;
const CODE_ORDER = new Map(
  PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001
    .map((code, index) => [code, index]),
);
const CHECK_ORDER = new Map(
  PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001
    .map((name, index) => [name, index]),
);

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => {
  if (!Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === value.length
    && keys.every((key, index) => key === String(index));
};
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const compareUtf8 = (left, right) => Buffer.compare(
  Buffer.from(left, 'utf8'),
  Buffer.from(right, 'utf8'),
);
const sortedUniqueStrings = values => dense(values)
  && values.every(value => typeof value === 'string')
  && new Set(values).size === values.length
  && values.every((value, index) => index === 0 || compareUtf8(values[index - 1], value) < 0);
const requestIdFromAcceptanceRequestBinding = value => {
  if (!isObject(value) || typeof value.path !== 'string') return null;
  const match = OUTPUT_ACCEPTANCE_REQUEST_BINDING_PATH.exec(value.path);
  return match !== null && FORMAL_ID.test(match[1]) ? match[1] : null;
};

const requestIdFromFormalRequestBinding = value => {
  if (!isObject(value) || typeof value.path !== 'string') return null;
  const match = FORMAL_OUTPUT_REQUEST_BINDING_PATH.exec(value.path);
  return match !== null && FORMAL_ID.test(match[1]) ? match[1] : null;
};

// These tables are production control flow.  Close them at module load so a
// missing node, backward edge, or owner outside the DAG cannot silently alter
// blocked-check behavior.
const assertPresentationOutputAcceptanceDefinitionV001 = () => {
  const checks = [...PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001];
  if (new Set(checks).size !== checks.length
    || !same(
      Object.keys(PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001),
      checks,
    )
    || !same(
      Object.keys(PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001),
      [...PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001],
    )) {
    throw new Error('output acceptance DAG definition is not closed');
  }
  for (const [checkIndex, checkName] of checks.entries()) {
    const dependencies = PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001[checkName];
    if (!dense(dependencies)
      || new Set(dependencies).size !== dependencies.length
      || dependencies.some(dependency => {
        const dependencyIndex = checks.indexOf(dependency);
        return dependencyIndex < 0 || dependencyIndex >= checkIndex;
      })) {
      throw new Error(`output acceptance DAG is not topological at ${checkName}`);
    }
  }
  if (PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001.some(code =>
    !checks.includes(PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[code]))) {
    throw new Error('output acceptance violation owner is outside the DAG');
  }
};
assertPresentationOutputAcceptanceDefinitionV001();

const derivedOutputFormalIds = requestId => {
  const outputId = `${requestId}-output`;
  return [
    outputId,
    `${requestId}-acceptance`,
    `${requestId}-render-plan`,
    `${outputId}-application-results`,
    `${outputId}-qc`,
    `${outputId}-render-manifest`,
    // The failure suffix is always a 32-hex prefix of the formal job file SHA.
    `${outputId}-render-failure-${'0'.repeat(32)}`,
  ];
};

export const makePresentationOutputAcceptanceViolationV001 = (
  code,
  pointer,
  relatedIds = [],
) => {
  if (!CODE_ORDER.has(code)) {
    throw new TypeError(`unknown output acceptance violation code: ${code}`);
  }
  if (typeof pointer !== 'string' || !JSON_POINTER.test(pointer)) {
    throw new TypeError('output acceptance violation path is not an RFC 6901 pointer');
  }
  const ids = [...new Set(relatedIds)];
  if (ids.some(value => typeof value !== 'string')) {
    throw new TypeError('output acceptance relatedIds must be strings');
  }
  ids.sort(compareUtf8);
  return Object.freeze({
    code,
    path: pointer,
    relatedIds: Object.freeze(ids),
  });
};

/**
 * runnerが観測する事実と、16 check / 19 violationの所有を結ぶ唯一の表。
 * ruleは記載順ではなく全体code順で評価し、同一check内の併発順も固定する。
 */
export const PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001 =
  Object.freeze({
    requestSchema: Object.freeze([
      Object.freeze({
        observationKey: 'requestSchemaValid',
        code: 'OUTPUT_REQUEST_INVALID',
        path: '',
      }),
      Object.freeze({
        observationKey: 'requestBindingMatches',
        code: 'OUTPUT_REQUEST_BINDING_MISMATCH',
        path: '',
      }),
    ]),
    meaningPackageBinding: Object.freeze([
      Object.freeze({
        observationKey: 'bindingMatches',
        code: 'MEANING_PACKAGE_BINDING_MISMATCH',
        path: '/meaningInformationPackage',
      }),
    ]),
    meaningPackage: Object.freeze([
      Object.freeze({
        observationKey: 'packageValid',
        code: 'MEANING_PACKAGE_INVALID',
        path: '',
      }),
    ]),
    baseMediaInput: Object.freeze([
      Object.freeze({
        observationKey: 'inputMatches',
        code: 'BASE_MEDIA_INPUT_MISMATCH',
        path: '/baseMediaInput',
      }),
    ]),
    sourceMediaCapability: Object.freeze([
      Object.freeze({
        observationKey: 'capabilitySupported',
        code: 'SOURCE_MEDIA_CAPABILITY_UNSUPPORTED',
        path: '/sourceMedia',
      }),
      Object.freeze({
        observationKey: 'bindingMatches',
        code: 'SOURCE_MEDIA_BINDING_MISMATCH',
        path: '/sourceMedia/0/mediaBinding',
      }),
    ]),
    timelineCapability: Object.freeze([
      Object.freeze({
        observationKey: 'compositionSupported',
        code: 'TIMELINE_COMPOSITION_UNSUPPORTED',
        path: '/timelineComposition',
      }),
    ]),
    timelineFrameMapping: Object.freeze([
      Object.freeze({
        observationKey: 'mappingValid',
        code: 'TIMELINE_FRAME_MAPPING_INVALID',
        path: '/timelineComposition/segments',
      }),
    ]),
    styleResolution: Object.freeze([
      Object.freeze({
        observationKey: 'bindingMatches',
        code: 'STYLE_BINDING_MISMATCH',
        path: '/styleInput/presetBinding',
      }),
      Object.freeze({
        observationKey: 'presetCapabilitySupported',
        code: 'PRESET_CAPABILITY_MISMATCH',
        path: '/styleInput/presetBinding',
      }),
    ]),
    cropResolution: Object.freeze([
      Object.freeze({
        observationKey: 'bindingMatches',
        code: 'CROP_BINDING_MISMATCH',
        path: '/styleInput/cropPolicy',
      }),
    ]),
    captionSourceResolution: Object.freeze([
      Object.freeze({
        observationKey: 'sourceResolved',
        code: 'CAPTION_SOURCE_RESOLUTION_FAILED',
        path: '/captions',
      }),
    ]),
    captionDisplayLayout: Object.freeze([
      Object.freeze({
        observationKey: 'layoutRepresentable',
        code: 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
        path: '/captions',
      }),
    ]),
    captionDisplayTimeline: Object.freeze([
      Object.freeze({
        observationKey: 'timelineRepresentable',
        code: 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
        path: '/captions',
      }),
    ]),
    titleCapability: Object.freeze([
      Object.freeze({
        observationKey: 'styleAvailable',
        code: 'TITLE_STYLE_UNAVAILABLE',
        path: '/title',
      }),
    ]),
    meaningPreservation: Object.freeze([
      Object.freeze({
        observationKey: 'projectionPreserved',
        code: 'MEANING_PROJECTION_CHANGED',
        path: '/captions',
      }),
    ]),
    publicationTarget: Object.freeze([
      Object.freeze({
        observationKey: 'targetAvailable',
        code: 'OUTPUT_PUBLICATION_TARGET_INVALID',
        path: '/publication',
      }),
    ]),
    commonRenderPlan: Object.freeze([
      Object.freeze({
        observationKey: 'planValid',
        code: 'COMMON_RENDER_PLAN_INVALID',
        path: '/renderPlan',
      }),
    ]),
  });

const observationRulesForCheck = checkName => {
  if (!CHECK_ORDER.has(checkName)) {
    throw new TypeError(`unknown output acceptance check: ${checkName}`);
  }
  const rules = PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001[checkName];
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new TypeError(`output acceptance check has no observation rules: ${checkName}`);
  }
  return rules;
};

export function makePresentationOutputAcceptancePassedObservationV001(checkName) {
  return Object.freeze(Object.fromEntries(
    observationRulesForCheck(checkName).map(rule => [rule.observationKey, true]),
  ));
}

export function inspectPresentationOutputAcceptanceObservationV001({
  checkName,
  observation,
}) {
  const rules = observationRulesForCheck(checkName);
  const keys = rules.map(rule => rule.observationKey);
  if (!exactKeys(observation, keys)
    || keys.some(key => typeof observation[key] !== 'boolean')) {
    throw new TypeError(`invalid output acceptance observation for ${checkName}`);
  }
  const violations = rules
    .filter(rule => observation[rule.observationKey] === false)
    .map(rule => makePresentationOutputAcceptanceViolationV001(
      rule.code,
      rule.path,
    ));
  return Object.freeze({
    status: violations.length === 0 ? 'passed' : 'failed',
    violations: Object.freeze(sortPresentationOutputAcceptanceViolationsV001(violations)),
  });
}

export const sortPresentationOutputAcceptanceViolationsV001 = violations =>
  [...violations].sort((left, right) => {
    const codeDifference = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
      - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
    if (codeDifference !== 0) return codeDifference;
    const pathDifference = compareUtf8(left.path, right.path);
    if (pathDifference !== 0) return pathDifference;
    return compareUtf8(left.relatedIds.join('\u0000'), right.relatedIds.join('\u0000'));
  });

const OBSERVATION_RULE_CODES = PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001.flatMap(
  checkName => PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001[checkName]
    .map(rule => rule.code),
).sort((left, right) => CODE_ORDER.get(left) - CODE_ORDER.get(right));
if (!same(OBSERVATION_RULE_CODES, PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001)
  || new Set(OBSERVATION_RULE_CODES).size !== OBSERVATION_RULE_CODES.length
  || PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001.some(checkName =>
    PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001[checkName]
      .some(rule => PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[rule.code]
        !== checkName))) {
  throw new Error('output acceptance observation ownership is inconsistent');
}

const validJsonBindingSchema = (value, schemaVersion) =>
  validatePresentationMeaningJsonBindingV001(value)
  && value.schemaVersion === schemaVersion;

const validatePresetBinding = (value, format) => {
  if (!exactKeys(value, [
    'trustedRegistryBindings',
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'rendererTrust',
    'presetId',
  ]) || !FORMAL_ID.test(value.presetId)) return false;
  const expected = format === 'normal-landscape'
    ? [
      'presentation-registry-trust-v001',
      'presentation-preset-registry-v001',
      'normal-landscape-preset-registry-v001',
      'presentation-material-registry-empty-v001',
      'presentation-renderer-trust-v001',
    ]
    : [
      'presentation-registry-trust-v002',
      'presentation-preset-registry-v002',
      'vertical-short-preset-registry-v001',
      'presentation-material-registry-empty-v001',
      'presentation-vertical-renderer-trust-v001',
    ];
  return [
    value.trustedRegistryBindings,
    value.presetRegistry,
    value.presetValidationIndex,
    value.materialValidationIndex,
    value.rendererTrust,
  ].every((binding, index) => validJsonBindingSchema(binding, expected[index]));
};

const validateCaptionLayoutPolicy = value => exactKeys(value, [
  'maxLogicalWidthPerLine',
  'maxLinesPerDisplayPage',
  'characterWidthRule',
  'pageBreakPolicy',
])
  && positive(value.maxLogicalWidthPerLine)
  && Number.isSafeInteger(value.maxLinesPerDisplayPage)
  && value.maxLinesPerDisplayPage >= 1
  && value.maxLinesPerDisplayPage <= 99
  && value.characterWidthRule === PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
  && value.pageBreakPolicy === 'split-at-source-atom-boundary-or-reject';

const validateCropPolicy = (value, format) => {
  if (format === 'normal-landscape') {
    return exactKeys(value, ['mode']) && value.mode === 'identity';
  }
  return exactKeys(value, [
    'mode', 'scope', 'application',
  ])
    && value.mode === 'bound-decision'
    && value.scope === 'all-segments'
    && validJsonBindingSchema(
      value.application,
      'presentation-output-crop-application-v001',
    );
};

export function validatePresentationOutputRequestV001(value) {
  if (!exactKeys(value, [
    'schemaVersion',
    'requestId',
    'mode',
    'meaningInformationPackage',
    'baseMediaInput',
    'styleInput',
    'publication',
  ])
    || value.schemaVersion !== PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001
    || !FORMAL_ID.test(value.requestId)
    || value.mode !== 'formal-generation') return false;
  if (!validJsonBindingSchema(
    value.meaningInformationPackage,
    'zev-meaning-information-package-v001',
  )) return false;
  if (!exactKeys(value.baseMediaInput, [
    'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
  ])
    || !validatePresentationMeaningMediaBindingV001(value.baseMediaInput.baseMedia)
    || !validJsonBindingSchema(
      value.baseMediaInput.timeline,
      'presentation-base-media-timeline-v002',
    )
    || !validJsonBindingSchema(
      value.baseMediaInput.generationManifest,
      'presentation-output-base-media-generation-manifest-v001',
    )
    || !validJsonBindingSchema(
      value.baseMediaInput.validationReceipt,
      'presentation-output-base-media-validation-receipt-v001',
    )) return false;
  const style = value.styleInput;
  if (!exactKeys(style, [
    'format',
    'screenLayoutId',
    'presetBinding',
    'captionLayoutPolicy',
    'cropPolicy',
    'sceneTransitionPolicy',
    'audioPolicy',
    'materials',
  ])
    || !FORMATS.includes(style.format)
    || (style.format === 'normal-landscape'
      ? style.screenLayoutId !== null
      : !VERTICAL_SCREEN_LAYOUTS.includes(style.screenLayoutId))
    || !validatePresetBinding(style.presetBinding, style.format)
    || !validateCaptionLayoutPolicy(style.captionLayoutPolicy)
    || !validateCropPolicy(style.cropPolicy, style.format)
    || !exactKeys(style.sceneTransitionPolicy, ['mode'])
    || style.sceneTransitionPolicy.mode !== 'straight-cut-only'
    || !exactKeys(style.audioPolicy, ['mode'])
    || style.audioPolicy.mode !== 'preserve-source-only'
    || !dense(style.materials)
    || style.materials.length !== 0) return false;
  const outputId = `${value.requestId}-output`;
  return exactKeys(value.publication, [
    'outputId', 'controlRoot', 'renderOutputRoot',
  ])
    && derivedOutputFormalIds(value.requestId).every(derivedId => FORMAL_ID.test(derivedId))
    && value.publication.outputId === outputId
    && value.publication.controlRoot
      === `evals/clip_composition/outputs/presentation/meaning-output-control/${value.requestId}`
    && value.publication.renderOutputRoot
      === `evals/clip_composition/outputs/presentation/meaning-output-renders/${outputId}`;
}

export function inspectPresentationOutputRequestV001(value) {
  return validatePresentationOutputRequestV001(value)
    ? {status: 'passed', violations: []}
    : {
      status: 'rejected',
      violations: [makePresentationOutputAcceptanceViolationV001(
        'OUTPUT_REQUEST_INVALID',
        '',
      )],
    };
}

const validateRuntimeBinding = value => exactKeys(value, ['path', 'version', 'fileSha256'])
  && typeof value.path === 'string'
  && path.isAbsolute(value.path)
  && typeof value.version === 'string'
  && value.version.length > 0
  && SHA256.test(value.fileSha256);

export function validatePresentationOutputFormalJobV001(job, request = null) {
  const boundRequestId = requestIdFromFormalRequestBinding(job?.requestBinding);
  if (!exactKeys(job, [
    'schemaVersion',
    'jobId',
    'requestBinding',
    'runtimeProfile',
    'implementationBindings',
    'approvedContractBindings',
    'controlOutputRoot',
    'renderOutputRoot',
    'expectedOutputId',
    'executionPolicy',
  ])
    || job.schemaVersion !== PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001
    || !FORMAL_ID.test(job.jobId)
    || boundRequestId === null
    || !validJsonBindingSchema(job.requestBinding, PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001)
    || !exactKeys(job.runtimeProfile, RUNTIME_ROLES)
    || !RUNTIME_ROLES.every(role => validateRuntimeBinding(job.runtimeProfile[role]))
    || !dense(job.implementationBindings)
    || job.implementationBindings.length
      !== PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001.length
    || !job.implementationBindings.every((binding, index) =>
      validatePresentationMeaningImplementationBindingV001(binding)
      && binding.role === PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001[index].role
      && binding.path === PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001[index].path)
    || !dense(job.approvedContractBindings)
    || !same(
      job.approvedContractBindings,
      PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
    )
    || !WORKSPACE_PATH.test(job.controlOutputRoot)
    || !WORKSPACE_PATH.test(job.renderOutputRoot)
    || !FORMAL_ID.test(job.expectedOutputId)
    || job.controlOutputRoot
      !== `evals/clip_composition/outputs/presentation/meaning-output-control/${boundRequestId}`
    || job.renderOutputRoot
      !== `evals/clip_composition/outputs/presentation/meaning-output-renders/${boundRequestId}-output`
    || job.expectedOutputId !== `${boundRequestId}-output`
    || !exactKeys(job.executionPolicy, [
      'oneShot', 'allowRetry', 'allowLegacyArtifacts',
    ])
    || job.executionPolicy.oneShot !== true
    || job.executionPolicy.allowRetry !== false
    || job.executionPolicy.allowLegacyArtifacts !== false) return false;
  if (request === null) return true;
  return validatePresentationOutputRequestV001(request)
    && boundRequestId === request.requestId
    && job.controlOutputRoot === request.publication.controlRoot
    && job.renderOutputRoot === request.publication.renderOutputRoot
    && job.expectedOutputId === request.publication.outputId;
}

const validViolation = value => exactKeys(value, ['code', 'path', 'relatedIds'])
  && CODE_ORDER.has(value.code)
  && typeof value.path === 'string'
  && JSON_POINTER.test(value.path)
  && sortedUniqueStrings(value.relatedIds);

const validTimelineProjection = value => exactKeys(value, [
  'sourceMediaCount',
  'segmentCount',
  'outputFrameCount',
  'sourceToOutputMappingCanonicalSha256',
  'baseMediaFileSha256',
])
  && nonnegative(value.sourceMediaCount)
  && nonnegative(value.segmentCount)
  && nonnegative(value.outputFrameCount)
  && SHA256.test(value.sourceToOutputMappingCanonicalSha256)
  && SHA256.test(value.baseMediaFileSha256);

const validCaptionProjection = value => exactKeys(value, [
  'semanticCaptionCount',
  'displayPageCount',
  'displayLineCount',
  'maxObservedLogicalWidth',
  'captionPageLineMapCanonicalSha256',
])
  && nonnegative(value.semanticCaptionCount)
  && nonnegative(value.displayPageCount)
  && nonnegative(value.displayLineCount)
  && nonnegative(value.maxObservedLogicalWidth)
  && SHA256.test(value.captionPageLineMapCanonicalSha256);

const validMeaningProjection = value => exactKeys(value, [
  'timelineSegmentCount',
  'captionCount',
  'titleState',
  'semanticObservationCount',
  'captionTextSequenceCanonicalSha256',
  'captionTimingSequenceCanonicalSha256',
  'timelineCompositionCanonicalSha256',
])
  && nonnegative(value.timelineSegmentCount)
  && nonnegative(value.captionCount)
  && ['empty', 'provided'].includes(value.titleState)
  && nonnegative(value.semanticObservationCount)
  && SHA256.test(value.captionTextSequenceCanonicalSha256)
  && SHA256.test(value.captionTimingSequenceCanonicalSha256)
  && SHA256.test(value.timelineCompositionCanonicalSha256);

const validStyleProjection = value => exactKeys(value, [
  'format',
  'screenLayoutId',
  'presetId',
  'visualStateId',
  'cropMode',
  'sceneTransitionMode',
  'audioMode',
])
  && FORMATS.includes(value.format)
  && (value.format === 'normal-landscape'
    ? value.screenLayoutId === null && value.cropMode === 'identity'
    : FORMAL_ID.test(value.screenLayoutId) && value.cropMode === 'bound-decision')
  && FORMAL_ID.test(value.presetId)
  && FORMAL_ID.test(value.visualStateId)
  && ['identity', 'bound-decision'].includes(value.cropMode)
  && value.sceneTransitionMode === 'straight-cut-only'
  && value.audioMode === 'preserve-source-only';

const checkStatusByName = checks => new Map(checks.map(check => [check.name, check.status]));

export function validatePresentationOutputAcceptanceReportV001(value) {
  const boundRequestId = requestIdFromAcceptanceRequestBinding(value?.requestBinding);
  if (!exactKeys(value, [
    'schemaVersion',
    'reportId',
    'status',
    'requestBinding',
    'checks',
    'violations',
    'timelineProjection',
    'captionDisplayProjection',
    'meaningProjection',
    'resolvedStyleProjection',
    'renderPlanBinding',
  ])
    || value.schemaVersion !== PRESENTATION_OUTPUT_ACCEPTANCE_REPORT_SCHEMA_V001
    || !FORMAL_ID.test(value.reportId)
    || boundRequestId === null
    || value.reportId !== `${boundRequestId}-acceptance`
    || !['accepted-for-render', 'rejected'].includes(value.status)
    || !validJsonBindingSchema(value.requestBinding, PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001)
    || !dense(value.checks)
    || value.checks.length !== PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001.length
    || !value.checks.every((check, index) => exactKeys(check, [
      'name', 'status', 'violationCodes',
    ])
      && check.name === PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001[index]
      && ['passed', 'failed', 'blocked'].includes(check.status)
      && dense(check.violationCodes)
      && new Set(check.violationCodes).size === check.violationCodes.length
      && check.violationCodes.every(code =>
        PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[code] === check.name)
      && (check.status === 'failed'
        ? check.violationCodes.length > 0
        : check.violationCodes.length === 0))
    || !dense(value.violations)
    || !value.violations.every(validViolation)
    || new Set(value.violations.map(violation => JSON.stringify(violation))).size
      !== value.violations.length
    || !same(
      value.violations,
      sortPresentationOutputAcceptanceViolationsV001(value.violations),
    )) return false;
  const statuses = checkStatusByName(value.checks);
  for (const check of value.checks) {
    const dependencies = PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001[check.name];
    const runnable = dependencies.every(name => statuses.get(name) === 'passed');
    if ((runnable && check.status === 'blocked') || (!runnable && check.status !== 'blocked')) {
      return false;
    }
    const owned = value.violations
      .filter(violation => PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[violation.code]
        === check.name)
      .map(violation => violation.code);
    const uniqueOwned = PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001
      .filter(code => owned.includes(code));
    if (!same(check.violationCodes, uniqueOwned)) return false;
  }
  const allPassed = value.checks.every(check => check.status === 'passed');
  if ((value.status === 'accepted-for-render') !== allPassed) return false;
  if ((value.status === 'accepted-for-render') !== (value.violations.length === 0)) return false;
  const passed = name => statuses.get(name) === 'passed';
  if ((value.meaningProjection !== null) !== passed('meaningPackage')
    || (value.timelineProjection !== null) !== passed('timelineFrameMapping')
    || (value.captionDisplayProjection !== null) !== passed('captionDisplayTimeline')
    || (value.resolvedStyleProjection !== null)
      !== (passed('styleResolution') && passed('cropResolution'))
    || (value.renderPlanBinding !== null) !== passed('commonRenderPlan')) return false;
  return (value.timelineProjection === null || validTimelineProjection(value.timelineProjection))
    && (value.captionDisplayProjection === null
      || validCaptionProjection(value.captionDisplayProjection))
    && (value.meaningProjection === null || validMeaningProjection(value.meaningProjection))
    && (value.resolvedStyleProjection === null
      || validStyleProjection(value.resolvedStyleProjection))
    && (value.renderPlanBinding === null
      || validJsonBindingSchema(
        value.renderPlanBinding,
        'presentation-output-render-plan-v001',
      ));
}

const normalizeCheckViolations = (name, value) => {
  if (!isObject(value) || !['passed', 'failed'].includes(value.status)) {
    throw new TypeError(`output acceptance evaluator returned an invalid result for ${name}`);
  }
  const violations = value.violations ?? [];
  if (!dense(violations) || !violations.every(validViolation)) {
    throw new TypeError(`output acceptance evaluator returned invalid violations for ${name}`);
  }
  if (violations.some(violation =>
    PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[violation.code] !== name)) {
    throw new TypeError(`output acceptance evaluator crossed violation ownership at ${name}`);
  }
  if ((value.status === 'passed') !== (violations.length === 0)) {
    throw new TypeError(`output acceptance evaluator status disagrees with violations at ${name}`);
  }
  return sortPresentationOutputAcceptanceViolationsV001(violations);
};

/**
 * 16 checksを正本DAGのtopological順で一度ずつ評価する。
 * 依存不成立の枝だけをblockedにし、独立枝は最後まで実測する。
 */
export async function evaluatePresentationOutputAcceptanceChecksV001({
  evaluators,
  context = {},
}) {
  if (!isObject(evaluators)) throw new TypeError('output acceptance evaluators are required');
  const checks = [];
  const results = {};
  const violations = [];
  for (const name of PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001) {
    const dependencies = PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001[name];
    if (!dependencies.every(dependency => results[dependency]?.status === 'passed')) {
      const blocked = {name, status: 'blocked', violationCodes: []};
      checks.push(blocked);
      results[name] = {status: 'blocked', violations: []};
      continue;
    }
    if (typeof evaluators[name] !== 'function') {
      throw new TypeError(`missing output acceptance evaluator: ${name}`);
    }
    const result = await evaluators[name]({
      context,
      results,
      checkName: name,
    });
    const owned = normalizeCheckViolations(name, result);
    violations.push(...owned);
    const violationCodes = PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001
      .filter(code => owned.some(violation => violation.code === code));
    const normalized = {
      ...result,
      status: owned.length === 0 ? 'passed' : 'failed',
      violations: owned,
    };
    results[name] = normalized;
    checks.push({name, status: normalized.status, violationCodes});
  }
  return {
    checks,
    results,
    violations: sortPresentationOutputAcceptanceViolationsV001(violations),
  };
}

export function buildPresentationOutputAcceptanceReportV001({
  request,
  requestBinding,
  checks,
  violations,
  timelineProjection = null,
  captionDisplayProjection = null,
  meaningProjection = null,
  resolvedStyleProjection = null,
  renderPlanBinding = null,
}) {
  if (!isObject(request) || !FORMAL_ID.test(request.requestId)) {
    throw new TypeError('a request with a FormalId is required to build acceptance report');
  }
  const sorted = sortPresentationOutputAcceptanceViolationsV001(violations);
  const report = {
    schemaVersion: PRESENTATION_OUTPUT_ACCEPTANCE_REPORT_SCHEMA_V001,
    reportId: `${request.requestId}-acceptance`,
    status: checks.every(check => check.status === 'passed')
      ? 'accepted-for-render'
      : 'rejected',
    requestBinding: structuredClone(requestBinding),
    checks: structuredClone(checks),
    violations: structuredClone(sorted),
    timelineProjection: structuredClone(timelineProjection),
    captionDisplayProjection: structuredClone(captionDisplayProjection),
    meaningProjection: structuredClone(meaningProjection),
    resolvedStyleProjection: structuredClone(resolvedStyleProjection),
    renderPlanBinding: structuredClone(renderPlanBinding),
  };
  if (!validatePresentationOutputAcceptanceReportV001(report)) {
    throw new TypeError('constructed output acceptance report is invalid');
  }
  return report;
}

export function derivePresentationOutputMeaningProjectionV001(meaningPackage) {
  const captions = Array.isArray(meaningPackage?.captions) ? meaningPackage.captions : [];
  const segments = Array.isArray(meaningPackage?.timelineComposition?.segments)
    ? meaningPackage.timelineComposition.segments
    : [];
  const observations = Array.isArray(meaningPackage?.semanticObservations)
    ? meaningPackage.semanticObservations
    : [];
  if (!isObject(meaningPackage?.title)
    || typeof meaningPackage.title.text !== 'string') {
    throw new TypeError('meaning package title is invalid');
  }
  return {
    timelineSegmentCount: segments.length,
    captionCount: captions.length,
    titleState: meaningPackage.title.text === '' ? 'empty' : 'provided',
    semanticObservationCount: observations.length,
    captionTextSequenceCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(
        captions.map(caption => ({captionId: caption.captionId, text: caption.text})),
      ),
    captionTimingSequenceCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(
        captions.map(caption => ({
          captionId: caption.captionId,
          startAnchor: caption.startAnchor,
          endAnchor: caption.endAnchor,
          sourceStartMs: caption.sourceStartMs,
          sourceEndMs: caption.sourceEndMs,
        })),
      ),
    timelineCompositionCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(
        meaningPackage.timelineComposition,
      ),
  };
}

export const derivePresentationOutputResolvedStyleProjectionV001 = resolvedStyle => ({
  format: resolvedStyle.format,
  screenLayoutId: resolvedStyle.screenLayoutId,
  presetId: resolvedStyle.presetId,
  visualStateId: resolvedStyle.visualStateId,
  cropMode: resolvedStyle.cropMode,
  sceneTransitionMode: resolvedStyle.sceneTransitionMode,
  audioMode: resolvedStyle.audioMode,
});

export const validatePresentationOutputTimelineProjectionV001 = validTimelineProjection;
export const validatePresentationOutputCaptionDisplayProjectionV001 = validCaptionProjection;
export const validatePresentationOutputMeaningProjectionV001 = validMeaningProjection;
export const validatePresentationOutputResolvedStyleProjectionV001 = validStyleProjection;

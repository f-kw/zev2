import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import test, {before} from 'node:test';
import {pathToFileURL} from 'node:url';

import {
  buildPresentationZevoCaptionQualityV002OutputRequestV001,
  decodePresentationZevoCaptionQualityV002ProofJobV001,
  derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001,
  executePresentationZevoCaptionQualityV002ProofJobV001,
  readPresentationZevoCaptionQualityV002FormalCapabilitiesV001,
  validatePresentationZevoCaptionQualityV002ProofJobV001,
} from './run_presentation_zevo_caption_quality_v002_proof_job_v001.ts';
import {admitPresentationZevoCaptionQualityV002FixtureV001} from './run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs';
import {
  buildPresentationOutputCaptionCueProjectionSetV001,
  buildPresentationOutputCaptionCueSourceClosureV001,
  rereadPresentationOutputCaptionCueCaseInputsV001,
} from './presentation_output_caption_cue_selection_v001.mjs';
import {
  deriveApprovedCaptionQualityProofIdsV015,
  ownerForApprovedCaptionQualityProofIdV001,
} from './presentation_output_caption_cue_source_package_v001.test.mjs';
import {
  readPresentationMeaningWorkspaceFileStableV001,
  hashAbsoluteStableStreaming,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  validatePresentationAMeaningInformationPackageFormalBytesV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {canonicalSha256PresentationAJsonV002} from './presentation_a_source_sequence_v002.mjs';
import {sha256PresentationCaptionB1BytesV001} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  decodePresentationOutputFiniteJsonV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
  canonicalSha256PresentationOutputFiniteJsonV001,
  sha256PresentationOutputCropApplicationBytesV001,
} from './presentation_output_crop_application_v001.mjs';
import {buildPresentationOutputPhysicalPageGraphV001} from './presentation_output_page_line_planner_v001.mjs';
import {validatePresentationOutputResolvedStyleV002} from './presentation_output_page_line_planner_v002.mjs';
import {mapPresentationOutputPiecewiseTimelineV002} from './presentation_output_piecewise_timeline_v002.mjs';
import {resolvePresentationOutputStyleV001} from './presentation_output_style_resolver_v001.ts';
import {
  publishPresentationDirectoryAtomicallyNoReplaceV001,
} from './presentation_atomic_directory_publish_v001.mjs';

const MANIFEST_PREFLIGHT_ONLY =
  process.env.ZEVO_CAPTION_QUALITY_PRESERVATION_MANIFEST_PREFLIGHT === '1'
  || process.env.ZEVO_CAPTION_QUALITY_ENVIRONMENT_PREFLIGHT === '1';
const registerBefore = MANIFEST_PREFLIGHT_ONLY ? () => {} : before;
const registerTest = MANIFEST_PREFLIGHT_ONLY ? () => {} : test;
const ROOT = process.cwd();
const NODE = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const LOADER = '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs';
const MODULE_PATH = 'evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts';
const RECEIPT_ENV = 'ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH';
const RECEIPT_PATH = process.env[RECEIPT_ENV];
if (typeof RECEIPT_PATH !== 'string') throw new TypeError('fixture receipt environment is required');
const OLD_ROOT = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008';
const LANDSCAPE_STYLE_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/output-request.json';
const OLD_OUTPUT_REQUEST_KEYS = Object.freeze(['requestId', 'meaningInformationPackage', 'baseMediaInput']);
const LANDSCAPE_STYLE_REQUEST_KEYS = Object.freeze([
  'schemaVersion', 'requestId', 'mode', 'meaningInformationPackage',
  'baseMediaInput', 'styleInput', 'publication',
]);
const FORMAL_OUTPUT_REQUEST_KEYS = Object.freeze([
  'schemaVersion', 'requestId', 'caseId', 'inputCaptionId', 'sourcePackageBinding',
  'selectionBinding', 'selectionReportBinding', 'meaningPackageBinding',
  'baseMediaInput', 'styleInput', 'publication',
]);
const OLD_RENDER_PLAN_KEYS = Object.freeze([
  'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
  'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
  'meaningProjection',
]);
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const TASK_DESCRIPTION = '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const CASE_ROWS = Object.freeze([
  Object.freeze({
    caseId: 'voice-013',
    inputCaptionId: 'input-caption-000001',
    candidateId: 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013',
    directory: 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013',
  }),
  Object.freeze({
    caseId: 'voice-067',
    inputCaptionId: 'input-caption-000002',
    candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067',
    directory: 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067',
  }),
  Object.freeze({
    caseId: 'voice-190',
    inputCaptionId: 'input-caption-000003',
    candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190',
    directory: 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190',
  }),
]);
const caseArtifactFiles = caseId => Object.freeze([
  `${caseId}/horizontal-formal/output-request-v001.json`,
  `${caseId}/horizontal-formal/page-line-plan-v003.json`,
  `${caseId}/horizontal-formal/render-plan-v003.json`,
  `${caseId}/horizontal-formal/renderer-qc-v001.json`,
  `${caseId}/horizontal-formal/video.mp4`,
]);
const CASE_ARTIFACTS = Object.freeze(Object.fromEntries(
  CASE_ROWS.map(row => [row.caseId, caseArtifactFiles(row.caseId)]),
));
const through = (caseId, count) => Object.freeze(CASE_ARTIFACTS[caseId].slice(0, count));
const sortedFiles = (...groups) => Object.freeze(
  [...new Set(groups.flat())].sort((left, right) => left.localeCompare(right)),
);
const ALL_CASE_FILES = sortedFiles(...Object.values(CASE_ARTIFACTS));
const REVIEW_INPUT_FILE = 'review/review-input-v001.json';
const REVIEW_HTML_FILE = 'review/review.html';
const COMPLETION_REPORT_FILE = 'completion-report-v001.json';
const REJECTION_REPORT_FILE = 'rejection-report-v001.json';
const FATAL_OBSERVATION_FILE = 'fatal-observation-v001.json';
const COLLISION_MARKER_FILE = 'collision-marker.txt';
const COMPLETE_ROOT_FILES = sortedFiles(
  ALL_CASE_FILES,
  [REVIEW_INPUT_FILE, REVIEW_HTML_FILE, COMPLETION_REPORT_FILE],
);
const PRESERVATION_FILE_UNIVERSE = sortedFiles(
  COMPLETE_ROOT_FILES,
  [REJECTION_REPORT_FILE, FATAL_OBSERVATION_FILE, COLLISION_MARKER_FILE],
);
const presentRoot = mustExist => {
  const exactFiles = sortedFiles(mustExist);
  return Object.freeze({
    state: 'present',
    mustExist: exactFiles,
    mustNotExist: Object.freeze(PRESERVATION_FILE_UNIVERSE.filter(file => !exactFiles.includes(file))),
  });
};
const absentRoot = () => Object.freeze({
  state: 'absent', mustExist: Object.freeze([]), mustNotExist: Object.freeze([]),
});
const notApplicableRoot = () => Object.freeze({
  state: 'not-applicable', mustExist: Object.freeze([]), mustNotExist: Object.freeze([]),
});
const expectation = ({status, stage, primaryCode, output, staging = absentRoot()}) =>
  Object.freeze({
    cli: Object.freeze({status, stage, primaryCode}),
    roots: Object.freeze({output, staging}),
  });
const fatalAt = (stage, primaryCode, files, staging = absentRoot()) => expectation({
  status: 'fatal', stage, primaryCode, output: presentRoot(files), staging,
});
const rejectedAt = (stage, primaryCode, files) => expectation({
  status: 'rejected', stage, primaryCode, output: presentRoot(files),
});
const F_NEGATIVE_EXPECTATIONS = Object.freeze({
  'malformed-byte-envelope': expectation({
    status: 'rejected', stage: 'job-read', primaryCode: 'CUE_PROOF_JOB_INVALID',
    output: notApplicableRoot(), staging: notApplicableRoot(),
  }),
  'root-reservation-collision': expectation({
    status: 'rejected', stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
    output: absentRoot(), staging: absentRoot(),
  }),
  'planner-rejected-first-case': rejectedAt(
    'page-line-planner', 'CUE_PLANNER_INPUT_INVALID',
    sortedFiles(through('voice-013', 1), [REJECTION_REPORT_FILE]),
  ),
  'render-rejected-first-case': rejectedAt(
    'render-plan', 'CUE_RENDER_INPUT_INVALID',
    sortedFiles(through('voice-013', 2), [REJECTION_REPORT_FILE]),
  ),
  'renderer-rejected-first-case': rejectedAt(
    'rendering', 'CUE_PROOF_RENDER_FAILED',
    sortedFiles(through('voice-013', 3), [REJECTION_REPORT_FILE]),
  ),
  'renderer-rejected-second-case': rejectedAt(
    'rendering', 'CUE_PROOF_RENDER_FAILED',
    sortedFiles(
      through('voice-013', 5), through('voice-067', 3), [REJECTION_REPORT_FILE],
    ),
  ),
  'output-request-reread-mismatch': rejectedAt(
    'render-plan', 'CUE_RENDER_INPUT_INVALID',
    sortedFiles(through('voice-013', 1), [REJECTION_REPORT_FILE]),
  ),
  'output-request-reread-io-failure': fatalAt(
    'artifact-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(through('voice-013', 1), [FATAL_OBSERVATION_FILE]),
  ),
  'render-plan-write-failure': fatalAt(
    'artifact-publication', 'CUE_RENDER_PUBLICATION_FAILED',
    sortedFiles(through('voice-013', 2), [FATAL_OBSERVATION_FILE]),
  ),
  'render-plan-reread-mismatch': fatalAt(
    'artifact-publication', 'CUE_RENDER_PUBLICATION_FAILED',
    sortedFiles(through('voice-013', 3), [FATAL_OBSERVATION_FILE]),
  ),
  'owner-missing': fatalAt(
    'renderer-work', 'CUE_PROOF_EXECUTION_FAILED',
    sortedFiles(through('voice-013', 3), [FATAL_OBSERVATION_FILE]),
  ),
  'owner-permission': fatalAt(
    'renderer-work', 'CUE_PROOF_EXECUTION_FAILED',
    sortedFiles(through('voice-013', 3), [FATAL_OBSERVATION_FILE]),
  ),
  'owner-mismatch': fatalAt(
    'renderer-work', 'CUE_PROOF_EXECUTION_FAILED',
    sortedFiles(through('voice-013', 3), [FATAL_OBSERVATION_FILE]),
  ),
  'work-video-missing': fatalAt(
    'renderer-work', 'CUE_PROOF_EXECUTION_FAILED',
    sortedFiles(through('voice-013', 3), [FATAL_OBSERVATION_FILE]),
  ),
  'review-id-mismatch': fatalAt(
    'review-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(ALL_CASE_FILES, [FATAL_OBSERVATION_FILE]),
  ),
  'review-fade-mismatch': fatalAt(
    'review-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(ALL_CASE_FILES, [FATAL_OBSERVATION_FILE]),
  ),
  'review-build-failure': fatalAt(
    'review-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(ALL_CASE_FILES, [REVIEW_INPUT_FILE, FATAL_OBSERVATION_FILE]),
  ),
  'review-write-failure': fatalAt(
    'review-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(ALL_CASE_FILES, [FATAL_OBSERVATION_FILE]),
  ),
  'review-reread-failure': fatalAt(
    'review-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(ALL_CASE_FILES, [REVIEW_INPUT_FILE, FATAL_OBSERVATION_FILE]),
  ),
  'completion-write-failure': fatalAt(
    'completion-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(
      ALL_CASE_FILES, [REVIEW_INPUT_FILE, REVIEW_HTML_FILE, FATAL_OBSERVATION_FILE],
    ),
  ),
  'completion-reread-failure': fatalAt(
    'completion-publication', 'CUE_PROOF_PUBLICATION_FAILED',
    sortedFiles(COMPLETE_ROOT_FILES, [FATAL_OBSERVATION_FILE]),
  ),
  'failure-report-write-failure': expectation({
    status: 'fatal', stage: 'artifact-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
    output: absentRoot(), staging: presentRoot([]),
  }),
  'failure-report-reread-failure': expectation({
    status: 'fatal', stage: 'artifact-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
    output: absentRoot(), staging: presentRoot([REJECTION_REPORT_FILE]),
  }),
  'fade-throw': fatalAt(
    'renderer-work', 'CUE_PROOF_EXECUTION_FAILED',
    sortedFiles(ALL_CASE_FILES, [FATAL_OBSERVATION_FILE]),
  ),
  'publisher-helper-failure': expectation({
    status: 'fatal', stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
    output: absentRoot(), staging: presentRoot(COMPLETE_ROOT_FILES),
  }),
  'publisher-late-collision': expectation({
    status: 'fatal', stage: 'root-publication', primaryCode: 'CUE_PROOF_PUBLICATION_FAILED',
    output: presentRoot([COLLISION_MARKER_FILE]),
    staging: presentRoot(COMPLETE_ROOT_FILES),
  }),
});
const EXPECTED_NEGATIVE_LABELS = Object.freeze(Object.keys(F_NEGATIVE_EXPECTATIONS).sort());
const DOCUMENTS = Object.freeze([
  'presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md',
  'presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md',
  'presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md',
  'presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md',
  'presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md',
  'presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md',
  'presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md',
  'presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md',
  'presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md',
  'presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md',
  'presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md',
  'presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md',
  'presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md',
  'presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md',
  'presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md',
  'presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md',
  'presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md',
]);
const CONTRACT_BINDINGS = Object.freeze([
  ['caption-quality-atomic-publication-b6-owner-scope-revision-addendum', DOCUMENTS[4], '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', DOCUMENTS[6], 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['caption-quality-b6-credential-unavailable-owner-addendum', DOCUMENTS[5], '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['caption-quality-complete-implementation-design', DOCUMENTS[0], '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['caption-quality-complete-implementation-design-addendum', DOCUMENTS[2], 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['caption-quality-dependency-load-stage-observation-addendum', DOCUMENTS[14], '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['caption-quality-dependency-unit-observation-addendum', DOCUMENTS[13], '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['caption-quality-formal-capability-read-entry-addendum', DOCUMENTS[10], '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['caption-quality-fu-fixture-manufacturing-contract-design', DOCUMENTS[16], '8312ab82095dec1e0fd96fea00f6c5e61e04997ae0a9956799fe2b30be17b554'],
  ['caption-quality-parent-contract', 'presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['caption-quality-pre-staging-inner-observation-addendum', DOCUMENTS[12], '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['caption-quality-proof-capability-and-tsx-namespace-addendum', DOCUMENTS[9], 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['caption-quality-resolved-url-evaluation-addendum', DOCUMENTS[15], '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['caption-quality-runtime-live-binding-separation-addendum', DOCUMENTS[8], '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['caption-quality-selection-runtime-value-wiring-addendum', DOCUMENTS[3], '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['caption-quality-source-final-package-validator-addendum', DOCUMENTS[7], '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['caption-quality-tsx-wrapper-descriptor-addendum', DOCUMENTS[11], '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
].map(([role, name, fileSha256]) => Object.freeze({
  role,
  path: `evals/clip_composition/reports/presentation/${name}`,
  fileSha256,
})));
const RUNTIME_PROFILE = Object.freeze({
  node: Object.freeze({path: NODE, fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c'}),
  tsx: Object.freeze({path: '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs', fileSha256: '5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8'}),
  remotion: Object.freeze({path: '/Users/kawafmm/workspace/zev2/runner/node_modules/@remotion/cli/remotion-cli.js', fileSha256: 'a10a711f052487d302dcf52dc08729c84c4deca0dc41c5b708edd1a7b7b48bfa'}),
  browser: Object.freeze({path: '/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell', fileSha256: 'b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8'}),
  ffmpeg: Object.freeze({path: '/opt/homebrew/bin/ffmpeg', fileSha256: 'd105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798'}),
  ffprobe: Object.freeze({path: '/opt/homebrew/bin/ffprobe', fileSha256: 'dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9'}),
  imageMagick: Object.freeze({path: '/opt/homebrew/bin/magick', fileSha256: '78311032c39a3192ad4ed34ffdf6aab60e21b8e635005f9398095d73c9bd7a29'}),
});

const clone = value => structuredClone(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const exists = async absolute => {
  try { await stat(absolute); return true; } catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
};
const projectionDependencies = () => ({
  resolveStyle: resolvePresentationOutputStyleV001,
  validateResolvedStyle: validatePresentationOutputResolvedStyleV002,
  buildPhysicalPageGraph: buildPresentationOutputPhysicalPageGraphV001,
  mapPiecewiseTimeline: mapPresentationOutputPiecewiseTimelineV002,
  canonicalSha256MeaningJson: canonicalSha256PresentationAJsonV002,
  canonicalSha256FiniteJson: canonicalSha256PresentationOutputFiniteJsonV001,
  serializeFiniteJson: serializePresentationOutputCropApplicationFormalJsonV001,
  hashBytes: sha256PresentationCaptionB1BytesV001,
});
const rereadDependencies = () => ({
  readWorkspaceFileStable: readPresentationMeaningWorkspaceFileStableV001,
  validateMeaningPackageFormalBytes: validatePresentationAMeaningInformationPackageFormalBytesV002,
  canonicalSha256MeaningJson: canonicalSha256PresentationAJsonV002,
  hashMeaningBytes: sha256PresentationCaptionB1BytesV001,
  decodeFiniteJson: decodePresentationOutputFiniteJsonV001,
  serializeFiniteJson: serializePresentationOutputCropApplicationFormalJsonV001,
  canonicalSha256FiniteJson: canonicalSha256PresentationOutputFiniteJsonV001,
  hashFiniteBytes: sha256PresentationOutputCropApplicationBytesV001,
  hashStableMedia: hashAbsoluteStableStreaming,
  classifyFatalInnerCode: () => 'UNCLASSIFIED',
});
const formalPublisherLoader = async function formalPublisherLoader() {
  assert.equal(arguments.length, 0);
  return publishPresentationDirectoryAtomicallyNoReplaceV001;
};
const CAPABILITY_KEYS = Object.freeze([
  'ensurePathAbsent', 'createDirectory', 'readStableBytes', 'writeNoReplaceBytes',
  'copyNoReplaceBytes', 'verifyRuntimeBinding', 'rereadCaseInputs',
  'buildPageLinePlan', 'buildRenderPlan', 'buildCommonRenderPlan',
  'hashStableMedia', 'inspectBaseMedia', 'executeRendererAndQc', 'resolveStyle',
  'deriveObservedFadeFrameCount', 'validateReviewInput', 'decodeReviewInput',
  'buildReviewHtml', 'publishDirectory',
]);
const FORMAL_CAPABILITIES = readPresentationZevoCaptionQualityV002FormalCapabilitiesV001();
const testCapabilities = (replacementKey = null, replacement = null) => {
  assert.ok(replacementKey === null || CAPABILITY_KEYS.includes(replacementKey));
  assert.ok(replacementKey === null || typeof replacement === 'function');
  return Object.fromEntries(CAPABILITY_KEYS.map(key => [
    key,
    key === replacementKey ? replacement : FORMAL_CAPABILITIES[key],
  ]));
};
const treeManifest = async relativeRoot => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  const rows = [];
  const visit = async (absolute, relative) => {
    const entries = await readdir(absolute, {withFileTypes: true});
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const childAbsolute = path.join(absolute, entry.name);
      const childRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(childAbsolute, childRelative);
      else if (entry.isFile()) rows.push([childRelative, sha(await readFile(childAbsolute))]);
      else rows.push([childRelative, entry.isSymbolicLink() ? 'symbolic-link' : 'other']);
    }
  };
  await visit(absoluteRoot, '');
  return rows;
};
const readVariantJob = async label => {
  const row = fixture.negativeByLabel.get(label);
  assert.notEqual(row, undefined, `fixture negative row missing: ${label}`);
  assert.notEqual(label, 'malformed-byte-envelope');
  const job = clone(fixture.artifactValues[row.proofJobBinding.path]);
  assert.equal(typeof job.jobId, 'string');
  assert.equal(typeof job.outputRoot, 'string');
  assert.equal(await exists(path.join(ROOT, job.outputRoot)), false);
  assert.equal(await exists(path.join(ROOT, `${job.outputRoot}.staging`)), false);
  return {job, jobPath: row.proofJobBinding.path};
};
const runVariant = async ({label, replacementKey = null, replacement = null}) => {
  const created = await readVariantJob(label);
  const result = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: created.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities(replacementKey, replacement),
  });
  return {...created, result};
};
const fakeSuccessfulRenderer = ({ownerMode = 'valid', workMode = 'valid'} = {}) => async ({drawInput}) => {
  const outputDirectory = drawInput.outputDirectory;
  const ownerFile = path.join(outputDirectory, 'owner-v001.json');
  const workVideo = path.join(outputDirectory, 'video.mp4');
  const ownerToken = 'zcq-test-owner-token';
  await mkdir(outputDirectory, {recursive: true});
  if (ownerMode !== 'missing') {
    await writeFile(ownerFile, formalBytes({
      schemaVersion: 'presentation-render-output-lock-v002',
      ownerToken: ownerMode === 'mismatch' ? 'wrong-owner-token' : ownerToken,
      processId: process.pid,
      outputDirectory,
    }), {flag: 'wx', mode: 0o444});
    if (ownerMode === 'permission') await chmod(ownerFile, 0o000);
  }
  if (workMode !== 'missing') await writeFile(workVideo, Buffer.from('zcq-fake-video', 'utf8'), {flag: 'wx', mode: 0o444});
  return {
    exitCode: 0,
    finalQc: {schemaVersion: 'presentation-renderer-qc-v002', status: 'passed'},
    reservation: {
      ownerToken,
      ownerFile,
      outputDirectory,
      lockDirectory: `${outputDirectory}.lock`,
    },
    workDirectory: outputDirectory,
    workVideo,
  };
};
const filesUnder = async relativeRoot => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!(await exists(absoluteRoot))) return [];
  const files = [];
  const visit = async (absolute, relative) => {
    for (const entry of (await readdir(absolute, {withFileTypes: true}))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const childAbsolute = path.join(absolute, entry.name);
      const childRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(childAbsolute, childRelative);
      else files.push(childRelative);
    }
  };
  await visit(absoluteRoot, '');
  return files;
};
const preservedRootFor = async outputRoot => {
  if (await exists(path.join(ROOT, outputRoot))) return outputRoot;
  const staging = `${outputRoot}.staging`;
  if (await exists(path.join(ROOT, staging))) return staging;
  return null;
};
const observedNegativeLabels = new Set();
const expectationFor = label => {
  const expected = F_NEGATIVE_EXPECTATIONS[label];
  assert.notEqual(expected, undefined, `undeclared negative expectation: ${label}`);
  return expected;
};
const assertNegativeCli = (t, label, result) => {
  const expected = expectationFor(label).cli;
  assertCliWithInnerDiagnostic(
    t,
    {status: result.status, stage: result.stage, primaryCode: result.primaryCode},
    expected,
    result,
  );
};
const assertNegativePreservation = async (label, outputRoot) => {
  const expected = expectationFor(label);
  if (outputRoot === null) {
    assert.equal(expected.roots.output.state, 'not-applicable');
    assert.equal(expected.roots.staging.state, 'not-applicable');
    observedNegativeLabels.add(label);
    return Object.freeze({output: null, staging: null, primaryRoot: null});
  }
  const observed = {};
  for (const [kind, suffix] of [['output', ''], ['staging', '.staging']]) {
    const root = `${outputRoot}${suffix}`;
    const rootExists = await exists(path.join(ROOT, root));
    const manifest = expected.roots[kind];
    assert.notEqual(manifest.state, 'not-applicable', `${label}:${kind}`);
    assert.equal(rootExists, manifest.state === 'present', `${label}:${kind}:root-state`);
    if (!rootExists) {
      observed[kind] = null;
      continue;
    }
    const actualFiles = await filesUnder(root);
    assert.deepEqual(actualFiles, manifest.mustExist, `${label}:${kind}:exact-files`);
    for (const forbidden of manifest.mustNotExist) {
      assert.equal(actualFiles.includes(forbidden), false, `${label}:${kind}:${forbidden}`);
    }
    observed[kind] = root;
  }
  observedNegativeLabels.add(label);
  return Object.freeze({
    output: observed.output,
    staging: observed.staging,
    primaryRoot: observed.output ?? observed.staging,
  });
};
const runNegativeVariant = async input => {
  const variant = await runVariant(input);
  const preservation = await assertNegativePreservation(input.label, variant.job.outputRoot);
  return Object.freeze({...variant, preservation});
};
export const buildPresentationZevoCaptionQualityV002PreservationManifestPreflightV001 = ({
  sourceText,
}) => {
  const failures = [];
  const exactKeySet = (value, keys, label) => {
    if (JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) failures.push(label);
  };
  if (typeof sourceText !== 'string' || sourceText.length === 0) {
    failures.push('source-text');
  }
  for (const [label, row] of Object.entries(F_NEGATIVE_EXPECTATIONS)) {
    exactKeySet(row, ['cli', 'roots'], `${label}:row-keys`);
    exactKeySet(row.cli, ['status', 'stage', 'primaryCode'], `${label}:cli-keys`);
    exactKeySet(row.roots, ['output', 'staging'], `${label}:root-keys`);
    for (const [kind, root] of Object.entries(row.roots)) {
      exactKeySet(
        root, ['state', 'mustExist', 'mustNotExist'], `${label}:${kind}:manifest-keys`,
      );
      if (!['present', 'absent', 'not-applicable'].includes(root.state)) {
        failures.push(`${label}:${kind}:state`);
      }
      if (root.state !== 'present'
        && (root.mustExist.length !== 0 || root.mustNotExist.length !== 0)) {
        failures.push(`${label}:${kind}:non-present-files`);
      }
      if (root.state === 'present') {
        const sortedExist = [...new Set(root.mustExist)].sort((left, right) =>
          left.localeCompare(right));
        const sortedAbsent = [...new Set(root.mustNotExist)].sort((left, right) =>
          left.localeCompare(right));
        if (JSON.stringify(root.mustExist) !== JSON.stringify(sortedExist)) {
          failures.push(`${label}:${kind}:must-exist-order-or-duplicate`);
        }
        if (JSON.stringify(root.mustNotExist) !== JSON.stringify(sortedAbsent)) {
          failures.push(`${label}:${kind}:must-not-exist-order-or-duplicate`);
        }
        if (root.mustExist.some(file => root.mustNotExist.includes(file))) {
          failures.push(`${label}:${kind}:existence-conflict`);
        }
        const declaredUniverse = sortedFiles(root.mustExist, root.mustNotExist);
        if (JSON.stringify(declaredUniverse) !== JSON.stringify(PRESERVATION_FILE_UNIVERSE)) {
          failures.push(`${label}:${kind}:unclosed-file-universe`);
        }
      }
    }
  }
  const bodyStart = sourceText.indexOf("registerTest('ZCQ044 ");
  const bodyEnd = sourceText.lastIndexOf("\n});");
  if (bodyStart < 0 || bodyEnd < 0) failures.push('zcq044-source-region');
  const zcq044Source = bodyStart < 0 || bodyEnd < 0
    ? '' : sourceText.slice(bodyStart, bodyEnd);
  const usedLabels = [...zcq044Source.matchAll(
    /runNegativeVariant\(\{\s*label:\s*'([^']+)'/gu,
  )].map(match => match[1]);
  for (const match of zcq044Source.matchAll(/runOwnerFailure\('([^']+)'\)/gu)) {
    usedLabels.push(`owner-${match[1]}`);
  }
  for (const match of zcq044Source.matchAll(/runReviewFailure\(\s*'([^']+)'/gu)) {
    usedLabels.push(match[1]);
  }
  if (zcq044Source.includes("assertNegativePreservation('malformed-byte-envelope', null)")) {
    usedLabels.push('malformed-byte-envelope');
  }
  const uniqueUsedLabels = [...new Set(usedLabels)].sort();
  if (usedLabels.length !== uniqueUsedLabels.length) failures.push('duplicate-negative-use-label');
  if (JSON.stringify(uniqueUsedLabels) !== JSON.stringify(EXPECTED_NEGATIVE_LABELS)) {
    failures.push('negative-use-set-mismatch');
  }
  const manifestCanonicalBytes = Buffer.from(JSON.stringify(F_NEGATIVE_EXPECTATIONS), 'utf8');
  return Object.freeze({
    schemaVersion: 'presentation-zevo-caption-quality-v002-preservation-manifest-preflight-v001',
    status: failures.length === 0 ? 'passed' : 'failed',
    expectationCount: EXPECTED_NEGATIVE_LABELS.length,
    expectedLabels: EXPECTED_NEGATIVE_LABELS,
    usedLabels: Object.freeze(uniqueUsedLabels),
    preservationFileUniverse: PRESERVATION_FILE_UNIVERSE,
    manifestCanonicalSha256: sha(manifestCanonicalBytes),
    checks: Object.freeze({
      noExistenceConflict: failures.every(item => !item.endsWith(':existence-conflict')),
      allRootFileUniversesClosed: failures.every(item => !item.endsWith(':unclosed-file-universe')),
      noUndeclaredAggregateRoot: !failures.includes('negative-use-set-mismatch'),
      noDuplicateNegativeUse: !failures.includes('duplicate-negative-use-label'),
    }),
    failures: Object.freeze(failures),
  });
};
const readJsonIfPresent = async (relativeRoot, fileName) => {
  if (relativeRoot === null) return null;
  const absolute = path.join(ROOT, relativeRoot, fileName);
  if (!(await exists(absolute))) return null;
  return JSON.parse(await readFile(absolute, 'utf8'));
};
const expectedReportFor = (label, rootKind = 'output') => {
  const manifest = expectationFor(label).roots[rootKind];
  assert.equal(manifest.state, 'present', `${label}:${rootKind}:report-root-state`);
  const reportNames = manifest.mustExist.filter(file => [
    COMPLETION_REPORT_FILE, REJECTION_REPORT_FILE, FATAL_OBSERVATION_FILE,
  ].includes(path.basename(file)));
  assert.equal(reportNames.length, 1, `${label}:${rootKind}:report-count`);
  return path.basename(reportNames[0]);
};
const assertExclusiveReport = async (relativeRoot, label, rootKind = 'output') => {
  assert.notEqual(relativeRoot, null);
  const files = await filesUnder(relativeRoot);
  const reportNames = files.filter(file => [
    COMPLETION_REPORT_FILE, REJECTION_REPORT_FILE, FATAL_OBSERVATION_FILE,
  ].includes(path.basename(file)));
  assert.deepEqual(
    reportNames.map(file => path.basename(file)),
    [expectedReportFor(label, rootKind)],
  );
  return files;
};
const diagnosticsFor = (t, owner) => proofByOwner[owner].forEach(
  id => t.diagnostic(`proof-item:${id}:passed`),
);
const assertCliWithInnerDiagnostic = (t, actual, expected, diagnosticSource = actual) => {
  try {
    assert.deepEqual(actual, expected);
  } catch (error) {
    const observation = diagnosticSource?.innerObservation;
    const safeObservation = observation === null || observation === undefined ? null : {
      checkpoint: observation.checkpoint,
      operation: observation.operation,
      targetPath: observation.targetPath,
      osCode: observation.osCode,
      errorCodeIdentifier: observation.errorCodeIdentifier,
    };
    t.diagnostic(`inner-observation:${JSON.stringify(safeObservation)}`);
    throw error;
  }
};

const deriveProofImplementationRoles = (parent, atomic) => {
  const result = new Map();
  const add = (role, filePath) => {
    const prior = result.get(role);
    assert.ok(prior === undefined || prior === filePath, `duplicate role ${role}`);
    result.set(role, filePath);
  };
  for (const line of parent.split('\n')) {
    let match = line.match(/^\| proof \| implementation \| `([^`]+)` \| `([^`]+)` \|$/u);
    if (match) add(match[1], match[2]);
  }
  const closure = parent.slice(
    parent.indexOf('既存runtime static-import closure'),
    parent.indexOf('source/B6/selection/proofのruntime data'),
  );
  for (const line of closure.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length === 7 && cells[6] === '✓') {
      add(cells[0].replaceAll('`', ''), cells[1].replaceAll('`', ''));
    }
  }
  const additions = atomic.slice(atomic.indexOf('### 5.1 追加role'), atomic.indexOf('job別件数は次へ置換する'));
  for (const line of additions.split('\n')) {
    const match = line.match(/^\| `([^`]+)` \| `([^`]+)` \|/u);
    if (match) add(match[1], match[2]);
  }
  const rows = [...result].sort(([leftRole, leftPath], [rightRole, rightPath]) => (
    leftRole < rightRole ? -1 : leftRole > rightRole ? 1 : leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0
  ));
  assert.equal(rows.length, 51);
  return rows;
};

let documents;
let proofByOwner;
let implementationRoles;
let fixture;

registerBefore(async () => {
  documents = await Promise.all(DOCUMENTS.map(name => readFile(
    path.join(ROOT, 'evals/clip_composition/reports/presentation', name), 'utf8',
  )));
  for (const binding of CONTRACT_BINDINGS) {
    assert.equal(sha(await readFile(path.join(ROOT, binding.path))), binding.fileSha256);
  }
  const proofIds = deriveApprovedCaptionQualityProofIdsV015({
    parent: documents[0], v1: documents[1], v2: documents[2], v3: documents[3],
    v4: documents[4], v5: documents[5], v6: documents[6], v7: documents[7], v8: documents[8],
    v9: documents[9], v10: documents[10], v11: documents[11], v12: documents[12],
    v13: documents[13],
    v14: documents[14],
    v15: documents[15],
  });
  assert.equal(proofIds.length, 489);
  proofByOwner = Object.fromEntries(['ZCQ042', 'ZCQ043', 'ZCQ044'].map(owner => [
    owner, proofIds.filter(id => ownerForApprovedCaptionQualityProofIdV001(id) === owner),
  ]));
  assert.deepEqual(Object.fromEntries(Object.entries(proofByOwner).map(([owner, ids]) => [owner, ids.length])), {
    ZCQ042: 36, ZCQ043: 12, ZCQ044: 35,
  });
  implementationRoles = deriveProofImplementationRoles(documents[0], documents[4]);
  assert.deepEqual(Object.keys(process.env).filter(key => key === RECEIPT_ENV), [RECEIPT_ENV]);
  const admission = await admitPresentationZevoCaptionQualityV002FixtureV001({
    receiptPath: RECEIPT_PATH,
    expectedGateId: 'F',
  });
  assert.equal(admission.status, 'passed', admission.reason);
  assert.equal(admission.package.artifactBindings.length, 44);
  assert.equal(admission.package.negativeFixtures.length, 26);
  assert.equal(admission.environmentManifest.requirements.length, 600);
  assert.equal(admission.retentionManifest.rows.length, 26);
  const normal = admission.package.normalFixture;
  const artifactValues = admission.artifactValues;
  const moduleImportAuditBindings = admission.package.artifactBindings.filter(
    binding => path.basename(binding.path) === 'proof-module-import-audit.mjs',
  );
  assert.equal(moduleImportAuditBindings.length, 1);
  for (const row of admission.package.negativeFixtures.filter(
    item => item.selectionReportOverrideBinding !== null,
  )) {
    assert.deepEqual(
      artifactValues[row.proofJobBinding.path].selectionReportBinding,
      row.selectionReportOverrideBinding,
    );
  }
  fixture = {
    proofJob: clone(artifactValues[normal.proofJobBinding.path]),
    jobPath: normal.proofJobBinding.path,
    sourcePackage: clone(artifactValues[normal.sourcePackageBinding.path]),
    sourceBinding: clone(normal.sourcePackageBinding),
    selection: clone(artifactValues[normal.selectionBinding.path]),
    selectionReport: clone(artifactValues[normal.selectionReportBinding.path]),
    negativeByLabel: new Map(admission.package.negativeFixtures.map(row => [row.label, row])),
    moduleImportAuditPath: moduleImportAuditBindings[0].path,
    artifactValues,
  };
});

registerTest('ZCQ042 proof job・束縛・pure入口・module表面', async t => {
  const checked = validatePresentationZevoCaptionQualityV002ProofJobV001(fixture.proofJob);
  assert.equal(checked.status, 'passed');
  assert.equal(decodePresentationZevoCaptionQualityV002ProofJobV001(formalBytes(fixture.proofJob)).status, 'decoded');
  const changedCases = clone(fixture.proofJob);
  changedCases.cases.reverse();
  assert.deepEqual(
    validatePresentationZevoCaptionQualityV002ProofJobV001(changedCases).violations.map(item => item.code),
    ['CUE_PROOF_CASE_SET_MISMATCH'],
  );
  const changedRuntime = clone(fixture.proofJob);
  changedRuntime.runtimeProfile.tsx.path = LOADER;
  assert.equal(validatePresentationZevoCaptionQualityV002ProofJobV001(changedRuntime).status, 'rejected');
  const request = buildPresentationZevoCaptionQualityV002OutputRequestV001({
    proofJob: fixture.proofJob,
    caseContext: fixture.sourcePackage.reconstructionMap.caseContexts[0],
  });
  assert.equal(request.status, 'passed');
  assert.deepEqual(Object.keys(request.value.outputRequest), FORMAL_OUTPUT_REQUEST_KEYS);
  assert.equal(Object.hasOwn(request.value.outputRequest, 'meaningInformationPackage'), false);
  assert.equal(request.value.outputRequest.requestId, `${fixture.proofJob.jobId}-voice-013-horizontal-request`);
  const rendererBinding = fixture.proofJob.implementationBindings.find(item => item.role === 'dep-renderer-core-v002');
  const transition = {transitionId: 'quick-fade-4f-v001', entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}};
  assert.deepEqual(derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001({
    resolvedTransition: transition,
    rendererBinding,
  }), {status: 'passed', value: {observedFadeFrameCount: 4}});
  const badRenderer = {...rendererBinding, fileSha256: '0'.repeat(64)};
  assert.deepEqual(derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001({
    resolvedTransition: transition,
    rendererBinding: badRenderer,
  }), {status: 'rejected', reason: 'renderer-binding-mismatch'});
  assert.deepEqual(derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001({
    resolvedTransition: {...transition, entry: {...transition.entry, frames: 5}},
    rendererBinding,
  }), {status: 'rejected', reason: 'transition-mismatch'});

  assert.equal(readPresentationZevoCaptionQualityV002FormalCapabilitiesV001(), FORMAL_CAPABILITIES);
  assert.throws(() => readPresentationZevoCaptionQualityV002FormalCapabilitiesV001(null), TypeError);
  assert.equal(Object.isFrozen(FORMAL_CAPABILITIES), true);
  assert.deepEqual(Object.keys(FORMAL_CAPABILITIES), CAPABILITY_KEYS);
  assert.ok(CAPABILITY_KEYS.every(key => Object.isFrozen(FORMAL_CAPABILITIES[key])));
  const originalEnsurePathAbsent = FORMAL_CAPABILITIES.ensurePathAbsent;
  assert.throws(() => { FORMAL_CAPABILITIES.ensurePathAbsent = () => true; }, TypeError);
  assert.throws(() => { FORMAL_CAPABILITIES.extra = () => true; }, TypeError);
  assert.throws(() => { delete FORMAL_CAPABILITIES.ensurePathAbsent; }, TypeError);
  assert.equal(FORMAL_CAPABILITIES.ensurePathAbsent, originalEnsurePathAbsent);
  const plain = testCapabilities('ensurePathAbsent', async () => false);
  assert.notEqual(plain, FORMAL_CAPABILITIES);
  assert.equal(plain.ensurePathAbsent === FORMAL_CAPABILITIES.ensurePathAbsent, false);
  assert.ok(CAPABILITY_KEYS.filter(key => key !== 'ensurePathAbsent').every(
    key => plain[key] === FORMAL_CAPABILITIES[key],
  ));
  const invalidEntry = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: {...testCapabilities(), extra: () => true},
  });
  assert.deepEqual(invalidEntry, {
    schemaVersion: 'presentation-zevo-caption-local-cli-result-v001',
    status: 'rejected',
    action: 'proof-run',
    jobId: null,
    attemptId: null,
    outputRoot: null,
    stage: 'job-read',
    primaryCode: 'CUE_PROOF_JOB_INVALID',
    innerObservation: {
      checkpoint: 'entry-validation',
      operation: 'validate-entry',
      targetPath: null,
      osCode: null,
      errorCodeIdentifier: null,
    },
  });
  assert.equal(Object.isFrozen(invalidEntry), true);
  assert.equal(Object.isFrozen(invalidEntry.innerObservation), true);

  const stagingFailure = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities('createDirectory', async () => {
      throw Object.assign(new Error(), {code: 'ENOENT'});
    }),
  });
  assertCliWithInnerDiagnostic(t, stagingFailure, {
    schemaVersion: 'presentation-zevo-caption-local-cli-result-v001',
    status: 'fatal',
    action: 'proof-run',
    jobId: fixture.proofJob.jobId,
    attemptId: fixture.proofJob.attemptId,
    outputRoot: fixture.proofJob.outputRoot,
    stage: 'input-reread',
    primaryCode: 'CUE_PROOF_EXECUTION_FAILED',
    innerObservation: {
      checkpoint: 'staging-root-acquisition',
      operation: 'create-staging-root',
      targetPath: `${fixture.proofJob.outputRoot}.staging`,
      osCode: 'ENOENT',
      errorCodeIdentifier: 'ENOENT',
    },
  });
  assert.equal(Object.isFrozen(stagingFailure), true);
  assert.equal(Object.isFrozen(stagingFailure.innerObservation), true);
  assert.equal(await exists(path.join(ROOT, fixture.proofJob.outputRoot)), false);
  assert.equal(await exists(path.join(ROOT, `${fixture.proofJob.outputRoot}.staging`)), false);

  const moduleCodeFailure = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities('createDirectory', async () => {
      throw Object.assign(new Error(), {code: 'ERR_MODULE_NOT_FOUND'});
    }),
  });
  assert.equal(moduleCodeFailure.innerObservation.osCode, null);
  assert.equal(moduleCodeFailure.innerObservation.errorCodeIdentifier, 'ERR_MODULE_NOT_FOUND');

  const unrecognizedCodeFailure = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities('createDirectory', async () => {
      throw Object.assign(new Error(), {code: 'not-safe'});
    }),
  });
  assert.equal(unrecognizedCodeFailure.innerObservation.osCode, null);
  assert.equal(unrecognizedCodeFailure.innerObservation.errorCodeIdentifier, null);

  const source = await readFile(path.join(ROOT, MODULE_PATH), 'utf8');
  const documentedDependencyRows = [...documents[13].matchAll(
    /^\| (\d+) \| `([^`]+)` \| `([^`]+)` \|$/gmu,
  )].map(match => ({ordinal: Number(match[1]), key: match[2], targetPath: match[3]}));
  const implementedDependencyRows = [...source.matchAll(
    /^  Object\.freeze\(\{key: '([^']+)', targetPath: '([^']+)', specifier: '([^']+)', load: resolvedUrl => import\(resolvedUrl\)\}\),$/gmu,
  )].map((match, index) => ({
    ordinal: index + 1,
    key: match[1],
    targetPath: match[2],
    specifier: match[3],
  }));
  assert.equal(documentedDependencyRows.length, 19);
  assert.deepEqual(implementedDependencyRows.map(({ordinal, key, targetPath}) => (
    {ordinal, key, targetPath}
  )), documentedDependencyRows);
  assert.equal(new Set(implementedDependencyRows.map(row => row.key)).size, 19);
  assert.equal(new Set(implementedDependencyRows.map(row => row.targetPath)).size, 19);
  assert.ok(implementedDependencyRows.every(row => (
    row.specifier === `./${row.targetPath.slice('evals/clip_composition/'.length)}`
  )));
  assert.match(source, /checkpoint: 'dependency-resolve', operation: 'resolve-dependency'/u);
  assert.match(source, /checkpoint: 'dependency-evaluate', operation: 'evaluate-dependency'/u);
  assert.match(source, /checkpoint: 'dependency-namespace-verify', operation: 'verify-dependency-namespace'/u);
  assert.match(source, /checkpoint: 'dependency-store', operation: 'store-dependency'/u);
  assert.match(source, /const resolvedUrl = new URL\(dependency\.specifier, import\.meta\.url\);/u);
  assert.match(source, /const resolvedAbsolutePath = fileURLToPath\(resolvedUrl\);/u);
  assert.match(source, /!resolvedAbsolutePath\.startsWith\(`\$\{WORKSPACE_ROOT\}\$\{path\.sep\}`\)/u);
  assert.match(source, /resolvedPath !== dependency\.targetPath/u);
  assert.match(source, /const namespace = await dependency\.load\(resolvedUrl\.href\);/u);
  assert.match(source, /bindingReads\.length !== 69/u);
  assert.equal((source.match(/load: resolvedUrl => import\(resolvedUrl\)/gu) ?? []).length, 19);
  assert.equal((source.match(/load: \(\) => import\('\.\//gu) ?? []).length, 0);
  assert.match(source, /dependencies\[dependency\.key\] = namespace;/u);
  assert.match(source, /const dependencies = await dynamicDependencies\(observation => \{\n      activePreStagingObservation = preStagingObservation\(observation\);\n    \}\);/u);
  assert.match(source, /export function readPresentationZevoCaptionQualityV002FormalCapabilitiesV001\(\)[\s\S]*return FORMAL_PROOF_CAPABILITIES_V001;/u);
  assert.match(source, /capabilities: FORMAL_PROOF_CAPABILITIES_V001,/u);
  assert.equal((source.match(/capabilities: FORMAL_PROOF_CAPABILITIES_V001,/gu) ?? []).length, 1);

  const importAuditPath = path.join(ROOT, fixture.moduleImportAuditPath);
  const imported = spawnSync(NODE, [
    '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs',
    importAuditPath,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')),
  });
  assert.equal(imported.status, 0);
  assert.equal(imported.stderr, '');
  const authoredExports = [
    'buildPresentationZevoCaptionQualityV002OutputRequestV001',
    'decodePresentationZevoCaptionQualityV002ProofJobV001',
    'derivePresentationZevoCaptionQualityV002ExecutionPathsV001',
    'derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001',
    'executePresentationZevoCaptionQualityV002ProofJobV001',
    'readPresentationZevoCaptionQualityV002FormalCapabilitiesV001',
    'validatePresentationZevoCaptionQualityV002ProofJobV001',
  ];
  assert.deepEqual(JSON.parse(imported.stdout), {
    namespaceKeys: ['default', ...authoredExports].sort(),
    wrapperKeys: authoredExports,
    ownPropertyNames: ['__esModule', ...authoredExports].sort(),
    namedDescriptors: authoredExports.map(name => ({
      name,
      get: 'function',
      set: 'undefined',
      enumerable: true,
      configurable: false,
      hasValue: false,
      hasWritable: false,
      sameReference: true,
    })),
    esModuleDescriptor: {
      get: 'undefined',
      set: 'undefined',
      enumerable: false,
      configurable: false,
      writable: false,
      value: true,
    },
    symbolCount: 0,
  });
  diagnosticsFor(t, 'ZCQ042');
});

registerTest('ZCQ043 合成selectionから実renderer・QCまでの正常経路', {timeout: 600_000}, async t => {
  const result = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities(),
  });
  assertCliWithInnerDiagnostic(t, result, {
    schemaVersion: 'presentation-zevo-caption-local-cli-result-v001',
    status: 'passed',
    action: 'proof-run',
    jobId: fixture.proofJob.jobId,
    attemptId: fixture.proofJob.attemptId,
    outputRoot: fixture.proofJob.outputRoot,
    stage: 'completed',
    primaryCode: null,
    innerObservation: null,
  });
  const completion = JSON.parse(await readFile(
    path.join(ROOT, fixture.proofJob.outputRoot, 'completion-report-v001.json'),
    'utf8',
  ));
  assert.equal(completion.status, 'passed');
  assert.equal(Object.hasOwn(completion, 'innerObservation'), false);
  assert.equal(completion.reportId, `${fixture.proofJob.jobId}-completion-report-v001`);
  assert.deepEqual(completion.items.map(item => item.caseId), CASE_ROWS.map(item => item.caseId));
  assert.ok(completion.items.every(item => item.rendererWorkEvidence.retentionStatus === 'retained'));
  for (const item of completion.items) {
    const videoBytes = await readFile(path.join(ROOT, item.videoBinding.path));
    assert.equal(sha(videoBytes), item.videoBinding.fileSha256);
    const qc = JSON.parse(await readFile(path.join(ROOT, item.qcBinding.path), 'utf8'));
    assert.equal(qc.status, 'passed');
  }
  const review = JSON.parse(await readFile(path.join(ROOT, completion.reviewInputBinding.path), 'utf8'));
  assert.equal(review.observedFadeFrameCount, 4);
  assert.equal(review.items.length, 3);
  diagnosticsFor(t, 'ZCQ043');
});

registerTest('ZCQ044 失敗境界・公開排他・証拠保持', {timeout: 3_600_000}, async t => {
  const oldTreeBefore = await treeManifest(OLD_ROOT);
  observedNegativeLabels.clear();
  const remember = async variant => variant.preservation.primaryRoot;
  const expectCli = (label, result) => assertNegativeCli(t, label, result);

  // Strict byte envelope fails before a job value or an output root exists.
  const malformedRow = fixture.negativeByLabel.get('malformed-byte-envelope');
  assert.notEqual(malformedRow, undefined);
  const malformedPath = malformedRow.proofJobBinding.path;
  const malformed = await executePresentationZevoCaptionQualityV002ProofJobV001({
    jobPath: malformedPath,
    atomicDirectoryPublisherLoader: formalPublisherLoader,
    capabilities: testCapabilities(),
  });
  expectCli('malformed-byte-envelope', malformed);
  assert.equal(malformed.outputRoot, null);
  await assertNegativePreservation('malformed-byte-envelope', null);

  // Root reservation is supplied by the declared capability, without filesystem races.
  const absentCalls = [];
  const rootCollision = await runNegativeVariant({
    label: 'root-reservation-collision',
    replacementKey: 'ensurePathAbsent',
    replacement: async input => {
      absentCalls.push(input.absolutePath);
      return false;
    },
  });
  expectCli('root-reservation-collision', rootCollision.result);
  assert.equal(absentCalls.length, 1);
  assert.equal(await preservedRootFor(rootCollision.job.outputRoot), null);

  const plannerRejected = await runNegativeVariant({
    label: 'planner-rejected-first-case',
    replacementKey: 'buildPageLinePlan',
    replacement: async input => input.caseId === 'voice-013'
      ? {status: 'rejected', primaryCode: 'CUE_PLANNER_INPUT_INVALID', violations: []}
      : FORMAL_CAPABILITIES.buildPageLinePlan(input),
  });
  expectCli('planner-rejected-first-case', plannerRejected.result);
  const plannerRoot = await remember(plannerRejected);
  await assertExclusiveReport(plannerRoot, 'planner-rejected-first-case');
  const plannerReport = await readJsonIfPresent(plannerRoot, 'rejection-report-v001.json');
  assert.equal(plannerReport.reportId, `${plannerRejected.job.jobId}-rejection-report-v001`);
  assert.equal(Object.hasOwn(plannerReport, 'innerObservation'), false);

  const renderRejected = await runNegativeVariant({
    label: 'render-rejected-first-case',
    replacementKey: 'buildRenderPlan',
    replacement: async input => input.outputRequest.requestId.includes('-voice-013-')
      ? {status: 'rejected', primaryCode: 'CUE_RENDER_INPUT_INVALID', violations: []}
      : FORMAL_CAPABILITIES.buildRenderPlan(input),
  });
  expectCli('render-rejected-first-case', renderRejected.result);
  const renderRejectedRoot = await remember(renderRejected);
  await assertExclusiveReport(renderRejectedRoot, 'render-rejected-first-case');

  const rendererRejected = await runNegativeVariant({
    label: 'renderer-rejected-first-case',
    replacementKey: 'executeRendererAndQc',
    replacement: async ({drawInput}) => ({
      exitCode: 1,
      finalQc: null,
      failure: {
        stage: 'overlay-render',
        cleanupWarnings: [
          {path: `${drawInput.outputDirectory}.lock`},
          {path: `${drawInput.outputDirectory}.staging`},
        ],
      },
    }),
  });
  expectCli('renderer-rejected-first-case', rendererRejected.result);
  const rendererRejectedRoot = await remember(rendererRejected);
  await assertExclusiveReport(rendererRejectedRoot, 'renderer-rejected-first-case');
  const rendererRejectedReport = await readJsonIfPresent(rendererRejectedRoot, 'rejection-report-v001.json');
  assert.equal(rendererRejectedReport.rendererWorkEvidence.length, 0);
  assert.equal(rendererRejectedReport.retentionPaths.length, 2);

  // A later case fails only after the first case has completed through the real renderer.
  const laterRendererRejected = await runNegativeVariant({
    label: 'renderer-rejected-second-case',
    replacementKey: 'executeRendererAndQc',
    replacement: async input => input.drawInput.outputDirectory.includes('/voice-067/')
      ? {exitCode: 1, finalQc: null, failure: {stage: 'overlay-render', cleanupWarnings: []}}
      : FORMAL_CAPABILITIES.executeRendererAndQc(input),
  });
  expectCli('renderer-rejected-second-case', laterRendererRejected.result);
  const laterRendererRoot = await remember(laterRendererRejected);
  const laterRendererReport = await readJsonIfPresent(laterRendererRoot, 'rejection-report-v001.json');
  assert.deepEqual(laterRendererReport.rendererWorkEvidence.map(item => item.caseId), ['voice-013']);

  const outputRequestReadCalls = [];
  const outputRequestMismatch = await runNegativeVariant({
    label: 'output-request-reread-mismatch',
    replacementKey: 'readStableBytes',
    replacement: async input => {
      outputRequestReadCalls.push(input.absolutePath);
      if (input.absolutePath.endsWith('/output-request-v001.json')) return Buffer.from('{}\n', 'utf8');
      return FORMAL_CAPABILITIES.readStableBytes(input);
    },
  });
  expectCli('output-request-reread-mismatch', outputRequestMismatch.result);
  const outputRequestRoot = await remember(outputRequestMismatch);
  await assertExclusiveReport(outputRequestRoot, 'output-request-reread-mismatch');
  assert.ok(outputRequestReadCalls.some(file => file.endsWith('/selection-report-v001.json')));
  assert.ok(outputRequestReadCalls.some(file => file.endsWith('/output-request-v001.json')));
  assert.equal(await exists(path.join(
    ROOT,
    `evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-renderer-work/.${outputRequestMismatch.job.jobId}-${outputRequestMismatch.job.attemptId}`,
  )), false);

  const outputRequestReadFailure = await runNegativeVariant({
    label: 'output-request-reread-io-failure',
    replacementKey: 'readStableBytes',
    replacement: async input => {
      if (input.absolutePath.endsWith('/output-request-v001.json')) throw Object.assign(new Error(), {code: 'EIO'});
      return FORMAL_CAPABILITIES.readStableBytes(input);
    },
  });
  expectCli('output-request-reread-io-failure', outputRequestReadFailure.result);
  await remember(outputRequestReadFailure);

  const renderPlanWriteFailure = await runNegativeVariant({
    label: 'render-plan-write-failure',
    replacementKey: 'writeNoReplaceBytes',
    replacement: async input => {
      if (input.absolutePath.endsWith('/render-plan-v003.json')) throw Object.assign(new Error(), {code: 'EIO'});
      return FORMAL_CAPABILITIES.writeNoReplaceBytes(input);
    },
  });
  expectCli('render-plan-write-failure', renderPlanWriteFailure.result);
  await remember(renderPlanWriteFailure);

  const renderPlanMismatch = await runNegativeVariant({
    label: 'render-plan-reread-mismatch',
    replacementKey: 'readStableBytes',
    replacement: async input => input.absolutePath.endsWith('/render-plan-v003.json')
      ? Buffer.from('{}\n', 'utf8') : FORMAL_CAPABILITIES.readStableBytes(input),
  });
  expectCli('render-plan-reread-mismatch', renderPlanMismatch.result);
  const renderPlanRoot = await remember(renderPlanMismatch);
  await assertExclusiveReport(renderPlanRoot, 'render-plan-reread-mismatch');

  const runOwnerFailure = async ownerMode => {
    const ownerFailure = await runNegativeVariant({
      label: `owner-${ownerMode}`,
      replacementKey: 'executeRendererAndQc',
      replacement: fakeSuccessfulRenderer({ownerMode}),
    });
    expectCli(`owner-${ownerMode}`, ownerFailure.result);
    const ownerRoot = await remember(ownerFailure);
    await assertExclusiveReport(ownerRoot, `owner-${ownerMode}`);
    const observation = await readJsonIfPresent(ownerRoot, 'fatal-observation-v001.json');
    assert.equal(observation.stage, 'renderer-work');
  };
  await runOwnerFailure('missing');
  await runOwnerFailure('permission');
  await runOwnerFailure('mismatch');
  const workVideoMissing = await runNegativeVariant({
    label: 'work-video-missing',
    replacementKey: 'executeRendererAndQc',
    replacement: fakeSuccessfulRenderer({workMode: 'missing'}),
  });
  expectCli('work-video-missing', workVideoMissing.result);
  await remember(workVideoMissing);

  // Review predicates are failed by modifying plain review data and then calling the same validator.
  const runReviewFailure = async (label, change) => {
    const variant = await runNegativeVariant({
      label,
      replacementKey: 'validateReviewInput',
      replacement: async input => {
        const reviewInput = clone(input.reviewInput);
        change(reviewInput);
        const result = await FORMAL_CAPABILITIES.validateReviewInput({...input, reviewInput});
        assert.equal(result.status, 'rejected');
        return result;
      },
    });
    expectCli(label, variant.result);
    const root = await remember(variant);
    await assertExclusiveReport(root, label);
  };
  await runReviewFailure('review-id-mismatch', value => { value.reviewId = ''; });
  await runReviewFailure(
    'review-fade-mismatch', value => { value.observedFadeFrameCount = 0; },
  );

  const reviewBuildFailure = await runNegativeVariant({
    label: 'review-build-failure',
    replacementKey: 'buildReviewHtml',
    replacement: async () => ({status: 'rejected', violations: []}),
  });
  expectCli('review-build-failure', reviewBuildFailure.result);
  await remember(reviewBuildFailure);

  const reviewWriteFailure = await runNegativeVariant({
    label: 'review-write-failure',
    replacementKey: 'writeNoReplaceBytes',
    replacement: async input => {
      if (input.absolutePath.endsWith('/review/review-input-v001.json')) throw Object.assign(new Error(), {code: 'EIO'});
      return FORMAL_CAPABILITIES.writeNoReplaceBytes(input);
    },
  });
  expectCli('review-write-failure', reviewWriteFailure.result);
  await remember(reviewWriteFailure);

  const reviewRereadFailure = await runNegativeVariant({
    label: 'review-reread-failure',
    replacementKey: 'readStableBytes',
    replacement: async input => input.absolutePath.endsWith('/review/review-input-v001.json')
      ? Buffer.from('{}\n', 'utf8') : FORMAL_CAPABILITIES.readStableBytes(input),
  });
  expectCli('review-reread-failure', reviewRereadFailure.result);
  await remember(reviewRereadFailure);

  const completionWriteCalls = [];
  const completionWriteFailure = await runNegativeVariant({
    label: 'completion-write-failure',
    replacementKey: 'writeNoReplaceBytes',
    replacement: async input => {
      completionWriteCalls.push(input.absolutePath);
      if (input.absolutePath.endsWith('/completion-report-v001.json')) throw Object.assign(new Error(), {code: 'EIO'});
      return FORMAL_CAPABILITIES.writeNoReplaceBytes(input);
    },
  });
  expectCli('completion-write-failure', completionWriteFailure.result);
  assert.equal(completionWriteCalls.filter(file => file.endsWith('/output-request-v001.json')).length, 3);
  const completionWriteRoot = await remember(completionWriteFailure);
  await assertExclusiveReport(completionWriteRoot, 'completion-write-failure');

  const completionRereadFailure = await runNegativeVariant({
    label: 'completion-reread-failure',
    replacementKey: 'readStableBytes',
    replacement: async input => input.absolutePath.endsWith('/completion-report-v001.json')
      ? Buffer.from('{}\n', 'utf8') : FORMAL_CAPABILITIES.readStableBytes(input),
  });
  expectCli('completion-reread-failure', completionRereadFailure.result);
  await remember(completionRereadFailure);

  const failureWrite = await runNegativeVariant({
    label: 'failure-report-write-failure',
    replacementKey: 'writeNoReplaceBytes',
    replacement: async input => {
      if (input.absolutePath.endsWith('/rejection-report-v001.json')) throw Object.assign(new Error(), {code: 'EIO'});
      return FORMAL_CAPABILITIES.writeNoReplaceBytes(input);
    },
  });
  expectCli('failure-report-write-failure', failureWrite.result);
  await remember(failureWrite);

  const failureReread = await runNegativeVariant({
    label: 'failure-report-reread-failure',
    replacementKey: 'readStableBytes',
    replacement: async input => input.absolutePath.endsWith('/rejection-report-v001.json')
      ? Buffer.from('{}\n', 'utf8') : FORMAL_CAPABILITIES.readStableBytes(input),
  });
  expectCli('failure-report-reread-failure', failureReread.result);
  await remember(failureReread);

  const fadeThrow = await runNegativeVariant({
    label: 'fade-throw',
    replacementKey: 'deriveObservedFadeFrameCount',
    replacement: () => { throw Object.assign(new Error(), {innerCode: 'UNCLASSIFIED'}); },
  });
  expectCli('fade-throw', fadeThrow.result);
  const fadeRoot = await remember(fadeThrow);
  const fadeObservation = await readJsonIfPresent(fadeRoot, 'fatal-observation-v001.json');
  assert.equal(fadeObservation.stage, 'renderer-work');
  assert.equal(Object.hasOwn(fadeObservation, 'innerObservation'), false);

  const helperSentinel = 'zcq-helper-private-diagnostic';
  const helperFailure = await runNegativeVariant({
    label: 'publisher-helper-failure',
    replacementKey: 'publishDirectory',
    replacement: async input => ({
      ...(await FORMAL_CAPABILITIES.publishDirectory({
        ...input,
        stagingRoot: `${input.stagingRoot}-missing`,
      })),
      diagnostic: helperSentinel,
    }),
  });
  expectCli('publisher-helper-failure', helperFailure.result);
  const helperRoot = await remember(helperFailure);
  assert.equal(helperRoot, `${helperFailure.job.outputRoot}.staging`);
  const helperBytes = Buffer.concat(await Promise.all(
    (await filesUnder(helperRoot))
      .filter(file => /\.(?:html|json|txt)$/u.test(file))
      .map(file => readFile(path.join(ROOT, helperRoot, file))),
  ));
  assert.equal(helperBytes.includes(Buffer.from(helperSentinel, 'utf8')), false);

  const lateCollision = await runNegativeVariant({
    label: 'publisher-late-collision',
    replacementKey: 'publishDirectory',
    replacement: async input => {
      await mkdir(path.join(ROOT, input.outputRoot), {recursive: false});
      await writeFile(path.join(ROOT, input.outputRoot, 'collision-marker.txt'), 'preserve\n', {flag: 'wx', mode: 0o444});
      return FORMAL_CAPABILITIES.publishDirectory(input);
    },
  });
  expectCli('publisher-late-collision', lateCollision.result);
  assert.equal(await readFile(path.join(ROOT, lateCollision.job.outputRoot, 'collision-marker.txt'), 'utf8'), 'preserve\n');

  assert.deepEqual([...observedNegativeLabels].sort(), EXPECTED_NEGATIVE_LABELS);
  assert.deepEqual(await treeManifest(OLD_ROOT), oldTreeBefore);
  diagnosticsFor(t, 'ZCQ044');
});

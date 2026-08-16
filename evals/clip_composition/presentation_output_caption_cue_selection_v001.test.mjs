import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test, {after, before} from 'node:test';

import {
  admitPresentationOutputCaptionCueSelectionV001,
  buildPresentationOutputCaptionCueProjectionSetV001,
  buildPresentationOutputCaptionCueSourceClosureV001,
  decodePresentationOutputCaptionCueSelectionJobV001,
  executePresentationOutputCaptionCueSelectionJobV001,
  finalizePresentationOutputCaptionCueSelectionReportV001,
  rereadPresentationOutputCaptionCueCaseInputsV001,
  validatePresentationOutputCaptionCueSelectionJobV001,
} from './presentation_output_caption_cue_selection_v001.mjs';
import {
  deriveApprovedCaptionQualityProofIdsV015,
  ownerForApprovedCaptionQualityProofIdV001,
} from './presentation_output_caption_cue_source_package_v001.test.mjs';
import {
  publishPresentationDirectoryAtomicallyNoReplaceV001,
} from './presentation_atomic_directory_publish_v001.mjs';
import {
  readPresentationMeaningWorkspaceFileStableV001,
  hashAbsoluteStableStreaming,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  validatePresentationAMeaningInformationPackageFormalBytesV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {canonicalSha256PresentationAJsonV002} from './presentation_a_source_sequence_v002.mjs';
import {
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  decodePresentationOutputFiniteJsonV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
  canonicalSha256PresentationOutputFiniteJsonV001,
  sha256PresentationOutputCropApplicationBytesV001,
} from './presentation_output_crop_application_v001.mjs';
import {classifyPresentationFatalInnerCodeV002} from './presentation_fatal_observation_v002.mjs';
import {buildPresentationOutputPhysicalPageGraphV001} from './presentation_output_page_line_planner_v001.mjs';
import {validatePresentationOutputResolvedStyleV002} from './presentation_output_page_line_planner_v002.mjs';
import {mapPresentationOutputPiecewiseTimelineV002} from './presentation_output_piecewise_timeline_v002.mjs';

const ROOT = process.cwd();
const NODE = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const TSX = '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs';
const TEST_ROOT = 'evals/clip_composition/outputs/presentation/test-fixtures/zevo-caption-quality-v002-selection-v001';
const JOB_ROOT = 'evals/clip_composition/jobs/presentation/output-caption-cue-selection-jobs';
const OUTPUT_PARENT = 'evals/clip_composition/outputs/presentation/output-caption-cue-selections';
const MEANING_PATH = 'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json';
const BASE_MEDIA_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/horizontal-formal/output-request-v001.json';
const STYLE_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/output-request.json';
const NORMAL_GROUPING_PATH = 'evals/clip_composition/reports/presentation/test-fixtures/presentation-zevo-caption-quality-v002-l-normal-cue-grouping-v001.json';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const TASK_DESCRIPTION = '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const fixtureLogicalWidth = value => Array.from(value).reduce(
  (total, character) => total + (character.codePointAt(0) <= 0xff ? 1 : 2),
  0,
);
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const canonicalBytes = value => Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
const formalBinding = (schemaVersion, relativePath, bytes, value) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: SHA(bytes),
  canonicalSha256: SHA(canonicalBytes(value)),
});
const roleBinding = async ([role, relativePath]) => ({
  role, path: relativePath, fileSha256: SHA(await readFile(path.join(ROOT, relativePath))),
});

const CONTRACTS = Object.freeze([
  ['caption-quality-atomic-publication-b6-owner-scope-revision-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['caption-quality-b6-credential-unavailable-owner-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['caption-quality-complete-implementation-design', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['caption-quality-complete-implementation-design-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['caption-quality-dependency-load-stage-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['caption-quality-dependency-unit-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['caption-quality-formal-capability-read-entry-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['caption-quality-parent-contract', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['caption-quality-pre-staging-inner-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['caption-quality-proof-capability-and-tsx-namespace-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['caption-quality-resolved-url-evaluation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['caption-quality-runtime-live-binding-separation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['caption-quality-selection-runtime-value-wiring-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['caption-quality-source-final-package-validator-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['caption-quality-tsx-wrapper-descriptor-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
]);
const ROLE_PATHS = Object.freeze([
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

let fixture;
let proofByOwner;
let resolveStyle;
const diagnosticsFor = (t, owner) => proofByOwner[owner].forEach(
  id => t.diagnostic(`proof-item:${id}:passed`),
);
const dependencies = () => ({
  rereadDependencies: {
    readWorkspaceFileStable: readPresentationMeaningWorkspaceFileStableV001,
    validateMeaningPackageFormalBytes: validatePresentationAMeaningInformationPackageFormalBytesV002,
    canonicalSha256MeaningJson: canonicalSha256PresentationAJsonV002,
    hashMeaningBytes: sha256PresentationCaptionB1BytesV001,
    decodeFiniteJson: decodePresentationOutputFiniteJsonV001,
    serializeFiniteJson: serializePresentationOutputCropApplicationFormalJsonV001,
    canonicalSha256FiniteJson: canonicalSha256PresentationOutputFiniteJsonV001,
    hashFiniteBytes: sha256PresentationOutputCropApplicationBytesV001,
    hashStableMedia: hashAbsoluteStableStreaming,
    classifyFatalInnerCode: classifyPresentationFatalInnerCodeV002,
  },
  verifiedDependencies: {
    resolveStyle,
    validateResolvedStyle: validatePresentationOutputResolvedStyleV002,
    buildPhysicalPageGraph: buildPresentationOutputPhysicalPageGraphV001,
    mapPiecewiseTimeline: mapPresentationOutputPiecewiseTimelineV002,
    hashRawResponseBytes: sha256PresentationCaptionB1BytesV001,
    canonicalSha256MeaningJson: canonicalSha256PresentationAJsonV002,
    canonicalSha256FiniteJson: canonicalSha256PresentationOutputFiniteJsonV001,
    serializeFiniteJson: serializePresentationOutputCropApplicationFormalJsonV001,
    classifyFatalInnerCode: classifyPresentationFatalInnerCodeV002,
  },
});

before(async () => {
  const [styleNamespace, parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15] = await Promise.all([
    import('./presentation_output_style_resolver_v001.ts'),
    readFile(path.join(ROOT, CONTRACTS[3][1]), 'utf8'),
    readFile(path.join(ROOT, 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md'), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[4][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[13][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[0][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[2][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[1][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[14][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[12][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[10][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[7][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[15][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[9][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[6][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[5][1]), 'utf8'),
    readFile(path.join(ROOT, CONTRACTS[11][1]), 'utf8'),
  ]);
  resolveStyle = styleNamespace.resolvePresentationOutputStyleV001;
  assert.equal(typeof resolveStyle, 'function');
  const proofIds = deriveApprovedCaptionQualityProofIdsV015({parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15});
  assert.equal(proofIds.length, 489);
  proofByOwner = Object.fromEntries(Array.from({length: 10}, (_, offset) => {
    const owner = `ZCQ${String(18 + offset).padStart(3, '0')}`;
    return [owner, proofIds.filter(id => ownerForApprovedCaptionQualityProofIdV001(id) === owner)];
  }));
  assert.deepEqual(Object.fromEntries(Object.entries(proofByOwner).map(([key, value]) => [key, value.length])), {
    ZCQ018: 30, ZCQ019: 10, ZCQ020: 2, ZCQ021: 5, ZCQ022: 3,
    ZCQ023: 2, ZCQ024: 14, ZCQ025: 2, ZCQ026: 19, ZCQ027: 34,
  });

  await rm(path.join(ROOT, TEST_ROOT), {recursive: true, force: true});
  await mkdir(path.join(ROOT, TEST_ROOT), {recursive: true});
  await mkdir(path.join(ROOT, JOB_ROOT), {recursive: true});
  await mkdir(path.join(ROOT, OUTPUT_PARENT), {recursive: true});
  const [meaningBytes, groupingBytes] = await Promise.all([
    readFile(path.join(ROOT, MEANING_PATH)),
    readFile(path.join(ROOT, NORMAL_GROUPING_PATH)),
  ]);
  const meaning = JSON.parse(meaningBytes);
  const normalGrouping = JSON.parse(groupingBytes);
  const referenceRenderPlanBytes = await readFile(
    path.join(ROOT, normalGrouping.source.referenceRenderPlan.path),
  );
  const referenceRenderPlan = JSON.parse(referenceRenderPlanBytes);
  const meaningBinding = formalBinding(meaning.schemaVersion, MEANING_PATH, meaningBytes, meaning);
  const baseMediaRequest = JSON.parse(await readFile(path.join(ROOT, BASE_MEDIA_REQUEST_PATH), 'utf8'));
  const styleRequest = JSON.parse(await readFile(path.join(ROOT, STYLE_REQUEST_PATH), 'utf8'));
  const request = {...baseMediaRequest, styleInput: clone(styleRequest.styleInput)};
  const baseMediaBytes = await readFile(path.join(ROOT, 'package.json'));
  const baseMediaInput = clone(request.baseMediaInput);
  const artifacts = {};
  for (const role of ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex', 'rendererTrust']) {
    artifacts[role] = JSON.parse(await readFile(path.join(ROOT, request.styleInput.presetBinding[role].path), 'utf8'));
  }
  const styleResult = await resolveStyle({
    styleInput: request.styleInput,
    artifacts,
    baseMediaInput,
    baseMediaInspection: null,
  });
  assert.equal(styleResult.status, 'resolved');
  const semanticCaption = meaning.captions[0];
  const atoms = semanticCaption.atomOccurrenceIds.map(id => meaning.atomOccurrences.find(atom => atom.atomOccurrenceId === id));
  assert.ok(atoms.every(Boolean));
  assert.equal(normalGrouping.schemaVersion, 'presentation-zevo-caption-quality-v002-l-normal-cue-grouping-v001');
  assert.equal(normalGrouping.source.meaningPackage.path, MEANING_PATH);
  assert.equal(normalGrouping.source.meaningPackage.fileSha256, SHA(meaningBytes));
  assert.equal(normalGrouping.source.baseMediaTimeline.path, baseMediaInput.timeline.path);
  assert.equal(normalGrouping.source.baseMediaTimeline.fileSha256, baseMediaInput.timeline.fileSha256);
  assert.equal(normalGrouping.source.semanticCaptionId, semanticCaption.captionId);
  assert.equal(normalGrouping.source.atomCount, atoms.length);
  assert.equal(normalGrouping.source.referenceRenderPlan.fileSha256, SHA(referenceRenderPlanBytes));
  const referenceCaption = referenceRenderPlan.captionDisplays.find(
    caption => caption.semanticCaptionId === semanticCaption.captionId,
  );
  assert.ok(referenceCaption !== undefined);
  assert.equal(referenceCaption.pages.length, normalGrouping.cues.length);
  for (const [index, cue] of normalGrouping.cues.entries()) {
    const referencePage = referenceCaption.pages[index];
    assert.equal(
      referencePage.atomOccurrenceIds.at(-1),
      semanticCaption.atomOccurrenceIds[cue.cueEndAtomOrdinal - 1],
    );
    assert.deepEqual(
      cue.lineEndAtomOrdinals.map(atomOrdinal => semanticCaption.atomOccurrenceIds[atomOrdinal - 1]),
      referencePage.lines.map(line => line.atomOccurrenceIds.at(-1)),
    );
  }
  const boundaries = atoms.map((atom, index) => ({
    boundaryId: `display-boundary-000001-${String(index + 1).padStart(6, '0')}`,
    text: atom.text,
  }));
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    packageId: 'zcq-selection-fixture-source-package',
    promptInput: {
      schemaVersion: 'presentation-zevo-caption-selection-input-v001',
      taskDescription: TASK_DESCRIPTION,
      captions: [{captionId: 'input-caption-000001', boundaryCandidates: boundaries}],
      styleLimits: {maxLogicalWidthPerLine: 36, maxLinesPerCue: 2, characterWidthRule: WIDTH_RULE},
    },
    reconstructionMap: {
      meaningPackageBindings: [meaningBinding],
      captions: [{
        captionId: 'input-caption-000001',
        meaningPackageOrdinal: 1,
        semanticCaptionId: semanticCaption.captionId,
        atomOccurrenceIds: clone(semanticCaption.atomOccurrenceIds),
        boundaries: boundaries.map((boundary, index) => ({
          boundaryId: boundary.boundaryId,
          ordinal: index + 1,
          afterAtomOccurrenceId: semanticCaption.atomOccurrenceIds[index],
        })),
      }],
      caseContexts: [{
        caseId: 'zcq-selection-case-001',
        inputCaptionId: 'input-caption-000001',
        meaningPackageBinding: meaningBinding,
        baseMediaInput,
        horizontalStyleInput: clone(request.styleInput),
        styleBindings: Object.fromEntries(
          ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex', 'rendererTrust']
            .map(role => [role, clone(request.styleInput.presetBinding[role])]),
        ),
        resolvedStyle: clone(styleResult.resolvedStyle),
      }],
    },
    provenance: {
      sourcePackageJobBinding: {
        schemaVersion: 'presentation-output-caption-cue-source-package-job-v001',
        path: 'evals/clip_composition/jobs/presentation/output-caption-cue-source-jobs/zcq-selection-fixture-source-job.json',
        fileSha256: '1'.repeat(64), canonicalSha256: '2'.repeat(64),
      },
      implementationBindings: [{role: 'fixture-source', path: 'package.json', fileSha256: SHA(baseMediaBytes)}],
      approvedContractBindings: [{role: CONTRACTS[8][0], path: CONTRACTS[8][1], fileSha256: CONTRACTS[8][2]}],
    },
  };
  const sourcePath = `${TEST_ROOT}/source-package-v001.json`;
  const sourceBytes = formalBytes(sourcePackage);
  await writeFile(path.join(ROOT, sourcePath), sourceBytes, {flag: 'wx'});
  const sourceBinding = formalBinding(sourcePackage.schemaVersion, sourcePath, sourceBytes, sourcePackage);
  const response = {
    status: 'complete',
    captions: [{
      captionId: 'input-caption-000001',
      cues: normalGrouping.cues.map((cue, index) => {
        assert.equal(cue.cueOrdinal, index + 1);
        assert.ok(Number.isSafeInteger(cue.cueEndAtomOrdinal));
        assert.ok(cue.cueEndAtomOrdinal >= 1 && cue.cueEndAtomOrdinal <= boundaries.length);
        assert.ok(Array.isArray(cue.lineEndAtomOrdinals) && cue.lineEndAtomOrdinals.length >= 1);
        assert.equal(cue.lineEndAtomOrdinals.at(-1), cue.cueEndAtomOrdinal);
        return {
          cueEndBoundaryId: boundaries[cue.cueEndAtomOrdinal - 1].boundaryId,
          lineEndBoundaryIds: cue.lineEndAtomOrdinals.map(
            atomOrdinal => boundaries[atomOrdinal - 1].boundaryId,
          ),
        };
      }),
    }],
  };
  const rawBytes = Buffer.from('{"fixture":"provider-raw"}\n', 'utf8');
  const rawPath = `${TEST_ROOT}/provider-response.raw.json`;
  await writeFile(path.join(ROOT, rawPath), rawBytes, {flag: 'wx'});
  const rawBinding = {path: rawPath, fileSha256: SHA(rawBytes)};
  const providerEnvelope = {
    schemaVersion: 'presentation-output-caption-cue-provider-response-envelope-v001',
    envelopeId: 'zcq-selection-b6-job-provider-response-envelope',
    httpStatus: 200,
    contentType: 'application/json; charset=UTF-8',
    rawResponseBinding: rawBinding,
    responseModelVersion: 'fixture-model',
    observedServiceTier: 'standard',
    usageMetadata: {promptTokenCount: 1, candidatesTokenCount: 1, thoughtsTokenCount: 0, totalTokenCount: 2},
    semanticText: JSON.stringify(response),
  };
  const envelopePath = `${TEST_ROOT}/provider-response-envelope.json`;
  const envelopeBytes = formalBytes(providerEnvelope);
  await writeFile(path.join(ROOT, envelopePath), envelopeBytes, {flag: 'wx'});
  const envelopeBinding = formalBinding(providerEnvelope.schemaVersion, envelopePath, envelopeBytes, providerEnvelope);
  const b6Manifest = {
    schemaVersion: 'presentation-output-caption-cue-b6-manifest-v001',
    manifestId: 'zcq-selection-b6-job-b6-manifest',
    status: 'passed-transport',
    executedAt: '2026-08-11T00:00:00.000Z',
    b6JobBinding: {schemaVersion: 'presentation-output-caption-cue-b6-job-v001', path: `${TEST_ROOT}/b6-job.json`, fileSha256: '3'.repeat(64), canonicalSha256: '4'.repeat(64)},
    b5ManifestBinding: {schemaVersion: 'presentation-output-caption-cue-b5-manifest-v001', path: `${TEST_ROOT}/b5-manifest.json`, fileSha256: '5'.repeat(64), canonicalSha256: '6'.repeat(64)},
    generateRequestBinding: {path: `${TEST_ROOT}/request.json`, fileSha256: '7'.repeat(64)},
    rawResponseBinding: rawBinding,
    providerEnvelopeBinding: envelopeBinding,
    transport: {endpoint: 'fixture', method: 'POST', authorizationHeader: '<redacted>', clientTimeoutMilliseconds: 600000, generateContentCalls: 1, automaticRetries: 0},
    usageListPriceEstimate: {currency: 'USD', scope: 'generate-content-standard-list-price-only', promptCostNanoUsd: 1, outputCostNanoUsd: 1, totalCostNanoUsd: 2, withinApprovedLimit: true, exceededPreSendEstimate: false, billingObservation: 'provider-usage-observed-standard-list-price'},
    checks: {requestByte: 'passed', endpoint: 'passed', rawFirst: 'passed', httpEnvelope: 'passed', responseCandidateCount: 'passed', candidateContent: 'passed', model: 'passed', tier: 'passed', usage: 'passed', cost: 'passed', secretAbsence: 'passed'},
    primaryRejectionCode: null,
    implementationBindings: [{role: 'fixture-b6', path: 'package.json', fileSha256: SHA(baseMediaBytes)}],
  };
  const manifestPath = `${TEST_ROOT}/b6-manifest.json`;
  const manifestBytes = formalBytes(b6Manifest);
  await writeFile(path.join(ROOT, manifestPath), manifestBytes, {flag: 'wx'});
  const manifestBinding = formalBinding(b6Manifest.schemaVersion, manifestPath, manifestBytes, b6Manifest);
  const implementationBindings = await Promise.all(ROLE_PATHS.map(roleBinding));
  const runtimeRegistry = 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json';
  const runtimeDataBindings = [await roleBinding(['renderer-core-speaker-registry', runtimeRegistry])];
  const jobId = 'zcq-selection-formal-job';
  const attemptId = 'attempt-0001';
  const job = {
    schemaVersion: 'presentation-output-caption-cue-selection-job-v001',
    jobId,
    attemptId,
    sourcePackageBinding: sourceBinding,
    b6ManifestBinding: manifestBinding,
    providerEnvelopeBinding: envelopeBinding,
    outputRoot: `${OUTPUT_PARENT}/${jobId}-${attemptId}`,
    runtimeProfile: {
      node: {path: NODE, fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c'},
      tsx: {path: TSX, fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f'},
    },
    implementationBindings,
    runtimeDataBindings,
    approvedContractBindings: CONTRACTS.map(([role, relativePath, fileSha256]) => ({role, path: relativePath, fileSha256})),
  };
  const jobPath = `${JOB_ROOT}/${jobId}.json`;
  const jobBytes = formalBytes(job);
  await writeFile(path.join(ROOT, jobPath), jobBytes, {flag: 'wx'});
  fixture = {
    sourcePackage, sourceBinding, b6Manifest, manifestBinding, providerEnvelope,
    envelopeBinding, rawBytes, rawBinding, response, job, jobPath, jobBytes,
    selectionJobBinding: formalBinding(job.schemaVersion, jobPath, jobBytes, job),
    outputRoot: path.join(ROOT, job.outputRoot),
  };
});

after(async () => {
  if (fixture !== undefined) {
    await rm(path.join(ROOT, fixture.jobPath), {force: true});
    await rm(fixture.outputRoot, {recursive: true, force: true});
    await rm(`${fixture.outputRoot}.staging`, {recursive: true, force: true});
  }
  await rm(path.join(ROOT, TEST_ROOT), {recursive: true, force: true});
});

const admissionInput = (overrides = {}) => ({
  job: fixture.job,
  selectionJobBinding: fixture.selectionJobBinding,
  sourcePackage: fixture.sourcePackage,
  b6Manifest: fixture.b6Manifest,
  providerEnvelope: fixture.providerEnvelope,
  rawResponseBytes: fixture.rawBytes,
  rawResponseBinding: fixture.rawBinding,
  workspaceRoot: ROOT,
  ...dependencies(),
  ...overrides,
});

test('ZCQ018 job, binding, live implementation, and formal selection execution', async t => {
  assert.equal(validatePresentationOutputCaptionCueSelectionJobV001(fixture.job).status, 'passed');
  assert.equal(decodePresentationOutputCaptionCueSelectionJobV001(fixture.jobBytes).status, 'decoded');
  assert.equal(fixture.job.implementationBindings.length, 41);
  assert.equal(fixture.job.approvedContractBindings.length, 16);
  const badManifest = clone(fixture.b6Manifest);
  badManifest.providerEnvelopeBinding.fileSha256 = '0'.repeat(64);
  const rejected = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({b6Manifest: badManifest}));
  assert.equal(rejected.primaryCode, 'CUE_SELECTION_INPUT_BINDING_MISMATCH');
  const result = await executePresentationOutputCaptionCueSelectionJobV001({
    jobPath: fixture.jobPath,
    atomicDirectoryPublisherLoader: async function loader() {
      assert.equal(arguments.length, 0);
      return publishPresentationDirectoryAtomicallyNoReplaceV001;
    },
  });
  assert.deepEqual([result.status, result.stage, result.primaryCode], ['passed', 'completed', null]);
  diagnosticsFor(t, 'ZCQ018');
  t.diagnostic('code-owner:CUE_SELECTION_JOB_INVALID:passed');
  t.diagnostic('code-owner:CUE_SELECTION_INPUT_BINDING_MISMATCH:passed');
});

test('ZCQ019 strict provider response envelope rejects normalization and extra keys', async t => {
  for (const semanticText of [' {"status":"abstained"}', '```json\n{"status":"abstained"}\n```', '{"status":"abstained","extra":1}']) {
    const envelope = {...fixture.providerEnvelope, semanticText};
    const result = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({providerEnvelope: envelope}));
    assert.equal(result.primaryCode, 'CUE_PROVIDER_RESPONSE_INVALID');
  }
  diagnosticsFor(t, 'ZCQ019');
  t.diagnostic('code-owner:CUE_PROVIDER_RESPONSE_INVALID:passed');
});

test('ZCQ020 abstained response publishes no selection value', async t => {
  const providerEnvelope = {...fixture.providerEnvelope, semanticText: '{"status":"abstained"}'};
  const result = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({providerEnvelope}));
  assert.equal(result.status, 'abstained');
  assert.equal(result.value.reportCore.status, 'abstained');
  diagnosticsFor(t, 'ZCQ020');
  t.diagnostic('code-owner:CUE_PROVIDER_ABSTAINED:passed');
});

test('ZCQ021 caption set is exact and ordered', async t => {
  const response = clone(fixture.response);
  response.captions[0].captionId = 'different-caption';
  const result = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(response)},
  }));
  assert.equal(result.primaryCode, 'CUE_CAPTION_SET_MISMATCH');
  diagnosticsFor(t, 'ZCQ021');
  t.diagnostic('code-owner:CUE_CAPTION_SET_MISMATCH:passed');
});

test('ZCQ022 boundary IDs are caption-local and enumerated', async t => {
  const response = clone(fixture.response);
  response.captions[0].cues[0].cueEndBoundaryId = 'unknown-boundary';
  const result = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(response)},
  }));
  assert.equal(result.primaryCode, 'CUE_BOUNDARY_ID_INVALID');
  diagnosticsFor(t, 'ZCQ022');
  t.diagnostic('code-owner:CUE_BOUNDARY_ID_INVALID:passed');
});

test('ZCQ023 cue and line endings are strictly increasing and complete', async t => {
  const response = clone(fixture.response);
  response.captions[0].cues[1].cueEndBoundaryId = response.captions[0].cues[0].cueEndBoundaryId;
  const cueOrder = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(response)},
  }));
  assert.equal(cueOrder.primaryCode, 'CUE_ORDER_INVALID');
  const lineResponse = clone(fixture.response);
  lineResponse.captions[0].cues[0].lineEndBoundaryIds = [lineResponse.captions[0].cues[1].cueEndBoundaryId];
  const lineOrder = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(lineResponse)},
  }));
  assert.equal(lineOrder.primaryCode, 'CUE_LINE_END_INVALID');
  diagnosticsFor(t, 'ZCQ023');
  t.diagnostic('code-owner:CUE_ORDER_INVALID:passed');
  t.diagnostic('code-owner:CUE_LINE_END_INVALID:passed');
});

test('ZCQ024 atom, text, retained-span, and source closure is total', async t => {
  const caseInputResult = await rereadPresentationOutputCaptionCueCaseInputsV001({
    workspaceRoot: ROOT,
    sourcePackage: fixture.sourcePackage,
    rereadDependencies: dependencies().rereadDependencies,
  });
  assert.equal(caseInputResult.status, 'passed');
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: 'fixture-selection',
    sourcePackageBinding: fixture.sourceBinding,
    b6ManifestBinding: fixture.manifestBinding,
    providerEnvelopeBinding: fixture.envelopeBinding,
    response: fixture.response,
  };
  const closure = buildPresentationOutputCaptionCueSourceClosureV001({
    sourcePackage: fixture.sourcePackage,
    selection,
    validatedMeaningCases: caseInputResult.validatedMeaningCases,
  });
  assert.equal(closure.status, 'passed');
  assert.deepEqual(Object.keys(closure.cases[0]), ['caseId', 'inputCaptionId', 'cueRanges']);
  assert.equal(closure.cases[0].caseId, fixture.sourcePackage.reconstructionMap.caseContexts[0].caseId);
  assert.equal(closure.cases[0].inputCaptionId, fixture.sourcePackage.promptInput.captions[0].captionId);
  assert.equal(
    closure.cases[0].cueRanges.flatMap(cueRange => cueRange.atomOccurrenceIds).length,
    caseInputResult.validatedMeaningCases[0].records.length,
  );
  const missingTail = clone(selection);
  missingTail.response.captions[0].cues.pop();
  const missingRejected = buildPresentationOutputCaptionCueSourceClosureV001({
    sourcePackage: fixture.sourcePackage,
    selection: missingTail,
    validatedMeaningCases: caseInputResult.validatedMeaningCases,
  });
  assert.equal(missingRejected.status, 'rejected');
  assert.equal(missingRejected.failedProjectionClass, 'source-closure');
  const wrongTextSource = clone(fixture.sourcePackage);
  wrongTextSource.promptInput.captions[0].boundaryCandidates[0].text += 'x';
  const textRejected = buildPresentationOutputCaptionCueSourceClosureV001({
    sourcePackage: wrongTextSource,
    selection,
    validatedMeaningCases: caseInputResult.validatedMeaningCases,
  });
  assert.equal(textRejected.status, 'rejected');
  assert.equal(textRejected.failedProjectionClass, 'source-closure');
  const verified = dependencies().verifiedDependencies;
  const reconstructionRejected = await buildPresentationOutputCaptionCueProjectionSetV001({
    sourcePackage: fixture.sourcePackage,
    selection,
    caseInputResult,
    sourceClosureResult: closure,
    projectionDependencies: {
      resolveStyle: verified.resolveStyle,
      validateResolvedStyle: verified.validateResolvedStyle,
      buildPhysicalPageGraph: verified.buildPhysicalPageGraph,
      mapPiecewiseTimeline: verified.mapPiecewiseTimeline,
      canonicalSha256MeaningJson: verified.canonicalSha256MeaningJson,
      canonicalSha256FiniteJson: verified.canonicalSha256FiniteJson,
      serializeFiniteJson: verified.serializeFiniteJson,
      hashBytes: () => ({status: 'invalid'}),
    },
  });
  assert.equal(reconstructionRejected.status, 'rejected');
  assert.equal(reconstructionRejected.failedProjectionClass, 'reconstruction-invalid');
  diagnosticsFor(t, 'ZCQ024');
  t.diagnostic('code-owner:CUE_ATOM_COVERAGE_INVALID:passed');
});

test('ZCQ025 only overlong cues may use a second line', async t => {
  const result = await admitPresentationOutputCaptionCueSelectionV001(admissionInput());
  assert.equal(result.status, 'passed');
  const shortTwoLines = clone(fixture.response);
  const boundaries = fixture.sourcePackage.promptInput.captions[0].boundaryCandidates;
  assert.ok(fixtureLogicalWidth(`${boundaries[0].text}${boundaries[1].text}`) <= 36);
  shortTwoLines.captions[0].cues = [{
    cueEndBoundaryId: boundaries[1].boundaryId,
    lineEndBoundaryIds: [boundaries[0].boundaryId, boundaries[1].boundaryId],
  }, ...boundaries.slice(2).map(boundary => ({
    cueEndBoundaryId: boundary.boundaryId,
    lineEndBoundaryIds: [boundary.boundaryId],
  }))];
  const shortInvalid = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(shortTwoLines)},
  }));
  assert.equal(shortInvalid.primaryCode, 'CUE_LINE_WIDTH_INVALID');
  let overlongEnd = 0;
  let overlongText = boundaries[0].text;
  while (fixtureLogicalWidth(overlongText) <= 36 && overlongEnd + 1 < boundaries.length) {
    overlongEnd += 1;
    overlongText += boundaries[overlongEnd].text;
  }
  assert.ok(fixtureLogicalWidth(overlongText) > 36);
  const overlongOneLine = clone(fixture.response);
  overlongOneLine.captions[0].cues = [{
    cueEndBoundaryId: boundaries[overlongEnd].boundaryId,
    lineEndBoundaryIds: [boundaries[overlongEnd].boundaryId],
  }, ...boundaries.slice(overlongEnd + 1).map(boundary => ({
    cueEndBoundaryId: boundary.boundaryId,
    lineEndBoundaryIds: [boundary.boundaryId],
  }))];
  const overlongInvalid = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    providerEnvelope: {...fixture.providerEnvelope, semanticText: JSON.stringify(overlongOneLine)},
  }));
  assert.equal(overlongInvalid.primaryCode, 'CUE_LINE_WIDTH_INVALID');
  const exact36End = boundaries.findIndex((_, index) => fixtureLogicalWidth(
    boundaries.slice(0, index + 1).map(boundary => boundary.text).join(''),
  ) === 36);
  assert.ok(exact36End >= 0);
  const width35Source = clone(fixture.sourcePackage);
  width35Source.promptInput.styleLimits.maxLogicalWidthPerLine = 35;
  width35Source.reconstructionMap.caseContexts[0]
    .horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine = 35;
  width35Source.reconstructionMap.caseContexts[0]
    .resolvedStyle.maxLogicalWidthPerLine = 35;
  const width35SourceBinding = formalBinding(
    width35Source.schemaVersion,
    'evals/clip_composition/outputs/presentation/test-fixtures/zcq-selection-width35-source-package.json',
    formalBytes(width35Source),
    width35Source,
  );
  const width35Job = clone(fixture.job);
  width35Job.sourcePackageBinding = width35SourceBinding;
  const width35JobBinding = formalBinding(
    width35Job.schemaVersion,
    fixture.jobPath,
    formalBytes(width35Job),
    width35Job,
  );
  const exact36OneLine = clone(fixture.response);
  exact36OneLine.captions[0].cues = [{
    cueEndBoundaryId: boundaries[exact36End].boundaryId,
    lineEndBoundaryIds: [boundaries[exact36End].boundaryId],
  }, ...boundaries.slice(exact36End + 1).map(boundary => ({
    cueEndBoundaryId: boundary.boundaryId,
    lineEndBoundaryIds: [boundary.boundaryId],
  }))];
  const exact36Invalid = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    job: width35Job,
    selectionJobBinding: width35JobBinding,
    sourcePackage: width35Source,
    providerEnvelope: {
      ...fixture.providerEnvelope,
      semanticText: JSON.stringify(exact36OneLine),
    },
  }));
  assert.equal(exact36Invalid.primaryCode, 'CUE_LINE_WIDTH_INVALID');
  diagnosticsFor(t, 'ZCQ025');
  t.diagnostic('code-owner:CUE_LINE_WIDTH_INVALID:passed');
});

test('ZCQ026 physical and timeline projections use the shared production calculations', async t => {
  const admitted = await admitPresentationOutputCaptionCueSelectionV001(admissionInput());
  assert.equal(admitted.status, 'passed');
  assert.equal(admitted.value.reportCore.checks.physicalLayout, 'passed');
  assert.equal(admitted.value.reportCore.checks.timelineMapping, 'passed');
  assert.equal(admitted.value.reportCore.captionProjection.length, 1);
  const physicalFailure = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    verifiedDependencies: {
      ...dependencies().verifiedDependencies,
      buildPhysicalPageGraph: async () => [],
    },
  }));
  assert.equal(physicalFailure.primaryCode, 'CUE_PHYSICAL_LAYOUT_INVALID');
  const timelineFailure = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    verifiedDependencies: {
      ...dependencies().verifiedDependencies,
      mapPiecewiseTimeline: () => ({status: 'invalid'}),
    },
  }));
  assert.equal(timelineFailure.primaryCode, 'CUE_TIMELINE_MAPPING_INVALID');
  diagnosticsFor(t, 'ZCQ026');
  t.diagnostic('code-owner:CUE_PHYSICAL_LAYOUT_INVALID:passed');
  t.diagnostic('code-owner:CUE_TIMELINE_MAPPING_INVALID:passed');
});

test('ZCQ027 fatal stages and publication finalization remain structurally separate', async t => {
  const fatalDependencies = dependencies().rereadDependencies;
  const failure = await admitPresentationOutputCaptionCueSelectionV001(admissionInput({
    rereadDependencies: {
      ...fatalDependencies,
      readWorkspaceFileStable: async () => {
        const error = new Error('hidden');
        error.code = 'EACCES';
        throw error;
      },
    },
  })).then(() => null, error => error);
  assert.equal(failure.status, 'fatal');
  assert.equal(failure.reportCore.fatalObservation.stage, 'case-context-reread');
  const finalized = finalizePresentationOutputCaptionCueSelectionReportV001({
    reportCore: (await admitPresentationOutputCaptionCueSelectionV001(admissionInput())).value.reportCore,
    selectionBinding: null,
    selectionPublicationFailure: {
      schemaVersion: 'presentation-output-caption-cue-selection-fatal-observation-v001',
      status: 'fatal', stage: 'selection-publication', innerCode: 'PUBLICATION_FAILED',
      targetFile: null, toolExitCode: null,
      checkpoints: [{stage: 'selection-publication', event: 'entered', inputCaptionId: null, targetFile: null, toolExitCode: null}],
    },
  });
  assert.equal(finalized.status, 'fatal');
  assert.equal(finalized.selectionBinding, null);
  assert.equal(finalized.violations.length, 0);
  diagnosticsFor(t, 'ZCQ027');
  t.diagnostic('code-owner:CUE_SELECTION_EXECUTION_FAILED:passed');
  t.diagnostic('code-owner:CUE_SELECTION_PUBLICATION_FAILED:passed');
});

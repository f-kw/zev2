import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test, {before} from 'node:test';

import * as plannerModule from './presentation_output_page_line_planner_v003.mjs';
const {
  buildPresentationOutputPageLinePlanV003,
  decodePresentationOutputPageLinePlanV003,
  validatePresentationOutputPageLinePlanV003,
} = plannerModule;
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

const ROOT = process.cwd();
const MEANING_PATH = 'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json';
const BASE_MEDIA_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/horizontal-formal/output-request-v001.json';
const STYLE_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/output-request.json';
const GROUPING_PATH = 'evals/clip_composition/reports/presentation/test-fixtures/presentation-zevo-caption-quality-v002-l-normal-cue-grouping-v001.json';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const TASK_DESCRIPTION = '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const canonicalBytes = value => Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
const formalBinding = (schemaVersion, relativePath, value) => {
  const bytes = formalBytes(value);
  return {
    schemaVersion,
    path: relativePath,
    fileSha256: SHA(bytes),
    canonicalSha256: SHA(canonicalBytes(value)),
  };
};

const DOCS = Object.freeze([
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
]);

const OLD_PLAN_FIXTURES = Object.freeze([
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/horizontal-formal/render-plan-v002.json', '86d8769415b00c5a9379164fdaa209e07b78a0179745382d67612cb1a19cbd5e'],
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/vertical-caption-diagnostic/render-plan-v002.json', '5ebed5a6bb21e29af5c347e17af619737e2b06db55fd4d82336c8ad43cce1ca5'],
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/horizontal-formal/render-plan-v002.json', '4c82f3ecd81153befcc4ce470322a4fdbe6a777441fb0ff89f03a2d9c256c0e3'],
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/vertical-caption-diagnostic/render-plan-v002.json', '476fe41ad5b0e659641819f78e49f7b992044f37cf2f9bb56b6973decad1ff92'],
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/horizontal-formal/render-plan-v002.json', '613f2862bc6ed7a331a37dad0c03b94fbf0d17b8a1d04958790d9f80d3b72e01'],
  ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/vertical-caption-diagnostic/render-plan-v002.json', 'f153fc409cbb07a9514a80c0f27c6c7f165495ffd23c6eda68ed0b49b139d317'],
]);
const OLD_PLAN_ROOT = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008';

let fixture;
let proofByOwner;
let resolveStyle;
let approvedPlannerExports;

const FIXED_NODE = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const deriveExactExports = (documentText, pathLabel) => documentText
  .split('\n')
  .filter(line => line.startsWith(`| ${pathLabel} |`))
  .flatMap(line => [...line.matchAll(/`([A-Za-z][A-Za-z0-9]*)\(/gu)].map(match => match[1]))
  .sort();
const observeDirectImport = (modulePath, loaderReadPaths) => {
  const script = `const imported = await import(${JSON.stringify(modulePath)}); process.stdout.write(JSON.stringify(Object.keys(imported).sort()) + '\\n');`;
  const result = spawnSync(FIXED_NODE, [
    '--no-warnings',
    '--experimental-permission',
    ...loaderReadPaths.flatMap(readPath => [`--allow-fs-read=${readPath}`]),
    '--input-type=module',
    '--eval',
    script,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')),
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const observed = JSON.parse(result.stdout);
  assert.equal(result.stdout, `${JSON.stringify(observed)}\n`);
  return observed;
};

const diagnosticsFor = (t, owner) => proofByOwner[owner].forEach(
  id => t.diagnostic(`proof-item:${id}:passed`),
);

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

const projectionDependencies = () => ({
  resolveStyle,
  validateResolvedStyle: validatePresentationOutputResolvedStyleV002,
  buildPhysicalPageGraph: buildPresentationOutputPhysicalPageGraphV001,
  mapPiecewiseTimeline: mapPresentationOutputPiecewiseTimelineV002,
  canonicalSha256MeaningJson: canonicalSha256PresentationAJsonV002,
  canonicalSha256FiniteJson: canonicalSha256PresentationOutputFiniteJsonV001,
  serializeFiniteJson: serializePresentationOutputCropApplicationFormalJsonV001,
  hashBytes: sha256PresentationCaptionB1BytesV001,
});

const makeSelectionArtifacts = async response => {
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: 'zcq-planner-selection',
    sourcePackageBinding: fixture.sourceBinding,
    b6ManifestBinding: fixture.b6ManifestBinding,
    providerEnvelopeBinding: fixture.providerEnvelopeBinding,
    response: clone(response),
  };
  const closure = buildPresentationOutputCaptionCueSourceClosureV001({
    sourcePackage: fixture.sourcePackage,
    selection,
    validatedMeaningCases: fixture.caseInputResult.validatedMeaningCases,
  });
  assert.equal(closure.status, 'passed');
  const projections = await buildPresentationOutputCaptionCueProjectionSetV001({
    sourcePackage: fixture.sourcePackage,
    selection,
    caseInputResult: fixture.caseInputResult,
    sourceClosureResult: closure,
    projectionDependencies: projectionDependencies(),
  });
  assert.equal(projections.status, 'passed');
  const selectionBinding = formalBinding(
    selection.schemaVersion,
    'evals/clip_composition/outputs/presentation/test-fixtures/zcq-planner-selection.json',
    selection,
  );
  const selectionReport = {
    schemaVersion: 'presentation-output-caption-cue-selection-report-v001',
    reportId: 'zcq-planner-selection-report-v001',
    status: 'passed',
    selectionJobBinding: fixture.selectionJobBinding,
    sourcePackageBinding: fixture.sourceBinding,
    b6ManifestBinding: fixture.b6ManifestBinding,
    providerEnvelopeBinding: fixture.providerEnvelopeBinding,
    rawResponseBinding: {path: 'fixtures/provider.raw.json', fileSha256: '4'.repeat(64)},
    selectionBinding,
    checks: Object.fromEntries([
      'sourceBinding', 'providerEnvelope', 'responseSchema', 'captionSet',
      'cueBoundaryResolution', 'cueOrder', 'lineBoundaryResolution', 'lineOrder',
      'atomClosure', 'logicalWidth', 'deterministicReconstruction', 'physicalLayout',
      'timelineMapping',
    ].map(key => [key, 'passed'])),
    violations: [],
    fatalObservation: null,
    selectionProjection: clone(projections.value.selectionProjection),
    captionProjection: clone(projections.value.captionProjection),
    implementationBindings: [],
  };
  const selectionReportBinding = formalBinding(
    selectionReport.schemaVersion,
    'evals/clip_composition/outputs/presentation/test-fixtures/zcq-planner-selection-report.json',
    selectionReport,
  );
  return {selection, selectionReport, selectionReportBinding, projections};
};

const plannerInput = (artifacts = fixture.normal, overrides = {}) => ({
  sourcePackage: fixture.sourcePackage,
  selection: artifacts.selection,
  selectionReport: artifacts.selectionReport,
  selectionReportBinding: artifacts.selectionReportBinding,
  caseInputResult: fixture.caseInputResult,
  caseId: 'zcq-planner-case-001',
  proofJobId: 'zcq-planner-proof-job',
  projectionDependencies: projectionDependencies(),
  ...overrides,
});

before(async () => {
  const documentRoot = 'evals/clip_composition/reports/presentation';
  const [styleNamespace, ...documents] = await Promise.all([
    import('./presentation_output_style_resolver_v001.ts'),
    ...DOCS.map(name => readFile(path.join(ROOT, documentRoot, name), 'utf8')),
  ]);
  resolveStyle = styleNamespace.resolvePresentationOutputStyleV001;
  assert.equal(typeof resolveStyle, 'function');
  const proofIds = deriveApprovedCaptionQualityProofIdsV015({
    parent: documents[0], v1: documents[1], v2: documents[2], v3: documents[3],
    v4: documents[4], v5: documents[5], v6: documents[6], v7: documents[7],
    v8: documents[8],
    v9: documents[9],
    v10: documents[10],
    v11: documents[11],
    v12: documents[12],
    v13: documents[13],
    v14: documents[14],
    v15: documents[15],
  });
  assert.equal(proofIds.length, 489);
  proofByOwner = Object.fromEntries(Array.from({length: 10}, (_, offset) => {
    const owner = `ZCQ${String(28 + offset).padStart(3, '0')}`;
    return [owner, proofIds.filter(id => ownerForApprovedCaptionQualityProofIdV001(id) === owner)];
  }));
  assert.deepEqual(Object.fromEntries(Object.entries(proofByOwner).map(([owner, ids]) => [owner, ids.length])), {
    ZCQ028: 17, ZCQ029: 1, ZCQ030: 2, ZCQ031: 4, ZCQ032: 1,
    ZCQ033: 2, ZCQ034: 3, ZCQ035: 6, ZCQ036: 19, ZCQ037: 4,
  });
  approvedPlannerExports = deriveExactExports(documents[0], '#7 planner');
  assert.deepEqual(approvedPlannerExports, [
    'buildPresentationOutputPageLinePlanV003',
    'decodePresentationOutputPageLinePlanV003',
    'validatePresentationOutputPageLinePlanV003',
  ]);

  const [meaningBytes, groupingBytes, baseRequestBytes, styleRequestBytes] = await Promise.all([
    readFile(path.join(ROOT, MEANING_PATH)),
    readFile(path.join(ROOT, GROUPING_PATH)),
    readFile(path.join(ROOT, BASE_MEDIA_REQUEST_PATH)),
    readFile(path.join(ROOT, STYLE_REQUEST_PATH)),
  ]);
  const meaning = JSON.parse(meaningBytes);
  const grouping = JSON.parse(groupingBytes);
  const baseRequest = JSON.parse(baseRequestBytes);
  const styleRequest = JSON.parse(styleRequestBytes);
  const request = {...baseRequest, styleInput: clone(styleRequest.styleInput)};
  request.styleInput.captionLayoutPolicy.maxLogicalWidthPerLine = 35;
  const semanticCaption = meaning.captions[0];
  const atomsById = new Map(meaning.atomOccurrences.map(atom => [atom.atomOccurrenceId, atom]));
  const atoms = semanticCaption.atomOccurrenceIds.map(id => atomsById.get(id));
  assert.ok(atoms.every(Boolean));
  const meaningBinding = {
    schemaVersion: meaning.schemaVersion,
    path: MEANING_PATH,
    fileSha256: SHA(meaningBytes),
    canonicalSha256: SHA(canonicalBytes(meaning)),
  };
  const artifacts = {};
  for (const role of [
    'trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex',
    'materialValidationIndex', 'rendererTrust',
  ]) {
    artifacts[role] = JSON.parse(await readFile(
      path.join(ROOT, request.styleInput.presetBinding[role].path), 'utf8',
    ));
  }
  const styleResult = await resolveStyle({
    styleInput: request.styleInput,
    artifacts,
    baseMediaInput: request.baseMediaInput,
    baseMediaInspection: null,
  });
  assert.equal(styleResult.status, 'resolved');
  const boundaries = atoms.map((atom, index) => ({
    boundaryId: `display-boundary-000001-${String(index + 1).padStart(6, '0')}`,
    text: atom.text,
  }));
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    packageId: 'zcq-planner-source-package',
    promptInput: {
      schemaVersion: 'presentation-zevo-caption-selection-input-v001',
      taskDescription: TASK_DESCRIPTION,
      captions: [{captionId: 'input-caption-000001', boundaryCandidates: boundaries}],
      styleLimits: {maxLogicalWidthPerLine: 35, maxLinesPerCue: 2, characterWidthRule: WIDTH_RULE},
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
        caseId: 'zcq-planner-case-001',
        inputCaptionId: 'input-caption-000001',
        meaningPackageBinding: meaningBinding,
        baseMediaInput: clone(request.baseMediaInput),
        horizontalStyleInput: clone(request.styleInput),
        styleBindings: Object.fromEntries([
          'trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex',
          'materialValidationIndex', 'rendererTrust',
        ].map(role => [role, clone(request.styleInput.presetBinding[role])])),
        resolvedStyle: clone(styleResult.resolvedStyle),
      }],
    },
    provenance: {
      sourcePackageJobBinding: {
        schemaVersion: 'presentation-output-caption-cue-source-package-job-v001',
        path: 'evals/clip_composition/jobs/presentation/output-caption-cue-source-jobs/zcq-planner-source-job.json',
        fileSha256: '1'.repeat(64), canonicalSha256: '2'.repeat(64),
      },
      implementationBindings: [],
      approvedContractBindings: [],
    },
  };
  const sourceBinding = formalBinding(
    sourcePackage.schemaVersion,
    'evals/clip_composition/outputs/presentation/test-fixtures/zcq-planner-source-package.json',
    sourcePackage,
  );
  const response = {
    status: 'complete',
    captions: [{
      captionId: 'input-caption-000001',
      cues: grouping.cues.map(cue => ({
        cueEndBoundaryId: boundaries[cue.cueEndAtomOrdinal - 1].boundaryId,
        lineEndBoundaryIds: cue.lineEndAtomOrdinals.map(
          ordinal => boundaries[ordinal - 1].boundaryId,
        ),
      })),
    }],
  };
  fixture = {
    sourcePackage,
    sourceBinding,
    response,
    meaning,
    b6ManifestBinding: formalBinding(
      'presentation-output-caption-cue-b6-manifest-v001', 'fixtures/b6-manifest.json', {fixture: 'b6'},
    ),
    providerEnvelopeBinding: formalBinding(
      'presentation-output-caption-cue-provider-response-envelope-v001', 'fixtures/envelope.json', {fixture: 'envelope'},
    ),
    selectionJobBinding: formalBinding(
      'presentation-output-caption-cue-selection-job-v001', 'fixtures/selection-job.json', {fixture: 'selection-job'},
    ),
  };
  fixture.caseInputResult = await rereadPresentationOutputCaptionCueCaseInputsV001({
    workspaceRoot: ROOT,
    sourcePackage,
    rereadDependencies: rereadDependencies(),
  });
  assert.equal(fixture.caseInputResult.status, 'passed');
  fixture.normal = await makeSelectionArtifacts(response);
  const singleLineEnds = grouping.cues.flatMap(cue => cue.lineEndAtomOrdinals);
  fixture.singleLine = await makeSelectionArtifacts({
    status: 'complete',
    captions: [{
      captionId: 'input-caption-000001',
      cues: singleLineEnds.map(ordinal => ({
        cueEndBoundaryId: boundaries[ordinal - 1].boundaryId,
        lineEndBoundaryIds: [boundaries[ordinal - 1].boundaryId],
      })),
    }],
  });
});

test('ZCQ028 reconstructs one case through the shared source closure and projection set', async t => {
  const result = await buildPresentationOutputPageLinePlanV003(plannerInput());
  assert.equal(result.status, 'passed');
  assert.deepEqual(Object.keys(result.value), ['pageLinePlan', 'renderSupport']);
  assert.equal(result.value.pageLinePlan.captionDisplays.length, 1);
  assert.deepEqual(result.value.pageLinePlan.captionDisplays[0], fixture.normal.projections.value.captionDisplays[0]);
  const brokenSource = clone(fixture.sourcePackage);
  brokenSource.promptInput.captions[0].boundaryCandidates[0].text += 'x';
  const rejected = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {sourcePackage: brokenSource}));
  assert.equal(rejected.primaryCode, 'CUE_RECONSTRUCTION_FAILED');
  diagnosticsFor(t, 'ZCQ028');
  t.diagnostic('code-owner:CUE_RECONSTRUCTION_FAILED:passed');
});

test('ZCQ029 keeps cues that fit on one line unbroken', async t => {
  const result = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.singleLine));
  assert.equal(result.status, 'passed');
  assert.ok(result.value.pageLinePlan.captionDisplays[0].cues.every(cue => cue.lines.length === 1));
  diagnosticsFor(t, 'ZCQ029');
});

test('ZCQ030 preserves the selected two-line physical edge without replanning', async t => {
  const result = await buildPresentationOutputPageLinePlanV003(plannerInput());
  assert.equal(result.status, 'passed');
  const cues = result.value.pageLinePlan.captionDisplays[0].cues;
  assert.deepEqual([
    fixture.sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine,
    fixture.sourcePackage.reconstructionMap.caseContexts[0]
      .resolvedStyle.maxLogicalWidthPerLine,
  ], [35, 35]);
  assert.ok(cues.every(cue => cue.lines.length === 2));
  assert.deepEqual(cues, fixture.normal.projections.value.captionDisplays[0].cues);
  diagnosticsFor(t, 'ZCQ030');
});

test('ZCQ031 rejects duplicate selected physical edges as physically ambiguous', async t => {
  const dependencies = projectionDependencies();
  const rejected = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    projectionDependencies: {
      ...dependencies,
      buildPhysicalPageGraph: async input => {
        const graph = await dependencies.buildPhysicalPageGraph(input);
        const selected = graph.find(edge => edge.startBoundaryOrdinal === 0
          && edge.endBoundaryOrdinal === 34
          && JSON.stringify(edge.lineEndBoundaryOrdinals) === JSON.stringify([17, 34]));
        assert.ok(selected);
        return [...graph, clone(selected)];
      },
    },
  }));
  assert.equal(rejected.primaryCode, 'CUE_PLANNER_PHYSICAL_INVALID');
  diagnosticsFor(t, 'ZCQ031');
  t.diagnostic('code-owner:CUE_PLANNER_PHYSICAL_INVALID:passed');
});

test('ZCQ032 rejects a selection for which the production graph has no exact edge', async t => {
  const rejected = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    projectionDependencies: {...projectionDependencies(), buildPhysicalPageGraph: async () => []},
  }));
  assert.equal(rejected.primaryCode, 'CUE_SELECTED_EDGE_NOT_FOUND');
  diagnosticsFor(t, 'ZCQ032');
  t.diagnostic('code-owner:CUE_SELECTED_EDGE_NOT_FOUND:passed');
});

test('ZCQ033 rejects a non-mapped production timeline result', async t => {
  const rejected = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    projectionDependencies: {...projectionDependencies(), mapPiecewiseTimeline: () => ({status: 'invalid'})},
  }));
  assert.equal(rejected.primaryCode, 'CUE_PLANNER_TIMELINE_INVALID');
  diagnosticsFor(t, 'ZCQ033');
  t.diagnostic('code-owner:CUE_PLANNER_TIMELINE_INVALID:passed');
});

test('ZCQ034 rejects positive frame overlap between adjacent cues', async t => {
  const dependencies = projectionDependencies();
  let previousEnd = null;
  const rejected = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    projectionDependencies: {
      ...dependencies,
      mapPiecewiseTimeline: input => {
        const mapped = dependencies.mapPiecewiseTimeline(input);
        if (mapped.status !== 'mapped') return mapped;
        if (previousEnd === null) {
          previousEnd = mapped.displayFrameRange.endFrameExclusive;
          return mapped;
        }
        const altered = clone(mapped);
        altered.displayFrameRange.startFrame = previousEnd - 1;
        altered.displayFrameRange.displayFrameCount =
          altered.displayFrameRange.endFrameExclusive - altered.displayFrameRange.startFrame;
        previousEnd = altered.displayFrameRange.endFrameExclusive;
        return altered;
      },
    },
  }));
  assert.equal(rejected.primaryCode, 'CUE_PLANNER_OVERLAP_INVALID');
  diagnosticsFor(t, 'ZCQ034');
  t.diagnostic('code-owner:CUE_PLANNER_OVERLAP_INVALID:passed');
});

test('ZCQ035 returns byte-identical formal plans from the same verified tuple', async t => {
  const first = await buildPresentationOutputPageLinePlanV003(plannerInput());
  const second = await buildPresentationOutputPageLinePlanV003(plannerInput());
  assert.equal(first.status, 'passed');
  assert.equal(second.status, 'passed');
  assert.ok(formalBytes(first.value.pageLinePlan).equals(formalBytes(second.value.pageLinePlan)));
  assert.equal(validatePresentationOutputPageLinePlanV003(first.value.pageLinePlan).status, 'passed');
  assert.equal(decodePresentationOutputPageLinePlanV003(formalBytes(first.value.pageLinePlan)).status, 'decoded');
  diagnosticsFor(t, 'ZCQ035');
});

test('ZCQ036 rejects old argument shapes and any verified projection or binding drift', async t => {
  assert.deepEqual(Object.keys(plannerModule).sort(), approvedPlannerExports);
  const plannerPath = path.join(ROOT, 'evals/clip_composition/presentation_output_page_line_planner_v003.mjs');
  const selectionPath = path.join(ROOT, 'evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs');
  assert.deepEqual(
    observeDirectImport(`file://${plannerPath}`, [plannerPath, selectionPath]),
    approvedPlannerExports,
  );
  const missing = plannerInput();
  delete missing.caseInputResult;
  assert.equal((await buildPresentationOutputPageLinePlanV003(missing)).primaryCode, 'CUE_PLANNER_INPUT_INVALID');
  const extra = {...plannerInput(), meaningPackage: fixture.meaning};
  assert.equal((await buildPresentationOutputPageLinePlanV003(extra)).primaryCode, 'CUE_PLANNER_INPUT_INVALID');
  const changedReport = clone(fixture.normal.selectionReport);
  changedReport.selectionProjection.cueCount += 1;
  const mismatch = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    selectionReport: changedReport,
  }));
  assert.equal(mismatch.primaryCode, 'CUE_PLANNER_BINDING_MISMATCH');
  assert.equal(mismatch.violations[0].path, '/selectionProjection/cueCount');
  const changedCases = clone(fixture.caseInputResult);
  changedCases.caseInputs[0].records[0].text += 'x';
  const caseMismatch = await buildPresentationOutputPageLinePlanV003(plannerInput(fixture.normal, {
    caseInputResult: changedCases,
  }));
  assert.equal(caseMismatch.primaryCode, 'CUE_PLANNER_BINDING_MISMATCH');
  diagnosticsFor(t, 'ZCQ036');
  t.diagnostic('code-owner:CUE_PLANNER_INPUT_INVALID:passed');
  t.diagnostic('code-owner:CUE_PLANNER_BINDING_MISMATCH:passed');
});

test('ZCQ037 freezes the six approved old plans and their known split evidence', async t => {
  const observed = [];
  for (const [relativePath, expectedSha] of OLD_PLAN_FIXTURES) {
    const bytes = await readFile(path.join(ROOT, OLD_PLAN_ROOT, relativePath));
    assert.equal(SHA(bytes), expectedSha);
    observed.push(JSON.parse(bytes));
  }
  assert.equal(observed.length, 6);
  diagnosticsFor(t, 'ZCQ037');
});

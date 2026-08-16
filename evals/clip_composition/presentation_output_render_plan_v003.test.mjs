import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test, {before} from 'node:test';

import * as renderModule from './presentation_output_render_plan_v003.mjs';
const {
  buildPresentationOutputCommonCorePlanV003,
  buildPresentationOutputRenderPlanV003,
  decodePresentationOutputRenderPlanV003,
  decodePresentationZevoCaptionQualityOutputRequestV001,
  validatePresentationOutputRenderPlanV003,
  validatePresentationZevoCaptionQualityOutputRequestV001,
} = renderModule;
import {
  derivePresentationOutputMeaningProjectionV002,
} from './presentation_output_render_plan_v002.mjs';
import {
  buildPresentationOutputCommonCoreElementProjectionV001,
} from './presentation_output_render_plan_v001.mjs';
import {
  deriveApprovedCaptionQualityProofIdsV015,
  ownerForApprovedCaptionQualityProofIdV001,
} from './presentation_output_caption_cue_source_package_v001.test.mjs';

const ROOT = process.cwd();
const CASE_ROOT = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013';
const OLD_RENDER_PATH = `${CASE_ROOT}/horizontal-formal/render-plan-v002.json`;
const OLD_REQUEST_PATH = `${CASE_ROOT}/horizontal-formal/output-request-v001.json`;
const STYLE_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v001/output-request.json';
const MEANING_PATH = 'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const binding = (schemaVersion, relativePath, value) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: SHA(formalBytes(value)),
  canonicalSha256: SHA(Buffer.from(JSON.stringify(canonicalize(value)), 'utf8')),
});

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

let fixture;
let proofByOwner;
let approvedRenderExports;
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
const deps = () => ({
  deriveMeaningProjection: derivePresentationOutputMeaningProjectionV002,
  buildCommonCoreElementProjection: buildPresentationOutputCommonCoreElementProjectionV001,
});
const diagnosticsFor = (t, owner) => proofByOwner[owner].forEach(
  id => t.diagnostic(`proof-item:${id}:passed`),
);

const renderInput = (overrides = {}) => ({
  outputRequest: fixture.outputRequest,
  outputRequestBinding: fixture.outputRequestBinding,
  pageLinePlan: fixture.pageLinePlan,
  sourcePackage: fixture.sourcePackage,
  selection: fixture.selection,
  selectionReport: fixture.selectionReport,
  meaningPackage: fixture.meaningPackage,
  proofJobId: fixture.proofJobId,
  verifiedDependencies: deps(),
  ...overrides,
});

before(async () => {
  const documentRoot = 'evals/clip_composition/reports/presentation';
  const [styleNamespace, oldRenderBytes, oldRequestBytes, styleRequestBytes, meaningBytes, ...documents] =
    await Promise.all([
      import('./presentation_output_style_resolver_v001.ts'),
      readFile(path.join(ROOT, OLD_RENDER_PATH)),
      readFile(path.join(ROOT, OLD_REQUEST_PATH)),
      readFile(path.join(ROOT, STYLE_REQUEST_PATH)),
      readFile(path.join(ROOT, MEANING_PATH)),
      ...DOCS.map(name => readFile(path.join(ROOT, documentRoot, name), 'utf8')),
    ]);
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
  proofByOwner = Object.fromEntries(Array.from({length: 4}, (_, offset) => {
    const owner = `ZCQ${String(38 + offset).padStart(3, '0')}`;
    return [owner, proofIds.filter(id => ownerForApprovedCaptionQualityProofIdV001(id) === owner)];
  }));
  assert.deepEqual(Object.fromEntries(Object.entries(proofByOwner).map(([owner, ids]) => [owner, ids.length])), {
    ZCQ038: 15, ZCQ039: 11, ZCQ040: 6, ZCQ041: 12,
  });
  approvedRenderExports = deriveExactExports(documents[0], '#9 render');
  assert.deepEqual(approvedRenderExports, [
    'buildPresentationOutputCommonCorePlanV003',
    'buildPresentationOutputRenderPlanV003',
    'decodePresentationOutputRenderPlanV003',
    'decodePresentationZevoCaptionQualityOutputRequestV001',
    'validatePresentationOutputRenderPlanV003',
    'validatePresentationZevoCaptionQualityOutputRequestV001',
  ]);

  const oldRender = JSON.parse(oldRenderBytes);
  const oldRequest = JSON.parse(oldRequestBytes);
  const styleRequest = JSON.parse(styleRequestBytes);
  const meaningPackage = JSON.parse(meaningBytes);
  const sourcePackageBinding = binding(
    'presentation-output-caption-cue-source-package-v001', 'fixtures/source-package-v001.json', {fixture: 'source'},
  );
  const selectionBinding = binding(
    'presentation-output-caption-cue-selection-v001', 'fixtures/selection-v001.json', {fixture: 'selection'},
  );
  const selectionReportBinding = binding(
    'presentation-output-caption-cue-selection-report-v001', 'fixtures/selection-report-v001.json', {fixture: 'selection-report'},
  );
  const proofJobId = 'zcq-render-proof-job';
  const caseId = 'voice-013';
  const inputCaptionId = 'input-caption-000001';
  const pageDisplay = oldRender.captionDisplays[0];
  const captionDisplay = {
    displayCaptionId: pageDisplay.displayCaptionId,
    inputCaptionId,
    semanticCaptionId: pageDisplay.semanticCaptionId,
    ordinal: pageDisplay.ordinal,
    cues: pageDisplay.pages.map((page, index) => ({
      cueId: `cue-000001-${String(index + 1).padStart(6, '0')}`,
      cueOrdinal: index + 1,
      cueEndBoundaryId: `display-boundary-000001-${String(page.atomOccurrenceIds.at(-1).match(/[0-9]+$/u)[0]).padStart(6, '0')}`,
      lineEndBoundaryIds: page.lines.map(line => `display-boundary-000001-${String(line.atomOccurrenceIds.at(-1).match(/[0-9]+$/u)[0]).padStart(6, '0')}`),
      atomOccurrenceIds: clone(page.atomOccurrenceIds),
      text: page.text,
      retainedSpans: clone(page.retainedSpans),
      sourceSpanEnvelopes: clone(page.sourceSpanEnvelopes),
      frameMappings: clone(page.frameMappings),
      startFrame: page.startFrame,
      endFrameExclusive: page.endFrameExclusive,
      displayFrameCount: page.displayFrameCount,
      lines: clone(page.lines),
    })),
  };
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    reconstructionMap: {caseContexts: [{
      caseId,
      inputCaptionId,
      meaningPackageBinding: clone(oldRender.meaningPackageBinding),
      baseMediaInput: clone(oldRender.baseMediaBinding),
      horizontalStyleInput: clone(styleRequest.styleInput),
      resolvedStyle: clone(oldRender.resolvedStyle),
    }]},
  };
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    sourcePackageBinding: clone(sourcePackageBinding),
  };
  const selectionReport = {
    schemaVersion: 'presentation-output-caption-cue-selection-report-v001',
    status: 'passed',
    selectionBinding: clone(selectionBinding),
  };
  const pageLinePlan = {
    schemaVersion: 'presentation-output-page-line-plan-v003',
    planId: `${proofJobId}-${caseId}-page-line-v003`,
    sourcePackageBinding: clone(sourcePackageBinding),
    selectionBinding: clone(selectionBinding),
    selectionReportBinding: clone(selectionReportBinding),
    meaningPackageBinding: clone(oldRender.meaningPackageBinding),
    resolvedStyle: clone(oldRender.resolvedStyle),
    captionDisplays: [captionDisplay],
  };
  const requestId = `${proofJobId}-${caseId}-horizontal-request`;
  const outputRequest = {
    schemaVersion: 'presentation-zevo-caption-quality-v002-output-request-v001',
    requestId,
    caseId,
    inputCaptionId,
    sourcePackageBinding: clone(sourcePackageBinding),
    selectionBinding: clone(selectionBinding),
    selectionReportBinding: clone(selectionReportBinding),
    meaningPackageBinding: clone(oldRender.meaningPackageBinding),
    baseMediaInput: clone(oldRender.baseMediaBinding),
    styleInput: clone(styleRequest.styleInput),
    publication: {
      outputId: `${requestId}-output`,
      renderOutputRoot: `evals/clip_composition/outputs/presentation/test-fixtures/${requestId}`,
    },
  };
  const outputRequestBinding = binding(
    outputRequest.schemaVersion, 'fixtures/output-request-v001.json', outputRequest,
  );
  const artifacts = {};
  for (const role of [
    'trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex',
    'materialValidationIndex', 'rendererTrust',
  ]) {
    artifacts[role] = JSON.parse(await readFile(
      path.join(ROOT, outputRequest.styleInput.presetBinding[role].path), 'utf8',
    ));
  }
  const styleResult = await styleNamespace.resolvePresentationOutputStyleV001({
    styleInput: outputRequest.styleInput,
    artifacts,
    baseMediaInput: outputRequest.baseMediaInput,
    baseMediaInspection: null,
  });
  assert.equal(styleResult.status, 'resolved');
  assert.deepEqual(styleResult.resolvedStyle, oldRender.resolvedStyle);
  fixture = {
    proofJobId, meaningPackage, sourcePackage, selection, selectionReport,
    pageLinePlan, outputRequest, outputRequestBinding, layoutContext: styleResult.layoutContext,
  };
});

test('ZCQ038 accepts only the new exact request/render schemas and preserves cue IDs', t => {
  assert.deepEqual(Object.keys(renderModule).sort(), approvedRenderExports);
  const renderPath = path.join(ROOT, 'evals/clip_composition/presentation_output_render_plan_v003.mjs');
  assert.deepEqual(
    observeDirectImport(`file://${renderPath}`, [renderPath]),
    approvedRenderExports,
  );
  assert.equal(validatePresentationZevoCaptionQualityOutputRequestV001(fixture.outputRequest).status, 'passed');
  assert.equal(decodePresentationZevoCaptionQualityOutputRequestV001(formalBytes(fixture.outputRequest)).status, 'decoded');
  const legacy = clone(fixture.outputRequest);
  legacy.schemaVersion = 'presentation-output-request-v001';
  assert.equal(validatePresentationZevoCaptionQualityOutputRequestV001(legacy).status, 'rejected');
  const result = buildPresentationOutputRenderPlanV003(renderInput());
  assert.equal(result.status, 'passed');
  assert.equal(result.value.renderPlan.planId, `${fixture.proofJobId}-voice-013-render-v003`);
  assert.equal(validatePresentationOutputRenderPlanV003(result.value.renderPlan).status, 'passed');
  assert.equal(decodePresentationOutputRenderPlanV003(formalBytes(result.value.renderPlan)).status, 'decoded');
  diagnosticsFor(t, 'ZCQ038');
  t.diagnostic('code-owner:CUE_RENDER_INPUT_INVALID:passed');
});

test('ZCQ039 rejects any cross-input binding or live source-context drift', t => {
  const changedPlan = clone(fixture.pageLinePlan);
  changedPlan.selectionReportBinding.fileSha256 = '0'.repeat(64);
  const reportMismatch = buildPresentationOutputRenderPlanV003(renderInput({pageLinePlan: changedPlan}));
  assert.equal(reportMismatch.primaryCode, 'CUE_RENDER_BINDING_MISMATCH');
  const changedRequest = clone(fixture.outputRequest);
  changedRequest.baseMediaInput.baseMedia.fileSha256 = '0'.repeat(64);
  const mediaMismatch = buildPresentationOutputRenderPlanV003(renderInput({outputRequest: changedRequest}));
  assert.equal(mediaMismatch.primaryCode, 'CUE_RENDER_BINDING_MISMATCH');
  const changedMeaning = clone(fixture.meaningPackage);
  changedMeaning.title.text = 'not-empty';
  const meaningMismatch = buildPresentationOutputRenderPlanV003(renderInput({meaningPackage: changedMeaning}));
  assert.equal(meaningMismatch.primaryCode, 'CUE_RENDER_PROJECTION_INVALID');
  diagnosticsFor(t, 'ZCQ039');
  t.diagnostic('code-owner:CUE_RENDER_BINDING_MISMATCH:passed');
});

test('ZCQ040 projects every cue through the existing common element implementation', t => {
  const rendered = buildPresentationOutputRenderPlanV003(renderInput());
  assert.equal(rendered.status, 'passed');
  const common = buildPresentationOutputCommonCorePlanV003({
    renderPlan: rendered.value.renderPlan,
    layoutContext: fixture.layoutContext,
    verifiedDependencies: deps(),
  });
  assert.equal(common.status, 'passed');
  const cues = fixture.pageLinePlan.captionDisplays[0].cues;
  assert.equal(common.value.commonCorePlan.elements.length, cues.length);
  for (const [index, element] of common.value.commonCorePlan.elements.entries()) {
    assert.equal(element.instructionId, cues[index].cueId);
    assert.equal(element.targetProvenance.targetRefId, fixture.pageLinePlan.captionDisplays[0].semanticCaptionId);
    assert.deepEqual(element.retainedSpans, cues[index].retainedSpans);
    assert.deepEqual(element.frameMappings, cues[index].frameMappings);
  }
  const rejected = buildPresentationOutputCommonCorePlanV003({
    renderPlan: rendered.value.renderPlan,
    layoutContext: fixture.layoutContext,
    verifiedDependencies: {...deps(), buildCommonCoreElementProjection: () => ({status: 'rejected'})},
  });
  assert.equal(rejected.primaryCode, 'CUE_RENDER_PROJECTION_INVALID');
  diagnosticsFor(t, 'ZCQ040');
  t.diagnostic('code-owner:CUE_RENDER_PROJECTION_INVALID:passed');
});

test('ZCQ041 returns byte-identical render and common-core plans from the same tuple', t => {
  const first = buildPresentationOutputRenderPlanV003(renderInput());
  const second = buildPresentationOutputRenderPlanV003(renderInput());
  assert.equal(first.status, 'passed');
  assert.equal(second.status, 'passed');
  assert.ok(formalBytes(first.value.renderPlan).equals(formalBytes(second.value.renderPlan)));
  const commonFirst = buildPresentationOutputCommonCorePlanV003({
    renderPlan: first.value.renderPlan, layoutContext: fixture.layoutContext,
    verifiedDependencies: deps(),
  });
  const commonSecond = buildPresentationOutputCommonCorePlanV003({
    renderPlan: second.value.renderPlan, layoutContext: fixture.layoutContext,
    verifiedDependencies: deps(),
  });
  assert.ok(formalBytes(commonFirst.value.commonCorePlan).equals(
    formalBytes(commonSecond.value.commonCorePlan),
  ));
  diagnosticsFor(t, 'ZCQ041');
});

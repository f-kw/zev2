import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access, mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
  buildPresentationSemanticLineEndProjectionBindingV001,
  buildPresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV001,
  serializePresentationInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  PRESENTATION_RENDERER_ADMISSION_CHECKS_V001,
  buildPresentationRendererAdmissionReceiptV001,
  decodePresentationInstructionRendererJobV001,
  decodePresentationRendererAdmissionReceiptV001,
  inspectPresentationRendererAdmissionV001,
  publishPresentationRendererAdmissionReceiptNoReplaceV001,
  serializePresentationInstructionRendererJobV001,
  serializePresentationRendererAdmissionReceiptV001,
  validatePresentationInstructionRendererJobV001,
  validatePresentationRendererAdmissionReceiptV001,
} from './presentation_renderer_admission_receipt_v001.mjs';

const FIXTURE_ROOT = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures';
const DESIGN_PATH = 'evals/clip_composition/reports/presentation/'
  + 'presentation-rendering-decoupling-contract-design-20260817-v001.md';
const DESIGN_SHA = 'aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94';
const ADDENDUM_V001_PATH = 'evals/clip_composition/reports/presentation/'
  + 'presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md';
const ADDENDUM_V001_SHA = '2643e7bf7ad8cdac6dd81a4fa1f1bb5c884b6f2968ec4db465554ad91bee1fad';
const ADDENDUM_V002_PATH = 'evals/clip_composition/reports/presentation/'
  + 'presentation-rendering-decoupling-contract-design-addendum-20260817-v002.md';
const ADDENDUM_V002_SHA = 'f19a0ff9a27de640959bbbc81fcf7920b63f7a0c19354bc7bf7c6b2a5fcdf47b';
const ADDENDUM_V003_PATH = 'evals/clip_composition/reports/presentation/'
  + 'presentation-rendering-decoupling-contract-design-addendum-20260818-v003.md';
const ADDENDUM_V003_SHA = 'cd4bfb75f8dfe0aec325ee8ae79cb136908ea7fa7e5fd2e610a430bfb4d1b16d';
const ADDENDUM_V004_PATH = 'evals/clip_composition/reports/presentation/'
  + 'presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md';
const ADDENDUM_V004_SHA = '8321a7ba99672af164f6a66285a3802f05b7f876e6c4fbf94e4211b0524f4d36';
const TRUST_V002_PATH = 'evals/clip_composition/registries/presentation/'
  + 'presentation-renderer-trust-v002/trust.json';
const RUNTIME_PATHS = Object.freeze({
  ffmpeg: '/opt/homebrew/bin/ffmpeg',
  ffprobe: '/opt/homebrew/bin/ffprobe',
  imageMagick: '/opt/homebrew/bin/magick',
  remotion: '/Users/kawafmm/workspace/zev2/runner/node_modules/@remotion/cli/remotion-cli.js',
  tsx: '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs',
  chromium: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const IMPLEMENTATION_PATHS = Object.freeze([
  ['renderer-admission-v001', 'evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs'],
  ['renderer-line-layout-v001', 'evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs'],
  ['renderer-common-plan-v001', 'evals/clip_composition/presentation_output_render_plan_v001.mjs'],
  ['renderer-overlay-v001', 'evals/clip_composition/presentation_renderer_entry_v001.tsx'],
  ['renderer-core-v002', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['renderer-process-observation-v001',
    'evals/clip_composition/presentation_renderer_process_observation_v001.mjs'],
  ['renderer-layout-inspector-v001', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['renderer-atomic-publisher-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
]);

const fileSha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalSha = value => fileSha(canonicalJson(value));
const fileBinding = (schemaVersion, bindingPath, bytes, value) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: fileSha(bytes),
  canonicalSha256: canonicalSha(value),
});
const implementationBindings = async () => Promise.all(IMPLEMENTATION_PATHS.map(
  async ([role, implementationPath]) => ({
    role,
    path: implementationPath,
    fileSha256: fileSha(await readFile(implementationPath)),
  }),
));
const inspectedFiles = async rows => Promise.all(rows.map(async row => ({
  path: row.path,
  fileSha256: fileSha(await readFile(row.path)),
})));
const runtimeBindings = async () => Object.fromEntries(await Promise.all(
  Object.entries(RUNTIME_PATHS).map(async ([role, runtimePath]) => [role, {
    path: runtimePath,
    fileSha256: fileSha(await readFile(runtimePath)),
  }]),
));

const makeFixture = async () => {
  const [sourceBytes, selectionBytes] = await Promise.all([
    readFile(`${FIXTURE_ROOT}/source-package-v001.json`),
    readFile(`${FIXTURE_ROOT}/selection-v001.json`),
  ]);
  const sourcePackage = JSON.parse(sourceBytes.toString('utf8'));
  const selection = JSON.parse(selectionBytes.toString('utf8'));
  const context = sourcePackage.reconstructionMap.caseContexts[0];
  const [meaningBytes, timelineBytes, styleBytes, materialBytes, trustBytes] = await Promise.all([
    readFile(context.meaningPackageBinding.path),
    readFile(context.baseMediaInput.timeline.path),
    readFile(context.styleBindings.presetRegistry.path),
    readFile(context.styleBindings.materialValidationIndex.path),
    readFile(TRUST_V002_PATH),
  ]);
  const meaningPackage = JSON.parse(meaningBytes.toString('utf8'));
  const timeline = JSON.parse(timelineBytes.toString('utf8'));
  const styleProfileRegistry = JSON.parse(styleBytes.toString('utf8'));
  const materialRegistry = JSON.parse(materialBytes.toString('utf8'));
  const rendererTrust = JSON.parse(trustBytes.toString('utf8'));
  const producerJobBinding = {
    schemaVersion: 'presentation-rendering-decoupling-instruction-job-v001',
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/jobs/instruction.json',
    fileSha256: '0'.repeat(64),
    canonicalSha256: '0'.repeat(64),
  };
  const projection = buildPresentationCueEndProjectionV001({
    projectionId: 'voice-013-cue-end-projection-v001',
    sourcePackageBinding: selection.sourcePackageBinding,
    sourceSelectionDigest: {
      schemaVersion: selection.schemaVersion,
      artifactId: selection.selectionId,
      fileSha256: fileSha(selectionBytes),
      canonicalSha256: canonicalSha(selection),
    },
    producerJobBinding,
    sourcePackage,
    selection,
  }).projection;
  const projectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'voice-013/cue-end-projection-v001.json',
    projection,
  });
  const lineProjection = buildPresentationSemanticLineEndProjectionV001({
    projectionId: 'voice-013-semantic-line-end-projection-v001',
    sourcePackageBinding: selection.sourcePackageBinding,
    cueEndProjectionBinding: projectionBinding,
    sourceSelectionDigest: {
      schemaVersion: selection.schemaVersion,
      artifactId: selection.selectionId,
      fileSha256: fileSha(selectionBytes),
      canonicalSha256: canonicalSha(selection),
    },
    producerJobBinding,
    sourcePackage,
    selection,
    cueEndProjection: projection,
  }).projection;
  const lineProjectionBinding = buildPresentationSemanticLineEndProjectionBindingV001({
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'voice-013/semantic-line-end-projection-v001.json',
    projection: lineProjection,
  });
  const artifact = buildPresentationCaptionInstructionArtifactV001({
    artifactId: 'voice-013-presentation-instruction-v001',
    sourceCaseId: context.caseId,
    meaningInformationPackageBinding: context.meaningPackageBinding,
    timelineBinding: context.baseMediaInput.timeline,
    cueEndProjectionBinding: projectionBinding,
    producerJobBinding,
    styleProfileId: context.resolvedStyle.presetId,
    meaningPackage,
    timeline,
    cueEndProjection: projection,
  }).artifact;
  const artifactBytes = serializePresentationInstructionArtifactV001(artifact);
  const instructionArtifactBinding = fileBinding(
    artifact.schemaVersion,
    'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'voice-013/presentation-instruction-v001.json',
    artifactBytes,
    artifact,
  );
  const rendererImplementationBindings = await implementationBindings();
  const verifiedRuntimeBindings = await runtimeBindings();
  const rendererTrustBinding = fileBinding(
    rendererTrust.schemaVersion,
    TRUST_V002_PATH,
    trustBytes,
    rendererTrust,
  );
  const job = {
    schemaVersion: 'presentation-instruction-renderer-job-v001',
    jobId: 'voice-013-instruction-render-v001',
    attemptId: 'attempt-0001',
    instructionArtifactBinding,
    lineEndProjectionBinding: lineProjectionBinding,
    cropAppliedBaseMedia: structuredClone(context.baseMediaInput),
    executionInputs: {
      format: 'normal-landscape',
      canvas: {width: 1920, height: 1080, fps: 30},
      screenLayoutId: null,
      visualStateId: context.resolvedStyle.visualStateId,
      cropPolicy: {mode: 'already-applied'},
      sceneTransitionPolicy: {mode: 'straight-cut'},
      audioPolicy: {mode: 'preserve-source'},
      lineLayoutRules: {
        'speech-caption': 'semantic-line-end-projection-v001',
        title: 'greedy-code-point-v001',
      },
    },
    registryBindings: {
      styleProfileRegistry: structuredClone(context.styleBindings.presetRegistry),
      materialRegistry: structuredClone(context.styleBindings.materialValidationIndex),
      fontLedger: {
        ...structuredClone(rendererTrustBinding),
        jsonPointer: '/fontAssets',
        valueCanonicalSha256: canonicalSha(rendererTrust.fontAssets),
      },
      rendererTrust: structuredClone(rendererTrustBinding),
    },
    runtimeBindings: verifiedRuntimeBindings,
    rendererImplementationBindings,
    approvedContractBindings: [
      {
        role: 'rendering-decoupling-contract-design-v001',
        path: DESIGN_PATH,
        fileSha256: DESIGN_SHA,
      },
      {
        role: 'rendering-decoupling-contract-addendum-v001',
        path: ADDENDUM_V001_PATH,
        fileSha256: ADDENDUM_V001_SHA,
      },
      {
        role: 'rendering-decoupling-contract-addendum-v002',
        path: ADDENDUM_V002_PATH,
        fileSha256: ADDENDUM_V002_SHA,
      },
      {
        role: 'rendering-decoupling-contract-addendum-v003',
        path: ADDENDUM_V003_PATH,
        fileSha256: ADDENDUM_V003_SHA,
      },
      {
        role: 'rendering-decoupling-contract-addendum-v004',
        path: ADDENDUM_V004_PATH,
        fileSha256: ADDENDUM_V004_SHA,
      },
    ],
    publication: {
      admissionReceiptPath: 'evals/clip_composition/outputs/presentation/'
        + 'rendering-decoupling/voice-013/admission-receipt-v001.json',
      lineLayoutPath: 'evals/clip_composition/outputs/presentation/'
        + 'rendering-decoupling/voice-013/line-layout-v001.json',
      renderOutputRoot: 'evals/clip_composition/outputs/presentation/'
        + 'rendering-decoupling/voice-013/render-v001',
    },
  };
  const probe = JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe', [
    '-v', 'error', '-show_entries',
    'stream=codec_type,width,height,r_frame_rate,nb_frames',
    '-of', 'json', context.baseMediaInput.baseMedia.path,
  ], {encoding: 'utf8'}));
  const video = probe.streams.find(row => row.codec_type === 'video');
  const mediaInspection = {
    ...context.baseMediaInput.baseMedia,
    width: video.width,
    height: video.height,
    fps: Number(video.r_frame_rate.split('/')[0]) / Number(video.r_frame_rate.split('/')[1]),
    frameCount: Number(video.nb_frames),
    audioStreamCount: probe.streams.filter(row => row.codec_type === 'audio').length,
  };
  const fontAssetInspections = await inspectedFiles(rendererTrust.fontAssets);
  const rendererDependencyInspections = await inspectedFiles(rendererTrust.rendererDependencies);
  const admissionInput = {
    job,
    instructionArtifact: artifact,
    cueEndProjection: projection,
    lineEndProjection: lineProjection,
    lineEndSourcePackage: sourcePackage,
    meaningPackage,
    timeline,
    styleProfileRegistry,
    materialRegistry,
    rendererTrust,
    mediaInspection,
    fontAssetInspections,
    rendererDependencyInspections,
    observedRuntimeBindings: structuredClone(verifiedRuntimeBindings),
    observedImplementationBindings: structuredClone(rendererImplementationBindings),
    outputPathsUnused: true,
  };
  const admission = inspectPresentationRendererAdmissionV001(admissionInput);
  assert.equal(admission.status, 'accepted', JSON.stringify(admission));
  const jobBytes = serializePresentationInstructionRendererJobV001(job);
  const rendererJobBinding = fileBinding(
    job.schemaVersion,
    'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'jobs/voice-013-instruction-render-v001.json',
    jobBytes,
    job,
  );
  const receiptResult = buildPresentationRendererAdmissionReceiptV001({
    job,
    rendererJobBinding,
    instructionArtifact: artifact,
    checks: admission.checks,
  });
  assert.equal(receiptResult.status, 'built');
  return {
    sourcePackage, sourceBytes, selection, selectionBytes, context,
    meaningPackage, meaningBytes, timeline, timelineBytes, artifact, artifactBytes,
    projection, lineProjection, lineProjectionBinding,
    styleProfileRegistry, materialRegistry, rendererTrust,
    mediaInspection, fontAssetInspections, rendererDependencyInspections,
    job, jobBytes, rendererJobBinding, admissionInput, admission,
    receipt: receiptResult.receipt,
  };
};

test('PRA001 renderer job exact schema・formal byte・未使用出力先', async () => {
  const fixture = await makeFixture();
  assert.equal(decodePresentationInstructionRendererJobV001(fixture.jobBytes).status, 'decoded');
  const extra = structuredClone(fixture.job);
  extra.runtimeProfile = {};
  assert.equal(validatePresentationInstructionRendererJobV001(extra).primaryCode,
    'RENDER_ADMISSION_INPUT_INVALID');
  assert.equal(inspectPresentationRendererAdmissionV001({
    ...fixture.admissionInput,
    outputPathsUnused: false,
  }).primaryCode, 'RENDER_ADMISSION_EXECUTION_INPUT_INVALID');
});

test('PRA002 注文書・projection・意味情報・timelineのstable再読と相互binding一致', async () => {
  const fixture = await makeFixture();
  for (const binding of [
    fixture.artifact.sourceBindings.meaningInformationPackage,
    fixture.artifact.sourceBindings.timeline,
  ]) {
    const [first, second] = await Promise.all([readFile(binding.path), readFile(binding.path)]);
    assert.deepEqual(first, second);
    assert.equal(fileSha(first), binding.fileSha256);
  }
  const invalid = structuredClone(fixture.admissionInput);
  invalid.timeline.schemaVersion = 'wrong-timeline-v001';
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_BINDING_MISMATCH');
  const replacedLine = structuredClone(fixture.admissionInput);
  replacedLine.lineEndProjection.captions[0].cues[0].cueEndBoundaryId =
    replacedLine.lineEndProjection.captions[0].cues[1].cueEndBoundaryId;
  assert.equal(inspectPresentationRendererAdmissionV001(replacedLine).primaryCode,
    'RENDER_ADMISSION_BINDING_MISMATCH');
});

test('PRA003 crop適用済み媒体4 bindingとframe/audio実体', async () => {
  const fixture = await makeFixture();
  for (const binding of Object.values(fixture.job.cropAppliedBaseMedia)) {
    const bytes = await readFile(binding.path);
    assert.equal(fileSha(bytes), binding.fileSha256);
  }
  assert.equal(fixture.mediaInspection.frameCount, 755);
  assert.equal(fixture.mediaInspection.audioStreamCount, 1);
  const invalid = structuredClone(fixture.admissionInput);
  invalid.mediaInspection.frameCount = 700;
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_MEDIA_INVALID');
});

test('PRA004 format/canvas/fpsの有限整数と媒体実体の整合', async () => {
  const fixture = await makeFixture();
  assert.deepEqual(fixture.job.executionInputs.canvas, {width: 1920, height: 1080, fps: 30});
  const invalid = structuredClone(fixture.admissionInput);
  invalid.mediaInspection.width = 1080;
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_CANVAS_FORMAT_INVALID');
});

test('PRA005 styleProfileIdとvisualStateIdが同じprofile配下に各一件だけ存在', async () => {
  const fixture = await makeFixture();
  const matches = fixture.styleProfileRegistry.presets.filter(
    row => row.presetId === fixture.artifact.styleProfileId,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].visualStates.filter(
    row => row.stateId === fixture.job.executionInputs.visualStateId,
  ).length, 1);
  const invalid = structuredClone(fixture.admissionInput);
  invalid.styleProfileRegistry.presets.push(structuredClone(matches[0]));
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_STYLE_INVALID');
  const duplicateState = structuredClone(fixture.admissionInput);
  duplicateState.styleProfileRegistry.presets[0].visualStates.push(
    structuredClone(matches[0].visualStates.find(
      row => row.stateId === fixture.job.executionInputs.visualStateId,
    )),
  );
  assert.equal(inspectPresentationRendererAdmissionV001(duplicateState).primaryCode,
    'RENDER_ADMISSION_STYLE_INVALID');
  const missingState = structuredClone(fixture.admissionInput);
  missingState.job.executionInputs.visualStateId = 'missing-visual-state-v001';
  assert.equal(inspectPresentationRendererAdmissionV001(missingState).primaryCode,
    'RENDER_ADMISSION_STYLE_INVALID');
});

test('PRA006 materialRefs全件がmaterial台帳に存在', async () => {
  const fixture = await makeFixture();
  assert.deepEqual(fixture.artifact.instructions.flatMap(row => row.materialRefs), []);
  const invalid = structuredClone(fixture.admissionInput);
  invalid.instructionArtifact.instructions[0].materialRefs.push('missing-material-v001');
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_MATERIAL_INVALID');
});

test('PRA007 使用書体がfont ledger sectionと実file SHAへ閉じる', async () => {
  const fixture = await makeFixture();
  assert.deepEqual(fixture.fontAssetInspections, fixture.rendererTrust.fontAssets.map(
    ({path: assetPath, fileSha256}) => ({path: assetPath, fileSha256}),
  ));
  const invalid = structuredClone(fixture.admissionInput);
  invalid.fontAssetInspections[0].fileSha256 = 'f'.repeat(64);
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_FONT_INVALID');
});

test('PRA008 renderer trust台帳・layout規則・tool binding成立', async () => {
  const fixture = await makeFixture();
  assert.equal(typeof fixture.rendererTrust.layoutRules.characterWidthRule, 'string');
  assert.equal(Object.keys(fixture.rendererTrust.toolVersions).length > 0, true);
  const invalid = structuredClone(fixture.admissionInput);
  invalid.rendererDependencyInspections[0].fileSha256 = 'f'.repeat(64);
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_TRUST_INVALID');
});

test('PRA009 renderer implementation全件のlive SHA一致', async () => {
  const fixture = await makeFixture();
  for (const binding of fixture.job.rendererImplementationBindings) {
    assert.equal(fileSha(await readFile(binding.path)), binding.fileSha256);
  }
  const invalid = structuredClone(fixture.admissionInput);
  invalid.observedImplementationBindings[0].fileSha256 = 'f'.repeat(64);
  assert.equal(inspectPresentationRendererAdmissionV001(invalid).primaryCode,
    'RENDER_ADMISSION_IMPLEMENTATION_INVALID');
  const runtimeInvalid = structuredClone(fixture.admissionInput);
  runtimeInvalid.observedRuntimeBindings.chromium.fileSha256 = 'e'.repeat(64);
  assert.equal(inspectPresentationRendererAdmissionV001(runtimeInvalid).primaryCode,
    'RENDER_ADMISSION_IMPLEMENTATION_INVALID');
});

test('PRA010 visual stateと実行値のjob所有・receipt同値・注文書内0件', async () => {
  const fixture = await makeFixture();
  for (const key of [
    'visualStateId', 'cropPolicy', 'sceneTransitionPolicy', 'audioPolicy', 'screenLayoutId',
    'lineLayoutRules', 'runtimeBindings',
  ]) assert.equal(JSON.stringify(fixture.artifact).includes(`\"${key}\"`), false, key);
  assert.equal(fixture.receipt.visualStateId, fixture.job.executionInputs.visualStateId);
  assert.deepEqual(fixture.receipt.lineEndProjectionBinding,
    fixture.job.lineEndProjectionBinding);
  assert.deepEqual(fixture.receipt.runtimeBindings, fixture.job.runtimeBindings);
  assert.equal(fixture.receipt.executionInputBindings.length, 8);
  assert.equal(fixture.receipt.executionInputBindings.filter(
    row => row.jsonPointer === '/executionInputs/visualStateId',
  ).length, 1);
  assert.equal(validatePresentationRendererAdmissionReceiptV001(
    fixture.receipt,
    {job: fixture.job},
  ).status, 'passed');
});

test('PRA011 receiptを描画work作成前に独立no-replace公開し、公開後再読一致', async () => {
  const fixture = await makeFixture();
  const root = await mkdtemp(path.join(tmpdir(), 'presentation-admission-'));
  const physicalRoot = await realpath(root);
  try {
    await assert.rejects(access(path.join(root, 'render-work')));
    const published = await publishPresentationRendererAdmissionReceiptNoReplaceV001({
      workspaceRoot: physicalRoot,
      stagingPath: 'admission-receipt.staging.json',
      outputPath: 'admission-receipt-v001.json',
      receipt: fixture.receipt,
    });
    assert.equal(published.status, 'published');
    const bytes = await readFile(path.join(root, 'admission-receipt-v001.json'));
    assert.equal(decodePresentationRendererAdmissionReceiptV001(bytes).status, 'decoded');
    assert.deepEqual(bytes, serializePresentationRendererAdmissionReceiptV001(fixture.receipt));
    const collision = await publishPresentationRendererAdmissionReceiptNoReplaceV001({
      workspaceRoot: physicalRoot,
      stagingPath: 'admission-receipt-second.staging.json',
      outputPath: 'admission-receipt-v001.json',
      receipt: fixture.receipt,
    });
    assert.equal(collision.primaryCode, 'RENDER_ADMISSION_PUBLICATION_FAILED');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('PRA012 receiptなし・差替え・既使用root・旧plan fallbackを全てfail-closed', async () => {
  const fixture = await makeFixture();
  assert.equal(decodePresentationRendererAdmissionReceiptV001(Buffer.alloc(0)).status, 'rejected');
  const replaced = structuredClone(fixture.receipt);
  replaced.executionInputBindings[0].valueCanonicalSha256 = 'f'.repeat(64);
  assert.equal(validatePresentationRendererAdmissionReceiptV001(
    replaced,
    {job: fixture.job},
  ).primaryCode, 'RENDER_ADMISSION_BINDING_MISMATCH');
  assert.equal(inspectPresentationRendererAdmissionV001({
    ...fixture.admissionInput,
    outputPathsUnused: false,
  }).primaryCode, 'RENDER_ADMISSION_EXECUTION_INPUT_INVALID');
  const oldPlan = structuredClone(fixture.job);
  oldPlan.oldRenderPlanBinding = fixture.context.baseMediaInput.timeline;
  assert.equal(validatePresentationInstructionRendererJobV001(oldPlan).primaryCode,
    'RENDER_ADMISSION_INPUT_INVALID');
  const missingLine = structuredClone(fixture.admissionInput);
  missingLine.job.lineEndProjectionBinding = null;
  assert.equal(inspectPresentationRendererAdmissionV001(missingLine).primaryCode,
    'RENDER_ADMISSION_BINDING_MISMATCH');
  const oldSelectionFallback = structuredClone(fixture.job);
  oldSelectionFallback.selectionBinding = fixture.selection.sourcePackageBinding;
  assert.equal(validatePresentationInstructionRendererJobV001(oldSelectionFallback).primaryCode,
    'RENDER_ADMISSION_INPUT_INVALID');
});

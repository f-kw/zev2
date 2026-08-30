import assert from 'node:assert/strict';
import {mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';

import {
  buildPresentationInstructionArtifactBindingV002,
} from './presentation_instruction_artifact_v002.mjs';
import {
  PRESENTATION_RENDERER_ADMISSION_CHECKS_V002,
  buildPresentationRendererAdmissionReceiptV002,
  decodePresentationInstructionRendererJobV002,
  decodePresentationRendererAdmissionReceiptV002,
  inspectPresentationRendererAdmissionV002,
  publishPresentationRendererAdmissionReceiptNoReplaceV002,
  serializePresentationInstructionRendererJobV002,
  serializePresentationRendererAdmissionReceiptV002,
  validatePresentationInstructionRendererJobV002,
  validatePresentationRendererAdmissionReceiptV002,
} from './presentation_renderer_admission_receipt_v002.mjs';
import {
  PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH,
  buildActualCandidateInstructionFixtureV002,
  buildFormalFixtureBindingV001,
  canonicalFixtureShaV001,
  formalFixtureBytesV001,
  sha256FixtureBytesV001,
} from './presentation_instruction_timeline_v003_fixture_v001.mjs';

const BASE_ROOT = 'evals/clip_composition/outputs/presentation/base-media/'
  + 'distant-connection-candidate-horror-claim-to-speed-up-audio-grid-v003';
const BASE_MEDIA_PATH = `${BASE_ROOT}/base-media.mp4`;
const MANIFEST_PATH = `${BASE_ROOT}/generation-manifest.json`;
const REPORT_PATH = `${BASE_ROOT}/validation-report.json`;
const SOURCE_FIXTURE_PATH = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures/source-package-v001.json';
const TRUST_PATH = 'evals/clip_composition/registries/presentation/'
  + 'presentation-renderer-trust-v002/trust.json';
const HASH = '0'.repeat(64);
const OLD_ADMISSION_SHA = 'd0056889b76bee5a75f94701bd10d1c9687d1af68e66a5e570e971de09d0a75a';
const actualFileBinding = (schemaVersion, filePath, bytes, value) => ({
  schemaVersion,
  path: filePath,
  fileSha256: sha256FixtureBytesV001(bytes),
  canonicalSha256: sha256FixtureBytesV001(canonicalJson(value)),
});

const makeFixture = async () => {
  const instruction = await buildActualCandidateInstructionFixtureV002();
  const sourceFixture = JSON.parse(await readFile(SOURCE_FIXTURE_PATH, 'utf8'));
  const styleContext = sourceFixture.reconstructionMap.caseContexts[0];
  const [styleBytes, materialBytes, trustBytes, manifestBytes, reportBytes, mediaBytes] =
    await Promise.all([
      readFile(styleContext.styleBindings.presetRegistry.path),
      readFile(styleContext.styleBindings.materialValidationIndex.path),
      readFile(TRUST_PATH),
      readFile(MANIFEST_PATH),
      readFile(REPORT_PATH),
      readFile(BASE_MEDIA_PATH),
    ]);
  const styleProfileRegistry = JSON.parse(styleBytes);
  const materialRegistry = JSON.parse(materialBytes);
  const rendererTrust = JSON.parse(trustBytes);
  const manifest = JSON.parse(manifestBytes);
  const validationReport = JSON.parse(reportBytes);
  const instructionArtifactBinding = buildPresentationInstructionArtifactBindingV002({
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'candidate-horror-claim-to-speed-up/presentation-instruction-v002.json',
    artifact: instruction.artifact,
  });
  const styleBinding = actualFileBinding(
    styleProfileRegistry.schemaVersion,
    styleContext.styleBindings.presetRegistry.path,
    styleBytes,
    styleProfileRegistry,
  );
  const materialBinding = actualFileBinding(
    materialRegistry.registryVersion,
    styleContext.styleBindings.materialValidationIndex.path,
    materialBytes,
    materialRegistry,
  );
  const trustBinding = actualFileBinding(
    rendererTrust.schemaVersion, TRUST_PATH, trustBytes, rendererTrust,
  );
  const runtimeBindings = Object.fromEntries(
    ['ffmpeg', 'ffprobe', 'imageMagick', 'remotion', 'tsx', 'chromium'].map(
      role => [role, {path: `/runtime/${role}`, fileSha256: HASH}],
    ),
  );
  const implementationBindings = [{
    role: 'renderer-admission-v002',
    path: 'evals/clip_composition/presentation_renderer_admission_receipt_v002.mjs',
    fileSha256: HASH,
  }];
  const job = {
    schemaVersion: 'presentation-instruction-renderer-job-v002',
    jobId: 'candidate-horror-claim-to-speed-up-render-v002',
    attemptId: 'attempt-0001',
    instructionArtifactBinding,
    lineEndProjectionBinding: instruction.lineProjectionBinding,
    cropAppliedBaseMedia: {
      baseMedia: {path: BASE_MEDIA_PATH, fileSha256: sha256FixtureBytesV001(mediaBytes)},
      timeline: buildFormalFixtureBindingV001(
        instruction.timeline.schemaVersion,
        PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH,
        instruction.timeline,
      ),
      generationManifest: actualFileBinding(
        manifest.schemaVersion, MANIFEST_PATH, manifestBytes, manifest,
      ),
      validationReceipt: actualFileBinding(
        validationReport.schemaVersion, REPORT_PATH, reportBytes, validationReport,
      ),
    },
    executionInputs: {
      format: 'normal-landscape',
      canvas: {width: 1920, height: 1080, fps: 30},
      screenLayoutId: null,
      visualStateId: 'caption-core-v001',
      cropPolicy: {mode: 'already-applied'},
      sceneTransitionPolicy: {mode: 'straight-cut'},
      audioPolicy: {mode: 'preserve-source'},
      lineLayoutRules: {
        'speech-caption': 'semantic-line-end-projection-v001',
        title: 'greedy-code-point-v001',
      },
    },
    registryBindings: {
      styleProfileRegistry: styleBinding,
      materialRegistry: materialBinding,
      fontLedger: {
        ...trustBinding,
        jsonPointer: '/fontAssets',
        valueCanonicalSha256: canonicalFixtureShaV001(rendererTrust.fontAssets),
      },
      rendererTrust: trustBinding,
    },
    runtimeBindings,
    rendererImplementationBindings: implementationBindings,
    approvedContractBindings: [{
      role: 'presentation-timeline-v003-forward-only-approval',
      path: 'docs/ADVISOR_LEDGER.md',
      fileSha256: HASH,
    }],
    publication: {
      admissionReceiptPath: 'out/admission-receipt-v002.json',
      lineLayoutPath: 'out/line-layout-v001.json',
      renderOutputRoot: 'out/render-v002',
    },
  };
  const mediaInspection = {
    path: BASE_MEDIA_PATH,
    fileSha256: sha256FixtureBytesV001(mediaBytes),
    width: 1920,
    height: 1080,
    fps: 30,
    frameCount: instruction.timeline.baseMedia.expectedFrameCount,
    audioStreamCount: 1,
  };
  const fontAssetInspections = await Promise.all(rendererTrust.fontAssets.map(async row => ({
    path: row.path,
    fileSha256: sha256FixtureBytesV001(await readFile(row.path)),
  })));
  const rendererDependencyInspections = await Promise.all(
    rendererTrust.rendererDependencies.map(async row => ({
      path: row.path,
      fileSha256: sha256FixtureBytesV001(await readFile(row.path)),
    })),
  );
  const admissionInput = {
    job,
    instructionArtifact: instruction.artifact,
    cueEndProjection: instruction.projection,
    lineEndProjection: instruction.lineProjection,
    lineEndSourcePackage: instruction.sourcePackage,
    meaningPackage: instruction.meaningPackage,
    timeline: instruction.timeline,
    styleProfileRegistry,
    materialRegistry,
    rendererTrust,
    mediaInspection,
    fontAssetInspections,
    rendererDependencyInspections,
    observedRuntimeBindings: structuredClone(runtimeBindings),
    observedImplementationBindings: structuredClone(implementationBindings),
    outputPathsUnused: true,
  };
  const admission = inspectPresentationRendererAdmissionV002(admissionInput);
  assert.equal(admission.status, 'accepted', JSON.stringify(admission));
  const rendererJobBinding = buildFormalFixtureBindingV001(
    job.schemaVersion,
    'out/renderer-job-v002.json',
    job,
  );
  const receiptResult = buildPresentationRendererAdmissionReceiptV002({
    job,
    rendererJobBinding,
    instructionArtifact: instruction.artifact,
    checks: admission.checks,
  });
  assert.equal(receiptResult.status, 'built', JSON.stringify(receiptResult));
  return {instruction, job, admissionInput, admission, receipt: receiptResult.receipt};
};

test('PRA2-001 実候補のtimeline v003と+16msを正式admissionへ通す', async () => {
  const fixture = await makeFixture();
  assert.equal(fixture.instruction.timeline.sourceFrameClock.videoPresentationOffsetMs, 16);
  assert.equal(fixture.admission.status, 'accepted');
  assert.equal(fixture.admission.checks.length, PRESENTATION_RENDERER_ADMISSION_CHECKS_V002.length);
});

test('PRA2-002 job/receipt formal byteは決定的でschema外fieldを拒否する', async () => {
  const first = await makeFixture();
  const second = await makeFixture();
  const firstJob = serializePresentationInstructionRendererJobV002(first.job);
  const secondJob = serializePresentationInstructionRendererJobV002(second.job);
  assert.deepEqual(firstJob, secondJob);
  assert.equal(decodePresentationInstructionRendererJobV002(firstJob).status, 'decoded');
  const firstReceipt = serializePresentationRendererAdmissionReceiptV002(first.receipt);
  assert.equal(decodePresentationRendererAdmissionReceiptV002(firstReceipt).status, 'decoded');
  const extra = structuredClone(first.job);
  extra.videoClockOffsetMs = 16;
  assert.equal(validatePresentationInstructionRendererJobV002(extra).status, 'rejected');
});

test('PRA2-003 instruction/timeline/line projectionのSHA差をfail-closedにする', async () => {
  const fixture = await makeFixture();
  for (const mutate of [
    input => { input.job.instructionArtifactBinding.fileSha256 = '1'.repeat(64); },
    input => { input.job.cropAppliedBaseMedia.timeline.fileSha256 = '1'.repeat(64); },
    input => { input.job.lineEndProjectionBinding.fileSha256 = '1'.repeat(64); },
  ]) {
    const input = structuredClone(fixture.admissionInput);
    mutate(input);
    assert.equal(inspectPresentationRendererAdmissionV002(input).status, 'rejected');
  }
});

test('PRA2-004 timeline v002と旧manifestをrenderer jobへ混入させない', async () => {
  const {job} = await makeFixture();
  const oldTimeline = structuredClone(job);
  oldTimeline.cropAppliedBaseMedia.timeline.schemaVersion = 'presentation-base-media-timeline-v002';
  assert.equal(validatePresentationInstructionRendererJobV002(oldTimeline).status, 'rejected');
  const oldManifest = structuredClone(job);
  oldManifest.cropAppliedBaseMedia.generationManifest.schemaVersion =
    'presentation-base-media-generation-manifest-v002';
  assert.equal(validatePresentationInstructionRendererJobV002(oldManifest).status, 'rejected');
});

test('PRA2-005 receipt no-replace公開と再読検査', async () => {
  const {receipt} = await makeFixture();
  const created = await mkdtemp(path.join(tmpdir(), 'presentation-admission-v002-'));
  const root = await realpath(created);
  try {
    const published = await publishPresentationRendererAdmissionReceiptNoReplaceV002({
      workspaceRoot: root,
      stagingPath: 'receipt.staging.json',
      outputPath: 'receipt.json',
      receipt,
    });
    assert.equal(published.status, 'published');
    assert.equal(decodePresentationRendererAdmissionReceiptV002(
      await readFile(path.join(root, 'receipt.json')),
    ).status, 'decoded');
    assert.equal((await publishPresentationRendererAdmissionReceiptNoReplaceV002({
      workspaceRoot: root,
      stagingPath: 'receipt.second.staging.json',
      outputPath: 'receipt.json',
      receipt,
    })).status, 'rejected');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('PRA2-006 receipt bindingと候補完全被覆を保持する', async () => {
  const {receipt, job, instruction} = await makeFixture();
  assert.equal(validatePresentationRendererAdmissionReceiptV002(receipt, {job}).status, 'passed');
  assert.deepEqual(receipt.instructionSourceBindings.timeline,
    instruction.artifact.sourceBindings.timeline);
  assert.equal(instruction.artifact.instructions.length, 2);
});

test('PRA2-007 旧admission v001実装byteを不変保持する', async () => {
  assert.equal(
    sha256FixtureBytesV001(
      await readFile('evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs'),
    ),
    OLD_ADMISSION_SHA,
  );
});

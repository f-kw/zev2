import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {buildPresentationResolutionPackageV002} from './build_presentation_resolution_package_v002.mjs';
import {runPresentationBaseMediaBuildJobFileV001} from './presentation_base_media_build_v001.mjs';
import {PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES} from './presentation_base_media_timeline_v002.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationInstructionContract} from './presentation_instruction_contract_v002.mjs';
import {
  PRESENTATION_RENDERER_OUTPUT_NAMES,
  executePresentationRendererV002,
} from './render_presentation_v002.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const REGISTRY_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'registries/presentation/normal-landscape-preset-registry-v001',
);
const PRESET_REGISTRY_PATH = path.join(REGISTRY_DIRECTORY, 'preset-registry.json');
const PRESET_INDEX_PATH = path.join(REGISTRY_DIRECTORY, 'preset-validation-index.json');
const MATERIAL_INDEX_PATH = path.join(REGISTRY_DIRECTORY, 'material-validation-index.json');
const REGISTRY_BINDING_PATH = path.join(REGISTRY_DIRECTORY, 'trusted-registry-bindings.json');
const RUNTIME_PARENT = path.join(MODULE_DIRECTORY, 'testdata/presentation-renderer-v002');
const BASE_MEDIA_OUTPUT_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation/base-media');
const RENDER_OUTPUT_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation/renderer-v002-builder-e2e');

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const repoPath = (value) => path.relative(WORKSPACE_ROOT, value);
const readJson = async (value) => JSON.parse(await readFile(value, 'utf8'));
const writeJson = async (value, data) => {
  const bytes = Buffer.from(`${JSON.stringify(data, null, 2)}\n`);
  await writeFile(value, bytes);
  return sha256Bytes(bytes);
};
const fileSha256 = async (value) => sha256Bytes(await readFile(value));

const run = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp'},
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout).toString(),
    stderr: Buffer.concat(stderr).toString(),
  }));
});

const mediaStreamTypes = async (mediaPath) => {
  const result = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_type',
    '-of', 'json',
    mediaPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout).streams.map(({codec_type: codecType}) => codecType).sort();
};

const runBuilderRendererCase = async ({
  sourceBuildArgs,
  sourceProvenance,
  sourceRef,
  segments,
  sourceAtom,
  verify,
}) => {
  await Promise.all([
    mkdir(RUNTIME_PARENT, {recursive: true}),
    mkdir(BASE_MEDIA_OUTPUT_ROOT, {recursive: true}),
    mkdir(RENDER_OUTPUT_ROOT, {recursive: true}),
  ]);
  const runtime = await mkdtemp(path.join(RUNTIME_PARENT, '.runtime-e2e-'));
  const suffix = `${process.pid}-${path.basename(runtime)}`;
  const baseOutput = path.join(BASE_MEDIA_OUTPUT_ROOT, `builder-renderer-e2e-${suffix}`);
  const renderOutput = path.join(RENDER_OUTPUT_ROOT, suffix);
  try {
    const sourceMediaPath = path.join(runtime, 'source.mp4');
    const sourceBuild = await run('ffmpeg', sourceBuildArgs(sourceMediaPath));
    assert.equal(sourceBuild.code, 0, sourceBuild.stderr);

    const sourceMediaSha256 = await fileSha256(sourceMediaPath);
    const basisEditPlanPath = path.join(runtime, 'basis-edit-plan.json');
    const basisEditPlanSha256 = await writeJson(basisEditPlanPath, {
      kind: 'edit_plan_json',
      sourceProvenance,
      sourceRef,
      note: '統合試験用の承認済み区間列だけを基礎映像へ渡す',
    });
    const decisionPayload = {
      basisEditPlan: {
        kind: 'edit_plan_json',
        path: repoPath(basisEditPlanPath),
        fileSha256: basisEditPlanSha256,
      },
      sourceArtifact: {
        sourceProvenance,
        sourceRef,
        sourceUri: 'synthetic://builder-renderer-v002-e2e',
        fileSha256: sourceMediaSha256,
      },
      segments,
      unresolvedEdits: [],
    };
    const assemblyDecision = {
      schemaVersion: 'presentation-base-media-assembly-decision-v001',
      decisionId: 'builder-renderer-e2e-decision-v001',
      payload: decisionPayload,
      approval: {
        status: 'approved',
        approverType: 'human',
        recordId: 'builder-renderer-e2e-human-approval-v001',
        recordedAt: '2026-07-21T00:00:00Z',
        targetPayloadSha256: sha256Canonical(decisionPayload),
      },
    };
    const decisionPath = path.join(runtime, 'assembly-decision.json');
    const decisionSha256 = await writeJson(decisionPath, assemblyDecision);
    const baseBuildJob = {
      schemaVersion: 'presentation-base-media-build-job-v001',
      jobId: 'builder-renderer-e2e-base-job-v001',
      assemblyDecision: {path: repoPath(decisionPath), fileSha256: decisionSha256},
      sourceArtifact: {
        sourceProvenance,
        sourceRef,
        sourceUri: decisionPayload.sourceArtifact.sourceUri,
        path: repoPath(sourceMediaPath),
        fileSha256: sourceMediaSha256,
      },
      outputDirectory: repoPath(baseOutput),
    };
    const baseBuildJobPath = path.join(runtime, 'base-build-job.json');
    await writeJson(baseBuildJobPath, baseBuildJob);
    const baseBuild = await runPresentationBaseMediaBuildJobFileV001(baseBuildJobPath);
    assert.equal(baseBuild.exitCode, 0, JSON.stringify(baseBuild.result?.violations ?? [], null, 2));

    const [timeline, baseGenerationManifest] = await Promise.all([
      readJson(path.join(baseOutput, 'timeline.json')),
      readJson(path.join(baseOutput, 'generation-manifest.json')),
    ]);
    assert.equal(timeline.schemaVersion, 'presentation-base-media-timeline-v002');
    assert.equal(timeline.sourceProvenance, sourceProvenance);
    assert.equal(timeline.sourceRef, sourceRef);
    assert.equal(baseGenerationManifest.source.sourceProvenance, sourceProvenance);
    assert.equal(baseGenerationManifest.source.sourceRef, sourceRef);
    const sourceAtoms = [{...sourceAtom, sourceRef}];
    const sourceArtifactPath = path.join(runtime, 'source-atoms.json');
    const sourceArtifactSha256 = await writeJson(sourceArtifactPath, {sourceProvenance, sourceRef, sourceAtoms});
    const builtResolution = buildPresentationResolutionPackageV002({
      schemaVersion: 'presentation-resolution-package-build-request-v001',
      resolutionPackageId: 'builder-renderer-e2e-resolution-v001',
      sourceProvenance,
      atomGranularity: 'word-timestamp',
      rawSourceAtoms: sourceAtoms,
      targets: [{
        targetRefId: 'e2e-caption-target',
        targetType: 'caption-target',
        captionContractRefId: 'e2e-caption-contract',
        cueId: 'e2e-cue-001',
      }],
      captionContracts: [{
        captionContractRefId: 'e2e-caption-contract',
        captionSchemaVersion: 'presentation-caption-check-v002',
        captionTargets: [{
          targetId: 'e2e-caption-source-target',
          requiredAtomIds: [sourceAtom.atomId],
          allowedOmissionAtomIds: [],
        }],
        allowedSimultaneousGroups: [],
        captionPlan: {cues: [{
          cueId: 'e2e-cue-001',
          targetId: 'e2e-caption-source-target',
          lines: [{atomIds: [sourceAtom.atomId], renderedText: sourceAtom.text}],
          startAnchor: {atomId: sourceAtom.atomId, edge: 'start'},
          endAnchor: {atomId: sourceAtom.atomId, edge: 'end'},
          startMs: sourceAtom.startMs,
          endMs: sourceAtom.endMs,
        }]},
      }],
      sourceArtifacts: [{
        sourceRef,
        path: repoPath(sourceArtifactPath),
        fileSha256: sourceArtifactSha256,
      }],
    });
    const [presetValidationIndex, materialValidationIndex, binding, presetRegistry] = await Promise.all([
      readJson(PRESET_INDEX_PATH),
      readJson(MATERIAL_INDEX_PATH),
      readJson(REGISTRY_BINDING_PATH),
      readJson(PRESET_REGISTRY_PATH),
    ]);
    const resolutionPackageSha256 = sha256Canonical(builtResolution.resolutionPackage);
    const instructionBundle = {
      schemaVersion: 'presentation-instruction-check-v002',
      instructionSet: {
        schemaVersion: 'zev-presentation-instruction-v002',
        instructionSetId: 'builder-renderer-e2e-instruction-set-v001',
        format: 'normal-landscape',
        rendererContractVersion: 'zev-renderer-boundary-v002',
        sourceProvenance,
        resolutionPackageId: builtResolution.resolutionPackage.resolutionPackageId,
        resolutionPackageSha256,
        presetRegistryVersion: presetValidationIndex.registryVersion,
        materialRegistryVersion: materialValidationIndex.registryVersion,
        instructions: [{
          instructionId: 'builder-renderer-e2e-caption-instruction',
          trigger: {startAtomId: sourceAtom.atomId},
          kind: 'speech-caption',
          target: {targetType: 'caption-target', targetRefIds: ['e2e-caption-target']},
          presetId: 'normal-landscape-readable-pop-v001',
          materialRefs: [],
        }],
      },
      resolutionPackage: builtResolution.resolutionPackage,
      presetValidationIndex,
      materialValidationIndex,
    };
    assert.equal(
      validatePresentationInstructionContract(instructionBundle, binding).overallStatus,
      'passed',
    );
    const instructionBundlePath = path.join(runtime, 'instruction-bundle.json');
    const resolutionGenerationPath = path.join(runtime, 'resolution-generation-manifest.json');
    const [instructionBundleFileSha256, resolutionGenerationFileSha256] = await Promise.all([
      writeJson(instructionBundlePath, instructionBundle),
      writeJson(resolutionGenerationPath, builtResolution.generationManifest),
    ]);
    const rendererJob = {
      schemaVersion: 'presentation-render-job-v002',
      instructionBundle: {path: instructionBundlePath, fileSha256: instructionBundleFileSha256},
      registryBinding: {path: REGISTRY_BINDING_PATH, fileSha256: await fileSha256(REGISTRY_BINDING_PATH)},
      presetRegistry: {path: PRESET_REGISTRY_PATH, canonicalSha256: sha256Canonical(presetRegistry)},
      resolutionGenerationManifest: {
        path: resolutionGenerationPath,
        fileSha256: resolutionGenerationFileSha256,
      },
      baseMediaGenerationManifest: {
        path: path.join(baseOutput, 'generation-manifest.json'),
        fileSha256: await fileSha256(path.join(baseOutput, 'generation-manifest.json')),
      },
      baseMediaTimeline: {
        path: path.join(baseOutput, 'timeline.json'),
        fileSha256: await fileSha256(path.join(baseOutput, 'timeline.json')),
      },
      outputDirectory: renderOutput,
    };
    const rendered = await executePresentationRendererV002(rendererJob);
    assert.equal(rendered.exitCode, 0, JSON.stringify(rendered.failure ?? null, null, 2));

    const [plan, manifest, qc] = await Promise.all([
      readJson(path.join(renderOutput, PRESENTATION_RENDERER_OUTPUT_NAMES.plan)),
      readJson(path.join(renderOutput, PRESENTATION_RENDERER_OUTPUT_NAMES.manifest)),
      readJson(path.join(renderOutput, PRESENTATION_RENDERER_OUTPUT_NAMES.qc)),
    ]);
    assert.equal(plan.schemaVersion, 'presentation-render-plan-v002');
    assert.equal(plan.timelineSchemaVersion, 'presentation-base-media-timeline-v002');
    assert.equal(plan.elements.length, 1);
    assert.equal(manifest.schemaVersion, 'presentation-render-manifest-v002');
    assert.equal(manifest.baseMediaBuildId, baseGenerationManifest.buildId);
    assert.equal(manifest.timelineId, timeline.timelineId);
    assert.equal(qc.schemaVersion, 'presentation-render-qc-v002');
    assert.equal(qc.status, 'passed');
    assert.ok((await stat(path.join(renderOutput, PRESENTATION_RENDERER_OUTPUT_NAMES.video))).isFile());
    await assert.rejects(stat(path.join(renderOutput, 'presentation-rendered-v001.mp4')));
    await assert.rejects(stat(path.join(renderOutput, 'presentation-render-plan-v001.json')));
    await verify?.({
      baseGenerationManifest,
      baseOutput,
      manifest,
      plan,
      qc,
      renderOutput,
      timeline,
    });
  } finally {
    await Promise.all([
      rm(runtime, {recursive: true, force: true}),
      rm(baseOutput, {recursive: true, force: true}),
      rm(renderOutput, {recursive: true, force: true}),
    ]);
  }
};

test('承認済みdecisionから実builder成果物を作りrenderer v002正式入口へ直結する', async () => {
  await runBuilderRendererCase({
    sourceBuildArgs: (sourceMediaPath) => [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=0x152238:s=1920x1080:r=30:d=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=3',
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-movie_timescale', '30', '-shortest', '-movflags', '+faststart',
      sourceMediaPath,
    ],
    sourceProvenance: 'builder-renderer-e2e-source-provenance-v001',
    sourceRef: 'builder-renderer-e2e-source-v001',
    segments: [{sourceStartMs: 0, sourceEndMs: 3000}],
    sourceAtom: {
      atomId: 'e2e-a-01',
      speechId: 1,
      speaker: 'E2E_SPEAKER',
      text: '統合確認です',
      startMs: 800,
      endMs: 1800,
    },
    verify: async ({baseGenerationManifest}) => {
      assert.deepEqual(
        baseGenerationManifest.execution.commands.map(({stage}) => stage),
        ['video-build', 'audio-grid', 'audio-mux'],
      );
      assert.deepEqual(
        baseGenerationManifest.execution.trustedSourceFiles,
        PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
      );
    },
  });
});

test('60fps無音声・非frame境界・空きを持つ複数区間をglobal-evenで連結してrenderer v002へ渡す', async () => {
  await runBuilderRendererCase({
    sourceBuildArgs: (sourceMediaPath) => [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc2=s=1920x1080:r=60:d=3',
      '-map', '0:v:0', '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-movie_timescale', '60', '-movflags', '+faststart', '-map_metadata', '-1',
      sourceMediaPath,
    ],
    sourceProvenance: 'builder-renderer-e2e-60fps-source-provenance-v001',
    sourceRef: 'builder-renderer-e2e-60fps-source-v001',
    segments: [
      {sourceStartMs: 17, sourceEndMs: 1017},
      {sourceStartMs: 1517, sourceEndMs: 2517},
    ],
    sourceAtom: {
      atomId: 'e2e-60fps-a-01',
      speechId: 1,
      speaker: 'E2E_SPEAKER',
      text: '六十fps統合確認です',
      startMs: 1617,
      endMs: 2217,
    },
    verify: async ({baseGenerationManifest, baseOutput, plan, renderOutput, timeline}) => {
      assert.equal(timeline.sourceFrameClock.inputFrameRate, '60/1');
      assert.equal(
        timeline.sourceFrameClock.extractionRuleId,
        'source-frame-60fps-global-even-v001',
      );
      assert.deepEqual(
        timeline.segments.map((segment) => [
          segment.sourceStartMs,
          segment.sourceEndMs,
          segment.sourceStartFrame30,
          segment.sourceEndFrame30,
          segment.outputStartFrame,
          segment.outputEndFrame,
        ]),
        [
          [17, 1017, 1, 31, 0, 30],
          [1517, 2517, 46, 76, 30, 60],
        ],
      );
      assert.equal(timeline.baseMedia.expectedFrameCount, 60);
      assert.equal(baseGenerationManifest.audio.present, false);
      assert.deepEqual(
        baseGenerationManifest.execution.commands.map(({stage}) => stage),
        ['video-build'],
      );
      assert.deepEqual(
        baseGenerationManifest.execution.trustedSourceFiles,
        PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
      );
      assert.equal(baseGenerationManifest.outputs.baseMedia.audioPacketPayloadSha256, null);
      assert.deepEqual(
        await mediaStreamTypes(path.join(baseOutput, 'base-media.mp4')),
        ['video'],
      );
      assert.deepEqual(
        await mediaStreamTypes(path.join(renderOutput, PRESENTATION_RENDERER_OUTPUT_NAMES.video)),
        ['video'],
      );
      assert.deepEqual(
        [
          plan.elements[0].timelineSegmentId,
          plan.elements[0].startFrame,
          plan.elements[0].endFrameExclusive,
        ],
        ['segment-0002', 33, 51],
      );
    },
  });
});

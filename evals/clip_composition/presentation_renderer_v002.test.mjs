import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationResolutionPackageV002,
} from './build_presentation_resolution_package_v002.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  frameBoundaryV001 as timelineFrameBoundaryV001,
  mapPresentationSourceIntervalV002,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  validatePresentationInstructionContract,
} from './presentation_instruction_contract_v002.mjs';
import {
  PRESENTATION_RENDERER_CORE_VIOLATION_CODES,
  PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
  buildPresentationRendererPlanV002,
  evaluatePresentationRendererToolVersionsV001,
  evaluatePresentationRendererTrustRootV001,
  evaluatePresentationRendererTrustedArtifactV001,
  loadAndValidatePresentationRendererTrustV001,
} from './presentation_renderer_plan_v002.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  audioPacketPayloadSha256V002,
  evaluatePresentationRendererQcV002,
  fileSha256V002,
  inspectRenderedMediaV002,
} from './presentation_renderer_qc_v002.mjs';
import {
  PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
  frameBoundaryV001,
  indexExplicitLinesV001,
  layoutUnicodeCodePointsV001,
  mapOutputIntervalToFramesV001,
  transitionAlphaV001,
  validateIndexedLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_RENDERER_OUTPUT_NAMES,
  PRESENTATION_RENDERER_VIOLATION_CODES,
  acquirePresentationOutputReservationV002,
  buildPresentationRenderApplicationResultsV002,
  classifyPresentationRenderErrorV002,
  commitValidatedPresentationArtifactsV002,
  ensureDirectoryChainNoSymlinkV002,
  executePresentationRendererV002,
  publishPresentationArtifactsV002,
  runPresentationRendererJobFileV002,
  validateBaseMediaToolProfileV002,
  validateOverlayDeterminismV002,
  validatePresentationRenderJobV002,
  validatePresentationRendererSourceBindingV002,
  validateResolutionGenerationManifestV001,
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
const TRUST_PATH = path.join(
  MODULE_DIRECTORY,
  'registries/presentation/presentation-renderer-trust-v001/trust.json',
);
const SYNTHETIC_SOURCE_PATH = path.join(
  MODULE_DIRECTORY,
  'testdata/presentation-renderer-v002/synthetic-source.json',
);
const SYNTHETIC_TEST_OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/renderer-v002-synthetic-test',
);
const RENDERER_CLI_PATH = path.join(MODULE_DIRECTORY, 'render_presentation_v002.mjs');
const rendererPlanModulePromise = import('./presentation_renderer_plan_v002.mjs');
const SIMULTANEOUS_CAPTION_PATH = path.join(
  MODULE_DIRECTORY,
  'testdata/presentation-caption-contract-v002/valid-simultaneous-future-contract.json',
);

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const clone = (value) => structuredClone(value);
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(filePath, bytes);
  return sha256Bytes(bytes);
};

const observedCodes = new Set();
const observeViolations = (value) => {
  for (const violation of value?.violations ?? []) observedCodes.add(violation.code);
  return value;
};
const codesOf = (value) => (value?.violations ?? []).map((item) => item.code);
const assertHasCode = (value, code) => {
  observeViolations(value);
  assert.ok(codesOf(value).includes(code), `${code} was not observed: ${JSON.stringify(value?.violations ?? [])}`);
};
const assertRejectsOutputCode = async (promise, code) => {
  await assert.rejects(promise, (error) => {
    if (error?.rendererViolationCode === code) {
      observedCodes.add(code);
      return true;
    }
    return false;
  });
};

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp', ...(options.env ?? {})},
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

const extractFrame = async (videoPath, frame, outputPath) => {
  const result = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', videoPath,
    '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', outputPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
};

const imageRmse = async (leftPath, rightPath) => {
  const result = await run('magick', ['compare', '-metric', 'RMSE', leftPath, rightPath, 'null:']);
  assert.ok([0, 1].includes(result.code), result.stderr);
  const output = result.stderr.trim();
  const normalized = output.match(/\(([-+0-9.eE]+)\)/)?.[1] ?? output.split(/\s+/)[0];
  const value = Number(normalized);
  assert.ok(Number.isFinite(value), `RMSEを読めません: ${output}`);
  return value;
};

const flattenOverlayOnBlack = async (overlayPath, outputPath) => {
  const result = await run('magick', [
    '-size', '1920x1080', 'xc:black', overlayPath, '-composite', outputPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
};

const positiveIntersection = (left, right) => ({
  width: Math.min(left.right, right.right) - Math.max(left.left, right.left),
  height: Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
});

const formalAssetsPromise = Promise.all([
  readJson(PRESET_REGISTRY_PATH),
  readJson(PRESET_INDEX_PATH),
  readJson(MATERIAL_INDEX_PATH),
  readJson(REGISTRY_BINDING_PATH),
  readJson(TRUST_PATH),
]).then(([presetRegistry, presetValidationIndex, materialValidationIndex, binding, trust]) => ({
  presetRegistry,
  presetValidationIndex,
  materialValidationIndex,
  binding,
  trust,
}));

const makeSourceAtoms = () => [
  // 各表示の間に6 frameの空白を置き、実合成frameで区間外alpha=0を観測できるようにする。
  {atomId: 'a-01', speechId: 1, speaker: 'SPEAKER_SOURCE_CAPTION', text: '発話。', startMs: 1000, endMs: 1800},
  {atomId: 'a-02', speechId: 2, speaker: 'SPEAKER_SOURCE_IMPORTANT', text: ' 重要 ', startMs: 2000, endMs: 2800},
  {atomId: 'a-03', speechId: 3, speaker: 'SPEAKER_SOURCE_MISTAKE', text: '間違い\n発見', startMs: 3000, endMs: 3800},
  {atomId: 'a-04', speechId: 4, speaker: 'SPEAKER_SOURCE_DISCOVERY', text: '見つけた', startMs: 4000, endMs: 4800},
  {atomId: 'a-05', speechId: 5, speaker: 'SPEAKER_SOURCE_EMOTION', text: '強い感情', startMs: 6000, endMs: 6800},
  {atomId: 'a-06', speechId: 6, speaker: 'SPEAKER_SOURCE_COMMENT', text: 'コメント', startMs: 7000, endMs: 7800},
  {atomId: 'a-07', speechId: 7, speaker: 'SPEAKER_SOURCE_NARRATION', text: '説明', startMs: 8000, endMs: 8800},
  {atomId: 'a-08', speechId: 8, speaker: 'SPEAKER_SOURCE_LYRICS', text: '歌詞', startMs: 9000, endMs: 9800},
  {atomId: 'a-09', speechId: 9, speaker: 'SOURCE_LABEL_MUST_NOT_RENDER', text: '元話者ラベル', startMs: 10000, endMs: 10800},
];

const TARGETS = [
  {
    targetRefId: 'target-caption',
    targetType: 'caption-target',
    captionContractRefId: 'caption-contract-001',
    cueId: 'cue-001',
  },
  {targetRefId: 'target-important', targetType: 'source-atom-range', sourceAtomIds: ['a-02']},
  {targetRefId: 'target-mistake', targetType: 'source-atom-range', sourceAtomIds: ['a-03']},
  {targetRefId: 'target-discovery', targetType: 'source-atom-range', sourceAtomIds: ['a-04']},
  {targetRefId: 'target-emotion', targetType: 'source-atom-range', sourceAtomIds: ['a-05']},
  {
    targetRefId: 'target-comment',
    targetType: 'information-item',
    informationItemId: 'information-comment-001',
    sourceAtomIds: ['a-06'],
    speakerId: 'speaker-korone',
  },
  {
    targetRefId: 'target-narration',
    targetType: 'information-item',
    informationItemId: 'information-narration-001',
    sourceAtomIds: ['a-07'],
  },
  {
    targetRefId: 'target-lyrics',
    targetType: 'information-item',
    informationItemId: 'information-lyrics-001',
    sourceAtomIds: ['a-08'],
  },
  {
    targetRefId: 'target-speaker',
    targetType: 'speaker',
    speakerId: 'speaker-korone',
    speakerDisplayName: '戌神ころね',
    sourceAtomIds: ['a-09'],
  },
];

const CAPTION_CONTRACTS = [{
  captionContractRefId: 'caption-contract-001',
  captionSchemaVersion: 'presentation-caption-check-v002',
  captionTargets: [{targetId: 'caption-source-target-001', requiredAtomIds: ['a-01'], allowedOmissionAtomIds: []}],
  allowedSimultaneousGroups: [],
  captionPlan: {
    cues: [{
      cueId: 'cue-001',
      targetId: 'caption-source-target-001',
      lines: [{atomIds: ['a-01'], renderedText: '発話。'}],
      startAnchor: {atomId: 'a-01', edge: 'start'},
      endAnchor: {atomId: 'a-01', edge: 'end'},
      startMs: 1000,
      endMs: 1800,
    }],
  },
}];

const INSTRUCTION_DEFINITIONS = [
  ['caption', 'a-01', 'speech-caption', 'target-caption'],
  ['important', 'a-02', 'emphasis-important-statement', 'target-important'],
  ['mistake', 'a-03', 'emphasis-mistake-realization', 'target-mistake'],
  ['discovery', 'a-04', 'emphasis-discovery', 'target-discovery'],
  ['emotion', 'a-05', 'emphasis-strong-emotion', 'target-emotion'],
  ['comment', 'a-06', 'information-comment', 'target-comment'],
  ['narration', 'a-07', 'information-narration', 'target-narration'],
  ['lyrics', 'a-08', 'information-lyrics', 'target-lyrics'],
  ['speaker', 'a-09', 'speaker-identification', 'target-speaker'],
];

const makeInstruction = ([suffix, atomId, kind, targetRefId]) => ({
  instructionId: `instruction-${suffix}`,
  trigger: {startAtomId: atomId},
  kind,
  target: {targetType: TARGETS.find((target) => target.targetRefId === targetRefId).targetType, targetRefIds: [targetRefId]},
  presetId: 'normal-landscape-readable-pop-v001',
  materialRefs: [],
});

async function makeSyntheticBundle() {
  const formal = await formalAssetsPromise;
  const syntheticSourceHash = await fileSha256V002(SYNTHETIC_SOURCE_PATH);
  const rawSourceAtoms = makeSourceAtoms().map((atom) => ({...atom, sourceRef: 'synthetic-source-v001'}));
  const built = buildPresentationResolutionPackageV002({
    schemaVersion: 'presentation-resolution-package-build-request-v001',
    resolutionPackageId: 'presentation-renderer-synthetic-resolution-v001',
    sourceProvenance: 'presentation-renderer-synthetic-source-v001',
    atomGranularity: 'word-timestamp',
    rawSourceAtoms,
    targets: clone(TARGETS),
    captionContracts: clone(CAPTION_CONTRACTS),
    sourceArtifacts: [{
      sourceRef: 'synthetic-source-v001',
      path: 'evals/clip_composition/testdata/presentation-renderer-v002/synthetic-source.json',
      fileSha256: syntheticSourceHash,
    }],
  });
  const resolutionPackageSha256 = sha256Canonical(built.resolutionPackage);
  const bundle = {
    schemaVersion: 'presentation-instruction-check-v002',
    instructionSet: {
      schemaVersion: 'zev-presentation-instruction-v002',
      instructionSetId: 'presentation-renderer-synthetic-instruction-set-v001',
      format: 'normal-landscape',
      rendererContractVersion: 'zev-renderer-boundary-v002',
      sourceProvenance: built.resolutionPackage.sourceProvenance,
      resolutionPackageId: built.resolutionPackage.resolutionPackageId,
      resolutionPackageSha256,
      presetRegistryVersion: formal.presetValidationIndex.registryVersion,
      materialRegistryVersion: formal.materialValidationIndex.registryVersion,
      instructions: INSTRUCTION_DEFINITIONS.map(makeInstruction),
    },
    resolutionPackage: built.resolutionPackage,
    presetValidationIndex: clone(formal.presetValidationIndex),
    materialValidationIndex: clone(formal.materialValidationIndex),
  };
  return {bundle, generationManifest: built.generationManifest};
}

const makeTimeline = (fileSha256 = '0'.repeat(64), baseMediaPath = 'base-media.mp4') => ({
  schemaVersion: 'presentation-base-media-timeline-v002',
  timelineId: 'presentation-renderer-synthetic-timeline-v002',
  sourceProvenance: 'presentation-renderer-synthetic-source-v001',
  sourceRef: 'synthetic-source-v001',
  sourceFrameClock: {
    inputFrameRate: '30/1',
    logicalFrameRate: '30/1',
    extractionRuleId: 'source-frame-30fps-identity-v001',
    decodedFrameCount: 330,
  },
  baseMedia: {
    artifactId: 'presentation-renderer-synthetic-base-v001',
    path: baseMediaPath,
    fileSha256,
    frameRate: '30/1',
    expectedFrameCount: 270,
  },
  segments: [
    {
      segmentId: 'segment-0001', sourceStartMs: 1000, sourceEndMs: 5000,
      sourceStartFrame30: 30, sourceEndFrame30: 150, outputStartFrame: 0, outputEndFrame: 120,
    },
    {
      segmentId: 'segment-0002', sourceStartMs: 6000, sourceEndMs: 11000,
      sourceStartFrame30: 180, sourceEndFrame30: 330, outputStartFrame: 120, outputEndFrame: 270,
    },
  ],
});

const rendererToolProfile = (formal) => ({
  nodeVersion: formal.trust.toolVersions.nodeVersion,
  ffmpegVersion: formal.trust.toolVersions.ffmpegVersion,
  ffprobeVersion: formal.trust.toolVersions.ffprobeVersion,
});

const makeBaseGenerationManifest = ({
  timeline,
  timelineFileSha256 = '1'.repeat(64),
  sourceFileSha256 = '2'.repeat(64),
  audioPacketPayloadSha256 = null,
  tools,
  implementationFiles,
}) => {
  const audioPresent = audioPacketPayloadSha256 !== null;
  const samplesPerFrame = 1600;
  const segments = timeline.segments.map((segment) => ({
    ...segment,
    audioSamples: audioPresent ? {
      sourceStart: segment.sourceStartFrame30 * samplesPerFrame,
      sourceEnd: segment.sourceEndFrame30 * samplesPerFrame,
      outputStart: segment.outputStartFrame * samplesPerFrame,
      outputEnd: segment.outputEndFrame * samplesPerFrame,
    } : null,
  }));
  return {
    schemaVersion: PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION,
    buildId: 'presentation-renderer-synthetic-base-build-v001',
    job: {jobId: 'synthetic-base-build-job-v001', schemaVersion: 'presentation-base-media-build-job-v001', fileSha256: '3'.repeat(64)},
    source: {
      sourceProvenance: timeline.sourceProvenance,
      sourceRef: timeline.sourceRef,
      sourceUri: 'synthetic://presentation-renderer-v002',
      path: 'evals/clip_composition/testdata/presentation-renderer-v002/synthetic-source.json',
      fileSha256: sourceFileSha256,
      video: {width: 1920, height: 1080, frameRate: '30/1', timeBase: '1/30', decodedFrameCount: 330, firstPts: 0, lastPts: 329, rotation: 0},
      audio: audioPresent
        ? {
          present: true, codec: 'aac', sampleRate: 48000, channels: 2,
          channelLayout: 'stereo', timeBase: '1/48000', firstDecodedPts: 0, lastDecodedPts: 527999,
          presentationClock: {
            authority: 'stream-and-packet-v001', endSample: 528000,
            streamEndSample: 528000, packetEndSample: 528000,
            skipSamples: 1024, discardPadding: 0,
          },
        }
        : {present: false},
    },
    assemblyDecision: {decisionId: 'synthetic-decision-v001', fileSha256: '4'.repeat(64), payloadSha256: '5'.repeat(64), approvalRecordId: 'synthetic-human-approval-v001'},
    basisEditPlan: {kind: 'edit_plan_json', path: 'synthetic-edit-plan.json', fileSha256: '6'.repeat(64)},
    segments,
    audio: audioPresent ? {
      present: true,
      sampleRate: 48000,
      channels: 2,
      channelLayout: 'stereo',
      channelOrder: ['FL', 'FR'],
      canonicalPcmFormat: {sampleFormat: 'f32le', packing: 'interleaved'},
      insertedSilenceSpans: [],
      sourceGrid: {
        sampleCount: 528000, byteCount: 4224000, payloadSha256: '7'.repeat(64),
        decodedSampleCount: 528000, decodedTailPaddingSampleCount: 0,
      },
      encodeInput: {sampleCount: 432000, byteCount: 3456000, payloadSha256: '8'.repeat(64)},
      encoded: {
        codec: 'aac', bitRate: '192k', movieTimeScale: 30, timeBase: '1/48000',
        startPts: 0, durationTs: 432000, containerDurationSamples: 432000,
        presentationDurationSamples: 432000,
        videoPresentationDurationSamples: 432000,
        trailingVideoOnlySampleCount: 0,
        tailPolicy: 'frame-aligned-v001',
        rawDecodedSampleCount: 432128, effectiveDecodedSampleCount: 432000,
        effectiveDecodedPayloadSha256: '9'.repeat(64), packetPayloadSha256: audioPacketPayloadSha256,
        skipSamples: 1024, discardPadding: 0, encoderDelay: 1024,
      },
    } : {present: false},
    execution: {
      commands: [
        {
          stage: 'video-build',
          tool: 'ffmpeg',
          arguments: [
            '-i', '<SOURCE_MEDIA>',
            '-filter_complex', '[0:v]null[video]',
            '-map', '[video]',
            '<TEMP_VIDEO>',
          ],
          filterGraph: '[0:v]null[video]',
        },
        ...(audioPresent ? [
          {
            stage: 'audio-grid',
            tool: 'ffmpeg',
            arguments: ['-i', '<SOURCE_MEDIA>', '-map', '0:a:0', '<SOURCE_GRID>'],
            filterGraph: null,
          },
          {
            stage: 'audio-mux',
            tool: 'ffmpeg',
            arguments: ['-i', '<TEMP_VIDEO>', '-i', '<ENCODE_PCM>', '<BASE_MEDIA>'],
            filterGraph: null,
          },
        ] : []),
      ],
      trustedSourceFiles: clone(PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES),
    },
    tools: {
      expected: clone(tools),
      observed: clone(tools),
      binaryDiagnostics: {
        node: {resolvedPath: '/fixture/bin/node', fileSha256: 'a'.repeat(64)},
        ffmpeg: {resolvedPath: '/fixture/bin/ffmpeg', fileSha256: 'b'.repeat(64)},
        ffprobe: {resolvedPath: '/fixture/bin/ffprobe', fileSha256: 'c'.repeat(64)},
      },
    },
    versions: {generatorVersion: 'presentation-base-media-builder-v001', timelineCheckerVersion: 'presentation-base-media-timeline-checker-v002'},
    git: {head: '0'.repeat(40), dirty: true},
    implementationFiles: clone(implementationFiles),
    outputs: {
      baseMedia: {
        artifactId: timeline.baseMedia.artifactId,
        path: timeline.baseMedia.path,
        fileSha256: timeline.baseMedia.fileSha256,
        frameRate: '30/1',
        frameCount: timeline.baseMedia.expectedFrameCount,
        audioPacketPayloadSha256,
      },
      timeline: {timelineId: timeline.timelineId, schemaVersion: timeline.schemaVersion, path: 'timeline.json', fileSha256: timelineFileSha256},
    },
    excludedLegacyFields: ['screenLayout', 'telopPlan'],
  };
};

const timelineObservation = (timeline, generationManifest) => ({
  fileSha256: timeline.baseMedia.fileSha256,
  frameCount: timeline.baseMedia.expectedFrameCount,
  timelineFileSha256: generationManifest.outputs.timeline.fileSha256,
});
const validateTimeline = (timeline, generationManifest, observedOverrides = {}) => (
  validatePresentationBaseMediaTimelineV002(
    timeline,
    generationManifest,
    {...timelineObservation(timeline, generationManifest), ...observedOverrides},
  )
);

const logicalFixturePromise = (async () => {
  const formal = await formalAssetsPromise;
  const implementationFiles = await Promise.all([
    'evals/clip_composition/presentation_base_media_build_v001.mjs',
    'evals/clip_composition/presentation_base_media_timeline_v002.mjs',
  ].map(async (filePath) => ({
    path: filePath,
    fileSha256: await fileSha256V002(path.join(WORKSPACE_ROOT, filePath)),
  })));
  const {bundle, generationManifest: resolutionGenerationManifest} = await makeSyntheticBundle();
  const timeline = makeTimeline();
  const generationManifest = makeBaseGenerationManifest({
    timeline,
    tools: rendererToolProfile(formal),
    implementationFiles,
  });
  const outer = validatePresentationInstructionContract(bundle, formal.binding);
  assert.equal(outer.overallStatus, 'passed', JSON.stringify(outer, null, 2));
  const planReport = buildPresentationRendererPlanV002({
    bundle,
    presetRegistry: formal.presetRegistry,
    timeline,
    generationManifest,
    observedBaseMedia: timelineObservation(timeline, generationManifest),
    layoutRules: formal.trust.layoutRules,
  });
  assert.equal(planReport.status, 'passed', JSON.stringify(planReport, null, 2));
  return {
    formal,
    bundle,
    resolutionGenerationManifest,
    generationManifest,
    implementationFiles,
    timeline,
    planReport,
  };
})();

const createInputFiles = async ({withBaseMedia = false} = {}) => {
  const fixture = await logicalFixturePromise;
  await mkdir(SYNTHETIC_TEST_OUTPUT_ROOT, {recursive: true});
  const directory = await mkdtemp(path.join(SYNTHETIC_TEST_OUTPUT_ROOT, 'case-'));
  const bundlePath = path.join(directory, 'bundle.json');
  // productionは正式trustに固定された実pathも照合する。内容が同じ一時copyで迂回しない。
  const bindingPath = REGISTRY_BINDING_PATH;
  const presetPath = PRESET_REGISTRY_PATH;
  const generationPath = path.join(directory, 'resolution-generation.json');
  const baseGenerationPath = path.join(directory, 'base-media-generation-manifest.json');
  const timelinePath = path.join(directory, 'timeline.json');
  const jobPath = path.join(directory, 'job.json');
  const outputDirectory = path.join(directory, 'output');
  const baseMediaPath = path.join(directory, 'base-media.mp4');
  const controlMediaPath = path.join(directory, 'synthetic-control-reencoded.mp4');
  const [bundleHash, bindingHash, generationHash] = await Promise.all([
    writeJson(bundlePath, fixture.bundle),
    fileSha256V002(bindingPath),
    writeJson(generationPath, fixture.resolutionGenerationManifest),
  ]);
  let baseMediaHash = '0'.repeat(64);
  if (withBaseMedia) {
    const ffmpeg = await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=9',
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      // 認定preview製造と同じ既存値。テスト都合の独自品質係数を作らない。
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', '-movflags', '+faststart',
      baseMediaPath,
    ]);
    assert.equal(ffmpeg.code, 0, ffmpeg.stderr);
    baseMediaHash = await fileSha256V002(baseMediaPath);
    const control = await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', baseMediaPath,
      '-map', '0:v:0', '-map', '0:a:0',
      '-vf', 'fps=30,format=yuv420p', '-frames:v', '270',
      // 本体合成と同じ既存符号化値で、演出なしの対照だけを作る。
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-movflags', '+faststart', controlMediaPath,
    ]);
    assert.equal(control.code, 0, control.stderr);
  }
  const timeline = makeTimeline(baseMediaHash, 'base-media.mp4');
  const timelineHash = await writeJson(timelinePath, timeline);
  const sourceFileSha256 = await fileSha256V002(SYNTHETIC_SOURCE_PATH);
  const audioPacketPayloadSha256 = withBaseMedia
    ? (await inspectRenderedMediaV002(baseMediaPath)).audio.packetPayloadSha256
    : null;
  const generationManifest = makeBaseGenerationManifest({
    timeline,
    timelineFileSha256: timelineHash,
    sourceFileSha256,
    audioPacketPayloadSha256,
    tools: rendererToolProfile(fixture.formal),
    implementationFiles: fixture.implementationFiles,
  });
  const baseGenerationHash = await writeJson(baseGenerationPath, generationManifest);
  const job = {
    schemaVersion: 'presentation-render-job-v002',
    instructionBundle: {path: bundlePath, fileSha256: bundleHash},
    registryBinding: {path: bindingPath, fileSha256: bindingHash},
    presetRegistry: {path: presetPath, canonicalSha256: sha256Canonical(fixture.formal.presetRegistry)},
    resolutionGenerationManifest: {path: generationPath, fileSha256: generationHash},
    baseMediaGenerationManifest: {path: baseGenerationPath, fileSha256: baseGenerationHash},
    baseMediaTimeline: {path: timelinePath, fileSha256: timelineHash},
    outputDirectory,
  };
  await writeJson(jobPath, job);
  return {
    ...fixture,
    directory,
    bundlePath,
    bindingPath,
    presetPath,
    generationPath,
    baseGenerationPath,
    timelinePath,
    jobPath,
    outputDirectory,
    baseMediaPath,
    controlMediaPath: withBaseMedia ? controlMediaPath : null,
    timeline,
    generationManifest,
    job,
  };
};

const mutateTransportAndExecute = async (fixture, field, value) => {
  const filePath = path.join(fixture.directory, `${field}-${Date.now()}-${Math.random()}.json`);
  const fileHash = await writeJson(filePath, value);
  const job = clone(fixture.job);
  if (field === 'bundle') job.instructionBundle = {path: filePath, fileSha256: fileHash};
  else if (field === 'generation') job.resolutionGenerationManifest = {path: filePath, fileSha256: fileHash};
  else if (field === 'baseGeneration') job.baseMediaGenerationManifest = {path: filePath, fileSha256: fileHash};
  else if (field === 'timeline') job.baseMediaTimeline = {path: filePath, fileSha256: fileHash};
  else throw new Error(`unsupported mutation field: ${field}`);
  return executePresentationRendererV002(job);
};

const replaceTimelineAndBaseGenerationAndExecute = async (
  fixture,
  timeline,
  baseGenerationInput,
) => {
  const timelineHash = await writeJson(fixture.timelinePath, timeline);
  const baseGeneration = clone(baseGenerationInput);
  baseGeneration.outputs.timeline.fileSha256 = timelineHash;
  const baseGenerationHash = await writeJson(fixture.baseGenerationPath, baseGeneration);
  const job = clone(fixture.job);
  job.baseMediaTimeline.fileSha256 = timelineHash;
  job.baseMediaGenerationManifest.fileSha256 = baseGenerationHash;
  return {
    result: await executePresentationRendererV002(job),
    baseGeneration,
    timelineHash,
  };
};

const makeValidQcInput = (plan) => ({
  plan,
  applicationResults: plan.elements.map((element, index) => ({
    instructionId: element.instructionId,
    requestedPresetId: element.presetId,
    appliedPresetId: element.presetId,
    appliedPresetRegistryVersion: element.registryVersion,
    appliedOverlayPropsCanonicalSha256: 'd'.repeat(64),
    overlayFile: `overlays/${String(index + 1).padStart(2, '0')}.png`,
    overlaySha256: 'e'.repeat(64),
    finalPlanElementReference: {
      planFile: 'presentation-render-plan-v002.json',
      instructionId: element.instructionId,
      canonicalSha256: sha256Canonical({...element, overlaySha256: 'e'.repeat(64)}),
    },
  })),
  overlayInspections: plan.elements.map((element, index) => {
    const lineAlphaBounds = element.indexedLines.map((line, lineIndex) => ({
      lineIndex: line.lineIndex,
      left: 110 + index * 10,
      top: 110 + lineIndex * 30,
      right: 190 + index * 10,
      bottom: 130 + lineIndex * 30,
    }));
    return {
      instructionId: element.instructionId,
      alphaMax: 1,
      alphaBounds: {left: 100 + index * 10, top: 100, right: 200 + index * 10, bottom: 180, width: 100, height: 80},
      lineCount: element.indexedLines.length,
      lineRects: clone(lineAlphaBounds),
      visibilityComparisonBasis: 'same-composite-with-instruction-omitted',
      representativeFrame: element.startFrame + Math.floor(element.displayFrameCount / 2),
      changedPixelsAgainstInstructionOmittedFrame: 1,
      appliedOverlayPropsCanonicalSha256: 'd'.repeat(64),
      overlayFile: `overlays/${String(index + 1).padStart(2, '0')}.png`,
      overlaySha256: 'e'.repeat(64),
      lineAlphaBounds,
    };
  }),
  mediaInspection: {
    durationMs: 9000,
    video: {codecName: 'h264', width: 1920, height: 1080, fps: 30, frameCount: 270},
    audio: {codecName: 'aac', packetPayloadSha256: 'b'.repeat(64)},
  },
  expectedAudio: {present: true, codecName: 'aac', packetPayloadSha256: 'b'.repeat(64)},
  canvas: plan.canvas,
});

let renderedFixturePromise;
const getRenderedFixture = () => {
  renderedFixturePromise ??= (async () => {
    const fixture = await createInputFiles({withBaseMedia: true});
    const result = await run(process.execPath, [RENDERER_CLI_PATH, fixture.jobPath]);
    assert.equal(result.code, 0, `${result.stderr}\n${result.stdout}`);
    const outputs = {};
    for (const [key, name] of Object.entries(PRESENTATION_RENDERER_OUTPUT_NAMES)) {
      const filePath = path.join(fixture.outputDirectory, name);
      if (key === 'failure') continue;
      if (key === 'overlays') {
        outputs[key] = filePath;
        continue;
      }
      outputs[key] = filePath;
    }
    return {fixture, processResult: result, outputs};
  })();
  return renderedFixturePromise;
};

after(async () => {
  if (!renderedFixturePromise) return;
  try {
    const rendered = await renderedFixturePromise;
    await rm(rendered.fixture.directory, {recursive: true, force: true});
  } catch {
    // 失敗時の一時成果物は原因調査に使えるため、このcleanupから別の失敗を作らない。
  }
});

test('01 jobとtimeline manifestの必須field・未知field・hash形式を固定検査する', async () => {
  const fixture = await createInputFiles();
  try {
    assertHasCode(validatePresentationRenderJobV002(null), 'RENDER_JOB_SCHEMA_INVALID');
    const unknown = {...fixture.job, unapprovedTrustPath: '/tmp/not-allowed.json'};
    assertHasCode(validatePresentationRenderJobV002(unknown), 'RENDER_JOB_UNKNOWN_FIELD');
    const badHash = clone(fixture.job);
    badHash.instructionBundle.fileSha256 = 'not-a-sha256';
    assertHasCode(validatePresentationRenderJobV002(badHash), 'RENDER_JOB_SCHEMA_INVALID');
    const invalidTimeline = {...fixture.timeline, unknown: true};
    assertHasCode(
      validateTimeline(invalidTimeline, fixture.generationManifest),
      'BASE_MEDIA_TIMELINE_INVALID',
    );
    assert.ok(!Object.hasOwn(fixture.job, 'rendererTrust'));
  } finally {
    await rm(fixture.directory, {recursive: true, force: true});
  }
});

test('01b 新規出力・所有lock・原子的publishを固定し既存成功物を変更しない', async () => {
  await mkdir(SYNTHETIC_TEST_OUTPUT_ROOT, {recursive: true});
  const directory = await mkdtemp(path.join(SYNTHETIC_TEST_OUTPUT_ROOT, 'publish-safety-'));
  const outputParent = path.join(directory, 'publish-parent');
  await mkdir(outputParent);
  const outputDirectory = path.join(outputParent, 'final-output');
  const existingMarker = path.join(outputDirectory, 'existing-success.txt');
  let reservation = null;
  try {
    await mkdir(outputDirectory);
    await writeFile(existingMarker, 'existing-success\n');
    await assertRejectsOutputCode(
      acquirePresentationOutputReservationV002(outputDirectory),
      'RENDER_OUTPUT_ALREADY_EXISTS',
    );
    assert.equal(await readFile(existingMarker, 'utf8'), 'existing-success\n');
    await rm(outputDirectory, {recursive: true});

    reservation = await acquirePresentationOutputReservationV002(outputDirectory);
    await assertRejectsOutputCode(
      acquirePresentationOutputReservationV002(outputDirectory),
      'RENDER_OUTPUT_LOCKED',
    );
    assert.ok((await stat(reservation.lockDirectory)).isDirectory());

    const temporaryDirectory = await mkdtemp(path.join(outputParent, '.publish-failure-work-'));
    const incompleteStaging = path.join(temporaryDirectory, 'publish');
    await mkdir(incompleteStaging);
    const stagingMarker = path.join(incompleteStaging, 'only-one-artifact.txt');
    await writeFile(stagingMarker, 'must-stay-unpublished\n');
    await assertRejectsOutputCode(
      publishPresentationArtifactsV002({
        stagingDirectory: incompleteStaging,
        outputDirectory,
        reservation,
      }),
      'RENDER_OUTPUT_PUBLISH_FAILED',
    );
    await assert.rejects(stat(outputDirectory));
    assert.equal(await readFile(stagingMarker, 'utf8'), 'must-stay-unpublished\n');

    const movedOutputParent = path.join(directory, 'publish-parent-moved');
    await rename(outputParent, movedOutputParent);
    await symlink(movedOutputParent, outputParent, 'dir');
    await assertRejectsOutputCode(
      commitValidatedPresentationArtifactsV002({
        stagingDirectory: incompleteStaging,
        outputDirectory,
        reservation,
      }),
      'RENDER_OUTPUT_PUBLISH_FAILED',
    );
    await assert.rejects(stat(path.join(movedOutputParent, 'final-output')));
    assert.equal(
      await readFile(path.join(movedOutputParent, path.relative(outputParent, stagingMarker)), 'utf8'),
      'must-stay-unpublished\n',
    );
    await rm(outputParent, {force: true});
    await rename(movedOutputParent, outputParent);

    await mkdir(outputDirectory);
    const lateDestinationMarker = path.join(outputDirectory, 'appeared-after-validation.txt');
    await writeFile(lateDestinationMarker, 'late-destination-must-not-change\n');
    await assertRejectsOutputCode(
      commitValidatedPresentationArtifactsV002({
        stagingDirectory: incompleteStaging,
        outputDirectory,
        reservation,
      }),
      'RENDER_OUTPUT_ALREADY_EXISTS',
    );
    assert.equal(await readFile(lateDestinationMarker, 'utf8'), 'late-destination-must-not-change\n');
    assert.equal(await readFile(stagingMarker, 'utf8'), 'must-stay-unpublished\n');
    await rm(outputDirectory, {recursive: true});

    await writeJson(reservation.ownerFile, {
      schemaVersion: 'presentation-render-output-lock-v002',
      ownerToken: 'foreign-owner',
      processId: process.pid,
      outputDirectory,
    });
    await assertRejectsOutputCode(
      commitValidatedPresentationArtifactsV002({
        stagingDirectory: incompleteStaging,
        outputDirectory,
        reservation,
      }),
      'RENDER_OUTPUT_LOCK_OWNERSHIP_LOST',
    );
    assert.ok((await stat(reservation.lockDirectory)).isDirectory());
    await writeJson(reservation.ownerFile, {
      schemaVersion: 'presentation-render-output-lock-v002',
      ownerToken: reservation.ownerToken,
      processId: process.pid,
      outputDirectory,
    });
    assert.ok((await stat(temporaryDirectory)).isDirectory());
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('01c directory publish成功後のlock異常を成功成果物の失敗へ戻さない', async () => {
  await mkdir(SYNTHETIC_TEST_OUTPUT_ROOT, {recursive: true});
  const directory = await mkdtemp(path.join(SYNTHETIC_TEST_OUTPUT_ROOT, 'post-publish-safety-'));
  const outputParent = path.join(directory, 'publish-parent');
  await mkdir(outputParent);
  const outputDirectory = path.join(outputParent, 'final-output');
  try {
    const reservation = await acquirePresentationOutputReservationV002(outputDirectory);
    const temporaryDirectory = await mkdtemp(path.join(outputParent, '.post-publish-work-'));
    const validatedStaging = path.join(temporaryDirectory, 'publish');
    await mkdir(validatedStaging);
    await writeFile(path.join(validatedStaging, 'validated-marker.txt'), 'published-success\n');
    const publication = await commitValidatedPresentationArtifactsV002({
      stagingDirectory: validatedStaging,
      outputDirectory,
      reservation,
    });
    assert.deepEqual(publication, {status: 'published', outputDirectory});

    // publish後にlockを安全に解放できない状態になっても、公開済み一式は成功のまま保持する。
    await writeJson(reservation.ownerFile, {
      schemaVersion: 'presentation-render-output-lock-v002',
      ownerToken: 'foreign-after-publish',
      processId: process.pid,
      outputDirectory,
    });
    assert.equal(
      await readFile(path.join(outputDirectory, 'validated-marker.txt'), 'utf8'),
      'published-success\n',
    );
    assert.ok((await stat(reservation.lockDirectory)).isDirectory());
    assert.ok((await stat(temporaryDirectory)).isDirectory());
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('02 固定信頼根・台帳・preview・描画部品・tool・fontを照合しfont失敗を分類する', async () => {
  const {formal} = await logicalFixturePromise;
  const passed = await loadAndValidatePresentationRendererTrustV001(formal.trust.toolVersions);
  assert.equal(passed.status, 'passed', JSON.stringify(passed.violations));
  assert.equal(passed.trustCanonicalSha256, PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256);

  assertHasCode(evaluatePresentationRendererTrustRootV001({
    trust: formal.trust,
    actualCanonicalSha256: '0'.repeat(64),
  }), 'RENDERER_TRUST_ROOT_MISMATCH');
  assertHasCode(evaluatePresentationRendererTrustedArtifactV001({
    artifactType: 'renderer-component',
    expected: {path: 'component.ts', fileSha256: 'a'.repeat(64)},
    observed: {fileSha256: 'b'.repeat(64)},
  }), 'RENDERER_COMPONENT_HASH_MISMATCH');
  assertHasCode(evaluatePresentationRendererTrustedArtifactV001({
    artifactType: 'preset-registry',
    expected: {path: 'preset.json', fileSha256: 'a'.repeat(64), canonicalSha256: 'b'.repeat(64)},
    observed: {fileSha256: 'a'.repeat(64), canonicalSha256: 'c'.repeat(64)},
  }), 'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH');
  assertHasCode(evaluatePresentationRendererTrustedArtifactV001({
    artifactType: 'font',
    expected: {path: 'font.otf', fileSha256: 'a'.repeat(64)},
    observed: {fileSha256: 'b'.repeat(64)},
  }), 'FONT_ASSET_HASH_MISMATCH');
  assertHasCode(
    evaluatePresentationRendererToolVersionsV001(formal.trust.toolVersions, {...formal.trust.toolVersions, nodeVersion: 'v0'}),
    'RENDERER_TOOL_VERSION_MISMATCH',
  );
  assert.equal(classifyPresentationRenderErrorV002(new Error('PRESENTATION_FONT_FALLBACK_DETECTED:inactive')), 'FONT_FALLBACK_DETECTED');
  observedCodes.add('FONT_FALLBACK_DETECTED');
  assert.equal(classifyPresentationRenderErrorV002(new Error('PRESENTATION_FONT_LOAD_FAILED:missing')), 'FONT_LOAD_FAILED');
  observedCodes.add('FONT_LOAD_FAILED');
  assert.equal(classifyPresentationRenderErrorV002(new Error('other failure')), null);
  const baseToolManifest = {tools: {
    expected: rendererToolProfile(formal),
    observed: rendererToolProfile(formal),
    binaryDiagnostics: {
      node: {resolvedPath: '/fixture/bin/node', fileSha256: 'a'.repeat(64)},
      ffmpeg: {resolvedPath: '/fixture/bin/ffmpeg', fileSha256: 'b'.repeat(64)},
      ffprobe: {resolvedPath: '/fixture/bin/ffprobe', fileSha256: 'c'.repeat(64)},
    },
  }};
  assert.equal(
    validateBaseMediaToolProfileV002(baseToolManifest, rendererToolProfile(formal)).status,
    'passed',
  );
  assertHasCode(
    validateBaseMediaToolProfileV002(baseToolManifest, {...rendererToolProfile(formal), nodeVersion: 'v0'}),
    'BASE_MEDIA_TOOL_PROFILE_MISMATCH',
  );

  const rendererPlanModule = await rendererPlanModulePromise;
  assert.equal(
    typeof rendererPlanModule.evaluatePresentationRendererLayoutRulesV001,
    'function',
    'trustのlayoutRulesと実描画値を照合する純粋検査が必要です',
  );
  const trustedLayout = clone(formal.trust.layoutRules);
  const matchingLayout = rendererPlanModule.evaluatePresentationRendererLayoutRulesV001(
    trustedLayout,
    clone(trustedLayout),
  );
  assert.equal(matchingLayout.status, 'passed');
  const mismatchedLayout = clone(trustedLayout);
  mismatchedLayout.fontWeight += 1;
  assertHasCode(
    rendererPlanModule.evaluatePresentationRendererLayoutRulesV001(trustedLayout, mismatchedLayout),
    'RENDERER_COMPONENT_HASH_MISMATCH',
  );
});

test('03 v002だけを受理しv001と旧telopPlanを描画前に拒否する', async () => {
  const fixture = await createInputFiles();
  try {
    const v001Job = clone(fixture.job);
    v001Job.schemaVersion = 'presentation-render-job-v001';
    assertHasCode(validatePresentationRenderJobV002(v001Job), 'RENDER_JOB_SCHEMA_INVALID');
    const v001Timeline = {
      schemaVersion: 'presentation-base-media-timeline-v001',
      timelineId: 'old-timeline',
      sourceProvenance: fixture.timeline.sourceProvenance,
      sourceRef: fixture.timeline.sourceRef,
      baseMedia: {artifactId: 'old-base', path: 'old.mp4', fileSha256: '0'.repeat(64), expectedFrameCount: 30},
      segments: [{segmentId: 'old-segment', sourceStartMs: 0, sourceEndMs: 1000, outputStartMs: 0, outputEndMs: 1000}],
    };
    assertHasCode(
      validateTimeline(v001Timeline, fixture.generationManifest),
      'BASE_MEDIA_TIMELINE_INVALID',
    );
    const v001 = clone(fixture.bundle);
    v001.schemaVersion = 'presentation-instruction-check-v001';
    v001.instructionSet.schemaVersion = 'zev-presentation-instruction-v001';
    const result = await mutateTransportAndExecute(fixture, 'bundle', v001);
    assert.equal(result.exitCode, 1);
    assertHasCode(result.failure, 'INSTRUCTION_CONTRACT_NOT_PASSED');

    const legacy = {schemaVersion: 'legacy-telop-plan-v001', telopPlan: []};
    const legacyResult = await mutateTransportAndExecute(fixture, 'bundle', legacy);
    assert.equal(legacyResult.exitCode, 1);
    assertHasCode(legacyResult.failure, 'INSTRUCTION_CONTRACT_NOT_PASSED');

    const multipleSources = clone(fixture.resolutionGenerationManifest);
    multipleSources.sourceArtifacts.push({
      ...clone(multipleSources.sourceArtifacts[0]),
      sourceRef: 'another-source-v001',
    });
    assertHasCode(validatePresentationRendererSourceBindingV002({
      bundle: fixture.bundle,
      resolutionGenerationManifest: multipleSources,
      timeline: fixture.timeline,
    }), 'RESOLUTION_GENERATION_MANIFEST_MISMATCH');
    const multipleSourcesResult = await mutateTransportAndExecute(
      fixture,
      'generation',
      multipleSources,
    );
    assert.equal(multipleSourcesResult.failure.stage, 'source-binding');
    assertHasCode(multipleSourcesResult.failure, 'RESOLUTION_GENERATION_MANIFEST_MISMATCH');

    // bundle側とtimeline側をそれぞれ単独では整合させても、別の元動画どうしは結合しない。
    const otherTimeline = clone(fixture.timeline);
    otherTimeline.sourceProvenance = 'other-base-media-provenance-v001';
    otherTimeline.sourceRef = 'other-base-media-source-v001';
    const otherTimelineHash = sha256Bytes(Buffer.from(`${JSON.stringify(otherTimeline, null, 2)}\n`));
    const otherBaseGeneration = clone(fixture.generationManifest);
    otherBaseGeneration.source.sourceProvenance = otherTimeline.sourceProvenance;
    otherBaseGeneration.source.sourceRef = otherTimeline.sourceRef;
    otherBaseGeneration.outputs.timeline.fileSha256 = otherTimelineHash;
    assert.equal(validateTimeline(
      otherTimeline,
      otherBaseGeneration,
      {timelineFileSha256: otherTimelineHash},
    ).status, 'passed');
    assertHasCode(validatePresentationRendererSourceBindingV002({
      bundle: fixture.bundle,
      resolutionGenerationManifest: fixture.resolutionGenerationManifest,
      timeline: otherTimeline,
    }), 'TIMELINE_SOURCE_REF_MISMATCH');
    const crossSourceResult = await replaceTimelineAndBaseGenerationAndExecute(
      fixture,
      otherTimeline,
      otherBaseGeneration,
    );
    assert.equal(crossSourceResult.result.failure.stage, 'source-binding');
    assertHasCode(crossSourceResult.result.failure, 'TIMELINE_SOURCE_REF_MISMATCH');
  } finally {
    await rm(fixture.directory, {recursive: true, force: true});
  }
});

test('04 外枠passedだけを通しpartialとfailedを異なるコードで停止する', async () => {
  const fixture = await createInputFiles();
  try {
    assert.equal(validatePresentationInstructionContract(fixture.bundle, fixture.formal.binding).overallStatus, 'passed');

    const failed = clone(fixture.bundle);
    failed.instructionSet.instructions[0].target.targetRefIds = ['missing-target'];
    const failedResult = await mutateTransportAndExecute(fixture, 'bundle', failed);
    assertHasCode(failedResult.failure, 'INSTRUCTION_CONTRACT_NOT_PASSED');

    const simultaneous = await readJson(SIMULTANEOUS_CAPTION_PATH);
    const sourceRef = 'simultaneous-source-v001';
    const targets = simultaneous.source.captionTargets.map((target, index) => ({
      targetRefId: `simultaneous-target-${index + 1}`,
      targetType: 'caption-target',
      captionContractRefId: 'simultaneous-caption-contract-v001',
      cueId: simultaneous.captionPlan.cues[index].cueId,
    }));
    const built = buildPresentationResolutionPackageV002({
      schemaVersion: 'presentation-resolution-package-build-request-v001',
      resolutionPackageId: 'simultaneous-resolution-v001',
      sourceProvenance: simultaneous.source.atomProvenance,
      // character時刻はG2の既知未検査範囲なので、外枠はpartialとして止まる。
      atomGranularity: 'character-timestamp',
      rawSourceAtoms: simultaneous.source.atoms.map((atom) => ({...atom, sourceRef})),
      targets,
      captionContracts: [{
        captionContractRefId: 'simultaneous-caption-contract-v001',
        captionSchemaVersion: simultaneous.schemaVersion,
        captionTargets: simultaneous.source.captionTargets,
        allowedSimultaneousGroups: simultaneous.source.allowedSimultaneousGroups,
        captionPlan: simultaneous.captionPlan,
      }],
      sourceArtifacts: [{sourceRef, path: 'synthetic-simultaneous.json', fileSha256: 'c'.repeat(64)}],
    });
    const partialBundle = {
      schemaVersion: 'presentation-instruction-check-v002',
      instructionSet: {
        schemaVersion: 'zev-presentation-instruction-v002',
        instructionSetId: 'simultaneous-instruction-set-v001',
        format: 'normal-landscape',
        rendererContractVersion: 'zev-renderer-boundary-v002',
        sourceProvenance: built.resolutionPackage.sourceProvenance,
        resolutionPackageId: built.resolutionPackage.resolutionPackageId,
        resolutionPackageSha256: sha256Canonical(built.resolutionPackage),
        presetRegistryVersion: fixture.formal.presetValidationIndex.registryVersion,
        materialRegistryVersion: fixture.formal.materialValidationIndex.registryVersion,
        instructions: simultaneous.captionPlan.cues.map((cue, index) => ({
          instructionId: `simultaneous-instruction-${index + 1}`,
          trigger: {startAtomId: cue.startAnchor.atomId},
          kind: 'speech-caption',
          target: {targetType: 'caption-target', targetRefIds: [targets[index].targetRefId]},
          presetId: 'normal-landscape-readable-pop-v001',
          materialRefs: [],
        })),
      },
      resolutionPackage: built.resolutionPackage,
      presetValidationIndex: clone(fixture.formal.presetValidationIndex),
      materialValidationIndex: clone(fixture.formal.materialValidationIndex),
    };
    assert.equal(validatePresentationInstructionContract(partialBundle, fixture.formal.binding).overallStatus, 'passed_with_declared_limit');
    const partialResult = await mutateTransportAndExecute(fixture, 'bundle', partialBundle);
    assertHasCode(partialResult.failure, 'INSTRUCTION_CONTRACT_PARTIAL');
  } finally {
    await rm(fixture.directory, {recursive: true, force: true});
  }
});

test('05 正式空素材で到達可能な9種類を1指示1要素へ解決する', async () => {
  const fixture = await logicalFixturePromise;
  const {planReport} = fixture;
  assert.equal(planReport.plan.elements.length, 9);
  assert.deepEqual(
    planReport.plan.elements.map((element) => element.kind),
    INSTRUCTION_DEFINITIONS.map((entry) => entry[2]),
  );
  assert.equal(planReport.plan.schemaVersion, 'presentation-render-plan-draft-v002');
  assert.equal(planReport.plan.timelineSchemaVersion, 'presentation-base-media-timeline-v002');
  for (const element of planReport.plan.elements) {
    assert.ok(!Object.hasOwn(element, 'outputStartMs'));
    assert.ok(!Object.hasOwn(element, 'outputEndMs'));
  }
  assert.deepEqual(
    planReport.plan.elements.map((element) => element.instructionId),
    INSTRUCTION_DEFINITIONS.map((entry) => `instruction-${entry[0]}`),
  );
  const repeat = buildPresentationRendererPlanV002({
    bundle: fixture.bundle,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    observedBaseMedia: timelineObservation(fixture.timeline, fixture.generationManifest),
    layoutRules: fixture.formal.trust.layoutRules,
  });
  assert.deepEqual(repeat, planReport);
  assert.equal(JSON.stringify(repeat), JSON.stringify(planReport));
});

test('06 caption本文・明示行・開始終了anchorを一文字も変えず保持する', async () => {
  const {planReport} = await logicalFixturePromise;
  const caption = planReport.plan.elements.find((element) => element.kind === 'speech-caption');
  assert.equal(caption.text, '発話。');
  assert.deepEqual(caption.indexedLines.map((line) => line.renderedText), ['発話。']);
  assert.equal(caption.sourceStartMs, 1000);
  assert.equal(caption.sourceEndMs, 1800);
  assert.deepEqual(caption.targetProvenance.startAnchor, {atomId: 'a-01', edge: 'start'});
  assert.deepEqual(caption.targetProvenance.endAnchor, {atomId: 'a-01', edge: 'end'});
  const explicit = indexExplicitLinesV001(['前半。', ' 後半 ']);
  assert.equal(explicit.status, 'passed');
  assert.equal(explicit.sourceText, '前半。 後半 ');
  assert.deepEqual(explicit.indexedLines.map((line) => line.renderedText), ['前半。', ' 後半 ']);
});

test('07 非caption本文と終了責任を保ち句点・空白・元改行の文字indexを欠落なく追跡する', async () => {
  const {planReport} = await logicalFixturePromise;
  const important = planReport.plan.elements.find((element) => element.kind === 'emphasis-important-statement');
  assert.equal(important.text, ' 重要 ');
  assert.equal(important.sourceStartMs, 2000);
  assert.equal(important.sourceEndMs, 2800);
  const mistake = planReport.plan.elements.find((element) => element.kind === 'emphasis-mistake-realization');
  assert.equal(mistake.text, '間違い\n発見');
  assert.deepEqual(
    mistake.indexedLines.flatMap((line) => line.characters).map((item) => item.sourceIndex),
    Array.from({length: Array.from(mistake.text).length}, (_, index) => index),
  );
  assert.equal(
    mistake.indexedLines.flatMap((line) => line.characters).find((item) => item.character === '\n').role,
    'source-line-break',
  );

  const source = ' 前後。\r\n次🙂 ';
  const layout = layoutUnicodeCodePointsV001(source, {maxCharsPerLine: 20, maxLines: 3, singleLine: false});
  assert.equal(layout.status, 'passed');
  assert.equal(layout.indexedLines.flatMap((line) => line.characters).map((item) => item.character).join(''), source);
  const missing = clone(layout.indexedLines);
  missing[0].characters.splice(1, 1);
  assertHasCode(validateIndexedLinesV001(source, missing), 'TARGET_TEXT_INDEX_GAP');
  const duplicate = clone(layout.indexedLines);
  duplicate[0].characters.splice(1, 0, clone(duplicate[0].characters[0]));
  assertHasCode(validateIndexedLinesV001(source, duplicate), 'TARGET_TEXT_INDEX_DUPLICATED');
  const mutated = clone(layout.indexedLines);
  mutated[0].characters[0].character = 'X';
  assertHasCode(validateIndexedLinesV001(source, mutated), 'TARGET_TEXT_MUTATED');
});

test('08 speaker表示名は明示targetだけから解決しsource話者ラベルを人物名に使わない', async () => {
  const fixture = await logicalFixturePromise;
  const speaker = fixture.planReport.plan.elements.find((element) => element.kind === 'speaker-identification');
  assert.equal(speaker.text, '戌神ころね');
  assert.notEqual(speaker.text, 'SOURCE_LABEL_MUST_NOT_RENDER');

  const missingPerson = clone(fixture.bundle);
  missingPerson.resolutionPackage.targets.find((target) => target.targetRefId === 'target-speaker').speakerDisplayName = '';
  const plan = buildPresentationRendererPlanV002({
    bundle: missingPerson,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    observedBaseMedia: timelineObservation(fixture.timeline, fixture.generationManifest),
    layoutRules: fixture.formal.trust.layoutRules,
  });
  assertHasCode(plan, 'PERSON_TARGET_REQUIRED');
});

test('09 1 source・cut対応・速度・frame数・未対応・曖昧・segment跨ぎを個別に止める', async () => {
  const fixture = await logicalFixturePromise;
  const passed = validateTimeline(fixture.timeline, fixture.generationManifest, {
    fileSha256: fixture.timeline.baseMedia.fileSha256,
    frameCount: 270,
  });
  assert.equal(passed.status, 'passed');
  assert.deepEqual(mapPresentationSourceIntervalV002(fixture.timeline, 6000, 7000).mapping, {
    timelineSegmentId: 'segment-0002',
    sourceStartMs: 6000,
    sourceEndMs: 7000,
    sourceStartFrame30: 180,
    sourceEndFrame30: 210,
    startFrame: 120,
    endFrameExclusive: 150,
    displayFrameCount: 30,
  });
  assert.equal(timelineFrameBoundaryV001(9000), 270);

  assertHasCode(validateTimeline(fixture.timeline, fixture.generationManifest, {
    fileSha256: '1'.repeat(64), frameCount: 270,
  }), 'BASE_MEDIA_HASH_MISMATCH');
  assertHasCode(validateTimeline(fixture.timeline, fixture.generationManifest, {
    fileSha256: fixture.timeline.baseMedia.fileSha256, frameCount: 269,
  }), 'BASE_MEDIA_FRAME_COUNT_MISMATCH');
  assertHasCode(
    validateTimeline(fixture.timeline, {...fixture.generationManifest, unknown: true}),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
  const untrustedExecution = clone(fixture.generationManifest);
  untrustedExecution.execution.commands[0].arguments[1] = '/tmp/source.mp4';
  assertHasCode(
    validateTimeline(fixture.timeline, untrustedExecution),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
  assertHasCode(
    validateTimeline(fixture.timeline, fixture.generationManifest, {unknown: true}),
    'BASE_MEDIA_OBSERVATION_INVALID',
  );
  const wrongRef = clone(fixture.timeline);
  wrongRef.sourceRef = 'other-source';
  assertHasCode(validateTimeline(wrongRef, fixture.generationManifest), 'TIMELINE_SOURCE_REF_MISMATCH');
  const wrongClock = clone(fixture.timeline);
  wrongClock.sourceFrameClock.logicalFrameRate = '60/1';
  assertHasCode(validateTimeline(wrongClock, fixture.generationManifest), 'TIMELINE_SOURCE_CLOCK_MISMATCH');
  const wrongFrame = clone(fixture.timeline);
  wrongFrame.segments[0].sourceStartFrame30 += 1;
  assertHasCode(validateTimeline(wrongFrame, fixture.generationManifest), 'TIMELINE_SOURCE_FRAME_MAPPING_INVALID');
  const overlap = clone(fixture.timeline);
  overlap.segments[1].sourceStartMs = 4500;
  overlap.segments[1].sourceEndMs = 9500;
  overlap.segments[1].sourceStartFrame30 = 135;
  overlap.segments[1].sourceEndFrame30 = 285;
  assertHasCode(validateTimeline(overlap, fixture.generationManifest), 'TIMELINE_SEGMENT_SOURCE_OVERLAP');
  const gap = clone(fixture.timeline);
  gap.segments[1].outputStartFrame = 121;
  gap.segments[1].outputEndFrame = 271;
  assertHasCode(validateTimeline(gap, fixture.generationManifest), 'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS');
  const speed = clone(fixture.timeline);
  speed.segments[0].outputEndFrame = 119;
  assertHasCode(validateTimeline(speed, fixture.generationManifest), 'TIMELINE_SPEED_CHANGE_UNSUPPORTED');
  assertHasCode(mapPresentationSourceIntervalV002(fixture.timeline, 5000, 6000), 'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED');
  const ambiguous = clone(fixture.timeline);
  ambiguous.segments.push({
    segmentId: 'segment-0003', sourceStartMs: 6000, sourceEndMs: 11000,
    sourceStartFrame30: 180, sourceEndFrame30: 330, outputStartFrame: 270, outputEndFrame: 420,
  });
  assertHasCode(mapPresentationSourceIntervalV002(ambiguous, 7000, 8000), 'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS');
  assertHasCode(mapPresentationSourceIntervalV002(fixture.timeline, 4500, 6500), 'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED');
  assertHasCode(mapPresentationSourceIntervalV002(fixture.timeline, 1000, 1001), 'INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME');

  const invalidTimeline = clone(fixture.timeline);
  invalidTimeline.segments = [];
  assertHasCode(buildPresentationRendererPlanV002({
    bundle: fixture.bundle,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: invalidTimeline,
    generationManifest: fixture.generationManifest,
    observedBaseMedia: timelineObservation(fixture.timeline, fixture.generationManifest),
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'TARGET_TIMELINE_INVALID');
});

test('10 v002はsource frameをoutput frameへ直接写し短尺alpha包絡を固定する', async () => {
  assert.equal(frameBoundaryV001(0), 0);
  assert.equal(frameBoundaryV001(1000), 30);
  assert.equal(frameBoundaryV001(1016), 30);
  const fixture = await logicalFixturePromise;
  const mapped = mapPresentationSourceIntervalV002(fixture.timeline, 2033, 2800);
  assert.equal(mapped.status, 'passed');
  assert.deepEqual(
    {startFrame: mapped.mapping.startFrame, endFrameExclusive: mapped.mapping.endFrameExclusive},
    {startFrame: 31, endFrameExclusive: 54},
  );
  assertHasCode(mapOutputIntervalToFramesV001(0, 1), 'TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING');
  assert.deepEqual(
    Array.from({length: 6}, (_, frame) => transitionAlphaV001(frame, 6)),
    [0.25, 0.5, 0.75, 0.75, 0.5, 0.25],
  );
  assert.equal(transitionAlphaV001(-1, 6), 0);
  assert.equal(transitionAlphaV001(6, 6), 0);
});

test('11 正式台帳の種類・状態・font・背景・transitionをfallbackなしで解決する', async () => {
  const fixture = await logicalFixturePromise;
  for (const element of fixture.planReport.plan.elements) {
    const policy = fixture.formal.presetRegistry.presets[0].kindPolicies.find((item) => item.kind === element.kind);
    const state = fixture.formal.presetRegistry.presets[0].visualStates.find((item) => item.stateId === policy.stateId);
    assert.equal(element.stateId, state.stateId);
    assert.deepEqual(element.visualState.textStyle, state.textStyle);
    assert.deepEqual(element.visualState.background, state.background);
    assert.equal(element.transition.transitionId, state.transitionId);
  }
  const noState = clone(fixture.formal.presetRegistry);
  noState.presets[0].visualStates = noState.presets[0].visualStates.filter((state) => state.stateId !== 'emphasis-important-warm-v001');
  assertHasCode(buildPresentationRendererPlanV002({
    bundle: fixture.bundle,
    presetRegistry: noState,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    observedBaseMedia: timelineObservation(fixture.timeline, fixture.generationManifest),
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'TARGET_RESOLUTION_FAILED');
  const wrongVersion = clone(fixture.formal.presetRegistry);
  wrongVersion.registryVersion = 'other-registry-v001';
  assertHasCode(buildPresentationRendererPlanV002({
    bundle: fixture.bundle,
    presetRegistry: wrongVersion,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    observedBaseMedia: timelineObservation(fixture.timeline, fixture.generationManifest),
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'APPLIED_PRESET_MISMATCH');
});

test('12 行数・行の正の交差・安全領域・空alphaを独立して検出する', async () => {
  const {planReport} = await logicalFixturePromise;
  const base = makeValidQcInput(planReport.plan);
  const first = evaluatePresentationRendererQcV002(base);
  const second = evaluatePresentationRendererQcV002(clone(base));
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
  const lineCount = clone(base);
  lineCount.overlayInspections[0].lineCount = 3;
  assertHasCode(evaluatePresentationRendererQcV002(lineCount), 'LAYOUT_LINE_COUNT_EXCEEDED');
  const intersection = clone(base);
  intersection.overlayInspections[0].lineAlphaBounds.push({
    ...clone(intersection.overlayInspections[0].lineAlphaBounds[0]),
    lineIndex: 1,
  });
  intersection.plan.elements[0].indexedLines.push(clone(intersection.plan.elements[0].indexedLines[0]));
  assertHasCode(evaluatePresentationRendererQcV002(intersection), 'LAYOUT_LINE_POSITIVE_INTERSECTION');
  const unsafe = clone(base);
  unsafe.overlayInspections[0].alphaBounds.left = 0;
  assertHasCode(evaluatePresentationRendererQcV002(unsafe), 'LAYOUT_SAFE_AREA_VIOLATION');
  const empty = clone(base);
  empty.overlayInspections[0].alphaMax = 0;
  empty.overlayInspections[0].alphaBounds = null;
  assertHasCode(evaluatePresentationRendererQcV002(empty), 'OVERLAY_ALPHA_EMPTY');

  const substitutedByAnotherInstruction = clone(base);
  substitutedByAnotherInstruction.overlayInspections[0].changedPixelsAgainstBase = 100;
  substitutedByAnotherInstruction.overlayInspections[0].changedPixelsAgainstInstructionOmittedFrame = 0;
  assertHasCode(
    evaluatePresentationRendererQcV002(substitutedByAnotherInstruction),
    'OUTPUT_ELEMENT_NOT_VISIBLE',
  );
  const mismatchedArtifact = clone(base);
  mismatchedArtifact.applicationResults[0].overlaySha256 = 'f'.repeat(64);
  assertHasCode(
    evaluatePresentationRendererQcV002(mismatchedArtifact),
    'OVERLAY_RENDER_ARTIFACT_MISMATCH',
  );
  const duplicatedPath = clone(base);
  duplicatedPath.applicationResults[1].overlayFile = duplicatedPath.applicationResults[0].overlayFile;
  assertHasCode(
    evaluatePresentationRendererQcV002(duplicatedPath),
    'OVERLAY_RENDER_PATH_DUPLICATED',
  );
});

test('13 時間と空間の正の交差だけを衝突とし境界接触は許容する', async () => {
  const fixture = await logicalFixturePromise;
  const two = clone(fixture.planReport.plan);
  two.elements = two.elements.slice(0, 2);
  two.elements[1].startFrame = two.elements[0].startFrame + 1;
  two.elements[1].endFrameExclusive = two.elements[0].endFrameExclusive;
  const collisionInput = makeValidQcInput(two);
  collisionInput.overlayInspections[1].alphaBounds = clone(collisionInput.overlayInspections[0].alphaBounds);
  assertHasCode(evaluatePresentationRendererQcV002(collisionInput), 'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION');

  const touching = clone(two);
  touching.elements[1].startFrame = touching.elements[0].endFrameExclusive;
  touching.elements[1].endFrameExclusive = touching.elements[1].startFrame + 30;
  const touchingReport = evaluatePresentationRendererQcV002(makeValidQcInput(touching));
  assert.ok(!codesOf(touchingReport).includes('INSTRUCTION_TEMPORAL_SPATIAL_COLLISION'));
});

test('14 空素材indexのG7を外枠で停止しpreviewカードを代用しない', async () => {
  const fixture = await createInputFiles();
  try {
    const g7 = clone(fixture.bundle);
    g7.resolutionPackage.targets.push({
      targetRefId: 'target-reference',
      targetType: 'reference-subject',
      referenceSubjectId: 'reference-001',
      sourceAtomIds: ['a-09'],
    });
    g7.instructionSet.instructions.push({
      instructionId: 'instruction-reference',
      trigger: {startAtomId: 'a-09'},
      kind: 'reference-supplement',
      target: {targetType: 'reference-subject', targetRefIds: ['target-reference']},
      presetId: 'normal-landscape-readable-pop-v001',
      materialRefs: [],
    });
    g7.instructionSet.resolutionPackageSha256 = sha256Canonical(g7.resolutionPackage);
    const result = await mutateTransportAndExecute(fixture, 'bundle', g7);
    assert.equal(result.exitCode, 1);
    assertHasCode(result.failure, 'INSTRUCTION_CONTRACT_NOT_PASSED');
    assert.equal(result.failure.stage, 'instruction-contract');
  } finally {
    await rm(fixture.directory, {recursive: true, force: true});
  }
});

test('15 9種類の透明PNGは非空・safe area内で同じ入力を同じhashへ再描画する', async () => {
  const rendered = await getRenderedFixture();
  const plan = await readJson(rendered.outputs.plan);
  const qc = await readJson(rendered.outputs.qc);
  const applicationDocument = await readJson(rendered.outputs.applicationResults);
  assert.equal(plan.elements.length, 9);
  assert.equal(qc.status, 'passed');
  assert.equal(qc.checks.layoutAndVisibility.status, 'passed');
  assert.ok(Array.isArray(qc.instructionEvidence), '実PNG・合成frame由来の指示別QC証拠が必要です');
  const overlayFiles = await Promise.all(plan.elements.map(async (element) => {
    assert.match(element.overlaySha256, /^[0-9a-f]{64}$/);
    const application = applicationDocument.results
      .find((item) => item.instructionId === element.instructionId);
    assert.equal(application.overlaySha256, element.overlaySha256);
    const filePath = path.join(rendered.fixture.outputDirectory, application.overlayFile);
    assert.ok((await stat(filePath)).size > 0);
    assert.equal(await fileSha256V002(filePath), element.overlaySha256);
    const evidence = qc.instructionEvidence.find((item) => item.instructionId === element.instructionId);
    assert.ok(evidence, `指示別QC証拠がありません: ${element.instructionId}`);
    assert.equal(evidence.visibilityComparisonBasis, 'same-composite-with-instruction-omitted');
    assert.ok(evidence.changedPixelsAgainstInstructionOmittedFrame > 0);
    assert.equal(evidence.lineAlphaBounds.length, element.indexedLines.length);
    for (let leftIndex = 0; leftIndex < evidence.lineAlphaBounds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < evidence.lineAlphaBounds.length; rightIndex += 1) {
        const intersection = positiveIntersection(
          evidence.lineAlphaBounds[leftIndex],
          evidence.lineAlphaBounds[rightIndex],
        );
        assert.ok(
          intersection.width <= 0 || intersection.height <= 0,
          `実PNGの行alpha領域が重なっています: ${element.instructionId}`,
        );
      }
    }
    return filePath;
  }));
  assert.equal(overlayFiles.length, 9);
  assert.equal(new Set(plan.elements.map((element) => element.overlaySha256)).size, 9);
});

test('16 合成MP4の映像・代表frame差分・基礎音声packetを保全する', async () => {
  const rendered = await getRenderedFixture();
  const outputMedia = await inspectRenderedMediaV002(rendered.outputs.video);
  const baseMedia = await inspectRenderedMediaV002(rendered.fixture.baseMediaPath);
  const qc = await readJson(rendered.outputs.qc);
  assert.deepEqual(
    {width: outputMedia.video.width, height: outputMedia.video.height, fps: outputMedia.video.fps},
    {width: 1920, height: 1080, fps: 30},
  );
  assert.equal(outputMedia.video.frameCount, 270);
  assert.equal(outputMedia.audio.codecName, baseMedia.audio.codecName);
  assert.equal(outputMedia.audio.packetPayloadSha256, baseMedia.audio.packetPayloadSha256);
  assert.equal(await audioPacketPayloadSha256V002(rendered.outputs.video), await audioPacketPayloadSha256V002(rendered.fixture.baseMediaPath));
  assert.equal(qc.checks.media.status, 'passed');
  assert.equal(qc.checks.layoutAndVisibility.status, 'passed');

  const [plan, applications] = await Promise.all([
    readJson(rendered.outputs.plan),
    readJson(rendered.outputs.applicationResults),
  ]);
  const evidenceDirectory = path.join(rendered.fixture.directory, 'actual-composite-frame-evidence');
  await mkdir(evidenceDirectory, {recursive: true});
  const expectedFrameByInstruction = new Map();
  for (const application of applications.results) {
    const overlayPath = path.join(rendered.fixture.outputDirectory, application.overlayFile);
    const expectedPath = path.join(evidenceDirectory, `${application.instructionId}-expected.png`);
    await flattenOverlayOnBlack(overlayPath, expectedPath);
    expectedFrameByInstruction.set(application.instructionId, expectedPath);
  }

  // 各指示が単独で発火している代表frameを、全9 overlay候補と照合する。
  // 正しい指示のPNGが最小差分で、演出なし対照よりも近いことを要求する。
  for (const element of plan.elements) {
    const frame = element.startFrame + Math.floor(element.displayFrameCount / 2);
    const actualFrame = path.join(evidenceDirectory, `${element.instructionId}-actual-${frame}.png`);
    const noPresentationFrame = path.join(evidenceDirectory, `${element.instructionId}-control-${frame}.png`);
    await extractFrame(rendered.outputs.video, frame, actualFrame);
    await extractFrame(rendered.fixture.controlMediaPath, frame, noPresentationFrame);
    const candidateMetrics = [];
    for (const [instructionId, expectedPath] of expectedFrameByInstruction) {
      candidateMetrics.push({instructionId, value: await imageRmse(actualFrame, expectedPath)});
    }
    candidateMetrics.sort((left, right) => left.value - right.value || left.instructionId.localeCompare(right.instructionId));
    assert.equal(candidateMetrics[0].instructionId, element.instructionId, `別指示の表示で代替されています: ${element.instructionId}`);
    const noPresentationMetric = await imageRmse(actualFrame, noPresentationFrame);
    assert.ok(candidateMetrics[0].value < noPresentationMetric, `再符号化差分しかありません: ${element.instructionId}`);
  }

  // 4 frame fadeの実合成値を、同じ符号化を通した演出なし対照との差で確認する。
  const transitionElement = plan.elements.find((element) => element.instructionId === 'instruction-important');
  const frameMetric = async (frame) => {
    const actualPath = path.join(evidenceDirectory, `transition-actual-${frame}.png`);
    const controlPath = path.join(evidenceDirectory, `transition-control-${frame}.png`);
    await extractFrame(rendered.outputs.video, frame, actualPath);
    await extractFrame(rendered.fixture.controlMediaPath, frame, controlPath);
    return imageRmse(actualPath, controlPath);
  };
  const before = await frameMetric(transitionElement.startFrame - 1);
  const entry = [];
  for (let offset = 0; offset < 4; offset += 1) entry.push(await frameMetric(transitionElement.startFrame + offset));
  const exit = [];
  for (let offset = 4; offset > 0; offset -= 1) exit.push(await frameMetric(transitionElement.endFrameExclusive - offset));
  const afterValue = await frameMetric(transitionElement.endFrameExclusive);
  assert.equal(before, 0, '表示区間の前でalphaが0になっていません');
  assert.ok(entry[0] < entry[1] && entry[1] < entry[2] && entry[2] < entry[3], `entry 4 frameが増加しません: ${entry}`);
  assert.ok(exit[0] > exit[1] && exit[1] > exit[2] && exit[2] > exit[3], `exit 4 frameが減少しません: ${exit}`);
  assert.equal(afterValue, 0, '表示区間の後でalphaが0になっていません');
});

test('17 適用結果・manifest・QC・CLI 0/1/2・publish後残留警告で成功を覆さない・全固有コード集合を固定する', async () => {
  const rendered = await getRenderedFixture();
  const [plan, applications, manifest, qc] = await Promise.all([
    readJson(rendered.outputs.plan),
    readJson(rendered.outputs.applicationResults),
    readJson(rendered.outputs.manifest),
    readJson(rendered.outputs.qc),
  ]);
  assert.equal(rendered.processResult.code, 0);
  assert.match(rendered.processResult.stderr, /published_with_retained_safety_artifacts/);
  assert.match(rendered.processResult.stderr, /RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY/);
  assert.match(rendered.processResult.stderr, /RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY/);
  const retainedEntries = await readdir(rendered.fixture.directory);
  assert.equal(
    retainedEntries.filter((name) => name.includes('.output.presentation-renderer-v002.lock')).length,
    1,
    'publish後も所有lockを安全診断として保持していません',
  );
  assert.equal(
    retainedEntries.filter((name) => name.includes('.output.presentation-renderer-v002-work-')).length,
    1,
    'publish後もwork directoryを安全診断として保持していません',
  );
  assert.equal(plan.schemaVersion, 'presentation-render-plan-v002');
  assert.equal(plan.rendererVersion, 'presentation-renderer-v002');
  assert.equal(plan.timelineSchemaVersion, 'presentation-base-media-timeline-v002');
  assert.equal(Object.hasOwn(plan.elements[0], 'outputStartMs'), false);
  assert.equal(Object.hasOwn(plan.elements[0], 'outputEndMs'), false);
  assert.equal(applications.schemaVersion, 'presentation-render-application-results-v002');
  assert.equal(applications.results.length, 9);
  assert.equal(manifest.schemaVersion, 'presentation-render-manifest-v002');
  assert.deepEqual(Object.keys(manifest).sort(), [
    'baseMediaBuildId',
    'baseMediaGenerationManifestFileSha256',
    'baseMediaToolVerification',
    'git',
    'inputs',
    'instructionSetId',
    'output',
    'presetRegistryVersion',
    'rendererFiles',
    'rendererTrustCanonicalSha256',
    'rendererVersion',
    'resolutionPackageCanonicalSha256',
    'resolutionPackageGenerationManifestFileSha256',
    'resolutionPackageId',
    'schemaVersion',
    'timelineId',
    'tools',
    'trustedAppearance',
  ].sort());
  assert.equal(manifest.baseMediaBuildId, rendered.fixture.generationManifest.buildId);
  assert.equal(manifest.baseMediaToolVerification.status, 'passed');
  assert.deepEqual(Object.keys(manifest.baseMediaToolVerification).sort(), ['expected', 'observed', 'status']);
  assert.deepEqual(manifest.baseMediaToolVerification.expected, manifest.baseMediaToolVerification.observed);
  assert.equal(
    manifest.inputs.baseMediaGenerationManifest.fileSha256,
    rendered.fixture.job.baseMediaGenerationManifest.fileSha256,
  );
  assert.ok(manifest.rendererFiles.some((entry) => entry.path.endsWith('presentation_base_media_timeline_v002.mjs')));
  assert.ok(manifest.rendererFiles.some((entry) => entry.path.endsWith('presentation_renderer_plan_v002.mjs')));
  assert.ok(manifest.rendererFiles.some((entry) => entry.path.endsWith('presentation_renderer_qc_v002.mjs')));
  assert.equal(manifest.rendererTrustCanonicalSha256, PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256);
  assert.equal(qc.schemaVersion, 'presentation-render-qc-v002');
  assert.equal(qc.status, 'passed');
  assert.deepEqual(plan, await readJson(rendered.outputs.plan));
  assert.deepEqual(applications, await readJson(rendered.outputs.applicationResults));
  assert.deepEqual(qc, await readJson(rendered.outputs.qc));
  const syntheticRecords = plan.elements.map((element) => {
    const result = applications.results.find((item) => item.instructionId === element.instructionId);
    return {
      element,
      finalElement: {...element, overlaySha256: result.overlaySha256},
      props: {
        instructionId: element.instructionId,
        stateId: element.stateId,
        layoutRules: plan.layoutRules,
      },
      pngPath: path.join('/synthetic', path.basename(result.overlayFile)),
      pngSha256: result.overlaySha256,
    };
  });
  const applicationFirst = buildPresentationRenderApplicationResultsV002(syntheticRecords);
  const applicationSecond = buildPresentationRenderApplicationResultsV002(clone(syntheticRecords));
  assert.deepEqual(applicationSecond, applicationFirst);
  assert.equal(JSON.stringify(applicationSecond), JSON.stringify(applicationFirst));

  const deterministic = validateOverlayDeterminismV002('a'.repeat(64), 'a'.repeat(64), 'instruction-1');
  assert.equal(deterministic.status, 'passed');
  assertHasCode(validateOverlayDeterminismV002('a'.repeat(64), 'b'.repeat(64), 'instruction-1'), 'OVERLAY_RENDER_NONDETERMINISTIC');

  const badHash = clone(rendered.fixture.job);
  badHash.instructionBundle.fileSha256 = '0'.repeat(64);
  const badHashResult = await executePresentationRendererV002(badHash);
  assertHasCode(badHashResult.failure, 'RENDER_JOB_INPUT_HASH_MISMATCH');

  const badGeneration = clone(rendered.fixture.resolutionGenerationManifest);
  badGeneration.output.sourceAtomsCanonicalSha256 = '0'.repeat(64);
  const badGenerationResult = await mutateTransportAndExecute(rendered.fixture, 'generation', badGeneration);
  assertHasCode(badGenerationResult.failure, 'RESOLUTION_GENERATION_MANIFEST_MISMATCH');

  const baseQc = makeValidQcInput(plan);
  const missing = clone(baseQc);
  missing.applicationResults.shift();
  assertHasCode(evaluatePresentationRendererQcV002(missing), 'INSTRUCTION_RENDER_MISSING');
  const duplicated = clone(baseQc);
  duplicated.applicationResults.push(clone(duplicated.applicationResults[0]));
  assertHasCode(evaluatePresentationRendererQcV002(duplicated), 'INSTRUCTION_RENDER_DUPLICATED');
  const wrongPreset = clone(baseQc);
  wrongPreset.applicationResults[0].appliedPresetId = 'other-preset';
  assertHasCode(evaluatePresentationRendererQcV002(wrongPreset), 'APPLIED_PRESET_MISMATCH');
  const noVideo = clone(baseQc);
  noVideo.mediaInspection.video = null;
  assertHasCode(evaluatePresentationRendererQcV002(noVideo), 'OUTPUT_VIDEO_STREAM_MISSING');
  const noAudio = clone(baseQc);
  noAudio.mediaInspection.audio = null;
  assertHasCode(evaluatePresentationRendererQcV002(noAudio), 'OUTPUT_AUDIO_STREAM_MISSING');
  const wrongAudio = clone(baseQc);
  wrongAudio.mediaInspection.audio.packetPayloadSha256 = 'c'.repeat(64);
  assertHasCode(evaluatePresentationRendererQcV002(wrongAudio), 'OUTPUT_AUDIO_PACKET_HASH_MISMATCH');
  const wrongFormat = clone(baseQc);
  wrongFormat.mediaInspection.video.width = 1280;
  assertHasCode(evaluatePresentationRendererQcV002(wrongFormat), 'OUTPUT_FORMAT_MISMATCH');
  const invisible = clone(baseQc);
  invisible.overlayInspections[0].changedPixelsAgainstInstructionOmittedFrame = 0;
  assertHasCode(evaluatePresentationRendererQcV002(invisible), 'OUTPUT_ELEMENT_NOT_VISIBLE');

  const failureDirectory = path.join(rendered.fixture.directory, 'failure-output');
  await mkdir(failureDirectory);
  const preservedManifestPath = path.join(
    failureDirectory,
    PRESENTATION_RENDERER_OUTPUT_NAMES.manifest,
  );
  await writeFile(preservedManifestPath, 'existing-success-must-not-change\n');
  const invalidJob = {...rendered.fixture.job, outputDirectory: failureDirectory, unexpected: true};
  const invalidJobPath = path.join(rendered.fixture.directory, 'invalid-job.json');
  await writeJson(invalidJobPath, invalidJob);
  const cliOne = await run(process.execPath, [RENDERER_CLI_PATH, invalidJobPath]);
  assert.equal(cliOne.code, 1);
  assert.equal(await readFile(preservedManifestPath, 'utf8'), 'existing-success-must-not-change\n');
  await assert.rejects(stat(path.join(failureDirectory, PRESENTATION_RENDERER_OUTPUT_NAMES.failure)));
  const cliTwo = await run(process.execPath, [RENDERER_CLI_PATH, path.join(rendered.fixture.directory, 'missing-job.json')]);
  assert.equal(cliTwo.code, 2);
  const directTwo = await runPresentationRendererJobFileV002(path.join(rendered.fixture.directory, 'missing-job.json'));
  assert.equal(directTwo.exitCode, 2);

  const symlinkFixture = path.join(rendered.fixture.directory, 'ancestor-symlink-safety');
  const symlinkWorkspace = path.join(symlinkFixture, 'workspace');
  const externalDirectory = path.join(symlinkFixture, 'external');
  await Promise.all([
    mkdir(symlinkWorkspace, {recursive: true}),
    mkdir(externalDirectory, {recursive: true}),
  ]);
  await symlink(externalDirectory, path.join(symlinkWorkspace, 'outputs'), 'dir');
  await assert.rejects(
    ensureDirectoryChainNoSymlinkV002(
      symlinkWorkspace,
      path.join(symlinkWorkspace, 'outputs', 'presentation'),
    ),
    (error) => error?.code === 'UNSAFE_PRESENTATION_OUTPUT_DIRECTORY',
  );
  await assert.rejects(stat(path.join(externalDirectory, 'presentation')));

  const allExported = new Set(PRESENTATION_RENDERER_VIOLATION_CODES);
  const expectedUnion = new Set([
    ...PRESENTATION_RENDERER_CORE_VIOLATION_CODES,
    ...PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_QC_VIOLATION_CODES,
    'RENDER_JOB_SCHEMA_INVALID',
    'RENDER_JOB_UNKNOWN_FIELD',
    'RENDER_JOB_INPUT_HASH_MISMATCH',
    'FONT_LOAD_FAILED',
    'FONT_FALLBACK_DETECTED',
    'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
    'INSTRUCTION_CONTRACT_NOT_PASSED',
    'INSTRUCTION_CONTRACT_PARTIAL',
    'OVERLAY_RENDER_NONDETERMINISTIC',
    'BASE_MEDIA_TOOL_PROFILE_MISMATCH',
    'RENDER_OUTPUT_ALREADY_EXISTS',
    'RENDER_OUTPUT_LOCKED',
    'RENDER_OUTPUT_LOCK_OWNERSHIP_LOST',
    'RENDER_OUTPUT_PUBLISH_FAILED',
  ]);
  assert.deepEqual(allExported, expectedUnion);
  assert.deepEqual(
    new Set([...observedCodes].filter((code) => allExported.has(code))),
    allExported,
    `未発火: ${[...allExported].filter((code) => !observedCodes.has(code)).join(', ')}`,
  );
});

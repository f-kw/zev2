import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationResolutionPackageV002,
} from './build_presentation_resolution_package_v002.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  frameBoundaryV001 as timelineFrameBoundaryV001,
  mapPresentationSourceIntervalV001,
  validatePresentationBaseMediaTimelineV001,
} from './presentation_base_media_timeline_v001.mjs';
import {
  validatePresentationInstructionContract,
} from './presentation_instruction_contract_v002.mjs';
import {
  PRESENTATION_RENDERER_CORE_VIOLATION_CODES,
  PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
  buildPresentationRendererPlanV001,
  evaluatePresentationRendererToolVersionsV001,
  evaluatePresentationRendererTrustRootV001,
  evaluatePresentationRendererTrustedArtifactV001,
  loadAndValidatePresentationRendererTrustV001,
} from './presentation_renderer_plan_v001.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  audioPacketPayloadSha256V001,
  evaluatePresentationRendererQcV001,
  fileSha256V001,
  inspectRenderedMediaV001,
} from './presentation_renderer_qc_v001.mjs';
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
  buildPresentationRenderApplicationResultsV001,
  classifyPresentationRenderErrorV001,
  ensureDirectoryChainNoSymlinkV001,
  executePresentationRendererV001,
  runPresentationRendererJobFileV001,
  validateOverlayDeterminismV001,
  validatePresentationRenderJobV001,
  validateResolutionGenerationManifestV001,
} from './render_presentation_v001.mjs';

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
  'testdata/presentation-renderer-v001/synthetic-source.json',
);
const SYNTHETIC_TEST_OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/renderer-v001-synthetic-test',
);
const RENDERER_CLI_PATH = path.join(MODULE_DIRECTORY, 'render_presentation_v001.mjs');
const rendererPlanModulePromise = import('./presentation_renderer_plan_v001.mjs');
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
  const syntheticSourceHash = await fileSha256V001(SYNTHETIC_SOURCE_PATH);
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
      path: 'evals/clip_composition/testdata/presentation-renderer-v001/synthetic-source.json',
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

const makeTimeline = (fileSha256 = '0'.repeat(64), baseMediaPath = 'synthetic-base.mp4') => ({
  schemaVersion: 'presentation-base-media-timeline-v001',
  timelineId: 'presentation-renderer-synthetic-timeline-v001',
  sourceProvenance: 'presentation-renderer-synthetic-source-v001',
  baseMedia: {
    artifactId: 'presentation-renderer-synthetic-base-v001',
    path: baseMediaPath,
    fileSha256,
    expectedFrameCount: 270,
  },
  sourceRef: 'synthetic-source-v001',
  segments: [
    {segmentId: 'segment-before-cut', sourceStartMs: 1000, sourceEndMs: 5000, outputStartMs: 0, outputEndMs: 4000},
    {segmentId: 'segment-after-cut', sourceStartMs: 6000, sourceEndMs: 11000, outputStartMs: 4000, outputEndMs: 9000},
  ],
});

const logicalFixturePromise = (async () => {
  const formal = await formalAssetsPromise;
  const {bundle, generationManifest} = await makeSyntheticBundle();
  const timeline = makeTimeline();
  const outer = validatePresentationInstructionContract(bundle, formal.binding);
  assert.equal(outer.overallStatus, 'passed', JSON.stringify(outer, null, 2));
  const planReport = buildPresentationRendererPlanV001({
    bundle,
    presetRegistry: formal.presetRegistry,
    timeline,
    generationManifest,
    layoutRules: formal.trust.layoutRules,
  });
  assert.equal(planReport.status, 'passed', JSON.stringify(planReport, null, 2));
  return {formal, bundle, generationManifest, timeline, planReport};
})();

const createInputFiles = async ({withBaseMedia = false} = {}) => {
  const fixture = await logicalFixturePromise;
  await mkdir(SYNTHETIC_TEST_OUTPUT_ROOT, {recursive: true});
  const directory = await mkdtemp(path.join(SYNTHETIC_TEST_OUTPUT_ROOT, 'case-'));
  const bundlePath = path.join(directory, 'bundle.json');
  // productionは正式trustに固定された実pathも照合する。内容が同じ一時copyで迂回しない。
  const bindingPath = REGISTRY_BINDING_PATH;
  const presetPath = PRESET_REGISTRY_PATH;
  const generationPath = path.join(directory, 'generation.json');
  const timelinePath = path.join(directory, 'timeline.json');
  const jobPath = path.join(directory, 'job.json');
  const outputDirectory = path.join(directory, 'output');
  const baseMediaPath = path.join(directory, 'synthetic-base.mp4');
  const controlMediaPath = path.join(directory, 'synthetic-control-reencoded.mp4');
  const [bundleHash, bindingHash, generationHash] = await Promise.all([
    writeJson(bundlePath, fixture.bundle),
    fileSha256V001(bindingPath),
    writeJson(generationPath, fixture.generationManifest),
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
    baseMediaHash = await fileSha256V001(baseMediaPath);
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
  const timeline = makeTimeline(baseMediaHash, baseMediaPath);
  const timelineHash = await writeJson(timelinePath, timeline);
  const job = {
    schemaVersion: 'presentation-render-job-v001',
    instructionBundle: {path: bundlePath, fileSha256: bundleHash},
    registryBinding: {path: bindingPath, fileSha256: bindingHash},
    presetRegistry: {path: presetPath, canonicalSha256: sha256Canonical(fixture.formal.presetRegistry)},
    resolutionGenerationManifest: {path: generationPath, fileSha256: generationHash},
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
    timelinePath,
    jobPath,
    outputDirectory,
    baseMediaPath,
    controlMediaPath: withBaseMedia ? controlMediaPath : null,
    timeline,
    job,
  };
};

const mutateTransportAndExecute = async (fixture, field, value) => {
  const filePath = path.join(fixture.directory, `${field}-${Date.now()}-${Math.random()}.json`);
  const fileHash = await writeJson(filePath, value);
  const job = clone(fixture.job);
  if (field === 'bundle') job.instructionBundle = {path: filePath, fileSha256: fileHash};
  else if (field === 'generation') job.resolutionGenerationManifest = {path: filePath, fileSha256: fileHash};
  else if (field === 'timeline') job.baseMediaTimeline = {path: filePath, fileSha256: fileHash};
  else throw new Error(`unsupported mutation field: ${field}`);
  return executePresentationRendererV001(job);
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
      planFile: 'presentation-render-plan-v001.json',
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
    assertHasCode(validatePresentationRenderJobV001(null), 'RENDER_JOB_SCHEMA_INVALID');
    const unknown = {...fixture.job, unapprovedTrustPath: '/tmp/not-allowed.json'};
    assertHasCode(validatePresentationRenderJobV001(unknown), 'RENDER_JOB_UNKNOWN_FIELD');
    const badHash = clone(fixture.job);
    badHash.instructionBundle.fileSha256 = 'not-a-sha256';
    assertHasCode(validatePresentationRenderJobV001(badHash), 'RENDER_JOB_SCHEMA_INVALID');
    const invalidTimeline = {...fixture.timeline, unknown: true};
    assertHasCode(
      validatePresentationBaseMediaTimelineV001(invalidTimeline, fixture.generationManifest),
      'BASE_MEDIA_TIMELINE_INVALID',
    );
    assert.ok(!Object.hasOwn(fixture.job, 'rendererTrust'));
  } finally {
    await rm(fixture.directory, {recursive: true, force: true});
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
  assert.equal(classifyPresentationRenderErrorV001(new Error('PRESENTATION_FONT_FALLBACK_DETECTED:inactive')), 'FONT_FALLBACK_DETECTED');
  observedCodes.add('FONT_FALLBACK_DETECTED');
  assert.equal(classifyPresentationRenderErrorV001(new Error('PRESENTATION_FONT_LOAD_FAILED:missing')), 'FONT_LOAD_FAILED');
  observedCodes.add('FONT_LOAD_FAILED');
  assert.equal(classifyPresentationRenderErrorV001(new Error('other failure')), null);

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
  assert.deepEqual(
    planReport.plan.elements.map((element) => element.instructionId),
    INSTRUCTION_DEFINITIONS.map((entry) => `instruction-${entry[0]}`),
  );
  const repeat = buildPresentationRendererPlanV001({
    bundle: fixture.bundle,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
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
  const plan = buildPresentationRendererPlanV001({
    bundle: missingPerson,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    layoutRules: fixture.formal.trust.layoutRules,
  });
  assertHasCode(plan, 'PERSON_TARGET_REQUIRED');
});

test('09 1 source・cut対応・速度・frame数・未対応・曖昧・segment跨ぎを個別に止める', async () => {
  const fixture = await logicalFixturePromise;
  const passed = validatePresentationBaseMediaTimelineV001(fixture.timeline, fixture.generationManifest, {
    fileSha256: fixture.timeline.baseMedia.fileSha256,
    frameCount: 270,
  });
  assert.equal(passed.status, 'passed');
  assert.deepEqual(mapPresentationSourceIntervalV001(fixture.timeline, 6000, 7000).mapping, {
    timelineSegmentId: 'segment-after-cut',
    sourceStartMs: 6000,
    sourceEndMs: 7000,
    outputStartMs: 4000,
    outputEndMs: 5000,
  });
  assert.equal(timelineFrameBoundaryV001(9000), 270);

  const multipleSource = clone(fixture.generationManifest);
  multipleSource.sourceArtifacts.push({...multipleSource.sourceArtifacts[0], sourceRef: 'other-source'});
  assertHasCode(validatePresentationBaseMediaTimelineV001(fixture.timeline, multipleSource), 'RENDER_SOURCE_COUNT_UNSUPPORTED');
  assertHasCode(validatePresentationBaseMediaTimelineV001(fixture.timeline, fixture.generationManifest, {
    fileSha256: '1'.repeat(64), frameCount: 270,
  }), 'BASE_MEDIA_HASH_MISMATCH');
  assertHasCode(validatePresentationBaseMediaTimelineV001(fixture.timeline, fixture.generationManifest, {
    fileSha256: fixture.timeline.baseMedia.fileSha256, frameCount: 269,
  }), 'BASE_MEDIA_FRAME_COUNT_MISMATCH');
  const wrongRef = clone(fixture.timeline);
  wrongRef.sourceRef = 'other-source';
  assertHasCode(validatePresentationBaseMediaTimelineV001(wrongRef, fixture.generationManifest), 'TIMELINE_SOURCE_REF_MISMATCH');
  const overlap = clone(fixture.timeline);
  overlap.segments[1].sourceStartMs = 4500;
  overlap.segments[1].sourceEndMs = 9500;
  assertHasCode(validatePresentationBaseMediaTimelineV001(overlap, fixture.generationManifest), 'TIMELINE_SEGMENT_SOURCE_OVERLAP');
  const gap = clone(fixture.timeline);
  gap.segments[1].outputStartMs = 4001;
  gap.segments[1].outputEndMs = 9001;
  assertHasCode(validatePresentationBaseMediaTimelineV001(gap, fixture.generationManifest), 'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS');
  const speed = clone(fixture.timeline);
  speed.segments[0].outputEndMs = 3999;
  assertHasCode(validatePresentationBaseMediaTimelineV001(speed, fixture.generationManifest), 'TIMELINE_SPEED_CHANGE_UNSUPPORTED');
  assertHasCode(mapPresentationSourceIntervalV001(fixture.timeline, 5000, 6000), 'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED');
  const ambiguous = clone(fixture.timeline);
  ambiguous.segments.push({segmentId: 'duplicate-map', sourceStartMs: 6000, sourceEndMs: 11000, outputStartMs: 9000, outputEndMs: 14000});
  assertHasCode(mapPresentationSourceIntervalV001(ambiguous, 7000, 8000), 'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS');
  assertHasCode(mapPresentationSourceIntervalV001(fixture.timeline, 4500, 6500), 'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED');

  const invalidTimeline = clone(fixture.timeline);
  invalidTimeline.segments = [];
  assertHasCode(buildPresentationRendererPlanV001({
    bundle: fixture.bundle,
    presetRegistry: fixture.formal.presetRegistry,
    timeline: invalidTimeline,
    generationManifest: fixture.generationManifest,
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'TARGET_TIMELINE_INVALID');
});

test('10 output msを共有frame境界へ写し0尺と短尺alpha包絡を固定する', () => {
  assert.equal(frameBoundaryV001(0), 0);
  assert.equal(frameBoundaryV001(1000), 30);
  assert.equal(frameBoundaryV001(1016), 30);
  assert.deepEqual(mapOutputIntervalToFramesV001(0, 1000).frames, {
    startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30,
  });
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
  assertHasCode(buildPresentationRendererPlanV001({
    bundle: fixture.bundle,
    presetRegistry: noState,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'TARGET_RESOLUTION_FAILED');
  const wrongVersion = clone(fixture.formal.presetRegistry);
  wrongVersion.registryVersion = 'other-registry-v001';
  assertHasCode(buildPresentationRendererPlanV001({
    bundle: fixture.bundle,
    presetRegistry: wrongVersion,
    timeline: fixture.timeline,
    generationManifest: fixture.generationManifest,
    layoutRules: fixture.formal.trust.layoutRules,
  }), 'APPLIED_PRESET_MISMATCH');
});

test('12 行数・行の正の交差・安全領域・空alphaを独立して検出する', async () => {
  const {planReport} = await logicalFixturePromise;
  const base = makeValidQcInput(planReport.plan);
  const first = evaluatePresentationRendererQcV001(base);
  const second = evaluatePresentationRendererQcV001(clone(base));
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
  const lineCount = clone(base);
  lineCount.overlayInspections[0].lineCount = 3;
  assertHasCode(evaluatePresentationRendererQcV001(lineCount), 'LAYOUT_LINE_COUNT_EXCEEDED');
  const intersection = clone(base);
  intersection.overlayInspections[0].lineAlphaBounds.push({
    ...clone(intersection.overlayInspections[0].lineAlphaBounds[0]),
    lineIndex: 1,
  });
  intersection.plan.elements[0].indexedLines.push(clone(intersection.plan.elements[0].indexedLines[0]));
  assertHasCode(evaluatePresentationRendererQcV001(intersection), 'LAYOUT_LINE_POSITIVE_INTERSECTION');
  const unsafe = clone(base);
  unsafe.overlayInspections[0].alphaBounds.left = 0;
  assertHasCode(evaluatePresentationRendererQcV001(unsafe), 'LAYOUT_SAFE_AREA_VIOLATION');
  const empty = clone(base);
  empty.overlayInspections[0].alphaMax = 0;
  empty.overlayInspections[0].alphaBounds = null;
  assertHasCode(evaluatePresentationRendererQcV001(empty), 'OVERLAY_ALPHA_EMPTY');

  const substitutedByAnotherInstruction = clone(base);
  substitutedByAnotherInstruction.overlayInspections[0].changedPixelsAgainstBase = 100;
  substitutedByAnotherInstruction.overlayInspections[0].changedPixelsAgainstInstructionOmittedFrame = 0;
  assertHasCode(
    evaluatePresentationRendererQcV001(substitutedByAnotherInstruction),
    'OUTPUT_ELEMENT_NOT_VISIBLE',
  );
  const mismatchedArtifact = clone(base);
  mismatchedArtifact.applicationResults[0].overlaySha256 = 'f'.repeat(64);
  assertHasCode(
    evaluatePresentationRendererQcV001(mismatchedArtifact),
    'OVERLAY_RENDER_ARTIFACT_MISMATCH',
  );
  const duplicatedPath = clone(base);
  duplicatedPath.applicationResults[1].overlayFile = duplicatedPath.applicationResults[0].overlayFile;
  assertHasCode(
    evaluatePresentationRendererQcV001(duplicatedPath),
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
  assertHasCode(evaluatePresentationRendererQcV001(collisionInput), 'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION');

  const touching = clone(two);
  touching.elements[1].startFrame = touching.elements[0].endFrameExclusive;
  touching.elements[1].endFrameExclusive = touching.elements[1].startFrame + 30;
  const touchingReport = evaluatePresentationRendererQcV001(makeValidQcInput(touching));
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
    assert.equal(await fileSha256V001(filePath), element.overlaySha256);
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
  const outputMedia = await inspectRenderedMediaV001(rendered.outputs.video);
  const baseMedia = await inspectRenderedMediaV001(rendered.fixture.baseMediaPath);
  const qc = await readJson(rendered.outputs.qc);
  assert.deepEqual(
    {width: outputMedia.video.width, height: outputMedia.video.height, fps: outputMedia.video.fps},
    {width: 1920, height: 1080, fps: 30},
  );
  assert.equal(outputMedia.video.frameCount, 270);
  assert.equal(outputMedia.audio.codecName, baseMedia.audio.codecName);
  assert.equal(outputMedia.audio.packetPayloadSha256, baseMedia.audio.packetPayloadSha256);
  assert.equal(await audioPacketPayloadSha256V001(rendered.outputs.video), await audioPacketPayloadSha256V001(rendered.fixture.baseMediaPath));
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

test('17 適用結果・manifest・QC・CLI 0/1/2・失敗清掃・全固有コード集合を固定する', async () => {
  const rendered = await getRenderedFixture();
  const [plan, applications, manifest, qc] = await Promise.all([
    readJson(rendered.outputs.plan),
    readJson(rendered.outputs.applicationResults),
    readJson(rendered.outputs.manifest),
    readJson(rendered.outputs.qc),
  ]);
  assert.equal(rendered.processResult.code, 0);
  assert.equal(applications.schemaVersion, 'presentation-render-application-results-v001');
  assert.equal(applications.results.length, 9);
  assert.equal(manifest.schemaVersion, 'presentation-render-manifest-v001');
  assert.equal(manifest.rendererTrustCanonicalSha256, PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256);
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
  const applicationFirst = buildPresentationRenderApplicationResultsV001(syntheticRecords);
  const applicationSecond = buildPresentationRenderApplicationResultsV001(clone(syntheticRecords));
  assert.deepEqual(applicationSecond, applicationFirst);
  assert.equal(JSON.stringify(applicationSecond), JSON.stringify(applicationFirst));

  const deterministic = validateOverlayDeterminismV001('a'.repeat(64), 'a'.repeat(64), 'instruction-1');
  assert.equal(deterministic.status, 'passed');
  assertHasCode(validateOverlayDeterminismV001('a'.repeat(64), 'b'.repeat(64), 'instruction-1'), 'OVERLAY_RENDER_NONDETERMINISTIC');

  const badHash = clone(rendered.fixture.job);
  badHash.instructionBundle.fileSha256 = '0'.repeat(64);
  const badHashResult = await executePresentationRendererV001(badHash);
  assertHasCode(badHashResult.failure, 'RENDER_JOB_INPUT_HASH_MISMATCH');

  const badGeneration = clone(rendered.fixture.generationManifest);
  badGeneration.output.sourceAtomsCanonicalSha256 = '0'.repeat(64);
  const badGenerationResult = await mutateTransportAndExecute(rendered.fixture, 'generation', badGeneration);
  assertHasCode(badGenerationResult.failure, 'RESOLUTION_GENERATION_MANIFEST_MISMATCH');

  const baseQc = makeValidQcInput(plan);
  const missing = clone(baseQc);
  missing.applicationResults.shift();
  assertHasCode(evaluatePresentationRendererQcV001(missing), 'INSTRUCTION_RENDER_MISSING');
  const duplicated = clone(baseQc);
  duplicated.applicationResults.push(clone(duplicated.applicationResults[0]));
  assertHasCode(evaluatePresentationRendererQcV001(duplicated), 'INSTRUCTION_RENDER_DUPLICATED');
  const wrongPreset = clone(baseQc);
  wrongPreset.applicationResults[0].appliedPresetId = 'other-preset';
  assertHasCode(evaluatePresentationRendererQcV001(wrongPreset), 'APPLIED_PRESET_MISMATCH');
  const noVideo = clone(baseQc);
  noVideo.mediaInspection.video = null;
  assertHasCode(evaluatePresentationRendererQcV001(noVideo), 'OUTPUT_VIDEO_STREAM_MISSING');
  const noAudio = clone(baseQc);
  noAudio.mediaInspection.audio = null;
  assertHasCode(evaluatePresentationRendererQcV001(noAudio), 'OUTPUT_AUDIO_STREAM_MISSING');
  const wrongAudio = clone(baseQc);
  wrongAudio.mediaInspection.audio.packetPayloadSha256 = 'c'.repeat(64);
  assertHasCode(evaluatePresentationRendererQcV001(wrongAudio), 'OUTPUT_AUDIO_PACKET_HASH_MISMATCH');
  const wrongFormat = clone(baseQc);
  wrongFormat.mediaInspection.video.width = 1280;
  assertHasCode(evaluatePresentationRendererQcV001(wrongFormat), 'OUTPUT_FORMAT_MISMATCH');
  const invisible = clone(baseQc);
  invisible.overlayInspections[0].changedPixelsAgainstInstructionOmittedFrame = 0;
  assertHasCode(evaluatePresentationRendererQcV001(invisible), 'OUTPUT_ELEMENT_NOT_VISIBLE');

  const failureDirectory = path.join(rendered.fixture.directory, 'failure-output');
  const invalidJob = {...rendered.fixture.job, outputDirectory: failureDirectory, unexpected: true};
  const invalidJobPath = path.join(rendered.fixture.directory, 'invalid-job.json');
  await writeJson(invalidJobPath, invalidJob);
  const cliOne = await run(process.execPath, [RENDERER_CLI_PATH, invalidJobPath]);
  assert.equal(cliOne.code, 1);
  assert.ok((await stat(path.join(failureDirectory, PRESENTATION_RENDERER_OUTPUT_NAMES.failure))).isFile());
  for (const [key, name] of Object.entries(PRESENTATION_RENDERER_OUTPUT_NAMES)) {
    if (key === 'failure') continue;
    await assert.rejects(stat(path.join(failureDirectory, name)));
  }
  const cliTwo = await run(process.execPath, [RENDERER_CLI_PATH, path.join(rendered.fixture.directory, 'missing-job.json')]);
  assert.equal(cliTwo.code, 2);
  const directTwo = await runPresentationRendererJobFileV001(path.join(rendered.fixture.directory, 'missing-job.json'));
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
    ensureDirectoryChainNoSymlinkV001(
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
  ]);
  assert.deepEqual(allExported, expectedUnion);
  assert.deepEqual(
    new Set([...observedCodes].filter((code) => allExported.has(code))),
    allExported,
    `未発火: ${[...allExported].filter((code) => !observedCodes.has(code)).join(', ')}`,
  );
});

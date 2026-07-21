#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  inspectPresentationBaseMediaOutputV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {computePresentationRetainedSegmentsV001} from './presentation_first_real_data_gate_v001.mjs';

export const PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_VERSION =
  'presentation-first-real-data-rendered-comparison-manifest-v001';
export const PRESENTATION_RENDERED_COMPARISON_PROVENANCE_SCHEMA_VERSION =
  'presentation-first-real-data-rendered-comparison-provenance-v001';
export const PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_VERSION =
  'presentation-rendered-comparison-build-summary-v001';
export const PRESENTATION_RENDERED_COMPARISON_BUILDER_VERSION =
  'presentation-first-real-data-rendered-comparison-builder-v001';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-first-real-data-rendered-comparison-v001',
);
const SOURCE_PATH = path.join(
  MODULE_DIRECTORY,
  'research/downloads/first-gate-unseen/DmWu0jVQfTE/native-1080p/',
  'DmWu0jVQfTE.native-1080p-h264-opus.mp4',
);
const SOURCE_SHA256 = 'a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee';
const MEDIA_EQUIVALENCE_PATH = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260721-first-real-data-assembly-gate-v001/media-equivalence.json',
);
const MEDIA_EQUIVALENCE_SHA256 = '98c0f2018553f39a855610c569f2908efecccc0dadb696fc2b156d19010c15ea';
const SOURCE_IDENTITY_PATH = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260721-first-real-data-assembly-gate-v001/source-identity.json',
);
const SOURCE_IDENTITY_SHA256 = 'a7c9e9a8c3917662bcf3b66fad46cedc56f5ca558467226453339ea370108993';
const CANDIDATE_MANIFEST_PATH = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json',
);
const CANDIDATE_MANIFEST_SHA256 = '3937747e947ef0dd27a67e289d06cece8c17a55b655c85fa7d6aaf21f696ec12';

const CANDIDATE = Object.freeze({
  candidateId: 13,
  title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
  startMs: 1920260,
  endMs: 2008506,
});
const GAPS = Object.freeze([
  Object.freeze({gapId: 'gap-01', startMs: 1948058, endMs: 1949982}),
  Object.freeze({gapId: 'gap-02', startMs: 1977670, endMs: 1981394}),
]);
const VARIANT_DEFINITIONS = Object.freeze([
  Object.freeze({variantId: 'keep-both', cutGapIds: Object.freeze([])}),
  Object.freeze({variantId: 'cut-both', cutGapIds: Object.freeze(['gap-01', 'gap-02'])}),
  Object.freeze({variantId: 'cut-gap1', cutGapIds: Object.freeze(['gap-01'])}),
  Object.freeze({variantId: 'cut-gap2', cutGapIds: Object.freeze(['gap-02'])}),
]);
const SOURCE_CLOCK = Object.freeze({fps: 60, decodedFrameCount: 528840, logicalFrameCount: 264420});
const AUDIO_CLOCK = Object.freeze({
  sampleRate: 48000,
  channels: 2,
  channelLayout: 'stereo',
  sourceGridMappingEndSample: 423073008,
});
// 直前の実キーフレーム。30fps論理frameと48kHz sampleの双方で整数境界になる。
const SEEK_WINDOW = Object.freeze({
  sourceStartSeconds: 1918,
  sourceStartFrame30: 57540,
  sourceStartSample: 92064000,
  // candidate終端の次の論理frameまでdecodeして、最後に残すframeの表示時間を
  // 30fpsの1frameへ確定する。trim境界はcandidate終端のままで、内容は追加しない。
  durationSeconds: 2716 / 30,
});

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const repoPath = (filePath) => path.relative(WORKSPACE_ROOT, filePath);
const writeJson = (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const fileSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});
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
  child.on('close', (code) => {
    const result = {code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
    if (code === 0) resolve(result);
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${result.stderr.toString()}`));
  });
});

const assertRegularFileWithoutSymlink = async (filePath) => {
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`unsafe file: ${filePath}`);
  const resolved = await realpath(filePath);
  if (resolved !== path.resolve(filePath)) throw new Error(`resolved path differs: ${filePath}`);
};

const fixedArtifact = async (filePath, expectedHash) => {
  await assertRegularFileWithoutSymlink(filePath);
  const observedHash = await fileSha256(filePath);
  if (observedHash !== expectedHash) {
    throw new Error(`fixed artifact hash mismatch: ${repoPath(filePath)}`);
  }
  return {path: repoPath(filePath), fileSha256: observedHash};
};

const gapsForDefinition = (definition) => definition.cutGapIds.map((gapId) => {
  const gap = GAPS.find((item) => item.gapId === gapId);
  if (!gap) throw new Error(`unknown gap: ${gapId}`);
  return {startMs: gap.startMs, endMs: gap.endMs};
});

export const createPresentationRenderedComparisonPlanV001 = () => {
  const variants = VARIANT_DEFINITIONS.map((definition) => {
    const complement = computePresentationRetainedSegmentsV001(
      {startMs: CANDIDATE.startMs, endMs: CANDIDATE.endMs},
      gapsForDefinition(definition),
    );
    if (complement.status !== 'passed') {
      throw new Error(`retained segment calculation failed: ${definition.variantId}`);
    }
    const segmentPlan = validatePresentationBaseMediaSegmentPlanV001(
      complement.segments.map((segment) => ({sourceStartMs: segment.startMs, sourceEndMs: segment.endMs})),
      SOURCE_CLOCK,
      AUDIO_CLOCK,
    );
    if (segmentPlan.status !== 'passed') {
      throw new Error(`frame/sample mapping failed: ${definition.variantId}`);
    }
    const frameCount = segmentPlan.mappings.at(-1).outputEndFrame;
    const audioSampleCount = segmentPlan.mappings.at(-1).audioSamples.outputEnd;
    if (audioSampleCount !== frameCount * 1600) {
      throw new Error(`frame/audio mapping differs: ${definition.variantId}`);
    }
    return {
      variantId: definition.variantId,
      cutGapIds: [...definition.cutGapIds],
      mappings: segmentPlan.mappings,
      expectedFrameCount: frameCount,
      expectedAudioSampleCount: audioSampleCount,
    };
  });
  return {
    candidate: {...CANDIDATE},
    gaps: GAPS.map((gap) => ({...gap})),
    sourceClock: {...SOURCE_CLOCK},
    audioClock: {...AUDIO_CLOCK},
    seekWindow: {...SEEK_WINDOW},
    variants,
  };
};

const localizeMapping = (mapping) => {
  const sourceStartFrame30 = mapping.sourceStartFrame30 - SEEK_WINDOW.sourceStartFrame30;
  const sourceEndFrame30 = mapping.sourceEndFrame30 - SEEK_WINDOW.sourceStartFrame30;
  const sourceStartSample = mapping.audioSamples.sourceStart - SEEK_WINDOW.sourceStartSample;
  const sourceEndSample = mapping.audioSamples.sourceEnd - SEEK_WINDOW.sourceStartSample;
  if (
    sourceStartFrame30 < 0
    || sourceStartFrame30 >= sourceEndFrame30
    || sourceStartSample < 0
    || sourceStartSample >= sourceEndSample
  ) {
    throw new Error(`mapping is outside fixed seek window: ${mapping.segmentId}`);
  }
  return {sourceStartFrame30, sourceEndFrame30, sourceStartSample, sourceEndSample};
};

export const createPresentationRenderedComparisonFilterGraphV001 = (plan) => {
  const segmentCount = plan.variants.reduce((sum, variant) => sum + variant.mappings.length, 0);
  const videoInputs = Array.from({length: segmentCount}, (_, index) => `[video-source-${index}]`).join('');
  const audioInputs = Array.from({length: segmentCount}, (_, index) => `[audio-source-${index}]`).join('');
  const filters = [
    `[0:v:0]select='not(mod(n\\,2))',setpts=N/(30*TB),split=${segmentCount}${videoInputs}`,
    `[0:a:0]aresample=first_pts=0:min_hard_comp=0:max_soft_comp=0,asplit=${segmentCount}${audioInputs}`,
  ];
  let branch = 0;
  plan.variants.forEach((variant, variantIndex) => {
    const videoSegments = [];
    const audioSegments = [];
    variant.mappings.forEach((mapping, segmentIndex) => {
      const local = localizeMapping(mapping);
      const videoLabel = `video-${variantIndex}-${segmentIndex}`;
      const audioLabel = `audio-${variantIndex}-${segmentIndex}`;
      filters.push(
        `[video-source-${branch}]trim=start_frame=${local.sourceStartFrame30}:end_frame=${local.sourceEndFrame30},setpts=PTS-STARTPTS[${videoLabel}]`,
        `[audio-source-${branch}]atrim=start_sample=${local.sourceStartSample}:end_sample=${local.sourceEndSample},asetpts=PTS-STARTPTS[${audioLabel}]`,
      );
      videoSegments.push(`[${videoLabel}]`);
      audioSegments.push(`[${audioLabel}]`);
      branch += 1;
    });
    if (variant.mappings.length === 1) {
      filters.push(`${videoSegments[0]}fps=30,setpts=N/(30*TB)[out-video-${variantIndex}]`);
      filters.push(`${audioSegments[0]}anull[out-audio-${variantIndex}]`);
    } else {
      filters.push(
        `${videoSegments.join('')}concat=n=${variant.mappings.length}:v=1:a=0,fps=30,setpts=N/(30*TB)[out-video-${variantIndex}]`,
      );
      filters.push(
        `${audioSegments.join('')}concat=n=${variant.mappings.length}:v=0:a=1[out-audio-${variantIndex}]`,
      );
    }
  });
  return filters.join(';');
};

const renderComparisonMedia = async (sourcePath, mediaDirectory, plan) => {
  await mkdir(mediaDirectory, {recursive: true});
  const graph = createPresentationRenderedComparisonFilterGraphV001(plan);
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', SEEK_WINDOW.sourceStartSeconds.toFixed(6),
    '-t', SEEK_WINDOW.durationSeconds.toFixed(6),
    '-i', sourcePath,
    '-filter_complex', graph,
  ];
  const outputPaths = [];
  plan.variants.forEach((variant, index) => {
    const outputPath = path.join(mediaDirectory, `${variant.variantId}.mp4`);
    outputPaths.push(outputPath);
    args.push(
      '-map', `[out-video-${index}]`, '-map', `[out-audio-${index}]`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart', '-movie_timescale', '30',
      '-map_metadata', '-1', '-map_chapters', '-1', outputPath,
    );
  });
  await run('ffmpeg', args);
  return {graph, args, outputPaths};
};

const inspectRenderedVariants = async (plan, outputPaths) => Promise.all(
  plan.variants.map(async (variant, index) => {
    const mediaPath = outputPaths[index];
    let inspection;
    try {
      inspection = await inspectPresentationBaseMediaOutputV001(
        mediaPath,
        variant.expectedFrameCount,
        AUDIO_CLOCK,
        {present: true, encodeSampleCount: variant.expectedAudioSampleCount},
      );
    } catch (error) {
      const probe = await run('ffprobe', [
        '-v', 'error', '-show_streams', '-of', 'json', mediaPath,
      ]);
      const observed = JSON.parse(probe.stdout.toString('utf8'));
      const wrapped = new Error(
        `${variant.variantId} QC failed: ${JSON.stringify({violation: error?.violation ?? null, observed})}`,
      );
      wrapped.cause = error;
      throw wrapped;
    }
    return {
      ...variant,
      media: {
        path: `media/${variant.variantId}.mp4`,
        fileSha256: await fileSha256(mediaPath),
        byteCount: (await stat(mediaPath)).size,
      },
      inspection,
    };
  }),
);

const loadReviewUi = async () => {
  const module = await import('./presentation_first_real_data_rendered_comparison_ui_v001.mjs');
  if (typeof module.buildPresentationRenderedComparisonHtmlV001 !== 'function') {
    throw new Error('review UI builder export is missing');
  }
  return module;
};

export const buildPresentationRenderedComparisonV001 = async ({outputRoot = OUTPUT_ROOT} = {}) => {
  if (path.resolve(outputRoot) !== OUTPUT_ROOT) {
    throw new Error('the production build output root is fixed');
  }
  try {
    await lstat(outputRoot);
    throw new Error(`fixed output already exists: ${repoPath(outputRoot)}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const parent = path.dirname(outputRoot);
  const outputRepoPath = repoPath(outputRoot);
  await mkdir(parent, {recursive: true});
  const temporaryRoot = await mkdtemp(path.join(parent, '.rendered-comparison-v001-'));
  try {
    const [source, mediaEquivalence, sourceIdentity, candidateManifest] = await Promise.all([
      fixedArtifact(SOURCE_PATH, SOURCE_SHA256),
      fixedArtifact(MEDIA_EQUIVALENCE_PATH, MEDIA_EQUIVALENCE_SHA256),
      fixedArtifact(SOURCE_IDENTITY_PATH, SOURCE_IDENTITY_SHA256),
      fixedArtifact(CANDIDATE_MANIFEST_PATH, CANDIDATE_MANIFEST_SHA256),
    ]);
    const plan = createPresentationRenderedComparisonPlanV001();
    const rendered = await renderComparisonMedia(SOURCE_PATH, path.join(temporaryRoot, 'media'), plan);
    const variants = await inspectRenderedVariants(plan, rendered.outputPaths);
    const comparisonProvenance = {
      schemaVersion: PRESENTATION_RENDERED_COMPARISON_PROVENANCE_SCHEMA_VERSION,
      comparisonId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-provenance-v001',
      purpose: 'human-review-comparison-only',
      humanReviewOnly: true,
      formalAssemblyDecision: false,
      builderVersion: PRESENTATION_RENDERED_COMPARISON_BUILDER_VERSION,
      source,
      fixedReferences: {mediaEquivalence, sourceIdentity, candidateManifest},
      candidate: plan.candidate,
      gaps: plan.gaps,
      sourceClock: plan.sourceClock,
      audioClock: plan.audioClock,
      seekWindow: plan.seekWindow,
      encoding: {
        video: 'h264/libx264 fast crf20 yuv420p 1920x1080 30fps movie-timescale-30',
        audio: 'aac 192kbps 48000Hz stereo',
        metadataPolicy: 'removed',
        chaptersPolicy: 'removed',
        ffmpegFilterGraphSha256: sha256(Buffer.from(rendered.graph)),
      },
      variants,
      exclusions: [
        'not-a-formal-assembly-decision',
        'not-a-base-media-build',
        'not-a-timeline-v002-build',
        'not-a-renderer-v002-run',
      ],
    };
    const comparisonProvenancePath = path.join(temporaryRoot, 'comparison-preview-provenance.json');
    await writeJson(comparisonProvenancePath, comparisonProvenance);
    const comparisonManifest = {
      schemaVersion: PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_VERSION,
      manifestId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-v001',
      human_review_only: true,
      formalOutput: false,
      candidate: plan.candidate,
      gaps: plan.gaps,
      mediaVariants: variants.map((variant) => ({
        variantId: variant.variantId,
        url: `/preview/${variant.variantId}.mp4`,
        fileSha256: variant.media.fileSha256,
      })),
    };
    const comparisonManifestPath = path.join(temporaryRoot, 'comparison-preview-manifest.json');
    await writeJson(comparisonManifestPath, comparisonManifest);
    const comparisonManifestHash = await fileSha256(comparisonManifestPath);
    const reviewPage = {
      schemaVersion: 'presentation-first-real-data-rendered-comparison-page-v001',
      pageId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-review-v001',
      pageRevision: 1,
      comparisonManifest: {
        path: path.join(outputRepoPath, 'comparison-preview-manifest.json'),
        fileSha256: comparisonManifestHash,
      },
      candidate: plan.candidate,
      mediaVariants: variants.map((variant) => ({
        variantId: variant.variantId,
        url: `/preview/${variant.variantId}.mp4`,
        fileSha256: variant.media.fileSha256,
      })),
    };
    const reviewPagePath = path.join(temporaryRoot, 'review-page.json');
    await writeJson(reviewPagePath, reviewPage);
    const ui = await loadReviewUi();
    const reviewHtml = ui.buildPresentationRenderedComparisonHtmlV001(reviewPage, comparisonManifest);
    const reviewHtmlPath = path.join(temporaryRoot, 'review.html');
    await writeFile(reviewHtmlPath, reviewHtml, 'utf8');
    const summary = {
      schemaVersion: PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_VERSION,
      status: 'passed',
      artifactBindings: {
        reviewPage: {
          path: path.join(outputRepoPath, 'review-page.json'),
          fileSha256: await fileSha256(reviewPagePath),
        },
        reviewHtml: {
          path: path.join(outputRepoPath, 'review.html'),
          fileSha256: await fileSha256(reviewHtmlPath),
        },
        comparisonManifest: {
          path: path.join(outputRepoPath, 'comparison-preview-manifest.json'),
          fileSha256: comparisonManifestHash,
        },
        mediaVariants: variants.map((variant) => ({
          variantId: variant.variantId,
          path: path.join(outputRepoPath, variant.media.path),
          fileSha256: variant.media.fileSha256,
        })),
      },
    };
    await writeJson(path.join(temporaryRoot, 'comparison-preview-build-summary.json'), summary);
    await rename(temporaryRoot, outputRoot);
    return {outputRoot, comparisonManifest, comparisonProvenance, reviewPage, summary};
  } catch (error) {
    await rm(temporaryRoot, {recursive: true, force: true});
    throw error;
  }
};

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  buildPresentationRenderedComparisonV001()
    .then(({outputRoot}) => process.stdout.write(`${repoPath(outputRoot)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      if (error?.violation) process.stderr.write(`${JSON.stringify(error.violation)}\n`);
      process.exitCode = 1;
    });
}

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test, {after, before} from 'node:test';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES,
  PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE,
  assertSafePresentationBaseMediaInputPathV001,
  buildPresentationBaseMediaVideoV001,
  commitPresentationBaseMediaOutputV001,
  evaluatePresentationBaseMediaToolProfileV001,
  executePresentationBaseMediaBuildV001,
  inspectPresentationBaseMediaOutputV001,
  inspectPresentationBaseMediaSourceV001,
  inspectPresentationBaseMediaTimelineQcV001,
  makePresentationBaseMediaViolationV001,
  runPresentationBaseMediaBuildJobFileV001,
  validatePresentationBaseMediaHashGraphV001,
  validatePresentationBaseMediaAssemblyDecisionV001,
  validatePresentationBaseMediaBuildJobV001,
  validatePresentationBaseMediaGenerationManifestV002,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
  validatePresentationBaseMediaTimelineV003,
} from './presentation_base_media_timeline_v003.mjs';
import {
  capturePresentationProjectionExactToolchainV001,
  capturePresentationBaseMediaProjectionCaseV001,
  writePresentationAudioGridRegressionProjectionV001,
} from './presentation_audio_grid_regression_projection_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const TESTDATA_ROOT = path.join(MODULE_DIRECTORY, 'testdata/presentation-base-media-build-v001');
const RUNTIME_ROOT = path.join(TESTDATA_ROOT, `.runtime-${process.pid}`);
const OUTPUT_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation/base-media');
const BASIS_PATH = path.join(TESTDATA_ROOT, 'basis-edit-plan.json');
const CLI_PATH = path.join(MODULE_DIRECTORY, 'presentation_base_media_build_v002.mjs');
const PROJECTION_HARNESS_PATH = fileURLToPath(import.meta.url);
const PROJECTION_HELPER_PATH = path.join(
  MODULE_DIRECTORY,
  'presentation_audio_grid_regression_projection_v001.mjs',
);
const runtimeOutputs = [];
const regressionProjectionCases = [];
let exactProjectionToolchainBindings = null;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalSha256 = (value) => sha256(canonicalJson(value));
const repoPath = (value) => path.relative(WORKSPACE_ROOT, value);
const resolveWorkspacePathForTest = (value) => path.resolve(WORKSPACE_ROOT, value);
const readJson = async (value) => JSON.parse(await readFile(value, 'utf8'));
const writeJson = async (value, data) => writeFile(value, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const clone = (value) => structuredClone(value);
const projectionOutputs = () => ({
  legacy: process.env.PRESENTATION_AUDIO_GRID_PROJECTION_OUTPUT,
  fixedToolchain: process.env.PRESENTATION_AUDIO_GRID_PROJECTION_V003_OUTPUT,
});
const requestedProjectionOutput = () => {
  const outputs = projectionOutputs();
  const requested = Object.values(outputs).filter(Boolean);
  if (requested.length > 1) throw new Error('only one base-media projection output may be requested');
  return outputs.fixedToolchain ?? outputs.legacy ?? null;
};

test('forward-only版は旧実装を不変保持し現行字幕契約だけを信頼する', async () => {
  const [oldBuilder, oldTimeline, captionContract] = await Promise.all([
    readFile(path.join(MODULE_DIRECTORY, 'presentation_base_media_build_v001.mjs')),
    readFile(path.join(MODULE_DIRECTORY, 'presentation_base_media_timeline_v002.mjs')),
    readFile(path.join(MODULE_DIRECTORY, 'presentation_caption_contract_v002.mjs')),
  ]);
  assert.equal(sha256(oldBuilder), '5e76f31c71f6a3d95fc9d0a3980174b326a2d1e630c8800fdfaee57efa7d5287');
  assert.equal(sha256(oldTimeline), 'a1f72079f0e970cb5c6a67817427aa5909f2453ad0d04e81150cfd29c5b41ab2');
  assert.equal(sha256(captionContract), 'a81d583d877e7e8a5410831f4a18bca18be08c92d28d6349d9a089fb9368086c');
  assert.deepEqual(
    PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES.find(
      (row) => row.path === 'evals/clip_composition/presentation_caption_contract_v002.mjs'
    ),
    {
      role: 'caption-canonical-json-source',
      path: 'evals/clip_composition/presentation_caption_contract_v002.mjs',
      fileSha256: 'a81d583d877e7e8a5410831f4a18bca18be08c92d28d6349d9a089fb9368086c',
    },
  );
});
const executeStoredJob = async (jobPath, job = null) => {
  const jobFileBytes = await readFile(jobPath);
  const parsed = job ?? JSON.parse(jobFileBytes.toString('utf8'));
  return executePresentationBaseMediaBuildV001(parsed, {
    jobFileBytes,
    jobFileSha256: sha256(jobFileBytes),
  });
};
const writeAndExecuteJob = async (job, suffix) => {
  const jobPath = path.join(RUNTIME_ROOT, `${suffix}-actual-job.json`);
  await writeJson(jobPath, job);
  return executeStoredJob(jobPath, job);
};
const captureRegressionProjection = async (caseId, outputDirectory) => {
  if (!requestedProjectionOutput()) return;
  regressionProjectionCases.push(await capturePresentationBaseMediaProjectionCaseV001({
    caseId,
    outputDirectory,
  }));
};

const run = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {cwd: WORKSPACE_ROOT, env: {...process.env, TMPDIR: '/private/tmp'}});
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout).toString(),
    stderr: Buffer.concat(stderr).toString(),
  }));
});

const runBuffer = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {cwd: WORKSPACE_ROOT, env: {...process.env, TMPDIR: '/private/tmp'}});
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr).toString(),
  }));
});

const createSource = async ({
  name, fps, sampleRate = null, delayedAudio = false, audioDuration = null, width = 1920, height = 1080,
  patterned = false, frameCount = null,
}) => {
  const output = path.join(RUNTIME_ROOT, `${name}.${delayedAudio ? 'mov' : 'mp4'}`);
  const groupSize = fps === 60 ? 2 : 1;
  const colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'];
  const pattern = patterned ? colors.map((color, index) => (
    `drawbox=x=0:y=0:w=iw:h=ih:color=${color}:t=fill:enable='between(n,${index * groupSize},${(index + 1) * groupSize - 1})'`
  )).join(',') : '';
  const videoDuration = frameCount === null ? 0.2 : Math.max(1, frameCount / fps + 1);
  const video = `color=c=red:s=${width}x${height}:r=${fps}:d=${videoDuration}${pattern ? `,${pattern}` : ''}`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', video];
  if (sampleRate) {
    args.push(
      ...(delayedAudio ? ['-itsoffset', '0.05'] : []),
      '-f', 'lavfi', '-i',
      `sine=frequency=880:sample_rate=${sampleRate}:duration=${audioDuration ?? (delayedAudio ? '0.15' : '0.2')}`,
    );
  }
  args.push(
    '-map', '0:v:0',
    ...(sampleRate ? ['-map', '1:a:0'] : []),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    ...(sampleRate
      ? [
        '-c:a', delayedAudio ? 'pcm_s16le' : 'aac', ...(delayedAudio ? [] : ['-b:a', '192k']),
        '-ar', String(sampleRate), '-ac', delayedAudio ? '2' : '1',
        ...(delayedAudio ? ['-channel_layout', 'stereo'] : []),
      ]
      : ['-an']),
    '-movie_timescale', String(fps), '-movflags', '+faststart',
    ...(frameCount === null ? [] : ['-frames:v', String(frameCount)]),
    '-map_metadata', '-1', output,
  );
  const result = await run('ffmpeg', args);
  assert.equal(result.code, 0, result.stderr);
  return output;
};

const createThreeToneSource = async (name) => {
  const output = path.join(RUNTIME_ROOT, `${name}.mp4`);
  const result = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=0.3',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=0.1',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=0.1',
    '-f', 'lavfi', '-i', 'sine=frequency=1320:sample_rate=48000:duration=0.1',
    '-filter_complex', '[1:a][2:a][3:a]concat=n=3:v=0:a=1[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '1',
    '-movie_timescale', '30', '-movflags', '+faststart', '-map_metadata', '-1', output,
  ]);
  assert.equal(result.code, 0, result.stderr);
  return output;
};

const createStereoToneSource = async (name) => {
  const output = path.join(RUNTIME_ROOT, `${name}.mp4`);
  const result = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=0.2',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=0.2',
    '-f', 'lavfi', '-i', 'sine=frequency=1320:sample_rate=48000:duration=0.2',
    '-filter_complex', '[1:a][2:a]amerge=inputs=2[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-channel_layout', 'stereo',
    '-movie_timescale', '30', '-movflags', '+faststart', '-map_metadata', '-1', output,
  ]);
  assert.equal(result.code, 0, result.stderr);
  return output;
};

const createInternalPtsGapSource = async (name) => {
  const output = path.join(RUNTIME_ROOT, `${name}.mp4`);
  const result = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=0.4',
    '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=0.25',
    '-filter_complex', "[1:a]asetpts='if(gte(N,4096),PTS+3072,PTS)'[a]",
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-bf', '0', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '1',
    '-movie_timescale', '30', '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-avoid_negative_ts', 'disabled',
    '-map_metadata', '-1', output,
  ]);
  assert.equal(result.code, 0, result.stderr);
  return output;
};

const createIncompletePacketClockSource = async (name) => {
  const output = path.join(RUNTIME_ROOT, `${name}.nut`);
  const result = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=0.2',
    '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=0.15',
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'ffv1', '-pix_fmt', 'yuv420p',
    '-c:a', 'flac', '-ar', '48000', '-ac', '1', '-map_metadata', '-1', output,
  ]);
  assert.equal(result.code, 0, result.stderr);
  return output;
};

const decodePcmF32 = async (mediaPath, sampleRate, channels) => {
  const result = await runBuffer('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', mediaPath, '-map', '0:a:0',
    '-ar', String(sampleRate), '-ac', String(channels), '-c:a', 'pcm_f32le', '-f', 'f32le', '-',
  ]);
  assert.equal(result.code, 0, result.stderr);
  const samples = new Float32Array(result.stdout.length / 4);
  for (let index = 0; index < samples.length; index += 1) samples[index] = result.stdout.readFloatLE(index * 4);
  return samples;
};

const zeroCrossings = (samples, channels, channel, startFrame, endFrame) => {
  let count = 0;
  let previous = samples[startFrame * channels + channel];
  for (let frame = startFrame + 1; frame < endFrame; frame += 1) {
    const current = samples[frame * channels + channel];
    if ((previous < 0 && current >= 0) || (previous >= 0 && current < 0)) count += 1;
    previous = current;
  }
  return count;
};

const rms = (samples, channels, channel, startFrame, endFrame) => {
  let sumSquares = 0;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const sample = samples[frame * channels + channel];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / (endFrame - startFrame));
};

const framePixel = async (mediaPath, frame) => {
  // 色面の判定にはsignalstatsの平均値を使う（lossy encodeの完全byte一致は要求しない）。
  const stats = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'info', '-i', mediaPath,
    '-vf', `select=eq(n\\,${frame}),signalstats,metadata=print:file=-`,
    '-frames:v', '1', '-f', 'null', '-',
  ]);
  assert.equal(stats.code, 0, stats.stderr);
  const combined = `${stats.stdout}\n${stats.stderr}`;
  const read = (key) => Number(combined.match(new RegExp(`${key}=([0-9.]+)`))?.[1]);
  return {y: read('lavfi.signalstats.YAVG'), u: read('lavfi.signalstats.UAVG'), v: read('lavfi.signalstats.VAVG')};
};

const assertColorFamily = (pixel, family) => {
  assert.ok([pixel.y, pixel.u, pixel.v].every(Number.isFinite), JSON.stringify(pixel));
  if (family === 'red') assert.ok(pixel.v > 180 && pixel.u < 130, JSON.stringify(pixel));
  if (family === 'green') assert.ok(pixel.u < 120 && pixel.v < 120, JSON.stringify(pixel));
  if (family === 'blue') assert.ok(pixel.u > 180 && pixel.v < 150, JSON.stringify(pixel));
  if (family === 'yellow') assert.ok(pixel.u < 100 && pixel.v > 140, JSON.stringify(pixel));
  if (family === 'magenta') assert.ok(pixel.u > 160 && pixel.v > 170, JSON.stringify(pixel));
  if (family === 'cyan') assert.ok(pixel.u > 140 && pixel.v < 110, JSON.stringify(pixel));
};

const makeFixture = async ({name, sourcePath, segments}) => {
  const sourceHash = sha256(await readFile(sourcePath));
  const basisHash = sha256(await readFile(BASIS_PATH));
  const payload = {
    basisEditPlan: {kind: 'edit_plan_json', path: repoPath(BASIS_PATH), fileSha256: basisHash},
    sourceArtifact: {
      sourceProvenance: `synthetic-provenance-${name}`,
      sourceRef: `synthetic-source-${name}`,
      sourceUri: `synthetic://${name}`,
      fileSha256: sourceHash,
    },
    segments,
    unresolvedEdits: [],
  };
  const decision = {
    schemaVersion: 'presentation-base-media-assembly-decision-v001',
    decisionId: `synthetic-decision-${name}`,
    payload,
    approval: {
      status: 'approved',
      approverType: 'human',
      recordId: `synthetic-human-approval-${name}`,
      recordedAt: '2026-07-21T00:00:00Z',
      targetPayloadSha256: canonicalSha256(payload),
    },
  };
  const decisionPath = path.join(RUNTIME_ROOT, `${name}-decision.json`);
  await writeJson(decisionPath, decision);
  const outputPath = path.join(OUTPUT_ROOT, `synthetic-${process.pid}-${name}`);
  runtimeOutputs.push(outputPath);
  const job = {
    schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `synthetic-job-${name}`,
    assemblyDecision: {path: repoPath(decisionPath), fileSha256: sha256(await readFile(decisionPath))},
    sourceArtifact: {
      sourceProvenance: payload.sourceArtifact.sourceProvenance,
      sourceRef: payload.sourceArtifact.sourceRef,
      sourceUri: payload.sourceArtifact.sourceUri,
      path: repoPath(sourcePath),
      fileSha256: sourceHash,
    },
    outputDirectory: repoPath(outputPath),
  };
  const jobPath = path.join(RUNTIME_ROOT, `${name}-job.json`);
  await writeJson(jobPath, job);
  return {decision, decisionPath, job, jobPath, outputPath};
};

before(async () => {
  const outputs = projectionOutputs();
  if (Object.values(outputs).filter(Boolean).length > 1) {
    throw new Error('only one base-media projection output may be requested');
  }
  if (outputs.fixedToolchain) {
    exactProjectionToolchainBindings = await capturePresentationProjectionExactToolchainV001();
  }
  await mkdir(RUNTIME_ROOT, {recursive: true});
  await mkdir(OUTPUT_ROOT, {recursive: true});
});

after(async () => {
  const output = requestedProjectionOutput();
  if (output) {
    const fixedToolchain = Boolean(projectionOutputs().fixedToolchain);
    if (fixedToolchain) {
      assert.equal(
        canonicalJson(await capturePresentationProjectionExactToolchainV001()),
        canonicalJson(exactProjectionToolchainBindings),
        'executable toolchain changed while the projection was running',
      );
    }
    const gitHead = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
    await writePresentationAudioGridRegressionProjectionV001({
      outputPath: path.resolve(output),
      suiteId: fixedToolchain
        ? 'presentation-base-media-audio-normal-cases-fixed-toolchain-v001'
        : 'presentation-base-media-audio-normal-cases-v001',
      role: process.env.PRESENTATION_AUDIO_GRID_PROJECTION_ROLE ?? 'unspecified',
      gitHead,
      builderPath: CLI_PATH,
      harnessPaths: [PROJECTION_HARNESS_PATH, PROJECTION_HELPER_PATH],
      tools: fixedToolchain
        ? {
          ...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE,
          executableBindings: exactProjectionToolchainBindings,
        }
        : PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE,
      cases: regressionProjectionCases,
    });
  }
  await Promise.all(runtimeOutputs.map((output) => rm(output, {recursive: true, force: true})));
  const ownedOutputEntries = (await readdir(OUTPUT_ROOT)).filter((name) => (
    name.includes(`synthetic-${process.pid}`)
  ));
  await Promise.all(ownedOutputEntries.map((name) => (
    rm(path.join(OUTPUT_ROOT, name), {recursive: true, force: true})
  )));
  await rm(RUNTIME_ROOT, {recursive: true, force: true});
});

test('strict job, decision, tool and manifest contracts reject unknown or changed facts', () => {
  const invalidJob = validatePresentationBaseMediaBuildJobV001({unexpected: true});
  assert.equal(invalidJob.status, 'failed');
  assert.ok(invalidJob.violations.some((item) => item.code === 'BASE_MEDIA_JOB_INVALID'));

  const unresolvedPayload = {
    basisEditPlan: {kind: 'edit_plan_json', path: 'x', fileSha256: 'a'.repeat(64)},
    sourceArtifact: {
      sourceProvenance: 'p', sourceRef: 'r', sourceUri: 'u', fileSha256: 'b'.repeat(64),
    },
    segments: [{sourceStartMs: 0, sourceEndMs: 100}],
    unresolvedEdits: [{kind: 'qualitative-edit'}],
  };
  const decision = {
    schemaVersion: 'presentation-base-media-assembly-decision-v001',
    decisionId: 'd',
    payload: unresolvedPayload,
    approval: {
      status: 'approved', approverType: 'human', recordId: 'r', recordedAt: '2026-07-21T00:00:00Z',
      targetPayloadSha256: canonicalSha256(unresolvedPayload),
    },
  };
  const decisionResult = validatePresentationBaseMediaAssemblyDecisionV001(decision);
  assert.ok(decisionResult.violations.some((item) => item.code === 'ASSEMBLY_DECISION_UNRESOLVED_EDITS'));
  const wrongApproval = clone(decision);
  wrongApproval.payload.unresolvedEdits = [];
  assert.ok(validatePresentationBaseMediaAssemblyDecisionV001(wrongApproval).violations
    .some((item) => item.code === 'ASSEMBLY_DECISION_APPROVAL_INVALID'));

  const wrongTool = {...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE, nodeVersion: 'v0.0.0'};
  assert.ok(evaluatePresentationBaseMediaToolProfileV001(wrongTool).violations
    .some((item) => item.code === 'BASE_MEDIA_TOOL_PROFILE_MISMATCH'));
  assert.ok(validatePresentationBaseMediaGenerationManifestV002({}).violations
    .some((item) => item.code === 'BASE_MEDIA_GENERATION_MANIFEST_INVALID'));
  const badGraph = validatePresentationBaseMediaHashGraphV001({
    timeline: {baseMedia: {fileSha256: 'a'.repeat(64)}},
    manifest: {outputs: {baseMedia: {fileSha256: 'b'.repeat(64)}, timeline: {fileSha256: 'c'.repeat(64)}}},
    report: {outputs: {
      baseMedia: {fileSha256: 'a'.repeat(64)},
      timeline: {fileSha256: 'c'.repeat(64)},
      generationManifest: {fileSha256: 'd'.repeat(64)},
    }},
    baseMediaFileSha256: 'a'.repeat(64),
    timelineFileSha256: 'c'.repeat(64),
    manifestFileSha256: 'd'.repeat(64),
  });
  assert.ok(badGraph.violations.some((item) => item.code === 'BASE_MEDIA_HASH_GRAPH_INVALID'));
});

test('30fps source without audio builds only the approved disjoint frame intervals', async () => {
  const sourcePath = await createSource({name: 'video-30-no-audio', fps: 30, patterned: true});
  const fixture = await makeFixture({
    name: 'video-30-no-audio', sourcePath,
    segments: [{sourceStartMs: 0, sourceEndMs: 67}, {sourceStartMs: 100, sourceEndMs: 167}],
  });
  const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
  assert.equal(result.result.retainedBuildPaths.policy, 'retain-without-automatic-delete-v001');
  assert.equal(result.result.retainedBuildPaths.publicationTemporaryDirectory, null);
  assert.ok(result.result.retainedBuildPaths.workingDirectory);
  assert.ok(result.result.retainedBuildPaths.lockFile);
  await stat(resolveWorkspacePathForTest(result.result.retainedBuildPaths.workingDirectory));
  await stat(resolveWorkspacePathForTest(result.result.retainedBuildPaths.lockFile));
  const [manifest, timeline, report] = await Promise.all([
    readJson(path.join(fixture.outputPath, 'generation-manifest.json')),
    readJson(path.join(fixture.outputPath, 'timeline.json')),
    readJson(path.join(fixture.outputPath, 'validation-report.json')),
  ]);
  assert.equal(validatePresentationBaseMediaGenerationManifestV002(manifest).status, 'passed');
  assert.equal(timeline.baseMedia.expectedFrameCount, 4);
  assert.deepEqual(timeline.segments.map((item) => [item.outputStartFrame, item.outputEndFrame]), [[0, 2], [2, 4]]);
  assert.equal(manifest.audio.present, false);
  assert.deepEqual(manifest.execution.commands.map((item) => item.stage), ['video-build']);
  assert.deepEqual(manifest.execution.trustedSourceFiles, PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES);
  assert.equal(manifest.execution.commands[0].arguments.at(-1), '<TEMP_VIDEO>');
  assert.equal(manifest.execution.commands[0].arguments.includes('<SOURCE_MEDIA>'), true);
  assert.deepEqual(Object.keys(manifest.tools.binaryDiagnostics).sort(), ['ffmpeg', 'ffprobe', 'node']);
  for (const tool of ['node', 'ffmpeg', 'ffprobe']) {
    const diagnostic = manifest.tools.binaryDiagnostics[tool];
    assert.equal(path.isAbsolute(diagnostic.resolvedPath), true);
    assert.equal(diagnostic.fileSha256, sha256(await readFile(diagnostic.resolvedPath)));
  }
  const missingDiagnosticManifest = clone(manifest);
  delete missingDiagnosticManifest.tools.binaryDiagnostics;
  assert.equal(
    validatePresentationBaseMediaGenerationManifestV002(missingDiagnosticManifest).status,
    'failed',
    '承認後に生成するmanifestは診断情報を必須とする',
  );
  const invalidDiagnosticManifest = clone(manifest);
  invalidDiagnosticManifest.tools.binaryDiagnostics.ffmpeg.fileSha256 = 'invalid';
  assert.equal(
    validatePresentationBaseMediaGenerationManifestV002(invalidDiagnosticManifest).status,
    'failed',
  );
  assert.equal(JSON.stringify(manifest).includes('.tmp-'), false, '一時pathを来歴へ漏らさない');
  assert.equal(manifest.job.fileSha256, sha256(await readFile(fixture.jobPath)));
  assert.equal(manifest.source.path, repoPath(sourcePath), 'manifestはsnapshotでなく元artifact来歴を指す');
  assert.equal(manifest.outputs.baseMedia.audioPacketPayloadSha256, null);
  assert.equal(report.status, 'passed');
  assert.deepEqual((await readdir(fixture.outputPath)).sort(), [
    'base-media.mp4', 'generation-manifest.json', 'timeline.json', 'validation-report.json',
  ]);
  assert.equal(validatePresentationBaseMediaTimelineV003(timeline, manifest, {
    fileSha256: manifest.outputs.baseMedia.fileSha256,
    frameCount: manifest.outputs.baseMedia.frameCount,
    timelineFileSha256: manifest.outputs.timeline.fileSha256,
  }).status, 'passed');
  const outputMedia = path.join(fixture.outputPath, 'base-media.mp4');
  assertColorFamily(await framePixel(outputMedia, 0), 'red');
  assertColorFamily(await framePixel(outputMedia, 1), 'green');
  assertColorFamily(await framePixel(outputMedia, 2), 'yellow');
  assertColorFamily(await framePixel(outputMedia, 3), 'magenta');
});

test('60fps globally takes even source frames and produces the same 30fps frame grid', async () => {
  const sourcePath = await createSource({name: 'video-60-no-audio', fps: 60, patterned: true});
  const fixture = await makeFixture({
    name: 'video-60-no-audio', sourcePath,
    segments: [{sourceStartMs: 17, sourceEndMs: 84}, {sourceStartMs: 117, sourceEndMs: 184}],
  });
  const result = await executeStoredJob(fixture.jobPath, fixture.job);
  assert.equal(result.status, 'passed', JSON.stringify(result.violations));
  const timeline = await readJson(path.join(fixture.outputPath, 'timeline.json'));
  assert.equal(timeline.sourceFrameClock.extractionRuleId, 'source-frame-60fps-global-even-v001');
  assert.deepEqual(timeline.segments.map((item) => [item.sourceStartFrame30, item.sourceEndFrame30]), [[1, 3], [4, 6]]);
  assert.equal(timeline.baseMedia.expectedFrameCount, 4);
  const outputMedia = path.join(fixture.outputPath, 'base-media.mp4');
  assertColorFamily(await framePixel(outputMedia, 0), 'green');
  assertColorFamily(await framePixel(outputMedia, 1), 'blue');
  assertColorFamily(await framePixel(outputMedia, 2), 'magenta');
  assertColorFamily(await framePixel(outputMedia, 3), 'cyan');
});

test('60fps・181 decoded framesの最後のglobal-even frame 180を媒体終端までの区間で選べる', async () => {
  const sourcePath = await createSource({
    name: 'video-60-odd-tail',
    fps: 60,
    frameCount: 181,
  });
  const fixture = await makeFixture({
    name: 'video-60-odd-tail',
    sourcePath,
    segments: [{sourceStartMs: 3000, sourceEndMs: 3016}],
  });
  const result = await executeStoredJob(fixture.jobPath, fixture.job);
  assert.equal(result.status, 'passed', JSON.stringify(result.violations));
  const [timeline, manifest] = await Promise.all([
    readJson(path.join(fixture.outputPath, 'timeline.json')),
    readJson(path.join(fixture.outputPath, 'generation-manifest.json')),
  ]);
  assert.equal(timeline.sourceFrameClock.decodedFrameCount, 181);
  assert.deepEqual(
    timeline.segments.map((item) => [item.sourceStartFrame30, item.sourceEndFrame30]),
    [[90, 91]],
  );
  assert.equal(timeline.baseMedia.expectedFrameCount, 1);
  assert.equal(manifest.outputs.baseMedia.frameCount, 1);
  assertColorFamily(await framePixel(path.join(fixture.outputPath, 'base-media.mp4'), 0), 'red');
});

test('60fps・181 decoded framesの48kHz AAC末尾は実在sampleだけを使いvideo-only尾を明示する', async () => {
  const sourcePath = await createSource({
    name: 'video-60-odd-tail-audio-48000',
    fps: 60,
    frameCount: 181,
    sampleRate: 48000,
    audioDuration: 181 / 60,
  });
  const fixture = await makeFixture({
    name: 'video-60-odd-tail-audio-48000',
    sourcePath,
    segments: [{sourceStartMs: 3000, sourceEndMs: 3016}],
  });
  const result = await executeStoredJob(fixture.jobPath, fixture.job);
  assert.equal(result.status, 'passed', JSON.stringify(result.violations));
  const manifest = await readJson(path.join(fixture.outputPath, 'generation-manifest.json'));
  const segmentAudio = manifest.segments[0].audioSamples;
  const sourceStartSample = 3000 * 48;
  const nominalVideoEndSample = 91 * 1600;
  assert.equal(manifest.source.audio.presentationClock.authority, 'stream-and-packet-v001');
  assert.equal(manifest.source.audio.presentationClock.streamEndSample, 144800);
  assert.equal(manifest.source.audio.presentationClock.packetEndSample, 144800);
  assert.equal(manifest.source.audio.presentationClock.endSample, 144800);
  assert.equal(manifest.source.audio.presentationClock.skipSamples, 1024);
  assert.equal(manifest.source.audio.presentationClock.discardPadding, 0);
  assert.equal(manifest.audio.sourceGrid.sampleCount, 144800);
  assert.equal(manifest.audio.sourceGrid.decodedSampleCount, 145408);
  assert.equal(manifest.audio.sourceGrid.decodedTailPaddingSampleCount, 608);
  assert.equal(segmentAudio.sourceStart, sourceStartSample);
  assert.equal(segmentAudio.sourceEnd, 144800);
  assert.ok(segmentAudio.sourceEnd > sourceStartSample);
  assert.ok(segmentAudio.sourceEnd < nominalVideoEndSample);
  assert.equal(segmentAudio.outputStart, 0);
  assert.equal(segmentAudio.outputEnd, segmentAudio.sourceEnd - segmentAudio.sourceStart);
  assert.equal(segmentAudio.outputEnd, 800);
  assert.equal(manifest.audio.encodeInput.sampleCount, segmentAudio.outputEnd);
  assert.equal(manifest.audio.encoded.presentationDurationSamples, segmentAudio.outputEnd);
  assert.equal(manifest.audio.encoded.videoPresentationDurationSamples, 1600);
  assert.equal(manifest.audio.encoded.containerDurationSamples, 1600);
  assert.equal(manifest.audio.encoded.durationTs, 1600);
  assert.equal(
    manifest.audio.encoded.trailingVideoOnlySampleCount,
    800,
  );
  assert.equal(manifest.audio.encoded.tailPolicy, 'source-audio-ended-no-padding-v001');
  assert.equal(manifest.outputs.baseMedia.frameCount, 1);
  await captureRegressionProjection('video-60-odd-tail-audio-48000', fixture.outputPath);
});

for (const sampleRate of [44100, 48000]) {
  test(`${sampleRate}Hz audio uses video-frame sample boundaries and keeps exact presentation duration`, async () => {
    const name = `audio-${sampleRate}`;
    const sourcePath = await createSource({name, fps: 30, sampleRate});
    const fixture = await makeFixture({
      name, sourcePath,
      segments: [{sourceStartMs: 0, sourceEndMs: 67}],
    });
    const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
    assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
    const manifest = await readJson(path.join(fixture.outputPath, 'generation-manifest.json'));
    const expectedSamples = sampleRate / 15;
    assert.equal(manifest.segments[0].audioSamples.sourceStart, 0);
    assert.equal(manifest.segments[0].audioSamples.sourceEnd, expectedSamples);
    assert.equal(manifest.audio.encodeInput.sampleCount, expectedSamples);
    assert.equal(manifest.audio.encoded.presentationDurationSamples, expectedSamples);
    assert.equal(manifest.audio.encoded.effectiveDecodedSampleCount, expectedSamples);
    assert.equal(manifest.audio.encoded.movieTimeScale, 30);
    assert.equal(manifest.audio.canonicalPcmFormat.sampleFormat, 'f32le');
    assert.deepEqual(
      manifest.execution.commands.map((item) => item.stage),
      ['video-build', 'audio-grid', 'audio-mux'],
    );
    assert.deepEqual(
      manifest.execution.commands.map((item) => item.arguments.at(-1)),
      ['<TEMP_VIDEO>', '<SOURCE_GRID>', '<BASE_MEDIA>'],
    );
    await captureRegressionProjection(`${name}-two-frame`, fixture.outputPath);

    const oneFrameFixture = await makeFixture({
      name: `${name}-one-frame`, sourcePath,
      segments: [{sourceStartMs: 0, sourceEndMs: 17}],
    });
    const oneFrameResult = await runPresentationBaseMediaBuildJobFileV001(oneFrameFixture.jobPath);
    assert.equal(oneFrameResult.exitCode, 0, JSON.stringify(oneFrameResult.result?.violations));
    const oneFrameManifest = await readJson(path.join(oneFrameFixture.outputPath, 'generation-manifest.json'));
    assert.equal(oneFrameManifest.audio.encodeInput.sampleCount, sampleRate / 30);
    assert.equal(oneFrameManifest.audio.encoded.presentationDurationSamples, sampleRate / 30);
    await captureRegressionProjection(`${name}-one-frame`, oneFrameFixture.outputPath);
  });
}

test('positive source audio PTS is preserved as zero-filled canonical PCM instead of moving speech forward', async () => {
  const sourcePath = await createSource({
    name: 'audio-delayed-48000', fps: 30, sampleRate: 48000, delayedAudio: true,
  });
  const fixture = await makeFixture({
    name: 'audio-delayed-48000', sourcePath,
    segments: [{sourceStartMs: 0, sourceEndMs: 167}],
  });
  const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
  const manifest = await readJson(path.join(fixture.outputPath, 'generation-manifest.json'));
  assert.ok(manifest.source.audio.firstDecodedPts > 0);
  assert.deepEqual(manifest.audio.insertedSilenceSpans, [
    {startSample: 0, endSample: manifest.source.audio.firstDecodedPts},
  ]);
  assert.equal(
    manifest.audio.sourceGrid.sampleCount,
    manifest.source.audio.presentationClock.endSample,
  );
  assert.equal(manifest.audio.encodeInput.sampleCount, 8000);
  await captureRegressionProjection('audio-delayed-48000', fixture.outputPath);
});

test('an internal audio PTS gap remains silent between real PCM before and after it', async () => {
  const sourcePath = await createInternalPtsGapSource('audio-internal-gap');
  const fixture = await makeFixture({
    name: 'audio-internal-gap', sourcePath,
    segments: [{sourceStartMs: 0, sourceEndMs: 267}],
  });
  const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
  const manifest = await readJson(path.join(fixture.outputPath, 'generation-manifest.json'));
  const internal = manifest.audio.insertedSilenceSpans.find((span) => (
    span.startSample >= 4096 && span.endSample < manifest.audio.sourceGrid.sampleCount
  ));
  assert.ok(internal, JSON.stringify(manifest.audio.insertedSilenceSpans));
  const decoded = await decodePcmF32(path.join(fixture.outputPath, 'base-media.mp4'), 48000, 1);
  const gapStart = internal.startSample + 256;
  const gapEnd = internal.endSample - 256;
  assert.ok(gapEnd > gapStart, JSON.stringify(internal));
  const gapRms = rms(decoded, 1, 0, gapStart, gapEnd);
  const beforeRms = rms(decoded, 1, 0, internal.startSample - 1024, internal.startSample - 256);
  const afterRms = rms(decoded, 1, 0, internal.endSample + 256, internal.endSample + 1024);
  assert.ok(gapRms < beforeRms && gapRms < afterRms, {gapRms, beforeRms, afterRms});
  await captureRegressionProjection('audio-internal-gap-3072', fixture.outputPath);
});

test('source audio without both stream and packet presentation clocks is rejected without decoded fallback', async () => {
  const sourcePath = await createIncompletePacketClockSource('audio-clock-incomplete');
  await assert.rejects(
    inspectPresentationBaseMediaSourceV001(sourcePath),
    (error) => error?.violation?.code === 'BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID'
      && error.violation.path === '$.source.audio.presentationClock',
  );
});

test('non-contiguous selected tone segments preserve approved segment order in decoded PCM', async () => {
  const sourcePath = await createThreeToneSource('audio-tone-order');
  const fixture = await makeFixture({
    name: 'audio-tone-order', sourcePath,
    segments: [
      {sourceStartMs: 0, sourceEndMs: 100},
      {sourceStartMs: 200, sourceEndMs: 300},
    ],
  });
  const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
  const decoded = await decodePcmF32(path.join(fixture.outputPath, 'base-media.mp4'), 48000, 1);
  const first = zeroCrossings(decoded, 1, 0, 256, 4800 - 256);
  const second = zeroCrossings(decoded, 1, 0, 4800 + 256, 9600 - 256);
  assert.ok(second > first, {first, second});
  await captureRegressionProjection('audio-tone-order', fixture.outputPath);
});

test('stereo FL and FR channel order remains distinguishable in real decoded PCM', async () => {
  const sourcePath = await createStereoToneSource('audio-stereo-order');
  const fixture = await makeFixture({
    name: 'audio-stereo-order', sourcePath,
    segments: [{sourceStartMs: 0, sourceEndMs: 167}],
  });
  const result = await runPresentationBaseMediaBuildJobFileV001(fixture.jobPath);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations));
  const manifest = await readJson(path.join(fixture.outputPath, 'generation-manifest.json'));
  assert.deepEqual(manifest.audio.channelOrder, ['FL', 'FR']);
  const decoded = await decodePcmF32(path.join(fixture.outputPath, 'base-media.mp4'), 48000, 2);
  const left = zeroCrossings(decoded, 2, 0, 256, 8000 - 256);
  const right = zeroCrossings(decoded, 2, 1, 256, 8000 - 256);
  assert.ok(right > left, {left, right});
  await captureRegressionProjection('audio-stereo-order', fixture.outputPath);
});

test('raw millisecond endpoint beyond decoded source is rejected before frame rounding can hide it', () => {
  const result = validatePresentationBaseMediaSegmentPlanV001(
    [{sourceStartMs: 0, sourceEndMs: 201}],
    {fps: 30, decodedFrameCount: 6, logicalFrameCount: 6},
  );
  assert.equal(result.status, 'failed');
  assert.equal(result.violations[0].code, 'BASE_MEDIA_SEGMENT_OUT_OF_SOURCE');
  assert.equal(result.violations[0].details.sourceEndMs, 201);
});

test('audio presentation shortfall is allowed only at the exact decoded-media terminal segment', () => {
  const terminal = validatePresentationBaseMediaSegmentPlanV001(
    [{sourceStartMs: 3000, sourceEndMs: 3016}],
    {fps: 60, decodedFrameCount: 181, logicalFrameCount: 91},
    {
      sampleRate: 48000,
      sourceGridSampleCount: 145408,
      sourceGridMappingEndSample: 144800,
      decodedTailPaddingSampleCount: 608,
    },
  );
  assert.equal(terminal.status, 'passed');
  assert.deepEqual(terminal.mappings[0].audioSamples, {
    sourceStart: 144000,
    sourceEnd: 144800,
    outputStart: 0,
    outputEnd: 800,
  });

  const internal = validatePresentationBaseMediaSegmentPlanV001(
    [{sourceStartMs: 0, sourceEndMs: 67}],
    {fps: 30, decodedFrameCount: 6, logicalFrameCount: 6},
    {
      sampleRate: 48000,
      sourceGridSampleCount: 3000,
      sourceGridMappingEndSample: 3000,
      decodedTailPaddingSampleCount: 0,
    },
  );
  assert.equal(internal.status, 'failed');
  assert.equal(internal.violations[0].code, 'BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID');
});

test('unsafe symlink is rejected before reading and existing output is never overwritten', async () => {
  const external = path.join(RUNTIME_ROOT, 'external.json');
  const link = path.join(RUNTIME_ROOT, 'unsafe-link.json');
  await writeFile(external, '{}\n');
  await symlink(external, link);
  await assert.rejects(
    assertSafePresentationBaseMediaInputPathV001(repoPath(link), [MODULE_DIRECTORY]),
    (error) => error?.violation?.code === 'BASE_MEDIA_INPUT_PATH_UNSAFE',
  );

  const sourcePath = await createSource({name: 'existing-output', fps: 30});
  const fixture = await makeFixture({
    name: 'existing-output', sourcePath, segments: [{sourceStartMs: 0, sourceEndMs: 67}],
  });
  await mkdir(fixture.outputPath, {recursive: true});
  const marker = path.join(fixture.outputPath, 'keep.txt');
  await writeFile(marker, 'keep');
  const result = await executeStoredJob(fixture.jobPath, fixture.job);
  assert.ok(result.violations.some((item) => item.code === 'BASE_MEDIA_OUTPUT_PATH_UNSAFE'));
  assert.equal(await readFile(marker, 'utf8'), 'keep');
});

test('parent directory replaced by symlink during processing is rejected immediately before publish', async () => {
  const parent = path.join(OUTPUT_ROOT, `synthetic-${process.pid}-publish-parent`);
  const parkedParent = `${parent}-parked`;
  const externalParent = path.join(RUNTIME_ROOT, 'publish-external-parent');
  const temporaryDirectory = path.join(parent, '.result.tmp-deterministic');
  const outputDirectory = path.join(parent, 'result');
  await mkdir(temporaryDirectory, {recursive: true});
  await writeFile(path.join(temporaryDirectory, 'base-media.mp4'), 'temporary-success-artifact');
  await mkdir(externalParent, {recursive: true});
  try {
    // 長時間処理の開始時には実directoryだった親を退避し、同名symlinkへ差し替える。
    await rename(parent, parkedParent);
    await symlink(externalParent, parent);

    await assert.rejects(
      commitPresentationBaseMediaOutputV001(temporaryDirectory, outputDirectory),
      (error) => error?.violation?.code === 'BASE_MEDIA_OUTPUT_PATH_UNSAFE'
        && error?.violation?.details?.reason === 'symlink_ancestor_appeared_before_commit',
    );
    await assert.rejects(stat(path.join(externalParent, 'result')), {code: 'ENOENT'});
    assert.equal(
      await readFile(path.join(parkedParent, '.result.tmp-deterministic', 'base-media.mp4'), 'utf8'),
      'temporary-success-artifact',
    );
  } finally {
    await rm(parent, {force: true});
    await rm(parkedParent, {recursive: true, force: true});
    await rm(externalParent, {recursive: true, force: true});
  }
});

test('basis declaration is checked against actual JSON kind and direct execution has no synthetic job-hash fallback', async () => {
  const sourcePath = await createSource({name: 'actual-basis-kind', fps: 30});
  const fixture = await makeFixture({
    name: 'actual-basis-kind', sourcePath, segments: [{sourceStartMs: 0, sourceEndMs: 67}],
  });
  const noActualJobFile = await executePresentationBaseMediaBuildV001(fixture.job);
  assert.equal(noActualJobFile.status, 'failed');
  assert.equal(noActualJobFile.violations[0].code, 'BASE_MEDIA_JOB_INVALID');

  const wrongBasisPath = path.join(RUNTIME_ROOT, 'actual-wrong-kind-basis.json');
  await writeJson(wrongBasisPath, {kind: 'not_edit_plan_json'});
  const decision = clone(fixture.decision);
  decision.payload.basisEditPlan.path = repoPath(wrongBasisPath);
  decision.payload.basisEditPlan.fileSha256 = sha256(await readFile(wrongBasisPath));
  decision.approval.targetPayloadSha256 = canonicalSha256(decision.payload);
  const decisionPath = path.join(RUNTIME_ROOT, 'actual-wrong-kind-decision.json');
  await writeJson(decisionPath, decision);
  const job = clone(fixture.job);
  job.assemblyDecision = {path: repoPath(decisionPath), fileSha256: sha256(await readFile(decisionPath))};
  job.outputDirectory = repoPath(path.join(OUTPUT_ROOT, `synthetic-${process.pid}-actual-wrong-kind`));
  runtimeOutputs.push(resolveWorkspacePathForTest(job.outputDirectory));
  const actualJobPath = path.join(RUNTIME_ROOT, 'actual-wrong-kind-actual-job.json');
  await writeJson(actualJobPath, job);
  const outcome = await runPresentationBaseMediaBuildJobFileV001(actualJobPath);
  const result = outcome.result;
  assert.equal(outcome.exitCode, 1);
  assert.ok(outcome.failureReportPath);
  runtimeOutputs.push(outcome.failureReportPath);
  assert.equal(result.status, 'failed');
  assert.equal(result.violations[0].code, 'ASSEMBLY_DECISION_BASIS_MISMATCH');
  assert.equal(result.violations[0].details.actual, 'not_edit_plan_json');
  assert.deepEqual(result.violations[0].details.retainedBuildPaths, result.retainedBuildPaths);
  assert.ok(result.retainedBuildPaths.publicationTemporaryDirectory);
  assert.ok(result.retainedBuildPaths.workingDirectory);
  assert.ok(result.retainedBuildPaths.lockFile);
  await stat(resolveWorkspacePathForTest(result.retainedBuildPaths.publicationTemporaryDirectory));
  await stat(resolveWorkspacePathForTest(result.retainedBuildPaths.workingDirectory));
  await stat(resolveWorkspacePathForTest(result.retainedBuildPaths.lockFile));
  const failureReport = await readJson(outcome.failureReportPath);
  assert.deepEqual(
    failureReport.violations[0].details.retainedBuildPaths,
    result.retainedBuildPaths,
    '失敗reportから残留pathを診断できる',
  );
});

test('logical build is deterministic across two job ids and output directories', async () => {
  const sourcePath = await createSource({name: 'deterministic', fps: 30});
  const first = await makeFixture({
    name: 'deterministic-a', sourcePath, segments: [{sourceStartMs: 0, sourceEndMs: 100}],
  });
  const second = await makeFixture({
    name: 'deterministic-b', sourcePath, segments: [{sourceStartMs: 0, sourceEndMs: 100}],
  });
  // job固有値を除いた論理planを同一にする。
  second.job.sourceArtifact = clone(first.job.sourceArtifact);
  second.job.assemblyDecision = clone(first.job.assemblyDecision);
  await writeJson(second.jobPath, second.job);
  const [one, two] = await Promise.all([
    executeStoredJob(first.jobPath, first.job),
    executeStoredJob(second.jobPath, second.job),
  ]);
  assert.equal(one.status, 'passed', JSON.stringify(one.violations));
  assert.equal(two.status, 'passed', JSON.stringify(two.violations));
  assert.equal(one.buildId, two.buildId);
  assert.deepEqual(one.logicalDeterminism, two.logicalDeterminism);
});

test('CLI distinguishes invalid validated input from an unreadable path', async () => {
  const invalidPath = path.join(RUNTIME_ROOT, 'invalid-job.json');
  await writeJson(invalidPath, {unexpected: true});
  const invalid = await run(process.execPath, [CLI_PATH, invalidPath]);
  assert.equal(invalid.code, 1, invalid.stderr);
  const unreadable = await run(process.execPath, [CLI_PATH, path.join(RUNTIME_ROOT, 'missing.json')]);
  assert.equal(unreadable.code, 2, unreadable.stderr);
});

test('every fixed violation code fires from its validator, binding, QC stage, or filesystem path', async () => {
  const observed = new Set();
  const observe = (result) => {
    for (const violation of result?.violations ?? []) observed.add(violation.code);
    return result;
  };
  const observeThrown = async (action, expectedCode) => {
    await assert.rejects(Promise.resolve().then(action), (error) => {
      assert.equal(error?.violation?.code, expectedCode);
      observe({violations: [error.violation]});
      return true;
    });
  };
  assert.equal(new Set(PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES).size, PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES.length);

  observe(validatePresentationBaseMediaBuildJobV001({unexpected: true}));
  observe(validatePresentationBaseMediaAssemblyDecisionV001({unexpected: true}));

  const sourcePath = await createSource({name: 'violation-base', fps: 30});
  const fixture = await makeFixture({
    name: 'violation-base', sourcePath, segments: [{sourceStartMs: 0, sourceEndMs: 67}],
  });

  const badDecisionHash = clone(fixture.job);
  badDecisionHash.assemblyDecision.fileSha256 = '0'.repeat(64);
  observe(await writeAndExecuteJob(badDecisionHash, 'violation-decision-hash'));

  const invalidApproval = clone(fixture.decision);
  invalidApproval.approval.status = 'pending';
  observe(validatePresentationBaseMediaAssemblyDecisionV001(invalidApproval));
  const unresolved = clone(fixture.decision);
  unresolved.payload.unresolvedEdits = [{kind: 'qualitative-edit'}];
  unresolved.approval.targetPayloadSha256 = canonicalSha256(unresolved.payload);
  observe(validatePresentationBaseMediaAssemblyDecisionV001(unresolved));

  const writeMutatedDecision = async (suffix, mutateDecision, mutateJob = () => {}) => {
    const decision = clone(fixture.decision);
    mutateDecision(decision);
    decision.approval.targetPayloadSha256 = canonicalSha256(decision.payload);
    const decisionPath = path.join(RUNTIME_ROOT, `violation-${suffix}-decision.json`);
    await writeJson(decisionPath, decision);
    const job = clone(fixture.job);
    job.jobId = `violation-${suffix}`;
    job.assemblyDecision = {path: repoPath(decisionPath), fileSha256: sha256(await readFile(decisionPath))};
    job.outputDirectory = repoPath(path.join(OUTPUT_ROOT, `synthetic-${process.pid}-violation-${suffix}`));
    runtimeOutputs.push(resolveWorkspacePathForTest(job.outputDirectory));
    mutateJob(job);
    return job;
  };
  const basisMismatch = await writeMutatedDecision('basis', (decision) => {
    decision.payload.basisEditPlan.fileSha256 = '1'.repeat(64);
  });
  observe(await writeAndExecuteJob(basisMismatch, 'violation-basis'));
  const sourceMismatch = clone(fixture.job);
  sourceMismatch.sourceArtifact.sourceRef = 'wrong-source-ref';
  sourceMismatch.outputDirectory = repoPath(path.join(OUTPUT_ROOT, `synthetic-${process.pid}-violation-source`));
  runtimeOutputs.push(resolveWorkspacePathForTest(sourceMismatch.outputDirectory));
  observe(await writeAndExecuteJob(sourceMismatch, 'violation-source'));

  const sourceClock = {fps: 30, decodedFrameCount: 100, logicalFrameCount: 100};
  observe(validatePresentationBaseMediaSegmentPlanV001([{sourceStartMs: 100, sourceEndMs: 100}], sourceClock));
  observe(validatePresentationBaseMediaSegmentPlanV001([
    {sourceStartMs: 100, sourceEndMs: 200}, {sourceStartMs: 150, sourceEndMs: 250},
  ], sourceClock));
  observe(validatePresentationBaseMediaSegmentPlanV001(
    [{sourceStartMs: 0, sourceEndMs: 1000}],
    {fps: 30, decodedFrameCount: 2, logicalFrameCount: 2},
  ));
  observe(validatePresentationBaseMediaSegmentPlanV001([{sourceStartMs: 1, sourceEndMs: 2}], sourceClock));

  const unsupportedSource = await createSource({name: 'unsupported-size', fps: 30, width: 1280, height: 720});
  const unsupportedFixture = await makeFixture({
    name: 'unsupported-size', sourcePath: unsupportedSource, segments: [{sourceStartMs: 0, sourceEndMs: 67}],
  });
  observe(await executeStoredJob(unsupportedFixture.jobPath, unsupportedFixture.job));

  const shortAudioSource = await createSource({
    name: 'short-audio', fps: 30, sampleRate: 48000, audioDuration: '0.04',
  });
  const shortAudioFixture = await makeFixture({
    name: 'short-audio', sourcePath: shortAudioSource, segments: [{sourceStartMs: 0, sourceEndMs: 167}],
  });
  observe(await executeStoredJob(shortAudioFixture.jobPath, shortAudioFixture.job));

  observe(evaluatePresentationBaseMediaToolProfileV001({
    ...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE, ffmpegVersion: 'wrong',
  }));
  observe(validatePresentationBaseMediaGenerationManifestV002({}));
  try {
    await assertSafePresentationBaseMediaInputPathV001('/private/tmp/not-approved.json', [MODULE_DIRECTORY]);
  } catch (error) {
    observe({violations: [error.violation]});
  }

  const existingOutputJob = clone(fixture.job);
  existingOutputJob.outputDirectory = repoPath(path.join(OUTPUT_ROOT, `synthetic-${process.pid}-violation-existing`));
  const existingOutputPath = resolveWorkspacePathForTest(existingOutputJob.outputDirectory);
  runtimeOutputs.push(existingOutputPath);
  await mkdir(existingOutputPath, {recursive: true});
  observe(await writeAndExecuteJob(existingOutputJob, 'violation-existing'));

  const lockedJob = clone(fixture.job);
  lockedJob.outputDirectory = repoPath(path.join(OUTPUT_ROOT, `synthetic-${process.pid}-violation-locked`));
  const lockedOutputPath = resolveWorkspacePathForTest(lockedJob.outputDirectory);
  runtimeOutputs.push(lockedOutputPath);
  const lockPath = `${lockedOutputPath}.lock`;
  await writeFile(lockPath, 'held');
  try {
    observe(await writeAndExecuteJob(lockedJob, 'violation-locked'));
    assert.equal(await readFile(lockPath, 'utf8'), 'held', '他process所有のlockを削除してはならない');
  } finally {
    await rm(lockPath, {force: true});
  }

  const corruptMedia = path.join(RUNTIME_ROOT, 'actual-tool-corrupt-source.mp4');
  const failedVideoOutput = path.join(RUNTIME_ROOT, 'actual-tool-failed-output.mp4');
  await writeFile(corruptMedia, 'not a media file');
  await observeThrown(
    () => buildPresentationBaseMediaVideoV001(corruptMedia, failedVideoOutput, 30, [{
      sourceStartFrame30: 0, sourceEndFrame30: 1,
    }]),
    'BASE_MEDIA_BUILD_FAILED',
  );
  await assert.rejects(stat(failedVideoOutput), {code: 'ENOENT'});

  await observeThrown(
    () => inspectPresentationBaseMediaOutputV001(sourcePath, 999, null, {present: false}),
    'BASE_MEDIA_VIDEO_QC_FAILED',
  );
  await observeThrown(
    () => inspectPresentationBaseMediaOutputV001(sourcePath, 6, {
      sampleRate: 48000, channels: 1, channelLayout: 'mono',
    }, {present: true, encodeSampleCount: 3200}),
    'BASE_MEDIA_AUDIO_QC_FAILED',
  );
  await observeThrown(
    () => Promise.resolve(inspectPresentationBaseMediaTimelineQcV001({}, {}, {})),
    'BASE_MEDIA_TIMELINE_QC_FAILED',
  );
  const atomicTarget = path.join(OUTPUT_ROOT, `synthetic-${process.pid}-atomic-target`);
  const atomicSource = path.join(OUTPUT_ROOT, `.synthetic-${process.pid}-atomic-target.tmp-injected`);
  await mkdir(atomicSource);
  await writeFile(path.join(atomicSource, 'temporary.txt'), 'temporary');
  await observeThrown(
    () => commitPresentationBaseMediaOutputV001(
      atomicSource,
      atomicTarget,
      async () => { throw new Error('injected atomic rename failure'); },
    ),
    'BASE_MEDIA_ATOMIC_COMMIT_FAILED',
  );
  assert.equal(await readFile(path.join(atomicSource, 'temporary.txt'), 'utf8'), 'temporary');
  await assert.rejects(stat(atomicTarget), {code: 'ENOENT'});
  await rm(atomicSource, {recursive: true, force: true});
  observe(validatePresentationBaseMediaHashGraphV001({
    timeline: {baseMedia: {fileSha256: 'a'.repeat(64)}},
    manifest: {outputs: {baseMedia: {fileSha256: 'b'.repeat(64)}, timeline: {fileSha256: 'c'.repeat(64)}}},
    report: {outputs: {
      baseMedia: {fileSha256: 'a'.repeat(64)}, timeline: {fileSha256: 'c'.repeat(64)},
      generationManifest: {fileSha256: 'd'.repeat(64)},
    }},
    baseMediaFileSha256: 'a'.repeat(64), timelineFileSha256: 'c'.repeat(64), manifestFileSha256: 'd'.repeat(64),
  }));

  for (const failedPath of [
    resolveWorkspacePathForTest(badDecisionHash.outputDirectory),
    resolveWorkspacePathForTest(basisMismatch.outputDirectory),
    resolveWorkspacePathForTest(sourceMismatch.outputDirectory),
    unsupportedFixture.outputPath,
    shortAudioFixture.outputPath,
    lockedOutputPath,
  ]) {
    await assert.rejects(stat(failedPath), {code: 'ENOENT'});
  }
  const retainedBuildOutputs = (await readdir(OUTPUT_ROOT)).filter((name) => (
    name.startsWith('.') && name.includes(`synthetic-${process.pid}`)
      && (name.includes('.publish-tmp-') || name.includes('.work-'))
  ));
  assert.ok(retainedBuildOutputs.length > 0, '失敗経路は掃除より安全を優先して残留させる');

  assert.deepEqual(
    observed,
    new Set(PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES),
    `未発火: ${PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES.filter((code) => !observed.has(code)).join(', ')}`,
  );
});

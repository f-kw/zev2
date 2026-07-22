import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  truncate,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import test, {after, before} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationAudioGridPlacementPlanV001,
  buildPresentationBaseMediaAudioV001,
  inspectPresentationBaseMediaSourceV001,
  placePresentationAudioGridV001,
  verifyPresentationAudioGridPlacementV001,
} from './presentation_base_media_build_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const RUNTIME_PARENT = path.join(
  MODULE_DIRECTORY,
  'testdata/presentation-audio-grid-reconstruction-v001',
);
let runtimeDirectory;

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
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr).toString(),
  }));
});

const requestedClock = () => ({
  sampleRate: 48000,
  channels: 1,
  channelLayout: 'mono',
  spans: [
    {startSample: 0, endSample: 312},
    {startSample: 960, endSample: 1008},
  ],
  sourceGridSampleCount: 1968,
  sourceGridMappingEndSample: 1968,
  decodedTailPaddingSampleCount: 0,
});

const deterministicRawPcm = (sampleCount) => {
  const result = Buffer.alloc(sampleCount * 4);
  for (let index = 0; index < sampleCount; index += 1) {
    result.writeFloatLE(((index % 1000) + 1) / 1001, index * 4);
  }
  return result;
};

const makeRawGrid = async (name, sampleCount = 1608) => {
  const gridPath = path.join(runtimeDirectory, `${name}.f32le`);
  const raw = deterministicRawPcm(sampleCount);
  await writeFile(gridPath, raw);
  return {gridPath, raw};
};

const assertAllZeroBytes = (bytes) => {
  for (const byte of bytes) assert.equal(byte, 0);
};

before(async () => {
  await mkdir(RUNTIME_PARENT, {recursive: true});
  runtimeDirectory = await mkdtemp(path.join(RUNTIME_PARENT, '.runtime-'));
});

after(async () => {
  await rm(runtimeDirectory, {recursive: true, force: true});
});

test('312+48 sampleの空白を保ち、前詰めPCMを絶対位置へbyte不変で配置する', async () => {
  const {gridPath, raw} = await makeRawGrid('requested-structure');
  const result = await placePresentationAudioGridV001({
    gridPath,
    bytesPerSampleFrame: 4,
    audioClock: requestedClock(),
  });
  assert.deepEqual(
    {
      rawSampleCount: result.plan.rawSampleCount,
      gapSampleCount: result.plan.gapSampleCount,
      absoluteSampleCount: result.plan.absoluteSampleCount,
    },
    {rawSampleCount: 1608, gapSampleCount: 360, absoluteSampleCount: 1968},
  );
  const placed = await readFile(gridPath);
  assert.equal(placed.length, 1968 * 4);
  assertAllZeroBytes(placed.subarray(0, 312 * 4));
  assertAllZeroBytes(placed.subarray(960 * 4, 1008 * 4));
  assert.deepEqual(placed.subarray(312 * 4, 960 * 4), raw.subarray(0, 648 * 4));
  assert.deepEqual(placed.subarray(1008 * 4, 1968 * 4), raw.subarray(648 * 4));
  assert.notDeepEqual(
    placed.subarray(960 * 4, 1008 * 4),
    raw.subarray(648 * 4, 696 * 4),
    '後半runを960へ前詰めしない',
  );
});

test('連続PCMが期待より1 sample短い場合も長い場合も停止する', async () => {
  for (const [name, sampleCount] of [['short', 1607], ['long', 1609]]) {
    const {gridPath} = await makeRawGrid(name, sampleCount);
    await assert.rejects(
      placePresentationAudioGridV001({
        gridPath,
        bytesPerSampleFrame: 4,
        audioClock: requestedClock(),
      }),
      (error) => error?.violation?.code === 'BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID'
        && error.violation.path === '$audio.sourceGrid.rawSampleCount',
    );
  }
});

test('配置後の実音声byte改変と空白への非zero混入を別々に停止する', async () => {
  const runCorruption = await makeRawGrid('run-corruption');
  const runPlacement = await placePresentationAudioGridV001({
    gridPath: runCorruption.gridPath,
    bytesPerSampleFrame: 4,
    audioClock: requestedClock(),
  });
  const runHandle = await open(runCorruption.gridPath, 'r+');
  try {
    await runHandle.write(Buffer.from([0xff]), 0, 1, 312 * 4);
  } finally {
    await runHandle.close();
  }
  await assert.rejects(
    verifyPresentationAudioGridPlacementV001({
      gridPath: runCorruption.gridPath,
      bytesPerSampleFrame: 4,
      plan: runPlacement.plan,
      runPayloadSha256: runPlacement.runPayloadSha256,
    }),
    (error) => error?.violation?.code === 'BASE_MEDIA_AUDIO_QC_FAILED'
      && error.violation.path === '$audio.sourceGrid.runPayload',
  );

  const gapCorruption = await makeRawGrid('gap-corruption');
  const gapPlacement = await placePresentationAudioGridV001({
    gridPath: gapCorruption.gridPath,
    bytesPerSampleFrame: 4,
    audioClock: requestedClock(),
  });
  const gapHandle = await open(gapCorruption.gridPath, 'r+');
  try {
    await gapHandle.write(Buffer.from([0x80]), 0, 1, 960 * 4);
  } finally {
    await gapHandle.close();
  }
  await assert.rejects(
    verifyPresentationAudioGridPlacementV001({
      gridPath: gapCorruption.gridPath,
      bytesPerSampleFrame: 4,
      plan: gapPlacement.plan,
      runPayloadSha256: gapPlacement.runPayloadSha256,
    }),
    (error) => error?.violation?.code === 'BASE_MEDIA_AUDIO_QC_FAILED'
      && error.violation.path === '$audio.insertedSilenceSpans',
  );
});

test('配置後の総数が1 sampleでも違えば停止する', async () => {
  for (const [name, byteCount] of [['short-final', 1967 * 4], ['long-final', 1969 * 4]]) {
    const fixture = await makeRawGrid(name);
    const placement = await placePresentationAudioGridV001({
      gridPath: fixture.gridPath,
      bytesPerSampleFrame: 4,
      audioClock: requestedClock(),
    });
    await truncate(fixture.gridPath, byteCount);
    await assert.rejects(
      verifyPresentationAudioGridPlacementV001({
        gridPath: fixture.gridPath,
        bytesPerSampleFrame: 4,
        plan: placement.plan,
        runPayloadSha256: placement.runPayloadSha256,
      }),
      (error) => error?.violation?.code === 'BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID'
        && error.violation.path === '$audio.sourceGrid.placementLength',
    );
  }
});

test('48 sample内部空白を持つAACでも4,144 sample格子とcanonical zeroを作る', async () => {
  const sourcePath = path.join(runtimeDirectory, 'internal-gap-48.mp4');
  const created = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=0.2',
    '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=0.064',
    '-filter_complex', "[1:a]asetpts='if(gte(N,1024),PTS+48,PTS)'[a]",
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-bf', '0', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '1',
    '-movie_timescale', '30', '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-avoid_negative_ts', 'disabled', '-map_metadata', '-1', sourcePath,
  ]);
  assert.equal(created.code, 0, created.stderr);
  const inspected = await inspectPresentationBaseMediaSourceV001(sourcePath);
  const internalGap = inspected.audioClock.spans.find((span) => (
    span.startSample === 2048 && span.endSample === 2096
  ));
  assert.deepEqual(internalGap, {startSample: 2048, endSample: 2096});
  assert.equal(inspected.audioClock.sourceGridSampleCount, 4144);
  const audioDirectory = path.join(runtimeDirectory, 'internal-gap-48-audio');
  await mkdir(audioDirectory);
  const audioData = await buildPresentationBaseMediaAudioV001(
    sourcePath,
    audioDirectory,
    inspected.audioClock,
    [{
      segmentId: 'segment-0001',
      audioSamples: {
        sourceStart: 0,
        sourceEnd: inspected.audioClock.sourceGridMappingEndSample,
        outputStart: 0,
        outputEnd: inspected.audioClock.sourceGridMappingEndSample,
      },
    }],
  );
  assert.equal(audioData.decodedSourceGridSampleCount, 4144);
  assert.equal(audioData.gridArguments.includes('-af'), false);
  assert.equal(audioData.gridArguments.some((value) => value.includes('aresample')), false);
  const grid = await readFile(audioData.sourceGridPath);
  assertAllZeroBytes(grid.subarray(2048 * 4, 2096 * 4));
  assert.notEqual(grid.readFloatLE((2048 - 1) * 4), 0);
  assert.notEqual(grid.readFloatLE(2096 * 4), 0);
});

test('配置計画はrunとgapで絶対格子を重複なく全被覆する', () => {
  const plan = buildPresentationAudioGridPlacementPlanV001(requestedClock());
  assert.deepEqual(plan.runs, [
    {
      runId: 'run-000001',
      sourceStartSample: 0,
      sourceEndSample: 648,
      targetStartSample: 312,
      targetEndSample: 960,
    },
    {
      runId: 'run-000002',
      sourceStartSample: 648,
      sourceEndSample: 1608,
      targetStartSample: 1008,
      targetEndSample: 1968,
    },
  ]);
});

test('1MiBを超える重複runも複数chunkを末尾側から移して元byteを壊さない', async () => {
  const rawSampleCount = 600000;
  const audioClock = {
    ...requestedClock(),
    sourceGridSampleCount: rawSampleCount + 360,
    sourceGridMappingEndSample: rawSampleCount + 360,
  };
  const {gridPath, raw} = await makeRawGrid('overlapping-multi-chunk', rawSampleCount);
  const placement = await placePresentationAudioGridV001({
    gridPath,
    bytesPerSampleFrame: 4,
    audioClock,
  });
  const placed = await readFile(gridPath);
  assert.equal(placed.length, (rawSampleCount + 360) * 4);
  assertAllZeroBytes(placed.subarray(0, 312 * 4));
  assertAllZeroBytes(placed.subarray(960 * 4, 1008 * 4));
  assert.deepEqual(placed.subarray(312 * 4, 960 * 4), raw.subarray(0, 648 * 4));
  assert.deepEqual(placed.subarray(1008 * 4), raw.subarray(648 * 4));
  assert.ok(
    (placement.plan.runs[1].sourceEndSample - placement.plan.runs[1].sourceStartSample) * 4
      > 1024 * 1024,
    '後半runは1MiBを超え、複数chunk移動を実際に通る',
  );
});

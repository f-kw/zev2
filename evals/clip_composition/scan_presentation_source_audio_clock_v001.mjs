#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {lstat, open, readFile, stat} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const SCANNER_PATH = fileURLToPath(import.meta.url);
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-source-audio-clock-coverage-scan-v001',
);
const EXPECTED_REQUEST_PATH = path.join(OUTPUT_ROOT, 'scan-request.json');
const EXPECTED_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'scan-result.json');
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_DESCRIPTOR_PATH = '/dev/fd/3';

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const exactJson = (value) => JSON.stringify(value);

const fileHandleSha256 = async (handle, byteCount) => {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let position = 0;
  while (position < byteCount) {
    const requested = Math.min(buffer.length, byteCount - position);
    const {bytesRead} = await handle.read(buffer, 0, requested, position);
    if (bytesRead !== requested) throw new Error(`short read while hashing source at ${position}`);
    hash.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return hash.digest('hex');
};

const childOptions = (inputHandle = null) => ({
  cwd: WORKSPACE_ROOT,
  env: {...process.env, TMPDIR: '/private/tmp'},
  stdio: inputHandle ? ['ignore', 'pipe', 'pipe', inputHandle.fd] : ['ignore', 'pipe', 'pipe'],
});

const run = (command, args, inputHandle = null) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, childOptions(inputHandle));
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  }));
});

const runJson = async (command, args, inputHandle) => {
  const result = await run(command, args, inputHandle);
  if (result.code !== 0) throw new Error(`${command} failed (${result.code}): ${result.stderr}`);
  return JSON.parse(result.stdout);
};

const streamLines = (command, args, inputHandle, onLine) => new Promise((resolve, reject) => {
  const stderr = [];
  let callbackError = null;
  const child = spawn(command, args, childOptions(inputHandle));
  const lines = createInterface({input: child.stdout, crlfDelay: Infinity});
  lines.on('line', (line) => {
    if (callbackError || line.length === 0) return;
    try {
      onLine(line);
    } catch (error) {
      callbackError = error;
      child.kill('SIGTERM');
    }
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (callbackError) reject(callbackError);
    else if (code === 0) resolve();
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const streamBytes = (command, args, inputHandle) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stderr = [];
  let byteCount = 0;
  const child = spawn(command, args, childOptions(inputHandle));
  child.stdout.on('data', (chunk) => {
    byteCount += chunk.length;
    hash.update(chunk);
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve({byteCount, payloadSha256: hash.digest('hex')});
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const parseRational = (value) => {
  const match = /^(\-?\d+)\/(\d+)$/.exec(value ?? '');
  if (!match || Number(match[2]) === 0) return null;
  return {numerator: Number(match[1]), denominator: Number(match[2])};
};

const scaledInteger = (value, timeBase, sampleRate) => {
  const numeric = Number(value);
  const rational = parseRational(timeBase);
  if (!Number.isInteger(numeric) || !rational) return null;
  const numerator = numeric * rational.numerator * sampleRate;
  return numerator % rational.denominator === 0 ? numerator / rational.denominator : null;
};

const compactEntries = (line) => line.split('|').map((part) => {
  const separator = part.indexOf('=');
  return separator === -1 ? [part, null] : [part.slice(0, separator), part.slice(separator + 1)];
});
const compactValue = (entries, key) => entries.find(([name]) => name === key)?.[1] ?? null;
const decimalString = (value) => Number.isInteger(value) ? String(value) : null;
const gapKey = (gap) => `${gap.kind}:${gap.startSample}:${gap.endSample}`;

const assertNoSymlinkComponents = async (targetPath, includeLeaf = true) => {
  const relative = path.relative(WORKSPACE_ROOT, targetPath);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`path escapes workspace: ${targetPath}`);
  }
  const parts = relative.split(path.sep);
  const count = includeLeaf ? parts.length : parts.length - 1;
  let cursor = WORKSPACE_ROOT;
  for (let index = 0; index < count; index += 1) {
    cursor = path.join(cursor, parts[index]);
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error(`symlink component is forbidden: ${cursor}`);
  }
};

const resolveWorkspacePath = (value, label) => {
  if (path.isAbsolute(value)) throw new Error(`${label} must be workspace-relative`);
  const resolved = path.resolve(WORKSPACE_ROOT, value);
  const relative = path.relative(WORKSPACE_ROOT, resolved);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes workspace`);
  }
  return resolved;
};

const sameFileIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeMs === right.mtimeMs;

const writeNewOutput = async (outputPath, bytes) => {
  if (outputPath !== EXPECTED_OUTPUT_PATH) throw new Error('unexpected scan output path');
  await assertNoSymlinkComponents(outputPath, false);
  const handle = await open(outputPath, 'wx');
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const main = async () => {
  const [requestPathValue, outputPathValue] = process.argv.slice(2);
  if (!requestPathValue || !outputPathValue) {
    process.stderr.write('usage: scan_presentation_source_audio_clock_v001.mjs <request.json> <output.json>\n');
    process.exitCode = 2;
    return;
  }
  const requestPath = path.resolve(WORKSPACE_ROOT, requestPathValue);
  const outputPath = path.resolve(WORKSPACE_ROOT, outputPathValue);
  if (requestPath !== EXPECTED_REQUEST_PATH || outputPath !== EXPECTED_OUTPUT_PATH) {
    throw new Error('request/output must use the fixed versioned scan directory');
  }
  await assertNoSymlinkComponents(requestPath, true);
  await assertNoSymlinkComponents(outputPath, false);
  const requestInfo = await lstat(requestPath);
  if (!requestInfo.isFile() || requestInfo.isSymbolicLink()) throw new Error('scan request must be a regular file');
  const requestBytes = await readFile(requestPath);
  const request = JSON.parse(requestBytes.toString('utf8'));
  if (request.schemaVersion !== 'presentation-source-audio-clock-scan-request-v001'
      || request.scanId !== 'DmWu0jVQfTE-native-1080p-audio-clock-coverage-v001'
      || typeof request.source?.path !== 'string'
      || !SHA256_PATTERN.test(request.source?.fileSha256 ?? '')
      || typeof request.trustedPreflight?.path !== 'string'
      || !SHA256_PATTERN.test(request.trustedPreflight?.fileSha256 ?? '')
      || !Array.isArray(request.knownDecodedGaps)) {
    throw new Error('invalid scan request');
  }
  const sourcePath = resolveWorkspacePath(request.source.path, 'source.path');
  const preflightPath = resolveWorkspacePath(request.trustedPreflight.path, 'trustedPreflight.path');
  if (sourcePath === requestPath || sourcePath === outputPath || preflightPath === outputPath
      || preflightPath === requestPath || preflightPath === SCANNER_PATH) {
    throw new Error('input/output path collision');
  }
  await Promise.all([
    assertNoSymlinkComponents(sourcePath, true),
    assertNoSymlinkComponents(preflightPath, true),
    assertNoSymlinkComponents(SCANNER_PATH, true),
  ]);
  const [sourceLstatBefore, sourcePathStatBefore, preflightLstat, scannerHashBefore, preflightBytes] = await Promise.all([
    lstat(sourcePath),
    stat(sourcePath),
    lstat(preflightPath),
    readFile(SCANNER_PATH).then(sha256Bytes),
    readFile(preflightPath),
  ]);
  if (!sourceLstatBefore.isFile() || sourceLstatBefore.isSymbolicLink()) {
    throw new Error('source must be a regular non-symlink file');
  }
  if (!preflightLstat.isFile() || preflightLstat.isSymbolicLink()) {
    throw new Error('trusted preflight must be a regular non-symlink file');
  }
  const preflightHash = sha256Bytes(preflightBytes);
  const preflight = JSON.parse(preflightBytes.toString('utf8'));
  const preflightSource = preflight.artifacts?.newExecutionMedia ?? null;
  const preflightStream = preflight.audioEquivalence?.newStream ?? null;
  const preflightPacket = preflight.audioEquivalence?.newPacketClock ?? null;
  const preflightPcm = preflight.audioEquivalence?.newDecodedPcm ?? null;
  const preflightFormalAudio = preflight.formalEntry?.source?.audio ?? null;
  const preflightAudioClock = preflight.formalEntry?.audioClock ?? null;
  const expectedKnownGaps = (preflightAudioClock?.spans ?? []).map((span) => ({
    kind: span.startSample === 0 ? 'leading' : 'internal',
    startSample: span.startSample,
    endSample: span.endSample,
  }));
  const violations = [];
  const addViolation = (code, pathValue, details = null) => violations.push({code, path: pathValue, details});
  if (preflightHash !== request.trustedPreflight.fileSha256
      || preflight.status !== 'passed'
      || preflightSource?.path !== request.source.path
      || preflightSource?.fileSha256 !== request.source.fileSha256) {
    addViolation('AUDIO_CLOCK_TRUSTED_PREFLIGHT_MISMATCH', '$.trustedPreflight');
  }
  if (exactJson(request.knownDecodedGaps) !== exactJson(expectedKnownGaps)) {
    addViolation('AUDIO_CLOCK_KNOWN_GAP_AUTHORITY_MISMATCH', '$.knownDecodedGaps', {
      request: request.knownDecodedGaps,
      trustedPreflight: expectedKnownGaps,
    });
  }

  const sourceHandles = await Promise.all(Array.from({length: 5}, () => open(sourcePath, 'r')));
  const [identityHandle, probeHandle, packetHandle, frameHandle, pcmHandle] = sourceHandles;
  try {
    const handleStatsBefore = await Promise.all(sourceHandles.map((handle) => handle.stat()));
    if (handleStatsBefore.some((item) => !sameFileIdentity(item, sourcePathStatBefore))) {
      throw new Error('source handles do not bind the same path identity');
    }
    const sourceHashBefore = await fileHandleSha256(identityHandle, sourcePathStatBefore.size);
    if (sourceHashBefore !== request.source.fileSha256) {
      addViolation('AUDIO_CLOCK_SOURCE_HASH_MISMATCH', '$.source.fileSha256', {
        expected: request.source.fileSha256,
        actual: sourceHashBefore,
      });
    }

    const probeArguments = [
      '-v', 'error', '-select_streams', 'a:0', '-show_streams',
      '-show_entries', 'stream=codec_name,sample_rate,channels,channel_layout,time_base,start_pts,duration_ts,initial_padding,extradata,extradata_size',
      '-show_data',
      '-of', 'json', SOURCE_DESCRIPTOR_PATH,
    ];
    const packetArguments = [
      '-v', 'error', '-select_streams', 'a:0', '-show_packets',
      '-show_entries', 'packet=pts,dts,duration,size,flags,side_data_list',
      '-of', 'compact=p=0:nk=0', SOURCE_DESCRIPTOR_PATH,
    ];
    const decodedFrameArguments = [
      '-v', 'error', '-select_streams', 'a:0', '-show_frames',
      '-show_entries', 'frame=pts,best_effort_timestamp,nb_samples',
      '-of', 'compact=p=0:nk=0', SOURCE_DESCRIPTOR_PATH,
    ];
    const pcmArguments = [
      '-v', 'error', '-i', SOURCE_DESCRIPTOR_PATH, '-map', '0:a:0',
      '-ac', String(preflightStream?.channels), '-ar', String(preflightStream?.sampleRate),
      '-sample_fmt', 'flt', '-f', 'f32le', 'pipe:1',
    ];
    const [probe, nodeGit, ffprobeVersion, ffmpegVersion] = await Promise.all([
      runJson('ffprobe', probeArguments, probeHandle),
      run('git', ['rev-parse', 'HEAD']),
      run('ffprobe', ['-version']),
      run('ffmpeg', ['-version']),
    ]);
    if (nodeGit.code !== 0 || ffprobeVersion.code !== 0 || ffmpegVersion.code !== 0) {
      throw new Error('tool version or git lookup failed');
    }
    const audioStreams = probe.streams ?? [];
    if (audioStreams.length !== 1) throw new Error(`expected one audio stream, got ${audioStreams.length}`);
    const stream = audioStreams[0];
    const sampleRate = Number(stream.sample_rate);
    const channels = Number(stream.channels);
    const streamStartSample = scaledInteger(stream.start_pts, stream.time_base, sampleRate);
    const streamDurationSamples = scaledInteger(stream.duration_ts, stream.time_base, sampleRate);
    const streamEndSample = Number.isInteger(streamStartSample) && Number.isInteger(streamDurationSamples)
      ? streamStartSample + streamDurationSamples : null;
    if (![sampleRate, channels, streamStartSample, streamDurationSamples, streamEndSample]
      .every(Number.isInteger)) {
      addViolation('AUDIO_CLOCK_STREAM_NOT_INTEGER_SAMPLE_GRID', '$.stream');
    }
    const observedStream = {
      codec: stream.codec_name ?? null,
      sampleRate,
      channels,
      channelLayout: stream.channel_layout ?? null,
      timeBase: stream.time_base ?? null,
      startPts: Number(stream.start_pts),
      durationTs: Number(stream.duration_ts),
      initialPadding: Number(stream.initial_padding ?? 0),
      extradataSize: Number(stream.extradata_size),
      extradataSha256: sha256Bytes(stream.extradata ?? ''),
    };
    if (exactJson(observedStream) !== exactJson(preflightStream)
        || preflightFormalAudio?.presentationClock?.endSample !== streamEndSample
        || preflightAudioClock?.sourceGridSampleCount !== streamEndSample) {
      addViolation('AUDIO_CLOCK_STREAM_PREFLIGHT_MISMATCH', '$.stream', {
        expected: preflightStream,
        actual: observedStream,
      });
    }

    const packetRawHash = createHash('sha256');
    const packetCanonicalHash = createHash('sha256');
    const packetGaps = [];
    const packetOverlaps = [];
    const packetPtsReversals = [];
    const packetDtsReversals = [];
    const packetDtsPtsMismatches = [];
    const packetSideData = [];
    let packetCount = 0;
    let packetPreviousPts = null;
    let packetPreviousDts = null;
    let packetPreviousEnd = 0;
    let packetDurationSum = 0;
    let packetSkipSamplesTotal = 0;
    let packetDiscardPaddingTotal = 0;
    let packetFirst = null;
    let packetLast = null;
    await streamLines('ffprobe', packetArguments, packetHandle, (line) => {
      packetRawHash.update(`${line}\n`);
      const entries = compactEntries(line);
      const pts = scaledInteger(compactValue(entries, 'pts'), stream.time_base, sampleRate);
      const dts = scaledInteger(compactValue(entries, 'dts'), stream.time_base, sampleRate);
      const duration = scaledInteger(compactValue(entries, 'duration'), stream.time_base, sampleRate);
      const size = Number(compactValue(entries, 'size'));
      const flags = compactValue(entries, 'flags');
      const mainKeys = new Set(['pts', 'dts', 'duration', 'size', 'flags']);
      const sideEntries = entries.filter(([key]) => !mainKeys.has(key));
      const ordinal = packetCount;
      const integerSideValues = sideEntries
        .filter(([key]) => key === 'skip_samples' || key === 'discard_padding')
        .map(([, value]) => Number(value));
      if (![pts, dts, duration, size].every(Number.isInteger)
          || duration <= 0 || size <= 0 || typeof flags !== 'string'
          || integerSideValues.some((value) => !Number.isInteger(value) || value < 0)) {
        addViolation('AUDIO_CLOCK_PACKET_NOT_INTEGER_SAMPLE_GRID', `$.packetClock[${ordinal}]`, {line});
      } else {
        const endSample = pts + duration;
        const row = [ordinal, decimalString(pts), decimalString(dts), decimalString(duration), decimalString(size), flags, sideEntries];
        packetCanonicalHash.update(`${JSON.stringify(row)}\n`);
        const summary = {ordinal, pts, dts, duration, endSample, size, flags, sideData: sideEntries};
        packetFirst ??= summary;
        packetLast = summary;
        if (pts > packetPreviousEnd) packetGaps.push({ordinal, startSample: packetPreviousEnd, endSample: pts});
        if (pts < packetPreviousEnd) packetOverlaps.push({ordinal, startSample: pts, endSample: packetPreviousEnd});
        if (packetPreviousPts !== null && pts < packetPreviousPts) packetPtsReversals.push(summary);
        if (packetPreviousDts !== null && dts < packetPreviousDts) packetDtsReversals.push(summary);
        if (dts !== pts) packetDtsPtsMismatches.push(summary);
        if (sideEntries.length > 0) packetSideData.push(summary);
        for (const [key, value] of sideEntries) {
          if (key === 'skip_samples') packetSkipSamplesTotal += Number(value);
          if (key === 'discard_padding') packetDiscardPaddingTotal += Number(value);
        }
        packetPreviousPts = pts;
        packetPreviousDts = dts;
        packetPreviousEnd = endSample;
        packetDurationSum += duration;
      }
      packetCount += 1;
    });
    const packetRawCompactSha256 = packetRawHash.digest('hex');

    const frameRawHash = createHash('sha256');
    const frameCanonicalHash = createHash('sha256');
    const decodedGaps = [];
    const decodedOverlaps = [];
    const decodedReversals = [];
    const decodedNonIntegral = [];
    const decodedPtsMismatches = [];
    let frameCount = 0;
    let framePreviousStart = null;
    let framePreviousEnd = 0;
    let sumNbSamples = 0;
    let frameFirst = null;
    let frameLast = null;
    await streamLines('ffprobe', decodedFrameArguments, frameHandle, (line) => {
      frameRawHash.update(`${line}\n`);
      const entries = compactEntries(line);
      const ptsValue = compactValue(entries, 'pts');
      const bestValue = compactValue(entries, 'best_effort_timestamp');
      const ptsSample = scaledInteger(ptsValue, stream.time_base, sampleRate);
      const bestSample = scaledInteger(bestValue, stream.time_base, sampleRate);
      const startSample = Number.isInteger(ptsSample) ? ptsSample : bestSample;
      const nbSamples = Number(compactValue(entries, 'nb_samples'));
      const ordinal = frameCount;
      if (Number.isInteger(ptsSample) && Number.isInteger(bestSample) && ptsSample !== bestSample) {
        decodedPtsMismatches.push({ordinal, ptsSample, bestSample});
      }
      if (!Number.isInteger(startSample) || !Number.isInteger(nbSamples) || nbSamples <= 0) {
        decodedNonIntegral.push({ordinal, line});
        addViolation('AUDIO_CLOCK_FRAME_NOT_INTEGER_SAMPLE_GRID', `$.decodedFrameClock[${ordinal}]`, {line});
      } else {
        const endSample = startSample + nbSamples;
        const row = [
          ordinal,
          ptsValue === null ? null : String(ptsValue),
          bestValue === null ? null : String(bestValue),
          decimalString(startSample),
          decimalString(nbSamples),
          decimalString(endSample),
        ];
        frameCanonicalHash.update(`${JSON.stringify(row)}\n`);
        const summary = {ordinal, pts: ptsValue === null ? null : Number(ptsValue), bestEffortTimestamp: bestValue === null ? null : Number(bestValue), startSample, nbSamples, endSample};
        frameFirst ??= summary;
        frameLast = summary;
        if (startSample > framePreviousEnd) decodedGaps.push({
          kind: framePreviousEnd === 0 ? 'leading' : 'internal',
          startSample: framePreviousEnd,
          endSample: startSample,
        });
        if (startSample < framePreviousEnd) decodedOverlaps.push({ordinal, startSample, previousEndSample: framePreviousEnd});
        if (framePreviousStart !== null && startSample < framePreviousStart) decodedReversals.push(summary);
        framePreviousStart = startSample;
        framePreviousEnd = endSample;
        sumNbSamples += nbSamples;
      }
      frameCount += 1;
    });

    const sequentialPcm = await streamBytes('ffmpeg', pcmArguments, pcmHandle);
    const bytesPerSampleFrame = channels * 4;
    const pcmSampleCount = sequentialPcm.byteCount % bytesPerSampleFrame === 0
      ? sequentialPcm.byteCount / bytesPerSampleFrame : null;
    if (pcmSampleCount !== sumNbSamples) {
      addViolation('AUDIO_CLOCK_SEQUENTIAL_PCM_COUNT_MISMATCH', '$.sequentialPcmCrossCheck', {
        expected: sumNbSamples,
        actual: pcmSampleCount,
      });
    }
    if (sequentialPcm.byteCount !== preflightPcm?.byteCount
        || sequentialPcm.payloadSha256 !== preflightPcm?.payloadSha256) {
      addViolation('AUDIO_CLOCK_PCM_PREFLIGHT_MISMATCH', '$.sequentialPcmCrossCheck', {
        expected: preflightPcm,
        actual: sequentialPcm,
      });
    }
    const gapTotalSampleCount = decodedGaps.reduce(
      (sum, gap) => sum + gap.endSample - gap.startSample,
      0,
    );
    if (sumNbSamples + gapTotalSampleCount !== framePreviousEnd) {
      addViolation('AUDIO_CLOCK_DECODED_COVERAGE_MISMATCH', '$.coverage.decodedIdentity');
    }
    if (packetPreviousEnd !== streamEndSample) {
      addViolation('AUDIO_CLOCK_PACKET_STREAM_END_MISMATCH', '$.coverage.packetStreamEnd');
    }
    if (framePreviousEnd < streamEndSample) {
      addViolation('AUDIO_CLOCK_DECODED_END_BEFORE_PRESENTATION', '$.coverage.decodedEnd');
    }
    if (packetGaps.length > 0 || packetOverlaps.length > 0 || packetPtsReversals.length > 0
        || packetDtsReversals.length > 0 || packetDtsPtsMismatches.length > 0) {
      addViolation('AUDIO_CLOCK_PACKET_SEQUENCE_INVALID', '$.packetClock');
    }
    if (decodedOverlaps.length > 0 || decodedReversals.length > 0
        || decodedNonIntegral.length > 0 || decodedPtsMismatches.length > 0) {
      addViolation('AUDIO_CLOCK_DECODED_SEQUENCE_INVALID', '$.decodedFrameClock');
    }
    if (packetCount !== preflightPacket?.packetCount
        || packetFirst?.pts !== preflightPacket?.firstPts
        || packetPreviousEnd !== preflightPacket?.packetEndSample
        || packetSkipSamplesTotal !== preflightPacket?.skipSamples
        || packetDiscardPaddingTotal !== preflightPacket?.discardPadding
        || packetRawCompactSha256 !== preflightPacket?.canonicalPacketSha256) {
      addViolation('AUDIO_CLOCK_PACKET_PREFLIGHT_MISMATCH', '$.packetClock.trustedPreflight', {
        expected: preflightPacket,
        actual: {
          packetCount,
          firstPts: packetFirst?.pts ?? null,
          packetEndSample: packetPreviousEnd,
          skipSamples: packetSkipSamplesTotal,
          discardPadding: packetDiscardPaddingTotal,
          canonicalPacketSha256: packetRawCompactSha256,
        },
      });
    }
    const knownGapKeys = new Set(request.knownDecodedGaps.map(gapKey));
    const observedGapKeys = new Set(decodedGaps.map(gapKey));
    const additionalGaps = decodedGaps.filter((gap) => !knownGapKeys.has(gapKey(gap)));
    const missingKnownGaps = request.knownDecodedGaps.filter((gap) => !observedGapKeys.has(gapKey(gap)));
    if (missingKnownGaps.length > 0) addViolation('AUDIO_CLOCK_KNOWN_GAP_MISSING', '$.coverage.knownDecodedGaps');

    await assertNoSymlinkComponents(sourcePath, true);
    const [sourceLstatAfter, sourcePathStatAfter, handleStatsAfter, sourceHashAfter, scannerHashAfter] = await Promise.all([
      lstat(sourcePath),
      stat(sourcePath),
      Promise.all(sourceHandles.map((handle) => handle.stat())),
      fileHandleSha256(identityHandle, sourcePathStatBefore.size),
      readFile(SCANNER_PATH).then(sha256Bytes),
    ]);
    const sourceUnchanged = !sourceLstatAfter.isSymbolicLink()
      && sourceLstatAfter.isFile()
      && sameFileIdentity(sourcePathStatAfter, sourcePathStatBefore)
      && handleStatsAfter.every((item) => sameFileIdentity(item, sourcePathStatBefore))
      && sourceHashAfter === sourceHashBefore;
    if (!sourceUnchanged) addViolation('AUDIO_CLOCK_SOURCE_CHANGED_DURING_SCAN', '$.source.after');
    if (scannerHashAfter !== scannerHashBefore) addViolation('AUDIO_CLOCK_SCANNER_CHANGED_DURING_SCAN', '$.tools.scanner');

    const placeholder = (args) => args.map((value) => value === SOURCE_DESCRIPTOR_PATH ? '<OPEN_SOURCE_FD>' : value);
    const artifact = {
      schemaVersion: 'presentation-source-audio-clock-coverage-scan-v001',
      scanId: request.scanId,
      recordedAt: new Date().toISOString(),
      status: violations.length === 0 ? 'passed' : 'failed',
      request: {
        path: path.relative(WORKSPACE_ROOT, requestPath),
        fileSha256: sha256Bytes(requestBytes),
      },
      source: {
        path: request.source.path,
        fileSha256: sourceHashBefore,
        byteCount: sourcePathStatBefore.size,
        device: sourcePathStatBefore.dev,
        inode: sourcePathStatBefore.ino,
        regularFile: sourceLstatBefore.isFile(),
        symbolicLink: sourceLstatBefore.isSymbolicLink(),
        boundOpenHandleCount: sourceHandles.length,
        afterFileSha256: sourceHashAfter,
        afterByteCount: sourcePathStatAfter.size,
        unchangedDuringScan: sourceUnchanged,
      },
      trustedPreflight: {
        path: request.trustedPreflight.path,
        fileSha256: preflightHash,
        status: preflight.status ?? null,
        sourcePathMatches: preflightSource?.path === request.source.path,
        sourceHashMatches: preflightSource?.fileSha256 === request.source.fileSha256,
        knownGapsMatchRequest: exactJson(request.knownDecodedGaps) === exactJson(expectedKnownGaps),
        packetClockMatches: !violations.some((item) => item.code === 'AUDIO_CLOCK_PACKET_PREFLIGHT_MISMATCH'),
        decodedPcmMatches: !violations.some((item) => item.code === 'AUDIO_CLOCK_PCM_PREFLIGHT_MISMATCH'),
      },
      tools: {
        nodeVersion: process.version,
        ffprobeVersion: ffprobeVersion.stdout.split(/\r?\n/)[0],
        ffmpegVersion: ffmpegVersion.stdout.split(/\r?\n/)[0],
        scanner: {
          path: path.relative(WORKSPACE_ROOT, SCANNER_PATH),
          fileSha256: scannerHashBefore,
          afterFileSha256: scannerHashAfter,
          unchangedDuringScan: scannerHashAfter === scannerHashBefore,
          gitHead: nodeGit.stdout.trim(),
        },
        probeArguments: placeholder(probeArguments),
        packetArguments: placeholder(packetArguments),
        decodedFrameArguments: placeholder(decodedFrameArguments),
        sequentialPcmArguments: placeholder(pcmArguments),
        seekOrReadIntervalUsed: false,
      },
      scopeExclusions: request.scopeExclusions ?? [],
      stream: {
        ...observedStream,
        streamEndSample,
      },
      packetClock: {
        count: packetCount,
        first: packetFirst,
        last: packetLast,
        sumDurationSamples: packetDurationSum,
        packetEndSample: packetPreviousEnd,
        rawCompactSha256: packetRawCompactSha256,
        normalizedCanonicalSha256: packetCanonicalHash.digest('hex'),
        gaps: packetGaps,
        overlaps: packetOverlaps,
        ptsReversals: packetPtsReversals,
        dtsReversals: packetDtsReversals,
        dtsPtsMismatches: packetDtsPtsMismatches,
        sideData: packetSideData,
        skipSamplesTotal: packetSkipSamplesTotal,
        discardPaddingTotal: packetDiscardPaddingTotal,
      },
      decodedFrameClock: {
        count: frameCount,
        first: frameFirst,
        last: frameLast,
        sumNbSamples,
        decodedEndSample: framePreviousEnd,
        rawCompactSha256: frameRawHash.digest('hex'),
        normalizedCanonicalSha256: frameCanonicalHash.digest('hex'),
        gaps: decodedGaps,
        gapTotalSampleCount,
        overlaps: decodedOverlaps,
        reversals: decodedReversals,
        ptsBestEffortMismatches: decodedPtsMismatches,
        nonIntegralRows: decodedNonIntegral,
      },
      sequentialPcmCrossCheck: {
        byteCount: sequentialPcm.byteCount,
        payloadSha256: sequentialPcm.payloadSha256,
        sampleCount: pcmSampleCount,
        equalsDecodedFrameSampleSum: pcmSampleCount === sumNbSamples,
        equalsTrustedPreflight: sequentialPcm.byteCount === preflightPcm?.byteCount
          && sequentialPcm.payloadSha256 === preflightPcm?.payloadSha256,
      },
      coverage: {
        knownDecodedGaps: request.knownDecodedGaps,
        observedDecodedGaps: decodedGaps,
        additionalDecodedGapCount: additionalGaps.length,
        additionalDecodedGaps: additionalGaps,
        missingKnownGapCount: missingKnownGaps.length,
        missingKnownGaps,
        decodedIdentity: {
          sumNbSamples,
          gapTotalSampleCount,
          decodedEndSample: framePreviousEnd,
          passed: sumNbSamples + gapTotalSampleCount === framePreviousEnd,
        },
        packetStreamEnd: {
          packetEndSample: packetPreviousEnd,
          streamEndSample,
          passed: packetPreviousEnd === streamEndSample,
        },
        decodedPresentationEnd: {
          decodedEndSample: framePreviousEnd,
          presentationEndSample: streamEndSample,
          tailPaddingSampleCount: framePreviousEnd - streamEndSample,
          passed: framePreviousEnd >= streamEndSample,
        },
      },
      violations,
      retryDisposition: {
        formalBaseMediaRegenerationPerformed: false,
        nextAction: 'report-to-human-and-stop',
        reason: 'clock scan completion never authorizes candidate 13 regeneration',
      },
    };
    const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
    await writeNewOutput(outputPath, bytes);
    process.stdout.write(`${JSON.stringify({
      status: artifact.status,
      packetCount,
      frameCount,
      decodedGapCount: decodedGaps.length,
      additionalDecodedGapCount: additionalGaps.length,
      outputSha256: sha256Bytes(bytes),
    })}\n`);
    process.exitCode = artifact.status === 'passed' ? 0 : 1;
  } finally {
    await Promise.allSettled(sourceHandles.map((handle) => handle.close()));
  }
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 2;
});

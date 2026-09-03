import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

import {CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001} from './candidate-video-understanding-v001.js';

const execFileAsync = promisify(execFile);
const WORKSPACE_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
const ARTIFACT_PATH =
  'evals/clip_composition/outputs/work-candidate-video-understanding-horror-game-to-screams-source-mapping-v001/candidate-video-source-pts-mapping-v001.json';
const GENERATION_JOB_PATH =
  'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-job-v001.json';
const CANDIDATE_VIDEO_PATH =
  'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-v001.mp4';
const SOURCE_VIDEO_PATH =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const GENERATION_JOB_SHA = 'ee643a24f24e7deb6b2bf312a428aa93fa51a45372bc660652744051864b4812';
const CANDIDATE_VIDEO_SHA = 'd2f6d8c3eceae5178703a01f3b8947ef3571219ab7d329af37c8a5569d875af0';
const SOURCE_VIDEO_SHA = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): RecordValue {
  assert.ok(isRecord(value), `${label} must be an object`);
  return value;
}

function requireInteger(value: unknown, label: string): number {
  assert.ok(Number.isSafeInteger(value), `${label} must be a safe integer`);
  return value as number;
}

function exactKeys(value: RecordValue, expected: string[], label: string): void {
  assert.deepEqual(Object.keys(value), expected, `${label} keys changed`);
}

async function sha256File(relativePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path.join(WORKSPACE_ROOT, relativePath));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

function decimalSeconds(milliseconds: number): string {
  assert.ok(Number.isSafeInteger(milliseconds) && milliseconds >= 0);
  return `${Math.floor(milliseconds / 1000)}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

function parseTimeBase(value: unknown, label: string): {numerator: number; denominator: number} {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  const match = /^(\d+)\/(\d+)$/u.exec(value as string);
  assert.ok(match, `${label} must be a rational time base`);
  return {numerator: Number(match[1]), denominator: Number(match[2])};
}

async function inspectVideo(relativePath: string): Promise<{
  timeBase: {numerator: number; denominator: number};
  frameRate: {numerator: number; denominator: number};
  durationPts: number;
  frameCount: number;
  frames: Array<{pts: number; durationPts: number}>;
}> {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_streams',
    '-show_frames',
    '-show_entries',
    'stream=time_base,r_frame_rate,duration_ts,nb_frames:frame=best_effort_timestamp,duration',
    '-of', 'json',
    path.join(WORKSPACE_ROOT, relativePath)
  ], {maxBuffer: 64 * 1024 * 1024});
  const root = requireRecord(JSON.parse(stdout), 'ffprobe candidate root');
  assert.ok(Array.isArray(root.streams) && root.streams.length === 1);
  assert.ok(Array.isArray(root.frames) && root.frames.length > 0);
  const stream = requireRecord(root.streams[0], 'candidate video stream');
  const frames = root.frames.map((value, index) => {
    const frame = requireRecord(value, `candidate frame ${index}`);
    return {
      pts: Number(frame.best_effort_timestamp),
      durationPts: requireInteger(frame.duration, `candidate frame ${index} duration`)
    };
  });
  return {
    timeBase: parseTimeBase(stream.time_base, 'candidate time base'),
    frameRate: parseTimeBase(stream.r_frame_rate, 'candidate frame rate'),
    durationPts: Number(stream.duration_ts),
    frameCount: Number(stream.nb_frames),
    frames
  };
}

async function inspectSourceVideo(relativePath: string): Promise<{
  timeBase: {numerator: number; denominator: number};
  frameRate: {numerator: number; denominator: number};
  startPts: number;
}> {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=time_base,r_frame_rate,start_pts',
    '-of', 'json',
    path.join(WORKSPACE_ROOT, relativePath)
  ]);
  const root = requireRecord(JSON.parse(stdout), 'ffprobe source root');
  assert.ok(Array.isArray(root.streams) && root.streams.length === 1);
  const stream = requireRecord(root.streams[0], 'source video stream');
  return {
    timeBase: parseTimeBase(stream.time_base, 'source time base'),
    frameRate: parseTimeBase(stream.r_frame_rate, 'source frame rate'),
    startPts: Number(stream.start_pts)
  };
}

async function decodePartFrames(
  sourcePath: string,
  sourceStartMs: number,
  sourceEndMs: number
): Promise<Array<{index: number; relativePts: number; durationPts: number}>> {
  const {stderr} = await execFileAsync('ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-loglevel', 'info',
    '-ss', decimalSeconds(sourceStartMs),
    '-to', decimalSeconds(sourceEndMs),
    '-i', path.join(WORKSPACE_ROOT, sourcePath),
    '-map', '0:v:0',
    '-an',
    '-vf', 'showinfo',
    '-f', 'null',
    '-'
  ], {maxBuffer: 64 * 1024 * 1024});
  const frames = [...stderr.matchAll(
    /Parsed_showinfo[^\n]*?n:\s*(\d+)\s+pts:\s*(\d+)[^\n]*?duration:\s*(\d+)/gu
  )].map((match) => ({
    index: Number(match[1]),
    relativePts: Number(match[2]),
    durationPts: Number(match[3])
  }));
  assert.ok(frames.length > 0, 'ffmpeg showinfo returned no frames');
  frames.forEach((frame, index) => assert.equal(frame.index, index, 'decoder frame order changed'));
  return frames;
}

function verifyGenerationJob(value: unknown): {
  first: {sourceStartMs: number; sourceEndMs: number};
  second: {sourceStartMs: number; sourceEndMs: number};
} {
  const job = requireRecord(value, 'generation job');
  assert.equal(job.schemaVersion, 'distant-connection-candidate-review-job-v001');
  assert.equal(job.candidateId, 'candidate-horror-game-to-screams-001');
  assert.equal(job.sourceVideoId, 'ymUsGrT6EaA');
  assert.ok(Array.isArray(job.orderedParts) && job.orderedParts.length === 2);
  const parts = job.orderedParts.map((value, index) => {
    const part = requireRecord(value, `ordered part ${index}`);
    const interval = requireRecord(part.sourceInterval, `ordered part ${index} interval`);
    return {
      part: part.part,
      sourceStartMs: requireInteger(interval.sourceStartMs, `ordered part ${index} start`),
      sourceEndMs: requireInteger(interval.sourceEndMs, `ordered part ${index} end`)
    };
  });
  assert.deepEqual(parts.map((part) => part.part), ['first', 'second']);
  const output = requireRecord(job.output, 'generation output');
  assert.equal(output.path, CANDIDATE_VIDEO_PATH);
  const ffmpeg = requireRecord(job.ffmpeg, 'generation ffmpeg');
  assert.equal(ffmpeg.executable, 'ffmpeg');
  assert.ok(Array.isArray(ffmpeg.args));
  const args = ffmpeg.args as unknown[];
  const requiredSequence = [
    '-ss', decimalSeconds(parts[0].sourceStartMs),
    '-to', decimalSeconds(parts[0].sourceEndMs),
    '-i', SOURCE_VIDEO_PATH,
    '-ss', decimalSeconds(parts[1].sourceStartMs),
    '-to', decimalSeconds(parts[1].sourceEndMs),
    '-i', SOURCE_VIDEO_PATH
  ];
  let cursor = 0;
  for (const token of requiredSequence) {
    cursor = args.indexOf(token, cursor);
    assert.notEqual(cursor, -1, `generation command is missing ${token}`);
    cursor += 1;
  }
  assert.ok(args.includes('[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]'));
  assert.ok(args.includes('libx264'));
  return {first: parts[0], second: parts[1]};
}

function deriveFrameEvidence(frames: Array<{pts: number; durationPts: number}>, nominalDelta: number) {
  const deviations = [];
  for (let index = 1; index < frames.length; index += 1) {
    const deltaPts = frames[index].pts - frames[index - 1].pts;
    if (deltaPts !== nominalDelta) {
      deviations.push({
        currentFrameIndex: index,
        previousPts: frames[index - 1].pts,
        currentPts: frames[index].pts,
        deltaPts
      });
    }
  }
  return deviations;
}

async function deriveArtifact(): Promise<RecordValue> {
  const [jobBytes, jobSha, candidateSha, sourceSha, candidate, source] = await Promise.all([
    readFile(path.join(WORKSPACE_ROOT, GENERATION_JOB_PATH)),
    sha256File(GENERATION_JOB_PATH),
    sha256File(CANDIDATE_VIDEO_PATH),
    sha256File(SOURCE_VIDEO_PATH),
    inspectVideo(CANDIDATE_VIDEO_PATH),
    inspectSourceVideo(SOURCE_VIDEO_PATH)
  ]);
  assert.equal(jobSha, GENERATION_JOB_SHA);
  assert.equal(candidateSha, CANDIDATE_VIDEO_SHA);
  assert.equal(sourceSha, SOURCE_VIDEO_SHA);
  const intervals = verifyGenerationJob(JSON.parse(jobBytes.toString('utf8')));
  assert.deepEqual(candidate.timeBase, {numerator: 1, denominator: 15360});
  assert.deepEqual(candidate.frameRate, {numerator: 60, denominator: 1});
  assert.deepEqual(source.timeBase, {numerator: 1, denominator: 90000});
  assert.deepEqual(source.frameRate, {numerator: 60, denominator: 1});
  assert.equal(source.startPts, 1440);
  const candidateFrameDurationPts = candidate.timeBase.denominator
    / candidate.frameRate.numerator;
  const sourceFrameDurationPts = source.timeBase.denominator
    / source.frameRate.numerator;
  assert.equal(candidateFrameDurationPts, 256);
  assert.equal(sourceFrameDurationPts, 1500);
  assert.equal(candidate.frameCount, candidate.frames.length);
  assert.equal(candidate.frameCount, 790);
  assert.equal(candidate.frames.at(-1)!.durationPts, candidateFrameDurationPts);
  const deviations = deriveFrameEvidence(candidate.frames, candidateFrameDurationPts);
  assert.deepEqual(deviations, [{
    currentFrameIndex: 357,
    previousPts: 91136,
    currentPts: 91648,
    deltaPts: 512
  }]);

  const decoded = await Promise.all([
    decodePartFrames(SOURCE_VIDEO_PATH, intervals.first.sourceStartMs, intervals.first.sourceEndMs),
    decodePartFrames(SOURCE_VIDEO_PATH, intervals.second.sourceStartMs, intervals.second.sourceEndMs)
  ]);
  const parts = [intervals.first, intervals.second].map((interval, index) => {
    const frames = decoded[index];
    const nonNominalCount = deriveFrameEvidence(
      frames.map((frame) => ({pts: frame.relativePts, durationPts: frame.durationPts})),
      sourceFrameDurationPts
    ).length;
    frames.forEach((frame) => assert.equal(frame.durationPts, sourceFrameDurationPts));
    const seekStartPts = interval.sourceStartMs
      * source.timeBase.denominator / (1000 * source.timeBase.numerator);
    assert.ok(Number.isSafeInteger(seekStartPts));
    const sourceStartPts = seekStartPts + frames[0].relativePts;
    const sourceEndPtsExclusive = seekStartPts
      + frames.at(-1)!.relativePts + frames.at(-1)!.durationPts;
    const sourceFrameStartIndex = (sourceStartPts - source.startPts) / sourceFrameDurationPts;
    const sourceFrameEndIndexExclusive = (sourceEndPtsExclusive - source.startPts)
      / sourceFrameDurationPts;
    assert.ok(Number.isSafeInteger(sourceFrameStartIndex));
    assert.ok(Number.isSafeInteger(sourceFrameEndIndexExclusive));
    return {
      decoderFrameCount: frames.length,
      relativeFirstPts: frames[0].relativePts,
      relativeLastPts: frames.at(-1)!.relativePts,
      nonNominalCount,
      sourceStartPts,
      sourceEndPtsExclusive,
      sourceFrameStartIndex,
      sourceFrameEndIndexExclusive
    };
  });
  assert.equal(parts[0].decoderFrameCount, 357);
  assert.equal(parts[1].decoderFrameCount, 433);
  assert.equal(parts[0].decoderFrameCount + parts[1].decoderFrameCount, candidate.frameCount);
  assert.equal(deviations[0].currentFrameIndex, parts[0].decoderFrameCount);

  const firstCandidateEndPtsExclusive = candidate.frames[356].pts
    + candidateFrameDurationPts;
  const secondCandidateStartPts = candidate.frames[357].pts;
  const candidateEndPtsExclusive = candidate.frames.at(-1)!.pts
    + candidateFrameDurationPts;
  assert.equal(firstCandidateEndPtsExclusive, 91392);
  assert.equal(secondCandidateStartPts, 91648);
  assert.equal(candidateEndPtsExclusive, 202496);
  assert.equal(candidate.durationPts, candidateEndPtsExclusive);

  return {
    schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
    artifactId: 'candidate-horror-game-to-screams-001-source-pts-mapping-v001',
    candidateId: 'candidate-horror-game-to-screams-001',
    sourceVideoId: 'ymUsGrT6EaA',
    evidenceBindings: {
      generationJob: {
        path: GENERATION_JOB_PATH,
        schemaVersion: 'distant-connection-candidate-review-job-v001',
        fileSha256: jobSha
      },
      candidateVideo: {
        path: CANDIDATE_VIDEO_PATH,
        schemaVersion: 'media-file-v001',
        fileSha256: candidateSha
      },
      sourceVideo: {
        path: SOURCE_VIDEO_PATH,
        schemaVersion: 'media-file-v001',
        fileSha256: sourceSha
      }
    },
    derivation: {
      generationCommand: {
        ffmpegExecutable: 'ffmpeg',
        concatFilter: '[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]',
        orderedParts: ['first', 'second'],
        videoCodec: 'libx264'
      },
      candidateFrameEvidence: {
        timeBase: candidate.timeBase,
        frameCount: candidate.frameCount,
        firstFramePts: candidate.frames[0].pts,
        lastFramePts: candidate.frames.at(-1)!.pts,
        frameDurationPts: candidateFrameDurationPts,
        nominalPtsDelta: candidateFrameDurationPts,
        ptsDeltaDeviations: deviations
      },
      sourceFrameEvidence: {
        timeBase: source.timeBase,
        streamStartPts: source.startPts,
        frameDurationPts: sourceFrameDurationPts,
        parts: [
          {
            part: 'first',
            decoderFrameCount: parts[0].decoderFrameCount,
            relativeFirstPts: parts[0].relativeFirstPts,
            relativeLastPts: parts[0].relativeLastPts,
            non1500PtsDeltaCount: parts[0].nonNominalCount
          },
          {
            part: 'second',
            decoderFrameCount: parts[1].decoderFrameCount,
            relativeFirstPts: parts[1].relativeFirstPts,
            relativeLastPts: parts[1].relativeLastPts,
            non1500PtsDeltaCount: parts[1].nonNominalCount
          }
        ]
      },
      closure: {
        decodedPartFrameCountSum: parts[0].decoderFrameCount + parts[1].decoderFrameCount,
        candidateFrameCount: candidate.frameCount,
        spliceFrameIndex: deviations[0].currentFrameIndex,
        unmappedPtsDuration: secondCandidateStartPts - firstCandidateEndPtsExclusive
      }
    },
    mapping: {
      candidateTimeBase: candidate.timeBase,
      sourceTimeBase: source.timeBase,
      candidateTimelineStartPts: candidate.frames[0].pts,
      candidateTimelineEndPtsExclusive: candidateEndPtsExclusive,
      segments: [
        {
          segmentId: 'segment-0001',
          candidateFrameStartIndex: 0,
          candidateFrameEndIndexExclusive: parts[0].decoderFrameCount,
          candidateStartPts: candidate.frames[0].pts,
          candidateEndPtsExclusive: firstCandidateEndPtsExclusive,
          sourceFrameStartIndex: parts[0].sourceFrameStartIndex,
          sourceFrameEndIndexExclusive: parts[0].sourceFrameEndIndexExclusive,
          sourceStartPts: parts[0].sourceStartPts,
          sourceEndPtsExclusive: parts[0].sourceEndPtsExclusive,
          sourceSelectionStartMs: intervals.first.sourceStartMs,
          sourceSelectionEndMs: intervals.first.sourceEndMs
        },
        {
          segmentId: 'segment-0002',
          candidateFrameStartIndex: parts[0].decoderFrameCount,
          candidateFrameEndIndexExclusive: candidate.frameCount,
          candidateStartPts: secondCandidateStartPts,
          candidateEndPtsExclusive,
          sourceFrameStartIndex: parts[1].sourceFrameStartIndex,
          sourceFrameEndIndexExclusive: parts[1].sourceFrameEndIndexExclusive,
          sourceStartPts: parts[1].sourceStartPts,
          sourceEndPtsExclusive: parts[1].sourceEndPtsExclusive,
          sourceSelectionStartMs: intervals.second.sourceStartMs,
          sourceSelectionEndMs: intervals.second.sourceEndMs
        }
      ],
      unmappedCandidatePts: [
        {
          startPts: firstCandidateEndPtsExclusive,
          endPtsExclusive: secondCandidateStartPts,
          reason: 'no-candidate-frame'
        }
      ]
    }
  };
}

function assertArtifactShape(value: unknown): asserts value is RecordValue {
  const artifact = requireRecord(value, 'mapping artifact');
  exactKeys(artifact, [
    'schemaVersion',
    'artifactId',
    'candidateId',
    'sourceVideoId',
    'evidenceBindings',
    'derivation',
    'mapping'
  ], 'mapping artifact');
  assert.equal(artifact.schemaVersion, CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001);
  const mapping = requireRecord(artifact.mapping, 'mapping');
  exactKeys(mapping, [
    'candidateTimeBase',
    'sourceTimeBase',
    'candidateTimelineStartPts',
    'candidateTimelineEndPtsExclusive',
    'segments',
    'unmappedCandidatePts'
  ], 'mapping');
  assert.ok(Array.isArray(mapping.segments) && mapping.segments.length === 2);
  assert.ok(Array.isArray(mapping.unmappedCandidatePts) && mapping.unmappedCandidatePts.length === 1);
}

async function main(): Promise<void> {
  const storedBytes = await readFile(path.join(WORKSPACE_ROOT, ARTIFACT_PATH));
  const stored = JSON.parse(storedBytes.toString('utf8'));
  assertArtifactShape(stored);
  const derived = await deriveArtifact();
  assert.deepEqual(stored, derived);
  assert.deepEqual(storedBytes, Buffer.from(`${JSON.stringify(derived, null, 2)}\n`, 'utf8'));

  const noGap = structuredClone(stored) as RecordValue;
  const noGapMapping = requireRecord(noGap.mapping, 'no-gap mapping');
  const noGapSegments = noGapMapping.segments as Array<RecordValue>;
  noGapSegments[0].candidateEndPtsExclusive = 91648;
  noGapMapping.unmappedCandidatePts = [];
  assert.notDeepEqual(noGap, derived, 'PTS gap must not be assigned to the first segment');

  const wrongBoundary = structuredClone(stored) as RecordValue;
  const wrongMapping = requireRecord(wrongBoundary.mapping, 'wrong-boundary mapping');
  const wrongSegments = wrongMapping.segments as Array<RecordValue>;
  wrongSegments[0].candidateFrameEndIndexExclusive = 356;
  wrongSegments[1].candidateFrameStartIndex = 356;
  assert.notDeepEqual(wrongBoundary, derived, 'splice frame must not be estimated');

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    artifactPath: ARTIFACT_PATH,
    artifactSha256: await sha256File(ARTIFACT_PATH),
    candidateFrameRanges: [[0, 357], [357, 790]],
    sourceFrameRanges: [[14962, 15319], [368066, 368499]],
    unmappedCandidatePts: [[91392, 91648]],
    videoFilesWritten: 0,
    apiCommunications: 0,
    humanReviewArtifactsRead: 0,
    inferredBoundaries: 0,
    toleranceRules: 0
  })}\n`);
}

await main();

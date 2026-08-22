#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  createPresentationRendererProcessObserverV001,
} from '../../presentation_renderer_process_observation_v001.mjs';

const workRoot = import.meta.dirname;
const sourceUrl = 'https://www.youtube.com/watch?v=XauLZgnWHtA';
const section = {startSeconds: 274, endSeconds: 292};
const outputTemplate = path.join(workRoot, 'x5-connection-local-v001.%(ext)s');
const observationRoot = path.join(workRoot, 'acquisition-process-observations-v001');
const observer = createPresentationRendererProcessObserverV001({observationDirectory: observationRoot});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const startedAt = new Date();
const startedNs = process.hrtime.bigint();

const command = '/opt/homebrew/bin/yt-dlp';
const args = [
  '--no-playlist',
  '--download-sections', `*${section.startSeconds}-${section.endSeconds}`,
  '--force-keyframes-at-cuts',
  '--format', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
  '--merge-output-format', 'mp4',
  '--remux-video', 'mp4',
  '--output', outputTemplate,
  '--print', 'after_move:%(filepath)s\t%(filesize)s',
  sourceUrl,
];
const download = await observer.run(command, args, {
  allowedExitCodes: [0],
  observationLabel: 'x5-human-verified-clip-download',
});
const finishedNs = process.hrtime.bigint();
const finishedAt = new Date();
const stdoutPath = path.join(workRoot, 'acquisition-stdout-v001.txt');
await writeFile(stdoutPath, download.stdout, {flag: 'wx', mode: 0o444});

const candidates = (await readdir(workRoot))
  .filter(name => /^x5-connection-local-v001\.[a-z0-9]+$/u.test(name));
if (candidates.length !== 1) {
  throw new Error(`download output is not exact one file: ${JSON.stringify(candidates)}`);
}
const mediaPath = path.join(workRoot, candidates[0]);
const mediaBytes = await readFile(mediaPath);
const mediaStat = await stat(mediaPath);

const ffprobe = await observer.run('/opt/homebrew/bin/ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate',
  '-of', 'json',
  mediaPath,
], {allowedExitCodes: [0], observationLabel: 'x5-local-media-inspection'});
const ffprobeStdoutPath = path.join(workRoot, 'acquisition-ffprobe-v001.json');
await writeFile(ffprobeStdoutPath, ffprobe.stdout, {flag: 'wx', mode: 0o444});
const inspection = JSON.parse(ffprobe.stdout.toString('utf8'));
const durationSeconds = Number(inspection.format?.duration);
const videoStream = inspection.streams?.find(row => row.codec_type === 'video');
const audioStream = inspection.streams?.find(row => row.codec_type === 'audio');
if (!Number.isFinite(durationSeconds)
  || durationSeconds < 17.5
  || durationSeconds > 18.5
  || !videoStream
  || !audioStream) {
  throw new Error(`downloaded section inspection failed: ${JSON.stringify(inspection)}`);
}

const record = {
  schemaVersion: 'distant-connection-offline-media-acquisition-v001',
  source: {
    fixtureId: 'XauLZgnWHtA_part01_partial_material_v001',
    connectionId: 'X5',
    sourceVideoId: 'XauLZgnWHtA',
    sourceUrl,
    humanVerifiedClipRangeMs: {startMs: 276055, endMs: 289838},
    acquiredRangeMs: {
      startMs: section.startSeconds * 1000,
      endMs: section.endSeconds * 1000,
      reason: '人間確認済み接続の前後を含め、外向きの整数秒274〜292へ閉じた18秒',
    },
  },
  command: {executable: command, args},
  result: {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    elapsedMilliseconds: Number((finishedNs - startedNs) / 1000000n),
    exitCode: download.code,
    signal: download.signal ?? null,
    outputPath: path.relative(workRoot, mediaPath),
    outputBytes: mediaStat.size,
    outputSha256: sha256(mediaBytes),
    stdoutPath: path.basename(stdoutPath),
    stdoutSha256: sha256(download.stdout),
    stderrPath: path.relative(workRoot, path.join(download.observationDirectory, 'stderr.txt')),
    stderrSha256: sha256(download.stderr),
    inspectionPath: path.basename(ffprobeStdoutPath),
    inspection,
  },
  restrictions: {
    canonicalArtifact: false,
    externalApiCalls: 0,
    costUsd: 0,
    permittedNetworkPurpose: 'human-verified fixture clip section acquisition only',
  },
};
const recordPath = path.join(workRoot, 'offline-media-acquisition-record-v001.json');
await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
console.log(JSON.stringify({recordPath, mediaPath, result: record.result}, null, 2));

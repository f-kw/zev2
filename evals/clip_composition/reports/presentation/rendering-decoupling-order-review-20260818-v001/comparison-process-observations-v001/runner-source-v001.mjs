import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {createPresentationRendererProcessObserverV001} from '/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_process_observation_v001.mjs';

const workspaceRoot = '/Users/kawafmm/workspace/zev2';
const reviewRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/reports/presentation/rendering-decoupling-order-review-20260818-v001',
);
const outputRoot = path.join(reviewRoot, 'side-by-side-comparisons-v001');
const observationRoot = path.join(reviewRoot, 'comparison-process-observations-v001');
const reviewManifestPath = path.join(reviewRoot, 'review-manifest.json');

const sha256File = filePath => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const parseProbe = bytes => {
  const value = JSON.parse(bytes.toString('utf8'));
  const video = value.streams.find(stream => stream.codec_type === 'video');
  const audio = value.streams.find(stream => stream.codec_type === 'audio') ?? null;
  if (!video) throw new Error('comparison input has no video stream');
  return {format: value.format, video, audio};
};

const exactVideoShape = (left, right) => {
  const fields = ['width', 'height', 'r_frame_rate', 'avg_frame_rate', 'nb_frames'];
  for (const field of fields) {
    if (left.video[field] !== right.video[field]) {
      throw new Error(`comparison input video ${field} mismatch`);
    }
  }
  if (!left.video.bit_rate || !right.video.bit_rate) {
    throw new Error('comparison input video bitrate is unavailable');
  }
};

const reviewManifest = JSON.parse(await readFile(reviewManifestPath, 'utf8'));
const cases = [
  {
    caseId: 'voice-013-caption-landscape',
    outputName: 'voice-013-caption-landscape-old-left-new-right.mp4',
    rendererJobPath: 'evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v006/renderer-job-v001.json',
  },
  {
    caseId: 'candidate-59-title-landscape',
    outputName: 'candidate-59-title-landscape-old-left-new-right.mp4',
    rendererJobPath: 'evals/clip_composition/outputs/presentation/rendering-decoupling-title-control/qdczJpv8RCc-candidate-59-c-title-landscape-decoupled-v017/renderer-job-v001.json',
  },
  {
    caseId: 'candidate-59-title-vertical',
    outputName: 'candidate-59-title-vertical-old-left-new-right.mp4',
    rendererJobPath: 'evals/clip_composition/outputs/presentation/rendering-decoupling-title-control/qdczJpv8RCc-candidate-59-c-title-vertical-decoupled-v017/renderer-job-v001.json',
  },
];

await mkdir(outputRoot, {recursive: false});
const observer = createPresentationRendererProcessObserverV001({observationDirectory: observationRoot});
const results = [];

let sharedRuntime = null;
for (const definition of cases) {
  const row = reviewManifest.cases.find(candidate => candidate.caseId === definition.caseId);
  if (!row) throw new Error(`review case is missing: ${definition.caseId}`);
  const rendererJob = JSON.parse(await readFile(path.join(workspaceRoot, definition.rendererJobPath), 'utf8'));
  const runtime = {
    ffmpeg: rendererJob.runtimeBindings.ffmpeg,
    ffprobe: rendererJob.runtimeBindings.ffprobe,
  };
  for (const [name, binding] of Object.entries(runtime)) {
    if (!path.isAbsolute(binding.path)) throw new Error(`${name} path is not absolute`);
    if (await sha256File(binding.path) !== binding.fileSha256) throw new Error(`${name} SHA mismatch`);
  }
  if (sharedRuntime === null) {
    sharedRuntime = runtime;
    await observer.run(runtime.ffmpeg.path, ['-version'], {observationLabel: 'ffmpeg-version'});
    await observer.run(runtime.ffprobe.path, ['-version'], {observationLabel: 'ffprobe-version'});
  } else if (JSON.stringify(runtime) !== JSON.stringify(sharedRuntime)) {
    throw new Error('comparison cases do not share the same verified runtime');
  }

  const oldVideoPath = path.join(workspaceRoot, row.oldVideoPath);
  const newVideoPath = path.join(workspaceRoot, row.newVideoPath);
  if (await sha256File(oldVideoPath) !== row.oldVideoSha256) throw new Error('old video SHA mismatch');
  if (await sha256File(newVideoPath) !== row.newVideoSha256) throw new Error('new video SHA mismatch');

  const probeArgs = mediaPath => [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,bit_rate',
    '-of', 'json',
    mediaPath,
  ];
  const oldProbeResult = await observer.run(runtime.ffprobe.path, probeArgs(oldVideoPath), {
    observationLabel: `${definition.caseId}-old-probe`,
  });
  const newProbeResult = await observer.run(runtime.ffprobe.path, probeArgs(newVideoPath), {
    observationLabel: `${definition.caseId}-new-probe`,
  });
  const oldProbe = parseProbe(oldProbeResult.stdout);
  const newProbe = parseProbe(newProbeResult.stdout);
  exactVideoShape(oldProbe, newProbe);

  const targetBitrate = String(BigInt(oldProbe.video.bit_rate) + BigInt(newProbe.video.bit_rate));
  const outputPath = path.join(outputRoot, definition.outputName);
  const ffmpegArgs = [
    '-hide_banner', '-nostdin', '-y',
    '-i', oldVideoPath,
    '-i', newVideoPath,
    '-filter_complex', '[0:v:0][1:v:0]hstack=inputs=2:shortest=1[v]',
    '-map', '[v]',
    '-map', '0:a:0?',
    '-map_metadata', '-1',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-b:v', targetBitrate,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    outputPath,
  ];
  await observer.run(runtime.ffmpeg.path, ffmpegArgs, {
    observationLabel: `${definition.caseId}-hstack`,
  });

  const outputProbeResult = await observer.run(runtime.ffprobe.path, probeArgs(outputPath), {
    observationLabel: `${definition.caseId}-output-probe`,
  });
  const outputProbe = parseProbe(outputProbeResult.stdout);
  if (outputProbe.video.width !== oldProbe.video.width + newProbe.video.width) {
    throw new Error('comparison output width mismatch');
  }
  if (outputProbe.video.height !== oldProbe.video.height) {
    throw new Error('comparison output height mismatch');
  }
  if (outputProbe.video.nb_frames !== oldProbe.video.nb_frames) {
    throw new Error('comparison output frame count mismatch');
  }
  if (outputProbe.video.r_frame_rate !== oldProbe.video.r_frame_rate) {
    throw new Error('comparison output frame rate mismatch');
  }
  if (Boolean(outputProbe.audio) !== Boolean(oldProbe.audio)) {
    throw new Error('comparison output audio presence mismatch');
  }

  const outputStat = await stat(outputPath);
  results.push({
    caseId: definition.caseId,
    positionConvention: 'old-left-new-right',
    outputPath: path.relative(workspaceRoot, outputPath),
    outputSize: outputStat.size,
    outputSha256: await sha256File(outputPath),
    video: {
      width: outputProbe.video.width,
      height: outputProbe.video.height,
      frameRate: outputProbe.video.r_frame_rate,
      frameCount: outputProbe.video.nb_frames,
      sourceVideoBitrateSum: targetBitrate,
    },
    audioFrom: 'old-video',
    inputChecks: {
      oldSha256Exact: true,
      newSha256Exact: true,
      inputVideoShapeExact: true,
    },
  });
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 'presentation-rendering-decoupling-side-by-side-result-v001',
  runtimeBindings: sharedRuntime,
  processObservationRoot: path.relative(workspaceRoot, observationRoot),
  cases: results,
}, null, 2)}\n`);

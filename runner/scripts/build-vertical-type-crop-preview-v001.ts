#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildLayoutVideoFilter,
  type ShortsScreenLayoutPlan,
} from '../src/screen-layout.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const TARGET = Object.freeze({ width: 1080, height: 1920 });

const option = (name: string): string => {
  const prefix = `${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? '';
};

const requiredPath = (name: string): string => {
  const value = option(name);
  if (!value) {
    throw new Error(`${name}=... が必要です`);
  }
  return path.resolve(WORKSPACE_ROOT, value);
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const sha256 = (value: Buffer | string): string => (
  createHash('sha256').update(value).digest('hex')
);

const fileSha256 = async (filePath: string): Promise<string> => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const repoPath = (filePath: string): string => path.relative(WORKSPACE_ROOT, filePath);

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const run = (
  command: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: WORKSPACE_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {
      code: code ?? -1,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    };
    if (result.code === 0) {
      resolve(result);
      return;
    }
    reject(new Error(`${command} exited ${result.code}\n${result.stderr}`));
  });
});

type PreviewScene = {
  sceneId: string;
  label: string;
  purpose: string;
  sourceCueId: string;
  sourceStartFrame: number;
  sourceEndFrameExclusive: number;
  overlayPath: string;
  questionId: string;
  expectedLayoutStatus: string;
  frameCount: number;
};

const buildReviewHtml = ({
  label,
  videoName,
  screenLayoutId,
  classificationReason,
  selectedCandidateId,
  selectionReason,
  scenes,
  oldReviewPath,
}: {
  label: string;
  videoName: string;
  screenLayoutId: string;
  classificationReason: string;
  selectedCandidateId: string;
  selectionReason: string;
  scenes: PreviewScene[];
  oldReviewPath: string;
}): string => {
  let elapsedFrames = 0;
  const chapters = scenes.map((scene, index) => {
    const startSeconds = elapsedFrames / 30;
    elapsedFrames += scene.frameCount;
    return `<button type="button" data-time="${startSeconds.toFixed(6)}">${index + 1}. ${escapeHtml(scene.label)}</button>`;
  }).join('\n');
  const safeLabel = escapeHtml(label);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeLabel}</title>
  <style>
    :root { color-scheme:dark; --bg:#0a0f1e; --card:#141b2f; --line:#30405f; --accent:#65d6ff; }
    * { box-sizing:border-box; }
    body { margin:0; background:linear-gradient(135deg,#080c17,#121a31); color:#f7f8fc;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif; }
    main { max-width:1100px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:clamp(26px,4vw,42px); }
    .lede { color:#c9d3ec; line-height:1.7; }
    .grid { display:grid; grid-template-columns:minmax(300px,500px) 1fr; gap:22px; align-items:start; }
    video { width:min(100%,430px); max-height:80vh; display:block; margin:0 auto; background:#000; border-radius:18px;
      box-shadow:0 18px 60px #000a; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px; margin-bottom:14px; }
    .status { display:inline-block; padding:7px 12px; border-radius:999px; background:#183d32; color:#9ff3c7; font-weight:700; }
    dt { color:#a9b9dc; margin-top:12px; }
    dd { margin:4px 0 0; line-height:1.65; }
    .chapters { display:grid; grid-template-columns:1fr; gap:7px; }
    button { border:1px solid var(--line); background:#0e1629; color:#eef3ff; border-radius:10px; padding:9px 11px;
      text-align:left; cursor:pointer; }
    button:hover { border-color:var(--accent); }
    .check { border-left:4px solid #f4c95d; background:#322b19; color:#ffe9a3; border-radius:8px; padding:12px;
      line-height:1.6; }
    a { color:#8ce4ff; }
    @media (max-width:820px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
<main>
  <span class="status">種類判別 → 種類別crop → 描画済み</span>
  <h1>${safeLabel}</h1>
  <p class="lede">固定の上下分割ではありません。この動画の内容を先に判別し、その種類で使えるcrop候補だけから選んだ結果です。</p>
  <div class="grid">
    <section>
      <video id="video" controls playsinline preload="metadata" src="${escapeHtml(videoName)}"></video>
      <p class="check">見る点は1つだけです。人物が自然に収まり、意味のない上下分割になっていないか確認してください。</p>
    </section>
    <section>
      <article class="card">
        <h2>今回の判断</h2>
        <dl>
          <dt>動画の種類</dt><dd>${escapeHtml(screenLayoutId)}</dd>
          <dt>分類理由</dt><dd>${escapeHtml(classificationReason)}</dd>
          <dt>選んだcrop</dt><dd>${escapeHtml(selectedCandidateId)}</dd>
          <dt>選択理由</dt><dd>${escapeHtml(selectionReason)}</dd>
        </dl>
      </article>
      <article class="card">
        <h2>字幕比較の章</h2>
        <div class="chapters">${chapters}</div>
      </article>
      <article class="card">
        <h2>旧版との関係</h2>
        <p>旧版は同じ人物を「画面＋話者」と誤分類した記録として残しています。今回の動画には独立したゲーム画面がないため、人物単体cropへ差し替えました。</p>
        <p><a href="${escapeHtml(oldReviewPath)}">旧い上下構成版を見る</a> / <a href="preflight.json">機械検査結果</a></p>
      </article>
    </section>
  </div>
</main>
<script>
  const video = document.getElementById('video');
  document.querySelectorAll('button[data-time]').forEach((button) => {
    button.addEventListener('click', () => {
      video.currentTime = Number(button.dataset.time);
      video.play();
    });
  });
</script>
</body>
</html>`;
};

const main = async () => {
  const baseMediaPath = requiredPath('--base-media');
  const cropDecisionPath = requiredPath('--crop-decision');
  const sourcePreflightPath = requiredPath('--source-preflight');
  const sourceManifestPath = requiredPath('--source-manifest');
  const oldPreviewPath = requiredPath('--old-preview');
  const outputDirectory = requiredPath('--output-directory');
  const label = option('--label') || '動画種類に合わせた縦型crop';
  const outputVideoPath = path.join(outputDirectory, 'vertical-type-crop-review-v002.mp4');
  const outputReviewPath = path.join(outputDirectory, 'review.html');
  const outputPreflightPath = path.join(outputDirectory, 'preflight.json');
  const outputManifestPath = path.join(outputDirectory, 'preview-manifest.json');
  const qaFramePath = path.join(outputDirectory, 'qa-frame-middle.png');

  assert(
    outputDirectory.startsWith(`${WORKSPACE_ROOT}${path.sep}`),
    '出力先はworkspace内でなければなりません',
  );
  await mkdir(outputDirectory);
  const [
    baseMedia,
    cropDecisionBytes,
    sourcePreflightBytes,
    sourceManifestBytes,
  ] = await Promise.all([
    readFile(baseMediaPath),
    readFile(cropDecisionPath),
    readFile(sourcePreflightPath),
    readFile(sourceManifestPath),
  ]);
  const cropDecision = JSON.parse(cropDecisionBytes.toString('utf8'));
  const sourcePreflight = JSON.parse(sourcePreflightBytes.toString('utf8'));
  const sourceManifest = JSON.parse(sourceManifestBytes.toString('utf8'));

  assert(cropDecision.status === 'passed', 'crop決定が合格していません');
  assert(cropDecision.selectedPlan, 'crop決定に選択済みplanがありません');
  assert(sourcePreflight.status === 'passed', '字幕比較previewのpreflightが合格していません');
  assert(Array.isArray(sourcePreflight.scenes) && sourcePreflight.scenes.length > 0,
    '字幕比較previewにsceneがありません');
  assert(Array.isArray(sourceManifest.artifacts), '字幕比較previewのmanifestに成果物一覧がありません');
  assert(sha256(baseMedia) === sourcePreflight.source.sha256,
    '基礎映像が字幕比較previewの入力SHAと一致しません');
  const oldPreviewShaBefore = await fileSha256(oldPreviewPath);

  const artifactHashByPath = new Map<string, string>(
    sourceManifest.artifacts.map((artifact: any) => [artifact.path, artifact.sha256]),
  );
  const scenes = sourcePreflight.scenes as PreviewScene[];
  for (const scene of scenes) {
    assert(Number.isInteger(scene.sourceStartFrame) && scene.sourceStartFrame >= 0,
      `${scene.sceneId}: 開始frameが不正です`);
    assert(Number.isInteger(scene.sourceEndFrameExclusive)
      && scene.sourceEndFrameExclusive > scene.sourceStartFrame,
    `${scene.sceneId}: 終了frameが不正です`);
    assert(scene.frameCount === scene.sourceEndFrameExclusive - scene.sourceStartFrame,
      `${scene.sceneId}: frame数が区間と一致しません`);
    const overlayPath = path.resolve(WORKSPACE_ROOT, scene.overlayPath);
    assert(
      overlayPath.startsWith(`${WORKSPACE_ROOT}${path.sep}`),
      `${scene.sceneId}: overlayがworkspace外を参照しています`,
    );
    const expectedOverlayHash = artifactHashByPath.get(scene.overlayPath);
    assert(expectedOverlayHash, `${scene.sceneId}: overlayが元manifestにありません`);
    assert(await fileSha256(overlayPath) === expectedOverlayHash,
      `${scene.sceneId}: overlayのbyteが元manifestと一致しません`);
  }

  const inputProbe = JSON.parse((await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=index,codec_type,width,height,r_frame_rate,sample_rate,channels',
    '-of', 'json',
    baseMediaPath,
  ])).stdout);
  const inputVideo = inputProbe.streams.find((stream: any) => stream.codec_type === 'video');
  const inputAudio = inputProbe.streams.find((stream: any) => stream.codec_type === 'audio');
  assert(inputVideo?.r_frame_rate === '30/1', '基礎映像が30fpsではありません');
  assert(Number(inputAudio?.sample_rate) > 0, '基礎映像の音声sample rateを読めません');
  const audioSamplesPerFrame = Number(inputAudio.sample_rate) / 30;
  assert(Number.isInteger(audioSamplesPerFrame), '1frameあたりの音声sample数が整数ではありません');

  const selectedPlan = cropDecision.selectedPlan as ShortsScreenLayoutPlan;
  const videoSplitLabels = scenes.map((_, index) => `[vsource${index}]`).join('');
  const audioSplitLabels = scenes.map((_, index) => `[asource${index}]`).join('');
  const filterParts = [
    `[0:v]split=${scenes.length}${videoSplitLabels}`,
    `[0:a]asplit=${scenes.length}${audioSplitLabels}`,
  ];
  const concatLabels: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const frameCount = scene.frameCount;
    filterParts.push(
      `[vsource${index}]trim=start_frame=${scene.sourceStartFrame}:end_frame=${scene.sourceEndFrameExclusive},`
      + `setpts=PTS-STARTPTS[vtrim${index}]`,
    );
    filterParts.push(buildLayoutVideoFilter({
      inputLabel: `[vtrim${index}]`,
      outputLabel: `vcrop${index}`,
      sourceWidth: Number(inputVideo.width),
      sourceHeight: Number(inputVideo.height),
      durationSeconds: frameCount / 30,
      screenLayout: selectedPlan,
    }));
    filterParts.push(
      `[${index + 1}:v]format=rgba[overlay${index}]`,
      `[vcrop${index}][overlay${index}]overlay=0:0:shortest=1:format=auto,`
      + 'fps=30,tpad=stop_mode=clone:stop=1,'
      + `trim=start_frame=0:end_frame=${frameCount},setpts=N/(30*TB)[vscene${index}]`,
      `[asource${index}]atrim=start_sample=${scene.sourceStartFrame * audioSamplesPerFrame}:`
      + `end_sample=${scene.sourceEndFrameExclusive * audioSamplesPerFrame},`
      + `asetpts=PTS-STARTPTS[ascene${index}]`,
    );
    concatLabels.push(`[vscene${index}][ascene${index}]`);
  }
  filterParts.push(`${concatLabels.join('')}concat=n=${scenes.length}:v=1:a=1[vout][aout]`);

  const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-y', '-i', baseMediaPath];
  for (const scene of scenes) {
    ffmpegArgs.push('-loop', '1', '-framerate', '30', '-i', path.resolve(WORKSPACE_ROOT, scene.overlayPath));
  }
  ffmpegArgs.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    outputVideoPath,
  );
  await run('ffmpeg', ffmpegArgs);

  const outputProbe = JSON.parse((await run('ffprobe', [
    '-v', 'error',
    '-count_frames',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels',
    '-show_entries', 'format=duration,size',
    '-of', 'json',
    outputVideoPath,
  ])).stdout);
  const outputVideo = outputProbe.streams.find((stream: any) => stream.codec_type === 'video');
  const outputAudio = outputProbe.streams.find((stream: any) => stream.codec_type === 'audio');
  const expectedFrameCount = scenes.reduce((sum, scene) => sum + scene.frameCount, 0);
  const expectedDurationSeconds = expectedFrameCount / 30;
  assert(outputVideo?.width === TARGET.width && outputVideo?.height === TARGET.height,
    '完成MP4が1080x1920ではありません');
  assert(outputVideo?.r_frame_rate === '30/1', '完成MP4が30fpsではありません');
  assert(Number(outputVideo?.nb_read_frames) === expectedFrameCount,
    '完成MP4のframe数が字幕比較scene合計と一致しません');
  assert(Number(outputAudio?.sample_rate) === Number(inputAudio.sample_rate),
    '完成MP4の音声sample rateが基礎映像と一致しません');
  assert(Number(outputAudio?.channels) === Number(inputAudio.channels),
    '完成MP4の音声channel数が基礎映像と一致しません');
  assert(Math.abs(Number(outputProbe.format.duration) - expectedDurationSeconds) <= 1 / 30,
    '完成MP4の尺がframe正本と1frame超ずれています');
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(expectedDurationSeconds / 2),
    '-i', outputVideoPath,
    '-frames:v', '1',
    qaFramePath,
  ]);

  const relativeOldReview = path.relative(
    outputDirectory,
    path.join(path.dirname(oldPreviewPath), 'review.html'),
  );
  await writeFile(outputReviewPath, buildReviewHtml({
    label,
    videoName: path.basename(outputVideoPath),
    screenLayoutId: selectedPlan.screenLayoutId,
    classificationReason: selectedPlan.classificationReason ?? '分類理由なし',
    selectedCandidateId: selectedPlan.selectedCandidateId ?? '選択候補IDなし',
    selectionReason: selectedPlan.selectionReason ?? '選択理由なし',
    scenes,
    oldReviewPath: relativeOldReview,
  }), 'utf8');
  assert(await fileSha256(oldPreviewPath) === oldPreviewShaBefore, '旧previewが変化しました');

  const preflight = {
    schemaVersion: 'vertical-type-crop-preview-preflight-v001',
    status: 'passed',
    createdAt: new Date().toISOString(),
    externalApiCallsDuringRender: 0,
    inputs: {
      baseMedia: { path: repoPath(baseMediaPath), fileSha256: sha256(baseMedia) },
      cropDecision: { path: repoPath(cropDecisionPath), fileSha256: sha256(cropDecisionBytes) },
      sourcePreflight: { path: repoPath(sourcePreflightPath), fileSha256: sha256(sourcePreflightBytes) },
      sourceManifest: { path: repoPath(sourceManifestPath), fileSha256: sha256(sourceManifestBytes) },
    },
    classification: {
      screenLayoutId: selectedPlan.screenLayoutId,
      classificationReason: selectedPlan.classificationReason ?? null,
      selectedCandidateId: selectedPlan.selectedCandidateId ?? null,
      selectionReason: selectedPlan.selectionReason ?? null,
    },
    checks: {
      cropUsesCanonicalLayoutFilter: true,
      sourceOverlayHashesMatch: true,
      outputSize1080x1920: true,
      outputFrameCountMatchesScenes: true,
      outputDurationWithinOneFrame: true,
      outputAudioShapeMatchesSource: true,
      oldWrongPreviewPreserved: true,
    },
    media: {
      path: repoPath(outputVideoPath),
      fileSha256: await fileSha256(outputVideoPath),
      width: outputVideo.width,
      height: outputVideo.height,
      fps: outputVideo.r_frame_rate,
      frameCount: Number(outputVideo.nb_read_frames),
      durationSeconds: Number(outputProbe.format.duration),
      expectedDurationSeconds,
      audioCodec: outputAudio.codec_name,
      audioSampleRate: Number(outputAudio.sample_rate),
      audioChannels: Number(outputAudio.channels),
    },
    oldPreview: {
      path: repoPath(oldPreviewPath),
      fileSha256: oldPreviewShaBefore,
      status: 'preserved_as_wrong_screen_speaker_classification_evidence',
    },
    limitations: [
      'この確認MP4は既存の字幕比較sceneを再利用しており、完成ショートの全編ではない',
      '動画種類はspeaker_only/screen_speaker/speaker_pairの閉じた3型だけを扱う',
    ],
  };
  await writeFile(outputPreflightPath, `${JSON.stringify(preflight, null, 2)}\n`, 'utf8');

  const manifest = {
    schemaVersion: 'vertical-type-crop-preview-manifest-v001',
    status: 'ready',
    createdAt: new Date().toISOString(),
    reviewPage: repoPath(outputReviewPath),
    previewMedia: repoPath(outputVideoPath),
    qaFrame: repoPath(qaFramePath),
    preflight: repoPath(outputPreflightPath),
    artifacts: await Promise.all([
      cropDecisionPath,
      outputVideoPath,
      outputReviewPath,
      outputPreflightPath,
      qaFramePath,
    ].map(async (artifactPath) => ({
      path: repoPath(artifactPath),
      fileSha256: await fileSha256(artifactPath),
    }))),
  };
  await writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: manifest.status,
    screenLayoutId: selectedPlan.screenLayoutId,
    selectedCandidateId: selectedPlan.selectedCandidateId,
    reviewPage: manifest.reviewPage,
    previewMedia: manifest.previewMedia,
    previewSha256: preflight.media.fileSha256,
    durationSeconds: preflight.media.durationSeconds,
    frameCount: preflight.media.frameCount,
    externalApiCalls: 0,
  }));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  fileSha256V002,
  inspectRenderedMediaWithToolsV001,
} from '../../../presentation_renderer_qc_v002.mjs';
import {
  createPresentationRendererProcessObserverV001,
} from '../../../presentation_renderer_process_observation_v001.mjs';

const workspaceRoot = path.resolve(import.meta.dirname, '../../../../..');
const workRoot = import.meta.dirname;
const rel = absolutePath => path.relative(workspaceRoot, absolutePath);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJson = async (filePath, value) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
};
const readJson = async filePath => JSON.parse(await readFile(filePath, 'utf8'));
const binding = async filePath => ({path: rel(filePath), fileSha256: await fileSha256V002(filePath)});

const templatePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/work-caption-appearance-candidates-20260818-v001/run-caption-appearance-candidates-v001.ts',
);
const generatedRunnerPath = path.join(workRoot, 'run-selected-render-generated-v001.ts');
const candidateId = 'candidate-selected-s2-c2-font0';

const candidateDeclaration = `const candidates: Candidate[] = [
  candidate({
    id: '${candidateId}', axis: '色・縁・光彩', label: '選定組合せ S2 + C2 + 現行書体',
    reason: 'kawafmm選定の100px・淡いシアン・濃青縁・17px光彩を、現行LINE Seed JP ExtraBoldと組み合わせる。',
  }, {
    fontSizePx: 100,
    fontColor: '#A8F5FF', borderColor: '#083B55', borderWidthPx: 10,
    glowColor: '#00111B', glowWidthPx: 17, glowOpacityPercent: 86,
  }),
];

const firstEightInstructionIds`;

const template = await readFile(templatePath, 'utf8');
const replaced = template.replace(
  /const candidates: Candidate\[\] = \[[\s\S]*?\n\];\n\nconst firstEightInstructionIds/,
  candidateDeclaration,
);
if (replaced === template || !replaced.includes(`id: '${candidateId}'`)) {
  throw new Error('candidate template replacement did not close exactly');
}
try {
  const existingGenerated = await readFile(generatedRunnerPath, 'utf8');
  if (existingGenerated !== replaced) throw new Error('existing generated runner byte differs');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  await writeFile(generatedRunnerPath, replaced, {encoding: 'utf8', flag: 'wx'});
}

const rendererJobPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v006/renderer-job-v001.json',
);
const rendererJob = await readJson(rendererJobPath);
const runtime = rendererJob.runtimeBindings;
const wrapperObserver = createPresentationRendererProcessObserverV001({
  observationDirectory: path.join(workRoot, 'wrapper-process-observations-v003'),
});
await wrapperObserver.run(process.execPath, [runtime.tsx.path, generatedRunnerPath], {
  allowedExitCodes: [0],
  observationLabel: 'selected-candidate-render',
  env: {...process.env, NODE_PATH: path.join(workspaceRoot, 'runner/node_modules')},
});

const firstRoundRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/work-caption-appearance-candidates-20260818-v001',
);
const baselineRoot = path.join(firstRoundRoot, 'candidates/candidate-0-current/render');
const selectedRoot = path.join(workRoot, 'candidates', candidateId, 'render');
const baselineVideo = path.join(baselineRoot, 'presentation-rendered-v002.mp4');
const selectedVideo = path.join(selectedRoot, 'presentation-rendered-v002.mp4');
const baselineStill = path.join(baselineRoot, 'review-still-frame-000145.png');
const selectedStill = path.join(selectedRoot, 'review-still-frame-000145.png');
const selectedQcPath = path.join(selectedRoot, 'presentation-render-qc-v002.json');
const selectedQc = await readJson(selectedQcPath);
if (selectedQc.status !== 'passed') throw new Error('selected combination QC did not pass');

const comparisonObserver = createPresentationRendererProcessObserverV001({
  observationDirectory: path.join(workRoot, 'comparison-process-observations-v001'),
});
const comparisonVideo = path.join(workRoot, 'baseline-left-selected-right-v001.mp4');
await comparisonObserver.run(runtime.ffmpeg.path, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', baselineVideo, '-i', selectedVideo,
  '-filter_complex', '[0:v:0][1:v:0]hstack=inputs=2[v]',
  '-map', '[v]', '-map', '0:a?', '-frames:v', '375',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', '-movflags', '+faststart', comparisonVideo,
], {allowedExitCodes: [0], observationLabel: 'baseline-selected-side-by-side'});

const contactSheet = path.join(workRoot, 'baseline-selected-frame-000145-v001.png');
await comparisonObserver.run(runtime.imageMagick.path, [
  'montage', baselineStill, selectedStill,
  '-thumbnail', '960x540', '-tile', '2x1', '-geometry', '960x540+10+10',
  '-background', '#08101f', contactSheet,
], {allowedExitCodes: [0], observationLabel: 'baseline-selected-contact-sheet'});

const comparisonInspection = await inspectRenderedMediaWithToolsV001(comparisonVideo, {
  ffprobePath: runtime.ffprobe.path,
  ffmpegPath: runtime.ffmpeg.path,
  processObserver: comparisonObserver,
  observationLabelPrefix: 'side-by-side-inspection',
});
if (comparisonInspection.video?.width !== 3840
  || comparisonInspection.video?.height !== 1080
  || comparisonInspection.video?.frameCount !== 375
  || comparisonInspection.audio === null) {
  throw new Error(`side-by-side media verification failed: ${JSON.stringify(comparisonInspection)}`);
}

const baseRel = path.relative(workRoot, baselineVideo);
const baseStillRel = path.relative(workRoot, baselineStill);
const selectedRel = path.relative(workRoot, selectedVideo);
const selectedStillRel = path.relative(workRoot, selectedStill);
const reviewPath = path.join(workRoot, 'review-selected-combination-v001.html');
const reviewHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>voice-013 字幕 選定組合せ比較</title><style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#060a12;color:#eef4ff}
body{margin:0;padding:28px;background:linear-gradient(135deg,#060a12,#102044)}main{max-width:1500px;margin:auto}
h1{margin:0 0 8px}.lead{color:#b9c8e7}.hero,.grid article{background:#101a2e;border:1px solid #344769;border-radius:16px;padding:16px;margin:20px 0}
.hero video{width:100%;aspect-ratio:32/9;background:#000;border-radius:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.grid video,.grid img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#000;border-radius:10px}.values{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfe0ff}.ok{color:#84f1bd}.meta{font-size:12px;color:#94a8cf;word-break:break-all}@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>voice-013 字幕 選定組合せ</h1><p class="lead">同じ先頭8 cue・375 frame。横並び動画は左が基準、右が選定組合せです。</p>
<section class="hero"><h2>同時比較（左: 基準 / 右: 選定組合せ）</h2><video controls preload="metadata" src="baseline-left-selected-right-v001.mp4"></video></section>
<section class="grid"><article><h2>基準候補0</h2><img src="${baseStillRel}"><p class="values">96px / #FFFDF8 / 縁 #111827 8px / 光彩 #000000 12px・82% / LINE Seed JP ExtraBold</p><video controls preload="metadata" src="${baseRel}"></video></article>
<article><h2>選定組合せ</h2><img src="${selectedStillRel}"><p class="values">100px / #A8F5FF / 縁 #083B55 10px / 光彩 #00111B 17px・86% / LINE Seed JP ExtraBold</p><p class="ok">既存機械QC: passed</p><video controls preload="metadata" src="${selectedRel}"></video></article></section>
<p class="meta">比較動画 SHA-256 ${await fileSha256V002(comparisonVideo)}<br>選定動画 SHA-256 ${await fileSha256V002(selectedVideo)}</p>
</main></body></html>\n`;
await writeFile(reviewPath, reviewHtml, {encoding: 'utf8', flag: 'wx'});

const manifestPath = path.join(workRoot, 'selected-combination-manifest-v001.json');
await writeJson(manifestPath, {
  schemaVersion: 'presentation-caption-appearance-selected-combination-v001',
  createdAt: new Date().toISOString(),
  segment: {includedCueOrdinals: [1,2,3,4,5,6,7,8], frameCount: 375, fps: 30},
  appearance: {
    fontAssetId: 'line-seed-jp-extra-bold-v001', fontSizePx: 100,
    fontColor: '#A8F5FF', borderColor: '#083B55', borderWidthPx: 10,
    glowColor: '#00111B', glowWidthPx: 17, glowOpacityPercent: 86,
    unchangedFromBaseline: ['position', 'lineBreaks', 'fade', 'canvas', 'audio'],
  },
  qc: {status: selectedQc.status, checks: selectedQc.checks, violationCount: selectedQc.violations.length},
  baselineVideo: await binding(baselineVideo),
  selectedVideo: await binding(selectedVideo),
  selectedQc: await binding(selectedQcPath),
  sideBySideVideo: await binding(comparisonVideo),
  sideBySideInspection: comparisonInspection,
  contactSheet: await binding(contactSheet),
  reviewPage: await binding(reviewPath),
  externalApiCalls: 0,
  costUsd: 0,
  canonicalArtifactsCreated: 0,
  existingFilesModified: 0,
  generatedRunner: {path: rel(generatedRunnerPath), fileSha256: sha256(await readFile(generatedRunnerPath))},
});

console.log(JSON.stringify({
  status: 'completed',
  selectedVideo: await binding(selectedVideo),
  selectedQc: await binding(selectedQcPath),
  sideBySideVideo: await binding(comparisonVideo),
  reviewPage: await binding(reviewPath),
  manifest: await binding(manifestPath),
}, null, 2));

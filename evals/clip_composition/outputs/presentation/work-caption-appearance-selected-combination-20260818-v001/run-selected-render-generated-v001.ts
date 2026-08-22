#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  buildPresentationInstructionCommonCorePlanV001,
} from '../../../run_presentation_instruction_renderer_job_v001.ts';
import {
  buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002,
  executeValidatedPresentationDrawAndQcV001,
} from '../../../render_presentation_v002.mjs';
import {inspectPresentationRenderLayoutV001} from '../../../inspect_presentation_render_layout_v001.ts';
import {
  evaluatePresentationRendererQcWithProfileV001,
  fileSha256V002,
  inspectRenderedMediaWithToolsV001,
} from '../../../presentation_renderer_qc_v002.mjs';
import {
  createPresentationRendererProcessObserverV001,
} from '../../../presentation_renderer_process_observation_v001.mjs';

const workspaceRoot = path.resolve(import.meta.dirname, '../../../../..');
const workRoot = import.meta.dirname;
const rel = (absolutePath: string) => path.relative(workspaceRoot, absolutePath);
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value as Record<string, unknown>)
    .sort()
    .map(key => [key, canonicalize((value as Record<string, unknown>)[key])]));
};
const canonicalSha256 = (value: unknown) => sha256(JSON.stringify(canonicalize(value)));
const writeJson = async (filePath: string, value: unknown) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
};
const readJson = async (filePath: string) => JSON.parse(await readFile(filePath, 'utf8'));
const binding = async (filePath: string) => ({
  path: rel(filePath),
  fileSha256: await fileSha256V002(filePath),
});

const sourceControlRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v006',
);
const instructionPath = path.join(sourceControlRoot, 'presentation-instruction-v001.json');
const lineLayoutPath = path.join(sourceControlRoot, 'line-layout-v001.json');
const rendererJobPath = path.join(sourceControlRoot, 'renderer-job-v001.json');
const sourceReceiptPath = path.join(sourceControlRoot, 'admission-receipt-v001.json');
const presetRegistryPath = path.join(
  workspaceRoot,
  'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json',
);
const rendererTrustPath = path.join(
  workspaceRoot,
  'evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json',
);

const main = async () => {
const [sourceInstruction, sourceLineLayout, rendererJob, sourceReceipt, presetRegistry, rendererTrust]
  = await Promise.all([
    readJson(instructionPath),
    readJson(lineLayoutPath),
    readJson(rendererJobPath),
    readJson(sourceReceiptPath),
    readJson(presetRegistryPath),
    readJson(rendererTrustPath),
  ]);

const baselineProfile = presetRegistry.presets.find(
  (row: any) => row.presetId === sourceInstruction.styleProfileId,
);
const baselineState = baselineProfile?.visualStates.find(
  (row: any) => row.stateId === rendererJob.executionInputs.visualStateId,
);
if (!baselineProfile || !baselineState || sourceReceipt.visualStateId !== baselineState.stateId) {
  throw new Error('human-approved baseline appearance cannot be resolved exactly');
}

const fontDefinitions = {
  'line-seed-jp-extra-bold-v001': {
    fontAssetId: 'line-seed-jp-extra-bold-v001',
    fileName: 'LINESeedJP_A_OTF_Eb.otf',
    path: 'runner/public/font/LINESeedJP_A_OTF_Eb.otf',
    expectedSha256: '4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb',
    licensePath: 'runner/public/font/OFL_LINESeedJP.txt',
    displayName: 'LINE Seed JP ExtraBold',
  },
  'line-seed-jp-bold-v001': {
    fontAssetId: 'line-seed-jp-bold-v001',
    fileName: 'LINESeedJP_A_OTF_Bd.otf',
    path: 'runner/public/font/LINESeedJP_A_OTF_Bd.otf',
    expectedSha256: '72b19c54baaa61a9de412573b27ec5620ff68d9839b280003a73c65f6b6a6304',
    licensePath: 'runner/public/font/OFL_LINESeedJP.txt',
    displayName: 'LINE Seed JP Bold',
  },
  'shippori-mincho-bold-v001': {
    fontAssetId: 'shippori-mincho-bold-v001',
    fileName: 'ShipporiMincho-Bold.ttf',
    path: 'runner/public/font/ShipporiMincho-Bold.ttf',
    expectedSha256: 'be85eeed197f573a8d8dcb26634787179574f3ff179afef077ecfb8d81daa20f',
    licensePath: 'runner/public/font/OFL_ShipporiMincho-Bold.txt',
    displayName: 'Shippori Mincho Bold',
  },
} as const;

type FontId = keyof typeof fontDefinitions;
type Candidate = {
  id: string;
  axis: '基準' | '大きさ' | '色・縁・光彩' | '書体';
  label: string;
  reason: string;
  fontAssetId: FontId;
  fontSizePx: number;
  fontColor: string;
  borderColor: string;
  borderWidthPx: number;
  glowColor: string;
  glowWidthPx: number;
  glowOpacityPercent: number;
};

const baselineTextStyle = baselineState.textStyle;
const candidate = (
  base: Omit<Candidate, 'fontAssetId' | 'fontSizePx' | 'fontColor' | 'borderColor'
    | 'borderWidthPx' | 'glowColor' | 'glowWidthPx' | 'glowOpacityPercent'>,
  patch: Partial<Omit<Candidate, 'id' | 'axis' | 'label' | 'reason'>> = {},
): Candidate => ({
  ...base,
  fontAssetId: baselineTextStyle.fontAssetId,
  fontSizePx: baselineTextStyle.fontSizePx,
  fontColor: baselineTextStyle.fontColor,
  borderColor: baselineTextStyle.borderColor,
  borderWidthPx: baselineTextStyle.borderWidthPx,
  glowColor: baselineTextStyle.glowColor,
  glowWidthPx: baselineTextStyle.glowWidthPx,
  glowOpacityPercent: baselineTextStyle.glowOpacityPercent,
  ...patch,
});

const candidates: Candidate[] = [
  candidate({
    id: 'candidate-selected-s2-c2-font0', axis: '色・縁・光彩', label: '選定組合せ S2 + C2 + 現行書体',
    reason: 'kawafmm選定の100px・淡いシアン・濃青縁・17px光彩を、現行LINE Seed JP ExtraBoldと組み合わせる。',
  }, {
    fontSizePx: 100,
    fontColor: '#A8F5FF', borderColor: '#083B55', borderWidthPx: 10,
    glowColor: '#00111B', glowWidthPx: 17, glowOpacityPercent: 86,
  }),
];

const firstEightInstructionIds = new Set(
  sourceInstruction.instructions.slice(0, 8).map((row: any) => row.instructionId),
);
const clipInstruction = structuredClone(sourceInstruction);
clipInstruction.schemaVersion = 'presentation-caption-appearance-work-instruction-v001';
clipInstruction.artifactId = 'a-v002-voice-013-caption-appearance-work-v001';
clipInstruction.instructions = clipInstruction.instructions.filter(
  (row: any) => firstEightInstructionIds.has(row.instructionId),
);
const clipLineLayout = structuredClone(sourceLineLayout);
clipLineLayout.schemaVersion = 'presentation-caption-appearance-work-line-layout-v001';
clipLineLayout.layoutId = 'a-v002-voice-013-caption-appearance-work-line-layout-v001';
clipLineLayout.entries = clipLineLayout.entries.filter(
  (row: any) => firstEightInstructionIds.has(row.instructionId),
);
const expectedFrameCount = 375;
if (clipInstruction.instructions.length !== 8
  || clipLineLayout.entries.length !== 8
  || clipInstruction.instructions.at(-1)?.outputTime.endFrameExclusive !== expectedFrameCount) {
  throw new Error('the fixed 12.5-second comparison segment is not closed by eight cues');
}

const runtime = rendererJob.runtimeBindings;
const setupObservationDirectory = path.join(workRoot, 'setup-process-observations-v001');
const setupObserver = createPresentationRendererProcessObserverV001({
  observationDirectory: setupObservationDirectory,
});
const baseSegmentPath = path.join(workRoot, 'voice-013-first-8-cues-375f-base.mp4');
await setupObserver.run(runtime.ffmpeg.path, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', path.join(workspaceRoot, rendererJob.cropAppliedBaseMedia.baseMedia.path),
  '-map', '0:v:0', '-map', '0:a?', '-frames:v', String(expectedFrameCount), '-t', '12.5',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', '-movflags', '+faststart', baseSegmentPath,
], {allowedExitCodes: [0], observationLabel: 'base-segment-manufacture'});
const baseSegmentInspection = await inspectRenderedMediaWithToolsV001(baseSegmentPath, {
  ffprobePath: runtime.ffprobe.path,
  ffmpegPath: runtime.ffmpeg.path,
  processObserver: setupObserver,
  observationLabelPrefix: 'base-segment-inspection',
});
if (baseSegmentInspection.video?.frameCount !== expectedFrameCount
  || baseSegmentInspection.video?.width !== 1920
  || baseSegmentInspection.video?.height !== 1080
  || baseSegmentInspection.video?.fps !== 30
  || baseSegmentInspection.audio === null) {
  throw new Error(`base segment preflight failed: ${JSON.stringify(baseSegmentInspection)}`);
}

const sourceBindings = {
  instruction: await binding(instructionPath),
  lineLayout: await binding(lineLayoutPath),
  rendererJob: await binding(rendererJobPath),
  admissionReceipt: await binding(sourceReceiptPath),
  presetRegistry: await binding(presetRegistryPath),
  rendererTrust: await binding(rendererTrustPath),
  baseSegment: await binding(baseSegmentPath),
};

const candidateRoot = path.join(workRoot, 'candidates');
await mkdir(candidateRoot, {recursive: false});
const results: any[] = [];

for (const row of candidates) {
  const candidateDirectory = path.join(candidateRoot, row.id);
  const outputDirectory = path.join(candidateDirectory, 'render');
  const processObservationDirectory = path.join(candidateDirectory, 'process-observations-v001');
  await mkdir(candidateDirectory, {recursive: false});
  const font = fontDefinitions[row.fontAssetId];
  const fontPath = path.join(workspaceRoot, font.path);
  const licensePath = path.join(workspaceRoot, font.licensePath);
  const [fontBytes, licenseBytes] = await Promise.all([readFile(fontPath), readFile(licensePath)]);
  const fontSha256 = sha256(fontBytes);
  const licenseSha256 = sha256(licenseBytes);
  if (fontSha256 !== font.expectedSha256
    || !licenseBytes.toString('utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) {
    throw new Error(`font evidence failed for ${row.id}`);
  }

  const visualState = structuredClone(baselineState);
  visualState.stateId = `${row.id}-visual-state-v001`;
  visualState.textStyle = {
    ...visualState.textStyle,
    fontAssetId: row.fontAssetId,
    fontSizePx: row.fontSizePx,
    fontColor: row.fontColor,
    borderColor: row.borderColor,
    borderWidthPx: row.borderWidthPx,
    glowColor: row.glowColor,
    glowWidthPx: row.glowWidthPx,
    glowOpacityPercent: row.glowOpacityPercent,
  };
  const candidateRegistry = {
    ...structuredClone(presetRegistry),
    registryVersion: `caption-appearance-${row.id}-work-registry-v001`,
    fontAssets: [{
      fontAssetId: font.fontAssetId,
      fileName: font.fileName,
      path: font.path,
      sha256: fontSha256,
      licensePath: font.licensePath,
    }],
    presets: [{...structuredClone(baselineProfile), visualStates: [visualState]}],
  };
  const candidateJob = {
    schemaVersion: 'presentation-caption-appearance-candidate-job-v001',
    jobId: `a-v002-voice-013-${row.id}-work-render-v001`,
    attemptId: 'attempt-0001',
    sourceBindings,
    segment: {
      startFrame: 0,
      endFrameExclusive: expectedFrameCount,
      fps: 30,
      durationMs: 12500,
      includedCueOrdinals: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    executionInputs: {
      format: rendererJob.executionInputs.format,
      canvas: rendererJob.executionInputs.canvas,
      visualStateId: visualState.stateId,
      appearance: structuredClone(visualState),
      outputRoot: rel(outputDirectory),
    },
    reason: row.reason,
  };
  const jobPath = path.join(candidateDirectory, 'presentation-order-v001.json');
  await writeJson(jobPath, candidateJob);

  const workJobForCore = {
    executionInputs: {
      format: candidateJob.executionInputs.format,
      canvas: candidateJob.executionInputs.canvas,
    },
  };
  const common = buildPresentationInstructionCommonCorePlanV001({
    job: workJobForCore,
    visualStateId: visualState.stateId,
    instructionArtifact: clipInstruction,
    lineLayout: clipLineLayout,
    styleProfileRegistry: candidateRegistry,
    rendererTrust,
  });
  if (common.status !== 'built') throw new Error(`common plan failed for ${row.id}`);
  const processObserver = createPresentationRendererProcessObserverV001({
    observationDirectory: processObservationDirectory,
  });
  const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
    remotionPath: runtime.remotion.path,
    chromiumPath: runtime.chromium.path,
    processObserver,
  });
  const preflight = inspectPresentationRenderLayoutV001({
    canvas: common.plan.canvas,
    overlays: common.plan.elements.map((element: any) => (
      overlayAdapter.buildProps(element, common.plan, candidateRegistry)
    )),
  });
  await writeJson(path.join(candidateDirectory, 'layout-preflight-v001.json'), preflight);
  if (preflight.status !== 'passed') {
    results.push({
      ...row,
      status: 'excluded',
      reason: '既存layout検査で安全領域または行重なりが不合格',
      violations: preflight.violations,
      order: await binding(jobPath),
    });
    continue;
  }

  const draw = await executeValidatedPresentationDrawAndQcV001({
    outputDirectory,
    plan: common.plan,
    presetRegistry: candidateRegistry,
    baseMediaPath: baseSegmentPath,
    baseMediaInspection: {media: baseSegmentInspection},
    expectedFrameCount,
    evaluateQc: (input: any) => evaluatePresentationRendererQcWithProfileV001(input, {
      schemaVersion: 'presentation-caption-appearance-candidate-qc-v001',
      planFile: 'presentation-render-plan-v002.json',
    }),
    toolPaths: {
      ffmpegPath: runtime.ffmpeg.path,
      ffprobePath: runtime.ffprobe.path,
      imageMagickPath: runtime.imageMagick.path,
      tsxPath: runtime.tsx.path,
      layoutInspectorPath: path.join(
        workspaceRoot,
        'evals/clip_composition/inspect_presentation_render_layout_v001.ts',
      ),
    },
    overlayAdapter,
    processObserver,
  });
  if (draw.exitCode !== 0 || draw.finalQc?.status !== 'passed') {
    const failurePath = path.join(candidateDirectory, 'render-failure-v001.json');
    await writeJson(failurePath, {
      schemaVersion: 'presentation-caption-appearance-candidate-failure-v001',
      candidateId: row.id,
      exitCode: draw.exitCode,
      stage: draw.stage ?? null,
      violations: draw.violations ?? draw.finalQc?.violations ?? [],
    });
    results.push({
      ...row,
      status: 'excluded',
      reason: '既存renderer QCが不合格',
      failure: await binding(failurePath),
      order: await binding(jobPath),
    });
    continue;
  }

  const receipt = {
    schemaVersion: 'presentation-caption-appearance-candidate-receipt-v001',
    receiptId: `${candidateJob.jobId}-receipt-v001`,
    status: 'accepted-and-rendered',
    orderBinding: await binding(jobPath),
    appearanceCanonicalSha256: canonicalSha256(candidateJob.executionInputs.appearance),
    fontEvidence: {
      fontAssetId: font.fontAssetId,
      displayName: font.displayName,
      filePath: font.path,
      fileSha256: fontSha256,
      licensePath: font.licensePath,
      licenseFileSha256: licenseSha256,
      license: 'SIL Open Font License 1.1',
      fallbackDetected: false,
      fallbackEvidence: '全Remotion描画がFontFace loadとdocument.fonts checkを通過',
    },
    qc: {
      status: draw.finalQc.status,
      instructionCount: draw.finalQc.instructionCount,
      checks: draw.finalQc.checks,
      violationCount: draw.finalQc.violations.length,
    },
  };
  await writeJson(path.join(draw.stagingDirectory, 'presentation-order-v001.json'), candidateJob);
  await writeJson(path.join(draw.stagingDirectory, 'candidate-receipt-v001.json'), receipt);
  await writeJson(path.join(draw.stagingDirectory, 'presentation-render-plan-v002.json'), common.plan);
  await writeJson(path.join(draw.stagingDirectory, 'presentation-render-qc-v002.json'), draw.finalQc);
  await writeJson(
    path.join(draw.stagingDirectory, 'presentation-render-application-results-v002.json'),
    draw.applicationResults,
  );
  const stillPath = path.join(draw.stagingDirectory, 'review-still-frame-000145.png');
  await processObserver.run(runtime.ffmpeg.path, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', draw.workVideo,
    '-vf', 'select=eq(n\\,145)', '-frames:v', '1', stillPath,
  ], {allowedExitCodes: [0], observationLabel: 'review-still-extract'});
  await commitValidatedPresentationArtifactsV002({
    stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory,
    reservation: draw.reservation,
  });
  const videoPath = path.join(outputDirectory, 'presentation-rendered-v002.mp4');
  const publishedStillPath = path.join(outputDirectory, 'review-still-frame-000145.png');
  const qcPath = path.join(outputDirectory, 'presentation-render-qc-v002.json');
  const publishedReceiptPath = path.join(outputDirectory, 'candidate-receipt-v001.json');
  const observedMedia = await inspectRenderedMediaWithToolsV001(videoPath, {
    ffprobePath: runtime.ffprobe.path,
    ffmpegPath: runtime.ffmpeg.path,
    processObserver,
    observationLabelPrefix: 'published-candidate-inspection',
  });
  if (observedMedia.video?.frameCount !== expectedFrameCount
    || observedMedia.audio?.packetPayloadSha256
      !== baseSegmentInspection.audio.packetPayloadSha256) {
    throw new Error(`published media verification failed for ${row.id}`);
  }
  results.push({
    ...row,
    status: 'passed',
    fontDisplayName: font.displayName,
    order: await binding(jobPath),
    receipt: await binding(publishedReceiptPath),
    video: await binding(videoPath),
    still: await binding(publishedStillPath),
    qc: await binding(qcPath),
    media: observedMedia,
    processObservationDirectory: rel(processObservationDirectory),
  });
}

const passed = results.filter(row => row.status === 'passed');
const excluded = results.filter(row => row.status !== 'passed');
if (passed.length === 0) throw new Error('all appearance candidates were excluded');

const reviewObserver = createPresentationRendererProcessObserverV001({
  observationDirectory: path.join(workRoot, 'review-process-observations-v001'),
});
const contactSheetPath = path.join(workRoot, 'comparison-contact-sheet-v001.png');
await reviewObserver.run(runtime.imageMagick.path, [
  'montage',
  ...passed.map(row => path.join(workspaceRoot, row.still.path)),
  '-thumbnail', '640x360', '-tile', '2x', '-geometry', '640x360+16+16',
  '-background', '#0b1020', contactSheetPath,
], {allowedExitCodes: [0], observationLabel: 'contact-sheet-build'});

const escapeHtml = (value: unknown) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const cards = passed.map(row => {
  const renderDir = path.dirname(row.video.path);
  const relativeRenderDir = path.relative(rel(workRoot), renderDir);
  const values = `${row.fontDisplayName} / ${row.fontSizePx}px / ${row.fontColor}`
    + ` / 縁 ${row.borderColor} ${row.borderWidthPx}px`
    + ` / 光彩 ${row.glowColor} ${row.glowWidthPx}px・${row.glowOpacityPercent}%`;
  return `<article class="card" data-axis="${escapeHtml(row.axis)}">
    <header><span class="axis">${escapeHtml(row.axis)}</span><h2>${escapeHtml(row.label)}</h2></header>
    <img src="${escapeHtml(relativeRenderDir)}/review-still-frame-000145.png" alt="${escapeHtml(row.label)} 同一フレーム145">
    <p class="values">${escapeHtml(values)}</p>
    <p>${escapeHtml(row.reason)}</p>
    <video controls preload="metadata" src="${escapeHtml(relativeRenderDir)}/presentation-rendered-v002.mp4"></video>
    <p class="meta">QC passed / 375 frames / audio preserved<br>video SHA-256 ${escapeHtml(row.video.fileSha256)}</p>
  </article>`;
}).join('\n');
const excludedHtml = excluded.length === 0
  ? '<p>不合格で除外した候補はありません。</p>'
  : `<ul>${excluded.map(row => `<li>${escapeHtml(row.label)}: ${escapeHtml(row.reason)}</li>`).join('')}</ul>`;
const reviewHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>voice-013 字幕見た目 第1回候補比較</title>
<style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070a12;color:#edf2ff}
body{margin:0;padding:32px;background:linear-gradient(135deg,#070a12,#101a34)}
main{max-width:1500px;margin:auto}h1{font-size:32px;margin:0 0 8px}.lead{color:#b8c4df;margin:0 0 24px}
.summary{padding:18px 20px;border:1px solid #33405f;border-radius:14px;background:#10182a;margin-bottom:26px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:22px}.card{background:#111a2d;border:1px solid #33405f;border-radius:16px;padding:16px;box-shadow:0 12px 40px #0006}.card[data-axis="基準"]{border-color:#8da7e8;box-shadow:0 0 0 2px #526faa inset}header{display:flex;align-items:center;gap:12px}.axis{background:#243353;color:#bcd0ff;padding:4px 9px;border-radius:999px;font-size:12px}h2{font-size:20px;margin:0}img,video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000;border-radius:10px;margin-top:14px}.values{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#d7e3ff;font-size:13px}.meta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#8fa0c4;font-size:11px;word-break:break-all}.excluded{margin-top:28px;padding:18px 20px;border:1px solid #33405f;border-radius:14px;background:#10182a}
</style></head><body><main>
<h1>voice-013 字幕の色・大きさ・書体 — 第1回候補</h1>
<p class="lead">全候補は同じ先頭8 cue・375 frame（12.5秒）。静止画は全てframe 145です。候補0が人間合格済みの現在値です。</p>
<section class="summary"><strong>見方</strong>：まず静止画で文字の存在感を横比較し、気になる候補だけ動画でフェード・背景との分離・音声との馴染みを確認してください。</section>
<section class="grid">${cards}</section>
<section class="excluded"><h2>機械QCによる除外</h2>${excludedHtml}</section>
</main></body></html>\n`;
const reviewPath = path.join(workRoot, 'review.html');
await writeFile(reviewPath, reviewHtml, {encoding: 'utf8', flag: 'wx'});

const manifest = {
  schemaVersion: 'presentation-caption-appearance-candidate-set-v001',
  createdAt: new Date().toISOString(),
  purpose: '人間合格済みvoice-013を土台にした字幕の色・大きさ・書体の第1回比較',
  canonicalArtifactsCreated: 0,
  existingFilesModified: 0,
  apiCalls: 0,
  costUsd: 0,
  segment: {startFrame: 0, endFrameExclusive: expectedFrameCount, fps: 30, durationMs: 12500},
  baselineObserved: {
    styleProfileId: sourceInstruction.styleProfileId,
    visualStateId: baselineState.stateId,
    textStyle: baselineState.textStyle,
    position: baselineState.position,
    sourceBindings,
  },
  passedCount: passed.length,
  excludedCount: excluded.length,
  candidates: results,
  comparisonPage: await binding(reviewPath),
  contactSheet: await binding(contactSheetPath),
};
await writeJson(path.join(workRoot, 'candidate-set-manifest-v001.json'), manifest);

const allObservationRoots = [
  setupObservationDirectory,
  path.join(workRoot, 'review-process-observations-v001'),
  ...passed.map(row => path.join(workspaceRoot, row.processObservationDirectory)),
];
let processCount = 0;
for (const root of allObservationRoots) processCount += (await readdir(root)).length;
console.log(JSON.stringify({
  status: 'completed',
  workRoot: rel(workRoot),
  reviewPath: rel(reviewPath),
  manifestPath: rel(path.join(workRoot, 'candidate-set-manifest-v001.json')),
  passed: passed.map(row => ({id: row.id, videoSha256: row.video.fileSha256, qc: row.qc.fileSha256})),
  excluded: excluded.map(row => ({id: row.id, reason: row.reason})),
  processObservationCount: processCount,
}, null, 2));
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

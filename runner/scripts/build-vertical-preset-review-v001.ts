#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildLayoutVideoFilter,
  type ShortsScreenLayoutPlan,
} from '../src/screen-layout.ts';
import { renderRemotionTelopPng } from '../src/telop-remotion.ts';
import {
  buildTelopRenderModel,
  type TelopLayoutPosition,
  type TelopLayoutStyle,
  type TelopRenderModel,
} from '../src/telop/telop-render-model.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUTPUT_ROOT = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/vertical-preset-previews',
  'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate',
);
const PREVIEW_ROOT = path.join(OUTPUT_ROOT, 'preview');
const OVERLAY_ROOT = path.join(PREVIEW_ROOT, 'overlays');
const CROP_DECISION_PATH = path.join(OUTPUT_ROOT, 'legacy-crop', 'crop-decision.json');
const BASE_MEDIA_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/base-media',
  'qdczJpv8RCc-candidate-59-v001/base-media.mp4',
);
const DISPLAY_PLAN_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/caption-display-pairs',
  'qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json',
);
const LANDSCAPE_REGISTRY_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/registries/presentation',
  'normal-landscape-preset-registry-v001/preset-registry.json',
);
const FORMAL_ASSET_BASELINE_PATH =
  '/private/tmp/zev2-vertical-preview-inspection/formal-assets-before.sha256';
const ENV_PATH = '/Users/kawafmm/workspace/env/.env';
const VIDEO_PATH = path.join(PREVIEW_ROOT, 'vertical-preset-review-v001.mp4');
const REVIEW_PATH = path.join(PREVIEW_ROOT, 'review.html');
const PREFLIGHT_PATH = path.join(PREVIEW_ROOT, 'preflight.json');
const MANIFEST_PATH = path.join(PREVIEW_ROOT, 'preview-manifest.json');
const RESULT_TEMPLATE_PATH = path.join(PREVIEW_ROOT, 'result-template.md');
const TITLE_TEXT = 'マリンのADHD的？な片付け事情と無意識の脱衣';
const WIDTH_CANDIDATES = Object.freeze([16, 20, 24]);
const CANVAS = Object.freeze({ width: 1080, height: 1920, fps: 30 });
const AUDIO_SAMPLE_RATE = 48_000;
const AUDIO_SAMPLES_PER_FRAME = AUDIO_SAMPLE_RATE / CANVAS.fps;
const MAX_LINES = 2;
const EXPECTED_BASE_MEDIA_SHA256 =
  'faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967';
const EXPECTED_FONT_SHA256 =
  '4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb';

type SafeArea = {
  id: 'A' | 'B';
  top: number;
  right: number;
  bottom: number;
  left: number;
  origin: string;
};

type TextInspection = {
  text: string;
  maxCharsPerLine: number;
  fontSizePx: number;
  lineCount: number;
  lineRects: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>;
  outsideSafeArea: boolean;
  positiveLineIntersection: boolean;
  model: TelopRenderModel;
};

type Cue = {
  cueId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  lines: Array<{ text: string; logicalWidth: number }>;
};

type Scene = {
  sceneId: string;
  label: string;
  purpose: string;
  sourceCueId: string;
  sourceStartFrame: number;
  sourceEndFrameExclusive: number;
  overlayPath: string;
  questionId: string;
  expectedLayoutStatus: string;
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

const run = (
  command: string,
  args: string[],
  options: { cwd?: string; allowedExitCodes?: number[] } = {},
): Promise<{ code: number; stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
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
    if ((options.allowedExitCodes ?? [0]).includes(result.code)) {
      resolve(result);
      return;
    }
    reject(new Error(`${command} exited ${result.code}\n${result.stderr}`));
  });
});

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseEnvValue = (raw: string, key: string): string | undefined => {
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0 || line.slice(0, separator).trim() !== key) {
      continue;
    }
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
};

const flattenFiles = async (root: string): Promise<string[]> => {
  const result: string[] = [];
  const visit = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        result.push(entryPath);
      }
    }
  };
  await visit(root);
  return result.sort();
};

const styleFromRegistry = (registry: any): {
  fontPath: string;
  baseStyle: TelopLayoutStyle;
  captionPosition: TelopLayoutPosition;
} => {
  const preset = registry.presets.find(
    (item: any) => item.presetId === 'normal-landscape-readable-pop-v001',
  );
  assert(preset, '横型の人間認定済みpresetがありません');
  const state = preset.visualStates.find((item: any) => item.stateId === 'caption-core-v001');
  assert(state, '横型の基本字幕stateがありません');
  const font = registry.fontAssets.find(
    (item: any) => item.fontAssetId === state.textStyle.fontAssetId,
  );
  assert(font, '基本字幕のfont assetがありません');
  return {
    fontPath: path.join(WORKSPACE_ROOT, font.path),
    baseStyle: {
      fontFamily: font.fileName,
      fontSize: state.textStyle.fontSizePx,
      fontColor: state.textStyle.fontColor,
      borderColor: state.textStyle.borderColor,
      borderWidth: state.textStyle.borderWidthPx,
      lineSpacing: state.textStyle.lineSpacingPercent,
      glowColor: state.textStyle.glowColor,
      glowColorMode: state.textStyle.glowColorMode,
      glowWidth: state.textStyle.glowWidthPx,
      glowOpacity: state.textStyle.glowOpacityPercent,
    },
    captionPosition: {
      preset: state.position.preset,
      alignment: state.position.alignment,
      offsetX: state.position.offsetXPercent,
      offsetY: state.position.offsetYPercent,
    },
  };
};

const styleAtFontSize = (
  baseStyle: TelopLayoutStyle,
  fontSizePx: number,
): TelopLayoutStyle => {
  const baseFontSize = Math.round(baseStyle.fontSize);
  assert(baseFontSize > 0, '基準文字サイズが正ではありません');
  return {
    ...baseStyle,
    fontSize: fontSizePx,
    borderWidth: Math.round((baseStyle.borderWidth ?? 0) * fontSizePx / baseFontSize),
    glowWidth: Math.round((baseStyle.glowWidth ?? 0) * fontSizePx / baseFontSize),
  };
};

const inspectText = ({
  text,
  fontSizePx,
  maxCharsPerLine,
  style,
  position,
  safeArea,
}: {
  text: string;
  fontSizePx: number;
  maxCharsPerLine: number;
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  safeArea: SafeArea;
}): TextInspection => {
  const model = buildTelopRenderModel({
    text,
    style: styleAtFontSize(style, fontSizePx),
    position,
    maxCharsPerLine,
    singleLine: false,
    width: CANVAS.width,
    height: CANVAS.height,
    glowSeedHint: `vertical-preview-${fontSizePx}-${maxCharsPerLine}-${position.preset}`,
  });
  const strokeExtent = Math.max(
    model.text.borderStrokeWidth,
    model.text.glowStrokeWidth,
  ) / 2;
  const lineRects = model.text.lines.map((line) => ({
    left: model.wrapper.left + line.x - strokeExtent,
    top: model.wrapper.top + line.y - strokeExtent,
    right: model.wrapper.left + line.x + line.width + strokeExtent,
    bottom: model.wrapper.top + line.y + model.text.fontSize + strokeExtent,
  }));
  const outsideSafeArea = lineRects.some((rect) => (
    rect.left < safeArea.left
    || rect.top < safeArea.top
    || rect.right > CANVAS.width - safeArea.right
    || rect.bottom > CANVAS.height - safeArea.bottom
  ));
  let positiveLineIntersection = false;
  for (let leftIndex = 0; leftIndex < lineRects.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < lineRects.length; rightIndex += 1) {
      const left = lineRects[leftIndex];
      const right = lineRects[rightIndex];
      if (
        Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0
        && Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0
      ) {
        positiveLineIntersection = true;
      }
    }
  }
  return {
    text,
    maxCharsPerLine,
    fontSizePx,
    lineCount: model.text.lines.length,
    lineRects,
    outsideSafeArea,
    positiveLineIntersection,
    model,
  };
};

const deriveCanonicalSafeArea = (
  style: TelopLayoutStyle,
): SafeArea => {
  const topModel = buildTelopRenderModel({
    text: '安全',
    style,
    position: { preset: 'top-center', alignment: 'center' },
    maxCharsPerLine: 24,
    width: CANVAS.width,
    height: CANVAS.height,
    glowSeedHint: 'vertical-preview-safe-top',
  });
  const rightModel = buildTelopRenderModel({
    text: '安全',
    style,
    position: { preset: 'top-right', alignment: 'center' },
    maxCharsPerLine: 24,
    width: CANVAS.width,
    height: CANVAS.height,
    glowSeedHint: 'vertical-preview-safe-right',
  });
  const vertical = Math.round(topModel.wrapper.top);
  const horizontal = Math.round(
    CANVAS.width - rightModel.wrapper.displayWidth - rightModel.wrapper.left,
  );
  return {
    id: 'B',
    top: vertical,
    right: horizontal,
    bottom: vertical,
    left: horizontal,
    origin: 'buildTelopRenderModelが実描画時に使う既存の画面余白を出力から再導出',
  };
};

const deriveLargestSafeFontSize = ({
  text,
  maxCharsPerLine,
  style,
  position,
  safeArea,
}: {
  text: string;
  maxCharsPerLine: number;
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  safeArea: SafeArea;
}): { fontSizePx: number; inspection: TextInspection } => {
  const startingSize = Math.round(style.fontSize ?? 96);
  for (let fontSizePx = startingSize; fontSizePx >= 12; fontSizePx -= 1) {
    const inspection = inspectText({
      text,
      fontSizePx,
      maxCharsPerLine,
      style,
      position,
      safeArea,
    });
    if (
      inspection.lineCount <= MAX_LINES
      && !inspection.outsideSafeArea
      && !inspection.positiveLineIntersection
    ) {
      return { fontSizePx, inspection };
    }
  }
  throw new Error(`安全領域${safeArea.id}へ収まる文字サイズを導出できません`);
};

const renderTextOverlay = async ({
  outputPath,
  text,
  fontSizePx,
  maxCharsPerLine,
  style,
  position,
  seed,
}: {
  outputPath: string;
  text: string;
  fontSizePx: number;
  maxCharsPerLine: number;
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  seed: string;
}) => {
  await renderRemotionTelopPng({
    text,
    style: styleAtFontSize(style, fontSizePx),
    position,
    maxCharsPerLine,
    width: CANVAS.width,
    height: CANVAS.height,
    glowSeedHint: seed,
  }, outputPath);
};

const combinePngs = async (paths: string[], outputPath: string) => {
  assert(paths.length >= 1, '合成するPNGがありません');
  let currentPath = paths[0];
  for (const [index, nextPath] of paths.slice(1).entries()) {
    const intermediate = index === paths.length - 2
      ? outputPath
      : path.join(OVERLAY_ROOT, `compose-${path.basename(outputPath, '.png')}-${index}.png`);
    await run('magick', [
      currentPath,
      nextPath,
      '-compose',
      'over',
      '-composite',
      intermediate,
    ]);
    currentPath = intermediate;
  }
  if (paths.length === 1 && currentPath !== outputPath) {
    await run('magick', [currentPath, outputPath]);
  }
};

const makeGuide = async (safeArea: SafeArea, color: string, outputPath: string) => {
  const width = CANVAS.width - safeArea.left - safeArea.right;
  const height = CANVAS.height - safeArea.top - safeArea.bottom;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.width}" height="${CANVAS.height}">`,
    `<rect x="${safeArea.left}" y="${safeArea.top}" width="${width}" height="${height}"`,
    ` fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="18 12"/>`,
    '</svg>',
  ].join('');
  const svgPath = outputPath.replace(/\.png$/, '.svg');
  await writeFile(svgPath, svg, 'utf8');
  await run('magick', ['-background', 'none', svgPath, outputPath]);
};

const buildReviewHtml = ({
  scenes,
  safeA,
  safeB,
  fontA,
  fontB,
}: {
  scenes: Scene[];
  safeA: SafeArea;
  safeB: SafeArea;
  fontA: number;
  fontB: number;
}): string => {
  const chapterButtons = scenes.map((scene, index) => {
    const startFrame = scenes
      .slice(0, index)
      .reduce((sum, item) => sum + item.sourceEndFrameExclusive - item.sourceStartFrame, 0);
    return `<button type="button" class="chapter" data-time="${(startFrame / CANVAS.fps).toFixed(6)}">`
      + `${index + 1}. ${scene.label}</button>`;
  }).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>縦型プリセット候補 5判断</title>
  <style>
    :root { color-scheme: dark; --bg:#0a0f1e; --card:#141b2f; --line:#2a3657; --accent:#65d6ff; }
    * { box-sizing: border-box; }
    body { margin:0; background:linear-gradient(135deg,#080c17,#121a31); color:#f7f8fc;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif; }
    main { max-width:1260px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:clamp(24px,4vw,42px); }
    .lede { margin:0 0 20px; color:#c9d3ec; line-height:1.65; }
    .status { display:inline-block; padding:7px 12px; border-radius:999px; background:#183d32; color:#9ff3c7; font-weight:700; }
    .grid { display:grid; grid-template-columns:minmax(300px,500px) 1fr; gap:22px; align-items:start; margin-top:20px; }
    .viewer { position:sticky; top:14px; }
    video { width:min(100%,430px); max-height:78vh; display:block; margin:0 auto; background:#000; border-radius:18px;
      box-shadow:0 18px 60px #000a; }
    .chapters { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:12px; }
    button { cursor:pointer; }
    .chapter { border:1px solid var(--line); background:#111a2e; color:#eef3ff; border-radius:10px; padding:10px;
      text-align:left; }
    .chapter:hover,.chapter.active { border-color:var(--accent); background:#18304a; }
    .card { background:color-mix(in srgb,var(--card) 94%,transparent); border:1px solid var(--line); border-radius:16px;
      padding:18px; margin-bottom:14px; }
    .card h2 { margin:0 0 7px; font-size:20px; }
    .hint { color:#b9c5df; font-size:14px; line-height:1.55; margin:0 0 13px; }
    label.option { display:block; padding:10px 12px; border:1px solid #32405f; border-radius:10px; margin:8px 0;
      background:#0e1629; }
    label.option:has(input:checked) { border-color:var(--accent); background:#12304a; }
    input { margin-right:8px; }
    .note { padding:12px; border-left:4px solid #f4c95d; background:#322b19; color:#ffe9a3; border-radius:8px; line-height:1.55; }
    .summary { white-space:pre-wrap; background:#090e1b; border:1px solid var(--line); border-radius:12px; padding:14px;
      min-height:130px; color:#dbe7ff; }
    .copy { border:0; border-radius:10px; padding:11px 16px; background:var(--accent); color:#04111b; font-weight:800; }
    a { color:#8ce4ff; }
    @media (max-width:850px) { .grid { grid-template-columns:1fr; } .viewer { position:static; } }
  </style>
</head>
<body>
<main>
  <span class="status">認定前preview・正式使用なし</span>
  <h1>縦型プリセット候補を5つだけ判断</h1>
  <p class="lede">動画の章ボタンで該当箇所へ移動できます。時間計測は不要です。最後に結果をコピーしてください。</p>
  <div class="grid">
    <section class="viewer">
      <video id="video" controls playsinline preload="metadata" src="vertical-preset-review-v001.mp4"></video>
      <div class="chapters">${chapterButtons}</div>
      <p class="note">安全領域A/Bは文字の位置を変えていません。同じ絵に、QCで守る境界線だけを重ねた比較です。</p>
      <p><a href="preflight.json">機械検査結果を見る</a> / <a href="../legacy-crop/candidate-preview-screen_speaker_body.jpg">旧LLM crop静止画</a></p>
    </section>
    <section>
      <form id="form">
        <article class="card">
          <h2>Q1 画面構成</h2>
          <p class="hint">旧crop方式が選んだ「上=元画面、下=話者全体」です。動きの中で顔や重要情報が切れないかを見ます。</p>
          <label class="option"><input required type="radio" name="q1_crop" value="approve-legacy-llm-crop">この上下構成でよい</label>
          <label class="option"><input type="radio" name="q1_crop" value="request-human-crop">人間指定cropへ差し戻す</label>
        </article>
        <article class="card">
          <h2>Q2 文字サイズ・造形</h2>
          <p class="hint">96pxは横型値（縁8/glow12）。${fontB}pxはB内最大（縁${Math.round(8 * fontB / 96)}/glow${Math.round(12 * fontB / 96)}）、${fontA}pxはA内最大（縁${Math.round(8 * fontA / 96)}/glow${Math.round(12 * fontA / 96)}）です。</p>
          <label class="option"><input required type="radio" name="q2_typography" value="font-96">96pxがよい</label>
          <label class="option"><input type="radio" name="q2_typography" value="font-${fontB}">${fontB}pxがよい</label>
          <label class="option"><input type="radio" name="q2_typography" value="font-${fontA}">${fontA}pxがよい</label>
          <label class="option"><input type="radio" name="q2_typography" value="revise">どれも要修正</label>
        </article>
        <article class="card">
          <h2>Q3 安全領域</h2>
          <p class="hint">A=${safeA.left}px左右/${safeA.top}px上下、B=${safeB.left}px左右/${safeB.top}px上下。ガイドの内側をQC合格範囲にします。</p>
          <label class="option"><input required type="radio" name="q3_safe_area" value="safe-A">A（広めの余白）</label>
          <label class="option"><input type="radio" name="q3_safe_area" value="safe-B">B（実描画の既定余白）</label>
          <label class="option"><input type="radio" name="q3_safe_area" value="revise">どちらも要修正</label>
        </article>
        <article class="card">
          <h2>Q4 行幅の事故防止上限</h2>
          <p class="hint">16・20・24の実字幕例です。数値は品質目標ではなく、長すぎる1行を止める保険です。</p>
          <label class="option"><input required type="radio" name="q4_width" value="16">16</label>
          <label class="option"><input type="radio" name="q4_width" value="20">20</label>
          <label class="option"><input type="radio" name="q4_width" value="24">24</label>
          <label class="option"><input type="radio" name="q4_width" value="revise">全部要修正</label>
        </article>
        <article class="card">
          <h2>Q5 タイトル上・字幕下の重ね方</h2>
          <p class="hint">最後の章で、タイトルと字幕を同時に重ねた全体像を見ます。</p>
          <label class="option"><input required type="radio" name="q5_stack" value="approve">この重ね方でよい</label>
          <label class="option"><input type="radio" name="q5_stack" value="revise">重ね方を直す</label>
        </article>
        <article class="card">
          <h2>結果</h2>
          <p class="hint"><span id="progress">0/5</span> 回答済み。5件揃うとコピーできます。</p>
          <button type="button" class="copy" id="copy" disabled>結果をコピー</button>
          <pre class="summary" id="summary">未回答です</pre>
        </article>
      </form>
    </section>
  </div>
</main>
<script>
  const video = document.getElementById('video');
  const chapters = [...document.querySelectorAll('.chapter')];
  const form = document.getElementById('form');
  const summary = document.getElementById('summary');
  const progress = document.getElementById('progress');
  const copy = document.getElementById('copy');
  const names = ['q1_crop','q2_typography','q3_safe_area','q4_width','q5_stack'];
  chapters.forEach((button) => button.addEventListener('click', () => {
    video.currentTime = Number(button.dataset.time);
    video.play();
  }));
  video.addEventListener('timeupdate', () => {
    let active = chapters[0];
    for (const button of chapters) if (Number(button.dataset.time) <= video.currentTime) active = button;
    chapters.forEach((button) => button.classList.toggle('active', button === active));
  });
  function collect() {
    const answers = Object.fromEntries(names.map((name) => [
      name,
      form.querySelector('input[name="' + name + '"]:checked')?.value ?? null,
    ]));
    const count = Object.values(answers).filter(Boolean).length;
    progress.textContent = count + '/5';
    copy.disabled = count !== 5;
    const result = {
      schemaVersion: 'vertical-preset-review-human-result-v001',
      reviewId: 'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate',
      answers,
      timeMeasurement: 'not_measured',
      formalRegistryPromotion: false,
    };
    summary.textContent = count === 0 ? '未回答です' : JSON.stringify(result, null, 2);
    return result;
  }
  form.addEventListener('change', collect);
  copy.addEventListener('click', async () => {
    const result = collect();
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    copy.textContent = 'コピーしました';
  });
  collect();
</script>
</body>
</html>`;
};

const main = async () => {
  await mkdir(OVERLAY_ROOT, { recursive: true });
  const [cropDecision, displayPlan, registry, baseMedia] = await Promise.all([
    readFile(CROP_DECISION_PATH, 'utf8').then(JSON.parse),
    readFile(DISPLAY_PLAN_PATH, 'utf8').then(JSON.parse),
    readFile(LANDSCAPE_REGISTRY_PATH, 'utf8').then(JSON.parse),
    readFile(BASE_MEDIA_PATH),
  ]);
  assert(sha256(baseMedia) === EXPECTED_BASE_MEDIA_SHA256, '基礎映像SHAが固定値と一致しません');
  assert(cropDecision.status === 'passed', '旧crop決定が合格していません');
  assert(cropDecision.selectedPlan?.selectedCandidateId === 'screen_speaker_body',
    '旧cropの選択候補がscreen_speaker_bodyではありません');
  const selectedPlan = cropDecision.selectedPlan as ShortsScreenLayoutPlan;
  const { fontPath, baseStyle, captionPosition } = styleFromRegistry(registry);
  assert(await fileSha256(fontPath) === EXPECTED_FONT_SHA256, 'font SHAが固定値と一致しません');
  const titlePosition: TelopLayoutPosition = {
    preset: 'top-center',
    alignment: 'center',
    offsetX: 0,
    offsetY: 0,
  };
  const safeA: SafeArea = {
    id: 'A',
    ...registry.canvas.safeAreaPx,
    origin: '人間認定済み横型registryの絶対px余白を縦型候補へそのまま移した比較案',
  };
  const safeB = deriveCanonicalSafeArea(baseStyle);
  assert(
    safeA.left === 80 && safeA.right === 80 && safeA.top === 40 && safeA.bottom === 40,
    '安全領域Aが既存registry値と一致しません',
  );
  assert(
    safeB.left === 43 && safeB.right === 43 && safeB.top === 38 && safeB.bottom === 38,
    '安全領域Bが既存描画余白の出力値と一致しません',
  );

  const cues: Cue[] = displayPlan.containers.flatMap(
    (container: any) => container.cues,
  );
  const cueById = new Map(cues.map((cue) => [cue.cueId, cue]));
  const cue1 = cueById.get('caption-cue-000001');
  const cue6 = cueById.get('caption-cue-000006');
  const cue7 = cueById.get('caption-cue-000007');
  assert(cue1 && cue6 && cue7, 'previewに使う既存cueがありません');
  const originSourceMs = Math.min(...cues.map((cue) => cue.sourceStartMs));
  const cueFrames = (cue: Cue) => ({
    sourceStartFrame: Math.round((cue.sourceStartMs - originSourceMs) * CANVAS.fps / 1000),
    sourceEndFrameExclusive: Math.round((cue.sourceEndMs - originSourceMs) * CANVAS.fps / 1000),
  });
  const cueText = (cue: Cue): string => cue.lines.map((line) => line.text).join('\n');
  const typographyText = cueText(cue1);
  const fontAResult = deriveLargestSafeFontSize({
    text: typographyText,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: captionPosition,
    safeArea: safeA,
  });
  const fontBResult = deriveLargestSafeFontSize({
    text: typographyText,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: captionPosition,
    safeArea: safeB,
  });
  const fontA = fontAResult.fontSizePx;
  const fontB = fontBResult.fontSizePx;
  assert(
    fontA === 74 && fontB === 79,
    '比例縁取りを含む正本描画モデルの最大文字サイズ74/79と一致しません',
  );

  const overlayPaths = {
    font96: path.join(OVERLAY_ROOT, 'caption-font-96-width-24.png'),
    fontB: path.join(OVERLAY_ROOT, `caption-font-${fontB}-width-24.png`),
    fontA: path.join(OVERLAY_ROOT, `caption-font-${fontA}-width-24.png`),
    width16: path.join(OVERLAY_ROOT, `caption-font-${fontA}-width-16.png`),
    width20: path.join(OVERLAY_ROOT, `caption-font-${fontA}-width-20.png`),
    title: path.join(OVERLAY_ROOT, `title-font-${fontA}-width-24.png`),
    titleCaption: path.join(OVERLAY_ROOT, `title-caption-font-${fontA}-width-24.png`),
    guideA: path.join(OVERLAY_ROOT, 'guide-safe-A.png'),
    guideB: path.join(OVERLAY_ROOT, 'guide-safe-B.png'),
    safeA: path.join(OVERLAY_ROOT, 'title-caption-safe-A.png'),
    safeB: path.join(OVERLAY_ROOT, 'title-caption-safe-B.png'),
  };
  await renderTextOverlay({
    outputPath: overlayPaths.font96,
    text: typographyText,
    fontSizePx: 96,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: captionPosition,
    seed: 'vertical-preview-font-96',
  });
  await renderTextOverlay({
    outputPath: overlayPaths.fontB,
    text: typographyText,
    fontSizePx: fontB,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: captionPosition,
    seed: `vertical-preview-font-${fontB}`,
  });
  await renderTextOverlay({
    outputPath: overlayPaths.fontA,
    text: typographyText,
    fontSizePx: fontA,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: captionPosition,
    seed: `vertical-preview-font-${fontA}`,
  });
  await renderTextOverlay({
    outputPath: overlayPaths.width16,
    text: cueText(cue6),
    fontSizePx: fontA,
    maxCharsPerLine: 16,
    style: baseStyle,
    position: captionPosition,
    seed: 'vertical-preview-width-16',
  });
  await renderTextOverlay({
    outputPath: overlayPaths.width20,
    text: cueText(cue7),
    fontSizePx: fontA,
    maxCharsPerLine: 20,
    style: baseStyle,
    position: captionPosition,
    seed: 'vertical-preview-width-20',
  });
  await renderTextOverlay({
    outputPath: overlayPaths.title,
    text: TITLE_TEXT,
    fontSizePx: fontA,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: titlePosition,
    seed: 'vertical-preview-title',
  });
  await combinePngs([overlayPaths.title, overlayPaths.fontA], overlayPaths.titleCaption);
  await Promise.all([
    makeGuide(safeA, '#FFD84D', overlayPaths.guideA),
    makeGuide(safeB, '#5DE2FF', overlayPaths.guideB),
  ]);
  await combinePngs([overlayPaths.titleCaption, overlayPaths.guideA], overlayPaths.safeA);
  await combinePngs([overlayPaths.titleCaption, overlayPaths.guideB], overlayPaths.safeB);

  const sceneInput = [
    {
      sceneId: 'typography-96',
      label: '文字造形 96px（横型値）',
      purpose: '横型で認定済みの文字サイズを縦型へそのまま載せた比較',
      cue: cue1,
      overlayPath: overlayPaths.font96,
      questionId: 'Q2',
      expectedLayoutStatus: 'outside-safe-area-comparison-candidate',
    },
    {
      sceneId: `typography-${fontB}`,
      label: `文字造形 ${fontB}px（安全領域B最大）`,
      purpose: '既存描画余白Bに収まる最大整数文字サイズ',
      cue: cue1,
      overlayPath: overlayPaths.fontB,
      questionId: 'Q2',
      expectedLayoutStatus: 'passes-safe-B',
    },
    {
      sceneId: `typography-${fontA}`,
      label: `文字造形 ${fontA}px（安全領域A最大）`,
      purpose: '広めの安全領域Aに収まる最大整数文字サイズ',
      cue: cue1,
      overlayPath: overlayPaths.fontA,
      questionId: 'Q2',
      expectedLayoutStatus: 'passes-safe-A-and-B',
    },
    {
      sceneId: 'line-width-16',
      label: '行幅上限16の実字幕',
      purpose: '既存cueの論理幅14/14を上限16で表示',
      cue: cue6,
      overlayPath: overlayPaths.width16,
      questionId: 'Q4',
      expectedLayoutStatus: 'passes-safe-A-and-B',
    },
    {
      sceneId: 'line-width-20',
      label: '行幅上限20の実字幕',
      purpose: '既存cueの論理幅19/12を上限20で表示',
      cue: cue7,
      overlayPath: overlayPaths.width20,
      questionId: 'Q4',
      expectedLayoutStatus: 'passes-safe-A-and-B',
    },
    {
      sceneId: 'line-width-24',
      label: '行幅上限24の実字幕',
      purpose: '既存cueの論理幅16/24を上限24で表示',
      cue: cue1,
      overlayPath: overlayPaths.fontA,
      questionId: 'Q4',
      expectedLayoutStatus: 'passes-safe-A-and-B',
    },
    {
      sceneId: 'safe-area-A',
      label: '安全領域Aガイド',
      purpose: '同一描画へ80px左右/40px上下のQC境界だけを重ねる',
      cue: cue1,
      overlayPath: overlayPaths.safeA,
      questionId: 'Q3',
      expectedLayoutStatus: 'same-render-as-safe-B-except-guide',
    },
    {
      sceneId: 'safe-area-B',
      label: '安全領域Bガイド',
      purpose: '同一描画へ43px左右/38px上下のQC境界だけを重ねる',
      cue: cue1,
      overlayPath: overlayPaths.safeB,
      questionId: 'Q3',
      expectedLayoutStatus: 'same-render-as-safe-A-except-guide',
    },
    {
      sceneId: 'title-caption-stack',
      label: 'タイトル上・字幕下の全体像',
      purpose: 'preview-onlyのタイトルと字幕を同時に重ねる',
      cue: cue1,
      overlayPath: overlayPaths.titleCaption,
      questionId: 'Q1/Q5',
      expectedLayoutStatus: 'passes-safe-A-and-B-with-no-positive-intersection',
    },
  ];
  const scenes: Scene[] = sceneInput.map((item) => ({
    sceneId: item.sceneId,
    label: item.label,
    purpose: item.purpose,
    sourceCueId: item.cue.cueId,
    ...cueFrames(item.cue),
    overlayPath: item.overlayPath,
    questionId: item.questionId,
    expectedLayoutStatus: item.expectedLayoutStatus,
  }));
  for (const scene of scenes) {
    assert(scene.sourceStartFrame >= 0, `${scene.sceneId}: source start frameが負です`);
    assert(scene.sourceEndFrameExclusive > scene.sourceStartFrame,
      `${scene.sceneId}: source frame範囲が空です`);
  }

  const videoSplitLabels = scenes.map((_, index) => `[vsource${index}]`).join('');
  const audioSplitLabels = scenes.map((_, index) => `[asource${index}]`).join('');
  const filterParts = [
    `[0:v]split=${scenes.length}${videoSplitLabels}`,
    `[0:a]asplit=${scenes.length}${audioSplitLabels}`,
  ];
  const concatLabels: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const frameCount = scene.sourceEndFrameExclusive - scene.sourceStartFrame;
    filterParts.push(
      `[vsource${index}]trim=start_frame=${scene.sourceStartFrame}:end_frame=${scene.sourceEndFrameExclusive},`
      + `setpts=PTS-STARTPTS[vtrim${index}]`,
    );
    filterParts.push(buildLayoutVideoFilter({
      inputLabel: `[vtrim${index}]`,
      outputLabel: `vcrop${index}`,
      sourceWidth: 1920,
      sourceHeight: 1080,
      durationSeconds: frameCount / CANVAS.fps,
      screenLayout: selectedPlan,
    }));
    filterParts.push(
      `[${index + 1}:v]format=rgba[overlay${index}]`,
      `[vcrop${index}][overlay${index}]overlay=0:0:shortest=1:format=auto,`
      + `fps=${CANVAS.fps},tpad=stop_mode=clone:stop=1,`
      + `trim=start_frame=0:end_frame=${frameCount},setpts=N/(${CANVAS.fps}*TB)[vscene${index}]`,
      `[asource${index}]atrim=start_sample=${scene.sourceStartFrame * AUDIO_SAMPLES_PER_FRAME}:`
      + `end_sample=${scene.sourceEndFrameExclusive * AUDIO_SAMPLES_PER_FRAME},`
      + `asetpts=PTS-STARTPTS[ascene${index}]`,
    );
    concatLabels.push(`[vscene${index}][ascene${index}]`);
  }
  filterParts.push(
    `${concatLabels.join('')}concat=n=${scenes.length}:v=1:a=1[vout][aout]`,
  );
  const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-y', '-i', BASE_MEDIA_PATH];
  for (const scene of scenes) {
    ffmpegArgs.push('-loop', '1', '-framerate', String(CANVAS.fps), '-i', scene.overlayPath);
  }
  ffmpegArgs.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    VIDEO_PATH,
  );
  await run('ffmpeg', ffmpegArgs);

  const reviewHtml = buildReviewHtml({ scenes, safeA, safeB, fontA, fontB });
  await writeFile(REVIEW_PATH, reviewHtml, 'utf8');
  await writeFile(
    RESULT_TEMPLATE_PATH,
    [
      '# 縦型preset候補 人間確認結果',
      '',
      '- 確認者: kawafmm',
      '- 時間計測: なし',
      '- Q1 画面構成:',
      '- Q2 文字サイズ・造形:',
      '- Q3 安全領域:',
      '- Q4 行幅上限:',
      '- Q5 タイトル上・字幕下:',
      '- 正式台帳への昇格: まだ行わない',
      '',
    ].join('\n'),
    'utf8',
  );

  const typographyInspections = {
    font96SafeA: inspectText({
      text: typographyText,
      fontSizePx: 96,
      maxCharsPerLine: 24,
      style: baseStyle,
      position: captionPosition,
      safeArea: safeA,
    }),
    font96SafeB: inspectText({
      text: typographyText,
      fontSizePx: 96,
      maxCharsPerLine: 24,
      style: baseStyle,
      position: captionPosition,
      safeArea: safeB,
    }),
    fontBSafeB: fontBResult.inspection,
    fontASafeA: fontAResult.inspection,
  };
  assert(typographyInspections.font96SafeA.outsideSafeArea,
    '96px比較候補が安全領域A外になる事前観測と一致しません');
  assert(typographyInspections.font96SafeB.outsideSafeArea,
    '96px比較候補が安全領域B外になる事前観測と一致しません');
  assert(!typographyInspections.fontBSafeB.outsideSafeArea,
    `${fontB}px候補が安全領域Bに収まりません`);
  assert(!typographyInspections.fontASafeA.outsideSafeArea,
    `${fontA}px候補が安全領域Aに収まりません`);

  const titleInspectionA = inspectText({
    text: TITLE_TEXT,
    fontSizePx: fontA,
    maxCharsPerLine: 24,
    style: baseStyle,
    position: titlePosition,
    safeArea: safeA,
  });
  const captionInspectionA = fontAResult.inspection;
  assert(titleInspectionA.lineCount <= MAX_LINES, 'タイトルが2行を超えます');
  assert(!titleInspectionA.outsideSafeArea, 'タイトルが安全領域A外です');
  const positiveTitleCaptionIntersection = titleInspectionA.lineRects.some((titleRect) => (
    captionInspectionA.lineRects.some((captionRect) => (
      Math.min(titleRect.right, captionRect.right) - Math.max(titleRect.left, captionRect.left) > 0
      && Math.min(titleRect.bottom, captionRect.bottom) - Math.max(titleRect.top, captionRect.top) > 0
    ))
  ));
  assert(!positiveTitleCaptionIntersection, 'タイトルと字幕が正の面積で重なります');

  for (const [maxCharsPerLine, cue] of [[16, cue6], [20, cue7], [24, cue1]] as const) {
    const inspection = inspectText({
      text: cueText(cue),
      fontSizePx: fontA,
      maxCharsPerLine,
      style: baseStyle,
      position: captionPosition,
      safeArea: safeA,
    });
    assert(inspection.lineCount <= MAX_LINES, `行幅${maxCharsPerLine}が2行を超えます`);
    assert(!inspection.outsideSafeArea, `行幅${maxCharsPerLine}が安全領域A外です`);
    assert(!inspection.positiveLineIntersection, `行幅${maxCharsPerLine}の行が交差します`);
    assert(cue.lines.every((line) => line.logicalWidth <= maxCharsPerLine),
      `行幅${maxCharsPerLine}の既存logicalWidthが上限を超えます`);
  }

  const expectedFrameCount = scenes.reduce(
    (sum, scene) => sum + scene.sourceEndFrameExclusive - scene.sourceStartFrame,
    0,
  );
  const probeResult = await run('ffprobe', [
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels,duration',
    '-show_entries',
    'format=duration,size',
    '-of',
    'json',
    VIDEO_PATH,
  ]);
  const probe = JSON.parse(probeResult.stdout);
  const videoStream = probe.streams.find((stream: any) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream: any) => stream.codec_type === 'audio');
  assert(videoStream?.width === CANVAS.width && videoStream?.height === CANVAS.height,
    '完成MP4が1080x1920ではありません');
  assert(videoStream?.r_frame_rate === '30/1', '完成MP4が30fpsではありません');
  assert(Number(videoStream?.nb_read_frames) === expectedFrameCount,
    `完成MP4のframe数が${expectedFrameCount}ではありません`);
  assert(audioStream?.sample_rate === String(AUDIO_SAMPLE_RATE), '完成MP4の音声が48kHzではありません');
  assert(Number(audioStream?.channels) >= 1, '完成MP4に音声channelがありません');
  const expectedDurationSeconds = expectedFrameCount / CANVAS.fps;
  assert(Math.abs(Number(probe.format.duration) - expectedDurationSeconds) <= 1 / CANVAS.fps,
    '完成MP4の尺がframe正本と1frame超ずれています');
  const volumeResult = await run('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    VIDEO_PATH,
    '-map',
    '0:a:0',
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  const meanVolumeMatch = volumeResult.stderr.match(/mean_volume:\s*(-?[0-9.]+)\s*dB/);
  assert(meanVolumeMatch, '完成MP4の平均音量を確認できません');

  const alphaMeans: Record<string, number> = {};
  for (const overlayPath of Object.values(overlayPaths)) {
    const alphaResult = await run('magick', [
      overlayPath,
      '-alpha',
      'extract',
      '-format',
      '%[fx:mean]',
      'info:',
    ]);
    const alphaMean = Number(alphaResult.stdout.trim());
    assert(Number.isFinite(alphaMean) && alphaMean > 0, `${path.basename(overlayPath)}が空です`);
    alphaMeans[path.basename(overlayPath)] = alphaMean;
  }
  assert(alphaMeans[path.basename(overlayPaths.guideA)] < 0.05,
    '安全領域Aガイドの透明背景が保たれていません');
  assert(alphaMeans[path.basename(overlayPaths.guideB)] < 0.05,
    '安全領域Bガイドの透明背景が保たれていません');
  assert(alphaMeans[path.basename(overlayPaths.safeA)] < 0.25,
    '安全領域A比較overlayの透明背景が保たれていません');
  assert(alphaMeans[path.basename(overlayPaths.safeB)] < 0.25,
    '安全領域B比較overlayの透明背景が保たれていません');

  const formalBaselineRaw = await readFile(FORMAL_ASSET_BASELINE_PATH, 'utf8');
  const formalBaselineRows = formalBaselineRaw.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert(match, `正式成果物baseline行を読めません: ${line}`);
    return { expected: match[1], relativePath: match[2] };
  });
  for (const row of formalBaselineRows) {
    assert(
      await fileSha256(path.join(WORKSPACE_ROOT, row.relativePath)) === row.expected,
      `正式成果物が変化しました: ${row.relativePath}`,
    );
  }

  const envRaw = await readFile(ENV_PATH, 'utf8');
  const apiKey = parseEnvValue(envRaw, 'GEMINI_API_KEY');
  assert(apiKey, 'secret非混入検査に使うkeyを外部.envから読めません');
  let secretExactOccurrenceCount = 0;
  for (const artifactPath of await flattenFiles(OUTPUT_ROOT)) {
    const bytes = await readFile(artifactPath);
    let offset = 0;
    while (true) {
      const found = bytes.indexOf(apiKey, offset);
      if (found < 0) {
        break;
      }
      secretExactOccurrenceCount += 1;
      offset = found + apiKey.length;
    }
  }
  assert(secretExactOccurrenceCount === 0, 'preview成果物へAPI keyが混入しています');

  const cropResponseHashes = {
    editPlanRaw: await fileSha256(path.join(OUTPUT_ROOT, 'legacy-crop', 'gemini-edit-plan-response.raw.json')),
    selectionRaw: await fileSha256(path.join(OUTPUT_ROOT, 'legacy-crop', 'gemini-layout-candidate-response.raw.json')),
    cropDecision: await fileSha256(CROP_DECISION_PATH),
  };
  const preflight = {
    schemaVersion: 'vertical-preset-review-preflight-v001',
    status: 'passed',
    createdAt: new Date().toISOString(),
    formalUseApproved: false,
    externalApiCallsDuringPreviewManufacturing: 0,
    source: {
      path: repoPath(BASE_MEDIA_PATH),
      sha256: EXPECTED_BASE_MEDIA_SHA256,
    },
    crop: {
      source: 'legacy LLM crop diagnostic',
      selectedLayout: selectedPlan.screenLayoutId,
      selectedCandidateId: selectedPlan.selectedCandidateId,
      selectedPlan,
      responseHashes: cropResponseHashes,
      candidatePreviewNonBlack: cropDecision.previews.every(
        (preview: any) => preview.grayscaleMean > 0.001,
      ),
    },
    candidateValues: {
      typography: {
        fontFamily: baseStyle.fontFamily,
        fontSha256: EXPECTED_FONT_SHA256,
        candidates: [96, fontB, fontA].map((fontSizePx) => {
          const style = styleAtFontSize(baseStyle, fontSizePx);
          return {
            fontSizePx,
            borderWidthPx: style.borderWidth,
            glowWidthPx: style.glowWidth,
          };
        }),
        derivation: {
          96: '人間認定済み横型caption-coreの値',
          [fontB]:
            '既存描画余白Bに収まる最大整数文字サイズを正本描画モデルで全探索。縁とglowは96px値との比率を整数丸め',
          [fontA]:
            '広めの安全領域Aに収まる最大整数文字サイズを正本描画モデルで全探索。縁とglowは96px値との比率を整数丸め',
        },
      },
      safeAreas: [safeA, safeB],
      maxLogicalWidthPerLine: WIDTH_CANDIDATES,
      titleCaptionStack: {
        title: 'top-center',
        caption: captionPosition.preset,
        positiveIntersection: positiveTitleCaptionIntersection,
      },
    },
    candidateClassification: {
      font96SafeA: typographyInspections.font96SafeA.outsideSafeArea ? 'outside' : 'inside',
      font96SafeB: typographyInspections.font96SafeB.outsideSafeArea ? 'outside' : 'inside',
      [`font${fontB}SafeB`]: typographyInspections.fontBSafeB.outsideSafeArea ? 'outside' : 'inside',
      [`font${fontA}SafeA`]: typographyInspections.fontASafeA.outsideSafeArea ? 'outside' : 'inside',
      packagePassMeaning:
        '比較候補の想定された合否分類を正本描画モデルが再現した。96px候補自体を安全と認定した意味ではない。',
    },
    scenes: scenes.map((scene) => ({
      ...scene,
      overlayPath: repoPath(scene.overlayPath),
      frameCount: scene.sourceEndFrameExclusive - scene.sourceStartFrame,
    })),
    media: {
      path: repoPath(VIDEO_PATH),
      sha256: await fileSha256(VIDEO_PATH),
      width: videoStream.width,
      height: videoStream.height,
      fps: videoStream.r_frame_rate,
      frameCount: Number(videoStream.nb_read_frames),
      durationSeconds: Number(probe.format.duration),
      expectedDurationSeconds,
      audioCodec: audioStream.codec_name,
      audioSampleRate: Number(audioStream.sample_rate),
      audioChannels: Number(audioStream.channels),
      meanVolumeDb: Number(meanVolumeMatch[1]),
    },
    overlayAlphaMeans: alphaMeans,
    formalAssetImmutability: {
      baselinePath: FORMAL_ASSET_BASELINE_PATH,
      checkedFileCount: formalBaselineRows.length,
      changedFileCount: 0,
    },
    secretScan: {
      source: 'external .env key loaded in memory only',
      exactOccurrenceCount: secretExactOccurrenceCount,
      envCopied: false,
      keySaved: false,
    },
    scope: {
      rendererContractRevision: false,
      presetRegistryRevision: false,
      formalCandidate13Or59AssetChanges: 0,
      g4ToG7Added: false,
      externalMaterialsAdded: false,
      soundEffectsAdded: false,
      titleLayerStatus: 'preview-only; formal title rendering is not implemented',
    },
  };
  await writeFile(PREFLIGHT_PATH, `${JSON.stringify(preflight, null, 2)}\n`, 'utf8');

  const manifestArtifactPaths = [
    CROP_DECISION_PATH,
    VIDEO_PATH,
    REVIEW_PATH,
    PREFLIGHT_PATH,
    RESULT_TEMPLATE_PATH,
    ...Object.values(overlayPaths),
  ];
  const manifest = {
    schemaVersion: 'vertical-preset-review-manifest-v001',
    status: 'ready_for_five_human_judgments',
    createdAt: new Date().toISOString(),
    formalRegistryPromotion: false,
    humanWork: {
      judgments: 5,
      pageCount: 1,
      timeMeasurement: 'not_required',
    },
    reviewPage: repoPath(REVIEW_PATH),
    previewMedia: repoPath(VIDEO_PATH),
    preflight: repoPath(PREFLIGHT_PATH),
    artifacts: await Promise.all(manifestArtifactPaths.map(async (artifactPath) => ({
      path: repoPath(artifactPath),
      sha256: await fileSha256(artifactPath),
    }))),
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: manifest.status,
    reviewPage: manifest.reviewPage,
    previewMedia: manifest.previewMedia,
    previewSha256: preflight.media.sha256,
    durationSeconds: preflight.media.durationSeconds,
    frameCount: preflight.media.frameCount,
    typographyCandidatesPx: [96, fontB, fontA],
    safeAreas: [safeA, safeB],
    externalApiCalls: 0,
  }));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

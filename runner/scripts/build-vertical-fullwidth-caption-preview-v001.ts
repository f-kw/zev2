#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildLayoutVideoFilter,
  type ShortsScreenLayoutPlan,
} from '../src/screen-layout.ts';
import { getCharWeight, countVisibleCharacters } from '../src/telop/telop-line-break.ts';
import { renderRemotionTelopPng } from '../src/telop-remotion.ts';
import {
  buildTelopRenderModel,
  type TelopLayoutPosition,
  type TelopLayoutStyle,
  type TelopRenderModel,
} from '../src/telop/telop-render-model.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const requiredOption = (name: string): string => {
  const value = option(name);
  if (!value) {
    throw new Error(`${name}を明示してください`);
  }
  return value;
};
const PREVIEW_REVISION = requiredOption('--revision');
if (!/^v\d{3}$/.test(PREVIEW_REVISION)) {
  throw new Error('preview revisionはvNNN形式で指定してください');
}
const MAX_VISIBLE_CHARACTERS_PER_LINE = Number(requiredOption('--max-visible-characters'));
if (
  !Number.isInteger(MAX_VISIBLE_CHARACTERS_PER_LINE)
  || MAX_VISIBLE_CHARACTERS_PER_LINE < 1
) {
  throw new Error('最大表示文字数は正の整数で指定してください');
}
const WIDTH_PROBE_TEXT = requiredOption('--width-probe-text');
const OUTPUT_ROOT = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation/vertical-preset-previews',
  'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate',
);
const PREVIEW_ROOT = path.join(OUTPUT_ROOT, `preview-${PREVIEW_REVISION}`);
const OVERLAY_ROOT = path.join(PREVIEW_ROOT, 'overlays');
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
const CROP_DECISION_PATH = path.join(OUTPUT_ROOT, 'type-crop-v006', 'crop-decision-v006.json');
const REGISTRY_PATH = path.join(
  WORKSPACE_ROOT,
  'evals/clip_composition/registries/presentation',
  'normal-landscape-preset-registry-v001/preset-registry.json',
);
const PREVIOUS_PREVIEW_PATH = path.resolve(
  WORKSPACE_ROOT,
  requiredOption('--previous-preview'),
);
const EXPECTED_PREVIOUS_PREVIEW_SHA256 = requiredOption('--previous-preview-sha256');
if (!/^[a-f0-9]{64}$/.test(EXPECTED_PREVIOUS_PREVIEW_SHA256)) {
  throw new Error('--previous-preview-sha256は小文字16進64文字で指定してください');
}
const OUTPUT_VIDEO_PATH = path.join(
  PREVIEW_ROOT,
  `vertical-fullwidth-caption-review-${PREVIEW_REVISION}.mp4`,
);
const REVIEW_PATH = path.join(PREVIEW_ROOT, 'review.html');
const PREFLIGHT_PATH = path.join(PREVIEW_ROOT, 'preflight.json');
const MANIFEST_PATH = path.join(PREVIEW_ROOT, 'preview-manifest.json');
const QA_FRAME_PATH = path.join(PREVIEW_ROOT, 'qa-frame-middle.png');
const TARGET = Object.freeze({ width: 1080, height: 1920, fps: 30 });
const MAX_LOGICAL_WIDTH_PER_LINE = Array.from(
  'あ'.repeat(MAX_VISIBLE_CHARACTERS_PER_LINE),
).reduce((sum, character) => sum + getCharWeight(character), 0);
const MAX_LINES = 2;
const EXPECTED_FONT_SHA256 =
  '4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb';

type SafeArea = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  origin: string;
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
  cueId: string;
  text: string;
  sourceStartFrame: number;
  sourceEndFrameExclusive: number;
  frameCount: number;
  overlayPath: string;
};

type Inspection = {
  model: TelopRenderModel;
  lineRects: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>;
  outsideSafeArea: boolean;
  positiveLineIntersection: boolean;
};

type AlphaBounds = {
  width: number;
  height: number;
  x: number;
  y: number;
  right: number;
  bottom: number;
};

type FontSearchAttempt = {
  fontSizePx: number;
  inspection: Inspection;
  imagePath: string;
  alphaBounds: AlphaBounds;
  insideSafeArea: boolean;
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

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = (
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> => new Promise((resolve, reject) => {
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
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    };
    if (code === 0) {
      resolve(result);
      return;
    }
    reject(new Error(`${command} exited ${code ?? 'unknown'}\n${result.stderr}`));
  });
});

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const textWeight = (text: string): number => {
  let weight = 0;
  for (const character of text) {
    weight += getCharWeight(character);
  }
  return weight;
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
  style,
  position,
  safeArea,
}: {
  text: string;
  fontSizePx: number;
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  safeArea: SafeArea;
}): Inspection => {
  const model = buildTelopRenderModel({
    text,
    style: styleAtFontSize(style, fontSizePx),
    position,
    maxCharsPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
    width: TARGET.width,
    height: TARGET.height,
    glowSeedHint: `vertical-fullwidth-${fontSizePx}`,
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
    || rect.right > TARGET.width - safeArea.right
    || rect.bottom > TARGET.height - safeArea.bottom
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
    model,
    lineRects,
    outsideSafeArea,
    positiveLineIntersection,
  };
};

const deriveCanonicalSafeArea = (
  style: TelopLayoutStyle,
): SafeArea => {
  const topModel = buildTelopRenderModel({
    text: '安全',
    style,
    position: { preset: 'top-center', alignment: 'center' },
    maxCharsPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
    width: TARGET.width,
    height: TARGET.height,
    glowSeedHint: 'vertical-fullwidth-safe-top',
  });
  const rightModel = buildTelopRenderModel({
    text: '安全',
    style,
    position: { preset: 'top-right', alignment: 'center' },
    maxCharsPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
    width: TARGET.width,
    height: TARGET.height,
    glowSeedHint: 'vertical-fullwidth-safe-right',
  });
  const vertical = Math.round(topModel.wrapper.top);
  const horizontal = Math.round(
    TARGET.width - rightModel.wrapper.displayWidth - rightModel.wrapper.left,
  );
  return {
    top: vertical,
    right: horizontal,
    bottom: vertical,
    left: horizontal,
    origin: 'buildTelopRenderModelが実描画で使う既存余白から再導出',
  };
};

const deriveLargestSafeFontSize = ({
  style,
  position,
  safeArea,
}: {
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  safeArea: SafeArea;
}): { fontSizePx: number; inspection: Inspection; nextInspection: Inspection } => {
  let latestPassing: { fontSizePx: number; inspection: Inspection } | undefined;
  for (let fontSizePx = 12; fontSizePx <= TARGET.width; fontSizePx += 1) {
    const inspection = inspectText({
      text: WIDTH_PROBE_TEXT,
      fontSizePx,
      style,
      position,
      safeArea,
    });
    if (
      inspection.model.text.lines.length <= MAX_LINES
      && !inspection.outsideSafeArea
      && !inspection.positiveLineIntersection
    ) {
      latestPassing = { fontSizePx, inspection };
      continue;
    }
    assert(latestPassing, '安全領域内へ収まる文字サイズがありません');
    return {
      ...latestPassing,
      nextInspection: inspection,
    };
  }
  throw new Error('画面幅まで探索しても安全領域外へ出ませんでした');
};

const parseAlphaBounds = (raw: string): AlphaBounds => {
  const match = raw.trim().match(/^(\d+)x(\d+)\+(-?\d+)\+(-?\d+)$/);
  assert(match, `alpha boundsを解釈できません: ${raw}`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  const x = Number(match[3]);
  const y = Number(match[4]);
  return {
    width,
    height,
    x,
    y,
    right: x + width,
    bottom: y + height,
  };
};

const readAlphaBounds = async (imagePath: string): Promise<AlphaBounds> => {
  const result = await run('magick', [
    imagePath,
    '-alpha', 'extract',
    '-threshold', '0',
    '-format', '%@',
    'info:',
  ]);
  return parseAlphaBounds(result.stdout);
};

const isNonEmptyAlphaInsideSafeArea = (
  bounds: AlphaBounds,
  safeArea: SafeArea,
): boolean => (
  bounds.width > 0
  && bounds.height > 0
  && bounds.x >= safeArea.left
  && bounds.y >= safeArea.top
  && bounds.right <= TARGET.width - safeArea.right
  && bounds.bottom <= TARGET.height - safeArea.bottom
);

const deriveLargestSafeFontSizeFromRenderedPixels = async ({
  style,
  position,
  safeArea,
  modelLowerBoundFontSizePx,
}: {
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  safeArea: SafeArea;
  modelLowerBoundFontSizePx: number;
}): Promise<{
  selected: FontSearchAttempt;
  rejectedNext: FontSearchAttempt;
  attempts: FontSearchAttempt[];
}> => {
  const attempts: FontSearchAttempt[] = [];
  let selected: FontSearchAttempt | undefined;
  for (
    let fontSizePx = modelLowerBoundFontSizePx;
    fontSizePx <= TARGET.width;
    fontSizePx += 1
  ) {
    const inspection = inspectText({
      text: WIDTH_PROBE_TEXT,
      fontSizePx,
      style,
      position,
      safeArea,
    });
    const imagePath = path.join(OVERLAY_ROOT, `qa-width-search-${fontSizePx}px.png`);
    await renderRemotionTelopPng({
      text: WIDTH_PROBE_TEXT,
      style: styleAtFontSize(style, fontSizePx),
      position,
      maxCharsPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
      width: TARGET.width,
      height: TARGET.height,
      glowSeedHint: `vertical-fullwidth-probe-${fontSizePx}`,
    }, imagePath);
    const alphaBounds = await readAlphaBounds(imagePath);
    const insideSafeArea = (
      inspection.model.text.lines.length <= MAX_LINES
      && !inspection.positiveLineIntersection
      && isNonEmptyAlphaInsideSafeArea(alphaBounds, safeArea)
    );
    const attempt = {
      fontSizePx,
      inspection,
      imagePath,
      alphaBounds,
      insideSafeArea,
    };
    attempts.push(attempt);
    if (insideSafeArea) {
      selected = attempt;
      continue;
    }
    assert(selected, '実PNGが安全領域内へ収まる文字サイズがありません');
    return {
      selected,
      rejectedNext: attempt,
      attempts,
    };
  }
  throw new Error('画面幅まで実PNGを探索しても安全領域外へ出ませんでした');
};

const buildReviewHtml = ({
  videoName,
  fontSizePx,
  borderWidthPx,
  glowWidthPx,
  scenes,
}: {
  videoName: string;
  fontSizePx: number;
  borderWidthPx: number;
  glowWidthPx: number;
  scenes: Scene[];
}): string => {
  const chapterButtons = scenes.map((scene, index) => {
    const startFrame = scenes.slice(0, index).reduce((sum, item) => sum + item.frameCount, 0);
    return `<button type="button" data-time="${(startFrame / TARGET.fps).toFixed(6)}">`
      + `${index + 1}. ${escapeHtml(scene.label)}</button>`;
  }).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>縦型字幕 大文字preview</title>
  <style>
    :root { color-scheme:dark; --bg:#07111f; --card:#111d31; --text:#f7fbff; --muted:#b8c7dc; --accent:#62e6c6; }
    * { box-sizing:border-box; }
    body { margin:0; background:linear-gradient(150deg,#07111f,#102442); color:var(--text);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif; }
    main { width:min(980px,94vw); margin:0 auto; padding:28px 0 48px; }
    h1 { margin:0 0 8px; font-size:clamp(25px,4vw,42px); }
    .status { display:inline-block; margin:0 0 14px; padding:7px 12px; border-radius:999px;
      background:#153f35; color:#9ff3d8; font-weight:800; }
    .lead { margin:0 0 18px; color:var(--muted); line-height:1.65; }
    .grid { display:grid; grid-template-columns:minmax(280px,430px) 1fr; gap:18px; align-items:start; }
    .card { background:rgba(17,29,49,.94); border:1px solid #2c4364; border-radius:16px; padding:16px; }
    video { display:block; width:100%; max-height:78vh; background:#000; border-radius:12px; }
    h2 { margin:0 0 10px; font-size:20px; }
    .ask { border-left:5px solid var(--accent); padding:12px 14px; background:#0d2d2a;
      border-radius:10px; font-size:18px; line-height:1.6; font-weight:800; }
    ul { padding-left:22px; line-height:1.7; color:var(--muted); }
    .chapters { display:grid; gap:8px; }
    button { border:1px solid #446388; border-radius:10px; padding:10px 12px; text-align:left;
      background:#142642; color:var(--text); cursor:pointer; font-weight:700; }
    button:hover { border-color:var(--accent); }
    code { color:#a9f3e1; }
    @media (max-width:760px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
<main>
  <span class="status">cropは合格済み・字幕サイズだけ再確認</span>
  <h1>縦型字幕を画面幅まで大きくしました</h1>
  <p class="lead">前のpreviewより左右の空きを減らし、
    1行最大${MAX_VISIBLE_CHARACTERS_PER_LINE}文字を既存の安全領域へ収められる最大サイズで、同じ実字幕を描画しています。</p>
  <div class="grid">
    <section class="card">
      <video id="preview" controls playsinline preload="metadata" src="${escapeHtml(videoName)}"></video>
    </section>
    <section class="card">
      <h2>確認することは1つだけ</h2>
      <p class="ask">字幕が横幅いっぱいの大きさになり、読みやすく見えるか。</p>
      <ul>
        <li>1行は最大${MAX_VISIBLE_CHARACTERS_PER_LINE}文字。今回の実例はすべて7文字です。</li>
        <li>最大2行のままです。長文を4行へ折り返していません。</li>
        <li>文字は${fontSizePx}px、縁${borderWidthPx}px、glow ${glowWidthPx}pxです。</li>
        <li>crop位置と元の音声・時刻は変えていません。</li>
      </ul>
      <h2>見たい場面へ移動</h2>
      <div class="chapters">${chapterButtons}</div>
    </section>
  </div>
</main>
<script>
  const video = document.getElementById('preview');
  document.querySelectorAll('[data-time]').forEach((button) => {
    button.addEventListener('click', () => {
      video.currentTime = Number(button.dataset.time);
      video.play();
    });
  });
</script>
</body>
</html>
`;
};

const main = async () => {
  assert(
    path.resolve(PREVIOUS_PREVIEW_PATH) !== path.resolve(OUTPUT_VIDEO_PATH),
    '前版previewと新出力が同じpathです',
  );
  try {
    await lstat(PREVIEW_ROOT);
    throw new Error(`出力先は使用済みです: ${repoPath(PREVIEW_ROOT)}`);
  } catch (error) {
    if (
      !(error instanceof Error)
      || !('code' in error)
      || error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }
  await mkdir(OVERLAY_ROOT, { recursive: true });
  const [
    baseMedia,
    displayPlanBytes,
    cropDecisionBytes,
    registryBytes,
    previousPreviewSha,
  ] = await Promise.all([
    readFile(BASE_MEDIA_PATH),
    readFile(DISPLAY_PLAN_PATH),
    readFile(CROP_DECISION_PATH),
    readFile(REGISTRY_PATH),
    fileSha256(PREVIOUS_PREVIEW_PATH),
  ]);
  assert(
    previousPreviewSha === EXPECTED_PREVIOUS_PREVIEW_SHA256,
    '前版previewのSHA-256が指定値と一致しません',
  );
  const displayPlan = JSON.parse(displayPlanBytes.toString('utf8'));
  const cropDecision = JSON.parse(cropDecisionBytes.toString('utf8'));
  const registry = JSON.parse(registryBytes.toString('utf8'));
  assert(cropDecision.status === 'passed', 'crop決定が合格していません');
  assert(cropDecision.selectedPlan?.screenLayoutId === 'speaker_only',
    'crop決定が話者1人型ではありません');
  assert(cropDecision.selectedPlan?.selectedCandidateId === 'speaker_only_body',
    '人間合格済みcropがspeaker_only_bodyではありません');

  const preset = registry.presets.find(
    (item: any) => item.presetId === 'normal-landscape-readable-pop-v001',
  );
  assert(preset, '横型の人間認定済みpresetがありません');
  const state = preset.visualStates.find((item: any) => item.stateId === 'caption-core-v001');
  assert(state, '基本字幕stateがありません');
  const font = registry.fontAssets.find(
    (item: any) => item.fontAssetId === state.textStyle.fontAssetId,
  );
  assert(font, '基本字幕fontがありません');
  const fontPath = path.join(WORKSPACE_ROOT, font.path);
  assert(await fileSha256(fontPath) === EXPECTED_FONT_SHA256, 'font SHAが一致しません');
  const baseStyle: TelopLayoutStyle = {
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
  };
  const captionPosition: TelopLayoutPosition = {
    preset: state.position.preset,
    alignment: state.position.alignment,
    offsetX: state.position.offsetXPercent,
    offsetY: state.position.offsetYPercent,
  };
  const safeArea = deriveCanonicalSafeArea(baseStyle);
  assert(
    safeArea.left === 43
    && safeArea.right === 43
    && safeArea.top === 38
    && safeArea.bottom === 38,
    '既存描画由来の安全領域43/43/38/38と一致しません',
  );
  assert(countVisibleCharacters(WIDTH_PROBE_TEXT) === MAX_VISIBLE_CHARACTERS_PER_LINE,
    '幅境界probeが指定した表示文字数ではありません');
  assert(textWeight(WIDTH_PROBE_TEXT) === MAX_LOGICAL_WIDTH_PER_LINE,
    '幅境界probeが指定した現行論理幅ではありません');
  const modelLowerBound = deriveLargestSafeFontSize({
    style: baseStyle,
    position: captionPosition,
    safeArea,
  });
  const renderedFontSelection = await deriveLargestSafeFontSizeFromRenderedPixels({
    style: baseStyle,
    position: captionPosition,
    safeArea,
    modelLowerBoundFontSizePx: modelLowerBound.fontSizePx,
  });
  const largest = {
    fontSizePx: renderedFontSelection.selected.fontSizePx,
    inspection: renderedFontSelection.selected.inspection,
    nextInspection: renderedFontSelection.rejectedNext.inspection,
  };
  assert(
    renderedFontSelection.selected.insideSafeArea,
    '選択文字サイズの実PNGが安全領域内ではありません',
  );
  assert(
    !renderedFontSelection.rejectedNext.insideSafeArea,
    '次の整数文字サイズの実PNGが安全領域外ではありません',
  );
  const selectedStyle = styleAtFontSize(baseStyle, largest.fontSizePx);

  const cues: Cue[] = displayPlan.containers.flatMap((container: any) => container.cues);
  const cueById = new Map(cues.map((cue) => [cue.cueId, cue]));
  const selectedCues = [
    { cueId: 'caption-cue-000003', label: '1行・7文字「これやばいよね」' },
    { cueId: 'caption-cue-000006', label: '2行・7文字＋7文字' },
    { cueId: 'caption-cue-000014', label: '1行・7文字「困ったもんです」' },
  ].map((selection) => {
    const cue = cueById.get(selection.cueId);
    assert(cue, `${selection.cueId}がありません`);
    return { ...selection, cue };
  });
  const originSourceMs = Math.min(...cues.map((cue) => cue.sourceStartMs));
  const scenes: Scene[] = [];
  for (const [index, selection] of selectedCues.entries()) {
    const text = selection.cue.lines.map((line) => line.text).join('\n');
    const lines = text.split('\n');
    assert(lines.length <= MAX_LINES, `${selection.cueId}が2行を超えています`);
    for (const line of lines) {
      assert(countVisibleCharacters(line) <= MAX_VISIBLE_CHARACTERS_PER_LINE,
        `${selection.cueId}に${MAX_VISIBLE_CHARACTERS_PER_LINE}文字を超える行があります`);
      assert(textWeight(line) <= MAX_LOGICAL_WIDTH_PER_LINE,
        `${selection.cueId}に論理幅${MAX_LOGICAL_WIDTH_PER_LINE}を超える行があります`);
    }
    const inspection = inspectText({
      text,
      fontSizePx: largest.fontSizePx,
      style: baseStyle,
      position: captionPosition,
      safeArea,
    });
    assert(inspection.model.text.lines.length === lines.length,
      `${selection.cueId}の描画行数が入力行数と一致しません`);
    assert(!inspection.positiveLineIntersection, `${selection.cueId}で行が交差します`);
    const overlayPath = path.join(
      OVERLAY_ROOT,
      `caption-${String(index + 1).padStart(2, '0')}-${selection.cueId}.png`,
    );
    await renderRemotionTelopPng({
      text,
      style: selectedStyle,
      position: captionPosition,
      maxCharsPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
      width: TARGET.width,
      height: TARGET.height,
      glowSeedHint: `vertical-fullwidth-${selection.cueId}`,
    }, overlayPath);
    const alphaBounds = await readAlphaBounds(overlayPath);
    assert(alphaBounds.width > 0 && alphaBounds.height > 0,
      `${selection.cueId}の実PNGに可視画素がありません`);
    assert(alphaBounds.x >= safeArea.left, `${selection.cueId}の実PNGが左安全領域外です`);
    assert(alphaBounds.right <= TARGET.width - safeArea.right,
      `${selection.cueId}の実PNGが右安全領域外です`);
    assert(alphaBounds.y >= safeArea.top, `${selection.cueId}の実PNGが上安全領域外です`);
    assert(alphaBounds.bottom <= TARGET.height - safeArea.bottom,
      `${selection.cueId}の実PNGが下安全領域外です`);
    const sourceStartFrame = Math.round(
      (selection.cue.sourceStartMs - originSourceMs) * TARGET.fps / 1000,
    );
    const sourceEndFrameExclusive = Math.round(
      (selection.cue.sourceEndMs - originSourceMs) * TARGET.fps / 1000,
    );
    assert(sourceEndFrameExclusive > sourceStartFrame, `${selection.cueId}のframe範囲が空です`);
    scenes.push({
      sceneId: `fullwidth-caption-${String(index + 1).padStart(2, '0')}`,
      label: selection.label,
      cueId: selection.cueId,
      text,
      sourceStartFrame,
      sourceEndFrameExclusive,
      frameCount: sourceEndFrameExclusive - sourceStartFrame,
      overlayPath,
    });
  }

  const probePaths = {
    selected: renderedFontSelection.selected.imagePath,
    next: renderedFontSelection.rejectedNext.imagePath,
  };
  const probeAlphaBounds = {
    selected: renderedFontSelection.selected.alphaBounds,
    next: renderedFontSelection.rejectedNext.alphaBounds,
  };
  assert(
    isNonEmptyAlphaInsideSafeArea(probeAlphaBounds.selected, safeArea),
    `${MAX_VISIBLE_CHARACTERS_PER_LINE}文字probeの実PNGが安全領域内ではありません`,
  );
  assert(
    !isNonEmptyAlphaInsideSafeArea(probeAlphaBounds.next, safeArea),
    '次の整数文字サイズの実PNGが安全領域外ではありません',
  );

  const inputProbe = JSON.parse((await run('ffprobe', [
    '-v', 'error',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
    '-of', 'json',
    BASE_MEDIA_PATH,
  ])).stdout);
  const inputVideo = inputProbe.streams.find((stream: any) => stream.codec_type === 'video');
  const inputAudio = inputProbe.streams.find((stream: any) => stream.codec_type === 'audio');
  assert(inputVideo?.r_frame_rate === '30/1', '基礎映像が30fpsではありません');
  assert(Number(inputAudio?.sample_rate) > 0, '基礎映像の音声sample rateを読めません');
  const audioSamplesPerFrame = Number(inputAudio.sample_rate) / TARGET.fps;
  assert(Number.isInteger(audioSamplesPerFrame), '1frameあたりの音声sample数が整数ではありません');

  const selectedPlan = cropDecision.selectedPlan as ShortsScreenLayoutPlan;
  const videoSplits = scenes.map((_, index) => `[vsource${index}]`).join('');
  const audioSplits = scenes.map((_, index) => `[asource${index}]`).join('');
  const filterParts = [
    `[0:v]split=${scenes.length}${videoSplits}`,
    `[0:a]asplit=${scenes.length}${audioSplits}`,
  ];
  const concatLabels: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    filterParts.push(
      `[vsource${index}]trim=start_frame=${scene.sourceStartFrame}:`
      + `end_frame=${scene.sourceEndFrameExclusive},setpts=PTS-STARTPTS[vtrim${index}]`,
    );
    filterParts.push(buildLayoutVideoFilter({
      inputLabel: `[vtrim${index}]`,
      outputLabel: `vcrop${index}`,
      sourceWidth: Number(inputVideo.width),
      sourceHeight: Number(inputVideo.height),
      durationSeconds: scene.frameCount / TARGET.fps,
      screenLayout: selectedPlan,
    }));
    filterParts.push(
      `[${index + 1}:v]format=rgba[overlay${index}]`,
      `[vcrop${index}][overlay${index}]overlay=0:0:shortest=1:format=auto,`
      + `fps=${TARGET.fps},tpad=stop_mode=clone:stop=1,`
      + `trim=start_frame=0:end_frame=${scene.frameCount},`
      + `setpts=N/(${TARGET.fps}*TB)[vscene${index}]`,
      `[asource${index}]atrim=start_sample=${scene.sourceStartFrame * audioSamplesPerFrame}:`
      + `end_sample=${scene.sourceEndFrameExclusive * audioSamplesPerFrame},`
      + `asetpts=PTS-STARTPTS[ascene${index}]`,
    );
    concatLabels.push(`[vscene${index}][ascene${index}]`);
  }
  filterParts.push(
    `${concatLabels.join('')}concat=n=${scenes.length}:v=1:a=1[vout][aout]`,
  );
  const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-y', '-i', BASE_MEDIA_PATH];
  for (const scene of scenes) {
    ffmpegArgs.push('-loop', '1', '-framerate', String(TARGET.fps), '-i', scene.overlayPath);
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
    OUTPUT_VIDEO_PATH,
  );
  await run('ffmpeg', ffmpegArgs);

  const outputProbe = JSON.parse((await run('ffprobe', [
    '-v', 'error',
    '-count_frames',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels',
    '-show_entries', 'format=duration,size',
    '-of', 'json',
    OUTPUT_VIDEO_PATH,
  ])).stdout);
  const outputVideo = outputProbe.streams.find((stream: any) => stream.codec_type === 'video');
  const outputAudio = outputProbe.streams.find((stream: any) => stream.codec_type === 'audio');
  const expectedFrameCount = scenes.reduce((sum, scene) => sum + scene.frameCount, 0);
  const expectedDurationSeconds = expectedFrameCount / TARGET.fps;
  assert(outputVideo?.width === TARGET.width && outputVideo?.height === TARGET.height,
    '完成MP4が1080x1920ではありません');
  assert(outputVideo?.r_frame_rate === '30/1', '完成MP4が30fpsではありません');
  assert(Number(outputVideo?.nb_read_frames) === expectedFrameCount,
    '完成MP4のframe数がscene合計と一致しません');
  assert(Number(outputAudio?.sample_rate) === Number(inputAudio.sample_rate),
    '完成MP4の音声sample rateが基礎映像と一致しません');
  assert(Number(outputAudio?.channels) === Number(inputAudio.channels),
    '完成MP4の音声channel数が基礎映像と一致しません');
  assert(Math.abs(Number(outputProbe.format.duration) - expectedDurationSeconds) <= 1 / TARGET.fps,
    '完成MP4の尺がframe正本と1frame超ずれています');
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(expectedDurationSeconds / 2),
    '-i', OUTPUT_VIDEO_PATH,
    '-frames:v', '1',
    QA_FRAME_PATH,
  ]);

  const reviewHtml = buildReviewHtml({
    videoName: path.basename(OUTPUT_VIDEO_PATH),
    fontSizePx: largest.fontSizePx,
    borderWidthPx: selectedStyle.borderWidth ?? 0,
    glowWidthPx: selectedStyle.glowWidth ?? 0,
    scenes,
  });
  await writeFile(REVIEW_PATH, reviewHtml, 'utf8');
  assert(await fileSha256(PREVIOUS_PREVIEW_PATH) === previousPreviewSha,
    '人間確認済みの前版previewが変化しました');

  const sceneDetails = await Promise.all(scenes.map(async (scene) => {
    const lines = scene.text.split('\n');
    return {
      ...scene,
      overlayPath: repoPath(scene.overlayPath),
      overlayFileSha256: await fileSha256(scene.overlayPath),
      lines: lines.map((text) => ({
        text,
        visibleCharacters: countVisibleCharacters(text),
        logicalWidth: textWeight(text),
      })),
      alphaBounds: await readAlphaBounds(scene.overlayPath),
    };
  }));
  const preflight = {
    schemaVersion: 'vertical-fullwidth-caption-preview-preflight-v001',
    status: 'passed',
    createdAt: new Date().toISOString(),
    externalApiCalls: 0,
    inputs: {
      baseMedia: { path: repoPath(BASE_MEDIA_PATH), fileSha256: sha256(baseMedia) },
      displayPlan: { path: repoPath(DISPLAY_PLAN_PATH), fileSha256: sha256(displayPlanBytes) },
      cropDecision: { path: repoPath(CROP_DECISION_PATH), fileSha256: sha256(cropDecisionBytes) },
      registry: { path: repoPath(REGISTRY_PATH), fileSha256: sha256(registryBytes) },
      previousHumanApprovedPreview: {
        path: repoPath(PREVIOUS_PREVIEW_PATH),
        fileSha256: previousPreviewSha,
        expectedFileSha256: EXPECTED_PREVIOUS_PREVIEW_SHA256,
        preserved: true,
      },
    },
    formatInput: {
      format: 'vertical-short-1080x1920',
      maxVisibleCharactersPerLine: MAX_VISIBLE_CHARACTERS_PER_LINE,
      maxLogicalWidthPerLine: MAX_LOGICAL_WIDTH_PER_LINE,
      maxLines: MAX_LINES,
      humanOrigin: 'kawafmm 2026-07-29',
      notAppliedToLandscapeOrOtherFormats: true,
    },
    crop: {
      screenLayoutId: selectedPlan.screenLayoutId,
      selectedCandidateId: selectedPlan.selectedCandidateId,
      unchangedFromHumanApprovedPreview: true,
    },
    typography: {
      sourcePresetId: preset.presetId,
      sourceStateId: state.stateId,
      fontAssetId: font.fontAssetId,
      fontFileSha256: await fileSha256(fontPath),
      widthProbeText: WIDTH_PROBE_TEXT,
      widthProbeVisibleCharacters: countVisibleCharacters(WIDTH_PROBE_TEXT),
      widthProbeLogicalWidth: textWeight(WIDTH_PROBE_TEXT),
      selectedFontSizePx: largest.fontSizePx,
      rejectedNextFontSizePx: largest.fontSizePx + 1,
      selectedBorderWidthPx: selectedStyle.borderWidth,
      selectedGlowWidthPx: selectedStyle.glowWidth,
      selectionRule:
        `${MAX_VISIBLE_CHARACTERS_PER_LINE}文字境界probeの実PNGが既存描画由来安全領域内・最大2行・行交差0を満たす最大整数`,
      modelLowerBoundFontSizePx: modelLowerBound.fontSizePx,
      renderedPixelSearch: await Promise.all(renderedFontSelection.attempts.map(async (attempt) => ({
        fontSizePx: attempt.fontSizePx,
        imagePath: repoPath(attempt.imagePath),
        imageFileSha256: await fileSha256(attempt.imagePath),
        alphaBounds: attempt.alphaBounds,
        insideSafeArea: attempt.insideSafeArea,
      }))),
      safeArea,
      selectedProbeModelRects: largest.inspection.lineRects,
      nextProbeModelRects: largest.nextInspection.lineRects,
      selectedProbeAlphaBounds: probeAlphaBounds.selected,
      nextProbeAlphaBounds: probeAlphaBounds.next,
    },
    scenes: sceneDetails,
    checks: {
      cropUnchanged: true,
      onlyExistingAcceptedCueBoundariesUsed: true,
      allVisibleLineLengthsWithinFormatInput: true,
      allLogicalLineWidthsWithinFormatInput: true,
      allScenesAtMost2Lines: true,
      allSceneModelsHaveExpectedLineCountAndNoPositiveIntersection: true,
      allSceneAlphaBoundsInsideSafeArea: true,
      noPositiveLineIntersection: true,
      sameFontBorderGlowForEveryScene: true,
      widthBoundaryProbeInsideSafeArea: true,
      nextIntegerFontRejectedByRenderedPixelBounds: true,
      outputSize1080x1920: true,
      outputFrameCountMatchesScenes: true,
      outputDurationWithinOneFrame: true,
      outputAudioShapeMatchesSource: true,
      previousPreviewPreserved: true,
    },
    media: {
      path: repoPath(OUTPUT_VIDEO_PATH),
      fileSha256: await fileSha256(OUTPUT_VIDEO_PATH),
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
    limitations: [
      'これは縦型preset認定用previewであり、正式な縦型完成動画ではない',
      `全281文字の${MAX_VISIBLE_CHARACTERS_PER_LINE}文字分割は未実施であり、正式化時は短い意味単位の新選択が必要`,
      `${MAX_VISIBLE_CHARACTERS_PER_LINE}文字は縦型フォーマットの今回の人間指定入力で、横型へ流用しない`,
    ],
  };
  await writeFile(PREFLIGHT_PATH, `${JSON.stringify(preflight, null, 2)}\n`, 'utf8');
  const artifactPaths = Array.from(new Set([
    OUTPUT_VIDEO_PATH,
    REVIEW_PATH,
    PREFLIGHT_PATH,
    QA_FRAME_PATH,
    ...scenes.map((scene) => scene.overlayPath),
    ...renderedFontSelection.attempts.map((attempt) => attempt.imagePath),
  ]));
  const manifest = {
    schemaVersion: 'vertical-fullwidth-caption-preview-manifest-v001',
    status: 'ready_for_one_human_visual_check',
    createdAt: new Date().toISOString(),
    humanWork: {
      requiredJudgments: 1,
      estimatedTime: '約10秒',
      question: '字幕が横幅いっぱいの大きさになり、読みやすく見えるか',
    },
    reviewPage: repoPath(REVIEW_PATH),
    previewMedia: repoPath(OUTPUT_VIDEO_PATH),
    qaFrame: repoPath(QA_FRAME_PATH),
    preflight: repoPath(PREFLIGHT_PATH),
    artifacts: await Promise.all(artifactPaths.map(async (artifactPath) => ({
      path: repoPath(artifactPath),
      fileSha256: await fileSha256(artifactPath),
    }))),
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: manifest.status,
    reviewPage: manifest.reviewPage,
    previewMedia: manifest.previewMedia,
    previewSha256: preflight.media.fileSha256,
    durationSeconds: preflight.media.durationSeconds,
    frameCount: preflight.media.frameCount,
    selectedFontSizePx: largest.fontSizePx,
    rejectedNextFontSizePx: largest.fontSizePx + 1,
    borderWidthPx: selectedStyle.borderWidth,
    glowWidthPx: selectedStyle.glowWidth,
    crop: selectedPlan.selectedCandidateId,
    checks: preflight.checks,
    externalApiCalls: 0,
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

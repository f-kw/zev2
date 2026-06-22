import { resolveTelopGlowStyle, type TelopGlowColorMode } from '../shared/telop-glow';
import { breakTelopText } from './telop-line-break';
import { measureTextLine } from './text-metrics';

export type TelopLayoutStyle = {
  fontFamily?: string;
  fontSize: number;
  fontColor: string;
  borderColor?: string;
  borderWidth?: number;
  lineSpacing?: number;
  glowColor?: string;
  glowColorMode?: TelopGlowColorMode;
  glowWidth?: number;
  glowOpacity?: number;
};

export type TelopLayoutPosition = {
  preset: string;
  offsetX?: number;
  offsetY?: number;
  alignment?: 'left' | 'center' | 'right';
  slotId?: 'slotA' | 'slotB' | 'canvas' | 'slotC';
};

export type TelopSvgLine = {
  text: string;
  x: number;
  y: number;
  width: number;
};

export type TelopTextRenderModel = {
  lines: TelopSvgLine[];
  svgWidth: number;
  svgHeight: number;
  fontFamily?: string;
  cssFontFamily: string;
  fontWeight: number;
  fontSize: number;
  fontColor: string;
  borderColor: string;
  borderWidth: number;
  borderStrokeWidth: number;
  glowColor?: string;
  glowWidth: number;
  glowStrokeWidth: number;
  hasGlow: boolean;
  hasBorder: boolean;
  lineHeight: number;
  margin: number;
  safePadding: number;
  maxLineWidth: number;
};

export type TelopRenderModel = {
  text: TelopTextRenderModel;
  wrapper: {
    top: number;
    left: number;
    width: number;
    height: number;
    renderScale: number;
    displayWidth: number;
    displayHeight: number;
  };
  resolvedText: string;
  resolvedStyle: TelopLayoutStyle & { glowColorMode: TelopGlowColorMode; glowColor: string };
  resolvedMaxChars?: number;
};

type TelopTextRenderModelInput = {
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontColor: string;
  borderColor?: string;
  borderWidth?: number;
  lineSpacing?: number;
  glowColor?: string;
  glowWidth?: number;
  glowOpacity?: number;
  maxCharsPerLine?: number;
  singleLine?: boolean;
  lineAlign?: 'left' | 'center' | 'right';
};

type MeasuredTelopLayout = {
  textModel: TelopTextRenderModel;
  resolvedMaxChars: number | undefined;
};

const TELOP_FONT_WEIGHT = 800;
const TELOP_LAYOUT_SAFE_PADDING_RATIO = 0.04;
const TELOP_HORIZONTAL_SCREEN_MARGIN_RATIO = 0.04;
const TELOP_VERTICAL_SCREEN_MARGIN_RATIO = 0.02;
const TELOP_FALLBACK_TEXT_AREA_RATIO = 0.98;
export const TELOP_LOWER_THIRD_ANCHOR_PERCENT = 67;
const TELOP_LOWER_THIRD_ANCHOR_RATIO = TELOP_LOWER_THIRD_ANCHOR_PERCENT / 100;
const TELOP_MIN_FONT_SIZE = 12;
const DEFAULT_FONT_SIZE = 64;
const DEFAULT_LINE_SPACING = 100;

const clamp = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

const normalizeSingleLineText = (rawText: string): string => {
  return (rawText || '')
    .replace(/\\n/g, '')
    .replace(/\r?\n/g, '')
    .trim();
};

const normalizeMultilineText = (rawText: string): string => {
  return (rawText || '').replace(/\\n/g, '\n');
};

export const buildTelopCssFontFamily = (fontFamily?: string): string => {
  if (!fontFamily) {
    return 'sans-serif';
  }
  return `'${fontFamily.replace(/'/g, "\\'")}', sans-serif`;
};

export const normalizeTelopSvgColor = (color?: string, opacity?: number): string | undefined => {
  if (!color || color === 'none' || color === 'transparent' || opacity === 0) {
    return undefined;
  }

  const normalizedOpacity = opacity !== undefined ? opacity / 100 : 1;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 6 && normalizedOpacity < 1) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${normalizedOpacity})`;
    }
    return color;
  }

  return color;
};

export const buildTelopTextRenderModel = ({
  text,
  fontFamily,
  fontSize,
  fontColor,
  borderColor = '#000000',
  borderWidth = 0,
  lineSpacing = DEFAULT_LINE_SPACING,
  glowColor,
  glowWidth = 0,
  glowOpacity = 100,
  maxCharsPerLine,
  singleLine = false,
  lineAlign = 'left'
}: TelopTextRenderModelInput): TelopTextRenderModel => {
  const normalizedText = singleLine ? normalizeSingleLineText(text) : normalizeMultilineText(text);
  const normalizedMaxChars = singleLine
    ? undefined
    : (typeof maxCharsPerLine === 'number' && Number.isFinite(maxCharsPerLine) && maxCharsPerLine > 0
      ? Math.max(1, Math.floor(maxCharsPerLine))
      : undefined);
  const visibleLines = singleLine
    ? [normalizedText]
    : breakTelopText(normalizedText, normalizedMaxChars);
  const safeFontSize = Math.max(TELOP_MIN_FONT_SIZE, Math.round(fontSize));
  const safeBorderWidth = Math.max(0, borderWidth);
  const safeGlowWidth = Math.max(0, glowWidth);
  const lineHeight = safeFontSize * (lineSpacing / 100);
  const totalStrokeWidth = Math.max(
    safeGlowWidth * 2 + safeBorderWidth * 2,
    safeBorderWidth * 2
  );
  const margin = totalStrokeWidth / 2;
  const safePadding = Math.max(2, Math.ceil(safeFontSize * TELOP_LAYOUT_SAFE_PADDING_RATIO));
  const lineSizes = visibleLines.map((line) => measureTextLine(line, safeFontSize, fontFamily, TELOP_FONT_WEIGHT));
  const maxLineWidth = lineSizes.reduce((maxWidth, lineSize) => Math.max(maxWidth, lineSize.width), 0);
  const maxLineHeight = lineSizes.reduce((maxHeight, lineSize) => Math.max(maxHeight, lineSize.height), safeFontSize);
  const lineCount = Math.max(1, visibleLines.length);
  const textBlockHeight = maxLineHeight + (lineCount - 1) * lineHeight;
  const svgWidth = Math.max(1, Math.ceil(margin * 2 + maxLineWidth + safePadding * 2));
  const svgHeight = Math.max(1, Math.ceil(margin * 2 + textBlockHeight + safePadding * 2));
  const textStartX = safePadding + margin;
  const lines = visibleLines.map((line, index) => {
    const lineWidth = lineSizes[index]?.width || measureTextLine(line, safeFontSize, fontFamily, TELOP_FONT_WEIGHT).width;
    const alignOffset = lineAlign === 'center'
      ? (maxLineWidth - lineWidth) / 2
      : lineAlign === 'right'
        ? maxLineWidth - lineWidth
        : 0;
    return {
      text: line,
      x: textStartX + alignOffset,
      y: safePadding + margin + index * lineHeight,
      width: lineWidth
    };
  });
  const resolvedGlowColor = normalizeTelopSvgColor(glowColor, glowOpacity);
  const glowStrokeWidth = safeGlowWidth * 2 + safeBorderWidth * 2;
  const borderStrokeWidth = safeBorderWidth * 2;

  return {
    lines,
    svgWidth,
    svgHeight,
    fontFamily,
    cssFontFamily: buildTelopCssFontFamily(fontFamily),
    fontWeight: TELOP_FONT_WEIGHT,
    fontSize: safeFontSize,
    fontColor,
    borderColor,
    borderWidth: safeBorderWidth,
    borderStrokeWidth,
    glowColor: resolvedGlowColor,
    glowWidth: safeGlowWidth,
    glowStrokeWidth,
    hasGlow: safeGlowWidth > 0 && !!resolvedGlowColor,
    hasBorder: safeBorderWidth > 0,
    lineHeight,
    margin,
    safePadding,
    maxLineWidth
  };
};

export const buildTelopRenderModel = ({
  text,
  style,
  position,
  maxCharsPerLine,
  singleLine = false,
  width,
  height,
  glowSeedHint
}: {
  text: string;
  style: TelopLayoutStyle;
  position: TelopLayoutPosition;
  maxCharsPerLine?: number;
  singleLine?: boolean;
  width: number;
  height: number;
  glowSeedHint?: string;
}): TelopRenderModel => {
  const areaWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const areaHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const resolvedStyle = resolveTelopGlowStyle(style, {
    text,
    slotId: position.slotId,
    seedHint: glowSeedHint
  }, 'fixed');
  const resolvedText = singleLine ? normalizeSingleLineText(text) : normalizeMultilineText(text);
  const baseFontSize = Math.max(TELOP_MIN_FONT_SIZE, Math.round(resolvedStyle.fontSize || DEFAULT_FONT_SIZE));
  const lineSpacing = resolvedStyle.lineSpacing ?? DEFAULT_LINE_SPACING;
  const baseBorderWidth = resolvedStyle.borderWidth ?? 0;
  const baseGlowWidth = resolvedStyle.glowWidth ?? 0;
  const horizontalSafeMargin = Math.max(4, Math.round(areaWidth * TELOP_HORIZONTAL_SCREEN_MARGIN_RATIO));
  const verticalSafeMargin = Math.max(4, Math.round(areaHeight * TELOP_VERTICAL_SCREEN_MARGIN_RATIO));
  const baseResolvedMaxChars = singleLine
    ? undefined
    : (typeof maxCharsPerLine === 'number' && Number.isFinite(maxCharsPerLine) && maxCharsPerLine > 0
      ? Math.max(1, Math.floor(maxCharsPerLine))
      : Math.max(1, Math.floor((Math.max(1, Math.floor(areaWidth * TELOP_FALLBACK_TEXT_AREA_RATIO)) / Math.max(1, baseFontSize)) * 2)));
  const measureWithFontSize = (currentFontSize: number): MeasuredTelopLayout => {
    const ratio = currentFontSize / baseFontSize;
    const borderWidth = Math.max(0, baseBorderWidth * ratio);
    const glowWidth = Math.max(0, baseGlowWidth * ratio);
    const effectiveMaxChars = singleLine ? undefined : baseResolvedMaxChars;
    const textModel = buildTelopTextRenderModel({
      text: resolvedText,
      fontFamily: resolvedStyle.fontFamily,
      fontSize: currentFontSize,
      fontColor: resolvedStyle.fontColor || '#ffffff',
      borderColor: resolvedStyle.borderColor || '#000000',
      borderWidth,
      lineSpacing,
      glowColor: resolvedStyle.glowColor,
      glowWidth,
      glowOpacity: resolvedStyle.glowOpacity,
      maxCharsPerLine: effectiveMaxChars,
      singleLine,
      lineAlign: position.alignment || 'left'
    });

    return {
      textModel,
      resolvedMaxChars: effectiveMaxChars
    };
  };

  let measured = measureWithFontSize(baseFontSize);
  const renderScale = 1;
  const displayWidth = measured.textModel.svgWidth;
  const displayHeight = measured.textModel.svgHeight;

  const userOffsetX = (position.offsetX ?? 0) / 100 * areaWidth;
  const userOffsetY = (position.offsetY ?? 0) / 100 * areaHeight;
  let top = 0;
  let left = 0;

  switch (position.preset) {
    case 'center':
      top = (areaHeight - displayHeight) / 2;
      left = (areaWidth - displayWidth) / 2;
      break;
    case 'bottom-center':
      top = areaHeight - displayHeight - verticalSafeMargin;
      left = (areaWidth - displayWidth) / 2;
      break;
    case 'top-center':
      top = verticalSafeMargin;
      left = (areaWidth - displayWidth) / 2;
      break;
    case 'lower-third':
      top = areaHeight * TELOP_LOWER_THIRD_ANCHOR_RATIO - displayHeight / 2;
      left = (areaWidth - displayWidth) / 2;
      break;
    case 'top-right':
      top = verticalSafeMargin;
      left = areaWidth - displayWidth - horizontalSafeMargin;
      break;
    default:
      top = (areaHeight - displayHeight) / 2;
      left = (areaWidth - displayWidth) / 2;
      break;
  }

  top += userOffsetY;
  left += userOffsetX;

  const minTop = verticalSafeMargin;
  const maxTop = Math.max(minTop, areaHeight - displayHeight - verticalSafeMargin);
  const minLeft = horizontalSafeMargin;
  const maxLeft = Math.max(minLeft, areaWidth - displayWidth - horizontalSafeMargin);

  return {
    text: measured.textModel,
    wrapper: {
      top: clamp(top, minTop, maxTop),
      left: clamp(left, minLeft, maxLeft),
      width: measured.textModel.svgWidth,
      height: measured.textModel.svgHeight,
      renderScale,
      displayWidth,
      displayHeight
    },
    resolvedText,
    resolvedStyle,
    resolvedMaxChars: measured.resolvedMaxChars
  };
};

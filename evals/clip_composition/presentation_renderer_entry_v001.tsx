import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AbsoluteFill,
  Composition,
  cancelRender,
  continueRender,
  delayRender,
  getInputProps,
  registerRoot,
  staticFile,
} from 'remotion';

import {TelopText} from '../../runner/src/remotion/components/TelopText';
import {measureTextLine} from '../../runner/src/telop/text-metrics';
import type {TelopTextRenderModel} from '../../runner/src/telop/telop-render-model';

export const PRESENTATION_RENDERER_OVERLAY_PROPS_SCHEMA_VERSION =
  'presentation-renderer-overlay-props-v001';

type IndexedCharacter = {
  sourceIndex: number;
  character: string;
  codePoint: number;
  role: 'visible' | 'source-line-break';
};

type IndexedLine = {
  lineIndex: number;
  characters: IndexedCharacter[];
  renderedText: string;
  text: string;
  codePointIndices: number[];
};

type VisualState = {
  stateId: string;
  textStyle: {
    fontAssetId: string;
    fontSizePx: number;
    fontColor: string;
    borderColor: string;
    borderWidthPx: number;
    lineSpacingPercent: number;
    glowColor: string;
    glowWidthPx: number;
    glowOpacityPercent: number;
  };
  position: {
    preset: 'center' | 'bottom-center' | 'top-center' | 'lower-third' | 'top-right';
    alignment: 'left' | 'center' | 'right';
    offsetXPercent: number;
    offsetYPercent: number;
  };
  background: null | {
    color: string;
    borderRadiusPx: number;
    paddingXPx: number;
    paddingYPx: number;
  };
  layout: {
    maxCharsPerLine: number;
    maxLines: number;
    singleLine: boolean;
  };
  transitionId: string;
};

type TrustedLayoutRules = {
  layoutRuleVersion: 'normal-landscape-render-layout-v001';
  fontWeight: number;
  minimumFontSizePx: number;
  textSafePaddingRatio: number;
  horizontalSafeMarginRatio: number;
  verticalSafeMarginRatio: number;
  fallbackTextAreaRatio: number;
  lowerThirdAnchorPercent: number;
  renderScale: number;
  characterWidthRule: string;
  borderStrokeWidthRule: string;
  glowStrokeWidthRule: string;
  marginRule: string;
  safePaddingRule: string;
  placementClampRule: string;
  humanReapprovalRule: string;
};

export type PresentationRendererOverlayPropsV001 = {
  schemaVersion: typeof PRESENTATION_RENDERER_OVERLAY_PROPS_SCHEMA_VERSION;
  canvas: {
    width: number;
    height: number;
    safeAreaPx: {top: number; right: number; bottom: number; left: number};
  };
  instructionId: string;
  text: string;
  indexedLines: IndexedLine[];
  visualState: VisualState;
  layoutRules: TrustedLayoutRules;
  fontFamilyName: string;
  fontFileName: string;
  inspectionLineIndex: number | null;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const rgbaWithOpacity = (color: string, opacityPercent: number): string | undefined => {
  if (!color || color === 'none' || color === 'transparent' || opacityPercent === 0) return undefined;
  if (!color.startsWith('#') || color.length !== 7 || opacityPercent === 100) return color;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacityPercent / 100})`;
};

const assertProps = (props: PresentationRendererOverlayPropsV001) => {
  if (props.schemaVersion !== PRESENTATION_RENDERER_OVERLAY_PROPS_SCHEMA_VERSION) {
    throw new Error('renderer overlay props schema mismatch');
  }
  if (
    props.fontFileName.length === 0
    || props.fontFileName.includes('/')
    || props.fontFileName.includes('\\')
    || props.fontFamilyName.length === 0
  ) throw new Error('unmanaged renderer font');
  if (props.visualState.textStyle.fontAssetId.length === 0) throw new Error('font asset id is missing');
  if (
    props.layoutRules?.layoutRuleVersion !== 'normal-landscape-render-layout-v001'
    || props.layoutRules.characterWidthRule !== 'U+0000..U+00FF=1; other Unicode code point=2'
    || props.layoutRules.borderStrokeWidthRule !== '2 * max(0, borderWidthPx)'
    || props.layoutRules.glowStrokeWidthRule !== '2 * max(0, glowWidthPx) + 2 * max(0, borderWidthPx)'
    || props.layoutRules.marginRule !== 'max(glowStrokeWidth, borderStrokeWidth) / 2'
    || props.layoutRules.safePaddingRule !== 'max(2, ceil(fontSizePx * textSafePaddingRatio))'
    || props.layoutRules.placementClampRule !== 'clamp full alpha bounds inside canvas safe margins'
    || !(props.layoutRules.fontWeight > 0)
    || !(props.layoutRules.minimumFontSizePx > 0)
    || !(props.layoutRules.textSafePaddingRatio >= 0)
    || !(props.layoutRules.horizontalSafeMarginRatio >= 0)
    || !(props.layoutRules.verticalSafeMarginRatio >= 0)
    || !(props.layoutRules.lowerThirdAnchorPercent >= 0)
    || !(props.layoutRules.lowerThirdAnchorPercent <= 100)
    || !(props.layoutRules.renderScale > 0)
  ) throw new Error('renderer layout rules mismatch');
  if (props.visualState.textStyle.fontSizePx < props.layoutRules.minimumFontSizePx) {
    throw new Error('renderer font size is below trusted minimum');
  }
  if (props.indexedLines.length === 0) throw new Error('indexed lines are missing');
  if (
    props.inspectionLineIndex !== null
    && (!Number.isInteger(props.inspectionLineIndex)
      || props.inspectionLineIndex < 0
      || props.inspectionLineIndex >= props.indexedLines.length)
  ) throw new Error('inspection line index is invalid');
  const source = Array.from(props.text);
  const observed: number[] = [];
  for (const [lineIndex, line] of props.indexedLines.entries()) {
    if (line.lineIndex !== lineIndex) throw new Error('line index order mismatch');
    const visibleCharacters = line.characters.filter((item) => item.role === 'visible');
    const renderedText = visibleCharacters.map((item) => item.character).join('');
    const visibleIndices = visibleCharacters.map((item) => item.sourceIndex);
    if (
      renderedText !== line.renderedText
      || renderedText !== line.text
      || JSON.stringify(visibleIndices) !== JSON.stringify(line.codePointIndices)
    ) throw new Error('rendered line mutates indexed characters');
    for (const item of line.characters) {
      const expectedRole = item.character === '\n' || item.character === '\r'
        ? 'source-line-break'
        : 'visible';
      if (
        source[item.sourceIndex] !== item.character
        || item.character.codePointAt(0) !== item.codePoint
        || item.role !== expectedRole
      ) throw new Error('indexed line mutates source text');
      observed.push(item.sourceIndex);
    }
  }
  if (observed.length !== source.length || observed.some((value, index) => value !== index)) {
    throw new Error('indexed lines do not preserve the complete source sequence');
  }
};

export const buildExactTextModel = (
  props: PresentationRendererOverlayPropsV001,
): {
  textModel: TelopTextRenderModel;
  wrapper: {
    top: number;
    left: number;
    width: number;
    height: number;
    contentOffsetX: number;
    contentOffsetY: number;
  };
} => {
  assertProps(props);
  const state = props.visualState;
  const style = state.textStyle;
  const layoutRules = props.layoutRules;
  const fontSize = style.fontSizePx;
  const borderWidth = style.borderWidthPx;
  const glowWidth = style.glowWidthPx;
  const lineHeight = fontSize * (style.lineSpacingPercent / 100);
  const totalStrokeWidth = Math.max(glowWidth * 2 + borderWidth * 2, borderWidth * 2);
  const margin = totalStrokeWidth / 2;
  const safePadding = Math.max(2, Math.ceil(fontSize * layoutRules.textSafePaddingRatio));
  const measured = props.indexedLines.map((line) =>
    measureTextLine(line.renderedText, fontSize, props.fontFamilyName, layoutRules.fontWeight),
  );
  const maxLineWidth = measured.reduce((maximum, item) => Math.max(maximum, item.width), 0);
  const maxLineHeight = measured.reduce((maximum, item) => Math.max(maximum, item.height), fontSize);
  const textBlockHeight = maxLineHeight + (props.indexedLines.length - 1) * lineHeight;
  const svgWidth = Math.max(1, Math.ceil(margin * 2 + maxLineWidth + safePadding * 2));
  const svgHeight = Math.max(1, Math.ceil(margin * 2 + textBlockHeight + safePadding * 2));
  const textStartX = safePadding + margin;
  const lines = props.indexedLines.map((line, index) => {
    const lineWidth = measured[index]?.width ?? 1;
    const alignmentOffset = state.position.alignment === 'center'
      ? (maxLineWidth - lineWidth) / 2
      : state.position.alignment === 'right'
        ? maxLineWidth - lineWidth
        : 0;
    return {
      text: line.renderedText,
      x: textStartX + alignmentOffset,
      y: safePadding + margin + index * lineHeight,
      width: lineWidth,
    };
  });
  const resolvedGlowColor = rgbaWithOpacity(style.glowColor, style.glowOpacityPercent);
  const textModel: TelopTextRenderModel = {
    lines,
    svgWidth,
    svgHeight,
    fontFamily: props.fontFamilyName,
    cssFontFamily: `'${props.fontFamilyName.replaceAll("'", "\\'")}'`,
    fontWeight: layoutRules.fontWeight,
    fontSize,
    fontColor: style.fontColor,
    borderColor: style.borderColor,
    borderWidth,
    borderStrokeWidth: borderWidth * 2,
    glowColor: resolvedGlowColor,
    glowWidth,
    glowStrokeWidth: glowWidth * 2 + borderWidth * 2,
    hasGlow: glowWidth > 0 && resolvedGlowColor !== undefined,
    hasBorder: borderWidth > 0,
    lineHeight,
    margin,
    safePadding,
    maxLineWidth,
  };

  // 背景板のpaddingも実alpha領域である。文字SVGだけで位置を決めると、
  // 描画時に背景板だけがsafe areaを越えるため、外枠全体を配置単位にする。
  const contentOffsetX = state.background?.paddingXPx ?? 0;
  const contentOffsetY = state.background?.paddingYPx ?? 0;
  const wrapperWidth = svgWidth + contentOffsetX * 2;
  const wrapperHeight = svgHeight + contentOffsetY * 2;

  const horizontalMargin = Math.max(
    4,
    Math.round(props.canvas.width * layoutRules.horizontalSafeMarginRatio),
  );
  const verticalMargin = Math.max(
    4,
    Math.round(props.canvas.height * layoutRules.verticalSafeMarginRatio),
  );
  const leftMargin = Math.max(horizontalMargin, props.canvas.safeAreaPx.left);
  const rightMargin = Math.max(horizontalMargin, props.canvas.safeAreaPx.right);
  const topMargin = Math.max(verticalMargin, props.canvas.safeAreaPx.top);
  const bottomMargin = Math.max(verticalMargin, props.canvas.safeAreaPx.bottom);
  const offsetX = (state.position.offsetXPercent / 100) * props.canvas.width;
  const offsetY = (state.position.offsetYPercent / 100) * props.canvas.height;
  let top: number;
  let left: number;
  switch (state.position.preset) {
    case 'center':
      top = (props.canvas.height - wrapperHeight) / 2;
      left = (props.canvas.width - wrapperWidth) / 2;
      break;
    case 'bottom-center':
      top = props.canvas.height - wrapperHeight - bottomMargin;
      left = (props.canvas.width - wrapperWidth) / 2;
      break;
    case 'top-center':
      top = topMargin;
      left = (props.canvas.width - wrapperWidth) / 2;
      break;
    case 'lower-third':
      top = props.canvas.height * (layoutRules.lowerThirdAnchorPercent / 100) - wrapperHeight / 2;
      left = (props.canvas.width - wrapperWidth) / 2;
      break;
    case 'top-right':
      top = topMargin;
      left = props.canvas.width - wrapperWidth - rightMargin;
      break;
    default:
      throw new Error('unsupported position preset');
  }
  top = clamp(
    top + offsetY,
    topMargin,
    Math.max(topMargin, props.canvas.height - wrapperHeight - bottomMargin),
  );
  left = clamp(
    left + offsetX,
    leftMargin,
    Math.max(leftMargin, props.canvas.width - wrapperWidth - rightMargin),
  );
  return {
    textModel,
    wrapper: {
      top,
      left,
      width: wrapperWidth,
      height: wrapperHeight,
      contentOffsetX,
      contentOffsetY,
    },
  };
};

const ExactOverlay: React.FC<PresentationRendererOverlayPropsV001> = (props) => {
  const [fontHandle] = useState(() => delayRender(`load-renderer-font:${props.fontFileName}`));
  const [fontReady, setFontReady] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadTrustedFont = async () => {
      try {
        const face = new FontFace(
          props.fontFamilyName,
          `url(${staticFile(`font/${props.fontFileName}`)})`,
          {weight: String(props.layoutRules.fontWeight)},
        );
        const loaded = await face.load();
        if (loaded.status !== 'loaded') throw new Error('font face status is not loaded');
        document.fonts.add(loaded);
        if (document.fonts?.ready) await document.fonts.ready;
        if (
          !document.fonts.has(loaded)
          || !document.fonts.check(
            `${props.layoutRules.fontWeight} 32px "${props.fontFamilyName}"`,
            '検査',
          )
        ) {
          throw new Error('PRESENTATION_FONT_FALLBACK_DETECTED:loaded font face is not active');
        }
        if (!cancelled) setFontReady(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith('PRESENTATION_FONT_FALLBACK_DETECTED:')) {
          throw new Error(message);
        }
        throw new Error(`PRESENTATION_FONT_LOAD_FAILED:${message}`);
      }
    };
    loadTrustedFont()
      .then(() => {
        if (!cancelled && !settled.current) {
          settled.current = true;
          continueRender(fontHandle);
        }
      })
      .catch((error) => {
        if (!cancelled && !settled.current) {
          settled.current = true;
          cancelRender(error instanceof Error ? error : new Error(String(error)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fontHandle, props.fontFamilyName, props.fontFileName, props.layoutRules.fontWeight]);

  const exact = useMemo(() => buildExactTextModel(props), [fontReady, props]);
  const background = props.visualState.background;
  const inspectionLineIndex = props.inspectionLineIndex;
  const renderModel = inspectionLineIndex === null
    ? exact.textModel
    : {
      ...exact.textModel,
      lines: [exact.textModel.lines[inspectionLineIndex]],
    };
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top: exact.wrapper.top,
    left: exact.wrapper.left,
    transform: `scale(${props.layoutRules.renderScale})`,
    transformOrigin: 'top left',
    ...(background ? {
      ...(inspectionLineIndex === null ? {background: background.color} : {}),
      borderRadius: background.borderRadiusPx,
      padding: `${background.paddingYPx}px ${background.paddingXPx}px`,
    } : {}),
  };

  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}} data-instruction-id={props.instructionId}>
      <div style={wrapperStyle}>
        <TelopText
          text={inspectionLineIndex === null
            ? props.text
            : props.indexedLines[inspectionLineIndex].renderedText}
          fontFamily={props.fontFamilyName}
          fontSize={exact.textModel.fontSize}
          fontColor={exact.textModel.fontColor}
          borderColor={exact.textModel.borderColor}
          borderWidth={exact.textModel.borderWidth}
          lineSpacing={props.visualState.textStyle.lineSpacingPercent}
          glowColor={exact.textModel.glowColor}
          glowWidth={exact.textModel.glowWidth}
          glowOpacity={props.visualState.textStyle.glowOpacityPercent}
          lineAlign={props.visualState.position.alignment}
          renderModel={renderModel}
        />
      </div>
    </AbsoluteFill>
  );
};

const OverlayFromInput: React.FC = () => {
  const props = getInputProps<PresentationRendererOverlayPropsV001>();
  return <ExactOverlay {...props} />;
};

const defaultProps: PresentationRendererOverlayPropsV001 = {
  schemaVersion: PRESENTATION_RENDERER_OVERLAY_PROPS_SCHEMA_VERSION,
  canvas: {
    width: 1920,
    height: 1080,
    safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80},
  },
  instructionId: 'default-not-for-output',
  text: '検査',
  indexedLines: [{
    lineIndex: 0,
    characters: [
      {sourceIndex: 0, character: '検', codePoint: 26908, role: 'visible'},
      {sourceIndex: 1, character: '査', codePoint: 26619, role: 'visible'},
    ],
    renderedText: '検査',
    text: '検査',
    codePointIndices: [0, 1],
  }],
  visualState: {
    stateId: 'default-not-for-output',
    textStyle: {
      fontAssetId: 'line-seed-jp-extra-bold-v001',
      fontSizePx: 96,
      fontColor: '#FFFFFF',
      borderColor: '#000000',
      borderWidthPx: 8,
      lineSpacingPercent: 150,
      glowColor: '#000000',
      glowWidthPx: 12,
      glowOpacityPercent: 82,
    },
    position: {preset: 'center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
    background: null,
    layout: {maxCharsPerLine: 36, maxLines: 2, singleLine: false},
    transitionId: 'quick-fade-4f-v001',
  },
  layoutRules: {
    layoutRuleVersion: 'normal-landscape-render-layout-v001',
    fontWeight: 800,
    minimumFontSizePx: 12,
    textSafePaddingRatio: 0.04,
    horizontalSafeMarginRatio: 0.04,
    verticalSafeMarginRatio: 0.02,
    fallbackTextAreaRatio: 0.98,
    lowerThirdAnchorPercent: 67,
    renderScale: 1,
    characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    borderStrokeWidthRule: '2 * max(0, borderWidthPx)',
    glowStrokeWidthRule: '2 * max(0, glowWidthPx) + 2 * max(0, borderWidthPx)',
    marginRule: 'max(glowStrokeWidth, borderStrokeWidth) / 2',
    safePaddingRule: 'max(2, ceil(fontSizePx * textSafePaddingRatio))',
    placementClampRule: 'clamp full alpha bounds inside canvas safe margins',
    humanReapprovalRule: 'Any numeric or formula change requires a new rendered preview and human approval before a new trust and renderer version may be activated.',
  },
  fontFamilyName: 'zev-renderer-line-seed-jp-extra-bold-v001',
  fontFileName: 'LINESeedJP_A_OTF_Eb.otf',
  inspectionLineIndex: null,
};

const RendererRoot: React.FC = () => (
  <Composition
    id="PresentationOverlayV001"
    component={OverlayFromInput}
    durationInFrames={1}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={defaultProps}
  />
);

registerRoot(RendererRoot);

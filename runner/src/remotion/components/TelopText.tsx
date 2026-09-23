import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { getTelopFontFaceStyles } from '../utils/telop-font';
import {
  buildTelopTextRenderModel,
  type TelopTextRenderModel
} from '../../telop/telop-render-model';

export type TelopForegroundSelection = {
  startLineIndex: number;
  startUtf16Offset: number;
  endLineIndex: number;
  endUtf16Offset: number;
  fontColor: string;
};

export type TelopTextProps = {
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontColor: string;
  borderColor?: string;
  borderWidth?: number;
  lineSpacing?: number;
  // グロー設定
  glowColor?: string;
  glowWidth?: number;
  glowOpacity?: number;
  maxCharsPerLine?: number;
  singleLine?: boolean;
  lineAlign?: 'left' | 'center' | 'right';
  renderModel?: TelopTextRenderModel;
  foregroundSelection?: TelopForegroundSelection;
  selectionReady?: boolean;
  onSelectionReady?: () => void;
  onSelectionError?: (error: Error) => void;
};

export const TelopText: React.FC<TelopTextProps> = (props) => {
  const {
    text,
    fontFamily,
    fontSize,
    fontColor,
    borderColor = '#000000',
    borderWidth = 0,
    lineSpacing = 100,
    // グロー
    glowColor,
    glowWidth = 0,
    glowOpacity = 100,
    maxCharsPerLine,
    singleLine = false,
    lineAlign = 'left',
    renderModel,
    foregroundSelection,
    selectionReady = false,
    onSelectionReady,
    onSelectionError
  } = props;
  const fillRefs = useRef<(SVGTextElement | null)[]>([]);

  const model = useMemo(() => {
    if (renderModel) {
      return renderModel;
    }
    return buildTelopTextRenderModel({
      text,
      fontFamily,
      fontSize,
      fontColor,
      borderColor,
      borderWidth,
      lineSpacing,
      glowColor,
      glowWidth,
      glowOpacity,
      maxCharsPerLine,
      singleLine,
      lineAlign
    });
  }, [
    renderModel,
    text,
    fontFamily,
    fontSize,
    fontColor,
    borderColor,
    borderWidth,
    lineSpacing,
    glowColor,
    glowWidth,
    glowOpacity,
    maxCharsPerLine,
    singleLine,
    lineAlign
  ]);

  useLayoutEffect(() => {
    if (!selectionReady) return;
    if (foregroundSelection === undefined) {
      onSelectionReady?.();
      return;
    }
    let range: Range | null = null;
    let selection: Selection | null = null;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    try {
      if (foregroundSelection !== undefined) {
        const start = fillRefs.current[foregroundSelection.startLineIndex]?.firstChild;
        const end = fillRefs.current[foregroundSelection.endLineIndex]?.firstChild;
        if (start?.nodeType !== Node.TEXT_NODE || end?.nodeType !== Node.TEXT_NODE) {
          throw new Error('foreground selection requires intact fill text nodes');
        }
        selection = window.getSelection();
        if (selection === null) throw new Error('native foreground selection is unavailable');
        range = document.createRange();
        range.setStart(start, foregroundSelection.startUtf16Offset);
        range.setEnd(end, foregroundSelection.endUtf16Offset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      // The first frame accepts the committed SVG and native Selection; the
      // next frame observes that paint before the overlay owner releases its
      // existing Remotion wait. This does not add a render pass or an image.
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => onSelectionReady?.());
      });
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      if (onSelectionError) onSelectionError(failure);
      else throw failure;
    }
    return () => {
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (range !== null && selection !== null) {
        for (let index = 0; index < selection.rangeCount; index += 1) {
          if (selection.getRangeAt(index) === range) {
            selection.removeRange(range);
            break;
          }
        }
      }
    };
  }, [foregroundSelection, selectionReady, onSelectionReady, onSelectionError, text]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: `${model.svgWidth}px`,
        height: `${model.svgHeight}px`
      }}
    >
      {/* フォント定義 */}
      <style dangerouslySetInnerHTML={{ __html: getTelopFontFaceStyles() }} />
      <style>{`.zev-telop-fill::selection { color: var(--zev-telop-selection-color); fill: var(--zev-telop-selection-color); background-color: transparent; text-shadow: none; }`}</style>
      {/* SVGテキスト */}
      <svg
        width={model.svgWidth}
        height={model.svgHeight}
        viewBox={`0 0 ${model.svgWidth} ${model.svgHeight}`}
        style={{ display: 'block', overflow: 'visible', position: 'relative', zIndex: 1 }}
      >
        {model.lines.map((line, i) => {
          return (
            <g key={i}>
              {/* グローレイヤー（最背面） */}
              {model.hasGlow && (
                <text
                  x={line.x}
                  y={line.y}
                  fontFamily={model.cssFontFamily}
                  fontSize={model.fontSize}
                  fontWeight={model.fontWeight}
                  fill="none"
                  stroke={model.glowColor}
                  strokeWidth={model.glowStrokeWidth}
                  strokeLinejoin="round"
                  dominantBaseline="text-before-edge"
                  style={{userSelect: 'none'}}
                >
                  {line.text}
                </text>
              )}
              {/* 縁取りレイヤー（中間） */}
              {model.hasBorder && (
                <text
                  x={line.x}
                  y={line.y}
                  fontFamily={model.cssFontFamily}
                  fontSize={model.fontSize}
                  fontWeight={model.fontWeight}
                  fill="none"
                  stroke={model.borderColor}
                  strokeWidth={model.borderStrokeWidth}
                  strokeLinejoin="round"
                  dominantBaseline="text-before-edge"
                  style={{userSelect: 'none'}}
                >
                  {line.text}
                </text>
              )}
              {/* 塗りレイヤー（最前面） */}
              <text
                ref={(node) => { fillRefs.current[i] = node; }}
                className="zev-telop-fill"
                data-telop-fill-line={i}
                x={line.x}
                y={line.y}
                fontFamily={model.cssFontFamily}
                fontSize={model.fontSize}
                fontWeight={model.fontWeight}
                fill={model.fontColor}
                dominantBaseline="text-before-edge"
                style={{
                  userSelect: 'text',
                  '--zev-telop-selection-color': foregroundSelection?.fontColor ?? model.fontColor,
                } as React.CSSProperties}
              >
                {line.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

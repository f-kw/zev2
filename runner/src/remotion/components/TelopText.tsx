import React, { useMemo } from 'react';
import { getTelopFontFaceStyles } from '../utils/telop-font';
import {
  buildTelopTextRenderModel,
  type TelopTextRenderModel
} from '../../telop/telop-render-model';

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
  // 旧プロパティ（互換性）
  shadowColor?: string;
  shadowBlur?: number;
  shadowOpacity?: number;
  maxCharsPerLine?: number;
  singleLine?: boolean;
  lineAlign?: 'left' | 'center' | 'right';
  renderModel?: TelopTextRenderModel;
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
    glowColor: glowColorProp,
    glowWidth: glowWidthProp,
    glowOpacity: glowOpacityProp,
    // 旧プロパティ
    shadowColor,
    shadowBlur,
    shadowOpacity,
    maxCharsPerLine,
    singleLine = false,
    lineAlign = 'left',
    renderModel
  } = props;

  // 旧プロパティから新プロパティへのマッピング
  const glowColor = glowColorProp ?? shadowColor;
  const glowWidth = glowWidthProp ?? (shadowBlur ? shadowBlur * 3 : 0);
  const glowOpacity = glowOpacityProp ?? shadowOpacity ?? 100;

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
                >
                  {line.text}
                </text>
              )}
              {/* 塗りレイヤー（最前面） */}
              <text
                x={line.x}
                y={line.y}
                fontFamily={model.cssFontFamily}
                fontSize={model.fontSize}
                fontWeight={model.fontWeight}
                fill={model.fontColor}
                dominantBaseline="text-before-edge"
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

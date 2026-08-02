import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender } from 'remotion';
import { TelopText } from '../components/TelopText';
import { ensureTelopFontLoaded, isManagedTelopFont } from '../utils/telop-font';
import { type TelopGlowColorMode } from '../../shared/telop-glow';
import { buildTelopRenderModel } from '../../telop/telop-render-model';
import '../styles/telop.css';

export type TelopStyle = {
  fontFamily?: string;
  fontSize: number;
  fontColor: string;
  borderColor?: string;
  borderWidth?: number;
  lineSpacing?: number;
  // グロー設定
  glowColor?: string;
  glowColorMode?: TelopGlowColorMode;
  glowWidth?: number;
  glowOpacity?: number;
};

export type TelopPosition = {
  preset: string;
  offsetX?: number;  // %単位（-50〜50）
  offsetY?: number;  // %単位（-50〜50）
  alignment?: 'left' | 'center' | 'right';
  slotId?: 'slotA' | 'slotB' | 'canvas' | 'slotC';
};

export type TelopBackground = {
  color: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
};

export type TelopFontFailurePolicy = 'strict-cancel' | 'preserve-existing-fallback';

export type TelopRendererProps = {
  text: string;
  style: TelopStyle;
  position: TelopPosition;
  background?: TelopBackground;
  maxCharsPerLine?: number;
  singleLine?: boolean;
  width: number;
  height: number;
  glowSeedHint?: string;
  inspectionLineIndex: number | null;
  fontFailurePolicy: TelopFontFailurePolicy;
};

export const TelopRenderer: React.FC<TelopRendererProps> = ({
  text,
  style,
  position,
  background,
  maxCharsPerLine,
  singleLine = false,
  width,
  height,
  glowSeedHint,
  inspectionLineIndex,
  fontFailurePolicy
}) => {
  const needsManagedFont = isManagedTelopFont(style.fontFamily);
  const [fontHandle] = useState<number | null>(() => (
    needsManagedFont ? delayRender('Loading telop layout font') : null
  ));
  const [fontReady, setFontReady] = useState(() => !needsManagedFont);
  const hasContinuedFontHandle = useRef(false);

  useEffect(() => {
    if (!needsManagedFont) {
      setFontReady(true);
      return;
    }

    let cancelled = false;

    // レイアウト計測前にフォント読み込みを揃える
    ensureTelopFontLoaded(style.fontFamily)
      .then(() => {
        if (
          fontFailurePolicy === 'strict-cancel'
          && typeof document !== 'undefined'
          && typeof document.fonts?.check === 'function'
          && !document.fonts.check(`800 32px "${style.fontFamily}"`)
        ) {
          throw new Error(`PRESENTATION_FONT_FALLBACK_DETECTED:${style.fontFamily ?? ''}`);
        }
      })
      .catch((error) => {
        if (fontFailurePolicy === 'strict-cancel') {
          const message = error instanceof Error ? error.message : String(error);
          cancelRender(new Error(
            message.includes('PRESENTATION_FONT_FALLBACK_DETECTED:')
              ? message
              : `PRESENTATION_FONT_LOAD_FAILED:${style.fontFamily ?? ''}:${message}`
          ));
          return;
        }
        console.error('Telop layout font load failed:', style.fontFamily, error);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setFontReady(true);
        if (fontHandle !== null && !hasContinuedFontHandle.current) {
          hasContinuedFontHandle.current = true;
          continueRender(fontHandle);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fontFailurePolicy, fontHandle, needsManagedFont, style.fontFamily]);

  const telopModel = useMemo(() => {
    // フォント読み込み完了後に同じ描画モデルを再計算する
    void fontReady;
    return buildTelopRenderModel({
      text,
      style,
      position,
      maxCharsPerLine,
      singleLine,
      width,
      height,
      glowSeedHint
    });
  }, [fontReady, text, style, position, maxCharsPerLine, singleLine, width, height, glowSeedHint]);

  const inspectionModel = useMemo(() => {
    if (inspectionLineIndex === null) {
      return telopModel.text;
    }
    if (
      !Number.isInteger(inspectionLineIndex)
      || inspectionLineIndex < 0
      || inspectionLineIndex >= telopModel.text.lines.length
    ) {
      throw new Error(`inspectionLineIndex is out of range: ${inspectionLineIndex}`);
    }
    return {
      ...telopModel.text,
      lines: [telopModel.text.lines[inspectionLineIndex]]
    };
  }, [inspectionLineIndex, telopModel.text]);

  const textWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${telopModel.wrapper.top}px`,
    left: `${telopModel.wrapper.left}px`,
    transform: `scale(${telopModel.wrapper.renderScale})`,
    transformOrigin: 'top left',
    ...(background ? {
      background: background.color,
      borderRadius: `${background.borderRadius}px`,
      padding: `${background.paddingY}px ${background.paddingX}px`
    } : {})
  };

  return (
    <AbsoluteFill className="telop-root">
      <div style={textWrapperStyle}>
        <TelopText
          text={inspectionLineIndex === null
            ? telopModel.resolvedText
            : telopModel.text.lines[inspectionLineIndex]?.text ?? ''}
          fontFamily={telopModel.text.fontFamily}
          fontSize={telopModel.text.fontSize}
          fontColor={telopModel.text.fontColor}
          borderColor={telopModel.text.borderColor}
          borderWidth={telopModel.text.borderWidth}
          lineSpacing={telopModel.resolvedStyle.lineSpacing}
          glowColor={telopModel.resolvedStyle.glowColor}
          glowWidth={telopModel.text.glowWidth}
          glowOpacity={telopModel.resolvedStyle.glowOpacity}
          lineAlign={position.alignment || 'left'}
          maxCharsPerLine={telopModel.resolvedMaxChars}
          singleLine={singleLine}
          renderModel={inspectionModel}
        />
      </div>
    </AbsoluteFill>
  );
};

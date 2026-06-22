import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { TelopRenderer } from './renderer/TelopRenderer';
import type { TelopGlowColorMode } from '../shared/telop-glow';

export type TelopStillProps = {
  text: string;
  style: {
    fontFamily: string;
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
  position: {
    preset: string;
    alignment?: 'left' | 'center' | 'right';
    slotId?: 'slotA' | 'slotB' | 'canvas' | 'slotC';
  };
  background?: {
    color: string;
    borderRadius: number;
    paddingX: number;
    paddingY: number;
  };
  maxCharsPerLine?: number;
  singleLine?: boolean;
  width?: number;
  height?: number;
  glowSeedHint?: string;
};

const TelopStill: React.FC<TelopStillProps> = () => {
  const props = getInputProps<TelopStillProps>();

  return (
    <TelopRenderer
      text={props.text}
      style={props.style}
      position={props.position}
      background={props.background}
      maxCharsPerLine={props.maxCharsPerLine}
      singleLine={props.singleLine}
      width={props.width ?? 1920}
      height={props.height ?? 1080}
      glowSeedHint={props.glowSeedHint}
    />
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TelopStill"
        component={TelopStill}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={({ props }) => {
          const typedProps = props as TelopStillProps;
          return {
            props: typedProps,
            width: typedProps.width ?? 1920,
            height: typedProps.height ?? 1080
          };
        }}
        defaultProps={{
          text: 'サンプルテキスト',
          style: {
            fontFamily: 'LINESeedJP_A_OTF_Bd.otf',
            fontSize: 120,
            fontColor: '#ffffff',
            borderColor: '#000000',
            borderWidth: 3,
            lineSpacing: 50,
            glowColor: '#000000',
            glowColorMode: 'fixed',
            glowWidth: 20,
            glowOpacity: 100
          },
          position: {
            preset: 'center'
          },
          background: undefined,
          maxCharsPerLine: 16,
          singleLine: false,
          width: 1920,
          height: 1080,
          glowSeedHint: 'default'
        }}
      />
    </>
  );
};

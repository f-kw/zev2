import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { recordValue as recordFrom } from '@zev2/shared';

export type TelopGlowColorMode = 'fixed' | 'randomBright';

export type TelopBackgroundStyle = {
  color: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
};

export type TelopPositionStyle = {
  preset: string;
  alignment?: 'left' | 'center' | 'right';
};

export type TelopVisualStyle = {
  comment?: string;
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
  maxCharsPerLine?: number;
  maxLines?: number;
  position: TelopPositionStyle;
  background?: TelopBackgroundStyle;
};

export type TelopStyleProfile = {
  schemaVersion: number;
  profileId: string;
  profileName: string;
  defaultStyleId: string;
  styles: Record<string, TelopVisualStyle>;
};

export type ResolvedTelopStyle = TelopVisualStyle & {
  styleId: string;
};

function workspaceRoot(): string {
  const current = process.cwd();
  if (path.basename(current) === 'runner') {
    return path.resolve(current, '..');
  }
  return current;
}

function defaultProfilePath(): string {
  return process.env.ZEV2_TELOP_PROFILE_PATH
    ? path.resolve(process.env.ZEV2_TELOP_PROFILE_PATH)
    : path.join(workspaceRoot(), 'runner', 'data', 'telop-profiles', 'default.json');
}

function normalizeStyle(value: unknown, label: string): TelopVisualStyle {
  const record = recordFrom(value);
  const position = recordFrom(record.position);
  const background = record.background ? recordFrom(record.background) : undefined;
  const fontSize = Number(record.fontSize);

  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    throw new Error(`${label} のテロップ文字サイズが不正です`);
  }
  if (typeof record.fontColor !== 'string' || !record.fontColor.trim()) {
    throw new Error(`${label} のテロップ文字色がありません`);
  }

  return {
    ...(typeof record.comment === 'string' ? { comment: record.comment } : {}),
    ...(typeof record.fontFamily === 'string' && record.fontFamily.trim() ? { fontFamily: record.fontFamily.trim() } : {}),
    fontSize: Math.round(fontSize),
    fontColor: record.fontColor.trim(),
    ...(typeof record.borderColor === 'string' && record.borderColor.trim() ? { borderColor: record.borderColor.trim() } : {}),
    ...(Number.isFinite(Number(record.borderWidth)) ? { borderWidth: Math.max(0, Number(record.borderWidth)) } : {}),
    ...(Number.isFinite(Number(record.lineSpacing)) ? { lineSpacing: Number(record.lineSpacing) } : {}),
    ...(typeof record.glowColor === 'string' && record.glowColor.trim() ? { glowColor: record.glowColor.trim() } : {}),
    ...(record.glowColorMode === 'fixed' || record.glowColorMode === 'randomBright' ? { glowColorMode: record.glowColorMode } : {}),
    ...(Number.isFinite(Number(record.glowWidth)) ? { glowWidth: Math.max(0, Number(record.glowWidth)) } : {}),
    ...(Number.isFinite(Number(record.glowOpacity)) ? { glowOpacity: Math.max(0, Math.min(100, Number(record.glowOpacity))) } : {}),
    ...(Number.isFinite(Number(record.maxCharsPerLine)) ? { maxCharsPerLine: Math.max(1, Math.floor(Number(record.maxCharsPerLine))) } : {}),
    ...(Number.isFinite(Number(record.maxLines)) ? { maxLines: Math.max(1, Math.floor(Number(record.maxLines))) } : {}),
    position: {
      preset: typeof position.preset === 'string' && position.preset.trim() ? position.preset.trim() : 'bottom-center',
      ...(position.alignment === 'left' || position.alignment === 'center' || position.alignment === 'right'
        ? { alignment: position.alignment }
        : {})
    },
    ...(background ? {
      background: {
        color: typeof background.color === 'string' && background.color.trim() ? background.color.trim() : 'rgba(0,0,0,0.72)',
        borderRadius: Number.isFinite(Number(background.borderRadius)) ? Math.max(0, Number(background.borderRadius)) : 0,
        paddingX: Number.isFinite(Number(background.paddingX)) ? Math.max(0, Number(background.paddingX)) : 0,
        paddingY: Number.isFinite(Number(background.paddingY)) ? Math.max(0, Number(background.paddingY)) : 0
      }
    } : {})
  };
}

export async function loadTelopStyleProfile(): Promise<TelopStyleProfile> {
  const raw = await readFile(defaultProfilePath(), 'utf8');
  const parsed = recordFrom(JSON.parse(raw));
  const stylesRecord = recordFrom(parsed.styles);
  const styles = Object.fromEntries(
    Object.entries(stylesRecord).map(([styleId, style]) => [styleId, normalizeStyle(style, styleId)])
  );

  if (Object.keys(styles).length === 0) {
    throw new Error('テロッププロファイルにスタイルがありません');
  }

  const defaultStyleId = typeof parsed.defaultStyleId === 'string' && styles[parsed.defaultStyleId]
    ? parsed.defaultStyleId
    : Object.keys(styles)[0];

  return {
    schemaVersion: Number(parsed.schemaVersion) || 1,
    profileId: typeof parsed.profileId === 'string' && parsed.profileId.trim() ? parsed.profileId.trim() : 'default',
    profileName: typeof parsed.profileName === 'string' && parsed.profileName.trim() ? parsed.profileName.trim() : 'Default telop profile',
    defaultStyleId,
    styles
  };
}

export function resolveTelopStyle(profile: TelopStyleProfile, requestedStyleId?: string): ResolvedTelopStyle {
  const styleId = requestedStyleId && profile.styles[requestedStyleId]
    ? requestedStyleId
    : profile.defaultStyleId;
  const style = profile.styles[styleId] ?? profile.styles[Object.keys(profile.styles)[0]];
  if (!style) {
    throw new Error('使用できるテロップスタイルがありません');
  }

  return {
    ...style,
    styleId
  };
}

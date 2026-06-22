export type TelopGlowColorMode = 'fixed' | 'randomBright';

export type TelopGlowStyleFields = {
  glowColor?: string;
  glowColorMode?: TelopGlowColorMode;
  glowWidth?: number;
  glowOpacity?: number;
};

export type TelopGlowSeedContext = {
  text?: string;
  type?: string;
  startTimeMs?: number;
  endTimeMs?: number;
  slotId?: string;
  seedHint?: string;
};

const DEFAULT_FIXED_GLOW_COLOR = '#ffffff';

// 明るさを落とさない候補だけに絞り、背景上で沈みにくい色を使う
export const RANDOM_BRIGHT_GLOW_COLORS = [
  '#ffffff',
  '#fff4a3',
  '#ffd2f6',
  '#bcecff',
  '#c7ffb8',
  '#ffd7a8',
  '#d7c5ff',
  '#ffc2c2',
  '#c8fff4',
  '#ffe1a6'
] as const;

export function normalizeTelopGlowColorMode(
  value: unknown,
  fallback: TelopGlowColorMode = 'fixed'
): TelopGlowColorMode {
  if (value === 'fixed' || value === 'randomBright') {
    return value;
  }
  return fallback;
}

// 描画経路が変わっても同じ入力から同じ候補を引けるよう、単純な固定ハッシュを使う
function hashTextToSeed(source: string): number {
  let hash = 2166136261;
  for (const char of source) {
    const codePoint = char.codePointAt(0) || 0;
    hash ^= codePoint;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildGlowSeed(context: TelopGlowSeedContext): string {
  if (context.seedHint && context.seedHint.trim().length > 0) {
    return context.seedHint.trim();
  }
  return [
    context.type || '',
    (context.text || '').replace(/\s+/g, ' ').trim(),
    Number.isFinite(context.startTimeMs) ? String(context.startTimeMs) : '',
    Number.isFinite(context.endTimeMs) ? String(context.endTimeMs) : '',
    context.slotId || ''
  ].join('|');
}

export function normalizeTelopGlowStyle<T extends TelopGlowStyleFields>(
  style: T,
  fallbackMode: TelopGlowColorMode = 'fixed'
): T & { glowColorMode: TelopGlowColorMode; glowColor: string } {
  const mode = normalizeTelopGlowColorMode(style?.glowColorMode, fallbackMode);
  const glowColor = typeof style?.glowColor === 'string' && style.glowColor.trim().length > 0
    ? style.glowColor
    : DEFAULT_FIXED_GLOW_COLOR;

  return {
    ...style,
    glowColorMode: mode,
    glowColor
  };
}

export function resolveTelopGlowColor(
  style: TelopGlowStyleFields | undefined,
  context: TelopGlowSeedContext
): string {
  const normalized = normalizeTelopGlowStyle(style || {}, 'fixed');
  if (normalized.glowColorMode === 'fixed') {
    return normalized.glowColor;
  }

  const seed = hashTextToSeed(buildGlowSeed(context));
  return RANDOM_BRIGHT_GLOW_COLORS[seed % RANDOM_BRIGHT_GLOW_COLORS.length] || DEFAULT_FIXED_GLOW_COLOR;
}

export function resolveTelopGlowStyle<T extends TelopGlowStyleFields>(
  style: T,
  context: TelopGlowSeedContext,
  fallbackMode: TelopGlowColorMode = 'fixed'
): T & { glowColorMode: TelopGlowColorMode; glowColor: string } {
  const normalized = normalizeTelopGlowStyle(style, fallbackMode);
  return {
    ...normalized,
    glowColor: resolveTelopGlowColor(normalized, context)
  };
}

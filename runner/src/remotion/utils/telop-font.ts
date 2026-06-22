import { staticFile } from 'remotion';

export const AVAILABLE_TELOP_FONTS = [
  'LINESeedJP_A_OTF_Bd.otf',
  'LINESeedJP_A_OTF_Eb.otf',
  'LINESeedJP_A_OTF_Rg.otf',
  'LINESeedJP_A_OTF_Th.otf',
  'MochiyPopOne-Regular.ttf',
  'ShipporiMincho-Bold.ttf',
];

const fontLoadPromises = new Map<string, Promise<void>>();

export function isManagedTelopFont(fontFamily?: string): fontFamily is string {
  return !!fontFamily && AVAILABLE_TELOP_FONTS.includes(fontFamily);
}

export function getTelopFontFaceStyles(): string {
  return AVAILABLE_TELOP_FONTS.map((font) => `
  @font-face {
    font-family: '${font}';
    src: url('${staticFile(`font/${font}`)}');
    font-display: block;
  }
`).join('\n');
}

// Remotion の計測と SVG 描画で同じフォント状態を使う
export async function ensureTelopFontLoaded(fontFamily?: string): Promise<void> {
  if (!isManagedTelopFont(fontFamily) || typeof document === 'undefined') {
    return;
  }
  const managedFontFamily = fontFamily;

  const cachedPromise = fontLoadPromises.get(managedFontFamily);
  if (cachedPromise) {
    await cachedPromise;
    return;
  }

  const loadPromise = (async () => {
    if (typeof document.fonts?.check === 'function' && document.fonts.check(`800 32px "${managedFontFamily}"`)) {
      return;
    }

    const font = new FontFace(managedFontFamily, `url(${staticFile(`font/${managedFontFamily}`)})`);
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  })().catch((error) => {
    fontLoadPromises.delete(managedFontFamily);
    throw error;
  });

  fontLoadPromises.set(managedFontFamily, loadPromise);
  await loadPromise;
}

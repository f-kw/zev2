// Original local vector artwork for the finite Panel variants. These SVGs are
// repository-owned output assets: no downloaded images, fonts, scripts or URLs.
// Geometry uses the existing Panel padding (24px / 16px) as the drawing grid.
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
export const PRESENTATION_PANEL_ASSETS_V002 = freeze({
  'graph-paper': {
    assetId: 'zev-panel-graph-paper-v001',
    origin: 'Original SVG authored locally for HRC-002, 2026-09-20; no external material.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#FFFDF8"/><path d="M0 0H48M0 24H48M0 48H48M0 0V48M24 0V48M48 0V48" fill="none" stroke="#CBD5E1" stroke-width="1"/></svg>',
    sizing: 'tile',
  },
  'comic-frame': {
    assetId: 'zev-panel-comic-frame-v001',
    origin: 'Original SVG authored locally for HRC-002, 2026-09-20; no external material.',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="96" viewBox="0 0 192 96" preserveAspectRatio="none"><rect width="192" height="96" fill="#FFFDF8"/><path d="M0 0H48L24 16H0ZM192 0H144L168 16H192ZM0 96H48L24 80H0ZM192 96H144L168 80H192Z" fill="#111827"/><path d="M48 8H144M48 88H144M8 32V64M184 32V64" stroke="#111827" stroke-width="2" fill="none"/></svg>',
    sizing: 'stretch',
  },
});

const textStyle = {fontColor: '#111827', borderWidthPx: 0, glowWidthPx: 0};
const background = {color: '#FFFDF8', borderRadiusPx: 0, paddingXPx: 24, paddingYPx: 16};
export const PRESENTATION_PANEL_PRESETS_V002 = freeze({
  'provisional-panel': {id: 'plain', label: 'Panel（無地）', textStyle, background: {...background, panelPresetId: 'plain'}},
  'provisional-panel-graph-paper': {id: 'graph-paper', label: 'Panel（方眼紙）', textStyle,
    background: {...background, panelPresetId: 'graph-paper'}},
  'provisional-panel-comic-frame': {id: 'comic-frame', label: 'Panel（コミック枠）', textStyle,
    background: {...background, panelPresetId: 'comic-frame'}},
});
export function getPresentationPanelPresetV002(presentation) {
  if (!Object.hasOwn(PRESENTATION_PANEL_PRESETS_V002, presentation)) throw new TypeError('unknown finite Panel preset');
  return PRESENTATION_PANEL_PRESETS_V002[presentation];
}

// The legacy tables above are part of the saved v008 rendering identity. Keep
// them unchanged: an explicit palette is a new finite choice, never a rewrite
// of an already fixed Panel or of its local SVG artwork.
export const PRESENTATION_PANEL_PALETTES_V003 = freeze({
  ivory: {id: 'ivory', label: 'アイボリー', fontColor: '#111827', backgroundColor: '#FFFDF8', lineColor: '#CBD5E1'},
  cool: {id: 'cool', label: '寒色', fontColor: '#142B49', backgroundColor: '#EAF4FF', lineColor: '#A8BDD4'},
  warm: {id: 'warm', label: '暖色', fontColor: '#4B2C16', backgroundColor: '#FFF0DC', lineColor: '#D6B391'},
  dark: {id: 'dark', label: '暗地', fontColor: '#F8FAFC', backgroundColor: '#172338', lineColor: '#42536F'},
});
export const PRESENTATION_PANEL_ALLOWED_PALETTES_V003 = freeze({
  plain: ['ivory', 'cool', 'warm', 'dark'],
  'graph-paper': ['ivory', 'cool', 'warm', 'dark'],
});

/** Resolve only a managed background and its explicitly allowed palette. */
export function getPresentationPanelPalettePresetV003(presentation, paletteId) {
  const preset = getPresentationPanelPresetV002(presentation);
  const allowed = PRESENTATION_PANEL_ALLOWED_PALETTES_V003[preset.id];
  if (!allowed?.includes(paletteId)) throw new TypeError('unknown or unavailable finite Panel palette');
  const palette = PRESENTATION_PANEL_PALETTES_V003[paletteId];
  return freeze({...preset, paletteId, label: `${preset.label} / ${palette.label}`,
    textStyle: {...preset.textStyle, fontColor: palette.fontColor},
    background: {...preset.background, color: palette.backgroundColor, panelPaletteId: paletteId}});
}

export function isPresentationPanelBackgroundV002(value) {
  if (!value || !Object.hasOwn(value, 'panelPresetId')) {
    if (value && Object.hasOwn(value, 'panelPaletteId')) throw new TypeError('Panel palette requires a managed background');
    return false;
  }
  const preset = Object.values(PRESENTATION_PANEL_PRESETS_V002).find(row => row.id === value.panelPresetId);
  const managed = preset && Object.hasOwn(value, 'panelPaletteId')
    ? getPresentationPanelPalettePresetV003(Object.keys(PRESENTATION_PANEL_PRESETS_V002)
      .find(key => PRESENTATION_PANEL_PRESETS_V002[key] === preset), value.panelPaletteId) : preset;
  const expected = value.inspectionPlateOmitted === true
    ? {...managed?.background, color: 'transparent', inspectionPlateOmitted: true} : managed?.background;
  if (!managed || Object.keys(value).length !== Object.keys(expected).length
    || Object.entries(expected).some(([key, expected]) => value[key] !== expected)) {
    throw new TypeError('Panel background must match a finite managed preset');
  }
  return true;
}
export function getPresentationPanelAssetV002(background) {
  if (!isPresentationPanelBackgroundV002(background) || background.panelPresetId === 'plain'
    || background.inspectionPlateOmitted === true) return null;
  const asset = PRESENTATION_PANEL_ASSETS_V002[background.panelPresetId];
  if (!Object.hasOwn(background, 'panelPaletteId')) {
    return {...asset, dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`};
  }
  const palette = PRESENTATION_PANEL_PALETTES_V003[background.panelPaletteId];
  // Only the existing graph's two fixed colors change. Geometry, sizing and
  // local provenance are retained; callers cannot supply SVG or color values.
  const svg = asset.svg.replaceAll('#FFFDF8', palette.backgroundColor).replaceAll('#CBD5E1', palette.lineColor);
  return {...asset, assetId: `${asset.assetId}-${palette.id}`, svg,
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`};
}
/** Internal counterfactual only; this marker is never an accepted saved choice. */
export function omitPresentationPanelPlateForInspectionV002(background) {
  if (!isPresentationPanelBackgroundV002(background)) throw new TypeError('managed Panel required for inspection');
  return {...background, color: 'transparent', inspectionPlateOmitted: true};
}

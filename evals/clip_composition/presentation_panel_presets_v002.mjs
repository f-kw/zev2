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
export function isPresentationPanelBackgroundV002(value) {
  if (!value || !Object.hasOwn(value, 'panelPresetId')) return false;
  const preset = Object.values(PRESENTATION_PANEL_PRESETS_V002).find(row => row.id === value.panelPresetId);
  const expected = value.inspectionPlateOmitted === true
    ? {...preset?.background, color: 'transparent', inspectionPlateOmitted: true} : preset?.background;
  if (!preset || Object.keys(value).length !== Object.keys(expected).length
    || Object.entries(expected).some(([key, expected]) => value[key] !== expected)) {
    throw new TypeError('Panel background must match a finite managed preset');
  }
  return true;
}
export function getPresentationPanelAssetV002(background) {
  if (!isPresentationPanelBackgroundV002(background) || background.panelPresetId === 'plain'
    || background.inspectionPlateOmitted === true) return null;
  const asset = PRESENTATION_PANEL_ASSETS_V002[background.panelPresetId];
  return {...asset, dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`};
}
/** Internal counterfactual only; this marker is never an accepted saved choice. */
export function omitPresentationPanelPlateForInspectionV002(background) {
  if (!isPresentationPanelBackgroundV002(background)) throw new TypeError('managed Panel required for inspection');
  return {...background, color: 'transparent', inspectionPlateOmitted: true};
}

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {
  PRESENTATION_PANEL_ASSETS_V002, PRESENTATION_PANEL_PRESETS_V002,
  PRESENTATION_PANEL_PALETTES_V003, PRESENTATION_PANEL_ALLOWED_PALETTES_V003,
  getPresentationPanelPresetV002, getPresentationPanelPalettePresetV003,
  isPresentationPanelBackgroundV002, getPresentationPanelAssetV002,
  omitPresentationPanelPlateForInspectionV002,
} from './presentation_panel_presets_v002.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const presentations = ['provisional-panel', 'provisional-panel-graph-paper'];
const expectedColors = {
  ivory: ['#FFFDF8', '#111827', '#CBD5E1'],
  cool: ['#EAF4FF', '#142B49', '#A8BDD4'],
  warm: ['#FFF0DC', '#4B2C16', '#D6B391'],
  dark: ['#172338', '#F8FAFC', '#42536F'],
};

test('saved legacy Panel table, local artwork and bare-background behavior remain exact', () => {
  assert.equal(hash(PRESENTATION_PANEL_ASSETS_V002), 'e02750612216a26a5ad7007abf975b33c4b5229c58f174968666f411c0db1d47');
  assert.equal(hash(PRESENTATION_PANEL_PRESETS_V002), '477886ed9ff07c7e9f3a7946ddf375fb8e0bc5701588370d4cfd4ad5b7a51bdd');
  for (const [presentation, saved] of Object.entries(PRESENTATION_PANEL_PRESETS_V002)) {
    const preset = getPresentationPanelPresetV002(presentation);
    assert.strictEqual(preset, saved);
    assert.equal(isPresentationPanelBackgroundV002(preset.background), true);
    assert.equal(Object.hasOwn(preset.background, 'panelPaletteId'), false);
    const asset = getPresentationPanelAssetV002(preset.background);
    if (preset.id === 'plain') assert.equal(asset, null);
    else {
      const {dataUrl, ...sourceAsset} = asset;
      assert.deepEqual(sourceAsset, PRESENTATION_PANEL_ASSETS_V002[preset.id]);
      assert.equal(decodeURIComponent(dataUrl.split(',')[1]), sourceAsset.svg);
    }
  }
});

test('both supported backgrounds have four fixed text/background/line bindings with unchanged geometry', () => {
  assert.deepEqual(Object.keys(PRESENTATION_PANEL_PALETTES_V003), Object.keys(expectedColors));
  assert.deepEqual(Object.keys(PRESENTATION_PANEL_ALLOWED_PALETTES_V003), ['plain', 'graph-paper']);
  for (const presentation of presentations) for (const [paletteId, colors] of Object.entries(expectedColors)) {
    const old = getPresentationPanelPresetV002(presentation);
    const preset = getPresentationPanelPalettePresetV003(presentation, paletteId);
    assert.deepEqual(PRESENTATION_PANEL_ALLOWED_PALETTES_V003[old.id], Object.keys(expectedColors));
    assert.equal(preset.paletteId, paletteId);
    assert.equal(preset.background.color, colors[0]);
    assert.equal(preset.textStyle.fontColor, colors[1]);
    assert.equal(PRESENTATION_PANEL_PALETTES_V003[paletteId].lineColor, colors[2]);
    const {color, panelPaletteId, ...geometry} = preset.background;
    const {color: oldColor, ...oldGeometry} = old.background;
    assert.deepEqual(geometry, oldGeometry);
    assert.deepEqual({...preset.textStyle, fontColor: old.textStyle.fontColor}, old.textStyle);
    assert.equal(isPresentationPanelBackgroundV002(preset.background), true);
    assert.ok(Object.isFrozen(preset) && Object.isFrozen(preset.background) && Object.isFrozen(preset.textStyle));
    const asset = getPresentationPanelAssetV002(preset.background);
    if (old.id === 'plain') assert.equal(asset, null);
    else {
      const original = PRESENTATION_PANEL_ASSETS_V002['graph-paper'];
      assert.equal(asset.svg, original.svg.replaceAll('#FFFDF8', colors[0]).replaceAll('#CBD5E1', colors[2]));
      assert.equal(asset.svg.replaceAll(colors[0], '#FFFDF8').replaceAll(colors[2], '#CBD5E1'), original.svg);
      assert.equal(asset.origin, original.origin);
      assert.equal(asset.sizing, original.sizing);
      assert.equal(decodeURIComponent(asset.dataUrl.split(',')[1]), asset.svg);
      assert.doesNotMatch(asset.svg, /(?:href|script|image|foreignObject)\b/);
    }
  }
});

test('explicit ivory reproduces all old drawing values and graph pixels while retaining its identity', () => {
  for (const presentation of presentations) {
    const old = getPresentationPanelPresetV002(presentation);
    const explicit = getPresentationPanelPalettePresetV003(presentation, 'ivory');
    const {panelPaletteId, ...background} = explicit.background;
    assert.equal(panelPaletteId, 'ivory');
    assert.deepEqual(background, old.background);
    assert.deepEqual(explicit.textStyle, old.textStyle);
    assert.equal(getPresentationPanelAssetV002(explicit.background)?.svg, getPresentationPanelAssetV002(old.background)?.svg);
  }
});

test('unavailable palettes, new comic colors and arbitrary drawing fields are rejected', () => {
  for (const paletteId of [undefined, null, '', 'sepia', '#FFFFFF', {}, ...Object.keys(expectedColors)]) {
    assert.throws(() => getPresentationPanelPalettePresetV003('provisional-panel-comic-frame', paletteId), /finite Panel palette/);
  }
  for (const paletteId of [undefined, null, '', 'sepia', '#FFFFFF', {}]) {
    assert.throws(() => getPresentationPanelPalettePresetV003('provisional-panel', paletteId), /finite Panel palette/);
  }
  const background = getPresentationPanelPalettePresetV003('provisional-panel-graph-paper', 'dark').background;
  const invalid = [
    {...background, color: '#FFFFFF'}, {...background, lineColor: '#FFFFFF'},
    {...background, paddingXPx: 25}, {...background, borderRadiusPx: 1},
    {...background, imagePath: '/arbitrary.svg'}, {...background, svg: '<svg />'},
    {...background, panelPaletteId: 'ivory'}, {...background, panelPaletteId: undefined},
    {...background, panelPresetId: 'comic-frame'}, {...background, inspectionPlateOmitted: false},
    {panelPaletteId: 'dark'}, {...background, color: 'transparent', inspectionPlateOmitted: true, paddingYPx: 17},
  ];
  for (const value of invalid) {
    assert.throws(() => isPresentationPanelBackgroundV002(value), /Panel/);
    assert.throws(() => getPresentationPanelAssetV002(value), /Panel/);
    assert.throws(() => omitPresentationPanelPlateForInspectionV002(value), /Panel/);
  }
  for (const value of [undefined, null, {}, {color: '#000000'}]) assert.equal(isPresentationPanelBackgroundV002(value), false);
});

test('counterfactual inspection removes only the plate and retains the chosen background/palette identity', () => {
  for (const presentation of presentations) for (const paletteId of Object.keys(expectedColors)) {
    const preset = getPresentationPanelPalettePresetV003(presentation, paletteId);
    const before = structuredClone(preset);
    const omitted = omitPresentationPanelPlateForInspectionV002(preset.background);
    assert.deepEqual(omitted, {...preset.background, color: 'transparent', inspectionPlateOmitted: true});
    assert.equal(isPresentationPanelBackgroundV002(omitted), true);
    assert.equal(getPresentationPanelAssetV002(omitted), null);
    assert.deepEqual(preset, before);
  }
});

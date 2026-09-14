import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const dir = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001';
const read = async file => JSON.parse(await readFile(path.resolve(root, file), 'utf8'));
const sha = async file => createHash('sha256').update(await readFile(path.resolve(root, file))).digest('hex');
const bind = async file => ({path: file, fileSha256: await sha(file)});
const require = createRequire(import.meta.url);
const r = createRequire(require.resolve('@remotion/cli/package.json'));
const t = createRequire(require.resolve('tsx/package.json'));
const {openBrowser} = r('@remotion/renderer');
const {build} = t('esbuild');
const a = await read(`${dir}/measurement.json`);
const props = await read(a.propsBinding.path);
assert.equal(await sha(a.propsBinding.path), a.propsBinding.fileSha256);
assert.equal(await sha(a.fontBinding.path), a.fontBinding.fileSha256);
assert.equal(await sha(a.chromiumBinding.path), a.chromiumBinding.fileSha256);
const fontUrl = `data:font/otf;base64,${(await readFile(path.resolve(root, a.fontBinding.path))).toString('base64')}`;
const compiled = await build({stdin: {contents: `
  import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {TelopText} from './runner/src/remotion/components/TelopText.tsx';
  export function markup(props, exact) {
    const text = React.createElement(TelopText, {text: props.text, fontFamily: props.fontFamilyName,
      fontSize: exact.textModel.fontSize, fontColor: exact.textModel.fontColor,
      borderColor: exact.textModel.borderColor, borderWidth: exact.textModel.borderWidth,
      lineSpacing: props.visualState.textStyle.lineSpacingPercent, glowColor: exact.textModel.glowColor,
      glowWidth: exact.textModel.glowWidth, glowOpacity: props.visualState.textStyle.glowOpacityPercent,
      lineAlign: props.visualState.position.alignment, renderModel: exact.textModel});
    return renderToStaticMarkup(React.createElement('div', {id: 'diagnostic-wrapper', style: {
      position: 'absolute', top: exact.wrapper.top, left: exact.wrapper.left,
      transform: 'scale(' + props.layoutRules.renderScale + ')', transformOrigin: 'top left'}}, text));
  }
`, resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife', globalName: 'SvgDiagnostics',
  write: false, nodePaths: [path.resolve(root, 'runner/node_modules')], define: {'process.env.NODE_ENV': '"production"'},
  metafile: true, logLevel: 'silent'});
const js = compiled.outputFiles[0].text;
await writeFile(path.resolve(root, `${dir}/svg-measurement-bundle.js`), js, {flag: 'wx'});
const sourceBindings = [];
for (const file of Object.keys(compiled.metafile.inputs)) if (file !== '<stdin>') sourceBindings.push(await bind(file));
const browser = await openBrowser('chrome', {browserExecutable: a.chromiumBinding.path, forceDeviceScaleFactor: 1, logLevel: 'error'});
let result;
try {
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: props.canvas.width, height: props.canvas.height, deviceScaleFactor: 1});
  await page.goto({url: 'about:blank', timeout: 30000});
  await page.evaluate(await readFile(path.resolve(root, `${dir}/browser-measurement-bundle.js`), 'utf8'));
  await page.evaluate(js);
  result = await page.evaluate(`(async () => {
    const props = ${JSON.stringify(props)};
    const loaded = await new FontFace(props.fontFamilyName, 'url(' + ${JSON.stringify(fontUrl)} + ')', {weight: String(props.layoutRules.fontWeight)}).load();
    document.fonts.add(loaded); await document.fonts.ready;
    const exact = RasterDiagnostics.buildExactTextModel(props);
    document.body.style.margin = '0';
    document.body.innerHTML = SvgDiagnostics.markup(props, exact);
    await document.fonts.ready;
    const box = rect => ({x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom});
    const texts = [...document.querySelectorAll('svg text')].map(el => {
      const css = getComputedStyle(el); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      ctx.font = css.font; ctx.fontKerning = css.fontKerning;
      const measure = ctx.measureText(props.text);
      return {text: el.textContent, attributes: [...el.attributes].map(a => [a.name,a.value]),
        computedStyle: {font: css.font, fontFamily: css.fontFamily, fontWeight: css.fontWeight, fontSize: css.fontSize,
          fontKerning: css.fontKerning, fontFeatureSettings: css.fontFeatureSettings, fontVariantLigatures: css.fontVariantLigatures,
          letterSpacing: css.letterSpacing, textRendering: css.textRendering, transform: css.transform},
        computedTextLength: el.getComputedTextLength(), bbox: box(el.getBBox()), clientRect: box(el.getBoundingClientRect()),
        canvasWithSvgComputedFont: {width: measure.width, left: measure.actualBoundingBoxLeft, right: measure.actualBoundingBoxRight},
        characters: Array.from(props.text).map((char,index) => ({char, index, svgLength: el.getSubStringLength(index,1),
          svgStartX: el.getStartPositionOfChar(index).x, svgEndX: el.getEndPositionOfChar(index).x, canvasWidth: ctx.measureText(char).width}))};
    });
    return {fontLoaded: loaded.status, fontCheck: document.fonts.check(props.layoutRules.fontWeight + ' 95px "' + props.fontFamilyName + '"', props.text),
      exact, wrapper: box(document.querySelector('#diagnostic-wrapper').getBoundingClientRect()),
      svg: box(document.querySelector('svg').getBoundingClientRect()), texts, markup: document.body.innerHTML};
  })()`);
  assert.equal(result.fontLoaded, 'loaded'); assert.equal(result.fontCheck, true);
  assert.equal(result.texts.length, 3);
} finally {await browser.close({silent:true});}
const saved = {schemaVersion: 'digest-v1-phase2-existing-svg-measurement-v001', status: 'measured',
  priorMeasurementBinding: await bind(`${dir}/measurement.json`), propsBinding: a.propsBinding,
  sourceBinding: await bind(`${dir}/svg-metrics.mjs`), sourceBindings, result,
  existingRaster: a.raster, newPngs: 0, formalStyleChanges: 0, newMeaningJudgments: 0, apiCalls: 0, costUsd: 0};
await writeFile(path.resolve(root, `${dir}/svg-measurement.json`), `${JSON.stringify(saved,null,2)}\n`, {flag:'wx'});
console.log(JSON.stringify({wrapper:result.wrapper, svg:result.svg, texts:result.texts.map(x => ({css:x.computedStyle,
  computedTextLength:x.computedTextLength,bbox:x.bbox,clientRect:x.clientRect,canvasWithSvgComputedFont:x.canvasWithSvgComputedFont})), existingRaster:a.raster.alphaBounds}));

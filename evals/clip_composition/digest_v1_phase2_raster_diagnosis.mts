import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

// 既存の1字幕だけを測る診断。正式style・renderer・QCを変更しない。
const root = process.cwd();
const styleRoot = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001';
const output = `${styleRoot}/raster-diagnosis-v001`;
const require = createRequire(import.meta.url);
const rendererRequire = createRequire(require.resolve('@remotion/cli/package.json'));
const tsxRequire = createRequire(require.resolve('tsx/package.json'));
const {openBrowser} = rendererRequire('@remotion/renderer');
const {build} = tsxRequire('esbuild');
const {buildExactTextModel} = require('./presentation_renderer_entry_v001.tsx');
const {inspectPresentationRenderLayoutV001} = require('./inspect_presentation_render_layout_v001.ts');
const {measureTextLine} = require('../../runner/src/telop/text-metrics.ts');
const absolute = (file: string) => path.resolve(root, file);
const read = async (file: string) => JSON.parse(await readFile(absolute(file), 'utf8'));
const sha = async (file: string) => createHash('sha256').update(await readFile(absolute(file))).digest('hex');
const binding = async (file: string) => ({path: file, fileSha256: await sha(file)});
const save = async (file: string, value: unknown) => {
  await writeFile(absolute(file), `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
  return binding(file);
};

const stop = await read(`${styleRoot}/raster-stop-v001.json`);
assert.equal(stop.status, 'stopped-before-video-composite');
const decision = await read(`${styleRoot}/diagnosis-decision-v001.json`);
assert.equal(decision.decision, 'DIAGNOSE / CONTINUE');
const input = await read(`${styleRoot}/layout-input.json`);
const id = stop.failedCaption.actualImageEvidence.instructionId;
const props = input.overlays.find((v: any) => v.instructionId === id);
assert(props && props.instructionId.endsWith('000282'));
assert.equal(props.visualState.textStyle.fontSizePx, 95);
assert.equal(props.indexedLines.length, 1);
assert.equal(props.inspectionLineIndex, null);
const afterBindings = [];
for (const item of stop.immutableBindingsAfterStop) {
  const observed = await sha(item.path);
  assert.equal(observed, item.fileSha256, item.path);
  afterBindings.push({...item, observedSha256: observed, unchanged: true});
}
for (const item of [stop.styleBinding, stop.planBinding, stop.layoutBinding, stop.failureBinding]) {
  assert.equal(await sha(item.path), item.fileSha256, item.path);
}
const style = await read(`${styleRoot}/preset-registry.json`);
const font = style.fontAssets.find((v: any) => v.fontAssetId === props.visualState.textStyle.fontAssetId);
assert.equal(await sha(font.path), font.sha256);
const job = await read('evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json');
const template = await read(job.request.rendererTemplate.path);
const chromium = template.runtimeBindings.chromium;
assert.equal(await sha(chromium.path), chromium.fileSha256);
const savedLayout = await read(`${styleRoot}/layout-result.json`);
const nodeLayout = inspectPresentationRenderLayoutV001({canvas: input.canvas, overlays: [props]});
assert.deepEqual(nodeLayout.items[0], savedLayout.items.find((v: any) => v.instructionId === id));
const exact = buildExactTextModel(props);
const nodeEvidence = {
  environment: 'Node; document undefined',
  logicalWidth: props.indexedLines[0].logicalWidth,
  fontSizePx: props.visualState.textStyle.fontSizePx,
  fontFamily: props.fontFamilyName,
  fontWeight: props.layoutRules.fontWeight,
  measured: measureTextLine(props.text, props.visualState.textStyle.fontSizePx, props.fontFamilyName, props.layoutRules.fontWeight),
  exact,
  layout: nodeLayout,
};
await mkdir(absolute(output));
const propsBinding = await save(`${output}/overlay-props.json`, props);
const nodeBinding = await save(`${output}/node-measurement.json`, nodeEvidence);
// 実装はコピーせず、既存の2関数を同じbyteのsourceからbrowser用へbundleする。
const compiled = await build({
  stdin: {contents: `export {buildExactTextModel} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';\nexport {measureTextLine} from './runner/src/telop/text-metrics.ts';`, resolveDir: root, loader: 'ts'},
  bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'RasterDiagnostics',
  nodePaths: [absolute('runner/node_modules')], define: {'process.env.NODE_ENV': '"production"'},
  metafile: true, logLevel: 'silent',
});
const bundle = compiled.outputFiles[0].text;
await writeFile(absolute(`${output}/browser-measurement-bundle.js`), bundle, {flag: 'wx'});
const sourceBindings = [];
for (const file of Object.keys(compiled.metafile.inputs)) {
  if (file !== '<stdin>') sourceBindings.push(await binding(file));
}
await save(`${output}/browser-bundle-sources.json`, sourceBindings);
const browser = await openBrowser('chrome', {browserExecutable: chromium.path, forceDeviceScaleFactor: 1, logLevel: 'error'});
let browserEvidence;
try {
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0,
    onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: props.canvas.width, height: props.canvas.height, deviceScaleFactor: 1});
  await page.goto({url: 'about:blank', timeout: 30000});
  await page.evaluate(bundle);
  const fontUrl = `data:font/otf;base64,${(await readFile(absolute(font.path))).toString('base64')}`;
  browserEvidence = await page.evaluate(`(async () => {
    const props = ${JSON.stringify(props)};
    const face = new FontFace(props.fontFamilyName, 'url(' + ${JSON.stringify(fontUrl)} + ')', {weight: String(props.layoutRules.fontWeight)});
    const loaded = await face.load();
    document.fonts.add(loaded);
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = props.layoutRules.fontWeight + ' ' + props.visualState.textStyle.fontSizePx + 'px ' + "'" + props.fontFamilyName + "', sans-serif";
    const metric = context.measureText(props.text);
    const metrics = {};
    for (const key of ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight', 'actualBoundingBoxAscent', 'actualBoundingBoxDescent', 'fontBoundingBoxAscent', 'fontBoundingBoxDescent']) metrics[key] = metric[key];
    const measured = RasterDiagnostics.measureTextLine(props.text, props.visualState.textStyle.fontSizePx, props.fontFamilyName, props.layoutRules.fontWeight);
    const exact = RasterDiagnostics.buildExactTextModel(props);
    const stroke = Math.max(exact.textModel.borderStrokeWidth, exact.textModel.glowStrokeWidth) / 2;
    const lineRects = exact.textModel.lines.map(line => ({
      left: exact.wrapper.left + exact.wrapper.contentOffsetX + line.x - stroke,
      top: exact.wrapper.top + exact.wrapper.contentOffsetY + line.y - stroke,
      right: exact.wrapper.left + exact.wrapper.contentOffsetX + line.x + line.width + stroke,
      bottom: exact.wrapper.top + exact.wrapper.contentOffsetY + line.y + exact.textModel.fontSize + stroke,
    }));
    return {fontFaceStatus: loaded.status, fontFacePresent: document.fonts.has(loaded),
      trustedFontCheck: document.fonts.check(props.layoutRules.fontWeight + ' 32px "' + props.fontFamilyName + '"', '検査'),
      actualCaptionFontCheck: document.fonts.check(context.font, props.text), canvasFont: context.font,
      devicePixelRatio: window.devicePixelRatio, userAgent: navigator.userAgent, metrics, measured, exact, lineRects};
  })()`);
  assert.equal(browserEvidence.fontFaceStatus, 'loaded');
  assert.equal(browserEvidence.fontFacePresent, true);
  assert.equal(browserEvidence.trustedFontCheck, true);
  assert.equal(browserEvidence.actualCaptionFontCheck, true);
} finally {
  await browser.close({silent: true});
}
const browserBinding = await save(`${output}/browser-measurement.json`, browserEvidence);
for (const item of afterBindings) assert.equal(await sha(item.path), item.fileSha256, item.path);
const result = {schemaVersion: 'digest-v1-phase2-raster-metric-diagnosis-v001', status: 'measured',
  decisionBinding: await binding(`${styleRoot}/diagnosis-decision-v001.json`), stopBinding: await binding(`${styleRoot}/raster-stop-v001.json`),
  implementationBinding: await binding('evals/clip_composition/digest_v1_phase2_raster_diagnosis.mts'),
  propsBinding, nodeBinding, browserBinding, fontBinding: await binding(font.path), chromiumBinding: chromium,
  node: nodeEvidence, browser: browserEvidence, raster: stop.failedCaption.actualImageEvidence,
  immutableBindings: afterBindings,
  operations: {newRasterProbes: 0, fullCaptionDraws: 0, videoComposites: 0, formalStyleChanges: 0,
    newMeaningJudgments: 0, newAcousticObservations: 0, apiCalls: 0, newMaterials: 0, costUsd: 0},
  humanQuality: 'not-evaluated', completionApproval: 'not-claimed'};
await save(`${output}/measurement.json`, result);
process.stdout.write(`${JSON.stringify({nodeWidth: nodeEvidence.measured, browserWidth: browserEvidence.measured,
  browserMetrics: browserEvidence.metrics, nodeWrapper: exact.wrapper, browserWrapper: browserEvidence.exact.wrapper,
  browserLineRects: browserEvidence.lineRects, raster: result.raster.alphaBounds})}\n`);

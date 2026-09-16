import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V006, fixAutoPresentationProposalV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {evaluatePresentationRendererQcV002, inspectOverlayPngV002}
  from './presentation_renderer_qc_v002.mjs';

const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtures = [
  {name: 'short', lines: ['条件を残す'], codes: []},
  {name: 'two-lines', lines: ['先に条件を伝える', 'それから進める'], codes: []},
  // At the saved 95px size, 18 full-width glyphs fit with the normal outline,
  // but the panel's outer padding crosses the right safe boundary.
  {name: 'normal-fits-panel-crosses-safe-edge', lines: ['猫'.repeat(18)],
    codes: ['LAYOUT_SAFE_AREA_VIOLATION'], normalFits: true},
  {name: 'too-wide', lines: ['猫'.repeat(24)], codes: ['LAYOUT_SAFE_AREA_VIOLATION']},
  {name: 'three-lines', lines: ['第一行', '第二行', '第三行'], codes: ['LAYOUT_LINE_COUNT_EXCEEDED']},
  // An exact zero line advance is a defect injection, not a new style value.
  {name: 'overlapping-lines', lines: ['重なる一行目', '重なる二行目'], lineSpacingPercent: 0,
    codes: ['LAYOUT_LINE_POSITIVE_INTERSECTION']},
];

function panelFixture(savedProps, fixture) {
  const indexed = indexExplicitLinesV001(fixture.lines);
  assert.equal(indexed.status, 'passed');
  const visualState = structuredClone(savedProps.visualState);
  if (fixture.lineSpacingPercent !== undefined) visualState.textStyle.lineSpacingPercent = fixture.lineSpacingPercent;
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: savedProps.canvas,
    elements: [{instructionId: fixture.name, kind: 'speech-caption', presetId: 'test-normal', registryVersion: 'test-v001',
      text: indexed.sourceText, indexedLines: indexed.indexedLines,
      startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30, visualState}]};
  const context = {baselineRef: {path: '/test/panel-normal', fileSha256: 'a'.repeat(64),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: '/test/panel-decision', fileSha256: 'b'.repeat(64)},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V006, pulseTimingEvidence: null};
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: [fixture.name], completion: 'complete', effects: [{captionId: fixture.name,
        role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'}], exceptions: []}});
  const element = resolveAutoPresentationV001({baselinePlan, context, autoProposal}).plan.elements[0];
  return {element, props: {...savedProps, ...element}, normalProps: {...savedProps, ...baselinePlan.elements[0]}};
}

// Only static overlay observations are real here. The media envelope below is
// an explicit capability fixture so the unchanged QC can evaluate the actual
// PNG and line masks without claiming an encoded-video or audio verification.
function evaluateStaticOverlay(element, props, overlay) {
  const appliedOverlayPropsCanonicalSha256 = sha256AutoPresentationV001(props);
  const inspection = {...overlay, appliedOverlayPropsCanonicalSha256};
  return evaluatePresentationRendererQcV002({plan: {elements: [element]}, canvas: props.canvas,
    applicationResults: [{instructionId: element.instructionId,
      requestedPresetId: element.presetId, appliedPresetId: element.presetId,
      appliedPresetRegistryVersion: element.registryVersion,
      overlayFile: overlay.overlayFile, overlaySha256: overlay.overlaySha256,
      appliedOverlayPropsCanonicalSha256,
      finalPlanElementReference: {planFile: 'presentation-render-plan-v002.json', instructionId: element.instructionId,
        canonicalSha256: sha256AutoPresentationV001({...element, overlaySha256: overlay.overlaySha256})}}],
    overlayInspections: [inspection], requireFinalVisibility: false,
    mediaInspection: {video: {width: props.canvas.width, height: props.canvas.height, fps: props.canvas.fps,
      frameCount: 30}, durationMs: 1000}, expectedFrameCount: 30, expectedAudio: {present: false}});
}

test('Panel Accent paints a real plate and retains existing layout and raster rejection gates', async t => {
  const root = process.cwd();
  const output = process.env.ZEV_PANEL_QC_OUTPUT
    ? path.resolve(process.env.ZEV_PANEL_QC_OUTPUT) : await mkdtemp(path.join(tmpdir(), 'zev-panel-raster-'));
  if (!process.env.ZEV_PANEL_QC_OUTPUT) t.after(() => rm(output, {recursive: true, force: true}));
  await mkdir(output, {recursive: true});
  const savedPropsPath = path.resolve(root,
    'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const savedPropsBytes = await readFile(savedPropsPath);
  const savedProps = JSON.parse(savedPropsBytes);
  const req = createRequire(path.resolve(root, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const rendererPath = remotion.resolve('@remotion/renderer');
  const {openBrowser} = remotion('@remotion/renderer');
  const {screenshot} = remotion(path.join(path.dirname(rendererPath), 'puppeteer-screenshot.js'));
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const tsx = path.resolve(root, 'runner/node_modules/tsx/dist/cli.mjs');
  const chromePath = path.resolve(root,
    'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const fontPath = path.resolve(root, 'runner/public/font', savedProps.fontFileName);
  const fontBytes = await readFile(fontPath);
  const bundle = await build({stdin: {contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {buildExactTextModel, ExactOverlay} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';
    let mounted;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    export async function draw(props) {
      if (mounted) flushSync(() => mounted.unmount());
      document.body.replaceChildren(); document.body.style.margin='0';
      window.remotion_staticBase=''; window.remotion_renderReady=false;
      const host=document.createElement('div'); document.body.append(host);
      mounted=createRoot(host); flushSync(() => mounted.render(React.createElement(ExactOverlay,props)));
      const deadline=performance.now()+30000;
      while (!window.remotion_renderReady || window.remotion_delayRenderHandles.length !== 0) {
        if (performance.now()>deadline) throw new Error('panel overlay did not become ready');
        await frame();
      }
      await frame();
      return {exact:buildExactTextModel(props), ready:window.remotion_renderReady,
        fillTexts:[...document.querySelectorAll('svg text:not([stroke])')].map(el=>el.textContent),
        fontLoaded:document.fonts.check(props.visualState.textStyle.fontSizePx+'px "'+props.fontFamilyName+'"')};
    }
  `, resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife', globalName: 'PanelQC',
    write: false, nodePaths: [path.resolve(root, 'runner/node_modules')],
    define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  await writeFile(path.join(output, 'browser-bundle.js'), bundle.outputFiles[0].text);
  const server = createServer((request, response) => {
    if (request.url === `/font/${savedProps.fontFileName}`) {
      response.writeHead(200, {'Content-Type': 'font/otf'}); response.end(fontBytes);
    } else if (request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<!doctype html><html><body></body></html>');
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  t.after(() => new Promise(resolve => server.close(resolve)));
  const results = [];
  const browser = await openBrowser('chrome', {browserExecutable: chromePath, forceDeviceScaleFactor: 1, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false,
      pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    const {width, height} = savedProps.canvas;
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const shot = async name => {
      const bytes = await screenshot({page, type: 'png', omitBackground: true, width, height, scale: 1});
      const pngPath = path.join(output, `${name}.png`);
      await writeFile(pngPath, bytes);
      const {stdout} = await execute('magick', [pngPath, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: width * height * 4 + 1024});
      return {pngPath, fileSha256: sha(bytes), rgba: stdout};
    };
    const draw = props => page.evaluate(`PanelQC.draw(${JSON.stringify(props)})`);
    const inspectLayout = async (props, name) => {
      const input = path.join(output, `${name}-layout-input.json`), resultPath = path.join(output, `${name}-layout.json`);
      await writeFile(input, JSON.stringify({canvas: props.canvas, overlays: [props]}));
      try {
        await execute(process.execPath, [tsx, path.resolve(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'), input, resultPath],
          {cwd: root, env: {...process.env, NODE_PATH: path.resolve(root, 'runner/node_modules'), TSX_DISABLE_CACHE: '1'}});
      } catch (error) { if (error.code !== 1) throw error; }
      return JSON.parse(await readFile(resultPath, 'utf8'));
    };
    for (const fixture of fixtures) await t.test(fixture.name, async () => {
      const {element, props, normalProps} = panelFixture(savedProps, fixture);
      const layout = await inspectLayout(props, fixture.name);
      const measurement = await draw(props);
      const panel = await shot(fixture.name);
      const lineAlphaBounds = [], masks = [];
      for (let lineIndex = 0; lineIndex < props.indexedLines.length; lineIndex++) {
        await draw({...props, inspectionLineIndex: lineIndex});
        const mask = await shot(`${fixture.name}-line-${lineIndex}`);
        const observed = await inspectOverlayPngV002({instructionId: fixture.name, pngPath: mask.pngPath});
        assert.ok(observed.alphaBounds, 'each source line must paint real glyph pixels');
        lineAlphaBounds.push({lineIndex, ...observed.alphaBounds});
        masks.push(mask.rgba);
      }
      const overlay = await inspectOverlayPngV002({instructionId: fixture.name, pngPath: panel.pngPath,
        lineRects: layout.items[0].lineRects, lineAlphaBounds,
        overlayFile: panel.pngPath, overlaySha256: panel.fileSha256});
      const qc = evaluateStaticOverlay(element, props, overlay);
      const result = {name: fixture.name, layout, measurement, overlay, qc,
        png: {path: panel.pngPath, fileSha256: panel.fileSha256}};
      results.push(result);
      assert.equal(measurement.ready, true);
      assert.equal(measurement.fontLoaded, true);
      assert.deepEqual(measurement.fillTexts, fixture.lines);
      assert.deepEqual([...new Set(layout.violations.map(v => v.code))].sort(), fixture.codes);
      assert.deepEqual([...new Set(qc.violations.map(v => v.code))].sort(), fixture.codes);
      if (fixture.normalFits) {
        result.normalLayout = await inspectLayout(normalProps, `${fixture.name}-normal`);
        assert.equal(result.normalLayout.status, 'passed');
        // The real plate, not just predicted glyph geometry, must cross safety.
        assert.ok(overlay.alphaBounds.right > width - props.canvas.safeAreaPx.right);
      }
      if (fixture.codes.length === 0) {
        let plateOutsideGlyphPixels = 0, darkGlyphPixels = 0;
        const b = overlay.alphaBounds;
        // Exclude only the raster boundary, whose coverage can be fractional.
        // Every interior pixel is opaque; pixels outside every real glyph mask
        // must have the exact declared plate color, including inter-line space.
        for (let y = b.top + 1; y < b.bottom - 1; y++) for (let x = b.left + 1; x < b.right - 1; x++) {
          const i = (y * width + x) * 4;
          assert.equal(panel.rgba[i + 3], 255, `plate hole at ${x},${y}`);
          if (masks.every(mask => mask[i + 3] === 0)) {
            assert.deepEqual([...panel.rgba.subarray(i, i + 4)], [255, 253, 248, 255]);
            plateOutsideGlyphPixels++;
          }
          if (panel.rgba[i] === 17 && panel.rgba[i + 1] === 24 && panel.rgba[i + 2] === 39) darkGlyphPixels++;
        }
        result.plateOutsideGlyphPixels = plateOutsideGlyphPixels;
        result.darkGlyphPixels = darkGlyphPixels;
        assert.ok(plateOutsideGlyphPixels > 0, 'plate must paint beyond glyph pixels');
        assert.ok(darkGlyphPixels > 0, 'dark text must remain visible on the light plate');
        assert.equal(qc.checks.layoutAndVisibility.status, 'passed');
      }
    });
  } finally {
    await browser.close({silent: true});
    const sources = await Promise.all(Object.keys(bundle.metafile.inputs).filter(file => !file.includes('node_modules') && file !== '<stdin>')
      .map(async file => ({path: file, fileSha256: sha(await readFile(path.resolve(root, file)))})));
    await writeFile(path.join(output, 'measurement.json'), `${JSON.stringify({schemaVersion: 'presentation-panel-raster-qc-v001',
      runtime: process.version, savedPropsBinding: {path: savedPropsPath, fileSha256: sha(savedPropsBytes)},
      fontBinding: {path: fontPath, fileSha256: sha(fontBytes)}, chromiumBinding: {path: chromePath, fileSha256: sha(await readFile(chromePath))},
      sourceBindings: sources, mediaEnvelopeIsSynthetic: true, encodedVideoVerified: false,
      results, externalApiCalls: 0, costUsd: 0}, null, 2)}\n`);
  }
});

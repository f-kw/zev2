import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V002, fixAutoPresentationProposalV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {buildPresentationColorRunsV001, indexExplicitLinesV001}
  from './presentation_renderer_text_layout_v001.mjs';

const normalColor = '#FFFDF8';
const focusColor = '#FFD65A';
const fixtures = [
  {name: 'start', lines: ['最初の言葉です'], targetText: '最初'},
  {name: 'middle', lines: ['今日は大事な日です'], targetText: '大事な'},
  {name: 'end', lines: ['最後を強調する'], targetText: '強調する'},
  {name: 'repeated-second', lines: ['はい、はい、進めます'], targetText: 'はい', occurrence: 2},
  {name: 'display-line-crossing', lines: ['前半の大', '事な後半'], targetText: '大事な'},
  {name: 'source-newline-crossing', lines: ['前半\n', '後半'], targetText: '半\n後'},
  {name: 'japanese-punctuation', lines: ['そう、「大事」。続く'], targetText: '「大事」。'},
  {name: 'emoji', lines: ['成功😀です'], targetText: '😀'},
  {name: 'combining', lines: ['前e\u0301後'], targetText: 'e\u0301'},
  {name: 'variation-selector', lines: ['前✈\uFE0E後'], targetText: '✈\uFE0E'},
  {name: 'whole', lines: ['全文を', '強調する'], targetText: '全文を強調する'},
  {name: 'one-grapheme', lines: ['前猫後'], targetText: '猫'},
  {name: 'kerning-boundary', lines: ['AVATAR office'], targetText: 'VATAR of'},
];
// Independent source offsets make the repeated-word test distinguish the
// requested second occurrence from an accidental first-occurrence fallback.
const expectedStarts = {start: 0, middle: 3, end: 3, 'repeated-second': 3,
  'display-line-crossing': 3, 'source-newline-crossing': 1, 'japanese-punctuation': 3,
  emoji: 2, combining: 1, 'variation-selector': 1, whole: 0,
  'one-grapheme': 1, 'kerning-boundary': 1};
function resolveFixture(fixture, whole = false) {
  const indexed = indexExplicitLinesV001(fixture.lines);
  assert.equal(indexed.status, 'passed');
  const element = {instructionId: fixture.name, kind: 'speech-caption', text: indexed.sourceText,
    indexedLines: indexed.indexedLines, startFrame: 0, endFrameExclusive: 30,
    visualState: {textStyle: {fontColor: normalColor}}};
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', elements: [element]};
  const context = {baselineRef: {path: '/test/baseline', fileSha256: 'a'.repeat(64),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
  decisionInputRef: {path: '/test/decision', fileSha256: 'b'.repeat(64)},
  renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V002};
  const selection = whole ? {scope: 'whole-caption'} : {scope: 'partial-caption',
    targetText: fixture.targetText, ...(fixture.occurrence ? {occurrence: fixture.occurrence} : {})};
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: [fixture.name], completion: 'complete',
      effects: [{captionId: fixture.name, role: 'Focus', presentation: 'provisional-focus', ...selection}],
      exceptions: []}});
  return {baseline: element, focused: resolveAutoPresentationV001({baselinePlan, context, autoProposal}).plan.elements[0]};
}
const runsFor = element => buildPresentationColorRunsV001({...element,
  fontColor: element.visualState.textStyle.fontColor});
for (const fixture of fixtures) {
  test(`span maps admitted canonical range without changing indexed lines: ${fixture.name}`, () => {
    const {baseline, focused} = resolveFixture(fixture);
    const before = structuredClone(baseline);
    const normal = runsFor(baseline);
    const selected = runsFor(focused);
    assert.deepEqual(baseline, before);
    assert.deepEqual(focused.indexedLines, baseline.indexedLines);
    assert.deepEqual(normal.map(runs => runs.map(run => run.text).join('')), fixture.lines.map(s => s.replace(/[\r\n]/gu, '')));
    const range = focused.presentationColorRange;
    assert.deepEqual(range, {startCodePoint: expectedStarts[fixture.name],
      endCodePointExclusive: expectedStarts[fixture.name] + Array.from(fixture.targetText).length,
      fontColor: focusColor});
    const selectedVisible = [];
    for (let i = 0; i < baseline.indexedLines.length; i++) {
      const characters = selected[i].flatMap(run => Array.from(run.text, text => ({text, color: run.fontColor})));
      const source = baseline.indexedLines[i].characters.filter(item => item.role === 'visible');
      assert.equal(characters.length, source.length);
      source.forEach((item, index) => {
        const inside = item.sourceIndex >= range.startCodePoint && item.sourceIndex < range.endCodePointExclusive;
        assert.deepEqual(characters[index], {text: item.character, color: inside ? focusColor : normalColor});
        if (inside) selectedVisible.push(item.character);
      });
    }
    assert.equal(selectedVisible.join(''), fixture.targetText.replace(/[\r\n]/gu, ''));
    const whole = runsFor(resolveFixture(fixture, true).focused);
    assert.deepEqual(whole, baseline.indexedLines.map(line => [{text: line.renderedText, fontColor: focusColor}]));
  });
}

test('span rejects malformed, out of bounds, non-visible, and grapheme-splitting canonical ranges', () => {
  const fixture = {lines: ['前e\u0301✈\uFE0E😀\n後'], name: 'invalid', targetText: '前'};
  const {baseline} = resolveFixture(fixture);
  const valid = {startCodePoint: 0, endCodePointExclusive: 1, fontColor: focusColor};
  for (const range of [null, [], {...valid, startCodePoint: -1}, {...valid, endCodePointExclusive: 99},
    {...valid, endCodePointExclusive: 0}, {...valid, startCodePoint: 0.1}, {...valid, extra: true},
    {...valid, fontColor: 'red'}, {...valid, startCodePoint: 1, endCodePointExclusive: 2},
    {...valid, startCodePoint: 4, endCodePointExclusive: 5}, {...valid, startCodePoint: 6, endCodePointExclusive: 7}]) {
    assert.throws(() => runsFor({...baseline, presentationColorRange: range}), /invalid|grapheme|visible/);
  }
  const split = indexExplicitLinesV001(['e', '\u0301後']);
  assert.throws(() => buildPresentationColorRunsV001({text: split.sourceText, indexedLines: split.indexedLines,
    fontColor: normalColor, presentationColorRange: valid}), /grapheme/);
  const altered = structuredClone(baseline);
  altered.indexedLines[0].characters[0].role = 'source-line-break';
  assert.throws(() => runsFor(altered), /intact indexed source text/);
});

const sha = data => createHash('sha256').update(data).digest('hex');
const execute = promisify(execFile);
test('production SVG preserves glyph alpha, placement, strokes, and unselected pixels in Chromium', async t => {
  const root = process.cwd();
  const output = process.env.ZEV_SPAN_QC_OUTPUT
    ? path.resolve(process.env.ZEV_SPAN_QC_OUTPUT) : await mkdtemp(path.join(tmpdir(), 'zev-span-raster-'));
  if (!process.env.ZEV_SPAN_QC_OUTPUT) t.after(() => rm(output, {recursive: true, force: true}));
  await mkdir(output, {recursive: true});
  const req = createRequire(path.resolve(root, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const rendererPath = remotion.resolve('@remotion/renderer');
  const {openBrowser} = remotion('@remotion/renderer');
  const {screenshot} = remotion(path.join(path.dirname(rendererPath), 'puppeteer-screenshot.js'));
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const propsPath = path.resolve(root, 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const savedProps = JSON.parse(await readFile(propsPath, 'utf8'));
  const fontPath = path.resolve(root, 'runner/public/font/LINESeedJP_A_OTF_Eb.otf');
  const fontBytes = await readFile(fontPath);
  const chromePath = path.resolve(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const bundle = await build({stdin: {contents: `
    import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    import {buildExactTextModel} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';
    import {TelopText} from './runner/src/remotion/components/TelopText.tsx';
    export function draw(props) {
      const exact = buildExactTextModel(props);
      const model = exact.textModel;
      document.body.innerHTML = renderToStaticMarkup(React.createElement('div', {id: 'wrapper', style: {
        position: 'absolute', left: exact.wrapper.left, top: exact.wrapper.top,
        transform: 'scale(' + props.layoutRules.renderScale + ')', transformOrigin: 'top left'}},
        React.createElement(TelopText, {text: props.text, fontSize: model.fontSize,
          fontColor: model.fontColor, renderModel: model})));
      const rect = r => ({x:r.x,y:r.y,width:r.width,height:r.height});
      const texts = [...document.querySelectorAll('svg text')].map(el => ({
        text: el.textContent, stroke: el.getAttribute('stroke'), fill: el.getAttribute('fill'),
        length: el.getComputedTextLength(), bbox: rect(el.getBBox()),
        characterBoxes: Array.from({length: el.getNumberOfChars()}, (_,i) => rect(el.getExtentOfChar(i))),
        spans: [...el.querySelectorAll('tspan')].map(s => ({text:s.textContent,fill:s.getAttribute('fill')}))}));
      return {exact, texts};
    }
  `, resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife',
  globalName: 'SpanQC', write: false, nodePaths: [path.resolve(root, 'runner/node_modules')],
  define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  await writeFile(path.join(output, 'browser-bundle.js'), bundle.outputFiles[0].text);
  const browser = await openBrowser('chrome', {browserExecutable: chromePath,
    forceDeviceScaleFactor: 1, logLevel: 'error'});
  const results = [];
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false,
      pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: savedProps.canvas.width, height: savedProps.canvas.height, deviceScaleFactor: 1});
    await page.goto({url: 'about:blank', timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    await page.evaluate(`(async () => {
      document.body.style.margin = '0';
      const font = await new FontFace(${JSON.stringify(savedProps.fontFamilyName)},
        ${JSON.stringify(`url(data:font/otf;base64,${fontBytes.toString('base64')})`)}, {weight:'800'}).load();
      document.fonts.add(font); await document.fonts.ready;
      if (font.status !== 'loaded') throw new Error('font not loaded');
    })()`);
    const shot = async name => {
      const bytes = await screenshot({page, type: 'png', omitBackground: true,
        width: savedProps.canvas.width, height: savedProps.canvas.height, scale: 1});
      const file = path.join(output, `${name}.png`);
      await writeFile(file, bytes);
      const {stdout} = await execute('magick', [file, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: savedProps.canvas.width * savedProps.canvas.height * 4 + 1024});
      return {bytes: stdout, png: {path: file, fileSha256: sha(bytes)}};
    };
    for (const fixture of fixtures) {
      const {baseline, focused} = resolveFixture(fixture);
      const propsFor = element => ({...savedProps, instructionId: fixture.name,
        text: element.text, indexedLines: element.indexedLines,
        visualState: {...savedProps.visualState, textStyle: {...savedProps.visualState.textStyle,
          fontColor: element.visualState.textStyle.fontColor}},
        ...(element.presentationColorRange ? {presentationColorRange: element.presentationColorRange} : {})});
      const measure = async props => page.evaluate(`SpanQC.draw(${JSON.stringify(props)})`);
      const normal = await measure(propsFor(baseline));
      const normalPng = await shot(`${fixture.name}-normal`);
      await page.evaluate("document.querySelectorAll('svg text[stroke]').forEach(el => el.style.visibility='hidden')");
      const normalFill = await shot(`${fixture.name}-normal-fill`);
      const focus = await measure(propsFor(focused));
      const focusPng = await shot(`${fixture.name}-focus`);
      await page.evaluate("document.querySelectorAll('svg text[stroke]').forEach(el => el.style.visibility='hidden')");
      const focusFill = await shot(`${fixture.name}-focus-fill`);
      await page.evaluate(`document.querySelectorAll('tspan').forEach(el => {
        if (el.getAttribute('fill') !== ${JSON.stringify(focusColor)}) el.style.visibility='hidden';
      })`);
      const focusMask = await shot(`${fixture.name}-selected-mask`);
      const geometry = measurement => ({...measurement.exact,
        textModel: {...measurement.exact.textModel, lines: measurement.exact.textModel.lines.map(({colorRuns, ...line}) => line)}});
      const textGeometry = measurement => measurement.texts.map(({fill, spans, ...text}) => text);
      let alphaDifferences = 0, fillAlphaDifferences = 0, outsideDifferences = 0,
        selectedPixels = 0, selectedChangedPixels = 0, focusInteriorPixels = 0;
      let left = Infinity, top = Infinity, right = -1, bottom = -1;
      for (let i = 0; i < normalPng.bytes.length; i += 4) {
        const n = normalPng.bytes, f = focusPng.bytes;
        if (n[i+3] !== f[i+3]) alphaDifferences++;
        if (normalFill.bytes[i+3] !== focusFill.bytes[i+3]) fillAlphaDifferences++;
        const changed = n.subarray(i,i+4).compare(f.subarray(i,i+4)) !== 0;
        if (focusMask.bytes[i+3] === 0) { if (changed) outsideDifferences++; }
        else {
          selectedPixels++; if (changed) selectedChangedPixels++;
          if (focusFill.bytes[i] === 255 && focusFill.bytes[i+1] === 214 && focusFill.bytes[i+2] === 90
            && focusFill.bytes[i+3] === 255) focusInteriorPixels++;
        }
        if (n[i+3]) {
          const pixel = i/4, x = pixel % savedProps.canvas.width, y = Math.floor(pixel/savedProps.canvas.width);
          left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y);
        }
      }
      const safe = savedProps.canvas.safeAreaPx;
      const result = {name: fixture.name, fixture, range: focused.presentationColorRange,
        geometryUnchanged: JSON.stringify(geometry(normal)) === JSON.stringify(geometry(focus)),
        glyphPositionsUnchanged: JSON.stringify(textGeometry(normal)) === JSON.stringify(textGeometry(focus)),
        strokesUnchanged: JSON.stringify(normal.texts.filter(x => x.stroke)) === JSON.stringify(focus.texts.filter(x => x.stroke)),
        alphaDifferences, fillAlphaDifferences, outsideDifferences, selectedPixels, selectedChangedPixels, focusInteriorPixels,
        alphaBounds: {left,top,right,bottom}, insideSafeArea: left>=safe.left && top>=safe.top
          && right<savedProps.canvas.width-safe.right && bottom<savedProps.canvas.height-safe.bottom,
        pngs: [normalPng, normalFill, focusPng, focusFill, focusMask].map(x => x.png), normal, focus};
      results.push(result);
      await writeFile(path.join(output, `${fixture.name}-measurement.json`), `${JSON.stringify(result,null,2)}\n`);
    }
  } finally { await browser.close({silent:true}); }
  const bindings = await Promise.all(Object.keys(bundle.metafile.inputs).filter(file => file !== '<stdin>')
    .map(async file => ({path: file, fileSha256: sha(await readFile(path.resolve(root,file)))})));
  await writeFile(path.join(output, 'summary.json'), `${JSON.stringify({schemaVersion:'presentation-span-raster-qc-v001',
    runtime: process.version, fontBinding:{path:fontPath,fileSha256:sha(fontBytes)},
    chromiumBinding:{path:chromePath,fileSha256:sha(await readFile(chromePath))}, sourceBindings:bindings,
    results, apiCalls:0, costUsd:0}, null, 2)}\n`);
  for (const result of results) {
    const message = `${result.name}: ${JSON.stringify({...result, pngs:undefined, normal:undefined, focus:undefined})}`;
    assert.equal(result.geometryUnchanged, true, message);
    assert.equal(result.glyphPositionsUnchanged, true, message);
    assert.equal(result.strokesUnchanged, true, message);
    assert.equal(result.alphaDifferences, 0, message);
    assert.equal(result.fillAlphaDifferences, 0, message);
    assert.equal(result.outsideDifferences, 0, message);
    assert.ok(result.selectedPixels > 0 && result.selectedChangedPixels > 0 && result.focusInteriorPixels > 0, message);
    assert.equal(result.insideSafeArea, true, message);
  }
});

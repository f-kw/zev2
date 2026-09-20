import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001,
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
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
  {name: 'emoji', lines: ['成功😀です'], targetText: '😀', nativeColorText: '😀', expectedColorNoop: true},
  {name: 'combining', lines: ['前e\u0301後'], targetText: 'e\u0301'},
  {name: 'variation-selector', lines: ['前✈\uFE0E後'], targetText: '✈\uFE0E'},
  {name: 'whole', lines: ['全文を', '強調する'], targetText: '全文を強調する'},
  {name: 'one-grapheme', lines: ['前猫後'], targetText: '猫'},
  {name: 'kerning-boundary', lines: ['AVATAR office'], targetText: 'VATAR of'},
  {name: 'mixed-native-color', lines: ['前A😀猫後'], targetText: 'A😀猫', nativeColorText: '😀'},
];
// Independent source offsets make the repeated-word test distinguish the
// requested second occurrence from an accidental first-occurrence fallback.
const expectedStarts = {start: 0, middle: 3, end: 3, 'repeated-second': 3,
  'display-line-crossing': 3, 'source-newline-crossing': 1, 'japanese-punctuation': 3,
  emoji: 2, combining: 1, 'variation-selector': 1, whole: 0,
  'one-grapheme': 1, 'kerning-boundary': 1, 'mixed-native-color': 1};
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
  renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
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
const phase1Commit = '75b4fd38d5fea51b43a8c1bc23944be63d3e821a';
test('production overlay preserves normal and Focus pixels and renders finite Vocal with exact Normal and Reset recovery', async t => {
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
  const phase1Sources = [];
  // The fixed Phase 1 source is bundled independently. Only exporting its existing
  // component is a test adapter; no normal layout or glyph source is rewritten.
  const phase1Plugin = {name: 'fixed-phase1-source', setup(builder) {
    builder.onLoad({filter: /\.(?:[cm]?js|tsx?)$/}, async args => {
      if (!args.path.startsWith(root + path.sep) || args.path.includes(`${path.sep}node_modules${path.sep}`)) return;
      const file = path.relative(root, args.path);
      const {stdout} = await execute('git', ['show', `${phase1Commit}:${file}`], {cwd: root, maxBuffer: 4 * 1024 * 1024});
      phase1Sources.push({path: file, fileSha256: sha(stdout)});
      const contents = file === 'evals/clip_composition/presentation_renderer_entry_v001.tsx'
        ? stdout.replace('const ExactOverlay:', 'export const ExactOverlay:') : stdout;
      return {contents, loader: file.endsWith('.tsx') ? 'tsx' : file.endsWith('.ts') ? 'ts' : 'js'};
    });
  }};
  const browserEntry = `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {buildExactTextModel, ExactOverlay} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';
    let mounted;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    export function clear() {
      if (mounted) { flushSync(() => mounted.unmount()); mounted = null; }
      document.body.replaceChildren();
      return {selectionCount: getSelection().rangeCount};
    }
    export async function draw(props) {
      clear();
      document.body.style.margin = '0';
      window.remotion_staticBase = '';
      window.remotion_renderReady = false;
      const host = document.createElement('div'); host.id = 'mount'; document.body.append(host);
      mounted = createRoot(host);
      flushSync(() => mounted.render(React.createElement(ExactOverlay, props)));
      const deadline = performance.now() + 30000;
      while (!window.remotion_renderReady || window.remotion_delayRenderHandles.length !== 0) {
        if (performance.now() > deadline) throw new Error('production overlay did not become ready');
        await frame();
      }
      await frame();
      const rect = r => ({x:r.x,y:r.y,width:r.width,height:r.height});
      const texts = [...document.querySelectorAll('svg text')].map(el => ({
        text: el.textContent, stroke: el.getAttribute('stroke'), fill: el.getAttribute('fill'),
        length: el.getComputedTextLength(), bbox: rect(el.getBBox()),
        characterBoxes: Array.from({length: el.getNumberOfChars()}, (_,i) => rect(el.getExtentOfChar(i))),
        userSelect: getComputedStyle(el).userSelect,
        childNodes: [...el.childNodes].map(node => ({type:node.nodeType,text:node.textContent}))}));
      const selection = getSelection(), range = selection.rangeCount ? selection.getRangeAt(0) : null;
      return {exact:buildExactTextModel(props), texts, ready:window.remotion_renderReady,
        pendingHandles:window.remotion_delayRenderHandles.length,
        readyMarker:document.querySelector('[data-presentation-render-ready]')?.getAttribute('data-presentation-render-ready'),
        hiddenMeasurementCopies:document.querySelectorAll('[aria-hidden="true"]').length,
        selection: {count:selection.rangeCount,text:selection.toString(),rangeText:range?.toString() ?? '',
          startFillLine:range?.startContainer.parentElement?.getAttribute('data-telop-fill-line') ?? null,
          endFillLine:range?.endContainer.parentElement?.getAttribute('data-telop-fill-line') ?? null,
          startOffset:range?.startOffset ?? null,endOffset:range?.endOffset ?? null,
          protectedTextIntersections:range ? [...document.querySelectorAll('svg text[stroke]')].filter(el => range.intersectsNode(el)).length : 0}};
    }
    // Diagnostic masks are test observations only: their pixels never enter
    // the production component or the one-still output being checked.
    export function selectMask(props, canonicalRange) {
      const fills = [...document.querySelectorAll('svg text:not([stroke])')];
      document.querySelectorAll('svg text[stroke]').forEach(el => el.style.visibility = 'hidden');
      fills.forEach(el => el.style.fill = 'transparent');
      const style = document.createElement('style'); style.textContent =
        '#mount svg text::selection {fill:#FFFFFF!important;color:#FFFFFF!important;background-color:transparent!important;text-shadow:none!important}';
      document.body.append(style);
      const locations = [];
      props.indexedLines.forEach((line, lineIndex) => {
        let offset = 0;
        line.characters.filter(item => item.role === 'visible').forEach(item => {
          if (item.sourceIndex >= canonicalRange.startCodePoint && item.sourceIndex < canonicalRange.endCodePointExclusive)
            locations.push({lineIndex,start:offset,end:offset+item.character.length});
          offset += item.character.length;
        });
      });
      if (!locations.length) throw new Error('diagnostic selection is empty');
      const first=locations[0],last=locations.at(-1),range=new Range();
      range.setStart(fills[first.lineIndex].firstChild,first.start);
      range.setEnd(fills[last.lineIndex].firstChild,last.end);
      getSelection().removeAllRanges();getSelection().addRange(range);
      return {text:getSelection().toString(),rangeText:range.toString()};
    }
  `;
  const makeBundle = async (globalName, plugins = []) => build({stdin: {contents: browserEntry,
    resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife', globalName,
    write: false, nodePaths: [path.resolve(root, 'runner/node_modules')], plugins,
    define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  const bundle = await makeBundle('SpanQC');
  const phase1Bundle = await makeBundle('Phase1QC', [phase1Plugin]);
  await writeFile(path.join(output, 'browser-bundle.js'), bundle.outputFiles[0].text);
  await writeFile(path.join(output, 'phase1-browser-bundle.js'), phase1Bundle.outputFiles[0].text);
  const server = createServer((request, response) => {
    if (request.url === `/font/${savedProps.fontFileName}`) {
      response.writeHead(200, {'Content-Type': 'font/otf'}); response.end(fontBytes);
    } else if (request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<!doctype html><html><body></body></html>');
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await openBrowser('chrome', {browserExecutable: chromePath,
    forceDeviceScaleFactor: 1, logLevel: 'error'});
  const results = [];
  let vocalResult;
  const geometry = measurement => ({...measurement.exact,
    textModel: {...measurement.exact.textModel,
      lines: measurement.exact.textModel.lines.map(({colorRuns, ...line}) => line)}});
  const textGeometry = measurement => measurement.texts.map(({fill,userSelect,childNodes,...text}) => text);
  const rgbaDifferences = (first, second) => {
    assert.equal(first.length, second.length);
    let differences = 0;
    for (let i=0; i<first.length; i+=4) if (first.subarray(i,i+4).compare(second.subarray(i,i+4))) differences++;
    return differences;
  };
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false,
      pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: savedProps.canvas.width, height: savedProps.canvas.height, deviceScaleFactor: 1});
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
    await page.evaluate(phase1Bundle.outputFiles[0].text);
    await page.evaluate(bundle.outputFiles[0].text);
    const shot = async name => {
      const bytes = await screenshot({page, type: 'png', omitBackground: true,
        width: savedProps.canvas.width, height: savedProps.canvas.height, scale: 1});
      const file = path.join(output, `${name}.png`);
      await writeFile(file, bytes);
      const {stdout} = await execute('magick', [file, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: savedProps.canvas.width * savedProps.canvas.height * 4 + 1024});
      return {bytes: stdout, png: {path: file, fileSha256: sha(bytes)}};
    };
    const measure = async (props, namespace = 'SpanQC') => page.evaluate(`${namespace}.draw(${JSON.stringify(props)})`);
    const onlyFill = () => page.evaluate("document.querySelectorAll('svg text[stroke]').forEach(el => el.style.visibility='hidden')");
    const onlyStroke = () => page.evaluate("document.querySelectorAll('svg text').forEach(el => el.style.visibility=el.hasAttribute('stroke')?'visible':'hidden')");
    // One small caption exercises the finite size through the actual unchanged
    // production SVG renderer. Its saved normal plan is reused for every role.
    const indexed = indexExplicitLinesV001(['驚きの声']);
    const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
      canvas: savedProps.canvas, elements: [{instructionId: 'vocal-raster', kind: 'speech-caption',
        text: indexed.sourceText, indexedLines: indexed.indexedLines,
        startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30,
        visualState: structuredClone(savedProps.visualState)}]};
    const context = {baselineRef: {path: '/test/vocal-normal', fileSha256: 'a'.repeat(64),
      canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
      decisionInputRef: {path: '/test/vocal-decision', fileSha256: 'b'.repeat(64)},
      renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
    const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context,
      proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
        targetCaptionIds: ['vocal-raster'], completion: 'complete', effects: [{captionId: 'vocal-raster',
          role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'}], exceptions: []}});
    const resolveVocal = overrides => resolveAutoPresentationV001({baselinePlan, context, autoProposal, overrides}).plan;
    const empty = createAutoPresentationOverridesV001({baselinePlan, context, autoProposal});
    const normalOverride = editAutoPresentationOverrideV001({baselinePlan, context, autoProposal, overrides: empty,
      captionId: 'vocal-raster', selection: 'Normal'});
    const resetOverride = editAutoPresentationOverrideV001({baselinePlan, context, autoProposal, overrides: normalOverride,
      captionId: 'vocal-raster', selection: 'Reset'});
    const rasterCases = [];
    for (const [name, plan] of [['normal', baselinePlan], ['vocal', resolveVocal()],
      ['human-normal', resolveVocal(normalOverride)], ['reset', resolveVocal(resetOverride)]]) {
      const props = {...savedProps, ...plan.elements[0]};
      const measurement = await measure(props);
      rasterCases.push({name, plan, measurement, shot: await shot(`vocal-${name}`)});
    }
    const [normalCase, vocalCase, humanNormalCase, resetCase] = rasterCases;
    let left = Infinity, top = Infinity, right = -1, bottom = -1;
    for (let i = 0; i < vocalCase.shot.bytes.length; i += 4) if (vocalCase.shot.bytes[i + 3]) {
      const x = (i / 4) % savedProps.canvas.width, y = Math.floor(i / 4 / savedProps.canvas.width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    const safe = savedProps.canvas.safeAreaPx;
    vocalResult = {normalToVocalRgbaDifferences: rgbaDifferences(normalCase.shot.bytes, vocalCase.shot.bytes),
      humanNormalRgbaDifferences: rgbaDifferences(normalCase.shot.bytes, humanNormalCase.shot.bytes),
      resetRgbaDifferences: rgbaDifferences(vocalCase.shot.bytes, resetCase.shot.bytes),
      alphaBounds: {left, top, right, bottom}, insideSafeArea: left >= safe.left && top >= safe.top
        && right < savedProps.canvas.width - safe.right && bottom < savedProps.canvas.height - safe.bottom,
      cases: rasterCases.map(({name, plan, measurement, shot}) => ({name, plan, measurement, png: shot.png}))};
    await writeFile(path.join(output, 'vocal-measurement.json'), `${JSON.stringify(vocalResult, null, 2)}\n`);
    const expectedVocal = structuredClone(baselinePlan);
    expectedVocal.elements[0].visualState.textStyle.fontSizePx = 128;
    assert.deepEqual(vocalCase.plan, expectedVocal);
    assert.deepEqual(humanNormalCase.plan, baselinePlan);
    assert.deepEqual(resetCase.plan, vocalCase.plan);
    assert.ok(vocalResult.normalToVocalRgbaDifferences > 0);
    assert.equal(vocalResult.humanNormalRgbaDifferences, 0);
    assert.equal(vocalResult.resetRgbaDifferences, 0);
    assert.equal(vocalResult.insideSafeArea, true);
    assert.equal(vocalCase.measurement.selection.count, 0);
    assert.equal(vocalCase.measurement.readyMarker, 'true');
    assert.ok(vocalCase.measurement.texts.filter(text => !text.stroke).every(text => text.fill === normalColor));
    await page.evaluate('SpanQC.clear()');
    for (const fixture of fixtures) {
      const {baseline, focused} = resolveFixture(fixture);
      const propsFor = element => ({...savedProps, instructionId: fixture.name,
        text: element.text, indexedLines: element.indexedLines,
        visualState: {...savedProps.visualState, textStyle: {...savedProps.visualState.textStyle,
          fontColor: element.visualState.textStyle.fontColor}},
        ...(element.presentationColorRange ? {presentationColorRange: element.presentationColorRange} : {})});
      const normalProps = propsFor(baseline), focusedProps = propsFor(focused);
      await page.evaluate('SpanQC.clear()');
      const phase1 = await measure(normalProps, 'Phase1QC');
      const phase1Png = await shot(`${fixture.name}-phase1-normal`);
      await page.evaluate('Phase1QC.clear()');
      const normal = await measure(normalProps);
      const normalPng = await shot(`${fixture.name}-normal`);
      await onlyFill(); const normalFill = await shot(`${fixture.name}-normal-fill`);
      await onlyStroke(); const normalStroke = await shot(`${fixture.name}-normal-stroke`);
      const focus = await measure(focusedProps);
      const focusPng = await shot(`${fixture.name}-focus`);
      await onlyFill(); const focusFill = await shot(`${fixture.name}-focus-fill`);
      await onlyStroke(); const focusStroke = await shot(`${fixture.name}-focus-stroke`);
      // Check the component's owned selection before a diagnostic intentionally
      // replaces it with an independent mask-observation Range.
      const cleared = await page.evaluate('SpanQC.clear()');
      await measure(focusedProps);
      const maskSelection = await page.evaluate(`SpanQC.selectMask(${JSON.stringify(focusedProps)},${JSON.stringify(focused.presentationColorRange)})`);
      const focusMask = await shot(`${fixture.name}-selected-mask`);
      let nativeColorMask = null;
      if (fixture.nativeColorText) {
        const startCodePoint = Array.from(baseline.text.slice(0,baseline.text.indexOf(fixture.nativeColorText))).length;
        await measure(focusedProps);
        await page.evaluate(`SpanQC.selectMask(${JSON.stringify(focusedProps)},${JSON.stringify({startCodePoint,
          endCodePointExclusive:startCodePoint+Array.from(fixture.nativeColorText).length})})`);
        nativeColorMask = await shot(`${fixture.name}-native-color-mask`);
      }
      await page.evaluate('SpanQC.clear()');
      let alphaDifferences = 0, fillAlphaDifferences = 0, outsideDifferences = 0, backgroundDifferences = 0,
        selectedPixels = 0, selectedChangedPixels = 0, focusInteriorPixels = 0, nativeColorPixels = 0,
        nativeColorDifferences = 0, ordinarySelectedPixels = 0, ordinaryChangedPixels = 0;
      let left = Infinity, top = Infinity, right = -1, bottom = -1;
      for (let i = 0; i < normalPng.bytes.length; i += 4) {
        const n = normalPng.bytes, f = focusPng.bytes;
        if (n[i+3] !== f[i+3]) alphaDifferences++;
        if (normalFill.bytes[i+3] !== focusFill.bytes[i+3]) fillAlphaDifferences++;
        const changed = n.subarray(i,i+4).compare(f.subarray(i,i+4)) !== 0;
        if (!n[i+3] && changed) backgroundDifferences++;
        if (focusMask.bytes[i+3] === 0) { if (changed) outsideDifferences++; }
        else {
          selectedPixels++; if (changed) selectedChangedPixels++;
          if (nativeColorMask?.bytes[i+3]) {
            nativeColorPixels++; if (changed) nativeColorDifferences++;
          } else {
            ordinarySelectedPixels++; if (changed) ordinaryChangedPixels++;
            if (focusFill.bytes[i] === 255 && focusFill.bytes[i+1] === 214 && focusFill.bytes[i+2] === 90
              && focusFill.bytes[i+3] === 255) focusInteriorPixels++;
          }
        }
        if (n[i+3]) {
          const pixel = i/4, x = pixel % savedProps.canvas.width, y = Math.floor(pixel/savedProps.canvas.width);
          left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y);
        }
      }
      const safe = savedProps.canvas.safeAreaPx;
      const result = {name: fixture.name, fixture, range: focused.presentationColorRange,
        phase1NormalRgbaDifferences:rgbaDifferences(phase1Png.bytes,normalPng.bytes),
        phase1GeometryUnchanged:JSON.stringify(geometry(phase1))===JSON.stringify(geometry(normal)),
        phase1GlyphPositionsUnchanged:JSON.stringify(textGeometry(phase1))===JSON.stringify(textGeometry(normal)),
        geometryUnchanged: JSON.stringify(geometry(normal)) === JSON.stringify(geometry(focus)),
        glyphPositionsUnchanged: JSON.stringify(textGeometry(normal)) === JSON.stringify(textGeometry(focus)),
        strokeRgbaDifferences:rgbaDifferences(normalStroke.bytes,focusStroke.bytes),
        wholeRgbaDifferences:rgbaDifferences(normalPng.bytes,focusPng.bytes),
        alphaDifferences, fillAlphaDifferences, outsideDifferences, backgroundDifferences,
        selectedPixels, selectedChangedPixels, focusInteriorPixels, nativeColorPixels, nativeColorDifferences,
        ordinarySelectedPixels, ordinaryChangedPixels, selectionClearedOnUnmount:cleared.selectionCount===0,
        alphaBounds: {left,top,right,bottom}, insideSafeArea: left>=safe.left && top>=safe.top
          && right<savedProps.canvas.width-safe.right && bottom<savedProps.canvas.height-safe.bottom,
        pngs: [phase1Png,normalPng,normalFill,normalStroke,focusPng,focusFill,focusStroke,focusMask,
          ...(nativeColorMask?[nativeColorMask]:[])].map(x => x.png), phase1, normal, focus, maskSelection};
      results.push(result);
      await writeFile(path.join(output, `${fixture.name}-measurement.json`), `${JSON.stringify(result,null,2)}\n`);
    }
  } finally { await browser.close({silent:true}); }
  const bindings = await Promise.all(Object.keys(bundle.metafile.inputs).filter(file => file !== '<stdin>')
    .map(async file => ({path: file, fileSha256: sha(await readFile(path.resolve(root,file)))})));
  await writeFile(path.join(output, 'summary.json'), `${JSON.stringify({schemaVersion:'presentation-span-raster-qc-v002',
    runtime: process.version, phase1Commit, phase1SourceBindings:phase1Sources,
    fontBinding:{path:fontPath,fileSha256:sha(fontBytes)},
    chromiumBinding:{path:chromePath,fileSha256:sha(await readFile(chromePath))}, sourceBindings:bindings,
    results, vocalResult, externalApiCalls:0, costUsd:0}, null, 2)}\n`);
  for (const result of results) {
    const message = `${result.name}: ${JSON.stringify({...result, pngs:undefined, phase1:undefined, normal:undefined, focus:undefined})}`;
    assert.equal(result.phase1NormalRgbaDifferences, 0, message);
    assert.equal(result.phase1GeometryUnchanged, true, message);
    assert.equal(result.phase1GlyphPositionsUnchanged, true, message);
    assert.equal(result.geometryUnchanged, true, message);
    assert.equal(result.glyphPositionsUnchanged, true, message);
    assert.equal(result.strokeRgbaDifferences, 0, message);
    assert.equal(result.alphaDifferences, 0, message);
    assert.equal(result.fillAlphaDifferences, 0, message);
    assert.equal(result.outsideDifferences, 0, message);
    assert.equal(result.backgroundDifferences, 0, message);
    assert.ok(result.selectedPixels > 0, message);
    assert.equal(result.focus.ready, true, message);
    assert.equal(result.focus.pendingHandles, 0, message);
    assert.equal(result.focus.readyMarker, 'true', message);
    assert.equal(result.focus.hiddenMeasurementCopies, 0, message);
    assert.equal(result.focus.selection.count, 1, message);
    assert.equal(result.focus.selection.text.replace(/[\r\n]/gu,''), result.fixture.targetText.replace(/[\r\n]/gu,''), message);
    assert.notEqual(result.focus.selection.startFillLine, null, message);
    assert.notEqual(result.focus.selection.endFillLine, null, message);
    assert.ok(result.focus.texts.every(text => text.stroke ? text.userSelect==='none'
      : text.childNodes.length===1 && text.childNodes[0].type===3), message);
    assert.equal(result.selectionClearedOnUnmount, true, message);
    if (result.fixture.nativeColorText) {
      assert.ok(result.nativeColorPixels > 0, message);
      assert.equal(result.nativeColorDifferences, 0, message);
    }
    if (result.fixture.expectedColorNoop) {
      assert.equal(result.wholeRgbaDifferences, 0, message);
      assert.equal(result.selectedChangedPixels, 0, message);
      assert.equal(result.ordinarySelectedPixels, 0, message);
    } else {
      assert.ok(result.ordinarySelectedPixels > 0 && result.ordinaryChangedPixels > 0 && result.focusInteriorPixels > 0, message);
    }
    assert.equal(result.insideSafeArea, true, message);
  }
});

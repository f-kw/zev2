/** Finite, local palette raster evidence. This does not modify any saved plan,
 * implement palette selection, or claim human-quality / final-video adoption. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile, stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {canonicalJson} from './clock.mjs';
import {createPresentationDevProxyOverlaySessionV001} from '../../evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs';

export const PROBE_PALETTES_V001 = Object.freeze([
  Object.freeze({paletteId: 'yellow', name: 'Yellow', color: '#FFD65A'}),
  Object.freeze({paletteId: 'light-sky-blue', name: 'LightSkyBlue', color: '#87CEFA'}),
  Object.freeze({paletteId: 'light-coral', name: 'LightCoral', color: '#F08080'}),
]);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prefix = 'new-material-digest-20260926-v001-instruction-instruction-';
const requestedIds = ['000028', '000045', '000148-readability-02'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runFile = promisify(execFile), clone = structuredClone;
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const same = (a, b, message) => assert.equal(canonicalJson(a), canonicalJson(b), message);
async function bind(file) {
  const before = await stat(file), hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const after = await stat(file);
  for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key], 'input changed during binding');
  return {path: file, bytes: after.size, fileSha256: hash.digest('hex')};
}
export function paletteProbePropsV001(props, paletteId) {
  const palette = PROBE_PALETTES_V001.find(p => p.paletteId === paletteId);
  assert(palette, 'unknown finite probe palette');
  assert(props.presentationColorRange, 'probe does not add a Color target');
  const result = clone(props); result.presentationColorRange.fontColor = palette.color; return result;
}
export function inspectPaletteRgbaV001({baseline, colored, selectedMask, baselineFill, coloredFill,
  baselineStroke, coloredStroke, width, height, safeArea, expectedColor}) {
  const bytes = width * height * 4;
  for (const input of [baseline, colored, selectedMask, baselineFill, coloredFill, baselineStroke, coloredStroke])
    assert.equal(input.length, bytes, 'RGBA dimensions differ');
  assert(/^#[0-9a-f]{6}$/i.test(expectedColor));
  const rgb = [1, 3, 5].map(i => parseInt(expectedColor.slice(i, i + 2), 16));
  let changedPixels = 0, alphaDifferences = 0, fillAlphaDifferences = 0, outsideRangeRgbaDifferences = 0,
    transparentBackgroundDifferences = 0, strokeAndGlowRgbaDifferences = 0, selectedMaskPixels = 0,
    exactOpaqueColorPixels = 0, left = width, top = height, right = -1, bottom = -1;
  for (let i = 0; i < bytes; i += 4) {
    const changed = !baseline.subarray(i, i + 4).equals(colored.subarray(i, i + 4));
    if (changed) changedPixels++;
    if (baseline[i + 3] !== colored[i + 3]) alphaDifferences++;
    if (baselineFill[i + 3] !== coloredFill[i + 3]) fillAlphaDifferences++;
    if (!baselineStroke.subarray(i, i + 4).equals(coloredStroke.subarray(i, i + 4))) strokeAndGlowRgbaDifferences++;
    if (!baseline[i + 3] && changed) transparentBackgroundDifferences++;
    if (!selectedMask[i + 3]) {if (changed) outsideRangeRgbaDifferences++;}
    else {
      selectedMaskPixels++;
      if (coloredFill[i + 3] === 255 && rgb.every((v, j) => coloredFill[i + j] === v)) exactOpaqueColorPixels++;
    }
    if (colored[i + 3]) {const x = (i / 4) % width, y = Math.floor(i / 4 / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);}
  }
  return {changedPixels, alphaDifferences, fillAlphaDifferences, outsideRangeRgbaDifferences,
    transparentBackgroundDifferences, strokeAndGlowRgbaDifferences, selectedMaskPixels, exactOpaqueColorPixels,
    alphaBounds: {left, top, right, bottom},
    insideSafeArea: right >= left && bottom >= top && left >= safeArea.left && top >= safeArea.top
      && right < width - safeArea.right && bottom < height - safeArea.bottom};
}
export function assertPaletteRgbaV001(result, {expectChange}) {
  // Full production alpha is the required invariant. Hiding the outline/glow
  // changes the raster surface: isolated fill alpha is recorded separately and
  // is not substituted for the final overlay's byte-exact alpha check.
  for (const key of ['alphaDifferences', 'outsideRangeRgbaDifferences',
    'transparentBackgroundDifferences', 'strokeAndGlowRgbaDifferences']) assert.equal(result[key], 0, key);
  assert(result.selectedMaskPixels > 0 && result.exactOpaqueColorPixels > 0, 'selected glyph/color not observed');
  assert.equal(result.insideSafeArea, true, 'visible pixels escaped existing safe area');
  if (expectChange) assert(result.changedPixels > 0, 'new palette did not paint');
  else assert.equal(result.changedPixels, 0, 'existing Yellow changed');
}
export function summarizeLumaV001(bytes, {width, height, rect = null}) {
  assert.equal(bytes.length, width * height);
  const area = rect ?? {left: 0, top: 0, right: width - 1, bottom: height - 1};
  assert(Object.values(area).every(Number.isInteger) && area.left >= 0 && area.top >= 0
    && area.right < width && area.bottom < height && area.right >= area.left && area.bottom >= area.top);
  const histogram = Array(256).fill(0); let sum = 0, count = 0;
  for (let y = area.top; y <= area.bottom; y++) for (let x = area.left; x <= area.right; x++) {
    const value = bytes[y * width + x]; histogram[value]++; sum += value; count++;
  }
  return {sampleCount: count, sum, mean: sum / count, minimum: histogram.findIndex(n => n > 0),
    maximum: histogram.findLastIndex(n => n > 0), histogram, rectangle: area,
    interpretation: 'decoded source Y plane; no acceptance threshold or invented RGB weights'};
}

// Diagnostic observation follows presentation_auto_effects_span_v001.test.mjs:
// render the unchanged component, then hide fill or outline in the test DOM.
const harness = `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {buildExactTextModel,ExactOverlay} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';
let root;
const frame=()=>new Promise(r=>requestAnimationFrame(r));
export async function draw(props){
 if(root){flushSync(()=>root.unmount());root=null;}document.body.replaceChildren();
 document.body.style.margin='0';window.remotion_staticBase='';window.remotion_renderReady=false;
 const host=document.createElement('div');host.id='mount';document.body.append(host);root=createRoot(host);
 flushSync(()=>root.render(React.createElement(ExactOverlay,props)));
 const deadline=performance.now()+30000;
 while(!window.remotion_renderReady||window.remotion_delayRenderHandles.length!==0){
  if(performance.now()>deadline)throw Error('overlay not ready');await frame();}
 await frame();const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height});
 return {exact:buildExactTextModel(props),texts:[...document.querySelectorAll('svg text')].map(e=>({
  text:e.textContent,stroke:e.getAttribute('stroke'),length:e.getComputedTextLength(),bbox:rect(e.getBBox()),
  characterBoxes:Array.from({length:e.getNumberOfChars()},(_,i)=>rect(e.getExtentOfChar(i)))}))};
}
export async function fillOnly(){document.querySelectorAll('svg text[stroke]').forEach(e=>e.style.visibility='hidden');await frame();}
export async function strokeOnly(){document.querySelectorAll('svg text').forEach(e=>e.style.visibility=e.hasAttribute('stroke')?'visible':'hidden');await frame();}
export async function mask(props){
 document.querySelectorAll('svg text[stroke]').forEach(e=>e.style.visibility='hidden');
 const fills=[...document.querySelectorAll('svg text:not([stroke])')];fills.forEach(e=>e.style.fill='transparent');
 const style=document.createElement('style');style.textContent='#mount svg text::selection {fill:#FFFFFF!important;color:#FFFFFF!important;background-color:transparent!important;text-shadow:none!important}';document.body.append(style);
 const locations=[];props.indexedLines.forEach((line,lineIndex)=>{let offset=0;line.characters.filter(c=>c.role==='visible').forEach(c=>{
  if(c.sourceIndex>=props.presentationColorRange.startCodePoint&&c.sourceIndex<props.presentationColorRange.endCodePointExclusive)locations.push({lineIndex,start:offset,end:offset+c.character.length});offset+=c.character.length;});});
 if(!locations.length)throw Error('mask empty');const first=locations[0],last=locations.at(-1),range=new Range();
 range.setStart(fills[first.lineIndex].firstChild,first.start);range.setEnd(fills[last.lineIndex].firstChild,last.end);
 getSelection().removeAllRanges();getSelection().addRange(range);await frame();return {text:getSelection().toString(),rangeText:range.toString()};
}`;
function geometry(measurement) {return {...measurement, exact: {...measurement.exact,
  textModel: {...measurement.exact.textModel, lines: measurement.exact.textModel.lines.map(({colorRuns, ...line}) => line)}}};}

export async function runCaptionPalettePixelProbeV001({completionPath, outputDirectory}) {
  assert(path.isAbsolute(completionPath) && path.isAbsolute(outputDirectory));
  const allowed = path.join(repositoryRoot, 'runtime/artifacts/caption-palette-20260929-v001');
  assert(path.dirname(outputDirectory) === allowed, 'probe output outside owned palette run');
  await mkdir(outputDirectory); // Existing evidence is never overwritten.
  const startedAt = new Date().toISOString(), start = performance.now(), completion = await json(completionPath);
  assert.equal(completion.status, 'development-proxy-ready'); assert.equal(completion.profileId, 'dev-proxy-540p-v001');
  const {tools} = completion, width = 960, height = 540, scale = 0.5;
  const inputs = [await bind(completionPath), await bind(fileURLToPath(import.meta.url)),
    await bind(completion.drawingEvidenceRef.path), await bind(completion.localMedia.videoAndPcm.path)];
  assert.equal(inputs[2].fileSha256, completion.drawingEvidenceRef.fileSha256);
  assert.equal(inputs[3].fileSha256, completion.localMedia.videoAndPcm.fileSha256);
  const records = requestedIds.map(id => {
    const found = completion.stateRecords.filter(r => r.captionId === prefix + id);
    assert.equal(found.length, 1, 'probe only admits existing static Color captions');
    assert.equal(found[0].state, 'static'); assert.equal(found[0].props.presentationColorRange.fontColor, '#FFD65A');
    return {id, record: found[0]};
  });
  const commands = [], operations = [], results = [], screenshots = [];
  const run = async (command, args) => {
    const start = performance.now();
    try {const result = await runFile(command, args, {encoding: 'buffer', maxBuffer: 8 * 1024 * 1024});
      commands.push({command, args, wallMilliseconds: performance.now() - start, status: 'passed', stdoutSha256: sha(result.stdout)});return result.stdout;
    } catch (error) {commands.push({command, args, wallMilliseconds: performance.now() - start, status: 'failed', stderr: String(error.stderr ?? error.message)});throw error;}
  };
  const rgba = file => run(tools.imageMagickPath, [file, '-depth', '8', 'rgba:-']);
  const observer = {async observeOperation(descriptor, callback) {
    const start = performance.now();try {const result = await callback();operations.push({observationLabel: descriptor.observationLabel,
      operationKind: descriptor.operationKind, wallMilliseconds: performance.now() - start, status: 'passed'});return result;}
    catch (error) {operations.push({observationLabel: descriptor.observationLabel, status: 'failed', error: error.message});throw error;}
  }};
  const req = createRequire(path.join(repositoryRoot, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const {openBrowser} = remotion('@remotion/renderer');
  const {screenshot} = remotion(path.join(path.dirname(remotion.resolve('@remotion/renderer')), 'puppeteer-screenshot.js'));
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const bundle = await build({stdin: {contents: harness, resolveDir: repositoryRoot, loader: 'tsx'}, bundle: true,
    write: false, platform: 'browser', format: 'iife', globalName: 'PaletteProbe',
    nodePaths: [path.join(repositoryRoot, 'runner/node_modules')], define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  const sourceBindings = await Promise.all(Object.keys(bundle.metafile.inputs).filter(p => p !== '<stdin>').map(p => bind(path.resolve(repositoryRoot, p))));
  const fontPath = path.join(repositoryRoot, 'runner/public/font/LINESeedJP_A_OTF_Eb.otf'), font = await readFile(fontPath);
  inputs.push(await bind(fontPath), await bind(tools.chromiumPath), await bind(tools.ffmpegPath), await bind(tools.imageMagickPath));
  await writeFile(path.join(outputDirectory, 'diagnostic-browser.js'), bundle.outputFiles[0].text, {flag: 'wx'});
  const server = createServer((request, response) => {
    if (request.url === '/font/LINESeedJP_A_OTF_Eb.otf') {response.writeHead(200, {'Content-Type': 'font/otf'});response.end(font);}
    else if (request.url === '/') {response.writeHead(200, {'Content-Type': 'text/html'});response.end('<!doctype html><html><body></body></html>');}
    else {response.writeHead(404);response.end();}
  });
  let browser, session;
  try {
    await new Promise((resolve, reject) => {server.once('error', reject);server.listen(0, '127.0.0.1', resolve);});
    browser = await openBrowser('chrome', {browserExecutable: tools.chromiumPath, forceDeviceScaleFactor: scale, logLevel: 'error'});
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: scale});
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});await page.evaluate(bundle.outputFiles[0].text);
    const shot = async name => {
      const png = path.join(outputDirectory, name + '.png'), bytes = await screenshot({page, type: 'png', omitBackground: true, width: 1920, height: 1080, scale});
      assert.equal(bytes.readUInt32BE(16), width);assert.equal(bytes.readUInt32BE(20), height);
      await writeFile(png, bytes, {flag: 'wx'});screenshots.push(png);return {png, bytes: await rgba(png)};
    };
    session = createPresentationDevProxyOverlaySessionV001({repositoryRoot,
      entryPoint: path.join(repositoryRoot, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'),
      publicDir: path.join(repositoryRoot, 'runner/public'), remotionPath: tools.remotionPath,
      chromiumPath: tools.chromiumPath, processObserver: observer, profileId: completion.profileId});
    for (const {id, record} of records) {
      const recordRef = await bind(record.png.path);same(recordRef, record.png, 'saved original overlay changed');inputs.push(recordRef);
      const savedYellow = await rgba(record.png.path);let baseline, baselineGeometry;
      await page.evaluate(`PaletteProbe.draw(${JSON.stringify(record.props)})`);
      const maskSelection = await page.evaluate(`PaletteProbe.mask(${JSON.stringify(record.props)})`), mask = await shot(id + '-selected-mask');
      const paletteRows = [];
      for (const palette of PROBE_PALETTES_V001) {
        const props = paletteProbePropsV001(record.props, palette.paletteId), name = id + '-' + palette.paletteId;
        const png = path.join(outputDirectory, name + '-production.png');await session.render(props, png);
        const production = await rgba(png), measurement = await page.evaluate(`PaletteProbe.draw(${JSON.stringify(props)})`);
        const full = await shot(name + '-diagnostic-full');assert(production.equals(full.bytes), 'independent harness differs from production pixels');
        await page.evaluate('PaletteProbe.fillOnly()');const fill = await shot(name + '-fill');
        await page.evaluate('PaletteProbe.strokeOnly()');const stroke = await shot(name + '-stroke-glow');
        if (!baseline) {assert(production.equals(savedYellow), 'new Yellow differs from saved 7B overlay');baseline = {full, fill, stroke};baselineGeometry = geometry(measurement);}
        same(geometry(measurement), baselineGeometry, 'glyph/line/wrapper geometry changed');
        const safeArea = Object.fromEntries(Object.entries(props.canvas.safeAreaPx).map(([k, v]) => [k, v * scale]));
        const inspected = inspectPaletteRgbaV001({baseline: baseline.full.bytes, colored: production, selectedMask: mask.bytes,
          baselineFill: baseline.fill.bytes, coloredFill: fill.bytes, baselineStroke: baseline.stroke.bytes, coloredStroke: stroke.bytes,
          width, height, safeArea, expectedColor: palette.color});
        assertPaletteRgbaV001(inspected, {expectChange: palette.paletteId !== 'yellow'});
        paletteRows.push({...palette, ...inspected, productionPng: await bind(png), independentHarnessMatchesProduction: true,
          lineAndGlyphGeometryUnchanged: true, lineTexts: props.indexedLines.map(l => l.text),
          diagnosticPngs: [full.png, fill.png, stroke.png]});
      }
      results.push({captionId: record.captionId, text: record.element.text, range: record.props.presentationColorRange,
        frameRange: {startFrame: record.element.startFrame, endFrameExclusive: record.element.endFrameExclusive},
        savedYellowMatchesProduction: true, maskPng: mask.png, maskSelection, palettes: paletteRows});
    }
    await session.close();session = null;await browser.close({silent: true});browser = null;
    const frames = records.map(({record}) => Math.floor((record.element.startFrame + record.element.endFrameExclusive - 1) / 2));
    const select = frames.map(frame => `eq(n\\,${frame})`).join('+'), backgroundPath = completion.localMedia.videoAndPcm.path;
    await run(tools.ffmpegPath, ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', backgroundPath,
      '-filter_complex', `[0:v]select=${select},split=2[p][y];[y]extractplanes=y[l]`,
      '-map', '[p]', '-frames:v', String(frames.length), '-fps_mode', 'passthrough', path.join(outputDirectory, 'background-%02d.png'),
      '-map', '[l]', '-frames:v', String(frames.length), '-fps_mode', 'passthrough', '-f', 'rawvideo', path.join(outputDirectory, 'background-y.gray')]);
    const lumaBytes = await readFile(path.join(outputDirectory, 'background-y.gray'));assert.equal(lumaBytes.length, width * height * frames.length);
    const backgrounds = [];
    for (const [index, frame] of frames.entries()) {
      const backgroundPng = path.join(outputDirectory, `background-${String(index + 1).padStart(2, '0')}.png`);
      const bytes = lumaBytes.subarray(index * width * height, (index + 1) * width * height);
      const alphaBounds = results[index].palettes[0].alphaBounds;
      const composites = [];
      for (const palette of results[index].palettes) {
        const composite = path.join(outputDirectory, records[index].id + '-' + palette.paletteId + '-on-background.png');
        await run(tools.imageMagickPath, [backgroundPng, palette.productionPng.path, '-compose', 'Over', '-composite', composite]);
        composites.push({paletteId: palette.paletteId, png: await bind(composite)});
      }
      backgrounds.push({captionId: results[index].captionId, frame, seconds: frame / 30,
        sourceBackground: completion.localMedia.videoAndPcm, backgroundPng: await bind(backgroundPng),
        wholeFrameY: summarizeLumaV001(bytes, {width, height}),
        subtitleAreaY: summarizeLumaV001(bytes, {width, height, rect: alphaBounds}), composites});
    }
    const sorted = backgrounds.map((b, index) => ({index, mean: b.subtitleAreaY.mean})).sort((a, b) => a.mean - b.mean);
    for (const ref of [...inputs, ...sourceBindings]) same(await bind(ref.path), ref, 'bound input changed during probe');
    const summary = {schemaVersion: 'caption-palette-pixel-probe-v001', status: 'passed', startedAt, endedAt: new Date().toISOString(),
      wallMilliseconds: performance.now() - start, scope: 'Local 540p Color-only raster probe; no automatic selection or formal palette adoption.',
      palettes: PROBE_PALETTES_V001, inputs, sourceBindings, dimensions: {width, height, logicalWidth: 1920, logicalHeight: 1080},
      results, backgrounds, diagnosticScope: {required: ['full production RGBA outside selected glyph mask identical',
        'full production alpha identical', 'isolated stroke and glow RGBA identical', 'line and glyph geometry identical',
        'existing safe area respected', 'opaque selected glyph pixels use the specified finite color'],
        auxiliary: 'fillAlphaDifferences reports the separately captured fill after hiding outline/glow. A difference is preserved as an observation; final-overlay alpha is checked independently with no tolerance.',
        priorRun: 'pixel-probe-v002 stopped on an over-broad auxiliary fill-alpha assertion; complete overlay and isolated outline invariants were not weakened.'},
      brightnessComparison: {basis: 'Mean decoded Y inside observed subtitle alpha bounds among these three actual frames only; no bright/dark threshold.',
        darkerSampleIndex: sorted[0].index, lighterSampleIndex: sorted.at(-1).index},
      processes: commands, operations, humanQuality: 'not-evaluated', finalVideoQc: 'not-run', externalApiCalls: 0};
    await save(path.join(outputDirectory, 'summary.json'), summary);return summary;
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion: 'caption-palette-pixel-probe-failure-v001',
      startedAt, endedAt: new Date().toISOString(), error: error.stack, inputs, results, commands, operations});throw error;
  } finally {await session?.close();await browser?.close({silent: true});if (server.listening) await new Promise(resolve => server.close(resolve));}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const completionPath = path.resolve(process.argv[2] ?? 'runtime/artifacts/digest-structure-20260929-v001/candidate/completion.json');
  const outputDirectory = path.resolve(process.argv[3] ?? 'runtime/artifacts/caption-palette-20260929-v001/pixel-probe-v001');
  const result = await runCaptionPalettePixelProbeV001({completionPath, outputDirectory});
  console.log(JSON.stringify({status: result.status, outputDirectory, cases: result.results.length,
    paletteDraws: result.results.reduce((n, r) => n + r.palettes.length, 0), wallMilliseconds: result.wallMilliseconds}));
}

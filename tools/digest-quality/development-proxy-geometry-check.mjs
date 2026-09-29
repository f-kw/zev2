/** 7P bounded real-raster checks: one saved Scale and five synthetic Pulse states.
 * Source decisions and the saved 7A raster/quality evidence stay read-only.
 * This is a development geometry check, not final pixel QC or human adoption.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {PRESENTATION_DEV_PROXY_PROFILE_V001} from '../../evals/clip_composition/presentation_dev_proxy_profile_v001.mjs';
import {createPresentationDevProxyOverlaySessionV001} from '../../evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs';
import {PRESENTATION_PULSE_READABILITY_PRESET_V001, buildPresentationPulseStateElementsV001,
  getPresentationPulseProgramV001, assertPresentationPulseAnchorsV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {createPresentationRendererOverlayJobV001, runPresentationRendererChildProcessV001}
  from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectOverlayPngWithToolV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runDirectory = path.join(root, 'runtime/artifacts/development-proxy-20260929-v001');
const output = path.join(runDirectory, 'geometry-fixtures');
const jobPath = path.join(runDirectory, 'job.json');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const canonicalSha = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const save = (name, value) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file) {
  const before = await lstat(file); assert(before.isFile() && !before.isSymbolicLink());
  const h = createHash('sha256'); for await (const bytes of createReadStream(file)) h.update(bytes);
  const after = await lstat(file);
  for (const key of ['size', 'mtimeMs', 'ino']) assert.equal(after[key], before[key], 'file changed while hashing');
  return {path: file, bytes: before.size, fileSha256: h.digest('hex')};
}
async function verify(ref) {assert.deepEqual(await bind(ref.path), ref, 'saved input or drawing changed');}
async function capacity(file) {
  const info = await lstat(file); assert(info.isFile() && !info.isSymbolicLink());
  return {logicalBytes: info.size, allocatedBytes: info.blocks * 512,
    allocationBasis: 'filesystem st_blocks times 512; not physical device I/O'};
}
async function fixedInput() {
  const job = await json(jobPath); await verify(job.drawingEvidenceRef);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(job.drawingEvidenceRef.path));
  const plan = view.resolvedPlan, registry = job.preservedDrawingRules.candidateExecution.registry;
  const selection = view.effectiveSelections.find(row => row.captionId.endsWith('000071'));
  assert.deepEqual(selection.selection, {role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'});
  const scale = plan.elements.find(element => element.instructionId === selection.captionId);
  assert.equal(scale.visualState.textStyle.fontSizePx, 192); assert(!scale.presentationMotion && !scale.presentationPulse);
  const pulseSource = view.projectedNormalPlan.elements.find(element => element.instructionId.endsWith('000053'));
  assert(pulseSource && !pulseSource.presentationMotion && !pulseSource.presentationPulse && !pulseSource.presentationColorRange);
  const pulse = structuredClone(pulseSource);
  pulse.instructionId = '7p-synthetic-pulse'; pulse.startFrame = 0; pulse.endFrameExclusive = 90; pulse.displayFrameCount = 90;
  pulse.presentationPulse = {presentation: 'provisional-pulse', presetVersion: 'presentation-pulse-readability-v001',
    anchorPeakId: 'synthetic-not-a-new-audio-observation', anchorFrame: 30};
  const program = getPresentationPulseProgramV001({element: pulse, canvas: plan.canvas});
  const states = buildPresentationPulseStateElementsV001({element: pulse, canvas: plan.canvas});
  assert.deepEqual(states.map(row => row.state), PRESENTATION_PULSE_READABILITY_PRESET_V001.states.map(row => row.state));
  assert.equal(program.anchorFrame, 30);
  const actualPulseCount = plan.elements.filter(element => element.presentationPulse).length;
  assert.equal(actualPulseCount, 0, 'this synthetic fixture must not be represented as an actual selected Pulse');
  const fixtures = [{label: 'saved-scale-000071', state: 'static', element: structuredClone(scale)},
    ...states.map(row => ({label: 'synthetic-pulse-' + row.state, ...structuredClone(row)}))];
  return {job, view, plan, registry, fixtures, pulse, program, pulseSource, actualPulseCount};
}
async function runtime() {
  return {ffmpegPath: await realpath('/opt/homebrew/bin/ffmpeg'), imageMagickPath: await realpath('/opt/homebrew/bin/magick'),
    remotionPath: path.join(root, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath: path.join(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    tsxPath: path.join(root, 'runner/node_modules/tsx/dist/cli.mjs'),
    layoutInspectorPath: path.join(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
}
async function draw() {
  const fixed = await fixedInput(), tools = await runtime(); await mkdir(output);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(output, 'draw-processes')});
  const full = createPresentationRendererOverlayJobV001({...tools, processObserver: observer});
  const proxy = createPresentationDevProxyOverlaySessionV001({...tools, processObserver: observer, repositoryRoot: root,
    entryPoint: path.join(root, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'),
    publicDir: path.join(root, 'runner/public'), profileId: PRESENTATION_DEV_PROXY_PROFILE_V001.profileId});
  const startedAt = new Date().toISOString(), start = performance.now();
  try {
    const props = fixed.fixtures.map(row => full.buildProps(row.element, fixed.plan, fixed.registry));
    const layoutInputPath = path.join(output, 'logical-layout-input.json'), layoutPath = path.join(output, 'logical-layout.json');
    await save('logical-layout-input.json', {canvas: fixed.plan.canvas, overlays: props});
    await runPresentationRendererChildProcessV001(tools.tsxPath, [tools.layoutInspectorPath, layoutInputPath, layoutPath],
      {processObserver: observer, observationLabel: 'geometry-logical-layout', env: {NODE_PATH: path.join(root, 'runner/node_modules')}});
    const layout = await json(layoutPath); assert.equal(layout.status, 'passed'); assert.equal(layout.items.length, 6);
    assertPresentationPulseAnchorsV001(layout.items.slice(1));
    const rows = [];
    for (const [index, fixture] of fixed.fixtures.entries()) {
      const sourcePath = path.join(output, fixture.label + '-1080p.png');
      const proxyPath = path.join(output, fixture.label + '-540p.png');
      await full.renderStill(props[index], sourcePath);
      const proxyResult = await proxy.render(props[index], proxyPath);
      assert.deepEqual(proxyResult.sourceCanvas, PRESENTATION_DEV_PROXY_PROFILE_V001.sourceCanvas);
      assert.deepEqual(proxyResult.outputCanvas, PRESENTATION_DEV_PROXY_PROFILE_V001.outputCanvas);
      rows.push({...fixture, props: props[index], propsCanonicalSha256: canonicalSha(props[index]),
        logicalLayout: layout.items[index], sourcePng: await bind(sourcePath), proxyPng: await bind(proxyPath)});
      console.log(JSON.stringify({phase: 'geometry-rendered', state: fixture.label, completed: index + 1, total: 6}));
    }
    await full.close(); await proxy.close();
    await verify(fixed.job.drawingEvidenceRef);
    const bindings = await Promise.all([fileURLToPath(import.meta.url), ...Object.values(tools),
      path.join(root, 'evals/clip_composition/presentation_dev_proxy_profile_v001.mjs'),
      path.join(root, 'evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs')]
      .map(async file => bind(await realpath(file))));
    await save('drawings.json', {schemaVersion: 'development-proxy-geometry-drawings-v001', status: 'drawn',
      startedAt, endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - start,
      drawingEvidenceRef: fixed.job.drawingEvidenceRef, sourcePlanCanonicalSha256: canonicalSha(fixed.plan),
      registryCanonicalSha256: canonicalSha(fixed.registry), profile: PRESENTATION_DEV_PROXY_PROFILE_V001,
      actualPulseCount: fixed.actualPulseCount, pulse: {origin: 'synthetic fixture only; no saved decision or audio observation changed',
        sourceCaptionId: fixed.pulseSource.instructionId, caption: fixed.pulse,
        sourceProgram: fixed.program, proxyProgram: getPresentationPulseProgramV001({element: fixed.pulse, canvas: fixed.plan.canvas}),
        orderedStates: fixed.fixtures.slice(1).map(row => row.state)},
      layoutRef: await bind(layoutPath), rows, bindings, tools, processTimings: observer.getPerformance(),
      finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'});
  } catch (error) {
    await save('draw-failure.json', {status: 'incomplete', startedAt, message: error.message}).catch(() => {}); throw error;
  } finally {await full.close(); await proxy.close();}
}
function assertSafe(bounds, canvas, safe) {
  assert(bounds && bounds.width > 0 && bounds.height > 0, 'nonempty alpha required');
  assert(bounds.left >= safe.left && bounds.top >= safe.top
    && bounds.right <= canvas.width - safe.right && bounds.bottom <= canvas.height - safe.bottom,
  'physical alpha escaped the projected safe area');
}
async function verifyDrawings() {
  const drawings = await json(path.join(output, 'drawings.json')), fixed = await fixedInput();
  assert.equal(drawings.sourcePlanCanonicalSha256, canonicalSha(fixed.plan));
  assert.equal(drawings.registryCanonicalSha256, canonicalSha(fixed.registry));
  assert.deepEqual(drawings.profile, PRESENTATION_DEV_PROXY_PROFILE_V001);
  assert.deepEqual(drawings.pulse.sourceProgram, fixed.program); assert.deepEqual(drawings.pulse.proxyProgram, fixed.program);
  assert.deepEqual(drawings.pulse.orderedStates, fixed.fixtures.slice(1).map(row => row.state));
  await verify(drawings.layoutRef); for (const ref of drawings.bindings) await verify(ref);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(output, 'measure-processes')});
  const startedAt = new Date().toISOString(), start = performance.now(), rows = [];
  const safe = fixed.plan.canvas.safeAreaPx, halfSafe = Object.fromEntries(Object.entries(safe).map(([key, value]) => [key, value / 2]));
  const formats = [{name: 'rgb24', bytesPerPixel: 3}, {name: 'rgba', bytesPerPixel: 4}, {name: 'gbrap', bytesPerPixel: 4}];
  const measures = [];
  for (const [index, row] of drawings.rows.entries()) {
    const expected = fixed.fixtures[index]; assert.deepEqual(row.element, expected.element); assert.equal(row.state, expected.state);
    assert.equal(row.propsCanonicalSha256, canonicalSha(row.props));
    const observations = {};
    for (const [name, ref, canvas, safeArea] of [['source', row.sourcePng, drawings.profile.sourceCanvas, safe],
      ['proxy', row.proxyPng, drawings.profile.outputCanvas, halfSafe]]) {
      await verify(ref); const bytes = await readFile(ref.path);
      assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
      assert.equal(bytes.readUInt32BE(16), canvas.width); assert.equal(bytes.readUInt32BE(20), canvas.height);
      const alpha = await inspectOverlayPngWithToolV001({instructionId: row.element.instructionId,
        pngPath: ref.path, imageMagickPath: drawings.tools.imageMagickPath,
        processObserver: observer, observationLabelPrefix: 'geometry-alpha'});
      assert(alpha.alphaMax > 0); assertSafe(alpha.alphaBounds, canvas, safeArea);
      const rawPaths = formats.map(format => path.join(output, `${row.label}-${name}.${format.name}`));
      const args = ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-threads', '1', '-i', ref.path];
      for (const [i, format] of formats.entries()) args.push('-map', '0:v:0', '-frames:v', '1', '-threads', '1',
        '-pix_fmt', format.name, '-f', 'rawvideo', rawPaths[i]);
      await runPresentationRendererChildProcessV001(drawings.tools.ffmpegPath, args,
        {processObserver: observer, observationLabel: 'geometry-raw-decode'});
      const raw = [];
      for (const [i, format] of formats.entries()) {
        const rawRef = await bind(rawPaths[i]); assert.equal(rawRef.bytes, canvas.width * canvas.height * format.bytesPerPixel);
        const allocation = await capacity(rawPaths[i]);
        raw.push({pixelFormat: format.name, ref: rawRef, ...allocation, retained: false,
          cleanupBasis: 'new diagnostic raw only; successful decode, size and SHA saved; source PNG retained'});
      }
      // Delete only the exact successful files this invocation created. Failed
      // decode or measurement leaves evidence and never reaches this branch.
      for (const rawRecord of raw) {await verify(rawRecord.ref); await unlink(rawRecord.ref.path);}
      observations[name] = {canvas, safeArea, alphaBounds: alpha.alphaBounds, alphaMax: alpha.alphaMax,
        png: {...ref, ...await capacity(ref.path)}, raw};
      measures.push({resolution: name, png: observations[name].png, raw});
    }
    const projected = Object.fromEntries(Object.entries(observations.source.alphaBounds).map(([key, value]) => [key, value / 2]));
    const delta = Object.fromEntries(Object.entries(observations.proxy.alphaBounds).map(([key, value]) => [key, value - projected[key]]));
    rows.push({label: row.label, state: row.state, captionId: row.element.instructionId,
      clock: {startFrame: row.element.startFrame, endFrameExclusive: row.element.endFrameExclusive,
        displayFrameCount: row.element.displayFrameCount}, sourceFontPx: row.element.visualState.textStyle.fontSizePx,
      physicalProxyFontPx: row.element.visualState.textStyle.fontSizePx / 2,
      source: observations.source, proxy: observations.proxy, projectedSourceAlphaBounds: projected,
      observedAlphaMinusProjectedSourcePx: delta});
  }
  const summarize = name => ({
    pngLogicalBytes: measures.filter(row => row.resolution === name).reduce((n, row) => n + row.png.logicalBytes, 0),
    pngAllocatedBytes: measures.filter(row => row.resolution === name).reduce((n, row) => n + row.png.allocatedBytes, 0),
    rawFormats: Object.fromEntries(formats.map(format => [format.name, {
      cumulativeGeneratedLogicalBytes: measures.filter(row => row.resolution === name).reduce((n, row) => n + row.raw.find(r => r.pixelFormat === format.name).logicalBytes, 0),
      cumulativeGeneratedAllocatedBytes: measures.filter(row => row.resolution === name).reduce((n, row) => n + row.raw.find(r => r.pixelFormat === format.name).allocatedBytes, 0),
      retainedLogicalBytes: 0, retainedAllocatedBytes: 0}]))});
  await verify(fixed.job.drawingEvidenceRef);
  const result = {schemaVersion: 'development-proxy-geometry-verification-v001', status: 'passed',
    startedAt, endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - start,
    drawingsRef: await bind(path.join(output, 'drawings.json')), realPngCount: rows.length * 2,
    savedScaleCount: 1, syntheticPulseStateCount: 5, actualSavedPulseCount: fixed.actualPulseCount,
    sourceLogicalCanvasUnchanged: true, clockAndStateOrder: 'exactly rederived from saved Scale and explicit synthetic finite Pulse',
    pulseProgramSha256: canonicalSha(fixed.program), sourceLogicalLayout: 'passed', physicalAlphaSafeArea: 'passed',
    rows, capacity: {source: summarize('source'), proxy: summarize('proxy'),
      measuredMaximumConcurrentDiagnosticRawLogicalBytes: Math.max(...measures.map(row => row.raw.reduce((n, r) => n + r.logicalBytes, 0))),
      measuredMaximumConcurrentDiagnosticRawAllocatedBytes: Math.max(...measures.map(row => row.raw.reduce((n, r) => n + r.allocatedBytes, 0))),
      scope: 'three raw pixel formats coexist for one PNG; then measured and removed; PNGs retained', physicalDeviceIo: 'not-measured'},
    interpretation: 'Logical canvas and all layout inputs remain identical. Whole-raster scale halves the output canvas and spatial values. Alpha bounds can differ from exact half-pixel positions due to raster sampling, antialiasing and integer pixel coverage; deltas are observations, not a new acceptance threshold or cross-resolution byte equality claim.',
    finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated', processTimings: observer.getPerformance()};
  await save('verification.json', result);
  console.log(JSON.stringify({status: result.status, realPngCount: result.realPngCount,
    syntheticPulseStateCount: 5, actualSavedPulseCount: 0, capacity: result.capacity,
    verification: path.join(output, 'verification.json')}));
}

const mode = process.argv[2];
if (mode === 'all') {await draw(); await verifyDrawings();}
else if (mode === 'verify') await verifyDrawings();
else throw Error('use all | verify');

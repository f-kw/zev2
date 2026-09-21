import assert from 'node:assert/strict';
import {execFile, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access, mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {createPresentationOverlayRenderSessionV001} from './presentation_overlay_render_session_v001.mjs';

const execute = promisify(execFile);
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTZkAAAAASUVORK5CYII=', 'base64');
const propsFor = text => ({canvas: {width: 1, height: 1}, text, inspectionLineIndex: null,
  fontFileName: `${text}.otf`, fontFamilyName: `fixture-${text}`,
  visualState: {textStyle: {fontColor: text === 'A' ? '#FFFFFF' : '#000000'}}});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
const waitForStart = (started, request) => Promise.race([started.promise, request.then(() => {
  throw new Error('controlled operation completed before its start notification');
})]);
const absent = file => assert.rejects(access(file), {code: 'ENOENT'});

// Exercise the installed-package resolution boundary without a production-only
// injection hook. The fixture records every API call and owns no real browser.
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-overlay-session-test-'));
  const sessions = [];
  t.after(async () => {
    await Promise.allSettled(sessions.map(session => session.close()));
    await rm(directory, {recursive: true, force: true});
  });
  const statePath = path.join(directory, 'state.cjs');
  await writeFile(statePath, 'module.exports = {};\n');
  const state = require(statePath);
  Object.assign(state, {calls: [], browsers: [], observed: [], bundleDirectories: [],
    onBundle: null, onOpen: null, onSelect: null, onRender: null, onObserve: null});
  state.bundle = async options => {
    state.calls.push({kind: 'bundle', options});
    state.bundleDirectories.push(path.dirname(options.outDir));
    await mkdir(options.outDir);
    await state.onBundle?.(options);
    return options.outDir;
  };
  state.openBrowser = async (type, options) => {
    const browser = {id: `browser-${state.browsers.length + 1}`, closeCount: 0,
      close: async () => { browser.closeCount++; state.calls.push({kind: 'close', browser}); }};
    state.browsers.push(browser);
    state.calls.push({kind: 'open', type, options, browser});
    await state.onOpen?.(browser, options);
    return browser;
  };
  state.selectComposition = async options => {
    state.calls.push({kind: 'select', options});
    if (state.onSelect) return state.onSelect(options);
    return {id: 'PresentationOverlayV001', width: 1, height: 1, fps: 30, durationInFrames: 1};
  };
  state.renderStill = async options => {
    state.calls.push({kind: 'render', options});
    if (state.onRender) return state.onRender(options);
    await writeFile(options.output, onePixelPng, {flag: 'wx'});
  };
  state.makeCancelSignal = () => {
    const signal = {cancelled: false, listeners: []};
    return {cancelSignal: signal, cancel: () => {
      signal.cancelled = true;
      for (const listener of signal.listeners) listener();
    }};
  };
  state.parse = () => ({});
  for (const [name, functions] of [
    ['@remotion/cli', []], ['@remotion/bundler', ['bundle']],
    ['@remotion/renderer', ['openBrowser', 'selectComposition', 'renderStill', 'makeCancelSignal']],
    ['dotenv', ['parse']],
  ]) {
    const packageDirectory = path.join(directory, 'node_modules', name);
    await mkdir(packageDirectory, {recursive: true});
    await writeFile(path.join(packageDirectory, 'package.json'), JSON.stringify({name, main: 'index.cjs'}));
    const stateRelative = name.startsWith('@') ? '../../../state.cjs' : '../../state.cjs';
    await writeFile(path.join(packageDirectory, 'index.cjs'), functions.map(name =>
      `exports.${name} = (...args) => require(${JSON.stringify(stateRelative)}).${name}(...args);`).join('\n'));
  }
  const entryPoint = path.join(directory, 'entry.tsx'), chromiumPath = path.join(directory, 'chromium');
  const publicDir = path.join(directory, 'public');
  await mkdir(publicDir);
  await writeFile(entryPoint, ''); await writeFile(chromiumPath, '');
  const config = {repositoryRoot: directory, entryPoint, publicDir, chromiumPath,
    remotionPath: path.join(directory, 'node_modules/@remotion/cli/index.cjs'),
    processObserver: {observeOperation: async (request, task) => {
      state.observed.push(structuredClone(request));
      if (state.onObserve) return state.onObserve(request, task);
      return task();
    }}};
  return {directory, state, output: name => path.join(directory, `${name}.png`),
    create: (overrides = {}) => {
      const session = createPresentationOverlayRenderSessionV001({...config, ...overrides});
      sessions.push(session);
      return session;
    }};
}

test('one job prepares once, keeps independent series, snapshots queued props and draws A B A', async t => {
  const f = await fixture(t), session = f.create(), gate = deferred(), started = deferred();
  f.state.onRender = async options => {
    if (f.state.calls.filter(row => row.kind === 'render').length === 1) {
      started.resolve(); await gate.promise;
    }
    await writeFile(options.output, onePixelPng, {flag: 'wx'});
  };
  const a = propsFor('A'), b = propsFor('B');
  const requests = [session.render(a, f.output('a-first'))];
  try {
    await waitForStart(started, requests[0]);
    requests.push(session.render(b, f.output('b')), session.render(a, f.output('a-last')),
      session.render(a, f.output('a-repeat'), {series: 'repeat'}));
    b.text = 'mutated after request acceptance'; b.visualState.textStyle.fontColor = '#123456';
    a.inspectionLineIndex = 0;
  } finally { gate.resolve(); }
  const results = await Promise.all(requests);
  const draws = f.state.calls.filter(row => row.kind === 'render');
  assert.deepEqual(draws.map(row => row.options.inputProps.text), ['A', 'B', 'A', 'A']);
  assert.deepEqual(draws.map(row => row.options.inputProps.fontFileName), ['A.otf', 'B.otf', 'A.otf', 'A.otf']);
  assert.deepEqual(draws.map(row => row.options.inputProps.fontFamilyName), ['fixture-A', 'fixture-B', 'fixture-A', 'fixture-A']);
  assert.deepEqual(draws.map(row => row.options.inputProps.inspectionLineIndex), [null, null, null, null]);
  assert.equal(draws[1].options.inputProps.visualState.textStyle.fontColor, '#000000');
  assert.equal(f.state.calls.filter(row => row.kind === 'bundle').length, 1);
  assert.equal(f.state.browsers.length, 2);
  assert.ok(draws.slice(0, 3).every(row => row.options.puppeteerInstance === f.state.browsers[0]));
  assert.equal(draws[3].options.puppeteerInstance, f.state.browsers[1]);
  assert.equal(f.state.calls.filter(row => row.kind === 'select').length, 4);
  assert.deepEqual(results.map(row => row.requestId), [1, 2, 3, 4]);
  assert.equal(new Set(results.map(row => row.sessionId)).size, 1);
  assert.equal(new Set(draws.map(row => row.options.output)).size, 4);
  for (const [index, result] of results.entries()) {
    assert.equal(result.sha256, sha(await readFile(result.outputPath)));
    assert.equal(result.series, index === 3 ? 'repeat' : 'normal');
  }
  const observations = f.state.observed.filter(row => row.operationKind === 'render-still');
  assert.deepEqual(observations.map(row => row.input.outputPath), results.map(row => row.outputPath));
  assert.deepEqual(observations.map(row => row.input.props.text), ['A', 'B', 'A', 'A']);
  assert.equal(new Set(observations.slice(0, 3).map(row => row.input.browserId)).size, 1);
  assert.notEqual(observations[0].input.browserId, observations[3].input.browserId);
  await session.close(); await session.close();
  assert.deepEqual(f.state.browsers.map(browser => browser.closeCount), [1, 1]);
  await absent(f.state.bundleDirectories[0]);
  await assert.rejects(session.render(propsFor('A'), f.output('after-close')), /session is closed/u);
});

test('different jobs own separate bundles and browsers; closing an unused job has no work', async t => {
  const f = await fixture(t), unused = f.create();
  await unused.close(); assert.deepEqual(f.state.calls, []);
  const first = f.create(), second = f.create();
  const a = await first.render(propsFor('A'), f.output('first'));
  const b = await second.render(propsFor('A'), f.output('second'));
  assert.notEqual(a.sessionId, b.sessionId);
  assert.equal(new Set(f.state.bundleDirectories).size, 2);
  await first.close();
  assert.deepEqual(f.state.browsers.map(browser => browser.closeCount), [1, 0]);
  await access(f.state.bundleDirectories[1]);
  await second.close();
  assert.deepEqual(f.state.browsers.map(browser => browser.closeCount), [1, 1]);
});

test('missing, misdirected, extra, invalid and wrong-composition outputs fail without publication', async t => {
  const cases = [
    ['missing', async () => {}, /outputs do not match/u],
    ['misdirected', async options => writeFile(`${options.output}.wrong`, onePixelPng), /outputs do not match/u],
    ['extra', async options => {
      await writeFile(options.output, onePixelPng); await writeFile(`${options.output}.extra`, onePixelPng);
    }, /outputs do not match/u],
    ['partial', async options => writeFile(options.output, onePixelPng.subarray(0, 20)), /PNG dimensions or framing/u],
    ['wrong-size', async options => {
      const bytes = Buffer.from(onePixelPng); bytes.writeUInt32BE(2, 16); await writeFile(options.output, bytes);
    }, /PNG dimensions or framing/u],
    ['unexpected-artifact', async options => options.onArtifact({name: 'unexpected'}), /unexpected artifact/u],
    ['wrong-composition', null, /composition binding mismatch/u],
  ];
  for (const [name, behavior, expected] of cases) await t.test(name, async subtest => {
    const f = await fixture(subtest), session = f.create();
    if (behavior) f.state.onRender = behavior;
    else f.state.onSelect = async () => ({id: 'AnotherComposition', width: 1, height: 1});
    await assert.rejects(session.render(propsFor('A'), f.output(name)), expected);
    await absent(f.output(name));
    await assert.rejects(session.render(propsFor('B'), f.output('next')), /session failed/u);
    assert.ok(f.state.browsers.every(browser => browser.closeCount === 1));
    await absent(f.state.bundleDirectories[0]);
  });
});

test('existing or duplicate destinations preserve prior output and reject reuse', async t => {
  for (const preexisting of [true, false]) await t.test(preexisting ? 'foreign output' : 'same-job duplicate', async subtest => {
    const f = await fixture(subtest), session = f.create(), output = f.output('held');
    if (preexisting) await writeFile(output, 'previous owner');
    else await session.render(propsFor('A'), output);
    const original = await readFile(output);
    await assert.rejects(session.render(propsFor('B'), output), /output already exists/u);
    assert.deepEqual(await readFile(output), original);
    assert.equal(f.state.calls.filter(row => row.kind === 'render').length, preexisting ? 0 : 1);
  });
});

test('failure never substitutes a preceding successful PNG and closes only its job', async t => {
  const f = await fixture(t), failing = f.create(), independent = f.create();
  const first = await failing.render(propsFor('A'), f.output('successful'));
  await independent.render(propsFor('B'), f.output('other-job'));
  const original = await readFile(first.outputPath);
  f.state.onRender = async options => {
    await writeFile(options.output, onePixelPng.subarray(0, 20)); throw new Error('controlled drawing failure');
  };
  await assert.rejects(failing.render(propsFor('B'), f.output('failed')), /controlled drawing failure/u);
  await absent(f.output('failed'));
  assert.deepEqual(await readFile(first.outputPath), original);
  assert.deepEqual(f.state.browsers.map(browser => browser.closeCount), [1, 0]);
  await assert.rejects(failing.render(propsFor('A'), f.output('stale')), /session failed/u);
  await absent(f.output('stale'));
  f.state.onRender = null;
  await independent.render(propsFor('A'), f.output('other-job-next'));
});

test('cancel interrupts an active render, rejects queued work and publishes no partial output', async t => {
  const f = await fixture(t), session = f.create(), started = deferred();
  f.state.onRender = async options => {
    await writeFile(options.output, onePixelPng.subarray(0, 20));
    await new Promise((resolve, reject) => {
      options.cancelSignal.listeners.push(() => reject(new Error('controlled cancellation')));
      started.resolve();
    });
  };
  const active = session.render(propsFor('A'), f.output('active'));
  await waitForStart(started, active);
  const queued = session.render(propsFor('B'), f.output('queued'));
  const rejectedActive = assert.rejects(active, /controlled cancellation/u);
  const rejectedQueued = assert.rejects(queued, /session failed/u);
  await session.close(); await Promise.all([rejectedActive, rejectedQueued]);
  await absent(f.output('active')); await absent(f.output('queued'));
  assert.equal(f.state.calls.filter(row => row.kind === 'render').length, 1);
  assert.equal(f.state.browsers[0].closeCount, 1);
  await absent(f.state.bundleDirectories[0]);
});

test('close during preparation reclaims an eventually opened browser before any draw', async t => {
  const f = await fixture(t), session = f.create(), started = deferred(), gate = deferred();
  f.state.onOpen = async () => { started.resolve(); await gate.promise; };
  const pending = session.render(propsFor('A'), f.output('late'));
  let rejected, closing;
  try {
    await waitForStart(started, pending);
    rejected = assert.rejects(pending, /session is closed/u); closing = session.close();
  } finally { gate.resolve(); }
  await closing; await rejected;
  assert.equal(f.state.browsers[0].closeCount, 1);
  assert.equal(f.state.calls.filter(row => row.kind === 'render').length, 0);
  await absent(f.output('late')); await absent(f.state.bundleDirectories[0]);
});

test('startup failure reaps its real child while concurrent-job and out-of-scope children survive', async t => {
  const f = await fixture(t), children = [], started = deferred(), gate = deferred();
  const alive = child => {
    assert.equal(child.exitCode, null); assert.equal(child.signalCode, null);
    assert.equal(child.killed, false); assert.ok(Number.isInteger(child.pid));
    assert.doesNotThrow(() => process.kill(child.pid, 0));
  };
  const startIdleChild = async executable => {
    const child = spawn(executable, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
    const exit = new Promise(resolve => child.once('exit', (code, signal) => resolve({code, signal})));
    const owned = {child, exit}; children.push(owned);
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    alive(child);
    return owned;
  };
  const stop = async owned => {
    if (owned.child.exitCode === null && owned.child.signalCode === null) owned.child.kill('SIGKILL');
    await owned.exit;
  };
  t.after(async () => {
    gate.resolve();
    await Promise.all(children.filter(row => row.child.pid !== undefined).map(stop));
  });
  const failing = f.create({chromiumPath: process.execPath});
  const independent = f.create({chromiumPath: process.execPath});
  let failedChild, independentChild, outsideChild;
  f.state.onOpen = async (_browser, options) => {
    failedChild = await startIdleChild(options.browserExecutable);
    started.resolve(); await gate.promise;
    throw new Error('controlled startup failure after spawn');
  };
  const pending = failing.render(propsFor('A'), f.output('startup-failure'));
  const rejected = assert.rejects(pending, /controlled startup failure after spawn/u);
  try {
    await waitForStart(started, pending);
    // The first startup scope is still active. A second session and the caller
    // now spawn the same executable, so executable/PID matching alone cannot
    // accidentally make either process belong to the failed job.
    f.state.onOpen = async (browser, options) => {
      independentChild = await startIdleChild(options.browserExecutable);
      const close = browser.close;
      browser.close = async (...args) => { await stop(independentChild); await close(...args); };
    };
    await independent.render(propsFor('B'), f.output('independent-startup'));
    outsideChild = await startIdleChild(process.execPath);
    alive(failedChild.child); alive(independentChild.child); alive(outsideChild.child);
  } finally { gate.resolve(); await rejected; }
  assert.ok(failedChild.child.exitCode !== null || failedChild.child.signalCode !== null,
    'the rejected render waits for its startup child to exit');
  assert.throws(() => process.kill(failedChild.child.pid, 0), {code: 'ESRCH'});
  await absent(f.output('startup-failure')); await absent(f.state.bundleDirectories[0]);
  alive(independentChild.child); alive(outsideChild.child);
  await independent.render(propsFor('A'), f.output('independent-next'));
  await independent.close();
  assert.ok(independentChild.child.exitCode !== null || independentChild.child.signalCode !== null);
  alive(outsideChild.child);
  await stop(outsideChild);
});

test('preparation and observation failures still clean owned resources and retract publication', async t => {
  for (const kind of ['bundle', 'render-observation', 'close-observation']) await t.test(kind, async subtest => {
    const f = await fixture(subtest), session = f.create();
    if (kind === 'bundle') f.state.onBundle = async () => { throw new Error('controlled bundle failure'); };
    if (kind === 'render-observation') f.state.onObserve = async (request, task) => {
      const result = await task();
      if (request.operationKind === 'render-still') throw new Error('controlled evidence failure');
      return result;
    };
    if (kind === 'close-observation') {
      await session.render(propsFor('A'), f.output('completed'));
      f.state.onObserve = async (request, task) => {
        if (request.operationKind === 'browser-close') throw new Error('controlled close evidence failure');
        return task();
      };
      await assert.rejects(session.close(), /controlled close evidence failure/u);
      await access(f.output('completed'));
    } else {
      await assert.rejects(session.render(propsFor('A'), f.output('incomplete')), /controlled (bundle|evidence) failure/u);
      await absent(f.output('incomplete'));
    }
    assert.ok(f.state.browsers.every(browser => browser.closeCount === 1));
    await absent(f.state.bundleDirectories[0]);
  });
});

test('symlinked output parents are refused before runtime preparation', async t => {
  const f = await fixture(t), session = f.create(), alias = path.join(f.directory, 'alias');
  await symlink(f.directory, alias);
  await assert.rejects(session.render(propsFor('A'), path.join(alias, 'unexpected.png')), /existing regular directory/u);
  assert.deepEqual(f.state.calls, []);
  await absent(f.output('unexpected'));
});

test('native Panel A, different Panel and Normal B, A again, and independent-series A match exactly', {
  skip: process.env.ZEV_OVERLAY_RENDER_SESSION_NATIVE_OUTPUT ? false : 'native output directory not requested',
}, async () => {
  const outputDirectory = path.resolve(process.env.ZEV_OVERLAY_RENDER_SESSION_NATIVE_OUTPUT);
  const {assertIgnoredPresentationOutputDirectoryV001} = await import('./presentation_output_directory_v001.mjs');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory});
  await absent(outputDirectory); await mkdir(outputDirectory);
  const {createPresentationRendererOverlayJobV001} = await import('./render_presentation_v002.mjs');
  const {getPresentationPanelPalettePresetV003} = await import('./presentation_panel_presets_v002.mjs');
  const {resolveVisibleCenterOffsetsV001} = await import('./presentation_renderer_text_layout_v001.mjs');
  const {inspectOverlayPngWithToolV001} = await import('./presentation_renderer_qc_v002.mjs');
  const {createPresentationRendererProcessObserverV001} = await import('./presentation_renderer_process_observation_v001.mjs');
  const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  const savedPropsPath = path.join(root, 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const sourcePath = path.join(root, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918/source-bindings.json');
  const sourceBytes = await readFile(sourcePath), savedPropsBytes = await readFile(savedPropsPath);
  const sourcePlan = JSON.parse(JSON.parse(sourceBytes).planBytes), savedProps = JSON.parse(savedPropsBytes);
  const normal = sourcePlan.elements.find(element => element.instructionId.endsWith('000010'));
  assert.ok(normal); assert.equal(normal.text, '逃げるやつ?');
  const fontPath = path.join(root, 'runner/public/font', savedProps.fontFileName);
  const chromiumPath = path.join(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const remotionPath = path.join(root, 'runner/node_modules/@remotion/cli/remotion-cli.js');
  const entryPoint = path.join(root, 'evals/clip_composition/presentation_renderer_entry_v001.tsx');
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(outputDirectory, 'operations')});
  const adapter = createPresentationRendererOverlayJobV001({remotionPath, chromiumPath, processObserver: observer});
  const session = {render: (props, output, options) => adapter.renderStill(props, output, options),
    close: adapter.close};
  const evidence = {schemaVersion: 'presentation-overlay-render-session-native-v001', status: 'running',
    humanQualityVerdict: null, purpose: 'Current finite palettes are test inputs, not human quality adoption.',
    runtime: {node: process.execPath, version: process.version, chromiumPath, remotionPath},
    sourceBindings: [], requests: [], comparisons: []};
  try {
    const bindingPaths = [fileURLToPath(import.meta.url), path.join(root, 'evals/clip_composition/presentation_overlay_render_session_v001.mjs'),
      sourcePath, savedPropsPath, fontPath, chromiumPath, remotionPath, entryPoint,
      path.join(root, 'evals/clip_composition/presentation_panel_presets_v002.mjs'),
      path.join(root, 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'),
      path.join(root, 'evals/clip_composition/render_presentation_v002.mjs')];
    evidence.sourceBindings = await Promise.all(bindingPaths.map(async file => ({path: file, sha256: sha(await readFile(file))})));
    const registry = {fontAssets: [{fontAssetId: normal.visualState.textStyle.fontAssetId,
      fileName: savedProps.fontFileName, path: path.relative(root, fontPath), sha256: sha(await readFile(fontPath))}]};
    const panel = paletteId => {
      const preset = getPresentationPanelPalettePresetV003('provisional-panel-graph-paper', paletteId);
      return {...structuredClone(normal), visualState: {...structuredClone(normal.visualState),
        textStyle: {...structuredClone(normal.visualState.textStyle), ...preset.textStyle},
        background: structuredClone(preset.background)}};
    };
    const elements = [panel('cool'), panel('dark'), structuredClone(normal)];
    const overlayProps = elements.map(element => adapter.buildProps(element, sourcePlan, registry));
    const layoutInput = path.join(outputDirectory, 'layout-input.json'), layoutOutput = path.join(outputDirectory, 'layout.json');
    await save(layoutInput, {canvas: sourcePlan.canvas, overlays: overlayProps});
    const layoutArgs = [path.join(root, 'runner/node_modules/tsx/dist/cli.mjs'),
      path.join(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'), layoutInput, layoutOutput];
    await observer.run(process.execPath, layoutArgs, {cwd: root, observationLabel: 'session-layout',
      env: {...process.env, NODE_PATH: path.join(root, 'runner/node_modules'), TSX_DISABLE_CACHE: '1'}});
    const layout = JSON.parse(await readFile(layoutOutput, 'utf8')); assert.equal(layout.status, 'passed');
    evidence.layout = {path: layoutOutput, sha256: sha(await readFile(layoutOutput)), status: layout.status};
    const {width, height} = sourcePlan.canvas;
    const draw = async (label, props, series) => {
      const pngPath = path.join(outputDirectory, `${label}.png`), propsPath = path.join(outputDirectory, `${label}.props.json`);
      await save(propsPath, props);
      const result = await session.render(props, pngPath, {series, observationLabel: 'session-native-draw'});
      const inspected = await inspectOverlayPngWithToolV001({instructionId: props.instructionId, pngPath, imageMagickPath: '/opt/homebrew/bin/magick'});
      const rgba = (await execute('/opt/homebrew/bin/magick', [pngPath, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: width * height * 4 + 1024})).stdout;
      assert.equal(rgba.length, width * height * 4); assert.ok(inspected.alphaBounds);
      const row = {label, series, requestId: result.requestId, sessionId: result.sessionId,
        instructionId: props.instructionId, fontFileName: props.fontFileName, fontFamilyName: props.fontFamilyName,
        width, height, props: {path: propsPath, sha256: sha(await readFile(propsPath))},
        png: {path: pngPath, sha256: sha(await readFile(pngPath))}, rgbaSha256: sha(rgba),
        alphaBounds: inspected.alphaBounds};
      assert.equal(result.sha256, row.png.sha256); evidence.requests.push(row);
      return row;
    };
    const panelGroup = async (label, index, series) => {
      const raw = overlayProps[index];
      const calibration = await draw(`${label}-calibration`, {...raw, inspectionLineIndex: 0}, series);
      const wrapper = layout.items[index].wrapper;
      const containerBounds = {left: wrapper.left, top: wrapper.top,
        right: wrapper.left + wrapper.width, bottom: wrapper.top + wrapper.height};
      const correction = resolveVisibleCenterOffsetsV001({containerBounds, lineBounds: [calibration.alphaBounds]});
      const props = {...raw, renderVisibleCenterCorrectionPx: correction};
      const overlay = await draw(`${label}-overlay`, props, series);
      const mask = await draw(`${label}-mask`, {...props, inspectionLineIndex: 0}, series);
      return {calibration, overlay, mask, correction, containerBounds};
    };
    const aFirst = await panelGroup('a-first', 0, 'normal');
    const bPanel = await panelGroup('b-panel', 1, 'normal');
    const bNormal = await draw('b-normal', overlayProps[2], 'normal');
    await draw('b-normal-mask', {...overlayProps[2], inspectionLineIndex: 0}, 'normal');
    const aLast = await panelGroup('a-last', 0, 'normal');
    const aRepeat = await panelGroup('a-repeat', 0, 'repeat');
    for (const [label, candidate] of [['a-last', aLast], ['a-repeat', aRepeat]]) {
      assert.deepEqual(candidate.correction, aFirst.correction);
      assert.deepEqual(candidate.containerBounds, aFirst.containerBounds);
      for (const kind of ['calibration', 'overlay', 'mask']) {
        for (const field of ['rgbaSha256', 'alphaBounds', 'width', 'height', 'fontFileName', 'fontFamilyName']) {
          assert.deepEqual(candidate[kind][field], aFirst[kind][field], `${label} ${kind} ${field}`);
        }
        assert.equal(candidate[kind].png.sha256, aFirst[kind].png.sha256, `${label} ${kind} PNG bytes`);
        assert.equal(candidate[kind].props.sha256, aFirst[kind].props.sha256, `${label} ${kind} props`);
        evidence.comparisons.push({first: aFirst[kind].label, second: candidate[kind].label,
          pngBytesEqual: true, allRgbaEqual: true, propsEqual: true, boundsEqual: true});
      }
    }
    assert.notEqual(aFirst.overlay.png.sha256, bPanel.overlay.png.sha256, 'different palette paints different pixels');
    assert.notEqual(aFirst.overlay.png.sha256, bNormal.png.sha256, 'Normal has different pixels');
    assert.notEqual(aFirst.overlay.png.sha256, aFirst.mask.png.sha256, 'mask omits the plate');
    evidence.centralCalibration = {a: {correction: aFirst.correction, containerBounds: aFirst.containerBounds},
      b: {correction: bPanel.correction, containerBounds: bPanel.containerBounds}};
    await session.close();
    const performance = observer.getPerformance();
    evidence.performance = performance;
    assert.equal(performance.operations.filter(row => row.operationKind === 'bundle').length, 1);
    assert.equal(performance.operations.filter(row => row.operationKind === 'browser-open').length, 2);
    assert.equal(performance.operations.filter(row => row.operationKind === 'browser-close').length, 2);
    const renderOperations = performance.operations.filter(row => row.operationKind === 'render-still');
    assert.equal(renderOperations.length, 14);
    const operationInputs = await Promise.all(renderOperations.map(async row =>
      JSON.parse(await readFile(path.join(row.observationDirectory, 'request.json'), 'utf8')).input));
    const normalBrowsers = new Set(operationInputs.filter(row => row.series === 'normal').map(row => row.browserId));
    const repeatBrowsers = new Set(operationInputs.filter(row => row.series === 'repeat').map(row => row.browserId));
    assert.equal(normalBrowsers.size, 1); assert.equal(repeatBrowsers.size, 1);
    assert.notEqual([...normalBrowsers][0], [...repeatBrowsers][0]);
    assert.deepEqual(operationInputs.map(row => row.outputPath), evidence.requests.map(row => row.png.path));
    evidence.independentSeries = {normalBrowserId: [...normalBrowsers][0], repeatBrowserId: [...repeatBrowsers][0],
      normalRequests: operationInputs.filter(row => row.series === 'normal').length,
      repeatRequests: operationInputs.filter(row => row.series === 'repeat').length};
    for (const binding of evidence.sourceBindings) assert.equal(sha(await readFile(binding.path)), binding.sha256, 'native test source changed during drawing');
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed'; evidence.failure = {name: error.name, message: error.message, stack: error.stack};
    throw error;
  } finally {
    try {
      await session.close();
      if (typeof adapter.close === 'function') await adapter.close();
    } catch (error) {
      evidence.status = 'failed';
      evidence.cleanupFailure = {name: error.name, message: error.message, stack: error.stack};
      throw error;
    } finally { await save(path.join(outputDirectory, 'measurement.json'), evidence); }
  }
});

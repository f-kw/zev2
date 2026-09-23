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
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, assertPresentationCaptionMotionLayoutsV001}
  from './presentation_caption_motion_v001.mjs';
import {loadAutoPresentationContextV001} from './presentation_auto_effects_io_v001.mjs';
import {fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationCompositeArgumentsV001,
  buildPresentationFrameExtractionArgumentsV001} from './render_presentation_v002.mjs';
import {classifyPresentationNativeFrameRgbV001} from './presentation_native_frame_qc_v001.mjs';
import {inspectPresentationExactReplayQcV001} from './presentation_exact_replay_qc_v001.mjs';

const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const FFMPEG = '/opt/homebrew/bin/ffmpeg', FFPROBE = '/opt/homebrew/bin/ffprobe', MAGICK = '/opt/homebrew/bin/magick';

test('real native entrances retain saved placement, pass combined QC and reject absent, mistimed and non-returning motion', async t => {
  const root = process.cwd();
  const output = process.env.ZEV_CAPTION_MOTION_NATIVE_QC_OUTPUT
    ? path.resolve(process.env.ZEV_CAPTION_MOTION_NATIVE_QC_OUTPUT)
    : await mkdtemp(path.join(tmpdir(), 'zev-caption-motion-native-'));
  if (!process.env.ZEV_CAPTION_MOTION_NATIVE_QC_OUTPUT) t.after(() => rm(output, {recursive: true, force: true}));
  await mkdir(output, {recursive: true});
  const renderDirectory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/motion-native-test-'));
  if (!process.env.ZEV_CAPTION_MOTION_NATIVE_QC_OUTPUT) t.after(() => rm(renderDirectory, {recursive: true, force: true}));
  const savedPropsPath = path.resolve(root,
    'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const savedPropsBytes = await readFile(savedPropsPath), savedProps = JSON.parse(savedPropsBytes);
  savedProps.visualState.textStyle.fontSizePx = 96;
  // The admitted Digest's saved vertical offset is preserved in every state.
  savedProps.visualState.position.offsetYPercent = -6;
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
        if (performance.now()>deadline) throw new Error('motion overlay did not become ready');
        await frame();
      }
      await frame();
      return {exact:buildExactTextModel(props), ready:window.remotion_renderReady,
        fontLoaded:document.fonts.check(props.visualState.textStyle.fontSizePx+'px "'+props.fontFamilyName+'"')};
    }
  `, resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife', globalName: 'MotionQC',
  write: false, nodePaths: [path.resolve(root, 'runner/node_modules')],
  define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  const bundlePath = path.join(output, 'browser-bundle.js');
  await writeFile(bundlePath, bundle.outputFiles[0].text);
  const server = createServer((request, response) => {
    if (request.url === `/font/${savedProps.fontFileName}`) {
      response.writeHead(200, {'Content-Type': 'font/otf'}); response.end(fontBytes);
    } else if (request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<!doctype html><html><body></body></html>');
    } else {response.writeHead(404); response.end();}
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  t.after(() => new Promise(resolve => server.close(resolve)));
  const measurements = [];
  const browser = await openBrowser('chrome', {browserExecutable: chromePath, forceDeviceScaleFactor: 1, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false,
      pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    const {width, height} = savedProps.canvas;
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const draw = props => page.evaluate(`MotionQC.draw(${JSON.stringify(props)})`);
    const capture = async (props, file) => {
      const rendered = await draw(props);
      assert.equal(rendered.ready, true); assert.equal(rendered.fontLoaded, true);
      const bytes = await screenshot({page, type: 'png', omitBackground: true, width, height, scale: 1});
      await writeFile(file, bytes); return {rendered, bytes};
    };
    const inspectLayout = async (propsList, name, canvas = savedProps.canvas) => {
      const input = path.join(output, `${name}-layout-input.json`), resultPath = path.join(output, `${name}-layout.json`);
      await writeFile(input, JSON.stringify({canvas, overlays: propsList}));
      try {
        await execute(process.execPath, [tsx, path.resolve(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'), input, resultPath],
          {cwd: root, env: {...process.env, NODE_PATH: path.resolve(root, 'runner/node_modules'), TSX_DISABLE_CACHE: '1'}});
      } catch (error) {if (error.code !== 1) throw error;}
      return JSON.parse(await readFile(resultPath, 'utf8'));
    };
    const makeNormal = (name, lines, startFrame, endFrameExclusive) => {
      const indexed = indexExplicitLinesV001(lines); assert.equal(indexed.status, 'passed');
      return {instructionId: name, kind: 'speech-caption', presetId: 'normal-test', requestedPresetId: 'normal-test',
        appliedPresetId: 'normal-test', registryVersion: 'native-test-v001', text: indexed.sourceText, indexedLines: indexed.indexedLines,
        startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame,
        visualState: structuredClone(savedProps.visualState)};
    };
    const propsFor = (element, plan) => ({...savedProps, canvas: plan.canvas, layoutRules: plan.layoutRules,
      instructionId: element.instructionId, text: element.text, indexedLines: element.indexedLines,
      visualState: element.visualState, inspectionLineIndex: null});
    const canvas = savedProps.canvas;
    const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas,
      layoutRules: savedProps.layoutRules, elements: [makeNormal('bounce', ['一度弾んでから読む'], 0, 30),
        makeNormal('shake', ['短い動きの後には', '同じ位置へ戻る'], 30, 60)]};
    const motions = baselinePlan.elements.map(element => ({...element, presentationMotion: {
      presentation: `provisional-${element.instructionId}`, presetVersion: 'presentation-caption-motion-v002'}}));
    for (const element of motions) {
      const states = buildPresentationCaptionMotionStateElementsV001({element, canvas});
      const layout = await inspectLayout(states.map(row => propsFor(row.element, baselinePlan)), element.instructionId);
      assert.equal(layout.status, 'passed', JSON.stringify(layout));
      assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems: layout.items});
      measurements.push({kind: 'native-layout', captionId: element.instructionId, layout});
    }
    const tooWide = {...makeNormal('too-wide', ['猫'.repeat(17)], 0, 30), presentationMotion: motions[0].presentationMotion};
    const wideStates = buildPresentationCaptionMotionStateElementsV001({element: tooWide, canvas});
    const normalWide = await inspectLayout([propsFor(wideStates[0].element, baselinePlan)], 'wide-stable');
    assert.equal(normalWide.status, 'passed', JSON.stringify(normalWide));
    const maximumWide = await inspectLayout([propsFor(wideStates[3].element, baselinePlan)], 'wide-maximum');
    assert(maximumWide.violations.some(row => row.code === 'LAYOUT_SAFE_AREA_VIOLATION'));
    measurements.push({kind: 'maximum-safe-area-rejection', normalWide, maximumWide});
    const collision = {...makeNormal('two-line-collision', ['重なる一行目', '重なる二行目'], 0, 30),
      presentationMotion: motions[0].presentationMotion};
    collision.visualState.textStyle.lineSpacingPercent = 0;
    const collisionLayout = await inspectLayout(buildPresentationCaptionMotionStateElementsV001({element: collision, canvas})
      .map(row => propsFor(row.element, baselinePlan)), 'two-line-collision');
    assert(collisionLayout.violations.some(row => row.code === 'LAYOUT_LINE_POSITIVE_INTERSECTION'));
    measurements.push({kind: 'two-line-collision-rejection', layout: collisionLayout});
    const stableBox = measurements[1].layout.items[0].wrapper;
    const clampCanvas = {...canvas, safeAreaPx: {...canvas.safeAreaPx,
      right: Math.floor(canvas.width - (stableBox.left + stableBox.width + 6))}};
    const clampPlan = {...baselinePlan, canvas: clampCanvas};
    const clamped = await inspectLayout(buildPresentationCaptionMotionStateElementsV001({element: motions[1], canvas: clampCanvas})
      .map(row => propsFor(row.element, clampPlan)), 'clamp', clampCanvas);
    assert.equal(clamped.status, 'passed', JSON.stringify(clamped));
    assert.throws(() => assertPresentationCaptionMotionLayoutsV001({element: motions[1], canvas: clampCanvas,
      layoutItems: clamped.items}), /clamped/);
    measurements.push({kind: 'silent-clamp-rejection', layout: clamped});

    const baselinePath = path.join(output, 'normal-plan.json'), decisionInputPath = path.join(output, 'decision-input.json');
    await writeFile(baselinePath, JSON.stringify(baselinePlan, null, 2) + '\n');
    await writeFile(decisionInputPath, JSON.stringify({schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null}) + '\n');
    const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
    const autoProposal = fixAutoPresentationProposalV001({...loaded, proposal: {
      schemaVersion: 'auto-presentation-proposal-v001', context: loaded.context,
      targetCaptionIds: ['bounce', 'shake'], completion: 'complete', effects: [
        {captionId: 'bounce', role: 'Bounce accent', presentation: 'provisional-bounce', scope: 'whole-caption'},
        {captionId: 'shake', role: 'Shake accent', presentation: 'provisional-shake', scope: 'whole-caption'},
      ], exceptions: []}});
    const autoPresentation = {context: loaded.context, autoProposal};
    await writeFile(path.join(output, 'fixed-technical-fixture-selection.json'), JSON.stringify(autoProposal, null, 2) + '\n');
    const baseMediaPath = path.join(output, 'synthetic-base.mp4');
    await execute(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
      `testsrc2=size=${canvas.width}x${canvas.height}:rate=30:duration=2`, '-f', 'lavfi', '-i',
      'sine=frequency=440:sample_rate=48000:duration=2', '-frames:v', '60', '-c:v', 'libx264', '-preset', 'fast',
      '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', baseMediaPath]);
    const toolPaths = {ffmpegPath: FFMPEG, ffprobePath: FFPROBE, imageMagickPath: MAGICK,
      tsxPath: tsx, layoutInspectorPath: path.resolve(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
    const baseMediaInspection = {media: await inspectRenderedMediaWithToolsV001(baseMediaPath, toolPaths)};
    const adapter = {nativeQcRuntimePaths: {remotionPath: path.resolve(root, 'runner/node_modules/.bin/remotion'),
      chromiumPath: chromePath, nodePath: process.execPath, fixtureBundlePath: bundlePath},
    buildProps: propsFor,
    renderStill: async (props, file) => {await capture(props, file);},
    renderLineMask: async (props, lineIndex, file) => {await capture({...props, inspectionLineIndex: lineIndex}, file);}};
    const presetRegistry = {fontAssets: [{fontAssetId: savedProps.visualState.textStyle.fontAssetId,
      fileName: savedProps.fontFileName, path: path.relative(root, fontPath), sha256: sha(fontBytes)}]};
    const before = JSON.stringify({baselinePlan, autoPresentation});
    const outcome = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(renderDirectory, 'render'),
      plan: baselinePlan, autoPresentation, presetRegistry, baseMediaPath, baseMediaInspection, expectedFrameCount: 60,
      overlayAdapter: adapter, toolPaths, serializePngAndFilters: true, counterfactualQcMethod: 'exact-replay-native-v1'});
    await writeFile(path.join(output, 'common-render-result.json'), JSON.stringify(outcome, null, 2) + '\n');
    assert.equal(outcome.exitCode, 0, JSON.stringify(outcome));
    assert.equal(outcome.finalQc.status, 'passed');
    assert.equal(outcome.overlayRecords.length, 2); assert.equal(outcome.applicationResults.length, 2);
    assert.equal(outcome.outputMedia.audio.packetPayloadSha256, baseMediaInspection.media.audio.packetPayloadSha256);
    assert.equal(JSON.stringify({baselinePlan, autoPresentation}), before);
    const finite = outcome.completedFrameQc.evidence.finiteState;
    assert.equal(finite.samples.length, 24);
    const expectedStates = {
      bounce: ['small', 'stable', 'middle', 'between-middle-maximum', 'maximum', 'maximum', 'middle', 'between-middle-stable', 'stable', 'stable'],
      shake: ['left-12', 'left-12', 'right-12', 'right-12', 'left-8', 'left-8', 'right-8', 'right-8',
        'left-4', 'left-4', 'right-4', 'right-4', 'stable', 'stable'],
    };
    for (const element of baselinePlan.elements) {
      const record = outcome.overlayRecords.find(row => row.element.instructionId === element.instructionId);
      const unchanged = await capture(propsFor(element, baselinePlan), path.join(output, `${element.instructionId}-normal.png`));
      assert.equal(sha(unchanged.bytes), record.motionStates[0].pngSha256, 'stable rendering equals unchanged Normal bytes');
      const observations = finite.samples.filter(row => row.instructionId === element.instructionId);
      assert.deepEqual(observations.map(row => row.expectedState), expectedStates[element.instructionId]);
      assert(observations.every(row => row.visible));
    }
    measurements.push({kind: 'common-render-and-combined-qc', video: outcome.workVideo,
      videoSha256: sha(await readFile(outcome.workVideo)), finalQc: outcome.finalQc,
      nativeSamples: finite.samples.map(row => ({captionId: row.instructionId, frame: row.frame,
        expectedState: row.expectedState, visible: row.visible}))});

    for (const [index, record] of outcome.overlayRecords.entries()) {
      for (const fault of ['no-motion', 'late', 'no-return']) {
        const records = structuredClone(outcome.overlayRecords), target = records[index];
        if (fault === 'no-motion') for (const row of target.motionStates) row.pngPath = record.motionStates[0].pngPath;
        if (fault === 'no-return') target.motionStates[0].pngPath = record.motionStates[index === 0 ? 3 : 1].pngPath;
        const args = buildPresentationCompositeArgumentsV001({baseMediaPath, plan: outcome.resolvedPlan,
          overlayRecords: records, expectedFrameCount: 60, serializePngAndFilters: true});
        if (fault === 'late') {
          const graphIndex = args.indexOf('-filter_complex') + 1, graph = args[graphIndex];
          args[graphIndex] = graph.replace(`setpts=PTS+${record.element.startFrame}/30/TB[overlay${index}]`,
            `setpts=PTS+${record.element.startFrame + 2}/30/TB[overlay${index}]`);
          assert.notEqual(args[graphIndex], graph);
        }
        const name = record.element.instructionId + '-' + fault, video = path.join(output, `${name}.mp4`);
        await execute(FFMPEG, [...args, video]);
        const sampleFrame = record.element.startFrame + (fault === 'no-return' ? (index === 0 ? 8 : 12) : 4);
        const sample = finite.samples.find(row => row.instructionId === record.element.instructionId && row.frame === sampleFrame);
        assert(sample, 'fault is observed at an independently specified changed or stable frame');
        const extracted = path.join(output, `${name}-frame.png`);
        await execute(FFMPEG, buildPresentationFrameExtractionArgumentsV001({inputPath: video, frame: sampleFrame,
          outputPath: extracted, fps: 30}));
        const {crop} = sample;
        const observed = await execute(MAGICK, [extracted, '-crop', `${crop.width}x${crop.height}+${crop.left}+${crop.top}`,
          '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], {encoding: 'buffer', maxBuffer: crop.width * crop.height * 3 + 1024});
        const references = await Promise.all(sample.references.map(async ref => ({id: ref.id, rgb: await readFile(ref.rgbPath)})));
        const stateDecision = classifyPresentationNativeFrameRgbV001({completedRgb: observed.stdout, references});
        assert.equal(stateDecision.visible, false, name + ': native state test must reject the actual faulty video');
        const replay = await inspectPresentationExactReplayQcV001({plan: outcome.resolvedPlan, records: outcome.overlayRecords,
          baseMediaPath, completedMediaPath: video, expectedFrameCount: 60,
          scratchDirectory: path.join(output, `${name}-replay`), ffmpegPath: FFMPEG, ffprobePath: FFPROBE,
          serializePngAndFilters: true, presentationTimeline: null, timelineAudio: null});
        await writeFile(path.join(output, `${name}-qc.json`), JSON.stringify({sampleFrame, stateDecision, replay}, null, 2) + '\n');
        assert.equal(replay.status, 'failed', name + ': exact replay must reject the actual faulty video');
        assert.equal(replay.evidence.comparisonMethod, 'all-decoded-yuv420p-frames-and-audio-packets');
        for (const side of ['completed', 'replay']) {
          assert.equal(replay.evidence.decodedVideo[side].frameCount, 60);
          assert.equal(replay.evidence.decodedVideo[side].frames.length, 60);
        }
        assert(replay.evidence.processes.every(row => row.code === 0 && row.signal === null && !row.failed),
          name + ': every replay and observation process must complete successfully');
        const changedFrameCount = replay.evidence.decodedVideo.completed.frames.filter((frame, frameIndex) =>
          frame.sha256 !== replay.evidence.decodedVideo.replay.frames[frameIndex].sha256).length;
        assert(changedFrameCount > 0, name + ': actual decoded frame pixels must differ');
        assert.deepEqual(replay.violations, [{code: 'EXACT_REPLAY_QC_INVALID',
          reason: 'exact replay QC: complete decoded video frame sequence or exact timestamps differ'}]);
        measurements.push({kind: 'real-fault-rejection', name, video, sampleFrame, nativeRejected: !stateDecision.visible,
          replayStatus: replay.status, changedFrameCount, replayViolations: replay.violations});
      }
    }
  } finally {
    await browser.close({silent: true});
    await writeFile(path.join(output, 'measurement.json'), JSON.stringify({schemaVersion: 'presentation-caption-motion-native-qc-v001',
      savedPropsBinding: {path: savedPropsPath, fileSha256: sha(savedPropsBytes)},
      fontBinding: {path: fontPath, fileSha256: sha(fontBytes)}, bundleBinding: {path: bundlePath, fileSha256: sha(bundle.outputFiles[0].text)},
      chromiumBinding: {path: chromePath, fileSha256: sha(await readFile(chromePath))},
      runtime: process.version, renderDirectory, syntheticVideoOnly: true,
      selection: 'explicit technical fixture, not an automatic judgment',
      drawing: 'existing ExactOverlay entry in a cached local native browser; common production compositor and combined QC',
      externalApiCalls: 0, costUsd: 0, measurements}, null, 2) + '\n');
  }
});

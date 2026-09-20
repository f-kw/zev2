import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, mkdtemp, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001, sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  loadAutoPresentationContextV001, loadAutoPresentationV001,
  saveAutoPresentationOverridesV001, saveFixedAutoPresentationV001,
} from './presentation_auto_effects_io_v001.mjs';
import {
  PRESENTATION_PANEL_ASSETS_V002, PRESENTATION_PANEL_PRESETS_V002,
  getPresentationPanelAssetV002, getPresentationPanelPresetV002,
  isPresentationPanelBackgroundV002,
} from './presentation_panel_presets_v002.mjs';
import {inspectRenderedMediaWithToolsV001, inspectOverlayPngWithToolV001}
  from './presentation_renderer_qc_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001}
  from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const MAGICK = '/opt/homebrew/bin/magick';
const OUTPUT_PARENT = 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q1-q2-20260920-v001';
const shapes = [
  {name: 'short', lines: ['逃げるやつ?']},
  {name: 'wide', lines: ['なんかグロいやつに捕まってる']},
  {name: 'two-lines', lines: ['先に条件を伝える', 'それから進める']},
];
const presentations = ['provisional-panel', 'provisional-panel-graph-paper', 'provisional-panel-comic-frame'];
const json = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const panelSelection = presentation => ({role: 'Panel accent', presentation, scope: 'whole-caption'});
const contentAndTiming = element => ({text: element.text, indexedLines: element.indexedLines,
  startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive,
  displayFrameCount: element.displayFrameCount});

// The observable alpha bounds are integer pixel edges. The difference of the
// two opposing margins can therefore be at most one pixel when centered with
// an integer translation. This is raster rounding, not a visual-quality score
// or a tunable acceptance coefficient. A full one-pixel displacement of an
// exactly centered row creates a two-pixel margin difference and is rejected.
function assertPixelCentered(container, lines, label) {
  const horizontal = lines.map(line => ({
    left: line.left - container.left,
    right: container.right - line.right,
  }));
  for (const [index, margins] of horizontal.entries()) {
    assert.ok(Math.abs(margins.left - margins.right) <= 1,
      `${label} line ${index}: opposing pixel margins differ: ${JSON.stringify(margins)}`);
  }
  const top = Math.min(...lines.map(line => line.top)) - container.top;
  const bottom = container.bottom - Math.max(...lines.map(line => line.bottom));
  assert.ok(Math.abs(top - bottom) <= 1,
    `${label}: union vertical pixel margins differ: ${JSON.stringify({top, bottom})}`);
  return {horizontalMargins: horizontal, unionVerticalMargins: {top, bottom},
    integerRasterRoundingOnly: true};
}

test('HRC-001/002 finite Panel backgrounds preserve saved edits and center actual glyph masks through common drawing', async t => {
  const root = process.cwd();
  const parent = path.resolve(root, OUTPUT_PARENT);
  await mkdir(parent, {recursive: true});
  const output = process.env.ZEV_PANEL_QUALITY_QC_OUTPUT
    ? path.resolve(process.env.ZEV_PANEL_QUALITY_QC_OUTPUT)
    : await mkdtemp(path.join(parent, 'panel-tests-'));
  assert.equal(path.dirname(output), parent, 'test evidence stays in the approved output parent');
  assert.ok(path.basename(output).startsWith('panel-tests-'));
  if (process.env.ZEV_PANEL_QUALITY_QC_OUTPUT) await mkdir(output); // Existing attempts are never replaced.
  const evidence = {schemaVersion: 'presentation-panel-quality-test-v002', output,
    runtime: process.version, syntheticTechnicalFixture: true, humanQualityVerdict: null,
    externalApiCalls: 0, sourceMediaRead: false, cases: [], status: 'running'};
  t.after(() => json(path.join(output, 'measurement.json'), evidence));
  console.log(`Panel quality evidence: ${output}`);

  const savedPropsPath = path.resolve(root,
    'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const savedPropsBytes = await readFile(savedPropsPath);
  const savedProps = JSON.parse(savedPropsBytes);
  const sourceBindingsPath = path.resolve(root,
    'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918/source-bindings.json');
  const sourceBindingsBytes = await readFile(sourceBindingsPath);
  const sourceBindings = JSON.parse(sourceBindingsBytes);
  const sourcePlan = JSON.parse(sourceBindings.planBytes);
  // Use the actual admitted Digest's Normal state, without inventing geometry.
  savedProps.visualState = structuredClone(sourcePlan.elements.find(element =>
    element.instructionId.endsWith('000010')).visualState);
  evidence.fixtureSources = [
    {path: savedPropsPath, fileSha256: sha(savedPropsBytes)},
    {path: sourceBindingsPath, fileSha256: sha(sourceBindingsBytes),
      embeddedNormalPlanSha256: sha(sourceBindings.planBytes)},
  ];

  const elements = [];
  for (const shape of shapes) for (const presentation of presentations) {
    const indexed = indexExplicitLinesV001(shape.lines);
    assert.equal(indexed.status, 'passed');
    const startFrame = elements.length * 12;
    elements.push({instructionId: `${shape.name}-${presentation}`, kind: 'speech-caption',
      presetId: 'normal-test', requestedPresetId: 'normal-test', appliedPresetId: 'normal-test',
      registryVersion: 'panel-quality-technical-fixture-v002', text: indexed.sourceText,
      indexedLines: indexed.indexedLines, startFrame, endFrameExclusive: startFrame + 12,
      displayFrameCount: 12, visualState: structuredClone(savedProps.visualState)});
  }
  const controlIndex = indexExplicitLinesV001(['通常の字幕を保つ']);
  elements.push({instructionId: 'unchanged-normal', kind: 'speech-caption',
    presetId: 'normal-test', requestedPresetId: 'normal-test', appliedPresetId: 'normal-test',
    registryVersion: 'panel-quality-technical-fixture-v002', text: controlIndex.sourceText,
    indexedLines: controlIndex.indexedLines, startFrame: 108, endFrameExclusive: 120,
    displayFrameCount: 12, visualState: structuredClone(savedProps.visualState)});
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: savedProps.canvas, layoutRules: savedProps.layoutRules, elements};
  const baselinePath = path.join(output, 'normal-plan.json');
  const decisionInputPath = path.join(output, 'decision-input.json');
  const autoProposalPath = path.join(output, 'fixed-auto.json');
  await json(baselinePath, baselinePlan);
  await json(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null});
  const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
  const inputBytes = {baseline: await readFile(baselinePath), decision: await readFile(decisionInputPath)};
  const proposal = {schemaVersion: 'auto-presentation-proposal-v001', context: loaded.context,
    targetCaptionIds: elements.map(element => element.instructionId), completion: 'complete',
    effects: elements.slice(0, -1).map(element => ({captionId: element.instructionId,
      ...panelSelection(presentations.find(presentation => element.instructionId.endsWith(presentation)))})), exceptions: []};
  const fixed = await saveFixedAutoPresentationV001({baselinePath, decisionInputPath, proposal, outputPath: autoProposalPath});
  const automatic = resolveAutoPresentationV001({...loaded, autoProposal: fixed});
  const fixedBytes = await readFile(autoProposalPath);
  const loadState = async overridesPath => {
    const state = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath,
      ...(overridesPath ? {overridesPath} : {})});
    return {...state, result: resolveAutoPresentationV001({baselinePlan: state.baselinePlan, ...state.autoPresentation})};
  };
  const saveOverride = (overrides, name) => saveAutoPresentationOverridesV001({
    baselinePath, decisionInputPath, autoProposalPath, overrides, outputPath: path.join(output, `${name}.json`)});

  let normalFixed;
  let resetState;
  await t.test('finite backgrounds and saved Normal/Reset keep source, scope and byte bindings', async () => {
    assert.deepEqual(Object.keys(PRESENTATION_PANEL_PRESETS_V002), presentations);
    assert.equal(loaded.context.renderingRulesRef.version, 'auto-presentation-rules-v008');
    assert.deepEqual(automatic.plan.elements.at(-1), baselinePlan.elements.at(-1));
    for (let index = 0; index < elements.length; index++) {
      assert.deepEqual(contentAndTiming(automatic.plan.elements[index]), contentAndTiming(elements[index]));
    }
    const reloaded = await loadState();
    assert.deepEqual(reloaded.result.plan, automatic.plan);
    const targetId = elements[0].instructionId;
    const common = {...loaded, autoProposal: fixed};
    let overrides = createAutoPresentationOverridesV001(common);
    overrides = editAutoPresentationOverrideV001({...common, overrides, captionId: targetId,
      selection: panelSelection('provisional-panel-graph-paper')});
    await saveOverride(overrides, 'graph-override');
    const graph = await loadState(path.join(output, 'graph-override.json'));
    assert.equal(graph.result.plan.elements[0].visualState.background.panelPresetId, 'graph-paper');
    overrides = editAutoPresentationOverrideV001({...common, overrides: graph.autoPresentation.overrides,
      captionId: targetId, selection: panelSelection('provisional-panel-comic-frame')});
    await saveOverride(overrides, 'comic-override');
    const comic = await loadState(path.join(output, 'comic-override.json'));
    assert.equal(comic.result.plan.elements[0].visualState.background.panelPresetId, 'comic-frame');
    overrides = editAutoPresentationOverrideV001({...common, overrides: comic.autoPresentation.overrides,
      captionId: targetId, selection: 'Normal'});
    await saveOverride(overrides, 'normal-override');
    normalFixed = await loadState(path.join(output, 'normal-override.json'));
    assert.deepEqual(normalFixed.result.plan.elements[0], baselinePlan.elements[0]);
    assert.deepEqual(normalFixed.autoPresentation.overrides.entries, [{captionId: targetId, role: 'Normal'}]);
    overrides = editAutoPresentationOverrideV001({...common, overrides: normalFixed.autoPresentation.overrides,
      captionId: targetId, selection: 'Reset'});
    await saveOverride(overrides, 'reset-override');
    resetState = await loadState(path.join(output, 'reset-override.json'));
    assert.deepEqual(resetState.autoPresentation.overrides.entries, []);
    assert.deepEqual(resetState.result.plan, automatic.plan);
    for (const state of [graph, comic, normalFixed, resetState]) {
      assert.deepEqual(state.result.plan.elements.slice(1), automatic.plan.elements.slice(1));
      assert.deepEqual(contentAndTiming(state.result.plan.elements[0]), contentAndTiming(elements[0]));
    }
    assert.deepEqual(await readFile(baselinePath), inputBytes.baseline);
    assert.deepEqual(await readFile(decisionInputPath), inputBytes.decision);
    assert.deepEqual(await readFile(autoProposalPath), fixedBytes);
    for (const presentation of presentations) {
      const preset = getPresentationPanelPresetV002(presentation);
      assert.equal(isPresentationPanelBackgroundV002(preset.background), true);
      const asset = getPresentationPanelAssetV002(preset.background);
      if (preset.id === 'plain') assert.equal(asset, null);
      else {
        assert.equal(asset.origin, PRESENTATION_PANEL_ASSETS_V002[preset.id].origin);
        assert.match(asset.origin, /Original SVG authored locally/);
        assert.match(asset.dataUrl, /^data:image\/svg\+xml;charset=utf-8,/);
        assert.doesNotMatch(asset.svg, /(?:href=|<script|<foreignObject|url\()/);
      }
    }
    evidence.cases.push({name: 'finite-save-normal-reset', status: 'passed',
      renderingRulesRef: loaded.context.renderingRulesRef, inputAndFixedBytesUnchanged: true,
      assetBindings: Object.entries(PRESENTATION_PANEL_ASSETS_V002).map(([id, asset]) => ({
        id, assetId: asset.assetId, origin: asset.origin, svgSha256: sha(asset.svg)}))});
  });

  await t.test('unknown presets and arbitrary image paths are rejected before saving', async () => {
    const invalidEffects = [
      {...proposal.effects[0], presentation: 'provisional-panel-unknown'},
      {...proposal.effects[0], imagePath: '/tmp/unmanaged-image.png'},
      {...proposal.effects[0], background: {panelPresetId: 'plain', imagePath: '/tmp/unmanaged-image.png'}},
      {...proposal.effects[0], imageUrl: 'https://example.invalid/background.png'},
    ];
    for (const [index, effect] of invalidEffects.entries()) {
      const outputPath = path.join(output, `rejected-auto-${index}.json`);
      await assert.rejects(saveFixedAutoPresentationV001({baselinePath, decisionInputPath,
        proposal: {...proposal, effects: [effect, ...proposal.effects.slice(1)]}, outputPath}), TypeError);
      await assert.rejects(stat(outputPath), {code: 'ENOENT'});
      const empty = createAutoPresentationOverridesV001({...loaded, autoProposal: fixed});
      const overridePath = path.join(output, `rejected-override-${index}.json`);
      await assert.rejects(saveAutoPresentationOverridesV001({baselinePath, decisionInputPath, autoProposalPath,
        overrides: {...empty, entries: [effect]}, outputPath: overridePath}), TypeError);
      await assert.rejects(stat(overridePath), {code: 'ENOENT'});
    }
    assert.throws(() => getPresentationPanelPresetV002('unknown'), TypeError);
    for (const background of [
      {...PRESENTATION_PANEL_PRESETS_V002['provisional-panel'].background, panelPresetId: 'unknown'},
      {...PRESENTATION_PANEL_PRESETS_V002['provisional-panel'].background, imagePath: '/tmp/unmanaged-image.png'},
      {...PRESENTATION_PANEL_PRESETS_V002['provisional-panel'].background, paddingXPx: 1},
    ]) assert.throws(() => getPresentationPanelAssetV002(background), TypeError);
    assert.deepEqual(await readFile(autoProposalPath), fixedBytes);
    evidence.cases.push({name: 'invalid-input-rejection', status: 'passed',
      rejectedAutomaticAndOverrideFiles: invalidEffects.length * 2, arbitraryBackgroundValuesRejected: true});
  });

  await t.test('actual line masks are centered and three finite backgrounds reach a short completed video', async () => {
    const tsx = path.resolve(root, 'runner/node_modules/tsx/dist/cli.mjs');
    const chromePath = path.resolve(root,
      'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
    const fontPath = path.resolve(root, 'runner/public/font', savedProps.fontFileName);
    const fontBytes = await readFile(fontPath);
    const presetRegistry = {fontAssets: [{fontAssetId: savedProps.visualState.textStyle.fontAssetId,
      fileName: savedProps.fontFileName, path: path.relative(root, fontPath), sha256: sha(fontBytes)}]};
    const processObserver = createPresentationRendererProcessObserverV001({
      observationDirectory: path.join(output, 'native-processes')});
    // The same CLI, registered Composition, image lifecycle and prop builder
    // used for actual candidates also draw every native test observation.
    const adapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.resolve(root, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: chromePath, processObserver});
    {
      const {width, height} = savedProps.canvas;
      const capture = async (props, file) => {
        await assert.rejects(stat(file), {code: 'ENOENT'});
        await adapter.renderStill(props, file);
        return readFile(file);
      };
      const propsFor = (element, plan = baselinePlan) => adapter.buildProps(element, plan, presetRegistry);
      const rgbaFor = async file => (await execute(MAGICK, [file, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: width * height * 4 + 1024})).stdout;
      const nativeBindings = await Promise.all([
        'evals/clip_composition/presentation_renderer_entry_v001.tsx',
        'evals/clip_composition/presentation_renderer_text_layout_v001.mjs',
        'evals/clip_composition/presentation_panel_presets_v002.mjs',
        'runner/src/remotion/components/TelopText.tsx',
        'runner/src/telop/text-metrics.ts',
      ].map(async file => ({path: file, fileSha256: sha(await readFile(path.resolve(root, file)))})));
      evidence.nativeBindings = {sources: nativeBindings,
        font: {path: fontPath, fileSha256: sha(fontBytes)},
        browser: {path: chromePath, fileSha256: sha(await readFile(chromePath))},
        nativeAdapter: 'buildPresentationRendererOverlayAdapterV001',
        actualRegisteredComposition: 'PresentationOverlayV001'};
      const oldRun = path.resolve(root,
        'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/run-4ef43bca-e48a-453c-9c78-d036c965103e');
      const oldLayoutPath = path.join(oldRun, '.render.presentation-renderer-v002-work-DuK20Q/scratch/layout-input.json');
      const oldLayoutBytes = await readFile(oldLayoutPath);
      const oldNormal = JSON.parse(oldLayoutBytes).overlays.find(row => row.text === '逃げるんだ');
      assert.ok(oldNormal);
      const originalNormal = sourcePlan.elements.find(row => row.instructionId === oldNormal.instructionId);
      assert.equal(oldNormal.text, originalNormal.text);
      assert.deepEqual(oldNormal.indexedLines, originalNormal.indexedLines);
      assert.deepEqual(oldNormal.visualState, originalNormal.visualState);
      assert.equal(oldNormal.visualState.background, null);
      const oldPngPath = path.join(oldRun, 'render/overlays/11-9cd9ed60c47d.png');
      const oldPng = await readFile(oldPngPath);
      const oldPngPixels = await rgbaFor(oldPngPath);
      const newNormalPath = path.join(output, 'historical-normal-replayed.png');
      const oldPropsIdentity = sha256AutoPresentationV001(oldNormal);
      await capture(oldNormal, newNormalPath);
      assert.equal(sha256AutoPresentationV001(oldNormal), oldPropsIdentity);
      assert.deepEqual(await rgbaFor(newNormalPath), oldPngPixels,
        'accepted historical Normal pixels remain identical with the same saved props');
      evidence.historicalNormal = {status: 'passed', text: oldNormal.text,
        layoutInput: {path: oldLayoutPath, fileSha256: sha(oldLayoutBytes)},
        propsCanonicalSha256: oldPropsIdentity,
        oldPng: {path: oldPngPath, fileSha256: sha(oldPng)},
        replayedPng: {path: newNormalPath, fileSha256: sha(await readFile(newNormalPath))},
        identicalRgbaSha256: sha(oldPngPixels)};
      const normalBefore = await capture(propsFor(elements[0]), path.join(output, 'normal-before.png'));
      const normalAfter = await capture(propsFor(normalFixed.result.plan.elements[0]), path.join(output, 'normal-fixed.png'));
      assert.deepEqual(normalAfter, normalBefore, 'saved Normal override renders the exact Normal PNG');
      const normalControl = await capture(propsFor(elements.at(-1)), path.join(output, 'normal-control-direct.png'));
      const automaticPanel = await capture(propsFor(automatic.plan.elements[0]), path.join(output, 'panel-auto-direct.png'));
      const resetPanel = await capture(propsFor(resetState.result.plan.elements[0]), path.join(output, 'panel-reset-direct.png'));
      assert.deepEqual(resetPanel, automaticPanel, 'saved Reset restores the same automatic Panel PNG');

      const baseMediaPath = path.join(output, 'synthetic-base.mp4');
      await execute(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'lavfi', '-i',
        `testsrc2=size=${width}x${height}:rate=30:duration=4`, '-f', 'lavfi', '-i',
        'sine=frequency=440:sample_rate=48000:duration=4', '-frames:v', '120', '-c:v', 'libx264',
        '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', baseMediaPath]);
      const toolPaths = {ffmpegPath: FFMPEG, ffprobePath: FFPROBE, imageMagickPath: MAGICK,
        tsxPath: tsx, layoutInspectorPath: path.resolve(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
      const baseMediaInspection = {media: await inspectRenderedMediaWithToolsV001(baseMediaPath, toolPaths)};
      const renderDirectory = path.join(output, 'common-render');
      const automaticInput = {context: loaded.context, autoProposal: fixed};
      const inputIdentity = sha256AutoPresentationV001({baselinePlan, automaticInput});
      const outcome = await executeValidatedPresentationDrawAndQcV001({outputDirectory: renderDirectory,
        plan: baselinePlan, autoPresentation: automaticInput, presetRegistry, baseMediaPath, baseMediaInspection,
        expectedFrameCount: 120, overlayAdapter: adapter, toolPaths, serializePngAndFilters: true,
        counterfactualQcMethod: 'exact-replay-native-v1'});
      await json(path.join(output, 'common-render-result.json'), outcome);
      assert.equal(outcome.exitCode, 0, JSON.stringify({failure: outcome.failure, violations: outcome.violations,
        finalQc: outcome.finalQc}));
      assert.equal(outcome.finalQc.status, 'passed');
      assert.equal(outcome.overlayRecords.length, elements.length);
      assert.equal(sha256AutoPresentationV001({baselinePlan, automaticInput}), inputIdentity);
      assert.equal(outcome.outputMedia.audio.packetPayloadSha256, baseMediaInspection.media.audio.packetPayloadSha256);
      const control = outcome.overlayRecords.find(row => row.element.instructionId === 'unchanged-normal');
      assert.deepEqual(control.props, propsFor(elements.at(-1)), 'non-Panel props receive no centering correction');
      assert.equal(control.pngSha256, sha(normalControl), 'common rendering leaves Normal PNG bytes unchanged');

      const panelObservations = [];
      for (const record of outcome.overlayRecords.filter(row => row.element.instructionId !== 'unchanged-normal')) {
        const container = record.inspection.alphaBounds;
        assert.ok(container);
        const lineBounds = [], masks = [];
        for (const line of record.element.indexedLines) {
          const maskPath = path.join(output, `${record.fileStem}-independent-line-${line.lineIndex}.png`);
          await capture({...record.props, inspectionLineIndex: line.lineIndex}, maskPath);
          const measured = await inspectOverlayPngWithToolV001({instructionId: record.element.instructionId,
            pngPath: maskPath, imageMagickPath: MAGICK});
          assert.ok(measured.alphaBounds);
          lineBounds.push(measured.alphaBounds);
          masks.push(await rgbaFor(maskPath));
        }
        const centering = assertPixelCentered(container, lineBounds, record.element.instructionId);
        // Defect injection into the observation alone proves that the assertion
        // can reject a displaced line; it does not modify renderer output.
        assert.throws(() => assertPixelCentered(container,
          lineBounds.map((line, index) => index === 0 ? {...line, left: line.left + 2, right: line.right + 2} : line),
          'displaced-observation'), assert.AssertionError);
        const pixels = await rgbaFor(record.pngPath);
        const colors = new Map();
        let observedBackgroundPixels = 0;
        for (let y = container.top + 1; y < container.bottom - 1; y++) {
          for (let x = container.left + 1; x < container.right - 1; x++) {
            const offset = (y * width + x) * 4;
            if (masks.some(mask => mask[offset + 3] !== 0)) continue;
            assert.equal(pixels[offset + 3], 255, 'the plate interior has no transparent holes');
            const color = pixels.subarray(offset, offset + 3).toString('hex');
            colors.set(color, (colors.get(color) ?? 0) + 1);
            observedBackgroundPixels++;
          }
        }
        const backgroundId = record.element.visualState.background.panelPresetId;
        assert.ok(observedBackgroundPixels > 0);
        if (backgroundId === 'plain') assert.deepEqual([...colors.keys()], ['fffdf8']);
        else {
          assert.ok(colors.has('fffdf8'), 'pattern keeps the declared light field');
          assert.ok(colors.size > 1, 'pattern is spatial artwork rather than a flat recolor');
        }
        panelObservations.push({captionId: record.element.instructionId, backgroundId,
          pngPath: record.pngPath, pngSha256: record.pngSha256, container, lineBounds, centering,
          glyphMaskHashes: masks.map(sha), backgroundColorCounts: Object.fromEntries(colors), observedBackgroundPixels});
      }
      for (const shape of shapes) {
        const rows = panelObservations.filter(row => row.captionId.startsWith(`${shape.name}-`));
        assert.equal(rows.length, 3);
        assert.equal(new Set(rows.map(row => row.pngSha256)).size, 3, 'all finite backgrounds paint distinct images');
        for (const row of rows.slice(1)) {
          assert.deepEqual(row.glyphMaskHashes, rows[0].glyphMaskHashes, 'background choice leaves glyph pixels unchanged');
          assert.deepEqual(row.container, rows[0].container, 'background choice leaves panel geometry unchanged');
        }
      }
      await json(path.join(output, 'panel-raster-observations.json'), panelObservations);
      evidence.cases.push({name: 'native-common-render', status: 'passed',
        video: {path: outcome.workVideo, fileSha256: sha(await readFile(outcome.workVideo)), frameCount: 120},
        finalQc: outcome.finalQc.status, centeredCaptionCount: panelObservations.length,
        normalControlPngSha256: control.pngSha256, directNormalPngSha256: sha(normalBefore),
        normalOverridePngSha256: sha(normalAfter), resetRestoresPanelPixels: true,
        completedFrameQc: outcome.completedFrameQc.status, inputIdentity,
        humanQualityVerdict: null});
    }
  });
  evidence.status = evidence.cases.length === 3 ? 'passed' : 'failed';
});

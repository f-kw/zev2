/** Deliberate native drawing coverage of finite palettes, not auto-selection evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {indexExplicitLinesV001, resolveVisibleCenterOffsetsV001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {getPresentationPanelPalettePresetV003, PRESENTATION_PANEL_PALETTES_V003}
  from '../../evals/clip_composition/presentation_panel_presets_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectOverlayPngWithToolV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001}
  from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const magick = '/opt/homebrew/bin/magick';
const shapes = [
  {id: 'short', lines: ['逃げるやつ?']},
  {id: 'wide', lines: ['なんかグロいやつに捕まってる']},
];
const presentations = ['provisional-panel', 'provisional-panel-graph-paper'];
const alphaBytes = rgba => {
  const output = Buffer.alloc(rgba.length / 4);
  for (let offset = 3, index = 0; offset < rgba.length; offset += 4) output[index++] = rgba[offset];
  return output;
};
const alphaPixelSets = alpha => ({
  nonzeroPixelSetSha256: sha(Uint8Array.from(alpha, value => value > 0 ? 1 : 0)),
  opaquePixelSetSha256: sha(Uint8Array.from(alpha, value => value === 255 ? 1 : 0)),
});
function centered(container, line, id) {
  const margins = {left: line.left - container.left, right: container.right - line.right,
    top: line.top - container.top, bottom: container.bottom - line.bottom};
  // Integer alpha-bound edges can differ by one pixel under exact centering.
  // A whole-pixel translation creates a two-pixel opposing-margin difference.
  assert.ok(Math.abs(margins.left - margins.right) <= 1, `${id}: horizontal pixel centering`);
  assert.ok(Math.abs(margins.top - margins.bottom) <= 1, `${id}: vertical pixel centering`);
  return margins;
}
async function unused(file) {
  await assert.rejects(stat(file), {code: 'ENOENT'});
}

export async function runR3PaletteQa(outputDirectory, summaryPath) {
  outputDirectory = path.resolve(outputDirectory); summaryPath = path.resolve(summaryPath);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory});
  assert.equal(path.dirname(summaryPath), path.join(root, 'docs/reports/review-reflection-r1-r3-20260921-v002'));
  await unused(summaryPath);
  const evidence = {schemaVersion: 'r3-deliberate-palette-native-qa-v001',
    kind: 'deliberate-finite-palette-coverage', automaticSelectionEvidence: false,
    sourceMediaRead: false, encodedVideoRendered: false, audioVerified: false,
    humanQualityVerdict: null, externalApiCalls: 0, costUsd: 0,
    runtime: {path: process.execPath, version: process.version},
    outputDirectory, status: 'running', cases: []};
  await mkdir(outputDirectory);
  try {
    const savedPropsPath = path.join(root,
      'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
    const sourcePath = path.join(root, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918/source-bindings.json');
    const propsBytes = await readFile(savedPropsPath), sourceBytes = await readFile(sourcePath);
    const savedProps = JSON.parse(propsBytes), source = JSON.parse(sourceBytes), sourcePlan = JSON.parse(source.planBytes);
    const normal = sourcePlan.elements.find(element => element.instructionId.endsWith('000010'));
    assert.ok(normal, 'fixed Normal style source exists');
    const fontPath = path.join(root, 'runner/public/font', savedProps.fontFileName), fontBytes = await readFile(fontPath);
    const chromiumPath = path.join(root,
      'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
    const remotionPath = path.join(root, 'runner/node_modules/@remotion/cli/remotion-cli.js');
    const tsxPath = path.join(root, 'runner/node_modules/tsx/dist/cli.mjs');
    const inspectorPath = path.join(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts');
    const bindingFiles = [fileURLToPath(import.meta.url), savedPropsPath, sourcePath, fontPath, chromiumPath, remotionPath,
      path.join(root, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'),
      path.join(root, 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'),
      path.join(root, 'evals/clip_composition/presentation_panel_presets_v002.mjs'),
      path.join(root, 'evals/clip_composition/render_presentation_v002.mjs'), inspectorPath,
      path.join(root, 'runner/src/remotion/components/TelopText.tsx'),
      path.join(root, 'runner/src/telop/text-metrics.ts')];
    evidence.sourceBindings = await Promise.all(bindingFiles.map(async file => ({path: file, fileSha256: sha(await readFile(file))})));
    evidence.fixturePurpose = 'The same short and wide synthetic text shapes used by the existing Panel quality test, with the fixed HRB Normal typography.';
    evidence.nativeAdapter = 'buildPresentationRendererOverlayAdapterV001';
    evidence.actualRegisteredComposition = 'PresentationOverlayV001';
    const adapter = buildPresentationRendererOverlayAdapterV001({remotionPath, chromiumPath,
      processObserver: createPresentationRendererProcessObserverV001({observationDirectory: path.join(outputDirectory, 'native-processes')})});
    const registry = {fontAssets: [{fontAssetId: normal.visualState.textStyle.fontAssetId,
      fileName: savedProps.fontFileName, path: path.relative(root, fontPath), sha256: sha(fontBytes)}]};
    const elements = [];
    for (const shape of shapes) for (const presentation of presentations) for (const paletteId of Object.keys(PRESENTATION_PANEL_PALETTES_V003)) {
      const indexed = indexExplicitLinesV001(shape.lines); assert.equal(indexed.status, 'passed');
      const preset = getPresentationPanelPalettePresetV003(presentation, paletteId);
      elements.push({...structuredClone(normal), instructionId: `${shape.id}-${preset.id}-${paletteId}`,
        text: indexed.sourceText, indexedLines: indexed.indexedLines,
        startFrame: 0, endFrameExclusive: 30, displayFrameCount: 30,
        visualState: {...structuredClone(normal.visualState),
          textStyle: {...structuredClone(normal.visualState.textStyle), ...preset.textStyle},
          background: structuredClone(preset.background)}});
    }
    const plan = {...structuredClone(sourcePlan), elements};
    const overlays = elements.map(element => adapter.buildProps(element, plan, registry));
    const layoutInputPath = path.join(outputDirectory, 'layout-input.json'), layoutPath = path.join(outputDirectory, 'layout.json');
    await save(layoutInputPath, {canvas: plan.canvas, overlays});
    const layoutCommand = [tsxPath, inspectorPath, layoutInputPath, layoutPath];
    const layoutProcess = await execute(process.execPath, layoutCommand, {cwd: root,
      env: {...process.env, NODE_PATH: path.join(root, 'runner/node_modules'), TSX_DISABLE_CACHE: '1'}, maxBuffer: 4 * 1024 * 1024});
    await writeFile(path.join(outputDirectory, 'layout.stdout'), layoutProcess.stdout, {flag: 'wx'});
    await writeFile(path.join(outputDirectory, 'layout.stderr'), layoutProcess.stderr, {flag: 'wx'});
    const layout = JSON.parse(await readFile(layoutPath, 'utf8')); assert.equal(layout.status, 'passed');
    evidence.layout = {path: layoutPath, fileSha256: sha(await readFile(layoutPath)), status: layout.status,
      command: [process.execPath, ...layoutCommand], violations: layout.violations};
    const {width, height} = plan.canvas;
    const rgbaFor = async file => (await execute(magick, [file, '-depth', '8', 'rgba:-'],
      {encoding: 'buffer', maxBuffer: width * height * 4 + 1024})).stdout;
    const geometryByShape = new Map();
    for (const [index, element] of elements.entries()) {
      const uncorrectedProps = overlays[index], pngPath = path.join(outputDirectory, `${element.instructionId}.png`);
      const maskPath = path.join(outputDirectory, `${element.instructionId}-line.png`);
      const calibrationPath = path.join(outputDirectory, `${element.instructionId}-calibration-line.png`);
      await unused(pngPath); await unused(maskPath); await unused(calibrationPath);
      // Match the common renderer's native calibration exactly. A raw adapter
      // still intentionally precedes this stage and is not final Panel output.
      await adapter.renderLineMask(uncorrectedProps, 0, calibrationPath);
      const calibration = await inspectOverlayPngWithToolV001({instructionId: element.instructionId,
        pngPath: calibrationPath, imageMagickPath: magick});
      assert.ok(calibration.alphaBounds, 'native calibration paints the source glyphs');
      const wrapper = layout.items[index].wrapper;
      const containerBounds = {left: wrapper.left, top: wrapper.top,
        right: wrapper.left + wrapper.width, bottom: wrapper.top + wrapper.height};
      const correction = resolveVisibleCenterOffsetsV001({containerBounds, lineBounds: [calibration.alphaBounds]});
      const props = {...uncorrectedProps, renderVisibleCenterCorrectionPx: correction};
      await adapter.renderStill(props, pngPath);
      await adapter.renderLineMask(props, 0, maskPath);
      const [overlay, mask, pixels, maskPixels] = await Promise.all([
        inspectOverlayPngWithToolV001({instructionId: element.instructionId, pngPath, imageMagickPath: magick}),
        inspectOverlayPngWithToolV001({instructionId: element.instructionId, pngPath: maskPath, imageMagickPath: magick}),
        rgbaFor(pngPath), rgbaFor(maskPath),
      ]);
      assert.ok(overlay.alphaBounds && mask.alphaBounds);
      const margins = centered(overlay.alphaBounds, mask.alphaBounds, element.instructionId);
      assert.ok(margins.left >= element.visualState.background.paddingXPx
        && margins.right >= element.visualState.background.paddingXPx
        && margins.top >= element.visualState.background.paddingYPx
        && margins.bottom >= element.visualState.background.paddingYPx, 'visible glyphs retain the managed padding');
      assert.throws(() => centered(overlay.alphaBounds, {...mask.alphaBounds,
        left: mask.alphaBounds.left + 2, right: mask.alphaBounds.right + 2}, 'displaced-measurement'), assert.AssertionError);
      const backgroundColors = new Map(), glyphColors = new Map();
      const container = overlay.alphaBounds;
      for (let y = container.top + 1; y < container.bottom - 1; y++) for (let x = container.left + 1; x < container.right - 1; x++) {
        const offset = (y * width + x) * 4, color = pixels.subarray(offset, offset + 3).toString('hex');
        if (maskPixels[offset + 3] === 0) {
          assert.equal(pixels[offset + 3], 255, 'the plate interior has no transparent holes');
          backgroundColors.set(color, (backgroundColors.get(color) ?? 0) + 1);
        } else if (maskPixels[offset + 3] === 255) glyphColors.set(color, (glyphColors.get(color) ?? 0) + 1);
      }
      const background = element.visualState.background, palette = PRESENTATION_PANEL_PALETTES_V003[background.panelPaletteId];
      const fieldColor = palette.backgroundColor.slice(1).toLowerCase(), fontColor = palette.fontColor.slice(1).toLowerCase();
      assert.ok(backgroundColors.has(fieldColor), 'declared field color paints actual pixels');
      assert.deepEqual([...glyphColors.keys()], [fontColor], 'solid glyph pixels match the fixed text color');
      if (background.panelPresetId === 'plain') assert.deepEqual([...backgroundColors.keys()], [fieldColor]);
      else assert.ok(backgroundColors.size > 1, 'the graph keeps visible grid lines');
      const shapeId = element.instructionId.startsWith('short-') ? 'short' : 'wide';
      const glyphAlpha = alphaBytes(maskPixels);
      const geometry = {container, line: mask.alphaBounds, ...alphaPixelSets(glyphAlpha)};
      const previous = geometryByShape.get(shapeId);
      if (previous) assert.deepEqual(geometry, previous, 'palette/background changes leave visible/opaque pixel sets and geometry unchanged');
      else geometryByShape.set(shapeId, geometry);
      evidence.cases.push({captionId: element.instructionId, shape: shapeId, background: background.panelPresetId,
        paletteId: background.panelPaletteId, status: 'passed',
        png: {path: pngPath, fileSha256: sha(await readFile(pngPath))},
        lineMask: {path: maskPath, fileSha256: sha(await readFile(maskPath))},
        nativeCalibration: {path: calibrationPath, fileSha256: sha(await readFile(calibrationPath)),
          alphaBounds: calibration.alphaBounds, containerBounds, correction,
          method: 'resolveVisibleCenterOffsetsV001'},
        declaredColors: palette, geometry, margins, glyphAlphaSha256: sha(glyphAlpha),
        backgroundColorCounts: Object.fromEntries(backgroundColors), solidGlyphColorCounts: Object.fromEntries(glyphColors)});
      console.log(`${evidence.cases.length}/${elements.length} ${element.instructionId} passed`);
    }
    assert.equal(evidence.cases.length, 16);
    assert.equal(new Set(evidence.cases.map(row => row.png.fileSha256)).size, 16);
    for (const binding of evidence.sourceBindings) assert.equal(sha(await readFile(binding.path)), binding.fileSha256, 'QA source changed during drawing');
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed'; evidence.failure = {name: error.name, message: error.message, stack: error.stack};
    throw error;
  } finally {
    const measurementPath = path.join(outputDirectory, 'measurement.json');
    await save(measurementPath, evidence);
    await save(summaryPath, {schemaVersion: evidence.schemaVersion, kind: evidence.kind, status: evidence.status,
      automaticSelectionEvidence: false, nativePngCases: evidence.cases.length,
      encodedVideoRendered: false, audioVerified: false, humanQualityVerdict: null, externalApiCalls: 0, costUsd: 0,
      measurement: {path: measurementPath, fileSha256: sha(await readFile(measurementPath))},
      ...(evidence.failure ? {failure: evidence.failure} : {})});
  }
  return evidence;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new TypeError('usage: r3-palette-qa.mjs <unused generated output directory> <unused D summary path>');
  runR3PaletteQa(process.argv[2], process.argv[3]).then(result => console.log(JSON.stringify({status: result.status, cases: result.cases.length})))
    .catch(error => {console.error(error.stack); process.exitCode = 1;});
}

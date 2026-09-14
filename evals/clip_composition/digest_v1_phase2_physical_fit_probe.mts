import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// 既存 inspector 内部の require と同じ module cache を使い、entry の二重登録を避ける。
const require = createRequire(import.meta.url);
const {inspectPresentationRenderLayoutV001} = require('./inspect_presentation_render_layout_v001.ts');
const {buildExactTextModel} = require('./presentation_renderer_entry_v001.tsx');
const {getCharWeight} = require('../../runner/src/telop/telop-line-break.ts');

// 診断専用。既存の配置計算を直接呼び、文字サイズ以外はメモリ上でも変更しない。
// renderer の実行、画像・動画の描画、preset や正式成果物の書込みは行わない。
type Json = any;
const root = fileURLToPath(new URL('../../', import.meta.url));
const work = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001';
const scratch = `${work}/.render-bridge-v002.presentation-renderer-v002-work-Ahau9u/scratch`;
const output = `${work}/physical-fit-probe-v001`;
const read = async (p: string) => JSON.parse(await readFile(path.resolve(root, p), 'utf8'));
const fileSha = async (p: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path.resolve(root, p))) hash.update(chunk);
  return hash.digest('hex');
};
const save = async (name: string, value: Json) => {
  const p = `${output}/${name}`;
  await writeFile(path.join(root, p), `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
  return {path: p, fileSha256: await fileSha(p)};
};
const bounds = (w: Json) => ({left: w.left, top: w.top, right: w.left + w.width, bottom: w.top + w.height});
const outside = (r: Json, b: Json) => r.left < b.left || r.top < b.top || r.right > b.right || r.bottom > b.bottom;

const main = async () => {
  const input = await read(`${scratch}/layout-input.json`);
  const saved = await read(`${scratch}/layout-output.json`);
  const previous = await read(`${work}/renderer-result-v002.json`);
  const bridge = await read(`${work}/caption-bridge-v001.json`);
  const plan = await read(`${work}/caption-bridge-common-plan-v001.json`);
  const admission = await read(`${work}/caption-bridge-admission-v001.json`);
  const stop = await read(`${work}/bridge-draw-replay-layout-stop-v001.json`);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(input.overlays.length, 325);
  assert.equal(plan.elements.length, 325);
  assert.equal(Array.from(bridge.actualTaskDescription).length, 815);
  assert.deepEqual(saved, previous.result.failure.nested);

  const frozen = new Map<string, string>();
  const collect = (value: Json) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.path === 'string' && typeof value.fileSha256 === 'string') {
      if (frozen.has(value.path)) assert.equal(frozen.get(value.path), value.fileSha256);
      frozen.set(value.path, value.fileSha256);
    }
    for (const child of Object.values(value)) collect(child);
  };
  for (const value of [bridge, admission, stop]) collect(value);
  for (const p of [`${scratch}/layout-input.json`, `${scratch}/layout-output.json`,
    `${work}/caption-bridge-common-plan-v001.json`, `${work}/renderer-result-v002.json`,
    `${work}/bridge-draw-replay-layout-stop-v001.json`,
    'evals/clip_composition/inspect_presentation_render_layout_v001.ts',
    'evals/clip_composition/presentation_renderer_entry_v001.tsx',
    'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-line-break.ts']) {
    const actual = await fileSha(p);
    if (frozen.has(p)) assert.equal(actual, frozen.get(p));
    frozen.set(p, actual);
  }
  for (const [p, expected] of frozen) assert.equal(await fileSha(p), expected, p);
  await mkdir(path.join(root, output));

  const safe = {left: input.canvas.safeAreaPx.left, top: input.canvas.safeAreaPx.top,
    right: input.canvas.width - input.canvas.safeAreaPx.right,
    bottom: input.canvas.height - input.canvas.safeAreaPx.bottom};
  const canvas = {left: 0, top: 0, right: input.canvas.width, bottom: input.canvas.height};
  const inspect = (candidate: Json): Json => {
    const result = inspectPresentationRenderLayoutV001(candidate);
    const rows = candidate.overlays.map((overlay: Json, index: number) => {
      const item = result.items[index];
      const exact = buildExactTextModel(overlay);
      assert.equal(item.instructionId, overlay.instructionId);
      assert.deepEqual(item.wrapper, {top: exact.wrapper.top, left: exact.wrapper.left,
        width: exact.wrapper.width, height: exact.wrapper.height});
      const logicalWidths = overlay.indexedLines.map((line: Json) =>
        Array.from(line.renderedText as string).reduce((sum, ch) => sum + getCharWeight(ch), 0));
      const violations = result.violations.filter(v => v.instructionId === overlay.instructionId);
      const pairs = [];
      for (let a = 0; a < item.lineRects.length; a += 1) {
        for (let b = a + 1; b < item.lineRects.length; b += 1) {
          const x = item.lineRects[a]; const y = item.lineRects[b];
          const width = Math.min(x.right, y.right) - Math.max(x.left, y.left);
          const height = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
          pairs.push({leftLineIndex: a, rightLineIndex: b, width, height, positive: width > 0 && height > 0});
        }
      }
      const wrapperBounds = bounds(item.wrapper);
      return {captionNumber: index + 1, instructionId: item.instructionId, text: overlay.text,
        lines: overlay.indexedLines.map((line: Json) => line.renderedText), logicalWidths,
        logicalWidthLimit: overlay.visualState.layout.maxCharsPerLine,
        logicalWidthPassed: logicalWidths.every((n: number) => n <= overlay.visualState.layout.maxCharsPerLine),
        wrapper: item.wrapper, wrapperBounds, lineRects: item.lineRects, safeArea: safe,
        safeAreaInsets: input.canvas.safeAreaPx, canvasBounds: canvas,
        fontSize: exact.textModel.fontSize, borderWidth: exact.textModel.borderWidth,
        glowWidth: exact.textModel.glowWidth, safePadding: exact.textModel.safePadding,
        borderStrokeWidth: exact.textModel.borderStrokeWidth, glowStrokeWidth: exact.textModel.glowStrokeWidth,
        strokeMargin: exact.textModel.margin, lineHeight: exact.textModel.lineHeight,
        measuredLineWidths: exact.textModel.lines.map(line => line.width),
        lineCount: item.lineCount, lineCountLimit: overlay.visualState.layout.maxLines,
        lineCountUnchanged: item.lineCount === input.overlays[index].indexedLines.length,
        lineIntersections: pairs, wrapperOutsideCanvas: outside(wrapperBounds, canvas),
        linesOutsideCanvas: item.lineRects.map(r => outside(r, canvas)),
        safeAreaViolation: violations.some(v => v.code === 'LAYOUT_SAFE_AREA_VIOLATION'), violations};
    });
    const count = (code: string) => result.violations.filter(v => v.code === code).length;
    return {result, rows, summary: {fontSize: candidate.overlays[0].visualState.textStyle.fontSizePx,
      captions: rows.length, status: result.status, safeAreaViolations: count('LAYOUT_SAFE_AREA_VIOLATION'),
      positiveLineIntersections: count('LAYOUT_LINE_POSITIVE_INTERSECTION'),
      lineCountViolations: count('LAYOUT_LINE_COUNT_EXCEEDED'),
      otherLayoutViolations: result.violations.filter(v => !['LAYOUT_SAFE_AREA_VIOLATION',
        'LAYOUT_LINE_POSITIVE_INTERSECTION', 'LAYOUT_LINE_COUNT_EXCEEDED'].includes(v.code)).length,
      canvasBoundsViolations: rows.filter((r: Json) => r.wrapperOutsideCanvas || r.linesOutsideCanvas.some(Boolean)).length,
      changedLineCounts: rows.filter((r: Json) => !r.lineCountUnchanged).length}};
  };

  const baseline = inspect(input);
  assert.deepEqual(baseline.result, saved);
  const bad = baseline.rows.filter((r: Json) => r.safeAreaViolation);
  const uniform = bad.length === 23 && baseline.rows.every((r: Json) => r.logicalWidthPassed)
    && baseline.result.violations.length === 23
    && baseline.rows.every((r: Json) => r.fontSize === 96 && r.borderWidth === 8 && r.glowWidth === 12 && r.safePadding === 4)
    && bad.every((r: Json) => Math.max(...r.logicalWidths) === 36 && r.wrapper.width === 1776
      && r.wrapperBounds.left === safe.left && r.wrapperBounds.right === safe.right + 16
      && r.wrapperBounds.top >= safe.top && r.wrapperBounds.bottom <= safe.bottom
      && r.lineRects.every((b: Json) => b.left >= safe.left && b.top >= safe.top && b.bottom <= safe.bottom))
    && baseline.summary.positiveLineIntersections === 0 && baseline.summary.lineCountViolations === 0
    && baseline.summary.canvasBoundsViolations === 0;
  const baselineBinding = await save('font-96-layout.json', baseline);
  const causeBinding = await save('cause-check.json', {status: uniform ? 'uniform-cause-confirmed' : 'stopped-mixed-or-unexpected-cause',
    savedResultReproducedExactly: true, measuredCaptions: 325, violatingCaptions: bad.length,
    safeWidth: safe.right - safe.left, formulaFromExistingModel: 'maxLineWidth + 2 * strokeMargin + 2 * safePadding',
    baselineMaximumLineWidth: Math.max(...bad.flatMap((r: Json) => r.measuredLineWidths)),
    sameCauseForAllViolations: uniform, affectedCaptions: bad.map((r: Json) => r.captionNumber), baselineBinding});
  assert(uniform, '混在または想定外原因のため診断2を開始しない');
  process.stdout.write('診断1: 保存結果325件完全一致、23件すべて同一の幅超過。\n');

  const originalBad = new Set(bad.map((r: Json) => r.instructionId));
  const candidates: Json[] = [{...baseline.summary, binding: baselineBinding}];
  let selected: Json = null;
  const minimum = Math.max(...input.overlays.map((o: Json) => o.layoutRules.minimumFontSizePx));
  for (let fontSize = 95; fontSize >= minimum; fontSize -= 1) {
    const candidate = structuredClone(input);
    for (const overlay of candidate.overlays) {
      assert.equal(overlay.visualState.stateId, 'caption-core-v001');
      overlay.visualState.textStyle.fontSizePx = fontSize;
    }
    const reverted = structuredClone(candidate);
    for (const overlay of reverted.overlays) overlay.visualState.textStyle.fontSizePx = 96;
    assert.deepEqual(reverted, input, '文字サイズ以外の差分を拒否');
    const observed = inspect(candidate);
    observed.summary.original23Resolved = observed.rows.filter((r: Json) => originalBad.has(r.instructionId) && r.violations.length === 0).length;
    observed.summary.original302NewViolations = observed.rows.filter((r: Json) => !originalBad.has(r.instructionId) && r.violations.length > 0).length;
    const binding = await save(`font-${fontSize}-layout.json`, observed);
    candidates.push({...observed.summary, binding});
    if (observed.result.status === 'passed' && observed.summary.canvasBoundsViolations === 0 && observed.summary.changedLineCounts === 0) {
      selected = {fontSize, differenceFromCurrentPx: fontSize - 96, ...observed.summary};
      break;
    }
  }
  const immutableFiles = [];
  for (const [p, expected] of frozen) {
    const actual = await fileSha(p);
    assert.equal(actual, expected, `診断前後で不変: ${p}`);
    immutableFiles.push({path: p, fileSha256: actual});
  }
  assert.deepEqual(input, await read(`${scratch}/layout-input.json`));
  const source = path.relative(root, fileURLToPath(import.meta.url));
  await save('summary.json', {schemaVersion: 'digest-v1-phase2-physical-fit-probe-v001',
    status: selected ? 'maximum-safe-integer-found' : 'stopped-no-safe-integer-within-existing-minimum',
    diagnosticOnly: true, measurementEnvironment: 'Node; document undefined; existing inspector and existing text metric calculation',
    causeBinding, candidates, selected, maximality: '96から1pxずつ降順。最初の全件合格で停止。上位の整数候補はすべて検査済み。',
    unchangedExceptMemoryFontSize: true, immutableFiles, implementation: {path: source, fileSha256: await fileSha(source)},
    newMeaningJudgments: 0, newAcousticObservations: 0, apiCalls: 0, newMaterials: 0, costUsd: 0,
    rendererExecutions: 0, styleRegistryWrites: 0, publishedArtifacts: 0,
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write(`${JSON.stringify({selected, candidates: candidates.map(({binding, ...rest}) => rest)}, null, 2)}\n`);
};
main().catch(error => {process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;});

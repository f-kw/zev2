import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationRenderApplicationResultsV002}
  from '../../../../../render_presentation_v002.mjs';
import {inspectOverlayPngWithToolV001, evaluatePresentationRendererQcV002}
  from '../../../../../presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001}
  from '../../../../../presentation_renderer_process_observation_v001.mjs';

const root = process.cwd();
const styleRoot = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001';
const dir = `${styleRoot}/raster-diagnosis-v001`;
const target = `${dir}/raster-probe-v001`;
const absolute = (p: string) => path.resolve(root, p);
const read = async (p: string) => JSON.parse(await readFile(absolute(p), 'utf8'));
const sha = async (p: string) => createHash('sha256').update(await readFile(absolute(p))).digest('hex');
const bind = async (p: string) => ({path: p, fileSha256: await sha(p)});
const save = async (p: string, value: unknown) => {
  await writeFile(absolute(p), `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'}); return bind(p);
};
const require = createRequire(import.meta.url);
const {inspectPresentationRenderLayoutV001} = require(absolute('evals/clip_composition/inspect_presentation_render_layout_v001.ts'));
const a = await read(`${dir}/measurement.json`);
const svg = await read(`${dir}/svg-measurement.json`);
assert.equal(a.status, 'measured'); assert.equal(svg.status, 'measured');
assert.equal(a.browser.trustedFontCheck, true); assert.equal(a.browser.actualCaptionFontCheck, true);
assert.equal(svg.result.fontCheck, true);
assert(a.browser.measured.width > a.node.measured.width);
assert(svg.result.texts.every((v: any) => v.computedTextLength > a.node.measured.width
  && v.computedStyle.fontFamily === a.node.fontFamily
  && v.computedStyle.fontWeight === String(a.node.fontWeight)
  && v.computedStyle.fontSize === '95px'
  && v.computedStyle.letterSpacing === 'normal' && v.computedStyle.transform === 'none'));
const originalProps = await read(a.propsBinding.path);
assert.equal(await sha(a.propsBinding.path), a.propsBinding.fileSha256);
assert.equal(originalProps.visualState.textStyle.fontSizePx, 95);
const stop = await read(`${styleRoot}/raster-stop-v001.json`);
for (const b of [...stop.immutableBindingsAfterStop, stop.styleBinding, stop.planBinding, stop.failureBinding]) {
  assert.equal(await sha(b.path), b.fileSha256, b.path);
}
const job = await read('evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json');
const runtime = (await read(job.request.rendererTemplate.path)).runtimeBindings;
const sourcePlan = await read(stop.planBinding.path);
const sourceElement = sourcePlan.elements.find((e: any) => e.instructionId === originalProps.instructionId);
const media = (await read(stop.failureBinding.path)).result.failure.nested.mediaEvidence;
await mkdir(absolute(target)); await mkdir(absolute(`${target}/overlays`));
const observer = createPresentationRendererProcessObserverV001({observationDirectory: absolute(`${target}/process-observations`)});
const adapter = buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path, chromiumPath: runtime.chromium.path, processObserver: observer});
const probes = [];
for (let size = 94; size >= originalProps.layoutRules.minimumFontSizePx; size -= 1) {
  const props = structuredClone(originalProps); props.visualState.textStyle.fontSizePx = size;
  const restored = structuredClone(props); restored.visualState.textStyle.fontSizePx = 95;
  assert.deepEqual(restored, originalProps);
  const element = structuredClone(sourceElement); element.visualState.textStyle.fontSizePx = size;
  const plan = {...sourcePlan, elements: [element]};
  const propsBinding = await save(`${target}/font-${size}-props.json`, props);
  const png = `${target}/overlays/font-${size}.png`;
  const linePng = `${target}/font-${size}-line-01.png`;
  await adapter.renderStill(props, absolute(png));
  await adapter.renderLineMask(props, 0, absolute(linePng));
  const line = await inspectOverlayPngWithToolV001({instructionId: props.instructionId, pngPath: absolute(linePng),
    imageMagickPath: runtime.imageMagick.path, processObserver: observer, observationLabelPrefix: `probe-${size}-line`});
  assert(line.alphaBounds);
  const layout = inspectPresentationRenderLayoutV001({canvas: props.canvas, overlays: [props]});
  const records = [{element, props, pngPath: absolute(png), pngSha256: await sha(png)}];
  const applicationResults = buildPresentationRenderApplicationResultsV002(records);
  const applied = applicationResults[0];
  const inspection = await inspectOverlayPngWithToolV001({instructionId: props.instructionId, pngPath: absolute(png),
    imageMagickPath: runtime.imageMagick.path, processObserver: observer, observationLabelPrefix: `probe-${size}-full`,
    lineRects: layout.items[0].lineRects, lineAlphaBounds: [{lineIndex: 0, ...line.alphaBounds}],
    appliedOverlayPropsCanonicalSha256: applied.appliedOverlayPropsCanonicalSha256,
    overlayFile: applied.overlayFile, overlaySha256: applied.overlaySha256});
  const qc = evaluatePresentationRendererQcV002({plan, applicationResults, overlayInspections: [inspection],
    mediaInspection: media.observed, expectedAudio: media.expectedAudio, canvas: props.canvas, requireFinalVisibility: false});
  const observation = {fontSizePx: size, propsBinding, pngBinding: await bind(png), linePngBinding: await bind(linePng),
    layout, inspection, qc, diagnosticOnly: true};
  const resultBinding = await save(`${target}/font-${size}-result.json`, observation);
  probes.push({fontSizePx: size, status: qc.status, bounds: inspection.alphaBounds, resultBinding});
  console.log(JSON.stringify(probes.at(-1)));
  if (qc.status === 'passed') break;
  assert(qc.violations.every((v: any) => v.code === 'LAYOUT_SAFE_AREA_VIOLATION'), 'unexpected isolated probe failure');
}
for (const b of [...stop.immutableBindingsAfterStop, stop.styleBinding, stop.planBinding, stop.failureBinding]) {
  assert.equal(await sha(b.path), b.fileSha256, b.path);
}
const summary = {schemaVersion: 'digest-v1-phase2-isolated-raster-probe-v001',
  status: probes.at(-1)?.status === 'passed' ? 'maximum-safe-integer-found' : 'no-safe-integer-found',
  diagnosticOnly: true, captionId: originalProps.instructionId,
  diagnosisDecisionBinding: await bind(`${styleRoot}/diagnosis-decision-v001.json`),
  causeMeasurementBinding: await bind(`${dir}/measurement.json`), svgMeasurementBinding: await bind(`${dir}/svg-measurement.json`),
  existing95RasterFailureBinding: stop.failureBinding, sourceFormalStyleBinding: stop.styleBinding,
  implementationBinding: await bind(`${dir}/isolated-probe.mts`), probes, selectedFontSizePx: probes.at(-1)?.status === 'passed' ? probes.at(-1).fontSizePx : null,
  maximality: '95pxの既存実画像不合格を上限根拠にし、94pxから1pxずつ降順に同じ字幕だけを描画。既存QCの最初のPASSで停止。',
  operations: {isolatedProbeSizes: probes.length, fullCaptionDraws: 0, videoComposites: 0, formalStyleChanges: 0,
    newMeaningJudgments: 0, newAcousticObservations: 0, apiCalls: 0, newMaterials: 0, costUsd: 0},
  humanQuality: 'not-evaluated', completionApproval: 'not-claimed'};
await save(`${target}/summary.json`, summary);

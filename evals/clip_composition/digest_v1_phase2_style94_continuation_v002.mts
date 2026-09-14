import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, formal, readJson, readBound, publish, same, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {loadPhase2BridgeContext, validatePhase2Bridge, inspectPhase2BridgeRenderer} from './digest_v1_phase2_caption_bridge.mts';
import {validatePhase295Style, validatePhase295Plan} from './digest_v1_phase2_style95.mts';
import {validatePhase294Style, validatePhase294Plan} from './digest_v1_phase2_style94.mts';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {evaluatePresentationRendererQcWithProfileV001} from './presentation_renderer_qc_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

const require = createRequire(import.meta.url);
const {inspectPresentationRenderLayoutV001} = require('./inspect_presentation_render_layout_v001.ts');
const sourcePath = 'evals/clip_composition/digest_v1_phase2_style94_continuation_v002.mts';
const styleRoot = (c: Json, name: string) => out(c, `style-94-v001/${name}`);
const runRoot = (c: Json, name: string) => styleRoot(c, `continuation-v002/${name}`);
const equal = (a: any, b: any, reason: string) => assert(same(a, b), reason);
const byteBinding = async (p: string) => ({path: p, fileSha256: await fileSha(path.resolve(ROOT, p))});
const checkBytes = async (b: Json) => assert.equal((await byteBinding(b.path)).fileSha256, b.fileSha256, b.path);
const readEvidence = (p: string) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

/** 一致確認に届かなければbindingを返さない。既存publish()と同じBuffer照合。 */
export function readBackQcSnapshotV002(p: string, record: Json) {
  const expected = formal(record);
  assert(Buffer.isBuffer(expected), 'FORMAL_SERIALIZER_MUST_RETURN_BUFFER');
  const observed = readFileSync(path.join(ROOT, p));
  assert(observed.equals(expected), 'QC_PUBLICATION_BYTES_MISMATCH');
  return bind(p, record);
}

/** 同期renderer callback内で使用する保存処理。旧snapshotを上書きしない。 */
export function publishQcSnapshotV002(p: string, record: Json) {
  writeFileSync(path.join(ROOT, p), formal(record), {flag: 'wx'});
  return readBackQcSnapshotV002(p, record);
}

async function context(job: string) {
  const c = await loadPhase2BridgeContext(job);
  const decisionPath = styleRoot(c, 'continuation-decision-v002.json');
  const decision = readEvidence(decisionPath);
  assert.equal(decision.decision, 'PASS / LIMITED FIX / FULL REDRAW');
  assert.equal(decision.reuseOldImages, false);
  assert.equal(decision.renderAttempts, 1);
  assert.equal(decision.rendererOutputRoot, styleRoot(c, 'render-v002'));
  assert.equal(decision.publicationStopBinding.fileSha256,
    '1eaad6b511d31c5bab0fef6986d43dcf702e91ea1a5dbb094aad043aa6c80626');
  await checkBytes(decision.publicationStopBinding);
  const stop = readEvidence(decision.publicationStopBinding.path);
  for (const b of [stop.failureBinding, stop.rasterQcBinding, stop.readbackDiagnosisBinding,
    stop.preflightBinding, stop.testsBinding, stop.drawStartBinding, stop.implementationBinding]) await checkBytes(b);
  const previous = await readJson(stop.preflightBinding.path);
  const oldTests = await readJson(stop.testsBinding.path);
  assert.equal(previous.status, 'passed');
  assert.equal(oldTests.status, 'passed');
  assert(oldTests.cases.every((t: Json) => t.status === 'passed'));
  await checkBytes(previous.implementationBinding);
  await checkBytes(oldTests.testImplementationBinding);
  equal(oldTests.implementationBinding, previous.implementationBinding, 'OLD_TEST_IMPLEMENTATION_CHANGED');
  equal(oldTests.styleBinding, previous.styleBinding, 'OLD_TEST_STYLE_CHANGED');
  equal(oldTests.layoutBinding, previous.layoutBinding, 'OLD_TEST_LAYOUT_CHANGED');
  const bridge = await readBound(previous.bridgeBinding);
  validatePhase2Bridge(bridge, c);
  const originalAdmission = await readJson(out(c, 'caption-bridge-admission-v001.json'));
  equal(await inspectPhase2BridgeRenderer(c, bridge, originalAdmission.mediaInspection), originalAdmission, 'ORIGINAL_ADMISSION_CHANGED');
  const parentPreflight = await readBound(previous.parentPreflightBinding);
  await checkBytes(parentPreflight.implementationBinding);
  const parentStyle = await readBound(parentPreflight.styleBinding);
  validatePhase295Style(c.style, parentStyle, c.styleProfileId);
  const parentPlan = await readBound(parentPreflight.planBinding);
  validatePhase295Plan(await readJson(out(c, 'caption-bridge-common-plan-v001.json')), parentPlan);
  const style = await readBound(previous.styleBinding);
  validatePhase294Style(parentStyle, style, c.styleProfileId);
  const plan = await readBound(previous.planBinding);
  validatePhase294Plan(parentPlan, plan);
  const derivation = await readBound(previous.derivationBinding);
  equal(derivation.parentStyleBinding, parentPreflight.styleBinding, 'PARENT_STYLE_CHANGED');
  equal(derivation.ancestorStyleBinding, bridge.registryBindings.styleProfileRegistry, 'ANCESTOR_STYLE_CHANGED');
  equal(derivation.derivedStyleBinding, previous.styleBinding, 'STYLE_DERIVATION_CHANGED');
  equal(derivation.applicationDecisionBinding, previous.decisionBinding, 'STYLE_DECISION_CHANGED');
  await readBound(previous.decisionBinding);
  const admission = await readBound(previous.admissionBinding);
  equal(admission.derivedStyleBinding, previous.styleBinding, 'STYLE_ADMISSION_CHANGED');
  equal(admission.semanticProvenance, bridge.semanticProvenance, 'SEMANTIC_PROVENANCE_CHANGED');
  const runtime = c.rendererTemplate.runtimeBindings;
  const verifiedRuntime = new Map(Object.values(runtime).map((b: any) => [b.path, b.fileSha256]));
  for (const b of stop.immutableBindingsAfterStop) {
    if (verifiedRuntime.has(b.path)) assert.equal(b.fileSha256, verifiedRuntime.get(b.path), 'RUNTIME_CHANGED');
    else await checkBytes(b);
  }
  // 保持画像は照合だけ。新しいrendererへコピー・再利用しない。
  for (const item of stop.renderedImageBindings) {
    for (const b of [item.imageBinding, item.repeatBinding, ...item.lineMaskBindings]) await checkBytes(b);
  }
  const raster = await readJson(stop.rasterQcBinding.path);
  assert.equal(raster.qc.status, 'passed');
  assert.equal(raster.qc.instructionCount, 325);
  assert.equal(raster.qc.instructionEvidence.length, 325);
  assert.deepEqual(raster.qc.violations, []);
  equal(raster.styleBinding, previous.styleBinding, 'OLD_RASTER_STYLE_CHANGED');
  equal(raster.planBinding, previous.planBinding, 'OLD_RASTER_PLAN_CHANGED');
  const common = buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: bridge.executionInputs},
    visualStateId: bridge.executionInputs.visualStateId, instructionArtifact: bridge.instructionArtifact,
    lineLayout: bridge.lineLayout, styleProfileRegistry: style, rendererTrust: c.trust});
  assert.equal(common.status, 'built');
  equal(common.plan, plan, 'COMMON_PLAN_CHANGED');
  const adapter = buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
    chromiumPath: runtime.chromium.path, processObserver: {run: () => {throw new Error('PREFLIGHT_MUST_NOT_RENDER');}}});
  const layoutInput = {canvas: plan.canvas, overlays: plan.elements.map((e: Json) => adapter.buildProps(e, plan, style))};
  const originalInput = await readBound(previous.layoutInputBinding);
  equal(layoutInput, {canvas: originalInput.canvas, overlays: originalInput.overlays}, 'LAYOUT_INPUT_CHANGED');
  const layout = inspectPresentationRenderLayoutV001(layoutInput);
  assert.equal(layout.status, 'passed');
  assert.equal(layout.items.length, 325);
  assert.deepEqual(layout.violations, []);
  equal(layout, await readBound(previous.layoutBinding), 'NODE_LAYOUT_CHANGED');
  return {...c, previous, bridge, style, renderPlan: plan, layout, stop, decision, originalAdmission,
    previousPreflightBinding: bind(stop.preflightBinding.path, previous),
    previousRasterBinding: bind(stop.rasterQcBinding.path, raster),
    decisionBinding: await byteBinding(decisionPath), stopBinding: decision.publicationStopBinding};
}

async function prepare(job: string) {
  const c = await context(job);
  await requireAbsent(runRoot(c, ''));
  await requireAbsent(c.decision.rendererOutputRoot);
  const layoutBinding = await publish(runRoot(c, 'layout-result.json'), c.layout);
  await publish(runRoot(c, 'preflight.json'), {schemaVersion: 'digest-v1-phase2-style94-continuation-preflight-v002',
    status: 'passed', implementationBinding: await byteBinding(sourcePath), decisionBinding: c.decisionBinding,
    previousPreflightBinding: c.previousPreflightBinding, previousRasterBinding: c.previousRasterBinding,
    publicationStopBinding: c.stopBinding, styleBinding: c.previous.styleBinding, derivationBinding: c.previous.derivationBinding,
    planBinding: c.previous.planBinding, bridgeBinding: c.previous.bridgeBinding, layoutBinding,
    rendererOutputRoot: c.decision.rendererOutputRoot, oldImages: 'retained-and-hash-verified; not-reused',
    checks: {layout325: 'passed', previous325RasterQc: 'passed', allBindings: 'unchanged', style: 'unchanged',
      captions: 'unchanged', commonPlan: 'unchanged', baseMedia: 'unchanged'}, rendererStarted: false});
  process.stdout.write('94px継続v002: 全入力不変・配置325/325 PASS。実描画未開始。\n');
}

async function draw(job: string) {
  const c = await context(job);
  const preflightPath = runRoot(c, 'preflight.json');
  const preflight = await readJson(preflightPath);
  assert.equal(preflight.status, 'passed');
  await checkBytes(preflight.implementationBinding);
  equal(preflight.previousPreflightBinding, c.previousPreflightBinding, 'OLD_PREFLIGHT_CHANGED');
  equal(preflight.previousRasterBinding, c.previousRasterBinding, 'OLD_RASTER_CHANGED');
  equal(preflight.publicationStopBinding, c.stopBinding, 'STOP_CHANGED');
  equal(preflight.decisionBinding, c.decisionBinding, 'CONTINUATION_DECISION_CHANGED');
  equal(preflight.rendererOutputRoot, c.decision.rendererOutputRoot, 'CONTINUATION_OUTPUT_CHANGED');
  equal(await readBound(preflight.layoutBinding), c.layout, 'PREFLIGHT_LAYOUT_CHANGED');
  const testsPath = runRoot(c, 'tests.json');
  const tests = await readJson(testsPath);
  assert.equal(tests.status, 'passed');
  assert(tests.cases.length >= 6 && tests.cases.every((t: Json) => t.status === 'passed'));
  await checkBytes(tests.testImplementationBinding);
  equal(tests.implementationBinding, preflight.implementationBinding, 'TEST_IMPLEMENTATION_CHANGED');
  equal(tests.preflightBinding, bind(preflightPath, preflight), 'TEST_PREFLIGHT_CHANGED');
  equal(tests.previousRasterBinding, c.previousRasterBinding, 'TEST_QC_CHANGED');
  await requireAbsent(preflight.rendererOutputRoot);
  for (const n of ['draw-start.json', 'raster-qc.json', 'final-qc.json', 'renderer-result.json', 'verification.json']) await requireAbsent(runRoot(c, n));
  const startBinding = await publish(runRoot(c, 'draw-start.json'), {
    schemaVersion: 'digest-v1-phase2-style94-continuation-start-v002', preflightBinding: bind(preflightPath, preflight),
    testsBinding: bind(testsPath, tests), rendererOutputRoot: preflight.rendererOutputRoot,
    newFullRedrawAttempts: 1, oldImagesReused: false, oldArtifactsRetained: true});
  const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(ROOT, runRoot(c, 'process-observations'))});
  const runtime = c.rendererTemplate.runtimeBindings;
  let rasterQcBinding: Json | null = null;
  let finalQcBinding: Json | null = null;
  process.stdout.write('94px継続v002: 同じ325字幕を未使用先へ全再描画開始。\n');
  const result = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(ROOT, preflight.rendererOutputRoot),
    plan: c.renderPlan, presetRegistry: c.style, baseMediaPath: path.join(ROOT, c.base.baseMedia.path),
    baseMediaInspection: {media: c.originalAdmission.mediaInspection}, expectedFrameCount: c.timeline.baseMedia.expectedFrameCount,
    evaluateQc: (input: Json) => {
      const qc = evaluatePresentationRendererQcWithProfileV001(input, {
        schemaVersion: 'presentation-render-qc-v002', planFile: 'presentation-render-plan-v002.json'});
      const isRaster = input.requireFinalVisibility === false;
      const record = {schemaVersion: isRaster ? 'digest-v1-phase2-style94-raster-qc-v002' : 'digest-v1-phase2-style94-final-qc-v002',
        status: qc.status, styleBinding: c.previous.styleBinding, planBinding: c.previous.planBinding,
        derivationBinding: c.previous.derivationBinding, preflightBinding: bind(preflightPath, preflight), qc};
      const binding = publishQcSnapshotV002(runRoot(c, isRaster ? 'raster-qc.json' : 'final-qc.json'), record);
      if (isRaster) rasterQcBinding = binding; else finalQcBinding = binding;
      process.stdout.write(`94px継続v002: ${isRaster ? '実画像' : '最終'}QC ${qc.status}・保存後byte一致。\n`);
      return qc;
    },
    toolPaths: {ffmpegPath: runtime.ffmpeg.path, ffprobePath: runtime.ffprobe.path, imageMagickPath: runtime.imageMagick.path,
      tsxPath: runtime.tsx.path, layoutInspectorPath: path.join(ROOT, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')},
    overlayAdapter: buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
      chromiumPath: runtime.chromium.path, processObserver}), processObserver});
  if (result.exitCode !== 0 || result.finalQc?.status !== 'passed') {
    await publish(runRoot(c, 'renderer-result.json'), {schemaVersion: 'digest-v1-phase2-style94-continuation-result-v002',
      status: 'failed', startBinding, rasterQcBinding, finalQcBinding, exitCode: result.exitCode, result,
      fatalProcessEvidence: result.presentationFatalProcessEvidence ?? null});
    throw new Error('PHASE2_STYLE94_CONTINUATION_RENDER_OR_QC_FAILED');
  }
  assert(rasterQcBinding && finalQcBinding, 'BOTH_QC_GATES_MUST_BE_SAVED');
  const raster = await readBound(rasterQcBinding);
  assert.equal(raster.qc.status, 'passed');
  assert.equal(raster.qc.instructionCount, 325);
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: result.stagingDirectory,
    outputDirectory: result.outputDirectory, reservation: result.reservation});
  const video = await byteBinding(`${preflight.rendererOutputRoot}/presentation-rendered-v002.mp4`);
  const executionBinding = await publish(runRoot(c, 'renderer-result.json'), {
    schemaVersion: 'digest-v1-phase2-style94-continuation-result-v002', status: 'completed', startBinding,
    styleBinding: c.previous.styleBinding, planBinding: c.previous.planBinding, rasterQcBinding, finalQcBinding,
    exitCode: 0, publication, video, qc: result.finalQc});
  await publish(runRoot(c, 'verification.json'), {schemaVersion: 'digest-v1-phase2-style94-continuation-verification-v002',
    status: 'technical-checkpoint', jobBinding: c.planBinding, styleBinding: c.previous.styleBinding,
    derivationBinding: c.previous.derivationBinding, bridgeBinding: c.previous.bridgeBinding,
    semanticProvenance: c.bridge.semanticProvenance, planBinding: c.previous.planBinding, layoutBinding: preflight.layoutBinding,
    renderer: {executionBinding, video, rasterQcBinding, finalQcBinding, qc: 'passed'}, baseMediaBinding: c.base.baseMedia,
    counts: {prospects: c.candidateSet.candidates.length, retainedRanges: c.adoption.segments.length,
      captions: c.timing.cues.length, atoms: c.text.textInput.atomOccurrences.length},
    frameCount: c.timeline.baseMedia.expectedFrameCount, durationSeconds: c.timeline.baseMedia.expectedFrameCount / c.renderPlan.canvas.fps,
    operations: {fullRedrawAttempts: 1, oldImagesReused: 0, newMeaningJudgments: 0, newAcousticObservations: 0,
      apiCalls: 0, newMaterials: 0, costUsd: 0}, humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write(`94px継続v002: 完成MP4・最終QC PASS。${JSON.stringify(video)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  assert(['prepare', 'draw'].includes(mode) && job, 'usage: style94_continuation_v002.mts prepare|draw <job>');
  (mode === 'prepare' ? prepare(job) : draw(job)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;
  });
}

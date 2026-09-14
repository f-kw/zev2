import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {writeFileSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, formal, readJson, readBound, publish, same, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {loadPhase2BridgeContext, validatePhase2Bridge, inspectPhase2BridgeRenderer} from './digest_v1_phase2_caption_bridge.mts';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {evaluatePresentationRendererQcWithProfileV001} from './presentation_renderer_qc_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

import {validatePhase295Style, validatePhase295Plan} from './digest_v1_phase2_style95.mts';

const require = createRequire(import.meta.url);
const {inspectPresentationRenderLayoutV001} = require('./inspect_presentation_render_layout_v001.ts');
const sourcePath = 'evals/clip_composition/digest_v1_phase2_style94.mts';
const styleRoot = (c: Json, name: string) => out(c, `style-94-v001/${name}`);
const equal = (a: any, b: any, reason: string) => assert(same(a, b), reason);
const byteBinding = async (p: string) => ({path: p, fileSha256: await fileSha(path.resolve(ROOT, p))});
const checkBytes = async (b: Json) => assert.equal((await byteBinding(b.path)).fileSha256, b.fileSha256, b.path);
const readEvidence = async (p: string) => JSON.parse(await readFile(path.resolve(ROOT, p), 'utf8'));


export function derivePhase294Style(parent: Json, profileId: string) {
  const derived = structuredClone(parent);
  const profiles = derived.presets.filter((p: Json) => p.presetId === profileId);
  assert.equal(profiles.length, 1);
  const states = profiles[0].visualStates.filter((s: Json) => s.stateId === 'caption-core-v001');
  assert.equal(states.length, 1);
  assert.equal(states[0].textStyle.fontSizePx, 95);
  states[0].textStyle.fontSizePx = 94;
  return derived;
}

export function validatePhase294Style(parent: Json, derived: Json, profileId: string) {
  equal(derived, derivePhase294Style(parent, profileId), 'ONLY_APPROVED_FONT_SIZE_CHANGE_IS_ALLOWED');
}

export function validatePhase294Plan(original: Json, changed: Json) {
  const reverted = structuredClone(changed);
  assert.equal(reverted.elements.length, 325);
  for (const element of reverted.elements) {
    assert.equal(element.kind, 'speech-caption');
    assert.equal(element.visualState.stateId, 'caption-core-v001');
    assert.equal(element.visualState.textStyle.fontSizePx, 94);
    element.visualState.textStyle.fontSizePx = 95;
  }
  equal(reverted, original, 'COMMON_PLAN_CHANGED_OUTSIDE_FONT_SIZE');
}

async function context(job: string) {
  const c = await loadPhase2BridgeContext(job);
  const previousPreflight = await readJson(out(c, 'caption-bridge-preflight-v001.json'));
  assert.equal(previousPreflight.status, 'passed');
  await checkBytes(previousPreflight.implementationBinding);
  const originalTests = await readBound(previousPreflight.negativeTestsBinding);
  assert.equal(originalTests.status, 'passed');
  assert(originalTests.cases.every((t: Json) => t.status === 'passed'));
  await checkBytes(originalTests.testImplementationBinding);
  const bridge = await readBound(previousPreflight.bridgeBinding);
  validatePhase2Bridge(bridge, c);
  equal(originalTests.bridgeBinding, previousPreflight.bridgeBinding, 'BRIDGE_TEST_BINDING_CHANGED');
  const oldAdmission = await readJson(out(c, 'caption-bridge-admission-v001.json'));
  equal(await inspectPhase2BridgeRenderer(c, bridge, oldAdmission.mediaInspection), oldAdmission, 'ORIGINAL_ADMISSION_CHANGED');
  const originalPlan = await readJson(out(c, 'caption-bridge-common-plan-v001.json'));
  const rebuilt = buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: bridge.executionInputs},
    visualStateId: bridge.executionInputs.visualStateId, instructionArtifact: bridge.instructionArtifact,
    lineLayout: bridge.lineLayout, styleProfileRegistry: c.style, rendererTrust: c.trust});
  assert.equal(rebuilt.status, 'built');
  equal(rebuilt.plan, originalPlan, 'ORIGINAL_PLAN_CHANGED');
  const parentPreflightPath = out(c, 'style-95-v001/preflight.json');
  const parentPreflight = await readJson(parentPreflightPath);
  assert.equal(parentPreflight.status, 'passed');
  await checkBytes(parentPreflight.implementationBinding);
  const parentTestsPath = out(c, 'style-95-v001/tests.json');
  const parentTests = await readJson(parentTestsPath);
  assert.equal(parentTests.status, 'passed');
  assert(parentTests.cases.every((t: Json) => t.status === 'passed'));
  await checkBytes(parentTests.testImplementationBinding);
  equal(parentTests.implementationBinding, parentPreflight.implementationBinding, 'PARENT_TEST_IMPLEMENTATION_CHANGED');
  equal(parentTests.styleBinding, parentPreflight.styleBinding, 'PARENT_TEST_STYLE_CHANGED');
  equal(parentPreflight.bridgeBinding, previousPreflight.bridgeBinding, 'PARENT_BRIDGE_CHANGED');
  const parentStyle = await readBound(parentPreflight.styleBinding);
  validatePhase295Style(c.style, parentStyle, c.styleProfileId);
  const parentPlan = await readBound(parentPreflight.planBinding);
  validatePhase295Plan(originalPlan, parentPlan);
  const parentLayout = await readBound(parentPreflight.layoutInputBinding);
  const parentDerivation = await readBound(parentPreflight.derivationBinding);
  equal(parentDerivation.sourceStyleBinding, bridge.registryBindings.styleProfileRegistry, 'ANCESTOR_BINDING_CHANGED');
  equal(parentDerivation.derivedStyleBinding, parentPreflight.styleBinding, 'PARENT_DERIVATION_CHANGED');
  equal(parentDerivation.applicationDecisionBinding, parentPreflight.decisionBinding, 'PARENT_DECISION_BINDING_CHANGED');
  await readBound(parentPreflight.decisionBinding);
  await readBound(parentPreflight.layoutBinding);
  await readBound(parentPreflight.admissionBinding);
  const decisionPath = out(c, 'style94-application-decision-v001.json');
  const applicationDecision = await readEvidence(decisionPath);
  assert.equal(applicationDecision.decision, 'APPROVE / CONTINUE');
  assert.equal(applicationDecision.beforeFontSizePx, 95);
  assert.equal(applicationDecision.afterFontSizePx, 94);
  assert.equal(applicationDecision.rasterDiagnosisBinding.fileSha256,
    '9c33aad4caad6241247a8fafd5dc0113bd00d76e28c2800a349103e4ae6e3d20');
  await checkBytes(applicationDecision.rasterDiagnosisBinding);
  const diagnostic = await readEvidence(applicationDecision.rasterDiagnosisBinding.path);
  assert.equal(diagnostic.probe94.existingQc, 'passed');
  assert.equal(diagnostic.maxSafeIntegerForThisCaptionAtOrBelow95, 94);
  for (const b of [diagnostic.decisionBinding, diagnostic.metricMeasurementBinding, diagnostic.svgMeasurementBinding,
    diagnostic.isolatedProbeBinding, diagnostic.permissionResolutionBinding]) await checkBytes(b);
  const probe = await readEvidence(diagnostic.isolatedProbeBinding.path);
  equal(probe.sourceFormalStyleBinding, parentPreflight.styleBinding, 'PROBE_PARENT_STYLE_CHANGED');
  assert.equal(probe.selectedFontSizePx, 94);
  const probe94Binding = probe.probes.find((p: Json) => p.fontSizePx === 94).resultBinding;
  await checkBytes(probe94Binding);
  const probe94 = await readEvidence(probe94Binding.path);
  assert.equal(probe94.qc.status, 'passed');
  assert.equal(probe94.qc.instructionCount, 1);
  for (const b of [probe94.propsBinding, probe94.pngBinding, probe94.linePngBinding]) await checkBytes(b);
  const probe94Props = await readEvidence(probe94.propsBinding.path);
  const stopPath = out(c, 'style-95-v001/raster-stop-v001.json');
  const stop = await readEvidence(stopPath);
  await checkBytes(stop.failureBinding);
  // 実行toolのsymlinkは既存入場検査で照合済み。成果物用のsymlink不可検査を適用しない。
  const verifiedRuntime = new Map(Object.values(c.rendererTemplate.runtimeBindings).map((b: any) => [b.path, b.fileSha256]));
  for (const b of stop.immutableBindingsAfterStop) {
    if (verifiedRuntime.has(b.path)) assert.equal(b.fileSha256, verifiedRuntime.get(b.path), 'RUNTIME_CHANGED');
    else await checkBytes(b);
  }
  return {...c, bridge, bridgeBinding: previousPreflight.bridgeBinding, previousPreflight, oldAdmission,
    originalPlan, parentStyle, parentPlan, parentLayout, parentPreflight,
    parentPreflightBinding: bind(parentPreflightPath, parentPreflight), parentTestsBinding: bind(parentTestsPath, parentTests),
    diagnostic, diagnosticBinding: applicationDecision.rasterDiagnosisBinding, probe94Binding, probe94, probe94Props,
    applicationDecision, sourceDecisionBinding: await byteBinding(decisionPath), previousStopBinding: await byteBinding(stopPath)};
}

function build(c: Json, style: Json) {
  validatePhase294Style(c.parentStyle, style, c.styleProfileId);
  const common = buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: c.bridge.executionInputs},
    visualStateId: c.bridge.executionInputs.visualStateId, instructionArtifact: c.bridge.instructionArtifact,
    lineLayout: c.bridge.lineLayout, styleProfileRegistry: style, rendererTrust: c.trust});
  assert.equal(common.status, 'built');
  validatePhase294Plan(c.parentPlan, common.plan);
  // この段階ではadapterのprops生成だけを使う。runは呼ばれない。
  const observer = {run: () => {throw new Error('PREFLIGHT_MUST_NOT_RENDER');}};
  const runtime = c.rendererTemplate.runtimeBindings;
  const adapter = buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
    chromiumPath: runtime.chromium.path, processObserver: observer});
  const layoutInput = {canvas: common.plan.canvas,
    overlays: common.plan.elements.map((e: Json) => adapter.buildProps(e, common.plan, style))};
  const restoredInput = structuredClone(layoutInput);
  for (const overlay of restoredInput.overlays) overlay.visualState.textStyle.fontSizePx = 95;
  equal(restoredInput, {canvas: c.parentLayout.canvas, overlays: c.parentLayout.overlays}, 'LAYOUT_INPUT_CHANGED_OUTSIDE_FONT_SIZE');
  equal(layoutInput.overlays.find((o: Json) => o.instructionId === c.diagnostic.captionId), c.probe94Props, 'PROBE94_PROPS_CHANGED');
  const layout = inspectPresentationRenderLayoutV001(layoutInput);
  assert.equal(layout.status, 'passed');
  assert.equal(layout.items.length, 325);
  assert.equal(layout.violations.length, 0);
  return {plan: common.plan, layoutInput, layout};
}

async function prepare(job: string) {
  const c = await context(job);
  await requireAbsent(styleRoot(c, ''));
  const style = derivePhase294Style(c.parentStyle, c.styleProfileId);
  const built = build(c, style);
  const decisionBinding = await publish(styleRoot(c, 'application-decision.json'), c.applicationDecision);
  const styleBinding = await publish(styleRoot(c, 'preset-registry.json'), style);
  const derivationBinding = await publish(styleRoot(c, 'derivation.json'), {
    schemaVersion: 'digest-v1-phase2-style-derivation-v001', snapshotId: 'digest-v1-phase2-caption-94px-v001',
    parentStyleBinding: c.parentPreflight.styleBinding, ancestorStyleBinding: c.bridge.registryBindings.styleProfileRegistry,
    parentDerivationBinding: c.parentPreflight.derivationBinding, derivedStyleBinding: styleBinding,
    change: {presetId: c.styleProfileId, visualStateId: 'caption-core-v001', property: 'fontSizePx', before: 95, after: 94},
    rasterDiagnosticBinding: c.diagnosticBinding, caption282Probe94QcBinding: c.probe94Binding,
    applicationDecisionBinding: decisionBinding, sourceDecisionBinding: c.sourceDecisionBinding, previousStopBinding: c.previousStopBinding,
    sourceRendererTrustBinding: c.bridge.registryBindings.rendererTrust,
    sourceRendererTrustRole: 'unchanged-layout-rules-fonts-runtime-and-implementation; source-approved-preview-remains-96px',
    identityPolicy: 'versioned-snapshot-path-and-hash; retained-schema-and-preset-identifiers-do-not-reassign-source-style-bytes',
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  const planBinding = await publish(styleRoot(c, 'common-plan.json'), built.plan);
  const layoutInputBinding = await publish(styleRoot(c, 'layout-input.json'), {schemaVersion: 'digest-v1-phase2-style94-layout-input-v001', ...built.layoutInput});
  const layoutBinding = await publish(styleRoot(c, 'layout-result.json'), built.layout);
  const admissionBinding = await publish(styleRoot(c, 'application-admission.json'), {
    schemaVersion: 'digest-v1-phase2-approved-style-admission-v001', status: 'passed',
    originalAdmissionBinding: bind(out(c, 'caption-bridge-admission-v001.json'), c.oldAdmission),
    bridgeBinding: c.bridgeBinding, semanticProvenance: c.bridge.semanticProvenance,
    derivedStyleBinding: styleBinding, derivationBinding, applicationDecisionBinding: decisionBinding,
    planBinding, layoutBinding, baseMediaBinding: c.base.baseMedia,
    acceptanceBasis: 'unchanged-original-admission-plus-delegated-advisor-approved-one-field-style-derivation-and-all-caption-layout',
    source96PreviewReinterpretedAs94: false, parent95ReinterpretedAs94: false, oldRendererTrustRetargeted: false,
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  await publish(styleRoot(c, 'preflight.json'), {schemaVersion: 'digest-v1-phase2-style94-preflight-v001', status: 'passed',
    implementationBinding: await byteBinding(sourcePath), decisionBinding, styleBinding, derivationBinding,
    admissionBinding, bridgeBinding: c.bridgeBinding, planBinding, layoutInputBinding, layoutBinding,
    parentPreflightBinding: c.parentPreflightBinding, parentTestsBinding: c.parentTestsBinding,
    checks: {layout325: 'passed', actualRasterQc: 'not-started', caption282PropsMatchProbe: 'passed', bridgeBytes: 'unchanged',
      commonTextIdsLinesTiming: 'unchanged', baseMediaSha: 'unchanged', styleOnlyFontSizeChanged: 'passed'},
    rendererOutputRoot: styleRoot(c, 'render-v001'), rendererStarted: false,
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write('94px正式派生style: 325/325配置検査PASS。実画像QCは未開始。\n');
}

async function draw(job: string) {
  const c = await context(job);
  const preflight = await readJson(styleRoot(c, 'preflight.json'));
  assert.equal(preflight.status, 'passed');
  await checkBytes(preflight.implementationBinding);
  equal(await readBound(preflight.decisionBinding), c.applicationDecision, 'APPLICATION_DECISION_CHANGED');
  equal(preflight.parentPreflightBinding, c.parentPreflightBinding, 'PARENT_PREFLIGHT_CHANGED');
  equal(preflight.parentTestsBinding, c.parentTestsBinding, 'PARENT_TESTS_CHANGED');
  const style = await readBound(preflight.styleBinding);
  const built = build(c, style);
  equal(await readBound(preflight.planBinding), built.plan, 'APPROVED_PLAN_CHANGED');
  equal(await readBound(preflight.layoutBinding), built.layout, 'APPROVED_LAYOUT_CHANGED');
  equal(await readBound(preflight.layoutInputBinding), {schemaVersion: 'digest-v1-phase2-style94-layout-input-v001', ...built.layoutInput}, 'APPROVED_LAYOUT_INPUT_CHANGED');
  equal(preflight.bridgeBinding, c.bridgeBinding, 'ORIGINAL_BRIDGE_CHANGED');
  const derivation = await readBound(preflight.derivationBinding);
  equal(derivation.ancestorStyleBinding, c.bridge.registryBindings.styleProfileRegistry, 'ANCESTOR_STYLE_BINDING_CHANGED');
  equal(derivation.parentStyleBinding, c.parentPreflight.styleBinding, 'PARENT_STYLE_BINDING_CHANGED');
  equal(derivation.parentDerivationBinding, c.parentPreflight.derivationBinding, 'PARENT_DERIVATION_CHANGED');
  equal(derivation.caption282Probe94QcBinding, c.probe94Binding, 'PROBE94_BINDING_CHANGED');
  equal(derivation.sourceDecisionBinding, c.sourceDecisionBinding, 'DECISION_SOURCE_CHANGED');
  equal(derivation.previousStopBinding, c.previousStopBinding, 'PREVIOUS_STOP_CHANGED');
  equal(derivation.derivedStyleBinding, preflight.styleBinding, 'DERIVED_STYLE_BINDING_CHANGED');
  equal(derivation.applicationDecisionBinding, preflight.decisionBinding, 'DERIVATION_APPROVAL_CHANGED');
  equal(derivation.rasterDiagnosticBinding, c.diagnosticBinding, 'DIAGNOSTIC_BINDING_CHANGED');
  const admission = await readBound(preflight.admissionBinding);
  assert.equal(admission.status, 'passed');
  equal(admission.derivedStyleBinding, preflight.styleBinding, 'STYLE_ADMISSION_CHANGED');
  equal(admission.planBinding, preflight.planBinding, 'PLAN_ADMISSION_CHANGED');
  equal(admission.semanticProvenance, c.bridge.semanticProvenance, 'SEMANTIC_PROVENANCE_CHANGED');
  const tests = await readJson(styleRoot(c, 'tests.json'));
  assert.equal(tests.status, 'passed');
  assert(tests.cases.every((t: Json) => t.status === 'passed'));
  await checkBytes(tests.testImplementationBinding);
  equal(tests.implementationBinding, preflight.implementationBinding, 'TEST_IMPLEMENTATION_CHANGED');
  equal(tests.styleBinding, preflight.styleBinding, 'TEST_STYLE_CHANGED');
  equal(tests.layoutBinding, preflight.layoutBinding, 'TEST_LAYOUT_CHANGED');
  for (const n of ['render-v001', 'draw-start.json', 'renderer-result.json', 'verification.json', 'raster-qc.json', 'final-qc.json']) await requireAbsent(styleRoot(c, n));
  const startBinding = await publish(styleRoot(c, 'draw-start.json'), {
    schemaVersion: 'digest-v1-phase2-style94-draw-start-v001', preflightBinding: bind(styleRoot(c, 'preflight.json'), preflight),
    testsBinding: bind(styleRoot(c, 'tests.json'), tests), styleBinding: preflight.styleBinding, bridgeBinding: c.bridgeBinding,
    rendererOutputRoot: preflight.rendererOutputRoot, attempts: 1, oldFailureArtifactsRetained: true});
  const runtime = c.rendererTemplate.runtimeBindings;
  const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(ROOT, styleRoot(c, 'process-observations'))});
  process.stdout.write('94px正式派生style: 325字幕の描画を1回開始。\n');
  let rasterQcBinding: Json | null = null;
  let finalQcBinding: Json | null = null;
  const result = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(ROOT, preflight.rendererOutputRoot),
    plan: built.plan, presetRegistry: style, baseMediaPath: path.join(ROOT, c.base.baseMedia.path),
    baseMediaInspection: {media: c.oldAdmission.mediaInspection}, expectedFrameCount: c.timeline.baseMedia.expectedFrameCount,
    evaluateQc: (input: Json) => {
      const qc = evaluatePresentationRendererQcWithProfileV001(input, {
        schemaVersion: 'presentation-render-qc-v002', planFile: 'presentation-render-plan-v002.json'});
      // 既存の同期QC callbackの返却値をそのまま保存する。合否や検査内容は変更しない。
      const isRaster = input.requireFinalVisibility === false;
      const record = {schemaVersion: isRaster ? 'digest-v1-phase2-style94-raster-qc-v001' : 'digest-v1-phase2-style94-final-qc-v001',
        status: qc.status, styleBinding: preflight.styleBinding, planBinding: preflight.planBinding,
        layoutBinding: preflight.layoutBinding, derivationBinding: preflight.derivationBinding, qc};
      const p = styleRoot(c, isRaster ? 'raster-qc.json' : 'final-qc.json');
      const bytes = formal(record);
      writeFileSync(path.join(ROOT, p), bytes, {flag: 'wx'});
      assert.equal(readFileSync(path.join(ROOT, p), 'utf8'), bytes);
      const binding = bind(p, record);
      if (isRaster) {
        rasterQcBinding = binding;
        process.stdout.write(`94px実画像QC: ${qc.status} (${qc.instructionCount}/325)。\n`);
      } else finalQcBinding = binding;
      return qc;
    },
    toolPaths: {ffmpegPath: runtime.ffmpeg.path, ffprobePath: runtime.ffprobe.path, imageMagickPath: runtime.imageMagick.path,
      tsxPath: runtime.tsx.path, layoutInspectorPath: path.join(ROOT, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')},
    overlayAdapter: buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
      chromiumPath: runtime.chromium.path, processObserver}), processObserver});
  if (result.exitCode !== 0 || result.finalQc?.status !== 'passed') {
    await publish(styleRoot(c, 'renderer-result.json'), {schemaVersion: 'digest-v1-phase2-style94-renderer-result-v001',
      status: 'failed', startBinding, styleBinding: preflight.styleBinding, rasterQcBinding, finalQcBinding, exitCode: result.exitCode, result});
    throw new Error('PHASE2_STYLE94_RENDER_OR_QC_FAILED');
  }
  assert(rasterQcBinding && finalQcBinding, 'BOTH_QC_GATES_MUST_BE_RECORDED');
  const rasterQc = await readBound(rasterQcBinding);
  assert.equal(rasterQc.qc.status, 'passed');
  assert.equal(rasterQc.qc.instructionCount, 325);
  assert.equal(rasterQc.qc.instructionEvidence.length, 325);
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: result.stagingDirectory,
    outputDirectory: result.outputDirectory, reservation: result.reservation});
  const video = await byteBinding(styleRoot(c, 'render-v001/presentation-rendered-v002.mp4'));
  const executionBinding = await publish(styleRoot(c, 'renderer-result.json'), {
    schemaVersion: 'digest-v1-phase2-style94-renderer-result-v001', status: 'completed', startBinding,
    styleBinding: preflight.styleBinding, derivationBinding: preflight.derivationBinding, bridgeBinding: c.bridgeBinding,
    planBinding: preflight.planBinding, layoutBinding: preflight.layoutBinding, exitCode: 0, rasterQcBinding, finalQcBinding, qc: result.finalQc, publication, video});
  await publish(styleRoot(c, 'verification.json'), {schemaVersion: 'digest-v1-phase2-style94-verification-v001', status: 'technical-checkpoint',
    jobBinding: c.planBinding, styleBinding: preflight.styleBinding, derivationBinding: preflight.derivationBinding,
    bridgeBinding: c.bridgeBinding, semanticProvenance: c.bridge.semanticProvenance,
    planBinding: preflight.planBinding, layoutBinding: preflight.layoutBinding, renderer: {executionBinding, video, qc: 'passed', rasterQcBinding, finalQcBinding},
    baseMediaBinding: c.base.baseMedia, counts: {prospects: c.candidateSet.candidates.length,
      retainedRanges: c.adoption.segments.length, captions: c.timing.cues.length, atoms: c.text.textInput.atomOccurrences.length},
    frameCount: c.timeline.baseMedia.expectedFrameCount, durationSeconds: c.timeline.baseMedia.expectedFrameCount / built.plan.canvas.fps,
    operations: {newMeaningJudgments: 0, newAcousticObservations: 0, apiCalls: 0, newMaterials: 0, costUsd: 0},
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write(`94px正式派生style: technical QC PASS。${JSON.stringify(video)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  assert(['prepare', 'draw'].includes(mode) && job, 'usage: style94.mts prepare|draw <job>');
  (mode === 'prepare' ? prepare(job) : draw(job)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;
  });
}

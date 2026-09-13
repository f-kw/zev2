import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT, bind, readJson, readBound, publish, same, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {loadPhase2BridgeContext, validatePhase2Bridge, inspectPhase2BridgeRenderer} from './digest_v1_phase2_caption_bridge.mts';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {evaluatePresentationRendererQcWithProfileV001} from './presentation_renderer_qc_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

// ローカルIPC禁止による配置検査起動失敗だけから再開する。元の失敗一式は保存する。
async function replay(job: string) {
  const c = await loadPhase2BridgeContext(job);
  const failure = await readJson(out(c, 'renderer-result.json'));
  assert.equal(failure.status, 'failed');
  assert.equal(failure.result.failure.message, 'layout inspector produced no result');
  const preflight = await readJson(out(c, 'caption-bridge-preflight-v001.json'));
  assert.equal(preflight.status, 'passed');
  assert.equal(await fileSha(path.join(ROOT, preflight.implementationBinding.path)), preflight.implementationBinding.fileSha256);
  const tests = await readBound(preflight.negativeTestsBinding);
  assert.equal(tests.status, 'passed');
  assert(tests.cases.every((v: Json) => v.status === 'passed'));
  assert.equal(await fileSha(path.join(ROOT, tests.testImplementationBinding.path)), tests.testImplementationBinding.fileSha256);
  const bridge = await readBound(preflight.bridgeBinding);
  validatePhase2Bridge(bridge, c);
  assert(same(tests.bridgeBinding, preflight.bridgeBinding));
  assert(same(failure.bridgeBinding, preflight.bridgeBinding));
  const previousAdmission = await readBound(failure.admissionBinding);
  // 保存済み土台の全byte照合後、前回の入力映像検査をその同一fileに対して再利用する。
  const admission = await inspectPhase2BridgeRenderer(c, bridge, previousAdmission.mediaInspection);
  assert(same(admission, previousAdmission));
  const common = buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: bridge.executionInputs},
    visualStateId: bridge.executionInputs.visualStateId, instructionArtifact: bridge.instructionArtifact,
    lineLayout: bridge.lineLayout, styleProfileRegistry: c.style, rendererTrust: c.trust});
  assert.equal(common.status, 'built');
  const savedPlan = await readJson(out(c, 'caption-bridge-common-plan-v001.json'));
  assert(same(savedPlan, common.plan));
  for (const filename of ['render-bridge-v002', 'renderer-result-v002.json', 'bridge-draw-replay-v001.json', 'verification.json'])
    await requireAbsent(out(c, filename));
  const sourcePath = 'evals/clip_composition/digest_v1_phase2_bridge_draw_replay.mts';
  const replayBinding = await publish(out(c, 'bridge-draw-replay-v001.json'), {
    schemaVersion: 'digest-v1-phase2-bridge-draw-replay-v001',
    reason: 'tsx CLI local IPC listen EPERM in sandbox; unchanged renderer is run with local process permission',
    previousFailureBinding: bind(out(c, 'renderer-result.json'), failure), bridgeBinding: preflight.bridgeBinding,
    preflightBinding: bind(out(c, 'caption-bridge-preflight-v001.json'), preflight), admissionBinding: failure.admissionBinding,
    commonPlanBinding: bind(out(c, 'caption-bridge-common-plan-v001.json'), savedPlan),
    implementationBinding: {path: sourcePath, fileSha256: await fileSha(path.join(ROOT, sourcePath))},
    outputRoot: out(c, 'render-bridge-v002'), newMeaningJudgments: 0, newAcousticObservations: 0,
    originalFailureAndLockRetained: true, sourceFrameRescan: false, baseMediaRebuilt: false});
  const runtime = c.rendererTemplate.runtimeBindings;
  const processObserver = createPresentationRendererProcessObserverV001({observationDirectory:
    path.join(ROOT, out(c, 'process-observations/phase2-caption-bridge-v002'))});
  process.stdout.write(JSON.stringify({stage: 'renderer', status: 'started', captions: common.plan.elements.length}) + '\n');
  const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(ROOT, out(c, 'render-bridge-v002')),
    plan: common.plan, presetRegistry: c.style, baseMediaPath: path.join(ROOT, c.base.baseMedia.path),
    baseMediaInspection: {media: previousAdmission.mediaInspection}, expectedFrameCount: c.timeline.baseMedia.expectedFrameCount,
    evaluateQc: (input: Json) => evaluatePresentationRendererQcWithProfileV001(input, {
      schemaVersion: 'presentation-render-qc-v002', planFile: 'presentation-render-plan-v002.json'}),
    toolPaths: {ffmpegPath: runtime.ffmpeg.path, ffprobePath: runtime.ffprobe.path, imageMagickPath: runtime.imageMagick.path,
      tsxPath: runtime.tsx.path, layoutInspectorPath: path.join(ROOT, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')},
    overlayAdapter: buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
      chromiumPath: runtime.chromium.path, processObserver}), processObserver});
  if (draw.exitCode !== 0 || draw.finalQc?.status !== 'passed') {
    await publish(out(c, 'renderer-result-v002.json'), {schemaVersion: 'digest-v1-phase2-bridge-renderer-result-v001',
      status: 'failed', replayBinding, exitCode: draw.exitCode, result: draw});
    throw new Error('PHASE2_BRIDGE_REPLAY_RENDER_OR_QC_FAILED');
  }
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory, reservation: draw.reservation});
  const videoPath = out(c, 'render-bridge-v002/presentation-rendered-v002.mp4');
  const video = {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))};
  const execution = await publish(out(c, 'renderer-result-v002.json'), {schemaVersion: 'digest-v1-phase2-bridge-renderer-result-v001',
    status: 'completed', replayBinding, bridgeBinding: preflight.bridgeBinding, admissionBinding: failure.admissionBinding,
    exitCode: 0, qc: draw.finalQc, publication, video});
  await publish(out(c, 'verification.json'), {schemaVersion: 'digest-v1-phase2-execution-result-v002', status: 'technical-checkpoint',
    jobBinding: c.planBinding, semanticProvenance: bridge.semanticProvenance, bridgeBinding: preflight.bridgeBinding,
    renderer: {execution, video, qc: 'passed'},
    counts: {prospects: c.candidateSet.candidates.length, adopted: c.adoption.selectedCandidates.length,
      retainedRanges: c.adoption.segments.length, captions: c.timing.cues.length, atoms: c.text.textInput.atomOccurrences.length},
    frameCount: c.timeline.baseMedia.expectedFrameCount, durationSeconds: c.timeline.baseMedia.expectedFrameCount / bridge.executionInputs.canvas.fps,
    operations: {candidateJudgments: 1, retentionJudgments: 1, displayJudgments: 2, captionPolicyRevisionAdditionalJudgments: 1,
      paidApiCalls: 0, newMaterials: 0, bridgeMeaningJudgments: 0}, humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write(JSON.stringify({stage: 'technical-checkpoint', video}) + '\n');
}
replay(process.argv[2]).catch(error => {process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;});

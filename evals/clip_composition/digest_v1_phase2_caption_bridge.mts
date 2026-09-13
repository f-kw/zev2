import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, readBound, publish, same, canonicalSha, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadRevisedPhase2CaptionContext} from './digest_v1_phase2_caption_revision.mts';
import {validatePhase2Display, resolvePhase2CaptionTiming} from './digest_v1_phase2_captions.mts';
import {serializePhase2Timing} from './digest_v1_phase2_manufacturing.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';
import {codePointWeightV001} from './presentation_renderer_text_layout_v001.mjs';
import {validatePresentationInstructionRendererJobV002} from './presentation_renderer_admission_receipt_v002.mjs';
import {buildPresentationInstructionCommonCorePlanV001, resolvePresentationRendererAppearanceV001,
  observePresentationRendererRuntimeBindingsV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {inspectRenderedMediaWithToolsV001, evaluatePresentationRendererQcWithProfileV001}
  from './presentation_renderer_qc_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

const implementationPath = 'evals/clip_composition/digest_v1_phase2_caption_bridge.mts';
const clone = structuredClone;
const equal = (a: any, b: any, message: string) => assert(same(a, b), message);
const checked = (result: Json, status: string) => {assert.equal(result.status, status, JSON.stringify(result)); return result;};
const byteCheck = async (b: Json) => {
  assert.equal(await fileSha(path.isAbsolute(b.path) ? b.path : path.join(ROOT, b.path)), b.fileSha256, `BYTE_CHANGED: ${b.path}`);
  return {path: b.path, fileSha256: b.fileSha256};
};
const jsonBinding = async (b: Json, schemaField = 'schemaVersion') => {
  await byteCheck(b);
  const value = await readJson(b.path);
  assert.equal(value[schemaField], b.schemaVersion);
  assert.equal(canonicalSha(value), b.canonicalSha256);
  return value;
};

/** 保存済み判断の再検証のみ。Skill実行・音響観測・時刻の再判断は呼ばない。 */
export async function loadPhase2BridgeContext(job: string) {
  const c = await loadRevisedPhase2CaptionContext(job);
  equal(await readJson(out(c, 'display-all-request-v002.json')), c.text.request, 'ACTUAL_REQUEST_CHANGED');
  const displayPreflight = await readJson(out(c, 'display-input-preflight-v002.json'));
  await byteCheck(displayPreflight.implementationBinding);
  const response = await readJson(out(c, 'display-all-response-v002.json'));
  const result = await readJson(out(c, 'display-all-result-v002.json'));
  const traces = validatePhase2Display(c.text, response, result);
  const validation = await readJson(out(c, 'display-validation-v002.json'));
  assert.equal(validation.status, 'passed');
  for (const [key, filename, value] of [
    ['requestBinding', 'display-all-request-v002.json', c.text.request],
    ['responseBinding', 'display-all-response-v002.json', response],
    ['resultBinding', 'display-all-result-v002.json', result],
  ] as const) equal(validation[key], bind(out(c, filename), value), 'DISPLAY_VALIDATION_BINDING_CHANGED');
  for (const [i, trace] of traces.entries()) for (const key of ['request', 'response', 'result'])
    equal(await readJson(out(c, `display-${i + 1}-${key}-v002.json`)), trace[key], 'RANGE_TRACE_CHANGED');
  const timing = await readJson(out(c, 'caption-timing-resolution-v002.json'));
  const recovery = await readJson(out(c, 'caption-timing-serialization-recovery-v002.json'));
  await byteCheck(recovery.implementationBinding);
  equal(recovery.timingBinding, bind(out(c, 'caption-timing-resolution-v002.json'), timing), 'TIMING_BINDING_CHANGED');
  const projected = serializePhase2Timing(resolvePhase2CaptionTiming(c, c.adoption, c.text, traces));
  const reconstructed = {schemaVersion: 'digest-v1-phase2-caption-timing-resolution-v002', ...projected.timing,
    displayValidationBinding: bind(out(c, 'display-validation-v002.json'), validation),
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), c.adoption), acousticValidationBinding: c.originalAcousticBinding,
    policy: 'existing-cue-endpoint-resolution-and-explicit-unresolved-transcript-fallback',
    supplementalRetentionEndpointEvidenceUsedForCaption: false, humanSync: 'not-evaluated',
    serialization: {policy: 'omit-only-absent-optional-observation-diagnostics; preserve-all-time-values',
      absentOptionalObservationPaths: projected.absentOptionalObservationPaths}};
  equal(timing, reconstructed, 'SAVED_TIMING_RECONSTRUCTION_CHANGED');
  assert.equal(timing.status, 'resolved');
  const {schemaVersion: _schema, ...base} = await readJson(out(c, 'base-media-bindings.json'));
  const [timeline, receipt, manifest] = await Promise.all([
    readBound(base.timeline), readBound(base.validationReceipt), readBound(base.generationManifest)]);
  assert.equal(receipt.status, 'passed');
  assert(Object.values(receipt.checks).every(v => v === 'passed'));
  equal(receipt.outputs, {baseMedia: base.baseMedia, timeline: base.timeline, generationManifest: base.generationManifest}, 'BASE_RECEIPT_CHANGED');
  equal(receipt.machineAdoptionBinding, timing.machineAdoptionBinding, 'BASE_RETENTION_CHANGED');
  equal(receipt.editPlanBinding, bind(out(c, 'edit-plan.json'), c.editPlan), 'BASE_EDIT_PLAN_CHANGED');
  const invocation = await readBound(receipt.coreInvocationBinding);
  equal(invocation.captionTimingBinding, recovery.timingBinding, 'BASE_TIMING_CHANGED');
  equal(invocation.retentionBinding, c.retentionBinding, 'BASE_RETENTION_PROVENANCE_CHANGED');
  assert.equal(timeline.baseMedia.fileSha256, base.baseMedia.fileSha256);
  equal(timeline.segments.map((s: Json) => [s.segmentId, s.sourceStartMs, s.sourceEndMs]),
    c.adoption.segments.map((s: Json) => [s.segmentId, s.sourceStartMs, s.sourceEndMs]), 'BASE_RANGES_CHANGED');
  const decision = await readJson(out(c, 'core-caption-bridge-advisor-decision-v001.json'));
  assert.equal(decision.decision, 'REJECT-AS-WRITTEN / APPROVE-MODIFIED-BRIDGE');
  assert.equal(base.baseMedia.fileSha256, decision.baseMediaSha256);
  // この検査は元配信のframe再走査ではなく、保存済み土台fileのbyte照合だけ。
  await byteCheck(base.baseMedia);
  const template = c.rendererTemplate;
  checked(validatePresentationInstructionRendererJobV002(template), 'passed');
  const [style, trust, material] = await Promise.all([
    readBound(template.registryBindings.styleProfileRegistry), readBound(template.registryBindings.rendererTrust),
    jsonBinding(template.registryBindings.materialRegistry, 'registryVersion')]);
  const styleProfileId = c.captionStyleTemplate.reconstructionMap.caseContexts[0].resolvedStyle.presetId;
  const appearance = checked(resolvePresentationRendererAppearanceV001({instructionArtifact: {styleProfileId},
    styleProfileRegistry: style, visualStateId: template.executionInputs.visualStateId}), 'resolved');
  const limits = c.text.request.input.styleLimits;
  assert.equal(limits.maxLogicalWidthPerLine, appearance.profile.maxLogicalWidth ?? appearance.visualState.layout?.maxCharsPerLine);
  assert.equal(limits.maxLinesPerCue, appearance.profile.maxLines ?? appearance.visualState.layout?.maxLines);
  assert.equal(limits.characterWidthRule, trust.layoutRules.characterWidthRule);
  return {...c, response, result, traces, validation, timing, base, timeline, receipt, manifest, decision,
    style, trust, material, styleProfileId};
}

const provenance = (c: Json) => ({
  actualRequest: bind(out(c, 'display-all-request-v002.json'), c.text.request),
  authority: c.text.request.authorityBinding,
  response: bind(out(c, 'display-all-response-v002.json'), c.response),
  result: bind(out(c, 'display-all-result-v002.json'), c.result),
  displayValidation: bind(out(c, 'display-validation-v002.json'), c.validation),
  textInput: bind(out(c, 'caption-text-input.json'), c.text.textInput),
  captionTiming: bind(out(c, 'caption-timing-resolution-v002.json'), c.timing),
  retention: c.retentionBinding,
  machineAdoption: bind(out(c, 'machine-adoption.json'), c.adoption),
  candidateSet: c.candidateSetBinding,
  baseMedia: c.base,
});

/** 指定済み境界の所属で切るだけ。境界選択・balancing・文字変更・時刻補正は行わない。 */
export function projectPhase2Bridge(c: Json) {
  const instructions: Json[] = [], entries: Json[] = [], boundaryProjection: Json[] = [];
  const atoms = c.text.textInput.atomOccurrences;
  let offset = 0;
  for (const [rangeIndex, trace] of c.traces.entries()) {
    const input = trace.request.input.captions[0];
    const boundaries = input.boundaryCandidates;
    const byId = new Map<string, number>(boundaries.map((b: Json, i: number) => [b.boundaryId, i]));
    assert.equal(byId.size, boundaries.length);
    const group = c.text.textInput.orderedSegments[rangeIndex];
    const rangeAtoms = atoms.slice(offset, offset + boundaries.length);
    equal(group.atomOccurrenceIds, rangeAtoms.map((a: Json) => a.atomOccurrenceId), 'RANGE_ATOM_ORDER_CHANGED');
    equal(boundaries.map((b: Json) => b.text), rangeAtoms.map((a: Json) => a.text), 'REQUEST_TEXT_CHANGED');
    let start = 0;
    for (const cue of trace.cues) {
      const end = byId.get(cue.cueEndBoundaryId);
      assert(end !== undefined && end >= start, 'CUE_BOUNDARY_INVALID');
      const selected = rangeAtoms.slice(start, end + 1), row = c.timing.cues[instructions.length];
      equal(row.atomOccurrenceIds, selected.map((a: Json) => a.atomOccurrenceId), 'CUE_ATOM_ORDER_CHANGED');
      assert.equal(row.text, selected.map((a: Json) => a.text).join(''));
      assert.equal(row.timelineSegmentId, group.timelineSegmentId);
      const mapped = checked(mapPresentationSourceIntervalV002(c.timeline,
        row.resolution.sourceStartMs, row.resolution.sourceEndMs), 'passed').mapping;
      assert.equal(mapped.timelineSegmentId, row.timelineSegmentId);
      const instructionId = `${c.plan.planId}-bridge-caption-${String(instructions.length + 1).padStart(6, '0')}`;
      const lines: Json[] = [];
      let lineStart = start;
      for (const boundaryId of cue.lineEndBoundaryIds) {
        const lineEnd = byId.get(boundaryId);
        assert(lineEnd !== undefined && lineEnd >= lineStart && lineEnd <= end, 'LINE_BOUNDARY_INVALID');
        const lineAtoms = rangeAtoms.slice(lineStart, lineEnd + 1);
        const text = lineAtoms.map((a: Json) => a.text).join('');
        const logicalWidth = [...text].reduce((n, ch) => n + codePointWeightV001(ch, c.text.request.input.styleLimits.characterWidthRule), 0);
        assert(logicalWidth <= c.text.request.input.styleLimits.maxLogicalWidthPerLine, 'LINE_WIDTH_INVALID');
        lines.push({lineIndex: lines.length, sourceUnitIds: lineAtoms.map((a: Json) => a.atomOccurrenceId), text, logicalWidth});
        lineStart = lineEnd + 1;
      }
      assert.equal(lineStart, end + 1);
      assert(lines.length > 0 && lines.length <= c.text.request.input.styleLimits.maxLinesPerCue);
      assert.equal(cue.lineEndBoundaryIds.at(-1), cue.cueEndBoundaryId);
      const outputTime = {startFrame: mapped.startFrame, endFrameExclusive: mapped.endFrameExclusive};
      assert(outputTime.startFrame >= 0 && outputTime.startFrame < outputTime.endFrameExclusive
        && outputTime.endFrameExclusive <= c.timeline.baseMedia.expectedFrameCount);
      if (instructions.length) assert(instructions.at(-1)!.outputTime.startFrame <= outputTime.startFrame, 'CUE_FRAME_ORDER_CHANGED');
      instructions.push({instructionId, semanticKind: 'speech-caption', content: {text: row.text}, outputTime,
        targetProvenance: {targetRefId: c.text.textInput.captions[0].captionId, targetType: 'semantic-caption',
          atomOccurrenceIds: selected.map((a: Json) => a.atomOccurrenceId)}, materialRefs: []});
      entries.push({instructionId, lineLayoutRuleId: 'digest-phase2-validated-display-boundaries-v001', lines});
      boundaryProjection.push({instructionId, inputCaptionId: input.captionId, timelineSegmentId: row.timelineSegmentId,
        timingUnitId: row.unitId, cueEndBoundaryId: cue.cueEndBoundaryId, lineEndBoundaryIds: clone(cue.lineEndBoundaryIds),
        sourceStartMs: row.resolution.sourceStartMs, sourceEndMs: row.resolution.sourceEndMs});
      start = end + 1;
    }
    assert.equal(start, boundaries.length);
    offset += boundaries.length;
  }
  assert.equal(offset, atoms.length);
  assert.equal(instructions.length, c.validation.captionCount);
  equal(instructions.flatMap(i => i.targetProvenance.atomOccurrenceIds), atoms.map((a: Json) => a.atomOccurrenceId), 'FULL_ATOM_COVERAGE_CHANGED');
  return {schemaVersion: 'digest-v1-phase2-caption-bridge-v001', bridgeId: `${c.plan.planId}-caption-bridge`,
    semanticProvenance: provenance(c), actualTaskDescription: c.text.request.input.taskDescription,
    structuralCompatibilityReference: {binding: c.plan.request.captionStyleTemplate, role: 'style-and-structure-only; not-actual-judgment-request'},
    executionInputs: {...clone(c.rendererTemplate.executionInputs), lineLayoutRules: {
      ...clone(c.rendererTemplate.executionInputs.lineLayoutRules), 'speech-caption': 'digest-phase2-validated-display-boundaries-v001'}},
    registryBindings: clone(c.rendererTemplate.registryBindings),
    instructionArtifact: {schemaVersion: 'digest-v1-phase2-caption-instructions-v001', styleProfileId: c.styleProfileId, instructions},
    lineLayout: {schemaVersion: 'digest-v1-phase2-caption-lines-v001', entries}, boundaryProjection,
    operations: {newMeaningJudgments: 0, newAcousticObservations: 0, changedTextAtoms: 0, changedTimeValues: 0},
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'};
}

/** 信頼済み再構築contextとの全量一致を入場条件にする。v001 providerの来歴を生成しない。 */
export function validatePhase2Bridge(bridge: Json, c: Json) {
  const expected = projectPhase2Bridge(c);
  equal(bridge.semanticProvenance, provenance(c), 'SEMANTIC_PROVENANCE_CHANGED');
  assert.equal(bridge.actualTaskDescription, c.text.request.input.taskDescription, 'ACTUAL_TASK_CHANGED');
  equal(bridge, expected, 'BRIDGE_PROJECTION_CHANGED');
  return {status: 'passed', checks: [
    'actual-request-exact', 'authority-binding', 'response-result-binding', 'caption-count-and-content',
    'full-text-ids-order', 'actual-request-cue-line-membership', 'saved-timing-exact', 'retained-range-correspondence',
    'fixed-style', 'base-media-sha', 'zero-meaning-changes', 'old-prompt-substitution-rejected',
  ].map(checkId => ({checkId, status: 'passed'})), counts: {captions: expected.instructionArtifact.instructions.length,
    atoms: c.text.textInput.atomOccurrences.length, ranges: c.adoption.segments.length}};
}

/** provider専用3検査は上記Phase 2検査で置換。残りの既存入場条件をそのまま照合する。 */
export async function inspectPhase2BridgeRenderer(c: Json, bridge: Json, media: Json) {
  validatePhase2Bridge(bridge, c);
  const job = c.rendererTemplate, trust = c.trust, canvas = job.executionInputs.canvas;
  const appearance = checked(resolvePresentationRendererAppearanceV001({instructionArtifact: bridge.instructionArtifact,
    styleProfileRegistry: c.style, visualStateId: job.executionInputs.visualStateId}), 'resolved');
  const profile = appearance.profile, registryCanvas = c.style.canvas ?? profile.canvas;
  equal(registryCanvas, {...canvas, ...(registryCanvas.safeAreaPx ? {safeAreaPx: registryCanvas.safeAreaPx} : {})}, 'CANVAS_CHANGED');
  assert.equal(c.style.format ?? profile.format, job.executionInputs.format);
  assert.equal(profile.format, job.executionInputs.format);
  equal({width: media.video.width, height: media.video.height, fps: media.video.fps}, canvas, 'MEDIA_CANVAS_CHANGED');
  assert.equal(media.video.frameCount, c.timeline.baseMedia.expectedFrameCount);
  assert(media.audio, 'MEDIA_AUDIO_MISSING');
  for (const row of bridge.instructionArtifact.instructions) assert(row.outputTime.endFrameExclusive <= media.video.frameCount);
  const ids = new Set((c.material.materials ?? c.material.entries ?? []).map((v: Json) => v.materialId ?? v.id));
  assert(bridge.instructionArtifact.instructions.every((i: Json) => i.materialRefs.every((id: string) => ids.has(id))));
  assert.equal(canonicalSha(trust.fontAssets), job.registryBindings.fontLedger.valueCanonicalSha256);
  equal(await Promise.all(trust.fontAssets.map(byteCheck)), trust.fontAssets.map((v: Json) => ({path: v.path, fileSha256: v.fileSha256})), 'FONT_CHANGED');
  assert(trust.layoutRules && trust.toolVersions && Object.keys(trust.toolVersions).length);
  equal(await Promise.all(trust.rendererDependencies.map(byteCheck)), trust.rendererDependencies, 'RENDERER_DEPENDENCY_CHANGED');
  for (const key of ['path', 'fileSha256', 'canonicalSha256'])
    assert.equal(trust.presetRegistry[key], job.registryBindings.styleProfileRegistry[key]);
  await Promise.all([...job.rendererImplementationBindings, ...job.approvedContractBindings].map(byteCheck));
  await observePresentationRendererRuntimeBindingsV001(job.runtimeBindings);
  await requireAbsent(out(c, 'render'));
  return {schemaVersion: 'digest-v1-phase2-renderer-admission-v001', status: 'passed',
    replacedProviderAdmission: 'actual-request-bound-phase2-caption-bridge',
    preservedChecks: ['crop-applied-base-media', 'canvas-format', 'style-profile-registry', 'material-registry',
      'font-ledger', 'renderer-trust', 'renderer-implementation', 'renderer-execution-inputs'],
    bridgeBinding: bind(out(c, 'caption-bridge-v001.json'), bridge), runtimeBindings: job.runtimeBindings,
    rendererImplementationBindings: job.rendererImplementationBindings, mediaInspection: media};
}

export async function renderPhase2Bridge(jobPath: string) {
  const c = await loadPhase2BridgeContext(jobPath), bridge = projectPhase2Bridge(c);
  const preflight = validatePhase2Bridge(bridge, c);
  const tests = await readJson(out(c, 'caption-bridge-tests-v001.json'));
  assert.equal(tests.status, 'passed');
  assert(tests.cases.length >= c.decision.requiredNegativeTests.length);
  await byteCheck(tests.implementationBinding);
  await byteCheck(tests.testImplementationBinding);
  equal(tests.actualRequestBinding, bridge.semanticProvenance.actualRequest, 'TEST_REQUEST_CHANGED');
  equal(tests.bridgeBinding, bind(out(c, 'caption-bridge-v001.json'), bridge), 'TEST_BRIDGE_CHANGED');
  const outputNames = ['caption-bridge-v001.json', 'caption-bridge-preflight-v001.json', 'caption-bridge-admission-v001.json',
    'caption-bridge-common-plan-v001.json', 'renderer-result.json', 'verification.json', 'render'];
  for (const filename of outputNames) await requireAbsent(out(c, filename));
  const runtime = c.rendererTemplate.runtimeBindings;
  await observePresentationRendererRuntimeBindingsV001(runtime);
  await Promise.all([...c.rendererTemplate.rendererImplementationBindings, ...c.trust.rendererDependencies].map(byteCheck));
  const processObserver = createPresentationRendererProcessObserverV001({
    observationDirectory: path.join(ROOT, out(c, 'process-observations/phase2-caption-bridge-v001'))});
  process.stdout.write(JSON.stringify({stage: 'bridge-input-media-inspection', status: 'started'}) + '\n');
  const media = await inspectRenderedMediaWithToolsV001(path.join(ROOT, c.base.baseMedia.path), {
    ffmpegPath: runtime.ffmpeg.path, ffprobePath: runtime.ffprobe.path, processObserver,
    observationLabelPrefix: 'input-media-inspection'});
  const admission = await inspectPhase2BridgeRenderer(c, bridge, media);
  const common = checked(buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: bridge.executionInputs},
    visualStateId: c.rendererTemplate.executionInputs.visualStateId, instructionArtifact: bridge.instructionArtifact,
    lineLayout: bridge.lineLayout, styleProfileRegistry: c.style, rendererTrust: c.trust}), 'built');
  for (const [i, element] of common.plan.elements.entries()) {
    const instruction = bridge.instructionArtifact.instructions[i];
    assert.equal(element.text, instruction.content.text);
    equal([element.startFrame, element.endFrameExclusive], [instruction.outputTime.startFrame, instruction.outputTime.endFrameExclusive], 'COMMON_TIME_CHANGED');
    equal(element.indexedLines.map((l: Json) => l.renderedText), bridge.lineLayout.entries[i].lines.map((l: Json) => l.text), 'COMMON_LINES_CHANGED');
  }
  const bridgeBinding = await publish(out(c, 'caption-bridge-v001.json'), bridge);
  await publish(out(c, 'caption-bridge-preflight-v001.json'), {schemaVersion: 'digest-v1-phase2-bridge-preflight-v001', ...preflight,
    bridgeBinding, negativeTestsBinding: bind(out(c, 'caption-bridge-tests-v001.json'), tests),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))}});
  const admissionBinding = await publish(out(c, 'caption-bridge-admission-v001.json'), admission);
  const commonBinding = await publish(out(c, 'caption-bridge-common-plan-v001.json'), common.plan);
  process.stdout.write(JSON.stringify({stage: 'renderer', status: 'started', captions: common.plan.elements.length}) + '\n');
  const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(ROOT, out(c, 'render')),
    plan: common.plan, presetRegistry: c.style, baseMediaPath: path.join(ROOT, c.base.baseMedia.path),
    baseMediaInspection: {media}, expectedFrameCount: media.video.frameCount,
    evaluateQc: (input: Json) => evaluatePresentationRendererQcWithProfileV001(input, {
      schemaVersion: 'presentation-render-qc-v002', planFile: 'presentation-render-plan-v002.json'}),
    toolPaths: {ffmpegPath: runtime.ffmpeg.path, ffprobePath: runtime.ffprobe.path, imageMagickPath: runtime.imageMagick.path,
      tsxPath: runtime.tsx.path, layoutInspectorPath: path.join(ROOT, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')},
    overlayAdapter: buildPresentationRendererOverlayAdapterV001({remotionPath: runtime.remotion.path,
      chromiumPath: runtime.chromium.path, processObserver}), processObserver});
  if (draw.exitCode !== 0 || draw.finalQc?.status !== 'passed') {
    await publish(out(c, 'renderer-result.json'), {schemaVersion: 'digest-v1-phase2-bridge-renderer-result-v001',
      status: 'failed', bridgeBinding, admissionBinding, exitCode: draw.exitCode, result: draw});
    throw new Error('PHASE2_BRIDGE_RENDER_OR_QC_FAILED');
  }
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory, reservation: draw.reservation});
  const videoPath = out(c, 'render/presentation-rendered-v002.mp4');
  const video = {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))};
  const execution = await publish(out(c, 'renderer-result.json'), {schemaVersion: 'digest-v1-phase2-bridge-renderer-result-v001',
    status: 'completed', bridgeBinding, admissionBinding, commonBinding, exitCode: 0, qc: draw.finalQc, publication, video});
  await publish(out(c, 'verification.json'), {schemaVersion: 'digest-v1-phase2-execution-result-v002', status: 'technical-checkpoint',
    jobBinding: c.planBinding, semanticProvenance: bridge.semanticProvenance, bridgeBinding, renderer: {execution, video, qc: 'passed'},
    counts: {prospects: c.candidateSet.candidates.length, adopted: c.adoption.selectedCandidates.length,
      retainedRanges: c.adoption.segments.length, captions: c.timing.cues.length, atoms: c.text.textInput.atomOccurrences.length},
    frameCount: c.timeline.baseMedia.expectedFrameCount, durationSeconds: c.timeline.baseMedia.expectedFrameCount / c.rendererTemplate.executionInputs.canvas.fps,
    operations: {candidateJudgments: 1, retentionJudgments: 1, displayJudgments: 2, captionPolicyRevisionAdditionalJudgments: 1,
      paidApiCalls: 0, newMaterials: 0, bridgeMeaningJudgments: 0}, humanQuality: 'not-evaluated', completionApproval: 'not-claimed'});
  process.stdout.write(JSON.stringify({stage: 'technical-checkpoint', video}) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  renderPhase2Bridge(process.argv[2]).catch(error => {process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;});
}

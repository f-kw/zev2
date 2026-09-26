/** This source-specific adapter supplies current presentation entry points with
 * the new Digest's clocks and evidence. It does not add a palette or selector. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, ARTIFACTS, PLAN} from './run_new_material_digest_20260926.mts';
import {inspectPresentationRenderLayoutV001} from './inspect_presentation_render_layout_v001.js';
import {buildPresentationRendererOverlayAdapterV001, executeValidatedPresentationDrawAndQcV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {getPresentationPanelPresetV002} from './presentation_panel_presets_v002.mjs';
import {PRESENTATION_EFFECT_TRIAL_PRESETS_V001} from './presentation_effects_v001.mjs';
import {PRESENTATION_PULSE_PRESET_V001, assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';
import {PRESENTATION_CAPTION_MOTION_PRESETS_V001, getPresentationCaptionMotionProgramV001,
  buildPresentationCaptionMotionStateElementsV001, assertPresentationCaptionMotionLayoutsV001}
  from './presentation_caption_motion_v001.mjs';
import {loadBoundAudioEvidenceV005, buildPresentationFocusSelectionInputV005} from './presentation_focus_selection_v001.mts';
import {buildOrchestrationInputFilesV001} from './presentation_orchestration_prepare_v001.mjs';
import {createOrchestrationContextV001, fixOrchestrationJudgmentV001, resolveOrchestrationDrawingViewV001,
  exportOrchestrationDrawingViewEvidenceV001, assertOrchestrationDrawingViewMatchesStateV001}
  from './presentation_orchestration_v001.mjs';
import {buildOrchestrationBackgroundV001, inspectOrchestrationEncodedAudioV001}
  from './presentation_orchestration_background_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';

type Json = Record<string, any>;
const absolute = (p: string) => path.resolve(ROOT, p);
const output = absolute(`${ARTIFACTS}/presentation`);
const read = async (p: string) => JSON.parse(await readFile(absolute(p), 'utf8'));
const save = async (p: string, value: unknown) => {
  await mkdir(path.dirname(absolute(p)), {recursive: true});
  await writeFile(absolute(p), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
};
async function bind(p: string) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const part of createReadStream(absolute(p))) {hash.update(part); bytes += part.length;}
  return {path: absolute(p), fileSha256: hash.digest('hex'), bytes};
}
const ref = ({path, fileSha256}: Json) => ({path, fileSha256});
const registryPath = absolute('evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
  imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: absolute('runner/node_modules/tsx/dist/cli.mjs'),
  layoutInspectorPath: absolute('evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
function adapter(processObserver: any) {
  return buildPresentationRendererOverlayAdapterV001({processObserver,
    remotionPath: absolute('runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath: absolute('runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell')});
}

/** Same finite native-layout checks as the existing Stage 1 preparation, with
 * the actual source-specific caption count instead of the historical 32. */
export async function preparePresentation() {
  const plan = await read(`${ARTIFACTS}/normal-plan.json`), registry = await read(registryPath);
  assert(plan.elements.length > 0 && plan.elements.every((e: Json) => e.kind === 'speech-caption'));
  assert.deepEqual([plan.canvas.width, plan.canvas.height, plan.canvas.fps], [1920, 1080, 30]);
  assert(plan.elements.every((e: Json) => !['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion'].some(k => Object.hasOwn(e, k))));
  const fonts = registry.fontAssets.filter((f: Json) => plan.elements.some((e: Json) => e.visualState.textStyle.fontAssetId === f.fontAssetId));
  assert.equal(fonts.length, new Set(plan.elements.map((e: Json) => e.visualState.textStyle.fontAssetId)).size);
  for (const font of fonts) assert.equal((await bind(font.path)).fileSha256, font.sha256);
  const native = adapter({run: async () => {throw new Error('Native font measurement only');}});
  const inspect = (elements: Json[]) => inspectPresentationRenderLayoutV001({canvas: plan.canvas,
    overlays: elements.map(e => native.buildProps(e, plan, registry))});
  const measured: Json = {}, observations: Json[] = [], evidenceRefs: Json[] = [];
  const record = async (kind: string, rows: Json[]) => {
    const p = `${output}/feasibility/${kind}.json`;
    await save(p, {kind, captionCount: plan.elements.length, rows, semanticSelection: false});
    evidenceRefs.push(ref(await bind(p)));
    const unavailable = rows.filter(row => row.violations.length).map(row => row.captionId);
    if (unavailable.length && ['scale', 'panel', 'pulse', 'bounce', 'shake'].includes(kind)) observations.push({observationId: `new-material-${kind}-physical-unrepresentable`,
      kind: `${kind}-unrepresentable`, captionIds: unavailable,
      description: '既存の有限表現を、確定本文・改行・期間と実フォントのまま検査した結果、固定配置または期間が成立しない。意味上の採否ではなく、縮小・再改行・時刻変更で救済しない。'});
    return rows;
  };
  for (const kind of ['normal', 'scale', 'panel', 'pulse-middle']) {
    const elements = plan.elements.map((original: Json) => {
      const e = structuredClone(original);
      if (kind === 'scale') Object.assign(e.visualState.textStyle, PRESENTATION_EFFECT_TRIAL_PRESETS_V001.reaction);
      if (kind === 'panel') {
        Object.assign(e.visualState.textStyle, getPresentationPanelPresetV002('provisional-panel').textStyle);
        e.visualState.background = structuredClone(getPresentationPanelPresetV002('provisional-panel').background);
      }
      if (kind === 'pulse-middle') e.visualState.textStyle.fontSizePx = PRESENTATION_PULSE_PRESET_V001.middleFontSizePx;
      return e;
    });
    const result = inspect(elements);
    measured[kind] = elements.map((e: Json) => ({captionId: e.instructionId,
      layout: result.items.find((row: Json) => row.instructionId === e.instructionId),
      violations: result.violations.filter((v: Json) => v.instructionId === e.instructionId)}));
    assert(measured[kind].every((r: Json) => r.layout));
    if (kind === 'normal') assert(measured[kind].every((r: Json) => !r.violations.length), 'Unchanged Normal must fit');
    await record(kind, measured[kind]);
  }
  await record('pulse', plan.elements.map((e: Json, i: number) => {
    const states = ['normal', 'pulse-middle', 'scale'].map(k => measured[k][i]);
    const violations = states.flatMap(r => r.violations);
    try {assertPresentationPulseAnchorsV001(states.map(r => r.layout));}
    catch (error) {
      if (!(error instanceof TypeError) || !error.message.startsWith('Pulse Accent:')) throw error;
      violations.push({reason: error.message});
    }
    return {captionId: e.instructionId, states, violations};
  }));
  for (const kind of ['bounce', 'shake'] as const) {
    const preset = PRESENTATION_CAPTION_MOTION_PRESETS_V001[kind];
    await record(kind, plan.elements.map((original: Json) => {
      const e = {...original, presentationMotion: {presentation: preset.presentation, presetVersion: preset.version}};
      const violations: Json[] = []; let program, measuredStates;
      try {
        program = getPresentationCaptionMotionProgramV001({element: e, canvas: plan.canvas});
        const states = buildPresentationCaptionMotionStateElementsV001({element: e, canvas: plan.canvas});
        assert.deepEqual(states[0].element, original);
        measuredStates = states.map((s: Json) => ({state: s.state, ...inspect([s.element])}));
        violations.push(...measuredStates.flatMap((s: Json) => s.violations));
        assertPresentationCaptionMotionLayoutsV001({element: e, canvas: plan.canvas,
          layoutItems: measuredStates.map((s: Json) => s.items[0])});
      } catch (error) {
        if (!(error instanceof TypeError) || !error.message.startsWith('Caption motion:')) throw error;
        violations.push({reason: error.message});
      }
      return {captionId: original.instructionId, program: program ?? null, states: measuredStates ?? null, violations};
    }));
  }
  const request = await read(PLAN), adoption = await read(`${ARTIFACTS}/machine-adoption.json`);
  const meaning = await read(`${ARTIFACTS}/meaning-input.json`), base = await read(`${ARTIFACTS}/base-media-bindings.json`);
  const candidates = [...new Map(adoption.selectedCandidates.map((c: Json) => [c.candidateId, c])).values()] as Json[];
  const membership = new Map(meaning.orderedCandidates.flatMap((g: Json) => g.atomOccurrenceIds.map((id: string) => [id, g.candidateId])));
  const context = {digestId: request.planId, productionPurpose: request.productionRequest,
    contexts: candidates.map(c => ({contextId: c.candidateId, description: `${c.title}。${c.judgment.reason}`})),
    captionContextIds: plan.elements.map((e: Json) => {
      const ids = [...new Set(e.targetProvenance.sourceAtomIds.map((id: string) => membership.get(id)))];
      assert(ids.length === 1 && ids[0]); return {captionId: e.instructionId, contextId: ids[0]};
    }), observations, evidenceRefs: [...evidenceRefs, ref(await bind(`${ARTIFACTS}/machine-adoption.json`))],
    digestAudioSourceRef: ref(await bind(base.baseMedia.path))};
  await save(`${output}/context.json`, context);
  return {captionCount: plan.elements.length, contextPath: `${output}/context.json`, audioSource: context.digestAudioSourceRef.path};
}

/** Current orchestration consumes the native measurement binding, not the
 * retired Stage 1 single-preset choice. No old/fabricated AI answer is supplied. */
export async function prepareNativeInput() {
  const baselinePath = absolute(`${ARTIFACTS}/normal-plan.json`), contextPath = `${output}/context.json`;
  const audio = await loadBoundAudioEvidenceV005(`${output}/audio/digest/audio-candidates.json`);
  const input = buildPresentationFocusSelectionInputV005(await read(baselinePath), await read(contextPath), audio);
  const peaks = audio.sourceRefs.filter(r => path.basename(r.path) === 'acoustic-peaks.json');
  assert.equal(peaks.length, 1);
  const pulseTimingEvidence = {schemaVersion: 'auto-presentation-pulse-timing-v001',
    sourceRef: input.audioEvidence.sourceRef, candidatesRef: input.audioEvidence.candidatesRef,
    peaksRef: peaks[0], sampleRate: input.audioEvidence.sampleRate, sampleCount: input.audioEvidence.sampleCount,
    candidates: input.audioCandidates.map((c: Json) => ({candidateId: c.candidateId, peakIds: c.peaks.map((p: Json) => p.id)})),
    peaks: input.audioCandidates.flatMap((c: Json) => c.peaks.map((p: Json) => ({peakId: p.id,
      startSample: p.startSample, endSampleExclusive: p.endSampleExclusive, peakSample: p.peakSample})))};
  const sources = {baseline: ref(await bind(baselinePath)), context: ref(await bind(contextPath)), audio: audio.sourceRefs};
  await save(`${output}/measured-input.json`, {schemaVersion: 'new-material-presentation-measured-input-v001',
    sources, input, semanticDecision: 'pending-current-orchestration-v003'});
  await save(`${output}/native-decision-input.json`, {schemaVersion: 'presentation-focus-decision-input-v005',
    sources, pulseTimingEvidence, semanticDecision: 'pending-current-orchestration-v003',
    scope: 'Existing native timing IO only. No Stage 1 answer or selected preset is imported.'});
  return {captionCount: input.captions.length, audioCandidateCount: input.audioCandidates.length};
}

export async function prepareOrchestration() {
  const base = await read(`${ARTIFACTS}/base-media-bindings.json`);
  const media = await inspectRenderedMediaWithToolsV001(absolute(base.baseMedia.path), tools);
  const refs: Json = {};
  for (const [key, p] of Object.entries({canonicalEditPlan: `${ARTIFACTS}/edit-plan.json`,
    normalCaptionPlan: `${ARTIFACTS}/normal-plan.json`, canonicalTimeline: base.timeline.path,
    baseMedia: base.baseMedia.path, stage1JudgmentInput: `${output}/native-decision-input.json`})) refs[key] = await bind(p as string);
  const inventoryPath = `${output}/inventory.json`;
  await save(inventoryPath, {digestId: (await read(PLAN)).planId, refs, playbackClock: {sampleRate: media.audio.sampleRate}});
  const prepared = await buildOrchestrationInputFilesV001({inventoryPath, previousRequestPath: `${output}/measured-input.json`});
  await save(`${output}/saved/source-bindings.json`, prepared.source);
  await save(`${output}/saved/fresh-input.json`, prepared.input);
  await save(`${output}/input-provenance.json`, prepared.provenance);
  return {request: `${output}/saved/fresh-input.json`};
}

async function saved() {
  const source = await read(`${output}/saved/source-bindings.json`), state: Json = {};
  for (const name of ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord']) state[name] = await read(`${output}/saved/${name}.json`);
  const context = createOrchestrationContextV001(source), view = resolveOrchestrationDrawingViewV001({context, state});
  assert.deepEqual(state.captionOverrides.entries, []); assert.deepEqual(state.connectionOverrides.entries, []);
  return {source, state, context, view};
}

export async function acceptOrchestration(responsePath: string) {
  const source = await read(`${output}/saved/source-bindings.json`), input = await read(`${output}/saved/fresh-input.json`);
  const replyBytes = await readFile(absolute(responsePath), 'utf8');
  const context = createOrchestrationContextV001(source), state = fixOrchestrationJudgmentV001({context, input, replyBytes});
  await writeFile(`${output}/saved/raw-ai-response-v001.json`, replyBytes, {flag: 'wx'});
  for (const [name, value] of Object.entries(state)) await save(`${output}/saved/${name}.json`, value);
  const {view} = await saved();
  await save(`${output}/drawing-evidence.json`, exportOrchestrationDrawingViewEvidenceV001(view));
  return {counts: view.resolution.counts, frameCount: view.projection.displayFrameCount};
}

export async function background() {
  const {view} = await saved();
  return buildOrchestrationBackgroundV001({repositoryRoot: ROOT, outputDirectory: `${output}/background`,
    projection: view.projection, expectedProjectionSha256: view.projection.projectionSha256, ...tools});
}

export async function render() {
  const {source, state, context, view} = await saved(), background = await read(`${output}/background/proof.json`);
  assert.equal(background.status, 'passed'); assert.equal(background.projectionSha256, view.projection.projectionSha256);
  assert.deepEqual(background.concreteConnections, view.projection.connections);
  for (const b of [background.outputs.background, background.outputs.audio]) assert.deepEqual(await bind(b.path), b);
  const media = await inspectRenderedMediaWithToolsV001(background.outputs.background.path, tools);
  const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: `${output}/render-processes`});
  const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory: `${output}/render`,
    plan: view.projectedNormalPlan, presetRegistry: await read(registryPath),
    baseMediaPath: background.outputs.background.path, baseMediaInspection: {media},
    expectedFrameCount: view.projection.displayFrameCount, overlayAdapter: adapter(processObserver), processObserver,
    toolPaths: tools, serializePngAndFilters: true, runCounterfactualQc: true,
    counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, orchestrationDrawingView: view,
    orchestrationBackground: {projectionSha256: background.projectionSha256, displayFrameCount: background.displayFrameCount,
      video: background.outputs.background, audio: background.outputs.audio}});
  await save(`${output}/draw-result.json`, draw);
  assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
  assert.equal(draw.finalQc.status, 'passed'); assert.deepEqual(draw.resolvedPlan, view.resolvedPlan);
  assert.equal(draw.outputMedia.video.frameCount, view.projection.displayFrameCount);
  const encoded = await inspectRenderedMediaWithToolsV001(background.outputs.audio.path, tools);
  assert.equal(draw.outputMedia.audio.packetPayloadSha256, encoded.audio.packetPayloadSha256);
  const finalAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
    logicalSampleCount: view.projection.displayPlaybackSampleCount,
    sampleRate: view.projection.sourceClock.playbackSampleRate, ...tools});
  assertOrchestrationDrawingViewMatchesStateV001({view, context, state: (await saved()).state});
  const before = await bind(draw.workVideo);
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory, reservation: draw.reservation});
  assert.equal(publication.status, 'published');
  const video = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
  assert.equal(video.fileSha256, before.fileSha256);
  const result = {status: 'passed', video, publication, finalAudioClock, counts: view.resolution.counts,
    captionCount: view.resolvedPlan.elements.length, frameCount: view.projection.displayFrameCount,
    outputMedia: draw.outputMedia, finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc,
    humanQualityAdjustment: false, completedAt: new Date().toISOString()};
  await save(`${output}/first-draft-completion.json`, result);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [stage, input] = process.argv.slice(2);
  const stages: Record<string, () => Promise<unknown>> = {prepare: preparePresentation, native: prepareNativeInput,
    'prepare-orchestration': prepareOrchestration, orchestration: () => acceptOrchestration(input), background, render};
  assert(stages[stage]); const startedAt = new Date().toISOString(), start = performance.now();
  try {
    const result = await stages[stage]();
    await save(`${output}/execution/${stage}-${startedAt.replaceAll(':', '-')}.json`, {stage, startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000, status: 'completed'});
    console.log(JSON.stringify(result));
  } catch (error) {
    await save(`${output}/execution/${stage}-${startedAt.replaceAll(':', '-')}.json`, {stage, startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000, status: 'failed', error: String(error)});
    throw error;
  }
}

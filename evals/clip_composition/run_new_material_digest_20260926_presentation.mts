/** This source-specific adapter supplies current presentation entry points with
 * the new Digest's clocks and evidence. It does not add a palette or selector. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, ARTIFACTS, PLAN} from './run_new_material_digest_20260926.mts';
import {ARTIFACTS as CAPTIONS} from './run_new_material_digest_20260926_caption_retry.mts';
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
  exportOrchestrationDrawingViewEvidenceV001, assertOrchestrationDrawingViewMatchesStateV001,
  createOrchestrationJudgmentInputV001, fixJ16StagedOrchestrationJudgmentV001}
  from './presentation_orchestration_v001.mjs';
import {buildOrchestrationBackgroundV001, inspectOrchestrationEncodedAudioV001}
  from './presentation_orchestration_background_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';
import {buildDecisionsJ16RequestV001, reviewDecisionsJ16OrchestrationV001}
  from '../../runner/src/openai-decisions-j16-v001.js';
import {bindJ16TextV001, bindJ16RawV001, createJ16StageInputV001, createJ16LiveStageInputV001, replayJ16StageInputV001, J16_STAGE_ORIGIN_V001}
  from './presentation_j16_staged_boundary_v001.mjs';

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
  const plan = await read(`${CAPTIONS}/normal-plan.json`), registry = await read(registryPath);
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
  const meaning = await read(`${CAPTIONS}/meaning-input.json`), base = await read(`${ARTIFACTS}/base-media-bindings.json`);
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
  const baselinePath = absolute(`${CAPTIONS}/normal-plan.json`), contextPath = `${output}/context.json`;
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
    normalCaptionPlan: `${CAPTIONS}/normal-plan.json`, canonicalTimeline: base.timeline.path,
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

/** Explicit offline review beside the rich-answer receiver below. Neither the
 * normal accept command nor a production state is changed by this operation. */
export async function reviewDecisionsOrchestrationV001(specPath: string, outputDirectory: string) {
  const exactKeys = (value: Json, keys: string[]) => assert(value && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)));
  const readBound = async (file: Json) => {
    exactKeys(file, ['path', 'sha256', 'bytes']);
    assert(path.isAbsolute(file.path) && /^[a-f0-9]{64}$/.test(file.sha256)
      && Number.isSafeInteger(file.bytes) && file.bytes > 0);
    assert((await lstat(file.path)).isFile(), 'Offline review inputs must be regular files');
    const bytes = await readFile(file.path);
    assert.equal(bytes.length, file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    return bytes;
  };
  assert(path.isAbsolute(specPath) && (await lstat(specPath)).isFile());
  const specBytes = await readFile(specPath), spec = JSON.parse(specBytes.toString('utf8'));
  exactKeys(spec, ['schemaVersion', 'manifest', 'batchContextId', 'captionIndices', 'request', 'response', 'detailReply', 'sourceBindings']);
  assert.equal(spec.schemaVersion, 'zev-j16-offline-review-files-v001');
  assert(Array.isArray(spec.captionIndices) && typeof spec.batchContextId === 'string');
  const manifest = JSON.parse((await readBound(spec.manifest)).toString('utf8'));
  assert.equal(manifest.kind, 'offline-experiment-input-freeze-not-api-payload');
  const batches = manifest.batches.filter((row: Json) => row.context_id === spec.batchContextId);assert.equal(batches.length, 1);
  const batch = batches[0];
  const sourceRef = {path: absolute(path.join(manifest.runtime_directory, batch.file)), sha256: batch.sha256, bytes: batch.utf8_bytes};
  const sourceBytes = await readBound(sourceRef);
  const request = buildDecisionsJ16RequestV001(sourceBytes,
    {sha256: batch.sha256, bytes: batch.utf8_bytes, captionIds: batch.caption_ids}, spec.captionIndices);
  const requestBytes = await readBound(spec.request);
  assert.equal(requestBytes.toString('utf8'), JSON.stringify(request.body), 'Original request byte readback differs');
  const origins = Object.keys(manifest.source_fingerprints).filter(key => key.endsWith('/presentation/saved/fresh-input.json'));
  assert.equal(origins.length, 1);
  const inputRef = {path: absolute(origins[0]), ...manifest.source_fingerprints[origins[0]]};
  const inputBytes = await readBound(inputRef), responseBytes = await readBound(spec.response), replyBytes = await readBound(spec.detailReply);
  const sourceBindingsBytes = await readBound(spec.sourceBindings), source = JSON.parse(sourceBindingsBytes.toString('utf8'));
  const context = createOrchestrationContextV001(source);
  const review = reviewDecisionsJ16OrchestrationV001({request, inputBytes, inputBinding: inputRef,
    responseBytes, responseBinding: spec.response, replyBytes, replyBinding: spec.detailReply,
    assertDetailedReply: (input, replyBytes) => {fixOrchestrationJudgmentV001({context, input, replyBytes});}});
  const files = {spec: {path: specPath, bytes: specBytes.length, sha256: createHash('sha256').update(specBytes).digest('hex')},
    manifest: spec.manifest, j16Source: sourceRef, input: inputRef, request: spec.request,
    response: spec.response, detailReply: spec.detailReply, sourceBindings: spec.sourceBindings};
  // Re-read each bound file before the new review write; no original is copied or updated.
  for (const file of Object.values(files)) await readBound(file);
  const reviewRoot = absolute('runtime/artifacts/openai-decisions-j16-offline-review-v001');
  assert(path.isAbsolute(outputDirectory) && path.dirname(outputDirectory) === reviewRoot
    && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(path.basename(outputDirectory)), 'Explicit new offline review directory required');
  assert.equal(await realpath(path.dirname(reviewRoot)), path.dirname(reviewRoot));
  await mkdir(reviewRoot, {recursive: true});
  assert((await lstat(reviewRoot)).isDirectory());assert.equal(await realpath(reviewRoot), reviewRoot);
  await mkdir(outputDirectory); // Existing output, including a symlink, is never reused.
  const reviewPath = path.join(outputDirectory, 'review.json'), filesPath = path.join(outputDirectory, 'review-files.json');
  const reviewText = JSON.stringify(review, null, 2) + '\n', filesText = JSON.stringify(files, null, 2) + '\n';
  await writeFile(reviewPath, reviewText, {flag: 'wx', mode: 0o600});
  await writeFile(filesPath, filesText, {flag: 'wx', mode: 0o600});
  assert.equal(await readFile(reviewPath, 'utf8'), reviewText);assert.equal(await readFile(filesPath, 'utf8'), filesText);
  return {mode: 'offline-review', status: review.status, reviewPath, filesPath, reviewSha256: review.reviewSha256,
    counts: review.counts, completeJ16Coverage: review.completeJ16Coverage, readyForFormalAcceptance: false};
}


const stagedRoot = absolute('runtime/artifacts/openai-decisions-j16-staged-v001');
function exactStagedKeys(value: Json, keys: string[]) {
  assert(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)));
}
async function stagedFile(pathname: string) {
  assert(path.isAbsolute(pathname) && (await lstat(pathname)).isFile(), 'Regular absolute stage file required');
  const bytes = await readFile(pathname), text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  return {ref: {path: pathname, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}, text};
}
async function stagedReadBound(ref: Json) {
  exactStagedKeys(ref, ['path', 'sha256', 'bytes']);
  assert(/^[a-f0-9]{64}$/.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0);
  const actual = await stagedFile(ref.path);assert.deepEqual(actual.ref, ref);return actual.text;
}
async function stagedDirectory(directory: string, create: boolean) {
  assert(path.isAbsolute(directory) && path.dirname(directory) === stagedRoot
    && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(path.basename(directory)), 'Explicit staged candidate directory required');
  assert.equal(await realpath(path.dirname(stagedRoot)), path.dirname(stagedRoot));
  if (create) await mkdir(stagedRoot, {recursive: true});
  assert((await lstat(stagedRoot)).isDirectory());assert.equal(await realpath(stagedRoot), stagedRoot);
  if (create) await mkdir(directory); // Exclusive; no previous output or symlink reuse.
  assert((await lstat(directory)).isDirectory());assert.equal(await realpath(directory), directory);
}
async function stagedSave(directory: string, name: string, text: string) {
  const target = path.join(directory, name);await writeFile(target, text, {flag: 'wx', mode: 0o600});
  const saved = await stagedFile(target);assert.equal(saved.text, text);return saved.ref;
}

/** Explicit mock preparation only. The original observation producer is unchanged. */
export async function prepareJ16StagedInputFilesV001(specPath: string, directory: string) {
  const specFile = await stagedFile(specPath), spec = JSON.parse(specFile.text);
  exactStagedKeys(spec, ['schemaVersion', 'originalInput', 'sourceBindings', 'batches']);
  assert.equal(spec.schemaVersion, 'presentation-j16-stage-files-v001');assert(Array.isArray(spec.batches));
  const originalFiles = [specFile.ref, spec.originalInput, spec.sourceBindings];
  const inputText = await stagedReadBound(spec.originalInput), sourceText = await stagedReadBound(spec.sourceBindings);
  const input = JSON.parse(inputText), source = JSON.parse(sourceText), context = createOrchestrationContextV001(source);
  // Reuse the existing original-input reconstruction, never widen its whitelist.
  assert.deepEqual(input, createOrchestrationJudgmentInputV001({context, connectionPolicy: input.connectionPolicy,
    evidence: Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'].map(k => [k, input[k]]))}));
  const batches = [];
  for (const batch of spec.batches) {
    exactStagedKeys(batch, ['sceneId', 'captionIndices', 'source', 'request', 'response']);
    const values: Json = {sceneId: batch.sceneId, captionIndices: batch.captionIndices};
    for (const key of ['source', 'request', 'response']) {values[key] = bindJ16TextV001(await stagedReadBound(batch[key]));originalFiles.push(batch[key]);}
    batches.push(values as any);
  }
  const stageInput = createJ16StageInputV001({originalInput: bindJ16TextV001(inputText), batches});
  for (const ref of originalFiles) await stagedReadBound(ref);
  await stagedDirectory(directory, true);
  const stageRef = await stagedSave(directory, 'stage-input.json', JSON.stringify(stageInput, null, 2) + '\n');
  const sourceRef = await stagedSave(directory, 'source-bindings.json', sourceText);
  const files = {schemaVersion: 'presentation-j16-stage-prepared-files-v001', mode: 'mock', originalFiles,
    stageInput: stageRef, sourceBindings: sourceRef};
  await stagedSave(directory, 'stage-files.json', JSON.stringify(files, null, 2) + '\n');
  return {mode: 'mock', status: stageInput.status, stageInputPath: stageRef.path,
    stageInputSha256: stageInput.stageInputSha256, targetCount: stageInput.targetCaptionIds.length,
    missingCount: stageInput.missingCaptionIds.length, issues: stageInput.issues, productionActivated: false};
}

/** Existing validateState, reached through resolveDrawingView, is the semantic
 * replay check. This reader only checks saved byte identities and original IO. */
export async function readJ16StagedCandidateFilesV001(directory: string) {
  await stagedDirectory(directory, false);
  const manifest = JSON.parse((await stagedFile(path.join(directory, 'files.json'))).text);
  exactStagedKeys(manifest, ['schemaVersion', 'mode', 'sourceBindings', 'state']);
  assert.equal(manifest.schemaVersion, 'presentation-j16-candidate-files-v001');assert.equal(manifest.mode, 'mock');
  assert.equal(manifest.state.path, path.join(directory, 'state.json'));
  const source = JSON.parse(await stagedReadBound(manifest.sourceBindings)), state = JSON.parse(await stagedReadBound(manifest.state));
  assert.equal(state.selectionRecord.origin.kind, J16_STAGE_ORIGIN_V001);
  const context = createOrchestrationContextV001(source), view = resolveOrchestrationDrawingViewV001({context, state});
  return {mode: 'mock', status: 'candidate-validated', recordSha256: state.selectionRecord.recordSha256,
    stageInputSha256: state.selectionRecord.origin.stageInput.stageInputSha256,
    counts: view.resolution.counts, productionActivated: false};
}

/** New candidate records only; no normal accept, queue, render or authority change. */
export async function acceptJ16StagedInputFilesV001(preparedDirectory: string, replyPath: string, directory: string) {
  await stagedDirectory(preparedDirectory, false);
  const filesFile = await stagedFile(path.join(preparedDirectory, 'stage-files.json')), files = JSON.parse(filesFile.text);
  exactStagedKeys(files, ['schemaVersion', 'mode', 'originalFiles', 'stageInput', 'sourceBindings']);
  assert.equal(files.schemaVersion, 'presentation-j16-stage-prepared-files-v001');assert.equal(files.mode, 'mock');
  assert.equal(files.stageInput.path, path.join(preparedDirectory, 'stage-input.json'));
  assert.equal(files.sourceBindings.path, path.join(preparedDirectory, 'source-bindings.json'));
  assert(Array.isArray(files.originalFiles));for (const ref of files.originalFiles) await stagedReadBound(ref);
  const stageText = await stagedReadBound(files.stageInput), sourceText = await stagedReadBound(files.sourceBindings);
  const stageInput = JSON.parse(stageText), source = JSON.parse(sourceText), replyFile = await stagedFile(replyPath);
  const context = createOrchestrationContextV001(source), state = fixJ16StagedOrchestrationJudgmentV001({context,
    stageInput, stageReply: bindJ16TextV001(replyFile.text)});
  resolveOrchestrationDrawingViewV001({context, state});
  // Re-read before writes; compile stores all semantic provenance in existing origin.
  for (const ref of [...files.originalFiles, filesFile.ref, files.stageInput, files.sourceBindings, replyFile.ref]) await stagedReadBound(ref);
  await stagedDirectory(directory, true);
  const stateRef = await stagedSave(directory, 'state.json', JSON.stringify(state, null, 2) + '\n');
  const manifest = {schemaVersion: 'presentation-j16-candidate-files-v001', mode: 'mock', sourceBindings: files.sourceBindings, state: stateRef};
  await stagedSave(directory, 'files.json', JSON.stringify(manifest, null, 2) + '\n');
  return {...await readJ16StagedCandidateFilesV001(directory), statePath: stateRef.path};
}


/** Live IO has its own schema and commands. Raw response bytes can be empty;
 * this does not weaken any existing text/mock reader. */
async function liveStageRead(ref: Json, kind: 'text' | 'raw' = 'text') {
  exactStagedKeys(ref, ['path', 'sha256', 'bytes']);
  assert(path.isAbsolute(ref.path) && /^[a-f0-9]{64}$/.test(ref.sha256)
    && Number.isSafeInteger(ref.bytes) && (kind === 'raw' ? ref.bytes >= 0 : ref.bytes > 0));
  assert((await lstat(ref.path)).isFile(), 'Regular live stage file required');
  assert.equal(await realpath(ref.path), ref.path, 'Live file symlink is not admitted');
  const bytes = await readFile(ref.path);
  assert.equal(bytes.length, ref.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256);
  return kind === 'raw' ? bindJ16RawV001(bytes) : bindJ16TextV001(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
}

export async function prepareJ16LiveStagedInputFilesV001(specPath: string, directory: string) {
  const specFile = await stagedFile(specPath), spec = JSON.parse(specFile.text);
  exactStagedKeys(spec, ['schemaVersion', 'originalInput', 'sourceBindings', 'authorization', 'requestManifest', 'batches']);
  assert.equal(spec.schemaVersion, 'presentation-j16-live-stage-files-v001');assert(Array.isArray(spec.batches));
  const originalFiles: Array<{ref: Json; kind: 'text' | 'raw'}> = [{ref: specFile.ref, kind: 'text'}];
  const readOriginal = async (ref: Json, kind: 'text' | 'raw' = 'text') => {
    const bound = await liveStageRead(ref, kind);originalFiles.push({ref, kind});return bound;
  };
  const originalInput = await readOriginal(spec.originalInput) as any;
  const sourceBinding = await readOriginal(spec.sourceBindings) as any;
  const authorization = await readOriginal(spec.authorization) as any;
  const requestManifest = await readOriginal(spec.requestManifest) as any;
  const input = JSON.parse(originalInput.text), source = JSON.parse(sourceBinding.text), context = createOrchestrationContextV001(source);
  assert.deepEqual(input, createOrchestrationJudgmentInputV001({context, connectionPolicy: input.connectionPolicy,
    evidence: Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'].map(k => [k, input[k]]))}));
  const permission = JSON.parse(authorization.text), manifest = JSON.parse(requestManifest.text);
  assert.equal(directory, permission.outputRoots[1]);assert.deepEqual(permission.sourceBindings, spec.sourceBindings);
  assert.deepEqual(manifest.sourceBindings, spec.sourceBindings);assert.equal(manifest.input.path, spec.originalInput.path);
  const batches = [];
  for (const batch of spec.batches) {
    exactStagedKeys(batch, ['sceneId', 'captionIndices', 'source', 'request', 'response', 'attempt', 'transport']);
    const row = manifest.requests.find((r: Json) => r.sceneId === batch.sceneId);assert(row);
    assert.deepEqual(batch.source, row.source);assert.deepEqual(batch.request, row.request);
    assert.equal(batch.response.path, path.join(permission.outputRoots[0],batch.sceneId+'.raw.bin'));
    assert.equal(batch.attempt.path, path.join(permission.outputRoots[0],batch.sceneId+'.attempt.json'));
    assert.equal(batch.transport.path, path.join(permission.outputRoots[0],batch.sceneId+'.transport.json'));
    const values: Json = {sceneId: batch.sceneId, captionIndices: batch.captionIndices};
    for (const key of ['source', 'request', 'response', 'attempt', 'transport']) values[key] = await readOriginal(batch[key], key === 'response' ? 'raw' : 'text');
    batches.push(values as any);
  }
  const stageInput = createJ16LiveStageInputV001({originalInput, authorization, requestManifest, batches});
  for (const {ref,kind} of originalFiles) await liveStageRead(ref,kind);
  await stagedDirectory(directory,true);
  const stageRef = await stagedSave(directory,'stage-input.json',JSON.stringify(stageInput,null,2)+'\n');
  const sourceRef = await stagedSave(directory,'source-bindings.json',sourceBinding.text);
  await stagedSave(directory,'stage-files.json',JSON.stringify({schemaVersion:'presentation-j16-live-stage-prepared-files-v001',mode:'live',
    originalFiles,stageInput:stageRef,sourceBindings:sourceRef},null,2)+'\n');
  return await readJ16LiveStagedInputFilesV001(directory);
}

async function loadJ16LivePrepared(directory: string) {
  await stagedDirectory(directory,false);
  const file = await stagedFile(path.join(directory,'stage-files.json')), files = JSON.parse(file.text);
  exactStagedKeys(files,['schemaVersion','mode','originalFiles','stageInput','sourceBindings']);
  assert.equal(files.schemaVersion,'presentation-j16-live-stage-prepared-files-v001');assert.equal(files.mode,'live');
  assert.equal(files.stageInput.path,path.join(directory,'stage-input.json'));
  assert.equal(files.sourceBindings.path,path.join(directory,'source-bindings.json'));
  assert(Array.isArray(files.originalFiles));
  for (const item of files.originalFiles) {exactStagedKeys(item,['ref','kind']);assert(['text','raw'].includes(item.kind));await liveStageRead(item.ref,item.kind);}
  const stageInput = JSON.parse(await stagedReadBound(files.stageInput)), source = JSON.parse(await stagedReadBound(files.sourceBindings));
  assert.equal(stageInput.schemaVersion,'presentation-j16-live-stage-input-v001');assert.equal(stageInput.mode,'live');
  replayJ16StageInputV001(stageInput); // Same pure reconstruction as compile/validateState, including held results.
  const permission = JSON.parse(stageInput.authorization.text);assert.equal(permission.outputRoots[1],directory);
  const context = createOrchestrationContextV001(source), input = JSON.parse(stageInput.originalInput.text);
  assert.deepEqual(input,createOrchestrationJudgmentInputV001({context,connectionPolicy:input.connectionPolicy,
    evidence:Object.fromEntries(['productionPurpose','captions','contexts','observations','audioEvidence','audioCandidates'].map(k=>[k,input[k]]))}));
  return {file,files,stageInput,source,context,permission};
}
export async function readJ16LiveStagedInputFilesV001(directory: string) {
  const {files,stageInput} = await loadJ16LivePrepared(directory);
  return {mode:'live',status:stageInput.status,stageInputPath:files.stageInput.path,stageInputSha256:stageInput.stageInputSha256,
    targetCount:stageInput.targetCaptionIds.length,missingCount:stageInput.missingCaptionIds.length,
    unattemptedSceneIds:stageInput.unattemptedSceneIds,issues:stageInput.issues,productionActivated:false};
}
export async function readJ16LiveStagedCandidateFilesV001(directory: string) {
  await stagedDirectory(directory,false);
  const manifest = JSON.parse((await stagedFile(path.join(directory,'files.json'))).text);
  exactStagedKeys(manifest,['schemaVersion','mode','preparedFiles','sourceBindings','state']);
  assert.equal(manifest.schemaVersion,'presentation-j16-live-candidate-files-v001');assert.equal(manifest.mode,'live');
  assert.equal(manifest.state.path,path.join(directory,'state.json'));
  await liveStageRead(manifest.preparedFiles);
  assert.equal(path.basename(manifest.preparedFiles.path),'stage-files.json');
  const prepared = await loadJ16LivePrepared(path.dirname(manifest.preparedFiles.path));
  assert.equal(directory,prepared.permission.outputRoots[2]);assert.deepEqual(manifest.sourceBindings,prepared.files.sourceBindings);
  const state = JSON.parse(await stagedReadBound(manifest.state));
  assert.equal(state.selectionRecord.origin.kind,J16_STAGE_ORIGIN_V001);
  assert.deepEqual(state.selectionRecord.origin.stageInput,prepared.stageInput);
  const view = resolveOrchestrationDrawingViewV001({context:prepared.context,state}); // Existing validateState, no new semantic validator.
  return {mode:'live',status:'candidate-validated',recordSha256:state.selectionRecord.recordSha256,
    stageInputSha256:state.selectionRecord.origin.stageInput.stageInputSha256,counts:view.resolution.counts,productionActivated:false};
}
export async function acceptJ16LiveStagedInputFilesV001(preparedDirectory: string, replyPath: string, directory: string) {
  const prepared = await loadJ16LivePrepared(preparedDirectory);
  assert.equal(directory,prepared.permission.outputRoots[2]);
  const replyFile = await stagedFile(replyPath);
  const state = fixJ16StagedOrchestrationJudgmentV001({context:prepared.context,stageInput:prepared.stageInput,stageReply:bindJ16TextV001(replyFile.text)});
  resolveOrchestrationDrawingViewV001({context:prepared.context,state});
  await loadJ16LivePrepared(preparedDirectory);await stagedReadBound(replyFile.ref);
  await stagedDirectory(directory,true);
  const stateRef = await stagedSave(directory,'state.json',JSON.stringify(state,null,2)+'\n');
  await stagedSave(directory,'files.json',JSON.stringify({schemaVersion:'presentation-j16-live-candidate-files-v001',mode:'live',
    preparedFiles:prepared.file.ref,sourceBindings:prepared.files.sourceBindings,state:stateRef},null,2)+'\n');
  return {...await readJ16LiveStagedCandidateFilesV001(directory),statePath:stateRef.path};
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
  const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory:
    absolute('evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-v001'),
    plan: view.projectedNormalPlan, presetRegistry: await read(registryPath),
    baseMediaPath: background.outputs.background.path, baseMediaInspection: {media},
    expectedFrameCount: view.projection.displayFrameCount, overlayAdapter: adapter(processObserver), processObserver,
    toolPaths: tools, serializePngAndFilters: true, runCounterfactualQc: true,
    counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, orchestrationDrawingView: view,
    orchestrationBackground: {projectionSha256: background.projectionSha256, displayFrameCount: background.displayFrameCount,
      video: background.outputs.background, audio: background.outputs.audio}});
  await save(`${output}/draw-result-attempt-003.json`, draw);
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
  const [stage, input, reviewDirectory, candidateDirectory] = process.argv.slice(2);
  if (stage === 'prepare-j16-live-stage') {
    assert.equal(process.argv.slice(2).length,3);console.log(JSON.stringify(await prepareJ16LiveStagedInputFilesV001(input,reviewDirectory)));
  } else if (stage === 'read-j16-live-input') {
    assert.equal(process.argv.slice(2).length,2);console.log(JSON.stringify(await readJ16LiveStagedInputFilesV001(input)));
  } else if (stage === 'accept-j16-live-stage') {
    assert.equal(process.argv.slice(2).length,4);console.log(JSON.stringify(await acceptJ16LiveStagedInputFilesV001(input,reviewDirectory,candidateDirectory)));
  } else if (stage === 'read-j16-live-stage') {
    assert.equal(process.argv.slice(2).length,2);console.log(JSON.stringify(await readJ16LiveStagedCandidateFilesV001(input)));
  } else if (stage === 'prepare-j16-stage') {
    assert.equal(process.argv.slice(2).length, 3);
    console.log(JSON.stringify(await prepareJ16StagedInputFilesV001(input, reviewDirectory)));
  } else if (stage === 'accept-j16-stage') {
    assert.equal(process.argv.slice(2).length, 4);
    console.log(JSON.stringify(await acceptJ16StagedInputFilesV001(input, reviewDirectory, candidateDirectory)));
  } else if (stage === 'read-j16-stage') {
    assert.equal(process.argv.slice(2).length, 2);
    console.log(JSON.stringify(await readJ16StagedCandidateFilesV001(input)));
  } else if (stage === 'review-decisions') {
    assert.equal(process.argv.slice(2).length, 3);
    console.log(JSON.stringify(await reviewDecisionsOrchestrationV001(input, reviewDirectory)));
  } else {
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
}

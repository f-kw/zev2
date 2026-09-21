/** R1-B short candidates. Saved caption repairs enter the existing common renderer.
 * Old Q5 content-edit validators keep their unchanged-caption invariants. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, lstat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadR1CaptionRepairsV001, projectR1CaptionRangeV001} from './r1-caption-plan.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {fixAutoPresentationProposalV001, createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001, AUTO_PRESENTATION_RULES_REF_V009} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from '../../evals/clip_composition/presentation_integrity_state_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {createPresentationNativeAssetCacheV001} from '../../evals/clip_composition/presentation_native_asset_cache_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const composition = path.join(repo, 'evals/clip_composition');
const stages = path.join(composition, 'outputs/presentation/stage4-editing-20260918-v001');
const registryPath = path.join(composition, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const toolPaths = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
  imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'),
  layoutInspectorPath: path.join(composition, 'inspect_presentation_render_layout_v001.ts')};
const json = async file => JSON.parse(await readFile(file));
const clone = structuredClone;
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const count = value => value.endFrameExclusive - value.startFrame;
async function bind(file) {
  assert(path.isAbsolute(file)); const info = await lstat(file); assert(info.isFile() && !info.isSymbolicLink());
  const hash = createHash('sha256'); for await (const bytes of createReadStream(file)) hash.update(bytes);
  return {path: file, fileSha256: hash.digest('hex'), bytes: info.size};
}
async function check(ref) {const current = await bind(ref.path); assert.equal(current.fileSha256, ref.fileSha256, ref.path);
  if (ref.bytes !== undefined) assert.equal(current.bytes, ref.bytes); return current;}
async function save(file, value) {await writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); return bind(file);}
async function absent(file) {try {await lstat(file); assert.fail('output already exists: ' + file);} catch (error) {if (error.code !== 'ENOENT') throw error;}}
async function command(executable, args, {hashOutput = false, evidencePath} = {}) {
  const value = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = ''; const hash = createHash('sha256');
    child.stdout.on('data', bytes => hashOutput ? hash.update(bytes) : stdout += bytes);
    child.stderr.on('data', bytes => stderr = (stderr + bytes).slice(-65536));
    child.once('error', reject); child.once('close', (code, signal) => resolve({code, signal, stdout,
      ...(hashOutput ? {outputSha256: hash.digest('hex')} : {}), stderr}));
  });
  if (evidencePath) await save(evidencePath, {executable, args, ...value});
  assert.equal(value.code, 0, value.stderr); assert.equal(value.signal, null); return value;
}

function inheritedSelections({point, normalPlan, projection, originalView}) {
  const selections = [], provenance = [];
  if (![6, 7].includes(point)) return {selections, provenance};
  const paletteId = point === 6 ? 'cool' : 'warm';
  for (const caption of normalPlan.elements) {
    const mapping = projection.parentChildMappings.find(row => row.children.some(child => child.captionId === caption.instructionId));
    const passage = mapping?.children.find(child => child.captionId === caption.instructionId);
    const parentId = mapping?.parentCaptionId ?? caption.instructionId;
    const parent = originalView.projectedNormalPlan.elements.find(row => row.instructionId === parentId);
    const original = originalView.effectiveSelections.find(row => row.captionId === parentId);
    assert(parent && original, 'every R1 caption must have its original presentation source');
    const span = passage ?? {startCodePoint: 0, endCodePointExclusive: [...parent.text].length};
    assert.equal([...parent.text].slice(span.startCodePoint, span.endCodePointExclusive).join(''), caption.text);
    assert(['Normal', 'Panel accent'].includes(original.selection.role), 'these four cases do not silently migrate other effect types');
    const inherited = original.selection.role === 'Panel accent' ? {...original.selection, paletteId: 'ivory'} : original.selection;
    const local = original.selection.role === 'Panel accent' ? {...original.selection, paletteId} : original.selection;
    if (local.role !== 'Normal') selections.push({captionId: caption.instructionId, inherited, local});
    provenance.push({captionId: caption.instructionId, parentCaptionId: parentId,
      startCodePoint: span.startCodePoint, endCodePointExclusive: span.endCodePointExclusive, text: caption.text,
      originalSelection: clone(original.selection), inheritedSelection: inherited, localSelection: local,
      treatment: local.role === 'Normal' ? 'original Normal retained'
        : 'original whole-caption Panel inherited by exact child passage; finite palette explicitly selected for this review candidate',
      paletteChoiceOwner: local.role === 'Normal' ? null : 'Codex within the authorized R3 local candidate scope; not a new automatic judgment or human adoption'});
  }
  return {selections, provenance};
}

/** Preparation performs only reference reads and immutable JSON writes. Native drawing is a separate command. */
export async function prepareR1CaptionShortJobsV001({casesPath, outputDirectory}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory}); await absent(outputDirectory);
  const casesRef = await bind(casesPath), cases = await json(casesPath); assert.equal(cases.schemaVersion, 'r1-caption-cases-v001');
  const drawingPath = path.join(stages, 'quality-q4-20260920-v001/c-all-run-v001/drawing-evidence.json');
  const drawingRef = await bind(drawingPath), originalView = restoreOrchestrationDrawingViewEvidenceV001(await json(drawingPath));
  await mkdir(outputDirectory, {recursive: true}); const jobs = [];
  for (const group of cases.groups) {
    await check(group.savedRef); const repaired = await loadR1CaptionRepairsV001({savedPath: group.savedRef.path});
    for (const sample of group.samples) {
      await check(sample.projectionRef); await check(sample.normalPlanRef);
      const projection = await json(sample.projectionRef.path);
      assert.deepEqual(projectR1CaptionRangeV001({resolved: repaired, range: sample.range,
        targetClockId: projection.targetClockId}), projection);
      const normalPlan = await json(sample.normalPlanRef.path); assert.deepEqual(normalPlan, projection.normalPlan);
      const dir = path.join(outputDirectory, 'point-' + String(sample.point).padStart(2, '0')); await mkdir(dir);
      let background;
      if ([6, 7].includes(sample.point)) {
        const code = sample.point === 6 ? 'Q4-C001' : 'Q4-C002';
        const completionPath = path.join(stages, 'quality-q4-20260920-v001/candidates-v003/' + code + '-evidence/completion.json');
        const saved = await json(completionPath); assert.equal(saved.status, 'passed'); assert.deepEqual(saved.range, sample.range);
        assert.equal(saved.expectedFrameCount, sample.frameCount); assert.equal(saved.viewSha256, originalView.viewSha256);
        background = {kind: 'saved-lossless-background-and-aac', completionRef: await bind(completionPath),
          proofRef: await check(saved.backgroundProofRef), videoRef: await check(saved.background.outputs.background),
          audioRef: await check(saved.background.outputs.audio), originalRange: sample.range,
          expectedFrameCount: sample.frameCount, noNewContentCut: true};
      } else {
        const suffix = sample.point === 9 ? 'quality-q5-1-20260921-v002/render-evidence-v003/normal/completion.json'
          : 'quality-q5-2-20260921-v001/render-evidence-v002/normal/completion.json';
        const completionPath = path.join(stages, suffix), saved = await json(completionPath);
        assert.equal(saved.status, 'passed'); assert.equal(saved.expectedFrameCount, sample.frameCount);
        const comparison = await json(saved.comparisonRef.path); assert.deepEqual(comparison.afterGlobalRange, sample.range);
        if (sample.point === 9) {assert.deepEqual(saved.mediaOmission, range(12153, 12212)); assert.equal(saved.hiddenCaptionIds.length, 1);}
        else {assert.deepEqual(saved.addition.sourceVideoRange, range(227963, 228308)); assert.equal(comparison.addedFrameCount, 345);}
        background = {kind: 'saved-q5-subtitle-free-base', completionRef: await bind(completionPath),
          baseRef: await check(saved.baseRef), editPlanRef: await check(saved.editPlanRef), comparisonRef: await check(saved.comparisonRef),
          originalRange: sample.range, expectedFrameCount: sample.frameCount,
          contentEdit: sample.point === 9 ? {mediaOmission: saved.mediaOmission, hiddenCaptionIds: saved.hiddenCaptionIds,
            targetMediaRetention: saved.targetMediaRetention} : {addition: saved.addition, addedFrameCount: comparison.addedFrameCount},
          noNewContentCut: true};
      }
      const migration = inheritedSelections({point: sample.point, normalPlan, projection, originalView});
      const decisionRef = await save(path.join(dir, 'decision-context.json'), {
        schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null,
        originalDecisionInputRef: clone(originalView.sourceRefs.decisionInputRef), originalDrawingEvidenceRef: drawingRef,
        captionRepairRef: group.savedRef, captionProjectionRef: sample.projectionRef, policyRef: cases.policyRef,
        sourceClockId: projection.sourceClockId, targetClockId: projection.targetClockId,
        reasonForNullPulseEvidence: 'these local cases contain only original Normal and Panel selections; no new Pulse peak is inferred',
        selectionProvenance: migration.provenance,
        appearanceStatus: 'explicit local review candidate; not a new automatic judgment or final adoption'});
      const loaded = await loadAutoPresentationContextV001({baselinePath: sample.normalPlanRef.path,
        decisionInputPath: decisionRef.path, renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V009});
      let proposalRef = null, autoProposal;
      if ([6, 7].includes(sample.point)) {
        autoProposal = fixAutoPresentationProposalV001({...loaded, proposal: {schemaVersion: 'auto-presentation-proposal-v001',
          context: loaded.context, targetCaptionIds: normalPlan.elements.map(row => row.instructionId), completion: 'complete',
          effects: migration.selections.map(row => ({captionId: row.captionId, ...row.inherited})), exceptions: []}});
        proposalRef = await save(path.join(dir, 'inherited-fixed-proposal.json'), autoProposal);
      }
      let overrides = createAutoPresentationOverridesV001({...loaded, autoProposal});
      for (const row of migration.selections) overrides = editAutoPresentationOverrideV001({...loaded, autoProposal,
        overrides, captionId: row.captionId, selection: row.local});
      const overridesRef = await save(path.join(dir, 'local-overrides.json'), overrides);
      const resolved = resolveAutoPresentationV001({...loaded, autoProposal, overrides});
      const resolvedRef = await save(path.join(dir, 'resolved-plan.json'), resolved.plan);
      const appearanceRef = await save(path.join(dir, 'appearance-evidence.json'), {
        schemaVersion: 'r1-caption-appearance-transfer-v001', originalDrawingEvidenceRef: drawingRef,
        captionProjectionRef: sample.projectionRef, originalDecisionInputRef: clone(originalView.sourceRefs.decisionInputRef),
        source: 'saved Q4 whole-caption roles for 6/7; saved Q5 Normal for 9/10',
        selections: migration.provenance, resolution: resolved.resolution,
        paletteMode: [6, 7].includes(sample.point) ? 'explicit local override' : 'unchanged Normal',
        machinePaletteDecisionPerformed: false, humanQuality: 'not-evaluated'});
      const job = {schemaVersion: 'r1-caption-short-render-job-v001', point: sample.point, casesRef,
        repairRef: group.savedRef, projectionRef: sample.projectionRef, normalPlanRef: sample.normalPlanRef,
        decisionRef, proposalRef, overridesRef, resolvedRef, appearanceRef, background,
        outputDirectory: path.join(dir, 'render'), evidenceDirectory: path.join(dir, 'render-evidence'),
        nativeAssetDirectory: path.join(outputDirectory, 'native-assets'),
        expectedFrameCount: sample.frameCount, formalTrustChanged: false};
      const jobRef = await save(path.join(dir, 'job.json'), job);
      await verifyR1CaptionShortJobV001({jobPath: jobRef.path});
      jobs.push({point: sample.point, jobRef, frameCount: sample.frameCount, normalPlanRef: sample.normalPlanRef,
        resolvedRef, appearanceRef, background});
    }
  }
  const result = {schemaVersion: 'r1-caption-short-jobs-v001', casesRef, jobs};
  const manifestRef = await save(path.join(outputDirectory, 'jobs.json'), result); return {manifestRef, jobs};
}

export async function verifyR1CaptionShortJobV001({jobPath}) {
  const job = await json(jobPath); assert.equal(job.schemaVersion, 'r1-caption-short-render-job-v001');
  const refs = [job.casesRef, job.repairRef, job.projectionRef, job.normalPlanRef, job.decisionRef,
    ...(job.proposalRef ? [job.proposalRef] : []), job.overridesRef, job.resolvedRef, job.appearanceRef,
    ...Object.entries(job.background).filter(([key]) => key.endsWith('Ref')).map(([, value]) => value)];
  for (const ref of refs) await check(ref);
  const repaired = await loadR1CaptionRepairsV001({savedPath: job.repairRef.path});
  const projection = await json(job.projectionRef.path);
  assert.deepEqual(projectR1CaptionRangeV001({resolved: repaired, range: projection.sourceRange,
    targetClockId: projection.targetClockId}), projection);
  const normal = await json(job.normalPlanRef.path); assert.deepEqual(normal, projection.normalPlan);
  assert.equal(job.expectedFrameCount, projection.frameCount); assert.equal(job.background.expectedFrameCount, projection.frameCount);
  assert.deepEqual(job.background.originalRange, projection.sourceRange);
  const loaded = await loadAutoPresentationV001({baselinePath: job.normalPlanRef.path, decisionInputPath: job.decisionRef.path,
    ...(job.proposalRef ? {autoProposalPath: job.proposalRef.path} : {}), overridesPath: job.overridesRef.path});
  assert.deepEqual(loaded.baselinePlan, normal);
  const resolved = resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
  assert.deepEqual(resolved.plan, await json(job.resolvedRef.path));
  assert.deepEqual(resolved.resolution, (await json(job.appearanceRef.path)).resolution);
  return {job, projection, loaded, resolved, refs};
}

async function losslessBase(job, evidenceDirectory) {
  if (job.background.kind === 'saved-q5-subtitle-free-base') return {baseRef: job.background.baseRef,
    preservation: {kind: 'same-saved-base-bytes', contentEdit: job.background.contentEdit}};
  assert.equal(job.background.kind, 'saved-lossless-background-and-aac');
  const basePath = path.join(evidenceDirectory, 'base-lossless-video-original-audio.mp4'); await absent(basePath);
  const args = ['-hide_banner', '-loglevel', 'error', '-n', '-i', job.background.videoRef.path,
    '-i', job.background.audioRef.path, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'fast',
    '-qp', '0', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movie_timescale', '30', '-movflags', '+faststart',
    '-map_metadata', '-1', basePath];
  await command(toolPaths.ffmpegPath, args, {evidencePath: path.join(evidenceDirectory, 'lossless-envelope-command.json')});
  const decoded = [];
  for (const [key, file] of [['source', job.background.videoRef.path], ['base', basePath]]) decoded.push(await command(toolPaths.ffmpegPath,
    ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'],
    {hashOutput: true, evidencePath: path.join(evidenceDirectory, 'lossless-' + key + '-video-hash.json')}));
  assert.equal(decoded[0].outputSha256, decoded[1].outputSha256, 'lossless wrapper changed source background frames');
  const audio = [];
  for (const file of [job.background.audioRef.path, basePath]) audio.push(await inspectOrchestrationEncodedAudioV001({audioPath: file,
    logicalSampleCount: job.expectedFrameCount * 1600, sampleRate: 48000, ...toolPaths}));
  for (const key of ['packetPayloadSha256', 'logicalDecodedPayloadSha256']) assert.equal(audio[0][key], audio[1][key]);
  const preservation = {kind: 'decoded-video-identical-lossless-wrapper-original-AAC-copied',
    decodedVideoSha256: decoded[0].outputSha256, originalAudio: audio[0], baseAudio: audio[1],
    explanation: 'QP 0 is the codec lossless mode, not an editing weight or a subjective quality threshold.'};
  await save(path.join(evidenceDirectory, 'background-preservation.json'), preservation);
  return {baseRef: await bind(basePath), preservation};
}

export async function renderR1CaptionShortV001({jobPath, onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  const jobRef = await bind(jobPath), initial = await verifyR1CaptionShortJobV001({jobPath}), {job, loaded, resolved} = initial;
  // The shared native cache is checked by its dedicated existing-cache guard.
  // Only new render outputs and run evidence must be unused directories.
  for (const dir of [job.outputDirectory, job.evidenceDirectory])
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: dir});
  await absent(job.outputDirectory); await absent(job.evidenceDirectory); await mkdir(job.evidenceDirectory);
  const extraImplementationRefs = await Promise.all(['r1-caption-render.mjs', 'r1-caption-plan.mjs', 'r1-caption-prepare.mjs']
    .map(name => bind(path.join(repo, 'tools/digest-quality', name))));
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  await save(path.join(job.evidenceDirectory, 'start.json'), {jobRef, rules, extraImplementationRefs, inputRefs: initial.refs});
  try {
    await onProgress({point: job.point, phase: 'background-preservation'});
    const {baseRef, preservation} = await losslessBase(job, job.evidenceDirectory);
    const media = await inspectRenderedMediaWithToolsV001(baseRef.path, toolPaths);
    assert.equal(media.video.frameCount, job.expectedFrameCount);
    const baseAudio = await inspectOrchestrationEncodedAudioV001({audioPath: baseRef.path,
      logicalSampleCount: job.expectedFrameCount * 1600, sampleRate: 48000, ...toolPaths});
    await verifyR1CaptionShortJobV001({jobPath}); await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(job.evidenceDirectory, 'processes')});
    const native = buildPresentationRendererOverlayAdapterV001({remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'), processObserver});
    const cache = await createPresentationNativeAssetCacheV001({repositoryRoot: repo, directory: job.nativeAssetDirectory,
      adapter: native, drawingProfile: rules});
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory: job.outputDirectory,
      plan: loaded.baselinePlan, autoPresentation: loaded.autoPresentation, presetRegistry: await json(registryPath),
      baseMediaPath: baseRef.path, baseMediaInspection: {media}, expectedFrameCount: job.expectedFrameCount,
      overlayAdapter: cache.adapter, toolPaths, processObserver, serializePngAndFilters: true,
      runCounterfactualQc: true, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
      onProgress: value => onProgress({point: job.point, ...value})});
    await save(path.join(job.evidenceDirectory, 'draw-result.json'), draw);
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc)); assert.equal(draw.finalQc.status, 'passed');
    assert.deepEqual(draw.resolvedPlan, resolved.plan); assert.equal(draw.outputMedia.video.frameCount, job.expectedFrameCount);
    const finalAudio = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: job.expectedFrameCount * 1600, sampleRate: 48000, ...toolPaths});
    for (const key of ['packetPayloadSha256', 'logicalDecodedPayloadSha256']) assert.equal(baseAudio[key], finalAudio[key]);
    await verifyR1CaptionShortJobV001({jobPath}); await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    for (const ref of [baseRef, jobRef, ...extraImplementationRefs]) await check(ref);
    const staged = await bind(draw.workVideo);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    const candidateVideo = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(candidateVideo.fileSha256, staged.fileSha256);
    const result = {schemaVersion: 'r1-caption-short-render-completion-v001', status: 'passed', point: job.point, jobRef,
      candidateVideo, frameCount: job.expectedFrameCount, repairRef: job.repairRef, projectionRef: job.projectionRef,
      appearanceRef: job.appearanceRef, baseRef, backgroundPreservation: preservation, baseAudio, finalAudio,
      drawingRulesRef: rules, extraImplementationRefs, finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc,
      nativeAssets: cache.stats, automaticResolution: draw.autoPresentationResolution,
      humanQuality: 'not-evaluated', formalTrustChanged: false, mediaEditChanged: false, publication};
    await save(path.join(job.evidenceDirectory, 'completion.json'), result);
    await onProgress({point: job.point, phase: 'complete', candidateVideo}); return result;
  } catch (error) {
    await save(path.join(job.evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack}); throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, input, output, ...extra] = process.argv.slice(2); assert.equal(extra.length, 0);
  if (mode === 'prepare') process.stdout.write(JSON.stringify(await prepareR1CaptionShortJobsV001({casesPath: input, outputDirectory: output}), null, 2) + '\n');
  else if (mode === 'verify') {assert.equal(output, undefined); const checked = await verifyR1CaptionShortJobV001({jobPath: input});
    process.stdout.write(JSON.stringify({status: 'passed', point: checked.job.point, frameCount: checked.job.expectedFrameCount}) + '\n');}
  else if (mode === 'render') {assert.equal(output, undefined); await renderR1CaptionShortV001({jobPath: input,
    onProgress: value => process.stdout.write(JSON.stringify(value) + '\n')});}
  else throw new TypeError('usage: r1-caption-render.mjs prepare <cases.json> <unused-output-directory> | verify/render <job.json>');
}

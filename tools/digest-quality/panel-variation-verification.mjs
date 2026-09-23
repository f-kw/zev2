/** Episode 4: reuse the saved R1–R3 Digest, edit one Panel, and verify its output. */
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {loadAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {bindEditingFileV001 as bind, hashEditingValueV001 as hash} from '../../evals/clip_composition/presentation_editing_state_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {inspectEditingCaptionApplicabilityV001} from '../../evals/clip_composition/presentation_editing_applicability_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from '../../evals/clip_composition/presentation_integrity_state_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const filename = fileURLToPath(import.meta.url), repo = path.resolve(path.dirname(filename), '../..');
const composition = path.join(repo, 'evals/clip_composition'), exec = promisify(execFile);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const targetId = 'digest-human-caption-repair-20260907-v001-instruction-instruction-000014';
const tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe', imageMagickPath: '/opt/homebrew/bin/magick',
  tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'), layoutInspectorPath: path.join(composition, 'inspect_presentation_render_layout_v001.ts')};
const progress = value => console.log(JSON.stringify(value));
const resolve = loaded => resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
async function check(ref) {assert.deepEqual(await bind(ref.path), ref, 'saved bytes changed: ' + ref.path);}
const summary = (loaded, resolved) => ({planSha256: hash(resolved.plan),
  automaticSha256: hash(loaded.autoPresentation.autoProposal), overridesSha256: hash(loaded.autoPresentation.overrides),
  selections: resolved.resolution.captions});

async function prepare(completionPath, output) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: output});
  await mkdir(output);
  const completed = await json(completionPath);
  assert.equal(completed.status, 'passed'); assert.equal(completed.expectedFrameCount, 4878);
  const input = completed.refs.find(ref => ref.path.endsWith('/integration.json'));
  await check(input);
  const record = await json(input.path), files = record.files;
  const protectedRefs = [await bind(completionPath), input, completed.baseRef, completed.after,
    ...Object.values(files).map(file => completed.refs.find(ref => ref.path === file))];
  assert(protectedRefs.every(Boolean));
  for (const ref of protectedRefs) await check(ref);
  const original = await loadAutoPresentationV001(files), originalResolved = resolve(original);
  assert.equal(hash(originalResolved.plan), hash(await json(path.join(path.dirname(input.path), 'resolved-plan.json'))));
  const target = originalResolved.plan.elements.find(row => row.instructionId === targetId);
  assert.equal(target.text, 'なんかグロいやつに捕まってる');
  assert.equal(target.startFrame, 1746); assert.equal(target.endFrameExclusive, 1817);
  assert.equal(target.visualState.background.panelPresetId, 'plain');
  assert.equal(target.visualState.background.panelPaletteId, 'warm');
  const args = ['--baseline', files.baselinePath, '--decision-input', files.decisionInputPath, '--auto', files.autoProposalPath,
    '--caption-id', targetId];
  const phases = [], rules = await buildEditedOrchestrationDrawingRulesRefV001();
  await save(path.join(output, 'drawing-rules.json'), rules);
  let previous = files.overridesPath;
  for (const [phase, action, extra] of [['graph', 'panel-graph-paper', ['--palette', 'warm']],
    ['normal', 'normal', []], ['reset', 'reset', []]]) {
    progress({phase});
    const outputPath = path.join(output, phase + '-overrides.json');
    const command = await exec(process.execPath, [path.join(composition, 'edit_auto_presentation_v001.mjs'), action,
      ...args, '--overrides', previous, '--output', outputPath, ...extra]);
    await writeFile(path.join(output, phase + '-cli.txt'), command.stdout, {flag: 'wx'});
    const currentFiles = {...files, overridesPath: outputPath};
    const loaded = await loadAutoPresentationV001(currentFiles), resolved = resolve(loaded);
    assert.deepEqual(loaded.baselinePlan, original.baselinePlan);
    assert.deepEqual(loaded.autoPresentation.autoProposal, original.autoPresentation.autoProposal);
    assert.deepEqual(resolved.plan.elements.filter(row => row.instructionId !== targetId),
      originalResolved.plan.elements.filter(row => row.instructionId !== targetId));
    const changed = resolved.plan.elements.find(row => row.instructionId === targetId);
    const withoutStyle = row => {const value = structuredClone(row); delete value.visualState; return value;};
    assert.deepEqual(withoutStyle(changed), withoutStyle(target));
    assert.deepEqual(loaded.autoPresentation.overrides.entries.filter(row => row.captionId !== targetId),
      original.autoPresentation.overrides.entries.filter(row => row.captionId !== targetId));
    if (phase === 'reset') {
      assert.deepEqual(loaded.autoPresentation.overrides, original.autoPresentation.overrides);
      assert.deepEqual(resolved, originalResolved);
    }
    const requestPath = path.join(output, phase + '-reload-request.json');
    const expected = summary(loaded, resolved);
    await save(requestPath, {files: currentFiles, expected});
    const child = await exec(process.execPath, [filename, 'reload', requestPath]);
    assert.equal(JSON.parse(child.stdout).status, 'passed');
    const physical = await inspectEditingCaptionApplicabilityV001({plan: resolved.plan, targetId, drawingRulesRef: rules,
      options: {generatedRoot: path.join(output, 'physical'), nativeAssetReuse: path.join(output, 'native-assets')}});
    assert.equal(physical.status, 'passed'); assert.deepEqual(physical.violations, []);
    phases.push({phase, overridesRef: await bind(outputPath), expected, independentReload: JSON.parse(child.stdout), physical});
    previous = outputPath;
  }
  for (const ref of protectedRefs) await check(ref);
  const result = {status: 'passed', files: {...files, overridesPath: path.join(output, 'graph-overrides.json')},
    protectedRefs, baseRef: completed.baseRef, originalVideo: completed.after, expectedFrameCount: 4878,
    target: {id: targetId, text: target.text, startFrame: target.startFrame, endFrameExclusive: target.endFrameExclusive},
    phases, automaticProposalUnchanged: true, nonTargetCaptionsUnchanged: true, contentAndTimingUnchanged: true,
    resetRestoredOriginalOverridesAndPlan: true, newAiJudgment: false, manualTechnicalDemonstration: true};
  await save(path.join(output, 'prepare.json'), result); progress({status: result.status, output});
}

async function render(output) {
  const prepared = await json(path.join(output, 'prepare.json'));
  assert.equal(prepared.status, 'passed');
  for (const ref of prepared.protectedRefs) await check(ref);
  for (const phase of prepared.phases) await check(phase.overridesRef);
  const loaded = await loadAutoPresentationV001(prepared.files), resolved = resolve(loaded);
  const rules = await json(path.join(output, 'drawing-rules.json'));
  await verifyEditedOrchestrationDrawingRulesRefV001(rules);
  const evidence = path.join(output, 'render-evidence'); await mkdir(evidence);
  const media = await inspectRenderedMediaWithToolsV001(prepared.baseRef.path, tools);
  assert.equal(media.video.frameCount, prepared.expectedFrameCount);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidence, 'processes')});
  const adapter = buildPresentationRendererOverlayAdapterV001({
    remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    processObserver: observer});
  const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(output, 'render'),
    plan: loaded.baselinePlan, autoPresentation: loaded.autoPresentation,
    presetRegistry: await json(path.join(composition, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json')),
    baseMediaPath: prepared.baseRef.path, baseMediaInspection: {media}, expectedFrameCount: prepared.expectedFrameCount,
    overlayAdapter: adapter, toolPaths: tools, processObserver: observer, serializePngAndFilters: true,
    runCounterfactualQc: true, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, onProgress: progress});
  await save(path.join(evidence, 'draw-result.json'), draw);
  assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
  assert.equal(draw.finalQc.status, 'passed'); assert.equal(draw.completedFrameQc.status, 'passed');
  assert.deepEqual(draw.resolvedPlan, resolved.plan);
  const audio = async audioPath => inspectOrchestrationEncodedAudioV001({audioPath,
    logicalSampleCount: prepared.expectedFrameCount * 1470, sampleRate: 44100, ...tools});
  const originalAudio = await audio(prepared.originalVideo.path), finalAudio = await audio(draw.workVideo);
  assert.equal(finalAudio.packetPayloadSha256, originalAudio.packetPayloadSha256);
  assert.equal(finalAudio.logicalDecodedPayloadSha256, originalAudio.logicalDecodedPayloadSha256);
  for (const ref of prepared.protectedRefs) await check(ref);
  await verifyEditedOrchestrationDrawingRulesRefV001(rules);
  const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory, reservation: draw.reservation});
  const video = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
  const result = {status: 'passed', video, expectedFrameCount: prepared.expectedFrameCount, media: draw.outputMedia,
    finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, originalAudio, finalAudio,
    sourceBytesUnchanged: true, humanAdoption: 'not-claimed'};
  await save(path.join(output, 'completion.json'), result); progress({status: result.status, video});
}

const [command, first, second] = process.argv.slice(2);
assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
if (command === 'prepare') await prepare(first, second);
else if (command === 'render') await render(first);
else if (command === 'reload') {
  const request = await json(first), loaded = await loadAutoPresentationV001(request.files);
  assert.deepEqual(summary(loaded, resolve(loaded)), request.expected);
  progress({status: 'passed', pid: process.pid, planSha256: request.expected.planSha256});
} else throw new Error('usage: panel-variation-verification prepare completion-path unused-output | render output | reload request');

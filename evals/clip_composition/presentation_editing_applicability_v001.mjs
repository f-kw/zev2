/** Target-only physical acceptance shared by candidate display and durable save.
 * Uses the existing native renderer, exact finite states, and renderer QC. It
 * does not claim a completed-video/media check and never alters the caption. */
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, writeFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001} from './presentation_orchestration_edited_render_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationRenderApplicationResultsV002,
  runPresentationRendererChildProcessV001, validateOverlayDeterminismV002,
  ensureDirectoryChainNoSymlinkV002} from './render_presentation_v002.mjs';
import {createPresentationNativeAssetCacheV001} from './presentation_native_asset_cache_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {evaluatePresentationRendererQcV002, inspectOverlayPngWithToolV001} from './presentation_renderer_qc_v002.mjs';
import {PRESENTATION_PULSE_PRESET_V001, getPresentationPulseProgramV001,
  buildPresentationPulseStateElementsV001, assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001, buildPresentationCaptionMotionStateElementsV001,
  assertPresentationCaptionMotionLayoutsV001} from './presentation_caption_motion_v001.mjs';
import {resolveVisibleCenterOffsetsV001} from './presentation_renderer_text_layout_v001.mjs';
import {isPresentationPanelBackgroundV002} from './presentation_panel_presets_v002.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(directory, '../..');
const layoutWorker = path.join(directory, 'inspect_presentation_editing_layout_v001.ts');
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
const stale = message => Object.assign(new Error(message), {code: 'EDITING_APPLICABILITY_STALE'});
async function bind(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink()) throw stale('適用検査の参照ファイルが通常ファイルではありません');
  const digest = createHash('sha256'); for await (const chunk of createReadStream(file)) digest.update(chunk);
  return {path: file, bytes: info.size, fileSha256: digest.digest('hex')};
}
async function checkRef(ref) {
  if (canonicalJson(await bind(ref.path)) !== canonicalJson(ref)) throw stale('保存した物理観測の内容が変わっています');
}
const verifiedRules = new Map();
async function verifyRules(ref) {
  const metadata = async () => Promise.all(ref.files.map(async row => {
    const info = await lstat(row.path, {bigint: true});
    assert(info.isFile() && !info.isSymbolicLink());
    return ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].map(key => String(info[key]));
  }));
  try {
    const before = await metadata(), key = hash(ref), previous = verifiedRules.get(key);
    if (!previous || canonicalJson(before) !== canonicalJson(previous)) await verifyEditedOrchestrationDrawingRulesRefV001(ref);
    const after = await metadata(); assert.deepEqual(before, after, 'drawing files changed during applicability inspection');
    verifiedRules.set(key, after);
  } catch (error) {
    throw Object.assign(stale('適用検査に使った描画規則が現在のファイルと一致しません'), {cause: error});
  }
}
async function loadProof(file, binding) {
  let saved;
  try {await bind(file); saved = await json(file);} catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  if (hash(saved.body) !== saved.proofSha256 || canonicalJson(saved.body.binding) !== canonicalJson(binding))
    throw stale('保存した物理観測は現在の本文・書体・描画規則と一致しません');
  for (const ref of saved.body.artifacts ?? []) await checkRef(ref);
  return saved.body;
}
async function storeProof(file, body) {
  await save(file, {body, proofSha256: hash(body)});
  return body;
}
const queues = new Map();
async function serial(key, task) {
  const prior = queues.get(key) ?? Promise.resolve();
  const pending = prior.catch(() => {}).then(task); queues.set(key, pending);
  try {return await pending;} finally {if (queues.get(key) === pending) queues.delete(key);}
}
function scopedPlan(plan, targetId) {
  const target = plan.elements.find(row => row.instructionId === targetId);
  assert(target, 'caption target missing');
  return {...plan, elements: plan.elements.filter(row => row.instructionId === targetId
    || row.startFrame < target.endFrameExclusive && row.endFrameExclusive > target.startFrame)};
}
async function currentBinding(plan, targetId, drawingRulesRef) {
  await verifyRules(drawingRulesRef);
  const helperSha256 = hash(await Promise.all([fileURLToPath(import.meta.url), layoutWorker].map(bind)));
  return {schemaVersion: 'presentation-editing-applicability-v001', planSha256: hash(scopedPlan(plan, targetId)), targetId,
    drawingRulesSha256: hash(drawingRulesRef), helperSha256};
}
/** Recheck the exact completed observation immediately before saving. This
 * reads bindings and artifacts only; native rendering never holds a save lock. */
export const assertEditingApplicabilityRulesCurrentV001 = verifyRules;
export async function assertEditingCaptionApplicabilityCurrentV001({plan, targetId, drawingRulesRef, result, requirePassed = true}) {
  const binding = await currentBinding(plan, targetId, drawingRulesRef);
  if (!result?.observationRef) throw stale('保存前の物理観測が見つかりません');
  await checkRef(result.observationRef);
  const proof = await loadProof(result.observationRef.path, binding);
  if (!proof || proof.result.status !== result.status || requirePassed
    && (proof.result.status !== 'passed' || canonicalJson(proof.result.violations) !== '[]'))
    throw stale('保存前の物理観測が現在の指定に適用できません');
}
function statesFor(plan) {
  return plan.elements.flatMap((element, groupIndex) => {
    const states = Object.hasOwn(element, 'presentationPulse')
      ? buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
      : Object.hasOwn(element, 'presentationMotion')
        ? buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas}) : [{element}];
    return states.map(row => ({...row, groupIndex}));
  });
}
async function inspectState({drawState, props: initialProps, layoutItem, plan, adapter, processObserver,
  root, attempt, drawingRulesSha256, helperSha256}) {
  const {element, state} = drawState;
  const binding = {schemaVersion: 'presentation-editing-physical-state-v001',
    propsSha256: hash(initialProps), layoutSha256: hash(layoutItem), finiteState: state ?? null,
    drawingRulesSha256, helperSha256};
  const key = hash(binding), proofPath = path.join(root, 'native', key + '.json');
  const cached = await loadProof(proofPath, binding);
  if (cached) return {...cached.record, element, ...(state === undefined ? {} : {state}), artifacts: cached.artifacts,
    physicalProofRef: await bind(proofPath), reused: true};
  let props = initialProps;
  const artifacts = [], prefix = path.join(attempt, key);
  const inspect = input => inspectOverlayPngWithToolV001({instructionId: element.instructionId,
    imageMagickPath: '/opt/homebrew/bin/magick', processObserver, ...input});
  if (element.visualState.position.preset === 'top-band'
    || isPresentationPanelBackgroundV002(element.visualState.background)) {
    const lineBounds = [];
    for (const line of element.indexedLines) {
      const calibrationPath = prefix + '-calibration-' + line.lineIndex + '.png';
      await adapter.renderLineMask(props, line.lineIndex, calibrationPath);
      const row = await inspect({pngPath: calibrationPath});
      assert(row.alphaBounds, 'visible center calibration returned no pixels'); lineBounds.push(row.alphaBounds);
      artifacts.push(await bind(calibrationPath));
    }
    const wrapper = layoutItem.wrapper;
    props = {...props, renderVisibleCenterCorrectionPx: resolveVisibleCenterOffsetsV001({
      containerBounds: {left: wrapper.left, top: wrapper.top, right: wrapper.left + wrapper.width,
        bottom: wrapper.top + wrapper.height}, lineBounds})};
  }
  const pngPath = prefix + '.png', repeatPath = prefix + '-repeat.png';
  await adapter.renderStill(props, pngPath); await adapter.renderStill(props, repeatPath);
  const first = await bind(pngPath), repeat = await bind(repeatPath);
  const determinism = validateOverlayDeterminismV002(first.fileSha256, repeat.fileSha256, element.instructionId);
  assert.equal(determinism.status, 'passed', 'independent native captions differ'); artifacts.push(first, repeat);
  const lineAlphaBounds = [];
  for (const line of element.indexedLines) {
    const linePath = prefix + '-line-' + line.lineIndex + '.png';
    await adapter.renderLineMask(props, line.lineIndex, linePath);
    const row = await inspect({pngPath: linePath}); artifacts.push(await bind(linePath));
    if (row.alphaBounds) lineAlphaBounds.push({lineIndex: line.lineIndex, ...row.alphaBounds});
  }
  const inspection = await inspect({pngPath, lineRects: layoutItem.lineRects, lineAlphaBounds,
    appliedOverlayPropsCanonicalSha256: hash(props), overlayFile: 'overlays/' + path.basename(pngPath),
    overlaySha256: first.fileSha256});
  if (state !== undefined) {
    const dimensions = await runPresentationRendererChildProcessV001('/opt/homebrew/bin/magick',
      [pngPath, '-format', '%w %h', 'info:'], {processObserver, observationLabel: 'applicability-dimensions'});
    const size = dimensions.stdout.toString().trim().match(/^(\d+) (\d+)$/);
    assert(size && Number(size[1]) === plan.canvas.width && Number(size[2]) === plan.canvas.height,
      'native finite-state PNG canvas differs');
    inspection.pixelWidth = Number(size[1]); inspection.pixelHeight = Number(size[2]);
    inspection.layoutWrapper = structuredClone(layoutItem.wrapper);
  }
  const record = {props, pngPath, pngSha256: first.fileSha256, inspection};
  await storeProof(proofPath, {binding, artifacts, record});
  return {...record, element, ...(state === undefined ? {} : {state}), artifacts,
    physicalProofRef: await bind(proofPath), reused: false};
}
function groupRecords(plan, physicalRecords) {
  return plan.elements.map((element, groupIndex) => {
    const records = physicalRecords.filter(row => row.groupIndex === groupIndex);
    const stable = records[0];
    if (Object.hasOwn(element, 'presentationMotion')) return {...stable, element, motionStates: records,
      inspection: {...stable.inspection, motion: {presetVersion: element.presentationMotion.presetVersion,
        metadata: structuredClone(element.presentationMotion), program: getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas}),
        states: records.map(row => ({state: row.state, ...row.inspection}))}}};
    if (Object.hasOwn(element, 'presentationPulse')) return {...stable, element, pulseStates: records,
      inspection: {...stable.inspection, pulse: {presetVersion: PRESENTATION_PULSE_PRESET_V001.version,
        metadata: structuredClone(element.presentationPulse), program: getPresentationPulseProgramV001({element, canvas: plan.canvas}),
        states: records.map(row => ({state: row.state, ...row.inspection}))}}};
    return {...stable, element};
  });
}
export async function inspectEditingCaptionApplicabilityV001({plan: entirePlan, targetId, drawingRulesRef, options = {}}) {
  const generatedRoot = options.generatedRoot ?? path.join(directory, 'outputs/presentation/stage4-editing-applicability-v001');
  const root = path.join(generatedRoot, 'applicability');
  return serial(root, async () => {
    const start = performance.now(); await verifyRules(drawingRulesRef);
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: path.join(root, '.new-check')});
    await ensureDirectoryChainNoSymlinkV002(repo, path.join(root, 'native'));
    await ensureDirectoryChainNoSymlinkV002(repo, path.join(root, 'runs'));
    const plan = scopedPlan(entirePlan, targetId);
    const binding = await currentBinding(entirePlan, targetId, drawingRulesRef), {helperSha256} = binding;
    const proofPath = path.join(root, hash(binding) + '.json'), cached = await loadProof(proofPath, binding);
    if (cached) return {...cached.result, observationRef: await bind(proofPath), reused: true,
      nativeStateReuses: cached.result.nativeStateCount,
      nativeAssets: {nativeDraws: 0, bitmapReuses: 0, verifiedPairsAdded: 0},
      elapsedMilliseconds: performance.now() - start};
    const attempt = path.join(root, 'runs', randomUUID()); await mkdir(attempt);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(attempt, 'processes')});
    const nativeAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: await realpath(path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js')),
      chromiumPath: await realpath(path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell')),
      processObserver});
    const assetCache = await createPresentationNativeAssetCacheV001({repositoryRoot: repo,
      directory: options.nativeAssetReuse ?? path.join(generatedRoot, 'native-assets'), adapter: nativeAdapter,
      drawingProfile: drawingRulesRef});
    const registry = await json(path.join(directory, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
    const drawStates = statesFor(plan), props = drawStates.map(row => assetCache.adapter.buildProps(row.element, plan, registry));
    const inputPath = path.join(attempt, 'layout-input.json'), outputPath = path.join(attempt, 'layout-output.json');
    await save(inputPath, {canvas: plan.canvas, overlays: props});
    await runPresentationRendererChildProcessV001(process.execPath,
      [path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'), layoutWorker, inputPath, outputPath],
      {env: {NODE_PATH: path.join(repo, 'runner/node_modules')}, processObserver, observationLabel: 'applicability-layout'});
    const layout = await json(outputPath), artifacts = [await bind(inputPath), await bind(outputPath)];
    let violations = layout.violations, qc = null;
    const physicalRecords = [];
    if (layout.status === 'passed') {
      assert.equal(layout.items.length, drawStates.length);
      for (const [groupIndex, element] of plan.elements.entries()) {
        const items = layout.items.filter((_row, index) => drawStates[index].groupIndex === groupIndex);
        try {
          if (element.presentationMotion) assertPresentationCaptionMotionLayoutsV001({element, canvas: plan.canvas, layoutItems: items});
          if (element.presentationPulse) assertPresentationPulseAnchorsV001(items);
        } catch (error) {
          violations = [...violations, {code: element.presentationMotion ? 'CAPTION_MOTION_NATIVE_STATE_MISMATCH'
            : 'PULSE_NATIVE_STATE_MISMATCH', instructionId: element.instructionId, details: {reason: error.message}}];
        }
      }
      for (const [index, drawState] of violations.length ? [] : drawStates.entries()) {
        const record = await inspectState({drawState, props: props[index], layoutItem: layout.items[index], plan,
          adapter: assetCache.adapter, processObserver, root, attempt,
          drawingRulesSha256: binding.drawingRulesSha256, helperSha256});
        physicalRecords.push({...record, groupIndex: drawState.groupIndex}); artifacts.push(record.physicalProofRef, ...record.artifacts);
      }
      if (violations.length === 0) {
        const records = groupRecords(plan, physicalRecords);
        qc = evaluatePresentationRendererQcV002({plan, canvas: plan.canvas,
          applicationResults: buildPresentationRenderApplicationResultsV002(records),
          overlayInspections: records.map(row => row.inspection), mediaInspection: null, expectedAudio: null,
          requireFinalVisibility: false});
        // The shared evaluator honestly records absent output media. Only its
        // native application/layout checks apply here; no media success is made up.
        violations = qc.violations.filter(row => row.code !== 'OUTPUT_VIDEO_STREAM_MISSING');
        assert(qc.violations.some(row => row.code === 'OUTPUT_VIDEO_STREAM_MISSING'));
      }
    }
    const result = {status: violations.length ? 'failed' : 'passed', violations, targetId,
      mediaCheck: 'not-performed', layoutCheck: layout.status,
      nativeStateCount: physicalRecords.length, nativeStateReuses: physicalRecords.filter(row => row.reused).length,
      nativeAssets: {...assetCache.stats}, ...(qc ? {checks: qc.checks} : {})};
    if (result.status === 'passed') {
      assert.equal(qc?.checks.instructionApplication.status, 'passed');
      assert.equal(qc?.checks.layoutAndVisibility.status, 'passed');
    }
    await verifyRules(drawingRulesRef);
    await storeProof(proofPath, {binding, artifacts, result, layout, qc, elapsedMilliseconds: performance.now() - start});
    return {...result, observationRef: await bind(proofPath), reused: false, elapsedMilliseconds: performance.now() - start};
  });
}

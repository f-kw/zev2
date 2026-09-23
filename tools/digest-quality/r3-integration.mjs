/** One HRB development candidate from immutable saved semantic judgments. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAutoPresentationContextV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {sha256AutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, recompileOrchestrationPanelPalettesV003,
  resolveOrchestrationDrawingViewV001, exportOrchestrationDrawingViewEvidenceV001,
  restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {renderEditedOrchestrationV001, buildEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {bindEditingFileV001} from '../../evals/clip_composition/presentation_editing_state_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const stateNames = ['selectionRecord', 'captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides'];
const omit = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export async function prepareR3IntegrationV001(outputDirectory) {
  assert.equal(process.version, 'v20.19.6');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const previous = path.join(repo, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918');
  const original = {}, originalRefs = [];
  for (const [stem, name] of [['selectionRecord', 'selectionRecord.json'], ['input', 'fresh-input.json'],
    ['reply', 'raw-ai-response-v001.json']]) {
    const file = path.join(previous, name), raw = await readFile(file, 'utf8');
    original[stem + 'Bytes'] = raw; original[stem + 'FileSha256'] = sha(raw);
    originalRefs.push({path: file, fileSha256: sha(raw)});
  }
  const sourceFile = path.join(previous, 'source-bindings.json'), sourceBytes = await readFile(sourceFile);
  const previousSource = JSON.parse(sourceBytes);
  originalRefs.push({path: sourceFile, fileSha256: sha(sourceBytes)});
  const loaded = await loadAutoPresentationContextV001({baselinePath: previousSource.planRef.path,
    decisionInputPath: previousSource.captionContext.decisionInputRef.path});
  assert.deepEqual(omit(loaded.context, ['renderingRulesRef']), omit(previousSource.captionContext, ['renderingRulesRef']));
  const source = {...previousSource, captionContext: loaded.context};
  const context = createOrchestrationContextV001(source);
  const state = recompileOrchestrationPanelPalettesV003({context, original});
  const previousRecord = JSON.parse(original.selectionRecordBytes);
  for (const name of ['captionAuto', 'connectionAuto']) {
    const file = path.join(previous, name + '.json'), raw = await readFile(file), old = JSON.parse(raw);
    originalRefs.push({path: file, fileSha256: sha(raw)});
    assert.equal(sha256AutoPresentationV001(old), previousRecord[name + 'Sha256']);
    if (name === 'connectionAuto') assert.deepEqual(state[name], old);
    else assert.deepEqual(state.captionAuto.proposal.effects.filter(row => row.role !== 'Panel accent'),
      old.proposal.effects.filter(row => row.role !== 'Panel accent'));
  }
  for (const kind of ['captions', 'connections']) for (const old of previousRecord[kind]) {
    const idKey = kind === 'captions' ? 'captionId' : 'connectionId';
    assert.deepEqual(state.selectionRecord[kind].find(row => row[idKey] === old[idKey]).selection, old.selection);
  }
  const view = resolveOrchestrationDrawingViewV001({context, state});
  assert.equal(view.projection.displayFrameCount, 4867);
  assert.equal(state.captionOverrides.entries.length, 0); assert.equal(state.connectionOverrides.entries.length, 0);
  const evidence = exportOrchestrationDrawingViewEvidenceV001(view);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(JSON.stringify(evidence))), view);
  const panels = view.effectiveSelections.filter(row => row.selection.role === 'Panel accent').map(row => {
    const element = view.resolvedPlan.elements.find(element => element.instructionId === row.captionId);
    return {...row, text: element.text, startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive};
  });
  assert(panels.every(row => row.selection.paletteId && row.selection.presentation !== 'provisional-panel-comic-frame'));
  await mkdir(outputDirectory);
  for (const name of stateNames) await save(path.join(outputDirectory, name + '.json'), state[name]);
  await save(path.join(outputDirectory, 'source-bindings.json'), source);
  await save(path.join(outputDirectory, 'fresh-input.json'), state.selectionRecord.input);
  await writeFile(path.join(outputDirectory, 'raw-ai-response-v001.json'), state.selectionRecord.replyBytes, {flag: 'wx'});
  await save(path.join(outputDirectory, 'drawing-evidence.json'), evidence);
  const lineage = {schemaVersion: 'review-reflection-hrb-integrated-v001', kind: 'technical-recompile',
    stage: 'palette-selection-before-opening-integration',
    originalRefs, oldRules: previousSource.captionContext.renderingRulesRef, newRules: loaded.context.renderingRulesRef,
    expressionAssignmentsPreserved: true, connectionsPreserved: true, originalMediaAndCaptionsPreserved: true,
    paletteSelection: 'deterministic-third-choice-from-saved-semantic-Panel-decisions', automaticPanels: panels,
    pendingIntegration: ['HRB opening extension and speech-return timing from R2'],
    notApplied: ['C-all subtitle corrections belong to their own short derivatives', 'Q5 editorial changes'],
    frameCount: view.projection.displayFrameCount, freshAiJudgment: false, humanQualityApproved: false,
    originalTenPointAnswersRemainComplete: true, viewSha256: view.viewSha256,
    selectionRecordSha256: state.selectionRecord.recordSha256};
  await save(path.join(outputDirectory, 'lineage.json'), lineage);
  for (const ref of originalRefs) assert.equal(sha(await readFile(ref.path)), ref.fileSha256);
  return lineage;
}

export async function reloadR3IntegrationV001(directory) {
  const source = await json(path.join(directory, 'source-bindings.json')), state = {};
  for (const name of stateNames) state[name] = await json(path.join(directory, name + '.json'));
  const view = resolveOrchestrationDrawingViewV001({context: createOrchestrationContextV001(source), state});
  const saved = restoreOrchestrationDrawingViewEvidenceV001(await json(path.join(directory, 'drawing-evidence.json')));
  assert.deepEqual(view, saved);
  return {status: 'passed', viewSha256: view.viewSha256, frameCount: view.projection.displayFrameCount,
    sourceAndSelectionsReconstructed: true, freshAiJudgment: false};
}

export async function renderR3IntegrationV001(directory) {
  await reloadR3IntegrationV001(directory);
  const drawingEvidenceRef = await bindEditingFileV001(path.join(directory, 'drawing-evidence.json'));
  const drawingRulesRef = await buildEditedOrchestrationDrawingRulesRefV001();
  const job = {drawingEvidenceRef, outputDirectory: path.join(directory, 'rendered'),
    evidenceDirectory: path.join(directory, 'render-evidence'), drawingRulesRef,
    nativeAssetReuse: path.join(directory, 'native-assets')};
  await save(path.join(directory, 'render-job.json'), job);
  return renderEditedOrchestrationV001({...job, onProgress: value => process.stdout.write(JSON.stringify(value) + '\n')});
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, directory] = process.argv.slice(2);
  const action = {prepare: prepareR3IntegrationV001, reload: reloadR3IntegrationV001, render: renderR3IntegrationV001}[command];
  assert(action && path.isAbsolute(directory ?? ''), 'usage: r3-integration prepare|reload|render absolute-new-directory');
  action(directory).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => {console.error(error.stack); process.exitCode = 1;});
}

/** Focused storage/API check using the saved R3 integration, never a UI fixture. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeEditingWorkspaceV001, readEditingWorkspaceV001, saveEditingOverrideV001,
  editingTargetDetailsV001, bindEditingFileV001, hashEditingValueV001}
  from '../../evals/clip_composition/presentation_editing_state_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const filename = fileURLToPath(import.meta.url), repo = path.resolve(path.dirname(filename), '../..');
const stateNames = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'];
const inputNames = ['source-bindings.json', 'fresh-input.json', 'raw-ai-response-v001.json',
  ...stateNames.map(name => name + '.json'), 'drawing-evidence.json', 'lineage.json'];
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const selected = (snapshot, targetId) => snapshot.view.resolution.caption.captions.find(row => row.captionId === targetId);

async function summary(snapshot, targetId) {
  const details = await editingTargetDetailsV001(snapshot, 'caption', targetId);
  return {revision: snapshot.revision, viewSha256: snapshot.view.viewSha256,
    projectionSha256: snapshot.view.projection.projectionSha256,
    stateSha256: Object.fromEntries(stateNames.map(name => [name, hashEditingValueV001(snapshot.state[name])])),
    resolvedPlanSha256: hashEditingValueV001(snapshot.view.resolvedPlan),
    target: {id: targetId, text: details.text, selection: details.selection,
      hasOverride: details.hasOverride, presetLabel: details.presetLabel,
      effectiveSelection: selected(snapshot, targetId).effectiveSelection}};
}

async function freshProcessRead(requestPath, outputPath) {
  const request = await json(requestPath), drawingRulesRef = await json(request.rulesPath);
  const snapshot = await readEditingWorkspaceV001({directory: request.directory, drawingRulesRef});
  const observed = await summary(snapshot, request.targetId);
  assert.deepEqual(observed, request.expected);
  assert.notEqual(process.pid, request.parentPid);
  const result = {status: 'passed', pid: process.pid, parentPid: request.parentPid,
    nodeVersion: process.version, independentProcess: true, requestRef: await bindEditingFileV001(requestPath), observed};
  await save(outputPath, result);
  return result;
}

async function reloadInNewProcess({directory, drawingRulesRefPath, snapshot, targetId, outputDirectory, phase}) {
  const requestPath = path.join(outputDirectory, phase + '-reload-request.json');
  const resultPath = path.join(outputDirectory, phase + '-reload-result.json');
  await save(requestPath, {directory, rulesPath: drawingRulesRefPath, targetId,
    parentPid: process.pid, expected: await summary(snapshot, targetId)});
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [filename, 'reload', requestPath, resultPath],
      {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', bytes => stdout += bytes); child.stderr.on('data', bytes => stderr += bytes);
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({executable: process.execPath, code, signal, stdout, stderr}));
  });
  await save(path.join(outputDirectory, phase + '-reload-command.json'), result);
  assert.equal(result.code, 0, result.stderr); assert.equal(result.signal, null);
  return {resultRef: await bindEditingFileV001(resultPath), result: await json(resultPath)};
}

function unchangedExceptTarget(initial, current, targetId) {
  for (const name of stateNames.filter(name => name !== 'captionOverrides')) {
    assert.deepEqual(current.state[name], initial.state[name], name + ' changed');
  }
  assert.deepEqual(current.view.projection, initial.view.projection);
  assert.deepEqual(current.view.projectedNormalPlan, initial.view.projectedNormalPlan);
  const others = view => view.resolvedPlan.elements.filter(row => row.instructionId !== targetId);
  assert.deepEqual(others(current.view), others(initial.view));
  const selections = view => view.resolution.caption.captions.filter(row => row.captionId !== targetId);
  assert.deepEqual(selections(current.view), selections(initial.view));
  assert.deepEqual(current.state.captionOverrides.entries.filter(row => row.captionId !== targetId),
    initial.state.captionOverrides.entries.filter(row => row.captionId !== targetId));
}

export async function checkR3EditingSaveReloadV001({savedInputDirectory, outputDirectory}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert(path.isAbsolute(savedInputDirectory) && path.isAbsolute(outputDirectory));
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await mkdir(outputDirectory);
  const result = {schemaVersion: 'r3-editing-save-reload-v001', status: 'running', nodeVersion: process.version,
    pid: process.pid, scope: 'one real saved Panel caption; native applicability plus durable API storage and independent reload',
    renderedVideo: false, browserUiTest: false, sourceInputWrites: false, phases: []};
  let stage = 'bind-source-inputs', inputRefs = [];
  try {
    inputRefs = await Promise.all(inputNames.map(name => bindEditingFileV001(path.join(savedInputDirectory, name))));
    result.inputRefs = inputRefs;
    const originalView = restoreOrchestrationDrawingViewEvidenceV001(await json(path.join(savedInputDirectory, 'drawing-evidence.json')));
    const source = await json(path.join(savedInputDirectory, 'source-bindings.json'));
    assert.equal(source.captionContext.renderingRulesRef.version, 'auto-presentation-rules-v009');
    const record = await json(path.join(savedInputDirectory, 'selectionRecord.json'));
    result.selectionRecordVersion = record.schemaVersion;
    const originalManifestPath = path.join(repo, 'runtime/presentation-editing/digest-20260918/document.json');
    const oldManifest = await json(originalManifestPath);
    const originalMedia = await bindEditingFileV001(oldManifest.originalMedia.path);
    assert.equal(originalMedia.fileSha256, oldManifest.originalMedia.fileSha256);
    result.initializationMedia = {reference: originalMedia,
      originalManifestRef: await bindEditingFileV001(originalManifestPath),
      purpose: 'existing HRB bytes required only by workspace initialization; not the new palette candidate video',
      previewOpened: false, publishableAsNewCandidate: false};
    const drawingRulesRef = await buildEditedOrchestrationDrawingRulesRefV001();
    const drawingRulesRefPath = path.join(outputDirectory, 'drawing-rules.json');
    await save(drawingRulesRefPath, drawingRulesRef);
    result.helperRef = await bindEditingFileV001(filename);
    result.drawingRulesRef = await bindEditingFileV001(drawingRulesRefPath);
    const directory = path.join(outputDirectory, 'editing-workspace');
    stage = 'initialize-workspace';
    const initial = await initializeEditingWorkspaceV001({directory, savedInputDirectory,
      title: 'R3 配色保存の独立検査専用コピー', originalMedia: {...originalMedia,
        referencePurpose: result.initializationMedia.purpose},
      originalDrawingRulesRef: oldManifest.originalMedia.drawingRulesRef, backgroundProofPath: null, drawingRulesRef});
    assert.deepEqual(initial.view, originalView);
    for (const name of stateNames) assert.deepEqual(initial.state[name], await json(path.join(savedInputDirectory, name + '.json')));
    const representative = initial.view.effectiveSelections.find(row => row.selection.role === 'Panel accent'
      && row.selection.presentation === 'provisional-panel' && row.selection.paletteId === 'warm');
    assert(representative, 'expected real saved warm plain Panel representative missing');
    const targetId = representative.captionId;
    result.target = {captionId: targetId, original: await summary(initial, targetId),
      requestedPalette: {preset: 'panel', paletteId: 'cool'}};
    const details = await editingTargetDetailsV001(initial, 'caption', targetId);
    assert(details.paletteOptions.some(row => row.id === 'cool'));
    assert(!details.options.some(row => row.value === 'panel-comic-frame'));
    const applicabilityOptions = {generatedRoot: path.join(outputDirectory, 'physical-checks'),
      nativeAssetReuse: path.join(outputDirectory, 'native-assets')};
    const phases = [
      ['palette', {preset: 'panel', paletteId: 'cool'}],
      ['normal', {preset: 'normal'}],
      ['reset', 'Reset'],
    ];
    let current = initial;
    for (const [phase, selection] of phases) {
      stage = phase + '-save';
      process.stdout.write(JSON.stringify({stage, targetId, selection}) + '\n');
      current = await saveEditingOverrideV001({directory, drawingRulesRef, expectedRevision: current.revision,
        kind: 'caption', itemId: targetId, selection, applicabilityOptions});
      unchangedExceptTarget(initial, current, targetId);
      const target = selected(current, targetId);
      if (phase === 'palette') {
        assert.equal(target.hasOverride, true); assert.equal(target.effectiveSelection.paletteId, 'cool');
        assert.equal(target.effectiveSelection.presentation, representative.selection.presentation);
        assert.equal(current.state.captionOverrides.entries.length, 1);
        assert.deepEqual((await editingTargetDetailsV001(current, 'caption', targetId)).selection, selection);
      } else if (phase === 'normal') {
        assert.equal(target.hasOverride, true); assert.deepEqual(target.effectiveSelection, {role: 'Normal'});
        assert.equal(current.state.captionOverrides.entries.length, 1);
        assert.deepEqual((await editingTargetDetailsV001(current, 'caption', targetId)).selection, {preset: 'normal'});
      } else {
        assert.equal(target.hasOverride, false); assert.deepEqual(target.effectiveSelection, representative.selection);
        assert.deepEqual(current.state, initial.state); assert.deepEqual(current.view, initial.view);
        assert.equal(current.revision, initial.revision);
      }
      stage = phase + '-independent-reload';
      const reload = await reloadInNewProcess({directory, drawingRulesRefPath, snapshot: current, targetId, outputDirectory, phase});
      result.phases.push({phase, status: 'passed', selection, summary: await summary(current, targetId),
        independentReloadRef: reload.resultRef, childPid: reload.result.pid,
        otherCaptionsUnchanged: true, connectionsUnchanged: true, fixedAutomaticStateUnchanged: true});
    }
    result.workspace = directory;
    result.resetReturnedToOriginalAutomaticState = true;
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.failure = {stage, name: error.name, code: error.code ?? null,
      message: error.message, stack: error.stack};
  }
  try {
    const after = await Promise.all(inputRefs.map(ref => bindEditingFileV001(ref.path)));
    assert.deepEqual(after, inputRefs); result.inputBytesUnchanged = true;
  } catch (error) {
    result.status = 'failed'; result.inputBytesUnchanged = false;
    result.preservationFailure = {message: error.message, stack: error.stack};
  }
  await save(path.join(outputDirectory, 'result.json'), result);
  return {status: result.status, resultRef: await bindEditingFileV001(path.join(outputDirectory, 'result.json')),
    completedPhases: result.phases.map(row => row.phase), failure: result.failure ?? null};
}

if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  const [command, input, output] = process.argv.slice(2);
  const action = command === 'run' ? () => checkR3EditingSaveReloadV001({savedInputDirectory: input, outputDirectory: output})
    : command === 'reload' ? () => freshProcessRead(input, output) : null;
  assert(action && path.isAbsolute(input ?? '') && path.isAbsolute(output ?? ''),
    'usage: r3-editing-save-reload run saved-input-directory new-output-directory | reload request-path result-path');
  action().then(result => {console.log(JSON.stringify(result)); if (result.status !== 'passed') process.exitCode = 1;})
    .catch(error => {console.error(error.stack); process.exitCode = 1;});
}

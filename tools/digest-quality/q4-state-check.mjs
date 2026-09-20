/** Inspect Q4 saved state on disk without rendering or changing its originals. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstat, readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  editOrchestrationOverrideV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {verifyQ4Request, assertQ4FreshInput} from './q4-run.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const qualityRoot = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q4-20260920-v001');
const stateNames = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'];
const evidenceNames = ['source-bindings.json', 'judgment-input.json', 'judgment-reply.raw.json'];
const packageNames = [...evidenceNames, ...stateNames.map(name => name + '.json')];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const serialize = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const save = (file, value) => writeFile(file, serialize(value), {flag: 'wx'});

function guardOutput(outputDirectory) {
  assert(path.isAbsolute(outputDirectory), 'absolute inspection output required');
  const relative = path.relative(qualityRoot, outputDirectory);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative),
    'state inspection must stay inside the managed Q4 output');
  return assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
}
async function readBound(file) {
  const before = await lstat(file, {bigint: true});
  assert(before.isFile() && !before.isSymbolicLink(), 'state reference must be a regular file');
  const bytes = await readFile(file), after = await lstat(file, {bigint: true});
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(after[key], before[key], 'state file changed while reading');
  assert.equal(BigInt(bytes.length), after.size);
  return {bytes, ref: {path: path.resolve(file), fileSha256: hash(bytes), bytes: bytes.length,
    inode: after.ino.toString(), mtimeNs: after.mtimeNs.toString(), ctimeNs: after.ctimeNs.toString()}};
}
async function readFiles(directory, names) {
  return Object.fromEntries(await Promise.all(names.map(async name => [name, await readBound(path.join(directory, name))])));
}
const refs = files => Object.fromEntries(Object.entries(files).map(([name, value]) => [name, value.ref]));
const parsed = (files, name) => JSON.parse(files[name].bytes.toString('utf8'));
async function loadState(directory, evidenceDirectory = directory) {
  const files = {...await readFiles(evidenceDirectory, evidenceNames),
    ...await readFiles(directory, stateNames.map(name => name + '.json'))};
  const source = parsed(files, 'source-bindings.json'), input = parsed(files, 'judgment-input.json');
  const state = Object.fromEntries(stateNames.map(name => [name, parsed(files, name + '.json')]));
  const context = createOrchestrationContextV001(source);
  assertQ4FreshInput(context, input);
  assert.deepEqual(state.selectionRecord.origin, {kind: 'fresh-codex'});
  assert.deepEqual(state.selectionRecord.input, input, 'saved choice input differs from the fixed request');
  assert.equal(state.selectionRecord.replySha256, hash(files['judgment-reply.raw.json'].bytes));
  assert(files['judgment-reply.raw.json'].bytes.equals(Buffer.from(state.selectionRecord.replyBytes, 'utf8')),
    'saved choice reply differs from the original raw reply');
  const view = resolveOrchestrationDrawingViewV001({context, state});
  assert(view.resolution.connections.every(row => row.preset === 'normal-cut'), 'C-all connections must stay normal');
  return {files, source, input, state, context, view};
}

/** File-transition verification shared by the real runner and small fixtures.
 * The outer runner separately verifies real C-all media and its accepted request. */
export async function checkQ4StateFileTransitions({directory, outputDirectory}) {
  const guard = guardOutput(outputDirectory), original = await loadState(directory);
  const target = original.view.effectiveSelections.find(row => row.origin === 'automatic' && row.selection.role === 'Panel accent');
  const savedRow = target && original.state.selectionRecord.captions.find(row => row.captionId === target.captionId);
  const automaticBackground = savedRow?.panelBackgroundSelection?.selectedPreset ?? null;
  if (target) assert(['plain', 'graph-paper', 'comic-frame'].includes(automaticBackground));
  const background = target ? ['plain', 'graph-paper', 'comic-frame'].find(value => value !== automaticBackground) : null;
  const preset = {plain: 'panel', 'graph-paper': 'panel-graph-paper', 'comic-frame': 'panel-comic-frame'}[background];
  const transitions = [{name: 'saved', parent: null, selection: null}, ...(target ? [
    {name: 'normal-fixed', parent: 'saved', selection: 'Normal'},
    {name: 'normal-reset', parent: 'normal-fixed', selection: 'Reset'},
    {name: 'background-fixed', parent: 'saved', selection: {preset}},
    {name: 'background-reset', parent: 'background-fixed', selection: 'Reset'},
  ] : [])];
  await mkdir(outputDirectory);
  const variants = [];
  try {
    for (const name of evidenceNames) await writeFile(path.join(outputDirectory, name), original.files[name].bytes, {flag: 'wx'});
    for (const transition of transitions) {
      const parentDirectory = transition.parent === null ? directory : path.join(outputDirectory, transition.parent);
      const parent = transition.parent === null ? original : await loadState(parentDirectory, outputDirectory);
      const expected = transition.selection === null ? parent.state : editOrchestrationOverrideV001({context: parent.context,
        state: parent.state, kind: 'caption', itemId: target.captionId, selection: transition.selection});
      const variantDirectory = path.join(outputDirectory, transition.name);
      await mkdir(variantDirectory);
      for (const name of stateNames) {
        const bytes = isDeepStrictEqual(expected[name], original.state[name])
          ? original.files[name + '.json'].bytes : serialize(expected[name]);
        await writeFile(path.join(variantDirectory, name + '.json'), bytes, {flag: 'wx'});
      }
      const reloaded = await loadState(variantDirectory, outputDirectory);
      assert.deepEqual(reloaded.state, expected, 'disk reload differs from the requested state operation');
      for (const name of ['captionAuto', 'connectionAuto', 'connectionOverrides', 'selectionRecord']) {
        assert(reloaded.files[name + '.json'].bytes.equals(original.files[name + '.json'].bytes), 'an independent saved axis changed');
      }
      assert.deepEqual(reloaded.state.captionOverrides.entries.filter(row => row.captionId !== target?.captionId),
        original.state.captionOverrides.entries.filter(row => row.captionId !== target?.captionId), 'another caption override changed');
      assert.deepEqual(reloaded.view.projection, original.view.projection, 'caption inspection changed the display clock');
      assert.deepEqual(reloaded.view.projectedNormalPlan, original.view.projectedNormalPlan);
      for (const element of original.view.resolvedPlan.elements) if (element.instructionId !== target?.captionId) {
        assert.deepEqual(reloaded.view.resolvedPlan.elements.find(row => row.instructionId === element.instructionId), element);
      }
      if (transition.name === 'normal-fixed') {
        assert.deepEqual(reloaded.view.effectiveSelections.find(row => row.captionId === target.captionId).selection, {role: 'Normal'});
        assert.deepEqual(reloaded.view.resolvedPlan.elements.find(row => row.instructionId === target.captionId),
          original.view.projectedNormalPlan.elements.find(row => row.instructionId === target.captionId));
      }
      if (transition.name === 'background-fixed') {
        assert.equal(reloaded.view.resolvedPlan.elements.find(row => row.instructionId === target.captionId)
          .visualState.background.panelPresetId, background);
      }
      if (transition.selection === 'Reset') {
        for (const name of stateNames) assert(reloaded.files[name + '.json'].bytes.equals(original.files[name + '.json'].bytes),
          'Reset did not restore the fixed automatic state bytes');
        assert.equal(reloaded.view.viewSha256, original.view.viewSha256);
        assert.deepEqual(editOrchestrationOverrideV001({context: reloaded.context, state: reloaded.state, kind: 'caption',
          itemId: target.captionId, selection: 'Reset'}), reloaded.state, 'repeated Reset changed saved state');
      }
      assert.deepEqual(refs(await readFiles(parentDirectory, stateNames.map(name => name + '.json'))),
        Object.fromEntries(stateNames.map(name => [name + '.json', parent.files[name + '.json'].ref])), 'parent state files changed');
      variants.push({name: transition.name, parent: transition.parent, operation: transition.selection,
        files: Object.fromEntries(stateNames.map(name => [name, reloaded.files[name + '.json'].ref])),
        viewSha256: reloaded.view.viewSha256, projectionSha256: reloaded.view.projection.projectionSha256,
        diskReloadVerified: true, automaticSelectionRecordsUnchanged: true, connectionsUnchanged: true,
        otherCaptionOverridesUnchanged: true, resetRestoresOriginalBytes: transition.selection === 'Reset'});
    }
    assert.deepEqual(refs(await readFiles(directory, packageNames)), refs(original.files), 'original input or state changed');
    const result = {schemaVersion: 'digest-quality-q4-state-transitions-v001', status: 'passed', guard,
      inputDirectory: directory, originalFiles: refs(original.files), targetCaptionId: target?.captionId ?? null,
      automaticBackground, inspectionBackground: background, inspectionOnly: true,
      targetStatus: target ? 'automatic-panel-checked' : 'no-automatic-panel-target',
      reason: target ? 'Verify saved one-caption operations without changing the fixed automatic result.'
        : 'No automatically selected Panel is available; override and Reset operations were not invented.',
      variants, originalFilesUnchanged: true, connectionOperations: 0, videoGenerated: false, humanQualityApproved: false};
    await save(path.join(outputDirectory, 'transition-check.json'), result);
    return result;
  } catch (error) {
    await save(path.join(outputDirectory, 'transition-failure.json'), {status: 'failed', message: error.message,
      originalFiles: refs(original.files), completedVariants: variants.map(row => row.name), videoGenerated: false});
    throw error;
  }
}

export async function checkQ4SavedState({directory, outputDirectory}) {
  guardOutput(outputDirectory);
  const externalNames = ['request.json', 'judgment-prompt.md', 'judgment-validation.json'];
  const before = await readFiles(directory, [...packageNames, ...externalNames]);
  const request = await verifyQ4Request(directory), loaded = await loadState(directory);
  const accepted = parsed(before, 'judgment-validation.json');
  assert.equal(accepted.schemaVersion, 'digest-quality-q4-accepted-v001'); assert.equal(accepted.status, 'complete');
  assert.equal(accepted.inputSha256, request.input.inputSha256);
  assert.equal(accepted.rawReplySha256, hash(loaded.files['judgment-reply.raw.json'].bytes));
  assert.equal(accepted.sourceMediaSha256, request.source.mediaRef.fileSha256);
  assert.equal(accepted.selectionRecordSha256, loaded.state.selectionRecord.recordSha256);
  assert.equal(accepted.viewSha256, loaded.view.viewSha256);
  const result = await checkQ4StateFileTransitions({directory, outputDirectory});
  assert.deepEqual(refs(await readFiles(directory, [...packageNames, ...externalNames])), refs(before), 'accepted source package changed');
  const completion = {...result, schemaVersion: 'digest-quality-q4-saved-state-check-v001',
    acceptedRequestAndMediaVerified: true, acceptedRecordRef: before['judgment-validation.json'].ref,
    fixedSourceMediaSha256: request.source.mediaRef.fileSha256};
  await save(path.join(outputDirectory, 'completion.json'), completion);
  return completion;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, outputDirectory, extra] = process.argv.slice(2);
  Promise.resolve().then(() => {
    assert(directory && outputDirectory && !extra, 'Usage: q4-state-check.mjs <accepted-C-all-directory> <new-managed-Q4-directory>');
    return checkQ4SavedState({directory: path.resolve(directory), outputDirectory: path.resolve(outputDirectory)});
  }).then(result => console.log(JSON.stringify({status: result.status, targetCaptionId: result.targetCaptionId,
    variants: result.variants.length, originalFilesUnchanged: result.originalFilesUnchanged, videoGenerated: false})))
    .catch(error => {console.error(error.stack); process.exitCode = 1;});
}

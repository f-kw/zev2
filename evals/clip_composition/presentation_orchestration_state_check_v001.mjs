/** Evidence from the actual saved draft; disk edits are confined to unused inspection directories. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  editOrchestrationOverrideV001, assertOrchestrationDrawingViewMatchesStateV001,
  exportOrchestrationDrawingViewEvidenceV001, restoreOrchestrationDrawingViewEvidenceV001}
  from './presentation_orchestration_v001.mjs';
import {projectAudioPeakV001, assertProjectedTimingV001, assertProjectionMatchesStateV001}
  from './presentation_orchestration_projection_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schemaVersion = 'presentation-orchestration-saved-state-check-v001';
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(canonicalJson(value));
const clone = value => structuredClone(value);
const names = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides'];
const stateNames = [...names, 'selectionRecord'];
const inputNames = ['source-bindings', 'fresh-input', 'raw-ai-response-v001', ...names, 'selectionRecord'];
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const parse = bytes => JSON.parse(bytes.toString('utf8'));
async function binding(file) {
  const bytes = await readFile(file);
  return {path: path.resolve(file), fileSha256: sha(bytes), bytes: bytes.length};
}
async function fileSnapshot(file) {
  const content = await binding(file), metadata = await stat(file, {bigint: true});
  assert(metadata.isFile(), 'saved state must be a regular file');
  assert.equal(BigInt(content.bytes), metadata.size);
  return {...content, mtimeNs: metadata.mtimeNs.toString(), inode: metadata.ino.toString()};
}
async function savedSnapshots(directory) {
  return Object.fromEntries(await Promise.all(stateNames.map(async name =>
    [name, await fileSnapshot(path.join(directory, name + '.json'))])));
}
async function readSavedState(directory) {
  return Object.fromEntries(await Promise.all(stateNames.map(async name =>
    [name, parse(await readFile(path.join(directory, name + '.json')))])));
}
async function checkDiskPersistence({savedInputDirectory, outputDirectory, fileBytes, states, derived, apply,
  captionId, connectionId, progress}) {
  const directory = path.join(outputDirectory, 'persisted-states');
  await mkdir(directory);
  const caption = selection => ({kind: 'caption', itemId: captionId, selection});
  const connection = selection => ({kind: 'connection', itemId: connectionId, selection});
  const transitions = [
    {name: 'saved', parent: null, operations: []},
    {name: 'captionOnly', parent: 'saved', operations: [caption('Normal')]},
    {name: 'connectionOnly', parent: 'saved', operations: [connection('black-separator')]},
    {name: 'captionThenConnection', parent: 'captionOnly', operations: [connection('black-separator')]},
    {name: 'connectionThenCaption', parent: 'connectionOnly', operations: [caption('Normal')]},
    {name: 'captionResetFirst', parent: 'captionThenConnection', operations: [caption('Reset')]},
    {name: 'connectionResetFirst', parent: 'connectionThenCaption', operations: [connection('Reset')]},
    {name: 'bothResetCaptionFirst', parent: 'captionResetFirst', operations: [connection('Reset')]},
    {name: 'bothResetConnectionFirst', parent: 'connectionResetFirst', operations: [caption('Reset')]},
    {name: 'repeatedReset', parent: 'bothResetConnectionFirst', operations: [connection('Reset'), caption('Reset')]},
  ];
  assert.deepEqual(transitions.map(row => row.name), Object.keys(states));
  const variants = [], directories = new Map();
  let overrideFileWrites = 0, noChangeOperations = 0;
  for (const transition of transitions) {
    const target = path.join(directory, transition.name);
    const from = transition.parent === null ? savedInputDirectory : directories.get(transition.parent);
    assert(from, 'the transition source must already be persisted');
    await mkdir(target);
    progress.current = {name: transition.name, directory: target, sourceDirectory: from, operations: []};
    const parentBefore = await savedSnapshots(from);
    for (const name of stateNames) {
      const bytes = await readFile(path.join(from, name + '.json'));
      await writeFile(path.join(target, name + '.json'), bytes, {flag: 'wx'});
      assert((await readFile(path.join(target, name + '.json'))).equals(bytes));
    }
    const before = await savedSnapshots(target);
    for (const name of stateNames) {
      assert.equal(before[name].fileSha256, parentBefore[name].fileSha256);
      assert.notEqual(before[name].inode, parentBefore[name].inode, 'inspection files must be independent copies');
    }
    let reloaded = await readSavedState(target);
    assert.deepEqual(reloaded, transition.parent === null ? states.saved : states[transition.parent]);
    for (const operation of transition.operations) {
      const targetName = operation.kind === 'caption' ? 'captionOverrides' : 'connectionOverrides';
      const beforeOperation = await savedSnapshots(target);
      const beforeOperationBytes = new Map(await Promise.all(stateNames.map(async name =>
        [name, await readFile(path.join(target, name + '.json'))])));
      const expected = apply(reloaded, operation.kind, operation.itemId, operation.selection);
      const nextBytes = Buffer.from(JSON.stringify(expected[targetName], null, 2) + '\n');
      const previousBytes = await readFile(path.join(target, targetName + '.json'));
      const changed = !nextBytes.equals(previousBytes);
      if (changed) {
        await writeFile(path.join(target, targetName + '.json'), nextBytes, {flag: 'w'});
        overrideFileWrites++;
      } else noChangeOperations++;
      const afterOperation = await savedSnapshots(target);
      const record = {...operation, targetName, writtenFiles: changed ? [targetName] : [],
        before: beforeOperation, after: afterOperation};
      progress.current.operations.push(record);
      for (const name of stateNames) {
        if (name !== targetName || !changed) {
          assert.deepEqual(afterOperation[name], beforeOperation[name]);
          assert((await readFile(path.join(target, name + '.json'))).equals(beforeOperationBytes.get(name)));
        }
        else {
          assert.notEqual(afterOperation[name].fileSha256, beforeOperation[name].fileSha256);
          assert.notEqual(afterOperation[name].mtimeNs, beforeOperation[name].mtimeNs);
          assert.equal(afterOperation[name].fileSha256, sha(nextBytes));
        }
      }
      if (operation.selection === 'Reset') {
        assert((await readFile(path.join(target, targetName + '.json'))).equals(fileBytes.get(targetName)));
        record.resetRestoresOriginalFileBytes = true;
      }
      reloaded = await readSavedState(target);
      assert.deepEqual(reloaded, expected);
      record.nonTargetFileBytesHashesAndMtimesUnchanged = true;
      record.diskReloadEqualsAppliedState = true;
    }
    assert.deepEqual(await savedSnapshots(from), parentBefore);
    assert.deepEqual(reloaded, states[transition.name]);
    const after = await savedSnapshots(target);
    for (const name of ['captionAuto', 'connectionAuto', 'selectionRecord']) {
      assert((await readFile(path.join(target, name + '.json'))).equals(fileBytes.get(name)));
      assert.deepEqual(after[name], before[name]);
    }
    for (const name of ['captionOverrides', 'connectionOverrides']) {
      if (reloaded[name].entries.length === 0)
        assert((await readFile(path.join(target, name + '.json'))).equals(fileBytes.get(name)));
    }
    const source = parse(await readFile(path.join(savedInputDirectory, 'source-bindings.json')));
    const context = createOrchestrationContextV001(source);
    const view = resolveOrchestrationDrawingViewV001({context, state: reloaded});
    assertOrchestrationDrawingViewMatchesStateV001({view, context, state: reloaded});
    assert.deepEqual(view, derived[transition.name]);
    const variant = {name: transition.name, directory: target, parent: transition.parent,
      sourceDirectory: from, sourceBefore: parentBefore, initialSavedFiles: before, finalSavedFiles: after,
      operations: progress.current.operations, viewSha256: view.viewSha256,
      projectionSha256: view.projection.projectionSha256,
      fiveFilesReadFromDisk: true, diskReloadAndAllDerivedContentEqualExpected: true,
      fixedAutomaticRecordsAndSelectionFileBytesUnchanged: true, sourceDirectoryUnchanged: true};
    variants.push(variant); directories.set(transition.name, target);
    progress.completed.push({name: variant.name, viewSha256: variant.viewSha256});
  }
  const finalBytes = async name => Object.fromEntries(await Promise.all(stateNames.map(async key =>
    [key, (await readFile(path.join(directories.get(name), key + '.json'))).toString('utf8')])));
  assert.deepEqual(await finalBytes('captionThenConnection'), await finalBytes('connectionThenCaption'));
  for (const name of ['bothResetCaptionFirst', 'bothResetConnectionFirst', 'repeatedReset'])
    for (const key of stateNames)
      assert((await readFile(path.join(directories.get(name), key + '.json'))).equals(fileBytes.get(key)));
  assert.equal(overrideFileWrites, 8); assert.equal(noChangeOperations, 2);
  return {schemaVersion, kind: 'disk-persistence-verification', directory,
    savedFileCountPerState: 5, variantCount: variants.length, initializedStateFileCount: variants.length * 5,
    overrideFileWrites, noChangeOperations, originalInputFileWrites: 0,
    independentOrderFinalFileBytesEqual: true, bothResetFinalFiveFileBytesEqualOriginal: true,
    repeatedResetDoesNotRewriteFiles: true, variants};
}
const withoutTimes = element => {
  const {startFrame: ignoredStart, endFrameExclusive: ignoredEnd, ...rest} = element;
  return rest;
};
const withProjectionInput = (source, projection) => ({digestRef: source.digestRef, planRef: source.planRef,
  timelineRef: source.timelineRef, mediaRef: source.mediaRef, planBytes: source.planBytes, timelineBytes: source.timelineBytes,
  playbackSampleRate: source.playbackSampleRate, observationSampleRate: source.observationSampleRate,
  connections: projection.connections.map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion}))});
function expectRejected({name, assertion, call, details}) {
  let rejection;
  try {call();} catch (error) {rejection = error;}
  assert(rejection instanceof TypeError, name + ' must be rejected by a public clock/state validator');
  return {schemaVersion, kind: 'injected-clock-fault', name, status: 'rejected', assertion,
    rejection: {type: rejection.name, message: rejection.message}, ...details};
}

export async function checkOrchestrationSavedStateV001({savedInputDirectory, outputDirectory}) {
  assert(path.isAbsolute(savedInputDirectory) && path.isAbsolute(outputDirectory));
  const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await mkdir(outputDirectory);
  const started = performance.now();
  const fileBytes = new Map(), inputBindings = [], implementationBindings = [];
  const persistenceProgress = {completed: [], current: null};
  try {
    for (const name of inputNames) {
      const file = path.join(savedInputDirectory, name + '.json'), bytes = await readFile(file);
      fileBytes.set(name, bytes); inputBindings.push({name, ...await fileSnapshot(file)});
    }
    for (const name of ['presentation_orchestration_state_check_v001.mjs', 'presentation_orchestration_v001.mjs',
      'presentation_orchestration_projection_v001.mjs', 'presentation_auto_effects_v001.mjs',
      'connection_expression_v001.mjs', 'presentation_pulse_v001.mjs', 'presentation_caption_motion_v001.mjs']) {
      implementationBindings.push(await binding(path.join(repo, 'evals/clip_composition', name)));
    }
    const source = parse(fileBytes.get('source-bindings'));
    const saved = Object.fromEntries([...names, 'selectionRecord'].map(name => [name, parse(fileBytes.get(name))]));
    assert.deepEqual(saved.selectionRecord.input, parse(fileBytes.get('fresh-input')));
    assert.equal(saved.selectionRecord.replyBytes, fileBytes.get('raw-ai-response-v001').toString('utf8'));
    const context = createOrchestrationContextV001(source);
    const baseline = resolveOrchestrationDrawingViewV001({context, state: saved});
    assert.equal(baseline.effectiveSelections.length, 32); assert.equal(baseline.projection.connections.length, 6);
    assert.deepEqual(saved.captionOverrides.entries, []); assert.deepEqual(saved.connectionOverrides.entries, []);
    const connection = baseline.projection.connections[0];
    assert.equal(connection.connectionId, 'connection-01'); assert.equal(connection.preset, 'normal-cut');
    const selectedCaption = baseline.effectiveSelections.find(row => row.selection.role === 'Focus');
    assert(selectedCaption, 'the actual fixed draft must contain an effect that can be reset in this check');
    const captionId = selectedCaption.captionId, connectionId = connection.connectionId;
    const apply = (state, kind, itemId, selection) => editOrchestrationOverrideV001({context, state, kind, itemId, selection});
    const caption = state => apply(state, 'caption', captionId, 'Normal');
    const connect = state => apply(state, 'connection', connectionId, 'black-separator');
    const resetCaption = state => apply(state, 'caption', captionId, 'Reset');
    const resetConnection = state => apply(state, 'connection', connectionId, 'Reset');
    const states = {saved, captionOnly: caption(saved), connectionOnly: connect(saved)};
    states.captionThenConnection = connect(states.captionOnly);
    states.connectionThenCaption = caption(states.connectionOnly);
    states.captionResetFirst = resetCaption(states.captionThenConnection);
    states.connectionResetFirst = resetConnection(states.connectionThenCaption);
    states.bothResetCaptionFirst = resetConnection(states.captionResetFirst);
    states.bothResetConnectionFirst = resetCaption(states.connectionResetFirst);
    states.repeatedReset = resetCaption(resetConnection(states.bothResetConnectionFirst));
    assert.deepEqual(states.captionThenConnection, states.connectionThenCaption);
    assert.deepEqual(states.captionResetFirst, states.connectionOnly);
    assert.deepEqual(states.connectionResetFirst, states.captionOnly);
    for (const name of ['bothResetCaptionFirst', 'bothResetConnectionFirst', 'repeatedReset']) assert.deepEqual(states[name], saved);
    assert.deepEqual(states.captionOnly.connectionOverrides, saved.connectionOverrides);
    assert.deepEqual(states.connectionOnly.captionOverrides, saved.captionOverrides);

    const originalPlan = JSON.parse(source.planBytes), variants = [], derived = {};
    for (const [name, state] of Object.entries(states)) {
      assert.deepEqual(state.captionAuto, saved.captionAuto); assert.deepEqual(state.connectionAuto, saved.connectionAuto);
      assert.deepEqual(state.selectionRecord, saved.selectionRecord);
      // This first check is an in-memory JSON round trip. Physical persistence is checked separately below.
      const reloadedContext = createOrchestrationContextV001(parse(Buffer.from(JSON.stringify(source))));
      const reloadedState = parse(Buffer.from(JSON.stringify(state)));
      const view = resolveOrchestrationDrawingViewV001({context: reloadedContext, state: reloadedState});
      assertOrchestrationDrawingViewMatchesStateV001({view, context, state});
      const restored = restoreOrchestrationDrawingViewEvidenceV001(exportOrchestrationDrawingViewEvidenceV001(view));
      assert.equal(restored.viewSha256, view.viewSha256);
      assert.deepEqual(view.projectedNormalPlan.elements.map(withoutTimes), originalPlan.elements.map(withoutTimes));
      assert.deepEqual(view.resolution.counts, baseline.resolution.counts);
      derived[name] = view;
      variants.push({name, fourSavedCanonicalSha256: Object.fromEntries(names.map(key => [key, hash(state[key])])),
        viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256,
        displayFrameCount: view.projection.displayFrameCount,
        captionOverrideEntries: clone(state.captionOverrides.entries), connectionOverrideEntries: clone(state.connectionOverrides.entries),
        selectedCaption: clone(view.effectiveSelections.find(row => row.captionId === captionId)),
        fixedAutomaticRecordsAndMeaningUnchanged: true, fixedCaptionContentAndSourceMappingUnchanged: true,
        inMemoryJsonRoundTripViewIdentical: true, inMemoryDrawingProofReconstructed: true});
    }
    const persistence = await checkDiskPersistence({savedInputDirectory, outputDirectory, fileBytes, states, derived, apply,
      captionId, connectionId, progress: persistenceProgress});
    const captionOnly = derived.captionOnly, connectionOnly = derived.connectionOnly;
    for (const [index, element] of baseline.resolvedPlan.elements.entries()) {
      const current = captionOnly.resolvedPlan.elements[index];
      if (element.instructionId === captionId) assert.deepEqual(current, captionOnly.projectedNormalPlan.elements[index]);
      else assert.deepEqual(current, element);
    }
    assert.deepEqual(captionOnly.projection, baseline.projection);
    assert.deepEqual(connectionOnly.effectiveSelections, baseline.effectiveSelections);
    assert.equal(connectionOnly.projection.displayFrameCount - baseline.projection.displayFrameCount, 12);
    const captionShifts = baseline.captionTimings.map((before, index) => {
      const after = connectionOnly.captionTimings[index];
      const expectedShift = before.source.startFrame >= connection.boundaryFrame ? 12 : 0;
      assert.equal(after.startFrame - before.startFrame, expectedShift);
      assert.equal(after.endFrameExclusive - before.endFrameExclusive, expectedShift);
      assert.equal(after.displayFrameCount, before.displayFrameCount);
      assertProjectedTimingV001({projection: connectionOnly.projection, kind: 'caption', original: after.source, projected: after});
      return {captionId: before.captionId, originalStartFrame: before.source.startFrame,
        beforeStartFrame: before.startFrame, afterStartFrame: after.startFrame, shiftFrames: expectedShift};
    });
    const native = source.captionContext.pulseTimingEvidence;
    const actualPeak = native.peaks.find(row => BigInt(row.peakSample) * 30n >= BigInt(connection.boundaryFrame) * BigInt(native.sampleRate));
    assert(actualPeak, 'a measured peak after the changed connection is required');
    const originalPeak = {clock: 'digest-original', sourceClockSha256: baseline.projection.sourceClockSha256,
      peakId: actualPeak.peakId, sample: actualPeak.peakSample, sampleRate: native.sampleRate};
    const beforePeak = projectAudioPeakV001({projection: baseline.projection, peak: originalPeak});
    const afterPeak = projectAudioPeakV001({projection: connectionOnly.projection, peak: originalPeak});
    assert.equal(afterPeak.displayFrame - beforePeak.displayFrame, 12);
    assert.equal(afterPeak.displaySample - beforePeak.displaySample, 6400);
    assert.equal(beforePeak.playbackSample.denominator, 1); assert.equal(afterPeak.playbackSample.denominator, 1);
    assert.equal(afterPeak.playbackSample.numerator - beforePeak.playbackSample.numerator, 17640);
    assertProjectedTimingV001({projection: connectionOnly.projection, kind: 'audio-peak', original: originalPeak, projected: afterPeak});
    const selectedPulseShifts = baseline.projectedPeaks.map(before => {
      const after = connectionOnly.projectedPeaks.find(row => row.peakId === before.peakId);
      assert.equal(after.displaySample, before.displaySample); assert.equal(after.displayFrame, before.displayFrame);
      assert.deepEqual(after.playbackSample, before.playbackSample);
      return {peakId: before.peakId, originalSample: before.source.sample, beforeFrame: before.displayFrame,
        afterFrame: after.displayFrame, shiftFrames: 0, reason: 'selected Pulse precedes the first retained connection'};
    });
    assert.equal(selectedPulseShifts.length, 3);
    const motionElement = baseline.resolvedPlan.elements.find(row => row.presentationMotion
      && originalPlan.elements.find(original => original.instructionId === row.instructionId).startFrame >= connection.boundaryFrame);
    assert(motionElement, 'an actual selected motion caption after the connection is required');
    const beforeMotion = baseline.captionTimings.find(row => row.captionId === motionElement.instructionId);
    const afterMotion = connectionOnly.captionTimings.find(row => row.captionId === motionElement.instructionId);
    assert.equal(afterMotion.motionStartFrame - beforeMotion.motionStartFrame, 12);
    assertProjectedTimingV001({projection: connectionOnly.projection, kind: 'motion-start', original: afterMotion.source, projected: afterMotion});

    const beforeCaption = baseline.captionTimings.find(row => row.captionId === captionId);
    const afterCaption = connectionOnly.captionTimings.find(row => row.captionId === captionId);
    assert.equal(afterCaption.startFrame - beforeCaption.startFrame, 12);
    const missing = {...clone(afterCaption), startFrame: beforeCaption.startFrame,
      endFrameExclusive: beforeCaption.endFrameExclusive, motionStartFrame: beforeCaption.motionStartFrame};
    const doubled = {...clone(afterCaption), startFrame: afterCaption.startFrame + 12,
      endFrameExclusive: afterCaption.endFrameExclusive + 12, motionStartFrame: afterCaption.motionStartFrame + 12};
    const oldPeak = {...clone(beforePeak), projectionSha256: connectionOnly.projection.projectionSha256};
    const oldMotion = {...clone(afterMotion), motionStartFrame: beforeMotion.motionStartFrame};
    const pointFault = (name, kind, original, expected, injected) => expectRejected({name,
      assertion: 'assertProjectedTimingV001', details: {kind, original, expected, injected},
      call: () => assertProjectedTimingV001({projection: connectionOnly.projection, kind, original, projected: injected})});
    const faults = [pointFault('caption-shift-missing', 'caption', afterCaption.source, afterCaption, missing),
      pointFault('caption-shift-applied-twice', 'caption', afterCaption.source, afterCaption, doubled),
      pointFault('old-measured-peak-clock', 'audio-peak', originalPeak, afterPeak, oldPeak),
      pointFault('old-motion-start-clock', 'motion-start', afterMotion.source, afterMotion, oldMotion)];
    const softState = apply(saved, 'connection', connectionId, 'soft-separator');
    const softView = resolveOrchestrationDrawingViewV001({context, state: softState});
    assert.equal(softView.projection.displayFrameCount, connectionOnly.projection.displayFrameCount);
    assert.notEqual(softView.projection.projectionSha256, connectionOnly.projection.projectionSha256);
    const stale = expectRejected({name: 'same-duration-black-to-soft-stale-projection', assertion: 'assertProjectionMatchesStateV001',
      call: () => assertProjectionMatchesStateV001({projection: connectionOnly.projection, ...withProjectionInput(source, softView.projection)}),
      details: {connectionId, expectedPreset: 'soft-separator', reusedPreset: 'black-separator',
        displayFrameCount: softView.projection.displayFrameCount,
        expectedProjectionSha256: softView.projection.projectionSha256, reusedProjectionSha256: connectionOnly.projection.projectionSha256}});
    stale.savedStateViewRejection = expectRejected({name: 'stale-view-versus-current-four-records',
      assertion: 'assertOrchestrationDrawingViewMatchesStateV001', details: {},
      call: () => assertOrchestrationDrawingViewMatchesStateV001({view: connectionOnly, context, state: softState})}).rejection;
    faults.push(stale);
    const afterBindings = [];
    for (const ref of inputBindings) {
      const current = await readFile(ref.path);
      assert(current.equals(fileBytes.get(ref.name)), 'saved input bytes changed: ' + ref.name);
      assert.equal(sha(current), ref.fileSha256);
      const after = {name: ref.name, ...await fileSnapshot(ref.path)};
      assert.deepEqual(after, ref); afterBindings.push(after);
    }
    for (const ref of implementationBindings) assert.deepEqual(await binding(ref.path), ref);
    const artifacts = [];
    const store = async (name, value) => {const file = path.join(outputDirectory, name); await save(file, value); artifacts.push(await binding(file));};
    await store('saved-state-operations.json', {schemaVersion, selectedCaptionId: captionId, selectedConnectionId: connectionId,
      reloadMethod: 'in-memory JSON round trip; physical file writes and reads are recorded separately',
      changes: {caption: 'temporary Normal override', connection: 'temporary Black override'},
      independentOrderCommutes: true, eachResetDeletesOnlyItsOwnOverride: true, bothResetRestoresAllFourRecords: true, variants});
    await store('persisted-state-operations.json', persistence);
    await store('clock-projection-evidence.json', {schemaVersion, sourceClockSha256: baseline.projection.sourceClockSha256,
      baselineProjectionSha256: baseline.projection.projectionSha256, editedProjectionSha256: connectionOnly.projection.projectionSha256,
      originalConnectionBoundaryFrame: connection.boundaryFrame, captionShifts, measuredPeak: {original: originalPeak, before: beforePeak, after: afterPeak,
        shift: {frames: 12, observationSamples: 6400, playbackSamples: 17640}}, selectedPulseShifts,
      selectedMotion: {before: beforeMotion, after: afterMotion, shiftFrames: 12},
      limitation: 'The three automatically selected Pulse captions precede every connection and correctly retain zero shift. Nonzero Pulse materialization is covered by the existing small native integration fixture, not by adding a Pulse to this candidate.'});
    for (const [index, fault] of faults.entries()) await store('fault-' + String(index + 1).padStart(2, '0') + '-' + fault.name + '.json', fault);
    const result = {schemaVersion, status: 'passed', guard, completedAt: new Date().toISOString(), elapsedMilliseconds: performance.now() - started,
      command: {executable: process.execPath, argv: [fileURLToPath(import.meta.url), savedInputDirectory, outputDirectory]},
      inputBindingsBefore: inputBindings, inputBindingsAfter: afterBindings, implementationBindings,
      originalFourSavedFileBytesUnchanged: true, allEightSavedInputFileBytesUnchanged: true,
      allEightSavedInputFileHashesAndMtimesUnchanged: true,
      fixedAutomaticJudgmentAndExceptionsUnchanged: true, canonicalCaptionContentAndSourceMappingUnchanged: true,
      variantCount: variants.length, injectedFaultCount: faults.length, rejectedFaultCount: faults.length,
      captionCount: 32, connectionCount: 6, originalFrameCount: baseline.projection.sourceFrameCount,
      automaticDisplayFrameCount: baseline.projection.displayFrameCount, temporaryEditedDisplayFrameCount: connectionOnly.projection.displayFrameCount,
      freshAiCalls: 0, newMedia: 0, originalSavedInputWrites: 0,
      persistedStateVariantCount: persistence.variantCount,
      inspectionStateFileInitializations: persistence.initializedStateFileCount,
      inspectionOverrideFileWrites: persistence.overrideFileWrites,
      noChangeResetOperations: persistence.noChangeOperations, artifacts};
    await save(path.join(outputDirectory, 'completion.json'), result);
    return {...result, completionFile: await binding(path.join(outputDirectory, 'completion.json'))};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion, status: 'failed', message: String(error), stack: error?.stack,
      inputBindings, implementationBindings, persistenceProgress, elapsedMilliseconds: performance.now() - started});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [savedInputDirectory, outputDirectory] = process.argv.slice(2);
  if (!savedInputDirectory || !outputDirectory) throw new TypeError('usage: state-check absolute-saved-input-directory absolute-unused-output-directory');
  const result = await checkOrchestrationSavedStateV001({savedInputDirectory, outputDirectory});
  process.stdout.write(JSON.stringify({status: result.status, variantCount: result.variantCount,
    rejectedFaultCount: result.rejectedFaultCount, completionFile: result.completionFile}, null, 2) + '\n');
}

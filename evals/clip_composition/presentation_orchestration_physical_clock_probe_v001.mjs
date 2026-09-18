/** Small physical clock-fault fixture. Real native PNGs; separate from the automatic candidate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationProjectionV001, projectCaptionPlanV001, projectAudioPeakV001,
  assertProjectionMatchesStateV001} from './presentation_orchestration_projection_v001.mjs';
import {materializeFiniteAutoPresentationCaptionV001} from './presentation_auto_effects_v001.mjs';
import {getPresentationPulseProgramV001, buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001, buildPresentationCaptionMotionStateElementsV001}
  from './presentation_caption_motion_v001.mjs';
import {buildPresentationNativeReferenceArgumentsV001, classifyPresentationNativeFrameRgbV001,
  buildPresentationNativeLayerPlanV001}
  from './presentation_native_frame_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const execute = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schemaVersion = 'presentation-orchestration-physical-clock-probe-v001';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => writeFile(file, json(value), {flag: 'wx'});
const clone = value => structuredClone(value);
const projectionRef = ({path: file, fileSha256}) => ({path: file, fileSha256});
const common = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n'];
async function bind(file) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) {hash.update(chunk); bytes += chunk.length;}
  return {path: path.resolve(file), fileSha256: hash.digest('hex'), bytes};
}
async function verify(ref) {assert.deepEqual(await bind(ref.path), ref);}
function normalOf(element) {
  const value = clone(element); delete value.presentationPulse; delete value.presentationMotion;
  return value;
}
function stateAt(program, frame) {
  const segment = program.segments.find(row => row.startFrame <= frame && frame < row.endFrameExclusive);
  assert(segment, 'the inspected finite clock must cover this frame');
  return segment.state;
}
function boundsOf(states) {
  const boxes = states.map(row => row.inspection.alphaBounds);
  const left = Math.min(...boxes.map(row => row.left)), top = Math.min(...boxes.map(row => row.top));
  const right = Math.max(...boxes.map(row => row.right)), bottom = Math.max(...boxes.map(row => row.bottom));
  return {left, top, width: right - left, height: bottom - top};
}
function nearestClasses(decision) {
  const least = Math.min(...decision.classes.map(row => row.absoluteRgbDifference));
  return decision.classes.filter(row => row.absoluteRgbDifference === least).map(row => row.id);
}

export async function runOrchestrationPhysicalClockProbeV001({preparationPath, sourceBindingsPath, outputDirectory, ffmpegPath,
  publishedOverlayDirectory}) {
  for (const value of [preparationPath, sourceBindingsPath, outputDirectory, ffmpegPath, publishedOverlayDirectory]) assert(path.isAbsolute(value));
  assert.equal(process.versions.node, '20.19.6', 'this physical inspection uses the fixed Node 20 runtime');
  const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await mkdir(outputDirectory);
  const started = performance.now(), commands = [], inputs = [], artifacts = [], samples = [];
  const observedDirectory = path.join(outputDirectory, 'observed');
  const run = async (label, args) => {
    const entry = {label, executable: ffmpegPath, args, startedAt: new Date().toISOString()}; commands.push(entry);
    try {
      const result = await execute(ffmpegPath, args, {encoding: 'buffer', maxBuffer: 16 * 1024 * 1024});
      entry.exitCode = 0; entry.stdoutSha256 = sha(result.stdout); entry.stderrSha256 = sha(result.stderr);
    } catch (error) {
      entry.exitCode = error.code; entry.stderr = error.stderr?.toString('utf8'); throw error;
    }
  };
  const store = async (name, value) => {
    const file = path.join(outputDirectory, name); await save(file, value); artifacts.push(await bind(file)); return file;
  };
  try {
    for (const file of [preparationPath, sourceBindingsPath, ffmpegPath, process.execPath,
      ...['presentation_orchestration_physical_clock_probe_v001.mjs', 'presentation_orchestration_projection_v001.mjs',
        'connection_expression_v001.mjs', 'presentation_auto_effects_v001.mjs', 'presentation_pulse_v001.mjs',
        'presentation_caption_motion_v001.mjs', 'presentation_native_frame_qc_v001.mjs',
        'presentation_caption_contract_v002.mjs'].map(name => path.join(repo, 'evals/clip_composition', name))])
      inputs.push(await bind(file));
    const preparation = JSON.parse(await readFile(preparationPath)), source = JSON.parse(await readFile(sourceBindingsPath));
    const baselineRef = preparation.provenance.inputRefs.find(row => row.role === 'baseline-plan');
    assert(baselineRef); assert.equal(sha(source.planBytes), source.planRef.fileSha256);
    assert.equal(source.planRef.path, baselineRef.path); assert.equal(source.planRef.fileSha256, baselineRef.fileSha256);
    const pulseRecord = preparation.records.find(row => row.pulseStates);
    const motionRecord = preparation.records.find(row => row.element.presentationMotion?.presentation === 'provisional-shake');
    assert(pulseRecord && motionRecord);
    const canvas = pulseRecord.props.canvas;
    assert.deepEqual(canvas, motionRecord.props.canvas); assert.equal(canvas.fps, 30);
    const originalPlan = JSON.parse(source.planBytes);
    const originals = [pulseRecord, motionRecord].map(record => {
      const value = originalPlan.elements.find(row => row.instructionId === record.element.instructionId);
      assert(value); assert.deepEqual(normalOf(record.element), value);
      return clone(value);
    });
    const nativeDirectory = path.join(outputDirectory, 'native-inputs');
    await mkdir(nativeDirectory); await mkdir(observedDirectory);
    const physicalGroups = [];
    for (const [kind, record, build] of [['pulse', pulseRecord, buildPresentationPulseStateElementsV001],
      ['motion', motionRecord, buildPresentationCaptionMotionStateElementsV001]]) {
      const supplied = kind === 'pulse' ? record.pulseStates : record.motionStates;
      const expected = build({element: record.element, canvas});
      assert.equal(supplied.length, expected.length);
      const states = [];
      for (const [index, native] of supplied.entries()) {
        assert.equal(native.state, expected[index].state); assert.deepEqual(native.element, expected[index].element);
        assert.equal(sha(canonicalJson(native.props)), native.inspection.appliedOverlayPropsCanonicalSha256);
        // Publication moves the renderer's publish directory. The caller supplies
        // the published location explicitly; the original recorded PNG SHA must match.
        assert.equal(path.basename(path.dirname(native.pngPath)), 'overlays');
        const publishedPath = path.join(publishedOverlayDirectory, path.basename(native.pngPath));
        const bytes = await readFile(publishedPath), input = await bind(publishedPath);
        assert.equal(input.fileSha256, native.pngSha256); assert.equal(input.fileSha256, native.inspection.overlaySha256);
        assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'real PNG signature required');
        assert.equal(bytes.readUInt32BE(16), canvas.width); assert.equal(bytes.readUInt32BE(20), canvas.height);
        inputs.push(input);
        const file = path.join(nativeDirectory, kind + '-' + native.state + '.png');
        await writeFile(file, bytes, {flag: 'wx'}); const copied = await bind(file); assert.equal(copied.fileSha256, input.fileSha256);
        artifacts.push(copied);
        states.push({state: native.state, bindingId: kind + '-' + native.state, pngPath: file,
          pngSha256: native.pngSha256, originalRecordedPngPath: native.pngPath,
          publishedPng: input, inspection: clone(native.inspection)});
      }
      physicalGroups.push({kind, sourceCaptionId: record.element.instructionId, states, alternates: [], crop: boundsOf(states)});
    }
    const background = path.join(outputDirectory, 'black-background.png');
    await run('make-physical-background', [...common, '-f', 'lavfi', '-i',
      'color=c=black:s=' + canvas.width + 'x' + canvas.height + ':r=' + canvas.fps,
      '-frames:v', '1', '-c:v', 'png', '-threads', '1', background]);
    const mediaRef = await bind(background); artifacts.push(mediaRef);
    // Only the inspection clock has this boundary. Candidate plans and choices are never rewritten.
    const boundaryFrame = 30, sourceFrameCount = 200;
    assert(originals.every(row => row.startFrame >= boundaryFrame && row.endFrameExclusive <= sourceFrameCount));
    const plan = {...clone(originalPlan), elements: originals};
    const planPath = await store('fixture-normal-plan.json', plan), planBytes = await readFile(planPath);
    const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
      baseMedia: {frameRate: '30/1', expectedFrameCount: sourceFrameCount, fileSha256: mediaRef.fileSha256},
      segments: [{segmentId: 'inspection-before', outputStartFrame: 0, outputEndFrame: boundaryFrame,
        sourceStartFrame30: 0, sourceEndFrame30: boundaryFrame},
      {segmentId: 'inspection-after', outputStartFrame: boundaryFrame, outputEndFrame: sourceFrameCount,
        sourceStartFrame30: boundaryFrame, sourceEndFrame30: sourceFrameCount}]};
    const timelinePath = await store('fixture-clock.json', timeline), timelineBytes = await readFile(timelinePath);
    const projectionInput = {digestRef: {version: 'physical-clock-inspection-only-v001', sha256: sha(planBytes)},
      planRef: projectionRef(await bind(planPath)), timelineRef: projectionRef(await bind(timelinePath)),
      mediaRef: projectionRef(mediaRef), planBytes, timelineBytes,
      playbackSampleRate: source.playbackSampleRate, observationSampleRate: source.observationSampleRate,
      connections: [{connectionId: 'connection-01', preset: 'black-separator', presetVersion: 'v001'}]};
    const projection = createOrchestrationProjectionV001(projectionInput);
    assert.equal(projection.displayFrameCount - projection.sourceFrameCount, 12);
    const projected = projectCaptionPlanV001({projection, planBytes});
    const peak = source.captionContext.pulseTimingEvidence.peaks.find(row => row.peakId === pulseRecord.element.presentationPulse.anchorPeakId);
    assert(peak);
    assert.equal(source.observationSampleRate, source.captionContext.pulseTimingEvidence.sampleRate);
    assert.equal(Number(BigInt(peak.peakSample) * 30n / BigInt(source.observationSampleRate)), pulseRecord.element.presentationPulse.anchorFrame);
    const originalPeak = {clock: 'digest-original', sourceClockSha256: projection.sourceClockSha256,
      peakId: peak.peakId, sample: peak.peakSample, sampleRate: source.captionContext.pulseTimingEvidence.sampleRate};
    const projectedPeak = projectAudioPeakV001({projection, peak: originalPeak});
    const pulseElement = materializeFiniteAutoPresentationCaptionV001({element: projected.plan.elements[0], canvas,
      selection: {role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId: peak.peakId},
      measuredPeak: {peakId: peak.peakId, peakSample: projectedPeak.displaySample, sampleRate: originalPeak.sampleRate}});
    const motionElement = {...projected.plan.elements[1], presentationMotion: clone(motionRecord.element.presentationMotion)};
    const pulseProgram = getPresentationPulseProgramV001({element: pulseElement, canvas});
    const motionProgram = getPresentationCaptionMotionProgramV001({element: motionElement, canvas});
    const oldPeakElement = {...pulseElement, presentationPulse: {...pulseElement.presentationPulse,
      anchorFrame: pulseRecord.element.presentationPulse.anchorFrame}};
    const oldPeakProgram = getPresentationPulseProgramV001({element: oldPeakElement, canvas});
    const oldMotionProgram = getPresentationCaptionMotionProgramV001({element: motionRecord.element, canvas});
    assert.equal(pulseProgram.anchorFrame - oldPeakProgram.anchorFrame, 12);
    assert.equal(motionElement.startFrame - motionRecord.element.startFrame, 12);
    await store('fixture-projection-and-programs.json', {schemaVersion,
      scope: 'inspection-only clock with a static physical background; real native glyph PNGs and finite states; no candidate edit',
      backgroundMeaning: 'one black physical frame held on the synthetic source clock; no source-video/audio reconstruction is claimed',
      projection, originalPeak, projectedPeak, pulseElement, motionElement, pulseProgram, motionProgram,
      oldPeakProgram, oldMotionProgram, physicalGroups});

    // The same gate is used for every real observation and the stale-projection fault.
    const observe = async ({name, frame, element, state, group, currentProjection = projection, currentInput = projectionInput}) => {
      assertProjectionMatchesStateV001({projection: currentProjection, ...currentInput});
      const active = element.startFrame <= frame && frame < element.endFrameExclusive;
      if (active) {
        const local = frame - element.startFrame;
        assert(local + 1 >= 4 && element.displayFrameCount - local >= 4,
          'single-frame observations must be on the unchanged fully visible common fade plateau');
      }
      const file = path.join(observedDirectory, name + '.rgb');
      const args = [...common, '-filter_complex_threads', '1', '-i', background];
      let filter;
      if (active) {
        const native = group.states.find(row => row.state === state); assert(native);
        args.push('-threads', '1', '-i', native.pngPath);
        filter = '[0:v]format=yuv420p[base];[1:v]format=rgba[caption];'
          + '[base][caption]overlay=0:0:eof_action=pass:shortest=0:repeatlast=0[composed];[composed]';
      } else filter = '[0:v]';
      const crop = group.crop;
      filter += 'format=yuv420p,format=rgb24,crop=' + crop.width + ':' + crop.height + ':' + crop.left + ':' + crop.top + ':exact=1[out]';
      args.push('-filter_complex', filter, '-map', '[out]', '-frames:v', '1', '-c:v', 'rawvideo',
        '-threads', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', file);
      await run('observe-' + name, args);
      const ref = await bind(file), rgb = await readFile(file); assert.equal(rgb.length, crop.width * crop.height * 3);
      artifacts.push(ref);
      return {name, frame, active, state: active ? state : 'omitted', interval: {startFrame: element.startFrame,
        endFrameExclusive: element.endFrameExclusive}, ref, rgb};
    };
    const beforeStaleCommands = commands.length, beforeStaleFiles = await readdir(observedDirectory);
    const changedInput = {...projectionInput, connections: [{connectionId: 'connection-01', preset: 'soft-separator', presetVersion: 'v001'}]};
    const changedProjection = createOrchestrationProjectionV001(changedInput);
    assert.equal(changedProjection.displayFrameCount, projection.displayFrameCount);
    let staleError;
    try {await observe({name: 'stale-projection-must-not-render', frame: pulseProgram.anchorFrame,
      element: pulseElement, state: 'maximum', group: physicalGroups[0], currentProjection: projection, currentInput: changedInput});}
    catch (error) {staleError = error;}
    assert(staleError instanceof TypeError); assert.equal(commands.length, beforeStaleCommands);
    assert.deepEqual(await readdir(observedDirectory), beforeStaleFiles);
    const staleFault = {name: 'same-duration-stale-projection', status: 'rejected-before-physical-draw',
      assertion: 'assertProjectionMatchesStateV001 at the shared observe entry',
      previousProjectionSha256: projection.projectionSha256, expectedProjectionSha256: changedProjection.projectionSha256,
      beforeCommandCount: beforeStaleCommands, afterCommandCount: commands.length,
      observationFilesBefore: beforeStaleFiles, observationFilesAfter: await readdir(observedDirectory),
      error: {type: staleError.name, message: staleError.message}};

    const referencesFor = async (group, element) => {
      const frame = element.startFrame + 4;
      const references = group.states.map(row => ({id: row.state, layers: [{bindingId: row.bindingId,
        localFrame: frame - element.startFrame, displayFrameCount: element.displayFrameCount}]}));
      references.push({id: 'omitted', layers: []});
      const files = references.map(row => path.join(outputDirectory, 'reference-' + group.kind + '-' + row.id + '.rgb'));
      const nativeLayers = buildPresentationNativeLayerPlanV001({samples: [{references}], sceneBindings: [group],
        directory: path.join(outputDirectory, 'prepared-' + group.kind)});
      assert(nativeLayers.layers.every(layer => !layer.generated), 'this clock probe requires the existing full-opacity plateau');
      const args = buildPresentationNativeReferenceArgumentsV001({sample: {crop: group.crop, references}, nativeLayers,
        sceneBindings: [group], baseFramePath: background, outputPaths: files}).map(value => value === '-y' ? '-n' : value);
      await run('native-oracle-' + group.kind, args);
      const result = new Map();
      for (const [index, row] of references.entries()) {
        const ref = await bind(files[index]), rgb = await readFile(files[index]);
        assert.equal(rgb.length, group.crop.width * group.crop.height * 3); artifacts.push(ref);
        result.set(row.id, {id: row.id, ref, rgb});
      }
      return result;
    };
    const oracles = [await referencesFor(physicalGroups[0], pulseElement), await referencesFor(physicalGroups[1], motionElement)];
    const inspect = (observed, expectedState, oracle) => {
      const references = [...oracle.values()].map(row => ({id: row.id === expectedState ? 'expected' : row.id, rgb: row.rgb}));
      const decision = classifyPresentationNativeFrameRgbV001({completedRgb: observed.rgb, references});
      const record = {...observed}; delete record.rgb;
      return {...record, expectedState, decision, nearestClassIds: nearestClasses(decision),
        referenceFiles: [...oracle.values()].map(row => ({state: row.id, ...row.ref}))};
    };
    const assertPositive = result => {
      assert.equal(result.decision.visible, true, 'correct physical state must uniquely win');
      assert.deepEqual(result.nearestClassIds, [result.decision.expectedClassId]);
    };
    const assertNegative = result => {
      assert.equal(result.decision.visible, false, 'physical clock fault must fail the native classifier');
      assert(!result.nearestClassIds.includes(result.decision.expectedClassId), 'a different physical state must win');
    };
    for (const frame of [...new Set([oldPeakProgram.anchorFrame, pulseProgram.normalBeforeFrame,
      pulseProgram.maximumFrame, pulseProgram.normalAfterFrame])].sort((a, b) => a - b)) {
      const expectedState = stateAt(pulseProgram, frame);
      const good = inspect(await observe({name: 'pulse-correct-' + frame, frame, element: pulseElement,
        state: expectedState, group: physicalGroups[0]}), expectedState, oracles[0]); assertPositive(good);
      const old = inspect(await observe({name: 'pulse-old-peak-' + frame, frame, element: oldPeakElement,
        state: stateAt(oldPeakProgram, frame), group: physicalGroups[0]}), expectedState, oracles[0]);
      if (stateAt(oldPeakProgram, frame) !== expectedState) assertNegative(old); else assertPositive(old);
      samples.push({kind: 'pulse', frame, changedDimension: 'only peak clock; caption interval and fade clock unchanged', correct: good, fault: old});
    }
    for (const frame of [motionProgram.representativeFrame, motionProgram.stableStartFrame]) {
      const expectedState = stateAt(motionProgram, frame);
      const good = inspect(await observe({name: 'motion-correct-' + frame, frame, element: motionElement,
        state: expectedState, group: physicalGroups[1]}), expectedState, oracles[1]); assertPositive(good);
      // Deliberately keep the correct visibility/fade interval: only state selection uses the old start.
      const oldState = stateAt(oldMotionProgram, frame);
      const old = inspect(await observe({name: 'motion-old-start-' + frame, frame, element: motionElement,
        state: oldState, group: physicalGroups[1]}), expectedState, oracles[1]);
      if (oldState !== expectedState) assertNegative(old); else assertPositive(old);
      samples.push({kind: 'motion', frame, changedDimension: 'only finite-state start; caption interval and fade clock unchanged', correct: good, fault: old});
    }
    const staticElement = normalOf(pulseElement);
    const missing = {...staticElement, startFrame: originals[0].startFrame, endFrameExclusive: originals[0].endFrameExclusive};
    const doubled = {...staticElement, startFrame: staticElement.startFrame + 12, endFrameExclusive: staticElement.endFrameExclusive + 12};
    for (const frame of [staticElement.startFrame + 4, staticElement.endFrameExclusive - 5]) {
      const good = inspect(await observe({name: 'caption-correct-' + frame, frame, element: staticElement,
        state: 'normal', group: physicalGroups[0]}), 'normal', oracles[0]); assertPositive(good);
      const faults = [];
      for (const [name, element] of [['missing-shift', missing], ['double-shift', doubled]]) {
        const result = inspect(await observe({name: 'caption-' + name + '-' + frame, frame, element,
          state: 'normal', group: physicalGroups[0]}), 'normal', oracles[0]);
        if (!result.active) assertNegative(result); else assertPositive(result);
        faults.push({name, result});
      }
      samples.push({kind: 'caption-interval', frame, correct: good, faults});
    }
    const faultSummary = [
      ...['pulse', 'motion'].map(kind => ({name: kind === 'pulse' ? 'old-peak-clock' : 'old-motion-start-clock',
        rejectedAtFrames: samples.filter(row => row.kind === kind && !row.fault.decision.visible).map(row => row.frame)})),
      ...['missing-shift', 'double-shift'].map(name => ({name,
        rejectedAtFrames: samples.filter(row => row.kind === 'caption-interval'
          && !row.faults.find(fault => fault.name === name).result.decision.visible).map(row => row.frame)}))];
    assert(faultSummary.every(row => row.rejectedAtFrames.length > 0));
    for (const input of inputs) await verify(input);
    for (const artifact of artifacts) await verify(artifact);
    const result = {schemaVersion, status: 'passed', completedAt: new Date().toISOString(),
      elapsedMilliseconds: performance.now() - started, guard,
      scope: 'inspection-only physical RGB fixture, independent of the untouched automatic candidate; no full-video or codec-quality claim',
      clock: {boundaryFrame, insertedFrames: 12, sourceFrameCount, displayFrameCount: projection.displayFrameCount,
        originalPeakFrame: oldPeakProgram.anchorFrame, projectedPeakFrame: pulseProgram.anchorFrame,
        originalMotionStartFrame: motionRecord.element.startFrame, projectedMotionStartFrame: motionElement.startFrame,
        projectionSha256: projection.projectionSha256},
      comparison: 'existing native classifier: exact RGB equivalence classes, equal-weight integer L1, strict unique minimum; whole native-state bounds',
      observedDrawing: 'independent one-frame FFmpeg overlay of the real native PNG selected by the finite program; samples are on the unchanged common fade plateau',
      oracleDrawing: 'existing native-reference compositor with all native states plus an actually rendered omitted reference',
      publishedOverlayDirectory,
      nativePathResolution: physicalGroups.flatMap(group => group.states.map(row => ({recordedPath: row.originalRecordedPngPath,
        publishedPath: row.publishedPng.path, fileSha256: row.pngSha256, publishedBytes: row.publishedPng.bytes}))),
      originalInputBytesUnchanged: true, positiveObservationCount: samples.length,
      physicalFaultCount: faultSummary.length, faultSummary, staleFault,
      inputsBefore: inputs, inputsAfter: await Promise.all(inputs.map(ref => bind(ref.path))), artifacts, samples, commands,
      fullLengthRenders: 0, candidateOverrides: 0, aiCalls: 0, apiCalls: 0};
    await save(path.join(outputDirectory, 'completion.json'), result);
    return {...result, completionRef: await bind(path.join(outputDirectory, 'completion.json'))};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion, status: 'failed', message: String(error),
      stack: error.stack, inputs, artifacts, samples, commands, elapsedMilliseconds: performance.now() - started});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [preparationPath, sourceBindingsPath, outputDirectory, ffmpegPath, publishedOverlayDirectory] = process.argv.slice(2);
  if (!publishedOverlayDirectory) throw new TypeError('usage: physical-clock-probe absolute-preparation absolute-source-bindings absolute-unused-output absolute-ffmpeg absolute-published-overlays');
  const result = await runOrchestrationPhysicalClockProbeV001({preparationPath, sourceBindingsPath, outputDirectory, ffmpegPath, publishedOverlayDirectory});
  process.stdout.write(JSON.stringify({status: result.status, positiveObservationCount: result.positiveObservationCount,
    faultSummary: result.faultSummary, staleFault: result.staleFault.status, completionRef: result.completionRef}, null, 2) + '\n');
}

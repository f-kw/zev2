#!/usr/bin/env node
// Bounded research check: existing resolver only; no media generation or writes
// to the repository, canonical inputs, renderer, trust, or presentation contract.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolvePresentationEffectsV001 as resolve, PRESENTATION_BLACK_FRAME_COUNT_V001 as BLACK_FRAMES}
  from './presentation_effects_v001.mjs';

const TASK = '/private/tmp/zev-connection-study-_ijhcn1e';
const REPOSITORY = '/Users/kawafmm/workspace/zev2';
const RESULT_PATH = path.join(TASK, 'clock-contract-check-result-v002.json');
const COMPLETION_PATH = path.join(REPOSITORY,
  'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/phase2-completion-v001/completion-record.json');
const FIXTURE_RESULT_PATH = path.join(TASK, 'technical-fixtures-v001/physical-fixture-result.json');
const sha = value => createHash('sha256').update(value).digest('hex');
const serializedSha = value => sha(JSON.stringify(value));
const bindings = new Map();
const readBound = async file => {
  const bytes = await readFile(file);
  bindings.set(file, {path: file, bytes: bytes.length, sha256: sha(bytes)});
  return bytes;
};
const readJson = async file => JSON.parse((await readBound(file)).toString('utf8'));
const report = {schemaVersion: 'connection-clock-contract-research-v001', status: 'running',
  scope: 'Existing 12-frame black resolver clock and local fixture mapping only. No transition adoption, perceptual evaluation, selector implementation, or production connection.',
  mediaGenerationPerformed: false, physicalSampleIdentityClaim: false,
  explanation: 'This check verifies schedules and source mapping. Actual frame/PCM identity belongs to the separately bound physical fixture result.',
  checks: [], negativeChecks: []};

try {
  await readBound(fileURLToPath(import.meta.url));
  await readBound(path.join(TASK, 'worktree/evals/clip_composition/presentation_effects_v001.mjs'));
  const completion = await readJson(COMPLETION_PATH);
  const timelinePath = path.join(REPOSITORY, completion.bindings.baseMediaTimeline.path);
  const planPath = path.join(REPOSITORY, completion.bindings.commonPlan.path);
  const timeline = await readJson(timelinePath), plan = await readJson(planPath);
  assert.equal(bindings.get(timelinePath).sha256, completion.bindings.baseMediaTimeline.fileSha256);
  assert.equal(bindings.get(planPath).sha256, completion.bindings.commonPlan.fileSha256);
  const physical = await readJson(FIXTURE_RESULT_PATH);
  assert.equal(physical.status, 'passed');
  assert.equal(BLACK_FRAMES, 12);
  assert.equal(plan.canvas.fps, 30);
  assert.equal(timeline.sourceFrameClock.logicalFrameRate, '30/1');
  assert.equal(timeline.sourceFrameClock.inputFrameRate, '60/1');
  assert.equal(timeline.sourceFrameClock.extractionRuleId, 'source-frame-60fps-global-even-v001');
  const frameCount = timeline.baseMedia.expectedFrameCount;
  const originalPlan = structuredClone(plan), originalTimeline = structuredClone(timeline);
  const input = {plan, baseTimeline: timeline, expectedFrameCount: frameCount};
  const connections = timeline.segments.slice(1).map((after, index) => {
    const before = timeline.segments[index];
    assert.equal(before.outputEndFrame, after.outputStartFrame);
    return {beforeSegmentId: before.segmentId, afterSegmentId: after.segmentId, transition: 'black'};
  });
  assert.equal(connections.length, 11);
  const boundaryFor = connection => timeline.segments.find(segment => segment.segmentId === connection.beforeSegmentId).outputEndFrame;
  const sourceFor = frame => {
    const segment = timeline.segments.find(value => value.outputStartFrame <= frame && frame < value.outputEndFrame);
    assert(segment, `unmapped canonical frame ${frame}`);
    const logicalSourceFrame30 = segment.sourceStartFrame30 + frame - segment.outputStartFrame;
    return {canonicalFrame: frame, segmentId: segment.segmentId, sourceRef: timeline.sourceRef,
      logicalSourceFrame30, decodedSourceFrame60: logicalSourceFrame30 * 2};
  };
  const originalSourceMap = Array.from({length: frameCount}, (_, frame) => sourceFor(frame));
  const originalSourceHash = serializedSha(originalSourceMap);
  const unchanged = () => {
    assert.deepEqual(plan, originalPlan, 'original canonical plan mutated');
    assert.deepEqual(timeline, originalTimeline, 'original canonical timeline mutated');
  };
  const expand = resolved => {
    const spans = resolved.presentationTimeline?.spans ?? [{kind: 'base', baseStartFrame: 0,
      baseEndFrame: frameCount, startFrame: 0, endFrameExclusive: frameCount}];
    const frames = [];
    let displayEnd = 0;
    for (const span of spans) {
      assert.equal(span.startFrame, displayEnd, 'output span gap or overlap');
      assert(span.endFrameExclusive > span.startFrame);
      if (span.kind === 'base') {
        assert.equal(span.baseEndFrame - span.baseStartFrame, span.endFrameExclusive - span.startFrame);
      } else {
        assert.equal(span.kind, 'black');
        assert.equal(span.endFrameExclusive - span.startFrame, BLACK_FRAMES);
        assert.deepEqual(Object.keys(span).sort(),
          ['kind', 'beforeSegmentId', 'afterSegmentId', 'startFrame', 'endFrameExclusive'].sort());
      }
      for (let displayFrame = span.startFrame; displayFrame < span.endFrameExclusive; displayFrame++) {
        frames.push(span.kind === 'base' ? span.baseStartFrame + displayFrame - span.startFrame : null);
      }
      displayEnd = span.endFrameExclusive;
    }
    assert.equal(displayEnd, resolved.expectedFrameCount);
    return {spans, frames};
  };
  const inspect = (id, selection) => {
    const resolved = resolve({...input, effects: {connections: selection}});
    const cuts = selection.filter(connection => connection.transition === 'black').map(boundaryFor).sort((a, b) => a - b);
    assert.equal(resolved.expectedFrameCount, frameCount + cuts.length * BLACK_FRAMES);
    const {spans, frames} = expand(resolved);
    assert.deepEqual(frames.filter(frame => frame !== null), Array.from({length: frameCount}, (_, frame) => frame));
    const actualSource = frames.filter(frame => frame !== null).map(sourceFor);
    assert.deepEqual(actualSource, originalSourceMap);
    const blackSpans = spans.filter(span => span.kind === 'black');
    assert.equal(blackSpans.length, cuts.length);
    for (const [index, span] of blackSpans.entries()) {
      assert.equal(span.startFrame, cuts[index] + index * BLACK_FRAMES);
      assert.equal(span.endFrameExclusive, cuts[index] + (index + 1) * BLACK_FRAMES);
    }
    const captions = plan.elements.map((caption, index) => {
      const shift = cuts.filter(boundary => boundary <= caption.startFrame).length * BLACK_FRAMES;
      const changed = resolved.plan.elements[index];
      assert.deepEqual(changed, {...caption, startFrame: caption.startFrame + shift,
        endFrameExclusive: caption.endFrameExclusive + shift});
      return {captionId: caption.instructionId, originalStartFrame: caption.startFrame,
        originalEndFrameExclusive: caption.endFrameExclusive, shiftedStartFrame: changed.startFrame,
        shiftedEndFrameExclusive: changed.endFrameExclusive, shiftFrames: shift,
        displayLengthAndOtherPropertiesUnchanged: true};
    });
    assert.equal(resolved.plan.elements.length, plan.elements.length);
    const sampleSchedule = spans.map(span => ({kind: span.kind,
      startSamplePerChannel: span.startFrame * 1600, endSamplePerChannelExclusive: span.endFrameExclusive * 1600,
      baseStartSamplePerChannel: span.kind === 'base' ? span.baseStartFrame * 1600 : null,
      baseEndSamplePerChannelExclusive: span.kind === 'base' ? span.baseEndFrame * 1600 : null}));
    for (const span of sampleSchedule) {
      if (span.kind === 'base') assert.equal(span.endSamplePerChannelExclusive - span.startSamplePerChannel,
        span.baseEndSamplePerChannelExclusive - span.baseStartSamplePerChannel);
      else assert.equal(span.endSamplePerChannelExclusive - span.startSamplePerChannel, 19200);
    }
    unchanged();
    const record = {id, status: 'passed', blackConnectionCount: cuts.length, originalFrameCount: frameCount,
      outputFrameCount: resolved.expectedFrameCount, insertedFrameCount: cuts.length * BLACK_FRAMES,
      allRetainedFramesInOriginalOrderExactlyOnce: true, originalSourceMapSha256: originalSourceHash,
      retainedSourceMapSha256: serializedSha(actualSource), fullDisplayMapSha256: serializedSha(frames),
      originalCaptionCount: plan.elements.length, captionChecks: captions, spans, sampleSchedule,
      sampleScheduleScope: '48kHz / 30fps integer schedule only; no audio samples generated or inspected by this check'};
    report.checks.push(record);
    return {resolved, frames, record};
  };

  const allBlack = inspect('all-11-connections-black', connections);
  assert.equal(allBlack.resolved.expectedFrameCount, 44540);
  const reverse = resolve({...input, effects: {connections: [...connections].reverse()}});
  assert.deepEqual(reverse, allBlack.resolved);
  report.unsortedInputHasSameResolvedPlanAndTimeline = true;

  for (const [index, resetConnection] of connections.entries()) {
    const selection = connections.map((connection, other) => ({...connection,
      transition: index === other ? 'normal-cut' : 'black'}));
    const checked = inspect(`reset-only-connection-${String(index + 1).padStart(2, '0')}`, selection);
    assert.equal(checked.resolved.expectedFrameCount, 44528);
    assert(!checked.record.spans.some(span => span.kind === 'black'
      && span.beforeSegmentId === resetConnection.beforeSegmentId && span.afterSegmentId === resetConnection.afterSegmentId));
    const remaining = checked.record.spans.filter(span => span.kind === 'black')
      .map(span => [span.beforeSegmentId, span.afterSegmentId]);
    assert.deepEqual(remaining, connections.filter((_, other) => index !== other)
      .map(connection => [connection.beforeSegmentId, connection.afterSegmentId]));
    checked.record.onlyRequestedConnectionReset = true;
    checked.record.resetStartsFromOriginalCanonicalInput = true;
  }

  report.localFixtureComparisons = [];
  for (const number of [1, 2, 11]) {
    const connectionId = `connection-${String(number).padStart(2, '0')}`;
    const fixture = physical.results.find(item => item.connectionId === connectionId);
    assert(fixture, `missing physical fixture ${connectionId}`);
    assert.equal(fixture.canonicalWindowVerification.status, 'passed');
    assert.equal(fixture.excerpt.canonicalSha256, completion.bindings.finalMp4.fileSha256);
    assert.equal(fixture.excerpt.canonicalTimelinePath, timelinePath);
    assert.equal(fixture.excerpt.canonicalPlanPath, planPath);
    const checked = inspect(`single-black-${connectionId}`, [connections[number - 1]]);
    const item = fixture.excerpt;
    assert.equal(boundaryFor(connections[number - 1]), item.originalStartFrame + item.boundaryFrame);
    const localFrames = checked.frames.slice(item.originalStartFrame, item.originalStartFrame + item.frameCount + BLACK_FRAMES)
      .map((canonicalFrame, displayFrame) => ({displayFrame,
        excerptBaseFrame: canonicalFrame === null ? null : canonicalFrame - item.originalStartFrame,
        source: canonicalFrame === null ? null : sourceFor(canonicalFrame)}));
    const mapPath = path.join(TASK, 'technical-fixtures-v001', connectionId, 'black-source-map.json');
    const map = await readJson(mapPath);
    assert.deepEqual(localFrames, map.frames, 'full resolver projection differs from the rendered local fixture map');
    assert.equal(localFrames.length, 252);
    assert.equal(localFrames.filter(frame => frame.source === null).length, 12);
    report.localFixtureComparisons.push({connectionId, status: 'passed',
      fullResolverProjectionEqualsEverySavedFixtureFrame: true, comparedFrameCount: localFrames.length,
      fullResolverLocalMapSha256: serializedSha(localFrames), fixtureLocalMapSha256: serializedSha(map.frames),
      fixtureMapBinding: bindings.get(mapPath), originalStartFrame: item.originalStartFrame,
      canonicalBoundaryFrame: boundaryFor(connections[number - 1])});
  }

  report.identityChecks = [];
  for (const [id, effects] of [['undefined', undefined], ['empty', {}],
    ['all-normal', {connections: connections.map(connection => ({...connection, transition: 'normal-cut'}))}]]) {
    const resolved = resolve({...input, effects});
    assert.equal(resolved.plan, plan);
    assert.equal(resolved.presentationTimeline, null);
    assert.equal(resolved.expectedFrameCount, frameCount);
    assert.deepEqual(expand(resolved).frames, Array.from({length: frameCount}, (_, frame) => frame));
    unchanged();
    report.identityChecks.push({id, status: 'passed', sameOriginalPlanObject: true,
      originalVideoAudioCaptionScheduleRestored: true, resetStartsFromOriginalCanonicalInput: true});
  }

  const reject = (id, build, expectedMessage) => {
    const copiedPlan = structuredClone(plan), copiedTimeline = structuredClone(timeline);
    const candidate = build({plan: copiedPlan, baseTimeline: copiedTimeline, expectedFrameCount: frameCount});
    let caught;
    try { resolve(candidate); } catch (error) { caught = error; }
    assert(caught instanceof TypeError, `${id}: expected a TypeError rejection`);
    assert.match(caught.message, expectedMessage, `${id}: rejected for an unexpected reason`);
    unchanged();
    report.negativeChecks.push({id, status: 'passed', rejected: true, errorName: caught.name, message: caught.message});
  };
  const selection = connection => base => ({...base, effects: {connections: [connection]}});
  reject('unknown-before-segment', selection({...connections[0], beforeSegmentId: 'missing'}), /connection is not adjacent/);
  reject('unknown-after-segment', selection({...connections[0], afterSegmentId: 'missing'}), /connection is not adjacent/);
  reject('nonadjacent-segments', selection({...connections[0], afterSegmentId: timeline.segments[2].segmentId}), /connection is not adjacent/);
  reject('duplicate-connection', base => ({...base, effects: {connections: [connections[0], {...connections[0]}]}}), /duplicate connection selection/);
  reject('unknown-transition', selection({...connections[0], transition: 'crossfade'}), /invalid connection selection/);
  for (const [key, value] of [['durationFrames', 12], ['durationMs', 400], ['fadeCurve', 'linear'], ['gain', 1], ['x', 0]]) {
    reject(`drawing-field-${key}`, selection({...connections[0], [key]: value}), /invalid connection selection/);
  }
  reject('caption-crosses-selected-boundary', base => {
    const boundary = boundaryFor(connections[0]);
    const caption = base.plan.elements.find(element => element.endFrameExclusive === boundary);
    assert(caption);
    caption.endFrameExclusive += 1; caption.displayFrameCount += 1;
    return {...base, effects: {connections: [connections[0]]}};
  }, /caption crosses selected connection/);
  reject('black-at-non-30fps', base => {
    base.plan.canvas.fps = 60;
    return {...base, effects: {connections: [connections[0]]}};
  }, /12-frame black requires the 30fps digest clock/);

  unchanged();
  for (const binding of bindings.values()) assert.equal(sha(await readFile(binding.path)), binding.sha256, `input changed: ${binding.path}`);
  report.inputBindings = [...bindings.values()];
  report.inputBindingsUnchanged = true;
  report.summary = {connectionCount: connections.length, canonicalFrameCount: frameCount,
    canonicalCaptionCount: plan.elements.length, allBlackInsertedFrames: 132,
    individualResetCases: 11, localFixtureCases: 3, identityCases: report.identityChecks.length,
    negativeCases: report.negativeChecks.length, positiveScheduleCases: report.checks.length};
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = {name: error.name, message: error.message};
  report.inputBindings = [...bindings.values()];
}

await writeFile(RESULT_PATH, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({status: report.status, resultPath: RESULT_PATH, summary: report.summary ?? null}));
if (report.status !== 'passed') process.exitCode = 1;

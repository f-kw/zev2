import test from 'node:test';
import assert from 'node:assert/strict';
import {C_ALL_IDENTITY, inspectCAllClockAndNormal, adaptCAllNativeAudio} from './q4-c-all-input.mjs';
import {materializeFiniteAutoPresentationCaptionV001}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';

function originalFixture() {
  const position = {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6};
  const plan = {canvas: {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}},
  elements: Array.from({length: 325}, (_, i) => ({instructionId: `caption-${i}`, kind: 'speech-caption',
    text: `字幕${i}`, indexedLines: [{renderedText: `字幕${i}`}], startFrame: i * 100,
    endFrameExclusive: i * 100 + 1, displayFrameCount: 1,
    visualState: {textStyle: {fontSizePx: 94, fontAssetId: 'line-seed-jp-extra-bold-v001'}, position,
      background: null}, transition: {transitionId: 'quick-fade-4f-v001',
      entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}}}))};
  const segments = Array.from({length: 12}, (_, i) => ({segmentId: `segment-${i}`,
    sourceStartMs: i * 70000, sourceEndMs: i * 70000 + 1,
    sourceStartFrame30: i * 100000, sourceEndFrame30: i * 100000 + (i === 11 ? 33408 : 1000),
    outputStartFrame: i * 1000, outputEndFrame: i === 11 ? 44408 : (i + 1) * 1000}));
  const timeline = {baseMedia: {expectedFrameCount: 44408}, segments};
  const manifest = {audio: {sampleRate: 48000, channels: 2, encodeInput: {sampleCount: 71052800}},
    segments: segments.map(row => ({...row, audioSamples: {sourceStart: row.sourceStartFrame30 * 1600,
      sourceEnd: row.sourceEndFrame30 * 1600, outputStart: row.outputStartFrame * 1600, outputEnd: row.outputEndFrame * 1600}}))};
  return {plan, timeline, manifest};
}

function audioFixture() {
  const source = {path: '/saved/c-all.mp4', bytes: 616632321, sha256: C_ALL_IDENTITY.completedSha256};
  const pcm = {path: '/saved/complete-audio.s16le', bytes: 47368874, sha256: 'a'.repeat(64)};
  const candidatesRef = {path: '/saved/audio-candidates.json', fileSha256: 'b'.repeat(64)};
  const peaksRef = {path: '/saved/acoustic-peaks.json', fileSha256: 'c'.repeat(64)};
  const common = {source, sampleRate: 16000, sampleCount: 23684437};
  const segments = Array.from({length: 462}, (_, i) => ({id: `asr-${i}`, startSec: i === 0 ? 2.9399999999999995 : i,
    endSec: i === 0 ? 4.68 : i + 1, text: `認識${i}`,
    words: Array.from({length: i < 387 ? 7 : 6}, (_, j) => ({text: `語${j}`, startSec: i, endSec: i + 1}))}));
  const asr = {...common, schemaVersion: 'presentation-vocal-asr-evidence-v001', pcm,
    segments, segmentCount: 462, wordCount: 3159};
  const peakRows = Array.from({length: 307}, (_, i) => ({id: `peak-${i}`, startSample: i * 100,
    endSampleExclusive: i * 100 + 100, peakSample: i * 100 + 25, qualifies: true}));
  const peaks = {...common, schemaVersion: 'presentation-vocal-audio-measurements-v001', rows: peakRows};
  const candidates = {...common, schemaVersion: 'presentation-vocal-audio-candidates-v001', pcm, candidateCount: 306,
    asrEvidence: {path: '/saved/asr.json', sha256: 'd'.repeat(64)}, coverage: {startSample: 0, endSampleExclusive: 23684437},
    measurementEvidence: [{path: peaksRef.path, sha256: peaksRef.fileSha256}], limitations: ['historical observation'],
    candidates: Array.from({length: 306}, (_, i) => {
      const segment = segments[i], asrOverlap = [{segmentId: segment.id,
        startSec: segment.startSec, endSec: segment.endSec, text: segment.text}];
      return {id: `candidate-${i}`, startSample: i * 100, endSampleExclusive: i * 100 + 200,
        peakSample: i * 100 + 125, startSec: i, endSec: i + 1, peakSec: i + 0.5,
        constituentPeakIds: i === 0 ? ['peak-0', 'peak-1'] : [`peak-${i + 1}`],
        metrics: {prominenceDb: 9}, asrOverlap, asrContext: asrOverlap};
    })};
  return {candidates, peaks, asr, candidatesRef, peaksRef};
}

test('C-all keeps its 48k playback clock, 94px Normal, 12 cuts, and rational observation tail', () => {
  const fixture = originalFixture(), before = structuredClone(fixture);
  const clock = inspectCAllClockAndNormal(fixture);
  assert.equal(clock.playbackSampleRate, 48000);
  assert.equal(clock.normal.fontSizePx, 94);
  assert.equal(clock.connectionPolicy, 'preserve-normal-cut');
  assert.equal(clock.insertedFrameCount, 0);
  assert.deepEqual(clock.effectiveObservationEndSample, {numerator: 71052800, denominator: 3});
  assert.deepEqual(clock.decoderTailObservationSamples, {numerator: 511, denominator: 3});
  assert.deepEqual(fixture, before);
});

test('C-all rejects borrowed 96px/44.1k settings and altered original source-clock offsets', () => {
  for (const mutate of [
    value => {value.plan.elements[0].visualState.textStyle.fontSizePx = 96;},
    value => {value.manifest.audio.sampleRate = 44100;},
    value => {value.manifest.segments[0].audioSamples.sourceStart += 768;},
    value => {value.timeline.segments.reverse();},
    value => {value.plan.elements.pop();},
    value => {value.plan.elements[10].endFrameExclusive = 1001; value.plan.elements[10].startFrame = 999;
      value.plan.elements[10].displayFrameCount = 2;},
  ]) {
    const fixture = originalFixture(); mutate(fixture);
    assert.throws(() => inspectCAllClockAndNormal(fixture), /Q4_C_ALL_INPUT_INVALID/);
  }
});

test('current finite motion materialization rejects the unchanged C-all 94px Normal', () => {
  const {plan} = originalFixture(), element = plan.elements[0];
  for (const [role, presentation] of [['Bounce accent', 'provisional-bounce'], ['Shake accent', 'provisional-shake']]) {
    assert.throws(() => materializeFiniteAutoPresentationCaptionV001({element, canvas: plan.canvas,
      selection: {role, presentation, scope: 'whole-caption'}}), /unchanged 96 px normal caption/);
  }
  assert.throws(() => materializeFiniteAutoPresentationCaptionV001({element, canvas: plan.canvas,
    selection: {role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId: 'peak'},
    measuredPeak: {peakId: 'peak', sampleRate: 16000, peakSample: 60160}}), /unchanged 96 px normal caption/);
  assert.equal(element.visualState.textStyle.fontSizePx, 94);
});

test('explicit audio adaptation preserves all ASR including observations outside candidate contexts', () => {
  const fixture = audioFixture(); fixture.candidates.answer = {priorEffect: 'panel'};
  const before = structuredClone(fixture), adapted = adaptCAllNativeAudio(fixture);
  assert.equal(adapted.audioEvidence.allAsrSegments.length, 462);
  assert.equal(adapted.audioEvidence.allAsrSegments.at(-1).id, 'asr-461');
  assert.equal(adapted.audioCandidates.flatMap(row => row.asrSegments).some(row => row.id === 'asr-461'), false);
  assert.equal(adapted.audioEvidence.allAsrSegments[0].startSec, 2.9399999999999995);
  assert.deepEqual(adapted.timing.peaks.slice(0, 2).map(row => row.peakSample), [25, 125]);
  assert.equal(JSON.stringify(adapted).includes('priorEffect'), false);
  assert.deepEqual(fixture, before);
});

test('native adapter rejects another source, missing ASR, rewritten timing, and lost peak membership', () => {
  for (const mutate of [
    value => {value.asr.source = {...value.asr.source, sha256: 'e'.repeat(64)};},
    value => {value.asr.segments.pop();},
    value => {value.candidates.candidates[0].asrOverlap[0].startSec = 3;},
    value => {value.candidates.candidates[0].constituentPeakIds.pop();},
    value => {value.peaks.rows[0].qualifies = false;},
    value => {value.peaksRef.path = '/another/acoustic-peaks.json';},
  ]) {
    const fixture = audioFixture(); mutate(fixture);
    assert.throws(() => adaptCAllNativeAudio(fixture), /Q4_C_ALL_INPUT_INVALID|Pulse evidence/);
  }
});

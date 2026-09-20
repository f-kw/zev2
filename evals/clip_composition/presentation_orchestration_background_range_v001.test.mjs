import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AUTO_PRESENTATION_RULES_REF_V008, sha256AutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  resolveOrchestrationDrawingViewV001, editOrchestrationOverrideV001} from './presentation_orchestration_v001.mjs';
import {buildOrchestrationBackgroundV001, buildOrchestrationRangeBackgroundV001,
  deriveOrchestrationBackgroundRangeV001, verifyOrchestrationRangeBackgroundV001, inspectSavedOrchestrationBackgroundReuseV001}
  from './presentation_orchestration_background_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ffmpegPath = '/opt/homebrew/bin/ffmpeg', ffprobePath = '/opt/homebrew/bin/ffprobe';
const hash = value => createHash('sha256').update(value).digest('hex');
const serialize = value => JSON.stringify(value) + '\n';
const ffmpeg = args => execFileSync(ffmpegPath, ['-v', 'error', '-nostdin', '-n', ...args],
  {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024});
let fixturePromise;
function fixture() {
  return fixturePromise ??= (async () => {
    const parent = path.join(repo, 'evals/clip_composition/outputs/presentation');
    await mkdir(parent, {recursive: true});
    const root = await mkdtemp(path.join(parent, 'stage4-editing-background-test-'));
    const save = async (name, bytes) => {
      const file = path.join(root, name); await writeFile(file, bytes, {flag: 'wx'});
      return {path: file, fileSha256: hash(bytes)};
    };
    const sourcePath = path.join(root, 'source.mp4');
    ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=64x48:rate=30:duration=2.4',
      '-f', 'lavfi', '-i', 'sine=frequency=997:sample_rate=44100:duration=2.4',
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-movie_timescale', '30', sourcePath]);
    const mediaRef = {path: sourcePath, fileSha256: hash(await readFile(sourcePath))};
    const segments = Array.from({length: 4}, (_, i) => ({segmentId: 'segment-' + (i + 1),
      outputStartFrame: i * 18, outputEndFrame: (i + 1) * 18, sourceStartFrame30: i * 1000, sourceEndFrame30: i * 1000 + 18}));
    const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 64, height: 48, fps: 30},
      elements: segments.map((row, i) => ({instructionId: 'caption-' + (i + 1), kind: 'speech-caption',
        text: '保持本文' + i, indexedLines: [{lineIndex: 0, text: '保持本文' + i}],
        startFrame: row.outputStartFrame, endFrameExclusive: row.outputEndFrame, displayFrameCount: 18,
        visualState: {textStyle: {fontSizePx: 12, fontColor: '#FFFFFF', borderColor: '#000000', borderWidthPx: 1, glowWidthPx: 0},
          position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0}, background: null}}))};
    const planBytes = serialize(plan), planRef = await save('normal.json', planBytes);
    const timelineBytes = serialize({schemaVersion: 'presentation-base-media-timeline-v003',
      baseMedia: {frameRate: '30/1', expectedFrameCount: 72, fileSha256: mediaRef.fileSha256}, segments});
    const timelineRef = await save('timeline.json', timelineBytes);
    const decisionInputBytes = serialize({schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null});
    const decisionInputRef = await save('decision.json', decisionInputBytes);
    const source = {digestRef: {version: 'small-physical-range-test-v001', sha256: mediaRef.fileSha256},
      planRef, timelineRef, mediaRef, planBytes, timelineBytes, playbackSampleRate: 44100, observationSampleRate: 16000,
      captionContext: {baselineRef: {...planRef, canonicalSha256: sha256AutoPresentationV001(plan)},
        decisionInputRef, renderingRulesRef: structuredClone(AUTO_PRESENTATION_RULES_REF_V008), pulseTimingEvidence: null},
      decisionInputBytes};
    const context = createOrchestrationContextV001(source);
    const input = createOrchestrationJudgmentInputV001({context, evidence: {productionPurpose: '範囲描画の物理時計検査。',
      captions: plan.elements.map((row, i) => ({captionId: row.instructionId, text: row.text, contextId: 'context-' + i,
        startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive, eligiblePulsePeakIds: []})),
      contexts: plan.elements.map((_, i) => ({contextId: 'context-' + i, description: '保持した場面 ' + i})),
      observations: [], audioEvidence: null, audioCandidates: []}});
    const choices = ['normal-cut', 'black-separator', 'soft-separator'];
    const reply = {schemaVersion: 'presentation-orchestration-judgment-v002', inputSha256: input.inputSha256, completion: 'complete',
      captions: plan.elements.map(row => ({captionId: row.instructionId, status: 'resolved', semanticRole: 'normal',
        allowedPresets: [{preset: 'normal'}], reason: '背景だけを検査する。', evidenceIds: [row.instructionId]})),
      connections: context.connectionIds.map((connectionId, i) => ({connectionId, status: 'resolved',
        semanticRole: i === 0 ? 'continuation' : 'separator', allowedPresets: [choices[i]],
        reason: '範囲の前後と挿入を検査する。', evidenceIds: [connectionId]}))};
    const state = fixOrchestrationJudgmentV001({context, input, replyBytes: serialize(reply)});
    const drawingView = resolveOrchestrationDrawingViewV001({context, state});
    const full = await buildOrchestrationBackgroundV001({repositoryRoot: repo, outputDirectory: path.join(root, 'full-reference'),
      projection: drawingView.projection, expectedProjectionSha256: drawingView.projection.projectionSha256, ffmpegPath, ffprobePath});
    return {root, source, context, state, drawingView, full};
  })();
}
function decodedRange(file, range, audio = false) {
  const filter = audio
    ? 'atrim=start_sample=' + range.startFrame * 1470 + ':end_sample=' + range.endFrameExclusive * 1470 + ',asetpts=PTS-STARTPTS'
    : 'trim=start_frame=' + range.startFrame + ':end_frame=' + range.endFrameExclusive + ',setpts=PTS-STARTPTS';
  return ffmpeg(['-i', file, '-map', audio ? '0:a:0' : '0:v:0', audio ? '-vn' : '-an',
    audio ? '-af' : '-vf', filter, ...(audio ? ['-c:a', 'pcm_f32le', '-f', 'f32le']
      : ['-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'rawvideo']), '-']);
}
function checkAgainstFull(proof, full, range) {
  const local = {startFrame: 0, endFrameExclusive: range.endFrameExclusive - range.startFrame};
  assert.deepEqual(decodedRange(proof.outputs.background.path, local), decodedRange(full.outputs.background.path, range));
  assert.deepEqual(decodedRange(proof.outputs.background.path, local, true), decodedRange(full.outputs.background.path, range, true));
  assert.equal(proof.verification.audio.displaySampleCount, local.endFrameExclusive * 1470);
  assert.equal(proof.encodedAudio.presentationStartSample, 0);
  assert.equal(proof.encodedAudio.presentationEndSampleExclusive, local.endFrameExclusive * 1470);
  assert.equal(proof.encodedAudio.firstDecodedFrame.pts, 0);
  assert.equal(proof.encodedAudio.primingSkipSamples, -proof.encodedAudio.firstPacket.pts);
}

test('caption-only edit reuses the SHA-bound full background and verifies exact range PCM/AAC clocks', async () => {
  const f = await fixture();
  const state = editOrchestrationOverrideV001({context: f.context, state: f.state, kind: 'caption',
    itemId: 'caption-2', selection: {preset: 'color', scope: 'whole-caption'}});
  const view = resolveOrchestrationDrawingViewV001({context: f.context, state});
  const range = {startFrame: 20, endFrameExclusive: 30};
  const proof = await buildOrchestrationRangeBackgroundV001({drawingView: view, range,
    outputDirectory: path.join(f.root, 'caption-range'), reuseProofPath: f.full.proofRef.path, ffmpegPath, ffprobePath});
  assert.equal(proof.reuse.used, true); assert.equal(proof.fullDisplayFrameCount, 96);
  assert.equal(proof.displayFrameCount, 10); assert.equal(proof.fullBackgroundGenerated, false);
  await assert.rejects(access(path.join(f.root, 'caption-range/source-range.nut')), /ENOENT/);
  checkAgainstFull(proof, f.full, range);
});

test('partial Soft fade, insertion-only range, insertion middle and logical tail equal full-clock decoded bytes', async () => {
  const f = await fixture();
  for (const [name, range] of [['one-frame-head', {startFrame: 0, endFrameExclusive: 1}],
    ['soft-middle', {startFrame: 62, endFrameExclusive: 65}],
    ['black-only', {startFrame: 68, endFrameExclusive: 73}],
    ['black-middle-to-after', {startFrame: 75, endFrameExclusive: 87}],
    ['logical-tail', {startFrame: 93, endFrameExclusive: 96}]]) {
    const proof = await buildOrchestrationRangeBackgroundV001({drawingView: f.drawingView, range,
      outputDirectory: path.join(f.root, name), ffmpegPath, ffprobePath});
    assert.equal(proof.reuse.used, false);
    assert(proof.recipe.workingFrameCount < f.drawingView.projection.displayFrameCount);
    checkAgainstFull(proof, f.full, range);
    if (name === 'soft-middle') assert.deepEqual(proof.recipe.workingRange, {startFrame: 60, endFrameExclusive: 84});
    if (name === 'black-only') {
      assert.equal(proof.verification.video.retainedFrameCount, 0);
      assert.equal(proof.verification.audio.insertedZeroSampleCount, 5 * 1470);
    }
  }
});

test('same-duration Black-to-Soft refuses prior reuse and creates only the required new background range', async () => {
  const f = await fixture();
  const state = editOrchestrationOverrideV001({context: f.context, state: f.state, kind: 'connection',
    itemId: 'connection-02', selection: 'soft-separator'});
  const drawingView = resolveOrchestrationDrawingViewV001({context: f.context, state});
  assert.equal(drawingView.projection.displayFrameCount, f.drawingView.projection.displayFrameCount);
  const range = {startFrame: 32, endFrameExclusive: 46};
  const proof = await buildOrchestrationRangeBackgroundV001({drawingView, range,
    outputDirectory: path.join(f.root, 'changed-connection-range'), reuseProofPath: f.full.proofRef.path, ffmpegPath, ffprobePath});
  assert.equal(proof.reuse.used, false); assert.equal(proof.reuse.reason, 'different-full-projection');
  assert(proof.recipe.workingFrameCount < drawingView.projection.displayFrameCount);
  const full = await buildOrchestrationBackgroundV001({repositoryRoot: repo, outputDirectory: path.join(f.root, 'changed-full-reference'),
    projection: drawingView.projection, expectedProjectionSha256: drawingView.projection.projectionSha256, ffmpegPath, ffprobePath});
  checkAgainstFull(proof, full, range);
  assert.notDeepEqual(decodedRange(proof.outputs.background.path, {startFrame: 0, endFrameExclusive: 14}),
    decodedRange(f.full.outputs.background.path, range));
});

test('range checker rejects real changed PCM while source and every range video frame remain unchanged', async () => {
  const f = await fixture(), range = {startFrame: 20, endFrameExclusive: 30};
  const fault = path.join(f.root, 'fault-muted-range.nut');
  ffmpeg(['-i', f.full.outputs.background.path, '-map', '0:v:0', '-map', '0:a:0',
    '-vf', 'trim=start_frame=20:end_frame=30,setpts=PTS-STARTPTS', '-c:v', 'ffv1',
    '-af', 'atrim=start_sample=29400:end_sample=44100,asetpts=PTS-STARTPTS,volume=0',
    '-c:a', 'pcm_f32le', '-f', 'nut', fault]);
  await assert.rejects(verifyOrchestrationRangeBackgroundV001({drawingView: f.drawingView, range, losslessPath: fault,
    ffmpegPath, ffprobePath}), /range PCM/);
});

test('invalid local ranges cannot acquire output directories or be passed as full-clock plans', async () => {
  const f = await fixture();
  for (const [i, range] of [{startFrame: -1, endFrameExclusive: 2}, {startFrame: 30, endFrameExclusive: 30},
    {startFrame: 0, endFrameExclusive: 97}, {startFrame: 0.5, endFrameExclusive: 2}].entries()) {
    assert.throws(() => deriveOrchestrationBackgroundRangeV001({projection: f.drawingView.projection, range}), /half-open/);
    const outputDirectory = path.join(f.root, 'invalid-' + i);
    await assert.rejects(buildOrchestrationRangeBackgroundV001({drawingView: f.drawingView, range, outputDirectory,
      ffmpegPath, ffprobePath}), /half-open/);
    await assert.rejects(access(outputDirectory), /ENOENT/);
  }
  await assert.rejects(buildOrchestrationRangeBackgroundV001({drawingView: structuredClone(f.drawingView),
    range: {startFrame: 0, endFrameExclusive: 3}, outputDirectory: path.join(f.root, 'unbound-view'), ffmpegPath, ffprobePath}),
  /drawing view must be derived/);
});


test('a saved range can be reused only when its full-clock coverage includes the new range', async () => {
  const f = await fixture();
  const firstRange = {startFrame: 20, endFrameExclusive: 30};
  const first = await buildOrchestrationRangeBackgroundV001({drawingView: f.drawingView, range: firstRange,
    outputDirectory: path.join(f.root, 'saved-range'), reuseProofPath: f.full.proofRef.path, ffmpegPath, ffprobePath});
  for (const [name, range, reused] of [
    ['nested', {startFrame: 22, endFrameExclusive: 25}, true],
    ['outside', {startFrame: 29, endFrameExclusive: 33}, false],
  ]) {
    const result = await buildOrchestrationRangeBackgroundV001({drawingView: f.drawingView, range,
      outputDirectory: path.join(f.root, name), reuseProofPath: first.proofRef.path, ffmpegPath, ffprobePath});
    assert.equal(result.reuse.used, reused);
    if (!reused) assert.equal(result.reuse.reason, 'saved-background-does-not-cover-range');
    checkAgainstFull(result, f.full, range);
  }
});


test('saved full reuse validates pixel/PCM proof, exact coverage and actual AAC instead of trusting saved status', async () => {
  const f = await fixture(), range = {startFrame: 0, endFrameExclusive: 96};
  const options = {drawingView: f.drawingView, range, reuseProofPath: f.full.proofRef.path, ffmpegPath, ffprobePath};
  const accepted = await inspectSavedOrchestrationBackgroundReuseV001(options);
  assert.equal(accepted.used, true); assert.equal(accepted.fullCoverage, true);
  assert.deepEqual(accepted.proofRef, f.full.proofRef);
  assert.deepEqual(accepted.coverage, range);
  assert.deepEqual(accepted.background, f.full.outputs.background);
  assert.deepEqual(accepted.audio, f.full.outputs.audio);
  assert.equal(accepted.encodedAudioObservation.logicalDecodedSampleCount, 96 * 1470);
  const different = editOrchestrationOverrideV001({context: f.context, state: f.state, kind: 'connection',
    itemId: 'connection-02', selection: 'soft-separator'});
  const notReused = await inspectSavedOrchestrationBackgroundReuseV001({...options,
    drawingView: resolveOrchestrationDrawingViewV001({context: f.context, state: different})});
  assert.equal(notReused.used, false); assert.equal(notReused.reason, 'different-full-projection');
  const short = await buildOrchestrationRangeBackgroundV001({drawingView: f.drawingView,
    range: {startFrame: 20, endFrameExclusive: 30}, outputDirectory: path.join(f.root, 'short-reuse-inspection'),
    reuseProofPath: f.full.proofRef.path, ffmpegPath, ffprobePath});
  const noCoverage = await inspectSavedOrchestrationBackgroundReuseV001({...options, reuseProofPath: short.proofRef.path});
  assert.equal(noCoverage.used, false); assert.equal(noCoverage.reason, 'saved-background-does-not-cover-range');
  const shortAccepted = await inspectSavedOrchestrationBackgroundReuseV001({...options,
    range: {startFrame: 22, endFrameExclusive: 25}, reuseProofPath: short.proofRef.path});
  assert.equal(shortAccepted.used, true); assert.equal(shortAccepted.fullCoverage, false);
  assert.deepEqual(shortAccepted.coverage, {startFrame: 20, endFrameExclusive: 30});
});

test('saved background reuse rejects failed, missing, mismatched and hashless verification evidence', async () => {
  const f = await fixture(), range = {startFrame: 0, endFrameExclusive: 96};
  const original = JSON.parse(await readFile(f.full.proofRef.path));
  const cases = [
    ['proof-failed', proof => {proof.status = 'failed';}, /proof is not passed/],
    ['verification-missing', proof => {delete proof.verification;}, /pixel\/PCM verification/],
    ['verification-failed', proof => {proof.verification.status = 'failed';}, /pixel\/PCM verification/],
    ['pixel-failed', proof => {proof.verification.video.status = 'failed';}, /pixel\/PCM verification/],
    ['pcm-failed', proof => {proof.verification.audio.status = 'failed';}, /pixel\/PCM verification/],
    ['wrong-projection', proof => {proof.verification.projectionSha256 = 'f'.repeat(64);}, /pixel\/PCM verification/],
    ['pixel-hashes-missing', proof => {delete proof.verification.video.expectedPayloadSha256;
      delete proof.verification.video.observedPayloadSha256;}, /pixel\/PCM verification/],
    ['pcm-hashes-missing', proof => {delete proof.verification.audio.expectedPayloadSha256;
      delete proof.verification.audio.observedPayloadSha256;}, /pixel\/PCM verification/],
    ['verification-source-mismatch', proof => {proof.verification.inputBindings.media.fileSha256 = 'a'.repeat(64);}, /verification source binding/],
    ['verification-output-mismatch', proof => {proof.verification.outputRef.path = f.full.outputs.audio.path;}, /verification output binding/],
    ['aac-packet-hash-missing', proof => {delete proof.encodedAudio.packetPayloadSha256;}, /AAC verification is missing/],
    ['aac-pcm-binding-mismatch', proof => {proof.encodedAudio.encodeInputPcmPayloadSha256 = 'a'.repeat(64);}, /AAC verification is missing/],
    ['aac-priming-mismatch', proof => {proof.encodedAudio.primingSkipSamples++;}, /AAC verification differs/],
  ];
  for (const [name, damage, pattern] of cases) {
    const proof = structuredClone(original); damage(proof);
    const reuseProofPath = path.join(f.root, name + '.json');
    await writeFile(reuseProofPath, serialize(proof), {flag: 'wx'});
    await assert.rejects(inspectSavedOrchestrationBackgroundReuseV001({drawingView: f.drawingView, range,
      reuseProofPath, ffmpegPath, ffprobePath}), pattern, name);
  }
});

test('saved reuse rejects substituted AAC even when its file SHA and logical sample duration are updated correctly', async () => {
  const f = await fixture(), audioPath = path.join(f.root, 'substituted-muted-audio.m4a');
  ffmpeg(['-i', f.full.outputs.background.path, '-map', '0:a:0', '-vn',
    '-af', 'asettb=expr=1/44100,asetpts=N,volume=0', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
    '-movie_timescale', '30', '-movflags', '+faststart', '-map_metadata', '-1', '-f', 'mp4', audioPath]);
  const bytes = await readFile(audioPath), proof = JSON.parse(await readFile(f.full.proofRef.path));
  proof.outputs.audio = {path: audioPath, fileSha256: hash(bytes), bytes: bytes.length};
  const reuseProofPath = path.join(f.root, 'substituted-muted-audio-proof.json');
  await writeFile(reuseProofPath, serialize(proof), {flag: 'wx'});
  await assert.rejects(inspectSavedOrchestrationBackgroundReuseV001({drawingView: f.drawingView,
    range: {startFrame: 0, endFrameExclusive: 96}, reuseProofPath, ffmpegPath, ffprobePath}),
  /saved AAC verification differs at (packetPayloadSha256|rawDecodedPayloadSha256|logicalDecodedPayloadSha256)/);
});

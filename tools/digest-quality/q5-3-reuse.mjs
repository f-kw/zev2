/** Reuse the two accepted Q5 short artifacts for a separately saved technical selection.
 * No decoder, encoder, renderer or media-QC process is started by this module. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile} from 'node:fs/promises';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {resolveQ52SourceExtractionV001} from './q5-2-render.mjs';
import {restoreQ53EditPlanV001, projectQ53ComparisonRangeV001} from './q5-3-edit-plan.mjs';

const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
// Large edited plans and native-QC records must fail without constructing a full diagnostic diff.
const sameRecord = (actual, expected, message) => assert(isDeepStrictEqual(actual, expected), message);
const frameCount = range => range.endFrameExclusive - range.startFrame;
const shaPattern = /^[a-f0-9]{64}$/u;
const PINNED_SHORTS = {
  omit: {frames: 763, fileSha256: '80f39330b22f238263e282d33327105f1651bd45800d33fddf4888d9d146c8f6',
    completionSchema: 'digest-quality-q5-render-completion-v002', normalSchema: 'digest-quality-q5-normal-short-completion-v002',
    comparisonSchema: 'q5-content-comparison-range-v002'},
  add: {frames: 624, fileSha256: '98d73010ebfa93bf9b094781e279d705f51771d295ae3fbc9fe78d1f0f365737',
    completionSchema: 'digest-quality-q5-2-render-completion-v001', normalSchema: 'digest-quality-q5-2-normal-short-completion-v001',
    comparisonSchema: 'q5-2-content-comparison-range-v001'},
};
const identity = ref => {
  assert(ref && path.isAbsolute(ref.path ?? '') && shaPattern.test(ref.fileSha256), 'invalid immutable file reference');
  return {path: ref.path, fileSha256: ref.fileSha256};
};
const sameRef = (a, b, label) => assert.deepEqual(identity(a), identity(b), label + ' reference differs');
const samePayload = (a, b, label) => {
  assert.equal(a.fileSha256, b.fileSha256, label + ' byte SHA differs');
  if (a.bytes !== undefined && b.bytes !== undefined) assert.equal(a.bytes, b.bytes, label + ' byte count differs');
};
const range = (value, label) => {
  assert(value && Number.isSafeInteger(value.startFrame) && value.startFrame >= 0
    && Number.isSafeInteger(value.endFrameExclusive) && value.endFrameExclusive > value.startFrame, label + ' frame range invalid');
  return {startFrame: value.startFrame, endFrameExclusive: value.endFrameExclusive};
};
const sampleRange = r => r === null ? null
  : {startSample: r.startFrame * 1600, endSampleExclusive: r.endFrameExclusive * 1600};

async function checkRef(ref) {
  identity(ref); const stat = await lstat(ref.path);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'reuse input must be a regular file');
  const sha = createHash('sha256'); for await (const bytes of createReadStream(ref.path)) sha.update(bytes);
  assert.equal(sha.digest('hex'), ref.fileSha256, 'reuse input bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(stat.size, ref.bytes, 'reuse input byte count changed: ' + ref.path);
  return {path: ref.path, bytes: stat.size, fileSha256: ref.fileSha256};
}
const json = async ref => JSON.parse(await readFile(ref.path, 'utf8'));

function normalizePieces(comparison, prior) {
  const rows = prior ? comparison.pieces ?? comparison.physicalPieces : comparison.physicalPieces;
  assert(Array.isArray(rows) && rows.length === 2, 'exactly two immutable local source pieces required');
  let cursor = 0;
  const normalized = rows.map(piece => {
    const outputRange = range(piece.outputRange, 'local piece');
    assert.equal(outputRange.startFrame, cursor, 'local piece order or coverage differs'); cursor = outputRange.endFrameExclusive;
    const original = prior && comparison.pieces ? piece.originalRange : piece.originalDigestRange;
    const originalDigestRange = original === null ? null : range(original, 'original digest piece');
    const sourceVideoRange = range(prior && comparison.pieces ? piece.originalSourceRange : piece.sourceVideoRange, 'source video piece');
    const mediaRef = prior && comparison.pieces ? comparison.sourceIdentity.mediaRef : piece.mediaRef;
    const kind = originalDigestRange === null ? 'added-source-video' : 'retained-original-digest';
    if (piece.kind !== undefined) assert.equal(piece.kind, kind);
    assert.equal(frameCount(sourceVideoRange), frameCount(outputRange));
    if (originalDigestRange !== null) assert.equal(frameCount(originalDigestRange), frameCount(outputRange));
    assert.equal(piece.playback.sampleRate, 48000); assert.equal(piece.playback.channels, 2);
    assert.deepEqual(piece.playback.outputRange, sampleRange(outputRange), 'local audio phase differs');
    const savedOriginal = prior && comparison.pieces ? piece.playback.originalRange : piece.playback.originalDigestRange;
    assert.deepEqual(savedOriginal, sampleRange(originalDigestRange), 'original digest audio clock differs');
    if (!(prior && comparison.pieces)) assert.deepEqual(piece.playback.sourceVideoRange, sampleRange(sourceVideoRange));
    return {kind, mediaRef: identity(mediaRef), parentSegmentId: piece.parentSegmentId,
      sourceVideoRange, originalDigestRange, outputRange,
      playback: {sampleRate: 48000, channels: 2, samplesPerFrame: 1600,
        sourceVideoRange: sampleRange(sourceVideoRange), originalDigestRange: sampleRange(originalDigestRange),
        outputRange: sampleRange(outputRange)}};
  });
  assert.equal(cursor, comparison.frameCount);
  return normalized;
}

/** A full local plan comparison includes text, wrapping, provenance, timing, appearance and fade phase. */
export function assertQ53LocalContentIdentityV001({projection, priorComparison}) {
  sameRecord(projection.normalPlan, priorComparison.normalPlan, 'local caption payload or phase differs');
  assert.deepEqual(projection.beforeRange, priorComparison.beforeRange, 'original comparison context differs');
  assert.deepEqual(projection.afterRange, priorComparison.afterRange, 'local media clock differs');
  assert.equal(projection.afterRange.startFrame, 0); assert.equal(projection.frameCount, priorComparison.frameCount);
  assert.equal(frameCount(projection.afterRange), projection.frameCount);
  assert.equal(frameCount(range(projection.newGlobalRange, 'new global range')), projection.frameCount);
  assert.equal(frameCount(range(priorComparison.afterGlobalRange, 'old global range')), projection.frameCount);
  assert.equal(projection.normalPlan.canvas.fps, 30);
  const localPieces = normalizePieces(projection, false), priorPieces = normalizePieces(priorComparison, true);
  assert.deepEqual(localPieces, priorPieces, 'local source content, order or audio clock differs');
  const {elements, ...layout} = projection.normalPlan;
  assert(elements.length > 0);
  for (const element of elements) {
    const r = range({startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive}, 'caption');
    assert.equal(frameCount(r), element.displayFrameCount); assert(r.endFrameExclusive <= projection.frameCount);
  }
  return {frameCount: projection.frameCount, localRange: projection.afterRange, localPieces,
    normalPlanSha256: hash(projection.normalPlan), captionPayloadSha256: hash(elements),
    layoutSha256: hash(layout), captionCount: elements.length, captionIds: elements.map(row => row.instructionId),
    playback: {sampleRate: 48000, channels: 2, samplesPerFrame: 1600, sampleCount: projection.frameCount * 1600},
    captionAndTransitionPhase: 'entire local Normal plan exactly equal; no crop or phase restart'};
}

function assertAudio(record, count) {
  assert.equal(record.status, 'passed'); assert.equal(record.sampleRate, 48000); assert.equal(record.channels, 2);
  assert.equal(record.streamTimeBase, '1/48000'); assert.equal(record.presentationStartSample, 0);
  assert.equal(record.presentationEndSampleExclusive, count); assert.equal(record.logicalDecodedSampleCount, count);
  assert.deepEqual(record.logicalDecodedInterval, {startSample: 0, endSampleExclusive: count});
  assert.equal(record.primingSkipSamples, 1024); assert.equal(record.firstPacket.pts, -1024);
  assert.equal(record.firstDecodedFrame.pts, 0);
  assert(record.firstPacket.side_data_list.some(row => row.side_data_type === 'Skip Samples' && row.skip_samples === 1024));
  assert(Number.isSafeInteger(record.decodedTailSampleCount) && record.decodedTailSampleCount >= 0);
  assert.equal(record.rawDecodedSampleCount, count + record.decodedTailSampleCount);
  for (const field of ['packetPayloadSha256', 'logicalDecodedPayloadSha256', 'rawDecodedPayloadSha256']) assert(shaPattern.test(record[field]));
}
function equalHashProof(proof, bytes, label) {
  assert.equal(proof.status, 'passed', label + ' historical proof did not pass');
  assert.equal(proof.expectedPayloadSha256, proof.observedPayloadSha256);
  assert(shaPattern.test(proof.expectedPayloadSha256));
  assert.equal(proof.comparedBytes ?? proof.comparedYuvBytes ?? proof.comparedPcmBytes, bytes);
}
function assertStoredCompletion({key, completion, normal, priorComparison, local}) {
  const pinned = PINNED_SHORTS[key], count = local.frameCount, sampleCount = count * 1600;
  assert.equal(completion.schemaVersion, pinned.completionSchema); assert.equal(normal.schemaVersion, pinned.normalSchema);
  assert.equal(priorComparison.schemaVersion, pinned.comparisonSchema);
  assert.equal(count, pinned.frames); assert.equal(completion.expectedFrameCount, count); assert.equal(normal.expectedFrameCount, count);
  assert.equal(completion.status, 'passed'); assert.equal(normal.status, 'passed');
  assert.equal(completion.after.mediaRef.fileSha256, pinned.fileSha256, 'only the accepted fixed short artifact is reusable');
  sameRef(normal.after, completion.after.mediaRef, 'normal completion media');
  sameRef(normal.comparisonRef, completion.comparisonRef, 'normal comparison');
  sameRef(normal.editPlanRef, completion.editPlanRef, 'normal original edit plan');
  sameRef(normal.baseRef, completion.baseRef, 'encoded base media');
  assert.equal(completion.contentVersion, priorComparison.contentVersion); assert.equal(normal.contentVersion, priorComparison.contentVersion);
  assert.deepEqual(completion.after.range, priorComparison.afterRange);
  assert.deepEqual(completion.after.fullEditedRange, priorComparison.afterGlobalRange);
  assert.deepEqual(completion.after.orderedPieces, priorComparison.pieces ?? priorComparison.physicalPieces);
  assert.deepEqual(completion.before.range, priorComparison.beforeRange);
  assert.equal(completion.before.mediaRef.fileSha256, '665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34');
  assert.equal(normal.automaticResolution.automaticStatus, 'not-processed');
  for (const row of [completion, normal]) {
    assert.equal(row.humanQuality, 'not-evaluated'); assert.equal(row.contentEditAdopted, false);
    assert.equal(row.finalQc.status, 'passed'); assert.deepEqual(row.finalQc.violations, []);
    assert.equal(row.finalQc.instructionCount, local.captionCount);
    assert.equal(row.completedFrameQc.status, 'passed');
    assert.equal(row.completedFrameQc.evidence.method, 'exact-replay-native-v1');
    assert.deepEqual(row.completedFrameQc.inspections.map(item => item.instructionId), local.captionIds);
    samePayload(row.finalQc.currentCompletedMediaRef, completion.after.mediaRef, 'final QC media');
    assertAudio(row.baseAudio, sampleCount); assertAudio(row.finalAudio, sampleCount);
    for (const field of ['packetPayloadSha256', 'logicalDecodedPayloadSha256', 'rawDecodedPayloadSha256',
      'rawDecodedSampleCount', 'decodedTailSampleCount', 'primingSkipSamples']) assert.equal(row.baseAudio[field], row.finalAudio[field]);
  }
  for (const field of ['baseAudio', 'finalAudio', 'finalQc', 'completedFrameQc', 'drawingRulesRef'])
    sameRecord(completion[field], normal[field], 'top-level and Normal completion evidence differs: ' + field);
  const replay = completion.completedFrameQc.evidence.exactReplay;
  assert.equal(replay.expectedFrameCount, count); assert.equal(replay.planCanonicalSha256, local.normalPlanSha256);
  assert.equal(replay.comparisonMethod, 'mp4-byte-identical'); assert.equal(replay.mp4BytesIdentical, true);
  samePayload(replay.completed, completion.after.mediaRef, 'completed replay input');
  samePayload(replay.replay, completion.after.mediaRef, 'exact replay output');
  assert.deepEqual(replay.video.completed, replay.video.replay);
  assert.equal(replay.video.completed.frameCount, count); assert.equal(replay.video.completed.fps, '30/1');
  assert.equal(replay.video.completed.width, priorComparison.normalPlan.canvas.width);
  assert.equal(replay.video.completed.height, priorComparison.normalPlan.canvas.height);
  assert.deepEqual(replay.recordBindings.map(row => row.instructionId), local.captionIds);
  for (const [index, row] of replay.recordBindings.entries()) assert.equal(row.elementCanonicalSha256, hash(priorComparison.normalPlan.elements[index]));
}

function assertSelection({selection, source, resolved}) {
  assert.equal(selection.schemaVersion, 'q5-3-selection-state-v001');
  assert.equal(selection.sourceIdentitySha256, source.sourceIdentitySha256);
  assert.equal(selection.candidateIdentitySha256, source.candidateIdentitySha256);
  assert.equal(selection.resolutionSha256, resolved.resolutionSha256);
  assert.deepEqual(selection.selection, resolved.selection, 'saved selection is stale or different');
  assert.deepEqual(Object.keys(selection.selectionProvenance).sort(), ['add', 'omit']);
  for (const key of ['omit', 'add']) {
    const provenance = selection.selectionProvenance[key];
    assert(['default-disabled', 'technical-fixture'].includes(provenance.kind), 'human adoption is not a technical selection');
    assert(typeof provenance.statement === 'string' && provenance.statement.length > 0);
    if (provenance.kind === 'default-disabled') assert.equal(selection.selection[key], false);
  }
}

export async function buildQ53ReuseBindingsV001({source, resolved, selectionRef, resolvedRef, completionRefs}) {
  const restored = restoreQ53EditPlanV001({source, saved: resolved});
  const checked = new Map();
  const check = async ref => {
    const actual = await checkRef(ref), previous = checked.get(actual.path);
    if (previous) sameRef(previous, actual, 'duplicate input');
    checked.set(actual.path, actual); return actual;
  };
  await check(selectionRef); await check(resolvedRef);
  sameRecord(await json(resolvedRef), restored, 'saved resolved content is stale or different');
  const selection = await json(selectionRef); assertSelection({selection, source, resolved: restored});
  const bindings = [], activeKeys = ['omit', 'add'].filter(key => restored.selection[key]);
  const rules = activeKeys.length ? await buildEditedOrchestrationDrawingRulesRefV001() : null;
  for (const key of activeKeys) {
    const candidate = source.candidateIdentity[key];
    const projection = projectQ53ComparisonRangeV001({source, resolved: restored, candidateId: candidate.candidateId});
    const originalComparisonRef = projection.originalComparisonRef;
    await check(originalComparisonRef);
    const priorComparison = await json(originalComparisonRef);
    const local = assertQ53LocalContentIdentityV001({projection, priorComparison});
    const oldRefs = completionRefs[key];
    await check(oldRefs.completionRef); await check(oldRefs.normalCompletionRef);
    const completion = await json(oldRefs.completionRef), normal = await json(oldRefs.normalCompletionRef);
    sameRef(completion.comparisonRef, originalComparisonRef, 'original comparison');
    sameRef(completion.editPlanRef, candidate.editPlanRef, 'fixed original edit plan');
    await check(completion.editPlanRef);
    assertStoredCompletion({key, completion, normal, priorComparison, local});
    assert.deepEqual(completion.drawingRulesRef, rules, 'current drawing rules differ from the reusable artifact');
    const mediaRef = await check(completion.after.mediaRef);
    const baselineRef = normal.localRefs.find(ref => ref.path === path.join(path.dirname(oldRefs.normalCompletionRef.path), 'short-normal-plan.json'));
    const contextRef = normal.localRefs.find(ref => ref.path === path.join(path.dirname(oldRefs.normalCompletionRef.path), 'short-normal-context.json'));
    assert(baselineRef && contextRef); await check(baselineRef); await check(contextRef);
    sameRecord(await json(baselineRef), projection.normalPlan, 'saved rendered Normal plan differs');
    const context = await json(contextRef);
    assert.equal(context.schemaVersion, 'presentation-focus-decision-input-v005'); assert.equal(context.pulseTimingEvidence, null);
    sameRef(context.editPlanRef, completion.editPlanRef, 'normal source edit');
    sameRef(context.baseMediaRef, completion.baseRef, 'normal source base');
    assert.equal(context[key === 'omit' ? 'q5ContentVersion' : 'q52ContentVersion'], completion.contentVersion);
    await check(completion.baseRef); await check(completion.joinedProofRef);
    const joined = await json(completion.joinedProofRef);
    assert.equal(joined.schemaVersion, 'digest-quality-q5-ordered-lossless-verification-v001'); assert.equal(joined.status, 'passed');
    assert.equal(joined.video.frameCount, local.frameCount); assert.equal(joined.audio.sampleCount, local.playback.sampleCount);
    assert.equal(joined.audio.sampleRate, 48000); assert.equal(joined.audio.channels, 2);
    const pixelBytes = projection.normalPlan.canvas.width * projection.normalPlan.canvas.height * 3 / 2;
    equalHashProof(joined.video, local.frameCount * pixelBytes, 'joined video');
    equalHashProof(joined.audio, local.playback.sampleCount * 8, 'joined audio');
    assert.equal(joined.orderedPieces.length, local.localPieces.length);
    const pieceProofRefs = [];
    for (const [index, piece] of joined.orderedPieces.entries()) {
      const localPiece = local.localPieces[index], frames = frameCount(localPiece.outputRange);
      assert.equal(piece.frameCount, frames); assert.deepEqual(piece.outputRange, localPiece.outputRange);
      const savedOriginalRange = key === 'omit' ? piece.originalRange : piece.originalDigestRange;
      assert.deepEqual(savedOriginalRange, localPiece.originalDigestRange);
      if (key === 'add') assert.deepEqual(piece.sourceVideoRange, localPiece.sourceVideoRange);
      await check(piece.proofRef); pieceProofRefs.push(piece.proofRef);
      const proof = await json(piece.proofRef);
      assert.equal(proof.status, 'passed');
      if (localPiece.kind === 'added-source-video') {
        assert.equal(proof.schemaVersion, 'q5-2-source-piece-verification-v001');
        sameRef(proof.sourceVideoRef, localPiece.mediaRef, 'added source');
        sameRef(proof.pieceRef, piece.mediaRef, 'added lossless piece');
        await check(proof.sourceVideoInspectionRef);
        const inspection = await json(proof.sourceVideoInspectionRef);
        assert.equal(inspection.sourceVideoBinding.fileSha256, localPiece.mediaRef.fileSha256);
        assert.deepEqual(proof.clock, resolveQ52SourceExtractionV001({inspection, sourceVideoRange: localPiece.sourceVideoRange}));
        equalHashProof(proof.video, frames * pixelBytes, 'added source video'); equalHashProof(proof.audio, frames * 1600 * 8, 'added source audio');
      } else {
        assert.equal(proof.schemaVersion, 'presentation-orchestration-background-range-v001');
        sameRef(proof.inputBindings.media, localPiece.mediaRef, 'retained original media');
        sameRef(proof.outputs.background, piece.mediaRef, 'retained lossless piece');
        assert.deepEqual(proof.range, localPiece.originalDigestRange);
        assert.equal(proof.verification.status, 'passed');
        assert.equal(proof.verification.video.displayFrames, frames); assert.equal(proof.verification.video.blackFrameCount, 0);
        assert.equal(proof.verification.audio.displaySampleCount, frames * 1600); assert.equal(proof.verification.audio.insertedZeroSampleCount, 0);
        assert.deepEqual(proof.recipe.softWindows, []);
        equalHashProof(proof.verification.video, frames * pixelBytes, 'retained video');
        equalHashProof(proof.verification.audio, frames * 1600 * 8, 'retained audio');
      }
    }
    bindings.push({candidateKey: key, candidateId: projection.candidateId,
      newContentVersion: restored.contentVersion, newGlobalRange: projection.newGlobalRange,
      newComparisonSha256: projection.comparisonSha256, mediaLocalRange: projection.afterRange,
      originalArtifactContentVersion: completion.contentVersion, originalArtifactGlobalRange: priorComparison.afterGlobalRange,
      mediaRef, originalCompletionRef: oldRefs.completionRef, originalNormalCompletionRef: oldRefs.normalCompletionRef,
      originalComparisonRef, originalEditPlanRef: completion.editPlanRef,
      localIdentity: local, drawingRulesSha256: rules.canonicalSha256,
      historicalEvidence: {joinProofRef: completion.joinedProofRef, pieceProofRefs, baselineRef, contextRef,
        baseRef: completion.baseRef, finalQc: 'passed', completedFrameQc: 'passed', exactReplay: 'mp4-byte-identical',
        packetPayloadSha256: completion.finalAudio.packetPayloadSha256,
        logicalDecodedPayloadSha256: completion.finalAudio.logicalDecodedPayloadSha256,
        logicalDecodedSampleCount: completion.finalAudio.logicalDecodedSampleCount,
        primingSkipSamples: completion.finalAudio.primingSkipSamples,
        decodedTailSampleCount: completion.finalAudio.decodedTailSampleCount},
      reuseVerification: 'current final MP4 and named evidence bytes checked; source mapping, local caption payload and saved media proofs matched',
      historicalQcReexecuted: false, mediaGenerated: false, humanQuality: 'not-evaluated', adopted: false});
  }
  // Re-read the bound record and output set before returning an immutable snapshot.
  for (const ref of checked.values()) await checkRef(ref);
  if (rules) assert.deepEqual(await buildEditedOrchestrationDrawingRulesRefV001(), rules);
  const record = {schemaVersion: 'q5-3-short-reuse-bindings-v001', status: 'passed',
    sourceIdentitySha256: source.sourceIdentitySha256, candidateIdentitySha256: source.candidateIdentitySha256,
    selectionRef, resolvedRef, selection: restored.selection, selectionProvenance: selection.selectionProvenance,
    resolutionSha256: restored.resolutionSha256, contentVersion: restored.contentVersion,
    fullContentFrameCount: restored.frameCount, bindings, checkedFileRefs: [...checked.values()].sort((a, b) => a.path.localeCompare(b.path)),
    drawingRulesRef: rules, scope: 'reuse of the selected fixed local clips only; no new full-length movie',
    newMediaCount: 0, mediaQcExecutions: 0, oldArtifactRecordsModified: false,
    humanQuality: 'not-evaluated', contentEditsAdopted: false};
  return {...record, bindingSha256: hash(record)};
}

export async function restoreQ53ReuseBindingsV001({saved, ...input}) {
  assert.equal(saved?.schemaVersion, 'q5-3-short-reuse-bindings-v001');
  const reconstructed = await buildQ53ReuseBindingsV001(input);
  sameRecord(saved, reconstructed, 'saved output reuse does not exactly match the current selected content snapshot');
  return reconstructed;
}

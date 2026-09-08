/** 指示-019: 同じ採用区間に残った既知字幕問題だけを、既存の共通補修へ渡す。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, readJson, readBound, bind, publish, same, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadSelectionContextV001, verifySelectionAdoptionV001} from './run_candidate_selection_e2e_v001.mts';
import {loadHistoricalCaptionRepairFixtureV001, HISTORICAL_FIXTURE_BINDING_V001}
  from './replay_caption_local_repair_v001.mts';
import {
  loadCaptionRepairContextV001, describeCaptionRepairV001, createCaptionRepairSessionV001,
  observeCaptionRepairFrameV001, saveCaptionRepairObservationV001, validateCaptionLocalRepairV001,
  captionRepairApprovalDraftV001, adoptCaptionLocalRepairV001, reconstructCaptionLocalRepairV001,
  publishCaptionLocalRepairV001, renderCaptionLocalRepairV001, captionRepairEffectiveInputsV001,
} from './caption_local_repair_common_v001.mts';
import type {CaptionRepairSourceV001} from '../../packages/shared/src/caption-local-repair-v001.js';

const sourceIds = (ins: Json, meaning: Json): number[] => ins.targetProvenance.atomOccurrenceIds.map((id: string) => {
  const atom = meaning.atomOccurrences.find((a: Json) => a.atomOccurrenceId === id);
  assert(atom, 'UNKNOWN_CAPTION_TEXT_ID'); return atom.sourceSegmentId;
});
function sameSourceSegment(oldSegment: Json, timeline: Json) {
  const found = timeline.segments.filter((s: Json) => s.sourceStartFrame30 === oldSegment.sourceStartFrame30
    && s.sourceEndFrame30 === oldSegment.sourceEndFrame30 && s.sourceStartMs === oldSegment.sourceStartMs
    && s.sourceEndMs === oldSegment.sourceEndMs);
  assert.equal(found.length, 1, 'EXACT_RETAINED_SEGMENT_REQUIRED');
  return found[0];
}
function projectFrame(frame: number, old: Json, next: Json) {
  assert(Number.isSafeInteger(frame) && frame >= old.outputStartFrame && frame <= old.outputEndFrame);
  const sourceFrame = old.sourceStartFrame30 + frame - old.outputStartFrame;
  const outputFrame = next.outputStartFrame + sourceFrame - next.sourceStartFrame30;
  assert(outputFrame >= next.outputStartFrame && outputFrame <= next.outputEndFrame);
  return outputFrame;
}

export async function reuseSelectedCaptionRepairsV001(planPath: string) {
  const c = await loadSelectionContextV001(planPath);
  const {adoption} = await verifySelectionAdoptionV001(c);
  const work = c.plan.outputRoot, root = `${work}/caption-repair-v001`;
  const preliminary = await readJson(`${work}/verification.json`);
  assert.equal(preliminary.status, 'passed');
  assert(same(preliminary.machineAdoptionBinding, bind(`${work}/machine-adoption.json`, adoption)));
  const executed = await readBound(preliminary.renderer.execution);
  assert.equal(executed.exitCode, 0); assert.equal(executed.result.qc.status, 'passed');
  const executedJob = await readBound(executed.rendererJobBinding);
  const sourceJob = await readBound(preliminary.artifacts.rendererJob);
  const allowedExecution = structuredClone(sourceJob);
  allowedExecution.attemptId = executedJob.attemptId; allowedExecution.publication = executedJob.publication;
  assert(same(executedJob, allowedExecution), 'EXECUTED_CAPTION_INPUT_CHANGED');
  const historical = await loadHistoricalCaptionRepairFixtureV001('digest');
  const oldMeaning = await readBound(historical.source.artifacts.meaning);
  const oldTimeline = await readBound(historical.source.base.timeline);
  const oldGeneration = await readBound(historical.source.base.generationManifest);
  const [meaning, instruction, timeline, generation, oldInstruction] = await Promise.all([
    readBound(preliminary.artifacts.meaning), readBound(preliminary.artifacts.instruction),
    readBound(preliminary.base.timeline), readBound(preliminary.base.generationManifest),
    readBound(historical.source.artifacts.instruction),
  ]);
  assert.equal(generation.source.fileSha256, oldGeneration.source.fileSha256, 'SOURCE_MEDIA_CHANGED');
  assert.equal(generation.audio.sampleRate, oldGeneration.audio.sampleRate, 'SOURCE_AUDIO_RATE_CHANGED');
  assert.equal(generation.audio.sourceGrid.payloadSha256, oldGeneration.audio.sourceGrid.payloadSha256, 'SOURCE_AUDIO_GRID_CHANGED');
  assert(same(timeline.sourceFrameClock, oldTimeline.sourceFrameClock), 'SOURCE_FRAME_CLOCK_CHANGED');
  const retained = new Set<number>(adoption.segments.flatMap((s: Json) => s.sourceSegmentIds));
  const mappings = historical.records.flatMap((record: Json) => {
    const original = record.operation.target;
    const oldIns = oldInstruction.instructions.find((i: Json) => i.instructionId === original.instructionId)!;
    const ids = sourceIds(oldIns, oldMeaning);
    if (!ids.some(id => retained.has(id))) return [];
    assert(ids.every(id => retained.has(id)), 'PARTIAL_KNOWN_CAPTION_CHANGED');
    const matches = instruction.instructions.filter((i: Json) => same(sourceIds(i, meaning), ids));
    assert.equal(matches.length, 1, 'EXACT_KNOWN_CAPTION_GROUP_REQUIRED');
    const target = matches[0]; assert.equal(target.content.text, original.text, 'KNOWN_CAPTION_TEXT_CHANGED');
    const oldSegment = oldTimeline.segments.find((s: Json) => s.segmentId === original.timelineSegmentId)!;
    const nextSegment = sameSourceSegment(oldSegment, timeline);
    const oldAudio = oldGeneration.segments.find((s: Json) => s.segmentId === oldSegment.segmentId).audioSamples;
    const nextAudio = generation.segments.find((s: Json) => s.segmentId === nextSegment.segmentId).audioSamples;
    assert.equal(nextAudio.sourceStart, oldAudio.sourceStart, 'RETAINED_AUDIO_START_CHANGED');
    assert.equal(nextAudio.sourceEnd, oldAudio.sourceEnd, 'RETAINED_AUDIO_END_CHANGED');
    assert.deepEqual(target.outputTime, {
      startFrame: projectFrame(original.currentFrames.startFrame, oldSegment, nextSegment),
      endFrameExclusive: projectFrame(original.currentFrames.endFrameExclusive, oldSegment, nextSegment),
    }, 'KNOWN_CAPTION_INITIAL_FRAMES_CHANGED');
    return [{record, target, ids, oldSegment, nextSegment}];
  });
  assert(mappings.length > 0, 'NO_EXISTING_REPAIRS_APPLY');
  const source: CaptionRepairSourceV001 = {schemaVersion: 'caption-local-repair-source-v001', sourceId: `${c.plan.planId}-known-caption-repair`,
    completedMedia: preliminary.renderer.video, base: preliminary.base,
    artifacts: Object.fromEntries(['meaning', 'sourcePackage', 'selection', 'instruction', 'rendererJob', 'lineEndProjection', 'cueEndProjection']
      .map(k => [k, k === 'rendererJob' ? executed.rendererJobBinding : preliminary.artifacts[k]])) as any,
    audioPacketSha256: generation.audio.encoded.packetPayloadSha256,
    allowedTargets: mappings.map((m: Json) => ({instructionId: m.target.instructionId,
      operations: m.record.operation.kind === 'exclude-caption' ? ['exclude-caption']
        : ['start', 'end'].filter(side => m.record.operation[side].mode === 'observed').map(side => side === 'start' ? 'change-start' : 'change-end'),
      reviewWindow: {startFrame: m.nextSegment.outputStartFrame, endFrameExclusive: m.nextSegment.outputEndFrame}})) as any};
  const sourceBinding = await publish(`${work}/caption-repair-source.json`, source);
  const mappingProof = await publish(`${work}/caption-repair-mapping-proof.json`, {
    schemaVersion: 'candidate-selection-existing-caption-repair-mapping-v001', status: 'passed',
    instruction: 'ZEV進行管理２ 指示-019 §14', mode: 'reuse-existing-confirmed-repair-after-source-identity-proof',
    selectionAdoptionBinding: preliminary.machineAdoptionBinding, sourceBinding,
    historicalFixtureBinding: HISTORICAL_FIXTURE_BINDING_V001, historicalSource: historical.source,
    sharedSourceMediaSha256: generation.source.fileSha256, sharedSourceAudioGridSha256: generation.audio.sourceGrid.payloadSha256,
    mappings: mappings.map((m: Json) => ({originalInstructionId: m.record.operation.target.instructionId,
      newInstructionId: m.target.instructionId, text: m.target.content.text, sourceSegmentIds: m.ids,
      oldSegment: m.oldSegment, newSegment: m.nextSegment, operation: m.record.operation.kind})),
    newHumanObservation: false, newTimingInference: false, newAcousticObservation: false,
    scope: 'existing-caption-exclusion-and-human-observed-frame-boundaries-only',
    implementationBindings: await Promise.all([
      'evals/clip_composition/reuse_selected_caption_repairs_v001.mts',
      'evals/clip_composition/replay_caption_local_repair_v001.mts',
      'evals/clip_composition/caption_local_repair_common_v001.mts',
    ].map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))}))),
  });
  const context = await loadCaptionRepairContextV001(source);
  const session = await createCaptionRepairSessionV001(context, 'fixture-replay', [mappingProof, HISTORICAL_FIXTURE_BINDING_V001]);
  const targets = describeCaptionRepairV001(context).targets;
  const records = mappings.map((m: Json) => {
    const target = targets.find(t => t.instructionId === m.target.instructionId)!;
    const original = m.record.operation;
    if (original.kind === 'exclude-caption') return saveCaptionRepairObservationV001(session,
      {kind: 'exclude-caption', target, confirmedText: target.text, reason: original.reason});
    const operation: any = {kind: 'change-boundaries', target, start: {mode: 'keep-current'}, end: {mode: 'keep-current'}};
    for (const side of ['start', 'end']) {
      if (original[side].mode !== 'observed') continue;
      const oldObservation = original[side].observation;
      const frame = projectFrame(oldObservation.selectedVideoFrame, m.oldSegment, m.nextSegment);
      const observation = observeCaptionRepairFrameV001(session, target.instructionId, frame);
      assert.equal(observation.sourceVideoFrame, oldObservation.sourceVideoFrame, 'HISTORICAL_SOURCE_FRAME_CHANGED');
      assert.equal(observation.sourceAudioSample, oldObservation.sourceAudioSample, 'HISTORICAL_SOURCE_AUDIO_SAMPLE_CHANGED');
      operation[side] = {mode: 'observed', observation};
    }
    return saveCaptionRepairObservationV001(session, operation);
  });
  const validated = validateCaptionLocalRepairV001(session, records);
  const repair = adoptCaptionLocalRepairV001(validated, captionRepairApprovalDraftV001(validated));
  const rebuilt = await reconstructCaptionLocalRepairV001(repair, root, `${c.plan.planId}-caption-repair`);
  const normalize = (core: Json, sourceMeaning: Json, sourceTimeline: Json, project: boolean) => {
    const byAtom = new Map<string, Json>(sourceMeaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
    const payload = captionRepairEffectiveInputsV001(core);
    return {styleProfileId: payload.styleProfileId, instructions: payload.instructions.flatMap((row: Json) => {
      const ids = row.targetProvenance.atomOccurrenceIds.map((id: string) => byAtom.get(id)!.sourceSegmentId);
      if (!ids.some((id: number) => retained.has(id))) return [];
      assert(ids.every((id: number) => retained.has(id)), 'PARTIAL_BASELINE_CAPTION_REMAINED');
      const atom = byAtom.get(row.targetProvenance.atomOccurrenceIds[0])!;
      const segment = sourceTimeline.segments.find((s: Json) => s.segmentId === atom.retainedSpans[0].timelineSegmentId);
      const next = project ? sameSourceSegment(segment, timeline) : segment;
      return [{semanticKind: row.semanticKind, content: row.content, sourceSegmentIds: ids,
        frames: {startFrame: projectFrame(row.outputTime.startFrame, segment, next),
          endFrameExclusive: projectFrame(row.outputTime.endFrameExclusive, segment, next)},
        cueEndSourceSegmentId: byAtom.get(row.cueEndTextId)!.sourceSegmentId,
        lineEndSourceSegmentIds: row.lineEndTextIds.map((id: string) => byAtom.get(id)!.sourceSegmentId), materialRefs: row.materialRefs}];
    })};
  };
  const actualPayload = normalize(rebuilt.core, rebuilt.core.meaning, timeline, false);
  const expectedPayload = normalize(historical.expected, oldMeaning, oldTimeline, true);
  assert.deepEqual(actualPayload, expectedPayload, 'REMAINING_BASELINE_CAPTION_PAYLOAD_CHANGED');
  await publishCaptionLocalRepairV001(rebuilt);
  await publish(`${work}/caption-repair-equivalence.json`, {schemaVersion: 'candidate-selection-caption-repair-equivalence-v001', status: 'passed',
    mappingProofBinding: mappingProof, formalCaptionCount: actualPayload.instructions.length,
    payload: actualPayload, existingCaptionStyleTextFramesAndLineEnds: 'preserved-for-selected-source-content',
    scope: rebuilt.scope, newHumanJudgment: false});
  const renderer = await renderCaptionLocalRepairV001(rebuilt);
  const final = {schemaVersion: 'candidate-selection-final-verification-v001', status: 'passed',
    planBinding: c.planBinding, selectionVerificationBinding: bind(`${work}/verification.json`, preliminary),
    captionRepairMappingBinding: mappingProof, captionRepairEquivalenceBinding: bind(`${work}/caption-repair-equivalence.json`, await readJson(`${work}/caption-repair-equivalence.json`)),
    base: preliminary.base, artifacts: rebuilt.artifacts, renderer,
    counts: preliminary.counts, finalFrames: preliminary.finalFrames, finalDurationSeconds: preliminary.finalDurationSeconds,
    technicalQc: 'passed', humanQuality: 'not-evaluated', candidateSelectionQualityOwner: 'human',
    subtitleProcessing: 'reused-confirmed-repairs-through-unchanged-common-path', newHumanSubtitleJudgment: false};
  await publish(`${work}/final-verification.json`, final);
  return final;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const v = await reuseSelectedCaptionRepairsV001(process.argv[2]);
  process.stdout.write(JSON.stringify({status: v.status, finalVideo: v.renderer.video, humanQuality: v.humanQuality}) + '\n');
}

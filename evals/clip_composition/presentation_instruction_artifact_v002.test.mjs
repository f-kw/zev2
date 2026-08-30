import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {buildPresentationCaptionInstructionArtifactV001}
  from './presentation_instruction_artifact_v001.mjs';
import {
  buildPresentationInstructionArtifactBindingV002,
  decodePresentationInstructionArtifactV002,
  serializePresentationInstructionArtifactV002,
  validatePresentationInstructionArtifactV002,
} from './presentation_instruction_artifact_v002.mjs';
import {
  PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING,
  PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH,
  buildActualCandidateInstructionFixtureV002,
  buildFormalFixtureBindingV001,
  sha256FixtureBytesV001,
} from './presentation_instruction_timeline_v003_fixture_v001.mjs';

const OLD_INSTRUCTION_SHA = '99888864b1213e5e31e24c5c1155e92ec50fae8a8190b8f7d4708071845d5bad';

test('PRI2-001 実候補をtimeline v003の+16ms frame mappingで正式注文へ変換する', async () => {
  const fixture = await buildActualCandidateInstructionFixtureV002();
  assert.equal(fixture.timeline.sourceFrameClock.videoPresentationOffsetMs, 16);
  assert.equal(fixture.artifact.instructions.length, 2);
  assert.deepEqual(
    fixture.artifact.instructions.map(row => row.outputTime),
    [{startFrame: 101, endFrameExclusive: 279}, {startFrame: 421, endFrameExclusive: 728}],
  );
});

test('PRI2-002 前後の本文・発話ID・順序を候補から変更しない', async () => {
  const {artifact, selected, split} = await buildActualCandidateInstructionFixtureV002();
  assert.equal(artifact.instructions[0].content.text,
    selected.slice(0, split).map(row => row.text).join(''));
  assert.equal(artifact.instructions[1].content.text,
    selected.slice(split).map(row => row.text).join(''));
  assert.deepEqual(artifact.instructions.flatMap(row => row.targetProvenance.atomOccurrenceIds),
    selected.map((_, index) => `atom-occurrence-${String(index + 1).padStart(6, '0')}`));
});

test('PRI2-003 timeline v002を新版へ混入させずfail-closedにする', async () => {
  const {artifact, meaningPackage, timeline, projection} =
    await buildActualCandidateInstructionFixtureV002();
  const old = structuredClone(timeline);
  old.schemaVersion = 'presentation-base-media-timeline-v002';
  delete old.sourceFrameClock.containerStartTimeMs;
  delete old.sourceFrameClock.videoStreamTimeBase;
  delete old.sourceFrameClock.videoFirstPts;
  delete old.sourceFrameClock.videoPtsStep;
  delete old.sourceFrameClock.videoPresentationOffsetMs;
  assert.equal(validatePresentationInstructionArtifactV002(
    artifact, {meaningPackage, timeline: old, cueEndProjection: projection},
  ).primaryCode, 'INSTRUCTION_BINDING_MISMATCH');
});

test('PRI2-004 offset=0のv003は旧v001と同じframe意味を持つ', async () => {
  const fixture = await buildActualCandidateInstructionFixtureV002({zeroOffset: true});
  const oldTimeline = structuredClone(fixture.timeline);
  oldTimeline.schemaVersion = 'presentation-base-media-timeline-v002';
  delete oldTimeline.sourceFrameClock.containerStartTimeMs;
  delete oldTimeline.sourceFrameClock.videoStreamTimeBase;
  delete oldTimeline.sourceFrameClock.videoFirstPts;
  delete oldTimeline.sourceFrameClock.videoPtsStep;
  delete oldTimeline.sourceFrameClock.videoPresentationOffsetMs;
  const old = buildPresentationCaptionInstructionArtifactV001({
    artifactId: 'candidate-horror-claim-to-speed-up-instruction-v001',
    sourceCaseId: 'candidate-horror-claim-to-speed-up',
    meaningInformationPackageBinding: fixture.artifact.sourceBindings.meaningInformationPackage,
    timelineBinding: buildFormalFixtureBindingV001(
      oldTimeline.schemaVersion,
      PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH,
      oldTimeline,
    ),
    cueEndProjectionBinding: fixture.artifact.sourceBindings.cueEndProjection,
    producerJobBinding: PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING,
    styleProfileId: fixture.artifact.styleProfileId,
    meaningPackage: fixture.meaningPackage,
    timeline: oldTimeline,
    cueEndProjection: fixture.projection,
  });
  assert.equal(old.status, 'built', JSON.stringify(old));
  assert.deepEqual(old.artifact.instructions.map(row => row.outputTime),
    fixture.artifact.instructions.map(row => row.outputTime));
});

test('PRI2-005 formal byteとbindingは同一入力で決定的', async () => {
  const first = await buildActualCandidateInstructionFixtureV002();
  const second = await buildActualCandidateInstructionFixtureV002();
  const a = serializePresentationInstructionArtifactV002(first.artifact);
  const b = serializePresentationInstructionArtifactV002(second.artifact);
  assert.deepEqual(a, b);
  assert.equal(decodePresentationInstructionArtifactV002(a).status, 'decoded');
  assert.deepEqual(
    buildPresentationInstructionArtifactBindingV002({
      path: 'out/instruction-v002.json', artifact: first.artifact,
    }),
    buildPresentationInstructionArtifactBindingV002({
      path: 'out/instruction-v002.json', artifact: second.artifact,
    }),
  );
});

test('PRI2-006 timeline binding schema差と余分fieldを拒否する', async () => {
  const {artifact} = await buildActualCandidateInstructionFixtureV002();
  const wrongSchema = structuredClone(artifact);
  wrongSchema.sourceBindings.timeline.schemaVersion = 'presentation-base-media-timeline-v002';
  assert.equal(validatePresentationInstructionArtifactV002(wrongSchema).status, 'rejected');
  const extra = structuredClone(artifact);
  extra.videoPresentationOffsetMs = 16;
  assert.equal(validatePresentationInstructionArtifactV002(extra).status, 'rejected');
});

test('PRI2-007 旧instruction v001実装byteを不変保持する', async () => {
  assert.equal(
    sha256FixtureBytesV001(
      await readFile('evals/clip_composition/presentation_instruction_artifact_v001.mjs'),
    ),
    OLD_INSTRUCTION_SHA,
  );
});

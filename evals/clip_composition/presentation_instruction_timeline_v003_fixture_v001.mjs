import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
  buildPresentationSemanticLineEndProjectionBindingV001,
  buildPresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {buildPresentationCaptionInstructionArtifactV002}
  from './presentation_instruction_artifact_v002.mjs';

export const PRESENTATION_TIMELINE_V003_FIXTURE_ROOT = 'evals/clip_composition/outputs';
export const PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH =
  `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/base-media/`
  + 'distant-connection-candidate-horror-claim-to-speed-up-audio-grid-v003/timeline.json';
export const PRESENTATION_TIMELINE_V003_FIXTURE_SEMANTIC_PATH =
  `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/`
  + 'work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/'
  + 'semantic-utterance-artifact-v001.json';
export const PRESENTATION_TIMELINE_V003_FIXTURE_CANDIDATE_PATH =
  `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/`
  + 'work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/'
  + 'candidate-response-v001.json';
const HASH = '0'.repeat(64);

export const sha256FixtureBytesV001 = bytes => createHash('sha256').update(bytes).digest('hex');
export const formalFixtureBytesV001 = value =>
  serializePresentationCaptionB1FormalJsonV001(value).bytes;
export const canonicalFixtureShaV001 = value => sha256FixtureBytesV001(
  canonicalizePresentationCaptionB1JsonV001(value).bytes,
);
export const buildFormalFixtureBindingV001 = (schemaVersion, path, value) => ({
  schemaVersion,
  path,
  fileSha256: sha256FixtureBytesV001(formalFixtureBytesV001(value)),
  canonicalSha256: canonicalFixtureShaV001(value),
});

export const PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING = Object.freeze({
  schemaVersion: 'presentation-rendering-decoupling-instruction-job-v002',
  path: `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/`
    + 'rendering-decoupling/jobs/instruction-v002.json',
  fileSha256: HASH,
  canonicalSha256: HASH,
});

export async function buildActualCandidateInstructionFixtureV002({zeroOffset = false} = {}) {
  const [timelineBytes, semanticBytes, candidateBytes] = await Promise.all([
    readFile(PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH),
    readFile(PRESENTATION_TIMELINE_V003_FIXTURE_SEMANTIC_PATH),
    readFile(PRESENTATION_TIMELINE_V003_FIXTURE_CANDIDATE_PATH),
  ]);
  const timeline = JSON.parse(timelineBytes);
  const semantic = JSON.parse(semanticBytes);
  const candidates = JSON.parse(candidateBytes);
  const candidate = candidates.candidates.find(
    row => row.candidateId === 'candidate-horror-claim-to-speed-up',
  );
  const selectedIds = [
    ...candidate.firstPartSemanticUtteranceIds,
    ...candidate.secondPartSemanticUtteranceIds,
  ];
  const selected = selectedIds.map(id => semantic.utterances.find(row => row.utteranceId === id));
  if (!candidate || selected.some(row => !row)) throw new Error('actual candidate fixture is missing');

  if (zeroOffset) {
    timeline.sourceFrameClock.videoFirstPts = 0;
    timeline.sourceFrameClock.videoPresentationOffsetMs = 0;
    let outputFrame = 0;
    for (const segment of timeline.segments) {
      segment.sourceStartFrame30 = Math.round(segment.sourceStartMs * 30 / 1000);
      segment.sourceEndFrame30 = Math.round(segment.sourceEndMs * 30 / 1000);
      segment.outputStartFrame = outputFrame;
      segment.outputEndFrame = outputFrame
        + segment.sourceEndFrame30 - segment.sourceStartFrame30;
      outputFrame = segment.outputEndFrame;
    }
    timeline.baseMedia.expectedFrameCount = outputFrame;
  }

  const split = candidate.firstPartSemanticUtteranceIds.length;
  const atoms = selected.map((row, index) => ({
    atomOccurrenceId: `atom-occurrence-${String(index + 1).padStart(6, '0')}`,
    text: row.text,
    retainedSpans: [{
      timelineSegmentId: index < split ? 'segment-0001' : 'segment-0002',
      sourceStartMs: row.sourceStartMs,
      sourceEndMs: row.sourceEndMs,
    }],
  }));
  const captionId = 'candidate-horror-claim-to-speed-up-caption';
  const semanticCaptionId = 'candidate-horror-claim-to-speed-up-semantic-caption';
  const caseId = 'candidate-horror-claim-to-speed-up';
  const boundaries = atoms.map((atom, index) => ({
    boundaryId: `${captionId}-boundary-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    afterAtomOccurrenceId: atom.atomOccurrenceId,
  }));
  const meaningPackage = {
    schemaVersion: 'zev-meaning-information-package-v002',
    captions: [{captionId: semanticCaptionId, atomOccurrenceIds: atoms.map(
      row => row.atomOccurrenceId,
    )}],
    atomOccurrences: atoms,
  };
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    reconstructionMap: {
      captions: [{
        captionId,
        semanticCaptionId,
        atomOccurrenceIds: atoms.map(row => row.atomOccurrenceId),
        boundaries,
      }],
      caseContexts: [{caseId, inputCaptionId: captionId}],
    },
  };
  const sourcePackageBinding = buildFormalFixtureBindingV001(
    sourcePackage.schemaVersion,
    `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/`
      + `rendering-decoupling/${caseId}/source-package-v001.json`,
    sourcePackage,
  );
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${caseId}-selection-v001`,
    sourcePackageBinding,
    response: {captions: [{
      captionId,
      cues: [
        {
          cueEndBoundaryId: boundaries[split - 1].boundaryId,
          lineEndBoundaryIds: [boundaries[split - 1].boundaryId],
        },
        {
          cueEndBoundaryId: boundaries.at(-1).boundaryId,
          lineEndBoundaryIds: [boundaries.at(-1).boundaryId],
        },
      ],
    }]},
  };
  const sourceSelectionDigest = {
    schemaVersion: selection.schemaVersion,
    artifactId: selection.selectionId,
    fileSha256: sha256FixtureBytesV001(formalFixtureBytesV001(selection)),
    canonicalSha256: canonicalFixtureShaV001(selection),
  };
  const projectionResult = buildPresentationCueEndProjectionV001({
    projectionId: `${caseId}-cue-end-projection-v001`,
    sourcePackageBinding,
    sourceSelectionDigest,
    producerJobBinding: PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING,
    sourcePackage,
    selection,
  });
  if (projectionResult.status !== 'built') throw new Error(JSON.stringify(projectionResult));
  const projection = projectionResult.projection;
  const projectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/`
      + `rendering-decoupling/${caseId}/cue-end-projection-v001.json`,
    projection,
  });
  const lineProjectionResult = buildPresentationSemanticLineEndProjectionV001({
    projectionId: `${caseId}-semantic-line-end-projection-v001`,
    sourcePackageBinding,
    cueEndProjectionBinding: projectionBinding,
    sourceSelectionDigest,
    producerJobBinding: PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING,
    sourcePackage,
    selection,
    cueEndProjection: projection,
  });
  if (lineProjectionResult.status !== 'built') throw new Error(JSON.stringify(lineProjectionResult));
  const lineProjection = lineProjectionResult.projection;
  const lineProjectionBinding = buildPresentationSemanticLineEndProjectionBindingV001({
    path: `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/`
      + `rendering-decoupling/${caseId}/semantic-line-end-projection-v001.json`,
    projection: lineProjection,
  });
  const meaningBinding = buildFormalFixtureBindingV001(
    meaningPackage.schemaVersion,
    `${PRESENTATION_TIMELINE_V003_FIXTURE_ROOT}/presentation/`
      + `rendering-decoupling/${caseId}/meaning-package-v002.json`,
    meaningPackage,
  );
  const timelineBinding = buildFormalFixtureBindingV001(
    timeline.schemaVersion,
    PRESENTATION_TIMELINE_V003_FIXTURE_TIMELINE_PATH,
    timeline,
  );
  const built = buildPresentationCaptionInstructionArtifactV002({
    artifactId: `${caseId}-instruction-v002`,
    sourceCaseId: caseId,
    meaningInformationPackageBinding: meaningBinding,
    timelineBinding,
    cueEndProjectionBinding: projectionBinding,
    producerJobBinding: PRESENTATION_TIMELINE_V003_FIXTURE_PRODUCER_JOB_BINDING,
    styleProfileId: 'normal-landscape-readable-pop-v001',
    meaningPackage,
    timeline,
    cueEndProjection: projection,
  });
  if (built.status !== 'built') throw new Error(JSON.stringify(built));
  return {
    artifact: built.artifact,
    candidate,
    meaningPackage,
    timeline,
    projection,
    projectionBinding,
    lineProjection,
    lineProjectionBinding,
    sourcePackage,
    sourcePackageBinding,
    selection,
    sourceSelectionDigest,
    selected,
    split,
  };
}

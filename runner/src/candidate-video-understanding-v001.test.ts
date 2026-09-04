import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {
  CANDIDATE_VIDEO_COMPARISON_EXPERIMENT_PLAN_SCHEMA_V002,
  CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
  CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
  CANDIDATE_VIDEO_ROLE_VALUES_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
  assertCandidateVideoCommunicationPlanApprovedV001,
  assertCandidateVideoCommunicationPlanV001,
  assertCandidateVideoComparisonExperimentPlanV002,
  assertCandidateVideoComparisonMeasurementV001,
  assertCandidateVideoComparisonWindowPlanV001,
  assertCandidateVideoHumanAnswersOffCenterV001,
  assertCandidateVideoProviderBlindnessV001,
  assertCandidateVideoProviderInputV001,
  assertCandidateVideoProviderSchemaSupportedSubsetV001,
  assertCandidateVideoStaticGenerateContentWireRequestV001,
  assertCandidateVideoUnderstandingExperimentJobsV001,
  assertCandidateVideoUnderstandingJobV001,
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001,
  assertCandidateVideoUnderstandingProviderOutputV001,
  assertCandidateVideoUnderstandingResultV001,
  buildCandidateVideoComparisonWindowsV001,
  buildCandidateVideoComparisonExperimentPlanV002,
  buildCandidateVideoSeparatedComparisonWindowsV002,
  buildCandidateVideoLocalUploadPlanV001,
  buildCandidateVideoProviderInputV001,
  buildCandidateVideoStaticGenerateContentSdkParametersV001,
  buildCandidateVideoStaticGenerateContentWireRequestV001,
  buildCandidateVideoUnderstandingJobV001,
  canonicalJsonBytesV001,
  createCandidateVideoCommunicationGuardV001,
  decodeCandidateVideoUnderstandingJobV001,
  decodeCandidateVideoUnderstandingResultV001,
  decodeCandidateVideoComparisonExperimentPlanV002,
  deriveCandidateVideoFixedWindowSettingsV001,
  deriveCandidateVideoFirstHumanReviewV001,
  exerciseCandidateVideoUnderstandingWithMockTransportV001,
  extractCandidateVideoCandidatePointsV001,
  extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001,
  projectCandidateIntervalToSourceV001,
  serializeCandidateVideoUnderstandingJobV001,
  serializeCandidateVideoUnderstandingResultV001,
  serializeCandidateVideoComparisonExperimentPlanV002,
  serializeCandidateVideoStaticGenerateContentWireRequestV001,
  verifyCandidateVideoUnderstandingJobFilesV001,
  verifyCandidateVideoHumanComparisonReferenceEvidenceV001,
  verifyClosedSourceMappingProvenanceV001,
  type CandidateVideoCommunicationPlanV001,
  type CandidateVideoComparisonExperimentPlanV002,
  type CandidateVideoComparisonWindowPlanV001,
  type CandidateVideoFixedWindowV001,
  type CandidateVideoFixedWindowSettingsV001,
  type CandidateVideoComparisonWindowsV001,
  type CandidateVideoCandidatePointV001,
  type CandidateVideoUnderstandingJobV001,
  type CandidateVideoUnderstandingProviderOutputV001,
  type CandidateVideoUnderstandingResultV001
} from './candidate-video-understanding-v001.js';

const WORKSPACE_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
const SOURCE_VIDEO_PATH =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const SOURCE_VIDEO_SHA = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const SEMANTIC_PATH =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const SEMANTIC_SHA = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const MOCK_FILES_URI = 'https://generativelanguage.googleapis.com/v1beta/files/opaque0001';

type ClosedFixture = {
  ordinal: number;
  localCandidateId: string;
  candidatePath: string;
  candidateSha: string;
  candidateVideoPath: string;
  candidateVideoSha: string;
  provenancePath: string;
  provenanceSha: string;
  containerDurationSeconds: {numerator: number; denominator: number};
  frameRate: number;
  frameCount: number;
  segments: Array<{
    segmentId: string;
    candidateStartTick: number;
    candidateEndTickExclusive: number;
    sourceStartMs: number;
    sourceEndMs: number;
  }>;
};

const CLOSED_FIXTURES: ClosedFixture[] = [
  {
    ordinal: 1,
    localCandidateId: 'camera-fear-escalation',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/camera-fear-escalation/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '4a878fee763a148ad2f0169decb34aee6b450921ea7a65eeeba4d3f5c5c609ee',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/camera-fear-escalation/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '210f75c45efff779b9d79ab84a412428763bf0d6c4c300996ba82bbd5a7bef92',
    containerDurationSeconds: {numerator: 557, denominator: 10},
    frameRate: 30,
    frameCount: 1671,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 209,
        sourceStartMs: 664354,
        sourceEndMs: 671316
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 209,
        candidateEndTickExclusive: 1671,
        sourceStartMs: 1377918,
        sourceEndMs: 1426649
      }
    ]
  },
  {
    ordinal: 2,
    localCandidateId: 'medicine-effect-payoff',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/medicine-effect-payoff/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '455839bab76056af72e5ce57ca67672a475517c8fac6664d9520b9f11094ff32',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/medicine-effect-payoff/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '376a9a70fec87939917bc0fe68ce54b1dca8f8ab356c3e79599e263c227d557c',
    containerDurationSeconds: {numerator: 29, denominator: 1},
    frameRate: 30,
    frameCount: 870,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 183,
        sourceStartMs: 1680130,
        sourceEndMs: 1686233
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 183,
        candidateEndTickExclusive: 870,
        sourceStartMs: 4389098,
        sourceEndMs: 4412003
      }
    ]
  },
  {
    ordinal: 3,
    localCandidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-doctor-disappearance-to-ogre-mother/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '8b29f9bbe6025e31c909a080ebad5578c9ec0f363b8522bd678131d8d480cb3a',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-doctor-disappearance-to-ogre-mother/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '34c2d6ed84d27d61e5336ecc549dd66ed6709b19a6f7df4f4dcd00889a853018',
    containerDurationSeconds: {numerator: 2233313, denominator: 62500},
    frameRate: 30,
    frameCount: 1072,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 451,
        sourceStartMs: 1724755,
        sourceEndMs: 1739800
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 451,
        candidateEndTickExclusive: 1072,
        sourceStartMs: 5693397,
        sourceEndMs: 5714097
      }
    ]
  },
  {
    ordinal: 4,
    localCandidateId: 'candidate-horror-claim-to-speed-up',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-horror-claim-to-speed-up/render/presentation-rendered-v002.mp4',
    candidateVideoSha: 'f86ca4550ad198a5153564c8ba7dd3368084105e3686ebd3ab8de5686e5a27b7',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-horror-claim-to-speed-up/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: 'a51c8d461ae3b2e4dd25ed0ba4d749019e56f9301302d8d1ad7238467e8529a1',
    containerDurationSeconds: {numerator: 25333333, denominator: 1000000},
    frameRate: 30,
    frameCount: 760,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 280,
        sourceStartMs: 246000,
        sourceEndMs: 255324
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 280,
        candidateEndTickExclusive: 760,
        sourceStartMs: 1980000,
        sourceEndMs: 1996000
      }
    ]
  }
];

const UNRESOLVED_FIXTURE = {
  ordinal: 5,
  localCandidateId: 'candidate-horror-game-to-screams-001',
  candidatePath:
    'evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json',
  candidateSha: 'cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216',
  candidateVideoPath:
    'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-v001.mp4',
  candidateVideoSha: 'd2f6d8c3eceae5178703a01f3b8947ef3571219ab7d329af37c8a5569d875af0',
  provenancePath:
    'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-job-v001.json',
  provenanceSha: 'ee643a24f24e7deb6b2bf312a428aa93fa51a45372bc660652744051864b4812',
  containerDurationSeconds: {numerator: 13183333, denominator: 1000000},
  frameRate: 60,
  frameCount: 790,
  firstFramePts: 0,
  lastFramePts: 202240,
  lastFrameDurationPts: 256
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function orderedContractBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reduced(numerator: number, denominator: number) {
  let left = Math.abs(numerator);
  let right = Math.abs(denominator);
  while (right !== 0) [left, right] = [right, left % right];
  return {numerator: numerator / left, denominator: denominator / left};
}

function compareRational(
  left: {numerator: number; denominator: number},
  right: {numerator: number; denominator: number}
): number {
  return Math.sign(left.numerator * right.denominator - right.numerator * left.denominator);
}

function legacySourceProjection(
  fixture: ClosedFixture,
  interval: {startTimeMs: number; endTimeMs: number}
) {
  const startFrame = reduced(interval.startTimeMs * fixture.frameRate, 1000);
  const endFrame = reduced(interval.endTimeMs * fixture.frameRate, 1000);
  return fixture.segments.flatMap((segment) => {
    const segmentStart = {numerator: segment.candidateStartTick, denominator: 1};
    const segmentEnd = {numerator: segment.candidateEndTickExclusive, denominator: 1};
    const intersectionStart = compareRational(startFrame, segmentStart) > 0
      ? startFrame : segmentStart;
    const intersectionEnd = compareRational(endFrame, segmentEnd) < 0 ? endFrame : segmentEnd;
    if (compareRational(intersectionStart, intersectionEnd) >= 0) return [];
    const segmentFrameCount = segment.candidateEndTickExclusive - segment.candidateStartTick;
    const sourceDurationMs = segment.sourceEndMs - segment.sourceStartMs;
    const project = (point: {numerator: number; denominator: number}) => reduced(
      segment.sourceStartMs * point.denominator * segmentFrameCount
        + (point.numerator - segment.candidateStartTick * point.denominator) * sourceDurationMs,
      point.denominator * segmentFrameCount
    );
    return [{
      mappingSegmentId: segment.segmentId,
      candidateStartTimeMs: reduced(
        intersectionStart.numerator * 1000,
        intersectionStart.denominator * fixture.frameRate
      ),
      candidateEndTimeMs: reduced(
        intersectionEnd.numerator * 1000,
        intersectionEnd.denominator * fixture.frameRate
      ),
      sourceStartTimeMs: project(intersectionStart),
      sourceEndTimeMs: project(intersectionEnd)
    }];
  });
}

function sharedJobFields(fixture: {
  ordinal: number;
  localCandidateId: string;
  candidatePath: string;
  candidateSha: string;
  candidateVideoPath: string;
  candidateVideoSha: string;
  containerDurationSeconds: {numerator: number; denominator: number};
  frameRate: number;
  frameCount: number;
  firstFramePts?: number;
  lastFramePts?: number;
  lastFrameDurationPts?: number;
}): Omit<
  CandidateVideoUnderstandingJobV001,
  'sourceMapping' | 'providerInput' | 'providerInputCanonicalSha256'
> {
  const nominalFrameDurationPts = 15360 / fixture.frameRate;
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
    jobId: `candidate-video-understanding-job-${String(fixture.ordinal).padStart(4, '0')}`,
    experimentItem: {
      ordinal: fixture.ordinal,
      opaqueItemId: `item-${String(fixture.ordinal).padStart(4, '0')}`
    },
    evaluationScope: 'contract-output-and-mapping-fixture',
    comparisonInput: {status: 'not-applicable-contract-fixture'},
    purpose: CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001,
    localCandidateId: fixture.localCandidateId,
    localBindings: {
      candidate: {
        path: fixture.candidatePath,
        schemaVersion: 'distant-connection-luna-response-v001',
        fileSha256: fixture.candidateSha
      },
      semanticUtterance: {
        path: SEMANTIC_PATH,
        schemaVersion: 'semantic-utterance-artifact-v001',
        fileSha256: SEMANTIC_SHA
      },
      sourceVideo: {
        path: SOURCE_VIDEO_PATH,
        schemaVersion: 'media-file-v001',
        fileSha256: SOURCE_VIDEO_SHA
      },
      candidateVideo: {
        path: fixture.candidateVideoPath,
        schemaVersion: 'media-file-v001',
        fileSha256: fixture.candidateVideoSha
      }
    },
    sourceVideoId: 'ymUsGrT6EaA',
    candidateMedia: {
      mimeType: 'video/mp4' as const,
      containerDurationSeconds: fixture.containerDurationSeconds,
      video: {
        codecName: 'h264',
        width: 1920,
        height: 1080,
        frameRateNumerator: fixture.frameRate,
        frameRateDenominator: 1,
        frameCount: fixture.frameCount,
        timeBaseNumerator: 1,
        timeBaseDenominator: 15360,
        firstFramePts: fixture.firstFramePts ?? 0,
        lastFramePts: fixture.lastFramePts ?? (fixture.frameCount - 1) * nominalFrameDurationPts,
        lastFrameDurationPts: fixture.lastFrameDurationPts ?? nominalFrameDurationPts
      },
      audio: {codecName: 'aac', sampleRateHz: 44100, channels: 2}
    },
    referenceContext: {status: 'absent'},
    preflight: {
      status: 'pending-exact-request-and-token-count' as const,
      exactRequest: null,
      inputTokenCount: null,
      estimatedInputCostUsd: null,
      priceSnapshot: null,
      visibleOutputTokenLimit: 4096 as const,
      maximumExperimentInferenceCount: 5 as const,
      filesApiAncillaryCommunicationRequired: true as const,
      thinkingTokensBeforeExecution: 'not-exactly-fixable' as const,
      totalCostBeforeExecution: 'not-exact' as const
    },
    inferencePolicy: {
      inferencesForThisJob: 1 as const,
      automaticRetryCount: 0 as const,
      repairCallCount: 0 as const
    }
  };
}

function closedJob(fixture: ClosedFixture): CandidateVideoUnderstandingJobV001 {
  const frameDurationPts = 15360 / fixture.frameRate;
  return buildCandidateVideoUnderstandingJobV001({
    ...sharedJobFields(fixture),
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: {
        path: fixture.provenancePath,
        schemaVersion: 'distant-connection-video-intervalization-improvement-candidate-v001',
        fileSha256: fixture.provenanceSha
      },
      candidateTimeBase: {numerator: 1, denominator: 15360},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: fixture.frameCount * frameDurationPts,
      segments: fixture.segments.map((segment) => ({
        segmentId: segment.segmentId,
        candidateFrameStartIndex: segment.candidateStartTick,
        candidateFrameEndIndexExclusive: segment.candidateEndTickExclusive,
        candidateStartPts: segment.candidateStartTick * frameDurationPts,
        candidateEndPtsExclusive: segment.candidateEndTickExclusive * frameDurationPts,
        sourceFrameStartIndex: null,
        sourceFrameEndIndexExclusive: null,
        sourceStartPts: segment.sourceStartMs * 90,
        sourceEndPtsExclusive: segment.sourceEndMs * 90,
        sourceSelectionStartMs: segment.sourceStartMs,
        sourceSelectionEndMs: segment.sourceEndMs
      })),
      unmappedCandidatePts: []
    }
  });
}

function fifthJob(): CandidateVideoUnderstandingJobV001 {
  return buildCandidateVideoUnderstandingJobV001({
    ...sharedJobFields(UNRESOLVED_FIXTURE),
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: {
        path:
          'evals/clip_composition/outputs/work-candidate-video-understanding-horror-game-to-screams-source-mapping-v001/candidate-video-source-pts-mapping-v001.json',
        schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
        fileSha256: 'a6579f46bdb71723e5bbfd1e155da36f0d6e7a3373ab264800e56ec2076d4520'
      },
      candidateTimeBase: {numerator: 1, denominator: 15360},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: 202496,
      segments: [
        {
          segmentId: 'segment-0001',
          candidateFrameStartIndex: 0,
          candidateFrameEndIndexExclusive: 357,
          candidateStartPts: 0,
          candidateEndPtsExclusive: 91392,
          sourceFrameStartIndex: 14962,
          sourceFrameEndIndexExclusive: 15319,
          sourceStartPts: 22444440,
          sourceEndPtsExclusive: 22979940,
          sourceSelectionStartMs: 249378,
          sourceSelectionEndMs: 255324
        },
        {
          segmentId: 'segment-0002',
          candidateFrameStartIndex: 357,
          candidateFrameEndIndexExclusive: 790,
          candidateStartPts: 91648,
          candidateEndPtsExclusive: 202496,
          sourceFrameStartIndex: 368066,
          sourceFrameEndIndexExclusive: 368499,
          sourceStartPts: 552100440,
          sourceEndPtsExclusive: 552749940,
          sourceSelectionStartMs: 6134433,
          sourceSelectionEndMs: 6141636
        }
      ],
      unmappedCandidatePts: [
        {startPts: 91392, endPtsExclusive: 91648, reason: 'no-candidate-frame'}
      ]
    }
  });
}

const JOBS = [...CLOSED_FIXTURES.map(closedJob), fifthJob()];

function readyResultContractJobFixture(): CandidateVideoUnderstandingJobV001 {
  const job = clone(JOBS[0]);
  const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    job,
    MOCK_FILES_URI
  );
  job.preflight = {
    status: 'ready',
    exactRequest: {
      path: 'fixtures/exact-request-v001.json',
      schemaVersion: 'candidate-video-understanding-exact-provider-request-v001',
      fileSha256: sha256(
        serializeCandidateVideoStaticGenerateContentWireRequestV001(exactRequest, job)
      )
    },
    inputTokenCount: 16710,
    estimatedInputCostUsd: '0.0125325',
    priceSnapshot: {
      path: 'fixtures/price-snapshot-v001.json',
      schemaVersion: 'gemini-price-snapshot-v001',
      fileSha256: '5'.repeat(64)
    },
    visibleOutputTokenLimit: 4096,
    maximumExperimentInferenceCount: 5,
    filesApiAncillaryCommunicationRequired: true,
    thinkingTokensBeforeExecution: 'not-exactly-fixable',
    totalCostBeforeExecution: 'not-exact'
  };
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job);
  return job;
}

const COMPARISON_WINDOW_FIXTURES = [
  {
    id: 'camera',
    localCandidateId: 'camera-fear-escalation',
    points: [
      {locusId: 'camera-fear-escalation-first', sourceTimeMs: 664354},
      {locusId: 'camera-fear-escalation-second', sourceTimeMs: 1412798}
    ],
    human: [
      {locusId: 'camera-fear-escalation-first', startTimeMs: 664354, endTimeMs: 671316},
      {locusId: 'camera-fear-escalation-second', startTimeMs: 1377918, endTimeMs: 1426649}
    ],
    expectedFreeBaseline: [[646264, 683238], [1377898, 1428811]],
    expected: [[628078, 683238], [1377898, 1428251]]
  },
  {
    id: 'medicine',
    localCandidateId: 'medicine-effect-payoff',
    points: [
      {locusId: 'medicine-effect-payoff-first', sourceTimeMs: 1680130},
      {locusId: 'medicine-effect-payoff-second', sourceTimeMs: 4398688}
    ],
    human: [
      {locusId: 'medicine-effect-payoff-first', startTimeMs: 1680130, endTimeMs: 1686233},
      {locusId: 'medicine-effect-payoff-second', startTimeMs: 4389098, endTimeMs: 4412003}
    ],
    expectedFreeBaseline: [[1661474, 1700141], [4379070, 4414765]],
    expected: [[1644392, 1700141], [4363406, 4414164]]
  },
  {
    id: 'horror-claim',
    localCandidateId: 'candidate-horror-claim-to-speed-up',
    points: [
      {locusId: 'candidate-horror-claim-to-speed-up-first', sourceTimeMs: 249378},
      {locusId: 'candidate-horror-claim-to-speed-up-second', sourceTimeMs: 1984756}
    ],
    human: [
      {locusId: 'candidate-horror-claim-to-speed-up-first', startTimeMs: 246000, endTimeMs: 255324},
      {locusId: 'candidate-horror-claim-to-speed-up-second', startTimeMs: 1980000, endTimeMs: 1996000}
    ],
    expectedFreeBaseline: [[216538, 265495], [1967689, 2015211]],
    expected: [[214410, 264995], [1945338, 2015211]]
  },
  {
    id: 'doctor',
    localCandidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    points: [
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-first', sourceTimeMs: 1731997},
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-second', sourceTimeMs: 5698719}
    ],
    human: [
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-first', startTimeMs: 1724755, endTimeMs: 1739800},
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-second', startTimeMs: 5693397, endTimeMs: 5714097}
    ],
    expectedFreeBaseline: [[1715972, 1750321], [5682312, 5715037]],
    expected: [[1695299, 1750321], [5662938, 5714097]]
  },
  {
    id: 'screams',
    localCandidateId: 'candidate-horror-game-to-screams-001',
    points: [
      {locusId: 'candidate-horror-game-to-screams-001-first', sourceTimeMs: 249378},
      {locusId: 'candidate-horror-game-to-screams-001-second', sourceTimeMs: 6134433}
    ],
    human: null,
    expectedFreeBaseline: [[216538, 265495], [6114357, 6153435]],
    expected: [[214410, 264995], [6099087, 6153435]]
  }
] as const;

function buildComparisonContractFixture(
  baseJob: CandidateVideoUnderstandingJobV001,
  points: readonly CandidateVideoCandidatePointV001[],
  comparison: CandidateVideoComparisonWindowsV001,
  fixedWindowSettings: CandidateVideoFixedWindowSettingsV001
): {
  job: CandidateVideoUnderstandingJobV001;
  plan: CandidateVideoComparisonWindowPlanV001;
} {
  const fixtureId = baseJob.experimentItem.opaqueItemId;
  const explorationVideo = {
    path: `fixtures/${fixtureId}-wider-exploration-video-v001.mp4`,
    schemaVersion: 'candidate-video-exploration-media-v001',
    fileSha256: sha256(Buffer.from(`${fixtureId}-wider-exploration-video-v001`, 'utf8'))
  };
  const sourceMappingProvenance = {
    path: `fixtures/${fixtureId}-wider-exploration-source-pts-mapping-v001.json`,
    schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
    fileSha256: sha256(Buffer.from(`${fixtureId}-source-pts-mapping-v001`, 'utf8'))
  };
  const plan: CandidateVideoComparisonWindowPlanV001 = {
    schemaVersion: 'candidate-video-comparison-window-plan-v001',
    candidateId: baseJob.localCandidateId,
    sourceVideoId: baseJob.sourceVideoId,
    bindings: {
      candidateResponse: clone(baseJob.localBindings.candidate),
      semanticUtterance: clone(baseJob.localBindings.semanticUtterance),
      sourceVideo: clone(baseJob.localBindings.sourceVideo),
      explorationVideo,
      sourceMappingProvenance
    },
    fixedWindowSettingsApproval: {
      status: 'proposal-pending-kawafmm-approval',
      humanEvaluationArtifactsExcludedFromExecution: true
    },
    fixedWindowSettings: clone(fixedWindowSettings),
    candidatePoints: points.map((point) => ({...point})),
    freeFixedWindows: comparison.freeFixedWindow.map((window) => ({...window})),
    geminiExplorationWindows: comparison.geminiExplorationWindow.map((window) => ({...window})),
    sameSourceIntervals: true
  };
  const planBinding = {
    path: `fixtures/${fixtureId}-comparison-window-plan-v001.json`,
    schemaVersion: 'candidate-video-comparison-window-plan-v001',
    fileSha256: sha256(canonicalJsonBytesV001(plan))
  };
  let candidateStartPts = 0;
  const segments = comparison.freeFixedWindow.map((window, index) => {
    const durationMs = window.endTimeMs - window.startTimeMs;
    const candidateEndPtsExclusive = candidateStartPts + durationMs;
    const segment = {
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      candidateFrameStartIndex: candidateStartPts,
      candidateFrameEndIndexExclusive: candidateEndPtsExclusive,
      candidateStartPts,
      candidateEndPtsExclusive,
      sourceFrameStartIndex: null,
      sourceFrameEndIndexExclusive: null,
      sourceStartPts: window.startTimeMs * 90,
      sourceEndPtsExclusive: window.endTimeMs * 90,
      sourceSelectionStartMs: window.startTimeMs,
      sourceSelectionEndMs: window.endTimeMs
    };
    candidateStartPts = candidateEndPtsExclusive;
    return segment;
  });
  const totalDurationMs = candidateStartPts;
  const {
    providerInput: _providerInput,
    providerInputCanonicalSha256: _providerInputCanonicalSha256,
    ...baseFields
  } = clone(baseJob);
  const job = buildCandidateVideoUnderstandingJobV001({
    ...baseFields,
    evaluationScope: 'intervalization-replacement-comparison',
    comparisonInput: {
      status: 'resolved',
      mediaRole: 'wider-candidate-surrounding-region',
      sharedFreeAndGeminiWindowPlan: planBinding
    },
    localBindings: {...baseFields.localBindings, candidateVideo: explorationVideo},
    candidateMedia: {
      ...baseFields.candidateMedia,
      containerDurationSeconds: reduced(totalDurationMs, 1000),
      video: {
        ...baseFields.candidateMedia.video,
        frameRateNumerator: 1000,
        frameRateDenominator: 1,
        frameCount: totalDurationMs,
        timeBaseNumerator: 1,
        timeBaseDenominator: 1000,
        firstFramePts: 0,
        lastFramePts: totalDurationMs - 1,
        lastFrameDurationPts: 1
      }
    },
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: sourceMappingProvenance,
      candidateTimeBase: {numerator: 1, denominator: 1000},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: totalDurationMs,
      segments,
      unmappedCandidatePts: []
    }
  });
  return {job, plan};
}

async function writeTemporaryFixtureFile(
  workspaceRoot: string,
  relativePath: string,
  bytes: Uint8Array
): Promise<void> {
  const absolutePath = join(workspaceRoot, relativePath);
  await mkdir(dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes);
}

async function materializeReadyComparisonMockFixture(
  fixture: {
    job: CandidateVideoUnderstandingJobV001;
    plan: CandidateVideoComparisonWindowPlanV001;
    candidateBytes: Buffer;
  },
  semanticBytes: Buffer
): Promise<{
  workspaceRoot: string;
  job: CandidateVideoUnderstandingJobV001;
  plan: CandidateVideoComparisonWindowPlanV001;
  mappingArtifact: Record<string, unknown>;
  exactRequest: ReturnType<typeof buildCandidateVideoStaticGenerateContentWireRequestV001>;
  cleanup(): Promise<void>;
}> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'zev2-candidate-video-understanding-'));
  try {
    const job = clone(fixture.job);
    const plan = clone(fixture.plan);
    if (job.comparisonInput.status !== 'resolved' || job.sourceMapping.status !== 'closed') {
      throw new Error('materialized mock fixture requires resolved comparison and closed mapping');
    }
    const paths = {
      candidate: 'fixtures/candidate-response-v001.json',
      semantic: 'fixtures/semantic-utterance-v001.json',
      sourceVideo: 'fixtures/source-media.fixture-bytes',
      explorationVideo: 'fixtures/exploration-media.fixture-bytes',
      mapping: 'fixtures/source-pts-mapping-v001.json',
      plan: 'fixtures/comparison-window-plan-v001.json',
      exactRequest: 'fixtures/exact-request-v001.json',
      priceSnapshot: 'fixtures/price-snapshot-v001.json'
    };
    const sourceVideoBytes = Buffer.from('source-media-fixture-bytes', 'utf8');
    const explorationVideoBytes = Buffer.from('exploration-media-fixture-bytes', 'utf8');
    job.localBindings = {
      candidate: {
        path: paths.candidate,
        schemaVersion: fixture.job.localBindings.candidate.schemaVersion,
        fileSha256: sha256(fixture.candidateBytes)
      },
      semanticUtterance: {
        path: paths.semantic,
        schemaVersion: fixture.job.localBindings.semanticUtterance.schemaVersion,
        fileSha256: sha256(semanticBytes)
      },
      sourceVideo: {
        path: paths.sourceVideo,
        schemaVersion: 'media-file-v001',
        fileSha256: sha256(sourceVideoBytes)
      },
      candidateVideo: {
        path: paths.explorationVideo,
        schemaVersion: 'candidate-video-exploration-media-v001',
        fileSha256: sha256(explorationVideoBytes)
      }
    };
    const mapping = {
      candidateTimeBase: clone(job.sourceMapping.candidateTimeBase),
      sourceTimeBase: clone(job.sourceMapping.sourceTimeBase),
      candidateTimelineStartPts: job.sourceMapping.candidateTimelineStartPts,
      candidateTimelineEndPtsExclusive: job.sourceMapping.candidateTimelineEndPtsExclusive,
      segments: clone(job.sourceMapping.segments),
      unmappedCandidatePts: clone(job.sourceMapping.unmappedCandidatePts)
    };
    const mappingArtifact: Record<string, unknown> = {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      artifactId: 'comparison-mock-source-pts-mapping-v001',
      candidateId: job.localCandidateId,
      sourceVideoId: job.sourceVideoId,
      evidenceBindings: {
        candidateVideo: clone(job.localBindings.candidateVideo),
        sourceVideo: clone(job.localBindings.sourceVideo)
      },
      mapping
    };
    const mappingBytes = canonicalJsonBytesV001(mappingArtifact);
    const mappingBinding = {
      path: paths.mapping,
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      fileSha256: sha256(mappingBytes)
    };
    job.sourceMapping.provenance = mappingBinding;
    plan.bindings = {
      candidateResponse: clone(job.localBindings.candidate),
      semanticUtterance: clone(job.localBindings.semanticUtterance),
      sourceVideo: clone(job.localBindings.sourceVideo),
      explorationVideo: clone(job.localBindings.candidateVideo),
      sourceMappingProvenance: clone(mappingBinding)
    };
    plan.fixedWindowSettingsApproval = {
      status: 'approved',
      humanEvaluationArtifactsExcludedFromExecution: true
    };
    const planBytes = canonicalJsonBytesV001(plan);
    job.comparisonInput.sharedFreeAndGeminiWindowPlan = {
      path: paths.plan,
      schemaVersion: 'candidate-video-comparison-window-plan-v001',
      fileSha256: sha256(planBytes)
    };
    const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
      job,
      MOCK_FILES_URI
    );
    const exactRequestBytes = serializeCandidateVideoStaticGenerateContentWireRequestV001(
      exactRequest,
      job
    );
    const priceSnapshotBytes = canonicalJsonBytesV001({
      schemaVersion: 'gemini-price-snapshot-v001',
      classification: 'fixture-without-network'
    });
    job.preflight = {
      status: 'ready',
      exactRequest: {
        path: paths.exactRequest,
        schemaVersion: 'candidate-video-understanding-exact-provider-request-v001',
        fileSha256: sha256(exactRequestBytes)
      },
      inputTokenCount: 16710,
      estimatedInputCostUsd: '0.0125325',
      priceSnapshot: {
        path: paths.priceSnapshot,
        schemaVersion: 'gemini-price-snapshot-v001',
        fileSha256: sha256(priceSnapshotBytes)
      },
      visibleOutputTokenLimit: 4096,
      maximumExperimentInferenceCount: 5,
      filesApiAncillaryCommunicationRequired: true,
      thinkingTokensBeforeExecution: 'not-exactly-fixable',
      totalCostBeforeExecution: 'not-exact'
    };
    assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job);
    await Promise.all([
      writeTemporaryFixtureFile(workspaceRoot, paths.candidate, fixture.candidateBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.semantic, semanticBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.sourceVideo, sourceVideoBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.explorationVideo, explorationVideoBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.mapping, mappingBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.plan, planBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.exactRequest, exactRequestBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.priceSnapshot, priceSnapshotBytes)
    ]);
    return {
      workspaceRoot,
      job,
      plan,
      mappingArtifact,
      exactRequest,
      async cleanup() {
        await rm(workspaceRoot, {recursive: true, force: true});
      }
    };
  } catch (error) {
    await rm(workspaceRoot, {recursive: true, force: true});
    throw error;
  }
}

async function materializeAvailableHumanComparisonReferenceFixture(
  fixture: Awaited<ReturnType<typeof materializeReadyComparisonMockFixture>>,
  humanApprovedRequiredIntervals: readonly [
    {locusId: string; startTimeMs: number; endTimeMs: number},
    {locusId: string; startTimeMs: number; endTimeMs: number}
  ],
  reviewKind: 'selection-v002-accepted' | 'quality-v001-rejected'
): Promise<{
  binding: {path: string; schemaVersion: string; fileSha256: string};
  verification: Awaited<ReturnType<
    typeof verifyCandidateVideoHumanComparisonReferenceEvidenceV001
  >>;
  reference: Record<string, unknown>;
  humanReview: Record<string, unknown>;
  paths: {intervalProvenance: string; humanReview: string; reference: string};
}> {
  if (fixture.job.comparisonInput.status !== 'resolved') {
    throw new Error('human comparison fixture requires resolved comparison input');
  }
  const paths = {
    intervalProvenance: 'fixtures/human-intervalization-result-v001.json',
    humanReview: 'fixtures/human-review-result.json',
    reference: 'fixtures/human-comparison-reference-v001.json'
  };
  const intervalProvenance = {
    schemaVersion: 'distant-connection-video-intervalization-improvement-result-v001',
    sourceVideoId: fixture.job.sourceVideoId,
    sourceBindings: {
      sourceVideo: {
        path: fixture.job.localBindings.sourceVideo.path,
        fileSha256: fixture.job.localBindings.sourceVideo.fileSha256
      },
      candidateResponse: {
        path: fixture.job.localBindings.candidate.path,
        fileSha256: fixture.job.localBindings.candidate.fileSha256
      }
    },
    candidates: [
      ...(reviewKind === 'quality-v001-rejected'
        ? [{
            candidateId: 'different-candidate-not-selected-by-array-position',
            firstPart: {sourceStartMs: 1, sourceEndMs: 2},
            secondPart: {sourceStartMs: 3, sourceEndMs: 4}
          }]
        : []),
      {
      candidateId: fixture.job.localCandidateId,
      firstPart: {
        sourceStartMs: humanApprovedRequiredIntervals[0].startTimeMs,
        sourceEndMs: humanApprovedRequiredIntervals[0].endTimeMs
      },
      secondPart: {
        sourceStartMs: humanApprovedRequiredIntervals[1].startTimeMs,
        sourceEndMs: humanApprovedRequiredIntervals[1].endTimeMs
      }
    }]
  };
  const intervalProvenanceBytes = canonicalJsonBytesV001(intervalProvenance);
  const intervalProvenanceBinding = {
    path: paths.intervalProvenance,
    schemaVersion: 'distant-connection-video-intervalization-improvement-result-v001',
    fileSha256: sha256(intervalProvenanceBytes)
  };
  const humanReview = reviewKind === 'selection-v002-accepted'
    ? {
        schemaVersion: 'distant-connection-human-review-result-v002',
        sourceVideoId: fixture.job.sourceVideoId,
        reviewedAt: '2026-08-25',
        reviewer: 'kawafmm',
        sourceBindings: {
          candidateResponse: clone(fixture.job.localBindings.candidate),
          originalVideoPrototypeResult: {
            path: 'fixtures/original-video-prototype-result-v001.json',
            schemaVersion: 'distant-connection-video-prototype-result-v001',
            fileSha256: '1'.repeat(64)
          },
          intervalizationImprovementResult: intervalProvenanceBinding
        },
        candidateCount: 2,
        candidateReviews: [
          {
            candidateId: 'camera-fear-escalation',
            candidateSelection: 'pass',
            originalIntervalization: 'fail',
            improvedIntervalization: 'pass',
            shortFormViability: 'pass',
            classification: 'accepted-distant-connection-example',
            reason: '旧版では発話の原因となる重要な恐怖映像を落としていた。区間化改善によって必要な映像を含めた結果、前半との接続が理解でき、遠方接続として成立した。',
            shortFormAssessment: '必要な恐怖映像と反応を短尺として自然な長さに含められる。'
          },
          {
            candidateId: 'medicine-effect-payoff',
            candidateSelection: 'fail',
            originalIntervalization: 'fail',
            improvedIntervalization: 'pass',
            shortFormViability: 'fail',
            classification: 'rejected-short-form-candidate',
            reason: '区間化不良の診断と改善は正しかった。しかし改善後でも接続理解に必要な前提情報が多すぎ、説明と文脈をさらに長くすると動画のテンポを損なうため、遠方接続候補として不採用とする。',
            shortFormAssessment: '接続を理解するための前提情報が短尺として自然な長さに収まらない。これ以上の区間拡張は行わない。'
          }
        ],
        selectionPrinciple: '前半と後半の意味関係を理解するために必要な前提情報が、短尺動画として自然な長さに収まること。前提情報が複雑で長い説明区間を必要とする候補は、意味的接続が存在していても除外する。'
      }
    : {
        schemaVersion: 'distant-connection-human-quality-review-result-v001',
        sourceVideoId: fixture.job.sourceVideoId,
        reviewedAt: '2026-08-29',
        reviewer: 'kawafmm',
        sourceBindings: {
          candidateResponse: clone(fixture.job.localBindings.candidate),
          videoPrototypeResult: intervalProvenanceBinding
        },
        candidateCount: 2,
        candidateReviews: [
          {
            candidateId: 'different-candidate-not-selected-by-array-position',
            connectionValidity: 'pass',
            payoffStrength: 'fail',
            visualSuitability: 'not-primary-cause',
            intervalizationEvaluation: 'fail',
            finalDecision: 'pass',
            humanReason: '対象外候補を配列位置では選ばないことを検査するfixture。'
          },
          {
            candidateId: fixture.job.localCandidateId,
            connectionValidity: 'pass',
            payoffStrength: 'story-level-pass',
            visualSuitability: 'fail',
            intervalizationEvaluation: 'pass',
            finalDecision: 'fail',
            humanReason: '区間化は成立したが映像適性を理由に不採用としたfixture。'
          }
        ],
        responsibilityPrinciple: 'Lunaは意味上の接続と文章上の回収候補を提示する。区間化は候補を実動画区間へ変換し、動画QCは技術成立を検査する。実動画を確認した人間が接続成立・回収強度・映像適性・区間化評価・最終採否を独立して正式所有する。'
      };
  const humanReviewBytes = orderedContractBytes(humanReview);
  const humanReviewBinding = {
    path: paths.humanReview,
    schemaVersion: humanReview.schemaVersion,
    fileSha256: sha256(humanReviewBytes)
  };
  const reference = {
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    candidateId: fixture.job.localCandidateId,
    sourceVideoId: fixture.job.sourceVideoId,
    referenceKind: 'human-required-intervals-available',
    evidenceBindings: {
      humanReview: humanReviewBinding,
      intervalProvenance: intervalProvenanceBinding,
      comparisonWindowPlan:
        clone(fixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan)
    },
    humanDisposition: reviewKind === 'selection-v002-accepted' ? 'accepted' : 'rejected',
    humanApprovedRequiredIntervals: humanApprovedRequiredIntervals.map((interval) => ({
      ...interval
    }))
  };
  const referenceBytes = canonicalJsonBytesV001(reference);
  const binding = {
    path: paths.reference,
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    fileSha256: sha256(referenceBytes)
  };
  await Promise.all([
    writeTemporaryFixtureFile(
      fixture.workspaceRoot,
      paths.intervalProvenance,
      intervalProvenanceBytes
    ),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.humanReview, humanReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.reference, referenceBytes)
  ]);
  const verification = await verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
    binding,
    fixture.job,
    fixture.workspaceRoot
  );
  return {binding, verification, reference, humanReview, paths};
}

async function materializeNegativeHumanComparisonReferenceFixture(
  fixture: Awaited<ReturnType<typeof materializeReadyComparisonMockFixture>>,
  evaluatedIntervals: readonly [
    {startTimeMs: number; endTimeMs: number},
    {startTimeMs: number; endTimeMs: number}
  ]
): Promise<{
  binding: {path: string; schemaVersion: string; fileSha256: string};
  verification: Awaited<ReturnType<
    typeof verifyCandidateVideoHumanComparisonReferenceEvidenceV001
  >>;
  reference: Record<string, unknown>;
  humanReview: Record<string, unknown>;
  candidateReview: Record<string, unknown>;
  paths: {candidateReview: string; humanReview: string; reference: string};
}> {
  if (fixture.job.comparisonInput.status !== 'resolved') {
    throw new Error('negative human comparison fixture requires resolved comparison input');
  }
  const paths = {
    candidateReview: 'fixtures/candidate-review-result-v001.json',
    humanReview: 'fixtures/candidate-human-review-result-v001.json',
    reference: 'fixtures/negative-human-comparison-reference-v001.json'
  };
  const candidateReview = {
    schemaVersion: 'distant-connection-candidate-review-result-v001',
    resultId: `${fixture.job.localCandidateId}-review-result-v001`,
    artifactClassification: 'candidate-review-artifact',
    sourceVideoId: fixture.job.sourceVideoId,
    candidateId: fixture.job.localCandidateId,
    generatedAt: '2026-08-30T11:36:39.000Z',
    reviewJobBinding: {
      path: 'fixtures/candidate-review-job-v001.json',
      schemaVersion: 'distant-connection-candidate-review-job-v001',
      fileSha256: '2'.repeat(64)
    },
    candidateResponseBinding: clone(fixture.job.localBindings.candidate),
    reviewVideo: {
      path: 'fixtures/candidate-review-v001.mp4',
      fileSha256: '3'.repeat(64)
    },
    mediaInspection: {
      durationMs: evaluatedIntervals.reduce(
        (sum, interval) => sum + interval.endTimeMs - interval.startTimeMs,
        0
      ),
      videoPresent: true,
      audioPresent: true
    },
    evaluatedParts: [
      {
        part: 'first',
        selectedSemanticUtteranceIds: ['semantic-utterance-fixture-first'],
        enclosedSemanticUtteranceIds: ['semantic-utterance-fixture-first'],
        firstOrdinal: 1,
        lastOrdinal: 1,
        sourceInterval: {
          sourceStartMs: evaluatedIntervals[0].startTimeMs,
          sourceEndMs: evaluatedIntervals[0].endTimeMs
        }
      },
      {
        part: 'second',
        selectedSemanticUtteranceIds: ['semantic-utterance-fixture-second'],
        enclosedSemanticUtteranceIds: ['semantic-utterance-fixture-second'],
        firstOrdinal: 2,
        lastOrdinal: 2,
        sourceInterval: {
          sourceStartMs: evaluatedIntervals[1].startTimeMs,
          sourceEndMs: evaluatedIntervals[1].endTimeMs
        }
      }
    ],
    generationStatus: 'succeeded',
    statusFlags: {
      formalSelection: false,
      formalRenderer: false,
      completedShort: false,
      technicalQcCompleted: false
    },
    responsibilityPrinciple: '本成果物は正式selection前の候補を人間が直接確認するため、前半・後半それぞれを最初の選択発話開始から最後の選択発話終了までの元映像・元音声区間へ決定的に投影する。候補採否、正式区間承認、正式renderer出力、完成short、技術QCを所有しない。'
  };
  const candidateReviewBytes = orderedContractBytes(candidateReview);
  const candidateReviewBinding = {
    path: paths.candidateReview,
    schemaVersion: 'distant-connection-candidate-review-result-v001',
    fileSha256: sha256(candidateReviewBytes)
  };
  const humanReview = {
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    reviewId: `${fixture.job.localCandidateId}-human-review-v001`,
    sourceVideoId: fixture.job.sourceVideoId,
    candidateId: fixture.job.localCandidateId,
    reviewedAt: '2026-08-30T11:36:39.000Z',
    reviewer: {kind: 'human', id: 'kawafmm'},
    sourceBindings: {
      candidateResponse: clone(fixture.job.localBindings.candidate),
      candidateReviewResult: candidateReviewBinding
    },
    evaluatedIntervals: {
      firstPartSourceInterval: {
        sourceStartMs: evaluatedIntervals[0].startTimeMs,
        sourceEndMs: evaluatedIntervals[0].endTimeMs
      },
      secondPartSourceInterval: {
        sourceStartMs: evaluatedIntervals[1].startTimeMs,
        sourceEndMs: evaluatedIntervals[1].endTimeMs
      }
    },
    verdict: 'rejected',
    primaryCause: 'candidate-selection',
    reason: '候補発見段階で人間が不採用としたfixture。',
    selectionStatus: 'not-selected',
    responsibilityPrinciple: '本成果物はcandidate review artifactを見た人間の候補評価を保存する。正式selectionや正式区間を生成・承認せず、不採用候補をnot-selectedのまま保持する。'
  };
  const humanReviewBytes = orderedContractBytes(humanReview);
  const humanReviewBinding = {
    path: paths.humanReview,
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    fileSha256: sha256(humanReviewBytes)
  };
  const reference = {
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    candidateId: fixture.job.localCandidateId,
    sourceVideoId: fixture.job.sourceVideoId,
    referenceKind: 'candidate-discovery-negative-without-approved-required-intervals',
    evidenceBindings: {
      humanReview: humanReviewBinding,
      intervalProvenance: null,
      comparisonWindowPlan:
        clone(fixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan)
    },
    humanDisposition: 'rejected',
    humanApprovedRequiredIntervals: []
  };
  const referenceBytes = canonicalJsonBytesV001(reference);
  const binding = {
    path: paths.reference,
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    fileSha256: sha256(referenceBytes)
  };
  await Promise.all([
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.candidateReview, candidateReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.humanReview, humanReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.reference, referenceBytes)
  ]);
  const verification = await verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
    binding,
    fixture.job,
    fixture.workspaceRoot
  );
  return {binding, verification, reference, humanReview, candidateReview, paths};
}

function validProviderOutput(): CandidateVideoUnderstandingProviderOutputV001 {
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
    summary: '候補動画内で確認できる内容だけを記録した。',
    roleObservations: [
      {
        role: 'coreEvent',
        status: 'observed',
        intervals: [{
          observationId: 'observation-001',
          startTimeMs: 6900,
          endTimeMs: 7100,
          factualDescription: '連結点をまたいで主要な出来事が続く。',
          evidenceModalities: ['video', 'audio']
        }],
        factualDescription: '主要な出来事を確認した。'
      },
      {
        role: 'reaction',
        status: 'observed',
        intervals: [{
          observationId: 'observation-002',
          startTimeMs: 7100,
          endTimeMs: 9000,
          factualDescription: '発話と音声による反応がある。',
          evidenceModalities: ['audio', 'speech']
        }],
        factualDescription: '反応を確認した。'
      },
      {
        role: 'naturalEnding',
        status: 'observed',
        intervals: [{
          observationId: 'observation-003',
          startTimeMs: 9000,
          endTimeMs: 10000,
          factualDescription: '反応が収束する。',
          evidenceModalities: ['video', 'audio', 'speech']
        }],
        factualDescription: '自然な収束を確認した。'
      },
      {
        role: 'causeOrTrigger',
        status: 'observed',
        intervals: [{
          observationId: 'observation-004',
          startTimeMs: 1000,
          endTimeMs: 2000,
          factualDescription: '映像上のきっかけが確認できる。',
          evidenceModalities: ['video']
        }],
        factualDescription: 'きっかけを確認した。'
      },
      {
        role: 'minimumContext',
        status: 'notObserved',
        intervals: [],
        factualDescription: 'この動画内では追加の最小文脈を確認できない。'
      },
      {
        role: 'removableContext',
        status: 'observed',
        intervals: [{
          observationId: 'observation-005',
          startTimeMs: 10000,
          endTimeMs: 11000,
          factualDescription: '主要な出来事と反応の後である。',
          evidenceModalities: ['video', 'audio']
        }],
        factualDescription: '外してよい後続部を確認した。'
      }
    ],
    visualCautions: [
      {
        kind: 'audioDependent',
        startTimeMs: 7100,
        endTimeMs: 9000,
        factualDescription: '反応の理解は音声にも依存する。'
      }
    ],
    insufficientEvidence: {
      present: true,
      missingEvidence: ['minimumContext'],
      factualDescription: '候補より前の前提は確認できない。'
    }
  };
}

function projectedList(
  job: CandidateVideoUnderstandingJobV001,
  inputs: Array<{id: string; startTimeMs: number; endTimeMs: number}>
) {
  return inputs.map((input) => ({
    observationId: input.id,
    ...projectCandidateIntervalToSourceV001(job, input)
  }));
}

function validResult(job: CandidateVideoUnderstandingJobV001): CandidateVideoUnderstandingResultV001 {
  if (job.preflight.status !== 'ready') throw new Error('result fixture requires ready preflight');
  const output = validProviderOutput();
  const jobBytes = serializeCandidateVideoUnderstandingJobV001(job);
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
    resultId: 'candidate-video-understanding-result-0001',
    jobBinding: {
      path: 'fixtures/job-v001.json',
      schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
      fileSha256: sha256(jobBytes)
    },
    execution: {
      attemptId: 'attempt-0001',
      executedAt: '2026-09-03T00:00:00.000Z',
      httpStatus: 200,
      completionStatus: 'completed',
      actualModel: 'gemini-3.8-flash',
      providerExecutionId: null,
      automaticRetryCount: 0,
      repairCallCount: 0,
      exactRequest: clone(job.preflight.exactRequest),
      rawResponse: {
        path: 'fixtures/raw-response-v001.json',
        schemaVersion: 'provider-raw-response-v001',
        fileSha256: '2'.repeat(64)
      }
    },
    structuredValidation: {status: 'passed', violations: []},
    providerOutput: output,
    projectedRoleIntervals: projectedList(job, output.roleObservations.flatMap((role) =>
      role.intervals.map((item) => ({
        id: item.observationId,
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs
      })))),
    projectedVisualCautions: projectedList(job, output.visualCautions.map((item, index) => ({
      id: `visual-caution-${String(index + 1).padStart(3, '0')}`,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs
    }))),
    usage: {inputTokens: job.preflight.inputTokenCount, outputTokens: 300, thinkingTokens: 700},
    cost: {
      priceSnapshot: clone(job.preflight.priceSnapshot),
      estimatedTotalUsd: '0.012345',
      classification: 'estimate-from-provider-usage-not-invoice'
    }
  };
}

function expectContractFailure(action: () => unknown, message: string): void {
  assert.throws(action, {name: 'CandidateVideoUnderstandingContractErrorV001'}, message);
}

async function main(): Promise<void> {
  let assertions = 0;

  assertCandidateVideoUnderstandingExperimentJobsV001(JOBS);
  assertions += 1;

  assertCandidateVideoProviderSchemaSupportedSubsetV001(
    CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001
  );
  const providerSchemaText = JSON.stringify(CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001);
  assert.equal(providerSchemaText.includes('"const"'), false);
  assert.equal(providerSchemaText.includes('"uniqueItems"'), false);
  assert.deepEqual(buildCandidateVideoProviderInputV001(1), JOBS[0].providerInput);
  assert.deepEqual(CANDIDATE_VIDEO_ROLE_VALUES_V001, [
    'coreEvent',
    'reaction',
    'naturalEnding',
    'causeOrTrigger',
    'minimumContext',
    'removableContext'
  ]);
  assertions += 5;

  for (const job of JOBS) {
    assertCandidateVideoUnderstandingJobV001(job);
    assertCandidateVideoProviderInputV001(job.providerInput);
    const bytes = serializeCandidateVideoUnderstandingJobV001(job);
    assert.deepEqual(decodeCandidateVideoUnderstandingJobV001(bytes), job);
    assert.equal(bytes.at(-1), 10);
    await verifyCandidateVideoUnderstandingJobFilesV001(job, WORKSPACE_ROOT);
    assertions += 5;
  }

  for (const job of JOBS) {
    await verifyClosedSourceMappingProvenanceV001(job, WORKSPACE_ROOT);
    assertions += 1;
  }

  const semanticBytes = await readFile(`${WORKSPACE_ROOT}/${SEMANTIC_PATH}`);
  const speechBoundaries = extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001(
    semanticBytes,
    JOBS[0].localBindings.semanticUtterance
  );
  const resolvedComparisonFixtures = await Promise.all(
    COMPARISON_WINDOW_FIXTURES.map(async (fixture) => {
      const job = JOBS.find((item) => item.localCandidateId === fixture.localCandidateId);
      if (!job) throw new Error(`${fixture.localCandidateId} job missing`);
      const candidateBytes = await readFile(`${WORKSPACE_ROOT}/${job.localBindings.candidate.path}`);
      const extractedPoints = extractCandidateVideoCandidatePointsV001(
        candidateBytes,
        job.localBindings.candidate,
        job.localCandidateId,
        speechBoundaries
      );
      assert.deepEqual(
        extractedPoints.map((point) => point.sourceTimeMs),
        fixture.points.map((point) => point.sourceTimeMs),
        `${fixture.id}の候補地点が正式候補responseの先頭意味発話と一致しない`
      );
      return {
        ...fixture,
        points: fixture.points.map((point, index) => ({
          ...point,
          sourceTimeMs: extractedPoints[index].sourceTimeMs
        }))
      };
    })
  );
  const candidateResponseBytesByOpaqueItemId = Object.fromEntries(
    await Promise.all(JOBS.map(async (job) => [
      job.experimentItem.opaqueItemId,
      await readFile(`${WORKSPACE_ROOT}/${job.localBindings.candidate.path}`)
    ]))
  );
  const jobBytesBeforeComparisonExperimentPlanV002 = JOBS.map((job) =>
    serializeCandidateVideoUnderstandingJobV001(job));
  const comparisonExperimentPlanV002 = buildCandidateVideoComparisonExperimentPlanV002(
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.deepEqual(
    JOBS.map((job) => serializeCandidateVideoUnderstandingJobV001(job)),
    jobBytesBeforeComparisonExperimentPlanV002
  );
  assertCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.equal(
    comparisonExperimentPlanV002.schemaVersion,
    CANDIDATE_VIDEO_COMPARISON_EXPERIMENT_PLAN_SCHEMA_V002
  );
  assert.equal(comparisonExperimentPlanV002.status, 'calibration-plan-only-not-execution-ready');
  assert.equal(comparisonExperimentPlanV002.providerVisibility, 'local-only-never-provider-input');
  assert.equal(comparisonExperimentPlanV002.cohortPolicy.formalPerformanceEvidence, false);
  assert.equal(comparisonExperimentPlanV002.cohortPolicy.adoptionDecisionPermitted, false);
  assert.deepEqual(
    comparisonExperimentPlanV002.items.map((item) => item.localCandidateId),
    [
      'camera-fear-escalation',
      'medicine-effect-payoff',
      'candidate-doctor-disappearance-to-ogre-mother',
      'candidate-horror-claim-to-speed-up',
      'candidate-horror-game-to-screams-001'
    ]
  );
  assert.deepEqual(comparisonExperimentPlanV002.totals, {
    durationBasis: 'sum-of-selected-source-intervals-before-media-generation',
    calibrationItems: 5,
    truthEligibleItems: 4,
    truthExcludedItems: 1,
    truthEligibleLoci: 8,
    freeHumanBaselineRawDurationMs: 320000,
    freeHumanBaselineSnappedDurationMs: 413837,
    geminiExplorationRawDurationMs: 502580,
    geminiExplorationSnappedDurationMs: 543592
  });
  assert.deepEqual(comparisonExperimentPlanV002.humanFirstReviewPolicy.initialRoles, [
    'coreEvent', 'reaction', 'naturalEnding'
  ]);
  assert.deepEqual(
    comparisonExperimentPlanV002.humanFirstReviewPolicy
      .initiallyHeldBackRoles,
    ['causeOrTrigger', 'minimumContext']
  );
  assert.deepEqual(comparisonExperimentPlanV002.futureValidation.frozenBeforeFirstProviderExecution, [
    'free-human-baseline-window',
    'gemini-exploration-window',
    'prompt',
    'response-schema',
    'model',
    'processing',
    'thinking-level',
    'frames-per-second',
    'media-resolution',
    'response-mime-type',
    'visible-output-token-limit',
    'video-transport',
    'comparison-metrics'
  ]);
  assert.deepEqual(comparisonExperimentPlanV002.providerConfigurationToFreeze, {
    promptSha256: JOBS[0].providerInput.prompt.sha256,
    responseSchemaCanonicalSha256: JOBS[0].providerInput.responseSchema.canonicalSha256,
    model: 'gemini-3.8-flash',
    processing: 'static',
    thinkingLevel: 'medium',
    framesPerSecond: 1,
    mediaResolution: 'high',
    responseMimeType: 'application/json',
    maxVisibleOutputTokens: 4096,
    videoTransport: 'files-api'
  });
  assert.deepEqual(comparisonExperimentPlanV002.calibrationChecks, [
    'role-output-corresponds-to-media',
    'compact-core-reaction-and-natural-ending',
    'required-moments-retained-for-truth-eligible-items',
    'human-review-duration-reduction-against-free-baseline',
    'visual-cautions-observed',
    'insufficient-evidence-used-appropriately',
    'safe-pts-source-projection'
  ]);
  assert.deepEqual(comparisonExperimentPlanV002.items[4].operationalScope, {
    includedInFreeBaselineDuration: true,
    includedInGeminiOperation: true,
    includedInBehaviorObservation: true
  });
  assert.deepEqual(comparisonExperimentPlanV002.comparisonMetricDefinitions, {
    roleObservationCorrespondence: 'compare-with-observed-media',
    requiredMomentContainment: 'truth-eligible-items-only',
    initialHumanReviewDuration:
      'exact-source-interval-union-compared-with-free-human-baseline',
    visualCautions: 'compare-with-observed-media',
    insufficientEvidence: 'compare-with-observed-media-and-missing-material',
    sourceProjection: 'mapped-pts-only-with-unmapped-pts-reported-without-invention',
    boundaryDifferences:
      'record-first-four-start-and-end-differences-only-never-success-criterion'
  });
  assert.equal(
    comparisonExperimentPlanV002.humanFirstReviewPolicy
      .additionalPresentationAfterHumanReportsInsufficientContext,
    'future-candidate-not-implemented'
  );
  assert.equal(
    comparisonExperimentPlanV002.futureValidation.unusedCandidateDefinition,
    'not-used-for-calibration-protocol-design-or-prior-provider-observation'
  );
  assert.equal(
    comparisonExperimentPlanV002.futureValidation.humanTruthAccess,
    'only-after-all-cohort-raw-provider-response-shas-and-canonical-result-shas-are-fixed'
  );
  assertions += 19;

  let truthEligibleCandidatesCoveredByBothWindows = 0;
  let truthEligibleLociCoveredByBothWindows = 0;
  for (const item of comparisonExperimentPlanV002.items) {
    const fixture = resolvedComparisonFixtures.find((candidate) =>
      candidate.localCandidateId === item.localCandidateId);
    if (!fixture) throw new Error(`${item.localCandidateId} v002 fixture missing`);
    assert.deepEqual(
      item.freeHumanBaselineWindows.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expectedFreeBaseline,
      `${fixture.id}の無料±16秒外向きsnapが一致しない`
    );
    assert.deepEqual(
      item.geminiExplorationWindows.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expected,
      `${fixture.id}のGemini較正探索窓が一致しない`
    );
    assert.equal(
      item.durations.freeHumanBaselineMs,
      item.freeHumanBaselineWindows.reduce(
        (sum, window) => sum + window.endTimeMs - window.startTimeMs,
        0
      )
    );
    assert.equal(
      item.durations.geminiExplorationMs,
      item.geminiExplorationWindows.reduce(
        (sum, window) => sum + window.endTimeMs - window.startTimeMs,
        0
      )
    );
    assertions += 4;
    if (fixture.human === null) {
      assert.equal(
        item.truthRequiredMetrics.eligibility,
        'excluded-human-approved-required-intervals-unavailable'
      );
      assert.equal(item.truthRequiredMetrics.requiredMomentCandidateDenominatorContribution, 0);
      assert.equal(item.truthRequiredMetrics.requiredMomentLocusDenominatorContribution, 0);
      assert.equal(
        item.truthRequiredMetrics.boundaryDifferenceRecordEligibility,
        'excluded-no-human-approved-truth'
      );
      assertions += 4;
      continue;
    }
    assert.equal(
      item.truthRequiredMetrics.eligibility,
      'eligible-human-approved-required-intervals-exist'
    );
    assert.equal(
      item.truthRequiredMetrics.boundaryDifferenceRecordEligibility,
      'eligible-record-only-not-success-criterion'
    );
    let candidateCovered = true;
    for (const [index, humanInterval] of fixture.human.entries()) {
      const freeWindow = item.freeHumanBaselineWindows[index];
      const geminiWindow = item.geminiExplorationWindows[index];
      const freeCovered = freeWindow.startTimeMs <= humanInterval.startTimeMs
        && freeWindow.endTimeMs >= humanInterval.endTimeMs;
      const geminiCovered = geminiWindow.startTimeMs <= humanInterval.startTimeMs
        && geminiWindow.endTimeMs >= humanInterval.endTimeMs;
      assert.equal(freeCovered, true, `${fixture.id}の無料窓が既知必須地点を包含しない`);
      assert.equal(geminiCovered, true, `${fixture.id}のGemini窓が既知必須地点を包含しない`);
      candidateCovered = candidateCovered && freeCovered && geminiCovered;
      truthEligibleLociCoveredByBothWindows += Number(freeCovered && geminiCovered);
      assertions += 2;
    }
    truthEligibleCandidatesCoveredByBothWindows += Number(candidateCovered);
    assertions += 2;
  }
  assert.equal(truthEligibleCandidatesCoveredByBothWindows, 4);
  assert.equal(truthEligibleLociCoveredByBothWindows, 8);
  assert.equal(
    comparisonExperimentPlanV002.items.some((item) =>
      JSON.stringify(item.freeHumanBaselineWindows)
        !== JSON.stringify(item.geminiExplorationWindows)),
    true
  );
  assert.equal(
    comparisonExperimentPlanV002.items.flatMap((item) =>
      item.freeHumanBaselineWindows.map((window, index) =>
        window.endTimeMs > item.geminiExplorationWindows[index].endTimeMs))
      .filter(Boolean).length,
    5
  );
  assert.equal(
    comparisonExperimentPlanV002.comparisonObjective.approvedMinimumReductionThreshold,
    'not-defined-do-not-invent'
  );
  assert.deepEqual(
    [
      comparisonExperimentPlanV002.futureArtifactLayoutCandidate.successPathCount,
      comparisonExperimentPlanV002.futureArtifactLayoutCandidate.worstCasePathCount
    ],
    [37, 43]
  );
  assert.deepEqual(
    comparisonExperimentPlanV002.futureArtifactLayoutCandidate
      .independentlyVerifiableTransportFacts,
    [
      'exact-sent-payload-or-binding',
      'exact-returned-payload-or-binding',
      'communication-order',
      'communication-count',
      'http-status',
      'payload-sha256',
      'video-sha256',
      'failure-location'
    ]
  );
  assertions += 7;

  const comparisonExperimentPlanV002Bytes = serializeCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  const decodedComparisonExperimentPlanV002 = decodeCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002Bytes,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.deepEqual(decodedComparisonExperimentPlanV002, comparisonExperimentPlanV002);
  assert.deepEqual(
    serializeCandidateVideoComparisonExperimentPlanV002(
      decodedComparisonExperimentPlanV002,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    comparisonExperimentPlanV002Bytes
  );
  assert.equal(comparisonExperimentPlanV002Bytes.at(-1), 10);
  const serializedComparisonExperimentPlanV002 = comparisonExperimentPlanV002Bytes.toString('utf8');
  assert.equal(
    /humanReviewPath|humanReviewSha256|humanDisposition|humanReason|humanApprovedRequiredIntervals/u
      .test(serializedComparisonExperimentPlanV002),
    false
  );
  assert.equal(
    comparisonExperimentPlanV002.futureArtifactLayoutCandidate.uploadSessionUrlsStored,
    false
  );
  assert.equal(serializedComparisonExperimentPlanV002.includes('"explorationVideo"'), false);
  assert.equal(serializedComparisonExperimentPlanV002.includes('"sourceMappingProvenance"'), false);
  assertions += 7;

  const rejectComparisonExperimentPlanV002Mutation = (
    label: string,
    mutate: (value: CandidateVideoComparisonExperimentPlanV002) => void
  ): void => {
    const invalid = clone(comparisonExperimentPlanV002);
    mutate(invalid);
    expectContractFailure(
      () => assertCandidateVideoComparisonExperimentPlanV002(
        invalid,
        JOBS,
        candidateResponseBytesByOpaqueItemId,
        semanticBytes
      ),
      label
    );
    assertions += 1;
  };
  rejectComparisonExperimentPlanV002Mutation('v002 planをvalidation集合と偽装', (value) => {
    (value.cohortPolicy as unknown as {classification: string}).classification = 'validation';
  });
  rejectComparisonExperimentPlanV002Mutation('v002 planを正式性能証拠と偽装', (value) => {
    (value.cohortPolicy as unknown as {formalPerformanceEvidence: boolean})
      .formalPerformanceEvidence = true;
  });
  rejectComparisonExperimentPlanV002Mutation('v002 planで導入判断を許可', (value) => {
    (value.cohortPolicy as unknown as {adoptionDecisionPermitted: boolean})
      .adoptionDecisionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineを15秒へ変更', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {beforeCandidatePointMs: number})
      .beforeCandidatePointMs = 15000;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineを17秒へ変更', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {afterCandidatePointMs: number})
      .afterCandidatePointMs = 17000;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineの自動拡張を許可', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {automaticExpansionPermitted: boolean})
      .automaticExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索前方を1ms変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {beforeCandidatePointMs: number})
      .beforeCandidatePointMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索後方を1ms変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {afterCandidatePointMs: number})
      .afterCandidatePointMs -= 1;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索窓の自動拡張を許可', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {automaticExpansionPermitted: boolean})
      .automaticExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('結果後の救済拡張を許可', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {
      resultBasedRescueExpansionPermitted: boolean;
    }).resultBasedRescueExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('窓外不足をGemini失敗へ変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {
      outsideWindowFailureAttribution: string;
    }).outsideWindowFailureAttribution = 'video-understanding-failure';
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示へ原因を自動追加', (value) => {
    (value.humanFirstReviewPolicy.initialRoles as string[]).push('causeOrTrigger');
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示から自然な終端を削除', (value) => {
    value.humanFirstReviewPolicy.initialRoles.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示へpaddingを追加', (value) => {
    (value.humanFirstReviewPolicy as unknown as {intervalCombination: string})
      .intervalCombination = 'union-with-padding';
  });
  rejectComparisonExperimentPlanV002Mutation('人間確認の自動context拡張を許可', (value) => {
    (value.humanFirstReviewPolicy as unknown as {automaticContextExpansionPermitted: boolean})
      .automaticContextExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('5本目を人間正解必須指標へ混入', (value) => {
    (value.items[4].truthRequiredMetrics as unknown as {eligibility: string}).eligibility =
      'eligible-human-approved-required-intervals-exist';
  });
  rejectComparisonExperimentPlanV002Mutation('4本目と5本目の正解適格性を入れ替え', (value) => {
    const fourth = value.items[3].truthRequiredMetrics as unknown as {eligibility: string};
    const fifth = value.items[4].truthRequiredMetrics as unknown as {eligibility: string};
    fourth.eligibility = 'excluded-human-approved-required-intervals-unavailable';
    fifth.eligibility = 'eligible-human-approved-required-intervals-exist';
  });
  rejectComparisonExperimentPlanV002Mutation('validation凍結項目を欠落', (value) => {
    value.futureValidation.frozenBeforeFirstProviderExecution.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('人間正解を結果SHA固定前に開封', (value) => {
    (value.futureValidation as unknown as {humanTruthAccess: string}).humanTruthAccess =
      'before-provider-execution';
  });
  rejectComparisonExperimentPlanV002Mutation('未使用候補の定義を緩和', (value) => {
    (value.futureValidation as unknown as {unusedCandidateDefinition: string})
      .unusedCandidateDefinition = 'not-used-in-current-five-only';
  });
  rejectComparisonExperimentPlanV002Mutation('結果後のprotocol変更でもvalidationを維持', (value) => {
    (value.futureValidation as unknown as {
      anyPostResultProtocolChange: string;
    }).anyPostResultProtocolChange = 'keep-validation-classification';
  });
  rejectComparisonExperimentPlanV002Mutation('境界差を合否指標へ変更', (value) => {
    (value.comparisonMetricDefinitions as unknown as {boundaryDifferences: string})
      .boundaryDifferences = 'performance-pass-fail-threshold';
  });
  rejectComparisonExperimentPlanV002Mutation('無料提示合計を1ms変更', (value) => {
    (value.totals as unknown as {freeHumanBaselineSnappedDurationMs: number})
      .freeHumanBaselineSnappedDurationMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('候補地点を1ms変更', (value) => {
    value.items[0].candidatePoints[0].sourceTimeMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('候補response束縛SHAを変更', (value) => {
    value.items[0].candidateResponse.fileSha256 = '0'.repeat(64);
  });
  rejectComparisonExperimentPlanV002Mutation('元動画束縛SHAを変更', (value) => {
    value.sourceEvidence.sourceVideo.fileSha256 = '0'.repeat(64);
  });
  rejectComparisonExperimentPlanV002Mutation('意味発話束縛pathを変更', (value) => {
    value.sourceEvidence.semanticUtterance.path = 'fixtures/semantic-invented.json';
  });
  rejectComparisonExperimentPlanV002Mutation('無料snap時刻を1ms変更', (value) => {
    value.items[0].freeHumanBaselineWindows[0].startTimeMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('発話境界IDだけを変更', (value) => {
    value.items[0].freeHumanBaselineWindows[0].startBoundaryUtteranceId = 'utterance-invented';
  });
  rejectComparisonExperimentPlanV002Mutation('無料窓をGemini窓と同一化', (value) => {
    value.items[0].freeHumanBaselineWindows = clone(value.items[0].geminiExplorationWindows);
  });
  rejectComparisonExperimentPlanV002Mutation('item順序を交換', (value) => {
    [value.items[2], value.items[3]] = [value.items[3], value.items[2]];
  });
  rejectComparisonExperimentPlanV002Mutation('itemを欠落', (value) => {
    value.items.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('providerへ見せられるplanと偽装', (value) => {
    (value as unknown as {providerVisibility: string}).providerVisibility = 'provider-visible';
  });
  rejectComparisonExperimentPlanV002Mutation('人間正解区間fieldを混入', (value) => {
    (value.items[4] as unknown as Record<string, unknown>).humanApprovedRequiredIntervals = [];
  });
  rejectComparisonExperimentPlanV002Mutation('余分なroot fieldを混入', (value) => {
    (value as unknown as Record<string, unknown>).formalResult = null;
  });

  const selfConsistentSeventeenSecondBaseline = clone(
    comparisonExperimentPlanV002
  ) as unknown as {
    windowPolicies: {freeHumanBaseline: {
      beforeCandidatePointMs: number;
      afterCandidatePointMs: number;
    }};
    totals: {
      freeHumanBaselineRawDurationMs: number;
      freeHumanBaselineSnappedDurationMs: number;
    };
    items: Array<{
      localCandidateId: string;
      freeHumanBaselineWindows: CandidateVideoFixedWindowV001[];
      durations: {freeHumanBaselineMs: number};
    }>;
  };
  selfConsistentSeventeenSecondBaseline.windowPolicies.freeHumanBaseline
    .beforeCandidatePointMs = 17000;
  selfConsistentSeventeenSecondBaseline.windowPolicies.freeHumanBaseline
    .afterCandidatePointMs = 17000;
  let selfConsistentSeventeenSecondTotalMs = 0;
  for (const item of selfConsistentSeventeenSecondBaseline.items) {
    const fixture = resolvedComparisonFixtures.find((candidate) =>
      candidate.localCandidateId === item.localCandidateId);
    if (!fixture) throw new Error(`${item.localCandidateId} 17秒fixture missing`);
    item.freeHumanBaselineWindows = buildCandidateVideoComparisonWindowsV001(
      fixture.points,
      speechBoundaries,
      {
        beforeCandidatePointMs: 17000,
        afterCandidatePointMs: 17000,
        startBoundarySelection: 'utterance-start-at-or-before',
        endBoundarySelection: 'utterance-end-at-or-after',
        derivation: 'empirical-maxima-from-human-required-intervals'
      }
    ).freeFixedWindow;
    item.durations.freeHumanBaselineMs = item.freeHumanBaselineWindows.reduce(
      (sum, window) => sum + window.endTimeMs - window.startTimeMs,
      0
    );
    selfConsistentSeventeenSecondTotalMs += item.durations.freeHumanBaselineMs;
  }
  selfConsistentSeventeenSecondBaseline.totals.freeHumanBaselineRawDurationMs = 340000;
  selfConsistentSeventeenSecondBaseline.totals.freeHumanBaselineSnappedDurationMs =
    selfConsistentSeventeenSecondTotalMs;
  expectContractFailure(
    () => assertCandidateVideoComparisonExperimentPlanV002(
      selfConsistentSeventeenSecondBaseline,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    '設定・窓・合計が自己整合しても未承認の17秒baselineを拒否'
  );
  assertions += 1;

  const v001BytesPresentedAsV002 = canonicalJsonBytesV001({
    schemaVersion: 'candidate-video-comparison-window-plan-v001'
  });
  expectContractFailure(
    () => decodeCandidateVideoComparisonExperimentPlanV002(
      v001BytesPresentedAsV002,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    'v001 comparison planをv002へfallbackしない'
  );
  expectContractFailure(
    () => decodeCandidateVideoComparisonExperimentPlanV002(
      Buffer.from(JSON.stringify(comparisonExperimentPlanV002), 'utf8'),
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    '非canonical v002 byteを拒否'
  );
  const tamperedCandidateResponseBytes = {...candidateResponseBytesByOpaqueItemId};
  tamperedCandidateResponseBytes['item-0001'] = Buffer.from('tampered-candidate-response', 'utf8');
  expectContractFailure(
    () => buildCandidateVideoComparisonExperimentPlanV002(
      JOBS,
      tamperedCandidateResponseBytes,
      semanticBytes
    ),
    '候補response実体SHA不一致を拒否'
  );
  expectContractFailure(
    () => buildCandidateVideoComparisonExperimentPlanV002(
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      Buffer.from('tampered-semantic-artifact', 'utf8')
    ),
    '意味発話artifact実体SHA不一致を拒否'
  );
  const providerInputWithLocalPlan = clone(JOBS[0].providerInput) as unknown as
    Record<string, unknown>;
  providerInputWithLocalPlan.comparisonExperimentPlan = comparisonExperimentPlanV002;
  expectContractFailure(
    () => assertCandidateVideoProviderInputV001(providerInputWithLocalPlan),
    'local-only v002 planをprovider inputへ混入'
  );
  assertions += 5;

  const calibrationFixtures = resolvedComparisonFixtures.filter((fixture) =>
    fixture.human !== null);
  const empiricalWindowSettings = deriveCandidateVideoFixedWindowSettingsV001(
    calibrationFixtures.flatMap((fixture) => [...fixture.points]),
    calibrationFixtures.flatMap((fixture) => fixture.human === null ? [] : [...fixture.human])
  );
  assert.deepEqual(empiricalWindowSettings, {
    beforeCandidatePointMs: 34880,
    afterCandidatePointMs: 15378,
    startBoundarySelection: 'utterance-start-at-or-before',
    endBoundarySelection: 'utterance-end-at-or-after',
    derivation: 'empirical-maxima-from-human-required-intervals'
  });
  assertions += 2;

  let snappedComparisonDurationMs = 0;
  const comparisonContractFixtures: Array<{
    job: CandidateVideoUnderstandingJobV001;
    plan: CandidateVideoComparisonWindowPlanV001;
    candidateBytes: Buffer;
  }> = [];
  for (const fixture of resolvedComparisonFixtures) {
    const comparison = buildCandidateVideoComparisonWindowsV001(
      fixture.points,
      speechBoundaries,
      empiricalWindowSettings
    );
    assert.deepEqual(
      comparison.freeFixedWindow.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expected,
      `${fixture.id}の外向き発話境界snapが実測fixtureと一致しない`
    );
    assert.deepEqual(comparison.geminiExplorationWindow, comparison.freeFixedWindow);
    assert.equal(comparison.answerPlacement.randomSeed, null);
    if (fixture.human !== null) {
      assertCandidateVideoHumanAnswersOffCenterV001(comparison, fixture.human);
      assertions += 1;
    }
    snappedComparisonDurationMs += comparison.freeFixedWindow.reduce(
      (total, window) => total + window.endTimeMs - window.startTimeMs,
      0
    );
    const baseJob = JOBS.find((item) => item.localCandidateId === fixture.localCandidateId);
    if (!baseJob) throw new Error(`${fixture.localCandidateId} base job missing`);
    const candidateBytes = await readFile(`${WORKSPACE_ROOT}/${baseJob.localBindings.candidate.path}`);
    const comparisonContract = buildComparisonContractFixture(
      baseJob,
      fixture.points,
      comparison,
      empiricalWindowSettings
    );
    assertCandidateVideoComparisonWindowPlanV001(
      comparisonContract.plan,
      comparisonContract.job,
      candidateBytes,
      semanticBytes
    );
    const executionArtifacts = JSON.stringify(comparisonContract);
    assert.equal(/answerReference|humanRequiredIntervals|humanReviewPath|humanReviewSha256/u
      .test(executionArtifacts), false);
    comparisonContractFixtures.push({...comparisonContract, candidateBytes});
    assertions += 5;
  }
  assert.equal(
    empiricalWindowSettings.beforeCandidatePointMs
      + empiricalWindowSettings.afterCandidatePointMs,
    50258
  );
  assert.equal(snappedComparisonDurationMs, 543592);
  assert.equal(comparisonContractFixtures.length, 5);
  assertions += 3;

  const firstComparisonContract = comparisonContractFixtures[0];
  const firstPlanWrongSha = clone(firstComparisonContract.plan);
  firstPlanWrongSha.fixedWindowSettings.beforeCandidatePointMs += 1;
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongSha,
      firstComparisonContract.job,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    'window plan byteをjob SHAから変更'
  );
  const firstPlanWrongPoint = clone(firstComparisonContract.plan);
  firstPlanWrongPoint.candidatePoints[0].sourceTimeMs += 1;
  const firstJobBoundToWrongPoint = clone(firstComparisonContract.job);
  if (firstJobBoundToWrongPoint.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToWrongPoint.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWrongPoint));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongPoint,
      firstJobBoundToWrongPoint,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    'window plan候補地点を正式候補responseから変更'
  );
  const firstPlanWrongWindow = clone(firstComparisonContract.plan);
  firstPlanWrongWindow.freeFixedWindows[0].startTimeMs += 1;
  const firstJobBoundToWrongWindow = clone(firstComparisonContract.job);
  if (firstJobBoundToWrongWindow.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToWrongWindow.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWrongWindow));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongWindow,
      firstJobBoundToWrongWindow,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '無料固定窓だけをGemini窓から変更'
  );
  const firstJobWrongMappingSelection = clone(firstComparisonContract.job);
  if (firstJobWrongMappingSelection.sourceMapping.status !== 'closed') {
    throw new Error('comparison fixture mapping must be closed');
  }
  firstJobWrongMappingSelection.sourceMapping.segments[0].sourceSelectionStartMs += 1;
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstComparisonContract.plan,
      firstJobWrongMappingSelection,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '正式mappingの選択区間を共通窓から変更'
  );
  const firstPlanWithHumanReference = clone(firstComparisonContract.plan) as unknown as
    Record<string, unknown>;
  firstPlanWithHumanReference.answerReference = {
    status: 'human-required-intervals-available-and-off-center',
    humanRequiredIntervals: [{startTimeMs: 1, endTimeMs: 2}]
  };
  const firstJobBoundToHumanReference = clone(firstComparisonContract.job);
  if (firstJobBoundToHumanReference.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToHumanReference.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWithHumanReference));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWithHumanReference,
      firstJobBoundToHumanReference,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '実行window planへ人間正解を混入'
  );
  const firstPlanWithHumanBinding = clone(firstComparisonContract.plan);
  firstPlanWithHumanBinding.bindings.candidateResponse = {
    path: 'fixtures/human-review-result-v002.json',
    schemaVersion: 'human-review-result-v002',
    fileSha256: 'f'.repeat(64)
  };
  const firstJobBoundToHumanBinding = clone(firstComparisonContract.job);
  if (firstJobBoundToHumanBinding.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToHumanBinding.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWithHumanBinding));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWithHumanBinding,
      firstJobBoundToHumanBinding,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '実行window plan bindingへ人間評価artifactを混入'
  );
  const fifthComparisonContract = comparisonContractFixtures[4];
  const fifthPlanWithInventedTruth = clone(fifthComparisonContract.plan) as unknown as
    Record<string, unknown>;
  fifthPlanWithInventedTruth.humanRequiredIntervals = [];
  const fifthJobBoundToInventedTruth = clone(fifthComparisonContract.job);
  if (fifthJobBoundToInventedTruth.comparisonInput.status !== 'resolved') {
    throw new Error('fifth comparison fixture must be resolved');
  }
  fifthJobBoundToInventedTruth.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(fifthPlanWithInventedTruth));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      fifthPlanWithInventedTruth,
      fifthJobBoundToInventedTruth,
      fifthComparisonContract.candidateBytes,
      semanticBytes
    ),
    '5本目の存在しない正解区間を実行planへ捏造'
  );
  assertions += 7;

  for (const job of JOBS) {
    expectContractFailure(
      () => assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job),
      'preflight未完了jobは実行不能'
    );
    assertions += 1;
  }

  const crossing = projectCandidateIntervalToSourceV001(JOBS[0], {
    startTimeMs: 6900,
    endTimeMs: 7100
  });
  assert.equal(crossing.sourceIntervals.length, 2);
  assert.deepEqual(crossing.sourceIntervals[0].sourceEndTimeMs, {numerator: 671316, denominator: 1});
  assert.deepEqual(crossing.sourceIntervals[1].sourceStartTimeMs, {numerator: 1377918, denominator: 1});
  assert.equal(crossing.unmappedCandidateIntervals.length, 0);
  assertions += 4;

  CLOSED_FIXTURES.forEach((fixture, index) => {
    const interval = {
      startTimeMs: 100,
      endTimeMs: Math.floor(fixture.frameCount * 1000 / fixture.frameRate) - 100
    };
    const ptsProjection = projectCandidateIntervalToSourceV001(JOBS[index], interval);
    assert.equal(ptsProjection.unmappedCandidateIntervals.length, 0);
    assert.deepEqual(
      ptsProjection.sourceIntervals.map(({overlappingSemanticUtteranceIds: _ignored, ...rest}) => rest),
      legacySourceProjection(fixture, interval),
      `${fixture.localCandidateId}のPTS-based投影が従来投影と一致しない`
    );
    assertions += 2;
  });

  const gapOnly = projectCandidateIntervalToSourceV001(JOBS[4], {
    startTimeMs: 5951,
    endTimeMs: 5966
  });
  assert.equal(gapOnly.sourceIntervals.length, 0);
  assert.equal(gapOnly.unmappedCandidateIntervals.length, 1);
  assert.deepEqual(gapOnly.unmappedCandidateIntervals[0], {
    candidateStartTimeMs: {numerator: 5951, denominator: 1},
    candidateEndTimeMs: {numerator: 5966, denominator: 1},
    reason: 'no-candidate-frame'
  });
  const crossingGap = projectCandidateIntervalToSourceV001(JOBS[4], {
    startTimeMs: 5940,
    endTimeMs: 5980
  });
  assert.equal(crossingGap.sourceIntervals.length, 2);
  assert.equal(crossingGap.unmappedCandidateIntervals.length, 1);
  assert.deepEqual(crossingGap.sourceIntervals[0].candidateEndTimeMs, {
    numerator: 5950,
    denominator: 1
  });
  assert.deepEqual(crossingGap.unmappedCandidateIntervals[0], {
    candidateStartTimeMs: {numerator: 5950, denominator: 1},
    candidateEndTimeMs: {numerator: 17900, denominator: 3},
    reason: 'no-candidate-frame'
  });
  assert.deepEqual(crossingGap.sourceIntervals[1].candidateStartTimeMs, {
    numerator: 17900,
    denominator: 3
  });
  assertions += 8;

  const gapAssignedToFirst = clone(JOBS[4]);
  if (gapAssignedToFirst.sourceMapping.status !== 'closed') throw new Error('fixture must be closed');
  gapAssignedToFirst.sourceMapping.segments[0].candidateEndPtsExclusive = 91648;
  gapAssignedToFirst.sourceMapping.unmappedCandidatePts = [];
  await assert.rejects(
    verifyClosedSourceMappingProvenanceV001(gapAssignedToFirst, WORKSPACE_ROOT),
    {name: 'CandidateVideoUnderstandingContractErrorV001'}
  );
  assertions += 1;

  const output = validProviderOutput();
  assertCandidateVideoUnderstandingProviderOutputV001(output, JOBS[0]);
  const firstReview = deriveCandidateVideoFirstHumanReviewV001(output, JOBS[0]);
  assert.equal(firstReview.status, 'ready');
  if (firstReview.status !== 'ready') throw new Error('first review fixture must be ready');
  assert.deepEqual(firstReview.candidateIntervals.map((interval) => [
    interval.startTimeMs,
    interval.endTimeMs
  ]), [[6900, 10000]]);
  assert.equal(firstReview.totalDurationMs, 3100);
  assert.deepEqual(firstReview.heldBackContextRoles, ['causeOrTrigger', 'minimumContext']);
  assertions += 4;

  const everyRoleAbsent = clone(output);
  everyRoleAbsent.roleObservations.forEach((role) => {
    role.status = 'notObserved';
    role.intervals = [];
    role.factualDescription = `${role.role}は候補動画内で確認できない。`;
  });
  everyRoleAbsent.insufficientEvidence = {
    present: true,
    missingEvidence: [...CANDIDATE_VIDEO_ROLE_VALUES_V001],
    factualDescription: '6役割すべての観測材料が不足している。'
  };
  assertCandidateVideoUnderstandingProviderOutputV001(everyRoleAbsent, JOBS[0]);
  const absentFirstReview = deriveCandidateVideoFirstHumanReviewV001(everyRoleAbsent, JOBS[0]);
  assert.deepEqual(absentFirstReview, {
    status: 'required-role-not-observed',
    missingRoles: ['coreEvent', 'reaction', 'naturalEnding'],
    candidateIntervals: [],
    totalDurationMs: 0
  });
  assertions += 2;

  const resultReadyJob = readyResultContractJobFixture();
  const result = validResult(resultReadyJob);
  assertCandidateVideoUnderstandingResultV001(result, resultReadyJob);
  const resultBytes = serializeCandidateVideoUnderstandingResultV001(result, resultReadyJob);
  assert.deepEqual(
    decodeCandidateVideoUnderstandingResultV001(resultBytes, resultReadyJob),
    result
  );
  assertions += 3;

  const failedResult = clone(result) as unknown as Record<string, unknown>;
  (failedResult.execution as Record<string, unknown>).httpStatus = 503;
  (failedResult.execution as Record<string, unknown>).completionStatus = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).status = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).violations = ['provider request failed'];
  failedResult.providerOutput = null;
  failedResult.projectedRoleIntervals = [];
  failedResult.projectedVisualCautions = [];
  assertCandidateVideoUnderstandingResultV001(failedResult);
  const completedButInvalid = clone(failedResult) as Record<string, unknown>;
  (completedButInvalid.execution as Record<string, unknown>).httpStatus = 200;
  (completedButInvalid.execution as Record<string, unknown>).completionStatus = 'completed';
  (completedButInvalid.structuredValidation as Record<string, unknown>).violations = [
    'structured output schema violation'
  ];
  assertCandidateVideoUnderstandingResultV001(completedButInvalid);
  assertions += 2;

  const forbiddenProviderInputs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['human review path', (value) => { value.humanReviewPath = 'reviews/human-review.json'; }],
    ['human review SHA', (value) => { value.humanReviewSha256 = 'a'.repeat(64); }],
    ['verdict', (value) => { value.verdict = 'approved'; }],
    ['human reason', (value) => { value.humanReason = '人間が良いと判断した'; }],
    ['correct interval', (value) => { value.correctInterval = {startTimeMs: 1, endTimeMs: 2}; }],
    ['descriptive candidate ID', (value) => { value.itemId = 'camera-fear-escalation'; }],
    ['descriptive filename', (value) => {
      (value.file as Record<string, unknown>).displayName = 'camera-fear-escalation.mp4';
    }]
  ];
  for (const [label, mutate] of forbiddenProviderInputs) {
    const contaminated = clone(JOBS[0].providerInput) as unknown as Record<string, unknown>;
    mutate(contaminated);
    expectContractFailure(() => assertCandidateVideoProviderInputV001(contaminated), label);
    assertions += 1;
  }
  const contaminatedPrompt = clone(JOBS[0].providerInput) as unknown as Record<string, unknown>;
  (contaminatedPrompt.prompt as Record<string, unknown>).utf8 = '人間はこの候補を不採用にした。';
  expectContractFailure(() => assertCandidateVideoProviderInputV001(contaminatedPrompt), '人間理由をpromptへ混入');
  assertions += 1;

  const uploadedFileUri = 'https://generativelanguage.googleapis.com/v1beta/files/opaque0001';
  const sdkParameters = buildCandidateVideoStaticGenerateContentSdkParametersV001(
    JOBS[0],
    uploadedFileUri
  );
  const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    JOBS[0],
    uploadedFileUri
  );
  assertCandidateVideoStaticGenerateContentWireRequestV001(exactRequest, JOBS[0]);
  const staticContents = sdkParameters.contents as Array<Record<string, unknown>>;
  const staticParts = staticContents[0].parts as Array<Record<string, unknown>>;
  const staticConfig = sdkParameters.config as unknown as Record<string, unknown>;
  assert.deepEqual(staticParts[0].videoMetadata, {fps: 1});
  assert.deepEqual(staticParts[0].mediaResolution, {level: 'MEDIA_RESOLUTION_HIGH'});
  assert.deepEqual(staticConfig.thinkingConfig, {thinkingLevel: 'MEDIUM'});
  assert.equal('httpOptions' in staticConfig, false);
  assert.equal('tools' in staticConfig, false);
  assert.deepEqual(exactRequest.body.contents, sdkParameters.contents);
  assert.deepEqual(exactRequest.body.generationConfig, staticConfig);
  const uploadPlan = buildCandidateVideoLocalUploadPlanV001(JOBS[0]);
  assert.equal(uploadPlan.providerMetadata.displayName, 'item-0001.mp4');
  assert.equal(uploadPlan.providerMetadata.uploadFileNameHeader, 'item-0001.mp4');
  assert.notEqual(
    uploadPlan.localByteSourcePath.split('/').at(-1),
    uploadPlan.providerMetadata.uploadFileNameHeader
  );
  const humanReference = {
    jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(JOBS[0])),
    localCandidateId: JOBS[0].localCandidateId,
    humanReviewPath:
      'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json',
    humanReviewSha256: 'fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92',
    humanDisposition: 'human-accepted',
    humanReason: '恐怖映像と反応を含めて成立すると人間が判断した。',
    correctIntervals: [
      {startTimeMs: 664354, endTimeMs: 671316},
      {startTimeMs: 1377918, endTimeMs: 1426649}
    ],
    candidatePointsMs: [664354, 1412798],
    descriptiveCandidateIds: ['camera-fear-escalation'],
    descriptiveFilenames: ['presentation-rendered-v002.mp4']
  };
  assertCandidateVideoProviderBlindnessV001(
    JOBS[0],
    exactRequest,
    uploadPlan,
    humanReference
  );
  assertions += 10;

  const fifthHumanReference = {
    jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(JOBS[4])),
    localCandidateId: JOBS[4].localCandidateId,
    humanReviewPath:
      'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-human-review-result-v001.json',
    humanReviewSha256: '24ec180fcba4d88cc17afd20a2fcb189da104c99e80e1388595e2a5ae0d4780e',
    humanDisposition: 'human-rejected-candidate-discovery-failure',
    humanReason: '候補自体が必要区間として承認されていない。',
    correctIntervals: [],
    candidatePointsMs: [249378, 6134433],
    descriptiveCandidateIds: ['candidate-horror-game-to-screams-001'],
    descriptiveFilenames: ['candidate-review-v001.mp4']
  };
  assertCandidateVideoProviderBlindnessV001(
    JOBS[4],
    buildCandidateVideoStaticGenerateContentWireRequestV001(JOBS[4], uploadedFileUri),
    buildCandidateVideoLocalUploadPlanV001(JOBS[4]),
    fifthHumanReference
  );
  const descriptiveUriRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    JOBS[0],
    'https://generativelanguage.googleapis.com/v1beta/files/camera-fear-escalation'
  );
  expectContractFailure(
    () => assertCandidateVideoProviderBlindnessV001(
      JOBS[0],
      descriptiveUriRequest,
      uploadPlan,
      humanReference
    ),
    'Files API URIの説明的resource nameをprovider入力へ混入'
  );
  assertions += 2;

  const requestWithCandidatePoint = clone(exactRequest) as unknown as Record<string, unknown>;
  const requestBody = requestWithCandidatePoint.body as Record<string, unknown>;
  const requestContents = requestBody.contents as Array<Record<string, unknown>>;
  (requestContents[0].parts as Array<Record<string, unknown>>).push({text: 'candidate point 664354'});
  expectContractFailure(
    () => assertCandidateVideoProviderBlindnessV001(
      JOBS[0],
      requestWithCandidatePoint as never,
      uploadPlan,
      humanReference
    ),
    '候補地点をprovider requestへ混入'
  );
  assertions += 1;

  const {providerInput: _providerInput, providerInputCanonicalSha256: _providerSha, ...jobWithoutProvider} = JOBS[0];
  const nestedSensitiveValues = [
    humanReference.humanReviewPath,
    humanReference.humanReviewSha256,
    humanReference.humanDisposition,
    humanReference.humanReason,
    String(humanReference.correctIntervals[0].startTimeMs),
    String(humanReference.correctIntervals[0].endTimeMs),
    String(humanReference.candidatePointsMs[0]),
    humanReference.descriptiveCandidateIds[0],
    humanReference.descriptiveFilenames[0]
  ];
  for (const [index, factualObservation] of nestedSensitiveValues.entries()) {
    const contextJob = buildCandidateVideoUnderstandingJobV001({
      ...jobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: 'fixtures/prior-result-v001.json',
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: '4'.repeat(64)
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation,
        factualObservationSha256: createHash('sha256')
          .update(factualObservation)
          .digest('hex')
      }
    });
    const contextRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
      contextJob,
      uploadedFileUri
    );
    expectContractFailure(
      () => assertCandidateVideoProviderBlindnessV001(
        contextJob,
        contextRequest,
        buildCandidateVideoLocalUploadPlanV001(contextJob),
        {
          ...humanReference,
          jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(contextJob)),
          localCandidateId: contextJob.localCandidateId
        }
      ),
      `referenceContext経由の人間情報混入 ${index}`
    );
    assertions += 1;
  }

  expectContractFailure(
    () => buildCandidateVideoUnderstandingJobV001({
      ...jobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: humanReference.humanReviewPath,
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: humanReference.humanReviewSha256
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: '映像上で出来事を確認した。',
        factualObservationSha256: createHash('sha256')
          .update('映像上で出来事を確認した。')
          .digest('hex')
      }
    }),
    '実行jobのreferenceContextへ人間評価artifactを偽装して混入'
  );
  const {
    providerInput: _comparisonProviderInput,
    providerInputCanonicalSha256: _comparisonProviderSha,
    ...comparisonJobWithoutProvider
  } = firstComparisonContract.job;
  expectContractFailure(
    () => buildCandidateVideoUnderstandingJobV001({
      ...comparisonJobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: 'fixtures/neutral-prior-result-v001.json',
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: '4'.repeat(64)
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: '将来用の観測文。',
        factualObservationSha256: sha256(Buffer.from('将来用の観測文。', 'utf8'))
      }
    }),
    '初回区間化比較へ将来用referenceContextを実接続'
  );
  assertions += 2;

  const communicationProposal: CandidateVideoCommunicationPlanV001 = {
    status: 'proposal-pending-kawafmm-approval',
    distinctVideoCount: 5,
    maximumLogicalFilesApiUploadCalls: 5,
    maximumFilesApiUploadHttpRequests: 10,
    maximumFilesApiMetadataGetCalls: 5,
    maximumCountTokensCalls: 5,
    maximumInferenceCalls: 5,
    maximumMetadataGetsPerFile: 1,
    automaticRetryCount: 0,
    metadataPolicy: 'one-get-after-upload-then-fail-closed-if-not-active',
    reproducibilityMeasurement: {
      status: 'not-adopted-for-initial-comparison',
      reason: 'single-repeat-does-not-measure-experiment-wide-nondeterminism'
    },
    filesUploadTransport: 'direct-rest-resumable-one-shot-proposal',
    filesUploadHttpAttemptControl: 'unresolved-before-api-execution',
    inferenceTransport: 'direct-rest-one-shot-proposal',
    inferenceHttpAttemptControl: 'unresolved-before-api-execution'
  };
  assertCandidateVideoCommunicationPlanV001(communicationProposal);
  expectContractFailure(
    () => assertCandidateVideoCommunicationPlanApprovedV001(communicationProposal),
    '未承認・upload retry未解決の通信計画は実行不能'
  );
  const approvedMockPlan: CandidateVideoCommunicationPlanV001 = {
    ...communicationProposal,
    status: 'approved',
    filesUploadHttpAttemptControl: 'two-http-requests-per-file-no-retry',
    inferenceHttpAttemptControl: 'one-http-request-per-inference-no-retry'
  };
  assertCandidateVideoCommunicationPlanApprovedV001(approvedMockPlan);
  const invalidRepeatPlan = clone(communicationProposal) as unknown as Record<string, unknown>;
  invalidRepeatPlan.maximumInferenceCalls = 6;
  expectContractFailure(
    () => assertCandidateVideoCommunicationPlanV001(invalidRepeatPlan),
    '初回比較へ6回目の再現性推論を混入'
  );
  const communicationGuard = createCandidateVideoCommunicationGuardV001(approvedMockPlan);
  for (const job of JOBS) {
    communicationGuard.record('files-upload-logical', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-upload-http', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-upload-http', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-metadata-get', job.experimentItem.opaqueItemId);
    communicationGuard.record('count-tokens', job.experimentItem.opaqueItemId);
  }
  expectContractFailure(
    () => communicationGuard.record('files-upload-http', JOBS[0].experimentItem.opaqueItemId),
    '1 file 2 HTTP uploadを超える送信を事前拒否'
  );
  assertions += 4;

  let mockRequestCaptures = 0;
  const mockFixture = await materializeReadyComparisonMockFixture(
    firstComparisonContract,
    semanticBytes
  );
  try {
    const mockHumanReference = {
      ...humanReference,
      jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(mockFixture.job))
    };
    const mockCapture = await exerciseCandidateVideoUnderstandingWithMockTransportV001(
      mockFixture.job,
      mockFixture.workspaceRoot,
      uploadedFileUri,
      mockHumanReference,
      {kind: 'in-memory-capture-only'}
    );
    assert.equal(mockCapture.kind, 'captured-without-network-or-callback');
    assert.deepEqual(mockCapture.request, mockFixture.exactRequest);
    assert.deepEqual(
      mockCapture.requestArtifactBytes,
      serializeCandidateVideoStaticGenerateContentWireRequestV001(
        mockFixture.exactRequest,
        mockFixture.job
      )
    );
    assert.deepEqual(
      JSON.parse(Buffer.from(mockCapture.bodyBytes).toString('utf8')),
      mockFixture.exactRequest.body
    );
    mockRequestCaptures += 1;

    const pendingComparisonJob = clone(mockFixture.job);
    pendingComparisonJob.preflight = clone(firstComparisonContract.job.preflight);
    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        pendingComparisonJob,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        {
          ...humanReference,
          jobCanonicalSha256: sha256(
            serializeCandidateVideoUnderstandingJobV001(pendingComparisonJob)
          )
        },
        {kind: 'in-memory-capture-only'}
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        mockFixture.job,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        mockHumanReference,
        {
          kind: 'in-memory-capture-only',
          captureExactHttpRequest: () => fetch('https://example.invalid')
        } as never
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    const proposalPlan = clone(mockFixture.plan);
    proposalPlan.fixedWindowSettingsApproval.status = 'proposal-pending-kawafmm-approval';
    const proposalPlanBytes = canonicalJsonBytesV001(proposalPlan);
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mockFixture.job.comparisonInput.status === 'resolved'
        ? mockFixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan.path
        : 'unreachable',
      proposalPlanBytes
    );
    const proposalJob = clone(mockFixture.job);
    if (proposalJob.comparisonInput.status !== 'resolved') {
      throw new Error('proposal mock fixture must be resolved');
    }
    proposalJob.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 = sha256(proposalPlanBytes);
    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        proposalJob,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        {
          ...humanReference,
          jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(proposalJob))
        },
        {kind: 'in-memory-capture-only'}
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    const mismatchedMappingArtifact = clone(mockFixture.mappingArtifact);
    const mismatchedMapping = mismatchedMappingArtifact.mapping as Record<string, unknown>;
    const mismatchedSegments = mismatchedMapping.segments as Array<Record<string, unknown>>;
    mismatchedSegments[0].sourceStartPts = (mismatchedSegments[0].sourceStartPts as number) + 1;
    const mismatchedMappingBytes = canonicalJsonBytesV001(mismatchedMappingArtifact);
    const mappingPath = mockFixture.job.sourceMapping.provenance.path;
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mappingPath,
      mismatchedMappingBytes
    );
    const mismatchedMappingJob = clone(mockFixture.job);
    if (mismatchedMappingJob.comparisonInput.status !== 'resolved') {
      throw new Error('mapping mismatch fixture must be resolved');
    }
    mismatchedMappingJob.sourceMapping.provenance.fileSha256 = sha256(mismatchedMappingBytes);
    const mismatchedMappingPlan = clone(mockFixture.plan);
    mismatchedMappingPlan.bindings.sourceMappingProvenance.fileSha256 =
      sha256(mismatchedMappingBytes);
    const mismatchedMappingPlanBytes = canonicalJsonBytesV001(mismatchedMappingPlan);
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mismatchedMappingJob.comparisonInput.sharedFreeAndGeminiWindowPlan.path,
      mismatchedMappingPlanBytes
    );
    mismatchedMappingJob.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
      sha256(mismatchedMappingPlanBytes);
    await assert.rejects(
      verifyCandidateVideoUnderstandingJobFilesV001(
        mismatchedMappingJob,
        mockFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );
    assertions += 8;
  } finally {
    await mockFixture.cleanup();
  }
  assert.equal(mockRequestCaptures, 1);
  for (const job of JOBS) {
    communicationGuard.record('inference', job.experimentItem.opaqueItemId);
  }
  assert.deepEqual(communicationGuard.snapshot(), {
    'files-upload-logical': 5,
    'files-upload-http': 10,
    'files-metadata-get': 5,
    'count-tokens': 5,
    inference: 5
  });
  expectContractFailure(
    () => communicationGuard.record('inference', JOBS[1].experimentItem.opaqueItemId),
    '6回目推論を送信前に拒否'
  );
  assertions += 5;

  const readyResultContractJob = readyResultContractJobFixture();
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001(readyResultContractJob);
  assertions += 1;

  const cameraHumanIntervals = COMPARISON_WINDOW_FIXTURES[0].human;
  if (cameraHumanIntervals === null) throw new Error('camera human intervals missing');
  const comparisonMeasurementFixture = await materializeReadyComparisonMockFixture(
    firstComparisonContract,
    semanticBytes
  );
  try {
    const humanComparison = await materializeAvailableHumanComparisonReferenceFixture(
      comparisonMeasurementFixture,
      cameraHumanIntervals,
      'selection-v002-accepted'
    );
    const comparisonContractJob = comparisonMeasurementFixture.job;
    if (comparisonContractJob.comparisonInput.status !== 'resolved') {
      throw new Error('comparison contract fixture must be resolved');
    }
    const comparisonWindowPlanBinding =
      comparisonContractJob.comparisonInput.sharedFreeAndGeminiWindowPlan;
    const comparisonJobBinding = {
      path: 'fixtures/comparison-job-v001.json',
      schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
      fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(comparisonContractJob))
    };
    const comparisonMeasurement = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: comparisonJobBinding,
      resultBinding: {
        path: 'fixtures/comparison-result-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
        fileSha256: '6'.repeat(64)
      },
      baselineBinding: comparisonWindowPlanBinding,
      humanComparisonReferenceBinding: humanComparison.binding,
      requiredMomentsContained: true,
      coreStartErrorMs: -120,
      reactionEndErrorMs: 80,
      geminiFirstReviewDurationMs: 3100,
      humanRequiredIntervalDurationMs: 55693,
      freeFixedWindowDurationMs: 105513,
      minimumContextNeeded: false,
      matchingVisualCautions: ['audioDependent'],
      nonMatchingVisualCautions: [],
      insufficientEvidenceReported: false,
      sourceProjectionSucceeded: true,
      unmappedCandidatePtsIntervalCount: 0,
      estimatedApiCostUsd: '0.012345',
      apiLatencyMs: 4321,
      pureHumanWatchTimeMs: 3100,
      geminiBeatsFreeBaseline: true,
      outcome: {
        providerExecutionStatus: 'succeeded',
        failureAttribution: null,
        humanDisposition: 'accepted',
        factualDescription: '技術成立後の人間採用であり、処理成功と人間採否を分離する。'
      }
    } as const;
    const preExecutionComparisonMeasurement = {
      ...comparisonMeasurement,
      resultBinding: null,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 105513,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: null,
        humanDisposition: 'accepted',
        factualDescription: 'API前には無料窓と既存人間事実だけを保持する。'
      }
    } as const;
    assertCandidateVideoComparisonMeasurementV001(
      preExecutionComparisonMeasurement,
      comparisonContractJob,
      humanComparison.verification
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        comparisonMeasurement,
        comparisonContractJob,
        humanComparison.verification
      ),
      '暫定cross-bindingだけの人間参照でAPI後の正式比較を確定'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...comparisonMeasurement,
        resultBinding: null,
        estimatedApiCostUsd: null,
        apiLatencyMs: null,
        outcome: {
          ...comparisonMeasurement.outcome,
          providerExecutionStatus: 'not-run'
        }
      }, comparisonContractJob, humanComparison.verification),
      'API未実行のままGemini結果由来値と無料baseline勝越を確定'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...preExecutionComparisonMeasurement,
        freeFixedWindowDurationMs: comparisonMeasurement.freeFixedWindowDurationMs - 1
      }, comparisonContractJob, humanComparison.verification),
      '無料固定窓尺を正式source選択区間合計から変更'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        preExecutionComparisonMeasurement,
        comparisonContractJob,
        clone(humanComparison.verification)
      ),
      'private検証履歴のないhuman evidence receiptを偽造'
    );
    const wrongLocusReference = clone(humanComparison.reference);
    const wrongLocusIntervals = wrongLocusReference.humanApprovedRequiredIntervals as Array<
      Record<string, unknown>
    >;
    wrongLocusIntervals[1].startTimeMs = cameraHumanIntervals[0].startTimeMs;
    wrongLocusIntervals[1].endTimeMs = cameraHumanIntervals[0].endTimeMs;
    const wrongLocusReferenceBytes = canonicalJsonBytesV001(wrongLocusReference);
    const wrongLocusBinding = {
      path: 'fixtures/wrong-locus-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(wrongLocusReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      comparisonMeasurementFixture.workspaceRoot,
      wrongLocusBinding.path,
      wrongLocusReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        wrongLocusBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '別locus内の区間を同じ位置へ差し替える攻撃を拒否'
    );
    const candidatePointExcludedReference = clone(humanComparison.reference);
    const candidatePointExcludedIntervals =
      candidatePointExcludedReference.humanApprovedRequiredIntervals as Array<
        Record<string, unknown>
      >;
    candidatePointExcludedIntervals[0].startTimeMs =
      cameraHumanIntervals[0].startTimeMs + 1;
    const candidatePointExcludedReferenceBytes = canonicalJsonBytesV001(
      candidatePointExcludedReference
    );
    const candidatePointExcludedBinding = {
      path: 'fixtures/candidate-point-excluded-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(candidatePointExcludedReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      comparisonMeasurementFixture.workspaceRoot,
      candidatePointExcludedBinding.path,
      candidatePointExcludedReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        candidatePointExcludedBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '同一窓内でも候補地点を含まない区間への人間正解差し替えを拒否'
    );
    const nonHumanSelectionReview = clone(humanComparison.humanReview);
    nonHumanSelectionReview.reviewer = 'not-kawafmm';
    const nonHumanSelectionReviewBytes = orderedContractBytes(nonHumanSelectionReview);
    const nonHumanSelectionReviewBinding = {
      path: 'fixtures/non-human-selection-review-result-v002.json',
      schemaVersion: 'distant-connection-human-review-result-v002',
      fileSha256: sha256(nonHumanSelectionReviewBytes)
    };
    const nonHumanSelectionReference = clone(humanComparison.reference);
    (nonHumanSelectionReference.evidenceBindings as Record<string, unknown>).humanReview =
      nonHumanSelectionReviewBinding;
    const nonHumanSelectionReferenceBytes = canonicalJsonBytesV001(
      nonHumanSelectionReference
    );
    const nonHumanSelectionReferenceBinding = {
      path: 'fixtures/non-human-selection-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(nonHumanSelectionReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        comparisonMeasurementFixture.workspaceRoot,
        nonHumanSelectionReviewBinding.path,
        nonHumanSelectionReviewBytes
      ),
      writeTemporaryFixtureFile(
        comparisonMeasurementFixture.workspaceRoot,
        nonHumanSelectionReferenceBinding.path,
        nonHumanSelectionReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        nonHumanSelectionReferenceBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'human reviewとreferenceのSHAを同時更新したreviewer差し替えを拒否'
    );
    const measurementWithCompositeScore = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: comparisonJobBinding,
      resultBinding: null,
      baselineBinding: comparisonWindowPlanBinding,
      humanComparisonReferenceBinding: null,
      requiredMomentsContained: true,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: 0,
      humanRequiredIntervalDurationMs: 0,
      freeFixedWindowDurationMs: 0,
      minimumContextNeeded: null,
      matchingVisualCautions: [],
      nonMatchingVisualCautions: [],
      insufficientEvidenceReported: true,
      sourceProjectionSucceeded: false,
      unmappedCandidatePtsIntervalCount: 1,
      estimatedApiCostUsd: '0',
      apiLatencyMs: 0,
      pureHumanWatchTimeMs: 0,
      geminiBeatsFreeBaseline: false,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: 'projection-or-manufacturing-failure',
        humanDisposition: 'not-reviewed',
        factualDescription: '正式投影を閉じられない。'
      },
      compositeScore: 0.8
    };
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        measurementWithCompositeScore,
        comparisonContractJob
      ),
      '合成点を比較結果へ混入'
    );
    assertions += 9;
  } finally {
    await comparisonMeasurementFixture.cleanup();
  }

  const doctorHumanIntervals = COMPARISON_WINDOW_FIXTURES[3].human;
  if (doctorHumanIntervals === null) throw new Error('doctor human intervals missing');
  const qualityReviewFixture = await materializeReadyComparisonMockFixture(
    comparisonContractFixtures[3],
    semanticBytes
  );
  try {
    const qualityHumanComparison = await materializeAvailableHumanComparisonReferenceFixture(
      qualityReviewFixture,
      doctorHumanIntervals,
      'quality-v001-rejected'
    );
    if (qualityReviewFixture.job.comparisonInput.status !== 'resolved') {
      throw new Error('quality review comparison fixture must be resolved');
    }
    assert.equal(qualityHumanComparison.verification.reference.humanDisposition, 'rejected');
    assertCandidateVideoComparisonMeasurementV001({
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: {
        path: 'fixtures/doctor-comparison-job-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
        fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(qualityReviewFixture.job))
      },
      resultBinding: null,
      baselineBinding:
        qualityReviewFixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan,
      humanComparisonReferenceBinding: qualityHumanComparison.binding,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      humanRequiredIntervalDurationMs: 35745,
      freeFixedWindowDurationMs: 106181,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 106181,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: null,
        humanDisposition: 'rejected',
        factualDescription: '人間が区間化を承認し、映像品質を理由に不採用とした例を分離する。'
      }
    }, qualityReviewFixture.job, qualityHumanComparison.verification);
    const changedQualityReview = clone(qualityHumanComparison.humanReview);
    const changedCandidateReviews = changedQualityReview.candidateReviews as Array<
      Record<string, unknown>
    >;
    const doctorReview = changedCandidateReviews.find((review) =>
      review.candidateId === qualityReviewFixture.job.localCandidateId);
    if (!doctorReview) throw new Error('doctor quality review missing');
    doctorReview.intervalizationEvaluation = 'fail';
    const changedQualityReviewBytes = canonicalJsonBytesV001(changedQualityReview);
    const changedQualityReviewBinding = {
      path: 'fixtures/changed-human-quality-review-result-v001.json',
      schemaVersion: 'distant-connection-human-quality-review-result-v001',
      fileSha256: sha256(changedQualityReviewBytes)
    };
    const changedQualityReference = clone(qualityHumanComparison.reference);
    (changedQualityReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedQualityReviewBinding;
    const changedQualityReferenceBytes = canonicalJsonBytesV001(changedQualityReference);
    const changedQualityReferenceBinding = {
      path: 'fixtures/changed-quality-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedQualityReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewBinding.path,
        changedQualityReviewBytes
      ),
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReferenceBinding.path,
        changedQualityReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedQualityReferenceBinding,
        qualityReviewFixture.job,
        qualityReviewFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '区間化確認をpassからfailへ変更した人間評価を拒否'
    );
    const changedQualityReviewer = clone(qualityHumanComparison.humanReview);
    changedQualityReviewer.reviewer = 'not-kawafmm';
    const changedQualityReviewerBytes = orderedContractBytes(changedQualityReviewer);
    const changedQualityReviewerBinding = {
      path: 'fixtures/changed-human-quality-reviewer-result-v001.json',
      schemaVersion: 'distant-connection-human-quality-review-result-v001',
      fileSha256: sha256(changedQualityReviewerBytes)
    };
    const changedQualityReviewerReference = clone(qualityHumanComparison.reference);
    (changedQualityReviewerReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedQualityReviewerBinding;
    const changedQualityReviewerReferenceBytes = canonicalJsonBytesV001(
      changedQualityReviewerReference
    );
    const changedQualityReviewerReferenceBinding = {
      path: 'fixtures/changed-quality-reviewer-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedQualityReviewerReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewerBinding.path,
        changedQualityReviewerBytes
      ),
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewerReferenceBinding.path,
        changedQualityReviewerReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedQualityReviewerReferenceBinding,
        qualityReviewFixture.job,
        qualityReviewFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'quality reviewとreferenceのSHAを同時更新したreviewer差し替えを拒否'
    );
    assertions += 4;
  } finally {
    await qualityReviewFixture.cleanup();
  }

  const fifthMeasurementFixture = await materializeReadyComparisonMockFixture(
    fifthComparisonContract,
    semanticBytes
  );
  try {
    const fifthHumanComparison = await materializeNegativeHumanComparisonReferenceFixture(
      fifthMeasurementFixture,
      [
        {startTimeMs: 249378, endTimeMs: 255324},
        {startTimeMs: 6134433, endTimeMs: 6141636}
      ]
    );
    const fifthComparisonJob = fifthMeasurementFixture.job;
    if (fifthComparisonJob.comparisonInput.status !== 'resolved') {
      throw new Error('fifth comparison contract fixture must be resolved');
    }
    const fifthWindowPlanBinding =
      fifthComparisonJob.comparisonInput.sharedFreeAndGeminiWindowPlan;
    const fifthMeasurement = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: {
        path: 'fixtures/fifth-comparison-job-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
        fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(fifthComparisonJob))
      },
      resultBinding: null,
      baselineBinding: fifthWindowPlanBinding,
      humanComparisonReferenceBinding: fifthHumanComparison.binding,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      humanRequiredIntervalDurationMs: null,
      freeFixedWindowDurationMs: 104933,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 104933,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: 'candidate-discovery-failure',
        humanDisposition: 'rejected',
        factualDescription: '人間承認済み必要区間がない候補発見失敗として分離する。'
      }
    } as const;
    assertCandidateVideoComparisonMeasurementV001(
      fifthMeasurement,
      fifthComparisonJob,
      fifthHumanComparison.verification
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...fifthMeasurement,
        requiredMomentsContained: true,
        coreStartErrorMs: 0,
        reactionEndErrorMs: 0,
        humanRequiredIntervalDurationMs: 13149,
        matchingVisualCautions: []
      }, fifthComparisonJob, fifthHumanComparison.verification),
      '5本目へ存在しない人間承認済み必要区間由来の比較値を混入'
    );
    const changedFifthReference = clone(fifthHumanComparison.reference);
    changedFifthReference.referenceKind = 'human-required-intervals-available';
    const changedEvidenceBindings = changedFifthReference.evidenceBindings as Record<
      string,
      unknown
    >;
    changedEvidenceBindings.intervalProvenance = clone(fifthComparisonJob.sourceMapping.provenance);
    changedFifthReference.humanApprovedRequiredIntervals = [
      {
        locusId: 'candidate-horror-game-to-screams-001-first',
        startTimeMs: 249378,
        endTimeMs: 255324
      },
      {
        locusId: 'candidate-horror-game-to-screams-001-second',
        startTimeMs: 6134433,
        endTimeMs: 6141636
      }
    ];
    const changedFifthReferenceBytes = canonicalJsonBytesV001(changedFifthReference);
    const changedFifthReferenceBinding = {
      path: 'fixtures/changed-fifth-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedFifthReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      fifthMeasurementFixture.workspaceRoot,
      changedFifthReferenceBinding.path,
      changedFifthReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedFifthReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'reference SHAも更新して5本目の評価対象区間を承認済み正解へ昇格する攻撃を拒否'
    );
    let receiptReferenceGetterReadCount = 0;
    Object.defineProperty(fifthHumanComparison.verification, 'reference', {
      configurable: true,
      get() {
        receiptReferenceGetterReadCount += 1;
        return receiptReferenceGetterReadCount === 1
          ? fifthHumanComparison.reference
          : changedFifthReference;
      }
    });
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...fifthMeasurement,
        requiredMomentsContained: true,
        coreStartErrorMs: 0,
        reactionEndErrorMs: 0,
        humanRequiredIntervalDurationMs: 13149,
        matchingVisualCautions: []
      }, fifthComparisonJob, fifthHumanComparison.verification),
      '検証receiptの公開reference getterによるTOCTOU差し替え'
    );
    assert.equal(receiptReferenceGetterReadCount, 0);
    const changedHumanReview = clone(fifthHumanComparison.humanReview);
    changedHumanReview.primaryCause = 'video-understanding';
    const changedHumanReviewBytes = canonicalJsonBytesV001(changedHumanReview);
    const changedHumanReviewBinding = {
      path: 'fixtures/changed-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(changedHumanReviewBytes)
    };
    const changedEvidenceReference = clone(fifthHumanComparison.reference);
    (changedEvidenceReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedHumanReviewBinding;
    const changedEvidenceReferenceBytes = canonicalJsonBytesV001(changedEvidenceReference);
    const changedEvidenceReferenceBinding = {
      path: 'fixtures/changed-evidence-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedEvidenceReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        changedHumanReviewBinding.path,
        changedHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        changedEvidenceReferenceBinding.path,
        changedEvidenceReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedEvidenceReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'human reviewとreferenceのSHAを同時更新して候補発見原因を変更する攻撃を拒否'
    );
    const malformedCandidateReview = clone(fifthHumanComparison.candidateReview);
    (malformedCandidateReview.mediaInspection as Record<string, unknown>).videoPresent = false;
    const malformedCandidateReviewBytes = orderedContractBytes(malformedCandidateReview);
    const malformedCandidateReviewBinding = {
      path: 'fixtures/malformed-candidate-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-review-result-v001',
      fileSha256: sha256(malformedCandidateReviewBytes)
    };
    const malformedCandidateHumanReview = clone(fifthHumanComparison.humanReview);
    (malformedCandidateHumanReview.sourceBindings as Record<string, unknown>)
      .candidateReviewResult = malformedCandidateReviewBinding;
    const malformedCandidateHumanReviewBytes = orderedContractBytes(
      malformedCandidateHumanReview
    );
    const malformedCandidateHumanReviewBinding = {
      path: 'fixtures/malformed-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(malformedCandidateHumanReviewBytes)
    };
    const malformedCandidateReference = clone(fifthHumanComparison.reference);
    (malformedCandidateReference.evidenceBindings as Record<string, unknown>).humanReview =
      malformedCandidateHumanReviewBinding;
    const malformedCandidateReferenceBytes = canonicalJsonBytesV001(
      malformedCandidateReference
    );
    const malformedCandidateReferenceBinding = {
      path: 'fixtures/malformed-candidate-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(malformedCandidateReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateReviewBinding.path,
        malformedCandidateReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateHumanReviewBinding.path,
        malformedCandidateHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateReferenceBinding.path,
        malformedCandidateReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        malformedCandidateReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'candidate reviewから映像成立証拠を壊して全SHA連鎖を更新する攻撃を拒否'
    );

    const outOfWindowCandidateReview = clone(fifthHumanComparison.candidateReview);
    const outOfWindowParts = outOfWindowCandidateReview.evaluatedParts as Array<
      Record<string, unknown>
    >;
    outOfWindowParts[0].sourceInterval = {sourceStartMs: 100000, sourceEndMs: 100100};
    outOfWindowParts[1].sourceInterval = {sourceStartMs: 6000000, sourceEndMs: 6000100};
    const outOfWindowCandidateReviewBytes = orderedContractBytes(outOfWindowCandidateReview);
    const outOfWindowCandidateReviewBinding = {
      path: 'fixtures/out-of-window-candidate-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-review-result-v001',
      fileSha256: sha256(outOfWindowCandidateReviewBytes)
    };
    const outOfWindowHumanReview = clone(fifthHumanComparison.humanReview);
    (outOfWindowHumanReview.sourceBindings as Record<string, unknown>).candidateReviewResult =
      outOfWindowCandidateReviewBinding;
    outOfWindowHumanReview.evaluatedIntervals = {
      firstPartSourceInterval: {sourceStartMs: 100000, sourceEndMs: 100100},
      secondPartSourceInterval: {sourceStartMs: 6000000, sourceEndMs: 6000100}
    };
    const outOfWindowHumanReviewBytes = orderedContractBytes(outOfWindowHumanReview);
    const outOfWindowHumanReviewBinding = {
      path: 'fixtures/out-of-window-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(outOfWindowHumanReviewBytes)
    };
    const outOfWindowReference = clone(fifthHumanComparison.reference);
    (outOfWindowReference.evidenceBindings as Record<string, unknown>).humanReview =
      outOfWindowHumanReviewBinding;
    const outOfWindowReferenceBytes = canonicalJsonBytesV001(outOfWindowReference);
    const outOfWindowReferenceBinding = {
      path: 'fixtures/out-of-window-candidate-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(outOfWindowReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowCandidateReviewBinding.path,
        outOfWindowCandidateReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowHumanReviewBinding.path,
        outOfWindowHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowReferenceBinding.path,
        outOfWindowReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        outOfWindowReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'candidate reviewとhuman reviewの区間・全SHA連鎖を比較窓外へ移す攻撃を拒否'
    );
    assertions += 9;
  } finally {
    await fifthMeasurementFixture.cleanup();
  }

  const badJobs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['extra job field', (value) => { value.finalVerdict = 'approved'; }],
    ['comparison scope without wider exploration bindings', (value) => {
      value.evaluationScope = 'intervalization-replacement-comparison';
    }],
    ['unsafe path', (value) => {
      (((value.localBindings as Record<string, unknown>).candidate as Record<string, unknown>).path) = '../candidate.json';
    }],
    ['video absent', (value) => {
      ((((value.candidateMedia as Record<string, unknown>).video as Record<string, unknown>).codecName)) = '';
    }],
    ['audio absent', (value) => {
      ((((value.candidateMedia as Record<string, unknown>).audio as Record<string, unknown>).codecName)) = '';
    }],
    ['mapping gap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateStartPts) = 107520;
    }],
    ['mapping overlap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateStartPts) = 106496;
    }],
    ['mapping reverse', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[0].candidateEndPtsExclusive) = 0;
    }],
    ['source overlap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].sourceSelectionStartMs) = 671000;
    }],
    ['mapping incomplete', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateFrameEndIndexExclusive) = 1670;
    }],
    ['human review as reference context source', (value) => {
      value.referenceContext = {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: humanReference.humanReviewPath,
          schemaVersion: 'human-review-result-v002',
          fileSha256: humanReference.humanReviewSha256
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: humanReference.humanReason,
        factualObservationSha256: createHash('sha256')
          .update(humanReference.humanReason)
          .digest('hex')
      };
    }],
    ['retry enabled', (value) => {
      ((value.inferencePolicy as Record<string, unknown>).automaticRetryCount) = 1;
    }]
  ];
  for (const [label, mutate] of badJobs) {
    const invalid = clone(JOBS[0]) as unknown as Record<string, unknown>;
    mutate(invalid);
    expectContractFailure(() => assertCandidateVideoUnderstandingJobV001(invalid), label);
    assertions += 1;
  }

  const badOutputs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['extra output field', (value) => { value.score = 100; }],
    ['unknown role', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[0]).role) = 'punchline';
    }],
    ['end <= start', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 6900;
    }],
    ['outside duration', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 55701;
    }],
    ['duplicate observation ID', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[1];
      (((role.intervals as Array<Record<string, unknown>>)[0]).observationId) = 'observation-001';
    }],
    ['duplicate observation', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      const rows = role.intervals as Array<Record<string, unknown>>;
      const duplicate = clone(rows[0]);
      duplicate.observationId = 'observation-999';
      rows.push(duplicate);
    }],
    ['missing role', (value) => {
      (value.roleObservations as Array<Record<string, unknown>>).pop();
    }],
    ['duplicate role', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[1]).role) = 'coreEvent';
    }],
    ['not observed with interval', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[0]).status) = 'notObserved';
    }],
    ['observed without interval', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      role.intervals = [];
    }],
    ['duplicate evidence modality', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).evidenceModalities) = ['video', 'video'];
    }],
    ['unknown visual note', (value) => {
      (((value.visualCautions as Array<Record<string, unknown>>)[0]).kind) = 'good-video';
    }],
    ['insufficient evidence mismatch', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).present) = false;
    }],
    ['observed role declared missing', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).missingEvidence as string[])
        .push('coreEvent');
    }],
    ['notObserved role omitted from missing evidence', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).missingEvidence) = ['visualEvent'];
    }]
  ];
  for (const [label, mutate] of badOutputs) {
    const invalid = clone(output) as unknown as Record<string, unknown>;
    mutate(invalid);
    expectContractFailure(
      () => assertCandidateVideoUnderstandingProviderOutputV001(invalid, JOBS[0]),
      label
    );
    assertions += 1;
  }

  const resultWithDecision = clone(result) as unknown as Record<string, unknown>;
  resultWithDecision.finalVerdict = 'approved';
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithDecision, resultReadyJob),
    'resultは最終採否を所有しない'
  );
  const resultWithRetry = clone(failedResult);
  ((resultWithRetry.execution as Record<string, unknown>).automaticRetryCount) = 1;
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithRetry),
    'failed resultでもretryは禁止'
  );
  assertions += 2;

  const resultWithChangedProjection = clone(result);
  resultWithChangedProjection.projectedRoleIntervals[0].sourceIntervals[0].sourceStartTimeMs = {
    numerator: 1,
    denominator: 1
  };
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithChangedProjection, resultReadyJob),
    'result projectionの手修正は禁止'
  );
  assertions += 1;

  const mismatchedCandidateSha = clone(JOBS[0]);
  mismatchedCandidateSha.localBindings.candidate.fileSha256 = '0'.repeat(64);
  await assert.rejects(
    verifyCandidateVideoUnderstandingJobFilesV001(mismatchedCandidateSha, WORKSPACE_ROOT),
    {name: 'CandidateVideoUnderstandingContractErrorV001'}
  );
  assertions += 1;

  const nonCanonical = Buffer.from(JSON.stringify(JOBS[0]), 'utf8');
  expectContractFailure(() => decodeCandidateVideoUnderstandingJobV001(nonCanonical), 'non-canonical job byte');
  assert.notDeepEqual(canonicalJsonBytesV001({b: 1, a: 2}), Buffer.from('{"b":1,"a":2}\n'));
  assertions += 2;

  const formallyReadyIntervalizationComparisonJobs = comparisonContractFixtures.filter(
    ({job, plan}) => job.evaluationScope === 'intervalization-replacement-comparison'
      && job.comparisonInput.status === 'resolved'
      && job.preflight.status === 'ready'
      && plan.fixedWindowSettingsApproval.status === 'approved'
  ).length;

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    assertions,
    fixtureJobsBound: JOBS.length,
    providerInputAllowlistPassed: JOBS.length,
    providerSchemaUnsupportedKeywords: 0,
    formallyRepresentableAbsentRoles: CANDIDATE_VIDEO_ROLE_VALUES_V001.length,
    rawEmpiricalComparisonWindowDurationMs: 502580,
    speechBoundarySnappedComparisonWindowDurationMs: snappedComparisonDurationMs,
    candidatePointsDerivedFromBoundArtifacts: 10,
    mockRequestCaptures,
    communicationPlanStatus: communicationProposal.status,
    formallyClosedSourceMappings: 5,
    explicitUnmappedPtsIntervals: 1,
    apiCommunications: 0,
    videosGenerated: 0,
    comparisonPlanFixturesValidated: comparisonContractFixtures.length,
    comparisonExperimentPlanV002Status: comparisonExperimentPlanV002.status,
    comparisonExperimentPlanV002CanonicalSha256:
      sha256(comparisonExperimentPlanV002Bytes),
    comparisonExperimentPlanV002CalibrationItems:
      comparisonExperimentPlanV002.totals.calibrationItems,
    comparisonExperimentPlanV002DurationBasis:
      comparisonExperimentPlanV002.totals.durationBasis,
    freeHumanBaselineRawDurationMs:
      comparisonExperimentPlanV002.totals.freeHumanBaselineRawDurationMs,
    freeHumanBaselineSnappedDurationMs:
      comparisonExperimentPlanV002.totals.freeHumanBaselineSnappedDurationMs,
    geminiExplorationRawDurationMs:
      comparisonExperimentPlanV002.totals.geminiExplorationRawDurationMs,
    geminiExplorationSnappedDurationMs:
      comparisonExperimentPlanV002.totals.geminiExplorationSnappedDurationMs,
    truthRequiredMetricEligibleItems:
      comparisonExperimentPlanV002.totals.truthEligibleItems,
    truthRequiredMetricEligibleLoci:
      comparisonExperimentPlanV002.totals.truthEligibleLoci,
    truthRequiredMetricExcludedItems:
      comparisonExperimentPlanV002.totals.truthExcludedItems,
    formalIntervalizationComparisonJobsReady: formallyReadyIntervalizationComparisonJobs,
    provisionalHumanComparisonCrossBindingFixturesVerified: 3,
    formalHumanTruthReceiptsReady: 0,
    formalComparisonMeasurementsReady: 0,
    humanComparisonReferenceTamperingRejected: true,
    candidateDiscoveryNegativeApprovedRequiredIntervals: 0,
    humanReviewArtifactReadsForLeakageNegativeTest: 0,
    humanReviewArtifactsIncludedInProviderInput: 0
  })}\n`);
}

await main();

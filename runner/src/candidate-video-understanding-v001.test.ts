import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

import {
  CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
  assertCandidateVideoProviderInputV001,
  assertCandidateVideoUnderstandingExperimentJobsV001,
  assertCandidateVideoUnderstandingJobV001,
  assertCandidateVideoUnderstandingJobReadyForExecutionV001,
  assertCandidateVideoUnderstandingProviderOutputV001,
  assertCandidateVideoUnderstandingResultV001,
  candidateVideoPromptSha256V001,
  candidateVideoProviderInputCanonicalSha256V001,
  candidateVideoResponseSchemaSha256V001,
  canonicalJsonBytesV001,
  decodeCandidateVideoUnderstandingJobV001,
  decodeCandidateVideoUnderstandingResultV001,
  projectCandidateIntervalToSourceV001,
  serializeCandidateVideoUnderstandingJobV001,
  serializeCandidateVideoUnderstandingResultV001,
  verifyCandidateVideoUnderstandingJobFilesV001,
  verifyClosedSourceMappingProvenanceV001,
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

function providerInput(ordinal: number) {
  const itemId = `item-${String(ordinal).padStart(4, '0')}`;
  return {
    itemId,
    file: {displayName: `${itemId}.mp4`, mimeType: 'video/mp4' as const},
    prompt: {
      utf8: CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001,
      sha256: candidateVideoPromptSha256V001()
    },
    responseSchema: {
      jsonSchema: CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001,
      canonicalSha256: candidateVideoResponseSchemaSha256V001()
    },
    settings: {
      model: 'gemini-3.8-flash' as const,
      processing: 'static' as const,
      framesPerSecond: 1 as const,
      mediaResolution: 'high' as const,
      thinkingLevel: 'medium' as const,
      responseMimeType: 'application/json' as const,
      maxVisibleOutputTokens: 4096 as const,
      transport: 'files-api' as const
    }
  };
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
}): Omit<CandidateVideoUnderstandingJobV001, 'sourceMapping'> {
  const input = providerInput(fixture.ordinal);
  const nominalFrameDurationPts = 15360 / fixture.frameRate;
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
    jobId: `candidate-video-understanding-job-${String(fixture.ordinal).padStart(4, '0')}`,
    experimentItem: {
      ordinal: fixture.ordinal,
      opaqueItemId: `item-${String(fixture.ordinal).padStart(4, '0')}`
    },
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
    providerInput: input,
    providerInputCanonicalSha256: candidateVideoProviderInputCanonicalSha256V001(input),
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
  return {
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
  };
}

function fifthJob(): CandidateVideoUnderstandingJobV001 {
  return {
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
  };
}

const JOBS = [...CLOSED_FIXTURES.map(closedJob), fifthJob()];

function validProviderOutput(): CandidateVideoUnderstandingProviderOutputV001 {
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
    summary: '候補動画内で確認できる内容だけを記録した。',
    roleIntervals: [
      {
        observationId: 'observation-001',
        role: 'core-event',
        startTimeMs: 6900,
        endTimeMs: 7100,
        factualDescription: '連結点をまたいで主要な出来事が続く。',
        evidenceModalities: ['video', 'audio']
      },
      {
        observationId: 'observation-002',
        role: 'cause',
        startTimeMs: 1000,
        endTimeMs: 2000,
        factualDescription: '映像上のきっかけが確認できる。',
        evidenceModalities: ['video']
      },
      {
        observationId: 'observation-003',
        role: 'minimal-introduction',
        startTimeMs: 0,
        endTimeMs: 1000,
        factualDescription: '出来事を理解するための導入がある。',
        evidenceModalities: ['speech']
      },
      {
        observationId: 'observation-004',
        role: 'reaction',
        startTimeMs: 7100,
        endTimeMs: 9000,
        factualDescription: '発話と音声による反応がある。',
        evidenceModalities: ['audio', 'speech']
      },
      {
        observationId: 'observation-005',
        role: 'natural-ending',
        startTimeMs: 9000,
        endTimeMs: 10000,
        factualDescription: '反応が収束する。',
        evidenceModalities: ['video', 'audio', 'speech']
      }
    ],
    removableIntervals: [
      {startTimeMs: 10000, endTimeMs: 11000, factualDescription: '主要な出来事と反応の後である。'}
    ],
    visualNotes: [
      {
        kind: 'audio-dependent',
        startTimeMs: 7100,
        endTimeMs: 9000,
        factualDescription: '反応の理解は音声にも依存する。'
      }
    ],
    insufficientEvidence: {
      present: true,
      missingRoles: ['premise'],
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
  const output = validProviderOutput();
  const jobBytes = serializeCandidateVideoUnderstandingJobV001(job);
  const repeatedSha = '1'.repeat(64);
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
      exactRequest: {
        path: 'fixtures/exact-request-v001.json',
        schemaVersion: 'candidate-video-understanding-exact-request-v001',
        fileSha256: repeatedSha
      },
      rawResponse: {
        path: 'fixtures/raw-response-v001.json',
        schemaVersion: 'provider-raw-response-v001',
        fileSha256: '2'.repeat(64)
      }
    },
    structuredValidation: {status: 'passed', violations: []},
    providerOutput: output,
    projectedRoleIntervals: projectedList(job, output.roleIntervals.map((item) => ({
      id: item.observationId,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs
    }))),
    projectedRemovableIntervals: projectedList(job, output.removableIntervals.map((item, index) => ({
      id: `removable-${String(index + 1).padStart(3, '0')}`,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs
    }))),
    projectedVisualNotes: projectedList(job, output.visualNotes.map((item, index) => ({
      id: `visual-note-${String(index + 1).padStart(3, '0')}`,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs
    }))),
    usage: {inputTokens: 1000, outputTokens: 300, thinkingTokens: 700},
    cost: {
      priceSnapshot: {
        path: 'fixtures/price-snapshot-v001.json',
        schemaVersion: 'gemini-price-snapshot-v001',
        fileSha256: '3'.repeat(64)
      },
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

  for (const job of JOBS) {
    expectContractFailure(
      () => assertCandidateVideoUnderstandingJobReadyForExecutionV001(job),
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
  const result = validResult(JOBS[0]);
  assertCandidateVideoUnderstandingResultV001(result, JOBS[0]);
  const resultBytes = serializeCandidateVideoUnderstandingResultV001(result, JOBS[0]);
  assert.deepEqual(decodeCandidateVideoUnderstandingResultV001(resultBytes, JOBS[0]), result);
  assertions += 3;

  const failedResult = clone(result) as unknown as Record<string, unknown>;
  (failedResult.execution as Record<string, unknown>).httpStatus = 503;
  (failedResult.execution as Record<string, unknown>).completionStatus = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).status = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).violations = ['provider request failed'];
  failedResult.providerOutput = null;
  failedResult.projectedRoleIntervals = [];
  failedResult.projectedRemovableIntervals = [];
  failedResult.projectedVisualNotes = [];
  assertCandidateVideoUnderstandingResultV001(failedResult);
  assertions += 1;

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

  const badJobs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['extra job field', (value) => { value.finalVerdict = 'approved'; }],
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
      (((value.roleIntervals as Array<Record<string, unknown>>)[0]).role) = 'punchline';
    }],
    ['end <= start', (value) => {
      (((value.roleIntervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 6900;
    }],
    ['outside duration', (value) => {
      (((value.roleIntervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 55701;
    }],
    ['duplicate observation ID', (value) => {
      (((value.roleIntervals as Array<Record<string, unknown>>)[1]).observationId) = 'observation-001';
    }],
    ['duplicate observation', (value) => {
      const rows = value.roleIntervals as Array<Record<string, unknown>>;
      const duplicate = clone(rows[0]);
      duplicate.observationId = 'observation-999';
      rows.push(duplicate);
    }],
    ['unknown visual note', (value) => {
      (((value.visualNotes as Array<Record<string, unknown>>)[0]).kind) = 'good-video';
    }],
    ['insufficient evidence mismatch', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).present) = false;
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
    () => assertCandidateVideoUnderstandingResultV001(resultWithDecision, JOBS[0]),
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
    () => assertCandidateVideoUnderstandingResultV001(resultWithChangedProjection, JOBS[0]),
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

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    assertions,
    fixtureJobsBound: JOBS.length,
    providerInputAllowlistPassed: JOBS.length,
    formallyClosedSourceMappings: 5,
    explicitUnmappedPtsIntervals: 1,
    apiCommunications: 0,
    videosGenerated: 0,
    humanReviewArtifactsRead: 0
  })}\n`);
}

await main();

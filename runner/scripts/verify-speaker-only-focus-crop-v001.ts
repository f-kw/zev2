import assert from 'node:assert/strict';

import {
  buildPrimaryScreenLayoutPlanFromGemini,
  buildScreenLayoutCandidateSetFromGemini,
  type ShortsScreenLayoutCandidate,
  type ViewportCoords
} from '../src/screen-layout.js';

const SPEAKER_ONLY_NORMALIZED_CROP_RATIO = (9 / 16) / (16 / 9);

function viewportCenter(rawBox: number[]): { x: number; y: number } {
  return {
    x: ((rawBox[1] + rawBox[3]) / 2) / 1000,
    y: ((rawBox[0] + rawBox[2]) / 2) / 1000
  };
}

function assertFiniteInFrameCrop(
  crop: ViewportCoords,
  focus: { x: number; y: number },
  label: string
) {
  assert.equal(crop.length, 4, `${label}: crop must have four coordinates`);
  assert.ok(crop.every(Number.isFinite), `${label}: crop coordinates must be finite`);
  assert.ok(crop[0] >= 0 && crop[1] >= 0, `${label}: crop must start inside the frame`);
  assert.ok(crop[2] <= 1 && crop[3] <= 1, `${label}: crop must end inside the frame`);
  assert.ok(crop[2] > crop[0] && crop[3] > crop[1], `${label}: crop must have positive area`);
  assert.equal(
    crop[2] - crop[0],
    SPEAKER_ONLY_NORMALIZED_CROP_RATIO * (crop[3] - crop[1]),
    `${label}: crop must map a 16:9 source to a 9:16 viewport`
  );
  assert.ok(
    focus.x >= crop[0] && focus.x <= crop[2] && focus.y >= crop[1] && focus.y <= crop[3],
    `${label}: crop must contain its focus center`
  );
}

function findCandidate(
  candidates: ShortsScreenLayoutCandidate[],
  id: string
): ShortsScreenLayoutCandidate {
  const candidate = candidates.find((entry) => entry.id === id);
  assert.ok(candidate, `missing candidate ${id}`);
  return candidate;
}

const wideSpeakerDetection = {
  face: [100, 250, 400, 1000],
  body: [0, 0, 1000, 1000]
};
const speakerOnlySet = buildScreenLayoutCandidateSetFromGemini({
  screenLayoutId: 'speaker_only',
  layoutReason: '独立画面がなく話者1人だけが主要対象',
  detections: {
    speaker: wideSpeakerDetection
  }
}, 'wide speaker_only fixture');
assert.equal(speakerOnlySet.candidates.length, 2);
assert.equal(
  speakerOnlySet.classificationReason,
  '独立画面がなく話者1人だけが主要対象',
  'classification reason must survive candidate generation'
);

const bodyCandidate = findCandidate(speakerOnlySet.candidates, 'speaker_only_body');
const faceCandidate = findCandidate(speakerOnlySet.candidates, 'speaker_only_face');
assertFiniteInFrameCrop(
  bodyCandidate.viewports.speaker as ViewportCoords,
  viewportCenter(wideSpeakerDetection.body),
  'speaker_only body-centered crop'
);
assertFiniteInFrameCrop(
  faceCandidate.viewports.speaker as ViewportCoords,
  viewportCenter(wideSpeakerDetection.face),
  'speaker_only face-centered crop'
);

const primarySpeakerOnly = buildPrimaryScreenLayoutPlanFromGemini({
  screenLayoutId: 'speaker_only',
  detections: {
    speaker: wideSpeakerDetection
  }
}, 'wide primary speaker_only fixture');
assert.deepEqual(
  primarySpeakerOnly.viewports.speaker,
  bodyCandidate.viewports.speaker,
  'primary speaker_only route must use the same body-centered crop'
);
assert.equal(
  primarySpeakerOnly.classificationReason,
  undefined,
  'primary route without layoutReason must not invent a classification reason'
);

assert.throws(
  () => buildScreenLayoutCandidateSetFromGemini({
    screenLayoutId: 'speaker_only',
    detections: {
      screen: [0, 0, 1000, 1000],
      speaker: wideSpeakerDetection
    }
  }, 'speaker_only with unrelated screen fixture'),
  /不要な検出対象 screen/,
  'speaker_only must reject detections owned by another video type'
);

const edgeFaceDetection = {
  face: [100, 0, 300, 100],
  body: [0, 0, 1000, 1000]
};
const edgeFaceBodyCandidate = findCandidate(
  buildScreenLayoutCandidateSetFromGemini({
    screenLayoutId: 'speaker_only',
    detections: { speaker: edgeFaceDetection }
  }, 'edge face speaker_only fixture').candidates,
  'speaker_only_body'
);
assertFiniteInFrameCrop(
  edgeFaceBodyCandidate.viewports.speaker as ViewportCoords,
  viewportCenter(edgeFaceDetection.face),
  'speaker_only body-centered crop with edge face'
);

const screenSpeakerProjection = buildScreenLayoutCandidateSetFromGemini({
  screenLayoutId: 'screen_speaker',
  detections: {
    screen: [100, 50, 700, 950],
    speaker: {
      face: [150, 200, 350, 400],
      body: [100, 100, 900, 500]
    }
  }
}, 'screen_speaker projection fixture').candidates;
assert.deepEqual(screenSpeakerProjection, [
  {
    id: 'screen_speaker_body',
    label: '画面と話者全体',
    reason: '上に画面、下に顔を入れた話者全体を表示する',
    viewports: {
      screen: [0.18359375, 0, 0.81640625, 1],
      speaker: [0.046875, 0.09999999999999998, 0.553125, 0.9]
    }
  },
  {
    id: 'screen_speaker_face',
    label: '画面と顔寄せ',
    reason: '上に画面、下に顔の見やすさを優先した話者を表示する',
    viewports: {
      screen: [0.18359375, 0, 0.81640625, 1],
      speaker: [0.20000000000000007, 0.09197530864197531, 0.4, 0.40802469135802466]
    }
  }
], 'screen_speaker projection changed');

const speakerPairProjection = buildScreenLayoutCandidateSetFromGemini({
  screenLayoutId: 'speaker_pair',
  detections: {
    speaker1: {
      face: [100, 100, 300, 300],
      body: [50, 50, 900, 450]
    },
    speaker2: {
      face: [200, 650, 400, 850],
      body: [100, 550, 950, 950]
    }
  }
}, 'speaker_pair projection fixture').candidates;
assert.deepEqual(speakerPairProjection, [
  {
    id: 'speaker_pair_body',
    label: '2人の話者全体',
    reason: '上下の横長枠に、2人それぞれの顔を入れたまま人物全体をできるだけ入れる',
    viewports: {
      speaker1: [0, 0.050000000000000044, 0.537890625, 0.9],
      speaker2: [0.46210937500000004, 0.10000000000000003, 1, 0.95]
    }
  },
  {
    id: 'speaker_pair_face',
    label: '2人の顔寄せ',
    reason: '上下の横長枠に、2人それぞれの顔の見やすさを優先して入れる',
    viewports: {
      speaker1: [0.10000000000000002, 0.04197530864197532, 0.3, 0.3580246913580247],
      speaker2: [0.65, 0.14197530864197538, 0.85, 0.4580246913580247]
    }
  }
], 'speaker_pair projection changed');

console.log(JSON.stringify({
  status: 'passed',
  checks: {
    wideSpeakerOnlyDoesNotAbort: true,
    classificationReasonIsPreserved: true,
    unrelatedDetectionIsRejected: true,
    bodyCenteredCropIsFiniteInFrameAndContainsFocus: true,
    faceCenteredCropIsFiniteInFrameAndContainsFocus: true,
    primarySpeakerOnlyRouteUsesBodyCenter: true,
    bodyCandidateKeepsFaceCenterWhenFaceIsAtBodyEdge: true,
    screenSpeakerProjectionUnchanged: true,
    speakerPairProjectionUnchanged: true
  }
}, null, 2));

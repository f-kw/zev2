import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIRST_REAL_DATA_REVIEW_MEDIA_URL_V001,
  FIRST_REAL_DATA_REVIEW_PAGE_URL_V001,
  buildPresentationEdgePlaybackObservationV001,
} from './observe_presentation_first_real_data_edge_playback_v001.mjs';
import {
  FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001,
  validatePresentationBrowserPlaybackObservationV001,
} from './presentation_source_media_equivalence_v001.mjs';

const mediaFileSha256 = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.newExecutionMediaSha256;
const pageState = {
  pageUrl: FIRST_REAL_DATA_REVIEW_PAGE_URL_V001,
  mediaUrl: FIRST_REAL_DATA_REVIEW_MEDIA_URL_V001,
  userAgent: 'Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0.0.0',
  readyState: 4,
  videoWidth: 1920,
  videoHeight: 1080,
  mediaError: null,
};
const playbackState = {
  seeked: true,
  currentTime: 1920.261,
  paused: false,
  mediaError: null,
};

test('Microsoft Edgeで同一read-only経路の1080p seek再生を観測する', () => {
  const observation = buildPresentationEdgePlaybackObservationV001({
    pageState,
    playbackState,
    mediaFileSha256,
  });
  assert.equal(observation.status, 'passed');
  assert.equal(observation.browserName, 'Microsoft Edge');
  assert.equal(observation.browserVersion, '140.0.0.0');
  assert.equal(observation.serverContract, 'read-only-get-head-v001');
  assert.equal(validatePresentationBrowserPlaybackObservationV001(observation), true);
});

test('Chrome表記・別URL・未seek・画面寸法違いを合格にしない', () => {
  const cases = [
    {pageState: {...pageState, userAgent: 'Mozilla/5.0 Chrome/140.0'}, playbackState},
    {pageState: {...pageState, pageUrl: 'http://127.0.0.1:4318/other'}, playbackState},
    {pageState, playbackState: {...playbackState, seeked: false}},
    {pageState, playbackState: {...playbackState, paused: true}},
    {pageState: {...pageState, videoWidth: 1280}, playbackState},
  ];
  for (const input of cases) {
    const observation = buildPresentationEdgePlaybackObservationV001({
      ...input,
      mediaFileSha256,
    });
    assert.equal(observation.status, 'failed');
    assert.equal(validatePresentationBrowserPlaybackObservationV001(observation), false);
  }
});

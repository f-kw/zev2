import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';

import {
  buildCommentVelocityMinuteSeriesArtifactFromBytesV001,
  serializeCommentVelocityMinuteSeriesArtifactV001
} from '../src/comment-velocity-minute-series-artifact-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001,
  DistantConnectionComparisonLunaB5ErrorV001,
  assertDistantConnectionComparisonB5LocalManifestV001,
  assertDistantConnectionComparisonB6RequestBindingV001,
  assertDistantConnectionComparisonExactRequestV001,
  assertDistantConnectionComparisonIndexResponseV001,
  buildDistantConnectionComparisonB5LocalArtifactsV001,
  buildDistantConnectionComparisonIndexedModelInputV001,
  decodeDistantConnectionComparisonB5LocalManifestV001,
  decodeDistantConnectionComparisonExactRequestV001,
  decodeDistantConnectionComparisonIndexedModelInputV001,
  deriveDistantConnectionComparisonCandidateIdV001,
  resolveDistantConnectionComparisonIndexResponseV001,
  serializeDistantConnectionComparisonIndexedModelInputV001,
  serializeDistantConnectionComparisonModelVisiblePayloadV001,
  validateDistantConnectionComparisonB5LocalArtifactsV001,
  type BuildDistantConnectionComparisonB5LocalArtifactsV001,
  type DistantConnectionComparisonIndexResponseV001
} from '../src/distant-connection-comparison-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  buildDistantConnectionComparisonSourcePackageFromBytesV001,
  serializeDistantConnectionComparisonSourcePackageV001
} from '../src/distant-connection-comparison-source-package-v001.js';
import {
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001,
  serializeDistantConnectionCommonUtteranceArtifactV001
} from '../src/distant-connection-common-utterance-artifact-v001.js';
import {
  buildSourceVideoTranscriptReuseArtifactFromBytesV001,
  serializeSourceVideoTranscriptReuseArtifactV001
} from '../src/source-video-transcript-reuse-artifact-v001.js';

const workspaceRoot = '/workspace';
const sourceDurationMs = 180_000;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function transcript(sourceVideoId: string): Buffer {
  return Buffer.from(`${JSON.stringify({
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: `${workspaceRoot}/fixtures/${sourceVideoId}.mp4`,
    notes: [],
    generatedAt: '2026-09-01T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: sourceDurationMs / 1_000,
    segmentCount: 3,
    segments: [
      {id: 1, startMs: 1_000, endMs: 3_000, text: '序盤の具体的な宣言です。'},
      {id: 2, startMs: 62_000, endMs: 64_000, text: '中盤の別の出来事です。'},
      {id: 3, startMs: 122_000, endMs: 124_000, text: '後半で宣言が具体的に回収されました。'}
    ],
    speechUnitGroups: [[1], [2], [3]]
  }, null, 2)}\n`, 'utf8');
}

function replayLine(offsetMs: number): string {
  return JSON.stringify({
    replayChatItemAction: {
      videoOffsetTimeMsec: String(offsetMs),
      actions: [{
        addChatItemAction: {
          item: {
            liveChatTextMessageRenderer: {
              message: {runs: [{text: '保存しないコメント本文'}]},
              authorName: {simpleText: '保存しない投稿者'}
            }
          }
        }
      }]
    }
  });
}

function rawChat(): Buffer {
  return Buffer.from(`${[
    0, 1_000, 2_000, 3_000,
    61_000,
    121_000, 122_000, 123_000, 124_000,
    180_000
  ].map(replayLine).join('\n')}\n`, 'utf8');
}

function sourcePackageFixture(sourceVideoId: string) {
  const sourceVideoPath = `fixtures/${sourceVideoId}.mp4`;
  const sourceTranscriptPath = `fixtures/${sourceVideoId}-transcript.json`;
  const sourceReusePath = `outputs/${sourceVideoId}/source-reuse.json`;
  const commonUtterancePath = `outputs/${sourceVideoId}/common-utterances.json`;
  const commentVelocityPath = `outputs/${sourceVideoId}/comment-velocity.json`;
  const sourcePackagePath = `outputs/${sourceVideoId}/source-package.json`;
  const sourceVideoBytes = Buffer.from(`video-bytes:${sourceVideoId}`, 'utf8');
  const sourceTranscriptBytes = transcript(sourceVideoId);
  const sourceReuse = buildSourceVideoTranscriptReuseArtifactFromBytesV001({
    workspaceRoot,
    sourceVideoId,
    sourceVideoPath,
    sourceVideoBytes,
    measuredSourceVideoDurationMs: sourceDurationMs,
    approvedSourceVideoSha256: sha256(sourceVideoBytes),
    approvedSourceVideoDurationMs: sourceDurationMs,
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  const sourceReuseBytes = serializeSourceVideoTranscriptReuseArtifactV001(sourceReuse);
  const commonUtterance = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  const commonUtteranceBytes = serializeDistantConnectionCommonUtteranceArtifactV001(
    commonUtterance
  );
  const rawChatReplayBytes = rawChat();
  const commentVelocity = buildCommentVelocityMinuteSeriesArtifactFromBytesV001({
    analysisId: `comparison-${sourceVideoId}-velocity-v001`,
    sourceVideoId,
    sourceDurationMs,
    rawChatReplayPath: `fixtures/chat/${sourceVideoId}.live_chat.json`,
    rawChatReplayBytes
  });
  const commentVelocityBytes = serializeCommentVelocityMinuteSeriesArtifactV001(commentVelocity);
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001({
    workspaceRoot,
    sourceReusePath,
    sourceReuseBytes,
    commonUtterancePath,
    commonUtteranceBytes,
    commentVelocityPath,
    commentVelocityBytes,
    sourcePackagePath,
    sourceVideoBytes,
    sourceTranscriptBytes,
    rawChatReplayBytes
  });
  const sourcePackageBytes = serializeDistantConnectionComparisonSourcePackageV001(sourcePackage);
  return {sourcePackagePath, sourcePackage, sourcePackageBytes};
}

function b5Input(sourceVideoId = 'source-a') {
  const fixture = sourcePackageFixture(sourceVideoId);
  const indexedModelInput = buildDistantConnectionComparisonIndexedModelInputV001({
    sourcePackagePath: fixture.sourcePackagePath,
    sourcePackageBytes: fixture.sourcePackageBytes
  });
  const indexedModelInputBytes = serializeDistantConnectionComparisonIndexedModelInputV001(
    indexedModelInput
  );
  const indexedModelInputPath = `outputs/${sourceVideoId}/indexed-input.json`;
  const requestPath = `outputs/${sourceVideoId}/exact-request.json`;
  const input: BuildDistantConnectionComparisonB5LocalArtifactsV001 = {
    sourcePackageBinding: {
      path: fixture.sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
      fileSha256: sha256(fixture.sourcePackageBytes)
    },
    sourcePackageBytes: fixture.sourcePackageBytes,
    indexedModelInputBinding: {
      path: indexedModelInputPath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
      fileSha256: sha256(indexedModelInputBytes)
    },
    indexedModelInputBytes,
    requestPath,
    requestSettings: DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001
  };
  return {...fixture, indexedModelInput, indexedModelInputBytes, input};
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionComparisonLunaB5ErrorV001 && error.code === code
  ));
}

function validFutureResponse(): DistantConnectionComparisonIndexResponseV001 {
  return {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
    candidates: [{
      anchorIndex: 0,
      firstPartUtteranceIndexes: [0],
      secondPartUtteranceIndexes: [2],
      addedUnderstanding: '序盤の宣言が後半の具体的な結果として回収されたことが分かります。',
      direction: 'future'
    }]
  };
}

test('一般source packageを正式IDなしの0-based model inputへ投影する', () => {
  const fixture = b5Input();
  const modelInput = fixture.indexedModelInput;
  assert.equal(modelInput.utteranceCount, 3);
  assert.equal(modelInput.anchorCount, 2);
  assert.deepEqual(modelInput.utterances.map((item) => item.utteranceIndex), [0, 1, 2]);
  assert.deepEqual(modelInput.anchors, [
    {anchorIndex: 0, utteranceIndex: 0},
    {anchorIndex: 1, utteranceIndex: 2}
  ]);
  const modelBytesText = fixture.indexedModelInputBytes.toString('utf8');
  assert.equal(modelBytesText.includes('learningContext'), false);
  assert.equal(modelBytesText.includes('rejectedCandidate'), false);
  assert.equal(modelBytesText.includes('sourceSegmentIds'), false);
  assert.match(modelInput.explorationTask.boundaryMeaning, /anchorIndex/u);
  assert.match(modelInput.explorationTask.boundaryMeaning, /firstPartUtteranceIndexes/u);
  assert.match(modelInput.explorationTask.boundaryMeaning, /secondPartUtteranceIndexes/u);
  assert.match(modelInput.explorationTask.boundaryMeaning, /必ず含め/u);
  assert.doesNotMatch(
    JSON.stringify(modelInput.explorationTask),
    /正式(?:意味)?発話ID|正式anchor ID|正式ID|candidate ID|アンカーID/u
  );
  assert.doesNotMatch(
    modelInput.explorationTask.boundaryMeaning,
    /0-based発話index[^。]*返さず/u
  );
  for (const utterance of fixture.sourcePackage.utterances) {
    assert.equal(modelBytesText.includes(utterance.utteranceId), false);
  }
  for (const anchor of fixture.sourcePackage.anchors) {
    assert.equal(modelBytesText.includes(anchor.anchorId), false);
  }
  assert.deepEqual(
    decodeDistantConnectionComparisonIndexedModelInputV001(fixture.indexedModelInputBytes),
    modelInput
  );
});

test('exact requestは固定設定・全index入力・件数境界付きstrict schemaを束縛する', () => {
  const fixture = b5Input();
  const artifacts = buildDistantConnectionComparisonB5LocalArtifactsV001(fixture.input);
  assert.deepEqual(DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001, {
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    operationId: 'responses',
    reasoningEffort: 'medium',
    responseFormatName: 'distant_connection_comparison_index_response_v001',
    store: false
  });
  assert.equal(artifacts.request.model, 'gpt-5.6-luna');
  assert.deepEqual(artifacts.request.reasoning, {effort: 'medium'});
  assert.equal(
    artifacts.request.input,
    serializeDistantConnectionComparisonModelVisiblePayloadV001(
      fixture.indexedModelInput
    ).toString('utf8')
  );
  assert.equal(artifacts.request.store, false);
  assert.match(artifacts.request.instructions, /0始まり/u);
  assert.match(artifacts.request.instructions, /類似照合しない/u);
  assert.match(artifacts.request.instructions, /決定論的処理だけ/u);
  assert.equal(artifacts.request.instructions.includes('learningContext'), false);
  assert.doesNotMatch(
    `${artifacts.request.instructions}\n${artifacts.request.input}`,
    /正式(?:意味)?発話ID|正式anchor ID|正式ID|candidate ID|アンカーID/u
  );
  const candidateSchema = (artifacts.request.text.format.schema as any)
    .properties.candidates.items;
  assert.equal(candidateSchema.additionalProperties, false);
  assert.deepEqual(candidateSchema.properties.anchorIndex, {
    type: 'integer', minimum: 0, maximum: 1
  });
  assert.deepEqual(candidateSchema.properties.firstPartUtteranceIndexes.items, {
    type: 'integer', minimum: 0, maximum: 2
  });
  assert.deepEqual(candidateSchema.properties.secondPartUtteranceIndexes.items, {
    type: 'integer', minimum: 0, maximum: 2
  });
  assert.equal('uniqueItems' in candidateSchema.properties.firstPartUtteranceIndexes, false);
  assert.equal('uniqueItems' in candidateSchema.properties.secondPartUtteranceIndexes, false);
  assert.deepEqual(
    decodeDistantConnectionComparisonExactRequestV001(
      artifacts.requestBytes,
      fixture.indexedModelInput,
      fixture.input.indexedModelInputBinding
    ),
    artifacts.request
  );
});

test('provider可視requestから動画ID・formal path・SHAを除き素材間で同じ投影条件を保つ', () => {
  const sourceA = b5Input('source-a');
  const sourceB = b5Input('source-b');
  const artifactsA = buildDistantConnectionComparisonB5LocalArtifactsV001(sourceA.input);
  const artifactsB = buildDistantConnectionComparisonB5LocalArtifactsV001(sourceB.input);
  const providerVisibleA = `${artifactsA.request.instructions}\n${artifactsA.request.input}`;
  const providerVisibleB = `${artifactsB.request.instructions}\n${artifactsB.request.input}`;
  for (const forbidden of [
    'source-a',
    'source-b',
    sourceA.sourcePackagePath,
    sourceB.sourcePackagePath,
    sourceA.input.indexedModelInputBinding.path,
    sourceB.input.indexedModelInputBinding.path,
    sourceA.input.sourcePackageBinding.fileSha256,
    sourceB.input.sourcePackageBinding.fileSha256,
    sourceA.input.indexedModelInputBinding.fileSha256,
    sourceB.input.indexedModelInputBinding.fileSha256
  ]) {
    assert.equal(providerVisibleA.includes(forbidden), false);
    assert.equal(providerVisibleB.includes(forbidden), false);
  }
  assert.doesNotMatch(providerVisibleA, /[0-9a-f]{64}/u);
  assert.doesNotMatch(providerVisibleB, /[0-9a-f]{64}/u);
  assert.deepEqual(Object.keys(JSON.parse(artifactsA.request.input)), [
    'indexBase', 'explorationTask', 'utterances', 'anchors', 'responseContract'
  ]);
  assert.deepEqual(artifactsA.requestBytes, artifactsB.requestBytes);
  assert.notDeepEqual(
    artifactsA.manifest.sourcePackageBinding,
    artifactsB.manifest.sourcePackageBinding
  );
});

test('manifestはsource・index入力・exact requestとB6同一request条件を束縛する', () => {
  const fixture = b5Input();
  const artifacts = buildDistantConnectionComparisonB5LocalArtifactsV001(fixture.input);
  assert.equal(
    artifacts.manifest.schemaVersion,
    DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001
  );
  assert.deepEqual(artifacts.manifest.sourcePackageBinding, fixture.input.sourcePackageBinding);
  assert.deepEqual(
    artifacts.manifest.indexedModelInputBinding,
    fixture.input.indexedModelInputBinding
  );
  assert.deepEqual(artifacts.manifest.requestBinding, {
    path: fixture.input.requestPath,
    schemaVersion: DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
    fileSha256: sha256(artifacts.requestBytes)
  });
  assert.deepEqual(
    artifacts.manifest.b6ContinuationContract.requiredRequestBinding,
    artifacts.manifest.requestBinding
  );
  assert.deepEqual(
    decodeDistantConnectionComparisonB5LocalManifestV001(artifacts.manifestBytes),
    artifacts.manifest
  );
  assert.doesNotThrow(() => assertDistantConnectionComparisonB6RequestBindingV001(
    artifacts.manifest,
    artifacts.manifest.requestBinding,
    artifacts.requestBytes
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionComparisonB6RequestBindingV001(
      artifacts.manifest,
      artifacts.manifest.requestBinding,
      Buffer.from('different-request', 'utf8')
    )
  ));
});

test('同じ入力はindex input・request・manifestをbyte単位で決定的に再構築する', () => {
  const firstFixture = b5Input();
  const secondFixture = b5Input();
  assert.deepEqual(firstFixture.indexedModelInputBytes, secondFixture.indexedModelInputBytes);
  const first = buildDistantConnectionComparisonB5LocalArtifactsV001(firstFixture.input);
  const second = buildDistantConnectionComparisonB5LocalArtifactsV001(secondFixture.input);
  assert.deepEqual(first.requestBytes, second.requestBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.doesNotThrow(() => validateDistantConnectionComparisonB5LocalArtifactsV001(
    first,
    firstFixture.input
  ));
});

test('返却objectだけを改変してformal byteを残す不整合を検査時に拒否する', () => {
  const fixture = b5Input();
  const artifacts = buildDistantConnectionComparisonB5LocalArtifactsV001(fixture.input);
  expectCode('REQUEST_INVALID', () => (
    validateDistantConnectionComparisonB5LocalArtifactsV001({
      ...artifacts,
      request: {...artifacts.request, input: `${artifacts.request.input} `}
    }, fixture.input)
  ));

  const changedPath = 'outputs/source-a/changed-exact-request.json';
  const changedRequestBinding = {
    ...artifacts.manifest.requestBinding,
    path: changedPath
  };
  expectCode('MANIFEST_INVALID', () => (
    validateDistantConnectionComparisonB5LocalArtifactsV001({
      ...artifacts,
      manifest: {
        ...artifacts.manifest,
        requestBinding: changedRequestBinding,
        b6ContinuationContract: {
          requiredRequestBinding: {...changedRequestBinding}
        }
      }
    }, fixture.input)
  ));
});

test('source・index入力のpath/SHA/schema/導出差を送信前に拒否する', () => {
  const fixture = b5Input();
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    buildDistantConnectionComparisonB5LocalArtifactsV001({
      ...fixture.input,
      sourcePackageBinding: {
        ...fixture.input.sourcePackageBinding,
        fileSha256: '0'.repeat(64)
      }
    })
  ));
  expectCode('SOURCE_PACKAGE_PATH_MISMATCH', () => (
    buildDistantConnectionComparisonIndexedModelInputV001({
      sourcePackagePath: 'outputs/other/source-package.json',
      sourcePackageBytes: fixture.sourcePackageBytes
    })
  ));
  expectCode('INDEXED_MODEL_INPUT_SHA_MISMATCH', () => (
    buildDistantConnectionComparisonB5LocalArtifactsV001({
      ...fixture.input,
      indexedModelInputBinding: {
        ...fixture.input.indexedModelInputBinding,
        fileSha256: '0'.repeat(64)
      }
    })
  ));
  const altered = structuredClone(fixture.indexedModelInput);
  altered.utterances[0]!.text = 'source packageから導出されない本文';
  const alteredBytes = serializeDistantConnectionComparisonIndexedModelInputV001(altered);
  expectCode('INDEXED_MODEL_INPUT_BINDING_MISMATCH', () => (
    buildDistantConnectionComparisonB5LocalArtifactsV001({
      ...fixture.input,
      indexedModelInputBinding: {
        ...fixture.input.indexedModelInputBinding,
        fileSha256: sha256(alteredBytes)
      },
      indexedModelInputBytes: alteredBytes
    })
  ));
});

test('model/reasoning/schema/余分なfieldの差し替えをfail-closedで拒否する', () => {
  const fixture = b5Input();
  expectCode('REQUEST_SETTINGS_MISMATCH', () => (
    buildDistantConnectionComparisonB5LocalArtifactsV001({
      ...fixture.input,
      requestSettings: {
        ...DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001,
        reasoningEffort: 'low'
      } as any
    })
  ));
  const artifacts = buildDistantConnectionComparisonB5LocalArtifactsV001(fixture.input);
  const schemaChanged = structuredClone(artifacts.request) as any;
  schemaChanged.text.format.schema.properties.candidates.items
    .properties.anchorIndex.maximum = 99;
  expectCode('RESPONSE_SCHEMA_BINDING_MISMATCH', () => (
    assertDistantConnectionComparisonExactRequestV001(
      schemaChanged,
      fixture.indexedModelInput,
      fixture.input.indexedModelInputBinding
    )
  ));
  expectCode('REQUEST_INVALID', () => (
    assertDistantConnectionComparisonExactRequestV001(
      {...artifacts.request, extra: true},
      fixture.indexedModelInput,
      fixture.input.indexedModelInputBinding
    )
  ));
  expectCode('MANIFEST_INVALID', () => (
    assertDistantConnectionComparisonB5LocalManifestV001({
      ...artifacts.manifest,
      extra: true
    })
  ));
});

test('index返答を範囲・重複・時系列・directionで検査して正式IDへ決定解決する', () => {
  const fixture = b5Input();
  const response = validFutureResponse();
  assert.doesNotThrow(() => assertDistantConnectionComparisonIndexResponseV001(
    response,
    fixture.indexedModelInput
  ));
  const resolved = resolveDistantConnectionComparisonIndexResponseV001(
    response,
    fixture.indexedModelInput,
    {
      sourcePackagePath: fixture.sourcePackagePath,
      sourcePackageBytes: fixture.sourcePackageBytes
    }
  );
  assert.deepEqual(resolved[0], {
    candidateId: deriveDistantConnectionComparisonCandidateIdV001(
      fixture.sourcePackage.sourceVideoId,
      sha256(fixture.sourcePackageBytes),
      response.candidates[0]!
    ),
    sourceVideoId: 'source-a',
    anchorId: 'comparison-anchor-000001',
    firstPartUtteranceIds: ['common-utterance-000001'],
    secondPartUtteranceIds: ['common-utterance-000003'],
    addedUnderstanding: response.candidates[0]!.addedUnderstanding,
    direction: 'future'
  });
  assert.doesNotThrow(() => assertDistantConnectionComparisonIndexResponseV001({
    schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
    candidates: [{
      ...response.candidates[0]!,
      anchorIndex: 1,
      direction: 'past'
    }]
  }, fixture.indexedModelInput));

  const cases: Array<[string, unknown]> = [
    ['INDEX_OUT_OF_RANGE', {...response.candidates[0], anchorIndex: 2}],
    ['INDEX_NOT_INTEGER', {...response.candidates[0], anchorIndex: 0.5}],
    ['INDEX_DUPLICATE', {...response.candidates[0], firstPartUtteranceIndexes: [0, 0]}],
    ['INDEX_ORDER_REVERSED', {
      ...response.candidates[0], firstPartUtteranceIndexes: [1], secondPartUtteranceIndexes: [0]
    }],
    ['INDEX_DUPLICATE', {
      ...response.candidates[0], firstPartUtteranceIndexes: [0], secondPartUtteranceIndexes: [0]
    }],
    ['ANCHOR_DIRECTION_MISMATCH', {...response.candidates[0], direction: 'past'}],
    ['INDEX_RESPONSE_INVALID', {...response.candidates[0], extra: true}]
  ];
  for (const [code, candidate] of cases) {
    expectCode(code, () => assertDistantConnectionComparisonIndexResponseV001({
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
      candidates: [candidate]
    }, fixture.indexedModelInput));
  }
  expectCode('CANDIDATE_REFERENCE_DUPLICATE', () => (
    assertDistantConnectionComparisonIndexResponseV001({
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
      candidates: [response.candidates[0], {...response.candidates[0]}]
    }, fixture.indexedModelInput)
  ));
});

test('同じindex参照でも異なるsource identityは異なるcandidate IDになる', () => {
  const sourceA = b5Input('source-a');
  const sourceB = b5Input('source-b');
  const reference = validFutureResponse().candidates[0]!;
  const sourceAId = deriveDistantConnectionComparisonCandidateIdV001(
    sourceA.sourcePackage.sourceVideoId,
    sha256(sourceA.sourcePackageBytes),
    reference
  );
  const sourceBId = deriveDistantConnectionComparisonCandidateIdV001(
    sourceB.sourcePackage.sourceVideoId,
    sha256(sourceB.sourcePackageBytes),
    reference
  );
  assert.notEqual(sourceAId, sourceBId);
  assert.equal(sourceAId, deriveDistantConnectionComparisonCandidateIdV001(
    sourceA.sourcePackage.sourceVideoId,
    sha256(sourceA.sourcePackageBytes),
    {...reference, addedUnderstanding: '説明文だけが変わりました。'}
  ));
});

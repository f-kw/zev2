import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {link, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildCommentVelocityMinuteSeriesArtifactFromBytesV001,
  serializeCommentVelocityMinuteSeriesArtifactV001
} from '../src/comment-velocity-minute-series-artifact-v001.js';
import {
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001,
  serializeDistantConnectionCommonUtteranceArtifactV001
} from '../src/distant-connection-common-utterance-artifact-v001.js';
import {
  DistantConnectionComparisonSourcePackageErrorV001,
  assertDistantConnectionComparisonSourcePackageV001,
  buildDistantConnectionComparisonSourcePackageFromBytesV001,
  buildDistantConnectionComparisonSourcePackageFromFilesV001,
  decodeDistantConnectionComparisonSourcePackageV001,
  serializeDistantConnectionComparisonSourcePackageV001,
  validateDistantConnectionComparisonSourcePackageAgainstBytesV001,
  writeDistantConnectionComparisonSourcePackageFromFilesV001,
  type BuildDistantConnectionComparisonSourcePackageFromBytesInputV001
} from '../src/distant-connection-comparison-source-package-v001.js';
import {
  buildSourceVideoTranscriptReuseArtifactFromBytesV001,
  serializeSourceVideoTranscriptReuseArtifactV001,
  type SourceVideoTranscriptReuseArtifactV001
} from '../src/source-video-transcript-reuse-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourceTranscriptPath = 'fixtures/source/transcript.json';
const sourceReusePath = 'fixtures/formal/source-reuse-v001.json';
const commonUtterancePath = 'fixtures/formal/common-utterances-v001.json';
const commentVelocityPath = 'fixtures/formal/comment-velocity-v001.json';
const sourcePackagePath = 'fixtures/formal/comparison-source-package-v001.json';
const sourceVideoBytes = Buffer.from('source-video-bytes', 'utf8');
const sourceVideoSha256 = createHash('sha256').update(sourceVideoBytes).digest('hex');

function transcript(
  sourceVideoId = 'source',
  durationMs = 180_000,
  segments: Array<{id: number; startMs: number; endMs: number; text: string}> = [
    {id: 1, startMs: 0, endMs: 60_000, text: '境界の手前。'},
    {id: 2, startMs: 60_000, endMs: 90_000, text: '盛り上がり前半。'},
    {id: 3, startMs: 90_000, endMs: 120_000, text: '盛り上がり後半。'},
    {id: 4, startMs: 120_000, endMs: 130_000, text: '境界の後ろ。'}
  ],
  extra: Record<string, unknown> = {}
): Buffer {
  return Buffer.from(`${JSON.stringify({
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: `/workspace/fixtures/${sourceVideoId}.mp4`,
    notes: [],
    generatedAt: '2026-09-01T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: durationMs / 1000,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: segments.map((segment) => [segment.id]),
    ...extra
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
              message: {runs: [{text: '保存対象外'}]},
              authorName: {simpleText: '保存対象外'}
            }
          }
        }
      }]
    }
  });
}

function rawChatForMinuteCounts(counts: number[], durationMs: number): Buffer {
  const lines: string[] = [];
  for (const [minuteIndex, count] of counts.entries()) {
    for (let index = 0; index < count; index += 1) {
      lines.push(replayLine(minuteIndex * 60_000 + 1_000 + index));
    }
  }
  lines.push(replayLine(durationMs));
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function makeInput(options: {
  sourceVideoId?: string;
  durationMs?: number;
  segments?: Array<{id: number; startMs: number; endMs: number; text: string}>;
  minuteCounts?: number[];
  transcriptExtra?: Record<string, unknown>;
} = {}): BuildDistantConnectionComparisonSourcePackageFromBytesInputV001 {
  const sourceVideoId = options.sourceVideoId ?? 'source';
  const durationMs = options.durationMs ?? 180_000;
  const sourceTranscriptBytes = transcript(
    sourceVideoId,
    durationMs,
    options.segments,
    options.transcriptExtra
  );
  const sourceReuse = buildSourceVideoTranscriptReuseArtifactFromBytesV001({
    workspaceRoot: '/workspace',
    sourceVideoId,
    sourceVideoPath: `fixtures/${sourceVideoId}.mp4`,
    sourceVideoBytes,
    measuredSourceVideoDurationMs: durationMs,
    approvedSourceVideoSha256: sourceVideoSha256,
    approvedSourceVideoDurationMs: durationMs,
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  const commonUtterances =
    buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
      sourceTranscriptPath,
      sourceTranscriptBytes
    });
  const rawChatReplayBytes = rawChatForMinuteCounts(
    options.minuteCounts ?? [1, 4, 1],
    durationMs
  );
  const commentVelocity = buildCommentVelocityMinuteSeriesArtifactFromBytesV001({
    analysisId: `${sourceVideoId}-comparison-comment-velocity-v001`,
    sourceVideoId,
    sourceDurationMs: durationMs,
    rawChatReplayPath: `fixtures/chat/${sourceVideoId}.live_chat.json`,
    rawChatReplayBytes
  });
  return {
    workspaceRoot: '/workspace',
    sourceReusePath,
    sourceReuseBytes: serializeSourceVideoTranscriptReuseArtifactV001(sourceReuse),
    commonUtterancePath,
    commonUtteranceBytes: serializeDistantConnectionCommonUtteranceArtifactV001(commonUtterances),
    commentVelocityPath,
    commentVelocityBytes: serializeCommentVelocityMinuteSeriesArtifactV001(commentVelocity),
    sourcePackagePath,
    sourceVideoBytes,
    sourceTranscriptBytes,
    rawChatReplayBytes
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionComparisonSourcePackageErrorV001
      && error.code === code
  ));
}

test('3正式成果物を束縛し、完全1分かつ配信内基準より多い区間だけを選ぶ', () => {
  const input = makeInput();
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(input);

  assert.equal(sourcePackage.sourceVideoId, 'source');
  assert.deepEqual(sourcePackage.selectionPolicy, {
    minuteDurationMs: 60_000,
    fullMinutesOnly: true,
    relativeToStreamBaselineOperator: 'strictly-greater-than',
    relativeToStreamBaselineReferenceValue: 1,
    topNUsed: false
  });
  assert.deepEqual(sourcePackage.plannedExecution, {
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    operationId: 'responses',
    reasoningEffort: 'medium',
    store: false
  });
  assert.equal(sourcePackage.selectedMinuteCount, 1);
  assert.deepEqual(sourcePackage.selectedMinutes, [{
    minuteIndex: 1,
    sourceStartMs: 60_000,
    sourceEndMs: 120_000,
    commentCount: 4,
    relativeToStreamBaseline: 2
  }]);
  assert.equal(sourcePackage.utteranceCount, 4);
  assert.equal(sourcePackage.anchorCount, 2);
  assert.deepEqual(
    sourcePackage.anchors.map((anchor) => anchor.utteranceId),
    ['common-utterance-000002', 'common-utterance-000003']
  );
  assert.equal(sourcePackage.responseContract.referenceMode, 'zero-based-index-only-v001');
  assert.equal(
    sourcePackage.responseContract.formalIdResolution,
    'deterministic-local-only-v001'
  );
});

test('配信内基準と同値の完全1分と、基準超えでも最後の1分未満の区間を選ばない', () => {
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(makeInput({
    durationMs: 245_000,
    minuteCounts: [3, 6, 3, 0, 10]
  }));
  assert.deepEqual(sourcePackage.selectedMinutes.map((minute) => minute.minuteIndex), [1]);
  assert.equal(sourcePackage.selectedMinutes[0]!.relativeToStreamBaseline, 2);
});

test('境界時刻が接するだけの発話を除外し、正の時間交差だけをanchorにする', () => {
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(makeInput());
  const anchoredIds = new Set(sourcePackage.anchors.map((anchor) => anchor.utteranceId));
  assert.equal(anchoredIds.has('common-utterance-000001'), false);
  assert.equal(anchoredIds.has('common-utterance-000002'), true);
  assert.equal(anchoredIds.has('common-utterance-000003'), true);
  assert.equal(anchoredIds.has('common-utterance-000004'), false);
});

test('同じ発話が複数の選択区間へ重なる場合もanchorは1件で根拠区間を全件保持する', () => {
  const input = makeInput({
    durationMs: 240_000,
    minuteCounts: [4, 4, 1, 1],
    segments: [
      {id: 1, startMs: 59_000, endMs: 120_100, text: '二つの盛り上がり区間を跨ぐ。'},
      {id: 2, startMs: 180_000, endMs: 200_000, text: '対象外。'}
    ]
  });
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(input);
  assert.equal(sourcePackage.selectedMinuteCount, 2);
  assert.equal(sourcePackage.anchorCount, 1);
  assert.equal(sourcePackage.anchors[0]!.utteranceId, 'common-utterance-000001');
  assert.deepEqual(
    sourcePackage.anchors[0]!.evidenceRanges.map((range) => range.minuteIndex),
    [0, 1]
  );
});

test('元動画、動画尺、transcript path/schema/SHA/sourceの不一致をfail-closedする', () => {
  const base = makeInput();
  const otherVideo = makeInput({sourceVideoId: 'other'});
  expectCode('SOURCE_VIDEO_MISMATCH', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      commentVelocityBytes: otherVideo.commentVelocityBytes,
      rawChatReplayBytes: otherVideo.rawChatReplayBytes
    })
  ));

  const otherDuration = makeInput({
    durationMs: 240_000,
    minuteCounts: [1, 4, 1, 1],
    segments: [
      {id: 1, startMs: 0, endMs: 60_000, text: '前。'},
      {id: 2, startMs: 60_000, endMs: 120_000, text: '中。'},
      {id: 3, startMs: 120_000, endMs: 180_000, text: '後。'}
    ]
  });
  expectCode('SOURCE_DURATION_MISMATCH', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      commentVelocityBytes: otherDuration.commentVelocityBytes,
      rawChatReplayBytes: otherDuration.rawChatReplayBytes
    })
  ));

  const changedTranscript = makeInput({transcriptExtra: {notes: ['byte changed']}});
  expectCode('COMMON_UTTERANCE_INVALID', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      commonUtteranceBytes: changedTranscript.commonUtteranceBytes
    })
  ));
});

test('anchorの未知発話、重複、欠落、順序、根拠欠落を拒否する', () => {
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(makeInput());

  const unknown = structuredClone(sourcePackage);
  unknown.anchors[0]!.utteranceId = 'common-utterance-999999';
  expectCode('ANCHOR_UNKNOWN_UTTERANCE', () => (
    assertDistantConnectionComparisonSourcePackageV001(unknown)
  ));

  const duplicate = structuredClone(sourcePackage);
  duplicate.anchors[1]!.utteranceId = duplicate.anchors[0]!.utteranceId;
  expectCode('ANCHOR_DUPLICATE', () => (
    assertDistantConnectionComparisonSourcePackageV001(duplicate)
  ));

  const missing = structuredClone(sourcePackage);
  missing.anchors.pop();
  missing.anchorCount = 1;
  expectCode('ANCHOR_MISSING', () => (
    assertDistantConnectionComparisonSourcePackageV001(missing)
  ));

  const reversed = structuredClone(sourcePackage);
  const firstUtteranceId = reversed.anchors[0]!.utteranceId;
  reversed.anchors[0]!.utteranceId = reversed.anchors[1]!.utteranceId;
  reversed.anchors[1]!.utteranceId = firstUtteranceId;
  expectCode('ANCHOR_MISSING', () => (
    assertDistantConnectionComparisonSourcePackageV001(reversed)
  ));

  const evidenceMissing = structuredClone(sourcePackage);
  evidenceMissing.anchors[0]!.evidenceRanges = [];
  expectCode('ANCHOR_EVIDENCE_MISMATCH', () => (
    assertDistantConnectionComparisonSourcePackageV001(evidenceMissing)
  ));
});

test('一般探索条件だけを持ち、ym固有履歴・候補・IDを持ち込まない', () => {
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001(makeInput());
  const serialized = serializeDistantConnectionComparisonSourcePackageV001(sourcePackage)
    .toString('utf8');
  for (const forbidden of [
    'ymUsGrT6EaA',
    'learningContext',
    'humanVerdict',
    'duplicateAudit',
    'priorUseCount',
    'candidate-horror',
    '同じ前半を4回'
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(sourcePackage.explorationTask, {
    objective:
      '各コメント流量アンカーについて、配信全文から時間的に離れた過去または未来の相方を探してください。前振りと回収、予告と実現、原因と後の結果、過去の発言と後の反応、認識・予想と後の出来事、約束・宣言と後の実行、疑問と後の答え、以前の出来事によって後の意味が変わる関係は例であり、閉じた分類ではありません。前半の具体的な情報、出来事、予告、認識または判断が、後半の具体的な出来事、回収、変化、反応または結果として現れ、前から後の順に短く見る価値が生まれる接続だけを候補にしてください。',
    anchorInstruction:
      'directionはanchorから見た相方の位置を表します。futureの場合はanchor発話をfirstPartに含め、相方を未来側のsecondPartに置いてください。pastの場合はanchor発話をsecondPartに含め、相方を過去側のfirstPartに置いてください。anchorと発話は入力にある0-based indexだけで参照してください。',
    returnInstruction:
      '同じゲーム、人物、設定または話題に属するだけ、一般的な背景説明が後半にも当てはまるだけ、単なるオープニングとエンディングの対応、または冒頭の一般説明と終了時総括が時系列上で対称なだけの接続は返さないでください。後半が同じ対象に触れるだけ、前半を単に言い換える、確認する、または自然な具体例として示すだけでも不十分です。前半を外しても後半の理解や面白さがほぼ変わらない接続は返さないでください。前半の具体的な内容が後半の具体的な出来事、反応または結果によって強く回収され、前半を付けることで後半の理解、回収感、意外性または面白さの少なくとも一つが明確に増える必要があります。一般説明そのものは禁止しませんが、後半が具体的に強く回収する場合だけ候補にしてください。普通の視聴者が前半から後半だけを短尺で見て接続を理解でき、外部説明を必要としない候補だけを返してください。意味関係を理解する前提情報が短尺として自然な長さに収まり、長い説明、複雑な前提または大幅な区間拡張を必要としないことも条件です。',
    boundaryMeaning:
      '返す0-based発話indexは意味探索の根拠であり、完成動画の最終切り出し位置ではありません。必要最小限の導入文脈や自然な終端は後続の区間化工程が決めます。正式発話ID、正式anchor IDおよびcandidate IDは返さず、入力範囲内のindexだけを返してください。正式IDへの解決は後続の決定論的なローカル処理だけが行います。'
  });
});

test('3正式成果物がformalでも元動画・transcript・raw chat byteから再構築できなければ拒否する', () => {
  const base = makeInput();
  const fakeVideoBytes = Buffer.from('different-source-video-bytes', 'utf8');
  const fakeVideoSha256 = createHash('sha256').update(fakeVideoBytes).digest('hex');
  const fakeSourceReuse = buildSourceVideoTranscriptReuseArtifactFromBytesV001({
    workspaceRoot: base.workspaceRoot,
    sourceVideoId: 'source',
    sourceVideoPath: 'fixtures/source.mp4',
    sourceVideoBytes: fakeVideoBytes,
    measuredSourceVideoDurationMs: 180_000,
    approvedSourceVideoSha256: fakeVideoSha256,
    approvedSourceVideoDurationMs: 180_000,
    sourceTranscriptPath,
    sourceTranscriptBytes: base.sourceTranscriptBytes
  });
  expectCode('SOURCE_REUSE_INVALID', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      sourceReuseBytes: serializeSourceVideoTranscriptReuseArtifactV001(fakeSourceReuse)
    })
  ));

  const fakeTranscriptBytes = transcript('source', 180_000, [
    {id: 1, startMs: 0, endMs: 60_000, text: '改変された前半。'},
    {id: 2, startMs: 60_000, endMs: 90_000, text: '盛り上がり前半。'},
    {id: 3, startMs: 90_000, endMs: 120_000, text: '盛り上がり後半。'},
    {id: 4, startMs: 120_000, endMs: 130_000, text: '境界の後ろ。'}
  ]);
  const fakeCommon = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath,
    sourceTranscriptBytes: fakeTranscriptBytes
  });
  expectCode('COMMON_UTTERANCE_INVALID', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      commonUtteranceBytes: serializeDistantConnectionCommonUtteranceArtifactV001(fakeCommon)
    })
  ));

  const fakeRawChatReplayBytes = rawChatForMinuteCounts([1, 5, 1], 180_000);
  const fakeVelocity = buildCommentVelocityMinuteSeriesArtifactFromBytesV001({
    analysisId: 'source-comparison-comment-velocity-v001',
    sourceVideoId: 'source',
    sourceDurationMs: 180_000,
    rawChatReplayPath: 'fixtures/chat/source.live_chat.json',
    rawChatReplayBytes: fakeRawChatReplayBytes
  });
  expectCode('COMMENT_VELOCITY_INVALID', () => (
    buildDistantConnectionComparisonSourcePackageFromBytesV001({
      ...base,
      commentVelocityBytes: serializeCommentVelocityMinuteSeriesArtifactV001(fakeVelocity)
    })
  ));
});

test('同一入力は同一formal byteとなり、余分なfield・binding差・非formal byteを拒否する', () => {
  const input = makeInput();
  const first = buildDistantConnectionComparisonSourcePackageFromBytesV001(input);
  const second = buildDistantConnectionComparisonSourcePackageFromBytesV001(input);
  const firstBytes = serializeDistantConnectionComparisonSourcePackageV001(first);
  assert.deepEqual(firstBytes, serializeDistantConnectionComparisonSourcePackageV001(second));
  const decoded = decodeDistantConnectionComparisonSourcePackageV001(firstBytes);
  validateDistantConnectionComparisonSourcePackageAgainstBytesV001(decoded, input);

  expectCode('SOURCE_PACKAGE_INVALID', () => (
    assertDistantConnectionComparisonSourcePackageV001({...decoded, unexpected: true})
  ));
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    decodeDistantConnectionComparisonSourcePackageV001(
      Buffer.from(JSON.stringify(decoded), 'utf8')
    )
  ));
  expectCode('SOURCE_PACKAGE_BINDING_MISMATCH', () => (
    validateDistantConnectionComparisonSourcePackageAgainstBytesV001(decoded, {
      ...input,
      sourceReusePath: 'fixtures/formal/other-source-reuse-v001.json'
    })
  ));
});

test('書き出し先とsource package内の正式pathが異なる場合は配置前に拒否する', async () => {
  await assert.rejects(
    writeDistantConnectionComparisonSourcePackageFromFilesV001({
      workspaceRoot,
      sourceReusePath,
      commonUtterancePath,
      commentVelocityPath,
      sourcePackagePath,
      outputPath: 'fixtures/formal/different-source-package-v001.json'
    }),
    (error: unknown) => (
      error instanceof DistantConnectionComparisonSourcePackageErrorV001
        && error.code === 'INPUT_INVALID'
    )
  );
});

test('実ym file経路を元動画・transcript・raw chatから再検査し、同じ固定条件で44区間を選ぶ', async (context) => {
  const repositoryTranscriptPath =
    'evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source/transcript.json';
  const repositoryRawChatPath =
    'evals/clip_composition/research/chat-replay/distant-connection-real/ymUsGrT6EaA/ymUsGrT6EaA.live_chat.json';
  const repositoryVideoPath =
    'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
  const [sourceTranscriptBytes, rawChatReplayBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, repositoryTranscriptPath)),
    readFile(path.join(workspaceRoot, repositoryRawChatPath))
  ]);
  const transcriptValue = JSON.parse(sourceTranscriptBytes.toString('utf8')) as {
    mode: SourceVideoTranscriptReuseArtifactV001['sourceTranscriptBinding']['mode'];
    sourceUri: string;
    durationSec: number;
    segments: Array<{id: number; startMs: number; endMs: number; text: string}>;
    speechUnitGroups: number[][];
  };
  const durationMs = Math.round(transcriptValue.durationSec * 1000);
  const transcriptSha256 = createHash('sha256').update(sourceTranscriptBytes).digest('hex');
  const temporaryWorkspace = await mkdtemp(path.join(tmpdir(), 'comparison-source-package-'));
  context.after(async () => rm(temporaryWorkspace, {recursive: true, force: true}));
  const temporaryVideoPath = 'inputs/ymUsGrT6EaA.mp4';
  const temporaryTranscriptPath = 'inputs/transcript.json';
  const temporaryRawChatPath = 'inputs/ymUsGrT6EaA.live_chat.json';
  const temporarySourceReusePath = 'formal/source-reuse-v001.json';
  const temporaryCommonPath = 'formal/common-utterance-v001.json';
  const temporaryVelocityPath = 'formal/comment-velocity-v001.json';
  await Promise.all([
    mkdir(path.join(temporaryWorkspace, 'inputs'), {recursive: true}),
    mkdir(path.join(temporaryWorkspace, 'formal'), {recursive: true})
  ]);
  await Promise.all([
    link(path.join(workspaceRoot, repositoryVideoPath), path.join(temporaryWorkspace, temporaryVideoPath)),
    link(path.join(workspaceRoot, repositoryTranscriptPath), path.join(temporaryWorkspace, temporaryTranscriptPath)),
    link(path.join(workspaceRoot, repositoryRawChatPath), path.join(temporaryWorkspace, temporaryRawChatPath))
  ]);
  const sourceReuse: SourceVideoTranscriptReuseArtifactV001 = {
    schemaVersion: 'source-video-transcript-reuse-artifact-v001',
    sourceVideoId: 'ymUsGrT6EaA',
    sourceVideoBinding: {
      path: temporaryVideoPath,
      fileSha256: '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537',
      measuredDurationMs: durationMs
    },
    approvedSourceIdentity: {
      fileSha256: '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537',
      durationMs
    },
    sourceTranscriptBinding: {
      path: temporaryTranscriptPath,
      schemaVersion: 'transcript-json-v001',
      fileSha256: transcriptSha256,
      mode: transcriptValue.mode,
      sourceUri: transcriptValue.sourceUri,
      durationNormalization: 'nearest-millisecond-v001',
      durationMs
    },
    transcriptCoverage: {
      segmentCount: transcriptValue.segments.length,
      speechUnitGroupCount: transcriptValue.speechUnitGroups.length,
      coveredSegmentCount: transcriptValue.segments.length,
      firstSegmentStartMs: transcriptValue.segments[0]!.startMs,
      lastSegmentEndMs: transcriptValue.segments.at(-1)!.endMs
    }
  };
  const commonUtterances =
    buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
      sourceTranscriptPath: temporaryTranscriptPath,
      sourceTranscriptBytes
    });
  const commentVelocity = buildCommentVelocityMinuteSeriesArtifactFromBytesV001({
    analysisId: 'ymUsGrT6EaA-comparison-comment-velocity-v001',
    sourceVideoId: 'ymUsGrT6EaA',
    sourceDurationMs: durationMs,
    rawChatReplayPath: temporaryRawChatPath,
    rawChatReplayBytes
  });
  await Promise.all([
    writeFile(
      path.join(temporaryWorkspace, temporarySourceReusePath),
      serializeSourceVideoTranscriptReuseArtifactV001(sourceReuse)
    ),
    writeFile(
      path.join(temporaryWorkspace, temporaryCommonPath),
      serializeDistantConnectionCommonUtteranceArtifactV001(commonUtterances)
    ),
    writeFile(
      path.join(temporaryWorkspace, temporaryVelocityPath),
      serializeCommentVelocityMinuteSeriesArtifactV001(commentVelocity)
    )
  ]);
  const sourcePackage = await buildDistantConnectionComparisonSourcePackageFromFilesV001({
    workspaceRoot: temporaryWorkspace,
    sourceReusePath: temporarySourceReusePath,
    commonUtterancePath: temporaryCommonPath,
    commentVelocityPath: temporaryVelocityPath,
    sourcePackagePath: 'formal/comparison-source-package-v001.json'
  });
  assert.equal(sourcePackage.utteranceCount, 431);
  assert.equal(sourcePackage.selectedMinuteCount, 44);
  assert.ok(sourcePackage.anchorCount > 0);
  assert.ok(sourcePackage.anchors.every((anchor) => anchor.evidenceRanges.length > 0));
});

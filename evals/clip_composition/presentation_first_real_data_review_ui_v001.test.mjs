import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import {
  PRESENTATION_FIRST_REAL_DATA_REVIEW_PAGE_SCHEMA_V001,
  buildPresentationFirstRealDataHumanReviewResultV001,
  buildPresentationFirstRealDataReviewPayloadV001,
  buildPresentationFirstRealDataReviewHtmlV001,
  derivePresentationFirstRealDataSegmentsV001,
  presentationFirstRealDataRequiredPlaybackIdsV001,
  validatePresentationFirstRealDataReviewPageV001,
} from './presentation_first_real_data_review_ui_v001.mjs';
import {
  PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
  PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
  buildPresentationAssemblyDecisionSavePreflightV001,
  validatePresentationInternalTrimHumanReviewResultV001,
} from './presentation_first_real_data_gate_v001.mjs';

const hash = (character) => character.repeat(64);
const ACTUAL_REVIEW_PAGE_PATH = resolve(
  'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/review-page.json',
);
const PREFLIGHT_TEST_DIRECTORY = resolve(
  'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001',
);

const utterance = (utteranceId, startMs, characters) => ({
  utteranceId,
  startMs,
  endMs: characters.at(-1).endMs,
  text: characters.map((character) => character.text).join(''),
  characters,
});

const character = (characterId, text, startMs, endMs) => ({characterId, text, startMs, endMs});

const makePage = () => {
  const firstBefore = utterance('utterance-before-1', 1_920_260, [
    character('b1-1', '母', 1_920_260, 1_930_000),
    character('b1-2', 'ち', 1_930_000, 1_940_000),
    character('b1-3', 'ゃ', 1_940_000, 1_948_058),
  ]);
  const middle = utterance('utterance-middle', 1_949_982, [
    character('m-1', '月', 1_949_982, 1_960_000),
    character('m-2', '刊', 1_960_000, 1_970_000),
    character('m-3', 'ム', 1_970_000, 1_975_000),
    character('m-4', 'ー', 1_975_000, 1_977_670),
  ]);
  const secondAfter = utterance('utterance-after-2', 1_981_394, [
    character('a2-1', '面', 1_981_394, 1_990_000),
    character('a2-2', '白', 1_990_000, 2_000_000),
    character('a2-3', 'い', 2_000_000, 2_008_506),
  ]);
  return {
    schemaVersion: PRESENTATION_FIRST_REAL_DATA_REVIEW_PAGE_SCHEMA_V001,
    pageId: 'DmWu0jVQfTE-candidate-13-internal-trim-v001',
    pageRevision: 'synthetic-v001',
    draftStorageKey: 'zev-presentation-first-real-data-review-v001-synthetic',
    media: {
      sourceId: 'DmWu0jVQfTE',
      url: '/media/DmWu0jVQfTE-native1080p.mp4',
      fileSha256: hash('a'),
      durationMs: 8_814_021,
    },
    candidate: {
      candidateId: 13,
      title: '実家の母ちゃんから届いた謎の仕送り「月刊ムー」',
      startMs: 1_920_260,
      endMs: 2_008_506,
    },
    gaps: [
      {
        gapId: 'gap-01',
        label: '発話間1',
        startMs: 1_948_058,
        endMs: 1_949_982,
        protectionReason: '発話まとまり境界',
        localRange: {startMs: 1_920_260, endMs: 1_977_670},
        beforeUtterance: firstBefore,
        afterUtterance: middle,
        machineBoundary: {leftCharacterId: 'b1-3', rightCharacterId: 'm-1'},
      },
      {
        gapId: 'gap-02',
        label: '発話間2',
        startMs: 1_977_670,
        endMs: 1_981_394,
        protectionReason: '話者不明',
        localRange: {startMs: 1_949_982, endMs: 2_008_506},
        beforeUtterance: middle,
        afterUtterance: secondAfter,
        machineBoundary: {leftCharacterId: 'm-4', rightCharacterId: 'a2-1'},
      },
    ],
    artifacts: {
      mediaEquivalence: {path: 'equivalence.json', fileSha256: hash('b')},
      sourceIdentity: {path: 'source-identity.json', fileSha256: hash('c')},
      basisEditPlan: {path: 'basis-edit-plan.json', fileSha256: hash('d')},
      sttManifest: {path: 'stt-manifest.json', fileSha256: hash('f')},
      wordTimestamps: {path: 'word-timestamps.json', fileSha256: hash('9')},
      candidateManifest: {path: 'candidate-manifest.json', fileSha256: hash('e')},
    },
  };
};

const blankDraft = (page) => ({
  playbackCompleted: Object.fromEntries(
    presentationFirstRealDataRequiredPlaybackIdsV001(page).map((playbackId) => [playbackId, true]),
  ),
  gaps: Object.fromEntries(page.gaps.map((gap) => [gap.gapId, {
    decision: null,
    leftCharacterId: gap.machineBoundary.leftCharacterId,
    rightCharacterId: gap.machineBoundary.rightCharacterId,
  }])),
  finalDecision: null,
});

const toManifestUtterance = (value, speechId) => ({
  speechId,
  startMs: value.startMs,
  endMs: value.endMs,
  text: value.text,
  characters: structuredClone(value.characters),
});

const makeContractBindings = (page, reviewResult) => {
  const mediaEquivalence = {
    schemaVersion: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
    equivalenceId: 'dmwu-ui-contract-media-v001',
    sourceVideoId: 'DmWu0jVQfTE',
    status: 'passed',
    provenance: {source: 'synthetic-ui-contract-test-v001'},
    artifacts: {
      oldReviewMedia: {path: 'old.mp4', fileSha256: hash('1')},
      format299Video: {path: 'format299.mp4', fileSha256: hash('2')},
      newExecutionMedia: {path: 'execution.mp4', fileSha256: page.media.fileSha256},
      infoJson: {path: 'info.json', fileSha256: hash('3')},
      sttManifest: page.artifacts.sttManifest,
      sttTranscript: {path: 'transcript.json', fileSha256: hash('4')},
      sttWordTimestamps: page.artifacts.wordTimestamps,
      sttChunk16Flac: {path: 'chunk16.flac', fileSha256: hash('5')},
    },
    formalEntry: {status: 'passed'},
    videoClock: {status: 'passed'},
    audioEquivalence: {status: 'passed'},
    sttTransfer: {status: 'passed'},
    checks: [
      {checkId: 'formal-entry', status: 'passed'},
      {checkId: 'video-clock', status: 'passed'},
      {checkId: 'audio-equivalence', status: 'passed'},
      {checkId: 'stt-transfer', status: 'passed'},
    ],
    violations: [],
  };
  const sourceIdentity = {
    schemaVersion: PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
    sourceIdentityId: 'dmwu-ui-contract-source-v001',
    videoId: 'DmWu0jVQfTE',
    sourceUrl: 'https://www.youtube.com/watch?v=DmWu0jVQfTE',
    sourceProvenance: 'synthetic-ui-contract-test-v001',
    sourceRef: 'youtube:DmWu0jVQfTE',
    executionMedia: {path: 'execution.mp4', fileSha256: page.media.fileSha256},
    mediaEquivalence: page.artifacts.mediaEquivalence,
    stt: {
      manifest: page.artifacts.sttManifest,
      transcript: {path: 'transcript.json', fileSha256: hash('4')},
      wordTimestamps: page.artifacts.wordTimestamps,
    },
  };
  const basisEditPlan = {
    schemaVersion: PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
    basisPlanId: 'dmwu-ui-contract-basis-v001',
    kind: 'edit_plan_json',
    references: {
      sourceIdentity: page.artifacts.sourceIdentity,
      mediaEquivalence: page.artifacts.mediaEquivalence,
      humanResult: {path: 'human-result.json', fileSha256: hash('6')},
    },
    candidate: {
      candidateId: page.candidate.candidateId,
      title: page.candidate.title,
      outerRange: {startMs: page.candidate.startMs, endMs: page.candidate.endMs},
      qualitativeInternalEdit: {
        kind: 'remove_silence_and_fillers',
        sourceValue: 'remove_silence_and_fillers',
        resolved: false,
      },
    },
  };
  const manifestUtterances = new Map();
  let nextSpeechId = 1;
  const manifestUtterance = (value) => {
    if (!manifestUtterances.has(value.utteranceId)) {
      manifestUtterances.set(value.utteranceId, toManifestUtterance(value, nextSpeechId));
      nextSpeechId += 1;
    }
    return structuredClone(manifestUtterances.get(value.utteranceId));
  };
  const reviewItems = page.gaps.map((gap) => ({
    reviewItemId: gap.gapId,
    gap: {startMs: gap.startMs, endMs: gap.endMs},
    protectionReasons: [gap.protectionReason],
    fillerCandidateCount: 0,
    beforeUtterance: manifestUtterance(gap.beforeUtterance),
    afterUtterance: manifestUtterance(gap.afterUtterance),
  }));
  const outerDuration = page.candidate.endMs - page.candidate.startMs;
  const localRanges = reviewItems.map((item) => ({
    playbackId: `${item.reviewItemId}-context`,
    label: `${item.reviewItemId}の前後発話`,
    startMs: item.beforeUtterance.startMs,
    endMs: item.afterUtterance.endMs,
    durationMs: item.afterUtterance.endMs - item.beforeUtterance.startMs,
  }));
  const removedMaximum = reviewItems.reduce(
    (total, item) => total + item.gap.endMs - item.gap.startMs,
    0,
  );
  const fixedPlayback = outerDuration
    + localRanges.reduce((total, range) => total + range.durationMs, 0);
  const candidateManifest = {
    schemaVersion: PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
    manifestId: 'dmwu-ui-contract-manifest-v001',
    references: {
      mediaEquivalence: page.artifacts.mediaEquivalence,
      sourceIdentity: page.artifacts.sourceIdentity,
      basisEditPlan: page.artifacts.basisEditPlan,
      sttManifest: page.artifacts.sttManifest,
      wordTimestamps: page.artifacts.wordTimestamps,
    },
    candidate: {
      candidateId: page.candidate.candidateId,
      title: page.candidate.title,
      outerRange: {startMs: page.candidate.startMs, endMs: page.candidate.endMs},
    },
    presenter: {
      lineage: 'layer1-trim-v001@deterministic-rule',
      role: 'review-position-presenter',
      minimumGapMs: 400,
      automaticCut: false,
      paddingApplied: false,
    },
    reviewItems,
    workload: {
      independentJudgmentCount: 3,
      requiredExplicitOperationCount: 10,
      initialPositionSearchCount: 0,
      requiredPlaybackRanges: [{
        playbackId: 'original',
        label: '元候補',
        startMs: page.candidate.startMs,
        endMs: page.candidate.endMs,
        durationMs: outerDuration,
      }, ...localRanges],
      editedPlaybackDurationRangeMs: {
        minimumMs: outerDuration - removedMaximum,
        maximumMs: outerDuration,
      },
      totalInitialPlaybackDurationRangeMs: {
        minimumMs: fixedPlayback + outerDuration - removedMaximum,
        maximumMs: fixedPlayback + outerDuration,
      },
    },
  };
  return {
    mediaEquivalence: {...page.artifacts.mediaEquivalence, value: mediaEquivalence},
    sourceIdentity: {...page.artifacts.sourceIdentity, value: sourceIdentity},
    basisEditPlan: {...page.artifacts.basisEditPlan, value: basisEditPlan},
    candidateManifest: {...page.artifacts.candidateManifest, value: candidateManifest},
    reviewResult: {
      path: 'review-result.json',
      fileSha256: hash('7'),
      value: reviewResult,
    },
  };
};

test('page dataはcandidate 13・2発話間・全文文字端点・正式6 artifactだけを受ける', () => {
  const page = makePage();
  assert.equal(validatePresentationFirstRealDataReviewPageV001(page), page);
  assert.throws(
    () => validatePresentationFirstRealDataReviewPageV001({...makePage(), extra: true}),
    /page fieldが一致しません/u,
  );
  const wrongCandidate = makePage();
  wrongCandidate.candidate.candidateId = 12;
  assert.throws(() => validatePresentationFirstRealDataReviewPageV001(wrongCandidate), /candidate 13専用/u);
  const oneGap = makePage();
  oneGap.gaps.pop();
  assert.throws(() => validatePresentationFirstRealDataReviewPageV001(oneGap), /発話間は2件固定/u);
  const mutatedText = makePage();
  mutatedText.gaps[0].beforeUtterance.text = '別文';
  assert.throws(() => validatePresentationFirstRealDataReviewPageV001(mutatedText), /原文と一致しません/u);
});

test('0・1・2 cutを外側範囲の補集合へ決定的に変換する', () => {
  const page = makePage();
  const draft = blankDraft(page);
  draft.gaps['gap-01'].decision = 'keep';
  draft.gaps['gap-02'].decision = 'keep';
  assert.deepEqual(derivePresentationFirstRealDataSegmentsV001(page, draft), {
    valid: true,
    errors: [],
    cuts: [],
    segments: [{sourceStartMs: 1_920_260, sourceEndMs: 2_008_506}],
  });
  draft.gaps['gap-01'].decision = 'cut';
  assert.deepEqual(derivePresentationFirstRealDataSegmentsV001(page, draft).segments, [
    {sourceStartMs: 1_920_260, sourceEndMs: 1_948_058},
    {sourceStartMs: 1_949_982, sourceEndMs: 2_008_506},
  ]);
  draft.gaps['gap-02'].decision = 'cut';
  const both = derivePresentationFirstRealDataSegmentsV001(page, draft);
  assert.equal(both.valid, true);
  assert.deepEqual(both.segments, [
    {sourceStartMs: 1_920_260, sourceEndMs: 1_948_058},
    {sourceStartMs: 1_949_982, sourceEndMs: 1_977_670},
    {sourceStartMs: 1_981_394, sourceEndMs: 2_008_506},
  ]);
  assert.deepEqual(derivePresentationFirstRealDataSegmentsV001(page, draft), both);
});

test('全文内の文字端点修正を使い、逆転やcut重複は拒否する', () => {
  const page = makePage();
  const draft = blankDraft(page);
  draft.gaps['gap-01'] = {decision: 'cut', leftCharacterId: 'b1-2', rightCharacterId: 'm-2'};
  draft.gaps['gap-02'].decision = 'keep';
  const modified = derivePresentationFirstRealDataSegmentsV001(page, draft);
  assert.equal(modified.valid, true);
  assert.deepEqual(modified.cuts, [{gapId: 'gap-01', startMs: 1_940_000, endMs: 1_960_000}]);
  draft.gaps['gap-01'] = {decision: 'cut', leftCharacterId: 'b1-3', rightCharacterId: 'm-4'};
  draft.gaps['gap-02'] = {decision: 'cut', leftCharacterId: 'm-1', rightCharacterId: 'a2-1'};
  const overlap = derivePresentationFirstRealDataSegmentsV001(page, draft);
  assert.equal(overlap.valid, false);
  assert.match(overlap.errors.join('\n'), /重なっています/u);
});

test('回答を正式人間確認契約のroot・payload・SHA-256へ完全変換する', () => {
  const page = makePage();
  const draft = blankDraft(page);
  draft.gaps['gap-01'] = {
    decision: 'cut', leftCharacterId: 'b1-2', rightCharacterId: 'm-2',
  };
  draft.gaps['gap-02'].decision = 'keep';
  draft.finalDecision = 'complete';
  const result = buildPresentationFirstRealDataHumanReviewResultV001(page, draft);
  assert.equal(validatePresentationInternalTrimHumanReviewResultV001(result).status, 'passed');
  assert.deepEqual(Object.keys(result).sort(), [
    'humanReadableSummary', 'payload', 'payloadSha256', 'recordId', 'schemaVersion',
  ]);
  assert.deepEqual(result.payload.references, {
    basisEditPlan: page.artifacts.basisEditPlan,
    sourceIdentity: page.artifacts.sourceIdentity,
    mediaEquivalence: page.artifacts.mediaEquivalence,
    sttManifest: page.artifacts.sttManifest,
    wordTimestamps: page.artifacts.wordTimestamps,
    candidateManifest: page.artifacts.candidateManifest,
  });
  assert.deepEqual(result.payload.candidate, {
    candidateId: 13,
    outerRange: {startMs: 1_920_260, endMs: 2_008_506},
  });
  assert.deepEqual(result.payload.decisions[0], {
    reviewItemId: 'gap-01',
    answer: 'cut',
    modified: true,
    cutRange: {startMs: 1_940_000, endMs: 1_960_000},
    selection: {
      beforeLastKeptCharacter: {
        characterId: 'b1-2', text: 'ち', startMs: 1_930_000, endMs: 1_940_000,
        contextBefore: '母', contextAfter: 'ゃ',
      },
      afterFirstKeptCharacter: {
        characterId: 'm-2', text: '刊', startMs: 1_960_000, endMs: 1_970_000,
        contextBefore: '月', contextAfter: 'ムー',
      },
    },
  });
  assert.deepEqual(result.payload.retainedSegments, [
    {startMs: 1_920_260, endMs: 1_940_000},
    {startMs: 1_960_000, endMs: 2_008_506},
  ]);
  assert.equal(result.payload.finalDisposition, 'complete');
  assert.equal(result.payload.positionSearchCount, 2);
  assert.match(result.humanReadableSummary, /発話間1: 切る/u);
  assert.match(result.payloadSha256, /^[0-9a-f]{64}$/u);

  const oneBoundaryDraft = blankDraft(page);
  oneBoundaryDraft.gaps['gap-01'] = {
    decision: 'cut', leftCharacterId: 'b1-2', rightCharacterId: 'm-1',
  };
  oneBoundaryDraft.gaps['gap-02'].decision = 'keep';
  oneBoundaryDraft.finalDecision = 'complete';
  const oneBoundaryResult = buildPresentationFirstRealDataHumanReviewResultV001(
    page,
    oneBoundaryDraft,
  );
  assert.equal(oneBoundaryResult.payload.positionSearchCount, 1);
});

test('未回答・追加編集必要は正式信頼根で意図した未完了理由だけが停止させる', async () => {
  const page = JSON.parse(await readFile(ACTUAL_REVIEW_PAGE_PATH, 'utf8'));
  const unansweredDraft = blankDraft(page);
  const additionalDraft = blankDraft(page);
  for (const gap of page.gaps) additionalDraft.gaps[gap.gapId].decision = 'keep';
  additionalDraft.finalDecision = 'needs_more_editing';
  const directory = await mkdtemp(resolve(PREFLIGHT_TEST_DIRECTORY, '.ui-preflight-test-'));
  try {
    for (const [index, draft] of [unansweredDraft, additionalDraft].entries()) {
      const result = buildPresentationFirstRealDataHumanReviewResultV001(page, draft);
      assert.equal(validatePresentationInternalTrimHumanReviewResultV001(result).status, 'passed');
      const resultPath = resolve(directory, `review-result-${index}.json`);
      await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
      const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
        preflightId: `ui-contract-save-preflight-${index}-v001`,
        reviewResultPath: relative(resolve('.'), resultPath),
      });
      assert.equal(preflight.status, 'blocked');
      assert.deepEqual(
        [...new Set(preflight.blockedReasons.map((reason) => reason.code))],
        ['SAVE_PREFLIGHT_NOT_READY'],
      );
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('コピー後の修正と取消は、次の契約payloadに決定的に反映される', () => {
  const page = makePage();
  const draft = blankDraft(page);
  draft.gaps['gap-01'].decision = 'cut';
  draft.gaps['gap-02'].decision = 'keep';
  draft.finalDecision = 'complete';
  const before = buildPresentationFirstRealDataReviewPayloadV001(page, draft);
  draft.gaps['gap-01'].decision = null;
  draft.finalDecision = null;
  const after = buildPresentationFirstRealDataReviewPayloadV001(page, draft);
  assert.equal(before.decisions[0].answer, 'cut');
  assert.equal(before.finalDisposition, 'complete');
  assert.equal(after.decisions[0].answer, 'unanswered');
  assert.equal(after.finalDisposition, 'unanswered');
  assert.notDeepEqual(after, before);
  assert.deepEqual(
    buildPresentationFirstRealDataReviewPayloadV001(page, structuredClone(draft)),
    after,
  );
});

test('正式結果は元候補・局所2件・編集結果の4再生完了flagが揃うまで生成できない', () => {
  const page = makePage();
  const required = presentationFirstRealDataRequiredPlaybackIdsV001(page);
  assert.deepEqual(required, ['original', 'gap-01-context', 'gap-02-context', 'edited']);
  const completeDraft = blankDraft(page);
  completeDraft.gaps['gap-01'].decision = 'keep';
  completeDraft.gaps['gap-02'].decision = 'keep';
  completeDraft.finalDecision = 'complete';
  assert.doesNotThrow(() => buildPresentationFirstRealDataHumanReviewResultV001(page, completeDraft));
  for (const playbackId of required) {
    const incompleteDraft = structuredClone(completeDraft);
    incompleteDraft.playbackCompleted[playbackId] = false;
    assert.throws(
      () => buildPresentationFirstRealDataHumanReviewResultV001(page, incompleteDraft),
      /必須再生が未完了/u,
    );
  }
  assert.deepEqual(
    Object.keys(completeDraft.playbackCompleted).sort(),
    [...required].sort(),
  );
});

test('HTMLは最小UX契約を持ち、時間計測・時刻入力・server保存を持たない', () => {
  const html = buildPresentationFirstRealDataReviewHtmlV001(makePage());
  for (const required of [
    '切る', '残す', '未回答に戻す', 'この区間列で完成', '追加編集が必要',
    '発話全文内の文字', '前側で最後に残す文字', '後側で最初に残す文字',
    '元候補を再生', 'この間の前後を再生', '現在の編集結果を順次再生',
    'このつなぎ目を順次再生', '長さ ', 'HH:MM:SS', '時間は計測しません',
    '結果をコピー', 'localStorage', 'object-fit:contain', 'max-height:min(42vh,420px)',
    'position:fixed', 'sourceStartMs', 'sourceEndMs', '必須再生の残り:',
    "'original'", "'edited'", "gap.gapId+'-context'",
  ]) assert.ok(html.includes(required), `missing: ${required}`);
  for (const forbidden of [
    'Date.now(', 'performance.', 'startedAt', 'completedAt', 'elapsedMs',
    'fetch(', 'XMLHttpRequest', 'WebSocket', 'sessionStorage', 'type="number"',
    'expectedCuts', 'known-hit', 'priorDecision',
  ]) assert.equal(html.includes(forbidden), false, `forbidden: ${forbidden}`);
  assert.match(html, /\.padStart\(3,'0'\)/u);
  assert.match(html, /navigator\.clipboard\.writeText/u);
  assert.match(html, /box\.focus\(\);box\.select\(\)/u);
});

test('文字端点click処理は選択だけを行い、暗黙再生しない', () => {
  const html = buildPresentationFirstRealDataReviewHtmlV001(makePage());
  const start = html.indexOf("const bindCharacterButtons=()=>");
  const end = html.indexOf("document.querySelectorAll('[data-edit-side]')", start);
  assert.ok(start >= 0 && end > start);
  const handler = html.slice(start, end);
  assert.equal(handler.includes('playSegments('), false);
  assert.equal(handler.includes('video.play('), false);
  assert.match(handler, /leftCharacterId/u);
  assert.match(handler, /rightCharacterId/u);
});

test('埋め込みJavaScriptは構文成立し、複数segmentを順次再生する', () => {
  const html = buildPresentationFirstRealDataReviewHtmlV001(makePage());
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/u);
  assert.ok(match);
  assert.doesNotThrow(() => new vm.Script(match[1]));
  assert.match(match[1], /playQueueIndex\+=1/u);
  assert.match(match[1], /if\(playQueueIndex<playQueue\.length\)startPart\(\)/u);
  assert.match(match[1], /video\.addEventListener\('timeupdate'/u);
});

test('再生ボタン押下だけでは完了せず、終端到達・再編集無効化・残件0を結果条件にする', () => {
  const html = buildPresentationFirstRealDataReviewHtmlV001(makePage());
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/u)?.[1] ?? '';
  const buttonStart = script.indexOf("$('startReview').onclick");
  const buttonEnd = script.indexOf("$('copyResult').onclick", buttonStart);
  const buttonHandlers = script.slice(buttonStart, buttonEnd);
  assert.equal(buttonHandlers.includes('playbackCompleted[completionKey]=true'), false);
  assert.match(script, /video\.addEventListener\('timeupdate',[\s\S]*completeActivePlayback\(\)/u);
  assert.match(script, /draft\.playbackCompleted\[completionKey\]=true/u);
  assert.match(script, /const ready=allAnswered\(\)&&derived\.valid&&allPlaybackCompleted\(\)/u);
  assert.match(script, /if\(!allAnswered\(\)\|\|!allPlaybackCompleted\(\)\|\|!edited\(\)\.valid\)/u);
  assert.match(script, /invalidateEditedPlayback\(\)/u);
  assert.match(script, /必須再生の残り:/u);
  for (const forbidden of ['playbackStartedAt', 'playbackCompletedAt', 'playbackElapsedMs']) {
    assert.equal(script.includes(forbidden), false);
  }
});

test('実DOM相当のコピー操作はPromiseでなくvalidator合格の厳密JSONを出す', async () => {
  const page = makePage();
  const html = buildPresentationFirstRealDataReviewHtmlV001(page);
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/u);
  assert.ok(match);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        classList: {
          add: (...names) => names.forEach((name) => classes.add(name)),
          remove: (...names) => names.forEach((name) => classes.delete(name)),
          toggle: (name, force) => {
            if (force === undefined ? !classes.has(name) : force) classes.add(name);
            else classes.delete(name);
          },
        },
        addEventListener: () => {},
        play: async () => {},
        pause: () => {},
        focus: () => {},
        select: () => {},
        readyState: 1,
        currentTime: 0,
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
      });
    }
    return elements.get(id);
  };
  const savedDraft = {
    schemaVersion: 'presentation-first-real-data-review-draft-v002',
    pageRevision: page.pageRevision,
    introAccepted: true,
    currentStep: 2,
    playbackCompleted: {
      original: true,
      'gap-01-context': true,
      'gap-02-context': true,
      edited: true,
    },
    gaps: {
      'gap-01': {decision: 'cut', leftCharacterId: 'b1-3', rightCharacterId: 'm-1'},
      'gap-02': {decision: 'keep', leftCharacterId: 'm-4', rightCharacterId: 'a2-1'},
    },
    finalDecision: 'complete',
  };
  const storage = new Map([[page.draftStorageKey, JSON.stringify(savedDraft)]]);
  let copied = null;
  const context = vm.createContext({
    console,
    crypto: webcrypto,
    TextEncoder,
    navigator: {clipboard: {writeText: async (text) => { copied = text; }}},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    document: {
      getElementById: element,
      querySelectorAll: () => [],
      execCommand: () => false,
    },
    window: {scrollTo: () => {}},
  });
  new vm.Script(match[1]).runInContext(context);
  await element('copyResult').onclick();
  assert.equal(typeof copied, 'string');
  assert.equal(copied.includes('[object Promise]'), false);
  const strictJson = copied.split('--- 厳密JSON ---\n')[1];
  assert.ok(strictJson);
  const result = JSON.parse(strictJson);
  assert.equal(validatePresentationInternalTrimHumanReviewResultV001(result).status, 'passed');
  assert.equal(result.payload.decisions[0].answer, 'cut');
  assert.equal(result.payload.finalDisposition, 'complete');
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'serverSaved'), false);
});

test('必須再生中の手動seekは終端へ移動しても完走扱いにならずコピーできない', async () => {
  const page = makePage();
  const html = buildPresentationFirstRealDataReviewHtmlV001(page);
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/u)?.[1] ?? '';
  const elements = new Map();
  const videoListeners = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        classList: {
          add: (...names) => names.forEach((name) => classes.add(name)),
          remove: (...names) => names.forEach((name) => classes.delete(name)),
          toggle: (name, force) => {
            if (force === undefined ? !classes.has(name) : force) classes.add(name);
            else classes.delete(name);
          },
        },
        addEventListener: (eventName, handler) => {
          if (id === 'video') videoListeners.set(eventName, handler);
        },
        play: async () => {},
        pause: () => {},
        focus: () => {},
        select: () => {},
        readyState: 1,
        currentTime: 0,
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
      });
    }
    return elements.get(id);
  };
  const savedDraft = {
    schemaVersion: 'presentation-first-real-data-review-draft-v002',
    pageRevision: page.pageRevision,
    introAccepted: true,
    currentStep: 2,
    playbackCompleted: {
      original: false,
      'gap-01-context': true,
      'gap-02-context': true,
      edited: true,
    },
    gaps: {
      'gap-01': {decision: 'keep', leftCharacterId: 'b1-3', rightCharacterId: 'm-1'},
      'gap-02': {decision: 'keep', leftCharacterId: 'm-4', rightCharacterId: 'a2-1'},
    },
    finalDecision: 'complete',
  };
  const storage = new Map([[page.draftStorageKey, JSON.stringify(savedDraft)]]);
  let clipboardWriteCount = 0;
  const context = vm.createContext({
    console,
    crypto: webcrypto,
    TextEncoder,
    navigator: {clipboard: {writeText: async () => { clipboardWriteCount += 1; }}},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    document: {
      getElementById: element,
      querySelectorAll: () => [],
      execCommand: () => false,
    },
    window: {scrollTo: () => {}},
  });
  new vm.Script(script).runInContext(context);
  element('playCandidate').onclick();
  videoListeners.get('seeking')();
  videoListeners.get('seeked')();
  element('video').currentTime = page.candidate.endMs / 1000;
  videoListeners.get('seeking')();
  videoListeners.get('timeupdate')();
  const savedAfterManualSeek = JSON.parse(storage.get(page.draftStorageKey));
  assert.equal(savedAfterManualSeek.playbackCompleted.original, false);
  assert.match(element('playStatus').textContent, /手動で動かした/u);
  await element('copyResult').onclick();
  assert.equal(clipboardWriteCount, 0);
  assert.match(element('playStatus').textContent, /必須再生がすべて終わるまで/u);
});

test('SHA-256計算待ちに回答が変わった場合は旧payloadをclipboardへ渡さない', async () => {
  const page = makePage();
  const html = buildPresentationFirstRealDataReviewHtmlV001(page);
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/u)?.[1] ?? '';
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        classList: {
          add: (...names) => names.forEach((name) => classes.add(name)),
          remove: (...names) => names.forEach((name) => classes.delete(name)),
          toggle: (name, force) => {
            if (force === undefined ? !classes.has(name) : force) classes.add(name);
            else classes.delete(name);
          },
        },
        addEventListener: () => {},
        play: async () => {},
        pause: () => {},
        focus: () => {},
        select: () => {},
        readyState: 1,
        currentTime: 0,
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
      });
    }
    return elements.get(id);
  };
  const savedDraft = {
    schemaVersion: 'presentation-first-real-data-review-draft-v002',
    pageRevision: page.pageRevision,
    introAccepted: true,
    currentStep: 2,
    playbackCompleted: {
      original: true,
      'gap-01-context': true,
      'gap-02-context': true,
      edited: true,
    },
    gaps: {
      'gap-01': {decision: 'cut', leftCharacterId: 'b1-3', rightCharacterId: 'm-1'},
      'gap-02': {decision: 'keep', leftCharacterId: 'm-4', rightCharacterId: 'a2-1'},
    },
    finalDecision: 'complete',
  };
  const storage = new Map([[page.draftStorageKey, JSON.stringify(savedDraft)]]);
  const digestResolvers = [];
  let clipboardWriteCount = 0;
  const context = vm.createContext({
    console,
    crypto: {subtle: {digest: () => new Promise((resolveDigest) => {
      digestResolvers.push(resolveDigest);
    })}},
    TextEncoder,
    navigator: {clipboard: {writeText: async () => { clipboardWriteCount += 1; }}},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    document: {
      getElementById: element,
      querySelectorAll: () => [],
      execCommand: () => false,
    },
    window: {scrollTo: () => {}},
  });
  new vm.Script(script).runInContext(context);
  assert.equal(digestResolvers.length, 1);
  const copyPromise = element('copyResult').onclick();
  assert.equal(digestResolvers.length, 2);
  element('resetDraft').onclick();
  for (const resolveDigest of digestResolvers) resolveDigest(new Uint8Array(32).buffer);
  await copyPromise;
  assert.equal(clipboardWriteCount, 0);
  assert.match(element('playStatus').textContent, /古い結果はコピーしませんでした/u);
});

test('Browserへ埋め込む補集合計算は外部helperなしで単独実行できる', () => {
  const page = makePage();
  const draft = blankDraft(page);
  draft.gaps['gap-01'].decision = 'cut';
  draft.gaps['gap-02'].decision = 'keep';
  const browserDerive = vm.runInNewContext(
    `(${derivePresentationFirstRealDataSegmentsV001.toString()})`,
  );
  const actual = JSON.parse(JSON.stringify(browserDerive(page, draft)));
  assert.deepEqual(actual, derivePresentationFirstRealDataSegmentsV001(page, draft));
});

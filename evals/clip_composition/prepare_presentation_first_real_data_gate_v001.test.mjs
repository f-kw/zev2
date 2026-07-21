import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

import {buildPresentationFirstRealDataReviewBundleV001} from './prepare_presentation_first_real_data_gate_v001.mjs';
import {
  PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001,
  validatePresentationInternalTrimCandidateManifestV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {validatePresentationFirstRealDataReviewPageV001} from './presentation_first_real_data_review_ui_v001.mjs';

const sha = (character) => character.repeat(64);
const ref = (name, character) => ({path: `fixed/${name}.json`, fileSha256: sha(character)});
const execFileAsync = promisify(execFile);
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');

const words = [
  {id: 1, utteranceId: 'u-1', text: '前', startMs: 1920260, endMs: 1948058},
  {id: 2, utteranceId: 'u-2', text: '中', startMs: 1949982, endMs: 1977670},
  {id: 3, utteranceId: 'u-3', text: '後', startMs: 1981394, endMs: 2008506},
];

const layer1Plan = {
  version: 'layer1-trim-v001',
  initialValues: {gapCandidateMs: 400},
  outerRange: {sourceVideoId: 'DmWu0jVQfTE', startMs: 1920260, endMs: 2008506},
  cutDirectives: [],
  protectedCandidates: [
    {
      beforeWordId: '1',
      afterWordId: '2',
      gapStartMs: 1948058,
      gapEndMs: 1949982,
      protectionReason: 'utterance_boundary',
    },
    {
      beforeWordId: '2',
      afterWordId: '3',
      gapStartMs: 1977670,
      gapEndMs: 1981394,
      protectionReason: 'speaker_unknown',
    },
  ],
};

const references = {
  mediaEquivalence: ref('media-equivalence', 'a'),
  sourceIdentity: ref('source-identity', 'b'),
  basisEditPlan: ref('basis-edit-plan', 'c'),
  candidateManifest: ref('candidate-manifest', 'd'),
  sttManifest: ref('stt-manifest', 'e'),
  wordTimestamps: ref('word-timestamps', 'f'),
};

test('candidate 13の実artifact連鎖・2発話間・実操作数を同じbundleから作る', () => {
  const bundle = buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan,
    references,
    mediaFileSha256: sha('1'),
    pageRevision: 'candidate-13-test-v001',
  });
  assert.equal(validatePresentationInternalTrimCandidateManifestV001(bundle.manifest).status, 'passed');
  assert.doesNotThrow(() => validatePresentationFirstRealDataReviewPageV001(bundle.page));
  assert.deepEqual(Object.keys(bundle.manifest.references).sort(), [
    'basisEditPlan', 'mediaEquivalence', 'sourceIdentity', 'sttManifest', 'wordTimestamps',
  ].sort());
  assert.deepEqual(Object.keys(bundle.page.artifacts).sort(), [
    'basisEditPlan', 'candidateManifest', 'mediaEquivalence', 'sourceIdentity',
    'sttManifest', 'wordTimestamps',
  ].sort());
  assert.equal(bundle.manifest.reviewItems.length, 2);
  assert.equal(bundle.workload.independentJudgmentCount, 3);
  assert.equal(bundle.workload.requiredExplicitOperationCount, 10);
  assert.equal(bundle.workload.initialPositionSearchCount, 0);
  assert.deepEqual(bundle.workload.editedPlaybackDurationRangeMs, {
    minimumMs: 82598,
    maximumMs: 88246,
  });
  assert.deepEqual(bundle.workload.totalInitialPlaybackDurationRangeMs, {
    minimumMs: 286778,
    maximumMs: 292426,
  });
});

test('固定400ms提示器が2件を再現しない入力を拒否する', () => {
  assert.throws(() => buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan: {...layer1Plan, protectedCandidates: layer1Plan.protectedCandidates.slice(0, 1)},
    references,
    mediaFileSha256: sha('1'),
    pageRevision: 'candidate-13-test-v001',
  }), /2件を再現しません/);
});

test('UI再生成は固定summaryの実byteを信頼根にし、候補資料を変更しない', async () => {
  const workspaceRoot = process.cwd();
  const scriptPath = path.join(
    workspaceRoot,
    'evals/clip_composition/prepare_presentation_first_real_data_gate_v001.mjs',
  );
  const summaryPath = path.join(
    workspaceRoot,
    PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.path,
  );
  const outputDirectory = path.dirname(summaryPath);
  const sourcePath = path.join(outputDirectory, 'source-identity.json');
  const summaryBefore = await readFile(summaryPath);
  const summaryValue = JSON.parse(summaryBefore.toString('utf8'));
  const trustedArtifactBytesBefore = new Map(await Promise.all(
    Object.values(summaryValue.artifactBindings).map(async (reference) => [
      reference.path,
      await readFile(path.join(workspaceRoot, reference.path)),
    ]),
  ));
  assert.equal(
    sha256Bytes(summaryBefore),
    PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.fileSha256,
  );

  await execFileAsync(process.execPath, [scriptPath, '--mode', 'refresh-review-ui'], {
    cwd: workspaceRoot,
  });

  assert.deepEqual(await readFile(summaryPath), summaryBefore);
  for (const [artifactPath, bytesBefore] of trustedArtifactBytesBefore) {
    assert.deepEqual(await readFile(path.join(workspaceRoot, artifactPath)), bytesBefore);
  }
  const page = JSON.parse(await readFile(path.join(outputDirectory, 'review-page.json'), 'utf8'));
  const sourceIdentity = JSON.parse(await readFile(sourcePath, 'utf8'));
  assert.doesNotThrow(() => validatePresentationFirstRealDataReviewPageV001(page));
  assert.match(page.pageRevision, /playback-gate-v002/u);
  assert.equal(page.media.fileSha256, sourceIdentity.executionMedia.fileSha256);
  assert.deepEqual(page.artifacts.sttManifest, sourceIdentity.stt.manifest);
  assert.deepEqual(page.artifacts.wordTimestamps, sourceIdentity.stt.wordTimestamps);
  const html = await readFile(path.join(outputDirectory, 'review.html'), 'utf8');
  assert.match(html, /再生位置を手動で動かしたため、この必須再生は完了扱いにしません/u);
  assert.match(html, /古い結果はコピーしませんでした/u);
});

test('UI再生成CLIは別summary・4資料・媒体・STTを差し込む引数を拒否する', async () => {
  const workspaceRoot = process.cwd();
  const scriptPath = path.join(
    workspaceRoot,
    'evals/clip_composition/prepare_presentation_first_real_data_gate_v001.mjs',
  );
  for (const flag of ['--summary', '--source-identity', '--media', '--stt-root']) {
    await assert.rejects(
      execFileAsync(process.execPath, [
        scriptPath,
        '--mode', 'refresh-review-ui',
        flag, 'self-consistent-alternative',
      ], {cwd: workspaceRoot}),
      /未対応のCLI引数/u,
      flag,
    );
  }
});

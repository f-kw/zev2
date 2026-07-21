#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {createLayer1TrimPlan, loadChunkedSttWords} from './layer1_internal_trim.mjs';
import {
  PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001,
  PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
  PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
  loadTrustedPresentationFirstRealDataRuntimeV001,
  presentationFirstRealDataCanonicalSha256,
  validatePresentationInternalTrimCandidateManifestV001,
  validatePresentationRealDataBasisEditPlanV001,
  validatePresentationRealDataSourceIdentityV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001,
  finalizePresentationSourceMediaEquivalenceBrowserPlaybackV001,
  inspectPresentationSourceMediaEquivalenceV001,
  validatePresentationSourceMediaEquivalenceV001,
} from './presentation_source_media_equivalence_v001.mjs';
import {
  buildPresentationFirstRealDataReviewHtmlV001,
  validatePresentationFirstRealDataReviewPageV001,
} from './presentation_first_real_data_review_ui_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260721-first-real-data-assembly-gate-v001',
);
const PROVISIONAL_DIRECTORY = path.join(OUTPUT_DIRECTORY, 'provisional-browser-playback');
const DOWNLOAD_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'research/downloads/first-gate-unseen/DmWu0jVQfTE',
);
const STT_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source',
);
const HUMAN_RESULT_PATH = path.join(
  MODULE_DIRECTORY,
  'outputs/human-boundary-trim/20260717-first-gate-unseen-formal-v001/human-result.json',
);
const OLD_MEDIA_PATH = path.join(DOWNLOAD_DIRECTORY, 'DmWu0jVQfTE.mp4');
const FORMAT_299_PATH = path.join(DOWNLOAD_DIRECTORY, 'native-1080p/DmWu0jVQfTE.f299.mp4');
const EXECUTION_MEDIA_PATH = path.join(
  DOWNLOAD_DIRECTORY,
  'native-1080p/DmWu0jVQfTE.native-1080p-h264-opus.mp4',
);
const INFO_JSON_PATH = path.join(DOWNLOAD_DIRECTORY, 'DmWu0jVQfTE.info.json');
const STT_MANIFEST_PATH = path.join(STT_DIRECTORY, 'manifest.json');
const STT_TRANSCRIPT_PATH = path.join(STT_DIRECTORY, 'transcript.json');
const STT_WORD_TIMESTAMPS_PATH = path.join(STT_DIRECTORY, 'word-timestamps.json');
const STT_CHUNK_16_PATH = path.join(STT_DIRECTORY, 'chunks/chunk-0016.flac');
const INSPECTED_MEDIA_PATH = path.join(OUTPUT_DIRECTORY, 'media-equivalence-inspected.json');
const FINAL_MEDIA_PATH = path.join(OUTPUT_DIRECTORY, 'media-equivalence.json');

const CANDIDATE = Object.freeze({
  candidateId: 13,
  title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
  outerRange: FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.candidateOuterRange,
});
const EMPTY_SHA256 = '0'.repeat(64);

const repoPath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath);
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const readRef = async (filePath) => {
  const bytes = await readFile(filePath);
  return {path: repoPath(filePath), fileSha256: sha256Bytes(bytes)};
};
const writeJsonArtifact = async (filePath, value) => {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await writeFile(filePath, bytes);
  return {path: repoPath(filePath), fileSha256: sha256Bytes(bytes), value};
};
const assertPassed = (name, report) => {
  if (report.status !== 'passed') {
    throw new Error(`${name} failed: ${JSON.stringify(report.violations)}`);
  }
};

const toManifestUtterance = (utteranceId, speechId, words) => ({
  speechId,
  startMs: words[0].startMs,
  endMs: words.at(-1).endMs,
  text: words.map((word) => word.text).join(''),
  characters: words.map((word) => ({
    characterId: `word-${word.id}`,
    text: word.text,
    startMs: word.startMs,
    endMs: word.endMs,
  })),
});

const toPageUtterance = (utteranceId, manifestUtterance) => ({
  utteranceId,
  startMs: manifestUtterance.startMs,
  endMs: manifestUtterance.endMs,
  text: manifestUtterance.text,
  characters: manifestUtterance.characters,
});

export const buildPresentationFirstRealDataReviewBundleV001 = ({
  words,
  layer1Plan,
  references,
  mediaFileSha256,
  pageRevision,
}) => {
  const candidateWords = words.filter((word) => (
    word.endMs > CANDIDATE.outerRange.startMs && word.startMs < CANDIDATE.outerRange.endMs
  ));
  if (candidateWords.length === 0 || candidateWords.some((word) => (
    typeof word.utteranceId !== 'string'
    || Array.from(word.text).length !== 1
  ))) {
    throw new Error('candidate 13のraw発話全文を文字単位で構成できません');
  }
  const utteranceOrder = [];
  const wordsByUtterance = new Map();
  for (const word of candidateWords) {
    if (!wordsByUtterance.has(word.utteranceId)) utteranceOrder.push(word.utteranceId);
    const group = wordsByUtterance.get(word.utteranceId) ?? [];
    group.push(word);
    wordsByUtterance.set(word.utteranceId, group);
  }
  const manifestUtteranceById = new Map(utteranceOrder.map((utteranceId, index) => [
    utteranceId,
    toManifestUtterance(utteranceId, index + 1, wordsByUtterance.get(utteranceId)),
  ]));
  const utteranceIdByWordId = new Map(candidateWords.map((word) => [String(word.id), word.utteranceId]));
  const protectedCandidates = Array.isArray(layer1Plan.protectedCandidates)
    ? layer1Plan.protectedCandidates : [];
  if (layer1Plan.version !== 'layer1-trim-v001'
      || layer1Plan.initialValues?.gapCandidateMs !== 400
      || layer1Plan.outerRange?.startMs !== CANDIDATE.outerRange.startMs
      || layer1Plan.outerRange?.endMs !== CANDIDATE.outerRange.endMs
      || layer1Plan.cutDirectives?.length !== 0
      || protectedCandidates.length !== 2) {
    throw new Error('固定済み400ms提示規則がcandidate 13の2件を再現しません');
  }
  const reviewItems = protectedCandidates.map((candidate, index) => {
    const beforeUtteranceId = utteranceIdByWordId.get(candidate.beforeWordId);
    const afterUtteranceId = utteranceIdByWordId.get(candidate.afterWordId);
    const beforeUtterance = manifestUtteranceById.get(beforeUtteranceId);
    const afterUtterance = manifestUtteranceById.get(afterUtteranceId);
    if (!beforeUtterance || !afterUtterance || beforeUtteranceId === afterUtteranceId) {
      throw new Error(`発話間${index + 1}の前後raw発話を解決できません`);
    }
    return {
      reviewItemId: `candidate-13-gap-${String(index + 1).padStart(2, '0')}`,
      gap: {startMs: candidate.gapStartMs, endMs: candidate.gapEndMs},
      protectionReasons: [candidate.protectionReason],
      fillerCandidateCount: 0,
      beforeUtterance,
      afterUtterance,
      beforeUtteranceId,
      afterUtteranceId,
    };
  });
  const expectedGaps = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.reviewGaps;
  if (reviewItems.some((item, index) => (
    item.gap.startMs !== expectedGaps[index].startMs
    || item.gap.endMs !== expectedGaps[index].endMs
  ))) throw new Error('提示間が事前登録した2件と一致しません');

  const originalDurationMs = CANDIDATE.outerRange.endMs - CANDIDATE.outerRange.startMs;
  const localPlaybackRanges = reviewItems.map((item) => ({
    playbackId: `${item.reviewItemId}-context`,
    label: `発話間${item.reviewItemId.endsWith('01') ? '1' : '2'}の前後発話`,
    startMs: item.beforeUtterance.startMs,
    endMs: item.afterUtterance.endMs,
    durationMs: item.afterUtterance.endMs - item.beforeUtterance.startMs,
  }));
  const removedMaximumMs = reviewItems.reduce(
    (sum, item) => sum + item.gap.endMs - item.gap.startMs,
    0,
  );
  const fixedPlaybackMs = originalDurationMs
    + localPlaybackRanges.reduce((sum, range) => sum + range.durationMs, 0);
  const workload = {
    independentJudgmentCount: 3,
    requiredExplicitOperationCount: 10,
    initialPositionSearchCount: 0,
    requiredPlaybackRanges: [
      {
        playbackId: 'original',
        label: '元候補',
        startMs: CANDIDATE.outerRange.startMs,
        endMs: CANDIDATE.outerRange.endMs,
        durationMs: originalDurationMs,
      },
      ...localPlaybackRanges,
    ],
    editedPlaybackDurationRangeMs: {
      minimumMs: originalDurationMs - removedMaximumMs,
      maximumMs: originalDurationMs,
    },
    totalInitialPlaybackDurationRangeMs: {
      minimumMs: fixedPlaybackMs + originalDurationMs - removedMaximumMs,
      maximumMs: fixedPlaybackMs + originalDurationMs,
    },
  };
  const manifest = {
    schemaVersion: PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
    manifestId: 'DmWu0jVQfTE-candidate-13-internal-trim-review-v001',
    references: {
      mediaEquivalence: references.mediaEquivalence,
      sourceIdentity: references.sourceIdentity,
      basisEditPlan: references.basisEditPlan,
      sttManifest: references.sttManifest,
      wordTimestamps: references.wordTimestamps,
    },
    candidate: {
      candidateId: CANDIDATE.candidateId,
      title: CANDIDATE.title,
      outerRange: CANDIDATE.outerRange,
    },
    presenter: {
      lineage: 'layer1-trim-v001@deterministic-rule',
      role: 'review-position-presenter',
      minimumGapMs: 400,
      automaticCut: false,
      paddingApplied: false,
    },
    reviewItems: reviewItems.map(({beforeUtteranceId, afterUtteranceId, ...item}) => item),
    workload,
  };
  assertPassed('candidate manifest', validatePresentationInternalTrimCandidateManifestV001(manifest));
  const page = {
    schemaVersion: 'presentation-first-real-data-review-page-v001',
    pageId: 'DmWu0jVQfTE-candidate-13-internal-trim-review-v001',
    pageRevision,
    draftStorageKey: `zev2:${pageRevision}:draft`,
    media: {
      sourceId: 'DmWu0jVQfTE',
      url: '/media',
      fileSha256: mediaFileSha256,
      durationMs: 8814021,
    },
    candidate: {
      candidateId: CANDIDATE.candidateId,
      title: CANDIDATE.title,
      startMs: CANDIDATE.outerRange.startMs,
      endMs: CANDIDATE.outerRange.endMs,
    },
    gaps: reviewItems.map((item, index) => ({
      gapId: item.reviewItemId,
      label: `発話間${index + 1}`,
      startMs: item.gap.startMs,
      endMs: item.gap.endMs,
      protectionReason: item.protectionReasons.join(','),
      localRange: {
        startMs: item.beforeUtterance.startMs,
        endMs: item.afterUtterance.endMs,
      },
      beforeUtterance: toPageUtterance(item.beforeUtteranceId, item.beforeUtterance),
      afterUtterance: toPageUtterance(item.afterUtteranceId, item.afterUtterance),
      machineBoundary: {
        leftCharacterId: item.beforeUtterance.characters.at(-1).characterId,
        rightCharacterId: item.afterUtterance.characters[0].characterId,
      },
    })),
    artifacts: {
      mediaEquivalence: references.mediaEquivalence,
      sourceIdentity: references.sourceIdentity,
      basisEditPlan: references.basisEditPlan,
      candidateManifest: references.candidateManifest,
      sttManifest: references.sttManifest,
      wordTimestamps: references.wordTimestamps,
    },
  };
  validatePresentationFirstRealDataReviewPageV001(page);
  return {manifest, page, workload};
};

const fixedMediaInspectionInput = (browserPlayback = null) => ({
  equivalenceId: 'DmWu0jVQfTE-native-1080p-v001',
  oldReviewMediaPath: OLD_MEDIA_PATH,
  format299VideoPath: FORMAT_299_PATH,
  newExecutionMediaPath: EXECUTION_MEDIA_PATH,
  infoJsonPath: INFO_JSON_PATH,
  sttManifestPath: STT_MANIFEST_PATH,
  sttTranscriptPath: STT_TRANSCRIPT_PATH,
  sttWordTimestampsPath: STT_WORD_TIMESTAMPS_PATH,
  sttChunk16FlacPath: STT_CHUNK_16_PATH,
  acquisitionCommand:
    "yt-dlp --no-overwrites --newline -f 299 -o 'native-1080p/DmWu0jVQfTE.f299.%(ext)s' https://www.youtube.com/watch?v=DmWu0jVQfTE",
  muxCommand:
    'ffmpeg -i DmWu0jVQfTE.f299.mp4 -i DmWu0jVQfTE.mp4 -map 0:v:0 -map 1:a:0 -c copy -map_metadata -1 -map_chapters -1 -movflags +faststart DmWu0jVQfTE.native-1080p-h264-opus.mp4',
  browserPlayback,
});

const buildArtifacts = async (mediaBinding) => {
  const [executionMedia, sttManifest, sttTranscript, sttWordTimestamps, humanResult] = await Promise.all([
    readRef(EXECUTION_MEDIA_PATH),
    readRef(STT_MANIFEST_PATH),
    readRef(STT_TRANSCRIPT_PATH),
    readRef(STT_WORD_TIMESTAMPS_PATH),
    readRef(HUMAN_RESULT_PATH),
  ]);
  const sourceIdentity = {
    schemaVersion: PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
    sourceIdentityId: 'DmWu0jVQfTE-native-1080p-source-v001',
    videoId: 'DmWu0jVQfTE',
    sourceUrl: 'https://www.youtube.com/watch?v=DmWu0jVQfTE',
    sourceProvenance: 'youtube-format299-video+frozen-format251-audio-v001',
    sourceRef: 'youtube:DmWu0jVQfTE',
    executionMedia,
    mediaEquivalence: mediaBinding,
    stt: {
      manifest: sttManifest,
      transcript: sttTranscript,
      wordTimestamps: sttWordTimestamps,
    },
  };
  assertPassed('source identity', validatePresentationRealDataSourceIdentityV001(sourceIdentity));
  const sourceBinding = await writeJsonArtifact(
    path.join(OUTPUT_DIRECTORY, 'source-identity.json'),
    sourceIdentity,
  );
  const humanResultValue = await readJson(HUMAN_RESULT_PATH);
  const humanCandidate = humanResultValue.decisions.find((item) => item.candidateId === 13);
  if (!humanCandidate
      || humanCandidate.startMs !== CANDIDATE.outerRange.startMs
      || humanCandidate.endMs !== CANDIDATE.outerRange.endMs
      || humanCandidate.internalEdit !== 'remove_silence_and_fillers') {
    throw new Error('candidate 13の人間結果が固定入力と一致しません');
  }
  const basisPlan = {
    schemaVersion: PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
    basisPlanId: 'DmWu0jVQfTE-candidate-13-basis-edit-plan-v001',
    kind: 'edit_plan_json',
    references: {
      sourceIdentity: {path: sourceBinding.path, fileSha256: sourceBinding.fileSha256},
      mediaEquivalence: mediaBinding,
      humanResult,
    },
    candidate: {
      candidateId: CANDIDATE.candidateId,
      title: CANDIDATE.title,
      outerRange: CANDIDATE.outerRange,
      qualitativeInternalEdit: {
        kind: 'remove_silence_and_fillers',
        sourceValue: humanCandidate.internalEdit,
        resolved: false,
      },
    },
  };
  assertPassed('basis plan', validatePresentationRealDataBasisEditPlanV001(basisPlan));
  const basisBinding = await writeJsonArtifact(
    path.join(OUTPUT_DIRECTORY, 'basis-edit-plan.json'),
    basisPlan,
  );
  const {words} = loadChunkedSttWords(STT_DIRECTORY);
  const layer1Plan = createLayer1TrimPlan({
    outerRange: {sourceVideoId: 'DmWu0jVQfTE', ...CANDIDATE.outerRange},
    words,
  });
  const placeholderCandidateBinding = {
    path: repoPath(path.join(OUTPUT_DIRECTORY, 'candidate-manifest.json')),
    fileSha256: EMPTY_SHA256,
  };
  const firstBundle = buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan,
    references: {
      mediaEquivalence: mediaBinding,
      sourceIdentity: {path: sourceBinding.path, fileSha256: sourceBinding.fileSha256},
      basisEditPlan: {path: basisBinding.path, fileSha256: basisBinding.fileSha256},
      candidateManifest: placeholderCandidateBinding,
      sttManifest,
      wordTimestamps: sttWordTimestamps,
    },
    mediaFileSha256: executionMedia.fileSha256,
    pageRevision: 'candidate-13-internal-trim-playback-gate-v002-pending-manifest',
  });
  const candidateBinding = await writeJsonArtifact(
    path.join(OUTPUT_DIRECTORY, 'candidate-manifest.json'),
    firstBundle.manifest,
  );
  const finalBundle = buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan,
    references: {
      mediaEquivalence: mediaBinding,
      sourceIdentity: {path: sourceBinding.path, fileSha256: sourceBinding.fileSha256},
      basisEditPlan: {path: basisBinding.path, fileSha256: basisBinding.fileSha256},
      candidateManifest: {path: candidateBinding.path, fileSha256: candidateBinding.fileSha256},
      sttManifest,
      wordTimestamps: sttWordTimestamps,
    },
    mediaFileSha256: executionMedia.fileSha256,
    pageRevision: `candidate-13-internal-trim-playback-gate-v002-${candidateBinding.fileSha256.slice(0, 12)}`,
  });
  await writeJsonArtifact(path.join(OUTPUT_DIRECTORY, 'review-page.json'), finalBundle.page);
  await writeFile(
    path.join(OUTPUT_DIRECTORY, 'review.html'),
    buildPresentationFirstRealDataReviewHtmlV001(finalBundle.page),
    'utf8',
  );
  return {
    mediaBinding,
    sourceBinding: {path: sourceBinding.path, fileSha256: sourceBinding.fileSha256},
    basisBinding: {path: basisBinding.path, fileSha256: basisBinding.fileSha256},
    candidateBinding: {path: candidateBinding.path, fileSha256: candidateBinding.fileSha256},
    workload: finalBundle.workload,
  };
};

const provisionalUi = async () => {
  await mkdir(PROVISIONAL_DIRECTORY, {recursive: true});
  const {words} = loadChunkedSttWords(STT_DIRECTORY);
  const layer1Plan = createLayer1TrimPlan({
    outerRange: {sourceVideoId: 'DmWu0jVQfTE', ...CANDIDATE.outerRange},
    words,
  });
  const mediaRef = await readRef(EXECUTION_MEDIA_PATH);
  const placeholder = (name) => ({path: `provisional/${name}.json`, fileSha256: EMPTY_SHA256});
  const bundle = buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan,
    references: {
      mediaEquivalence: placeholder('media-equivalence'),
      sourceIdentity: placeholder('source-identity'),
      basisEditPlan: placeholder('basis-edit-plan'),
      candidateManifest: placeholder('candidate-manifest'),
      sttManifest: await readRef(STT_MANIFEST_PATH),
      wordTimestamps: await readRef(STT_WORD_TIMESTAMPS_PATH),
    },
    mediaFileSha256: mediaRef.fileSha256,
    pageRevision: 'candidate-13-provisional-browser-playback-v002-required-playback',
  });
  await writeJsonArtifact(path.join(PROVISIONAL_DIRECTORY, 'review-page.json'), bundle.page);
  await writeFile(
    path.join(PROVISIONAL_DIRECTORY, 'review.html'),
    buildPresentationFirstRealDataReviewHtmlV001(bundle.page),
    'utf8',
  );
  await writeJsonArtifact(path.join(PROVISIONAL_DIRECTORY, 'workload.json'), bundle.workload);
};

export const buildTrustedPresentationFirstRealDataReviewBundleV001 = async (...args) => {
  if (args.length !== 0) {
    throw new Error('正式確認bundleは固定済みruntime以外の入力を受け取りません');
  }
  const {summaryBinding, summary, bindings, sourceFiles} =
    await loadTrustedPresentationFirstRealDataRuntimeV001();
  if (
    summaryBinding.path !== PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.path
    || summaryBinding.fileSha256
      !== PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.fileSha256
  ) throw new Error('固定済みartifact-build-summaryのpathまたは実byte hashが一致しません');
  const mediaEquivalence = bindings.mediaEquivalence.value;
  const sourceIdentity = bindings.sourceIdentity.value;
  const candidateManifest = bindings.candidateManifest.value;
  const expectedInputPaths = {
    executionMedia: repoPath(EXECUTION_MEDIA_PATH),
    sttManifest: repoPath(STT_MANIFEST_PATH),
    sttTranscript: repoPath(STT_TRANSCRIPT_PATH),
    sttWordTimestamps: repoPath(STT_WORD_TIMESTAMPS_PATH),
  };
  if (
    sourceIdentity.executionMedia?.path !== expectedInputPaths.executionMedia
    || sourceIdentity.stt?.manifest?.path !== expectedInputPaths.sttManifest
    || sourceIdentity.stt?.transcript?.path !== expectedInputPaths.sttTranscript
    || sourceIdentity.stt?.wordTimestamps?.path !== expectedInputPaths.sttWordTimestamps
  ) throw new Error('固定済み元動画正本とUI実読込pathが一致しません');
  const {
    executionMedia, sttManifest, sttTranscript, sttWordTimestamps,
  } = sourceFiles;
  if (
    JSON.stringify(executionMedia) !== JSON.stringify(mediaEquivalence.artifacts.newExecutionMedia)
    || JSON.stringify(sttManifest) !== JSON.stringify(mediaEquivalence.artifacts.sttManifest)
    || JSON.stringify(sttTranscript) !== JSON.stringify(mediaEquivalence.artifacts.sttTranscript)
    || JSON.stringify(sttWordTimestamps) !== JSON.stringify(mediaEquivalence.artifacts.sttWordTimestamps)
  ) throw new Error('媒体対応証明とUI実読込fileの参照が一致しません');
  const {words} = loadChunkedSttWords(path.dirname(path.resolve(
    WORKSPACE_ROOT,
    sourceIdentity.stt.manifest.path,
  )));
  const layer1Plan = createLayer1TrimPlan({
    outerRange: {sourceVideoId: 'DmWu0jVQfTE', ...CANDIDATE.outerRange},
    words,
  });
  const bundle = buildPresentationFirstRealDataReviewBundleV001({
    words,
    layer1Plan,
    references: {
      mediaEquivalence: summary.artifactBindings.mediaEquivalence,
      sourceIdentity: summary.artifactBindings.sourceIdentity,
      basisEditPlan: summary.artifactBindings.basisEditPlan,
      candidateManifest: summary.artifactBindings.candidateManifest,
      sttManifest,
      wordTimestamps: sttWordTimestamps,
    },
    mediaFileSha256: executionMedia.fileSha256,
    pageRevision: `candidate-13-internal-trim-playback-gate-v002-${bindings.candidateManifest.fileSha256.slice(0, 12)}`,
  });
  if (
    presentationFirstRealDataCanonicalSha256(bundle.manifest)
    !== summary.candidateManifestCanonicalSha256
  ) {
    throw new Error('UI再生成が固定済みcandidate manifestを変更しようとしました');
  }
  return {
    summaryBinding,
    summary,
    bindings,
    sourceFiles,
    bundle,
  };
};

export const refreshPresentationFirstRealDataReviewUiV001 = async (...args) => {
  if (args.length !== 0) {
    throw new Error('UI再生成は固定済みsummary以外の入力を受け取りません');
  }
  const {bundle} = await buildTrustedPresentationFirstRealDataReviewBundleV001();
  await writeJsonArtifact(path.join(OUTPUT_DIRECTORY, 'review-page.json'), bundle.page);
  await writeFile(
    path.join(OUTPUT_DIRECTORY, 'review.html'),
    buildPresentationFirstRealDataReviewHtmlV001(bundle.page),
    'utf8',
  );
};

const parseCli = (argv) => {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('CLI引数は --name value 形式です');
    values.set(flag, value);
  }
  const knownFlags = new Set(['--mode', '--browser-observation']);
  for (const flag of values.keys()) {
    if (!knownFlags.has(flag)) throw new Error(`未対応のCLI引数です: ${flag}`);
  }
  const mode = values.get('--mode');
  if (![
    'provisional-ui', 'inspect-media', 'finalize-media', 'finalize-artifacts', 'refresh-review-ui',
  ].includes(mode)) {
    throw new Error('--modeが不正です');
  }
  if (mode === 'refresh-review-ui' && values.size !== 1) {
    throw new Error('UI再生成は--mode以外の入力を受け取りません');
  }
  return {mode, browserObservationPath: values.get('--browser-observation') ?? null};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseCli(process.argv.slice(2));
  await mkdir(OUTPUT_DIRECTORY, {recursive: true});
  if (options.mode === 'provisional-ui') {
    await provisionalUi();
  } else if (options.mode === 'inspect-media') {
    const inspected = await inspectPresentationSourceMediaEquivalenceV001(
      fixedMediaInspectionInput(null),
    );
    await writeJsonArtifact(INSPECTED_MEDIA_PATH, inspected.artifact);
  } else if (options.mode === 'finalize-media') {
    if (!options.browserObservationPath) throw new Error('--browser-observationが必要です');
    const inspected = await readJson(INSPECTED_MEDIA_PATH);
    const observation = await readJson(path.resolve(options.browserObservationPath));
    const finalized = finalizePresentationSourceMediaEquivalenceBrowserPlaybackV001(
      inspected,
      observation,
    );
    await writeJsonArtifact(FINAL_MEDIA_PATH, finalized.artifact);
  } else if (options.mode === 'finalize-artifacts') {
    const media = await readJson(FINAL_MEDIA_PATH);
    assertPassed('media equivalence schema', validatePresentationSourceMediaEquivalenceV001(media));
    if (media.status !== 'passed') throw new Error('媒体対応証明がpassedではありません');
    const mediaBinding = await readRef(FINAL_MEDIA_PATH);
    const result = await buildArtifacts(mediaBinding);
    await writeJsonArtifact(path.join(OUTPUT_DIRECTORY, 'artifact-build-summary.json'), {
      schemaVersion: 'presentation-first-real-data-artifact-build-summary-v001',
      status: 'passed',
      artifactBindings: {
        mediaEquivalence: result.mediaBinding,
        sourceIdentity: result.sourceBinding,
        basisEditPlan: result.basisBinding,
        candidateManifest: result.candidateBinding,
      },
      workload: result.workload,
      candidateManifestCanonicalSha256: presentationFirstRealDataCanonicalSha256(
        await readJson(path.join(OUTPUT_DIRECTORY, 'candidate-manifest.json')),
      ),
    });
  } else if (options.mode === 'refresh-review-ui') {
    await refreshPresentationFirstRealDataReviewUiV001();
  }
}

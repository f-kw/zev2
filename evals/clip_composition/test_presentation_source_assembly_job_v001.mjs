import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationCandidateSpeechManifestV001,
  classifyPresentationAudioEndDiagnosticV001,
  executePresentationSourceAssemblyJobV001,
  PRESENTATION_CANDIDATE_SPEECH_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION,
  PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION,
  PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION,
  PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION,
  PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
  PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION,
  PRESENTATION_SOURCE_VIEWED_MEDIA_MAPPING_RECEIPT_SCHEMA_VERSION,
  validatePresentationSourceAssemblyJobV001,
} from './run_presentation_source_assembly_job_v001.mjs';
import {
  sha256CanonicalV001,
} from './presentation_retained_source_atoms_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = path.join(MODULE_DIRECTORY, 'run_presentation_source_assembly_job_v001.mjs');
const CORE_PATH = path.join(MODULE_DIRECTORY, 'presentation_retained_source_atoms_v001.mjs');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const writeJsonReference = async (filePath, value) => {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await writeFile(filePath, bytes);
  return {path: filePath, fileSha256: sha256(bytes)};
};
const fileReference = async (filePath) => ({
  path: filePath,
  fileSha256: sha256(await readFile(filePath)),
});
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const makeSttValues = (sourcePath) => {
  const segments = [
    {id: 1, startMs: 1000, endMs: 1100, text: 'A', speaker: 'speaker-a'},
    {id: 2, startMs: 1100, endMs: 1200, text: 'B', speaker: 'speaker-a'},
    {id: 3, startMs: 1300, endMs: 1400, text: 'C', speaker: 'speaker-a'},
    {id: 4, startMs: 1400, endMs: 1500, text: 'D', speaker: 'speaker-a'},
  ];
  return {
    manifest: {
      kind: 'clip_composition_local_stt_chunked_manifest',
      inputPath: sourcePath,
      partial: false,
      processedChunkCount: 1,
      fullChunkCount: 1,
      segmentCount: segments.length,
      wordTimestampCount: segments.length,
      hasWordTimestamps: true,
      boundaryResolution: {
        discardedSegmentCount: 0,
        clampedSegmentCount: 0,
        discardedWordCount: 0,
        clampedWordCount: 0,
      },
    },
    transcript: {
      kind: 'transcript_json',
      segmentCount: segments.length,
      segments,
    },
    wordTimestamps: {
      kind: 'clip_composition_word_timestamps',
      wordCount: segments.length,
      words: segments.map(({id, ...segment}) => ({
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        speaker: segment.speaker,
        segmentId: id,
      })),
    },
  };
};

const candidate = () => ({
  candidateId: 7,
  title: '合成候補',
  outerRange: {startMs: 1000, endMs: 1500},
  speechGroups: [
    {speechId: 1, sourceStartMs: 1000, sourceEndMs: 1200},
    {speechId: 2, sourceStartMs: 1300, sourceEndMs: 1500},
  ],
});

const clearDiagnostic = (source) => classifyPresentationAudioEndDiagnosticV001({
  source,
  candidateEndMs: 1500,
  implementation: {
    name: 'synthetic-vad',
    version: '1',
    path: '<synthetic>',
    fileSha256: 'a'.repeat(64),
    availability: 'available',
  },
  mode0: {
    status: 'measured',
    frames: [
      {startMs: 1480, endMs: 1500, isSpeech: false},
      {startMs: 1500, endMs: 1520, isSpeech: false},
    ],
  },
  mode3: {
    status: 'measured',
    frames: [
      {startMs: 1480, endMs: 1500, isSpeech: false},
      {startMs: 1500, endMs: 1520, isSpeech: false},
    ],
  },
});

const syntheticMediaBuilder = async ({outputPath, outerRange}) => {
  await writeFile(outputPath, Buffer.from('synthetic-review-media-v001'));
  return {
    sourceClock: {fps: 60, decodedFrameCount: 120, logicalFrameCount: 60},
    audioClock: {sampleRate: 48000, channels: 2, channelLayout: 'stereo'},
    mappings: [{
      segmentId: 'segment-0001',
      sourceStartMs: outerRange.startMs,
      sourceEndMs: outerRange.endMs,
      sourceStartFrame30: 30,
      sourceEndFrame30: 45,
      outputStartFrame: 0,
      outputEndFrame: 15,
      audioSamples: {
        sourceStart: 48000,
        sourceEnd: 72000,
        outputStart: 0,
        outputEnd: 24000,
      },
    }],
    expectedFrameCount: 15,
    expectedAudioSampleCount: 24000,
    actualDurationMs: 500,
    inspection: {frameCount: 15},
    execution: {video: {synthetic: true}, mux: {synthetic: true}},
  };
};

const makeFixture = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'presentation-source-assembly-v001-'));
  const sourcePath = path.join(root, 'source.mp4');
  await writeFile(sourcePath, Buffer.from('synthetic-source-media-v001'));
  const source = await fileReference(sourcePath);
  const stt = makeSttValues(sourcePath);
  const sttReferences = {
    manifest: await writeJsonReference(path.join(root, 'manifest.json'), stt.manifest),
    transcript: await writeJsonReference(path.join(root, 'transcript.json'), stt.transcript),
    wordTimestamps: await writeJsonReference(
      path.join(root, 'word-timestamps.json'),
      stt.wordTimestamps,
    ),
  };
  const prepareOutput = path.join(root, 'prepare-output');
  const prepareJob = {
    schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
    jobId: 'synthetic-prepare-review-v001',
    action: 'prepare-review',
    outputDirectory: prepareOutput,
    identifiers: {
      sourceIdentityId: 'synthetic-source-identity-v001',
      sourceMediaBindingId: 'synthetic-source-binding-v001',
      sourceArtifactSummaryId: 'synthetic-source-summary-v001',
      reviewId: 'synthetic-review-v001',
    },
    inputs: {
      source: {
        videoId: 'synthetic-video',
        sourceUrl: 'https://example.invalid/watch?v=synthetic-video',
        sourceRef: 'youtube:synthetic-video',
        sourceProvenance: 'synthetic-media-v001',
        media: source,
      },
      stt: sttReferences,
      candidate: candidate(),
    },
  };
  return {root, sourcePath, source, stt, sttReferences, prepareOutput, prepareJob};
};

const prepareFixture = async (fixture, overrides = {}) => executePresentationSourceAssemblyJobV001(
  fixture.prepareJob,
  {
    buildReviewMedia: syntheticMediaBuilder,
    analyzeAudioEnd: async ({source}) => clearDiagnostic(source),
    ...overrides,
  },
);

const prepareReferences = async (outputDirectory) => ({
  sourceIdentity: await fileReference(path.join(outputDirectory, 'source-identity.json')),
  sourceMediaBinding: await fileReference(path.join(outputDirectory, 'source-media-binding.json')),
  sourceArtifactSummary: await fileReference(path.join(outputDirectory, 'source-artifact-summary.json')),
  basisEditPlan: await fileReference(path.join(outputDirectory, 'basis-edit-plan.json')),
  candidateSpeechManifest: await fileReference(path.join(outputDirectory, 'candidate-speech-manifest.json')),
  reviewManifest: await fileReference(path.join(outputDirectory, 'assembly-review-manifest.json')),
  reviewProvenance: await fileReference(path.join(outputDirectory, 'assembly-review-provenance.json')),
  audioEndDiagnostic: await fileReference(path.join(outputDirectory, 'audio-end-diagnostic.json')),
});

test('01: 0件の間でも候補内の全STT文字を2発話へ一度ずつ保存する', async () => {
  const fixture = await makeFixture();
  try {
    const result = await prepareFixture(fixture);
    assert.equal(result.action, 'prepare-review');
    const speech = await readJson(path.join(fixture.prepareOutput, 'candidate-speech-manifest.json'));
    assert.equal(speech.schemaVersion, PRESENTATION_CANDIDATE_SPEECH_MANIFEST_SCHEMA_VERSION);
    assert.equal(speech.reviewGapCount, 0);
    assert.equal(speech.atomCount, 4);
    assert.deepEqual(speech.speechGroups.map(({speechId}) => speechId), [1, 2]);
    assert.deepEqual(
      speech.speechGroups.flatMap(({characters}) => characters.map(({characterId}) => characterId)),
      ['word-1', 'word-2', 'word-3', 'word-4'],
    );
    assert.equal(new Set(speech.speechGroups.flatMap(({characters}) => characters)).size, 4);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('02: source identity・媒体束縛・要約を候補非依存schemaで保存する', async () => {
  const fixture = await makeFixture();
  try {
    await prepareFixture(fixture);
    const identity = await readJson(path.join(fixture.prepareOutput, 'source-identity.json'));
    const binding = await readJson(path.join(fixture.prepareOutput, 'source-media-binding.json'));
    const summary = await readJson(path.join(fixture.prepareOutput, 'source-artifact-summary.json'));
    assert.equal(identity.schemaVersion, PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION);
    assert.equal(binding.schemaVersion, PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION);
    assert.equal(summary.schemaVersion, PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION);
    assert.equal(binding.verification.sourceAndSttInputSameBytes, true);
    assert.equal(Object.keys(summary.artifacts).length, 9);
    assert.equal((await readdir(fixture.prepareOutput)).length, 10);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('03: 確認媒体は外側境界の1区間とframe/sample写像を保持する', async () => {
  const fixture = await makeFixture();
  try {
    await prepareFixture(fixture);
    const review = await readJson(path.join(fixture.prepareOutput, 'assembly-review-manifest.json'));
    assert.deepEqual(
      {startMs: review.mapping.sourceStartMs, endMs: review.mapping.sourceEndMs},
      fixture.prepareJob.inputs.candidate.outerRange,
    );
    assert.equal(review.media.expectedFrameCount, 15);
    assert.equal(review.media.expectedAudioSampleCount, 24000);
    assert.equal(review.specifiedDurationMs, 500);
    assert.equal(review.media.actualDurationMs, 500);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('04: 音響終端が曖昧な確認HTMLは全編1本・局所聴取・一回答を備え、時刻入力を持たない', async () => {
  const fixture = await makeFixture();
  try {
    await executePresentationSourceAssemblyJobV001(fixture.prepareJob, {
      buildReviewMedia: syntheticMediaBuilder,
    });
    const html = await readFile(path.join(fixture.prepareOutput, 'review.html'), 'utf8');
    assert.match(html, /assembly-review\.mp4/u);
    assert.match(html, /id="source"/u);
    assert.match(html, /sourceVideo\.currentTime=fixed\.sourceEndSeekSeconds/u);
    assert.match(html, /sourceVideo\.play\(\)/u);
    assert.match(html, /assembledEnd/u);
    assert.match(html, /この切り分けでよい/u);
    assert.match(html, /追加編集が必要/u);
    assert.doesNotMatch(html, /type=["'](?:time|number)["']/u);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('05: VAD 2 modeが境界声なしで一致した時だけ局所聴取不要にする', () => {
  const diagnostic = clearDiagnostic({path: '<source>', fileSha256: 'b'.repeat(64)});
  assert.equal(diagnostic.schemaVersion, PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION);
  assert.equal(diagnostic.result, 'clear_for_extra_listen');
});

test('06: 境界後の声・mode不一致・依存不足をすべてambiguousへ戻す', () => {
  const source = {path: '<source>', fileSha256: 'b'.repeat(64)};
  const base = {
    source,
    candidateEndMs: 1500,
    implementation: {name: 'synthetic', availability: 'available'},
    mode0: {
      status: 'measured',
      frames: [{startMs: 1500, endMs: 1520, isSpeech: true}],
    },
  };
  const postVoice = classifyPresentationAudioEndDiagnosticV001({
    ...base,
    mode3: {
      status: 'measured',
      frames: [{startMs: 1500, endMs: 1520, isSpeech: false}],
    },
  });
  assert.equal(postVoice.result, 'ambiguous');
  const unavailable = classifyPresentationAudioEndDiagnosticV001({
    ...base,
    mode0: {status: 'unavailable', frames: []},
    mode3: {status: 'unavailable', frames: []},
  });
  assert.equal(unavailable.result, 'ambiguous');
});

test('07: 架空gap field・空発話・400ms以上の未処理gapを受理しない', async () => {
  const atoms = makeSttValues('<source>').transcript.segments.map((segment, index) => ({
    atomId: `word-${segment.id}`,
    text: segment.text,
    startMs: segment.startMs,
    endMs: segment.endMs,
    speaker: segment.speaker,
    sourceIndex: index,
  }));
  const withFakeGap = candidate();
  withFakeGap.speechGroups[0].gap = {startMs: 1200, endMs: 1300};
  assert.throws(
    () => buildPresentationCandidateSpeechManifestV001({candidate: withFakeGap, sttAtoms: atoms}),
    /fields are invalid/u,
  );
  const empty = candidate();
  empty.speechGroups[0] = {speechId: 1, sourceStartMs: 1000, sourceEndMs: 1050};
  assert.throws(
    () => buildPresentationCandidateSpeechManifestV001({candidate: empty, sttAtoms: atoms}),
    /empty|boundaries/u,
  );
  const fixture = await makeFixture();
  try {
    const gappedStt = makeSttValues(fixture.sourcePath);
    for (const index of [2, 3]) {
      gappedStt.transcript.segments[index].startMs += 300;
      gappedStt.transcript.segments[index].endMs += 300;
      gappedStt.wordTimestamps.words[index].startMs += 300;
      gappedStt.wordTimestamps.words[index].endMs += 300;
    }
    fixture.prepareJob.inputs.stt.transcript = await writeJsonReference(
      path.join(fixture.root, 'transcript-gapped.json'),
      gappedStt.transcript,
    );
    fixture.prepareJob.inputs.stt.wordTimestamps = await writeJsonReference(
      path.join(fixture.root, 'word-timestamps-gapped.json'),
      gappedStt.wordTimestamps,
    );
    fixture.prepareJob.inputs.candidate.outerRange.endMs = 1800;
    fixture.prepareJob.inputs.candidate.speechGroups = [
      {speechId: 1, sourceStartMs: 1000, sourceEndMs: 1200},
      {speechId: 2, sourceStartMs: 1600, sourceEndMs: 1800},
    ];
    await assert.rejects(() => prepareFixture(fixture), /no 400ms review gaps/u);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('08: source媒体とSTT宣言媒体のSHAが違えば媒体生成前に停止する', async () => {
  const fixture = await makeFixture();
  try {
    const other = path.join(fixture.root, 'other-source.mp4');
    await writeFile(other, Buffer.from('different-source'));
    const manifest = makeSttValues(other).manifest;
    fixture.prepareJob.inputs.stt.manifest = await writeJsonReference(
      path.join(fixture.root, 'manifest-other.json'),
      manifest,
    );
    let mediaBuildCalls = 0;
    await assert.rejects(
      () => prepareFixture(fixture, {
        buildReviewMedia: async () => {
          mediaBuildCalls += 1;
          throw new Error('must not run');
        },
      }),
      /not byte-identical/u,
    );
    assert.equal(mediaBuildCalls, 0);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('09: 人間が見た1区間をframe/sample単位で同じ正式組立へ固定する', async () => {
  const fixture = await makeFixture();
  try {
    await prepareFixture(fixture);
    const refs = await prepareReferences(fixture.prepareOutput);
    const summary = await readJson(refs.sourceArtifactSummary.path);
    const humanResult = {
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION,
      resultId: 'synthetic-human-result-v001',
      reviewId: 'synthetic-review-v001',
      candidateId: 7,
      reviewMedia: summary.artifacts['assembly-review.mp4'],
      assemblyChoice: 'accept',
      audioEndChoice: 'not_required',
      recordedAt: '2026-07-27T00:00:00Z',
      timeMeasurement: 'not_measured',
    };
    refs.humanResult = await writeJsonReference(
      path.join(fixture.root, 'human-result.json'),
      humanResult,
    );
    const formalOutput = path.join(fixture.root, 'formal-output');
    const result = await executePresentationSourceAssemblyJobV001({
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
      jobId: 'synthetic-formalize-v001',
      action: 'formalize',
      outputDirectory: formalOutput,
      identifiers: {
        decisionId: 'synthetic-decision-v001',
        formalizationId: 'synthetic-formalization-v001',
        mappingReceiptId: 'synthetic-mapping-v001',
      },
      inputs: refs,
    });
    assert.equal(result.action, 'formalize');
    const decision = await readJson(path.join(formalOutput, 'assembly-decision.json'));
    const mapping = await readJson(path.join(formalOutput, 'viewed-media-mapping-receipt.json'));
    assert.equal(mapping.schemaVersion, PRESENTATION_SOURCE_VIEWED_MEDIA_MAPPING_RECEIPT_SCHEMA_VERSION);
    assert.deepEqual(decision.payload.segments, [{sourceStartMs: 1000, sourceEndMs: 1500}]);
    assert.equal(mapping.mapping.outputEndFrame, 15);
    assert.equal(mapping.mapping.audioSamples.outputEnd, 24000);
    assert.equal(mapping.exactMatch, true);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('10: 追加編集または必要な語尾確認が未解決なら正式化しない', async () => {
  const fixture = await makeFixture();
  try {
    await prepareFixture(fixture);
    const refs = await prepareReferences(fixture.prepareOutput);
    const summary = await readJson(refs.sourceArtifactSummary.path);
    refs.humanResult = await writeJsonReference(path.join(fixture.root, 'human-result.json'), {
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION,
      resultId: 'synthetic-human-result-v001',
      reviewId: 'synthetic-review-v001',
      candidateId: 7,
      reviewMedia: summary.artifacts['assembly-review.mp4'],
      assemblyChoice: 'needs_edit',
      audioEndChoice: 'not_required',
      recordedAt: '2026-07-27T00:00:00Z',
      timeMeasurement: 'not_measured',
    });
    await assert.rejects(() => executePresentationSourceAssemblyJobV001({
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
      jobId: 'synthetic-formalize-needs-edit-v001',
      action: 'formalize',
      outputDirectory: path.join(fixture.root, 'must-not-exist'),
      identifiers: {
        decisionId: 'synthetic-decision-v001',
        formalizationId: 'synthetic-formalization-v001',
        mappingReceiptId: 'synthetic-mapping-v001',
      },
      inputs: refs,
    }), /additional editing/u);
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

const completeFormalFixture = async (fixture) => {
  await prepareFixture(fixture);
  const refs = await prepareReferences(fixture.prepareOutput);
  const summary = await readJson(refs.sourceArtifactSummary.path);
  refs.humanResult = await writeJsonReference(path.join(fixture.root, 'human-result.json'), {
    schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION,
    resultId: 'synthetic-human-result-v001',
    reviewId: 'synthetic-review-v001',
    candidateId: 7,
    reviewMedia: summary.artifacts['assembly-review.mp4'],
    assemblyChoice: 'accept',
    audioEndChoice: 'not_required',
    recordedAt: '2026-07-27T00:00:00Z',
    timeMeasurement: 'not_measured',
  });
  const formalOutput = path.join(fixture.root, 'formal-output');
  await executePresentationSourceAssemblyJobV001({
    schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
    jobId: 'synthetic-formalize-v001',
    action: 'formalize',
    outputDirectory: formalOutput,
    identifiers: {
      decisionId: 'synthetic-decision-v001',
      formalizationId: 'synthetic-formalization-v001',
      mappingReceiptId: 'synthetic-mapping-v001',
    },
    inputs: refs,
  });
  return {refs, formalOutput};
};

test('11: 新speech manifestから既存3成果物を欠落・重複・順序変更0で構築する', async () => {
  const fixture = await makeFixture();
  try {
    const {refs, formalOutput} = await completeFormalFixture(fixture);
    const baseMediaPath = path.join(fixture.root, 'base-media.mp4');
    await writeFile(baseMediaPath, Buffer.from('synthetic-base-media-v001'));
    const baseMedia = await fileReference(baseMediaPath);
    const timelineValue = {
      schemaVersion: 'presentation-base-media-timeline-v002',
      timelineId: 'synthetic-timeline-v001',
      sourceProvenance: 'synthetic-media-v001',
      sourceRef: 'youtube:synthetic-video',
      sourceFrameClock: {
        inputFrameRate: '60/1',
        logicalFrameRate: '30/1',
        extractionRuleId: 'source-frame-60fps-global-even-v001',
        decodedFrameCount: 120,
      },
      baseMedia: {
        artifactId: 'synthetic-base-media-v001',
        path: 'base-media.mp4',
        fileSha256: baseMedia.fileSha256,
        frameRate: '30/1',
        expectedFrameCount: 15,
      },
      segments: [{
        segmentId: 'segment-0001',
        sourceStartMs: 1000,
        sourceEndMs: 1500,
        sourceStartFrame30: 30,
        sourceEndFrame30: 45,
        outputStartFrame: 0,
        outputEndFrame: 15,
      }],
    };
    const timeline = await writeJsonReference(path.join(fixture.root, 'timeline.json'), timelineValue);
    const generationValue = {
      schemaVersion: 'presentation-base-media-generation-manifest-v002',
      buildId: 'synthetic-build-v001',
      source: {fileSha256: fixture.source.fileSha256},
      segments: [{
        ...timelineValue.segments[0],
        audioSamples: {
          sourceStart: 48000,
          sourceEnd: 72000,
          outputStart: 0,
          outputEnd: 24000,
        },
      }],
      outputs: {
        baseMedia: {
          artifactId: 'synthetic-base-media-v001',
          fileSha256: baseMedia.fileSha256,
          frameCount: 15,
        },
        timeline: {
          timelineId: 'synthetic-timeline-v001',
          fileSha256: timeline.fileSha256,
        },
      },
    };
    const generation = await writeJsonReference(
      path.join(fixture.root, 'base-generation.json'),
      generationValue,
    );
    const validation = await writeJsonReference(
      path.join(fixture.root, 'base-validation.json'),
      {
        schemaVersion: 'presentation-base-media-validation-report-v001',
        status: 'passed',
        violations: [],
        outputs: {
          baseMedia: {
            artifactId: 'synthetic-base-media-v001',
            fileSha256: baseMedia.fileSha256,
          },
          timeline: {
            timelineId: 'synthetic-timeline-v001',
            fileSha256: timeline.fileSha256,
          },
        },
      },
    );
    const assemblyDecision = await fileReference(path.join(formalOutput, 'assembly-decision.json'));
    const formalizationReceipt = await fileReference(
      path.join(formalOutput, 'formalization-receipt.json'),
    );
    const mappingReceipt = await fileReference(
      path.join(formalOutput, 'viewed-media-mapping-receipt.json'),
    );
    const atomIds = ['word-1', 'word-2', 'word-3', 'word-4'];
    const rawSourceAtoms = [
      {atomId: 'word-1', speechId: 1, speaker: 'speaker-a', text: 'A', startMs: 1000, endMs: 1100, sourceRef: 'youtube:synthetic-video'},
      {atomId: 'word-2', speechId: 1, speaker: 'speaker-a', text: 'B', startMs: 1100, endMs: 1200, sourceRef: 'youtube:synthetic-video'},
      {atomId: 'word-3', speechId: 2, speaker: 'speaker-a', text: 'C', startMs: 1300, endMs: 1400, sourceRef: 'youtube:synthetic-video'},
      {atomId: 'word-4', speechId: 2, speaker: 'speaker-a', text: 'D', startMs: 1400, endMs: 1500, sourceRef: 'youtube:synthetic-video'},
    ];
    const implementationBinding = {
      gitCommit: 'a'.repeat(40),
      files: [
        {
          role: 'retainedSourceAtomsCore',
          path: CORE_PATH,
          fileSha256: sha256(await readFile(CORE_PATH)),
        },
        {
          role: 'sourceAssemblyRunner',
          path: RUNNER_PATH,
          fileSha256: sha256(await readFile(RUNNER_PATH)),
        },
      ],
    };
    const outputDirectory = path.join(fixture.root, 'source-atoms-output');
    const job = {
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
      jobId: 'synthetic-finalize-source-v001',
      action: 'finalize-source',
      outputDirectory,
      artifactId: 'synthetic-source-atoms-v001',
      inputs: {
        sourceIdentity: refs.sourceIdentity,
        sourceMediaBinding: refs.sourceMediaBinding,
        sourceArtifactSummary: refs.sourceArtifactSummary,
        basisEditPlan: refs.basisEditPlan,
        candidateSpeechManifest: refs.candidateSpeechManifest,
        assemblyDecision,
        formalizationReceipt,
        viewedMediaMappingReceipt: mappingReceipt,
        timeline,
        baseMediaGenerationManifest: generation,
        baseMediaValidationReport: validation,
        baseMedia,
        sttManifest: fixture.sttReferences.manifest,
        transcript: fixture.sttReferences.transcript,
        wordTimestamps: fixture.sttReferences.wordTimestamps,
      },
      expectedProjection: {
        sourceAtomCount: 4,
        rawSourceAtomsCanonicalSha256: sha256CanonicalV001(rawSourceAtoms),
        segments: [{
          timelineSegmentId: 'segment-0001',
          atomCount: 4,
          atomIdsCanonicalSha256: sha256CanonicalV001(atomIds),
        }],
        speechGroups: [
          {speechId: 1, atomCount: 2},
          {speechId: 2, atomCount: 2},
        ],
      },
      implementationBinding,
    };
    const result = await executePresentationSourceAssemblyJobV001(job, {
      jobBinding: {
        path: path.join(fixture.root, 'synthetic-finalize-job.json'),
        fileSha256: 'f'.repeat(64),
      },
    });
    assert.equal(result.status, 'passed');
    const sourceAtoms = await readJson(path.join(outputDirectory, 'source-atoms.json'));
    assert.deepEqual(sourceAtoms.rawSourceAtoms.map(({atomId}) => atomId), atomIds);
    assert.deepEqual(sourceAtoms.rawSourceAtoms.map(({speechId}) => speechId), [1, 1, 2, 2]);
    assert.equal(sourceAtoms.rawSourceAtomsCanonicalSha256, sha256CanonicalV001(rawSourceAtoms));
    assert.deepEqual(
      (await readdir(outputDirectory)).sort(),
      ['generation-manifest.json', 'source-atoms.json', 'validation-report.json'],
    );
  } finally {
    await rm(fixture.root, {recursive: true, force: true});
  }
});

test('12: 旧job schemaと未知fieldを新入口へ暗黙受理しない', () => {
  assert.throws(() => validatePresentationSourceAssemblyJobV001({
    schemaVersion: 'presentation-retained-source-atoms-job-v001',
    jobId: 'legacy',
    action: 'prepare-review',
    outputDirectory: '<output>',
  }), /schema is unsupported/u);
  const job = {
    schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
    jobId: 'synthetic-prepare-review-v001',
    action: 'prepare-review',
    outputDirectory: '<output>',
    identifiers: {
      sourceIdentityId: 'a',
      sourceMediaBindingId: 'b',
      sourceArtifactSummaryId: 'c',
      reviewId: 'd',
    },
    inputs: {
      source: {
        videoId: 'v',
        sourceUrl: 'u',
        sourceRef: 'r',
        sourceProvenance: 'p',
        media: {path: 'm', fileSha256: 'a'.repeat(64)},
      },
      stt: {
        manifest: {path: 'm', fileSha256: 'a'.repeat(64)},
        transcript: {path: 't', fileSha256: 'a'.repeat(64)},
        wordTimestamps: {path: 'w', fileSha256: 'a'.repeat(64)},
      },
      candidate: candidate(),
    },
    compatibilityFallback: true,
  };
  assert.throws(() => validatePresentationSourceAssemblyJobV001(job), /fields are invalid/u);
});

test('13: runnerへ正式素材ID・candidate 59固有値を焼き込まない', async () => {
  const source = await readFile(RUNNER_PATH, 'utf8');
  assert.doesNotMatch(source, /qdczJpv8RCc|DmWu0jVQfTE/u);
  assert.doesNotMatch(source, /candidateId\s*[:=]\s*59/u);
  assert.doesNotMatch(source, /5941162|5992736|1547|2475200/u);
});

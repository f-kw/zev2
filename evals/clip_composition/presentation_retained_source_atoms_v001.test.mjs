import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename as fsRename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES,
  buildPresentationRetainedSourceAtomsV001,
  canonicalJsonV001,
  sha256CanonicalV001,
  validatePresentationRetainedSourceAtomsJobV001,
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  executePresentationRetainedSourceAtomsJobV001,
  runPresentationRetainedSourceAtomsJobFileV001,
  validatePresentationRetainedSourceAtomsSourceDependenciesV001,
} from './run_presentation_retained_source_atoms_job_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const TESTDATA_ROOT = path.join(MODULE_DIRECTORY, 'testdata/presentation-retained-source-atoms-v001');
const RUNTIME_PARENT = path.join(TESTDATA_ROOT, `.runtime-${process.pid}`);
const CORE_PATH = path.join(MODULE_DIRECTORY, 'presentation_retained_source_atoms_v001.mjs');
const RUNNER_PATH = path.join(MODULE_DIRECTORY, 'run_presentation_retained_source_atoms_job_v001.mjs');
const CLI_PATH = RUNNER_PATH;
const SEED = JSON.parse(await readFile(path.join(TESTDATA_ROOT, 'fixture-seed.json'), 'utf8'));
const SCENARIO_MANIFEST = JSON.parse(
  await readFile(path.join(TESTDATA_ROOT, 'scenario-manifest.json'), 'utf8'),
);

let fixtureSerial = 0;
const runtimeRoots = [];
const observedViolationCodes = new Set();
const coveredScenarioIds = new Set();

const clone = (value) => structuredClone(value);
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const canonicalJsonLocal = (value) => JSON.stringify(canonicalize(value));
const sha256CanonicalLocal = (value) => sha256Bytes(canonicalJsonLocal(value));
const repoPath = (value) => path.relative(WORKSPACE_ROOT, value);
const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), {recursive: true});
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(filePath, bytes);
  return {path: repoPath(filePath), absolutePath: filePath, fileSha256: sha256Bytes(bytes), bytes, value};
};
const writeBytes = async (filePath, bytes) => {
  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, bytes);
  return {path: repoPath(filePath), absolutePath: filePath, fileSha256: sha256Bytes(bytes), bytes};
};
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const fileSha256 = async (filePath) => sha256Bytes(await readFile(filePath));
const markScenario = (...ids) => ids.forEach((id) => coveredScenarioIds.add(id));
const observeViolations = (result) => {
  for (const violation of result?.violations ?? result?.result?.violations ?? []) {
    observedViolationCodes.add(violation.code);
  }
};
const expectViolation = (result, code) => {
  observeViolations(result);
  assert.ok(
    (result?.violations ?? result?.result?.violations ?? []).some((violation) => violation.code === code),
    `expected ${code}: ${JSON.stringify(result?.violations ?? result?.result?.violations ?? [], null, 2)}`,
  );
};
const expectPassed = (result) => {
  assert.equal(result?.status ?? result?.result?.status, 'passed', JSON.stringify(result, null, 2));
};

const runCli = (args, options = {}) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, [CLI_PATH, ...args], {
    cwd: WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp', ...(options.env ?? {})},
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout).toString(),
    stderr: Buffer.concat(stderr).toString(),
  }));
});

const speechFromAtoms = (speechId, atoms) => ({
  speechId,
  startMs: atoms[0].startMs,
  endMs: atoms.at(-1).endMs,
  text: atoms.map(({text}) => text).join(''),
  characters: atoms.map(({id, text, startMs, endMs}) => ({
    characterId: `word-${id}`,
    text,
    startMs,
    endMs,
  })),
});

const createSemanticObjects = async (root) => {
  const inputRoot = path.join(root, 'inputs');
  const sourceRoot = path.join(root, 'source-media');
  const outputRoot = path.join(root, 'outputs');
  const failureRoot = path.join(root, 'failures');
  await Promise.all([
    mkdir(inputRoot, {recursive: true}),
    mkdir(sourceRoot, {recursive: true}),
    mkdir(outputRoot, {recursive: true}),
    mkdir(failureRoot, {recursive: true}),
  ]);

  const sourceMedia = await writeBytes(path.join(sourceRoot, 'source-media.mp4'), Buffer.from('source-media-v001'));
  const baseMedia = await writeBytes(path.join(inputRoot, 'base-media.mp4'), Buffer.from('base-media-v001'));
  const atoms = clone(SEED.atoms);
  const transcriptSegments = atoms.map(({id, text, startMs, endMs, ...rest}) => ({
    id,
    startMs,
    endMs,
    text,
    ...(Object.hasOwn(rest, 'speaker') ? {speaker: rest.speaker} : {}),
  }));
  const words = atoms.map(({id, text, startMs, endMs, ...rest}) => ({
    text,
    startMs,
    endMs,
    ...(Object.hasOwn(rest, 'speaker') ? {speaker: rest.speaker} : {}),
    segmentId: id,
  }));
  const sttManifestValue = {
    kind: 'clip_composition_local_stt_chunked_manifest',
    createdAt: '2026-07-22T00:00:00.000Z',
    itemId: 'synthetic-retained-atoms-v001',
    role: 'source',
    inputPath: sourceMedia.absolutePath,
    serverUrl: 'http://127.0.0.1:8000',
    language: 'ja-JP',
    chunkSec: 120,
    fullChunkCount: 1,
    processedChunkCount: 1,
    partial: false,
    segmentCount: atoms.length,
    wordTimestampCount: atoms.length,
    hasWordTimestamps: true,
    boundaryResolution: {
      basis: 'exact_audio_chunk_boundaries',
      discardedSegmentCount: 0,
      clampedSegmentCount: 0,
      discardedWordCount: 0,
      clampedWordCount: 0,
    },
    chunks: [],
  };
  const transcriptValue = {
    kind: 'transcript_json',
    generatedAt: '2026-07-22T00:00:00.000Z',
    sourceUri: 'synthetic://retained-atoms-v001',
    language: 'ja-JP',
    mode: 'local_stt_chunked',
    durationSec: 0.8,
    originalDurationSec: 0.8,
    partial: false,
    processedChunkCount: 1,
    fullChunkCount: 1,
    segmentCount: atoms.length,
    segments: transcriptSegments,
    speechUnitGroups: [],
    notes: [],
  };
  const wordTimestampsValue = {
    kind: 'clip_composition_word_timestamps',
    generatedAt: '2026-07-22T00:00:00.000Z',
    sourceUri: 'synthetic://retained-atoms-v001',
    wordCount: atoms.length,
    words,
  };
  const sttManifest = await writeJson(path.join(inputRoot, 'stt-manifest.json'), sttManifestValue);
  const transcript = await writeJson(path.join(inputRoot, 'transcript.json'), transcriptValue);
  const wordTimestamps = await writeJson(path.join(inputRoot, 'word-timestamps.json'), wordTimestampsValue);

  const mediaEquivalenceValue = {
    schemaVersion: 'presentation-source-media-equivalence-v001',
    equivalenceId: 'synthetic-media-equivalence-v001',
    sourceVideoId: 'synthetic-retained-atoms-v001',
    status: 'passed',
    artifacts: {
      oldReviewMedia: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
      format299Video: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
      newExecutionMedia: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
      infoJson: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      sttManifest: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      sttTranscript: {path: transcript.path, fileSha256: transcript.fileSha256},
      sttWordTimestamps: {path: wordTimestamps.path, fileSha256: wordTimestamps.fileSha256},
      sttChunk16Flac: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
    },
    checks: [{checkId: 'audio-byte-equivalent', status: 'passed'}],
  };
  const mediaEquivalence = await writeJson(
    path.join(inputRoot, 'media-equivalence.json'),
    mediaEquivalenceValue,
  );
  const sourceIdentityValue = {
    schemaVersion: 'presentation-real-data-source-identity-v001',
    sourceIdentityId: 'synthetic-source-identity-v001',
    videoId: 'synthetic-retained-atoms-v001',
    sourceUrl: 'https://www.youtube.com/watch?v=synthetic-retained-atoms-v001',
    sourceProvenance: SEED.sourceProvenance,
    sourceRef: SEED.sourceRef,
    executionMedia: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
    mediaEquivalence: {path: mediaEquivalence.path, fileSha256: mediaEquivalence.fileSha256},
    stt: {
      manifest: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      transcript: {path: transcript.path, fileSha256: transcript.fileSha256},
      wordTimestamps: {path: wordTimestamps.path, fileSha256: wordTimestamps.fileSha256},
    },
  };
  const sourceIdentity = await writeJson(path.join(inputRoot, 'source-identity.json'), sourceIdentityValue);
  const basisEditPlanValue = {
    schemaVersion: 'presentation-real-data-basis-edit-plan-v001',
    basisPlanId: 'synthetic-basis-edit-plan-v001',
    kind: 'edit_plan_json',
    references: {
      sourceIdentity: {path: sourceIdentity.path, fileSha256: sourceIdentity.fileSha256},
      mediaEquivalence: {path: mediaEquivalence.path, fileSha256: mediaEquivalence.fileSha256},
      humanResult: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
    },
    candidate: {
      ...clone(SEED.candidate),
      qualitativeInternalEdit: {
        kind: 'remove_silence_and_fillers',
        sourceValue: 'remove_silence_and_fillers',
        resolved: false,
      },
    },
  };
  const basisEditPlan = await writeJson(path.join(inputRoot, 'basis-edit-plan.json'), basisEditPlanValue);

  const bySpeech = new Map();
  for (const atom of atoms) {
    const speechId = atom.speechId === 2 ? 1 : atom.speechId;
    const list = bySpeech.get(speechId) ?? [];
    list.push(atom);
    bySpeech.set(speechId, list);
  }
  const speech1 = speechFromAtoms(1, bySpeech.get(1));
  const speech2 = speechFromAtoms(3, bySpeech.get(3).slice(0, 2));
  const speech3 = speechFromAtoms(4, bySpeech.get(3).slice(2));
  const candidateManifestValue = {
    schemaVersion: 'presentation-internal-trim-review-candidate-manifest-v001',
    manifestId: 'synthetic-candidate-manifest-v001',
    references: {
      mediaEquivalence: {path: mediaEquivalence.path, fileSha256: mediaEquivalence.fileSha256},
      sourceIdentity: {path: sourceIdentity.path, fileSha256: sourceIdentity.fileSha256},
      basisEditPlan: {path: basisEditPlan.path, fileSha256: basisEditPlan.fileSha256},
      sttManifest: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      wordTimestamps: {path: wordTimestamps.path, fileSha256: wordTimestamps.fileSha256},
    },
    candidate: clone(SEED.candidate),
    presenter: {
      lineage: 'layer1-trim-v001@deterministic-rule',
      role: 'review-position-presenter',
      minimumGapMs: 400,
      automaticCut: false,
      paddingApplied: false,
    },
    workload: {
      independentJudgmentCount: 2,
      requiredExplicitOperationCount: 2,
      initialPositionSearchCount: 0,
      requiredPlaybackRanges: [],
      editedPlaybackDurationRangeMs: {minimumMs: 600, maximumMs: 800},
      totalInitialPlaybackDurationRangeMs: {minimumMs: 600, maximumMs: 800},
    },
    reviewItems: [
      {
        reviewItemId: 'synthetic-gap-01',
        gap: {startMs: 400, endMs: 500},
        protectionReasons: ['utterance_boundary'],
        fillerCandidateCount: 0,
        beforeUtterance: speech1,
        afterUtterance: speech2,
      },
      {
        reviewItemId: 'synthetic-gap-02',
        gap: {startMs: 650, endMs: 700},
        protectionReasons: ['utterance_boundary'],
        fillerCandidateCount: 0,
        beforeUtterance: clone(speech2),
        afterUtterance: speech3,
      },
    ],
  };
  const candidateManifest = await writeJson(path.join(inputRoot, 'candidate-manifest.json'), candidateManifestValue);
  const trustedArtifactSummaryValue = {
    schemaVersion: 'presentation-first-real-data-artifact-build-summary-v001',
    status: 'passed',
    artifactBindings: {
      mediaEquivalence: {path: mediaEquivalence.path, fileSha256: mediaEquivalence.fileSha256},
      sourceIdentity: {path: sourceIdentity.path, fileSha256: sourceIdentity.fileSha256},
      basisEditPlan: {path: basisEditPlan.path, fileSha256: basisEditPlan.fileSha256},
      candidateManifest: {path: candidateManifest.path, fileSha256: candidateManifest.fileSha256},
    },
    workload: clone(candidateManifestValue.workload),
    candidateManifestCanonicalSha256: sha256CanonicalLocal(candidateManifestValue),
  };
  const trustedArtifactSummary = await writeJson(
    path.join(inputRoot, 'artifact-build-summary.json'),
    trustedArtifactSummaryValue,
  );
  const decisionPayload = {
    basisEditPlan: {kind: 'edit_plan_json', path: basisEditPlan.path, fileSha256: basisEditPlan.fileSha256},
    sourceArtifact: {
      sourceProvenance: SEED.sourceProvenance,
      sourceRef: SEED.sourceRef,
      sourceUri: sourceIdentityValue.sourceUrl,
      fileSha256: sourceMedia.fileSha256,
    },
    segments: SEED.formalSegments.map(({sourceStartMs, sourceEndMs}) => ({sourceStartMs, sourceEndMs})),
    unresolvedEdits: [],
  };
  const payloadSha256 = sha256CanonicalLocal(decisionPayload);
  const assemblyDecisionValue = {
    schemaVersion: 'presentation-base-media-assembly-decision-v001',
    decisionId: 'synthetic-assembly-decision-v001',
    payload: decisionPayload,
    approval: {
      status: 'approved',
      approverType: 'human',
      recordId: 'synthetic-human-approval-v001',
      recordedAt: '2026-07-22T00:00:00Z',
      targetPayloadSha256: payloadSha256,
    },
  };
  const assemblyDecision = await writeJson(path.join(inputRoot, 'assembly-decision.json'), assemblyDecisionValue);
  const mappedSegments = SEED.formalSegments.map((segment, index) => ({
    segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
    ...clone(segment),
  }));
  const formalizationReceiptValue = {
    schemaVersion: 'presentation-first-real-data-assembly-formalization-receipt-v001',
    formalizationId: 'synthetic-formalization-v001',
    formalizerVersion: 'presentation-first-real-data-assembly-formalizer-v001',
    status: 'passed',
    references: {
      humanResult: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      validationReceipt: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      humanObservation: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      formalizationApproval: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      comparisonSummary: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      comparisonProvenance: {path: sttManifest.path, fileSha256: sttManifest.fileSha256},
      selectedMedia: {variantId: 'cut-gap', path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
      trustedArtifactSummary: {
        path: trustedArtifactSummary.path,
        fileSha256: trustedArtifactSummary.fileSha256,
      },
      sourceIdentity: {path: sourceIdentity.path, fileSha256: sourceIdentity.fileSha256},
      basisEditPlan: {path: basisEditPlan.path, fileSha256: basisEditPlan.fileSha256},
      assemblyDecision: {
        path: assemblyDecision.path,
        fileSha256: assemblyDecision.fileSha256,
        payloadSha256,
      },
    },
    selection: {
      candidateId: SEED.candidate.candidateId,
      variantId: 'cut-gap',
      gapDecisions: {gap01: 'keep', gap02: 'cut'},
      mappingSource: 'synthetic-v001',
      viewedMappings: clone(mappedSegments),
      expectedFrameCount: 18,
      expectedAudioSampleCount: 28800,
    },
    formalization: {
      segments: clone(decisionPayload.segments),
      derivedMappings: clone(mappedSegments),
      mappingsMatchViewedVariant: true,
      decisionPayloadSha256: payloadSha256,
      frameSchemaLimitation: 'synthetic fixture',
    },
  };
  const formalizationReceipt = await writeJson(
    path.join(inputRoot, 'formalization-receipt.json'),
    formalizationReceiptValue,
  );
  const timelineValue = {
    schemaVersion: 'presentation-base-media-timeline-v002',
    timelineId: 'synthetic-timeline-v001',
    sourceProvenance: SEED.sourceProvenance,
    sourceRef: SEED.sourceRef,
    sourceFrameClock: {
      inputFrameRate: '60/1',
      logicalFrameRate: '30/1',
      extractionRuleId: 'source-frame-60fps-global-even-v001',
      decodedFrameCount: 60,
    },
    baseMedia: {
      artifactId: 'synthetic-base-media-v001',
      path: 'base-media.mp4',
      fileSha256: baseMedia.fileSha256,
      frameRate: '30/1',
      expectedFrameCount: 18,
    },
    segments: mappedSegments.map(({audioSamples, ...segment}) => segment),
  };
  const timeline = await writeJson(path.join(inputRoot, 'timeline.json'), timelineValue);
  const baseMediaGenerationManifestValue = {
    schemaVersion: 'presentation-base-media-generation-manifest-v002',
    buildId: 'synthetic-base-media-build-v001',
    job: {
      jobId: 'synthetic-base-media-job-v001',
      schemaVersion: 'presentation-base-media-build-job-v001',
      fileSha256: '0'.repeat(64),
    },
    source: {
      sourceProvenance: SEED.sourceProvenance,
      sourceRef: SEED.sourceRef,
      sourceUri: sourceIdentityValue.sourceUrl,
      path: sourceMedia.path,
      fileSha256: sourceMedia.fileSha256,
    },
    assemblyDecision: {
      decisionId: assemblyDecisionValue.decisionId,
      fileSha256: assemblyDecision.fileSha256,
      payloadSha256,
      approvalRecordId: assemblyDecisionValue.approval.recordId,
    },
    basisEditPlan: {
      kind: 'edit_plan_json',
      path: basisEditPlan.path,
      fileSha256: basisEditPlan.fileSha256,
    },
    segments: clone(mappedSegments),
    audio: {present: true, sampleRate: 48000, channels: 2},
    execution: {commands: []},
    outputs: {
      baseMedia: {
        artifactId: timelineValue.baseMedia.artifactId,
        path: baseMedia.path,
        fileSha256: baseMedia.fileSha256,
        frameCount: 18,
      },
      timeline: {
        timelineId: timelineValue.timelineId,
        path: timeline.path,
        fileSha256: timeline.fileSha256,
      },
    },
    checks: {status: 'passed'},
  };
  const baseMediaGenerationManifest = await writeJson(
    path.join(inputRoot, 'base-generation-manifest.json'),
    baseMediaGenerationManifestValue,
  );
  const baseMediaValidationReportValue = {
    schemaVersion: 'presentation-base-media-validation-report-v001',
    buildId: baseMediaGenerationManifestValue.buildId,
    status: 'passed',
    violations: [],
    inputs: {
      assemblyDecision: {
        path: assemblyDecision.path,
        fileSha256: assemblyDecision.fileSha256,
        payloadSha256,
      },
      basisEditPlan: {path: basisEditPlan.path, fileSha256: basisEditPlan.fileSha256},
      sourceMedia: {path: sourceMedia.path, fileSha256: sourceMedia.fileSha256},
    },
    outputs: {
      baseMedia: {
        artifactId: timelineValue.baseMedia.artifactId,
        path: baseMedia.path,
        fileSha256: baseMedia.fileSha256,
      },
      timeline: {
        timelineId: timelineValue.timelineId,
        path: timeline.path,
        fileSha256: timeline.fileSha256,
      },
      generationManifest: {
        buildId: baseMediaGenerationManifestValue.buildId,
        path: baseMediaGenerationManifest.path,
        fileSha256: baseMediaGenerationManifest.fileSha256,
      },
    },
    checks: {
      approvalBinding: {status: 'passed', violationCodes: []},
      sourceBinding: {status: 'passed', violationCodes: []},
      videoQc: {status: 'passed', violationCodes: []},
      audioQc: {status: 'passed', violationCodes: []},
      timelineQc: {status: 'passed', violationCodes: []},
      hashGraph: {status: 'passed', violationCodes: []},
      publishPreconditions: {status: 'passed', violationCodes: []},
    },
  };
  const baseMediaValidationReport = await writeJson(
    path.join(inputRoot, 'base-validation-report.json'),
    baseMediaValidationReportValue,
  );

  const direct = {
    sourceIdentity,
    candidateManifest,
    assemblyDecision,
    formalizationReceipt,
    timeline,
    baseMediaGenerationManifest,
    baseMediaValidationReport,
  };
  const expanded = {
    sttManifest,
    transcript,
    wordTimestamps,
    mediaEquivalence,
    trustedArtifactSummary,
    basisEditPlan,
    baseMedia,
  };
  const implementationFiles = [
    {role: 'core', path: repoPath(CORE_PATH), fileSha256: await fileSha256(CORE_PATH)},
    {role: 'runner', path: repoPath(RUNNER_PATH), fileSha256: await fileSha256(RUNNER_PATH)},
  ];
  const retainedAtomIds = ['word-1', 'word-2', 'word-3', 'word-5', 'word-6', 'word-7'];
  const retainedRawAtoms = atoms
    .filter(({id}) => id !== 4)
    .map(({id, speechId: seedSpeechId, text, startMs, endMs, ...rest}) => ({
      atomId: `word-${id}`,
      speechId: seedSpeechId === 2 ? 1 : seedSpeechId === 3 ? (id === 7 ? 4 : 3) : seedSpeechId,
      ...(Object.hasOwn(rest, 'speaker') ? {speaker: rest.speaker} : {}),
      text,
      startMs,
      endMs,
      sourceRef: SEED.sourceRef,
    }));
  const expectedProjection = {
    sourceAtomCount: retainedRawAtoms.length,
    rawSourceAtomsCanonicalSha256: sha256CanonicalLocal(retainedRawAtoms),
    segments: [
      {
        timelineSegmentId: 'segment-0001',
        atomCount: 3,
        atomIdsCanonicalSha256: sha256CanonicalLocal(retainedAtomIds.slice(0, 3)),
      },
      {
        timelineSegmentId: 'segment-0002',
        atomCount: 3,
        atomIdsCanonicalSha256: sha256CanonicalLocal(retainedAtomIds.slice(3)),
      },
    ],
    speechGroups: [
      {speechId: 1, atomCount: 3},
      {speechId: 3, atomCount: 2},
      {speechId: 4, atomCount: 1},
    ],
  };

  return {
    root,
    inputRoot,
    sourceRoot,
    outputRoot,
    failureRoot,
    sourceMedia,
    baseMedia,
    direct,
    expanded,
    implementationFiles,
    expectedProjection,
    payloadSha256,
    values: {
      sourceIdentity: sourceIdentityValue,
      candidateManifest: candidateManifestValue,
      assemblyDecision: assemblyDecisionValue,
      formalizationReceipt: formalizationReceiptValue,
      timeline: timelineValue,
      baseMediaGenerationManifest: baseMediaGenerationManifestValue,
      baseMediaValidationReport: baseMediaValidationReportValue,
      sttManifest: sttManifestValue,
      transcript: transcriptValue,
      wordTimestamps: wordTimestampsValue,
      mediaEquivalence: mediaEquivalenceValue,
      trustedArtifactSummary: trustedArtifactSummaryValue,
      basisEditPlan: basisEditPlanValue,
    },
  };
};

const createFixture = async (name) => {
  fixtureSerial += 1;
  await mkdir(RUNTIME_PARENT, {recursive: true});
  const root = await mkdtemp(path.join(RUNTIME_PARENT, `${String(fixtureSerial).padStart(3, '0')}-${name}-`));
  runtimeRoots.push(root);
  const semantic = await createSemanticObjects(root);
  const outputDirectory = path.join(semantic.outputRoot, 'retained-source-atoms-v001');
  const job = {
    schemaVersion: 'presentation-retained-source-atoms-job-v001',
    jobId: `synthetic-${name}-job-v001`,
    artifactId: `synthetic-${name}-artifact-v001`,
    candidateId: SEED.candidate.candidateId,
    declaredAtomGranularity: 'character-timestamp',
    implementationBinding: {
      gitCommit: 'a'.repeat(40),
      files: clone(semantic.implementationFiles),
    },
    inputs: {
      sourceIdentity: {
        path: semantic.direct.sourceIdentity.path,
        fileSha256: semantic.direct.sourceIdentity.fileSha256,
      },
      candidateManifest: {
        path: semantic.direct.candidateManifest.path,
        fileSha256: semantic.direct.candidateManifest.fileSha256,
      },
      assemblyDecision: {
        path: semantic.direct.assemblyDecision.path,
        fileSha256: semantic.direct.assemblyDecision.fileSha256,
        payloadCanonicalSha256: semantic.payloadSha256,
      },
      formalizationReceipt: {
        path: semantic.direct.formalizationReceipt.path,
        fileSha256: semantic.direct.formalizationReceipt.fileSha256,
      },
      timeline: {
        path: semantic.direct.timeline.path,
        fileSha256: semantic.direct.timeline.fileSha256,
      },
      baseMediaGenerationManifest: {
        path: semantic.direct.baseMediaGenerationManifest.path,
        fileSha256: semantic.direct.baseMediaGenerationManifest.fileSha256,
      },
      baseMediaValidationReport: {
        path: semantic.direct.baseMediaValidationReport.path,
        fileSha256: semantic.direct.baseMediaValidationReport.fileSha256,
      },
    },
    expectedProjection: clone(semantic.expectedProjection),
    outputDirectory: repoPath(outputDirectory),
  };
  const jobRecord = await writeJson(path.join(semantic.inputRoot, 'job.json'), job);
  const directInputs = Object.entries(semantic.direct).map(([role, record]) => ({
    role,
    path: record.path,
    fileSha256: record.fileSha256,
    schemaVersion: record.value.schemaVersion ?? record.value.kind,
    value: clone(record.value),
  }));
  const expandedInputs = Object.entries(semantic.expanded).map(([role, record]) => ({
    role,
    path: record.path,
    fileSha256: record.fileSha256,
    schemaVersion: role === 'baseMedia'
      ? null
      : (record.value.schemaVersion ?? record.value.kind),
    value: role === 'baseMedia' ? null : clone(record.value),
  }));
  const runtimeNodePath = await realpath(process.execPath);
  const context = {
    job: clone(job),
    jobBinding: {path: jobRecord.path, fileSha256: jobRecord.fileSha256},
    implementation: {
      files: semantic.implementationFiles.map((entry) => ({
        role: entry.role,
        path: entry.path,
        actualFileSha256: entry.fileSha256,
      })),
      runtime: {
        resolvedNodePath: runtimeNodePath,
        nodeFileSha256: await fileSha256(runtimeNodePath),
        nodeVersion: process.version,
        bindingRole: 'diagnostic-not-pass-fail',
      },
    },
    directInputs,
    expandedInputs,
  };
  return {
    ...semantic,
    job,
    jobRecord,
    outputDirectory,
    context,
  };
};

const runnerContext = (fixture, overrides = {}) => ({
  workspaceRoot: WORKSPACE_ROOT,
  inputJsonRoot: fixture.root,
  sourceMediaRoots: [fixture.root],
  outputRoot: fixture.outputRoot,
  failureRoot: fixture.failureRoot,
  coreModulePath: CORE_PATH,
  runnerModulePath: RUNNER_PATH,
  ...overrides,
});

const rewriteFixtureJob = async (fixture, mutate) => {
  mutate(fixture.job);
  fixture.jobRecord = await writeJson(fixture.jobRecord.absolutePath, fixture.job);
  fixture.context.job = clone(fixture.job);
  fixture.context.jobBinding = {
    path: fixture.jobRecord.path,
    fileSha256: fixture.jobRecord.fileSha256,
  };
  return fixture;
};

const runFixture = async (fixture, overrides = {}) => runPresentationRetainedSourceAtomsJobFileV001(
  fixture.jobRecord.absolutePath,
  runnerContext(fixture, overrides),
);

const replaceContextInputValue = (context, role, mutate) => {
  const lists = [context.directInputs, context.expandedInputs];
  const entry = lists.flat().find((candidate) => candidate.role === role);
  assert.ok(entry, `missing context role: ${role}`);
  mutate(entry.value, entry);
  return context;
};

const getContextInput = (context, role) => {
  const entry = [...context.directInputs, ...context.expandedInputs].find((candidate) => candidate.role === role);
  assert.ok(entry, `missing context role: ${role}`);
  return entry.value;
};

const rebindExpectedProjection = (context) => {
  const sourceIdentity = getContextInput(context, 'sourceIdentity');
  const candidateManifest = getContextInput(context, 'candidateManifest');
  const transcript = getContextInput(context, 'transcript');
  const timeline = getContextInput(context, 'timeline');
  const speechByAtomId = new Map();
  for (const item of candidateManifest.reviewItems) {
    for (const speech of [item.beforeUtterance, item.afterUtterance]) {
      for (const character of speech.characters) {
        const previous = speechByAtomId.get(character.characterId);
        if (previous !== undefined) assert.equal(previous, speech.speechId);
        speechByAtomId.set(character.characterId, speech.speechId);
      }
    }
  }
  const segmentAtoms = timeline.segments.map((segment) => transcript.segments.filter((atom) => (
    atom.startMs >= segment.sourceStartMs && atom.endMs <= segment.sourceEndMs
  )));
  const rawSourceAtoms = segmentAtoms.flatMap((atoms) => atoms.map((atom) => ({
    atomId: `word-${atom.id}`,
    speechId: speechByAtomId.get(`word-${atom.id}`),
    ...(Object.hasOwn(atom, 'speaker') ? {speaker: atom.speaker} : {}),
    text: atom.text,
    startMs: atom.startMs,
    endMs: atom.endMs,
    sourceRef: sourceIdentity.sourceRef,
  })));
  const speechCounts = new Map();
  for (const atom of rawSourceAtoms) speechCounts.set(atom.speechId, (speechCounts.get(atom.speechId) ?? 0) + 1);
  context.job.expectedProjection = {
    sourceAtomCount: rawSourceAtoms.length,
    rawSourceAtomsCanonicalSha256: sha256CanonicalLocal(rawSourceAtoms),
    segments: timeline.segments.map((segment, index) => {
      const ids = segmentAtoms[index].map(({id}) => `word-${id}`);
      return {
        timelineSegmentId: segment.segmentId,
        atomCount: ids.length,
        atomIdsCanonicalSha256: sha256CanonicalLocal(ids),
      };
    }),
    speechGroups: [...speechCounts]
      .sort(([left], [right]) => left - right)
      .map(([speechId, atomCount]) => ({speechId, atomCount})),
  };
  return rawSourceAtoms;
};

const rebindDecisionPayload = (context) => {
  const decision = getContextInput(context, 'assemblyDecision');
  const payloadSha256 = sha256CanonicalLocal(decision.payload);
  decision.approval.targetPayloadSha256 = payloadSha256;
  context.job.inputs.assemblyDecision.payloadCanonicalSha256 = payloadSha256;
  const formalization = getContextInput(context, 'formalizationReceipt');
  formalization.references.assemblyDecision.payloadSha256 = payloadSha256;
  formalization.formalization.decisionPayloadSha256 = payloadSha256;
  const generation = getContextInput(context, 'baseMediaGenerationManifest');
  generation.assemblyDecision.payloadSha256 = payloadSha256;
  const validation = getContextInput(context, 'baseMediaValidationReport');
  validation.inputs.assemblyDecision.payloadSha256 = payloadSha256;
  return payloadSha256;
};

const mutateMatchingAtom = (context, atomId, mutate, {transcript = true, words = true, candidate = true} = {}) => {
  const numericId = Number(atomId.replace('word-', ''));
  if (transcript) {
    const atom = getContextInput(context, 'transcript').segments.find(({id}) => id === numericId);
    assert.ok(atom);
    mutate(atom);
  }
  if (words) {
    const atom = getContextInput(context, 'wordTimestamps').words.find(({segmentId}) => segmentId === numericId);
    assert.ok(atom);
    mutate(atom);
  }
  if (candidate) {
    for (const item of getContextInput(context, 'candidateManifest').reviewItems) {
      for (const speech of [item.beforeUtterance, item.afterUtterance]) {
        const atom = speech.characters.find(({characterId}) => characterId === atomId);
        if (atom) mutate(atom);
      }
    }
  }
};

const mutateSpeechCopy = (context, itemIndex, side, mutate) => {
  const speech = getContextInput(context, 'candidateManifest').reviewItems[itemIndex][side];
  mutate(speech);
};

const createCandidate13ReadOnlyPreflightContext = async () => {
  const directPaths = {
    sourceIdentity: 'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/source-identity.json',
    candidateManifest: 'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json',
    assemblyDecision: 'evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/assembly-decision.json',
    formalizationReceipt: 'evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/formalization-receipt.json',
    timeline: 'evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/timeline.json',
    baseMediaGenerationManifest: 'evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/generation-manifest.json',
    baseMediaValidationReport: 'evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/validation-report.json',
  };
  const readJsonRecord = async (role, relativePath) => {
    const absolutePath = path.join(WORKSPACE_ROOT, relativePath);
    const bytes = await readFile(absolutePath);
    const value = JSON.parse(bytes.toString('utf8'));
    return {
      role,
      path: relativePath,
      absolutePath,
      fileSha256: sha256Bytes(bytes),
      schemaVersion: value.schemaVersion ?? value.kind,
      value,
    };
  };
  const directByRole = Object.fromEntries(await Promise.all(
    Object.entries(directPaths).map(async ([role, relativePath]) => [role, await readJsonRecord(role, relativePath)]),
  ));
  const sourceIdentity = directByRole.sourceIdentity.value;
  const formalizationReceipt = directByRole.formalizationReceipt.value;
  const generationManifest = directByRole.baseMediaGenerationManifest.value;
  const expandedPaths = {
    sttManifest: sourceIdentity.stt.manifest.path,
    transcript: sourceIdentity.stt.transcript.path,
    wordTimestamps: sourceIdentity.stt.wordTimestamps.path,
    mediaEquivalence: sourceIdentity.mediaEquivalence.path,
    trustedArtifactSummary: formalizationReceipt.references.trustedArtifactSummary.path,
    basisEditPlan: formalizationReceipt.references.basisEditPlan.path,
  };
  const expandedByRole = Object.fromEntries(await Promise.all(
    Object.entries(expandedPaths).map(async ([role, relativePath]) => [role, await readJsonRecord(role, relativePath)]),
  ));
  const baseMediaPath = path.join(
    path.dirname(directPaths.baseMediaGenerationManifest),
    generationManifest.outputs.baseMedia.path,
  );
  const baseMediaAbsolutePath = path.join(WORKSPACE_ROOT, baseMediaPath);
  expandedByRole.baseMedia = {
    role: 'baseMedia',
    path: baseMediaPath,
    absolutePath: baseMediaAbsolutePath,
    fileSha256: await fileSha256(baseMediaAbsolutePath),
    schemaVersion: null,
    value: null,
  };

  const implementationFiles = await Promise.all([
    ['core', CORE_PATH],
    ['runner', RUNNER_PATH],
  ].map(async ([role, absolutePath]) => ({
    role,
    path: repoPath(absolutePath),
    fileSha256: await fileSha256(absolutePath),
  })));
  const payloadCanonicalSha256 = sha256CanonicalLocal(directByRole.assemblyDecision.value.payload);
  const job = {
    schemaVersion: 'presentation-retained-source-atoms-job-v001',
    jobId: 'DmWu0jVQfTE-candidate-13-read-only-preflight-v001',
    artifactId: 'DmWu0jVQfTE-candidate-13-retained-source-atoms-v001',
    candidateId: 13,
    declaredAtomGranularity: 'character-timestamp',
    implementationBinding: {
      gitCommit: 'f'.repeat(40),
      files: implementationFiles,
    },
    inputs: Object.fromEntries(Object.entries(directByRole).map(([role, record]) => [role, {
      path: record.path,
      fileSha256: record.fileSha256,
      ...(role === 'assemblyDecision' ? {payloadCanonicalSha256} : {}),
    }])),
    expectedProjection: {
      sourceAtomCount: 1,
      rawSourceAtomsCanonicalSha256: '0'.repeat(64),
      segments: [{
        timelineSegmentId: 'preflight-placeholder',
        atomCount: 1,
        atomIdsCanonicalSha256: '0'.repeat(64),
      }],
      speechGroups: [{speechId: 1, atomCount: 1}],
    },
    outputDirectory: 'evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001',
  };
  const runtimeNodePath = await realpath(process.execPath);
  const context = {
    job,
    jobBinding: {path: 'read-only-memory-preflight/DmWu0jVQfTE-candidate-13-v001.json', fileSha256: '0'.repeat(64)},
    implementation: {
      approvedGitCommit: job.implementationBinding.gitCommit,
      files: implementationFiles.map(({role, path: filePath, fileSha256: actualFileSha256}) => ({
        role,
        path: filePath,
        actualFileSha256,
      })),
      runtime: {
        resolvedNodePath: runtimeNodePath,
        nodeFileSha256: await fileSha256(runtimeNodePath),
        nodeVersion: process.version,
        bindingRole: 'diagnostic-not-pass-fail',
      },
    },
    directInputs: Object.values(directByRole).map(({absolutePath, ...record}) => ({...record, value: clone(record.value)})),
    expandedInputs: Object.values(expandedByRole).map(({absolutePath, ...record}) => ({
      ...record,
      value: record.value === null ? null : clone(record.value),
    })),
  };
  const projectedAtoms = rebindExpectedProjection(context);
  context.jobBinding.fileSha256 = sha256Bytes(Buffer.from(`${JSON.stringify(context.job, null, 2)}\n`));
  return {context, projectedAtoms, directByRole, expandedByRole};
};

after(async () => {
  await Promise.all(runtimeRoots.map((root) => rm(root, {recursive: true, force: true})));
  await rm(RUNTIME_PARENT, {recursive: true, force: true});
});

test('01: 2つの正式区間と内部gapから残存atomを決定的に抽出する', async () => {
  markScenario(1);
  const fixture = await createFixture('normal-two-segments');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  assert.equal(result.sourceAtoms.rawSourceAtoms.length, 6);
  assert.deepEqual(result.sourceAtoms.selection.segments.map(({atomCount}) => atomCount), [3, 3]);
});

test('02: cut gap内のatomを正式編集による除外として記録する', async () => {
  markScenario(2);
  const fixture = await createFixture('cut-gap-exclusion');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  assert.equal(result.generationManifest.observations.counts.excludedByAssemblyCount, 1);
  assert.equal(result.sourceAtoms.rawSourceAtoms.some(({atomId}) => atomId === 'word-4'), false);
});

test('03: 半開区間の境界接触を部分交差にしない', async () => {
  markScenario(3);
  const fixture = await createFixture('half-open-boundary-touch');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  assert.equal(result.generationManifest.observations.counts.boundaryPartialOverlapCount, 0);
  assert.deepEqual(result.sourceAtoms.selection.segments[0].atomIds, ['word-1', 'word-2', 'word-3']);
});

test('04: source atomの正の時間重なりを拒否せず観測へ残す', async () => {
  markScenario(4, 36);
  const fixture = await createFixture('source-positive-overlap');
  const context = clone(fixture.context);
  mutateMatchingAtom(context, 'word-2', (atom) => { atom.startMs = 50; });
  rebindExpectedProjection(context);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectPassed(result);
  assert.deepEqual(result.generationManifest.observations.sourceAtomPositiveOverlaps, [{
    leftAtomId: 'word-1',
    rightAtomId: 'word-2',
    overlapStartMs: 50,
    overlapEndMs: 100,
  }]);
});

test('05: 同一speechIdの完全一致コピーを一度だけ統合する', async () => {
  markScenario(5);
  const fixture = await createFixture('duplicate-speech-copy');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  assert.equal(result.sourceAtoms.rawSourceAtoms.length, 6);
  assert.equal(result.sourceAtoms.rawSourceAtoms.filter(({speechId}) => speechId === 3).length, 2);
});

test('06: speaker欠落・null・不透明値・unknownを加工せず保持する', async () => {
  markScenario(6);
  const fixture = await createFixture('raw-speaker-values');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  const byId = new Map(result.sourceAtoms.rawSourceAtoms.map((atom) => [atom.atomId, atom]));
  assert.equal(Object.hasOwn(byId.get('word-3'), 'speaker'), false);
  assert.equal(byId.get('word-5').speaker, 'opaque-cluster-A');
  assert.equal(byId.get('word-6').speaker, 'unknown');
});

test('07: 空の正式segmentを許し、全体にatomがあれば成功する', async () => {
  markScenario(7);
  const fixture = await createFixture('empty-segment');
  const context = clone(fixture.context);
  getContextInput(context, 'candidateManifest').candidate.outerRange.endMs = 1000;
  getContextInput(context, 'basisEditPlan').candidate.outerRange.endMs = 1000;
  const timeline = getContextInput(context, 'timeline');
  timeline.segments.push({
    segmentId: 'segment-0003',
    sourceStartMs: 900,
    sourceEndMs: 1000,
    sourceStartFrame30: 27,
    sourceEndFrame30: 30,
    outputStartFrame: 18,
    outputEndFrame: 21,
  });
  const decision = getContextInput(context, 'assemblyDecision');
  decision.payload.segments.push({sourceStartMs: 900, sourceEndMs: 1000});
  const formalization = getContextInput(context, 'formalizationReceipt');
  formalization.formalization.segments.push({sourceStartMs: 900, sourceEndMs: 1000});
  const mapping = {
    segmentId: 'segment-0003', sourceStartMs: 900, sourceEndMs: 1000,
    sourceStartFrame30: 27, sourceEndFrame30: 30, outputStartFrame: 18, outputEndFrame: 21,
    audioSamples: {sourceStart: 43200, sourceEnd: 48000, outputStart: 28800, outputEnd: 33600},
  };
  formalization.selection.viewedMappings.push(clone(mapping));
  formalization.formalization.derivedMappings.push(clone(mapping));
  const generation = getContextInput(context, 'baseMediaGenerationManifest');
  generation.segments.push(clone(mapping));
  generation.outputs.baseMedia.frameCount = 21;
  timeline.baseMedia.expectedFrameCount = 21;
  formalization.selection.expectedFrameCount = 21;
  formalization.selection.expectedAudioSampleCount = 33600;
  rebindDecisionPayload(context);
  rebindExpectedProjection(context);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectPassed(result);
  assert.equal(result.sourceAtoms.selection.segments.at(-1).atomCount, 0);
});

test('08: jobの欠落・未知field・不正SHA・非整数candidateをexact schemaで拒否する', async () => {
  markScenario(8);
  const fixture = await createFixture('job-exact-schema');
  const cases = [
    (job) => { delete job.artifactId; },
    (job) => { job.unknown = true; },
    (job) => { job.implementationBinding.files[0].fileSha256 = 'not-a-sha'; },
    (job) => { job.candidateId = 13.5; },
  ];
  for (const mutate of cases) {
    const job = clone(fixture.job);
    mutate(job);
    const result = validatePresentationRetainedSourceAtomsJobV001(job);
    expectViolation(result, 'RETAINED_ATOMS_JOB_INVALID');
  }
});

test('09: CLI usage・job読込・JSON parseはexit 2、危険pathは契約違反にする', async () => {
  markScenario(9);
  const missingUsage = await runCli([]);
  assert.equal(missingUsage.code, 2);
  const missingJob = await runCli([path.join(RUNTIME_PARENT, 'does-not-exist.json')]);
  assert.equal(missingJob.code, 2);
  await mkdir(RUNTIME_PARENT, {recursive: true});
  const badJsonPath = path.join(RUNTIME_PARENT, 'bad-job.json');
  await writeFile(badJsonPath, '{bad json');
  const badJson = await runCli([badJsonPath]);
  assert.equal(badJson.code, 2);

  const fixture = await createFixture('unsafe-input-path');
  await rewriteFixtureJob(fixture, (job) => {
    job.inputs.sourceIdentity.path = '../../outside.json';
  });
  const unsafe = await runFixture(fixture);
  assert.equal(unsafe.exitCode, 1);
  expectViolation(unsafe, 'RETAINED_ATOMS_INPUT_PATH_UNSAFE');
});

test('10: 注入入口はjobPath・bytes・SHA・parse済みobjectの4点一致を要求する', async () => {
  markScenario(10);
  const fixture = await createFixture('job-byte-injection');
  const request = {
    jobPath: fixture.jobRecord.absolutePath,
    jobBytes: fixture.jobRecord.bytes,
    jobFileSha256: fixture.jobRecord.fileSha256,
    job: clone(fixture.job),
  };
  const cases = [
    {...request, jobBytes: undefined},
    {...request, jobFileSha256: '0'.repeat(64)},
    {...request, job: {...clone(fixture.job), artifactId: 'different'}},
  ];
  for (const current of cases) {
    const result = await executePresentationRetainedSourceAtomsJobV001(current, runnerContext(fixture));
    assert.equal(result.exitCode, 1);
    expectViolation(result, 'RETAINED_ATOMS_JOB_FILE_MISMATCH');
  }
});

test('11: implementation bytes/path/import契約とexpected projection全項目を束縛する', async () => {
  markScenario(11);
  const fixture = await createFixture('implementation-projection-binding');
  for (const role of ['core', 'runner']) {
    const implementationContext = clone(fixture.context);
    implementationContext.implementation.files.find((file) => file.role === role).actualFileSha256 = '0'.repeat(64);
    const implementation = await buildPresentationRetainedSourceAtomsV001(implementationContext);
    expectViolation(implementation, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH');
  }

  for (const role of ['core', 'runner']) {
    const actualShaFixture = await createFixture(`implementation-actual-sha-${role}`);
    await rewriteFixtureJob(actualShaFixture, (job) => {
      job.implementationBinding.files.find((file) => file.role === role).fileSha256 = '0'.repeat(64);
    });
    const actualShaResult = await runFixture(actualShaFixture);
    assert.equal(actualShaResult.exitCode, 1);
    expectViolation(actualShaResult, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH');
  }

  for (const role of ['core', 'runner']) {
    const copiedPathFixture = await createFixture(`implementation-copied-path-${role}`);
    const original = role === 'core' ? CORE_PATH : RUNNER_PATH;
    const copyPath = path.join(copiedPathFixture.root, `same-byte-${role}.mjs`);
    await cp(original, copyPath);
    assert.equal(await fileSha256(copyPath), await fileSha256(original));
    await rewriteFixtureJob(copiedPathFixture, (job) => {
      job.implementationBinding.files.find((file) => file.role === role).path = repoPath(copyPath);
    });
    const copiedPathResult = await runFixture(copiedPathFixture);
    assert.equal(copiedPathResult.exitCode, 1);
    expectViolation(copiedPathResult, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH');
  }

  const validCoreSource = [
    "import {readFile} from 'node:fs/promises'",
    'export const syntheticCore = readFile',
    '',
  ].join('\n');
  const validRunnerSource = [
    "import {syntheticCore} from './presentation_retained_source_atoms_v001.mjs'",
    'export {syntheticCore}',
    '',
  ].join('\n');
  const validDependencies = validatePresentationRetainedSourceAtomsSourceDependenciesV001({
    coreSource: validCoreSource,
    runnerSource: validRunnerSource,
    corePath: CORE_PATH,
    runnerPath: RUNNER_PATH,
  });
  assert.equal(validDependencies.status, 'passed');
  assert.deepEqual(validDependencies.coreProjectImports, []);
  assert.deepEqual(validDependencies.runnerProjectImports, ['./presentation_retained_source_atoms_v001.mjs']);
  assert.equal(path.resolve(validDependencies.resolvedRunnerProjectImportPath), path.resolve(CORE_PATH));

  const dependencyViolations = [
    {
      name: 'core-project-import',
      coreSource: `${validCoreSource}import './forbidden-core-project-module.mjs'\n`,
      runnerSource: validRunnerSource,
    },
    {
      name: 'runner-extra-project-import',
      coreSource: validCoreSource,
      runnerSource: `${validRunnerSource}import './forbidden-runner-project-module.mjs'\n`,
    },
    {
      name: 'dynamic-import',
      coreSource: `${validCoreSource}const dynamicallyLoaded = import('./forbidden-dynamic.mjs')\n`,
      runnerSource: validRunnerSource,
    },
    {
      name: 'create-require',
      coreSource: `${validCoreSource}import {createRequire} from 'node:module'\n`,
      runnerSource: validRunnerSource,
    },
  ];
  for (const dependencyCase of dependencyViolations) {
    const {name, ...sources} = dependencyCase;
    assert.throws(() => validatePresentationRetainedSourceAtomsSourceDependenciesV001({
      ...sources,
      corePath: CORE_PATH,
      runnerPath: RUNNER_PATH,
    }), (error) => {
      expectViolation({violations: [error.violation]}, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH');
      return true;
    }, name);
  }

  const projectionMutators = [
    (projection) => { projection.sourceAtomCount += 1; },
    (projection) => { projection.segments[0].atomCount += 1; },
    (projection) => { projection.speechGroups[0].atomCount += 1; },
    (projection) => { projection.rawSourceAtomsCanonicalSha256 = '0'.repeat(64); },
  ];
  for (const mutate of projectionMutators) {
    const context = clone(fixture.context);
    mutate(context.job.expectedProjection);
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH');
  }
});

test('12: direct・expanded全入力の実byte hash差を拒否する', async () => {
  markScenario(12);
  const directRoles = [
    'sourceIdentity',
    'candidateManifest',
    'assemblyDecision',
    'formalizationReceipt',
    'timeline',
    'baseMediaGenerationManifest',
    'baseMediaValidationReport',
  ];
  const expandedRoles = [
    'sttManifest',
    'transcript',
    'wordTimestamps',
    'mediaEquivalence',
    'trustedArtifactSummary',
    'basisEditPlan',
    'baseMedia',
  ];
  const appendUnboundByte = async (record) => {
    await writeFile(record.absolutePath, Buffer.concat([await readFile(record.absolutePath), Buffer.from('\n')]));
  };

  for (const [stage, roles] of [['direct', directRoles], ['expanded', expandedRoles]]) {
    for (const role of roles) {
      const fixture = await createFixture(`${stage}-input-hash-${role}`);
      await appendUnboundByte(fixture[stage][role]);
      const result = await runFixture(fixture);
      assert.equal(result.exitCode, 1);
      expectViolation(result, 'RETAINED_ATOMS_INPUT_HASH_MISMATCH');
      const violations = result.result.violations;
      assert.equal(violations.length, 1, `${stage}:${role}は固有のhash差1件だけを記録する`);
      assert.equal(violations[0].details.path, fixture[stage][role].path);
    }
  }

  const multipleDirect = await createFixture('direct-input-two-independent-hash-mismatches');
  for (const role of directRoles.slice(0, 2)) await appendUnboundByte(multipleDirect.direct[role]);
  const multipleDirectResult = await runFixture(multipleDirect);
  assert.equal(multipleDirectResult.exitCode, 1);
  expectViolation(multipleDirectResult, 'RETAINED_ATOMS_INPUT_HASH_MISMATCH');
  assert.deepEqual(
    multipleDirectResult.result.violations.map(({code, path: violationPath}) => ({code, path: violationPath})),
    directRoles.slice(0, 2).map((role) => ({
      code: 'RETAINED_ATOMS_INPUT_HASH_MISMATCH',
      path: `$.inputs.${role}`,
    })),
    'direct入力の複数hash差を宣言role順で全件記録する',
  );

  const multipleExpanded = await createFixture('expanded-input-two-independent-hash-mismatches');
  for (const role of expandedRoles.slice(0, 2)) await appendUnboundByte(multipleExpanded.expanded[role]);
  const multipleExpandedResult = await runFixture(multipleExpanded);
  assert.equal(multipleExpandedResult.exitCode, 1);
  expectViolation(multipleExpandedResult, 'RETAINED_ATOMS_INPUT_HASH_MISMATCH');
  assert.deepEqual(
    multipleExpandedResult.result.violations.map(({code, path: violationPath}) => ({code, path: violationPath})),
    expandedRoles.slice(0, 2).map((role) => ({
      code: 'RETAINED_ATOMS_INPUT_HASH_MISMATCH',
      path: `$.inputs.${role}`,
    })),
    'expanded入力の複数hash差を宣言role順で全件記録する',
  );
});

test('13: 既存finalと外国lockを保持して停止する', async () => {
  markScenario(13);
  const finalFixture = await createFixture('existing-final');
  await mkdir(finalFixture.outputDirectory, {recursive: true});
  await writeFile(path.join(finalFixture.outputDirectory, 'foreign.txt'), 'keep');
  const finalResult = await runFixture(finalFixture);
  expectViolation(finalResult, 'RETAINED_ATOMS_OUTPUT_EXISTS');
  assert.equal(await readFile(path.join(finalFixture.outputDirectory, 'foreign.txt'), 'utf8'), 'keep');

  const lockFixture = await createFixture('foreign-lock');
  await writeFile(`${lockFixture.outputDirectory}.lock`, 'foreign-lock');
  const lockResult = await runFixture(lockFixture);
  expectViolation(lockResult, 'RETAINED_ATOMS_OUTPUT_LOCK_CONFLICT');
  assert.equal(await readFile(`${lockFixture.outputDirectory}.lock`, 'utf8'), 'foreign-lock');
});

test('14: 出力親symlinkと処理中のfinal出現を公開前に拒否する', async () => {
  markScenario(14);
  const unsafeFixture = await createFixture('output-parent-symlink');
  const realParent = path.join(unsafeFixture.root, 'real-output-parent');
  const linkedParent = path.join(unsafeFixture.root, 'linked-output-parent');
  await mkdir(realParent);
  await symlink(realParent, linkedParent);
  await rewriteFixtureJob(unsafeFixture, (job) => {
    job.outputDirectory = repoPath(path.join(linkedParent, 'final'));
  });
  const unsafe = await runFixture(unsafeFixture, {outputRoot: unsafeFixture.root});
  expectViolation(unsafe, 'RETAINED_ATOMS_OUTPUT_PATH_UNSAFE');

  const racedFixture = await createFixture('final-race');
  const raced = await runFixture(racedFixture, {
    hooks: {
      beforePrePublishRehash: async () => mkdir(racedFixture.outputDirectory, {recursive: true}),
    },
  });
  expectViolation(raced, 'RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED');

  const runBeforeAtomicRenameRace = async (name, inject, expectedCode) => {
    const fixture = await createFixture(`before-atomic-rename-${name}`);
    const finalRenameCalls = [];
    const result = await runFixture(fixture, {
      hooks: {
        beforeAtomicRename: async (paths) => inject(paths, fixture),
      },
      rename: async (source, destination) => {
        if (path.resolve(destination) === path.resolve(fixture.outputDirectory)) {
          finalRenameCalls.push({source, destination});
        }
        return fsRename(source, destination);
      },
    });
    assert.equal(result.exitCode, 1);
    expectViolation(result, expectedCode);
    assert.equal(finalRenameCalls.length, 0, '検査後にfinal directoryをrenameしてはならない');
    return {fixture, result};
  };

  const finalRace = await runBeforeAtomicRenameRace('final-created', async ({outputDirectory}) => {
    await mkdir(outputDirectory);
    await writeFile(path.join(outputDirectory, 'foreign.txt'), 'foreign-final');
  }, 'RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED');
  assert.equal(
    await readFile(path.join(finalRace.fixture.outputDirectory, 'foreign.txt'), 'utf8'),
    'foreign-final',
  );

  let extraFilePath;
  const extraFileRace = await runBeforeAtomicRenameRace('fourth-staged-file', async ({publishTemporaryDirectory}) => {
    extraFilePath = path.join(publishTemporaryDirectory, 'foreign-fourth-file.json');
    await writeFile(extraFilePath, 'foreign-staged-file');
  }, 'RETAINED_ATOMS_HASH_GRAPH_INVALID');
  assert.equal(await readFile(extraFilePath, 'utf8'), 'foreign-staged-file');
  await assert.rejects(stat(extraFileRace.fixture.outputDirectory));

  for (const fileName of ['source-atoms.json', 'generation-manifest.json', 'validation-report.json']) {
    let mutatedPath;
    const artifactRace = await runBeforeAtomicRenameRace(`mutated-${fileName}`, async ({publishTemporaryDirectory}) => {
      mutatedPath = path.join(publishTemporaryDirectory, fileName);
      await writeFile(mutatedPath, Buffer.concat([await readFile(mutatedPath), Buffer.from(' ')]));
    }, 'RETAINED_ATOMS_HASH_GRAPH_INVALID');
    assert.ok((await readFile(mutatedPath)).at(-1) === 0x20, `${fileName}の注入byteを保持する`);
    await assert.rejects(stat(artifactRace.fixture.outputDirectory));
  }

  let movedOutputParent;
  const ancestorRace = await runBeforeAtomicRenameRace(
    'output-ancestor-symlink',
    async ({outputDirectory}) => {
      const outputParent = path.dirname(outputDirectory);
      movedOutputParent = `${outputParent}-moved`;
      await fsRename(outputParent, movedOutputParent);
      await symlink(movedOutputParent, outputParent);
    },
    'RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED',
  );
  const outputParentInfo = await lstat(path.dirname(ancestorRace.fixture.outputDirectory));
  assert.equal(outputParentInfo.isSymbolicLink(), true);
  assert.ok(await stat(movedOutputParent));
  await assert.rejects(stat(ancestorRace.fixture.outputDirectory));

  let changedDirectInput;
  const inputRace = await runBeforeAtomicRenameRace(
    'direct-input-mutated',
    async (_, fixture) => {
      changedDirectInput = fixture.direct.sourceIdentity.absolutePath;
      await writeFile(
        changedDirectInput,
        Buffer.concat([await readFile(changedDirectInput), Buffer.from('\n')]),
      );
    },
    'RETAINED_ATOMS_INPUT_HASH_MISMATCH',
  );
  assert.notEqual(
    await fileSha256(changedDirectInput),
    inputRace.fixture.direct.sourceIdentity.fileSha256,
  );
  await assert.rejects(stat(inputRace.fixture.outputDirectory));
});

test('15: publish直前にjob・実装・direct・expanded・mediaを全て再hashする', async () => {
  markScenario(15);
  const cases = [
    ['job', 'RETAINED_ATOMS_JOB_FILE_MISMATCH', (fixture) => fixture.jobRecord.absolutePath],
    ['core', 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', () => CORE_PATH],
    ['runner', 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', () => RUNNER_PATH],
    ['direct', 'RETAINED_ATOMS_INPUT_HASH_MISMATCH', (fixture) => fixture.direct.sourceIdentity.absolutePath],
    ['expanded', 'RETAINED_ATOMS_INPUT_HASH_MISMATCH', (fixture) => fixture.expanded.transcript.absolutePath],
    ['media', 'RETAINED_ATOMS_INPUT_HASH_MISMATCH', (fixture) => fixture.baseMedia.absolutePath],
  ];
  for (const [name, code, getPath] of cases) {
    const fixture = await createFixture(`prepublish-rehash-${name}`);
    const target = getPath(fixture);
    const original = await readFile(target);
    const result = await runFixture(fixture, {
      hooks: {
        beforePrePublishRehash: async () => writeFile(target, Buffer.concat([original, Buffer.from('changed')])),
      },
    });
    await writeFile(target, original);
    expectViolation(result, code);
  }
});

test('16: 初回読込後の同byte symlink差し替えもpath契約で停止する', async () => {
  markScenario(16);
  const fixture = await createFixture('same-byte-symlink-swap');
  const target = fixture.expanded.transcript.absolutePath;
  const copyPath = `${target}.copy`;
  await cp(target, copyPath);
  const result = await runFixture(fixture, {
    hooks: {
      beforePrePublishRehash: async () => {
        await rm(target);
        await symlink(copyPath, target);
      },
    },
  });
  expectViolation(result, 'RETAINED_ATOMS_INPUT_PATH_UNSAFE');
});

test('17: directory rename失敗を原子的公開失敗として保持する', async () => {
  markScenario(17);
  const fixture = await createFixture('rename-failure');
  const result = await runFixture(fixture, {
    rename: async () => {
      const error = new Error('injected rename failure');
      error.code = 'EIO';
      throw error;
    },
  });
  expectViolation(result, 'RETAINED_ATOMS_ATOMIC_COMMIT_FAILED');
  await assert.rejects(stat(fixture.outputDirectory));
});

test('18: failure記録を新規renameで作り、job byte差とUUID衝突を隠さない', async () => {
  markScenario(18);
  const fixture = await createFixture('failure-report');
  await rewriteFixtureJob(fixture, (job) => { job.candidateId = 99; });
  const first = await runFixture(fixture, {randomUUID: () => '00000000-0000-4000-8000-000000000001'});
  assert.equal(first.exitCode, 1);
  assert.ok(first.failureReportPath);
  const report = await readJson(first.failureReportPath);
  assert.equal(report.job.fileSha256, fixture.jobRecord.fileSha256);
  assert.equal(report.violationsCanonicalSha256, sha256CanonicalLocal(report.violations));

  const collisionFixture = await createFixture('failure-report-collision');
  await rewriteFixtureJob(collisionFixture, (job) => { job.candidateId = 99; });
  const collisionId = '00000000-0000-4000-8000-000000000002';
  const collisionPath = path.join(collisionFixture.failureRoot, `${collisionId}.json`);
  await writeFile(collisionPath, 'foreign');
  const collision = await runFixture(collisionFixture, {randomUUID: () => collisionId});
  assert.equal(collision.exitCode, 1);
  assert.equal(collision.failureReportPath, null);
  assert.equal(await readFile(collisionPath, 'utf8'), 'foreign');
});

test('19: 未承認decision・payload SHA差・未解決編集を別々に拒否する', async () => {
  markScenario(19);
  const fixture = await createFixture('approval-and-unresolved');
  const unapproved = clone(fixture.context);
  getContextInput(unapproved, 'assemblyDecision').approval.status = 'pending';
  const unapprovedResult = await buildPresentationRetainedSourceAtomsV001(unapproved);
  expectViolation(unapprovedResult, 'RETAINED_ATOMS_APPROVAL_INVALID');

  const payload = clone(fixture.context);
  getContextInput(payload, 'assemblyDecision').payload.segments[0].sourceEndMs = 299;
  const payloadResult = await buildPresentationRetainedSourceAtomsV001(payload);
  expectViolation(payloadResult, 'RETAINED_ATOMS_APPROVAL_INVALID');

  const unresolved = clone(fixture.context);
  getContextInput(unresolved, 'assemblyDecision').payload.unresolvedEdits.push({kind: 'qualitative'});
  rebindDecisionPayload(unresolved);
  const unresolvedResult = await buildPresentationRetainedSourceAtomsV001(unresolved);
  expectViolation(unresolvedResult, 'RETAINED_ATOMS_UNRESOLVED_EDITS');
});

test('20: 組立決定欠落と正式化の候補・variant・区間・frame・sample差を拒否する', async () => {
  markScenario(20);
  const fixture = await createFixture('formalization-mismatch');
  const missingSegments = clone(fixture.context);
  delete getContextInput(missingSegments, 'assemblyDecision').payload.segments;
  const missing = await buildPresentationRetainedSourceAtomsV001(missingSegments);
  expectViolation(missing, 'RETAINED_ATOMS_ASSEMBLY_INVALID');

  for (const mutate of [
    (value) => { value.selection.candidateId = 99; },
    (value) => { value.selection.variantId = 'other'; },
    (value) => { value.formalization.segments[0].sourceEndMs -= 1; },
    (value) => { value.formalization.derivedMappings[0].outputEndFrame -= 1; },
    (value) => { value.formalization.derivedMappings[0].audioSamples.outputEnd -= 1; },
  ]) {
    const context = clone(fixture.context);
    mutate(getContextInput(context, 'formalizationReceipt'));
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    assert.equal(result.status, 'failed');
    observeViolations(result);
    assert.ok(result.violations.some(({code}) => [
      'RETAINED_ATOMS_APPROVAL_INVALID',
      'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH',
    ].includes(code)));
  }
});

test('21: 正式化→trusted summary→4artifactの一方向鎖を完全一致させる', async () => {
  markScenario(21);
  const fixture = await createFixture('trusted-chain');
  const context = clone(fixture.context);
  getContextInput(context, 'trustedArtifactSummary').artifactBindings.candidateManifest.fileSha256 = '0'.repeat(64);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH');
});

test('22: timeline・生成記録・合格記録のdecision/build/timeline/hash差を拒否する', async () => {
  markScenario(22);
  const fixture = await createFixture('base-media-chain');
  for (const mutate of [
    (context) => { getContextInput(context, 'timeline').timelineId = 'different'; },
    (context) => { getContextInput(context, 'baseMediaGenerationManifest').buildId = 'different'; },
    (context) => { getContextInput(context, 'baseMediaValidationReport').outputs.timeline.fileSha256 = '0'.repeat(64); },
    (context) => { getContextInput(context, 'baseMediaGenerationManifest').assemblyDecision.decisionId = 'different'; },
  ]) {
    const context = clone(fixture.context);
    mutate(context);
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH');
  }
});

test('23: 基礎映像のfailed・violations・固定check不合格を拒否する', async () => {
  markScenario(23);
  const fixture = await createFixture('base-media-not-passed');
  for (const mutate of [
    (value) => { value.status = 'failed'; },
    (value) => { value.violations.push({code: 'SYNTHETIC'}); },
    (value) => { value.checks.videoQc.status = 'failed'; value.checks.videoQc.violationCodes = ['SYNTHETIC']; },
  ]) {
    const context = clone(fixture.context);
    mutate(getContextInput(context, 'baseMediaValidationReport'));
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_BASE_MEDIA_NOT_PASSED');
  }
});

test('24: sourceRef・provenance・元媒体SHAの差を拒否する', async () => {
  markScenario(24);
  const fixture = await createFixture('source-identity-core-values');
  for (const mutate of [
    (value) => { value.sourceRef = 'youtube:different'; },
    (value) => { value.sourceProvenance = 'different'; },
    (value) => { value.executionMedia.fileSha256 = '0'.repeat(64); },
  ]) {
    const context = clone(fixture.context);
    mutate(getContextInput(context, 'sourceIdentity'));
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH');
  }
});

test('25: source identityの展開参照差とmedia equivalence不合格を分けて記録する', async () => {
  markScenario(25);
  const fixture = await createFixture('media-equivalence');
  const referenceContext = clone(fixture.context);
  getContextInput(referenceContext, 'sourceIdentity').stt.transcript.fileSha256 = '0'.repeat(64);
  const referenceResult = await buildPresentationRetainedSourceAtomsV001(referenceContext);
  expectViolation(referenceResult, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH');

  const mediaContext = clone(fixture.context);
  getContextInput(mediaContext, 'mediaEquivalence').status = 'failed';
  const mediaResult = await buildPresentationRetainedSourceAtomsV001(mediaContext);
  expectViolation(mediaResult, 'RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID');
});

test('26: candidate ID・outer range・参照artifact差を拒否する', async () => {
  markScenario(26);
  const fixture = await createFixture('candidate-binding');
  for (const mutate of [
    (context) => { getContextInput(context, 'basisEditPlan').candidate.candidateId = 99; },
    (context) => { getContextInput(context, 'basisEditPlan').candidate.outerRange.endMs -= 1; },
    (context) => { getContextInput(context, 'candidateManifest').references.basisEditPlan.fileSha256 = '0'.repeat(64); },
  ]) {
    const context = clone(fixture.context);
    mutate(context);
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    observeViolations(result);
    assert.ok(result.violations.some(({code}) => [
      'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH',
      'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH',
    ].includes(code)));
  }
  const directCandidate = clone(fixture.context);
  directCandidate.job.candidateId = 99;
  const directResult = await buildPresentationRetainedSourceAtomsV001(directCandidate);
  expectViolation(directResult, 'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH');
});

test('27: STT partial・chunk差・discard/clampと件数差を区別して拒否する', async () => {
  markScenario(27);
  const fixture = await createFixture('stt-completeness');
  for (const mutate of [
    (value) => { value.partial = true; },
    (value) => { value.processedChunkCount = 0; },
    (value) => { value.boundaryResolution.discardedWordCount = 1; },
    (value) => { value.boundaryResolution.clampedSegmentCount = 1; },
  ]) {
    const context = clone(fixture.context);
    mutate(getContextInput(context, 'sttManifest'));
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_STT_INCOMPLETE');
  }
  const countContext = clone(fixture.context);
  getContextInput(countContext, 'sttManifest').segmentCount += 1;
  const countResult = await buildPresentationRetainedSourceAtomsV001(countContext);
  expectViolation(countResult, 'RETAINED_ATOMS_STT_COUNT_MISMATCH');
});

test('28: transcriptと文字時刻列のID差を検出する', async () => {
  markScenario(28);
  const fixture = await createFixture('stt-id-mismatch');
  const context = clone(fixture.context);
  getContextInput(context, 'wordTimestamps').words[0].segmentId = 99;
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH');
});

test('29: transcriptと文字時刻列の本文差を検出する', async () => {
  markScenario(29);
  const fixture = await createFixture('stt-text-mismatch');
  const context = clone(fixture.context);
  getContextInput(context, 'wordTimestamps').words[0].text = '差';
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH');
});

test('30: transcriptと文字時刻列のstart/end差を検出する', async () => {
  markScenario(30);
  const fixture = await createFixture('stt-time-mismatch');
  const context = clone(fixture.context);
  getContextInput(context, 'wordTimestamps').words[0].endMs -= 1;
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH');
});

test('31: transcriptと文字時刻列のraw speaker差を検出する', async () => {
  markScenario(31);
  const fixture = await createFixture('stt-speaker-mismatch');
  const context = clone(fixture.context);
  getContextInput(context, 'wordTimestamps').words[0].speaker = 'SPEAKER_99';
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH');
});

test('32: 同一speechIdの重複コピーが一文字でも違えば統合しない', async () => {
  markScenario(32);
  const fixture = await createFixture('speech-copy-mismatch');
  const context = clone(fixture.context);
  mutateSpeechCopy(context, 1, 'beforeUtterance', (speech) => { speech.text = `${speech.text}差`; });
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_GROUPING_INVALID');
});

test('33: candidate character ID・本文・時刻のSTT差を検出する', async () => {
  markScenario(33);
  const fixture = await createFixture('candidate-character-mismatch');
  for (const mutate of [
    (character) => { character.characterId = 'word-99'; },
    (character) => { character.text = '差'; },
    (character) => { character.endMs -= 1; },
  ]) {
    const context = clone(fixture.context);
    const character = getContextInput(context, 'candidateManifest').reviewItems[0].beforeUtterance.characters[0];
    mutate(character);
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_GROUPING_INVALID');
  }
});

test('34: 正式区間内のatomにspeech対応が無ければ停止する', async () => {
  markScenario(34);
  const fixture = await createFixture('retained-without-speech');
  const context = clone(fixture.context);
  const speech = getContextInput(context, 'candidateManifest').reviewItems[1].afterUtterance;
  speech.characters = [];
  speech.text = '';
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_GROUPING_INVALID');
});

test('35: atom ID重複・元配列開始逆転・非正長をraw contractで拒否する', async () => {
  markScenario(35);
  const fixture = await createFixture('raw-atom-contract');
  const duplicate = clone(fixture.context);
  getContextInput(duplicate, 'transcript').segments[1].id = 1;
  getContextInput(duplicate, 'wordTimestamps').words[1].segmentId = 1;
  const duplicateResult = await buildPresentationRetainedSourceAtomsV001(duplicate);
  expectViolation(duplicateResult, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID');

  const reversed = clone(fixture.context);
  mutateMatchingAtom(reversed, 'word-2', (atom) => { atom.startMs = -1; }, {candidate: false});
  const reversedResult = await buildPresentationRetainedSourceAtomsV001(reversed);
  expectViolation(reversedResult, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID');

  const nonpositive = clone(fixture.context);
  mutateMatchingAtom(nonpositive, 'word-2', (atom) => { atom.endMs = atom.startMs; }, {candidate: false});
  const nonpositiveResult = await buildPresentationRetainedSourceAtomsV001(nonpositive);
  expectViolation(nonpositiveResult, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID');
});

test('36: source atom重なりは同時発話候補として記録し成功する', async () => {
  markScenario(36);
  const fixture = await createFixture('positive-overlap-repeat');
  const context = clone(fixture.context);
  mutateMatchingAtom(context, 'word-2', (atom) => { atom.startMs = 50; });
  rebindExpectedProjection(context);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectPassed(result);
  assert.equal(result.generationManifest.observations.sourceAtomPositiveOverlaps.length, 1);
});

test('37: 空・逆転・正に重なる正式segmentを拒否する', async () => {
  markScenario(37);
  const fixture = await createFixture('segment-invalid');
  for (const mutate of [
    (segments) => { segments[0].sourceEndMs = segments[0].sourceStartMs; },
    (segments) => { segments[0].sourceEndMs = segments[0].sourceStartMs - 1; },
    (segments) => { segments[1].sourceStartMs = 250; },
  ]) {
    const context = clone(fixture.context);
    mutate(getContextInput(context, 'assemblyDecision').payload.segments);
    rebindDecisionPayload(context);
    const result = await buildPresentationRetainedSourceAtomsV001(context);
    expectViolation(result, 'RETAINED_ATOMS_SEGMENT_INVALID');
  }
});

test('38: 1 atomが複数segmentへ完全包含される構造を拒否する', async () => {
  markScenario(38);
  const fixture = await createFixture('multiple-segment-match');
  const context = clone(fixture.context);
  const decision = getContextInput(context, 'assemblyDecision');
  decision.payload.segments[0].sourceEndMs = 600;
  const formalization = getContextInput(context, 'formalizationReceipt');
  formalization.formalization.segments[0].sourceEndMs = 600;
  for (const key of ['viewedMappings', 'derivedMappings']) {
    const target = key === 'viewedMappings' ? formalization.selection[key] : formalization.formalization[key];
    target[0].sourceEndMs = 600;
  }
  getContextInput(context, 'timeline').segments[0].sourceEndMs = 600;
  getContextInput(context, 'baseMediaGenerationManifest').segments[0].sourceEndMs = 600;
  rebindDecisionPayload(context);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH');
});

test('39: atomが正式境界を部分的にまたぐ場合は分割せず停止する', async () => {
  markScenario(39);
  const fixture = await createFixture('partial-boundary-overlap');
  const context = clone(fixture.context);
  const decision = getContextInput(context, 'assemblyDecision');
  decision.payload.segments[0].sourceEndMs = 250;
  const formalization = getContextInput(context, 'formalizationReceipt');
  formalization.formalization.segments[0].sourceEndMs = 250;
  formalization.selection.viewedMappings[0].sourceEndMs = 250;
  formalization.formalization.derivedMappings[0].sourceEndMs = 250;
  getContextInput(context, 'timeline').segments[0].sourceEndMs = 250;
  getContextInput(context, 'baseMediaGenerationManifest').segments[0].sourceEndMs = 250;
  rebindDecisionPayload(context);
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP');

  for (const [name, segmentIndex, boundaryField, boundaryValue] of [
    ['outer-start', 0, 'sourceStartMs', 50],
    ['outer-end', 1, 'sourceEndMs', 750],
  ]) {
    const outerFixture = await createFixture(`partial-${name}-overlap`);
    const outerContext = clone(outerFixture.context);
    const outerField = boundaryField === 'sourceStartMs' ? 'startMs' : 'endMs';
    getContextInput(outerContext, 'candidateManifest').candidate.outerRange[outerField] = boundaryValue;
    getContextInput(outerContext, 'basisEditPlan').candidate.outerRange[outerField] = boundaryValue;
    getContextInput(outerContext, 'assemblyDecision').payload.segments[segmentIndex][boundaryField] = boundaryValue;
    const outerFormalization = getContextInput(outerContext, 'formalizationReceipt');
    outerFormalization.formalization.segments[segmentIndex][boundaryField] = boundaryValue;
    outerFormalization.selection.viewedMappings[segmentIndex][boundaryField] = boundaryValue;
    outerFormalization.formalization.derivedMappings[segmentIndex][boundaryField] = boundaryValue;
    getContextInput(outerContext, 'timeline').segments[segmentIndex][boundaryField] = boundaryValue;
    getContextInput(outerContext, 'baseMediaGenerationManifest').segments[segmentIndex][boundaryField] = boundaryValue;
    rebindDecisionPayload(outerContext);
    const outerResult = await buildPresentationRetainedSourceAtomsV001(outerContext);
    expectViolation(outerResult, 'RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP');
  }
});

test('40: 採用atomが0件なら空成果物を公開しない', async () => {
  markScenario(40);
  const fixture = await createFixture('empty-selection');
  const context = clone(fixture.context);
  getContextInput(context, 'candidateManifest').candidate.outerRange = {startMs: 900, endMs: 1000};
  getContextInput(context, 'basisEditPlan').candidate.outerRange = {startMs: 900, endMs: 1000};
  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectViolation(result, 'RETAINED_ATOMS_EMPTY');
});

test('41: cut内atomをsource-atomsとsegment atomIdsの双方へ出さない', async () => {
  markScenario(41);
  const fixture = await createFixture('cut-output-absence');
  const result = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(result);
  assert.equal(result.sourceAtoms.rawSourceAtoms.some(({atomId}) => atomId === 'word-4'), false);
  assert.equal(result.sourceAtoms.selection.segments.some(({atomIds}) => atomIds.includes('word-4')), false);
});

test('42: publish-tmp上のatom ID対応を独立再計算し、欠落・重複・順序・segment混入・件数・hash改変を拒否する', async () => {
  markScenario(42);
  const fixture = await createFixture('published-atom-bijection');
  const built = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(built);

  const validateMutation = (mutate, expectedCode = 'RETAINED_ATOMS_HASH_GRAPH_INVALID') => {
    const bundle = {
      sourceAtoms: clone(built.sourceAtoms),
      generationManifest: clone(built.generationManifest),
      validationReport: clone(built.validationReport),
    };
    mutate(bundle);
    const validation = validatePresentationRetainedSourceAtomsPublishedArtifactsV001(bundle);
    expectViolation(validation, expectedCode);
  };
  const rehashSegment = (segment) => {
    segment.atomCount = segment.atomIds.length;
    segment.atomIdsCanonicalSha256 = sha256CanonicalLocal(segment.atomIds);
  };

  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[0].atomIds.pop();
    rehashSegment(sourceAtoms.selection.segments[0]);
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[0].atomIds[2] = sourceAtoms.selection.segments[0].atomIds[1];
    rehashSegment(sourceAtoms.selection.segments[0]);
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[0].atomIds.reverse();
    rehashSegment(sourceAtoms.selection.segments[0]);
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[1].atomIds[0] = sourceAtoms.selection.segments[0].atomIds[0];
    rehashSegment(sourceAtoms.selection.segments[1]);
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[0].atomCount += 1;
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.selection.segments[0].atomIdsCanonicalSha256 = '0'.repeat(64);
  });
  validateMutation(({sourceAtoms}) => {
    sourceAtoms.rawSourceAtoms[1].atomId = sourceAtoms.rawSourceAtoms[0].atomId;
  }, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID');
});

test('43: 同じ意味入力からsource-atoms.jsonをbyte単位で決定的に生成する', async () => {
  markScenario(43);
  const fixture = await createFixture('deterministic-source-atoms');
  const first = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  const second = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(first);
  expectPassed(second);
  assert.ok(first.serialized.sourceAtomsBytes.equals(second.serialized.sourceAtomsBytes));
  assert.equal(canonicalJsonV001(first.sourceAtoms), canonicalJsonLocal(first.sourceAtoms));
  assert.equal(sha256CanonicalV001(first.sourceAtoms), sha256CanonicalLocal(first.sourceAtoms));
});

test('44: job IDと出力先だけの変更はsource-atoms.jsonへ混入させない', async () => {
  markScenario(44);
  const fixture = await createFixture('job-specific-metadata-isolation');
  const firstContext = clone(fixture.context);
  const secondContext = clone(fixture.context);
  secondContext.job.jobId = 'synthetic-different-job-v001';
  secondContext.job.outputDirectory = 'evals/clip_composition/outputs/presentation/retained-source-atoms/different';
  const first = await buildPresentationRetainedSourceAtomsV001(firstContext);
  const second = await buildPresentationRetainedSourceAtomsV001(secondContext);
  expectPassed(first);
  expectPassed(second);
  assert.ok(first.serialized.sourceAtomsBytes.equals(second.serialized.sourceAtomsBytes));
  assert.notDeepEqual(first.generationManifest.job, second.generationManifest.job);
  assert.notEqual(
    first.serialized.generationManifestBytes.toString('utf8'),
    second.serialized.generationManifestBytes.toString('utf8'),
  );
});

test('45: 各出力hash辺・未対応入力schema・抽出例外を固定コードで停止する', async () => {
  markScenario(45);
  const fixture = await createFixture('output-hash-edges');
  const built = await buildPresentationRetainedSourceAtomsV001(clone(fixture.context));
  expectPassed(built);
  const mutations = [
    (bundle) => { bundle.sourceAtoms.rawSourceAtomsCanonicalSha256 = '0'.repeat(64); },
    (bundle) => { bundle.generationManifest.output.fileSha256 = '0'.repeat(64); },
    (bundle) => { bundle.generationManifest.output.canonicalSha256 = '0'.repeat(64); },
    (bundle) => { bundle.generationManifest.output.rawSourceAtomsCanonicalSha256 = '0'.repeat(64); },
    (bundle) => { bundle.validationReport.outputs.sourceAtoms.fileSha256 = '0'.repeat(64); },
    (bundle) => { bundle.validationReport.outputs.sourceAtoms.canonicalSha256 = '0'.repeat(64); },
    (bundle) => { bundle.validationReport.outputs.generationManifest.fileSha256 = '0'.repeat(64); },
    (bundle) => { bundle.validationReport.outputs.generationManifest.canonicalSha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const bundle = {
      sourceAtoms: clone(built.sourceAtoms),
      generationManifest: clone(built.generationManifest),
      validationReport: clone(built.validationReport),
    };
    mutate(bundle);
    expectViolation(
      validatePresentationRetainedSourceAtomsPublishedArtifactsV001(bundle),
      'RETAINED_ATOMS_HASH_GRAPH_INVALID',
    );
  }

  const unsupported = clone(fixture.context);
  const sttRecord = unsupported.expandedInputs.find(({role}) => role === 'sttManifest');
  sttRecord.schemaVersion = 'unsupported-stt-schema-v999';
  sttRecord.value.kind = 'unsupported-stt-schema-v999';
  expectViolation(
    await buildPresentationRetainedSourceAtomsV001(unsupported),
    'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED',
  );

  const buildFailureFixture = await createFixture('injected-build-failure');
  const buildFailure = await runFixture(buildFailureFixture, {
    hooks: {beforeBuild: async () => { throw new Error('intentional build failure'); }},
  });
  assert.equal(buildFailure.exitCode, 1);
  expectViolation(buildFailure, 'RETAINED_ATOMS_BUILD_FAILED');
});

test('47: production CLIの終了コード0・1・2を実processで固定する', async () => {
  markScenario(47);
  const fixture = await createFixture('cli-exit-codes');
  const outputName = `.synthetic-cli-${process.pid}-${fixtureSerial}`;
  const productionOutput = path.join(
    MODULE_DIRECTORY,
    'outputs/presentation/retained-source-atoms',
    outputName,
  );
  await rewriteFixtureJob(fixture, (job) => {
    job.outputDirectory = repoPath(productionOutput);
  });
  const cleanup = async (...paths) => Promise.all(paths.filter(Boolean).map((entry) => (
    rm(path.isAbsolute(entry) ? entry : path.join(WORKSPACE_ROOT, entry), {recursive: true, force: true})
  )));
  try {
    const passed = await runCli([fixture.jobRecord.absolutePath]);
    assert.equal(passed.code, 0, `${passed.stdout}\n${passed.stderr}`);
    const failed = await runCli([fixture.jobRecord.absolutePath]);
    assert.equal(failed.code, 1, `${failed.stdout}\n${failed.stderr}`);
    const failedPayload = JSON.parse(failed.stderr);
    observeViolations({violations: failedPayload.violations});
    assert.ok(failedPayload.violations.some(({code}) => code === 'RETAINED_ATOMS_OUTPUT_EXISTS'));
    const usage = await runCli([]);
    assert.equal(usage.code, 2);
    await cleanup(failedPayload.failureReportPath);
  } finally {
    const parent = path.dirname(productionOutput);
    const basename = path.basename(productionOutput);
    const retainedName = (name) => name === basename
      || name === `${basename}.lock`
      || name.startsWith(`.${basename}.work-`)
      || name.startsWith(`.${basename}.publish-tmp-`);
    const retained = (await readdir(parent).catch(() => []))
      .filter(retainedName)
      .map((name) => path.join(parent, name));
    await cleanup(...retained);
    assert.deepEqual((await readdir(parent).catch(() => [])).filter(retainedName), []);
  }
});

test('48: 合格実行の前後でjob・実装・直接入力・展開入力の全file SHAを変えない', async () => {
  markScenario(48);
  const fixture = await createFixture('all-inputs-immutable');
  const inputPaths = [
    fixture.jobRecord.absolutePath,
    CORE_PATH,
    RUNNER_PATH,
    ...Object.values(fixture.direct).map(({absolutePath}) => absolutePath),
    ...Object.values(fixture.expanded).map(({absolutePath}) => absolutePath),
  ];
  const uniquePaths = [...new Set(inputPaths)];
  const before = new Map(await Promise.all(uniquePaths.map(async (filePath) => [filePath, await fileSha256(filePath)])));
  const result = await runFixture(fixture);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations ?? [], null, 2));
  const afterHashes = new Map(await Promise.all(uniquePaths.map(async (filePath) => [filePath, await fileSha256(filePath)])));
  assert.deepEqual(afterHashes, before);
});

test('49: final directoryはsource atom・生成記録・合格記録の3件だけを公開する', async () => {
  markScenario(49);
  const fixture = await createFixture('three-final-artifacts-only');
  const result = await runFixture(fixture);
  assert.equal(result.exitCode, 0, JSON.stringify(result.result?.violations ?? [], null, 2));
  assert.deepEqual((await readdir(fixture.outputDirectory)).sort(), [
    'generation-manifest.json',
    'source-atoms.json',
    'validation-report.json',
  ]);
});

test('candidate 13 read-only preflight: 正式入力をmemory投影し354件の期待値へ完全一致させる', async () => {
  const {
    context,
    projectedAtoms,
    directByRole,
    expandedByRole,
  } = await createCandidate13ReadOnlyPreflightContext();
  const beforeHashes = new Map(
    [...Object.values(directByRole), ...Object.values(expandedByRole)]
      .map(({absolutePath, fileSha256: expected}) => [absolutePath, expected]),
  );
  assert.equal(projectedAtoms.length, 354);
  assert.equal(
    context.job.expectedProjection.rawSourceAtomsCanonicalSha256,
    'cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3',
  );

  const result = await buildPresentationRetainedSourceAtomsV001(context);
  expectPassed(result);
  const atoms = result.sourceAtoms.rawSourceAtoms;
  assert.equal(atoms.length, 354);
  assert.equal(result.sourceAtoms.rawSourceAtomsCanonicalSha256,
    'cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3');
  assert.deepEqual(result.sourceAtoms.selection.segments.map(({atomCount}) => atomCount), [248, 106]);
  assert.deepEqual(result.generationManifest.observations.speechGroups.map(({speechId, atomCount}) => ({
    speechId,
    atomCount,
  })), [
    {speechId: 1, atomCount: 126},
    {speechId: 2, atomCount: 122},
    {speechId: 3, atomCount: 106},
  ]);
  assert.deepEqual([
    [atoms[0].atomId, atoms[125].atomId],
    [atoms[126].atomId, atoms[247].atomId],
    [atoms[248].atomId, atoms[353].atomId],
  ], [
    ['word-6932', 'word-7057'],
    ['word-7058', 'word-7179'],
    ['word-7180', 'word-7285'],
  ]);
  assert.equal(atoms.filter(({speaker}) => speaker === 'SPEAKER_00').length, 325);
  assert.equal(atoms.filter(({speaker}) => speaker === 'unknown').length, 29);

  const candidateManifest = directByRole.candidateManifest.value;
  const candidateAtomIds = new Set();
  for (const item of candidateManifest.reviewItems) {
    for (const speech of [item.beforeUtterance, item.afterUtterance]) {
      for (const character of speech.characters) candidateAtomIds.add(character.characterId);
    }
  }
  const transcript = expandedByRole.transcript.value;
  const timeline = directByRole.timeline.value;
  const formalAtomIds = new Set(transcript.segments.filter((atom) => timeline.segments.some((segment) => (
    atom.startMs >= segment.sourceStartMs && atom.endMs <= segment.sourceEndMs
  ))).map(({id}) => `word-${id}`));
  const outerRange = candidateManifest.candidate.outerRange;
  const candidateOuterAtoms = transcript.segments.filter((atom) => (
    atom.startMs >= outerRange.startMs && atom.endMs <= outerRange.endMs
  ));
  assert.equal(formalAtomIds.size, 354);
  assert.equal(candidateAtomIds.size, 354);
  assert.equal([...formalAtomIds].filter((id) => !candidateAtomIds.has(id)).length, 0);
  assert.equal([...candidateAtomIds].filter((id) => !formalAtomIds.has(id)).length, 0);
  assert.equal(candidateOuterAtoms.filter(({id}) => !formalAtomIds.has(`word-${id}`)).length, 0);
  assert.equal(result.generationManifest.observations.counts.boundaryPartialOverlapCount, 0);
  assert.equal(result.generationManifest.observations.sourceAtomPositiveOverlaps.length, 0);

  for (const [absolutePath, expectedSha256] of beforeHashes) {
    assert.equal(await fileSha256(absolutePath), expectedSha256, absolutePath);
  }
});

test('46: 固定31違反コード・観測コード・49シナリオ台帳を完全一致させる', () => {
  markScenario(46);
  assert.equal(SCENARIO_MANIFEST.schemaVersion, 'presentation-retained-source-atoms-test-scenarios-v001');
  assert.equal(SCENARIO_MANIFEST.scenarioCount, 49);
  assert.equal(SCENARIO_MANIFEST.scenarios.length, 49);
  assert.deepEqual(
    SCENARIO_MANIFEST.scenarios.map(({id}) => id),
    Array.from({length: 49}, (_, index) => index + 1),
  );
  assert.deepEqual([...coveredScenarioIds].sort((left, right) => left - right),
    Array.from({length: 49}, (_, index) => index + 1));
  assert.equal(PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES.length, 31);
  assert.deepEqual(
    [...observedViolationCodes].sort(),
    [...PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES].sort(),
  );
});

#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  buildPresentationBaseMediaAudioV001,
  buildPresentationBaseMediaVideoV001,
  inspectPresentationBaseMediaOutputV001,
  inspectPresentationBaseMediaSourceV001,
  muxPresentationBaseMediaV001,
  PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION,
  validatePresentationBaseMediaAssemblyDecisionV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {
  computePresentationRetainedSegmentsV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  buildPresentationRetainedSourceAtomsBundleFromNormalizedV001,
  canonicalJsonV001,
  serializeJsonFileV001,
  sha256BytesV001,
  sha256CanonicalV001,
} from './presentation_retained_source_atoms_v001.mjs';

export const PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION =
  'presentation-source-assembly-job-v001';
export const PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION =
  'presentation-material-source-identity-v001';
export const PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION =
  'presentation-material-source-media-binding-v001';
export const PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION =
  'presentation-material-source-artifact-summary-v001';
export const PRESENTATION_CANDIDATE_BASIS_EDIT_PLAN_SCHEMA_VERSION =
  'presentation-candidate-basis-edit-plan-v001';
export const PRESENTATION_CANDIDATE_SPEECH_MANIFEST_SCHEMA_VERSION =
  'presentation-candidate-speech-manifest-v001';
export const PRESENTATION_SOURCE_ASSEMBLY_REVIEW_MANIFEST_SCHEMA_VERSION =
  'presentation-source-assembly-review-manifest-v001';
export const PRESENTATION_SOURCE_ASSEMBLY_REVIEW_PROVENANCE_SCHEMA_VERSION =
  'presentation-source-assembly-review-provenance-v001';
export const PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION =
  'presentation-source-audio-end-diagnostic-v001';
export const PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION =
  'presentation-source-assembly-human-result-v001';
export const PRESENTATION_SOURCE_ASSEMBLY_FORMALIZATION_RECEIPT_SCHEMA_VERSION =
  'presentation-source-assembly-formalization-receipt-v001';
export const PRESENTATION_SOURCE_VIEWED_MEDIA_MAPPING_RECEIPT_SCHEMA_VERSION =
  'presentation-source-viewed-media-mapping-receipt-v001';
export const PRESENTATION_SOURCE_ASSEMBLY_RUNNER_VERSION =
  'presentation-source-assembly-runner-v001';

export const PRESENTATION_SOURCE_ASSEMBLY_ACTIONS = Object.freeze([
  'prepare-review',
  'formalize',
  'finalize-source',
]);

const MODULE_PATH = fileURLToPath(import.meta.url);
const RETAINED_SOURCE_MODULE_PATH = fileURLToPath(new URL(
  './presentation_retained_source_atoms_v001.mjs',
  import.meta.url,
));
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const sameValue = (left, right) => canonicalJsonV001(left) === canonicalJsonV001(right);
const clone = (value) => structuredClone(value);
const referenceFields = ['path', 'fileSha256'];

const assert = (condition, message) => {
  if (!condition) throw new TypeError(message);
};

const validateReference = (value, label) => {
  assert(exactFields(value, referenceFields), `${label} fields are invalid`);
  assert(isNonEmptyString(value.path), `${label}.path is invalid`);
  assert(SHA256_PATTERN.test(value.fileSha256 ?? ''), `${label}.fileSha256 is invalid`);
  return value;
};

const writeJson = (filePath, value) => writeFile(filePath, serializeJsonFileV001(value));

const fileSha256 = async (filePath) => {
  const digest = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => digest.update(chunk));
    stream.once('error', reject);
    stream.once('end', resolve);
  });
  return digest.digest('hex');
};

const stableReadFile = async (filePath) => {
  const before = await stat(filePath);
  const bytes = await readFile(filePath);
  const after = await stat(filePath);
  assert(
    before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeMs === after.mtimeMs,
    `input changed while reading: ${filePath}`,
  );
  return bytes;
};

const readBoundBytes = async (reference, label) => {
  validateReference(reference, label);
  const bytes = await stableReadFile(reference.path);
  const actual = sha256BytesV001(bytes);
  assert(actual === reference.fileSha256, `${label} SHA-256 mismatch`);
  return {bytes, fileSha256: actual};
};

const verifyBoundFile = async (reference, label) => {
  validateReference(reference, label);
  const before = await stat(reference.path);
  const actual = await fileSha256(reference.path);
  const after = await stat(reference.path);
  assert(
    before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeMs === after.mtimeMs,
    `${label} changed while hashing`,
  );
  assert(actual === reference.fileSha256, `${label} SHA-256 mismatch`);
  return {fileSha256: actual, byteCount: after.size};
};

const readBoundJson = async (reference, label) => {
  const loaded = await readBoundBytes(reference, label);
  let value;
  try {
    value = JSON.parse(loaded.bytes.toString('utf8'));
  } catch {
    throw new TypeError(`${label} is not valid JSON`);
  }
  assert(isObject(value), `${label} JSON root must be an object`);
  return {...loaded, value};
};

const makeRecord = (role, reference, value, schemaVersion = value?.schemaVersion ?? value?.kind ?? null) => ({
  role,
  path: reference.path,
  fileSha256: reference.fileSha256,
  schemaVersion,
  value,
});

const validateCandidate = (candidate, label = '$.inputs.candidate') => {
  assert(exactFields(candidate, [
    'candidateId', 'title', 'outerRange', 'speechGroups',
  ]), `${label} fields are invalid`);
  assert(isInteger(candidate.candidateId) && candidate.candidateId > 0, `${label}.candidateId is invalid`);
  assert(isNonEmptyString(candidate.title), `${label}.title is invalid`);
  assert(exactFields(candidate.outerRange, ['startMs', 'endMs']), `${label}.outerRange fields are invalid`);
  assert(
    isInteger(candidate.outerRange.startMs)
      && isInteger(candidate.outerRange.endMs)
      && candidate.outerRange.startMs >= 0
      && candidate.outerRange.startMs < candidate.outerRange.endMs,
    `${label}.outerRange is invalid`,
  );
  assert(Array.isArray(candidate.speechGroups) && candidate.speechGroups.length > 0, `${label}.speechGroups is empty`);
  let priorEnd = null;
  const speechIds = new Set();
  candidate.speechGroups.forEach((group, index) => {
    const groupLabel = `${label}.speechGroups[${index}]`;
    assert(exactFields(group, ['speechId', 'sourceStartMs', 'sourceEndMs']), `${groupLabel} fields are invalid`);
    assert(isInteger(group.speechId) && group.speechId > 0, `${groupLabel}.speechId is invalid`);
    assert(!speechIds.has(group.speechId), `${groupLabel}.speechId is duplicated`);
    speechIds.add(group.speechId);
    assert(
      isInteger(group.sourceStartMs)
        && isInteger(group.sourceEndMs)
        && group.sourceStartMs >= candidate.outerRange.startMs
        && group.sourceStartMs < group.sourceEndMs
        && group.sourceEndMs <= candidate.outerRange.endMs,
      `${groupLabel} range is invalid`,
    );
    assert(priorEnd === null || group.sourceStartMs >= priorEnd, `${groupLabel} order is invalid`);
    priorEnd = group.sourceEndMs;
  });
  return candidate;
};

const validatePrepareReviewJob = (job) => {
  assert(exactFields(job, [
    'schemaVersion', 'jobId', 'action', 'outputDirectory', 'identifiers', 'inputs',
  ]), 'prepare-review job fields are invalid');
  assert(exactFields(job.identifiers, [
    'sourceIdentityId', 'sourceMediaBindingId', 'sourceArtifactSummaryId', 'reviewId',
  ]), 'prepare-review identifiers are invalid');
  Object.entries(job.identifiers).forEach(([key, value]) => {
    assert(isNonEmptyString(value), `prepare-review identifiers.${key} is invalid`);
  });
  assert(exactFields(job.inputs, ['source', 'stt', 'candidate']), 'prepare-review inputs are invalid');
  assert(exactFields(job.inputs.source, [
    'videoId', 'sourceUrl', 'sourceRef', 'sourceProvenance', 'media',
  ]), 'prepare-review source fields are invalid');
  for (const field of ['videoId', 'sourceUrl', 'sourceRef', 'sourceProvenance']) {
    assert(isNonEmptyString(job.inputs.source[field]), `prepare-review source.${field} is invalid`);
  }
  validateReference(job.inputs.source.media, 'prepare-review source.media');
  assert(exactFields(job.inputs.stt, [
    'manifest', 'transcript', 'wordTimestamps',
  ]), 'prepare-review stt fields are invalid');
  for (const field of ['manifest', 'transcript', 'wordTimestamps']) {
    validateReference(job.inputs.stt[field], `prepare-review stt.${field}`);
  }
  validateCandidate(job.inputs.candidate);
};

const validateFormalizeJob = (job) => {
  assert(exactFields(job, [
    'schemaVersion', 'jobId', 'action', 'outputDirectory', 'identifiers', 'inputs',
  ]), 'formalize job fields are invalid');
  assert(exactFields(job.identifiers, [
    'decisionId', 'formalizationId', 'mappingReceiptId',
  ]), 'formalize identifiers are invalid');
  Object.entries(job.identifiers).forEach(([key, value]) => {
    assert(isNonEmptyString(value), `formalize identifiers.${key} is invalid`);
  });
  assert(exactFields(job.inputs, [
    'sourceIdentity',
    'sourceMediaBinding',
    'sourceArtifactSummary',
    'basisEditPlan',
    'candidateSpeechManifest',
    'reviewManifest',
    'reviewProvenance',
    'audioEndDiagnostic',
    'humanResult',
  ]), 'formalize inputs are invalid');
  Object.entries(job.inputs).forEach(([key, value]) => validateReference(value, `formalize inputs.${key}`));
};

const validateImplementationBinding = (value) => {
  assert(exactFields(value, ['gitCommit', 'files']), 'implementationBinding fields are invalid');
  assert(COMMIT_PATTERN.test(value.gitCommit ?? ''), 'implementationBinding.gitCommit is invalid');
  assert(Array.isArray(value.files) && value.files.length === 2, 'implementationBinding.files must contain two files');
  const expectedRoles = ['retainedSourceAtomsCore', 'sourceAssemblyRunner'];
  value.files.forEach((entry, index) => {
    assert(exactFields(entry, ['role', 'path', 'fileSha256']), `implementationBinding.files[${index}] fields are invalid`);
    assert(entry.role === expectedRoles[index], `implementationBinding.files[${index}].role is invalid`);
    assert(isNonEmptyString(entry.path), `implementationBinding.files[${index}].path is invalid`);
    assert(SHA256_PATTERN.test(entry.fileSha256 ?? ''), `implementationBinding.files[${index}].fileSha256 is invalid`);
  });
};

const validateFinalizeSourceJob = (job) => {
  assert(exactFields(job, [
    'schemaVersion',
    'jobId',
    'action',
    'outputDirectory',
    'artifactId',
    'inputs',
    'expectedProjection',
    'implementationBinding',
  ]), 'finalize-source job fields are invalid');
  assert(isNonEmptyString(job.artifactId), 'finalize-source artifactId is invalid');
  assert(exactFields(job.inputs, [
    'sourceIdentity',
    'sourceMediaBinding',
    'sourceArtifactSummary',
    'basisEditPlan',
    'candidateSpeechManifest',
    'assemblyDecision',
    'formalizationReceipt',
    'viewedMediaMappingReceipt',
    'timeline',
    'baseMediaGenerationManifest',
    'baseMediaValidationReport',
    'baseMedia',
    'sttManifest',
    'transcript',
    'wordTimestamps',
  ]), 'finalize-source inputs are invalid');
  Object.entries(job.inputs).forEach(([key, value]) => validateReference(value, `finalize-source inputs.${key}`));
  assert(isObject(job.expectedProjection), 'finalize-source expectedProjection is invalid');
  validateImplementationBinding(job.implementationBinding);
};

export const validatePresentationSourceAssemblyJobV001 = (job) => {
  assert(isObject(job), 'source assembly job must be an object');
  assert(
    job.schemaVersion === PRESENTATION_SOURCE_ASSEMBLY_JOB_SCHEMA_VERSION,
    'source assembly job schema is unsupported',
  );
  assert(isNonEmptyString(job.jobId), 'source assembly jobId is invalid');
  assert(PRESENTATION_SOURCE_ASSEMBLY_ACTIONS.includes(job.action), 'source assembly action is unsupported');
  assert(isNonEmptyString(job.outputDirectory), 'source assembly outputDirectory is invalid');
  if (job.action === 'prepare-review') validatePrepareReviewJob(job);
  if (job.action === 'formalize') validateFormalizeJob(job);
  if (job.action === 'finalize-source') validateFinalizeSourceJob(job);
  return job;
};

const validateSttBundle = ({manifest, transcript, wordTimestamps}) => {
  assert(manifest.kind === 'clip_composition_local_stt_chunked_manifest', 'STT manifest kind is unsupported');
  assert(transcript.kind === 'transcript_json', 'STT transcript kind is unsupported');
  assert(wordTimestamps.kind === 'clip_composition_word_timestamps', 'STT word timestamps kind is unsupported');
  assert(manifest.partial === false, 'partial STT is not accepted');
  assert(manifest.processedChunkCount === manifest.fullChunkCount, 'STT chunk processing is incomplete');
  assert(manifest.hasWordTimestamps === true, 'STT word timestamps are missing');
  const boundary = manifest.boundaryResolution;
  assert(
    boundary?.discardedSegmentCount === 0
      && boundary?.clampedSegmentCount === 0
      && boundary?.discardedWordCount === 0
      && boundary?.clampedWordCount === 0,
    'STT boundary resolution is not lossless',
  );
  const segments = transcript.segments;
  const words = wordTimestamps.words;
  assert(Array.isArray(segments) && Array.isArray(words), 'STT entries are missing');
  assert(
    manifest.segmentCount === segments.length
      && manifest.wordTimestampCount === words.length
      && transcript.segmentCount === segments.length
      && wordTimestamps.wordCount === words.length
      && segments.length === words.length,
    'STT counts do not match',
  );
  const ids = new Set();
  let previousStart = null;
  return segments.map((segment, index) => {
    const word = words[index];
    const segmentFields = hasOwn(segment ?? {}, 'speaker')
      ? ['id', 'startMs', 'endMs', 'text', 'speaker']
      : ['id', 'startMs', 'endMs', 'text'];
    const wordFields = hasOwn(word ?? {}, 'speaker')
      ? ['text', 'startMs', 'endMs', 'speaker', 'segmentId']
      : ['text', 'startMs', 'endMs', 'segmentId'];
    assert(exactFields(segment, segmentFields), `STT transcript segment ${index} fields are invalid`);
    assert(exactFields(word, wordFields), `STT word ${index} fields are invalid`);
    assert(
      segment.id === word.segmentId
        && segment.text === word.text
        && segment.startMs === word.startMs
        && segment.endMs === word.endMs
        && sameValue(segment.speaker, word.speaker),
      `STT transcript and word ${index} do not match`,
    );
    const atomId = `word-${segment.id}`;
    assert(
      isInteger(segment.id)
        && segment.id > 0
        && !ids.has(atomId)
        && isNonEmptyString(segment.text)
        && isInteger(segment.startMs)
        && isInteger(segment.endMs)
        && segment.startMs < segment.endMs
        && (previousStart === null || segment.startMs >= previousStart),
      `STT atom ${index} is invalid`,
    );
    ids.add(atomId);
    previousStart = segment.startMs;
    return {
      atomId,
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs,
      ...(hasOwn(segment, 'speaker') ? {speaker: segment.speaker} : {}),
      sourceIndex: index,
    };
  });
};

export const buildPresentationCandidateSpeechManifestV001 = ({
  candidate,
  sttAtoms,
}) => {
  validateCandidate(candidate, '$.candidate');
  assert(Array.isArray(sttAtoms), '$.sttAtoms must be an array');
  const outerAtoms = sttAtoms.filter((atom) => (
    atom.startMs >= candidate.outerRange.startMs
      && atom.endMs <= candidate.outerRange.endMs
  ));
  assert(outerAtoms.length > 0, 'candidate outer range contains no STT atoms');
  const seen = new Set();
  const speechGroups = candidate.speechGroups.map((group, groupIndex) => {
    const characters = outerAtoms.filter((atom) => (
      atom.startMs >= group.sourceStartMs && atom.endMs <= group.sourceEndMs
    )).map((atom) => ({
      characterId: atom.atomId,
      text: atom.text,
      startMs: atom.startMs,
      endMs: atom.endMs,
    }));
    assert(characters.length > 0, `candidate speech group ${groupIndex} is empty`);
    assert(
      characters[0].startMs === group.sourceStartMs
        && characters.at(-1).endMs === group.sourceEndMs,
      `candidate speech group ${groupIndex} does not match STT boundaries`,
    );
    for (const character of characters) {
      assert(!seen.has(character.characterId), `candidate atom ${character.characterId} is duplicated`);
      seen.add(character.characterId);
    }
    return {
      speechId: group.speechId,
      startMs: group.sourceStartMs,
      endMs: group.sourceEndMs,
      text: characters.map(({text}) => text).join(''),
      characters,
    };
  });
  const missing = outerAtoms.filter((atom) => !seen.has(atom.atomId)).map(({atomId}) => atomId);
  assert(missing.length === 0, `candidate speech groups omit STT atoms: ${missing.join(',')}`);
  assert(seen.size === outerAtoms.length, 'candidate speech groups are not bijective with STT atoms');
  const gaps = speechGroups.slice(1).map((group, index) => ({
    startMs: speechGroups[index].endMs,
    endMs: group.startMs,
  })).filter(({startMs, endMs}) => endMs - startMs >= 400);
  return {
    schemaVersion: PRESENTATION_CANDIDATE_SPEECH_MANIFEST_SCHEMA_VERSION,
    candidate: {
      candidateId: candidate.candidateId,
      title: candidate.title,
      outerRange: clone(candidate.outerRange),
    },
    intervalSemantics: 'half-open',
    reviewGapCount: gaps.length,
    speechGroups,
    atomCount: outerAtoms.length,
    atomIdsCanonicalSha256: sha256CanonicalV001(outerAtoms.map(({atomId}) => atomId)),
  };
};

const validateCandidateSpeechManifest = (value) => {
  assert(exactFields(value, [
    'schemaVersion',
    'candidate',
    'intervalSemantics',
    'reviewGapCount',
    'speechGroups',
    'atomCount',
    'atomIdsCanonicalSha256',
  ]), 'candidate speech manifest fields are invalid');
  assert(
    value.schemaVersion === PRESENTATION_CANDIDATE_SPEECH_MANIFEST_SCHEMA_VERSION,
    'candidate speech manifest schema is unsupported',
  );
  assert(exactFields(value.candidate, ['candidateId', 'title', 'outerRange']), 'candidate speech identity is invalid');
  assert(isInteger(value.candidate.candidateId) && value.candidate.candidateId > 0, 'candidate speech ID is invalid');
  assert(isNonEmptyString(value.candidate.title), 'candidate speech title is invalid');
  assert(exactFields(value.candidate.outerRange, ['startMs', 'endMs']), 'candidate speech range is invalid');
  assert(value.intervalSemantics === 'half-open', 'candidate speech interval semantics are invalid');
  assert(isInteger(value.reviewGapCount) && value.reviewGapCount >= 0, 'candidate speech gap count is invalid');
  assert(Array.isArray(value.speechGroups) && value.speechGroups.length > 0, 'candidate speech groups are empty');
  const allIds = [];
  const speechIds = new Set();
  let previousEnd = null;
  value.speechGroups.forEach((speech, speechIndex) => {
    assert(exactFields(speech, [
      'speechId', 'startMs', 'endMs', 'text', 'characters',
    ]), `candidate speech group ${speechIndex} fields are invalid`);
    assert(isInteger(speech.speechId) && speech.speechId > 0 && !speechIds.has(speech.speechId), `candidate speech group ${speechIndex} ID is invalid`);
    speechIds.add(speech.speechId);
    assert(isInteger(speech.startMs) && isInteger(speech.endMs) && speech.startMs < speech.endMs, `candidate speech group ${speechIndex} range is invalid`);
    assert(previousEnd === null || speech.startMs >= previousEnd, `candidate speech group ${speechIndex} order is invalid`);
    previousEnd = speech.endMs;
    assert(isNonEmptyString(speech.text), `candidate speech group ${speechIndex} text is empty`);
    assert(Array.isArray(speech.characters) && speech.characters.length > 0, `candidate speech group ${speechIndex} characters are empty`);
    let text = '';
    speech.characters.forEach((character, characterIndex) => {
      assert(exactFields(character, [
        'characterId', 'text', 'startMs', 'endMs',
      ]), `candidate character ${speechIndex}:${characterIndex} fields are invalid`);
      assert(/^word-[1-9][0-9]*$/u.test(character.characterId), `candidate character ${speechIndex}:${characterIndex} ID is invalid`);
      assert(isNonEmptyString(character.text), `candidate character ${speechIndex}:${characterIndex} text is empty`);
      assert(isInteger(character.startMs) && isInteger(character.endMs) && character.startMs < character.endMs, `candidate character ${speechIndex}:${characterIndex} range is invalid`);
      allIds.push(character.characterId);
      text += character.text;
    });
    assert(
      speech.characters[0].startMs === speech.startMs
        && speech.characters.at(-1).endMs === speech.endMs
        && text === speech.text,
      `candidate speech group ${speechIndex} aggregate is invalid`,
    );
  });
  assert(new Set(allIds).size === allIds.length, 'candidate speech manifest contains duplicated atoms');
  assert(value.atomCount === allIds.length, 'candidate speech atom count mismatch');
  assert(value.atomIdsCanonicalSha256 === sha256CanonicalV001(allIds), 'candidate speech atom ID hash mismatch');
  return value;
};

export const classifyPresentationAudioEndDiagnosticV001 = ({
  source,
  candidateEndMs,
  implementation,
  mode0,
  mode3,
}) => {
  const base = {
    schemaVersion: PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION,
    source: clone(source),
    inspectedRange: {
      startMs: candidateEndMs - 2000,
      endMs: candidateEndMs + 20,
      frameDurationMs: 20,
    },
    implementation: clone(implementation),
    modes: {mode0: clone(mode0), mode3: clone(mode3)},
  };
  const validMode = (mode) => isObject(mode)
    && mode.status === 'measured'
    && Array.isArray(mode.frames)
    && mode.frames.every((frame) => (
      exactFields(frame, ['startMs', 'endMs', 'isSpeech'])
        && isInteger(frame.startMs)
        && isInteger(frame.endMs)
        && frame.endMs - frame.startMs === 20
        && typeof frame.isSpeech === 'boolean'
    ));
  if (!validMode(mode0) || !validMode(mode3)) {
    return {
      ...base,
      result: 'ambiguous',
      reason: 'vad-unavailable-decode-failed-or-frame-incomplete',
      observations: null,
    };
  }
  const inspectMode = (mode) => ({
    crossingVoice: mode.frames.some((frame) => (
      frame.isSpeech && frame.startMs < candidateEndMs && frame.endMs > candidateEndMs
    )),
    immediatePostVoice: mode.frames.some((frame) => (
      frame.isSpeech
        && frame.startMs === candidateEndMs
        && frame.endMs === candidateEndMs + 20
    )),
  });
  const observations = {
    mode0: inspectMode(mode0),
    mode3: inspectMode(mode3),
  };
  const clear = Object.values(observations).every((value) => (
    value.crossingVoice === false && value.immediatePostVoice === false
  ));
  return {
    ...base,
    result: clear ? 'clear_for_extra_listen' : 'ambiguous',
    reason: clear
      ? 'both-vad-modes-observed-no-crossing-or-immediate-post-voice'
      : 'vad-mode-observed-boundary-voice-or-disagreement',
    observations,
  };
};

const unavailableAudioEndDiagnostic = ({source, candidateEndMs}) => (
  classifyPresentationAudioEndDiagnosticV001({
    source,
    candidateEndMs,
    implementation: {
      name: 'webrtcvad',
      version: null,
      path: null,
      fileSha256: null,
      availability: 'unavailable',
    },
    mode0: {status: 'unavailable', frames: []},
    mode3: {status: 'unavailable', frames: []},
  })
);

const buildDefaultReviewMedia = async ({
  sourcePath,
  outputPath,
  outerRange,
  workingDirectory,
}) => {
  const media = await inspectPresentationBaseMediaSourceV001(sourcePath);
  const segmentValidation = validatePresentationBaseMediaSegmentPlanV001(
    [{sourceStartMs: outerRange.startMs, sourceEndMs: outerRange.endMs}],
    {
      fps: media.fps,
      decodedFrameCount: media.decodedFrameCount,
      logicalFrameCount: media.logicalFrameCount,
    },
    media.audioClock,
  );
  assert(segmentValidation.status === 'passed', 'review media segment mapping failed');
  const mappings = segmentValidation.mappings;
  const videoOnlyPath = path.join(workingDirectory, 'review-video-only.mp4');
  const video = await buildPresentationBaseMediaVideoV001(
    sourcePath,
    videoOnlyPath,
    media.fps,
    mappings,
  );
  const audio = await buildPresentationBaseMediaAudioV001(
    sourcePath,
    workingDirectory,
    media.audioClock,
    mappings,
  );
  const mux = await muxPresentationBaseMediaV001(
    videoOnlyPath,
    outputPath,
    media.audioClock,
    audio,
  );
  const expectedFrameCount = mappings.at(-1).outputEndFrame;
  const inspection = await inspectPresentationBaseMediaOutputV001(
    outputPath,
    expectedFrameCount,
    media.audioClock,
    audio,
  );
  return {
    sourceClock: {
      fps: media.fps,
      decodedFrameCount: media.decodedFrameCount,
      logicalFrameCount: media.logicalFrameCount,
    },
    audioClock: media.audioClock ? {
      sampleRate: media.audioClock.sampleRate,
      channels: media.audioClock.channels,
      channelLayout: media.audioClock.channelLayout,
    } : null,
    mappings,
    expectedFrameCount,
    expectedAudioSampleCount: mappings.at(-1).audioSamples?.outputEnd ?? 0,
    actualDurationMs: expectedFrameCount * 1000 / 30,
    inspection,
    execution: {video, mux},
  };
};

const reviewHtml = ({reviewManifest, sourceIdentity, audioDiagnostic}) => {
  const needsAudio = audioDiagnostic.result === 'ambiguous';
  const safe = JSON.stringify({
    reviewId: reviewManifest.reviewId,
    candidate: reviewManifest.candidate,
    reviewMedia: reviewManifest.media,
    audioEndDiagnostic: audioDiagnostic.result,
    sourceMediaUrl: pathToFileURL(sourceIdentity.executionMedia.path).href,
    sourceEndSeekSeconds: Math.max(
      0,
      (reviewManifest.candidate.outerRange.endMs - 2000) / 1000,
    ),
  }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>組立確認</title>
<style>body{font-family:sans-serif;max-width:960px;margin:24px auto;background:#111;color:#fff}video{width:100%}button{font-size:20px;margin:8px;padding:12px}pre{white-space:pre-wrap}</style></head>
<body><h1>組立確認</h1>
<p>保存上の区間: ${reviewManifest.specifiedDurationMs / 1000}秒 / 実際に確認する媒体: ${(reviewManifest.media.actualDurationMs / 1000).toFixed(3)}秒</p>
<video id="assembled" controls src="assembly-review.mp4"></video>
<p><button data-choice="accept">この切り分けでよい</button><button data-choice="needs_edit">追加編集が必要</button></p>
${needsAudio ? `<section><h2>語尾の局所確認</h2>
<p>機械確認が曖昧です。元配信の終端2秒前と、組立後の末尾2秒前を聞いてください。</p>
<video id="source" controls preload="metadata"></video>
<p><button id="sourceEnd">元配信を終端2秒前から確認</button><button id="assembledEnd">組立後を末尾2秒前から確認</button></p>
<p><button data-audio="no_clipped_tail">語尾を切っていない</button><button data-audio="boundary_correction_required">境界修正が必要</button></p></section>` : ''}
<h2>結果</h2><pre id="result">未回答</pre>
<script>const fixed=${safe};let assemblyChoice=null;let audioEndChoice=${needsAudio ? 'null' : '"not_required"'};
const show=()=>document.querySelector('#result').textContent=JSON.stringify({schemaVersion:'${PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION}',resultId:fixed.reviewId+'-human-result',reviewId:fixed.reviewId,candidateId:fixed.candidate.candidateId,reviewMedia:fixed.reviewMedia,assemblyChoice,audioEndChoice,recordedAt:new Date().toISOString(),timeMeasurement:'not_measured'},null,2);
document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{assemblyChoice=b.dataset.choice;show()});
document.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>{audioEndChoice=b.dataset.audio;show()});
${needsAudio ? `document.querySelector('#assembledEnd').onclick=()=>{const v=document.querySelector('#assembled');v.currentTime=Math.max(0,v.duration-2);v.play()};
const sourceVideo=document.querySelector('#source');sourceVideo.src=fixed.sourceMediaUrl;
document.querySelector('#sourceEnd').onclick=()=>{sourceVideo.currentTime=fixed.sourceEndSeekSeconds;sourceVideo.play()};` : ''}
</script></body></html>\n`;
};

const publishDirectory = async (outputDirectory, build) => {
  try {
    await lstat(outputDirectory);
    throw new TypeError(`output directory already exists: ${outputDirectory}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(outputDirectory), {recursive: true});
  const temporary = await mkdtemp(path.join(
    path.dirname(outputDirectory),
    `.${path.basename(outputDirectory)}.publish-tmp-`,
  ));
  try {
    const result = await build(temporary);
    await rename(temporary, outputDirectory);
    return {...result, outputDirectory};
  } catch (error) {
    await rm(temporary, {recursive: true, force: true});
    throw error;
  }
};

const artifactReference = async (directory, publishedDirectory, name) => ({
  path: path.join(publishedDirectory, name),
  fileSha256: await fileSha256(path.join(directory, name)),
});

export const preparePresentationSourceAssemblyReviewV001 = async (job, context = {}) => {
  validatePresentationSourceAssemblyJobV001(job);
  assert(job.action === 'prepare-review', 'prepare-review action is required');
  return publishDirectory(job.outputDirectory, async (temporary) => {
    const [mediaInspection, sttManifest, transcript, wordTimestamps] = await Promise.all([
      verifyBoundFile(job.inputs.source.media, 'source media'),
      readBoundJson(job.inputs.stt.manifest, 'STT manifest'),
      readBoundJson(job.inputs.stt.transcript, 'STT transcript'),
      readBoundJson(job.inputs.stt.wordTimestamps, 'STT word timestamps'),
    ]);
    assert(
      isNonEmptyString(sttManifest.value.inputPath),
      'STT manifest inputPath is missing',
    );
    const declaredSttMediaSha256 = await fileSha256(sttManifest.value.inputPath);
    assert(
      declaredSttMediaSha256 === mediaInspection.fileSha256,
      'source media and STT input media are not byte-identical',
    );
    const sttAtoms = validateSttBundle({
      manifest: sttManifest.value,
      transcript: transcript.value,
      wordTimestamps: wordTimestamps.value,
    });
    const speechManifest = buildPresentationCandidateSpeechManifestV001({
      candidate: job.inputs.candidate,
      sttAtoms,
    });
    assert(
      speechManifest.reviewGapCount === 0,
      'minimal source assembly review accepts only candidates with no 400ms review gaps',
    );

    const sourceBinding = {
      schemaVersion: PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION,
      bindingId: job.identifiers.sourceMediaBindingId,
      source: {
        videoId: job.inputs.source.videoId,
        path: job.inputs.source.media.path,
        fileSha256: mediaInspection.fileSha256,
      },
      stt: {
        manifest: {
          ...clone(job.inputs.stt.manifest),
          declaredInputPath: sttManifest.value.inputPath,
        },
        transcript: clone(job.inputs.stt.transcript),
        wordTimestamps: clone(job.inputs.stt.wordTimestamps),
        declaredInputFileSha256: declaredSttMediaSha256,
      },
      verification: {
        sourceAndSttInputSameBytes: true,
      },
    };
    const sourceIdentity = {
      schemaVersion: PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION,
      identityId: job.identifiers.sourceIdentityId,
      videoId: job.inputs.source.videoId,
      sourceUrl: job.inputs.source.sourceUrl,
      sourceRef: job.inputs.source.sourceRef,
      sourceProvenance: job.inputs.source.sourceProvenance,
      executionMedia: clone(job.inputs.source.media),
      stt: {
        manifest: clone(job.inputs.stt.manifest),
        transcript: clone(job.inputs.stt.transcript),
        wordTimestamps: clone(job.inputs.stt.wordTimestamps),
      },
      sourceMediaBinding: {
        path: path.join(job.outputDirectory, 'source-media-binding.json'),
        fileSha256: null,
      },
    };
    const basisEditPlan = {
      schemaVersion: PRESENTATION_CANDIDATE_BASIS_EDIT_PLAN_SCHEMA_VERSION,
      kind: 'edit_plan_json',
      candidate: clone(speechManifest.candidate),
      references: {
        sourceIdentity: {
          path: path.join(job.outputDirectory, 'source-identity.json'),
          fileSha256: null,
        },
        sourceMediaBinding: {
          path: path.join(job.outputDirectory, 'source-media-binding.json'),
          fileSha256: null,
        },
        candidateSpeechManifest: {
          path: path.join(job.outputDirectory, 'candidate-speech-manifest.json'),
          fileSha256: null,
        },
      },
      editRequirements: {
        concreteInternalCuts: [],
        reviewGapCount: speechManifest.reviewGapCount,
        semanticInternalEditingSpecified: false,
      },
    };

    const workingDirectory = path.join(temporary, '.review-work');
    await mkdir(workingDirectory);
    const reviewMediaPath = path.join(temporary, 'assembly-review.mp4');
    const mediaBuilder = context.buildReviewMedia ?? buildDefaultReviewMedia;
    const media = await mediaBuilder({
      sourcePath: job.inputs.source.media.path,
      outputPath: reviewMediaPath,
      outerRange: job.inputs.candidate.outerRange,
      workingDirectory,
    });
    assert(Array.isArray(media.mappings) && media.mappings.length === 1, 'review media must contain one mapping');
    const mapping = media.mappings[0];
    assert(
      mapping.sourceStartMs === job.inputs.candidate.outerRange.startMs
        && mapping.sourceEndMs === job.inputs.candidate.outerRange.endMs
        && isInteger(media.expectedFrameCount)
        && media.expectedFrameCount > 0
        && isInteger(media.expectedAudioSampleCount)
        && media.expectedAudioSampleCount >= 0,
      'review media mapping does not reproduce the candidate outer range',
    );
    const reviewMediaHash = await fileSha256(reviewMediaPath);
    const audioDiagnosticFactory = context.analyzeAudioEnd;
    const audioDiagnostic = audioDiagnosticFactory
      ? await audioDiagnosticFactory({
        source: clone(job.inputs.source.media),
        candidateEndMs: job.inputs.candidate.outerRange.endMs,
      })
      : unavailableAudioEndDiagnostic({
        source: clone(job.inputs.source.media),
        candidateEndMs: job.inputs.candidate.outerRange.endMs,
      });
    assert(
      audioDiagnostic?.schemaVersion === PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION
        && ['clear_for_extra_listen', 'ambiguous'].includes(audioDiagnostic.result),
      'audio end diagnostic is invalid',
    );
    const reviewManifest = {
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_REVIEW_MANIFEST_SCHEMA_VERSION,
      reviewId: job.identifiers.reviewId,
      candidate: clone(speechManifest.candidate),
      specifiedDurationMs:
        speechManifest.candidate.outerRange.endMs - speechManifest.candidate.outerRange.startMs,
      media: {
        path: 'assembly-review.mp4',
        fileSha256: reviewMediaHash,
        actualDurationMs: media.actualDurationMs,
        expectedFrameCount: media.expectedFrameCount,
        expectedAudioSampleCount: media.expectedAudioSampleCount,
      },
      mapping: clone(mapping),
      audioEndDiagnostic: {
        path: path.join(job.outputDirectory, 'audio-end-diagnostic.json'),
        fileSha256: null,
        result: audioDiagnostic.result,
      },
      requiredHumanDecisions: {
        assembly: 1,
        audioEnd: audioDiagnostic.result === 'ambiguous' ? 1 : 0,
        manualTimestampEntry: false,
      },
    };
    const reviewProvenance = {
      schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_REVIEW_PROVENANCE_SCHEMA_VERSION,
      runnerVersion: PRESENTATION_SOURCE_ASSEMBLY_RUNNER_VERSION,
      source: clone(job.inputs.source.media),
      stt: clone(job.inputs.stt),
      candidateSpeechManifest: {
        path: path.join(job.outputDirectory, 'candidate-speech-manifest.json'),
        fileSha256: null,
      },
      mediaMapping: {
        sourceClock: clone(media.sourceClock),
        audioClock: clone(media.audioClock),
        mapping: clone(mapping),
      },
    };

    await writeJson(path.join(temporary, 'source-media-binding.json'), sourceBinding);
    sourceIdentity.sourceMediaBinding.fileSha256 = await fileSha256(
      path.join(temporary, 'source-media-binding.json'),
    );
    await writeJson(path.join(temporary, 'source-identity.json'), sourceIdentity);
    await writeJson(path.join(temporary, 'candidate-speech-manifest.json'), speechManifest);
    basisEditPlan.references.sourceIdentity.fileSha256 = await fileSha256(
      path.join(temporary, 'source-identity.json'),
    );
    basisEditPlan.references.sourceMediaBinding.fileSha256 =
      sourceIdentity.sourceMediaBinding.fileSha256;
    basisEditPlan.references.candidateSpeechManifest.fileSha256 = await fileSha256(
      path.join(temporary, 'candidate-speech-manifest.json'),
    );
    await writeJson(path.join(temporary, 'basis-edit-plan.json'), basisEditPlan);
    await writeJson(path.join(temporary, 'audio-end-diagnostic.json'), audioDiagnostic);
    reviewManifest.audioEndDiagnostic.fileSha256 = await fileSha256(
      path.join(temporary, 'audio-end-diagnostic.json'),
    );
    reviewProvenance.candidateSpeechManifest.fileSha256 =
      basisEditPlan.references.candidateSpeechManifest.fileSha256;
    await writeJson(path.join(temporary, 'assembly-review-manifest.json'), reviewManifest);
    await writeJson(path.join(temporary, 'assembly-review-provenance.json'), reviewProvenance);
    await writeFile(
      path.join(temporary, 'review.html'),
      reviewHtml({reviewManifest, sourceIdentity, audioDiagnostic}),
      'utf8',
    );
    await rm(workingDirectory, {recursive: true, force: true});

    const summaryArtifacts = {};
    for (const name of [
      'source-media-binding.json',
      'source-identity.json',
      'candidate-speech-manifest.json',
      'basis-edit-plan.json',
      'assembly-review.mp4',
      'assembly-review-manifest.json',
      'assembly-review-provenance.json',
      'review.html',
      'audio-end-diagnostic.json',
    ]) {
      summaryArtifacts[name] = await artifactReference(
        temporary,
        job.outputDirectory,
        name,
      );
    }
    const sourceArtifactSummary = {
      schemaVersion: PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION,
      summaryId: job.identifiers.sourceArtifactSummaryId,
      artifacts: summaryArtifacts,
    };
    await writeJson(path.join(temporary, 'source-artifact-summary.json'), sourceArtifactSummary);
    const names = (await readdir(temporary)).filter((name) => name !== '.review-work').sort();
    assert(names.length === 10, 'prepare-review output file count is invalid');
    return {
      action: job.action,
      reviewManifest,
      audioDiagnostic,
      sourceArtifactSummary,
    };
  });
};

const validateHumanResult = (value) => {
  assert(exactFields(value, [
    'schemaVersion',
    'resultId',
    'reviewId',
    'candidateId',
    'reviewMedia',
    'assemblyChoice',
    'audioEndChoice',
    'recordedAt',
    'timeMeasurement',
  ]), 'human result fields are invalid');
  assert(
    value.schemaVersion === PRESENTATION_SOURCE_ASSEMBLY_HUMAN_RESULT_SCHEMA_VERSION,
    'human result schema is unsupported',
  );
  assert(isNonEmptyString(value.resultId) && isNonEmptyString(value.reviewId), 'human result identity is invalid');
  assert(isInteger(value.candidateId) && value.candidateId > 0, 'human result candidate is invalid');
  validateReference(value.reviewMedia, 'human result reviewMedia');
  assert(['accept', 'needs_edit'].includes(value.assemblyChoice), 'human result assemblyChoice is invalid');
  assert(
    ['not_required', 'no_clipped_tail', 'boundary_correction_required'].includes(value.audioEndChoice),
    'human result audioEndChoice is invalid',
  );
  assert(ISO_8601_PATTERN.test(value.recordedAt ?? ''), 'human result recordedAt is invalid');
  assert(value.timeMeasurement === 'not_measured', 'human result timeMeasurement is invalid');
  return value;
};

export const createPresentationSourceFormalizationArtifactsV001 = ({
  identifiers,
  references,
  sourceIdentity,
  sourceBinding,
  sourceArtifactSummary,
  basisEditPlan,
  candidateSpeechManifest,
  reviewManifest,
  reviewProvenance,
  audioEndDiagnostic,
  humanResult,
}) => {
  assert(sourceIdentity.schemaVersion === PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION, 'source identity schema is unsupported');
  assert(sourceBinding.schemaVersion === PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION, 'source binding schema is unsupported');
  assert(sourceArtifactSummary.schemaVersion === PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION, 'source artifact summary schema is unsupported');
  assert(basisEditPlan.schemaVersion === PRESENTATION_CANDIDATE_BASIS_EDIT_PLAN_SCHEMA_VERSION, 'basis edit plan schema is unsupported');
  validateCandidateSpeechManifest(candidateSpeechManifest);
  assert(reviewManifest.schemaVersion === PRESENTATION_SOURCE_ASSEMBLY_REVIEW_MANIFEST_SCHEMA_VERSION, 'review manifest schema is unsupported');
  assert(reviewProvenance.schemaVersion === PRESENTATION_SOURCE_ASSEMBLY_REVIEW_PROVENANCE_SCHEMA_VERSION, 'review provenance schema is unsupported');
  assert(audioEndDiagnostic.schemaVersion === PRESENTATION_SOURCE_AUDIO_END_DIAGNOSTIC_SCHEMA_VERSION, 'audio diagnostic schema is unsupported');
  validateHumanResult(humanResult);
  assert(humanResult.reviewId === reviewManifest.reviewId, 'human result review ID mismatch');
  assert(humanResult.candidateId === candidateSpeechManifest.candidate.candidateId, 'human result candidate mismatch');
  assert(sameValue(humanResult.reviewMedia, {
    path: references.reviewMedia.path,
    fileSha256: references.reviewMedia.fileSha256,
  }), 'human result review media mismatch');
  assert(humanResult.assemblyChoice === 'accept', 'assembly needs additional editing');
  if (audioEndDiagnostic.result === 'ambiguous') {
    assert(humanResult.audioEndChoice === 'no_clipped_tail', 'audio end confirmation is unresolved');
  } else {
    assert(humanResult.audioEndChoice === 'not_required', 'unexpected audio end confirmation');
  }
  assert(reviewManifest.mapping.sourceStartMs === candidateSpeechManifest.candidate.outerRange.startMs
    && reviewManifest.mapping.sourceEndMs === candidateSpeechManifest.candidate.outerRange.endMs,
  'review mapping does not match candidate outer range');
  const complement = computePresentationRetainedSegmentsV001(
    candidateSpeechManifest.candidate.outerRange,
    [],
  );
  assert(complement.status === 'passed' && complement.segments.length === 1, 'formal segment complement failed');
  const segments = complement.segments.map(({startMs, endMs}) => ({
    sourceStartMs: startMs,
    sourceEndMs: endMs,
  }));
  assert(
    segments[0].sourceStartMs === reviewManifest.mapping.sourceStartMs
      && segments[0].sourceEndMs === reviewManifest.mapping.sourceEndMs,
    'formal segments do not reproduce viewed media',
  );
  const payload = {
    basisEditPlan: {
      kind: basisEditPlan.kind,
      path: references.basisEditPlan.path,
      fileSha256: references.basisEditPlan.fileSha256,
    },
    sourceArtifact: {
      sourceProvenance: sourceIdentity.sourceProvenance,
      sourceRef: sourceIdentity.sourceRef,
      sourceUri: sourceIdentity.sourceUrl,
      fileSha256: sourceIdentity.executionMedia.fileSha256,
    },
    segments,
    unresolvedEdits: [],
  };
  const payloadSha256 = sha256CanonicalV001(payload);
  const assemblyDecision = {
    schemaVersion: PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION,
    decisionId: identifiers.decisionId,
    payload,
    approval: {
      status: 'approved',
      approverType: 'human',
      recordId: humanResult.resultId,
      recordedAt: humanResult.recordedAt,
      targetPayloadSha256: payloadSha256,
    },
  };
  const validation = validatePresentationBaseMediaAssemblyDecisionV001(assemblyDecision);
  assert(validation.status === 'passed', 'formal assembly decision is invalid');
  const viewedMapping = clone(reviewManifest.mapping);
  const formalizationReceipt = {
    schemaVersion: PRESENTATION_SOURCE_ASSEMBLY_FORMALIZATION_RECEIPT_SCHEMA_VERSION,
    formalizationId: identifiers.formalizationId,
    status: 'passed',
    references: {
      sourceIdentity: clone(references.sourceIdentity),
      sourceMediaBinding: clone(references.sourceMediaBinding),
      sourceArtifactSummary: clone(references.sourceArtifactSummary),
      basisEditPlan: clone(references.basisEditPlan),
      candidateSpeechManifest: clone(references.candidateSpeechManifest),
      reviewManifest: clone(references.reviewManifest),
      reviewProvenance: clone(references.reviewProvenance),
      audioEndDiagnostic: clone(references.audioEndDiagnostic),
      humanResult: clone(references.humanResult),
      selectedMedia: {
        variantId: 'whole-candidate',
        ...clone(references.reviewMedia),
      },
      assemblyDecision: {
        path: 'assembly-decision.json',
        fileSha256: null,
        payloadSha256,
      },
    },
    selection: {
      candidateId: candidateSpeechManifest.candidate.candidateId,
      variantId: 'whole-candidate',
      expectedFrameCount: reviewManifest.media.expectedFrameCount,
      expectedAudioSampleCount: reviewManifest.media.expectedAudioSampleCount,
      viewedMappings: [viewedMapping],
    },
    formalization: {
      segments,
      derivedMappings: [viewedMapping],
      mappingsMatchViewedVariant: true,
      decisionPayloadSha256: payloadSha256,
    },
  };
  const mappingReceipt = {
    schemaVersion: PRESENTATION_SOURCE_VIEWED_MEDIA_MAPPING_RECEIPT_SCHEMA_VERSION,
    receiptId: identifiers.mappingReceiptId,
    reviewId: reviewManifest.reviewId,
    candidateId: candidateSpeechManifest.candidate.candidateId,
    reviewMedia: clone(references.reviewMedia),
    mapping: viewedMapping,
    expectedFrameCount: reviewManifest.media.expectedFrameCount,
    expectedAudioSampleCount: reviewManifest.media.expectedAudioSampleCount,
    formalSegments: segments,
    exactMatch: true,
  };
  return {assemblyDecision, formalizationReceipt, mappingReceipt};
};

export const formalizePresentationSourceAssemblyV001 = async (job) => {
  validatePresentationSourceAssemblyJobV001(job);
  assert(job.action === 'formalize', 'formalize action is required');
  return publishDirectory(job.outputDirectory, async (temporary) => {
    const loaded = Object.fromEntries(await Promise.all(
      Object.entries(job.inputs).map(async ([key, reference]) => [
        key,
        await readBoundJson(reference, key),
      ]),
    ));
    const summaryArtifacts = loaded.sourceArtifactSummary.value.artifacts;
    const expectedSummaryNames = {
      sourceIdentity: 'source-identity.json',
      sourceMediaBinding: 'source-media-binding.json',
      basisEditPlan: 'basis-edit-plan.json',
      candidateSpeechManifest: 'candidate-speech-manifest.json',
      reviewManifest: 'assembly-review-manifest.json',
      reviewProvenance: 'assembly-review-provenance.json',
      audioEndDiagnostic: 'audio-end-diagnostic.json',
    };
    for (const [role, fileName] of Object.entries(expectedSummaryNames)) {
      assert(
        sameValue(summaryArtifacts[fileName], job.inputs[role]),
        `source artifact summary reference mismatch: ${role}`,
      );
    }
    const reviewMediaReference = summaryArtifacts['assembly-review.mp4'];
    validateReference(reviewMediaReference, 'source artifact summary assembly-review.mp4');
    const references = {
      ...clone(job.inputs),
      reviewMedia: clone(reviewMediaReference),
    };
    const artifacts = createPresentationSourceFormalizationArtifactsV001({
      identifiers: job.identifiers,
      references,
      sourceIdentity: loaded.sourceIdentity.value,
      sourceBinding: loaded.sourceMediaBinding.value,
      sourceArtifactSummary: loaded.sourceArtifactSummary.value,
      basisEditPlan: loaded.basisEditPlan.value,
      candidateSpeechManifest: loaded.candidateSpeechManifest.value,
      reviewManifest: loaded.reviewManifest.value,
      reviewProvenance: loaded.reviewProvenance.value,
      audioEndDiagnostic: loaded.audioEndDiagnostic.value,
      humanResult: loaded.humanResult.value,
    });
    artifacts.formalizationReceipt.references.assemblyDecision.path =
      path.join(job.outputDirectory, 'assembly-decision.json');
    await writeJson(path.join(temporary, 'assembly-decision.json'), artifacts.assemblyDecision);
    artifacts.formalizationReceipt.references.assemblyDecision.fileSha256 = await fileSha256(
      path.join(temporary, 'assembly-decision.json'),
    );
    await writeJson(
      path.join(temporary, 'formalization-receipt.json'),
      artifacts.formalizationReceipt,
    );
    await writeJson(
      path.join(temporary, 'viewed-media-mapping-receipt.json'),
      artifacts.mappingReceipt,
    );
    assert((await readdir(temporary)).length === 3, 'formalize output file count is invalid');
    return {action: job.action, ...artifacts};
  });
};

const loadFinalizeInputs = async (job) => {
  const loaded = {};
  for (const [key, reference] of Object.entries(job.inputs)) {
    loaded[key] = key === 'baseMedia'
      ? await readBoundBytes(reference, key)
      : await readBoundJson(reference, key);
  }
  return loaded;
};

const verifyFinalizeChain = (job, loaded) => {
  const sourceIdentity = loaded.sourceIdentity.value;
  const sourceBinding = loaded.sourceMediaBinding.value;
  const summary = loaded.sourceArtifactSummary.value;
  const basis = loaded.basisEditPlan.value;
  const speech = validateCandidateSpeechManifest(loaded.candidateSpeechManifest.value);
  const decision = loaded.assemblyDecision.value;
  const formalization = loaded.formalizationReceipt.value;
  const mappingReceipt = loaded.viewedMediaMappingReceipt.value;
  const timeline = loaded.timeline.value;
  const generation = loaded.baseMediaGenerationManifest.value;
  const validation = loaded.baseMediaValidationReport.value;
  assert(sourceIdentity.schemaVersion === PRESENTATION_MATERIAL_SOURCE_IDENTITY_SCHEMA_VERSION, 'source identity schema is unsupported');
  assert(sourceBinding.schemaVersion === PRESENTATION_MATERIAL_SOURCE_MEDIA_BINDING_SCHEMA_VERSION, 'source media binding schema is unsupported');
  assert(summary.schemaVersion === PRESENTATION_MATERIAL_SOURCE_ARTIFACT_SUMMARY_SCHEMA_VERSION, 'source artifact summary schema is unsupported');
  assert(basis.schemaVersion === PRESENTATION_CANDIDATE_BASIS_EDIT_PLAN_SCHEMA_VERSION, 'basis edit plan schema is unsupported');
  assert(decision.schemaVersion === PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION, 'assembly decision schema is unsupported');
  assert(formalization.schemaVersion === PRESENTATION_SOURCE_ASSEMBLY_FORMALIZATION_RECEIPT_SCHEMA_VERSION, 'formalization receipt schema is unsupported');
  assert(mappingReceipt.schemaVersion === PRESENTATION_SOURCE_VIEWED_MEDIA_MAPPING_RECEIPT_SCHEMA_VERSION, 'mapping receipt schema is unsupported');
  assert(timeline.schemaVersion === 'presentation-base-media-timeline-v002', 'timeline schema is unsupported');
  assert(generation.schemaVersion === 'presentation-base-media-generation-manifest-v002', 'base media generation schema is unsupported');
  assert(validation.schemaVersion === 'presentation-base-media-validation-report-v001', 'base media validation schema is unsupported');
  assert(validation.status === 'passed' && Array.isArray(validation.violations) && validation.violations.length === 0, 'base media validation did not pass');
  assert(decision.approval?.status === 'approved' && decision.approval?.approverType === 'human', 'assembly decision is not human-approved');
  assert(Array.isArray(decision.payload?.unresolvedEdits) && decision.payload.unresolvedEdits.length === 0, 'assembly decision has unresolved edits');
  assert(
    decision.approval.targetPayloadSha256 === sha256CanonicalV001(decision.payload)
      && formalization.formalization?.decisionPayloadSha256 === decision.approval.targetPayloadSha256,
    'assembly decision payload chain mismatch',
  );
  assert(
    formalization.selection?.candidateId === speech.candidate.candidateId
      && mappingReceipt.candidateId === speech.candidate.candidateId,
    'candidate chain mismatch',
  );
  assert(
    sourceIdentity.executionMedia.fileSha256 === sourceBinding.source.fileSha256
      && sourceIdentity.executionMedia.fileSha256 === generation.source?.fileSha256,
    'source media chain mismatch',
  );
  assert(
    timeline.baseMedia?.fileSha256 === loaded.baseMedia.fileSha256
      && generation.outputs?.baseMedia?.fileSha256 === loaded.baseMedia.fileSha256
      && validation.outputs?.baseMedia?.fileSha256 === loaded.baseMedia.fileSha256,
    'base media file chain mismatch',
  );
  assert(
    generation.outputs?.timeline?.fileSha256 === loaded.timeline.fileSha256
      && validation.outputs?.timeline?.fileSha256 === loaded.timeline.fileSha256,
    'timeline file chain mismatch',
  );
  assert(
    Array.isArray(timeline.segments)
      && timeline.segments.length === decision.payload.segments.length
      && timeline.segments.length === formalization.selection.viewedMappings.length,
    'segment chain count mismatch',
  );
  const segments = timeline.segments.map((segment, index) => {
    const decisionSegment = decision.payload.segments[index];
    const viewed = formalization.selection.viewedMappings[index];
    assert(
      segment.sourceStartMs === decisionSegment.sourceStartMs
        && segment.sourceEndMs === decisionSegment.sourceEndMs
        && sameValue(segment, {
          segmentId: viewed.segmentId,
          sourceStartMs: viewed.sourceStartMs,
          sourceEndMs: viewed.sourceEndMs,
          sourceStartFrame30: viewed.sourceStartFrame30,
          sourceEndFrame30: viewed.sourceEndFrame30,
          outputStartFrame: viewed.outputStartFrame,
          outputEndFrame: viewed.outputEndFrame,
        }),
      `segment chain mismatch at ${index}`,
    );
    return {
      timelineSegmentId: segment.segmentId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      outputStartFrame: segment.outputStartFrame,
      outputEndFrame: segment.outputEndFrame,
    };
  });
  assert(
    summary.artifacts?.['source-identity.json']?.fileSha256 === loaded.sourceIdentity.fileSha256
      && summary.artifacts?.['source-media-binding.json']?.fileSha256 === loaded.sourceMediaBinding.fileSha256
      && summary.artifacts?.['candidate-speech-manifest.json']?.fileSha256 === loaded.candidateSpeechManifest.fileSha256
      && summary.artifacts?.['basis-edit-plan.json']?.fileSha256 === loaded.basisEditPlan.fileSha256,
    'source artifact summary chain mismatch',
  );
  return {sourceIdentity, sourceBinding, summary, basis, speech, decision, formalization, timeline, generation, validation, segments};
};

const inspectImplementation = async (binding) => {
  const actualPaths = {
    retainedSourceAtomsCore: RETAINED_SOURCE_MODULE_PATH,
    sourceAssemblyRunner: MODULE_PATH,
  };
  const files = [];
  for (const expected of binding.files) {
    const actualPath = actualPaths[expected.role];
    assert(actualPath, `implementation role is unsupported: ${expected.role}`);
    const actualFileSha256 = await fileSha256(actualPath);
    assert(actualFileSha256 === expected.fileSha256, `implementation SHA mismatch: ${expected.role}`);
    assert(path.resolve(expected.path) === path.resolve(actualPath), `implementation path mismatch: ${expected.role}`);
    files.push({
      role: expected.role,
      path: expected.path,
      actualFileSha256,
    });
  }
  const resolvedNodePath = process.execPath;
  return {
    files,
    runtime: {
      resolvedNodePath,
      nodeFileSha256: await fileSha256(resolvedNodePath),
      nodeVersion: process.version,
    },
  };
};

const finalizeInputRecords = (job, loaded) => {
  const directRoles = [
    ['sourceIdentity', 'sourceIdentity'],
    ['candidateManifest', 'candidateSpeechManifest'],
    ['assemblyDecision', 'assemblyDecision'],
    ['formalizationReceipt', 'formalizationReceipt'],
    ['timeline', 'timeline'],
    ['baseMediaGenerationManifest', 'baseMediaGenerationManifest'],
    ['baseMediaValidationReport', 'baseMediaValidationReport'],
  ];
  const expandedRoles = [
    ['sttManifest', 'sttManifest'],
    ['transcript', 'transcript'],
    ['wordTimestamps', 'wordTimestamps'],
    ['mediaEquivalence', 'sourceMediaBinding'],
    ['trustedArtifactSummary', 'sourceArtifactSummary'],
    ['basisEditPlan', 'basisEditPlan'],
  ];
  const direct = directRoles.map(([role, key]) => makeRecord(
    role,
    job.inputs[key],
    loaded[key].value,
  ));
  const expanded = expandedRoles.map(([role, key]) => makeRecord(
    role,
    job.inputs[key],
    loaded[key].value,
  ));
  expanded.push({
    role: 'baseMedia',
    path: job.inputs.baseMedia.path,
    fileSha256: job.inputs.baseMedia.fileSha256,
    schemaVersion: null,
    value: null,
  });
  return {direct, expanded};
};

export const finalizePresentationSourceAtomsV001 = async (job, context = {}) => {
  validatePresentationSourceAssemblyJobV001(job);
  assert(job.action === 'finalize-source', 'finalize-source action is required');
  const loaded = await loadFinalizeInputs(job);
  const chain = verifyFinalizeChain(job, loaded);
  const sttAtoms = validateSttBundle({
    manifest: loaded.sttManifest.value,
    transcript: loaded.transcript.value,
    wordTimestamps: loaded.wordTimestamps.value,
  });
  const speechByAtom = new Map();
  for (const speech of chain.speech.speechGroups) {
    for (const character of speech.characters) {
      assert(!speechByAtom.has(character.characterId), 'candidate speech atom is duplicated');
      speechByAtom.set(character.characterId, speech.speechId);
    }
  }
  const normalizedAtoms = sttAtoms.map((atom) => (
    speechByAtom.has(atom.atomId) ? {...atom, speechId: speechByAtom.get(atom.atomId)} : atom
  ));
  const records = finalizeInputRecords(job, loaded);
  const implementation = await inspectImplementation(job.implementationBinding);
  const jobBinding = context.jobBinding ?? {
    path: context.jobPath ?? '<in-memory-source-assembly-job>',
    fileSha256: context.jobFileSha256 ?? sha256CanonicalV001(job),
  };
  validateReference(jobBinding, 'finalize-source job binding');
  const normalized = {
    artifact: {
      artifactId: job.artifactId,
      candidateId: chain.speech.candidate.candidateId,
      declaredAtomGranularity: 'character-timestamp',
      sourceRef: chain.sourceIdentity.sourceRef,
      sourceProvenance: chain.sourceIdentity.sourceProvenance,
      atomProvenance: {
        sttManifest: clone(job.inputs.sttManifest),
        transcript: clone(job.inputs.transcript),
        wordTimestamps: clone(job.inputs.wordTimestamps),
        candidateManifest: clone(job.inputs.candidateSpeechManifest),
      },
    },
    selection: {
      candidateOuterRange: clone(chain.speech.candidate.outerRange),
      segments: chain.segments,
      sttAtoms: normalizedAtoms,
      speechGroups: clone(chain.speech.speechGroups),
      expectedProjection: clone(job.expectedProjection),
      assemblyDecisionId: chain.decision.decisionId,
      assemblyDecisionPayloadSha256: chain.decision.approval.targetPayloadSha256,
      formalizationId: chain.formalization.formalizationId,
      timelineId: chain.timeline.timelineId,
      timelineFileSha256: job.inputs.timeline.fileSha256,
      baseMediaArtifactId: chain.timeline.baseMedia.artifactId,
      baseMediaFileSha256: job.inputs.baseMedia.fileSha256,
    },
    generation: {
      job: {
        jobId: job.jobId,
        path: jobBinding.path,
        fileSha256: jobBinding.fileSha256,
      },
      implementationBinding: clone(job.implementationBinding),
      implementation,
      directInputs: records.direct,
      expandedInputs: records.expanded,
      sttAtomCount: sttAtoms.length,
    },
  };
  const built = buildPresentationRetainedSourceAtomsBundleFromNormalizedV001(normalized);
  assert(built.status === 'passed', `retained source atom build failed: ${canonicalJsonV001(built.violations)}`);
  return publishDirectory(job.outputDirectory, async (temporary) => {
    await writeFile(path.join(temporary, 'source-atoms.json'), built.serialized.sourceAtomsBytes);
    await writeFile(
      path.join(temporary, 'generation-manifest.json'),
      built.serialized.generationManifestBytes,
    );
    await writeFile(
      path.join(temporary, 'validation-report.json'),
      built.serialized.validationReportBytes,
    );
    assert((await readdir(temporary)).length === 3, 'finalize-source output file count is invalid');
    return {action: job.action, ...built};
  });
};

export const executePresentationSourceAssemblyJobV001 = async (job, context = {}) => {
  validatePresentationSourceAssemblyJobV001(job);
  if (job.action === 'prepare-review') return preparePresentationSourceAssemblyReviewV001(job, context);
  if (job.action === 'formalize') return formalizePresentationSourceAssemblyV001(job, context);
  return finalizePresentationSourceAtomsV001(job, context);
};

export const runPresentationSourceAssemblyJobFileV001 = async (jobPath, context = {}) => {
  assert(isNonEmptyString(jobPath), 'job path is required');
  const bytes = await stableReadFile(jobPath);
  let job;
  try {
    job = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new TypeError('job file is not valid JSON');
  }
  return executePresentationSourceAssemblyJobV001(job, {
    ...context,
    jobPath,
    jobFileSha256: sha256BytesV001(bytes),
    jobBinding: {
      path: jobPath,
      fileSha256: sha256BytesV001(bytes),
    },
  });
};

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_PATH) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    process.stderr.write('usage: node run_presentation_source_assembly_job_v001.mjs <job.json>\n');
    process.exitCode = 2;
  } else {
    runPresentationSourceAssemblyJobFileV001(args[0])
      .then((result) => process.stdout.write(`${result.outputDirectory}\n`))
      .catch((error) => {
        process.stderr.write(`${error.stack ?? error.message}\n`);
        process.exitCode = error instanceof TypeError ? 1 : 2;
      });
  }
}

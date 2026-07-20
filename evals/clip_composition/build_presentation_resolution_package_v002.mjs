#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION,
  SOURCE_SPEAKER_NORMALIZER_VERSION,
  SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
  SOURCE_SPEAKER_REGISTRY_VERSION,
  canonicalSha256,
  normalizeSourceAtomSpeakerForPackage,
} from './presentation_source_speaker_policy_v001.mjs';

export const PRESENTATION_RESOLUTION_PACKAGE_BUILD_REQUEST_SCHEMA_VERSION = 'presentation-resolution-package-build-request-v001';
export const PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V002 = 'presentation-resolution-package-v002';
export const PRESENTATION_RESOLUTION_PACKAGE_BUILDER_VERSION = 'presentation-resolution-package-builder-v001';
export const PRESENTATION_RESOLUTION_PACKAGE_GENERATION_MANIFEST_SCHEMA_VERSION = 'presentation-resolution-package-generation-manifest-v001';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const assertExactFields = (value, expectedFields, label) => {
  const actual = Object.keys(value).sort();
  const expected = [...expectedFields].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label}のfieldが固定契約と一致しません。`);
  }
};

const validateSourceArtifact = (artifact, index) => {
  if (!isObject(artifact)) throw new TypeError(`sourceArtifacts[${index}]はobjectである必要があります。`);
  assertExactFields(artifact, ['sourceRef', 'path', 'fileSha256'], `sourceArtifacts[${index}]`);
  if (!isNonEmptyString(artifact.sourceRef)) throw new TypeError(`sourceArtifacts[${index}].sourceRefが必要です。`);
  if (!isNonEmptyString(artifact.path)) throw new TypeError(`sourceArtifacts[${index}].pathが必要です。`);
  if (!SHA256_PATTERN.test(artifact.fileSha256)) throw new TypeError(`sourceArtifacts[${index}].fileSha256が不正です。`);
};

const validateRawSourceAtom = (atom, index, sourceRefs) => {
  if (!isObject(atom)) throw new TypeError(`rawSourceAtoms[${index}]はobjectである必要があります。`);
  const allowed = new Set(['atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs', 'sourceRef']);
  for (const field of Object.keys(atom)) {
    if (!allowed.has(field)) throw new TypeError(`rawSourceAtoms[${index}]に未知fieldがあります: ${field}`);
  }
  for (const field of ['atomId', 'text', 'sourceRef']) {
    if (!isNonEmptyString(atom[field])) throw new TypeError(`rawSourceAtoms[${index}].${field}が必要です。`);
  }
  if (!sourceRefs.has(atom.sourceRef)) throw new TypeError(`rawSourceAtoms[${index}].sourceRefがsourceArtifactsにありません。`);
  if (!Number.isInteger(atom.speechId)) throw new TypeError(`rawSourceAtoms[${index}].speechIdは整数である必要があります。`);
  if (!Number.isInteger(atom.startMs) || !Number.isInteger(atom.endMs) || atom.startMs >= atom.endMs) {
    throw new TypeError(`rawSourceAtoms[${index}]の時刻範囲が不正です。`);
  }
};

const toPackageAtom = (rawAtom, normalizedSpeaker) => {
  const atom = {
    atomId: rawAtom.atomId,
    speechId: rawAtom.speechId,
    text: rawAtom.text,
    startMs: rawAtom.startMs,
    endMs: rawAtom.endMs,
  };
  if (hasOwn(rawAtom, 'speaker')) atom.speaker = normalizedSpeaker;
  return atom;
};

export function buildPresentationResolutionPackageV002(requestInput) {
  if (!isObject(requestInput)) throw new TypeError('解決パッケージbuild requestはobjectである必要があります。');
  assertExactFields(
    requestInput,
    [
      'schemaVersion',
      'resolutionPackageId',
      'sourceProvenance',
      'atomGranularity',
      'rawSourceAtoms',
      'targets',
      'captionContracts',
      'sourceArtifacts',
    ],
    '解決パッケージbuild request',
  );
  if (requestInput.schemaVersion !== PRESENTATION_RESOLUTION_PACKAGE_BUILD_REQUEST_SCHEMA_VERSION) {
    throw new TypeError('解決パッケージbuild requestのschemaVersionが不正です。');
  }
  if (!isNonEmptyString(requestInput.resolutionPackageId)) throw new TypeError('resolutionPackageIdが必要です。');
  if (!isNonEmptyString(requestInput.sourceProvenance)) throw new TypeError('sourceProvenanceが必要です。');
  if (!['word-timestamp', 'character-timestamp'].includes(requestInput.atomGranularity)) {
    throw new TypeError('atomGranularityが不正です。');
  }
  if (!Array.isArray(requestInput.rawSourceAtoms)) throw new TypeError('rawSourceAtomsは配列である必要があります。');
  if (!Array.isArray(requestInput.targets)) throw new TypeError('targetsは配列である必要があります。');
  if (!Array.isArray(requestInput.captionContracts)) throw new TypeError('captionContractsは配列である必要があります。');
  if (!Array.isArray(requestInput.sourceArtifacts) || requestInput.sourceArtifacts.length === 0) {
    throw new TypeError('sourceArtifactsは1件以上の配列である必要があります。');
  }

  const sourceArtifacts = structuredClone(requestInput.sourceArtifacts);
  sourceArtifacts.forEach(validateSourceArtifact);
  const sourceRefs = new Set();
  for (const artifact of sourceArtifacts) {
    if (sourceRefs.has(artifact.sourceRef)) throw new TypeError(`sourceArtifactsのsourceRefが重複しています: ${artifact.sourceRef}`);
    sourceRefs.add(artifact.sourceRef);
  }
  requestInput.rawSourceAtoms.forEach((atom, index) => validateRawSourceAtom(atom, index, sourceRefs));

  const atomIds = new Set();
  const packageAtoms = [];
  const mappedRecords = [];
  const passThroughCounts = new Map();
  for (const [index, rawAtom] of requestInput.rawSourceAtoms.entries()) {
    if (atomIds.has(rawAtom.atomId)) throw new TypeError(`rawSourceAtomsのatomIdが重複しています: ${rawAtom.atomId}`);
    atomIds.add(rawAtom.atomId);
    const normalized = normalizeSourceAtomSpeakerForPackage(rawAtom);
    packageAtoms.push(toPackageAtom(rawAtom, normalized.atom.speaker));
    if (normalized.mapped) {
      mappedRecords.push({
        atomId: rawAtom.atomId,
        sourceRef: rawAtom.sourceRef,
        rawSpeaker: rawAtom.speaker,
        normalizedSpeaker: null,
        ruleId: 'exact-non-identity-token-to-null',
      });
    } else if (normalized.classification.kind === 'opaque-label') {
      passThroughCounts.set(rawAtom.speaker, (passThroughCounts.get(rawAtom.speaker) ?? 0) + 1);
    }
    if (packageAtoms[index].speaker === undefined) delete packageAtoms[index].speaker;
  }

  const rawSourceAtomsCanonicalSha256 = canonicalSha256(requestInput.rawSourceAtoms);
  const sourceAtomsSha256 = canonicalSha256(packageAtoms);
  const resolutionPackage = {
    schemaVersion: PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V002,
    resolutionPackageId: requestInput.resolutionPackageId,
    sourceProvenance: requestInput.sourceProvenance,
    atomGranularity: requestInput.atomGranularity,
    sourceSpeakerNormalization: {
      schemaVersion: SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION,
      normalizerVersion: SOURCE_SPEAKER_NORMALIZER_VERSION,
      registryVersion: SOURCE_SPEAKER_REGISTRY_VERSION,
      registryCanonicalSha256: SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
      rawSourceAtomsCanonicalSha256,
    },
    sourceAtomsSha256,
    sourceAtoms: packageAtoms,
    targets: structuredClone(requestInput.targets),
    captionContracts: structuredClone(requestInput.captionContracts),
  };

  const generationManifest = {
    schemaVersion: PRESENTATION_RESOLUTION_PACKAGE_GENERATION_MANIFEST_SCHEMA_VERSION,
    generatorVersion: PRESENTATION_RESOLUTION_PACKAGE_BUILDER_VERSION,
    sourceArtifacts: sourceArtifacts.sort((left, right) => left.sourceRef.localeCompare(right.sourceRef, 'en')),
    sourceProvenance: requestInput.sourceProvenance,
    speakerNormalization: {
      normalizerVersion: SOURCE_SPEAKER_NORMALIZER_VERSION,
      registryVersion: SOURCE_SPEAKER_REGISTRY_VERSION,
      registryCanonicalSha256: SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
      mappedRecords,
      passThroughValueCounts: [...passThroughCounts.entries()]
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([value, count]) => ({ value, count })),
    },
    output: {
      resolutionPackageId: requestInput.resolutionPackageId,
      resolutionPackageCanonicalSha256: canonicalSha256(resolutionPackage),
      rawSourceAtomsCanonicalSha256,
      sourceAtomsCanonicalSha256: sourceAtomsSha256,
    },
  };

  return { resolutionPackage, generationManifest };
}

const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const [, , requestArgument, packageOutputArgument, manifestOutputArgument] = process.argv;
  if (!requestArgument || !packageOutputArgument || !manifestOutputArgument || process.argv.length !== 5) {
    console.error('使い方: node build_presentation_resolution_package_v002.mjs <request.json> <package.json> <manifest.json>');
    process.exitCode = 2;
  } else {
    try {
      const request = JSON.parse(await readFile(resolve(requestArgument), 'utf8'));
      const { resolutionPackage, generationManifest } = buildPresentationResolutionPackageV002(request);
      await Promise.all([
        writeFile(resolve(packageOutputArgument), `${JSON.stringify(resolutionPackage, null, 2)}\n`, 'utf8'),
        writeFile(resolve(manifestOutputArgument), `${JSON.stringify(generationManifest, null, 2)}\n`, 'utf8'),
      ]);
    } catch (error) {
      console.error(`解決パッケージを生成できません: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
    }
  }
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const SOURCE_SPEAKER_REGISTRY_SCHEMA_VERSION = 'presentation-source-speaker-non-identity-registry-v001';
export const SOURCE_SPEAKER_REGISTRY_VERSION = 'presentation-source-speaker-non-identity-registry-v001';
export const SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION = 'presentation-source-speaker-normalization-v001';
export const SOURCE_SPEAKER_NORMALIZER_VERSION = 'presentation-source-speaker-normalizer-v001';

const REGISTRY_URL = new URL(
  './registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json',
  import.meta.url,
);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

export const canonicalJson = (value) => JSON.stringify(canonicalize(value));
export const canonicalSha256 = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');

export function validateSpeakerRegistryArtifact(registry) {
  if (!isObject(registry)) throw new TypeError('話者非人物値台帳はobjectである必要があります。');
  const allowedRootFields = new Set([
    'schemaVersion',
    'registryVersion',
    'matchMode',
    'evidenceDate',
    'evidenceReport',
    'entries',
  ]);
  for (const field of Object.keys(registry)) {
    if (!allowedRootFields.has(field)) throw new TypeError(`話者非人物値台帳に未知fieldがあります: ${field}`);
  }
  if (registry.schemaVersion !== SOURCE_SPEAKER_REGISTRY_SCHEMA_VERSION) {
    throw new TypeError('話者非人物値台帳のschemaVersionが固定版と一致しません。');
  }
  if (registry.registryVersion !== SOURCE_SPEAKER_REGISTRY_VERSION) {
    throw new TypeError('話者非人物値台帳のregistryVersionが固定版と一致しません。');
  }
  if (registry.matchMode !== 'exact') throw new TypeError('話者非人物値台帳は完全一致だけを許可します。');
  if (typeof registry.evidenceDate !== 'string' || registry.evidenceDate.length === 0) {
    throw new TypeError('話者非人物値台帳に根拠日が必要です。');
  }
  if (typeof registry.evidenceReport !== 'string' || registry.evidenceReport.length === 0) {
    throw new TypeError('話者非人物値台帳に根拠文書が必要です。');
  }
  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    throw new TypeError('話者非人物値台帳に1件以上のentryが必要です。');
  }
  const values = [];
  const seen = new Set();
  for (const [index, entry] of registry.entries.entries()) {
    if (!isObject(entry)) throw new TypeError(`話者非人物値台帳entry ${index}はobjectである必要があります。`);
    const fields = Object.keys(entry).sort();
    const expected = ['normalizedValue', 'observedCount', 'rawValue'];
    if (canonicalJson(fields) !== canonicalJson(expected)) {
      throw new TypeError(`話者非人物値台帳entry ${index}のfieldが固定契約と一致しません。`);
    }
    if (
      typeof entry.rawValue !== 'string'
      || entry.rawValue.length === 0
      || entry.rawValue.trim() !== entry.rawValue
    ) {
      throw new TypeError(`話者非人物値台帳entry ${index}のrawValueが正規形ではありません。`);
    }
    if (entry.normalizedValue !== null) {
      throw new TypeError(`話者非人物値台帳entry ${index}はnull以外へ写せません。`);
    }
    if (!Number.isInteger(entry.observedCount) || entry.observedCount < 0) {
      throw new TypeError(`話者非人物値台帳entry ${index}のobservedCountが不正です。`);
    }
    if (seen.has(entry.rawValue)) throw new TypeError(`話者非人物値台帳に重複値があります: ${entry.rawValue}`);
    seen.add(entry.rawValue);
    values.push(entry.rawValue);
  }
  const sorted = [...values].sort((left, right) => left.localeCompare(right, 'en'));
  if (canonicalJson(values) !== canonicalJson(sorted)) {
    throw new TypeError('話者非人物値台帳entryはrawValue順である必要があります。');
  }
  return structuredClone(registry);
}

const loadedRegistry = validateSpeakerRegistryArtifact(JSON.parse(readFileSync(REGISTRY_URL, 'utf8')));

export const SOURCE_SPEAKER_NON_IDENTITY_REGISTRY = Object.freeze(loadedRegistry);
export const SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256 = canonicalSha256(loadedRegistry);
const NON_IDENTITY_TOKEN_SET = new Set(loadedRegistry.entries.map((entry) => entry.rawValue));

export const isRegisteredNonIdentitySpeakerToken = (value) => (
  typeof value === 'string' && NON_IDENTITY_TOKEN_SET.has(value)
);

export function classifyRawSourceSpeaker(atom) {
  if (!isObject(atom)) return { kind: 'invalid-atom' };
  if (!hasOwn(atom, 'speaker')) return { kind: 'absent' };
  const value = atom.speaker;
  if (value === null) return { kind: 'null' };
  if (typeof value !== 'string') return { kind: 'invalid-type', value };
  if (value.length === 0 || value.trim().length === 0) return { kind: 'empty', value };
  if (value.trim() !== value) return { kind: 'not-canonical', value };
  if (NON_IDENTITY_TOKEN_SET.has(value)) return { kind: 'registered-non-identity', value };
  return { kind: 'opaque-label', value };
}

export function normalizeSourceAtomSpeakerForPackage(atom) {
  const classification = classifyRawSourceSpeaker(atom);
  if (classification.kind === 'invalid-atom') throw new TypeError('source atomはobjectである必要があります。');
  if (classification.kind === 'invalid-type') throw new TypeError('source atomのspeakerはnullまたは文字列である必要があります。');
  if (classification.kind === 'empty') throw new TypeError('source atomのspeakerを空にできません。');
  if (classification.kind === 'not-canonical') throw new TypeError('source atomのspeakerを暗黙trimできません。');

  const normalizedAtom = structuredClone(atom);
  if (classification.kind === 'registered-non-identity') normalizedAtom.speaker = null;
  return {
    atom: normalizedAtom,
    classification,
    mapped: classification.kind === 'registered-non-identity',
  };
}

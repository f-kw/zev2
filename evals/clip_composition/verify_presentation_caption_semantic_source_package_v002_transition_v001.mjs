import {createHash} from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(SCRIPT_DIRECTORY, '../..');

const PACKAGE_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
  + 'DmWu0jVQfTE-candidate-13-v001';
const PACKAGE_ROOT_V002 =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
  + 'DmWu0jVQfTE-candidate-13-v002';
const REPORT_PATH =
  'evals/clip_composition/reports/presentation/'
  + 'presentation-candidate13-caption-package-v002-transition-verification-'
  + '20260727-v001.json';

export const PRESENTATION_CAPTION_PACKAGE_FILES_V001 = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);

export const PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001 = Object.freeze([
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.packageId',
    segments: Object.freeze(['packageId']),
    kind: 'version-identity',
    expectedV002Value: 'DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v002',
  }),
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.formalOutputPath',
    segments: Object.freeze(['formalOutputPath']),
    kind: 'version-identity',
    expectedV002Value:
      'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
      + 'DmWu0jVQfTE-candidate-13-v002',
  }),
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.packageJobBinding.path',
    segments: Object.freeze(['packageJobBinding', 'path']),
    kind: 'version-identity',
    expectedV002Value:
      'evals/clip_composition/outputs/presentation/'
      + 'caption-semantic-source-package-jobs/'
      + 'DmWu0jVQfTE-candidate-13-caption-b1-v002.json',
  }),
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.packageJobBinding.fileSha256',
    segments: Object.freeze(['packageJobBinding', 'fileSha256']),
    kind: 'approved-provenance',
    expectedV002Value:
      'cdf1ba812b953d8ac7c847cd2bc0bbe0a81bcce4ffe2bb863722f208e52ed247',
  }),
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.implementationBinding.files[0].fileSha256',
    segments: Object.freeze(['implementationBinding', 'files', 0, 'fileSha256']),
    kind: 'approved-provenance',
    expectedV002Value:
      'c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.jobBinding.path',
    segments: Object.freeze(['jobBinding', 'path']),
    kind: 'version-identity',
    expectedV002Value:
      'evals/clip_composition/outputs/presentation/'
      + 'caption-semantic-source-package-jobs/'
      + 'DmWu0jVQfTE-candidate-13-caption-b1-v002.json',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.jobBinding.fileSha256',
    segments: Object.freeze(['jobBinding', 'fileSha256']),
    kind: 'approved-provenance',
    expectedV002Value:
      'cdf1ba812b953d8ac7c847cd2bc0bbe0a81bcce4ffe2bb863722f208e52ed247',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.package.packageId',
    segments: Object.freeze(['package', 'packageId']),
    kind: 'version-identity',
    expectedV002Value: 'DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v002',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.package.formalOutputPath',
    segments: Object.freeze(['package', 'formalOutputPath']),
    kind: 'version-identity',
    expectedV002Value:
      'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
      + 'DmWu0jVQfTE-candidate-13-v002',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.manifestBinding.fileSha256',
    segments: Object.freeze(['manifestBinding', 'fileSha256']),
    kind: 'approved-provenance',
    expectedV002Value:
      '43a1cd24432183cc10a6a7b9119545ffa793e35025c4e675c8f314c02dabf9fb',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.manifestBinding.canonicalSha256',
    segments: Object.freeze(['manifestBinding', 'canonicalSha256']),
    kind: 'approved-provenance',
    expectedV002Value:
      'ede997731445df5359d45ab8e3c023cf69db5d4c2d2ecc648338ef2f2bd54396',
  }),
]);

const IMMUTABLE_BINDINGS = Object.freeze([
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/segmenter-boundary-evidence.json',
  '40230b94302914261b7e2c46c51cb0fc46ae18b26b99580ea2f74f1b02666c43'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/embedded-gate-a-validation-report.json',
  '2ffaa7ae5edfc0950163e664aa09c85057782dc1c74bd20bdcd1eb289565fa19'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/semantic-source-input.json',
  'c350a402db15ff7a5405894f939f0a66522482d6d8c78584fe5b55d9dc489980'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/deterministic-expansion-map.json',
  '33c42a4c625452c6d120f59ccb5a8e78822f9008f5121a91a32e9d3be7133b3d'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/source-only-leakage-report.json',
  'e2963f6e4e1e68823a97bd66483b8e13688230961f03190bea259d29997003ec'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/package-manifest.json',
  'da4ceb97487833bf50cbbb01252908b04d7e63230d667f625697557d6ae5ae96'],
  ['evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
    + 'DmWu0jVQfTE-candidate-13-v001/package-validation-report.json',
  '18e9b315bba962c16e7e60112c9f08156e4d7ad7b0babef3ec08c0bfebfa8661'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/b5-manifest.json',
  'c5500468a747095188b63dfb9e43137b2562bb5794eb67cfcf6a00d65a998ebc'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/generate-content-request.json',
  '7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/input-token-count-request.json',
  '83470ebfefe94ac07dda023fa7706aa0f63d007feb26dd59bdd21a7b70af07df'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/input-token-count-response.raw.json',
  '195361097d700be9c13b246d35600211f17dcc554613604732b6f497a3b81fc2'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/maximum-response-token-count-request.json',
  '0de805415b0fb62206d2a436b1bea1c85f4e73e6d518252fd9528eb1f25bb158'],
  ['evals/clip_composition/outputs/presentation/caption-gate-b5/'
    + 'DmWu0jVQfTE-candidate-13-v002/maximum-response-token-count-response.raw.json',
  '0f4af6abb87c012f4560864b481e38f9cb7e957abd098d3c3e53bb39906d0cc2'],
].map(([path, fileSha256]) => Object.freeze({path, fileSha256})));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const cloneStrictValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneStrictValue);
  if (value !== null && typeof value === 'object') {
    const result = Object.create(null);
    for (const [key, entry] of Object.entries(value)) {
      result[key] = cloneStrictValue(entry);
    }
    return result;
  }
  return value;
};

const sameScalar = (left, right) => (
  left === right
  || (typeof left === 'number' && typeof right === 'number'
    && Number.isNaN(left) && Number.isNaN(right))
);

const collectChangedLeaves = (artifact, before, after, path = '$') => {
  if (sameScalar(before, after)) return [];
  const beforeObject = before !== null && typeof before === 'object';
  const afterObject = after !== null && typeof after === 'object';
  if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) {
    return [{artifact, path}];
  }
  if (Array.isArray(before)) {
    if (before.length !== after.length) return [{artifact, path}];
    return before.flatMap((entry, index) => collectChangedLeaves(
      artifact,
      entry,
      after[index],
      `${path}[${index}]`,
    ));
  }
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  if (beforeKeys.length !== afterKeys.length
    || beforeKeys.some((key, index) => key !== afterKeys[index])) {
    return [{artifact, path}];
  }
  return beforeKeys.flatMap((key) => collectChangedLeaves(
    artifact,
    before[key],
    after[key],
    `${path}.${key}`,
  ));
};

const readSegments = (value, segments) => {
  let current = value;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object'
      || !Object.hasOwn(current, segment)) {
      throw new TypeError('allowed difference path is absent');
    }
    current = current[segment];
  }
  return current;
};

const writeSegments = (value, segments, replacement) => {
  let current = value;
  for (const segment of segments.slice(0, -1)) {
    if (current === null || typeof current !== 'object'
      || !Object.hasOwn(current, segment)) {
      throw new TypeError('allowed difference path is absent');
    }
    current = current[segment];
  }
  const finalSegment = segments.at(-1);
  if (current === null || typeof current !== 'object'
    || !Object.hasOwn(current, finalSegment)) {
    throw new TypeError('allowed difference path is absent');
  }
  current[finalSegment] = replacement;
};

const decodeFormalJson = (bytes) => {
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (decoded.status !== 'decoded') throw new TypeError('strict JSON decode failed');
  return decoded.value;
};

const serializeFormalJson = (value) => {
  const serialized = serializePresentationCaptionB1FormalJsonV001(value);
  if (serialized.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return serialized.bytes;
};

const hasExactPackageFiles = (artifacts) => {
  const names = Object.keys(artifacts);
  return names.length === PRESENTATION_CAPTION_PACKAGE_FILES_V001.length
    && PRESENTATION_CAPTION_PACKAGE_FILES_V001.every(
      (name, index) => names[index] === name && Buffer.isBuffer(artifacts[name]),
    );
};

export function verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
  packageV001,
  packageV002,
) {
  const filesExactV001 = hasExactPackageFiles(packageV001);
  const filesExactV002 = hasExactPackageFiles(packageV002);
  if (!filesExactV001 || !filesExactV002) {
    return {
      schemaVersion:
        'presentation-caption-semantic-source-package-v002-transition-verification-v001',
      status: 'failed',
      packageFileSet: {v001: filesExactV001, v002: filesExactV002},
      firstFiveArtifacts: [],
      changedLeafPaths: [],
      expectedChangedLeafPaths:
        PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001.map(
          ({artifact, path, kind}) => ({artifact, path, kind}),
        ),
      unexpectedChangedLeafPaths: [],
      missingChangedLeafPaths: [],
      normalizedOutsideAllowedFieldsByteIdentical: {
        'package-manifest.json': false,
        'package-validation-report.json': false,
      },
    };
  }

  const firstFiveArtifacts = PRESENTATION_CAPTION_PACKAGE_FILES_V001
    .slice(0, 5)
    .map((fileName) => ({
      fileName,
      v001FileSha256: sha256(packageV001[fileName]),
      v002FileSha256: sha256(packageV002[fileName]),
      byteIdentical: packageV001[fileName].equals(packageV002[fileName]),
    }));

  const parsed = Object.create(null);
  const normalizedOutsideAllowedFieldsByteIdentical = Object.create(null);
  for (const artifact of PRESENTATION_CAPTION_PACKAGE_FILES_V001.slice(5)) {
    parsed[artifact] = {
      v001: decodeFormalJson(packageV001[artifact]),
      v002: decodeFormalJson(packageV002[artifact]),
    };
    const normalized = cloneStrictValue(parsed[artifact].v002);
    for (const allowed of PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001) {
      if (allowed.artifact !== artifact) continue;
      writeSegments(
        normalized,
        allowed.segments,
        readSegments(parsed[artifact].v001, allowed.segments),
      );
    }
    normalizedOutsideAllowedFieldsByteIdentical[artifact] =
      serializeFormalJson(normalized).equals(packageV001[artifact]);
  }

  const changedLeafPaths = PRESENTATION_CAPTION_PACKAGE_FILES_V001.slice(5)
    .flatMap((artifact) => collectChangedLeaves(
      artifact,
      parsed[artifact].v001,
      parsed[artifact].v002,
    ));
  const expectedChangedLeafPaths =
    PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001.map(
      ({artifact, path, kind}) => ({artifact, path, kind}),
    );
  const expectedKeys = new Set(expectedChangedLeafPaths.map(
    ({artifact, path}) => `${artifact}\u0000${path}`,
  ));
  const changedKeys = new Set(changedLeafPaths.map(
    ({artifact, path}) => `${artifact}\u0000${path}`,
  ));
  const unexpectedChangedLeafPaths = changedLeafPaths.filter(
    ({artifact, path}) => !expectedKeys.has(`${artifact}\u0000${path}`),
  );
  const missingChangedLeafPaths = expectedChangedLeafPaths.filter(
    ({artifact, path}) => !changedKeys.has(`${artifact}\u0000${path}`),
  );
  const changedValuesMatch = PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001
    .map(({artifact, path, segments, expectedV002Value}) => ({
      artifact,
      path,
      expectedV002Value,
      actualV002Value: readSegments(parsed[artifact].v002, segments),
      matches: readSegments(parsed[artifact].v002, segments) === expectedV002Value,
    }));

  const status = firstFiveArtifacts.every((entry) => entry.byteIdentical)
    && changedLeafPaths.length === expectedChangedLeafPaths.length
    && unexpectedChangedLeafPaths.length === 0
    && missingChangedLeafPaths.length === 0
    && changedValuesMatch.every(({matches}) => matches)
    && Object.values(normalizedOutsideAllowedFieldsByteIdentical).every(Boolean)
    ? 'passed'
    : 'failed';

  return {
    schemaVersion:
      'presentation-caption-semantic-source-package-v002-transition-verification-v001',
    status,
    packageFileSet: {v001: true, v002: true},
    firstFiveArtifacts,
    changedLeafPaths,
    expectedChangedLeafPaths,
    unexpectedChangedLeafPaths,
    missingChangedLeafPaths,
    changedValuesMatch,
    normalizedOutsideAllowedFieldsByteIdentical,
  };
}

const readPackage = (rootPath) => {
  const absoluteRoot = resolve(WORKSPACE_ROOT, rootPath);
  const rootStat = lstatSync(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new TypeError('package root must be a real directory');
  }
  const entries = readdirSync(absoluteRoot, {withFileTypes: true})
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  const expected = [...PRESENTATION_CAPTION_PACKAGE_FILES_V001]
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (entries.length !== expected.length
    || entries.some((entry, index) => (
      entry.name !== expected[index] || !entry.isFile() || entry.isSymbolicLink()
    ))) {
    throw new TypeError('package file set mismatch');
  }
  return Object.fromEntries(PRESENTATION_CAPTION_PACKAGE_FILES_V001.map(
    (fileName) => [fileName, readFileSync(resolve(absoluteRoot, fileName))],
  ));
};

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  try {
    const outputPath = resolve(WORKSPACE_ROOT, REPORT_PATH);
    if (existsSync(outputPath)) throw new TypeError('verification report already exists');
    const transition = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
      readPackage(PACKAGE_ROOT_V001),
      readPackage(PACKAGE_ROOT_V002),
    );
    const immutableBindings = IMMUTABLE_BINDINGS.map(({path, fileSha256}) => {
      const observedFileSha256 = sha256(readFileSync(resolve(WORKSPACE_ROOT, path)));
      return {
        path,
        expectedFileSha256: fileSha256,
        observedFileSha256,
        byteIdentityMaintained: observedFileSha256 === fileSha256,
      };
    });
    const result = {
      ...transition,
      status: transition.status === 'passed'
        && immutableBindings.every(({byteIdentityMaintained}) => byteIdentityMaintained)
        ? 'passed'
        : 'failed',
      immutableBindings,
    };
    mkdirSync(dirname(outputPath), {recursive: true});
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === 'passed' ? 0 : 1;
  } catch {
    process.stderr.write('CAPTION_PACKAGE_V002_TRANSITION_VERIFICATION_FAILED\n');
    process.exitCode = 2;
  }
}

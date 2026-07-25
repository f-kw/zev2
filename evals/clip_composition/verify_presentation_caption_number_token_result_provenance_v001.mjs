import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import * as packageCore from './presentation_caption_semantic_source_package_v001.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(SCRIPT_DIRECTORY, '../..');
const PACKAGE_CORE_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const HARNESS_PATH =
  'evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-b4-number-token-invariance-v002';
const OUTPUT_PATH = `${OUTPUT_ROOT}/result-provenance-comparison-v001.json`;
const OUTPUT_SCHEMA =
  'presentation-caption-result-provenance-invariance-comparison-v001';

const OBSERVATION_BINDINGS = Object.freeze([
  Object.freeze({
    role: 'before',
    path: `${OUTPUT_ROOT}/before.json`,
    fileSha256: '885775b57e57c0f86755eae2259cdb5912877db58cf1bf6409acafb784d35ac0',
  }),
  Object.freeze({
    role: 'after',
    path: `${OUTPUT_ROOT}/after.json`,
    fileSha256: '7988633dcba02572bed1237b63bf2ab1a33e9a2074552d942c93b3c7e8719c5e',
  }),
  Object.freeze({
    role: 'comparison',
    path: `${OUTPUT_ROOT}/comparison.json`,
    fileSha256: 'aff2a58d8d8b25464690003d17b9a23a56bd98ebce5ef6a518e5620e61fa7512',
  }),
]);

const IMPLEMENTATION_CHANGE = Object.freeze({
  path: PACKAGE_CORE_PATH,
  before: Object.freeze({
    commit: '9f95e3fa2023d4d9755bdf1e0ab32f7cb163ca80',
    fileSha256: 'db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224',
  }),
  after: Object.freeze({
    commit: '171751885fc75943b392c566309062916118ba98',
    fileSha256: 'c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6',
  }),
});

const OBSERVED_ARTIFACT_HASHES = Object.freeze({
  before: Object.freeze({
    manifest: Object.freeze({
      fileSha256: 'c3f553a2aa2f951c18cefe82a1a07e9331f5ccef8600ef6b89821eb687242bc7',
      canonicalSha256: '4a1e3aa69f9c23412800ab136425373f286e97575a6abdb7baa5ec565e8af68c',
    }),
    report: Object.freeze({
      fileSha256: '259a1743c302e63c6de116112f0c3ae5382a6c86d21f546a9d00c6b62931a008',
      canonicalSha256: 'cd2fafb21e1421cbd884f28a295c7cbdbbc6d86602de700ad8a10d5c8cb43a5a',
    }),
  }),
  after: Object.freeze({
    manifest: Object.freeze({
      fileSha256: '108821740fdb5c3cd9685508d131b1864f063caf913e3be851640af194996d7b',
      canonicalSha256: 'e0c258f9cd2a5127839481693a786563828b7c35a8bf9ff8a93fad0841ce2ed9',
    }),
    report: Object.freeze({
      fileSha256: '9a29022e9a1fc1dda49be16c1862135659080be0b9815ae15a49351df4429131',
      canonicalSha256: '80f9a7c44e2a815b8f859d59e4f5cee6149df714a6a16e0bf8b766baa2eff9fa',
    }),
  }),
});

const EXPECTED_CHANGED_LEAF_PATHS = Object.freeze([
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.packageJobBinding.fileSha256',
  }),
  Object.freeze({
    artifact: 'package-manifest.json',
    path: '$.implementationBinding.files[0].fileSha256',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.jobBinding.fileSha256',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.manifestBinding.fileSha256',
  }),
  Object.freeze({
    artifact: 'package-validation-report.json',
    path: '$.manifestBinding.canonicalSha256',
  }),
]);

const EXPECTED_HARNESS_SHA256 =
  'adcfa52475f569dc14c5576b32af30009ca5d383b37e2a9ed5b60bb15442d02f';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clone = (value) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, clone(entry)]),
    );
  }
  return value;
};
const formalBytes = (value) => {
  const result = packageCore.serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalBytes = (value) => {
  const result = packageCore.canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return result.bytes;
};
const canonicalSha256 = (value) => sha256(canonicalBytes(value));
const sameCanonicalValue = (left, right) =>
  canonicalBytes(left).equals(canonicalBytes(right));

const readBoundObservation = (binding) => {
  const bytes = readFileSync(resolve(WORKSPACE_ROOT, binding.path));
  assert.equal(sha256(bytes), binding.fileSha256, binding.path);
  return {
    ...binding,
    bytes,
    value: JSON.parse(bytes.toString('utf8')),
  };
};

const readGitFile = (commit, path) =>
  execFileSync('git', ['show', `${commit}:${path}`], {
    cwd: WORKSPACE_ROOT,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });

const loadFixtureBuilderWithoutChangingHarness = async () => {
  const absoluteHarnessPath = resolve(WORKSPACE_ROOT, HARNESS_PATH);
  const harnessBytes = readFileSync(absoluteHarnessPath);
  assert.equal(sha256(harnessBytes), EXPECTED_HARNESS_SHA256);

  const originalUrl = pathToFileURL(absoluteHarnessPath);
  let source = harnessBytes.toString('utf8');
  source = source.replace(
    'const test = NUMBER_TOKEN_PROJECTION_MODE ? () => {} : nodeTest;',
    'const test = () => {};',
  );
  source = source.replace(
    /from '(\.\/[^']+)'/gu,
    (_match, relativePath) => `from '${new URL(relativePath, originalUrl).href}'`,
  );
  source = source.replaceAll('import.meta.url', JSON.stringify(originalUrl.href));
  source += '\nexport {makeValidFixture};\n';

  const moduleUrl =
    `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
  const instrumentedHarness = await import(moduleUrl);
  assert.equal(typeof instrumentedHarness.makeValidFixture, 'function');
  return instrumentedHarness.makeValidFixture;
};

const snapshotWithBytes = (sourceSnapshot, inputBytes) => {
  const snapshot = clone(sourceSnapshot);
  snapshot.bytes = Buffer.from(inputBytes);
  snapshot.fileSha256 = sha256(inputBytes);
  for (const field of [
    'pathLstatBeforeOpen',
    'fdStatAfterOpen',
    'fdStatAfterRead',
  ]) {
    if (snapshot[field] !== undefined) {
      snapshot[field].size = String(inputBytes.length);
    }
  }
  return snapshot;
};

const reconstructProvenanceArtifacts = (baseFixture, implementationBytes) => {
  const fixture = clone(baseFixture);
  const implementationSha256 = sha256(implementationBytes);
  const packageCoreIndex = fixture.implementationInputs.findIndex(
    (entry) => entry.role === 'packageCore',
  );
  assert.equal(packageCoreIndex, 0);
  assert.equal(
    fixture.job.value.implementationBinding.files[packageCoreIndex].role,
    'packageCore',
  );
  assert.equal(
    fixture.job.value.implementationBinding.files[packageCoreIndex].path,
    PACKAGE_CORE_PATH,
  );

  const updatedImplementationSnapshot = snapshotWithBytes(
    fixture.implementationInputs[packageCoreIndex].snapshot,
    implementationBytes,
  );
  fixture.implementationInputs[packageCoreIndex].snapshot =
    updatedImplementationSnapshot;
  fixture.job.value.implementationBinding.files[packageCoreIndex].fileSha256 =
    implementationSha256;
  fixture.job.initialSnapshot = snapshotWithBytes(
    fixture.job.initialSnapshot,
    formalBytes(fixture.job.value),
  );

  const build = packageCore.buildPresentationCaptionSemanticSourcePackageV001({
    job: {
      value: fixture.job.value,
      snapshot: fixture.job.initialSnapshot,
    },
    gateA: {
      jobValue: fixture.gateA.jobValue,
      jobSnapshot: fixture.gateA.jobInput.snapshot,
      completionReportSnapshot: fixture.gateA.completionReportInput.snapshot,
      evidenceValue: fixture.gateA.evidencePasses[0].value,
      evidenceBytes: fixture.gateA.evidencePasses[0].bytes,
      embeddedReportValue: fixture.gateA.embeddedReportPasses[0].value,
      embeddedReportBytes: fixture.gateA.embeddedReportPasses[0].bytes,
    },
    implementationSnapshots: fixture.implementationInputs.map(
      (entry) => entry.snapshot,
    ),
    sourceSnapshots: fixture.gateA.sourceInputs.map((entry) => entry.snapshot),
    widthPolicySnapshots: fixture.widthPolicyInputs.map((entry) => entry.snapshot),
    runtimeObservation: fixture.runtimeObservation,
  });
  assert.equal(build.artifacts.length, 7);
  return {
    implementationSha256,
    manifest: build.artifacts[5],
    report: build.artifacts[6],
  };
};

const collectChangedLeafPaths = (artifact, before, after, path = '$') => {
  if (Object.is(before, after)) return [];
  if (
    before === null
    || after === null
    || typeof before !== 'object'
    || typeof after !== 'object'
    || Array.isArray(before) !== Array.isArray(after)
  ) {
    return [{artifact, path}];
  }
  if (Array.isArray(before)) {
    if (before.length !== after.length) return [{artifact, path}];
    return before.flatMap((entry, index) =>
      collectChangedLeafPaths(artifact, entry, after[index], `${path}[${index}]`));
  }
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  if (!sameCanonicalValue(beforeKeys, afterKeys)) return [{artifact, path}];
  return beforeKeys.flatMap((key) =>
    collectChangedLeafPaths(artifact, before[key], after[key], `${path}.${key}`));
};

const artifactMatchesObservedHashes = (artifact, expected) =>
  artifact.fileSha256 === expected.fileSha256
  && artifact.canonicalSha256 === expected.canonicalSha256
  && sha256(artifact.bytes) === expected.fileSha256
  && canonicalSha256(artifact.value) === expected.canonicalSha256;

const sourceObservationsAtStart = OBSERVATION_BINDINGS.map(readBoundObservation);
const observationByRole = Object.fromEntries(
  sourceObservationsAtStart.map((entry) => [entry.role, entry]),
);
const beforeObservation = observationByRole.before.value;
const afterObservation = observationByRole.after.value;

const beforeImplementationBytes = readGitFile(
  IMPLEMENTATION_CHANGE.before.commit,
  IMPLEMENTATION_CHANGE.path,
);
const afterImplementationBytes = readGitFile(
  IMPLEMENTATION_CHANGE.after.commit,
  IMPLEMENTATION_CHANGE.path,
);
const approvedSourceHashTransitionMatches =
  sha256(beforeImplementationBytes) === IMPLEMENTATION_CHANGE.before.fileSha256
  && sha256(afterImplementationBytes) === IMPLEMENTATION_CHANGE.after.fileSha256
  && !beforeImplementationBytes.equals(afterImplementationBytes);

const resultLayer = {
  b3StrictJsonUnchanged: sameCanonicalValue(
    beforeObservation.projection.b3StrictJson,
    afterObservation.projection.b3StrictJson,
  ),
  externalDisplaySlotsUnchanged: sameCanonicalValue(
    beforeObservation.projection.externalDisplaySlots,
    afterObservation.projection.externalDisplaySlots,
  ),
  firstFiveBuiltArtifactsUnchanged: sameCanonicalValue(
    beforeObservation.projection.builtArtifacts.slice(0, 5),
    afterObservation.projection.builtArtifacts.slice(0, 5),
  ),
  fixedHashProbeUnchanged: sameCanonicalValue(
    beforeObservation.projection.fixedHashProbe,
    afterObservation.projection.fixedHashProbe,
  ),
  status: 'failed',
};
resultLayer.status = Object.entries(resultLayer)
  .filter(([key]) => key !== 'status')
  .every(([, value]) => value === true)
  ? 'passed'
  : 'failed';

const makeValidFixture = await loadFixtureBuilderWithoutChangingHarness();
const baseFixture = makeValidFixture();
const beforeReconstruction =
  reconstructProvenanceArtifacts(baseFixture, beforeImplementationBytes);
const afterReconstruction =
  reconstructProvenanceArtifacts(baseFixture, afterImplementationBytes);

const changedLeafPaths = [
  ...collectChangedLeafPaths(
    'package-manifest.json',
    beforeReconstruction.manifest.value,
    afterReconstruction.manifest.value,
  ),
  ...collectChangedLeafPaths(
    'package-validation-report.json',
    beforeReconstruction.report.value,
    afterReconstruction.report.value,
  ),
];
const expectedChangedLeafPaths = EXPECTED_CHANGED_LEAF_PATHS.map((entry) => ({...entry}));
const unexpectedChangedLeafPaths = changedLeafPaths.filter(
  (entry, index) =>
    expectedChangedLeafPaths[index]?.artifact !== entry.artifact
    || expectedChangedLeafPaths[index]?.path !== entry.path,
);

const beforeReconstructionMatchesObservedHashes =
  artifactMatchesObservedHashes(
    beforeReconstruction.manifest,
    OBSERVED_ARTIFACT_HASHES.before.manifest,
  )
  && artifactMatchesObservedHashes(
    beforeReconstruction.report,
    OBSERVED_ARTIFACT_HASHES.before.report,
  );
const afterReconstructionMatchesObservedHashes =
  artifactMatchesObservedHashes(
    afterReconstruction.manifest,
    OBSERVED_ARTIFACT_HASHES.after.manifest,
  )
  && artifactMatchesObservedHashes(
    afterReconstruction.report,
    OBSERVED_ARTIFACT_HASHES.after.report,
  );

const manifestDerivedHashesMatch = [beforeReconstruction, afterReconstruction]
  .every((entry) => (
    entry.manifest.value.packageJobBinding.fileSha256
      === entry.report.value.jobBinding.fileSha256
    && entry.manifest.value.implementationBinding.files[0].fileSha256
      === entry.implementationSha256
  ));
const validationReportDerivedHashesMatch = [beforeReconstruction, afterReconstruction]
  .every((entry) => (
    entry.report.value.manifestBinding.fileSha256 === entry.manifest.fileSha256
    && entry.report.value.manifestBinding.canonicalSha256
      === entry.manifest.canonicalSha256
  ));

const provenanceLayer = {
  beforeReconstructionMatchesObservedHashes,
  afterReconstructionMatchesObservedHashes,
  approvedSourceHashTransitionMatches,
  changedLeafPaths,
  expectedChangedLeafPaths,
  unexpectedChangedLeafPaths,
  manifestDerivedHashesMatch,
  validationReportDerivedHashesMatch,
  status: 'failed',
};
provenanceLayer.status =
  beforeReconstructionMatchesObservedHashes
  && afterReconstructionMatchesObservedHashes
  && approvedSourceHashTransitionMatches
  && sameCanonicalValue(changedLeafPaths, expectedChangedLeafPaths)
  && unexpectedChangedLeafPaths.length === 0
  && manifestDerivedHashesMatch
  && validationReportDerivedHashesMatch
    ? 'passed'
    : 'failed';

const sourceObservationsAtEnd = OBSERVATION_BINDINGS.map(readBoundObservation);
const sourceObservationBindings = Object.fromEntries(
  sourceObservationsAtStart.map((entry, index) => [
    entry.role,
    {
      path: entry.path,
      expectedFileSha256: entry.fileSha256,
      startFileSha256: sha256(entry.bytes),
      endFileSha256: sha256(sourceObservationsAtEnd[index].bytes),
      unchanged:
        entry.bytes.equals(sourceObservationsAtEnd[index].bytes)
        && entry.fileSha256 === sourceObservationsAtEnd[index].fileSha256,
    },
  ]),
);
const sourceObservationsUnchanged = Object.values(sourceObservationBindings)
  .every((entry) => entry.unchanged === true);

const output = {
  schemaVersion: OUTPUT_SCHEMA,
  sourceObservationBindings,
  approvedImplementationChange: {
    path: IMPLEMENTATION_CHANGE.path,
    before: {
      commit: IMPLEMENTATION_CHANGE.before.commit,
      expectedFileSha256: IMPLEMENTATION_CHANGE.before.fileSha256,
      observedFileSha256: sha256(beforeImplementationBytes),
      matches: sha256(beforeImplementationBytes)
        === IMPLEMENTATION_CHANGE.before.fileSha256,
    },
    after: {
      commit: IMPLEMENTATION_CHANGE.after.commit,
      expectedFileSha256: IMPLEMENTATION_CHANGE.after.fileSha256,
      observedFileSha256: sha256(afterImplementationBytes),
      matches: sha256(afterImplementationBytes)
        === IMPLEMENTATION_CHANGE.after.fileSha256,
    },
  },
  resultLayer,
  provenanceLayer,
  status:
    resultLayer.status === 'passed'
    && provenanceLayer.status === 'passed'
    && sourceObservationsUnchanged
      ? 'passed'
      : 'failed',
};

const absoluteOutputPath = resolve(WORKSPACE_ROOT, OUTPUT_PATH);
mkdirSync(dirname(absoluteOutputPath), {recursive: true});
writeFileSync(absoluteOutputPath, `${JSON.stringify(output, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
});
if (output.status !== 'passed') process.exitCode = 1;

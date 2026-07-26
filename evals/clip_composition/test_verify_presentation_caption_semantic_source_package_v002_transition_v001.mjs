import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_CAPTION_PACKAGE_FILES_V001,
  PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001,
  verifyPresentationCaptionSemanticSourcePackageV002TransitionV001,
} from './verify_presentation_caption_semantic_source_package_v002_transition_v001.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const formal = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const manifestV001 = () => ({
  schemaVersion: 'manifest',
  packageId: 'package-v001',
  artifactId: 'artifact-v001',
  formalOutputPath: 'root/v001',
  packageJobBinding: {
    path: 'job-v001.json',
    fileSha256: 'a'.repeat(64),
  },
  implementationBinding: {
    files: [{
      role: 'packageCore',
      fileSha256: 'b'.repeat(64),
    }],
  },
  unchanged: {value: 'same'},
});

const reportV001 = () => ({
  schemaVersion: 'report',
  jobBinding: {
    path: 'job-v001.json',
    fileSha256: 'a'.repeat(64),
  },
  package: {
    packageId: 'package-v001',
    artifactId: 'artifact-v001',
    formalOutputPath: 'root/v001',
  },
  manifestBinding: {
    fileSha256: 'c'.repeat(64),
    canonicalSha256: 'd'.repeat(64),
  },
  unchanged: {value: 'same'},
});

const packagePair = () => {
  const manifestBefore = manifestV001();
  const reportBefore = reportV001();
  const manifestAfter = clone(manifestBefore);
  const reportAfter = clone(reportBefore);
  const afterByArtifact = {
    'package-manifest.json': manifestAfter,
    'package-validation-report.json': reportAfter,
  };
  for (const {
    artifact,
    segments,
    expectedV002Value,
  } of PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001) {
    let target = afterByArtifact[artifact];
    for (const segment of segments.slice(0, -1)) target = target[segment];
    target[segments.at(-1)] = expectedV002Value;
  }

  const shared = Object.fromEntries(
    PRESENTATION_CAPTION_PACKAGE_FILES_V001.slice(0, 5).map(
      (fileName, index) => [fileName, Buffer.from(`artifact-${index}`, 'utf8')],
    ),
  );
  return {
    v001: {
      ...shared,
      'package-manifest.json': formal(manifestBefore),
      'package-validation-report.json': formal(reportBefore),
    },
    v002: {
      ...Object.fromEntries(
        Object.entries(shared).map(([key, value]) => [key, Buffer.from(value)]),
      ),
      'package-manifest.json': formal(manifestAfter),
      'package-validation-report.json': formal(reportAfter),
    },
  };
};

test('the fixed eleven-field transition passes', () => {
  const pair = packagePair();
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'passed');
  assert.equal(result.changedLeafPaths.length, 11);
  assert.deepEqual(
    result.changedLeafPaths.map(({artifact, path}) => ({artifact, path})),
    PRESENTATION_CAPTION_PACKAGE_V002_ALLOWED_DIFFS_V001.map(
      ({artifact, path}) => ({artifact, path}),
    ),
  );
});

test('a content artifact byte change fails', () => {
  const pair = packagePair();
  pair.v002['semantic-source-input.json'] = Buffer.from('changed', 'utf8');
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'failed');
  assert.equal(
    result.firstFiveArtifacts.find(
      ({fileName}) => fileName === 'semantic-source-input.json',
    ).byteIdentical,
    false,
  );
});

test('an additional manifest field change fails', () => {
  const pair = packagePair();
  const changed = JSON.parse(pair.v002['package-manifest.json'].toString('utf8'));
  changed.unchanged.value = 'different';
  pair.v002['package-manifest.json'] = formal(changed);
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.unexpectedChangedLeafPaths, [{
    artifact: 'package-manifest.json',
    path: '$.unchanged.value',
  }]);
});

test('a missing required identity change fails', () => {
  const pair = packagePair();
  const changed = JSON.parse(pair.v002['package-manifest.json'].toString('utf8'));
  changed.packageId = 'package-v001';
  pair.v002['package-manifest.json'] = formal(changed);
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.missingChangedLeafPaths[0], {
    artifact: 'package-manifest.json',
    path: '$.packageId',
    kind: 'version-identity',
  });
});

test('a fixed allowed field with a different value fails', () => {
  const pair = packagePair();
  const changed = JSON.parse(pair.v002['package-manifest.json'].toString('utf8'));
  changed.packageId = 'another-v002-package';
  pair.v002['package-manifest.json'] = formal(changed);
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'failed');
  assert.equal(
    result.changedValuesMatch.find(
      ({artifact, path}) => artifact === 'package-manifest.json'
        && path === '$.packageId',
    ).matches,
    false,
  );
});

test('different JSON key ordering outside the eleven values fails byte restoration', () => {
  const pair = packagePair();
  const parsed = JSON.parse(pair.v002['package-manifest.json'].toString('utf8'));
  const reordered = {
    schemaVersion: parsed.schemaVersion,
    artifactId: parsed.artifactId,
    packageId: parsed.packageId,
    formalOutputPath: parsed.formalOutputPath,
    packageJobBinding: parsed.packageJobBinding,
    implementationBinding: parsed.implementationBinding,
    unchanged: parsed.unchanged,
  };
  pair.v002['package-manifest.json'] = formal(reordered);
  const result = verifyPresentationCaptionSemanticSourcePackageV002TransitionV001(
    pair.v001,
    pair.v002,
  );
  assert.equal(result.status, 'failed');
  assert.equal(
    result.normalizedOutsideAllowedFieldsByteIdentical['package-manifest.json'],
    false,
  );
});

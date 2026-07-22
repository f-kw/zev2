#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {lstat, open, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_AUDIO_GRID_REGRESSION_PROJECTION_SCHEMA_VERSION,
} from './presentation_audio_grid_regression_projection_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-audio-grid-regression-projection-v001',
);
const EXPECTED_FILES = Object.freeze({
  beforeBuilder: 'before-builder.json',
  afterBuilder: 'after-builder.json',
  beforeIntegration: 'before-integration.json',
  afterIntegration: 'after-integration.json',
  output: 'comparison.json',
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sameCanonical = (left, right) => canonicalJson(left) === canonicalJson(right);
const exactKeys = (value, expected) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && sameCanonical(Object.keys(value).sort(), [...expected].sort());

const assertExactPath = (value, expectedFileName, label) => {
  const resolved = path.resolve(WORKSPACE_ROOT, value);
  const expected = path.join(OUTPUT_ROOT, expectedFileName);
  if (resolved !== expected) throw new Error(`${label} must be ${path.relative(WORKSPACE_ROOT, expected)}`);
  return resolved;
};

const assertNoSymlinkComponents = async (targetPath, includeLeaf) => {
  const relative = path.relative(WORKSPACE_ROOT, targetPath);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('path escapes workspace');
  }
  const parts = relative.split(path.sep);
  const count = includeLeaf ? parts.length : parts.length - 1;
  let cursor = WORKSPACE_ROOT;
  for (let index = 0; index < count; index += 1) {
    cursor = path.join(cursor, parts[index]);
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error(`symlink component is forbidden: ${cursor}`);
  }
};

const readBoundJson = async (value, expectedFileName, label) => {
  const resolved = assertExactPath(value, expectedFileName, label);
  await assertNoSymlinkComponents(resolved, true);
  const info = await lstat(resolved);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} is not a regular file`);
  const bytes = await readFile(resolved);
  const artifact = JSON.parse(bytes.toString('utf8'));
  return {
    artifact,
    provenance: {
      path: path.relative(WORKSPACE_ROOT, resolved),
      fileSha256: sha256Bytes(bytes),
      canonicalSha256: sha256Bytes(canonicalJson(artifact)),
    },
  };
};

const writeNewBoundFile = async (value, bytes) => {
  const resolved = assertExactPath(value, EXPECTED_FILES.output, 'output');
  await assertNoSymlinkComponents(resolved, false);
  const handle = await open(resolved, 'wx');
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const validateProjection = (artifact, {role, suiteId, caseCount, label}) => {
  const violations = [];
  const reject = (pathValue, expected, actual) => violations.push({path: pathValue, expected, actual});
  if (!exactKeys(artifact, ['schemaVersion', 'suiteId', 'role', 'capturedFrom', 'cases'])) {
    reject('$', 'exact projection top-level fields', Object.keys(artifact ?? {}));
  }
  if (artifact?.schemaVersion !== PRESENTATION_AUDIO_GRID_REGRESSION_PROJECTION_SCHEMA_VERSION) {
    reject('$.schemaVersion', PRESENTATION_AUDIO_GRID_REGRESSION_PROJECTION_SCHEMA_VERSION, artifact?.schemaVersion);
  }
  if (artifact?.suiteId !== suiteId) reject('$.suiteId', suiteId, artifact?.suiteId);
  if (artifact?.role !== role) reject('$.role', role, artifact?.role);
  if (!exactKeys(artifact?.capturedFrom, ['gitHead', 'builderFileSha256', 'harnessFiles', 'tools'])) {
    reject('$.capturedFrom', 'exact capturedFrom fields', Object.keys(artifact?.capturedFrom ?? {}));
  }
  if (!/^[0-9a-f]{40}$/.test(artifact?.capturedFrom?.gitHead ?? '')) {
    reject('$.capturedFrom.gitHead', '40 lowercase hex', artifact?.capturedFrom?.gitHead);
  }
  if (!SHA256_PATTERN.test(artifact?.capturedFrom?.builderFileSha256 ?? '')) {
    reject('$.capturedFrom.builderFileSha256', 'sha256', artifact?.capturedFrom?.builderFileSha256);
  }
  if (!Array.isArray(artifact?.cases) || artifact.cases.length !== caseCount) {
    reject('$.cases.length', caseCount, artifact?.cases?.length ?? null);
  } else {
    const ids = artifact.cases.map((item) => item?.caseId);
    if (ids.some((id) => typeof id !== 'string' || id.length === 0)
        || new Set(ids).size !== ids.length) {
      reject('$.cases[*].caseId', 'unique non-empty strings', ids);
    }
  }
  if (violations.length > 0) {
    throw new Error(`${label} projection contract failed: ${JSON.stringify(violations)}`);
  }
};

const normalizedForComparison = (artifact) => {
  const result = structuredClone(artifact);
  result.role = '<ROLE>';
  result.capturedFrom.gitHead = '<GIT_HEAD>';
  result.capturedFrom.builderFileSha256 = '<BUILDER_FILE_SHA256>';
  return result;
};

const compareSuite = (before, after, {label, suiteId, caseCount}) => {
  validateProjection(before, {role: 'before-fix', suiteId, caseCount, label: `${label}:before`});
  validateProjection(after, {role: 'after-fix', suiteId, caseCount, label: `${label}:after`});
  const violations = [];
  if (!sameCanonical(normalizedForComparison(before), normalizedForComparison(after))) {
    violations.push({
      path: '$',
      reason: 'artifacts differ outside the three pre-authorized provenance fields',
    });
  }
  const caseResults = before.cases.map((beforeCase, index) => ({
    caseId: beforeCase.caseId,
    status: sameCanonical(beforeCase, after.cases[index]) ? 'unchanged' : 'changed',
  }));
  return {
    label,
    status: violations.length === 0 ? 'passed' : 'failed',
    before: {
      role: before.role,
      gitHead: before.capturedFrom.gitHead,
      builderFileSha256: before.capturedFrom.builderFileSha256,
      caseCount: before.cases.length,
    },
    after: {
      role: after.role,
      gitHead: after.capturedFrom.gitHead,
      builderFileSha256: after.capturedFrom.builderFileSha256,
      caseCount: after.cases.length,
    },
    allowedMetadataDifferences: [
      '$.role',
      '$.capturedFrom.gitHead',
      '$.capturedFrom.builderFileSha256',
    ],
    caseResults,
    violations,
  };
};

export const comparePresentationAudioGridRegressionProjectionsV001 = ({
  beforeBuilder,
  afterBuilder,
  beforeIntegration,
  afterIntegration,
}) => {
  const suites = [
    compareSuite(beforeBuilder, afterBuilder, {
      label: 'builder-audio-normal-cases',
      suiteId: 'presentation-base-media-audio-normal-cases-v001',
      caseCount: 9,
    }),
    compareSuite(beforeIntegration, afterIntegration, {
      label: 'builder-renderer-audio-integration',
      suiteId: 'presentation-builder-renderer-audio-integration-v001',
      caseCount: 1,
    }),
  ];
  return {
    schemaVersion: 'presentation-audio-grid-regression-comparison-v001',
    comparisonId: 'presentation-audio-grid-before-after-v001',
    status: suites.every((suite) => suite.status === 'passed') ? 'passed' : 'failed',
    comparedCaseCount: suites.reduce((sum, suite) => sum + suite.before.caseCount, 0),
    unchangedCaseCount: suites.flatMap((suite) => suite.caseResults)
      .filter((item) => item.status === 'unchanged').length,
    suites,
  };
};

const main = async () => {
  const [beforeBuilderValue, afterBuilderValue, beforeIntegrationValue, afterIntegrationValue, outputValue] = process.argv.slice(2);
  if (![beforeBuilderValue, afterBuilderValue, beforeIntegrationValue, afterIntegrationValue, outputValue]
    .every((value) => typeof value === 'string' && value.length > 0)) {
    process.stderr.write('usage: compare_presentation_audio_grid_regression_projection_v001.mjs <before-builder> <after-builder> <before-integration> <after-integration> <output>\n');
    process.exitCode = 2;
    return;
  }
  const inputs = {
    beforeBuilder: await readBoundJson(beforeBuilderValue, EXPECTED_FILES.beforeBuilder, 'beforeBuilder'),
    afterBuilder: await readBoundJson(afterBuilderValue, EXPECTED_FILES.afterBuilder, 'afterBuilder'),
    beforeIntegration: await readBoundJson(beforeIntegrationValue, EXPECTED_FILES.beforeIntegration, 'beforeIntegration'),
    afterIntegration: await readBoundJson(afterIntegrationValue, EXPECTED_FILES.afterIntegration, 'afterIntegration'),
  };
  const comparison = comparePresentationAudioGridRegressionProjectionsV001({
    beforeBuilder: inputs.beforeBuilder.artifact,
    afterBuilder: inputs.afterBuilder.artifact,
    beforeIntegration: inputs.beforeIntegration.artifact,
    afterIntegration: inputs.afterIntegration.artifact,
  });
  comparison.inputs = Object.fromEntries(Object.entries(inputs).map(([key, value]) => [
    key,
    value.provenance,
  ]));
  const bytes = Buffer.from(`${JSON.stringify(comparison, null, 2)}\n`);
  await writeNewBoundFile(outputValue, bytes);
  process.stdout.write(`${JSON.stringify({
    status: comparison.status,
    comparedCaseCount: comparison.comparedCaseCount,
    unchangedCaseCount: comparison.unchangedCaseCount,
    outputSha256: sha256Bytes(bytes),
  })}\n`);
  process.exitCode = comparison.status === 'passed' ? 0 : 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  });
}

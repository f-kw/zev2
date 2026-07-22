#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {lstat, open, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  comparePresentationAudioGridProjectionSuiteV001,
} from './compare_presentation_audio_grid_regression_projection_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-audio-grid-regression-projection-v001',
);
const FILES = Object.freeze({
  beforeBuilder: 'before-builder.json',
  afterBuilder: 'after-builder.json',
  beforeIntegration: 'before-integration-v002.json',
  afterIntegration: 'after-integration-v002.json',
  supersededComparison: 'comparison.json',
  output: 'comparison-v002.json',
});

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');

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

const readFixedArtifact = async (fileName) => {
  const filePath = path.join(OUTPUT_ROOT, fileName);
  await assertNoSymlinkComponents(filePath, true);
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${fileName} is not a regular file`);
  const bytes = await readFile(filePath);
  const artifact = JSON.parse(bytes.toString('utf8'));
  return {
    artifact,
    provenance: {
      path: path.relative(WORKSPACE_ROOT, filePath),
      fileSha256: sha256Bytes(bytes),
      canonicalSha256: sha256Bytes(canonicalJson(artifact)),
    },
  };
};

const writeNewOutput = async (bytes) => {
  const filePath = path.join(OUTPUT_ROOT, FILES.output);
  await assertNoSymlinkComponents(filePath, false);
  const handle = await open(filePath, 'wx');
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const main = async () => {
  if (process.argv.length !== 2) throw new Error('this comparison has no caller-controlled paths');
  const inputs = {
    beforeBuilder: await readFixedArtifact(FILES.beforeBuilder),
    afterBuilder: await readFixedArtifact(FILES.afterBuilder),
    beforeIntegration: await readFixedArtifact(FILES.beforeIntegration),
    afterIntegration: await readFixedArtifact(FILES.afterIntegration),
    supersededComparison: await readFixedArtifact(FILES.supersededComparison),
  };
  const superseded = inputs.supersededComparison.artifact;
  if (superseded.schemaVersion !== 'presentation-audio-grid-regression-comparison-v001'
      || superseded.status !== 'failed'
      || superseded.comparedCaseCount !== 10
      || superseded.unchangedCaseCount !== 9
      || superseded.suites?.[0]?.status !== 'passed'
      || superseded.suites?.[1]?.status !== 'failed') {
    throw new Error('superseded v001 comparison is not the recorded 9/10 harness failure');
  }
  const suites = [
    comparePresentationAudioGridProjectionSuiteV001(
      inputs.beforeBuilder.artifact,
      inputs.afterBuilder.artifact,
      {
        label: 'builder-audio-normal-cases',
        suiteId: 'presentation-base-media-audio-normal-cases-v001',
        caseCount: 9,
      },
    ),
    comparePresentationAudioGridProjectionSuiteV001(
      inputs.beforeIntegration.artifact,
      inputs.afterIntegration.artifact,
      {
        label: 'builder-renderer-audio-integration-corrected-harness',
        suiteId: 'presentation-builder-renderer-audio-integration-v002',
        caseCount: 1,
      },
    ),
  ];
  const artifact = {
    schemaVersion: 'presentation-audio-grid-regression-comparison-v002',
    comparisonId: 'presentation-audio-grid-before-after-corrected-harness-v002',
    status: suites.every((suite) => suite.status === 'passed') ? 'passed' : 'failed',
    comparedCaseCount: suites.reduce((sum, suite) => sum + suite.before.caseCount, 0),
    unchangedCaseCount: suites.flatMap((suite) => suite.caseResults)
      .filter((item) => item.status === 'unchanged').length,
    correction: {
      supersedesOnly: 'builder-renderer-audio-integration suite in v001 comparison',
      originalEvidenceDeleted: false,
      reason: 'v001 integration harness embedded a random temporary basis path into the approved payload hash and derived artifact id',
      change: 'v002 fixes the relative runtime path and records harness paths workspace-relative; no production input or expected media value is changed',
    },
    inputs: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, value.provenance])),
    suites,
  };
  const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
  await writeNewOutput(bytes);
  process.stdout.write(`${JSON.stringify({
    status: artifact.status,
    comparedCaseCount: artifact.comparedCaseCount,
    unchangedCaseCount: artifact.unchangedCaseCount,
    outputSha256: sha256Bytes(bytes),
  })}\n`);
  process.exitCode = artifact.status === 'passed' ? 0 : 1;
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 2;
});

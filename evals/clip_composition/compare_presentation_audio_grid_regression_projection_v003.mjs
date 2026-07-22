#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {lstat, open, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  comparePresentationAudioGridProjectionSuiteV001,
} from './compare_presentation_audio_grid_regression_projection_v001.mjs';
import {
  PRESENTATION_AUDIO_GRID_REGRESSION_FIXED_TOOLCHAIN_PROJECTION_SCHEMA_VERSION,
} from './presentation_audio_grid_regression_projection_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-audio-grid-regression-projection-v001',
);
const FILES = Object.freeze({
  beforeBuilder: 'before-builder-v003.json',
  afterBuilder: 'after-builder-v003.json',
  beforeIntegration: 'before-integration-v003.json',
  afterIntegration: 'after-integration-v003.json',
  firstFailedComparison: 'comparison.json',
  secondFailedComparison: 'comparison-v002.json',
  output: 'comparison-v003.json',
});
const EXPECTED_FAILED_COMPARISON_SHA256 = Object.freeze({
  firstFailedComparison: '0be0611505fa863a68c8df4ebea70f4354523ffb80865bf8985f46a112f9de61',
  secondFailedComparison: '0f6469cbeee70cef759d16769eefbe5230f655621ae3ab17c80bc6d61a9e7121',
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

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

const assertRecordedNineOfTenFailure = (artifact, schemaVersion, label) => {
  if (artifact.schemaVersion !== schemaVersion
      || artifact.status !== 'failed'
      || artifact.comparedCaseCount !== 10
      || artifact.unchangedCaseCount !== 9
      || artifact.suites?.[0]?.status !== 'passed'
      || artifact.suites?.[1]?.status !== 'failed') {
    throw new Error(`${label} is not the recorded 9/10 failure`);
  }
};

const exactKeys = (value, expected) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());

const validateExecutableBinding = (binding, {label, command, versionArgs}) => {
  if (!exactKeys(binding, ['command', 'invokedPath', 'resolvedPath', 'fileSha256', 'version'])) {
    throw new Error(`${label} has unexpected fields`);
  }
  if (binding.command !== command) throw new Error(`${label}.command is not ${command}`);
  if (!path.isAbsolute(binding.invokedPath) || !path.isAbsolute(binding.resolvedPath)) {
    throw new Error(`${label} paths must be absolute`);
  }
  if (!SHA256_PATTERN.test(binding.fileSha256)) throw new Error(`${label}.fileSha256 is invalid`);
  if (!exactKeys(binding.version, ['args', 'stdoutSha256', 'stderrSha256'])
      || canonicalJson(binding.version.args) !== canonicalJson(versionArgs)
      || !SHA256_PATTERN.test(binding.version.stdoutSha256)
      || !SHA256_PATTERN.test(binding.version.stderrSha256)) {
    throw new Error(`${label}.version binding is invalid`);
  }
};

const validateFixedToolchainProjection = (artifact, label) => {
  if (artifact?.schemaVersion !== PRESENTATION_AUDIO_GRID_REGRESSION_FIXED_TOOLCHAIN_PROJECTION_SCHEMA_VERSION) {
    throw new Error(`${label} is not a fixed-toolchain projection`);
  }
  const tools = artifact?.capturedFrom?.tools;
  if (!exactKeys(tools, ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion', 'executableBindings'])) {
    throw new Error(`${label}.capturedFrom.tools has unexpected fields`);
  }
  const bindings = tools.executableBindings;
  if (!exactKeys(bindings, ['nodeProcess', 'nodeOnPath', 'ffmpeg', 'ffprobe'])) {
    throw new Error(`${label}.executableBindings has unexpected fields`);
  }
  validateExecutableBinding(bindings.nodeProcess, {
    label: `${label}.nodeProcess`,
    command: bindings.nodeProcess?.invokedPath,
    versionArgs: ['--version'],
  });
  if (bindings.nodeProcess.command !== bindings.nodeProcess.invokedPath) {
    throw new Error(`${label}.nodeProcess command must equal its invoked absolute path`);
  }
  validateExecutableBinding(bindings.nodeOnPath, {
    label: `${label}.nodeOnPath`,
    command: 'node',
    versionArgs: ['--version'],
  });
  validateExecutableBinding(bindings.ffmpeg, {
    label: `${label}.ffmpeg`,
    command: 'ffmpeg',
    versionArgs: ['-version'],
  });
  validateExecutableBinding(bindings.ffprobe, {
    label: `${label}.ffprobe`,
    command: 'ffprobe',
    versionArgs: ['-version'],
  });
  if (bindings.nodeProcess.resolvedPath !== bindings.nodeOnPath.resolvedPath
      || bindings.nodeProcess.fileSha256 !== bindings.nodeOnPath.fileSha256) {
    throw new Error(`${label} node process and PATH binding differ`);
  }
  return bindings;
};

const main = async () => {
  if (process.argv.length !== 2) throw new Error('this comparison has no caller-controlled paths');
  const inputs = {
    beforeBuilder: await readFixedArtifact(FILES.beforeBuilder),
    afterBuilder: await readFixedArtifact(FILES.afterBuilder),
    beforeIntegration: await readFixedArtifact(FILES.beforeIntegration),
    afterIntegration: await readFixedArtifact(FILES.afterIntegration),
    firstFailedComparison: await readFixedArtifact(FILES.firstFailedComparison),
    secondFailedComparison: await readFixedArtifact(FILES.secondFailedComparison),
  };
  assertRecordedNineOfTenFailure(
    inputs.firstFailedComparison.artifact,
    'presentation-audio-grid-regression-comparison-v001',
    'v001 comparison',
  );
  assertRecordedNineOfTenFailure(
    inputs.secondFailedComparison.artifact,
    'presentation-audio-grid-regression-comparison-v002',
    'v002 comparison',
  );
  for (const key of Object.keys(EXPECTED_FAILED_COMPARISON_SHA256)) {
    if (inputs[key].provenance.fileSha256 !== EXPECTED_FAILED_COMPARISON_SHA256[key]) {
      throw new Error(`${key} bytes differ from the preserved failure evidence`);
    }
  }
  const toolchains = [
    validateFixedToolchainProjection(inputs.beforeBuilder.artifact, 'beforeBuilder'),
    validateFixedToolchainProjection(inputs.afterBuilder.artifact, 'afterBuilder'),
    validateFixedToolchainProjection(inputs.beforeIntegration.artifact, 'beforeIntegration'),
    validateFixedToolchainProjection(inputs.afterIntegration.artifact, 'afterIntegration'),
  ];
  const fixedToolchain = canonicalJson(toolchains[0]);
  if (toolchains.some((binding) => canonicalJson(binding) !== fixedToolchain)) {
    throw new Error('the four v003 projections do not bind the same executable toolchain');
  }
  const suites = [
    comparePresentationAudioGridProjectionSuiteV001(
      inputs.beforeBuilder.artifact,
      inputs.afterBuilder.artifact,
      {
        label: 'builder-audio-normal-cases',
        suiteId: 'presentation-base-media-audio-normal-cases-fixed-toolchain-v001',
        caseCount: 9,
        projectionSchemaVersion:
          PRESENTATION_AUDIO_GRID_REGRESSION_FIXED_TOOLCHAIN_PROJECTION_SCHEMA_VERSION,
      },
    ),
    comparePresentationAudioGridProjectionSuiteV001(
      inputs.beforeIntegration.artifact,
      inputs.afterIntegration.artifact,
      {
        label: 'builder-renderer-audio-integration-fixed-toolchain',
        suiteId: 'presentation-builder-renderer-audio-integration-fixed-toolchain-v001',
        caseCount: 1,
        projectionSchemaVersion:
          PRESENTATION_AUDIO_GRID_REGRESSION_FIXED_TOOLCHAIN_PROJECTION_SCHEMA_VERSION,
      },
    ),
  ];
  const artifact = {
    schemaVersion: 'presentation-audio-grid-regression-comparison-v003',
    comparisonId: 'presentation-audio-grid-before-after-fixed-toolchain-v003',
    status: suites.every((suite) => suite.status === 'passed') ? 'passed' : 'failed',
    comparedCaseCount: suites.reduce((sum, suite) => sum + suite.before.caseCount, 0),
    unchangedCaseCount: suites.flatMap((suite) => suite.caseResults)
      .filter((item) => item.status === 'unchanged').length,
    correction: {
      originalEvidenceDeleted: false,
      v001Failure: 'random temporary paths changed approved payload provenance',
      v002Failure: 'the isolated before-fix worktree resolved a different ffmpeg binary that shared the same first-line version string',
      v003Change: 'all ten cases are recaptured with one caller-fixed PATH and record exact node/ffmpeg/ffprobe paths, resolved paths, binary hashes, and complete version-output hashes; no production input or expected media value is changed',
    },
    executableToolchain: toolchains[0],
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

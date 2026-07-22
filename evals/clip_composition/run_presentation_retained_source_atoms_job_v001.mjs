#!/usr/bin/env node

import {createHash, randomUUID as nodeRandomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename as nodeRename,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES,
  PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL,
  PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES,
  buildPresentationRetainedSourceAtomsV001,
  canonicalJsonV001,
  makePresentationRetainedSourceAtomsViolationV001,
  serializeJsonFileV001,
  validatePresentationRetainedSourceAtomsJobV001,
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
const MODULE_DIRECTORY = path.dirname(MODULE_PATH);
const DEFAULT_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const DEFAULT_INPUT_JSON_ROOT = MODULE_DIRECTORY;
const DEFAULT_OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/retained-source-atoms',
);
const DEFAULT_FAILURE_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/retained-source-atom-failures',
);

const DIRECT_INPUT_ROLES = Object.freeze([
  'sourceIdentity',
  'candidateManifest',
  'assemblyDecision',
  'formalizationReceipt',
  'timeline',
  'baseMediaGenerationManifest',
  'baseMediaValidationReport',
]);
const EXPANDED_INPUT_ROLES = Object.freeze([
  'sttManifest',
  'transcript',
  'wordTimestamps',
  'mediaEquivalence',
  'trustedArtifactSummary',
  'basisEditPlan',
  'baseMedia',
]);
const SUCCESS_FILE_NAMES = Object.freeze([
  'source-atoms.json',
  'generation-manifest.json',
  'validation-report.json',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const repoPath = (workspaceRoot, absolutePath) => path.relative(workspaceRoot, absolutePath)
  .split(path.sep).join('/');
const resolveWorkspacePath = (workspaceRoot, value) => path.isAbsolute(value)
  ? path.resolve(value)
  : path.resolve(workspaceRoot, value);
const pathIsWithin = (root, candidate) => {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
const sameJsonValue = (left, right) => canonicalJsonV001(left) === canonicalJsonV001(right);

const fileSha256Streaming = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});

const runnerConfiguration = (overrides = {}) => {
  const workspaceRoot = path.resolve(overrides.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  return {
    workspaceRoot,
    inputJsonRoot: path.resolve(overrides.inputJsonRoot ?? DEFAULT_INPUT_JSON_ROOT),
    sourceMediaRoots: Object.freeze((overrides.sourceMediaRoots ?? [DEFAULT_INPUT_JSON_ROOT])
      .map((entry) => path.resolve(entry))),
    outputRoot: path.resolve(overrides.outputRoot ?? DEFAULT_OUTPUT_ROOT),
    failureRoot: path.resolve(overrides.failureRoot ?? DEFAULT_FAILURE_ROOT),
    coreModulePath: path.resolve(
      overrides.coreModulePath ?? fileURLToPath(PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL),
    ),
    runnerModulePath: path.resolve(overrides.runnerModulePath ?? MODULE_PATH),
    rename: overrides.rename ?? nodeRename,
    randomUUID: overrides.randomUUID ?? nodeRandomUUID,
    hooks: overrides.hooks ?? {},
  };
};

class RetainedAtomsRunnerError extends Error {
  constructor(code, pathValue, details = {}, checkName = null) {
    if (!PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES.includes(code)) {
      throw new TypeError(`unknown retained-source-atoms violation code: ${code}`);
    }
    super(`${code}: ${pathValue}`);
    this.name = 'RetainedAtomsRunnerError';
    this.violation = makePresentationRetainedSourceAtomsViolationV001(
      code,
      pathValue,
      isObject(details) ? details : {message: String(details)},
    );
    this.checkName = checkName;
  }
}

const throwRunner = (code, pathValue, details = {}, checkName = null) => {
  throw new RetainedAtomsRunnerError(code, pathValue, details, checkName);
};

const readJsonBuffer = (bytes, pathValue, code = 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED') => {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    throwRunner(code, pathValue, {
      reason: 'json_parse_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const lstatOrNull = async (targetPath) => {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const inspectPathWithinRoots = async (
  candidatePath,
  roots,
  {kind = 'file', ancestryRoot = null} = {},
) => {
  const absolutePath = path.resolve(candidatePath);
  const root = roots.find((entry) => pathIsWithin(entry, absolutePath));
  if (!root) {
    throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
      reason: 'outside_allowed_roots',
      path: absolutePath,
    });
  }
  const rootAbsolute = path.resolve(root);
  const scanRoot = path.resolve(ancestryRoot ?? rootAbsolute);
  if (!pathIsWithin(scanRoot, absolutePath)) {
    throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
      reason: 'outside_ancestry_root',
      path: absolutePath,
      ancestryRoot: scanRoot,
    });
  }
  const relative = path.relative(scanRoot, absolutePath);
  const parts = relative === '' ? [] : relative.split(path.sep);
  let cursor = scanRoot;
  const rootStat = await lstat(cursor).catch((error) => {
    throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
      reason: 'allowed_root_unavailable',
      path: cursor,
      errorCode: error?.code ?? null,
    });
  });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
      reason: 'allowed_root_not_real_directory',
      path: cursor,
    });
  }
  for (let index = 0; index < parts.length; index += 1) {
    cursor = path.join(cursor, parts[index]);
    const entry = await lstat(cursor).catch((error) => {
      throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
        reason: 'path_unavailable',
        path: cursor,
        errorCode: error?.code ?? null,
      });
    });
    if (entry.isSymbolicLink()) {
      throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
        reason: 'symlink_not_allowed',
        path: cursor,
      });
    }
    const final = index === parts.length - 1;
    if (!final && !entry.isDirectory()) {
      throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
        reason: 'ancestor_not_directory',
        path: cursor,
      });
    }
    if (final && kind === 'file' && !entry.isFile()) {
      throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
        reason: 'not_regular_file',
        path: cursor,
      });
    }
    if (final && kind === 'directory' && !entry.isDirectory()) {
      throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
        reason: 'not_directory',
        path: cursor,
      });
    }
  }
  const [rootRealPath, candidateRealPath] = await Promise.all([
    realpath(rootAbsolute),
    realpath(absolutePath),
  ]);
  if (!pathIsWithin(rootRealPath, candidateRealPath)) {
    throwRunner('RETAINED_ATOMS_INPUT_PATH_UNSAFE', '$path', {
      reason: 'realpath_outside_allowed_root',
      path: absolutePath,
      realPath: candidateRealPath,
    });
  }
  return {absolutePath, realPath: candidateRealPath, root: rootAbsolute};
};

const ensureDirectoryChain = async (workspaceRoot, targetDirectory, violationCode) => {
  const absoluteTarget = path.resolve(targetDirectory);
  if (!pathIsWithin(workspaceRoot, absoluteTarget)) {
    throwRunner(violationCode, '$outputDirectory', {
      reason: 'directory_outside_workspace',
      path: absoluteTarget,
    }, 'publishPreconditions');
  }
  const relative = path.relative(workspaceRoot, absoluteTarget);
  let cursor = path.resolve(workspaceRoot);
  for (const part of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let entry = await lstatOrNull(cursor);
    if (entry === null) {
      try {
        await mkdir(cursor);
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
      }
      entry = await lstat(cursor);
    }
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      throwRunner(violationCode, '$outputDirectory', {
        reason: 'output_ancestor_not_real_directory',
        path: cursor,
      }, 'publishPreconditions');
    }
  }
  return realpath(absoluteTarget);
};

const outputPathForJob = async (job, configuration) => {
  const outputDirectory = resolveWorkspacePath(configuration.workspaceRoot, job.outputDirectory);
  if (job.outputDirectory !== repoPath(configuration.workspaceRoot, outputDirectory)
      || !pathIsWithin(configuration.outputRoot, outputDirectory)
      || path.resolve(outputDirectory) === path.resolve(configuration.outputRoot)) {
    throwRunner('RETAINED_ATOMS_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'noncanonical_outside_output_root_or_root_itself',
      path: outputDirectory,
    }, 'publishPreconditions');
  }
  await ensureDirectoryChain(
    configuration.workspaceRoot,
    configuration.outputRoot,
    'RETAINED_ATOMS_OUTPUT_PATH_UNSAFE',
  );
  await ensureDirectoryChain(
    configuration.workspaceRoot,
    path.dirname(outputDirectory),
    'RETAINED_ATOMS_OUTPUT_PATH_UNSAFE',
  );
  const outputRootReal = await realpath(configuration.outputRoot);
  const outputParentReal = await realpath(path.dirname(outputDirectory));
  if (!pathIsWithin(outputRootReal, outputParentReal)) {
    throwRunner('RETAINED_ATOMS_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'output_parent_realpath_outside_root',
      path: outputDirectory,
    }, 'publishPreconditions');
  }
  return {outputDirectory, outputRootReal, outputParentReal};
};

const acquireOutputReservation = async (job, configuration) => {
  const output = await outputPathForJob(job, configuration);
  const existingOutput = await lstatOrNull(output.outputDirectory);
  if (existingOutput?.isSymbolicLink()) {
    throwRunner('RETAINED_ATOMS_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'final_path_is_symlink',
      path: output.outputDirectory,
    }, 'publishPreconditions');
  }
  if (existingOutput) {
    throwRunner('RETAINED_ATOMS_OUTPUT_EXISTS', '$.outputDirectory', {
      path: output.outputDirectory,
    }, 'publishPreconditions');
  }
  const lockPath = `${output.outputDirectory}.lock`;
  let lockHandle;
  let workingDirectory = null;
  let publishTemporaryDirectory = null;
  try {
    lockHandle = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throwRunner('RETAINED_ATOMS_OUTPUT_LOCK_CONFLICT', '$.outputDirectory', {
        lockPath,
      }, 'publishPreconditions');
    }
    throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$.outputDirectory.lock', {
      reason: 'lock_creation_failed',
      errorCode: error?.code ?? null,
      message: error instanceof Error ? error.message : String(error),
    }, 'publishPreconditions');
  }
  try {
    const ownerToken = configuration.randomUUID();
    const owner = {
      schemaVersion: 'presentation-retained-source-atoms-output-lock-v001',
      ownerToken,
      outputDirectory: repoPath(configuration.workspaceRoot, output.outputDirectory),
    };
    const ownerBytes = Buffer.from(`${JSON.stringify(owner, null, 2)}\n`);
    await lockHandle.writeFile(ownerBytes);
    await lockHandle.sync();
    const basename = path.basename(output.outputDirectory);
    workingDirectory = await mkdtemp(path.join(output.outputParentReal, `.${basename}.work-`));
    publishTemporaryDirectory = await mkdtemp(
      path.join(output.outputParentReal, `.${basename}.publish-tmp-`),
    );
    const [lockRealPath, workingRealPath, publishTemporaryRealPath] = await Promise.all([
      realpath(lockPath),
      realpath(workingDirectory),
      realpath(publishTemporaryDirectory),
    ]);
    return {
      ...output,
      lockHandle,
      lockPath,
      ownerToken,
      ownerBytesSha256: sha256Bytes(ownerBytes),
      workingDirectory,
      publishTemporaryDirectory,
      lockRealPath,
      workingRealPath,
      publishTemporaryRealPath,
    };
  } catch (error) {
    await lockHandle.close().catch(() => {});
    const wrapped = error instanceof RetainedAtomsRunnerError
      ? error
      : new RetainedAtomsRunnerError(
        'RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED',
        '$.outputDirectory',
        {
          reason: 'reservation_workspace_creation_failed',
          errorCode: error?.code ?? null,
          message: error instanceof Error ? error.message : String(error),
        },
        'publishPreconditions',
      );
    wrapped.retainedReservation = {
      ...output,
      lockHandle: null,
      lockPath,
      workingDirectory,
      publishTemporaryDirectory,
    };
    throw wrapped;
  }
};

const retainedPaths = (reservation, workspaceRoot) => ({
  workingDirectory: reservation?.workingDirectory
    ? repoPath(workspaceRoot, reservation.workingDirectory) : null,
  publishTemporaryDirectory: reservation?.publishTemporaryDirectory
    ? repoPath(workspaceRoot, reservation.publishTemporaryDirectory) : null,
  lockFile: reservation?.lockPath ? repoPath(workspaceRoot, reservation.lockPath) : null,
});

const makeFailureChecks = (failureEntries, passedChecks = []) => Object.fromEntries(
  PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.map((name) => {
    const violationCodes = [...new Set(failureEntries
      .filter((entry) => entry.checkName === name)
      .map((entry) => entry.violation.code))];
    if (violationCodes.length > 0) return [name, {status: 'failed', violationCodes}];
    if (passedChecks.includes(name)) return [name, {status: 'passed', violationCodes: []}];
    return [name, {status: 'not_run_with_upstream_failure', violationCodes: []}];
  }),
);

const failureResult = (failureEntries, reservation, configuration, passedChecks = []) => ({
  status: 'failed',
  violations: failureEntries.map(({violation}) => violation),
  checks: makeFailureChecks(failureEntries, passedChecks),
  retainedPaths: retainedPaths(reservation, configuration.workspaceRoot),
});

const checkNameForViolation = (code) => {
  if (['RETAINED_ATOMS_JOB_INVALID', 'RETAINED_ATOMS_JOB_FILE_MISMATCH'].includes(code)) {
    return 'jobBinding';
  }
  if (code === 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH') return 'implementationBinding';
  if (code === 'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH') return 'expectedProjection';
  if (code === 'RETAINED_ATOMS_INPUT_PATH_UNSAFE') return 'publishPreconditions';
  if (['RETAINED_ATOMS_INPUT_HASH_MISMATCH',
    'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED',
    'RETAINED_ATOMS_BUILD_FAILED'].includes(code)) return 'hashGraph';
  if (['RETAINED_ATOMS_ASSEMBLY_INVALID', 'RETAINED_ATOMS_APPROVAL_INVALID',
    'RETAINED_ATOMS_UNRESOLVED_EDITS'].includes(code)) return 'approvalBinding';
  if (code.startsWith('RETAINED_ATOMS_BASE_MEDIA_')) return 'baseMediaBinding';
  if (['RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH',
    'RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID'].includes(code)) return 'sourceIdentityBinding';
  if (['RETAINED_ATOMS_STT_INCOMPLETE', 'RETAINED_ATOMS_STT_COUNT_MISMATCH'].includes(code)) {
    return 'sttCompleteness';
  }
  if (code === 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH') return 'sttCrossCheck';
  if (['RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH',
    'RETAINED_ATOMS_GROUPING_INVALID'].includes(code)) return 'candidateGrouping';
  if (['RETAINED_ATOMS_SEGMENT_INVALID', 'RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP',
    'RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH', 'RETAINED_ATOMS_EMPTY'].includes(code)) {
    return 'segmentContainment';
  }
  if (code === 'RETAINED_ATOMS_RAW_CONTRACT_INVALID') return 'rawAtomContract';
  if (code === 'RETAINED_ATOMS_HASH_GRAPH_INVALID') return 'hashGraph';
  if (code.startsWith('RETAINED_ATOMS_OUTPUT_')
      || code.startsWith('RETAINED_ATOMS_PUBLISH_')
      || code === 'RETAINED_ATOMS_ATOMIC_COMMIT_FAILED') return 'publishPreconditions';
  return 'hashGraph';
};

const orderedFailureEntries = (entries) => entries
  .map((entry, index) => ({...entry, originalIndex: index}))
  .sort((left, right) => {
    const leftOrder = PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES
      .indexOf(left.violation.code);
    const rightOrder = PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES
      .indexOf(right.violation.code);
    return leftOrder - rightOrder || left.originalIndex - right.originalIndex;
  })
  .map(({originalIndex, ...entry}) => entry);

const failureEntriesFromError = (error) => {
  if (Array.isArray(error?.runnerFailureEntries) && error.runnerFailureEntries.length > 0) {
    return error.runnerFailureEntries.map(({violation, checkName}) => ({
      violation,
      checkName: isNonEmptyString(checkName)
        ? checkName : checkNameForViolation(violation.code),
    }));
  }
  if (Array.isArray(error?.runnerViolations) && error.runnerViolations.length > 0) {
    return error.runnerViolations.map((violation) => ({
      violation,
      checkName: checkNameForViolation(violation.code),
    }));
  }
  if (error instanceof RetainedAtomsRunnerError) {
    return [{
      violation: error.violation,
      checkName: isNonEmptyString(error.checkName)
        ? error.checkName : checkNameForViolation(error.violation.code),
    }];
  }
  return null;
};

const throwCollectedRunnerFailures = (entries, stage) => {
  const ordered = orderedFailureEntries(entries);
  const error = new Error(`multiple retained-source-atoms failures during ${stage}`);
  error.runnerFailureEntries = ordered;
  error.runnerViolations = ordered.map(({violation}) => violation);
  throw error;
};

const validateInjectedJobBinding = (input) => {
  if (!isObject(input)
      || !isNonEmptyString(input.jobPath)
      || !Buffer.isBuffer(input.jobBytes)
      || !SHA256_PATTERN.test(input.jobFileSha256)
      || !isObject(input.job)) {
    throwRunner('RETAINED_ATOMS_JOB_FILE_MISMATCH', '$job', {
      reason: 'job_path_bytes_hash_and_parsed_object_are_all_required',
    }, 'jobBinding');
  }
  const actualSha256 = sha256Bytes(input.jobBytes);
  if (actualSha256 !== input.jobFileSha256) {
    throwRunner('RETAINED_ATOMS_JOB_FILE_MISMATCH', '$job.fileSha256', {
      expected: input.jobFileSha256,
      actual: actualSha256,
    }, 'jobBinding');
  }
  const parsed = readJsonBuffer(input.jobBytes, '$job.bytes', 'RETAINED_ATOMS_JOB_FILE_MISMATCH');
  if (!sameJsonValue(parsed, input.job)) {
    throwRunner('RETAINED_ATOMS_JOB_FILE_MISMATCH', '$job.value', {
      reason: 'injected_object_differs_from_job_bytes',
    }, 'jobBinding');
  }
};

const tokenizeModuleSource = (source) => {
  const tokens = [];
  let index = 0;
  const isIdentifierStart = (character) => /[A-Za-z_$]/.test(character ?? '');
  const isIdentifierPart = (character) => /[A-Za-z0-9_$]/.test(character ?? '');
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      index += 2;
      while (index < source.length && !['\n', '\r'].includes(source[index])) index += 1;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      index = commentEnd === -1 ? source.length : commentEnd + 2;
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      const start = index;
      let value = '';
      let escaped = false;
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') {
          escaped = true;
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        value += source[index];
        index += 1;
      }
      tokens.push({type: 'string', value, escaped, start});
      continue;
    }
    if (character === '`') {
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2;
          continue;
        }
        if (source[index] === '`') {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (isIdentifierStart(character)) {
      const start = index;
      index += 1;
      while (index < source.length && isIdentifierPart(source[index])) index += 1;
      tokens.push({type: 'identifier', value: source.slice(start, index), start});
      continue;
    }
    tokens.push({type: 'punctuator', value: character, start: index});
    index += 1;
  }
  return tokens;
};

const parseStaticModuleSpecifiers = (source, role) => {
  const tokens = tokenizeModuleSource(source);
  const specifiers = [];
  const addSpecifier = (token) => {
    if (!token || token.type !== 'string' || token.escaped) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${role}`, {
        reason: token?.escaped
          ? 'escaped_static_module_specifier_is_forbidden'
          : 'static_module_specifier_is_not_a_string_literal',
      }, 'implementationBinding');
    }
    specifiers.push(token.value);
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier' || token.value !== 'import') continue;
    if (tokens[index - 1]?.value === '.') continue;
    const next = tokens[index + 1];
    if (next?.value === '.') continue;
    if (next?.value === '(') {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${role}`, {
        reason: 'dynamic_module_loading_is_forbidden',
      }, 'implementationBinding');
    }
    if (next?.type === 'string') {
      addSpecifier(next);
      index += 1;
      continue;
    }
    let found = false;
    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const current = tokens[cursor];
      if (current.value === ';'
          || (current.type === 'identifier' && ['import', 'export'].includes(current.value))) {
        break;
      }
      if (current.type === 'identifier' && current.value === 'from') {
        addSpecifier(tokens[cursor + 1]);
        index = cursor + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${role}`, {
        reason: 'static_import_specifier_not_found',
        sourceOffset: token.start,
      }, 'implementationBinding');
    }
  }
  return specifiers;
};

export const validatePresentationRetainedSourceAtomsSourceDependenciesV001 = ({
  coreSource,
  runnerSource,
  corePath,
  runnerPath,
}) => {
  if (typeof coreSource !== 'string'
      || typeof runnerSource !== 'string'
      || !isNonEmptyString(corePath)
      || !isNonEmptyString(runnerPath)) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files', {
      reason: 'source_dependency_inspection_input_invalid',
    }, 'implementationBinding');
  }
  const forbiddenFactoryName = ['create', 'Require'].join('');
  const moduleGap = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*`;
  const dynamicModulePattern = new RegExp(String.raw`\bimport${moduleGap}\(`);
  const factoryPattern = new RegExp(String.raw`\b${forbiddenFactoryName}\b`);
  const inspect = (source, role) => {
    if (dynamicModulePattern.test(source) || factoryPattern.test(source)) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${role}`, {
        reason: 'dynamic_module_loading_is_forbidden',
      }, 'implementationBinding');
    }
    return parseStaticModuleSpecifiers(source, role)
      .filter((specifier) => !specifier.startsWith('node:'));
  };
  const coreProjectImports = inspect(coreSource, 'core');
  const runnerProjectImports = inspect(runnerSource, 'runner');
  if (coreProjectImports.length !== 0) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files.core', {
      reason: 'core_has_project_runtime_dependency',
      projectImports: coreProjectImports,
    }, 'implementationBinding');
  }
  if (runnerProjectImports.length !== 1) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files.runner', {
      reason: 'runner_project_runtime_dependency_count_mismatch',
      projectImports: runnerProjectImports,
    }, 'implementationBinding');
  }
  if (!runnerProjectImports[0].startsWith('.')
      && !runnerProjectImports[0].startsWith('/')
      && !runnerProjectImports[0].startsWith('file:')) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files.runner', {
      reason: 'runner_project_dependency_is_not_a_file_reference',
      projectImport: runnerProjectImports[0],
    }, 'implementationBinding');
  }
  const importedCorePath = fileURLToPath(new URL(runnerProjectImports[0], pathToFileURL(runnerPath)));
  if (path.resolve(importedCorePath) !== path.resolve(corePath)) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files.runner', {
      reason: 'runner_project_dependency_is_not_loaded_core',
      importedPath: importedCorePath,
      loadedCorePath: corePath,
    }, 'implementationBinding');
  }
  return {
    status: 'passed',
    coreProjectImports,
    runnerProjectImports,
    resolvedRunnerProjectImportPath: path.resolve(importedCorePath),
  };
};

const inspectImplementationBinding = async (job, configuration) => {
  const loadedCorePath = await realpath(fileURLToPath(PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL));
  const loadedRunnerPath = await realpath(MODULE_PATH);
  if (await realpath(configuration.coreModulePath) !== loadedCorePath
      || await realpath(configuration.runnerModulePath) !== loadedRunnerPath) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementationBinding.files', {
      reason: 'configured_module_path_differs_from_loaded_module_url',
    }, 'implementationBinding');
  }
  const rolePaths = {core: loadedCorePath, runner: loadedRunnerPath};
  const files = [];
  const snapshots = [];
  for (const binding of job.implementationBinding.files) {
    const actualPath = rolePaths[binding.role];
    const declaredPath = resolveWorkspacePath(configuration.workspaceRoot, binding.path);
    let inspectedDeclaredPath = null;
    try {
      inspectedDeclaredPath = await inspectPathWithinRoots(
        declaredPath,
        [configuration.workspaceRoot],
        {ancestryRoot: configuration.workspaceRoot},
      );
    } catch (error) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${binding.role}`, {
        reason: 'declared_implementation_path_is_not_a_real_regular_file',
        declaredPath,
        causeCode: error?.violation?.code ?? null,
      }, 'implementationBinding');
    }
    if (path.resolve(declaredPath) !== actualPath
        || inspectedDeclaredPath.realPath !== actualPath) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${binding.role}`, {
        reason: 'declared_path_differs_from_loaded_module_url',
        declaredPath,
        loadedPath: actualPath,
      }, 'implementationBinding');
    }
    const bytes = await readFile(actualPath);
    const actualFileSha256 = sha256Bytes(bytes);
    if (actualFileSha256 !== binding.fileSha256) {
      throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementationBinding.files.${binding.role}`, {
        expected: binding.fileSha256,
        actual: actualFileSha256,
      }, 'implementationBinding');
    }
    files.push({
      role: binding.role,
      path: repoPath(configuration.workspaceRoot, actualPath),
      expectedFileSha256: binding.fileSha256,
      actualFileSha256,
    });
    snapshots.push({
      role: `implementation:${binding.role}`,
      absolutePath: actualPath,
      realPath: actualPath,
      fileSha256: actualFileSha256,
      roots: [configuration.workspaceRoot],
      ancestryRoot: configuration.workspaceRoot,
      stream: false,
    });
    if (binding.role === 'core') snapshots.at(-1).bytes = bytes;
    if (binding.role === 'runner') snapshots.at(-1).bytes = bytes;
  }
  validatePresentationRetainedSourceAtomsSourceDependenciesV001({
    coreSource: snapshots.find((entry) => entry.role === 'implementation:core').bytes.toString('utf8'),
    runnerSource: snapshots.find((entry) => entry.role === 'implementation:runner').bytes.toString('utf8'),
    corePath: loadedCorePath,
    runnerPath: loadedRunnerPath,
  });
  const resolvedNodePath = await realpath(process.execPath);
  const nodeStat = await stat(resolvedNodePath);
  if (!nodeStat.isFile()) {
    throwRunner('RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$runtime.node', {
      reason: 'resolved_node_is_not_regular_file',
      path: resolvedNodePath,
    }, 'implementationBinding');
  }
  return {
    implementation: {
      files,
      runtime: {
        resolvedNodePath,
        nodeFileSha256: await fileSha256Streaming(resolvedNodePath),
        nodeVersion: process.version,
        bindingRole: 'diagnostic-not-pass-fail',
      },
    },
    snapshots,
  };
};

const readBoundJsonInput = async ({
  role,
  reference,
  configuration,
  parentPath = null,
  relativeToParent = false,
}) => {
  if (!isObject(reference)
      || !isNonEmptyString(reference.path)
      || !SHA256_PATTERN.test(reference.fileSha256)) {
    throwRunner('RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `$.inputs.${role}`, {
      reason: 'path_hash_reference_invalid',
    }, checkNameForViolation('RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED'));
  }
  const absolutePath = relativeToParent && !path.isAbsolute(reference.path)
    ? path.resolve(path.dirname(parentPath), reference.path)
    : resolveWorkspacePath(configuration.workspaceRoot, reference.path);
  const inspected = await inspectPathWithinRoots(
    absolutePath,
    [configuration.inputJsonRoot],
    {ancestryRoot: configuration.workspaceRoot},
  );
  const bytes = await readFile(inspected.absolutePath);
  const fileSha256 = sha256Bytes(bytes);
  if (fileSha256 !== reference.fileSha256) {
    throwRunner('RETAINED_ATOMS_INPUT_HASH_MISMATCH', `$.inputs.${role}`, {
      expected: reference.fileSha256,
      actual: fileSha256,
      path: repoPath(configuration.workspaceRoot, inspected.absolutePath),
    }, checkNameForViolation('RETAINED_ATOMS_INPUT_HASH_MISMATCH'));
  }
  const value = readJsonBuffer(bytes, `$.inputs.${role}`);
  const schemaIdentity = value?.schemaVersion ?? value?.kind;
  if (!isObject(value) || !isNonEmptyString(schemaIdentity)) {
    throwRunner('RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `$.inputs.${role}`, {
      reason: 'json_artifact_requires_schema_version_or_kind',
    }, checkNameForViolation('RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED'));
  }
  return {
    record: {
      role,
      path: repoPath(configuration.workspaceRoot, inspected.absolutePath),
      fileSha256,
      schemaVersion: schemaIdentity,
      value,
    },
    snapshot: {
      role,
      absolutePath: inspected.absolutePath,
      realPath: inspected.realPath,
      fileSha256,
      roots: [configuration.inputJsonRoot],
      ancestryRoot: configuration.workspaceRoot,
      stream: false,
    },
  };
};

const readBoundMediaInput = async ({role, reference, parentPath, configuration}) => {
  if (!isObject(reference)
      || !isNonEmptyString(reference.path)
      || !SHA256_PATTERN.test(reference.fileSha256)) {
    throwRunner('RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `$.expandedInputs.${role}`, {
      reason: 'media_path_hash_reference_invalid',
    }, 'baseMediaBinding');
  }
  const absolutePath = path.isAbsolute(reference.path)
    ? path.resolve(reference.path)
    : reference.path.includes('/')
      ? resolveWorkspacePath(configuration.workspaceRoot, reference.path)
      : path.resolve(path.dirname(parentPath), reference.path);
  const inspected = await inspectPathWithinRoots(
    absolutePath,
    configuration.sourceMediaRoots,
    {ancestryRoot: configuration.workspaceRoot},
  );
  const fileSha256 = await fileSha256Streaming(inspected.absolutePath);
  if (fileSha256 !== reference.fileSha256) {
    throwRunner('RETAINED_ATOMS_INPUT_HASH_MISMATCH', `$.expandedInputs.${role}`, {
      expected: reference.fileSha256,
      actual: fileSha256,
      path: repoPath(configuration.workspaceRoot, inspected.absolutePath),
    }, 'baseMediaBinding');
  }
  return {
    record: {
      role,
      path: repoPath(configuration.workspaceRoot, inspected.absolutePath),
      fileSha256,
      schemaVersion: null,
      value: null,
    },
    snapshot: {
      role,
      absolutePath: inspected.absolutePath,
      realPath: inspected.realPath,
      fileSha256,
      roots: configuration.sourceMediaRoots,
      ancestryRoot: configuration.workspaceRoot,
      stream: true,
    },
  };
};

const loadDirectInputs = async (job, configuration) => {
  const records = [];
  const snapshots = [];
  const failures = [];
  for (const role of DIRECT_INPUT_ROLES) {
    try {
      const loaded = await readBoundJsonInput({
        role,
        reference: job.inputs[role],
        configuration,
      });
      records.push(loaded.record);
      snapshots.push(loaded.snapshot);
    } catch (error) {
      const entries = failureEntriesFromError(error);
      if (entries === null) throw error;
      failures.push(...entries);
    }
  }
  if (failures.length > 0) throwCollectedRunnerFailures(failures, 'direct-input-loading');
  return {records, snapshots};
};

const expandedReferences = (directMap) => ({
  sttManifest: directMap.sourceIdentity?.stt?.manifest,
  transcript: directMap.sourceIdentity?.stt?.transcript,
  wordTimestamps: directMap.sourceIdentity?.stt?.wordTimestamps,
  mediaEquivalence: directMap.sourceIdentity?.mediaEquivalence,
  trustedArtifactSummary: directMap.formalizationReceipt?.references?.trustedArtifactSummary,
  basisEditPlan: directMap.candidateManifest?.references?.basisEditPlan,
  baseMedia: directMap.baseMediaGenerationManifest?.outputs?.baseMedia,
});

const loadExpandedInputs = async (directInputs, configuration) => {
  const directMap = Object.fromEntries(directInputs.map(({role, value}) => [role, value]));
  const directPathMap = Object.fromEntries(directInputs.map(({role, path}) => [
    role,
    resolveWorkspacePath(configuration.workspaceRoot, path),
  ]));
  const references = expandedReferences(directMap);
  const records = [];
  const snapshots = [];
  const failures = [];
  for (const role of EXPANDED_INPUT_ROLES) {
    try {
      const loaded = role === 'baseMedia'
        ? await readBoundMediaInput({
          role,
          reference: references[role],
          parentPath: directPathMap.baseMediaGenerationManifest,
          configuration,
        })
        : await readBoundJsonInput({
          role,
          reference: references[role],
          configuration,
        });
      records.push(loaded.record);
      snapshots.push(loaded.snapshot);
    } catch (error) {
      const entries = failureEntriesFromError(error);
      if (entries === null) throw error;
      failures.push(...entries);
    }
  }
  if (failures.length > 0) throwCollectedRunnerFailures(failures, 'expanded-input-loading');
  return {records, snapshots};
};

const verifySnapshotUnchanged = async (snapshot) => {
  const mismatchCode = snapshot.role === 'job'
    ? 'RETAINED_ATOMS_JOB_FILE_MISMATCH'
    : snapshot.role.startsWith('implementation:')
      ? 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH'
      : 'RETAINED_ATOMS_INPUT_HASH_MISMATCH';
  let inspected;
  try {
    inspected = await inspectPathWithinRoots(snapshot.absolutePath, snapshot.roots, {
      ancestryRoot: snapshot.ancestryRoot,
    });
  } catch (error) {
    const code = snapshot.role === 'job'
      ? 'RETAINED_ATOMS_JOB_FILE_MISMATCH'
      : snapshot.role.startsWith('implementation:')
        ? 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH'
        : 'RETAINED_ATOMS_INPUT_PATH_UNSAFE';
    throwRunner(code, '$publish.inputs', {
      reason: 'path_contract_changed',
      role: snapshot.role,
      causeCode: error?.violation?.code ?? null,
    }, checkNameForViolation(code));
  }
  if (inspected.realPath !== snapshot.realPath) {
    const code = snapshot.role === 'job' || snapshot.role.startsWith('implementation:')
      ? mismatchCode
      : 'RETAINED_ATOMS_INPUT_PATH_UNSAFE';
    throwRunner(code, '$publish.inputs', {
      reason: 'input_realpath_changed',
      role: snapshot.role,
      expected: snapshot.realPath,
      actual: inspected.realPath,
    }, checkNameForViolation(code));
  }
  const actual = snapshot.stream
    ? await fileSha256Streaming(snapshot.absolutePath)
    : sha256Bytes(await readFile(snapshot.absolutePath));
  if (actual !== snapshot.fileSha256) {
    throwRunner(mismatchCode, '$publish.inputs', {
      reason: 'input_bytes_changed',
      role: snapshot.role,
      expected: snapshot.fileSha256,
      actual,
    }, checkNameForViolation(mismatchCode));
  }
};

const verifyOutputReservation = async (reservation, configuration) => {
  if (await lstatOrNull(reservation.outputDirectory)) {
    throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$.outputDirectory', {
      reason: 'final_directory_appeared_before_publish',
    }, 'publishPreconditions');
  }
  const topology = await Promise.all([
    inspectPathWithinRoots(
      configuration.outputRoot,
      [configuration.workspaceRoot],
      {kind: 'directory', ancestryRoot: configuration.workspaceRoot},
    ),
    inspectPathWithinRoots(
      path.dirname(reservation.outputDirectory),
      [configuration.workspaceRoot],
      {kind: 'directory', ancestryRoot: configuration.workspaceRoot},
    ),
    inspectPathWithinRoots(
      reservation.lockPath,
      [configuration.workspaceRoot],
      {ancestryRoot: configuration.workspaceRoot},
    ),
    inspectPathWithinRoots(
      reservation.workingDirectory,
      [configuration.workspaceRoot],
      {kind: 'directory', ancestryRoot: configuration.workspaceRoot},
    ),
    inspectPathWithinRoots(
      reservation.publishTemporaryDirectory,
      [configuration.workspaceRoot],
      {kind: 'directory', ancestryRoot: configuration.workspaceRoot},
    ),
  ]).catch((error) => {
    throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$.outputDirectory', {
      reason: 'output_topology_is_not_real_no_symlink_chain',
      causeCode: error?.violation?.code ?? null,
    }, 'publishPreconditions');
  });
  const [outputRoot, outputParent, lock, work, publishTemporary] = topology;
  if (outputRoot.realPath !== reservation.outputRootReal
      || outputParent.realPath !== reservation.outputParentReal
      || lock.realPath !== reservation.lockRealPath
      || work.realPath !== reservation.workingRealPath
      || publishTemporary.realPath !== reservation.publishTemporaryRealPath
      || !pathIsWithin(outputRoot.realPath, outputParent.realPath)) {
    throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$.outputDirectory', {
      reason: 'output_ancestry_changed',
    }, 'publishPreconditions');
  }
  const lockBytes = await readFile(lock.absolutePath);
  if (sha256Bytes(lockBytes) !== reservation.ownerBytesSha256) {
    throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$.outputDirectory.lock', {
      reason: 'lock_ownership_changed',
    }, 'publishPreconditions');
  }
  for (const inspected of [work, publishTemporary]) {
    if (path.dirname(inspected.realPath) !== reservation.outputParentReal) {
      throwRunner('RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED', '$publish.temporaryDirectory', {
        reason: 'temporary_directory_parent_changed',
        path: inspected.absolutePath,
      }, 'publishPreconditions');
    }
  }
};

const validateStagedArtifacts = async (publishTemporaryDirectory, expectedContext) => {
  const entries = (await readdir(publishTemporaryDirectory)).sort();
  if (JSON.stringify(entries) !== JSON.stringify([...SUCCESS_FILE_NAMES].sort())) {
    throwRunner('RETAINED_ATOMS_HASH_GRAPH_INVALID', '$publish.files', {
      expected: [...SUCCESS_FILE_NAMES].sort(),
      actual: entries,
    }, 'hashGraph');
  }
  const buffers = {};
  for (const name of SUCCESS_FILE_NAMES) {
    const filePath = path.join(publishTemporaryDirectory, name);
    const info = await lstat(filePath);
    if (!info.isFile() || info.isSymbolicLink()) {
      throwRunner('RETAINED_ATOMS_HASH_GRAPH_INVALID', `$publish.files.${name}`, {
        reason: 'staged_artifact_not_regular_file',
      }, 'hashGraph');
    }
    buffers[name] = await readFile(filePath);
  }
  const validation = validatePresentationRetainedSourceAtomsPublishedArtifactsV001({
    sourceAtomsBytes: buffers['source-atoms.json'],
    generationManifestBytes: buffers['generation-manifest.json'],
    validationReportBytes: buffers['validation-report.json'],
    expectedContext,
  });
  if (validation.status !== 'passed') {
    const violations = validation.violations?.length > 0
      ? validation.violations
      : [makePresentationRetainedSourceAtomsViolationV001(
        'RETAINED_ATOMS_HASH_GRAPH_INVALID',
        '$publish',
        {reason: 'published_artifact_validation_failed_without_violation'},
      )];
    const error = new Error('staged retained-source-atoms artifacts failed validation');
    error.runnerViolations = violations;
    error.checkName = checkNameForViolation(violations[0].code);
    throw error;
  }
  return validation;
};

const writeFailureReport = async ({jobPath, jobFileSha256, result, configuration}) => {
  await ensureDirectoryChain(
    configuration.workspaceRoot,
    configuration.failureRoot,
    'RETAINED_ATOMS_OUTPUT_PATH_UNSAFE',
  );
  const failureId = configuration.randomUUID();
  const finalPath = path.join(configuration.failureRoot, `${failureId}.json`);
  const temporaryPath = path.join(configuration.failureRoot, `.${failureId}.tmp`);
  if (await lstatOrNull(finalPath)) return null;
  const violations = result.violations ?? [];
  const report = {
    schemaVersion: 'presentation-retained-source-atoms-failure-report-v001',
    failureId,
    status: 'failed',
    job: {
      path: repoPath(configuration.workspaceRoot, resolveWorkspacePath(configuration.workspaceRoot, jobPath)),
      fileSha256: jobFileSha256,
    },
    violationsCanonicalSha256: sha256Bytes(Buffer.from(canonicalJsonV001(violations))),
    violations,
    checks: result.checks,
    retainedPaths: result.retainedPaths,
  };
  const bytes = serializeJsonFileV001(report);
  let handle;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await configuration.rename(temporaryPath, finalPath);
    return repoPath(configuration.workspaceRoot, finalPath);
  } catch {
    if (handle) await handle.close().catch(() => {});
    return null;
  }
};

const finishFailedExecution = async ({
  error,
  input,
  reservation,
  configuration,
  passedChecks = [],
}) => {
  const failureEntries = orderedFailureEntries(failureEntriesFromError(error) ?? [{
    violation: makePresentationRetainedSourceAtomsViolationV001(
      'RETAINED_ATOMS_BUILD_FAILED',
      '$execution',
      {message: error instanceof Error ? error.message : String(error)},
    ),
    checkName: 'hashGraph',
  }]);
  const result = failureResult(failureEntries, reservation, configuration, passedChecks);
  const failureReportPath = await writeFailureReport({
    jobPath: input.jobPath,
    jobFileSha256: input.jobFileSha256,
    result,
    configuration,
  }).catch(() => null);
  return {
    exitCode: 1,
    result,
    failureReportPath,
    outputDirectory: reservation?.outputDirectory
      ? repoPath(configuration.workspaceRoot, reservation.outputDirectory) : null,
  };
};

/**
 * テスト用の厳密入口。jobPathだけでなく、そのpathから読んだ同一bytes・SHA・parse値を全て要求する。
 * production CLIはこの関数を直接公開入口として使わず、下のjob file入口から4点を組み立てる。
 */
export const executePresentationRetainedSourceAtomsJobV001 = async (input, context = {}) => {
  const configuration = runnerConfiguration(context);
  let reservation = null;
  let passedChecks = [];
  try {
    validateInjectedJobBinding(input);
    const jobInspection = await inspectPathWithinRoots(
      resolveWorkspacePath(configuration.workspaceRoot, input.jobPath),
      [configuration.inputJsonRoot],
      {ancestryRoot: configuration.workspaceRoot},
    );
    const currentJobBytes = await readFile(jobInspection.absolutePath);
    if (!currentJobBytes.equals(input.jobBytes)
        || sha256Bytes(currentJobBytes) !== input.jobFileSha256) {
      throwRunner('RETAINED_ATOMS_JOB_FILE_MISMATCH', '$job.path', {
        reason: 'job_file_differs_from_injected_bytes',
      }, 'jobBinding');
    }
    const jobValidation = validatePresentationRetainedSourceAtomsJobV001(input.job);
    if (jobValidation.status !== 'passed') {
      const result = {
        status: 'failed',
        violations: jobValidation.violations,
        checks: jobValidation.checks ?? makeFailureChecks(
          jobValidation.violations.map((violation) => ({
            violation,
            checkName: 'jobBinding',
          })),
        ),
        retainedPaths: retainedPaths(null, configuration.workspaceRoot),
      };
      const failureReportPath = await writeFailureReport({
        jobPath: input.jobPath,
        jobFileSha256: input.jobFileSha256,
        result,
        configuration,
      }).catch(() => null);
      return {exitCode: 1, result, failureReportPath, outputDirectory: null};
    }
    passedChecks = ['jobBinding'];
    reservation = await acquireOutputReservation(input.job, configuration);
    const boundImplementation = await inspectImplementationBinding(input.job, configuration);
    passedChecks.push('implementationBinding');
    const direct = await loadDirectInputs(input.job, configuration);
    const expanded = await loadExpandedInputs(direct.records, configuration);
    const runtimeInput = {
      job: input.job,
      jobBinding: {
        path: repoPath(configuration.workspaceRoot, jobInspection.absolutePath),
        fileSha256: input.jobFileSha256,
      },
      implementation: {
        approvedGitCommit: input.job.implementationBinding.gitCommit,
        ...boundImplementation.implementation,
      },
      directInputs: direct.records,
      expandedInputs: expanded.records,
    };
    await configuration.hooks.beforeBuild?.(runtimeInput);
    const built = buildPresentationRetainedSourceAtomsV001(runtimeInput);
    if (built.status !== 'passed') {
      const result = {
        ...built,
        retainedPaths: retainedPaths(reservation, configuration.workspaceRoot),
      };
      await reservation.lockHandle.close();
      reservation.lockHandle = null;
      const failureReportPath = await writeFailureReport({
        jobPath: input.jobPath,
        jobFileSha256: input.jobFileSha256,
        result,
        configuration,
      }).catch(() => null);
      return {
        exitCode: 1,
        result,
        failureReportPath,
        outputDirectory: repoPath(configuration.workspaceRoot, reservation.outputDirectory),
      };
    }
    passedChecks = PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.filter(
      (name) => name !== 'publishPreconditions',
    );
    const serialized = built.serialized ?? {
      sourceAtomsBytes: serializeJsonFileV001(built.sourceAtoms),
      generationManifestBytes: serializeJsonFileV001(
        built.generationManifest,
      ),
      validationReportBytes: serializeJsonFileV001(
        built.validationReport,
      ),
    };
    await Promise.all([
      writeFile(
        path.join(reservation.publishTemporaryDirectory, 'source-atoms.json'),
        serialized.sourceAtomsBytes,
        {flag: 'wx'},
      ),
      writeFile(
        path.join(reservation.publishTemporaryDirectory, 'generation-manifest.json'),
        serialized.generationManifestBytes,
        {flag: 'wx'},
      ),
      writeFile(
        path.join(reservation.publishTemporaryDirectory, 'validation-report.json'),
        serialized.validationReportBytes,
        {flag: 'wx'},
      ),
    ]);
    const expectedPublishedContext = {
      sourceAtoms: built.sourceAtoms,
      generationManifest: built.generationManifest,
      validationReport: built.validationReport,
    };
    await validateStagedArtifacts(
      reservation.publishTemporaryDirectory,
      expectedPublishedContext,
    );
    const snapshots = [
      {
        role: 'job',
        absolutePath: jobInspection.absolutePath,
        realPath: jobInspection.realPath,
        fileSha256: input.jobFileSha256,
        roots: [configuration.inputJsonRoot],
        ancestryRoot: configuration.workspaceRoot,
        stream: false,
      },
      ...boundImplementation.snapshots,
      ...direct.snapshots,
      ...expanded.snapshots,
    ];
    await configuration.hooks.beforePrePublishRehash?.({
      jobPath: jobInspection.absolutePath,
      inputPaths: [...direct.snapshots, ...expanded.snapshots].map(({absolutePath}) => absolutePath),
      implementationPaths: boundImplementation.snapshots.map(({absolutePath}) => absolutePath),
      baseMediaPath: expanded.snapshots.find(({role}) => role === 'baseMedia')?.absolutePath ?? null,
      outputDirectory: reservation.outputDirectory,
      publishTemporaryDirectory: reservation.publishTemporaryDirectory,
    });
    for (const snapshot of snapshots) await verifySnapshotUnchanged(snapshot);
    await verifyOutputReservation(reservation, configuration);
    await validateStagedArtifacts(
      reservation.publishTemporaryDirectory,
      expectedPublishedContext,
    );
    await configuration.hooks.beforeAtomicRename?.({
      publishTemporaryDirectory: reservation.publishTemporaryDirectory,
      outputDirectory: reservation.outputDirectory,
    });
    // The test hook is deliberately treated as an untrusted mutation window.
    // Re-establish every publish precondition after it returns so neither an
    // input swap nor a staged/output topology swap can cross the atomic rename.
    for (const snapshot of snapshots) await verifySnapshotUnchanged(snapshot);
    await verifyOutputReservation(reservation, configuration);
    await validateStagedArtifacts(
      reservation.publishTemporaryDirectory,
      expectedPublishedContext,
    );
    try {
      await configuration.rename(
        reservation.publishTemporaryDirectory,
        reservation.outputDirectory,
      );
    } catch (error) {
      throwRunner('RETAINED_ATOMS_ATOMIC_COMMIT_FAILED', '$publish.rename', {
        message: error instanceof Error ? error.message : String(error),
      }, 'publishPreconditions');
    }
    await reservation.lockHandle.close();
    reservation.lockHandle = null;
    return {
      exitCode: 0,
      result: {
        ...built,
        retainedPaths: retainedPaths(reservation, configuration.workspaceRoot),
      },
      failureReportPath: null,
      outputDirectory: repoPath(configuration.workspaceRoot, reservation.outputDirectory),
    };
  } catch (error) {
    if (!reservation && error?.retainedReservation) reservation = error.retainedReservation;
    if (reservation?.lockHandle) {
      await reservation.lockHandle.close().catch(() => {});
      reservation.lockHandle = null;
    }
    return finishFailedExecution({error, input, reservation, configuration, passedChecks});
  }
};

/** production入口。信用できるjob文脈を作れない失敗はexit 2としfailure fileを作らない。 */
export const runPresentationRetainedSourceAtomsJobFileV001 = async (jobPathInput, context = {}) => {
  const configuration = runnerConfiguration(context);
  if (!isNonEmptyString(jobPathInput)) {
    return {
      exitCode: 2,
      result: null,
      failureReportPath: null,
      outputDirectory: null,
      error: new Error('job path is required'),
    };
  }
  let inspected;
  let jobBytes;
  let job;
  try {
    inspected = await inspectPathWithinRoots(
      resolveWorkspacePath(configuration.workspaceRoot, jobPathInput),
      [configuration.inputJsonRoot],
      {ancestryRoot: configuration.workspaceRoot},
    );
    jobBytes = await readFile(inspected.absolutePath);
    job = JSON.parse(jobBytes.toString('utf8'));
  } catch (error) {
    return {
      exitCode: 2,
      result: null,
      failureReportPath: null,
      outputDirectory: null,
      error,
    };
  }
  return executePresentationRetainedSourceAtomsJobV001({
    jobPath: inspected.absolutePath,
    jobBytes,
    jobFileSha256: sha256Bytes(jobBytes),
    job,
  }, context);
};

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(MODULE_PATH);
if (isDirectExecution) {
  const [, , jobPath] = process.argv;
  if (!jobPath || process.argv.length !== 3) {
    console.error(
      '使い方: node run_presentation_retained_source_atoms_job_v001.mjs <presentation-retained-source-atoms-job-v001.json>',
    );
    process.exitCode = 2;
  } else {
    const outcome = await runPresentationRetainedSourceAtomsJobFileV001(jobPath);
    if (outcome.exitCode === 0) {
      console.log(JSON.stringify({
        status: 'passed',
        outputDirectory: outcome.outputDirectory,
      }, null, 2));
    } else if (outcome.exitCode === 1) {
      console.error(JSON.stringify({
        status: 'failed',
        violations: outcome.result?.violations ?? [],
        failureReportPath: outcome.failureReportPath,
      }, null, 2));
    } else {
      console.error(outcome.error instanceof Error ? outcome.error.message : String(outcome.error));
    }
    process.exitCode = outcome.exitCode;
  }
}

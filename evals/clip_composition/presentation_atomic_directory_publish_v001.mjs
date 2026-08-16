import {createHash} from 'node:crypto';
import {constants as fsConstants} from 'node:fs';
import {spawn} from 'node:child_process';
import {
  lstat,
  open,
  readFile,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';

const ADAPTER_ROLE = 'atomic-directory-publisher-adapter-v001';
const NATIVE_ROLE = 'atomic-directory-publisher-native-darwin-arm64-v001';
const SOURCE_ROLE = 'atomic-directory-publisher-native-source-v001';
const ADAPTER_PATH = 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs';
const NATIVE_PATH = 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64';
const SOURCE_PATH = 'evals/clip_composition/presentation_atomic_directory_publish_v001.c';
const REQUIRED_BINDINGS = Object.freeze([
  Object.freeze([ADAPTER_ROLE, ADAPTER_PATH]),
  Object.freeze([NATIVE_ROLE, NATIVE_PATH]),
  Object.freeze([SOURCE_ROLE, SOURCE_PATH]),
]);
const ALLOWED_BINDING_COUNTS = Object.freeze(new Set([11, 19, 36, 41, 51]));
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const OBSERVATION_KEYS = Object.freeze(['exitCode', 'signal', 'stdoutBytes', 'stderrBytes']);
const NATIVE_EXECUTOR_KEYS = Object.freeze([
  'nativeBinaryPath',
  'cwd',
  'parentDirectoryHandle',
  'stagingDirectoryHandle',
  'stagingLeaf',
  'outputLeaf',
]);
const PREPARE_KEYS = Object.freeze([
  'workspaceRoot',
  'stagingRoot',
  'outputRoot',
  'verifiedImplementationBindings',
  'nativeProcessExecutor',
]);
const COMBINED_KEYS = Object.freeze([
  'workspaceRoot',
  'stagingRoot',
  'outputRoot',
  'verifiedImplementationBindings',
]);
const REASON_BY_EXIT = Object.freeze(new Map([
  [20, 'late-target-exists'],
  [21, 'filesystem-unsupported'],
  [22, 'unsafe-path'],
  [23, 'source-invalid'],
  [24, 'cross-device'],
  [25, 'helper-invocation-invalid'],
  [26, 'helper-execution-failed'],
]));

const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;
const safeLeaf = value => typeof value === 'string'
  && value.length > 0
  && value !== '.'
  && value !== '..'
  && !value.includes('/')
  && !value.includes('\\')
  && !value.includes('\0');
const failure = (reason, toolExitCode = null) => Object.freeze({
  status: 'failed',
  reason,
  toolExitCode,
});
const absoluteWithinWorkspace = (workspaceReal, inputPath) => {
  const absolute = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(workspaceReal, inputPath);
  if (absolute !== workspaceReal && !absolute.startsWith(`${workspaceReal}${path.sep}`)) {
    throw Object.assign(new Error(), {reason: 'unsafe-path'});
  }
  return absolute;
};
const workspaceRelative = (workspaceReal, absolute) => path.relative(workspaceReal, absolute)
  .split(path.sep)
  .join('/');
const closeAll = async handles => {
  let failed = false;
  for (const handle of [...handles].reverse()) {
    try {
      await handle.close();
    } catch {
      failed = true;
    }
  }
  return failed;
};
const stableReadRegularFile = async (workspaceReal, relativePath, executable = false) => {
  if (!WORKSPACE_PATH.test(relativePath)) {
    throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
  }
  const absolute = absoluteWithinWorkspace(workspaceReal, relativePath);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) {
    throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
  }
  if (executable && ((before.mode & 0o111n) !== 0o111n)) {
    throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
  }
  const bytes = await readFile(absolute);
  const after = await lstat(absolute, {bigint: true});
  if (!after.isFile()
    || after.isSymbolicLink()
    || !sameIdentity(before, after)
    || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs
    || await realpath(absolute) !== absolute) {
    throw Object.assign(new Error(), {reason: 'helper-execution-failed'});
  }
  return Object.freeze({absolute, fileSha256: sha256(bytes), identity: after});
};
const verifyImplementationBindings = async (workspaceReal, bindings) => {
  if (!dense(bindings) || !ALLOWED_BINDING_COUNTS.has(bindings.length)) {
    throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
  }
  const seenRoles = new Set();
  const seenPaths = new Set();
  for (const binding of bindings) {
    if (!exactKeys(binding, ['role', 'path', 'fileSha256'])
      || typeof binding.role !== 'string'
      || typeof binding.path !== 'string'
      || !SHA256.test(binding.fileSha256)
      || seenRoles.has(binding.role)
      || seenPaths.has(binding.path)) {
      throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
    }
    seenRoles.add(binding.role);
    seenPaths.add(binding.path);
  }
  const observations = [];
  for (const [role, relativePath] of REQUIRED_BINDINGS) {
    const matching = bindings.filter(binding => binding.role === role && binding.path === relativePath);
    if (matching.length !== 1) {
      throw Object.assign(new Error(), {reason: 'helper-invocation-invalid'});
    }
    let observed;
    try {
      observed = await stableReadRegularFile(
        workspaceReal,
        relativePath,
        role === NATIVE_ROLE,
      );
    } catch (error) {
      if (error?.reason === 'helper-invocation-invalid') throw error;
      throw Object.assign(new Error(), {reason: 'helper-execution-failed'});
    }
    if (observed.fileSha256 !== matching[0].fileSha256) {
      throw Object.assign(new Error(), {reason: 'helper-execution-failed'});
    }
    observations.push(Object.freeze({role, path: relativePath, ...observed}));
  }
  return Object.freeze(observations);
};
const validateObservation = input => {
  if (!exactKeys(input, OBSERVATION_KEYS)
    || !(input.exitCode === null || (Number.isSafeInteger(input.exitCode) && input.exitCode >= 0))
    || !(input.signal === null || (typeof input.signal === 'string' && input.signal.length > 0))
    || !Buffer.isBuffer(input.stdoutBytes)
    || !Buffer.isBuffer(input.stderrBytes)) {
    throw new TypeError('invalid atomic helper observation');
  }
};
const validateHandle = value => value !== null
  && typeof value === 'object'
  && Number.isSafeInteger(value.fd)
  && value.fd >= 0
  && typeof value.close === 'function';
const validateNativeExecutorInput = input => {
  if (!exactKeys(input, NATIVE_EXECUTOR_KEYS)
    || typeof input.nativeBinaryPath !== 'string'
    || input.nativeBinaryPath.length === 0
    || typeof input.cwd !== 'string'
    || input.cwd.length === 0
    || !validateHandle(input.parentDirectoryHandle)
    || !validateHandle(input.stagingDirectoryHandle)
    || !safeLeaf(input.stagingLeaf)
    || !safeLeaf(input.outputLeaf)) {
    throw new TypeError('invalid atomic native executor input');
  }
};
const validatePrepareInput = input => {
  if (!exactKeys(input, PREPARE_KEYS)
    || typeof input.workspaceRoot !== 'string'
    || input.workspaceRoot.length === 0
    || typeof input.stagingRoot !== 'string'
    || input.stagingRoot.length === 0
    || typeof input.outputRoot !== 'string'
    || input.outputRoot.length === 0
    || !dense(input.verifiedImplementationBindings)
    || typeof input.nativeProcessExecutor !== 'function') {
    throw new TypeError('invalid atomic directory prepare input');
  }
};
const validateCombinedInput = input => {
  if (!exactKeys(input, COMBINED_KEYS)
    || typeof input.workspaceRoot !== 'string'
    || input.workspaceRoot.length === 0
    || typeof input.stagingRoot !== 'string'
    || input.stagingRoot.length === 0
    || typeof input.outputRoot !== 'string'
    || input.outputRoot.length === 0
    || !dense(input.verifiedImplementationBindings)) {
    throw new TypeError('invalid atomic directory publication input');
  }
};

export function classifyPresentationAtomicDirectoryPublishObservationV001(input) {
  validateObservation(input);
  const validTuple = (input.exitCode === null) !== (input.signal === null);
  if (!validTuple) return failure('helper-execution-failed');
  if (input.stdoutBytes.length !== 0 || input.stderrBytes.length !== 0) {
    return failure(
      'helper-execution-failed',
      input.signal === null && Number.isSafeInteger(input.exitCode) ? input.exitCode : null,
    );
  }
  if (input.signal !== null) return failure('helper-execution-failed');
  if (input.exitCode === 0) return Object.freeze({status: 'published'});
  const reason = REASON_BY_EXIT.get(input.exitCode) ?? 'helper-execution-failed';
  return failure(reason, input.exitCode);
}

export function executePresentationAtomicDirectoryNativeHelperV001(input) {
  validateNativeExecutorInput(input);
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(input.nativeBinaryPath, [input.stagingLeaf, input.outputLeaf], {
        cwd: input.cwd,
        env: {},
        shell: false,
        stdio: [
          'ignore',
          'pipe',
          'pipe',
          input.parentDirectoryHandle.fd,
          input.stagingDirectoryHandle.fd,
        ],
      });
    } catch {
      reject(new Error('atomic helper spawn failed'));
      return;
    }
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutLength = 0;
    let stderrLength = 0;
    let overflow = false;
    const observe = (chunks, kind) => chunk => {
      const bytes = Buffer.from(chunk);
      chunks.push(bytes.subarray(0, Math.max(0, 2 - (kind === 'stdout' ? stdoutLength : stderrLength))));
      if (kind === 'stdout') stdoutLength += bytes.length;
      else stderrLength += bytes.length;
      if (stdoutLength > 1 || stderrLength > 1) {
        overflow = true;
        child.kill('SIGKILL');
      }
    };
    child.stdout.on('data', observe(stdoutChunks, 'stdout'));
    child.stderr.on('data', observe(stderrChunks, 'stderr'));
    child.once('error', () => reject(new Error('atomic helper execution failed')));
    child.once('close', (exitCode, signal) => {
      if (overflow) {
        reject(new Error('atomic helper capture limit exceeded'));
        return;
      }
      resolve(Object.freeze({
        exitCode,
        signal,
        stdoutBytes: Buffer.concat(stdoutChunks),
        stderrBytes: Buffer.concat(stderrChunks),
      }));
    });
  });
}

const prepareInternal = async input => {
  const handles = [];
  let prepared = false;
  try {
    const workspaceLogical = path.resolve(input.workspaceRoot);
    const workspaceBefore = await lstat(workspaceLogical, {bigint: true});
    const workspaceReal = await realpath(workspaceLogical);
    const workspaceAfter = await lstat(workspaceLogical, {bigint: true});
    if (!workspaceBefore.isDirectory()
      || workspaceBefore.isSymbolicLink()
      || !sameIdentity(workspaceBefore, workspaceAfter)
      || workspaceReal !== workspaceLogical) {
      return failure('unsafe-path');
    }
    const outputAbsolute = absoluteWithinWorkspace(workspaceReal, input.outputRoot);
    const stagingAbsolute = absoluteWithinWorkspace(workspaceReal, input.stagingRoot);
    if (`${outputAbsolute}.staging` !== stagingAbsolute) return failure('unsafe-path');
    const parentAbsolute = path.dirname(outputAbsolute);
    if (path.dirname(stagingAbsolute) !== parentAbsolute) return failure('unsafe-path');
    const outputLeaf = path.basename(outputAbsolute);
    const stagingLeaf = path.basename(stagingAbsolute);
    if (!safeLeaf(outputLeaf) || !safeLeaf(stagingLeaf)) return failure('unsafe-path');
    const parentReal = await realpath(parentAbsolute);
    const parentBefore = await lstat(parentAbsolute, {bigint: true});
    if (!parentBefore.isDirectory()
      || parentBefore.isSymbolicLink()
      || parentReal !== parentAbsolute) return failure('unsafe-path');
    let outputExists = false;
    try {
      await lstat(outputAbsolute);
      outputExists = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (outputExists) return failure('late-target-exists');
    let stagingBefore;
    try {
      stagingBefore = await lstat(stagingAbsolute, {bigint: true});
    } catch (error) {
      if (error?.code === 'ENOENT') return failure('source-invalid');
      throw error;
    }
    if (!stagingBefore.isDirectory() || stagingBefore.isSymbolicLink()
      || await realpath(stagingAbsolute) !== stagingAbsolute) return failure('source-invalid');
    await verifyImplementationBindings(workspaceReal, input.verifiedImplementationBindings);
    const directoryFlags = fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW;
    const parentHandle = await open(parentAbsolute, directoryFlags);
    handles.push(parentHandle);
    const stagingHandle = await open(stagingAbsolute, directoryFlags);
    handles.push(stagingHandle);
    const [parentOpened, stagingOpened] = await Promise.all([
      parentHandle.stat({bigint: true}),
      stagingHandle.stat({bigint: true}),
    ]);
    const [parentNow, stagingNow] = await Promise.all([
      lstat(parentAbsolute, {bigint: true}),
      lstat(stagingAbsolute, {bigint: true}),
    ]);
    if (!parentOpened.isDirectory()
      || !stagingOpened.isDirectory()
      || !sameIdentity(parentBefore, parentOpened)
      || !sameIdentity(parentOpened, parentNow)
      || !sameIdentity(stagingBefore, stagingOpened)
      || !sameIdentity(stagingOpened, stagingNow)) {
      throw Object.assign(new Error(), {reason: 'source-invalid'});
    }
    const nativeBinding = input.verifiedImplementationBindings.find(
      binding => binding.role === NATIVE_ROLE && binding.path === NATIVE_PATH,
    );
    const nativeBinaryPath = absoluteWithinWorkspace(workspaceReal, nativeBinding.path);
    let state = 'prepared';
    const runOnce = (kind, argumentCount) => {
      if (argumentCount !== 0 || state !== 'prepared') {
        throw new TypeError('atomic publication handle is one-shot');
      }
      state = kind === 'commit' ? 'committing' : 'cancelling';
      return (async () => {
        let result;
        if (kind === 'cancel') {
          const closeFailed = await closeAll(handles);
          state = 'closed';
          return closeFailed ? failure('helper-execution-failed') : Object.freeze({status: 'cancelled'});
        }
        try {
          const currentParent = await parentHandle.stat({bigint: true});
          const currentStaging = await stagingHandle.stat({bigint: true});
          const currentStagingPath = await lstat(stagingAbsolute, {bigint: true});
          if (!sameIdentity(currentParent, parentOpened)
            || !sameIdentity(currentStaging, stagingOpened)
            || !sameIdentity(currentStagingPath, stagingOpened)) {
            result = failure('helper-execution-failed');
          } else {
            await verifyImplementationBindings(workspaceReal, input.verifiedImplementationBindings);
            const observation = await input.nativeProcessExecutor({
              nativeBinaryPath,
              cwd: workspaceReal,
              parentDirectoryHandle: parentHandle,
              stagingDirectoryHandle: stagingHandle,
              stagingLeaf,
              outputLeaf,
            });
            result = classifyPresentationAtomicDirectoryPublishObservationV001(observation);
          }
        } catch {
          result = failure('helper-execution-failed');
        }
        const closeFailed = await closeAll(handles);
        state = 'closed';
        if (result.status !== 'published' && closeFailed) return failure('helper-execution-failed');
        return result;
      })();
    };
    const commit = function commit() {
      return runOnce('commit', arguments.length);
    };
    const cancel = function cancel() {
      return runOnce('cancel', arguments.length);
    };
    prepared = true;
    return Object.freeze({status: 'prepared', commit, cancel});
  } catch (error) {
    const closeFailed = await closeAll(handles);
    if (closeFailed) return failure('helper-execution-failed');
    return failure(error?.reason ?? 'helper-execution-failed');
  } finally {
    if (!prepared && handles.length === 0) {
      // No descriptor was acquired. This branch intentionally has no side effect.
    }
  }
};

export function preparePresentationDirectoryAtomicPublishV001(input) {
  validatePrepareInput(input);
  return prepareInternal(input);
}

export function publishPresentationDirectoryAtomicallyNoReplaceV001(input) {
  validateCombinedInput(input);
  return (async () => {
    const prepared = await preparePresentationDirectoryAtomicPublishV001({
      workspaceRoot: input.workspaceRoot,
      stagingRoot: input.stagingRoot,
      outputRoot: input.outputRoot,
      verifiedImplementationBindings: input.verifiedImplementationBindings,
      nativeProcessExecutor: executePresentationAtomicDirectoryNativeHelperV001,
    });
    if (prepared.status !== 'prepared') return prepared;
    return prepared.commit();
  })();
}

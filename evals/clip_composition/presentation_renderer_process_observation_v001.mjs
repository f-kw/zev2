import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const evidenceBytes = value => Buffer.from(`${value}\n`, 'utf8');

const observedProcessError = ({message, processResult, spawnErrorCode = null}) => {
  const error = new Error(message);
  Object.defineProperties(error, {
    processResult: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: processResult,
    },
    spawnErrorCode: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: spawnErrorCode,
    },
  });
  return error;
};

export function createPresentationRendererProcessObserverV001({observationDirectory}) {
  if (!path.isAbsolute(observationDirectory)) {
    throw new TypeError('process observation directory must be absolute');
  }
  let sequence = 0;
  const timingRecords = [];

  const run = (command, args, options = {}) => new Promise((resolve, reject) => {
    if (typeof command !== 'string' || command.length === 0 || !Array.isArray(args)) {
      reject(new TypeError('observed process command is invalid'));
      return;
    }
    const label = options.observationLabel;
    if (!LABEL.test(label ?? '')) {
      reject(new TypeError('observed process label is invalid'));
      return;
    }
    sequence += 1;
    const processStarted = performance.now();
    const recordSequence = sequence;
    const recordDirectory = path.join(
      observationDirectory,
      `${String(sequence).padStart(4, '0')}-${label}`,
    );
    const stdout = [];
    const stderr = [];
    let finalized = false;

    const persist = async ({code, signal}) => {
      await mkdir(observationDirectory, {recursive: true});
      await mkdir(recordDirectory, {recursive: false});
      await Promise.all([
        writeFile(
          path.join(recordDirectory, 'exit-code.txt'),
          evidenceBytes(code === null ? 'null' : String(code)),
          {flag: 'wx', mode: 0o444},
        ),
        writeFile(
          path.join(recordDirectory, 'stderr.txt'),
          Buffer.concat(stderr),
          {flag: 'wx', mode: 0o444},
        ),
        writeFile(
          path.join(recordDirectory, 'signal.txt'),
          evidenceBytes(signal ?? 'none'),
          {flag: 'wx', mode: 0o444},
        ),
      ]);
      return Object.freeze({
        code,
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        observationDirectory: recordDirectory,
      });
    };

    const finish = async ({code, signal, spawnError = null}) => {
      if (finalized) return;
      finalized = true;
      const childMilliseconds = performance.now() - processStarted;
      const writingStarted = performance.now();
      let result;
      try {
        try {result = await persist({code, signal});} finally {
          timingRecords.push({sequence: recordSequence, label, childMilliseconds,
            evidenceWriteMilliseconds: performance.now() - writingStarted, code, signal,
            spawnFailed: spawnError !== null});
        }
        const allowed = options.allowedExitCodes ?? [0];
        if (spawnError === null && signal === null && allowed.includes(code)) {
          resolve(result);
          return;
        }
        reject(observedProcessError({
          message: spawnError === null
            ? 'observed process did not complete successfully'
            : 'observed process could not be spawned',
          processResult: result,
          spawnErrorCode: typeof spawnError?.code === 'string' ? spawnError.code : null,
        }));
      } catch (error) {
        reject(error);
      }
    };

    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      void finish({code: null, signal: null, spawnError: error});
      return;
    }
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', error => {
      void finish({code: null, signal: null, spawnError: error});
    });
    child.on('close', (code, signal) => {
      void finish({code, signal});
    });
  });

  const getPerformance = () => {
    const records = timingRecords.map(row => ({...row}));
    const byLabel = {};
    for (const row of records) {
      const totals = byLabel[row.label] ??= {processCount: 0, childMilliseconds: 0, evidenceWriteMilliseconds: 0};
      totals.processCount++;
      totals.childMilliseconds += row.childMilliseconds;
      totals.evidenceWriteMilliseconds += row.evidenceWriteMilliseconds;
    }
    return {records, byLabel, meaning: 'child wall time and observation-file write time; nested renderer totals are separate'};
  };
  return Object.freeze({run, getPerformance});
}

import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash, randomUUID} from 'node:crypto';
import {channel} from 'node:diagnostics_channel';
import {rmSync} from 'node:fs';
import {access, link, lstat, mkdtemp, readFile, readdir, rm, unlink} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COMPOSITION_ID = 'PresentationOverlayV001';
const BROWSER_LAUNCH_CONTEXT = new AsyncLocalStorage();
const CHILD_PROCESS_CHANNEL = channel('child_process');
const CHROMIUM_OPTIONS = Object.freeze({
  disableWebSecurity: false,
  enableMultiProcessOnLinux: true,
  gl: null,
  headless: true,
  ignoreCertificateErrors: false,
  userAgent: null,
  darkMode: false,
});

const missing = error => error?.code === 'ENOENT';
const errorText = error => error instanceof Error ? error.message : String(error);
const combineErrors = (error, cleanupError) => new AggregateError(
  [error, cleanupError], `${errorText(error)}; overlay cleanup failed: ${errorText(cleanupError)}`,
);

const assertAbsent = async outputPath => {
  try {
    await lstat(outputPath);
  } catch (error) {
    if (missing(error)) return;
    throw error;
  }
  throw new Error(`overlay output already exists: ${outputPath}`);
};

const loadRuntime = remotionPath => {
  // Resolve through the already installed CLI package, including pnpm's real
  // dependency location. Do not install or download a second renderer runtime.
  const cliRequire = createRequire(createRequire(remotionPath).resolve('@remotion/cli'));
  return {
    ...cliRequire('@remotion/renderer'),
    bundle: cliRequire('@remotion/bundler').bundle,
    parseEnvironment: bytes => cliRequire('dotenv').parse(bytes),
  };
};

const readEnvironment = async (repositoryRoot, runtime) => {
  const inherited = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => key.startsWith('REMOTION_')));
  // Match the existing CLI's first-present .env / .env.local selection.
  for (const name of ['.env', '.env.local']) {
    try {
      return {...inherited, ...runtime.parseEnvironment(await readFile(path.join(repositoryRoot, name)))};
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  return inherited;
};

const inspectPng = async (outputPath, composition) => {
  const stat = await lstat(outputPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('overlay output is not a regular PNG');
  const bytes = await readFile(outputPath);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR'
    || bytes.readUInt32BE(16) !== composition.width
    || bytes.readUInt32BE(20) !== composition.height
    || bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') {
    throw new Error('overlay output PNG dimensions or framing do not match the requested composition');
  }
  return {stat, sha256: createHash('sha256').update(bytes).digest('hex')};
};

/** One bundle and two independent browser series, owned by one render job. */
export function createPresentationOverlayRenderSessionV001({
  repositoryRoot, entryPoint, publicDir, remotionPath, chromiumPath, processObserver,
}) {
  if (![repositoryRoot, entryPoint, publicDir, remotionPath, chromiumPath].every(
    value => typeof value === 'string' && path.isAbsolute(value),
  )) throw new TypeError('overlay session runtime paths must be absolute');
  if (typeof processObserver?.observeOperation !== 'function') {
    throw new TypeError('overlay session operation observer is required');
  }

  const sessionId = randomUUID();
  const browsers = new Map();
  const ownedChildren = new Set();
  let runtime;
  let environment;
  let ownedDirectory = null;
  let bundlePath = null;
  let queue = Promise.resolve();
  let closing = false;
  let failure = null;
  let closePromise = null;
  let cleanupPromise = null;
  let cancelActive = null;
  let requestSequence = 0;
  let signalsAttached = false;

  const assertUsable = () => {
    if (failure !== null) throw new Error(`overlay session failed: ${errorText(failure)}`, {cause: failure});
    if (closing) throw new Error('overlay session is closed');
  };

  const observe = (observationLabel, operationKind, input, callback) => processObserver.observeOperation({
    observationLabel, operationKind,
    input: {sessionId, ...input},
  }, callback);

  const terminateChild = record => {
    const {child} = record;
    if (!Number.isInteger(child.pid) || child.pid <= 0
      || child.exitCode !== null || child.signalCode !== null) return;
    // Remotion launches its browser as a detached process group. Its exact
    // executable and profile argument identify this owned browser, while any
    // short-lived helper captured in the same launch uses only its own handle.
    if (process.platform !== 'win32' && child.spawnfile === chromiumPath
      && child.spawnargs?.some(arg => arg.startsWith('--user-data-dir='))) {
      try { process.kill(-child.pid, 'SIGKILL'); return; }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    child.kill('SIGKILL');
  };

  const captureChild = ({process: child}) => {
    const context = BROWSER_LAUNCH_CONTEXT.getStore();
    if (context?.sessionId !== sessionId) return;
    let resolveExit;
    const record = {child, series: context.series, profileDirectory: null,
      terminationError: null, exited: new Promise(resolve => { resolveExit = resolve; })};
    ownedChildren.add(record);
    const bindProfile = () => {
      const profileArg = child.spawnfile === chromiumPath
        ? child.spawnargs?.find(arg => arg.startsWith('--user-data-dir=')) : null;
      if (!profileArg) return;
      const profileDirectory = profileArg.slice('--user-data-dir='.length);
      if (path.dirname(profileDirectory) === os.tmpdir()
        && path.basename(profileDirectory).startsWith('puppeteer_dev_chrome_profile-')) {
        record.profileDirectory = profileDirectory;
      }
    };
    // The standard Node channel publishes the real handle in its constructor,
    // before pid/spawnargs are populated. The spawn event is the later binding.
    child.once('exit', resolveExit);
    child.once('error', () => {
      bindProfile();
      if (!Number.isInteger(child.pid) || child.pid <= 0) resolveExit();
    });
    child.once('spawn', () => {
      bindProfile();
      if (closing) {
        try { terminateChild(record); } catch (error) { record.terminationError = error; }
      }
    });
  };

  const onExit = () => {
    // Remotion's SIGINT handler exits synchronously. Reclaim only this job's
    // captured launch handles and temporary directories at that final boundary.
    for (const record of ownedChildren) {
      try { terminateChild(record); } catch { /* Exit cannot perform asynchronous recovery. */ }
      if (record.profileDirectory !== null) rmSync(record.profileDirectory, {recursive: true, force: true});
    }
    if (ownedDirectory !== null) rmSync(ownedDirectory, {recursive: true, force: true});
  };
  const onSignal = () => { void close().catch(() => { process.exitCode = 1; }); };
  const attachSignals = () => {
    if (signalsAttached) return;
    signalsAttached = true;
    CHILD_PROCESS_CHANNEL.subscribe(captureChild);
    process.on('exit', onExit);
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
  };
  const detachSignals = () => {
    if (!signalsAttached) return;
    process.removeListener('exit', onExit);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    CHILD_PROCESS_CHANNEL.unsubscribe(captureChild);
    signalsAttached = false;
  };

  const cleanupOperation = async (label, kind, input, callback) => {
    let called = false;
    try {
      await observe(label, kind, input, async () => {
        called = true;
        await callback();
      });
    } catch (error) {
      // Evidence failure must fail the job, but cannot suppress resource cleanup.
      if (!called) {
        try { await callback(); } catch (cleanupError) { throw combineErrors(error, cleanupError); }
      }
      throw error;
    }
  };

  const cleanupResources = () => {
    if (cleanupPromise !== null) return cleanupPromise;
    cleanupPromise = (async () => {
      const errors = [];
      for (const [series, browser] of browsers) {
        try {
          await cleanupOperation('overlay-browser-close', 'browser-close', {
            series, browserId: browser.id ?? null,
          }, () => browser.close({silent: true}));
        } catch (error) { errors.push(error); }
      }
      browsers.clear();
      for (const record of ownedChildren) {
        const {child} = record;
        let reclaimed = false;
        try {
          await cleanupOperation('overlay-browser-process-cleanup', 'browser-process-cleanup', {
            series: record.series, pid: child.pid ?? null, executable: child.spawnfile ?? null,
            arguments: child.spawnargs ?? null, profileDirectory: record.profileDirectory,
            exitCode: child.exitCode, signalCode: child.signalCode,
          }, async () => {
            terminateChild(record);
            if (Number.isInteger(child.pid) && child.pid > 0) await record.exited;
            if (record.profileDirectory !== null) {
              await rm(record.profileDirectory, {recursive: true, force: true});
            }
            reclaimed = true;
            if (record.terminationError !== null) throw record.terminationError;
          });
        } catch (error) { errors.push(error); }
        if (reclaimed) ownedChildren.delete(record);
      }
      if (ownedDirectory !== null) {
        const directory = ownedDirectory;
        try {
          await cleanupOperation('overlay-bundle-remove', 'bundle-remove', {directory}, async () => {
            await rm(directory, {recursive: true, force: true});
            ownedDirectory = null;
            bundlePath = null;
          });
        } catch (error) { errors.push(error); }
      }
      if (ownedDirectory === null && ownedChildren.size === 0) detachSignals();
      if (errors.length > 0) throw new AggregateError(errors, errors.map(errorText).join('; '));
    })();
    return cleanupPromise;
  };

  const prepare = async series => {
    if (runtime === undefined) runtime = loadRuntime(remotionPath);
    if (bundlePath === null) {
      // Match the former CLI's TMPDIR and normal Webpack cache policy. This
      // directory is disposable job state, not an additional persistent cache.
      ownedDirectory = await mkdtemp('/private/tmp/zev-overlay-render-');
      attachSignals();
      environment = await readEnvironment(repositoryRoot, runtime);
      const target = path.join(ownedDirectory, 'bundle');
      await observe('overlay-bundle', 'bundle', {
        repositoryRoot, entryPoint, publicDir, remotionPath, outputDirectory: target,
        enableCaching: true, symlinkPublicDir: true,
      }, async () => {
        bundlePath = await runtime.bundle({
          entryPoint, rootDir: repositoryRoot, publicDir, outDir: target,
          enableCaching: true, symlinkPublicDir: true,
          webpackOverride: config => config,
          publicPath: null, gitSource: null, bufferStateDelayInMilliseconds: null,
          maxTimelineTracks: null, audioLatencyHint: null,
          experimentalClientSideRenderingEnabled: false,
          askAIEnabled: true, keyboardShortcutsEnabled: true, rspack: false,
        });
        if (bundlePath !== target) throw new Error('overlay bundle escaped its owned directory');
      });
      assertUsable();
    }
    if (!browsers.has(series)) {
      await access(chromiumPath);
      await observe('overlay-browser-open', 'browser-open', {
        series, chromiumPath, chromeMode: 'headless-shell', scale: 1,
        chromiumOptions: CHROMIUM_OPTIONS,
      }, async () => {
        const browser = await BROWSER_LAUNCH_CONTEXT.run({sessionId, series}, () =>
          runtime.openBrowser('chrome', {
            browserExecutable: chromiumPath, chromiumOptions: CHROMIUM_OPTIONS,
            chromeMode: 'headless-shell', forceDeviceScaleFactor: 1, logLevel: 'error',
          }));
        browsers.set(series, browser);
        return {browserId: browser.id ?? null};
      });
      assertUsable();
    }
    return browsers.get(series);
  };

  const render = (props, outputPath, {series = 'normal', observationLabel = 'overlay-still'} = {}) => {
    try {
      assertUsable();
      if (series !== 'normal' && series !== 'repeat') throw new TypeError('overlay render series is invalid');
      if (!path.isAbsolute(outputPath)) throw new TypeError('overlay output path must be absolute');
      // CLI --props also crosses JSON. Snapshot at acceptance, before any wait.
      props = JSON.parse(JSON.stringify(props));
    } catch (error) { return Promise.reject(error); }
    const requestId = ++requestSequence;
    const request = queue.then(async () => {
      assertUsable();
      let publishedStat = null;
      try {
        const outputParent = await lstat(path.dirname(outputPath));
        if (!outputParent.isDirectory() || outputParent.isSymbolicLink()) {
          throw new Error('overlay output parent must be an existing regular directory');
        }
        await assertAbsent(outputPath);
        const browser = await prepare(series);
        const {cancelSignal, cancel} = runtime.makeCancelSignal();
        cancelActive = cancel;
        const stagedPath = path.join(ownedDirectory, `${requestId}.png`);
        const result = await observe(observationLabel, 'render-still', {
          requestId, series, browserId: browser.id ?? null, props, outputPath,
          browserProcessIds: [...ownedChildren].filter(record => record.series === series)
            .map(record => record.child.pid).filter(pid => Number.isInteger(pid) && pid > 0),
          stagedPath, remotionPath, chromiumPath, entryPoint, publicDir,
          imageFormat: 'png', frame: 0, scale: 1,
        }, async () => {
          const composition = await runtime.selectComposition({
            serveUrl: bundlePath, id: COMPOSITION_ID, inputProps: props,
            puppeteerInstance: browser, browserExecutable: chromiumPath,
            chromiumOptions: CHROMIUM_OPTIONS, chromeMode: 'headless-shell',
            envVariables: environment, logLevel: 'error',
          });
          assertUsable();
          if (composition.id !== COMPOSITION_ID) throw new Error('overlay composition binding mismatch');
          await runtime.renderStill({
            composition, serveUrl: bundlePath, inputProps: props,
            puppeteerInstance: browser, browserExecutable: chromiumPath,
            chromiumOptions: CHROMIUM_OPTIONS, chromeMode: 'headless-shell',
            envVariables: environment, logLevel: 'error',
            output: stagedPath, overwrite: false, imageFormat: 'png', frame: 0, scale: 1,
            licenseKey: null, cancelSignal,
            onArtifact: () => { throw new Error('overlay renderer produced an unexpected artifact'); },
          });
          assertUsable();
          const ownedEntries = await readdir(ownedDirectory);
          if (ownedEntries.length !== 2 || !ownedEntries.includes('bundle')
            || !ownedEntries.includes(`${requestId}.png`)) {
            throw new Error('overlay renderer outputs do not match the accepted request');
          }
          const png = await inspectPng(stagedPath, composition);
          // A hard link publishes a complete file and refuses an existing output.
          await link(stagedPath, outputPath);
          publishedStat = png.stat;
          await unlink(stagedPath);
          return {outputPath, sha256: png.sha256, series, requestId, sessionId};
        });
        assertUsable();
        return result;
      } catch (error) {
        failure = error;
        closing = true;
        if (publishedStat !== null) {
          try {
            const current = await lstat(outputPath);
            if (current.dev === publishedStat.dev && current.ino === publishedStat.ino) await unlink(outputPath);
          } catch (cleanupError) {
            if (!missing(cleanupError)) error = combineErrors(error, cleanupError);
          }
        }
        try { await cleanupResources(); } catch (cleanupError) { error = combineErrors(error, cleanupError); }
        throw error;
      } finally { cancelActive = null; }
    });
    queue = request.catch(() => {});
    return request;
  };

  const close = () => {
    if (closePromise !== null) return closePromise;
    closing = true;
    cancelActive?.();
    for (const record of ownedChildren) {
      if (!browsers.has(record.series)) {
        try { terminateChild(record); } catch (error) { record.terminationError = error; }
      }
    }
    closePromise = (async () => {
      await queue;
      await cleanupResources();
    })();
    return closePromise;
  };

  return Object.freeze({render, close});
}

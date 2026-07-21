#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {
  PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
  validatePresentationBrowserPlaybackObservationV001,
} from './presentation_source_media_equivalence_v001.mjs';

export const FIRST_REAL_DATA_REVIEW_PAGE_URL_V001 =
  'http://127.0.0.1:4318/review.html';
export const FIRST_REAL_DATA_REVIEW_MEDIA_URL_V001 =
  'http://127.0.0.1:4318/media';
export const FIRST_REAL_DATA_REVIEW_SERVER_CONTRACT_V001 =
  'read-only-get-head-v001';

const EDGE_EXECUTABLE =
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const SEEK_TARGET_MS = 1920260;

const fileSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpPipe {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    child.stdio[4].on('data', (chunk) => this.consume(chunk));
    child.stdio[4].on('error', (error) => this.rejectAll(error));
    child.on('exit', (code, signal) => {
      this.rejectAll(new Error(`Microsoft Edge exited: code=${code}, signal=${signal}`));
    });
  }

  consume(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let separator = this.buffer.indexOf(0);
    while (separator >= 0) {
      const bytes = this.buffer.subarray(0, separator);
      this.buffer = this.buffer.subarray(separator + 1);
      if (bytes.length > 0) {
        const message = JSON.parse(bytes.toString('utf8'));
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
          else pending.resolve(message.result ?? {});
        }
      }
      separator = this.buffer.indexOf(0);
    }
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId;
    this.nextId += 1;
    const message = {id, method, params};
    if (sessionId !== undefined) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.child.stdio[3].write(`${JSON.stringify(message)}\0`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }
}

const evaluate = async (cdp, sessionId, expression) => {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.text
      ?? 'Microsoft Edge evaluation failed');
  }
  return response.result?.value;
};

const waitForValue = async (cdp, sessionId, expression, label) => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const value = await evaluate(cdp, sessionId, expression);
    if (value) return value;
    await wait(100);
  }
  throw new Error(`${label}をMicrosoft Edgeで確認できませんでした`);
};

export const buildPresentationEdgePlaybackObservationV001 = ({
  pageState,
  playbackState,
  mediaFileSha256,
}) => {
  const edgeVersion = /(?:^|\s)Edg\/([^\s]+)/.exec(pageState.userAgent ?? '')?.[1] ?? '';
  const observation = {
    schemaVersion: PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
    status: 'passed',
    browserName: edgeVersion ? 'Microsoft Edge' : '',
    browserVersion: edgeVersion,
    userAgent: pageState.userAgent ?? '',
    pageUrl: pageState.pageUrl ?? '',
    mediaUrl: pageState.mediaUrl ?? '',
    mediaFileSha256,
    metadataLoaded: pageState.readyState >= 1,
    naturalWidth: pageState.videoWidth ?? 0,
    naturalHeight: pageState.videoHeight ?? 0,
    seekTargetMs: SEEK_TARGET_MS,
    seeked: playbackState.seeked === true,
    currentTimeAdvanced: playbackState.paused === false
      && playbackState.currentTime > SEEK_TARGET_MS / 1000,
    mediaError: playbackState.mediaError ?? pageState.mediaError ?? null,
    serverContract: FIRST_REAL_DATA_REVIEW_SERVER_CONTRACT_V001,
  };
  if (!validatePresentationBrowserPlaybackObservationV001(observation)) {
    observation.status = 'failed';
  }
  return observation;
};

export const observePresentationFirstRealDataEdgePlaybackV001 = async ({
  mediaPath,
  outputPath,
  profileDirectory,
}) => {
  await mkdir(profileDirectory, {recursive: true});
  const mediaFileSha256 = await fileSha256(mediaPath);
  const child = spawn(EDGE_EXECUTABLE, [
    '--headless=new',
    '--remote-debugging-pipe',
    '--no-first-run',
    '--disable-default-apps',
    '--disable-background-networking',
    '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${profileDirectory}`,
    'about:blank',
  ], {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  const cdp = new CdpPipe(child);
  try {
    const created = await cdp.send('Target.createTarget', {
      url: FIRST_REAL_DATA_REVIEW_PAGE_URL_V001,
    });
    const attached = await cdp.send('Target.attachToTarget', {
      targetId: created.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    const pageState = await waitForValue(cdp, sessionId, `(() => {
      const video = document.querySelector('video');
      if (document.readyState !== 'complete' || !video || video.readyState < 2) return null;
      return {
        pageUrl: location.href,
        mediaUrl: video.currentSrc,
        userAgent: navigator.userAgent,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        mediaError: video.error ? {code: video.error.code, message: video.error.message} : null,
      };
    })()`, '1080p媒体metadata');
    await evaluate(cdp, sessionId, `(() => {
      const video = document.querySelector('video');
      window.__zevFirstGateSeeked = false;
      video.addEventListener('seeked', () => { window.__zevFirstGateSeeked = true; }, {once: true});
      document.getElementById('startReview').click();
      return true;
    })()`);
    const playbackState = await waitForValue(cdp, sessionId, `(() => {
      const video = document.querySelector('video');
      if (!video || window.__zevFirstGateSeeked !== true || video.currentTime <= ${SEEK_TARGET_MS / 1000}) {
        return null;
      }
      return {
        seeked: window.__zevFirstGateSeeked,
        currentTime: video.currentTime,
        paused: video.paused,
        mediaError: video.error ? {code: video.error.code, message: video.error.message} : null,
      };
    })()`, 'candidate 13のseek後再生');
    const observation = buildPresentationEdgePlaybackObservationV001({
      pageState,
      playbackState,
      mediaFileSha256,
    });
    await mkdir(path.dirname(outputPath), {recursive: true});
    await writeFile(outputPath, `${JSON.stringify(observation, null, 2)}\n`, 'utf8');
    await cdp.send('Page.close', {}, sessionId).catch(() => {});
    if (observation.status !== 'passed') {
      throw new Error(`Microsoft Edge playback observation failed: ${JSON.stringify(observation)}`);
    }
    return observation;
  } catch (error) {
    const edgeError = Buffer.concat(stderr).toString('utf8').trim();
    if (edgeError) error.message = `${error.message}\nMicrosoft Edge: ${edgeError}`;
    throw error;
  } finally {
    child.kill('SIGTERM');
  }
};

const parseCli = (argv) => {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('CLI引数は --name value 形式です');
    values.set(flag, value);
  }
  for (const required of ['--media', '--output', '--profile-directory']) {
    if (!values.get(required)) throw new Error(`${required}が必要です`);
  }
  return {
    mediaPath: path.resolve(values.get('--media')),
    outputPath: path.resolve(values.get('--output')),
    profileDirectory: path.resolve(values.get('--profile-directory')),
  };
};

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await observePresentationFirstRealDataEdgePlaybackV001(parseCli(process.argv.slice(2)));
}

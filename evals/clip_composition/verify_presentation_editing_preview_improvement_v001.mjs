/** Repeat the two established preview scenarios after a scoped repair, using
 * a separate registered editing workspace. This never requests a full render. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, readdir, open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {startPresentationEditingServiceV001} from './serve_presentation_editing_v001.mjs';
import {bindEditingFileV001} from './presentation_editing_state_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const [baseConfigPath, testConfigPath, previousRoot, evidenceDirectory] = process.argv.slice(2);
assert([baseConfigPath, testConfigPath, previousRoot, evidenceDirectory].every(value => path.isAbsolute(value ?? '')));
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const base = await parse(baseConfigPath), config = await parse(testConfigPath);
assert.notEqual(config.directory, base.directory); assert.notEqual(config.generatedRoot, base.generatedRoot);
assert.equal(config.savedInputDirectory, base.savedInputDirectory);
assert.equal(config.originalCompletionPath, base.originalCompletionPath);
assert.equal(config.backgroundProofPath, base.backgroundProofPath);
assert.deepEqual(config.backgroundReuseDecoderRef, base.backgroundReuseDecoderRef);
assert.equal(config.port, base.port);
const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: evidenceDirectory});
await mkdir(evidenceDirectory, {recursive: true});
const record = (name, value) => writeFile(path.join(evidenceDirectory, name + '.json'), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const clean = ({csrfToken, ...rest}) => rest;
const hashBytes = data => createHash('sha256').update(data).digest('hex');
const original = await parse(path.join(base.directory, 'document.json'));
const protectedPaths = ['document.json', ...original.fixedFiles.map(row => row.name),
  'captionOverrides.json', 'connectionOverrides.json',
  ...(await readdir(path.join(base.directory, 'media'))).map(name => path.join('media', name))];
const protect = async () => Promise.all(protectedPaths.map(async name => ({name,
  fileSha256: hashBytes(await readFile(path.join(base.directory, name)))})));
const protectedBefore = await protect();
const originalBefore = await bindEditingFileV001(original.originalMedia.path);
const targets = await parse(path.join(previousRoot, 'http-real-sequence-v001/targets.json'));
const priorCaption = await parse(path.join(previousRoot, 'http-real-sequence-v001/caption-preview-finish.json'));
const priorConnection = await parse(path.join(previousRoot, 'http-real-sequence-v002/connection-preview-finish.json'));
const observations = [], started = performance.now();
let service, state;
async function request(name, route, content) {
  const begin = performance.now(), origin = new URL(service.url).origin;
  const response = await fetch(origin + '/api/editing' + route, content === undefined ? {} : {
    method: 'POST', headers: {'content-type': 'application/json', origin, 'x-zev-editing-token': state.csrfToken},
    body: JSON.stringify(content)});
  const value = await response.json();
  observations.push({operation: name, status: response.status, elapsedMilliseconds: performance.now() - begin});
  assert(response.ok, JSON.stringify(value)); return value;
}
async function preview(name, target, expectedRange) {
  const begin = performance.now();
  const job = await request(name + '-start', '/jobs', {expectedRevision: state.revision, kind: 'preview', target, contextSeconds: 2});
  await record(name + '-start', job);
  process.stdout.write(JSON.stringify({operation: name, status: job.status, jobId: job.id}) + '\n');
  let phase = '';
  do {
    state = await request(name + '-poll', '/state'); assert.equal(state.job.id, job.id);
    if (phase !== state.job.phase) {
      phase = state.job.phase; process.stdout.write(JSON.stringify({operation: name, status: state.job.status, phase}) + '\n');
    }
    if (state.job.status === 'running') await new Promise(resolve => setTimeout(resolve, 2000));
  } while (state.job.status === 'running');
  await record(name + '-finish', clean(state));
  assert.equal(state.job.status, 'succeeded', state.job.error);
  const media = state.media.find(row => row.id === state.job.mediaId); assert(media?.isCurrent && media.kind === 'preview');
  assert.deepEqual(media.range, expectedRange);
  const registered = await parse(path.join(config.directory, 'media', media.id + '.json'));
  const response = await fetch(new URL(service.url).origin + media.url, {headers: {range: 'bytes=0-31'}});
  assert.equal(response.status, 206); assert.equal(response.headers.get('content-length'), '32');
  assert.equal(response.headers.get('content-range'), 'bytes 0-31/' + registered.bytes);
  const received = Buffer.from(await response.arrayBuffer()), expected = Buffer.alloc(32);
  const file = await open(registered.path, 'r');
  try {assert.equal((await file.read(expected, 0, 32, 0)).bytesRead, 32);} finally {await file.close();}
  assert.deepEqual(received, expected);
  const observation = {operation: name, elapsedMilliseconds: performance.now() - begin,
    reused: state.job.reused === true, jobId: job.id, mediaId: media.id, media: registered,
    http: {status: response.status, headers: Object.fromEntries(response.headers), bytes: received.length,
      fileSha256: hashBytes(received), matchesRegisteredBytes: true}};
  observations.push(observation); await record(name + '-media', observation);
  process.stdout.write(JSON.stringify({operation: name, status: 'passed', elapsedMilliseconds: observation.elapsedMilliseconds,
    reused: observation.reused, mediaId: media.id}) + '\n');
  return observation;
}
try {
  service = await startPresentationEditingServiceV001(config);
  await record('scope', {generatedAt: new Date().toISOString(), guard, testConfigPath, baseConfigPath, previousRoot,
    url: service.url, meaning: '同一字幕・接続・範囲の現行描画規則による周辺生成。全編出力と実ブラウザー操作は含まない。'});
  state = await request('initial', '/state'); await record('initial', clean(state));
  assert(state.captions.every(row => !row.hasOverride) && state.connections.every(row => !row.hasOverride));
  const detail = await request('caption-options', '/targets/caption/' + encodeURIComponent(targets.caption.id));
  await record('caption-options', detail); assert(detail.options.some(row => row.value === 'panel' && row.status === 'unchecked'));
  const captionCheck = await request('caption-applicability', '/check', {expectedRevision: state.revision, kind: 'caption',
    itemId: targets.caption.id, selection: {preset: 'panel'}});
  await record('caption-applicability', captionCheck); assert.equal(captionCheck.status, 'applicable');
  state = await request('caption-save', '/save', {expectedRevision: state.revision, kind: 'caption',
    itemId: targets.caption.id, selection: {preset: 'panel'}});
  assert.deepEqual(state.captions, priorCaption.captions); assert.deepEqual(state.connections, priorCaption.connections);
  await record('caption-save', clean(state));
  const oldCaptionMedia = priorCaption.media.find(row => row.id === priorCaption.job.mediaId);
  const first = await preview('caption-preview', {kind: 'caption', itemId: targets.caption.id}, oldCaptionMedia.range);
  assert.equal(first.reused, false);
  const reused = await preview('caption-preview-reuse', {kind: 'caption', itemId: targets.caption.id}, oldCaptionMedia.range);
  assert.equal(reused.reused, true); assert.equal(reused.mediaId, first.mediaId);
  state = await request('connection-save', '/save', {expectedRevision: state.revision, kind: 'connection',
    itemId: targets.connection.id, selection: 'black-separator'});
  assert.deepEqual(state.captions, priorConnection.captions); assert.deepEqual(state.connections, priorConnection.connections);
  assert(!state.media.find(row => row.id === first.mediaId).isCurrent);
  await record('connection-save', clean(state));
  const oldConnectionMedia = priorConnection.media.find(row => row.id === priorConnection.job.mediaId);
  const second = await preview('connection-preview', {kind: 'connection', itemId: targets.connection.id}, oldConnectionMedia.range);
  assert.equal(second.reused, false);
  const secondReuse = await preview('connection-preview-reuse', {kind: 'connection', itemId: targets.connection.id}, oldConnectionMedia.range);
  assert.equal(secondReuse.reused, true); assert.equal(secondReuse.mediaId, second.mediaId);
  const beforeRestart = clean(state);
  await service.close(); service = await startPresentationEditingServiceV001(config);
  state = await request('restart-state', '/state');
  const byMediaId = value => ({...value, media: [...value.media].sort((a, b) => a.id.localeCompare(b.id))});
  assert.deepEqual(byMediaId(clean(state)), byMediaId(beforeRestart));
  assert.deepEqual(await protect(), protectedBefore);
  assert.deepEqual(await bindEditingFileV001(original.originalMedia.path), originalBefore);
  await record('completion', {status: 'passed', checkedAt: new Date().toISOString(),
    elapsedMilliseconds: performance.now() - started, originalUserStateUnchanged: true, originalMediaUnchanged: true,
    currentState: clean(state), protectedFiles: protectedBefore, originalMedia: originalBefore, observations});
} catch (error) {
  await record('failure', {status: 'failed', message: error.message, stack: error.stack, observations}); throw error;
} finally {if (service) await service.close();}

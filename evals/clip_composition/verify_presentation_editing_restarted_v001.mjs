/** Reopen a completed real editing workspace and verify saved media over HTTP.
 * This deliberately makes no browser interaction or playback claim. */
import assert from 'node:assert/strict';
import {readFile, writeFile, open} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startPresentationEditingServiceV001} from './serve_presentation_editing_v001.mjs';
import {bindEditingFileV001} from './presentation_editing_state_v001.mjs';

const [configPath, completedSequenceDirectory, outputPath] = process.argv.slice(2);
assert([configPath, completedSequenceDirectory, outputPath].every(value => path.isAbsolute(value ?? '')));
const config = JSON.parse(await readFile(configPath, 'utf8'));
const prior = JSON.parse(await readFile(path.join(completedSequenceDirectory, 'full-output-finish.json'), 'utf8'));
assert.equal(prior.job.status, 'succeeded');
const manifest = JSON.parse(await readFile(path.join(config.directory, 'document.json'), 'utf8'));
const hashes = async names => Promise.all(names.map(async name => ({name,
  fileSha256: createHash('sha256').update(await readFile(path.join(config.directory, name))).digest('hex')})));
const fixedBefore = await hashes(manifest.fixedFiles.map(row => row.name));
assert.deepEqual(fixedBefore, manifest.fixedFiles);
const overridesBefore = await hashes(['captionOverrides.json', 'connectionOverrides.json']);
const beforeOriginal = await bindEditingFileV001(manifest.originalMedia.path);
assert.equal(beforeOriginal.fileSha256, manifest.originalMedia.fileSha256);
assert.equal(beforeOriginal.bytes, manifest.originalMedia.bytes);
const began = performance.now(), service = await startPresentationEditingServiceV001(config);
try {
  const origin = new URL(service.url).origin;
  const response = await fetch(origin + '/api/editing/state');
  assert.equal(response.status, 200);
  const state = await response.json();
  assert.equal(state.revision, prior.revision);
  assert.deepEqual(state.captions, prior.captions);
  assert.deepEqual(state.connections, prior.connections);
  assert.equal(state.frameCount, prior.frameCount);
  assert.deepEqual(state.job, prior.job);
  // Durable media identity and every stored field must survive restart. Map
  // insertion order before restart is not an ordered-list persistence contract.
  const byId = rows => [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  assert.deepEqual(byId(state.media), byId(prior.media));
  const current = state.media.filter(row => row.isCurrent);
  assert.equal(current.length, 1);
  assert.equal(current[0].id, prior.job.mediaId);
  assert.equal(current[0].kind, 'full');
  const observed = [];
  for (const media of state.media) {
    const record = media.id === 'original' ? manifest.originalMedia
      : JSON.parse(await readFile(path.join(config.directory, 'media', media.id + '.json'), 'utf8'));
    const started = performance.now();
    const range = await fetch(origin + media.url, {headers: {range: 'bytes=0-31'}});
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-length'), '32');
    assert.equal(range.headers.get('content-range'), 'bytes 0-31/' + record.bytes);
    assert.equal(range.headers.get('content-type'), 'video/mp4');
    const actual = Buffer.from(await range.arrayBuffer());
    const handle = await open(record.path, 'r');
    const expected = Buffer.alloc(32);
    try {assert.equal((await handle.read(expected, 0, 32, 0)).bytesRead, 32);} finally {await handle.close();}
    assert.deepEqual(actual, expected);
    observed.push({id: media.id, kind: media.kind, isCurrent: media.isCurrent,
      status: range.status, headers: Object.fromEntries(range.headers),
      responseBytes: actual.length, responseSha256: createHash('sha256').update(actual).digest('hex'),
      matchesSavedVideoBytes: true, elapsedMilliseconds: performance.now() - started,
      video: {path: record.path, bytes: record.bytes, fileSha256: record.fileSha256},
      drawingRulesSha256: record.drawingRulesRef.canonicalSha256});
  }
  assert.deepEqual(await hashes(manifest.fixedFiles.map(row => row.name)), fixedBefore);
  assert.deepEqual(await hashes(['captionOverrides.json', 'connectionOverrides.json']), overridesBefore);
  const {csrfToken, ...publicState} = state;
  await writeFile(outputPath, JSON.stringify({schemaVersion: 'presentation-editing-restart-verification-v001',
    status: 'passed', checkedAt: new Date().toISOString(),
    meaning: '別process起動後、同じ保存内容・完成登録を再読。登録媒体をHTTP Rangeで配信し、応答byteを保存動画と照合。実ブラウザー操作・再生の確認ではない。',
    completedSequenceDirectory, url: service.url, state: publicState,
    fixedFiles: fixedBefore, overrideFiles: overridesBefore, originalMedia: beforeOriginal,
    media: observed, elapsedMilliseconds: performance.now() - began}, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write(JSON.stringify({status: 'passed', outputPath, mediaCount: observed.length,
    currentFullMediaId: current[0].id, revision: state.revision}) + '\n');
} finally {await service.close();}
